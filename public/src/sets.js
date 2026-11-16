// Stage sets ("maps") for each chapter of the story: a painted backdrop across
// the back of the stage, a few 3D set pieces at the edges (never in the
// puppets' way), and the lighting that goes with them. Everything is drawn in
// code, so it's ours to use, and each set is merged into a few draw calls.
import * as THREE from "three";
import { mergeStatic } from "./perf.js";
import { makeHalo } from "./fx.js";
import { LW, LH, hasBackdrop, skyLayer, foreLayer, driftLayer, paintBackdrop } from "./backdrops.js";

const W = 0.79, H = 0.29, BACK_Z = -0.188;

function canvas(w, h, paint) {
  const c = document.createElement("canvas");
  c.width = w; c.height = h;
  paint(c.getContext("2d"), w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}
const texOf = (c) => { const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t; };
// backdrop coordinates (the painters' 1024 x 376 space) to stage metres
const bx = (x) => (x / LW - 0.5) * W, by = (y) => (1 - y / LH) * H;
// a painted layer that takes the stage light like the backdrop does (and glows a little by itself)
const painted = (tex, glow = 0.32, transparent = true) => new THREE.MeshStandardMaterial({ map: tex, roughness: 1, metalness: 0, emissive: 0xffffff, emissiveMap: tex, emissiveIntensity: glow, transparent, depthWrite: !transparent });
let dotTex = null;
const softDot = () => dotTex || (dotTex = canvas(32, 32, (g) => { const gr = g.createRadialGradient(16, 16, 0, 16, 16, 16); gr.addColorStop(0, "rgba(255,255,255,1)"); gr.addColorStop(0.3, "rgba(255,255,255,0.7)"); gr.addColorStop(1, "rgba(255,255,255,0)"); g.fillStyle = gr; g.fillRect(0, 0, 32, 32); }));
// points of light that twinkle, each on its own beat: stars, glints on crystal and gold
function twinkles(group, anims, spots, { size = 0.005, z = BACK_Z + 0.003, order = -2, speed = 1 } = {}) {
  const n = spots.length, pos = new Float32Array(n * 3), col = new Float32Array(n * 3);
  const base = spots.map(([, , c]) => new THREE.Color(c ?? 0xffffff)), ph = spots.map(() => [Math.random() * 6.28, 0.6 + Math.random() * 1.8]);
  spots.forEach(([x, y], i) => pos.set([x, y, z], i * 3));
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  geo.setAttribute("color", new THREE.BufferAttribute(col, 3));
  const pts = new THREE.Points(geo, new THREE.PointsMaterial({ size, map: softDot(), vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false }));
  pts.frustumCulled = false; pts.renderOrder = order;
  group.add(pts);
  anims.push((t) => { for (let i = 0; i < n; i++) { const k = Math.max(0, Math.sin(t * ph[i][1] * speed + ph[i][0])) ** 3 * 1.5 + 0.12; col[i * 3] = base[i].r * k; col[i * 3 + 1] = base[i].g * k; col[i * 3 + 2] = base[i].b * k; } geo.attributes.color.needsUpdate = true; });
  return pts;
}
const scatter = (n, x0, x1, y0, y1, colors = [0xffffff], seed = 1) => { const r = rnd(seed); return Array.from({ length: n }, () => [bx(x0 + r() * (x1 - x0)), by(y0 + r() * (y1 - y0)), colors[Math.floor(r() * colors.length)]]); };
const rnd = (seed) => () => ((seed = (seed * 16807) % 2147483647) / 2147483647);

// ---- set pieces ------------------------------------------------------------------
function piece(group, geo, mat, x, y, z, ry = 0) {
  const m = new THREE.Mesh(geo, mat);
  m.position.set(x, y, z);
  m.rotation.y = ry;
  m.castShadow = true;
  m.receiveShadow = true;
  group.add(m);
  return m;
}
const std = (p) => new THREE.MeshStandardMaterial(p);

const PIECES = {
  courtyard(g, anims) {
    const flags = [];
    const pole = std({ color: 0x6a4a2c, roughness: 0.7 }), flagA = std({ color: 0x24497f, roughness: 0.8, side: THREE.DoubleSide }), flagB = std({ color: 0xd8ac4f, roughness: 0.6, side: THREE.DoubleSide });
    const leaf = std({ color: 0x3f6f2a, roughness: 0.9 }), pot = std({ color: 0x8a5a3a, roughness: 0.8 });
    for (const [x, mat] of [[-0.37, flagA], [0.37, flagB]]) {
      piece(g, new THREE.CylinderGeometry(0.003, 0.003, 0.25, 8), pole, x, 0.125, -0.16);
      const flag = piece(g, new THREE.PlaneGeometry(0.06, 0.09, 6, 1), mat, x + 0.032 * Math.sign(-x), 0.2, -0.16);
      const p = flag.geometry.attributes.position; for (let i = 0; i < p.count; i++) p.setZ(i, Math.sin(p.getX(i) * 60) * 0.004); flag.geometry.computeVertexNormals();
      flags.push({ p, pole: 0.03 * Math.sign(x), ph: x * 9 });
      flag.castShadow = false;
      flags[flags.length - 1].mesh = flag;
    }
    // the flags fly: a ripple runs out from the pole, wider towards the free end
    anims.push((t) => { for (const f of flags) { for (let i = 0; i < f.p.count; i++) { const x = f.p.getX(i), d = Math.abs(x - f.pole) / 0.06; f.p.setZ(i, Math.sin(x * 70 - t * 6 * Math.sign(-f.pole) + f.ph) * 0.007 * d); } f.p.needsUpdate = true; } });
    for (const x of [-0.385, 0.385]) {
      piece(g, new THREE.CylinderGeometry(0.018, 0.014, 0.03, 12), pot, x, 0.015, -0.06);
      piece(g, new THREE.SphereGeometry(0.03, 12, 10), leaf, x, 0.055, -0.06);
    }
    return flags.map((f) => f.mesh);
  },
  forest(g, anims) {
    const bark = std({ color: 0x5a3b22, roughness: 0.9 }), pine = std({ color: 0x2f5a32, roughness: 0.85 }), pine2 = std({ color: 0x3d6e3a, roughness: 0.85 });
    const stem = std({ color: 0xefe6d0, roughness: 0.8 }), cap = std({ color: 0xc8322a, roughness: 0.6 }), dot = std({ color: 0xffffff, roughness: 0.6 });
    for (const [x, z, s] of [[-0.35, -0.15, 1], [0.34, -0.16, 1.15], [-0.39, 0.03, 0.75], [0.39, -0.02, 0.7]]) {
      piece(g, new THREE.CylinderGeometry(0.008 * s, 0.012 * s, 0.09 * s, 8), bark, x, 0.045 * s, z);
      for (let k = 0; k < 3; k++) piece(g, new THREE.ConeGeometry((0.06 - k * 0.013) * s, 0.08 * s, 10), k % 2 ? pine2 : pine, x, (0.09 + k * 0.045) * s, z);
    }
    for (const [x, z, s] of [[0.36, 0.06, 1], [-0.3, -0.1, 0.8], [0.27, -0.14, 0.7]]) {
      piece(g, new THREE.CylinderGeometry(0.004 * s, 0.005 * s, 0.022 * s, 8), stem, x, 0.011 * s, z);
      piece(g, new THREE.SphereGeometry(0.013 * s, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2), cap, x, 0.02 * s, z);
      for (let k = 0; k < 4; k++) piece(g, new THREE.SphereGeometry(0.0022 * s, 6, 4), dot, x + Math.cos(k * 1.6) * 0.007 * s, 0.03 * s, z + Math.sin(k * 1.6) * 0.007 * s);
    }
    // glowing toadstools: little pools of blue light in the dark wood
    const glowCap = std({ color: 0x7ad8ff, emissive: 0x2a9cff, emissiveIntensity: 1.3, roughness: 0.5 }), glowStem = std({ color: 0xcfe8f0, emissive: 0x2a6a90, emissiveIntensity: 0.4, roughness: 0.8 });
    for (const [x, z, s] of [[-0.4, 0.1, 0.8], [-0.36, 0.14, 0.55], [0.4, 0.12, 0.9], [0.31, 0.15, 0.6], [-0.22, -0.16, 0.7], [0.14, -0.17, 0.65], [0.05, -0.16, 0.5]]) {
      piece(g, new THREE.CylinderGeometry(0.0035 * s, 0.0045 * s, 0.02 * s, 8), glowStem, x, 0.01 * s, z);
      piece(g, new THREE.SphereGeometry(0.011 * s, 12, 7, 0, Math.PI * 2, 0, Math.PI / 2), glowCap, x, 0.019 * s, z);
    }
    // fireflies drifting over the stage
    const n = 36, geo = new THREE.BufferGeometry(), pos = new Float32Array(n * 3), seeds = [];
    for (let i = 0; i < n; i++) seeds.push([Math.random() * 6, (Math.random() - 0.5) * 0.7, 0.05 + Math.random() * 0.2, (Math.random() - 0.5) * 0.3]);
    geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    const flies = new THREE.Points(geo, new THREE.PointsMaterial({ color: 0xfff09a, size: 0.006, transparent: true, opacity: 0.9, depthWrite: false, toneMapped: false }));
    flies.frustumCulled = false;
    g.add(flies);
    anims.push((t) => { seeds.forEach(([p, x, y, z], i) => { pos[i * 3] = x + Math.sin(t * 0.4 + p) * 0.04; pos[i * 3 + 1] = y + Math.sin(t * 0.9 + p * 2) * 0.02; pos[i * 3 + 2] = z + Math.cos(t * 0.5 + p) * 0.03; }); geo.attributes.position.needsUpdate = true; flies.material.opacity = 0.6 + 0.35 * Math.sin(t * 3); });
    twinkles(g, anims, scatter(22, 260, 1000, 0, 130, [0xffffff, 0xcfe8ff], 4), { size: 0.004 });
    return [flies];
  },
  ship(g, anims) {
    // theatre waves: three painted rows behind the rail, sliding past each other and bobbing
    const waveTex = (c0, c1) => { const t = canvas(512, 96, (c, w, h) => {
      const edge = (x) => 30 - 20 * Math.abs(Math.sin((x / w) * Math.PI * 4));
      const gr = c.createLinearGradient(0, 8, 0, h); gr.addColorStop(0, c0); gr.addColorStop(1, c1);
      c.fillStyle = gr; c.beginPath(); c.moveTo(0, h); for (let x = 0; x <= w; x += 2) c.lineTo(x, edge(x)); c.lineTo(w, h); c.fill();
      c.strokeStyle = "rgba(255,255,255,0.9)"; c.lineWidth = 4; c.lineJoin = "round"; c.beginPath(); for (let x = 0; x <= w; x += 2) c.lineTo(x, edge(x) + 2); c.stroke();
      c.strokeStyle = "rgba(255,255,255,0.3)"; c.lineWidth = 2; for (const y of [50, 70]) { c.beginPath(); for (let x = 0; x <= w; x += 4) c.lineTo(x, y + Math.sin((x / w) * Math.PI * 8 + y) * 4); c.stroke(); }
    }); t.wrapS = THREE.RepeatWrapping; t.repeat.x = 2.5; return t; };
    const waves = [["#62b4e0", "#2f7cb6", 0.105, 0.006, 0.012], ["#4a9ed2", "#1f649e", 0.08, 0.009, -0.02], ["#3486c0", "#124a78", 0.058, 0.012, 0.03]].map(([c0, c1, h, dz, speed], i) => {
      const tex = waveTex(c0, c1);
      const m = new THREE.Mesh(new THREE.PlaneGeometry(W, h), painted(tex, 0.32));
      m.position.set(0, h / 2, BACK_Z + dz);
      g.add(m);
      anims.push((t) => { tex.offset.x = (t * speed) % 1; m.position.y = h / 2 - 0.004 + Math.sin(t * 1.1 + i * 1.9) * 0.005; });
      return m;
    });
    const wood = std({ color: 0x7a5432, roughness: 0.7 }), dark = std({ color: 0x4a3020, roughness: 0.75 }), sail = std({ color: 0xffffff, roughness: 0.9, side: THREE.DoubleSide, map: canvas(128, 128, (g, w, h) => { g.fillStyle = "#f2ead8"; g.fillRect(0, 0, w, h); g.fillStyle = "#b0202a"; g.fillRect(0, 30, w, 16); g.fillRect(0, 82, w, 16); g.strokeStyle = "rgba(120,100,70,0.35)"; g.lineWidth = 2; for (let x = 16; x < w; x += 16) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, h); g.stroke(); } }) }), rope = std({ color: 0xc9b48a, roughness: 0.9 }), black = std({ color: 0x151515, roughness: 0.8, side: THREE.DoubleSide });
    for (let x = -0.36; x <= 0.37; x += 0.08) piece(g, new THREE.CylinderGeometry(0.003, 0.003, 0.05, 6), wood, x, 0.025, -0.172);
    piece(g, new THREE.BoxGeometry(0.76, 0.008, 0.012), dark, 0, 0.052, -0.172);
    piece(g, new THREE.CylinderGeometry(0.007, 0.009, 0.29, 10), dark, -0.3, 0.145, -0.15);
    piece(g, new THREE.CylinderGeometry(0.003, 0.003, 0.17, 8), dark, -0.3, 0.25, -0.15).rotation.z = Math.PI / 2;
    const s = piece(g, new THREE.PlaneGeometry(0.16, 0.13, 8, 6), sail, -0.3, 0.18, -0.142);
    const p = s.geometry.attributes.position; for (let i = 0; i < p.count; i++) { const x = p.getX(i) / 0.08, y = p.getY(i) / 0.065; p.setZ(i, 0.022 * (1 - x * x) * (0.6 + 0.4 * (1 - y * y))); } s.geometry.computeVertexNormals();
    const flag = piece(g, new THREE.PlaneGeometry(0.04, 0.026), black, -0.28, 0.29, -0.15);
    flag.rotation.y = 0.2;
    // barrels and a coil of rope on the right
    const barrelG = new THREE.LatheGeometry(Array.from({ length: 9 }, (_, i) => new THREE.Vector2(0.016 + Math.sin((i / 8) * Math.PI) * 0.004, (i / 8) * 0.042)), 14);
    piece(g, barrelG, wood, 0.36, 0, -0.1); piece(g, barrelG, wood, 0.39, 0, -0.045);
    piece(g, new THREE.TorusGeometry(0.014, 0.004, 8, 20), rope, 0.35, 0.004, 0.05).rotation.x = Math.PI / 2;
    return waves;
  },
  bridge(g, anims) {
    twinkles(g, anims, scatter(50, 0, 1024, 0, 150, [0xffffff, 0xcfd8ff, 0xffe8c0], 5), { size: 0.0045 });
    const blocks = canvas(256, 256, (c, w, h) => {
      c.fillStyle = "#8a8ea4"; c.fillRect(0, 0, w, h);
      const r = rnd(13);
      for (let row = 0; row < 8; row++) for (let x = row % 2 ? -32 : 0; x < w; x += 64) { c.fillStyle = `rgba(${r() < 0.5 ? "255,255,255" : "20,20,50"},${0.05 + r() * 0.16})`; c.fillRect(x + 2, row * 32 + 2, 60, 28); c.fillStyle = "rgba(255,255,255,0.12)"; c.fillRect(x + 2, row * 32 + 2, 60, 3); }
      c.strokeStyle = "rgba(20,20,44,0.55)"; c.lineWidth = 3;
      for (let row = 0; row < 8; row++) { c.beginPath(); c.moveTo(0, row * 32); c.lineTo(w, row * 32); c.stroke(); for (let x = row % 2 ? -32 : 0; x < w; x += 64) { c.beginPath(); c.moveTo(x, row * 32); c.lineTo(x, row * 32 + 32); c.stroke(); } }
      for (let i = 0; i < 40; i++) { c.fillStyle = `rgba(70,110,80,${r() * 0.3})`; c.beginPath(); c.ellipse(r() * w, r() * h, 6 + r() * 14, 4 + r() * 8, r() * 3, 0, Math.PI * 2); c.fill(); }
    });
    blocks.wrapS = blocks.wrapT = THREE.RepeatWrapping; blocks.repeat.set(7, 7);
    const stone = std({ color: 0xaab0d0, roughness: 0.9, map: blocks }), stone2 = std({ color: 0x5d6280, roughness: 0.95 }), iron = std({ color: 0x2a2a2e, metalness: 0.6, roughness: 0.5 });
    const lampM = new THREE.MeshStandardMaterial({ color: 0xffe0a0, emissive: 0xffb050, emissiveIntensity: 2, toneMapped: false });
    // an arched stone bridge across the back
    const arch = new THREE.Shape();
    arch.moveTo(-0.32, 0); arch.lineTo(-0.32, 0.12); arch.lineTo(0.32, 0.12); arch.lineTo(0.32, 0); arch.lineTo(0.1, 0);
    arch.absarc(0, 0, 0.1, 0, Math.PI, false); arch.lineTo(-0.32, 0);
    const archG = new THREE.ExtrudeGeometry(arch, { depth: 0.04, bevelEnabled: false });
    piece(g, archG, stone, 0, 0, -0.185);
    for (let x = -0.3; x <= 0.31; x += 0.05) piece(g, new THREE.BoxGeometry(0.02, 0.018, 0.04), stone2, x, 0.129, -0.165);
    for (const [x, z, s] of [[-0.37, 0.02, 1], [0.38, -0.08, 1.3], [-0.33, -0.12, 0.8]]) piece(g, new THREE.DodecahedronGeometry(0.018 * s, 0), stone2, x, 0.012 * s, z);
    piece(g, new THREE.CylinderGeometry(0.003, 0.004, 0.16, 8), iron, 0.36, 0.08, 0.02);
    piece(g, new THREE.BoxGeometry(0.018, 0.022, 0.018), lampM, 0.36, 0.17, 0.02);
    piece(g, new THREE.ConeGeometry(0.016, 0.012, 4), iron, 0.36, 0.187, 0.02).rotation.y = Math.PI / 4;
  },
  cave(g, anims) {
    const r = rnd(17);
    const rock = new THREE.MeshStandardMaterial({ color: 0x40335e, roughness: 0.95, flatShading: true }), rock2 = new THREE.MeshStandardMaterial({ color: 0x2c2244, roughness: 0.95, flatShading: true });
    const gem = (color, emissive) => new THREE.MeshStandardMaterial({ color, emissive, emissiveIntensity: 0.9, roughness: 0.12, metalness: 0.15, flatShading: true });
    const gems = { cyan: gem(0xaef6ff, 0x1fb8f0), violet: gem(0xdcc4ff, 0x7a3cf0), pink: gem(0xffc8ec, 0xf03ca0), mint: gem(0xc0ffe8, 0x1fc890) };
    const hues = { cyan: 0x6fe6ff, violet: 0xb48cff, pink: 0xff8cd8, mint: 0x7affd0 };
    const chestM = std({ color: 0x6a4425, roughness: 0.7 }), gold = std({ color: 0xe8b84a, metalness: 1, roughness: 0.28 });
    // boulders and stalagmites at the wings, stalactites above
    for (const [x, z, s] of [[-0.4, -0.13, 1.5], [-0.33, -0.165, 1.1], [0.4, -0.12, 1.6], [0.31, -0.17, 1.0], [-0.4, 0.02, 0.8], [0.405, 0.03, 0.9]]) {
      const m = piece(g, new THREE.DodecahedronGeometry(0.022 * s, 0), s > 1.2 ? rock2 : rock, x, 0.012 * s, z, r() * 3);
      m.scale.set(1, 0.8 + r() * 0.5, 1);
    }
    for (const [x, z, h] of [[-0.385, -0.085, 0.085], [0.385, -0.08, 0.1], [-0.345, 0.045, 0.045], [0.365, 0.07, 0.05], [0.21, -0.172, 0.05], [-0.16, -0.172, 0.04]]) piece(g, new THREE.ConeGeometry(0.016 + h * 0.08, h, 6), x > 0 ? rock : rock2, x, h / 2, z, r() * 3);
    for (const [x, h] of [[-0.3, 0.07], [-0.14, 0.04], [0.06, 0.06], [0.24, 0.05], [0.36, 0.075], [-0.39, 0.06]]) { const c = piece(g, new THREE.ConeGeometry(0.011 + h * 0.06, h, 6), rock2, x, 0.285 - h / 2, -0.165, r() * 3); c.rotation.x = Math.PI; c.castShadow = false; }
    // crystal clusters: six-sided shards fanning out from a base, each with its own glow
    const shard = (h, rad) => new THREE.LatheGeometry([new THREE.Vector2(0.0001, 0), new THREE.Vector2(rad, 0), new THREE.Vector2(rad * 0.86, h * 0.72), new THREE.Vector2(0.0001, h)], 6);
    const halos = [];
    const cluster = (x, z, size, kind, n) => {
      for (let i = 0; i < n; i++) {
        const t = n === 1 ? 0 : i / (n - 1) - 0.5, h = size * (0.5 + (1 - Math.abs(t) * 1.6) * 0.5 + r() * 0.12);
        const m = piece(g, shard(h, h * 0.13), gems[kind], x + t * size * 0.5, 0, z + (r() - 0.5) * size * 0.3, r() * 3);
        m.rotation.z = -t * 1.0 + (r() - 0.5) * 0.15; m.rotation.x = (r() - 0.5) * 0.5;
        m.castShadow = false;
      }
      const halo = makeHalo(hues[kind], size * 2.4, 0.3);
      halo.position.set(x, size * 0.5, z + 0.004);
      g.add(halo); halos.push([halo, r() * 6]);
    };
    cluster(-0.352, -0.045, 0.125, "cyan", 6);
    cluster(0.35, -0.03, 0.135, "violet", 6);
    cluster(-0.285, -0.15, 0.08, "pink", 5);
    cluster(0.27, -0.155, 0.08, "mint", 5);
    cluster(-0.4, 0.105, 0.055, "violet", 3);
    cluster(0.405, 0.115, 0.055, "cyan", 3);
    cluster(0.1, -0.172, 0.04, "pink", 3);
    // the dragon's chest, spilling over
    piece(g, new THREE.BoxGeometry(0.05, 0.03, 0.032), chestM, -0.2, 0.015, -0.135, 0.3);
    const lid = piece(g, new THREE.CylinderGeometry(0.016, 0.016, 0.05, 12, 1, false, 0, Math.PI), chestM, -0.2, 0.03, -0.135, 0.3); lid.rotation.z = Math.PI / 2;
    piece(g, new THREE.BoxGeometry(0.052, 0.004, 0.034), gold, -0.2, 0.03, -0.135, 0.3);
    const heap = piece(g, new THREE.SphereGeometry(0.03, 12, 8), gold, -0.15, 0.0, -0.13); heap.scale.set(1.2, 0.4, 0.9);
    for (let i = 0; i < 14; i++) { const c = piece(g, new THREE.CylinderGeometry(0.0045, 0.0045, 0.0012, 10), gold, -0.15 + (r() - 0.5) * 0.09, 0.002 + r() * 0.012, -0.125 + (r() - 0.5) * 0.05); c.rotation.set(r() * 0.8, r() * 3, r() * 0.8); c.castShadow = false; }
    // glints on the painted hoard and the painted crystals
    twinkles(g, anims, [...scatter(16, 410, 620, 256, 322, [0xfff2b0, 0xffffff, 0xffd060], 3), ...scatter(10, 60, 220, 190, 330, [0xbff6ff, 0xffffff], 6), ...scatter(10, 800, 960, 180, 330, [0xe0c8ff, 0xffffff], 8), ...scatter(8, 260, 760, 10, 60, [0xbff6ff, 0xe0c8ff], 9)], { size: 0.007, z: BACK_Z + 0.007, order: 0, speed: 1.4 });
    // motes of light drifting up through the cave
    const n = 44, geo = new THREE.BufferGeometry(), pos = new Float32Array(n * 3), col = new Float32Array(n * 3), seeds = [];
    for (let i = 0; i < n; i++) { seeds.push([r() * 6.28, (r() - 0.5) * 0.76, r() * 0.27, -0.17 + r() * 0.3, 0.4 + r() * 0.8]); const c = new THREE.Color([0x8fe8ff, 0xc8a0ff, 0xffffff][i % 3]); col.set([c.r, c.g, c.b], i * 3); }
    geo.setAttribute("position", new THREE.BufferAttribute(pos, 3)); geo.setAttribute("color", new THREE.BufferAttribute(col, 3));
    const motes = new THREE.Points(geo, new THREE.PointsMaterial({ size: 0.0055, map: softDot(), vertexColors: true, transparent: true, opacity: 0.8, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false }));
    motes.frustumCulled = false; g.add(motes);
    anims.push((t) => {
      seeds.forEach(([ph, x, y, z, sp], i) => { pos[i * 3] = x + Math.sin(t * 0.35 * sp + ph) * 0.03; pos[i * 3 + 1] = (y + t * 0.012 * sp) % 0.27 + 0.01; pos[i * 3 + 2] = z + Math.cos(t * 0.3 * sp + ph) * 0.02; });
      geo.attributes.position.needsUpdate = true;
      // the crystals breathe, each colour on its own slow beat
      Object.values(gems).forEach((m, i) => { m.emissiveIntensity = 0.85 + Math.sin(t * (1.1 + i * 0.27) + i * 1.7) * 0.35; });
      for (const [h, ph] of halos) h.material.opacity = 0.24 + Math.sin(t * 1.3 + ph) * 0.1;
    });
  },
};

PIECES.sky = (g, anims) => {
  // a floor of soft clouds over the stage boards, and puffs drifting past (it feels like flying)
  const cloud = new THREE.MeshStandardMaterial({ color: 0xe4e8ff, roughness: 1, emissive: 0x30365a, emissiveIntensity: 0.4 });
  const r = Math.random;
  for (let i = 0; i < 26; i++) {
    const m = piece(g, new THREE.SphereGeometry(0.04 + r() * 0.03, 10, 8), cloud, -0.4 + (i / 25) * 0.8, 0.0, -0.18 + r() * 0.36);
    m.scale.y = 0.35; m.castShadow = false;
  }
  const drift = new THREE.Group();
  const puffs = [];
  for (let i = 0; i < 6; i++) {
    const p = new THREE.Group();
    for (let k = 0; k < 4; k++) { const b = new THREE.Mesh(new THREE.SphereGeometry(0.022 + k % 2 * 0.008, 10, 8), cloud); b.position.set(k * 0.022, (k % 2) * 0.008, 0); p.add(b); }
    p.position.set(-0.45 + i * 0.16, 0.12 + (i % 3) * 0.07, -0.14 + (i % 2) * 0.05);
    mergeStatic(p);
    drift.add(p);
    puffs.push({ p, speed: 0.04 + (i % 3) * 0.015 });
  }
  g.add(drift);
  anims.push((t, dt) => { for (const q of puffs) { q.p.position.x -= q.speed * (dt || 0.016) * (g.userData.flying ? 3 : 1); if (q.p.position.x < -0.5) q.p.position.x = 0.45; } });
  g.userData.refs = { setFlying: (on) => { g.userData.flying = on; } };
  twinkles(g, anims, scatter(70, 0, 1024, 0, 250, [0xffffff, 0xcfd8ff, 0xffe8c0, 0xd8c8ff], 12), { size: 0.005 });
  // now and then, a shooting star
  const streak = new THREE.Mesh(new THREE.PlaneGeometry(0.1, 0.005), new THREE.MeshBasicMaterial({ map: canvas(128, 8, (c, w, h) => { const gr = c.createLinearGradient(0, 0, w, 0); gr.addColorStop(0, "rgba(255,255,255,0)"); gr.addColorStop(0.85, "rgba(220,235,255,0.9)"); gr.addColorStop(1, "rgba(255,255,255,1)"); c.fillStyle = gr; c.fillRect(0, 2, w, 4); }), transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }));
  streak.renderOrder = -2; streak.rotation.z = -0.36;
  g.add(streak);
  let wait = 4, st = -1, sx = 0, sy = 0;
  anims.push((t, dt = 0.016) => {
    if (st < 0) { wait -= dt; if (wait <= 0) { wait = 5 + Math.random() * 7; st = 0; sx = -0.34 + Math.random() * 0.4; sy = 0.2 + Math.random() * 0.07; } return; }
    st += dt;
    const k = st / 0.7;
    streak.position.set(sx + k * 0.3, sy - k * 0.11, BACK_Z + 0.003);
    streak.material.opacity = Math.sin(Math.min(1, k) * Math.PI);
    if (k >= 1) { st = -1; streak.material.opacity = 0; }
  });
  return [drift, streak];
};

PIECES.tower = (g, anims) => {
  const iron = std({ color: 0x3a3e46, metalness: 0.8, roughness: 0.4 }), brass = std({ color: 0xb8893a, metalness: 1, roughness: 0.35 }), stone = std({ color: 0x6a6460, roughness: 0.9 });
  // the cage, with Princess Juniper inside (right, upstage)
  const cage = new THREE.Vector3(0.3, 0, -0.12);
  piece(g, new THREE.CylinderGeometry(0.06, 0.064, 0.012, 20), iron, cage.x, 0.006, cage.z);
  piece(g, new THREE.CylinderGeometry(0.062, 0.062, 0.01, 20), iron, cage.x, 0.255, cage.z);
  piece(g, new THREE.ConeGeometry(0.064, 0.03, 20), brass, cage.x, 0.275, cage.z);
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2;
    if (Math.cos(a) > 0.55) continue; // the door's gap faces the audience-left
    piece(g, new THREE.CylinderGeometry(0.0018, 0.0018, 0.245, 6), iron, cage.x + Math.sin(a) * 0.058, 0.13, cage.z + Math.cos(a) * 0.058).castShadow = false;
  }
  // the door: three bars on a hinge, swung open when unlocked
  const door = new THREE.Group();
  door.position.set(cage.x + Math.sin(-0.99) * 0.058, 0, cage.z + Math.cos(-0.99) * 0.058);
  for (let i = 0; i < 5; i++) {
    const a = -0.99 + (i + 1) * 0.33;
    const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.0019, 0.0019, 0.245, 6), brass);
    bar.position.set(cage.x + Math.sin(a) * 0.058 - door.position.x, 0.13, cage.z + Math.cos(a) * 0.058 - door.position.z);
    door.add(bar);
  }
  const lock = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.016, 0.008), brass);
  lock.position.set(cage.x + Math.sin(0.82) * 0.06 - door.position.x, 0.12, cage.z + Math.cos(0.82) * 0.06 - door.position.z);
  door.add(lock);
  g.add(door);
  // the key's pedestal (right, downstage) and a gear on the floor
  const pedestal = new THREE.Vector3(0.34, 0, 0.03);
  piece(g, new THREE.CylinderGeometry(0.016, 0.02, 0.03, 12), stone, pedestal.x, 0.015, pedestal.z);
  piece(g, new THREE.CylinderGeometry(0.02, 0.02, 0.004, 12), brass, pedestal.x, 0.032, pedestal.z);
  const gear = new THREE.Group();
  gear.add(new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.006, 16), brass));
  for (let i = 0; i < 10; i++) { const t = new THREE.Mesh(new THREE.BoxGeometry(0.01, 0.006, 0.008), brass); const a = (i / 10) * Math.PI * 2; t.position.set(Math.cos(a) * 0.033, 0, Math.sin(a) * 0.033); t.rotation.y = -a; gear.add(t); }
  gear.position.set(-0.36, 0.003, -0.1);
  g.add(gear);
  mergeStatic(gear);
  anims.push((t) => { gear.rotation.y = t * 0.5; });
  let open = 0, target = 0;
  anims.push((t, dt) => { open += (target - open) * Math.min(1, (dt || 0.016) * 3); door.rotation.y = -open * 1.9; });
  // the storm at the windows: rain streaming down, and now and then lightning
  const rainTex = canvas(128, 256, (c, w, h) => { c.strokeStyle = "rgba(200,212,255,0.5)"; c.lineWidth = 1.3; for (let i = 0; i < 70; i++) { const x = Math.random() * w, y = Math.random() * h, l = 14 + Math.random() * 14; for (const oy of [-h, 0, h]) { c.beginPath(); c.moveTo(x, y + oy); c.lineTo(x - l * 0.22, y + oy + l); c.stroke(); } } });
  rainTex.wrapS = rainTex.wrapT = THREE.RepeatWrapping; rainTex.repeat.set(7, 1.6);
  const rain = new THREE.Mesh(new THREE.PlaneGeometry(W, H), new THREE.MeshBasicMaterial({ map: rainTex, transparent: true, opacity: 0.55, depthWrite: false, toneMapped: false }));
  rain.position.set(0, H / 2, BACK_Z + 0.002); rain.renderOrder = -3;
  const flashTex = canvas(512, 188, (c, w, h) => {
    c.fillStyle = "rgba(170,180,255,0.5)"; c.fillRect(0, 0, w, h);
    const bolt = (x, y, len, wid) => { c.strokeStyle = "#ffffff"; c.lineWidth = wid; c.lineJoin = "miter"; c.shadowColor = "#b8c4ff"; c.shadowBlur = 14; c.beginPath(); c.moveTo(x, y); let px = x, py = y; while (py < y + len) { px += (Math.random() - 0.5) * 26; py += 10 + Math.random() * 14; c.lineTo(px, py); if (wid > 2 && Math.random() < 0.3) { c.stroke(); bolt(px, py, len * 0.3, 1.5); c.lineWidth = wid; c.beginPath(); c.moveTo(px, py); } } c.stroke(); };
    bolt(262, 0, 150, 3.5); bolt(112, 30, 70, 2); bolt(404, 30, 70, 2);
  });
  const flash = new THREE.Mesh(new THREE.PlaneGeometry(W, H), new THREE.MeshBasicMaterial({ map: flashTex, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false, side: THREE.DoubleSide }));
  flash.position.set(0, H / 2, BACK_Z + 0.003); flash.renderOrder = -2;
  g.add(rain, flash);
  let strike = 3, ft = -1;
  const wall = g.userData.layers.fore.material, wallGlow = wall.emissiveIntensity;
  anims.push((t, dt = 0.016) => {
    rainTex.offset.y = (t * 1.7) % 1;
    if (ft < 0) { strike -= dt; if (strike <= 0) { strike = 4 + Math.random() * 7; ft = 0; flash.scale.x = Math.random() < 0.5 ? -1 : 1; } return; }
    ft += dt;
    // a double flicker, then the afterglow fades
    const k = ft < 0.07 ? 1 : ft < 0.14 ? 0.2 : ft < 0.22 ? 0.85 : Math.max(0, 1 - (ft - 0.22) / 0.45);
    flash.material.opacity = k; wall.emissiveIntensity = wallGlow + k * 0.35;
    if (ft > 0.7) { ft = -1; flash.material.opacity = 0; wall.emissiveIntensity = wallGlow; }
  });
  // the clockwork on the wall really turns: two pairs of meshing brass gears
  const gearGeo = (rad, teeth) => { const sh = new THREE.Shape(); for (let i = 0; i < teeth * 4; i++) { const a = (i / (teeth * 4)) * Math.PI * 2, rr = i % 4 < 2 ? rad * 1.16 : rad * 0.92; sh[i ? "lineTo" : "moveTo"](Math.cos(a) * rr, Math.sin(a) * rr); } sh.closePath(); const hole = new THREE.Path(); hole.absarc(0, 0, rad * 0.22, 0, Math.PI * 2, true); sh.holes.push(hole); for (let k = 0; k < 5; k++) { const a = (k / 5) * Math.PI * 2, hp = new THREE.Path(); hp.absarc(Math.cos(a) * rad * 0.58, Math.sin(a) * rad * 0.58, rad * 0.17, 0, Math.PI * 2, true); sh.holes.push(hp); } return new THREE.ExtrudeGeometry(sh, { depth: 0.004, bevelEnabled: false, curveSegments: 8 }); };
  const brassLit = std({ color: 0xd8a848, metalness: 0.35, roughness: 0.5, emissive: 0x5a3a10, emissiveIntensity: 0.6 }), brassDark = std({ color: 0xa87830, metalness: 0.35, roughness: 0.55, emissive: 0x402808, emissiveIntensity: 0.6 });
  const wheels = [[104, 150, 52, 14, brassLit, 0.5], [158, 222, 30, 8, brassDark, -0.5 * 14 / 8], [920, 150, 52, 14, brassLit, -0.5], [866, 222, 30, 8, brassDark, 0.5 * 14 / 8]].map(([x, y, rad, teeth, mat, speed]) => {
    const m = new THREE.Mesh(gearGeo((rad / LW) * W, teeth), mat);
    m.position.set(bx(x), by(y), BACK_Z + 0.006); m.castShadow = true;
    g.add(m);
    anims.push((t) => { m.rotation.z = t * speed; });
    return m;
  });
  g.userData.refs = { cage, pedestal, openCage: () => { target = 1; }, closeCage: () => { target = 0; open = 0; door.rotation.y = 0; } };
  return [door, gear, rain, flash, ...wheels];
};

// how each backdrop behaves on stage: how much it glows by itself, and how fast its clouds or mist drift
const LOOK = {
  courtyard: { glow: 0.32, drift: 0.004 },
  forest: { glow: 0.6, drift: 0.007 },
  ship: { glow: 0.32, drift: 0.006 },
  bridge: { glow: 0.6, drift: 0.003 },
  tower: { glow: 0.45 },
  cave: { glow: 0.6 },
  sky: { glow: 0.7, drift: 0.012 },
};

// lighting for each set: spot colour and how dark it is (0 day .. 1 night)
export const SET_LIGHT = {
  courtyard: { spot: 0xffe6c4, night: 0 },
  forest: { spot: 0xc8e8ff, night: 0.72 }, // dark, until Bramble's spell makes it bloom
  ship: { spot: 0xfff2dc, night: 0 },
  bridge: { spot: 0xa8c0ff, night: 0.72 },
  cave: { spot: 0xc0b0ff, night: 0.82 },
  tower: { spot: 0xffc8a0, night: 0.5 },
  sky: { spot: 0xc8d8ff, night: 0.45 },
};

export class Sets {
  constructor(stageRoot) {
    this.root = stageRoot;
    this.sets = new Map();
    this.current = null;
    this.t = 0;
  }

  // built on first use, so the opening loads only the set it needs
  _build(name) {
    const g = new THREE.Group();
    g.name = `set:${name}`;
    const L = LOOK[name] || {};
    const anims = [], keep = [];
    // the backdrop hangs in layers: the far sky, whatever drifts across it, then the scene in front
    const back = new THREE.Mesh(new THREE.PlaneGeometry(W, H), painted(texOf(skyLayer(name)), L.glow ?? 0.32, false));
    back.position.set(0, H / 2, BACK_Z);
    back.renderOrder = -5;
    g.add(back); keep.push(back);
    if (L.drift) {
      const t = texOf(driftLayer(name)); t.wrapS = THREE.RepeatWrapping;
      const drift = new THREE.Mesh(new THREE.PlaneGeometry(W, H), painted(t, L.glow ?? 0.32));
      drift.position.set(0, H / 2, BACK_Z + 0.002); drift.renderOrder = -4;
      g.add(drift); keep.push(drift);
      anims.push((time) => { t.offset.x = (time * L.drift) % 1; });
    }
    const fore = new THREE.Mesh(new THREE.PlaneGeometry(W, H), painted(texOf(foreLayer(name)), L.glow ?? 0.32));
    fore.position.set(0, H / 2, BACK_Z + 0.004);
    fore.renderOrder = -1;
    fore.receiveShadow = true;
    g.add(fore); keep.push(fore);
    g.userData.layers = { back, fore };
    const animated = PIECES[name](g, anims) || [];
    mergeStatic(g, [...keep, ...animated]);
    g.visible = false;
    this.root.add(g);
    const set = { group: g, anims, refs: g.userData.refs || null };
    this.sets.set(name, set);
    return set;
  }

  refs(name) { return (this.sets.get(name) || this._build(name)).refs; }

  show(name) {
    if (!hasBackdrop(name)) name = "courtyard";
    for (const s of this.sets.values()) { s.group.visible = false; s.group.matrixWorldAutoUpdate = false; }
    const set = this.sets.get(name) || this._build(name);
    set.group.visible = true;
    set.group.matrixWorldAutoUpdate = true;
    this.current = name;
    return SET_LIGHT[name];
  }

  update(dt) {
    this.t += dt;
    const s = this.sets.get(this.current);
    if (s) for (const fn of s.anims) fn(this.t, dt);
  }
}

// the storybook and the story cards draw from the same painted backdrops
export { paintBackdrop };
