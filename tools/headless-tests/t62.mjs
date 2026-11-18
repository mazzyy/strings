// The story comes first: a player who keeps moving Sir Pip while a chapter opens (jumps,
// walks, bows, spins, falls, all the time) must not hold the story up. The first act's goal
// is given promptly, and there's no running commentary on his moves while the chapter opens,
// a goal is given or a task runs. (Simple acts, once their goal is given, still get it.)
//   node t62.mjs [port]
import { chromium } from "playwright-core";
import fs from "node:fs";
const port = process.argv[2] || 8095;
const base = `${process.env.HOME}/Library/Caches/ms-playwright/chromium-1248/chrome-mac-arm64`;
const exe = fs.readdirSync(base).find((f) => f.endsWith(".app"));
const browser = await chromium.launch({ executablePath: `${base}/${exe}/Contents/MacOS/${exe.replace(".app", "")}`, args: ["--use-angle=metal", "--enable-gpu", "--ignore-gpu-blocklist"] });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
const S = (fn, a) => page.evaluate(fn, a);
await page.addInitScript(() => localStorage.clear());
await page.goto(`http://localhost:${port}/?autostart&quality=low`);
await page.waitForFunction(() => window.strings?.show.state === "intro", null, { timeout: 90000 });
await S(async () => {
  const s = window.strings, L = await import("/src/lines.js");
  const remarks = new Set(Object.values(L.LINES).flat().map((l) => l.split("{")[0].slice(0, 24)));
  window.__said = [];
  const say = s.narrator.say.bind(s.narrator);
  s.narrator.say = (line, a) => { window.__said.push({ line, remark: [...remarks].some((r) => line.startsWith(r)), state: s.show.state, actT: +s.show.actT.toFixed(1), act: s.show.act, task: !!s.currentTask }); return say(line, a); };
  s.renderer.__r = s.renderer.render; s.renderer.render = () => {};
});
const R = {};
for (const id of ["courtyard", "forest", "workshop"]) {
  await S(() => { window.__said.length = 0; });
  await S((id) => { const s = window.strings; s.storyMap.unlockAll(); s.changeScene(s.storyMap.places.find((p) => p.id === id)); }, id);
  await page.waitForFunction(() => window.strings.book.open, null, { timeout: 30000 });
  await S(() => window.strings.book.finish());
  await page.waitForFunction((id) => window.strings.chapter.id === id && window.strings.show.state === "intro", id, { timeout: 60000 });
  await S(() => { const s = window.strings; s.sim.sticky = true; s.sim._hasMouse = false; });
  // play with him the whole time: a move every 0.8 s
  const t0 = Date.now();
  const moves = ["jump", "walk", "bow", "turn", "fall", "rise", "wave", "jump"];
  let goalAt = null, k = 0;
  while (Date.now() - t0 < 40000) {
    await S((m) => { const s = window.strings; if (s.show.state !== "idle") s.detector.emit(m, m === "walk" ? { where: "across the stage" } : {}, 0); }, moves[k++ % moves.length]);
    await page.waitForTimeout(800);
    const st = await S(() => ({ state: window.strings.show.state, goal: window.__said.some((x) => x.line.startsWith("Act one")) }));
    if (st.goal && goalAt === null) goalAt = (Date.now() - t0) / 1000;
    if (goalAt !== null && Date.now() - t0 > goalAt * 1000 + 12000) break;
  }
  const said = await S(() => window.__said);
  const badRemarks = said.filter((x) => x.remark && x.state !== "idle" && x.state !== "done" && (x.state !== "act" || x.task || x.actT < 7));
  R[id] = { goalAfterSec: goalAt, lines: said.length, remarksWhileStoryTalks: badRemarks.map((x) => `${x.state}@${x.actT}: ${x.line.slice(0, 40)}`) };
  await S(() => { const s = window.strings; s.sim.sticky = false; });
}
console.log(JSON.stringify(R, null, 1));
console.log("errors:", errors.length ? errors.slice(0, 5) : "none");
const ok = !errors.length && Object.values(R).every((r) => r.goalAfterSec !== null && r.goalAfterSec < 25 && !r.remarksWhileStoryTalks.length);
console.log(ok ? "PASS" : "FAIL");
await browser.close();
process.exit(ok ? 0 : 1);
