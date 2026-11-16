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
const waitFor = (fn, a, ms = 120000) => page.waitForFunction(fn, a, { timeout: ms }).catch(() => "timeout");
const fast = () => S(() => { const s = window.strings; if (!s.renderer.__r) s.renderer.__r = s.renderer.render; s.renderer.render = () => {}; });
const draw = () => S(() => { const s = window.strings; if (s.renderer.__r) s.renderer.render = s.renderer.__r; });
await page.addInitScript(() => localStorage.clear());
await page.goto("http://localhost:8095/");
await page.waitForSelector("#begin", { timeout: 90000 });
console.log("menu options", await S(() => [...document.querySelectorAll("#loading label")].map(l => l.textContent.trim())));
await page.click("#begin");
await page.waitForTimeout(1200);
await S(() => window.strings.raiseCurtain());
await fast();
await waitFor(() => window.strings.warmup.on, null, 30000);
// track the crowd's applause snippets
await S(() => { const s = window.strings; s.__snd = []; const o = s.sfx.play.bind(s.sfx); s.sfx.play = (n, a, opt) => { s.__snd.push(n + (opt?.dur ? "~" + opt.dur : "")); return o(n, a, opt); }; });
const step = () => S(() => window.strings.warmup.step);
console.log("1. step", await step());
await S(() => { window.strings.sim.sticky = true; window.strings.sim._hasMouse = false; });
for (let i = 0; i < 20 && (await step()) === "lift"; i++) { await S((i) => { window.strings.sim.mainPos.y = 0.53 + Math.min(0.08, i * 0.01); }, i); await page.waitForTimeout(120); }
console.log("2. step", await step(), "sounds", JSON.stringify(await S(() => window.strings.__snd)));
await page.waitForTimeout(1500);
await S(() => window.strings.sim.keys.add("w"));
await waitFor(() => window.strings.warmup.step !== "bow", null, 60000);
await S(() => window.strings.sim.keys.delete("w"));
console.log("3. step", await step(), "hint", await S(() => window.strings.hints.current));
for (let i = 0; i < 120 && ["walk"].includes(await step()); i++) { await S(() => { const s = window.strings; const dx = s.marlo.get("chest").x - s.pip.get("pelvis").x; s.sim.mainPos.x += Math.sign(dx) * 0.004; }); await page.waitForTimeout(80); }
console.log("4. step", await step());
await waitFor(() => window.strings.intro.on || window.strings.book.open, null, 120000);
console.log("5. story begins:", await S(() => ({ intro: window.strings.intro.on, book: window.strings.book.open, mindBusy: window.strings.mind.taskBusy })));
await S(() => window.strings.book.open ? window.strings.book.skipAll() : null);
// the scene rescue: in the courtyard, during the bow act
await S(() => { const s = window.strings; s.storyMap.unlockAll(); s.changeScene(s.storyMap.places.find(p => p.id === "courtyard")); });
await waitFor(() => window.strings.book.open, null, 30000);
await S(() => window.strings.book.finish());
await waitFor(() => window.strings.show.state === "act", null, 90000);
await S(() => { window.strings.show.skip(); });
await waitFor(() => window.strings.show.act === 1 && window.strings.show.state === "act" && !window.strings.currentTask, null, 60000);
const bits = [];
for (let k = 0; k < 8; k++) {
  const r = await S(() => { const s = window.strings; s.__snd.length = 0; const ok = s.saveTheScene("fall"); return ok; });
  await page.waitForTimeout(2500);
  bits.push(await S((ok) => ok ? (window.strings.ai.clip?.name || "-") + " | " + document.getElementById("caption").textContent.slice(0, 40) + " | " + window.strings.__snd.join(",") : "skipped", r));
  await S(() => { window.strings.__rc = 0; });
  await page.evaluate(() => { /* reset cooldown */ });
  await page.waitForTimeout(13000);
}
console.log("rescues:\n  " + bits.join("\n  "));
// one-hand mode: roll the wrist (E) and the arms rise
await S(() => window.strings.setOneHand(true, true));
const before = await S(() => { const p = window.strings.pip; return { hb: p.hands.position.y.toFixed(3), held: p.hands.held }; });
await S(() => window.strings.sim.keys.add("e"));
await page.waitForTimeout(1500);
const after = await S(() => { const p = window.strings.pip; return { hb: p.hands.position.y.toFixed(3), held: p.hands.held, wrist: Math.max(p.get("lW").y, p.get("rW").y).toFixed(3), head: p.get("head").y.toFixed(3) }; });
await draw(); await page.waitForTimeout(600); await page.screenshot({ path: `${out}/oh1.png` }); await fast();
await S(() => window.strings.sim.keys.delete("e"));
console.log("one hand: before", JSON.stringify(before), "after rolling", JSON.stringify(after), "wave hint ->", await S(() => { window.strings.hints.show("wave", false); return window.strings.hints.current; }));
console.log(logs.slice(0, 10).join("\n") || "no errors");
await browser.close();
