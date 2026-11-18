// The story picker (Make Your Own Story) with the new characters and stages
import { chromium } from "playwright-core";
import fs from "node:fs";
const out = process.argv[2] || "/tmp/picker";
fs.mkdirSync(out, { recursive: true });
const base = `${process.env.HOME}/Library/Caches/ms-playwright/chromium-1248/chrome-mac-arm64`;
const exe = fs.readdirSync(base).find((f) => f.endsWith(".app"));
const browser = await chromium.launch({ executablePath: `${base}/${exe}/Contents/MacOS/${exe.replace(".app", "")}`, args: ["--use-angle=metal", "--enable-gpu", "--ignore-gpu-blocklist"] });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
await page.goto("http://localhost:8095/?autostart&quality=low");
await page.waitForFunction(() => window.strings?.show.state === "intro", null, { timeout: 90000 });
await page.evaluate(() => window.strings.openStoryMaker());
await page.waitForTimeout(1500);
await page.screenshot({ path: `${out}/1-picker.png` });
for (const [sec, id] of [["villain", "noodle"], ["place", "laundry"]]) { await page.evaluate(([s, i]) => document.querySelector(`[data-s="${s}"][data-id="${i}"]`)?.click(), [sec, id]); await page.waitForTimeout(500); }
await page.screenshot({ path: `${out}/2-picked.png` });
const html = await page.evaluate(() => [...document.querySelectorAll("[data-s]")].map((b) => b.dataset.s + ":" + b.dataset.id).join(" "));
console.log(html.includes("villain:twig"), html.includes("villain:noodle"), html.includes("place:workshop"), html.includes("place:laundry"));
console.log("errors:", errors.length ? errors : "none");
await browser.close();
