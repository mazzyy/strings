// Verlet marionette: a small ragdoll of particles + sticks, hung from two
// control bars by rope constraints. All coordinates are metres in stage space
// (stage floor at y = 0, puppet faces +z when at rest).
import * as THREE from "three";
import { batchParts } from "./batch.js";

const GRAVITY = -3.6; // theatrical: lighter than real gravity so motion reads as floaty wood
const STEP = 1 / 120;
const ITER = 10;

// rest pose, relative to the puppet's root on the floor
const REST = {
  head: [0, 0.218, 0.004],
  neck: [0, 0.19, 0],
  lS: [-0.032, 0.182, 0],
  rS: [0.032, 0.182, 0],
  chest: [0, 0.158, 0.014],
  pelvis: [0, 0.116, -0.004],
  lH: [-0.018, 0.11, 0],
  rH: [0.018, 0.11, 0],
  lE: [-0.039, 0.146, 0],
  rE: [0.039, 0.146, 0],
  lW: [-0.042, 0.108, 0.006],
  rW: [0.042, 0.108, 0.006],
  lK: [-0.018, 0.061, 0.004],
  rK: [0.018, 0.061, 0.004],
  lF: [-0.018, 0.006, 0],
  rF: [0.018, 0.006, 0],
};

// [a, b, stiffness]
const STICKS = [
  // upper body (rigid)
  ["neck", "lS", 1], ["neck", "rS", 1], ["lS", "rS", 1],
  ["chest", "neck", 1], ["chest", "lS", 1], ["chest", "rS", 1],
  ["head", "neck", 1], ["head", "lS", 1], ["head", "rS", 1], ["head", "chest", 1],
  // pelvis (rigid)
  ["pelvis", "lH", 1], ["pelvis", "rH", 1], ["lH", "rH", 1],
  // spine (neck-pelvis rigid, the rest soft so the waist can bend)
  ["neck", "pelvis", 1], ["chest", "pelvis", 0.5],
  ["lS", "lH", 0.12], ["rS", "rH", 0.12], ["lS", "rH", 0.12], ["rS", "lH", 0.12],
  ["chest", "lH", 0.12], ["chest", "rH", 0.12],
  // limbs
  ["lS", "lE", 1], ["lE", "lW", 1], ["rS", "rE", 1], ["rE", "rW", 1],
  ["lH", "lK", 1], ["lK", "lF", 1], ["rH", "rK", 1], ["rK", "rF", 1],
];

// [a, b, minFraction-of-rest] — stops limbs folding through themselves
const MIN_DIST = [
  ["lS", "lW", 0.45], ["rS", "rW", 0.45],
  ["lH", "lF", 0.6], ["rH", "rF", 0.6],
  ["lF", "rF", 1.0], ["lK", "rK", 0.9], ["lW", "rW", 0.6],
];

const v3 = (a) => new THREE.Vector3(a[0], a[1], a[2]);
const tmpA = new THREE.Vector3();
const tmpB = new THREE.Vector3();
const tmpC = new THREE.Vector3();
const FRAME_SCRATCH = { r: new THREE.Vector3(), u: new THREE.Vector3(), c: new THREE.Vector3(), a: new THREE.Vector3(), z: new THREE.Vector3(), m4: new THREE.Matrix4() };

export class ControlBar {
  // kind: "main" | "hands"
  constructor(kind) {
    this.kind = kind;
    this.position = new THREE.Vector3();
    this.quaternion = new THREE.Quaternion();
    this.held = false;
    this.slack = 1; // multiplies string length; >1 = strings go limp
    this.velocity = new THREE.Vector3();
    this._lastPos = null;
    // local attach points (bar axes: x right, y up, z forward = puppet's front)
    this.attach =
      kind === "main"
        ? {
            head: [0, 0, 0.022],
            lS: [-0.036, 0, -0.004],
            rS: [0.036, 0, -0.004],
            pelvis: [0, 0, -0.075],
            lK: [-0.055, 0, 0.085],
            rK: [0.055, 0, 0.085],
          }
        : { lW: [-0.07, 0, 0], rW: [0.07, 0, 0] };
  }

  worldPoint(local, out) {
    out.set(local[0], local[1], local[2]).applyQuaternion(this.quaternion).add(this.position);
    return out;
  }

  trackVelocity(dt) {
    if (this._lastPos && dt > 0) {
      tmpA.copy(this.position).sub(this._lastPos).divideScalar(dt);
      this.velocity.lerp(tmpA, Math.min(1, dt * 8));
    }
    this._lastPos = (this._lastPos || new THREE.Vector3()).copy(this.position);
  }

  // Euler-ish readouts used by the gait / bow assists
  pitch() {
    const fwd = tmpB.set(0, 0, 1).applyQuaternion(this.quaternion);
    return Math.asin(THREE.MathUtils.clamp(-fwd.y, -1, 1)); // + = front tipped down
  }
  roll() {
    const right = tmpB.set(1, 0, 0).applyQuaternion(this.quaternion);
    return Math.asin(THREE.MathUtils.clamp(right.y, -1, 1)); // + = right end up
  }
}

export class Marionette {
  constructor({ root = [0, 0, 0], yaw = 0, skin, ghost = false, stringColor = 0xf5ecd9 } = {}) {
    this.names = Object.keys(REST);
    this.idx = Object.fromEntries(this.names.map((n, i) => [n, i]));
    this.rootRest = v3(root);
    this.yaw = yaw;
    const rot = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), yaw);
    this.rest = this.names.map((n) => v3(REST[n]).applyQuaternion(rot).add(this.rootRest));
    this.pos = this.rest.map((p) => p.clone());
    this.prev = this.rest.map((p) => p.clone());
    this.sticks = STICKS.map(([a, b, k]) => ({
      a: this.idx[a], b: this.idx[b], k,
      len: this.rest[this.idx[a]].distanceTo(this.rest[this.idx[b]]),
    }));
    this.minDist = MIN_DIST.map(([a, b, f]) => ({
      a: this.idx[a], b: this.idx[b],
      len: this.rest[this.idx[a]].distanceTo(this.rest[this.idx[b]]) * f,
    }));

    this.main = new ControlBar("main");
    this.hands = new ControlBar("hands");
    this.main.position.copy(this.rootRest).add(new THREE.Vector3(0, 0.5, 0));
    this.main.quaternion.copy(rot);
    this.main.parked = true;
    this.handsHook = new THREE.Vector3(0, -0.014, -0.088); // where the hand bar hangs on the main bar
    this._placeHandsOnHook();
    this.hands.hooked = true;

    // strings: rest length from rest pose, plus a little designed slack
    const extra = { head: 0.003, lS: 0.003, rS: 0.003, pelvis: 0.012, lK: 0.03, rK: 0.03, lW: 0.012, rW: 0.012 };
    this.strings = [];
    for (const bar of [this.main, this.hands]) {
      for (const [name, local] of Object.entries(bar.attach)) {
        const p = this.rest[this.idx[name]];
        const a = bar.worldPoint(local, new THREE.Vector3());
        this.strings.push({ bar, local, i: this.idx[name], name, len: a.distanceTo(p) + (extra[name] || 0), offset: 0 });
      }
    }

    this.gravityScale = 1; // "moon gravity" mode
    this.fragile = false;  // "fragile strings" mode: a hard yank snaps a string
    this.onSnap = null;    // (stringName, position) => void
    this.onTwang = null;   // a string snapping taut: (stringIndex, tension) => void
    this.tension = new Float32Array(this.strings.length);
    this.gaitPhase = 0;
    this.gaitAmp = 0;
    this.acc = 0;
    this.bounds = { minX: -0.4, maxX: 0.4, minZ: -0.19, maxZ: 0.19 };
    this.ghost = ghost;
    this.skinFactory = skin;
    this.stringColor = stringColor;
    this.group = new THREE.Group();
    this._buildMeshes();
  }

  _placeHandsOnHook() {
    this.hands.position.copy(this.handsHook).applyQuaternion(this.main.quaternion).add(this.main.position);
    this.hands.quaternion.copy(this.main.quaternion);
  }

  // ---- simulation -------------------------------------------------------
  update(dt) {
    dt = Math.min(dt, 0.05);
    if (!this.hands.held) this._placeHandsOnHook();
    this.main.trackVelocity(dt);
    this.hands.trackVelocity(dt);

    // strings go limp when nobody holds the bar (until it's first picked up, the
    // bar rests on its hook so the puppet stands ready, like a real marionette)
    if (this.main.held) this.main.parked = false;
    const up = this.main.held || this.main.parked;
    const mainT = up ? 1 : 2.2;
    const handT = this.hands.held || up ? 1 : 2.2;
    this.main.slack += (mainT - this.main.slack) * Math.min(1, dt * (this.main.held ? 6 : 2.5));
    this.hands.slack += (handT - this.hands.slack) * Math.min(1, dt * (handT === 1 ? 6 : 2.5));

    // gait assist: horizontal bar motion alternately shortens the knee strings
    const v = this.main.velocity;
    const speed = Math.hypot(v.x, v.z);
    const want = this.main.held ? THREE.MathUtils.clamp((speed - 0.015) / 0.12, 0, 1) : 0;
    this.gaitAmp += (want - this.gaitAmp) * Math.min(1, dt * 5);
    this.gaitPhase += dt * (5 + 9 * this.gaitAmp) * (this.gaitAmp > 0.02 ? 1 : 0);
    const s = Math.sin(this.gaitPhase);
    // rocking the bar by hand also lifts the knees (geometrically), on top of this
    // tipping the bar's front down pays out the head & shoulder strings while
    // the back string keeps the hips up — that's a marionette bow
    const pitch = this.main.held ? this.main.pitch() : 0;
    const bowK = THREE.MathUtils.clamp((pitch - 0.15) / 0.55, 0, 1);
    for (const st of this.strings) {
      if (st.name === "lK") st.offset = -0.045 * this.gaitAmp * Math.max(0, s);
      else if (st.name === "rK") st.offset = -0.045 * this.gaitAmp * Math.max(0, -s);
      else if (st.name === "head") st.offset = 0.048 * bowK;
      else if (st.name === "lS" || st.name === "rS") st.offset = 0.036 * bowK;
      else if (st.name === "pelvis") st.offset = 0.004 * bowK;
    }

    // fragile strings: a sharp yank of the bar snaps one of its strings for a few seconds
    for (const st of this.strings) if (st.snapped > 0) st.snapped -= dt;
    if (this.fragile && this.main.held && this.main.velocity.length() > 0.95) {
      const live = this.strings.filter((st) => st.bar === this.main && !(st.snapped > 0) && st.name !== "head");
      if (live.length && (this._snapCool || 0) <= 0) {
        const st = live[Math.floor(Math.random() * live.length)];
        st.snapped = 3.5;
        this._snapCool = 1.2;
        this.onSnap?.(st.name, this.pos[st.i]);
      }
    }
    if (this._snapCool > 0) this._snapCool -= dt;

    this.acc += dt;
    while (this.acc >= STEP) {
      this._step(STEP);
      this.acc -= STEP;
    }
    this._render(dt);
  }

  _step(h) {
    const P = this.pos, Q = this.prev;
    const g = GRAVITY * this.gravityScale * h * h;
    for (let i = 0; i < P.length; i++) {
      const p = P[i], q = Q[i];
      let vx = (p.x - q.x) * 0.988, vy = (p.y - q.y) * 0.988, vz = (p.z - q.z) * 0.988;
      const sp = Math.hypot(vx, vy, vz), cap = 0.011; // ~1.3 m/s: wooden limbs, not rockets
      if (sp > cap) { vx *= cap / sp; vy *= cap / sp; vz *= cap / sp; }
      q.copy(p);
      p.x += vx; p.y += vy + g; p.z += vz;
    }

    // bow assist: tipping the bar's front down folds the upper body forward
    const pitch = this.main.held ? this.main.pitch() : 0;
    if (pitch > 0.18) {
      const f = this.facing(tmpC);
      const k = Math.min(1, (pitch - 0.18) / 0.6) * 0.00018;
      for (const n of ["head", "chest", "neck"]) {
        const p = P[this.idx[n]];
        p.addScaledVector(f, k);
        p.y -= k * 0.6;
      }
    }

    for (let it = 0; it < ITER; it++) {
      for (const s of this.sticks) this._solveStick(s);
      for (const m of this.minDist) {
        const a = P[m.a], b = P[m.b];
        tmpA.subVectors(b, a);
        const d = tmpA.length();
        if (d < m.len && d > 1e-6) {
          tmpA.multiplyScalar((d - m.len) / d * 0.5);
          a.add(tmpA); b.sub(tmpA);
        }
      }
      for (const st of this.strings) {
        if (st.snapped > 0) continue;
        const a = st.bar.worldPoint(st.local, tmpB);
        const p = P[st.i];
        const L = st.len * st.bar.slack + st.offset;
        tmpA.subVectors(p, a);
        const d = tmpA.length();
        if (d > L) {
          // a rope is inelastic: soak up part of the velocity the pull would add,
          // so a sharp yank lifts the puppet instead of flinging it over
          const k = -(d - L) / d;
          p.addScaledVector(tmpA, k);
          this.prev[st.i].addScaledVector(tmpA, k * 0.35);
        }
      }
      this._collide();
    }
    this._kneesForward();
  }

  _solveStick(s) {
    const a = this.pos[s.a], b = this.pos[s.b];
    tmpA.subVectors(b, a);
    const d = tmpA.length();
    if (d < 1e-6) return;
    tmpA.multiplyScalar(((d - s.len) / d) * 0.5 * s.k);
    a.add(tmpA);
    b.sub(tmpA);
  }

  _collide() {
    const P = this.pos, Q = this.prev, B = this.bounds;
    for (let i = 0; i < P.length; i++) {
      const p = P[i];
      const r = i === this.idx.head ? 0.02 : 0.005;
      if (p.y < r) {
        p.y = r;
        // floor friction: kill most horizontal velocity on contact
        const q = Q[i];
        q.x += (p.x - q.x) * 0.55;
        q.z += (p.z - q.z) * 0.55;
      }
      if (p.x < B.minX) p.x = B.minX; else if (p.x > B.maxX) p.x = B.maxX;
      if (p.z < B.minZ) p.z = B.minZ; else if (p.z > B.maxZ) p.z = B.maxZ;
    }
  }

  _kneesForward() {
    const f = this.facing(tmpC);
    for (const [h, k, ft] of [["lH", "lK", "lF"], ["rH", "rK", "rF"]]) {
      const H = this.pos[this.idx[h]], K = this.pos[this.idx[k]], F = this.pos[this.idx[ft]];
      tmpA.addVectors(H, F).multiplyScalar(0.5);
      const ahead = tmpB.subVectors(K, tmpA).dot(f);
      if (ahead < 0.002) K.addScaledVector(f, (0.002 - ahead) * 0.5);
    }
  }

  // ---- readouts used by the director ------------------------------------
  get(name) { return this.pos[this.idx[name]]; }

  facing(out = new THREE.Vector3()) {
    const right = tmpA.subVectors(this.get("rS"), this.get("lS"));
    const up = tmpB.subVectors(this.get("neck"), this.get("pelvis"));
    out.crossVectors(right, up);
    out.y = 0;
    if (out.lengthSq() < 1e-9) out.set(0, 0, 1);
    return out.normalize();
  }

  upAxis(out = new THREE.Vector3()) {
    return out.subVectors(this.get("neck"), this.get("pelvis")).normalize();
  }

  center(out = new THREE.Vector3()) {
    return out.copy(this.get("pelvis"));
  }

  // teleport the whole puppet (and bars) back to rest
  reset() {
    for (let i = 0; i < this.pos.length; i++) {
      this.pos[i].copy(this.rest[i]);
      this.prev[i].copy(this.rest[i]);
    }
    this.main.position.copy(this.rootRest).add(new THREE.Vector3(0, 0.5, 0));
    this.main.quaternion.setFromAxisAngle(new THREE.Vector3(0, 1, 0), this.yaw);
    this.main._lastPos = null;
    this.main.velocity.set(0, 0, 0);
    this.main.parked = true;
    this.hands.held = false;
    this._placeHandsOnHook();
  }

  // ---- rendering ----------------------------------------------------------
  // ---- rendering ----------------------------------------------------------
  // A "skin" (see skins.js) supplies the body and bar visuals; the marionette
  // owns the physics and draws the strings.
  _buildMeshes() {
    this.skin = this.skinFactory(this);
    this.group.add(this.skin.group);
    // one skinned mesh per material instead of one draw call per body part
    this.skin.update(this._frame(), 0);
    this.batch = batchParts(this.skin.group, this.skin.bars);
    const n = this.strings.length;
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(new Float32Array(n * 6), 3));
    geo.setAttribute("color", new THREE.BufferAttribute(new Float32Array(n * 6), 3));
    this._strCol = new THREE.Color(this.stringColor);
    // strings brighten as they pull taut (vertex colours above 1 feed the bloom)
    this.stringLines = new THREE.LineSegments(
      geo,
      new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, opacity: this.ghost ? 0.2 : 0.8, toneMapped: false })
    );
    this.stringLines.frustumCulled = false;
    this.group.add(this.stringLines);
  }

  setHighlight(bar, amount) { this.skin.setHighlight?.(bar, amount); }

  // orientation frames the skins hang their meshes on
  _frame() {
    const f = this.frame || (this.frame = {
      qUpper: new THREE.Quaternion(), qLower: new THREE.Quaternion(), yawQ: new THREE.Quaternion(),
      up: new THREE.Vector3(), facing: new THREE.Vector3(),
    });
    // (scratch objects only: this runs for every puppet, every frame)
    const S = FRAME_SCRATCH;
    const basis = (right, upv) => {
      const r = S.r.copy(right).normalize();
      const u = S.u.copy(upv).addScaledVector(r, -upv.dot(r)).normalize();
      return S.m4.makeBasis(r, u, S.c.crossVectors(r, u));
    };
    f.up.subVectors(this.get("neck"), this.get("pelvis"));
    f.qUpper.setFromRotationMatrix(basis(S.a.subVectors(this.get("rS"), this.get("lS")), f.up));
    f.qLower.setFromRotationMatrix(basis(S.a.subVectors(this.get("rH"), this.get("lH")), f.up));
    this.facing(f.facing);
    f.yawQ.setFromUnitVectors(S.z.set(0, 0, 1), f.facing);
    f.up.normalize();
    return f;
  }

  _render(dt = 0) {
    this.skin.update(this._frame(), dt);
    this.batch?.update();
    const attrs = this.stringLines.geometry.attributes;
    const arr = attrs.position.array, col = attrs.color.array;
    const base = this._strCol;
    let k = 0;
    this.strings.forEach((st, si) => {
      const a = st.bar.worldPoint(st.local, tmpB);
      const p = this.pos[st.i];
      if (st.snapped > 0) {
        // a snapped string dangles from the bar
        tmpA.copy(a).add(tmpC.set(0, -0.05, 0));
        arr[k] = a.x; arr[k + 1] = a.y; arr[k + 2] = a.z; arr[k + 3] = tmpA.x; arr[k + 4] = tmpA.y; arr[k + 5] = tmpA.z;
        for (let j = 0; j < 6; j += 3) { col[k + j] = 1.4; col[k + j + 1] = 0.35; col[k + j + 2] = 0.3; }
        k += 6;
        this.tension[si] = 0;
        return;
      }
      const L = st.len * st.bar.slack + st.offset;
      const tens = Math.max(0, Math.min(1, (a.distanceTo(p) / Math.max(L, 1e-4) - 0.93) / 0.07));
      const prev = this.tension[si];
      this.tension[si] += (tens - prev) * Math.min(1, dt * 12);
      if (prev < 0.35 && tens > 0.95 && this.main.held && st.bar.velocity.length() > 0.25) this.onTwang?.(si, tens);
      const t = this.tension[si];
      const bright = 0.38 + t * 1.25; // slack: dim; taut: glowing
      arr[k] = a.x; arr[k + 1] = a.y; arr[k + 2] = a.z; arr[k + 3] = p.x; arr[k + 4] = p.y; arr[k + 5] = p.z;
      for (let j = 0; j < 6; j += 3) {
        col[k + j] = base.r * bright + t * 0.15;
        col[k + j + 1] = base.g * bright + t * 0.12;
        col[k + j + 2] = base.b * bright + t * 0.1;
      }
      k += 6;
    });
    attrs.position.needsUpdate = true;
    attrs.color.needsUpdate = true;
  }

  setVisible(v) { this.group.visible = v; }
}
