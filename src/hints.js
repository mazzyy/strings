// "What do I do next?" — when the player is stuck, a glowing arrow points at the
// thing to use, an animated cue shows the motion (sideways, tip, lift, twist,
// pinch), and a label says exactly what to do: keys on desktop, the hand
// gesture in a headset. The narrator says it out loud at the same time.
import * as THREE from "three";

export const HINTS = {
  cord:        { target: "cord",     motion: "down",     desk: [["Drag ↓"], "Pull the gold cord to raise the curtain"], xr: "Pinch the gold tassel, pull it down", voice: ["pullCordDesk", "pullCord"] },
  grab:        { target: "mainBar",  motion: "pinch",    desk: [["Left click"], "Click and hold the glowing bar"], xr: "Pinch near the glowing bar (from below works too)", voice: ["grabDesk", "grab"] },
  walk:        { target: "mainBar",  motion: "sideways", desk: [["Hold click", "Move mouse ←  →"], "Carry Sir Pip across the stage"], xr: "Keep pinching and move your hand sideways", voice: "hintWalk" },
  bow:         { target: "mainBar",  motion: "tip",      desk: [["W"], "Tip forward to bow"], xr: "Tip your wrist forward", voice: "hintBow" },
  wave:        { target: "handsBar", motion: "up",       desk: [["Shift", "Move mouse ↑"], "Lift the small arm bar to wave"], xr: "Pinch the small bar with your other hand, then lift", voice: "hintWave" },
  jump:        { target: "mainBar",  motion: "up",       desk: [["Space"], "Flick up to jump"], xr: "Flick your hand up quickly", voice: "jump" },
  turn:        { target: "mainBar",  motion: "twist",    desk: [["A", "D"], "Twist to turn around"], xr: "Twist your wrist", voice: "turn" },
  takeFlower:  { target: "prop:flower",  motion: "pinch", desk: [["Click the flower"], "Hand it to Sir Pip"], xr: "Pinch the flower, bring it to the knight's hand", voice: "takeProp" },
  takeLantern: { target: "prop:lantern", motion: "pinch", desk: [["Click the lantern"], "Hand it to Sir Pip"], xr: "Pinch the lantern, bring it to the knight's hand", voice: "takeProp" },
  takeSword:   { target: "prop:sword",   motion: "pinch", desk: [["Click the sword"], "Hand it to Sir Pip"], xr: "Pinch the sword, bring it to the knight's hand", voice: "takeProp" },
  give:        { target: "marlo",    motion: "down",     desk: [["Click Marlo"], "Give him what Sir Pip is holding"], xr: "Carry it to Marlo, then let go", voice: "give" },
  collect:     { target: "task",     motion: "sideways", desk: [["Hold click", "Move mouse"], "Walk Sir Pip to the glowing lights"], xr: "Carry Sir Pip to the glowing lights", voice: "hintCollect" },
  simon:       { target: "guest",    motion: "none",     desk: [["Watch"], "Then do the same moves, in the same order"], xr: "Watch, then repeat the moves in order", voice: "hintSimon" },
  duck:        { target: "mainBar",  motion: "tip",      desk: [["W"], "Duck the high swing"], xr: "Tip your wrist forward to duck", voice: "hintDuck" },
  strike:      { target: "guest",    motion: "sideways", desk: [["Move mouse →"], "Lunge at him to strike"], xr: "Thrust your hand toward him to strike", voice: "hintStrike" },
  stone:       { target: "task",     motion: "down",     desk: [["Move mouse"], "Walk Sir Pip onto the right answer"], xr: "Walk Sir Pip onto the right stone", voice: "hintStone" },
  sneak:       { target: "task",     motion: "sideways", desk: [["Move mouse"], "Move only while the light looks away"], xr: "Move only while the light looks away", voice: "hintSneak" },
  takeKey:     { target: "prop:key", motion: "pinch",    desk: [["Click the key"], "Hand it to Sir Pip"], xr: "Pinch the key, bring it to the knight", voice: "hintKey" },
  unlock:      { target: "task",     motion: "down",     desk: [["Click the cage"], "Unlock the cage with the key"], xr: "Carry the key to the cage and let go", voice: "hintUnlock" },
  dodge:       { target: "mainBar",  motion: "up",       desk: [["Space"], "Jump when the zap arrives"], xr: "Flick up to jump the zap", voice: "hintDodge" },
  fly:         { target: "mainBar",  motion: "up",       desk: [["Move mouse ↑ ↓"], "Steer through the rings"], xr: "Move your hand up and down to steer", voice: "hintFly" },
  flyDodge:    { target: "mainBar",  motion: "up",       desk: [["Move mouse ↑ ↓"], "Dodge the flying gears"], xr: "Move up or down to dodge the gears", voice: "hintFlyDodge" },
  chase:       { target: "task",     motion: "sideways", desk: [["Move mouse"], "Fly right up to Clank"], xr: "Fly right up to Clank", voice: "hintChase" },
  clap:        { target: "guest",    motion: "none",     desk: [["K"], "Clap for Marlo"], xr: "Clap your hands!", voice: "clapForMarlo" },
  perch:       { target: "guest",    motion: "none",     desk: [["Shift + hold still"], "Offer your other hand"], xr: "Hold out your open hand, very still", voice: "holdHand" },
  record:      { target: "knob:record", motion: "poke",  desk: [["R"], "Record your scene"], xr: "Poke the red button", voice: ["hintRecordDesk", "hintRecord"] },
  talk:        { target: "marlo",    motion: "none",     desk: [["Hold V"], "Talk to Marlo"], xr: "Poke the blue button and speak", voice: "talk" },
};

const CYAN = 0x7ff3ff;

function labelTexture(text) {
  const c = document.createElement("canvas");
  const g = c.getContext("2d");
  const font = "600 44px ui-sans-serif, system-ui, sans-serif";
  g.font = font;
  const w = Math.ceil(g.measureText(text).width) + 120;
  c.width = w; c.height = 100;
  g.font = font;
  g.fillStyle = "rgba(14, 22, 30, 0.82)";
  g.strokeStyle = "rgba(127, 243, 255, 0.9)";
  g.lineWidth = 4;
  g.beginPath();
  g.roundRect(4, 4, w - 8, 92, 46);
  g.fill(); g.stroke();
  // little hand icon
  g.fillStyle = "#7ff3ff";
  g.beginPath(); g.arc(52, 50, 16, 0, Math.PI * 2); g.fill();
  g.fillStyle = "#0e161e";
  g.beginPath(); g.arc(52, 50, 6, 0, Math.PI * 2); g.fill();
  g.fillStyle = "#eafcff";
  g.textBaseline = "middle";
  g.fillText(text, 86, 52);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return { tex: t, aspect: w / 100 };
}

export class Hints {
  constructor(parent, resolve) {
    this.resolve = resolve; // (targetName) => THREE.Vector3 in stage space, or null
    this.group = new THREE.Group();
    parent.add(this.group);
    const glow = new THREE.MeshBasicMaterial({ color: CYAN, transparent: true, opacity: 0.9, toneMapped: false, depthTest: false });
    const soft = new THREE.MeshBasicMaterial({ color: CYAN, transparent: true, opacity: 0.35, toneMapped: false, depthTest: false });

    // pointer arrow above the target
    this.arrow = new THREE.Group();
    const head = new THREE.Mesh(new THREE.ConeGeometry(0.014, 0.03, 16), glow);
    head.rotation.x = Math.PI;
    const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.004, 0.035, 8), glow);
    shaft.position.y = 0.032;
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.03, 0.0025, 8, 36), soft);
    ring.rotation.x = Math.PI / 2;
    ring.position.y = -0.03;
    this.ring = ring;
    this.arrow.add(head, shaft, ring);
    this.group.add(this.arrow);

    // motion cues
    const arc = (pts, closed = false) => {
      const curve = new THREE.CatmullRomCurve3(pts.map((p) => new THREE.Vector3(...p)), closed);
      return new THREE.Mesh(new THREE.TubeGeometry(curve, 40, 0.003, 6, closed), glow);
    };
    const cone = (pos, dirv) => {
      const c = new THREE.Mesh(new THREE.ConeGeometry(0.009, 0.02, 12), glow);
      c.position.set(...pos);
      c.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), new THREE.Vector3(...dirv).normalize());
      return c;
    };
    const cue = (...parts) => { const g = new THREE.Group(); if (parts.length) g.add(...parts); g.visible = false; this.group.add(g); return g; };
    this.cues = {
      sideways: cue(arc([[-0.09, 0, 0], [0.09, 0, 0]]), cone([-0.1, 0, 0], [-1, 0, 0]), cone([0.1, 0, 0], [1, 0, 0])),
      up: cue(arc([[0, -0.04, 0], [0, 0.06, 0]]), cone([0, 0.07, 0], [0, 1, 0])),
      down: cue(arc([[0, 0.06, 0], [0, -0.03, 0]]), cone([0, -0.04, 0], [0, -1, 0])),
      tip: cue(arc([[0, 0.05, -0.04], [0, 0.07, 0.0], [0, 0.04, 0.05]]), cone([0, 0.03, 0.06], [0, -0.6, 1])),
      twist: cue(arc(Array.from({ length: 24 }, (_, i) => [Math.cos((i / 24) * Math.PI * 1.7) * 0.06, 0, Math.sin((i / 24) * Math.PI * 1.7) * 0.06])), cone([0.06 * Math.cos(Math.PI * 1.7), 0, 0.06 * Math.sin(Math.PI * 1.7)], [Math.sin(Math.PI * 1.7), 0, -Math.cos(Math.PI * 1.7)])),
      pinch: cue(...[-1, 1].map((s) => { const d = new THREE.Mesh(new THREE.SphereGeometry(0.008, 12, 10), glow); d.userData.s = s; return d; })),
      poke: cue(arc([[0, 0.08, 0.03], [0, 0.02, 0.01]]), cone([0, 0.012, 0.006], [0, -1, -0.3])),
      none: cue(),
    };

    // floating label (shown in a headset; desktop uses the on-screen chip)
    this.label = new THREE.Sprite(new THREE.SpriteMaterial({ transparent: true, depthTest: false, toneMapped: false }));
    this.label.renderOrder = 10;
    this.group.add(this.label);
    for (const o of [this.arrow, ...Object.values(this.cues)]) o.traverse((m) => (m.renderOrder = 10));

    this.chip = document.getElementById("hint");
    this.current = null;
    this.t = 0;
    this.group.visible = false;
  }

  // name: key of HINTS. xr: whether a headset is in use
  show(name, xr) {
    const h = HINTS[name];
    if (!h) return;
    if (this.current === name && this.xr === xr) return;
    this.current = name;
    this.xr = xr;
    this.group.visible = true;
    for (const [k, c] of Object.entries(this.cues)) c.visible = k === h.motion;
    if (xr) {
      const { tex, aspect } = labelTexture(h.xr);
      this.label.material.map?.dispose();
      this.label.material.map = tex;
      this.label.material.needsUpdate = true;
      this.label.scale.set(0.045 * aspect, 0.045, 1);
      this.label.visible = true;
      this.chip?.classList.remove("on");
    } else {
      this.label.visible = false;
      if (this.chip) {
        const [keys, text] = h.desk;
        this.chip.innerHTML = keys.map((k) => `<kbd>${k}</kbd>`).join('<span class="plus">+</span>') + `<span class="txt">${text}</span>`;
        this.chip.classList.add("on");
      }
    }
  }

  hide() {
    if (!this.current) return;
    this.current = null;
    this.group.visible = false;
    this.chip?.classList.remove("on");
  }

  voiceKey(name, xr) {
    const v = HINTS[name]?.voice;
    return Array.isArray(v) ? (xr ? v[1] : v[0]) : v;
  }

  update(dt) {
    if (!this.current) return;
    this.t += dt;
    const h = HINTS[this.current];
    const p = this.resolve(h.target);
    if (!p) { this.group.visible = false; return; }
    this.group.visible = true;
    const bob = Math.sin(this.t * 4) * 0.01;
    this.arrow.position.copy(p).add(new THREE.Vector3(0, 0.07 + bob, 0));
    this.ring.scale.setScalar(1 + (this.t * 1.5) % 1 * 0.6);
    this.ring.material.opacity = 0.45 * (1 - ((this.t * 1.5) % 1));
    const cue = this.cues[h.motion];
    if (cue) {
      cue.position.copy(p).add(new THREE.Vector3(0, h.motion === "poke" ? 0 : 0.0, h.motion === "sideways" || h.motion === "up" ? 0.05 : 0));
      // animate: pulse along the motion
      const k = (this.t * 0.9) % 1;
      if (h.motion === "pinch") cue.children.forEach((d) => d.position.set(d.userData.s * 0.022 * (1 - Math.sin(k * Math.PI)), 0.0, 0.04));
      else if (h.motion === "twist") cue.rotation.y = -k * 0.6;
      else if (h.motion === "tip") cue.rotation.x = Math.sin(k * Math.PI) * 0.3;
      else if (h.motion === "sideways") cue.position.x += Math.sin(this.t * 3) * 0.02;
      else if (h.motion === "up") cue.position.y += k * 0.02;
      else if (h.motion === "down" || h.motion === "poke") cue.position.y -= k * 0.02;
    }
    this.label.position.copy(p).add(new THREE.Vector3(0, 0.15 + bob, 0));
  }
}
