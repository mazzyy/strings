// The story map, drawn at full size (with some progress, and with everything open)
//   node maplook.mjs <out-dir> [port]
import { chromium } from "playwright-core";
import fs from "node:fs";
const out = process.argv[2] || "/tmp/map";
const port = process.argv[3] || 8095;
fs.mkdirSync(out, { recursive: true });
const base = `${process.env.HOME}/Library/Caches/ms-playwright/chromium-1248/chrome-mac-arm64`;
const exe = fs.readdirSync(base).find((f) => f.endsWith(".app"));
const browser = await chromium.launch({ executablePath: `${base}/${exe}/Contents/MacOS/${exe.replace(".app", "")}`, args: ["--use-angle=metal", "--enable-gpu", "--ignore-gpu-blocklist"] });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
await page.addInitScript(() => localStorage.clear());
await page.goto(`http://localhost:${port}/?autostart&quality=low`);
await page.waitForFunction(() => window.strings?.show.state === "intro", null, { timeout: 90000 });
const grab = async (name, setup) => {
  const url = await page.evaluate((setup) => {
    const m = window.strings.storyMap;
    Object.assign(m.state, JSON.parse(setup));
    const at = m.current(); m.token.x = at.map[0]; m.token.y = at.map[1];
    m.t = 0.3; m.draw();
    return m.canvas.toDataURL("image/png");
  }, JSON.stringify(setup));
  fs.writeFileSync(`${out}/${name}.png`, Buffer.from(url.split(",")[1], "base64"));
};
await grab("1-progress", { unlocked: 5, all: false, at: "workshop", done: { courtyard: { stars: 5 }, forest: { stars: 4 }, workshop: { stars: 3 } } });
await grab("2-all", { unlocked: 9, all: true, at: "courtyard", done: {} });
console.log("errors:", errors.length ? errors : "none");
await browser.close();
