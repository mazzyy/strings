// Watches a marionette and turns its body into story events
// (walk, bow, fall, jump, wave, turn, slump, approach, idle...).
// Then the AI performer plays the second marionette in response.
import * as THREE from "three";

const v = new THREE.Vector3();
// scratch objects for the per-frame code
const AV = { a: new THREE.Vector3(), b: new THREE.Vector3(), up: new THREE.Vector3(0, 1, 0), q: new THREE.Quaternion(), e: new THREE.Euler() };
const DV = { c: new THREE.Vector3(), up: new THREE.Vector3(), hipR: new THREE.Vector3(), hipF: new THREE.Vector3(), o: new THREE.Vector3(), d: new THREE.Vector3() };

export class ActionDetector {
  constructor(puppet, other) {
    this.p = puppet;
    this.other = other; // the AI's puppet, for "approach"
    this.listeners = [];
    this.cool = {};
    this.t = 0;
    this.walkTime = 0;
    this.airTime = 0;
    this.bowTime = 0;
    this.downTime = 0;
    this.waveTime = 0;
    this.lastActive = 0;
    this.lastPos = puppet.center(new THREE.Vector3());
    this.vel = new THREE.Vector3();
    this.yawHist = [];
    this.wasHeld = false;
    this.state = "standing";
  }

  on(fn) { this.listeners.push(fn); }

  emit(type, detail = {}, cooldown = 3) {
    if ((this.cool[type] || 0) > this.t) return;
    this.cool[type] = this.t + cooldown;
    this.lastActive = this.t;
    const ev = { type, t: this.t, ...detail };
    for (const fn of this.listeners) fn(ev);
  }

  update(dt) {
    this.t += dt;
    const p = this.p;
    const c = p.center(DV.c);
    const inst = v.subVectors(c, this.lastPos).divideScalar(Math.max(dt, 1e-3));
    this.vel.lerp(inst, Math.min(1, dt * 6));
    this.lastPos.copy(c);
    const speed = Math.hypot(this.vel.x, this.vel.z);
    const up = p.upAxis(DV.up);
    const tilt = Math.acos(THREE.MathUtils.clamp(up.y, -1, 1)); // 0 = upright
    // facing from the hips: stays stable even when the upper body folds over
    const hipR = DV.hipR.subVectors(p.get("rH"), p.get("lH"));
    const hipF = DV.hipF.set(-hipR.z, 0, hipR.x).normalize(); // right x up
    const lean = up.x * hipF.x + up.z * hipF.z; // + = leaning forward
    const lF = p.get("lF").y, rF = p.get("rF").y;
    const held = p.main.held;
    const headY = p.get("head").y;

    // released the bar -> slump
    if (this.wasHeld && !held) this.emit("slump", {}, 2);
    if (!this.wasHeld && held) { this.riseT = this.t; if (this.t > 1) this.emit("rise", {}, 3); }
    this.wasHeld = held;
    if (!held) { this.walkTime = this.airTime = this.bowTime = 0; return; }

    // fell over (body lying down while the bar is still held)
    const pelvisY = p.get("pelvis").y;
    if (headY < 0.07 || (up.y < 0.1 && pelvisY < 0.075)) {
      this.downTime += dt;
      if (this.downTime > 0.35) this.emit("fall", {}, 5);
    } else this.downTime = 0;

    // bow: upper body tipped forward, feet down
    const bowing = lean > 0.35 && headY > 0.07 && pelvisY > 0.075;
    if (bowing) this.lastBowT = this.t;
    const recentlyBowed = this.t - (this.lastBowT ?? -9) < 1.2;
    if (bowing && Math.min(lF, rF) < 0.04) {
      this.bowTime += dt;
      if (this.bowTime > 0.35) this.emit("bow", {}, 4);
    } else this.bowTime = 0;

    // jump: both feet clearly off the floor
    if (lF > 0.025 && rF > 0.025 && tilt < 0.6 && this.t - (this.riseT ?? -9) > 1.5 && !recentlyBowed) {
      this.airTime += dt;
      if (this.airTime > 0.12) this.emit("jump", {}, 2.5);
    } else this.airTime = 0;

    // walk: sustained horizontal travel
    if (speed > 0.045 && !bowing && Math.min(lF, rF) < 0.04) {
      this.walkTime += dt;
      if (this.walkTime > 0.7) {
        const toOther = v.subVectors(this.other.center(new THREE.Vector3()), c).setY(0).normalize();
        const dir = new THREE.Vector3(this.vel.x, 0, this.vel.z).normalize();
        const d = dir.dot(toOther);
        let where = "across the stage";
        if (d > 0.6) where = "toward Marlo";
        else if (d < -0.6) where = "away from Marlo";
        else if (dir.z > 0.6) where = "toward the audience";
        else if (dir.z < -0.6) where = "upstage, toward the back";
        this.emit("walk", { where, fast: speed > 0.12 }, 4);
      }
    } else this.walkTime = Math.max(0, this.walkTime - dt * 2);

    // wave: a hand raised above the head
    const hand = Math.max(p.get("lW").y, p.get("rW").y);
    if (hand > headY - 0.01) {
      this.waveTime += dt;
      if (this.waveTime > 0.3) this.emit("wave", {}, 4);
    } else this.waveTime = 0;

    // turn: facing changes a lot within a second
    const yaw = Math.atan2(hipF.x, hipF.z);
    this.yawHist.push([this.t, yaw]);
    while (this.yawHist.length && this.yawHist[0][0] < this.t - 1) this.yawHist.shift();
    if (this.yawHist.length > 2) {
      let dy = yaw - this.yawHist[0][1];
      dy = Math.atan2(Math.sin(dy), Math.cos(dy));
      if (Math.abs(dy) > 1.2 && !recentlyBowed) {
        const facingAudience = hipF.z > 0.7;
        const facingMarlo = v.subVectors(this.other.center(new THREE.Vector3()), c).setY(0).normalize().dot(hipF) > 0.7;
        this.emit("turn", { toward: facingMarlo ? "Marlo" : facingAudience ? "the audience" : "away" }, 3);
      }
    }

    // approach: close to the other puppet
    const dist = c.distanceTo(this.other.center(DV.o));
    if (dist < 0.11) this.emit("approach", {}, 8);

    // idle: nothing for a while
    if (this.t - this.lastActive > 9) this.emit("idle", {}, 12);
  }
}

export function describe(ev) {
  switch (ev.type) {
    case "walk": return `Sir Pip walks ${ev.where}${ev.fast ? ", quickly" : ""}`;
    case "bow": return "Sir Pip bows";
    case "fall": return "Sir Pip falls over";
    case "jump": return "Sir Pip jumps";
    case "wave": return "Sir Pip raises an arm and waves";
    case "turn": return `Sir Pip turns to face ${ev.toward}`;
    case "slump": return "Sir Pip goes limp and collapses";
    case "rise": return "Sir Pip is lifted back to his feet";
    case "approach": return "Sir Pip comes right up close to Marlo the dragon";
    case "idle": return "Sir Pip stands very still for a long moment";
    case "hold": return `Sir Pip is handed the ${ev.prop}`;
    case "give": return `Sir Pip gives the ${ev.prop} to Marlo as a gift`;
    case "drop": return `The ${ev.prop} goes back on its rack`;
    case "talk": return "The audience member talks to Marlo";
    case "snap": return "One of Sir Pip's strings snaps";
    default: return `Sir Pip: ${ev.type}`;
  }
}

// ---------------------------------------------------------------------------
// The AI performer: drives the second marionette's bars with little clips.
const ease = (x) => (x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x));

export class AIPerformer {
  constructor(puppet, partner) {
    this.p = puppet;
    this.partner = partner;
    this.home = puppet.main.position.clone();
    this.base = this.home.clone(); // where the main bar "rests"
    this.yaw = puppet.yaw;
    this.clip = null;
    this.queue = [];
    this.t = 0;
    this.p.main.held = true;
    this.current = "idle";
    this.lookYaw = this.yaw;
  }

  // Marlo dozes off (strings slack) until woken
  sleep(on) {
    this.sleeping = on;
    if (on) { this.clip = null; this.queue.length = 0; }
  }

  react(name, opts = {}) {
    if (!CLIPS[name] || this.sleeping) return;
    this.onReact?.(name);
    // don't stack the same reaction
    if (this.clip && this.clip.name === name && !opts.force) return;
    if (this.queue.length > 1) this.queue.shift();
    this.queue.push({ name, opts });
  }

  // anything playing or waiting?
  get busy() { return !!this.clip || this.queue.length > 0; }

  _yawTo(target) {
    const d = new THREE.Vector3().subVectors(target, this.p.center(new THREE.Vector3()));
    return Math.atan2(d.x, d.z);
  }

  update(dt) {
    this.t += dt;
    // gentle clips (sulking, pointing) give way as soon as something new happens
    if (this.clip?.interruptible && this.queue.length) { this.clip.onEnd?.(); this.clip = null; }
    if (!this.clip && this.queue.length) {
      const { name, opts } = this.queue.shift();
      this.clip = { name, t: 0, ...CLIPS[name](this, opts) };
      this.current = name;
    }

    // defaults: breathing idle, gently watching Pip
    const pose = this._pose || (this._pose = { pos: new THREE.Vector3() });
    pose.pos.copy(this.base);
    pose.yaw = this.yaw;
    pose.pitch = 0;
    pose.roll = Math.sin(this.t * 1.3) * 0.04;
    pose.hands = null; // {pos offset, roll} when the AI lifts the hand bar
    pose.held = true;
    pose.pos.y += Math.sin(this.t * 2.1) * 0.003;

    if (this.sleeping) {
      pose.held = false;
    } else if (this.clip) {
      this.clip.t += dt;
      const done = this.clip.run(this.clip.t, pose, dt);
      if (done) {
        this.clip.onEnd?.();
        this.clip = null;
        this.current = "idle";
      }
    } else {
      // when idle, turn to watch the partner
      const watch = this._yawTo(this.partner.center(AV.a));
      this.yaw = lerpAngle(this.yaw, lerpAngle(0, watch, 0.55), Math.min(1, dt * 1.2));
      pose.yaw = this.yaw;
    }

    // apply to bars (smoothly — the AI has hands, not teleporters)
    const bar = this.p.main;
    bar.held = pose.held;
    bar.position.lerp(pose.pos, Math.min(1, dt * 7));
    const q = AV.q.setFromEuler(AV.e.set(pose.pitch, pose.yaw, -pose.roll, "YXZ"));
    bar.quaternion.slerp(q, Math.min(1, dt * 7));
    const hb = this.p.hands;
    if (pose.hands) {
      hb.held = true;
      const target = AV.b.copy(pose.hands.pos).applyAxisAngle(AV.up, pose.yaw).add(pose.pos);
      hb.position.lerp(target, Math.min(1, dt * 8));
      const hq = AV.q.setFromEuler(AV.e.set(0, pose.yaw, -(pose.hands.roll || 0), "YXZ"));
      hb.quaternion.slerp(hq, Math.min(1, dt * 8));
    } else {
      hb.held = false;
    }
  }

  // grip points for the puppeteer figure's hands (stage space)
  grips() {
    const main = this.p.main.worldPoint([0, 0.04, -0.03], new THREE.Vector3());
    const hands = this.p.hands.held
      ? this.p.hands.worldPoint([0, 0.008, 0], new THREE.Vector3())
      : this.p.main.worldPoint([0, 0.0, -0.088], new THREE.Vector3());
    return [hands, main];
  }
}

function lerpAngle(a, b, t) {
  const d = Math.atan2(Math.sin(b - a), Math.cos(b - a));
  return a + d * t;
}

// walk the bar base toward a target x/z at a gentle pace; returns true on arrival
function walkTo(ai, target, dt, speed = 0.11) {
  const d = new THREE.Vector3(target.x - ai.base.x, 0, target.z - ai.base.z);
  const len = d.length();
  if (len < 0.006) return true;
  const step = Math.min(len, speed * dt);
  ai.base.addScaledVector(d.normalize(), step);
  ai.yaw = lerpAngle(ai.yaw, Math.atan2(d.x, d.z), Math.min(1, dt * 5));
  return false;
}

const CLIPS = {
  idle: () => ({ run: (t) => t > 1 }),

  bow: (ai) => {
    const face = ai._yawTo(ai.partner.center(new THREE.Vector3()));
    return {
      run(t, pose, dt) {
        ai.yaw = lerpAngle(ai.yaw, face, Math.min(1, dt * 4));
        pose.yaw = ai.yaw;
        const k = ease((t - 0.4) / 0.6) * (1 - ease((t - 1.9) / 0.6));
        pose.pitch = 0.85 * k;
        pose.pos.y -= 0.02 * k;
        return t > 2.7;
      },
    };
  },

  wave: (ai) => ({
    run(t, pose) {
      const up = ease(t / 0.4) * (1 - ease((t - 2.2) / 0.4));
      pose.hands = { pos: new THREE.Vector3(0.05, 0.09 * up, 0.05 * up), roll: up * (0.5 + Math.sin(t * 9) * 0.35) };
      return t > 2.7;
    },
  }),

  jump: () => ({
    run(t, pose) {
      const hop = (x) => Math.max(0, Math.sin(x * Math.PI));
      if (t < 0.45) pose.pos.y += hop(t / 0.45) * 0.09;
      else if (t > 0.6 && t < 1.05) pose.pos.y += hop((t - 0.6) / 0.45) * 0.09;
      pose.hands = { pos: new THREE.Vector3(0, 0.06 * hop(Math.min(1, t / 1.05)), 0.02), roll: 0 };
      return t > 1.4;
    },
  }),

  approach: (ai) => ({
    run(t, pose, dt) {
      const pc = ai.partner.center(new THREE.Vector3());
      const dir = new THREE.Vector3(ai.base.x - pc.x, 0, ai.base.z - pc.z).normalize();
      const target = pc.clone().addScaledVector(dir, 0.13);
      const arrived = walkTo(ai, target, dt);
      pose.pos.copy(ai.base);
      pose.yaw = ai.yaw;
      return arrived || t > 5;
    },
  }),

  retreat: (ai) => ({
    run(t, pose, dt) {
      const pc = ai.partner.center(new THREE.Vector3());
      const side = Math.sign(ai.base.x - pc.x) || 1;
      const target = new THREE.Vector3(THREE.MathUtils.clamp(pc.x + side * 0.3, -0.33, 0.33), 0, -0.06);
      const arrived = walkTo(ai, target, dt, 0.16);
      pose.pos.copy(ai.base);
      pose.yaw = ai.yaw;
      if (arrived) {
        ai.yaw = lerpAngle(ai.yaw, ai._yawTo(pc), Math.min(1, dt * 4));
        pose.yaw = ai.yaw;
      }
      return (arrived && t > 1.5) || t > 5;
    },
  }),

  help: (ai) => {
    let phase = 0;
    return {
      run(t, pose, dt) {
        const pc = ai.partner.center(new THREE.Vector3());
        if (phase === 0) {
          const dir = new THREE.Vector3(ai.base.x - pc.x, 0, ai.base.z - pc.z).normalize();
          if (walkTo(ai, pc.clone().addScaledVector(dir, 0.12), dt, 0.18) || t > 4) { phase = 1; this.t1 = t; }
        } else {
          const k = Math.sin(Math.min(1, (t - this.t1) / 1.6) * Math.PI);
          pose.pitch = 0.9 * k;
          pose.hands = { pos: new THREE.Vector3(0, -0.02 * k, 0.07 * k), roll: 0 };
        }
        pose.pos.copy(ai.base);
        pose.yaw = ai.yaw;
        return phase === 1 && t - this.t1 > 1.8;
      },
    };
  },

  mirror: (ai) => {
    const start = ai.base.clone();
    return {
      run(t, pose) {
        // copy Pip's control-bar motion, mirrored across the stage centre
        const pm = ai.partner.main;
        if (pm.held) {
          const pq = new THREE.Euler().setFromQuaternion(pm.quaternion, "YXZ");
          pose.pitch = pq.x;
          pose.roll = pq.z;
          pose.yaw = -pq.y;
          pose.pos.y = start.y + (pm.position.y - 0.5);
        }
        return t > 3.5;
      },
    };
  },

  dance: (ai) => ({
    run(t, pose) {
      pose.roll = Math.sin(t * 6) * 0.45;
      pose.pos.y += Math.abs(Math.sin(t * 6)) * 0.03;
      pose.yaw = ai.yaw + ease((t - 1) / 1.6) * Math.PI * 2;
      pose.hands = { pos: new THREE.Vector3(Math.sin(t * 3) * 0.03, 0.05, 0.03), roll: Math.sin(t * 6 + 1) * 0.5 };
      if (t > 3.2) ai.yaw = pose.yaw;
      return t > 3.3;
    },
  }),

  slump: () => ({
    run(t, pose) {
      pose.held = t > 1.8;
      return t > 3.2;
    },
  }),

  // giggling: a quick shake and bounce
  laugh: () => ({
    run(t, pose) {
      const k = 1 - ease((t - 1.5) / 0.4);
      pose.roll = Math.sin(t * 24) * 0.13 * k;
      pose.pitch = -0.22 * k + Math.sin(t * 12) * 0.05 * k;
      pose.pos.y += Math.abs(Math.sin(t * 12)) * 0.012 * k;
      pose.hands = { pos: new THREE.Vector3(0, 0.025 * k, 0.03 * k), roll: Math.sin(t * 12) * 0.3 * k };
      return t > 2;
    },
  }),

  // sulking: turned away, head down, until Sir Pip comes over (or gives a gift)
  sulk: (ai, o = {}) => {
    const away = ai._yawTo(ai.partner.center(new THREE.Vector3())) + Math.PI * 0.8;
    return {
      interruptible: true,
      run(t, pose, dt) {
        ai.yaw = lerpAngle(ai.yaw, away, Math.min(1, dt * 2.5));
        pose.yaw = ai.yaw;
        const k = ease(t / 0.8);
        pose.pitch = 0.3 * k;
        pose.pos.y -= 0.014 * k;
        pose.roll = Math.sin(t * 0.9) * 0.05;
        return t > (o.dur || 8);
      },
    };
  },

  // pointing at something (the prop rack, the audience...)
  point: (ai, o = {}) => {
    const target = o.target || ai.partner.center(new THREE.Vector3());
    return {
      interruptible: true,
      run(t, pose, dt) {
        ai.yaw = lerpAngle(ai.yaw, ai._yawTo(target), Math.min(1, dt * 4));
        pose.yaw = ai.yaw;
        const k = ease(t / 0.5) * (1 - ease((t - 2.2) / 0.5));
        pose.pitch = 0.18 * k;
        pose.hands = { pos: new THREE.Vector3(0, 0.035 * k, 0.075 * k), roll: Math.sin(t * 8) * 0.15 * k };
        return t > 2.8;
      },
    };
  },

  // fetch: walk to the prop rack, pick something up, bring it to Sir Pip
  fetch: (ai, o = {}) => {
    let phase = 0, t0 = 0;
    const rack = o.at.clone();
    return {
      onEnd: () => { if (phase < 3) o.onAbort?.(); },
      run(t, pose, dt) {
        if (phase === 0) {
          const stand = new THREE.Vector3(THREE.MathUtils.clamp(rack.x - 0.035, -0.33, 0.33), 0, THREE.MathUtils.clamp(rack.z - 0.07, -0.15, 0.12));
          if (walkTo(ai, stand, dt, 0.13) || t > 6) { phase = 1; t0 = t; }
        } else if (phase === 1) {
          ai.yaw = lerpAngle(ai.yaw, ai._yawTo(rack), Math.min(1, dt * 5));
          const k = Math.sin(Math.min(1, (t - t0) / 1.0) * Math.PI);
          pose.pitch = 0.55 * k;
          pose.hands = { pos: new THREE.Vector3(0, -0.02 * k, 0.06 * k), roll: 0 };
          if (t - t0 > 0.5 && !this.picked) { this.picked = true; o.onPick?.(); }
          if (t - t0 > 1.0) { phase = 2; t0 = t; }
        } else if (phase === 2) {
          const pc = ai.partner.center(new THREE.Vector3());
          const dir = new THREE.Vector3(ai.base.x - pc.x, 0, ai.base.z - pc.z).normalize();
          if (walkTo(ai, pc.clone().addScaledVector(dir, 0.12), dt, 0.13) || t - t0 > 6) { phase = 3; t0 = t; }
        } else {
          ai.yaw = lerpAngle(ai.yaw, ai._yawTo(ai.partner.center(new THREE.Vector3())), Math.min(1, dt * 5));
          const k = Math.sin(Math.min(1, (t - t0) / 1.4) * Math.PI);
          pose.pitch = 0.25 * k;
          pose.hands = { pos: new THREE.Vector3(0, 0.02 * k, 0.08 * k), roll: 0 };
          if (t - t0 > 0.7 && !this.delivered) { this.delivered = true; o.onDeliver?.(); }
          if (t - t0 > 1.4) return true;
        }
        pose.pos.copy(ai.base).setY(pose.pos.y);
        pose.yaw = ai.yaw;
        return t > 16;
      },
    };
  },

  // endings
  grandbow: (ai) => {
    const face = 0; // to the audience
    return {
      run(t, pose, dt) {
        ai.yaw = lerpAngle(ai.yaw, face, Math.min(1, dt * 4));
        pose.yaw = ai.yaw;
        const b1 = ease((t - 0.3) / 0.5) * (1 - ease((t - 1.3) / 0.5));
        const up = ease((t - 1.6) / 0.4) * (1 - ease((t - 2.6) / 0.4));
        const b2 = ease((t - 2.9) / 0.6) * (1 - ease((t - 4.2) / 0.6));
        pose.pitch = 0.9 * Math.max(b1, b2);
        pose.pos.y -= 0.02 * Math.max(b1, b2);
        pose.hands = { pos: new THREE.Vector3(0, 0.1 * up, 0.03 * up), roll: Math.sin(t * 7) * 0.4 * up };
        return t > 4.9;
      },
    };
  },
  pratfall: () => ({
    run(t, pose) {
      if (t < 0.5) pose.pos.y += Math.sin((t / 0.5) * Math.PI) * 0.08;
      pose.held = !(t > 0.55 && t < 1.7);
      pose.roll = t < 0.55 ? Math.sin(t * 20) * 0.3 : 0;
      if (t > 1.7) { const k = 1 - ease((t - 2.4) / 0.4); pose.roll = Math.sin(t * 20) * 0.2 * k; }
      return t > 2.9;
    },
  }),
  faint: () => ({
    run(t, pose) {
      const sway = ease(t / 0.6);
      pose.pitch = -0.45 * sway;
      pose.roll = Math.sin(t * 7) * 0.2 * sway;
      pose.hands = { pos: new THREE.Vector3(0.02, 0.1 * sway, 0.01), roll: 0.6 * sway };
      pose.held = !(t > 1.3 && t < 3.2);
      return t > 3.8;
    },
  }),

  turn: (ai) => {
    const start = ai.yaw;
    return {
      run(t, pose) {
        pose.yaw = start + Math.PI * ease(t / 0.9) - Math.PI * ease((t - 1.6) / 0.9);
        if (t > 2.6) ai.yaw = start;
        return t > 2.6;
      },
    };
  },
};

export const REACTIONS = Object.keys(CLIPS);

// The instant, local answer to each of Pip's actions (Claude may add a follow-up).
export function localReaction(ev, ai) {
  const pick = (...xs) => xs[Math.floor(Math.random() * xs.length)];
  switch (ev.type) {
    case "bow": return "bow";
    case "wave": return pick("wave", "wave", "jump");
    case "jump": return pick("jump", "mirror", "dance");
    case "fall": return "help";
    case "slump": return pick("slump", "approach");
    case "rise": return pick("wave", "jump");
    case "walk": return ev.where === "toward Marlo" ? pick("retreat", "bow", "approach") : pick("approach", "mirror", "turn");
    case "approach": return pick("dance", "bow", "retreat");
    case "turn": return pick("turn", "mirror");
    case "idle": return pick("wave", "dance", "approach");
    case "hold": return ev.prop === "sword" ? "retreat" : ev.prop === "lantern" ? "approach" : "bow";
    case "give": return "dance";
    default: return "idle";
  }
}
