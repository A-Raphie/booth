/**
 * AudioWorklet: posts raw mono Float32 chunks from the mic at the context's
 * native rate. All resampling / encoding happens on the main thread.
 */
class PCMSource extends AudioWorkletProcessor {
  constructor() {
    super();
    // ~10ms of frames per postMessage at any sample rate
    this._framesPerPost = Math.max(1, Math.round(sampleRate / 100));
    this._acc = new Float32Array(this._framesPerPost);
    this._fill = 0;
  }

  process(inputs) {
    const input = inputs[0];
    if (!input || !input[0]) return true;
    const ch = input[0];
    for (let i = 0; i < ch.length; i++) {
      this._acc[this._fill++] = ch[i];
      if (this._fill === this._framesPerPost) {
        this.port.postMessage({ raw: this._acc.slice(0) });
        this._fill = 0;
      }
    }
    return true;
  }
}

registerProcessor("pcm-source", PCMSource);
