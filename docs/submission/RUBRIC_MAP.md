# Rubric map — Booth

No official rubric was published; mapped against lablab's standard criteria.

| Criterion | Where Booth earns it |
|---|---|
| **Use of AssemblyAI tech** | The product IS a Voice Agent API session: inline agent config, client-side tools, interruption handling, temp-token browser auth. Master assembly uses sync universal-3.5-pro word timestamps. Both primitives are load-bearing (remove either and Booth stops existing). README has a "removable?" table. |
| **Innovation / originality** | The 227-submission field skews to copilots, inventory desks, call defenders, interview coaches. Nobody is pointing voice agents at the creator's take loop; the take log + slate stamp + best-read splice is a workflow that doesn't exist as a consumer tool. |
| **Usefulness / impact** | Quantified pain: 30-60 min of take-scrubbing per VO video, weekly, for any faceless channel. Output is a real artifact: a clean master WAV, not a chat transcript. |
| **Technical implementation** | AudioWorklet capture piped to a managed agent WS at 24 kHz; parallel full-rate master capture; word-timestamp alignment to script lines (token Levenshtein + numeric-token mismatch detection for the flubs that matter); OfflineAudioContext splice with fades; session.end billing discipline; single-use tokens so the API key never touches the browser. |
| **Design / UX** | Warm-paper studio console identity (AssemblyAI's own verified brand tokens), script-as-canvas layout, film-slate stamp as the signature move, VU strip as the only continuous motion. Deliberately divergent from the dark-neon AI-dashboard field. |
| **Demo quality** | Deterministic 90-second judge path with a mic-less variant (bundled bad take through the real pipeline). Honesty table in README. |
