import { chromium } from "playwright-core";
import fs from "node:fs";
const out = process.argv[2];
const base = `${process.env.HOME}/Library/Caches/ms-playwright/chromium-1248/chrome-mac-arm64`;
const exe = fs.readdirSync(base).find(f => f.endsWith(".app"));
const browser = await chromium.launch({ executablePath: `${base}/${exe}/Contents/MacOS/${exe.replace(".app","")}`, args: ["--use-angle=swiftshader","--enable-unsafe-swiftshader"] });
const page = await browser.newPage({ viewport: { width: 1660, height: 950 } });
const logs = [];
page.on("pageerror", e => logs.push("pageerror " + e.message + " " + (e.stack || "").split("\n")[1]));
const S = (fn, a) => page.evaluate(fn, a);
// a returning player at chapter 7 (like the mock-up)
await page.addInitScript(() => { localStorage.clear(); localStorage.setItem("strings.story", JSON.stringify({ unlocked: 7, done: { courtyard: {}, forest: {}, ship: {}, bridge: {}, tower: {}, cave: {} }, at: "sky" })); });
await page.goto("http://localhost:8095/");
await page.waitForSelector("#begin", { timeout: 90000 });
await page.waitForTimeout(3000);
await page.screenshot({ path: `${out}/m1.png` });
console.log("scale:", await S(() => document.querySelector(".theatre-wrap").style.transform), "| begin:", await S(() => document.getElementById("begin").textContent));
console.log(logs.join("\n") || "no errors");
await browser.close();
