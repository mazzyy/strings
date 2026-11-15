// Strings — tiny static server + narrator endpoint.
// Serves ./public and exposes POST /api/narrate, which asks an LLM for the next
// line of the story:
//   1. Claude, when ANTHROPIC_API_KEY is set
//   2. otherwise a local Ollama model (default qwen2.5:7b), when Ollama is running
//   3. otherwise /api/narrate returns 503 and the browser's built-in narrator takes over
import http from "node:http";
import crypto from "node:crypto";
import { spawn } from "node:child_process";
import readline from "node:readline";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod/v4";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";

const here = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC = path.join(here, "public");
const PORT = Number(process.env.PORT || 8080);
const MODEL = process.env.STRINGS_MODEL || "claude-opus-5-5";

const hasKey = Boolean(process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_AUTH_TOKEN);
const client = hasKey ? new Anthropic() : null;
const OLLAMA_URL = process.env.OLLAMA_URL || "http://localhost:11434";
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || "qwen2.5:7b";
let ollamaReady = false;

const REACTIONS = ["bow", "wave", "jump", "approach", "retreat", "help", "mirror", "dance", "slump", "turn", "idle"];

const Narration = z.object({
  line: z.string().describe("One short narrator line, at most 18 words, present tense."),
  reaction: z.enum(REACTIONS).describe("What the AI's puppet, Marlo, does next."),
});

const SYSTEM = `You are the narrator of "Strings", a tiny improvised marionette show on a wooden stage.
You are also the robot puppeteer working the second marionette.
The audience member performs "Sir Pip", a small, brave, slightly clumsy armoured knight, with their own hands.
You perform "Marlo", a friendly young dragon. You only ever see what Sir Pip's body does
(walks, bows, falls, jumps, waves, slumps, turns...).
Each turn, write ONE short spoken narrator line (max 18 words) that turns Sir Pip's latest action into story,
building on the previous lines so a little plot emerges (a meeting, a rivalry, a dance, a rescue, a friendship).
Warm, playful, specific, family-friendly; vary sentence shapes; it will be read aloud, so no emoji or stage directions.
Never mention hands, strings, players, AI or controls unless as a wink at the theatre itself.
Then choose Marlo's reaction from the allowed list so the two puppets feel like they are improvising together ("yes, and").`;

function buildPrompt(body) {
  const events = Array.isArray(body.events) ? body.events.slice(-6) : [];
  const story = Array.isArray(body.story) ? body.story.slice(-8) : [];
  const prompt =
    `Story so far:\n${story.map((l) => `- ${l}`).join("\n") || "(the curtain has just opened)"}\n\n` +
    `What Pip just did (most recent last):\n${events.map((e) => `- ${e}`).join("\n")}\n\n` +
    `Give the next narrator line and Marlo's reaction.`;
  return prompt;
}

async function narrate(body) {
  const prompt = buildPrompt(body);
  if (!client) return narrateOllama(prompt);
  const response = await client.messages.parse({
    model: MODEL,
    max_tokens: 2000,
    output_config: { effort: "low", format: zodOutputFormat(Narration) },
    system: SYSTEM,
    messages: [{ role: "user", content: prompt }],
  });
  if (response.stop_reason === "refusal" || !response.parsed_output) {
    throw new Error(`no narration (stop_reason=${response.stop_reason})`);
  }
  return response.parsed_output;
}

// ---- talking to Marlo ---------------------------------------------------------
const MARLO_SYSTEM = `You are Marlo, a friendly, playful young dragon marionette in a tiny puppet theatre.
A person in the audience just spoke to you. Answer in character, in first person, in ONE short spoken line
(max 14 words), warm, funny and family-friendly, no emoji or stage directions. Then choose what your puppet does.
You love visitors, dancing and shiny things; you breathe only warm air and sparkles; your friend is Sir Pip the knight.`;
const TalkReply = z.object({
  line: z.string().describe("Marlo's spoken reply, max 14 words."),
  reaction: z.enum(REACTIONS).describe("What Marlo's puppet does."),
});

async function talk(body) {
  const text = String(body.text || "").slice(0, 300);
  const story = Array.isArray(body.story) ? body.story.slice(-4) : [];
  const prompt = `Recent story: ${story.join(" ") || "(the show just began)"}\nThe audience member says to you: "${text}"`;
  if (client) {
    const r = await client.messages.parse({
      model: MODEL, max_tokens: 2000,
      output_config: { effort: "low", format: zodOutputFormat(TalkReply) },
      system: MARLO_SYSTEM,
      messages: [{ role: "user", content: prompt }],
    });
    if (r.stop_reason === "refusal" || !r.parsed_output) throw new Error("no reply");
    return r.parsed_output;
  }
  for (let i = 0; i < 3; i++) {
    const out = await ollamaOnce(prompt + "\nReply in English only.", MARLO_SYSTEM + "\nAlways write in English.", TalkReply);
    if (!NON_ENGLISH.test(out.line)) return out;
  }
  throw new Error("no English reply");
}

// ---- local model via Ollama ------------------------------------------------
const OLLAMA_SCHEMA = {
  type: "object",
  properties: { line: { type: "string" }, reaction: { type: "string", enum: REACTIONS } },
  required: ["line", "reaction"],
};

// Qwen sometimes drifts into Chinese; ask for English and retry if it slips.
const NON_ENGLISH = /[\u3000-\u9fff\uac00-\ud7af\uff00-\uffef]/;
async function narrateOllama(prompt) {
  for (let attempt = 0; attempt < 3; attempt++) {
    const out = await ollamaOnce(prompt + "\nReply in English only.");
    if (!NON_ENGLISH.test(out.line)) return out;
  }
  throw new Error("ollama kept answering in another language");
}

async function ollamaOnce(prompt, system = SYSTEM + "\nAlways write in English.", schema = Narration) {
  const r = await fetch(`${OLLAMA_URL}/api/chat`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      model: OLLAMA_MODEL,
      stream: false,
      keep_alive: "30m",
      format: OLLAMA_SCHEMA,
      options: { temperature: 0.9, num_predict: 120 },
      messages: [{ role: "system", content: system }, { role: "user", content: prompt }],
    }),
    signal: AbortSignal.timeout(15000),
  });
  if (!r.ok) throw new Error(`ollama ${r.status}: ${await r.text()}`);
  const out = schema.safeParse(JSON.parse((await r.json()).message.content));
  if (!out.success) throw new Error("ollama returned an unexpected shape");
  // keep lines short even if the model rambles
  out.data.line = out.data.line.split(/\s+/).slice(0, 24).join(" ");
  return out.data;
}

// Check Ollama has the model, and load it now so the first line isn't slow.
async function probeOllama() {
  if (client) return;
  try {
    const tags = await (await fetch(`${OLLAMA_URL}/api/tags`, { signal: AbortSignal.timeout(2000) })).json();
    if (!tags.models?.some((m) => m.name === OLLAMA_MODEL)) {
      console.log(`Ollama is running but has no ${OLLAMA_MODEL} — using the built-in narrator`);
      return;
    }
    await fetch(`${OLLAMA_URL}/api/generate`, { method: "POST", body: JSON.stringify({ model: OLLAMA_MODEL, keep_alive: "30m" }) });
    if (!ollamaReady) console.log(`Narrator: ${OLLAMA_MODEL} via Ollama`);
    ollamaReady = true;
  } catch {
    if (ollamaReady) console.log("Lost Ollama — using the built-in narrator");
    ollamaReady = false;
  }
}
probeOllama();
setInterval(probeOllama, 15000);
const narratorName = () => (client ? `Claude (${MODEL})` : ollamaReady ? `${OLLAMA_MODEL} (local)` : null);

// ---- live voice: a Kokoro worker process voices LLM lines as they arrive -------
const TTS_PY = path.join(here, "tts", ".venv", "bin", "python");
const TTS_CACHE = path.join(here, ".cache", "voice");
const tts = { proc: null, ready: false, jobs: new Map(), n: 0 };
function startTTS() {
  if (tts.proc || !fs.existsSync(TTS_PY) || !fs.readdirSync(path.join(here, "tts")).some((f) => f.startsWith("kokoro-v1.0") && f.endsWith(".onnx"))) return;
  fs.mkdirSync(TTS_CACHE, { recursive: true });
  tts.proc = spawn(TTS_PY, [path.join(here, "tts", "worker.py"), ...(process.env.STRINGS_VOICE ? [process.env.STRINGS_VOICE] : [])], { cwd: path.join(here, "tts") });
  readline.createInterface({ input: tts.proc.stdout }).on("line", (l) => {
    let msg;
    try { msg = JSON.parse(l); } catch { return; }
    if (msg.ready) { tts.ready = true; console.log(`Voice: Kokoro (${msg.voice})`); return; }
    const job = tts.jobs.get(msg.id);
    if (job) { tts.jobs.delete(msg.id); msg.ok ? job.resolve() : job.reject(new Error(msg.error)); }
  });
  tts.proc.stderr.on("data", () => {});
  tts.proc.on("exit", () => { tts.proc = null; tts.ready = false; for (const j of tts.jobs.values()) j.reject(new Error("tts exited")); tts.jobs.clear(); });
}
const MARLO_VOICE = process.env.STRINGS_MARLO_VOICE || "am_puck";
async function speak(text, voice) {
  if (!tts.ready) return null;
  const name = crypto.createHash("sha1").update(`${voice || ""}|${text}`).digest("hex").slice(0, 16) + ".mp3";
  const out = path.join(TTS_CACHE, name);
  if (!fs.existsSync(out)) {
    const id = ++tts.n;
    await new Promise((resolve, reject) => {
      tts.jobs.set(id, { resolve, reject });
      tts.proc.stdin.write(JSON.stringify({ id, text, out, ...(voice ? { voice } : {}) }) + "\n");
      setTimeout(() => reject(new Error("tts timeout")), 10000);
    });
  }
  return `/voice-live/${name}`;
}
startTTS();

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".mp3": "audio/mpeg",
  ".hdr": "application/octet-stream",
  ".jpg": "image/jpeg",
};

function readBody(req) {
  return new Promise((resolve, reject) => {
    let data = "";
    req.on("data", (c) => {
      data += c;
      if (data.length > 64_000) reject(new Error("too large"));
    });
    req.on("end", () => resolve(data));
    req.on("error", reject);
  });
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);

  if (url.pathname === "/api/status") {
    res.writeHead(200, { "content-type": "application/json" });
    res.end(JSON.stringify({ ai: Boolean(narratorName()), name: narratorName(), voice: tts.ready }));
    return;
  }

  if (url.pathname === "/api/talk" && req.method === "POST") {
    if (!client && !ollamaReady) { res.writeHead(503); res.end("{}"); return; }
    try {
      const out = await talk(JSON.parse(await readBody(req)));
      out.audio = await speak(out.line, MARLO_VOICE).catch(() => null);
      res.writeHead(200, { "content-type": "application/json" });
      res.end(JSON.stringify(out));
    } catch (err) {
      console.error("[talk]", err.message);
      res.writeHead(502); res.end(JSON.stringify({ error: String(err.message || err) }));
    }
    return;
  }

  if (url.pathname === "/api/narrate" && req.method === "POST") {
    if (!client && !ollamaReady) {
      res.writeHead(503, { "content-type": "application/json" });
      res.end(JSON.stringify({ error: "no ANTHROPIC_API_KEY and no Ollama model available" }));
      return;
    }
    try {
      const body = JSON.parse(await readBody(req));
      const out = await narrate(body);
      out.audio = await speak(out.line).catch(() => null);
      res.writeHead(200, { "content-type": "application/json" });
      res.end(JSON.stringify(out));
    } catch (err) {
      if (err instanceof Anthropic.RateLimitError) res.writeHead(429);
      else if (err instanceof Anthropic.APIError) res.writeHead(502);
      else res.writeHead(500);
      console.error("[narrate]", err.message);
      res.end(JSON.stringify({ error: String(err.message || err) }));
    }
    return;
  }

  const isLive = url.pathname.startsWith("/voice-live/");
  const rootDir = isLive ? TTS_CACHE : PUBLIC;
  let file = path.normalize(path.join(rootDir, decodeURIComponent(isLive ? url.pathname.slice("/voice-live".length) : url.pathname)));
  if (!file.startsWith(rootDir)) {
    res.writeHead(403);
    res.end();
    return;
  }
  if (url.pathname === "/" || fs.existsSync(file) && fs.statSync(file).isDirectory()) file = path.join(file, "index.html");
  fs.readFile(file, (err, data) => {
    if (err) {
      res.writeHead(404);
      res.end("not found");
      return;
    }
    res.writeHead(200, { "content-type": MIME[path.extname(file)] || "application/octet-stream", "cache-control": "no-cache" });
    res.end(data);
  });
});

server.on("error", (err) => {
  if (err.code === "EADDRINUSE") {
    console.error(`Port ${PORT} is already in use — Strings is probably already running at http://localhost:${PORT}`);
    console.error(`To restart it:  lsof -ti tcp:${PORT} | xargs kill   then   npm start`);
    console.error(`Or use another port:  PORT=8081 npm start`);
    process.exit(1);
  }
  throw err;
});

server.listen(PORT, () => {
  console.log(`Strings is up on http://localhost:${PORT}`);
  if (hasKey) console.log(`Narrator: Claude (${MODEL})`);
  else console.log(`No ANTHROPIC_API_KEY — looking for ${OLLAMA_MODEL} in Ollama at ${OLLAMA_URL}...`);
});
