/**
 * Mic capture: AudioWorklet posts native-rate Float32 chunks; this class
 * maintains the full-rate master take and emits 24kHz PCM16 chunks sized for
 * the Voice Agent socket (~50ms). getUserMedia: echoCancellation on,
 * noiseSuppression off (the server denoises; layering hurts STT).
 */
import { floatToInt16, resampleLinear } from "./audio-utils";

const TARGET_RATE = 24000;
const CHUNK_SAMPLES = 1200; // 50ms @ 24kHz

export class BoothCapture {
  private ctx: AudioContext | null = null;
  private stream: MediaStream | null = null;
  private node: AudioWorkletNode | null = null;
  private analyser: AnalyserNode | null = null;
  private master: Int16Array[] = [];
  private masterSamples = 0;
  private resampleCarry: Float32Array = new Float32Array(0);
  private outBuf: Int16Array = new Int16Array(CHUNK_SAMPLES);
  private outFill = 0;

  sampleRate = 48000;
  running = false;

  constructor(
    private onWsAudio: (base64Pcm16: string) => void,
    private onLevel: (rms: number) => void,
  ) {}

  async start() {
    this.stream = await navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: true, noiseSuppression: false },
    });
    this.ctx = new AudioContext();
    this.sampleRate = this.ctx.sampleRate;
    await this.ctx.audioWorklet.addModule("/pcm-processor.js");

    const source = this.ctx.createMediaStreamSource(this.stream);
    this.node = new AudioWorkletNode(this.ctx, "pcm-source");
    this.analyser = this.ctx.createAnalyser();
    this.analyser.fftSize = 512;

    this.node.port.onmessage = (ev) => {
      const raw = ev.data.raw as Float32Array;
      if (!raw) return;
      this.ingest(raw);
    };

    source.connect(this.node);
    source.connect(this.analyser);
    this.running = true;
    this.pollLevel();
  }

  private ingest(raw: Float32Array) {
    // master path: full-rate Int16
    const i16 = floatToInt16(raw);
    this.master.push(i16);
    this.masterSamples += i16.length;

    // socket path: resample to 24k, emit 50ms Int16 chunks
    const carry = new Float32Array(this.resampleCarry.length + raw.length);
    carry.set(this.resampleCarry, 0);
    carry.set(raw, this.resampleCarry.length);
    const resampled = resampleLinear(carry, this.sampleRate, TARGET_RATE);
    const keep = carry.length - Math.floor(carry.length / this.sampleRate * TARGET_RATE);
    this.resampleCarry = carry.slice(carry.length - keep);

    const f32ToI16 = floatToInt16(resampled);
    let i = 0;
    while (i < f32ToI16.length) {
      const n = Math.min(CHUNK_SAMPLES - this.outFill, f32ToI16.length - i);
      this.outBuf.set(f32ToI16.subarray(i, i + n), this.outFill);
      this.outFill += n;
      i += n;
      if (this.outFill === CHUNK_SAMPLES) {
        this.onWsAudio(bufferToBase64(this.outBuf));
        this.outBuf = new Int16Array(CHUNK_SAMPLES);
        this.outFill = 0;
      }
    }
  }

  private levelBuf = new Float32Array(256);
  private pollLevel = () => {
    if (!this.running || !this.analyser) return;
    this.analyser.getFloatTimeDomainData(this.levelBuf);
    let sum = 0;
    for (let i = 0; i < this.levelBuf.length; i++) sum += this.levelBuf[i] ** 2;
    this.onLevel(Math.sqrt(sum / this.levelBuf.length));
    setTimeout(this.pollLevel, 80);
  };

  /** Cumulative master sample count (for mapping wall-clock to audio time). */
  get masterSampleCount() {
    return this.masterSamples;
  }

  /** Current master playback position in ms. */
  get masterMs() {
    return (this.masterSamples / this.sampleRate) * 1000;
  }

  async stop(): Promise<{ chunks: Int16Array[]; sampleRate: number; durationMs: number }> {
    this.running = false;
    this.node?.port.close();
    this.node?.disconnect();
    this.analyser?.disconnect();
    this.stream?.getTracks().forEach((t) => t.stop());
    await this.ctx?.close();
    this.ctx = null;
    return {
      chunks: this.master,
      sampleRate: this.sampleRate,
      durationMs: (this.masterSamples / this.sampleRate) * 1000,
    };
  }
}

function bufferToBase64(i16: Int16Array): string {
  const bytes = new Uint8Array(i16.buffer, i16.byteOffset, i16.byteLength);
  let binary = "";
  for (let i = 0; i < bytes.length; i += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  }
  return btoa(binary);
}
