// Confetti for the endings: one small particle system, reused. Gold for a grand
// ceremony, every colour for slapstick, falling red petals for a tragedy.
import * as THREE from "three";

const PALETTES = {
  grace: [0xffd34a, 0xfff0a8, 0xe0b23a, 0xffffff],
  slapstick: [0xff5b7f, 0x7ff3ff, 0xffd34a, 0x8cff7a, 0xb9a2ff],
  drama: [0xc8102e, 0x8c1520, 0xff5a5a],
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
