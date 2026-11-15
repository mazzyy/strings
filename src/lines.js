// Every line the built-in narrator can say. Kept import-free so the voice
// builder (tts/build_voice.py via tts/export_lines.mjs) can read it in Node and
// pre-record each one with a natural voice.
//
// The cast: Sir Pip, a small armoured knight (the player's marionette), and
// Marlo, a friendly dragon worked by the robot puppeteer, who also narrates.

export const PLACES = ["across the stage", "toward Marlo", "away from Marlo", "toward the audience", "upstage, toward the back"];
export const TOWARD = ["Marlo", "the audience", "away"];

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
    "Sir Pip comes nose to snout with Marlo. Neither one blinks.",
    "So close now. Marlo can hear the knight's hinges creak.",
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

// every distinct line, with who speaks it (for pre-recording)
export function allLines() {
  const out = new Map();
  const say = (text, who = "narrator") => out.set(text, who);
  for (const list of Object.values(LINES)) {
    for (const l of list) {
      if (l.includes("{where}")) PLACES.forEach((w) => say(l.replace("{where}", w)));
      else if (l.includes("{toward}")) TOWARD.forEach((w) => say(l.replace("{toward}", w)));
      else say(l);
    }
  }
  for (const list of Object.values(PROP_LINES)) for (const l of list) Object.values(PROPS).forEach((p) => say(l.replace("{prop}", p)));
  Object.values(REPLIES).forEach((l) => say(l));
  Object.values(COACH).forEach((l) => say(l));
  for (const sc of SCENES) { say(sc.intro); sc.acts.forEach((a) => say(a.goal)); }
  SHOW_LINES.bravo.forEach((l) => say(l));
  [SHOW_LINES.finale, SHOW_LINES.tomorrow, SHOW_LINES.encore].forEach((l) => say(l));
  Object.values(MARLO_TALK).forEach((l) => say(l, "marlo"));
  return [...out].map(([text, who]) => ({ text, who }));
}
