import { chromium } from "playwright-core";
import fs from "node:fs";
const out = process.argv[2];
const base = `${process.env.HOME}/Library/Caches/ms-playwright/chromium-1248/chrome-mac-arm64`;
const exe = fs.readdirSync(base).find(f => f.endsWith(".app"));
const browser = await chromium.launch({ executablePath: `${base}/${exe}/Contents/MacOS/${exe.replace(".app","")}`, args: ["--use-angle=swiftshader","--enable-unsafe-swiftshader"] });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
const logs = [];
page.on("pageerror", e => logs.push("pageerror " + e.message + " " + (e.stack || "").split("\n")[1]));
page.on("console", m => { if (m.type() === "error" && !m.text().includes("Failed to load resource")) logs.push(m.text()); });
const S = (fn, a) => page.evaluate(fn, a);
const waitFor = (fn, a, ms = 120000) => page.waitForFunction(fn, a, { timeout: ms }).catch(() => "timeout");
const fast = () => S(() => { const s = window.strings; if (!s.renderer.__r) s.renderer.__r = s.renderer.render; s.renderer.render = () => {}; });
const draw = () => S(() => { const s = window.strings; if (s.renderer.__r) s.renderer.render = s.renderer.__r; });
const shot = async (n) => { await draw(); await page.waitForTimeout(800); await page.screenshot({ path: `${out}/${n}.png` }); await fast(); };
await page.addInitScript(() => localStorage.clear());
await page.goto("http://localhost:8095/");
await page.waitForSelector("#mystory", { timeout: 90000 });
await page.click("#mystory");
await page.fill("#storymaker textarea", "dragon kidnaped princes in his cave sir pip to rescue");
await page.waitForTimeout(300);
console.log("summary:", await S(() => document.querySelector("#storymaker .sum").textContent));
await page.screenshot({ path: `${out}/sm1-dialog.png` });
await page.click("#storymaker .go");
await waitFor(() => window.strings.book.open, null, 30000);
await page.waitForTimeout(2500);
await page.screenshot({ path: `${out}/sm2-book.png` });
console.log("book page 1:", await S(() => window.strings.book.chapter.pages[0]), "| voiced:", await S(() => !!window.strings.narrator.manifest[window.strings.book.chapter.pages[0]]));
await S(() => window.strings.book.skipAll());
await waitFor(() => window.strings.show.state === "intro" || window.strings.show.state === "act", null, 60000);
await page.waitForTimeout(2500);
console.log("stage:", await S(() => ({ chapter: window.strings.chapter.id, guest: window.strings.guestId, princess: window.strings.princessDrv.state, acts: window.strings.show.scene.acts.map(a => a.goal) })));
await shot("sm3-stage");
// play it through quickly
await S(() => { window.strings.sim.sticky = true; window.strings.sim._hasMouse = false; });
await waitFor(() => window.strings.show.state === "act", null, 60000);
for (let i = 0; i < 10 && !["ending", "finale", "done"].includes(await S(() => window.strings.show.state)); i++) { await S(() => window.strings.show.skip()); await page.waitForTimeout(2500); }
await waitFor(() => window.strings.show.state === "ending" || window.strings.show.state === "finale", null, 60000);
await page.waitForTimeout(2000);
console.log("ending: princess", await S(() => window.strings.princessDrv.state));
await shot("sm4-ending");
await waitFor(() => document.getElementById("storymaker").classList.contains("on"), null, 120000);
console.log("story maker offered again:", await S(() => document.getElementById("storymaker").classList.contains("on")));
// a tower rescue (the cage and key), and a friendship story
for (const text of ["The clockwork robot locked the princess in his tower.", "A lonely wizard in the forest just wants a friend."]) {
  await S((t) => { const s = window.strings; document.getElementById("storymaker").classList.remove("on"); }, text);
  await S((t) => { const s = window.strings; s.playStory((window.__sm ||= null, null) || undefined); }, text).catch(() => {});
}
console.log(logs.slice(0, 10).join("\n") || "no errors");
await browser.close();
