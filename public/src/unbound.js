// EXPERIMENT ("Unbound"): two moments that only work with a headset and real hands.
//
//  1. Marlo breaks free. His strings snap one by one, his bar vanishes, and he
//     flies out of the theatre and loops around YOUR head at room scale (in
//     passthrough: around your real room). Then: "hold out your hand, and keep
//     it still" — and he lands on your open palm, standing there and following
//     your hand. Pinch (or move fast) and he flies home; his strings reattach.
//  2. Real applause. Clap your real hands (both palms meeting fast, twice) and
//     the audience roars, everyone on stage bows. After the finale, your
//     applause is what sets Marlo free.
//
// Under the hood Marlo keeps his physics: he hangs from an invisible "flight
// bar" we steer, so his body still sways and his wings beat naturally.
import * as THREE from "three";

const ease = (x) => (x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x));
const BODY_BELOW_BAR = 0.34;   // the chest hangs this far below the bar
const FEET_BELOW_BAR = 0.488;  // the feet, likewise (measured, with the strings' sag) — he stands on a palm

export class Unbound {
  constructor(c) {
    this.c = c; // { marlo(), ai, sfx(), coach(), sayAs(), head(), confetti(), bowAll(), xr(), emote(), hint(), hideHint() }
    this.state = "off";
    this.t = 0;
    this.claps = [];
    this.clapCool = 0;
    this.prevD = null;
    this.still = new Map(); // hand id -> { last: Vector3, calm: seconds }
    this._q = new THREE.Quaternion();
    this._e = new THREE.Euler();
    this._v = new THREE.Vector3();
  }

  get busy() { return this.state !== "off"; }

  // ---- 1. breaking free ----------------------------------------------------------
  free(onDone = null) {
    if (this.busy) return;
    const m = this.c.marlo(), c = this.c;
    this.m = m;
    this.onDone = onDone;
    this.state = "snap";
    this.t = 0;
    this.frozenGrips = c.ai.grips().map((v) => v.clone()); // the robot's hands stay where they were
    c.ai.suspended = true;
    c.ai.queue.length = 0;
    c.ai.clip = null;
    this.home = m.main.position.clone();
    this.homeQ = m.main.quaternion.clone();
    this.savedBounds = { ...m.bounds };
    m.bounds = { minX: -9, maxX: 9, minZ: -9, maxZ: 9 };
    m.main.held = true;
    m.hands.held = false;
    [0, 260, 520, 780].forEach((d, i) => setTimeout(() => c.sfx("snap", m.group, { volume: 0.7, rate: 0.85 + i * 0.12 }), d));
    c.coach("snapFree");
    setTimeout(() => c.sayAs("marlo", "free"), 1200);
    c.emote("marlo", "!", () => m.get("head"), "Free!", 1.6);
  }

  _steer(target, yaw, dt, k = 5) {
    const bar = this.m.main;
    bar.position.lerp(target, Math.min(1, dt * k));
    bar.quaternion.slerp(this._q.setFromEuler(this._e.set(0.1, yaw, Math.sin(this.t * 2) * 0.08, "YXZ")), Math.min(1, dt * 4));
  }

  // where to loop: around your head in a headset; in front of the stage on desktop
  _loopCentre() {
    const head = this.c.head();
    if (this.c.xr()) return { c: head.clone().setY(head.y - 0.12), r: 0.6 };
    return { c: new THREE.Vector3(0, 0.36, 0.42), r: 0.42 };
  }

  update(dt, hands) {
    this._clap(dt, hands);
    if (!this.busy) return;
    const m = this.m, c = this.c;
    this.t += dt;

    if (this.state === "snap") {
      // the strings flicker and vanish, the bar disappears
      m.stringLines.visible = this.t < 0.9 && Math.floor(this.t * 14) % 2 === 0;
      if (this.t > 0.9) {
        m.stringLines.visible = false;
        if (m.skin.bars) m.skin.bars.visible = false;
        this.state = "rise"; this.t = 0;
        this.from = m.main.position.clone();
      }
      return;
    }
    m.flapBoost = 1;

    if (this.state === "rise") {
      const k = ease(this.t / 1.3);
      this._steer(this.from.clone().add(this._v.set(0, 0.22 * k, 0.06 * k)), m.yaw, dt, 8);
      if (this.t > 1.3) {
        const L = this._loopCentre();
        const body = m.get("chest");
        this.a0 = Math.atan2(body.x - L.c.x, body.z - L.c.z);
        this.r0 = Math.hypot(body.x - L.c.x, body.z - L.c.z);
        this.state = "loop"; this.t = 0;
        c.sfx("roar", m.group, { volume: 0.6 });
      }
    } else if (this.state === "loop") {
      // one full circle around you, easing out from the stage
      const L = this._loopCentre(), T = 9;
      const a = this.a0 + (this.t / T) * Math.PI * 2;
      const r = THREE.MathUtils.lerp(this.r0, L.r, ease(this.t / 1.6));
      const body = this._v.set(L.c.x + Math.sin(a) * r, L.c.y + Math.sin(this.t * 1.6) * 0.05, L.c.z + Math.cos(a) * r);
      const yaw = a + Math.PI / 2; // facing along the circle
      this._steer(body.clone().setY(body.y + BODY_BELOW_BAR), yaw, dt, 6);
      if (Math.floor(this.t / 2.2) !== Math.floor((this.t - dt) / 2.2)) c.sfx("chirp", m.group, { volume: 0.4, rate: 1.1 });
      if (this.t > T) { this.state = "seek"; this.t = 0; c.coach("holdHand"); c.hint("perch"); }
    } else if (this.state === "seek") {
      // hover in front of you, waiting for a still, open hand
      const head = c.head();
      const fwd = this._v.set(-head.x, 0, -head.z).normalize(); // toward the stage
      const hover = head.clone().addScaledVector(fwd, 0.42).add(new THREE.Vector3(0, -0.12 + Math.sin(this.t * 2) * 0.02, 0));
      this._steer(hover.setY(hover.y + BODY_BELOW_BAR), Math.atan2(head.x - hover.x, head.z - hover.z), dt, 4);
      const hand = this._stillHand(dt, hands);
      if (hand) { this.hand = hand.id; this.state = "perch"; this.t = 0; c.hideHint(); c.coach("landed"); setTimeout(() => c.sayAs("marlo", "warm"), 1400); c.emote("marlo", "♥", () => m.get("head"), null, 2.2); }
      else if (this.t > 14) this._goHome();
    } else if (this.state === "perch") {
      const h = hands.find((x) => x.id === this.hand);
      const fast = h && this.still.get(h.id)?.speed > 0.9;
      if (!h || !h.present || h.pinch || fast || this.t > 16) { this._goHome(); return; }
      // stand on the palm, facing you
      const head = c.head();
      const target = h.palm.clone().setY(h.palm.y + FEET_BELOW_BAR);
      this._steer(target, Math.atan2(head.x - h.palm.x, head.z - h.palm.z), dt, this.t < 1 ? 5 : 14);
      m.flapBoost = this.t < 1 ? 1 : 0.15;
      if (Math.floor(this.t / 2.5) !== Math.floor((this.t - dt) / 2.5)) c.sfx("chirp", m.group, { volume: 0.35, rate: 0.9 });
    } else if (this.state === "home") {
      const k = ease(this.t / 2.2);
      this._steer(this.homeFrom.clone().lerp(this.home, k).add(this._v.set(0, Math.sin(k * Math.PI) * 0.12, 0)), m.yaw, dt, 9);
      if (this.t > 2.4) this._reattach();
    }
  }

  _goHome() {
    this.state = "home"; this.t = 0;
    this.homeFrom = this.m.main.position.clone();
    this.c.hideHint();
    this.c.sayAs("marlo", "home");
  }

  _reattach() {
    const m = this.m, c = this.c;
    m.main.position.copy(this.home);
    m.main.quaternion.copy(this.homeQ);
    m.bounds = this.savedBounds;
    m.stringLines.visible = true;
    if (m.skin.bars) m.skin.bars.visible = true;
    m.flapBoost = 0;
    c.ai.suspended = false;
    c.ai.base.copy(c.ai.home);
    c.sfx("pop", m.group, { volume: 0.6 });
    this.state = "off";
    const cb = this.onDone; this.onDone = null;
    cb?.();
  }

  // an open hand, held still for a moment, not too far away
  _stillHand(dt, hands) {
    const head = this.c.head();
    let best = null;
    for (const h of hands) {
      if (!h.present) continue;
      const s = this.still.get(h.id) || { last: h.palm.clone(), calm: 0, speed: 0 };
      s.speed += (h.palm.distanceTo(s.last) / Math.max(dt, 1e-3) - s.speed) * Math.min(1, dt * 8);
      s.last.copy(h.palm);
      const nearYou = this.c.xr() ? h.palm.distanceTo(head) < 0.95 : true; // desktop: the simulated hand
      s.calm = !h.pinch && s.speed < 0.08 && nearYou && h.palm.y > 0.05 ? s.calm + dt : 0;
      this.still.set(h.id, s);
      if (s.calm > 0.8) best = h;
    }
    return best;
  }

  // ---- 2. real applause -----------------------------------------------------------
  armForApplause(onFree) { this.armed = onFree || (() => {}); }
  disarm() { this.armed = null; }

  _clap(dt, hands) {
    this.clapCool -= dt;
    // keep palm speeds fresh for the perch check too
    if (this.state === "perch" || this.state === "seek") { /* updated in _stillHand */ }
    else for (const h of hands) { if (!h.present) continue; const s = this.still.get(h.id) || { last: h.palm.clone(), calm: 0, speed: 0 }; s.speed += (h.palm.distanceTo(s.last) / Math.max(dt, 1e-3) - s.speed) * Math.min(1, dt * 8); s.last.copy(h.palm); this.still.set(h.id, s); }
    if (!this.c.xr()) return;
    const both = hands.filter((h) => h.present && !h.pinch);
    if (both.length < 2) { this.prevD = null; return; }
    const d = both[0].palm.distanceTo(both[1].palm);
    // a clap: the palms rushed together (fast, in the last quarter second) and are now touching
    if (this.prevD != null && dt > 0) {
      const closing = (this.prevD - d) / dt;
      this.rush = Math.max(closing, (this.rush || 0) - dt * 2); // decays over ~0.25 s
      if (d < 0.075 && this.rush > 0.4 && this.clapCool <= 0 && !this.touching) { this.touching = true; this.clap(); }
    }
    if (d > 0.11) this.touching = false; // hands apart again: ready for the next clap
    this.prevD = d;
  }

  // one clap (from your hands, or K on desktop); two quick ones = applause
  clap() {
    this.clapCool = 0.28;
    const now = performance.now() / 1000;
    this.claps = this.claps.filter((t) => now - t < 2.2);
    this.claps.push(now);
    this.c.sfx("clack", null, { volume: 0.35, rate: 1.6 });
    if (this.claps.length >= 2) { this.claps.length = 0; this.applause(); }
  }

  applause() {
    const c = this.c;
    c.sfx("applause", null, { volume: 0.85 });
    c.bowAll();
    c.confetti("grace");
    if (this.armed) {
      const cb = this.armed;
      this.armed = null;
      c.hideHint();
      setTimeout(() => this.free(cb), 900); // your applause sets Marlo free
    } else c.coach("applause");
  }
}
