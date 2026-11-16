import { chromium } from "playwright-core";
import fs from "node:fs";
const base = `${process.env.HOME}/Library/Caches/ms-playwright/chromium-1248/chrome-mac-arm64`;
const exe = fs.readdirSync(base).find(f => f.endsWith(".app"));
const browser = await chromium.launch({ executablePath: `${base}/${exe}/Contents/MacOS/${exe.replace(".app","")}`, args: ["--use-angle=swiftshader","--enable-unsafe-swiftshader"] });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
await page.goto(process.argv[2]);
await page.waitForSelector("#begin", { timeout: 90000 });
console.log(await page.evaluate(() => {
  const s = window.strings; const out = {};
  for (const [name, g] of [["pip", s.pip.group], ["marlo", s.marlo.group], ["robot", s.robot.group]]) {
    const sizes = []; const parents = new Map();
    g.traverse((o) => { if (!o.isMesh) return; o.geometry.computeBoundingSphere(); const sc = o.getWorldScale(new o.position.constructor()); sizes.push(+(o.geometry.boundingSphere.radius * Math.max(sc.x, sc.y, sc.z)).toFixed(4)); const p = o.parent; parents.set(p, (parents.get(p) || 0) + 1); });
    sizes.sort((a, b) => a - b);
    out[name] = { n: sizes.length, small_lt_6mm: sizes.filter(x => x < 0.006).length, lt_10mm: sizes.filter(x => x < 0.01).length, parentsWithMany: [...parents.values()].filter(v => v > 1).join(",") };
  }
  return JSON.stringify(out);
}));
await browser.close();
