// A look at Noodle the sock puppet, the robot behind the stage and the harbour laundry:
// the whole stage, Noodle close up from the front and side, the robot's face, Noodle talking.
//   node socklook.mjs <out-dir> [port] [quality]
import { chromium } from "playwright-core";
import fs from "node:fs";
const out = process.argv[2] || "/tmp/twig";
const port = process.argv[3] || 8095;
const quality = process.argv[4] || "high";
fs.mkdirSync(out, { recursive: true });
const base = `${process.env.HOME}/Library/Caches/ms-playwright/chromium-1248/chrome-mac-arm64`;
const exe = fs.readdirSync(base).find((f) => f.endsWith(".app"));
const browser = await chromium.launch({ executablePath: `${base}/${exe}/Contents/MacOS/${exe.replace(".app", "")}`, args: ["--use-angle=metal", "--enable-gpu", "--ignore-gpu-blocklist"] });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
const errors = [];
page.on("pageerror", (e) => errors.push(e.message + " @ " + (e.stack || "").split("\n").slice(1, 3).join(" | ")));
page.on("console", (m) => { if (m.type() === "error" && !m.text().includes("404")) errors.push(m.text()); });
await page.goto(`http://localhost:${port}/?quality=${quality}`);
await page.waitForSelector("#begin", { timeout: 90000 });
await page.evaluate(() => { document.getElementById("loading").classList.add("done"); window.strings.raiseCurtain(); });
await page.waitForTimeout(2500);
await page.evaluate(() => {
  const s = window.strings;
  s.applySet(window.__set || "laundry");
  s.setGuest(window.__guest || "noodle");
  s.narrator.hush?.();
  // hold the camera where we put it
  s.__cam = null;
  const cam = s.camera;
  const orig = s.renderer.render.bind(s.renderer);
  s.renderer.render = (sc, c) => { if (s.__cam) { cam.position.copy(s.__cam.p); cam.lookAt(s.__cam.l); } orig(sc, c); };
});
await page.waitForTimeout(2500);
const shot = async (name, p, l, wait = 900) => {
  await page.evaluate(([p, l]) => {
    const s = window.strings, T = (a) => s.stageRoot.localToWorld(new (s.camera.position.constructor)(...a));
    s.__cam = { p: T(p), l: T(l) };
  }, [p, l]);
  await page.waitForTimeout(wait);
  await page.screenshot({ path: `${out}/${name}.png` });
};
await shot("1-stage", [0, 0.24, 0.62], [0, 0.12, -0.05], 2500);
const n = await page.evaluate(() => window.strings.__sockHead?.() || [0.24, 0.1, 0.03]);
await shot("2-noodle", [n[0] - 0.05, n[1] + 0.02, n[2] + 0.14], [n[0], n[1] - 0.01, n[2]]);
await shot("3-noodle-side", [n[0] + 0.13, n[1] + 0.03, n[2] + 0.05], [n[0], n[1] - 0.01, n[2]]);
await shot("4-robotface", [0, 0.12, 0.3], [0, 0.04, -0.12]);
await page.evaluate(() => window.strings.__talkSock?.());
await shot("5-talking", [n[0] - 0.05, n[1] + 0.02, n[2] + 0.14], [n[0], n[1] - 0.01, n[2]], 400);
console.log("errors:", errors.length ? errors.slice(0, 8) : "none");
await browser.close();
