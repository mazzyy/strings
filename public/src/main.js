import * as THREE from "three";
import { XRHandModelFactory } from "three/addons/webxr/XRHandModelFactory.js";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";
import { Marionette } from "./puppet.js";
import { buildStage, buildRoom, STAGE } from "./stage.js";
import { knightSkin, dragonSkin } from "./skins.js";
import { Robot } from "./robot.js";
import { loadAssets } from "./assets.js";
import { mergeStatic } from "./perf.js";
import { batchParts } from "./batch.js";
import { Sfx } from "./audio.js";
import { Hints } from "./hints.js";
import { Props } from "./props.js";
import { Show, playbills } from "./show.js";
import { Talk } from "./talk.js";
import { XRHands, DesktopHands, SimHandMeshes } from "./input.js";
import { ActionDetector, AIPerformer, describe } from "./director.js";
import { MarloMind } from "./mind.js";
import { Emotes } from "./emote.js";
import { Confetti } from "./fx.js";
import { GUESTS, STORY_LINES, PROLOGUE } from "./lines.js";
import { wizardSkin, pirateSkin, trollSkin, clankSkin, princessSkin } from "./cast.js";
import { createTask } from "./tasks.js";
import { StoryBook } from "./storybook.js";
import { Sets, SET_LIGHT } from "./sets.js";
import { StoryMap } from "./storymap.js";
import { Narrator } from "./narrator.js";
import { Recorder, Player, encodePerformance, decodePerformance, library } from "./recorder.js";
import { makeDemo } from "./demo.js";

// ---- optional: Meta's WebXR emulator (IWER) so the XR + hand-tracking path can
// be tried in a desktop browser. Open with ?emulate — an emulated Quest 3 with
// hand tracking; the mouse/keyboard simulator then drives its two tracked hands.
let xrDevice = null;
if (new URLSearchParams(location.search).has("emulate")) {
  try {
    const { XRDevice, metaQuest3 } = await import("https://cdn.jsdelivr.net/npm/iwer@2.7.0/+esm");
    xrDevice = new XRDevice(metaQuest3);
    xrDevice.installRuntime({ forceInstall: true });
    xrDevice.primaryInputMode = "hand";
    // look down at the desk, the way you would with a real headset
    xrDevice.quaternion.set(Math.sin(-0.24), 0, 0, Math.cos(-0.24));
    window.xrDevice = xrDevice;
  } catch (e) {
    console.warn("Couldn't load the IWER emulator", e);
  }
}

// ---- renderer / scene -------------------------------------------------------
const canvas = document.getElementById("view");
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5)); // retina at 2x costs ~80% more pixels for little gain
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 0.85;
renderer.xr.enabled = true;
renderer.xr.setFoveation(1); // Quest: render the edges of each eye at lower resolution

const loadingEl = document.getElementById("loading");
const assets = await loadAssets(renderer, (p) => { if (loadingEl) loadingEl.style.setProperty("--p", p); });
// (the loading screen becomes the "raise the curtain" prompt once the scene exists)

const scene = new THREE.Scene();
const bg = new THREE.Color(0x140d0a);
scene.background = bg;
scene.environment = assets.env;
scene.environmentIntensity = 0.4;
const camera = new THREE.PerspectiveCamera(42, innerWidth / innerHeight, 0.01, 20);
const DESK_TOP = 0.76;
const STAGE_Y = DESK_TOP + STAGE.base;
const desktopCam = { pos: new THREE.Vector3(0, STAGE_Y + 0.5, 1.5), look: new THREE.Vector3(0, STAGE_Y + 0.33, -0.15) };
camera.position.copy(desktopCam.pos);
camera.lookAt(desktopCam.look);

const { room, desk } = buildRoom(assets, DESK_TOP);
scene.add(room);
desk.position.set(0, DESK_TOP, -0.05);

const { root: stageRoot, knobs, shadowCatcher, curtains, cord } = buildStage(assets);
stageRoot.position.set(0, STAGE_Y, 0);
scene.add(stageRoot);
// batch static geometry into one mesh per material (Quest needs few draw calls)
let saved = mergeStatic(stageRoot, [knobs.record, knobs.replay, knobs.talk, knobs.mode, knobs.map, shadowCatcher, curtains.group, cord.group]);
saved += mergeStatic(desk);
saved += mergeStatic(room, [desk]);

// lights: a warm key spot on the stage (the only shadow caster), soft fill
const hemi = new THREE.HemisphereLight(0xffe2c0, 0x2a1810, 0.25);
scene.add(hemi);
const spot = new THREE.SpotLight(0xffe6c4, 5.5, 3.2, 0.5, 0.6, 1.3);
spot.position.set(-0.35, 1.05, 0.85);
spot.target.position.set(0, 0.08, 0);
spot.castShadow = true;
spot.shadow.mapSize.set(2048, 2048);
spot.shadow.bias = -0.0004;
spot.shadow.normalBias = 0.01;
spot.shadow.camera.near = 0.3;
spot.shadow.camera.far = 3;
stageRoot.add(spot, spot.target);
const rim = new THREE.DirectionalLight(0x9fc4ff, 0.35);
rim.position.set(0.6, 1.2, -1.2);
stageRoot.add(rim);

// ---- the cast ------------------------------------------------------------------
const PIP_ROOT = [-0.15, 0, 0.03];
const pip = new Marionette({ root: PIP_ROOT, yaw: 0.35, skin: knightSkin(assets), stringColor: 0x9ff3ff });
// the guest on stage: Marlo to begin with; others join as the story travels
const GUEST_ROOT = [0.17, 0, -0.02];
let marlo = new Marionette({ root: GUEST_ROOT, yaw: -0.45, skin: dragonSkin(assets) });
const guests = { marlo };
let guestId = "marlo";
const GUEST_SKINS = { wizard: wizardSkin, pirate: pirateSkin, troll: trollSkin, clank: clankSkin };
const GUEST_ROOTS = { clank: [0.05, 0, -0.07] }; // Clank guards the middle of the tower
// your recorded "shadow" performs beside Sir Pip (a little upstage), so you can duet with it
const GHOST_OFF = new THREE.Vector3(-0.09, 0, -0.07);
const ghost = new Marionette({ root: [PIP_ROOT[0] + GHOST_OFF.x, 0, PIP_ROOT[2] + GHOST_OFF.z], yaw: 0.35, skin: knightSkin(assets, { ghost: true }), ghost: true, stringColor: 0x7fdcff });
ghost.setVisible(false);
stageRoot.add(pip.group, marlo.group, ghost.group);

const robot = new Robot();
// desktop: a tall robot standing behind the desk (like a puppeteer on a bridge);
// XR: a desk-sized robot standing behind the stage, so it never looms over you
saved += mergeStatic(robot.head, robot.eyes.concat([robot.mouth]));
saved += mergeStatic(robot.neck, [robot.head]);
saved += mergeStatic(robot.group, [robot.neck, ...robot.arms.flatMap((a) => [a.upper, a.elbow, a.lower, a.wrist, a.hand])]);
saved += mergeStatic(robot.arms[0].hand) + mergeStatic(robot.arms[1].hand);
// the robot's moving parts become one skinned mesh per material (its mouth flashes, so it stays apart)
const robotBatch = batchParts(robot.group, [robot.mouth]);
saved += robotBatch?.drawCallsSaved || 0;
saved += (pip.batch?.drawCallsSaved || 0) + (marlo.batch?.drawCallsSaved || 0) + (ghost.batch?.drawCallsSaved || 0);
console.info(`[perf] merged away ${saved} draw calls`);

function layoutRobot(xr) {
  if (xr) { robot.group.position.set(0.17, 0.17, -0.38); robot.group.scale.setScalar(1.0); }
  else { robot.group.position.set(0.17, 0.0, -0.6); robot.group.scale.setScalar(1.6); }
}
layoutRobot(false);
stageRoot.add(robot.group);

// desktop-only bloom so the holographic bars and robot eyes glow (skipped in XR for frame rate)
const QUALITY = [
  { name: "high", pr: 1.5, bloom: true, shadow: 2048 },
  { name: "medium", pr: 1.25, bloom: true, shadow: 1536 },
  { name: "lower", pr: 1.0, bloom: true, shadow: 1024, halfShadows: true },
  { name: "low", pr: 1.0, bloom: false, shadow: 1024, halfShadows: true },
  { name: "lowest", pr: 0.75, bloom: false, shadow: 1024, halfShadows: true },
];
const qParam = new URLSearchParams(location.search).get("quality");
const pinnedQuality = { high: 0, medium: 1, low: 3 }[qParam] ?? null;
// big, sharp screens start one step down; the frame-rate check takes it from there
let qTier = pinnedQuality ?? (innerWidth * innerHeight * Math.min(devicePixelRatio, 1.5) ** 2 > 3.5e6 ? 1 : 0);
const perfWin = { last: performance.now(), sum: 0, n: 0, settle: 0, downs: 0 };
const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
const bloom = new UnrealBloomPass(new THREE.Vector2(innerWidth, innerHeight), 0.4, 0.45, 1.05);
composer.addPass(bloom);
composer.addPass(new OutputPass());

const ai = new AIPerformer(marlo, pip);
const detector = new ActionDetector(pip, marlo);

// ---- UI hooks ------------------------------------------------------------------
const $ = (id) => document.getElementById(id);
const caption = $("caption");
let captionTimer = 0;
const showCaption = (text) => {
  caption.textContent = text;
  caption.classList.add("on");
  captionTimer = 5 + text.length * 0.04;
};
const toast = (text) => {
  const el = $("toast");
  el.textContent = text;
  el.classList.add("on");
  clearTimeout(toast._t);
  toast._t = setTimeout(() => el.classList.remove("on"), 2600);
};
const log = (text) => {
  const li = document.createElement("li");
  li.textContent = text;
  $("log").prepend(li);
  while ($("log").children.length > 6) $("log").lastChild.remove();
};

// ---- voice: spatial audio from the robot's head ----------------------------------
const listener = new THREE.AudioListener();
camera.add(listener);
const voice = new THREE.PositionalAudio(listener);
voice.setRefDistance(0.7);
voice.setRolloffFactor(0.6);
voice.setVolume(1.1);
robot.head.add(voice);
const marloMouth = new THREE.Object3D();
stageRoot.add(marloMouth);
const marloVoice = new THREE.PositionalAudio(listener);
marloVoice.setRefDistance(0.6);
marloVoice.setVolume(1.15);
marloMouth.add(marloVoice);
const clipCache = new Map();
const audioLoader = new THREE.AudioLoader();
const voicePlayer = {
  async play(url, who = "narrator") {
    if (listener.context.state !== "running") await listener.context.resume().catch(() => {});
    if (!clipCache.has(url)) clipCache.set(url, audioLoader.loadAsync(url));
    const buffer = await clipCache.get(url);
    const src = who === "marlo" ? marloVoice : voice;
    if (src.isPlaying) src.stop();
    src.setBuffer(buffer);
    src.play();
    if (who !== "marlo") robot.talk = buffer.duration;
    return buffer.duration;
  },
  stop() { for (const v of [voice, marloVoice]) if (v.isPlaying) v.stop(); },
};
// browsers only allow audio after a gesture
const unlockAudio = () => listener.context.state !== "running" && listener.context.resume().catch(() => {});
addEventListener("pointerdown", unlockAudio);
addEventListener("keydown", unlockAudio);

const narrator = new Narrator({
  onLine: (line) => {
    showCaption(line);
    robot.talk = Math.max(robot.talk, 1.2 + line.length * 0.06);
  },
  onReaction: (r) => ai.react(r),
  player: voicePlayer,
});

// ---- sound, hints, props, the show, talking ----------------------------------------
const sfx = new Sfx(listener);
const music = { play() { sfx.play("music", null, { volume: 0.45, rate: 1 }); } };
// each guest has their own little sound when they react
const GUEST_SFX = {
  marlo: (big) => (big ? ["roar", 0.55, 1] : ["chirp", 0.55, 1]),
  wizard: (big) => ["chime", big ? 0.4 : 0.25, big ? 1.2 : 1.6],
  pirate: (big) => (big ? ["clink", 0.5, 0.8] : ["clink", 0.3, 1.2]),
  troll: (big) => ["roar", big ? 0.6 : 0.35, big ? 0.6 : 0.75],
  clank: (big) => ["clink", big ? 0.5 : 0.3, big ? 0.6 : 0.9],
};
ai.onReact = (name) => {
  const [n, v, r] = GUEST_SFX[guestId](name === "dance" || name === "jump");
  sfx.play(n, marloMouth, { volume: v, rate: r });
};

const GRIP = { main: [0, 0.04, -0.03], hands: [0, 0.008, 0] };
const props = new Props(stageRoot, pip, marlo, { sfx, assets, onEvent: (ev) => detector.emit(ev.type, { prop: ev.prop, from: ev.from, target: ev.target }, ev.type === "use" ? 0 : 0.5) });
const hints = new Hints(stageRoot, (target) => {
  if (target === "mainBar") return pip.main.worldPoint(GRIP.main, new THREE.Vector3());
  if (target === "handsBar") return pip.hands.worldPoint(GRIP.hands, new THREE.Vector3());
  if (target === "marlo") return marlo.get("head").clone().add(new THREE.Vector3(0, 0.03, 0));
  if (target.startsWith("prop:")) return props.position(target.slice(5));
  if (target.startsWith("knob:")) return knobs[target.slice(5)]?.position.clone();
  if (target === "cord") return cord.handle();
  if (target === "task") return currentTask?.target?.() || null;
  if (target === "guest") return marlo.get("head").clone().add(new THREE.Vector3(0, 0.03, 0));
  return null;
});

// stage sets (one per chapter): the set decides the base light; a scene can still ask for full night
const sets = new Sets(stageRoot);
let setLight = SET_LIGHT.courtyard;
let night = 0, nightTarget = 0;
function setNight(on) { nightTarget = on ? 1 : setLight.night; props.setNight(nightTarget > 0.5); }
function applySet(name) {
  setLight = sets.show(name);
  if (mode?.id !== "party") spot.color.set(setLight.spot);
  if (!preshow) setNight(false);
}

const show = new Show({
  narrator, hints, sfx, ai, pip, marlo, props, curtains, setNight, stageRoot,
  onChange: (sh, entry) => {
    updateShowHud();
    if (entry) {
      const prog = storyMap.complete(chapter.id, entry);
      if (prog.finished && chapter.id === "cave") narrator.coach(STORY_LINES.theEnd);
      else if (prog.newChapter) narrator.coach(STORY_LINES.unlocked);
      toast(`New playbill: ${entry.title} ${"★".repeat(entry.stars)}`);
      if (!recorder.recording && !lastPerfLocal) recordHintPending = true;
    }
  },
});
let recordHintPending = false;

// ---- Marlo's mind, his emotes and his own voice --------------------------------------
const emotes = new Emotes(stageRoot);
const confetti = new Confetti(stageRoot);
const marloHead = () => marlo.get("head");
const pipHead = () => pip.get("head");
const marloLines = [];
function marloSay(key, name = null) {
  const text = GUESTS[guestId].says[key] || key;
  if (marloLines.length > 2) marloLines.shift();
  marloLines.push({ text, t: elapsed, name });
}
// Marlo and the narrator take turns, so two voices never talk over each other
function updateMarloVoice() {
  if (!marloLines.length || narrator.speaking || narrator.busy) return;
  const { text, t, name } = marloLines.shift();
  if (elapsed - t > 6) return;
  showCaption(`${name || GUESTS[guestId].name}: “${text}”`);
  narrator.speakingUntil = narrator.t + 0.9 + text.split(/\s+/).length * 0.32;
  const file = narrator.manifest[text];
  if (file && !narrator.muted) {
    voicePlayer.play(`voice/${file}`, "marlo").then((secs) => { if (secs) narrator.speakingUntil = narrator.t + secs + 0.35; }).catch(() => {});
  }
}
const mind = new MarloMind({
  ai, pip, marlo, props,
  rackPos: new THREE.Vector3(0.3, 0, 0.155),
  say: marloSay,
  emote: (sym) => emotes.pop("marlo", sym, marloHead),
  coach: (k) => narrator.coach(k),
});
show.onEnding = (type) => {
  confetti.burst(type);
  emotes.pop("marlo", type === "grace" ? "♥" : type === "slapstick" ? "♪" : "!", marloHead, null, 3);
  sfx.play("applause", null, { volume: 0.5 });
};

// ---- fun modes, unlocked by collecting playbills ----------------------------------------
const MODES = [
  { id: "normal", name: "Classic", line: "modeNormal" },
  { id: "moon", name: "Moon gravity", line: "modeMoon", unlock: 1, unlockLine: "unlockMoon" },
  { id: "fragile", name: "Fragile strings", line: "modeFragile", unlock: 2, unlockLine: "unlockFragile" },
  { id: "party", name: "Party", line: "modeParty", unlock: 3, unlockLine: "unlockParty" },
];
let mode = MODES[0];
const unlockedModes = () => MODES.filter((m) => !m.unlock || playbills.list().length >= m.unlock);
function refreshModeUi() {
  const n = unlockedModes().length;
  knobs.mode.visible = n > 1;
  const b = $("mode");
  if (b) { b.hidden = n < 2; b.textContent = `Mode: ${mode.name}`; }
}
function applyMode(m, announce = true) {
  mode = m;
  for (const p of [pip, marlo, ghost]) p.gravityScale = m.id === "moon" ? 0.35 : 1;
  pip.fragile = m.id === "fragile";
  if (m.id !== "party") spot.color.set(setLight.spot);
  refreshModeUi();
  if (announce) { narrator.coach(m.line); toast(`Mode: ${m.name}`); sfx.play("chime", null, { volume: 0.35, rate: 1.4 }); }
}
function cycleMode() {
  const list = unlockedModes();
  if (list.length < 2) { toast("Finish a show to unlock fun modes"); return; }
  applyMode(list[(list.indexOf(mode) + 1) % list.length]);
}
show.onUnlock = (count) => {
  const m = MODES.find((x) => x.unlock === count);
  refreshModeUi();
  if (m) { narrator.coach(m.unlockLine); setTimeout(() => toast(`Unlocked: ${m.name} mode`), 9000); }
};

// string sounds: a pluck when a string snaps taut, a crack when one breaks
pip.onTwang = (si) => {
  if ((pip._twangT || 0) > elapsed) return;
  pip._twangT = elapsed + 0.18;
  sfx.play("pluck", pip.group, { volume: 0.22, rate: [1, 1.12, 1.26, 0.84, 1.5, 1.68, 0.94, 1.06][si % 8] });
};
pip.onSnap = (name) => {
  sfx.play("snap", pip.group, { volume: 0.7 });
  detector.emit("snap", { string: name }, 1);
  if (!pip._snapTold) { pip._snapTold = true; narrator.coach("snap"); }
};

// ---- duet with your shadow: matching its moves earns "In sync!" -------------------------
const ghostDetector = new ActionDetector(ghost, marlo);
const SYNCABLE = new Set(["bow", "jump", "wave", "turn", "walk"]);
const lastPipMove = {}, lastGhostMove = {};
let syncs = 0;
function checkSync(type, mine, other) {
  if (!player.playing || !SYNCABLE.has(type)) return;
  mine[type] = elapsed;
  if (elapsed - (other[type] ?? -99) < 1.3) {
    other[type] = -99; mine[type] = -99;
    syncs++;
    emotes.pop("pip", "✦", pipHead, "In sync!", 1.6);
    sfx.play("chime", null, { volume: 0.3, rate: 1.3 });
    if (syncs === 1 || syncs % 4 === 0) narrator.coach("synced");
  }
}
ghostDetector.on((ev) => checkSync(ev.type, lastGhostMove, lastPipMove));

const talk = new Talk({
  narrator,
  onHeard: (text) => showCaption(`You: “${text}”`),
  onState: (on) => { $("talk")?.classList.toggle("live", on); knobs.talk.userData.cap.material.emissiveIntensity = on ? 1.2 : 0.35; },
  onReply: async ({ line, reaction, audio }) => {
    const clip = audio || (narrator.manifest[line] ? `voice/${narrator.manifest[line]}` : null);
    setTimeout(() => showCaption(`${GUESTS[guestId].name}: “${line}”`), 200);
    if (reaction) ai.react(reaction);
    if (clip && !narrator.muted) {
      const secs = await voicePlayer.play(clip, "marlo").catch(() => 0);
      narrator.speakingUntil = narrator.t + (secs || 2) + 0.4;
    }
    show.hear({ type: "talk" });
    const r = mind.hear({ type: "talk" }, { t: elapsed });
    if (r && !reaction) ai.react(r);
  },
});
talk.talkLines = () => GUESTS[guestId].talk;
talk.character = () => guestId;
// no speech recognition (e.g. some headset browsers): hide the talk button and knob
if (!talk.supported) { knobs.talk.visible = false; document.getElementById("talk").hidden = true; }
function startTalking() {
  unlockAudio();
  if (!talk.supported) { toast("Voice input isn't available in this browser. Try Chrome on desktop."); return; }
  talk.start();
}

// Before the show: a dark stage and a glowing gold cord. Pulling it down raises
// the curtain, so the very first thing you do teaches you to pinch and pull.
let showStarted = false;
let preshow = false, preshowT = 0;
let cordHand = null, cordStart = 0, cordDrag = null, cordAuto = false;
function startPreshow() {
  if (showStarted || preshow) return;
  preshow = true;
  preshowT = 0;
  nightTarget = 1;
  narrator.coach(xrMode ? "pullCord" : "pullCordDesk");
}
function setCordPull(p) {
  cord.held = true;
  cord.pull = THREE.MathUtils.clamp(p, 0, 0.085);
  curtains.follow(Math.min(0.3, (cord.pull / 0.06) * 0.3));
  if (cord.pull > 0.055) raiseCurtain();
}
function releaseCord() {
  cord.held = false;
  cordHand = null;
  if (!showStarted) curtains.follow(0);
}

// the curtain rises: music, swish, then the show begins
function raiseCurtain() {
  if (showStarted) return;
  showStarted = true;
  preshow = false;
  cordDrag = null;
  cordAuto = false;
  releaseCord();
  if (hints.current === "cord") hints.hide();
  nightTarget = 0;
  unlockAudio();
  curtains.open();
  setTimeout(() => { sfx.play("swish", null, { volume: 0.6 }); music.play(); }, 150);
  setTimeout(() => startChapterShow(), 2600);
}

// footsteps and armour clinks, played where the foot lands
const feet = [[pip, "lF"], [pip, "rF"], [marlo, "lF"], [marlo, "rF"]].map(([pup, n]) => {
  const o = new THREE.Object3D();
  stageRoot.add(o);
  return { pup, n, o, up: false, guest: pup !== pip };
});
function footsteps() {
  for (const f of feet) {
    const p = f.pup.get(f.n);
    f.o.position.copy(p);
    if (!f.up && p.y > 0.014) f.up = true;
    else if (f.up && p.y < 0.008) {
      f.up = false;
      const isPip = f.pup === pip;
      sfx.play("step", f.o, { volume: isPip ? 0.5 : 0.6, rate: isPip ? 1.15 : guestId === "troll" ? 0.6 : 0.8 });
      if (isPip && Math.random() < 0.5) sfx.play("clink", f.o, { volume: 0.18 });
    }
  }
}

function updateShowHud() {
  const el = $("show");
  if (!el) return;
  if (!show.scene) { el.classList.remove("on"); return; }
  el.classList.add("on");
  const act = show.state === "act" ? show.scene.acts[show.act] : null;
  el.innerHTML = `<div class="title">Tonight: ${show.scene.title}</div><div class="stars">${"★".repeat(show.stars)}${"☆".repeat(3 - show.stars)}</div>` +
    (act ? `<div class="goal">${act.goal.replace(/^Act \w+\.\s*/, "")}</div>` : show.state === "done" || show.state === "finale" ? `<div class="goal">Curtain call!</div>` : "");
  $("bills").textContent = `Playbills (${playbills.list().length})`;
}

detector.on((ev) => {
  show.hear(ev);
  if (ev.type === "jump") sfx.play("clink", pip.group, { volume: 0.35 });
  if (["jump", "approach", "fall", "give", "wave"].includes(ev.type)) mind.wakeIfNapping();
  const r = mind.hear(ev, { t: elapsed });
  if (r) ai.react(r);
  narrator.hear(ev);
  checkSync(ev.type, lastPipMove, lastGhostMove);
  log(`${describe(ev)} → ${GUESTS[guestId].name} ${r ? r : "watches"} (${mind.moodName})`);
});

// ---- input -------------------------------------------------------------------
const xrHands = new XRHands(renderer, scene);
const sim = new DesktopHands(canvas, camera);
const simMeshes = new SimHandMeshes(stageRoot);
const handFactory = new XRHandModelFactory();
for (const i of [0, 1]) {
  const hand = renderer.xr.getHand(i);
  const model = handFactory.createHandModel(hand, "mesh");
  model.name = "handModel";
  hand.add(model);
}

const grabs = new Map(); // HandState.id -> { bar, barPos, anchor, qOff }
const wasPinching = new Map();
const taken = (b) => [...grabs.values()].some((x) => x.bar === b);
// Headset: hand motion is amplified a little (big stage moves from small, seated
// hand moves), and a bar can be pinched from below, so you never have to hold
// your arm up at eye level.
const GAIN_XR = new THREE.Vector3(1.3, 1.6, 1.3);
const GAIN_DESK = new THREE.Vector3(1, 1, 1);
const _gv = new THREE.Vector3(), _gw = new THREE.Vector3(), _gd = new THREE.Vector3();
function grabScore(bar, h) {
  const gp = bar.worldPoint(GRIP[bar.kind], _gv);
  const horiz = Math.hypot(gp.x - h.position.x, gp.z - h.position.z);
  const dy = gp.y - h.position.y;
  if (horiz > 0.13 || dy < -0.08 || dy > 0.32) return Infinity;
  return horiz + Math.abs(dy) * 0.35;
}

// glowing tethers from your hand to the bar it holds (or could grab)
const TETHER_MAX = 4;
const tetherGeo = new THREE.BufferGeometry();
tetherGeo.setAttribute("position", new THREE.BufferAttribute(new Float32Array(TETHER_MAX * 6), 3));
tetherGeo.setAttribute("color", new THREE.BufferAttribute(new Float32Array(TETHER_MAX * 6), 3));
const tethers = new THREE.LineSegments(tetherGeo, new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.75, toneMapped: false, depthWrite: false }));
tethers.frustumCulled = false;
stageRoot.add(tethers);
let tetherN = 0;
function addTether(a, b, strength) {
  if (tetherN >= TETHER_MAX || a.distanceTo(b) < 0.05) return;
  const P = tetherGeo.attributes.position.array, C = tetherGeo.attributes.color.array, k = tetherN * 6;
  P[k] = a.x; P[k + 1] = a.y; P[k + 2] = a.z; P[k + 3] = b.x; P[k + 4] = b.y; P[k + 5] = b.z;
  const c = [0.5 * strength, 0.95 * strength * 1.2, 1.0 * strength * 1.2];
  C.set(c, k); C.set(c, k + 3);
  tetherN++;
}

function handleHands(hands, desktop) {
  const bars = [pip.main, pip.hands];
  const near = new Map(bars.map((b) => [b, 0]));
  tetherN = 0;
  for (const h of hands) {
    let g = grabs.get(h.id);
    if (!h.present) {
      if (g) { g.bar.held = false; grabs.delete(h.id); }
      if (cordHand === h.id) releaseCord();
      continue;
    }
    const fresh = h.pinch && !wasPinching.get(h.id);
    wasPinching.set(h.id, h.pinch);
    if (!desktop) {
      // the curtain cord (before the show)
      if (cordHand === h.id) {
        if (h.pinch) setCordPull(cordStart - h.anchor.y);
        else releaseCord();
        continue;
      }
      if (preshow && fresh && !g && h.position.distanceTo(cord.handle(_gw)) < 0.075) {
        cordHand = h.id;
        cordStart = h.anchor.y;
        sfx.play("clack", cord.tassel, { volume: 0.4, rate: 1.3 });
        continue;
      }
      // props: a fresh pinch near a prop picks it up instead of a bar
      if (props.holding(h.id)) {
        if (h.pinch) { props.follow(h); continue; }
        props.release(h.id);
        continue;
      }
      if (fresh && !g && props.tryGrab(h)) continue;
    }
    if (h.pinch && !g) {
      let bar = null;
      if (desktop) bar = h === sim.main ? pip.main : pip.hands;
      else if (fresh) {
        let best = Infinity;
        for (const b of bars) {
          if (taken(b)) continue;
          let sc = grabScore(b, h);
          if (b === pip.main) sc -= 0.03; // the first grab takes the main bar
          if (sc < best) { best = sc; bar = b; }
        }
      }
      if (bar && !taken(bar)) {
        g = { bar, barPos: bar.position.clone(), anchor: h.anchor.clone(), qOff: h.quaternion.clone().invert().multiply(bar.quaternion) };
        grabs.set(h.id, g);
        bar.held = true;
        sfx.play("clack", pip.group, { volume: 0.35, rate: bar === pip.main ? 1 : 1.25 });
        if (preshow) raiseCurtain(); // keen player grabbed the knight first: curtain up!
      }
    } else if (!h.pinch && g) {
      g.bar.held = false;
      grabs.delete(h.id);
      g = null;
    }
    if (g) {
      // position follows the (filtered) knuckle, amplified; rotation turns the
      // bar about itself — so closing your fingers never jerks the puppet
      _gd.subVectors(h.anchor, g.anchor).multiply(desktop ? GAIN_DESK : GAIN_XR);
      g.bar.position.copy(g.barPos).add(_gd);
      const cy = THREE.MathUtils.clamp(g.bar.position.y, 0.22, 0.95);
      if (cy !== g.bar.position.y) { g.barPos.y += cy - g.bar.position.y; g.bar.position.y = cy; }
      g.bar.quaternion.copy(h.quaternion).multiply(g.qOff);
      near.set(g.bar, 0.9);
      if (!desktop) addTether(h.position, g.bar.worldPoint(GRIP[g.bar.kind], _gw), 1);
    } else if (!desktop) {
      for (const b of bars) {
        if (taken(b) || grabScore(b, h) === Infinity) continue;
        near.set(b, Math.max(near.get(b), 0.45));
        addTether(h.position, b.worldPoint(GRIP[b.kind], _gw), 0.35);
      }
    }
  }
  tetherGeo.setDrawRange(0, tetherN * 2);
  tetherGeo.attributes.position.needsUpdate = true;
  tetherGeo.attributes.color.needsUpdate = true;
  if (desktop && !pip.main.held) near.set(pip.main, 0.25 + 0.2 * Math.sin(performance.now() / 300));
  for (const [b, a] of near) pip.setHighlight(b, a);
}

// ---- record / replay / share ----------------------------------------------------
const recorder = new Recorder();
const player = new Player();
let lastPerf = null;
let lastPerfLocal = null; // the take recorded in this session (vs. one from a link)

function toggleRecord() {
  if (recorder.recording) {
    const perf = recorder.stop();
    $("rec").classList.remove("live");
    if (perf) {
      lastPerf = perf;
      lastPerfLocal = perf;
      library.save({ at: Date.now(), seconds: Math.round(perf.frames.length / perf.rate) });
      toast(`Saved a ${(perf.frames.length / perf.rate).toFixed(1)}s performance — press P to watch your shadow`);
      narrator.coach("recordEnd");
    }
  } else {
    if (player.playing) stopReplay();
    recorder.start();
    recordHintPending = false;
    if (hints.current === "record") hints.hide();
    narrator.coach("recordStart");
    $("rec").classList.add("live");
    toast("Recording — perform! Press R again to stop.");
  }
}
function startReplay(perf = lastPerf) {
  if (!perf) { toast("Record something first (R)"); return; }
  ghost.reset();
  player.play(perf);
  ghost.setVisible(true);
  $("play").classList.add("live");
  toast("Your shadow is performing. Join in!");
  narrator.coach(location.hash.startsWith("#perf=") && perf !== lastPerfLocal ? "shared" : "replay");
}
function stopReplay() {
  player.stop();
  ghost.setVisible(false);
  $("play").classList.remove("live");
}
async function share() {
  if (!lastPerf) { toast("Record something first (R)"); return; }
  const code = await encodePerformance(lastPerf);
  const url = `${location.origin}${location.pathname}#perf=${code}`;
  try {
    await navigator.clipboard.writeText(url);
    toast(`Link copied (${Math.round(url.length / 1024)} KB) — anyone who opens it sees your shadow`);
  } catch {
    prompt("Copy this link:", url);
  }
}
function resetAll(quiet = false) {
  for (const [, g] of grabs) g.bar.held = false;
  grabs.clear();
  pip.reset();
  marlo.reset();
  props.reset();
  ai.base.copy(ai.home);
  ai.yaw = marlo.yaw;
  if (!quiet) toast("Puppets reset");
}

// ---- the story: chapters, guests and the storybook map --------------------------------
function guestPuppet(id) {
  if (!guests[id]) {
    const g = new Marionette({ root: GUEST_ROOTS[id] || GUEST_ROOT, yaw: id === "clank" ? 0 : -0.45, skin: GUEST_SKINS[id](assets) });
    g.setVisible(false);
    stageRoot.add(g.group);
    guests[id] = g;
  }
  return guests[id];
}
function setGuest(id) {
  const next = guestPuppet(id);
  if (props.heldBy("marlo")) props.moveTo(props.heldBy("marlo"), "rack", { silent: true });
  if (next !== marlo) marlo.setVisible(false);
  marlo = next;
  guestId = id;
  marlo.reset();
  marlo.setVisible(true);
  const g = GUESTS[id];
  ai.setPuppet(marlo);
  for (const d of [detector, ghostDetector]) { d.other = marlo; d.otherName = g.name; }
  props.marlo = marlo;
  mind.setGuest(marlo, g.personality);
  show.marlo = marlo;
  show.guestName = g.name;
  $("talk").textContent = `🎙 Talk to ${g.name.replace("Captain ", "")}`;
  for (const f of feet) if (f.guest) f.pup = marlo;
}
// put a chapter's set and guest on stage (no curtain business)
function stagePlace(place) {
  applySet(place.set);
  setGuest(place.guest);
  // the Clockwork Tower: a princess in a cage, and a key on Clank's pedestal
  const T = place.princess ? sets.refs("tower") : null;
  princessOn(!!T);
  if (T) {
    T.closeCage();
    props.setAvailable("key", true, T.pedestal.clone().add(new THREE.Vector3(0, 0.036, 0)));
    props.targets = [{ name: "cage", pos: T.cage.clone().add(new THREE.Vector3(0, 0.09, 0)), r: 0.09, consume: true }];
  } else {
    props.setAvailable("key", false);
    props.targets = [];
  }
}

// ---- Princess Juniper: waits in her cage, walks out when freed, cheers --------------------
let princess = null;
const princessDrv = { state: "off", t: 0, pos: new THREE.Vector3() };
function princessOn(on) {
  if (on && !princess) {
    princess = new Marionette({ root: [0.3, 0, -0.12], yaw: 0.25, skin: princessSkin(assets) });
    stageRoot.add(princess.group);
  }
  if (!princess) return;
  princess.setVisible(on);
  if (on) { princess.reset(); princess.main.held = true; princessDrv.state = "caged"; princessDrv.t = 0; princessDrv.pos.copy(princess.main.position); }
  else princessDrv.state = "off";
}
const _pq = new THREE.Quaternion(), _pe = new THREE.Euler();
function updatePrincess(dt) {
  if (!princess || princessDrv.state === "off") return;
  const d = princessDrv;
  d.t += dt;
  const m = princess.main;
  m.held = true;
  let yaw = 0.25, roll = Math.sin(d.t * 1.4) * 0.05, bob = Math.sin(d.t * 2) * 0.003;
  if (d.state === "caged") {
    // anxious little hops while Sir Pip is near
    if (pip.center().distanceTo(princess.center()) < 0.25) bob += Math.abs(Math.sin(d.t * 6)) * 0.008;
  } else if (d.state === "free") {
    const goal = new THREE.Vector3(0.2, d.pos.y, 0.06);
    const to = goal.clone().sub(d.pos).setY(0);
    if (to.length() > 0.01) { d.pos.addScaledVector(to.normalize(), Math.min(to.length(), dt * 0.08)); yaw = Math.atan2(to.x, to.z); }
    else d.state = "happy";
  } else if (d.state === "happy") {
    const toPip = pip.center().sub(princess.center());
    yaw = Math.atan2(toPip.x, toPip.z);
    bob += Math.abs(Math.sin(d.t * 5)) * 0.012;
    roll = Math.sin(d.t * 5) * 0.25;
  }
  m.position.lerp(new THREE.Vector3(d.pos.x, d.pos.y + bob, d.pos.z), Math.min(1, dt * 8));
  m.quaternion.slerp(_pq.setFromEuler(_pe.set(0, yaw, -roll, "YXZ")), Math.min(1, dt * 6));
  princess.update(dt);
}
function towerRefs() {
  const T = sets.refs("tower");
  return { cage: T.cage, pedestal: T.pedestal, openCage: () => { T.openCage(); setTimeout(() => { princessDrv.state = "free"; }, 700); } };
}

// ---- tasks: duels, riddles, sneaking... (see tasks.js) -----------------------------------
let currentTask = null;
// teleport Sir Pip (and the bars your hand holds) so his pelvis lands at x, z
function movePipTo(x, z) {
  const p = pip.get("pelvis"), d = new THREE.Vector3(x - p.x, 0, z - p.z);
  for (let i = 0; i < pip.pos.length; i++) { pip.pos[i].add(d); pip.prev[i].add(d); }
  for (const b of [pip.main, pip.hands]) { b.position.add(d); b._lastPos?.add(d); }
  for (const g of grabs.values()) g.barPos.add(d);
}
// a shove (a sword hit, a zap): gives the particles a little velocity
function knockPip(dir, amount) {
  const d = dir.clone().setY(0).normalize();
  for (let i = 0; i < pip.pos.length; i++) { pip.pos[i].addScaledVector(d, amount * 0.5); pip.pos[i].y += amount * 0.25; }
}
const taskCtx = {
  root: stageRoot, pip, props,
  get ai() { return ai; },
  guest: () => marlo,
  coach: (t) => narrator.coach(t),
  guestSay: (k) => { const l = GUESTS[guestId].task?.[k]; if (l) marloSay(l); },
  guestLine: (text) => marloSay(text),
  princessSay: (k) => { const l = GUESTS.princess.task[k]; if (l) marloSay(l, GUESTS.princess.name); },
  emote: (id, sym, at, text, life, yOff) => emotes.pop(id, sym, at, text, life, yOff),
  clearEmote: (id) => emotes.clear(id),
  sfx: (n, at, o) => sfx.play(n, at, o),
  showHint: (name) => hints.show(name, !!xrMode),
  hideHint: () => hints.hide(),
  knockPip, movePipTo,
  confetti: (k) => confetti.burst(k),
  tower: () => towerRefs(),
};
show.makeTask = (spec, done) => {
  mind.taskBusy = true;
  const t = createTask(spec, taskCtx, done);
  const end = t.end;
  t.end = () => { end?.call(t); mind.taskBusy = false; if (currentTask === t) currentTask = null; };
  currentTask = t;
  return t;
};

// ---- the storybook: three illustrated, narrated pages before each chapter -------------------
const book = new StoryBook({ narrator });
book.mesh.position.set(0, 0.42, 0.14);
book.mesh.scale.setScalar(1.25);
stageRoot.add(book.mesh);
function faceViewer(mesh) {
  const head = stageRoot.worldToLocal(camera.getWorldPosition(new THREE.Vector3()));
  const d = head.sub(mesh.position);
  mesh.rotation.set(-Math.atan2(d.y, Math.hypot(d.x, d.z)), Math.atan2(d.x, d.z), 0, "YXZ");
}
// the opening: the prologue the very first time, then the chapter's own pages
function openingBook(then) {
  const first = chapter.id === "courtyard" && !storyMap.state.done.courtyard;
  if (first) playBook(PROLOGUE, () => playBook(chapter, then));
  else playBook(chapter, then);
}
function playBook(place, then) {
  if (!place.pages?.length) { then(); return; }
  if (xrMode) faceViewer(book.mesh);
  hints.hide();
  book.play(place, !!xrMode, then);
}
const sceneFor = (place) => (place.acts ? { id: place.id, title: place.title, intro: place.intro, acts: place.acts } : null);
function startChapterShow() {
  if (chapter.id === "theatre") narrator.coach(STORY_LINES.theatre);
  show.start(sceneFor(chapter)); // the Grand Theatre (no acts) picks tonight's daily show
}

const storyMap = new StoryMap({ onChoose: (place) => changeScene(place) });
storyMap.mesh.position.set(-0.56, 0.4, 0.1);
storyMap.mesh.scale.setScalar(1.3);
stageRoot.add(storyMap.mesh);
storyMap.onDepart = () => { narrator.coach(STORY_LINES.travel); sfx.play("step", null, { volume: 0.3, rate: 0.9 }); };
let chapter = storyMap.current();
stagePlace(chapter);

function openMap() {
  if (storyMap.travel) return;
  $("tip")?.classList.remove("on");
  props.setHover(null);
  storyMap.show(!!xrMode);
  // headset: the parchment floats beside the stage, turned to face you
  if (xrMode) faceViewer(storyMap.mesh); // turned square to your eyes, never rolled
  narrator.coach(STORY_LINES.mapOpen);
  if (hints.current) hints.hide();
}
function toggleMap() { storyMap.open ? storyMap.hide() : openMap(); }

// the scene change: curtain down, new set and guest, curtain up, the chapter begins
let changing = false;
function changeScene(place) {
  if (changing) return;
  changing = true;
  chapter = place;
  hints.hide();
  narrator.queue.length = 0; // lines from the last chapter no longer apply
  narrator.pending.length = 0;
  marloLines.length = 0;
  show.state = "idle";
  show.starGroup.visible = false;
  show.bill.visible = false;
  curtains.close();
  sfx.play("swish", null, { volume: 0.5 });
  setTimeout(() => {
    resetAll(true);
    stagePlace(place);
    playBook(place, () => {
      curtains.open();
      sfx.play("swish", null, { volume: 0.6 });
      music.play();
      setTimeout(() => { changing = false; startChapterShow(); }, 2400);
    });
  }, 1700);
}
show.onDone = () => setTimeout(() => { if (show.state === "done" && !changing) openMap(); }, 2500);

const demo = makeDemo(sim);
function runDemo() {
  if (sim.autopilot) { sim.autopilot = null; toast("Demo stopped"); return; }
  resetAll();
  raiseCurtain();
  sim.autopilot = demo();
  toast("Demo: the autopilot is driving the simulated hands");
}

$("rec").onclick = toggleRecord;
$("play").onclick = () => (player.playing ? stopReplay() : startReplay());
$("share").onclick = share;
$("demo").onclick = runDemo;
$("reset").onclick = resetAll;
$("mute").onclick = () => {
  narrator.setMuted(!narrator.muted);
  $("mute").textContent = narrator.muted ? "Voice: off" : "Voice: on";
};
$("help-toggle").onclick = () => { const c = $("help").classList.toggle("collapsed"); $("help-toggle").textContent = c ? "show" : "hide"; };
$("talk").onclick = startTalking;
$("mode").onclick = cycleMode;
$("storybtn").onclick = () => { unlockAudio(); toggleMap(); };
refreshModeUi();
$("bills").onclick = () => {
  const panel = $("billpanel");
  const list = playbills.list();
  panel.innerHTML = `<h2>Your playbills</h2><p class="streak">${playbills.streak() > 1 ? `${playbills.streak()}-night streak` : "Come back tomorrow for a new show"}</p>` +
    (list.length ? list.map((b) => `<div class="bill"><b>${b.title}</b><span>${"★".repeat(b.stars)}${"☆".repeat(3 - b.stars)}</span><i>${b.date}${b.guest ? ` · with ${b.guest}` : ""}${b.ending ? ` · ${b.ending}` : ""}</i></div>`).join("") : "<p>Finish tonight's show to earn your first playbill.</p>") +
    `<button id="billclose">Close</button>`;
  panel.classList.add("on");
  $("billclose").onclick = () => panel.classList.remove("on");
};

// desktop: clicking a prop (or Marlo) hands things over instead of grabbing the bar
const clickRay = new THREE.Raycaster();
const cordPlane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
function stageRay(e) {
  const r = canvas.getBoundingClientRect();
  clickRay.setFromCamera(new THREE.Vector2(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1), camera);
  return clickRay.ray.clone().applyMatrix4(new THREE.Matrix4().copy(stageRoot.matrixWorld).invert());
}
function cordY(e) {
  cordPlane.constant = -cord.handle(_gw).z;
  const hit = stageRay(e).intersectPlane(cordPlane, new THREE.Vector3());
  return hit ? hit.y : null;
}
addEventListener("pointerdown", (e) => {
  if (e.target !== canvas || e.button !== 0 || xrMode) return;
  if (preshow) {
    const ray = stageRay(e);
    if (ray.distanceToPoint(cord.handle(_gw)) < 0.035) {
      cordDrag = { y0: cordY(e) ?? cord.rest, moved: 0 };
      sim.lmbBlocked = true;
      sfx.play("clack", cord.tassel, { volume: 0.4, rate: 1.3 });
      return;
    }
  }
  const r = canvas.getBoundingClientRect();
  clickRay.setFromCamera(new THREE.Vector2(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1), camera);
  if (props.click(clickRay)) sim.lmbBlocked = true;
}, true);
// hovering a prop (or the guest, when Sir Pip holds something) shows what a click will do
const tipEl = $("tip");
canvas.addEventListener("pointerleave", () => { tipEl?.classList.remove("on"); props.setHover(null); });
canvas.addEventListener("pointerdown", () => tipEl?.classList.remove("on"));
canvas.addEventListener("pointermove", (e) => {
  if (xrMode || cordDrag || (e.buttons & 1)) { props.setHover(null); tipEl?.classList.remove("on"); return; }
  const r = canvas.getBoundingClientRect();
  clickRay.setFromCamera(new THREE.Vector2(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1), camera);
  const t = props.pickAt(clickRay);
  const held = props.heldBy("pip");
  let text = null;
  if (t?.prop) text = t.prop.state === "pip" ? `Click: give the ${t.prop.name} to ${GUESTS[guestId].name}` : `Click: hand the ${t.prop.name} to Sir Pip`;
  else if (t?.target && held) text = `Click: use the ${held} on the ${t.target.name}`;
  else if (t?.guest && held) text = `Click: give the ${held} to ${GUESTS[guestId].name}`;
  props.setHover(t?.prop?.name || null);
  canvas.style.cursor = text ? "pointer" : "";
  if (tipEl) {
    tipEl.classList.toggle("on", !!text);
    if (text) { tipEl.textContent = text; tipEl.style.left = `${e.clientX + 16}px`; tipEl.style.top = `${e.clientY + 14}px`; }
  }
});
addEventListener("pointermove", (e) => {
  if (!cordDrag) return;
  const y = cordY(e);
  if (y == null) return;
  cordDrag.moved = Math.max(cordDrag.moved, Math.abs(cordDrag.y0 - y));
  setCordPull(cordDrag.y0 - y);
});
addEventListener("pointerup", () => {
  sim.lmbBlocked = false;
  if (cordDrag) {
    // a simple click on the cord pulls it for you
    if (cordDrag.moved < 0.01 && !showStarted) cordAuto = true;
    else releaseCord();
    cordDrag = null;
  }
});
// hold V to talk to Marlo
addEventListener("keydown", (e) => { if (e.key.toLowerCase() === "v" && !e.repeat) startTalking(); });
addEventListener("keyup", (e) => { if (e.key.toLowerCase() === "v") talk.stop(); });

// compile every shader now, behind the loading screen, so nothing stutters the
// first time the curtain opens, the ghost appears or the confetti flies
try {
  ghost.setVisible(true); confetti.points.visible = true;
  await Promise.race([renderer.compileAsync(scene, camera), new Promise((r) => setTimeout(r, 5000))]);
} catch { /* compile on demand instead */ }
ghost.setVisible(false); confetti.points.visible = false;

// the loading screen turns into the opening: one click raises the curtain
// (and lets the browser play sound)
if (loadingEl) {
  loadingEl.innerHTML = `<div class="open"><h1>Strings</h1><p>a marionette theatre with an AI co-performer</p><button id="begin">Enter the theatre</button><small>Best with sound on · works with Quest hand tracking</small></div>`;
  loadingEl.classList.add("ready");
  const begin = () => { loadingEl.classList.add("done"); unlockAudio(); openingBook(startPreshow); };
  $("begin").onclick = begin;
  if (new URLSearchParams(location.search).has("autostart")) { loadingEl.classList.add("done"); raiseCurtain(); }
}
$("enter-vr").addEventListener("click", () => loadingEl?.classList.add("done"));
$("enter-ar").addEventListener("click", () => loadingEl?.classList.add("done"));
window.addEventListener("keydown", (e) => {
  if (e.repeat) return;
  const k = e.key.toLowerCase();
  if (k === "r") toggleRecord();
  else if (k === "p") player.playing ? stopReplay() : startReplay();
  else if (k === "l") share();
  else if (k === "m") $("mute").click();
  else if (k === "c") caption.classList.toggle("hidden");
  else if (k === "backspace") resetAll();
  else if (k === "t") runDemo();
  else if (k === "n") cycleMode();
  else if (k === "j") toggleMap();
  else if (k === "escape" && book.open) book.skipAll();
});

// shared performance in the URL?
if (location.hash.startsWith("#perf=")) {
  decodePerformance(location.hash.slice(6))
    .then((perf) => {
      lastPerf = perf;
      startReplay(perf);
      toast("Replaying a shared performance — perform alongside it");
    })
    .catch((e) => toast(`Couldn't read that link: ${e.message}`));
}

// Quest: a smaller shadow map, only the marionettes and props cast shadows, and
// the expensive physical materials (velvet sheen, clearcoat) become standard ones
// (re-scanned on each entry: guests and sets are built as the story goes)
let casters = [];
function scanCasters() {
  const keep = new Set();
  for (const g of [pip.group, ...Object.values(guests).map((x) => x.group), ghost.group, ...props.meshes()]) g.traverse((o) => keep.add(o));
  casters = [];
  stageRoot.traverse((o) => { if (o.isMesh && o.castShadow && !keep.has(o)) casters.push(o); });
}
const cheapMats = new Map();
function cheapVersion(m) {
  if (!cheapMats.has(m)) {
    const s = new THREE.MeshStandardMaterial();
    THREE.MeshStandardMaterial.prototype.copy.call(s, m);
    s.defines = { STANDARD: "" };
    if (m.sheen) s.color.copy(m.color).lerp(m.sheenColor, 0.12); // a hint of the velvet's sheen
    cheapMats.set(m, s);
  }
  return cheapMats.get(m);
}
const swapped = [];
let frameNo = 0;
function setXRQuality(xr) {
  spot.shadow.autoUpdate = !xr;
  spot.shadow.needsUpdate = true;
  spot.shadow.mapSize.set(xr ? 1024 : 2048, xr ? 1024 : 2048);
  spot.shadow.map?.dispose();
  spot.shadow.map = null;
  if (xr) scanCasters();
  for (const o of casters) o.castShadow = !xr;
  if (xr) {
    scene.traverse((o) => { if (o.isMesh && o.material?.isMeshPhysicalMaterial) { swapped.push([o, o.material]); o.material = cheapVersion(o.material); } });
  } else {
    for (const [o, m] of swapped) o.material = m;
    swapped.length = 0;
  }
}

// ---- XR session ------------------------------------------------------------------
// AR (passthrough): the stage is set down on YOUR real desk — a hit-test reticle
// follows your gaze over real surfaces, and a pinch places it. VR: it appears in
// front of you on the virtual desk.
let xrMode = null;
let placeStage = false;
let placing = false;
let hitSource = null;
let placeTimer = 0;
const reticle = new THREE.Mesh(
  new THREE.RingGeometry(0.05, 0.065, 40).rotateX(-Math.PI / 2),
  new THREE.MeshBasicMaterial({ color: 0x7ff3ff, transparent: true, opacity: 0.85, toneMapped: false })
);
reticle.visible = false;
scene.add(reticle);

async function enterXR(mode) {
  const session = await navigator.xr.requestSession(mode, {
    optionalFeatures: ["local-floor", "hand-tracking", "hit-test", "plane-detection", "anchors"],
  });
  renderer.xr.setReferenceSpaceType("local-floor");
  await renderer.xr.setSession(session);
  xrMode = mode;
  document.body.classList.add("in-xr");
  layoutRobot(true);
  setXRQuality(true);
  if (mode === "immersive-ar") {
    scene.background = null;
    room.visible = false;
    shadowCatcher.visible = true;
    try {
      const viewer = await session.requestReferenceSpace("viewer");
      hitSource = await session.requestHitTestSource({ space: viewer });
    } catch { hitSource = null; }
    placing = true;
    placeTimer = 0;
    placeStageInFront(); // a sensible spot until a real surface is found
    unlockAudio();
    narrator.coach("placeAR");
  } else {
    placeStage = true;
    unlockAudio();
    // (the stage is placed on the first XR frame; open the book just after)
    setTimeout(() => { if (!showStarted && !book.open) openingBook(startPreshow); }, 300);
  }
  session.addEventListener("end", () => {
    xrMode = null;
    hitSource?.cancel?.();
    hitSource = null;
    placing = false;
    reticle.visible = false;
    scene.background = bg;
    room.visible = true;
    shadowCatcher.visible = false;
    stageRoot.position.set(0, STAGE_Y, 0);
    stageRoot.rotation.set(0, 0, 0);
    desk.position.set(0, DESK_TOP, -0.05);
    desk.rotation.set(0, 0, 0);
    camera.position.copy(desktopCam.pos);
    camera.lookAt(desktopCam.look);
    document.body.classList.remove("in-xr");
    layoutRobot(false);
    setXRQuality(false);
  });
}
if (navigator.xr) {
  navigator.xr.isSessionSupported("immersive-ar").then((ok) => {
    if (ok) { $("enter-ar").hidden = false; $("enter-ar").onclick = () => enterXR("immersive-ar").catch((e) => toast(e.message)); }
  });
  navigator.xr.isSessionSupported("immersive-vr").then((ok) => {
    if (ok) { $("enter-vr").hidden = false; $("enter-vr").onclick = () => enterXR("immersive-vr").catch((e) => toast(e.message)); }
    else $("xr-note").hidden = false;
  });
} else $("xr-note").hidden = false;

function viewerFlatForward() {
  const xrCam = renderer.xr.getCamera();
  const head = new THREE.Vector3().setFromMatrixPosition(xrCam.matrixWorld);
  const fwd = new THREE.Vector3(0, 0, -1).applyQuaternion(new THREE.Quaternion().setFromRotationMatrix(xrCam.matrixWorld));
  fwd.y = 0;
  if (fwd.lengthSq() < 1e-4) fwd.set(0, 0, -1);
  return { head, fwd: fwd.normalize() };
}

function placeStageInFront() {
  const { head, fwd } = viewerFlatForward();
  // seated-friendly: close, and low enough that the bars sit near chest height
  const p = head.clone().addScaledVector(fwd, 0.45);
  p.y = Math.max(0.4, head.y - 0.58);
  setStagePose(p, fwd);
}

// p = where the stage's floorboards sit, facing the viewer
function setStagePose(p, fwd) {
  stageRoot.position.copy(p);
  stageRoot.rotation.set(0, Math.atan2(-fwd.x, -fwd.z), 0);
  desk.position.copy(p).add(new THREE.Vector3(0, -STAGE.base, 0));
  desk.rotation.copy(stageRoot.rotation);
  stageRoot.updateMatrixWorld(true);
}

const prevPinch = new Map();
function updatePlacement(dt, frame, hands) {
  placeTimer += dt;
  let found = false;
  if (frame && hitSource) {
    const results = frame.getHitTestResults(hitSource);
    for (const r of results) {
      const pose = r.getPose(renderer.xr.getReferenceSpace());
      if (!pose) continue;
      const m = new THREE.Matrix4().fromArray(pose.transform.matrix);
      const up = new THREE.Vector3(0, 1, 0).applyMatrix4(new THREE.Matrix4().extractRotation(m));
      if (up.y < 0.85) continue; // tables and desks only, not walls
      const pos = new THREE.Vector3().setFromMatrixPosition(m);
      reticle.position.copy(pos);
      reticle.visible = true;
      const { fwd } = viewerFlatForward();
      // the stage's base rests on the surface
      setStagePose(pos.clone().add(new THREE.Vector3(0, STAGE.base, 0)), fwd);
      found = true;
      break;
    }
  }
  if (!found) reticle.visible = false;
  // a fresh pinch from either hand sets the stage down
  let pinched = false;
  for (const h of hands) {
    const was = prevPinch.get(h.id) || false;
    if (h.present && h.pinch && !was) pinched = true;
    prevPinch.set(h.id, h.present && h.pinch);
  }
  if ((pinched && (found || placeTimer > 1.5)) || (!hitSource && placeTimer > 2) || placeTimer > 25) {
    placing = false;
    reticle.visible = false;
    if (!showStarted && !book.open) openingBook(startPreshow);
  }
}

// poke the apron knobs with a fingertip (XR), and hold two empty pinches to re-place the stage
const knobCool = { record: 0, replay: 0, talk: 0, mode: 0, map: 0 };
let recenterHold = 0;
function xrGestures(dt, hands, t) {
  // poke the floating storybook map
  if (storyMap.mesh.visible) for (const h of hands) if (h.present && storyMap.poke(stageRoot.localToWorld(h.tip.clone()))) break;
  if (book.mesh.visible) for (const h of hands) if (h.present && book.poke(stageRoot.localToWorld(h.tip.clone()))) break;
  for (const [name, knob] of Object.entries(knobs)) {
    const kp = knob.position.clone().add(new THREE.Vector3(0, 0.01, 0));
    if (!knob.visible) continue;
    const pressed = hands.some((h) => h.present && h.tip.distanceTo(kp) < 0.022);
    knob.userData.cap.position.y = pressed ? 0.004 : 0.008;
    if (pressed && t > knobCool[name]) {
      knobCool[name] = t + 1.2;
      if (name === "record") toggleRecord();
      else if (name === "talk") startTalking();
      else if (name === "mode") { if (knob.visible) cycleMode(); }
      else if (name === "map") toggleMap();
      else player.playing ? stopReplay() : startReplay();
    }
  }
  const both = hands.filter((h) => h.present && h.pinch && !grabs.has(h.id)).length === 2;
  recenterHold = both ? recenterHold + dt : 0;
  if (recenterHold > 1.5) { placeStageInFront(); recenterHold = 0; toast("Stage moved"); }
}

// In ?emulate mode the desktop simulator steers IWER's tracked hands, so grabbing
// goes through the real WebXR hand-joint code. Closed loop: nudge each emulated
// hand until its measured pinch point sits where the simulated hand is.
const emu = { offsets: [new THREE.Vector3(), new THREE.Vector3()] };
function driveEmulatedHands(dt) {
  sim.camera = renderer.xr.getCamera().cameras?.[0] || camera;
  sim.update(dt, stageRoot);
  const pairs = [[sim.main, "right"], [sim.other, "left"]];
  pairs.forEach(([simHand, side], i) => {
    const h = xrDevice.hands[side];
    if (!h) return;
    const target = stageRoot.localToWorld(simHand.position.clone());
    const slot = xrHands.slots.findIndex((s) => s.source && s.source.handedness === side);
    // learn the offset only with an open hand: closing the fingers moves the
    // pinch point, and chasing that would drag a held bar around
    if (slot >= 0 && xrHands.hands[slot].present && !simHand.pinch && !xrHands.hands[slot].pinch) {
      const got = stageRoot.localToWorld(xrHands.hands[slot].position.clone());
      emu.offsets[i].addScaledVector(target.clone().sub(got), Math.min(1, dt * 10));
    }
    const p = target.add(emu.offsets[i]);
    h.position.set(p.x, p.y, p.z);
    const q = stageRoot.getWorldQuaternion(new THREE.Quaternion()).multiply(simHand.quaternion);
    h.quaternion.set(q.x, q.y, q.z, q.w);
    h.updatePinchValue(simHand.pinch ? 1 : 0);
  });
}

// ---- loop -------------------------------------------------------------------------
const clock = new THREE.Clock();
let elapsed = 0;
renderer.setAnimationLoop((time, frame) => {
  const dt = Math.min(clock.getDelta(), 0.05);
  elapsed += dt;
  stageRoot.updateMatrixWorld(true);

  let hands;
  if (xrMode) {
    if (placeStage && renderer.xr.getCamera().matrixWorld) { placeStageInFront(); placeStage = false; }
    if (xrDevice) driveEmulatedHands(dt);
    hands = xrHands.update(stageRoot, dt);
    if (placing) updatePlacement(dt, frame, hands);
    else {
      handleHands(hands, false);
      xrGestures(dt, hands, elapsed);
    }
    for (const i of [0, 1]) {
      const m = renderer.xr.getHand(i).getObjectByName("handModel");
      if (m) m.visible = xrMode === "immersive-vr";
    }
  } else {
    hands = sim.update(dt, stageRoot);
    handleHands(hands, true);
  }
  simMeshes.update(sim.hands, !xrMode);

  recorder.capture(dt, pip);
  if (player.playing) { player.apply(dt, ghost, GHOST_OFF); ghost.update(dt); ghostDetector.update(dt); }

  ai.update(dt);
  pip.update(dt);
  marlo.update(dt);
  detector.update(dt);
  show.update(dt, !!xrMode);
  if (recordHintPending && show.state === "done" && !narrator.speaking) hints.show("record", !!xrMode);
  if (preshow) {
    preshowT += dt;
    if (cordAuto) setCordPull(cord.pull + dt * 0.12);
    if (preshowT > 1.2 && hints.current !== "cord" && !cord.held) hints.show("cord", !!xrMode);
    if (preshowT > 45) raiseCurtain(); // never leave anyone stuck in the dark
  }
  mind.update(dt, { t: elapsed, act: show.state === "act" ? show.scene.acts[show.act] : null, actT: show.actT, busyVoice: narrator.speaking || marloLines.length > 0, showState: show.state });
  updateMarloVoice();
  hints.update(dt);
  props.update(dt);
  curtains.update(dt);
  cord.update(dt, preshow);
  emotes.update(dt);
  confetti.update(dt);
  sets.update(dt);
  storyMap.update(dt);
  book.update(dt);
  updatePrincess(dt);
  if (mode.id === "party") {
    spot.color.setHSL((elapsed * 0.12) % 1, 0.75, 0.7);
    if (!ai.busy && Math.floor(elapsed) % 9 === 0 && Math.floor(elapsed - dt) % 9 !== 0) ai.react("dance");
  }
  footsteps();
  marloMouth.position.copy(marlo.get("head"));
  night += (nightTarget - night) * Math.min(1, dt * 1.5);
  spot.intensity = 5.5 - 4.3 * night;
  hemi.intensity = 0.25 - 0.19 * night;
  scene.environmentIntensity = 0.4 - 0.3 * night;
  narrator.update(dt);

  const [lg, rg] = ai.grips();
  // the robot watches the knight, and looks out at you while it narrates
  const viewCam = xrMode ? renderer.xr.getCamera() : camera;
  const lookAt = robot.talk > 0
    ? stageRoot.worldToLocal(new THREE.Vector3().setFromMatrixPosition(viewCam.matrixWorld))
    : pip.get("head").clone();
  robot.update(dt, lg, rg, lookAt);
  robotBatch?.update();

  if (captionTimer > 0 && (captionTimer -= dt) <= 0) caption.classList.remove("on");
  if (Math.floor(elapsed * 4) !== Math.floor((elapsed - dt) * 4)) updateStatus();
  // Quest: shadows refresh every other frame (puppets move slowly; halves that pass)
  if (xrMode) { spot.shadow.needsUpdate = (frameNo++ & 1) === 0; renderer.render(scene, camera); }
  else {
    trackPerf();
    if (QUALITY[qTier].halfShadows) spot.shadow.needsUpdate = (frameNo++ & 1) === 0;
    if (QUALITY[qTier].bloom) composer.render();
    else renderer.render(scene, camera);
  }
});

// ---- adaptive quality (desktop): measures the real frame rate and steps down
// resolution, then the glow, then shadow detail, until the show runs smoothly.
// ?quality=high|medium|low pins a level.
function applyQuality(i, why = "") {
  qTier = Math.max(0, Math.min(QUALITY.length - 1, i));
  const q = QUALITY[qTier];
  renderer.setPixelRatio(Math.min(devicePixelRatio, q.pr));
  renderer.setSize(innerWidth, innerHeight);
  composer.setPixelRatio(Math.min(devicePixelRatio, q.pr));
  composer.setSize(innerWidth, innerHeight);
  if (!xrMode && spot.shadow.mapSize.x !== q.shadow) {
    spot.shadow.mapSize.set(q.shadow, q.shadow);
    spot.shadow.map?.dispose();
    spot.shadow.map = null;
  }
  spot.shadow.autoUpdate = !q.halfShadows;
  perfWin.n = 0; perfWin.sum = 0; perfWin.settle = performance.now() + 2500;
  if (why) console.info(`[perf] quality → ${q.name} (${why})`);
}
function trackPerf() {
  const now = performance.now(), d = now - perfWin.last;
  perfWin.last = now;
  if (pinnedQuality || d > 250 || document.hidden || now < perfWin.settle) return;
  perfWin.sum += d; perfWin.n++;
  if (perfWin.sum < 2500) return;
  const avg = perfWin.sum / perfWin.n;
  perfWin.sum = 0; perfWin.n = 0;
  if (avg > 20.5 && qTier < QUALITY.length - 1) { applyQuality(qTier + 1, `${(1000 / avg).toFixed(0)} fps`); perfWin.downs++; }
  // only climb back on fast displays with real headroom, and not after struggling twice
  else if (avg < 11 && qTier > 0 && perfWin.downs < 2) applyQuality(qTier - 1, `${(1000 / avg).toFixed(0)} fps`);
}

function updateStatus() {
  $("st-narrator").textContent = narrator.source;
  $("st-marlo").textContent = `${GUESTS[guestId].name}: ${mind.moodName} · ${ai.current}`;
  $("st-grip").textContent = pip.main.held ? (pip.hands.held ? "both bars" : "main bar") : pip.hands.held ? "arm bar" : "open hand";
  $("st-rec").textContent = recorder.recording ? `● ${recorder.duration.toFixed(1)}s` : lastPerf ? `${(lastPerf.frames.length / lastPerf.rate).toFixed(1)}s take` : "—";
  $("st-mode").textContent = sim.autopilot ? "demo autopilot" : xrMode ? xrMode.replace("immersive-", "").toUpperCase() : "desktop simulator";
}

addEventListener("resize", () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
  composer.setSize(innerWidth, innerHeight);
});
applyQuality(qTier);

// exposed for debugging / automated checks
window.strings = { get quality() { return QUALITY[qTier].name; }, applyQuality, book, get princess() { return princess; }, princessDrv, get currentTask() { return currentTask; }, movePipTo, storyMap, sets, setGuest, applySet, changeScene, openMap, guests, get guestId() { return guestId; }, get chapter() { return chapter; }, ghostDetector, get mode() { return mode; }, mind, emotes, confetti, cord, cycleMode, applyMode, MODES, startPreshow, get preshow() { return preshow; }, show, props, hints, curtains, talk, sfx, raiseCurtain, robot, scene, camera, renderer, stageRoot, xrHands, grabs, pip, marlo, ghost, ai, detector, narrator, sim, recorder, player, encodePerformance, decodePerformance, startReplay, toggleRecord };
