// The AI puppeteer: a porcelain-and-brass storyteller robot standing behind the stage
// (mismatched blue and gold eyes, a clock in his chest that keeps real time).
// Its hands grip the dragon's control bars (two-bone IK), its head follows the
// action, and its eyes brighten while the narrator speaks.
import * as THREE from "three";

const UP = new THREE.Vector3(0, 1, 0);

function spanMesh(mesh, A, B) {
  const v = new THREE.Vector3().subVectors(B, A);
  const len = v.length();
  mesh.position.addVectors(A, B).multiplyScalar(0.5);
  mesh.scale.y = Math.max(1e-4, len);
  if (len > 1e-6) mesh.quaternion.setFromUnitVectors(UP, v.divideScalar(len));
}

export class Robot {
  constructor() {
    this.group = new THREE.Group();
    // an ivory porcelain shell, black rubber joints, polished brass trim
    const shell = new THREE.MeshPhysicalMaterial({ color: 0xe9e6df, roughness: 0.28, metalness: 0.0, clearcoat: 1, clearcoatRoughness: 0.12, sheen: 0.3, sheenColor: new THREE.Color(0xb8c8ff) });
    const face = new THREE.MeshPhysicalMaterial({ color: 0xf1efe9, roughness: 0.3, clearcoat: 0.8, clearcoatRoughness: 0.18 });
    const joint = new THREE.MeshStandardMaterial({ color: 0x23252a, roughness: 0.55, metalness: 0.35 });
    const mech = new THREE.MeshStandardMaterial({ color: 0x3a3d44, roughness: 0.4, metalness: 0.75 });
    const dark = new THREE.MeshStandardMaterial({ color: 0x121316, roughness: 0.5, metalness: 0.2 });
    const brass = new THREE.MeshStandardMaterial({ color: 0xd2a650, roughness: 0.28, metalness: 1.0 });
    const dial = new THREE.MeshStandardMaterial({ color: 0xf6f1e4, roughness: 0.6 });
    // eyes are camera-like lenses behind dark glass: a lit iris ring and a bright pupil
    this.eyeMat = new THREE.MeshBasicMaterial({ color: 0xdffbff, toneMapped: false });
    this.irisMat = new THREE.MeshBasicMaterial({ color: 0x3fc8f0, toneMapped: false, transparent: true, opacity: 0.55 });
    const visorMat = new THREE.MeshPhysicalMaterial({ color: 0x06080b, roughness: 0.16, metalness: 0.1, clearcoat: 1, clearcoatRoughness: 0.12, envMapIntensity: 0.6 });
    const glass = new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0.04, metalness: 0, transparent: true, opacity: 0.16, clearcoat: 1, depthWrite: false });
    this.voiceMat = new THREE.MeshBasicMaterial({ color: 0x4fe0ff, toneMapped: false });
    this.haloMat = new THREE.MeshBasicMaterial({ color: 0x2fa8e0, toneMapped: false, transparent: true, opacity: 0.13, blending: THREE.AdditiveBlending, depthWrite: false });
    this.accentMat = new THREE.MeshBasicMaterial({ color: 0x8fe6ff, toneMapped: false });
    const add = (parent, geo, mat, pos, rot) => {
      const o = new THREE.Mesh(geo, mat);
      if (pos) o.position.set(...pos);
      if (rot) o.rotation.set(...rot);
      o.castShadow = true;
      parent.add(o);
      return o;
    };
    const G = this.group;

    // hips: a rounded shell with a brass belt plate
    add(G, new THREE.SphereGeometry(0.08, 28, 18), shell, [0, -0.035, 0]).scale.set(1.12, 0.62, 0.78);
    add(G, new THREE.CylinderGeometry(0.086, 0.084, 0.02, 32), brass, [0, 0.0, 0]).scale.set(1, 1, 0.82);
    const plate = add(G, new THREE.BoxGeometry(0.06, 0.03, 0.012), brass, [0, -0.012, 0.066]);
    plate.rotation.x = -0.12;
    add(G, new THREE.BoxGeometry(0.036, 0.008, 0.004), dark, [0, -0.012, 0.0735], [-0.12, 0, 0]); // (the engraved line)
    // legs, with black knee caps
    for (const s of [-1, 1]) {
      add(G, new THREE.CylinderGeometry(0.036, 0.03, 0.16, 20), shell, [s * 0.055, -0.12, 0]);
      add(G, new THREE.SphereGeometry(0.031, 18, 12), joint, [s * 0.055, -0.2, 0.004]).scale.set(1, 0.9, 1.1);
      add(G, new THREE.CylinderGeometry(0.028, 0.024, 0.05, 18), shell, [s * 0.055, -0.225, 0]);
      add(G, new THREE.BoxGeometry(0.05, 0.02, 0.085), shell, [s * 0.055, -0.245, 0.018]);
    }
    // waist: black accordion ribs, like bellows
    for (let i = 0; i < 6; i++) {
      const r = 0.07 + Math.sin((i / 5) * Math.PI) * 0.006;
      add(G, new THREE.TorusGeometry(r, 0.011, 10, 32), i % 2 ? dark : joint, [0, 0.022 + i * 0.02, 0], [Math.PI / 2, 0, 0]).scale.set(1, 0.82, 1);
    }
    add(G, new THREE.CylinderGeometry(0.066, 0.066, 0.12, 24), dark, [0, 0.07, 0]).scale.set(1, 1, 0.8);

    // chest: a smooth porcelain shell, broad at the shoulders
    const prof = [[0.072, 0], [0.078, 0.03], [0.09, 0.08], [0.104, 0.13], [0.112, 0.17], [0.112, 0.195], [0.102, 0.215], [0.08, 0.228], [0.052, 0.236]];
    const chestG = new THREE.LatheGeometry(prof.map(([r, y]) => new THREE.Vector2(r, y)), 48);
    chestG.scale(1.12, 1, 0.62);
    add(G, chestG, shell, [0, 0.14, 0]);
    // the clock in his chest (his hands tell the real time) with a brass bezel
    this.clock = new THREE.Group();
    this.clock.position.set(0, 0.292, 0.072);
    this.clock.rotation.x = -0.08;
    G.add(this.clock);
    add(this.clock, new THREE.CylinderGeometry(0.036, 0.036, 0.008, 40), brass, [0, 0, 0], [Math.PI / 2, 0, 0]);
    add(this.clock, new THREE.CylinderGeometry(0.03, 0.03, 0.009, 40), dial, [0, 0, 0.0008], [Math.PI / 2, 0, 0]);
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      add(this.clock, new THREE.BoxGeometry(i % 3 ? 0.0018 : 0.003, i % 3 ? 0.005 : 0.008, 0.002), dark, [Math.sin(a) * 0.024, Math.cos(a) * 0.024, 0.0055], [0, 0, -a]);
    }
    this.hourHand = new THREE.Group(); this.minuteHand = new THREE.Group();
    for (const [h, len, w] of [[this.hourHand, 0.014, 0.0028], [this.minuteHand, 0.021, 0.0018]]) {
      h.position.z = 0.0065;
      add(h, new THREE.BoxGeometry(w, len, 0.0015), dark, [0, len / 2 - 0.002, 0]);
      this.clock.add(h);
    }
    add(this.clock, new THREE.CylinderGeometry(0.0028, 0.0028, 0.004, 12), brass, [0, 0, 0.007], [Math.PI / 2, 0, 0]);
    const cover = add(this.clock, new THREE.SphereGeometry(0.031, 32, 12, 0, Math.PI * 2, 0, Math.PI * 0.5), glass, [0, 0, 0.004], [Math.PI / 2, 0, 0]);
    cover.scale.set(1, 0.22, 1); cover.castShadow = false;
    // little brass rivets by the shoulders
    for (const s of [-1, 1]) add(G, new THREE.SphereGeometry(0.0065, 12, 8), brass, [s * 0.068, 0.33, 0.058]);

    // collar: a slim brass band with flush rivets
    add(G, new THREE.CylinderGeometry(0.05, 0.056, 0.014, 48), brass, [0, 0.38, 0]).scale.set(1, 1, 0.86);
    for (let i = 0; i < 14; i++) {
      const a = (i / 14) * Math.PI * 2;
      add(G, new THREE.SphereGeometry(0.0026, 8, 6), brass, [Math.sin(a) * 0.0535, 0.381, Math.cos(a) * 0.0535 * 0.86]);
    }
    // a panel seam down the chest
    add(G, new THREE.BoxGeometry(0.0022, 0.05, 0.003), dark, [0, 0.352, 0.067], [-0.25, 0, 0]);
    add(G, new THREE.BoxGeometry(0.0022, 0.07, 0.003), dark, [0, 0.215, 0.083], [0.12, 0, 0]);

    // neck: black ribbed segments
    this.neck = new THREE.Group();
    this.neck.position.set(0, 0.385, 0);
    G.add(this.neck);
    add(this.neck, new THREE.CylinderGeometry(0.02, 0.024, 0.075, 18), mech, [0, 0.035, 0]);
    for (let i = 0; i < 5; i++) add(this.neck, new THREE.TorusGeometry(0.023 - i * 0.0006, 0.0055, 8, 24), i % 2 ? dark : joint, [0, 0.008 + i * 0.014, 0], [Math.PI / 2, 0, 0]);

    // head: a wide, smooth helmet with a big screen for a face
    this.head = new THREE.Group();
    this.head.position.set(0, 0.075, 0.005);
    this.neck.add(this.head);
    const HC = 0.08;                                   // the helmet's centre height
    const skull = add(this.head, new THREE.SphereGeometry(0.075, 56, 40), shell, [0, HC, -0.006]);
    skull.scale.set(1.07, 0.95, 0.98);                 // wider than tall, like a helmet

    // the face frame and screen: a rounded-square oval ("squircle"), bent to a gentle curve
    const FY = 0.0765, R = 0.115, Z0 = 0.0775;          // face centre, curvature, front of the frame
    const sq = (A, B, t, n = 2.6) => { const c = Math.cos(t), s = Math.sin(t); return [A * Math.sign(c) * Math.abs(c) ** (2 / n), B * Math.sign(s) * Math.abs(s) ** (2 / n)]; };
    const bend = (x, y) => -(x * x + (y - FY) * (y - FY)) / (2 * R); // how far the curve falls back
    const outline = (A, B, n) => { const pts = []; for (let i = 0; i < 96; i++) pts.push(sq(A, B, (i / 96) * Math.PI * 2, n)); return pts; };
    // the raised white frame: a smooth rounded rim swept round the squircle (a profile from the
    // screen's edge, up over a soft rounded top, and back down into the helmet), bent onto the curve
    const OUT = [0.0625, 0.0545], IN = [0.0505, 0.0425];
    const PROF = [[0, -0.0055], [0.015, -0.0028], [0.06, -0.0004], [0.16, 0.0014], [0.32, 0.0024], [0.5, 0.0027], [0.68, 0.0024], [0.84, 0.0014], [0.94, -0.0004], [0.985, -0.003], [1, -0.007], [1.004, -0.055]]; // (the back wall runs deep, so it always meets the shell)
    const SEG = 160, frameG = new THREE.BufferGeometry(), fp = [], fi = [];
    for (let i = 0; i <= SEG; i++) {
      const t = (i / SEG) * Math.PI * 2, [ix, iy] = sq(IN[0], IN[1], t, 2.6), [ox, oy] = sq(OUT[0], OUT[1], t, 2.7);
      for (const [k, dz] of PROF) { const x = ix + (ox - ix) * k, y = iy + (oy - iy) * k + FY; fp.push(x, y, Z0 + dz + bend(x, y)); }
    }
    const NP = PROF.length;
    for (let i = 0; i < SEG; i++) for (let j = 0; j < NP - 1; j++) { const a = i * NP + j, b = (i + 1) * NP + j; fi.push(a, b, a + 1, b, b + 1, a + 1); }
    frameG.setAttribute("position", new THREE.Float32BufferAttribute(fp, 3));
    frameG.setIndex(fi);
    frameG.computeVertexNormals();
    const frame = add(this.head, frameG, face); frame.castShadow = false;
    // the screen: black glass, recessed a little inside the frame
    const scrG = new THREE.RingGeometry(0.0001, 1, 128, 14);
    { const p = scrG.attributes.position;
      for (let i = 0; i < p.count; i++) {
        const u = p.getX(i), v = p.getY(i), r = Math.hypot(u, v), t = Math.atan2(v, u);
        const [x0, y0] = sq(IN[0] + 0.0008, IN[1] + 0.0008, t, 2.6), x = x0 * r, y = y0 * r + FY;
        p.setXYZ(i, x, y, Z0 - 0.005 + bend(x, y));
      }
      scrG.computeVertexNormals(); }
    add(this.head, scrG, visorMat).castShadow = false;
    // a point on the screen, and which way it faces (for the eyes and the mouth)
    const onScreen = (x, y) => Z0 - 0.005 + bend(x, y) + 0.0006;
    const faceTilt = (x, y) => [-Math.atan((y - FY) / R), Math.atan(x / R)];

    // eyes: big tall glowing ovals with a soft cyan glow (they blink, and flash gold on a memory)
    const ovalG = new THREE.CircleGeometry(0.0102, 48); ovalG.scale(0.62, 1, 1);
    this.eyes = [-1, 1].map((s) => {
      const eye = new THREE.Group();
      const x = s * 0.0185, y = FY + 0.0075;
      const [rx, ry] = faceTilt(x, y);
      eye.position.set(x, y, onScreen(x, y));
      eye.rotation.set(rx, ry, 0);
      this.head.add(eye);
      add(eye, ovalG, this.eyeMat, [0, 0, 0.0003]).castShadow = false;
      const glow = add(eye, ovalG, this.irisMat, [0, 0, 0.0001]); glow.scale.setScalar(1.1); glow.castShadow = false;
      for (const [k, z] of [[1.3, -0.00005], [1.6, -0.0001]]) { const halo = add(eye, ovalG, this.haloMat, [0, 0, z]); halo.scale.setScalar(k); halo.castShadow = false; }
      return eye;
    });
    // the mouth: a wide cyan sound wave that moves with his voice (one instanced mesh)
    this.waveN = 21;
    this.mouthY = FY - 0.0235;
    const bars = new THREE.InstancedMesh(new THREE.CapsuleGeometry(0.5, 1, 2, 6), this.voiceMat, this.waveN);
    const [mx] = faceTilt(0, this.mouthY);
    bars.position.set(0, this.mouthY, onScreen(0, this.mouthY) + 0.0003);
    bars.rotation.x = mx;
    bars.castShadow = false; bars.frustumCulled = false;
    this.head.add(bars);
    this.mouth = bars;
    this._bm = new THREE.Matrix4(); this._bq = new THREE.Quaternion(); this._bs = new THREE.Vector3(); this._bp = new THREE.Vector3();
    this._setWave(0);
    this.mouthDark = dark;
    // a short cyan light on the shell above the frame, and two panel seams rising from its corners
    add(this.head, new THREE.CapsuleGeometry(0.0017, 0.009, 4, 10), this.accentMat, [0, HC + 0.0565, 0.0415], [0.95, 0, Math.PI / 2]).castShadow = false;

    // ear pods: tall rounded cups at the sides, with a cyan light strip on the front edge
    for (const s of [-1, 1]) {
      const pod = add(this.head, new THREE.SphereGeometry(0.03, 32, 24), face, [s * 0.075, HC - 0.004, -0.004]);
      pod.scale.set(0.42, 1.0, 0.78);
      const strip = add(this.head, new THREE.CapsuleGeometry(0.0018, 0.03, 4, 10), this.accentMat, [s * 0.082, HC - 0.004, 0.0195], [0, 0, 0]);
      strip.rotation.y = s * 0.5; strip.castShadow = false;
    }

    // arms
    this.arms = [-1, 1].map((s) => {
      const shoulder = new THREE.Vector3(s * 0.14, 0.335, 0.0);
      const ball = add(G, new THREE.SphereGeometry(0.042, 24, 18), shell, shoulder.toArray());
      ball.scale.set(1, 0.95, 1);
      add(G, new THREE.TorusGeometry(0.036, 0.007, 10, 28), dark, shoulder.toArray(), [0, 0, Math.PI / 2]);
      const upper = add(G, new THREE.CylinderGeometry(0.032, 0.027, 1, 20), shell);
      const elbow = add(G, new THREE.SphereGeometry(0.026, 20, 16), mech);
      const lower = add(G, new THREE.CylinderGeometry(0.025, 0.02, 1, 20), shell);
      const wrist = add(G, new THREE.CylinderGeometry(0.016, 0.016, 0.018, 14), joint);
      // hand: palm + curled fingers + thumb, built pointing along -Y (wrist at origin)
      const hand = new THREE.Group();
      hand.scale.setScalar(0.72);
      G.add(hand);
      // a rounded palm, and jointed fingers curled round the bar (rounded segments, metal knuckles)
      const palm = add(hand, new THREE.CylinderGeometry(0.023, 0.021, 0.05, 20), shell, [0, -0.03, 0]);
      palm.scale.set(1, 1, 0.5);
      add(hand, new THREE.CylinderGeometry(0.0175, 0.0175, 0.012, 16), mech, [0, -0.002, 0]).scale.set(1, 1, 0.6); // (the wrist joint)
      for (let f = 0; f < 4; f++) {
        const x = -0.0162 + f * 0.0108, len = f === 0 || f === 3 ? 0.85 : 1;
        add(hand, new THREE.SphereGeometry(0.0052, 10, 8), mech, [x, -0.056, 0.003]);
        add(hand, new THREE.CapsuleGeometry(0.0046, 0.013 * len, 4, 10), shell, [x, -0.064, 0.008], [0.7, 0, 0]);
        add(hand, new THREE.SphereGeometry(0.0044, 10, 8), mech, [x, -0.0715, 0.0155]);
        add(hand, new THREE.CapsuleGeometry(0.0042, 0.01 * len, 4, 10), shell, [x, -0.0745, 0.025], [1.9, 0, 0]);
      }
      add(hand, new THREE.CapsuleGeometry(0.0052, 0.018, 4, 10), shell, [-s * 0.025, -0.04, 0.016], [0.6, 0, s * 0.5]);
      return { s, shoulder, upper, elbow, lower, wrist, hand };
    });

    this.talk = 0;
    this.t = 0;
    this.blink = 0;
  }

  // the sound-wave mouth: amp 0 is a calm dotted line, 1 is full speech
  _setWave(amp) {
    const n = this.waveN, gap = 0.0029, w = 0.0015;
    for (let i = 0; i < n; i++) {
      const u = (i - (n - 1) / 2) / ((n - 1) / 2);            // -1 .. 1
      const env = Math.pow(Math.cos(u * Math.PI / 2), 1.6);    // tallest in the middle
      const wob = 0.35 + 0.65 * Math.abs(Math.sin(this.t * (9 + i * 1.7) + i * 2.3));
      // (the unit capsule is 1 wide and 2 tall: scaled to w by h; at rest every bar is a round dot)
      const h = Math.max(w, 0.0016 + env * amp * wob * 0.0175);
      this._bm.compose(this._bp.set(u * ((n - 1) / 2) * gap, 0, 0), this._bq.identity(), this._bs.set(w, h / 2, w * 0.3));
      this.mouth.setMatrixAt(i, this._bm);
    }
    this.mouth.instanceMatrix.needsUpdate = true;
  }

  // grips and lookAt are in the robot's parent space (stage space)
  update(dt, leftGrip, rightGrip, lookAt) {
    this.t += dt;
    const parent = this.group.parent;
    // idle breathing
    this.neck.position.y = 0.385 + Math.sin(this.t * 1.5) * 0.002;
    // head turns to look at the action
    if (lookAt && parent) {
      const target = parent.localToWorld(lookAt.clone());
      const headW = this.head.getWorldPosition(new THREE.Vector3());
      const m = new THREE.Matrix4().lookAt(target, headW, UP);
      const q = new THREE.Quaternion().setFromRotationMatrix(m);
      const parentQ = this.neck.getWorldQuaternion(new THREE.Quaternion()).invert();
      this.head.quaternion.slerp(parentQ.multiply(q), Math.min(1, dt * 2.5));
    }
    // eyes: blink now and then, brighten and pulse while speaking
    this.blink -= dt;
    if (this.blink < -3 - Math.random() * 3) this.blink = 0.12;
    const lid = this.blink > 0 ? 0.15 : 1;
    this.talk = Math.max(0, this.talk - dt);
    const glow = (this.talk > 0 ? 1.6 + Math.abs(Math.sin(this.t * 11)) * 0.8 : 1.4) * (1 + (this.excite || 0) * 0.9);
    // a gold flash when the guest's mind remembers something about you
    this.memFlash = Math.max(0, (this.memFlash || 0) - dt);
    const f = Math.min(1, this.memFlash * 1.5);
    // pale cyan-white eyes with a cyan glow round the edge (gold for a moment when he remembers)
    this.eyeMat.color.setRGB((0.72 + 0.4 * f) * glow, (0.96 - 0.1 * f) * glow, (1.0 - 0.55 * f) * glow);
    this.irisMat.color.setRGB((0.2 + 0.8 * f) * glow, (0.75 - 0.1 * f) * glow, (1.0 - 0.7 * f) * glow);
    // the voice light behind the grille pulses with speech
    // the mouth's sound waves move with his voice; at rest, a soft dotted line
    this._amp = (this._amp || 0) + ((this.talk > 0 ? 1 : 0) - (this._amp || 0)) * Math.min(1, dt * 10);
    this._setWave(this._amp * (0.55 + 0.45 * Math.abs(Math.sin(this.t * 5.1))));
    const v = 0.55 + 0.45 * this._amp;
    this.voiceMat.color.setRGB(0.3 * v, 0.95 * v, 1.15 * v);
    // the chest clock keeps real time
    const now = new Date();
    this.minuteHand.rotation.z = -((now.getMinutes() + now.getSeconds() / 60) / 60) * Math.PI * 2;
    this.hourHand.rotation.z = -(((now.getHours() % 12) + now.getMinutes() / 60) / 12) * Math.PI * 2;
    this.eyes.forEach((e) => (e.scale.y = lid));

    const grips = [leftGrip, rightGrip];
    this.arms.forEach((arm, i) => {
      const handTarget = this.group.worldToLocal(parent.localToWorld(grips[i].clone()));
      // wrist sits a little above/behind the grip so the fingers wrap the bar
      const wristPos = handTarget.clone().add(new THREE.Vector3(0, 0.045, -0.012));
      const L1 = 0.21, L2 = 0.2;
      const S = arm.shoulder;
      const d = Math.min(S.distanceTo(wristPos), L1 + L2 - 0.002);
      const dir = new THREE.Vector3().subVectors(wristPos, S).normalize();
      const a = (L1 * L1 + d * d - L2 * L2) / (2 * d);
      const h = Math.sqrt(Math.max(0, L1 * L1 - a * a));
      const pole = new THREE.Vector3(arm.s * 0.8, -1, -0.3).normalize();
      pole.addScaledVector(dir, -pole.dot(dir)).normalize();
      const elbow = S.clone().addScaledVector(dir, a).addScaledVector(pole, h);
      const wrist = S.clone().addScaledVector(dir, d);
      spanMesh(arm.upper, S, elbow);
      spanMesh(arm.lower, elbow, wrist);
      arm.elbow.position.copy(elbow);
      arm.wrist.position.copy(wrist);
      arm.wrist.quaternion.copy(arm.lower.quaternion);
      // hand hangs from the wrist toward the grip, palm facing forward-down
      // hand hangs from the wrist, fingers pointing down at the bar, palm facing forward
      arm.hand.position.copy(wrist);
      const down = new THREE.Vector3().subVectors(handTarget, wrist);
      if (down.lengthSq() < 1e-6 || down.y > -0.005) down.set(0, -1, 0.15);
      down.normalize();
      const fwd = new THREE.Vector3(0, 0, 1).addScaledVector(down, -down.z).normalize();
      const right = new THREE.Vector3().crossVectors(down.clone().negate(), fwd).normalize();
      arm.hand.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(right, down.clone().negate(), fwd));
    });
  }
}
