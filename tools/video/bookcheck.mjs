// The storybook in the headset, seen as a seated player sees it and as the video films it.
//   node bookcheck.mjs <outdir> [chapter]
import { launch, installPuppeteer, W, H, sleep } from "./lib.mjs";
const out = process.argv[2], id = process.argv[3] || "forest";
const browser = await launch();
const page = await browser.newPage({ viewport: { width: W, height: H } });
page.on("pageerror", (e) => console.log("pageerror", e.message));
await page.addInitScript(() => localStorage.clear());
await page.goto("http://localhost:8080/?emulate&quality=high");
await page.waitForSelector("#go-vr:not([hidden])", { timeout: 90000 });
await page.click("#go-vr");
await sleep(2600);
await page.evaluate((id) => { const s = strings; s.raiseCurtain(); s.storyMap.state.unlocked = 7; setTimeout(() => s.changeScene(s.storyMap.places.find((p) => p.id === id)), 1200); }, id);
await page.waitForFunction(() => strings.book.open && strings.book.mesh.visible, null, { timeout: 40000 });
await sleep(1800);
await installPuppeteer(page);
// turn the book to face a head at `pos` (stage space), the way the game does when it opens
const face = (pos) => page.evaluate((pos) => { const b = strings.book.mesh, d = { x: pos[0] - b.position.x, y: pos[1] - b.position.y, z: pos[2] - b.position.z }; b.rotation.set(-Math.atan2(d.y, Math.hypot(d.x, d.z)), Math.atan2(d.x, d.z), 0, "YXZ"); }, pos);
await page.evaluate(() => { V.to({ x: 0.22, y: -0.1, z: 0.5 }); V.left({ x: -0.22, y: -0.1, z: 0.5 }); });
// 1. as a seated player sees it: the head where the game expects it (0.45 m back, 0.58 m above the stage floor)
const seat = [0, 0.58, 0.45];
await page.evaluate((p) => V.cam(p, [0, 0.36, 0], 1.25), seat); await face(seat);
await sleep(1200);
await page.screenshot({ path: `${out}/book-seated.png` });
console.log(JSON.stringify(await page.evaluate(() => { const s = strings, b = s.book.mesh; return { book: b.position.toArray().map((v) => +v.toFixed(3)), tiltDeg: +(b.rotation.x * 57.3).toFixed(0), barsShown: s.pip.skin.bars.visible }; })));
// 2. as the video films it
const cam = await page.evaluate(() => { const b = strings.book.mesh.position; return [b.x, b.y + 0.05, b.z + 0.5]; });
await page.evaluate((c) => { const b = strings.book.mesh.position; V.cam(c, [b.x, b.y - 0.012, b.z], 0.8); }, cam); await face(cam);
await sleep(1200);
await page.screenshot({ path: `${out}/book-video.png` });
// 3. from the side, to see the layers stand off the page
const side = [cam[0] + 0.34, cam[1] + 0.02, cam[2] - 0.2];
await page.evaluate((c) => { const b = strings.book.mesh.position; V.cam(c, [b.x - 0.08, b.y, b.z], 0.62); }, side);
await sleep(900);
await page.screenshot({ path: `${out}/book-side.png` });
console.log("pop layers:", await page.evaluate(() => strings.book.pops.length));
await browser.close();
