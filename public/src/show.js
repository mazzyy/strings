// Tonight's Show: every visit is a short three-act scene with goals the player
// performs (walk to Marlo, bow, hand him a flower...). Each act earns a star and
// applause; the curtain call earns a playbill for your collection. A new scene
// each day, plus a streak, gives a reason to come back tomorrow.
import * as THREE from "three";
import { SCENES, SHOW_LINES, ENDINGS } from "./lines.js";

const KEY = "strings.playbills";
// local calendar days, so "tomorrow's show" changes at the player's midnight
const localDate = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const today = () => localDate();
const dayNumber = () => Math.floor((Date.now() - new Date().getTimezoneOffset() * 60000) / 86400000);

export const playbills = {
  list() { try { return JSON.parse(localStorage.getItem(KEY) || "[]"); } catch { return []; } },
  add(p) { try { const all = this.list(); all.unshift(p); localStorage.setItem(KEY, JSON.stringify(all.slice(0, 60))); } catch { /* private mode */ } },
  streak() {
    const days = new Set(this.list().map((p) => p.date));
    let n = 0;
    const d = new Date();
    while (days.has(localDate(d))) { n++; d.setDate(d.getDate() - 1); }
    return n;
  },
};

function starShape(r1 = 0.012, r2 = 0.005) {
  const s = new THREE.Shape();
  for (let i = 0; i < 10; i++) {
    const r = i % 2 ? r2 : r1, a = (i / 10) * Math.PI * 2 + Math.PI / 2;
    i ? s.lineTo(Math.cos(a) * r, Math.sin(a) * r) : s.moveTo(Math.cos(a) * r, Math.sin(a) * r);
  }
  return new THREE.ExtrudeGeometry(s, { depth: 0.003, bevelEnabled: false });
}

// how each action colours the performance (decides the ending + critic scores)
const STYLE = {
  bow: { grace: 1 }, wave: { grace: 0.6 }, give: { grace: 1.2 }, approach: { grace: 0.4 },
  fall: { slapstick: 1.3 }, slump: { slapstick: 0.7 }, jump: { slapstick: 0.5 }, snap: { slapstick: 1 }, drop: { slapstick: 0.5 },
  turn: { drama: 0.7 }, idle: { drama: 0.5 }, rise: { drama: 0.3 },
};
function styleOf(ev) {
  if (ev.type === "hold") return ev.prop === "sword" ? { drama: 0.8 } : ev.prop === "flower" ? { grace: 0.5 } : { drama: 0.3 };
  if (ev.type === "walk") return ev.fast ? { drama: 0.6 } : ev.away ? { drama: 0.5 } : { grace: 0.15 };
  return STYLE[ev.type] || null;
}
export function scoreStyle(style) {
  const total = Math.max(0.001, style.grace + style.slapstick + style.drama);
  const out = {};
  for (const k of ["grace", "slapstick", "drama"]) out[k] = Math.max(1, Math.round((style[k] / total) * 5));
  return out;
}

function playbillTexture(scene, stars, streak, entry = {}) {
  const c = document.createElement("canvas");
  c.width = 360; c.height = 560;
  const g = c.getContext("2d");
  g.fillStyle = "#efe2c2"; g.fillRect(0, 0, 360, 560);
  g.strokeStyle = "#7a1d22"; g.lineWidth = 10; g.strokeRect(14, 14, 332, 532);
  g.strokeStyle = "#c9a14a"; g.lineWidth = 3; g.strokeRect(28, 28, 304, 504);
  g.fillStyle = "#7a1d22"; g.textAlign = "center";
  g.font = "600 26px Georgia, serif"; g.fillText("STRINGS THEATRE", 180, 82);
  g.font = "italic 20px Georgia, serif"; g.fillStyle = "#4a3020"; g.fillText("presents", 180, 116);
  g.font = "700 36px Georgia, serif"; g.fillStyle = "#2a1a10";
  const words = scene.title.split(" "); let line = "", y = 176;
  for (const w of words) { const t = line ? `${line} ${w}` : w; if (g.measureText(t).width > 280) { g.fillText(line, 180, y); y += 44; line = w; } else line = t; }
  g.fillText(line, 180, y);
  g.font = "22px Georgia, serif"; g.fillStyle = "#4a3020";
  g.fillText(`starring Sir Pip & ${entry.guest || "Marlo"}`, 180, y + 56);
  g.font = "40px Georgia, serif"; g.fillStyle = "#c9a14a";
  g.fillText("★".repeat(stars) + "☆".repeat(3 - stars), 180, y + 104);
  if (entry.ending) {
    g.font = "600 19px Georgia, serif"; g.fillStyle = "#7a1d22";
    g.fillText(`Ending: ${entry.ending}`, 180, y + 140);
  }
  if (entry.scores) {
    g.font = "15px Georgia, serif"; g.fillStyle = "#4a3020"; g.textAlign = "left";
    [["Grace", "grace"], ["Slapstick", "slapstick"], ["Drama", "drama"]].forEach(([label, k], i) => {
      const yy = y + 172 + i * 22;
      g.fillText(label, 78, yy);
      for (let d = 0; d < 5; d++) { g.beginPath(); g.arc(186 + d * 20, yy - 5, 6, 0, Math.PI * 2); g.fillStyle = d < entry.scores[k] ? "#b8862a" : "rgba(74,48,32,0.18)"; g.fill(); }
      g.fillStyle = "#4a3020";
    });
    g.textAlign = "center";
  }
  if (entry.critic) {
    g.font = "italic 15px Georgia, serif"; g.fillStyle = "#2a1a10";
    const words = `“${entry.critic}”`.split(" "); let ln = "", cy = 448;
    for (const w of words) { const t = ln ? `${ln} ${w}` : w; if (g.measureText(t).width > 270) { g.fillText(ln, 180, cy); cy += 19; ln = w; } else ln = t; }
    g.fillText(ln, 180, cy);
    g.font = "12px Georgia, serif"; g.fillStyle = "#6a5040"; g.fillText("— The Velvet Gazette", 180, cy + 18);
  }
  g.font = "italic 15px Georgia, serif"; g.fillStyle = "#4a3020";
  g.fillText(today() + (streak > 1 ? `  ·  ${streak}-night streak` : ""), 180, 522);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

export class Show {
  constructor(o) {
    Object.assign(this, o); // narrator, hints, sfx, ai, pip, marlo, props, curtains, setNight, isXR, stageRoot, onChange
    this.state = "idle";
    this.scene = null;
    this.act = -1;
    this.stars = 0;
    this.t = 0;
    this.actT = 0;
    this.notHeld = 0;
    this.nextHintAt = 0;
    this.wait = 0;
    this.played = new Set(playbills.list().filter((p) => p.date === today()).map((p) => p.id));

    // stars that fill above the stage (visible in the headset too)
    const gold = new THREE.MeshStandardMaterial({ color: 0xd8ac4f, metalness: 1, roughness: 0.25, emissive: 0x5a3a00, emissiveIntensity: 0.6 });
    const dim = new THREE.MeshStandardMaterial({ color: 0x5a5048, metalness: 0.6, roughness: 0.6, transparent: true, opacity: 0.5 });
    this.starMats = { gold, dim };
    this.starGroup = new THREE.Group();
    this.starMeshes = [-1, 0, 1].map((i) => {
      const m = new THREE.Mesh(starShape(), dim);
      m.position.set(i * 0.035, 0, 0);
      this.starGroup.add(m);
      return m;
    });
    this.starGroup.position.set(0, 0.36, -0.19);
    this.starGroup.visible = false;
    this.stageRoot.add(this.starGroup);

    this.style = { grace: 0, slapstick: 0, drama: 0 };
    this.bill = new THREE.Mesh(new THREE.PlaneGeometry(0.11, 0.171), new THREE.MeshStandardMaterial({ roughness: 0.8 }));
    this.bill.position.set(-0.3, 0.1, 0.12);
    this.bill.rotation.set(-0.25, 0.35, 0);
    this.bill.visible = false;
    this.stageRoot.add(this.bill);
  }

  pickScene() {
    const n = SCENES.length;
    if (!playbills.list().length) return SCENES[0]; // first ever show teaches the basics
    let i = dayNumber() % n;
    for (let k = 0; k < n && this.played.has(SCENES[i].id); k++) i = (i + 1) % n;
    return SCENES[i];
  }

  // curtain is up; begin a scene
  start(scene = null) {
    this.scene = scene || this.pickScene();
    this._doneFired = false;
    this.state = "intro";
    this.act = -1;
    this.stars = 0;
    this.wait = 0;
    this.style = { grace: 0, slapstick: 0, drama: 0 };
    this.starMeshes.forEach((m) => (m.material = this.starMats.dim));
    this.starGroup.visible = true;
    this.bill.visible = false;
    this.setNight(!!this.scene.night);
    if (this.scene.sleepy) this.ai.sleep(true);
    this.narrator.coach(this.scene.intro);
    this.onChange?.(this);
  }

  _nextAct() {
    this.act++;
    this.actT = 0;
    this.nextHintAt = 12;
    this.hints.hide();
    if (this.act >= this.scene.acts.length) return this._ending();
    this.state = "act";
    this.narrator.coach(this.scene.acts[this.act].goal);
    this.onChange?.(this);
  }

  _matches(check, ev) {
    const [type, prop] = check.split(":");
    if (ev.type !== type) return false;
    return !prop || ev.prop === prop;
  }

  // every detected action and prop event
  hear(ev) {
    if (this.state === "act" || this.state === "between" || this.state === "intro") {
      const st = styleOf(ev);
      if (st) for (const [k, v] of Object.entries(st)) this.style[k] += v;
    }
    if (this.state !== "act") return;
    const act = this.scene.acts[this.act];
    if (this._matches(act.check, ev)) this._complete();
  }

  _complete() {
    this.stars++;
    this.starMeshes[this.stars - 1].material = this.starMats.gold;
    this.sfx?.play("chime", null, { volume: 0.5 });
    this.sfx?.play("applause", null, { volume: 0.35 });
    if (this.scene.sleepy && this.scene.acts[this.act].check === "jump") this.ai.sleep(false);
    const bravo = SHOW_LINES.bravo[Math.floor(Math.random() * SHOW_LINES.bravo.length)];
    this.narrator.coach(bravo);
    this.hints.hide();
    this.state = "between";
    this.wait = 2.2;
    this.onChange?.(this);
  }

  // the ending is chosen by how you performed: graceful, clumsy or dramatic
  _ending() {
    const st = this.style;
    const type = st.slapstick > st.grace && st.slapstick >= st.drama ? "slapstick" : st.drama > st.grace ? "drama" : "grace";
    this.endingType = type;
    const e = ENDINGS[type];
    this.state = "ending";
    this.wait = 9;
    this.hints.hide();
    this.ai.sleep(false);
    this.ai.react(e.clip, { force: true });
    this.narrator.coach(e.line);
    this.sfx?.play(type === "slapstick" ? "pop" : "chime", null, { volume: 0.6, rate: type === "drama" ? 0.7 : 1 });
    this.onEnding?.(type);
    this.onChange?.(this);
  }

  _finale() {
    this.state = "finale";
    this.wait = 9;
    this.setNight(false);
    this.ai.sleep(false);
    this.curtains?.call();
    this.sfx?.play("applause", null, { volume: 0.8 });
    this.sfx?.play("roar", this.marlo.group, { volume: 0.6 });
    this.ai.react("bow");
    this.narrator.coach(SHOW_LINES.finale);
    this.narrator.coach(SHOW_LINES.tomorrow);
    this.played.add(this.scene.id);
    const e = ENDINGS[this.endingType || "grace"];
    const before = playbills.list().length;
    const entry = {
      id: this.scene.id, title: this.scene.title, date: today(), stars: this.stars,
      ending: e.title, endingType: this.endingType || "grace", scores: scoreStyle(this.style), guest: this.guestName || "Marlo",
      critic: e.critics[Math.floor(Math.random() * e.critics.length)],
    };
    playbills.add(entry);
    this.onUnlock?.(before + 1);
    this.bill.material.map?.dispose();
    this.bill.material.map = playbillTexture(this.scene, this.stars, playbills.streak(), entry);
    this.bill.material.needsUpdate = true;
    this.bill.visible = true;
    this.onChange?.(this, entry);
  }

  update(dt, xr) {
    this.t += dt;
    if (this.state === "idle") return;
    const held = this.pip.main.held;
    this.notHeld = held ? 0 : this.notHeld + dt;

    if (this.wait > 0) {
      this.wait -= dt;
      if (this.wait <= 0) {
        if (this.state === "between") this._nextAct();
        else if (this.state === "ending") this._finale();
        else if (this.state === "finale") {
          this.state = "done"; this.doneT = this.t;
          if (this.onDone) this.onDone(this); else this.narrator.coach(SHOW_LINES.encore);
        }
      }
      return;
    }
    if (this.state === "intro") {
      // the first act begins once the knight is in hand
      if (held && !this.narrator.speaking) this._nextAct();
      else if (this.notHeld > 4) this._hint("grab", xr);
      return;
    }
    if (this.state === "done") {
      // encore: pick the bar up again (or keep performing) and the next show begins
      if (!this.onDone && this.t - this.doneT > 6 && held) this.start();
      return;
    }
    if (this.state !== "act") return;
    this.actT += dt;
    const act = this.scene.acts[this.act];
    // "approach" is also satisfied simply by being close
    if (act.check === "approach" && this.pip.center().distanceTo(this.marlo.center()) < 0.13) return this._complete();
    if (this.notHeld > 4 && !act.check.startsWith("hold") && !act.check.startsWith("give")) return this._hint("grab", xr);
    if (this.hints.current === "grab" && held) this.hints.hide();
    if (this.actT > this.nextHintAt) {
      this.nextHintAt = this.actT + 16;
      // giving needs the prop to be in Sir Pip's hand first
      let hint = act.hint;
      if (act.check.startsWith("give") && !this.props.heldBy("pip")) hint = "take" + act.check.split(":")[1].replace(/^./, (c) => c.toUpperCase());
      this._hint(hint, xr, true);
    }
  }

  _hint(name, xr, speak = true) {
    const fresh = this.hints.current !== name;
    this.hints.show(name, xr);
    if (fresh && speak) this.narrator.coach(this.hints.voiceKey(name, xr));
  }

  skip() { if (this.state === "act") this._complete(); }
}
