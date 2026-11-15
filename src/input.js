// Two input back-ends that produce the same thing: up to two "hands", each with
// a pose (pinch point + wrist orientation) in STAGE space, a pinch flag and a
// fingertip position. The theatre never knows which one is active.
//
//   XRHands      — Quest hand tracking (or controllers as a fallback)
//   DesktopHands — a mouse/keyboard simulator for working without a headset
import * as THREE from "three";

const tmpM = new THREE.Matrix4();
const tmpV = new THREE.Vector3();
const tmpQ = new THREE.Quaternion();

export class HandState {
  constructor(id) {
    this.id = id;
    this.present = false;
    this.pinch = false;
    this.matrix = new THREE.Matrix4();
    this.position = new THREE.Vector3();
    this.quaternion = new THREE.Quaternion();
    this.tip = new THREE.Vector3();
  }
  setPose(pos, quat) {
    this.position.copy(pos);
    this.quaternion.copy(quat);
    this.matrix.compose(pos, quat, new THREE.Vector3(1, 1, 1));
  }
}

// ---------------------------------------------------------------------------
export class XRHands {
  constructor(renderer, scene) {
    this.renderer = renderer;
    this.hands = [new HandState("xr0"), new HandState("xr1")];
    this.slots = [0, 1].map((i) => {
      const controller = renderer.xr.getController(i);
      const grip = renderer.xr.getControllerGrip(i);
      const hand = renderer.xr.getHand(i);
      scene.add(controller, grip, hand);
      const slot = { controller, grip, hand, source: null, select: false };
      const onConnect = (e) => { slot.source = e.data; };
      const onDisconnect = () => { slot.source = null; slot.select = false; };
      controller.addEventListener("connected", onConnect);
      controller.addEventListener("disconnected", onDisconnect);
      controller.addEventListener("selectstart", () => (slot.select = true));
      controller.addEventListener("selectend", () => (slot.select = false));
      controller.addEventListener("squeezestart", () => (slot.squeeze = true));
      controller.addEventListener("squeezeend", () => (slot.squeeze = false));
      return slot;
    });
    this._pinch = [false, false];
  }

  // stageRoot: Object3D whose local space is stage space
  update(stageRoot) {
    const inv = tmpM.copy(stageRoot.matrixWorld).invert();
    for (let i = 0; i < 2; i++) {
      const slot = this.slots[i];
      const hs = this.hands[i];
      hs.present = false;
      if (!slot.source) continue;

      if (slot.source.hand) {
        const j = slot.hand.joints;
        const wrist = j["wrist"], thumb = j["thumb-tip"], index = j["index-finger-tip"];
        if (!wrist || !thumb || !index || !wrist.visible) continue;
        const tw = thumb.getWorldPosition(new THREE.Vector3());
        const iw = index.getWorldPosition(new THREE.Vector3());
        const gap = tw.distanceTo(iw);
        // hysteresis so the grip doesn't flicker at the threshold
        this._pinch[i] = this._pinch[i] ? gap < 0.035 : gap < 0.018;
        const mid = tw.add(iw).multiplyScalar(0.5).applyMatrix4(inv);
        const q = wrist.getWorldQuaternion(new THREE.Quaternion());
        const stageQ = new THREE.Quaternion().setFromRotationMatrix(stageRoot.matrixWorld).invert().multiply(q);
        hs.setPose(mid, stageQ);
        hs.tip.copy(iw).applyMatrix4(inv);
        hs.pinch = this._pinch[i];
        hs.present = true;
      } else {
        const g = slot.grip;
        if (!g.visible) continue;
        const p = g.getWorldPosition(new THREE.Vector3()).applyMatrix4(inv);
        const q = g.getWorldQuaternion(new THREE.Quaternion());
        const stageQ = new THREE.Quaternion().setFromRotationMatrix(stageRoot.matrixWorld).invert().multiply(q);
        hs.setPose(p, stageQ);
        hs.tip.copy(p).add(new THREE.Vector3(0, 0, -0.06).applyQuaternion(stageQ));
        hs.pinch = slot.select || slot.squeeze;
        hs.present = true;
      }
    }
    return this.hands;
  }
}

// ---------------------------------------------------------------------------
// Desktop simulator.
//   mouse            move your hand        (the bar follows while you pinch)
//   left button / G  pinch (hold)  /  toggle a sticky pinch
//   wheel            hand nearer / further
//   Q / E            rock the wrist  (legs lift — the puppet walks)
//   W / S            tip the wrist forward / back  (bow)
//   A / D            twist the wrist  (turn)
//   Space            flick the hand up  (jump)
//   Shift + mouse    move your OTHER hand (arms); right button also works
export class DesktopHands {
  constructor(dom, camera) {
    this.dom = dom;
    this.camera = camera;
    this.main = new HandState("sim-main");
    this.other = new HandState("sim-other");
    this.hands = [this.main, this.other];
    this.keys = new Set();
    this.mouse = new THREE.Vector2(0, 0);
    this.lmb = false;
    this.rmb = false;
    this.sticky = false;
    this.otherSticky = false;
    this.depth = { main: 0, other: 0.03 };
    this.rot = { yaw: 0, pitch: 0, roll: 0 };
    this.jump = 0;
    this.enabled = true;
    this.autopilot = null; // when set, a script drives these hands instead of the mouse

    // where each hand "lives" in stage space before the mouse moves
    this.mainPos = new THREE.Vector3(-0.16, 0.53, 0.0);
    this.otherPos = new THREE.Vector3(-0.16, 0.5, 0.06);
    this._raycaster = new THREE.Raycaster();
    this._hasMouse = false;

    dom.addEventListener("pointermove", (e) => {
      const r = dom.getBoundingClientRect();
      this.mouse.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
      this._hasMouse = true;
    });
    dom.addEventListener("pointerdown", (e) => {
      if (e.button === 0) this.lmb = true;
      if (e.button === 2) this.rmb = true;
    });
    window.addEventListener("pointerup", (e) => {
      if (e.button === 0) this.lmb = false;
      if (e.button === 2) this.rmb = false;
    });
    dom.addEventListener("contextmenu", (e) => e.preventDefault());
    dom.addEventListener("wheel", (e) => {
      const which = this._otherActive() ? "other" : "main";
      this.depth[which] = THREE.MathUtils.clamp(this.depth[which] + Math.sign(e.deltaY) * 0.015, -0.16, 0.16);
      e.preventDefault();
    }, { passive: false });
    window.addEventListener("keydown", (e) => {
      if (e.target && (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA")) return;
      const k = e.key.toLowerCase();
      this.keys.add(k);
      if (k === "g" && !e.repeat) this.sticky = !this.sticky;
      if (k === "h" && !e.repeat) this.otherSticky = !this.otherSticky;
      if (k === " " && !e.repeat) { this.jump = 1; e.preventDefault(); }
    });
    window.addEventListener("keyup", (e) => this.keys.delete(e.key.toLowerCase()));
    window.addEventListener("blur", () => { this.keys.clear(); this.lmb = this.rmb = false; });
  }

  _otherActive() { return this.keys.has("shift") || this.rmb; }

  update(dt, stageRoot) {
    if (this.autopilot) {
      this.autopilot(dt, this);
      return this.hands;
    }
    const otherActive = this._otherActive();

    // mouse ray -> a vertical plane through the hand being moved
    if (this._hasMouse) {
      const which = otherActive ? "other" : "main";
      const planeZ = (which === "main" ? 0 : 0.05) + this.depth[which];
      const plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
      const inv = new THREE.Matrix4().copy(stageRoot.matrixWorld).invert();
      this._raycaster.setFromCamera(this.mouse, this.camera);
      const ray = this._raycaster.ray.clone().applyMatrix4(inv);
      plane.constant = -planeZ;
      const hit = ray.intersectPlane(plane, tmpV);
      if (hit) {
        hit.x = THREE.MathUtils.clamp(hit.x, -0.42, 0.42);
        hit.y = THREE.MathUtils.clamp(hit.y, 0.18, 0.8);
        (which === "main" ? this.mainPos : this.otherPos).lerp(hit, 1);
      }
    }

    // wrist rotation from keys; rock & tip spring back, twist stays
    const K = (k) => (this.keys.has(k) ? 1 : 0);
    const target = { roll: (K("e") - K("q")) * 0.55, pitch: (K("w") - K("s")) * 0.75 };
    this.rot.roll += (target.roll - this.rot.roll) * Math.min(1, dt * 7);
    this.rot.pitch += (target.pitch - this.rot.pitch) * Math.min(1, dt * 6);
    this.rot.yaw += (K("a") - K("d")) * dt * 2.2;

    let jumpY = 0;
    if (this.jump > 0) {
      this.jump = Math.max(0, this.jump - dt * 3.2);
      jumpY = Math.sin((1 - this.jump) * Math.PI) * 0.075;
    }

    const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(this.rot.pitch, this.rot.yaw, -this.rot.roll, "YXZ"));
    this.main.setPose(this.mainPos.clone().add(new THREE.Vector3(0, jumpY, 0)), q);
    const lmb = this.lmb && !this.lmbBlocked; // a click used on a prop isn't a pinch
    this.main.pinch = lmb && !otherActive ? true : this.sticky || (lmb && this._mainWasPinched);
    this._mainWasPinched = this.main.pinch;
    this.main.present = true;

    this.other.setPose(this.otherPos, new THREE.Quaternion());
    this.other.pinch = otherActive || this.otherSticky;
    this.other.present = true;
    this.main.tip.copy(this.main.position);
    this.other.tip.copy(this.other.position);
    return this.hands;
  }
}

// Little ghost hands so you can see where the simulated hands are.
export class SimHandMeshes {
  constructor(parent) {
    this.meshes = [0, 1].map((i) => {
      const g = new THREE.Group();
      const mat = new THREE.MeshStandardMaterial({ color: i === 0 ? 0xffe2c4 : 0xc4e4ff, transparent: true, opacity: 0.55, roughness: 0.6 });
      const palm = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.016, 0.06), mat);
      palm.position.set(0, 0.035, -0.035);
      const thumb = new THREE.Mesh(new THREE.CapsuleGeometry(0.007, 0.025, 4, 8), mat);
      const index = new THREE.Mesh(new THREE.CapsuleGeometry(0.007, 0.035, 4, 8), mat);
      g.add(palm, thumb, index);
      g.userData = { thumb, index };
      parent.add(g);
      return g;
    });
  }
  update(hands, visible) {
    hands.forEach((h, i) => {
      const g = this.meshes[i];
      g.visible = visible && h.present;
      if (!g.visible) return;
      g.position.copy(h.position);
      g.quaternion.copy(h.quaternion);
      const open = h.pinch ? 0 : 1;
      const { thumb, index } = g.userData;
      thumb.position.set(-0.012 - open * 0.012, 0.012, -0.012);
      thumb.rotation.set(0.4, 0, 0.9 + open * 0.4);
      index.position.set(0.004, 0.018 + open * 0.016, -0.02 - open * 0.005);
      index.rotation.set(1.2 - open * 0.6, 0, 0);
    });
  }
}
