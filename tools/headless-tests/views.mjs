// Screenshots of the main views: start menu, play view, the robot close up, and the headset (emulated).
//   node views.mjs <outdir> [port] [menu,play,robot,xr]
import { chromium } from "playwright-core";
import fs from "node:fs";
const out = process.argv[2], port = process.argv[3] || 8095, what = (process.argv[4] || "menu,play,robot,xr").split(",");
fs.mkdirSync(out, { recursive: true });
const base = `${process.env.HOME}/Library/Caches/ms-playwright/chromium-1248/chrome-mac-arm64`;
const exe = fs.readdirSync(base).find((f) => f.endsWith(".app"));
const browser = await chromium.launch({ executablePath: `${base}/${exe}/Contents/MacOS/${exe.replace(".app", "")}`, args: ["--use-angle=metal", "--enable-gpu", "--ignore-gpu-blocklist"] });
const open = async (q) => { const page = await browser.newPage({ viewport: { width: 1440, height: 900 } }); page.on("pageerror", (e) => console.log("pageerror", e.message)); await page.addInitScript(() => localStorage.clear()); await page.goto(`http://localhost:${port}/${q}`); await page.waitForSelector("#begin", { timeout: 90000 }); await page.waitForTimeout(1500); return page; };
if (what.includes("menu")) { const p = await open("?quality=high"); await p.screenshot({ path: `${out}/menu.png` }); await p.close(); }
if (what.includes("play") || what.includes("robot")) {
  const p = await open("?quality=high");
  await p.evaluate(() => { document.getElementById("loading").classList.add("done"); window.strings.raiseCurtain(); });
  await p.waitForTimeout(9000);
  if (what.includes("play")) await p.screenshot({ path: `${out}/play.png` });
  if (what.includes("robot")) {
    await p.addStyleTag({ content: ".hud,#show,#hint,#caption,#toast,#tip,#top,#help,#logwrap{display:none!important}" });
    for (const [name, pos, look] of [["front", [0.17, 1.55, 0.75], [0.17, 1.45, -0.6]], ["side", [1.0, 1.5, -0.1], [0.17, 1.4, -0.6]], ["low", [-0.3, 1.0, 0.5], [0.17, 1.45, -0.6]]]) {
      await p.evaluate(([pos, look]) => { const s = window.strings; s.camTween?.stop?.(); s.__cam = () => { s.camera.position.set(...pos); s.camera.lookAt(...look); }; if (!s.__hook) { s.__hook = true; const r = s.renderer.render.bind(s.renderer); s.renderer.render = (sc, cam) => { if (cam === s.camera) s.__cam(); r(sc, cam); }; } }, [pos, look]);
      await p.waitForTimeout(900);
      await p.screenshot({ path: `${out}/robot-${name}.png` });
    }
  }
  await p.close();
}
if (what.includes("xr")) {
  const p = await open("?emulate&quality=high");
  await p.click("#go-vr");
  await p.waitForTimeout(4000);
  await p.evaluate(() => window.strings.raiseCurtain());
  await p.waitForTimeout(7000);
  await p.screenshot({ path: `${out}/xr.png` });
  await p.evaluate(() => { const s = window.strings; s.book.skipAll?.(); s.openGameMenu(); });
  await p.waitForTimeout(2500);
  await p.screenshot({ path: `${out}/xr-menu.png` });
  await p.close();
}
await browser.close();
console.log("done");
