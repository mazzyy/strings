// The painted backdrops: one for each stage set, drawn in code (so they're ours to use).
// Each is painted in two layers, in a 1024 x 376 "logical" space:
//   sky   an opaque far layer (sky, storm, the depths of the cave)
//   fore  everything in front of it, with transparent gaps (castle, trees, the tower wall)
// On stage the two hang a little apart, and moving things (clouds, lightning, waves) pass
// between them. The storybook and the story cards use the two composited into one picture.
export const LW = 1024, LH = 376;
const SKY_SCALE = 1, FORE_SCALE = 1.5;

const mk = (w, h) => { const c = document.createElement("canvas"); c.width = w; c.height = h; return c; };
const rnd = (seed) => () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
const rgba = (c, a = 1) => `rgba(${c},${a})`;

function vfill(g, y0, y1, stops, x = 0, w = LW) {
  const gr = g.createLinearGradient(0, y0, 0, y1);
  for (const [o, c] of stops) gr.addColorStop(o, c);
  g.fillStyle = gr; g.fillRect(x, y0, w, y1 - y0);
}
function glow(g, x, y, r, c, a = 1, mode = "source-over") {
  const gr = g.createRadialGradient(x, y, 0, x, y, r);
  gr.addColorStop(0, rgba(c, a)); gr.addColorStop(0.4, rgba(c, a * 0.4)); gr.addColorStop(1, rgba(c, 0));
  const old = g.globalCompositeOperation; g.globalCompositeOperation = mode;
  g.fillStyle = gr; g.fillRect(x - r, y - r, r * 2, r * 2);
  g.globalCompositeOperation = old;
}
// a fluffy cloud: shaded underside, bright crown
export function cloud(g, x, y, s, light = "255,255,255", shade = "178,198,228", a = 1) {
  const puffs = [[-46, 6, 24], [-22, -8, 30], [8, -14, 34], [38, -4, 28], [62, 8, 20], [-4, 10, 30], [28, 12, 26]];
  g.save();
  // a flat base, the way fair-weather clouds sit on the air
  g.beginPath(); g.rect(x - 90 * s, y - 70 * s, 190 * s, 94 * s); g.clip();
  g.fillStyle = rgba(shade, a * 0.9);
  for (const [dx, dy, r] of puffs) { g.beginPath(); g.arc(x + dx * s, y + (dy + 7) * s, r * s, 0, Math.PI * 2); g.fill(); }
  g.fillStyle = rgba(light, a);
  for (const [dx, dy, r] of puffs) { g.beginPath(); g.arc(x + dx * s, y + dy * s, r * s * 0.94, 0, Math.PI * 2); g.fill(); }
  g.restore();
}
// a ragged line of hills or peaks from left to right, filled down to the bottom
function ridge(g, r, base, amp, step, fill, rough = 0.5) {
  g.beginPath(); g.moveTo(0, LH);
  let y = base - r() * amp;
  for (let x = 0; x <= LW + step; x += step) {
    y += (r() - 0.5) * amp * rough;
    y = Math.max(base - amp, Math.min(base, y));
    g.lineTo(x, y);
  }
  g.lineTo(LW, LH); g.closePath();
  g.fillStyle = fill; g.fill();
}
function stars(g, r, n, maxY, a = 1) {
  for (let i = 0; i < n; i++) {
    const x = r() * LW, y = r() * maxY, s = r();
    g.fillStyle = rgba(s > 0.9 ? "255,236,200" : "235,240,255", (0.35 + r() * 0.65) * a);
    g.beginPath(); g.arc(x, y, s > 0.94 ? 1.6 : s > 0.7 ? 1.1 : 0.7, 0, Math.PI * 2); g.fill();
    if (s > 0.97) glow(g, x, y, 7, "255,250,230", 0.5 * a);
  }
}
function moon(g, x, y, R, c = "250,244,214") {
  glow(g, x, y, R * 4.2, c, 0.35);
  glow(g, x, y, R * 1.9, c, 0.5);
  const gr = g.createRadialGradient(x - R * 0.3, y - R * 0.3, R * 0.1, x, y, R);
  gr.addColorStop(0, "#fffdf0"); gr.addColorStop(1, rgba(c));
  g.fillStyle = gr; g.beginPath(); g.arc(x, y, R, 0, Math.PI * 2); g.fill();
  g.fillStyle = "rgba(190,180,150,0.38)";
  for (const [dx, dy, s] of [[-0.3, -0.2, 0.2], [0.34, 0.3, 0.14], [0.18, -0.38, 0.1], [-0.1, 0.42, 0.12], [0.5, -0.1, 0.07]]) { g.beginPath(); g.arc(x + dx * R, y + dy * R, s * R, 0, Math.PI * 2); g.fill(); }
}
// a brushy grain over everything, so flat fills read as paint
function grain(g, seed = 3, n = 2600, a = 0.05) {
  const r = rnd(seed);
  g.save(); g.globalCompositeOperation = "source-atop"; g.lineCap = "round";
  for (let i = 0; i < n; i++) {
    const x = r() * LW, y = r() * LH, l = 3 + r() * 9, t = r() * Math.PI;
    g.strokeStyle = r() < 0.5 ? rgba("255,255,255", a * r()) : rgba("0,0,0", a * 1.3 * r());
    g.lineWidth = 0.6 + r() * 1.6;
    g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(t) * l, y + Math.sin(t) * l * 0.4); g.stroke();
  }
  g.restore();
}
function vignette(g, a = 0.4, c = "8,6,16") {
  const gr = g.createRadialGradient(LW / 2, LH * 0.5, LH * 0.55, LW / 2, LH * 0.5, LW * 0.62);
  gr.addColorStop(0, rgba(c, 0)); gr.addColorStop(1, rgba(c, a));
  g.save(); g.globalCompositeOperation = "source-atop"; g.fillStyle = gr; g.fillRect(0, 0, LW, LH); g.restore();
}
// a pine: stacked, ragged tiers
function pine(g, r, x, base, h, col) {
  g.fillStyle = col;
  g.fillRect(x - h * 0.02, base - h * 0.2, h * 0.04, h * 0.2);
  const tiers = 5;
  for (let k = 0; k < tiers; k++) {
    const y0 = base - h * 0.14 - (k / tiers) * h * 0.78, w = h * 0.3 * (1 - k / (tiers + 0.6)), th = h * 0.3;
    g.beginPath(); g.moveTo(x, y0 - th);
    g.lineTo(x + w * 0.45, y0 - th * 0.35); g.lineTo(x + w * 0.3, y0 - th * 0.32); g.lineTo(x + w, y0 + (r() - 0.5) * 3);
    g.lineTo(x + w * 0.4, y0 - 3); g.lineTo(x, y0 + 2); g.lineTo(x - w * 0.4, y0 - 3);
    g.lineTo(x - w, y0 + (r() - 0.5) * 3); g.lineTo(x - w * 0.3, y0 - th * 0.32); g.lineTo(x - w * 0.45, y0 - th * 0.35);
    g.closePath(); g.fill();
  }
}
// a round-crowned tree
function tree(g, r, x, base, h, trunk, leaf) {
  g.fillStyle = trunk;
  g.beginPath(); g.moveTo(x - h * 0.05, base); g.quadraticCurveTo(x - h * 0.02, base - h * 0.3, x - h * 0.03, base - h * 0.6);
  g.lineTo(x + h * 0.03, base - h * 0.6); g.quadraticCurveTo(x + h * 0.02, base - h * 0.3, x + h * 0.06, base); g.fill();
  g.fillStyle = leaf;
  for (let i = 0; i < 9; i++) { const a = r() * Math.PI * 2, d = r() * h * 0.2; g.beginPath(); g.arc(x + Math.cos(a) * d * 1.3, base - h * 0.72 + Math.sin(a) * d, h * (0.14 + r() * 0.1), 0, Math.PI * 2); g.fill(); }
}
// a faceted crystal shard growing from (x, y) at an angle; c = "r,g,b"
export function shard(g, x, y, len, wid, ang, c, glowA = 0.5) {
  g.save(); g.translate(x, y); g.rotate(ang);
  if (glowA) glow(g, 0, -len * 0.5, len * 1.1, c, glowA, "lighter");
  const tip = -len, sh = -len * 0.78;
  const body = g.createLinearGradient(0, 0, 0, tip);
  body.addColorStop(0, rgba(c, 0.55)); body.addColorStop(0.6, rgba(c, 0.95)); body.addColorStop(1, "rgba(255,255,255,0.98)");
  // left facet (lit)
  g.fillStyle = body; g.beginPath(); g.moveTo(-wid, 0); g.lineTo(-wid * 0.9, sh); g.lineTo(0, tip); g.lineTo(0, 0); g.closePath(); g.fill();
  // right facet (in shade)
  g.fillStyle = body; g.beginPath(); g.moveTo(wid, 0); g.lineTo(wid * 0.9, sh); g.lineTo(0, tip); g.lineTo(0, 0); g.closePath(); g.fill();
  g.fillStyle = "rgba(20,10,60,0.32)"; g.beginPath(); g.moveTo(wid, 0); g.lineTo(wid * 0.9, sh); g.lineTo(0, tip); g.lineTo(0, 0); g.closePath(); g.fill();
  // the bright edges
  g.strokeStyle = "rgba(255,255,255,0.85)"; g.lineWidth = Math.max(0.8, wid * 0.14); g.lineJoin = "round";
  g.beginPath(); g.moveTo(0, 0); g.lineTo(0, tip); g.stroke();
  g.strokeStyle = "rgba(255,255,255,0.45)"; g.lineWidth = Math.max(0.6, wid * 0.08);
  g.beginPath(); g.moveTo(-wid, 0); g.lineTo(-wid * 0.9, sh); g.lineTo(0, tip); g.lineTo(wid * 0.9, sh); g.lineTo(wid, 0); g.stroke();
  g.restore();
}
function cluster(g, r, x, y, size, c, n = 6, spread = 1.1, glowA = 0.45) {
  glow(g, x, y - size * 0.4, size * 1.9, c, 0.35, "lighter");
  const list = [];
  for (let i = 0; i < n; i++) { const t = n === 1 ? 0 : (i / (n - 1) - 0.5) * spread; list.push([t + (r() - 0.5) * 0.18, size * (0.45 + r() * 0.3 + (1 - Math.abs(t) / (spread * 0.5 + 0.01)) * 0.4)]); }
  list.sort((a, b) => a[1] - b[1]); // short ones behind... drawn first, the tall centre last
  for (const [ang, len] of list) shard(g, x + Math.sin(ang) * size * 0.22, y, len, len * 0.16, ang, c, glowA * 0.35);
}
function sparkle(g, x, y, s, c = "255,255,255", a = 1) {
  g.fillStyle = rgba(c, a);
  g.beginPath(); g.moveTo(x, y - s); g.quadraticCurveTo(x, y, x + s, y); g.quadraticCurveTo(x, y, x, y + s); g.quadraticCurveTo(x, y, x - s, y); g.quadraticCurveTo(x, y, x, y - s); g.fill();
}
// stonework: a wall of blocks between y0 and y1, lit from the top-left
function stones(g, r, x0, y0, x1, y1, base, bw = 34, bh = 16, mortar = "rgba(50,42,36,0.28)") {
  g.save(); g.beginPath(); g.rect(x0, y0, x1 - x0, y1 - y0); g.clip();
  g.fillStyle = base; g.fillRect(x0, y0, x1 - x0, y1 - y0);
  let row = 0;
  for (let y = y0; y < y1; y += bh, row++) {
    for (let x = x0 - (row % 2 ? bw / 2 : 0); x < x1; x += bw) {
      const t = r();
      g.fillStyle = t < 0.5 ? rgba("255,250,235", 0.1 * r()) : rgba("30,24,20", 0.14 * r());
      g.fillRect(x + 1, y + 1, bw - 2, bh - 2);
      g.fillStyle = "rgba(255,255,255,0.10)"; g.fillRect(x + 1, y + 1, bw - 2, 1.5);
    }
  }
  g.strokeStyle = mortar; g.lineWidth = 1.2; row = 0;
  for (let y = y0; y < y1; y += bh, row++) {
    g.beginPath(); g.moveTo(x0, y); g.lineTo(x1, y); g.stroke();
    for (let x = x0 - (row % 2 ? bw / 2 : 0); x < x1; x += bw) { g.beginPath(); g.moveTo(x, y); g.lineTo(x, y + bh); g.stroke(); }
  }
  g.restore();
}
// a round tower with a cone roof and a pennant
function tower(g, r, x, top, w, bottom, stone, roof, flag) {
  stones(g, r, x, top, x + w, bottom, stone, 22, 13);
  // roundness: light on the left, shade on the right
  const sh = g.createLinearGradient(x, 0, x + w, 0);
  sh.addColorStop(0, "rgba(255,246,220,0.22)"); sh.addColorStop(0.35, "rgba(255,255,255,0)"); sh.addColorStop(1, "rgba(30,24,40,0.42)");
  g.fillStyle = sh; g.fillRect(x, top, w, bottom - top);
  // battlement ring
  g.fillStyle = stone; g.fillRect(x - 5, top - 4, w + 10, 12);
  g.fillStyle = "rgba(30,24,40,0.25)"; g.fillRect(x - 5, top + 6, w + 10, 3);
  for (let k = 0; k < 5; k++) { g.fillStyle = stone; g.fillRect(x - 5 + k * ((w + 10 - 10) / 4), top - 14, 10, 11); }
  // roof
  const rg = g.createLinearGradient(x, 0, x + w, 0); rg.addColorStop(0, roof[0]); rg.addColorStop(1, roof[1]);
  g.fillStyle = rg; g.beginPath(); g.moveTo(x - 8, top - 12); g.lineTo(x + w / 2, top - 12 - w * 0.95); g.lineTo(x + w + 8, top - 12); g.closePath(); g.fill();
  g.strokeStyle = "rgba(255,255,255,0.18)"; g.lineWidth = 1;
  for (let k = 1; k < 5; k++) { g.beginPath(); g.moveTo(x - 8 + (w + 16) * (k / 5), top - 12); g.lineTo(x + w / 2, top - 12 - w * 0.95); g.stroke(); }
  // pennant
  const px = x + w / 2, py = top - 12 - w * 0.95;
  g.strokeStyle = "#4a3426"; g.lineWidth = 2; g.beginPath(); g.moveTo(px, py + 2); g.lineTo(px, py - 26); g.stroke();
  g.fillStyle = flag; g.beginPath(); g.moveTo(px, py - 26); g.quadraticCurveTo(px + 14, py - 30, px + 26, py - 20); g.quadraticCurveTo(px + 14, py - 16, px, py - 13); g.fill();
  // window
  g.fillStyle = "#2c2230"; g.beginPath(); g.moveTo(x + w / 2 - 6, top + 52); g.lineTo(x + w / 2 - 6, top + 34); g.arc(x + w / 2, top + 34, 6, Math.PI, 0); g.lineTo(x + w / 2 + 6, top + 52); g.fill();
  g.fillStyle = "rgba(255,255,255,0.14)"; g.fillRect(x + w / 2 - 8, top + 52, 16, 3);
}

// ---- the backdrops ---------------------------------------------------------------------
const PAINT = {
  // ---- a sunny castle courtyard ------------------------------------------------------
  courtyard: {
    sky(g) {
      vfill(g, 0, LH, [[0, "#3f8fdc"], [0.45, "#8fc6f0"], [0.7, "#f6e6c6"], [1, "#f9dcae"]]);
      glow(g, 170, 64, 260, "255,244,206", 0.75);
      glow(g, 170, 64, 60, "255,255,240", 0.95);
    },
    clouds(g) { for (const [x, y, s] of [[110, 120, 0.7], [330, 62, 1.05], [600, 96, 0.8], [840, 52, 1.15], [985, 132, 0.6]]) cloud(g, x, y, s); },
    fore(g) {
      const r = rnd(41);
      // far hills, hazy with distance
      ridge(g, r, 236, 46, 26, "#a9c6dc", 0.5);
      ridge(g, r, 250, 34, 22, "#93b89c", 0.6);
      // the keep behind the wall
      for (const [x, top, w] of [[196, 96, 58], [770, 78, 64]]) {
        g.fillStyle = "#b9bfcc"; g.fillRect(x, top, w, 160);
        g.fillStyle = "#8492b4"; g.beginPath(); g.moveTo(x - 6, top); g.lineTo(x + w / 2, top - w * 1.05); g.lineTo(x + w + 6, top); g.fill();
        g.fillStyle = "rgba(60,60,90,0.25)"; g.fillRect(x + w * 0.6, top, w * 0.4, 160);
        g.fillStyle = "#56607c"; g.fillRect(x + w / 2 - 4, top + 24, 8, 16);
      }
      // the curtain wall
      const wallTop = 204, wallBot = 338;
      stones(g, r, 0, wallTop, LW, wallBot, "#b3aa98");
      vfill(g, wallTop, wallBot, [[0, "rgba(255,244,214,0.20)"], [0.5, "rgba(255,255,255,0)"], [1, "rgba(40,30,40,0.34)"]]);
      for (let x = -6; x < LW; x += 40) { stones(g, r, x, wallTop - 17, x + 23, wallTop + 1, "#b9b09e", 23, 9); g.fillStyle = "rgba(255,246,220,0.22)"; g.fillRect(x, wallTop - 17, 23, 2); }
      g.fillStyle = "rgba(30,24,34,0.22)"; g.fillRect(0, wallTop + 1, LW, 5);
      // towers
      tower(g, r, 52, 132, 82, wallBot, "#beb5a3", ["#5f84c4", "#2f4a80"], "#c8322a");
      tower(g, r, 890, 126, 84, wallBot, "#beb5a3", ["#5f84c4", "#2f4a80"], "#e8b838");
      tower(g, r, 388, 104, 78, wallBot, "#c4bba9", ["#c85a48", "#7a2a26"], "#2f66c8");
      tower(g, r, 558, 104, 78, wallBot, "#c4bba9", ["#c85a48", "#7a2a26"], "#2f66c8");
      // the gatehouse between the middle towers
      stones(g, r, 466, 176, 558, wallBot, "#c0b7a5", 26, 14);
      for (let x = 466; x < 556; x += 19) { g.fillStyle = "#c0b7a5"; g.fillRect(x, 164, 11, 13); }
      g.fillStyle = "rgba(30,24,34,0.25)"; g.fillRect(466, 177, 92, 4);
      // the gate: an arch, oak doors, iron bands
      const gx = 512, gw = 30, gy = 246;
      g.fillStyle = "#857c6c"; g.beginPath(); g.moveTo(gx - gw - 7, wallBot); g.lineTo(gx - gw - 7, gy); g.arc(gx, gy, gw + 7, Math.PI, 0); g.lineTo(gx + gw + 7, wallBot); g.fill();
      const dg = g.createLinearGradient(gx - gw, 0, gx + gw, 0); dg.addColorStop(0, "#6a4526"); dg.addColorStop(0.5, "#8a5c34"); dg.addColorStop(1, "#4e3018");
      g.fillStyle = dg; g.beginPath(); g.moveTo(gx - gw, wallBot); g.lineTo(gx - gw, gy); g.arc(gx, gy, gw, Math.PI, 0); g.lineTo(gx + gw, wallBot); g.fill();
      g.strokeStyle = "rgba(30,16,8,0.55)"; g.lineWidth = 1.2;
      for (let x = gx - gw + 8; x < gx + gw; x += 8) { g.beginPath(); g.moveTo(x, gy - 26); g.lineTo(x, wallBot); g.stroke(); }
      g.strokeStyle = "#2a2622"; g.lineWidth = 3;
      for (const y of [gy + 12, gy + 52]) { g.beginPath(); g.moveTo(gx - gw, y); g.lineTo(gx + gw, y); g.stroke(); }
      g.lineWidth = 2; g.beginPath(); g.moveTo(gx, gy - gw); g.lineTo(gx, wallBot); g.stroke();
      g.fillStyle = "#d8ac4f"; for (const sx of [-1, 1]) { g.beginPath(); g.arc(gx + sx * 7, gy + 34, 3, 0, Math.PI * 2); g.fill(); }
      // a crest over the gate
      g.fillStyle = "#d8ac4f"; g.beginPath(); g.moveTo(gx - 11, 188); g.lineTo(gx + 11, 188); g.lineTo(gx + 11, 200); g.quadraticCurveTo(gx, 213, gx - 11, 200); g.closePath(); g.fill();
      g.fillStyle = "#2f66c8"; g.beginPath(); g.moveTo(gx - 7, 191); g.lineTo(gx + 7, 191); g.lineTo(gx + 7, 199); g.quadraticCurveTo(gx, 208, gx - 7, 199); g.closePath(); g.fill();
      // banners hanging on the wall
      for (const [x, c1, c2] of [[236, "#b8242c", "#7a1218"], [300, "#2f66c8", "#1c3f86"], [690, "#2f66c8", "#1c3f86"], [756, "#b8242c", "#7a1218"]]) {
        const bg = g.createLinearGradient(x, 0, x + 30, 0); bg.addColorStop(0, c1); bg.addColorStop(1, c2);
        g.fillStyle = "#6a4a2c"; g.fillRect(x - 4, 222, 38, 3);
        g.fillStyle = bg; g.beginPath(); g.moveTo(x, 225); g.lineTo(x + 30, 225); g.lineTo(x + 30, 290); g.lineTo(x + 15, 278); g.lineTo(x, 290); g.closePath(); g.fill();
        g.strokeStyle = "#e8c060"; g.lineWidth = 1.5; g.stroke();
        sparkle(g, x + 15, 250, 8, "240,200,96");
      }
      // arrow slits
      g.fillStyle = "#3a3040"; for (const x of [170, 350, 650, 836]) { g.fillRect(x, 232, 4, 22); g.fillRect(x - 4, 240, 12, 4); }
      // ivy creeping up from the corners
      for (const [cx, dir] of [[0, 1], [LW, -1]]) for (let i = 0; i < 150; i++) {
        const d = r() * r() * 190, x = cx + dir * d, y = wallBot - r() * (150 - d * 0.6);
        g.fillStyle = ["#3f7a30", "#56963c", "#2f6226", "#6aa848"][Math.floor(r() * 4)];
        g.beginPath(); g.ellipse(x, y, 5 + r() * 4, 3 + r() * 3, r() * 3, 0, Math.PI * 2); g.fill();
      }
      g.fillStyle = "rgba(30,20,30,0.28)"; g.fillRect(0, wallBot - 8, LW, 8);
      // the green, a path of pale stones up to the gate
      vfill(g, wallBot, LH, [[0, "#78aa48"], [1, "#4a7a2c"]]);
      const pg = g.createLinearGradient(0, wallBot, 0, LH); pg.addColorStop(0, "#d6c59c"); pg.addColorStop(1, "#c2ae82");
      g.fillStyle = pg; g.beginPath(); g.moveTo(gx - 30, wallBot); g.lineTo(gx + 30, wallBot); g.lineTo(gx + 130, LH); g.lineTo(gx - 130, LH); g.fill();
      for (let i = 0; i < 46; i++) { const y = wallBot + 3 + r() * (LH - wallBot - 6), k = (y - wallBot) / (LH - wallBot), x = gx + (r() - 0.5) * (56 + k * 190); g.fillStyle = rgba("120,100,70", 0.22 + r() * 0.2); g.beginPath(); g.ellipse(x, y, 5 + k * 5, 2.4 + k * 2, 0, 0, Math.PI * 2); g.fill(); }
      for (let i = 0; i < 260; i++) { const x = r() * LW, y = wallBot + 2 + r() * (LH - wallBot); if (Math.abs(x - gx) < 34 + (y - wallBot) * 2.7) continue; g.strokeStyle = r() < 0.5 ? "rgba(150,200,90,0.6)" : "rgba(40,90,30,0.5)"; g.lineWidth = 1.2; g.beginPath(); g.moveTo(x, y); g.lineTo(x + (r() - 0.5) * 4, y - 4 - r() * 5); g.stroke(); }
      // rose bushes along the wall
      for (const x of [150, 250, 330, 700, 790, 860]) {
        for (let i = 0; i < 9; i++) { g.fillStyle = ["#3c7a2e", "#4f9438", "#2e6426"][i % 3]; g.beginPath(); g.arc(x + (r() - 0.5) * 44, wallBot - 2 - r() * 16, 9 + r() * 7, 0, Math.PI * 2); g.fill(); }
        for (let i = 0; i < 7; i++) { g.fillStyle = ["#e8486a", "#ffd9e2", "#f6c040"][Math.floor(r() * 3)]; g.beginPath(); g.arc(x + (r() - 0.5) * 46, wallBot - 4 - r() * 20, 2.4, 0, Math.PI * 2); g.fill(); }
      }
      grain(g, 5);
    },
  },

  // ---- the whispering forest, by moonlight -----------------------------------------------
  forest: {
    sky(g) {
      vfill(g, 0, LH, [[0, "#081428"], [0.45, "#143048"], [0.8, "#2c6064"], [1, "#3c7a70"]]);
      stars(g, rnd(9), 150, 190, 0.9);
      moon(g, 742, 150, 44, "236,246,226");
    },
    clouds(g) {
      // drifting mist
      const r = rnd(77);
      for (let i = 0; i < 9; i++) { const x = r() * LW, y = 250 + r() * 70, w = 160 + r() * 200; const gr = g.createRadialGradient(x, y, 0, x, y, w); gr.addColorStop(0, "rgba(190,236,224,0.20)"); gr.addColorStop(1, "rgba(190,236,224,0)"); g.save(); g.translate(0, y * 0.75); g.scale(1, 0.25); g.fillStyle = gr; g.fillRect(x - w, y - w, w * 2, w * 2); g.restore(); }
    },
    fore(g) {
      const r = rnd(7);
      // three depths of trees, each darker and sharper than the one behind
      // (a gap in the trees is kept clear, so the moon hangs in open sky)
      const MX = 742, clear = (x, half) => Math.abs(x - MX) < half;
      for (let i = 0; i < 26; i++) { const x = r() * LW, h = 120 + r() * 70; if (clear(x, 64)) continue; pine(g, r, x, 268 + r() * 10, h, "#24525a"); }
      vfill(g, 200, 300, [[0, "rgba(120,200,190,0)"], [1, "rgba(120,200,190,0.20)"]]);
      for (let i = 0; i < 16; i++) { const x = r() * LW, kind = r(), a = r(), b = r(); if (clear(x, 120)) continue; if (kind < 0.6) pine(g, r, x, 300 + a * 12, 170 + b * 80, "#173a3e"); else tree(g, r, x, 304 + a * 10, 170 + b * 50, "#122c30", "#1a4244"); }
      // two low firs under the moon, so the gap still reads as forest
      pine(g, r, MX - 46, 306, 96, "#173a3e"); pine(g, r, MX + 58, 308, 82, "#173a3e");
      // moonbeams slanting through the trunks
      // (soft-edged: blurred where the browser can, and faint either way)
      g.save(); g.globalCompositeOperation = "lighter"; try { g.filter = "blur(7px)"; } catch { /* drawn sharp */ }
      for (const [x, w] of [[640, 46], [720, 34], [560, 26], [800, 40]]) { const bg = g.createLinearGradient(0, 150, 0, 340); bg.addColorStop(0, "rgba(200,244,226,0.13)"); bg.addColorStop(1, "rgba(200,244,226,0)"); g.fillStyle = bg; g.beginPath(); g.moveTo(MX - 10, 160); g.lineTo(MX + 10, 160); g.lineTo(x - 60 + w, 344); g.lineTo(x - 60 - w, 344); g.closePath(); g.fill(); }
      g.restore();
      // the forest floor: a pale path winding into the wood
      vfill(g, 306, LH, [[0, "#14302c"], [1, "#0b1c1a"]]);
      g.fillStyle = "rgba(150,210,180,0.16)"; g.beginPath(); g.moveTo(470, 310); g.quadraticCurveTo(520, 330, 380, LH); g.lineTo(700, LH); g.quadraticCurveTo(600, 330, 540, 310); g.fill();
      // the great trees at the wings, framing the scene
      for (const [x, w, dir] of [[40, 70, 1], [978, 80, -1], [150, 34, 1], [880, 38, -1]]) {
        const tg = g.createLinearGradient(x - w / 2, 0, x + w / 2, 0); tg.addColorStop(0, dir > 0 ? "#061210" : "#12302c"); tg.addColorStop(1, dir > 0 ? "#12302c" : "#061210");
        g.fillStyle = tg; g.beginPath(); g.moveTo(x - w * 0.5, 0); g.quadraticCurveTo(x - w * 0.34, 200, x - w * 0.9, LH); g.lineTo(x + w * 0.9, LH); g.quadraticCurveTo(x + w * 0.34, 200, x + w * 0.5, 0); g.fill();
        g.strokeStyle = "rgba(160,230,210,0.20)"; g.lineWidth = 2; g.beginPath(); g.moveTo(x + dir * w * 0.42, 10); g.quadraticCurveTo(x + dir * w * 0.3, 200, x + dir * w * 0.7, LH - 10); g.stroke();
        // a bough reaching in, thinning to its tip and ending in a spray of leaves
        const bx = x + dir * w * 2.5, by = 76;
        g.fillStyle = "#0a1a18"; g.beginPath(); g.moveTo(x + dir * w * 0.3, 82); g.quadraticCurveTo(x + dir * w * 1.5, 46, bx, by - 1); g.lineTo(bx, by + 2); g.quadraticCurveTo(x + dir * w * 1.5, 60, x + dir * w * 0.3, 100); g.closePath(); g.fill();
        for (let k = 0; k < 16; k++) { g.fillStyle = ["#0c2420", "#143830", "#1c4a3c"][k % 3]; g.beginPath(); g.ellipse(bx - dir * r() * w * 1.1 + dir * 8, by - 6 + (r() - 0.4) * 26, 8 + r() * 8, 4 + r() * 4, r() * 3, 0, Math.PI * 2); g.fill(); }
      }
      // leaves hanging down from above
      for (let i = 0; i < 260; i++) { const x = r() * LW, edge = Math.min(x, LW - x) / (LW / 2), y = r() * r() * (80 - edge * 50); g.fillStyle = ["#0c2420", "#143830", "#1c4a3c"][Math.floor(r() * 3)]; g.beginPath(); g.ellipse(x, y, 9 + r() * 8, 5 + r() * 4, r() * 3, 0, Math.PI * 2); g.fill(); }
      // ferns
      for (let i = 0; i < 44; i++) { const x = r() * LW, y = 326 + r() * 46; g.strokeStyle = ["#1c4a38", "#2a6448", "#12342a"][Math.floor(r() * 3)]; g.lineWidth = 2; for (let k = -3; k <= 3; k++) { g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + k * 5, y - 16, x + k * 10, y - 12 - r() * 8); g.stroke(); } }
      // toadstools that glow, and fireflies
      for (const [x, y, s] of [[236, 340, 1], [262, 348, 0.7], [770, 344, 1.1], [806, 352, 0.7], [610, 336, 0.6], [404, 350, 0.8]]) {
        glow(g, x, y - 6 * s, 30 * s, "110,220,255", 0.5, "lighter");
        g.fillStyle = "#d4eef4"; g.fillRect(x - 1.6 * s, y - 9 * s, 3.2 * s, 9 * s);
        g.fillStyle = "#8ae4ff"; g.beginPath(); g.ellipse(x, y - 9 * s, 8 * s, 5 * s, 0, Math.PI, 0); g.fill();
      }
      for (let i = 0; i < 40; i++) { const x = 60 + r() * 900, y = 150 + r() * 180; glow(g, x, y, 7, "255,240,150", 0.8, "lighter"); g.fillStyle = "#fffbd0"; g.beginPath(); g.arc(x, y, 1.2, 0, Math.PI * 2); g.fill(); }
      grain(g, 8, 2000, 0.04);
    },
  },

  // ---- the open sea ------------------------------------------------------------------------
  ship: {
    sky(g) {
      vfill(g, 0, LH, [[0, "#2f84d6"], [0.4, "#86c4ee"], [0.58, "#ffe9c2"], [0.6, "#3f9ace"], [1, "#0f4274"]]);
      glow(g, 830, 80, 280, "255,240,200", 0.7);
      glow(g, 830, 80, 54, "255,255,236", 1);
    },
    clouds(g) { for (const [x, y, s] of [[90, 70, 0.9], [300, 130, 0.6], [520, 56, 1.1], [700, 150, 0.55], [960, 110, 0.8]]) cloud(g, x, y, s, "255,255,255", "170,200,232"); },
    fore(g) {
      const r = rnd(19);
      const hz = 218;
      // islands on the horizon
      for (const [x, w, h, c] of [[190, 120, 30, "#7fa6b8"], [640, 90, 20, "#8fb4c4"]]) { g.fillStyle = c; g.beginPath(); g.ellipse(x, hz, w, h, 0, Math.PI, 0); g.fill(); }
      g.fillStyle = "#5f946a"; g.beginPath(); g.ellipse(190, hz, 84, 22, 0, Math.PI, 0); g.fill();
      for (const [x, lean] of [[168, -0.25], [200, 0.2], [224, 0.5]]) {
        g.strokeStyle = "#6a5236"; g.lineWidth = 3; g.beginPath(); g.moveTo(x, hz - 16); g.quadraticCurveTo(x + lean * 14, hz - 36, x + lean * 26, hz - 52); g.stroke();
        g.strokeStyle = "#3f7a40"; g.lineWidth = 3; for (let k = 0; k < 6; k++) { const a = -Math.PI * (0.05 + k * 0.18); g.beginPath(); g.moveTo(x + lean * 26, hz - 52); g.quadraticCurveTo(x + lean * 26 + Math.cos(a) * 12, hz - 58 + Math.sin(a) * 8, x + lean * 26 + Math.cos(a) * 22, hz - 46 + Math.sin(a) * 6); g.stroke(); }
      }
      // a far ship under sail
      g.fillStyle = "#5a4634"; g.beginPath(); g.moveTo(404, hz - 2); g.lineTo(452, hz - 2); g.lineTo(444, hz + 6); g.lineTo(410, hz + 6); g.fill();
      g.fillStyle = "#fbf6e8"; for (const [x, h] of [[416, 26], [430, 34], [443, 22]]) { g.beginPath(); g.moveTo(x, hz - 4); g.quadraticCurveTo(x + 9, hz - 4 - h / 2, x, hz - 4 - h); g.lineTo(x - 2, hz - 4 - h); g.fill(); }
      // the sea: deeper towards us, with the sun's glitter laid across it
      vfill(g, hz, LH, [[0, "#58b0dc"], [0.25, "#2f86be"], [1, "#0f4274"]]);
      g.save(); g.globalCompositeOperation = "lighter";
      for (let i = 0; i < 260; i++) { const k = r(), y = hz + 2 + k * k * (LH - hz), x = 830 + (r() - 0.5) * (40 + k * 420); g.fillStyle = rgba("255,244,206", 0.5 * (1 - k * 0.6)); g.fillRect(x, y, 6 + k * 20, 1 + k * 1.6); }
      g.restore();
      for (let y = hz + 8; y < LH; y += 9 + (y - hz) * 0.12) { g.strokeStyle = rgba("255,255,255", 0.16 + r() * 0.16); g.lineWidth = 1 + (y - hz) * 0.012; for (let s = 0; s < 14; s++) { const x = r() * LW, w = 20 + r() * 50 + (y - hz) * 0.4; g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + w / 2, y - 3, x + w, y); g.stroke(); } }
      // gulls
      g.strokeStyle = "rgba(40,50,70,0.75)"; g.lineWidth = 2; g.lineCap = "round";
      for (const [x, y, s] of [[300, 96, 1], [338, 112, 0.7], [620, 124, 0.8], [124, 150, 0.6]]) { g.beginPath(); g.moveTo(x - 9 * s, y); g.quadraticCurveTo(x - 4 * s, y - 6 * s, x, y); g.quadraticCurveTo(x + 4 * s, y - 6 * s, x + 9 * s, y); g.stroke(); }
      grain(g, 6, 1800, 0.04);
    },
  },

  // ---- the troll's bridge, under the moon ----------------------------------------------------
  bridge: {
    sky(g) {
      vfill(g, 0, LH, [[0, "#070b26"], [0.5, "#1a2458"], [0.82, "#4a4a8e"], [1, "#6a5a96"]]);
      const r = rnd(11); stars(g, r, 260, 250);
      moon(g, 826, 138, 40);
    },
    clouds(g) { for (const [x, y, s] of [[140, 80, 0.8], [470, 130, 0.6], [700, 54, 0.7], [960, 150, 0.6]]) cloud(g, x, y, s, "96,108,170", "44,52,110", 0.75); },
    fore(g) {
      const r = rnd(29);
      // moonlit peaks, range behind range
      ridge(g, r, 250, 120, 34, "#2c3672", 0.95);
      g.save(); g.globalCompositeOperation = "source-atop"; vfill(g, 110, 190, [[0, "rgba(220,226,255,0.55)"], [1, "rgba(220,226,255,0)"]]); g.restore();
      ridge(g, r, 268, 80, 28, "#1e2656", 0.9);
      // far off on its crag, the clockwork tower, one window lit
      g.fillStyle = "#141a40"; g.beginPath(); g.moveTo(560, 268); g.lineTo(596, 196); g.lineTo(632, 196); g.lineTo(668, 268); g.fill();
      g.fillRect(602, 118, 24, 80); g.beginPath(); g.moveTo(596, 120); g.lineTo(614, 86); g.lineTo(632, 120); g.fill();
      glow(g, 614, 146, 22, "255,190,90", 0.9, "lighter"); g.fillStyle = "#ffd98a"; g.fillRect(610, 140, 8, 12);
      ridge(g, r, 290, 44, 20, "#131a40", 0.8);
      // the river, bright where the moon lies on it
      vfill(g, 286, 330, [[0, "#3a4a94"], [1, "#1c2658"]]);
      g.save(); g.globalCompositeOperation = "lighter";
      for (let i = 0; i < 150; i++) { const k = r(), y = 288 + k * 40, x = 826 + (r() - 0.5) * (30 + k * 260); g.fillStyle = rgba("240,236,200", 0.4 * (1 - k * 0.5)); g.fillRect(x, y, 8 + k * 22, 1.4); }
      g.restore();
      // the near bank: pines, rocks, reeds
      for (let i = 0; i < 12; i++) { const x = r() < 0.5 ? r() * 240 : LW - r() * 240; pine(g, r, x, 336 + r() * 8, 110 + r() * 80, "#0a0e28"); }
      ridge(g, r, 350, 26, 16, "#0a0e28", 0.9);
      for (let i = 0; i < 60; i++) { const x = r() * LW, y = 352 + r() * 20; g.strokeStyle = "#060918"; g.lineWidth = 1.6; g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + 2, y - 14, x + (r() - 0.5) * 8, y - 22 - r() * 12); g.stroke(); }
      // mist on the water
      for (let i = 0; i < 6; i++) { const x = r() * LW, y = 300 + r() * 20, w = 160 + r() * 160; g.save(); g.translate(0, y * 0.8); g.scale(1, 0.2); glow(g, x, y, w, "170,180,240", 0.22); g.restore(); }
      grain(g, 12, 1800, 0.04);
    },
  },

  // ---- inside the clockwork tower: a storm at the windows -----------------------------------
  tower: {
    sky(g) {
      vfill(g, 0, LH, [[0, "#0c1024"], [0.6, "#262a4c"], [1, "#3a3656"]]);
      const r = rnd(31);
      for (let i = 0; i < 26; i++) cloud(g, r() * LW, 30 + r() * 250, 0.8 + r() * 1.2, "70,74,110", "30,32,60", 0.85);
    },
    // (on stage the rain really falls; in the storybook it's painted)
    clouds(g) { const r = rnd(33); g.strokeStyle = "rgba(190,200,240,0.28)"; g.lineWidth = 1; for (let i = 0; i < 300; i++) { const x = r() * LW, y = r() * LH; g.beginPath(); g.moveTo(x, y); g.lineTo(x - 5, y + 16); g.stroke(); } },
    fore(g) {
      const r = rnd(37);
      stones(g, r, 0, 0, LW, LH, "#6a5f5c", 60, 26, "rgba(20,14,14,0.45)");
      vfill(g, 0, LH, [[0, "rgba(20,14,30,0.5)"], [0.45, "rgba(0,0,0,0)"], [1, "rgba(20,10,20,0.5)"]]);
      // windows cut through to the storm
      const win = (cx, top, w, h) => {
        g.save(); g.globalCompositeOperation = "destination-out"; g.fillStyle = "#000";
        g.beginPath(); g.moveTo(cx - w, top + h); g.lineTo(cx - w, top); g.arc(cx, top, w, Math.PI, 0); g.lineTo(cx + w, top + h); g.fill(); g.restore();
        // the stone frame, and iron glazing bars
        g.strokeStyle = "#8a7e78"; g.lineWidth = 9; g.beginPath(); g.moveTo(cx - w - 4, top + h); g.lineTo(cx - w - 4, top); g.arc(cx, top, w + 4, Math.PI, 0); g.lineTo(cx + w + 4, top + h); g.stroke();
        g.strokeStyle = "rgba(20,14,20,0.6)"; g.lineWidth = 2; g.beginPath(); g.moveTo(cx - w - 9, top + h); g.lineTo(cx - w - 9, top); g.arc(cx, top, w + 9, Math.PI, 0); g.lineTo(cx + w + 9, top + h); g.stroke();
        g.strokeStyle = "#241c1c"; g.lineWidth = 4; g.beginPath(); g.moveTo(cx, top - w); g.lineTo(cx, top + h);
        for (let y = top + 10; y < top + h; y += h / 3) { g.moveTo(cx - w, y); g.lineTo(cx + w, y); } g.stroke();
        g.fillStyle = "#8a7e78"; g.fillRect(cx - w - 14, top + h, w * 2 + 28, 9);
        g.fillStyle = "rgba(255,255,255,0.14)"; g.fillRect(cx - w - 14, top + h, w * 2 + 28, 2);
      };
      win(512, 118, 66, 172); win(214, 150, 30, 96); win(810, 150, 30, 96);
      // brass pipes with a shine, and their collars
      const pipe = (pts, w) => {
        for (const [lw, col] of [[w, "#5a4424"], [w * 0.62, "#b8893a"], [w * 0.2, "#f0d290"]]) { g.strokeStyle = col; g.lineWidth = lw; g.lineJoin = "round"; g.lineCap = "butt"; g.beginPath(); pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.stroke(); }
        g.fillStyle = "#7a5c2a"; for (const [x, y] of pts.slice(1, -1)) { g.beginPath(); g.arc(x, y, w * 0.8, 0, Math.PI * 2); g.fill(); g.fillStyle = "#d8b060"; g.beginPath(); g.arc(x - 1, y - 1, w * 0.45, 0, Math.PI * 2); g.fill(); g.fillStyle = "#7a5c2a"; }
      };
      pipe([[0, 318], [340, 318], [340, 20], [420, 20], [420, 0]], 15);
      pipe([[1024, 334], [690, 334], [690, 40], [620, 40], [620, 0]], 15);
      pipe([[0, 60], [110, 60], [110, 0]], 10); pipe([[1024, 86], [940, 86], [940, 0]], 10);
      // a pressure dial on each side
      for (const [x, y, a] of [[340, 190, -0.9], [690, 210, 0.6]]) {
        g.fillStyle = "#7a5c2a"; g.beginPath(); g.arc(x, y, 24, 0, Math.PI * 2); g.fill();
        g.fillStyle = "#f2ead2"; g.beginPath(); g.arc(x, y, 19, 0, Math.PI * 2); g.fill();
        g.strokeStyle = "#3a2c20"; g.lineWidth = 1.4; for (let k = 0; k < 9; k++) { const t = Math.PI * (0.8 + k * 0.175); g.beginPath(); g.moveTo(x + Math.cos(t) * 14, y + Math.sin(t) * 14); g.lineTo(x + Math.cos(t) * 18, y + Math.sin(t) * 18); g.stroke(); }
        g.strokeStyle = "#b8242c"; g.lineWidth = 2.4; g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(a - 1.57) * 15, y + Math.sin(a - 1.57) * 15); g.stroke();
        g.fillStyle = "#3a2c20"; g.beginPath(); g.arc(x, y, 3, 0, Math.PI * 2); g.fill();
      }
      // lanterns on the wall, warm against the storm
      for (const x of [118, 906]) {
        glow(g, x, 196, 120, "255,170,70", 0.45, "lighter");
        g.strokeStyle = "#241c1c"; g.lineWidth = 4; g.beginPath(); g.moveTo(x, 150); g.lineTo(x, 178); g.stroke();
        g.fillStyle = "#241c1c"; g.fillRect(x - 12, 176, 24, 5); g.fillRect(x - 10, 214, 20, 5);
        const lg = g.createRadialGradient(x, 198, 2, x, 198, 18); lg.addColorStop(0, "#fff6d0"); lg.addColorStop(1, "#ff9a30"); g.fillStyle = lg; g.fillRect(x - 9, 181, 18, 33);
        g.strokeStyle = "#241c1c"; g.lineWidth = 2; g.strokeRect(x - 9, 181, 18, 33);
      }
      // chains hanging from above
      g.strokeStyle = "#2a2426"; g.lineWidth = 2.2;
      for (const [x, len] of [[268, 120], [760, 96], [450, 56], [580, 70]]) for (let y = 0; y < len; y += 9) { g.beginPath(); g.ellipse(x, y + 4, 3, 5, 0, 0, Math.PI * 2); g.stroke(); }
      // a plank floor line
      vfill(g, 352, LH, [[0, "#3a2a22"], [1, "#241812"]]);
      grain(g, 14, 2400, 0.05);
    },
  },

  // ---- the dragon's cave: crystals, a still pool, a hoard of gold --------------------------------
  cave: {
    sky(g) {
      vfill(g, 0, LH, [[0, "#07051a"], [0.5, "#150d34"], [1, "#221446"]]);
      const r = rnd(3);
      // the far wall, washed with the crystals' light
      for (const [x, y, rad, c] of [[230, 210, 260, "70,170,220"], [780, 190, 280, "150,90,230"], [512, 250, 240, "90,220,210"], [512, 60, 200, "120,100,220"]]) glow(g, x, y, rad, c, 0.3);
      for (let i = 0; i < 60; i++) { g.fillStyle = rgba(r() < 0.5 ? "60,40,100" : "20,14,50", 0.25 * r()); g.beginPath(); g.ellipse(r() * LW, r() * LH, 30 + r() * 90, 20 + r() * 60, r() * 3, 0, Math.PI * 2); g.fill(); }
      // a shaft of light down through a crack in the roof
      g.save(); g.globalCompositeOperation = "lighter";
      const bg = g.createLinearGradient(0, 0, 0, 320); bg.addColorStop(0, "rgba(190,240,255,0.30)"); bg.addColorStop(1, "rgba(190,240,255,0)");
      g.fillStyle = bg; g.beginPath(); g.moveTo(590, 0); g.lineTo(650, 0); g.lineTo(600, 330); g.lineTo(420, 330); g.closePath(); g.fill();
      g.restore();
      // far crystals, dim with distance
      for (const [x, y, s, c] of [[330, 236, 34, "120,220,255"], [700, 226, 38, "200,150,255"], [860, 250, 26, "120,255,220"], [150, 250, 28, "255,150,220"]]) cluster(g, r, x, y, s, c, 5, 1.0, 0.25);
      g.fillStyle = "rgba(10,6,30,0.35)"; g.fillRect(0, 0, LW, LH);
    },
    fore(g) {
      const r = rnd(5);
      // the cave mouth: rock closing in from both wings and the roof
      const rock = (pts, c0, c1) => { const gr = g.createLinearGradient(0, 0, 0, LH); gr.addColorStop(0, c0); gr.addColorStop(1, c1); g.fillStyle = gr; g.beginPath(); pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.closePath(); g.fill(); };
      rock([[0, 0], [250, 0], [214, 34], [178, 50], [150, 96], [118, 120], [104, 178], [72, 214], [84, 268], [50, 300], [60, LH], [0, LH]], "#1c1434", "#2c1e48");
      rock([[LW, 0], [770, 0], [806, 30], [846, 44], [870, 92], [908, 110], [918, 168], [950, 200], [938, 262], [972, 296], [964, LH], [LW, LH]], "#1c1434", "#2c1e48");
      // rim light on the rock, from the crystals
      g.lineWidth = 2.5; g.lineJoin = "round";
      g.strokeStyle = "rgba(120,220,255,0.40)"; g.beginPath(); [[250, 0], [214, 34], [178, 50], [150, 96], [118, 120], [104, 178], [72, 214], [84, 268], [50, 300], [60, LH]].forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.stroke();
      g.strokeStyle = "rgba(200,150,255,0.40)"; g.beginPath(); [[770, 0], [806, 30], [846, 44], [870, 92], [908, 110], [918, 168], [950, 200], [938, 262], [972, 296], [964, LH]].forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.stroke();
      // stalactites
      for (let i = 0; i < 24; i++) {
        const x = 200 + r() * 630, h = 24 + r() * r() * 110, w = 7 + h * 0.13;
        const sg = g.createLinearGradient(x - w, 0, x + w, 0); sg.addColorStop(0, "#3a2c5c"); sg.addColorStop(0.45, "#241a40"); sg.addColorStop(1, "#140e28");
        g.fillStyle = sg; g.beginPath(); g.moveTo(x - w, 0); g.quadraticCurveTo(x - w * 0.3, h * 0.5, x, h); g.quadraticCurveTo(x + w * 0.3, h * 0.5, x + w, 0); g.fill();
        g.strokeStyle = "rgba(150,220,255,0.28)"; g.lineWidth = 1.2; g.beginPath(); g.moveTo(x - w * 0.8, 2); g.quadraticCurveTo(x - w * 0.3, h * 0.5, x, h); g.stroke();
      }
      g.fillStyle = "#1c1434"; g.fillRect(200, 0, 630, 6);
      // crystals hanging from the roof
      for (const [x, y, s, c] of [[300, 16, 46, "190,140,255"], [716, 12, 52, "110,230,255"], [520, 6, 30, "255,150,220"]]) { g.save(); g.translate(x, y); g.scale(1, -1); cluster(g, r, 0, 0, s, c, 5, 1.2); g.restore(); }
      // the floor, and a still pool that holds the light
      vfill(g, 318, LH, [[0, "#241a40"], [1, "#120c26"]]);
      g.save(); g.translate(512, 334); g.scale(1, 0.16);
      const pg = g.createRadialGradient(0, 0, 10, 0, 0, 270); pg.addColorStop(0, "rgba(150,250,255,0.9)"); pg.addColorStop(0.5, "rgba(60,170,220,0.75)"); pg.addColorStop(1, "rgba(30,60,140,0.0)");
      g.fillStyle = pg; g.beginPath(); g.arc(0, 0, 270, 0, Math.PI * 2); g.fill(); g.restore();
      g.strokeStyle = "rgba(220,255,255,0.5)"; g.lineWidth = 1.2; for (let i = 0; i < 16; i++) { const x = 300 + r() * 420, y = 322 + r() * 26, w = 14 + r() * 40; g.beginPath(); g.moveTo(x, y); g.lineTo(x + w, y); g.stroke(); }
      // the hoard: a mound of gold with a crown on top and a chest spilling over
      const hx = 512, hy = 322;
      glow(g, hx, hy - 20, 150, "255,200,90", 0.45, "lighter");
      const mg = g.createLinearGradient(0, hy - 62, 0, hy + 8); mg.addColorStop(0, "#ffe07a"); mg.addColorStop(0.5, "#e2a52e"); mg.addColorStop(1, "#8a5a12");
      g.fillStyle = mg; g.beginPath(); g.moveTo(hx - 118, hy + 6); g.quadraticCurveTo(hx - 70, hy - 30, hx - 30, hy - 48); g.quadraticCurveTo(hx, hy - 68, hx + 34, hy - 46); g.quadraticCurveTo(hx + 78, hy - 28, hx + 122, hy + 6); g.closePath(); g.fill();
      for (let i = 0; i < 170; i++) {
        const t = r() * 2 - 1, top = hy - 58 * (1 - t * t) - 2, x = hx + t * 112, y = top + r() * (hy + 6 - top);
        g.fillStyle = ["#ffe58a", "#f6c444", "#d8962a", "#fff2b8"][Math.floor(r() * 4)];
        g.beginPath(); g.ellipse(x, y, 4.6, 2.6, (r() - 0.5) * 0.8, 0, Math.PI * 2); g.fill();
        g.strokeStyle = "rgba(110,66,10,0.55)"; g.lineWidth = 0.7; g.stroke();
      }
      // a crown
      g.fillStyle = "#ffd866"; g.beginPath(); g.moveTo(hx - 16, hy - 56); g.lineTo(hx - 18, hy - 78); g.lineTo(hx - 9, hy - 66); g.lineTo(hx, hy - 82); g.lineTo(hx + 9, hy - 66); g.lineTo(hx + 18, hy - 78); g.lineTo(hx + 16, hy - 56); g.closePath(); g.fill();
      g.strokeStyle = "#8a5a12"; g.lineWidth = 1; g.stroke();
      for (const [dx, c] of [[-9, "#e8486a"], [0, "#5ad8ff"], [9, "#7ae07a"]]) { g.fillStyle = c; g.beginPath(); g.arc(hx + dx, hy - 61, 2.4, 0, Math.PI * 2); g.fill(); }
      // a goblet and a few loose gems
      g.fillStyle = "#f6c444"; g.beginPath(); g.moveTo(hx + 58, hy - 40); g.lineTo(hx + 76, hy - 40); g.quadraticCurveTo(hx + 74, hy - 26, hx + 69, hy - 24); g.lineTo(hx + 69, hy - 16); g.lineTo(hx + 75, hy - 13); g.lineTo(hx + 59, hy - 13); g.lineTo(hx + 65, hy - 16); g.lineTo(hx + 65, hy - 24); g.quadraticCurveTo(hx + 60, hy - 26, hx + 58, hy - 40); g.fill();
      for (const [dx, dy, c] of [[-70, -14, "#e8486a"], [-40, -36, "#5ad8ff"], [30, -30, "#b47aff"], [86, -6, "#7ae07a"], [-96, 0, "#b47aff"]]) { g.fillStyle = c; g.beginPath(); g.moveTo(hx + dx, hy + dy - 6); g.lineTo(hx + dx + 5, hy + dy); g.lineTo(hx + dx, hy + dy + 5); g.lineTo(hx + dx - 5, hy + dy); g.closePath(); g.fill(); g.fillStyle = "rgba(255,255,255,0.7)"; g.fillRect(hx + dx - 1.5, hy + dy - 3, 2, 2); }
      for (let i = 0; i < 14; i++) { const t = r() * 2 - 1; sparkle(g, hx + t * 104, hy - 6 - r() * 52 * (1 - t * t), 3 + r() * 5, "255,252,220", 0.95); }
      // stalagmites, and the great crystals at the wings
      for (const [x, h, w] of [[196, 60, 20], [250, 34, 14], [826, 70, 22], [770, 38, 14], [356, 22, 12], [668, 26, 12]]) {
        const sg = g.createLinearGradient(x - w, 0, x + w, 0); sg.addColorStop(0, "#3c2e60"); sg.addColorStop(0.5, "#261c44"); sg.addColorStop(1, "#150f2a");
        g.fillStyle = sg; g.beginPath(); g.moveTo(x - w, LH - 28); g.quadraticCurveTo(x - w * 0.3, LH - 28 - h * 0.5, x, LH - 28 - h); g.quadraticCurveTo(x + w * 0.3, LH - 28 - h * 0.5, x + w, LH - 28); g.fill();
      }
      cluster(g, r, 138, 342, 132, "110,230,255", 7, 1.25);
      cluster(g, r, 884, 346, 142, "190,140,255", 7, 1.25);
      cluster(g, r, 268, 352, 54, "255,150,220", 5, 1.3);
      cluster(g, r, 744, 354, 50, "120,255,220", 5, 1.3);
      cluster(g, r, 36, 360, 70, "190,140,255", 4, 0.9);
      cluster(g, r, 992, 362, 66, "110,230,255", 4, 0.9);
      // motes in the air
      for (let i = 0; i < 60; i++) { const x = 100 + r() * 824, y = 30 + r() * 280; glow(g, x, y, 5 + r() * 4, r() < 0.5 ? "170,240,255" : "220,180,255", 0.7, "lighter"); }
      grain(g, 21, 1600, 0.035);
    },
  },

  // ---- the night sky above the kingdom ---------------------------------------------------------
  sky: {
    sky(g) {
      vfill(g, 0, LH, [[0, "#050a26"], [0.45, "#141e5a"], [0.8, "#3a3a8a"], [1, "#7a5a9a"]]);
      const r = rnd(23);
      // the river of stars
      g.save(); g.translate(430, 150); g.rotate(-0.42);
      for (let i = 0; i < 900; i++) { const x = (r() - 0.5) * 1300, y = (r() + r() + r() - 1.5) * 50; g.fillStyle = rgba(r() < 0.3 ? "200,190,255" : "255,255,255", 0.12 + r() * 0.4); g.fillRect(x, y, 1.2, 1.2); }
      g.restore();
      glow(g, 300, 200, 300, "90,80,190", 0.22);
      stars(g, r, 320, 320);
      // northern lights
      g.save(); g.globalCompositeOperation = "lighter";
      for (const [y0, amp, c, a] of [[120, 26, "70,255,180", 0.16], [150, 34, "90,200,255", 0.13], [96, 20, "170,120,255", 0.11]]) {
        for (let x = 0; x < 560; x += 3) { const y = y0 + Math.sin(x * 0.013 + y0) * amp + Math.sin(x * 0.041) * amp * 0.3, h = 70 + Math.sin(x * 0.07 + y0) * 26; const gr = g.createLinearGradient(0, y - h, 0, y); gr.addColorStop(0, rgba(c, 0)); gr.addColorStop(1, rgba(c, a * (1 - x / 620))); g.fillStyle = gr; g.fillRect(x, y - h, 3, h); }
      }
      g.restore();
      moon(g, 790, 150, 50);
    },
    clouds(g) { for (const [x, y, s] of [[120, 200, 0.9], [420, 150, 0.6], [640, 230, 0.8], [930, 180, 0.7]]) cloud(g, x, y, s, "150,160,224", "70,80,150", 0.6); },
    fore(g) {
      const r = rnd(47);
      // far mountains, then the kingdom's towers rising out of a sea of cloud
      ridge(g, r, 320, 70, 30, "#1c2460", 0.9);
      for (const [x, tw, th] of [[150, 34, 110], [196, 52, 76], [262, 30, 132], [850, 40, 104], [902, 28, 140], [940, 44, 70]]) {
        const top = 330 - th;
        const tg = g.createLinearGradient(x, 0, x + tw, 0); tg.addColorStop(0, "#2a3478"); tg.addColorStop(1, "#141a48");
        g.fillStyle = tg; g.fillRect(x, top, tw, th + 40);
        g.fillStyle = "#1a2256"; g.beginPath(); g.moveTo(x - 5, top); g.lineTo(x + tw / 2, top - tw * 1.1); g.lineTo(x + tw + 5, top); g.fill();
        for (let k = 0; k < 3; k++) if (r() < 0.75) { const wx = x + tw * (0.3 + r() * 0.4), wy = top + 14 + k * 24; glow(g, wx, wy + 4, 12, "255,200,100", 0.8, "lighter"); g.fillStyle = "#ffe0a0"; g.fillRect(wx - 2.5, wy, 5, 8); }
      }
      for (let pass = 0; pass < 2; pass++) for (let i = 0; i < 20; i++) {
        const x = (i / 19) * LW + (r() - 0.5) * 40, y = 338 + pass * 22 + r() * 14;
        cloud(g, x, y, 1.1 + r() * 0.7, pass ? "226,230,255" : "170,178,236", pass ? "150,158,220" : "110,118,190", 1);
      }
      vfill(g, 350, LH, [[0, "rgba(226,230,255,0)"], [0.5, "rgba(226,230,255,0.9)"], [1, "rgba(200,206,246,1)"]]);
      grain(g, 31, 1200, 0.03);
    },
  },

  // ---- the harbour laundry: whitewashed houses, washing lines, the sea beyond ----------------
  laundry: {
    sky(g) {
      vfill(g, 0, LH, [[0, "#3f92e0"], [0.5, "#92caf2"], [0.8, "#e8f2f4"], [1, "#f6ecd4"]]);
      glow(g, 840, 58, 220, "255,246,210", 0.7);
      glow(g, 840, 58, 46, "255,255,240", 0.95);
    },
    clouds(g) { for (const [x, y, s] of [[150, 88, 0.75], [420, 52, 1.0], [700, 104, 0.7], [960, 70, 0.9]]) cloud(g, x, y, s); },
    fore(g) {
      const r = rnd(71);
      // the sea between the houses, a lighthouse on its rock, two little sails
      vfill(g, 188, 300, [[0, "#6fbce4"], [1, "#2f78b0"]]);
      g.strokeStyle = "rgba(255,255,255,0.5)"; g.lineWidth = 1.4;
      for (let i = 0; i < 40; i++) { const x = r() * LW, y = 194 + r() * 90; g.beginPath(); g.moveTo(x, y); g.lineTo(x + 8 + r() * 10, y); g.stroke(); }
      g.fillStyle = "#6a6458"; g.beginPath(); g.ellipse(520, 214, 40, 12, 0, Math.PI, 0); g.fill();
      for (let k = 0; k < 5; k++) { g.fillStyle = k % 2 ? "#d8322a" : "#f6f0e4"; g.fillRect(510 - k * 0.6, 204 - (k + 1) * 14, 20 + k * 1.2, 14); }
      g.fillStyle = "#3a3a44"; g.fillRect(508, 124, 24, 12); g.fillStyle = "#fff3b0"; g.fillRect(512, 126, 16, 8); glow(g, 520, 130, 30, "255,240,170", 0.5);
      g.fillStyle = "#d8322a"; g.beginPath(); g.moveTo(504, 124); g.lineTo(520, 110); g.lineTo(536, 124); g.fill();
      for (const [x, y, c] of [[430, 236, "#f6f0e4"], [640, 250, "#e8b838"]]) { g.fillStyle = "#7a5432"; g.fillRect(x - 12, y, 24, 5); g.fillStyle = c; g.beginPath(); g.moveTo(x, y - 24); g.lineTo(x, y); g.lineTo(x + 14, y); g.fill(); }
      // gulls
      g.strokeStyle = "#3a4250"; g.lineWidth = 1.6;
      for (const [x, y] of [[380, 120], [402, 108], [660, 96], [300, 150]]) { g.beginPath(); g.moveTo(x - 8, y); g.quadraticCurveTo(x - 4, y - 5, x, y); g.quadraticCurveTo(x + 4, y - 5, x + 8, y); g.stroke(); }
      // the houses: whitewashed and pastel, terracotta roofs, blue shutters, window boxes
      const walls = ["#f6f0e2", "#f2e2c4", "#e8eef2", "#f6d8c8", "#eef0dc"];
      const house = (x, w, top, wall, flat) => {
        const base = 312;
        g.fillStyle = wall; g.fillRect(x, top, w, base - top);
        g.fillStyle = "rgba(60,40,30,0.14)"; g.fillRect(x + w - 10, top, 10, base - top);
        if (flat) { g.fillStyle = "#c8643a"; g.fillRect(x - 4, top - 8, w + 8, 10); g.fillStyle = "rgba(0,0,0,0.15)"; g.fillRect(x - 4, top + 1, w + 8, 2); }
        else {
          g.fillStyle = "#c25a34"; g.beginPath(); g.moveTo(x - 8, top); g.lineTo(x + w / 2, top - w * 0.42); g.lineTo(x + w + 8, top); g.closePath(); g.fill();
          g.strokeStyle = "rgba(120,40,20,0.5)"; g.lineWidth = 1; for (let k = 1; k < 7; k++) { g.beginPath(); g.moveTo(x - 8 + k * (w + 16) / 7, top); g.lineTo(x + w / 2, top - w * 0.42); g.stroke(); }
        }
        for (let wy = top + 22; wy < base - 50; wy += 46) for (let wx = x + 14; wx < x + w - 24; wx += 34) {
          g.fillStyle = "#2a3a4a"; g.fillRect(wx, wy, 16, 22);
          g.fillStyle = "#2f6ac8"; g.fillRect(wx - 7, wy, 6, 22); g.fillRect(wx + 17, wy, 6, 22);
          g.fillStyle = "#7a5432"; g.fillRect(wx - 3, wy + 22, 22, 5);
          for (let f = 0; f < 4; f++) { g.fillStyle = ["#e8384a", "#f0c030", "#e8487a"][f % 3]; g.beginPath(); g.arc(wx + 1 + f * 5, wy + 20, 2.4, 0, Math.PI * 2); g.fill(); }
        }
        g.fillStyle = "#6a4426"; g.beginPath(); g.moveTo(x + w / 2 - 11, base); g.lineTo(x + w / 2 - 11, base - 30); g.arc(x + w / 2, base - 30, 11, Math.PI, 0); g.lineTo(x + w / 2 + 11, base); g.fill();
      };
      const row = [[-6, 104, 128], [104, 92, 160, true], [200, 110, 110], [336, 96, 150, true], [560, 104, 132], [668, 96, 150], [768, 110, 118, true], [882, 100, 140], [985, 60, 160]];
      row.forEach(([x, w, top, flat], i) => { if (x > 410 && x < 540) return; house(x, w, top, walls[i % walls.length], flat); });
      // washing lines strung between the houses, full of laundry
      const line = (x0, y0, x1, y1, sag) => {
        g.strokeStyle = "#5a4a3a"; g.lineWidth = 1.4; g.beginPath(); g.moveTo(x0, y0); g.quadraticCurveTo((x0 + x1) / 2, (y0 + y1) / 2 + sag, x1, y1); g.stroke();
        const at = (k) => { const u = 1 - k; return [u * u * x0 + 2 * u * k * (x0 + x1) / 2 + k * k * x1, u * u * y0 + 2 * u * k * ((y0 + y1) / 2 + sag) + k * k * y1]; };
        for (let k = 0.12; k < 0.92; k += 0.13 + r() * 0.06) {
          const [x, y] = at(k), kind = r(), col = ["#e8384a", "#2f8ad8", "#f0c030", "#3aa858", "#f6f0e4", "#9a4ad8", "#f07a2a"][Math.floor(r() * 7)];
          g.fillStyle = col;
          if (kind < 0.35) { g.beginPath(); g.moveTo(x - 10, y); g.lineTo(x + 10, y); g.lineTo(x + 14, y + 8); g.lineTo(x + 8, y + 10); g.lineTo(x + 8, y + 26); g.lineTo(x - 8, y + 26); g.lineTo(x - 8, y + 10); g.lineTo(x - 14, y + 8); g.closePath(); g.fill(); }
          else if (kind < 0.7) { g.fillRect(x - 3, y, 6, 14); g.beginPath(); g.ellipse(x + 2, y + 15, 6, 3.5, 0, 0, Math.PI * 2); g.fill(); g.fillStyle = "rgba(255,255,255,0.7)"; g.fillRect(x - 3, y + 2, 6, 2); }
          else { g.fillRect(x - 12, y, 24, 30); g.fillStyle = "rgba(0,0,0,0.08)"; g.fillRect(x + 6, y, 6, 30); }
          g.fillStyle = "#c8955a"; g.fillRect(x - 1, y - 3, 2, 6);
        }
      };
      line(96, 172, 210, 168, 18); line(306, 184, 450, 150, 22); line(600, 170, 676, 176, 12); line(758, 178, 890, 172, 20);
      // the quay: a stone wall, then cobbles
      stones(g, r, 0, 300, LW, 334, "#b8ae9c", 30, 14);
      vfill(g, 300, 334, [[0, "rgba(255,250,235,0.18)"], [1, "rgba(30,24,20,0.3)"]]);
      vfill(g, 334, LH, [[0, "#a8a090"], [1, "#8a8274"]]);
      for (let y = 338; y < LH; y += 9) for (let x = (y % 2) * 7; x < LW; x += 14) { g.fillStyle = `rgba(${r() < 0.5 ? "255,255,255" : "40,30,20"},${0.06 + r() * 0.1})`; g.beginPath(); g.ellipse(x, y, 6, 3.4, 0, 0, Math.PI * 2); g.fill(); }
      // bollards and a coil of rope on the quay
      for (const x of [60, 960]) { g.fillStyle = "#2a2a30"; g.fillRect(x - 7, 300, 14, 22); g.beginPath(); g.ellipse(x, 300, 10, 4, 0, 0, Math.PI * 2); g.fill(); }
      grain(g, 73, 2000, 0.04);
    },
  },

  // ---- the toymaker's workshop: a plank wall in lamplight, clocks, shelves of toys ----------
  workshop: {
    sky(g) {
      // the night outside the windows: a deep sky, the moon, a village's rooftops
      vfill(g, 0, LH, [[0, "#0d1534"], [0.55, "#24346a"], [1, "#43507e"]]);
      const r = rnd(61);
      stars(g, r, 140, 260);
      moon(g, 300, 96, 26);
      g.fillStyle = "#151a34";
      for (let x = -20; x < LW; x += 46 + r() * 40) {
        const w = 40 + r() * 46, h = 50 + r() * 70, base = 330;
        g.fillRect(x, base - h, w, h + 50);
        g.beginPath(); g.moveTo(x - 6, base - h); g.lineTo(x + w / 2, base - h - 30 - r() * 16); g.lineTo(x + w + 6, base - h); g.fill();
        if (r() < 0.5) { g.fillStyle = "rgba(255,200,110,0.85)"; g.fillRect(x + w * 0.3, base - h + 18, 7, 9); g.fillStyle = "#151a34"; }
      }
    },
    fore(g) {
      const r = rnd(67);
      // the wall: vertical planks, each its own shade, with grain, knots and nail heads
      const plank = (x, w, y0, y1) => {
        const tone = r();
        const base = [[156, 104, 62], [140, 92, 54], [168, 116, 70], [128, 84, 48]][Math.floor(tone * 4)];
        const lg = g.createLinearGradient(x, 0, x + w, 0);
        lg.addColorStop(0, `rgb(${base[0] - 18},${base[1] - 14},${base[2] - 10})`); lg.addColorStop(0.5, `rgb(${base})`); lg.addColorStop(1, `rgb(${base[0] - 26},${base[1] - 20},${base[2] - 14})`);
        g.fillStyle = lg; g.fillRect(x, y0, w, y1 - y0);
        // grain: long wavy streaks running up the board, a cathedral arch here and there
        g.save(); g.beginPath(); g.rect(x, y0, w, y1 - y0); g.clip();
        for (let k = 0; k < 16; k++) {
          const gx = x + r() * w, ph = r() * 6, amp = 1 + r() * 3;
          g.strokeStyle = r() < 0.6 ? `rgba(70,38,16,${0.12 + r() * 0.2})` : `rgba(255,220,170,${0.06 + r() * 0.08})`;
          g.lineWidth = 0.5 + r() * 1.4;
          g.beginPath(); for (let y = y0; y <= y1; y += 6) { const xx = gx + Math.sin(y * 0.018 + ph) * amp; y === y0 ? g.moveTo(xx, y) : g.lineTo(xx, y); } g.stroke();
        }
        if (r() < 0.6) {
          const cx = x + w * (0.3 + r() * 0.4), cy = y0 + r() * (y1 - y0), n = 5 + Math.floor(r() * 4);
          for (let k = n; k > 0; k--) { g.strokeStyle = `rgba(80,42,16,${0.18 + 0.05 * k})`; g.lineWidth = 1.2; g.beginPath(); g.moveTo(cx - k * 3.2, cy + 40); g.quadraticCurveTo(cx, cy - k * 9, cx + k * 3.2, cy + 40); g.stroke(); }
        }
        if (r() < 0.45) {
          const kx = x + w * (0.25 + r() * 0.5), ky = y0 + 20 + r() * (y1 - y0 - 40), kr = 3 + r() * 4;
          for (let k = 4; k > 0; k--) { g.strokeStyle = `rgba(70,34,12,${0.22 + 0.08 * k})`; g.lineWidth = 1.1; g.beginPath(); g.ellipse(kx, ky, kr * k * 0.5 + 1, kr * k * 0.9 + 2, 0, 0, Math.PI * 2); g.stroke(); }
          g.fillStyle = "rgba(60,28,10,0.8)"; g.beginPath(); g.ellipse(kx, ky, kr * 0.6, kr, 0, 0, Math.PI * 2); g.fill();
        }
        g.restore();
        // the seams between boards, lit on one edge
        g.fillStyle = "rgba(30,14,6,0.7)"; g.fillRect(x, y0, 1.6, y1 - y0);
        g.fillStyle = "rgba(255,226,180,0.14)"; g.fillRect(x + 1.6, y0, 1.2, y1 - y0);
        g.fillStyle = "#3a2a20"; for (const y of [y0 + 40, y1 - 18]) { g.beginPath(); g.arc(x + w / 2, y, 1.8, 0, Math.PI * 2); g.fill(); }
      };
      for (let x = 0; x < LW; x += 34 + Math.floor(r() * 12)) plank(x, 46, 0, 352);
      // two windows, cut through to the night
      const pane = (cx, cy, w, h) => {
        g.save(); g.globalCompositeOperation = "destination-out"; g.fillStyle = "#000";
        g.beginPath(); g.moveTo(cx - w, cy + h); g.lineTo(cx - w, cy - h + w); g.arc(cx, cy - h + w, w, Math.PI, 0); g.lineTo(cx + w, cy + h); g.fill(); g.restore();
        const frame = (lw, col, pad) => { g.strokeStyle = col; g.lineWidth = lw; g.beginPath(); g.moveTo(cx - w - pad, cy + h); g.lineTo(cx - w - pad, cy - h + w); g.arc(cx, cy - h + w, w + pad, Math.PI, 0); g.lineTo(cx + w + pad, cy + h); g.stroke(); };
        frame(12, "#5a3820", 5); frame(3, "#8a5a32", 1); frame(2, "rgba(20,8,2,0.6)", 11);
        g.strokeStyle = "#4a2e1a"; g.lineWidth = 5; g.beginPath(); g.moveTo(cx, cy - h); g.lineTo(cx, cy + h); g.moveTo(cx - w, cy + 4); g.lineTo(cx + w, cy + 4); g.stroke();
        g.fillStyle = "#6a4426"; g.fillRect(cx - w - 16, cy + h, w * 2 + 32, 11);
        g.fillStyle = "rgba(255,230,190,0.2)"; g.fillRect(cx - w - 16, cy + h, w * 2 + 32, 2);
        // a pot of geraniums on the sill
        g.fillStyle = "#b0603a"; g.beginPath(); g.moveTo(cx + w - 30, cy + h); g.lineTo(cx + w - 26, cy + h - 16); g.lineTo(cx + w - 8, cy + h - 16); g.lineTo(cx + w - 4, cy + h); g.fill();
        for (let k = 0; k < 7; k++) { g.fillStyle = k % 2 ? "#3c7a2e" : "#56963c"; g.beginPath(); g.arc(cx + w - 17 + (r() - 0.5) * 22, cy + h - 22 - r() * 10, 5, 0, Math.PI * 2); g.fill(); }
        for (let k = 0; k < 4; k++) { g.fillStyle = "#e8384a"; g.beginPath(); g.arc(cx + w - 17 + (r() - 0.5) * 18, cy + h - 28 - r() * 8, 2.6, 0, Math.PI * 2); g.fill(); }
      };
      pane(300, 132, 52, 76);
      pane(744, 140, 40, 62);
      // the lamp's warm light, pooling on the wall
      glow(g, 140, 120, 300, "255,170,80", 0.32, "lighter");
      glow(g, 880, 150, 220, "255,170,80", 0.18, "lighter");
      // a beam across the top, with wooden pegs
      vfill(g, 0, 26, [[0, "#3a2414"], [1, "#5a3a22"]]);
      g.fillStyle = "rgba(0,0,0,0.3)"; g.fillRect(0, 26, LW, 6);
      // the shelf of toys and unfinished puppets (right of centre)
      const shelf = (x0, x1, y) => {
        g.fillStyle = "rgba(20,10,4,0.35)"; g.fillRect(x0 + 4, y + 8, x1 - x0, 10);
        const sg = g.createLinearGradient(0, y, 0, y + 9); sg.addColorStop(0, "#8a5a32"); sg.addColorStop(1, "#5a3820");
        g.fillStyle = sg; g.fillRect(x0, y, x1 - x0, 9);
        for (const bx of [x0 + 14, x1 - 20]) { g.fillStyle = "#4a2e1a"; g.beginPath(); g.moveTo(bx, y + 9); g.lineTo(bx + 6, y + 9); g.lineTo(bx + 6, y + 30); g.closePath(); g.fill(); }
      };
      shelf(440, 664, 112); shelf(440, 664, 214);
      // top shelf: three carved heads waiting for their faces, a drum, a spinning top
      for (const [x, painted] of [[462, false], [494, true], [526, false]]) {
        g.fillStyle = "#4a2e1a"; g.fillRect(x - 2, 96, 4, 16);
        const hg = g.createRadialGradient(x - 4, 86, 2, x, 90, 13); hg.addColorStop(0, "#f2c690"); hg.addColorStop(1, "#b07a44");
        g.fillStyle = hg; g.beginPath(); g.ellipse(x, 88, 11, 13, 0, 0, Math.PI * 2); g.fill();
        if (painted) { g.fillStyle = "#1a120c"; g.beginPath(); g.arc(x - 4, 86, 1.6, 0, Math.PI * 2); g.arc(x + 4, 86, 1.6, 0, Math.PI * 2); g.fill(); g.fillStyle = "rgba(230,120,100,0.6)"; g.beginPath(); g.arc(x - 7, 92, 2.4, 0, Math.PI * 2); g.arc(x + 7, 92, 2.4, 0, Math.PI * 2); g.fill(); g.strokeStyle = "#e2ab6c"; g.lineWidth = 3; g.beginPath(); g.moveTo(x, 89); g.lineTo(x + 9, 90); g.stroke(); }
      }
      // a toy drum
      g.fillStyle = "#b8242c"; g.fillRect(560, 88, 34, 24); g.fillStyle = "#f2ead8"; g.beginPath(); g.ellipse(577, 88, 17, 5, 0, 0, Math.PI * 2); g.fill();
      g.strokeStyle = "#e8c060"; g.lineWidth = 1.6; g.beginPath(); for (let k = 0; k < 5; k++) { g.moveTo(560 + k * 8.5, 90); g.lineTo(564 + k * 8.5, 110); } g.stroke();
      g.strokeStyle = "#5a3820"; g.lineWidth = 2; g.beginPath(); g.moveTo(590, 80); g.lineTo(606, 66); g.moveTo(596, 82); g.lineTo(614, 72); g.stroke();
      // a spinning top
      g.fillStyle = "#2f66c8"; g.beginPath(); g.moveTo(628, 92); g.quadraticCurveTo(650, 92, 644, 104); g.lineTo(636, 112); g.lineTo(628, 104); g.quadraticCurveTo(622, 92, 628, 92); g.fill();
      g.fillStyle = "#e8c060"; g.fillRect(626, 96, 20, 3); g.fillStyle = "#5a3820"; g.fillRect(634, 82, 3, 10);
      // lower shelf: a rocking horse, toy soldiers, paint pots
      g.fillStyle = "#e8dcc4"; g.beginPath(); g.ellipse(482, 190, 22, 9, 0, 0, Math.PI * 2); g.fill();
      g.beginPath(); g.moveTo(498, 186); g.lineTo(510, 166); g.lineTo(518, 170); g.lineTo(508, 192); g.fill();
      g.fillStyle = "#5a3820"; for (const lx of [466, 474, 490, 498]) g.fillRect(lx, 196, 3, 10);
      g.strokeStyle = "#b8242c"; g.lineWidth = 3; g.beginPath(); g.arc(482, 182, 30, 0.3 * Math.PI, 0.7 * Math.PI); g.stroke();
      g.fillStyle = "#3a2414"; g.beginPath(); g.moveTo(510, 166); g.quadraticCurveTo(500, 168, 498, 180); g.lineTo(504, 178); g.fill();
      for (let k = 0; k < 4; k++) {
        const x = 540 + k * 14;
        g.fillStyle = "#b8242c"; g.fillRect(x, 186, 8, 14); g.fillStyle = "#2a2a3a"; g.fillRect(x, 200, 8, 13);
        g.fillStyle = "#f0c8a0"; g.beginPath(); g.arc(x + 4, 182, 4, 0, Math.PI * 2); g.fill();
        g.fillStyle = "#151515"; g.fillRect(x, 170, 8, 10);
      }
      for (const [x, c] of [[608, "#2f66c8"], [624, "#e8b838"], [640, "#3c8a46"]]) { g.fillStyle = "#c8c0b0"; g.fillRect(x, 196, 12, 18); g.fillStyle = c; g.fillRect(x, 196, 12, 5); g.fillStyle = c; g.beginPath(); g.arc(x + 6, 192, 4, 0, Math.PI, true); g.fill(); }
      // clocks: the workshop never stops ticking
      const clock = (x, y, R, frame, a1, a2) => {
        g.fillStyle = "rgba(20,10,4,0.35)"; g.beginPath(); g.arc(x + 4, y + 5, R + 4, 0, Math.PI * 2); g.fill();
        g.fillStyle = frame; g.beginPath(); g.arc(x, y, R + 4, 0, Math.PI * 2); g.fill();
        g.fillStyle = "#f4ead2"; g.beginPath(); g.arc(x, y, R, 0, Math.PI * 2); g.fill();
        g.strokeStyle = "#3a2414"; g.lineWidth = 1.2; for (let k = 0; k < 12; k++) { const a = k * Math.PI / 6; g.beginPath(); g.moveTo(x + Math.cos(a) * R * 0.78, y + Math.sin(a) * R * 0.78); g.lineTo(x + Math.cos(a) * R * 0.92, y + Math.sin(a) * R * 0.92); g.stroke(); }
        g.lineWidth = 2.4; g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(a1) * R * 0.5, y + Math.sin(a1) * R * 0.5); g.stroke();
        g.lineWidth = 1.5; g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(a2) * R * 0.78, y + Math.sin(a2) * R * 0.78); g.stroke();
        g.fillStyle = "#3a2414"; g.beginPath(); g.arc(x, y, 2, 0, Math.PI * 2); g.fill();
      };
      clock(400, 64, 18, "#6a4426", -2.1, -0.4); clock(706, 56, 14, "#b8893a", 0.6, -1.9); clock(856, 82, 22, "#5a3820", -1.0, 1.3);
      // the tool board (left of the window): a saw, a mallet, chisels, a brace, a coil of string
      g.fillStyle = "#7a5432"; g.fillRect(70, 58, 150, 170); g.fillStyle = "rgba(20,10,4,0.35)"; g.fillRect(74, 228, 150, 8);
      g.fillStyle = "rgba(40,20,8,0.45)"; for (let yy = 70; yy < 224; yy += 14) for (let xx = 80; xx < 216; xx += 14) { g.beginPath(); g.arc(xx, yy, 1.4, 0, Math.PI * 2); g.fill(); }
      // saw
      g.fillStyle = "#c8ccd2"; g.beginPath(); g.moveTo(92, 82); g.lineTo(150, 82); g.lineTo(150, 100); g.lineTo(96, 120); g.closePath(); g.fill();
      g.fillStyle = "#8a8e96"; for (let k = 0; k < 10; k++) { g.beginPath(); g.moveTo(98 + k * 5.2, 118 - k * 1.8); g.lineTo(100.6 + k * 5.2, 122 - k * 1.8); g.lineTo(103.2 + k * 5.2, 116.4 - k * 1.8); g.fill(); }
      g.fillStyle = "#8a4a24"; g.beginPath(); g.roundRect(148, 78, 26, 26, 6); g.fill(); g.fillStyle = "#7a5432"; g.beginPath(); g.roundRect(156, 85, 10, 12, 3); g.fill();
      // mallet
      g.fillStyle = "#b07a44"; g.fillRect(188, 74, 6, 54); g.fillStyle = "#8a5a32"; g.beginPath(); g.roundRect(176, 66, 30, 16, 4); g.fill();
      // chisels
      for (let k = 0; k < 4; k++) { const x = 92 + k * 14; g.fillStyle = "#a86a3a"; g.beginPath(); g.roundRect(x - 3, 140, 7, 22, 3); g.fill(); g.fillStyle = "#b8bec6"; g.fillRect(x - 1.5, 162, 4, 22 - k * 2); }
      // a brace (hand drill)
      g.strokeStyle = "#7a7e86"; g.lineWidth = 3; g.beginPath(); g.moveTo(160, 140); g.lineTo(160, 150); g.lineTo(178, 158); g.lineTo(160, 168); g.lineTo(160, 190); g.stroke();
      g.fillStyle = "#8a4a24"; g.beginPath(); g.arc(160, 138, 6, 0, Math.PI * 2); g.fill(); g.beginPath(); g.roundRect(174, 152, 9, 12, 3); g.fill();
      // string for the puppets, on a peg
      g.strokeStyle = "#e8dcc0"; g.lineWidth = 1.2; for (let k = 0; k < 7; k++) { g.beginPath(); g.ellipse(198, 196, 12 - k * 0.4, 16 - k * 0.6, 0.2, 0, Math.PI * 2); g.stroke(); }
      // a little cuckoo clock high on the right
      { const x = 960, y = 168;
        g.fillStyle = "#4a2e1a"; g.beginPath(); g.moveTo(x - 30, y - 30); g.lineTo(x, y - 54); g.lineTo(x + 30, y - 30); g.closePath(); g.fill();
        g.fillStyle = "#6a4426"; g.fillRect(x - 24, y - 32, 48, 50);
        g.fillStyle = "#f4ead2"; g.beginPath(); g.arc(x, y - 4, 14, 0, Math.PI * 2); g.fill();
        g.strokeStyle = "#3a2414"; g.lineWidth = 2; g.beginPath(); g.moveTo(x, y - 4); g.lineTo(x + 5, y - 13); g.moveTo(x, y - 4); g.lineTo(x - 8, y - 2); g.stroke();
        g.fillStyle = "#2a1a10"; g.fillRect(x - 6, y - 30, 12, 10);
        g.strokeStyle = "#2a2426"; g.lineWidth = 1.4; for (const dx of [-10, 10]) { g.beginPath(); g.moveTo(x + dx, y + 18); g.lineTo(x + dx, y + 70 + dx); g.stroke(); g.fillStyle = "#b8893a"; g.beginPath(); g.ellipse(x + dx, y + 78 + dx, 5, 9, 0, 0, Math.PI * 2); g.fill(); }
      }
      // the floor: worn boards, with sawdust
      vfill(g, 340, LH, [[0, "#5a3a22"], [1, "#3a2414"]]);
      g.strokeStyle = "rgba(20,10,4,0.5)"; g.lineWidth = 1.4; for (let y = 346; y < LH; y += 9) { g.beginPath(); g.moveTo(0, y); g.lineTo(LW, y); g.stroke(); }
      g.fillStyle = "rgba(240,200,140,0.35)"; for (let i = 0; i < 120; i++) { g.beginPath(); g.ellipse(r() * LW, 342 + r() * 32, 1.5 + r() * 2.5, 0.8 + r(), r() * 3, 0, Math.PI * 2); g.fill(); }
      grain(g, 69, 2200, 0.045);
    },
  },
};

// ---- layers and composites, built once each -------------------------------------------------
const cache = new Map();
function layer(name, kind, scale, w = LW) {
  const key = `${name}/${kind}`;
  if (!cache.has(key)) {
    const c = mk(Math.round(w * scale), Math.round(LH * scale));
    const g = c.getContext("2d");
    g.scale(scale, scale);
    PAINT[name][kind]?.(g);
    cache.set(key, c);
  }
  return cache.get(key);
}
export const hasBackdrop = (name) => !!PAINT[name];
export const skyLayer = (name) => layer(name, "sky", SKY_SCALE);
export const foreLayer = (name) => layer(name, "fore", FORE_SCALE);
// the drifting layer (clouds or mist): the same puffs, but painted so the strip tiles sideways
export function driftLayer(name) {
  const key = `${name}/drift`;
  if (!cache.has(key)) {
    const c = mk(LW, LH), g = c.getContext("2d");
    for (const dx of [-LW, 0, LW]) { g.save(); g.translate(dx, 0); PAINT[name].clouds?.(g); g.restore(); }
    cache.set(key, c);
  }
  return cache.get(key);
}
// the whole picture in one piece (for the storybook, the cards and the menu)
export function composite(name) {
  if (!PAINT[name]) name = "courtyard";
  const key = `${name}/all`;
  if (!cache.has(key)) {
    const c = mk(LW * FORE_SCALE, LH * FORE_SCALE), g = c.getContext("2d");
    g.drawImage(skyLayer(name), 0, 0, c.width, c.height);
    g.save(); g.scale(FORE_SCALE, FORE_SCALE); PAINT[name].clouds?.(g); g.restore();
    g.drawImage(foreLayer(name), 0, 0);
    g.save(); g.scale(FORE_SCALE, FORE_SCALE); vignette(g, 0.3); g.restore();
    cache.set(key, c);
  }
  return cache.get(key);
}
// Paint the backdrop into a w x h box of any shape: it's cropped to fill, never squashed.
// focus (0..1) picks which part of a wide scene a narrow box looks at.
const FOCUS = { courtyard: 0.5, forest: 0.66, ship: 0.86, bridge: 0.84, tower: 0.5, cave: 0.5, sky: 0.82, workshop: 0.42, laundry: 0.5 };
// the far part alone (sky and whatever drifts across it), the same size as the composite
function farLayer(name) {
  const key = `${name}/far`;
  if (!cache.has(key)) {
    const c = mk(LW * FORE_SCALE, LH * FORE_SCALE), g = c.getContext("2d");
    g.drawImage(skyLayer(name), 0, 0, c.width, c.height);
    g.save(); g.scale(FORE_SCALE, FORE_SCALE); PAINT[name].clouds?.(g); g.restore();
    cache.set(key, c);
  }
  return cache.get(key);
}
// One layer of a backdrop with the same crop as paintBackdrop: "far" (the sky), "fore" (the scene
// in front, with see-through gaps) or "all". The pop-up storybook stacks them with real depth.
export function paintLayer(name, which, g, w, h, focus) {
  if (!PAINT[name]) name = "courtyard";
  const src = which === "fore" ? foreLayer(name) : which === "far" ? farLayer(name) : composite(name);
  const f = focus ?? FOCUS[name] ?? 0.5;
  const k = Math.max(w / src.width, h / src.height), sw = w / k, sh = h / k;
  g.drawImage(src, (src.width - sw) * f, src.height - sh, sw, sh, 0, 0, w, h);
}
export function paintBackdrop(name, g, w, h, focus = FOCUS[name] ?? 0.5) {
  const src = composite(name);
  const k = Math.max(w / src.width, h / src.height);
  const sw = w / k, sh = h / k;
  const sx = (src.width - sw) * focus, sy = src.height - sh; // (keep the ground in view)
  g.drawImage(src, sx, sy, sw, sh, 0, 0, w, h);
}
