"""Pre-record every built-in narrator line with Kokoro (a natural neural voice),
so the hosted build speaks with a human-sounding voice with no server at all.

    tts/.venv/bin/python tts/build_voice.py            # uses the default voice
    tts/.venv/bin/python tts/build_voice.py bm_george  # pick another narrator voice
    tts/.venv/bin/python tts/build_voice.py af_heart bf_lily  # ...and Marlo's voice

Writes public/voice/<hash>.mp3 and public/voice/manifest.json ({text: file}).
"""
import hashlib, json, os, subprocess, sys
from pathlib import Path
from voice import Speaker

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "public" / "voice"

def main():
    voice = sys.argv[1] if len(sys.argv) > 1 else None
    marlo_voice = sys.argv[2] if len(sys.argv) > 2 else "am_puck"
    lines = json.loads(subprocess.check_output(["node", str(ROOT / "tts" / "export_lines.mjs")]))
    OUT.mkdir(parents=True, exist_ok=True)
    spk = Speaker(voice)
    # each character has their own voice (and pace)
    cast = {
        "narrator": (spk.voice, None),
        "marlo": (marlo_voice, None),
        "wizard": ("bm_george", 0.88),   # an unhurried old wizard
        "pirate": ("am_fenrir", 1.02),   # a boisterous captain
        "troll": ("am_onyx", 0.84),      # a slow, deep, grumpy troll
        "clank": ("am_echo", 0.92),      # a clipped, menacing robot (still a human voice)
        "princess": ("af_bella", 1.0),   # Princess Juniper
        "king": ("bm_lewis", 0.9),       # the King, warm and stately
    }
    manifest = {}
    for i, item in enumerate(lines):
        text, who = item["text"], item["who"]
        v, speed = cast.get(who, cast["narrator"])
        tag = f"{v}" if speed is None else f"{v}@{speed}"
        name = hashlib.sha1(f"{spk.model}|{tag}|{text}".encode()).hexdigest()[:12] + ".mp3"
        path = OUT / name
        if not path.exists():
            path.write_bytes(spk.mp3(text, v, speed))
        manifest[text] = name
        print(f"[{i + 1}/{len(lines)}] {text}")
    # remove clips that are no longer used
    keep = set(manifest.values())
    for f in OUT.glob("*.mp3"):
        if f.name not in keep:
            f.unlink()
    (OUT / "manifest.json").write_text(json.dumps({"voice": spk.voice, "marlo": marlo_voice, "lines": manifest}, indent=1))
    size = sum(f.stat().st_size for f in OUT.glob("*.mp3"))
    print(f"{len(manifest)} lines, {size / 1e6:.1f} MB, voice {spk.voice}")

if __name__ == "__main__":
    main()
