import { chromium } from "playwright-core";
import fs from "node:fs";
const exe = fs.readdirSync(process.env.HOME + "/Library/Caches/ms-playwright/chromium-1248/chrome-mac-arm64").find(f => f.endsWith(".app"));
const out = process.argv[2];
const browser = await chromium.launch({
  executablePath: `${process.env.HOME}/Library/Caches/ms-playwright/chromium-1248/chrome-mac-arm64/${exe}/Contents/MacOS/${exe.replace(".app","")}`,
  args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"],
});
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
const logs = [];
page.on("console", m => logs.push(`[${m.type()}] ${m.text()}`));
page.on("pageerror", e => logs.push(`[pageerror] ${e.message}`));
await page.goto("http://localhost:8080/");
await page.waitForTimeout(2500);
await page.screenshot({ path: `${out}/0-start.png` });
const st = () => page.evaluate(() => {
  const s = window.strings; if (!s) return null;
  const f = (v) => v.toArray().map(x => +x.toFixed(3));
  return { pipHead: f(s.pip.get("head")), pipPelvis: f(s.pip.get("pelvis")), held: s.pip.main.held, marlo: s.ai.current, marloHead: f(s.marlo.get("head")), log: [...document.querySelectorAll("#log li")].map(l => l.textContent) };
});
console.log("start", JSON.stringify(await st()));
await page.keyboard.press("r");
await page.keyboard.press("t");
for (const t of [2, 4, 5.8, 8, 10.2, 13, 17, 22]) {
  await page.waitForTimeout(t === 2 ? 2000 : (t - prev) * 1000);
  var prev = t;
  await page.screenshot({ path: `${out}/t${t}.png` });
  console.log(t, JSON.stringify(await st()));
}
await page.keyboard.press("r");
const rt = await page.evaluate(async () => {
  const s = window.strings; const perf = s.recorder.frames.length ? { rate: 30, frames: s.recorder.frames } : null;
  if (!perf) return "no perf";
  const code = await s.encodePerformance(perf); const back = await s.decodePerformance(code);
  const err = Math.max(...perf.frames.map((fr, i) => Math.max(...fr.map((v, j) => Math.abs(v - back.frames[i][j])))));
  return { frames: perf.frames.length, codeKB: (code.length / 1024).toFixed(1), maxErr: err };
});
console.log("roundtrip", JSON.stringify(rt));
await page.keyboard.press("p");
await page.waitForTimeout(3000);
await page.screenshot({ path: `${out}/replay.png` });
console.log("LOGS\n" + logs.filter(l => !l.includes("[log]")).slice(0, 30).join("\n"));
await browser.close();
