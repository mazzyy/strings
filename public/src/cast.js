// The guest characters you meet on Sir Pip's journey. Each is a marionette on
// the same 16-particle rig as the knight (so the same physics, AI clips and
// detector work for all of them), dressed by a procedural "skin":
//   Old Bramble   — a forest wizard: pointed hat, long beard, glowing staff
//   Captain Pegg  — a pirate: tricorn, eyepatch, red coat, peg leg, a parrot
//   Grumble       — a mossy bridge troll: big nose, tusks, pointed ears
import * as THREE from "three";
import { span, pin, shadowed, makeBars } from "./skins.js";
import { mergeStatic } from "./perf.js";

// A generic humanoid skin. `build(api)` adds meshes and says where they hang.
function humanoidSkin(assets, build) {
  return (m) => {
    const group = new THREE.Group();
    const head = new THREE.Group();
    group.add(head);
    const pins = [], spans = [], ats = [], anims = [];
    const api = {
      group, head,
      M: (p) => new THREE.MeshStandardMaterial(p),
      add: (geo, mat, parent = group) => { const o = new THREE.Mesh(geo, mat); parent.add(o); return o; },
      pin: (mesh, part, frame = "upper", off = null) => pins.push([mesh, part, frame, off]),
      span: (a, b, mesh) => spans.push([a, b, mesh]),
      at: (mesh, part) => ats.push([mesh, part]),
      anim: (fn) => anims.push(fn),
      headSkip: [],
    };
    build(api);
    mergeStatic(head, api.headSkip);
    const bars = makeBars(m, "wood", assets);
    group.add(bars.group);
    shadowed(group);
    let t = 0;
    const mid = new THREE.Vector3();
    const P = (n) => (n === "mid" ? mid.copy(m.get("neck")).lerp(m.get("pelvis"), 0.45) : m.get(n));
    return {
      group,
      bars: bars.group,
      setHighlight: bars.setHighlight,
      update(f, dt) {
        t += dt;
        for (const [mesh, part, fr, off] of pins) pin(mesh, P(part), fr === "lower" ? f.qLower : fr === "yaw" ? f.yawQ : f.qUpper, off);
        for (const [a, b, mesh] of spans) span(mesh, P(a), P(b));
        for (const [mesh, part] of ats) mesh.position.copy(P(part));
        pin(head, P("head"), f.qUpper);
        for (const fn of anims) fn(t, f, P);
        bars.update(t);
      },
    };
  };
}

const limbG = (r1, r2, seg = 12) => new THREE.CylinderGeometry(r1, r2, 1, seg);
function torsoLathe(r, h, bulge, seg = 22) {
  const pts = [];
  for (let i = 0; i <= 10; i++) { const t = i / 10; pts.push(new THREE.Vector2(r + Math.sin(t * Math.PI) * bulge - t * r * 0.15, -h / 2 + t * h)); }
  return new THREE.LatheGeometry(pts, seg);
}
function limbs(api, arms, legs, lowerLegL = null) {
  const { add, span } = api;
  span("lS", "lE", add(limbG(...arms[0]), arms[1])); span("rS", "rE", add(limbG(...arms[0]), arms[1]));
  span("lE", "lW", add(limbG(...arms[2]), arms[3] || arms[1])); span("rE", "rW", add(limbG(...arms[2]), arms[3] || arms[1]));
  span("lH", "lK", add(limbG(...legs[0]), legs[1])); span("rH", "rK", add(limbG(...legs[0]), legs[1]));
  span("lK", "lF", lowerLegL || add(limbG(...legs[2]), legs[3] || legs[1])); span("rK", "rF", add(limbG(...legs[2]), legs[3] || legs[1]));
}
function starTexture(bg, fg) {
  const c = document.createElement("canvas"); c.width = c.height = 128;
  const g = c.getContext("2d"); g.fillStyle = bg; g.fillRect(0, 0, 128, 128);
  g.fillStyle = fg;
  for (let i = 0; i < 14; i++) {
    const x = (i * 37) % 128, y = (i * 59) % 128, r = 3 + (i % 3) * 2;
    g.beginPath();
    for (let k = 0; k < 10; k++) { const a = (k / 10) * Math.PI * 2, rr = k % 2 ? r * 0.45 : r; g.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); }
    g.fill();
  }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(2, 2);
  return t;
}

// ---------------------------------------------------------------------------
export function wizardSkin(assets) {
  return humanoidSkin(assets, (api) => {
    const { add, M, head, pin, at, anim } = api;
    const robe = M({ color: 0x4a2f86, roughness: 0.85, map: starTexture("#4a2f86", "#d9c06a") });
    const robeDark = M({ color: 0x35215f, roughness: 0.9 });
    const skin = M({ color: 0xe6bc98, roughness: 0.65 });
    const beardMat = M({ color: 0xf2f0ea, roughness: 0.95 });
    const gold = M({ color: 0xd8ac4f, metalness: 1, roughness: 0.3 });
    const wood = M({ color: 0x6a4425, roughness: 0.7 });
    const crystal = new THREE.MeshStandardMaterial({ color: 0x9ff3ff, emissive: 0x52e3ff, emissiveIntensity: 1.6, roughness: 0.2, toneMapped: false });

    const chest = add(torsoLathe(0.025, 0.075, 0.009), robe); chest.scale.set(1.15, 1, 0.8);
    pin(chest, "mid", "upper", [0, 0.004, 0]);
    const skirt = add(new THREE.CylinderGeometry(0.027, 0.045, 0.085, 20, 1, true), robe);
    skirt.material.side = THREE.DoubleSide;
    pin(skirt, "pelvis", "lower", [0, -0.03, 0]);
    const sash = add(new THREE.TorusGeometry(0.027, 0.003, 6, 20), gold); sash.rotation.x = Math.PI / 2;
    const sashG = new THREE.Group(); sashG.add(sash); api.group.add(sashG);
    pin(sashG, "pelvis", "lower", [0, 0.014, 0]);
    limbs(api, [[0.008, 0.012], robe, [0.012, 0.016], robeDark], [[0.008, 0.007], robeDark, [0.007, 0.006]]);
    for (const n of ["lW", "rW"]) at(add(new THREE.SphereGeometry(0.0068, 12, 10), skin), n);
    const shoeG = new THREE.CapsuleGeometry(0.0065, 0.018, 4, 8); shoeG.rotateX(Math.PI / 2); shoeG.translate(0, 0, 0.007);
    for (const n of ["lF", "rF"]) pin(add(shoeG, robeDark), n, "yaw", [0, 0.002, 0]);

    // head: face, long beard, bushy brows, pointed hat with a brim and a moon
    const face = new THREE.Mesh(new THREE.SphereGeometry(0.0175, 20, 16), skin); face.scale.set(0.95, 1.05, 1);
    const nose = new THREE.Mesh(new THREE.SphereGeometry(0.0042, 10, 8), skin); nose.position.set(0, -0.001, 0.018); nose.scale.set(0.9, 1, 1.3);
    const eyeMat = M({ color: 0x1b2a3a, roughness: 0.3 });
    const eyes = [-1, 1].map((s) => { const e = new THREE.Mesh(new THREE.SphereGeometry(0.002, 8, 6), eyeMat); e.position.set(s * 0.0065, 0.004, 0.0165); return e; });
    const brows = [-1, 1].map((s) => { const b = new THREE.Mesh(new THREE.CapsuleGeometry(0.0018, 0.006, 3, 6), beardMat); b.rotation.z = Math.PI / 2 + s * 0.25; b.position.set(s * 0.0068, 0.0085, 0.017); return b; });
    const beard = new THREE.Mesh(new THREE.ConeGeometry(0.016, 0.05, 14), beardMat); beard.rotation.x = Math.PI; beard.position.set(0, -0.026, 0.01); beard.scale.set(1, 1, 0.7);
    const mustache = new THREE.Mesh(new THREE.TorusGeometry(0.007, 0.0026, 8, 16, Math.PI), beardMat); mustache.position.set(0, -0.006, 0.0175); mustache.scale.set(1.3, 0.8, 1);
    const brim = new THREE.Mesh(new THREE.CylinderGeometry(0.034, 0.034, 0.003, 28), robeDark); brim.position.y = 0.012;
    // a hat that flops over at the tip
    const hatCurve = new THREE.CatmullRomCurve3([new THREE.Vector3(0, 0.012, 0), new THREE.Vector3(0, 0.04, -0.002), new THREE.Vector3(0, 0.062, -0.01), new THREE.Vector3(0, 0.072, -0.026)]);
    const hatGeo = new THREE.TubeGeometry(hatCurve, 16, 1, 16);
    const pos = hatGeo.attributes.position;
    // taper the tube from a wide base to a point
    for (let i = 0; i < pos.count; i++) {
      const ring = Math.floor(i / 17), k = ring / 16;
      const c = hatCurve.getPointAt(k);
      const r = 0.022 * (1 - k) + 0.0015;
      pos.setXYZ(i, c.x + (pos.getX(i) - c.x) * r, c.y + (pos.getY(i) - c.y) * r, c.z + (pos.getZ(i) - c.z) * r);
    }
    hatGeo.computeVertexNormals();
    const hat = new THREE.Mesh(hatGeo, robe);
    const band = new THREE.Mesh(new THREE.CylinderGeometry(0.0222, 0.0225, 0.005, 24, 1, true), gold); band.position.y = 0.016;
    const moon = new THREE.Mesh(new THREE.TorusGeometry(0.004, 0.0013, 6, 12, Math.PI * 1.3), gold); moon.position.set(0, 0.03, 0.017);
    head.add(face, nose, ...eyes, ...brows, beard, mustache, brim, hat, band, moon);

    // the staff, in his right hand
    const staff = new THREE.Group();
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.0022, 0.0028, 0.15, 8), wood); pole.position.y = 0.01;
    const orb = new THREE.Mesh(new THREE.OctahedronGeometry(0.0075, 0), crystal); orb.position.y = 0.092;
    const claw = new THREE.Mesh(new THREE.TorusGeometry(0.006, 0.0014, 6, 12), wood); claw.position.y = 0.088; claw.rotation.x = Math.PI / 2;
    staff.add(pole, orb, claw);
    api.group.add(staff);
    pin(staff, "rW", "upper", [0.006, 0, 0.004]);
    anim((t) => { orb.rotation.y = t * 1.5; crystal.emissiveIntensity = 1.3 + Math.sin(t * 3) * 0.4; });
  });
}

// ---------------------------------------------------------------------------
export function pirateSkin(assets) {
  return humanoidSkin(assets, (api) => {
    const { add, M, head, pin, at, anim } = api;
    const coat = M({ color: 0x9a1f24, roughness: 0.75 });
    const shirt = M({ color: 0xece4d2, roughness: 0.85 });
    const pants = M({ color: 0x2b2f3a, roughness: 0.8 });
    const boot = M({ color: 0x1c1410, roughness: 0.55 });
    const gold = M({ color: 0xd8ac4f, metalness: 1, roughness: 0.3 });
    const skin = M({ color: 0xc89070, roughness: 0.6 });
    const black = M({ color: 0x121212, roughness: 0.6 });
    const wood = M({ color: 0x7a5432, roughness: 0.7 });

    const chest = add(torsoLathe(0.025, 0.075, 0.01), coat); chest.scale.set(1.18, 1, 0.82);
    pin(chest, "mid", "upper", [0, 0.004, 0]);
    const front = add(new THREE.BoxGeometry(0.016, 0.058, 0.004), shirt);
    pin(front, "mid", "upper", [0, 0.004, 0.0215]);
    const buttons = new THREE.Group();
    for (let i = 0; i < 3; i++) for (const s of [-1, 1]) { const b = new THREE.Mesh(new THREE.SphereGeometry(0.0018, 6, 5), gold); b.position.set(s * 0.011, 0.018 - i * 0.014, 0.022); buttons.add(b); }
    api.group.add(buttons); mergeStatic(buttons);
    pin(buttons, "mid", "upper", [0, 0, 0]);
    const tails = add(new THREE.BoxGeometry(0.044, 0.06, 0.004), coat);
    pin(tails, "pelvis", "lower", [0, -0.012, -0.024]);
    const belt = add(new THREE.CylinderGeometry(0.029, 0.029, 0.007, 20), black); belt.scale.z = 0.82;
    pin(belt, "pelvis", "lower", [0, 0.016, 0]);
    const buckle = add(new THREE.BoxGeometry(0.01, 0.008, 0.003), gold);
    pin(buckle, "pelvis", "lower", [0, 0.016, 0.024]);
    // a wooden peg for the left lower leg
    const peg = add(new THREE.CylinderGeometry(0.004, 0.0028, 1, 8), wood);
    limbs(api, [[0.0085, 0.0085], coat, [0.0085, 0.01], coat], [[0.0095, 0.0085], pants, [0.0085, 0.008], boot], peg);
    const cuffG = new THREE.CylinderGeometry(0.0105, 0.0105, 0.006, 12);
    for (const n of ["lW", "rW"]) { pin(add(cuffG, shirt), n, "upper", [0, 0.006, 0]); at(add(new THREE.SphereGeometry(0.0065, 12, 10), skin), n); }
    const bootG = new THREE.CapsuleGeometry(0.008, 0.02, 4, 10); bootG.rotateX(Math.PI / 2); bootG.translate(0, 0, 0.008);
    pin(add(bootG, boot), "rF", "yaw", [0, 0.002, 0]);

    // head: tanned face, black beard, eyepatch, gold earring, tricorn hat
    const face = new THREE.Mesh(new THREE.SphereGeometry(0.0175, 20, 16), skin); face.scale.set(0.95, 1.06, 1);
    const nose = new THREE.Mesh(new THREE.SphereGeometry(0.0036, 10, 8), skin); nose.position.set(0, -0.002, 0.018);
    const beard = new THREE.Mesh(new THREE.SphereGeometry(0.0155, 16, 10, 0, Math.PI * 2, Math.PI * 0.45, Math.PI * 0.55), black); beard.position.set(0, -0.004, 0.003); beard.scale.set(1.05, 1.1, 1.05);
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.0022, 8, 6), black); eye.position.set(0.0065, 0.004, 0.0165);
    const patch = new THREE.Mesh(new THREE.CylinderGeometry(0.0042, 0.0042, 0.0015, 12), black); patch.rotation.x = Math.PI / 2; patch.position.set(-0.0065, 0.004, 0.0172);
    const strap = new THREE.Mesh(new THREE.TorusGeometry(0.0182, 0.0007, 4, 32), black); strap.rotation.set(0.15, 0, 0.45); strap.position.y = 0.004;
    const earring = new THREE.Mesh(new THREE.TorusGeometry(0.0028, 0.0007, 6, 12), gold); earring.position.set(0.0175, -0.004, 0);
    const crown = new THREE.Mesh(new THREE.SphereGeometry(0.0185, 18, 10, 0, Math.PI * 2, 0, Math.PI * 0.5), black); crown.position.y = 0.008; crown.scale.y = 0.9;
    const tricorn = new THREE.Group();
    for (let k = 0; k < 3; k++) {
      const flap = new THREE.Mesh(new THREE.BoxGeometry(0.036, 0.016, 0.003), black);
      const a = (k / 3) * Math.PI * 2;
      flap.position.set(Math.sin(a) * 0.017, 0.012, Math.cos(a) * 0.017);
      flap.rotation.y = a;
      flap.rotateX(-0.45);
      tricorn.add(flap);
    }
    const trim = new THREE.Mesh(new THREE.TorusGeometry(0.022, 0.0012, 6, 24), gold); trim.rotation.x = Math.PI / 2; trim.position.y = 0.006;
    const skull = new THREE.Mesh(new THREE.SphereGeometry(0.0028, 8, 6), shirt); skull.position.set(0, 0.016, 0.022);
    tricorn.add(trim, skull);
    head.add(face, nose, beard, eye, patch, strap, earring, crown, tricorn);

    // a parrot on his right shoulder
    const parrot = new THREE.Group();
    const green = M({ color: 0x2fa84a, roughness: 0.6 }), red = M({ color: 0xd8322a, roughness: 0.6 }), beakM = M({ color: 0xf0c040, roughness: 0.5 });
    const pb = new THREE.Mesh(new THREE.SphereGeometry(0.007, 12, 10), green); pb.scale.set(0.85, 1.2, 0.9);
    const ph = new THREE.Mesh(new THREE.SphereGeometry(0.005, 12, 10), green); ph.position.set(0, 0.009, 0.002);
    const beak = new THREE.Mesh(new THREE.ConeGeometry(0.0022, 0.005, 8), beakM); beak.position.set(0, 0.008, 0.0068); beak.rotation.x = Math.PI / 2;
    const wing = new THREE.Mesh(new THREE.SphereGeometry(0.005, 10, 8), red); wing.scale.set(0.4, 1, 0.9); wing.position.set(0.006, 0.001, -0.001);
    const tail = new THREE.Mesh(new THREE.ConeGeometry(0.003, 0.012, 6), red); tail.position.set(0, -0.01, -0.004); tail.rotation.x = 0.5;
    parrot.add(pb, ph, beak, wing, tail);
    api.group.add(parrot);
    mergeStatic(parrot);
    pin(parrot, "rS", "upper", [0.004, 0.012, -0.002]);
    anim((t) => { parrot.position.y += Math.abs(Math.sin(t * 5)) * 0.002; });
  });
}

// ---------------------------------------------------------------------------
export function trollSkin(assets) {
  return humanoidSkin(assets, (api) => {
    const { add, M, head, pin, at } = api;
    const hide = M({ color: 0x7d8f5a, roughness: 0.85 });
    const hideDark = M({ color: 0x5f6e43, roughness: 0.9 });
    const fur = M({ color: 0x6a4a2c, roughness: 1 });
    const moss = M({ color: 0x4f7a2e, roughness: 1 });
    const tusk = M({ color: 0xf0e8d0, roughness: 0.5 });
    const eyeM = M({ color: 0xffd040, emissive: 0x553300, roughness: 0.3 });

    const chest = add(torsoLathe(0.03, 0.078, 0.014), hide); chest.scale.set(1.25, 1, 0.95);
    pin(chest, "mid", "upper", [0, 0.002, 0.002]);
    const belly = add(new THREE.SphereGeometry(0.026, 18, 14), hide); belly.scale.set(1.1, 0.95, 0.9);
    pin(belly, "mid", "upper", [0, -0.012, 0.01]);
    const vest = add(new THREE.CylinderGeometry(0.034, 0.037, 0.05, 18, 1, true, Math.PI * 0.62, Math.PI * 1.76), fur);
    vest.material.side = THREE.DoubleSide;
    pin(vest, "mid", "upper", [0, 0.008, 0]);
    const loin = add(new THREE.CylinderGeometry(0.031, 0.036, 0.03, 16, 1, true), fur);
    loin.material.side = THREE.DoubleSide;
    pin(loin, "pelvis", "lower", [0, 0.002, 0]);
    limbs(api, [[0.011, 0.01], hide, [0.0105, 0.012], hideDark], [[0.0125, 0.011], hide, [0.011, 0.0105], hideDark]);
    for (const n of ["lW", "rW"]) at(add(new THREE.SphereGeometry(0.0105, 12, 10), hideDark), n);
    const footG = new THREE.CapsuleGeometry(0.0105, 0.022, 4, 10); footG.rotateX(Math.PI / 2); footG.scale(1.25, 0.7, 1); footG.translate(0, 0, 0.01);
    for (const n of ["lF", "rF"]) pin(add(footG, hideDark), n, "yaw", [0, 0.003, 0]);
    for (const n of ["lS", "rS"]) { const tuft = add(new THREE.SphereGeometry(0.009, 10, 8), moss); pin(tuft, n, "upper", [0, 0.006, 0]); }

    // head: wide, with a huge nose, tusks, pointy ears, a mossy tuft
    const skull = new THREE.Mesh(new THREE.SphereGeometry(0.024, 20, 16), hide); skull.scale.set(1.15, 0.95, 1);
    const jaw = new THREE.Mesh(new THREE.SphereGeometry(0.019, 16, 12), hide); jaw.position.set(0, -0.012, 0.006); jaw.scale.set(1.25, 0.8, 1);
    const nose = new THREE.Mesh(new THREE.SphereGeometry(0.009, 14, 10), hideDark); nose.position.set(0, -0.001, 0.024); nose.scale.set(1, 0.9, 1.2);
    const brow = new THREE.Mesh(new THREE.CapsuleGeometry(0.0045, 0.022, 4, 8), hideDark); brow.rotation.z = Math.PI / 2; brow.position.set(0, 0.009, 0.018);
    const eyes = [-1, 1].map((s) => { const e = new THREE.Mesh(new THREE.SphereGeometry(0.0028, 10, 8), eyeM); e.position.set(s * 0.008, 0.005, 0.0205); return e; });
    const tusks = [-1, 1].map((s) => { const k = new THREE.Mesh(new THREE.ConeGeometry(0.0028, 0.012, 8), tusk); k.position.set(s * 0.011, -0.011, 0.02); k.rotation.z = s * -0.25; return k; });
    const ears = [-1, 1].map((s) => { const e = new THREE.Mesh(new THREE.ConeGeometry(0.0065, 0.024, 8), hide); e.position.set(s * 0.029, 0.004, -0.002); e.rotation.z = s * -1.35; return e; });
    const tuft = new THREE.Mesh(new THREE.SphereGeometry(0.011, 12, 8), moss); tuft.position.set(0, 0.022, -0.002); tuft.scale.set(1.2, 0.6, 1.1);
    const sprout = new THREE.Mesh(new THREE.ConeGeometry(0.003, 0.012, 6), moss); sprout.position.set(0.004, 0.03, 0); sprout.rotation.z = -0.3;
    head.add(skull, jaw, nose, brow, ...eyes, ...tusks, ...ears, tuft, sprout);
  });
}
