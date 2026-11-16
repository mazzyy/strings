// Screenshots of every stage set and every storybook page, for checking the art.
//   node shots.mjs <outdir> [port] [sets|book|all] [names,comma,separated]
import { chromium } from "playwright-core";
import fs from "node:fs";
const out = process.argv[2], port = process.argv[3] || 8095, what = process.argv[4] || "all", only = process.argv[5]?.split(",");
fs.mkdirSync(out, { recursive: true });
const base = `${process.env.HOME}/Library/Caches/ms-playwright/chromium-1248/chrome-mac-arm64`;
const exe = fs.readdirSync(base).find((f) => f.endsWith(".app"));
const browser = await chromium.launch({ executablePath: `${base}/${exe}/Contents/MacOS/${exe.replace(".app", "")}`, args: process.env.SOFT ? ["--use-angle=swiftshader", "--enable-unsafe-swiftshader"] : ["--use-angle=metal", "--enable-gpu", "--ignore-gpu-blocklist"] });
const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });
page.on("pageerror", (e) => console.log("pageerror", e.message));
page.on("console", (m) => { if (m.type() === "error" && !m.text().includes("404")) console.log("console error:", m.text()); });
await page.goto(`http://localhost:${port}/?quality=high`);
await page.waitForSelector("#begin", { timeout: 90000 });
await page.evaluate(() => { document.getElementById("loading").classList.add("done"); window.strings.raiseCurtain(); });
await page.waitForTimeout(2500);
await page.addStyleTag({ content: ".hud,#show,#hint,#caption,#toast,#tip,#top,#help,#logwrap{display:none!important}" });
if (what !== "book") {
  for (const name of only || ["courtyard", "forest", "ship", "bridge", "tower", "cave", "sky"]) {
    await page.evaluate((n) => { const s = window.strings; s.applySet(n); s.hints.hide?.(); }, name);
    await page.waitForTimeout(3500);
    await page.screenshot({ path: `${out}/set-${name}.png`, clip: { x: 250, y: 380, width: 1100, height: 520 } });
  }
}
if (what !== "sets") {
  const pages = await page.evaluate(async (only) => {
    const L = await import("/src/lines.js");
    const s = window.strings, b = s.book, res = [];
    for (const ch of [L.PROLOGUE, ...L.CHAPTERS, L.EPILOGUE]) {
      if (only && !only.includes(ch.id)) continue;
      for (let n = 0; n < ch.pages.length; n++) { b.chapter = ch; b.page = n; b.xr = false; b.draw(b.g); res.push([`${ch.id}-${n}`, b.canvas.toDataURL("image/jpeg", 0.9)]); }
    }
    return res;
  }, what === "book" ? only : null);
  for (const [k, url] of pages) fs.writeFileSync(`${out}/book-${k}.jpg`, Buffer.from(url.split(",")[1], "base64"));
}
await browser.close();
console.log("done");
