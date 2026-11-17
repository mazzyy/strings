// Records the raw takes for the demo video, one clip per take, in the headset emulator.
//   node shots.mjs <outdir> <take>[,<take>...]      (server on :8080)
// Each take logs "marks" (what happened when) so the edit can pick its cuts.
import { launch, armRecorder, stopTo, installPuppeteer, W, H, sleep } from "./lib.mjs";
import fs from "node:fs";
import { execFileSync } from "node:child_process";
const out = process.argv[2], want = (process.argv[3] || "").split(",").filter(Boolean);
fs.mkdirSync(`${out}/th`, { recursive: true });
const FF = `${process.env.HOME}/Library/Caches/ms-playwright/ffmpeg-1013/ffmpeg-mac`;
const browser = await launch();

async function vr({ narrator = false, mode = "#go-vr" } = {}) {
  const page = await browser.newPage({ viewport: { width: W, height: H } });
  page.on("pageerror", (e) => console.log("  pageerror", e.message));
  await page.route("**/audio/music_*.mp3", (r) => r.abort()); // (the edit lays its own music)
  await page.addInitScript(() => localStorage.clear());
  await page.goto("http://localhost:8080/?emulate&quality=high");
  await page.waitForSelector("#go-vr:not([hidden])", { timeout: 90000 });
  await armRecorder(page);
  await page.click(mode);
  await sleep(2600);
  await installPuppeteer(page);
  await page.evaluate((narrator) => {
    const s = window.strings, wait = (ms) => new Promise((r) => setTimeout(r, ms));
    // the narrator stays quiet in most takes (the video has its own voice-over); the cast still speak
    if (!narrator) { const vp = s.narrator.player, play = vp.play.bind(vp); vp.play = (url, who = "narrator") => (who === "marlo" ? play(url, who) : Promise.resolve(2.2)); }
    const G = (window.G = {
      wait, marks: [],
      mark(m) { G.marks.push([+(window.REC?.t0 ? (performance.now() - window.REC.t0) / 1000 : -1).toFixed(1), m]); },
      async until(fn, ms = 30000) { const t = performance.now(); while (!fn()) { if (performance.now() - t > ms) return false; await wait(80); } return true; },
      async go(id) {
        s.storyMap.state.unlocked = 7;
        s.changeScene(s.storyMap.places.find((p) => p.id === id));
        await G.until(() => s.book.open, 30000);
        if (!G.keepBook) s.book.finish();
        return G.until(() => s.chapter.id === id && (s.show.state === "intro" || s.show.state === "act"), 90000);
      },
      act: () => (s.show.state === "act" ? s.show.act : -1),
      park() { V.to({ x: 0.22, y: 0.02, z: 0.5, pinch: false, pitch: 0, yaw: 0 }, 4); V.left({ x: -0.22, y: 0.02, z: 0.5, pinch: false }, 4); },
      async grab() { const b = s.pip.main.position; V.to({ x: b.x, y: b.y - 0.03, z: b.z + 0.01, pinch: false, pitch: 0, yaw: 0 }, 6); await wait(900); V.to({ pinch: true }); await wait(400); G.mark("grab " + s.grabs.size); },
      async leftGrab() { const b = s.pip.hands.position; V.left({ x: b.x, y: b.y - 0.02, z: b.z + 0.01, pinch: false }, 6); await wait(900); V.left({ pinch: true }); await wait(350); },
      by(o, rate) { V.to({ x: V.t.x + (o.x || 0), y: V.t.y + (o.y || 0), z: V.t.z + (o.z || 0) }, rate); },
      async bow() { V.to({ pitch: 0.62 }); await wait(1300); V.to({ pitch: 0 }); await wait(700); },
      // carry on once the show reaches act n (or give it a nudge if it doesn't)
      async reach(n, ms) { const ok = await G.until(() => G.act() >= n || s.show.state !== "act", ms); if (!ok) { s.show.skip(); G.mark("skip->" + n); await wait(300); } else G.mark("act " + n); },
    });
    G.park();
  }, narrator);
  return page;
}
async function finish(page, name) {
  const marks = await page.evaluate(() => window.G?.marks || []);
  const info = await stopTo(page, `${out}/${name}.webm`);
  await page.close();
  for (let t = 1, i = 0; t < info.secs; t += 2, i++) { try { execFileSync(FF, ["-y", "-ss", String(t), "-i", info.file, "-frames:v", "1", "-vf", "scale=480:-1", `${out}/th/${name}-${String(t).padStart(3, "0")}.png`], { stdio: "ignore" }); } catch { /* past the end */ } }
  fs.writeFileSync(`${out}/${name}.json`, JSON.stringify({ ...info, marks }, null, 1));
  console.log(name, JSON.stringify(info), "\n  marks:", marks.map(([t, m]) => `${t}s ${m}`).join(" | "));
}
const E = (page, fn, a) => page.evaluate(fn, a);
const CAM = { wide: [[0, 0.5, 0.92], [0, 0.25, -0.15], 0.95], stage: [[0, 0.36, 0.7], [0, 0.17, -0.05], 0.8] };

const takes = {
  // the start menu: the curtains part, the title drops in on its strings
  async menu() {
    const page = await browser.newPage({ viewport: { width: W, height: H } });
    await page.addInitScript(() => localStorage.clear());
    await page.goto("http://localhost:8080/?emulate&quality=high");
    await page.waitForSelector("#go-vr:not([hidden])", { timeout: 90000 });
    await E(page, () => { const ac = new AudioContext(); window.AUDIO_TAP = ac.createGain(); window.strings.renderer.setAnimationLoop(null); });
    await armRecorder(page);
    await E(page, () => { const l = document.getElementById("loading"); l.classList.remove("intro"); void l.offsetWidth; l.style.visibility = "hidden"; });
    await sleep(300);
    await E(page, () => { REC.start(); });
    await sleep(500);
    await E(page, () => { const l = document.getElementById("loading"); l.style.visibility = ""; l.classList.add("intro"); });
    await sleep(11500);
    await finish(page, "menu");
  },
  // in the headset: a dark stage, a gold cord; pull it and the curtain rises
  async curtain() {
    const page = await vr();
    await E(page, (c) => V.cam(...c), CAM.wide);
    await sleep(900);
    await E(page, () => REC.start());
    await sleep(1200);
    await E(page, () => { const c = strings.cord.handle(); V.to({ x: c.x, y: c.y, z: c.z + 0.01 }, 3); G.mark("reach"); });
    await sleep(1900);
    await E(page, () => { V.to({ pinch: true }); G.mark("pinch"); });
    await sleep(500);
    await E(page, () => { V.to({ y: V.t.y - 0.17 }, 2.2); G.mark("pull"); });
    await sleep(3200);
    await E(page, () => { V.to({ pinch: false }); G.park(); G.mark("up " + !strings.preshow); V.cam([0, 0.42, 0.8], [0, 0.2, -0.1], 0.85, 5); });
    await sleep(5500);
    await finish(page, "curtain");
  },
  // chapter one: Marlo flies in, the shy hello, a bow, a high five, a jump together, a wave
  async court() {
    const page = await vr();
    await E(page, () => { strings.raiseCurtain(); });
    await sleep(1200);
    await E(page, (c) => { V.cam(...c); }, CAM.wide);
    await E(page, () => G.go("courtyard"));
    await E(page, () => REC.start());
    await E(page, async () => {
      const s = strings, w = G.wait;
      V.cam([0, 0.43, 0.72], [0.02, 0.25, -0.08], 0.85, 5);
      await G.grab();
      await G.until(() => s.show.state === "act", 20000); G.mark("act0");
      await G.until(() => s.currentTask?.debug?.().phase === "shy", 16000); G.mark("shy");
      await w(600);
      G.by({ x: 0.125 }, 0.6); G.mark("walk");            // a slow, gentle walk up to him
      await G.reach(1, 9000);
      await w(500); await G.bow(); G.mark("bowed");
      await G.reach(2, 5000);
      await G.leftGrab(); G.mark("left " + s.grabs.size);
      const m = s.marlo.get("lW"); V.left({ y: V.lt.y + 0.13, x: V.lt.x + 0.03 }, 3);
      await w(1500); V.left({ y: V.lt.y - 0.05 }, 5); await w(700); V.left({ y: V.lt.y + 0.06 }, 5);
      await G.reach(3, 6000);
      for (let i = 0; i < 4 && G.act() < 4; i++) { await w(1500); V.jump(); G.mark("jump"); }
      await G.reach(4, 3000);
      for (let i = 0; i < 6; i++) { V.left({ x: V.lt.x + (i % 2 ? -0.05 : 0.05), y: V.lt.y + (i ? 0 : 0.05) }, 9); await w(330); } G.mark("waved");
      await w(4500);
    });
    await finish(page, "court");
  },
  // the storybook in the headset, read aloud; poke it to turn the page
  async book() {
    const page = await vr({ narrator: true });
    await E(page, () => { strings.raiseCurtain(); G.keepBook = true; });
    await sleep(1200);
    await E(page, (c) => V.cam(...c), CAM.wide);
    await E(page, () => { G.go("forest"); });
    await E(page, () => G.until(() => strings.book.open, 30000));
    await sleep(300);
    await E(page, () => { const b = strings.book.mesh, p = b.position.clone(); G.bookAt = p; const cam = [p.x, p.y + 0.05, p.z + 0.5]; V.cam(cam, [p.x, p.y - 0.012, p.z], 0.8);
      // (the book turns to face whoever is reading: here, the camera)
      b.rotation.set(-Math.atan2(cam[1] - p.y, Math.hypot(cam[0] - p.x, cam[2] - p.z)), Math.atan2(cam[0] - p.x, cam[2] - p.z), 0, "YXZ"); });
    await E(page, () => { const p = G.bookAt; V.cam([p.x - 0.1, p.y + 0.05, p.z + 0.5], [p.x - 0.02, p.y - 0.012, p.z], 0.8); });
    await sleep(500);
    await E(page, () => REC.start());
    await E(page, () => { const p = G.bookAt; V.cam([p.x + 0.11, p.y + 0.06, p.z + 0.48], [p.x + 0.01, p.y - 0.012, p.z], 0.8, 17); });
    await sleep(7500);
    await E(page, () => { const p = G.bookAt; V.to({ x: p.x + 0.09, y: p.y - 0.03, z: p.z + 0.07 }, 3); G.mark("reach"); });
    await sleep(1400);
    await E(page, () => { const p = G.bookAt; V.to({ x: p.x + 0.09, y: p.y - 0.03, z: p.z + 0.002 }, 6); G.mark("poke"); });
    await sleep(700);
    await E(page, () => { G.park(); G.mark("page " + strings.book.page); });
    await sleep(7000);
    await finish(page, "book");
  },
  // every chapter has its own story: the book flips through five more of them
  async books() {
    const page = await vr();
    await E(page, () => { strings.raiseCurtain(); G.keepBook = true; });
    await sleep(1200);
    await E(page, (c) => V.cam(...c), CAM.wide);
    await E(page, () => { G.go("ship"); });
    await E(page, () => G.until(() => strings.book.open, 30000));
    await sleep(300);
    await E(page, () => {
      const s = strings, b = s.book, p = b.mesh.position.clone(), cam = [p.x, p.y + 0.05, p.z + 0.5];
      V.cam(cam, [p.x, p.y - 0.012, p.z], 0.8);
      b.mesh.rotation.set(-Math.atan2(cam[1] - p.y, Math.hypot(cam[0] - p.x, cam[2] - p.z)), Math.atan2(cam[0] - p.x, cam[2] - p.z), 0, "YXZ");
      // show a page of a chapter; with a paper page turn when the book is already open on another
      G.show = (id, n, flip = true) => { const ch = s.storyMap.places.find((q) => q.id === id); b.minT = 999; b.pageT = 0;
        b._clearPop();
        if (flip) { b.prevC.getContext("2d").drawImage(b.canvas, 0, 0); b.chapter = ch; b.page = n; b.draw(b.nextC.getContext("2d")); b.flip = { t: 0, dur: 0.5 }; b.turning = true; }
        else { b.chapter = ch; b.page = n; b.draw(b.g); b._buildPop(); }
        G.mark(id + " p" + n); };
      G.show("ship", 1, false);
    });
    await E(page, () => { const p = strings.book.mesh.position; V.cam([p.x - 0.11, p.y + 0.05, p.z + 0.48], [p.x - 0.02, p.y - 0.012, p.z], 0.8); });
    await sleep(1400);
    await E(page, () => REC.start());
    await E(page, () => { const p = strings.book.mesh.position; V.cam([p.x + 0.1, p.y + 0.06, p.z + 0.48], [p.x + 0.0, p.y - 0.012, p.z], 0.8, 13); });
    await sleep(1700);
    for (const [id, n] of [["bridge", 1], ["tower", 1], ["cave", 1], ["sky", 2]]) { await E(page, ([id, n]) => G.show(id, n), [id, n]); await sleep(2350); }
    await sleep(600);
    await finish(page, "books");
  },
  // free flight: Marlo snaps his strings, circles your head, lands on your open palm
  async unbound() {
    const page = await vr();
    await E(page, () => { strings.raiseCurtain(); });
    await sleep(1200);
    await E(page, () => G.go("courtyard"));
    await E(page, () => G.until(() => strings.currentTask?.debug?.().phase === "shy" || strings.show.act > 0, 25000));
    await E(page, () => { V.cam([0, 0.46, 0.86], [0.1, 0.22, -0.05], 0.95); });
    await sleep(600);
    await E(page, () => REC.start());
    await E(page, async () => {
      const s = strings, w = G.wait, THREE = await import("three");
      const look = new THREE.Vector3(0.1, 0.22, -0.05), palm = new THREE.Vector3(-0.1, 0.3, 0.42);
      await w(1200);
      s.unbound.free(); G.mark("free");
      // turn your head to watch him go round (as you would)
      let on = true; const follow = () => { if (!on) return; const c = s.marlo.get("chest"); const tgt = s.unbound.state === "perch" || s.unbound.state === "seek" ? palm.clone().setY(palm.y + 0.08) : c.clone(); if (tgt.z > 0.5) { tgt.z = 0.5; tgt.x = Math.sign(tgt.x || 1) * Math.max(Math.abs(tgt.x), 0.5); } look.lerp(tgt, 0.07); V.cam([0, 0.46, 0.86], look.toArray(), 1.05, 0.0001); requestAnimationFrame(follow); }; follow();
      await G.until(() => s.unbound.state === "loop", 8000); G.mark("loop");
      await w(6500);
      V.left({ x: palm.x, y: palm.y, z: palm.z, pinch: false }, 2); G.mark("hand out");
      await G.until(() => s.unbound.state === "seek", 9000); G.mark("seek");
      await G.until(() => s.unbound.state === "perch", 12000); G.mark("perch " + s.unbound.state);
      await w(3500);
      V.left({ x: palm.x + 0.1, y: palm.y + 0.03 }, 1.2); G.mark("carry");
      await w(4000); on = false;
    });
    await finish(page, "unbound");
  },
  // your own stories, and free play
  async extras() {
    const page = await vr();
    await E(page, () => { strings.raiseCurtain(); });
    await sleep(1200);
    await E(page, () => G.go("courtyard"));
    await E(page, (c) => V.cam(...c), CAM.wide);
    await E(page, () => REC.start());
    await E(page, async () => {
      const s = strings, w = G.wait;
      s.openStoryCards(); G.mark("cards");
      await w(600);
      const b = s.storyCards.group, p = s.stageRoot.worldToLocal(b.getWorldPosition(b.position.clone()));
      V.cam([p.x, p.y + 0.02, p.z + 0.52], [p.x, p.y, p.z], 0.85, 1.5);
      await w(6500);
      s.storyCards.hide?.(); s.startFreePlay(); G.mark("free play");
      await w(800);
      const g = s.playground.group, q = s.stageRoot.worldToLocal(g.getWorldPosition(g.position.clone()));
      V.cam([q.x, q.y - 0.02, q.z + 0.62], [q.x, q.y - 0.12, q.z], 0.95, 1.5);
      await w(3500);
      for (const id of ["dragon", "troll", "wizard", "princess"]) { s.setPlayer(id); G.mark("as " + id); await w(700); await G.grab(); G.by({ x: 0.08 }, 1.5); await w(900); V.jump(); await w(900); V.to({ pinch: false }); await w(300); }
    });
    await finish(page, "extras");
  },
};
// pages of the pop-up storybook, held for a set time each (the prologue, the epilogue)
async function pagesTake(name, pages) {
  const page = await vr();
  await E(page, () => { strings.raiseCurtain(); G.keepBook = true; });
  await sleep(1200);
  await E(page, (c) => V.cam(...c), CAM.wide);
  await E(page, () => { G.go("courtyard"); });
  await E(page, () => G.until(() => strings.book.open, 30000));
  await sleep(300);
  await E(page, async () => {
    const s = strings, b = s.book, p = b.mesh.position.clone(), cam = [p.x, p.y + 0.05, p.z + 0.5];
    const L = await import("/src/lines.js");
    V.cam(cam, [p.x, p.y - 0.012, p.z], 0.8);
    b.mesh.rotation.set(-Math.atan2(cam[1] - p.y, Math.hypot(cam[0] - p.x, cam[2] - p.z)), Math.atan2(cam[0] - p.x, cam[2] - p.z), 0, "YXZ");
    G.show = (id, n, flip = true) => {
      const ch = L[id.toUpperCase()] || s.storyMap.places.find((q) => q.id === id);
      b.minT = 999; b.pageT = 0; b._clearPop();
      if (flip) { b.prevC.getContext("2d").drawImage(b.canvas, 0, 0); b.chapter = ch; b.page = n; b.draw(b.nextC.getContext("2d")); b.flip = { t: 0, dur: 0.5 }; b.turning = true; }
      else { b.chapter = ch; b.page = n; b.draw(b.g); b._buildPop(); }
      G.mark(id + " p" + n);
    };
  });
  const total = pages.reduce((a, [, , secs]) => a + secs, 0);
  await E(page, ([id, n]) => G.show(id, n, false), pages[0]);
  await E(page, () => { const p = strings.book.mesh.position; V.cam([p.x - 0.11, p.y + 0.05, p.z + 0.48], [p.x - 0.02, p.y - 0.012, p.z], 0.8); });
  await sleep(300);
  await E(page, () => REC.start());
  await E(page, (secs) => { const p = strings.book.mesh.position; V.cam([p.x + 0.1, p.y + 0.06, p.z + 0.48], [p.x, p.y - 0.012, p.z], 0.8, secs); }, total);
  await sleep(pages[0][2] * 1000);
  for (const pg of pages.slice(1)) { await E(page, ([id, n]) => G.show(id, n), pg); await sleep(pg[2] * 1000); }
  await finish(page, name);
}
takes.prologue = () => pagesTake("prologue", [["prologue", 0, 6.4], ["prologue", 1, 8.8], ["prologue", 2, 5.2]]);
takes.epilogue = () => pagesTake("epilogue", [["epilogue", 0, 7.5]]);

// the story map between chapters: chapter one done, poke the forest, Sir Pip's token walks there
takes.map = async () => {
  const page = await vr();
  await E(page, () => { strings.raiseCurtain(); });
  await sleep(1200);
  await E(page, (c) => V.cam(...c), CAM.wide);
  await E(page, () => G.go("courtyard"));
  await E(page, () => G.until(() => strings.show.state === "act", 25000));
  await sleep(500);
  await E(page, () => {
    const s = strings, m = s.storyMap;
    m.state = { unlocked: 2, done: { courtyard: { stars: 3, ending: "grace" } }, at: "courtyard" };
    const c = m.places.find((p) => p.id === "courtyard"); m.token.x = c.map[0]; m.token.y = c.map[1];
    m.onChoose = () => G.mark("arrived");
    s.openMap();
  });
  await sleep(400);
  await E(page, async () => {
    const THREE = await import("three"), s = strings, m = s.storyMap.mesh;
    const p = m.position.clone(), n = new THREE.Vector3(0, 0, 1).applyEuler(m.rotation);
    const cam = p.clone().addScaledVector(n, 0.4);
    V.cam([cam.x, cam.y + 0.015, cam.z], p.toArray(), 0.78);
    // where the forest is drawn on the parchment (0.4 m x 0.25 m; the kingdom is 1600 x 1000)
    const f = s.storyMap.places.find((q) => q.id === "forest");
    const local = new THREE.Vector3((f.map[0] / 1600 - 0.5) * 0.4, (0.5 - f.map[1] / 1000) * 0.25, 0);
    G.forestAt = s.stageRoot.worldToLocal(m.localToWorld(local.clone()));
    G.forestNear = s.stageRoot.worldToLocal(m.localToWorld(local.clone().setZ(0.07)));
  });
  await sleep(600);
  await E(page, () => { REC.start(); G.mark("map"); });
  await sleep(1400);
  await E(page, () => { const q = G.forestNear; V.to({ x: q.x, y: q.y - 0.02, z: q.z, pinch: false }, 3); G.mark("reach"); });
  await sleep(1300);
  await E(page, () => { const q = G.forestAt; V.to({ x: q.x, y: q.y - 0.02, z: q.z }, 6); G.mark("poke"); });
  await sleep(500);
  await E(page, () => { const m = strings.storyMap; if (!m.travel) m.travelTo(m.places.find((q) => q.id === "forest")); G.mark("travel"); G.park(); });
  await sleep(3800);
  await finish(page, "map");
};

// the finale's turn: Clank caught and sorry; Sir Pip bows to him, then kneels to be knighted
takes.finale = async () => {
  const page = await vr();
  await E(page, () => { strings.raiseCurtain(); });
  await sleep(1200);
  await E(page, (c) => V.cam(...c), CAM.wide);
  await E(page, () => G.go("sky"));
  await E(page, () => G.until(() => strings.show.state === "act", 25000));
  await sleep(700);
  await E(page, async () => {
    const s = strings, w = G.wait;
    V.cam([0, 0.44, 0.74], [0.02, 0.26, -0.08], 0.88);
    await G.grab(); G.x0 = V.t.x;
    for (let i = 0; i < 8 && G.act() < 4; i++) { s.show.skip(); await w(300); await G.until(() => s.show.state === "act", 15000); }
    G.mark("at act " + G.act());
    if (s.flying) s.setFlight(false);
  });
  await sleep(2500);
  await E(page, () => { REC.start(); G.mark("kindness"); V.cam([0, 0.4, 0.66], [0.02, 0.22, -0.06], 0.82, 14); });
  await E(page, async () => {
    const s = strings, w = G.wait;
    await w(7600); // (long enough for the voice-over to get to "is bow")
    await G.bow(); G.mark("bow to clank");
    await G.until(() => G.act() >= 5 || s.show.state !== "act", 9000); G.mark("act " + G.act());
    await w(3000);
    await G.bow(); G.mark("kneel");
    V.to({ pitch: 0.62 }); await w(2600); V.to({ pitch: 0 });
    await w(7500); G.mark("knighted " + s.show.state);
  });
  await finish(page, "finale");
};

// one chapter each: go there, pick Sir Pip up, play its game for a while
const CHAPTERS = {
  forest: { cam: [[0, 0.42, 0.7], [0.02, 0.24, -0.08], 0.85], async play() { const s = strings, w = G.wait; s.props.moveTo("lantern", "pip"); await w(400); if (G.act() < 1) s.show.skip(); G.mark("act " + G.act()); for (const x of [0.2, -0.12, 0.26, -0.05, 0.18]) { G.by({ x: x - (V.t.x - G.x0) }, 1.3); await w(2400); if (Math.random() < 0.5) V.jump(); } } },
  ship: { cam: [[0, 0.42, 0.7], [0.02, 0.24, -0.08], 0.85], async play() { const s = strings, w = G.wait; s.props.moveTo("sword", "pip"); await w(400); if (G.act() < 1) s.show.skip(); G.mark("act " + G.act()); G.by({ x: 0.08 }, 2); for (let i = 0; i < 6; i++) { await w(1500); if (i % 2) V.jump(); else { V.to({ pitch: 0.55 }); await w(600); V.to({ pitch: 0 }); } G.by({ x: i % 3 === 2 ? 0.07 : -0.02 }, 5); G.mark("move " + JSON.stringify(s.currentTask?.debug?.() || {}).slice(0, 60)); } } },
  bridge: { cam: [[0, 0.42, 0.7], [0.02, 0.24, -0.08], 0.85], async play() { const s = strings, w = G.wait; G.by({ x: 0.16 }, 0.9); await G.reach(1, 7000); await w(1500); for (const x of [-0.1, 0.12, -0.02]) { G.by({ x }, 1.2); await w(2600); } } },
  tower: { cam: [[0, 0.42, 0.7], [0.02, 0.24, -0.08], 0.85], async play() { const s = strings, w = G.wait; for (let i = 0; i < 7; i++) { G.by({ x: 0.05 }, 1.5); await w(1700); G.mark(JSON.stringify(s.currentTask?.debug?.() || {}).slice(0, 70)); } } },
  cave: { cam: [[0, 0.42, 0.7], [0.02, 0.24, -0.08], 0.85], async play() { const s = strings, w = G.wait; s.props.moveTo("lantern", "pip"); await w(400); if (G.act() < 1) s.show.skip(); G.mark("act " + G.act()); for (const x of [0.22, -0.14, 0.3, 0.0]) { G.by({ x: x - (V.t.x - G.x0) }, 1.2); await w(2800); } await G.bow(); } },
  sky: { cam: [[0, 0.44, 0.74], [0.02, 0.26, -0.08], 0.88], async play() { const s = strings, w = G.wait; G.by({ x: 0.2 }, 1.2); await w(2500); if (G.act() < 1) { s.show.skip(); G.mark("skip mount"); } await w(1200); G.mark("flying " + s.flying); const y0 = V.t.y; for (let i = 0; i < 9; i++) { V.to({ y: y0 + [0.07, -0.05, 0.1, 0, -0.07, 0.06, 0.02, -0.04, 0.08][i] }, 2.2); await w(1500); G.mark(JSON.stringify(s.currentTask?.debug?.() || {}).slice(0, 60)); } } },
};
for (const [id, c] of Object.entries(CHAPTERS)) {
  takes[id] = async () => {
    const page = await vr();
    await E(page, () => { strings.raiseCurtain(); });
    await sleep(1200);
    await E(page, (c) => V.cam(...c), CAM.wide);
    const ok = await E(page, (id) => G.go(id), id);
    await E(page, () => G.until(() => strings.show.state === "act", 25000));
    await sleep(700);
    await E(page, async (cam) => { V.cam(cam[0], cam[1], cam[2]); await G.grab(); G.x0 = V.t.x; }, c.cam);
    await sleep(300);
    await E(page, () => { REC.start(); G.mark("start act " + G.act() + " " + strings.chapter.id); });
    await sleep(600);
    await page.evaluate(`(${c.play.toString().replace(/^async play\(\)/, "async function()")})()`);
    await sleep(1500);
    await finish(page, id);
  };
}
for (const name of want) { const t0 = Date.now(); console.log("== take", name, ok(takes[name])); if (takes[name]) await takes[name]().catch((e) => console.log("  FAILED", name, e.message.split("\n")[0])); console.log("  took", ((Date.now() - t0) / 1000).toFixed(0) + "s"); }
function ok(f) { return f ? "" : "(no such take)"; }
await browser.close();
