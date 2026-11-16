# Strings: Development Journal

This is a full account of what was built for **Strings**, a hand-tracked marionette theatre for Meta Quest with AI co-performers. It covers the competition context, how the project grew phase by phase, every feature, the architecture, the problems found and fixed, how it was tested, performance, hosting, assets, and what's left.

- **Live build:** https://mazzyy.github.io/strings/
- **Code:** https://github.com/mazzyy/strings

---

## 1. The project in one paragraph

You pinch a glowing control bar and work **Sir Pip**, a little knight marionette, on a theatre stage that sits on a desk (in VR) or on *your* desk (in passthrough).

- **Real puppet physics.** He hangs from real strings simulated in physics: raise your hand and he walks, tip your wrist and he bows, flick up and he jumps, open your hand and he slumps.
- **AI co-performers.** A robot puppeteer works the other marionettes. Each guest has a mood, a memory, a personality and its own voice, so they react to what you do, start things themselves, and help you when you're stuck.
- **A seven-chapter story.** Told through an illustrated, narrated storybook and a parchment map.
- **A different game every chapter:** a sword duel, a riddle, sneaking past a searchlight, rescuing a princess, flying on a dragon. The story ends with a knighting and a grand finale with the whole cast.
- **Record, replay, share.** You can record a performance, duet with your own "shadow", and share it as a link.
- **Hands in seconds.** Start goes straight to a glowing curtain cord; the story comes after you've touched the puppet, and every book can be skipped.
- **Free play.** No story at all: play as any of eight characters, pick the robot's co-star, any stage and a box of toys.
- **The "wow" ending.** After the finale your applause (or the audience's) sets Marlo free: his strings snap, he flies around your head and lands on your open palm.
- **Mixed reality with a purpose.** In passthrough the theatre sits on your real desk, and the puppets can step off the stage onto the tabletop itself.
- **A mind you can see.** The guest remembers what you did; the puppeteer's eyes flash when it does, and a "Backstage Notes" card shows trust, mood and memories after each show.

---

## 2. Competition context

The project is an entry to the **Meta VR Start Developer Competition 2026** on Devpost. The deadline is **18 November 2026, 12:00 PT**.

**What the rules ask for:**
- **Format:** WebXR is allowed as a hosted link (GitHub Pages is fine), plus a demo video under 3 minutes and a text description.
- **Platform:** it must be hands-first from start to finish, optimised for seated play, and run at 60 fps or more on Quest.
- **Passthrough:** only scores if the real room matters.
- **Judging:** innovation, experience design, technical implementation and polish, each 25%.
- **Relevant special awards:** Best Agentic Interaction, Best Reason to Come Back, Best First Five Minutes.
- **Assets:** must be licensed, with no brands and no identifiable people, and in English.

**Decisions that came from these rules:**
- Keep **three.js + WebXR**, delivered as a static site.
- Everything must work **with no server** on the hosted link: pre-recorded voices and an offline AI mind.
- Use **natural recorded voices only.** The browser's built-in speech was removed because it sounds robotic.
- Make the controls **seated-friendly**: you can grab the bar from below, and hand motion is amplified.
- Build **onboarding into the world** (a cord you pull, hints with arrows and voice) instead of menus of text.

---

## 3. How it grew: phase by phase

### Phase 1: the core theatre
- **Puppet physics:** a Verlet ragdoll with 16 particles, rigid sticks and a soft waist. Strings are one-sided rope constraints that are partly inelastic, so a yank lifts the puppet rather than flinging it. A velocity cap keeps limbs wooden, not rocket-powered.
- **Helpers that make crude input read as puppetry:**
  - moving the bar sideways alternately shortens the knee strings, which produces a walk;
  - tipping the bar forward pays out the head and shoulder strings, which produces a bow.
- **Move detector:** watches Sir Pip's body and emits walk, bow, jump, wave, turn, fall, slump, rise, approach and idle. Facing is measured from the hips so it stays stable during a bow; the bow is checked before the jump; there are cooldowns.
- **AI performer:** plays the guest marionette with short "clips" (bow back, wave, help, retreat, mirror, dance…) through the same bars-and-strings physics.
- **Narrator:** one line at a time.
  - Built-in lines, or a language model through a local server: Claude if a key is set, otherwise **Qwen 2.5 7B** through Ollama, which is what's on this machine.
  - The model returns a line plus Marlo's reaction, as structured output.
  - Non-English replies are retried.
- **Record, replay and share:** the two bars' poses at 30 Hz, quantised, delta-encoded, gzipped and base64url-encoded into the link (about 4 KB for 25 s). A translucent ghost Sir Pip replays it.
- **Quest support:** hand tracking (a pinch is the thumb–index gap, with hysteresis), controllers as a fallback, VR, and passthrough AR with a hit-test reticle to place the stage on a real desk.
- **Testing without a headset:** a desktop hand simulator (mouse and keys) plus Meta's IWER emulator (`?emulate`), which drives the real WebXR hand-joint code.

### Phase 2: graphics close to the reference image
- **Stage:** walnut base, oak floor, gilded scrollwork, posts with gold finials, velvet curtains with sheen, footlights.
- **Room:** a warm study with wallpaper, wainscoting, a desk, a lamp with a real light, books and papers, a bookshelf (instanced), and framed sketches.
- **Lighting and textures:** CC0 textures and an HDRI from Poly Haven.
- **Sir Pip:** armour, a blue plume and tabard, a moustache, and holographic cyan control bars that glow (bloom).
- **Marlo:** scales, horns, wings that flap, and a tail with its own Verlet chain.
- **The robot puppeteer:** a clearcoat shell, glowing eyes that blink, a mouth that lights up when he speaks, two-bone arm IK that really reaches the bars, and his own layout for desktop and for XR.
- **Draw calls:** static meshes merged to keep the count down.

### Phase 3: a human voice
- **Kokoro neural TTS (fp16 model):** every built-in line pre-recorded to MP3 (now 541 lines, about 14 MB, each loaded only when spoken). Each character has their own voice and pace:

  | Character | Voice |
  |---|---|
  | Narrator | `af_heart` |
  | Marlo | `am_puck` |
  | Bramble | `bm_george`, slow |
  | Captain Pegg | `am_fenrir` |
  | Grumble | `am_onyx`, slow and deep |
  | Clank | `am_echo` |
  | Princess | `af_bella` |
  | King | `bm_lewis` |

- **Live lines** from the language model are voiced by a Kokoro worker process on the local server.
- **No robotic voice:** if a line can't be voiced naturally, it's shown as a caption only.
- **Spatial audio** from the speaker's head.

### Phase 4: competition features
- **Opening:** a curtain intro with a music box tune. All sound effects are generated in code: steps, clinks, chirps, roars, applause, swish, chime, pop, string plucks and snaps, wooden clacks, a siren, zaps.
- **Tonight's Show:** three-act scenes with stars, applause, a curtain call and a **playbill** for your collection, a new show daily, and a streak.
- **Props:** sword, lantern (lights up at night), flower and key. Pinch to carry them in VR, click on desktop, and hand them to Sir Pip or a guest.
- **Talk to the guest:** speech recognition, then an in-character reply from Qwen (or Claude), or keyword understanding offline, in the guest's own voice.

### Phase 5: never stuck
- **Hints:** a glowing arrow plus an animated motion cue (sideways, tip, lift, twist, pinch, poke), a key chip on desktop or a floating label in VR, and the narrator says it aloud.
- **When hints appear:** a grab hint after 4 s without holding the bar, then help every 16 s if an act is stuck.

### Phase 6: depth and feel
- **Pull-cord opening:** a dark stage and a glowing gold cord to pull. Your first action teaches you to pinch and pull.
- **Marlo's mind (fully offline):**
  - **Mood:** joy, trust, energy.
  - **Memory:** counts of bows, falls, gifts, swords… so a third fall gets a giggle, and a sword before he trusts you makes him wary.
  - **Initiative:** copy-me challenges, fetching a prop for you, sulking if ignored, napping, and demonstrating when you're stuck.
  - **Emote bubbles:** ♥ ! ? ★ z.
- **Three endings** chosen by your performing style (grace, slapstick or drama), with critic quotes and scores on the playbill.
- **Unlockable fun modes:** Moon Gravity, Fragile Strings (a hard yank snaps a string), Party.
- **Ghost duet:** your recording performs beside you, and matching its moves pops "In sync!".
- **Seated controls:**
  - grab a bar from up to 30 cm below it;
  - amplified hand motion (×1.3 sideways, ×1.6 vertically);
  - glowing tethers from your hand to the bar;
  - One-Euro filtering on position and rotation;
  - the bar follows your knuckle, so closing your fingers doesn't jerk it;
  - a 0.3 s grace period if tracking drops.
- **Tension-glow strings** that pluck when they snap taut.
- **Sir Pip rests on his hook** until you first pick him up.

### Phase 7: performance pass 1
- **GPU-skinned batching** (`batch.js`): each puppet's ~60 moving parts become bones of one skinned mesh per material. Draw calls fell from **398 to 178** on desktop and from **388 to 168** in the headset.
- **Shadows and materials:** tiny parts skip the shadow pass. On Quest, shadows update every other frame, only puppets and props cast shadows, and physical materials become standard ones.
- **Rendering:** foveated rendering on Quest, desktop pixel ratio capped at 1.5, shaders precompiled.
- **Assets:** textures 5.1 MB → 0.9 MB; HDRI 1.6 MB → 130 KB.

### Phase 8: story mode and the world
- **Storybook map,** *The Tale of Sir Pip*, with chapters that unlock as you go.
- **Stage sets** with painted backdrops, 3D set pieces and their own lighting: courtyard, forest, pirate ship, troll bridge, clockwork tower, dragon's cave, night sky.
- **New guests on the same rig:** Old Bramble the wizard, Captain Pegg (cutlass, parrot, peg leg), Grumble the troll, Clank the clockwork robot, Princess Juniper, the King.
- **Easier prop picking:** generous invisible hit areas, a hover lift, a pointer cursor and a tooltip.

### Phase 9: a playable task per chapter, and the storybook
- **`tasks.js`:**
  - collect fireflies with the lantern, or gems;
  - "simon": repeat the wizard's spell;
  - duel: duck high swings, jump low ones, strike with a lunge or real sword contact; hearts; a knockout;
  - riddle: stand on the right stone;
  - sneak: a sweeping searchlight; get caught and you go back to the start;
  - unlock: the key to the cage;
  - dodge: jump the zaps.
- **Storybook:** three illustrated, narrated pages before each chapter, plus a six-page **prologue** that explains the quest.

### Phase 10: the finale and polish
- **Chapter 7, The Night Sky:**
  - climb aboard Marlo and **fly** (you steer);
  - fly through rings;
  - dodge Clank's gears;
  - chase and catch him;
  - **the twist:** Clank was lonely, not wicked; you bow to show kindness and his red eye turns blue;
  - kneel before the King to be **knighted** "Sir Pip the Brave".
- **Grand finale:** the whole company dancing on stage, fireworks and the music box, then an **epilogue** and **credits**.
- **Start menu:** Continue (shows your chapter), Start a new story, Chapter map.
- **The whole kingdom on the map:** every place clickable; the view leans in only while travelling.
- **Performance pass 2:**
  - adaptive desktop quality from the measured frame rate (resolution → bloom → shadows), plus `?quality=`;
  - removed the CSS backdrop blur;
  - hidden objects skip matrix updates;
  - static meshes compute their matrix once;
  - tasks dispose their objects.

### Phase 10b: the "Unbound" experiment (now part of the main build)
An analysis of what judges and Meta reward (written up in `WOW_EXPERIMENT.md`) found two gaps: passthrough that doesn't use the room, and no single "only in a headset" moment for the video. The answer, built in `unbound.js`:
- **Marlo breaks free:** his strings snap one by one (crack, flash), his control bar vanishes, and he flies out of the theatre in a full loop **around your head** at room scale, wings beating, in the Superman pose.
- **He lands on your hand:** *"Hold out your hand, and keep it still."* Hold any open hand still and he glides down and **stands on your palm**, following it as you move. Pinch, or wave him off, and he flies home and his strings reattach. In tests his feet stayed within 3 cm of the palm.
- **Real applause:** the game watches both palms; a fast close to under 7 cm is a clap, and two claps in a row make the audience roar and every puppet bow (K on desktop).
- **The last beat of the story:** after the grand finale, the narrator invites you to clap, and your applause is what sets Marlo free (Phase 16 made this reliable). A green knob on the apron (and U on desktop) frees him any time.

### Phase 11: presentation polish
- **The robot storyteller opening:** the camera glides up to the robot puppeteer, the stage dims, his eyes brighten, he waves, magic sparkles spiral from his hands, and he says *"Ah, there you are! … let me tell you a story."* Then the book opens. Returning players get *"Welcome back! Now, where were we?"*
- **The storyteller's gesture:** both hands held out at chest height, slowly weaving as if conjuring the tale (the sparkles rise from between them), with a brief lift of one hand in greeting. This replaced a raised-hand wave that bent his arm unnaturally, since his fingers always point down.
- **Real paper page turns:** the old page lifts, curls over the spine in slices and becomes the new left page, with shading and a cast shadow. The page sound was removed at the player's request.
- **Superman-style flight:** while flying, Marlo is posed flat (head forward, belly down, legs and tail trailing), banks into turns and faces the direction of travel, with Sir Pip riding on his back. The free flight in the experiment uses the same pose.
- **Clank fires six zaps,** each a little faster.
- **The redrawn map:**
  - aged parchment with fibres and stains, an ornate double border and burnt edges;
  - meadows, a shaded forest, snow-capped mountains and hills;
  - a winding river, and a sea with a serpent;
  - cottages, a windmill and sheep, clouds and stars;
  - a cobbled road, a compass rose and a scale bar;
  - place names on ribbon banners with red wax-seal numbers.

### Phase 12: real sound, and richer first chapters
- **The opening close-up:** the camera now moves in on the robot's face only (eyes glowing, sparkles around his head) while he speaks, then pulls back, and the book opens once the camera is home. His hands stay on the puppet bars.
- **Real recordings instead of synthesised sound (all CC0):**
  - footsteps (ten variants, picked at random), cloth swishes for the curtain, leather for the bar clacks, sword draws and slices in the duel;
  - a real crowd: applause, laughter when Sir Pip falls (at most once every 9 s), cheering when a chapter's last star lands;
  - a soundscape per chapter that crossfades and loops music plus ambience:
    - storytelling and map: *The Bard's Tale*;
    - courtyard: *Minstrel Dance* with birdsong; forest: crickets, owl calls and frogs;
    - ship: a sea-shanty loop, waves and creaking timber; bridge: night crickets; tower: *Mysterious Clock*; cave: dripping cave ambience;
    - the knighting and finale: *King's Feast*.
  - Music dips under every spoken line and swells for celebrations. Files load lazily per chapter; the synthesised sounds stay as a fallback.
- **Chapter 1, the Castle Courtyard (now 5 acts):**
  - Marlo shows off a loop-the-loop and crash-lands in a heap (thud, the audience giggles);
  - then he's shy: walk up slowly, because rushing makes him hide and tremble;
  - bow; a high five (raise Sir Pip's arm to meet his paw, twice); jump together on his "3, 2, 1, JUMP!" three times for fireworks; wave to the audience.
- **Chapter 2, the Whispering Forest (now 4 acts):**
  - the forest is genuinely dark, lit by the lantern and glowing blue toadstools;
  - the fireflies are shy too, flitting away if you rush at them;
  - new owl task: one of Bramble's three owls hoots (spatial sound from her perch, her eyes flare), and you walk Sir Pip under the one that called, three times;
  - Bramble's spell now makes the forest burst into bloom: 44 glowing flowers grow outward from the wizard (two instanced draw calls), dawn light returns, birdsong.
- 26 new voice lines (522 in total).

### Phase 13: the first five minutes, and judging-rubric gaps (branch `first-five`)
- **Hands within seconds:** Start (or entering the headset) goes straight to the glowing curtain cord. Pull it, and the curtain opens on Sir Pip. A first-time player is asked to lift him, and once they do, Marlo bounds over to say hello. Only then does the robot storyteller speak (one line, not two), followed by the story. Previously, six prologue pages and three chapter pages played before you touched anything.
- **A shorter story:** the prologue is now 3 illustrated spreads instead of 6. Every book has a big red wax seal, "Skip · start the show" (poke it in the headset), and skipping silences the page being read.
- **Talking without a microphone or server:** the Quest Browser has no speech recognition, and the hosted build has no language model. So *Talk* (the blue knob, or the Talk button) now opens speech bubbles to poke or click: "Hello!", "What's your name?", "Let's dance!", "Can you jump?", "Be my friend?", "Come here!". Sir Pip says the line, and the guest answers in their recorded voice and acts on it. Hold V to use the microphone where the browser supports it.
- **Passthrough with a purpose:** when the theatre is set down on a real table, the front of the stage opens onto *your desk*. Sir Pip and the guest can be walked off the stage and stand on the real tabletop, one step down (the physics floor drops by the stage's base height past the front edge). The narrator points this out once.
- **Contact shadows in the headset:** real shadows are off in XR for frame rate, so each puppet gets a soft blob shadow on whatever surface it stands on (stage or real desk). It shrinks and fades as the puppet is lifted.
- **Glow without bloom:** the bloom post-pass can't run in stereo WebXR, so additive halo sprites now glow on the grip knobs (brighter when held), the curtain cord's tassel (pulsing until pulled) and the hint arrow. They also appear on desktop quality tiers without bloom.
- **The mind made visible:** the guest's offline mind now writes down what it remembers, even mid-task: "you bowed to him first", "saw you take a tumble", "giggled at your third tumble", "you gave him the flower", "was wary of your sword", "felt ignored for a while", "you copied his move". Each new memory flashes the puppeteer's eyes gold and pops a "Marlo remembers: …" bubble beside his head. At the curtain call, a **Backstage Notes** card stands beside the playbill (and on screen on desktop), showing trust as a percentage, joy, energy, current mood and everything remembered.
- **Accessibility:**
  - *Pinch lock* (a new violet knob, or a checkbox on the start menu, remembered between visits): pinch once to pick up a bar, open your hand and it stays held, pinch again to put it down. No sustained pinch is needed.
  - *Subtitles in the headset:* every caption also appears on a strip just below the front of the stage, turned to face you, inside a narrow field of view. Before, captions only existed on desktop.
  - Speech bubbles now size to their text (some longer ones used to be clipped).
- **Hands-only check:** start, book page turns and skip, map, talk, record and replay, pinch lock, Marlo's free flight and recentring all work by pinch or poke in the headset. The only non-hand step is the browser's own "Enter VR" button.


### Phase 14: judge-friendly touches
- **The story rests the puppets:** while the storyteller speaks and the book is open, your hands let go, Sir Pip glides back to his spot, and moves don't trigger the guest or the narrator. The bars can't swing into the close-up, and the story always starts on time.
- **Play any chapter:** the start menu offers "Play any chapter · all unlocked" (for new and returning players), which opens every place on the map, including the Grand Theatre. "Start a new story" resets as before.
- **A quieter sea** on the pirate ship (the waves were too loud).
- **Character voices with feeling:** the game maps every performance and emote to an emotion (happy, laugh, excited, greet, surprised, scared, sad, hurt, sleepy, angry) and plays a recorded take for that character when one exists (`public/audio/voices/`, listed in `index.json`), otherwise the old placeholder. `RECORDING_GUIDE.md` lists what to record for Marlo and Grumble.

### Phase 15: free play (the playground)
- **"Free play · no story, just fun"** on the start menu: the curtain is up straight away, with no story, tasks or book. A *Free play* panel (desktop) or a floating board of tabs to poke (headset; the map knob opens it) offers:
  - **You play:** any of the eight characters (Sir Pip, Marlo, Bramble, Captain Pegg, Grumble, Clank, Princess Juniper, the King). The puppet in your hands becomes that character, built on glowing bars, with everything that watches the player (props, action detection, the guest's mind, footsteps, shadows) following along.
  - **Co-star:** who the robot plays with you (Marlo, Bramble, Pegg, Grumble, Clank), or nobody for a solo show.
  - **Stage:** any of the seven sets, with a curtain swish between them and that set's music and ambience.
  - **Toys:** fireworks, applause (everyone bows), magic flowers, day or night, a music jukebox, every physics mode (moon gravity, party lights, fragile strings, normal), flying with Marlo (when you're Sir Pip and he's on stage), setting your co-star free to fly around your room, and the speech bubbles.
- Record and replay still work, so free play doubles as a little show maker.
- The narrator only comments on actions when you're playing Sir Pip (the commentary is written about him); the event log uses your character's name.

### Phase 16: the ending, made reliable
- **Marlo always breaks free at the end.** After the grand finale he used to break free only if you clapped (real hands in the headset, K on desktop); otherwise the game moved on after 16 s, so many players never saw it. Now, if no clap comes within 10 s (or the headset misses it), the narrator says the whole audience is clapping for him, the crowd applauds, and he snaps his strings anyway. Desktop players are told to press K.
- **No mystery "gold button".** Unlocking a fun mode used to announce itself ("press the gold button") right at the finale, drowning out the request to clap. Unlocks are no longer announced during the finale (a toast appears later instead), and the line now says *"the gold Modes button on the front of the stage"*.
- **Every apron button has a little sign above it:** Record, Replay, Talk, Modes, Map, Free Marlo, Pinch lock.


### Phase 17: a scene partner, a guided first minute, one-hand play
Prompted by outside feedback (and a comparison with *Make with Puppet*, which restricts freedom to make hand-tracked puppetry fun):
- **Marlo saves the scene.** When something goes wrong, the co-star turns the mistake into theatre instead of a failure. Mistakes include Sir Pip falling, a wrong spell, a sword hit in the duel, being caught by the searchlight, or getting zapped. Marlo picks one of these:
  - **a double pratfall:** he falls over too, and the narrator says *"Down they both go! A classic double pratfall"*; the audience laughs and claps;
  - **"ta-da!":** a cheer pose and a line as if it was planned (each guest has their own: Bramble *"Behold! Exactly as I planned."*, Pegg *"Arr! We meant to do that!"*, Grumble *"Hrm. That was part of show."*, Clank *"Error. I mean... ta-da."*);
  - **a dramatic gasp,** and getting back up earns *"Up again! What a trouper. Bravo!"* and a cheer;
  - during tasks (when the task directs his moves): *"Never mind! The audience loves a trier"* or *"Oh, the drama!"* with applause.

  It doesn't happen every time (so it never feels like a routine), and at most once every 14 seconds.
- **The audience reacts to every move:** a short burst of real applause for a bow, a jump, a spin or a wave (snippets cut from the recording with a fade-out; at most every 3.5 s), so even half a minute of playing around is rewarded.
- **The guided first minute:** for first-time players, after the curtain rises, there are three tiny steps, each rewarded at once:
  1. lift Sir Pip (a ripple of applause, and Marlo waves);
  2. tip him into a bow (applause, and Marlo bows back);
  3. walk him over to Marlo (who says hello, and the crowd cheers).

  The narrator says each step and an arrow shows the motion. A step never waits more than 15 to 20 seconds. Then the storyteller and the book begin.
- **One-hand mode** (an orange "One hand" button on the apron, or a checkbox on the start menu, remembered between visits): no second hand needed. The arm bar rides along with the main bar, and **rolling the wrist** raises Sir Pip's arms (roll back and forth to wave; high fives work too). Hints change to *"Roll your wrist to raise his arms"*.
- 15 new voice lines (541 in total).
---

## 4. The story

**Prologue.** Every night, the kingdom's golden music box played everyone to sleep, wound by Princess Juniper. One stormy night, Clank the clockwork robot carried her off to his tower and hid the music box's three jewels. The kingdom fell silent. The King called for a hero, and only one very small knight answered.

| # | Chapter | Guest | What you do |
|---|---|---|---|
| 1 | The Castle Courtyard | Marlo the dragon | Tutorial: his crash landing, approach gently (he's shy), bow, high fives, jump together, wave |
| 2 | The Whispering Forest | Old Bramble | Lantern in the dark, catch 5 shy fireflies, follow the owls' calls, copy his spell (the forest blooms) |
| 3 | The Pirate Ship | Captain Pegg | Take the sword, duel (duck/jump/strike, 3 hits, knockout), bow |
| 4 | The Troll Bridge | Grumble | Approach, answer the riddle (stand on the right stone), give the flower |
| 5 | The Clockwork Tower | Clank + Princess Juniper | Sneak past the searchlight, unlock the cage, jump the zaps until he overheats |
| 6 | The Dragon's Cave | Marlo | Lantern, find the 3 music-box jewels, final bow |
| 7 | The Night Sky | Marlo, Clank, the King | Fly, rings, gears, chase, kindness, knighting, then the grand finale |

**Epilogue.** The music box plays every night, and Clank winds it himself. Bramble remembers his birthday, Pegg finds a crew, and Grumble lets everyone cross if they say hello. Sir Pip still has no idea what he's doing, but he has friends.

The **Grand Theatre** (on the map after chapter 1) runs a new three-act show every day, for coming back.

**Ways in, from the start menu:**
- **Begin the story** (or **Continue**, which names your chapter) and **Start a new story**.
- **Play any chapter · all unlocked:** every place on the map can be chosen straight away (for judges, or anyone short of time).
- **Free play · no story, just fun:** the playground (Phase 15).
- **Pinch lock** can be switched on right there, before you start.

---

## 5. Architecture

Everything is in `public/` and runs as a static site; `server.mjs` is optional and local.

| File | What it does |
|---|---|
| `main.js` | The orchestrator: renderer and scene, cast, input and grabs (including pinch lock and the story lock), the flow (start menu → cord → warm-up → storyteller → book → chapters → map, or free play), soundscape cues, tasks context, extras (non-AI puppets), flight, finale, real-desk play and contact shadows, halos, 3D subtitles, the guest's memory display, XR session, adaptive quality, loop |
| `puppet.js` | Verlet marionette: physics, strings (tension colour, snapping), gait and bow assists, moon gravity, fragile strings, batching hook |
| `skins.js` / `cast.js` | Procedural visuals for every character on the shared rig; control bars; the generic humanoid skin builder |
| `batch.js` | GPU-skinned batching of moving parts |
| `director.js` | Move detector, and the AI performer with its clips (bow, wave, dance, fetch, slash, stagger, scan, zap, carry, knockout, endings…) |
| `mind.js` | The guest's offline mind: mood, memory (counts plus remembered moments in words), personality, initiative, the Backstage Notes report |
| `show.js` | Acts, stars, style tracking, endings, playbills, the Backstage Notes card, grand-finale hook |
| `tasks.js` | The 17 playable tasks (shy approach, high fives, jump together, owls, collect, spell, duel, riddle, sneak, unlock, dodge, mount, rings, gears, chase, kindness, knighting) |
| `lines.js` | All the words: chapters, pages, guests (says/talk/task lines, personalities), hints, endings; read by the voice builder |
| `narrator.js` | Line queue, LLM narration (local server), pre-recorded clips, guest lines take priority |
| `storybook.js` / `storymap.js` | The illustrated book and the parchment map; each is one canvas used as a desktop overlay or as a pokeable texture in VR |
| `sets.js` / `stage.js` | Stage sets (painted backdrops, set pieces, lighting), the stage itself, curtains, cord, knobs, room |
| `props.js` | Props, hit areas, hover, use-targets (key → cage) |
| `hints.js` / `emote.js` / `fx.js` | Hints, emote bubbles, confetti |
| `input.js` | XR hands (One-Euro filter, anchor, grace) and the desktop simulator |
| `recorder.js` | Record, replay, share links |
| `audio.js` | Sound: real CC0 recordings with random variants (procedural sounds as a fallback), the per-chapter soundscape (music and ambience that loop, crossfade, duck under speech and swell), and recorded character emotions |
| `phrases.js` | Talking without a microphone: speech bubbles to poke or click |
| `playground.js` | The free-play menu: a desktop panel, and a board of tabs to poke in the headset |
| `unbound.js` | Marlo breaking free, flying around your head, landing on your palm; clap detection |
| `public/audio/` | 42 converted CC0 sound files, plus `voices/` for recorded character emotions (`index.json` lists them) |
| `perf.js` | Static mesh merging |
| `server.mjs` | Optional: Claude or Ollama narration and talk, Kokoro live voice |
| `tts/` | Kokoro voice builder and worker |

**Data flow in one frame:**
1. Hands → grab logic → control bars.
2. Physics (120 Hz substeps) → skins and batching.
3. Detector → events → mind (guest reaction) + show (acts and tasks) + narrator.
4. AI performer → the guest's bars.
5. Tasks drive their own pieces.
6. Soundscape, contact shadows, halos and subtitles follow along.
7. Render: bloom on desktop; foveated rendering with additive halos instead of bloom in XR.

---

## 6. Problems found and fixed (highlights)

- **Puppet behaviour:** the jump flipped Sir Pip; bows weren't detected; VR grabbed the wrong bar; the emulator lifted the puppet on pinch.
- **Language model:** Qwen sometimes answered in Chinese, so non-English replies are retried.
- **Robotic voice:** caused by the browser's built-in speech covering for missing lines. It was removed entirely.
- **Draw calls:** too many, so the puppets are batched with GPU skinning.
- **Prop picking:** props were too small to click, and the log panel blocked clicks. Fixed with hit areas, hover feedback, and a log panel that lets clicks through.
- **Reach on desktop:** the riddle stones, fireflies and gems were placed where only the scroll wheel could reach. They now sit on Sir Pip's walking line.
- **The riddle:**
  - the voice was dropped behind the narrator; it's now a priority line the narrator waits for;
  - the sign was hidden behind the curtain;
  - Sir Pip starting on a stone counted as an answer.
- **The wizard's spell:** a bow also registered as a wave (the head drops below the hands), which reset the spell. Bows no longer count as waves, and leftover motion is forgiven.
- **The map:** zoomed in so far that some places couldn't be picked. The whole kingdom now fits.
- **The XR map** faced the floor; the head position is now read from the user camera.
- **The grand finale** didn't trigger, because the scene builder dropped the finale flag.
- **The cage** wouldn't unlock: the rack prop in front of it caught the click, and the "used on" field was dropped.
- **The storyteller's hands** looked wrong twice (an arm bent behind his head, then an awkward conjuring pose). The opening is now a close-up of his face with his hands left on the bars.
- **The book opened before the camera came home** (timers in real time, the camera in game time). The camera tween now calls back when it finishes.
- **Moving Sir Pip during the story** swung his glowing bars into the close-up, and every move gave the narrator something new to say, so the story never started. The puppets now rest during the story and moves are ignored.
- **The ending was easy to miss:** Marlo only broke free if you clapped, and a mode-unlock announcement ("press the gold button") played at that exact moment. The audience now claps if you don't, and the announcement waits.
- **Talking didn't exist in the headset:** the Quest Browser has no speech recognition and the hosted build has no server. Replaced by speech bubbles.
- **Bubbles cut off longer text** (a fixed canvas width); they now size to fit.
- **Two module-order bugs** (a variable read before its declaration) stopped the page from loading; found by loading the page in the browser pane after each change.
- **Hosting:**
  - GitHub Actions is locked by an account billing issue, so Pages deploys from a `gh-pages` branch;
  - a dead custom domain (`musawar.me`) broke every github.io page and was removed (with permission).

---

## 7. Testing

There's no headset, so testing used:
- **Headless Chromium** (playwright-core, CPU rendering) with scripted end-to-end runs of every chapter: the opening, menu, prologue, cord, all tasks (played by steering, not teleporting, where it matters), endings, playbills, modes, ghost duet, map, storybook, finale, credits.
- **The IWER Quest emulator** for the XR path: pinch grabs, the lap grab with amplification, the cord pull, prop hand-offs, poking the map and the book (and its skip seal), speech bubbles, the free-play board, Marlo's flight around the head and landing on the palm, clap detection with synthetic palms, facing checks.
- **Newer scripted checks:** the cord-first opening with an "eager player" who never stops moving (the story still starts); the shy approach (rushing makes Marlo hide), high fives, jumping together, shy fireflies, the owls and the blooming spell; the ending with no clap at all (Marlo still breaks free); the Backstage Notes card; Sir Pip stepping down onto the real desk; every character, co-star, stage and toy in free play; the character-emotion hook with a stand-in recording.
- **Draw-call counts, per-system JavaScript timing, and before/after asset sizes.**

**Not tested:**
- a real Quest: frame rate, how hand tracking and pinch lock feel, clap and palm detection, the step down onto a real desk, the reach of the floating boards;
- listening to every voice line and sound by ear.

---

## 8. Performance (current)

| | Value |
|---|---|
| Assets at start | ~1 MB (textures + HDRI) plus the short sound effects; music and ambience (5.6 MB) load per chapter; voice clips (14 MB, 526 lines) load only when spoken |
| JavaScript per frame | ~0.3 ms on desktop (physics, AI, UI) |
| Draw calls | ~178 per frame on desktop, ~84 per eye in the headset (chapter-dependent); the blooming flowers add 2, each halo and blob shadow 1 |
| Desktop | adaptive quality steps down below ~50 fps |
| Quest | foveation, cheaper materials, fewer and slower shadows |

---

## 9. Hosting and deployment

- `main` holds the code. The site is `public/`, published by pushing `git subtree split --prefix public` to the `gh-pages` branch. Pages builds from that branch (Actions is unavailable).
- Feature work happens on branches, each pushed and tried before being merged into `main` and published: `story-mode`, `chapters-v2`, `polish-v3` … `experiment-wow`, `polish-v6`, `first-five`, `story-lock`, `judge-mode`, `free-play`, `ending-fix`, `scene-partner`.

---

## 10. Assets and licences

- **Poly Haven:** HDRI and textures, CC0.
- **OpenGameArt:** music (*The Bard's Tale*, *Minstrel Dance*, *King's Feast*, a pirate-ship loop, *Mysterious Clock*), ambience (birds and wind, crickets, a river for the sea, a dungeon), and crowd sounds (applause, giggling, cheering), all CC0.
- **Kenney "RPG Audio":** footsteps, cloth, creaks, metal clicks, knife draws and slices, leather, CC0.
- **Kokoro TTS:** Apache-2.0.
- **three.js, IWER:** MIT.
- **Qwen 2.5:** Apache-2.0.

The audio files were trimmed, loudness-matched and converted to MP3; full sources are in `CREDITS.md`. Everything else (characters, sets, map, storybook illustrations, the fallback sounds) is generated in code for this project. There are no brands or real people. Character emotion sounds will be the developer's own recordings (`RECORDING_GUIDE.md`).

---

## 11. What's left

1. **A real Quest test:** frame rate, seated comfort, pinch and pinch-lock reliability, clap and palm detection, the step onto a real desk.
2. **The demo video** (under 3 minutes) and **the Devpost text**.
3. **Character emotion recordings** for Marlo and Grumble (the game already plays them once they're added; see `RECORDING_GUIDE.md`).

## 12. Run it

```bash
npm start
```

Then open http://localhost:8080, or add `?emulate` to try the Quest emulator.

The hosted link works with no server.
