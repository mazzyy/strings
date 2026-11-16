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
await page.goto("http://localhost:8095/?autostart");
await page.waitForFunction(() => window.strings?.show.state === "intro", null, { timeout: 90000 });
await page.waitForTimeout(1500);
await page.screenshot({ path: `${out}/s1-courtyard.png` });
// --- prop hover + slightly-off click
const fl = await page.evaluate(() => { const s = window.strings; const v = s.stageRoot.localToWorld(s.props.position("flower")).project(s.camera); return { x: (v.x + 1) / 2 * innerWidth, y: (1 - v.y) / 2 * innerHeight }; });
await page.mouse.move(fl.x + 9, fl.y - 9);
await page.waitForTimeout(600);
const tip = await page.evaluate(() => ({ on: document.getElementById("tip").classList.contains("on"), text: document.getElementById("tip").textContent, cursor: document.getElementById("view").style.cursor }));
await page.screenshot({ path: `${out}/s2-hover.png` });
await page.mouse.click(fl.x + 9, fl.y - 9);
await page.waitForTimeout(600);
console.log("prop hover", JSON.stringify(tip), "held:", await page.evaluate(() => window.strings.props.heldBy("pip")));
// click near the guest to give it
const gp = await page.evaluate(() => { const s = window.strings; const v = s.stageRoot.localToWorld(s.marlo.get("chest").clone()).project(s.camera); return { x: (v.x + 1) / 2 * innerWidth, y: (1 - v.y) / 2 * innerHeight }; });
await page.mouse.click(gp.x + 6, gp.y + 4);
await page.waitForTimeout(600);
console.log("give to guest:", await page.evaluate(() => window.strings.props.heldBy("marlo")));
// --- finish chapter 1 fast, the map should open
await page.evaluate(() => { const s = window.strings; s.renderer.__r = s.renderer.render; s.renderer.render = () => {}; s.sim.sticky = true; });
for (let k = 0; k < 4; k++) { await page.waitForFunction(() => ["act", "ending", "finale", "done"].includes(window.strings.show.state), null, { timeout: 60000 }); await page.evaluate(() => window.strings.show.skip()); await page.waitForTimeout(400); }
await page.waitForFunction(() => window.strings.storyMap.open, null, { timeout: 180000 }).catch(() => {});
await page.evaluate(() => { const s = window.strings; s.renderer.render = s.renderer.__r; s.sim.sticky = false; });
console.log("map", await page.evaluate(() => ({ open: window.strings.storyMap.open, unlocked: window.strings.storyMap.state.unlocked, done: Object.keys(window.strings.storyMap.state.done) })));
await page.waitForTimeout(800);
await page.screenshot({ path: `${out}/s3-map.png` });
// click the forest on the map
const fp = await page.evaluate(() => { const m = window.strings.storyMap; const p = m.places.find(x => x.id === "forest"); const r = m.canvas.getBoundingClientRect(); return { x: r.left + (p.map[0] - m.cam.x) / 1200 * r.width, y: r.top + (p.map[1] - m.cam.y) / 750 * r.height }; });
await page.mouse.click(fp.x, fp.y);
await page.waitForTimeout(1200);
await page.screenshot({ path: `${out}/s4-travel.png` });
await page.waitForFunction(() => window.strings.guestId === "wizard" && window.strings.show.state === "intro", null, { timeout: 120000 }).catch(() => {});
console.log("forest", await page.evaluate(() => ({ guest: window.strings.guestId, set: window.strings.sets.current, scene: window.strings.show.scene?.title, state: window.strings.show.state })));
await page.waitForTimeout(1500);
await page.screenshot({ path: `${out}/s5-forest.png` });
// talk offline to the wizard
await page.evaluate(() => { const s = window.strings; s.narrator.ai = false; s.talk._answer("hello there"); });
await page.waitForTimeout(800);
console.log("talk", await page.evaluate(() => document.getElementById("caption").textContent));
// --- visit every other chapter
for (const id of ["ship", "bridge", "cave"]) {
  await page.evaluate((id) => { const s = window.strings; s.storyMap.state.unlocked = 5; s.changeScene(s.storyMap.places.find(p => p.id === id)); }, id);
  await page.waitForFunction((id) => window.strings.chapter.id === id && window.strings.show.state === "intro", id, { timeout: 120000 }).catch(() => {});
  await page.waitForTimeout(2500);
  const info = await page.evaluate(() => ({ guest: window.strings.guestId, set: window.strings.sets.current, scene: window.strings.show.scene?.title }));
  if (id === "ship") { const r = await page.evaluate(() => window.strings.mind.hear({ type: "hold", prop: "sword" }, { t: 1 })); info.swordReaction = r; }
  if (id === "bridge") info.trollMood = await page.evaluate(() => window.strings.mind.moodName);
  console.log(id, JSON.stringify(info));
  await page.screenshot({ path: `${out}/s6-${id}.png` });
}
console.log("draw calls", await page.evaluate(async () => { const r = window.strings.renderer; r.info.autoReset = false; r.info.reset(); await new Promise(res => requestAnimationFrame(() => requestAnimationFrame(res))); const c = r.info.render.calls; r.info.autoReset = true; return c; }));
console.log(logs.slice(0, 12).join("\n") || "no errors");
await browser.close();
