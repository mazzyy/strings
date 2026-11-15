// Talk to Marlo. Speech is recognised by the browser (where it supports it);
// Marlo answers in his own voice and acts on what you said.
//  - With the local server (Qwen/Claude): a free-form reply, voiced live.
//  - Without it (hosted build): keyword understanding + pre-recorded replies.
import { MARLO_TALK } from "./lines.js";

const RULES = [
  [/\b(hi|hello|hey|greetings|good (morning|evening))\b/, "hello", "wave"],
  [/\bdanc/, "dance", "dance"],
  [/\bbow/, "bow", "bow"],
  [/\bjump|hop\b/, "jump", "jump"],
  [/\b(come|here|closer)\b/, "come", "approach"],
  [/\b(go away|leave|shoo|back off)\b/, "go", "retreat"],
  [/\b(friend|love|like you)\b/, "friend", "dance"],
  [/\b(name|who are you)\b/, "name", "wave"],
  [/\bsorry\b/, "sorry", "approach"],
  [/\b(fire|breathe|flame)\b/, "fire", "jump"],
];

// talk: the current guest's lines (Marlo's by default)
export function understand(text, talk = MARLO_TALK) {
  const t = text.toLowerCase();
  for (const [re, key, reaction] of RULES) if (re.test(t)) return { line: talk[key], reaction };
  return { line: talk.unknown, reaction: "turn" };
}

export class Talk {
  constructor({ narrator, onReply, onHeard, onState }) {
    this.narrator = narrator;
    this.onReply = onReply;   // ({line, reaction, audio}) => void
    this.onHeard = onHeard;   // (text) => void
    this.onState = onState;   // (listening:boolean) => void
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    this.supported = !!SR;
    this.listening = false;
    if (!SR) return;
    this.rec = new SR();
    this.rec.lang = "en-US";
    this.rec.interimResults = false;
    this.rec.maxAlternatives = 1;
    this.rec.onresult = (e) => {
      const text = e.results[0]?.[0]?.transcript?.trim();
      if (text) this._answer(text);
    };
    this.rec.onend = () => { this.listening = false; this.onState?.(false); };
    this.rec.onerror = () => { this.listening = false; this.onState?.(false); };
  }

  start() {
    if (!this.supported || this.listening) return false;
    try { this.rec.start(); this.listening = true; this.onState?.(true); return true; } catch { return false; }
  }
  stop() { if (this.listening) try { this.rec.stop(); } catch { /* already stopped */ } }

  async _answer(text) {
    this.onHeard?.(text);
    let out = null;
    if (this.narrator.ai) {
      try {
        const r = await fetch("api/talk", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ text, story: this.narrator.story, character: this.character?.() }),
          signal: AbortSignal.timeout(9000),
        });
        if (r.ok) out = await r.json();
        if (out && !out.audio) out = null; // never answer in a robotic voice
      } catch { out = null; }
    }
    this.onReply?.(out || understand(text, this.talkLines?.()));
  }
}
