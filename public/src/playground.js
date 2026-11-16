// Free play: no story, no tasks, just the theatre and everything in it. Pick who you
// play (any of the eight characters, on glowing bars), who the robot plays with you,
// the stage, and a box of toys. Desktop: a side panel. Headset: a floating board of
// tabs and buttons to poke, turned to face you.
import * as THREE from "three";

export const PLAY_SECTIONS = [
  { id: "you", title: "You play", items: [
    ["knight", "Sir Pip"], ["dragon", "Marlo"], ["wizard", "Bramble"], ["pirate", "Captain Pegg"],
    ["troll", "Grumble"], ["clank", "Clank"], ["princess", "Juniper"], ["king", "The King"],
  ] },
  { id: "costar", title: "Co-star", items: [
    ["marlo", "Marlo"], ["wizard", "Bramble"], ["pirate", "Captain Pegg"], ["troll", "Grumble"], ["clank", "Clank"], ["solo", "Nobody (solo)"],
  ] },
  { id: "stage", title: "Stage", items: [
    ["courtyard", "Castle"], ["forest", "Forest"], ["ship", "Pirate ship"], ["bridge", "Troll bridge"],
    ["tower", "Clock tower"], ["cave", "Dragon cave"], ["sky", "Night sky"],
  ] },
  { id: "toys", title: "Toys", items: [
    ["fireworks", "Fireworks"], ["applause", "Applause"], ["flowers", "Magic flowers"], ["night", "Day / night"],
    ["music", "Next music"], ["moon", "Moon gravity"], ["party", "Party lights"], ["fragile", "Fragile strings"],
    ["normal", "Normal physics"], ["fly", "Fly with Marlo"], ["free", "Set co-star free"], ["talk", "Say something"],
  ] },
];

const CW = 0.1, CH = 0.03, GAP = 0.008;

function chipTex(text, kind) {
  const c = document.createElement("canvas");
  c.width = 400; c.height = 120;
  const g = c.getContext("2d");
  const fill = kind === "active" ? "#c0303a" : kind === "tab" ? "#3a5a7a" : kind === "tabOn" ? "#d8ac4f" : "rgba(255,248,232,0.96)";
  const ink = kind === "plain" ? "#3a2414" : "#fff8e8";
  g.fillStyle = fill; g.strokeStyle = kind === "plain" ? "#c9a14a" : "rgba(255,255,255,0.6)"; g.lineWidth = 6;
  g.beginPath(); g.roundRect(5, 5, 390, 110, 46); g.fill(); g.stroke();
  g.fillStyle = ink; g.font = `600 ${text.length > 13 ? 38 : 44}px Georgia, serif`; g.textAlign = "center"; g.textBaseline = "middle";
  g.fillText(text, 200, 62);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

export class Playground {
  // (also used for the story cards: other sections, and an "action" tab such as "Stage it!")
  constructor(parent, onPick, sections = PLAY_SECTIONS, elId = "playground", active = { you: "knight", costar: "marlo", stage: "courtyard" }) {
    this.onPick = onPick;          // (section, id) => void
    this.sections = sections;
    this.active = active;
    this.tab = sections[0].id;
    this.cool = 0;
    this.group = new THREE.Group();
    this.group.visible = false;
    parent.add(this.group);
    this.geo = new THREE.PlaneGeometry(CW, CH);
    const n = sections.length;
    this.tabs = sections.map((sec, i) => this._chip(sec.title, { tab: sec.id, action: !!sec.action }, (i - (n - 1) / 2) * (CW + GAP), 0.03));
    this.items = [];
    this._buildItems();
    // desktop
    this.el = elId ? document.getElementById(elId) : null;
    if (this.el) {
      this.el.innerHTML = `<div class="hd"><b>Free play</b><button class="x" aria-label="Hide">–</button></div>` +
        sections.filter((sec) => !sec.action).map((sec) => `<div class="sec"><div class="t">${sec.title}</div>${sec.items.map(([id, label]) => `<button data-s="${sec.id}" data-id="${id}">${label}</button>`).join("")}</div>`).join("");
      this.el.addEventListener("click", (e) => {
        const b = e.target.closest("button"); if (!b) return;
        if (b.classList.contains("x")) { this.el.classList.toggle("min"); return; }
        this.pick(b.dataset.s, b.dataset.id);
      });
      this._syncHtml();
    }
  }

  _chip(text, data, x, y) {
    const plain = chipTex(text, data.action ? "active" : data.tab ? "tab" : "plain"); // (an action tab is red, like a wax seal)
    const on = chipTex(text, data.tab ? "tabOn" : "active");
    const m = new THREE.Mesh(this.geo, new THREE.MeshBasicMaterial({ map: plain, transparent: true, toneMapped: false, depthWrite: false }));
    m.position.set(x, y, 0);
    m.userData = { ...data, plain, on };
    this.group.add(m);
    return m;
  }

  _buildItems() {
    for (const m of this.items) { this.group.remove(m); m.material.dispose(); m.userData.plain.dispose(); m.userData.on.dispose(); }
    const sec = this.sections.find((s) => s.id === this.tab);
    this.items = sec.items.map(([id, label], i) => this._chip(label, { s: sec.id, id }, ((i % 3) - 1) * (CW + GAP), -0.012 - Math.floor(i / 3) * (CH + GAP)));
    this._syncChips();
  }

  _syncChips() {
    for (const t of this.tabs) t.material.map = t.userData.tab === this.tab ? t.userData.on : t.userData.plain;
    for (const m of this.items) m.material.map = this.active[m.userData.s] === m.userData.id ? m.userData.on : m.userData.plain;
  }
  _syncHtml() {
    this.el?.querySelectorAll("button[data-s]").forEach((b) => b.classList.toggle("on", this.active[b.dataset.s] === b.dataset.id));
  }

  get open() { return this.group.visible || !!this.el?.classList.contains("on"); }
  show(xr) { this.group.visible = !!xr; this.el?.classList.toggle("on", !xr); this.el?.classList.remove("min"); }
  hide() { this.group.visible = false; this.el?.classList.remove("on"); }
  toggle(xr) { this.open ? this.hide() : this.show(xr); }

  // a choice was made (or the game changed one itself)
  set(section, id) {
    if (section in this.active) this.active[section] = id;
    this._syncChips(); this._syncHtml();
  }
  pick(section, id) {
    if (this.cool > 0) return;
    this.cool = 0.5;
    if (section in this.active) this.set(section, id);
    this.onPick(section, id);
  }

  // headset: poke a tab or a button
  poke(tipWorld) {
    if (!this.group.visible || this.cool > 0) return false;
    for (const m of [...this.tabs, ...this.items]) {
      const l = m.worldToLocal(tipWorld.clone());
      if (Math.abs(l.z) > 0.02 || Math.abs(l.x) > CW / 2 || Math.abs(l.y) > CH / 2) continue;
      if (m.userData.action) { this.cool = 0.8; this.onPick(m.userData.tab, "go"); }
      else if (m.userData.tab) { this.cool = 0.5; this.tab = m.userData.tab; this._buildItems(); }
      else this.pick(m.userData.s, m.userData.id);
      return true;
    }
    return false;
  }

  update(dt) { this.cool -= dt; }
}
