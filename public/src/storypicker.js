// The story picker: build your story by choosing (every combination is one the theatre
// can really stage), then see "Tonight's Show" (the title, a picture of the scene and
// the three acts) before the curtain goes up.
//   Desktop: a big illustrated picker (cards drawn in the storybook's own style).
//   Headset: the same choices as a board of cards, and the preview as a poster.
// Typing a story is still there as "write it yourself".
import { VILLAINS, CAPTIVES, DEFAULT_CHALLENGE, DEFAULT_PLACE, buildStory, parseStory, STORY_EXAMPLES } from "./storymaker.js";
import { figure } from "./storybook.js";
import { paintBackdrop } from "./sets.js";

export const PICKS = {
  conflict: [["rescue", "Rescue", "🗝️"], ["duel", "Duel", "⚔️"], ["treasure", "Treasure Hunt", "💰"], ["outsmart", "Outsmart", "❓"], ["befriend", "Befriend", "🌸"]],
  who: [["princess", "Princess Juniper"], ["king", "The King"], ["marlo", "Marlo"], ["wizard", "Bramble"], ["troll", "Grumble"], ["pirate", "Captain Pegg"], ["clank", "Clank"]],
  villain: [["marlo", "Marlo"], ["clank", "Clank"], ["troll", "Grumble"], ["pirate", "Captain Pegg"], ["wizard", "Bramble"]],
  place: [["cave", "Dragon's Cave"], ["ship", "Pirate Ship"], ["tower", "Clockwork Tower"], ["forest", "Whispering Forest"], ["bridge", "Troll Bridge"], ["courtyard", "Castle Courtyard"], ["sky", "Night Sky"]],
  twist: [["none", "No twist", "✨"], ["moon", "Moon Gravity", "🌙"], ["fragile", "Fragile Strings", "🧵"], ["night", "Night Mode", "🌃"]],
};
const LABEL = (sec, id) => PICKS[sec].find((x) => x[0] === id)?.[1] || id;
const pickRandom = (xs) => xs[Math.floor(Math.random() * xs.length)];

// the choices -> the same story description the written stories produce
export function storyFromPicks(c) {
  const villain = c.villain || "marlo";
  const conflict = c.conflict || "rescue";
  let who = c.who || "princess";
  if (who === villain) who = "princess";
  const p = { villain, place: c.place || DEFAULT_PLACE[villain], captive: null, plot: "trouble", challenge: DEFAULT_CHALLENGE[villain], challenges: null, extras: [], friendly: false, twist: c.twist && c.twist !== "none" ? c.twist : null, text: "" };
  if (conflict === "rescue") { p.plot = "kidnap"; p.captive = who; }
  else if (conflict === "duel") p.challenge = "duel";
  else if (conflict === "treasure") p.plot = "steal";
  else if (conflict === "outsmart") p.challenge = villain === "troll" ? "riddle" : "spell";
  else if (conflict === "befriend") { p.plot = "lonely"; p.friendly = true; p.extras = ["flower"]; }
  p.challenges = [p.challenge];
  return p;
}
export function surprisePicks() {
  const villain = pickRandom(PICKS.villain)[0];
  return { conflict: pickRandom(PICKS.conflict)[0], who: pickRandom(PICKS.who.filter((w) => w[0] !== villain))[0], villain, place: Math.random() < 0.6 ? DEFAULT_PLACE[villain] : pickRandom(PICKS.place)[0], twist: Math.random() < 0.5 ? "none" : pickRandom(PICKS.twist)[0] };
}

// the three acts, told in a sentence each (for the preview)
function actPhrase(a, V, named = false) {
  const t = a.task?.type;
  if (t === "duel") return "win a sword duel";
  if (t === "dodge") return named ? "dodge their attacks" : `dodge ${V.the}'s attacks`;
  if (t === "riddle") return "answer the troll's riddle";
  if (t === "simon") return "copy a magic spell";
  if (t === "collect") return a.task.look === "gem" ? "find the three lost jewels" : "catch the fireflies";
  if (t === "unlock") return "unlock the cage";
  if (t === "highfive") return "share a high five";
  if (t === "together") return "dance together";
  if (t === "shy") return `approach ${V.the} gently`;
  if (a.check === "approach") return `face ${V.the}`;
  if (a.check === "hold:lantern") return "light the lantern";
  if (a.check === "give:flower") return "give a flower";
  return null; // (taking the sword, the final bow)
}
const listJoin = (xs) => (xs.length < 2 ? xs.join("") : `${xs.slice(0, -1).join(", ")} and ${xs[xs.length - 1]}`);
export function previewOf(story) {
  const p = story.custom, V = VILLAINS[p.villain], C = p.captive ? CAPTIVES[p.captive] : null;
  const middle = story.acts.slice(0, -1).map((a, i, all) => actPhrase(a, V, all.slice(0, i).some((b) => b.check === "approach"))).filter(Boolean);
  const finale = C ? `Sir Pip rescues ${C.name}, and takes a bow.` : p.plot === "steal" ? "Sir Pip brings the treasure home, and takes a bow." : p.friendly || p.plot === "lonely" ? `Sir Pip and ${V.the} become the best of friends.` : "Sir Pip saves the kingdom, and takes a bow.";
  const conflict = C ? "Rescue" : p.plot === "steal" ? "Treasure Hunt" : p.plot === "lonely" ? "Befriend" : p.challenge === "duel" ? "Duel" : p.challenge === "riddle" || p.challenge === "spell" ? "Outsmart" : "Adventure";
  return {
    title: story.title,
    acts: [
      { title: "The Trouble", text: story.pages[1] },
      { title: "The Adventure", text: `Sir Pip must ${listJoin(middle)}.` },
      { title: "The Finale", text: finale },
    ],
    summary: [["Hero", "Sir Pip"], ["Villain", LABEL("villain", p.villain)], ["Setting", LABEL("place", p.place)], ["Conflict", conflict], ["Twist", p.twist ? LABEL("twist", p.twist) : "None"]],
  };
}

// ---- drawing ------------------------------------------------------------------------
function wrapText(g, text, x, y, maxW, lh, maxLines = 4) {
  const words = text.split(" "); let line = "", n = 0;
  for (const w of words) {
    const t = line ? `${line} ${w}` : w;
    if (g.measureText(t).width > maxW && line) { g.fillText(line, x, y); y += lh; line = w; if (++n >= maxLines - 1) { /* last line */ } } else line = t;
  }
  g.fillText(line, x, y);
  return y + lh;
}
// a little card picture: a character on their home backdrop, a setting, or an icon
export function cardImage(sec, id, w = 200, h = 140) {
  const c = document.createElement("canvas"); c.width = w; c.height = h;
  const g = c.getContext("2d");
  g.save(); g.beginPath(); g.roundRect(0, 0, w, h, 14); g.clip();
  if (sec === "place") paintBackdrop(id, g, w, h);
  else if (sec === "villain" || sec === "who") {
    paintBackdrop(sec === "villain" ? DEFAULT_PLACE[id] || "courtyard" : "courtyard", g, w, h);
    g.fillStyle = "rgba(20,10,30,0.25)"; g.fillRect(0, 0, w, h);
    figure(g, id, w / 2, h - 8, h / 190);
  } else {
    const grad = g.createLinearGradient(0, 0, 0, h); grad.addColorStop(0, "#4a2c6e"); grad.addColorStop(1, "#24163a");
    g.fillStyle = grad; g.fillRect(0, 0, w, h);
    const icon = PICKS[sec].find((x) => x[0] === id)?.[2] || "✨";
    g.font = `${Math.round(h * 0.5)}px serif`; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText(icon, w / 2, h / 2 + 4);
  }
  g.restore();
  return c;
}
// the "Tonight's Show" poster
export function drawPreview(story, W = 1200, H = 720) {
  const c = document.createElement("canvas"); c.width = W; c.height = H;
  const g = c.getContext("2d");
  const pv = previewOf(story), p = story.custom;
  // a theatre board with marquee bulbs
  g.fillStyle = "#3a1d12"; g.beginPath(); g.roundRect(0, 0, W, H, 28); g.fill();
  g.fillStyle = "#f3e6c4"; g.beginPath(); g.roundRect(18, 18, W - 36, H - 36, 18); g.fill();
  g.fillStyle = "#7a1d22"; g.beginPath(); g.roundRect(W / 2 - 230, 26, 460, 74, 16); g.fill();
  for (let i = 0; i < 14; i++) { g.fillStyle = "#ffd98a"; g.beginPath(); g.arc(W / 2 - 215 + i * 33, 34, 5, 0, Math.PI * 2); g.fill(); g.beginPath(); g.arc(W / 2 - 215 + i * 33, 92, 5, 0, Math.PI * 2); g.fill(); }
  g.fillStyle = "#ffe8c8"; g.font = "700 40px Georgia, serif"; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText("Tonight's Show", W / 2, 64);
  g.fillStyle = "#2a1a10"; g.font = "italic 30px Georgia, serif"; g.fillText(pv.title, W / 2, 132);
  // the scene
  const ix = 46, iy = 160, iw = 560, ih = 400;
  g.save(); g.beginPath(); g.roundRect(ix, iy, iw, ih, 14); g.clip();
  g.translate(ix, iy); paintBackdrop(p.place, g, iw, ih);
  if (p.twist === "night") { g.fillStyle = "rgba(10,16,48,0.55)"; g.fillRect(0, 0, iw, ih); }
  figure(g, "pip", iw * 0.24, ih - 26, 1.25);
  figure(g, p.villain, iw * 0.55, ih - 26, 1.3, true);
  if (p.captive) { figure(g, p.captive, iw * 0.82, ih - 30, 0.95, true); figure(g, "cage", iw * 0.82, ih - 22, 1.15); }
  else if (p.plot === "steal") figure(g, "musicbox", iw * 0.82, ih - 30, 1.1);
  g.restore();
  g.strokeStyle = "#c9a14a"; g.lineWidth = 6; g.beginPath(); g.roundRect(ix, iy, iw, ih, 14); g.stroke();
  // the three acts
  pv.acts.forEach((a, i) => {
    const x = 636, y = 160 + i * 136, w = 518, h = 124;
    g.fillStyle = "#fffaf0"; g.strokeStyle = "#d8b878"; g.lineWidth = 3; g.beginPath(); g.roundRect(x, y, w, h, 12); g.fill(); g.stroke();
    g.fillStyle = "#6a3fa0"; g.beginPath(); g.roundRect(x + 14, y + 14, 84, 30, 15); g.fill();
    g.fillStyle = "#fff"; g.font = "700 17px Georgia, serif"; g.textAlign = "center"; g.fillText(`ACT ${i + 1}`, x + 56, y + 30);
    g.fillStyle = "#2a1a10"; g.font = "700 24px Georgia, serif"; g.textAlign = "left"; g.fillText(a.title, x + 112, y + 30);
    g.font = "19px Georgia, serif"; g.fillStyle = "#3a2a20"; g.textBaseline = "alphabetic";
    wrapText(g, a.text, x + 16, y + 72, w - 32, 24, 3);
    g.textBaseline = "middle";
  });
  // who, where, what
  const sy = 588, sw = (W - 92) / pv.summary.length;
  g.fillStyle = "#efe0bc"; g.beginPath(); g.roundRect(46, sy, W - 92, 92, 14); g.fill();
  pv.summary.forEach(([k, v], i) => {
    const x = 46 + i * sw + sw / 2;
    g.textAlign = "center"; g.fillStyle = "#7a5a32"; g.font = "600 17px Georgia, serif"; g.fillText(k, x, sy + 30);
    g.fillStyle = "#2a1a10"; g.font = "700 21px Georgia, serif"; g.fillText(v, x, sy + 62);
  });
  return c;
}

// ---- the desktop picker ------------------------------------------------------------
export class StoryPicker {
  constructor(el, { onStart, summarize }) {
    this.el = el; this.onStart = onStart; this.summarize = summarize;
    this.picks = { conflict: "rescue", who: "princess", villain: "marlo", place: "cave", twist: "none" };
    this.placeTouched = false;
    this.imgs = new Map();
  }
  _img(sec, id) {
    const k = sec + ":" + id;
    if (!this.imgs.has(k)) this.imgs.set(k, cardImage(sec, id).toDataURL());
    return this.imgs.get(k);
  }
  open() { this.el.classList.add("on"); this.view = "pick"; this.render(); }
  close() { this.el.classList.remove("on"); }
  _section(sec, title, sub = "") {
    const items = sec === "who" ? PICKS.who.filter(([id]) => id !== this.picks.villain) : PICKS[sec];
    return `<section class="sec ${sec}"><h3>${title}${sub ? ` <small>${sub}</small>` : ""}</h3><div class="cards">` +
      items.map(([id, label]) => `<button class="card${this.picks[sec] === id ? " on" : ""}" data-s="${sec}" data-id="${id}"><img alt="" src="${this._img(sec, id)}"><span>${label}</span></button>`).join("") + `</div></section>`;
  }
  render() {
    const el = this.el;
    if (this.view === "write") {
      el.innerHTML = `<div class="sp"><button class="x" aria-label="Close">×</button><h2>Write it yourself</h2>
        <p>Write what happens, in your own words. The theatre will stage it, with Sir Pip as the hero.</p>
        <textarea placeholder="${STORY_EXAMPLES[0]}"></textarea><div class="sum"></div>
        <div class="ideas">${STORY_EXAMPLES.map((e) => `<button>${e}</button>`).join("")}</div>
        <div class="row"><button class="ghost back">← Pick instead</button><button class="go">Stage my story ›</button></div></div>`;
      const ta = el.querySelector("textarea"), sum = el.querySelector(".sum");
      const refresh = () => { sum.innerHTML = ta.value.trim() ? this.summarize(parseStory(ta.value)) : "Write a sentence or two, or tap an idea below."; };
      ta.oninput = refresh; refresh();
      el.querySelectorAll(".ideas button").forEach((b) => (b.onclick = () => { ta.value = b.textContent; refresh(); }));
      el.querySelector(".back").onclick = () => { this.view = "pick"; this.render(); };
      el.querySelector(".go").onclick = () => this._preview(buildStory(parseStory(ta.value.trim() || STORY_EXAMPLES[0])));
      setTimeout(() => ta.focus(), 50);
    } else if (this.view === "preview") {
      el.innerHTML = `<div class="sp wide"><button class="x" aria-label="Close">×</button><div class="poster"></div>
        <div class="row"><button class="ghost back">← Edit my choices</button><button class="go">Start adventure ▶</button></div></div>`;
      el.querySelector(".poster").appendChild(drawPreview(this.story));
      el.querySelector(".back").onclick = () => { this.view = this.fromWrite ? "write" : "pick"; this.render(); };
      el.querySelector(".go").onclick = () => { this.close(); this.onStart(this.story); };
    } else {
      const rescue = this.picks.conflict === "rescue";
      el.innerHTML = `<div class="sp wide"><button class="x" aria-label="Close">×</button><h2>Make your own story</h2>
        <p>Choose what happens, and the theatre stages it, with Sir Pip as the hero.</p>
        <div class="grid">${this._section("conflict", "1. Choose the conflict", "What happens in your adventure?")}
        ${rescue ? this._section("who", "2. Who needs rescuing?") : ""}
        ${this._section("villain", `${rescue ? 3 : 2}. Choose your villain`)}
        ${this._section("place", `${rescue ? 4 : 3}. Choose your setting`)}
        ${this._section("twist", `${rescue ? 5 : 4}. Add a twist`, "optional")}</div>
        <div class="row"><button class="ghost write">✎ Write it yourself</button><button class="ghost surprise">🎲 Surprise me</button><button class="go">Generate my story ✨</button></div></div>`;
      el.querySelectorAll(".card").forEach((b) => (b.onclick = () => {
        const { s, id } = b.dataset;
        this.picks[s] = id;
        if (s === "place") this.placeTouched = true;
        if (s === "villain" && !this.placeTouched) this.picks.place = DEFAULT_PLACE[id]; // (the villain's home, unless you chose)
        if (s === "villain" && this.picks.who === id) this.picks.who = "princess";
        this.render();
      }));
      el.querySelector(".write").onclick = () => { this.view = "write"; this.render(); };
      el.querySelector(".surprise").onclick = () => { this.picks = surprisePicks(); this.placeTouched = true; this._preview(buildStory(storyFromPicks(this.picks))); };
      el.querySelector(".go").onclick = () => this._preview(buildStory(storyFromPicks(this.picks)));
    }
    el.querySelector(".x").onclick = () => this.close();
  }
  _preview(story) { this.fromWrite = this.view === "write"; this.story = story; this.view = "preview"; this.render(); }
}
