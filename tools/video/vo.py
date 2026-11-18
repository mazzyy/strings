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
    # the video is told as the game's own bedtime story: the plot carries you from stage to
    # stage, and each thing you can do arrives as a moment in that story, shown, not claimed
    "open":    "Once upon a time, in a kingdom no bigger than a desk,",
    "tale1":   "a princess wound a little golden music box every night, and everyone fell asleep smiling.",
    "tale2b":  "Until a lonely clockwork robot carried her off, and hid the music box's jewels.",
    "tale3":   "It needed a hero. It got Sir Pip.",
    "hands":   "Sir Pip is a marionette, and his strings are in your hands. Pinch the gold cord, pull, and the curtain rises.",
    "pip":     "No controllers, no buttons. Lift your hand, and he walks. Tip your wrist, and he bows. Flick, and he leaps.",
    "strings": "Every string is real physics. Let him drop, and down he goes, so Marlo falls over too, and the audience loves it.",
    "cast2":   "And you never perform alone. A robot puppeteer works the rest of the cast.",
    "shy1":    "Rush at Marlo, and he hides.",
    "shy2":    "Come back gently, and he's your friend.",
    "talk":    "Poke a bubble to talk, and he answers.",
    "notes":   "How you play decides the ending. The critics review it, and Marlo keeps notes on you.",
    "road":    "To bring the music back, Sir Pip must cross the whole kingdom.",
    "forest":  "Through a forest, where a wizard has lost his fireflies, and his way.",
    "workshop": "Past a toymaker's workshop, where Twig's nose grows with every fib.",
    "ship":    "Aboard a pirate ship, whose captain only sails for a duel.",
    "laundry": "At the harbour, the robot slips a sock on his own hand, and up pops Noodle.",
    "bridge":  "Over a bridge, where a troll lets no one pass without a riddle.",
    "tower":   "Into a clockwork tower in the storm, past the searchlight, to the princess.",
    "cave":    "And deep into a dragon's cave. Lucky for Pip, it's Marlo's home.",
    "sky":     "Then Clank snatches the music box one last time. So you climb onto a dragon's back, and fly.",
    "kind":    "But this was never a story about beating a villain. Clank isn't wicked. He's lonely. So the bravest thing a knight can do, is bow.",
    "after":   "From that night on, the music box played every evening. And Clank wound its key himself.",
    "free":    "When the show is over, your applause sets Marlo free, and he lands in your open hand.",
    "mystory": "Or make your own story: pick a villain, someone to rescue, a place and a twist, and the theatre stages it, fully voiced.",
    "anyone":  "Or play as anyone. All seated, hands only, and one hand is enough.",
    "end2":    "Strings. A marionette theatre for your hands, in VR, or right on your real desk. Pull the cord. The show is yours.",
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
