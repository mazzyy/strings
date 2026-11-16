import { chromium } from "playwright-core";
import fs from "node:fs";
const base = `${process.env.HOME}/Library/Caches/ms-playwright/chromium-1248/chrome-mac-arm64`;
const exe = fs.readdirSync(base).find(f => f.endsWith(".app"));
const browser = await chromium.launch({ executablePath: `${base}/${exe}/Contents/MacOS/${exe.replace(".app","")}`, args: ["--use-angle=swiftshader","--enable-unsafe-swiftshader"] });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
page.on("pageerror", e => console.log("pageerror", e.message));
const S = (fn, a) => page.evaluate(fn, a);
const waitFor = (fn, a, ms = 120000) => page.waitForFunction(fn, a, { timeout: ms }).catch(() => "timeout");
await page.addInitScript(() => localStorage.clear());
await page.goto("http://localhost:8095/?autostart");
await waitFor(() => window.strings?.show.state === "intro");
await S(() => { const s = window.strings; s.renderer.__r = s.renderer.render; s.renderer.render = () => {}; s.storyMap.state.unlocked = 7; s.changeScene(s.storyMap.places.find(p => p.id === "sky")); });
await waitFor(() => window.strings.book.open, null, 60000);
await S(() => window.strings.book.finish());
await waitFor(() => window.strings.chapter.id === "sky" && window.strings.show.state === "intro");
await S(() => { const s = window.strings; s.sim.sticky = true; s.sim._hasMouse = false; });
await waitFor(() => window.strings.show.state === "act");
for (let k = 0; k < 40 && (await S(() => window.strings.show.act)) < 4; k++) { await S(() => { if (window.strings.show.state === "act") window.strings.show.skip(); }); await page.waitForTimeout(1200); }
await waitFor(() => window.strings.show.act >= 4 && window.strings.show.state === "act");
console.log("at act", await S(() => window.strings.show.act), "flying", await S(() => window.strings.flying));
await S(() => window.strings.sim.keys.add("w"));
for (let i = 0; i < 10; i++) {
  console.log(await S(() => { const s = window.strings, p = s.pip; const up = p.get("neck").clone().sub(p.get("pelvis")).normalize(); const hr = p.get("rH").clone().sub(p.get("lH")); const hf = { x: -hr.z, z: hr.x }; const n = Math.hypot(hf.x, hf.z); const lean = (up.x * hf.x + up.z * hf.z) / n; return JSON.stringify({ act: s.show.act, st: s.show.state, lean: +lean.toFixed(2), pitch: +s.sim.rot.pitch.toFixed(2), held: p.main.held, barY: +p.main.position.y.toFixed(2), pelvisY: +p.get("pelvis").y.toFixed(2) }); }));
  await page.waitForTimeout(800);
}
await browser.close();
