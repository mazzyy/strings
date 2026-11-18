// Storybook characters: the cast as picture-book figures, drawn in code.
// figure(g, kind, x, y, s, flip) stands a character with its feet at (x, y).
const OUT = "#3a2416";

export function figure(g, kind, x, y, s = 1, flip = false) {
  const draw = FIGURES[kind];
  if (!draw) return;
  g.save();
  g.translate(x, y);
  g.scale(flip ? -s : s, s);
  g.lineJoin = "round"; g.lineCap = "round";
  draw(tools(g));
  g.restore();
}

function tools(g) {
  const T = {
    g,
    lin(x0, y0, x1, y1, ...stops) { const gr = g.createLinearGradient(x0, y0, x1, y1); stops.forEach((c, i) => gr.addColorStop(i / (stops.length - 1), c)); return gr; },
    rad(x, y, r, ...stops) { const gr = g.createRadialGradient(x, y, 0, x, y, r); stops.forEach((c, i) => gr.addColorStop(i / (stops.length - 1), c)); return gr; },
    // an SVG path, filled and outlined
    path(d, fill, lw = 2.4, stroke = OUT) { const p = new Path2D(d); if (fill) { g.fillStyle = fill; g.fill(p); } if (lw) { g.strokeStyle = stroke; g.lineWidth = lw; g.stroke(p); } },
    oval(cx, cy, rx, ry, fill, lw = 2.4, rot = 0) { g.beginPath(); g.ellipse(cx, cy, rx, ry, rot, 0, Math.PI * 2); if (fill) { g.fillStyle = fill; g.fill(); } if (lw) { g.strokeStyle = OUT; g.lineWidth = lw; g.stroke(); } },
    box(x, y, w, h, r, fill, lw = 2.4) { g.beginPath(); g.roundRect(x, y, w, h, r); if (fill) { g.fillStyle = fill; g.fill(); } if (lw) { g.strokeStyle = OUT; g.lineWidth = lw; g.stroke(); } },
    // a limb: a fat line with an outline
    limb(d, w, fill) { const p = new Path2D(d); g.strokeStyle = OUT; g.lineWidth = w + 4.4; g.stroke(p); g.strokeStyle = fill; g.lineWidth = w; g.stroke(p); },
    shadow(rx) { g.fillStyle = "rgba(20,10,30,0.28)"; g.beginPath(); g.ellipse(0, 3, rx, rx * 0.2, 0, 0, Math.PI * 2); g.fill(); },
    glow(x, y, r, c, a = 0.6) { const gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, `rgba(${c},${a})`); gr.addColorStop(1, `rgba(${c},0)`); g.fillStyle = gr; g.fillRect(x - r, y - r, r * 2, r * 2); },
    star(x, y, r, fill = "#ffe58a") { g.fillStyle = fill; g.beginPath(); g.moveTo(x, y - r); g.quadraticCurveTo(x, y, x + r, y); g.quadraticCurveTo(x, y, x, y + r); g.quadraticCurveTo(x, y, x - r, y); g.quadraticCurveTo(x, y, x, y - r); g.fill(); },
    // a friendly face: eyes with a catchlight, rosy cheeks, a smile
    face(cx, cy, d = 6, smile = true, r = 2.8) {
      for (const sx of [-1, 1]) { g.fillStyle = "#2a1a12"; g.beginPath(); g.arc(cx + sx * d, cy, r, 0, Math.PI * 2); g.fill(); g.fillStyle = "#fff"; g.beginPath(); g.arc(cx + sx * d + r * 0.35, cy - r * 0.35, r * 0.36, 0, Math.PI * 2); g.fill(); g.fillStyle = "rgba(240,110,110,0.35)"; g.beginPath(); g.ellipse(cx + sx * (d + 4), cy + 6, 4, 2.6, 0, 0, Math.PI * 2); g.fill(); }
      if (smile) { g.strokeStyle = "#5a2a1a"; g.lineWidth = 1.8; g.beginPath(); g.arc(cx, cy + 4, 5, 0.15 * Math.PI, 0.85 * Math.PI); g.stroke(); }
    },
    dot(x, y, r, fill) { g.fillStyle = fill; g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill(); },
  };
  return T;
}

const SKIN = "#f4cda8";
// Twig, the wooden boy: pine limbs and ball joints, a painted waistcoat, a sugarloaf cap,
// and a nose as long as his latest fib
function twigFigure(T, nose = 16, leaves = false) {
  const { g } = T, pine = T.lin(-20, 0, 20, 0, "#f2c690", "#e2ab6c", "#b07a44"), stain = "#7a4626";
  T.shadow(30);
  // legs, knees, clogs
  T.limb("M-9 -46L-10 -8", 7, "#e2ab6c"); T.limb("M9 -46L10 -8", 7, "#e2ab6c");
  T.oval(-9.5, -27, 4.6, 4.6, stain, 1.6); T.oval(9.5, -27, 4.6, 4.6, stain, 1.6);
  T.path("M-22 0H-3V-7Q-12 -12 -20 -7Q-26 -6 -24 -2Z", "#40271a", 2); T.path("M22 0H3V-7Q12 -12 20 -7Q26 -6 24 -2Z", "#40271a", 2);
  // ochre shorts, green waistcoat open over a pine chest, wooden buttons
  T.path("M-17 -68H17L19 -42H3L0 -50L-3 -42H-19Z", T.lin(0, -68, 0, -42, "#d8a040", "#b07a24"));
  T.path("M-16 -104Q0 -110 16 -104L17 -68H-17Z", T.lin(-17, 0, 17, 0, "#4f9a5c", "#3f7f4c", "#2e5e38"));
  T.path("M-4.5 -104H4.5L3.5 -68H-3.5Z", pine, 1.6);
  T.dot(7, -92, 2, stain); T.dot(7, -80, 2, stain);
  // arms: one at his side, one waving
  T.limb("M-17 -100Q-28 -84 -27 -66", 6, "#e2ab6c"); T.oval(-27, -63, 5, 6, pine, 1.8);
  T.limb("M17 -100Q30 -110 34 -128", 6, "#e2ab6c"); T.oval(35, -131, 5, 6, pine, 1.8);
  T.oval(-17, -100, 4.5, 4.5, stain, 1.6); T.oval(17, -100, 4.5, 4.5, stain, 1.6);
  // the scalloped collar
  g.beginPath(); for (let k = 0; k <= 24; k++) { const a = (k / 24) * Math.PI * 2, rr = 1 + 0.12 * Math.cos(a * 8); g.lineTo(Math.cos(a) * 20 * rr, -106 + Math.sin(a) * 6 * rr); } g.closePath();
  g.fillStyle = "#f2e7cf"; g.fill(); g.strokeStyle = OUT; g.lineWidth = 2; g.stroke();
  // head, carved hair, cap with a bead
  T.oval(0, -126, 16, 18, T.rad(-6, -134, 24, "#f8d4a0", "#e2ab6c", "#b07a44"));
  T.path("M-16 -128Q-18 -146 0 -146Q16 -146 16 -132Q8 -140 -2 -138Q-10 -137 -16 -128Z", stain, 1.8);
  T.path("M-15 -136Q0 -146 15 -138L6 -184Z", T.lin(-15, 0, 15, 0, "#d04a3a", "#b8352b", "#8a241e"), 2);
  T.oval(6, -186, 3.6, 3.6, stain, 1.4);
  T.face(-1, -126, 6, true, 2.6);
  // the nose (and, after a big fib, leaves)
  const tipX = 3 + nose;
  T.path(`M2 -122L${tipX} -125L2 -128Z`, "#e2ab6c", 1.8);
  T.dot(tipX, -125, 1.8, "#e2ab6c");
  if (leaves) {
    const mx = 2 + nose * 0.62;
    g.strokeStyle = "#6a4426"; g.lineWidth = 1.6; g.beginPath(); g.moveTo(mx, -126); g.lineTo(mx + 3, -136); g.stroke();
    T.path(`M${mx + 3} -136q8 -6 12 -2q-6 6 -12 2z`, "#5aa83a", 1.4); T.path(`M${mx + 2} -132q-8 -6 -10 0q6 4 10 0z`, "#6ab84a", 1.4);
  }
}
// a sock puppet on the robot's forearm: knitted sock, striped cuff, a big open mouth,
// googly eyes, a pompom nose and a mop of yarn
function sockFigure(T, { hair, nose }) {
  const { g } = T, knit = T.lin(-22, 0, 22, 0, "#ddd2b6", "#cbbd9c", "#a8987a");
  T.box(-15, -26, 30, 30, 4, T.lin(-15, 0, 15, 0, "#ffffff", "#f0ede6", "#c8c4bc"));
  T.box(-16, -14, 32, 4, 2, "#8fe6ff", 1.4);
  T.path("M-20 -26Q-24 -70 -18 -98H18Q24 -70 20 -26Z", knit);
  for (const [y, c] of [[-34, "#d8322a"], [-42, "#f0c030"], [-50, "#2fa84a"]]) T.box(-20.5, y, 41, 5, 1, c, 1.4);
  // the mouth: upper jaw tipped back, lower jaw, the dark inside and a red tongue
  T.path("M-28 -104Q-30 -124 0 -128Q30 -124 28 -104Q0 -112 -28 -104Z", "#1a0a0a", 2.2);
  T.path("M-14 -108Q0 -98 14 -108Q0 -116 -14 -108Z", "#d8383a", 1.6);
  T.path("M-30 -104Q-26 -90 0 -88Q26 -90 30 -104Q0 -98 -30 -104Z", knit);
  T.path("M-30 -126Q-34 -158 0 -160Q34 -158 30 -126Q0 -136 -30 -126Z", knit);
  T.path("M-30 -126Q0 -136 30 -126", null, 4, "#e9cfa8");
  // yarn hair
  g.lineCap = "round";
  hair.forEach((c, i) => { for (let k = 0; k < 4; k++) { const a = -Math.PI * (0.15 + 0.7 * ((i * 4 + k) / (hair.length * 4))); g.strokeStyle = c; g.lineWidth = 3.2; g.beginPath(); g.moveTo(Math.cos(a) * 10, -156 + Math.sin(a) * 4); g.quadraticCurveTo(Math.cos(a) * 26, -170 + Math.sin(a) * 18, Math.cos(a) * 34, -164 + Math.sin(a) * 26); g.stroke(); } });
  // googly eyes, and the pompom
  for (const sx of [-1, 1]) { T.oval(sx * 12, -156, 11, 11, "#ffffff", 2); T.dot(sx * 12 + 2, -152, 5, "#0a0a0a"); }
  T.oval(0, -134, 8, 8, nose, 2);
}
const FIGURES = {
  twig(T) { twigFigure(T); },
  twigLong(T) { twigFigure(T, 52, true); },
  noodle(T) { sockFigure(T, { hair: ["#d8322a", "#f0c030", "#3aa858", "#2f9ad8", "#9a4ad8", "#f07a2a"], nose: "#5cc85a" }); },
  doodle(T) { sockFigure(T, { hair: ["#4a9ae8", "#6ab8f0", "#3a7ad0", "#8acdf8"], nose: "#e8487a" }); },
  // the robot puppeteer, ducked under the stage: just his face peeking up over the boards
  robotpeek(T) {
    const { g } = T;
    T.path("M-46 0Q-50 -70 0 -74Q50 -70 46 0Z", T.lin(-46, 0, 46, 0, "#ffffff", "#f0ede6", "#c8c4bc"));
    T.box(-34, -58, 68, 40, 14, "#0a0c10", 2);
    for (const sx of [-1, 1]) { T.glow(sx * 13, -40, 14, "120,230,255", 0.6); T.oval(sx * 13, -40, 6, 8, "#dffbff", 0); }
    g.strokeStyle = "#4fe0ff"; g.lineWidth = 2; g.beginPath(); for (let x = -12; x <= 12; x += 2) g.lineTo(x, -26 + Math.sin(x * 0.8) * 2); g.stroke();
    g.fillStyle = "#3a2414"; g.fillRect(-60, -4, 120, 8);
  },
  // Sir Pip: shiny armour, a blue tabard, a plume, and a very small sword
  pip(T) {
    const { g } = T, steel = T.lin(-26, 0, 26, 0, "#f4f7fa", "#c4ccd6", "#8a94a4");
    T.shadow(34);
    T.box(-17, -44, 13, 40, 5, steel); T.box(4, -44, 13, 40, 5, steel);
    T.path("M-21 0h19v-9q-10-6-19 0z", "#6a7482"); T.path("M2 0h19v-9q-10-6-19 0z", "#6a7482");
    T.oval(-10.5, -26, 5, 5, "#e8edf2", 1.6); T.oval(10.5, -26, 5, 5, "#e8edf2", 1.6);
    // sword arm, and the little sword
    T.path("M39 -62L39 -126L43 -134L47 -126L47 -62Z", T.lin(39, 0, 47, 0, "#ffffff", "#aeb8c6"), 1.8);
    T.box(33, -64, 20, 5, 2, "#e8c060", 1.8); T.box(40, -60, 6, 12, 2, "#7a4a24", 1.8);
    T.limb("M24 -88Q40 -80 43 -58", 10, "#c4ccd6"); T.oval(43, -56, 6, 6, SKIN, 2);
    T.limb("M-24 -88Q-38 -76 -36 -54", 10, "#c4ccd6"); T.oval(-36, -52, 6, 6, SKIN, 2);
    T.path("M-25 -92Q0 -102 25 -92L21 -40Q0 -32 -21 -40Z", steel);
    T.path("M-13 -94H13L11 -38L0 -28L-11 -38Z", T.lin(0, -94, 0, -28, "#4a86ea", "#1f4fa0"), 2, "#e8c060");
    T.star(0, -66, 9, "#ffd866");
    T.box(-22, -58, 44, 6, 2, "#6a4426", 1.6); T.box(-5, -60, 10, 10, 2, "#e8c060", 1.6);
    T.oval(-25, -90, 9, 9, "#e8edf2", 2); T.oval(25, -90, 9, 9, "#e8edf2", 2);
    // helmet, face, plume
    T.path("M2 -140Q12 -168 38 -158Q24 -154 20 -142Q34 -150 44 -138Q24 -140 10 -128Z", T.lin(0, -165, 40, -130, "#5aa0ff", "#1f58c8"));
    T.oval(0, -116, 26, 26, T.rad(-8, -126, 34, "#ffffff", "#c4ccd6", "#8a94a4"));
    T.oval(0, -112, 17, 18, SKIN, 2);
    T.path("M-19 -124Q0 -136 19 -124L19 -119Q0 -129 -19 -119Z", "#e8c060", 1.6);
    T.face(0, -114, 6.5, false, 3);
    T.path("M0 -105q-7-5-13 1q7 4 13-1z", "#8a5a34", 1.2); T.path("M0 -105q7-5 13 1q-7 4-13-1z", "#8a5a34", 1.2);
  },

  // Marlo: a young dragon, all belly and sparkle
  marlo(T) {
    const { g } = T, green = T.rad(-8, -76, 60, "#b4d466", "#7ea83c", "#557a26");
    T.shadow(46);
    T.path("M-16 -30Q-66 -18 -70 -52Q-70 -66 -58 -66Q-62 -48 -44 -42Q-28 -38 -8 -46Z", "#6f9a34");
    T.path("M-60 -62L-74 -80L-52 -76Z", "#f09a3c", 2);
    // wing
    T.path("M-10 -96Q-44 -148 -80 -130Q-62 -124 -60 -108Q-74 -112 -82 -104Q-66 -98 -62 -84Q-72 -86 -78 -78Q-44 -66 -14 -74Z", T.lin(-80, -130, -14, -74, "#ffc45a", "#e8742a"));
    g.strokeStyle = "rgba(140,60,10,0.5)"; g.lineWidth = 1.6; for (const d of ["M-12 -94Q-40 -120 -60 -108", "M-12 -90Q-44 -100 -62 -84"]) g.stroke(new Path2D(d));
    T.oval(-15, -6, 16, 8, "#557a26"); T.oval(17, -6, 16, 8, "#557a26");
    for (const fx of [-15, 17]) for (const k of [-8, 0, 8]) T.path(`M${fx + k - 3} -4l3 6l3-6z`, "#fff2d0", 1);
    T.oval(-14, -24, 14, 19, "#6f9a34"); T.oval(16, -24, 14, 19, "#6f9a34");
    for (const [sx, sy] of [[-30, -84], [-34, -66], [-32, -48]]) T.path(`M${sx} ${sy}l-12 -4l8 12z`, "#f09a3c", 1.6);
    T.oval(0, -64, 36, 44, green);
    T.oval(6, -58, 22, 32, T.lin(0, -90, 0, -26, "#fff2c4", "#e6c878"), 1.8);
    g.strokeStyle = "rgba(170,120,40,0.45)"; g.lineWidth = 1.6; for (const yy of [-74, -62, -50, -38]) { g.beginPath(); g.moveTo(-12, yy); g.quadraticCurveTo(6, yy + 5, 25, yy); g.stroke(); }
    T.limb("M26 -80Q44 -76 46 -62", 9, "#7ea83c"); T.limb("M-22 -82Q-34 -70 -28 -58", 9, "#6f9a34");
    // head
    T.path("M-4 -142Q-10 -164 -22 -166Q-18 -152 -14 -138Z", "#fff2d0", 2); T.path("M16 -146Q20 -168 34 -168Q28 -154 26 -142Z", "#fff2d0", 2);
    T.oval(8, -124, 29, 25, T.rad(0, -134, 40, "#b4d466", "#7ea83c", "#5f8a2e"));
    T.oval(34, -116, 19, 14, "#a4c85a");
    T.dot(42, -121, 2, "#3a5a1a"); T.dot(35, -123, 2, "#3a5a1a");
    g.strokeStyle = "#3a2416"; g.lineWidth = 2; g.beginPath(); g.moveTo(20, -110); g.quadraticCurveTo(36, -100, 50, -112); g.stroke();
    T.oval(-4, -133, 7, 9, "#ffffff", 1.6); T.oval(13, -133, 9.5, 11, "#ffffff", 1.8);
    T.dot(-2.5, -132, 3.6, "#2a1a12"); T.dot(15.5, -132, 5, "#2a1a12"); T.dot(-1.3, -134, 1.3, "#fff"); T.dot(17.3, -134.5, 1.8, "#fff");
    g.fillStyle = "rgba(240,110,110,0.4)"; g.beginPath(); g.ellipse(22, -118, 5, 3, 0, 0, Math.PI * 2); g.fill();
    // he breathes only sparkles
    T.star(66, -122, 7); T.star(80, -138, 4.5, "#fff6c8"); T.star(78, -106, 3.5, "#9ff3ff"); T.star(92, -122, 3, "#ffd0f0");
  },

  // Old Bramble, the forgetful wizard
  wizard(T) {
    const { g } = T;
    T.shadow(40);
    T.glow(44, -160, 34, "140,240,255", 0.7);
    T.limb("M44 0L44 -148", 5, "#8a5a30"); T.oval(44, -160, 11, 11, T.rad(41, -164, 13, "#ffffff", "#8feaff", "#3ab8e8"), 2);
    T.path("M-36 0L-17 -98H17L36 0Z", T.lin(-36, 0, 36, 0, "#7a58c8", "#5a3ca6", "#34206a"));
    T.path("M-35 -6Q0 4 35 -6", null, 3, "#e8c060");
    for (const [sx, sy, r] of [[-14, -28, 5], [12, -50, 4], [-6, -70, 3.5], [18, -18, 3.5], [-22, -52, 3]]) T.star(sx, sy, r, "#ffe58a");
    T.path("M12 -92Q40 -86 48 -58L36 -52Q30 -70 12 -72Z", "#6848b6"); T.oval(42, -58, 6, 6, SKIN, 2);
    T.path("M-12 -92Q-36 -82 -40 -52L-28 -50Q-26 -68 -12 -74Z", "#5a3ca6"); T.oval(-34, -50, 6, 6, SKIN, 2);
    T.oval(0, -110, 18, 19, SKIN);
    T.path("M-18 -108Q-20 -70 0 -44Q20 -70 18 -108Q0 -96 -18 -108Z", T.lin(0, -108, 0, -44, "#ffffff", "#d4dae6"));
    T.path("M0 -104q-9-5-15 2q8 4 15-2z", "#ffffff", 1.4); T.path("M0 -104q9-5 15 2q-8 4-15-2z", "#ffffff", 1.4);
    T.oval(0, -108, 4.5, 4, "#f0b090", 1.4);
    T.dot(-7, -115, 2.4, "#2a1a12"); T.dot(7, -115, 2.4, "#2a1a12");
    g.strokeStyle = "#ffffff"; g.lineWidth = 3.4; for (const sx of [-1, 1]) { g.beginPath(); g.moveTo(sx * 3, -121); g.lineTo(sx * 12, -123); g.stroke(); }
    T.path("M-21 -124L4 -190Q16 -198 28 -188Q16 -188 14 -178L21 -124Z", T.lin(-20, 0, 22, 0, "#7a58c8", "#34206a"));
    T.oval(0, -124, 33, 7, "#4a3090");
    T.path("M-19 -130Q0 -124 19 -130L17 -139Q0 -134 -16 -139Z", "#e8c060", 1.6);
    T.star(3, -158, 6, "#ffe58a");
  },

  // Captain Pegg: one wooden leg, one noisy parrot
  pirate(T) {
    const { g } = T;
    T.shadow(38);
    T.box(-17, -46, 13, 40, 4, "#2b3350"); T.path("M-22 0h20v-14h-15z", "#6a4426");
    T.limb("M10 -44L10 -4", 6, "#a8743c"); T.box(5, -5, 10, 5, 2, "#6a4426", 1.6);
    // cutlass, raised
    T.path("M-50 -100Q-74 -134 -54 -166Q-58 -134 -40 -108Z", T.lin(-70, 0, -40, 0, "#ffffff", "#aab4c4"), 2);
    T.limb("M-26 -92Q-46 -84 -46 -100", 11, "#b8282e"); T.oval(-46, -102, 6.5, 6.5, "#d9a37c", 2); T.box(-56, -106, 20, 5, 2, "#e8c060", 1.6);
    T.limb("M26 -92Q40 -80 38 -62", 11, "#b8282e"); T.oval(38, -60, 6.5, 6.5, "#d9a37c", 2);
    T.path("M-28 -98Q0 -108 28 -98L35 -38L17 -43L0 -36L-17 -43L-35 -38Z", T.lin(-30, 0, 30, 0, "#d83c42", "#a81e26", "#701016"));
    T.path("M-9 -98H9L6 -52H-6Z", "#f6f0e0", 1.8);
    for (const yy of [-88, -76, -64]) for (const sx of [-15, 15]) T.dot(sx, yy, 2.6, "#e8c060");
    T.box(-27, -58, 54, 8, 2, "#4a3020", 1.8); T.box(-6, -61, 12, 13, 2, "#e8c060", 1.8);
    T.oval(0, -116, 20, 21, "#d9a37c");
    T.path("M-20 -116Q-20 -84 0 -80Q20 -84 20 -116Q10 -104 0 -104Q-10 -104 -20 -116Z", "#1c1410", 2);
    g.strokeStyle = "#f6f0e0"; g.lineWidth = 2; g.beginPath(); g.arc(0, -100, 6, 0.1 * Math.PI, 0.9 * Math.PI); g.stroke();
    T.dot(7, -121, 2.8, "#2a1a12"); T.dot(8, -122, 1, "#fff");
    g.strokeStyle = "#111"; g.lineWidth = 2; g.beginPath(); g.moveTo(-20, -130); g.lineTo(20, -126); g.stroke();
    T.oval(-7, -121, 6.5, 5.5, "#111", 1);
    T.oval(1, -113, 3.6, 3, "#c88860", 1.2);
    T.path("M-38 -130Q0 -152 38 -130Q26 -134 18 -132Q14 -160 0 -164Q-14 -160 -18 -132Q-26 -134 -38 -130Z", "#1a1a26", 2.4);
    T.path("M-38 -130Q0 -152 38 -130", null, 2.4, "#e8c060");
    T.dot(0, -148, 4.5, "#e8c060");
    // the parrot
    T.path("M30 -100l8 18l-10 -6z", "#d83c42", 1.6);
    T.oval(30, -106, 8, 11, "#3cb85a", 2); T.oval(32, -103, 4.5, 8, "#2a8a44", 0);
    T.oval(31, -119, 6.5, 6.5, "#3cb85a", 2); T.path("M36 -121l8 3l-8 4z", "#ffc83c", 1.4); T.dot(31, -121, 1.6, "#111");
  },

  // Grumble, the grumpiest troll in all the land
  troll(T) {
    const { g } = T, hide = T.rad(-14, -110, 90, "#a8bc74", "#7e9450", "#566c38");
    T.shadow(56);
    T.box(-27, -42, 20, 38, 6, "#6f8450"); T.box(7, -42, 20, 38, 6, "#6f8450");
    T.oval(-18, -5, 18, 8, "#566c38"); T.oval(18, -5, 18, 8, "#566c38");
    for (const fx of [-18, 18]) for (const k of [-9, 0, 9]) T.dot(fx + k, -3, 2.6, "#e8e0c0");
    T.limb("M-44 -104Q-70 -80 -60 -40", 18, "#7e9450"); T.oval(-60, -36, 13, 13, "#8aa25a");
    T.limb("M44 -104Q70 -80 60 -40", 18, "#6f8450"); T.oval(60, -36, 13, 13, "#7e9450");
    T.oval(0, -86, 48, 52, hide);
    T.oval(0, -78, 30, 34, "rgba(214,226,160,0.5)", 0);
    for (const [mx, my, r] of [[-30, -110, 9], [26, -116, 7], [34, -70, 8], [-36, -66, 6]]) T.oval(mx, my, r, r * 0.7, "rgba(60,96,48,0.55)", 0);
    T.path("M-42 -54Q0 -38 42 -54L36 -30L24 -38L12 -26L0 -36L-12 -26L-24 -38L-36 -30Z", "#7a5230");
    T.path("M-43 -56Q0 -40 43 -56", null, 3.4, "#c9a468");
    T.path("M-30 -158L-62 -172L-38 -142Z", "#7e9450"); T.path("M30 -158L62 -172L38 -142Z", "#6f8450");
    T.oval(0, -150, 37, 31, T.rad(-10, -162, 50, "#a8bc74", "#7e9450", "#5f7440"));
    for (const hx of [-10, 0, 10]) T.path(`M${hx - 5} -178l5 -14l5 14z`, "#3a4a26", 1.6);
    T.oval(-14, -160, 7, 6, "#ffe890", 1.6); T.oval(14, -160, 7, 6, "#ffe890", 1.6);
    T.dot(-13, -159, 2.6, "#2a1a12"); T.dot(15, -159, 2.6, "#2a1a12");
    g.strokeStyle = "#2c3a1c"; g.lineWidth = 5; g.beginPath(); g.moveTo(-24, -172); g.lineTo(-6, -165); g.moveTo(24, -172); g.lineTo(6, -165); g.stroke();
    T.oval(0, -146, 12, 10, "#93a868", 2); T.dot(-4, -143, 2, "#4a5a30"); T.dot(4, -143, 2, "#4a5a30");
    g.strokeStyle = "#2a1a12"; g.lineWidth = 2.6; g.beginPath(); g.moveTo(-17, -127); g.quadraticCurveTo(0, -135, 17, -127); g.stroke();
    T.path("M-16 -127l3 -13l5 12z", "#fff6dc", 1.6); T.path("M16 -127l-3 -13l-5 12z", "#fff6dc", 1.6);
    T.dot(-24, -146, 2, "#566c38"); T.dot(26, -140, 2.4, "#566c38");
  },

  // Clank, the clockwork robot (lonely, not wicked)
  clank(T) {
    const { g } = T, steel = T.lin(-34, 0, 34, 0, "#dce2ea", "#aab2be", "#727a88");
    T.shadow(42);
    g.fillStyle = "rgba(255,90,50,0.16)"; g.beginPath(); g.moveTo(8, -134); g.lineTo(150, -70); g.lineTo(150, -186); g.closePath(); g.fill();
    T.box(-21, -42, 13, 38, 3, steel); T.box(8, -42, 13, 38, 3, steel);
    T.box(-25, -8, 21, 8, 3, "#5a626e"); T.box(4, -8, 21, 8, 3, "#5a626e");
    T.dot(-14.5, -24, 3.4, "#c9a14a"); T.dot(14.5, -24, 3.4, "#c9a14a");
    // the winding key in his back
    g.strokeStyle = OUT; g.lineWidth = 7; g.beginPath(); g.moveTo(-34, -74); g.lineTo(-50, -74); g.stroke();
    g.strokeStyle = "#c9a14a"; g.lineWidth = 3.6; g.beginPath(); g.moveTo(-34, -74); g.lineTo(-50, -74); g.stroke();
    for (const ky of [-84, -64]) { g.strokeStyle = OUT; g.lineWidth = 7; g.beginPath(); g.arc(-57, ky, 8, 0, Math.PI * 2); g.stroke(); g.strokeStyle = "#e8c060"; g.lineWidth = 3.6; g.stroke(); }
    T.limb("M34 -98Q56 -86 52 -58", 9, "#aab2be"); T.path("M46 -58a7 7 0 1 0 12 0", null, 3.2, "#5a626e");
    T.limb("M-32 -98Q-46 -90 -44 -106", 9, "#8a929e");
    T.box(-34, -110, 68, 72, 11, steel);
    T.box(-34, -52, 68, 9, 2, "#c9a14a", 1.8);
    T.box(-21, -100, 42, 32, 6, "#2e333c", 2);
    T.glow(-8, -84, 14, "255,70,40", 0.8); T.dot(-8, -84, 5, "#ff5a3c");
    T.oval(10, -84, 8, 8, "#f2ead2", 1.6); g.strokeStyle = "#b8242c"; g.lineWidth = 2; g.beginPath(); g.moveTo(10, -84); g.lineTo(15, -89); g.stroke();
    for (const [rx, ry] of [[-28, -104], [28, -104], [-28, -62], [28, -62]]) T.dot(rx, ry, 2.2, "#5a626e");
    T.box(-9, -118, 18, 10, 2, "#5a626e", 2);
    T.limb("M0 -158L0 -176", 3, "#8a929e"); T.glow(0, -180, 12, "255,70,40", 0.8); T.oval(0, -180, 5, 5, "#ff5a3c", 1.6);
    T.box(-27, -160, 54, 44, 9, steel);
    T.oval(-29, -138, 5, 8, "#8a929e", 2); T.oval(29, -138, 5, 8, "#8a929e", 2);
    T.glow(0, -140, 26, "255,60,40", 0.75);
    T.oval(0, -140, 12, 12, T.rad(-3, -143, 13, "#ffd0c0", "#ff4a30", "#a81808"), 2.4);
    T.path("M-22 -156L22 -150", null, 4, "#3a3e46");
    g.strokeStyle = "#3a3e46"; g.lineWidth = 2; for (let k = -2; k <= 2; k++) { g.beginPath(); g.moveTo(k * 5, -125); g.lineTo(k * 5, -119); g.stroke(); }
  },

  // Princess Juniper
  princess(T) {
    const { g } = T;
    T.shadow(36);
    T.path("M-21 -126Q-30 -86 -22 -62H22Q30 -86 21 -126Z", "#7a4424");
    T.path("M-36 0Q-30 -52 -14 -86H14Q30 -52 36 0Z", T.lin(-36, 0, 36, 0, "#f6a0c8", "#e06aa4", "#b0407c"));
    g.fillStyle = "#fff"; for (let k = -3; k <= 3; k++) { g.beginPath(); g.arc(k * 10.5, -1, 5.6, Math.PI, 0); g.fill(); }
    T.path("M-10 -84L-22 -20M10 -84L22 -20", null, 1.6, "rgba(255,255,255,0.5)");
    T.limb("M-15 -98Q-22 -84 -6 -76", 5.5, SKIN); T.limb("M15 -98Q22 -84 6 -76", 5.5, SKIN);
    T.path("M-14 -84H14L11 -106H-11Z", "#b0407c");
    T.box(-15, -88, 30, 6, 2, "#ffe58a", 1.6);
    T.oval(-15, -100, 8.5, 8, "#f6a0c8"); T.oval(15, -100, 8.5, 8, "#f6a0c8");
    T.oval(0, -122, 17, 18, SKIN);
    T.path("M-18 -124Q-14 -146 0 -146Q14 -146 18 -124Q8 -136 0 -134Q-8 -136 -18 -124Z", "#8a5028", 2);
    T.face(0, -121, 6.5, true, 2.8);
    T.path("M-13 -139L-11 -154L-5 -146L0 -158L5 -146L11 -154L13 -139Z", T.lin(0, -158, 0, -139, "#fff0a0", "#e8b838"), 1.8);
    T.dot(0, -144, 2.2, "#e8486a"); T.dot(-8, -143, 1.6, "#5ad8ff"); T.dot(8, -143, 1.6, "#5ad8ff");
  },

  // the King
  king(T) {
    const { g } = T;
    T.shadow(42);
    T.limb("M38 -6L38 -124", 4, "#e8c060"); T.oval(38, -132, 8, 8, T.rad(36, -135, 9, "#fff6c0", "#e8b838"), 2); T.dot(38, -132, 3, "#e8486a");
    T.path("M-40 0L-25 -102H25L40 0Z", T.lin(-40, 0, 40, 0, "#d83c42", "#a81e26", "#641016"));
    T.path("M-40 0L-38 -13H38L40 0Z", "#fffaf0", 2); T.path("M-7 -100H7L8 -12H-8Z", "#fffaf0", 2);
    for (const [fx, fy] of [[-28, -6], [-14, -7], [16, -6], [30, -7], [0, -30], [-1, -52], [1, -74], [0, -6]]) T.path(`M${fx - 2} ${fy - 2}l2 5l2-5z`, "#1c1410", 0);
    T.limb("M22 -96Q40 -84 38 -66", 11, "#a81e26"); T.oval(38, -64, 6.5, 6.5, SKIN, 2);
    T.limb("M-22 -96Q-38 -84 -34 -62", 11, "#b8282e"); T.oval(-34, -60, 6.5, 6.5, SKIN, 2);
    T.path("M-29 -102Q0 -90 29 -102L33 -86Q0 -72 -33 -86Z", "#fffaf0", 2);
    for (const fx of [-22, -8, 8, 22]) T.path(`M${fx - 2} -90l2 5l2-5z`, "#1c1410", 0);
    T.oval(0, -118, 20, 21, SKIN);
    T.path("M-20 -116Q-22 -80 0 -68Q22 -80 20 -116Q0 -104 -20 -116Z", T.lin(0, -116, 0, -68, "#ffffff", "#cfd4de"));
    T.path("M0 -111q-9-6-16 2q8 4 16-2z", "#ffffff", 1.4); T.path("M0 -111q9-6 16 2q-8 4-16-2z", "#ffffff", 1.4);
    T.oval(0, -115, 4.5, 4, "#f0b090", 1.4);
    T.dot(-7.5, -122, 2.6, "#2a1a12"); T.dot(7.5, -122, 2.6, "#2a1a12"); T.dot(-6.7, -123, 0.9, "#fff"); T.dot(8.3, -123, 0.9, "#fff");
    T.path("M-19 -134Q0 -150 19 -134Z", "#a81e26", 2);
    T.path("M-21 -132L-19 -158L-9 -144L0 -164L9 -144L19 -158L21 -132Z", T.lin(0, -164, 0, -132, "#fff0a0", "#e8b838"), 2);
    T.box(-21, -138, 42, 7, 2, "#e8b838", 1.8);
    T.dot(0, -134.5, 2.6, "#e8486a"); T.dot(-12, -134.5, 2, "#5ad8ff"); T.dot(12, -134.5, 2, "#5ad8ff"); T.dot(0, -164, 3, "#e8486a");
  },

  // the golden music box, lid open, playing
  musicbox(T) {
    const { g } = T;
    T.shadow(46);
    T.glow(0, -70, 90, "255,220,140", 0.45);
    T.path("M-46 -46L-40 -90H44L46 -46Z", T.lin(0, -90, 0, -46, "#e2a838", "#a87420"));
    T.path("M-38 -50L-33 -83H37L39 -50Z", "#8a1c2a", 1.6);
    T.box(-46, -46, 92, 46, 6, T.lin(0, -46, 0, 0, "#ffe07a", "#e2a838", "#a87420"));
    T.box(-39, -39, 78, 32, 4, null, 1.6);
    for (const [jx, c] of [[-24, "#e8486a"], [0, "#5ad8ff"], [24, "#7ae07a"]]) { T.path(`M${jx} -33L${jx + 9} -23L${jx} -13L${jx - 9} -23Z`, c, 1.8); T.dot(jx - 2.5, -26, 2, "rgba(255,255,255,0.85)"); }
    T.limb("M46 -22H60V-36", 3.4, "#c9a14a"); T.oval(60, -40, 5, 5, "#e8486a", 1.8);
    for (const [nx, ny, r, c] of [[-34, -112, 1, "#fff4c8"], [6, -140, 1.25, "#ffe58a"], [44, -110, 0.9, "#fff4c8"], [-10, -170, 0.8, "#ffd0f0"]]) {
      T.glow(nx, ny, 22 * r, "255,236,170", 0.6);
      g.fillStyle = c; g.strokeStyle = "#8a5a12"; g.lineWidth = 1.4;
      g.beginPath(); g.ellipse(nx, ny, 8 * r, 6 * r, -0.4, 0, Math.PI * 2); g.fill(); g.stroke();
      g.beginPath(); g.rect(nx + 5.5 * r, ny - 30 * r, 3 * r, 30 * r); g.fill(); g.stroke();
      g.beginPath(); g.moveTo(nx + 8.5 * r, ny - 30 * r); g.quadraticCurveTo(nx + 20 * r, ny - 26 * r, nx + 16 * r, ny - 14 * r); g.quadraticCurveTo(nx + 16 * r, ny - 22 * r, nx + 8.5 * r, ny - 22 * r); g.fill(); g.stroke();
    }
    T.star(-56, -70, 5); T.star(58, -76, 4, "#fff6c8");
  },

  // an iron cage (drawn over whoever is inside)
  cage(T) {
    const { g } = T;
    for (const [lw, col] of [[7, "#22252c"], [3.4, "#6a7280"], [1, "#b4bcc8"]]) {
      g.strokeStyle = col; g.lineWidth = lw;
      for (let i = -3; i <= 3; i++) { g.beginPath(); g.moveTo(i * 15, 0); g.lineTo(i * 15, -124); g.quadraticCurveTo(i * 15, -166, 0, -172); g.stroke(); }
    }
    for (const yy of [0, -124]) { g.strokeStyle = "#22252c"; g.lineWidth = 11; g.beginPath(); g.moveTo(-50, yy); g.lineTo(50, yy); g.stroke(); g.strokeStyle = "#6a7280"; g.lineWidth = 6; g.stroke(); g.strokeStyle = "#b4bcc8"; g.lineWidth = 1.4; g.beginPath(); g.moveTo(-50, yy - 2); g.lineTo(50, yy - 2); g.stroke(); }
    g.strokeStyle = "#22252c"; g.lineWidth = 6; g.beginPath(); g.arc(0, -180, 8, 0, Math.PI * 2); g.stroke(); g.strokeStyle = "#6a7280"; g.lineWidth = 2.6; g.stroke();
    g.fillStyle = "#c9a14a"; g.strokeStyle = "#22252c"; g.lineWidth = 2; g.beginPath(); g.roundRect(-8, -74, 16, 20, 3); g.fill(); g.stroke();
    g.fillStyle = "#22252c"; g.beginPath(); g.arc(0, -66, 3, 0, Math.PI * 2); g.fill();
  },
};
