# Recording character sounds

Short, wordless sounds (giggles, gasps, grunts) make the characters feel alive. The
game already knows *when* each character feels something; it just needs the sounds.
Any character without a recording keeps its current placeholder sound.

## How to record
- A phone's voice recorder is fine. Find a quiet room, hold the phone about 20 cm away.
- Each sound: **0.3 to 1.5 seconds**. Record **2 or 3 takes** of each, slightly different.
- No words needed (a word or two is fine, e.g. troll "Hrmph!").
- Any format works (m4a, wav, mp3). Name them like `marlo_happy_1.m4a`, or just put
  them in a folder per character and say which is which.
- Send them over: they get trimmed, loudness-matched, optionally pitched (dragon higher,
  troll deeper), converted and wired in.

## Marlo the dragon (young, playful, small: think an excited puppy that's also a dragon)
| Emotion | When it plays | Sound idea |
|---|---|---|
| happy | dancing, cheering, copying you | a delighted trill or coo |
| laugh | Sir Pip falls (third time), slapstick | a giggle |
| excited | jumping, the fireworks | a squeal, "woo!" |
| greet | waving, bowing, coming over | a bright chirrup, "hiya!" |
| surprised | something unexpected | a little gasp, "oh!" |
| scared | you rush at him (he hides), swords | a worried "eep" or whimper |
| sad | sulking when ignored | a soft whine or sigh |
| hurt | his crash landing, a bump | "oof!" |
| sleepy | dozing off | a yawn |

## Grumble the troll (big, slow, grumpy, secretly soft)
| Emotion | When it plays | Sound idea |
|---|---|---|
| angry | swords near him, being annoyed | a growl, "Hrrmph!" |
| greet | waving, bowing | a low grunt, "Hrm." |
| laugh | slapstick | a deep chuckle, "huh-huh-huh" |
| happy | a gift, dancing | a warm, low "Mmm!" |
| surprised | something unexpected | "Huh?!" |
| sad | sulking | a grumbly sigh |
| hurt | a bump | "Oof." |
| sleepy | dozing | a snore or big yawn |

## Under the hood
Files live in `public/audio/voices/` as `<character>_<emotion>.mp3`, `<character>_<emotion>_2.mp3`, …
and are listed in `public/audio/voices/index.json`, e.g.
`{ "marlo": { "happy": 3, "laugh": 2 }, "troll": { "angry": 2 } }`.
The same works for the other characters too (`wizard`, `pirate`, `clank`, `princess`, `king`).
