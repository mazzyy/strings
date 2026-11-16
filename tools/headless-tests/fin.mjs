import { chromium } from "playwright-core";
import fs from "node:fs";
const out = process.argv[2];
const base = `${process.env.HOME}/Library/Caches/ms-playwright/chromium-1248/chrome-mac-arm64`;
const exe = fs.readdirSync(base).find(f => f.endsWith(".app"));
const browser = await chromium.launch({ executablePath: `${base}/${exe}/Contents/MacOS/${exe.replace(".app","")}`, args: ["--use-angle=swiftshader","--enable-unsafe-swiftshader","--autoplay-policy=no-user-gesture-required"] });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
const logs = [];
page.on("pageerror", e => logs.push("pageerror " + e.message));
page.on("console", m => { if (m.type() === "error") logs.push(m.text()); });
await page.goto("http://localhost:8090/?autostart");
await page.waitForTimeout(3500);
await page.evaluate(() => { document.getElementById("help").classList.add("collapsed"); const s = window.strings; s.sim.mainPos.copy(s.pip.main.worldPoint([0, 0.04, -0.03], s.pip.main.position.clone())); s.sim.sticky = true; });
await page.waitForTimeout(3000);
// complete all three acts quickly
for (let i = 0; i < 3; i++) {
  await page.evaluate(() => { const sh = window.strings.show; if (sh.state !== "act") { sh.wait = 0.001; sh.update(0.01, false); } sh.skip(); sh.wait = 0.001; sh.update(0.01, false); });
  await page.waitForTimeout(300);
}
console.log(await page.evaluate(() => { const s = window.strings; return `${s.show.state} stars=${s.show.stars} bills=${localStorage.getItem("strings.playbills")}`; }));
await page.waitForTimeout(6000);
await page.screenshot({ path: `${out}/h-finale.png` });
console.log(logs.join("\n"));
await browser.close();
