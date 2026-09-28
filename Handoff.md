# Booth — Handoff

Read this first if you're picking up the project.

## Current state
Spec layer complete; Next.js scaffold finishing. No app code yet. Target: submit Sep 30, 18:00 WAT to the AssemblyAI Voice Agent Hackathon (lablab.ai).

## What's done
- Idea pass (hackathon-idea-hack): Booth = real-time VO director. Collision-checked name.
- Protocol research complete: Voice Agent API (token mint, WS sequence, inline tools, reply.create, session.end discipline), sync API (universal-3-5-pro, timestamps:true, ms words).
- Design direction locked (design.md), sponsor tokens verified from live CSS.
- PRD/Architecture/Tasks/Memory/AGENTS/ORCHESTRATOR written.

## In progress
- create-next-app scaffold (Tailwind 4, App Router, TS).

## Blocked / waiting
- ASSEMBLYAI_API_KEY — needed from raphie for deployed token route; BYO-key fallback exists for local dev.

## How to run it
```bash
npm install
npm run dev          # http://localhost:3000
npm run build        # must pass before deploy
```

## Next steps
1. Verify scaffold green.
2. Phase 0: `/api/token` route → WS hello-world in browser.
3. Then Tasks.md Phase 1 (director loop).

## Open questions
- Which bundled voice for the director (docs show `anna`, `alba`).

## Pointers
- Spec: [PRD.md](./PRD.md) · [Architecture.md](./Architecture.md) · [design.md](./design.md)
- Plan: [Tasks.md](./Tasks.md) · History: [Memory.md](./Memory.md) · Router: [ORCHESTRATOR.md](./ORCHESTRATOR.md)
