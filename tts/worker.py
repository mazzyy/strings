"""Live TTS worker for the local server: reads {"id", "text", "out"} JSON lines on
stdin, writes an MP3 to "out", and answers {"id", "ok"} on stdout."""
import json, sys
from voice import Speaker

spk = Speaker(sys.argv[1] if len(sys.argv) > 1 else None)
print(json.dumps({"ready": True, "voice": spk.voice}), flush=True)
for raw in sys.stdin:
    try:
        job = json.loads(raw)
        with open(job["out"], "wb") as f:
            f.write(spk.mp3(job["text"], job.get("voice")))
        print(json.dumps({"id": job["id"], "ok": True}), flush=True)
    except Exception as e:  # keep serving even if one line fails
        print(json.dumps({"id": job.get("id") if isinstance(job, dict) else None, "ok": False, "error": str(e)}), flush=True)
