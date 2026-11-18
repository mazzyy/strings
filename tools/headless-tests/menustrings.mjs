// The start menu's strings really reach what they hold: each title letter's string ends in its
// ink, and Sir Pip and Marlo hang from their hands and the tops of their heads. Close-ups at 2x.
//   node menustrings.mjs <out-dir> [port]
import { chromium } from "playwright-core";
import fs from "node:fs";
const out = process.argv[2] || "/tmp/menustrings";
const port = process.argv[3] || 8095;
fs.mkdirSync(out, { recursive: true });
const base = `${process.env.HOME}/Library/Caches/ms-playwright/chromium-1248/chrome-mac-arm64`;
const exe = fs.readdirSync(base).find((f) => f.endsWith(".app"));
const browser = await chromium.launch({ executablePath: `${base}/${exe}/Contents/MacOS/${exe.replace(".app", "")}`, args: ["--use-angle=metal", "--enable-gpu", "--ignore-gpu-blocklist"] });
const errors = [];
for (const [w, h] of [[1440, 900], [1000, 700]]) {
  const page = await browser.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: 2 });
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto(`http://localhost:${port}/?quality=low`);
  await page.waitForFunction(() => document.querySelectorAll(".ml[data-tied]").length === 7, null, { timeout: 90000 }).catch(() => {});
  await page.waitForTimeout(4500); // (the entrance: letters drop, puppets lower)
  // pause the swaying so the close-ups are crisp
  await page.addStyleTag({ content: ".ml, .mbar, .mpup { animation: none !important; transform: none !important; }" });
  await page.waitForTimeout(300);
  const info = await page.evaluate(() => ({ tied: [...document.querySelectorAll(".ml")].map((m) => m.dataset.tied || "-"), font: document.fonts.check('138px "Playball"') }));
  console.log(w, h, JSON.stringify(info));
  const box = async (sel) => page.evaluate((sel) => { const r = document.querySelector(sel).getBoundingClientRect(); return { x: r.x, y: r.y, width: r.width, height: r.height }; }, sel);
  const t = await box(".mtitle");
  await page.screenshot({ path: `${out}/title-${w}.png`, clip: { x: t.x, y: t.y, width: t.width, height: t.height + 10 } });
  for (const side of ["l", "r"]) {
    const p = await box(`.mpup.${side}`);
    await page.screenshot({ path: `${out}/pup-${side}-${w}.png`, clip: { x: Math.max(0, p.x - 10), y: Math.max(0, p.y - 120), width: p.width + 20, height: p.height + 130 } });
  }
  await page.close();
}
console.log("errors:", errors.length ? errors : "none");
await browser.close();
