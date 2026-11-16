import { chromium } from "playwright-core";
import fs from "node:fs";
const base = `${process.env.HOME}/Library/Caches/ms-playwright/chromium-1248/chrome-mac-arm64`;
const exe = fs.readdirSync(base).find(f => f.endsWith(".app"));
const browser = await chromium.launch({ executablePath: `${base}/${exe}/Contents/MacOS/${exe.replace(".app","")}`, args: ["--use-angle=swiftshader","--enable-unsafe-swiftshader"] });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
await page.addInitScript(() => localStorage.clear());
await page.goto(process.argv[2] + "?autostart");
await page.waitForFunction(() => window.strings?.show.state === "intro", null, { timeout: 90000 });
const chapter = process.argv[3];
if (chapter) {
  await page.evaluate((id) => { const s = window.strings; s.storyMap.state.unlocked = 6; s.changeScene(s.storyMap.places.find(p => p.id === id)); }, chapter);
  await page.waitForFunction(() => window.strings.book.open, null, { timeout: 30000 }).catch(() => {});
  await page.evaluate(() => window.strings.book.finish());
  await page.waitForFunction((id) => window.strings.chapter.id === id && window.strings.show.state === "intro", chapter, { timeout: 120000 });
  await page.evaluate(() => { window.strings.sim.sticky = true; });
  await page.waitForFunction(() => window.strings.show.state === "act", null, { timeout: 60000 });
}
await page.waitForTimeout(1500);
console.log(await page.evaluate(async () => {
  const s = window.strings, r = s.renderer;
  // 1) JS per frame for the whole loop body except GPU work: patch render to measure its CPU share separately
  let renderMs = 0, frames = 0;
  const draw = r.render.bind(r);
  r.render = (a, b) => { const t = performance.now(); draw(a, b); renderMs += performance.now() - t; };
  // total time spent inside the animation loop callback
  const loopStart = performance.now();
  let busy = 0, last = performance.now();
  await new Promise(done => { const f = () => { frames++; if (performance.now() - loopStart < 4000) requestAnimationFrame(f); else done(); }; requestAnimationFrame(f); });
  r.render = draw;
  // 2) a pure CPU sample of the per-frame update (no drawing)
  r.render = () => {};
  const N = 120; let t0 = performance.now(), n = 0;
  await new Promise(done => { const f = () => { if (++n < N) requestAnimationFrame(f); else done(); }; requestAnimationFrame(f); });
  r.render = draw;
  r.info.autoReset = false; r.info.reset();
  await new Promise(res => requestAnimationFrame(() => requestAnimationFrame(res)));
  const calls = r.info.render.calls / 2;
  r.info.autoReset = true;
  let objs = 0, vis = 0; s.scene.traverse(o => { objs++; }); s.scene.traverseVisible(o => { vis++; });
  return JSON.stringify({ frames, fps: +(frames / 4).toFixed(1), renderCpuMsPerFrame: +(renderMs / frames).toFixed(2), drawCalls: calls, sceneNodes: objs, visibleNodes: vis, programs: r.info.programs.length, textures: r.info.memory.textures, geometries: r.info.memory.geometries });
}));
await browser.close();
