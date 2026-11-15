// Visual "skins" for the marionettes. Physics lives in puppet.js; a skin only
// hangs meshes on the particle positions and orientation frames each frame.
//   knightSkin  — Sir Pip, the player's little armoured knight
//   dragonSkin  — Marlo, the AI's dragon (stands on its hind legs, theatre-style)
// Both share the control-bar visuals: glowing holographic bars for the player
// (they're the thing you reach for), carved wood for the robot puppeteer.
import * as THREE from "three";
import { mergeStatic } from "./perf.js";

const UP = new THREE.Vector3(0, 1, 0);
const tv = new THREE.Vector3();
const tq = new THREE.Quaternion();

// place a height-1 mesh (cylinder/box along +Y) between two points
export function span(mesh, A, B) {
  tv.subVectors(B, A);
  const len = tv.length();
  mesh.position.addVectors(A, B).multiplyScalar(0.5);
  mesh.scale.y = Math.max(len, 1e-4);
  if (len > 1e-6) mesh.quaternion.setFromUnitVectors(UP, tv.divideScalar(len));
}
// place an object at point P + offset rotated by q, oriented by q
export function pin(obj, P, q, off) {
  obj.position.copy(off ? tv.set(off[0], off[1], off[2]).applyQuaternion(q).add(P) : P);
  obj.quaternion.copy(q);
}

export function shadowed(root, on = true) {
  root.traverse((o) => { if (o.isMesh) { o.castShadow = on; o.receiveShadow = false; } });
  return root;
}

// ---------------------------------------------------------------------------
// Control bars
function glowMaterial(color, opacity) {
  return new THREE.MeshBasicMaterial({ color, transparent: true, opacity, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false });
}

export function makeBars(m, style, assets) {
  const group = new THREE.Group();
  const mk = (kind) => {
    const g = new THREE.Group();
    const parts = kind === "main"
      ? [[0.016, 0.014, 0.2, 0, 0, 0.005], [0.14, 0.012, 0.014, 0, 0, 0.085], [0.09, 0.012, 0.014, 0, 0, -0.004], [0.06, 0.012, 0.014, 0, 0, -0.075]]
      : [[0.155, 0.012, 0.014, 0, 0, 0]];
    const glow = [];
    if (style === "holo") {
      const core = new THREE.MeshBasicMaterial({ color: 0xb8fbff, toneMapped: false });
      const halo = glowMaterial(0x29e6ff, 0.35);
      const halo2 = glowMaterial(0x0aa8ff, 0.12);
      for (const [w, h, d, x, y, z] of parts) {
        const r = Math.min(w, h, d) * 0.5;
        const len = Math.max(w, d);
        const along = w > d ? "x" : "z";
        const mkTube = (rad, mat) => {
          const t = new THREE.Mesh(new THREE.CapsuleGeometry(rad, len - rad * 2, 4, 12), mat);
          if (along === "x") t.rotation.z = Math.PI / 2; else t.rotation.x = Math.PI / 2;
          t.position.set(x, y, z);
          return t;
        };
        g.add(mkTube(r * 0.55, core));
        const h1 = mkTube(r * 1.25, halo); g.add(h1); glow.push(h1);
        const h2 = mkTube(r * 2.2, halo2); g.add(h2); glow.push(h2);
      }
      // grip knob
      const knob = new THREE.Mesh(new THREE.SphereGeometry(0.011, 16, 12), core);
      knob.position.set(0, kind === "main" ? 0.04 : 0.008, kind === "main" ? -0.03 : 0);
      if (kind === "main") {
        const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.004, 0.04, 8), core);
        stem.position.set(0, 0.02, -0.03);
        g.add(stem);
      }
      g.add(knob);
      const kh = new THREE.Mesh(new THREE.SphereGeometry(0.022, 16, 12), halo.clone());
      kh.position.copy(knob.position);
      g.add(kh); glow.push(kh);
    } else {
      const wood = new THREE.MeshStandardMaterial({ color: 0x8a5a36, roughness: 0.55, map: assets?.tex?.walnut?.map || null });
      for (const [w, h, d, x, y, z] of parts) {
        const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), wood);
        b.position.set(x, y, z);
        b.castShadow = true;
        g.add(b);
      }
      if (kind === "main") {
        const grip = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.009, 0.05, 12), wood);
        grip.position.set(0, 0.025, -0.03);
        g.add(grip);
      }
    }
    group.add(g);
    // the bar's pieces never move relative to each other: one draw call per material
    // (the glow loop below still works: it animates the shared materials)
    mergeStatic(g);
    return { g, glow };
  };
  const main = mk("main");
  const hands = mk("hands");
  const levels = new Map([[m.main, 0], [m.hands, 0]]);
  return {
    group,
    setHighlight(bar, a) { levels.set(bar, a); },
    update(t) {
      main.g.position.copy(m.main.position); main.g.quaternion.copy(m.main.quaternion);
      hands.g.position.copy(m.hands.position); hands.g.quaternion.copy(m.hands.quaternion);
      if (style === "holo") {
        for (const [bar, parts] of [[m.main, main], [m.hands, hands]]) {
          const a = levels.get(bar);
          const pulse = 1 + Math.sin(t * 3.2) * 0.12;
          parts.glow.forEach((o, i) => {
            const base = i % 2 === 0 ? 0.32 : 0.1;
            o.material.opacity = base * pulse * (0.75 + a * 1.4);
          });
        }
      }
    },
  };
}

// ---------------------------------------------------------------------------
// Sir Pip, the knight
export function knightSkin(assets, { ghost = false } = {}) {
  return (m) => {
    const group = new THREE.Group();
    const ghostMat = ghost ? new THREE.MeshBasicMaterial({ color: 0x7fdcff, transparent: true, opacity: 0.22, depthWrite: false, blending: THREE.AdditiveBlending }) : null;
    const M = (params) => ghostMat || new THREE.MeshStandardMaterial(params);
    const steel = M({ color: 0xb4b9c1, metalness: 1, roughness: 0.34 });
    const darkSteel = M({ color: 0x8d939c, metalness: 1, roughness: 0.38 });
    const brass = M({ color: 0xc9a14a, metalness: 1, roughness: 0.3 });
    const cloth = M({ color: 0x1f4fa0, roughness: 0.85 });
    const leather = M({ color: 0x3b2618, roughness: 0.7 });
    const skin = M({ color: 0xe0b08a, roughness: 0.6 });
    const hair = M({ color: 0x2b1a10, roughness: 0.8 });
    const plumeMat = M({ color: 0x2a6fd6, roughness: 0.75, side: THREE.DoubleSide });
    const add = (geo, mat) => { const o = new THREE.Mesh(geo, mat); group.add(o); return o; };

    // torso: breastplate (lathe), tabard, belt, faulds
    const chestPts = [];
    for (let i = 0; i <= 10; i++) {
      const t = i / 10;
      chestPts.push(new THREE.Vector2(0.024 + Math.sin(t * Math.PI) * 0.011 - t * 0.004, -0.04 + t * 0.075));
    }
    const chestG = new THREE.LatheGeometry(chestPts, 24);
    chestG.scale(1.15, 1, 0.78);
    const chest = add(chestG, steel);
    const ridge = add(new THREE.BoxGeometry(0.003, 0.06, 0.006), steel);
    const tabard = add(new THREE.BoxGeometry(0.03, 0.05, 0.004), cloth);
    const tabardSkirt = add(new THREE.BoxGeometry(0.032, 0.05, 0.003), cloth);
    tabardSkirt.geometry.translate(0, -0.025, 0);
    const belt = add(new THREE.CylinderGeometry(0.029, 0.029, 0.007, 20), leather);
    belt.scale.z = 0.8;
    const buckle = add(new THREE.BoxGeometry(0.009, 0.008, 0.003), brass);
    const faulds = [0, 1, 2].map((i) => {
      const f = add(new THREE.CylinderGeometry(0.027 + i * 0.002, 0.03 + i * 0.002, 0.009, 20, 1, true), darkSteel);
      f.material.side = THREE.DoubleSide;
      f.scale.z = 0.8;
      return f;
    });
    const gorget = add(new THREE.CylinderGeometry(0.014, 0.024, 0.012, 20), steel);

    // shoulders (pauldrons)
    const pauldronG = new THREE.SphereGeometry(0.0135, 16, 10, 0, Math.PI * 2, 0, Math.PI * 0.55);
    const pauldrons = [add(pauldronG, steel), add(pauldronG, steel)];

    // limbs: [a, b, mesh]
    const limbG = (r1, r2) => new THREE.CylinderGeometry(r1, r2, 1, 14);
    const limbs = [
      ["lS", "lE", add(limbG(0.0085, 0.0075), steel)], ["rS", "rE", add(limbG(0.0085, 0.0075), steel)],
      ["lE", "lW", add(limbG(0.0075, 0.009), steel)], ["rE", "rW", add(limbG(0.0075, 0.009), steel)],
      ["lH", "lK", add(limbG(0.011, 0.009), steel)], ["rH", "rK", add(limbG(0.011, 0.009), steel)],
      ["lK", "lF", add(limbG(0.0085, 0.0075), steel)], ["rK", "rF", add(limbG(0.0085, 0.0075), steel)],
      ["neck", "head", add(limbG(0.007, 0.007), leather)],
    ];
    const jointG = new THREE.SphereGeometry(0.0085, 14, 10);
    const joints = ["lE", "rE", "lK", "rK"].map((n) => [n, add(jointG, darkSteel)]);
    const gauntG = new THREE.BoxGeometry(0.014, 0.018, 0.012);
    const gauntlets = [["lW", add(gauntG, darkSteel)], ["rW", add(gauntG, darkSteel)]];
    const sabG = new THREE.CapsuleGeometry(0.008, 0.02, 4, 10);
    sabG.rotateX(Math.PI / 2);
    sabG.scale(1.05, 0.75, 1);
    sabG.translate(0, 0, 0.008);
    const sabatons = [["lF", add(sabG, steel)], ["rF", add(sabG, steel)]];

    // head: open-faced great helm with raised visor, face, mustache, plume
    const head = new THREE.Group();
    group.add(head);
    const face = new THREE.Mesh(new THREE.SphereGeometry(0.0175, 20, 16), skin);
    face.scale.set(0.95, 1.08, 1);
    face.position.set(0, -0.002, 0.004);
    const helmDome = new THREE.Mesh(new THREE.SphereGeometry(0.023, 24, 16, 0, Math.PI * 2, 0, Math.PI * 0.5), steel);
    helmDome.position.y = 0.004;
    const helmSides = new THREE.Mesh(new THREE.CylinderGeometry(0.023, 0.022, 0.03, 24, 1, true, Math.PI * 0.32, Math.PI * 1.36), steel);
    helmSides.material = steel;
    helmSides.position.set(0, -0.011, 0);
    helmSides.rotation.y = Math.PI;
    const visor = new THREE.Mesh(new THREE.SphereGeometry(0.0245, 20, 10, -Math.PI * 0.35, Math.PI * 0.7, Math.PI * 0.18, Math.PI * 0.2), steel);
    visor.material = steel;
    visor.position.y = 0.006;
    const crest = new THREE.Mesh(new THREE.BoxGeometry(0.003, 0.012, 0.03), brass);
    crest.position.set(0, 0.027, 0);
    const eyeG = new THREE.SphereGeometry(0.0022, 8, 6);
    const eyeMat = M({ color: 0x1a1410, roughness: 0.3 });
    const eyes = [-1, 1].map((s) => { const e = new THREE.Mesh(eyeG, eyeMat); e.position.set(s * 0.0065, 0.003, 0.02); return e; });
    const brows = [-1, 1].map((s) => { const b = new THREE.Mesh(new THREE.BoxGeometry(0.007, 0.0016, 0.002), hair); b.position.set(s * 0.0065, 0.0075, 0.0205); b.rotation.z = s * -0.15; return b; });
    const nose = new THREE.Mesh(new THREE.SphereGeometry(0.0035, 10, 8), skin);
    nose.scale.set(0.8, 1, 1.1);
    nose.position.set(0, -0.002, 0.0215);
    const mustacheG = new THREE.TorusGeometry(0.0065, 0.0021, 8, 16, Math.PI);
    const mustache = new THREE.Mesh(mustacheG, hair);
    mustache.position.set(0, -0.0065, 0.0205);
    mustache.scale.set(1.15, 0.7, 1);
    const plume = new THREE.Group();
    for (let i = 0; i < 9; i++) {
      const a = (i - 4) * 0.09;
      const curve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(0, 0, 0),
        new THREE.Vector3(Math.sin(a) * 0.01, 0.022, -0.006),
        new THREE.Vector3(Math.sin(a) * 0.016, 0.03, -0.024),
        new THREE.Vector3(Math.sin(a) * 0.018, 0.022, -0.042),
      ]);
      const tube = new THREE.Mesh(new THREE.TubeGeometry(curve, 12, 0.0032 - Math.abs(i - 4) * 0.0002, 6), plumeMat);
      plume.add(tube);
    }
    plume.position.set(0, 0.024, 0.004);
    head.add(face, helmDome, helmSides, visor, crest, ...eyes, ...brows, nose, mustache, plume);
    mergeStatic(head, [plume]);
    mergeStatic(plume);

    const bars = makeBars(m, ghost ? "ghost" : "holo", assets);
    if (ghost) bars.group.visible = false;
    group.add(bars.group);
    if (!ghost) shadowed(group);
    bars.group.traverse((o) => { if (o.isMesh) o.castShadow = false; });

    let t = 0;
    const tmpA = new THREE.Vector3();
    return {
      group,
      bars: bars.group,
      setHighlight: bars.setHighlight,
      update(f, dt) {
        t += dt;
        const P = (n) => m.get(n);
        // torso centre between neck and pelvis
        const mid = tmpA.copy(P("neck")).lerp(P("pelvis"), 0.45);
        pin(chest, mid, f.qUpper, [0, 0.004, 0]);
        pin(ridge, mid, f.qUpper, [0, 0.006, 0.026]);
        pin(tabard, mid, f.qUpper, [0, -0.012, 0.0255]);
        pin(gorget, P("neck"), f.qUpper, [0, -0.002, 0]);
        pin(belt, P("pelvis"), f.qLower, [0, 0.016, 0]);
        pin(buckle, P("pelvis"), f.qLower, [0, 0.016, 0.024]);
        pin(tabardSkirt, P("pelvis"), f.qLower, [0, 0.012, 0.026]);
        faulds.forEach((fd, i) => pin(fd, P("pelvis"), f.qLower, [0, 0.009 - i * 0.008, 0]));
        pin(pauldrons[0], P("lS"), f.qUpper, [-0.004, 0.0, 0]);
        pin(pauldrons[1], P("rS"), f.qUpper, [0.004, 0.0, 0]);
        for (const [a, b, mesh] of limbs) span(mesh, P(a), P(b));
        for (const [n, mesh] of joints) mesh.position.copy(P(n));
        for (const [n, mesh] of gauntlets) pin(mesh, P(n), f.qUpper, [0, -0.004, 0]);
        for (const [n, mesh] of sabatons) pin(mesh, P(n), f.yawQ, [0, 0.002, 0]);
        pin(head, P("head"), f.qUpper);
        plume.rotation.x = Math.sin(t * 2.3) * 0.05;
        bars.update(t);
      },
    };
  };
}

// ---------------------------------------------------------------------------
// Marlo, the dragon
function scaleTexture() {
  const c = document.createElement("canvas");
  c.width = c.height = 256;
  const g = c.getContext("2d");
  g.fillStyle = "#6d7a35";
  g.fillRect(0, 0, 256, 256);
  const r = 16;
  for (let row = 0; row < 18; row++) {
    for (let col = 0; col < 10; col++) {
      const x = col * r * 1.7 + (row % 2) * r * 0.85;
      const y = row * r * 0.75;
      const grad = g.createRadialGradient(x, y - 4, 2, x, y, r);
      grad.addColorStop(0, "#9aa652");
      grad.addColorStop(0.7, "#66722f");
      grad.addColorStop(1, "#3c451b");
      g.fillStyle = grad;
      g.beginPath();
      g.arc(x, y, r, 0, Math.PI);
      g.fill();
    }
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

export function dragonSkin(assets) {
  return (m) => {
    const group = new THREE.Group();
    const scales = scaleTexture();
    scales.repeat.set(2, 2);
    const hide = new THREE.MeshStandardMaterial({ color: 0xffffff, map: scales, bumpMap: scales, bumpScale: 1.5, roughness: 0.55 });
    const belly = new THREE.MeshStandardMaterial({ color: 0xd08a3f, roughness: 0.5 });
    const horn = new THREE.MeshStandardMaterial({ color: 0xe0ad55, roughness: 0.35 });
    const claw = new THREE.MeshStandardMaterial({ color: 0xf0e2c0, roughness: 0.3 });
    const wingMat = new THREE.MeshStandardMaterial({ color: 0xc8743a, roughness: 0.6, side: THREE.DoubleSide, transparent: true, opacity: 0.95 });
    const eyeMat = new THREE.MeshStandardMaterial({ color: 0xf2a51f, roughness: 0.15, emissive: 0x6a3a00, emissiveIntensity: 0.4 });
    const pupilMat = new THREE.MeshStandardMaterial({ color: 0x120c06, roughness: 0.2 });
    const add = (geo, mat) => { const o = new THREE.Mesh(geo, mat); group.add(o); return o; };

    // body
    const torso = add(new THREE.SphereGeometry(0.034, 24, 18), hide);
    torso.scale.set(1.0, 1.25, 0.92);
    const bellyPlate = add(new THREE.SphereGeometry(0.031, 20, 14, -Math.PI * 0.3, Math.PI * 0.6, Math.PI * 0.15, Math.PI * 0.7), belly);
    bellyPlate.scale.set(1.0, 1.25, 1.0);
    const bellyRidges = [0, 1, 2, 3, 4].map(() => add(new THREE.TorusGeometry(0.026, 0.0016, 6, 20, Math.PI * 0.55), belly));
    const hips = add(new THREE.SphereGeometry(0.029, 20, 14), hide);
    hips.scale.set(1.1, 0.85, 0.95);

    const limbG = (r1, r2) => new THREE.CylinderGeometry(r1, r2, 1, 14);
    const limbs = [
      ["lS", "lE", add(limbG(0.0085, 0.007), hide)], ["rS", "rE", add(limbG(0.0085, 0.007), hide)],
      ["lE", "lW", add(limbG(0.007, 0.0055), hide)], ["rE", "rW", add(limbG(0.007, 0.0055), hide)],
      ["lH", "lK", add(limbG(0.016, 0.011), hide)], ["rH", "rK", add(limbG(0.016, 0.011), hide)],
      ["lK", "lF", add(limbG(0.01, 0.008), hide)], ["rK", "rF", add(limbG(0.01, 0.008), hide)],
    ];
    const kneeG = new THREE.SphereGeometry(0.012, 14, 10);
    const knees = ["lK", "rK"].map((n) => [n, add(kneeG, hide)]);
    // feet with three claws
    const feet = ["lF", "rF"].map((n) => {
      const ft = new THREE.Group();
      const pad = new THREE.Mesh(new THREE.SphereGeometry(0.012, 14, 10), hide);
      pad.scale.set(1, 0.55, 1.4);
      pad.position.z = 0.006;
      ft.add(pad);
      for (const s of [-1, 0, 1]) {
        const c = new THREE.Mesh(new THREE.ConeGeometry(0.0028, 0.011, 8), claw);
        c.rotation.x = Math.PI / 2;
        c.position.set(s * 0.0065, -0.002, 0.024);
        ft.add(c);
      }
      group.add(ft);
      return [n, ft];
    });
    const hands = ["lW", "rW"].map((n) => {
      const h = new THREE.Group();
      const palm = new THREE.Mesh(new THREE.SphereGeometry(0.0075, 12, 8), hide);
      h.add(palm);
      for (const s of [-1, 0, 1]) {
        const c = new THREE.Mesh(new THREE.ConeGeometry(0.0018, 0.008, 6), claw);
        c.rotation.x = Math.PI;
        c.position.set(s * 0.004, -0.008, 0.003);
        h.add(c);
      }
      group.add(h);
      return [n, h];
    });

    // neck + head
    const neck = add(limbG(0.014, 0.018), hide);
    const head = new THREE.Group();
    group.add(head);
    const skull = new THREE.Mesh(new THREE.SphereGeometry(0.024, 22, 16), hide);
    skull.scale.set(1, 0.92, 1);
    const snout = new THREE.Mesh(new THREE.SphereGeometry(0.017, 20, 14), hide);
    snout.scale.set(0.95, 0.72, 1.35);
    snout.position.set(0, -0.007, 0.026);
    const jaw = new THREE.Mesh(new THREE.SphereGeometry(0.014, 16, 10), belly);
    jaw.scale.set(0.95, 0.45, 1.4);
    jaw.position.set(0, -0.016, 0.022);
    const nostrils = [-1, 1].map((s) => { const n = new THREE.Mesh(new THREE.SphereGeometry(0.0022, 8, 6), pupilMat); n.position.set(s * 0.006, -0.002, 0.047); return n; });
    const eyes = [-1, 1].map((s) => {
      const e = new THREE.Group();
      const ball = new THREE.Mesh(new THREE.SphereGeometry(0.0072, 16, 12), eyeMat);
      const pupil = new THREE.Mesh(new THREE.SphereGeometry(0.0035, 10, 8), pupilMat);
      pupil.scale.set(0.45, 1, 0.5);
      pupil.position.z = 0.0058;
      const lid = new THREE.Mesh(new THREE.SphereGeometry(0.0082, 14, 8, 0, Math.PI * 2, 0, Math.PI * 0.42), hide);
      lid.rotation.x = -0.35;
      e.add(ball, pupil, lid);
      e.position.set(s * 0.012, 0.006, 0.017);
      e.rotation.y = s * 0.35;
      return e;
    });
    const horns = [-1, 1].map((s) => {
      const curve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(s * 0.012, 0.014, -0.004),
        new THREE.Vector3(s * 0.02, 0.028, -0.014),
        new THREE.Vector3(s * 0.022, 0.036, -0.03),
      ]);
      const tube = new THREE.Mesh(new THREE.TubeGeometry(curve, 10, 0.004, 8), horn);
      const tip = new THREE.Mesh(new THREE.ConeGeometry(0.004, 0.012, 8), horn);
      tip.position.set(s * 0.022, 0.038, -0.036);
      tip.rotation.x = -1.1;
      const g = new THREE.Group();
      g.add(tube, tip);
      return g;
    });
    const smallHorns = [-1, 1].map((s) => { const c = new THREE.Mesh(new THREE.ConeGeometry(0.0032, 0.012, 8), horn); c.position.set(s * 0.021, 0.0, -0.006); c.rotation.z = s * -1.2; return c; });
    const crestSpikes = [0, 1, 2].map((i) => { const c = new THREE.Mesh(new THREE.ConeGeometry(0.003, 0.01, 6), horn); c.position.set(0, 0.022 - i * 0.004, -0.008 - i * 0.008); c.rotation.x = -0.6; return c; });
    head.add(skull, snout, jaw, ...nostrils, ...eyes, ...horns, ...smallHorns, ...crestSpikes);
    mergeStatic(head);
    for (const [, ft] of feet) mergeStatic(ft);
    for (const [, h] of hands) mergeStatic(h);

    // back spikes
    const backSpikes = [0, 1, 2, 3].map(() => add(new THREE.ConeGeometry(0.0045, 0.014, 6), horn));

    // wings: bat-like membrane with struts
    const wingShape = new THREE.Shape();
    wingShape.moveTo(0, 0);
    wingShape.lineTo(0.02, 0.035);
    wingShape.lineTo(0.06, 0.05);
    wingShape.quadraticCurveTo(0.058, 0.032, 0.068, 0.018);
    wingShape.quadraticCurveTo(0.054, 0.016, 0.055, 0.0);
    wingShape.quadraticCurveTo(0.04, 0.002, 0.038, -0.016);
    wingShape.quadraticCurveTo(0.022, -0.008, 0.012, -0.022);
    wingShape.lineTo(0, 0);
    const wingG = new THREE.ShapeGeometry(wingShape, 8);
    const wings = [-1, 1].map((s) => {
      const pivot = new THREE.Group();
      const mem = new THREE.Mesh(wingG, wingMat);
      mem.scale.x = s;
      pivot.add(mem);
      for (const [x, y] of [[0.06, 0.05], [0.068, 0.018], [0.055, 0.0]]) {
        const strut = new THREE.Mesh(new THREE.CylinderGeometry(0.0013, 0.0018, 1, 6), horn);
        span(strut, new THREE.Vector3(s * 0.02, 0.035, 0.0005), new THREE.Vector3(s * x, y, 0.0005));
        pivot.add(strut);
      }
      const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.002, 0.0026, 1, 6), horn);
      span(arm, new THREE.Vector3(0, 0, 0), new THREE.Vector3(s * 0.02, 0.035, 0));
      pivot.add(arm);
      group.add(pivot);
      mergeStatic(pivot);
      return pivot;
    });

    // tail: its own little verlet chain dragged behind the hips
    const N = 7;
    const tail = Array.from({ length: N }, () => ({ p: new THREE.Vector3(), q: new THREE.Vector3(), init: false }));
    const tailMeshes = [];
    for (let i = 0; i < N - 1; i++) {
      const r1 = 0.014 * (1 - i / N) + 0.002, r2 = 0.014 * (1 - (i + 1) / N) + 0.0015;
      tailMeshes.push(add(new THREE.CylinderGeometry(r2, r1, 1, 12), hide));
    }
    const tailJoints = Array.from({ length: N - 1 }, (_, i) => add(new THREE.SphereGeometry(0.014 * (1 - (i + 1) / N) + 0.0015, 10, 8), hide));
    const tailSpikes = Array.from({ length: N - 2 }, () => add(new THREE.ConeGeometry(0.0032, 0.009, 6), horn));
    const tailTip = add(new THREE.ConeGeometry(0.008, 0.016, 4), horn);

    const bars = makeBars(m, "wood", assets);
    group.add(bars.group);
    shadowed(group);

    let t = 0;
    const tmpA = new THREE.Vector3(), tmpB = new THREE.Vector3();
    let lastY = 0, flap = 0;
    return {
      group,
      bars: bars.group,
      update(f, dt) {
        t += dt;
        const P = (n) => m.get(n);
        const mid = tmpA.copy(P("neck")).lerp(P("pelvis"), 0.5);
        pin(torso, mid, f.qUpper, [0, 0, 0.002]);
        pin(bellyPlate, mid, f.qUpper, [0, -0.002, 0.004]);
        bellyRidges.forEach((r, i) => {
          pin(r, mid, f.qUpper, [0, 0.028 - i * 0.013, 0.004]);
          r.rotateX(Math.PI / 2); r.rotateZ(Math.PI * 0.225 + Math.PI);
          r.scale.set(1 - Math.abs(i - 2) * 0.12, 1, 1);
        });
        pin(hips, P("pelvis"), f.qLower, [0, 0.004, -0.002]);
        for (const [a, b, mesh] of limbs) span(mesh, P(a), P(b));
        for (const [n, mesh] of knees) mesh.position.copy(P(n));
        for (const [n, ft] of feet) pin(ft, P(n), f.yawQ, [0, 0.0, 0]);
        for (const [n, h] of hands) pin(h, P(n), f.qUpper);
        span(neck, tmpB.copy(P("neck")).addScaledVector(f.up, -0.006), P("head"));
        pin(head, P("head"), f.qUpper, [0, 0.004, 0.004]);
        backSpikes.forEach((s, i) => { pin(s, mid, f.qUpper, [0, 0.03 - i * 0.017, -0.03]); s.rotateX(-0.5); });

        // wings flap harder when the body moves vertically (jumps, dances)
        const y = P("chest").y;
        const vy = dt > 0 ? (y - lastY) / dt : 0;
        lastY = y;
        flap += (Math.max(m.flapBoost || 0, Math.min(1, Math.abs(vy) * 4)) - flap) * Math.min(1, dt * 4);
        const ang = 0.35 + Math.sin(t * (2 + flap * 10)) * (0.12 + flap * 0.5);
        wings.forEach((w, i) => {
          const s = i === 0 ? -1 : 1;
          pin(w, mid, f.qUpper, [s * 0.012, 0.02, -0.028]);
          w.rotateY(s * -(0.9 - ang));
          w.rotateX(-0.25);
        });

        // tail chain
        // the tail trails behind; in horizontal flight "behind" is along the spine, not the facing
        const back = Math.abs(f.up.y) < 0.6 ? tmpB.copy(f.up).multiplyScalar(-1).setY(0).normalize() : tmpB.copy(f.facing).multiplyScalar(-1);
        const base = P("pelvis").clone().addScaledVector(back, 0.025).add(new THREE.Vector3(0, -0.004, 0));
        const segLen = 0.018;
        for (let i = 0; i < N; i++) {
          const n = tail[i];
          if (!n.init) { n.p.copy(base).addScaledVector(back, segLen * i); n.p.y = Math.max(0.006, base.y - i * 0.012); n.q.copy(n.p); n.init = true; }
        }
        tail[0].p.copy(base); tail[0].q.copy(base);
        for (let i = 1; i < N; i++) {
          const n = tail[i];
          const vel = tv.subVectors(n.p, n.q).multiplyScalar(0.9);
          n.q.copy(n.p);
          n.p.add(vel);
          n.p.y -= 0.0012;
          n.p.addScaledVector(back, 0.0006); // tails like to trail behind
          n.p.x += Math.sin(t * 2 + i) * 0.00015;
        }
        for (let it = 0; it < 3; it++) {
          for (let i = 1; i < N; i++) {
            const a = tail[i - 1].p, b = tail[i].p;
            tv.subVectors(b, a);
            const d = tv.length() || 1e-6;
            b.copy(a).addScaledVector(tv, segLen / d);
            if (b.y < 0.005) b.y = 0.005;
          }
        }
        for (let i = 0; i < N - 1; i++) {
          span(tailMeshes[i], tail[i].p, tail[i + 1].p);
          tailJoints[i].position.copy(tail[i + 1].p);
        }
        for (let i = 0; i < N - 2; i++) {
          const pmid = tmpA.copy(tail[i].p).lerp(tail[i + 1].p, 0.5);
          tailSpikes[i].position.copy(pmid).y += 0.012 * (1 - i / N);
        }
        const tipDir = tv.subVectors(tail[N - 1].p, tail[N - 2].p).normalize();
        tailTip.position.copy(tail[N - 1].p).addScaledVector(tipDir, 0.006);
        tailTip.quaternion.setFromUnitVectors(UP, tipDir);
        tailTip.scale.set(1, 1, 0.35);

        bars.update(t);
      },
    };
  };
}
