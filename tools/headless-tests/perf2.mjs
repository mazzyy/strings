import { chromium } from "playwright-core";
import fs from "node:fs";
const url = process.argv[2];
const base = `${process.env.HOME}/Library/Caches/ms-playwright/chromium-1248/chrome-mac-arm64`;
const exe = fs.readdirSync(base).find(f => f.endsWith(".app"));
const browser = await chromium.launch({ executablePath: `${base}/${exe}/Contents/MacOS/${exe.replace(".app","")}`, args: ["--use-angle=swiftshader","--enable-unsafe-swiftshader"] });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
let bytes = 0; page.on("response", async r => { try { if (r.url().startsWith(url.split("?")[0].replace(/\/$/, ""))) bytes += (await r.body()).length; } catch {} });
await page.addInitScript(() => localStorage.clear());
const t0 = Date.now();
await page.goto(url);
await page.waitForSelector("#begin", { timeout: 90000 });
const loadMs = Date.now() - t0;
await page.click("#begin");
await page.waitForTimeout(1500);
await page.evaluate(() => window.strings.raiseCurtain());
await page.waitForTimeout(4000);
const res = await page.evaluate(async () => {
  const s = window.strings, r = s.renderer;
  // draw calls in one full frame (bloom + shadow passes included)
  r.info.autoReset = false; r.info.reset();
  await new Promise(res => requestAnimationFrame(() => requestAnimationFrame(res)));
  const one = { calls: r.info.render.calls, tris: r.info.render.triangles };
  r.info.reset(); await new Promise(res => requestAnimationFrame(res)); const one2 = r.info.render.calls;
  r.info.autoReset = true;
  // JS cost per frame (simulation, AI, UI) with drawing switched off
  const draw = r.render.bind(r); r.render = () => {};
  const t = []; let last = performance.now();
  await new Promise(done => { let n = 0; const f = () => { const now = performance.now(); t.push(now - last); last = now; if (++n < 200) requestAnimationFrame(f); else done(); }; requestAnimationFrame(f); });
  r.render = draw;
  // GC pressure: heap growth over 3 s of simulation
  const h0 = performance.memory?.usedJSHeapSize || 0;
  r.render = () => {};
  await new Promise(res => setTimeout(res, 3000));
  const h1 = performance.memory?.usedJSHeapSize || 0;
  r.render = draw;
  return { calls: one.calls, calls2: one2, tris: one.tris, programs: r.info.programs.length, textures: r.info.memory.textures, geometries: r.info.memory.geometries, heapMB: +(h1 / 1048576).toFixed(1), pixelRatio: r.getPixelRatio() };
});
// measure update cost precisely: time the animation-loop body without rendering
const upd = await page.evaluate(async () => {
  const s = window.strings, r = s.renderer; const draw = r.render.bind(r); r.render = () => {};
  const st = performance.now(); let frames = 0;
  await new Promise(done => { const f = () => { frames++; if (performance.now() - st < 3000) requestAnimationFrame(f); else done(); }; requestAnimationFrame(f); });
  r.render = draw; return +(3000 / frames).toFixed(2);
});
console.log(JSON.stringify({ url, loadMs, kb: Math.round(bytes / 1024), ...res, msPerFrameNoDraw: upd }));
await browser.close();
