// Comic-style emote bubbles (♥ ! ? ★ ♪ z …) that pop above a puppet's head, so
// Marlo's mood reads at a glance in the headset and on video. One sprite per
// puppet, textures drawn once and cached.
import * as THREE from "three";

const COLORS = { "♥": "#ff5b7f", "!": "#ffd34a", "?": "#7ff3ff", "★": "#ffd34a", "♪": "#b9a2ff", z: "#9fc4ff", "…": "#e8dcc8", "✦": "#fff0a8" };
const cache = new Map();

function bubble(sym, text) {
  const key = sym + (text || "");
  if (cache.has(key)) return cache.get(key);
  const c = document.createElement("canvas");
  const wide = !!text;
  c.width = wide ? 320 : 128; c.height = 128;
  const g = c.getContext("2d");
  g.fillStyle = "rgba(20, 14, 12, 0.82)";
  g.strokeStyle = COLORS[sym] || "#fff";
  g.lineWidth = 6;
  g.beginPath();
  g.roundRect(6, 6, c.width - 12, 100, 44);
  g.fill(); g.stroke();
  // little tail
  g.beginPath(); g.moveTo(c.width / 2 - 12, 104); g.lineTo(c.width / 2, 124); g.lineTo(c.width / 2 + 12, 104); g.closePath(); g.fill();
  g.fillStyle = COLORS[sym] || "#fff";
  g.textAlign = "center"; g.textBaseline = "middle";
  if (wide) {
    g.font = "700 52px ui-sans-serif, system-ui, sans-serif";
    g.fillText(`${sym} ${text}`, c.width / 2, 58);
  } else {
    g.font = sym === "z" ? "italic 700 70px Georgia, serif" : "700 70px ui-sans-serif, system-ui, sans-serif";
    g.fillText(sym === "z" ? "zZ" : sym, c.width / 2, 60);
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  const out = { tex: t, aspect: c.width / c.height };
  cache.set(key, out);
  return out;
}

export class Emotes {
  constructor(parent) {
    this.parent = parent;
    this.slots = new Map();
  }

  _slot(id) {
    if (!this.slots.has(id)) {
      const s = new THREE.Sprite(new THREE.SpriteMaterial({ transparent: true, depthTest: false, toneMapped: false }));
      s.renderOrder = 11;
      s.visible = false;
      this.parent.add(s);
      this.slots.set(id, { sprite: s, t: 0, life: 0, at: null });
    }
    return this.slots.get(id);
  }

  // id: which puppet; at: () => Vector3 in stage space
  pop(id, sym, at, text = null, life = 1.8, yOff = 0) {
    const s = this._slot(id);
    const { tex, aspect } = bubble(sym, text);
    s.sprite.material.map = tex;
    s.sprite.material.needsUpdate = true;
    s.aspect = aspect;
    s.t = 0; s.life = life; s.at = at; s.yOff = yOff;
    s.sprite.visible = true;
  }

  clear(id) { const s = this.slots.get(id); if (s) s.sprite.visible = false; }

  update(dt) {
    for (const s of this.slots.values()) {
      if (!s.sprite.visible) continue;
      s.t += dt;
      if (s.t > s.life) { s.sprite.visible = false; continue; }
      const k = s.t / s.life;
      const pop = s.t < 0.18 ? (s.t / 0.18) * 1.25 : s.t < 0.3 ? 1.25 - ((s.t - 0.18) / 0.12) * 0.25 : 1;
      const h = 0.044 * pop;
      s.sprite.scale.set(h * s.aspect, h, 1);
      const rise = s.life > 100 ? 0 : k * 0.02; // long-lived bubbles (health) stay put
      s.sprite.position.copy(s.at()).add(new THREE.Vector3(0, 0.055 + s.yOff + rise, 0));
      s.sprite.material.opacity = s.life > 100 ? 1 : k > 0.8 ? (1 - k) / 0.2 : 1;
    }
  }
}
