// Marlo's mind: a small, fully offline agent, so the co-performer feels alive
// even on the hosted build with no language model.
//
//  - Mood: joy, trust and energy drift with what Sir Pip does.
//  - Memory: Marlo remembers how often you bowed, fell, jumped, ignored him,
//    and what you gave him, and his answers change with it (a third fall gets
//    a giggle, not help; waving a sword before he trusts you makes him back off).
//  - Initiative: when the stage goes quiet, Marlo acts on his own. He challenges
//    you to copy him, fetches a prop for the knight, sulks if ignored, dozes off
//    when tired, and when you're stuck in a scene he shows you what to do.
import * as THREE from "three";

const pick = (xs) => xs[Math.floor(Math.random() * xs.length)];
const clamp01 = (x) => Math.max(0, Math.min(1, x));

// what Marlo demonstrates when the player is stuck on an act
const DEMO = {
  approach: { clip: "point", line: "overHere", toPip: true },
  bow: { clip: "bow", line: "likeThis", copy: "bow" },
  jump: { clip: "jump", line: "likeThis", copy: "jump" },
  wave: { clip: "wave", line: "likeThis", copy: "wave" },
  turn: { clip: "turn", line: "likeThis", copy: "turn" },
  walk: { clip: "point", line: "overHere", toPip: true },
  hold: { clip: "point", line: "lookThere", toRack: true },
  give: { clip: "point", line: "forMeAsk", toPip: true },
};
const COPYABLE = { jump: "jump", bow: "bow", wave: "wave", turn: "turn" };

export class MarloMind {
  constructor({ ai, pip, marlo, props, rackPos, say, emote, coach }) {
    Object.assign(this, { ai, pip, marlo, props, rackPos, say, emote, coach });
    this.mood = { joy: 0.55, trust: 0.45, energy: 0.85 };
    this.mem = { bow: 0, jump: 0, fall: 0, wave: 0, walk: 0, approach: 0, gift: 0, sword: 0, copied: 0, missed: 0, snap: 0 };
    this.t = 0;
    this.lastEvent = 0;
    this.lastClose = 0;
    this.nextIdea = 9;
    this.challenge = null; // { move, until }
    this.state = "curious"; // curious | happy | sulking | sleepy | wary | playful
    this.introducedCopy = false;
    this.enabled = true;
  }

  get moodName() {
    if (this.ai.sleeping) return "asleep";
    if (this.state === "sulking") return "sulking";
    if (this.challenge) return "waiting for you to copy";
    if (this.state === "wary") return "wary";
    const { joy, energy } = this.mood;
    if (energy < 0.25) return "sleepy";
    if (joy > 0.75) return "delighted";
    if (joy > 0.55) return "happy";
    if (joy < 0.3) return "glum";
    return "curious";
  }

  _bump(k, d) { this.mood[k] = clamp01(this.mood[k] + d); }

  // Every detected action. Returns the reaction Marlo performs.
  hear(ev, ctx = {}) {
    this.t = ctx.t ?? this.t;
    this.lastEvent = this.t;
    this.nextIdea = this.t + 8 + Math.random() * 5;
    const m = this.mem;
    if (ev.type !== "idle") this._bump("energy", 0.04);

    // a copy-me challenge is open: did Sir Pip match it?
    if (this.challenge && COPYABLE[ev.type] === this.challenge.move) {
      this.challenge = null;
      m.copied++;
      this._bump("joy", 0.2);
      this._bump("trust", 0.1);
      this.emote("★");
      this.say(pick(["yay", "yay2"]));
      return "dance";
    }

    if (this.state === "sulking" && (ev.type === "approach" || ev.type === "give" || ev.type === "talk" || ev.type === "wave")) {
      this.state = "curious";
      this._bump("joy", 0.2);
      this.emote("♥");
      this.say("cheerUp");
      return ev.type === "give" ? "dance" : "jump";
    }

    switch (ev.type) {
      case "bow":
        m.bow++; this._bump("trust", 0.08); this._bump("joy", 0.04);
        return "bow";
      case "wave":
        m.wave++; this._bump("joy", 0.05);
        return pick(["wave", "wave", "jump"]);
      case "jump":
        m.jump++; this._bump("energy", 0.06);
        if (m.jump >= 3 && this.mood.joy > 0.5) { this.state = "playful"; return "dance"; }
        return pick(["jump", "mirror", "dance"]);
      case "fall":
        m.fall++;
        if (m.fall >= 3) { this.emote("♪"); this.say("giggle"); this._bump("joy", 0.06); return "laugh"; }
        this.emote("!");
        if (m.fall === 1) this.say("ohNo");
        return "help";
      case "slump":
        this.emote("?");
        return pick(["slump", "approach"]);
      case "rise":
        return pick(["wave", "jump"]);
      case "walk":
        m.walk++;
        if (ev.where === "toward Marlo") return this.mood.trust < 0.3 ? "retreat" : pick(["bow", "approach", "wave"]);
        return pick(["approach", "mirror", "turn"]);
      case "approach":
        m.approach++; this.lastClose = this.t; this._bump("trust", 0.05); this._bump("joy", 0.04);
        return this.mood.trust < 0.3 ? "retreat" : pick(["dance", "bow", "wave"]);
      case "turn":
        return pick(["turn", "mirror"]);
      case "hold":
        if (ev.prop === "sword") {
          m.sword++;
          if (this.mood.trust < 0.6) { this.state = "wary"; this.emote("!"); this.say("careful"); return "retreat"; }
          this.state = "playful"; return "jump"; // a friendly duel
        }
        if (ev.prop === "lantern") { this.emote("✦"); return "approach"; }
        this.emote("♥"); return "bow";
      case "give":
        m.gift++; this._bump("joy", 0.3); this._bump("trust", 0.2);
        if (this.state === "wary") this.state = "curious";
        this.emote("♥"); this.say("forMe");
        return "dance";
      case "drop":
        return "idle";
      case "talk":
        this._bump("joy", 0.05);
        return null;
      case "snap":
        m.snap++; this.emote("♪"); this.say("giggle");
        return "laugh";
      case "idle":
        return null; // handled by initiative
      default:
        return "idle";
    }
  }

  // ctx: { t, act (current act or null), actT, busyVoice, showState }
  update(dt, ctx) {
    this.t = ctx.t;
    this._bump("energy", -dt * 0.004);
    if (this.state === "wary" && this.props.heldBy("pip") !== "sword") this.state = "curious";
    if (this.ai.sleeping && this.napping && this.t > this.napUntil) this._wake();

    // a challenge times out
    if (this.challenge && this.t > this.challenge.until) {
      this.challenge = null;
      this.mem.missed++;
      this._bump("joy", -0.08);
      this.emote("…");
      this.say("aww");
    }

    if (!this.enabled || this.ai.busy || this.ai.sleeping || ctx.busyVoice) return;
    if (this.t < this.nextIdea) return;
    if (ctx.showState === "finale" || ctx.showState === "intro" || ctx.showState === "idle" || ctx.showState === "ending") return;
    this.nextIdea = this.t + 10 + Math.random() * 6;

    // during a scene Marlo lets you focus, but if you're stuck he shows you how
    if (ctx.act) { if (ctx.actT > 9) this._demonstrate(ctx.act); return; }

    const quiet = this.t - this.lastEvent;
    const ignored = this.t - this.lastClose;
    if (this.mood.energy < 0.22 && quiet > 14) return this._nap();
    if (ignored > 40 && this.state !== "sulking" && Math.random() < 0.6) return this._sulk();
    const options = ["challenge", "challenge", "fetch"];
    if (this.mood.joy > 0.65) options.push("dance");
    const idea = pick(options);
    if (idea === "fetch" && this._fetch()) return;
    if (idea === "dance") { this.emote("♪"); this.ai.react("dance"); return; }
    this._challenge();
  }

  _demonstrate(act) {
    const [type, prop] = act.check.split(":");
    const d = DEMO[type];
    if (!d) return;
    const opts = {};
    if (d.toRack) opts.target = this.props.position(prop) || this.rackPos.clone();
    if (d.toPip) opts.target = this.pip.center(new THREE.Vector3());
    this.ai.react(d.clip, opts);
    this.say(d.line);
    this.emote(d.copy ? "!" : "?");
    if (d.copy) this.challenge = { move: d.copy, until: this.t + 9 };
  }

  _challenge() {
    const move = pick(Object.keys(COPYABLE).filter((k) => k !== this.lastMove));
    this.lastMove = move;
    this.ai.react(move, { force: true });
    this.challenge = { move, until: this.t + 8 };
    this.emote("?");
    this.say(pick(["copyMe", "yourTurn"]));
    if (!this.introducedCopy) { this.introducedCopy = true; this.coach("copyIntro"); }
  }

  _fetch() {
    if (this.props.heldBy("pip") || this.props.heldBy("marlo")) return false;
    const name = this.props.restingItem();
    if (!name) return false;
    this.say("fetching");
    this.ai.react("fetch", {
      at: this.props.position(name),
      onPick: () => this.props.moveTo(name, "marlo", { silent: true }),
      onDeliver: () => { this.props.moveTo(name, "pip", { from: "marlo" }); this.say("forYou"); this.emote("♥"); this._bump("joy", 0.08); },
      onAbort: () => { if (this.props.heldBy("marlo") === name) this.props.moveTo(name, "rack", { silent: true }); },
    });
    return true;
  }

  _sulk() {
    this.state = "sulking";
    this.emote("…");
    this.say("hmph");
    this.ai.react("sulk", { dur: 14 });
    this.lastClose = this.t; // don't sulk again straight away
  }

  _nap() {
    this.say("yawn");
    this.emote("z");
    this.ai.sleep(true);
    this.napping = true;
    this.napUntil = this.t + 12;
  }

  // a nap ends early with any big action
  wakeIfNapping() { if (this.napping) this._wake(); }
  _wake() {
    this.napping = false;
    this.ai.sleep(false);
    this.mood.energy = 0.8;
    this.emote("!");
    this.say("wake");
  }

  // context for the narrator / LLM
  summary() {
    return `Marlo is feeling ${this.moodName}.`;
  }
}
