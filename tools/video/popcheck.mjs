// The pop-up storybook, page by page, in the headset emulator (seen a little from one side).
//   node popcheck.mjs <outdir>
import { launch, installPuppeteer, W, H, sleep } from "./lib.mjs";
const out = process.argv[2];
const browser = await launch();
const page = await browser.newPage({ viewport: { width: W, height: H } });
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
await page.addInitScript(() => localStorage.clear());
await page.goto("http://localhost:8080/?emulate&quality=high");
await page.waitForSelector("#go-vr:not([hidden])", { timeout: 90000 });
await page.click("#go-vr");
await sleep(2600);
await page.evaluate(() => { const s = strings; s.raiseCurtain(); s.storyMap.state.unlocked = 7; setTimeout(() => s.changeScene(s.storyMap.places.find((p) => p.id === "forest")), 1200); });
await page.waitForFunction(() => strings.book.open && strings.book.mesh.visible, null, { timeout: 40000 });
await installPuppeteer(page);
await page.evaluate(async () => {
  const L = await import("/src/lines.js"), s = strings, b = s.book, p = b.mesh.position.clone();
  const cam = [p.x - 0.16, p.y + 0.05, p.z + 0.46];
  V.cam(cam, [p.x - 0.03, p.y - 0.012, p.z], 0.8); V.to({ x: 0.22, y: -0.1, z: 0.5 }); V.left({ x: -0.22, y: -0.1, z: 0.5 });
  b.mesh.rotation.set(-Math.atan2(0.05, 0.5), 0, 0, "YXZ");
  const all = { prologue: L.PROLOGUE, epilogue: L.EPILOGUE }; for (const c of L.CHAPTERS) all[c.id] = c;
  window.SHOW = (id, n) => { b.minT = 999; b.pageT = 0; b._clearPop(); b.prevC.getContext("2d").drawImage(b.canvas, 0, 0); b.chapter = all[id]; b.page = n; b.draw(b.nextC.getContext("2d")); b.flip = { t: 0, dur: 0.5 }; b.turning = true; };
});
const pages = [["prologue", 0], ["prologue", 1], ["courtyard", 2], ["forest", 2], ["ship", 1], ["bridge", 1], ["tower", 1], ["cave", 1], ["sky", 2], ["epilogue", 1]];
for (const [id, n] of pages) { await page.evaluate(([id, n]) => SHOW(id, n), [id, n]); await sleep(2300); await page.screenshot({ path: `${out}/pop-${id}-${n}.png`, clip: { x: 330, y: 150, width: 1260, height: 760 } }); }
// mid-pop: catch the cut-outs swinging up
await page.evaluate(() => SHOW("courtyard", 2)); await sleep(1000); await page.screenshot({ path: `${out}/pop-mid.png`, clip: { x: 330, y: 150, width: 1260, height: 760 } });
console.log("layers", await page.evaluate(() => strings.book.pops.length), "errors:", errors.length ? errors : "none");
await browser.close();
