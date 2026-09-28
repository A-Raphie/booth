# Booth — Handoff

Read this first if you're picking up the project.

## Current state
Full v1 built AND verified against the real AssemblyAI API (Sep 28, ~23:59 WAT). Key obtained from the dashboard via IAB, stored in `.env.local` (gitignored). Token minting works; sync transcription works on real audio (73 words, all timestamped, planted flubs visible in transcript); the Voice Agent WS loop works headless: greeting audio, user transcript, a real `call_retake` tool call with a spoken cut line, clean session.end, zero errors. Remaining unverified in-browser only: mic AudioWorklet path and browser playback (needs raphie's ears + mic), and the `reply.create` nudge field name (backup path only).

## What's done
- Idea pass + design + naming + spec docs (see ORCHESTRATOR.md ledger)
- `/api/token` (temp token mint) and `/api/sync` (universal-3.5-pro proxy, timestamps, audio/wav typing fix)
- `lib/voice-agent.ts` (WS client: inline config, tools, reply.create, session.end discipline)
- `lib/capture.ts` + `public/pcm-processor.js` (AudioWorklet mic → 24k WS feed + full-rate master)
- `lib/script.ts` (parsing, token Levenshtein, numeric-flub detection), `lib/takes.ts`, `lib/splice.ts`
- `/booth` (script → live → wrapped phases, slate stamp, level strip, take log, master download)
- Landing with live proof widget running the real pipeline on `public/badtake.wav` (macOS-synthesized bad take, misreads planted on lines 3 and 7)
- README (judge path + honesty table), docs/submission/ (OVERVIEW, RUBRIC_MAP, DEMO_SCRIPT), og.png
- `scripts/ws-protocol-test.mjs` — repeatable headless verification of the whole agent loop
- Repo: https://github.com/A-Raphie/booth (pushed through commit b554301)

## In progress
- Nothing mid-flight; deploy is the next gate.

## Blocked / waiting
- **Deploy go**: Vercel deploy is a stop-condition item per AGENTS.md (publishing) — awaiting explicit go. Key is ready to set as env var.
- **Submission go**: lablab submission happens only on explicit go.
- Account note: AssemblyAI Free plan with $99.99 credits; agent sessions bill from it.

## How to run it
```bash
npm install
npm run dev            # BYO key via the in-app panel if no env var
npm run build && npm start
```

## Next steps (Sep 29)
1. Raphie supplies `ASSEMBLYAI_API_KEY` (+ deploy go) → deploy to Vercel, set env var, verify URL incognito.
2. Live test with real mic: greeting plays → read 3 lines → plant a number flub → cut-in fires → wrap → master downloads. Fix what breaks (likely: voice name validity, reply.create field name, resampling artifacts).
3. Record demo video per docs/submission/DEMO_SCRIPT.md (demo-script → vo-first chain).
4. Gates: mock-hunter, claims-verify, pre-ship-gate, fixing-metadata sweep.
5. Submit on lablab (explicit go), then keep-alive + post-hackathon.

## Open questions
- Director voice: `alba` assumed valid; confirm on first live session, swap to `anna` if rejected.
- `reply.create` instructions field name assumed; verify live.

## Pointers
- Spec: [PRD.md](./PRD.md) · [Architecture.md](./Architecture.md) · [design.md](./design.md)
- Plan: [Tasks.md](./Tasks.md) · History: [Memory.md](./Memory.md) · Router: [ORCHESTRATOR.md](./ORCHESTRATOR.md)
