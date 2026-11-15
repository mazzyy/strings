// Every line the built-in narrator can say. Kept import-free so the voice
// builder (tts/build_voice.py via tts/export_lines.mjs) can read it in Node and
// pre-record each one with a natural voice.
//
// The cast: Sir Pip, a small armoured knight (the player's marionette), and
// Marlo, a friendly dragon worked by the robot puppeteer, who also narrates.

// every guest Sir Pip can share the stage with (lines are recorded for each name)
export const GUEST_NAMES = ["Marlo", "Bramble", "Captain Pegg", "Grumble"];
export const placesFor = (name) => ["across the stage", `toward ${name}`, `away from ${name}`, "toward the audience", "upstage, toward the back"];
export const towardFor = (name) => [name, "the audience", "away"];

export const LINES = {
  walk: [
    "Sir Pip sets off {where}, armour clinking with every brave little step.",
    "Off marches Sir Pip, {where}, as if the stage were a whole kingdom.",
    "With a clank and a clatter, our knight strides {where}.",
    "Sir Pip walks {where}. Somewhere, a trumpet ought to be playing.",
  ],
  bow: [
    "Sir Pip bows low. Chivalry, it seems, is not dead.",
    "A deep and gallant bow, the kind reserved for kings and dragons.",
    "Our knight bows, and the footlights seem to bow back.",
  ],
  fall: [
    "Down goes Sir Pip, in a heap of elbows and good intentions.",
    "The knight topples! The floorboards were clearly in on it.",
    "Sir Pip falls flat. Armour is heavier than it looks.",
  ],
  jump: [
    "Sir Pip leaps! For one moment, gravity forgets its job.",
    "A jump. Our knight is either very happy, or very startled.",
    "Up springs Sir Pip, light as a feather in a breeze.",
  ],
  wave: [
    "Sir Pip waves. Hello, says the little steel glove, hello!",
    "A cheerful wave from our knight, bright as a lantern.",
    "Sir Pip raises a hand, as if hailing a ship only he can see.",
  ],
  turn: [
    "Sir Pip turns to face {toward}, suddenly very interested.",
    "A slow turn toward {toward}. Something has changed.",
  ],
  slump: [
    "Sir Pip goes limp. Asleep, or perhaps simply out of ideas.",
    "All at once our knight crumples, a puppet with nobody home.",
    "Sir Pip slumps. Even heroes need a rest.",
  ],
  rise: [
    "And Sir Pip is up again, as though nothing happened at all.",
    "Our knight rises, dusting off a knee that has never known dust.",
  ],
  approach: [
    "Sir Pip comes face to face with {who}. Neither one blinks.",
    "So close now. {who} can hear the knight's hinges creak.",
  ],
  idle: [
    "Sir Pip waits. The whole theatre holds its breath.",
    "A long, still moment. Is our knight thinking, or listening?",
  ],
};

export const REPLIES = {
  bow: "Marlo bows in return, never one to be out-mannered.",
  wave: "Marlo waves back with a happy little flap.",
  jump: "Marlo hops too. It's catching.",
  approach: "Marlo shuffles closer, curious.",
  retreat: "Marlo backs away, not quite sure about this.",
  help: "Marlo hurries over to help.",
  mirror: "Marlo copies every move, the cheeky thing.",
  dance: "Marlo breaks into a little dragon dance.",
  slump: "Marlo flops down too, in sympathy.",
  turn: "Marlo spins round to look.",
};

// guidance for the first few minutes, spoken instead of shown as text
export const COACH = {
  grab: "Pinch the glowing bar above the knight to pick him up.",
  grabDesk: "Click and hold the glowing bar above the knight to pick him up.",
  turn: "Twist your wrist to turn Sir Pip around.",
  jump: "Flick your hand up quickly, and Sir Pip will jump.",
  takeProp: "Pinch something from the edge of the stage, and hand it to the knight.",
  give: "Carry it close to Marlo, and let go.",
  talk: "You can talk to Marlo too. He's a very good listener.",
  welcome: "Welcome to our little theatre. Reach out, and pinch the glowing bar above the knight.",
  welcomeDesk: "Welcome to our little theatre. Click and hold the glowing bar above the knight.",
  placeAR: "Look down at your desk, and pinch to set the stage there.",
  placed: "Wonderful. Now reach out and pinch the glowing bar above our knight.",
  firstGrab: "There he is. Sir Pip, at your command. Carry the bar, and he will walk.",
  hintWalk: "Move your hand slowly across the stage, and Sir Pip will follow.",
  hintBow: "Tip your wrist forward, and Sir Pip will bow to the dragon.",
  hintWave: "Pinch the small bar with your other hand, and lift it to raise his arms.",
  hintLetGo: "If you open your hand, the strings go slack. Try it.",
  hintRecord: "You're a natural. Poke the red button on the stage to record your next scene.",
  hintRecordDesk: "You're a natural. Press R to record your next scene.",
  recordStart: "We're rolling. Perform!",
  recordEnd: "And... curtain. What a performance.",
  replay: "Here comes your shadow. Perform alongside it.",
  shared: "Someone has sent you a performance. Watch their shadow, then join in.",
  pullCord: "Welcome to our little theatre. Pinch the golden cord, and pull it down to raise the curtain.",
  pullCordDesk: "Welcome to our little theatre. Drag the golden cord down to raise the curtain.",
  copyIntro: "Marlo wants a turn. Copy what he does!",
  synced: "In perfect step with your shadow!",
  snap: "Snap! One of the strings has broken. Gently does it.",
  modeNormal: "Back to the classic show.",
  modeMoon: "Moon gravity. Everything floats.",
  modeFragile: "Fragile strings. Move gently, or they'll snap.",
  modeParty: "Party mode! The lights are dancing.",
  unlockMoon: "You've unlocked moon gravity! Press the gold button to try it.",
  unlockFragile: "New mode unlocked: fragile strings. Press the gold button.",
  unlockParty: "New mode unlocked: party mode! Press the gold button.",
};

// Marlo's own voice, for things he does on his own initiative
export const MARLO_SAYS = {
  copyMe: "Copy me!",
  yourTurn: "Your turn! Do what I do!",
  yay: "Yes! Just like that!",
  yay2: "Ha! Perfect!",
  aww: "Aww. Maybe next time.",
  careful: "Whoa! Careful with that sword!",
  forMe: "For me? Oh, thank you!",
  forMeAsk: "Is that for me?",
  forYou: "Here. For you!",
  fetching: "Ooh, wait right there!",
  hmph: "Hmph. Nobody plays with me.",
  cheerUp: "Oh! You came back!",
  yawn: "Yawn... just resting my eyes.",
  wake: "I'm awake! I'm awake!",
  giggle: "Ha ha! You fell again!",
  ohNo: "Oh no! Let me help!",
  overHere: "Over here! Over here!",
  likeThis: "Like this. Watch!",
  lookThere: "Look, over there, by the edge of the stage!",
};

// how the show ends depends on HOW you performed it
export const ENDINGS = {
  grace: {
    title: "The Grand Ceremony",
    line: "What grace! What manners! Marlo declares Sir Pip a knight of the royal stage.",
    clip: "grandbow",
    critics: ["A triumph of good manners. I wept into my programme.", "Elegant, noble, and very well bowed.", "The most dignified knight I have ever seen. And I've seen several."],
  },
  slapstick: {
    title: "The Slapstick Finale",
    line: "Well, that was a disaster. A glorious, wobbly, wonderful disaster. Marlo falls over too, just to be polite.",
    clip: "pratfall",
    critics: ["I laughed until my monocle fell out.", "Clumsy, chaotic, and absolutely delightful.", "Nobody has ever fallen over with such commitment."],
  },
  drama: {
    title: "The Tragic Encore",
    line: "Such drama! Such passion! Marlo is so moved that he faints clean away.",
    clip: "faint",
    critics: ["Bold. Baffling. Unforgettable.", "I have no idea what happened, and I loved every second.", "Wild, unpredictable theatre. Bring a helmet."],
  },
};

export const PROPS = { sword: "sword", lantern: "lantern", flower: "flower" };
export const PROP_LINES = {
  hold: ["Sir Pip takes the {prop}, and stands a little taller.", "The {prop} is in the knight's hand now. What will he do with it?"],
  give: ["Marlo accepts the {prop} with a happy little chirp.", "A gift! Marlo holds the {prop} like treasure."],
  drop: ["The {prop} clatters back to its place."],
};

// Tonight's Show: a short three-act scene per visit, a new one each day
export const SCENES = [
  {
    id: "meeting", title: "The Meeting",
    intro: "Tonight's show: The Meeting. A knight, a dragon, and a very small stage.",
    acts: [
      { goal: "Act one. Walk Sir Pip over to meet the dragon.", check: "approach", hint: "walk" },
      { goal: "Act two. Now bow to Marlo. Manners matter.", check: "bow", hint: "bow" },
      { goal: "Act three. Wave to the audience.", check: "wave", hint: "wave" },
    ],
  },
  {
    id: "danceoff", title: "The Dance-Off",
    intro: "Tonight's show: The Dance-Off. Marlo has challenged our knight.",
    acts: [
      { goal: "Act one. Show Marlo a jump!", check: "jump", hint: "jump" },
      { goal: "Act two. Spin around, with style.", check: "turn", hint: "turn" },
      { goal: "Act three. Finish with a bow to the dragon.", check: "bow", hint: "bow" },
    ],
  },
  {
    id: "gift", title: "The Gift",
    intro: "Tonight's show: The Gift. Today is Marlo's birthday, and nobody remembered.",
    acts: [
      { goal: "Act one. Hand Sir Pip the flower from the edge of the stage.", check: "hold:flower", hint: "takeFlower" },
      { goal: "Act two. Carry the flower to Marlo, and give it to him.", check: "give:flower", hint: "give" },
      { goal: "Act three. Take a bow together.", check: "bow", hint: "bow" },
    ],
  },
  {
    id: "nightwatch", title: "The Night Watch",
    intro: "Tonight's show: The Night Watch. The lights are going out.",
    night: true,
    acts: [
      { goal: "Act one. It's dark. Give Sir Pip the lantern.", check: "hold:lantern", hint: "takeLantern" },
      { goal: "Act two. Patrol the stage.", check: "walk", hint: "walk" },
      { goal: "Act three. Find Marlo in the dark.", check: "approach", hint: "walk" },
    ],
  },
  {
    id: "training", title: "Knight School",
    intro: "Tonight's show: Knight School. Every hero has to start somewhere.",
    acts: [
      { goal: "Act one. Give Sir Pip his sword.", check: "hold:sword", hint: "takeSword" },
      { goal: "Act two. Raise the sword high.", check: "wave", hint: "wave" },
      { goal: "Act three. Bow to your teacher, the dragon.", check: "bow", hint: "bow" },
    ],
  },
  {
    id: "sleepy", title: "The Sleepy Dragon",
    intro: "Tonight's show: The Sleepy Dragon. Marlo has dozed off mid-scene.",
    sleepy: true,
    acts: [
      { goal: "Act one. Tiptoe over to Marlo.", check: "approach", hint: "walk" },
      { goal: "Act two. Wake him with a jump!", check: "jump", hint: "jump" },
      { goal: "Act three. Wave good morning.", check: "wave", hint: "wave" },
    ],
  },
];
export const SHOW_LINES = {
  bravo: ["Bravo!", "Wonderful!", "Marvellous!", "The crowd goes wild!"],
  finale: "And that's our show! Three stars, and a playbill for your collection.",
  tomorrow: "Come back tomorrow for a brand new show.",
  encore: "Encore! Pinch the bar to start another show.",
};

// Marlo speaks for himself (a different voice) when you talk to him
export const MARLO_TALK = {
  hello: "Hello! Hello! Oh, I love visitors!",
  dance: "A dance? Watch this!",
  bow: "A bow, for you, good sir!",
  jump: "Wheee! Again, again!",
  come: "Coming, coming!",
  go: "Fine, fine. I'm going.",
  friend: "Friends? Really? Best day ever!",
  name: "I'm Marlo. And you are very, very tall.",
  sorry: "That's all right. Dragons don't hold grudges. Much.",
  fire: "Fire? Oh no, I only breathe warm air. And sparkles.",
  unknown: "Hmm? Say that again, slower. I'm only a little dragon.",
};

// ---- the story: chapters on the storybook map --------------------------------------
// guests: who Sir Pip meets. `says` = lines for things they do on their own,
// `talk` = answers when you speak to them, `personality` tunes their mind.
export const GUESTS = {
  marlo: {
    name: "Marlo", title: "Marlo the dragon", says: MARLO_SAYS, talk: MARLO_TALK,
    personality: { joy: 0.55, trust: 0.45, energy: 0.85, sword: "wary", sulkAfter: 40, patience: 9 },
  },
  wizard: {
    name: "Bramble", title: "Old Bramble the wizard",
    personality: { joy: 0.6, trust: 0.75, energy: 0.5, sword: "wary", sulkAfter: 70, patience: 6 },
    says: {
      copyMe: "Copy me, young knight!", yourTurn: "Now you try. Just as I did.", yay: "Splendid! Truly splendid!", yay2: "Ho! A natural!",
      aww: "Never mind. Magic takes practice.", careful: "Steady with that blade, young one.", forMe: "For me? How very kind.",
      forMeAsk: "Is that a gift, for an old wizard?", forYou: "Take this. It may help you on your way.", fetching: "One moment. I have just the thing.",
      hmph: "Hmm. Even wizards get lonely.", cheerUp: "Ah, there you are!", yawn: "Forgive me. An old wizard needs his nap.", wake: "Eh? What? I'm awake!",
      giggle: "Ho ho! Down you go again!", ohNo: "Oh dear! Let me help you up.", overHere: "Over here, by the old oak.", likeThis: "Watch closely. Like this.",
      lookThere: "Look, by the edge of the stage. Take what you need.",
    },
    talk: {
      hello: "Greetings, traveller. Welcome to my forest.", dance: "A dance? My knees are old, but very well!", bow: "A bow for you, brave knight.",
      jump: "Jump? Ho! I'll try.", come: "Coming, coming. Slowly.", go: "Very well. I shall wander off.", friend: "Friends? I'd like that very much.",
      name: "I am Bramble, keeper of the whispering forest.", sorry: "No harm done, my friend.", fire: "Fire? Only a little spark. Watch the staff.",
      unknown: "Speak up, my ears are as old as the trees.",
    },
  },
  pirate: {
    name: "Captain Pegg", title: "Captain Pegg the pirate",
    personality: { joy: 0.65, trust: 0.5, energy: 0.95, sword: "duel", sulkAfter: 35, patience: 9 },
    says: {
      copyMe: "Arr! Copy me, matey!", yourTurn: "Yer turn! Show me what ye've got!", yay: "Ha har! That's the spirit!", yay2: "Shiver me timbers, perfect!",
      aww: "Bah! Next time, matey.", careful: "A sword! Ha! En garde!", forMe: "For me? Ye've got a pirate's heart!",
      forMeAsk: "Is that treasure, for the captain?", forYou: "Here, matey. A gift from the captain.", fetching: "Wait there! The captain has something!",
      hmph: "Arr. A captain with no crew.", cheerUp: "Ahoy! Ye came back!", yawn: "Yawn. Wake me when we reach land.", wake: "All hands on deck! I'm up!",
      giggle: "Ha har! No sea legs at all!", ohNo: "Man overboard! Let me help!", overHere: "Over here, by the mast!", likeThis: "Watch the captain. Like this!",
      lookThere: "Look there, matey, by the edge! Take yer pick.",
    },
    talk: {
      hello: "Ahoy there! Welcome aboard!", dance: "A jig? Arr, watch this!", bow: "A captain's bow, for a brave knight!",
      jump: "Jump? Over the rail? Ha!", come: "Aye aye, coming!", go: "Fine! I'll go swab the deck.", friend: "Friends? Ye'd make a fine crew mate!",
      name: "I'm Captain Pegg, terror of the seven puddles!", sorry: "No hard feelings, matey.", fire: "Fire the cannons? We don't have any. Arr.",
      unknown: "Arr? Say that again, the sea's too loud.",
    },
  },
  troll: {
    name: "Grumble", title: "Grumble the troll",
    personality: { joy: 0.2, trust: 0.15, energy: 0.6, sword: "angry", sulkAfter: 25, patience: 11 },
    says: {
      copyMe: "Hmph. Copy Grumble. If you can.", yourTurn: "Your turn. Go on then.", yay: "Huh. Not bad. Not bad at all.", yay2: "Grumble likes that!",
      aww: "Hmph. Too slow.", careful: "Put that sword down! Grumble doesn't like swords.", forMe: "A flower? For Grumble? Nobody ever gives Grumble flowers.",
      forMeAsk: "Is that for Grumble?", forYou: "Here. Grumble found this. Don't make it weird.", fetching: "Stay there. Grumble's getting something.",
      hmph: "Hmph. Nobody visits Grumble's bridge.", cheerUp: "Oh. You came back. Grumble is a little bit happy.", yawn: "Grumble needs a nap. Under the bridge.",
      wake: "Who woke Grumble? Oh. It's you.", giggle: "Ha! Grumble laughed. Don't tell anyone.", ohNo: "Careful, little knight! Up you get.",
      overHere: "Over here. By Grumble's bridge.", likeThis: "Like this. Watch Grumble.", lookThere: "Over there, by the edge. Take something nice.",
    },
    talk: {
      hello: "Hmph. Hello. Nobody says hello to Grumble.", dance: "Dance? Grumble doesn't dance. Oh, fine.", bow: "Grumble bows. Just this once.",
      jump: "Grumble jumps! The bridge shakes!", come: "Grumble's coming. Slowly.", go: "Fine. Grumble goes back under the bridge.",
      friend: "Friend? Grumble has a friend?", name: "Grumble. Troll of the moonlit bridge.", sorry: "Grumble forgives you. This time.",
      fire: "No fire on Grumble's bridge!", unknown: "Huh? Grumble doesn't understand.",
    },
  },
};

export const CHAPTERS = [
  {
    id: "courtyard", set: "courtyard", guest: "marlo", title: "The Castle Courtyard", map: [270, 770],
    intro: "Chapter one: The Castle Courtyard. Our story begins with a knight, a dragon, and a very small stage.",
    acts: [
      { goal: "Act one. Walk Sir Pip over to meet the dragon.", check: "approach", hint: "walk" },
      { goal: "Act two. Now bow to Marlo. Manners matter.", check: "bow", hint: "bow" },
      { goal: "Act three. Wave to the audience.", check: "wave", hint: "wave" },
    ],
  },
  {
    id: "forest", set: "forest", guest: "wizard", title: "The Whispering Forest", map: [570, 545],
    intro: "Chapter two: The Whispering Forest. Deep among the trees lives an old wizard called Bramble.",
    acts: [
      { goal: "Act one. Walk over and greet the wizard.", check: "approach", hint: "walk" },
      { goal: "Act two. The forest is getting dark. Give Sir Pip the lantern.", check: "hold:lantern", hint: "takeLantern" },
      { goal: "Act three. Bow to thank the wizard.", check: "bow", hint: "bow" },
    ],
  },
  {
    id: "ship", set: "ship", guest: "pirate", title: "The Pirate Ship", map: [960, 790],
    intro: "Chapter three: The Pirate Ship. Captain Pegg is looking for a brave knight to duel.",
    acts: [
      { goal: "Act one. Arm Sir Pip with the sword.", check: "hold:sword", hint: "takeSword" },
      { goal: "Act two. Duel! Jump to dodge the captain's swing.", check: "jump", hint: "jump" },
      { goal: "Act three. Spin around to win the duel.", check: "turn", hint: "turn" },
    ],
  },
  {
    id: "bridge", set: "bridge", guest: "troll", title: "The Troll Bridge", map: [1190, 450],
    intro: "Chapter four: The Troll Bridge. By moonlight, a grumpy troll called Grumble guards the way.",
    acts: [
      { goal: "Act one. Walk up to the troll. Carefully.", check: "approach", hint: "walk" },
      { goal: "Act two. Grumble is grumpy. Give him the flower.", check: "give:flower", hint: "give" },
      { goal: "Act three. Wave to your new friend.", check: "wave", hint: "wave" },
    ],
  },
  {
    id: "cave", set: "cave", guest: "marlo", title: "The Dragon's Cave", map: [1400, 225],
    intro: "Chapter five: The Dragon's Cave. At the end of the road, a dragon waits in the dark.",
    acts: [
      { goal: "Act one. It's dark in here. Give Sir Pip the lantern.", check: "hold:lantern", hint: "takeLantern" },
      { goal: "Act two. Find Marlo in the cave.", check: "approach", hint: "walk" },
      { goal: "Act three. Take a final bow together.", check: "bow", hint: "bow" },
    ],
  },
];
// the Grand Theatre: once the first chapter is done, a new show every night
export const THEATRE = { id: "theatre", set: "courtyard", guest: "marlo", title: "The Grand Theatre", map: [330, 250] };
export const STORY_LINES = {
  mapOpen: "Where shall our story go next? Choose a place on the map.",
  unlocked: "A new chapter of the story is unlocked!",
  travel: "And so, our hero set off down the road.",
  theEnd: "And so ends the tale of Sir Pip. But the Grand Theatre has a brand new show every night.",
  theatre: "Tonight, at the Grand Theatre.",
};

// every distinct line, with who speaks it (for pre-recording)
export function allLines() {
  const out = new Map();
  const say = (text, who = "narrator") => out.set(text, who);
  for (const list of Object.values(LINES)) {
    for (const l of list) {
      for (const name of GUEST_NAMES) {
        if (l.includes("{where}")) placesFor(name).forEach((w) => say(l.replace("{where}", w)));
        else if (l.includes("{toward}")) towardFor(name).forEach((w) => say(l.replace("{toward}", w)));
        else say(l.replace("{who}", name));
      }
    }
  }
  for (const list of Object.values(PROP_LINES)) for (const l of list) Object.values(PROPS).forEach((p) => say(l.replace("{prop}", p)));
  Object.values(REPLIES).forEach((l) => say(l));
  Object.values(COACH).forEach((l) => say(l));
  for (const sc of SCENES) { say(sc.intro); sc.acts.forEach((a) => say(a.goal)); }
  SHOW_LINES.bravo.forEach((l) => say(l));
  [SHOW_LINES.finale, SHOW_LINES.tomorrow, SHOW_LINES.encore].forEach((l) => say(l));
  Object.values(MARLO_TALK).forEach((l) => say(l, "marlo"));
  Object.values(MARLO_SAYS).forEach((l) => say(l, "marlo"));
  Object.values(ENDINGS).forEach((e) => say(e.line));
  for (const ch of CHAPTERS) { say(ch.intro); ch.acts.forEach((a) => say(a.goal)); }
  Object.values(STORY_LINES).forEach((l) => say(l));
  for (const [key, g] of Object.entries(GUESTS)) {
    if (key === "marlo") continue;
    Object.values(g.says).forEach((l) => say(l, key));
    Object.values(g.talk).forEach((l) => say(l, key));
  }
  return [...out].map(([text, who]) => ({ text, who }));
}
