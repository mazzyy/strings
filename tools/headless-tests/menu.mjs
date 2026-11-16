// The start menu at several sizes: desktop, small, with headset buttons, mid-entrance, mid-game.
//   node menu.mjs <outdir> [port]
import { chromium } from "playwright-core";
import fs from "node:fs";
const out = process.argv[2], port = process.argv[3] || 8095;
fs.mkdirSync(out, { recursive: true });
const base = `${process.env.HOME}/Library/Caches/ms-playwright/chromium-1248/chrome-mac-arm64`;
const exe = fs.readdirSync(base).find((f) => f.endsWith(".app"));
const browser = await chromium.launch({ executablePath: `${base}/${exe}/Contents/MacOS/${exe.replace(".app", "")}`, args: ["--use-angle=metal", "--enable-gpu", "--ignore-gpu-blocklist"] });
const errors = [];
const shot = async (name, w, h, q, wait = 4200, act) => {
  const page = await browser.newPage({ viewport: { width: w, height: h } });
  page.on("pageerror", (e) => errors.push(`${name}: ${e.message}`));
  await page.addInitScript(() => localStorage.clear());
  await page.goto(`http://localhost:${port}/${q}`);
  await page.waitForSelector("#begin", { timeout: 90000 });
  if (act) await act(page);
  await page.waitForTimeout(wait);
  await page.screenshot({ path: `${out}/${name}.png` });
  const fit = await page.evaluate(() => { const r = document.querySelector(".theatre-wrap").getBoundingClientRect(); const ids = ["begin", "chapters", "mystory", "freeplay", "pinchlock", "onehand"]; const hit = ids.filter((id) => { const el = document.getElementById(id); const b = (el.closest("label") || el).getBoundingClientRect(); const t = document.elementFromPoint(b.x + b.width / 2, b.y + b.height / 2); return t && ((el.closest("label") || el).contains(t)); }); return { top: Math.round(r.top), bottom: Math.round(r.bottom), h: innerHeight, left: Math.round(r.left), right: Math.round(r.right), w: innerWidth, clickable: hit.length + "/" + ids.length }; });
  console.log(name, JSON.stringify(fit));
  await page.close();
};
await shot("desktop", 1440, 900, "");
await shot("entrance", 1440, 900, "", 1150);
await shot("small", 800, 600, "");
await shot("headset", 1024, 640, "?emulate");
await shot("midgame", 1440, 900, "", 2500, async (p) => { await p.click("#begin"); await p.waitForTimeout(1200); await p.evaluate(() => { window.strings.raiseCurtain(); }); await p.waitForTimeout(1500); await p.evaluate(() => window.strings.openGameMenu()); });
console.log("errors:", errors.length ? errors : "none");
await browser.close();
