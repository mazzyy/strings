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
    manifest = {}
    for i, item in enumerate(lines):
        text, who = item["text"], item["who"]
        v = marlo_voice if who == "marlo" else spk.voice
        name = hashlib.sha1(f"{spk.model}|{v}|{text}".encode()).hexdigest()[:12] + ".mp3"
        path = OUT / name
        if not path.exists():
            path.write_bytes(spk.mp3(text, v))
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
