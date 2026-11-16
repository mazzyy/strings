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
const shot = async (name) => { await draw(); await page.waitForTimeout(700); await page.screenshot({ path: `${out}/${name}.png` }); await fast(); };
const act = () => S(() => window.strings.show.act);
await page.addInitScript(() => localStorage.clear());
await page.goto("http://localhost:8095/?autostart");
await waitFor(() => window.strings?.show.state === "intro");
await S(() => { const s = window.strings; s.storyMap.state.unlocked = 7; s.changeScene(s.storyMap.places.find(p => p.id === "sky")); });
await waitFor(() => window.strings.book.open, null, 30000);
await shot("f0-book");
await S(() => window.strings.book.finish());
await waitFor(() => window.strings.chapter.id === "sky" && window.strings.show.state === "intro");
await fast();
await S(() => { const s = window.strings; s.sim.sticky = true; s.sim._hasMouse = false; });
await waitFor(() => window.strings.show.state === "act");
// 1) mount: walk to Marlo
for (let i = 0; i < 60 && !(await S(() => window.strings.flying)); i++) { await S(() => { const s = window.strings; const dx = s.marlo.get("pelvis").x - s.pip.get("pelvis").x; s.sim.mainPos.x += Math.max(-0.01, Math.min(0.01, dx)); }); await page.waitForTimeout(100); }
await waitFor(() => window.strings.show.act >= 1 && window.strings.show.state === "act", null, 60000);
console.log("mount -> flying", await S(() => window.strings.flying), "act", await act());
// 2) rings: steer up and down to meet each ring
for (let i = 0; i < 500 && (await act()) < 2; i++) {
  await S(() => { const s = window.strings; const r = s.currentTask?.target?.(); if (!r) return; const dy = r.y - (s.pip.get("pelvis").y + 0.03); s.sim.mainPos.y += Math.max(-0.01, Math.min(0.01, dy)); });
  if (i === 60) await shot("f1-rings");
  await page.waitForTimeout(60);
}
console.log("rings -> act", await act(), "stars", await S(() => window.strings.show.stars));
// 3) gears: keep bobbing up and down
for (let i = 0; i < 900 && (await act()) < 3; i++) {
  await S((i) => { window.strings.sim.mainPos.y = 0.53 + Math.sin(i / 14) * 0.12; }, i);
  if (i === 80) await shot("f2-gears");
  await page.waitForTimeout(60);
}
console.log("gears -> act", await act());
// 4) chase Clank
for (let i = 0; i < 600 && (await act()) < 4; i++) {
  await S(() => { const s = window.strings; const k = s.extra("clank").pup.get("pelvis"), p = s.pip.get("pelvis"); s.sim.mainPos.x += Math.max(-0.012, Math.min(0.012, k.x - p.x)); s.sim.mainPos.y += Math.max(-0.012, Math.min(0.012, k.y - p.y)); });
  await page.waitForTimeout(60);
}
console.log("chase -> act", await act());
await S(() => { window.strings.sim.mainPos.y = 0.53; });
await page.waitForTimeout(2500);
await shot("f3-sad");
// 5) kindness: bow (tip the wrist forward), held from the moment the act begins
await waitFor(() => window.strings.show.act === 4 && window.strings.show.state === "act" && window.strings.currentTask, null, 90000);
await fast();
await S(() => window.strings.sim.keys.add("w"));
await waitFor(() => window.strings.show.act >= 5, null, 120000);
await S(() => window.strings.sim.keys.delete("w"));
console.log("kindness -> act", await act());
// 6) the knighting
await waitFor(() => window.strings.extra("king").on, null, 60000);
await page.waitForTimeout(3000);
await S(() => window.strings.sim.keys.add("w"));
await waitFor(() => window.strings.show.state === "ending" || window.strings.show.stars >= 6, null, 120000);
await S(() => window.strings.sim.keys.delete("w"));
await shot("f4-knight");
await waitFor(() => window.strings.show.state === "ending", null, 120000);
console.log("finale ->", await S(() => ({ state: window.strings.show.state, stars: window.strings.show.stars, cast: ["wizard", "pirate", "king", "troll", "clank"].map(id => window.strings.extra(id).on).join(","), princess: window.strings.princessDrv.state })));
await page.waitForTimeout(3000);
await shot("f5-finale");
await waitFor(() => window.strings.book.open && window.strings.book.chapter.id === "epilogue", null, 180000);
await shot("f6-epilogue");
await S(() => window.strings.book.finish());
await page.waitForTimeout(1500);
console.log("credits on", await S(() => document.getElementById("credits").classList.contains("on")));
await draw(); await page.waitForTimeout(2600); await page.screenshot({ path: `${out}/f7-credits.png` });
console.log(logs.slice(0, 12).join("\n") || "no errors");
await browser.close();
