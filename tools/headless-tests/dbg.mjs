import { chromium } from "playwright-core";
import fs from "node:fs";
const base = `${process.env.HOME}/Library/Caches/ms-playwright/chromium-1248/chrome-mac-arm64`;
const exe = fs.readdirSync(base).find(f => f.endsWith(".app"));
const browser = await chromium.launch({ executablePath: `${base}/${exe}/Contents/MacOS/${exe.replace(".app","")}`, args: ["--use-angle=swiftshader","--enable-unsafe-swiftshader","--autoplay-policy=no-user-gesture-required"] });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
page.on("pageerror", e => console.log("pageerror " + e.message));
await page.goto("http://localhost:8090/?autostart");
await page.waitForTimeout(4000);
await page.evaluate(() => { const s = window.strings; s.sim.mainPos.copy(s.pip.main.worldPoint([0, 0.04, -0.03], s.pip.main.position.clone())); s.sim.sticky = true; });
for (let i = 0; i < 8; i++) {
  await page.waitForTimeout(3000);
  console.log(await page.evaluate(() => { const s = window.strings, n = s.narrator; return JSON.stringify({ held: s.pip.main.held, simPinch: s.sim.main.pinch, show: s.show.state, act: s.show.act, nt: +n.t.toFixed(1), until: +n.speakingUntil.toFixed(1), q: n.queue, hint: s.hints.current }); }));
}
await browser.close();
