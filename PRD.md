# Booth — PRD

## Problem
Anyone recording voiceover (faceless YouTubers, podcasters, ad narrators) loses real time to the take loop: read the script, flub a line, keep going anyway or stop and hunt for where you were, then scrub raw audio afterwards to find clean spans. The loop is entirely manual. For a channel shipping weekly listicles that is 30-60 wasted minutes per video.

## Personas
- **Primary: the solo voiceover creator** — records narration weekly, reads from a script, wants clean masters without an editing session.
- **Secondary: judges at the AssemblyAI Voice Agent Hackathon** — need a 90-second, mic-optional path to see the product work.

## Jobs to be Done
1. When I sit down to record a VO, I want a director listening with my script in hand, so I can just read and never manage takes myself.
2. When I flub a line, I want to be cut off instantly and told exactly which line to redo, so I don't lose my place.
3. When I finish reading, I want a finished master (clean audio + take log), so I never open an editor for VO again.

## Scope (v1)
- Browser app: paste/select a script, enter the booth, read aloud.
- A live Voice Agent API "director": listens to the read against the script, calls retakes with line references, marks takes, reacts to good reads.
- Raw take capture (MediaRecorder), sync STT pass with word timestamps, Web Audio splice into a clean master WAV download.
- Take log with per-line status; deterministic "demo a bad take" mode for mic-less judges.
- Landing page (front door) with a live pipeline widget.

## Non-goals
- Multi-user/team accounts, auth, persistence beyond the session (localStorage only).
- Telephony/SIP, mobile native apps, video (audio only).
- Music bed, ducking, mastering/EQ — splice only, no DSP polish.
- Script marketplace, pronunciation training, translation.

## Success metrics (hackathon framing)
- Judge path: script in → hearing director guidance in <60s from cold open, no signup.
- Demo video: cut-in moment lands inside the first 20 seconds.
- 227-submission field: differentiation = creator-workflow usefulness + interruption handling as the mechanic.

## Kill criteria
- If the live cut-in loop (director interrupting mid-read) proves unstable by Sep 29, 22:00 WAT: collapse to "listen, judge, mark takes, splice" with guidance delivered on end-of-turn only. The pipeline still demos.

## Open questions
- [assumption: judging rubric is lablab standard (innovation/usefulness/design/technical/sponsor use); no rubric published.]
- [assumption: submission deadline Sep 30, exact hour unpublished; target submit 18:00 WAT.]
- [blocked: needs ASSEMBLYAI_API_KEY from raphie before live deploy; BYO-key fallback is built in.]
