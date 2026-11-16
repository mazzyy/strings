import { chromium } from "playwright-core";
import fs from "node:fs";
const out = process.argv[2];
const base = `${process.env.HOME}/Library/Caches/ms-playwright/chromium-1248/chrome-mac-arm64`;
const exe = fs.readdirSync(base).find(f => f.endsWith(".app"));
const browser = await chromium.launch({ executablePath: `${base}/${exe}/Contents/MacOS/${exe.replace(".app","")}`, args: ["--use-angle=swiftshader","--enable-unsafe-swiftshader","--ignore-gpu-blocklist","--autoplay-policy=no-user-gesture-required"] });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
const logs = [];
page.on("console", m => { if ((m.type() === "error" || m.type() === "warning") && !m.text().includes("GL Driver") && !m.text().includes("GPU stall")) logs.push(`[${m.type()}] ${m.text()}`); });
page.on("pageerror", e => logs.push("pageerror " + e.message + " " + (e.stack||"").split("\n")[1]));
await page.addInitScript(() => localStorage.clear());
await page.goto("http://localhost:8095/");
await page.waitForSelector("#begin", { timeout: 60000 });
await page.screenshot({ path: `${out}/a-open.png` });
await page.click("#begin");
await page.waitForFunction(() => window.strings?.book.open, null, { timeout: 30000 });
await page.click("#storybook .skip");
await page.waitForFunction(() => window.strings?.hints.current === "cord", null, { timeout: 60000 });
await page.waitForTimeout(1500);
await page.screenshot({ path: `${out}/b-preshow.png` });
console.log("preshow", await page.evaluate(() => ({ preshow: window.strings.preshow, hint: window.strings.hints.current, chip: document.getElementById("hint").innerText })));
// drag the cord down with the mouse
const pt = await page.evaluate(() => {
  const s = window.strings; const v = s.stageRoot.localToWorld(s.cord.handle()).project(s.camera);
  return { x: (v.x + 1) / 2 * innerWidth, y: (1 - v.y) / 2 * innerHeight };
});
await page.mouse.move(pt.x, pt.y);
await page.mouse.down();
for (let i = 1; i <= 12; i++) { await page.mouse.move(pt.x, pt.y + i * 10); await page.waitForTimeout(40); }
const mid = await page.evaluate(() => ({ pull: +window.strings.cord.pull.toFixed(3), started: !window.strings.preshow, curtain: +window.strings.curtains.k.toFixed(2) }));
await page.mouse.up();
console.log("cord drag", JSON.stringify(mid));
// logic tests run faster without drawing
await page.waitForFunction(() => window.strings.show.state === "intro", null, { timeout: 90000 });
console.log("show", await page.evaluate(() => window.strings.show.scene.title));
await page.waitForTimeout(2000);
await page.screenshot({ path: `${out}/c-open.png` });
const r = await page.evaluate(async () => {
  const s = window.strings; const wait = (ms) => new Promise(r => setTimeout(r, ms));
  const res = {};
  // grab the bar so the scene runs
  s.sim.sticky = true; await wait(400);
  // Marlo's memory: third fall gets a giggle
  for (let i = 0; i < 3; i++) { s.detector.cool.fall = 0; s.detector.emit("fall", {}, 0); }
  res.falls = s.mind.mem.fall; res.queue = s.ai.queue.map(q => q.name).concat(s.ai.clip ? [s.ai.clip.name] : []);
  // copy-me challenge
  s.mind._challenge(); res.challenge = s.mind.challenge?.move;
  s.detector.cool[res.challenge] = 0; s.detector.emit(res.challenge, {}, 0);
  res.copied = s.mind.mem.copied; res.mood = s.mind.moodName;
  // sword before trust → wary
  s.mind.mood.trust = 0.3; const rr = s.mind.hear({ type: "hold", prop: "sword" }, { t: 1 }); res.sword = rr + "/" + s.mind.state; s.mind.state = "curious";
  return res;
});
console.log("mind", JSON.stringify(r));
// stop drawing to speed sim up for the long flows
await page.evaluate(() => { window.__draw = window.strings.renderer.render.bind(window.strings.renderer); window.strings.renderer.render = () => {}; });
// fetch: Marlo brings a prop to Sir Pip
await page.evaluate(() => { const s = window.strings; s.ai.queue.length = 0; s.ai.clip = null; s.mind._fetch(); });
await page.waitForFunction(() => window.strings.props.heldBy("pip"), null, { timeout: 120000 }).catch(() => {});
console.log("fetch", await page.evaluate(() => ({ pip: window.strings.props.heldBy("pip"), clip: window.strings.ai.current })));
// play the show through, performing with slapstick
await page.evaluate(() => { const s = window.strings; s.show.style = { grace: 0, slapstick: 0, drama: 0 }; for (let i = 0; i < 4; i++) s.show.hear({ type: "fall" }); s.show.skip(); });
await page.waitForFunction(() => window.strings.show.state === "act" || window.strings.show.act >= 1, null, { timeout: 60000 });
for (let k = 0; k < 3; k++) {
  await page.waitForFunction(() => window.strings.show.state === "act", null, { timeout: 90000 }).catch(() => {});
  await page.evaluate(() => window.strings.show.skip());
  await page.waitForTimeout(300);
}
await page.waitForFunction(() => window.strings.show.state === "ending", null, { timeout: 90000 }).catch(() => {});
console.log("ending", await page.evaluate(() => ({ state: window.strings.show.state, type: window.strings.show.endingType, confetti: window.strings.confetti.points.visible, clip: window.strings.ai.current })));
await page.evaluate(() => { window.strings.renderer.render = window.__draw; });
await page.waitForTimeout(2500);
await page.screenshot({ path: `${out}/d-ending.png` });
await page.evaluate(() => { window.strings.renderer.render = () => {}; });
await page.waitForFunction(() => ["finale", "done"].includes(window.strings.show.state), null, { timeout: 120000 }).catch(() => {});
console.log("finale", await page.evaluate(() => { const b = JSON.parse(localStorage.getItem("strings.playbills") || "[]")[0]; return { state: window.strings.show.state, bill: b, modeBtn: !document.getElementById("mode").hidden, knob: window.strings.stageRoot.children.length }; }));
// modes
await page.evaluate(() => window.strings.cycleMode());
console.log("mode", await page.evaluate(() => ({ mode: window.strings.mode.id, g: window.strings.pip.gravityScale })));
// fragile strings: a hard yank snaps a string
await page.evaluate(() => { const s = window.strings; s.applyMode(s.MODES[2], false); s.pip.main.held = true; s.pip.main.velocity.set(2, 0, 0); });
await page.waitForTimeout(300);
console.log("fragile", await page.evaluate(() => window.strings.pip.strings.filter(x => x.snapped > 0).map(x => x.name)));
await page.evaluate(() => window.strings.applyMode(window.strings.MODES[0], false));
// ghost duet
await page.evaluate(() => { window.strings.renderer.render = window.__draw; });
await page.evaluate(() => window.strings.toggleRecord());
await page.waitForTimeout(3000);
await page.evaluate(() => { window.strings.toggleRecord(); window.strings.startReplay(); });
await page.waitForTimeout(1500);
console.log("ghost", await page.evaluate(() => { const s = window.strings; return { vis: s.ghost.group.visible, ghostX: +s.ghost.main.position.x.toFixed(3), pipX: +s.pip.main.position.x.toFixed(3) }; }));
await page.evaluate(() => { const s = window.strings; s.ghostDetector.emit("bow", {}, 0); s.detector.cool.bow = 0; s.detector.emit("bow", {}, 0); });
await page.waitForTimeout(1500);
console.log("sync emote", await page.evaluate(() => [...window.strings.emotes.slots.entries()].map(([k, v]) => k + ":" + v.sprite.visible)));
await page.screenshot({ path: `${out}/e-duet.png` });
console.log("draw calls", await page.evaluate(() => JSON.stringify(window.strings.renderer.info.render)));
console.log(logs.slice(0, 20).join("\n") || "no errors");
await browser.close();
