#!/usr/bin/env node
/**
 * Booth QA harness (ship-rehearsal Phase 3).
 * Wraps the app's real flows as CLI subcommands against a deployed URL.
 * Usage: npx tsx scripts/qa.mjs <baseUrl>   e.g. npx tsx scripts/qa.mjs https://booth-voice.netlify.app
 * Exit 0 only if every case passes. Kept in the repo as the regression net.
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const BASE = process.argv[2] ?? "https://booth-voice.netlify.app";
const root = fileURLToPath(new URL("..", import.meta.url));
const results = [];

function check(name, ok, detail = "") {
  results.push({ name, ok, detail });
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? "  — " + detail : ""}`);
}

const { parseScript, scoreSegmentAgainstScript, numericValue, tokenize } = await import(`${root}/lib/script.ts`);
const { alignWordsToLines, buildMasterFromSpans } = await import(`${root}/lib/splice.ts`);
const { chunkForSync, downsampleInt16, concatInt16 } = await import(`${root}/lib/transcribe.ts`);

// ---------- token flow ----------
{
  const res = await fetch(`${BASE}/api/token`);
  const body = await res.json().catch(() => ({}));
  check("token: mint (no extra headers)", res.ok && typeof body.token === "string" && body.token.length > 20,
    res.ok ? `len=${body.token?.length}` : JSON.stringify(body));
}
{
  // on a key-configured deploy the server key takes precedence over any BYO
  // header: mint must still succeed and never echo the key back
  const res = await fetch(`${BASE}/api/token`, { headers: { "x-aai-key": "garbage-key-000" } });
  const body = await res.json().catch(() => ({}));
  check("token: server key takes precedence over bogus BYO header",
    res.ok && typeof body.token === "string" && !JSON.stringify(body).includes("garbage"),
    `status=${res.status}`);
}
{
  const res = await fetch(`${BASE}/api/token`, { headers: { "x-aai-key": "" } });
  const body = await res.json().catch(() => ({}));
  check("token: empty BYO header falls back to server key", res.ok && typeof body.token === "string", `status=${res.status}`);
}

// ---------- sync flow (uses the deployed /badtake.wav as the honest fixture) ----------
let goodWords = null;
{
  const wav = await (await fetch(`${BASE}/badtake.wav`)).blob();
  const form = new FormData();
  form.append("audio", new File([wav], "badtake.wav", { type: "audio/wav" }));
  const res = await fetch(`${BASE}/api/sync`, { method: "POST", body: form });
  const body = await res.json().catch(() => ({}));
  goodWords = body.words ?? null;
  const stamped = (goodWords ?? []).filter((w) => w.start != null).length;
  check("sync: bad take transcribes with timestamps", res.ok && stamped > 50,
    `${(goodWords ?? []).length} words, ${stamped} stamped, conf=${body.confidence?.toFixed?.(2)}`);
}
{
  const form = new FormData();
  const res = await fetch(`${BASE}/api/sync`, { method: "POST", body: form });
  check("sync: missing audio part -> 400", res.status === 400, `status=${res.status}`);
}
{
  const form = new FormData();
  form.append("audio", new File([new Uint8Array(0)], "empty.wav", { type: "audio/wav" }));
  const res = await fetch(`${BASE}/api/sync`, { method: "POST", body: form });
  check("sync: empty audio -> upstream 4xx passed through", res.status >= 400 && res.status < 500, `status=${res.status}`);
}
{
  const form = new FormData();
  form.append("audio", new File([readFileSync(`${root}/package.json`)], "notaudio.wav", { type: "audio/wav" }));
  const res = await fetch(`${BASE}/api/sync`, { method: "POST", body: form });
  check("sync: wrong-type bytes -> upstream 4xx passed through", res.status >= 400 && res.status < 500, `status=${res.status}`);
}

// ---------- judge (pure client logic, run as the browser would) ----------
{
  const lines = parseScript("Twelve grams.\nTwenty minutes.");
  const cov = scoreSegmentAgainstScript(tokenize("twelve grams"), lines);
  check("judge: exact read scores clean", cov[0].score > 0.95 && !cov[0].flubbed, `score=${cov[0].score.toFixed(2)}`);
}
{
  const lines = parseScript("Add four cups of cold water.");
  const cov = scoreSegmentAgainstScript(tokenize("add two cups of cold water"), lines);
  check("judge: numeric misread caught", cov[0].numericFlub && cov[0].flubbed, `score=${cov[0].score.toFixed(2)}`);
}
{
  const lines = parseScript("Add four cups of cold water.");
  const cov = scoreSegmentAgainstScript([], lines);
  check("judge: empty segment handled", cov.every((c) => !c.covered), JSON.stringify(cov));
}
{
  const lines = parseScript("Café résumé — naïve audio, 25°C.");
  const cov = scoreSegmentAgainstScript(tokenize("café résumé naïve audio 25°C"), lines);
  check("judge: unicode script + digits read", cov[0].score > 0.8, `score=${cov[0].score.toFixed(2)}`);
}
{
  // numericValue's contract is single clean tokens; slashed numbers arrive
  // pre-split by tokenize (the STT renders "fifty fifty" as "50/50")
  const split = tokenize("cut it 50/50").map(numericValue).filter((v) => v !== null);
  check("judge: numericValue word/numeral equivalence", numericValue("twelve") === "12" && numericValue("12") === "12" && split.join() === "50,50",
    `tokenized 50/50 -> ${JSON.stringify(split)}`);
}
{
  const big = Array.from({ length: 5000 }, (_, i) => `word${i}`).join(" ");
  const lines = parseScript("Set the script.\nRead it out loud.");
  const t0 = Date.now();
  scoreSegmentAgainstScript(tokenize(big), lines);
  check("judge: 5k-token segment stays fast", Date.now() - t0 < 2000, `${Date.now() - t0}ms`);
}

// ---------- align ----------
{
  check("align: empty words -> no spans", alignWordsToLines([], parseScript("hello world")) .length === 0);
}
{
  const spans = alignWordsToLines([{ text: "hello", confidence: 0.9 }, { text: "world", confidence: 0.9 }], parseScript("hello world"));
  check("align: words without timestamps skipped", spans.length === 0, JSON.stringify(spans));
}
{
  const words = [
    { text: "hello", confidence: 0.9, start: 0, end: 400 },
    { text: "world", confidence: 0.9, start: 500, end: 900 },
  ];
  const spans = alignWordsToLines(words, parseScript("hello world"));
  check("align: basic two-word alignment", spans.length === 1 && spans[0].line === 1, JSON.stringify(spans));
}

// ---------- splice ----------
{
  const pcm = new Int16Array(48000); // 1 s of silence @48k
  const built = buildMasterFromSpans([pcm], 48000, []);
  check("splice: no spans -> empty master", built.blob.size === 44, `${built.blob.size} bytes`);
}
{
  const pcm = new Int16Array(48000).map((_, i) => (i % 100 < 50 ? 8000 : -8000));
  const spans = [
    { line: 2, startMs: 0, endMs: 500, score: 0.9 },
    { line: 1, startMs: 500, endMs: 900, score: 0.9 }, // out of order on purpose
  ];
  const built = buildMasterFromSpans([pcm], 48000, spans);
  check("splice: out-of-order spans still assemble", built.blob.size > 44 && built.usedLines.join() === "2,1", `${built.blob.size}B used=${built.usedLines}`);
}
{
  const pcm = new Int16Array(48000);
  const spans = [{ line: 1, startMs: 60000, endMs: 61000, score: 0.9 }];
  const built = buildMasterFromSpans([pcm], 48000, spans);
  check("splice: span beyond audio dropped safely", built.usedLines.length === 0, JSON.stringify(built));
}

// ---------- chunking ----------
{
  const pcm = new Int16Array(16000); // 1 s @16k
  check("chunk: short audio -> single chunk", chunkForSync(pcm, 16000).length === 1);
}
{
  const pcm = new Int16Array(16000 * 150); // 150 s @16k
  const parts = chunkForSync(pcm, 16000);
  const okSizes = parts.every((p) => p.pcm.length <= 16000 * 111);
  check("chunk: 150s splits under the 110s ceiling", parts.length >= 2 && okSizes, `${parts.length} chunks`);
}
{
  const pcm = new Int16Array(16000 * 110); // exactly at ceiling
  check("chunk: boundary audio -> single chunk", chunkForSync(pcm, 16000).length === 1);
}
{
  const pcm = new Int16Array(16000 * 200); // 200 s of pure silence
  const parts = chunkForSync(pcm, 16000);
  const contiguous = parts.every((p, i) => i === 0 || parts[i - 1].offsetMs + (parts[i - 1].pcm.length / 16000) * 1000 <= p.offsetMs + 1);
  check("chunk: silent audio splits contiguously", parts.length >= 2 && contiguous, `${parts.length} chunks`);
}
{
  const pcm = concatInt16([new Int16Array(16000), new Int16Array(8000)]);
  check("chunk: concatInt16 preserves length", pcm.length === 24000);
  check("chunk: downsample 48k->16k ratio", downsampleInt16(new Int16Array(48000), 48000).length === 16000);
}

// ---------- real-user sequencing: token -> sync -> judge -> align ----------
{
  try {
    const tokenRes = await fetch(`${BASE}/api/token`);
    const { token } = await tokenRes.json();
    const wav = await (await fetch(`${BASE}/badtake.wav`)).blob();
    const form = new FormData();
    form.append("audio", new File([wav], "badtake.wav", { type: "audio/wav" }));
    const syncRes = await fetch(`${BASE}/api/sync`, { method: "POST", body: form });
    const { words } = await syncRes.json();
    const lines = parseScript(`Eighteen hours. That is all this takes.
Coarse grind one cup of your darkest roast.
Add four cups of cold, filtered water.
Stir once, cover it, and walk away.
By morning you have a smooth, low acid concentrate.
Cut it fifty fifty with water or milk over ice.
One batch makes twelve servings for about sixty cents each.
No machine, no heat, no bitterness.
Just the deepest, sweetest cup you have ever made at home.`);
    const spans = alignWordsToLines(words, lines);
    const flubbed = spans.filter((span) => {
      const line = lines.find((l) => l.n === span.line);
      const cov = scoreSegmentAgainstScript(
        words.filter((w) => w.start >= span.startMs && (w.end ?? 0) <= span.endMs).flatMap((w) => tokenize(w.text)),
        [line],
      )[0];
      return cov?.flubbed;
    }).map((s) => s.line);
    check("sequence: token→sync→judge→align end-to-end",
      tokenRes.ok && syncRes.ok && spans.length === 9 && flubbed.join() === "3,7",
      `spans=${spans.length} flubs=${flubbed.join(",")}`);
  } catch (e) {
    check("sequence: token→sync→judge→align end-to-end", false, String(e).slice(0, 120));
  }
}

const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} passed${failed.length ? ` — FAILURES: ${failed.map((f) => f.name).join("; ")}` : " — CLEAN"}`);
process.exit(failed.length ? 1 : 0);
