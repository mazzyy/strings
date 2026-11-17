// The storybook: before each chapter, a book opens and the narrator reads three
// illustrated pages, then the curtain rises. Illustrations are the chapter's
// painted backdrop with storybook versions of the characters on top.
//   Desktop: an overlay (click to turn the page, Skip to jump ahead).
//   Headset: a floating book in front of the stage (poke to turn the page).
import * as THREE from "three";
import { paintBackdrop, paintLayer } from "./backdrops.js";
import { figure } from "./figures.js";

const W = 1200, H = 750;
const SEAL = { x: 1085, y: 640 }; // the "skip" wax seal (headset)

export { figure };

// who appears on which page of each chapter
const CASTS = {
  courtyard: [[["pip", 0.5]], [["pip", 0.42]], [["pip", 0.3], ["marlo", 0.7, true]]],
  forest: [[], [["wizard", 0.55]], [["wizard", 0.3], ["pip", 0.7, true]]],
  ship: [[], [["pirate", 0.55]], [["pip", 0.3], ["pirate", 0.7, true]]],
  bridge: [[], [["troll", 0.55]], [["pip", 0.25], ["troll", 0.65, true]]],
  tower: [[], [["clank", 0.35], ["cage", 0.75], ["princess", 0.75]], [["pip", 0.25], ["clank", 0.6, true]]],
  cave: [[], [["marlo", 0.55]], [["pip", 0.32], ["marlo", 0.68, true]]],
};

function wrap(g, text, x, y, maxW, lh) {
  const words = text.split(" ");
  let line = "";
  for (const w of words) {
    const t = line ? `${line} ${w}` : w;
    if (g.measureText(t).width > maxW && line) { g.fillText(line, x, y); y += lh; line = w; } else line = t;
  }
  g.fillText(line, x, y);
}

// the picture's frame on the left page (book-canvas pixels), and book-canvas pixels to metres on the mesh
const FRAME = { x: 62, y: 62, w: W / 2 - 34 - 68, h: 452 };
const MX = (px) => (px / W - 0.5) * 0.48, MY = (py) => (0.5 - py / H) * 0.3, MW = (px) => (px / W) * 0.48, MH = (py) => (py / H) * 0.3;
const backOut = (k) => { const c = 1.9; return 1 + (c + 1) * (k - 1) ** 3 + c * (k - 1) ** 2; }; // (springs a little past, then settles)

export class StoryBook {
  constructor({ narrator, onFlip }) {
    this.narrator = narrator;
    this.onFlip = onFlip;
    this.canvas = document.createElement("canvas");
    this.canvas.width = W; this.canvas.height = H;
    this.g = this.canvas.getContext("2d");
    // the spread before and after a turn (the page flip is composited from these)
    this.prevC = document.createElement("canvas"); this.prevC.width = W; this.prevC.height = H;
    this.nextC = document.createElement("canvas"); this.nextC.width = W; this.nextC.height = H;
    this.flip = null;
    this.el = document.getElementById("storybook");
    if (this.el) {
      this.el.querySelector(".bookwrap").appendChild(this.canvas);
      this.canvas.addEventListener("click", () => this.turn());
      this.el.querySelector(".skip")?.addEventListener("click", (e) => { e.stopPropagation(); this.skipAll(); });
    }
    this.tex = new THREE.CanvasTexture(this.canvas);
    this.tex.colorSpace = THREE.SRGBColorSpace;
    this.mesh = new THREE.Mesh(new THREE.PlaneGeometry(0.48, 0.3), new THREE.MeshBasicMaterial({ map: this.tex, toneMapped: false, side: THREE.DoubleSide, transparent: true }));
    this.mesh.visible = false;
    this.mesh.renderOrder = 30; // (drawn after the stage's glows, so none of them shows on the page)
    // a soft shadow behind the book lifts it off the busy stage
    const sc = document.createElement("canvas"); sc.width = 256; sc.height = 160;
    { const g = sc.getContext("2d"), gr = g.createRadialGradient(128, 80, 30, 128, 80, 128); gr.addColorStop(0, "rgba(6,3,10,0.72)"); gr.addColorStop(0.62, "rgba(6,3,10,0.5)"); gr.addColorStop(1, "rgba(6,3,10,0)"); g.save(); g.translate(128, 80); g.scale(1, 0.625); g.translate(-128, -80); g.fillStyle = gr; g.fillRect(0, -80, 256, 320); g.restore(); }
    this.shade = new THREE.Mesh(new THREE.PlaneGeometry(0.48 * 1.5, 0.3 * 1.6), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(sc), transparent: true, depthWrite: false, toneMapped: false }));
    this.shade.position.z = -0.012; this.shade.renderOrder = 29;
    this.mesh.add(this.shade);
    this.appear = 0; this.life = 0;
    // the pop-up: in the headset the picture rises off the page in layers (see _buildPop)
    this.popGroup = new THREE.Group();
    this.mesh.add(this.popGroup);
    this.pops = [];
    this.open = false;
    this.pokeCool = 0;
  }

  // Skip: closes this book and any book chained right after it (prologue → chapter one)
  skipAll() {
    this.narrator.hush?.(); // the page being read stops too
    this.skipping = true;
    this.finish();
    setTimeout(() => { this.skipping = false; }, 60);
  }

  // play a chapter's pages, then call onDone
  play(chapter, xr, onDone) {
    if (!chapter.pages?.length || this.skipping) { onDone?.(); return; }
    this.chapter = chapter;
    this.page = -1;
    this.onDone = onDone;
    this.open = true;
    this.xr = xr;
    this.el?.classList.toggle("on", !xr);
    if (!this.mesh.visible) this.appear = 0; // (it opens with a little flourish)
    this.mesh.visible = !!xr;
    this.turn();
  }

  turn() {
    if (!this.open || this.turning) return;
    this.page++;
    if (this.page >= this.chapter.pages.length) return this.finish();
    if (this.flip) { this.page--; return; } // let the current turn finish first
    const text = this.chapter.pages[this.page];
    this._clearPop(); // (the old page's pop-ups fold away as it turns)
    if (this.page === 0) { this.draw(this.g); this._buildPop(); }
    else {
      // turn the page like real paper: keep the old spread, draw the new one, and flip between them
      this.prevC.getContext("2d").drawImage(this.canvas, 0, 0);
      this.draw(this.nextC.getContext("2d"));
      this.flip = { t: 0, dur: 0.85 };
      this.turning = true;
      this.onFlip?.();
    }
    this.narrator.queue.length = 0;
    this.narrator.coach(text);
    this.pageT = 0;
    this.minT = 2.5 + text.split(" ").length * 0.12;
  }

  finish() {
    if (!this.open) return;
    this.open = false;
    this.el?.classList.remove("on");
    this.mesh.visible = false;
    this._clearPop();
    const cb = this.onDone;
    this.onDone = null;
    cb?.();
  }

  // headset: poke the book to turn the page
  poke(tipWorld) {
    if (!this.mesh.visible || this.pokeCool > 0) return false;
    const local = this.mesh.worldToLocal(tipWorld.clone());
    if (Math.abs(local.z) > 0.02 || Math.abs(local.x) > 0.24 || Math.abs(local.y) > 0.15) return false;
    this.pokeCool = 0.8;
    // the wax seal skips the rest (this book and the one chained after it)
    const sx = (SEAL.x / W - 0.5) * 0.48, sy = (0.5 - SEAL.y / H) * 0.3;
    if (Math.hypot(local.x - sx, local.y - sy) < 0.036) { this.skipAll(); return true; }
    this.turn();
    return true;
  }

  update(dt) {
    if (this.pokeCool > 0) this.pokeCool -= dt;
    if (this.mesh.visible) {
      // the book swells into view, then floats, breathing very slightly
      this.appear = Math.min(1, this.appear + dt * 2.4); this.life += dt;
      const e = 1 - (1 - this.appear) ** 3;
      if (this.baseScale == null) this.baseScale = this.mesh.scale.x;
      this.mesh.scale.setScalar(this.baseScale * (0.82 + 0.18 * e));
      this.mesh.material.opacity = e; this.shade.material.opacity = e;
      if (this.home) this.mesh.position.y = this.home.y + Math.sin(this.life * 1.1) * 0.0025 - (1 - e) * 0.03;
      this._updatePop(dt, e);
    }
    if (this.flip) {
      this.flip.t += dt;
      const p = Math.min(1, this.flip.t / this.flip.dur);
      this._flipFrame(p * p * (3 - 2 * p));
      if (p >= 1) { this.g.drawImage(this.nextC, 0, 0); this.tex.needsUpdate = true; this.flip = null; this.turning = false; this._buildPop(); }
    }
    if (!this.open) return;
    this.pageT += dt;
    // turn by itself once the narrator has finished reading the page
    if (this.pageT > this.minT && !this.narrator.speaking && !this.narrator.queue.length) {
      this.idle = (this.idle || 0) + dt;
      if (this.idle > 1.1) { this.idle = 0; this.turn(); }
    } else this.idle = 0;
  }

  // one frame of a page turn (p: 0 → 1). The right page lifts, curls over the spine and
  // becomes the new left page; it's drawn in thin vertical slices so the sheet bows as it
  // turns, with a shadow falling across the page underneath.
  _flipFrame(p) {
    const g = this.g, A = this.prevC, B = this.nextC;
    const mid = W / 2, top = 26, ph = H - 52, rightW = W - 28 - mid, leftW = mid - 28;
    const N = 30, lift = Math.sin(p * Math.PI) * 30;
    g.drawImage(A, 0, 0);
    // the page underneath is already the next one
    g.drawImage(B, mid, 0, W - mid, H, mid, 0, W - mid, H);
    if (p < 0.5) {
      const w = rightW * Math.cos(p * Math.PI);
      const sh = g.createLinearGradient(mid + w, 0, mid + w + 80, 0);
      sh.addColorStop(0, `rgba(30,15,5,${0.4 * Math.sin(p * Math.PI)})`); sh.addColorStop(1, "rgba(30,15,5,0)");
      g.fillStyle = sh; g.fillRect(mid + w, top, 80, ph);
      for (let i = 0; i < N; i++) {
        const u0 = i / N, u1 = (i + 1) / N, curl = Math.sin(u0 * Math.PI / 2);
        const grow = 1 + 0.06 * Math.sin(p * Math.PI) * curl;
        g.drawImage(A, mid + u0 * rightW, top, rightW / N + 0.5, ph, mid + u0 * w, top - lift * curl - (ph * (grow - 1)) / 2, (u1 - u0) * w + 0.8, ph * grow);
      }
      const shade = g.createLinearGradient(mid, 0, mid + w, 0);
      shade.addColorStop(0, `rgba(70,35,10,${0.15 + 0.45 * p})`); shade.addColorStop(1, `rgba(255,250,235,${0.12 * (1 - p)})`);
      g.fillStyle = shade; g.fillRect(mid, top - lift, w, ph + lift);
    } else {
      const w = leftW * -Math.cos(p * Math.PI);
      const sh = g.createLinearGradient(mid - w, 0, mid - w - 80, 0);
      sh.addColorStop(0, `rgba(30,15,5,${0.4 * Math.sin(p * Math.PI)})`); sh.addColorStop(1, "rgba(30,15,5,0)");
      g.fillStyle = sh; g.fillRect(mid - w - 80, top, 80, ph);
      for (let i = 0; i < N; i++) {
        const u0 = i / N, u1 = (i + 1) / N, curl = Math.sin(u0 * Math.PI / 2);
        const grow = 1 + 0.06 * Math.sin(p * Math.PI) * curl;
        g.drawImage(B, mid - u1 * leftW, top, leftW / N + 0.5, ph, mid - u1 * w, top - lift * curl - (ph * (grow - 1)) / 2, (u1 - u0) * w + 0.8, ph * grow);
      }
      const shade = g.createLinearGradient(mid, 0, mid - w, 0);
      shade.addColorStop(0, `rgba(70,35,10,${0.6 - 0.45 * p})`); shade.addColorStop(1, "rgba(255,250,235,0.05)");
      g.fillStyle = shade; g.fillRect(mid - w, top - lift, w, ph + lift);
    }
    // the spine
    const sp = g.createLinearGradient(mid - 30, 0, mid + 30, 0);
    sp.addColorStop(0, "rgba(0,0,0,0)"); sp.addColorStop(0.5, "rgba(60,30,10,0.3)"); sp.addColorStop(1, "rgba(0,0,0,0)");
    g.fillStyle = sp; g.fillRect(mid - 30, top, 60, ph);
    this.tex.needsUpdate = true;
  }

  // the paper: a sheet of soft fibres and specks, made once and laid over both pages
  _paper() {
    if (!this.paper) {
      const c = document.createElement("canvas"); c.width = 600; c.height = H;
      const g = c.getContext("2d");
      let seed = 91; const r = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
      for (let i = 0; i < 2600; i++) { g.strokeStyle = r() < 0.5 ? `rgba(120,84,40,${0.05 * r()})` : `rgba(255,255,255,${0.12 * r()})`; g.lineWidth = 0.6 + r(); const x = r() * 600, y = r() * H, t = r() * 6.28, l = 3 + r() * 12; g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(t) * l, y + Math.sin(t) * l); g.stroke(); }
      for (let i = 0; i < 26; i++) { const x = r() * 600, y = r() * H, rad = 20 + r() * 60; const gr = g.createRadialGradient(x, y, 0, x, y, rad); gr.addColorStop(0, `rgba(150,104,50,${0.05 * r()})`); gr.addColorStop(1, "rgba(150,104,50,0)"); g.fillStyle = gr; g.fillRect(x - rad, y - rad, rad * 2, rad * 2); }
      this.paper = c;
    }
    return this.paper;
  }

  draw(g = this.g) {
    const ch = this.chapter, n = this.page;
    const mid = W / 2, pw = mid - 34, ph = H - 52;
    g.textBaseline = "alphabetic";
    // the open book: a tooled leather cover, the page block, two sheets of cream paper
    const cover = g.createLinearGradient(0, 0, 0, H); cover.addColorStop(0, "#6e3422"); cover.addColorStop(1, "#3c180e");
    g.fillStyle = cover; g.beginPath(); g.roundRect(0, 0, W, H, 26); g.fill();
    g.strokeStyle = "rgba(232,192,96,0.5)"; g.lineWidth = 2; g.beginPath(); g.roundRect(8, 8, W - 16, H - 16, 20); g.stroke();
    for (let k = 3; k >= 1; k--) { g.fillStyle = k % 2 ? "#d9c79c" : "#efe2bf"; g.beginPath(); g.roundRect(28 - k * 3, 26 + k * 2, pw + k * 3, ph, 10); g.fill(); g.beginPath(); g.roundRect(mid + 6, 26 + k * 2, pw + k * 3, ph, 10); g.fill(); }
    for (const [x, dir] of [[28, 1], [mid + 6, -1]]) {
      const pg = g.createLinearGradient(dir > 0 ? x : x + pw, 0, dir > 0 ? x + pw : x, 0); pg.addColorStop(0, "#f9efd3"); pg.addColorStop(0.8, "#f4e7c6"); pg.addColorStop(1, "#e6d5ac");
      g.fillStyle = pg; g.beginPath(); g.roundRect(x, 26, pw, ph, 10); g.fill();
      g.save(); g.beginPath(); g.roundRect(x, 26, pw, ph, 10); g.clip();
      g.drawImage(this._paper(), x, 26, pw, ph);
      const vg = g.createRadialGradient(x + pw / 2, 26 + ph / 2, ph * 0.35, x + pw / 2, 26 + ph / 2, ph * 0.85); vg.addColorStop(0, "rgba(130,90,40,0)"); vg.addColorStop(1, "rgba(130,90,40,0.2)");
      g.fillStyle = vg; g.fillRect(x, 26, pw, ph);
      g.restore();
    }
    const sp = g.createLinearGradient(mid - 46, 0, mid + 46, 0);
    sp.addColorStop(0, "rgba(60,30,10,0)"); sp.addColorStop(0.5, "rgba(60,30,10,0.42)"); sp.addColorStop(1, "rgba(60,30,10,0)");
    g.fillStyle = sp; g.fillRect(mid - 46, 26, 92, ph);
    // a ribbon to keep your place
    g.fillStyle = "#a81e26"; g.beginPath(); g.moveTo(mid + 22, 14); g.lineTo(mid + 36, 14); g.lineTo(mid + 36, H - 4); g.lineTo(mid + 29, H - 16); g.lineTo(mid + 22, H - 4); g.closePath(); g.fill();
    g.fillStyle = "rgba(0,0,0,0.18)"; g.fillRect(mid + 32, 14, 4, H - 22);

    // left page: the illustration, in a gilt frame
    const fx = 62, fy = 62, fw = pw - 68, fh = 452;
    const art = ch.art?.[n], set = art?.set || ch.set;
    g.fillStyle = "rgba(70,36,10,0.3)"; g.beginPath(); g.roundRect(fx + 3, fy + 7, fw, fh, 10); g.fill();
    g.save();
    g.beginPath(); g.roundRect(fx, fy, fw, fh, 8); g.clip();
    g.translate(fx, fy);
    const pop = this.xr; // (headset: the page keeps only the sky; the scene and the cast pop up in front of it)
    if (pop) paintLayer(set, "far", g, fw, fh, art?.focus); else paintBackdrop(set, g, fw, fh, art?.focus);
    if (art?.night) { g.fillStyle = "rgba(14,20,64,0.55)"; g.fillRect(0, 0, fw, fh); const mx = fw * 0.82, my = 70; const mg = g.createRadialGradient(mx, my, 0, mx, my, 150); mg.addColorStop(0, "rgba(250,244,214,0.5)"); mg.addColorStop(1, "rgba(250,244,214,0)"); g.fillStyle = mg; g.fillRect(mx - 150, my - 150, 300, 300); g.fillStyle = "#fbf4d8"; g.beginPath(); g.arc(mx, my, 28, 0, Math.PI * 2); g.fill(); for (let i = 0; i < 40; i++) { g.fillStyle = `rgba(255,255,240,${0.4 + ((i * 37) % 10) / 16})`; g.fillRect((i * 97) % fw, (i * 53) % 150, 2, 2); } }
    if (!pop) for (const [kind, px, flip, dy = 0, sc = 1] of art?.cast || CASTS[ch.id]?.[n] || []) figure(g, kind, fw * px, fh - 30 + dy, 1.3 * sc, flip); // (dy, sc: lift or shrink one figure, e.g. a rider)
    const iv = g.createRadialGradient(fw / 2, fh / 2, fh * 0.42, fw / 2, fh / 2, fw * 0.78); iv.addColorStop(0, "rgba(40,16,10,0)"); iv.addColorStop(1, "rgba(40,16,10,0.42)");
    g.fillStyle = iv; g.fillRect(0, 0, fw, fh);
    g.restore();
    const gold = g.createLinearGradient(fx, fy, fx + fw, fy + fh); gold.addColorStop(0, "#f6dc8a"); gold.addColorStop(0.5, "#c9962e"); gold.addColorStop(1, "#f0cf70");
    g.strokeStyle = gold; g.lineWidth = 8; g.beginPath(); g.roundRect(fx, fy, fw, fh, 8); g.stroke();
    g.strokeStyle = "rgba(90,50,10,0.55)"; g.lineWidth = 1.4; g.beginPath(); g.roundRect(fx - 5, fy - 5, fw + 10, fh + 10, 11); g.stroke(); g.beginPath(); g.roundRect(fx + 5, fy + 5, fw - 10, fh - 10, 5); g.stroke();
    for (const [cx, cy] of [[fx, fy], [fx + fw, fy], [fx, fy + fh], [fx + fw, fy + fh]]) { g.fillStyle = gold; g.strokeStyle = "rgba(90,50,10,0.6)"; g.lineWidth = 1.4; g.beginPath(); g.moveTo(cx, cy - 13); g.lineTo(cx + 13, cy); g.lineTo(cx, cy + 13); g.lineTo(cx - 13, cy); g.closePath(); g.fill(); g.stroke(); g.fillStyle = "#a81e26"; g.beginPath(); g.arc(cx, cy, 4, 0, Math.PI * 2); g.fill(); }
    // the chapter's name on a ribbon
    const bx = fx + fw / 2, by = fy + fh + 66;
    g.font = "italic 600 23px Georgia, serif"; g.textAlign = "center";
    const bw = Math.max(250, g.measureText(ch.title).width + 80);
    g.fillStyle = "#7a141a"; for (const d of [-1, 1]) { g.beginPath(); g.moveTo(bx + d * (bw / 2 - 14), by - 12); g.lineTo(bx + d * (bw / 2 + 26), by - 12); g.lineTo(bx + d * (bw / 2 + 14), by + 5); g.lineTo(bx + d * (bw / 2 + 26), by + 22); g.lineTo(bx + d * (bw / 2 - 14), by + 22); g.fill(); }
    const rb = g.createLinearGradient(0, by - 20, 0, by + 16); rb.addColorStop(0, "#c8323a"); rb.addColorStop(1, "#9a1a22");
    g.fillStyle = rb; g.beginPath(); g.roundRect(bx - bw / 2, by - 20, bw, 36, 4); g.fill();
    g.strokeStyle = "rgba(255,220,150,0.6)"; g.lineWidth = 1.2; g.beginPath(); g.roundRect(bx - bw / 2 + 4, by - 16, bw - 8, 28, 3); g.stroke();
    g.fillStyle = "#fff1d0"; g.fillText(ch.title, bx, by + 6);

    // right page: the words
    const tx = mid + 64, tw = pw - 112, cx = mid + 6 + pw / 2;
    const head = n === 0 ? (ch.id === "prologue" ? "Prologue" : ch.id === "epilogue" ? "Epilogue" : ch.id === "custom" ? "Your Story" : "Chapter " + ["One", "Two", "Three", "Four", "Five", "Six", "Seven"][this._index()]) : "";
    g.textAlign = "center";
    if (head) { g.fillStyle = "#8a1c22"; g.font = "600 22px Georgia, serif"; try { g.letterSpacing = "5px"; } catch { /* older browsers */ } g.fillText(head.toUpperCase(), cx + 2, 104); try { g.letterSpacing = "0px"; } catch { /* older browsers */ } }
    // a flourish under the heading (or alone, on later pages)
    const fy2 = head ? 126 : 104;
    g.strokeStyle = "#c9a14a"; g.lineWidth = 2; g.lineCap = "round";
    for (const d of [-1, 1]) { g.beginPath(); g.moveTo(cx + d * 14, fy2); g.quadraticCurveTo(cx + d * 60, fy2 - 12, cx + d * 104, fy2); g.quadraticCurveTo(cx + d * 118, fy2 + 5, cx + d * 108, fy2 + 9); g.stroke(); }
    g.fillStyle = "#c9a14a"; g.beginPath(); g.moveTo(cx, fy2 - 8); g.lineTo(cx + 8, fy2); g.lineTo(cx, fy2 + 8); g.lineTo(cx - 8, fy2); g.fill();
    // an illuminated first letter, then the text flowing round it
    const text = ch.pages[n], top = 168, cap = 92;
    const cg = g.createLinearGradient(tx, top, tx + cap, top + cap); cg.addColorStop(0, "#b8282e"); cg.addColorStop(1, "#7a141a");
    g.fillStyle = "rgba(70,36,10,0.25)"; g.beginPath(); g.roundRect(tx + 2, top + 4, cap, cap, 8); g.fill();
    g.fillStyle = cg; g.beginPath(); g.roundRect(tx, top, cap, cap, 8); g.fill();
    g.strokeStyle = gold; g.lineWidth = 4; g.beginPath(); g.roundRect(tx, top, cap, cap, 8); g.stroke();
    g.strokeStyle = "rgba(255,226,150,0.7)"; g.lineWidth = 1.2; g.beginPath(); g.roundRect(tx + 7, top + 7, cap - 14, cap - 14, 4); g.stroke();
    g.fillStyle = "rgba(255,226,150,0.5)"; for (const [dx, dy] of [[14, 14], [cap - 14, 14], [14, cap - 14], [cap - 14, cap - 14]]) { g.beginPath(); g.arc(tx + dx, top + dy, 2.2, 0, Math.PI * 2); g.fill(); }
    g.fillStyle = "#ffe9a8"; g.font = "700 70px Georgia, serif"; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText(text[0], tx + cap / 2, top + cap / 2 + 4);
    g.textBaseline = "alphabetic"; g.textAlign = "left"; g.fillStyle = "#2a1a10"; g.font = "35px Georgia, serif";
    const lh = 52, words = text.slice(1).trimStart().split(" ");
    let line = "", row = 0;
    const slot = (i) => (i < 2 ? [tx + cap + 16, tw - cap - 16] : [tx, tw]); // (two lines sit beside the letter)
    const put = () => { const [x] = slot(row); g.fillText(line, x, top + 36 + row * lh); row++; line = ""; };
    // (when the page starts mid-word, the first word's remaining letters hug the big letter)
    for (const w of words) { const t = line ? `${line} ${w}` : w; if (g.measureText(t).width > slot(row)[1] && line) { put(); line = w; } else line = t; }
    if (line) put();
    // where you are in the chapter, and how to turn the page
    for (let i = 0; i < ch.pages.length; i++) { g.fillStyle = i === n ? "#8a1c22" : "rgba(138,28,34,0.25)"; g.beginPath(); g.arc(cx - (ch.pages.length - 1) * 12 + i * 24, H - 88, i === n ? 7 : 5.5, 0, Math.PI * 2); g.fill(); }
    g.fillStyle = "rgba(42,26,16,0.6)"; g.font = "italic 20px Georgia, serif"; g.textAlign = "center";
    g.fillText(this.xr ? "poke the book to turn the page" : "click to turn the page", cx, H - 52);
    // headset: a big red wax seal to poke, to skip straight to the show
    if (this.xr) {
      const sx = SEAL.x, sy = SEAL.y;
      g.fillStyle = "#9a1c22"; g.beginPath();
      for (let i = 0; i <= 24; i++) { const a = (i / 24) * Math.PI * 2, r = 60 + (i % 2 ? 5 : -3); g.lineTo(sx + Math.cos(a) * r, sy + Math.sin(a) * r); }
      g.fill();
      g.strokeStyle = "rgba(255,200,170,0.5)"; g.lineWidth = 3; g.beginPath(); g.arc(sx, sy, 44, 0, Math.PI * 2); g.stroke();
      g.fillStyle = "#ffe8c8"; g.textAlign = "center"; g.font = "700 26px Georgia, serif"; g.fillText("Skip", sx, sy - 2);
      g.font = "italic 16px Georgia, serif"; g.fillText("start the show", sx, sy + 22);
    }
    this.tex.needsUpdate = true;
  }

  // ---- the pop-up ------------------------------------------------------------------------
  // The page keeps the far sky. In front of it, each on its own sheet with real depth between
  // them: the scene (castle, trees, cave...), then every character as a paper cut-out that
  // swings up from the page on a spring, and sways a little, like card on a tab.
  _clearPop() {
    for (const l of this.pops) for (const o of l.all) { o.parent?.remove(o); o.traverse?.((c) => { if (c.isMesh) { c.geometry.dispose(); c.material.map?.dispose(); c.material.dispose(); } }); }
    this.pops = [];
  }
  _buildPop() {
    this._clearPop();
    if (!this.xr || !this.open) return;
    const ch = this.chapter, n = this.page, art = ch.art?.[n], set = art?.set || ch.set, F = FRAME;
    const sheet = (tex, w, h, color = 0xffffff, opacity = 1, order = 31) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: tex, color, transparent: true, opacity, depthWrite: false, toneMapped: false })); m.renderOrder = order; m.userData.opacity = opacity; return m; };
    const texOf = (c) => { const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t; };
    // the scene, lifted off the sky, with its shadow falling on the page behind
    const fc = document.createElement("canvas"); fc.width = Math.round(F.w * 1.4); fc.height = Math.round(F.h * 1.4);
    { const g = fc.getContext("2d"); paintLayer(set, "fore", g, fc.width, fc.height, art?.focus);
      if (art?.night) { g.globalCompositeOperation = "source-atop"; g.fillStyle = "rgba(14,20,64,0.55)"; g.fillRect(0, 0, fc.width, fc.height); } }
    const ft = texOf(fc), cx = MX(F.x + F.w / 2), cy = MY(F.y + F.h / 2), inset = 0.985;
    const fore = sheet(ft, MW(F.w) * inset, MH(F.h) * inset); fore.position.set(cx, cy, 0);
    const foreSh = sheet(ft, MW(F.w) * inset, MH(F.h) * inset, 0x000000, 0.3, 30.5); foreSh.position.set(cx + 0.0025, cy - 0.003, 0);
    this.popGroup.add(foreSh, fore);
    this.pops.push({ obj: fore, depth: 0.016, sh: foreSh, shDepth: 0.003, delay: 0.1, t: 0, all: [fore, foreSh] });
    // the cast: one cut-out each, with a cream paper edge
    const CW = 300, CH = 340, R = 2, FEET = 310;
    (art?.cast || CASTS[ch.id]?.[n] || []).forEach(([kind, px, flip, dy = 0, sc = 1], i) => {
      const raw = document.createElement("canvas"); raw.width = CW * R; raw.height = CH * R;
      const rg = raw.getContext("2d"); rg.scale(R, R); figure(rg, kind, CW / 2, FEET, 1.3 * sc, flip);
      // the paper edge follows the solid parts of the drawing only (not its glows or its ground shadow)
      const mask = document.createElement("canvas"); mask.width = raw.width; mask.height = raw.height;
      { const mg = mask.getContext("2d"), d = rg.getImageData(0, 0, raw.width, raw.height), p = d.data; for (let k = 0; k < p.length; k += 4) { const on = p[k + 3] > 170; p[k] = 255; p[k + 1] = 249; p[k + 2] = 236; p[k + 3] = on ? 255 : 0; } mg.putImageData(d, 0, 0); }
      const cut = document.createElement("canvas"); cut.width = raw.width; cut.height = raw.height;
      { const g = cut.getContext("2d"); for (let a = 0; a < 16; a++) g.drawImage(mask, Math.cos((a / 16) * 6.283) * 3.4 * R, Math.sin((a / 16) * 6.283) * 3.4 * R); g.drawImage(raw, 0, 0); }
      const t = texOf(cut), w = MW(CW), h = MH(CH), up = MH(FEET - CH / 2); // (the sheet hangs so its feet are at the hinge)
      const hinge = new THREE.Group(); hinge.position.set(MX(F.x + F.w * px), MY(F.y + F.h - 30 + dy), 0);
      const fig = sheet(t, w, h, 0xffffff, 1, 33 + i); fig.position.y = up; hinge.add(fig);
      const shadow = sheet(t, w, h, 0x000000, 0.3, 32); shadow.position.set(hinge.position.x + 0.004, hinge.position.y + up - 0.004, 0);
      this.popGroup.add(shadow, hinge);
      this.pops.push({ obj: hinge, depth: 0.034 + i * 0.009, swing: true, sh: shadow, shDepth: 0.018, delay: 0.32 + i * 0.14, t: 0, i, all: [hinge, shadow] });
    });
    this.popT = 0; this.popSaid = false;
  }
  _updatePop(dt, bookE) {
    if (!this.pops.length) return;
    for (const l of this.pops) {
      l.t += dt;
      const k = Math.min(1, Math.max(0, (l.t - l.delay) / 0.6)), e = k <= 0 ? 0 : backOut(k);
      if (k > 0 && !this.popSaid) { this.popSaid = true; this.onPop?.(); }
      l.obj.position.z = l.depth * e;
      l.sh.position.z = l.shDepth * Math.min(1, e);
      l.sh.material.opacity = l.sh.userData.opacity * Math.min(1, k * 1.5) * bookE;
      if (l.swing) {
        // up from flat on a spring, then a slow sway
        l.obj.rotation.x = (1 - e) * 1.35;
        l.obj.rotation.z = Math.sin(this.life * 1.4 + l.i * 1.7) * 0.022 * Math.min(1, k);
        l.obj.children[0].material.opacity = Math.min(1, k * 3) * bookE;
      } else l.obj.material.opacity = Math.min(1, k * 2.5) * bookE;
    }
  }

  _index() { return Math.max(0, ["courtyard", "forest", "ship", "bridge", "tower", "cave", "sky"].indexOf(this.chapter.id)); }
}
