import { chromium } from "playwright-core";
import fs from "node:fs";
const out = process.argv[2];
const base = `${process.env.HOME}/Library/Caches/ms-playwright/chromium-1248/chrome-mac-arm64`;
const exe = fs.readdirSync(base).find(f => f.endsWith(".app"));
const browser = await chromium.launch({ executablePath: `${base}/${exe}/Contents/MacOS/${exe.replace(".app","")}`, args: ["--use-angle=swiftshader","--enable-unsafe-swiftshader"] });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
const logs = [];
page.on("console", m => { if (m.type() === "error" && !m.text().includes("Failed to load resource")) logs.push(m.text()); });
page.on("pageerror", e => logs.push("pageerror " + e.message + " " + (e.stack || "").split("\n")[1]));
const S = (fn, a) => page.evaluate(fn, a);
const waitFor = (fn, a, ms = 120000) => page.waitForFunction(fn, a, { timeout: ms }).catch(() => "timeout");
const fast = () => S(() => { const s = window.strings; if (!s.renderer.__r) s.renderer.__r = s.renderer.render; s.renderer.render = () => {}; });
const draw = () => S(() => { const s = window.strings; if (s.renderer.__r) s.renderer.render = s.renderer.__r; });
const shot = async (name) => { await draw(); await page.waitForTimeout(800); await page.screenshot({ path: `${out}/${name}.png` }); await fast(); };
const act = () => S(() => window.strings.show.act);
const dbg = () => S(() => window.strings.currentTask?.debug?.());
await page.addInitScript(() => localStorage.clear());
await page.goto("http://localhost:8095/?autostart");
await waitFor(() => window.strings?.show.state === "intro" || window.strings?.book.open || window.strings?.intro?.on, null, 60000);
const go = async (id) => {
  await S((id) => { const s = window.strings; s.storyMap.state.unlocked = 7; s.changeScene(s.storyMap.places.find(p => p.id === id)); }, id);
  await waitFor(() => window.strings.book.open, null, 30000);
  await S(() => window.strings.book.finish());
  await waitFor((id) => window.strings.chapter.id === id && window.strings.show.state === "intro", id);
  await fast();
  await S(() => { const s = window.strings; s.sim.sticky = true; s.sim._hasMouse = false; });
  await waitFor(() => window.strings.show.state === "act");
};
// ---- forest
await go("forest");
await shot("f1-dark");
await S(() => window.strings.props.moveTo("lantern", "pip"));
await waitFor(() => window.strings.show.act >= 1 && window.strings.show.state === "act", null, 60000);
console.log("lantern -> act", await act());
// fireflies: rush one first (it should flit away), then collect gently
let scattered = 0;
{ const before = await S(() => JSON.stringify(window.strings.currentTask.debug().items[0]));
  for (let i = 0; i < 30; i++) { await S(() => { const s = window.strings; const t = s.currentTask.target(); const dx = t.x - s.pip.get("pelvis").x; s.sim.mainPos.x += Math.sign(dx) * 0.035; }); await page.waitForTimeout(50); }
  const d = await dbg(); console.log("  rush fireflies", before, "->", JSON.stringify(d)); }
await page.waitForTimeout(1500);
for (let i = 0; i < 1500 && (await act()) < 2; i++) {
  await S(() => { const s = window.strings; const t = s.currentTask?.target?.(); if (!t) return; const l = s.props.position("lantern"); const dx = t.x - l.x; if (Math.abs(dx) > 0.01) s.sim.mainPos.x += Math.sign(dx) * 0.0025; if (Math.abs(dx) < 0.05) s.sim.mainPos.y += Math.sign(t.y - l.y) * 0.002; });
  await page.waitForTimeout(50);
}
console.log("fireflies -> act", await act(), JSON.stringify(await dbg()));
// owls: walk under the one that calls
await waitFor(() => window.strings.show.act === 2 && window.strings.show.state === "act", null, 60000);
await page.waitForTimeout(1500); await shot("f2-owls");
for (let i = 0; i < 1200 && (await act()) < 3; i++) {
  await S(() => { const s = window.strings; const t = s.currentTask?.target?.(); if (t) { const dx = t.x - s.pip.get("pelvis").x; if (Math.abs(dx) > 0.02) s.sim.mainPos.x += Math.sign(dx) * Math.min(0.01, Math.abs(dx)); } });
  await page.waitForTimeout(60);
  if (i % 60 === 0) console.log("  owls", JSON.stringify(await dbg()));
}
console.log("owls -> act", await act());
await waitFor(() => window.strings.currentTask?.debug?.().phase === "repeat", null, 90000);
const seq = await S(() => window.strings.currentTask.debug().seq);
for (const m of seq) { await S((m) => { window.strings.detector.cool[m] = 0; window.strings.detector.emit(m, {}, 0); }, m); await page.waitForTimeout(300); }
await page.waitForTimeout(5000); await shot("f3-bloom");
await waitFor(() => window.strings.show.state !== "act" || window.strings.show.act > 3, null, 60000);
console.log("forest ->", await S(() => ({ state: window.strings.show.state, stars: window.strings.show.stars })));
console.log(logs.slice(0, 12).join("\n") || "no errors");
await browser.close();
