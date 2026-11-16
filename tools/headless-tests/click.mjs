import { chromium } from "playwright-core";
import fs from "node:fs";
const base = `${process.env.HOME}/Library/Caches/ms-playwright/chromium-1248/chrome-mac-arm64`;
const exe = fs.readdirSync(base).find(f => f.endsWith(".app"));
const browser = await chromium.launch({ executablePath: `${base}/${exe}/Contents/MacOS/${exe.replace(".app","")}`, args: ["--use-angle=swiftshader","--enable-unsafe-swiftshader"] });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
await page.addInitScript(() => localStorage.clear());
await page.goto(process.argv[2] || "http://localhost:8095/?autostart");
await page.waitForFunction(() => window.strings?.show, null, { timeout: 90000 });
await page.waitForTimeout(4000);
for (const name of ["flower", "sword", "lantern"]) {
  const pt = await page.evaluate((n) => { const s = window.strings; const v = s.stageRoot.localToWorld(s.props.position(n)).project(s.camera); return { x: (v.x + 1) / 2 * innerWidth, y: (1 - v.y) / 2 * innerHeight }; }, name);
  await page.mouse.click(pt.x, pt.y);
  await page.waitForTimeout(800);
  const r = await page.evaluate((n) => { const s = window.strings; const ray = new s.camera.constructor(); return { held: s.props.heldBy("pip"), state: s.props.get(n).state }; }, name);
  console.log(name, JSON.stringify(pt), JSON.stringify(r));
  // what does the ray hit at that pixel?
  console.log("  hits", await page.evaluate(({ x, y }) => { const s = window.strings; const T = s.camera.constructor; const rc = new (Object.getPrototypeOf(s.camera.position).constructor.prototype.constructor)(); return null; }, pt));
}
await browser.close();
