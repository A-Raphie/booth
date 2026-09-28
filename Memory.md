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

## Things to not forget
- ASSEMBLYAI_API_KEY needed from raphie before live deploy; BYO-key fallback built in.
- Capture a real "bad take" recording during Phase 1 testing → bundle for demo mode.
- Submit by Sep 30 18:00 WAT (official hour unpublished).
- README credits "Raphie" only.
