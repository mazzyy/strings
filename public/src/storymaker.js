// Story maker: write your own story ("the dragon kidnapped the princess and took her
// to his cave, and Sir Pip must rescue her") and the theatre stages it.
//
// The hosted build has no language model, so this reads the key words: who the villain
// is, who (or what) needs saving, where it happens, and what the hero must do. It then
// assembles a show from the theatre's own pieces: the right set, the villain as the
// co-star, a three-page illustrated storybook, and acts that fit the goal.
//
// Every sentence it can produce comes from a fixed set of combinations, so all of them
// are pre-recorded in the narrator's natural voice (see allStoryLines, read by the voice
// builder). Nothing is ever read by a robotic voice.

export const VILLAINS = {
  marlo: { np: "a hungry dragon", the: "the dragon", lair: "cave", title: "the Dragon", kw: /\b(dragon|marlo|wyrm|drake)s?\b/ },
  troll: { np: "a grumpy troll", the: "the troll", lair: "bridge", title: "the Troll", kw: /\b(troll|ogre|grumble|giant)s?\b/ },
  pirate: { np: "a pirate captain", the: "the pirate captain", lair: "ship", title: "the Pirate", kw: /\b(pirate|captain|pegg|buccaneer)s?\b/ },
  wizard: { np: "a sneaky wizard", the: "the wizard", lair: "forest", title: "the Wizard", kw: /\b(wizard|witch|sorcer\w*|mage|warlock|bramble)s?\b/ },
  clank: { np: "a clockwork robot", the: "the clockwork robot", lair: "tower", title: "the Robot", kw: /\b(robot|clank|clockwork|machine|android)s?\b/ },
  twig: { np: "a cheeky wooden puppet", the: "the wooden puppet", lair: "workshop", title: "the Wooden Puppet", kw: /\b(twig|wooden|pinocchio|carved|liar)s?\b/ },
  noodle: { np: "a mischievous sock puppet", the: "the sock puppet", lair: "laundry", title: "the Sock Puppet", kw: /\b(noodle|sock|socks|sock puppet)\b/ },
};

export const PLACES = {
  courtyard: { phrase: "in the castle courtyard", kw: /\b(castle|courtyard|palace|kingdom|village|town)\b/ },
  forest: { phrase: "in the whispering forest", kw: /\b(forest|wood|woods|tree|trees|jungle)\b/ },
  ship: { phrase: "aboard a pirate ship", kw: /\b(ship|sea|ocean|boat|island|harbou?r)\b/ },
  bridge: { phrase: "under the old troll bridge", kw: /\b(bridge|river|stream)\b/ },
  tower: { phrase: "at the top of a clockwork tower", kw: /\b(tower|clock)\b/ },
  cave: { phrase: "in a deep, dark cave", kw: /\b(cave|cavern|mountain|lair|dungeon|mine)\b/ },
  sky: { phrase: "high above the clouds", kw: /\b(sky|cloud|clouds|moon|stars?|fly|flying|air)\b/ },
  workshop: { phrase: "in a toymaker's workshop", kw: /\b(workshop|toymaker|toyshop|toys|carpenter)\b/ },
  laundry: { phrase: "in a harbour laundry", kw: /\b(laundry|washing|wash|washed|clothes)\b/ },
};

// who can be captured (anyone but the villain), as named in the story
export const CAPTIVES = {
  princess: { name: "Princess Juniper", title: "Princess Juniper", pron: "her", kw: /\b(princess|juniper)\b/ },
  king: { name: "the King", title: "the King", pron: "him", kw: /\b(king|queen|prince)\b/ },
  marlo: { name: "Marlo the dragon", title: "Marlo the Dragon", pron: "him" },
  wizard: { name: "Old Bramble the wizard", title: "Old Bramble", pron: "him" },
  pirate: { name: "Captain Pegg", title: "Captain Pegg", pron: "him" },
  troll: { name: "Grumble the troll", title: "Grumble the Troll", pron: "him" },
  clank: { name: "Clank the clockwork robot", title: "Clank", pron: "him" },
  twig: { name: "Twig the wooden boy", title: "Twig", pron: "him" },
};

// what happened (page two)
const PLOT = {
  kidnap: (V, cap) => (cap === "king" ? `One day, ${V.the} carried off the King.` : cap === "princess" || !CAPTIVES[cap] ? `One day, ${V.the} carried off Princess Juniper.` : `One day, ${V.the} captured ${CAPTIVES[cap].name}.`),
  steal: (V) => `One day, ${V.the} stole the kingdom's treasure.`,
  lonely: (V) => `But ${V.the} was terribly lonely, and nobody ever came to visit.`,
  trouble: (V) => `One day, ${V.the} began to cause terrible trouble.`,
};
// the hero answers (page three)
const QUEST = {
  her: "Only one hero was brave enough to rescue her: Sir Pip. And so, the adventure began.",
  him: "Only one hero was brave enough to rescue him: Sir Pip. And so, the adventure began.",
  rescue: "Only one hero was brave enough to come to the rescue: Sir Pip. And so, the adventure began.",
  treasure: "Only one hero was brave enough to win it back: Sir Pip. And so, the adventure began.",
  friend: "Only one hero thought to bring a little kindness: Sir Pip. And so, the adventure began.",
  trouble: "Only one hero was brave enough to set things right: Sir Pip. And so, the adventure began.",
};

// the acts, as building blocks
const ACT = {
  meet: (V) => ({ goal: `First, walk Sir Pip over to face ${V.the}.`, check: "approach", hint: "walk" }),
  gentle: (V) => ({ goal: `First, walk Sir Pip slowly up to ${V.the}. Gently, now.`, task: { type: "shy" }, hint: "gentle" }),
  sword: () => ({ goal: "Next, arm Sir Pip with the sword.", check: "hold:sword", hint: "takeSword" }),
  duel: () => ({ goal: "Duel! Duck the high swings, jump the low ones, then lunge to strike.", task: { type: "duel", hits: 3 }, hint: "duck" }),
  riddle: () => ({ goal: "Next, answer the troll's riddle. Stand Sir Pip on the right answer.", task: { type: "riddle" }, hint: "stone" }),
  dodge: (V) => ({ goal: `Next, dodge ${V.the}'s attacks. Jump each one as it rolls toward you.`, task: { type: "dodge", count: 5, winLine: "Well dodged! They're all out of puff." }, hint: "dodge" }),
  find: () => ({ goal: "Next, find the three lost jewels.", task: { type: "collect", count: 3, look: "gem" }, hint: "collect" }),
  spell: (V) => ({ goal: `Next, ${V.the} casts a spell. Watch the moves, then copy them in order.`, task: { type: "simon", length: 3 }, hint: "simon" }),
  highfive: (V) => ({ goal: `Next, give ${V.the} a high five.`, task: { type: "highfive", count: 2 }, hint: "highfive" }),
  flower: (V) => ({ goal: `Next, give ${V.the} the flower, as a present.`, check: "give:flower", hint: "takeFlower" }),
  dance: () => ({ goal: "Next, jump together, right on the count.", task: { type: "together", count: 3 }, hint: "together" }),
  unlock: () => ({ goal: "Next, take the key, and unlock the cage.", task: { type: "unlock" }, hint: "takeKey" }),
  lantern: () => ({ goal: "It's dark in here. Give Sir Pip the lantern.", check: "hold:lantern", hint: "takeLantern" }),
  fireflies: () => ({ goal: "Next, catch five fireflies with the lantern.", task: { type: "collect", count: 5, look: "firefly", needs: "lantern" }, hint: "collect" }),
  saved: () => ({ goal: "Last of all, take a bow. The kingdom is saved!", check: "bow", hint: "bow" }),
  // the wooden puppet's games, and the sock puppet's (worked by the robot, from under the stage)
  fib: (V) => ({ goal: `Next, ${V.the} tells three tall tales. Watch the nose, then walk Sir Pip onto True, or Fib.`, task: { type: "fib" }, hint: "fib" }),
  teach: (V) => ({ goal: `Next, teach ${V.the} to dance. Show a jump, a bow or a spin, and it copies you.`, task: { type: "mirror", count: 3 }, hint: "teach" }),
  peekaboo: (V) => ({ goal: `Next, ${V.the} plays peekaboo. Walk Sir Pip to each hole it pops out of, and boop!`, task: { type: "peekaboo", count: 3 }, hint: "peek" }),
  matchsock: () => ({ goal: "Next, find the missing twin. Walk Sir Pip under the sock with the very same stripes.", task: { type: "matchsock" }, hint: "sock" }),
  friends: () => ({ goal: "Last of all, take a bow together. A brand new friendship!", check: "bow", hint: "bow" }),
};
const CHALLENGE_KW = [
  ["duel", /\b(fight|duel|battle|defeat|sword|beat|swordfight|joust)\b/],
  ["riddle", /\b(riddle|trick|clever|outsmart|puzzle|question)\b/],
  ["spell", /\b(spell|magic|learn|enchant\w*|curse)\b/],
  ["dodge", /\b(escape|dodge|run|fire|fireballs?|zaps?|chase|lightning|cannon\w*)\b/],
  ["dance", /\b(dance|dancing|party|show|sing)\b/],
  ["fib", /\b(lie|lies|lied|lying|liar|fib|fibs|fibbing|truth|nose)\b/],
  ["peekaboo", /\b(peekaboo|peek|boop|seek)\b/],
  ["matchsock", /\b(twin|pair|match|matching|missing sock)\b/],
];
// story words that add an act of their own
const EXTRA_KW = {
  find: /\b(treasure|jewels?|gems?|gold|crown|music box|loot)\b/,
  flower: /\b(flower|flowers|gift|present|rose)\b/,
  highfive: /\b(high five|high-five|highfive|five)\b/,
  dance: /\b(dance|dancing|party|jump|jumping|celebrate)\b/,
  dark: /\b(dark|darkness|night|lantern|fireflies|firefly|light)\b/,
};
const FRIEND_END = /\b(friend|friends|forgive\w*|kind|kindness|hug|peace|make up|made up|sorry|befriend)\b/;
export const DEFAULT_CHALLENGE = { marlo: "dodge", troll: "riddle", pirate: "duel", wizard: "spell", clank: "dodge", twig: "fib", noodle: "peekaboo" };
export const DEFAULT_PLACE = { marlo: "cave", troll: "bridge", pirate: "ship", wizard: "forest", clank: "tower", twig: "workshop", noodle: "laundry" };
// each challenge as this villain can really stage it: the fibs need Twig's nose; a sock
// puppet has no strings, so it plays its own games (and the twin hunt needs the washing line)
export function fitChallenge(c, villain, place) {
  if (c === "riddle" && villain !== "troll") c = "spell";
  if (c === "fib" && villain !== "twig") c = "spell";
  if (villain === "noodle") return c === "matchsock" && place === "laundry" ? "matchsock" : "peekaboo";
  if (c === "peekaboo" || c === "matchsock") c = DEFAULT_CHALLENGE[villain];
  return c;
}
const cap1 = (s) => s.charAt(0).toUpperCase() + s.slice(1);

// typos are fine: a word one or two letters off a story word is read as that word
const VOCAB = ("dragon marlo troll ogre giant pirate pirates captain wizard witch sorcerer mage robot clockwork machine " +
  "castle courtyard palace kingdom village forest woods jungle ship ocean island bridge river tower clock cave cavern " +
  "mountain dungeon sky cloud clouds moon stars princess juniper prince king queen kidnap kidnapped captured carried " +
  "stole steal stolen trapped prisoner rescue treasure jewels gems gold crown lonely friend friends kindness befriend " +
  "fight duel battle defeat sword riddle trick clever puzzle spell magic curse escape dodge fireballs chase dance party " +
  "captured capture locked caught grabbed snatched imprisoned flower present lantern fireflies forgive " +
  // (real verb forms, so they're never "corrected" into something else)
  "cursed curses chased chases attacked attacks captures kidnaps kidnapping steals stealing rescued rescues saved saves " +
  "frees freed helps helped found finds dances danced dancing jumped jumps fought fights fighting battles hides hidden " +
  "takes taken locks trapping carries carried dragons trolls robots wizards witches kings friendly " +
  "twig wooden puppet carved workshop toymaker noodle sock socks laundry washing liar fibs truth peekaboo twin " +
  "telling tells told keeps wants lost play plays playing lies lying").split(" ");
function editDistance(a, b) {
  // (Damerau: a swap of neighbouring letters, "lonley", counts as one slip)
  const d = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
    }
  }
  return d[a.length][b.length];
}
function correct(word) {
  if (word.length < 4 || VOCAB.includes(word)) return word;
  if (word === "princes" || word === "prinses") return "princess"; // (the most common slip)
  let best = word, bestD = word.length >= 7 ? 2 : 1;
  for (const v of VOCAB) { if (Math.abs(v.length - word.length) > bestD) continue; const dd = editDistance(word, v); if (dd < bestD || (dd === bestD && best === word)) { if (dd <= bestD) { best = v; bestD = dd; } } }
  return best;
}

// read a story written in plain words: who does what to whom
const CHAR_KW = { ...Object.fromEntries(Object.entries(VILLAINS).map(([k, v]) => [k, v.kw])), princess: CAPTIVES.princess.kw, king: CAPTIVES.king.kw };
const CAPTURE = /\b(captur\w*|kidnap\w*|took|taken|take|takes|stole|steal\w*|stolen|trapp?\w*|locked|locks|lock|caught|catch\w*|carried|carry|carries|imprison\w*|grabb?\w*|snatch\w*|hid|hidden|chased|attack\w*|cursed)\b/g;
const RESCUE = /\b(rescue\w*|save\w*|saving|free|frees|freed|help\w*|find|finds|found)\b/g;
function mentionsIn(sentence) {
  const out = [];
  for (const [id, re] of Object.entries(CHAR_KW)) {
    const g = new RegExp(re.source, "g");
    let m; while ((m = g.exec(sentence))) out.push({ id, i: m.index, end: m.index + m[0].length });
  }
  return out.sort((a, b) => a.i - b.i);
}
function rolesIn(t) {
  let villain = null, captive = null;
  for (const sentence of t.split(/[.!?;]+/)) {
    const ms = mentionsIn(sentence);
    if (!ms.length) continue;
    let m; const cap = new RegExp(CAPTURE.source, "g");
    while ((m = cap.exec(sentence))) {
      const v = m.index, after = sentence.slice(m.index + m[0].length);
      const before = ms.filter((x) => x.end <= v), next = ms.filter((x) => x.i > v);
      const passive = /\b(was|were|is|are|been|got|get|gets|being)\s+(\w+\s+)?$/.test(sentence.slice(0, v)) || /^\s*(away\s+)?by\b/.test(after);
      if (passive) {
        // "the dragon was captured by the pirates"
        const agent = next.find((x) => VILLAINS[x.id]);
        if (!captive && before.length) captive = before[before.length - 1].id;
        if (!villain && agent) villain = agent.id;
      } else {
        // "the pirates captured the dragon"
        const subj = [...before].reverse().find((x) => VILLAINS[x.id]);
        if (!villain && subj) villain = subj.id;
        if (!captive && next.length && next[0].id !== villain) captive = next[0].id;
      }
    }
    const res = new RegExp(RESCUE.source, "g");
    while ((m = res.exec(sentence))) {
      const obj = ms.find((x) => x.i > m.index && x.id !== villain);
      if (!captive && obj) captive = obj.id; // "Sir Pip must rescue the wizard"
    }
  }
  return { villain, captive };
}
export function parseStory(text) {
  const raw = String(text || "");
  const t = ` ${raw.toLowerCase().replace(/[a-z]+/g, correct)} `;
  const find = (table) => Object.entries(table).map(([k, v]) => [k, t.search(v.kw)]).filter(([, i]) => i >= 0).sort((a, b) => a[1] - b[1]).map(([k]) => k);
  let { villain, captive } = rolesIn(t);
  const places = find(PLACES);
  // no villain named? the first villain-type character who isn't the captive, or whoever lives there
  if (!villain) villain = mentionsIn(t).map((x) => x.id).find((id) => VILLAINS[id] && id !== captive) || null;
  if (!villain) villain = Object.entries({ cave: "marlo", bridge: "troll", ship: "pirate", forest: "wizard", tower: "clank", workshop: "twig", laundry: "noodle" }).find(([pl]) => pl === places[0])?.[1] || (captive === "marlo" ? "pirate" : "marlo");
  if (captive === villain) captive = null;
  const place = places[0] || DEFAULT_PLACE[villain];
  let plot;
  if (captive) plot = "kidnap";
  else if (EXTRA_KW.find.test(t) || /\b(stole|steal\w*|thief)\b/.test(t)) plot = "steal";
  else if (/\b(lonely|sad|friend\w*|kind|kindness|befriend|hug|cry\w*|alone)\b/.test(t)) plot = "lonely";
  else plot = "trouble";
  // the challenges, in the order you wrote them (up to two)
  const asked = CHALLENGE_KW.map(([k, re]) => [k, t.search(re)]).filter(([, i]) => i >= 0).sort((a, b) => a[1] - b[1]).map(([k]) => k);
  let challenges = asked.filter((c) => c !== "dance").slice(0, 2).map((c) => fitChallenge(c, villain, place));
  challenges = [...new Set(challenges)];
  if (!challenges.length) challenges = [fitChallenge(DEFAULT_CHALLENGE[villain], villain, place)];
  const extras = Object.entries(EXTRA_KW).filter(([, re]) => re.test(t)).map(([k]) => k);
  const twist = /\b(night|midnight|dark)\b/.test(t) ? "night" : null;
  const friendly = FRIEND_END.test(t);
  return { villain, place, captive, plot, challenge: challenges[0], challenges, extras, friendly, twist, text: raw.trim() };
}

// a full chapter (storybook pages + acts) from a parsed story
export function buildStory(p) {
  const V = VILLAINS[p.villain];
  const C = p.captive ? CAPTIVES[p.captive] : null;
  const title = C ? `The Rescue of ${C.title}` : `Sir Pip and ${V.title}`;
  const pages = [
    `Once upon a time, ${V.np} lived ${PLACES[p.place].phrase}.`,
    PLOT[p.plot](V, p.captive),
    p.plot === "kidnap" ? (p.captive === "princess" ? QUEST.her : p.captive === "king" ? QUEST.him : QUEST.rescue) : p.plot === "steal" ? QUEST.treasure : p.plot === "lonely" ? QUEST.friend : QUEST.trouble,
  ];
  const villainFig = p.villain;
  const art = [
    { set: p.place, cast: [[villainFig, 0.5]] },
    { set: p.place, night: p.plot !== "lonely", cast: p.captive ? [[villainFig, 0.32], [p.captive === "marlo" ? "marlo" : p.captive, 0.7, true]] : p.plot === "steal" ? [[villainFig, 0.4], ["musicbox", 0.7]] : [[villainFig, 0.5]] },
    { set: "courtyard", cast: [["pip", 0.5]] },
  ];
  const acts = [];
  const ex = new Set(p.extras || []);
  if (p.plot === "lonely") {
    acts.push(ACT.gentle(V));
    if (ex.has("dark")) acts.push(ACT.lantern(), ACT.fireflies());
    acts.push(ACT.flower(V));
    acts.push(ex.has("highfive") ? ACT.highfive(V) : ACT.dance());
    acts.push(ACT.friends());
  } else {
    if (ex.has("dark")) acts.push(ACT.lantern());
    acts.push(ACT.meet(V));
    for (const c of p.challenges || [p.challenge]) {
      if (c === "duel") acts.push(ACT.sword(), ACT.duel());
      else acts.push(ACT[c](V));
    }
    if (ex.has("dark") && acts.length < 4) acts.push(ACT.fireflies());
    if (p.plot === "steal" || (ex.has("find") && acts.length < 5)) acts.push(ACT.find());
    if (p.captive === "princess" && p.place === "tower") acts.push(ACT.unlock());
    // making friends at the end: the gift, the high five or the dance you wrote about
    if (p.friendly) {
      if (ex.has("flower")) acts.push(ACT.flower(V));
      if (ex.has("highfive")) acts.push(ACT.highfive(V));
      if (ex.has("dance") || (!ex.has("flower") && !ex.has("highfive"))) acts.push(ACT.dance());
    } else if (ex.has("dance") && acts.length < 5) acts.push(ACT.dance());
    acts.push(p.friendly ? ACT.friends() : ACT.saved());
  }
  // Twig, once he's owned up, wants dancing lessons; a sock puppet can't do a marionette's
  // tricks (a gentle approach, high fives, dancing on strings), so it plays its own games
  if (p.villain === "twig" && acts.some((a) => a.task?.type === "fib") && (p.friendly || p.plot === "lonely")) acts.splice(acts.length - 1, 0, ACT.teach(V));
  if (p.villain === "noodle") {
    const own = p.place === "laundry" ? ["peekaboo", "matchsock"] : ["peekaboo"];
    for (let i = 0; i < acts.length; i++) {
      const tt = acts[i].task?.type, ck = acts[i].check;
      if (tt === "shy") acts[i] = ACT.meet(V);
      else if (["highfive", "together", "duel", "dodge", "simon", "riddle", "mirror"].includes(tt) || ck === "give:flower" || ck === "hold:sword") acts[i] = ACT[own[i % own.length]](V);
    }
    for (let i = acts.length - 1; i > 0; i--) if (acts[i].task && acts[i].task.type === acts[i - 1].task?.type) acts.splice(i, 1);
  }
  while (acts.length > 6) acts.splice(acts.length - 2, 1); // (a show is never too long)
  return {
    id: "custom", custom: p, set: p.place, guest: p.villain, title,
    intro: `Tonight's story: ${title}.`,
    pages, art, acts,
    princess: p.captive === "princess" && p.place === "tower", // the tower's cage and key
    captive: p.captive,
    twist: p.twist || null,
    night: p.twist === "night",
  };
}

// every sentence the story maker can say, for the voice builder
export function allStoryLines() {
  const out = new Set();
  for (const V of Object.values(VILLAINS)) {
    for (const P of Object.values(PLACES)) out.add(`Once upon a time, ${V.np} lived ${P.phrase}.`);
    for (const c of Object.keys(CAPTIVES)) out.add(PLOT.kidnap(V, c));
    out.add(PLOT.steal(V)); out.add(PLOT.lonely(V)); out.add(PLOT.trouble(V));
    out.add(`Tonight's story: Sir Pip and ${V.title}.`);
    for (const a of Object.values(ACT)) out.add(a(V).goal);
  }
  Object.values(QUEST).forEach((l) => out.add(l));
  for (const C of Object.values(CAPTIVES)) out.add(`Tonight's story: The Rescue of ${C.title}.`);
  out.add("Well dodged! They're all out of puff.");
  return [...out];
}

// The story cards (in the headset, where there's no keyboard): the same story, picked
// from cards instead of written.
export const CARD_SECTIONS = [
  { id: "villain", title: "Villain", items: [["marlo", "Marlo"], ["clank", "Clank"], ["troll", "Grumble"], ["pirate", "Pegg"], ["wizard", "Bramble"], ["twig", "Twig"], ["noodle", "Noodle"]] },
  { id: "captive", title: "Who needs help", items: [["princess", "The princess"], ["king", "The King"], ["marlo", "Marlo"], ["wizard", "Bramble"], ["troll", "Grumble"], ["twig", "Twig"], ["treasure", "The treasure"], ["none", "Nobody"]] },
  { id: "place", title: "Setting", items: [["cave", "Dragon cave"], ["ship", "Pirate ship"], ["tower", "Clock tower"], ["forest", "Forest"], ["bridge", "Troll bridge"], ["courtyard", "Castle"], ["sky", "Night sky"], ["workshop", "Workshop"], ["laundry", "Laundry"]] },
  { id: "challenge", title: "Challenge", items: [["dodge", "Dodge attacks"], ["duel", "Sword duel"], ["riddle", "Riddle"], ["spell", "Magic spell"], ["dance", "Dance-off"], ["befriend", "Make friends"], ["fib", "True or fib"], ["peekaboo", "Peekaboo"]] },
  { id: "twist", title: "Twist", items: [["none", "No twist"], ["moon", "Moon gravity"], ["fragile", "Fragile strings"], ["night", "At night"]] },
  { id: "go", title: "Stage it!", action: true, items: [] },
];
export function storyFromCards(c) {
  const villain = c.villain || "marlo";
  let plot = CAPTIVES[c.captive] && c.captive !== villain ? "kidnap" : c.captive === "treasure" ? "steal" : "trouble";
  let challenge = c.challenge || DEFAULT_CHALLENGE[villain];
  if (challenge === "befriend") { plot = "lonely"; challenge = DEFAULT_CHALLENGE[villain]; }
  challenge = fitChallenge(challenge, villain, c.place || DEFAULT_PLACE[villain]); // (the riddles are the troll's, the fibs Twig's...)
  return { villain, place: c.place || DEFAULT_PLACE[villain], captive: plot === "kidnap" ? c.captive : null, plot, challenge, challenges: [challenge], extras: [], friendly: plot === "lonely", twist: c.twist && c.twist !== "none" ? c.twist : null, text: "" };
}

export const STORY_EXAMPLES = [
  "The dragon kidnapped the princess and took her to his cave. Sir Pip must rescue her!",
  "A grumpy troll stole the kingdom's treasure and hid under the bridge.",
  "The clockwork robot locked the princess in his tower.",
  "A lonely wizard in the forest just wants a friend.",
  "Pirates captured the King! Sir Pip must fight the captain.",
  "A wooden puppet in the toymaker's workshop keeps telling fibs.",
  "A sock puppet lost its twin in the laundry, and wants to play peekaboo.",
];
export const titleCase = cap1;
