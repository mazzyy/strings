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

  _paintParchment() {
    const c = document.createElement("canvas");
    c.width = WORLD.w; c.height = WORLD.h;
    const g = c.getContext("2d");
    const r = rnd(42);
    g.fillStyle = "#ead7a8"; g.fillRect(0, 0, WORLD.w, WORLD.h);
    for (let i = 0; i < 2600; i++) { g.fillStyle = `rgba(${120 + r() * 60},${90 + r() * 40},${40 + r() * 30},${r() * 0.08})`; g.fillRect(r() * WORLD.w, r() * WORLD.h, 2 + r() * 6, 2 + r() * 6); }
    // sea in the south-east, with waves
    g.fillStyle = "rgba(90,140,170,0.35)"; g.beginPath(); g.moveTo(700, 1000); g.bezierCurveTo(760, 860, 1000, 880, 1120, 900); g.bezierCurveTo(1300, 920, 1400, 820, 1600, 840); g.lineTo(1600, 1000); g.fill();
    g.strokeStyle = "rgba(60,100,130,0.5)"; g.lineWidth = 2;
    for (let i = 0; i < 26; i++) { const x = 760 + r() * 800, y = 900 + r() * 90; g.beginPath(); g.arc(x, y, 9, Math.PI * 1.1, Math.PI * 1.9); g.stroke(); }
    // mountains in the north-east
    for (let i = 0; i < 14; i++) { const x = 980 + r() * 560, y = 120 + r() * 260, s = 40 + r() * 40; g.fillStyle = "rgba(120,100,80,0.35)"; g.strokeStyle = "rgba(70,50,30,0.6)"; g.beginPath(); g.moveTo(x - s, y + s * 0.6); g.lineTo(x, y - s * 0.8); g.lineTo(x + s, y + s * 0.6); g.closePath(); g.fill(); g.stroke(); }
    // woods around the forest
    for (let i = 0; i < 60; i++) { const x = 380 + r() * 400, y = 420 + r() * 260; g.fillStyle = "rgba(60,100,55,0.45)"; g.beginPath(); g.moveTo(x, y - 18); g.lineTo(x - 9, y + 6); g.lineTo(x + 9, y + 6); g.fill(); }
    // a river under the bridge
    g.strokeStyle = "rgba(80,130,170,0.55)"; g.lineWidth = 10; g.beginPath(); g.moveTo(1050, 0); g.bezierCurveTo(1150, 250, 1250, 420, 1180, 600); g.bezierCurveTo(1120, 760, 1150, 860, 1160, 900); g.stroke();
    // the road through every chapter, and a side path to the theatre
    const road = (pts, dash) => { g.strokeStyle = "rgba(90,60,30,0.75)"; g.lineWidth = 6; g.setLineDash(dash); g.beginPath(); g.moveTo(...pts[0]); for (let i = 1; i < pts.length; i++) { const [px, py] = pts[i - 1], [x, y] = pts[i]; g.quadraticCurveTo((px + x) / 2 + (y - py) * 0.15, (py + y) / 2 - (x - px) * 0.15, x, y); } g.stroke(); g.setLineDash([]); };
    road(CHAPTERS.map((c) => c.map), [18, 14]);
    road([CHAPTERS[0].map, THEATRE.map], [6, 10]);
    // compass rose
    g.save(); g.translate(1480, 880); g.fillStyle = "rgba(90,60,30,0.7)";
    for (let k = 0; k < 4; k++) { g.rotate(Math.PI / 2); g.beginPath(); g.moveTo(0, -46); g.lineTo(9, 0); g.lineTo(-9, 0); g.fill(); }
    g.font = "bold 22px Georgia, serif"; g.textAlign = "center"; g.fillText("N", 0, -54); g.restore();
    // burnt edges
    const vg = g.createRadialGradient(WORLD.w / 2, WORLD.h / 2, WORLD.h * 0.35, WORLD.w / 2, WORLD.h / 2, WORLD.w * 0.62);
    vg.addColorStop(0, "rgba(0,0,0,0)"); vg.addColorStop(1, "rgba(110,60,20,0.55)");
    g.fillStyle = vg; g.fillRect(0, 0, WORLD.w, WORLD.h);
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
      icon(g, p.id, x, y, locked);
      g.font = "600 30px Georgia, serif"; g.textAlign = "center";
      g.fillStyle = locked ? "rgba(58,36,20,0.45)" : "#3a2414";
      const n = CHAPTERS.indexOf(p);
      g.fillText(n >= 0 ? `${n + 1}. ${p.title}` : p.title, x, y + 62);
      const done = this.state.done[p.id];
      if (done) { g.font = "26px Georgia, serif"; g.fillStyle = "#b8862a"; g.fillText("★".repeat(done.stars), x, y + 90); }
      else if (p.id === "theatre" && !locked) { g.font = "italic 18px Georgia, serif"; g.fillStyle = "#7a1d22"; g.fillText("a new show every night", x, y + 86); }
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
    g.fillStyle = "rgba(122,29,34,0.92)"; g.beginPath(); g.roundRect(VIEW.w - 360, 16, 344, 52, 12); g.fill();
    g.strokeStyle = "#d8ac4f"; g.lineWidth = 3; g.stroke();
    g.fillStyle = "#f3dfb0"; g.font = "600 28px Georgia, serif"; g.textAlign = "center"; g.fillText("The Tale of Sir Pip", VIEW.w - 188, 51);
    if (!this.travel) { g.font = "italic 20px Georgia, serif"; g.fillStyle = "#3a2414"; g.fillText(this.xr ? "Poke a place to travel there" : "Choose where the story goes next", VIEW.w / 2, VIEW.h - 24); }
    this.tex && (this.tex.needsUpdate = true);
  }
}
