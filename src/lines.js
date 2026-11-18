import { allStoryLines } from "./storymaker.js";
// Every line the built-in narrator can say. Kept free of browser-only imports so the voice
// builder (tts/build_voice.py via tts/export_lines.mjs) can read it in Node and
// pre-record each one with a natural voice.
//
// The cast: Sir Pip, a small armoured knight (the player's marionette), and
// Marlo, a friendly dragon worked by the robot puppeteer, who also narrates.

// every guest Sir Pip can share the stage with (lines are recorded for each name)
export const GUEST_NAMES = ["Marlo", "Bramble", "Captain Pegg", "Grumble", "Clank"];
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
  storyIntro: "Ah, there you are! Welcome, welcome. Come closer, and let me tell you a story.",
  rescueDouble: "Down they both go! A classic double pratfall, and the audience adores it.",
  rescueGasp: "Gasp! Is our hero hurt? Up you get!",
  rescueBravo: "Up again! What a trouper. Bravo!",
  rescueTrier: "Never mind! The audience loves a trier.",
  rescueDrama: "Oh, the drama! The crowd is on the edge of its seats.",
  storyCards: "Pick a card for each part of the story: the villain, who needs help, the setting, the challenge, and a twist. Then poke Stage it!",
  storyEnd: "And they all lived happily ever after. The end! Shall we make another story?",
  audienceClaps: "Listen to that! The whole audience is clapping for Marlo.",
  freePlay: "Free play! No story tonight. Pick who you'd like to be, who plays with you, and which stage. Then just have fun.",
  oneHandOn: "One-hand mode is on. No second hand needed: roll your wrist to raise Sir Pip's arms.",
  oneHandOff: "One-hand mode is off. Use your other hand for the small arm bar.",
  hintWave1: "Roll your wrist to one side, and his arms go up. Roll back and forth to wave.",
  lockOn: "Pinch lock is on. Pinch once to pick up a bar, and pinch again to put it down. No need to hold on.",
  lockOff: "Pinch lock is off. Hold your pinch to hold the bar.",
  deskAR: "Psst. The stage is sitting on your real desk. Sir Pip can step right off the front of it, and walk about on your table.",
  warmupBow: "Lovely! Now tip him forward, and he'll take a bow.",
  warmupWalk: "Bravo! Now walk him over, and say hello to Marlo.",
  warmupXR: "That's Sir Pip! Pinch the glowing bar above him, and lift him up.",
  warmupDesk: "That's Sir Pip! Click and hold the glowing bar above him, and move him about.",
  welcomeBack: "Welcome back! Now, where were we?",
  pullCord: "Welcome to our little theatre. Pinch the golden cord, and pull it down to raise the curtain.",
  pullCordDesk: "Welcome to our little theatre. Drag the golden cord down to raise the curtain.",
  copyIntro: "Marlo wants a turn. Copy what he does!",
  hintCollect: "Carry Sir Pip to the glowing lights to collect them.",
  snapFree: "Snap! Snap! Marlo's strings have broken. He's flying free!",
  holdHand: "Hold out your hand, and keep it very still.",
  landed: "He landed on your hand!",
  applause: "What wonderful applause! Thank you, thank you!",
  clapForMarlo: "Give Marlo a round of applause! Clap your hands!",
  clapForMarloDesk: "Give Marlo a round of applause! Press K to clap.",
  hintFly: "Move your hand up and down to steer Marlo through the rings.",
  hintFlyDodge: "Move up or down to dodge the gears as they fly at you.",
  hintChase: "Fly right up to Clank to catch him.",
  hintSimon: "Watch the moves, then do the same moves, in the same order.",
  hintTeach: "Show Twig a move. Jump, bow, wave, or spin, and he'll copy you.",
  hintFib: "Watch Twig's nose. Then walk Sir Pip onto True, or onto Fib.",
  hintPeek: "When Noodle pops up, walk Sir Pip over to it, and boop!",
  hintSock: "Look at Noodle's stripes. Then walk Sir Pip under the sock that matches.",
  hintGentle: "Walk Sir Pip toward Marlo slowly and gently. Rush, and he'll hide.",
  hintHighFive: "Walk up to Marlo, and lift Sir Pip's arm to meet his paw.",
  hintTogether: "When Marlo says jump, jump at the very same moment.",
  hintOwl: "Listen for the owl's hoot, and walk Sir Pip under the owl that called.",
  hintDuck: "When he swings high, tip your wrist forward to duck. When he swings low, jump!",
  hintStrike: "Now move Sir Pip quickly toward him to strike.",
  hintStone: "Walk Sir Pip onto the stone with the right answer, and stay there a moment.",
  hintSneak: "Move only while the searchlight is pointing away. Freeze when it comes back!",
  hintKey: "Take the key from the pedestal, and hand it to Sir Pip.",
  hintUnlock: "Now carry the key to the cage, and let go.",
  hintDodge: "Watch the zap coming along the floor, and jump just before it reaches you.",
  synced: "In perfect step with your shadow!",
  snap: "Snap! One of the strings has broken. Gently does it.",
  modeNormal: "Back to the classic show.",
  modeMoon: "Moon gravity. Everything floats.",
  modeFragile: "Fragile strings. Move gently, or they'll snap.",
  modeParty: "Party mode! The lights are dancing.",
  unlockMoon: "You've unlocked moon gravity! Press the gold Modes button on the front of the stage to try it.",
  unlockFragile: "New mode unlocked: fragile strings. Press the gold Modes button on the front of the stage.",
  unlockParty: "New mode unlocked: party mode! Press the gold Modes button on the front of the stage.",
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
  finale: "And that's our show! A playbill for your collection.",
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
    task: { taDa: "Ta-da! All part of the show!", showOff: "Watch this, Sir Pip! A loop the loop!", shy: "Oh! Um. Hello. I'm a little shy with new knights.", peek: "Is it safe? Come closer. But slowly.", notShy: "You're gentle. I like you!", highFive: "Give me a high five, Sir Pip!", highFived: "Ha! Best high fives in the whole kingdom!", together: "Let's jump together! On my count!", missJump: "Almost! Jump right when I say jump.", fireworks: "Fireworks! We did it together!", gems: "The jewels! The music box can play again!", thankYou: "Thank you, Sir Pip. You're the best friend a dragon ever had.", mount: "Hold on tight, Sir Pip!", fly: "Woo-hoo! We're flying!", spot: "There he is! After him!", finale: "Best adventure ever!", free: "I'm free! Wheeee!", warm: "Your hand is so warm!", home: "Back to my strings. See you at the next show!" },
    personality: { joy: 0.55, trust: 0.45, energy: 0.85, sword: "wary", sulkAfter: 40, patience: 9 },
  },
  wizard: {
    name: "Bramble", title: "Old Bramble the wizard",
    personality: { joy: 0.6, trust: 0.75, energy: 0.5, sword: "wary", sulkAfter: 70, patience: 6 },
    task: { taDa: "Behold! Exactly as I planned.", watch: "Watch my spell carefully.", yourTurn: "Now you. Repeat my spell.", wrong: "Not quite. Watch again, young knight.", spellDone: "Splendid! The spell works! You have the gift!", fireflies: "My fireflies! Bless you, young knight!", owl: "My owls know the way. Listen for their call.", owlDone: "The path to the tower! Clever knight.", bloomed: "Look! The whole forest is awake again!", finale: "Splendid! Simply splendid!" },
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
    task: { taDa: "Arr! We meant to do that!", enGarde: "En garde, little knight!", high: "High!", low: "Low!", hitMe: "Argh! Ye got me!", gotYou: "Ha har! Got ye!", surrender: "Arr! I surrender! Ye're the finest swordsman on the seven puddles!", finale: "Three cheers for Sir Pip! Hip hip, hooray!" },
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
    task: { taDa: "Hrm. That was part of show.", right: "Hmph! Correct. Grumble is impressed.", wrongAns: "Wrong! Ha! Grumble asks again.", finale: "Grumble is happy. Don't tell anyone." },
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
  clank: {
    name: "Clank", title: "Clank the evil robot",
    personality: { joy: 0.2, trust: 0.05, energy: 1, sword: "angry", sulkAfter: 999, patience: 99 },
    says: {
      copyMe: "Copy Clank. Beep.", yourTurn: "Your turn, intruder.", yay: "Impressive. For a human toy.", yay2: "Beep boop. Acceptable.",
      aww: "Failure detected.", careful: "Sword detected. Shields up!", forMe: "A gift? Clank does not understand gifts.",
      forMeAsk: "Is that a bribe?", forYou: "Take it. Then go away.", fetching: "Fetching. Stand still.",
      hmph: "Clank is alone. As planned.", cheerUp: "You returned. Suspicious.", yawn: "Entering sleep mode.", wake: "Sleep mode cancelled!",
      giggle: "Ha. Ha. Ha. You fell.", ohNo: "Small knight down.", overHere: "Over here, intruder.", likeThis: "Like this. Observe.",
      lookThere: "Look there. By the edge.",
    },
    talk: {
      hello: "Greetings, intruder. Please leave.", dance: "Dance mode activated. Do not tell anyone.", bow: "Clank bows. Politely. Menacingly.",
      jump: "Jumping is inefficient. But fine.", come: "Approaching.", go: "Retreating to recharge.", friend: "Friend? Error. Does not compute.",
      name: "I am Clank, keeper of the Clockwork Tower.", sorry: "Apology logged.", fire: "Clank does not breathe fire. Clank zaps.",
      unknown: "Unknown command. Beep.",
    },
    task: { taDa: "Error. I mean... ta-da.", intruder: "Intruder detected!", seeYou: "I see you!", zap: "Zap!", overheat: "Overheating! Overheating!", defeated: "Clank needs a little sit down.", steal: "Catch me if you can!", gears: "Gear bombs away!", caught: "No! You caught me!", sad: "I only wanted to hear the music too. Nobody ever played music for Clank.", thanks: "Thank you. Friend.", finale: "Clank is happy. Beep! Very, very happy!" },
  },
  king: {
    name: "The King", title: "The King",
    says: {}, talk: {},
    task: { kneel: "Kneel, brave knight.", words: "For courage, for kindness, and for very good manners.", name: "I name you Sir Pip the Brave, Knight of the Music Box!", play: "Let the music play!" },
  },
  princess: {
    name: "Princess Juniper", title: "Princess Juniper",
    says: {}, talk: {},
    task: { help: "Help! Please, somebody help me!", key: "The key! Clank keeps it on the pedestal!", hero: "My hero! Thank you, Sir Pip!", lookOut: "Look out! He's charging his zapper!", finale: "Hooray for Sir Pip!" },
  },
  // Twig, the wooden boy of the toymaker's workshop: cheeky, boastful, kind underneath,
  // and he can't fib without his nose growing (the lines in TWIG_FIBS grow it)
  twig: {
    name: "Twig", title: "Twig the wooden boy",
    personality: { joy: 0.7, trust: 0.55, energy: 0.9, sword: "wary", sulkAfter: 35, patience: 8 },
    says: {
      copyMe: "Copy me! If you can!", yourTurn: "Your turn! I'm watching!", yay: "Ha! Not bad, for a knight!", yay2: "Perfect! Almost as good as me.",
      aww: "Aww. Never mind. I never get it wrong. Ever.", careful: "Careful! I'm made of wood. Very splintery wood.", forMe: "For me? Nobody ever gives presents to a puppet!",
      forMeAsk: "Is that for me? It is, isn't it?", forYou: "Here! I carved it myself. Well, the toymaker did.", fetching: "Wait there! I know just the thing!",
      hmph: "Hmph. I didn't want to play anyway.", cheerUp: "You came back! I wasn't worried. Not one bit.", yawn: "Yawn. Puppets never get sleepy.", wake: "I wasn't asleep! I was resting my paint.",
      giggle: "Ha ha! You fell! I never fall over. Never ever.", ohNo: "Oh no! Here, take my hand. It's wooden, but it's strong.", overHere: "Over here! By the workbench!", likeThis: "Like this! Watch my feet.",
      lookThere: "Look! Over there, by the edge. Take your pick!",
    },
    talk: {
      hello: "Hello! I'm the most famous puppet in the whole world!", dance: "Dance? Of course I can dance! Watch this!", bow: "A bow? I invented bowing.",
      jump: "Boing! I can jump higher than the moon.", come: "Coming! Clickety-clack!", go: "Fine! I'll go and talk to the clocks.", friend: "A friend? A real one? Oh, yes please!",
      name: "I'm Twig. Carved from pine, painted by hand, and only a little bit splintery.", sorry: "That's all right. I forgive you. Truly. Look, my nose didn't grow.",
      fire: "Fire? Keep it away! I'm made of wood!", unknown: "Hmm? Say it again. My ears are only painted on.",
    },
    task: {
      taDa: "Ta-da! I meant to do that. Honest.",
      hello: "Oh! A real knight! Welcome to the workshop!",
      boast1: "I was carved from a log of pine that hummed when you tapped it.",
      boast2: "I could beat a dragon in a race. With my eyes shut!",
      boast3: "The toymaker painted my cheeks pink, so I would always look happy.",
      boast4: "I'm made of solid gold. Under the paint.",
      boast5: "I'm the best dancer in the whole kingdom!",
      caught: "Caught me! How did you know?",
      fooled: "Ha! Fooled you! Look at my nose!",
      trueRight: "See? Every word true. My nose didn't budge.",
      trueWrong: "But that one was true! Look, my nose didn't grow.",
      confess: "All right. The truth? I can't dance. Not one single step. Will you teach me?",
      teach: "Show me a move. Any move, and I'll copy you!",
      learned1: "Like this? Oh! I did it!",
      learned2: "Again! Again! I'm getting it!",
      learned3: "I'm dancing! I'm really, truly dancing!",
      thanks: "Thank you, Sir Pip. That's the truth. Look, my nose stayed put!",
      finale: "Best show ever! And that's not a fib!",
    },
  },
};
// Noodle the sock puppet (and its twin, Doodle): not on strings. The robot puppeteer works
// them from under the stage, one on each hand.
GUESTS.noodle = {
  name: "Noodle", title: "Noodle the sock puppet", hand: true,
  personality: { joy: 0.85, trust: 0.6, energy: 1, sword: "wary", sulkAfter: 40, patience: 9 },
  says: {
    copyMe: "Copy me! Wiggle, wiggle!", yourTurn: "Your turn! Wiggle!", yay: "Woo! You're good at this!", yay2: "Perfect! Sock-tacular!",
    aww: "Aww. Never mind!", careful: "Eek! Careful! Socks can rip!", forMe: "For me? I'll keep it in my mouth. That's where I keep everything.",
    forMeAsk: "Is that for me? Is it a snack?", forYou: "Here! I found it in the wash.", fetching: "Wait there! I'll dig something out!",
    hmph: "Hmph. Nobody plays with a sock.", cheerUp: "You're back! Wheee!", yawn: "Yawn. Time to curl up in the sock drawer.", wake: "I'm up! I'm up! I'm a bit crumpled.",
    giggle: "Hee hee! You fell! Like a sock off a line!", ohNo: "Oh no! Are you all right, Sir Pip?", overHere: "Over here! Over here! Down here!", likeThis: "Like this! Watch me wiggle!",
    lookThere: "Look! By the edge! Go and get it!",
  },
  talk: {
    hello: "Hiya! I'm Noodle! I'm a sock! Well, mostly a sock.", dance: "Dance? I'll wiggle! Wiggle, wiggle, wiggle!", bow: "A bow? I can only fold in half. Like this!",
    jump: "Boing! Straight up out of my hole!", come: "Coming! Wheee!", go: "Okay! Back down the hole I go!", friend: "Friends? Best friends! Like a sock and a shoe!",
    name: "I'm Noodle. I'm named after my hair.", sorry: "That's okay! I'm soft. Nothing hurts a sock.", fire: "Fire? No thanks! I'd rather stay fluffy.",
    unknown: "Huh? Sorry, I've got yarn in my ears.",
  },
  task: {
    taDa: "Ta-da! I meant to fall in the laundry basket.",
    peek: "Peekaboo!", peek2: "Over here! Peekaboo!", peek3: "Bet you can't catch me!",
    boop: "Hee hee! That tickles!", boop2: "Boop! Again, again!", booped: "Ha! You found me! Three boops!", miss: "Too slow! Wheee!",
    stripes: "Look at my stripes! Red, yellow, green. Find the sock that matches!",
    wrongSock: "Nope! That one belongs to a grandma.", wrongSock2: "Not that one! Look at my stripes!",
    found: "My twin! Doodle! You found Doodle!",
    thanks: "Thank you, Sir Pip! We're a pair again!",
    finale: "Hooray for Sir Pip! You're a perfect fit!",
  },
};
GUESTS.doodle = {
  name: "Doodle", title: "Doodle the sock puppet", hand: true, says: {}, talk: {},
  task: { hello: "Noodle! There you are! I've been hanging around all day!", sing: "La la la! Two odd socks, one even song!" },
};

// what Twig says that isn't true (his nose grows), and the truths that shrink it back
export const TWIG_FIBS = new Set([
  GUESTS.twig.task.boast2, GUESTS.twig.task.boast4, GUESTS.twig.task.boast5, GUESTS.twig.task.taDa,
  GUESTS.twig.talk.hello, GUESTS.twig.talk.dance, GUESTS.twig.talk.bow, GUESTS.twig.talk.jump,
  GUESTS.twig.says.aww, GUESTS.twig.says.hmph, GUESTS.twig.says.cheerUp, GUESTS.twig.says.yawn, GUESTS.twig.says.giggle, GUESTS.twig.says.wake,
]);
export const TWIG_TRUTHS = new Set([GUESTS.twig.task.confess, GUESTS.twig.task.thanks, GUESTS.twig.talk.sorry, GUESTS.twig.talk.friend, GUESTS.twig.task.caught]);
// the true-or-fib game: [line key, is it true?]
export const TWIG_BOASTS = { truths: ["boast1", "boast3"], fibs: ["boast2", "boast4"], last: "boast5" };

// The prologue: why Sir Pip sets out at all. Read once, before the very first
// chapter (each page names the painting and the characters it shows).
export const PROLOGUE = {
  id: "prologue", set: "courtyard", title: "The Tale of Sir Pip",
  pages: [
    "Once upon a time, in a kingdom no bigger than a desk, Princess Juniper wound a little golden music box every night, and everyone fell asleep smiling.",
    "But one stormy night, Clank the clockwork robot, who had never once been invited to listen, carried her off to his tower, and hid the music box's three jewels. The kingdom fell silent.",
    "Only one hero answered the king's call: Sir Pip. Shiny armour, a brave heart, and absolutely no idea what he was doing. And so, the quest began.",
  ],
  art: [
    { set: "courtyard", night: true, cast: [["princess", 0.38], ["musicbox", 0.66]] },
    { set: "tower", cast: [["clank", 0.32], ["cage", 0.72], ["princess", 0.72]] },
    { set: "courtyard", cast: [["king", 0.35], ["pip", 0.68, true]] },
  ],
};

// A chapter: a set, a guest, three storybook pages before the curtain rises,
// and three acts. An act either waits for an action (`check`) or runs a
// playable task (`task`, see tasks.js): a duel, a riddle, sneaking...
export const CHAPTERS = [
  {
    id: "courtyard", set: "courtyard", guest: "marlo", title: "The Castle Courtyard", map: [210, 800],
    intro: "Chapter one: The Castle Courtyard. Our story begins with a knight, a dragon, and a very small stage.",
    pages: [
      "Every hero needs a friend for the road, and Sir Pip's was waiting in the castle courtyard.",
      "Marlo was a young dragon who breathed only sparkles, and loved nothing more than an adventure.",
      "But young dragons can be shy, and a knight must always mind his manners.",
    ],
    acts: [
      { goal: "Act one. Here comes Marlo! Then walk Sir Pip over to meet him, slowly.", task: { type: "shy" }, hint: "gentle" },
      { goal: "Act two. Now bow to Marlo. Manners matter.", check: "bow", hint: "bow" },
      { goal: "Act three. Friends give high fives. Meet his paw.", task: { type: "highfive", count: 2 }, hint: "highfive" },
      { goal: "Act four. Jump together, right on Marlo's count.", task: { type: "together", count: 3 }, hint: "together" },
      { goal: "Act five. Take a bow, and wave to the audience.", check: "wave", hint: "wave" },
    ],
  },
  {
    id: "forest", set: "forest", guest: "wizard", title: "The Whispering Forest", map: [470, 680],
    intro: "Chapter two: The Whispering Forest.",
    pages: [
      "The road to Clank's tower led first into the Whispering Forest, where the trees tell secrets to the wind.",
      "There lived Old Bramble, a wizard who knew the way to the tower, if only he could remember it.",
      "But his magic fireflies had escaped, and without their light, even a wizard gets lost.",
    ],
    acts: [
      { goal: "Act one. The forest is dark. Give Sir Pip the lantern.", check: "hold:lantern", hint: "takeLantern" },
      { goal: "Act two. Catch five fireflies with the lantern. Gently, or they fly away.", task: { type: "collect", count: 5, look: "firefly", needs: "lantern", shy: true }, hint: "collect" },
      { goal: "Act three. Bramble's owls know the way. Follow their calls.", task: { type: "owls", count: 3 }, hint: "owl" },
      { goal: "Act four. Learn Bramble's spell. Watch his moves, then copy them in order.", task: { type: "simon", length: 3, bloom: true }, hint: "simon" },
    ],
  },
  {
    id: "ship", set: "ship", guest: "pirate", title: "The Pirate Ship", map: [950, 846],
    intro: "Chapter three: The Pirate Ship.",
    pages: [
      "The tower stood across the sea, and only one ship would sail there.",
      "Its captain had one wooden leg, one noisy parrot, and one condition: beat him in a duel.",
      "Sir Pip gripped his sword. It was a very small sword. It would have to do.",
    ],
    acts: [
      { goal: "Act one. Arm Sir Pip with the sword.", check: "hold:sword", hint: "takeSword" },
      { goal: "Act two. Duel! Duck the high swings, jump the low ones, then lunge to strike.", task: { type: "duel", hits: 3 }, hint: "duck" },
      { goal: "Act three. The captain surrenders! Take a bow, champion.", check: "bow", hint: "bow" },
    ],
  },
  {
    id: "bridge", set: "bridge", guest: "troll", title: "The Troll Bridge", map: [1290, 520],
    intro: "Chapter four: The Troll Bridge.",
    pages: [
      "Across the sea, the road climbed to an old stone bridge, silver in the moonlight.",
      "Under it lived Grumble, the grumpiest troll in all the land.",
      "And nobody, nobody at all, crosses Grumble's bridge without answering his riddle.",
    ],
    acts: [
      { goal: "Act one. Walk up to the troll. Carefully.", check: "approach", hint: "walk" },
      { goal: "Act two. Answer the riddle. Walk Sir Pip onto the right stone.", task: { type: "riddle" }, hint: "stone" },
      { goal: "Act three. Grumble is still grumpy. Give him the flower.", check: "give:flower", hint: "give" },
    ],
  },
  {
    id: "tower", set: "tower", guest: "clank", title: "The Clockwork Tower", map: [1000, 430], princess: true,
    intro: "Chapter five: The Clockwork Tower.",
    pages: [
      "At last, the Clockwork Tower, ticking and whirring in the storm. No one ever came to visit. Clank had made quite sure of that.",
      "Inside, Princess Juniper waited in a cage, while Clank's searchlight swept the floor.",
      "Only a knight brave enough to sneak past it could set her free.",
    ],
    acts: [
      { goal: "Act one. Sneak to the key. Move only when the searchlight looks away.", task: { type: "sneak" }, hint: "sneak" },
      { goal: "Act two. Take the key, and unlock the princess's cage.", task: { type: "unlock" }, hint: "takeKey" },
      { goal: "Act three. Clank attacks! Jump over his zaps until he overheats.", task: { type: "dodge", count: 6 }, hint: "dodge" },
    ],
  },
  {
    id: "cave", set: "cave", guest: "marlo", title: "The Dragon's Cave", map: [640, 330],
    intro: "Chapter six: The Dragon's Cave.",
    pages: [
      "With the princess free, one thing was still missing: the music box's three jewels.",
      "Clank had hidden them in the Dragon's Cave, among the glittering crystals. Luckily, it was Marlo's home.",
      "Find the jewels, and the music box will play again.",
    ],
    acts: [
      { goal: "Act one. It's dark in here. Give Sir Pip the lantern.", check: "hold:lantern", hint: "takeLantern" },
      { goal: "Act two. Find the music box's three jewels.", task: { type: "collect", count: 3, look: "gem" }, hint: "collect" },
      { goal: "Act three. Take a final bow together.", check: "bow", hint: "bow" },
    ],
  },
  {
    id: "sky", set: "sky", guest: "marlo", title: "The Night Sky", map: [370, 165], finale: true,
    intro: "Chapter seven: The Night Sky. The final adventure.",
    pages: [
      "Back at the castle, the jewels were set into the music box, and the whole kingdom gathered to hear it play.",
      "But Clank had one last trick. With a whir of clockwork wings, he snatched the music box and flew off into the night.",
      "There was only one way to catch him. Sir Pip climbed onto Marlo's back, and up, up, up they flew.",
    ],
    art: [
      { set: "courtyard", night: true, cast: [["princess", 0.25], ["musicbox", 0.5], ["king", 0.76, true]] },
      { set: "sky", cast: [["clank", 0.6], ["musicbox", 0.8]] },
      { set: "sky", cast: [["pip", 0.4, false, -92, 0.8], ["marlo", 0.5]] }, // (Sir Pip rides behind Marlo's shoulders)
    ],
    acts: [
      { goal: "Act one. Climb aboard! Bring Sir Pip to Marlo.", task: { type: "mount" }, hint: "walk" },
      { goal: "Act two. Fly! Steer up and down through five glowing rings.", task: { type: "rings", count: 5 }, hint: "fly" },
      { goal: "Act three. Clank is throwing gears! Dodge four of them.", task: { type: "gears", count: 4 }, hint: "flyDodge" },
      { goal: "Act four. Catch Clank! Fly right up to him.", task: { type: "chase" }, hint: "chase" },
      { goal: "Act five. Clank is lonely, not wicked. Show him kindness: bow to him.", task: { type: "kindness" }, hint: "bow" },
      { goal: "Act six. The King awaits. Kneel before him, and bow.", task: { type: "knight" }, hint: "bow" },
    ],
  },
];

// read after the grand finale
export const EPILOGUE = {
  id: "epilogue", set: "courtyard", title: "The End",
  pages: [
    "From that night on, the music box played every evening. And Clank, who had never had a friend, wound its tiny key himself.",
    "Old Bramble remembered his birthday. Captain Pegg found a new crew. And Grumble let everyone cross his bridge, as long as they said hello.",
    "And Sir Pip the Brave? He still had no idea what he was doing. But he had friends, and that was more than enough. The end.",
  ],
  art: [
    { set: "courtyard", night: true, cast: [["clank", 0.35], ["musicbox", 0.65]] },
    { set: "forest", cast: [["wizard", 0.22], ["pirate", 0.5], ["troll", 0.8, true]] },
    { set: "courtyard", cast: [["pip", 0.3], ["princess", 0.52], ["marlo", 0.76, true]] },
  ],
};

// what the narrator says while a task plays out
export const TASK_LINES = {
  caught: "Caught! Back to the shadows.",
  gotKey: "The key! Now, to the cage.",
  freed: "The cage swings open. The princess is free!",
  duck: "Duck!",
  jumpNow: "Jump!",
  strike: "Strike now!",
  hit: "A hit!",
  ouch: "Ouch!",
  again: "Shake it off. Again!",
  correct: "Correct!",
  wrong: "Wrong! Try again.",
  collected: "All found. Wonderful!",
  needLantern: "The fireflies only come to the lantern.",
  watch: "Watch carefully.",
  yourTurn: "Your turn. Same moves, same order.",
  notQuite: "Not quite. Watch again.",
  dodged: "Dodged!",
  zapped: "Zapped! Keep jumping.",
  overheat: "Clank is overheating!",
  flying: "Up, up, and away!",
  ring: "Through the ring!",
  missRing: "Missed! Here comes another.",
  gearHit: "Ouch! Watch out for the gears!",
  gotClank: "Got him!",
  kneel: "Kneel, and bow to the King.",
  tooFast: "Too fast! You frightened him. Slowly, now.",
  scatter: "Gently! Fireflies scare easily.",
  owlListen: "Listen. Walk Sir Pip under the owl that calls.",
  owlFound: "That's the way!",
  notThatOwl: "Not that one. Listen again.",
  bloom: "And the whole forest bursts into bloom!",
  finale: "Three cheers for the whole company!",
};
export const RIDDLES = [
  { line: "Grumble's riddle. What gets wetter, the more it dries? A towel, a fish, or a rain cloud?", options: ["A towel", "A fish", "A rain cloud"], answer: 0, q: "What gets wetter, the more it dries?" },
  { line: "Grumble's riddle. What has to be broken before you can use it? A sword, an egg, or a bridge?", options: ["A sword", "An egg", "A bridge"], answer: 1, q: "What has to be broken before you can use it?" },
  { line: "Grumble's riddle. What has keys, but can't open a single lock? A door, a troll, or a piano?", options: ["A door", "A troll", "A piano"], answer: 2, q: "What has keys, but can't open a single lock?" },
];

// the Grand Theatre: once the first chapter is done, a new show every night
export const THEATRE = { id: "theatre", set: "courtyard", guest: "marlo", title: "The Grand Theatre", map: [200, 470] };

// Two tales along the way, between the numbered chapters (so the chapters keep their
// numbers): the toymaker's workshop on the road to the sea, where Twig the wooden boy's nose
// grows when he fibs; and the harbour laundry, where Noodle the sock puppet has lost its twin.
export const WORKSHOP = {
  id: "workshop", set: "workshop", guest: "twig", title: "The Toymaker's Workshop", map: [705, 790], side: true,
  intro: "Along the way: The Toymaker's Workshop. Sir Pip meets a puppet who can't tell a fib without being caught.",
  pages: [
    "On the road to the sea stood a crooked little workshop, full of sawdust and ticking clocks, where an old toymaker once carved a puppet from a log of pine that hummed when you tapped it.",
    "His name was Twig. He was clever and cheeky, and terribly fond of fibs. And every time he told one, his wooden nose grew a little longer.",
    "Tonight, Twig wanted to be the star of the show. There was just one problem. He had never danced a single step, and he would never, ever admit it.",
  ],
  art: [
    { set: "workshop", night: true, cast: [["twig", 0.5]] },
    { set: "workshop", cast: [["twigLong", 0.5]] },
    { set: "workshop", cast: [["pip", 0.3], ["twig", 0.66, true]] },
  ],
  acts: [
    { goal: "Act one. Twig loves to boast. Is it true, or a fib? Watch his nose, then walk Sir Pip onto your answer.", task: { type: "fib" }, hint: "fib" },
    { goal: "Act two. Twig can't dance. Teach him! Show him a jump, a bow, a wave or a spin, and he'll copy you.", task: { type: "mirror", count: 3 }, hint: "teach" },
    { goal: "Act three. Twig can dance at last. Take a bow together.", check: "bow", hint: "bow" },
  ],
  // the side tale ends its own way (Marlo isn't in it)
  endings: {
    grace: { title: "The Honest Bow", line: "What grace! Twig bows so low his nose touches the floor. And not one fib all night.", clip: "grandbow", critics: ["A wooden performance, in the very best way.", "Charming, honest, and beautifully varnished.", "I believed every word. Which, with this puppet, is a first."] },
    slapstick: { title: "The Wooden Tumble", line: "Twig trips over his own nose, and the audience roars. He says he meant to. His nose grows anyway.", clip: "pratfall", critics: ["Clattering good fun. Mind the splinters.", "A pratfall worthy of the finest pine.", "I laughed so hard my seat creaked."] },
    drama: { title: "The Sappy Encore", line: "Such drama! Twig is so moved, he weeps a single drop of pine sap.", clip: "faint", critics: ["Knotty, gnarled, and utterly gripping.", "There wasn't a dry plank in the house.", "Bold, baffling, and beautifully grained."] },
  },
};
export const LAUNDRY = {
  id: "laundry", set: "laundry", guest: "noodle", title: "The Harbour Laundry", map: [1130, 760], side: true, hand: true,
  intro: "Along the way: The Harbour Laundry. Tonight, the robot puppeteer has a hand in the show.",
  pages: [
    "The pirate ship landed in a harbour town where the washing never stops flapping. And from a laundry basket, somebody was sniffling.",
    "It was Noodle: a sock with wild yarn hair, wobbly eyes, and a very big mouth. Noodle had lost its twin in the wash. And a sock without its pair is only half a sock.",
    "Now, a sock can't dance on strings. So the robot puppeteer reached down under the stage, slipped Noodle onto his hand, and up it popped!",
  ],
  art: [
    { set: "laundry", cast: [["noodle", 0.52]] },
    { set: "laundry", cast: [["noodle", 0.36], ["doodle", 0.72, true]] },
    { set: "laundry", cast: [["pip", 0.3], ["noodle", 0.7, true]] },
  ],
  acts: [
    { goal: "Act one. Noodle wants to play peekaboo! When Noodle pops up, walk Sir Pip over, and boop that nose. Three boops!", task: { type: "peekaboo", count: 3 }, hint: "peek" },
    { goal: "Act two. Find Noodle's twin. Walk Sir Pip under the sock on the washing line with the very same stripes.", task: { type: "matchsock" }, hint: "sock" },
    { goal: "Act three. The twins are together again! Take a bow, and they'll sing for you.", check: "bow", hint: "bow" },
  ],
  endings: {
    grace: { title: "The Clean Finish", line: "What manners! Noodle and Doodle bow so low, their yarn hair sweeps the stage.", clip: "grandbow", critics: ["Fresh, soft, and folded to perfection.", "A perfectly matched pair of performances.", "I came for the knight. I stayed for the socks."] },
    slapstick: { title: "The Spin Cycle", line: "Noodle and Doodle get so excited, they tie themselves in a knot. The robot has to untangle his own hands.", clip: "pratfall", critics: ["A tangle of joy. Mind the static.", "Utterly woolly, wonderfully silly.", "The funniest thing to come out of a laundry basket."] },
    drama: { title: "The Soggy Encore", line: "Such drama! Noodle weeps so hard it needs a good wring.", clip: "faint", critics: ["Damp, dramatic, and deeply moving.", "Not a dry sock in the house.", "Bold. Woolly. Unforgettable."] },
  },
};
// the tales along the way join the road between the numbered chapters
CHAPTERS.splice(CHAPTERS.findIndex((c) => c.id === "ship"), 0, WORKSHOP);
CHAPTERS.splice(CHAPTERS.findIndex((c) => c.id === "bridge"), 0, LAUNDRY);
// a chapter's number, counting only the numbered chapters (the tales along the way have none)
export const chapterNumber = (place) => (place?.side ? 0 : CHAPTERS.filter((c) => !c.side).indexOf(place) + 1);
export const TWIG_LINES = {
  nose: "Look! His nose is growing!",
  noFib: "His nose didn't move.",
};
export const STORY_LINES = {
  mapOpen: "Where shall our story go next? Choose a place on the map.",
  unlocked: "A new chapter of the story is unlocked!",
  travel: "And so, our hero set off down the road.",
  theEnd: "And so the music box played again, and the whole kingdom fell asleep smiling. The end. But the Grand Theatre has a brand new show every night.",
  theatre: "Tonight, at the Grand Theatre.",
};

// every distinct line, with who speaks it (for pre-recording)
export function allLines() {
  const out = new Map();
  const say = (text, who = "narrator") => out.set(text, who);
  allStoryLines().forEach((l) => say(l)); // every sentence the story maker can produce
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
  for (const ch of CHAPTERS) { say(ch.intro); ch.acts.forEach((a) => say(a.goal)); ch.pages.forEach((l) => say(l)); Object.values(ch.endings || {}).forEach((e) => say(e.line)); }
  Object.values(TWIG_LINES).forEach((l) => say(l));
  PROLOGUE.pages.forEach((l) => say(l));
  EPILOGUE.pages.forEach((l) => say(l));
  Object.values(TASK_LINES).forEach((l) => say(l));
  RIDDLES.forEach((r) => say(r.line, "troll"));
  Object.values(STORY_LINES).forEach((l) => say(l));
  for (const [key, g] of Object.entries(GUESTS)) {
    Object.values(g.task || {}).forEach((l) => say(l, key));
    if (key === "marlo") continue;
    Object.values(g.says).forEach((l) => say(l, key));
    Object.values(g.talk).forEach((l) => say(l, key));
  }
  return [...out].map(([text, who]) => ({ text, who }));
}
