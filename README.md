# Strings

A marionette theatre on your desk, with an AI co-performer. You pinch a glowing control bar and Sir Pip, a small armoured knight, walks, bows, waves and jumps. A robot puppeteer across the stage works Marlo, a young dragon: it watches what your knight does, improvises back, and narrates the story out loud, one line at a time, in a natural voice.

In passthrough AR you set the stage down on your real desk.

**What you can do**
- **The Tale of Sir Pip (story mode):** a storybook map with five chapters, each on its own stage set with its own guest marionette.
  - **Chapters:**
    1. The Castle Courtyard, with Marlo the dragon.
    2. The Whispering Forest, with Old Bramble the wizard.
    3. The Pirate Ship, with Captain Pegg, his parrot and his peg leg.
    4. The Troll Bridge by moonlight, with Grumble the troll.
    5. The Dragon's Cave, back with Marlo.
  - **Characters:** every guest has their own recorded voice, lines and personality. The wizard is a patient teacher, the pirate loves a duel, and the troll is grumpy until you give him a flower.
  - **Travelling:** finishing a chapter unlocks the next. On the map, a shield token walks the road while the view pans; then the curtain falls, the set changes and the next guest takes the stage. The Grand Theatre has a new show every night.
  - **On Quest:** the map floats beside the stage and you poke it.
- **Easy prop picking:** props have generous invisible hit areas. Hovering lifts the prop, shows a pointer, and a tooltip says what a click will do.
- **A curtain you raise yourself:** the stage starts dark with a glowing gold cord. Pinch it and pull down, and the curtain opens. Your first action teaches the pinch-and-pull you'll use all show.
- **Marlo has a mind of his own** (fully offline, so it works on the hosted link): his mood (joy, trust, energy) shifts with what you do, and he remembers it. A third fall earns a giggle instead of help. A sword he doesn't trust yet makes him back away. Leave him alone too long and he sulks until you come over. When the stage goes quiet he acts on his own: he challenges you to copy his moves, fetches a prop for the knight, or dozes off. If you're stuck in a scene, he shows you what to do. Emote bubbles (♥ ! ? ★ z) make his mood readable at a glance.
- **Three endings:** how you perform decides how the show ends. Graceful (bows, waves, gifts) gives The Grand Ceremony, clumsy (falls, flops) gives The Slapstick Finale, and wild (spins, sword-waving, running off) gives The Tragic Encore. The playbill shows the ending, Grace, Slapstick and Drama scores, and a critic's quote.
- **Fun modes you unlock** by collecting playbills: Moon Gravity, Fragile Strings (yank too hard and a string snaps) and Party.
- **Duet with your shadow:** your recording performs beside Sir Pip, and matching its moves pops an "In sync!" bubble.
- **Built for seated play:** you can pinch a bar from below, so your arms can rest low. Hand motion is amplified a little, so small wrist moves give big stage moves. A glowing tether shows which bar your hand is holding. Hand tracking is smoothed with a One-Euro filter, the bar follows your knuckle (not your fingertips, so closing your fingers never jerks the puppet), and a brief tracking dropout doesn't drop him.
- **Strings that glow when taut,** and pluck when they snap tight.
- **Tonight's Show:** every visit is a short three-act scene with goals: meet the dragon, win a dance-off, give Marlo a birthday flower, patrol the stage by lantern light. Each act earns a star and applause, and the curtain call earns a playbill for your collection. There's a new show every day, plus a streak.
- **Props:** pinch the sword, lantern or flower from the rack, put it in Sir Pip's hand, or give it to Marlo.
- **Talk to Marlo:** say something and he answers in his own voice and acts it out. Uses Qwen or Claude locally, and simple keyword understanding on the hosted build.
- **Never stuck:** if you're unsure what to do next, a glowing arrow points at what to use, an animated cue shows the motion, and a label (keys on desktop, the gesture in a headset) and the narrator tell you how.
- **Sound design:** curtain swish, a music box, wooden footsteps, armour clinks, dragon chirps and applause, all synthesised in code.

Runs in the browser with WebXR. On a Quest you use your real hands. Without a headset there's a mouse/keyboard hand simulator, plus an optional Quest 3 emulator.

## Run it

```bash
cd strings
npm install
npm start            # http://localhost:8080
```

### Who narrates

The server picks the first narrator it can use:

1. **Claude**, if `ANTHROPIC_API_KEY` is set (in your shell or in `strings/.env`). Defaults to `claude-opus-5-5` at low effort; override with `STRINGS_MODEL`.
2. **A local model through Ollama**, by default `qwen2.5:7b`. Override with `OLLAMA_MODEL` and `OLLAMA_URL`. Start Ollama before `npm start` (set `OLLAMA_MODELS` if your models live on another drive):

   ```bash
   ollama serve
   ```

3. **The built-in storyteller.** No setup, works offline.

The narrator and the model (`qwen2.5:7b (local)`, for example) show up as "narrator" in the status panel. Ollama is checked again every 15 s, so you can start it after the server.

## Three ways to play

| | How | What it exercises |
|---|---|---|
| Desktop simulator | open `http://localhost:8080` | mouse = your hand, keys = your wrist |
| Emulated Quest 3 | open `http://localhost:8080/?emulate`, then **Enter VR / AR** | the real WebXR hand-tracking path (Meta's IWER emulator); the simulator steers the emulated hands |
| Real Quest | see below | hand tracking + passthrough AR |

**Simulator controls**

| Input | Does |
|---|---|
| hold left click (G = sticky) | pinch the bar |
| move mouse / wheel | move your hand / nearer–further |
| Q / E | rock the wrist (legs lift, Pip walks) |
| W / S | tip forward / back (bow) |
| A / D | twist (turn) |
| Space | flick up (jump) |
| Shift + mouse (H = sticky) | your other hand, on the arm bar (wave) |
| let go | open hand (Pip slumps) |
| R · P · L | record · replay your shadow · copy share link |
| click a prop / click Marlo | hand it to Sir Pip / give it to Marlo |
| hold V | talk to Marlo (browsers with speech recognition) |
| T · M · C · Backspace | demo autopilot · voice · captions · reset |

**On a Quest:** in AR, look at your desk and pinch to set the stage there. Pinch a bar to hold it, and pinch a prop to carry it. Poke the red knob on the apron to record, green to replay, and blue to talk to Marlo (only if the browser supports speech input). Pinch with both hands in the air for 1.5 s to move the stage.

### Getting it onto a Quest

WebXR needs a secure origin, and `localhost` counts as one. The simplest route is USB:

```bash
adb reverse tcp:8080 tcp:8080
```

Then open `http://localhost:8080` in the Quest Browser and tap **Enter AR (passthrough)**. Any HTTPS tunnel to port 8080 works too.

## Voice

The narrator speaks with Kokoro, a natural neural voice (see [CREDITS.md](CREDITS.md)), as spatial audio from the robot's head.

- **Built-in lines** are pre-recorded into `public/voice/`, so the hosted build needs no server. After you change `public/src/lines.js`, re-record them:

  ```bash
  tts/.venv/bin/python tts/build_voice.py            # default voice: af_heart
  tts/.venv/bin/python tts/build_voice.py bm_george  # or any other Kokoro voice
  ```

- **Live LLM lines** (from Claude or Qwen) are voiced by the local server through `tts/worker.py`. Choose the voice with `STRINGS_VOICE=bm_george npm start`.
- **One-time setup:** `python3 -m venv tts/.venv && tts/.venv/bin/pip install kokoro-onnx soundfile lameenc`, then download `kokoro-v1.0.int8.onnx` and `voices-v1.0.bin` from the kokoro-onnx releases into `tts/`.

## Hosting for judges

`public/` is a static site. Push it to GitHub Pages (or any static host) and share the link. On a static host there's no LLM, so the built-in storyteller narrates, still with the pre-recorded natural voice.

## How it works

- **`public/src/skins.js`, `robot.js`, `stage.js`**: everything visual, built procedurally. Physically based materials are lit by a CC0 HDRI. Static parts are merged into a few draw calls (`perf.js`) to hold Quest frame rates.
- **`public/src/puppet.js`**: Pip is a Verlet ragdoll (16 particles, rigid sticks, a soft waist). The strings are rope constraints back to two control bars. Letting go pays the strings out, so Pip slumps. Two small "assists" make crude input read well: moving the bar sideways alternately shortens the knee strings (a gait), and tipping the bar forward lets out the head strings (a bow).
- **`public/src/input.js`**: Quest hand tracking (pinch = thumb–index gap, with hysteresis; controllers work as a fallback) and the desktop simulator. Both produce the same hand pose + pinch, so the grab logic is shared.
- **`public/src/cast.js`, `sets.js`, `storymap.js`**: the guest characters (procedural skins on the shared rig), the five stage sets (painted backdrops plus merged set pieces, built on first use), and the storybook map (one canvas used as an HTML overlay on desktop and as a pokeable texture in the headset).
- **`public/src/mind.js`**: Marlo's mood, memory and initiative (copy-me challenges, fetching, sulking, napping, demonstrating). It decides his reaction to every action, and works with or without a language model.
- **`public/src/batch.js`**: each puppet's ~60 moving parts become bones of one skinned mesh per material, so the GPU poses them in a handful of draw calls.
- **`public/src/director.js`**: `ActionDetector` reads Pip's body and emits walk, bow, fall, jump, wave, turn, slump, rise, approach and idle. `AIPerformer` plays Marlo with short clips (bow back, wave, help, retreat, mirror, dance, and so on) through the same bars-and-strings physics.
- **`public/src/narrator.js` + `server.mjs`**: each batch of actions turns into one spoken line (a natural Kokoro voice, never the browser's robotic speech). Claude returns `{line, reaction}` as structured output, and the reaction queues Marlo's next move. If Claude is unavailable, slow, or declines, the built-in narrator fills in.
- **`public/src/recorder.js`**: a performance is just the two bars' poses at 30 Hz. Replay drives a translucent ghost Pip, your shadow. Share links are quantised, delta-encoded and gzipped into the URL hash, about 4 KB for 25 s.

## Performance

Measured in a desktop browser, before and after the optimisation pass:

| | Before | After |
|---|---|---|
| Assets downloaded at start (textures + lighting) | 6.7 MB | 1.0 MB |
| Draw calls per frame, desktop | 398 | 178 |
| Draw calls per frame, headset (both eyes) | 388 | 168 |
| JavaScript per frame (physics, AI, UI) | 0.29 ms | 0.28 ms |

Changes:
- **Puppets:** GPU-skinned batching (`batch.js`).
- **Static props:** merged into one mesh per material.
- **Shadows:**
  - Tiny parts don't cast shadows.
  - In the headset, shadows update every other frame.
  - In the headset, only the puppets and props cast shadows.
- **Headset materials:** the expensive materials (velvet sheen, clearcoat) switch to standard ones.
- **Headset rendering:** fixed foveated rendering.
- **Desktop rendering:** pixel ratio is capped at 1.5.
- **Shaders:** precompiled behind the loading screen.
- **Garbage collection:** per-frame allocations removed from the physics and AI.
- **Assets:**
  - Textures resized: 1K colour, 512 px normal maps, 256 px roughness.
  - The lighting HDRI is downsampled to 256×128.
  - Voice clips load only when spoken.
