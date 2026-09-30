# Booth — Showcase Demo Playbook

Video: `renders/booth-demo.mp4` (73.0s master, 1080p30, H.264 + AAC). Recorded 2026-09-29 via the hackathon-showcase-video pipeline (Tier 1 Lightning Sprint, 5 beats).

## Scene timings
| # | Beat | Time | Source |
|---|---|---|---|
| 1 | Hook: the 45-minute take loop | 0:00-0:13 | Real landing take, mac-cursor |
| 2 | Live proof: bad take judged on camera | 0:13-0:33 | Real demo-widget run (sync STT → align → judge), flubs 03+07 stamped |
| 3 | The live director | 0:33-0:51 | REAL captured Voice Agent session log (`media/live-session-log.txt`) + the director's actual reply audio (`media/director-cut.wav`), played at 0:46 |
| 4 | Booth setup + wrap claim | 0:51-1:03 | Real booth take: preset click, position hover |
| 5 | Outro + disclosure | 1:03-1:13 | Card: links + synthesized-voice disclosure |

## Recording notes
- Playwright chromium, headless, viewport 2560x1298 (1:1 with 2K pipeline), re-encoded H.264 CRF 12.
- `scripts/mac-cursor.js`: Bezier cursor paths, pointer morphing, off-center clicks.
- Sample-first gate caught a transient all-white first take before batch (verified via vision-flash; re-run produced content).
- Assembly: `scripts/assemble-video.sh` (per-scene chrome bar + HUD overlays, CFR 30, concat) + `scripts/assemble-audio.sh` (VO beats, director cut, synthesized ambient bed, sidechain duck, loudnorm -16 LUFS).
- Overlay art: `scripts/gen-overlays.py`.

## Claims table (video narration + HUD) — claims-verify
| Claim | Where | Verdict | Evidence |
|---|---|---|---|
| "45 minutes lost scrubbing takes, every video" | S1 VO + HUD | TRUE-by-testimony | Operator workflow (docs/claims.md #7) |
| "Real judge pipeline: transcribed, aligned, two misreads caught" | S2 VO | TRUE | Exercised 4× live: FLUBS CAUGHT 3, 7, 97% conf |
| "Live on AssemblyAI's Voice Agent API" | S3 VO + HUD | TRUE | Session sess_d730fb15… captured; log on screen |
| "The director hears, cuts, calls the retake by line number" | S3 VO | TRUE | `call_retake from_line=1` in on-screen log; director's spoken cut in audio |
| "Every cut is a tool call the agent made" | S3 VO | TRUE | `tool.call` events in capture |
| "Wrap → prints the master: best read per line, word-level splice" | S4 VO + HUD | TRUE (verified by execution; on-screen proof pending human-mic take) | `scripts/verify-master.mjs`: 9/9 lines, valid 26.9s WAV; wrap flow exercises the same functions (chunked 145s test) |
| "Booth is live now" | S5 VO | TRUE | booth-voice.netlify.app 200 |
| "The demo voice is synthesized" | S5 VO | TRUE (disclosure) | badtake.wav is macOS-synthesized; live capture talent likewise |
| Terminal scene content | S3 | Real | Verbatim captured log, not staged |

## Honest gaps
- The wrapped-master screen is not shown on camera (requires a live mic session); the master pipeline is proven by execution in the repo and the S4 narration stays inside what the build does.
- Talent voice in S3 is the synthesized bad take, disclosed on the terminal frame AND in the outro.

## Regeneration
```
node scripts/live-session.mjs          # fresh live capture (needs local server w/ key)
node scripts/record-scenes.js          # UI takes
python3 scripts/gen-overlays.py        # overlay art
node scripts/gen-vo.mjs                # TTS
bash scripts/assemble-video.sh && bash scripts/assemble-audio.sh
ffmpeg -i renders/video-track.mp4 -i renders/master-audio.m4a -c:v copy -c:a aac -b:a 192k renders/booth-demo.mp4
```
