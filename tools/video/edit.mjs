// Assembles the demo video: plays the takes back in order in a page (cuts, labels, voice-over,
// music with ducking) and records that page, picture and sound, into one file.
//   node edit.mjs <clipsDir> <voDir> <timeline.json> <out.(mp4|webm)> [preview]
// "preview" writes a few screenshots instead of waiting for a full-length recording.
import { launch, armRecorder, stopTo, W, H, sleep } from "./lib.mjs";
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
const [clipsDir, voDir, tlFile, outFile, mode] = process.argv.slice(2);
const here = path.dirname(fileURLToPath(import.meta.url));
const audioDir = path.resolve(here, "../../public/audio");
const TL = JSON.parse(fs.readFileSync(tlFile, "utf8"));
const vo = JSON.parse(fs.readFileSync(path.join(voDir, "vo.json"), "utf8"));

// lay the segments end to end
let t = 0;
for (const s of TL.segments) { s.start = +t.toFixed(3); t += s.dur; }
TL.total = +t.toFixed(3);
for (const d of TL.ducks || []) if (d.seg !== undefined) d.at = +(TL.segments.find((s) => s.id === d.seg).start + (d.off || 0)).toFixed(2);
for (const c of TL.vo) { c.secs = vo[c.key].secs; if (c.seg !== undefined) c.at = +(TL.segments.find((s) => s.id === c.seg).start + (c.off || 0)).toFixed(2); }
console.log("length", TL.total, "s;", TL.segments.length, "segments");
for (const c of TL.vo) console.log(`  vo ${c.at.toFixed(1).padStart(6)}–${(c.at + c.secs).toFixed(1).padStart(6)}  ${c.key}`);
const overlaps = TL.vo.filter((c, i) => i && TL.vo[i - 1].at + TL.vo[i - 1].secs > c.at - 0.15);
if (overlaps.length) console.log("  ! voice lines overlap:", overlaps.map((c) => c.key).join(", "));

const PAGE = `<!doctype html><meta charset="utf-8"><title>edit</title>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Playball&display=swap">
<style>
html,body{margin:0;height:100%;background:#000;overflow:hidden}
video{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;opacity:0}
#fade{position:absolute;inset:0;background:#000;opacity:1;z-index:900;transition:opacity .9s}
.label{position:absolute;left:64px;bottom:70px;z-index:800;padding:12px 44px 13px;font:italic 600 40px Georgia,serif;color:#fff1d2;background:linear-gradient(#b8262e,#861620);box-shadow:0 8px 20px rgba(0,0,0,.5);clip-path:polygon(0 0,100% 0,calc(100% - 20px) 50%,100% 100%,0 100%,20px 50%);opacity:0;transform:translateX(-30px);transition:opacity .35s,transform .35s}
.label.on{opacity:1;transform:none}
#note{position:absolute;right:40px;top:34px;z-index:800;padding:8px 18px;border-radius:999px;font:500 22px ui-sans-serif,system-ui,sans-serif;color:#eaf6ff;background:rgba(8,14,24,.62);border:1px solid rgba(160,220,255,.5);opacity:0;transition:opacity .5s}
#note.on{opacity:1}
#end{position:absolute;left:0;right:0;bottom:6.5%;z-index:800;text-align:center;opacity:0;transition:opacity .8s}
#end.on{opacity:1}
#end b{display:inline-block;padding:14px 46px;border-radius:999px;font:700 44px Georgia,serif;color:#2a1404;background:linear-gradient(#fff0a8,#f8c650 46%,#dc9422);box-shadow:0 0 0 4px rgba(150,80,10,.6),0 0 46px rgba(255,190,80,.75),0 14px 30px rgba(0,0,0,.5)}
#end small{display:block;margin-top:14px;font:italic 26px Georgia,serif;color:#fff1d2;text-shadow:0 2px 8px #000}
#shade{position:absolute;left:0;right:0;bottom:0;height:34%;z-index:700;background:linear-gradient(rgba(0,0,0,0),rgba(6,3,8,.82));opacity:0;transition:opacity .8s}
#shade.on{opacity:1}
</style>
<div id="stage"></div><div id="shade"></div><div class="label" id="label"></div><div id="note"></div>
<div id="end"><b></b><small></small></div><div id="fade"></div>
<script>
const TL = ${JSON.stringify(TL)};
const ac = new AudioContext({ sampleRate: 48000 });
const master = ac.createGain(), clipG = ac.createGain(), musicG = ac.createGain(), voG = ac.createGain(), comp = ac.createDynamicsCompressor();
comp.threshold.value = -10; comp.ratio.value = 3; comp.attack.value = 0.01; comp.release.value = 0.2;
clipG.connect(comp); musicG.connect(comp); voG.connect(comp); comp.connect(master); master.connect(ac.destination); master.gain.value = TL.master ?? 0.8;
window.AUDIO_TAP = master;
let prepped = 1;
const blobs = new Map();
const blob = (clip) => { if (!blobs.has(clip)) blobs.set(clip, fetch("/clips/" + clip + ".webm").then((r) => r.blob()).then((b) => URL.createObjectURL(b))); return blobs.get(clip); };
const once = (el, ev) => new Promise((r) => el.addEventListener(ev, r, { once: true }));
function prep(seg) { return seg.ready || (seg.ready = prep1(seg)); }
async function prep1(seg) {
  const v = document.createElement("video");
  v.playsInline = true; v.preload = "auto"; v.src = await blob(seg.clip);
  document.getElementById("stage").appendChild(v);
  await once(v, "loadedmetadata");
  // (recorded files don't say how long they are; a jump to the far end makes the player find out)
  if (!isFinite(v.duration)) { v.currentTime = 1e101; await once(v, "timeupdate"); }
  v.currentTime = seg.in; await once(v, "seeked");
  v.playbackRate = seg.rate || 1;
  const g = ac.createGain(); g.gain.value = seg.vol ?? 1; ac.createMediaElementSource(v).connect(g); g.connect(clipG);
  seg.v = v; seg.g = g;
}
const buf = async (url) => ac.decodeAudioData(await (await fetch(url)).arrayBuffer());
window.RUN = async () => {
  const S = TL.segments;
  const vos = await Promise.all(TL.vo.map((c) => buf("/vo/" + c.key + ".wav")));
  const music = await Promise.all(TL.music.map((m) => buf("/audio/" + m.file + ".mp3")));
  // every take is fetched before the clock starts, so a cut never waits on a download
  await Promise.all([...new Set(S.map((s) => s.clip))].map(blob));
  await prep(S[0]); if (S[1]) await prep(S[1]); if (S[2]) await prep(S[2]); prepped = 2;
  await document.fonts.ready;
  // (the recording starts only now, with everything loaded, so the film opens on its first picture)
  if (window.REC_MIME) window.REC.start(window.REC_MIME, 14e6);
  const T0 = ac.currentTime + 0.6; window.T0 = T0;
  // music: each track fades in and out; everything dips under the voice
  TL.music.forEach((m, i) => { const src = ac.createBufferSource(); src.buffer = music[i]; src.loop = true; const g = ac.createGain(); g.gain.setValueAtTime(0, T0); g.gain.setValueAtTime(0, T0 + m.at); g.gain.linearRampToValueAtTime(m.vol, T0 + m.at + (m.fadeIn ?? 1.5)); g.gain.setValueAtTime(m.vol, T0 + m.end - (m.fadeOut ?? 2)); g.gain.linearRampToValueAtTime(0, T0 + m.end); src.connect(g); g.connect(musicG); src.start(T0 + m.at, m.from || 0); src.stop(T0 + m.end + 0.1); });
  musicG.gain.setValueAtTime(1, T0); clipG.gain.setValueAtTime(TL.clipVol ?? 0.9, T0);
  TL.vo.forEach((c, i) => { const src = ac.createBufferSource(); src.buffer = vos[i]; src.connect(voG); src.start(T0 + c.at);
    musicG.gain.setTargetAtTime(TL.duckMusic ?? 0.36, T0 + c.at - 0.25, 0.14); musicG.gain.setTargetAtTime(1, T0 + c.at + c.secs + 0.1, 0.35);
    clipG.gain.setTargetAtTime((TL.clipVol ?? 0.9) * (TL.duckClips ?? 0.45), T0 + c.at - 0.2, 0.1); clipG.gain.setTargetAtTime(TL.clipVol ?? 0.9, T0 + c.at + c.secs + 0.1, 0.3); });
  // (other moments when the music should make room, e.g. the game's own narrator reading a page)
  for (const d of TL.ducks || []) { musicG.gain.setTargetAtTime(TL.duckMusic ?? 0.36, T0 + d.at - 0.25, 0.14); musicG.gain.setTargetAtTime(1, T0 + d.at + d.secs, 0.35); }
  voG.gain.value = TL.voVol ?? 1.25;
  let cur = -1, busy = false;
  const label = document.getElementById("label"), note = document.getElementById("note"), end = document.getElementById("end"), shade = document.getElementById("shade"), fade = document.getElementById("fade");
  return new Promise((done) => {
    const tick = () => {
      const t = ac.currentTime - T0;
      if (t >= 0 && fade.dataset.s !== "in" && t < TL.total - 1.3) { fade.dataset.s = "in"; fade.style.opacity = 0; }
      if (t >= TL.total - 1.1 && fade.dataset.s !== "out") { fade.dataset.s = "out"; fade.style.transition = "opacity 1s"; fade.style.opacity = 1; master.gain.setTargetAtTime(0, ac.currentTime, 0.3); }
      while (cur + 1 < S.length && t >= S[cur + 1].start) {
        const prev = S[cur]; cur++; const s = S[cur];
        const show = () => { s.v.style.zIndex = 10 + S.indexOf(s); s.v.style.transition = "opacity " + (s.x ?? 0.18) + "s"; s.v.style.opacity = 1; s.v.play(); if (prev?.v) { const pv = prev.v, pg = prev.g; setTimeout(() => { pv.pause(); pv.remove(); pg.disconnect(); }, 600); } };
        if (s.v) show(); else { s.late = true; window.LATE = (window.LATE || []).concat(s.id); s.ready.then(() => { const lag = (ac.currentTime - T0) - s.start; s.v.currentTime = s.in + lag; show(); }); }
        // (a new label waits for its picture to finish fading in)
        clearTimeout(window.LT); label.classList.remove("on");
        if (s.label) window.LT = setTimeout(() => { label.textContent = s.label; label.classList.add("on"); }, (s.x ?? 0.18) * 1000 + 60);
        if (s.note) { note.textContent = s.note; note.classList.add("on"); } else note.classList.remove("on");
        if (s.end) { end.querySelector("b").textContent = s.end[0]; end.querySelector("small").textContent = s.end[1]; setTimeout(() => { end.classList.add("on"); shade.classList.add("on"); }, (s.endAt ?? 1) * 1000); } else { end.classList.remove("on"); shade.classList.remove("on"); }
      }
      // keep two segments ready ahead of the one playing
      if (!busy && prepped < Math.min(S.length - 1, cur + 3)) { busy = true; prep(S[prepped + 1]).then(() => { prepped++; busy = false; }); }
      window.NOW = t;
      if (t < TL.total + 0.4) requestAnimationFrame(tick); else done(TL.total);
    };
    requestAnimationFrame(tick);
  });
};
</script>`;

const types = { ".webm": "video/webm", ".wav": "audio/wav", ".mp3": "audio/mpeg" };
const server = http.createServer((req, res) => {
  const u = decodeURIComponent(req.url.split("?")[0]);
  if (u === "/") { res.writeHead(200, { "content-type": "text/html" }); return res.end(PAGE); }
  const file = u.startsWith("/clips/") ? path.join(clipsDir, u.slice(7)) : u.startsWith("/vo/") ? path.join(voDir, u.slice(4)) : u.startsWith("/audio/") ? path.join(audioDir, u.slice(7)) : null;
  if (!file || !fs.existsSync(file)) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { "content-type": types[path.extname(file)] || "application/octet-stream", "content-length": fs.statSync(file).size });
  fs.createReadStream(file).pipe(res);
}).listen(8097);

const browser = await launch();
const page = await browser.newPage({ viewport: { width: W, height: H } });
page.on("pageerror", (e) => console.log("pageerror", e.message));
page.on("console", (m) => { if (m.type() === "error") console.log("console:", m.text().slice(0, 200)); });
await page.goto("http://localhost:8097/");
await armRecorder(page);
if (mode === "preview") {
  const run = page.evaluate(() => window.RUN());
  const dir = outFile.replace(/\.[a-z0-9]+$/, "") + "-preview"; fs.mkdirSync(dir, { recursive: true });
  const marks = TL.segments.map((s) => s.start + Math.min(2, s.dur / 2));
  for (const m of marks) { await page.waitForFunction((m) => window.NOW >= m, m, { timeout: 0, polling: 100 }); await page.screenshot({ path: `${dir}/${String(Math.round(m)).padStart(3, "0")}.jpg`, type: "jpeg", quality: 70 }); }
  await run;
} else {
  await page.evaluate((mime) => { window.REC_MIME = mime; }, outFile.endsWith(".mp4") ? "video/mp4;codecs=avc1,mp4a.40.2" : "video/webm;codecs=vp9,opus");
  const total = await page.evaluate(() => window.RUN());
  await sleep(300);
  console.log(JSON.stringify(await stopTo(page, outFile)), "timeline", total, "late cuts:", JSON.stringify(await page.evaluate(() => window.LATE || [])));
}
await browser.close(); server.close();
