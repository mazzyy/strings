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
const waitFor = (fn, a, ms = 120000) => page.waitForFunction(fn, a, { timeout: ms }).catch(() => "timeout");
await page.addInitScript(() => localStorage.clear());
await page.goto("http://localhost:8095/?emulate");
await page.waitForSelector("#begin", { timeout: 60000 });
await S(() => document.getElementById("enter-vr").click());
await page.waitForTimeout(3000);
console.log("xr start", await S(() => ({ preshow: window.strings.preshow, book: window.strings.book.open, cap: document.getElementById("caption").textContent.slice(0, 50) })));
await page.screenshot({ path: `${out}/x1-cord.png` });
await S(() => window.strings.raiseCurtain());
// warmup -> storyteller -> book (headset book with seal)
await waitFor(() => window.strings.book.open, null, 150000);
await page.waitForTimeout(1500);
await page.screenshot({ path: `${out}/x2-book.png` });
// poke the wax seal with the emulated hand: compute the seal's world position and put the fingertip there
const r = await S(() => { const s = window.strings, b = s.book.mesh; const p = b.localToWorld(new b.position.constructor((1085 / 1200 - 0.5) * 0.48, (0.5 - 640 / 750) * 0.3, 0)); return s.book.poke(p); });
await page.waitForTimeout(800);
console.log("seal poke", r, "book open", await S(() => window.strings.book.open));
// talk bubbles in the headset
await S(() => { const s = window.strings; s.phrases.show(true); });
await page.waitForTimeout(600);
await page.screenshot({ path: `${out}/x3-phrases.png` });
const picked = await S(() => { const s = window.strings, m = s.phrases.chips[2]; return s.phrases.poke(m.localToWorld(new m.position.constructor(0, 0, 0))); });
await page.waitForTimeout(2500);
console.log("bubble poke", picked, await S(() => document.getElementById("caption").textContent));
await page.screenshot({ path: `${out}/x4-caption.png` });
console.log(logs.slice(0, 10).join("\n") || "no errors");
await browser.close();
