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
await page.waitForFunction(() => window.strings?.book.open, null, { timeout: 120000 });
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

// ---- tower: sneak, unlock, dodge
await go("tower");
await draw(); await page.waitForTimeout(1500); await page.screenshot({ path: `${out}/t-sneak.png` }); await fast();
// wander in front of Clank to get caught, then go straight to the key
await S(() => window.strings.movePipTo(0.05, 0.15));

for (let i = 0; i < 110; i++) { await S((i) => { const s = window.strings; s.__hx ??= s.sim.mainPos.x; s.sim.mainPos.x = s.__hx + Math.sin(i) * 0.03; }, i); await page.waitForTimeout(150); if (await S(() => window.strings.currentTask?.debug?.().caught) > 0) break; }
const caught = await S(() => window.strings.currentTask?.debug?.().caught);
console.log("pip at", await S(() => window.strings.pip.get("pelvis").toArray().map(v => +v.toFixed(2))));
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
for (let i = 0; i < 200; i++) {
  const d = await S(() => window.strings.currentTask?.debug?.());
  if (!d || d.dodged >= 6) break;
  await S(() => { window.strings.sim.jump = 1; });
  await page.waitForTimeout(350);
}
await waitFor(() => window.strings.show.state !== "act" || window.strings.show.act > 2, null, 40000);
console.log("dodge ->", await S(() => ({ state: window.strings.show.state, stars: window.strings.show.stars })));

await draw();
console.log(logs.slice(0, 12).join("\n") || "no errors");
await browser.close();
