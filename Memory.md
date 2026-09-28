# Booth — Memory

## Decisions
- **2026-09-28** — Name `Booth` (VO recording booth; collision-checked vs A-Raphie repos + local dirs, clean). Alternatives rejected: Slate (Slate Digital audio brand), Agora (voice SDK company), Strobe (weaker usefulness).
- **2026-09-28** — Inline agent config (`session.update` in browser) over stored agent: no publish step, script injectable per session.
- **2026-09-28** — Masters from parallel MediaRecorder capture, not WS audio: full-rate raw for splicing.
- **2026-09-28** — Warm paper light palette (AssemblyAI-verified tokens) vs field's dark-neon consensus; slate stamp as signature move.
- **2026-09-28** — Kill criterion: if live cut-ins unstable by Sep 29 22:00 WAT, degrade to end-of-turn guidance only.

## Conventions
- Zero raw hex in components; tokens only in `app/globals.css`.
- All director-facing strings are studio call language; no marketing adjectives in UI copy.
- Commit + push after every working checkpoint (persistence rule).

## Gotchas
- Voice Agent tokens are SINGLE-USE: mint fresh per connection, 300s redemption window.
- Always `session.end` → wait `session.ended` → then close socket; bare close leaves a billable 30s grace window.
- Inline `session.update` and `agent_id` are mutually exclusive; `output.voice`/`greeting` immutable after `session.ready`.
- Audio before `session.ready` is discarded; AudioContext must start in a user gesture.
- Sync API requires `X-AAI-Model: universal-3-5-pro` header and multipart `audio` binary part.
- Chromium: `new AudioContext({sampleRate: 24000})` shortcut; Safari/FF need manual resample in worklet.
- Single-word misreads score ~0.86 similarity on 7-word lines: numeric-token mismatch check is the only reliable client-side flub signal for numbers; the agent LLM is the primary judge.
- `say` + `afconvert` produce the bundled bad take; regenerate with `say -v Samantha -r 150 -o /tmp/badtake.aiff -f /tmp/badtake.txt` then `afconvert -f WAVE -d LEI16@44100 -c 1`.

## Progress log
- **Sep 28 ~23:35** — v1 complete: build green, smoke tests pass, pushed to github.com/A-Raphie/booth. Live-audio verification pending (needs key).
- **Sep 28 ~23:59** — VERIFIED on real API: key fetched from dashboard via IAB (stashed in .env.local, gitignored); token mint OK; sync OK (415 fix: force audio/wav part type); headless WS test OK — voice `alba` valid, inline tools fire, `call_retake` caught a planted number flub and the agent spoke the cut, session.end clean. Findings: turn detection treats the tightly-paced synthetic read as one turn (real readers pause; client numeric detector + nudge is the backup); `reply.create` field name still unverified (backup path only).

## Things to not forget
- ASSEMBLYAI_API_KEY needed from raphie before live deploy; BYO-key fallback built in.
- Capture a real "bad take" recording during Phase 1 testing → bundle for demo mode.
- Submit by Sep 30 18:00 WAT (official hour unpublished).
- README credits "Raphie" only.
