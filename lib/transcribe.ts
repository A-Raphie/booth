/**
 * Transcription prep: serverless body limits (Vercel 4.5 MB, Netlify 6 MB) and
 * the sync API's 120 s ceiling mean a real session must be downsampled to
 * 16 kHz for transcription and split at quiet points. Pure functions.
 */
import type { Word } from "./splice";

export const TRANSCRIBE_RATE = 16000;
export const MAX_CHUNK_MS = 110_000; // sync API ceiling is 120 s

export function downsampleInt16(
  pcm: Int16Array,
  fromRate: number,
  toRate: number = TRANSCRIBE_RATE,
): Int16Array {
  if (fromRate === toRate) return pcm;
  const ratio = fromRate / toRate;
  const outLen = Math.floor(pcm.length / ratio);
  const out = new Int16Array(outLen);
  for (let i = 0; i < outLen; i++) {
    const pos = i * ratio;
    const i0 = Math.floor(pos);
    const frac = pos - i0;
    const a = pcm[i0] ?? 0;
    const b = pcm[i0 + 1] ?? a;
    out[i] = Math.round(a + (b - a) * frac);
  }
  return out;
}

/** Quietest ~10 ms window within +-radius of `center`; avoids cutting words. */
function quietCut(pcm: Int16Array, center: number, radius: number, rate: number): number {
  const win = Math.max(1, Math.floor(rate * 0.01));
  const from = Math.max(win, center - radius);
  const to = Math.min(pcm.length - win, center + radius);
  let best = Math.min(center, to);
  let bestEnergy = Infinity;
  for (let s = from; s <= to; s += win) {
    let energy = 0;
    for (let i = s; i < s + win; i++) energy += Math.abs(pcm[i]);
    if (energy < bestEnergy) {
      bestEnergy = energy;
      best = s;
    }
  }
  return best;
}

export type SyncChunk = { pcm: Int16Array; offsetMs: number };

export function chunkForSync(
  pcm: Int16Array,
  rate: number,
  maxMs: number = MAX_CHUNK_MS,
): SyncChunk[] {
  const maxSamples = Math.floor((maxMs / 1000) * rate);
  const radius = Math.floor(rate * 1.5);
  const out: SyncChunk[] = [];
  let start = 0;
  while (start < pcm.length) {
    if (pcm.length - start <= maxSamples) {
      out.push({ pcm: pcm.subarray(start), offsetMs: (start / rate) * 1000 });
      break;
    }
    const cut = quietCut(pcm, start + maxSamples, radius, rate);
    out.push({ pcm: pcm.subarray(start, cut), offsetMs: (start / rate) * 1000 });
    start = cut;
  }
  return out;
}

export function concatInt16(chunks: Int16Array[]): Int16Array {
  let total = 0;
  for (const c of chunks) total += c.length;
  const out = new Int16Array(total);
  let off = 0;
  for (const c of chunks) {
    out.set(c, off);
    off += c.length;
  }
  return out;
}

/** Offset a chunk's words into whole-session time. */
export function offsetWords(words: Word[], offsetMs: number): Word[] {
  return words.map((w) => ({
    ...w,
    start: w.start != null ? w.start + offsetMs : undefined,
    end: w.end != null ? w.end + offsetMs : undefined,
  }));
}
