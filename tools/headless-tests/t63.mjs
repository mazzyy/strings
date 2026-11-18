// Desktop: the bar you hold stays under the on-screen hand. A click well away from the bar,
// dragging down past the bar's height limit and back, and the game moving Sir Pip itself must
// not leave the hand and the bar apart.
//   node t63.mjs [port]
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
// how far the held bar is from where it should sit under the hand
const gap = () => S(() => { const s = window.strings, h = s.sim.main.anchor, b = s.pip.main.position; return +Math.hypot(b.x - (h.x + 0.01), b.y - Math.max(0.22, h.y - 0.03), b.z - (h.z + 0.03)).toFixed(4); });
const R = {};
// grab with the mouse far to the left of Sir Pip, then drag about
await page.mouse.move(250, 260);
await page.waitForTimeout(500);
await page.mouse.down();
await page.waitForTimeout(2500);
R.afterFarClick = await gap();
for (const [x, y] of [[700, 300], [900, 420], [500, 380]]) { await page.mouse.move(x, y, { steps: 12 }); await page.waitForTimeout(400); }
await page.waitForTimeout(2500);
R.afterDrag = await gap();
// down past the bar's height limit, then back up
await page.mouse.move(640, 780, { steps: 10 }); await page.waitForTimeout(1500);
await page.mouse.move(640, 300, { steps: 10 }); await page.waitForTimeout(2500);
R.afterLowAndBack = await gap();
// the story moves Sir Pip itself (the tower's searchlight catches him: back to the start).
// The hand lets go, he stays there, and the hand picks him up again once it reaches his bar.
await S(() => window.strings.storyMovePip(0.2, 0.03));
await page.waitForTimeout(2500);
R.afterStoryMove = await S(() => ({ pelvisX: +window.strings.pip.get("pelvis").x.toFixed(3), held: [...window.strings.grabs.keys()].length }));
const bar = await S(() => { const s = window.strings, v = s.pip.main.position.clone(); s.stageRoot.localToWorld(v); v.project(s.camera); return [(v.x + 1) / 2 * innerWidth, (1 - v.y) / 2 * innerHeight]; });
await page.mouse.move(bar[0], bar[1] - 25, { steps: 15 });
await page.waitForTimeout(2500);
R.regrabbed = { held: await S(() => [...window.strings.grabs.keys()].length), gap: await gap() };
await page.mouse.up();
console.log(JSON.stringify(R));
console.log("errors:", errors.length ? errors.slice(0, 5) : "none");
const ok = !errors.length && R.afterFarClick < 0.02 && R.afterDrag < 0.02 && R.afterLowAndBack < 0.02 && Math.abs(R.afterStoryMove.pelvisX - 0.2) < 0.06 && R.afterStoryMove.held === 0 && R.regrabbed.held === 1 && R.regrabbed.gap < 0.02;
console.log(ok ? "PASS" : "FAIL");
await browser.close();
process.exit(ok ? 0 : 1);
