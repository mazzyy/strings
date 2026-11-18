"""Marlo the dragon in Qwen3-TTS: a test voice, recorded beside the Kokoro one (which stays).

Qwen3-TTS VoiceDesign (Apache-2.0) speaks from a written description, so every line gets the
same description of Marlo's voice plus the feeling of that line ("excited", "sleepy"...).

    ../qwen-tts/.venv/bin/python tts/build_qwen_marlo.py              # every Marlo line
    ../qwen-tts/.venv/bin/python tts/build_qwen_marlo.py --only 5     # just the first five
    ../qwen-tts/.venv/bin/python tts/build_qwen_marlo.py --redo "Copy me!" --seed 7

Writes public/voice-qwen/<hash>.mp3 and public/voice-qwen/manifest.json:
  {"model", "voice", "lines": {text: file}, "files": {kokoro file: qwen file}}
The game plays them instead of Marlo's Kokoro clips with ?marlo=qwen in the address.
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

# Marlo's voice: the same description for every line
VOICE = ("A small, friendly cartoon dragon in a children's puppet show. A young boy's voice, "
         "bright, light and a little squeaky, with a soft rasp; warm, cheeky and lovable. "
         "Natural, lively American English, very expressive.")

# how each line feels (anything not listed: cheerful and lively)
FEEL = {
    "Hello! Hello! Oh, I love visitors!": "thrilled and excited, bubbling over with joy at meeting someone new",
    "A dance? Watch this!": "excited and playful, showing off",
    "A bow, for you, good sir!": "proud and theatrical, very polite",
    "Wheee! Again, again!": "giddy, squealing with glee",
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
    "Woo-hoo! We're flying!": "exhilarated, whooping with joy",
    "There he is! After him!": "urgent, determined and excited",
    "Best adventure ever!": "overjoyed and breathless",
    "I'm free! Wheeee!": "ecstatic, squealing with joy",
    "Your hand is so warm!": "tender and full of wonder, soft",
    "Back to my strings. See you at the next show!": "content, a warm farewell, a little wistful",
}

def instruct_for(text):
    return f"{VOICE} Emotion: {FEEL.get(text, 'cheerful and lively')}."

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
    ap.add_argument("--only", type=int, default=0, help="record just the first N lines")
    ap.add_argument("--redo", action="append", default=[], help="record this line again (with --seed)")
    ap.add_argument("--seed", type=int, default=1234)
    ap.add_argument("--rms", type=float, default=0.11, help="loudness to match (the Kokoro clips' level)")
    a = ap.parse_args()

    lines = [l["text"] for l in json.loads(subprocess.check_output(["node", str(ROOT / "tts" / "export_lines.mjs")])) if l["who"] == "marlo"]
    if a.only: lines = lines[:a.only]
    kokoro = json.loads((ROOT / "public" / "voice" / "manifest.json").read_text())["lines"]
    OUT.mkdir(parents=True, exist_ok=True)
    man_path = OUT / "manifest.json"
    old = json.loads(man_path.read_text()) if man_path.exists() else {"lines": {}, "seeds": {}}
    seeds = old.get("seeds", {})
    for t in a.redo: seeds[t] = a.seed

    device = "mps" if torch.backends.mps.is_available() else "cpu"
    t0 = time.time()
    tts = Qwen3TTSModel.from_pretrained(MODEL, device_map=device, dtype=torch.bfloat16 if device == "mps" else torch.float32, attn_implementation="sdpa")
    print(f"model loaded on {device} in {time.time() - t0:.0f} s")

    man = {}
    for i, text in enumerate(lines):
        seed = seeds.get(text, 1234)
        ins = instruct_for(text)
        name = hashlib.sha1(f"{MODEL}|{seed}|{ins}|{text}".encode()).hexdigest()[:12] + ".mp3"
        path = OUT / name
        if not path.exists():
            t1 = time.time()
            torch.manual_seed(seed)
            wavs, sr = tts.generate_voice_design(text=text, language="English", instruct=ins)
            wav = trim(np.asarray(wavs[0], dtype=np.float32), sr)
            path.write_bytes(to_mp3(wav, sr, a.rms))
            print(f"[{i + 1}/{len(lines)}] {len(wav) / sr:4.1f} s in {time.time() - t1:4.1f} s  {text}", flush=True)
        else:
            print(f"[{i + 1}/{len(lines)}] (kept)  {text}", flush=True)
        man[text] = name
    if not a.only:  # remove clips no longer used
        keep = set(man.values())
        for f in OUT.glob("*.mp3"):
            if f.name not in keep: f.unlink()
    files = {kokoro[t]: f for t, f in man.items() if t in kokoro}
    man_path.write_text(json.dumps({"model": MODEL, "voice": VOICE, "lines": man, "files": files,
                                    "feels": {t: FEEL.get(t, "cheerful and lively") for t in man},
                                    "seeds": {t: s for t, s in seeds.items() if t in man}}, indent=1))
    print(f"{len(man)} lines in {time.time() - t0:.0f} s, {sum(f.stat().st_size for f in OUT.glob('*.mp3')) / 1e6:.1f} MB")

if __name__ == "__main__":
    main()
