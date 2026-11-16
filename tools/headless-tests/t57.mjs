// A frame rate capped from outside (a 30 Hz display, a battery saver) must not drag the
// picture down to the blurriest tier: one step down that doesn't help is undone, then it stays.
// Also: ?quality=high stays pinned.   node t57.mjs [port]
import { chromium } from "playwright-core";
import fs from "node:fs";
const port = process.argv[2] || 8095;
const base = `${process.env.HOME}/Library/Caches/ms-playwright/chromium-1248/chrome-mac-arm64`;
const exe = fs.readdirSync(base).find((f) => f.endsWith(".app"));
const browser = await chromium.launch({ executablePath: `${base}/${exe}/Contents/MacOS/${exe.replace(".app", "")}`, args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
async function run(query) {
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  const logs = [];
  page.on("console", (m) => { if (m.text().includes("[perf] quality")) logs.push(m.text()); });
  page.on("pageerror", (e) => logs.push("pageerror " + e.message));
  // every frame arrives 33 ms after the last, however little work it does
  await page.addInitScript(() => { window.requestAnimationFrame = (cb) => setTimeout(() => cb(performance.now()), 33); });
  await page.goto(`http://localhost:${port}/${query}`);
  await page.waitForSelector("#begin", { timeout: 90000 });
  await page.evaluate(() => { window.strings.renderer.render = () => {}; }); // (drawing isn't what's slow here)
  await page.click("#begin");
  await page.waitForTimeout(28000);
  const q = await page.evaluate(() => window.strings.quality);
  await page.close();
  return { query, final: q, logs };
}
const a = await run("");
const b = await run("?quality=high");
console.log(JSON.stringify([a, b], null, 1));
const ok = a.final === "high" && a.logs.length === 2 && b.final === "high" && b.logs.length === 0;
console.log(ok ? "PASS" : "FAIL");
await browser.close();
process.exit(ok ? 0 : 1);
