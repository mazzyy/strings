"""The demo video's voice-over in Qwen3-TTS (VoiceDesign): the same lines as vo.py, read by a warm
storyteller with a feeling for each line. Same output as vo.py, so edit.mjs can use either.
    ../qwen-tts/.venv/bin/python tools/video/vo_qwen.py <outdir>
Writes <outdir>/<key>.wav and <outdir>/vo.json ({key: {text, secs}}).
"""
import ast, json, sys, time
from pathlib import Path
import numpy as np, soundfile as sf, torch
from qwen_tts import Qwen3TTSModel

HERE = Path(__file__).resolve().parent
# the lines themselves come from vo.py (one script, two voices)
LINES = ast.literal_eval(next(n.value for n in ast.parse((HERE / "vo.py").read_text()).body if isinstance(n, ast.Assign) and n.targets[0].id == "LINES"))

VOICE = ("Female, about 35 years old, a warm, gentle storyteller reading a bedtime story aloud to children: a clear, smiling, "
         "expressive voice, unhurried, with a sense of wonder. Natural, expressive British English.")
FEEL = {
    "open": "hushed wonder, beginning a fairy tale",
    "tale1": "tender and warm",
    "tale2b": "a little ominous, then sad",
    "tale3": "playful, with a smile",
    "hands": "inviting and excited, like revealing a secret",
    "pip": "playful and confident",
    "strings": "amused, a little mischievous",
    "cast2": "warm and proud",
    "shy1": "playful",
    "shy2": "gentle and kind",
    "talk": "delighted",
    "notes": "amused and knowing",
    "road": "adventurous, building excitement",
    "forest": "mysterious and hushed",
    "workshop": "playful, amused",
    "ship": "bold and adventurous",
    "laundry": "amused, a little silly",
    "bridge": "playfully ominous",
    "tower": "tense and dramatic",
    "cave": "mysterious, then warm and amused",
    "sky": "dramatic, then soaring and thrilled",
    "kind": "tender and heartfelt, slowing down at the end",
    "after": "warm and happy, like the end of a fairy tale",
    "free": "full of wonder and delight",
    "mystory": "inviting and enthusiastic",
    "anyone": "warm and welcoming",
    "end2": "warm and proud, a gentle invitation at the end",
}

def main():
    out = Path(sys.argv[1]); out.mkdir(parents=True, exist_ok=True)
    tts = Qwen3TTSModel.from_pretrained("Qwen/Qwen3-TTS-12Hz-1.7B-VoiceDesign", device_map="mps", dtype=torch.bfloat16, attn_implementation="sdpa")
    meta, t0 = {}, time.time()
    for key, text in LINES.items():
        torch.manual_seed(1234)
        wavs, sr = tts.generate_voice_design(text=text, language="English", instruct=f"{VOICE} Emotion: {FEEL.get(key, 'warm storytelling')}.")
        samples = np.asarray(wavs[0], dtype=np.float32)
        loud = np.where(np.abs(samples) > 0.01)[0]
        if len(loud): samples = samples[max(0, loud[0] - int(sr * 0.03)): min(len(samples), loud[-1] + int(sr * 0.12))]
        n = int(sr * 0.01); samples[:n] *= np.linspace(0, 1, n); samples[-n:] *= np.linspace(1, 0, n)
        samples = samples / (float(np.abs(samples).max()) or 1.0) * 0.89
        sf.write(out / f"{key}.wav", samples, sr, subtype="PCM_16")
        meta[key] = {"text": text, "secs": round(len(samples) / sr, 2)}
        print(key, meta[key]["secs"], flush=True)
    (out / "vo.json").write_text(json.dumps(meta, indent=1))
    print("total", round(sum(m["secs"] for m in meta.values()), 1), "s in", round(time.time() - t0), "s")

if __name__ == "__main__":
    main()
