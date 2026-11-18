# Credits and licenses

All third-party pieces are free to use in this project:

| What | Source | License |
|---|---|---|
| Room lighting HDRI "Reading Room" (`public/assets/hdri/`) | [Poly Haven](https://polyhaven.com/a/reading_room) | CC0 |
| Wood textures "Oak Wood Planks", "Dark Wood", "American Walnut Veneer" (`public/assets/tex/`) | [Poly Haven](https://polyhaven.com/textures) | CC0 |
| Narrator voice: Kokoro-82M (pre-recorded clips in `public/voice/`, live voice via `tts/`) | [hexgrad/Kokoro-82M](https://huggingface.co/hexgrad/Kokoro-82M), ONNX build by [kokoro-onnx](https://github.com/thewh1teagle/kokoro-onnx) | Apache-2.0 |
| Marlo's test voice: Qwen3-TTS 1.7B VoiceDesign (pre-recorded clips in `public/voice-qwen/`, heard with `?marlo=qwen`; built by `tts/build_qwen_marlo.py`) | [Qwen/Qwen3-TTS-12Hz-1.7B-VoiceDesign](https://huggingface.co/Qwen/Qwen3-TTS-12Hz-1.7B-VoiceDesign), [QwenLM/Qwen3-TTS](https://github.com/QwenLM/Qwen3-TTS) | Apache-2.0 |
| 3D engine | [three.js](https://threejs.org) | MIT |
| WebXR emulator for desktop testing (`?emulate`) | [IWER](https://github.com/meta-quest/immersive-web-emulator) | MIT |
| Music: "The Bard's Tale", "Minstrel Dance", "King's Feast" (`public/audio/music_story`, `music_courtyard`, `music_finale`) | [OpenGameArt](https://opengameart.org) | CC0 |
| Music: pirate ship loop (`music_ship`), "Mysterious Clock" (`music_tower`) | [OpenGameArt](https://opengameart.org) | CC0 |
| Ambience: birds and wind, crickets, birds and crickets one-shots, river (sea), dungeon ambience (`amb_*`, `bird`, `bird_night`, `frog`) | [OpenGameArt](https://opengameart.org) | CC0 |
| Crowd: church crowd applause, group giggling, "Well Done" claps (`applause`, `laugh`, `cheer`) | [OpenGameArt](https://opengameart.org) | CC0 |
| Footsteps, cloth, creaks, metal clicks, knife draws and slices, leather (`step0-9`, `cloth*`, `creak*`, `metal*`, `drawKnife*`, `knifeSlice*`, `chop`, `*Leather*`, `beltHandle1`) | [Kenney "RPG Audio"](https://kenney.nl/assets/rpg-audio) | CC0 |
| Local narrator model (optional, not shipped) | [Qwen2.5-7B-Instruct](https://huggingface.co/Qwen/Qwen2.5-7B-Instruct) via Ollama | Apache-2.0 |

The audio files were converted to MP3 (trimmed and loudness-matched); the synthesised fallbacks in `audio.js` remain for anything not loaded.

Everything else (the knight, the dragon, the robot puppeteer, the stage, the room, the physics, the scrollwork and wall art) is built procedurally in this repository.
