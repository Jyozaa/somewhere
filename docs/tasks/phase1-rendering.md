# Phase 1 task — Ocean, sky and atmosphere

## Objective

Raise `Somewhere`'s ocean, sky and atmosphere to a portfolio-quality, art-directed result on a MacBook Pro M2 Pro at 1440×900. This is a rendering laboratory integrated into the playable build, not a standalone demo. Beauty and stability both matter.

## Repository and baseline

- Work in the Orca worktree assigned to this task, branch `feat/ocean-rendering`.
- Baseline commit: `68fa20a` on `main` (already present in your worktree).
- Read `AGENTS.md`, `docs/ART_DIRECTION.md`, `docs/CAMERA_DESIGN.md`, `docs/INTERFACE_CONTRACTS.md`, `src/core/contracts.ts`, `src/config/world.ts`.
- `npm install`, then `npm run dev` to inspect. The app already renders with your current stubs.

## Files you own

You may edit only:

- `src/rendering/ocean.ts`
- `src/rendering/sky.ts`
- `src/rendering/atmosphere.ts`
- new shader/support files under `src/rendering/shaders/`
- `tests/unit/rendering-*.test.ts` (new files only)

Do not edit `src/app/SomewhereApp.ts`, `src/core/contracts.ts`, `src/config/world.ts`, `package.json`, world, character or camera files. Do not add dependencies. Do not push.

## Interfaces (fixed)

```ts
createOcean({ heightAt }): OceanSystem
ocean.update(dt, time, env, camera)
createSky(): SkySystem
sky.update(env)
createAtmosphere(scene): AtmosphereSystem
atmosphere.update(env, dt)
```

`EnvironmentSample` already provides sun direction/colour/intensity, sky zenith/horizon, fog colour/density, water deep/shallow/foam colours, wind strength, weather, exposure, golden. Use it as the single source of truth. Do not invent a second lighting state.

## Required work

### Ocean

- Large, slow swell plus smaller overlapping ripples. No flat blue plane, no scrolling noise texture.
- Depth-dependent colour using the injected `heightAt` so shallows, shoreline foam and deep water match the real island silhouette.
- Fresnel sky reflection, sun glitter path, horizon haze that meets the sky and fog.
- Animated shoreline foam with a natural, irregular edge. Foam must not look like a uniform contour ring.
- Beautiful when still, from the elevated camera, and at the bench. No visible plane edge.
- Quality: keep it efficient. No real-time planar reflections or heavy render targets.

### Sky

- Painterly gradient from horizon to zenith, sun disc and restrained halo, thin cloud veils, a few stars only after dusk.
- Seamless horizon with fog and ocean; no hard sphere edge.
- Golden hour should feel exceptional; daylight and blue hour must remain coherent.
- No generic gradient background feel. No heavy bloom.

### Atmosphere

- Directional sunlight with well-fitted island shadows, hemisphere fill, exponential fog.
- Warm/cool contrast from `EnvironmentSample`. Interior/lantern warmth stays local; do not over-brighten the whole island.
- Camera-aware exposure is not available; keep the scene readable from golden hour to dusk.
- Optional: subtle distance haze in the ocean/sky only. Do not add post-processing passes.

## Visual acceptance

- Capture at least three real browser screenshots if Chromium is available (`npx playwright install chromium` is permitted): arrival/coast, bench view toward the sea, lighthouse from a distance. Save under `screenshots/rendering/` in your worktree and report paths. If browser capture is unavailable, say so; do not claim visual approval.
- Ocean must read as water, not a plane. Sky must read as atmosphere, not a gradient. Shadows must not acne or detach.
- 60 FPS target on the development machine; report approximate frame time if measured.

## Engineering acceptance

```bash
npm run typecheck
npm run lint
npm test
npm run build
```

All must pass. No console errors on load. Dispose every geometry, material, texture and listener you add. No magic constants without names. No private reference assets.

## Git and reporting

Commit your work on `feat/ocean-rendering` with a Conventional Commit, e.g.:

```
feat: art-direct ocean, sky and coastal atmosphere
```

Report through Orca `worker_done` with: summary, files changed, commit hash, commands and results, screenshots/measurements, known limitations, integration notes. Do not merge or push. The coordinator reviews and integrates.
