import { chromium } from "playwright-core";
import fs from "node:fs";
const out = process.argv[2];
const base = `${process.env.HOME}/Library/Caches/ms-playwright/chromium-1248/chrome-mac-arm64`;
const exe = fs.readdirSync(base).find(f => f.endsWith(".app"));
const browser = await chromium.launch({ executablePath: `${base}/${exe}/Contents/MacOS/${exe.replace(".app","")}`, args: ["--use-angle=swiftshader","--enable-unsafe-swiftshader"] });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
const logs = [];
page.on("console", m => { if (m.type() === "error" && !m.text().includes("Failed to load resource")) logs.push(m.text()); if (m.text().includes("[perf] quality")) logs.push(m.text()); });
page.on("pageerror", e => logs.push("pageerror " + e.message));
await page.addInitScript(() => localStorage.clear());
await page.goto("http://localhost:8095/");
await page.waitForSelector("#begin", { timeout: 90000 });
await page.click("#begin");
await page.waitForFunction(() => window.strings?.book.open, null, { timeout: 120000 });
const seen = [];
for (let i = 0; i < 9; i++) {
  await page.waitForTimeout(700);
  seen.push(await page.evaluate(() => `${window.strings.book.chapter.id}:${window.strings.book.page}`));
  if (i === 2) await page.screenshot({ path: `${out}/p-prologue3.png` });
  if (i === 4) await page.screenshot({ path: `${out}/p-prologue5.png` });
  await page.click("#storybook canvas");
  await page.waitForFunction(() => !window.strings.book.flip, null, { timeout: 30000 }).catch(() => {});
}
await page.waitForTimeout(900);
console.log("pages", seen.join(" "), "| preshow:", await page.evaluate(() => window.strings.preshow));
// the map: every place on screen, and the far one clickable
await page.evaluate(() => { const s = window.strings; s.raiseCurtain(); s.storyMap.state.unlocked = 6; s.storyMap.state.done.courtyard = { stars: 3 }; s.openMap(); });
await page.waitForTimeout(1200);
await page.screenshot({ path: `${out}/p-map.png` });
const inside = await page.evaluate(() => { const m = window.strings.storyMap; const r = m.canvas.getBoundingClientRect(); return m.places.map(p => { const x = r.left + p.map[0] * 0.75 / 1200 * r.width, y = r.top + p.map[1] * 0.75 / 750 * r.height; return [p.id, x > r.left && x < r.right && y > r.top && y < r.bottom]; }); });
console.log("on screen", JSON.stringify(inside));
const cp = await page.evaluate(() => { const m = window.strings.storyMap; const p = m.places.find(x => x.id === "cave"); const r = m.canvas.getBoundingClientRect(); return { x: r.left + p.map[0] * 0.75 / 1200 * r.width, y: r.top + p.map[1] * 0.75 / 750 * r.height }; });
await page.mouse.click(cp.x, cp.y);
await page.waitForTimeout(300);
console.log("after click", await page.evaluate(() => ({ travel: window.strings.storyMap.travel?.p.id, open: window.strings.storyMap.open, at: window.strings.storyMap.state.at })));
await page.waitForTimeout(1000);
await page.screenshot({ path: `${out}/p-travel.png` });
await page.waitForFunction(() => window.strings.chapter.id !== "courtyard", null, { timeout: 60000 }).catch(() => {});
await page.waitForFunction(() => window.strings.book.open && window.strings.book.chapter.id !== "courtyard", null, { timeout: 60000 }).catch(() => {});
console.log("travelled to", await page.evaluate(() => ({ chapter: window.strings.chapter.id, book: window.strings.book.chapter?.id, open: window.strings.book.open })));
// quality levels
const q = [];
for (const i of [0, 2, 3, 4]) { await page.evaluate((i) => window.strings.applyQuality(i, "test"), i); await page.waitForTimeout(400); q.push(await page.evaluate(() => `${window.strings.quality}@${window.strings.renderer.getPixelRatio()}`)); }
console.log("quality", q.join(" "));
console.log(logs.slice(0, 10).join("\n") || "no errors");
await browser.close();
