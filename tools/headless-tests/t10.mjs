import { chromium } from "playwright-core";
import fs from "node:fs";
const out = process.argv[2];
const base = `${process.env.HOME}/Library/Caches/ms-playwright/chromium-1248/chrome-mac-arm64`;
const exe = fs.readdirSync(base).find(f => f.endsWith(".app"));
const browser = await chromium.launch({ executablePath: `${base}/${exe}/Contents/MacOS/${exe.replace(".app","")}`, args: ["--use-angle=swiftshader","--enable-unsafe-swiftshader"] });
const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
const page = await ctx.newPage();
const logs = [];
page.on("console", m => { if (m.type() === "error" && !m.text().includes("Failed to load resource")) logs.push(m.text()); });
page.on("pageerror", e => logs.push("pageerror " + e.message));
page.on("dialog", d => d.accept());
const S = (fn, a) => page.evaluate(fn, a);
const waitFor = (fn, a, ms = 120000) => page.waitForFunction(fn, a, { timeout: ms }).catch(() => "timeout");
const menu = () => S(() => [...document.querySelectorAll(".open button")].map(b => b.textContent));
// 1) a first visit
await page.goto("http://localhost:8095/");
await page.waitForSelector("#begin", { timeout: 90000 });
console.log("fresh menu", JSON.stringify(await menu()));
// 2) returning at the troll bridge
await S(() => localStorage.setItem("strings.story", JSON.stringify({ unlocked: 4, done: { courtyard: { stars: 3 }, forest: { stars: 3 }, ship: { stars: 3 } }, at: "bridge" })));
await page.reload();
await page.waitForSelector("#begin", { timeout: 90000 });
console.log("resume menu", JSON.stringify(await menu()));
await page.screenshot({ path: `${out}/m-menu.png` });
await page.click("#begin");
await waitFor(() => window.strings.book.open, null, 20000);
console.log("continue ->", await S(() => ({ book: window.strings.book.chapter.id, guest: window.strings.guestId, set: window.strings.sets.current })));
await page.click("#storybook .skip");
await S(() => { const s = window.strings; s.raiseCurtain(); s.renderer.__r = s.renderer.render; s.renderer.render = () => {}; s.sim.sticky = true; s.sim._hasMouse = false; });
await waitFor(() => window.strings.show.state === "act");
await S(() => window.strings.show.skip());
await waitFor(() => window.strings.show.act >= 1 && window.strings.show.state === "act");
// walk side to side only (the mouse plane), never nearer/further
const ans = Math.floor(Date.now() / 86400000) % 3;
const targetX = -0.3 + ans * 0.15;
for (let i = 0; i < 40; i++) {
  const px = await S(() => window.strings.pip.get("pelvis").x);
  await S((dx) => { window.strings.sim.mainPos.x += Math.max(-0.01, Math.min(0.01, dx)); }, targetX - px);
  await page.waitForTimeout(120);
  if (await S(() => window.strings.show.act) >= 2) break;
}
await waitFor(() => window.strings.show.act >= 2, null, 30000);
console.log("riddle by walking ->", await S(() => ({ act: window.strings.show.act, pipZ: +window.strings.pip.get("pelvis").z.toFixed(3) })));
await S(() => { const s = window.strings; s.renderer.render = s.renderer.__r; });
// 3) the chapter-map button
await page.reload();
await page.waitForSelector("#chapters", { timeout: 90000 });
await page.click("#chapters");
await page.waitForTimeout(1500);
console.log("chapter map ->", await S(() => ({ map: window.strings.storyMap.open, curtain: +window.strings.curtains.target })));
// 4) new story
await page.reload();
await page.waitForSelector("#newstory", { timeout: 90000 });
await page.click("#newstory");
await waitFor(() => window.strings.book.open, null, 20000);
console.log("new story ->", await S(() => ({ book: window.strings.book.chapter.id, state: window.strings.storyMap.state, guest: window.strings.guestId })));
// 5) fireflies reachable by walking side to side
await page.click("#storybook .skip");
await S(() => { const s = window.strings; s.raiseCurtain(); s.renderer.__r = s.renderer.render; s.renderer.render = () => {}; s.storyMap.state.unlocked = 6; s.changeScene(s.storyMap.places.find(p => p.id === "forest")); });
await waitFor(() => window.strings.book.open, null, 30000);
await S(() => window.strings.book.finish());
await waitFor(() => window.strings.chapter.id === "forest" && window.strings.show.state === "intro");
await S(() => { const s = window.strings; s.sim.sticky = true; s.sim._hasMouse = false; });
await waitFor(() => window.strings.show.state === "act");
await S(() => window.strings.show.skip());
await waitFor(() => window.strings.show.act >= 1 && window.strings.show.state === "act");
await S(() => window.strings.props.moveTo("lantern", "pip"));
for (let i = 0; i < 160; i++) {
  const t = await S(() => window.strings.currentTask?.target?.()?.x ?? null);
  if (t === null || await S(() => window.strings.show.act) >= 2) break;
  const px = await S(() => window.strings.props.position("lantern").x);
  await S((dx) => { window.strings.sim.mainPos.x += Math.max(-0.012, Math.min(0.012, dx)); }, t - px);
  await page.waitForTimeout(100);
}
console.log("fireflies by walking ->", await S(() => ({ act: window.strings.show.act, stars: window.strings.show.stars })));
console.log(logs.slice(0, 10).join("\n") || "no errors");
await browser.close();
