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
const fast = () => S(() => { const s = window.strings; if (!s.renderer.__r) s.renderer.__r = s.renderer.render; s.renderer.render = () => {}; });
const draw = () => S(() => { const s = window.strings; if (s.renderer.__r) s.renderer.render = s.renderer.__r; });
const shot = async (n) => { await draw(); await page.waitForTimeout(700); await page.screenshot({ path: `${out}/${n}.png` }); await fast(); };
await page.addInitScript(() => localStorage.clear());
await page.goto("http://localhost:8095/");
await page.waitForSelector("#freeplay", { timeout: 90000 });
await page.click("#freeplay");
await page.waitForTimeout(2000);
console.log("free play", await S(() => ({ panel: document.getElementById("playground").classList.contains("on"), show: window.strings.show.state })));
await shot("fp0");
await S(() => { window.strings.sim.sticky = true; window.strings.sim._hasMouse = false; });
const click = (s, id) => page.click(`#playground button[data-s="${s}"][data-id="${id}"]`);
for (const id of ["dragon", "wizard", "pirate", "troll", "clank", "princess", "king", "knight"]) {
  await click("you", id);
  await page.waitForTimeout(400);
  // move the new puppet about
  for (let i = 0; i < 12; i++) { await S((i) => { const s = window.strings; s.sim.mainPos.x = -0.16 + Math.sin(i / 2) * 0.1; if (i === 6) s.sim.jump = 1; }, i); await page.waitForTimeout(60); }
  const st = await S(() => { const s = window.strings; return { you: s.playerId, held: s.pip.main.held, grabs: s.grabs.size, y: s.pip.get("head").y.toFixed(3), x: s.pip.get("pelvis").x.toFixed(3) }; });
  console.log("you:", JSON.stringify(st));
  if (id === "troll") await shot("fp1-troll");
  if (id === "princess") await shot("fp2-princess");
}
for (const id of ["wizard", "pirate", "troll", "clank", "solo", "marlo"]) { await click("costar", id); await page.waitForTimeout(700); console.log("costar", id, await S(() => ({ g: window.strings.guestId, vis: window.strings.marlo.group.visible }))); }
for (const id of ["forest", "ship", "bridge", "tower", "cave", "sky", "courtyard"]) { await click("stage", id); await page.waitForTimeout(1200); }
await click("stage", "ship"); await page.waitForTimeout(1500);
for (const id of ["fireworks", "applause", "flowers", "night", "music", "moon", "party", "fragile", "normal", "free", "talk"]) { await click("toys", id); await page.waitForTimeout(700); }
await page.waitForTimeout(1500);
await shot("fp3-ship-toys");
await click("toys", "night");
await click("you", "dragon"); await page.waitForTimeout(500);
await click("toys", "fly"); await page.waitForTimeout(500);
console.log("fly with dragon player ->", await S(() => window.strings.flying), "(expected false)");
await click("you", "knight"); await page.waitForTimeout(800);
await click("toys", "fly"); await page.waitForTimeout(1500);
console.log("fly with knight ->", await S(() => window.strings.flying));
console.log(logs.slice(0, 10).join("\n") || "no errors");
await browser.close();
