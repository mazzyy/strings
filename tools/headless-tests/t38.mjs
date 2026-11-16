import { chromium } from "playwright-core";
import fs from "node:fs";
const out = process.argv[2];
const base = `${process.env.HOME}/Library/Caches/ms-playwright/chromium-1248/chrome-mac-arm64`;
const exe = fs.readdirSync(base).find(f => f.endsWith(".app"));
const browser = await chromium.launch({ executablePath: `${base}/${exe}/Contents/MacOS/${exe.replace(".app","")}`, args: ["--use-angle=swiftshader","--enable-unsafe-swiftshader"] });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
const logs = [];
page.on("pageerror", e => logs.push("pageerror " + e.message + " " + (e.stack || "").split("\n")[1]));
const S = (fn, a) => page.evaluate(fn, a);
const waitFor = (fn, a, ms = 120000) => page.waitForFunction(fn, a, { timeout: ms }).catch(() => "timeout");
await page.addInitScript(() => localStorage.clear());
await page.goto("http://localhost:8095/?autostart");
await waitFor(() => window.strings?.show, null, 60000);
await page.waitForTimeout(1500);
await S(() => { const s = window.strings; s.startFreePlay(); if (!s.renderer.__r) s.renderer.__r = s.renderer.render; s.renderer.render = () => {}; });
await page.waitForTimeout(3000);
console.log("state", await S(() => ({ act: window.strings.show.act, task: !!window.strings.currentTask, busy: window.strings.mind.taskBusy, lock: window.strings.intro.on || window.strings.book.open, vis: window.strings.marlo.group.visible, susp: !!window.strings.ai.suspended })));
await S(() => { const s = window.strings; s.__snd = []; const o = s.sfx.play.bind(s.sfx); s.sfx.play = (n, a, opt) => { s.__snd.push(n + (opt?.dur ? "~" + opt.dur : "")); return o(n, a, opt); }; s.__clips = []; const r = s.ai.react.bind(s.ai); s.ai.react = (n, o) => { s.__clips.push(n); return r(n, o); }; });
for (let k = 0; k < 5; k++) {
  const ok = await S(() => { const s = window.strings; s.__snd.length = 0; s.__clips.length = 0; return s.saveTheScene("fall"); });
  await page.waitForTimeout(2600);
  console.log(ok ? `  rescue: clips [${await S(() => window.strings.__clips.join(","))}] caption "${await S(() => document.getElementById("caption").textContent.slice(0, 50))}" sounds [${await S(() => window.strings.__snd.join(","))}]` : "  (skipped this time: 35% chance)");
  if (ok) await page.waitForTimeout(12500);
}
console.log(logs.join("\n") || "no errors");
await browser.close();
