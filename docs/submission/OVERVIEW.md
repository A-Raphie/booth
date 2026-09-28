# Submission — Booth

Event: AssemblyAI Voice Agent Hackathon (lablab.ai). Submit at the event page by Sep 30, 2026 (target 18:00 WAT).

## One-liner
Booth: read your voiceover script out loud and a real-time AI director cuts your flubs with the exact line number, then prints a clean master. The editing session never happens.

## Short description
Voiceover creators lose 30-60 minutes per video to the take loop: read, flub, hunt for the flub in the raw audio, fix it in an editor. Booth collapses that loop into the read itself. A managed AssemblyAI Voice Agent API agent takes your script and listens while you read; streaming STT plus a script-aware prompt let it detect misreads (numbers, skipped words, stumbles) and cut you off with the line number and correction. Its decisions arrive as client-side tool calls (call_retake, mark_take, finalize) that drive the UI, the take log, and the slate stamps. When you wrap, the session recording is transcribed with the sync model (universal-3.5-pro) with word-level timestamps, aligned to script lines, and spliced into a clean master: the best-scoring read of every line, fades, WAV download, all in the browser. No persistent server; the whole thing is static hosting plus two serverless routes.

## Links
- Live: https://booth-ernxtos-projects.vercel.app
- Repo: https://github.com/A-Raphie/booth
- Video: `_ADD_VIDEO_URL_`

## Form fields checklist
- [ ] Live demo URL works in an incognito browser
- [ ] Public repo URL
- [ ] Demo video uploaded and linked
- [ ] Built-with tags: AssemblyAI Voice Agent API, AssemblyAI Sync API, Next.js, Web Audio
- [ ] Team: Raphie (solo)
