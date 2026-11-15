// Playable tasks: the acts that are more than "do one move". Each chapter mixes
// these with simple actions, so every stage plays differently:
//   collect — gather glowing things (fireflies need the lantern; gems don't)
//   simon   — the guest shows a sequence of moves; repeat them in order
//   duel    — sword fight: duck high swings, jump low ones, lunge to strike
//   riddle  — answer by walking Sir Pip onto the right stone
//   sneak   — cross the stage only while the searchlight looks away
//   unlock  — take the key and carry it to the cage
//   dodge   — jump the zaps rolling along the floor
// A task gets a context `c` from main.js (puppets, props, voice, emotes...)
// and calls done() when it's won.
import * as THREE from "three";
import { TASK_LINES, RIDDLES } from "./lines.js";

const v = new THREE.Vector3();
// free a task's meshes (geometry, materials, label textures) when it ends
function dispose(obj) {
  obj.removeFromParent();
  obj.traverse((o) => {
    o.geometry?.dispose();
    for (const m of [].concat(o.material || [])) { m.map?.dispose(); m.dispose(); }
  });
}
const flat = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
const rand = (a, b) => a + Math.random() * (b - a);

function glow(color, r, opacity = 1) {
  return new THREE.Mesh(new THREE.SphereGeometry(r, 12, 10), new THREE.MeshBasicMaterial({ color, transparent: true, opacity, toneMapped: false, depthWrite: false }));
}
function label(text, color = "#3a2414") {
  const c = document.createElement("canvas");
  c.width = 256; c.height = 96;
  const g = c.getContext("2d");
  g.fillStyle = "rgba(240,226,190,0.95)"; g.strokeStyle = "#7a5a32"; g.lineWidth = 6;
  g.beginPath(); g.roundRect(4, 4, 248, 88, 18); g.fill(); g.stroke();
  g.fillStyle = color; g.font = "600 40px Georgia, serif"; g.textAlign = "center"; g.textBaseline = "middle";
  g.fillText(text, 128, 50);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, transparent: true, toneMapped: false, depthTest: false }));
  s.scale.set(0.11, 0.041, 1);
  s.renderOrder = 9;
  return s;
}

// a parchment sign standing on the stage (for the riddle's question)
function sign(title, text) {
  const c = document.createElement("canvas");
  c.width = 512; c.height = 360;
  const g = c.getContext("2d");
  g.fillStyle = "#efe0bc"; g.strokeStyle = "#7a5a32"; g.lineWidth = 10;
  g.beginPath(); g.roundRect(8, 8, 496, 344, 24); g.fill(); g.stroke();
  g.fillStyle = "#7a1d22"; g.font = "600 40px Georgia, serif"; g.textAlign = "center";
  g.fillText(title, 256, 66);
  g.fillStyle = "#2a1a10"; g.font = "36px Georgia, serif";
  const words = text.split(" "); let line = "", y = 130;
  for (const w of words) { const t = line ? `${line} ${w}` : w; if (g.measureText(t).width > 440 && line) { g.fillText(line, 256, y); y += 48; line = w; } else line = t; }
  g.fillText(line, 256, y);
  g.fillStyle = "#7a5a32"; g.font = "italic 26px Georgia, serif"; g.fillText("Stand on the right answer", 256, 326);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  const board = new THREE.Mesh(new THREE.PlaneGeometry(0.17, 0.12), new THREE.MeshBasicMaterial({ map: t, toneMapped: false }));
  const post = new THREE.Mesh(new THREE.CylinderGeometry(0.003, 0.003, 0.16, 6), new THREE.MeshStandardMaterial({ color: 0x5a3b22, roughness: 0.8 }));
  post.position.set(0, -0.08, -0.002);
  const grp = new THREE.Group();
  board.position.y = 0.06;
  grp.add(board, post);
  return grp;
}

// Sir Pip's body readouts, shared by the tasks
function body(c) {
  const p = c.pip;
  return {
    pelvis: p.get("pelvis"), head: p.get("head").y,
    feet: Math.min(p.get("lF").y, p.get("rF").y),
    hand: Math.max(p.get("lW").y, p.get("rW").y),
  };
}

// ---------------------------------------------------------------------------
function collect(spec, c, done) {
  const group = new THREE.Group();
  c.root.add(group);
  const gem = spec.look === "gem";
  const colors = [0xff5a6a, 0x5ad8ff, 0x9aff6a, 0xffd34a, 0xc89aff];
  const items = [];
  for (let i = 0; i < spec.count; i++) {
    const o = new THREE.Group();
    if (gem) {
      const m = new THREE.Mesh(new THREE.OctahedronGeometry(0.012, 0), new THREE.MeshStandardMaterial({ color: colors[i % 5], emissive: colors[i % 5], emissiveIntensity: 1.4, roughness: 0.2, toneMapped: false }));
      m.scale.y = 1.4;
      o.add(m, glow(colors[i % 5], 0.024, 0.25));
    } else {
      o.add(glow(0xfff2a0, 0.0055), glow(0xffe060, 0.016, 0.3));
    }
    // spread around the stage, away from where Sir Pip starts
    let p;
    // close to Sir Pip's walking line, so side-to-side moves reach them (the wheel moves nearer/further)
    let tries = 0;
    do { p = new THREE.Vector3(rand(-0.32, 0.34), gem ? 0.014 : rand(0.075, 0.115), rand(-0.04, 0.06)); tries++; } while (tries < 60 && (flat(p, c.pip.get("pelvis")) < 0.1 || items.some((it) => Math.abs(it.home.x - p.x) < 0.08)));
    o.position.copy(p);
    group.add(o);
    items.push({ o, home: p.clone(), seed: Math.random() * 6, got: false });
  }
  let got = 0, t = 0, toldLantern = -99;
  return {
    debug: () => ({ got, items: items.filter((i) => !i.got).map((i) => i.o.position.toArray().map((x) => +x.toFixed(3))) }),
    target() { const left = items.filter((i) => !i.got); return left.length ? left.reduce((a, b) => (flat(b.o.position, c.pip.get("pelvis")) < flat(a.o.position, c.pip.get("pelvis")) ? b : a)).o.position.clone() : null; },
    update(dt) {
      t += dt;
      const b = body(c);
      const lantern = spec.needs === "lantern" ? (c.props.heldBy("pip") === "lantern" ? c.props.position("lantern") : null) : null;
      for (const it of items) {
        if (it.got) continue;
        // fireflies drift lazily; gems glint
        if (!gem) it.o.position.set(it.home.x + Math.sin(t * 0.5 + it.seed) * 0.03, it.home.y + Math.sin(t * 1.3 + it.seed * 2) * 0.012, it.home.z + Math.cos(t * 0.4 + it.seed) * 0.025);
        else it.o.rotation.y = t * 1.5 + it.seed;
        const near = flat(it.o.position, b.pelvis) < (gem ? 0.06 : 0.065);
        const reached = gem ? near : lantern && lantern.distanceTo(it.o.position) < 0.07;
        if (reached) {
          it.got = true;
          got++;
          it.o.visible = false;
          c.sfx("chime", null, { volume: 0.35, rate: 1.3 + got * 0.08 });
          c.emote("pip", "✦", () => c.pip.get("head"), `${got} / ${spec.count}`, 1.4);
          if (got === spec.count) {
            c.coach(TASK_LINES.collected);
            c.guestSay(gem ? "gems" : "fireflies");
            setTimeout(done, 900);
          }
        } else if (spec.needs === "lantern" && !lantern && near && t - toldLantern > 9) {
          toldLantern = t;
          c.coach(TASK_LINES.needLantern);
          c.showHint("takeLantern");
        }
      }
    },
    end() { dispose(group); },
  };
}

// ---------------------------------------------------------------------------
const MOVE_NAMES = { jump: "Jump", bow: "Bow", wave: "Wave", turn: "Spin" };
function simon(spec, c, done) {
  const pool = Object.keys(MOVE_NAMES);
  const seq = [];
  while (seq.length < (spec.length || 3)) { const m = pool[Math.floor(Math.random() * pool.length)]; if (m !== seq[seq.length - 1]) seq.push(m); }
  let phase = "watch", t = 0, shown = 0, idx = 0, lastGood = -9;
  const watch = () => { phase = "watch"; t = 0; shown = 0; idx = 0; c.guestSay("watch"); };
  watch();
  return {
    debug: () => ({ seq, phase, idx }),
    target() { return c.guest().get("head").clone(); },
    update(dt) {
      t += dt;
      if (phase === "watch") {
        if (shown < seq.length && t > 1.8 + shown * 2.9) {
          c.ai.react(seq[shown], { force: true });
          c.emote("marlo", "★", () => c.guest().get("head"), `${shown + 1}. ${MOVE_NAMES[seq[shown]]}`, 2.4);
          shown++;
        } else if (shown === seq.length && t > 1.8 + seq.length * 2.9 + 0.8) {
          phase = "repeat";
          c.guestSay("yourTurn");
          c.emote("marlo", "?", () => c.guest().get("head"), "Your turn", 2.5);
          c.showHint("simon");
        }
      }
    },
    hear(ev) {
      if (phase !== "repeat" || !MOVE_NAMES[ev.type]) return;
      const since = t - lastGood;
      if (ev.type === seq[idx]) {
        idx++;
        lastGood = t;
        c.sfx("chime", null, { volume: 0.3, rate: 1.2 + idx * 0.12 });
        c.emote("pip", "✦", () => c.pip.get("head"), `${idx} / ${seq.length}`, 1.4);
        if (idx === seq.length) { phase = "won"; c.guestSay("spellDone"); c.confetti("grace"); setTimeout(done, 1200); }
      } else {
        // leftovers right after a good move (landing from a jump, settling from a spin), or a
        // repeat of the move just made, are forgiven; only a clearly different move is a mistake
        if (since < 1.6 || (idx > 0 && ev.type === seq[idx - 1])) return;
        phase = "wrong";
        c.guestSay("wrong");
        setTimeout(watch, 1800);
      }
    },
    end() {},
  };
}

// ---------------------------------------------------------------------------
function duel(spec, c, done) {
  let foe = spec.hits || 3, me = 3, phase = "intro", t = 0, kind = "high";
  let duckOK = false, jumpOK = false;
  const last = c.pip.get("pelvis").clone();
  const velTmp = new THREE.Vector3();
  let speedTo = 0;
  // the striking point (sword tip, or Sir Pip's fist) and how fast it's moving
  const strikeAt = new THREE.Vector3(), strikeLast = new THREE.Vector3();
  let strikeSpeed = 0, haveStrike = false;
  const hearts = () => {
    c.emote("foeHP", "♥", () => c.guest().get("head"), `${foe}`, 999, 0.065);
    c.emote("pipHP", "♥", () => c.pip.get("head"), `${me}`, 999, 0.065);
  };
  c.guestSay("enGarde");
  c.ai.react("approach", { force: true });
  hearts();
  const next = (delay) => { phase = "wait"; t = -delay; };
  return {
    debug: () => ({ phase, kind, foe, me, t }),
    target() { return c.guest().get("chest").clone(); },
    update(dt) {
      t += dt;
      const b = body(c), g = c.guest();
      // how fast Sir Pip is moving toward the captain (a lunge)
      const toFoe = v.subVectors(g.get("pelvis"), b.pelvis).setY(0);
      const dist = toFoe.length();
      const vel = velTmp.subVectors(b.pelvis, last).divideScalar(Math.max(dt, 1e-3)).setY(0);
      last.copy(b.pelvis);
      speedTo += ((dist > 1e-4 ? vel.dot(toFoe.normalize()) : 0) - speedTo) * Math.min(1, dt * 10);
      if (!c.props.swordTip(strikeAt)) strikeAt.copy(c.pip.get("rW"));
      if (haveStrike) strikeSpeed += (strikeAt.distanceTo(strikeLast) / Math.max(dt, 1e-3) - strikeSpeed) * Math.min(1, dt * 12);
      strikeLast.copy(strikeAt); haveStrike = true;
      // a real hit: the blade (or fist) meets his body, fast
      const contact = strikeSpeed > 0.28 && ["chest", "head", "pelvis"].some((n) => strikeAt.distanceTo(g.get(n)) < 0.04);

      if (phase === "intro" && t > 2.2) next(0);
      else if (phase === "wait" && t > 0) {
        // the captain winds up a swing: high (duck!) or low (jump!)
        kind = Math.random() < 0.5 ? "high" : "low";
        c.ai.react("slash", { kind, impact: 1.15, force: true });
        c.emote("marlo", "!", () => g.get("head"), kind === "high" ? "HIGH — duck!" : "LOW — jump!", 1.6);
        c.guestSay(kind);
        c.showHint(kind === "high" ? "duck" : "jump");
        duckOK = jumpOK = false;
        phase = "swing"; t = 0;
      } else if (phase === "swing") {
        if (t > 0.75 && t < 1.45) { if (b.head < 0.178) duckOK = true; if (b.feet > 0.018) jumpOK = true; }
        if (t > 1.45) {
          c.hideHint();
          if (kind === "high" ? duckOK : jumpOK) {
            c.coach(TASK_LINES.strike);
            c.emote("pip", "!", () => c.pip.get("head"), "Strike!", 2);
            c.showHint("strike");
            phase = "strike"; t = 0;
          } else {
            me--;
            c.knockPip(toFoe.clone().negate(), 0.02);
            c.sfx("clink", c.pip.group, { volume: 0.7, rate: 0.8 });
            c.guestSay("gotYou");
            if (me <= 0) { me = 3; c.coach(TASK_LINES.again); } else c.coach(TASK_LINES.ouch);
            hearts();
            next(1.6);
          }
        }
      } else if (phase === "strike") {
        // a lunge toward him, or the sword arm raised, while close enough
        if (contact || (dist < 0.24 && (speedTo > 0.16 || b.hand > b.head - 0.005))) {
          foe--;
          c.hideHint();
          c.knockGuest(toFoe, contact ? 0.03 : 0.02);
          c.ai.react(foe <= 0 ? "knockout" : "stagger", { force: true });
          c.sfx("clink", g.group, { volume: 0.9, rate: 1.3 });
          c.sfx("pop", g.group, { volume: 0.5 });
          c.coach(TASK_LINES.hit);
          c.emote("pip", "✦", () => c.pip.get("head"), "Hit!", 1.2);
          hearts();
          if (foe <= 0) {
            phase = "won";
            c.emote("marlo", "★", () => g.get("head"), "Knockout!", 2.4);
            c.sfx("applause", null, { volume: 0.45 });
            setTimeout(() => c.guestSay("surrender"), 2600);
            setTimeout(done, 4600);
          }
          else { c.guestSay("hitMe"); next(1.8); }
        } else if (t > 3) { c.hideHint(); next(0.4); }
      }
    },
    end() { c.clearEmote("foeHP"); c.clearEmote("pipHP"); c.hideHint(); },
  };
}

// ---------------------------------------------------------------------------
function riddle(spec, c, done) {
  const r = RIDDLES[Math.floor(Date.now() / 86400000) % RIDDLES.length];
  const group = new THREE.Group();
  c.root.add(group);
  // big stones right on Sir Pip's walking line (moving the mouse side to side reaches them)
  const stones = r.options.map((text, i) => {
    const s = new THREE.Group();
    const top = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.06, 0.006, 24), new THREE.MeshStandardMaterial({ color: 0x8a8f9a, roughness: 0.9 }));
    top.position.y = 0.003;
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.06, 0.0035, 6, 32), new THREE.MeshBasicMaterial({ color: 0x9fd8ff, transparent: true, opacity: 0.5, toneMapped: false }));
    ring.rotation.x = Math.PI / 2; ring.position.y = 0.007;
    const tag = label(text);
    tag.position.set(0, 0.03, 0.065); // in front of the stone, so Sir Pip never hides it
    s.add(top, ring, tag);
    s.position.set(-0.3 + i * 0.15, 0, 0.02);
    group.add(s);
    return { s, ring, on: 0 };
  });
  // the riddle, written on a sign at stage left
  const board = sign("Grumble's riddle", r.q);
  board.position.set(-0.22, 0.13, -0.15);
  board.rotation.y = 0.18;
  board.scale.setScalar(1.45);
  group.add(board);
  c.riddleCard?.(r.q);
  let t = 0, cool = 0, solved = false;
  const ask = () => c.guestLine(r.line);
  ask();
  return {
    target() { return board.position.clone().add(v.set(0, 0.14, 0)); },
    update(dt) {
      t += dt; cool -= dt;
      const b = body(c);
      stones.forEach((st, i) => {
        const here = flat(st.s.position, b.pelvis) < 0.065;
        // a stone only answers once Sir Pip has stepped onto it (not if he simply starts there)
        if (!here) st.armed = true;
        st.on = here && st.armed ? st.on + dt : 0;
        st.ring.material.opacity = here ? 0.9 : 0.4 + 0.2 * Math.sin(t * 3 + i);
        if (!solved && st.on > 0.8 && cool <= 0) {
          st.on = -2; // step off and back on to answer again
          if (i === r.answer) {
            solved = true;
            st.ring.material.color.set(0x8cff7a);
            c.sfx("chime", null, { volume: 0.5 });
            c.guestSay("right");
            c.emote("marlo", "!", () => c.guest().get("head"), "Correct!", 2);
            setTimeout(done, 1600);
          } else {
            cool = 3;
            c.sfx("pop", null, { volume: 0.4, rate: 0.6 });
            c.ai.react("laugh", { force: true });
            c.guestSay("wrongAns");
            c.emote("marlo", "♪", () => c.guest().get("head"), "Wrong!", 1.6);
            setTimeout(() => { if (!solved) ask(); }, 3200);
          }
        }
      });
    },
    end() { dispose(group); c.riddleCard?.(null); },
  };
}

// ---------------------------------------------------------------------------
function sneak(spec, c, done) {
  const T = c.tower();
  let over = false, caught = 0, t = 0, lit = 0, cool = 0, warned = false;
  c.ai.react("scan", { force: true, stop: () => over, range: 1.2, speed: 0.75, centre: 0 });
  // the searchlight: a translucent cone from Clank's eye
  // (aimed down at the floor, with a bright pool of light where it lands)
  const coneGeo = new THREE.ConeGeometry(0.07, 0.4, 20, 1, true);
  coneGeo.translate(0, -0.2, 0);
  coneGeo.rotateX(-Math.PI / 2 + 0.52);
  const coneMat = new THREE.MeshBasicMaterial({ color: 0xffe080, transparent: true, opacity: 0.08, depthWrite: false, toneMapped: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending });
  const cone = new THREE.Mesh(coneGeo, coneMat);
  c.root.add(cone);
  const pool = new THREE.Mesh(new THREE.CircleGeometry(0.075, 28).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0xffe080, transparent: true, opacity: 0.35, depthWrite: false, toneMapped: false, blending: THREE.AdditiveBlending }));
  pool.renderOrder = 2;
  c.root.add(pool);
  const start = c.pip.get("pelvis").clone();
  const last = start.clone();
  let speed = 0;
  c.princessSay("help");
  return {
    debug: () => ({ caught }),
    target() { return T.pedestal.clone().add(v.set(0, 0.04, 0)); },
    update(dt) {
      t += dt; cool -= dt;
      const g = c.guest(), b = body(c);
      cone.position.copy(g.get("head"));
      cone.rotation.set(0, c.ai.yaw, 0);
      pool.position.set(cone.position.x + Math.sin(c.ai.yaw) * 0.34, 0.003, cone.position.z + Math.cos(c.ai.yaw) * 0.34);
      const vel = flat(b.pelvis, last) / Math.max(dt, 1e-3);
      last.copy(b.pelvis);
      speed += (vel - speed) * Math.min(1, dt * 8);
      const to = v.subVectors(b.pelvis, g.get("pelvis")).setY(0);
      // inside the beam's footprint (the same wedge you can see on the floor)?
      const fx = Math.sin(c.ai.yaw), fz = Math.cos(c.ai.yaw);
      const along = to.x * fx + to.z * fz, lateral = Math.abs(to.x * fz - to.z * fx);
      const inLight = along > 0.05 && along < 0.45 && lateral < 0.025 + along * 0.22;
      coneMat.color.set(inLight ? 0xff4030 : 0xffe080);
      pool.material.color.set(inLight ? 0xff4030 : 0xffe080);
      coneMat.opacity = inLight ? 0.14 : 0.08;
      lit = inLight && speed > 0.035 ? lit + dt : 0;
      if (inLight && !warned) { warned = true; c.showHint("sneak"); }
      if (lit > 0.25 && cool <= 0) {
        caught++;
        cool = 2.5;
        lit = 0;
        c.sfx("alarm", g.group, { volume: 0.6 });
        c.guestSay(caught === 1 ? "intruder" : "seeYou");
        c.coach(TASK_LINES.caught);
        c.emote("marlo", "!", () => g.get("head"), "INTRUDER!", 1.6);
        setTimeout(() => c.movePipTo(start.x, start.z), 500);
      }
      if (flat(b.pelvis, T.pedestal) < 0.07) { over = true; c.hideHint(); done(); }
    },
    end() { over = true; dispose(cone); dispose(pool); },
  };
}

// ---------------------------------------------------------------------------
function unlock(spec, c, done) {
  const T = c.tower();
  let stage = c.props.heldBy("pip") === "key" ? 1 : 0, finished = false;
  c.princessSay("key");
  return {
    target() { return stage === 0 ? c.props.position("key") : T.cage.clone().add(v.set(0, 0.06, 0)); },
    hint() { return stage === 0 ? "takeKey" : "unlock"; },
    update() {
      if (stage === 0 && c.props.heldBy("pip") === "key") { stage = 1; c.coach(TASK_LINES.gotKey); c.showHint("unlock"); }
    },
    hear(ev) {
      if (finished) return;
      if (ev.type === "use" && ev.prop === "key" && ev.target === "cage") {
        finished = true;
        c.hideHint();
        T.openCage();
        c.sfx("chime", null, { volume: 0.6 });
        c.sfx("applause", null, { volume: 0.4 });
        c.coach(TASK_LINES.freed);
        setTimeout(() => c.princessSay("hero"), 1500);
        setTimeout(done, 3200);
      }
    },
    end() {},
  };
}

// ---------------------------------------------------------------------------
function dodge(spec, c, done) {
  let dodged = 0, t = -1.5, zap = null, lastAir = -9, warned = false, finished = false;
  const dbg = () => ({ dodged, zap: !!zap });
  const fire = () => {
    c.ai.react("zap", { force: true });
    setTimeout(() => {
      if (finished) return;
      const g = c.guest();
      const from = g.get("pelvis").clone().setY(0.012);
      const to = c.pip.get("pelvis").clone().setY(0.012);
      const dir = to.clone().sub(from).normalize();
      const m = new THREE.Group();
      m.add(glow(0xff5040, 0.008), glow(0x60e8ff, 0.018, 0.35));
      m.position.copy(from);
      c.root.add(m);
      zap = { m, dir, dist: from.distanceTo(to), went: 0, judged: false };
      c.sfx("zap", g.group, { volume: 0.6 });
      if (!warned) { warned = true; c.princessSay("lookOut"); }
    }, 650);
  };
  return {
    debug: dbg,
    target() { return c.pip.main.worldPoint([0, 0.04, -0.03], new THREE.Vector3()); },
    update(dt) {
      t += dt;
      if (body(c).feet > 0.016) lastAir = t;
      if (!zap && t > 0 && !finished) { fire(); t = -99; }
      if (zap) {
        // each zap comes a little faster than the last
        const speed = 0.3 + dodged * 0.035;
        zap.went += dt * speed;
        zap.m.position.addScaledVector(zap.dir, dt * speed);
        zap.m.scale.setScalar(1 + Math.sin(t * 30) * 0.2);
        if (!zap.judged && zap.went >= zap.dist) {
          zap.judged = true;
          if (t - lastAir < 0.3) {
            dodged++;
            c.coach(TASK_LINES.dodged);
            c.emote("pip", "✦", () => c.pip.get("head"), `${dodged} / ${spec.count}`, 1.3);
            c.sfx("chime", null, { volume: 0.3, rate: 1.4 });
          } else {
            c.knockPip(zap.dir, 0.015);
            c.sfx("snap", c.pip.group, { volume: 0.5 });
            c.coach(TASK_LINES.zapped);
            c.showHint("dodge");
          }
        }
        if (zap.went > zap.dist + 0.15) {
          dispose(zap.m);
          zap = null;
          if (dodged >= spec.count) {
            finished = true;
            c.hideHint();
            c.guestSay("overheat");
            c.coach(TASK_LINES.overheat);
            c.ai.react("faint", { force: true });
            c.confetti("smoke");
            setTimeout(() => c.guestSay("defeated"), 2500);
            setTimeout(done, 4200);
          } else t = -Math.max(0.9, 1.6 - dodged * 0.12);
        }
      }
    },
    end() { finished = true; if (zap) dispose(zap.m); },
  };
}

// ---------------------------------------------------------------------------
// The finale: flying on Marlo, Clank's last trick, his change of heart, the knighting

// is Sir Pip leaning forward (a bow)? works even mid-air, where feet never touch the floor
function leaning(c) {
  const p = c.pip;
  const up = v.subVectors(p.get("neck"), p.get("pelvis")).normalize();
  const hr = new THREE.Vector3().subVectors(p.get("rH"), p.get("lH"));
  const hf = new THREE.Vector3(-hr.z, 0, hr.x).normalize();
  return up.x * hf.x + up.z * hf.z;
}

function mount(spec, c, done) {
  let on = false;
  return {
    target() { return c.guest().get("head").clone(); },
    update() {
      if (on || flat(c.pip.get("pelvis"), c.guest().get("pelvis")) > 0.12) return;
      on = true;
      c.guestSay("mount");
      c.setFlight(true);
      c.coach(TASK_LINES.flying);
      c.emote("marlo", "♥", () => c.guest().get("head"), "Hold on!", 1.8);
      setTimeout(() => c.guestSay("fly"), 2200);
      setTimeout(done, 3400);
    },
    end() {},
  };
}

function rings(spec, c, done) {
  if (!c.flying()) c.setFlight(true);
  const group = new THREE.Group();
  c.root.add(group);
  const list = [];
  let passed = 0, t = 0, next = 0.6, finished = false, toldMiss = false;
  const spawn = () => {
    const m = new THREE.Mesh(new THREE.TorusGeometry(0.045, 0.006, 8, 28), new THREE.MeshBasicMaterial({ color: 0xffd34a, transparent: true, opacity: 0.9, toneMapped: false }));
    m.rotation.y = Math.PI / 2; // the hole faces the way they fly
    const halo = new THREE.Mesh(new THREE.TorusGeometry(0.045, 0.014, 8, 28), new THREE.MeshBasicMaterial({ color: 0xffe080, transparent: true, opacity: 0.2, toneMapped: false, depthWrite: false }));
    m.add(halo);
    m.position.set(0.44, rand(0.12, 0.3), c.pip.get("pelvis").z);
    group.add(m);
    list.push({ m, prevX: 0.44, judged: false });
  };
  return {
    target() { const r = list.find((x) => !x.judged); return r ? r.m.position.clone() : null; },
    update(dt) {
      t += dt;
      if (!finished && t > next && list.filter((r) => !r.judged).length < 2) { spawn(); next = t + 2.3; }
      const p = c.pip.get("pelvis");
      const bodyY = p.y + 0.03;
      for (const r of list) {
        r.m.position.x -= dt * 0.1;
        r.m.scale.setScalar(1 + Math.sin(t * 5) * 0.05);
        if (!r.judged && r.prevX > p.x && r.m.position.x <= p.x) {
          r.judged = true;
          if (Math.abs(r.m.position.y - bodyY) < 0.055 && Math.abs(r.m.position.z - p.z) < 0.09) {
            passed++;
            r.m.material.color.set(0x8cff7a);
            c.sfx("chime", null, { volume: 0.35, rate: 1.2 + passed * 0.1 });
            c.emote("pip", "✦", () => c.pip.get("head"), `${passed} / ${spec.count}`, 1.3);
            if (passed === 1) c.coach(TASK_LINES.ring);
            if (passed >= spec.count) { finished = true; setTimeout(done, 900); }
          } else {
            r.m.material.color.set(0xff6a5a);
            if (!toldMiss) { toldMiss = true; c.coach(TASK_LINES.missRing); c.showHint("fly"); }
          }
        }
        r.prevX = r.m.position.x;
      }
      for (let i = list.length - 1; i >= 0; i--) if (list[i].m.position.x < -0.5) { dispose(list[i].m); list.splice(i, 1); }
    },
    end() { dispose(group); },
  };
}

function gearMesh() {
  const g = new THREE.Group();
  const brass = new THREE.MeshStandardMaterial({ color: 0xc89a40, metalness: 0.9, roughness: 0.35, emissive: 0x3a2400 });
  g.add(new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, 0.005, 14), brass));
  for (let i = 0; i < 8; i++) { const t = new THREE.Mesh(new THREE.BoxGeometry(0.006, 0.005, 0.005), brass); const a = (i / 8) * Math.PI * 2; t.position.set(Math.cos(a) * 0.016, 0, Math.sin(a) * 0.016); t.rotation.y = -a; g.add(t); }
  g.rotation.x = Math.PI / 2;
  return g;
}
function gears(spec, c, done) {
  if (!c.flying()) c.setFlight(true);
  const K = c.clank();
  K.show(true); K.mode = "fly"; K.target.set(0.33, 0.64, -0.05); K.yaw = -Math.PI / 2;
  c.sayAs("clank", "gears");
  const list = [];
  let dodged = 0, t = 0, next = 1.8, finished = false, toldHit = -9;
  return {
    target() { return K.pup.get("head").clone(); },
    update(dt) {
      t += dt;
      K.target.y = 0.64 + Math.sin(t * 1.2) * 0.06;
      if (!finished && t > next) {
        next = t + 2.1;
        const from = K.pup.get("chest").clone();
        const to = c.pip.get("pelvis").clone().add(v.set(0, 0.04, 0));
        const m = gearMesh();
        m.position.copy(from);
        c.root.add(m);
        list.push({ m, dir: to.sub(from).normalize(), went: 0 });
        c.sfx("pop", K.pup.group, { volume: 0.5, rate: 0.7 });
      }
      const p = c.pip.get("pelvis"), head = c.pip.get("head");
      for (let i = list.length - 1; i >= 0; i--) {
        const gr = list[i];
        gr.m.position.addScaledVector(gr.dir, dt * 0.2);
        gr.went += dt * 0.2;
        gr.m.rotation.z += dt * 8;
        if (gr.m.position.distanceTo(p) < 0.05 || gr.m.position.distanceTo(head) < 0.04) {
          c.knockPip(gr.dir, 0.02);
          c.sfx("clink", c.pip.group, { volume: 0.6, rate: 0.8 });
          if (t - toldHit > 6) { toldHit = t; c.coach(TASK_LINES.gearHit); c.showHint("flyDodge"); }
          dispose(gr.m); list.splice(i, 1);
        } else if (gr.m.position.x < p.x - 0.1 || gr.went > 0.8) {
          dispose(gr.m); list.splice(i, 1);
          if (!finished) {
            dodged++;
            c.emote("pip", "✦", () => c.pip.get("head"), `${dodged} / ${spec.count}`, 1.2);
            if (dodged >= spec.count) { finished = true; c.sayAs("clank", "steal"); setTimeout(done, 1500); }
          }
        }
      }
    },
    end() { for (const gr of list) dispose(gr.m); },
  };
}

function chase(spec, c, done) {
  if (!c.flying()) c.setFlight(true);
  const K = c.clank();
  K.show(true); K.mode = "fly";
  c.guestSay("spot");
  let t = 0, caught = false;
  return {
    target() { return K.pup.get("head").clone(); },
    update(dt) {
      t += dt;
      if (caught) return;
      // he darts about the right half of the sky
      K.target.set(0.17 + Math.sin(t * 0.55) * 0.15, 0.62 + Math.sin(t * 0.9) * 0.09, -0.04 + Math.sin(t * 0.43) * 0.06);
      K.yaw = Math.atan2(Math.cos(t * 0.55), 0.3) - Math.PI / 2;
      if (c.pip.get("pelvis").distanceTo(K.pup.get("pelvis")) < 0.1) {
        caught = true;
        c.coach(TASK_LINES.gotClank);
        c.sfx("chime", null, { volume: 0.5 });
        c.sayAs("clank", "caught");
        K.mode = "sad";
        // they glide down onto a cloud together
        K.target.set(c.pip.get("pelvis").x + 0.13, 0.5, 0.02);
        K.yaw = -Math.PI / 2;
        setTimeout(() => c.setFlight(false), 1500);
        setTimeout(done, 3200);
      }
    },
    end() {},
  };
}

function kindness(spec, c, done) {
  const K = c.clank();
  K.show(true); K.mode = "sad";
  c.sayAs("clank", "sad");
  c.emote("marlo2", "…", () => K.pup.get("head"), null, 3);
  let lean = 0, kind = false;
  const redeem = () => {
    if (kind) return;
    kind = true;
    c.hideHint();
    K.pup.skin.extra?.redeem?.();
    c.emote("marlo2", "♥", () => K.pup.get("head"), null, 2.5);
    c.sfx("chime", null, { volume: 0.6 });
    setTimeout(() => { c.sayAs("clank", "thanks"); c.music(); K.mode = "dance"; c.confetti("grace"); }, 900);
    setTimeout(done, 5200);
  };
  return {
    target() { return K.pup.get("head").clone(); },
    update(dt) {
      // stay facing Sir Pip, just in front of him
      const p = c.pip.get("pelvis");
      if (!kind) {
        const side = p.x > 0.08 ? -1 : 1; // whichever side of Sir Pip has room
        K.target.set(THREE.MathUtils.clamp(p.x + side * 0.14, -0.3, 0.3), 0.5, THREE.MathUtils.clamp(p.z, -0.1, 0.1));
        K.yaw = side > 0 ? -Math.PI / 2 : Math.PI / 2;
      }
      lean = leaning(c) > 0.32 ? lean + dt : 0;
      if (lean > 0.35) redeem();
    },
    hear(ev) { if (ev.type === "bow") redeem(); },
    end() {},
  };
}

function knight(spec, c, done) {
  let phase = "dip", t = 0, lean = 0;
  c.stageKnighting();
  return {
    target() { return c.king().pup.get("head").clone(); },
    update(dt) {
      t += dt;
      if (phase === "dip" && t > 2.4) { phase = "wait"; c.sayAs("king", "kneel"); c.coach(TASK_LINES.kneel); }
      if (phase === "wait") {
        lean = leaning(c) > 0.32 ? lean + dt : 0;
        if (lean > 0.35) this.go();
      }
    },
    hear(ev) { if (ev.type === "bow" && phase === "wait") this.go(); },
    go() {
      phase = "knighting";
      c.hideHint();
      const K = c.king();
      K.mode = "knight";
      c.sayAs("king", "words");
      setTimeout(() => { c.sfx("clink", K.pup.group, { volume: 0.5, rate: 1.4 }); }, 1500);
      setTimeout(() => { c.sfx("clink", K.pup.group, { volume: 0.5, rate: 1.5 }); }, 2300);
      setTimeout(() => { c.sayAs("king", "name"); K.mode = "proud"; }, 3600);
      setTimeout(() => { c.sfx("applause", null, { volume: 0.7 }); c.confetti("grace"); }, 7200);
      setTimeout(done, 8200);
    },
    end() {},
  };
}

const TASKS = { collect, simon, duel, riddle, sneak, unlock, dodge, mount, rings, gears, chase, kindness, knight };
export function createTask(spec, c, done) {
  const make = TASKS[spec.type];
  if (!make) { setTimeout(done, 100); return { update() {}, end() {} }; }
  return make(spec, c, done);
}
