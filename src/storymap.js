// The storybook map: "The Tale of Sir Pip". A parchment map of the kingdom, laid out
// like a storybook board game: one winding road from the castle along the coast, up the
// river, and back west over the mountains to the night sky, with every stop in its own
// country (a forest round the forest, the sea under the ship, peaks round the cave, stars
// round the sky). Sir Pip's footprints mark the road he has travelled. Pick an unlocked
// place and a little shield token walks the road there while the map leans in to follow;
// then the curtain falls, the set changes and the next chapter begins.
//   Desktop: an overlay you click.  Headset: a parchment floating beside the
//   stage that you poke with a fingertip.
// The same canvas drawing serves both.
import * as THREE from "three";
import { CHAPTERS, THEATRE, chapterNumber } from "./lines.js";

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
  } else if (kind === "workshop") {
    // a crooked timber workshop, a smoking chimney, and a sign with a long-nosed puppet
    g.beginPath(); g.rect(-34, -26, 60, 46); fill("#c9a06a");
    g.strokeStyle = "rgba(90,55,25,0.55)"; g.lineWidth = 1.5; for (let yy = -18; yy < 20; yy += 8) { g.beginPath(); g.moveTo(-34, yy); g.lineTo(26, yy); g.stroke(); }
    g.strokeStyle = "#3a2414"; g.lineWidth = 3;
    g.beginPath(); g.rect(10, -60, 10, 22); fill("#8a5a3a");
    g.fillStyle = "rgba(120,110,100,0.55)"; for (const [dx, dy, r] of [[18, -70, 6], [24, -82, 8], [32, -96, 10]]) { g.beginPath(); g.arc(dx, dy, r, 0, Math.PI * 2); g.fill(); }
    g.beginPath(); g.moveTo(-42, -24); g.lineTo(-6, -56); g.lineTo(34, -24); g.closePath(); fill("#7a3a26");
    g.beginPath(); g.arc(-8, -36, 7, 0, Math.PI * 2); fill("#ffd77a");
    g.beginPath(); g.rect(-24, 0, 14, 20); fill("#5a3b22");
    g.beginPath(); g.moveTo(26, -8); g.lineTo(46, -8); g.stroke();
    g.beginPath(); g.rect(30, -6, 24, 20); fill("#f0dcae");
    g.beginPath(); g.arc(40, 4, 4.5, 0, Math.PI * 2); fill("#e2ab6c");
    g.beginPath(); g.moveTo(44, 3); g.lineTo(53, 2); g.stroke();
  } else if (kind === "laundry") {
    // two houses with a washing line between them, and a sock on it
    g.beginPath(); g.rect(-46, -30, 30, 50); fill("#f6f0e2"); g.beginPath(); g.moveTo(-50, -30); g.lineTo(-31, -48); g.lineTo(-12, -30); g.closePath(); fill("#c25a34");
    g.beginPath(); g.rect(16, -38, 30, 58); fill("#f2e2c4"); g.beginPath(); g.moveTo(12, -38); g.lineTo(31, -56); g.lineTo(50, -38); g.closePath(); fill("#c25a34");
    for (const wx of [-36, 26]) { g.beginPath(); g.rect(wx, -18, 10, 10); fill("#2f6ac8"); }
    g.beginPath(); g.moveTo(-16, -22); g.quadraticCurveTo(0, -12, 16, -24); g.stroke();
    g.beginPath(); g.moveTo(-6, -17); g.lineTo(-6, -4); g.quadraticCurveTo(-6, 2, 2, 2); g.lineTo(4, -4); g.lineTo(0, -4); g.lineTo(0, -17); g.closePath(); fill("#cbbd9c");
    g.fillStyle = "#d8322a"; g.fillRect(-6, -15, 6, 2); g.fillStyle = "#f0c030"; g.fillRect(-6, -12, 6, 2);
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

// where each place's name hangs: below its picture, or above it where below is busy
const LABEL_ABOVE = new Set(["forest"]);
const ROAD_W = 13;

export class StoryMap {
  constructor({ onChoose, isLocked }) {
    this.onChoose = onChoose;   // (place) => void, after the token arrives
    this.places = [...CHAPTERS, THEATRE];
    // the road: one smooth curve through every stop, in story order
    this.road = new THREE.CatmullRomCurve3(CHAPTERS.map((c) => new THREE.Vector3(c.map[0], c.map[1], 0)), false, "centripetal");
    this.roadPts = this.road.getSpacedPoints(600);
    this.canvas = document.createElement("canvas");
    this.canvas.width = VIEW.w; this.canvas.height = VIEW.h;
    this.g = this.canvas.getContext("2d");
    this.labels = this._layoutLabels();
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
    if (this.state.all) return true; // "play any chapter": everything open (for judges and the curious)
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
  unlockAll() {
    this.state.unlocked = CHAPTERS.length;
    this.state.all = true;
    story.save(this.state);
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
    return { newChapter: this.state.unlocked > before, finished: CHAPTERS.every((c) => this.state.done[c.id]) };
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
    let best = null, bd = 80;
    for (const p of this.places) {
      const d = Math.hypot(p.map[0] - wx, p.map[1] - wy);
      const L = this.labels.get(p.id), onLabel = L && wx > L.x - L.w / 2 - 20 && wx < L.x + L.w / 2 + 20 && Math.abs(wy - L.y) < 22;
      if (onLabel) return p; // (the name is a button too)
      if (d < bd) { bd = d; best = p; }
    }
    return best;
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
    // along the road when both ends are on it; otherwise (the theatre) a gentle curve
    const a = CHAPTERS.findIndex((c) => c.map[0] === from.x && c.map[1] === from.y), b = CHAPTERS.indexOf(p);
    const n = CHAPTERS.length - 1;
    const road = a >= 0 && b >= 0 ? [a / n, b / n] : null;
    const mid = { x: (from.x + to.x) / 2 + (to.y - from.y) * 0.15, y: (from.y + to.y) / 2 - (to.x - from.x) * 0.15 };
    const steps = road ? Math.abs(b - a) : 1;
    const dur = from.x === to.x && from.y === to.y ? 0.6 : Math.min(5, 1.6 + steps * 0.8);
    this.travel = { p, from, to, mid, road, t: 0, dur };
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
      if (tr.road) {
        const pt = this.road.getPoint(tr.road[0] + (tr.road[1] - tr.road[0]) * e);
        this.token.x = pt.x; this.token.y = pt.y;
      } else {
        this.token.x = u * u * tr.from.x + 2 * u * e * tr.mid.x + e * e * tr.to.x;
        this.token.y = u * u * tr.from.y + 2 * u * e * tr.mid.y + e * e * tr.to.y;
      }
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

  // where each name sits (and how wide it is), worked out once, so nothing overlaps and the
  // scenery keeps clear of them
  _layoutLabels() {
    const g = this.g, out = new Map();
    for (const p of this.places) {
      g.font = "600 23px Georgia, serif";
      const w = g.measureText(p.title).width + 64;
      const above = LABEL_ABOVE.has(p.id);
      out.set(p.id, { x: p.map[0] + 10, y: p.map[1] + (above ? -84 : 62), w, above });
    }
    return out;
  }
  _nearRoad(x, y, pad = 0) {
    for (let i = 0; i < this.roadPts.length; i += 3) { const q = this.roadPts[i]; if (Math.abs(q.x - x) < 40 + pad && Math.hypot(q.x - x, q.y - y) < 34 + pad) return true; }
    return false;
  }
  _clear(x, y, pad = 0) {
    if (this._nearRoad(x, y, pad)) return false;
    for (const p of this.places) if (Math.hypot(p.map[0] - x, p.map[1] - y) < 82 + pad) return false;
    for (const L of this.labels.values()) if (Math.abs(x - L.x) < L.w / 2 + 34 + pad && Math.abs(y - L.y) < 30 + pad + (L.above ? 0 : 26)) return false;
    return true;
  }

  // the kingdom, painted once: aged parchment and an ornate border; the sea along the
  // south-east coast, the river from the northern peaks down to the harbour; a forest round
  // the forest, mountains round the cave, stars round the night sky, a village by the castle;
  // and the road, winding through all of it
  _paintParchment() {
    const c = document.createElement("canvas");
    c.width = WORLD.w; c.height = WORLD.h;
    const g = c.getContext("2d");
    const r = rnd(42);
    const W = WORLD.w, H = WORLD.h;
    const clear = (x, y, pad) => this._clear(x, y, pad);
    // paper: warm, lighter in the middle, with fibres and stains
    const pg = g.createRadialGradient(W / 2, H / 2, 100, W / 2, H / 2, W * 0.7);
    pg.addColorStop(0, "#f3e4bf"); pg.addColorStop(0.7, "#e6cf9c"); pg.addColorStop(1, "#c9a66a");
    g.fillStyle = pg; g.fillRect(0, 0, W, H);
    g.strokeStyle = "rgba(120,85,40,0.08)"; g.lineWidth = 1;
    for (let i = 0; i < 900; i++) { const x = r() * W, y = r() * H, l = 6 + r() * 26, a = r() * Math.PI; g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + Math.cos(a) * l * 0.5 + r() * 4, y + Math.sin(a) * l * 0.5, x + Math.cos(a) * l, y + Math.sin(a) * l); g.stroke(); }
    for (let i = 0; i < 14; i++) { const x = r() * W, y = r() * H, rr = 30 + r() * 90; const sg = g.createRadialGradient(x, y, rr * 0.2, x, y, rr); sg.addColorStop(0, "rgba(150,100,40,0.07)"); sg.addColorStop(0.8, "rgba(150,100,40,0.04)"); sg.addColorStop(1, "rgba(150,100,40,0)"); g.fillStyle = sg; g.beginPath(); g.arc(x, y, rr, 0, Math.PI * 2); g.fill(); }
    const blob = (x, y, rx, ry, col) => { const bg = g.createRadialGradient(x, y, 0, x, y, Math.max(rx, ry)); bg.addColorStop(0, col); bg.addColorStop(1, "rgba(0,0,0,0)"); g.save(); g.translate(x, y); g.scale(1, ry / rx); g.translate(-x, -y); g.fillStyle = bg; g.beginPath(); g.arc(x, y, rx, 0, Math.PI * 2); g.fill(); g.restore(); };
    // each country's own wash of colour: meadows by the castle, deep green in the forest,
    // grey-blue round the peaks, indigo dusk round the night sky
    blob(240, 780, 300, 190, "rgba(120,160,80,0.30)");
    blob(470, 690, 230, 150, "rgba(60,110,55,0.30)");
    blob(700, 520, 260, 140, "rgba(140,165,90,0.18)");
    blob(1060, 520, 220, 140, "rgba(140,165,90,0.18)");
    blob(680, 230, 300, 150, "rgba(120,110,140,0.20)");
    blob(380, 150, 300, 160, "rgba(60,60,130,0.22)");

    // the sea along the south-east coast: deep water, a pale shore, waves, a serpent
    // (a bay comes up to meet the pirate ship's pier)
    const shore = [[700, H], [770, 930], [840, 880], [905, 838], [1000, 834], [1075, 872], [1180, 858], [1300, 838], [1420, 786], [1520, 706], [W, 672]];
    const seaPath = () => {
      g.beginPath(); g.moveTo(shore[0][0], shore[0][1]);
      for (let i = 1; i < shore.length; i++) { const [x0, y0] = shore[i - 1], [x1, y1] = shore[i]; g.quadraticCurveTo(x0, y0, (x0 + x1) / 2, (y0 + y1) / 2); }
      g.lineTo(W, 672); g.lineTo(W, H); g.closePath();
    };
    g.save();
    seaPath();
    const sea = g.createLinearGradient(0, 700, 0, H); sea.addColorStop(0, "rgba(90,150,180,0.55)"); sea.addColorStop(1, "rgba(40,95,140,0.75)");
    g.fillStyle = sea; g.fill();
    g.strokeStyle = "rgba(240,235,210,0.75)"; g.lineWidth = 7; g.stroke();
    g.strokeStyle = "rgba(60,100,130,0.55)"; g.lineWidth = 2; g.stroke();
    g.clip();
    g.strokeStyle = "rgba(235,240,245,0.55)"; g.lineWidth = 2;
    for (let i = 0; i < 70; i++) { const x = 760 + r() * 840, y = 700 + r() * 290; if (!clear(x, y, -20)) continue; g.beginPath(); g.arc(x, y, 8, Math.PI * 1.15, Math.PI * 1.85); g.arc(x + 15, y, 8, Math.PI * 1.15, Math.PI * 1.85); g.stroke(); }
    g.strokeStyle = "#3d6e5a"; g.lineWidth = 9; g.lineCap = "round";
    for (const dx of [0, 46, 92]) { g.beginPath(); g.arc(1290 + dx, 950, 16, Math.PI, 0); g.stroke(); }
    g.fillStyle = "#3d6e5a"; g.beginPath(); g.ellipse(1408, 936, 14, 10, 0.4, 0, Math.PI * 2); g.fill();
    g.fillStyle = "#f4ead0"; g.beginPath(); g.arc(1413, 932, 2.5, 0, Math.PI * 2); g.fill();
    g.restore();
    // the river: from the northern peaks, under the troll bridge, out into the harbour
    const river = () => { g.beginPath(); g.moveTo(1420, 0); g.bezierCurveTo(1380, 140, 1300, 300, 1290, 520); g.bezierCurveTo(1282, 660, 1250, 760, 1250, 850); };
    g.lineCap = "round";
    river(); g.strokeStyle = "rgba(240,235,210,0.8)"; g.lineWidth = 22; g.stroke();
    river(); g.strokeStyle = "rgba(80,140,175,0.75)"; g.lineWidth = 13; g.stroke();
    river(); g.strokeStyle = "rgba(220,240,250,0.6)"; g.lineWidth = 3; g.setLineDash([14, 22]); g.stroke(); g.setLineDash([]);

    // rolling hills in the open country
    g.strokeStyle = "rgba(90,70,40,0.5)"; g.lineWidth = 2;
    for (let i = 0; i < 44; i++) { const x = 120 + r() * 1350, y = 120 + r() * 760; if (!clear(x, y, 8) || (x > 1100 && y < 420) || y > 840) continue; g.fillStyle = "rgba(150,170,100,0.35)"; g.beginPath(); g.ellipse(x, y, 26, 12, 0, Math.PI, 0); g.fill(); g.beginPath(); g.ellipse(x, y, 26, 12, 0, Math.PI, 0); g.stroke(); }
    // mountains round the dragon's cave, and the river's source in the north-east: drawn like
    // an engraved storybook map. Each peak has its own shape (a skewed summit, a notch on one
    // slope, a shoulder on the other), a sunlit west face and a shaded east face split by a
    // jagged ridge, hatching in the shade, a snowcap with a ragged edge, and scree at its foot.
    // The far rows are paler (a little haze), the near rows sit on green foothills.
    const mountain = (x, y, s, far, seed) => {
      const q = rnd(seed);
      const h = s * (1.6 + q() * 0.45), skew = (q() - 0.5) * s * 0.36;
      const px = x + skew, py = y - h;
      const left = [[x - s, y], [x - s * 0.62, y - h * (0.38 + q() * 0.08)], [x - s * 0.5, y - h * 0.44], [x - s * 0.28 + skew * 0.4, y - h * 0.7], [px, py]];
      const shY = 0.52 + q() * 0.14;
      const right = [[px, py], [px + s * 0.22, y - h * (shY + 0.12)], [x + s * 0.36 + skew * 0.3, y - h * shY], [x + s * 0.48, y - h * (shY - 0.05)], [x + s, y]];
      const ridge = [[px, py], [px + s * 0.06, y - h * 0.72], [px + s * 0.02 + 4, y - h * 0.5], [x + s * 0.16 + skew * 0.3, y - h * 0.26], [x + s * 0.22, y]];
      const poly = (pts) => { g.beginPath(); pts.forEach(([a, b], i) => (i ? g.lineTo(a, b) : g.moveTo(a, b))); g.closePath(); };
      const lit = far ? "#d6c3a0" : "#d2b187", lit2 = far ? "#c4ae8a" : "#b08c5e", shade = far ? "#a38f72" : "#7f6043", ink = far ? "rgba(95,75,50,0.55)" : "rgba(52,34,20,0.9)";
      // the sunlit face, darker towards the foot
      poly([...left, ...right.slice(1)]);
      const lg = g.createLinearGradient(0, py, 0, y); lg.addColorStop(0, lit); lg.addColorStop(1, lit2);
      g.fillStyle = lg; g.fill();
      // the shaded face, east of the ridge
      poly([...right, ...[...ridge].reverse().slice(0, -1)]);
      g.fillStyle = shade; g.fill();
      // hatching in the shade, following the slope
      g.save(); poly([...right, ...[...ridge].reverse().slice(0, -1)]); g.clip();
      g.strokeStyle = far ? "rgba(90,70,50,0.25)" : "rgba(60,40,25,0.35)"; g.lineWidth = 1.2;
      for (let k = 0; k < 9; k++) { const t = 0.22 + k * 0.09, ax = px + (x + s - px) * t, ay = py + (y - py) * t; g.beginPath(); g.moveTo(ax, ay); g.lineTo(ax - s * 0.28, ay + s * 0.42); g.stroke(); }
      g.restore();
      // gullies down the sunlit face
      g.strokeStyle = far ? "rgba(110,85,55,0.25)" : "rgba(90,62,38,0.4)"; g.lineWidth = 1.1;
      for (let k = 0; k < 3; k++) { const t = 0.35 + k * 0.17, ax = px + (left[0][0] - px) * t * 0.55, ay = py + h * t * 0.75; g.beginPath(); g.moveTo(ax, ay); g.quadraticCurveTo(ax - s * 0.05, ay + h * 0.12, ax - s * 0.12 + q() * 4, ay + h * 0.24); g.stroke(); }
      // the snowcap: everything above a ragged line about half way down, cut to the peak's own
      // shape; its east side (beyond the ridge) in blue shadow
      const sy = py + h * (0.46 + q() * 0.1);
      const snow = () => { g.beginPath(); g.moveTo(x - s * 1.2, py - 20); g.lineTo(x + s * 1.2, py - 20); for (let k = 8; k >= 0; k--) { const t = k / 8, xx = x - s * 1.2 + t * s * 2.4; g.lineTo(xx, sy + (k % 2 ? -h * 0.13 : h * 0.03) + (sd[k] - 0.5) * 6); } g.closePath(); };
      const sd = Array.from({ length: 9 }, () => q());
      g.save(); poly([...left, ...right.slice(1)]); g.clip();
      snow(); g.fillStyle = "#fbf8f1"; g.fill();
      snow(); g.clip();
      poly([...right, ...[...ridge].reverse().slice(0, -1)]); g.fillStyle = "rgba(150,172,200,0.75)"; g.fill();
      g.restore();
      // the outline, and the ridge line
      poly([...left, ...right.slice(1)]); g.strokeStyle = ink; g.lineWidth = far ? 1.4 : 2.2; g.stroke();
      g.beginPath(); ridge.forEach(([a, b], i) => (i ? g.lineTo(a, b) : g.moveTo(a, b))); g.lineWidth = far ? 1 : 1.5; g.stroke();
      // scree at the foot
      if (!far) { g.fillStyle = "rgba(90,70,45,0.45)"; for (let k = 0; k < 5; k++) { g.beginPath(); g.arc(x - s * 0.6 + q() * s * 1.2, y - 2 - q() * 5, 1.4 + q() * 1.4, 0, Math.PI * 2); g.fill(); } }
    };
    // ranges in rows, back (higher on the page, larger, hazier) to front (lower, on foothills)
    const range = (x0, x1, rows, seed) => {
      const q = rnd(seed), peaks = [];
      rows.forEach(([y, s0, s1, far, gap], row) => {
        for (let x = x0 + q() * gap; x < x1; x += gap * (0.75 + q() * 0.5)) {
          const yy = y + (q() - 0.5) * 18, sz = s0 + q() * (s1 - s0);
          if (clear(x, yy - sz * 0.7, 2) && clear(x, yy, -12)) peaks.push([x, yy, sz, far, row * 1000 + Math.floor(x)]);
        }
      });
      // foothills under the front row
      g.fillStyle = "rgba(140,150,95,0.35)";
      for (const [x, y, sz, far] of peaks) if (!far && clear(x, y + 6, -16)) { g.beginPath(); g.ellipse(x, y + 2, sz * 1.3, sz * 0.32, 0, Math.PI, 0); g.fill(); }
      peaks.sort((a, b) => a[1] - b[1]).forEach(([x, y, sz, far, sd]) => mountain(x, y, sz, far, sd + seed));
    };
    range(545, 960, [[172, 50, 64, true, 72], [236, 40, 52, false, 66], [296, 28, 36, false, 58]], 11);
    range(1350, 1560, [[156, 46, 58, true, 70], [246, 38, 48, false, 64], [336, 30, 40, false, 56], [418, 24, 32, false, 56]], 23);
    // the forest: round-canopy trees and pines, thick round the forest and thinning out
    const tree = (x, y, s, pine) => {
      g.fillStyle = "rgba(60,40,20,0.22)"; g.beginPath(); g.ellipse(x + 5, y + 3, 12 * s, 4 * s, 0, 0, Math.PI * 2); g.fill();
      g.fillStyle = "#6a4a2a"; g.fillRect(x - 2 * s, y - 10 * s, 4 * s, 10 * s);
      if (pine) { g.fillStyle = "#3f6a3a"; g.beginPath(); g.moveTo(x, y - 40 * s); g.lineTo(x - 13 * s, y - 8 * s); g.lineTo(x + 13 * s, y - 8 * s); g.closePath(); g.fill(); g.fillStyle = "#2f5530"; g.beginPath(); g.moveTo(x, y - 40 * s); g.lineTo(x + 13 * s, y - 8 * s); g.lineTo(x + 2 * s, y - 8 * s); g.closePath(); g.fill(); }
      else { g.fillStyle = "#4f7f42"; g.beginPath(); g.arc(x, y - 20 * s, 13 * s, 0, Math.PI * 2); g.fill(); g.fillStyle = "#3d6a35"; g.beginPath(); g.arc(x + 4 * s, y - 17 * s, 9 * s, 0, Math.PI * 2); g.fill(); g.fillStyle = "rgba(255,255,220,0.25)"; g.beginPath(); g.arc(x - 4 * s, y - 24 * s, 5 * s, 0, Math.PI * 2); g.fill(); }
      g.strokeStyle = "rgba(40,30,15,0.5)"; g.lineWidth = 1.2; g.stroke();
    };
    const trees = [];
    for (let i = 0; i < 900 && trees.length < 70; i++) { const a = r() * Math.PI * 2, d = Math.sqrt(r()); const x = 470 + Math.cos(a) * 210 * d, y = 700 + Math.sin(a) * 120 * d; if (clear(x, y - 18, 2)) trees.push([x, y, 0.75 + r() * 0.45, r() < 0.5]); }
    for (let i = 0; i < 300 && trees.length < 96; i++) { const x = 90 + r() * 1100, y = 300 + r() * 520; if (clear(x, y - 18, 16) && !(x > 760 && y > 820) && r() < 0.4) trees.push([x, y, 0.7 + r() * 0.3, r() < 0.5]); }
    trees.sort((a, b) => a[1] - b[1]).forEach(([x, y, sz, pine]) => tree(x, y, sz, pine));
    // the village by the castle: cottages, a windmill, sheep in the meadow
    const cottage = (x, y) => { g.fillStyle = "#e8dcc0"; g.fillRect(x - 12, y - 14, 24, 14); g.fillStyle = "#a0402a"; g.beginPath(); g.moveTo(x - 15, y - 14); g.lineTo(x, y - 26); g.lineTo(x + 15, y - 14); g.closePath(); g.fill(); g.strokeStyle = "rgba(50,30,15,0.7)"; g.lineWidth = 1.5; g.strokeRect(x - 12, y - 14, 24, 14); g.fillStyle = "#5a3b22"; g.fillRect(x - 3, y - 8, 6, 8); };
    for (const [x, y] of [[80, 700], [110, 735], [390, 930], [430, 905], [70, 905], [355, 800]]) if (clear(x, y, -14)) cottage(x, y);
    g.save(); g.translate(120, 640);
    g.fillStyle = "#d8c8a8"; g.beginPath(); g.moveTo(-10, 0); g.lineTo(-6, -36); g.lineTo(6, -36); g.lineTo(10, 0); g.closePath(); g.fill(); g.strokeStyle = "rgba(50,30,15,0.7)"; g.lineWidth = 1.5; g.stroke();
    g.strokeStyle = "#5a3b22"; g.lineWidth = 3; for (let k = 0; k < 4; k++) { const a = k * Math.PI / 2 + 0.4; g.beginPath(); g.moveTo(0, -34); g.lineTo(Math.cos(a) * 26, -34 + Math.sin(a) * 26); g.stroke(); }
    g.restore();
    g.fillStyle = "#f6f1e4";
    for (let i = 0; i < 9; i++) { const x = 300 + r() * 120, y = 600 + r() * 50; if (clear(x, y, -20)) { g.beginPath(); g.ellipse(x, y, 5, 3.5, 0, 0, Math.PI * 2); g.fill(); } }
    // the night sky's country: stars, a crescent moon, and wisps of cloud
    for (let i = 0; i < 70; i++) { const x = 140 + r() * 400, y = 50 + r() * 250; if (!clear(x, y, -24)) continue; g.fillStyle = `rgba(80,70,140,${0.45 + r() * 0.4})`; g.font = `${12 + r() * 10}px Georgia`; g.fillText("✦", x, y); }
    g.fillStyle = "#f6f0d0"; g.beginPath(); g.arc(150, 120, 30, 0, Math.PI * 2); g.fill(); g.fillStyle = "rgba(232,214,176,1)"; g.beginPath(); g.arc(163, 112, 26, 0, Math.PI * 2); g.fill();
    g.strokeStyle = "rgba(90,70,40,0.6)"; g.lineWidth = 2; g.beginPath(); g.arc(150, 120, 30, 0, Math.PI * 2); g.stroke();
    const cloud = (x, y, s) => { g.fillStyle = "rgba(250,248,240,0.85)"; g.strokeStyle = "rgba(90,80,70,0.5)"; g.lineWidth = 2; g.beginPath(); g.arc(x, y, 18 * s, Math.PI * 0.5, Math.PI * 1.5); g.arc(x + 22 * s, y - 12 * s, 20 * s, Math.PI, 0); g.arc(x + 46 * s, y - 4 * s, 16 * s, Math.PI * 1.2, Math.PI * 0.5); g.closePath(); g.fill(); g.stroke(); };
    cloud(150, 300, 0.9); cloud(1040, 120, 1.1); cloud(820, 70, 0.8);
    // a storm cloud over the clockwork tower, raining a little
    cloud(1060, 350, 0.8); g.strokeStyle = "rgba(80,110,150,0.6)"; g.lineWidth = 2; for (let k = 0; k < 5; k++) { g.beginPath(); g.moveTo(1066 + k * 9, 362); g.lineTo(1060 + k * 9, 380); g.stroke(); }

    // the road: a sandy track with a dark edge and worn stones, under everything that stands on it
    const pts = this.roadPts;
    const trace = () => { g.beginPath(); pts.forEach((q, i) => (i ? g.lineTo(q.x, q.y) : g.moveTo(q.x, q.y))); };
    g.lineCap = "round"; g.lineJoin = "round";
    trace(); g.strokeStyle = "rgba(110,80,45,0.55)"; g.lineWidth = ROAD_W + 5; g.stroke();
    trace(); g.strokeStyle = "#e9d3a2"; g.lineWidth = ROAD_W; g.stroke();
    trace(); g.strokeStyle = "rgba(150,115,70,0.55)"; g.lineWidth = 2; g.setLineDash([3, 11]); g.stroke(); g.setLineDash([]);
    // where the road runs out over the water it becomes a wooden pier, out to the pirate ship
    g.save(); seaPath(); g.clip();
    trace(); g.strokeStyle = "#5a3a22"; g.lineWidth = ROAD_W + 6; g.stroke();
    trace(); g.strokeStyle = "#a8774a"; g.lineWidth = ROAD_W + 2; g.stroke();
    trace(); g.strokeStyle = "rgba(60,35,15,0.8)"; g.lineWidth = ROAD_W + 2; g.setLineDash([2, 7]); g.stroke(); g.setLineDash([]);
    g.restore();
    // a little footpath from the castle to the Grand Theatre
    const [tx, ty] = THEATRE.map, [cx, cy] = CHAPTERS[0].map;
    g.strokeStyle = "rgba(110,80,45,0.6)"; g.lineWidth = 3; g.setLineDash([2, 9]);
    g.beginPath(); g.moveTo(cx - 6, cy - 40); g.quadraticCurveTo(cx - 70, (cy + ty) / 2, tx, ty + 30); g.stroke(); g.setLineDash([]);
    // an ornate compass rose in the sea, and a scale bar
    g.save(); g.translate(1490, 890);
    g.fillStyle = "rgba(246,240,225,0.85)"; g.beginPath(); g.arc(0, 0, 52, 0, Math.PI * 2); g.fill();
    g.strokeStyle = "rgba(90,60,30,0.8)"; g.lineWidth = 2; g.beginPath(); g.arc(0, 0, 52, 0, Math.PI * 2); g.stroke(); g.beginPath(); g.arc(0, 0, 45, 0, Math.PI * 2); g.stroke();
    for (let k = 0; k < 8; k++) { g.save(); g.rotate((k * Math.PI) / 4); const L = k % 2 ? 30 : 46; g.fillStyle = k % 2 ? "#c9a14a" : "#7a1d22"; g.beginPath(); g.moveTo(0, -L); g.lineTo(6, 0); g.lineTo(0, 5); g.closePath(); g.fill(); g.fillStyle = k % 2 ? "#e8cf8a" : "#a0303a"; g.beginPath(); g.moveTo(0, -L); g.lineTo(-6, 0); g.lineTo(0, 5); g.closePath(); g.fill(); g.restore(); }
    g.fillStyle = "#3a2414"; g.font = "bold 18px Georgia, serif"; g.textAlign = "center"; g.fillText("N", 0, -58);
    g.restore();
    g.fillStyle = "rgba(58,36,20,0.8)"; g.fillRect(90, 958, 60, 6); g.fillStyle = "rgba(246,240,225,0.9)"; g.fillRect(150, 958, 60, 6); g.strokeStyle = "rgba(58,36,20,0.8)"; g.strokeRect(90, 958, 120, 6);
    g.font = "italic 16px Georgia, serif"; g.fillStyle = "#3a2414"; g.textAlign = "left"; g.fillText("one puppet's stride", 90, 950);
    // burnt edges and an ornate double border with corner flourishes
    const vg = g.createRadialGradient(W / 2, H / 2, H * 0.42, W / 2, H / 2, W * 0.66);
    vg.addColorStop(0, "rgba(0,0,0,0)"); vg.addColorStop(1, "rgba(100,55,15,0.5)");
    g.fillStyle = vg; g.fillRect(0, 0, W, H);
    g.strokeStyle = "#6a4422"; g.lineWidth = 5; g.strokeRect(26, 26, W - 52, H - 52);
    g.lineWidth = 1.5; g.strokeRect(38, 38, W - 76, H - 76);
    for (const [cx2, cy2, sx, sy] of [[38, 38, 1, 1], [W - 38, 38, -1, 1], [38, H - 38, 1, -1], [W - 38, H - 38, -1, -1]]) {
      g.save(); g.translate(cx2, cy2); g.scale(sx, sy);
      g.strokeStyle = "#6a4422"; g.lineWidth = 2.5;
      g.beginPath(); g.moveTo(0, 40); g.bezierCurveTo(0, 12, 12, 0, 40, 0); g.stroke();
      g.beginPath(); g.arc(18, 18, 9, 0, Math.PI * 2); g.stroke();
      g.fillStyle = "#c9a14a"; g.beginPath(); g.arc(18, 18, 4, 0, Math.PI * 2); g.fill();
      g.restore();
    }
    return c;
  }

  // Sir Pip's footprints along the stretch of road between two stops
  _footprints(g, a, b) {
    const n = CHAPTERS.length - 1, steps = 26;
    for (let k = 1; k < steps; k++) {
      const t = (a + (b - a) * (k / steps)) / n, p = this.road.getPoint(t), q = this.road.getTangent(t);
      const ang = Math.atan2(q.y, q.x), side = k % 2 ? 1 : -1;
      g.save(); g.translate(p.x - Math.sin(ang) * side * 3.2, p.y + Math.cos(ang) * side * 3.2); g.rotate(ang);
      g.fillStyle = "rgba(122,29,34,0.75)"; g.beginPath(); g.ellipse(0, 0, 4.2, 2.3, 0, 0, Math.PI * 2); g.fill();
      g.restore();
    }
  }

  draw() {
    const g = this.g;
    const V = this._view();
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.fillStyle = "#ead7a8"; g.fillRect(0, 0, VIEW.w, VIEW.h);
    g.save();
    g.setTransform(V.s, 0, 0, V.s, -V.cx * V.s, -V.cy * V.s);
    g.drawImage(this.bg, 0, 0);
    // the road travelled so far, in footprints
    for (let i = 0; i + 1 < CHAPTERS.length; i++) {
      const a = CHAPTERS[i], b = CHAPTERS[i + 1];
      if (this.state.done[a.id] && (this.state.done[b.id] || this.state.at === b.id)) this._footprints(g, i, i + 1);
    }
    const next = CHAPTERS.find((c, i) => i < this.state.unlocked && !this.state.done[c.id]);
    for (const p of this.places) {
      const [x, y] = p.map;
      const locked = !this.unlocked(p);
      const L = this.labels.get(p.id);
      if (p === next || (p.id === this.hover && !locked)) {
        const k = (this.t * 1.2) % 1;
        g.strokeStyle = `rgba(200,140,40,${0.8 * (1 - k)})`; g.lineWidth = 5;
        g.beginPath(); g.arc(x, y, 48 + k * 24, 0, Math.PI * 2); g.stroke();
      }
      // a soft shadow, then the place's picture
      const sc = 1.08;
      g.fillStyle = "rgba(60,35,10,0.25)"; g.beginPath(); g.ellipse(x + 6, y + 26 * sc, 44 * sc, 11 * sc, 0, 0, Math.PI * 2); g.fill();
      g.save(); g.translate(x, y); g.scale(sc, sc); icon(g, p.id, 0, 0, locked); g.restore();
      // its name: a red ribbon with a wax-seal number (the theatre's has none)
      const n = chapterNumber(p) - 1;
      const by = L.y, tw = L.w;
      g.textAlign = "center";
      {
        g.font = "600 23px Georgia, serif";
        g.fillStyle = locked ? "rgba(150,130,100,0.8)" : "#8c2a2a";
        for (const sx of [-1, 1]) { g.beginPath(); g.moveTo(L.x + sx * (tw / 2 - 6), by - 13); g.lineTo(L.x + sx * (tw / 2 + 18), by - 13); g.lineTo(L.x + sx * (tw / 2 + 9), by); g.lineTo(L.x + sx * (tw / 2 + 18), by + 13); g.lineTo(L.x + sx * (tw / 2 - 6), by + 13); g.closePath(); g.fill(); }
        g.fillStyle = locked ? "rgba(225,212,185,0.95)" : "#f3e6c4";
        g.strokeStyle = locked ? "rgba(120,100,70,0.6)" : "#7a1d22"; g.lineWidth = 2;
        g.beginPath(); g.roundRect(L.x - tw / 2, by - 17, tw, 34, 6); g.fill(); g.stroke();
        g.fillStyle = locked ? "rgba(58,36,20,0.5)" : "#3a2414";
        g.fillText(p.title, L.x + (n >= 0 ? 12 : 0), by + 8);
        if (n >= 0) {
          g.fillStyle = locked ? "#8a7a6a" : "#a0242a"; g.beginPath(); g.arc(L.x - tw / 2 + 12, by, 16, 0, Math.PI * 2); g.fill();
          g.strokeStyle = "rgba(255,255,255,0.35)"; g.beginPath(); g.arc(L.x - tw / 2 + 12, by, 11, 0, Math.PI * 2); g.stroke();
          g.fillStyle = "#f8e8c8"; g.font = "bold 17px Georgia, serif"; g.fillText(String(n + 1), L.x - tw / 2 + 12, by + 6);
        }
        if (p.id === "theatre" && !locked) { g.font = "italic 16px Georgia, serif"; g.fillStyle = "#7a1d22"; g.fillText("a new show every night", L.x, by + 36); }
      }
      const done = this.state.done[p.id];
      if (done) { g.font = "22px Georgia, serif"; g.fillStyle = "#b8862a"; g.fillText("★".repeat(done.stars), L.x, L.above ? by - 24 : by + 40); }
    }
    // the token: a little blue shield with Sir Pip's crest
    const bob = this.travel ? Math.abs(Math.sin(this.t * 10)) * 8 : Math.sin(this.t * 2) * 2;
    const tx = this.token.x, ty = this.token.y - 34 - bob;
    g.fillStyle = "rgba(0,0,0,0.25)"; g.beginPath(); g.ellipse(this.token.x, this.token.y - 6, 18, 6, 0, 0, Math.PI * 2); g.fill();
    g.beginPath(); g.moveTo(tx - 18, ty - 20); g.lineTo(tx + 18, ty - 20); g.lineTo(tx + 18, ty + 2); g.quadraticCurveTo(tx + 14, ty + 18, tx, ty + 26); g.quadraticCurveTo(tx - 14, ty + 18, tx - 18, ty + 2); g.closePath();
    g.fillStyle = "#1f4fa0"; g.fill(); g.lineWidth = 4; g.strokeStyle = "#d8ac4f"; g.stroke();
    g.fillStyle = "#d8ac4f"; g.font = "bold 22px Georgia, serif"; g.textAlign = "center"; g.fillText("P", tx, ty + 8);
    g.restore();
    // title cartouche (top-right, clear of the places)
    const tx0 = VIEW.w - 350, tw0 = 320, ty0 = 30;
    g.fillStyle = "#5a1418";
    for (const sx of [-1, 1]) { const ex = sx < 0 ? tx0 : tx0 + tw0; g.beginPath(); g.moveTo(ex, ty0 + 8); g.lineTo(ex + sx * 30, ty0 + 8); g.lineTo(ex + sx * 18, ty0 + 26); g.lineTo(ex + sx * 30, ty0 + 44); g.lineTo(ex, ty0 + 44); g.closePath(); g.fill(); }
    g.fillStyle = "#8c1d24"; g.beginPath(); g.roundRect(tx0, ty0, tw0, 46, 6); g.fill();
    g.strokeStyle = "#d8ac4f"; g.lineWidth = 2; g.beginPath(); g.roundRect(tx0 + 5, ty0 + 5, tw0 - 10, 36, 4); g.stroke();
    g.fillStyle = "#f3dfb0"; g.font = "600 27px Georgia, serif"; g.textAlign = "center"; g.fillText("The Tale of Sir Pip", tx0 + tw0 / 2, ty0 + 32);
    if (!this.travel) { g.font = "italic 20px Georgia, serif"; g.fillStyle = "#3a2414"; g.fillText(this.xr ? "Poke a place to travel there" : "Choose where the story goes next", VIEW.w / 2, VIEW.h - 22); }
    this.tex && (this.tex.needsUpdate = true);
  }
}
