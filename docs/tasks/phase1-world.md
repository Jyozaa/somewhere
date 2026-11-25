# Phase 1 task — Island world, landmarks and vegetation

## Objective

Turn the playable island into a deliberately composed coastal place: an irregular coastline, readable paths, sculpted terrain and seven recognisable landmarks with original silhouettes. It must look handmade and coherent at the automatic camera distance, not like scattered primitives.

## Repository and baseline

- Work in your Orca worktree on branch `feat/island-environment`.
- Baseline commit `68fa20a` on `main`.
- Read `AGENTS.md`, `docs/GAME_DESIGN.md`, `docs/ART_DIRECTION.md`, `docs/INTERFACE_CONTRACTS.md`, `src/config/world.ts`, `src/core/contracts.ts`, `src/app/SomewhereApp.ts` (read only, to understand how anchors and terrain are consumed).

## Files you own

Only:

- `src/world/terrain.ts`
- `src/world/vegetation.ts`
- `src/world/landmarks.ts`
- new support files under `src/world/parts/`
- `tests/unit/world-*.test.ts` (new files only)

Do not edit app, camera, character, rendering, contracts, config or `package.json`. Do not add dependencies. Do not push.

## Fixed interfaces and coordinates

```ts
createTerrain(): TerrainSystem   // heightAt(x,z) pure and shared by collision/camera/ocean
createVegetation(terrain): VegetationSystem
createLandmarks(terrain): LandmarkSystem // anchors consumed by gameplay
```

Keep `islandHeight` exported as a pure deterministic function. Keep sea level `y = 0`. Keep all `WorldAnchor` ids and these world positions (from `src/config/world.ts`):

- bench `(-60, 6)`, facing `-π/2` (west, out to sea), cliff shelf above water.
- lighthouse `(56, -42)`, on the north-east headland.
- cottage `(2, 24)`, sheltered central valley.
- grove `(38, 28)`.
- overlook `(-28, -50)`, high north-west viewpoint.
- bottle beach `(-58, 62)`, south-west cove at the waterline.
- pier over water from `z ≈ 92` to `z = 121` at `x = 0`; pier end anchor at `(0, 121)`.
- arrival `(0, 84)`; start must be walkable and visually lead toward the island.
- boat at `(9, 110)`.

Anchor labels currently expected: bench `Sit`, grove `Leave a flower`, bottleBeach `Leave a bottle`, overlook `Take in the view`, lighthouse `Look out`, cottage `Peek inside`. Add pierEnd `Watch the water` and arrival `Look back`. Keep radii sensible (bench 3.2, others 5–7).

## Required work

### Terrain

- Original, irregular coastline with a distinct west/north cliff character and softer southern beaches. No obviously circular or uniformly noisy island.
- Composed elevation: lighthouse headland, bench shelf with a dramatic drop, protected cottage valley, raised overlook, gentle arrival beach, low bottle cove.
- Walkable path network that connects arrival → cottage → grove → lighthouse → overlook → bench → bottle beach → arrival without dead ends. Paint paths through vertex colours (sandy, worn) and keep slopes walkable.
- Vertex colours: wet sand, dry sand, grass variations, rock on steep faces, path. Subtle painterly variation. No textures.
- `isWalkable` must reject water, steep cliffs and the open sea, and must allow every path and anchor approach. Ensure the bottle beach anchor is reachable from land.
- Mesh resolution and cost must remain reasonable (one mesh, no per-frame rebuilding).

### Vegetation

- Stylised sculptural trees with clear silhouettes, varied scale/rotation, instanced. One shared wind system with per-instance phase and subtle trunk/foliage motion.
- Instanced grass with per-instance variation; do not carpet the entire island or obscure paths, the bench composition or the arrival view.
- Rocks on cliffs and shoreline, flowers as scenery (persistent visitor flowers are coordinator-owned), all deterministic with `WORLD.seed`.
- No tree inside 9 m of a landmark, no vegetation blocking the bench's seaward view, no trees floating.

### Landmarks

Original silhouettes, composed at the automatic camera distance:

- **Arrival pier:** weathered planks, posts into the water, rope rails, subtle sway; a small moored boat with gentle bobbing. Player must visually understand where to walk.
- **Lighthouse:** tapered tower on the headland, gallery, lantern room, warm lamp, rotating beam at dusk (subtle). Must be visible from several parts of the island. Do not imply a live visitor is online.
- **Echo bench:** wooden bench on the cliff, frame the sea view, no vegetation directly in front; seat height and position consistent with the anchor.
- **Cottage:** small stone/timber cottage, pitched roof, chimney with restrained smoke, warm windows, door, a bench or chair outside. No accessible interior required; suggest habitation.
- **Memory grove:** ring of trees with a quiet clearing, stones and hanging lanterns. Leave slots clear for coordinator-rendered flowers around the grove centre.
- **Sunset overlook:** stone platform, low railing, two stones or a bench, open view to the west/north.
- **Bottle beach:** small cove, driftwood, rocks, a clear patch where coordinator-rendered bottles appear.
- Path-side details: fence fragments, stones, grass tufts, a signpost silhouette. Keep draw calls controlled; merge repeated parts.

All landmark movement (rope sway, boat bob, lamp, smoke) must be driven by `update(dt, time, env)` and wind/time, with no random per-frame jumps.

## Visual acceptance

- Capture real browser screenshots at arrival, bench, lighthouse and cottage if Chromium is available (`npx playwright install chromium` permitted). Save under `screenshots/world/` and report paths. If unavailable, state it.
- The island must look composed: landmark silhouettes distinct, paths legible, negative space preserved.
- Player must be able to walk the full loop without getting stuck or climbing sheer cliffs.

## Engineering acceptance

```bash
npm run typecheck
npm run lint
npm test
npm run build
```

All pass. Add unit tests for landmark heights, determinism, path/anchor walkability and coastline irregularity. Dispose resources. No new dependencies.

## Git and reporting

Commit on `feat/island-environment` with a Conventional Commit, e.g. `feat: compose the coastal island and its landmarks`.

Report via Orca `worker_done`: summary, files, commit hash, commands/results, screenshot paths, walkability issues found, limitations, integration notes. Do not merge or push.
