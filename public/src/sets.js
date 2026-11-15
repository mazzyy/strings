// Stage sets ("maps") for each chapter of the story: a painted backdrop across
// the back of the stage, a few 3D set pieces at the edges (never in the
// puppets' way), and the lighting that goes with them. Everything is drawn in
// code, so it's ours to use, and each set is merged into a few draw calls.
import * as THREE from "three";
import { mergeStatic } from "./perf.js";

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
const rnd = (seed) => () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
const sky = (g, w, h, top, bottom) => { const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, top); gr.addColorStop(1, bottom); g.fillStyle = gr; g.fillRect(0, 0, w, h); };

// ---- backdrops ---------------------------------------------------------------
const PAINT = {
  courtyard(g, w, h) {
    sky(g, w, h, "#7fb6e6", "#e8dcc0");
    g.fillStyle = "rgba(255,255,255,0.8)";
    for (const [x, y, s] of [[180, 70, 1], [620, 50, 1.3], [880, 90, 0.8]]) { g.beginPath(); for (let k = 0; k < 5; k++) g.arc(x + k * 26 * s, y + Math.sin(k) * 8, 26 * s, 0, Math.PI * 2); g.fill(); }
    // castle wall with towers and crenellations
    g.fillStyle = "#9c968c";
    g.fillRect(0, 200, w, h - 200);
    for (let x = 0; x < w; x += 44) g.fillRect(x, 182, 26, 20);
    for (const tx of [90, 470, 860]) {
      g.fillStyle = "#8d877d"; g.fillRect(tx, 90, 90, h - 90);
      for (let x = tx - 6; x < tx + 96; x += 26) g.fillRect(x, 72, 16, 20);
      g.fillStyle = "#4a3426"; g.beginPath(); g.arc(tx + 45, 170, 16, Math.PI, 0); g.fillRect(tx + 29, 170, 32, 34); g.fill();
      g.fillStyle = "#24497f"; g.fillRect(tx + 38, 20, 4, 54); g.beginPath(); g.moveTo(tx + 42, 22); g.lineTo(tx + 80, 32); g.lineTo(tx + 42, 44); g.fill();
    }
    g.strokeStyle = "rgba(60,55,50,0.35)"; g.lineWidth = 2;
    for (let y = 214; y < h; y += 22) for (let x = (y / 22) % 2 ? 0 : 30; x < w; x += 60) g.strokeRect(x, y, 60, 22);
    g.fillStyle = "#5d8a3a"; g.fillRect(0, h - 26, w, 26);
  },
  forest(g, w, h) {
    sky(g, w, h, "#2a3b5a", "#c99b6a");
    const r = rnd(7);
    const layer = (col, base, size, n) => { g.fillStyle = col; for (let i = 0; i < n; i++) { const x = r() * w, s = size * (0.7 + r() * 0.6); g.beginPath(); g.moveTo(x, base - s * 2.2); g.lineTo(x - s, base); g.lineTo(x + s, base); g.fill(); g.fillRect(x - s * 0.08, base, s * 0.16, h - base); } };
    layer("#3c4f4a", 250, 60, 22);
    layer("#2b3d33", 290, 75, 18);
    layer("#1b2a20", 330, 95, 14);
    g.fillStyle = "#1a2418"; g.fillRect(0, 320, w, h - 320);
    // fireflies
    for (let i = 0; i < 60; i++) { const x = r() * w, y = 120 + r() * 200; const gr = g.createRadialGradient(x, y, 0, x, y, 8); gr.addColorStop(0, "rgba(255,240,150,0.95)"); gr.addColorStop(1, "rgba(255,240,150,0)"); g.fillStyle = gr; g.fillRect(x - 8, y - 8, 16, 16); }
  },
  ship(g, w, h) {
    sky(g, w, h, "#5fa8e0", "#cfe8f2");
    g.fillStyle = "rgba(255,255,255,0.85)";
    for (const [x, y] of [[150, 60], [520, 90], [860, 50]]) { g.beginPath(); for (let k = 0; k < 4; k++) g.arc(x + k * 30, y + (k % 2) * 6, 24, 0, Math.PI * 2); g.fill(); }
    // distant island
    g.fillStyle = "#6b8f5a"; g.beginPath(); g.ellipse(780, 215, 120, 30, 0, Math.PI, 0); g.fill();
    g.fillStyle = "#3d6b3a"; g.fillRect(800, 160, 4, 40); g.beginPath(); g.ellipse(802, 160, 24, 8, 0.3, 0, Math.PI * 2); g.fill();
    // sea with wave bands
    const sea = g.createLinearGradient(0, 210, 0, h); sea.addColorStop(0, "#2f78b0"); sea.addColorStop(1, "#164a75"); g.fillStyle = sea; g.fillRect(0, 210, w, h - 210);
    g.strokeStyle = "rgba(255,255,255,0.55)"; g.lineWidth = 3;
    for (let y = 230; y < h; y += 26) { g.beginPath(); for (let x = 0; x <= w; x += 8) g.lineTo(x, y + Math.sin(x * 0.04 + y) * 4); g.stroke(); }
  },
  bridge(g, w, h) {
    sky(g, w, h, "#0a1030", "#2b3a6a");
    const r = rnd(11);
    for (let i = 0; i < 160; i++) { g.fillStyle = `rgba(255,255,240,${0.4 + r() * 0.6})`; g.fillRect(r() * w, r() * 220, 2, 2); }
    // the moon
    const mg = g.createRadialGradient(820, 80, 10, 820, 80, 90); mg.addColorStop(0, "rgba(255,250,220,0.6)"); mg.addColorStop(1, "rgba(255,250,220,0)"); g.fillStyle = mg; g.fillRect(700, 0, 240, 200);
    g.fillStyle = "#f6f0d0"; g.beginPath(); g.arc(820, 80, 38, 0, Math.PI * 2); g.fill();
    g.fillStyle = "rgba(200,190,160,0.5)"; for (const [x, y, s] of [[808, 70, 7], [832, 92, 5], [826, 66, 4]]) { g.beginPath(); g.arc(x, y, s, 0, Math.PI * 2); g.fill(); }
    // mountains and a river valley
    g.fillStyle = "#1c2648"; g.beginPath(); g.moveTo(0, 260); for (const [x, y] of [[120, 160], [260, 230], [400, 140], [560, 240], [700, 170], [900, 250], [1024, 190], [1024, h], [0, h]]) g.lineTo(x, y); g.fill();
    g.fillStyle = "#121a35"; g.fillRect(0, 280, w, h - 280);
    g.fillStyle = "rgba(140,170,230,0.35)"; g.fillRect(0, 300, w, 12);
  },
  tower(g, w, h) {
    sky(g, w, h, "#2a2430", "#4a3a34");
    // stone blocks
    g.strokeStyle = "rgba(20,15,15,0.5)"; g.lineWidth = 3;
    for (let y = 0; y < h; y += 34) for (let x = (y / 34) % 2 ? -40 : 0; x < w; x += 80) { g.fillStyle = `rgba(${90 + ((x * 7 + y) % 30)},${80 + ((x * 3 + y) % 20)},${78 + ((x + y * 3) % 20)},1)`; g.fillRect(x, y, 80, 34); g.strokeRect(x, y, 80, 34); }
    // a tall arched window with a stormy sky and lightning
    g.fillStyle = "#141a30"; g.beginPath(); g.moveTo(440, 300); g.lineTo(440, 120); g.arc(512, 120, 72, Math.PI, 0); g.lineTo(584, 300); g.fill();
    g.strokeStyle = "#e8e0ff"; g.lineWidth = 4; g.beginPath(); g.moveTo(530, 70); g.lineTo(500, 140); g.lineTo(522, 140); g.lineTo(490, 230); g.stroke();
    g.strokeStyle = "#3a2a20"; g.lineWidth = 8; g.beginPath(); g.moveTo(512, 48); g.lineTo(512, 300); g.moveTo(440, 170); g.lineTo(584, 170); g.stroke();
    // brass gears on the wall
    const gear = (cx, cy, r, teeth, col) => { g.fillStyle = col; g.beginPath(); for (let i = 0; i < teeth * 2; i++) { const a = (i / (teeth * 2)) * Math.PI * 2, rr = i % 2 ? r : r * 1.18; g.lineTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr); } g.fill(); g.fillStyle = "#3a2a20"; g.beginPath(); g.arc(cx, cy, r * 0.3, 0, Math.PI * 2); g.fill(); };
    gear(150, 120, 60, 12, "#a07a38"); gear(250, 200, 40, 9, "#8a6a30"); gear(850, 110, 70, 14, "#a07a38"); gear(930, 240, 36, 8, "#8a6a30");
    // pipes
    g.strokeStyle = "#6a5a4a"; g.lineWidth = 14; g.beginPath(); g.moveTo(0, 300); g.lineTo(330, 300); g.lineTo(330, 40); g.moveTo(1024, 320); g.lineTo(700, 320); g.lineTo(700, 30); g.stroke();
  },
  cave(g, w, h) {
    sky(g, w, h, "#120d1a", "#2a1f2e");
    const r = rnd(5);
    // rock masses
    for (let i = 0; i < 40; i++) { g.fillStyle = `rgba(${50 + r() * 30},${40 + r() * 20},${55 + r() * 30},0.8)`; g.beginPath(); g.ellipse(r() * w, r() * h, 40 + r() * 90, 30 + r() * 60, r() * 3, 0, Math.PI * 2); g.fill(); }
    // glowing crystals in the dark
    for (let i = 0; i < 18; i++) {
      const x = r() * w, y = 120 + r() * 200, s = 10 + r() * 22, col = r() < 0.5 ? [120, 230, 255] : [190, 140, 255];
      const gr = g.createRadialGradient(x, y, 0, x, y, s * 2.5); gr.addColorStop(0, `rgba(${col},0.45)`); gr.addColorStop(1, `rgba(${col},0)`); g.fillStyle = gr; g.fillRect(x - s * 2.5, y - s * 2.5, s * 5, s * 5);
      g.fillStyle = `rgb(${col})`; g.beginPath(); g.moveTo(x, y - s); g.lineTo(x - s * 0.35, y); g.lineTo(x, y + s * 0.3); g.lineTo(x + s * 0.35, y); g.fill();
    }
    // a heap of gold in the back
    for (let i = 0; i < 90; i++) { g.fillStyle = r() < 0.5 ? "#e8b84a" : "#b88a2a"; g.beginPath(); g.arc(380 + r() * 260, 300 + r() * 40 - Math.sin((i / 90) * Math.PI) * 20, 5, 0, Math.PI * 2); g.fill(); }
  },
};

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
  courtyard(g) {
    const pole = std({ color: 0x6a4a2c, roughness: 0.7 }), flagA = std({ color: 0x24497f, roughness: 0.8, side: THREE.DoubleSide }), flagB = std({ color: 0xd8ac4f, roughness: 0.6, side: THREE.DoubleSide });
    const leaf = std({ color: 0x3f6f2a, roughness: 0.9 }), pot = std({ color: 0x8a5a3a, roughness: 0.8 });
    for (const [x, mat] of [[-0.37, flagA], [0.37, flagB]]) {
      piece(g, new THREE.CylinderGeometry(0.003, 0.003, 0.25, 8), pole, x, 0.125, -0.16);
      const flag = piece(g, new THREE.PlaneGeometry(0.06, 0.09, 6, 1), mat, x + 0.032 * Math.sign(-x), 0.2, -0.16);
      const p = flag.geometry.attributes.position; for (let i = 0; i < p.count; i++) p.setZ(i, Math.sin(p.getX(i) * 60) * 0.004); flag.geometry.computeVertexNormals();
    }
    for (const x of [-0.385, 0.385]) {
      piece(g, new THREE.CylinderGeometry(0.018, 0.014, 0.03, 12), pot, x, 0.015, -0.06);
      piece(g, new THREE.SphereGeometry(0.03, 12, 10), leaf, x, 0.055, -0.06);
    }
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
    // fireflies drifting over the stage
    const n = 36, geo = new THREE.BufferGeometry(), pos = new Float32Array(n * 3), seeds = [];
    for (let i = 0; i < n; i++) seeds.push([Math.random() * 6, (Math.random() - 0.5) * 0.7, 0.05 + Math.random() * 0.2, (Math.random() - 0.5) * 0.3]);
    geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    const flies = new THREE.Points(geo, new THREE.PointsMaterial({ color: 0xfff09a, size: 0.006, transparent: true, opacity: 0.9, depthWrite: false, toneMapped: false }));
    flies.frustumCulled = false;
    g.add(flies);
    anims.push((t) => { seeds.forEach(([p, x, y, z], i) => { pos[i * 3] = x + Math.sin(t * 0.4 + p) * 0.04; pos[i * 3 + 1] = y + Math.sin(t * 0.9 + p * 2) * 0.02; pos[i * 3 + 2] = z + Math.cos(t * 0.5 + p) * 0.03; }); geo.attributes.position.needsUpdate = true; flies.material.opacity = 0.6 + 0.35 * Math.sin(t * 3); });
    return [flies];
  },
  ship(g) {
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
  },
  bridge(g) {
    const stone = std({ color: 0x7a7f8a, roughness: 0.9 }), stone2 = std({ color: 0x5d626c, roughness: 0.95 }), iron = std({ color: 0x2a2a2e, metalness: 0.6, roughness: 0.5 });
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
    const rock = std({ color: 0x4a4050, roughness: 0.95 }), rock2 = std({ color: 0x3a3240, roughness: 0.95 });
    const cyan = new THREE.MeshStandardMaterial({ color: 0x9ff3ff, emissive: 0x3ad8ff, emissiveIntensity: 1.6, roughness: 0.2, toneMapped: false });
    const violet = new THREE.MeshStandardMaterial({ color: 0xd0b0ff, emissive: 0x9a5cff, emissiveIntensity: 1.6, roughness: 0.2, toneMapped: false });
    const chestM = std({ color: 0x6a4425, roughness: 0.7 }), gold = std({ color: 0xd8ac4f, metalness: 1, roughness: 0.3 });
    for (const [x, z, h] of [[-0.38, -0.15, 0.09], [-0.34, -0.02, 0.05], [0.37, -0.14, 0.11], [0.39, 0.0, 0.06], [0.3, -0.17, 0.07]]) piece(g, new THREE.ConeGeometry(0.02, h, 7), x > 0 ? rock : rock2, x, h / 2, z);
    for (const [x, h] of [[-0.28, 0.06], [-0.12, 0.04], [0.05, 0.07], [0.22, 0.05]]) { const c = piece(g, new THREE.ConeGeometry(0.012, h, 6), rock2, x, 0.27 - h / 2, -0.175); c.rotation.x = Math.PI; }
    const crystals = [];
    for (const [x, z, mat] of [[-0.36, -0.08, cyan], [0.35, -0.06, violet], [0.18, -0.165, cyan], [-0.2, -0.17, violet]]) for (let k = 0; k < 3; k++) {
      const c = piece(g, new THREE.OctahedronGeometry(0.008 + k * 0.003, 0), mat, x + (k - 1) * 0.008, 0.012 + k * 0.004, z + (k % 2) * 0.006);
      c.scale.y = 2.2; c.rotation.z = (k - 1) * 0.35; crystals.push(c);
    }
    piece(g, new THREE.BoxGeometry(0.05, 0.03, 0.032), chestM, -0.26, 0.015, -0.13);
    piece(g, new THREE.CylinderGeometry(0.016, 0.016, 0.05, 12, 1, false, 0, Math.PI), chestM, -0.26, 0.03, -0.13).rotation.z = Math.PI / 2;
    piece(g, new THREE.BoxGeometry(0.052, 0.004, 0.034), gold, -0.26, 0.03, -0.13);
    anims.push((t) => { cyan.emissiveIntensity = 1.3 + Math.sin(t * 1.7) * 0.4; violet.emissiveIntensity = 1.3 + Math.sin(t * 1.3 + 1) * 0.4; });
  },
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
  g.userData.refs = { cage, pedestal, openCage: () => { target = 1; }, closeCage: () => { target = 0; open = 0; door.rotation.y = 0; } };
  return [door, gear];
};

// lighting for each set: spot colour and how dark it is (0 day .. 1 night)
export const SET_LIGHT = {
  courtyard: { spot: 0xffe6c4, night: 0 },
  forest: { spot: 0xd8ffd0, night: 0.35 },
  ship: { spot: 0xfff2dc, night: 0 },
  bridge: { spot: 0xa8c0ff, night: 0.72 },
  cave: { spot: 0xc0b0ff, night: 0.82 },
  tower: { spot: 0xffc8a0, night: 0.5 },
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
    const tex = canvas(1024, 376, PAINT[name]);
    const back = new THREE.Mesh(new THREE.PlaneGeometry(W, H), new THREE.MeshStandardMaterial({ map: tex, roughness: 1, emissive: 0xffffff, emissiveMap: tex, emissiveIntensity: 0.32 }));
    back.position.set(0, H / 2, BACK_Z);
    back.receiveShadow = true;
    g.add(back);
    const anims = [];
    const animated = PIECES[name](g, anims) || [];
    mergeStatic(g, [back, ...animated]);
    g.visible = false;
    this.root.add(g);
    const set = { group: g, anims, refs: g.userData.refs || null };
    this.sets.set(name, set);
    return set;
  }

  refs(name) { return (this.sets.get(name) || this._build(name)).refs; }

  show(name) {
    if (!PAINT[name]) name = "courtyard";
    for (const s of this.sets.values()) s.group.visible = false;
    const set = this.sets.get(name) || this._build(name);
    set.group.visible = true;
    this.current = name;
    return SET_LIGHT[name];
  }

  update(dt) {
    this.t += dt;
    const s = this.sets.get(this.current);
    if (s) for (const fn of s.anims) fn(this.t, dt);
  }
}

// the storybook draws its illustrations from the same painted backdrops
export function paintBackdrop(name, g, w, h) { (PAINT[name] || PAINT.courtyard)(g, w, h); }
