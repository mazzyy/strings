# Strings: handover for a new session

Read this first. It's the short version of everything built so far, how to work on it, and what's left.
The full history (24 phases, every feature and fix) is in **`DEVELOPMENT_JOURNAL.md`**.

## What it is
**Strings** is a hands-first WebXR marionette theatre for Meta Quest, with an AI co-performer. You
pinch a glowing control bar to work **Sir Pip** (a knight marionette) with real string physics, while
a storyteller **robot puppeteer** works the other puppets (Marlo the dragon, Bramble the wizard,
Captain Pegg, Grumble the troll, Clank the robot, Princess Juniper, the King).

- **Live:** https://strings.musawar.tech/ (the developer's custom domain, HTTPS enforced; https://mazzyy.github.io/strings/ redirects there; works with no server)
- **Code:** https://github.com/mazzyy/strings (public)
- **Purpose:** the developer's entry to the **Meta VR Start Developer Competition 2026** (Devpost).
  **Deadline: 18 Nov 2026, 12:00 PT.** Judging until about 9 Dec; winners about 11 Dec.

## Current state (as of 17 Nov 2026)
Everything is merged into `main` and published. The live site is the intended submission build.
- **Ways to play (start menu, a gold-framed theatre):**
  - Begin/Continue the story: 9 chapters plus a prologue (3 is the Toymaker's Workshop with Twig, 5 the Harbour Laundry with Noodle the sock puppet), the night-sky finale, a knighting and the curtain call;
  - Play Any Chapter (all unlocked);
  - Make Your Own Story (an illustrated picker with a "Tonight's Show" preview, or typed);
  - Free Play (play as any of 8 characters);
  - Pinch Lock and One Hand options.

  ☰ Menu or Esc reopens it at any time; in the headset it's the white Menu knob on the stage.
- **Key systems:**
  - Verlet puppet physics;
  - an offline guest "mind" (mood, memory, initiative, Backstage Notes);
  - Marlo saving the scene when you fail, and the audience reacting to moves;
  - 17 tasks;
  - natural pre-recorded voices (Kokoro for the narrator and most of the cast; Qwen3-TTS, recorded with feeling, for Marlo, Princess Juniper, Noodle and Doodle; `?voices=kokoro` brings back their Kokoro voices) and a CC0 soundscape;
  - poke-to-talk speech bubbles (the Quest Browser has no speech recognition);
  - passthrough: the stage sits on your real desk with a WebXR anchor, and the puppets can step onto the desk;
  - the "Unbound" ending: your applause frees Marlo, who lands on your palm;
  - the dragon ride with Sir Pip seated astride.
- **Not yet done:**
  1. a test on a **real Quest** (≥60 fps, pinching, the menu boards, the robot's face, the ride, anchors in passthrough);
  2. the **demo video** (under 3 minutes, real footage on a Quest or the IWER emulator, public on YouTube or Vimeo);
  3. the **Devpost text** (inspiration, how it was built, future plans, **a target launch date**). Submit as **Gaming** track, **New Experience** division;
  4. optional: the developer's own character emotion recordings (see `RECORDING_GUIDE.md`).
- **After submitting:** tag the submitted commit and **don't publish to GitHub Pages again until the results**. The rules forbid changes after the entry period, and the link must stay up until the winner announcement.

## How the developer likes to work (follow this)
1. **Every change goes on a new branch**, gets tested (headless and/or the emulator, with screenshots), is pushed, and is shown at `http://localhost:8095`.
2. **Ask before merging and publishing.** Only after the developer says "Yes, merge and publish": fast-forward `main`, push, publish `gh-pages`, then check the live site.
3. Keep `DEVELOPMENT_JOURNAL.md` updated with a new phase for each change (plain, factual English).
4. When the developer shares a reference image, compare screenshots against it repeatedly until it matches. Check 3D models from several angles, not just the front.

## Hard rules
- **Natural voices only**: never the browser's `speechSynthesis` (robotic). New spoken lines go in `public/src/lines.js` (or `storymaker.js`), then run the voice builder (below). Every line must be pre-recorded so the hosted build works without a server.
- **The live site must work with no server.** The local LLM (Qwen via Ollama, `server.mjs`) is optional and absent for judges.
- **Assets must be licensed** (CC0, Apache, MIT, OFL) and listed in `CREDITS.md`. No brands or logos, no identifiable people, no "Quest"/"Meta" wording in the experience. Draw art in code (canvas/SVG/three.js) rather than downloading it; ask before any download, naming the file, source and size.
- **Hands-first, seated:** everything must work by pinch or poke in a 2-foot radius, with no controller or keyboard.
- **Privacy:** never put the developer's personal details in requests to outside services. Never print or commit the `.env` key (it's git-ignored).
- **Outward-facing actions** (publishing, merging, deleting, messaging) need the developer's go-ahead.

## Run, test, publish
```bash
npm start                        # serves public/ at http://localhost:8080 (PORT=8095 npm start for the usual port)
```
- `?emulate` adds Meta's IWER Quest emulator; `?autostart` skips the menu; `?quality=low|...` forces a quality tier.
- **Headless tests:** `tools/headless-tests/` holds the playwright scripts used throughout (`t*.mjs`, plus `live*.mjs` for the live site). They use the Chromium in `~/Library/Caches/ms-playwright/` with CPU rendering and drive the game through `window.strings` (a debug handle exposing the show, puppets, `sim` hands, `storyMap`, `playStory`, `setFlight`…). Run them with `node tools/headless-tests/tNN.mjs <screenshot-dir>` while the server runs on 8095 (`npm i playwright-core` in that folder first). The headless browser runs about 5× slower than real time, so allow for timing. Stub `renderer.render` for speed; restore it for screenshots.
- **Voice lines:** `tts/.venv/bin/python tts/build_voice.py af_heart am_puck` (records only new lines and removes unused ones). Then, for Marlo, the princess, Noodle and Doodle: `../qwen-tts/.venv/bin/python tts/build_qwen.py` (Qwen3-TTS VoiceDesign, its own environment in `../qwen-tts`, the model in the Hugging Face cache; each line's feeling is written in `FEEL`, each character's voice in `CAST`; it maps the Kokoro clips, so run it after the Kokoro builder). The side-by-side page is `voice-qwen/compare.html`.
- **Publish** (GitHub Actions is unavailable on this account, so Pages deploys from a branch):
  ```bash
  git push origin main
  # gh-pages gets main's public/ as a new commit on top of what's published (a plain push, no force:
  # the branch holds the developer's own commits too, e.g. the custom domain's)
  NEW=$(git commit-tree main:public -p origin/gh-pages -m "Publish main ($(git rev-parse --short main))")
  git push origin "$NEW":gh-pages
  gh api -X POST repos/mazzyy/strings/pages/builds
  ```
  Then check https://strings.musawar.tech/. The only expected 404 is `api/status` (no server on Pages). `public/CNAME` keeps the custom domain: never delete it. VR needs HTTPS: keep "Enforce HTTPS" on.

## Where things are
Everything runs from `public/` (a static site; three.js 0.170 via importmap). The main files in `public/src/`:

| File | What it does |
|---|---|
| `main.js` | orchestrator: scene, input, start menu, flow, tasks context, flight and riding, passthrough and anchors, free play, story maker wiring, render loop |
| `puppet.js` | marionette physics, the flight and seated poses |
| `robot.js` | the storyteller robot (screen face, sound-wave mouth, chest clock) |
| `skins.js` / `cast.js` | characters' visuals |
| `director.js` | move detection and the AI performer's clips |
| `mind.js` | the guest's offline mind |
| `show.js` | acts and stars |
| `tasks.js` | the 17 tasks |
| `lines.js` | all the words |
| `storymaker.js` / `storypicker.js` | your own stories |
| `playground.js` | free play |
| `phrases.js` | talk bubbles, and the headset menu board |
| `audio.js` | sounds and soundscapes |
| `unbound.js` | Marlo breaking free |
| `storybook.js` / `storymap.js` | the book and the map |
| `backdrops.js` / `figures.js` | the painted backdrops (layered: sky, drift, foreground) and the storybook characters; shared by the stage sets, the book and the story cards |
| `sets.js` | the stage sets: backdrop layers, 3D pieces, and what moves (clouds, waves, lightning, gears, crystals) |
| `wood.js` | real-grain wood materials (tinted from the walnut photo), grain-aligned UVs, log ends; Twig the wooden boy |
| `handpuppet.js` | sock puppets (Noodle, Doodle): the robot, standing behind the stage, works them up through trapdoors; holes; socks for the washing line |

`public/index.html` holds the start-menu, picker and panel styles. The full table is in `DEVELOPMENT_JOURNAL.md` §5.

## Gotchas learned the hard way
- **`main.js` is one big module.** Reading a `let`/`const` before its declaration line breaks page load (a TDZ error). Declare shared state near the top, and load the page in a browser after each change.
- **Don't draw emoji onto a canvas** (some browsers leave them blank). Use SVG or canvas paths.
- **One-sided surfaces seen from behind show gaps.** Use `DoubleSide` for open shells such as the robot's face frame.
- **Debug handle getters:** `window.strings` exposes getters for objects that get replaced (`pip`, `marlo`). Add a getter for anything new that can be swapped.
- **Typing in inputs must not fire game shortcuts.** The global keydown handler checks `typing(e)`.
- **The story and puppets are locked during the storyteller and the book** (`storyLock()`). Switching modes calls `leaveCurrentMode()`, which cancels any opening still in progress.
