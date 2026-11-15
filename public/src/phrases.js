// Talking without a microphone. Speech recognition doesn't exist in the Quest
// Browser, and the hosted build has no AI server, so talking is done with your
// hands: poke one of the speech bubbles that float over the stage (or click one on
// desktop), and Sir Pip says it. The guest answers in their own recorded voice and
// acts on it, and their mind remembers that you talked.
import * as THREE from "three";

export const PHRASES = [
  { key: "hello", text: "Hello!", reaction: "wave" },
  { key: "name", text: "What's your name?", reaction: "wave" },
  { key: "dance", text: "Let's dance!", reaction: "dance" },
  { key: "jump", text: "Can you jump?", reaction: "jump" },
  { key: "friend", text: "Be my friend?", reaction: "dance" },
  { key: "come", text: "Come here!", reaction: "approach" },
];

const CW = 0.11, CH = 0.034; // one bubble, in stage metres

function chipTexture(text) {
  const c = document.createElement("canvas");
  c.width = 440; c.height = 136;
  const g = c.getContext("2d");
  g.fillStyle = "rgba(255,248,232,0.96)";
  g.strokeStyle = "#c9a14a"; g.lineWidth = 8;
  g.beginPath(); g.roundRect(6, 6, 428, 110, 50); g.fill(); g.stroke();
  g.beginPath(); g.moveTo(70, 112); g.lineTo(58, 134); g.lineTo(100, 112); g.closePath(); g.fill(); // the speech tail
  g.fillStyle = "#3a2414"; g.font = "600 44px Georgia, serif"; g.textAlign = "center"; g.textBaseline = "middle";
  g.fillText(text, 220, 62);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

export class Phrases {
  constructor(parent, onPick) {
    this.onPick = onPick;
    this.group = new THREE.Group();
    this.group.visible = false;
    parent.add(this.group);
    const geo = new THREE.PlaneGeometry(CW, CH * 1.236);
    this.chips = PHRASES.map((p, i) => {
      const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ map: chipTexture(p.text), transparent: true, toneMapped: false, depthWrite: false }));
      m.position.set(((i % 3) - 1) * (CW + 0.012), (i < 3 ? 1 : 0) * (CH + 0.016), 0);
      m.userData.phrase = p;
      this.group.add(m);
      return m;
    });
    this.t = 0;
    this.cool = 0;
    // desktop: the same bubbles as buttons
    this.el = document.getElementById("phrases");
    if (this.el) {
      this.el.innerHTML = `<div class="t">Say something</div>` + PHRASES.map((p, i) => `<button data-i="${i}">${p.text}</button>`).join("") + `<button class="x" aria-label="Close">×</button>`;
      this.el.addEventListener("click", (e) => {
        const b = e.target.closest("button"); if (!b) return;
        if (b.classList.contains("x")) return this.hide();
        this.pick(PHRASES[+b.dataset.i]);
      });
    }
  }

  get open() { return this.group.visible || !!this.el?.classList.contains("on"); }

  show(xr) {
    this.t = 0;
    this.group.visible = !!xr;
    this.el?.classList.toggle("on", !xr);
  }
  hide() { this.group.visible = false; this.el?.classList.remove("on"); }
  toggle(xr) { this.open ? this.hide() : this.show(xr); }

  pick(p) {
    if (this.cool > 0) return;
    this.cool = 1.6;
    this.t = 0;
    this.onPick(p);
  }

  // headset: poke a bubble
  poke(tipWorld) {
    if (!this.group.visible || this.cool > 0) return false;
    for (const m of this.chips) {
      const l = m.worldToLocal(tipWorld.clone());
      if (Math.abs(l.z) < 0.02 && Math.abs(l.x) < CW / 2 && Math.abs(l.y) < CH * 0.62) { this.pick(m.userData.phrase); return true; }
    }
    return false;
  }

  update(dt) {
    this.cool -= dt;
    if (!this.open) return;
    this.t += dt;
    this.chips.forEach((m, i) => { m.scale.setScalar(1 + (this.cool > 0.9 ? 0 : Math.sin(this.t * 2 + i) * 0.02)); });
    if (this.t > 25) this.hide(); // tucked away when not in use
  }
}
