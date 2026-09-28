# Booth — Tasks

Legend: `[ ]` not started · `[~]` in progress · `[x]` done

## Phase 0 — Foundations (tonight)
- [x] Repo + spec docs + AGENTS.md + ORCHESTRATOR.md
- [ ] Next.js scaffold green (`npm run dev`) — done when homepage renders
- [ ] `GET /api/token` mints a real temp token — done when curl returns token
- [ ] WS hello-world: browser connects, `session.update` inline, director greeting plays — done when audio heard

## Phase 1 — Director loop (Sep 29)
- [ ] Mic capture → AudioWorklet → PCM16 base64 → `input.audio` — done when live transcript appears
- [ ] Script mode: system_prompt carries script + director rules — done when director references real lines
- [ ] Client-side tools `mark_take` / `call_retake` — done when take log updates from tool calls
- [ ] Forced cut-in via `reply.create` on flub+silence — done when a planted flub triggers a slate stamp
- [ ] Take engine state (per-line status) — done when statuses reflect the session

## Phase 2 — Master + demo (Sep 30 morning)
- [ ] MediaRecorder raw capture + sync API timestamps — done when words align to recorded audio
- [ ] Splicer + WAV export ("Print master") — done when downloaded file plays clean
- [ ] Demo mode: bundled bad take through the pipeline — done when deterministic run works mic-less
- [ ] Landing front door with live widget + full UI polish on tokens

## Phase 3 — Ship + submit (Sep 30, target 18:00 WAT)
- [ ] Deploy Vercel, public URL verified incognito
- [ ] mock-hunter + claims-verify + pre-ship-gate
- [ ] README (honesty table), docs/submission/ (rubric map, demo script, social copy)
- [ ] Demo video (scripted, ≤3 min) → submit on lablab

## Dependencies
Phase 1 depends on Phase 0 WS hello. Demo mode depends on a real recorded bad take (capture one during Phase 1 testing). Submission blocks on deploy.

## Done = submitted on lablab.ai with public repo + live URL + video, links verified incognito.
