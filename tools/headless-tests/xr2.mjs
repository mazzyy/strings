import { chromium } from "playwright-core";
import fs from "node:fs";
const base = `${process.env.HOME}/Library/Caches/ms-playwright/chromium-1248/chrome-mac-arm64`;
const exe = fs.readdirSync(base).find(f => f.endsWith(".app"));
const browser = await chromium.launch({ executablePath: `${base}/${exe}/Contents/MacOS/${exe.replace(".app","")}`, args: ["--use-angle=swiftshader","--enable-unsafe-swiftshader"] });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
const logs = [];
page.on("console", m => { if (m.type() !== "log" && !m.text().includes("GL Driver")) logs.push(`[${m.type()}] ${m.text()}`); });
page.on("pageerror", e => logs.push("pageerror " + e.message));
await page.goto("http://localhost:8090/?emulate");
await page.waitForTimeout(6000);
const info = await page.evaluate(() => ({ dev: !!window.xrDevice, devui: !!window.iwerDevUI, vr: !document.getElementById("enter-vr").hidden, ar: !document.getElementById("enter-ar").hidden }));
console.log("emulator", JSON.stringify(info));
await page.screenshot({ path: `${process.argv[2]}/xr-0.png` });
if (!info.vr && !info.ar) { console.log(logs.join("\n")); process.exit(1); }
await page.evaluate((ar) => document.getElementById(ar ? "enter-ar" : "enter-vr").click(), info.ar);
await page.waitForTimeout(2500);
const propTest = async () => {
  // carry the flower to the knight's hand with the emulated right hand
  await page.evaluate(() => { const s = window.strings; s.sim.sticky = false; s.sim.mainPos.copy(s.props.position("flower")); });
  await page.waitForTimeout(2500);
  console.log("before pinch", await page.evaluate(() => { const s = window.strings; const h = s.xrHands.hands.filter(h => h.present); return JSON.stringify(h.map(x => ({ id: x.id, d: +x.position.distanceTo(s.props.position("flower")).toFixed(3), p: x.position.toArray().map(v => +v.toFixed(3)) })).concat([{ flower: s.props.position("flower").toArray().map(v => +v.toFixed(3)), target: s.sim.mainPos.toArray().map(v => +v.toFixed(3)) }])); }));
  await page.evaluate(() => { window.strings.sim.sticky = true; });
  await page.waitForTimeout(1200);
  const mid = await page.evaluate(() => ({ holding: !!window.strings.props.holding(window.strings.xrHands.hands.find(h => h.present && h.pinch)?.id) }));
  await page.evaluate(() => { const s = window.strings; s.sim.mainPos.copy(s.pip.get("rW")); });
  await page.waitForTimeout(2500);
  await page.evaluate(() => { window.strings.sim.sticky = false; });
  await page.waitForTimeout(1200);
  return { ...mid, pipHolds: await page.evaluate(() => window.strings.props.heldBy("pip")) };
};
const probe = () => page.evaluate(() => { const s = window.strings; const hs = s.xrHands.hands.filter(x => x.present);
  return { present: hs.length, pinch: hs.map(h => h.pinch), held: s.pip.main.held, grabs: s.grabs.size, head: +s.pip.get("head").y.toFixed(3), c: s.pip.center().toArray().map(v => +v.toFixed(3)) }; });
console.log("in xr", JSON.stringify(await probe()));
console.log("placing?", await page.evaluate(() => document.getElementById("st-mode").textContent));
// first pinch sets the stage down (AR placement), then release
await page.evaluate(() => { window.strings.sim.sticky = true; });
await page.waitForTimeout(800);
await page.evaluate(() => { window.strings.sim.sticky = false; });
await page.waitForTimeout(800);
console.log("after placement pinch", JSON.stringify(await page.evaluate(() => ({ stage: window.strings.stageRoot.position.toArray().map(v => +v.toFixed(2)), info: window.strings.renderer.info.render }))));
// put the simulated hand right at the bar's grip, then pinch
await page.evaluate(() => { const s = window.strings; const g = s.pip.main.worldPoint([0, 0.04, -0.03], s.pip.main.position.clone()); s.sim.mainPos.copy(g); s.sim._hasMouse = false; });
await page.waitForTimeout(1500);
await page.evaluate(() => { window.strings.sim.sticky = true; });
await page.waitForTimeout(1200);
console.log("pinched", JSON.stringify(await probe()));
for (let i = 0; i < 30; i++) { await page.evaluate(() => window.strings.sim.mainPos.x += 0.005); await page.waitForTimeout(60); }
await page.waitForTimeout(800);
console.log("carried", JSON.stringify(await probe()));
await page.screenshot({ path: `${process.argv[2]}/xr-1.png` });
await page.evaluate(() => { window.strings.sim.sticky = false; });
await page.waitForTimeout(1500);
console.log("released", JSON.stringify(await probe()));
console.log("prop handoff", JSON.stringify(await propTest()));
console.log(logs.slice(0, 15).join("\n"));
await browser.close();
