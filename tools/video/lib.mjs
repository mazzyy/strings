// Shared pieces for making the demo video: launch the browser, record a tab (picture and
// sound) to a file, and drive the emulated hands like a puppeteer.
import { chromium } from "../headless-tests/node_modules/playwright-core/index.mjs";
import fs from "node:fs";

export const W = 1920, H = 1080;
export async function launch() {
  const base = `${process.env.HOME}/Library/Caches/ms-playwright/chromium-1248/chrome-mac-arm64`;
  const exe = fs.readdirSync(base).find((f) => f.endsWith(".app"));
  return chromium.launch({ executablePath: `${base}/${exe}/Contents/MacOS/${exe.replace(".app", "")}`,
    args: ["--use-angle=metal", "--enable-gpu", "--ignore-gpu-blocklist", "--auto-accept-this-tab-capture", "--autoplay-policy=no-user-gesture-required", "--mute-audio", "--disable-background-timer-throttling", "--disable-renderer-backgrounding"] });
}

// Arms a recorder in the page: window.REC.start(mime, bits), .stop() -> base64, .level()
export async function armRecorder(page) {
  await page.evaluate(() => {
    const b = document.createElement("button"); b.id = "recgo"; b.style.cssText = "position:fixed;left:0;top:0;width:8px;height:8px;z-index:2147483647;opacity:0.01;border:0;padding:0";
    b.onclick = async () => {
      try {
        const shown = await navigator.mediaDevices.getDisplayMedia({ video: { frameRate: 30, width: innerWidth, height: innerHeight }, audio: false, preferCurrentTab: true });
        // the sound is taken straight from the page's own audio graph (window.AUDIO_TAP is an
        // AudioNode to listen to; the game's listener by default), so nothing plays out loud
        const tapNode = window.AUDIO_TAP || window.strings?.sfx?.listener?.gain;
        const ac = tapNode.context, dest = ac.createMediaStreamDestination(), an = ac.createAnalyser(); an.fftSize = 2048;
        tapNode.connect(dest); tapNode.connect(an);
        const stream = new MediaStream([shown.getVideoTracks()[0], dest.stream.getAudioTracks()[0]]);
        const buf = new Float32Array(2048); let peak = 0;
        setInterval(() => { an.getFloatTimeDomainData(buf); for (const v of buf) peak = Math.max(peak, Math.abs(v)); }, 100);
        window.REC = {
          stream, chunks: [],
          start(mime = "video/webm;codecs=vp9,opus", bits = 16e6) { this.chunks = []; peak = 0; this.rec = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: bits, audioBitsPerSecond: 192e3 }); this.rec.ondataavailable = (e) => e.data.size && this.chunks.push(e.data); this.rec.start(500); this.t0 = performance.now(); },
          level() { return peak; },
          stop() { return new Promise((res) => { this.rec.onstop = async () => { const u8 = new Uint8Array(await new Blob(this.chunks).arrayBuffer()); let s = ""; for (let i = 0; i < u8.length; i += 0x8000) s += String.fromCharCode.apply(null, u8.subarray(i, i + 0x8000)); res({ b64: btoa(s), secs: (performance.now() - this.t0) / 1000, peak }); }; this.rec.stop(); }); },
        };
      } catch (e) { window.REC = { error: `${e.name}: ${e.message}` }; }
      b.remove();
    };
    document.body.appendChild(b);
  });
  await page.click("#recgo", { force: true });
  await page.waitForFunction(() => window.REC, null, { timeout: 15000 });
  const err = await page.evaluate(() => window.REC.error || null);
  if (err) throw new Error("recorder: " + err);
}
export async function stopTo(page, file) {
  const { b64, secs, peak } = await page.evaluate(() => window.REC.stop());
  fs.writeFileSync(file, Buffer.from(b64, "base64"));
  return { file, secs: +secs.toFixed(2), mb: +(b64.length * 0.75 / 1e6).toFixed(1), audioPeak: +peak.toFixed(3) };
}

// The puppeteer: window.V drives the two emulated hands smoothly toward targets you set.
//   V.to({x,y,z,pitch,yaw,pinch}, rate)   the right hand (it holds Sir Pip's main bar)
//   V.left({x,y,z,pinch})                 the left hand (his arm bar, props, the palm)
//   V.grab() / V.jump() / V.cam(pos, look, fovy, secs)
export async function installPuppeteer(page) {
  await page.evaluate(async () => {
    const THREE = await import("three");
    const s = window.strings, sim = s.sim;
    const V = (window.V = { c: { x: -0.16, y: 0.4, z: 0.12, pitch: 0, yaw: 0, roll: 0 }, t: { x: -0.16, y: 0.4, z: 0.12, pitch: 0, yaw: 0 }, pinch: false, rate: 4,
      lc: { x: -0.3, y: 0.34, z: 0.16 }, lt: { x: -0.3, y: 0.34, z: 0.16 }, lpinch: false, lrate: 4, jumpT: 0, time: 0, walk: 0 });
    V.to = (o, rate) => { Object.assign(V.t, o); if (o.pinch !== undefined) V.pinch = o.pinch; if (rate) V.rate = rate; };
    V.left = (o, rate) => { Object.assign(V.lt, o); if (o.pinch !== undefined) V.lpinch = o.pinch; if (rate) V.lrate = rate; };
    V.jump = () => { V.jumpT = 1; };
    const q = new THREE.Quaternion(), e = new THREE.Euler(), p = new THREE.Vector3(), lp = new THREE.Vector3(), lq = new THREE.Quaternion();
    sim.sticky = false; sim._hasMouse = false;
    sim.autopilot = (dt, S) => {
      V.time += dt;
      const k = Math.min(1, dt * V.rate), c = V.c, t = V.t;
      const dx = (t.x - c.x) * k; c.x += dx; c.y += (t.y - c.y) * k; c.z += (t.z - c.z) * k;
      c.pitch += (t.pitch - c.pitch) * Math.min(1, dt * 6); c.yaw += (t.yaw - c.yaw) * Math.min(1, dt * 4);
      // a walking hand rocks from side to side, like a puppeteer's
      V.walk += ((Math.abs(dx / Math.max(dt, 1e-3)) > 0.02 ? 1 : 0) - V.walk) * Math.min(1, dt * 6);
      c.roll = Math.sin(V.time * 7.5) * 0.26 * V.walk * (V.pinch ? 1 : 0);
      let jy = 0; if (V.jumpT > 0) { V.jumpT = Math.max(0, V.jumpT - dt * 3.2); jy = Math.sin((1 - V.jumpT) * Math.PI) * 0.045; }
      p.set(c.x, c.y + jy, c.z); q.setFromEuler(e.set(c.pitch, c.yaw, -c.roll, "YXZ"));
      S.main.setPose(p, q); S.main.pinch = V.pinch; S.main.present = true; S.main.tip.copy(p);
      const lk = Math.min(1, dt * V.lrate), l = V.lc, L = V.lt; l.x += (L.x - l.x) * lk; l.y += (L.y - l.y) * lk; l.z += (L.z - l.z) * lk;
      lp.set(l.x, l.y, l.z); S.other.setPose(lp, lq); S.other.pinch = V.lpinch; S.other.present = true; S.other.tip.copy(lp);
      S.mainPos.copy(p); S.otherPos.copy(lp);
    };
    // the "headset": where the viewer's head is and where it looks (stage space), eased
    const dev = window.xrDevice, head = { pos: new THREE.Vector3(), look: new THREE.Vector3(), fovy: 1.2 }, goal = { pos: new THREE.Vector3(), look: new THREE.Vector3(), fovy: 1.2, rate: 0 };
    const m = new THREE.Matrix4(), hq = new THREE.Quaternion(), wp = new THREE.Vector3(), wl = new THREE.Vector3(), up = new THREE.Vector3(0, 1, 0);
    V.cam = (pos, look, fovy = 1.0, secs = 0) => { goal.pos.set(...pos); goal.look.set(...look); goal.fovy = fovy; goal.rate = secs > 0 ? 2.2 / secs : 0; if (!secs || !V.camOn) { head.pos.copy(goal.pos); head.look.copy(goal.look); head.fovy = fovy; } V.camOn = true; };
    let last = performance.now();
    const tick = () => {
      const now = performance.now(), dt = Math.min(0.05, (now - last) / 1000); last = now;
      if (V.camOn && dev) {
        const k = goal.rate ? Math.min(1, dt * goal.rate) : 1;
        head.pos.lerp(goal.pos, k); head.look.lerp(goal.look, k); head.fovy += (goal.fovy - head.fovy) * k;
        s.stageRoot.updateMatrixWorld(true);
        wp.copy(head.pos); s.stageRoot.localToWorld(wp); wl.copy(head.look); s.stageRoot.localToWorld(wl);
        hq.setFromRotationMatrix(m.lookAt(wp, wl, up));
        dev.position.set(wp.x, wp.y, wp.z); dev.quaternion.set(hq.x, hq.y, hq.z, hq.w);
        if ("fovy" in dev) dev.fovy = head.fovy;
      }
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });
}
export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
