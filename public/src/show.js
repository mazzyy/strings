// Tonight's Show: every visit is a short three-act scene with goals the player
// performs (walk to Marlo, bow, hand him a flower...). Each act earns a star and
// applause; the curtain call earns a playbill for your collection. A new scene
// each day, plus a streak, gives a reason to come back tomorrow.
import * as THREE from "three";
import { SCENES, SHOW_LINES } from "./lines.js";

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

function playbillTexture(scene, stars, streak) {
  const c = document.createElement("canvas");
  c.width = 360; c.height = 500;
  const g = c.getContext("2d");
  g.fillStyle = "#efe2c2"; g.fillRect(0, 0, 360, 500);
  g.strokeStyle = "#7a1d22"; g.lineWidth = 10; g.strokeRect(14, 14, 332, 472);
  g.strokeStyle = "#c9a14a"; g.lineWidth = 3; g.strokeRect(28, 28, 304, 444);
  g.fillStyle = "#7a1d22"; g.textAlign = "center";
  g.font = "600 26px Georgia, serif"; g.fillText("STRINGS THEATRE", 180, 82);
  g.font = "italic 20px Georgia, serif"; g.fillStyle = "#4a3020"; g.fillText("presents", 180, 116);
  g.font = "700 36px Georgia, serif"; g.fillStyle = "#2a1a10";
  const words = scene.title.split(" "); let line = "", y = 176;
  for (const w of words) { const t = line ? `${line} ${w}` : w; if (g.measureText(t).width > 280) { g.fillText(line, 180, y); y += 44; line = w; } else line = t; }
  g.fillText(line, 180, y);
  g.font = "22px Georgia, serif"; g.fillStyle = "#4a3020";
  g.fillText("starring Sir Pip & Marlo", 180, y + 56);
  g.font = "48px Georgia, serif"; g.fillStyle = "#c9a14a";
  g.fillText("★".repeat(stars) + "☆".repeat(3 - stars), 180, y + 130);
  g.font = "italic 18px Georgia, serif"; g.fillStyle = "#4a3020";
  g.fillText(today(), 180, 430);
  if (streak > 1) g.fillText(`${streak}-night streak`, 180, 456);
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

    this.bill = new THREE.Mesh(new THREE.PlaneGeometry(0.11, 0.152), new THREE.MeshStandardMaterial({ roughness: 0.8 }));
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
  start() {
    this.scene = this.pickScene();
    this.state = "intro";
    this.act = -1;
    this.stars = 0;
    this.wait = 0;
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
    if (this.act >= this.scene.acts.length) return this._finale();
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
    const entry = { id: this.scene.id, title: this.scene.title, date: today(), stars: this.stars };
    playbills.add(entry);
    this.bill.material.map?.dispose();
    this.bill.material.map = playbillTexture(this.scene, this.stars, playbills.streak());
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
        else if (this.state === "finale") { this.state = "done"; this.narrator.coach(SHOW_LINES.encore); this.doneT = this.t; }
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
      if (this.t - this.doneT > 6 && held) this.start();
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
