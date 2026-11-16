import { chromium } from "playwright-core";
import fs from "node:fs";
const out = process.argv[2];
const base = `${process.env.HOME}/Library/Caches/ms-playwright/chromium-1248/chrome-mac-arm64`;
const exe = fs.readdirSync(base).find(f => f.endsWith(".app"));
const browser = await chromium.launch({ executablePath: `${base}/${exe}/Contents/MacOS/${exe.replace(".app","")}`, args: ["--use-angle=swiftshader","--enable-unsafe-swiftshader"] });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
const logs = [];
page.on("console", m => { if (m.type() === "error" && !m.text().includes("Failed to load resource")) logs.push(m.text()); });
page.on("pageerror", e => logs.push("pageerror " + e.message + " " + (e.stack || "").split("\n")[1]));
const S = (fn, a) => page.evaluate(fn, a);
const waitFor = (fn, a, ms = 120000) => page.waitForFunction(fn, a, { timeout: ms }).catch(() => "timeout");
const fast = () => S(() => { const s = window.strings; if (!s.renderer.__r) s.renderer.__r = s.renderer.render; s.renderer.render = () => {}; });
const draw = () => S(() => { const s = window.strings; if (s.renderer.__r) s.renderer.render = s.renderer.__r; });
await page.addInitScript(() => localStorage.clear());
await page.goto("http://localhost:8095/?autostart");
await waitFor(() => window.strings?.show, null, 60000);
await page.waitForTimeout(1500);
await S(() => { const s = window.strings; s.storyMap.state.unlocked = 7; s.changeScene(s.storyMap.places.find(p => p.id === "courtyard")); });
await waitFor(() => window.strings.book.open, null, 30000);
await S(() => window.strings.book.finish());
await waitFor(() => window.strings.show.state === "intro" || window.strings.show.state === "act");
// 1) talk bubbles
await page.click("#talk");
await page.waitForTimeout(400);
console.log("phrases open", await S(() => document.getElementById("phrases").classList.contains("on")));
await page.click('#phrases button[data-i="0"]');
await page.waitForTimeout(3000);
console.log("caption", await S(() => document.getElementById("caption").textContent), "notes", JSON.stringify(await S(() => window.strings.mind.notes)));
await draw(); await page.waitForTimeout(600); await page.screenshot({ path: `${out}/p1-talk.png` }); await fast();
// 2) memory flash: a bow and a fall
await S(() => { const s = window.strings; s.detector.cool.bow = 0; s.detector.emit("bow", {}, 0); s.detector.cool.fall = 0; s.detector.emit("fall", {}, 0); });
await page.waitForTimeout(500);
await draw(); await page.waitForTimeout(500); await page.screenshot({ path: `${out}/p2-remember.png` }); await fast();
console.log("notes", JSON.stringify(await S(() => window.strings.mind.notes)), "flash", await S(() => window.strings.robot.memFlash?.toFixed(2)));
await S(() => { const s = window.strings; s.sim.sticky = true; s.sim._hasMouse = false; });
await waitFor(() => window.strings.show.state === "act", null, 60000);
// 3) the playbill and backstage notes: skip to the end of the show
for (let i = 0; i < 8 && (await S(() => window.strings.show.state)) !== "finale"; i++) { await S(() => window.strings.show.skip()); await page.waitForTimeout(2500); }
await waitFor(() => window.strings.show.mindCard?.visible, null, 90000);
console.log("mind card", await S(() => ({ card: window.strings.show.mindCard.visible, desk: document.getElementById("mindcard").classList.contains("on"), state: window.strings.show.state })));
await draw(); await page.waitForTimeout(800); await page.screenshot({ path: `${out}/p3-card.png` }); await fast();
// 4) the real desk: walk Sir Pip off the front of the stage
await S(() => { const s = window.strings; s.setRealDesk(true); s.sim.sticky = true; s.sim._hasMouse = false; s.sim.depth.main = 0.16; });
for (let i = 0; i < 14; i++) { await S(() => { const s = window.strings; const p = s.pip.get("pelvis"); s.movePipTo(p.x, Math.min(0.34, p.z + 0.025)); }); await page.waitForTimeout(150); }
for (let i = 0; i < 10; i++) { await S(() => { window.strings.sim.mainPos.y -= 0.008; }); await page.waitForTimeout(100); }
await page.waitForTimeout(1200);
console.log("on desk", await S(() => { const p = window.strings.pip; return { z: p.get("pelvis").z.toFixed(3), feet: Math.min(p.get("lF").y, p.get("rF").y).toFixed(3) }; }));
await draw(); await page.waitForTimeout(800); await page.screenshot({ path: `${out}/p4-desk.png` });
console.log(logs.slice(0, 10).join("\n") || "no errors");
await browser.close();
