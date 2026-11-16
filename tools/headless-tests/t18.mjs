import { chromium } from "playwright-core";
import fs from "node:fs";
const base = `${process.env.HOME}/Library/Caches/ms-playwright/chromium-1248/chrome-mac-arm64`;
const exe = fs.readdirSync(base).find(f => f.endsWith(".app"));
const browser = await chromium.launch({ executablePath: `${base}/${exe}/Contents/MacOS/${exe.replace(".app","")}`, args: ["--use-angle=swiftshader","--enable-unsafe-swiftshader"] });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
await page.goto("http://localhost:8095/?autostart");
await page.waitForFunction(() => window.strings?.unbound, null, { timeout: 90000 });
console.log(await page.evaluate(() => {
  const s = window.strings, u = s.unbound, V = s.pip.main.position.constructor;
  u.c.xr = () => true; // pretend we're in a headset
  let applause = 0; u.applause = () => { applause++; };
  const hand = (id) => ({ id, present: true, pinch: false, palm: new V() });
  const L = hand("a"), R = hand("b");
  // move the palms from `from` apart to `to` apart over `secs`, at 72 Hz, then hold
  const run = (from, to, secs, hold = 0.2) => {
    const dt = 1 / 72, n = Math.max(1, Math.round(secs / dt));
    for (let i = 0; i <= n; i++) { const d = from + (to - from) * (i / n); L.palm.set(-d / 2, 0.4, 0.2); R.palm.set(d / 2, 0.4, 0.2); u._clap(dt, [L, R]); }
    for (let i = 0; i < hold * 72; i++) u._clap(dt, [L, R]);
  };
  const out = {};
  u.claps.length = 0; u.clapCool = 0; u.touching = false; u.prevD = null;
  run(0.3, 0.04, 0.15); out.fastClap = u.claps.length;                          // ~1.7 m/s: a clap
  run(0.04, 0.3, 0.2); run(0.3, 0.04, 0.15); out.secondClapApplause = applause;  // two claps -> applause
  u.claps.length = 0; applause = 0; u.prevD = null; u.touching = false;
  run(0.3, 0.3, 0.5); run(0.3, 0.04, 2.0); out.slowTogether = u.claps.length;    // hands drifting together: no clap
  u.claps.length = 0; u.prevD = null; u.touching = false;
  run(0.3, 0.04, 0.12); run(0.04, 0.05, 0.3); out.noDoubleWhileTouching = u.claps.length; // one clap, not repeated while touching
  return JSON.stringify(out);
}));
await browser.close();
