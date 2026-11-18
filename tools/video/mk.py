import os
# builds a timeline.json for the demo video, fitted to one narration voice (Kokoro or Qwen):
#   python3 mk8.py <vo dir> <clips dir> <timeline.json>
# A narration line never starts within 0.2 s of the one before; a shot too short for its line
# grows (as far as its take allows), and everything after it moves along.
import json, sys
# id, clip, in, dur, extras
S = [
  ("cold", "unbound", 12.0, 3.0, {"x": 0.01, "vol": 0.8}),
  ("menu", "menu", 0.4, 5.0, {"x": 0.5}),
  ("prologue", "prologue", 0.2, 14.4, {"x": 0.6}),
  ("curtain", "curtain", 0.4, 7.2, {"x": 0.35}),
  ("pipA", "court", 9.4, 3.4, {}),
  ("pipB", "court", 14.2, 2.6, {}),
  ("pipC", "court", 33.0, 2.2, {}),
  ("stumble", "stumble", 3.0, 7.8, {"x": 0.3, "vol": 1.1}),
  ("cast", "court", 2.4, 4.6, {"x": 0.3}),
  ("shyA", "shyrush", 1.6, 4.0, {}),
  ("shyB", "shyrush", 14.6, 4.2, {"x": 0.3}),
  ("talk", "talk", 0.6, 5.6, {"x": 0.35, "vol": 1.3}),
  # the slapstick ending, then the playbill (10.2) and Marlo's backstage notes (13.8)
  ("playA", "playbill", 0.6, 2.2, {"x": 0.3}),
  ("playB", "playbill", 12.4, 3.6, {"x": 0.3}),
  ("map", "map", 0.6, 5.4, {"x": 0.35}),
  ("forest", "forest", 2.0, 4.4, {"label": "The Whispering Forest", "x": 0.3}),
  # Twig's boast in close-up (3.5-5.9) as his nose grows; the voice-over on the wide shot;
  # Sir Pip steps onto Fib (caught 10.7) and "Caught me! How did you know?" (11.4-13.0)
  ("workshop", "workshop", 3.2, 10.0, {"label": "The Toymaker's Workshop", "vol": 1.25, "x": 0.3}),
  ("ship", "ship", 4.6, 3.8, {"label": "The Pirate Ship"}),
  # Noodle pops up and gets booped (the voice-over is on this), then the twin: Doodle pops up
  # (20.7) and Noodle cries "My twin! Doodle! You found Doodle!" (20.6-23.0)
  ("laundryA", "laundry", 0.0, 4.6, {"label": "The Harbour Laundry", "vol": 1.2, "x": 0.3}),
  ("laundryB", "laundry", 22.3, 3.4, {"vol": 1.25}),
  ("bridge", "bridge", 4.3, 4.2, {"label": "The Troll Bridge"}),
  ("tower", "tower", 1.6, 4.7, {"label": "The Clockwork Tower"}),
  ("cave", "cave", 1.6, 4.6, {"label": "The Dragon's Cave"}),
  ("sky", "sky", 3.0, 6.0, {"label": "The Night Sky", "x": 0.3}),
  ("kind", "finale", 1.5, 11.8, {"vol": 1.2, "x": 0.35}),
  # the King: "I name you Sir Pip the Brave, Knight of the Music Box!" (27.8-31.7), the camera
  # pulls back into the curtain call (the whole cast, Twig and both socks), "Hooray for Sir Pip!"
  ("knight", "finale", 27.6, 10.9, {"vol": 1.4, "x": 0.35}),
  # closer: Noodle's cheer, "Hooray for Sir Pip! You're a perfect fit!" (49.4-52.2)
  ("after", "epilogue", 0.2, 5.8, {"x": 0.6}),
  ("freeA", "unbound", 0.6, 3.0, {"x": 0.35}),
  ("freeB", "unbound", 11.6, 3.8, {}),
  # the picker already open: rescue, the King, Twig, the Workshop, night; Generate (9.7) and
  # "Tonight's Show" (from about 9.9)
  ("picker", "picker", 3.0, 8.8, {"label": "Make your own story", "x": 0.35}),
  # free play: "You play: Twig" (2.5) on the Workshop stage, picked up (4.7) and walked
  ("play", "freeplay", 2.1, 4.6, {"label": "Free play: be anyone"}),
  ("end", "menu", 1.9, 9.4, {"x": 0.5, "vol": 0, "end": ["Play it now in your headset's browser", "mazzyy.github.io/strings"], "endAt": 1.2}),
]
VO = [("open", "menu", 1.6), ("tale1", "prologue", 0.4), ("tale2b", "prologue", 6.1), ("tale3", "prologue", 12.0),
      ("hands", "curtain", 0.1), ("pip", "pipA", 0.0), ("strings", "stumble", 0.2), ("cast2", "cast", 0.1),
      ("shy1", "shyA", 0.6), ("shy2", "shyB", 0.3), ("talk", "shyB", 2.9), ("notes", "playB" if "playA" in os.environ.get("SKIP", "") else "playA", 0.3), ("road", "map", 0.4),
      ("forest", "forest", 0.3), ("workshop", "workshop", 2.85), ("ship", "ship", 0.3), ("laundry", "laundryA", 0.2),
      ("bridge", "bridge", 0.3), ("tower", "tower", 0.3), ("cave", "cave", 0.3), ("sky", "sky", 0.3), ("kind", "kind", 0.2),
      ("after", "after", 0.3), ("free", "freeA", 0.4), ("mystory", "picker", 0.2), ("anyone", "play", 0.2), ("end2", "end", 0.4)]
# the music makes room for the characters' own lines too
DUCKS = [("talk", 2.6, 3.0), ("workshop", 0.2, 2.6), ("workshop", 8.0, 2.0), ("laundryB", 0.1, 3.2), ("kind", 9.6, 2.2),
         ("knight", 0.0, 10.9)]

voDir, clipsDir, outFile = sys.argv[1], sys.argv[2], sys.argv[3]
vo = json.load(open(os.path.join(voDir, "vo.json")))
clipLen = {}
for f in os.listdir(clipsDir):
    if f.endswith(".json"):
        try: clipLen[f[:-5]] = json.load(open(os.path.join(clipsDir, f)))["secs"]
        except Exception: pass
SKIP = set(filter(None, os.environ.get("SKIP", "").split(",")))  # (segments left out, with their lines)
S = [x for x in S if x[0] not in SKIP]
VO = [x for x in VO if x[1] not in SKIP]
DUCKS = [x for x in DUCKS if x[0] not in SKIP]
segs = [{"id": sid, "clip": clip, "in": round(i, 2), "dur": round(d, 2), **ex} for sid, clip, i, d, ex in S]
order = {s["id"]: k for k, s in enumerate(segs)}
cues = [{"key": k, "seg": sg, "off": o} for k, sg, o in VO]
GAP, TAIL = 0.2, 0.35
for _ in range(40):
    start, t = {}, 0.0
    for s in segs: start[s["id"]] = t; t += s["dur"]
    changed, prevEnd = False, -1
    for c in sorted(cues, key=lambda c: start[c["seg"]] + c["off"]):
        a = start[c["seg"]] + c["off"]
        if a < prevEnd + GAP: c["off"] = round(c["off"] + (prevEnd + GAP - a), 2); a = prevEnd + GAP
        end = a + vo[c["key"]]["secs"]
        # the line runs until the next cue's segment starts at the earliest: if it overruns its own
        # segment and the next segment has no cue of its own early on, it may carry over; otherwise grow
        seg = segs[order[c["seg"]]]
        segEnd = start[seg["id"]] + seg["dur"]
        nxt = segs[order[seg["id"]] + 1] if order[seg["id"]] + 1 < len(segs) else None
        hasCue = nxt and any(x["seg"] == nxt["id"] for x in cues)
        if end + TAIL > segEnd and (nxt is None or hasCue):
            need = round(end + TAIL - segEnd, 2)
            room = clipLen.get(seg["clip"], 999) - (seg["in"] + seg["dur"])
            grow = min(need, max(0, room))
            if grow > 0.01: seg["dur"] = round(seg["dur"] + grow, 2); changed = True; break
        prevEnd = end
    if not changed: break
start, t = {}, 0.0
for s in segs: start[s["id"]] = t; t += s["dur"]
total = round(t, 2)
sky = start["sky"]
# the closing line must end before the fade (total - 1.1)
last = max(cues, key=lambda c: start[c["seg"]] + c["off"])
lastEnd = start[last["seg"]] + last["off"] + vo[last["key"]]["secs"]
if lastEnd > total - 1.25: segs[-1]["dur"] = round(segs[-1]["dur"] + lastEnd - (total - 1.25), 2); total = round(total + lastEnd - (total - 1.25), 2)
tl = {"clipVol": 0.72, "duckClips": 0.38, "duckMusic": 0.32, "voVol": 1.0, "segments": segs,
      "vo": cues,
      "ducks": [{"seg": sg, "off": o, "secs": s} for sg, o, s in DUCKS],
      "music": [{"file": "music_story", "at": 0, "end": round(sky + 3.6, 2), "vol": 0.6, "fadeIn": 0.8, "fadeOut": 3.5, "from": 2.0},
                {"file": "music_finale", "at": round(sky + 0.2, 2), "end": total, "vol": 0.46, "fadeIn": 2.5, "fadeOut": 2.2, "from": 1.0}],
      "master": 0.8}
open(outFile, "w").write(json.dumps(tl, indent=1))
print("total", total, "s =", f"{int(total // 60)}:{total % 60:04.1f}")
over = [(s["id"], s["clip"], round(s["in"] + s["dur"], 2), clipLen.get(s["clip"])) for s in segs if clipLen.get(s["clip"]) and s["in"] + s["dur"] > clipLen[s["clip"]] + 0.01]
if over: print("PAST THE END OF A TAKE:", over)
for c in sorted(cues, key=lambda c: start[c["seg"]] + c["off"]):
    a = start[c["seg"]] + c["off"]; print(f"  {a:6.1f}-{a + vo[c['key']]['secs']:6.1f} {c['key']:9s} on {c['seg']} +{c['off']}")
