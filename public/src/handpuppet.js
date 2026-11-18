// Sock puppets: not marionettes. The robot puppeteer works them from under the stage,
// his forearm up through a trapdoor inside the sock. A knitted tube that bends at the
// wrist, a mouth that opens and shuts (his fingers above, his thumb below), wobbly
// googly eyes, a pompom nose and a mop of yarn hair that bounces as it moves.
// Anything below the stage floor is clipped away (a shared plane), so it rises out of a
// real hole.
import * as THREE from "three";

// a knitted texture: rows of little V stitches, heathered, with stripes at the cuff
function knitTexture(base, stripes = [], { cuff = true } = {}) {
  const c = document.createElement("canvas");
  c.width = 128; c.height = 256;
  const g = c.getContext("2d");
  const col = new THREE.Color(base);
  const css = (k, a = 1) => `rgba(${Math.round(col.r * 255 * k)},${Math.round(col.g * 255 * k)},${Math.round(col.b * 255 * k)},${a})`;
  g.fillStyle = css(0.82); g.fillRect(0, 0, 128, 256);
  // stripes near the cuff (the bottom of the texture is the bottom of the sock)
  const band = (y, h, hex) => { g.fillStyle = `#${new THREE.Color(hex).getHexString()}`; g.fillRect(0, y, 128, h); };
  if (cuff && stripes.length) { let y = 256 - 30; for (const s of stripes) { band(y - 16, 16, s); y -= 22; } }
  // the stitches: each a pair of slanted loops making a V, lit from above
  const shade = g.getImageData(0, 0, 128, 256);
  for (let y = 0; y < 256; y += 4) {
    for (let x = 0; x < 128; x += 4) {
      const i = ((y + 2) * 128 + (x + 2)) * 4, r = shade.data[i], gg = shade.data[i + 1], b = shade.data[i + 2];
      for (const [sx, rot] of [[-1, 0.5], [1, -0.5]]) {
        g.save(); g.translate(x + 2 + sx * 0.95, y + 2); g.rotate(rot);
        const gr = g.createLinearGradient(0, -2, 0, 2);
        gr.addColorStop(0, `rgb(${Math.min(255, r * 1.16)},${Math.min(255, gg * 1.16)},${Math.min(255, b * 1.16)})`);
        gr.addColorStop(1, `rgb(${r * 0.86},${gg * 0.86},${b * 0.86})`);
        g.fillStyle = gr; g.beginPath(); g.ellipse(0, 0, 1.1, 2.3, 0, 0, Math.PI * 2); g.fill();
        g.restore();
      }
    }
  }
  // heathered fibres: little flecks of light and dark
  for (let k = 0; k < 900; k++) { g.fillStyle = Math.random() < 0.5 ? "rgba(255,255,255,0.16)" : "rgba(0,0,0,0.12)"; g.fillRect(Math.random() * 128, Math.random() * 256, 1, 1); }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 4;
  return t;
}
// a fuzzy felt/pompom texture
let fuzzTex = null;
function fuzz() {
  if (fuzzTex) return fuzzTex;
  const c = document.createElement("canvas"); c.width = c.height = 64;
  const g = c.getContext("2d");
  g.fillStyle = "#bbb"; g.fillRect(0, 0, 64, 64);
  for (let k = 0; k < 700; k++) { const v = 120 + Math.random() * 135; g.strokeStyle = `rgb(${v},${v},${v})`; g.lineWidth = 0.8; const x = Math.random() * 64, y = Math.random() * 64, a = Math.random() * 6.28; g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(a) * 3, y + Math.sin(a) * 3); g.stroke(); }
  fuzzTex = new THREE.CanvasTexture(c); fuzzTex.wrapS = fuzzTex.wrapT = THREE.RepeatWrapping;
  return fuzzTex;
}

const LOOKS = {
  noodle: { knit: 0xcbbd9c, lip: 0xe9cfa8, stripes: [0x2fa84a, 0xf0c030, 0xd8322a], nose: 0x5cc85a, hair: [0xd8322a, 0xf0c030, 0x3aa858, 0x2f9ad8, 0x9a4ad8, 0xf07a2a, 0xe8487a] },
  doodle: { knit: 0xcbbd9c, lip: 0xe9cfa8, stripes: [0x2fa84a, 0xf0c030, 0xd8322a], nose: 0xe8487a, hair: [0x4a9ae8, 0x6ab8f0, 0x3a7ad0, 0x8acdf8] },
};

export class SockPuppet {
  constructor(kind = "noodle", clip = null) {
    const L = LOOKS[kind] || LOOKS.noodle;
    this.kind = kind;
    this.group = new THREE.Group();       // sits on the floor at the hole
    this.lift = new THREE.Group();        // rises out of the hole
    this.group.add(this.lift);
    this.group.visible = false;
    const planes = clip ? [clip] : null;
    const M = (p) => { const m = new THREE.MeshStandardMaterial(p); if (planes) m.clippingPlanes = planes; return m; };
    const knitTex = knitTexture(L.knit, L.stripes); knitTex.repeat.set(2, 1);
    const knitM = M({ map: knitTex, bumpMap: knitTex, bumpScale: 0.7, roughness: 0.95 });
    const plainTex = knitTexture(L.knit, [], { cuff: false }); plainTex.repeat.set(3, 1.2);
    const headM = M({ map: plainTex, bumpMap: plainTex, bumpScale: 0.7, roughness: 0.95 });
    const lipM = M({ color: L.lip, roughness: 0.9, map: fuzz(), bumpMap: fuzz(), bumpScale: 0.6 });
    const mouthM = M({ color: 0x140a0a, roughness: 1 });
    const tongueM = M({ color: 0xd8383a, roughness: 0.8, map: fuzz() });
    const whiteM = M({ color: 0xffffff, roughness: 0.18 });
    const blackM = M({ color: 0x0a0a0a, roughness: 0.25 });
    const noseM = M({ color: L.nose, roughness: 1, map: fuzz(), bumpMap: fuzz(), bumpScale: 2 });
    const armM = M({ color: 0xf0ede6, roughness: 0.24 });
    const glowM = new THREE.MeshBasicMaterial({ color: 0x8fe6ff, toneMapped: false }); if (planes) glowM.clippingPlanes = planes;
    const rubberM = M({ color: 0x23252a, roughness: 0.55, metalness: 0.35 });

    // the robot's forearm inside: porcelain, a black joint, one of his light rings
    const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.0178, 0.0195, 0.26, 20).translate(0, -0.13, 0), armM);
    const band = new THREE.Mesh(new THREE.TorusGeometry(0.0186, 0.0016, 6, 24).rotateX(Math.PI / 2).translate(0, -0.016, 0), glowM);
    const joint = new THREE.Mesh(new THREE.TorusGeometry(0.0194, 0.0032, 8, 24).rotateX(Math.PI / 2).translate(0, -0.05, 0), rubberM);
    this.lift.add(arm, band, joint);

    // the sock: a knitted tube from the cuff (y 0) up to the wrist (y H), bent per frame
    const H = (this.H = 0.074), R = 0.0205;
    this.tubeG = new THREE.CylinderGeometry(R * 0.98, R * 1.04, H, 24, 12, true).translate(0, H / 2, 0);
    this.base = this.tubeG.attributes.position.array.slice();
    this.tube = new THREE.Mesh(this.tubeG, knitM);
    this.tube.frustumCulled = false;
    this.lift.add(this.tube);
    const cuffRim = new THREE.Mesh(new THREE.TorusGeometry(R * 1.04, 0.0018, 6, 24).rotateX(Math.PI / 2), M({ color: L.stripes[0], roughness: 0.95 }));
    this.lift.add(cuffRim);

    // the head: an upper jaw (his fingers) and a lower jaw (his thumb), hinged at the back
    this.head = new THREE.Group();
    this.lift.add(this.head);
    const HZ = 0.017; // the hinge sits this far behind the middle of the mouth
    this.upper = new THREE.Group(); this.upper.position.set(0, 0.002, -HZ);
    this.lower = new THREE.Group(); this.lower.position.set(0, 0, -HZ);
    this.head.add(this.upper, this.lower);
    const dome = new THREE.Mesh(new THREE.SphereGeometry(0.0245, 28, 14, 0, Math.PI * 2, 0, Math.PI / 2), headM);
    dome.scale.set(1.1, 0.92, 1.28); dome.position.z = HZ;
    const roof = new THREE.Mesh(new THREE.CircleGeometry(0.0236, 28).rotateX(Math.PI / 2), mouthM);
    roof.scale.set(1.08, 1, 1.24); roof.position.set(0, 0.0004, HZ);
    const lipU = new THREE.Mesh(new THREE.TorusGeometry(0.0243, 0.0019, 8, 36).rotateX(Math.PI / 2), lipM);
    lipU.scale.set(1.1, 1, 1.27); lipU.position.set(0, 0.0012, HZ);
    this.upper.add(dome, roof, lipU);
    const jaw = new THREE.Mesh(new THREE.SphereGeometry(0.0235, 28, 12, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), headM);
    jaw.scale.set(1.08, 0.78, 1.24); jaw.position.z = HZ;
    const floor = new THREE.Mesh(new THREE.CircleGeometry(0.0226, 28).rotateX(-Math.PI / 2), mouthM);
    floor.scale.set(1.06, 1, 1.22); floor.position.set(0, -0.0006, HZ);
    const lipL = new THREE.Mesh(new THREE.TorusGeometry(0.0236, 0.0018, 8, 36).rotateX(Math.PI / 2), lipM);
    lipL.scale.set(1.08, 1, 1.24); lipL.position.set(0, -0.0008, HZ);
    const tongue = new THREE.Mesh(new THREE.SphereGeometry(0.0095, 16, 10), tongueM);
    tongue.scale.set(1.05, 0.32, 1.25); tongue.position.set(0, 0.0006, HZ + 0.008);
    this.lower.add(jaw, floor, lipL, tongue);

    // googly eyes on top: the pupils roll about loose inside
    this.eyes = [-1, 1].map((s) => {
      const e = new THREE.Group();
      e.position.set(s * 0.0108, 0.0215, HZ + 0.006);
      e.rotation.set(-0.42, s * 0.22, 0);
      const ball = new THREE.Mesh(new THREE.SphereGeometry(0.0108, 18, 12), whiteM); ball.scale.z = 0.72;
      const pupil = new THREE.Mesh(new THREE.SphereGeometry(0.0052, 14, 10), blackM); pupil.scale.z = 0.35;
      pupil.position.z = 0.0076;
      e.add(ball, pupil);
      this.upper.add(e);
      return { e, pupil, p: new THREE.Vector2(0, -0.002), v: new THREE.Vector2() };
    });
    // the pompom nose
    const noseG = new THREE.SphereGeometry(0.0086, 18, 14);
    { const p = noseG.attributes.position; for (let i = 0; i < p.count; i++) { const k = 1 + (Math.random() - 0.5) * 0.12; p.setXYZ(i, p.getX(i) * k, p.getY(i) * k, p.getZ(i) * k); } noseG.computeVertexNormals(); }
    const nose = new THREE.Mesh(noseG, noseM); nose.position.set(0, 0.0115, HZ + 0.03);
    this.upper.add(nose);
    // a mop of yarn: one mesh of tubes, a colour per strand
    const strands = [];
    const col = new THREE.Color();
    for (let k = 0; k < 96; k++) {
      // a root on the crown, behind the eyes; it springs up and out, curling as it goes
      const a = Math.random() * Math.PI * 2, rr = Math.sqrt(Math.random()) * 0.015;
      const x0 = Math.cos(a) * rr * 1.15, z0 = HZ - 0.009 + Math.sin(a) * rr * 0.85;
      const dir = new THREE.Vector3(Math.cos(a) * (0.5 + rr * 40), 1.1 + Math.random() * 0.5, Math.sin(a) * (0.5 + rr * 40) - 0.25).normalize();
      const len = 0.02 + Math.random() * 0.022;
      const p0 = new THREE.Vector3(x0, 0.0165, z0);
      const pts = [p0];
      for (let j = 1; j <= 4; j++) {
        const u = j / 4, curl = new THREE.Vector3(Math.sin(j * 2.3 + k) * 0.003, -u * u * len * 0.45, Math.cos(j * 2.1 + k) * 0.003);
        pts.push(p0.clone().addScaledVector(dir, len * u).add(curl));
      }
      const tg = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 10, 0.0007 + Math.random() * 0.0004, 4);
      col.set(L.hair[k % L.hair.length]);
      const n = tg.attributes.position.count, cols = new Float32Array(n * 3);
      for (let i = 0; i < n; i++) cols.set([col.r, col.g, col.b], i * 3);
      tg.setAttribute("color", new THREE.BufferAttribute(cols, 3));
      strands.push(tg.toNonIndexed());
    }
    // (merged by hand: one draw call for the whole mop)
    const merged = new THREE.BufferGeometry();
    for (const name of ["position", "normal", "color"]) {
      const total = strands.reduce((s, g) => s + g.attributes[name].array.length, 0);
      const arr = new Float32Array(total); let o = 0;
      for (const g of strands) { arr.set(g.attributes[name].array, o); o += g.attributes[name].array.length; }
      merged.setAttribute(name, new THREE.BufferAttribute(arr, 3));
    }
    this.hair = new THREE.Mesh(merged, M({ vertexColors: true, roughness: 1 }));
    this.hairPivot = new THREE.Group(); this.hairPivot.position.set(0, 0.016, HZ - 0.006);
    this.hair.position.set(0, -0.016, -HZ + 0.006);
    this.hairPivot.add(this.hair);
    this.upper.add(this.hairPivot);
    this.group.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = false; } });
    this.lift.scale.setScalar(1.22);

    // state
    this.t = Math.random() * 10;
    this.up = 0; this.upTo = 0; this.upV = 0;   // 0 = down the hole, 1 = up, 1.35 = stretched up tall
    this.open = 0; this.talkT = 0; this.wiggle = 0; this.bow = 0;
    this.yaw = 0; this.lookAt = null;
    this.bend = new THREE.Vector2(); this.bendTo = new THREE.Vector2();
    this._lastHead = new THREE.Vector3(); this._vel = new THREE.Vector3(); this._hairV = new THREE.Vector2(); this._hair = new THREE.Vector2();
  }

  at(x, z) { this.group.position.set(x, 0, z); return this; }
  popUp(tall = false) { this.group.visible = true; this.upTo = tall ? 1.35 : 1; }
  duck() { this.upTo = 0; }
  get isUp() { return this.up > 0.8 && this.upTo > 0; }
  get hidden() { return this.upTo === 0 && this.up < 0.02; }
  talk(secs) { this.talkT = Math.max(this.talkT, secs); }
  wiggleFor(secs) { this.wiggle = Math.max(this.wiggle, secs); }
  bowFor(secs) { this.bow = Math.max(this.bow, secs); }
  headWorld(out = new THREE.Vector3()) { return this.head.getWorldPosition(out); }
  // where its head is, in the space of the stage
  headPos() { return this.group.position.clone().add(new THREE.Vector3(0, this.lift.position.y + this.H + 0.02, 0)); }

  update(dt) {
    if (!this.group.visible) return;
    this.t += dt;
    const t = this.t;
    // a springy pop up (or a quick drop down the hole)
    const k = this.upTo > this.up ? 90 : 140;
    this.upV += (this.upTo - this.up) * k * dt; this.upV *= Math.exp(-(this.upTo > this.up ? 9 : 16) * dt);
    this.up += this.upV * dt;
    if (this.upTo === 0 && this.up < 0.01) { this.up = 0; this.upV = 0; this.group.visible = false; return; }
    // fully up, the cuff and a little of the robot's arm show above the floor
    this.lift.position.y = -0.12 + this.up * 0.15;
    // turn to look at someone
    if (this.lookAt) { const d = this.lookAt.clone().sub(this.group.position); this.yaw += (Math.atan2(d.x, d.z) - this.yaw) * Math.min(1, dt * 4); }
    this.lift.rotation.y = this.yaw;
    // the wrist: a lazy sway, a wiggle when excited, a fold forward to bow
    this.wiggle = Math.max(0, this.wiggle - dt); this.bow = Math.max(0, this.bow - dt);
    const wig = Math.min(1, this.wiggle * 2), bw = Math.min(1, this.bow * 2.5);
    this.bendTo.set(Math.sin(t * 1.3) * 0.12 + Math.sin(t * 11) * 0.42 * wig, Math.sin(t * 0.9 + 1) * 0.08 + 0.75 * bw + Math.sin(t * 9) * 0.1 * wig);
    this.bend.lerp(this.bendTo, Math.min(1, dt * 8));
    const bx = this.bend.x, bz = this.bend.y, H = this.H;
    const pos = this.tubeG.attributes.position, B = this.base;
    for (let i = 0; i < pos.count; i++) {
      const y = B[i * 3 + 1], q = (y / H) * (y / H);
      pos.setXYZ(i, B[i * 3] + bx * q * H, y - (Math.abs(bx) + Math.abs(bz)) * q * H * 0.15, B[i * 3 + 2] + bz * q * H);
    }
    pos.needsUpdate = true;
    this.tubeG.computeVertexNormals();
    this.head.position.set(bx * H, H * (1 - (Math.abs(bx) + Math.abs(bz)) * 0.15) + 0.007, bz * H); // (the tube's top tucks up under the mouth)
    this.head.rotation.set(Math.atan(2 * bz) * 0.9, 0, -Math.atan(2 * bx) * 0.9);
    // the mouth: chatters while talking (syllables), a happy little gape now and then
    this.talkT = Math.max(0, this.talkT - dt);
    const chat = this.talkT > 0 ? 0.35 + 0.65 * Math.abs(Math.sin(t * 13 + Math.sin(t * 5.3) * 2)) : 0;
    const want = Math.max(chat, 0.3 + 0.12 * Math.max(0, Math.sin(t * 0.7)) + 0.45 * wig * Math.abs(Math.sin(t * 7)));
    this.open += (want - this.open) * Math.min(1, dt * 18);
    this.upper.rotation.x = -this.open * 0.78;
    this.lower.rotation.x = this.open * 0.22;
    // googly pupils: they sag under gravity and slosh about when the head moves
    const hw = this.head.getWorldPosition(this._hw || (this._hw = new THREE.Vector3()));
    if (!this._seen) { this._lastHead.copy(hw); this._seen = true; }
    const v = hw.clone().sub(this._lastHead).divideScalar(Math.max(dt, 1e-3)); this._lastHead.copy(hw);
    const acc = v.clone().sub(this._vel).divideScalar(Math.max(dt, 1e-3)); this._vel.copy(v);
    if (acc.length() > 30) acc.setLength(30);
    for (const E of this.eyes) {
      E.v.x += (-E.p.x * 150 - acc.x * 0.12) * dt; E.v.y += ((-0.0026 - E.p.y) * 150 - acc.y * 0.12) * dt;
      E.v.multiplyScalar(Math.exp(-4 * dt));
      E.p.addScaledVector(E.v, dt);
      if (E.p.length() > 0.0042) { E.p.setLength(0.0042); E.v.multiplyScalar(-0.4); }
      E.pupil.position.set(E.p.x, E.p.y, 0.0076);
    }
    // the yarn bounces behind the movement
    this._hairV.x += (-this._hair.x * 90 - acc.x * 1.2) * dt; this._hairV.y += (-this._hair.y * 90 + acc.z * 1.2 - acc.y * 0.6) * dt;
    this._hairV.multiplyScalar(Math.exp(-6 * dt)); this._hair.addScaledVector(this._hairV, dt);
    this.hairPivot.rotation.set(THREE.MathUtils.clamp(this._hair.y, -0.5, 0.5) + this.open * 0.25, 0, THREE.MathUtils.clamp(-this._hair.x, -0.5, 0.5));
  }
}

// the holes they pop up from: a dark opening with a little hinged lid propped open
export function makeHole(r = 0.03, clipFree = true) {
  const g = new THREE.Group();
  const dark = new THREE.Mesh(new THREE.CircleGeometry(r, 32).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0x050302 }));
  dark.position.y = 0.0012;
  const rim = new THREE.Mesh(new THREE.TorusGeometry(r, 0.0022, 6, 32).rotateX(Math.PI / 2), new THREE.MeshStandardMaterial({ color: 0x3a2414, roughness: 0.7 }));
  rim.position.y = 0.0015;
  const lid = new THREE.Mesh(new THREE.CylinderGeometry(r, r, 0.003, 28), new THREE.MeshStandardMaterial({ color: 0x8a5a32, roughness: 0.7 }));
  lid.geometry.translate(0, 0, r); lid.position.set(0, 0.002, -r - 0.001); lid.rotation.x = -1.35;
  lid.visible = false;
  g.add(dark, rim, lid);
  dark.renderOrder = 1;
  return g;
}

// a sock hanging on the washing line (stripes at its cuff), pegged on with a wooden peg
export const SOCK_STRIPES = {
  noodle: LOOKS.noodle.stripes,
  decoys: [[0x2f66c8, 0xffffff, 0x2f66c8], [0xd8322a, 0xffffff, 0xd8322a], [0x3aa858, 0x3aa858, 0xf0c030], [0x9a4ad8, 0xf0c030, 0x9a4ad8], [0xf07a2a, 0x2f66c8, 0xf07a2a]],
};
export function hangingSock(stripes, base = 0xcbbd9c) {
  const g = new THREE.Group();
  const tex = knitTexture(base, stripes);
  const m = new THREE.MeshStandardMaterial({ map: tex, bumpMap: tex, bumpScale: 1.2, roughness: 0.95, side: THREE.DoubleSide });
  // the leg hangs from the peg, cuff at the top (stripes up there), the foot turned out at the bottom
  const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.0115, 0.011, 0.05, 16, 1, true).rotateZ(Math.PI), m);
  leg.position.y = -0.026;
  const foot = new THREE.Mesh(new THREE.CapsuleGeometry(0.011, 0.018, 6, 12).rotateX(Math.PI / 2), m);
  foot.position.set(0, -0.052, 0.008);
  const toe = new THREE.Mesh(new THREE.SphereGeometry(0.0112, 14, 10), m); toe.position.set(0, -0.052, -0.004);
  const peg = new THREE.Group();
  const wood = new THREE.MeshStandardMaterial({ color: 0xc8955a, roughness: 0.6 });
  for (const s of [-1, 1]) { const p = new THREE.Mesh(new THREE.BoxGeometry(0.0028, 0.022, 0.004), wood); p.position.set(s * 0.0018, 0.004, 0); peg.add(p); }
  const spring = new THREE.Mesh(new THREE.TorusGeometry(0.002, 0.0006, 5, 10), new THREE.MeshStandardMaterial({ color: 0x9aa0a8, metalness: 1, roughness: 0.3 }));
  spring.rotation.y = Math.PI / 2; spring.position.y = 0.006; peg.add(spring);
  g.add(leg, foot, toe, peg);
  g.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  return g;
}
