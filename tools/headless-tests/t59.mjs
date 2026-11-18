// The Toymaker's Workshop: Twig's side tale plays end to end (true-or-fib with his growing
// nose, teaching him to dance, the bow), it sits on the map as an open side tale, and Free
// Play has Twig (as you and as co-star), the Workshop stage, and his fib / own-up toys.
//   node t59.mjs <out-dir> [port]
import { chromium } from "playwright-core";
import fs from "node:fs";
const out = process.argv[2] || "/tmp/t59";
const port = process.argv[3] || 8095;
fs.mkdirSync(out, { recursive: true });
const base = `${process.env.HOME}/Library/Caches/ms-playwright/chromium-1248/chrome-mac-arm64`;
const exe = fs.readdirSync(base).find((f) => f.endsWith(".app"));
const browser = await chromium.launch({ executablePath: `${base}/${exe}/Contents/MacOS/${exe.replace(".app", "")}`, args: ["--use-angle=metal", "--enable-gpu", "--ignore-gpu-blocklist", "--autoplay-policy=no-user-gesture-required"] });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
const errors = [], played = [];
page.on("pageerror", (e) => errors.push(e.message));
page.on("console", (m) => { if (m.type() === "error" && !m.text().includes("404")) errors.push(m.text()); });
page.on("request", (r) => { if (r.url().includes("/voice/")) played.push(r.url().split("/").pop()); });
const S = (fn, a) => page.evaluate(fn, a);
const waitFor = (fn, a, ms = 90000) => page.waitForFunction(fn, a, { timeout: ms }).then(() => true).catch(() => false);
await page.addInitScript(() => localStorage.clear());
await page.goto(`http://localhost:${port}/?autostart&quality=low`);
await waitFor(() => window.strings?.show.state === "intro");
const R = {};
// the map: the workshop is there, open, and not numbered
// the map: the workshop sits on the road between chapters two and three (locked until you get there)
R.map = await S(async () => {
  const L = await import("/src/lines.js");
  const m = window.strings.storyMap, p = m.places.find((q) => q.id === "workshop"), ids = L.CHAPTERS.map((c) => c.id);
  const lockedAtFirst = !m.unlocked(p);
  m.unlockAll(); m.show(false);
  return { there: !!p, open: m.unlocked(p), side: !!p?.side, lockedAtFirst, between: ids.indexOf("workshop") === ids.indexOf("forest") + 1 && ids.indexOf("ship") === ids.indexOf("workshop") + 1, shipStillThree: L.chapterNumber(L.CHAPTERS.find((c) => c.id === "ship")) === 3 };
});
await page.waitForTimeout(600);
await page.screenshot({ path: `${out}/1-map.png` });
await S(() => window.strings.storyMap.hide());
// play the side tale
await S(() => { const s = window.strings; s.changeScene(s.storyMap.places.find((p) => p.id === "workshop")); });
R.book = await waitFor(() => window.strings.book.open, null, 30000);
await page.waitForTimeout(2500);
await page.screenshot({ path: `${out}/2-book.png` });
await S(() => window.strings.book.finish());
await waitFor(() => window.strings.chapter.id === "workshop" && window.strings.show.state === "intro");
R.cast = await S(() => ({ guest: window.strings.guestId, set: window.strings.sets.current }));
await S(() => { const s = window.strings; s.sim.sticky = true; s.sim._hasMouse = false; });
R.act1 = await waitFor(() => window.strings.show.state === "act" && window.strings.currentTask?.debug?.().round !== undefined);
// three rounds of true-or-fib: answer each correctly by walking onto the right log slice
R.rounds = [];
for (let k = 0; k < 3; k++) {
  const ok = await waitFor((k) => { const d = window.strings.currentTask?.debug?.(); return d && d.round === k && d.phase === "answer"; }, k, 60000);
  await page.waitForTimeout(400); // (let the stones see him off them first)
  const d = await S(() => window.strings.currentTask.debug());
  if (k === 0) await page.screenshot({ path: `${out}/3-answer.png` });
  // stand on the answer until it's taken (the headless browser runs slower than real time)
  let answered = false;
  for (let tries = 0; tries < 40 && !answered; tries++) {
    await S((truth) => window.strings.placePip(truth ? -0.3 : -0.06, 0.012), d.truth);
    answered = await waitFor((k) => { const q = window.strings.currentTask?.debug?.(); return !q || q.round !== k || q.phase !== "answer"; }, k, 700);
  }
  R.rounds.push({ ok: ok && answered, truth: d.truth, nose: +(d.nose || 0).toFixed(3) });
  await S(() => window.strings.placePip(-0.18, 0.03));
}
R.act2 = await waitFor(() => window.strings.show.act === 1 && window.strings.show.state === "act", null, 60000);
R.noseAfterConfess = await S(() => +window.strings.guests.twig.skin.extra.nose().toFixed(3));
// teach him three moves
for (const m of ["jump", "bow", "turn"]) { await S((m) => window.strings.show.hear({ type: m }), m); await page.waitForTimeout(1900); }
R.act3 = await waitFor(() => window.strings.show.act === 2 && window.strings.show.state === "act", null, 60000);
await S(() => window.strings.show.hear({ type: "bow" }));
R.ending = await waitFor(() => ["ending", "finale", "done"].includes(window.strings.show.state), null, 30000);
R.endingLine = await S(() => document.getElementById("caption")?.textContent || "");
R.finale = await waitFor(() => ["finale", "done"].includes(window.strings.show.state), null, 30000);
R.done = await S(() => ({ done: !!window.strings.storyMap.state.done.workshop, unlocked: window.strings.storyMap.state.unlocked }));
await page.waitForTimeout(1200);
await page.screenshot({ path: `${out}/4-playbill.png` });
// free play: Twig as co-star in the workshop, he fibs and his nose grows
await S(() => { const s = window.strings; s.startFreePlay(); s.playground.pick("stage", "workshop"); });
await page.waitForTimeout(1500);
await S(() => { const s = window.strings; s.playground.cool = 0; s.playground.pick("costar", "twig"); });
await page.waitForTimeout(3000);
const before = await S(() => window.strings.guests.twig.skin.extra.nose());
await S(() => { const s = window.strings; s.playground.cool = 0; s.playground.pick("toys", "fib"); });
await waitFor((b) => window.strings.guests.twig.skin.extra.nose() > b + 0.008, before, 20000);
R.freeFib = { before: +before.toFixed(3), after: +(await S(() => window.strings.guests.twig.skin.extra.nose())).toFixed(3) };
await S(() => { const s = window.strings; s.playground.cool = 0; s.playground.pick("you", "twig"); });
await page.waitForTimeout(1500);
R.player = await S(() => window.strings.playerId);
await page.screenshot({ path: `${out}/5-freeplay.png` });
R.voice = played.length;
console.log(JSON.stringify(R, null, 1));
console.log("errors:", errors.length ? errors.slice(0, 8) : "none");
const ok = !errors.length && R.map.there && R.map.open && R.map.lockedAtFirst && R.map.between && R.map.shipStillThree && R.book && R.cast.guest === "twig" && R.cast.set === "workshop" && R.rounds.every((r) => r.ok) &&
  R.rounds.some((r) => !r.truth && r.nose > 0.02) && R.act2 && R.noseAfterConfess < 0.02 && R.act3 && R.ending && R.done.done &&
  R.freeFib.after > R.freeFib.before && R.player === "twig";
console.log(ok ? "PASS" : "FAIL");
await browser.close();
process.exit(ok ? 0 : 1);
