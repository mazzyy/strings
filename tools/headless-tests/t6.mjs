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
await page.addInitScript(() => localStorage.clear());
await page.goto("http://localhost:8095/");
await page.waitForSelector("#begin", { timeout: 90000 });
await page.click("#begin");
await page.waitForFunction(() => window.strings?.book.open, null, { timeout: 30000 });
await page.waitForTimeout(1500);
await page.screenshot({ path: `${out}/b1-book.png` });
await page.click("#storybook canvas");
await page.waitForTimeout(1200);
console.log("book", await page.evaluate(() => ({ open: window.strings.book.open, page: window.strings.book.page })));
await page.screenshot({ path: `${out}/b2-book.png` });
await page.click("#storybook .skip");
await page.waitForTimeout(800);
console.log("after skip", await page.evaluate(() => ({ book: window.strings.book.open, preshow: window.strings.preshow })));
const S = (fn, arg) => page.evaluate(fn, arg);
const fast = () => S(() => { const s = window.strings; if (!s.renderer.__r) s.renderer.__r = s.renderer.render; s.renderer.render = () => {}; });
const draw = () => S(() => { const s = window.strings; if (s.renderer.__r) s.renderer.render = s.renderer.__r; });
const waitFor = (fn, arg, ms = 120000) => page.waitForFunction(fn, arg, { timeout: ms }).catch(() => "timeout");
const go = async (id) => {
  await S((id) => { const s = window.strings; s.storyMap.state.unlocked = 6; s.changeScene(s.storyMap.places.find(p => p.id === id)); }, id);
  await waitFor(() => window.strings.book.open, null, 30000);
  await S(() => window.strings.book.finish());
  await waitFor((id) => window.strings.chapter.id === id && window.strings.show.state === "intro", id);
  await S(() => { window.strings.sim.sticky = true; });
  await waitFor(() => window.strings.show.state === "act");
};
const skipTo = async (actIdx) => { while (await S(() => window.strings.show.act) < actIdx) { await S(() => window.strings.show.skip()); await waitFor((a) => window.strings.show.state === "act" && window.strings.show.act >= a, actIdx, 30000); } };
await S(() => window.strings.raiseCurtain());
await fast();

// ---- forest: collect fireflies with the lantern, then the spell
await go("forest");
await skipTo(1);
await S(() => window.strings.props.moveTo("lantern", "pip"));
for (let i = 0; i < 8; i++) {
  const r = await S(() => { const s = window.strings; const t = s.currentTask?.target(); if (!t) return null; s.movePipTo(t.x, t.z); return [t.x, t.z]; });
  if (!r) break;
  await page.waitForTimeout(900);
}
await waitFor(() => window.strings.show.act >= 2 && window.strings.show.state === "act", null, 30000);
console.log("forest collect ->", await S(() => ({ act: window.strings.show.act, stars: window.strings.show.stars })));
await waitFor(() => window.strings.currentTask?.debug?.().phase === "repeat", null, 90000);
const seq = await S(() => window.strings.currentTask.debug().seq);
for (const m of seq) { await S((m) => { window.strings.detector.cool[m] = 0; window.strings.detector.emit(m, {}, 0); }, m); await page.waitForTimeout(300); }
await waitFor(() => window.strings.show.state !== "act" || window.strings.show.act > 2, null, 30000);
console.log("forest spell", JSON.stringify(seq), "->", await S(() => ({ state: window.strings.show.state, stars: window.strings.show.stars })));

// ---- ship: the duel
await go("ship");
await skipTo(1);
await draw(); await page.waitForTimeout(500); await fast();
let rounds = 0, hits = 0;
for (let k = 0; k < 40 && rounds < 12; k++) {
  await waitFor(() => ["swing", "won"].includes(window.strings.currentTask?.debug?.().phase), null, 60000);
  const d = await S(() => window.strings.currentTask?.debug?.());
  if (!d || d.phase === "won") break;
  rounds++;
  if (d.kind === "high") { await S(() => { window.strings.sim.mainPos.y -= 0.09; }); await waitFor(() => window.strings.currentTask?.debug?.().phase !== "swing", null, 30000); await S(() => { window.strings.sim.mainPos.y += 0.09; }); }
  else { await waitFor(() => (window.strings.currentTask?.debug?.().t || 0) > 0.6, null, 30000); await S(() => { window.strings.sim.jump = 1; }); await waitFor(() => window.strings.currentTask?.debug?.().phase !== "swing", null, 30000); }
  const after = await S(() => window.strings.currentTask?.debug?.().phase);
  if (after === "strike") {
    await S(() => { const s = window.strings; const g = s.marlo.get("pelvis"); const p = s.pip.get("pelvis"); s.movePipTo(g.x - Math.sign(g.x - p.x) * 0.12, g.z); });
    await page.waitForTimeout(300);
    await S(() => { const s = window.strings; const g = s.marlo.get("pelvis"); s.sim.mainPos.x += Math.sign(g.x - s.pip.get("pelvis").x) * 0.06; });
    await waitFor(() => window.strings.currentTask?.debug?.().phase !== "strike", null, 30000);
    hits = 3 - (await S(() => window.strings.currentTask?.debug?.().foe ?? 0));
  }
  if (k === 1) { await draw(); await page.waitForTimeout(400); await page.screenshot({ path: `${out}/t-duel.png` }); await fast(); }
}
await waitFor(() => window.strings.show.act >= 2 || window.strings.show.state !== "act", null, 30000);
console.log("duel rounds", rounds, "hits", hits, "->", await S(() => ({ act: window.strings.show.act, state: window.strings.show.state })));

// ---- bridge: the riddle
await go("bridge");
await skipTo(1);
await draw(); await page.waitForTimeout(800); await page.screenshot({ path: `${out}/t-riddle.png` }); await fast();
const ans = Math.floor(Date.now() / 86400000) % 3;
await S((i) => window.strings.movePipTo(-0.17 + ((i + 1) % 3) * 0.15, 0.11), ans);  // a wrong one first
await page.waitForTimeout(2500);
await S((i) => window.strings.movePipTo(-0.17 + i * 0.15, 0.11), ans);
await waitFor(() => window.strings.show.act >= 2, null, 40000);
console.log("riddle ->", await S(() => ({ act: window.strings.show.act, stars: window.strings.show.stars })));

// ---- tower: sneak, unlock, dodge
await go("tower");
await draw(); await page.waitForTimeout(1500); await page.screenshot({ path: `${out}/t-sneak.png` }); await fast();
// wander in front of Clank to get caught, then go straight to the key
await S(() => window.strings.movePipTo(0.05, 0.15));
for (let i = 0; i < 110; i++) { await S((i) => { const s = window.strings; s.__hx ??= s.sim.mainPos.x; s.sim.mainPos.x = s.__hx + Math.sin(i) * 0.03; }, i); await page.waitForTimeout(150); if (await S(() => window.strings.currentTask?.debug?.().caught) > 0) break; }
const caught = await S(() => window.strings.currentTask?.debug?.().caught);
await S(() => { const s = window.strings; s.movePipTo(0.34, 0.03); });
await waitFor(() => window.strings.show.act >= 1 && window.strings.show.state === "act", null, 30000);
console.log("sneak caught", caught, "->", await S(() => window.strings.show.act));
// unlock: click the key, then click the cage
await draw(); await page.waitForTimeout(500);
const scr = (v) => S((v) => { const s = window.strings; const w = s.stageRoot.localToWorld(new s.camera.position.constructor(...v)).project(s.camera); return { x: (w.x + 1) / 2 * innerWidth, y: (1 - w.y) / 2 * innerHeight }; }, v);
const kp = await S(() => window.strings.props.position("key").toArray());
let pt = await scr(kp); await page.mouse.click(pt.x, pt.y); await page.waitForTimeout(800);
const holdsKey = await S(() => window.strings.props.heldBy("pip"));
pt = await scr([0.3, 0.09, -0.12]); await page.mouse.click(pt.x, pt.y);
await waitFor(() => window.strings.show.act >= 2 && window.strings.show.state === "act", null, 40000);
await page.waitForTimeout(2500);
await page.screenshot({ path: `${out}/t-freed.png` });
console.log("unlock: held", holdsKey, "->", await S(() => ({ act: window.strings.show.act, princess: window.strings.princessDrv.state })));
await fast();
for (let i = 0; i < 80; i++) {
  const d = await S(() => window.strings.currentTask?.debug?.());
  if (!d || d.dodged >= 3) break;
  await S(() => { window.strings.sim.jump = 1; });
  await page.waitForTimeout(350);
}
await waitFor(() => window.strings.show.state !== "act" || window.strings.show.act > 2, null, 40000);
console.log("dodge ->", await S(() => ({ state: window.strings.show.state, stars: window.strings.show.stars })));

// ---- cave: gems
await go("cave");
await skipTo(1);
for (let i = 0; i < 5; i++) { const r = await S(() => { const s = window.strings; const t = s.currentTask?.target(); if (!t) return null; s.movePipTo(t.x, t.z); return 1; }); if (!r) break; await page.waitForTimeout(900); }
await waitFor(() => window.strings.show.act >= 2, null, 30000);
console.log("cave gems ->", await S(() => window.strings.show.act));
await draw();
console.log(logs.slice(0, 12).join("\n") || "no errors");
await browser.close();
