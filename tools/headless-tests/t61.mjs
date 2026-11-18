// Reloading with progress saved at every stop on the road (and the theatre) still reaches the
// start menu: the stage is set up for the saved place during page load, before the rest of
// main.js has run, so nothing it touches may be declared later (a TDZ error leaves the page
// stuck on "The curtain is rising").
//   node t61.mjs [port]
import { chromium } from "playwright-core";
import fs from "node:fs";
const port = process.argv[2] || 8095;
const base = `${process.env.HOME}/Library/Caches/ms-playwright/chromium-1248/chrome-mac-arm64`;
const exe = fs.readdirSync(base).find((f) => f.endsWith(".app"));
const browser = await chromium.launch({ executablePath: `${base}/${exe}/Contents/MacOS/${exe.replace(".app", "")}`, args: ["--use-angle=metal", "--enable-gpu", "--ignore-gpu-blocklist"] });
const ids = ["courtyard", "forest", "workshop", "ship", "laundry", "bridge", "tower", "cave", "sky", "theatre"];
const results = {};
for (const at of ids) {
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.addInitScript((at) => { if (!sessionStorage.getItem("seeded")) { localStorage.clear(); localStorage.setItem("strings.story", JSON.stringify({ unlocked: 9, all: true, done: { courtyard: { stars: 5 } }, at })); sessionStorage.setItem("seeded", "1"); } }, at);
  await page.goto(`http://localhost:${port}/?quality=low`);
  const menu = await page.waitForFunction(() => !!document.querySelector("#begin") && !!window.strings, null, { timeout: 60000 }).then(() => true).catch(() => false);
  const where = menu ? await page.evaluate(() => window.strings.chapter.id) : null;
  results[at] = menu && where === at && !errors.length ? "ok" : `FAIL menu=${menu} at=${where} ${errors[0] || ""}`;
  await page.close();
}
console.log(results);
const ok = Object.values(results).every((r) => r === "ok");
console.log(ok ? "PASS" : "FAIL");
await browser.close();
process.exit(ok ? 0 : 1);
