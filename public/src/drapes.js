// The theatre's drapery: the main traveller curtain (two velvet panels that really gather
// as they open, the hem trailing the heading), the swagged pelmet with gold fringe and
// tassels, and the two tied-back side curtains.
//
// Velvet is a standard material with a small shader patch (a coloured sheen at grazing
// angles), so it keeps its look in the headset, where physical materials are swapped out.
// The depth of each fold is baked into vertex colours, so folds read as folds even when
// the curtain casts no shadow.
import * as THREE from "three";

const TAU = Math.PI * 2;
const smooth = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const rnd = (() => { let s = 7; return () => ((s = (s * 16807) % 2147483647) / 2147483647); })();

// --- textures -------------------------------------------------------------------------

function velvetTextures() {
  // crushed-velvet pile: soft mottling plus a fine vertical nap, as colour and as a normal map
  const N = 256, c = document.createElement("canvas");
  c.width = c.height = N;
  const g = c.getContext("2d");
  g.fillStyle = "#d8d8d8";
  g.fillRect(0, 0, N, N);
  for (let i = 0; i < 260; i++) {
    const x = rnd() * N, y = rnd() * N, r = 6 + rnd() * 30, l = rnd() < 0.5 ? 255 : 120;
    for (const ox of [-N, 0, N]) for (const oy of [-N, 0, N]) {
      const gr = g.createRadialGradient(x + ox, y + oy, 0, x + ox, y + oy, r);
      gr.addColorStop(0, `rgba(${l},${l},${l},0.09)`);
      gr.addColorStop(1, `rgba(${l},${l},${l},0)`);
      g.fillStyle = gr;
      g.fillRect(x + ox - r, y + oy - r, r * 2, r * 2);
    }
  }
  for (let i = 0; i < 900; i++) {
    const x = rnd() * N, y = rnd() * N, l = rnd() < 0.5 ? 255 : 90;
    g.fillStyle = `rgba(${l},${l},${l},0.07)`;
    g.fillRect(x, y, 1, 4 + rnd() * 14);
  }
  const src = g.getImageData(0, 0, N, N).data;
  const h = (x, y) => src[(((y + N) % N) * N + ((x + N) % N)) * 4] / 255;
  const nc = document.createElement("canvas");
  nc.width = nc.height = N;
  const ng = nc.getContext("2d"), out = ng.createImageData(N, N);
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    const dx = (h(x - 1, y) - h(x + 1, y)) * 3, dy = (h(x, y + 1) - h(x, y - 1)) * 3;
    const l = Math.hypot(dx, dy, 1), i = (y * N + x) * 4;
    out.data[i] = (dx / l * 0.5 + 0.5) * 255;
    out.data[i + 1] = (dy / l * 0.5 + 0.5) * 255;
    out.data[i + 2] = (1 / l * 0.5 + 0.5) * 255;
    out.data[i + 3] = 255;
  }
  ng.putImageData(out, 0, 0);
  const map = new THREE.CanvasTexture(c), normal = new THREE.CanvasTexture(nc);
  map.colorSpace = THREE.SRGBColorSpace;
  for (const t of [map, normal]) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 4; }
  return { map, normal };
}

function fringeTexture() {
  // gold bullion fringe: a woven heading band, then hanging twisted strands (alpha cut)
  const c = document.createElement("canvas");
  c.width = 128; c.height = 64;
  const g = c.getContext("2d");
  g.clearRect(0, 0, 128, 64);
  g.fillStyle = "#c8963c";
  g.fillRect(0, 0, 128, 9);
  g.strokeStyle = "#ffe7a0";
  g.lineWidth = 1.4;
  for (let x = -10; x < 140; x += 5) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x + 6, 9); g.stroke(); }
  g.fillStyle = "#7a5418";
  g.fillRect(0, 8, 128, 1.5);
  for (let x = 0; x < 128; x += 2.6) {
    const len = 50 + rnd() * 12, l = 150 + rnd() * 105;
    const gr = g.createLinearGradient(0, 9, 0, 9 + len);
    gr.addColorStop(0, `rgb(${l * 0.82},${l * 0.6},${l * 0.24})`);
    gr.addColorStop(0.5, `rgb(${Math.min(255, l * 1.05)},${l * 0.82},${l * 0.38})`);
    gr.addColorStop(1, `rgb(${l * 0.7},${l * 0.5},${l * 0.2})`);
    g.fillStyle = gr;
    g.fillRect(x, 9, 1.7, len);
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = THREE.RepeatWrapping;
  return t;
}

function braidTexture() {
  // a woven gold galloon for the hem
  const c = document.createElement("canvas");
  c.width = 64; c.height = 16;
  const g = c.getContext("2d");
  g.fillStyle = "#9c6e26";
  g.fillRect(0, 0, 64, 16);
  for (let x = -16; x < 80; x += 8) {
    g.strokeStyle = "#ffe4a0"; g.lineWidth = 2.6;
    g.beginPath(); g.moveTo(x, 2); g.lineTo(x + 4, 8); g.lineTo(x, 14); g.stroke();
  }
  g.fillStyle = "#e9c46c";
  g.fillRect(0, 0, 64, 1.6); g.fillRect(0, 14.4, 64, 1.6);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = THREE.RepeatWrapping;
  return t;
}

// --- materials ------------------------------------------------------------------------

export function velvetMaterial(color = 0xb0142a, sheen = 0xff6f7c) {
  const { map, normal } = velvetTextures();
  const m = new THREE.MeshStandardMaterial({
    color, map, normalMap: normal, normalScale: new THREE.Vector2(0.45, 0.45),
    roughness: 0.92, metalness: 0, vertexColors: true, side: THREE.DoubleSide,
  });
  const sheenCol = new THREE.Color(sheen);
  m.onBeforeCompile = (sh) => {
    sh.uniforms.uSheen = { value: sheenCol };
    sh.fragmentShader = sh.fragmentShader
      .replace("#include <common>", "#include <common>\nuniform vec3 uSheen;")
      .replace("#include <opaque_fragment>", `
        {
          // velvet: the pile stands up at grazing angles and catches the light there,
          // while faces turned to you sink into the deep colour
          float nv = clamp(dot(normalize(normal), normalize(vViewPosition)), 0.0, 1.0);
          vec3 lit = (reflectedLight.directDiffuse + reflectedLight.indirectDiffuse) / max(diffuseColor.rgb, vec3(0.03));
          float rim = pow(1.0 - nv, 2.4);
          outgoingLight = outgoingLight * (0.8 + 0.2 * nv) + uSheen * lit * rim * 0.24;
        }
        #include <opaque_fragment>`);
  };
  m.customProgramCacheKey = () => "velvet-v1";
  return m;
}

// --- geometry helpers -----------------------------------------------------------------

function grid(cols, rows, flip) {
  const n = (cols + 1) * (rows + 1);
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.BufferAttribute(new Float32Array(n * 3), 3).setUsage(THREE.DynamicDrawUsage));
  g.setAttribute("uv", new THREE.BufferAttribute(new Float32Array(n * 2), 2));
  g.setAttribute("color", new THREE.BufferAttribute(new Float32Array(n * 3), 3).setUsage(THREE.DynamicDrawUsage));
  const idx = [];
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
    const a = r * (cols + 1) + c, b = a + 1, d = a + cols + 1, e = d + 1;
    if (flip) idx.push(a, d, b, b, d, e); else idx.push(a, b, d, b, e, d);
  }
  g.setIndex(idx);
  return g;
}

// a strip hanging from (or laid along) a row of points: fringe and braid
function strip(cols, flip) { return grid(cols, 1, flip); }
function fillStrip(geo, pts, top, bottom, dz, uScale, uOf) {
  const p = geo.attributes.position.array, uv = geo.attributes.uv.array, col = geo.attributes.color.array;
  const n = pts.length / 3;
  for (let c = 0; c < n; c++) {
    const x = pts[c * 3], y = pts[c * 3 + 1], z = pts[c * 3 + 2] + dz;
    p.set([x, y + bottom, z], c * 3);
    p.set([x, y + top, z], (n + c) * 3);
    const u = uOf(c) * uScale;
    uv.set([u, 0], c * 2); uv.set([u, 1], (n + c) * 2);
    col.fill(1, c * 3, c * 3 + 3); col.fill(1, (n + c) * 3, (n + c) * 3 + 3);
  }
  geo.attributes.position.needsUpdate = geo.attributes.uv.needsUpdate = true;
  geo.computeVertexNormals();
}

function tassel(goldMat, fringeMat, len = 0.022) {
  const t = new THREE.Group();
  const cap = new THREE.Mesh(new THREE.SphereGeometry(0.0042, 12, 8), goldMat);
  const neck = new THREE.Mesh(new THREE.TorusGeometry(0.0034, 0.0012, 6, 14), goldMat);
  neck.rotation.x = Math.PI / 2;
  neck.position.y = -0.005;
  const skirtGeo = new THREE.CylinderGeometry(0.0036, 0.0068, len, 18, 1, true).translate(0, -0.006 - len / 2, 0);
  const uv = skirtGeo.attributes.uv; // three strand bands round the skirt
  for (let i = 0; i < uv.count; i++) uv.setX(i, uv.getX(i) * 3);
  const skirt = new THREE.Mesh(skirtGeo, fringeMat);
  const core = new THREE.Mesh(new THREE.CylinderGeometry(0.003, 0.0045, len * 0.85, 10).translate(0, -0.006 - len * 0.42, 0), goldMat);
  t.add(cap, neck, core, skirt);
  return t;
}

// --- the swag pelmet (also used for the fixed valances over the side curtains) --------

function swag({ x0, dir, width, scallops, top, h0, dip, z, velvet, fringeMat, goldMat, cols = 72, rows = 9 }) {
  const flip = dir > 0;
  const geo = grid(cols, rows, flip);
  const mesh = new THREE.Mesh(geo, velvet);
  mesh.frustumCulled = false;
  const fr = strip(cols, flip);
  const fringe = new THREE.Mesh(fr, fringeMat);
  fringe.frustumCulled = false;
  const group = new THREE.Group();
  group.add(mesh, fringe);
  const tassels = [];
  for (let j = 0; j <= scallops; j++) { const t = tassel(goldMat, fringeMat); tassels.push(t); group.add(t); }
  const bottomPts = new Float32Array((cols + 1) * 3);
  const P = geo.attributes.position.array, C = geo.attributes.color.array, UV = geo.attributes.uv.array;
  let lastS = -1;
  const api = {
    group, mesh,
    set(s) {
      if (Math.abs(s - lastS) < 1e-5) return;
      lastS = s;
      const boost = Math.min(2.2, 1 / Math.sqrt(s));
      for (let r = 0; r <= rows; r++) {
        const v = r / rows; // 0 bottom edge, 1 top
        for (let c = 0; c <= cols; c++) {
          const u = c / cols, t = (u * scallops) % 1, sw = Math.sin(Math.PI * t);
          const d = dip * Math.pow(sw, 0.85);
          const yb = top - h0 - d, y = yb + v * (top - yb);
          const depth = (top - y) / (top - yb + 1e-6); // 0 top .. 1 swag edge
          const ridge = Math.sin(depth * Math.PI * 3.6 + 0.4) * sw;
          const jab = Math.exp(-Math.pow(Math.min(t, 1 - t) / 0.07, 2));
          const pleat = Math.sin(u * width * 520) * jab;
          let zz = z + 0.0055 * sw * Math.pow(1 - v, 0.6) + 0.0011 * ridge * boost + 0.0016 * pleat * boost;
          const x = x0 + dir * u * width * s;
          const i = (r * (cols + 1) + c) * 3;
          P[i] = x; P[i + 1] = y; P[i + 2] = zz;
          const ao = (0.62 + 0.3 * (0.5 + 0.5 * ridge) + 0.08 * sw) * (1 - 0.35 * jab * (0.5 - 0.5 * pleat)) * (0.72 + 0.28 * Math.min(1, depth * 1.6 + 0.2));
          C[i] = C[i + 1] = C[i + 2] = ao;
          UV[(r * (cols + 1) + c) * 2] = u * width / 0.07; UV[(r * (cols + 1) + c) * 2 + 1] = y / 0.07;
          if (r === 0) { bottomPts[c * 3] = x; bottomPts[c * 3 + 1] = y + 0.002; bottomPts[c * 3 + 2] = zz + 0.0006; }
        }
      }
      geo.attributes.position.needsUpdate = geo.attributes.color.needsUpdate = geo.attributes.uv.needsUpdate = true;
      geo.computeVertexNormals();
      fillStrip(fr, bottomPts, 0, -0.016, 0, width / 0.032, (c) => c / cols);
      tassels.forEach((tt, j) => {
        const u = j / scallops;
        tt.position.set(x0 + dir * u * width * s, top - h0 + 0.002, z + 0.004);
      });
    },
  };
  return api;
}

// --- the traveller panels -------------------------------------------------------------

function traveller({ sx, x0, width, height, y0, z, velvet, braidMat }) {
  const cols = 84, rows = 22, flip = sx > 0, dir = -sx;
  const geo = grid(cols, rows, flip);
  const mesh = new THREE.Mesh(geo, velvet);
  mesh.castShadow = true;
  mesh.frustumCulled = false;
  const br = strip(cols, flip);
  const braid = new THREE.Mesh(br, braidMat);
  braid.frustumCulled = false;
  // each fold has its own width, depth and lean: real cloth is never a sine wave
  const PH = [], AMP = [], LEAN = [];
  const pleats = 15.5;
  for (let c = 0; c <= cols; c++) {
    const u = c / cols;
    PH.push(TAU * (u * pleats + 0.22 * Math.sin(u * 13.1 + 0.7) + 0.1 * Math.sin(u * 37.3 + 2.1)));
    AMP.push(0.78 + 0.22 * Math.sin(u * 23.7 + 1.1) + 0.16 * Math.sin(u * 61.1));
    LEAN.push(0.5 * Math.sin(u * 9.3 + 0.4));
  }
  const P = geo.attributes.position.array, C = geo.attributes.color.array, UV = geo.attributes.uv.array;
  const hem = new Float32Array((cols + 1) * 3);
  return {
    mesh, braid,
    set(kTop, kBot, t, swayAmt) {
      for (let r = 0; r <= rows; r++) {
        const v = r / rows; // 0 hem, 1 heading
        const k = kBot + (kTop - kBot) * Math.pow(v, 0.7);
        const s = 1 - k * (1 - 0.085);
        const boost = Math.min(2.5, 1 / Math.sqrt(s));
        const trail = (kTop - kBot) * (1 - v) * (1 - v);
        for (let c = 0; c <= cols; c++) {
          const u = c / cols;
          const ph = PH[c] + LEAN[c] * (1 - v) * 1.4;
          const sn = Math.sin(ph);
          const edge = smooth(1, 0.94, u) * (0.35 + 0.65 * smooth(0, 0.03, u));
          const a = 0.0052 * AMP[c] * (0.82 + 0.3 * (1 - v)) * boost * edge;
          const sway = swayAmt * Math.sin(t * 0.9 + u * 6.0 + sx) * (1 - v) * (1 - v);
          const hemCurl = 0.0025 * smooth(0.05, 0, v);
          const zz = z + a * sn + sway + hemCurl - 0.018 * trail * Math.sin(Math.PI * u);
          const x = x0 + dir * u * width * s;
          const y = y0 + v * height;
          const i = (r * (cols + 1) + c) * 3;
          P[i] = x; P[i + 1] = y; P[i + 2] = zz;
          // fold valleys sink into shadow; the heading sits in the pelmet's shade
          const cav = 0.5 + 0.5 * sn;
          let ao = 0.5 + 0.5 * Math.pow(cav, 0.75);
          ao *= 1 - 0.38 * smooth(0.8, 1, v);
          ao *= 0.9 + 0.1 * smooth(0, 0.12, v);
          C[i] = C[i + 1] = C[i + 2] = ao;
          UV[(r * (cols + 1) + c) * 2] = u * width / 0.07; UV[(r * (cols + 1) + c) * 2 + 1] = y / 0.07;
          if (r === 0) { hem[c * 3] = x; hem[c * 3 + 1] = y; hem[c * 3 + 2] = zz + 0.0007; }
        }
      }
      geo.attributes.position.needsUpdate = geo.attributes.color.needsUpdate = true;
      geo.attributes.uv.needsUpdate = true;
      geo.computeVertexNormals();
      fillStrip(br, hem, 0.0105, 0.0035, 0, width / 0.024, (c) => c / cols);
    },
  };
}

// --- a tied-back side curtain ---------------------------------------------------------

function legGeometry(w, h, gatherY, sx) {
  const cols = 40, rows = 56;
  const geo = grid(cols, rows, false);
  const P = geo.attributes.position.array, C = geo.attributes.color.array, UV = geo.attributes.uv.array;
  for (let r = 0; r <= rows; r++) {
    const v = r / rows, y = v * h;
    const g = Math.exp(-Math.pow((y - gatherY) / (y > gatherY ? 0.075 : 0.045), 2));
    const pinch = 1 - 0.66 * g;
    const flare = 1 + 0.12 * smooth(gatherY, 0, y); // the skirt spreads at the floor
    for (let c = 0; c <= cols; c++) {
      const u = c / cols, x0 = (u - 0.5) * w;
      // the fabric is drawn toward the tie, which sits a little to the stage side
      const cx = -sx * 0.01 * g;
      const x = cx + x0 * pinch * flare;
      const ph = TAU * (u * 5.6 + 0.18 * Math.sin(u * 11.0 + 1.0)) + 0.6 * (1 - v) * Math.sin(u * 7.0);
      const sn = Math.sin(ph);
      const a = 0.0062 * (0.75 + 0.25 * Math.sin(u * 19.0)) / Math.sqrt(pinch);
      const blouse = 0.011 * Math.exp(-Math.pow((y - (gatherY - 0.035)) / 0.035, 2)) * Math.sin(Math.PI * u);
      const z = a * sn + (1 - pinch) * 0.012 + blouse + 0.003 * smooth(0.02, 0, y);
      const i = (r * (cols + 1) + c) * 3;
      P[i] = x; P[i + 1] = y; P[i + 2] = z;
      let ao = 0.48 + 0.52 * Math.pow(0.5 + 0.5 * sn, 0.75);
      ao *= 1 - 0.25 * g; // crushed folds at the tie
      ao *= 1 - 0.3 * smooth(0.82, 1, v);
      C[i] = C[i + 1] = C[i + 2] = ao;
      UV[(r * (cols + 1) + c) * 2] = u * w / 0.07; UV[(r * (cols + 1) + c) * 2 + 1] = y / 0.07;
    }
  }
  geo.computeVertexNormals();
  return geo;
}

function ropeTie(goldMat, rx, rz) {
  // a twisted gold cord round the gathered curtain
  const g = new THREE.Group();
  for (const off of [0, Math.PI]) {
    const curve = new THREE.Curve();
    curve.getPoint = (t, out = new THREE.Vector3()) => {
      const a = t * TAU, tw = a * 16 + off;
      const r = 0.0013;
      return out.set(Math.cos(a) * (rx + r * Math.cos(tw)), r * Math.sin(tw), Math.sin(a) * (rz + r * Math.cos(tw)));
    };
    g.add(new THREE.Mesh(new THREE.TubeGeometry(curve, 220, 0.0013, 5, true), goldMat));
  }
  return g;
}

// --- everything together --------------------------------------------------------------

export function buildDrapes({ W, D, postH, gold }) {
  const group = new THREE.Group();
  const velvet = velvetMaterial();
  const fringeMat = new THREE.MeshStandardMaterial({ color: 0xffe2a0, map: fringeTexture(), alphaTest: 0.5, metalness: 0.75, roughness: 0.38, side: THREE.DoubleSide });
  const braidMat = new THREE.MeshStandardMaterial({ color: 0xffe6b0, map: braidTexture(), metalness: 0.8, roughness: 0.34, side: THREE.DoubleSide });
  const ropeMat = new THREE.MeshStandardMaterial({ color: 0xd2a24a, metalness: 0.75, roughness: 0.4 });

  // main traveller: two panels meeting (and overlapping a little) at the centre
  const panelW = W / 2 - 0.03 + 0.012, zMain = D / 2 - 0.05;
  const panels = [-1, 1].map((sx) => traveller({ sx, x0: sx * (W / 2 - 0.03), width: panelW, height: postH - 0.03, y0: 0.003, z: zMain + (sx < 0 ? 0.0025 : 0), velvet, braidMat }));
  for (const p of panels) group.add(p.mesh, p.braid);
  // its pelmet, two halves that gather with the panels
  const pelmets = [-1, 1].map((sx) => swag({ x0: sx * (W / 2 - 0.03), dir: -sx, width: panelW, scallops: 3, top: postH + 0.002, h0: 0.026, dip: 0.017, z: zMain + 0.009, velvet, fringeMat, goldMat: gold }));
  for (const p of pelmets) group.add(p.group);

  // the side curtains, tied back, each under a fixed swag
  for (const sx of [-1, 1]) {
    const cx = sx * (W / 2 - 0.06), zLeg = D / 2 - 0.035, gatherY = 0.11;
    const leg = new THREE.Mesh(legGeometry(0.11, postH - 0.012, gatherY, sx), velvet);
    leg.position.set(cx, 0, zLeg);
    leg.castShadow = true;
    group.add(leg);
    const tie = ropeTie(ropeMat, 0.022, 0.011);
    tie.position.set(cx - sx * 0.01 * 1, gatherY, zLeg + 0.01);
    tie.rotation.z = sx * 0.12;
    group.add(tie);
    const tt = tassel(gold, fringeMat, 0.028);
    tt.position.set(cx - sx * 0.024, gatherY - 0.004, zLeg + 0.02);
    group.add(tt);
    const val = swag({ x0: sx * (W / 2 - 0.002), dir: -sx, width: 0.13, scallops: 1, top: postH + 0.004, h0: 0.03, dip: 0.02, z: D / 2 - 0.026, velvet, fringeMat, goldMat: gold, cols: 36 });
    val.set(1);
    group.add(val.group);
  }

  let kBot = 0, kTop = -1, t = 0, frame = 0;
  return {
    group, velvet,
    update(k, dt) {
      t += dt;
      const moving = Math.abs(k - kTop) > 1e-4 || Math.abs(k - kBot) > 1e-4;
      kBot += (k - kBot) * Math.min(1, dt * 3.4);
      // a breath of air moves the closed curtain; once open it hangs still
      const sway = 0.0016 * (1 - k);
      frame++;
      if (!moving && (sway < 1e-4 || frame % 2)) return;
      kTop = k;
      const s = 1 - k * (1 - 0.085);
      for (const p of pelmets) p.set(s);
      for (const p of panels) p.set(k, kBot, t, sway);
    },
  };
}
