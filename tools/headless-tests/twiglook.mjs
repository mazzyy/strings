// A look at Twig and the workshop: the whole set, then Twig close up from several angles,
// before and after a fib (his nose grows and sprouts leaves).
//   node twiglook.mjs <out-dir> [port] [quality]
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
page.on("pageerror", (e) => errors.push(e.message));
page.on("console", (m) => { if (m.type() === "error" && !m.text().includes("404")) errors.push(m.text()); });
await page.goto(`http://localhost:${port}/?quality=${quality}`);
await page.waitForSelector("#begin", { timeout: 90000 });
await page.evaluate(() => { document.getElementById("loading").classList.add("done"); window.strings.raiseCurtain(); });
await page.waitForTimeout(2500);
await page.evaluate(() => {
  const s = window.strings;
  s.applySet("workshop");
  s.setGuest("twig");
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
await shot("1-stage", [0, 0.24, 0.62], [0, 0.12, -0.05], 1500);
const tw = await page.evaluate(() => window.strings.marlo.get("head").toArray());
const hx = tw[0], hy = tw[1], hz = tw[2];
await shot("2-front", [hx - 0.02, hy + 0.0, hz + 0.16], [hx, hy - 0.05, hz]);
await shot("3-threequarter", [hx + 0.12, hy + 0.02, hz + 0.12], [hx, hy - 0.04, hz]);
await shot("4-face", [hx - 0.02, hy + 0.005, hz + 0.075], [hx, hy - 0.002, hz]);
await page.evaluate(() => { const x = window.strings.marlo.skin.extra; x.fib(); x.fib(); x.fib(); });
await page.waitForTimeout(2200);
await shot("5-fib-side", [hx + 0.13, hy + 0.01, hz + 0.03], [hx, hy - 0.01, hz]);
await shot("6-fib-front", [hx - 0.05, hy + 0.01, hz + 0.13], [hx, hy - 0.02, hz]);
await shot("7-back", [hx - 0.06, hy + 0.03, hz - 0.15], [hx, hy - 0.04, hz]);
await shot("8-bench", [-0.2, 0.14, 0.12], [-0.31, 0.07, -0.13]);
await shot("9-clock", [0.26, 0.17, 0.08], [0.36, 0.13, -0.15]);
console.log("nose", await page.evaluate(() => window.strings.marlo.skin.extra.nose()));
console.log("errors:", errors.length ? errors.slice(0, 8) : "none");
await browser.close();
