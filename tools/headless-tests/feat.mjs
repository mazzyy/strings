import { chromium } from "playwright-core";
import fs from "node:fs";
const out = process.argv[2];
const base = `${process.env.HOME}/Library/Caches/ms-playwright/chromium-1248/chrome-mac-arm64`;
const exe = fs.readdirSync(base).find(f => f.endsWith(".app"));
const browser = await chromium.launch({ executablePath: `${base}/${exe}/Contents/MacOS/${exe.replace(".app","")}`, args: ["--use-angle=swiftshader","--enable-unsafe-swiftshader","--autoplay-policy=no-user-gesture-required"] });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
const logs = [];
page.on("console", m => { if (["error","warning"].includes(m.type()) && !/GL Driver|Multiple instances/.test(m.text())) logs.push(`[${m.type()}] ${m.text()}`); });
page.on("pageerror", e => logs.push("pageerror " + e.message));
await page.goto("http://localhost:8090/");
await page.waitForTimeout(5000);
await page.screenshot({ path: `${out}/f-0-open.png` });
await page.click("#begin");
await page.evaluate(() => document.getElementById("help").classList.add("collapsed"));
const st = () => page.evaluate(() => { const s = window.strings; return JSON.stringify({ show: s.show.state, scene: s.show.scene?.id, act: s.show.act, stars: s.show.stars, hint: s.hints.current, chip: document.getElementById("hint").textContent, curtain: +s.curtains.k.toFixed(2), say: document.getElementById("caption").textContent.slice(0, 70) }); });
// speed: the headless renderer is slow, so step simulated time by waiting
for (let i = 0; i < 6; i++) { await page.waitForTimeout(4000); console.log("wait", await st()); }
await page.screenshot({ path: `${out}/f-1-grabhint.png` });
// grab (sticky) and wait for act 1
await page.evaluate(() => { const s = window.strings; s.sim.mainPos.copy(s.pip.main.worldPoint([0, 0.04, -0.03], s.pip.main.position.clone())); s.sim.sticky = true; });
for (let i = 0; i < 5; i++) { await page.waitForTimeout(4000); console.log("held", await st()); }
await page.screenshot({ path: `${out}/f-2-act.png` });
// click the flower (desktop prop) via raycast in page
console.log("prop click", await page.evaluate(() => { const s = window.strings; const r = new (s.camera.constructor.__proto__.constructor === Object ? Object : Object)(); return s.props.heldBy("pip"); }));
console.log(logs.slice(0, 15).join("\n"));
await browser.close();
