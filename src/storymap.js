// The storybook map: "The Tale of Sir Pip". A parchment map of the kingdom
// with a road between the chapters. Pick an unlocked place and a little shield
// token walks the road while the map pans to follow it; then the curtain falls,
// the set changes and the next chapter begins.
//   Desktop: an overlay you click.  Headset: a parchment floating beside the
//   stage that you poke with a fingertip.
// The same canvas drawing serves both.
import * as THREE from "three";
import { CHAPTERS, THEATRE } from "./lines.js";

const WORLD = { w: 1600, h: 1000 };
const VIEW = { w: 1200, h: 750 };
const FIT = VIEW.w / WORLD.w; // the whole kingdom fits on the page, so every place can be picked
const KEY = "strings.story";

export const story = {
  load() { try { return { unlocked: 1, done: {}, at: "courtyard", ...JSON.parse(localStorage.getItem(KEY) || "{}") }; } catch { return { unlocked: 1, done: {}, at: "courtyard" }; } },
  save(s) { try { localStorage.setItem(KEY, JSON.stringify(s)); } catch { /* private mode */ } },
};

// a seeded random so the parchment looks the same every time
const rnd = (seed) => () => ((seed = (seed * 16807) % 2147483647) / 2147483647);

function icon(g, kind, x, y, locked) {
  g.save();
  g.translate(x, y);
  g.globalAlpha = locked ? 0.45 : 1;
  g.lineWidth = 3;
  g.strokeStyle = "#3a2414";
  const fill = (c) => { g.fillStyle = c; g.fill(); g.stroke(); };
  if (kind === "courtyard") {
    g.beginPath(); g.rect(-34, -20, 68, 38); fill("#b9ad98");
    for (const tx of [-40, 22]) { g.beginPath(); g.rect(tx, -46, 18, 64); fill("#a89c86"); g.beginPath(); g.moveTo(tx - 4, -46); g.lineTo(tx + 9, -64); g.lineTo(tx + 22, -46); g.closePath(); fill("#24497f"); }
    g.beginPath(); g.arc(0, 18, 10, Math.PI, 0); g.lineTo(10, 18); fill("#4a3426");
  } else if (kind === "forest") {
    for (const [dx, dy, s] of [[-26, 6, 0.8], [0, -8, 1.1], [26, 8, 0.85]]) { g.beginPath(); g.moveTo(dx, dy - 50 * s); g.lineTo(dx - 22 * s, dy + 14 * s); g.lineTo(dx + 22 * s, dy + 14 * s); g.closePath(); fill("#3d6e3a"); g.beginPath(); g.rect(dx - 3, dy + 14 * s, 6, 10); fill("#5a3b22"); }
  } else if (kind === "ship") {
    g.beginPath(); g.moveTo(-42, 0); g.lineTo(42, 0); g.lineTo(30, 22); g.lineTo(-30, 22); g.closePath(); fill("#7a5432");
    g.beginPath(); g.moveTo(-2, 0); g.lineTo(-2, -56); g.stroke();
    g.beginPath(); g.moveTo(2, -52); g.quadraticCurveTo(34, -30, 2, -6); g.closePath(); fill("#f2ead8");
    g.beginPath(); g.rect(-2, -60, 16, 9); fill("#151515");
  } else if (kind === "bridge") {
    g.beginPath(); g.moveTo(-48, 16); g.lineTo(-48, -6); g.lineTo(48, -6); g.lineTo(48, 16); g.lineTo(22, 16); g.arc(0, 16, 22, 0, Math.PI, true); g.closePath(); fill("#8a8f9a");
    g.beginPath(); g.arc(30, -40, 12, 0, Math.PI * 2); fill("#f6f0d0");
  } else if (kind === "cave") {
    g.beginPath(); g.moveTo(-50, 22); g.lineTo(-30, -26); g.lineTo(-6, -44); g.lineTo(24, -34); g.lineTo(50, 22); g.closePath(); fill("#6a6070");
    g.beginPath(); g.moveTo(-18, 22); g.quadraticCurveTo(0, -24, 18, 22); g.closePath(); fill("#1a1420");
    g.beginPath(); g.arc(0, 10, 4, 0, Math.PI * 2); g.fillStyle = "#ffcf5a"; g.fill();
  } else if (kind === "tower") {
    g.beginPath(); g.rect(-20, -58, 40, 80); fill("#8a8f9a");
    g.beginPath(); g.moveTo(-26, -58); g.lineTo(0, -88); g.lineTo(26, -58); g.closePath(); fill("#5a4a6a");
    g.beginPath(); g.arc(0, -34, 12, 0, Math.PI * 2); fill("#f2ead8");
    g.beginPath(); g.moveTo(0, -34); g.lineTo(0, -42); g.moveTo(0, -34); g.lineTo(6, -32); g.stroke();
    g.beginPath(); g.rect(-7, 4, 14, 18); fill("#3a2a20");
    g.beginPath(); g.arc(0, -88, 4, 0, Math.PI * 2); g.fillStyle = "#ff3020"; g.fill();
  } else if (kind === "sky") {
    // a crescent moon with a little dragon flying across it
    g.beginPath(); g.arc(0, -20, 34, 0, Math.PI * 2); fill("#f6f0d0");
    g.beginPath(); g.arc(14, -28, 30, 0, Math.PI * 2); g.fillStyle = "#ead7a8"; g.fill();
    g.fillStyle = "#3d6e3a"; g.beginPath(); g.ellipse(-6, -10, 18, 7, -0.2, 0, Math.PI * 2); g.fill(); g.stroke();
    g.beginPath(); g.moveTo(-8, -14); g.lineTo(-24, -40); g.lineTo(4, -16); g.closePath(); g.fillStyle = "#c8743a"; g.fill(); g.stroke();
    g.beginPath(); g.arc(14, -16, 6, 0, Math.PI * 2); g.fillStyle = "#3d6e3a"; g.fill(); g.stroke();
  } else if (kind === "theatre") {
    g.beginPath(); g.rect(-40, -30, 80, 52); fill("#7a1d22");
    g.beginPath(); g.moveTo(-40, -30); g.quadraticCurveTo(0, -50, 40, -30); g.closePath(); fill("#c9a14a");
    g.beginPath(); g.rect(-26, -16, 52, 38); fill("#2a1810");
    g.beginPath(); g.moveTo(-26, -16); g.quadraticCurveTo(-14, 4, -26, 22); g.closePath(); fill("#b0202a");
    g.beginPath(); g.moveTo(26, -16); g.quadraticCurveTo(14, 4, 26, 22); g.closePath(); fill("#b0202a");
  }
  g.restore();
  if (locked) {
    g.save(); g.translate(x + 30, y - 30);
    g.fillStyle = "#3a2414"; g.beginPath(); g.roundRect(-10, -4, 20, 16, 3); g.fill();
    g.strokeStyle = "#3a2414"; g.lineWidth = 3; g.beginPath(); g.arc(0, -4, 6, Math.PI, 0); g.stroke();
    g.restore();
  }
}

export class StoryMap {
  constructor({ onChoose, isLocked }) {
    this.onChoose = onChoose;   // (place) => void, after the token arrives
    this.places = [...CHAPTERS, THEATRE];
    this.canvas = document.createElement("canvas");
    this.canvas.width = VIEW.w; this.canvas.height = VIEW.h;
    this.g = this.canvas.getContext("2d");
    this.bg = this._paintParchment();
    this.open = false;
    this.cam = { x: 0, y: 0 };
    this.token = { x: 0, y: 0 };
    this.travel = null;
    this.t = 0;
    this.state = story.load();
    const at = this.places.find((p) => p.id === this.state.at) || CHAPTERS[0];
    this.token.x = at.map[0]; this.token.y = at.map[1];
    this.zoom = 1;

    // desktop overlay
    this.el = document.getElementById("storymap");
    if (this.el) {
      this.el.querySelector(".mapwrap").appendChild(this.canvas);
      this.canvas.addEventListener("click", (e) => {
        const r = this.canvas.getBoundingClientRect();
        this.pick(((e.clientX - r.left) / r.width) * VIEW.w, ((e.clientY - r.top) / r.height) * VIEW.h);
      });
      this.canvas.addEventListener("pointermove", (e) => {
        const r = this.canvas.getBoundingClientRect();
        const p = this._placeAt(((e.clientX - r.left) / r.width) * VIEW.w, ((e.clientY - r.top) / r.height) * VIEW.h);
        this.hover = p?.id || null;
        this.canvas.style.cursor = p && this.unlocked(p) ? "pointer" : "default";
      });
      this.el.querySelector(".close")?.addEventListener("click", () => this.hide());
    }
    // headset: a parchment beside the stage
    this.tex = new THREE.CanvasTexture(this.canvas);
    this.tex.colorSpace = THREE.SRGBColorSpace;
    this.mesh = new THREE.Mesh(new THREE.PlaneGeometry(0.4, 0.25), new THREE.MeshBasicMaterial({ map: this.tex, toneMapped: false, side: THREE.DoubleSide }));
    this.mesh.visible = false;
    this.pokeCool = 0;
    this.draw();
  }

  unlocked(p) {
    if (p.id === "theatre") return !!this.state.done.courtyard;
    return CHAPTERS.indexOf(p) < this.state.unlocked;
  }
  // the chapter to play next (furthest unlocked, not yet finished)
  current() { return this.places.find((p) => p.id === this.state.at) || CHAPTERS[0]; }

  // start the tale again from the beginning (playbills and unlocked modes are kept)
  resetStory() {
    this.state = { unlocked: 1, done: {}, at: "courtyard" };
    story.save(this.state);
    const at = CHAPTERS[0];
    this.token.x = at.map[0]; this.token.y = at.map[1];
    this.draw();
  }
  hasProgress() { return Object.keys(this.state.done).length > 0 || this.state.at !== "courtyard"; }

  complete(id, entry) {
    const i = CHAPTERS.findIndex((c) => c.id === id);
    const before = this.state.unlocked;
    this.state.done[id] = { stars: entry?.stars || 3, ending: entry?.ending || "" };
    if (i >= 0) this.state.unlocked = Math.max(this.state.unlocked, Math.min(CHAPTERS.length, i + 2));
    story.save(this.state);
    this.draw();
    return { newChapter: this.state.unlocked > before, finished: Object.keys(this.state.done).filter((k) => k !== "theatre").length >= CHAPTERS.length };
  }

  show(xr = false) {
    this.open = true;
    this.xr = xr;
    this.el?.classList.toggle("on", !xr);
    this.mesh.visible = xr;
    this.draw();
  }
  hide() {
    this.open = false;
    this.el?.classList.remove("on");
    this.mesh.visible = false;
  }

  // while the token travels, the view leans in to follow it, then settles back
  _view() {
    const s = FIT * this.zoom;
    const vw = VIEW.w / s, vh = VIEW.h / s;
    const cx = Math.max(0, Math.min(WORLD.w - vw, this.token.x - vw / 2));
    const cy = Math.max(0, Math.min(WORLD.h - vh, this.token.y - vh / 2));
    return { s, cx: this.zoom === 1 ? 0 : cx, cy: this.zoom === 1 ? 0 : cy };
  }
  _placeAt(vx, vy) {
    const wx = vx / FIT, wy = vy / FIT;
    return this.places.find((p) => Math.hypot(p.map[0] - wx, p.map[1] - wy) < 80) || null;
  }

  // a click / poke at view coordinates
  pick(vx, vy) {
    if (this.travel) return;
    const p = this._placeAt(vx, vy);
    if (!p || !this.unlocked(p)) return;
    this.travelTo(p);
  }

  travelTo(p) {
    const from = { x: this.token.x, y: this.token.y };
    const to = { x: p.map[0], y: p.map[1] };
    // a gently curving road between the two places
    const mid = { x: (from.x + to.x) / 2 + (to.y - from.y) * 0.15, y: (from.y + to.y) / 2 - (to.x - from.x) * 0.15 };
    const dur = from.x === to.x && from.y === to.y ? 0.6 : 2.4;
    this.travel = { p, from, to, mid, t: 0, dur };
    this.onDepart?.(p);
  }

  // headset: poke the parchment with a fingertip (stage-space point)
  poke(tipWorld) {
    if (!this.mesh.visible || this.pokeCool > 0) return false;
    const local = this.mesh.worldToLocal(tipWorld.clone());
    if (Math.abs(local.z) > 0.02 || Math.abs(local.x) > 0.2 || Math.abs(local.y) > 0.125) return false;
    this.pokeCool = 0.8;
    this.pick((local.x / 0.4 + 0.5) * VIEW.w, (0.5 - local.y / 0.25) * VIEW.h);
    return true;
  }

  update(dt) {
    this.t += dt;
    if (this.pokeCool > 0) this.pokeCool -= dt;
    if (!this.open && !this.travel) return;
    if (this.travel) {
      const tr = this.travel;
      tr.t += dt;
      const k = Math.min(1, tr.t / tr.dur), e = k * k * (3 - 2 * k), u = 1 - e;
      this.token.x = u * u * tr.from.x + 2 * u * e * tr.mid.x + e * e * tr.to.x;
      this.token.y = u * u * tr.from.y + 2 * u * e * tr.mid.y + e * e * tr.to.y;
      this.zoom = 1 + 0.35 * Math.sin(k * Math.PI);
      if (k >= 1 && tr.t > tr.dur + 0.5) {
        this.travel = null;
        this.zoom = 1;
        this.state.at = tr.p.id;
        story.save(this.state);
        this.hide();
        this.onChoose?.(tr.p);
      }
    }
    // redraw at ~30 fps while open (pulses, the walking token)
    this._acc = (this._acc || 0) + dt;
    if (this._acc > (this.travel ? 1 / 30 : 1 / 15)) { this._acc = 0; this.draw(); }
  }

  // the kingdom, painted once: aged parchment, an ornate border, meadows, forests,
  // shaded mountains, a winding river, the sea, little villages, the road
  _paintParchment() {
    const c = document.createElement("canvas");
    c.width = WORLD.w; c.height = WORLD.h;
    const g = c.getContext("2d");
    const r = rnd(42);
    const W = WORLD.w, H = WORLD.h;
    const near = (x, y, pad = 0) => this.places.some((p) => Math.hypot(p.map[0] - x, p.map[1] - y) < 95 + pad || (Math.abs(p.map[0] - x) < 170 && y > p.map[1] + 40 && y < p.map[1] + 115));
    // paper: warm, lighter in the middle, with fibres and stains
    const pg = g.createRadialGradient(W / 2, H / 2, 100, W / 2, H / 2, W * 0.7);
    pg.addColorStop(0, "#f3e4bf"); pg.addColorStop(0.7, "#e6cf9c"); pg.addColorStop(1, "#c9a66a");
    g.fillStyle = pg; g.fillRect(0, 0, W, H);
    g.strokeStyle = "rgba(120,85,40,0.08)"; g.lineWidth = 1;
    for (let i = 0; i < 900; i++) { const x = r() * W, y = r() * H, l = 6 + r() * 26, a = r() * Math.PI; g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + Math.cos(a) * l * 0.5 + r() * 4, y + Math.sin(a) * l * 0.5, x + Math.cos(a) * l, y + Math.sin(a) * l); g.stroke(); }
    for (let i = 0; i < 14; i++) { const x = r() * W, y = r() * H, rr = 30 + r() * 90; const sg = g.createRadialGradient(x, y, rr * 0.2, x, y, rr); sg.addColorStop(0, "rgba(150,100,40,0.07)"); sg.addColorStop(0.8, "rgba(150,100,40,0.04)"); sg.addColorStop(1, "rgba(150,100,40,0)"); g.fillStyle = sg; g.beginPath(); g.arc(x, y, rr, 0, Math.PI * 2); g.fill(); }
    const blob = (x, y, rx, ry, col) => { const bg = g.createRadialGradient(x, y, 0, x, y, Math.max(rx, ry)); bg.addColorStop(0, col); bg.addColorStop(1, "rgba(0,0,0,0)"); g.save(); g.translate(x, y); g.scale(1, ry / rx); g.translate(-x, -y); g.fillStyle = bg; g.beginPath(); g.arc(x, y, rx, 0, Math.PI * 2); g.fill(); g.restore(); };
    // meadows and woodland tints
    blob(280, 800, 260, 170, "rgba(120,160,80,0.30)");
    blob(340, 260, 200, 120, "rgba(130,165,90,0.22)");
    blob(580, 540, 270, 170, "rgba(70,120,60,0.30)");
    blob(820, 640, 200, 130, "rgba(140,165,90,0.18)");
    blob(1080, 470, 160, 120, "rgba(120,150,80,0.18)");
    // the sea in the south-east: deep water, a lighter shore, waves, a serpent, a little ship
    g.save();
    g.beginPath(); g.moveTo(690, H); g.bezierCurveTo(740, 880, 860, 860, 960, 880); g.bezierCurveTo(1080, 900, 1150, 860, 1230, 870); g.bezierCurveTo(1340, 885, 1430, 800, W, 810); g.lineTo(W, H); g.closePath();
    const sea = g.createLinearGradient(0, 820, 0, H); sea.addColorStop(0, "rgba(90,150,180,0.55)"); sea.addColorStop(1, "rgba(40,95,140,0.7)");
    g.fillStyle = sea; g.fill();
    g.strokeStyle = "rgba(240,235,210,0.7)"; g.lineWidth = 6; g.stroke();
    g.strokeStyle = "rgba(60,100,130,0.55)"; g.lineWidth = 2; g.stroke();
    g.clip();
    g.strokeStyle = "rgba(235,240,245,0.55)"; g.lineWidth = 2;
    for (let i = 0; i < 60; i++) { const x = 720 + r() * 880, y = 880 + r() * 110; g.beginPath(); g.arc(x, y, 8, Math.PI * 1.15, Math.PI * 1.85); g.arc(x + 15, y, 8, Math.PI * 1.15, Math.PI * 1.85); g.stroke(); }
    // a friendly sea serpent
    g.strokeStyle = "#3d6e5a"; g.lineWidth = 9; g.lineCap = "round";
    for (const dx of [0, 46, 92]) { g.beginPath(); g.arc(1300 + dx, 950, 16, Math.PI, 0); g.stroke(); }
    g.fillStyle = "#3d6e5a"; g.beginPath(); g.ellipse(1418, 936, 14, 10, 0.4, 0, Math.PI * 2); g.fill();
    g.fillStyle = "#f4ead0"; g.beginPath(); g.arc(1423, 932, 2.5, 0, Math.PI * 2); g.fill();
    g.restore();
    // the river, from the northern hills down past the bridge to the sea
    const river = () => { g.beginPath(); g.moveTo(1050, 0); g.bezierCurveTo(1110, 160, 1260, 300, 1196, 450); g.bezierCurveTo(1140, 600, 1120, 740, 1160, 880); };
    g.lineCap = "round";
    river(); g.strokeStyle = "rgba(240,235,210,0.8)"; g.lineWidth = 22; g.stroke();
    river(); g.strokeStyle = "rgba(80,140,175,0.75)"; g.lineWidth = 13; g.stroke();
    river(); g.strokeStyle = "rgba(220,240,250,0.6)"; g.lineWidth = 3; g.setLineDash([14, 22]); g.stroke(); g.setLineDash([]);
    // mountains in the north-east, shaded, with snow caps
    const mountain = (x, y, s) => {
      g.fillStyle = "#b39a76"; g.beginPath(); g.moveTo(x - s, y); g.lineTo(x, y - s * 1.25); g.lineTo(x + s, y); g.closePath(); g.fill();
      g.fillStyle = "#8a7354"; g.beginPath(); g.moveTo(x, y - s * 1.25); g.lineTo(x + s, y); g.lineTo(x + s * 0.15, y); g.closePath(); g.fill();
      g.fillStyle = "#f6f1e4"; g.beginPath(); g.moveTo(x - s * 0.32, y - s * 0.85); g.lineTo(x, y - s * 1.25); g.lineTo(x + s * 0.32, y - s * 0.85); g.lineTo(x + s * 0.1, y - s * 0.92); g.lineTo(x - s * 0.05, y - s * 0.8); g.closePath(); g.fill();
      g.strokeStyle = "rgba(70,50,30,0.6)"; g.lineWidth = 2; g.beginPath(); g.moveTo(x - s, y); g.lineTo(x, y - s * 1.25); g.lineTo(x + s, y); g.stroke();
    };
    const peaks = [];
    for (let i = 0; i < 60 && peaks.length < 22; i++) { const x = 1150 + r() * 420, y = 120 + r() * 300, sz = 34 + r() * 30; if (!near(x, y - sz * 0.6, 10) && x < W - 70 && y > 90) peaks.push([x, y, sz]); }
    peaks.sort((a, b) => a[1] - b[1]).forEach(([x, y, sz]) => mountain(x, y, sz));
    // rolling hills here and there
    g.strokeStyle = "rgba(90,70,40,0.5)"; g.lineWidth = 2;
    for (let i = 0; i < 26; i++) { const x = 120 + r() * 1350, y = 120 + r() * 760; if (near(x, y, 30) || (x > 1100 && y < 420) || (x > 700 && y > 840)) continue; g.fillStyle = "rgba(150,170,100,0.35)"; g.beginPath(); g.ellipse(x, y, 26, 12, 0, Math.PI, 0); g.fill(); g.beginPath(); g.ellipse(x, y, 26, 12, 0, Math.PI, 0); g.stroke(); }
    // the forest: round-canopy trees and pines, with shadows
    const tree = (x, y, s, pine) => {
      g.fillStyle = "rgba(60,40,20,0.22)"; g.beginPath(); g.ellipse(x + 5, y + 3, 12 * s, 4 * s, 0, 0, Math.PI * 2); g.fill();
      g.fillStyle = "#6a4a2a"; g.fillRect(x - 2 * s, y - 10 * s, 4 * s, 10 * s);
      if (pine) { g.fillStyle = "#3f6a3a"; g.beginPath(); g.moveTo(x, y - 40 * s); g.lineTo(x - 13 * s, y - 8 * s); g.lineTo(x + 13 * s, y - 8 * s); g.closePath(); g.fill(); g.fillStyle = "#2f5530"; g.beginPath(); g.moveTo(x, y - 40 * s); g.lineTo(x + 13 * s, y - 8 * s); g.lineTo(x + 2 * s, y - 8 * s); g.closePath(); g.fill(); }
      else { g.fillStyle = "#4f7f42"; g.beginPath(); g.arc(x, y - 20 * s, 13 * s, 0, Math.PI * 2); g.fill(); g.fillStyle = "#3d6a35"; g.beginPath(); g.arc(x + 4 * s, y - 17 * s, 9 * s, 0, Math.PI * 2); g.fill(); g.fillStyle = "rgba(255,255,220,0.25)"; g.beginPath(); g.arc(x - 4 * s, y - 24 * s, 5 * s, 0, Math.PI * 2); g.fill(); }
      g.strokeStyle = "rgba(40,30,15,0.5)"; g.lineWidth = 1.2; g.stroke();
    };
    const trees = [];
    for (let i = 0; i < 400 && trees.length < 95; i++) { const a = r() * Math.PI * 2, d = Math.sqrt(r()); const x = 580 + Math.cos(a) * 240 * d, y = 530 + Math.sin(a) * 150 * d; if (!near(x, y, 0)) trees.push([x, y, 0.8 + r() * 0.5, r() < 0.45]); }
    for (let i = 0; i < 200 && trees.length < 130; i++) { const x = 100 + r() * 900, y = 150 + r() * 700; if (!near(x, y, 20) && !(x > 690 && y > 840) && r() < 0.5) trees.push([x, y, 0.7 + r() * 0.3, r() < 0.5]); }
    trees.sort((a, b) => a[1] - b[1]).forEach(([x, y, sz, pine]) => tree(x, y, sz, pine));
    // villages: cottages and a windmill near the castle, sheep in the meadow
    const cottage = (x, y) => { g.fillStyle = "#e8dcc0"; g.fillRect(x - 12, y - 14, 24, 14); g.fillStyle = "#a0402a"; g.beginPath(); g.moveTo(x - 15, y - 14); g.lineTo(x, y - 26); g.lineTo(x + 15, y - 14); g.closePath(); g.fill(); g.strokeStyle = "rgba(50,30,15,0.7)"; g.lineWidth = 1.5; g.strokeRect(x - 12, y - 14, 24, 14); g.fillStyle = "#5a3b22"; g.fillRect(x - 3, y - 8, 6, 8); };
    for (const [x, y] of [[150, 880], [190, 905], [400, 905], [440, 880], [120, 700]]) if (!near(x, y)) cottage(x, y);
    g.save(); g.translate(470, 700);
    g.fillStyle = "#d8c8a8"; g.beginPath(); g.moveTo(-10, 0); g.lineTo(-6, -36); g.lineTo(6, -36); g.lineTo(10, 0); g.closePath(); g.fill(); g.strokeStyle = "rgba(50,30,15,0.7)"; g.lineWidth = 1.5; g.stroke();
    g.strokeStyle = "#5a3b22"; g.lineWidth = 3; for (let k = 0; k < 4; k++) { const a = k * Math.PI / 2 + 0.4; g.beginPath(); g.moveTo(0, -34); g.lineTo(Math.cos(a) * 26, -34 + Math.sin(a) * 26); g.stroke(); }
    g.restore();
    g.fillStyle = "#f6f1e4";
    for (let i = 0; i < 9; i++) { const x = 330 + r() * 160, y = 720 + r() * 60; if (!near(x, y)) { g.beginPath(); g.ellipse(x, y, 5, 3.5, 0, 0, Math.PI * 2); g.fill(); } }
    // clouds and stars around the night sky (top middle)
    for (let i = 0; i < 40; i++) { const x = 620 + r() * 420, y = 40 + r() * 140; g.fillStyle = "rgba(90,70,120,0.55)"; g.font = "16px Georgia"; g.fillText("✦", x, y); }
    const cloud = (x, y, s) => { g.fillStyle = "rgba(250,248,240,0.85)"; g.strokeStyle = "rgba(90,80,70,0.5)"; g.lineWidth = 2; g.beginPath(); g.arc(x, y, 18 * s, Math.PI * 0.5, Math.PI * 1.5); g.arc(x + 22 * s, y - 12 * s, 20 * s, Math.PI, 0); g.arc(x + 46 * s, y - 4 * s, 16 * s, Math.PI * 1.2, Math.PI * 0.5); g.closePath(); g.fill(); g.stroke(); };
    cloud(600, 210, 1.1); cloud(990, 190, 1.2); cloud(180, 110, 0.9); cloud(1500, 60, 0.8);
    // the road: little stones along each leg of the journey, and a path to the theatre
    const stones = (pts, gap, size) => {
      for (let i = 1; i < pts.length; i++) {
        const [px, py] = pts[i - 1], [x, y] = pts[i];
        const cx = (px + x) / 2 + (y - py) * 0.15, cy = (py + y) / 2 - (x - px) * 0.15;
        const len = Math.hypot(x - px, y - py), n = Math.floor(len / gap);
        for (let k = 1; k < n; k++) {
          const t = k / n, u = 1 - t;
          const sx = u * u * px + 2 * u * t * cx + t * t * x, sy = u * u * py + 2 * u * t * cy + t * t * y;
          if (this.places.some((p) => Math.hypot(p.map[0] - sx, p.map[1] - sy) < 62)) continue;
          g.fillStyle = "rgba(110,80,45,0.75)"; g.beginPath(); g.ellipse(sx, sy, size, size * 0.7, (k % 3) * 0.6, 0, Math.PI * 2); g.fill();
        }
      }
    };
    stones(CHAPTERS.map((ch) => ch.map), 22, 5);
    stones([CHAPTERS[0].map, THEATRE.map], 18, 3.5);
    // an ornate compass rose and a scale bar
    g.save(); g.translate(1475, 875);
    g.fillStyle = "rgba(246,240,225,0.85)"; g.beginPath(); g.arc(0, 0, 58, 0, Math.PI * 2); g.fill();
    g.strokeStyle = "rgba(90,60,30,0.8)"; g.lineWidth = 2; g.beginPath(); g.arc(0, 0, 58, 0, Math.PI * 2); g.stroke(); g.beginPath(); g.arc(0, 0, 50, 0, Math.PI * 2); g.stroke();
    for (let k = 0; k < 8; k++) { g.save(); g.rotate((k * Math.PI) / 4); const L = k % 2 ? 34 : 52; g.fillStyle = k % 2 ? "#c9a14a" : "#7a1d22"; g.beginPath(); g.moveTo(0, -L); g.lineTo(7, 0); g.lineTo(0, 6); g.closePath(); g.fill(); g.fillStyle = k % 2 ? "#e8cf8a" : "#a0303a"; g.beginPath(); g.moveTo(0, -L); g.lineTo(-7, 0); g.lineTo(0, 6); g.closePath(); g.fill(); g.restore(); }
    g.fillStyle = "#3a2414"; g.font = "bold 20px Georgia, serif"; g.textAlign = "center"; g.fillText("N", 0, -64);
    g.restore();
    g.fillStyle = "rgba(58,36,20,0.8)"; g.fillRect(90, 948, 60, 6); g.fillStyle = "rgba(246,240,225,0.9)"; g.fillRect(150, 948, 60, 6); g.strokeStyle = "rgba(58,36,20,0.8)"; g.strokeRect(90, 948, 120, 6);
    g.font = "italic 16px Georgia, serif"; g.fillStyle = "#3a2414"; g.textAlign = "left"; g.fillText("one puppet's stride", 90, 940);
    // burnt edges and an ornate double border with corner flourishes
    const vg = g.createRadialGradient(W / 2, H / 2, H * 0.42, W / 2, H / 2, W * 0.66);
    vg.addColorStop(0, "rgba(0,0,0,0)"); vg.addColorStop(1, "rgba(100,55,15,0.5)");
    g.fillStyle = vg; g.fillRect(0, 0, W, H);
    g.strokeStyle = "#6a4422"; g.lineWidth = 5; g.strokeRect(26, 26, W - 52, H - 52);
    g.lineWidth = 1.5; g.strokeRect(38, 38, W - 76, H - 76);
    for (const [cx, cy, sx, sy] of [[38, 38, 1, 1], [W - 38, 38, -1, 1], [38, H - 38, 1, -1], [W - 38, H - 38, -1, -1]]) {
      g.save(); g.translate(cx, cy); g.scale(sx, sy);
      g.strokeStyle = "#6a4422"; g.lineWidth = 2.5;
      g.beginPath(); g.moveTo(0, 40); g.bezierCurveTo(0, 12, 12, 0, 40, 0); g.stroke();
      g.beginPath(); g.arc(18, 18, 9, 0, Math.PI * 2); g.stroke();
      g.fillStyle = "#c9a14a"; g.beginPath(); g.arc(18, 18, 4, 0, Math.PI * 2); g.fill();
      g.restore();
    }
    return c;
  }

  draw() {
    const g = this.g;
    const V = this._view();
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.fillStyle = "#ead7a8"; g.fillRect(0, 0, VIEW.w, VIEW.h);
    g.save();
    g.setTransform(V.s, 0, 0, V.s, -V.cx * V.s, -V.cy * V.s);
    g.drawImage(this.bg, 0, 0);
    const next = CHAPTERS.find((c, i) => i < this.state.unlocked && !this.state.done[c.id]);
    for (const p of this.places) {
      const [x, y] = p.map;
      const locked = !this.unlocked(p);
      if (p === next || (p.id === this.hover && !locked)) {
        const k = (this.t * 1.2) % 1;
        g.strokeStyle = `rgba(200,140,40,${0.8 * (1 - k)})`; g.lineWidth = 5;
        g.beginPath(); g.arc(x, y, 50 + k * 26, 0, Math.PI * 2); g.stroke();
      }
      // a soft shadow, then the place's picture (a little larger)
      g.fillStyle = "rgba(60,35,10,0.25)"; g.beginPath(); g.ellipse(x + 6, y + 26, 46, 12, 0, 0, Math.PI * 2); g.fill();
      g.save(); g.translate(x, y); g.scale(1.18, 1.18); icon(g, p.id, 0, 0, locked); g.restore();
      // its name on a ribbon banner, with a wax-seal number
      const n = CHAPTERS.indexOf(p);
      g.font = "600 26px Georgia, serif"; g.textAlign = "center";
      const tw = g.measureText(p.title).width + 56, by = y + 58;
      g.fillStyle = locked ? "rgba(150,130,100,0.8)" : "#8c2a2a";
      for (const sx of [-1, 1]) { g.beginPath(); g.moveTo(x + sx * (tw / 2 - 6), by - 14); g.lineTo(x + sx * (tw / 2 + 22), by - 14); g.lineTo(x + sx * (tw / 2 + 12), by); g.lineTo(x + sx * (tw / 2 + 22), by + 14); g.lineTo(x + sx * (tw / 2 - 6), by + 14); g.closePath(); g.fill(); }
      g.fillStyle = locked ? "rgba(225,212,185,0.95)" : "#f3e6c4";
      g.strokeStyle = locked ? "rgba(120,100,70,0.6)" : "#7a1d22"; g.lineWidth = 2;
      g.beginPath(); g.roundRect(x - tw / 2, by - 18, tw, 36, 6); g.fill(); g.stroke();
      g.fillStyle = locked ? "rgba(58,36,20,0.5)" : "#3a2414";
      g.fillText(p.title, x + (n >= 0 ? 10 : 0), by + 9);
      if (n >= 0) {
        g.fillStyle = locked ? "#8a7a6a" : "#a0242a"; g.beginPath(); g.arc(x - tw / 2 + 10, by, 17, 0, Math.PI * 2); g.fill();
        g.strokeStyle = "rgba(255,255,255,0.35)"; g.beginPath(); g.arc(x - tw / 2 + 10, by, 12, 0, Math.PI * 2); g.stroke();
        g.fillStyle = "#f8e8c8"; g.font = "bold 18px Georgia, serif"; g.fillText(String(n + 1), x - tw / 2 + 10, by + 6);
      }
      const done = this.state.done[p.id];
      if (done) { g.font = "24px Georgia, serif"; g.fillStyle = "#b8862a"; g.fillText("★".repeat(done.stars), x, by + 44); }
      else if (p.id === "theatre" && !locked) { g.font = "italic 17px Georgia, serif"; g.fillStyle = "#7a1d22"; g.fillText("a new show every night", x, by + 40); }
    }
    // the token: a little blue shield with Sir Pip's crest
    const bob = this.travel ? Math.abs(Math.sin(this.t * 10)) * 8 : Math.sin(this.t * 2) * 2;
    const tx = this.token.x, ty = this.token.y - 34 - bob;
    g.fillStyle = "rgba(0,0,0,0.25)"; g.beginPath(); g.ellipse(this.token.x, this.token.y - 6, 18, 6, 0, 0, Math.PI * 2); g.fill();
    g.beginPath(); g.moveTo(tx - 18, ty - 20); g.lineTo(tx + 18, ty - 20); g.lineTo(tx + 18, ty + 2); g.quadraticCurveTo(tx + 14, ty + 18, tx, ty + 26); g.quadraticCurveTo(tx - 14, ty + 18, tx - 18, ty + 2); g.closePath();
    g.fillStyle = "#1f4fa0"; g.fill(); g.lineWidth = 4; g.strokeStyle = "#d8ac4f"; g.stroke();
    g.fillStyle = "#d8ac4f"; g.font = "bold 22px Georgia, serif"; g.fillText("P", tx, ty + 8);
    g.restore();
    // title cartouche
    // (top-right, clear of the place names)
    const tx0 = VIEW.w - 350, tw0 = 320, ty0 = 30;
    g.fillStyle = "#5a1418";
    for (const sx of [-1, 1]) { const ex = sx < 0 ? tx0 : tx0 + tw0; g.beginPath(); g.moveTo(ex, ty0 + 8); g.lineTo(ex + sx * 30, ty0 + 8); g.lineTo(ex + sx * 18, ty0 + 26); g.lineTo(ex + sx * 30, ty0 + 44); g.lineTo(ex, ty0 + 44); g.closePath(); g.fill(); }
    g.fillStyle = "#8c1d24"; g.beginPath(); g.roundRect(tx0, ty0, tw0, 46, 6); g.fill();
    g.strokeStyle = "#d8ac4f"; g.lineWidth = 2; g.beginPath(); g.roundRect(tx0 + 5, ty0 + 5, tw0 - 10, 36, 4); g.stroke();
    g.fillStyle = "#f3dfb0"; g.font = "600 27px Georgia, serif"; g.textAlign = "center"; g.fillText("The Tale of Sir Pip", tx0 + tw0 / 2, ty0 + 32);
    if (!this.travel) { g.font = "italic 20px Georgia, serif"; g.fillStyle = "#3a2414"; g.fillText(this.xr ? "Poke a place to travel there" : "Choose where the story goes next", VIEW.w / 2, VIEW.h - 24); }
    this.tex && (this.tex.needsUpdate = true);
  }
}
