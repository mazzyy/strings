import { chromium } from "playwright-core";
import fs from "node:fs";
const base = `${process.env.HOME}/Library/Caches/ms-playwright/chromium-1248/chrome-mac-arm64`;
const exe = fs.readdirSync(base).find(f => f.endsWith(".app"));
const browser = await chromium.launch({ executablePath: `${base}/${exe}/Contents/MacOS/${exe.replace(".app","")}`, args: ["--use-angle=swiftshader","--enable-unsafe-swiftshader"] });
const page = await browser.newPage({ viewport: { width: 1200, height: 800 } });
const logs = [];
page.on("pageerror", e => logs.push("pageerror " + e.message + " " + (e.stack || "").split("\n")[1]));
const S = (fn, a) => page.evaluate(fn, a);
await page.addInitScript(() => localStorage.clear());
await page.goto("http://localhost:8095/?emulate");
await page.waitForSelector("#begin", { timeout: 90000 });
console.log("menu text:", await S(() => document.querySelector(".opt.info small").textContent));
await S(() => document.getElementById("enter-vr").click());
await page.waitForTimeout(3000);
const r = await S(async () => {
  const s = window.strings, out = {};
  // a stand-in anchor at a real-world spot on a desk
  const mat = (x, y, z) => new Float32Array([1,0,0,0, 0,1,0,0, 0,0,1,0, x,y,z,1]);
  const anchor = { anchorSpace: {}, deleted: false, delete() { this.deleted = true; }, at: [0.3, 0.72, -0.5] };
  const hit = { createAnchor: () => Promise.resolve(anchor) };
  await s.anchorStage(hit, new s.camera.position.constructor(0, 0, -1));
  out.anchored = !!s.stageAnchor;
  const frame = (tracked = true) => ({ trackedAnchors: new Set(tracked ? [anchor] : []), getPose: () => ({ transform: { matrix: mat(...anchor.at) } }) });
  out.followed = s.followAnchor(frame());
  out.stageAt = s.stageRoot.position.toArray().map(v => +v.toFixed(3));
  // the headset refines its map: the anchor's reported spot shifts 2 cm, the stage follows
  anchor.at = [0.32, 0.72, -0.5];
  out.followedShift = s.followAnchor(frame());
  out.stageAfterShift = s.stageRoot.position.toArray().map(v => +v.toFixed(3));
  // tracking lost for a moment: the stage stays put
  anchor.at = [5, 5, 5];
  out.whileLost = s.followAnchor(frame(false));
  out.stageWhileLost = s.stageRoot.position.toArray().map(v => +v.toFixed(3));
  // no anchor support at all: nothing breaks
  out.noSupport = (await s.anchorStage({}, new s.camera.position.constructor(0, 0, -1))) === null && !s.stageAnchor && anchor.deleted;
  return out;
});
console.log(JSON.stringify(r, null, 1));
await page.waitForTimeout(1500);
console.log(logs.join("\n") || "no errors");
await browser.close();
