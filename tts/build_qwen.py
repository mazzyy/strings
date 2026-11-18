"""Characters' voices in Qwen3-TTS, recorded with feeling, beside the Kokoro ones (which stay).

Qwen3-TTS VoiceDesign (Apache-2.0) speaks from a written description, so each character has one
description of their voice (CAST), and every line adds its own feeling (FEEL: "excited", "sleepy"...).
Voiced so far: Marlo the dragon, Princess Juniper, and the sock puppets Noodle and Doodle.

    ../qwen-tts/.venv/bin/python tts/build_qwen.py                   # every line of the cast
    ../qwen-tts/.venv/bin/python tts/build_qwen.py --who noodle      # one character
    ../qwen-tts/.venv/bin/python tts/build_qwen.py --redo "Copy me!" --seed 7

Writes public/voice-qwen/<hash>.mp3 and public/voice-qwen/manifest.json:
  {"model", "voices": {who: description}, "lines": {text: file}, "who": {text: who},
   "feels": {text: feeling}, "files": {kokoro file: qwen file}, "seeds": {text: seed}}
The game plays them instead of the Kokoro clips with ?voices=qwen in the address.
The model (Qwen/Qwen3-TTS-12Hz-1.7B-VoiceDesign, 4.5 GB) comes from the Hugging Face cache.
"""
import argparse, hashlib, json, subprocess, time
from pathlib import Path
import numpy as np
import torch
import lameenc
from qwen_tts import Qwen3TTSModel

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "public" / "voice-qwen"
MODEL = "Qwen/Qwen3-TTS-12Hz-1.7B-VoiceDesign"
EN = "Natural, lively American English, very expressive."

# each character's voice (the same description for all their lines). Marlo and Noodle say
# "medium-low": with "light" or "bright" the model drifts into a woman's or a child's voice.
CAST = {
    "marlo": f"Male, a cheerful young man with a medium-low, warm voice and a hint of gravel, like a lovable cartoon dragon sidekick. {EN}",
    "princess": "Female, about 18 years old, a sweet, clear and bright soprano voice, warm and brave. She plays Princess Juniper in a children's puppet show. Natural, lively, expressive English.",
    "noodle": f"Male, a goofy, bouncy young man with a medium-low, slightly nasal, rubbery comic voice, full of giggles, like a silly cartoon sidekick. He plays Noodle, a striped sock puppet in a children's puppet show. {EN}",
    "doodle": f"Female, a goofy, bouncy, sing-song young woman's voice, a little nasal and full of giggles. She plays Doodle, a cheerful striped sock puppet, Noodle's twin. {EN}",
    "king": "Male, about 60 years old, a warm, deep and stately baritone, kind and proud, every word clear: a good old king in a children's puppet show. Natural, expressive British English.",
    # (these four speak in Qwen only at the curtain call, where everyone cheers at once)
    # Bramble: unlike anyone else in the cast, very old, breathy and mysterious, with a chuckle
    "wizard": "Male, a very old wizard of about 85: a thin, breathy, crackly voice, mysterious and twinkly, slow and wise, often with a soft chuckle in it, like a storyteller by a fire. Natural, expressive British English.",
    "pirate": f"Male, a big, boisterous pirate captain: a loud, hearty, rough voice with a booming laugh. {EN}",
    # Grumble: a big troll with a surprisingly high-pitched, loud, shouty voice
    "troll": f"Male, a big grumpy troll with a surprisingly high-pitched, loud, shouty voice: brash, squawky and bossy, every word nearly a shout. {EN}",
    "clank": f"Male, a small clockwork robot: a clipped, precise, slightly flat mechanical voice, very excited for once. {EN}",
    "twig": f"Male, a boy of about ten: a bright, quick, cheeky voice, a wooden puppet boy. {EN}",
}
# for these, only the lines listed are recorded in Qwen (their other lines keep their Kokoro voice)
ONLY = {
    "pirate": {"Three cheers for Sir Pip! Hip hip, hooray!"},
    "clank": {"Clank is happy. Beep! Very, very happy!"},
    "twig": {"Best show ever! And that's not a fib!"},
}

# how each line feels (anything not listed: cheerful and lively)
FEEL = {
    # Marlo
    "Hello! Hello! Oh, I love visitors!": "thrilled and excited, bubbling over with joy at meeting someone new",
    "A dance? Watch this!": "excited and playful, showing off",
    "A bow, for you, good sir!": "proud and theatrical, very polite",
    "Wheee! Again, again!": "giddy, laughing with glee",
    "Coming, coming!": "eager and cheerful, hurrying along",
    "Fine, fine. I'm going.": "sulky and a little disappointed, grumbling playfully",
    "Friends? Really? Best day ever!": "amazed, then overjoyed",
    "I'm Marlo. And you are very, very tall.": "friendly and cheeky, amused",
    "That's all right. Dragons don't hold grudges. Much.": "warm and forgiving, with a teasing little joke at the end",
    "Fire? Oh no, I only breathe warm air. And sparkles.": "amused and reassuring, a little giggly",
    "Hmm? Say that again, slower. I'm only a little dragon.": "puzzled and gentle, a bit sheepish",
    "Copy me!": "excited, bossy in a playful way",
    "Your turn! Do what I do!": "encouraging and playful",
    "Yes! Just like that!": "delighted, cheering",
    "Ha! Perfect!": "delighted, laughing",
    "Aww. Maybe next time.": "sympathetic and softly disappointed",
    "Whoa! Careful with that sword!": "startled and nervous, alarmed",
    "For me? Oh, thank you!": "surprised, touched and grateful",
    "Is that for me?": "hopeful, shy and curious",
    "Here. For you!": "warm, generous and proud",
    "Ooh, wait right there!": "excited, with a secret",
    "Hmph. Nobody plays with me.": "sulky and lonely, pouting",
    "Oh! You came back!": "surprised and overjoyed",
    "Yawn... just resting my eyes.": "sleepy and drowsy, yawning",
    "I'm awake! I'm awake!": "startled awake and flustered",
    "Ha ha! You fell again!": "laughing, teasing",
    "Oh no! Let me help!": "worried and urgent, caring",
    "Over here! Over here!": "excited, calling out loudly",
    "Like this. Watch!": "patient, showing how it's done",
    "Look, over there, by the edge of the stage!": "excited and curious, pointing something out",
    "Ta-da! All part of the show!": "proud, a showman's flourish",
    "Watch this, Sir Pip! A loop the loop!": "excited and boastful",
    "Oh! Um. Hello. I'm a little shy with new knights.": "shy, nervous and hesitant, quiet",
    "Is it safe? Come closer. But slowly.": "timid and cautious, almost whispering",
    "You're gentle. I like you!": "relieved, warm and happy",
    "Give me a high five, Sir Pip!": "excited and eager",
    "Ha! Best high fives in the whole kingdom!": "delighted and proud, laughing",
    "Let's jump together! On my count!": "excited and energetic",
    "Almost! Jump right when I say jump.": "encouraging and patient",
    "Fireworks! We did it together!": "triumphant and overjoyed",
    "The jewels! The music box can play again!": "amazed and overjoyed",
    "Thank you, Sir Pip. You're the best friend a dragon ever had.": "heartfelt, tender and grateful, a little emotional",
    "Hold on tight, Sir Pip!": "excited and determined",
    "Woo-hoo! We're flying!": "exhilarated, shouting with joy",
    "There he is! After him!": "urgent, determined and excited",
    "Best adventure ever!": "overjoyed and breathless",
    "I'm free! Wheeee!": "overjoyed and free at last, laughing with joy",
    "Your hand is so warm!": "tender and full of wonder, soft",
    "Back to my strings. See you at the next show!": "content, a warm farewell, a little wistful",
    # Princess Juniper
    "Help! Please, somebody help me!": "frightened and desperate, calling for help",
    "The key! Clank keeps it on the pedestal!": "urgent and hopeful, whispering a secret loudly",
    "My hero! Thank you, Sir Pip!": "overjoyed, relieved and grateful",
    "Look out! He's charging his zapper!": "alarmed, a sharp warning",
    "Hooray for Sir Pip!": "joyful, cheering",
    # Noodle
    "Ta-da! I meant to fall in the laundry basket.": "sheepish but proud, pretending it was on purpose",
    "Peekaboo!": "playful and teasing",
    "Over here! Peekaboo!": "playful, calling out and teasing",
    "Bet you can't catch me!": "cheeky and teasing",
    "Hee hee! That tickles!": "giggling helplessly",
    "Boop! Again, again!": "giddy and delighted",
    "Ha! You found me! Three boops!": "delighted and impressed, laughing",
    "Too slow! Wheee!": "cheeky, laughing as he gets away",
    "Look at my stripes! Red, yellow, green. Find the sock that matches!": "proud and helpful, explaining a game",
    "Nope! That one belongs to a grandma.": "amused, giggling",
    "Not that one! Look at my stripes!": "playfully impatient",
    "My twin! Doodle! You found Doodle!": "overjoyed, almost crying with happiness",
    "Thank you, Sir Pip! We're a pair again!": "grateful and happy",
    "Hooray for Sir Pip! You're a perfect fit!": "cheering, delighted with his own joke",
    "Copy me! Wiggle, wiggle!": "silly and excited",
    "Your turn! Wiggle!": "encouraging and silly",
    "Woo! You're good at this!": "impressed and cheerful",
    "Perfect! Sock-tacular!": "delighted, proud of the pun",
    "Aww. Never mind!": "kindly, a little disappointed",
    "Eek! Careful! Socks can rip!": "startled and nervous",
    "For me? I'll keep it in my mouth. That's where I keep everything.": "delighted, then matter-of-fact and silly",
    "Is that for me? Is it a snack?": "hopeful and hungry, curious",
    "Here! I found it in the wash.": "proud and generous",
    "Wait there! I'll dig something out!": "excited and busy",
    "Hmph. Nobody plays with a sock.": "sulky and lonely, pouting",
    "You're back! Wheee!": "overjoyed",
    "Yawn. Time to curl up in the sock drawer.": "sleepy and drowsy, yawning",
    "I'm up! I'm up! I'm a bit crumpled.": "startled awake and flustered, then sheepish",
    "Hee hee! You fell! Like a sock off a line!": "giggling and teasing",
    "Oh no! Are you all right, Sir Pip?": "worried and caring",
    "Over here! Over here! Down here!": "excited, calling out loudly",
    "Like this! Watch me wiggle!": "proud, showing off",
    "Look! By the edge! Go and get it!": "excited, pointing something out",
    "Hiya! I'm Noodle! I'm a sock! Well, mostly a sock.": "bubbly and silly, introducing himself",
    "Dance? I'll wiggle! Wiggle, wiggle, wiggle!": "silly and excited",
    "A bow? I can only fold in half. Like this!": "playful and proud",
    "Boing! Straight up out of my hole!": "bouncy and delighted",
    "Coming! Wheee!": "eager, laughing",
    "Okay! Back down the hole I go!": "cheerful and agreeable",
    "Friends? Best friends! Like a sock and a shoe!": "overjoyed",
    "I'm Noodle. I'm named after my hair.": "friendly and matter-of-fact, a little silly",
    "That's okay! I'm soft. Nothing hurts a sock.": "warm and forgiving, cheerful",
    "Fire? No thanks! I'd rather stay fluffy.": "alarmed, then giggly",
    "Huh? Sorry, I've got yarn in my ears.": "confused and apologetic, silly",
    # the King
    "Kneel, brave knight.": "solemn and kind, a gentle command",
    "For courage, for kindness, and for very good manners.": "proud and warm, slow and ceremonial",
    "I name you Sir Pip the Brave, Knight of the Music Box!": "grand and joyful, proclaiming to the whole court",
    "Let the music play!": "joyful, a happy royal command",
    # Bramble
    "Watch my spell carefully.": "mysterious and hushed, drawing you in",
    "Now you. Repeat my spell.": "encouraging and kindly",
    "Not quite. Watch again, young knight.": "patient and kind, a little amused",
    "Splendid! The spell works! You have the gift!": "delighted and amazed, chuckling",
    "My fireflies! Bless you, young knight!": "overjoyed and grateful, a little teary",
    "My owls know the way. Listen for their call.": "hushed and mysterious",
    "Behold! Exactly as I planned.": "grand, then a sly chuckle",
    # Grumble
    "Hmph! Correct. Grumble is impressed.": "grudgingly impressed, loud",
    "Wrong! Ha! Grumble asks again.": "gleeful and loud, gloating",
    "Hrm. That was part of show.": "embarrassed but loud, pretending",
    # the curtain call: everyone cheering at once
    "Splendid! Simply splendid!": "delighted, cheering, clapping his hands",
    "Three cheers for Sir Pip! Hip hip, hooray!": "roaring with joy, cheering loudly",
    "Grumble is happy. Don't tell anyone.": "grumpy but secretly very happy, a little embarrassed",
    "Clank is happy. Beep! Very, very happy!": "excited and happy, bouncing",
    "Best show ever! And that's not a fib!": "overjoyed, cheering, cheeky",
    # Doodle
    "Noodle! There you are! I've been hanging around all day!": "relieved and delighted, giggly",
    "La la la! Two odd socks, one even song!": "singing happily, playful",
}

# a character's usual feeling, for lines without their own
DEFAULT_FEEL = {"wizard": "warm, wise and gently amused", "troll": "grumpy, loud and bossy"}

def feel_of(who, text):
    return FEEL.get(text) or DEFAULT_FEEL.get(who, "cheerful and lively")

def instruct_for(who, text):
    return f"{CAST[who]} Emotion: {feel_of(who, text)}."

def trim(wav, sr, floor=0.012):
    """cut leading and trailing silence, keeping a few milliseconds either side"""
    loud = np.where(np.abs(wav) > floor)[0]
    if not len(loud): return wav
    a, b = max(0, loud[0] - int(sr * 0.03)), min(len(wav), loud[-1] + int(sr * 0.08))
    return wav[a:b]

def to_mp3(wav, sr, target_rms):
    wav = wav.astype(np.float32)
    rms = float(np.sqrt(np.mean(wav ** 2)) + 1e-9)
    wav = wav * (target_rms / rms)
    peak = float(np.max(np.abs(wav)) + 1e-9)
    if peak > 0.95: wav = wav * (0.95 / peak)
    wav = np.concatenate([wav, np.zeros(int(sr * 0.15), dtype=np.float32)])  # a breath at the end, as the Kokoro clips have
    pcm = (np.clip(wav, -1, 1) * 32767).astype(np.int16).tobytes()
    enc = lameenc.Encoder()
    enc.set_bit_rate(64); enc.set_in_sample_rate(sr); enc.set_channels(1); enc.set_quality(2)
    return enc.encode(pcm) + enc.flush()

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--who", action="append", default=[], help="only these characters (default: the whole cast)")
    ap.add_argument("--redo", action="append", default=[], help="record this line again (with --seed)")
    ap.add_argument("--seed", type=int, default=1234)
    ap.add_argument("--rms", type=float, default=0.11, help="loudness to match (the Kokoro clips' level)")
    a = ap.parse_args()

    every = [(l["text"], l["who"]) for l in json.loads(subprocess.check_output(["node", str(ROOT / "tts" / "export_lines.mjs")]))
             if l["who"] in CAST and (l["who"] not in ONLY or l["text"] in ONLY[l["who"]])]
    todo = [(t, w) for t, w in every if not a.who or w in a.who]
    kokoro = json.loads((ROOT / "public" / "voice" / "manifest.json").read_text())["lines"]
    OUT.mkdir(parents=True, exist_ok=True)
    man_path = OUT / "manifest.json"
    old = json.loads(man_path.read_text()) if man_path.exists() else {}
    seeds = old.get("seeds", {})
    for t in a.redo: seeds[t] = a.seed

    device = "mps" if torch.backends.mps.is_available() else "cpu"
    t0 = time.time()
    tts = Qwen3TTSModel.from_pretrained(MODEL, device_map=device, dtype=torch.bfloat16 if device == "mps" else torch.float32, attn_implementation="sdpa")
    print(f"model loaded on {device} in {time.time() - t0:.0f} s")

    lines = {t: f for t, f in old.get("lines", {}).items() if t in dict(every)}  # keep the other characters' takes
    for i, (text, who) in enumerate(todo):
        seed = seeds.get(text, 1234)
        ins = instruct_for(who, text)
        name = hashlib.sha1(f"{MODEL}|{seed}|{ins}|{text}".encode()).hexdigest()[:12] + ".mp3"
        path = OUT / name
        if not path.exists():
            t1 = time.time()
            torch.manual_seed(seed)
            wavs, sr = tts.generate_voice_design(text=text, language="English", instruct=ins)
            wav = trim(np.asarray(wavs[0], dtype=np.float32), sr)
            path.write_bytes(to_mp3(wav, sr, a.rms))
            print(f"[{i + 1}/{len(todo)}] {who:8s} {len(wav) / sr:4.1f} s in {time.time() - t1:4.1f} s  {text}", flush=True)
        else:
            print(f"[{i + 1}/{len(todo)}] {who:8s} (kept)  {text}", flush=True)
        lines[text] = name
    keep = set(lines.values())  # remove clips no longer used
    for f in OUT.glob("*.mp3"):
        if f.name not in keep: f.unlink()
    who_of = dict(every)
    man_path.write_text(json.dumps({
        "model": MODEL, "voices": CAST, "lines": lines,
        "who": {t: who_of[t] for t in lines},
        "feels": {t: feel_of(who_of[t], t) for t in lines},
        "files": {kokoro[t]: f for t, f in lines.items() if t in kokoro},
        "seeds": {t: s for t, s in seeds.items() if t in lines},
    }, indent=1))
    print(f"{len(lines)} lines in {time.time() - t0:.0f} s, {sum(f.stat().st_size for f in OUT.glob('*.mp3')) / 1e6:.1f} MB")

if __name__ == "__main__":
    main()
