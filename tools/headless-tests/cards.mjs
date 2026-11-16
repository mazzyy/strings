// One sheet with every story card, the poster and three storybook pages (art check).  node cards.mjs <out.png> [port]
import { chromium } from "playwright-core";
import fs from "node:fs";
const base = `${process.env.HOME}/Library/Caches/ms-playwright/chromium-1248/chrome-mac-arm64`;
const exe = fs.readdirSync(base).find((f) => f.endsWith(".app"));
const browser = await chromium.launch({ executablePath: `${base}/${exe}/Contents/MacOS/${exe.replace(".app", "")}`, args: ["--use-angle=metal", "--enable-gpu", "--ignore-gpu-blocklist"] });
const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });
page.on("pageerror", (e) => console.log("pageerror", e.message));
await page.goto(`http://localhost:${process.argv[3] || 8095}/?quality=low`);
await page.waitForSelector("#begin", { timeout: 90000 });
const url = await page.evaluate(async () => {
  const P = await import("/src/storypicker.js");
  const c = document.createElement("canvas"); c.width = 1560; c.height = 1010; const g = c.getContext("2d"); g.fillStyle = "#222"; g.fillRect(0, 0, c.width, c.height);
  let x = 10, y = 10;
  for (const [sec, ids] of [["place", ["courtyard", "forest", "ship", "bridge", "tower", "cave", "sky"]], ["villain", P.PICKS.villain.map((v) => v[0])], ["who", P.PICKS.who.map((v) => v[0])]]) { for (const id of ids) { g.drawImage(P.cardImage(sec, id, 240, 168), x, y, 210, 147); x += 218; if (x > 1340) { x = 10; y += 155; } } x = 10; y += 155; }
  try { g.drawImage(P.drawPreview(P.storyFromPicks(P.surprisePicks())), 10, y, 800, 480); } catch (e) { console.log("poster:", e.message); }
  return c.toDataURL("image/jpeg", 0.88);
});
fs.writeFileSync(process.argv[2], Buffer.from(url.split(",")[1], "base64"));
await browser.close();
