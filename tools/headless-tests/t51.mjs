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
for (const [n, talk, side] of [["ref-front-idle", 0, 0], ["ref-front-talk", 5, 0], ["ref-three-quarter", 5, 0.5]]) {
  await S(([talk, side]) => { const s = window.strings, V = s.camera.position.constructor; s.robot.talk = talk; const h = s.robot.head.getWorldPosition(new V()); const q = s.robot.head.getWorldQuaternion(new s.camera.quaternion.constructor()); const sc = s.robot.group.scale.x; const c = h.clone().add(new V(0, 0.078 * sc, 0)); const f = new V(Math.sin(side), 0, Math.cos(side)).applyQuaternion(q); s.camera.position.copy(c).addScaledVector(f, 0.58 * sc); s.camera.lookAt(c); s.camera.fov = 30; s.camera.updateProjectionMatrix(); }, [talk, side]);
  await page.waitForTimeout(700);
  await page.screenshot({ path: `${out}/${n}.png`, clip: { x: 150, y: 150, width: 700, height: 700 } });
}
console.log(logs.join("\n") || "no errors");
await browser.close();
