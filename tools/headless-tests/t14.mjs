import { chromium } from "playwright-core";
import fs from "node:fs";
const out = process.argv[2];
const base = `${process.env.HOME}/Library/Caches/ms-playwright/chromium-1248/chrome-mac-arm64`;
const exe = fs.readdirSync(base).find(f => f.endsWith(".app"));
const browser = await chromium.launch({ executablePath: `${base}/${exe}/Contents/MacOS/${exe.replace(".app","")}`, args: ["--use-angle=swiftshader","--enable-unsafe-swiftshader", "--autoplay-policy=no-user-gesture-required"] });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
const played = [];
page.on("pageerror", e => console.log("pageerror", e.message, (e.stack || "").split("\n")[1]));
page.on("request", r => { if (r.url().includes("/voice/")) played.push(r.url().split("/").pop()); });
const S = (fn, a) => page.evaluate(fn, a);
const waitFor = (fn, a, ms = 120000) => page.waitForFunction(fn, a, { timeout: ms }).catch(() => "timeout");
await page.addInitScript(() => localStorage.clear());
await page.goto("http://localhost:8095/?autostart");
await waitFor(() => window.strings?.show.state === "intro");
await S(() => { const s = window.strings; s.storyMap.state.unlocked = 7; s.changeScene(s.storyMap.places.find(p => p.id === "bridge")); });
await waitFor(() => window.strings.book.open, null, 30000);
await S(() => window.strings.book.finish());
await waitFor(() => window.strings.chapter.id === "bridge" && window.strings.show.state === "intro");
await S(() => { const s = window.strings; s.sim.sticky = true; s.sim._hasMouse = false; });
for (let i = 0; i < 12; i++) { console.log("t", i, await S(() => { const s = window.strings; return JSON.stringify({ st: s.show.state, act: s.show.act, held: s.pip.main.held, spk: s.narrator.speaking, q: s.narrator.queue.length, busy: s.narrator.busy, cap: document.getElementById("caption").textContent.slice(0, 40) }); })); await page.waitForTimeout(1500); }
await waitFor(() => window.strings.show.state === "act");
for (let k = 0; k < 20 && (await S(() => window.strings.show.act)) < 1; k++) { await S(() => { if (window.strings.show.state === "act") window.strings.show.skip(); }); await page.waitForTimeout(1500); }
await waitFor(() => window.strings.show.act >= 1 && window.strings.show.state === "act");
console.log("state", await S(() => ({ act: window.strings.show.act, state: window.strings.show.state, task: !!window.strings.currentTask, scene: window.strings.show.scene?.id, actTask: JSON.stringify(window.strings.show.scene?.acts[window.strings.show.act]?.task) })));
const errs = await S(() => window.__errs || []);
const riddleFile = await S(() => { const s = window.strings; const r = ["What gets wetter", "broken before", "keys, but"]; const line = Object.keys(s.narrator.manifest).find(l => l.startsWith("Grumble's riddle") && r.some(k => l.includes(k)) && l.includes(["wetter", "broken", "keys"][Math.floor(Date.now() / 86400000) % 3])); return { line, file: s.narrator.manifest[line] }; });
const caps = [];
for (let i = 0; i < 40; i++) { const c = await S(() => document.getElementById("caption").textContent); if (!caps.includes(c)) caps.push(c); await page.waitForTimeout(500); if (c.startsWith("Grumble: “Grumble's riddle")) break; }
console.log("riddle line spoken:", caps.some(c => c.startsWith("Grumble: “Grumble's riddle")), "| audio fetched:", played.includes(riddleFile.file));
console.log("card", await S(() => ({ on: document.getElementById("riddlecard").classList.contains("on"), q: document.querySelector("#riddlecard .q").textContent })));
await page.screenshot({ path: `${out}/r-riddle.png` });
await browser.close();
