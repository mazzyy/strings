import { chromium } from "playwright-core";
import fs from "node:fs";
const out = process.argv[2];
const base = `${process.env.HOME}/Library/Caches/ms-playwright/chromium-1248/chrome-mac-arm64`;
const exe = fs.readdirSync(base).find(f => f.endsWith(".app"));
const browser = await chromium.launch({ executablePath: `${base}/${exe}/Contents/MacOS/${exe.replace(".app","")}`, args: ["--use-angle=swiftshader","--enable-unsafe-swiftshader","--autoplay-policy=no-user-gesture-required"] });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
const logs = [];
page.on("console", m => { if (["error"].includes(m.type())) logs.push(`[${m.type()}] ${m.text()}`); });
page.on("pageerror", e => logs.push("pageerror " + e.message));
page.on("response", r => { if (r.status() >= 400 && !r.url().includes("favicon")) logs.push(`${r.status()} ${r.url()}`); });
await page.goto("http://localhost:8090/?autostart");
await page.waitForTimeout(3500);
const st = () => page.evaluate(() => { const s = window.strings; return `${s.show.state} scene=${s.show.scene?.id} act=${s.show.act} stars=${s.show.stars} hint=${s.hints.current} pipHolds=${s.props.heldBy("pip")} marloHolds=${s.props.heldBy("marlo")}`; });
const flush = () => page.evaluate(() => { const s = window.strings; s.narrator.speakingUntil = 0; });
const step = async (fn, ms = 1500) => { if (fn) await page.evaluate(fn); await flush(); await page.waitForTimeout(ms); await flush(); console.log(await st()); };
// pick up the knight
await step(() => { const s = window.strings; s.sim.mainPos.copy(s.pip.main.worldPoint([0, 0.04, -0.03], s.pip.main.position.clone())); s.sim.sticky = true; }, 3000);
// play "The Meeting": approach, bow, wave
for (const ev of ["approach", "bow", "wave"]) {
  await step(() => {}, 2500);
  await step(new Function(`window.strings.detector.cool = {}; window.strings.detector.emit("${ev}", {}, 0)`), 4000);
}
await page.waitForTimeout(3000);
await page.screenshot({ path: `${out}/g-finale.png` });
console.log("after finale:", await st(), await page.evaluate(() => localStorage.getItem("strings.playbills")));
// desktop prop flow: click the flower on screen, then click Marlo
const screenOf = (expr) => page.evaluate((expr) => { const s = window.strings; const p = eval(expr); const w = s.stageRoot.localToWorld(p.clone()).project(s.camera); return [ (w.x + 1) / 2 * innerWidth, (1 - w.y) / 2 * innerHeight ]; }, expr);
const [fx, fy] = await screenOf('s.props.position("flower")');
await page.mouse.click(fx, fy); await page.waitForTimeout(1500);
console.log("clicked flower:", await st());
await page.screenshot({ path: `${out}/g-flower.png` });
const [mx, my] = await screenOf('s.marlo.get("chest")');
await page.mouse.click(mx, my); await page.waitForTimeout(1500);
console.log("clicked marlo:", await st());
// talk fallback understanding
console.log("talk:", await page.evaluate(async () => { const m = await import("./src/talk.js"); return ["hello there", "can you dance?", "what is your name", "banana"].map((t) => m.understand(t).reaction + " / " + m.understand(t).line).join(" | "); }));
// hints for every kind
console.log("hints:", await page.evaluate(() => { const s = window.strings; const r = []; for (const k of ["walk","bow","wave","jump","turn","takeFlower","give","record","talk"]) { s.hints.show(k, false); r.push(k + ":" + document.getElementById("hint").textContent); } s.hints.show("wave", true); return r.join(" | "); }));
await page.waitForTimeout(800);
await page.screenshot({ path: `${out}/g-hint-xr.png` });
await page.evaluate(() => window.strings.hints.show("bow", false));
await page.waitForTimeout(800);
await page.screenshot({ path: `${out}/g-hint-desk.png` });
console.log(logs.slice(0, 20).join("\n"));
await browser.close();
