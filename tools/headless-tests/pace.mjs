import { chromium } from "playwright-core";
import fs from "node:fs";
const base = `${process.env.HOME}/Library/Caches/ms-playwright/chromium-1248/chrome-mac-arm64`;
const exe = fs.readdirSync(base).find(f => f.endsWith(".app"));
const browser = await chromium.launch({ executablePath: `${base}/${exe}/Contents/MacOS/${exe.replace(".app","")}`, args: ["--use-angle=swiftshader","--enable-unsafe-swiftshader","--autoplay-policy=no-user-gesture-required"] });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
page.on("pageerror", e => console.log("pageerror", e.message));
await page.goto("http://localhost:8095/");
await page.waitForTimeout(3000);
await page.keyboard.press("t");
for (let i = 0; i < 11; i++) {
  await page.waitForTimeout(2000);
  console.log(await page.evaluate(() => { const n = window.strings.narrator; return JSON.stringify({ t: n.t.toFixed(1), until: n.speakingUntil.toFixed(1), last: n.lastLine.toFixed(1), pending: n.pending.length, busy: n.busy, q: n.queue.length, story: n.story.length, ctx: window.strings.camera.children[0]?.context?.state }); }));
}
await browser.close();
