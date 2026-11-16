import { chromium } from "playwright-core";
import fs from "node:fs";
const out = process.argv[2];
const base = `${process.env.HOME}/Library/Caches/ms-playwright/chromium-1248/chrome-mac-arm64`;
const exe = fs.readdirSync(base).find(f => f.endsWith(".app"));
const browser = await chromium.launch({ executablePath: `${base}/${exe}/Contents/MacOS/${exe.replace(".app","")}`, args: ["--use-angle=swiftshader","--enable-unsafe-swiftshader"] });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
const logs = [];
page.on("pageerror", e => logs.push("pageerror " + e.message + " " + (e.stack || "").split("\n")[1]));
const S = (fn, a) => page.evaluate(fn, a);
const waitFor = (fn, a, ms = 120000) => page.waitForFunction(fn, a, { timeout: ms }).catch(() => "timeout");
await page.addInitScript(() => localStorage.clear());
await page.goto("http://localhost:8095/?emulate");
await page.waitForSelector("#begin", { timeout: 60000 });
await S(() => document.getElementById("enter-vr").click());
await page.waitForTimeout(2500);
await S(() => { const s = window.strings; if (s.book.open) s.book.skipAll(); s.raiseCurtain(); s.sim.sticky = false; s.sim._hasMouse = false; });
await page.waitForTimeout(1500);
const st = () => S(() => { const s = window.strings, u = s.unbound, m = s.marlo; const head = s.stageRoot.worldToLocal(s.camera.getWorldPosition(new m.main.position.constructor())); return { state: u.state, chestToHead: +m.get("chest").distanceTo(head).toFixed(2), strings: m.stringLines.visible, aiSusp: !!s.ai.suspended }; });
await S(() => window.strings.unbound.free());
await waitFor(() => window.strings.unbound.state === "loop", null, 60000);
const loopSamples = [];
for (let i = 0; i < 6; i++) { await page.waitForTimeout(2500); loopSamples.push((await st()).chestToHead); if (i === 2) await page.screenshot({ path: `${out}/u-loop.png` }); }
console.log("loop: chest-to-head distances", loopSamples.join(", "));
await waitFor(() => window.strings.unbound.state === "seek", null, 120000);
console.log("seek", JSON.stringify(await st()));
// hold the (emulated) right hand open and still, in front
await S(() => { const s = window.strings; const h = s.stageRoot.worldToLocal(s.camera.getWorldPosition(new s.marlo.main.position.constructor())); s.sim.mainPos.set(h.x + 0.05, h.y - 0.3, h.z - 0.3); s.sim.otherPos.set(-0.4, -0.3, 0.3); });
await waitFor(() => window.strings.unbound.state === "perch", null, 90000);
await waitFor(() => window.strings.unbound.t > 2.5, null, 60000);
console.log("perch", await S(() => { const s = window.strings; const h = s.xrHands.hands.find(x => x.id === s.unbound.hand); const f = s.marlo.get("lF").clone().add(s.marlo.get("rF")).multiplyScalar(0.5); return JSON.stringify({ state: s.unbound.state, feetToPalm: +f.distanceTo(h.palm).toFixed(3) }); }));
await page.screenshot({ path: `${out}/u-perch.png` });
// pinch: he flies home and his strings come back
await S(() => { window.strings.sim.sticky = true; });
await waitFor(() => window.strings.unbound.state === "off", null, 60000);
console.log("home", JSON.stringify(await st()));
await S(() => { window.strings.sim.sticky = false; });
// clap twice with both emulated hands
const clapsBefore = await S(() => window.strings.unbound.claps.length);
let applause = false;
await S(() => { const s = window.strings; const o = s.unbound; o._ap = 0; const a = o.applause.bind(o); o.applause = () => { o._ap++; a(); }; });
for (let k = 0; k < 2; k++) {
  await S(() => { const s = window.strings; s.sim.mainPos.set(0.08, 0.45, 0.2); s.sim.otherPos.set(-0.12, 0.45, 0.2); });
  await page.waitForTimeout(1200);
  await S(() => { const s = window.strings; const h = s.xrHands.hands; const off = h[0].palm.clone().sub(h[1].palm); s.sim.otherPos.add({ x: off.x * 0.95, y: off.y * 0.95, z: off.z * 0.95 }); });
  await page.waitForTimeout(600);
}
console.log("applause triggered:", await S(() => window.strings.unbound._ap));
console.log(logs.slice(0, 8).join("\n") || "no errors");
await browser.close();
