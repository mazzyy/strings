import { chromium } from "playwright-core";
import fs from "node:fs";
const out = process.argv[2];
const base = `${process.env.HOME}/Library/Caches/ms-playwright/chromium-1248/chrome-mac-arm64`;
const exe = fs.readdirSync(base).find(f => f.endsWith(".app"));
const browser = await chromium.launch({ executablePath: `${base}/${exe}/Contents/MacOS/${exe.replace(".app","")}`, args: ["--use-angle=swiftshader","--enable-unsafe-swiftshader"] });
const page = await browser.newPage({ viewport: { width: 1000, height: 1000 } });
const logs = [];
page.on("pageerror", e => logs.push("pageerror " + e.message + " " + (e.stack || "").split("\n")[1]));
const S = (fn, a) => page.evaluate(fn, a);
await page.addInitScript(() => localStorage.clear());
await page.goto("http://localhost:8095/?autostart");
await page.waitForFunction(() => window.strings?.show, null, { timeout: 60000 });
await page.waitForTimeout(3000);
// freeze the head facing forward, hide the HUD, and frame it straight on (like the reference)
await S(() => { const s = window.strings; document.body.classList.remove("devui"); for (const id of ["top", "show", "caption", "hint"]) { const e = document.getElementById(id); if (e) e.style.display = "none"; }
  s.robot.head.quaternion.identity(); const u = s.robot.update.bind(s.robot); s.robot.update = (dt, a, b) => u(dt, a, b, null); });
// views from every direction: [name, yaw, pitch] (pitch > 0 = from above, looking down)
for (const [n, yaw, pitch] of [["v-front", 0, 0], ["v-above", 0, 0.75], ["v-above-left", -0.55, 0.6], ["v-below", 0, -0.55], ["v-side", 1.05, 0.15], ["v-above-right", 0.6, 0.7]]) {
  await S(([yaw, pitch]) => { const s = window.strings, V = s.camera.position.constructor; s.robot.talk = 0; const h = s.robot.head.getWorldPosition(new V()); const q = s.robot.head.getWorldQuaternion(new s.camera.quaternion.constructor()); const sc = s.robot.group.scale.x; const c = h.clone().add(new V(0, 0.078 * sc, 0)); const f = new V(Math.sin(yaw) * Math.cos(pitch), Math.sin(pitch), Math.cos(yaw) * Math.cos(pitch)).applyQuaternion(q); s.camera.position.copy(c).addScaledVector(f, 0.58 * sc); s.camera.lookAt(c); s.camera.fov = 30; s.camera.updateProjectionMatrix(); }, [yaw, pitch]);
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${out}/${n}.png`, clip: { x: 200, y: 200, width: 600, height: 600 } });
}
console.log(logs.join("\n") || "no errors");
await browser.close();
