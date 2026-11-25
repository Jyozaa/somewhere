# AGENTS.md — working on Somewhere

Read this before changing the project. It is the short operational contract; deeper detail lives in `docs/`.

## Vision

A single, meticulously composed coastal island. Presence over communication. Depth over scale. Memory over progression. Art direction over technical spectacle. The experience must remain meaningful with zero other visitors online.

## Stack and commands

TypeScript + Vite + Three.js (WebGL 2). Plain DOM for interface. Vitest for unit tests. Playwright for browser smoke tests. No React, no Next.js, no paid services.

```bash
npm install
npm run dev
npm run typecheck
npm run lint
npm test
npm run build
npm run test:e2e
```

## Architecture rules

- The world simulation is independent of DOM rendering. UI reads state; it does not own it.
- Shared interfaces live in `src/core/contracts.ts`. Do not change them without coordinator approval.
- All tuning constants live in `src/config/world.ts` or near their system. No magic numbers scattered through render loops.
- Dispose geometries, materials, textures and event listeners when a system ends.
- Frame-rate-independent movement and damping. Clamp deltas; never step physics by raw frame time.
- Treat every network or stored record as untrusted. Validate shape, bounds and length.
- Do not add dependencies without a clear need and coordinator approval.

## Worker ownership (Phase 1)

- Rendering worker: `src/rendering/ocean.ts`, `src/rendering/sky.ts`, `src/rendering/atmosphere.ts`.
- World worker: `src/world/terrain.ts`, `src/world/vegetation.ts`, `src/world/landmarks.ts`.
- Character/camera worker: `src/character/character.ts`, `src/camera/cameraController.ts`.
- Coordinator owns everything else, including `src/app/SomewhereApp.ts`, contracts, config, tests, docs and integration.

Workers must not edit another worker's files or `package.json`. Do not commit generated dependencies or build output.

## Git

- Work on a dedicated feature branch in an Orca worktree.
- Commit your own work with Conventional Commits. Report the commit hash.
- Never force-push, never rewrite shared history, never commit secrets.
- The coordinator integrates into `main` and pushes.

## UX and accessibility floor

- Keyboard reachable controls; visible focus.
- Reduced motion respected (CSS and camera).
- Prompt text must not depend on colour alone.
- Historical Echoes are visually and textually distinct from live visitors.
- Development fixtures must be labelled as authored. Never fabricate a real user's presence.
