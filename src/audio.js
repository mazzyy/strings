// Sound design, all synthesised in code (nothing to license): wooden footsteps,
// armour clinks, dragon chirps, applause, a curtain swish, chimes and a little
// music box. Effects play as spatial audio at the object that made them.
import * as THREE from "three";

const SR = 44100;

function buffer(ctx, seconds, fill) {
  const n = Math.floor(seconds * SR);
  const b = ctx.createBuffer(1, n, SR);
  const d = b.getChannelData(0);
  fill(d, n);
  // gentle fade-out so nothing clicks
  const fade = Math.min(n, 400);
  for (let i = 0; i < fade; i++) d[n - 1 - i] *= i / fade;
  return b;
}
const noise = () => Math.random() * 2 - 1;

// one-pole filters for shaping noise
function lowpass(d, k) { let y = 0; for (let i = 0; i < d.length; i++) { y += k * (d[i] - y); d[i] = y; } }
function highpass(d, k) { let y = 0, x0 = 0; for (let i = 0; i < d.length; i++) { const x = d[i]; y = k * (y + x - x0); x0 = x; d[i] = y; } }
function normalize(d, peak = 0.9) { let m = 0; for (const v of d) m = Math.max(m, Math.abs(v)); if (m > 0) for (let i = 0; i < d.length; i++) d[i] *= peak / m; }

function makeBuffers(ctx) {
  const B = {};
  // wooden clack: a knock with a hollow resonance
  B.step = buffer(ctx, 0.12, (d, n) => {
    for (let i = 0; i < n; i++) {
      const t = i / SR;
      d[i] = (noise() * Math.exp(-t * 90) * 0.6 + Math.sin(2 * Math.PI * 520 * t) * Math.exp(-t * 55) + Math.sin(2 * Math.PI * 1230 * t) * Math.exp(-t * 80) * 0.4);
    }
    normalize(d, 0.7);
  });
  // armour clink: bright metallic partials
  B.clink = buffer(ctx, 0.5, (d, n) => {
    const f = [2310, 3170, 4420, 5960];
    for (let i = 0; i < n; i++) {
      const t = i / SR;
      let v = noise() * Math.exp(-t * 200) * 0.3;
      f.forEach((hz, k) => (v += Math.sin(2 * Math.PI * hz * t + k) * Math.exp(-t * (9 + k * 4)) / (k + 1)));
      d[i] = v;
    }
    normalize(d, 0.5);
  });
  // dragon chirp: a warbly rising trill
  B.chirp = buffer(ctx, 0.55, (d, n) => {
    let ph = 0;
    for (let i = 0; i < n; i++) {
      const t = i / SR;
      const f = 520 + 700 * Math.sin(Math.min(1, t / 0.45) * Math.PI * 0.5) + Math.sin(t * 2 * Math.PI * 28) * 60;
      ph += (2 * Math.PI * f) / SR;
      const env = Math.min(1, t * 30) * Math.exp(-t * 4);
      d[i] = (Math.sin(ph) + 0.35 * Math.sin(ph * 2.01) + 0.15 * Math.sin(ph * 3.02)) * env;
    }
    normalize(d, 0.6);
  });
  // a lower, happier dragon purr-roar for big moments
  B.roar = buffer(ctx, 0.9, (d, n) => {
    let ph = 0;
    for (let i = 0; i < n; i++) {
      const t = i / SR;
      const f = 180 + 120 * Math.sin(Math.min(1, t / 0.6) * Math.PI);
      ph += (2 * Math.PI * f) / SR;
      const env = Math.min(1, t * 12) * Math.exp(-t * 3);
      d[i] = (Math.sin(ph) * 0.7 + Math.sign(Math.sin(ph * 0.5)) * 0.15 + noise() * 0.25) * env * (0.8 + 0.2 * Math.sin(t * 2 * Math.PI * 22));
    }
    lowpass(d, 0.25);
    normalize(d, 0.6);
  });
  // applause: many small claps, swelling then fading
  B.applause = buffer(ctx, 3.6, (d, n) => {
    for (let c = 0; c < 900; c++) {
      const start = Math.floor(Math.pow(Math.random(), 0.8) * (n - 3000));
      const len = 600 + Math.random() * 900;
      const amp = 0.4 + Math.random() * 0.6;
      const tone = 0.15 + Math.random() * 0.35;
      let y = 0;
      for (let i = 0; i < len; i++) {
        y += tone * (noise() - y);
        d[start + i] += y * amp * Math.exp(-i / (len * 0.25));
      }
    }
    for (let i = 0; i < n; i++) { const t = i / n; d[i] *= Math.min(1, t * 6) * Math.pow(1 - t, 1.3); }
    highpass(d, 0.97);
    normalize(d, 0.55);
  });
  // curtain swish
  B.swish = buffer(ctx, 1.4, (d, n) => {
    for (let i = 0; i < n; i++) { const t = i / n; d[i] = noise() * Math.sin(t * Math.PI) * (0.6 + 0.4 * Math.sin(t * 40)); }
    lowpass(d, 0.08);
    normalize(d, 0.45);
  });
  // star chime: a bright arpeggio
  B.chime = buffer(ctx, 1.4, (d, n) => {
    const notes = [1046.5, 1318.5, 1568, 2093];
    for (let i = 0; i < n; i++) {
      const t = i / SR;
      let v = 0;
      notes.forEach((hz, k) => { const tt = t - k * 0.09; if (tt > 0) v += (Math.sin(2 * Math.PI * hz * tt) + 0.3 * Math.sin(2 * Math.PI * hz * 2.76 * tt)) * Math.exp(-tt * 4); });
      d[i] = v;
    }
    normalize(d, 0.45);
  });
  // a soft pop when a prop changes hands
  B.pop = buffer(ctx, 0.18, (d, n) => {
    for (let i = 0; i < n; i++) { const t = i / SR; d[i] = Math.sin(2 * Math.PI * (300 + 900 * Math.exp(-t * 40)) * t) * Math.exp(-t * 28); }
    normalize(d, 0.5);
  });
  return B;
}

// music box: a short waltz rendered once into a buffer
function musicBox(ctx) {
  const note = (m) => 440 * Math.pow(2, (m - 69) / 12);
  // melody (MIDI, beats) — an original little tune in 3/4
  const tune = [[72, 1], [76, 1], [79, 1], [84, 2], [83, 1], [81, 1], [79, 1], [76, 1], [77, 2], [74, 1],
    [72, 1], [76, 1], [79, 1], [81, 2], [79, 1], [77, 1], [76, 1], [74, 1], [72, 3]];
  const bass = [48, 55, 52, 53, 50, 48];
  const beat = 0.36;
  const total = tune.reduce((a, [, b]) => a + b, 0) * beat + 1.5;
  return buffer(ctx, total, (d, n) => {
    const pluck = (hz, at, amp, decay = 2.6) => {
      const s0 = Math.floor(at * SR), len = Math.floor(2.2 * SR);
      for (let i = 0; i < len && s0 + i < n; i++) {
        const t = i / SR;
        d[s0 + i] += amp * Math.exp(-t * decay) * (Math.sin(2 * Math.PI * hz * t) + 0.25 * Math.sin(2 * Math.PI * hz * 3.01 * t) * Math.exp(-t * 6) + 0.1 * Math.sin(2 * Math.PI * hz * 5.2 * t) * Math.exp(-t * 9));
      }
    };
    let at = 0.1;
    tune.forEach(([m, b], i) => {
      pluck(note(m), at, 0.5);
      if (i % 3 === 0) pluck(note(bass[(i / 3) % bass.length]), at, 0.3, 1.8);
      at += b * beat;
    });
    normalize(d, 0.5);
  });
}

export class Sfx {
  constructor(listener) {
    this.listener = listener;
    this.ctx = listener.context;
    this.B = makeBuffers(this.ctx);
    this.B.music = musicBox(this.ctx);
    this.pool = [];
    this.enabled = true;
  }

  // play a named effect at a THREE.Object3D (spatial) or non-spatially if none
  play(name, at = null, { volume = 1, rate = 1 } = {}) {
    if (!this.enabled || this.ctx.state !== "running") return;
    const buf = this.B[name];
    if (!buf) return;
    let src;
    if (at) {
      src = this.pool.find((p) => !p.isPlaying) || null;
      if (!src) {
        if (this.pool.length >= 12) return;
        src = new THREE.PositionalAudio(this.listener);
        src.setRefDistance(0.5);
        src.setRolloffFactor(0.8);
        this.pool.push(src);
      }
      if (src.parent !== at) at.add(src);
    } else {
      src = new THREE.Audio(this.listener);
    }
    src.setBuffer(buf);
    src.setVolume(volume);
    src.setPlaybackRate(rate * (0.94 + Math.random() * 0.12));
    src.play();
  }
}
