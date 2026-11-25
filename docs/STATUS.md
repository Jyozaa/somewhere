# Status

Updated: 2026-11-25 (Phase 0 baseline)

## Current phase

Phase 1 — art direction and rendering laboratory, integrated with the playable foundation.

## Repository

- Origin: https://github.com/Jyozaa/somewhere.git
- Integration branch: `main`
- Visibility: public

## Orchestration

- Orca Run: created in Phase 0 (see `docs/STATUS.md` history in Git).
- Active workers: see Orca `worker-list` and the run notes below.

## Baseline

- Vite + TypeScript + Three.js scaffold.
- Deterministic island terrain from a pure height function.
- Custom stylised ocean, sky and atmosphere systems.
- Procedural traveller with procedural animation.
- Automatic third-person camera with arrival, explore, bench and viewpoint modes.
- Local Echo, flower and bottle persistence with honest labelling.
- Same-browser live presence via BroadcastChannel; cross-device backend not configured.
- Synthesised environmental audio.
- Loading, contextual prompts and settings interface.

## Verification

- `npm run typecheck` — passing.
- `npm run lint` — passing.
- `npm run build` — passing.
- Unit and browser tests — added incrementally; see `docs/TESTING.md`.

## Blockers and limitations

- No Supabase project credentials: persistence and cross-device multiplayer use local adapters. The Supabase schema and adapter seam are documented and ready.
- No real moderation service: free-text messages remain device-local. Do not enable public submission until moderation is configured.
- No deployment: production build is verified locally only.

## Next

- Integrate rendering, world and character/camera worker branches.
- Visual review with browser screenshots and corrections.
- Echo interaction polish, bottle flow, accessibility and performance pass.
- Full test suite and release documentation.
