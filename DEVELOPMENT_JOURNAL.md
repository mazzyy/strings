# Strings: Development Journal

This is a full account of what was built for **Strings**, a hand-tracked marionette theatre for Meta Quest with AI co-performers. It covers the competition context, how the project grew phase by phase, every feature, the architecture, the problems found and fixed, how it was tested, performance, hosting, assets, and what's left.

- **Live build:** https://mazzyy.github.io/strings/
- **Code:** https://github.com/mazzyy/strings

---

## 1. The project in one paragraph

You pinch a glowing control bar and work **Sir Pip**, a little knight marionette, on a theatre stage that sits on a desk (in VR) or on *your* desk (in passthrough).

- **Real puppet physics.** He hangs from real strings simulated in physics: raise your hand and he walks, tip your wrist and he bows, flick up and he jumps, open your hand and he slumps.
- **AI co-performers.** A robot puppeteer works the other marionettes. Each guest has a mood, a memory, a personality and its own voice, so they react to what you do, start things themselves, and help you when you're stuck.
- **A nine-chapter story.** Told through an illustrated, narrated pop-up storybook and a parchment map with one winding road. In chapter three Sir Pip meets **Twig**, a carved wooden boy whose nose grows when he fibs. In chapter five he meets **Noodle**, a sock puppet that the robot works on his own hand from behind the stage.
- **A different game every chapter:** a sword duel, a riddle, sneaking past a searchlight, rescuing a princess, flying on a dragon. The story ends with a knighting and a grand finale with the whole cast.
- **Record, replay, share.** You can record a performance, duet with your own "shadow", and share it as a link.
- **Hands in seconds.** Start goes straight to a glowing curtain cord; the story comes after you've touched the puppet, and every book can be skipped.
- **Free play.** No story at all: play as any of nine characters (Twig included), pick the robot's co-star (Noodle the sock puppet included), any of nine stages, and a box of toys.
- **The "wow" ending.** After the finale your applause (or the audience's) sets Marlo free: his strings snap, he flies around your head and lands on your open palm.
- **Mixed reality with a purpose.** In passthrough the theatre sits on your real desk, and the puppets can step off the stage onto the tabletop itself.
- **A mind you can see.** The guest remembers what you did; the puppeteer's eyes flash when it does, and a "Backstage Notes" card shows trust, mood and memories after each show.
- **A scene partner.** When you fall or fail, the co-star turns it into theatre (a matching pratfall, a "ta-da!"), and the audience reacts to every move.
- **Your own story.** Pick a conflict, who needs rescuing, a villain (Twig and Noodle included), a setting (nine) and a twist, or write it in your own words. You see "Tonight's Show", and the theatre stages it, fully voiced.
- **A storybook look.** A theatre-style start menu, and a storyteller robot with a glowing screen face whose sound-wave mouth moves as he speaks.

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
- **Kokoro neural TTS (fp16 model):** every built-in line pre-recorded to MP3 (now 687 lines, about 18 MB, each loaded only when spoken). Each character has their own voice and pace:

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
- **Every apron button has a little sign above it:** Record, Replay, Talk, Modes, Map, Free Marlo, Pinch lock (later also One hand and Menu).


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

### Phase 18: make your own story
- **"✎ Make your own story"** on the start menu opens a storybook-style card. Type what happens in your own words (for example *"dragon kidnaped princes in his cave sir pip to rescue"*), or tap one of five example ideas. A live summary shows what the theatre understood: *Villain: the dragon · at a dark cave · Sir Pip must rescue the princess · by dodging attacks*.
- **How it works without a language model** (`storymaker.js`): the hosted build has no AI server, so the story maker reads key words.
  - **Spelling slips are fine:** any word one or two letters off a story word (a swap of neighbouring letters counts as one) is corrected first, so "kidnaped princes", "trol", "robbot" and "lonley" all work.
  - **What it picks out:**
    - the **villain**: dragon, troll, pirate, wizard or witch, robot;
    - **who or what needs saving**: the princess, the King, the treasure;
    - **where**: castle, forest, ship, bridge, tower, cave, sky (otherwise the villain's home);
    - **the plot**: a kidnapping, a theft, a lonely character, or general trouble;
    - **the challenge**: a fight, a riddle, a spell, dodging, dancing (otherwise the villain's speciality).
- **What it builds:**
  - a 3-page illustrated storybook ("Your Story"), with the villain, the captive or the treasure drawn on the right set;
  - the villain as the robot's co-star, and the captive waiting on stage (in the tower, the princess is in the real cage, and freeing her with the key becomes an act);
  - 3 to 4 acts that fit the goal: face the villain, then the challenge (sword plus duel, the troll's riddle, copying a spell, dodging attacks), find the jewels if something was stolen, unlock the cage, and a final bow. A friendship story is instead a gentle hello, high fives and a dance.
  - At the curtain call, whoever was rescued celebrates with fireworks, the narrator says *"…happily ever after. Shall we make another story?"*, and the card opens again.
- **Every sentence is voiced:** the story maker only produces sentences from a fixed set of combinations (5 villains × 7 places, 4 plots, 5 quests, every act goal), so all 105 are pre-recorded in the narrator's natural voice (646 lines in total).
- You write the story on the flat page (the headset has no keyboard), then press "Enter VR" and play it in the headset.

### Phase 19: the menu, any time
- **☰ Menu** (a new toolbar button, or **Esc**) reopens the start menu mid-game, with a "× Back to the show" button. Every option works from wherever you are: continue the story, start a new one, play any chapter, make your own story, free play, pinch lock, one hand. Switching cleanly leaves the current mode first (it ends a running task, leaves free play, returns to Sir Pip, puts away the extra cast and closes the map).
- **In the headset,** a white **Menu** button on the apron opens a board of options to poke: Continue the story, Chapter map, Free play, Write a story, Pinch lock, One hand. *Write a story* needs a keyboard, so it ends the VR session and opens the story card on the page.
- **Fixed:** typing in the story card used to trigger keyboard shortcuts (R started recording, T the demo, U freed Marlo). Shortcuts now ignore typing.

### Phase 20: story cards in the headset
- **Story cards:** in the headset there's no keyboard, so instead of writing, you pick a story from pokeable cards (Menu → *Story cards*). There are five tabs:
  - **Villain:** Marlo, Clank, Grumble, Pegg, Bramble;
  - **Who needs help:** the princess, the King, the treasure, nobody;
  - **Setting:** any of the 7 stages (it follows the villain's home until you choose one);
  - **Challenge:** dodge attacks, sword duel, riddle, magic spell, dance-off, make friends;
  - **Twist:** none, moon gravity, fragile strings, at night.

  A red **Stage it!** tab builds the story with the same builder as written stories: the storybook, the stage, the captive, the acts. When a story ends in the headset, the cards come back for another one.
- **Twists:** moon gravity and fragile strings switch on for that story only; "at night" darkens the stage and lights the lantern. Written stories that mention night or the dark get the night twist too.
- **Friendship stories** now include **giving the flower** as a present (gentle hello, the flower, a dance, a bow).
- **Fixed:** opening the menu during the opening warm-up or the storyteller could let the old opening carry on afterwards. Switching modes now cancels any opening in progress.
- 6 new voice lines (652 in total).

### Phase 21: stories that follow what you wrote
Feedback: "Pirates captured the dragon! Sir Pip must fight the captain." showed only the pirate, because the reader took the first character as the villain and only knew two captives. The reader now understands roles:
- **Who does what to whom:**
  - "X captured / kidnapped / took / stole / trapped / locked up / chased / cursed Y" makes X the villain and Y the captive;
  - "Y was captured by X" (the passive form) works too;
  - "Sir Pip must rescue / save / free / help / find Y" marks Y as the one to rescue.
- **Anyone can be the captive:** Marlo, Bramble, Pegg, Grumble, Clank, the princess or the King. They wait sadly on stage during the show and dance when they're freed. Titles follow the story (*"The Rescue of Marlo the Dragon"*), and the book says *"One day, the pirate captain captured Marlo the dragon."* The story cards gained these captives too.
- **More variety from your words:**
  - up to **two challenges** in the order you wrote them ("find the jewels and fight the robot");
  - **extra acts** for words that ask for them: treasure (find the jewels), a gift or flower, a high five, dancing or jumping, the dark (the lantern and fireflies);
  - **a friendship ending** when the story says they become friends or forgive each other: a bow together, and the villain dances too.
- The spelling corrector no longer "fixes" real verb forms (it had turned "cursed" into "curse", losing the captive).
- 35 new voice lines (687 in total): every villain capturing every possible captive, and every rescue title.

### Phase 22: the story picker and "Tonight's Show"
Typing invites stories the theatre can't stage, so the main way to make a story is now **choosing** it, where every combination is guaranteed to work (`storypicker.js`):
- **The picker** ("✎ Make your own story") is a big illustrated screen. The card pictures are drawn in the storybook's own style: characters from the storybook illustrations, settings from the painted backdrops. The steps are:
  1. **Conflict:** Rescue, Duel, Treasure Hunt, Outsmart, Befriend;
  2. **Who needs rescuing** (only for a rescue): the princess, the King, or any character except the villain;
  3. **Villain:** Marlo, Clank, Grumble, Captain Pegg, Bramble;
  4. **Setting:** any of the 7 stages, following the villain's home until you choose one;
  5. **Twist:** none, moon gravity, fragile strings, night mode.

  Also on the screen: **🎲 Surprise me**, **✎ Write it yourself** (the typed story reader, kept as an extra), and **Generate my story ✨**.
- **"Tonight's Show" preview:** a theatre board with marquee lights shows the title, a picture of the scene (Sir Pip, the villain, the captive in a cage or the treasure, with night if chosen), and three act cards:
  - *The Trouble* (what happened);
  - *The Adventure* (what Sir Pip must do, built from the real acts);
  - *The Finale* (how it ends).

  A summary row lists hero, villain, setting, conflict and twist. **← Edit my choices** goes back; **Start adventure ▶** raises the curtain.
- **In the headset:** the story-card board has the same tabs (Conflict, Rescue who?, Villain, Setting, Twist with Surprise me, and Stage it!). The same "Tonight's Show" poster then floats in front of the stage, with *Start adventure* and *Edit my choices* to poke, while the narrator announces the title.
- All 25 conflict × villain combinations were checked to build a playable show of 3 to 5 acts.

### Phase 23: a believable robot, a clean screen, the theatre menu and the dragon ride
- **The robot puppeteer, redesigned** (from a reference sketch, then refined after feedback that a first pass looked fake):
  - **Face:** a band of dark, glossy glass across the eyes, like a real robot's sensor visor. The eyes are camera-like lenses behind it, each a lit iris ring around a bright pupil, in one soft cyan-white (a first try with mismatched blue and gold eyes read as broken). They blink with a shutter and flash gold when the guest remembers something.
  - **Mouth:** a slim speaker grille (a rounded slot with slats) whose light pulses with his voice. It replaced a drawn-on glowing smile.
  - **Head:** a smooth porcelain dome, slightly wider than tall, with small ear sensors.
  - **Body:**
    - a black ribbed neck, and a slim brass collar band with flush rivets;
    - a panel seam down the chest, and two brass rivets;
    - a **clock in his chest** behind a glass cover; its hands keep the real time;
    - a black accordion waist and a brass belt plate.
  - **Joints and hands:** brushed-metal elbow joints, and rounded, jointed fingers with metal knuckles instead of blocks.
  - **Materials:** ivory porcelain with clearcoat, polished brass, black rubber.
- **Atmosphere:** a soft blue glow behind the robot, motes of blue-white and gold light drifting up around him (one draw call), and a stronger cool rim light on the cast.
- **A clean screen while playing:** only ☰ Menu, Talk and Enter VR/AR stay in the toolbar. The status panel, the event log and the controls panel are hidden. Everything else is in ☰ Menu under "More": story map, playbills, fun modes, record and replay, share link, voice on or off, demo, controls, developer info, reset.
- **The story picker, restyled** (following a reference mock-up):
  - gold-trimmed panels with corner ornaments, and a glowing gold-edged "Generate my story" button;
  - the **conflict** cards have hand-drawn vector icons in gold: a cage, crossed swords, a treasure chest, a riddle stone, a flower. The first version drew emoji onto a canvas, and some browsers left those cards blank;
  - the **twists** are selectable pill buttons with small icons;
  - every **setting** card is illustrated with its landmark: glowing green crystals in the cave, a ship under sail, a clock tower, a moonlit pine forest with fireflies, a stone arch bridge, a castle with purple turrets, a crescent moon over clouds;
  - character cards have a soft vignette, and the layout fits one screen (conflict, who, villain on top; a wide setting row and the twists below).
- **Robot fixes:** the eyes now sit just proud of the visor glass with a gentler angle (one eye's edge was dipping behind the glass and looked cut off). A leftover face-plate shell that poked through as thin "hair-like" slivers is gone. Floating motes of light are now soft round specks instead of squares.
- **The robot's face, final version (a screen face):** the visor band was replaced by a large rounded **black glass screen** set into a thick white rim with a fine seam. All three are oval patches projected onto the curve of the head, so the corners are smooth, not cut from a sphere. On the screen:
  - **two tall glowing oval eyes** (pale cyan-white with a cyan edge) that blink, and turn gold for a moment when the guest remembers something;
  - **a sound-wave mouth:** 19 bars, tallest in the middle and tapering to dots, that rise and ripple with his voice and settle into a calm dotted line when he's quiet (one instanced mesh, one draw call).
  - **Head:** ear pods with cyan light rings, and a small cyan light on the brow.
- **The screen face, rebuilt to better proportions** (compared against a style reference several times):
  - a **wide helmet** (wider than tall);
  - a **large rounded-square black glass screen**, about two thirds of the head's width, recessed inside a **thick, smooth, raised white frame**. The frame is swept round a squircle with a soft rounded cross-section and bent onto a gentle curve; its back wall runs deep so it meets the shell from every angle. An earlier extruded version showed facets;
  - **big tall glowing oval eyes** with a soft layered glow;
  - a **wide cyan sound-wave mouth** of 21 rounded bars that ripple with his voice and rest as a row of dots;
  - **tall rounded ear pods** with a vertical cyan light strip on the front edge, and a short cyan light on the shell above the frame.
  - **Fixed:** when the robot looked down, thin white lines showed along the frame, because its back wall was a one-sided surface and steep angles saw through it. The frame now renders from both sides, and it curves back closer to the helmet. Checked from the front, above, both upper corners, the side and below.
- **The start menu, as a little theatre:**
  - a gold-trimmed proscenium with velvet curtains, marquee bulbs that twinkle along the top, and footlights along the bottom;
  - the title in a glowing gold script (the Playball font, open licence);
  - a little wooden marionette swinging from its bar, arms and legs dangling (an original drawing, animated in CSS);
  - a big gold **Begin the Story** button, an outlined **Play Any Chapter · All Unlocked**, and two glowing buttons, violet **Make Your Own Story** and blue **Free Play**;
  - an options panel where each option acts out its hand gesture in an animated icon: **Pinch Lock** (a thumb and finger pinching together, with a spark), **One Hand** (an open hand waving) and **VR Ready** (a headset that blinks). Pinch Lock and One Hand light up when switched on.
  - The same menu opens mid-game, with "Back to the show" and the extras. All the artwork is drawn in code, with nothing downloaded, and motion is turned off for players who prefer reduced motion.
- **The robot's neck:** a black rod now runs from the ribbed neck up into the helmet, with a dark mounting ring, closing the gap between neck and head.
- **The start menu, rebuilt to match the developer's mock-up:**
  - a thick, glowing gold proscenium with marquee bulbs set into its top and bottom border;
  - an ornate gold crest with the comedy and tragedy masks above the centre;
  - draped red velvet curtains tied back with gold tassels;
  - a caped wooden mannequin marionette dancing below its cross bar;
  - the script title with a flourish and a sparkle;
  - a **full-width gold Continue bar** with ▶, the chapter name, a chevron, and a picture of that chapter's stage fading in on the right;
  - "Play Any Chapter" and "+ Start a New Story" side by side, the violet and blue glowing buttons, the gesture-icon options, and a wooden apron beneath.

  It's designed at a fixed size and scaled to fit any window. All the artwork is drawn in code.
- **Riding the dragon:** Sir Pip used to hang from his strings in his standing pose while Marlo flew under him, so his legs went straight through the dragon. He now takes a **seated riding pose** while flying: leaning forward, thighs forward and apart to straddle Marlo's back, shins down the dragon's sides, hands reaching forward to hold on, legs swinging a little. He still rides wherever your bar puts him, the dragon's wingbeats lift them both, and he's back on his strings when they land.

### Phase 24: submission readiness (checked against the official rules)
- **No brand names in the experience:** the three visible mentions of the headset's brand ("Works with Quest hand tracking" on the menu, "On Quest: …" in the controls panel, and the credits line) now say "hand tracking", "In the headset" and "for VR".
- **Spatial anchoring in passthrough:** when you set the stage down on a real surface, it's anchored to that spot with WebXR anchors (created from the hit-test result). Every frame the stage follows the anchor, so as the headset refines its map of the room the theatre stays on your desk instead of drifting. If tracking of the anchor is briefly lost, the stage holds still; where anchors aren't supported, it simply stays where it was set. Re-centring (both hands pinched for 1.5 s) in passthrough now lets you place the stage again on a surface, with a fresh anchor; the anchor is released when the session ends. Tested with stand-in anchors: placement, following a 2 cm correction, holding still while lost, and no support at all.

### Phase 25: the way into the headset, and two quality fixes
A review of the build found that the start menu hid the way into the headset, and that the picture could get stuck at its worst setting.
- **Headset buttons on the start menu:** where the browser offers a headset, the menu now leads with two large buttons, **Play in VR** and **Play on Your Real Desk** (mixed reality). One pinch goes straight in and the story starts by itself. Before, the only way in was two small buttons in the corner, which the menu covered so they couldn't be pressed until it was closed; "Begin the Story" played on the flat screen. That gold bar now says "on this screen" when a headset is present.
- **`?quality=high` now stays put:** "high" is tier 0, and the check for a pinned tier treated 0 as "not pinned", so the game still stepped down.
- **Adaptive quality no longer slides to the blurriest tier for nothing:** if a step down doesn't make frames at least 8% faster, something else is setting the pace (a 30 Hz display, a battery saver, a background tab). The game goes back to the better tier and stops stepping.
- **Tested:** both buttons in the IWER emulator (a VR session with the cord opening; a passthrough session); `tools/headless-tests/t57.mjs` forces every frame to arrive 33 ms apart and checks the game steps down once, steps back and stays, and that `?quality=high` never moves. Not tested on a real headset.

### Phase 26: new art for the stages and the storybook, and things that move
The storybook pictures and several stage backdrops (the crystal cave most of all) looked crude next to the menu. All of it was redrawn in code.
- **Backdrops (`backdrops.js`):** all seven scenes repainted with depth, light and texture: the castle with round towers, a gate and banners; a moonlit forest with beams of light; the sea with the sun's glitter; mountains and the far-off clockwork tower; a stone hall with storm windows, brass pipes and dials; the dragon's cave with great crystal clusters, a glowing pool and a hoard of gold; the night sky with the northern lights. Each is painted in layers (far sky, drifting clouds or mist, foreground) at 1536 x 564.
- **Things that move on stage (`sets.js`):** clouds and mist drift between the layers; stars twinkle; the courtyard flags fly; three rows of theatre waves roll behind the ship's rail; rain streams down the tower windows and lightning flashes (the wall lights up with it); two pairs of brass gears turn on the tower wall; a shooting star crosses the night sky now and then; in the cave the crystals pulse, glints wink on the gold and motes of light drift up.
- **The crystal cave in 3D:** six-sided crystal shards in seven clusters of four colours, each with a soft halo, plus faceted rocks, stalactites, and the dragon's chest with a heap of coins. The troll's bridge has real stonework.
- **Storybook (`storybook.js`, `figures.js`):** every character redrawn as a picture-book figure (shading, faces, costumes, props); pages of textured paper with a gilt frame, a ribbon for the chapter's name, a heading flourish and an illuminated first letter that the text flows round (it used to overlap the words); larger text. Illustrations are now cropped to fit, never squashed (they used to be squeezed to less than half their width). The story cards and the poster use the same art, so the crude landmark overlays were removed.
- **Story:** two pages now plant Clank's loneliness before the ending reveals it (the prologue: "who had never once been invited to listen"; the tower: "No one ever came to visit. Clank had made quite sure of that."). Both were recorded with the narrator's voice; the two old clips were removed.
- **Cost:** about 5 to 14 more draw calls per frame depending on the set; a set's textures are built the first time it is shown.
- **Tested:** `tools/headless-tests/t58.mjs` (every set and chapter loads with no errors, the cage and flight hooks still work, the drift layer moves); `shots.mjs` and `cards.mjs` capture every set, every storybook page and every card for checking by eye. Not tested on a real headset.

### Phase 27: the play view, the menu backdrop, the headset boards and a livelier robot
- **Play view:** the desktop camera sits closer, so the puppets (not the room) fill the picture; a soft vignette rests the eye on the stage; the "Tonight" card moved to the top right, clear of the robot's face and the puppets.
- **The room:** damask wallpaper in deep plum and gold replaces the big flower stamps; the two line sketches on the wall became gilt-framed paintings of the castle and the sea (the same painted scenes the story visits); every book on the shelf has gilt bands and a title label.
- **Start menu:** two warm spotlights sway slowly behind the theatre, and the room shows through more.
- **Headset boards:** the menu and speech bubbles are now red velvet with a gold rim and cream lettering, matching the theatre.
- **Robot, detail:** a glossier shell; a ring of light round the chest clock; brass trim lines, vents with a light in each, side seams and a maker's plate on the chest; brass bands and a strip of light on the arms; brass caps on shoulders and elbows; a brass band over the helmet, dials on the ear pods, and an antenna with a lit tip.
- **Robot, life:** the body sways a little; the head nods on each phrase while he speaks and tilts curiously now and then; the eyes glance about, double-blink, widen when he remembers something and squint into happy arcs when a show ends or a playbill is won (with a bob of the head); the antenna is a small spring that lags behind his head and quivers with his voice; all his lights beat with his speech.
- **Tested:** `tools/headless-tests/views.mjs` captures the menu, the play view, the robot from three angles and the headset view in the emulator; `t57` and `t58` still pass. Not tested on a real headset.

### Phase 28: a new start menu, "a night at the theatre"
The old menu was a gold-framed card over a dimmed view of the room. The new one (`public/menu.css`, and the template in `renderStartMenu`) fills the screen with a theatre.
- **The scene:** the painted night sky from chapter seven as the backdrop; full-height velvet curtains that part when the page opens (and sweep off when you start); a swagged valance with gold fringe and the two masks; a wooden stage floor with a row of footlights; dust drifting up through two swaying spotlights.
- **The title hangs on strings:** each letter of "Strings" drops in on its own string from a marionette's control bar and then sways on its own beat. Sir Pip and Marlo (the storybook figures) are lowered in on strings at the wings.
- **The ways to play:** a gold marquee for Begin (or Continue, with the chapter's name and picture) with a sheen that sweeps across it; three playbill cards pinned at slight angles, each with a painted picture (Play Any Chapter, Make Your Own Story, Free Play), which lift and straighten under the pointer; the Pinch Lock and One Hand options as chips with their animated hand icons. In a headset the two "Play in VR" and "Play on Your Real Desk" buttons come first.
- **Fit:** the middle is designed 1180 wide and scaled to sit between the valance and the footlights at any window size (it used to slide off-centre when the window was smaller than the design).
- **Tested:** `tools/headless-tests/menu.mjs` captures the menu at 1440 x 900, 800 x 600, 1024 x 640 with the headset buttons, mid-entrance and mid-game, and checks every button can be clicked; `t57` and `t58` still pass.

### Phase 29: the demo video, made by script
The demo video (2 min 10 s, 1080p) is built by scripts in `tools/video/`, so it can be re-cut or re-recorded after any change.
- **Takes (`shots.mjs`):** each take opens the game in the headset emulator, enters VR from the new menu, and drives the two emulated hands like a puppeteer (reach, pinch, walk with a rocking wrist, bow, jump, wave) while the tab is recorded with the game's own sound. The emulated head is placed and eased like a camera. Takes: the menu, the cord and curtain, chapter one with Marlo, the storybook, one for each of chapters two to seven, Marlo's free flight onto the palm, and story cards with free play.
- **Voice-over (`vo.py`):** fifteen lines in the narrator's Kokoro voice.
- **Edit (`edit.mjs`, `timeline.json`):** a page plays the takes back in order with cuts, chapter labels, the voice-over and two CC0 music tracks that dip under the voice; that page is recorded to MP4 (H.264 and AAC). Nothing plays out loud while recording: the sound is taken from the audio graph.
- **Checks:** `frames.swift` pulls frames after every cut (all nineteen segments start on time); the sound has no clipped samples and no silent gaps after the opening second.
- **Limits:** the footage is from the emulator, not a real headset (the rules allow an emulator; a note on screen says so). The music was left out of the takes and laid in the edit.

### Phase 30: the storybook in the headset, and more stories in the video
The video showed the headset's storybook cut across by the top of the stage, with a glowing shape on the picture.
- **Where the book sits:** it was low enough for the proscenium's top beam to cut across its bottom edge and its Skip seal, and close enough to Sir Pip's glowing control bar for the bar to poke through the page (the "glowing shape"). It now floats higher (above the beam), is a little smaller, and Sir Pip's bar stays dark while the book is open. A soft shadow behind it lifts it off the stage, it swells into view when it opens, and it's drawn after the stage's glows.
- **The forest picture:** the moon was hidden behind trees, the moonbeams were hard-edged wedges and the boughs ended in black stubs. A gap in the trees now holds a full moon, the beams are soft, and each bough ends in a spray of leaves.
- **Video:** the storybook take was re-recorded, and a new take turns the book through six other chapters' stories (pirate ship, troll bridge, clockwork tower, dragon's cave, night sky, castle courtyard) under a new line, "and every chapter has a story of its own." The video is now 2 min 20 s.
- **Tested:** `tools/video/bookcheck.mjs` captures the book from a seated player's head position and from the video's camera; `t58` passes.

### Phase 31: a pop-up storybook in the headset
In the headset the storybook's picture now rises off the page like a pop-up book.
- **Layers:** the page keeps only the far sky. In front of it, on its own sheet 1.6 cm off the page, stands the scene (castle, trees, tower wall, cave). Each character is a paper cut-out with a cream edge, 3.4 cm off the page (and a little more for each extra character), so they stand clear of the scene behind them.
- **The pop:** when a page is shown, the scene lifts first; then each cut-out swings up from flat on a little spring, one after another, with a soft shadow on the page behind it and a tiny chime. Afterwards the cut-outs sway slightly, like card on a tab. When the page turns they fold away and the next page's pop up.
- **How:** `backdrops.js` gained `paintLayer` (the sky, the scene or both, cropped like the flat picture); `storybook.js` builds the pop-up sheets (`_buildPop`) and animates them (`_updatePop`). The desktop book is unchanged (flat).
- **While the book is open** in the headset, the hint arrows are hidden as well as Sir Pip's bar.
- **Video:** both storybook takes were re-recorded with the camera drifting slowly sideways, so the depth shows; chapter labels in the edit now wait for their picture to fade in. The video is 2 min 21 s.
- **Tested:** `tools/video/popcheck.mjs` captures ten pages (prologue to epilogue) and the middle of a pop; `t57` and `t58` pass.

### Phase 32: the red bar across the stage in the headset
- **Problem:** the main curtain's velvet pelmet (a red bar with a gold trim along the top of the proscenium) stayed fixed across the front when the curtain opened. A seated player's eyes are about level with it, so in the headset it cut straight across the backdrop and the puppets' strings.
- **Fix:** the pelmet is now two halves, one on each curtain panel (`stage.js`), so it gathers to the sides with the curtain. Closed, it still runs edge to edge; open, only short swags remain above the tied-back curtains.
- **Tested:** `tools/video/pelmetcheck.mjs` (seated and low headset views, open and closed); `t57` and `t58` pass.
- **Video:** every take except the menu was re-recorded with the fix, and the cut re-run (`timeline.json`: only the troll-bridge in-point moved, to follow its new take). Still 2 min 21 s, no late cuts, peak 0.77. The curtain is still seen closed below the storybook while it reads, as in the game.

### Phase 33: real velvet drapery
- **Problem:** the curtain looked fake: a flat red sheet with perfectly regular ripples, a box for a pelmet, and an opening that squashed the sheet sideways like a stretched picture. In the headset it was worse: the velvet's sheen is a physical material, which is swapped for a plain one there, so it became flat plastic red.
- **New `drapes.js`:**
  - **Velvet** is now a standard material with a small shader patch (a coloured sheen at grazing angles, deep colour face-on), so it looks the same in the headset. A drawn crushed-pile texture and normal map give it nap; the depth of every fold is baked into vertex colours, so the folds read without shadows.
  - **The main curtain** is two panels of irregular folds (each fold its own width, depth and lean). Opening really gathers them: the folds deepen as they bunch, the hem trails the heading and swings back, and a closed curtain breathes slightly. A woven gold braid runs along the hem.
  - **The pelmet** is swagged: drooping scallops with curved folds, gold bullion fringe, and tassels at each join. It gathers with the panels (Phase 32), behind fixed swags over the side curtains.
  - **The side curtains** are tied back properly: the fabric fans in to the tie, blouses out below it and spreads at the floor; a twisted gold rope and a tassel hold it.
- **Cost:** about 8,000 vertices, updated only while the curtain moves (and every other frame for the closed curtain's sway).
- **Tested:** `tools/video/curtaincheck.mjs` (closed, half open, open; seated, close and side headset views; desktop); `t57` and `t58` pass.

### Phase 34: the video tells the story
- **Problem:** the video's script was a feature list ("Catch fireflies. Duel a pirate. Answer a riddle."). It never said why Sir Pip travels, and left out the heart of the game: a lonely villain, and an ending won by a bow rather than a fight.
- **New script** (`tools/video/vo.py`, 20 lines): the video is the game's own bedtime story. The pop-up prologue sets up the stolen music box; the curtain and Sir Pip show that you are the puppeteer; the robot and a shy Marlo show the cast's minds; each stage arrives as a step of the journey with its reason; the finale turns on kindness (Sir Pip bows to Clank, then is knighted, in the game's own voices); the epilogue page and Marlo landing on your palm pay it off.
- **New takes** (`shots.mjs`): `prologue` and `epilogue` (pop-up pages held for their lines) and `finale` (the sky chapter's kindness and knighting acts, the bow timed to land on "is bow"). All gameplay takes were re-recorded with the new curtain.
- **Result:** 2 min 44 s (`timeline.json`, 23 segments), no late cuts, peak 0.76. Saved over `demo-video/strings-demo.mp4`; the script with timings is in `demo-video/README.md`.
- **Then:** the on-screen "Recorded in the headset emulator" note was removed, and a `map` take added before the forest: the story map opens with chapter one done, a finger pokes the Whispering Forest, and Sir Pip's token walks the road to it, under "Sir Pip must cross the whole kingdom". The video is now 2 min 46 s.

### Phase 35: the video shows what it claims
- **Problem:** the script told the viewer what was special (real physics, a cast with minds, endings) without showing it, the hook came late, and the accessibility story was squeezed into the last line.
- **New takes** (`shots.mjs`): `stumble` (the bar and strings up close; dropped, Sir Pip falls and Marlo saves the scene with a double pratfall), `shyrush` (rushed, Marlo hides with "Too fast!"; approached gently, "Friends!"), `talk` (a finger pokes "Let's dance!"; Marlo answers in his voice and dances), `playbill` (the slapstick ending, the playbill with a critic's verdict, Marlo's Backstage Notes), a tighter `prologue`, and `artest` (the emulator's passthrough is a black void, so mixed reality is named, not shown).
- **New script** (`vo.py`): a cold open on Marlo landing in a palm; then the story, with every claim shown as it is made; a mid-video line on seated, hands-only, one-hand play; the end names VR and the real desk.
- **Result:** 2 min 54 s (`timeline.json`, 29 segments), no late cuts, no overlapping lines, peak 0.75. The script with timings is in `demo-video/README.md`.

### Phase 36: Twig, the wooden boy, and the Toymaker's Workshop
- **Real wood** (`wood.js`): `woodMat()` uses the CC0 walnut veneer photo already in the project as a grey grain layer, tinted to any wood (honey pine, walnut stain, oak) or to paint over wood, where the grain still shows faintly. A small shader patch keeps it a standard material, so it looks the same in the headset. `grainUV()` and `boxGrain()` lay every part's UVs so the grain runs along its length at real-world scale, as a carver's would. `endGrainTexture()` draws a log end: wobbly growth rings, bark, drying cracks.
- **Twig** (`twigSkin`): a jointed pine marionette on the usual rig. He has dowel limbs with walnut ball joints and pegs, a carved barrel torso, a green waistcoat, an ochre pair of shorts and a scalloped collar (all painted wood). He also has mitten hands, varnished clogs with turned-up toes, carved hair and a sugarloaf cap with a bead. His face is painted: enamel eyes, blue irises, rosy cheeks and a red smile. His nose is a whittled dowel that grows with a springy "boing" whenever he fibs, and sprouts a leafy twig when it gets long. Every line he says that isn't true (`TWIG_FIBS`) grows it, and owning up (`TWIG_TRUTHS`) springs it back. His voice is Kokoro `bf_emma` (48 lines).
- **The workshop set**: the painted backdrop is a plank wall with grain and knots, two night windows, a shelf of toys and unfinished puppet heads, a tool board, clocks and a cuckoo clock. The 3D pieces are all real-grain wood: a workbench with a half-carved head, mallet, chisels, paint pot and shavings; a grandfather clock with a swinging pendulum; a stack of logs; a toy chest; and a swaying oil lamp with dust in its light. Cosy evening light.
- **The tale** (between chapters two and three, unnumbered): Twig boasts; true or a fib? His nose gives him away: walk Sir Pip onto the True or Fib log slice (`fib` task). Caught on his biggest boast, he confesses he can't dance, so you teach him: he copies each new move you show him (`mirror` task). Then you bow together. It has its own endings, playbill and critics.
- **Fix after the developer's test:** standing on True or Fib did nothing, or took ages. An answer only counted once Twig *and* the narrator had stopped talking, and Sir Pip had to step off and back on again. Now an answer counts half a second after Sir Pip stands on a slice, as soon as Twig has said his line. The area is bigger, there's a wooden knock as he steps on, and the ring brightens as it counts. Only the slice you chose last round needs a step off.

### Phase 37: Noodle, the sock puppet, worked from under the stage
- **The staging:** a hand puppet has no strings. The robot puppeteer stays standing behind the stage, face in view, and reaches down behind the backdrop and under the boards. His forearm comes up through a trapdoor inside the sock (porcelain, with one of his light rings showing below the cuff). Everything of a sock below the stage floor is clipped away by one plane (`floorPlane`, kept on the stage as it moves), so the socks really rise out of holes, in the headset and on a real desk. His mouth moves when Noodle talks: he's no ventriloquist. While he works a sock he sinks down behind the stage (0.32 m on desktop, 0.25 m in the headset), so his head and neck show above the backdrop and his shoulders sit at its top edge, the way a puppeteer works a hand puppet from behind a booth. He stands up again when the scene ends. (A first version had him duck right under the stage with his head up through a trapdoor; the developer wanted him behind the stage, a little lower.)
- **`handpuppet.js`:** `SockPuppet` is a knitted tube (drawn V-stitch knit, heathered, striped at the cuff) that bends at the wrist. It has an upper jaw (his fingers) and a lower jaw (his thumb) that chatter in time with the voice, googly eyes whose pupils sag and slosh as it moves, a fuzzy pompom nose, and a mop of 96 curly yarn strands that bounce. It pops up with a spring, ducks, stretches tall (showing the robot's porcelain arm and light ring under the sock), wiggles, bows and turns to look at Sir Pip. Noodle has rainbow yarn and a green nose; its twin Doodle has blue yarn and a pink nose. Voices: Kokoro `am_michael` (Noodle), `af_sarah` (Doodle).
- **The Harbour Laundry** (between chapters three and four, unnumbered): whitewashed houses, washing lines, the sea and a lighthouse. In 3D there's a washing line across the back, a washtub of suds with bubbles drifting up, and a wicker basket. Noodle has lost its twin in the wash. **Peekaboo** (`peekaboo` task): Noodle pops out of one of three trapdoors, never the one Sir Pip is by; walk over and boop it, three times. **Find the twin** (`matchsock` task): four socks hang on the line; walk Sir Pip under the one with Noodle's stripes. It drops off the line, and up through the floor comes Doodle on the robot's other hand. Then a bow, with its own endings.
- **Free play:** Noodle is a co-star (the robot goes under the stage; Noodle pops up somewhere new now and then). The harbour laundry is a stage, and talk bubbles work with it.

### Phase 38: the road, the curtain call, and your own stories
- **The road:** both tales are part of the journey, unlocked in turn: Courtyard (1), Forest (2), the Toymaker's Workshop, Ship (3), the Harbour Laundry, Bridge (4), Tower (5), Cave (6), Sky (7). The numbered chapters keep their numbers, recorded intros and pages exactly as before (`chapterNumber()` counts only numbered chapters). The tales show "along the way" on the map and "Along the Way" in the storybook. Sir Pip's token walks the road through them.
- **Curtain call:** Twig dances with the cast, and Noodle and Doodle pop up through the floor. They cheer for Sir Pip in turn: "Best show ever! And that's not a fib!" and "Hooray for Sir Pip! You're a perfect fit!" The cheers are now 1.85 s apart so all eight fit.
- **Make your own story:**
  - Twig and Noodle can be the villain. Twig can also be the one rescued.
  - The workshop and the laundry are settings, in written stories, the illustrated picker (nine settings now fit one row) and the headset cards.
  - `fitChallenge()` keeps every combination stageable. The fibs need Twig's nose. A sock puppet can't do a marionette's tricks, so it plays peekaboo, or hunts for its twin in the laundry.
  - Story words like "fibs", "peekaboo" and "twin" pick those games.
- **Voices:** 899 lines, all recorded.
- **Tests:** new `t59` (the workshop tale end to end, its place on the road, free play) and `t60` (the laundry tale end to end, the robot back up afterwards, the curtain call with Twig and both socks, a written sock-puppet story); `t57`, `t58` pass. Look-checks: `twiglook.mjs`, `socklook.mjs`, `pickerlook.mjs`.
- **Fix, stuck on "The curtain is rising":** with progress saved at the Harbour Laundry, the page never got past loading. The stage is set up for the saved place while the page loads, and putting the robot under the stage read the headset-mode variable (`xrMode`) before its declaration further down `main.js` (a TDZ error). It's now declared near the top. New `t61` reloads with progress saved at every stop on the road (and the theatre) and checks the menu appears.

### Phase 39: the story comes first
- **Problem (found by the developer):** at the start of a chapter, a player who kept moving Sir Pip held the story up. Every move got a spoken remark ("Sir Pip leaps!"), and the story waits for a gap in the narration before it gives the next goal, so the task didn't start until they stopped playing with him. The remarks also talked over tasks.
- **Fix:** `storyTalking()` in `main.js`, read by the narrator (`narrator.quietFor`). While a chapter opens, between acts, during the ending, for the first seconds of an act (while its goal is given) and while a task runs, Sir Pip's moves get no running commentary. The moves still count for the show, the guest's mind and the crowd. A tumble in those moments isn't "saved" with a speech either. Free play, and simple acts once their goal is given, keep the commentary.
- **Tested:** new `t62` keeps Sir Pip moving (a jump, walk, bow, spin, fall or wave every 0.8 s) from the moment the Courtyard, the Forest and the Workshop open. The first goal is given promptly and no remark talks over the story. (On the old code the same test fails: a remark interrupts a task, and the goals come later.) `t57` and `t59` pass.

### Phase 40: on desktop, the bar stays in your hand
- **Problem (found by the developer):** now and then the on-screen hand (the mouse) and Sir Pip's glowing bar ended up apart, and stayed apart. On desktop a click anywhere grabs the bar, and the bar then moved by however much the mouse moved, keeping whatever gap there was. A gap could come from clicking away from the bar, from pushing the bar against its height limit, or from the story moving Sir Pip itself (the tower's searchlight sending him back to the start).
- **Fix (`handleHands`):** while you hold a bar on desktop, it settles at its place under the hand (`DESK_HOLD`, the relation they start out in) within about half a second, so any gap closes by itself. When the story moves Sir Pip (`movePipTo(x, z, regrab)` from a task), the desktop hand lets go. He stays where the story put him, and the hand picks him up again once it reaches his bar (`deskNeedsNear`). Otherwise the bar would just glide back to the mouse and undo the searchlight's penalty. Headset hands are unchanged.
- **Tested:** new `t63` (real mouse input): grab far from the bar, drag about, dip to the height limit and back, and the story moving him. The gap is zero each time, and he's picked up again with no gap. (The old code fails it.) Tests that place Sir Pip while holding him use a new debug `placePip()`, which moves the hand too. `t57`, `t59`, `t60` and `t62` pass.

### Phase 41: a map you can read at a glance
- **Problem (found by the developer):** with two new tales the story map was crowded. Labels overlapped (the Workshop's and the Laundry's), "along the way" was hidden, the road zigzagged back and forth across the kingdom, and trees and peaks crowded every stop.
- **New layout** (`storymap.js`, positions in `lines.js`): a storybook board-game trail. One smooth road (a centripetal Catmull-Rom curve through the stops, in story order):
  - from the Castle in the south-west, through the Forest;
  - past the Workshop to the Pirate Ship moored in a bay, then the Harbour Laundry;
  - up the river to the Troll Bridge;
  - back west past the Clockwork Tower to the Dragon's Cave below the peaks;
  - up to the Night Sky in a starry corner.
- **Each place has its own country:** a forest round the forest, the sea and a pier for the ship, mountains round the cave, a crescent moon and stars round the night sky, a storm cloud over the tower, a village and windmill by the castle. A dotted footpath leads to the Grand Theatre.
- **Labels never overlap:**
  - Each name's box is worked out once (`_layoutLabels`), and all the scenery keeps clear of the road, the places and the names (`_clear`).
  - Chapters have red ribbons with a wax-seal number; the tales along the way have a cream signboard. Clicking a name works like clicking its picture.
- **The journey shows:** Sir Pip's footprints mark the road travelled so far. Choosing a place, the token walks *along the road* (through any stops in between) while the map leans in to follow.
- **Tested:** `tools/headless-tests/maplook.mjs` draws the map with some progress and fully open; it was checked in the game with the token walking from the Forest past the Workshop to the Ship. `t58` and `t61` pass.

---

## 4. What's in the game now

**Ways to play** (the start menu): Begin or Continue the story · Play Any Chapter · Make Your Own Story · Free Play · Pinch Lock · One Hand · Hands only. The same menu is on ☰ Menu or Esc at any time, and on the white Menu knob in the headset.

**The story** (the map's road, in order). Each stop has three pop-up storybook pages, then its acts:

| Stop | Guest | What you do |
|---|---|---|
| 1 · The Castle Courtyard | Marlo the dragon | approach shy Marlo gently, bow, high fives, jump together on his count, wave |
| 2 · The Whispering Forest | Old Bramble | light the lantern, catch shy fireflies, follow the owls' calls, copy his spell (the forest blooms) |
| 3 · The Toymaker's Workshop | Twig the wooden boy | true or fib? (his nose grows on fibs), teach him to dance (he copies your moves), bow together |
| 4 · The Pirate Ship | Captain Pegg | take the sword, duel (duck high, jump low, lunge), bow |
| 5 · The Harbour Laundry | Noodle the sock puppet (and Doodle) | peekaboo through trapdoors, find the twin on the washing line, bow |
| 6 · The Troll Bridge | Grumble | approach, answer his riddle on the stones, give him a flower |
| 7 · The Clockwork Tower | Clank, Princess Juniper | sneak past the searchlight, unlock her cage, jump his zaps |
| 8 · The Dragon's Cave | Marlo | light the lantern, find the three jewels, bow |
| 9 · The Night Sky | Marlo, Clank, the King | climb aboard, fly through rings, dodge gears, catch Clank, bow to him in kindness, be knighted. Then the curtain call (the whole cast, Twig and both socks), your applause frees Marlo onto your palm ("Unbound"), and the epilogue and credits |

After the story the **Grand Theatre** has a new short show every night (six scenes), with playbills, critics and a streak.

**The cast and their voices** (Kokoro, recorded ahead, `tts/build_voice.py`):

| Character | What they are | Voice |
|---|---|---|
| Narrator | the storyteller robot's voice | `af_heart` |
| Sir Pip | the knight you work (silent) | none |
| Marlo | a young dragon who breathes sparkles | `am_puck` |
| Old Bramble | a forgetful forest wizard | `bm_george` at 0.88 |
| Captain Pegg | a boisterous pirate | `am_fenrir` at 1.02 |
| Grumble | a grumpy bridge troll | `am_onyx` at 0.84 |
| Clank | a lonely clockwork robot | `am_echo` at 0.92 |
| Princess Juniper | the captive princess | `af_bella` |
| The King | knights Sir Pip | `bm_lewis` at 0.9 |
| Twig | a carved pine boy; his nose grows when he fibs | `bf_emma` at 1.06 |
| Noodle | a sock puppet with yarn hair and googly eyes | `am_michael` at 1.1 |
| Doodle | Noodle's twin sock | `af_sarah` at 1.08 |

**The 21 playable tasks** (`tasks.js`): `shy`, `highfive`, `together`, `owls`, `collect`, `simon`, `duel`, `riddle`, `sneak`, `unlock`, `dodge`, `mount`, `rings`, `gears`, `chase`, `kindness`, `knight`, `fib`, `mirror`, `peekaboo`, `matchsock`.

**Two kinds of puppet beyond marionettes:**
- **Twig** is carved wood: real grain from the walnut photo, tinted and laid along every part.
- **Noodle** is a hand puppet: no strings. The robot crouches behind the stage and reaches under it, and the sock rises through a trapdoor with his porcelain forearm inside.

**Other systems:**
- Verlet string physics for every marionette.
- The guest's offline mind: mood, trust, memory, initiative, and Backstage Notes.
- The co-star "saving the scene" when you fall or fail, and an audience that reacts.
- Talk bubbles to poke.
- Props: sword, lantern, flower, key.
- Record, replay and share a performance as a link.
- Moon gravity, fragile strings and party modes (unlocked with playbills).
- Passthrough on your real desk with an anchor, with the puppets able to step onto the desk.
- One-hand play and pinch lock.
- The story comes first: no running commentary while the story is talking.

---

## 5. Where things are

Everything runs from `public/` (a static site; three.js 0.170 through an import map). In `public/src/`:

| File | What it does |
|---|---|
| `main.js` | the orchestrator: scene, input, start menu, story flow, the task context, flight and riding, hand puppets, passthrough and anchors, free play, the story maker, the render loop |
| `puppet.js` | marionette physics (Verlet), the flight and seated poses |
| `skins.js` / `cast.js` | how each character looks (Sir Pip, Marlo; the guests); the control bars |
| `wood.js` | real-grain wood materials, grain-aligned UVs, log ends; Twig |
| `handpuppet.js` | sock puppets (Noodle, Doodle), trapdoor holes, the socks on the washing line |
| `robot.js` | the storyteller robot: screen face, sound-wave mouth, chest clock, two-bone arm IK |
| `director.js` | detecting your moves, and the AI performer's clips |
| `mind.js` | the guest's offline mind |
| `show.js` | acts, stars, endings, playbills and Backstage Notes |
| `tasks.js` | the 21 playable tasks |
| `lines.js` | every word: chapters, guests, tasks, the story road (`CHAPTERS` in order; `chapterNumber` is the place on it) |
| `narrator.js` | the narrator: coach lines first, commentary only when the story isn't talking |
| `storybook.js` / `figures.js` | the pop-up storybook, and the characters drawn for it |
| `storymap.js` | the parchment map, the road, the token |
| `storymaker.js` / `storypicker.js` | your own stories: written, picked, or from cards |
| `backdrops.js` / `sets.js` | the painted backdrops, and each stage's 3D pieces and what moves |
| `stage.js` / `drapes.js` | the theatre, its knobs and the cord; velvet drapery |
| `playground.js` | free play |
| `phrases.js` / `talk.js` | talk bubbles and the headset menu board; understanding what's said |
| `props.js` | the sword, lantern, flower and key |
| `hints.js` | hints with arrows and voice |
| `input.js` | headset hands and the desktop (mouse) hands |
| `audio.js` | sound effects and each stage's soundscape |
| `unbound.js` | Marlo breaking free onto your palm |
| `recorder.js` | record, replay and share |
| `fx.js` / `emote.js` | confetti, sparkles, halos, dust; the little pop-up emotes |
| `perf.js` / `batch.js` | merging static meshes; one skinned mesh per material for each puppet |
| `assets.js` / `demo.js` | CC0 textures and lighting; the self-playing demo |

Outside `public/`: `server.mjs` (the optional local server for a live language model), `tts/` (the voice builder), `tools/headless-tests/` (the tests), `tools/video/` (the demo video), `VOICE_SCRIPT.md` (lines for the developer to record), and `CLAUDE.md` (the handover).

---

## 6. How it was tested

**How:** Playwright drives the Chromium in `~/Library/Caches/ms-playwright/` against `npm start` on port 8095 (`node tools/headless-tests/tNN.mjs`). The game exposes a debug handle, `window.strings`, for the show, puppets, map, hands, tasks and so on. Tests play chapters end to end by moving the desktop hands (or `placePip`) and by sending the move detector events. The headless browser runs about five times slower than real time, so tests wait on game state rather than the clock. Every change was also looked at in screenshots, from several angles for 3D models. After each publish, the live site is loaded and checked for errors and missing files.

**The current regression set:**

| Test | What it proves |
|---|---|
| `t57` | a frame rate capped from outside doesn't slow the game or drop the quality |
| `t58` | every stage set loads; the sets' hooks work; layers animate; every chapter's scene change runs |
| `t59` | Twig's tale end to end (true or fib with the nose, teaching him to dance, the bow); its place on the road; free play with Twig |
| `t60` | Noodle's tale end to end (peekaboo, the twin, the bow); the robot crouches and stands back up; the curtain call with Twig and both socks; a written sock-puppet story |
| `t61` | reloading with progress saved at every stop (and the theatre) reaches the menu |
| `t62` | a player who never stops moving Sir Pip doesn't hold the story up, and no remark talks over it |
| `t63` | desktop: the held bar stays under the hand (a far click, a drag, the height limit, the story moving him) |

**Earlier tests:** `t1` to `t56` were written as each feature landed and are kept for reference. They cover the cord and curtain, props, every chapter's tasks, the map, the first visit, the finale and Unbound, flying, talk bubbles, the warm-up, free play, the headset menu and story cards, the story maker, the robot's face and the menus. `xr.mjs` and `xr2.mjs` cover headset grabbing and placing the stage on a desk. `live*.mjs` check the hosted site.

**Look-checks:** `twiglook.mjs` (Twig and the workshop, several angles, before and after a fib), `socklook.mjs` (Noodle, the robot, the laundry), `pickerlook.mjs` (the story picker), `maplook.mjs` (the map), `views.mjs`, `menu.mjs`, `cards.mjs`, and in `tools/video/`: `curtaincheck.mjs`, `pelmetcheck.mjs`, `bookcheck.mjs`, `popcheck.mjs`.

**Video tools** (`tools/video/`): `shots.mjs` records the takes in the headset emulator, `vo.py` the voice-over, `edit.mjs` assembles `timeline.json` into the MP4, and `frames.swift` pulls frames to check cuts.

---

## 7. Assets, voices and credits

- **Voices:** 899 lines, all recorded ahead in natural Kokoro voices (Apache-2.0), in `public/voice/` (about 24 MB) with `manifest.json`. The builder records only new lines and removes unused ones. The browser's own speech is never used. `VOICE_SCRIPT.md` lists Marlo's 49 lines and the curtain-call cheers (including Twig's and Noodle's) for the developer to record, so human takes can replace the generated ones.
- **Art:** drawn in code (canvas, SVG, three.js): every backdrop, set, character, storybook figure, the map and the menus. The wood grain comes from the CC0 Poly Haven veneer photo already in `public/assets/tex/`; the knit, felt and log-end textures are drawn.
- **Licensed files** (all in `CREDITS.md`): a Poly Haven HDRI and three wood textures (CC0), CC0 music and sound effects, the IWER emulator (MIT), three.js (MIT).

---

## 8. Publishing, and what's left

- **Publish** (GitHub Pages from a branch; only after the developer says "merge and publish"): fast-forward `main` and push; rebuild `gh-pages` with `git subtree split --prefix public`, force-push it, and trigger a build (`gh api -X POST repos/mazzyy/strings/pages/builds`). If a build reports a generic "Page build failed", trigger it again. Then load the live site and check it.
- **Left to do:**
  - test on a real headset (frame rate, pinching, the boards, the sock puppets and the robot crouching);
  - re-cut the demo video to show Twig, Noodle and the new map;
  - write the Devpost text and submit before 18 November, 12:00 PT;
  - optionally, record Marlo's lines and the curtain-call cheers (`VOICE_SCRIPT.md`).
- **After submitting:** tag the submitted commit, and don't publish again until the results.

### Phase 42: every chapter numbered, and real mountains on the map
- **Why the two tales had no number (the developer asked):** when they were added, the instruction was to keep the existing chapters exactly as recorded. Those chapters' intros say "Chapter three: The Pirate Ship" and so on, so the tales were left unnumbered to keep the spoken numbers matching the map.
- **Now:** every stop is a numbered chapter, 1 to 9: Courtyard, Forest, Toymaker's Workshop, Pirate Ship, Harbour Laundry, Troll Bridge, Clockwork Tower, Dragon's Cave, Night Sky.
  - `chapterNumber()` is the place on the road.
  - The storybook says "Chapter Three" for the Workshop; the start menu says "nine chapters" and "All nine are unlocked"; the map shows a wax seal on every chapter.
  - The seven intros whose number changed were re-recorded in the same narrator voice (`af_heart`), so the sound still matches. For example "Chapter four: The Pirate Ship." and "Chapter nine: The Night Sky. The final adventure."
- **Mountains:** they were flat triangles with a white tip. Now each peak is drawn like an engraved storybook map:
  - its own shape: a skewed summit, a notch on one slope, a shoulder on the other;
  - a sunlit west face shading darker to its foot, with gullies, and a shaded, hatched east face split by a jagged ridge;
  - a big ragged snowcap cut to the peak's shape, blue in shadow beyond the ridge; scree at the foot.
  - They stand in overlapping ranges: a hazy back row, then nearer rows on green foothills, round the Dragon's Cave and at the river's source. The rolling hills are now drawn first, so they never sit on a peak.
- **Tested:** `maplook.mjs` (whole map, and the ranges enlarged); `t59` (the Workshop is chapter three, the Ship four), `t60` (the road reads courtyard 1 … sky 9), `t61` and `t58` pass. All 899 voice lines are recorded.

### Phase 43: the demo video, re-cut for Twig, Noodle and your own stories
- **Why:** the video still showed seven chapters, the old free-play board and the story cards. Twig, Noodle, the curtain call with them, the story picker and the new map were missing.
- **Takes** (`tools/video/shots.mjs`), new or re-recorded:
  - `workshop`: a three-quarter close-up from Twig's right while he boasts "I'm made of solid gold. Under the paint." and his nose grows (the first boast is made to be a fib). Then the wide stage: Sir Pip waits (room for the voice-over), walks onto the Fib slice, and Twig says "Caught me! How did you know?"
  - `laundry`: the robot, crouched behind the stage, works Noodle up through the trapdoors; three boops; the twin on the washing line; Doodle pops up.
  - `finale`: now runs on through the curtain call, with the whole cast, Twig and both socks. When Twig's turn to cheer comes, the camera pushes in gently.
  - `picker`: the desktop picker at 1280 x 720 (rescue the King, Twig as the villain, the Toymaker's Workshop, night) and "Tonight's Show", with a drawn pointer. At that height the picker's sticky button row covers the last row of pills, so a click meant for "night" landed on "Generate". The target is now scrolled into the clear first.
  - `freeplay` (new): the free-play board's Stage tab (the Workshop), You play: Twig, Noodle as co-star, then Marlo.
  - Every take now marks when each character starts a line (the voice file it plays), so the edit can keep the voice-over off the characters' own lines.
- **Voice-over** (`vo.py`): new lines for the Workshop, the Laundry, your own story and play-as-anyone. Four lines were shortened to make room.
- **Edit** (`timeline.json`, 33 segments, laid out against the voice marks):
  - Twig's boast and "Caught me!", Noodle's "My twin! Doodle!", the King's "I name you Sir Pip the Brave" and Noodle's "You're a perfect fit!" are heard in the characters' own voices, with the music dipped under them.
  - `edit.mjs` now starts recording once every take is loaded, so the film opens after about 0.6 s of black instead of 1.4 s.
  - The closing line now ends before the fade-out. In the last cut it ran on into the fade, and its last words were faded out.
- **Result:** `demo-video/strings-demo.mp4`, 2 min 56 s (1080p, about 300 MB). No late cuts, no overlapping lines, audio peak 0.88. Frames were checked at every cut. The script with times and a new contact sheet are in `demo-video/README.md`.
- **Recording note:** the takes jump straight into chapters, so the opening warm-up (Sir Pip's first walk over to Marlo) was still running. When its timer ran out, it greeted in Marlo's voice under the guest's name: in the Laundry after Doodle pops up, and during the knighting. The cut avoids those moments. In normal play, the menu and the story road end the warm-up first.
- **Also on this branch, not yet published:**
  - the start-menu strings now end on each title letter's ink, and on Sir Pip's and Marlo's hands and heads (`menustrings.mjs`);
  - the end credits read "Created by Abdul Musawar Soomro", with Twig, Noodle and Doodle in the cast.


### Phase 44: test voices recorded with feeling (Qwen3-TTS) for Marlo, the princess and the socks
**Why:** the developer heard Qwen3-TTS read "Hello! Hello! Oh, I love visitors!" with the instruction "excited" and liked how much more feeling it carried than the Kokoro voices. As a test, Marlo the dragon was re-recorded first; the developer liked the emotion but heard a woman's voice, and asked for a male Marlo, and for Princess Juniper and the sock puppets Noodle and Doodle too. The Kokoro voices all stay as they are.

- **The model:** Qwen3-TTS-12Hz-1.7B-VoiceDesign (Apache-2.0, 4.5 GB, from the Qwen page on Hugging Face), run locally on the Mac's GPU (MPS) from its own Python environment outside the repo (`../qwen-tts/.venv`, with the `qwen-tts` package). About 3.5 seconds per line: all 100 lines in 7 minutes.
- **How each line is spoken:** VoiceDesign speaks from a written description, so each character has one description of their voice (`CAST` in `tts/build_qwen.py`), and every line adds its own feeling, written by hand for all 100 (`FEEL`): "thrilled and excited" for Marlo's hello, "frightened and desperate, calling for help" for the princess in the tower, "giggling helplessly" for Noodle being tickled, "singing happily" for Doodle. A fixed seed per line keeps takes repeatable, and one line can be re-recorded with another seed (`--redo "<line>" --seed N`).
- **Marlo's voice, male:** the first description ("a young boy's voice, bright, light and a little squeaky") came out sounding like a woman (median pitch about 460 Hz). Five descriptions were tried on the same lines; "light", "bright" and "boyish" all drifted high. The one kept: "Male, a cheerful young man with a medium-low, warm voice and a hint of gravel, like a lovable cartoon dragon sidekick" (calm lines 110 to 200 Hz). Words that push the pitch up ("squealing", "whooping") were taken out of his feelings. Noodle got the same "medium-low" wording. The princess is a sweet, clear soprano; Doodle a sing-song young woman's voice, as in the Kokoro casting.
- **Measured** (median pitch, Qwen against Kokoro): Marlo 297 Hz against 122 (calm lines 110 to 200, excited ones up to 450 or so: Kokoro barely moves, which is why it sounded flat); Noodle 356 against 113; the princess 532 against 205; Doodle 516 against 186. The takes run about 1.3 times as long as the Kokoro ones; a few with a long laugh or "Wheee!" run about three times as long.
- **The clips:** `public/voice-qwen/` (2.2 MB): silence trimmed, matched to the Kokoro clips' loudness, the same short breath at the end, 64 kbps MP3. `manifest.json` maps each Kokoro clip of these four characters to its Qwen take, with each line's speaker and feeling and each character's description.
- **In the game (the default, after the developer listened):** these four speak in their Qwen voices; `?voices=kokoro` in the address brings back their Kokoro voices. No one else's lines are in the map, so no one else changes, and a line with no Qwen take yet (new or changed words) plays its Kokoro clip. Everything is still pre-recorded, so it works on the hosted site with no server.
- **Comparing:** `voice-qwen/compare.html` lists all 100 lines by character, with both voices, each line's feeling and each character's description, and buttons to play all of either voice or each line both ways.
- **Tested:** by default Marlo's hello and the princess's "Help!" load from `voice-qwen/`; with `?voices=kokoro` from `voice/`; the story still starts (Begin, the curtain, the prologue book); no page errors.
- **To change a line of these four:** edit `lines.js`, run the Kokoro builder first (it names the clips), then `../qwen-tts/.venv/bin/python tts/build_qwen.py` (it records only new lines). If a voice drifts on some line, re-record that line with another seed; for fixed preset voices that keep the feelings, the CustomVoice model (two English male voices) is the next thing to try.
- **Not in the demo video:** the video was cut before this change, so Marlo and Noodle speak there in their Kokoro voices.

### Phase 45: Bramble's spell you can follow, Sir Pip back to the middle, and the goal and map in the headset
Four things the developer found while playing, on the desktop page and in the headset emulator.

- **Bramble's spell showed nothing.** The wizard did show his three moves, but at the very moment the act began, while the narrator was still reading the goal, and all three were over in about nine seconds; after that he only waited, and never showed them again. Now:
  - he waits until no one is talking (or 14 s at most) before he starts, and each move he shows rings a chime, with "1. Jump" over his head as before;
  - on the desktop, a card on the left (`#spellcard`) writes the spell out as he shows it, each move with its key (Space jump, W bow, A / D spin, Shift + mouse ↑ wave), then ticks off each move as you copy it, and ends on "The spell works!" (the story maker's spells use the same card);
  - if nothing is copied for 16 s, he says "Watch my spell carefully" and shows it again.
  Tested: the wait, the card at every step, the replay after 16 s, and a copied spell that wins.
- **Sir Pip couldn't be brought back to the middle with the mouse.** At the start of an act the story stands him near one side. Holding the mouse low (on the puppet rather than on his bar) brought the bar right down: his strings went slack, he folded up on the floor, and a heap on the floor barely moves sideways (the bar went to the middle, he stayed 10 cm off). On the desktop the held main bar now stops 7 cm below its rest height (not while flying): with the mouse held low he stays on his feet and walks wherever it goes (tested: from the far right to the middle, 1.5 cm off). Ducking (W) and every other move are unchanged. Also: a new click anywhere picks him up again after the story moved him (only a button already held has to reach his bar first), and the mouse is followed even when it leaves the canvas mid-drag.
- **No stars or goal in the headset.** The page's top card can't be shown in an immersive session, and the 3D stars above the stage are small. Between spoken lines, the caption strip below the front of the stage now shows tonight's stars (drawn, gold and empty) and the act's goal, with a gold edge to tell it from a line being spoken.
- **The map in the headset was low and hard to use.** It now floats higher and nearer (about 6 cm below eye height, beside the stage, turned to face you). A place can be chosen by a fingertip that touches the page, one that goes right through it between two frames, or a pinch over it (the old test wanted the fingertip within 2.6 cm of the page, which the emulator's hands, and real ones, rarely hit). While the map is open, pinches no longer pick up Sir Pip's bars first. Tested in the emulator: a poke through the page and a pinch both choose a place; a pinch 30 cm away doesn't.

### Phase 46: the stage placed in front of your real head, and a seated view in the emulator
- **The bug:** entering VR placed the stage on the very first frame, before the headset's pose had reached the camera, so it was placed from the desktop camera's old position: about 0.4 m off the floor and 45 cm in front of the room's origin, not of your head. In the emulator (headset at 1.6 m) the stage ended up 1.21 m below your eyes, looking 66° down at it; on a real headset it would sit at about knee height until you pinched both hands to move it. Now the stage waits three frames, until the head's pose is real, then sits where it was meant to: 58 cm below your eyes and 45 cm in front.
- **The emulator's view:** its headset starts at a standing height, so once the stage is placed it steps 25 cm back and 15 cm down, to where a seated player's eyes would be (43 cm above the stage floor, 70 cm back, about 22° down to the middle of the stage). Only with `?emulate`; a real headset is wherever the player's head is.
- **Tested in the emulator:** before, head 1.21 m above the stage at 66°; after, 0.43 m above and 0.70 m back at 22°, with the whole theatre, the robot and the caption in view.

### Phase 47: a VR game first, Clank sounds like a machine, his zaps at every height, the goal in view
- **VR by default.** Where a headset is there, the gold "Begin the Story · in VR" goes straight into VR (and so do Continue, Start a new story, Play Any Chapter, which opens the map in VR, and Free Play, which opens the playground in VR). The old "Play in VR" button is now "Play on this screen" (no headset: mouse and keyboard). Make Your Own Story stays on the page (its picker needs the screen). Without a headset nothing changes. Tested in the emulator: Begin enters VR and the curtain show starts; Play Any Chapter enters VR with the 3D map open; on a plain page Begin plays on the page.
- **Clank's voice.** His recorded lines (and only his) now go through a robot filter in the guest voice: a 62 Hz ring modulator for the buzz, a 6.5 ms comb for the metal, and a brighter top, mixed with the voice itself so the words stay clear. Tested: on for "Copy Clank. Beep.", off again for Marlo's next line.
- **Clank's zaps.** Twice the size, and each fired at one of three heights, at random (never the same three times running): along the floor (jump it), at Sir Pip's chest (step aside, 5 cm off its line), or at his head (duck it: tip forward or crouch). Each has its own colour, and a label over Sir Pip says which ("Jump!", "Step aside!", "Duck!"); a miss shows the matching hint. Tested: zaps at 0.016 m and 0.21 m, halo 3.6 cm.
- **The goal in VR.** A panel fixed at the top right of your view (about 36° right and 25° up, turned to face you, drawn over everything) shows tonight's title, the stars (gold when earned, outlined when not) and the act's goal, wherever you look. The caption strip below the stage is back to captions only.
- **The emulator's hands** reach further forward and back (the mouse wheel moves them; now as far as the stage's front edge), so the key in the tower can be reached. In a real headset your own hand reaches it.

### Phase 48: the King in Qwen, and the curtain call cheered all at once
- **The King** now speaks in Qwen3-TTS too: "Male, about 60, a warm, deep and stately baritone, kind and proud", with a feeling for each of his four lines (a gentle "Kneel, brave knight.", ceremonial "For courage, for kindness, and for very good manners.", a grand "I name you Sir Pip the Brave, Knight of the Music Box!", a joyful "Let the music play!").
- **The curtain call's cheers** were said one after another, 1.85 s apart, through the guest voice that waits its turn, which felt staged. Now the whole company cheers at once: each cheer plays on its own voice, from where that character stands on the stage, all of them starting within about two and a half seconds, with each line written over its speaker's head and "The whole company: Hooray for Sir Pip!" as the caption. Clank's cheer goes through his robot filter.
- **All eight cheers in Qwen:** Marlo, the princess and Noodle had theirs already; the wizard, the pirate, the troll, Clank and Twig got Qwen voices for their cheer only (`ONLY` in `tts/build_qwen.py`; the rest of their lines keep their Kokoro voices).
- **Tested:** the grand finale started directly; up to seven cheers sounding at the same moment (from 3.6 s to 7 s), all eight from `voice-qwen/`, no errors. 109 Qwen lines in all (2.4 MB).

### Phase 49: Bramble and Grumble in their own Qwen voices
- **Bramble** (all 40 lines): a voice unlike anyone else's in the cast: "a very old wizard of about 85: a thin, breathy, crackly voice, mysterious and twinkly, slow and wise, often with a soft chuckle". The lowest voice in the company (median pitch about 117 Hz), and slow (takes about 1.45 times as long as the Kokoro ones).
- **Grumble** (all 37 lines, riddles included): asked for high-pitched and loud: "a big grumpy troll with a surprisingly high-pitched, loud, shouty voice: brash, squawky and bossy" (median about 324 Hz, where his Kokoro voice was 87 Hz), and quick (0.78 times as long).
- Lines of theirs without a feeling of their own take the character's usual one (`DEFAULT_FEEL`: Bramble "warm, wise and gently amused", Grumble "grumpy, loud and bossy"). 184 Qwen lines in all (4.6 MB); every one mapped for the game. The voices page (`voice-qwen/cast.html`) shows both.

### Phase 50: brighter, warmer lighting, and the cast standing on the stage
The game looked too dark next to other headset games. What changed:
- **Exposure and colour:** the Khronos PBR Neutral tone mapping at exposure 1.0 (it was ACES at 0.85, which darkened the mid-tones and dulled the painted sets).
- **Lights:** the environment (the reading-room HDRI) from 0.4 to 0.6, the warm hemisphere fill from 0.25 to 0.45, the key spot from 5.5 to 6.5, the desk lamp from 0.9 to 1.4, and a new warm front light from the audience's side (0.75), like footlights, so faces are lit from the front and not only from the spot above.
- **Night chapters** (the forest, the tower, the sky) dim less (the spot to half, not a fifth) and get a stronger cool moonlight edge: still moody, now easy to read.
- **Desktop glow** only from real lights (bloom threshold 1.05 to 1.7, strength 0.4 to 0.3), so the brighter-lit white robot doesn't glow.
- **Shadows:** a soft contact shadow under every puppet's feet (Sir Pip, the guest, the princess, the King, the whole company), shrinking and fading as the feet leave the floor, so the cast stand on the stage instead of floating over it; cheap, so it's there in the headset too, where the real shadows are pared down. The key spot's shadows are a little lighter (shadow intensity 0.78), as they would be with the fill light reaching into them.
- Checked in pictures, before and after: the courtyard (day), the forest and the tower (night) on the desktop page, and the courtyard in the headset emulator.

### Phase 51: the storyteller's sparkles fit him in VR, and the whole company on display
- **The sparkles at the story's start** spiral around the robot's face while he says "let me tell you a story". Their spiral was a fixed size (up to 18 cm out), made for the desktop robot (drawn 1.6 times larger, with the camera moving in close); in the headset the robot is drawn at 1.0, so the spiral was far too wide for his head and scattered over the wall and the stage. The spiral and the motes are now sized to the robot (the same snug spiral in both; in the headset the farthest mote went from 0.38 m to 0.29 m from his head).
- **The showcase:** the whole company stands on the bookshelf behind the stage, like figures on display: Sir Pip, Marlo, the princess, the King and Twig on the middle shelf, Bramble, Captain Pegg, Grumble and Clank on the one above, each turned a little towards the stage. Each is a real puppet, posed by a moment of its own physics, then its bars and strings are taken away and all of them are merged into a few meshes: nothing to update per frame, a handful of draw calls (fine for the headset). Seen on the desktop page and in the headset emulator.
- **Each in their own pose** (set as a puppeteer would, by tipping the main bar and lifting, pushing and rolling the arm bar before they settle): Sir Pip's sword up in salute, Marlo cheering with both arms up, the princess's little curtsy, the King standing proud, Twig waving, Bramble's staff raised, Captain Pegg leaning into "en garde", Grumble hunched and grumpy, Clank with his arms out, zapper ready. The top shelf is a little smaller (Bramble's hat clears the shelf above) and both rows are centred clear of the bookcase's sides.
