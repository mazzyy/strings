// The storybook: before each chapter, a book opens and the narrator reads three
// illustrated pages, then the curtain rises. Illustrations are the chapter's
// painted backdrop with storybook versions of the characters on top.
//   Desktop: an overlay (click to turn the page, Skip to jump ahead).
//   Headset: a floating book in front of the stage (poke to turn the page).
import * as THREE from "three";
import { paintBackdrop } from "./sets.js";

const W = 1200, H = 750;
const SEAL = { x: 1085, y: 640 }; // the "skip" wax seal (headset)

// cartoon figures for the illustrations (feet at x, y; s = scale)
export function figure(g, kind, x, y, s = 1, flip = false) {
  g.save();
  g.translate(x, y);
  g.scale(flip ? -s : s, s);
  g.lineWidth = 3; g.strokeStyle = "#2a1a10";
  const blob = (cx, cy, rx, ry, col) => { g.fillStyle = col; g.beginPath(); g.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2); g.fill(); g.stroke(); };
  const rect = (x0, y0, w, h, col) => { g.fillStyle = col; g.beginPath(); g.roundRect(x0, y0, w, h, 6); g.fill(); g.stroke(); };
  const eyes = (cx, cy, d = 7) => { g.fillStyle = "#1a1410"; for (const sx of [-1, 1]) { g.beginPath(); g.arc(cx + sx * d, cy, 3, 0, Math.PI * 2); g.fill(); } };
  if (kind === "pip") {
    rect(-12, -40, 10, 40, "#9aa0aa"); rect(2, -40, 10, 40, "#9aa0aa");
    rect(-24, -92, 48, 56, "#b4b9c1"); rect(-14, -88, 28, 46, "#1f4fa0");
    blob(0, -112, 22, 24, "#b4b9c1"); blob(0, -108, 14, 14, "#e0b08a"); eyes(0, -110, 5);
    g.fillStyle = "#2a6fd6"; g.beginPath(); g.moveTo(0, -134); g.quadraticCurveTo(26, -150, 34, -126); g.quadraticCurveTo(18, -138, 0, -128); g.fill(); g.stroke();
  } else if (kind === "marlo") {
    g.fillStyle = "#6d7a35"; g.beginPath(); g.moveTo(-20, -40); g.quadraticCurveTo(-70, -30, -64, -6); g.quadraticCurveTo(-40, -20, -18, -20); g.fill(); g.stroke();
    rect(-16, -36, 12, 36, "#66722f"); rect(4, -36, 12, 36, "#66722f");
    blob(0, -70, 30, 40, "#7d8a3f"); blob(4, -62, 18, 26, "#d8c890");
    g.fillStyle = "#c8743a"; g.beginPath(); g.moveTo(-20, -90); g.lineTo(-58, -128); g.lineTo(-30, -84); g.fill(); g.stroke();
    blob(6, -124, 26, 22, "#7d8a3f"); blob(26, -118, 16, 12, "#7d8a3f"); eyes(4, -130, 8);
    g.fillStyle = "#e8dcc0"; for (const sx of [-1, 1]) { g.beginPath(); g.moveTo(sx * 12, -142); g.lineTo(sx * 18, -162); g.lineTo(sx * 4, -144); g.fill(); g.stroke(); }
  } else if (kind === "wizard") {
    g.fillStyle = "#4a2f86"; g.beginPath(); g.moveTo(-34, 0); g.lineTo(34, 0); g.lineTo(18, -90); g.lineTo(-18, -90); g.closePath(); g.fill(); g.stroke();
    blob(0, -104, 18, 20, "#e6bc98"); eyes(0, -108, 6);
    g.fillStyle = "#f2f0ea"; g.beginPath(); g.moveTo(-16, -100); g.quadraticCurveTo(0, -40, 16, -100); g.fill(); g.stroke();
    g.fillStyle = "#4a2f86"; g.beginPath(); g.moveTo(-30, -118); g.lineTo(30, -118); g.lineTo(10, -176); g.lineTo(-2, -186); g.closePath(); g.fill(); g.stroke();
    g.strokeStyle = "#6a4425"; g.lineWidth = 5; g.beginPath(); g.moveTo(42, 0); g.lineTo(42, -150); g.stroke();
    g.fillStyle = "#9ff3ff"; g.beginPath(); g.arc(42, -156, 9, 0, Math.PI * 2); g.fill();
  } else if (kind === "pirate") {
    rect(-14, -40, 11, 40, "#2b2f3a"); g.strokeStyle = "#7a5432"; g.lineWidth = 6; g.beginPath(); g.moveTo(8, -40); g.lineTo(8, 0); g.stroke(); g.lineWidth = 3; g.strokeStyle = "#2a1a10";
    rect(-26, -96, 52, 60, "#9a1f24"); rect(-8, -92, 16, 44, "#ece4d2");
    blob(0, -114, 20, 22, "#c89070"); g.fillStyle = "#121212"; g.beginPath(); g.ellipse(0, -100, 18, 10, 0, 0, Math.PI); g.fill();
    g.beginPath(); g.arc(-7, -118, 5, 0, Math.PI * 2); g.fill(); g.fillStyle = "#1a1410"; g.beginPath(); g.arc(7, -118, 3, 0, Math.PI * 2); g.fill();
    g.fillStyle = "#121212"; g.beginPath(); g.moveTo(-34, -128); g.quadraticCurveTo(0, -160, 34, -128); g.quadraticCurveTo(0, -140, -34, -128); g.fill(); g.stroke();
    blob(26, -102, 9, 12, "#2fa84a"); g.strokeStyle = "#d5d9e0"; g.lineWidth = 4; g.beginPath(); g.moveTo(-30, -70); g.quadraticCurveTo(-60, -110, -50, -140); g.stroke();
  } else if (kind === "troll") {
    rect(-24, -44, 18, 44, "#5f6e43"); rect(6, -44, 18, 44, "#5f6e43");
    blob(0, -86, 44, 48, "#7d8f5a"); g.fillStyle = "#6a4a2c"; g.beginPath(); g.ellipse(0, -80, 46, 30, 0, Math.PI * 0.1, Math.PI * 0.9); g.fill();
    blob(0, -148, 34, 28, "#7d8f5a"); blob(0, -142, 13, 11, "#5f6e43"); eyes(0, -156, 12);
    g.fillStyle = "#f0e8d0"; for (const sx of [-1, 1]) { g.beginPath(); g.moveTo(sx * 14, -130); g.lineTo(sx * 18, -146); g.lineTo(sx * 8, -132); g.fill(); }
    g.fillStyle = "#7d8f5a"; for (const sx of [-1, 1]) { g.beginPath(); g.moveTo(sx * 30, -156); g.lineTo(sx * 58, -166); g.lineTo(sx * 32, -142); g.fill(); g.stroke(); }
  } else if (kind === "clank") {
    rect(-18, -40, 12, 40, "#3a3e46"); rect(6, -40, 12, 40, "#3a3e46");
    rect(-34, -104, 68, 66, "#8a9098"); rect(-18, -92, 36, 28, "#3a3e46");
    g.fillStyle = "#ff3020"; g.beginPath(); g.arc(0, -78, 5, 0, Math.PI * 2); g.fill();
    rect(-26, -150, 52, 42, "#8a9098"); g.fillStyle = "#ff3020"; g.beginPath(); g.arc(0, -132, 9, 0, Math.PI * 2); g.fill();
    g.beginPath(); g.moveTo(0, -150); g.lineTo(0, -170); g.stroke(); g.beginPath(); g.arc(0, -174, 5, 0, Math.PI * 2); g.fill();
    g.fillStyle = "rgba(255,80,40,0.25)"; g.beginPath(); g.moveTo(10, -132); g.lineTo(150, -60); g.lineTo(150, -180); g.closePath(); g.fill();
  } else if (kind === "princess") {
    g.fillStyle = "#c8508a"; g.beginPath(); g.moveTo(-36, 0); g.lineTo(36, 0); g.lineTo(12, -84); g.lineTo(-12, -84); g.closePath(); g.fill(); g.stroke();
    blob(0, -100, 17, 19, "#e8c0a0"); g.fillStyle = "#8a4a22"; g.beginPath(); g.ellipse(0, -106, 19, 14, 0, Math.PI, 0); g.fill(); eyes(0, -100, 6);
    g.fillStyle = "#e8c060"; g.beginPath(); g.moveTo(-12, -118); for (let k = 0; k < 5; k++) { g.lineTo(-12 + k * 6 + 3, -132); g.lineTo(-12 + (k + 1) * 6, -120); } g.closePath(); g.fill(); g.stroke();
  } else if (kind === "king") {
    g.fillStyle = "#7a1d22"; g.beginPath(); g.moveTo(-36, 0); g.lineTo(36, 0); g.lineTo(22, -96); g.lineTo(-22, -96); g.closePath(); g.fill(); g.stroke();
    g.fillStyle = "#f2f0ea"; g.fillRect(-36, -8, 72, 8);
    blob(0, -114, 20, 22, "#e6bc98"); eyes(0, -118, 7);
    g.fillStyle = "#cfcfcf"; g.beginPath(); g.moveTo(-16, -108); g.quadraticCurveTo(0, -70, 16, -108); g.fill(); g.stroke();
    g.fillStyle = "#e8c060"; g.beginPath(); g.moveTo(-18, -134); for (let k = 0; k < 4; k++) { g.lineTo(-18 + k * 12 + 6, -156); g.lineTo(-18 + (k + 1) * 12, -136); } g.closePath(); g.fill(); g.stroke();
  } else if (kind === "musicbox") {
    rect(-44, -46, 88, 46, "#c9a14a"); rect(-48, -62, 96, 18, "#e8c060");
    g.fillStyle = "#7a1d22"; for (const dx of [-24, 0, 24]) { g.beginPath(); g.arc(dx, -24, 7, 0, Math.PI * 2); g.fill(); g.stroke(); }
    g.strokeStyle = "#2a1a10"; g.lineWidth = 4; g.beginPath(); g.moveTo(48, -30); g.lineTo(66, -30); g.moveTo(66, -40); g.lineTo(66, -20); g.stroke();
    // floating music notes
    g.fillStyle = "#fff4c8";
    for (const [nx, ny, r] of [[-30, -100, 1], [10, -128, 1.2], [44, -96, 0.9]]) { g.beginPath(); g.ellipse(nx, ny, 8 * r, 6 * r, -0.4, 0, Math.PI * 2); g.fill(); g.fillRect(nx + 6 * r, ny - 30 * r, 3, 30 * r); }
  } else if (kind === "cage") {
    g.strokeStyle = "#3a3e46"; g.lineWidth = 5;
    for (let i = -3; i <= 3; i++) { g.beginPath(); g.moveTo(i * 14, 0); g.lineTo(i * 14, -150); g.stroke(); }
    g.lineWidth = 8; g.beginPath(); g.moveTo(-50, 0); g.lineTo(50, 0); g.moveTo(-50, -150); g.lineTo(50, -150); g.stroke();
  }
  g.restore();
}

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
    this.open = false;
    this.pokeCool = 0;
    this.illos = new Map();
  }

  _illo(set) {
    if (!this.illos.has(set)) {
      const c = document.createElement("canvas");
      c.width = 1024; c.height = 376;
      paintBackdrop(set, c.getContext("2d"), 1024, 376);
      this.illos.set(set, c);
    }
    return this.illos.get(set);
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
    this.mesh.visible = !!xr;
    this.turn();
  }

  turn() {
    if (!this.open || this.turning) return;
    this.page++;
    if (this.page >= this.chapter.pages.length) return this.finish();
    if (this.flip) { this.page--; return; } // let the current turn finish first
    const text = this.chapter.pages[this.page];
    if (this.page === 0) this.draw(this.g);
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
    if (this.flip) {
      this.flip.t += dt;
      const p = Math.min(1, this.flip.t / this.flip.dur);
      this._flipFrame(p * p * (3 - 2 * p));
      if (p >= 1) { this.g.drawImage(this.nextC, 0, 0); this.tex.needsUpdate = true; this.flip = null; this.turning = false; }
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

  draw(g = this.g) {
    const ch = this.chapter, n = this.page;
    // the open book: leather cover, two cream pages, a soft spine shadow
    g.fillStyle = "#5a2a1a"; g.beginPath(); g.roundRect(0, 0, W, H, 26); g.fill();
    g.fillStyle = "#f3e6c4"; g.beginPath(); g.roundRect(28, 26, W / 2 - 34, H - 52, 10); g.fill();
    g.beginPath(); g.roundRect(W / 2 + 6, 26, W / 2 - 34, H - 52, 10); g.fill();
    const sp = g.createLinearGradient(W / 2 - 40, 0, W / 2 + 40, 0);
    sp.addColorStop(0, "rgba(0,0,0,0)"); sp.addColorStop(0.5, "rgba(60,30,10,0.35)"); sp.addColorStop(1, "rgba(0,0,0,0)");
    g.fillStyle = sp; g.fillRect(W / 2 - 40, 26, 80, H - 52);
    // left page: the illustration in a gilt frame
    const fx = 62, fy = 70, fw = W / 2 - 100, fh = 420;
    g.save();
    g.beginPath(); g.roundRect(fx, fy, fw, fh, 8); g.clip();
    const art = ch.art?.[n];
    g.drawImage(this._illo(art?.set || ch.set), 0, 0, 1024, 376, fx, fy, fw, fh);
    if (art?.night) { g.fillStyle = "rgba(10,16,48,0.55)"; g.fillRect(fx, fy, fw, fh); g.fillStyle = "#f6f0d0"; g.beginPath(); g.arc(fx + fw * 0.82, fy + 60, 26, 0, Math.PI * 2); g.fill(); }
    for (const [kind, px, flip] of art?.cast || CASTS[ch.id]?.[n] || []) figure(g, kind, fx + fw * px, fy + fh - 30, 1.15, flip);
    g.restore();
    g.strokeStyle = "#c9a14a"; g.lineWidth = 6; g.beginPath(); g.roundRect(fx, fy, fw, fh, 8); g.stroke();
    g.fillStyle = "#7a1d22"; g.font = "italic 22px Georgia, serif"; g.textAlign = "center";
    g.fillText(ch.title, fx + fw / 2, fy + fh + 50);
    // right page: the words, with a decorated first letter
    const tx = W / 2 + 60, tw = W / 2 - 120;
    g.textAlign = "left"; g.fillStyle = "#7a1d22"; g.font = "600 24px Georgia, serif";
    g.fillText(n === 0 ? (ch.id === "prologue" ? "Prologue" : ch.id === "epilogue" ? "Epilogue" : ch.id === "custom" ? "Your Story" : "Chapter " + ["One", "Two", "Three", "Four", "Five", "Six", "Seven"][this._index()]) : "", tx, 110);
    const text = ch.pages[n];
    g.fillStyle = "#c9a14a"; g.font = "700 96px Georgia, serif"; g.fillText(text[0], tx, 240);
    g.fillStyle = "#2a1a10"; g.font = "32px Georgia, serif";
    const firstW = g.measureText ? 74 : 74;
    wrap(g, text.slice(1), tx + firstW, 190, tw - firstW, 46);
    // page dots and the hint
    for (let i = 0; i < ch.pages.length; i++) { g.fillStyle = i === n ? "#7a1d22" : "rgba(122,29,34,0.25)"; g.beginPath(); g.arc(W * 0.75 - 24 + i * 24, H - 86, 7, 0, Math.PI * 2); g.fill(); }
    g.fillStyle = "rgba(42,26,16,0.6)"; g.font = "italic 20px Georgia, serif"; g.textAlign = "center";
    g.fillText(this.xr ? "poke the book to turn the page" : "click to turn the page", W * 0.75, H - 50);
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

  _index() { return Math.max(0, ["courtyard", "forest", "ship", "bridge", "tower", "cave", "sky"].indexOf(this.chapter.id)); }
}
