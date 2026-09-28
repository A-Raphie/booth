# Booth — Architecture

## Overview
Booth is a browser app where a user reads a script aloud and a managed AssemblyAI Voice Agent API agent ("the director") listens, judges the read against the script, interrupts with retake calls via client-side tools, and the client assembles a clean master from raw takes. No persistent server: Next.js on Vercel, one serverless route mints single-use tokens, one proxies sync transcription. Audio processing (capture, splice, export) is 100% client-side Web Audio.

## Components
- **Token route** `app/api/token/route.ts` — GET; mints a single-use Voice Agent token (`GET https://agents.assemblyai.com/v1/token`, Bearer server-side key, `expires_in_seconds=300`). Key never reaches the browser (fallback: BYO-key in localStorage mints directly for local dev).
- **Sync route** `app/api/sync/route.ts` — POST multipart; proxies audio to `POST https://sync.assemblyai.com/v1/transcribe` with `X-AAI-Model: universal-3-5-pro`, `timestamps: true`. Returns words with ms start/end.
- **Voice Agent client** `lib/voice-agent.ts` — WS client for `wss://agents.assemblyai.com/v1/ws?token=`; sends inline `session.update` (system_prompt with script + director rules, `session.tools` for client-side tools), streams `input.audio` (base64 PCM16 mono 24kHz, ~50ms chunks), handles `transcript.user`, `reply.audio` playback, `tool.call`, `reply.create` for forced cut-ins, `session.end` discipline (billing-critical).
- **Mic pipeline** `lib/capture.ts` + `public/pcm-processor.js` (AudioWorklet) — getUserMedia (echoCancellation on, noiseSuppression off), resample to 24k PCM16, fan out to WS encoder and a parallel MediaRecorder capture of the raw session.
- **Take engine** `lib/takes.ts` — tool-call state machine: `mark_take`, `call_retake(from_line, reason)`, `finalize_take`. Maintains per-line status (clean / flubbed / pending), take log, and the event stream the UI renders.
- **Splicer** `lib/splice.ts` — decode recorded session audio, align via sync STT words (ms), cut flubbed spans + retake spans per line status, OfflineAudioContext assemble, export WAV (no external deps).
- **Demo mode** — a bundled "bad take" recording (user's own, generated once) fed through the same pipeline deterministically: no mic needed.

## Data model (client-side, localStorage)
- `booth.script` — active script text, split into lines.
- `booth.takes` — array: `{id, startedAt, lineSpans: {line, status, wordRange}, note}`.
- `booth.key` — optional BYO AssemblyAI key (dev/judge fallback only).

## Tech stack
| Layer | Choice | Why |
|---|---|---|
| Frontend | Next.js App Router, TS, Tailwind 4 | one deployable, fast build |
| Voice | AssemblyAI Voice Agent API (inline config, no stored agent) | the sponsor's hero primitive; interruptions + tools + TTS in one socket |
| Transcribe | AssemblyAI sync API (universal-3-5-pro, timestamps) | ≤120s single call, ms word alignment for splicing |
| Audio DSP | Web Audio API (OfflineAudioContext) + AudioWorklet | zero-dependency splice/export, client-side |
| Hosting | Vercel (serverless routes + static) | free, no persistent process (Raphie doctrine) |

## Key decisions & trade-offs
- **Inline agent config over stored agent** — no `POST /v1/agents` publish step; the client owns the prompt (can inject the script at session start). Trade-off: prompt lives in browser bundle (fine; nothing secret).
- **Director speaks via its own loop + `reply.create` nudges** — the agent's turn detection handles pacing; the client forces a cut-in when a flub segment ends with silence. Trade-off: no true mid-sentence barge-in (agent replies start after end-of-turn); mitigated by tuning turn detection and accepting a beat of latency like a real director.
- **MediaRecorder parallel to WS audio** — the WS stream is lossy/compressed for the agent; masters come from the local raw capture. Trade-off: two capture paths, but splice quality is full-rate.
- **Client-side tools for take state** — `tool.call`/`tool.result` makes the agent's decisions first-class app events (drives UI + take log). Sponsor-centric by construction.

## API surface
- `GET /api/token` → `{token}` (5-min redemption window)
- `POST /api/sync` (multipart: audio, config) → `{text, words[{text,confidence,start,end}], confidence, audio_duration_ms}`

## Open architectural questions
- [assumption: voices `alba`/`anna` exist per docs; will confirm live on first session.]
