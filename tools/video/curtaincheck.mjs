// The drapery up close: closed, half open and open, from the seated headset view, a low
// angle and the side; plus the desktop view.   node curtaincheck.mjs <outdir> [port]
import { launch, installPuppeteer, W, H, sleep } from "./lib.mjs";
import fs from "node:fs";
const out = process.argv[2], port = process.argv[3] || 8080;
fs.mkdirSync(out, { recursive: true });
const browser = await launch();
const errors = [];
{
  const page = await browser.newPage({ viewport: { width: W, height: H } });
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
  await page.addInitScript(() => localStorage.clear());
  await page.goto(`http://localhost:${port}/?emulate&quality=high`);
  await page.waitForSelector("#go-vr:not([hidden])", { timeout: 90000 });
  await page.click("#go-vr");
  await sleep(2600);
  await installPuppeteer(page);
  await page.evaluate(() => { V.to({ x: 0.3, y: -0.3, z: 0.3 }); V.left({ x: -0.3, y: -0.3, z: 0.3 }); });
  const views = { seat: [[0, 0.44, 0.74], [0.02, 0.2, -0.08], 0.88], close: [[-0.2, 0.2, 0.42], [-0.34, 0.13, 0.15], 0.7], side: [[0.42, 0.3, 0.6], [0.05, 0.16, 0.0], 0.8] };
  for (const [state, k] of [["closed", 0], ["half", 0.45], ["open", 1]]) {
    await page.evaluate((k) => { const c = strings.curtains; if (k === 1) c.open(); else c.follow(k); }, k);
    await sleep(k === 1 ? 5000 : 2500);
    for (const [name, cam] of Object.entries(views)) {
      if (state === "half" && name !== "seat") continue;
      await page.evaluate((c) => V.cam(...c), cam);
      await sleep(900);
      await page.screenshot({ path: `${out}/${state}-${name}.jpg`, quality: 85 });
    }
  }
  await page.close();
}
{
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  page.on("pageerror", (e) => errors.push(e.message));
  await page.addInitScript(() => localStorage.clear());
  await page.goto(`http://localhost:${port}/?quality=high`);
  await page.waitForSelector("#begin", { timeout: 90000 });
  await page.evaluate(() => document.getElementById("loading").classList.add("done"));
  await sleep(2500);
  await page.screenshot({ path: `${out}/desk-closed.jpg`, quality: 85 });
  await page.evaluate(() => strings.raiseCurtain());
  await sleep(9000);
  await page.screenshot({ path: `${out}/desk-open.jpg`, quality: 85 });
  await page.close();
}
await browser.close();
console.log(errors.length ? "errors:\n" + errors.join("\n") : "errors: none");
