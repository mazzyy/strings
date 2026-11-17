// The stage top from a seated headset view (the curtain pelmet must not cross the picture).
//   node pelmetcheck.mjs <outdir> [port]
import { launch, installPuppeteer, W, H, sleep } from "./lib.mjs";
const out = process.argv[2], port = process.argv[3] || 8080;
const browser = await launch();
const page = await browser.newPage({ viewport: { width: W, height: H } });
page.on("pageerror", (e) => console.log("pageerror", e.message));
await page.addInitScript(() => localStorage.clear());
await page.goto(`http://localhost:${port}/?emulate&quality=high`);
await page.waitForSelector("#go-vr:not([hidden])", { timeout: 90000 });
await page.click("#go-vr");
await sleep(2600);
await page.evaluate(() => { const s = strings; s.raiseCurtain(); s.book.skipAll?.(); });
await installPuppeteer(page);
for (const [name, cam] of [["seated", [[0, 0.44, 0.74], [0.02, 0.26, -0.08], 0.88]], ["low", [[0, 0.33, 0.62], [0, 0.2, -0.08], 0.88]], ["closed", null]]) {
  if (name === "closed") { await page.evaluate(() => strings.curtains.close()); await sleep(4000); }
  else { await page.evaluate((c) => V.cam(...c), cam); await sleep(5000); }
  await page.screenshot({ path: `${out}/${name}.jpg`, quality: 80 });
}
await browser.close();
console.log("done");
