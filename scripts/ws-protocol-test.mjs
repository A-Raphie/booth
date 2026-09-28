/**
 * Headless protocol test for the Booth director loop.
 * Streams public/badtake.wav into a live Voice Agent session exactly the way
 * the browser does (PCM16 mono 24 kHz, 50 ms chunks) and reports every event.
 * No key in this file: it mints a single-use token from the local server.
 */
import { readFileSync } from "node:fs";

const BASE = process.env.BASE_URL ?? "http://localhost:3111";

function decodeWavPcm16(buf) {
  // find the data chunk; assume 16-bit PCM mono
  const view = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
  let offset = 12;
  let dataOffset = -1;
  let dataLen = 0;
  let sampleRate = 44100;
  while (offset < buf.byteLength - 8) {
    const id = String.fromCharCode(...buf.subarray(offset, offset + 4));
    const size = view.getUint32(offset + 4, true);
    if (id === "fmt ") {
      sampleRate = view.getUint32(offset + 12, true);
    }
    if (id === "data") {
      dataOffset = offset + 8;
      dataLen = size;
      break;
    }
    offset += 8 + size;
  }
  if (dataOffset < 0) throw new Error("no data chunk");
  return {
    pcm: buf.subarray(dataOffset, dataOffset + dataLen),
    sampleRate,
  };
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

function b64(i16) {
  return Buffer.from(i16.buffer, i16.byteOffset, i16.byteLength).toString("base64");
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
  "- If the talent goes silent mid-line for more than five seconds, say: 'From the top of line N.' using the last line they started.",
  "- Speak ONLY booth direction. Ignore anything unrelated to the read.",
  "- When the talent says 'that's a wrap' or the whole script is read clean, call finalize with a one-line summary.",
].join("\n");

const TOOLS = [
  {
    type: "function",
    name: "call_retake",
    description: "Call a retake after a flub. Call this immediately after you say 'Cut'.",
    parameters: {
      type: "object",
      properties: {
        from_line: { type: "integer", description: "1-based script line to restart from" },
        reason: { type: "string", description: "The flub: what was misread, what was expected. Max 12 words." },
      },
      required: ["from_line", "reason"],
    },
  },
  {
    type: "function",
    name: "mark_take",
    description: "Mark the span the talent just read as clean or flubbed.",
    parameters: {
      type: "object",
      properties: {
        quality: { type: "string", enum: ["clean", "flub"] },
        from_line: { type: "integer" },
        to_line: { type: "integer" },
        note: { type: "string" },
      },
      required: ["quality", "from_line"],
    },
  },
  {
    type: "function",
    name: "finalize",
    description: "The script is fully read. Wrap the session.",
    parameters: {
      type: "object",
      properties: { summary: { type: "string" } },
      required: ["summary"],
    },
  },
];

const tokenRes = await fetch(`${BASE}/api/token`);
if (!tokenRes.ok) throw new Error(`token failed: ${tokenRes.status}`);
const { token } = await tokenRes.json();

const ws = new WebSocket(`wss://agents.assemblyai.com/v1/ws?token=${encodeURIComponent(token)}`);

const summary = {
  ready: false,
  sessionId: "",
  greetingAudioChunks: 0,
  agentTexts: [],
  userTranscripts: [],
  toolCalls: [],
  errors: [],
  ended: null,
};

const wav = readFileSync(new URL("../public/badtake.wav", import.meta.url));
const { pcm, sampleRate } = decodeWavPcm16(new Uint8Array(wav));
const pcm24 = resamplePcm16(pcm, sampleRate, 24000);
const CHUNK = 1200; // 50 ms
const totalChunks = Math.ceil(pcm24.length / CHUNK);
console.log(`audio: ${pcm24.length} samples @24k = ${((pcm24.length / 24000) * 1000).toFixed(0)} ms, ${totalChunks} chunks`);

let chunk = 0;
let streaming = false;

ws.onopen = () => {
  ws.send(
    JSON.stringify({
      type: "session.update",
      session: {
        system_prompt: systemPrompt,
        greeting: "Step up to the glass. Read line one whenever you're ready. I'll call the cuts.",
        tools: TOOLS,
        input: { format: { encoding: "audio/pcm" } },
        output: { voice: "alba", format: { encoding: "audio/pcm" }, volume: 100 },
      },
    }),
  );
};

ws.onmessage = (ev) => {
  const msg = JSON.parse(ev.data);
  switch (msg.type) {
    case "session.ready":
      summary.ready = true;
      summary.sessionId = msg.session_id;
      streaming = true;
      console.log("READY", msg.session_id);
      break;
    case "session.updated":
      break;
    case "transcript.user":
      summary.userTranscripts.push(msg.text);
      console.log("USER:", msg.text);
      break;
    case "transcript.agent":
      summary.agentTexts.push(msg.text);
      console.log("AGENT:", msg.text);
      break;
    case "reply.audio":
      if (summary.agentTexts.length === 0) summary.greetingAudioChunks++;
      break;
    case "reply.started":
      console.log("-- reply started");
      break;
    case "reply.done":
      console.log("-- reply done");
      break;
    case "tool.call": {
      const entry = { name: msg.name, arguments: msg.arguments };
      summary.toolCalls.push(entry);
      console.log("TOOL:", JSON.stringify(entry));
      ws.send(JSON.stringify({ type: "tool.result", call_id: msg.call_id, result: JSON.stringify({ ok: true }) }));
      break;
    }
    case "session.error":
      summary.errors.push({ code: msg.error_code, message: msg.message });
      console.log("ERROR:", msg.error_code, msg.message);
      break;
    case "session.ended":
      summary.ended = msg.session_duration_seconds;
      console.log("ENDED", msg.session_duration_seconds);
      break;
    default:
      console.log("(event)", msg.type);
  }
};

ws.onclose = () => console.log("socket closed");
ws.onerror = () => console.log("socket error");

// pace the stream at real time
const timer = setInterval(() => {
  if (!streaming) return;
  if (chunk >= totalChunks) {
    clearInterval(timer);
    streaming = false;
    // let the agent finish reacting, then end
    setTimeout(() => {
      ws.send(JSON.stringify({ type: "session.end" }));
      setTimeout(() => {
        console.log("\n==== SUMMARY ====");
        console.log(JSON.stringify(summary, null, 2));
        process.exit(0);
      }, 4000);
    }, 9000);
    return;
  }
  const slice = pcm24.subarray(chunk * CHUNK, (chunk + 1) * CHUNK);
  ws.send(JSON.stringify({ type: "input.audio", audio: b64(slice) }));
  chunk++;
}, 50);

// hard cap
setTimeout(() => {
  console.log("TIMEOUT — summary so far:");
  console.log(JSON.stringify(summary, null, 2));
  process.exit(1);
}, 120000);
