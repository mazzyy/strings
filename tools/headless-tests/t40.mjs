import { chromium } from "playwright-core";
import fs from "node:fs";
const base = `${process.env.HOME}/Library/Caches/ms-playwright/chromium-1248/chrome-mac-arm64`;
const exe = fs.readdirSync(base).find(f => f.endsWith(".app"));
const browser = await chromium.launch({ executablePath: `${base}/${exe}/Contents/MacOS/${exe.replace(".app","")}`, args: ["--use-angle=swiftshader","--enable-unsafe-swiftshader"] });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
const logs = [];
page.on("pageerror", e => logs.push("pageerror " + e.message + " " + (e.stack || "").split("\n")[1]));
const S = (fn, a) => page.evaluate(fn, a);
const waitFor = (fn, a, ms = 120000) => page.waitForFunction(fn, a, { timeout: ms }).catch(() => "timeout");
await page.addInitScript(() => localStorage.clear());
await page.goto("http://localhost:8095/?autostart");
await waitFor(() => window.strings?.show, null, 60000);
await page.waitForTimeout(1500);
await S(() => { const s = window.strings; if (!s.renderer.__r) s.renderer.__r = s.renderer.render; s.renderer.render = () => {}; s.sim.sticky = true; s.sim._hasMouse = false; });
for (const text of ["The clockwork robot locked the princess in his tower.", "A lonely wizard in the forest just wants a friend.", "Pirates captured the King! Sir Pip must fight the captain."]) {
  await S(async (t) => { const m = await import("/src/storymaker.js"); window.strings.playStory(m.buildStory(m.parseStory(t))); }, text);
  await waitFor(() => window.strings.book.open, null, 30000);
  await S(() => window.strings.book.skipAll());
  await waitFor(() => window.strings.show.state === "act", null, 90000);
  await page.waitForTimeout(1500);
  const st = await S(() => ({ set: window.strings.chapter.set, guest: window.strings.guestId, princess: window.strings.princessDrv.state, king: window.strings.extra("king").on, acts: window.strings.show.scene.acts.map(a => a.task?.type || a.check).join(","), task: !!window.strings.currentTask }));
  for (let i = 0; i < 8 && !["ending", "finale", "done"].includes(await S(() => window.strings.show.state)); i++) { await S(() => window.strings.show.skip()); await page.waitForTimeout(2500); }
  await waitFor(() => ["ending", "finale", "done"].includes(window.strings.show.state), null, 60000);
  await page.waitForTimeout(1500);
  console.log(text, "\n  ", JSON.stringify(st), "\n   ending:", await S(() => ({ princess: window.strings.princessDrv.state, king: window.strings.extra("king").on })));
  await waitFor(() => window.strings.show.state === "done", null, 60000);
  await page.waitForTimeout(3500);
  await S(() => document.getElementById("storymaker").classList.remove("on"));
}
console.log(logs.join("\n") || "no errors");
await browser.close();
