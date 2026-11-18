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
import { endGrainTexture } from "./wood.js";
import { hangingSock, SOCK_STRIPES } from "./handpuppet.js";

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
  let got = 0, t = 0, toldLantern = -99, toldScatter = -99, speed = 0;
  const speedOf = speedometer(c);
  return {
    debug: () => ({ got, items: items.filter((i) => !i.got).map((i) => i.o.position.toArray().map((x) => +x.toFixed(3))) }),
    target() { const left = items.filter((i) => !i.got); return left.length ? left.reduce((a, b) => (flat(b.o.position, c.pip.get("pelvis")) < flat(a.o.position, c.pip.get("pelvis")) ? b : a)).o.position.clone() : null; },
    update(dt) {
      t += dt;
      speed = speedOf(dt);
      const b = body(c);
      const lantern = spec.needs === "lantern" ? (c.props.heldBy("pip") === "lantern" ? c.props.position("lantern") : null) : null;
      for (const it of items) {
        if (it.got) continue;
        // fireflies drift lazily; gems glint
        if (!gem) it.o.position.lerp(v.set(it.home.x + Math.sin(t * 0.5 + it.seed) * 0.03, it.home.y + Math.sin(t * 1.3 + it.seed * 2) * 0.012, it.home.z + Math.cos(t * 0.4 + it.seed) * 0.025), Math.min(1, dt * 3));
        else it.o.rotation.y = t * 1.5 + it.seed;
        const near = flat(it.o.position, b.pelvis) < (gem ? 0.06 : 0.065);
        // shy fireflies: rush at them and they flit away to somewhere else
        if (spec.shy && !gem && speed > 0.3 && Math.min(flat(it.o.position, b.pelvis), lantern ? lantern.distanceTo(it.o.position) : 9) < 0.15) {
          it.home.set(rand(-0.32, 0.34), rand(0.075, 0.115), rand(-0.04, 0.06));
          c.sfx("swish", it.o, { volume: 0.25, rate: 1.25 });
          if (t - toldScatter > 8) { toldScatter = t; c.coach(TASK_LINES.scatter); }
          continue;
        }
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
        if (idx === seq.length) {
          phase = "won"; c.guestSay("spellDone"); c.confetti("grace");
          if (spec.bloom) { setTimeout(() => { c.bloom?.(); c.coach(TASK_LINES.bloom); }, 1400); setTimeout(() => c.guestSay("bloomed"), 5200); setTimeout(done, 7600); }
          else setTimeout(done, 1200);
        }
      } else {
        // leftovers right after a good move (landing from a jump, settling from a spin), or a
        // repeat of the move just made, are forgiven; only a clearly different move is a mistake
        if (since < 1.6 || (idx > 0 && ev.type === seq[idx - 1])) return;
        phase = "wrong";
        c.guestSay("wrong");
        setTimeout(() => c.oops?.(), 1200); // the co-star turns the mistake into theatre
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
        setTimeout(() => c.sfx("sword", g.group, { volume: 0.55, rate: 0.9 }), 700);
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
            c.sfx("sword", c.pip.group, { volume: 0.8 });
            c.sfx("thud", c.pip.group, { volume: 0.6 });
            c.guestSay("gotYou");
            setTimeout(() => c.oops?.(), 1200); // the co-star turns the mistake into theatre
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
          c.sfx("sword", g.group, { volume: 0.9, rate: 1.1 });
          c.sfx("hit", g.group, { volume: 0.6 });
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
        setTimeout(() => c.oops?.(), 1200); // the co-star turns the mistake into theatre
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
            setTimeout(() => c.oops?.(), 1200); // the co-star turns the mistake into theatre
            c.showHint("dodge");
          }
        }
        if (zap.went > zap.dist + 0.15) {
          dispose(zap.m);
          zap = null;
          if (dodged >= spec.count) {
            finished = true;
            c.hideHint();
            if (!spec.winLine) c.guestSay("overheat");
            c.coach(spec.winLine || TASK_LINES.overheat);
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


// ---------------------------------------------------------------------------
// Stage 1. Marlo shows off, crash-lands, and is suddenly shy: walk up gently, or he hides.
function speedometer(c) {
  const last = c.pip.get("pelvis").clone();
  let speed = 0;
  return (dt) => {
    const p = c.pip.get("pelvis");
    speed += (flat(p, last) / Math.max(dt, 1e-3) - speed) * Math.min(1, dt * 6);
    last.copy(p);
    return speed;
  };
}
function shy(spec, c, done) {
  const g = c.guest(), speedOf = speedometer(c);
  let t = 0, phase = "show", calm = 0, speed = 0, hides = 0, landed = false;
  c.guestSay("showOff");
  c.ai.react("crashland", { force: true });
  return {
    debug: () => ({ phase, calm: +calm.toFixed(2), speed: +speed.toFixed(3), hides }),
    target() { return g.get("chest").clone(); },
    hint() { return "gentle"; },
    update(dt) {
      t += dt;
      speed = speedOf(dt);
      if (phase === "show") {
        if (t > 1.4 && !landed) { landed = true; c.sfx("thud", g.group, { volume: 0.9 }); c.sfx("laugh", null, { volume: 0.3 }); c.emote("marlo", "✶", () => g.get("head"), "Oof!", 1.4); }
        if (t > 3.8) { phase = "shy"; t = 0; c.guestSay("shy"); c.emote("marlo", "…", () => g.get("head"), "So shy...", 2.6); c.showHint("gentle"); }
        return;
      }
      if (phase === "hiding") { if (t > 3) { phase = "shy"; t = 0; c.guestSay("peek"); c.emote("marlo", "?", () => g.get("head"), "Is it safe?", 2); } return; }
      if (phase !== "shy") return;
      const d = flat(c.pip.get("pelvis"), g.get("chest"));
      if (d < 0.3 && speed > 0.26 && t > 0.6) {
        // rushed at him: he hides
        phase = "hiding"; t = 0; hides++; calm = 0;
        c.ai.react("hide", { force: true });
        c.sfx("chirp", g.group, { volume: 0.5, rate: 1.5 });
        c.coach(TASK_LINES.tooFast);
        c.emote("marlo", "!", () => g.get("head"), "Too fast!", 1.6);
        return;
      }
      calm = d < 0.17 && speed < 0.15 ? calm + dt : Math.max(0, calm - dt * 0.5);
      if (calm > 0.8) {
        phase = "won"; c.hideHint();
        c.guestSay("notShy");
        c.ai.react("wave", { force: true });
        c.emote("marlo", "♥", () => g.get("head"), "Friends!", 2);
        setTimeout(done, 1600);
      }
    },
    end() {},
  };
}

// Stage 1. Marlo holds up a paw: walk over and raise Sir Pip's arm to meet it.
function highfive(spec, c, done) {
  const g = c.guest(), need = spec.count || 2;
  let t = 0, phase = "ask", got = 0, wait = 0, lowered = true;
  const ask = () => { phase = "ask"; t = 0; c.ai.react("paw", { force: true, dur: 40 }); c.emote("marlo", "✋", () => g.get("head"), "High five!", 2.2); };
  const near = () => flat(c.pip.get("pelvis"), g.get("chest")) < 0.19;
  const slap = () => {
    got++; phase = "wait"; wait = 2.6;
    c.ai.react("cheer", { force: true });
    c.sfx("clack", g.group, { volume: 1, rate: 1.2 });
    c.sfx("chime", null, { volume: 0.4, rate: 1.2 + got * 0.15 });
    c.confetti("grace");
    c.emote("pip", "✦", () => c.pip.get("head"), `High five! ${got} / ${need}`, 1.6);
    if (got >= need) { phase = "won"; c.hideHint(); setTimeout(() => c.guestSay("highFived"), 700); setTimeout(done, 2000); }
  };
  c.guestSay("highFive");
  ask();
  return {
    debug: () => ({ phase, got }),
    target() { return g.get("chest").clone(); },
    hint() { return "highfive"; },
    update(dt) {
      t += dt;
      if (phase === "wait") { wait -= dt; if (wait <= 0) ask(); return; }
      if (phase !== "ask") return;
      if (!c.ai.busy && t > 1) ask(); // keep the paw up
      const b = body(c);
      if (b.hand < b.head - 0.03) lowered = true; // arm back down: ready for the next one
      if (near() && lowered && b.hand > b.head - 0.005 && t > 0.6) { lowered = false; slap(); }
    },
    hear(ev) { if (phase === "ask" && ev.type === "wave" && near() && lowered && t > 0.6) { lowered = false; slap(); } },
    end() {},
  };
}

// Stage 1. Marlo counts three, two, one... and you both jump at the same moment. Fireworks!
function together(spec, c, done) {
  const g = c.guest(), need = spec.count || 3;
  let phase = "count", t = 0, got = 0, shown = 0, lastJump = -9, clock = 0;
  const count = () => { phase = "count"; t = 0; shown = 0; };
  const firework = (i) => { c.confetti(["grace", "slapstick", "drama"][i % 3]); c.sfx("pop", null, { volume: 0.6, rate: 0.6 + (i % 3) * 0.25 }); };
  c.guestSay("together");
  count();
  return {
    debug: () => ({ phase, got }),
    target() { return g.get("head").clone(); },
    hint() { return "together"; },
    update(dt) {
      t += dt; clock += dt;
      if (phase === "count") {
        const beats = ["3", "2", "1"];
        if (shown < 3 && t > 2 + shown) { c.emote("marlo", beats[shown], () => g.get("head"), null, 0.9); c.sfx("chime", null, { volume: 0.3, rate: 0.9 + shown * 0.15 }); shown++; }
        else if (shown === 3 && t > 5) {
          phase = "window"; t = 0; shown = 4;
          c.ai.react("jump", { force: true });
          c.emote("marlo", "↑", () => g.get("head"), "JUMP!", 1.2);
          c.sfx("chime", null, { volume: 0.45, rate: 1.5 });
        }
      } else if (phase === "window") {
        // a jump a moment before the word, or up to 1.4 s after it, counts
        if (clock - lastJump < t + 0.5) {
          got++;
          firework(got);
          c.emote("pip", "✦", () => c.pip.get("head"), `Together! ${got} / ${need}`, 1.6);
          if (got >= need) {
            phase = "won"; c.hideHint();
            for (let i = 1; i < 5; i++) setTimeout(() => firework(i), i * 450);
            c.sfx("cheer", null, { volume: 0.5 });
            setTimeout(() => c.guestSay("fireworks"), 600);
            setTimeout(done, 2600);
          } else { phase = "rest"; t = 0; }
        } else if (t > 1.4) { phase = "rest"; t = -0.8; c.guestSay("missJump"); }
      } else if (phase === "rest" && t > 1.6) count();
    },
    hear(ev) { if (ev.type === "jump") lastJump = clock; },
    end() {},
  };
}

// Stage 2. Bramble's owls know the way: one hoots (listen: the sound comes from her
// perch, and her eyes glow); walk Sir Pip under the owl that called.
function owlMesh() {
  const o = new THREE.Group();
  const brown = new THREE.MeshStandardMaterial({ color: 0x7a5a3a, roughness: 0.9 });
  const bark = new THREE.MeshStandardMaterial({ color: 0x4a3220, roughness: 0.9 });
  const eyeM = new THREE.MeshStandardMaterial({ color: 0xffe070, emissive: 0xffc040, emissiveIntensity: 0.25, toneMapped: false });
  const post = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.009, 0.2, 8), bark); post.position.y = 0.1;
  const bodyM = new THREE.Mesh(new THREE.SphereGeometry(0.018, 14, 10), brown); bodyM.scale.set(1, 1.25, 0.9); bodyM.position.y = 0.222;
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.014, 14, 10), brown); head.position.y = 0.252;
  o.add(post, bodyM, head);
  for (const s of [-1, 1]) {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.0048, 10, 8), eyeM); eye.position.set(s * 0.0062, 0.254, 0.0115); o.add(eye);
    const tuft = new THREE.Mesh(new THREE.ConeGeometry(0.004, 0.012, 6), brown); tuft.position.set(s * 0.008, 0.268, 0); tuft.rotation.z = -s * 0.4; o.add(tuft);
  }
  o.userData.eyes = eyeM;
  o.userData.head = head;
  return o;
}
function owls(spec, c, done) {
  const group = new THREE.Group();
  c.root.add(group);
  const xs = [-0.26, 0, 0.26], need = spec.count || 3;
  const perches = xs.map((x) => { const m = owlMesh(); m.scale.setScalar(1.35); m.position.set(x, 0, -0.06); group.add(m); return { m, x }; });
  let t = 0, phase = "listen", calling = -1, got = 0, hoots = 0, under = -1, underT = 0, toldWrong = -9, last = -1;
  const call = () => {
    let i; do { i = Math.floor(Math.random() * 3); } while (i === last);
    calling = last = i; hoots = 0; t = 0; phase = "listen";
  };
  c.guestSay("owl");
  setTimeout(() => c.coach(TASK_LINES.owlListen), 2600);
  call();
  return {
    debug: () => ({ phase, calling, got, under }),
    target() { return calling >= 0 ? perches[calling].m.position.clone().setY(0.1) : null; },
    hint() { return "owl"; },
    update(dt) {
      t += dt;
      perches.forEach((p, i) => {
        const glow = i === calling && phase === "listen" ? Math.max(0, 1 - ((t - 0.6) % 4.2) * 0.9) : 0;
        p.m.userData.eyes.emissiveIntensity = 0.25 + glow * 2.6;
        p.m.userData.head.rotation.y = Math.sin(t * 0.7 + i * 2) * 0.5;
      });
      if (phase === "found") { if (t > 2) call(); return; }
      if (phase !== "listen") return;
      // the call repeats every few seconds, from that owl's perch (spatial in a headset)
      if (t > 0.6 + hoots * 4.2) { hoots++; const perch = perches[calling].m; c.sfx("nightbird", perch, { volume: 0.9 }); c.emote("owl", "♪", () => perch.position.clone().setY(0.29), "Hoo!", 1.2); }
      const p = c.pip.get("pelvis");
      const i = perches.findIndex((q) => Math.abs(p.x - q.x) < 0.07 && Math.abs(p.z - q.m.position.z) < 0.14);
      if (i !== under) { under = i; underT = 0; }
      underT += dt;
      if (i < 0 || underT < 0.6) return;
      if (i === calling) {
        got++;
        phase = "found"; t = 0; calling = -1;
        c.sfx("chime", null, { volume: 0.5, rate: 1.1 + got * 0.12 });
        c.emote("pip", "✦", () => c.pip.get("head"), `This way! ${got} / ${need}`, 1.6);
        c.coach(TASK_LINES.owlFound);
        if (got >= need) { phase = "won"; c.hideHint(); setTimeout(() => c.guestSay("owlDone"), 1200); setTimeout(done, 2400); }
      } else if (t - toldWrong > 6 && hoots > 0) { toldWrong = t; c.coach(TASK_LINES.notThatOwl); }
    },
    end() { c.clearEmote?.("owl"); dispose(group); },
  };
}

// ---------------------------------------------------------------------------
// The workshop. Twig boasts; is it true, or a fib? His nose gives him away.
// Walk Sir Pip onto the log slice that says True, or the one that says Fib.
function logSlice() {
  const bark = new THREE.MeshStandardMaterial({ color: 0x4a2f1c, roughness: 0.95 });
  const top = new THREE.MeshStandardMaterial({ map: endGrainTexture(), roughness: 0.75 });
  return new THREE.Mesh(new THREE.CylinderGeometry(0.056, 0.059, 0.012, 32), [bark, top, top]);
}
function fib(spec, c, done) {
  const B = c.twigBoasts, pick = (a) => a[Math.floor(Math.random() * a.length)];
  const firstTrue = Math.random() < 0.5;
  const rounds = [[pick(firstTrue ? B.truths : B.fibs), firstTrue], [pick(firstTrue ? B.fibs : B.truths), !firstTrue], [B.last, false]];
  const g = c.guest(), gHead = () => g.get("head");
  const group = new THREE.Group();
  c.root.add(group);
  const stones = [["True", true, -0.3], ["Fib", false, -0.06]].map(([text, val, x]) => {
    const s = new THREE.Group();
    const slab = logSlice(); slab.position.y = 0.006;
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.062, 0.003, 6, 36), new THREE.MeshBasicMaterial({ color: val ? 0x9fffa0 : 0xffb07a, transparent: true, opacity: 0.4, toneMapped: false }));
    ring.rotation.x = Math.PI / 2; ring.position.y = 0.013;
    const tag = label(text, val ? "#2a6a2a" : "#9a3a12");
    tag.position.set(0, 0.052, 0.07);
    s.add(slab, ring, tag);
    s.position.set(x, 0, 0.012);
    group.add(s);
    return { s, ring, val, on: 0, armed: false };
  });
  // an answer counts once Twig has said his piece: stand on a slice for half a second. Only the
  // slice you answered on last time needs a step off first (so an old answer can't repeat itself)
  const R = 0.078, HOLD = 0.5;
  let i = 0, phase = "say", t = 0, cool = 0, last = -1;
  const say = () => { phase = "say"; t = 0; c.guestSay(rounds[i][0]); };
  say();
  return {
    debug: () => ({ round: i, phase, truth: rounds[i]?.[1], nose: c.twigNose?.(), stones: stones.map((st) => +st.on.toFixed(2)), last, cool: +cool.toFixed(2) }),
    target() { return phase === "answer" ? new THREE.Vector3(-0.18, 0.05, 0.012) : gHead().clone(); },
    hint() { return "fib"; },
    update(dt) {
      t += dt; cool -= dt;
      const b = body(c);
      const on = stones.map((st) => flat(st.s.position, b.pelvis) < R);
      if (last >= 0 && !on[last]) last = -1; // stepped off last time's answer: it's free again
      if (phase === "say") {
        // his line has started (it's no longer waiting its turn), and the nose has had its moment
        if ((!c.guestQueued() && t > 2.6) || t > 9) {
          phase = "answer"; t = 0;
          if (rounds[i][1]) c.emote("marlo", "…", gHead, "His nose stayed put...", 2.2);
          if (last >= 0) setTimeout(() => c.emote("pip", "↔", () => c.pip.get("head"), "Step off, then choose!", 2.4), 900);
          c.showHint("fib");
        }
      }
      stones.forEach((st, k) => {
        const counts = phase === "answer" && on[k] && k !== last && cool <= 0;
        if (counts && st.on === 0) c.sfx("clack", null, { volume: 0.4, rate: 1.4 }); // a knock as he steps onto the wood
        st.on = counts ? st.on + dt : 0;
        const p = Math.min(1, st.on / HOLD);
        st.ring.material.opacity = on[k] ? 0.6 + 0.4 * p : phase === "answer" ? 0.35 + 0.2 * Math.sin(t * 3 + k) : 0.2;
        st.ring.scale.setScalar(1 + 0.12 * p);
      });
      if (phase !== "answer") return;
      stones.forEach((st, k) => {
        if (phase !== "answer" || st.on < HOLD) return;
        st.on = 0; last = k;
        const truth = rounds[i][1];
        if (st.val === truth) {
          phase = "next";
          c.hideHint();
          st.ring.material.color.set(0x8cff7a);
          c.sfx("chime", null, { volume: 0.5, rate: 1.1 + i * 0.12 });
          c.emote("pip", "✦", () => c.pip.get("head"), `Right! ${i + 1} / 3`, 1.8);
          c.guestSay(truth ? "trueRight" : "caught");
          c.ai.react(truth ? "bow" : "hide", { force: true });
          const final = i === rounds.length - 1;
          setTimeout(() => {
            st.ring.material.color.set(st.val ? 0x9fffa0 : 0xffb07a);
            if (!final) { i++; say(); return; }
            // caught on the big one: at last, the truth
            c.guestSay("confess");
            c.ai.react("slump", { force: true });
            c.emote("marlo", "♥", gHead, "The truth!", 2.6);
            setTimeout(done, 5200);
          }, 3400);
        } else {
          cool = 2.4;
          c.sfx("pop", null, { volume: 0.4, rate: 0.6 });
          c.ai.react("laugh", { force: true });
          c.guestSay(truth ? "trueWrong" : "fooled");
          c.emote("marlo", "!", gHead, truth ? "That was true!" : "Fooled you!", 1.8);
          setTimeout(() => c.oops?.(), 1400);
        }
      });
    },
    end() { dispose(group); c.hideHint(); },
  };
}

// Twig can't dance: show him moves (jump, bow, wave, spin) and he copies each one.
function mirror(spec, c, done) {
  const need = spec.count || 3, learned = new Set(), g = c.guest(), gHead = () => g.get("head");
  let busy = 0, phase = "learn";
  c.guestSay("teach");
  c.emote("marlo", "?", gHead, "Show me a move!", 2.6);
  return {
    debug: () => ({ phase, learned: [...learned] }),
    target() { return gHead().clone(); },
    hint() { return "teach"; },
    update(dt) { busy -= dt; },
    hear(ev) {
      if (phase !== "learn" || !MOVE_NAMES[ev.type] || busy > 0) return;
      busy = 1.5;
      const move = ev.type, fresh = !learned.has(move);
      setTimeout(() => c.ai.react(move, { force: true }), 650); // he copies you, a beat behind
      if (!fresh) { c.emote("marlo", "♪", gHead, `${MOVE_NAMES[move]} again!`, 1.4); return; }
      learned.add(move);
      const n = learned.size;
      c.sfx("chime", null, { volume: 0.35, rate: 1.1 + n * 0.12 });
      c.emote("pip", "✦", () => c.pip.get("head"), `Twig learned: ${MOVE_NAMES[move]}  ${n} / ${need}`, 2);
      setTimeout(() => c.guestSay(n >= need ? "learned3" : n === 1 ? "learned1" : "learned2"), 1700);
      if (n >= need) {
        phase = "won"; c.hideHint();
        setTimeout(() => { c.ai.react("dance", { force: true }); c.confetti("grace"); c.sfx("applause", null, { volume: 0.4 }); }, 2700);
        setTimeout(done, 5600);
      }
    },
    end() {},
  };
}

// ---------------------------------------------------------------------------
// The harbour laundry: Noodle, a sock puppet on the robot's hand, pops up through
// trapdoors. Peekaboo: walk Sir Pip to whichever hole Noodle pops out of, and boop its nose.
function peekaboo(spec, c, done) {
  const N = c.sock("noodle"), holes = c.holes(), need = spec.count || 3, pipHead = () => c.pip.get("head");
  let got = 0, phase = "wait", t = 0, at = 2, pops = 0;
  N.duck();
  const pop = () => {
    // a different hole each time, never the one Sir Pip is standing by
    const p = c.pip.get("pelvis");
    const free = holes.map((h, k) => k).filter((k) => k !== at && Math.hypot(holes[k][0] - p.x, holes[k][1] - p.z) > 0.1);
    at = free.length ? free[Math.floor(Math.random() * free.length)] : (at + 1) % holes.length;
    N.at(...holes[at]).popUp();
    c.sfx("pop", null, { volume: 0.45, rate: 1.6 });
    c.guestSay(["peek", "peek2", "peek3"][pops++ % 3]);
    c.emote("marlo", "!", () => N.headPos(), "Peekaboo!", 1.4);
    phase = "up"; t = 0;
  };
  return {
    debug: () => ({ phase, got, at, up: N.isUp }),
    target() { return phase === "up" ? new THREE.Vector3(holes[at][0], 0.07, holes[at][1]) : null; },
    hint() { return "peek"; },
    update(dt) {
      t += dt;
      if (phase === "wait") { if (N.hidden && t > 1.1) pop(); return; }
      if (phase === "up") {
        const p = c.pip.get("pelvis"), d = Math.hypot(holes[at][0] - p.x, holes[at][1] - p.z);
        if (t > 0.35 && d < 0.09) {
          got++; phase = got >= need ? "won" : "booped"; t = 0;
          c.sfx("pop", null, { volume: 0.7, rate: 1.9 });
          c.sfx("chime", null, { volume: 0.4, rate: 1.1 + got * 0.15 });
          c.emote("pip", "✦", pipHead, `Boop! ${got} / ${need}`, 1.6);
          N.wiggleFor(1.4);
          c.knockSock?.();
          if (got >= need) { c.hideHint(); c.guestSay("booped"); c.confetti("grace"); setTimeout(done, 3400); }
          else c.guestSay(got === 1 ? "boop" : "boop2");
        } else if (t > (pops === 1 ? 6 : 4.6)) { N.duck(); phase = "wait"; t = 0; if (Math.random() < 0.5) c.guestSay("miss"); }
      } else if (phase === "booped" && t > 1.7) { N.duck(); phase = "wait"; t = 0; }
    },
    end() {},
  };
}

// Find the twin: four socks on the washing line; walk Sir Pip under the one with Noodle's
// stripes. It drops off the line, and up through the floor comes Doodle (the robot's other hand).
function matchsock(spec, c, done) {
  const N = c.sock("noodle"), holes = c.holes(), L = c.washingLine(), pipHead = () => c.pip.get("head");
  const group = new THREE.Group();
  c.root.add(group);
  const decoys = [...SOCK_STRIPES.decoys].sort(() => Math.random() - 0.5).slice(0, 3);
  const right = Math.floor(Math.random() * 4);
  const xs = [-0.27, -0.09, 0.09, 0.27];
  const socks = xs.map((x, k) => {
    const s = hangingSock(k === right ? SOCK_STRIPES.noodle : decoys.pop());
    s.position.set(x, L.y, L.z + 0.004);
    s.scale.setScalar(1.5); // (big enough to compare stripes from the audience)
    s.rotation.y = (Math.random() - 0.5) * 0.3;
    group.add(s);
    return { s, x, on: 0, swing: 0, ph: Math.random() * 6 };
  });
  // Noodle stands up tall at its own hole, to show off its stripes
  const home = () => { N.at(...holes[2]).popUp(true); N.wiggleFor(1.2); };
  if (N.hidden) home(); else { N.duck(); setTimeout(home, 700); }
  c.guestSay("stripes");
  setTimeout(() => c.emote("marlo", "★", () => N.headPos(), "Match my stripes!", 2.6), 1200);
  let phase = "choose", t = 0, last = -1, wrongs = 0, fall = null;
  return {
    debug: () => ({ phase, right, at: socks.map((s) => s.x) }),
    target() { return phase === "choose" ? new THREE.Vector3(0, L.y - 0.03, L.z) : null; },
    hint() { return "sock"; },
    update(dt) {
      t += dt;
      const p = c.pip.get("pelvis");
      socks.forEach((S, k) => {
        S.swing *= Math.exp(-2.5 * dt);
        S.s.rotation.z = Math.sin(t * 1.3 + S.ph) * 0.05 + Math.sin(t * 9) * S.swing;
        if (phase !== "choose") return;
        const under = Math.abs(p.x - S.x) < 0.05;
        if (last === k && !under) last = -1;
        const counts = under && k !== last && t > 1.5;
        S.on = counts ? S.on + dt : 0;
        if (S.on < 0.6) return;
        S.on = 0; last = k;
        if (k === right) {
          phase = "found"; c.hideHint();
          c.sfx("chime", null, { volume: 0.55 });
          c.emote("pip", "✦", pipHead, "That's the one!", 2);
          fall = { S, v: 0, spin: (Math.random() - 0.5) * 6 };
          c.guestSay("found");
          N.wiggleFor(2.5);
          // the robot's other hand: Doodle pops up out of the middle hole
          setTimeout(() => { const D = c.sock("doodle"); D.at(...holes[1]).popUp(); D.wiggleFor(1.5); c.sfx("pop", null, { volume: 0.6, rate: 1.3 }); }, 2200);
          setTimeout(() => c.sayAs("doodle", "hello"), 2900);
          setTimeout(() => { c.guestSay("thanks"); c.confetti("grace"); }, 6400);
          setTimeout(done, 9000);
        } else {
          wrongs++;
          S.swing = 0.6;
          c.sfx("swish", null, { volume: 0.4, rate: 1.3 });
          c.guestSay(wrongs % 2 ? "wrongSock" : "wrongSock2");
          c.emote("marlo", "✗", () => N.headPos(), "Not that one!", 1.6);
          N.wiggleFor(0.8);
        }
      });
      // the twin drops off the line, tumbling down to the boards
      if (fall) {
        fall.v += 9.8 * dt * 0.35;
        fall.S.s.position.y = Math.max(0.018, fall.S.s.position.y - fall.v * dt);
        fall.S.s.rotation.x += fall.spin * dt * (fall.S.s.position.y > 0.019 ? 1 : 0);
        if (fall.S.s.position.y <= 0.018 && !fall.landed) { fall.landed = true; c.sfx("thud", null, { volume: 0.3, rate: 1.6 }); setTimeout(() => (fall.S.s.visible = false), 1600); }
      }
    },
    end() { dispose(group); },
  };
}

const TASKS = { shy, highfive, together, owls, collect, simon, duel, riddle, sneak, unlock, dodge, mount, rings, gears, chase, kindness, knight, fib, mirror, peekaboo, matchsock };
export function createTask(spec, c, done) {
  const make = TASKS[spec.type];
  if (!make) { setTimeout(done, 100); return { update() {}, end() {} }; }
  return make(spec, c, done);
}
