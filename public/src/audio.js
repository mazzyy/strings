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
  // a taut string: Karplus-Strong pluck (pitch varies with playback rate)
  B.pluck = buffer(ctx, 0.7, (d, n) => {
    const period = Math.floor(SR / 392);
    const ring = new Float32Array(period).map(() => noise() * 0.8);
    for (let i = 0; i < n; i++) {
      const j = i % period;
      const next = ring[(j + 1) % period];
      ring[j] = (ring[j] + next) * 0.5 * 0.994;
      d[i] = ring[j];
    }
    lowpass(d, 0.5);
    normalize(d, 0.4);
  });
  // a string snapping: sharp crack, then a sagging twang
  B.snap = buffer(ctx, 0.6, (d, n) => {
    let ph = 0;
    for (let i = 0; i < n; i++) {
      const t = i / SR;
      ph += (2 * Math.PI * (700 * Math.exp(-t * 6) + 120)) / SR;
      d[i] = noise() * Math.exp(-t * 160) + Math.sin(ph) * Math.exp(-t * 7) * 0.6;
    }
    normalize(d, 0.6);
  });
  // picking up the wooden control bar
  B.clack = buffer(ctx, 0.09, (d, n) => {
    for (let i = 0; i < n; i++) {
      const t = i / SR;
      d[i] = noise() * Math.exp(-t * 140) * 0.5 + Math.sin(2 * Math.PI * 880 * t) * Math.exp(-t * 70) + Math.sin(2 * Math.PI * 1960 * t) * Math.exp(-t * 110) * 0.5;
    }
    normalize(d, 0.55);
  });
  // the tower alarm: a two-tone siren
  B.alarm = buffer(ctx, 1.1, (d, n) => {
    let ph = 0;
    for (let i = 0; i < n; i++) { const t = i / SR; ph += (2 * Math.PI * (Math.floor(t * 5) % 2 ? 660 : 880)) / SR; d[i] = (Math.sign(Math.sin(ph)) * 0.4 + Math.sin(ph) * 0.6) * Math.min(1, t * 30) * Math.exp(-t * 1.2); }
    lowpass(d, 0.35);
    normalize(d, 0.45);
  });
  // a crackling energy zap
  B.zap = buffer(ctx, 0.5, (d, n) => {
    let ph = 0;
    for (let i = 0; i < n; i++) { const t = i / SR; ph += (2 * Math.PI * (1400 * Math.exp(-t * 5) + 200)) / SR; d[i] = (Math.sin(ph) * 0.6 + noise() * 0.4 * Math.exp(-t * 8)) * Math.exp(-t * 4); }
    normalize(d, 0.5);
  });
  // a page turning: a soft paper swish with a little crackle at the end
  B.page = buffer(ctx, 0.55, (d, n) => {
    for (let i = 0; i < n; i++) {
      const t = i / SR, k = t / 0.55;
      const env = Math.min(1, t * 18) * Math.pow(1 - k, 1.6);
      d[i] = noise() * env * (0.55 + 0.45 * Math.sin(k * Math.PI * 3)) + (k > 0.7 && Math.random() < 0.004 ? noise() * 0.8 : 0);
    }
    lowpass(d, 0.22);
    highpass(d, 0.9);
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

// Real recordings (CC0, see CREDITS.md) for the everyday sounds; each name can have
// variants, picked at random. Anything not loaded (yet) falls back to the synthesised one.
const BASE = new URL("../audio/", import.meta.url).href;
const FILES = {
  step: ["step0", "step1", "step2", "step3", "step4", "step5", "step6", "step7", "step8", "step9"],
  clink: ["metalClick", "metalLatch"],
  applause: ["applause"],
  laugh: ["laugh"],
  cheer: ["cheer"],
  swish: ["cloth1", "cloth3"],
  clack: ["handleSmallLeather", "beltHandle1"],
  sword: ["drawKnife1", "drawKnife2", "knifeSlice", "knifeSlice2"],
  hit: ["chop"],
  creak: ["creak1", "creak2", "creak3"],
  bird: ["bird"],
  nightbird: ["bird_night"],
  frog: ["frog"],
  thud: ["dropLeather"],
};

// Character voices with feeling (recorded sounds: giggles, grunts, gasps...), listed
// in audio/voices/index.json as { character: { emotion: numberOfTakes } } and named
// audio/voices/<character>_<emotion>.mp3, <character>_<emotion>_2.mp3, ...
export const EMOTIONS = ["happy", "laugh", "excited", "greet", "surprised", "scared", "sad", "hurt", "sleepy", "angry"];
export class Sfx {
  constructor(listener) {
    this.listener = listener;
    this.ctx = listener.context;
    this.B = makeBuffers(this.ctx);
    this.B.music = musicBox(this.ctx);
    this.F = {};
    this.pool = [];
    this.enabled = true;
    const loader = new THREE.AudioLoader();
    this.loader = loader;
    for (const [name, list] of Object.entries(FILES)) {
      this.F[name] = [];
      for (const f of list) loader.load(`${BASE}${f}.mp3`, (buf) => this.F[name].push(buf), undefined, () => {});
    }
  }

  // play a named effect at a THREE.Object3D (spatial) or non-spatially if none
  async loadVoices() {
    let index = {};
    try { const r = await fetch(`${BASE}voices/index.json`, { cache: "no-cache" }); if (r.ok) index = await r.json(); } catch { /* none yet */ }
    for (const [who, emos] of Object.entries(index)) {
      for (const [emo, takes] of Object.entries(emos)) {
        const key = `${who}_${emo}`;
        this.F[key] = [];
        for (let i = 1; i <= takes; i++) this.loader.load(`${BASE}voices/${key}${i > 1 ? "_" + i : ""}.mp3`, (buf) => this.F[key].push(buf), undefined, () => {});
      }
    }
  }
  has(name) { return !!this.F[name]?.length; }

  play(name, at = null, { volume = 1, rate = 1 } = {}) {
    if (!this.enabled || this.ctx.state !== "running") return;
    const real = this.F[name];
    const buf = real && real.length ? real[Math.floor(Math.random() * real.length)] : this.B[name];
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
    src.setPlaybackRate((real && real.length ? Math.min(1.25, Math.max(0.8, rate)) : rate) * (0.94 + Math.random() * 0.12));
    src.play();
  }
}

// The soundscape: each chapter's music and ambience, looping and crossfading, ducked
// under speech. Files load the first time a chapter needs them.
const BEDS = {
  story:     { music: ["music_story", 0.16] },
  courtyard: { music: ["music_courtyard", 0.12], amb: ["amb_birds", 0.2] },
  theatre:   { music: ["music_courtyard", 0.12], amb: ["amb_birds", 0.15] },
  forest:    { music: ["music_story", 0.08], amb: ["amb_crickets", 0.3], extras: [["nightbird", 7, 13], ["frog", 9, 16]] },
  ship:      { music: ["music_ship", 0.14], amb: ["amb_sea", 0.08], extras: [["creak", 6, 11]] },
  bridge:    { music: ["music_story", 0.06], amb: ["amb_crickets", 0.26], extras: [["frog", 6, 12]] },
  tower:     { music: ["music_tower", 0.13], amb: ["amb_cave", 0.12] },
  cave:      { amb: ["amb_cave", 0.38] },
  sky:       { music: ["music_story", 0.1], amb: ["amb_birds", 0.12] },
  finale:    { music: ["music_finale", 0.22] },
};
export class Soundscape {
  constructor(listener, sfx) {
    this.listener = listener;
    this.sfx = sfx;
    this.loader = new THREE.AudioLoader();
    this.cache = new Map();
    this.tracks = []; // { audio, target, vol }
    this.extraT = 0;
    this.duck = 1;
    this.enabled = true;
  }
  _buffer(name) {
    if (!this.cache.has(name)) this.cache.set(name, this.loader.loadAsync(`${BASE}${name}.mp3`).catch(() => null));
    return this.cache.get(name);
  }
  set(bed) {
    if (this.bed === bed) return;
    this.bed = bed;
    const B = BEDS[bed] || {};
    for (const t of this.tracks) t.target = 0; // fade the old ones out
    for (const key of ["music", "amb"]) {
      if (!B[key]) continue;
      const [name, vol] = B[key];
      const existing = this.tracks.find((t) => t.name === name);
      if (existing) { existing.target = vol; continue; }
      const track = { name, vol: 0, target: vol, audio: null };
      this.tracks.push(track);
      this._buffer(name).then((buf) => {
        if (!buf || track.target === 0) return;
        const a = new THREE.Audio(this.listener);
        a.setBuffer(buf); a.setLoop(true); a.setVolume(0);
        if (this.listener.context.state === "running") a.play();
        track.audio = a;
      });
    }
    this.extras = B.extras || [];
    this.nextExtra = this.extras.map(([, a, b]) => a + Math.random() * (b - a));
  }
  // a moment of celebration: the music comes up for a few seconds
  swell(secs = 6) { this.swellT = secs; }
  update(dt, speaking) {
    // music dips while someone is talking, and rises for a swell
    this.swellT = Math.max(0, (this.swellT || 0) - dt);
    this.duck += ((speaking ? 0.55 : this.swellT > 0 ? 1.7 : 1) - this.duck) * Math.min(1, dt * 3);
    for (let i = this.tracks.length - 1; i >= 0; i--) {
      const t = this.tracks[i];
      t.vol += (t.target - t.vol) * Math.min(1, dt * 0.8);
      if (t.audio) {
        if (!t.audio.isPlaying && this.listener.context.state === "running" && t.target > 0) t.audio.play();
        t.audio.setVolume(this.enabled ? t.vol * (t.name.startsWith("music") ? this.duck : 1) : 0);
      }
      if (t.target === 0 && t.vol < 0.003) { if (t.audio?.isPlaying) t.audio.stop(); this.tracks.splice(i, 1); }
    }
    // the odd owl call, frog or creaking timber
    if (!this.extras?.length) return;
    this.extraT += dt;
    this.extras.forEach(([name, a, b], i) => {
      if (this.extraT > this.nextExtra[i]) { this.nextExtra[i] = this.extraT + a + Math.random() * (b - a); this.sfx.play(name, null, { volume: 0.25 + Math.random() * 0.15 }); }
    });
  }
}
