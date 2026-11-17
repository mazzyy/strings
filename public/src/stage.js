// The little theatre that sits on your desk, and the study around it
// (the room is hidden in passthrough AR, where your real desk takes its place).
import * as THREE from "three";
import { withRepeat } from "./assets.js";
import { paintBackdrop } from "./backdrops.js";
import { buildDrapes } from "./drapes.js";

const KNOB_LABELS = { record: "Record", replay: "Replay", talk: "Talk", mode: "Modes", map: "Map", free: "Free Marlo", lock: "Pinch lock", hand: "One hand", menu: "Menu" };
export const STAGE = { width: 0.86, depth: 0.42, base: 0.075 };

const gold = () => new THREE.MeshStandardMaterial({ color: 0xd8ac4f, metalness: 1, roughness: 0.24 });

function scrollTexture() {
  // gilded scrollwork for the stage's front panel (drawn, so it's ours to use)
  const c = document.createElement("canvas");
  c.width = 1024; c.height = 128;
  const g = c.getContext("2d");
  g.clearRect(0, 0, 1024, 128);
  g.strokeStyle = "#fff";
  g.fillStyle = "#fff";
  g.lineCap = "round";
  const scroll = (cx, dir) => {
    g.lineWidth = 7;
    g.beginPath();
    for (let a = 0; a < Math.PI * 3.2; a += 0.05) {
      const r = 6 + a * 7;
      const x = cx + dir * Math.cos(a) * r, y = 64 + Math.sin(a) * r * 0.55;
      a === 0 ? g.moveTo(x, y) : g.lineTo(x, y);
    }
    g.stroke();
  };
  // central flower
  for (let i = 0; i < 8; i++) {
    g.save();
    g.translate(512, 64);
    g.rotate((i / 8) * Math.PI * 2);
    g.beginPath();
    g.ellipse(0, -20, 8, 20, 0, 0, Math.PI * 2);
    g.fill();
    g.restore();
  }
  g.beginPath(); g.arc(512, 64, 10, 0, Math.PI * 2); g.fill();
  // flowing vine with scrolls to either side
  for (const dir of [-1, 1]) {
    g.lineWidth = 6;
    g.beginPath();
    g.moveTo(512 + dir * 30, 64);
    for (let x = 0; x <= 430; x += 4) g.lineTo(512 + dir * (30 + x), 64 + Math.sin(x * 0.028) * 26);
    g.stroke();
    for (let k = 0; k < 4; k++) scroll(512 + dir * (110 + k * 105), k % 2 ? dir : -dir);
    // leaves
    for (let k = 0; k < 8; k++) {
      const x = 512 + dir * (70 + k * 52), y = 64 + Math.sin((70 + k * 52) * 0.028) * 26;
      g.save(); g.translate(x, y); g.rotate(dir * (k % 2 ? 0.8 : -0.8));
      g.beginPath(); g.ellipse(0, k % 2 ? -12 : 12, 5, 12, 0, 0, Math.PI * 2); g.fill();
      g.restore();
    }
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

export function buildStage(assets) {
  const root = new THREE.Group();
  const T = assets?.tex || {};
  const walnut = new THREE.MeshStandardMaterial({ color: 0x9a6a46, roughness: 0.55, ...withRepeat(T.walnut, 2, 0.5) });
  const walnutPost = new THREE.MeshStandardMaterial({ color: 0x8a5a38, roughness: 0.5, ...withRepeat(T.walnut, 0.3, 2, Math.PI / 2) });
  const darkPanel = new THREE.MeshStandardMaterial({ color: 0x4a2a18, roughness: 0.6, ...withRepeat(T.walnut, 2, 0.4) });
  const planks = new THREE.MeshStandardMaterial({ color: 0xd9b48c, roughness: 0.75, ...withRepeat(T.stagefloor, 1.6, 0.8) });
  const G = gold();

  const W = STAGE.width, D = STAGE.depth, B = STAGE.base;
  const box = (w, h, d, mat, x, y, z) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    m.position.set(x, y, z);
    m.castShadow = m.receiveShadow = true;
    root.add(m);
    return m;
  };

  // base, plinth, floorboards
  box(W + 0.03, 0.012, D + 0.03, walnut, 0, -B + 0.006, 0);
  box(W, B - 0.02, D, walnut, 0, -B / 2 - 0.002, 0);
  box(W + 0.014, 0.008, D + 0.014, walnut, 0, -0.012, 0);
  const floor = box(W - 0.01, 0.008, D - 0.01, planks, 0, -0.004, 0);
  floor.castShadow = false;
  // carved front panel with gilded scrollwork + corner rosettes
  box(W - 0.06, B - 0.032, 0.004, darkPanel, 0, -B / 2 - 0.004, D / 2 + 0.001);
  const scroll = new THREE.Mesh(
    new THREE.PlaneGeometry(W - 0.1, (W - 0.1) / 8),
    new THREE.MeshStandardMaterial({ color: 0xd8ac4f, metalness: 1, roughness: 0.3, alphaMap: scrollTexture(), transparent: true, alphaTest: 0.4 })
  );
  scroll.position.set(0, -B / 2 - 0.004, D / 2 + 0.0035);
  root.add(scroll);
  for (const s of [-1, 1]) {
    const ros = new THREE.Mesh(new THREE.CylinderGeometry(0.011, 0.011, 0.004, 8), G);
    ros.rotation.x = Math.PI / 2;
    ros.position.set(s * (W / 2 - 0.016), -B / 2 - 0.004, D / 2 + 0.003);
    root.add(ros);
  }
  // gilded trim lines
  box(W + 0.016, 0.004, 0.004, G, 0, -0.016, D / 2 + 0.008);
  box(W + 0.034, 0.004, 0.004, G, 0, -B + 0.012, D / 2 + 0.016);

  // corner posts with gold finials, side rails at the top
  const postH = 0.3;
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      const x = sx * (W / 2 - 0.018), z = sz * (D / 2 - 0.018);
      box(0.026, postH, 0.026, walnutPost, x, postH / 2, z);
      box(0.034, 0.012, 0.034, walnutPost, x, 0.006, z);
      box(0.032, 0.01, 0.032, walnutPost, x, postH, z);
      const collar = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.014, 0.012, 16), G);
      collar.position.set(x, postH + 0.011, z);
      const ball = new THREE.Mesh(new THREE.SphereGeometry(0.017, 24, 18), G);
      ball.position.set(x, postH + 0.032, z);
      ball.castShadow = collar.castShadow = true;
      root.add(collar, ball);
    }
    box(0.016, 0.016, D - 0.03, walnutPost, sx * (W / 2 - 0.018), postH - 0.03, 0);
  }

  // the drapery: tied-back side curtains under fixed swags, and the main traveller
  // curtain with its pelmet, closed until the show starts (see drapes.js)
  const drapes = buildDrapes({ W, D, postH, gold: G });
  const mainCurtain = drapes.group;
  drapes.update(0, 0);
  root.add(mainCurtain);
  const curtains = {
    group: mainCurtain,
    k: 0, target: 0, callT: -1,
    open() { this.target = 1; this.manual = null; },
    // the cord is being pulled: the curtain follows your hand (0..1)
    follow(k) { this.manual = k; },
    close() { this.target = 0; },
    call() { this.target = 0.15; this.callT = 1.6; }, // dip for the curtain call, then reopen
    update(dt) {
      if (this.callT > 0 && (this.callT -= dt) <= 0) this.target = 1;
      const goal = this.manual != null ? this.manual : this.target;
      this.k += (goal - this.k) * Math.min(1, dt * (this.manual != null ? 10 : 1.8));
      drapes.update(this.k, dt);
    },
  };

  // the curtain cord: a gold tassel hanging beside the front-right post. Pull it
  // down to raise the curtain (the very first thing a player does).
  const cordGroup = new THREE.Group();
  const cordTop = postH - 0.02, tasselRest = 0.13;
  const cordX = W / 2 + 0.008, cordZ = D / 2 + 0.002;
  const ropeMat = new THREE.MeshStandardMaterial({ color: 0xc9a14a, metalness: 0.6, roughness: 0.45 });
  const rope = new THREE.Mesh(new THREE.CylinderGeometry(0.0016, 0.0016, 1, 6).translate(0, -0.5, 0), ropeMat);
  rope.position.set(cordX, cordTop, cordZ);
  const tasselMat = new THREE.MeshStandardMaterial({ color: 0xe8c060, metalness: 0.7, roughness: 0.3, emissive: 0xffb030, emissiveIntensity: 0.6 });
  const tassel = new THREE.Group();
  const knot = new THREE.Mesh(new THREE.SphereGeometry(0.0065, 14, 10), tasselMat);
  const skirt = new THREE.Mesh(new THREE.ConeGeometry(0.008, 0.024, 14, 1, true), tasselMat);
  skirt.position.y = -0.016;
  tassel.add(knot, skirt);
  tassel.position.set(cordX, tasselRest, cordZ);
  cordGroup.add(rope, tassel);
  root.add(cordGroup);
  const cord = {
    group: cordGroup, tassel, mat: tasselMat,
    rest: tasselRest, pull: 0, held: false, t: 0,
    // world-ish handle position in stage space
    handle(out = new THREE.Vector3()) { return out.copy(tassel.position); },
    update(dt, glow = true) {
      this.t += dt;
      if (!this.held) this.pull += (0 - this.pull) * Math.min(1, dt * 9); // springs back up
      tassel.position.y = this.rest - this.pull;
      tassel.rotation.z = Math.sin(this.t * 1.7) * 0.05 * (this.held ? 0 : 1);
      rope.scale.y = cordTop - tassel.position.y;
      tasselMat.emissiveIntensity = glow ? 0.5 + 0.9 * (0.5 + 0.5 * Math.sin(this.t * 4)) : 0.15;
    },
  };
  cord.update(0);

  // brass footlights along the apron
  const bulbMat = new THREE.MeshBasicMaterial({ color: 0xffd9a0, toneMapped: false });
  for (let i = 0; i < 7; i++) {
    const x = -0.3 + i * 0.1;
    const shell = new THREE.Mesh(new THREE.SphereGeometry(0.011, 16, 10, 0, Math.PI * 2, Math.PI * 0.5, Math.PI * 0.5), G);
    shell.rotation.x = -0.6;
    shell.position.set(x, 0.004, D / 2 - 0.014);
    const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.0055, 10, 8), bulbMat);
    bulb.position.set(x, 0.007, D / 2 - 0.012);
    root.add(shell, bulb);
  }

  // XR buttons on the apron: poke them with a fingertip (no menus in-headset)
  const makeKnob = (color, label) => {
    const grp = new THREE.Group();
    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.018, 0.008, 24), G);
    const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.008, 24), new THREE.MeshStandardMaterial({ color, roughness: 0.3, emissive: color, emissiveIntensity: 0.35 }));
    cap.position.y = 0.008;
    grp.add(base, cap);
    // a little sign above the button saying what it does
    const name = KNOB_LABELS[label] || label;
    const c = document.createElement("canvas"); c.width = 256; c.height = 64;
    const g = c.getContext("2d");
    g.fillStyle = "rgba(20,12,8,0.7)"; g.beginPath(); g.roundRect(2, 6, 252, 52, 26); g.fill();
    g.fillStyle = "#f3dfb0"; g.font = `600 ${name.length > 8 ? 30 : 34}px Georgia, serif`; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText(name, 128, 33);
    const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace;
    const tag = new THREE.Mesh(new THREE.PlaneGeometry(0.048, 0.012), new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, toneMapped: false }));
    tag.rotation.x = -0.35; // a little sign standing just above the button, leaning back
    tag.position.set(0, 0.024, -0.004);
    grp.add(tag);
    grp.userData = { cap, label, tag };
    return grp;
  };
  const recKnob = makeKnob(0xd8433b, "record");
  recKnob.position.set(-0.36, 0.004, D / 2 - 0.05);
  const playKnob = makeKnob(0x3fb36b, "replay");
  playKnob.position.set(-0.31, 0.004, D / 2 - 0.05);
  root.add(recKnob, playKnob);

  // catches shadows on your real desk in passthrough AR
  const shadowCatcher = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 1.1), new THREE.ShadowMaterial({ opacity: 0.35 }));
  shadowCatcher.rotation.x = -Math.PI / 2;
  shadowCatcher.position.y = -B + 0.001;
  shadowCatcher.receiveShadow = true;
  shadowCatcher.visible = false;
  root.add(shadowCatcher);

  const talkKnob = makeKnob(0x3f8fe0, "talk");
  talkKnob.position.set(-0.26, 0.004, D / 2 - 0.05);
  root.add(talkKnob);

  // the "mode" knob (gold): cycles the fun modes you've unlocked
  const modeKnob = makeKnob(0xe0b23a, "mode");
  modeKnob.position.set(-0.21, 0.004, D / 2 - 0.05);
  root.add(modeKnob);

  // the "map" knob (parchment brown): opens the storybook map in the headset
  const mapKnob = makeKnob(0xb07a3a, "map");
  mapKnob.position.set(-0.16, 0.004, D / 2 - 0.05);
  root.add(mapKnob);

  // experiment: the "free" knob (green) lets Marlo break his strings
  const freeKnob = makeKnob(0x4ad06a, "free");
  freeKnob.position.set(-0.11, 0.004, D / 2 - 0.05);
  root.add(freeKnob);

  // the "lock" knob (violet): pinch lock, so a bar stays in your hand without holding the pinch
  const lockKnob = makeKnob(0x9a6ad8, "lock");
  lockKnob.position.set(-0.06, 0.004, D / 2 - 0.05);
  root.add(lockKnob);

  // the "one hand" knob (orange): the arm bar follows the main bar; roll your wrist to raise the arms
  const handKnob = makeKnob(0xe07a3a, "hand");
  handKnob.position.set(-0.01, 0.004, D / 2 - 0.05);
  root.add(handKnob);

  // the "menu" knob (white): the game menu in the headset (story, chapters, free play...)
  const menuKnob = makeKnob(0xf0ece0, "menu");
  menuKnob.position.set(0.04, 0.004, D / 2 - 0.05);
  root.add(menuKnob);

  return { root, knobs: { record: recKnob, replay: playKnob, talk: talkKnob, mode: modeKnob, map: mapKnob, free: freeKnob, lock: lockKnob, hand: handKnob, menu: menuKnob }, shadowCatcher, curtains, cord };
}

// ---------------------------------------------------------------------------
function wallpaperTexture() {
  const c = document.createElement("canvas");
  c.width = c.height = 256;
  const g = c.getContext("2d");
  // a quiet damask: an ogee lattice with a small fleur at each crossing, gold on deep plum
  const bg = g.createLinearGradient(0, 0, 256, 0); bg.addColorStop(0, "#3c2230"); bg.addColorStop(0.5, "#462838"); bg.addColorStop(1, "#3c2230");
  g.fillStyle = bg; g.fillRect(0, 0, 256, 256);
  g.strokeStyle = "rgba(226,184,110,0.16)"; g.lineWidth = 2.2;
  for (const [ox, oy] of [[0, 0], [128, 128], [-128, 128], [128, -128], [256, 0], [0, 256], [256, 256], [0, -256 + 256]]) {
    g.beginPath(); g.moveTo(ox + 64, oy - 64); g.bezierCurveTo(ox + 116, oy - 20, ox + 116, oy + 20, ox + 64, oy + 64); g.bezierCurveTo(ox + 12, oy + 20, ox + 12, oy - 20, ox + 64, oy - 64); g.stroke();
    g.beginPath(); g.moveTo(ox + 64, oy + 64); g.bezierCurveTo(ox + 116, oy + 108, ox + 116, oy + 148, ox + 64, oy + 192); g.bezierCurveTo(ox + 12, oy + 148, ox + 12, oy + 108, ox + 64, oy + 64); g.stroke();
  }
  g.fillStyle = "rgba(226,184,110,0.14)";
  const fleur = (x, y, s) => { g.save(); g.translate(x, y); g.scale(s, s); g.beginPath(); g.ellipse(0, -9, 4, 11, 0, 0, Math.PI * 2); g.fill(); for (const d of [-1, 1]) { g.beginPath(); g.ellipse(d * 8, -2, 3.4, 9, d * 0.7, 0, Math.PI * 2); g.fill(); } g.fillRect(-9, 6, 18, 3); g.beginPath(); g.ellipse(0, 13, 3, 5, 0, 0, Math.PI * 2); g.fill(); g.restore(); };
  for (const [x, y] of [[64, 0], [192, 0], [64, 128], [192, 128], [64, 256], [192, 256], [0, 64], [128, 64], [256, 64], [0, 192], [128, 192], [256, 192]]) fleur(x, y, 1.15);
  for (let i = 0; i < 900; i++) { g.fillStyle = `rgba(${i % 2 ? "255,230,190" : "0,0,0"},${0.03 * Math.random()})`; g.fillRect(Math.random() * 256, Math.random() * 256, 1.5, 6); }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function sketchTexture(kind) {
  const c = document.createElement("canvas");
  c.width = 256; c.height = 320;
  const g = c.getContext("2d");
  g.fillStyle = "#d9c7a2"; g.fillRect(0, 0, 256, 320);
  g.strokeStyle = "#5a4630"; g.lineWidth = 3; g.lineCap = "round";
  if (kind === 0) {
    // a castle on a hill
    g.beginPath(); g.moveTo(10, 260); g.quadraticCurveTo(128, 190, 246, 260); g.stroke();
    g.strokeRect(80, 120, 96, 90);
    for (const x of [70, 166]) { g.strokeRect(x, 90, 20, 120); g.beginPath(); g.moveTo(x - 4, 90); g.lineTo(x + 10, 66); g.lineTo(x + 24, 90); g.stroke(); }
    g.beginPath(); g.arc(128, 210, 16, Math.PI, 0); g.stroke();
  } else {
    // a sailing ship
    g.beginPath(); g.moveTo(40, 220); g.lineTo(216, 220); g.lineTo(190, 250); g.lineTo(66, 250); g.closePath(); g.stroke();
    g.beginPath(); g.moveTo(128, 220); g.lineTo(128, 70); g.stroke();
    g.beginPath(); g.moveTo(128, 80); g.quadraticCurveTo(190, 130, 128, 200); g.stroke();
    g.beginPath(); g.moveTo(40, 280); for (let x = 40; x < 220; x += 20) g.quadraticCurveTo(x + 10, 270, x + 20, 280); g.stroke();
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function paperTexture() {
  const c = document.createElement("canvas");
  c.width = 256; c.height = 340;
  const g = c.getContext("2d");
  g.fillStyle = "#efe4c8"; g.fillRect(0, 0, 256, 340);
  g.strokeStyle = "rgba(60,40,20,0.55)"; g.lineWidth = 2;
  for (let y = 40; y < 320; y += 18) {
    g.beginPath();
    let x = 24;
    g.moveTo(x, y);
    while (x < 232 - Math.random() * 40) { x += 6 + Math.random() * 10; g.lineTo(x, y + (Math.random() - 0.5) * 3); }
    g.stroke();
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

// Room for VR and desktop. deskTop: world height of the desk surface.
export function buildRoom(assets, deskTop) {
  const room = new THREE.Group();
  const T = assets?.tex || {};
  const deskMat = new THREE.MeshStandardMaterial({ color: 0x8b6a52, roughness: 0.55, ...withRepeat(T.desk, 2.2, 1.2) });
  const floorMat = new THREE.MeshStandardMaterial({ color: 0x6b4c38, roughness: 0.7, ...withRepeat(T.stagefloor, 5, 5) });
  const walnut = new THREE.MeshStandardMaterial({ color: 0x7a4f33, roughness: 0.6, ...withRepeat(T.walnut, 1, 1) });
  const wallMat = new THREE.MeshStandardMaterial({ map: wallpaperTexture(), roughness: 0.95 });
  wallMat.map.repeat.set(13, 5.2);
  const add = (geo, mat, pos, parent = room) => {
    const m = new THREE.Mesh(geo, mat);
    m.position.set(...pos);
    m.receiveShadow = true;
    parent.add(m);
    return m;
  };

  const floor = add(new THREE.PlaneGeometry(8, 8), floorMat, [0, 0, 0]);
  floor.rotation.x = -Math.PI / 2;
  // walls with wainscot
  const backZ = -1.5;
  add(new THREE.PlaneGeometry(8, 3.2), wallMat, [0, 1.6, backZ]);
  const panelMat = walnut.clone();
  add(new THREE.BoxGeometry(8, 0.95, 0.03), panelMat, [0, 0.475, backZ + 0.015]);
  add(new THREE.BoxGeometry(8, 0.04, 0.05), walnut, [0, 0.96, backZ + 0.025]);
  for (const sx of [-1, 1]) {
    const side = add(new THREE.PlaneGeometry(4, 3.2), wallMat, [sx * 2.2, 1.6, 0.5]);
    side.rotation.y = -sx * Math.PI / 2;
  }

  // desk
  const desk = new THREE.Group();
  desk.name = "desk";
  add(new THREE.BoxGeometry(1.7, 0.045, 0.95), deskMat, [0, -0.0225, 0], desk);
  for (const [x, z] of [[-0.8, -0.42], [0.8, -0.42], [-0.8, 0.42], [0.8, 0.42]]) add(new THREE.BoxGeometry(0.06, deskTop - 0.045, 0.06), deskMat, [x, -(deskTop + 0.045) / 2, z], desk);
  desk.position.y = deskTop;
  room.add(desk);

  // book stacks on the desk
  const leather = [0x6e1f1f, 0x2d4a2b, 0x1f2f55, 0x5a3a1c, 0x3d2a4a, 0x7a5a2a];
  const goldMat = gold();
  const book = (w, h, d, color, x, y, z, ry = 0, parent = desk) => {
    const b = new THREE.Group();
    const cover = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), new THREE.MeshStandardMaterial({ color, roughness: 0.6 }));
    const pages = new THREE.Mesh(new THREE.BoxGeometry(w * 0.96, h * 0.8, d * 0.97), new THREE.MeshStandardMaterial({ color: 0xe8dcc0, roughness: 0.9 }));
    pages.position.x = w * 0.03;
    const band = new THREE.Mesh(new THREE.BoxGeometry(w * 0.02, h * 1.02, d * 1.01), goldMat);
    band.position.x = -w * 0.42;
    b.add(cover, pages, band);
    b.position.set(x, y + h / 2, z);
    b.rotation.y = ry;
    b.traverse((o) => { if (o.isMesh) { o.castShadow = o.receiveShadow = true; } });
    parent.add(b);
    return b;
  };
  let y = 0;
  [[0.2, 0.05, 0.26], [0.18, 0.04, 0.24], [0.17, 0.045, 0.22]].forEach(([w, h, d], i) => { book(w, h, d, leather[i], -0.64, y, 0.22, 0.15 - i * 0.12); y += h; });
  y = 0;
  [[0.19, 0.045, 0.25], [0.16, 0.035, 0.22]].forEach(([w, h, d], i) => { book(w, h, d, leather[i + 3], 0.66, y, 0.26, -0.2 + i * 0.25); y += h; });
  // papers and a pen
  const paperMat = new THREE.MeshStandardMaterial({ map: paperTexture(), roughness: 0.95 });
  for (const [x, z, r] of [[-0.5, 0.38, 0.3], [-0.42, 0.4, -0.15], [0.48, 0.4, -0.35]]) {
    const p = add(new THREE.PlaneGeometry(0.16, 0.21), paperMat, [x, 0.001, z], desk);
    p.rotation.set(-Math.PI / 2, 0, r);
  }
  const pen = add(new THREE.CylinderGeometry(0.005, 0.005, 0.14, 12), new THREE.MeshStandardMaterial({ color: 0x5a2a12, roughness: 0.3 }), [0.42, 0.006, 0.33], desk);
  pen.rotation.set(Math.PI / 2, 0, 0.9);

  // table lamp with a glowing amber glass shade
  const lamp = new THREE.Group();
  lamp.position.set(-0.68, 0, -0.25);
  desk.add(lamp);
  const brass = new THREE.MeshStandardMaterial({ color: 0xb08a3e, metalness: 1, roughness: 0.3 });
  add(new THREE.CylinderGeometry(0.06, 0.075, 0.025, 28), brass, [0, 0.0125, 0], lamp);
  add(new THREE.CylinderGeometry(0.011, 0.014, 0.32, 16), brass, [0, 0.18, 0], lamp);
  const shadePts = [];
  for (let i = 0; i <= 12; i++) { const t = i / 12; shadePts.push(new THREE.Vector2(0.15 - t * 0.09 + Math.sin(t * Math.PI) * 0.015, t * 0.13)); }
  const shade = add(new THREE.LatheGeometry(shadePts, 32), new THREE.MeshStandardMaterial({ color: 0xf2c27a, emissive: 0xff9a3a, emissiveIntensity: 0.9, roughness: 0.4, side: THREE.DoubleSide }), [0, 0.3, 0], lamp);
  shade.castShadow = false;
  const bulb = new THREE.PointLight(0xffa850, 0.9, 2.6, 1.6);
  bulb.position.set(0, 0.33, 0);
  lamp.add(bulb);

  // bookshelf behind, on the right
  const shelf = new THREE.Group();
  shelf.position.set(1.15, 0, backZ + 0.2);
  room.add(shelf);
  add(new THREE.BoxGeometry(1.1, 2.1, 0.03), walnut, [0, 1.05, -0.17], shelf);
  for (const sx of [-1, 1]) add(new THREE.BoxGeometry(0.04, 2.1, 0.36), walnut, [sx * 0.53, 1.05, 0], shelf);
  const rows = [0.08, 0.5, 0.92, 1.34, 1.76];
  for (const yy of rows) add(new THREE.BoxGeometry(1.06, 0.03, 0.34), walnut, [0, yy, 0], shelf);
  add(new THREE.BoxGeometry(1.14, 0.05, 0.38), walnut, [0, 2.1, 0], shelf);
  // books on shelves (instanced)
  const count = 120;
  // (every book shares one spine design: gilt bands and a title label, tinted by its own leather colour)
  const spine = (() => { const c = document.createElement("canvas"); c.width = 64; c.height = 256; const g = c.getContext("2d");
    g.fillStyle = "#fff"; g.fillRect(0, 0, 64, 256);
    const sh = g.createLinearGradient(0, 0, 64, 0); sh.addColorStop(0, "rgba(0,0,0,0.35)"); sh.addColorStop(0.3, "rgba(0,0,0,0)"); sh.addColorStop(0.7, "rgba(0,0,0,0)"); sh.addColorStop(1, "rgba(0,0,0,0.4)"); g.fillStyle = sh; g.fillRect(0, 0, 64, 256);
    g.fillStyle = "#f0d48a"; for (const y of [18, 26, 200, 208, 232]) g.fillRect(0, y, 64, 3);
    g.fillStyle = "rgba(20,10,6,0.55)"; g.fillRect(8, 60, 48, 46); g.strokeStyle = "#f0d48a"; g.lineWidth = 2; g.strokeRect(8, 60, 48, 46);
    g.fillStyle = "#f0d48a"; for (const y of [72, 82, 92]) g.fillRect(16, y, 32, 3);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; })();
  const inst = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshStandardMaterial({ roughness: 0.6, map: spine }), count);
  const dummy = new THREE.Object3D();
  const col = new THREE.Color();
  let n = 0;
  for (const yy of rows.slice(0, 4)) {
    let x = -0.5;
    while (x < 0.48 && n < count) {
      const w = 0.025 + Math.random() * 0.035;
      const h = 0.24 + Math.random() * 0.12;
      const lean = Math.random() < 0.08 ? 0.25 : 0;
      dummy.position.set(x + w / 2, yy + 0.015 + h / 2, -0.02 + Math.random() * 0.03);
      dummy.rotation.set(0, 0, lean);
      dummy.scale.set(w, h, 0.22 + Math.random() * 0.05);
      dummy.updateMatrix();
      inst.setMatrixAt(n, dummy.matrix);
      inst.setColorAt(n, col.setHex(leather[Math.floor(Math.random() * leather.length)]).multiplyScalar(0.7 + Math.random() * 0.5));
      n++;
      x += w + 0.002 + (lean ? 0.06 : 0);
      if (Math.random() < 0.05) x += 0.08;
    }
  }
  inst.count = n;
  shelf.add(inst);

  // framed sketches on the wall
  [[-0.55, 1.75, 0], [0.15, 1.85, 1]].forEach(([x, yy, kind]) => {
    // gilt-framed paintings of the kingdom (the same scenes the story visits)
    const frame = add(new THREE.BoxGeometry(0.44, 0.54, 0.03), goldMat, [x, yy, backZ + 0.02]);
    frame.castShadow = true;
    add(new THREE.BoxGeometry(0.38, 0.48, 0.032), walnut, [x, yy, backZ + 0.021]);
    const pc = document.createElement("canvas"); pc.width = 340; pc.height = 440;
    paintBackdrop(kind ? "ship" : "courtyard", pc.getContext("2d"), 340, 440);
    const pt = new THREE.CanvasTexture(pc); pt.colorSpace = THREE.SRGBColorSpace;
    add(new THREE.PlaneGeometry(0.34, 0.44), new THREE.MeshStandardMaterial({ map: pt, roughness: 0.8, emissive: 0xffffff, emissiveMap: pt, emissiveIntensity: 0.18 }), [x, yy, backZ + 0.038]);
  });

  return { room, desk, lampLight: bulb };
}
