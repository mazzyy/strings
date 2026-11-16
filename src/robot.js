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
    this.eyeMat = new THREE.MeshBasicMaterial({ color: 0x9feaff, toneMapped: false });
    this.irisMat = new THREE.MeshBasicMaterial({ color: 0x3fb8e8, toneMapped: false });
    const visorMat = new THREE.MeshPhysicalMaterial({ color: 0x07090c, roughness: 0.06, metalness: 0.2, clearcoat: 1, clearcoatRoughness: 0.03 });
    const glass = new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0.04, metalness: 0, transparent: true, opacity: 0.16, clearcoat: 1, depthWrite: false });
    this.voiceMat = new THREE.MeshBasicMaterial({ color: 0x1a2a30, toneMapped: false });
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

    // head: a smooth porcelain dome
    this.head = new THREE.Group();
    this.head.position.set(0, 0.075, 0.005);
    this.neck.add(this.head);
    const skull = add(this.head, new THREE.SphereGeometry(0.075, 48, 36), shell, [0, 0.078, -0.004]);
    skull.scale.set(0.97, 1.0, 0.95);
    // a band of dark glass across the eyes, like a real robot's sensor visor
    const visor = add(this.head, new THREE.SphereGeometry(0.0758, 48, 16, Math.PI * 0.24, Math.PI * 0.52, Math.PI * 0.405, Math.PI * 0.135), visorMat, [0, 0.078, -0.004]);
    visor.scale.set(0.97, 1.0, 0.95); visor.castShadow = false;
    // eyes: lenses behind the glass (a lit iris ring around a bright pupil); they blink with a shutter
    this.eyes = [-1, 1].map((s) => {
      const eye = new THREE.Group();
      // (sat just proud of the glass and only gently angled, so no edge dips behind it)
      eye.position.set(s * 0.0245, 0.0835, 0.0672);
      eye.rotation.set(-0.05, s * 0.22, 0);
      this.head.add(eye);
      add(eye, new THREE.TorusGeometry(0.0068, 0.0012, 8, 32), this.irisMat, [0, 0, 0]).castShadow = false;
      add(eye, new THREE.RingGeometry(0.0036, 0.0054, 32), this.irisMat, [0, 0, 0.0001]).castShadow = false; // (the iris)
      add(eye, new THREE.CircleGeometry(0.0026, 28), this.eyeMat, [0, 0, 0.0003]).castShadow = false; // (the bright pupil)
      return eye;
    });
    // a speaker grille for a mouth: thin slats over a light that glows as he speaks
    const grille = new THREE.Group();
    grille.position.set(0, 0.049, 0.0645);
    grille.rotation.x = 0.4;
    this.head.add(grille);
    const slot = new THREE.Shape(); slot.moveTo(-0.0095, -0.0032); slot.absarc(0.0095, 0, 0.0032, -Math.PI / 2, Math.PI / 2, false); slot.absarc(-0.0095, 0, 0.0032, Math.PI / 2, Math.PI * 1.5, false);
    add(grille, new THREE.ShapeGeometry(slot, 12), dark, [0, 0, 0]).castShadow = false;
    this.mouth = add(grille, new THREE.ShapeGeometry(slot, 12), this.voiceMat, [0, 0, 0.0002]);
    this.mouth.scale.set(0.86, 0.6, 1); this.mouth.castShadow = false;
    for (let i = 0; i < 3; i++) add(grille, new THREE.BoxGeometry(0.023, 0.0009, 0.001), face, [0, -0.0017 + i * 0.0017, 0.0007]).castShadow = false;
    this.mouthDark = dark;

    // ears: small discs with a soft light ring
    for (const s of [-1, 1]) {
      add(this.head, new THREE.CylinderGeometry(0.018, 0.02, 0.012, 28), face, [s * 0.067, 0.078, -0.004], [0, 0, Math.PI / 2]);
      add(this.head, new THREE.CylinderGeometry(0.011, 0.011, 0.014, 24), joint, [s * 0.069, 0.078, -0.004], [0, 0, Math.PI / 2]);
      add(this.head, new THREE.TorusGeometry(0.0125, 0.0009, 6, 28), this.accentMat, [s * 0.0745, 0.078, -0.004], [0, Math.PI / 2, 0]);
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
    this.eyeMat.color.setRGB((0.35 + 0.9 * f) * glow, (0.95 - 0.15 * f) * glow, (1.1 - 0.8 * f) * glow);
    this.irisMat.color.setRGB((0.22 + 0.7 * f) * glow, (0.65 - 0.1 * f) * glow, (0.9 - 0.6 * f) * glow);
    // the voice light behind the grille pulses with speech
    const v = this.talk > 0 ? 0.35 + 0.65 * Math.abs(Math.sin(this.t * 13) * Math.sin(this.t * 7.3)) : 0.06;
    this.voiceMat.color.setRGB(0.25 * v + 0.05, 0.85 * v + 0.06, 1.1 * v + 0.08);
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
