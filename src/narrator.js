// The narrator: turns Sir Pip's actions into one spoken line at a time.
// - Lines come from an LLM through the local server (Claude, or Qwen via Ollama)
//   when one is available, otherwise from the built-in storyteller (lines.js).
// - Speech is a natural Kokoro voice: built-in lines are pre-recorded
//   (public/voice), live LLM lines are voiced by the server. The browser's
//   robotic speech synthesis is never used.
// - Audio plays through `player` (spatial audio from the robot's head).
import { describe } from "./director.js";
import { LINES, COACH, PROP_LINES } from "./lines.js";

const pick = (xs) => xs[Math.floor(Math.random() * xs.length)];

export class Narrator {
  constructor({ onLine, onReaction, player }) {
    this.onLine = onLine;
    this.onReaction = onReaction;
    this.player = player;
    this.story = [];
    this.pending = [];
    this.queue = []; // coach lines waiting for a gap
    this.busy = false;
    this.lastLine = -10;
    this.muted = false;
    this.ai = false;
    this.aiName = null;
    this.speakingUntil = 0;
    this.t = 0;
    this.manifest = {};
    fetch("voice/manifest.json").then((r) => (r.ok ? r.json() : null)).then((m) => { if (m) this.manifest = m.lines; }).catch(() => {});
    const poll = () =>
      fetch("api/status").then((r) => (r.ok ? r.json() : null)).then((s) => { this.ai = !!s?.ai; this.aiName = s?.name || null; }).catch(() => { this.ai = false; });
    poll();
    this._poll = setInterval(poll, 10000);
  }

  get source() { return this.ai ? this.aiName : "built-in"; }
  get speaking() { return this.t < this.speakingUntil; }

  // every detected action
  hear(ev) {
    this.pending.push(ev);
    if (this.pending.length > 6) this.pending.shift();
  }

  // a guidance line (onboarding etc). Spoken at the next gap, ahead of story lines.
  coach(key) {
    const line = COACH[key] || key;
    if (this.queue.includes(line)) return;
    this.queue.push(line);
    if (this.queue.length > 2) this.queue.shift();
  }

  update(dt) {
    this.t += dt;
    if (this.busy || this.speaking) return;
    if (this.queue.length) {
      this.pending.length = 0; // the coach line covers this moment
      this.say(this.queue.shift());
      return;
    }
    if (this.pending.length === 0 || this.t - this.lastLine < 3) return;
    const events = this.pending.splice(0);
    this.busy = true;
    this._next(events).finally(() => (this.busy = false));
  }

  async _next(events) {
    const said = events.map(describe);
    let line = null, reaction = null, audio = null;
    if (this.ai) {
      try {
        const r = await fetch("api/narrate", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ events: said, story: this.story }),
          signal: AbortSignal.timeout(9000),
        });
        if (r.ok) ({ line, reaction, audio } = await r.json());
        else if (r.status === 503) this.ai = false;
      } catch { /* fall back to the built-in storyteller */ }
      // an improvised line nobody can voice naturally is dropped for a recorded one
      if (line && !audio) line = null;
    }
    if (!line) {
      const ev = events[events.length - 1];
      line = pick(LINES[ev.type] || PROP_LINES[ev.type] || ["Sir Pip does something no one expected."])
        .replace("{where}", ev.where || "across the stage")
        .replace("{toward}", ev.toward || "the audience")
        .replace("{prop}", ev.prop || "prop");
    }
    this.story.push(line);
    if (this.story.length > 12) this.story.shift();
    if (reaction && this.onReaction) this.onReaction(reaction);
    this.say(line, audio);
  }

  // speak a line: pre-recorded clip > server-voiced clip > browser speech
  say(line, audioUrl = null) {
    this.lastLine = this.t;
    this.onLine?.(line);
    const clip = audioUrl || (this.manifest[line] ? `voice/${this.manifest[line]}` : null);
    const estimate = 1.2 + line.split(/\s+/).length * 0.36;
    this.speakingUntil = this.t + estimate;
    if (this.muted) return;
    // only the natural recorded voice is ever used — never the browser's robotic
    // speech synthesis; if a clip can't play, the caption carries the line
    if (clip && this.player) {
      this.player.play(clip).then((seconds) => {
        if (seconds) this.speakingUntil = this.t + seconds + 0.3;
      }).catch(() => {});
    }
  }

  setMuted(m) {
    this.muted = m;
    if (m) this.player?.stop?.();
  }
}
