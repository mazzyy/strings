// Props you can hand to the marionettes: a sword, a lantern and a flower rest on
// a little rack at the front of the stage.
//   Headset: pinch a prop, carry it to the knight's hand and let go — he holds
//            it. Carry it to Marlo and let go — it's a gift.
//   Desktop: click a prop to hand it to Sir Pip; click Marlo to give it to him.
import * as THREE from "three";
import { mergeStatic } from "./perf.js";

const tv = new THREE.Vector3();

function buildSword() {
  const g = new THREE.Group();
  const steel = new THREE.MeshStandardMaterial({ color: 0xd5d9e0, metalness: 1, roughness: 0.2 });
  const brass = new THREE.MeshStandardMaterial({ color: 0xd8ac4f, metalness: 1, roughness: 0.3 });
  const leather = new THREE.MeshStandardMaterial({ color: 0x4a2a18, roughness: 0.7 });
  const blade = new THREE.Mesh(new THREE.BoxGeometry(0.007, 0.06, 0.0018), steel);
  blade.position.y = 0.039;
  const tip = new THREE.Mesh(new THREE.ConeGeometry(0.0049, 0.01, 4), steel);
  tip.position.y = 0.074; tip.rotation.y = Math.PI / 4; tip.scale.z = 0.26;
  const guard = new THREE.Mesh(new THREE.BoxGeometry(0.024, 0.0035, 0.004), brass);
  guard.position.y = 0.008;
  const grip = new THREE.Mesh(new THREE.CylinderGeometry(0.0022, 0.0022, 0.014, 8), leather);
  const pommel = new THREE.Mesh(new THREE.SphereGeometry(0.0034, 10, 8), brass);
  pommel.position.y = -0.008;
  g.add(blade, tip, guard, grip, pommel);
  return g;
}

function buildLantern() {
  const g = new THREE.Group();
  const brass = new THREE.MeshStandardMaterial({ color: 0xc09040, metalness: 1, roughness: 0.35 });
  const glass = new THREE.MeshStandardMaterial({ color: 0xffd9a0, emissive: 0xffa040, emissiveIntensity: 0.4, roughness: 0.2, transparent: true, opacity: 0.85 });
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.009, 0.009, 0.018, 12), glass);
  body.position.y = -0.016;
  const cap = new THREE.Mesh(new THREE.ConeGeometry(0.012, 0.008, 12), brass);
  cap.position.y = -0.003;
  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.011, 0.012, 0.004, 12), brass);
  base.position.y = -0.027;
  const handle = new THREE.Mesh(new THREE.TorusGeometry(0.005, 0.0012, 6, 16), brass);
  handle.position.y = 0.003;
  const light = new THREE.PointLight(0xffb060, 0, 0.7, 1.5);
  light.visible = false;
  light.position.y = -0.016;
  g.add(body, cap, base, handle, light);
  g.userData = { glass, light };
  return g;
}

function buildFlower() {
  const g = new THREE.Group();
  const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.0012, 0.0012, 0.045, 6), new THREE.MeshStandardMaterial({ color: 0x3f7a2a, roughness: 0.7 }));
  stem.position.y = 0.018;
  const leaf = new THREE.Mesh(new THREE.SphereGeometry(0.005, 8, 6), stem.material);
  leaf.scale.set(1.6, 0.4, 0.8); leaf.position.set(0.004, 0.012, 0);
  const petalMat = new THREE.MeshStandardMaterial({ color: 0xe8507a, roughness: 0.5 });
  const head = new THREE.Group();
  head.position.y = 0.042;
  for (let i = 0; i < 6; i++) {
    const p = new THREE.Mesh(new THREE.SphereGeometry(0.0055, 10, 8), petalMat);
    const a = (i / 6) * Math.PI * 2;
    p.position.set(Math.cos(a) * 0.006, 0, Math.sin(a) * 0.006);
    p.scale.set(1, 0.45, 1);
    head.add(p);
  }
  const center = new THREE.Mesh(new THREE.SphereGeometry(0.0035, 10, 8), new THREE.MeshStandardMaterial({ color: 0xf2c230, roughness: 0.5 }));
  center.position.y = 0.002;
  head.add(center);
  g.add(stem, leaf, head);
  return g;
}

function buildKey() {
  const g = new THREE.Group();
  const gold = new THREE.MeshStandardMaterial({ color: 0xe8c060, metalness: 1, roughness: 0.25, emissive: 0x553300, emissiveIntensity: 0.5 });
  const bow = new THREE.Mesh(new THREE.TorusGeometry(0.008, 0.0022, 8, 18), gold);
  bow.position.y = 0.03;
  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.0016, 0.0016, 0.03, 8), gold);
  shaft.position.y = 0.01;
  const t1 = new THREE.Mesh(new THREE.BoxGeometry(0.007, 0.003, 0.002), gold); t1.position.set(0.004, -0.002, 0);
  const t2 = new THREE.Mesh(new THREE.BoxGeometry(0.005, 0.003, 0.002), gold); t2.position.set(0.003, 0.004, 0);
  g.add(bow, shaft, t1, t2);
  return g;
}

// how each prop sits in a puppet's hand (relative to the hand + upper-body frame)
const HOLD = {
  sword: { off: [0, -0.004, 0.006], rot: new THREE.Euler(-1.15, 0, 0) },
  lantern: { off: [0, -0.008, 0.004], upright: true },
  flower: { off: [0, -0.01, 0.006], rot: new THREE.Euler(-0.5, 0, 0) },
  key: { off: [0, -0.012, 0.006], rot: new THREE.Euler(-0.3, 0, 0) },
};

export class Props {
  constructor(stageRoot, pip, marlo, { sfx, onEvent, assets } = {}) {
    this.root = stageRoot;
    this.pip = pip;
    this.marlo = marlo;
    this.sfx = sfx;
    this.onEvent = onEvent || (() => {});
    // a small walnut rack at the front-right of the stage
    const rack = new THREE.Group();
    rack.position.set(0.3, 0, 0.155);
    const wood = new THREE.MeshStandardMaterial({ color: 0x7a4f33, roughness: 0.6, map: assets?.tex?.walnut?.map || null });
    const tray = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.006, 0.04), wood);
    tray.position.y = 0.003;
    tray.castShadow = tray.receiveShadow = true;
    rack.add(tray);
    stageRoot.add(rack);

    // an invisible, generous hit ball per prop: the props are only 1-2 cm, so
    // clicking (or pinching) them exactly would be fiddly
    const hitMat = new THREE.MeshBasicMaterial({ visible: false });
    const make = (name, mesh, local, rot) => {
      mesh.traverse((o) => { if (o.isMesh) o.castShadow = true; });
      mergeStatic(mesh); // one draw call per material, not one per petal
      const hit = new THREE.Mesh(new THREE.SphereGeometry(0.03, 8, 6), hitMat);
      hit.position.y = name === "lantern" ? -0.012 : 0.0;
      hit.userData.hit = true;
      mesh.add(hit);
      stageRoot.add(mesh);
      const home = rack.position.clone().add(new THREE.Vector3(...local));
      const homeQ = new THREE.Quaternion().setFromEuler(rot || new THREE.Euler());
      mesh.position.copy(home);
      mesh.quaternion.copy(homeQ);
      return { name, mesh, home, homeQ, state: "rest", hand: null, offset: null, t: 0, from: null, glow: 0 };
    };
    this.items = new Map([
      ["sword", make("sword", buildSword(), [-0.032, 0.009, 0], new THREE.Euler(0, 0.3, Math.PI / 2))],
      ["lantern", make("lantern", buildLantern(), [0.002, 0.034, 0])],
      ["flower", make("flower", buildFlower(), [0.034, 0.004, 0], new THREE.Euler(0, 0, -Math.PI / 2 + 0.15))],
      ["key", make("key", buildKey(), [0, 0, 0])],
    ]);
    // the key only exists in the Clockwork Tower; it rests on Clank's pedestal
    this.setAvailable("key", false);
    this.targets = []; // other things a prop can be used on: [{ name, pos, r }]
  }

  get(name) { return this.items.get(name); }
  // where the held sword's tip is (stage space), for physical hits
  swordTip(out = new THREE.Vector3()) {
    const it = this.items.get("sword");
    if (it.state !== "pip") return null;
    return out.set(0, 0.075, 0).applyQuaternion(it.mesh.quaternion).add(it.mesh.position);
  }
  // show or hide a prop (and where it lives when it's put back)
  setAvailable(name, on, home = null) {
    const it = this.items.get(name);
    if (!it) return;
    it.off = !on;
    it.mesh.visible = on;
    if (home) { it.home.copy(home); }
    if (on || home) { it.state = "rest"; it.hand = null; it.mesh.position.copy(it.home); it.mesh.quaternion.copy(it.homeQ); }
  }
  _target(p) { return this.targets.find((t) => p.distanceTo(t.pos) < t.r) || null; }
  _use(it, target) {
    this.onEvent({ type: "use", prop: it.name, target: target.name });
    if (target.consume) { it.state = "rest"; it.off = true; it.mesh.visible = false; }
  }
  position(name) { return this.items.get(name)?.mesh.position.clone(); }
  heldBy(who) { for (const it of this.items.values()) if (it.state === who && !it.off) return it.name; return null; }
  meshes() { return [...this.items.values()].filter((it) => !it.off).map((it) => it.mesh); }

  setNight(on) {
    const l = this.items.get("lantern").mesh.userData;
    // the lantern's light only exists at night (an unlit light still costs GPU time)
    l.light.visible = on;
    l.light.intensity = on ? 0.9 : 0;
    l.glass.emissiveIntensity = on ? 2.2 : 0.4;
  }

  _give(it, who, { silent = false, from = null } = {}) {
    // only one prop per puppet: whatever they held goes back to the rack
    for (const other of this.items.values()) if (other !== it && other.state === who) this._home(other, false);
    it.state = who;
    it.hand = null;
    this.sfx?.play("pop", it.mesh, { volume: 0.7 });
    if (silent) return;
    if (who === "pip") this.onEvent({ type: "hold", prop: it.name, from });
    if (who === "marlo") { this.onEvent({ type: "give", prop: it.name }); this.sfx?.play("chirp", it.mesh, { volume: 0.8 }); }
  }

  // Marlo's fetch: a prop that's sitting on the rack
  restingItem() {
    const free = [...this.items.values()].filter((it) => it.state === "rest" && !it.off);
    return free.length ? free[Math.floor(Math.random() * free.length)].name : null;
  }
  // move a prop programmatically: to "pip", "marlo" or back to the "rack"
  moveTo(name, who, opts = {}) {
    const it = this.items.get(name);
    if (!it) return;
    if (who === "rack") this._home(it, !opts.silent);
    else this._give(it, who, opts);
  }

  _home(it, announce = true) {
    it.state = "return";
    it.hand = null;
    it.t = 0;
    it.from = it.mesh.position.clone();
    it.fromQ = it.mesh.quaternion.clone();
    if (announce) this.onEvent({ type: "drop", prop: it.name });
  }

  // ---- headset -----------------------------------------------------------------
  // returns true if this pinch picked up a prop
  tryGrab(hand) {
    let best = null, bestD = 0.085; // generous: closing the fingers shifts the pinch point
    for (const it of this.items.values()) {
      if (it.state === "hand" || it.off) continue;
      const d = it.mesh.position.distanceTo(hand.position);
      if (d < bestD) { bestD = d; best = it; }
    }
    if (!best) return false;
    best.state = "hand";
    best.hand = hand.id;
    best.offset = hand.matrix.clone().invert().multiply(new THREE.Matrix4().compose(best.mesh.position, best.mesh.quaternion, new THREE.Vector3(1, 1, 1)));
    this.sfx?.play("pop", best.mesh, { volume: 0.4, rate: 1.3 });
    return true;
  }
  holding(handId) { for (const it of this.items.values()) if (it.state === "hand" && it.hand === handId) return it; return null; }
  follow(hand) {
    const it = this.holding(hand.id);
    if (!it) return;
    hand.matrix.clone().multiply(it.offset).decompose(it.mesh.position, it.mesh.quaternion, tv.set(1, 1, 1));
    it.mesh.scale.set(1, 1, 1);
  }
  release(handId) {
    const it = this.holding(handId);
    if (!it) return;
    const p = it.mesh.position;
    const near = (pt, r) => p.distanceTo(pt) < r;
    const target = this._target(p);
    if (target) { this._use(it, target); return; }
    if (near(this.pip.get("rW"), 0.07) || near(this.pip.get("lW"), 0.07)) this._give(it, "pip");
    else if (near(this.marlo.get("chest"), 0.1) || near(this.marlo.get("rW"), 0.07) || near(this.marlo.get("lW"), 0.07)) this._give(it, "marlo");
    else this._home(it);
  }

  // ---- desktop -------------------------------------------------------------------
  // what's under the mouse: a prop, the guest (when Sir Pip has something to give), or nothing
  pickAt(raycaster) {
    // holding something that can be used on a target (the key → the cage)? the target wins,
    // even if a prop on the rack happens to sit in front of it
    const held = this.heldBy("pip");
    if (held && this.targets.length) {
      const lr = raycaster.ray.clone().applyMatrix4(new THREE.Matrix4().copy(this.root.matrixWorld).invert());
      for (const tg of this.targets) if (lr.distanceToPoint(tg.pos) < tg.r) return { target: tg };
    }
    const hits = raycaster.intersectObjects(this.meshes(), true);
    if (hits.length) {
      const obj = hits[0].object;
      const it = [...this.items.values()].find((i) => { let o = obj; while (o) { if (o === i.mesh) return true; o = o.parent; } return false; });
      if (it && (it.state === "rest" || it.state === "return" || it.state === "pip")) return { prop: it };
    }
    const local = raycaster.ray.clone().applyMatrix4(new THREE.Matrix4().copy(this.root.matrixWorld).invert());
    // a use-target (the cage) when Sir Pip holds something
    for (const tg of this.targets) if (local.distanceToPoint(tg.pos) < tg.r) return { target: tg };
    // the guest: anywhere near their body counts
    const chest = this.marlo.get("chest");
    if (local.distanceToPoint(chest) < 0.06 || local.distanceToPoint(this.marlo.get("head")) < 0.05) return { guest: true };
    return null;
  }
  setHover(name) { for (const it of this.items.values()) it.hover = it.name === name; }

  // returns true if the click was used by a prop or by the guest
  click(raycaster) {
    const target = this.pickAt(raycaster);
    if (!target) return false;
    if (target.target) {
      const held = this.heldBy("pip");
      if (!held) return false;
      this._use(this.items.get(held), target.target);
      return true;
    }
    const it = target.prop;
    if (it) {
      if (it.state === "rest" || it.state === "return") this._give(it, "pip");
      else if (it.state === "pip") this._give(it, "marlo");
      else this._home(it);
      return true;
    }
    // clicked Marlo: hand over whatever the knight is holding
    const held = this.heldBy("pip");
    if (held) { this._give(this.items.get(held), "marlo"); return true; }
    return false;
  }

  // ---- per frame -------------------------------------------------------------------
  update(dt) {
    for (const it of this.items.values()) {
      if (it.state === "pip" || it.state === "marlo") {
        const pup = it.state === "pip" ? this.pip : this.marlo;
        const f = pup.frame;
        if (!f) continue;
        const h = HOLD[it.name];
        const target = pup.get("rW").clone().add(tv.set(...h.off).applyQuaternion(f.qUpper));
        const q = h.upright ? new THREE.Quaternion() : f.qUpper.clone().multiply(new THREE.Quaternion().setFromEuler(h.rot));
        it.mesh.position.lerp(target, Math.min(1, dt * 18));
        it.mesh.quaternion.slerp(q, Math.min(1, dt * 14));
      } else if (it.state === "return") {
        it.t = Math.min(1, it.t + dt * 2.2);
        const k = it.t * it.t * (3 - 2 * it.t);
        it.mesh.position.lerpVectors(it.from, it.home, k);
        it.mesh.position.y += Math.sin(k * Math.PI) * 0.05;
        it.mesh.quaternion.slerpQuaternions(it.fromQ, it.homeQ, k);
        if (it.t >= 1) it.state = "rest";
      } else if (it.state === "rest") {
        // a gentle shimmer so props read as "pick me up"; hovered ones lift and grow
        it.glow += ((it.hover ? 1 : 0) - it.glow) * Math.min(1, dt * 10);
        it.mesh.position.y = it.home.y + Math.max(0, Math.sin(performance.now() / 600 + it.home.x * 40)) * 0.002 + it.glow * 0.012;
        it.mesh.scale.setScalar(1 + it.glow * 0.35);
      }
      if (it.state !== "rest" && it.mesh.scale.x !== 1 && it.state !== "hand") it.mesh.scale.setScalar(1);
    }
  }

  reset() { for (const it of this.items.values()) { it.state = "rest"; it.mesh.position.copy(it.home); it.mesh.quaternion.copy(it.homeQ); } }
}
