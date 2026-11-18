// The Harbour Laundry: Noodle the sock puppet's tale between chapters three and four. The
// robot stays standing behind the stage (face in view) and reaches down under it to work Noodle: peekaboo through three holes, finding the twin sock on the washing line (and
// Doodle popping up on his other hand), the bow. Then: the curtain call has Twig and both
// socks, the story maker stages a sock-puppet story, and the robot comes back up afterwards.
//   node t60.mjs <out-dir> [port]
import { chromium } from "playwright-core";
import fs from "node:fs";
const out = process.argv[2] || "/tmp/t60";
const port = process.argv[3] || 8095;
fs.mkdirSync(out, { recursive: true });
const base = `${process.env.HOME}/Library/Caches/ms-playwright/chromium-1248/chrome-mac-arm64`;
const exe = fs.readdirSync(base).find((f) => f.endsWith(".app"));
const browser = await chromium.launch({ executablePath: `${base}/${exe}/Contents/MacOS/${exe.replace(".app", "")}`, args: ["--use-angle=metal", "--enable-gpu", "--ignore-gpu-blocklist", "--autoplay-policy=no-user-gesture-required"] });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
const errors = [];
page.on("pageerror", (e) => errors.push(e.message + " @ " + (e.stack || "").split("\n")[1]));
page.on("console", (m) => { if (m.type() === "error" && !m.text().includes("404")) errors.push(m.text()); });
const S = (fn, a) => page.evaluate(fn, a);
const waitFor = (fn, a, ms = 90000) => page.waitForFunction(fn, a, { timeout: ms }).then(() => true).catch(() => false);
await page.addInitScript(() => localStorage.clear());
await page.goto(`http://localhost:${port}/?autostart&quality=low`);
await waitFor(() => window.strings?.show.state === "intro");
const R = {};
R.order = await S(async () => { const L = await import("/src/lines.js"); return L.CHAPTERS.map((c) => c.id + (c.side ? "*" : L.chapterNumber(c))).join(" "); });
await S(() => { const s = window.strings; s.storyMap.unlockAll(); s.changeScene(s.storyMap.places.find((p) => p.id === "laundry")); });
R.book = await waitFor(() => window.strings.book.open, null, 30000);
await page.waitForTimeout(2000);
await page.screenshot({ path: `${out}/1-book.png` });
await S(() => window.strings.book.finish());
await waitFor(() => window.strings.chapter.id === "laundry" && window.strings.show.state === "intro");
await page.waitForTimeout(2500); // (he crouches down behind the stage)
R.staged = await S(() => { const s = window.strings; return { guest: s.guestId, set: s.sets.current, under: s.hand.under, robotY: +s.robot.group.position.y.toFixed(3), robotScale: s.robot.group.scale.x, holes: s.hand.holes.length, noodle: !!s.socks.noodle?.group.visible }; });
await S(() => { const s = window.strings; s.sim.sticky = true; s.sim._hasMouse = false; });
R.act1 = await waitFor(() => window.strings.show.state === "act" && window.strings.currentTask?.debug?.().got !== undefined);
// peekaboo: go to each hole Noodle pops out of
let shot = false;
for (let k = 0; k < 30; k++) {
  const d = await S(() => window.strings.currentTask?.debug?.());
  if (!d || d.got === undefined || d.got >= 3) break;
  if (d.phase === "up") {
    if (!shot) { await page.screenshot({ path: `${out}/2-peekaboo.png` }); shot = true; }
    await S((at) => { const h = window.strings.hand.holes[at]; window.strings.movePipTo(h[0] - 0.03, h[1]); }, d.at);
  }
  await page.waitForTimeout(700);
}
R.booped = await S(() => window.strings.currentTask?.debug?.().got ?? "done");
R.act2 = await waitFor(() => window.strings.show.act === 1 && window.strings.currentTask?.debug?.().right !== undefined, null, 60000);
await page.waitForTimeout(2500);
await page.screenshot({ path: `${out}/3-socks.png` });
const m = await S(() => window.strings.currentTask.debug());
for (let k = 0; k < 30; k++) {
  await S((x) => window.strings.movePipTo(x, 0.03), m.at[m.right]);
  if (await waitFor(() => window.strings.currentTask?.debug?.().phase !== "choose", null, 700)) break;
}
R.found = await waitFor(() => window.strings.socks.doodle?.group.visible, null, 30000);
await page.waitForTimeout(2500);
await page.screenshot({ path: `${out}/4-twins.png` });
R.act3 = await waitFor(() => window.strings.show.act === 2 && window.strings.show.state === "act", null, 60000);
await S(() => window.strings.show.hear({ type: "bow" }));
R.finale = await waitFor(() => ["finale", "done"].includes(window.strings.show.state), null, 40000);
R.done = await S(() => !!window.strings.storyMap.state.done.laundry);
// the curtain call: the night sky chapter, skipped to its end
await S(() => { const s = window.strings; s.changeScene(s.storyMap.places.find((p) => p.id === "sky")); });
await waitFor(() => window.strings.book.open, null, 30000);
await page.waitForTimeout(2500); // (and stands up again)
R.robotBack = await S(() => ({ under: window.strings.hand.under, scale: window.strings.robot.group.scale.x, y: +window.strings.robot.group.position.y.toFixed(3) }));
await S(() => window.strings.book.finish());
await waitFor(() => window.strings.chapter.id === "sky" && ["intro", "act"].includes(window.strings.show.state));
for (let k = 0; k < 80 && !["ending", "finale"].includes(await S(() => window.strings.show.state)); k++) { await S(() => { const s = window.strings.show; if (s.state === "act") s.skip(); else if (s.state === "intro") s._nextAct(); }); await page.waitForTimeout(900); }
await page.waitForTimeout(5000);
R.curtainCall = await S(() => { const s = window.strings; return { state: s.show.state, twig: !!s.extra("twig").on, noodle: !!s.socks.noodle?.group.visible, doodle: !!s.socks.doodle?.group.visible }; });
await page.screenshot({ path: `${out}/5-curtaincall.png` });
// make your own story: a sock-puppet story is staged with Noodle (and the robot under the stage)
R.story = await S(async () => {
  const M = await import("/src/storymaker.js"), s = window.strings;
  const p = M.parseStory("A sock puppet lost its twin in the laundry, and wants to play peekaboo.");
  s.playStory(M.buildStory(p));
  await new Promise((f) => setTimeout(f, 6000));
  return { villain: p.villain, place: p.place, acts: M.buildStory(p).acts.map((a) => a.task?.type || a.check).join(","), guest: s.guestId, under: s.hand.under };
});
console.log(JSON.stringify(R, null, 1));
console.log("errors:", errors.length ? errors.slice(0, 8) : "none");
const ok = !errors.length && R.order.includes("forest2 workshop* ship3 laundry* bridge4") && R.book && R.staged.guest === "noodle" && R.staged.under && R.staged.robotY < -0.1 && R.staged.robotY > -0.4 && R.staged.robotScale > 1 && R.staged.holes === 3 && R.staged.noodle &&
  R.act1 && R.act2 && R.found && R.act3 && R.finale && R.done && !R.robotBack.under && R.robotBack.scale > 1 && Math.abs(R.robotBack.y) < 0.01 && R.curtainCall.twig && R.curtainCall.noodle && R.curtainCall.doodle &&
  R.story.guest === "noodle" && R.story.under;
console.log(ok ? "PASS" : "FAIL");
await browser.close();
process.exit(ok ? 0 : 1);
