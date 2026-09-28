/**
 * Splicer: aligns sync-API words to script lines, then assembles the master
 * from the best-scoring read of each line (a re-read beats the flubbed first
 * take because its alignment score is higher). Pure functions.
 */
import { ScriptLine, tokenize, tokenRatio } from "./script";
import { encodeWav, fadeEdges } from "./audio-utils";

export type Word = { text: string; confidence: number; start?: number; end?: number };
export type LineSpan = { line: number; startMs: number; endMs: number; score: number };

const MATCH_MIN = 0.45;

/** Walk the word stream once; for each script line take the best-scoring window. */
export function alignWordsToLines(words: Word[], lines: ScriptLine[]): LineSpan[] {
  const tokens = words.map((w) => tokenize(w.text)[0] ?? "");
  const spans: LineSpan[] = [];

  let p = 0;
  for (const line of lines) {
    const w = line.tokens.length;
    if (w === 0) continue;
    const lookahead = w * 3 + 12;
    let bestScore = 0;
    let bestStart = -1;
    let bestEnd = -1;

    for (let start = p; start < Math.min(tokens.length, p + lookahead); start++) {
      for (let len = Math.max(1, w - 2); len <= w + 3; len++) {
        const end = start + len;
        if (end > tokens.length) break;
        const score = tokenRatio(line.tokens, tokens.slice(start, end));
        if (score > bestScore) {
          bestScore = score;
          bestStart = start;
          bestEnd = end;
        }
      }
    }

    if (bestStart >= 0 && bestScore >= MATCH_MIN) {
      const s = words[bestStart].start;
      const e = words[bestEnd - 1].end;
      if (s != null && e != null && e > s) {
        spans.push({ line: line.n, startMs: s, endMs: e, score: bestScore });
        p = bestEnd;
      }
    }
  }
  return spans;
}

/**
 * Assemble the master: concatenate each line's best-read span in script order,
 * with a short inter-line breath. Cuts use 240-sample fades to avoid clicks.
 */
export function buildMasterFromSpans(
  chunks: Int16Array[],
  sampleRate: number,
  spans: LineSpan[],
  breathMs = 140,
): { blob: Blob; usedLines: number[]; droppedLines: number[] } {
  let total = 0;
  for (const c of chunks) total += c.length;
  const all = new Int16Array(total);
  let off = 0;
  for (const c of chunks) {
    all.set(c, off);
    off += c.length;
  }

  const msToSample = (ms: number) => Math.floor((ms / 1000) * sampleRate);
  const breath = msToSample(breathMs);
  const used: number[] = [];
  const dropped: number[] = [];

  const pieces: { start: number; end: number }[] = [];
  for (const span of spans) {
    const s = msToSample(span.startMs);
    const e = Math.min(msToSample(span.endMs) + msToSample(60), all.length);
    if (e - s < sampleRate * 0.05) {
      dropped.push(span.line);
      continue;
    }
    pieces.push({ start: s, end: e });
    used.push(span.line);
  }

  const outLen =
    pieces.reduce((n, p) => n + (p.end - p.start), 0) + Math.max(0, pieces.length - 1) * breath;
  const out = new Int16Array(outLen);
  let cursor = 0;
  pieces.forEach((p, i) => {
    out.set(all.subarray(p.start, p.end), cursor);
    fadeEdges(out, cursor, cursor + (p.end - p.start), 240);
    cursor += p.end - p.start;
    if (i < pieces.length - 1) {
      for (let j = 0; j < breath; j++) out[cursor + j] = 0;
      cursor += breath;
    }
  });

  return { blob: encodeWav([out], sampleRate), usedLines: used, droppedLines: dropped };
}

/** The untouched session recording, for transparency. */
export function buildRawTake(chunks: Int16Array[], sampleRate: number): Blob {
  return encodeWav(chunks, sampleRate);
}
