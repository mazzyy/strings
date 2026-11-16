import { chromium } from "playwright-core";
import fs from "node:fs";
const base = `${process.env.HOME}/Library/Caches/ms-playwright/chromium-1248/chrome-mac-arm64`;
const exe = fs.readdirSync(base).find(f => f.endsWith(".app"));
const browser = await chromium.launch({ executablePath: `${base}/${exe}/Contents/MacOS/${exe.replace(".app","")}`, args: ["--use-angle=swiftshader","--enable-unsafe-swiftshader"] });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
await page.addInitScript(() => localStorage.clear());
await page.goto("http://localhost:8095/?emulate");
await page.waitForSelector("#begin", { timeout: 60000 });
await page.evaluate(() => document.getElementById("enter-vr").click());
await page.waitForTimeout(3000);
await page.evaluate(() => { const s = window.strings; s.sim.sticky = false; s.sim._hasMouse = false; s.sim.mainPos.copy(s.cord.handle()); });
for (let i = 0; i < 4; i++) {
  await page.waitForTimeout(1500);
  console.log(await page.evaluate(() => { const s = window.strings; const hs = s.xrHands.hands.filter(h => h.present); return JSON.stringify({ cord: s.cord.handle().toArray().map(v => +v.toFixed(3)), target: s.sim.mainPos.toArray().map(v => +v.toFixed(3)), hands: hs.map(h => ({ id: h.id, p: h.position.toArray().map(v => +v.toFixed(3)), d: +h.position.distanceTo(s.cord.handle()).toFixed(3), pinch: h.pinch })) }); }));
}
await browser.close();
