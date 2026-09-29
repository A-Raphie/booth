# Claims — Booth

Write-time evidence table for every user-facing assertion. Contract: copy is a spec; every sentence cites its backing. Re-verify after any deploy (claims-verify).

Deployed revision binding: verified 2026-09-29 — audit-commit markers (`h2.microlabel The session`, `pb-20`) and post-deploy claim markers (`1.8 s`, `listens to every word`) both present in served HTML of https://booth-voice.netlify.app.

| # | Claim | Location | Backing / verification | Verdict |
|---|---|---|---|---|
| 1 | "Booth listens to every word" | Hero | Streaming STT transcribes full reads (protocol-test transcripts) | TRUE |
| 2 | "cuts you off with the exact line to redo" | Hero | Live `call_retake` tool call + spoken cut observed (ws-protocol-test); LLM variance disclosed in honesty table; numeric-flub backstop is deterministic | TRUE w/ disclosure |
| 3 | "hands you a clean master when you wrap" | Hero | Splice exercised on real audio + real words: 9/9 lines, valid 26.93s WAV (afinfo) | TRUE |
| 4 | Master assembled from word-level timestamps, best read per line, spliced with fades, in-browser | Dev section | Same exercise; fades in `lib/splice.ts` | TRUE |
| 5 | "Raw session audio never leaves your machine except as a transcription request" | Dev section + booth footer | Both audio egresses are AssemblyAI STT (sync POST, voice-agent WS); token route carries no audio | TRUE |
| 6 | "1.8 s — after your pause, the cut is triggered, by design" | Stats band | Code: 1800 ms nudge timer + `reply.create` (was "~3 s", narrowed per claims-verify: unmeasured) | TRUE (code-backed) |
| 7 | "45 min scrubbing takes, per video, today" | Stats band | Operator's own channel workflow (estimate by testimony, not instrumented) | TRUE-by-testimony |
| 8 | "0 editing sessions when you wrap" | Stats band | Master downloads as WAV; no editor step | TRUE |
| 9 | "Chrome or Edge · microphone · 2 minutes" | Hero meta | Conservative browser claim (Chromium is what's tested) | TRUE (conservative) |
| 10 | Demo runs the real judge pipeline, no mic needed | Demo widget | Exercised twice in-browser: 9/9 lines, 97% conf, flubs 3,7 | TRUE |
| 11 | "Every retake call you see stamped on the script is a tool call the agent made" | Dev section | `tool.call` events observed live | TRUE |
| 12 | Key panel: "stays in this browser and is sent only to start recordings" | Booth key panel | localStorage; only egress is `/api/token` | TRUE |
| 13 | "Get a free one" → key signup | Key panel | Lands on AssemblyAI login → api-keys flow | TRUE |
| 14 | Config snippet shapes (`session.update`, `tool.call`) | Dev section | Match observed protocol messages | TRUE |
| 15 | Cut fires ~1 s after the pause, mid-sentence | (removed) | False as stated: agent replies after end-of-turn | FIXED: removed; reality disclosed |

Last full verification: 2026-09-29 (claims-verify run: 19 harvested, 17 TRUE, 2 FALSE→fixed by narrowing).
