import { chromium } from "playwright-core";
import fs from "node:fs";
const out = process.argv[2];
const base = `${process.env.HOME}/Library/Caches/ms-playwright/chromium-1248/chrome-mac-arm64`;
const exe = fs.readdirSync(base).find(f => f.endsWith(".app"));
const browser = await chromium.launch({ executablePath: `${base}/${exe}/Contents/MacOS/${exe.replace(".app","")}`, args: ["--use-angle=swiftshader","--enable-unsafe-swiftshader"] });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
const logs = [];
page.on("pageerror", e => logs.push("pageerror " + e.message + " " + (e.stack || "").split("\n")[1]));
page.on("console", m => { if (m.type() === "error" && !m.text().includes("Failed to load resource")) logs.push(m.text()); });
const S = (fn, a) => page.evaluate(fn, a);
await page.addInitScript(() => localStorage.clear());
await page.goto("http://localhost:8095/");
await page.waitForSelector("#begin", { timeout: 90000 });
await page.click("#begin");
await page.waitForTimeout(1500);
await S(() => window.strings.raiseCurtain());
await S(() => { window.strings.sim.sticky = true; window.strings.sim._hasMouse = false; });
// keep jumping and waving Sir Pip about, all the way through, like an eager player
let introSeen = false, maxBar = 0, bookAt = null, reactsDuring = 0;
const t0 = Date.now();
for (let i = 0; i < 900; i++) {
  const st = await S((i) => { const s = window.strings; s.sim.mainPos.x = -0.16 + Math.sin(i / 3) * 0.12; s.sim.mainPos.y = 0.6 + Math.sin(i / 2) * 0.15; if (i % 7 === 0) s.sim.jump = 1;
    return { intro: s.intro.on, book: s.book.open, barY: s.pip.main.position.y, held: s.grabs.size, clip: s.ai.clip?.name || null }; }, i);
  if (st.intro) { introSeen = true; if (i % 10 === 0) { maxBar = Math.max(maxBar, st.barY); if (st.clip && !["idle", "wave", "bow"].includes(st.clip)) reactsDuring++; } }
  if (st.intro && i % 40 === 0) console.log("  intro", JSON.stringify(st));
  if (st.book) { bookAt = (Date.now() - t0) / 1000; break; }
  await page.waitForTimeout(100);
}
console.log("intro seen", introSeen, "book opened after", bookAt, "s; bar height during intro", maxBar.toFixed(3), "stray guest clips", reactsDuring);
await page.screenshot({ path: `${out}/s1-book.png` });
await page.click("#storybook .skip");
await page.waitForTimeout(3000);
console.log("after skip: grabbing again", await S(() => ({ grabs: window.strings.grabs.size, show: window.strings.show.state })));
console.log(logs.slice(0, 8).join("\n") || "no errors");
await browser.close();
