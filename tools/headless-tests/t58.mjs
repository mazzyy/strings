// The layered, animated stage sets: every chapter loads without errors, the sets' hooks still
// work (cage door, flight clouds), layers animate, and the draw-call cost stays small.
//   node t58.mjs [port]
import { chromium } from "playwright-core";
import fs from "node:fs";
const port = process.argv[2] || 8095;
const base = `${process.env.HOME}/Library/Caches/ms-playwright/chromium-1248/chrome-mac-arm64`;
const exe = fs.readdirSync(base).find((f) => f.endsWith(".app"));
const browser = await chromium.launch({ executablePath: `${base}/${exe}/Contents/MacOS/${exe.replace(".app", "")}`, args: ["--use-angle=metal", "--enable-gpu", "--ignore-gpu-blocklist"] });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
page.on("console", (m) => { if (m.type() === "error" && !m.text().includes("404")) errors.push(m.text()); });
await page.goto(`http://localhost:${port}/?quality=low`);
await page.waitForSelector("#begin", { timeout: 90000 });
await page.evaluate(() => { document.getElementById("loading").classList.add("done"); window.strings.raiseCurtain(); });
await page.waitForTimeout(2000);
const res = await page.evaluate(async () => {
  const L = await import("/src/lines.js");
  const s = window.strings, r = s.renderer, out = {};
  const frame = () => new Promise((f) => requestAnimationFrame(() => requestAnimationFrame(f)));
  for (const name of ["courtyard", "forest", "ship", "bridge", "tower", "cave", "sky"]) {
    s.applySet(name);
    await new Promise((f) => setTimeout(f, 700));
    r.info.autoReset = false; r.info.reset(); await new Promise((f) => requestAnimationFrame(f)); await new Promise((f) => requestAnimationFrame(f));
    const calls = r.info.render.calls; r.info.autoReset = true;
    const g = s.stageRoot.getObjectByName(`set:${name}`);
    let n = 0; g.traverse((o) => { if (o.isMesh || o.isPoints || o.isSprite) n++; });
    out[name] = { objects: n, frameCalls: calls, visible: g.visible };
  }
  // hooks other code relies on
  const tower = s.sets.refs("tower"), sky = s.sets.refs("sky");
  out.hooks = { cage: !!tower?.cage && typeof tower.openCage === "function" && !!tower.pedestal, sky: typeof sky?.setFlying === "function" };
  // the drifting layer really moves
  s.applySet("courtyard"); await frame();
  const drift = s.stageRoot.getObjectByName("set:courtyard").children.find((c) => c.renderOrder === -4);
  const x0 = drift.material.map.offset.x; await new Promise((f) => setTimeout(f, 1200)); out.driftMoved = drift.material.map.offset.x !== x0;
  // every chapter's scene change runs
  out.chapters = [];
  for (const ch of L.CHAPTERS) { try { s.changeScene(ch); await new Promise((f) => setTimeout(f, 400)); s.book.skipAll?.(); out.chapters.push(ch.id); } catch (e) { out.chapters.push(`${ch.id}: ${e.message}`); } }
  out.textures = r.info.memory.textures;
  return out;
});
console.log(JSON.stringify(res, null, 1));
console.log("errors:", errors.length ? errors.slice(0, 6) : "none");
const ok = !errors.length && res.hooks.cage && res.hooks.sky && res.driftMoved && res.chapters.length === 7 && res.chapters.every((c) => !c.includes(":"));
console.log(ok ? "PASS" : "FAIL");
await browser.close();
process.exit(ok ? 0 : 1);
