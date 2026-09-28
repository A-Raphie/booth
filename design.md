# Booth — Design

## Design brief: Booth
- **Consensus default (banned):** dark navy AI dashboard, purple-blue gradient hero, glowing pulsing mic orb, glassmorphic stat cards, chat-bubble transcript, Inter everywhere, bento grids, "Powered by" footer.
- **Axes pushed:** (1) Color: sponsor-verified warm paper palette — light-first in a dark-neon field; (2) Layout: script-document-as-canvas + director rail, not centered hero + feature cards; (3) Motion: film-slate stamp on CUT, stillness everywhere else.
- **Axes kept conventional:** elevation (hairlines), density (editorial landing, dense console in-app), typography pairing (display + mono is a known pairing, executed with restraint).
- **Sponsor synthesis:** verified from assemblyai.com CSS: paper `#f5f3eb`/`#fdfcf8`, sand panels `#e3dfcd`, muted `#c7c3b2`/`#d2d1d0`, ink `#000`, violet accent `#887bdd` + tint `#e8e4f9`, highlighter `#f7e9a1`, burnt orange `#d47849` (CUT), green `#67ad82` (clean take).
- **Signature move:** the slate stamp. When the director's `call_retake` tool fires, a hard-edged slate card stamps onto the script canvas: `TAKE 03 · RETAKE FROM LINE 04 · <reason>`. Mechanism test: it IS the tool call, bound to real line state. 5-minute test: an animated card is 5 minutes; slate bound to live agent tool state + take log is not. Demo test: it is the money moment.
- **Avoid-list:** pulsing mic orb, dark gradient hero, glassmorphism, chat bubbles, purple/blue duotone, emoji icons, Inter/Geist defaults, decorative charts, "Powered by" footer.
- **Familiarity anchor:** the live transcript panel (one convention kept, load-bearing).
- **Chains to:** semantic-tokens → component-harvest → ui-craft.

## Feel
"Studio console" — calm, tactile, precise. A dim control room made of paper, not glass.

## Audience
Creators who record voiceover weekly; hackathon judges who have seen 200 dark AI dashboards this month.

## Visual direction
Editorial paper studio: Archivo (weight 400-500, huge display, tight tracking) + IBM Plex Mono uppercase micro-labels (+0.1em tracking, console labels: LINE 04, TAKE 02, PRINT MASTER). Hairline rules (rgba ink .12/.22) instead of shadows. The script page is the hero surface: typewritten sheet, take-status marks in the margin, director notes annotated violet. VU level strip as the only continuous motion.

## Design tokens
Pointer: `app/globals.css` (semantic tokens, zero raw hex in components).
- `--paper` `#f5f3eb` · `--paper-raised` `#fdfcf8` · `--sand` `#e3dfcd` · `--muted` `#c7c3b2` · `--ink` `#0a0a08` · `--accent` `#887bdd` · `--accent-tint` `#e8e4f9` · `--mark` `#f7e9a1` · `--cut` `#d47849` · `--clean` `#67ad82`
- Radius: 2px (slate edges, not bubbles). Borders: 1px hairline. Shadows: none (tint steps instead).

## Harvest Manifest
To fill at UI build time via component-harvest (button, dialog, tooltip, scroll area primitives re-expressed on tokens).

## Copy tone
Terse studio call-sheet. Director speaks in take language: "Cut. Line four, again, slower on the list." / "That's a print. Moving on." UI microcopy: mono uppercase, no exclamation marks, no marketing adjectives. Error voice: plain, actionable ("Microphone blocked. Enable it in the address bar and take your position again.").

## User flow
1. **Landing (front door)** — hero: huge "The director is listening." + one paragraph + a live widget: "Play a bad take" button runs the real judge pipeline on a bundled sample and stamps the slate in-page. Visible proof in 10s. Path: "Enter the booth →".
2. **Booth (app)** — script panel (paste or pick bundled script) → "Take your position" (mic consent + session start) → read: script canvas with line statuses, transcript panel, director rail (live), level strip; CUT stamps on retake calls → "That's a wrap" ends session (session.end discipline).
3. **Master (results)** — take log table (line, status, take count, note), waveform strip of the assembled master, "Print master" → WAV download, session stats (takes, runtime). Judge path: landing widget → booth with bundled script → demo mode → master, all deterministic, mic optional.

## Folds used
- (to append at ui-craft time)

## Avoid-list
See brief. Additionally: never animate the transcript text itself (reading surface), never auto-scroll jarringly mid-read (smooth + interruptible).
