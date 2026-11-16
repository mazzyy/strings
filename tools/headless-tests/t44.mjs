import { chromium } from "playwright-core";
import fs from "node:fs";
const base = `${process.env.HOME}/Library/Caches/ms-playwright/chromium-1248/chrome-mac-arm64`;
const exe = fs.readdirSync(base).find(f => f.endsWith(".app"));
const browser = await chromium.launch({ executablePath: `${base}/${exe}/Contents/MacOS/${exe.replace(".app","")}`, args: ["--use-angle=swiftshader","--enable-unsafe-swiftshader"] });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
const logs = [];
page.on("pageerror", e => logs.push("pageerror " + e.message + " " + (e.stack || "").split("\n")[1]));
const S = (fn, a) => page.evaluate(fn, a);
const waitFor = (fn, a, ms = 120000) => page.waitForFunction(fn, a, { timeout: ms }).catch(() => "timeout");
await page.addInitScript(() => localStorage.clear());
await page.goto("http://localhost:8095/");
await page.waitForSelector("#begin", { timeout: 90000 });
await page.click("#begin");
await page.waitForTimeout(1000);
await S(() => window.strings.raiseCurtain());
await waitFor(() => window.strings.warmup.on, null, 30000);
// mid warm-up: menu -> free play
await page.keyboard.press("Escape");
await page.waitForTimeout(300);
await page.click("#freeplay");
await page.waitForTimeout(30000); // long enough for the old opening to have resumed, if it could
console.log("after menu during warm-up:", JSON.stringify(await S(() => ({ warmup: window.strings.warmup.on, intro: window.strings.intro.on, book: window.strings.book.open, free: document.body.classList.contains("free-play"), show: window.strings.show.state }))));
console.log(logs.join("\n") || "no errors");
await browser.close();
