import { chromium } from "playwright-core";
import fs from "node:fs";
const base = `${process.env.HOME}/Library/Caches/ms-playwright/chromium-1248/chrome-mac-arm64`;
const exe = fs.readdirSync(base).find(f => f.endsWith(".app"));
const browser = await chromium.launch({ executablePath: `${base}/${exe}/Contents/MacOS/${exe.replace(".app","")}`, args: ["--use-angle=swiftshader","--enable-unsafe-swiftshader","--js-flags=--expose-gc"] });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
await page.addInitScript(() => localStorage.clear());
await page.goto(process.argv[2]);
await page.waitForSelector("#begin", { timeout: 90000 });
await page.evaluate(() => window.strings.raiseCurtain());
await page.waitForTimeout(3000);
console.log(await page.evaluate(async () => {
  const s = window.strings;
  s.sim.sticky = true; // performing: bar held
  const names = ["ai", "pip", "marlo", "detector", "show", "props", "hints", "narrator", "robot", "mind", "emotes", "confetti", "curtains", "cord"];
  const acc = {}; let frames = 0;
  for (const n of names) {
    const o = s[n]; if (!o || typeof o.update !== "function") continue;
    const orig = o.update.bind(o); acc[n] = 0;
    o.update = (...a) => { const t = performance.now(); const r = orig(...a); acc[n] += performance.now() - t; return r; };
  }
  const r = s.renderer; const draw = r.render.bind(r); r.render = () => {};
  // move the hand about so the knight walks
  const t0 = performance.now();
  await new Promise(done => { const f = () => { frames++; s.sim.mainPos.x = -0.15 + Math.sin(frames / 20) * 0.12; if (performance.now() - t0 < 4000) requestAnimationFrame(f); else done(); }; requestAnimationFrame(f); });
  r.render = draw;
  const per = Object.fromEntries(Object.entries(acc).map(([k, v]) => [k, +(v / frames).toFixed(3)]));
  const total = Object.values(acc).reduce((a, b) => a + b, 0) / frames;
  return JSON.stringify({ frames, msPerFrameTotal: +total.toFixed(3), per });
}));
await browser.close();
