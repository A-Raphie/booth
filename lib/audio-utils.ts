/** Pure audio conversion helpers. No dependencies. */

export function floatToInt16(f32: Float32Array): Int16Array {
  const out = new Int16Array(f32.length);
  for (let i = 0; i < f32.length; i++) {
    const s = Math.max(-1, Math.min(1, f32[i]));
    out[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
  }
  return out;
}

export function resampleLinear(
  input: Float32Array,
  fromRate: number,
  toRate: number,
): Float32Array {
  if (fromRate === toRate) return input;
  const ratio = fromRate / toRate;
  const outLen = Math.floor(input.length / ratio);
  const out = new Float32Array(outLen);
  for (let i = 0; i < outLen; i++) {
    const pos = i * ratio;
    const i0 = Math.floor(pos);
    const frac = pos - i0;
    const a = input[i0] ?? 0;
    const b = input[i0 + 1] ?? a;
    out[i] = a + (b - a) * frac;
  }
  return out;
}

export function int16ToBase64(i16: Int16Array): string {
  const bytes = new Uint8Array(i16.buffer, i16.byteOffset, i16.byteLength);
  let binary = "";
  const CHUNK = 0x8000;
  for (let i = 0; i < bytes.length; i += CHUNK) {
    binary += String.fromCharCode(...bytes.subarray(i, i + CHUNK));
  }
  return btoa(binary);
}

export function base64Pcm16ToFloat32(b64: string, targetRate: number): {
  data: Float32Array;
  rate: number;
} {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  const i16 = new Int16Array(bytes.buffer);
  const f32 = new Float32Array(i16.length);
  for (let i = 0; i < i16.length; i++) f32[i] = i16[i] / 0x8000;
  return { data: f32, rate: targetRate };
}

/** Encode concatenated Int16 chunks as a 16-bit PCM WAV blob. */
export function encodeWav(chunks: Int16Array[], sampleRate: number): Blob {
  let total = 0;
  for (const c of chunks) total += c.length;
  const buffer = new ArrayBuffer(44 + total * 2);
  const view = new DataView(buffer);

  const writeStr = (offset: number, s: string) => {
    for (let i = 0; i < s.length; i++) view.setUint8(offset + i, s.charCodeAt(i));
  };

  writeStr(0, "RIFF");
  view.setUint32(4, 36 + total * 2, true);
  writeStr(8, "WAVE");
  writeStr(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, 1, true); // mono
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeStr(36, "data");
  view.setUint32(40, total * 2, true);

  let offset = 44;
  for (const c of chunks) {
    for (let i = 0; i < c.length; i++) {
      view.setInt16(offset, c[i], true);
      offset += 2;
    }
  }
  return new Blob([buffer], { type: "audio/wav" });
}

/** Apply a short linear fade at the edges of an Int16 span (in place). */
export function fadeEdges(i16: Int16Array, start: number, end: number, samples: number) {
  const s = Math.max(0, start);
  const e = Math.min(i16.length, end);
  const n = Math.min(samples, Math.floor((e - s) / 2));
  for (let i = 0; i < n; i++) {
    const g = i / n;
    i16[s + i] = Math.round(i16[s + i] * g);
    i16[e - 1 - i] = Math.round(i16[e - 1 - i] * g);
  }
}
