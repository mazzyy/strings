// Confetti for the endings: one small particle system, reused. Gold for a grand
// ceremony, every colour for slapstick, falling red petals for a tragedy.
import * as THREE from "three";

const PALETTES = {
  grace: [0xffd34a, 0xfff0a8, 0xe0b23a, 0xffffff],
  slapstick: [0xff5b7f, 0x7ff3ff, 0xffd34a, 0x8cff7a, 0xb9a2ff],
  drama: [0xc8102e, 0x8c1520, 0xff5a5a],
  smoke: [0x9a9aa0, 0x6a6a70, 0xc8c8cc],
};

export class Confetti {
  constructor(parent, count = 180) {
    this.n = count;
    const geo = new THREE.BufferGeometry();
    this.pos = new Float32Array(count * 3);
    this.col = new Float32Array(count * 3);
    this.vel = new Float32Array(count * 3);
    geo.setAttribute("position", new THREE.BufferAttribute(this.pos, 3));
    geo.setAttribute("color", new THREE.BufferAttribute(this.col, 3));
    this.points = new THREE.Points(geo, new THREE.PointsMaterial({ size: 0.013, vertexColors: true, transparent: true, depthWrite: false, toneMapped: false }));
    this.points.frustumCulled = false;
    this.points.visible = false;
    parent.add(this.points);
    this.t = 0;
    this.life = 0;
  }

  burst(kind = "grace") {
    const pal = (PALETTES[kind] || PALETTES.grace).map((c) => new THREE.Color(c));
    const petals = kind === "drama";
    for (let i = 0; i < this.n; i++) {
      const k = i * 3;
      this.pos[k] = (Math.random() - 0.5) * (petals ? 0.7 : 0.1);
      this.pos[k + 1] = petals ? 0.38 + Math.random() * 0.1 : 0.12;
      this.pos[k + 2] = (Math.random() - 0.5) * (petals ? 0.3 : 0.06);
      const a = Math.random() * Math.PI * 2, sp = petals ? 0.02 : 0.25 + Math.random() * 0.35;
      this.vel[k] = Math.cos(a) * sp * 0.8;
      this.vel[k + 1] = petals ? -0.03 : 0.6 + Math.random() * 0.5;
      this.vel[k + 2] = Math.sin(a) * sp * 0.5;
      const c = pal[i % pal.length];
      this.col[k] = c.r * 1.3; this.col[k + 1] = c.g * 1.3; this.col[k + 2] = c.b * 1.3;
    }
    this.points.geometry.attributes.color.needsUpdate = true;
    this.t = 0;
    this.life = petals ? 5 : 3.5;
    this.points.visible = true;
  }

  update(dt) {
    if (!this.points.visible) return;
    this.t += dt;
    if (this.t > this.life) { this.points.visible = false; return; }
    for (let i = 0; i < this.n; i++) {
      const k = i * 3;
      this.vel[k + 1] -= dt * 1.2;
      // air drag + flutter
      const drag = Math.exp(-dt * 2.2);
      this.vel[k] *= drag; this.vel[k + 2] *= drag;
      if (this.vel[k + 1] < -0.09) this.vel[k + 1] = -0.09;
      this.pos[k] += (this.vel[k] + Math.sin(this.t * 6 + i) * 0.02) * dt;
      this.pos[k + 1] = Math.max(0.002, this.pos[k + 1] + this.vel[k + 1] * dt);
      this.pos[k + 2] += this.vel[k + 2] * dt;
    }
    this.points.geometry.attributes.position.needsUpdate = true;
    this.points.material.opacity = Math.min(1, (this.life - this.t) / 0.8);
  }
}

// Magic sparkles: a swirl of gold and cyan motes spiralling up from a point (the
// storyteller's hands) toward another (where the storybook appears).
// a soft round dot, so motes of light are glowing specks rather than squares
let dotTex = null;
function softDot() {
  if (dotTex) return dotTex;
  const c = document.createElement("canvas"); c.width = c.height = 32;
  const g = c.getContext("2d"), gr = g.createRadialGradient(16, 16, 0, 16, 16, 16);
  gr.addColorStop(0, "rgba(255,255,255,1)"); gr.addColorStop(0.3, "rgba(255,255,255,0.8)"); gr.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = gr; g.fillRect(0, 0, 32, 32);
  return (dotTex = new THREE.CanvasTexture(c));
}

export class Sparkles {
  constructor(parent, count = 220) {
    this.n = count;
    const geo = new THREE.BufferGeometry();
    this.pos = new Float32Array(count * 3);
    this.col = new Float32Array(count * 3);
    this.seed = Array.from({ length: count }, () => [Math.random(), Math.random() * Math.PI * 2, 0.6 + Math.random() * 0.8]);
    geo.setAttribute("position", new THREE.BufferAttribute(this.pos, 3));
    geo.setAttribute("color", new THREE.BufferAttribute(this.col, 3));
    const pal = [new THREE.Color(0xffd34a), new THREE.Color(0x7ff3ff), new THREE.Color(0xfff2b0), new THREE.Color(0xb9a2ff)];
    for (let i = 0; i < count; i++) { const c = pal[i % 4]; this.col.set([c.r * 1.6, c.g * 1.6, c.b * 1.6], i * 3); }
    this.points = new THREE.Points(geo, new THREE.PointsMaterial({ size: 0.009, map: softDot(), vertexColors: true, transparent: true, depthWrite: false, toneMapped: false, blending: THREE.AdditiveBlending }));
    this.points.frustumCulled = false;
    this.points.visible = false;
    parent.add(this.points);
    this.t = 0; this.fade = 0;
  }
  start(from, to) { this.from = from; this.to = to; this.t = 0; this.fade = 1; this.stopping = false; this.points.visible = true; }
  stop() { this.stopping = true; }
  update(dt) {
    if (!this.points.visible) return;
    this.t += dt;
    if (this.stopping) { this.fade -= dt * 1.2; if (this.fade <= 0) { this.points.visible = false; return; } }
    const a = this.from(), b = this.to();
    for (let i = 0; i < this.n; i++) {
      const [ph, ang, sp] = this.seed[i];
      // each mote travels a helix from a to b, then starts over
      const k = (ph + this.t * 0.22 * sp) % 1;
      const r = 0.06 + Math.sin(k * Math.PI) * 0.12;
      const w = ang + this.t * 2.4 * sp + k * 9;
      const x = a.x + (b.x - a.x) * k + Math.cos(w) * r;
      const y = a.y + (b.y - a.y) * k + Math.sin(k * Math.PI) * 0.12 + Math.sin(w) * r * 0.4;
      const z = a.z + (b.z - a.z) * k + Math.sin(w) * r;
      this.pos.set([x, y, z], i * 3);
    }
    this.points.geometry.attributes.position.needsUpdate = true;
    this.points.material.opacity = Math.max(0, this.fade) * (0.75 + 0.25 * Math.sin(this.t * 6));
  }
}

// A soft additive glow sprite: the headset's stand-in for the desktop bloom pass
// (post-processing stalls in stereo WebXR; a sprite costs almost nothing).
let haloTex = null;
export function makeHalo(color, size, opacity = 0.6) {
  if (!haloTex) {
    const c = document.createElement("canvas"); c.width = c.height = 64;
    const g = c.getContext("2d"), gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    gr.addColorStop(0, "rgba(255,255,255,1)"); gr.addColorStop(0.25, "rgba(255,255,255,0.55)"); gr.addColorStop(1, "rgba(255,255,255,0)");
    g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
    haloTex = new THREE.CanvasTexture(c);
  }
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: haloTex, color, transparent: true, opacity, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }));
  s.scale.setScalar(size);
  s.userData.base = opacity;
  return s;
}

// Magic dust: motes of light drifting slowly around the storyteller robot, twinkling
// blue-white and gold (one draw call).
export class Dust {
  constructor(parent, n = 140, box = [0.5, 0.75, 0.22]) {
    this.n = n; this.box = box;
    const pos = new Float32Array(n * 3), col = new Float32Array(n * 3);
    this.seed = [];
    for (let i = 0; i < n; i++) {
      this.seed.push([Math.random() * 6.28, (Math.random() - 0.5) * 2 * box[0], -0.1 + Math.random() * box[1], (Math.random() - 0.6) * 2 * box[2], 0.3 + Math.random() * 0.7]);
      const gold = Math.random() < 0.3;
      col[i * 3] = gold ? 1.2 : 0.7; col[i * 3 + 1] = gold ? 0.95 : 0.9; col[i * 3 + 2] = gold ? 0.5 : 1.25;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    geo.setAttribute("color", new THREE.BufferAttribute(col, 3));
    this.points = new THREE.Points(geo, new THREE.PointsMaterial({ size: 0.0055, map: softDot(), vertexColors: true, transparent: true, opacity: 0.8, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false }));
    this.points.frustumCulled = false;
    parent.add(this.points);
    this.t = 0;
  }
  update(dt) {
    this.t += dt;
    const p = this.points.geometry.attributes.position.array, t = this.t;
    for (let i = 0; i < this.n; i++) {
      const [ph, x, y, z, sp] = this.seed[i];
      const yy = ((y + t * 0.02 * sp + 0.1) % this.box[1]) - 0.1; // rising slowly, wrapping round
      p[i * 3] = x + Math.sin(t * 0.3 * sp + ph) * 0.03;
      p[i * 3 + 1] = yy;
      p[i * 3 + 2] = z + Math.cos(t * 0.25 * sp + ph) * 0.02;
    }
    this.points.geometry.attributes.position.needsUpdate = true;
    this.points.material.opacity = 0.65 + Math.sin(t * 2.1) * 0.15;
  }
}
