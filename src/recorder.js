// Record & replay. A performance is just a timeline of the two control bars
// (position, rotation, held) — tiny, so it fits in a share link.
import * as THREE from "three";

const RATE = 30; // frames per second
const MAX_SECONDS = 90;
const FIELDS = 16; // per frame: main pos3 quat4 held1, hands pos3 quat4 held1

export class Recorder {
  constructor() {
    this.recording = false;
    this.frames = [];
    this.acc = 0;
    this.duration = 0;
  }

  start() {
    this.frames = [];
    this.acc = 0;
    this.duration = 0;
    this.recording = true;
  }

  stop() {
    this.recording = false;
    return this.frames.length > 1 ? { rate: RATE, frames: this.frames } : null;
  }

  capture(dt, puppet) {
    if (!this.recording) return;
    this.acc += dt;
    this.duration += dt;
    while (this.acc >= 1 / RATE) {
      this.acc -= 1 / RATE;
      const m = puppet.main, h = puppet.hands;
      this.frames.push([
        ...m.position.toArray(), ...m.quaternion.toArray(), m.held ? 1 : 0,
        ...h.position.toArray(), ...h.quaternion.toArray(), h.held ? 1 : 0,
      ]);
    }
    if (this.duration > MAX_SECONDS) this.stop();
  }
}

export class Player {
  constructor() {
    this.perf = null;
    this.t = 0;
    this.playing = false;
    this.loop = true;
  }
  play(perf) {
    this.perf = perf;
    this.t = 0;
    this.playing = !!perf;
  }
  stop() { this.playing = false; }
  get length() { return this.perf ? this.perf.frames.length / this.perf.rate : 0; }

  // drive a (ghost) puppet's bars from the recording
  apply(dt, puppet, offset = null) {
    if (!this.playing) return false;
    this.t += dt;
    const { frames, rate } = this.perf;
    let f = this.t * rate;
    if (f >= frames.length - 1) {
      if (!this.loop) { this.playing = false; return false; }
      this.t = 0; f = 0;
      puppet.reset();
    }
    const i = Math.floor(f), k = f - i;
    const a = frames[i], b = frames[Math.min(i + 1, frames.length - 1)];
    const lerp3 = (o) => new THREE.Vector3(a[o], a[o + 1], a[o + 2]).lerp(new THREE.Vector3(b[o], b[o + 1], b[o + 2]), k);
    const slerp4 = (o) => new THREE.Quaternion(a[o], a[o + 1], a[o + 2], a[o + 3]).slerp(new THREE.Quaternion(b[o], b[o + 1], b[o + 2], b[o + 3]), k);
    puppet.main.position.copy(lerp3(0));
    if (offset) puppet.main.position.add(offset);
    puppet.main.quaternion.copy(slerp4(3));
    puppet.main.held = a[7] > 0.5;
    puppet.main.parked = false;
    puppet.hands.held = a[15] > 0.5;
    if (puppet.hands.held) {
      puppet.hands.position.copy(lerp3(8));
      if (offset) puppet.hands.position.add(offset);
      puppet.hands.quaternion.copy(slerp4(11));
    }
    return true;
  }
}

// ---- share-link encoding: quantise -> gzip -> base64url ----------------------
export async function encodePerformance(perf) {
  const n = perf.frames.length;
  const buf = new Int16Array(n * FIELDS);
  perf.frames.forEach((fr, i) => {
    for (let j = 0; j < FIELDS; j++) {
      const isQuat = (j >= 3 && j < 7) || (j >= 11 && j < 15);
      buf[i * FIELDS + j] = Math.round(isQuat ? fr[j] * 32767 : fr[j] * (j === 7 || j === 15 ? 1 : 10000));
    }
  });
  // delta-encode along time for much better compression
  for (let i = n - 1; i > 0; i--) for (let j = 0; j < FIELDS; j++) buf[i * FIELDS + j] -= buf[(i - 1) * FIELDS + j];
  const bytes = new Uint8Array(buf.buffer);
  const header = new Uint8Array([1, perf.rate]);
  const zipped = await gzip(concat(header, bytes));
  return b64url(zipped);
}

export async function decodePerformance(text) {
  const raw = await gunzip(unb64url(text));
  if (raw[0] !== 1) throw new Error("unknown performance format");
  const rate = raw[1];
  const body = raw.slice(2);
  const buf = new Int16Array(body.buffer, body.byteOffset, Math.floor(body.byteLength / 2));
  const n = Math.floor(buf.length / FIELDS);
  for (let i = 1; i < n; i++) for (let j = 0; j < FIELDS; j++) buf[i * FIELDS + j] += buf[(i - 1) * FIELDS + j];
  const frames = [];
  for (let i = 0; i < n; i++) {
    const fr = [];
    for (let j = 0; j < FIELDS; j++) {
      const isQuat = (j >= 3 && j < 7) || (j >= 11 && j < 15);
      const v = buf[i * FIELDS + j];
      fr.push(isQuat ? v / 32767 : j === 7 || j === 15 ? v : v / 10000);
    }
    frames.push(fr);
  }
  return { rate, frames };
}

const concat = (a, b) => { const o = new Uint8Array(a.length + b.length); o.set(a); o.set(b, a.length); return o; };
async function gzip(bytes) {
  const s = new Blob([bytes]).stream().pipeThrough(new CompressionStream("gzip"));
  return new Uint8Array(await new Response(s).arrayBuffer());
}
async function gunzip(bytes) {
  const s = new Blob([bytes]).stream().pipeThrough(new DecompressionStream("gzip"));
  return new Uint8Array(await new Response(s).arrayBuffer());
}
function b64url(bytes) {
  let s = "";
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
function unb64url(text) {
  const s = atob(text.replace(/-/g, "+").replace(/_/g, "/"));
  const o = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) o[i] = s.charCodeAt(i);
  return o;
}

// ---- local library (per-browser convenience only) ----------------------------
export const library = {
  list() {
    try { return JSON.parse(localStorage.getItem("strings.performances") || "[]"); } catch { return []; }
  },
  save(entry) {
    try {
      const all = this.list();
      all.unshift(entry);
      localStorage.setItem("strings.performances", JSON.stringify(all.slice(0, 10)));
    } catch { /* storage unavailable: the share link still works */ }
  },
};
