"""Records the demo video's voice-over with Kokoro (a natural neural voice), one WAV per line.
    tts/.venv/bin/python tools/video/vo.py <outdir> [voice] [speed]
Writes <outdir>/<key>.wav and <outdir>/vo.json ({key: {text, secs}}).
"""
import json, sys
from pathlib import Path
import numpy as np, soundfile as sf
sys.path.insert(0, str(Path(__file__).resolve().parents[2] / "tts"))
from voice import Speaker

LINES = {
    "open":    "Every puppet theatre needs a puppeteer. Tonight, it's you.",
    "what":    "This is Strings: a marionette theatre you play with nothing but your hands. Pinch the gold cord, pull, and the curtain rises.",
    "pip":     "Sir Pip hangs from your fingers on real, simulated strings. Lift your hand, and he walks. Tip your wrist, and he bows. Flick, and he jumps.",
    "ai":      "And you never perform alone. A robot puppeteer works the other marionettes. Each one has a mood, a memory, and a voice of its own. They answer what you do, and they remember it.",
    "book":    "A storybook leads you through seven chapters,",
    "stories": "and every chapter has a story of its own.",
    "each":    "Each one has its own stage, and its own game.",
    "forest":  "Catch fireflies in a whispering forest.",
    "ship":    "Duel a pirate captain.",
    "bridge":  "Answer a troll's riddle.",
    "tower":   "Sneak through a clockwork tower, in a storm.",
    "cave":    "Hunt for jewels in a dragon's cave.",
    "sky":     "Then climb onto a dragon's back, and fly.",
    "free":    "And when the story ends, your applause sets him free. Marlo snaps his strings, flies out of the theatre, and lands on your open hand.",
    "more":    "Stage stories of your own. Play as any character. Use just one hand, if you like.",
    "end":     "Strings. Hands only, seated, and running right in your headset's browser. Pull the cord. The show is yours.",
}

def main():
    out = Path(sys.argv[1]); out.mkdir(parents=True, exist_ok=True)
    voice = sys.argv[2] if len(sys.argv) > 2 else "af_heart"
    speed = float(sys.argv[3]) if len(sys.argv) > 3 else 0.95
    spk = Speaker(voice, speed)
    meta = {}
    old = json.loads((out / "vo.json").read_text()) if (out / "vo.json").exists() else {}
    for key, text in LINES.items():
        # (a line already recorded with the same words is kept as it is)
        if old.get(key, {}).get("text") == text and (out / f"{key}.wav").exists():
            meta[key] = old[key]; continue
        samples, sr = spk.k.create(text, voice=voice, speed=speed, lang="en-gb" if voice.startswith("b") else "en-us")
        samples = np.asarray(samples, dtype=np.float32)
        # trim silence at both ends, then a soft fade so nothing clicks
        loud = np.where(np.abs(samples) > 0.01)[0]
        if len(loud): samples = samples[max(0, loud[0] - int(sr * 0.03)): min(len(samples), loud[-1] + int(sr * 0.12))]
        n = int(sr * 0.01); samples[:n] *= np.linspace(0, 1, n); samples[-n:] *= np.linspace(1, 0, n)
        peak = float(np.abs(samples).max()) or 1.0
        samples = samples / peak * 0.89
        sf.write(out / f"{key}.wav", samples, sr, subtype="PCM_16")
        meta[key] = {"text": text, "secs": round(len(samples) / sr, 2)}
        print(key, meta[key]["secs"])
    (out / "vo.json").write_text(json.dumps(meta, indent=1))
    print("total", round(sum(m["secs"] for m in meta.values()), 1), "s")

if __name__ == "__main__":
    main()
