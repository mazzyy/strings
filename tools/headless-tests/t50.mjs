import { chromium } from "playwright-core";
import fs from "node:fs";
const out = process.argv[2];
const base = `${process.env.HOME}/Library/Caches/ms-playwright/chromium-1248/chrome-mac-arm64`;
const exe = fs.readdirSync(base).find(f => f.endsWith(".app"));
const browser = await chromium.launch({ executablePath: `${base}/${exe}/Contents/MacOS/${exe.replace(".app","")}`, args: ["--use-angle=swiftshader","--enable-unsafe-swiftshader"] });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const logs = [];
page.on("pageerror", e => logs.push("pageerror " + e.message + " " + (e.stack || "").split("\n")[1]));
const S = (fn, a) => page.evaluate(fn, a);
await page.addInitScript(() => localStorage.clear());
await page.goto("http://localhost:8095/");
await page.waitForSelector("#mystory", { timeout: 90000 });
await page.click("#mystory");
await page.waitForTimeout(600);
await page.click('#storymaker .card[data-s="who"][data-id="king"]');
await page.click('#storymaker .pill[data-id="moon"]');
await page.waitForTimeout(300);
await page.screenshot({ path: `${out}/pick3.png` });
await page.click('#storymaker .icard[data-id="duel"]');
await page.waitForTimeout(300);
await page.screenshot({ path: `${out}/pick4.png` });
// the robot's face, at an angle and straight on
await page.click("#storymaker .x");
await S(() => { document.getElementById("loading").classList.add("done"); });
for (const [n, side] of [["face-front", 0], ["face-left", -0.6], ["face-right", 0.6]]) {
  await S((side) => { const s = window.strings, V = s.camera.position.constructor; const h = s.robot.head.getWorldPosition(new V()); const q = s.robot.head.getWorldQuaternion(new s.camera.quaternion.constructor()); const f = new V(Math.sin(side), 0, Math.cos(side)).applyQuaternion(q); const c = h.clone().add(new V(0, 0.12, 0)); s.camera.position.copy(c).addScaledVector(f, 0.62); s.robot.talk = side === 0 ? 0 : 3; s.camera.lookAt(c); s.robot.update = ((u) => function (...a) { return u.apply(this, a); })(s.robot.update); }, side);
  await page.waitForTimeout(150);
  await page.screenshot({ path: `${out}/${n}.png`, clip: { x: 420, y: 150, width: 600, height: 520 } });
}
console.log(logs.join("\n") || "no errors");
await browser.close();
