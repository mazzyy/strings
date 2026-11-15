// The AI puppeteer: a glossy white humanoid robot standing behind the stage.
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
    const shell = new THREE.MeshPhysicalMaterial({ color: 0xcfd0d4, roughness: 0.32, metalness: 0.0, clearcoat: 1, clearcoatRoughness: 0.15 });
    const face = new THREE.MeshPhysicalMaterial({ color: 0xc4c5c9, roughness: 0.38, clearcoat: 0.6, clearcoatRoughness: 0.25 });
    const joint = new THREE.MeshStandardMaterial({ color: 0x3a3d42, roughness: 0.4, metalness: 0.8 });
    const mech = new THREE.MeshStandardMaterial({ color: 0x5b6068, roughness: 0.35, metalness: 0.9 });
    const dark = new THREE.MeshStandardMaterial({ color: 0x15171a, roughness: 0.5, metalness: 0.3 });
    this.eyeMat = new THREE.MeshBasicMaterial({ color: 0x7ff3ff, toneMapped: false });
    this.accentMat = new THREE.MeshBasicMaterial({ color: 0x3fd8ff, toneMapped: false });
    const add = (parent, geo, mat, pos, rot) => {
      const o = new THREE.Mesh(geo, mat);
      if (pos) o.position.set(...pos);
      if (rot) o.rotation.set(...rot);
      o.castShadow = true;
      parent.add(o);
      return o;
    };
    const G = this.group;

    // hips + legs: just long enough to stand on the desk at XR scale
    add(G, new THREE.SphereGeometry(0.08, 24, 16), shell, [0, -0.03, 0]).scale.set(1.15, 0.6, 0.8);
    for (const s of [-1, 1]) {
      add(G, new THREE.CylinderGeometry(0.036, 0.03, 0.16, 18), shell, [s * 0.055, -0.12, 0]);
      add(G, new THREE.SphereGeometry(0.03, 16, 12), joint, [s * 0.055, -0.2, 0]);
      add(G, new THREE.CylinderGeometry(0.028, 0.024, 0.05, 16), shell, [s * 0.055, -0.225, 0]);
      add(G, new THREE.BoxGeometry(0.05, 0.02, 0.085), joint, [s * 0.055, -0.245, 0.018]);
    }
    // waist + abdomen (segmented, mechanical)
    add(G, new THREE.CylinderGeometry(0.085, 0.095, 0.08, 28), joint, [0, 0.0, 0]);
    for (let i = 0; i < 4; i++) add(G, new THREE.CylinderGeometry(0.078 - i * 0.002, 0.082 - i * 0.002, 0.022, 28), i % 2 ? mech : joint, [0, 0.055 + i * 0.024, 0]);

    // chest: sculpted V-shaped shell, broad at the shoulders
    const prof = [[0.072, 0], [0.076, 0.03], [0.088, 0.08], [0.104, 0.13], [0.114, 0.17], [0.114, 0.195], [0.104, 0.215], [0.082, 0.228], [0.055, 0.234]];
    const chestG = new THREE.LatheGeometry(prof.map(([r, y]) => new THREE.Vector2(r, y)), 40);
    chestG.scale(1.12, 1, 0.6);
    add(G, chestG, shell, [0, 0.14, 0]);
    // pectoral plates
    for (const s of [-1, 1]) {
      const pec = add(G, new THREE.SphereGeometry(0.06, 24, 16, 0, Math.PI * 2, 0, Math.PI * 0.5), face, [s * 0.048, 0.3, 0.035], [Math.PI / 2 - 0.25, 0, 0]);
      pec.scale.set(1, 0.35, 0.8);
    }
    // chest seam + core light
    add(G, new THREE.BoxGeometry(0.004, 0.16, 0.004), dark, [0, 0.27, 0.098]);
    add(G, new THREE.CircleGeometry(0.012, 24), this.accentMat, [0, 0.31, 0.1005]);
    // collar
    add(G, new THREE.TorusGeometry(0.05, 0.012, 12, 32), joint, [0, 0.375, 0], [Math.PI / 2, 0, 0]);

    // neck: exposed pistons around a core
    this.neck = new THREE.Group();
    this.neck.position.set(0, 0.385, 0);
    G.add(this.neck);
    add(this.neck, new THREE.CylinderGeometry(0.022, 0.026, 0.07, 18), mech, [0, 0.035, 0]);
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      add(this.neck, new THREE.CylinderGeometry(0.0045, 0.0045, 0.075, 8), i % 2 ? joint : mech, [Math.cos(a) * 0.032, 0.035, Math.sin(a) * 0.032]);
    }

    // head
    this.head = new THREE.Group();
    this.head.position.set(0, 0.075, 0.005);
    this.neck.add(this.head);
    const skull = add(this.head, new THREE.SphereGeometry(0.075, 40, 32), shell, [0, 0.075, -0.004]);
    skull.scale.set(0.86, 1.1, 0.95);
    const facePlate = add(this.head, new THREE.SphereGeometry(0.068, 40, 32, -Math.PI * 0.38, Math.PI * 0.76, Math.PI * 0.18, Math.PI * 0.66), face, [0, 0.07, 0.01]);
    facePlate.scale.set(0.86, 1.12, 0.96);
    // brow + nose ridge
    add(this.head, new THREE.BoxGeometry(0.01, 0.03, 0.012), face, [0, 0.066, 0.072], [-0.2, 0, 0]);
    // eye sockets + glowing eyes
    this.eyes = [-1, 1].map((s) => {
      const socket = add(this.head, new THREE.SphereGeometry(0.0125, 20, 14), dark, [s * 0.026, 0.083, 0.06]);
      socket.scale.set(1.3, 0.7, 0.6);
      const eye = add(this.head, new THREE.SphereGeometry(0.0085, 20, 14), this.eyeMat, [s * 0.026, 0.083, 0.065]);
      eye.scale.set(1.35, 0.62, 0.5);
      return eye;
    });
    // mouth line
    this.mouth = add(this.head, new THREE.BoxGeometry(0.026, 0.0025, 0.004), dark, [0, 0.037, 0.071]);
    this.mouthDark = dark;
    // ears: layered discs with a light ring
    for (const s of [-1, 1]) {
      add(this.head, new THREE.CylinderGeometry(0.022, 0.024, 0.014, 28), shell, [s * 0.064, 0.075, -0.005], [0, 0, Math.PI / 2]);
      add(this.head, new THREE.CylinderGeometry(0.014, 0.014, 0.016, 24), joint, [s * 0.066, 0.075, -0.005], [0, 0, Math.PI / 2]);
      add(this.head, new THREE.TorusGeometry(0.017, 0.0015, 6, 28), this.accentMat, [s * 0.072, 0.075, -0.005], [0, Math.PI / 2, 0]);
    }

    // arms
    this.arms = [-1, 1].map((s) => {
      const shoulder = new THREE.Vector3(s * 0.14, 0.335, 0.0);
      const ball = add(G, new THREE.SphereGeometry(0.042, 24, 18), shell, shoulder.toArray());
      ball.scale.set(1, 0.95, 1);
      add(G, new THREE.TorusGeometry(0.036, 0.007, 10, 28), joint, shoulder.toArray(), [0, 0, Math.PI / 2]);
      const upper = add(G, new THREE.CylinderGeometry(0.032, 0.027, 1, 20), shell);
      const elbow = add(G, new THREE.SphereGeometry(0.026, 18, 14), joint);
      const lower = add(G, new THREE.CylinderGeometry(0.025, 0.02, 1, 20), shell);
      const wrist = add(G, new THREE.CylinderGeometry(0.016, 0.016, 0.018, 14), joint);
      // hand: palm + curled fingers + thumb, built pointing along -Y (wrist at origin)
      const hand = new THREE.Group();
      hand.scale.setScalar(0.72);
      G.add(hand);
      const palm = add(hand, new THREE.BoxGeometry(0.044, 0.05, 0.022), shell, [0, -0.03, 0]);
      palm.geometry.translate(0, 0, 0);
      for (let f = 0; f < 4; f++) {
        const x = -0.0165 + f * 0.011;
        add(hand, new THREE.BoxGeometry(0.0095, 0.022, 0.012), f % 2 ? face : shell, [x, -0.064, 0.006], [0.7, 0, 0]);
        add(hand, new THREE.BoxGeometry(0.009, 0.018, 0.011), shell, [x, -0.074, 0.024], [1.9, 0, 0]);
        add(hand, new THREE.SphereGeometry(0.005, 8, 6), joint, [x, -0.075, 0.012]);
      }
      add(hand, new THREE.BoxGeometry(0.011, 0.03, 0.012), shell, [-s * 0.025, -0.04, 0.016], [0.6, 0, s * 0.5]);
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
    this.eyeMat.color.setRGB(0.35 * glow, 0.95 * glow, 1.1 * glow);
    this.eyes.forEach((e) => (e.scale.y = 0.62 * lid));
    this.mouth.material = this.talk > 0 && Math.sin(this.t * 14) > 0 ? this.accentMat : this.mouthDark;

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
