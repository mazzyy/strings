"""Kokoro text-to-speech -> MP3 bytes. Shared by the pre-recorder and the live worker."""
import io
from pathlib import Path
import lameenc
import numpy as np
from kokoro_onnx import Kokoro

HERE = Path(__file__).resolve().parent
DEFAULT_VOICE = "af_heart"  # warm, natural storyteller; try bm_george or bf_emma for British

# best available model: fp16 sounds noticeably more natural than the int8 build
MODEL = next((HERE / m for m in ("kokoro-v1.0.fp16.onnx", "kokoro-v1.0.onnx", "kokoro-v1.0.int8.onnx") if (HERE / m).exists()), None)

class Speaker:
    def __init__(self, voice=None, speed=0.97):
        self.k = Kokoro(str(MODEL), str(HERE / "voices-v1.0.bin"))
        self.model = MODEL.name
        self.voice = voice or DEFAULT_VOICE
        self.speed = speed

    def mp3(self, text, voice=None):
        voice = voice or self.voice
        lang = "en-gb" if voice.startswith("b") else "en-us"
        samples, sr = self.k.create(text, voice=voice, speed=self.speed, lang=lang)
        # a short breath of silence at the end so lines don't clip
        samples = np.concatenate([samples, np.zeros(int(sr * 0.15), dtype=samples.dtype)])
        pcm = (np.clip(samples, -1, 1) * 32767).astype(np.int16).tobytes()
        enc = lameenc.Encoder()
        enc.set_bit_rate(64)
        enc.set_in_sample_rate(sr)
        enc.set_channels(1)
        enc.set_quality(2)
        return enc.encode(pcm) + enc.flush()
