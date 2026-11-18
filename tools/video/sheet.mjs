// A contact sheet: lays images out in a grid (with their names) and saves one PNG.
//   node sheet.mjs <out.png> <cols> <img>...
import { launch } from "./lib.mjs";
import fs from "node:fs";
import path from "node:path";
const [out, cols, ...files] = process.argv.slice(2);
const browser = await launch();
const page = await browser.newPage({ viewport: { width: 1600, height: 900 } });
const cells = files.map((f) => `<figure><img src="data:image/png;base64,${fs.readFileSync(f).toString("base64")}"><figcaption>${path.basename(f)}</figcaption></figure>`).join("");
await page.setContent(`<style>body{margin:0;background:#111;color:#ddd;font:12px sans-serif}main{display:grid;grid-template-columns:repeat(${cols},1fr);gap:4px;padding:4px}figure{margin:0}img{width:100%;display:block}figcaption{padding:2px 4px}</style><main>${cells}</main>`);
await page.waitForTimeout(300);
await page.locator("main").screenshot({ path: out });
await browser.close();
