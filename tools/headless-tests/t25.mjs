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
await go("courtyard");
console.log("courtyard acts", await S(() => window.strings.show.scene.acts.length));
// 1) shy: wait for him to land, then rush (he should hide), then walk up gently
await waitFor(() => window.strings.currentTask?.debug?.().phase === "shy", null, 60000);
await shot("c1-shy");
for (let i = 0; i < 40 && (await dbg())?.hides === 0; i++) { await S(() => { const s = window.strings; const dx = s.marlo.get("chest").x - s.pip.get("pelvis").x; s.sim.mainPos.x += Math.sign(dx) * 0.03; }); await page.waitForTimeout(60); }
console.log("rushed ->", JSON.stringify(await dbg()));
await page.waitForTimeout(300); await shot("c2-hide");
await waitFor(() => window.strings.currentTask?.debug?.().phase === "shy", null, 60000);
for (let i = 0; i < 400 && (await act()) < 1; i++) { await S(() => { const s = window.strings; const dx = s.marlo.get("chest").x - s.pip.get("pelvis").x; if (Math.abs(dx) > 0.13) s.sim.mainPos.x += Math.sign(dx) * 0.0015; }); await page.waitForTimeout(60); if (i % 50 === 0) console.log("  gentle", JSON.stringify(await dbg())); }
console.log("shy -> act", await act());
// 2) bow
await waitFor(() => window.strings.show.act === 1 && window.strings.show.state === "act", null, 60000);
await S(() => window.strings.sim.keys.add("w"));
await waitFor(() => window.strings.show.act >= 2, null, 60000);
await S(() => window.strings.sim.keys.delete("w"));
console.log("bow -> act", await act());
// 3) high five: raise the arm bar next to Marlo
await waitFor(() => window.strings.show.act === 2 && window.strings.show.state === "act", null, 60000);
await page.waitForTimeout(1500); await shot("c3-paw");
for (let i = 0; i < 12; i++) { await S(() => { const s = window.strings; const g = s.marlo.get("chest"); const p = s.pip.get("pelvis"); if (Math.abs(g.x - p.x) > 0.14) s.sim.mainPos.x += Math.sign(g.x - p.x) * 0.012; }); await page.waitForTimeout(120); }
await S(() => { const s = window.strings; s.sim.otherPos.copy(s.pip.hands.position); s.sim.otherSticky = true; s.__hb0 = s.pip.hands.position.y; });
for (let i = 0; i < 1200 && (await act()) < 3; i++) {
  const d = await dbg();
  await S((up) => { const s = window.strings; const top = s.__hb0 + 0.16; s.sim.otherPos.y += up && s.sim.otherPos.y < top ? 0.01 : !up && s.sim.otherPos.y > s.__hb0 ? -0.01 : 0; }, d?.phase === "ask");
  await page.waitForTimeout(100);
  if (i % 40 === 0) console.log("  hf", JSON.stringify(d));
}
await S(() => { const s = window.strings; s.sim.otherPos.y = s.__hb0; });
await page.waitForTimeout(600);
console.log("highfive -> act", await act());
// 4) jump together: miss the first, then jump on each "JUMP!"
await waitFor(() => window.strings.show.act === 3 && window.strings.show.state === "act", null, 60000);
let missed = false;
for (let i = 0; i < 600 && (await act()) < 4; i++) {
  const d = await dbg();
  if (d?.phase === "window") { if (!missed) { missed = true; await waitFor(() => window.strings.currentTask?.debug?.().phase !== "window", null, 20000); console.log("  missed ->", JSON.stringify(await dbg())); } else { await S(() => { window.strings.sim.jump = 1; }); await waitFor(() => window.strings.currentTask?.debug?.().phase !== "window", null, 20000); console.log("  jumped ->", JSON.stringify(await dbg())); } }
  await page.waitForTimeout(60);
}
console.log("together -> act", await act());
// 5) wave
await waitFor(() => window.strings.show.act === 4 && window.strings.show.state === "act", null, 60000);
for (let i = 0; i < 200 && (await S(() => window.strings.show.state)) === "act"; i++) { await S((i) => { const s = window.strings; s.sim.otherPos.y = s.__hb0 + 0.06 + Math.sin(i * 0.9) * 0.06; }, i); await page.waitForTimeout(80); }
await S(() => { window.strings.sim.otherSticky = false; });
console.log("courtyard ->", await S(() => ({ state: window.strings.show.state, stars: window.strings.show.stars })));

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
