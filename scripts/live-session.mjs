/**
 * Live session capture for the showcase video.
 * Runs a REAL session against the live Voice Agent API (same protocol as the
 * app), saves: full event transcript (JSON), the director's reply audio (WAV),
 * and a human-readable log for the terminal scene. Honest artifact: the
 * talent voice is the bundled synthetic bad take (disclosed on camera).
 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";

const BASE = process.env.BASE_URL ?? "http://localhost:3111";
mkdirSync("media", { recursive: true });

function decodeWavPcm16(buf) {
  const view = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
  let offset = 12, dataOffset = -1, dataLen = 0, sampleRate = 44100;
  while (offset < buf.byteLength - 8) {
    const id = String.fromCharCode(...buf.subarray(offset, offset + 4));
    const size = view.getUint32(offset + 4, true);
    if (id === "fmt ") sampleRate = view.getUint32(offset + 12, true);
    if (id === "data") { dataOffset = offset + 8; dataLen = size; break; }
    offset += 8 + size;
  }
  if (dataOffset < 0) throw new Error("no data chunk");
  return { pcm: buf.subarray(dataOffset, dataOffset + dataLen), sampleRate };
}

function resamplePcm16(pcm, fromRate, toRate) {
  const inCount = pcm.length / 2;
  const ratio = fromRate / toRate;
  const outCount = Math.floor(inCount / ratio);
  const out = new Int16Array(outCount);
  const inView = new Int16Array(pcm.buffer, pcm.byteOffset, inCount);
  for (let i = 0; i < outCount; i++) {
    const pos = i * ratio;
    const i0 = Math.floor(pos);
    const frac = pos - i0;
    const a = inView[i0] ?? 0;
    const b = inView[i0 + 1] ?? a;
    out[i] = Math.round(a + (b - a) * frac);
  }
  return out;
}

const script = `Eighteen hours. That is all this takes.
Coarse grind one cup of your darkest roast.
Add four cups of cold, filtered water.
Stir once, cover it, and walk away.
By morning you have a smooth, low acid concentrate.
Cut it fifty fifty with water or milk over ice.
One batch makes twelve servings for about sixty cents each.
No machine, no heat, no bitterness.
Just the deepest, sweetest cup you have ever made at home.`;
const numbered = script.split("\n").map((l, i) => `${i + 1}. ${l}`).join("\n");
const systemPrompt = [
  "You are the director inside a voiceover recording booth. The talent reads the script below aloud, one line at a time, and you deliver a clean master by cutting flubs the moment they happen.",
  "",
  "SCRIPT:",
  numbered,
  "",
  "RULES:",
  "- Track the read against the script using the live transcript.",
  "- FLUBS are: misread words, skipped or inserted words, wrong numbers or names, stumbles, false starts, repeated phrases. When you detect one, cut in at once. Say: 'Cut.' then the line number and the correction in under 12 words. Example: 'Cut. Line four: it's twenty grams, not twelve. Again from line four.' Immediately after, call call_retake with from_line and reason.",
  "- Keep every cut under 12 words. Never explain grammar. Never read the script aloud for the talent.",
  "- CLEAN READS: when a line or short stretch reads clean, call mark_take with quality=clean and the line range. Say 'That's a print.' or 'Good, keep it moving.' occasionally. Vary your phrasing; never say the same phrase twice in a row.",
  "- Speak ONLY booth direction. Ignore anything unrelated to the read.",
  "- When the talent says 'that's a wrap' or the whole script is read clean, call finalize with a one-line summary.",
].join("\n");

const TOOLS = [
  {
    type: "function", name: "call_retake",
    description: "Call a retake after a flub. Call this immediately after you say 'Cut'.",
    parameters: { type: "object", properties: { from_line: { type: "integer", description: "1-based script line to restart from" }, reason: { type: "string", description: "The flub: what was misread, what was expected. Max 12 words." } }, required: ["from_line", "reason"] },
  },
  {
    type: "function", name: "mark_take",
    description: "Mark the span the talent just read as clean or flubbed.",
    parameters: { type: "object", properties: { quality: { type: "string", enum: ["clean", "flub"] }, from_line: { type: "integer" }, to_line: { type: "integer" }, note: { type: "string" } }, required: ["quality", "from_line"] },
  },
  {
    type: "function", name: "finalize",
    description: "The script is fully read. Wrap the session.",
    parameters: { type: "object", properties: { summary: { type: "string" } }, required: ["summary"] },
  },
];

const tokenRes = await fetch(`${BASE}/api/token`);
if (!tokenRes.ok) throw new Error(`token failed: ${tokenRes.status}`);
const { token } = await tokenRes.json();

const ws = new WebSocket(`wss://agents.assemblyai.com/v1/ws?token=${encodeURIComponent(token)}`);

const log = [];          // terminal-scene lines
const events = [];       // full protocol record
const replyChunks = [];  // base64 PCM16 from the director

const stamp = () => ((Date.now() - t0) / 1000).toFixed(2).padStart(6);
const t0 = Date.now();

ws.onopen = () => {
  ws.send(JSON.stringify({
    type: "session.update",
    session: {
      system_prompt: systemPrompt,
      greeting: "Step up to the glass. Read line one whenever you're ready. I'll call the cuts.",
      tools: TOOLS,
      input: { format: { encoding: "audio/pcm" } },
      output: { voice: "alba", format: { encoding: "audio/pcm" }, volume: 100 },
    },
  }));
  log.push(`${stamp()}  $ node scripts/live-session.mjs`);
  log.push(`${stamp()}  → session.update  (voice: alba · tools: 3)`);
};

let phase = "connecting";
let chunk = 0;
let streaming = false;

const wav = readFileSync(new URL("../public/badtake.wav", import.meta.url));
const { pcm, sampleRate } = decodeWavPcm16(new Uint8Array(wav));
const pcm24 = resamplePcm16(pcm, sampleRate, 24000);
const CHUNK = 1200;
const totalChunks = Math.ceil(pcm24.length / CHUNK);

ws.onmessage = (ev) => {
  const msg = JSON.parse(ev.data);
  events.push(msg);
  switch (msg.type) {
    case "session.ready":
      log.push(`${stamp()}  ← session.ready   ${msg.session_id}`);
      log.push(`${stamp()}  ← streaming talent audio (synthetic bad take, 28.9s)`);
      phase = "ready"; streaming = true;
      break;
    case "transcript.user":
      log.push(`${stamp()}  ← transcript.user "…${String(msg.text).slice(-70)}"`);
      break;
    case "transcript.agent":
      log.push(`${stamp()}  ← ALBA: "${String(msg.text).trim()}"`);
      break;
    case "reply.audio":
      if (typeof msg.data === "string") replyChunks.push(msg.data);
      break;
    case "tool.call":
      log.push(`${stamp()}  ← tool.call ${msg.name} ${JSON.stringify(msg.arguments)}`);
      ws.send(JSON.stringify({ type: "tool.result", call_id: msg.call_id, result: JSON.stringify({ ok: true }) }));
      break;
    case "session.ended":
      log.push(`${stamp()}  ← session.ended  (${Number(msg.session_duration_seconds).toFixed(1)}s billed)`);
      break;
  }
};

const timer = setInterval(() => {
  if (!streaming) return;
  if (chunk >= totalChunks) {
    clearInterval(timer);
    streaming = false;
    setTimeout(() => {
      log.push(`${stamp()}  → session.end`);
      ws.send(JSON.stringify({ type: "session.end" }));
      setTimeout(finish, 5000);
    }, 9000);
    return;
  }
  const slice = pcm24.subarray(chunk * CHUNK, (chunk + 1) * CHUNK);
  ws.send(JSON.stringify({ type: "input.audio", audio: Buffer.from(slice.buffer, slice.byteOffset, slice.byteLength).toString("base64") }));
  chunk++;
}, 50);

function finish() {
  // assemble director audio (24kHz PCM16 mono)
  const bufs = replyChunks.map((b64) => Buffer.from(b64, "base64"));
  const total = bufs.reduce((n, b) => n + b.length, 0);
  const pcmAll = Buffer.concat(bufs, total);
  const i16 = new Int16Array(pcmAll.buffer, pcmAll.byteOffset, pcmAll.byteLength / 2);
  const sr = 24000;
  const header = Buffer.alloc(44);
  header.write("RIFF", 0); header.writeUInt32LE(36 + pcmAll.length, 4); header.write("WAVE", 8);
  header.write("fmt ", 12); header.writeUInt32LE(16, 16); header.writeUInt16LE(1, 20); header.writeUInt16LE(1, 22);
  header.writeUInt32LE(sr, 24); header.writeUInt32LE(sr * 2, 28); header.writeUInt16LE(2, 32); header.writeUInt16LE(16, 34);
  header.write("data", 36); header.writeUInt32LE(pcmAll.length, 40);
  writeFileSync("media/director-live.wav", Buffer.concat([header, pcmAll]));

  writeFileSync("media/live-session-log.txt", log.join("\n"));
  writeFileSync("media/live-session-events.json", JSON.stringify(events, null, 1));
  console.log("director audio:", (i16.length / sr).toFixed(1) + "s,", replyChunks.length, "chunks");
  console.log("log lines:", log.length);
  console.log(log.slice(0, 12).join("\n"));
  process.exit(0);
}

setTimeout(() => { console.log("TIMEOUT"); console.log(log.join("\n")); process.exit(1); }, 120000);
