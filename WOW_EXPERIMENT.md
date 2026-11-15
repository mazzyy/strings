# What would make Strings win: analysis and an experiment

*This is on the `experiment-wow` branch. It's a prototype, separate from the main build.*

## 1. What the judges and Meta are looking for

The competition scores four things equally: **innovation, experience design, technical implementation, polish**. It also gives special awards for **Best Agentic Interaction**, **Best Reason to Come Back** and **Best First Five Minutes**.

The rules repeat a few themes, and they match what Meta keeps showcasing for Quest:

1. **Hands first.** Natural hand interaction that feels like magic, not like a controller in disguise.
2. **Mixed reality with a purpose.** Passthrough only counts if *the real room matters*. A floating window in passthrough scores nothing.
3. **Comfort.** Seated, smooth, 60 fps or more, no fatigue.
4. **Agents.** Characters that perceive, decide and act, not scripted dialogue trees.
5. **The first five minutes.** You understand it without menus, and something delightful happens early.
6. **Coming back.** A reason to put the headset on again tomorrow.

## 2. Where Strings already stands

| Theme | Strings today | Strength |
|---|---|---|
| Hands first | Real marionette strings, pinch to grab, grab from below, amplified motion, poke the knobs, the book and the map | **Strong** |
| Agents | Each guest has mood, memory, personality and initiative (copy-me, fetch, sulk, nap, demonstrating when you're stuck); a local LLM when available | **Strong** |
| First five minutes | Prologue storybook, pulling the cord, arrow, motion and voice hints | **Strong** |
| Coming back | Seven chapters, daily Grand Theatre show, playbills, streak, modes, endings | **Strong** |
| Polish | Natural voices for 8 characters, procedural sound, sets, finale, credits | **Good** (no real Quest test yet) |
| **Mixed reality with a purpose** | The stage sits on your real desk, and that's all | **Weak: the biggest gap** |
| **A single "wow" clip for the video** | Many good moments, but no one moment that only works in a headset | **Missing** |

Judges watch a 3-minute video first. The strongest entries have **one shot people remember**: something impossible on a flat screen.

## 3. Candidate "wow" moments, ranked

| Idea | Why it fits | Risk | Verdict |
|---|---|---|---|
| **A. Marlo breaks free.** His strings snap and he flies *out of the theatre into your room*, circles your head, and lands on your **open hand**; you carry him, then he hops back onto his strings | It's the story's theme (strings, freedom, the kindness ending) made real; uses hand tracking *and* the room; works seated; a perfect closing shot for the video | Medium: needs palm tracking and room-scale flight; can be built and tested with the emulator | **Build it** |
| **B. Real applause.** The game recognises you **clapping your real hands**; the audience roars and every puppet takes a bow | Audience participation with your body; zero learning; a fun video beat; makes curtain calls feel live | Low | **Build it** |
| C. Finger puppetry: each finger pulls one string | The most authentic hands-only control | High: it can't be tuned without a real headset | Later |
| D. Puppets walk off the stage onto your real table and floor (plane detection, room mesh) | Strong use of MR | High: needs scene-understanding data we can't test reliably in WebXR today | Partly covered by A (he flies into the room) |
| E. Live duet with a friend (two headsets) | Social | Needs a server; a network risk in judging | No |
| F. Voice commands to the director in the headset | Agentic | Speech recognition may be missing in the Quest Browser; offline it would be keyword-only | We already have talking where it's supported |

## 4. The experiment: "Unbound"

### A. Marlo breaks free (press **U** on desktop, poke the new **green knob**, or clap after the finale)
1. **The snap.** Marlo's strings snap one by one (crack, flash), and his control bar vanishes.
2. **The flight.** He flies up out of the stage and makes a full loop **around your head**, at your eye level, at room scale, wings beating. In passthrough he's flying around *your* room.
3. **The perch.** The narrator says *"Hold out your hand, and keep it still."* Hold any open hand still for a moment, and he glides down and **lands on your palm**. He stands there, purring, and follows your hand as you move it.
4. **Back home.** Pinch, or wave him off quickly, and he flies back to the stage and his strings reattach.

### B. Real applause
- The game watches **both palms**. A fast close to under 7 cm counts as a **clap**.
- Two claps in a row (real applause) → the theatre audience roars, every puppet on stage bows, confetti flies, and the narrator says *"What wonderful applause!"*.
- After the grand finale, the narrator invites you to clap for Marlo, and **your applause sets him free**.
- On desktop, **K** stands in for clapping.

### Why it should land with judges
- **Hands:** clapping and offering your palm are gestures everyone knows. Nothing to learn, and no pinch needed.
- **Mixed reality with a purpose:** the puppet leaves the stage and shares *your* physical space.
- **Story:** the finale is about a lonely robot and cut strings; the last beat is the puppet becoming free and choosing to sit on your hand.
- **Video:** the closing 15 seconds are Marlo circling the real room and landing on a real hand.

## 5. What would still need a real Quest
- Tuning the clap threshold and how still your palm must be.
- Checking the flight radius feels right in a small room while seated.
- Frame rate while Marlo is out of the stage (he's one puppet, so the cost is small).

## 6. If this works, next steps
- Add it to the main build as the post-credits moment, and as a reward knob in the Grand Theatre.
- Use plane detection in passthrough so he can perch on a real tabletop as well as your hand.
- Try finger puppetry (idea C) once there's a real headset to tune it on.
