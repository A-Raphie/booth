# Booth

**Read your voiceover script out loud. A real-time AI director cuts your flubs, calls retakes with the exact line number, and prints the clean master when you wrap.**

For anyone who records VO weekly (faceless channels, podcasters, ads), the take loop is 30-60 minutes of scrubbing per video: read, flub, hunt for where you were, fix it in an editor. Booth replaces the loop with a director on the other side of the glass.

**Live:** `_ADD_DEPLOY_URL_` · **Event:** [AssemblyAI Voice Agent Hackathon](https://lablab.ai/ai-hackathons/assemblyai-voice-agent-hackathon) (lablab.ai, Sep 2026)

---

## Judge it in 90 seconds

1. Open the live link. On the landing, press **"Run the bad take"** — a bundled bad take runs through the real judge pipeline (sync transcription → line alignment → flub scoring) and stamps the retakes. No microphone needed.
2. Press **Enter the booth →**. A sample script is preloaded; or paste your own.
3. **Take your position** (mic permission), wait for the greeting.
4. Read three lines aloud. On line 3, deliberately say a wrong number (the script says "four cups" — say "two cups").
5. The director cuts in with the line number and correction; the slate stamps on the script.
6. Press **That's a wrap** → the master assembles (best read of every line) → **Download master WAV**. The flubbed read is gone; the retake is what printed.

Everything above is deterministic except steps 4-5, which are live voice.

## What's real (and what isn't)

| Claim | Real? | Evidence |
|---|---|---|
| Live voice agent listens, follows the script, speaks direction | Real | Managed [Voice Agent API](https://www.assemblyai.com/docs/voice-agents/voice-agent-api) session; transcripts + reply audio streamed to the browser |
| Retake calls are the agent's own decisions | Real | `call_retake` / `mark_take` / `finalize` are client-side tools; every slate stamp on screen is a `tool.call` the agent made |
| Master assembled from word-level timestamps | Real | Sync API (`universal-3.5-pro`, `timestamps: true`); best-scoring read per line spliced with fades in-browser |
| Demo widget | Real pipeline | Runs sync transcription + alignment + scoring on bundled audio at press time; no mocks |
| Cut-ins fire mid-sentence | Honest gap | The agent replies after end-of-turn (you pause, then get cut) — a real director's beat, not literal barge-in. A client-side nudge (`reply.create`) forces the call when a flub ends in silence |
| Demo audio is a human | Honest gap | Synthesized on macOS for a deterministic demo; bring your own mic for the live path |
| "Print master" always perfect | Honest gap | Line selection is alignment-score based; if a line never gets a clean read it stays flubbed in the take log and the raw session WAV is provided |

## Architecture

```
Browser ── mic ── AudioWorklet ──► PCM16 24 kHz ──► Voice Agent WS (temp token, single-use)
   │                                   │                 │  reply.audio → speakers
   │                                   └─► full-rate master capture (Int16)
   │
   └─ wrap: master WAV ──► /api/sync ──► sync.assemblyai.com (universal-3.5-pro, timestamps)
                              words ──► align to lines ──► best-read splice ──► master WAV
```

- **No persistent server.** Two serverless routes (mint token, proxy sync). All audio processing is client-side Web Audio. Static hosting: Vercel.
- **API key never reaches the browser** in production; a BYO-key fallback exists for local runs.
- Session discipline: `session.end` → `session.ended` → close (no billable grace windows).

## Sponsor primitives, and where they're load-bearing

| Primitive | Used for | Removable? |
|---|---|---|
| Voice Agent API (inline config, client-side tools, interruption handling) | The director: listening, judging, speaking retake calls | No — Booth IS this agent |
| Sync STT, `universal-3.5-pro`, word timestamps | Master assembly: aligning reads to lines | No — the splice is made of these timestamps |
| Temporary session tokens | Browser-direct WS, zero server | No — the static-hosting shape depends on it |

## Run it

```bash
npm install
ASSEMBLYAI_API_KEY=<key> npm run dev   # http://localhost:3000
npm run build && npm start
```

Without a server key, the booth prompts for a BYO key (stored in localStorage, used only to mint tokens).

## Stack

Next.js 16 · React 19 · Tailwind 4 · Web Audio (AudioWorklet capture, OfflineAudioContext splice, WAV encode) · AssemblyAI Voice Agent API + Sync API. No audio libraries.

## Credits

Built by **Raphie** for the AssemblyAI Voice Agent Hackathon. Palette borrowed from AssemblyAI's own verified brand tokens.
