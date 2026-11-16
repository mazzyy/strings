import { chromium } from "playwright-core";
import fs from "node:fs";
const out = process.argv[2];
const base = `${process.env.HOME}/Library/Caches/ms-playwright/chromium-1248/chrome-mac-arm64`;
const exe = fs.readdirSync(base).find(f => f.endsWith(".app"));
const browser = await chromium.launch({ executablePath: `${base}/${exe}/Contents/MacOS/${exe.replace(".app","")}`, args: ["--use-angle=swiftshader","--enable-unsafe-swiftshader"] });
const page = await browser.newPage({ viewport: { width: 1200, height: 900 } });
const logs = [];
page.on("pageerror", e => logs.push("pageerror " + e.message + " " + (e.stack || "").split("\n")[1]));
const S = (fn, a) => page.evaluate(fn, a);
await page.addInitScript(() => localStorage.clear());
await page.goto("http://localhost:8095/");
await page.waitForSelector("#freeplay", { timeout: 90000 });
await page.click("#freeplay");
await page.waitForTimeout(1200);
await S(() => { const s = window.strings; s.sim.sticky = true; s.sim._hasMouse = false; document.getElementById("playground").classList.remove("on"); });
await page.waitForTimeout(800);
await S(() => window.strings.setFlight(true));
await page.waitForTimeout(2500);
// fly to the right a little, then hold
for (let i = 0; i < 10; i++) { await S(() => { window.strings.sim.mainPos.x += 0.01; window.strings.sim.mainPos.y = 0.6; }); await page.waitForTimeout(100); }
await page.waitForTimeout(1500);
const shoot = async (n, yaw, pitch, dist = 0.55) => {
  await S(([yaw, pitch, dist]) => { const s = window.strings, V = s.camera.position.constructor; const c = s.stageRoot.localToWorld(s.pip.get("pelvis").clone()); s.camera.position.set(c.x + Math.sin(yaw) * Math.cos(pitch) * dist, c.y + Math.sin(pitch) * dist, c.z + Math.cos(yaw) * Math.cos(pitch) * dist); s.camera.lookAt(c); s.camera.fov = 35; s.camera.updateProjectionMatrix(); }, [yaw, pitch, dist]);
  await page.waitForTimeout(400);
  await page.screenshot({ path: `${out}/${n}.png`, clip: { x: 300, y: 150, width: 600, height: 600 } });
};
await shoot("ride-front", 0, 0.15); await shoot("ride-side", 1.2, 0.2); await shoot("ride-above", 0.4, 0.8); await shoot("ride-back", 2.6, 0.25);
console.log("seat:", await S(() => !!window.strings.pip.seat), "flying:", await S(() => window.strings.flying));
await S(() => window.strings.setFlight(false));
await page.waitForTimeout(1500);
console.log("after landing seat:", await S(() => !!window.strings.pip.seat), "pip feet y:", await S(() => Math.min(window.strings.pip.get("lF").y, window.strings.pip.get("rF").y).toFixed(3)));
console.log(logs.join("\n") || "no errors");
await browser.close();
