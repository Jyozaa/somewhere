# Phase 1 task — Traveller character, animation and automatic camera

## Objective

Make the anonymous traveller expressive and readable, and make the automatic camera feel like a carefully directed observer following someone through a miniature world. This is the emotional and compositional core of the game.

## Repository and baseline

- Work in your Orca worktree on branch `feat/character-controller`.
- Baseline commit `68fa20a` on `main`.
- Read `AGENTS.md`, `docs/CAMERA_DESIGN.md`, `docs/ART_DIRECTION.md`, `docs/INTERFACE_CONTRACTS.md`, `src/config/world.ts`, `src/core/contracts.ts`, `src/app/SomewhereApp.ts` (read only).

## Files you own

Only:

- `src/character/character.ts`
- `src/camera/cameraController.ts`
- new support files under `src/character/parts/` or `src/camera/`
- `tests/unit/character-*.test.ts` and `tests/unit/camera-*.test.ts` (new files only)

Do not edit the controller (`src/character/controller.ts`), app, terrain, rendering, contracts, config or `package.json`. Do not add dependencies. Do not push.

## Interfaces (fixed)

```ts
createCharacter(palette): CharacterSystem
character.update(dt, animation, speed, time)
character.setPalette(p), setGhost(bool), setOpacity(0..1)

createCameraSystem(terrain, aspect): CameraSystem
cameraSystem.update(dt, { player, mode, reducedMotion, manualYawOffset, viewportAspect })
cameraSystem.snap()
```

Modes: `arrival`, `explore`, `bench`, `viewpoint`. Do not add orbit controls, pointer lock or first-person behaviour.

## Character requirements

- Original silhouette: oversized coat, scarf, soft rounded proportions, minimal face, small head. Height ≈ 1.65 m. Nothing resembling Messenger's characters or a marketplace humanoid.
- Readable at 8–15% screen height: strong value contrast between coat, scarf and ground; silhouette legible from above/behind.
- Procedural or skeletal animation; no external assets. States: `idle`, `walk`, `run`, `sit`, `wave`, `interact`, `hold`, `stand`. Smooth crossfades, no foot sliding at walk/run speeds, natural turn damping. Subtle scarf/coat secondary motion and breathing at idle.
- Sitting pose must align with a bench seat at ~0.45 m above the anchor ground and face the anchor direction; feet should not clip. The app positions the character's root at the seat; account for this.
- Ghost/Echo material: restrained translucent sea-glass teal, soft fresnel or edge light, never horror-film. Preserve silhouette. `setOpacity` must fade cleanly. Ghosts still sit and gesture.
- Keep draw calls modest (merge static geometry where practical, share materials). Dispose everything.

## Camera requirements

- Default: third person, elevated, pulled back, miniature-world composition. Character ≈ 8–15% of screen height; island dominates.
- FOV ~34–41°, downward angle ~30–50°, follow distance ~15–20 m. Current `CAMERA` config is a starting point; tune only inside your file, not the config.
- Damped, frame-rate independent target and position. Yaw follows movement slowly; does not snap on every direction change. Stable when the player reverses or circles.
- Look-ahead, terrain-aware positioning, cliff/camera collision prevention, smooth elevation changes. Must not clip into the bench cliff, cottage, lighthouse or terrain.
- Arrival: begins wider/higher and settles into exploration without a cut. Bench: gradual wider/lower composition revealing sea and horizon, returning smoothly on stand. Viewpoint: wider horizon framing.
- Pointer parallax is optional and must be tiny (≤0.05 rad). Reduced motion: no parallax, no drift, faster settling, no bob.
- Test aspect ratios 390×844, 1280×720, 1440×900, 1920×1080.

## Visual acceptance

- Capture real browser screenshots if Chromium is available (`npx playwright install chromium` permitted): character at walk and sit, camera at the bench looking seaward, arrival frame. Save under `screenshots/character-camera/` and report paths. If unavailable, state it clearly; do not claim visual approval.
- Compare against the *principles* in `docs/CAMERA_DESIGN.md`, not Messenger's exact implementation.
- Character must be readable but not dominate. No clipping, no jitter, no disorienting snaps.

## Engineering acceptance

```bash
npm run typecheck
npm run lint
npm test
npm run build
```

All pass. Add unit tests for damping stability, mode transitions, reduced motion and pose state selection where accessible. No new dependencies.

## Git and reporting

Commit on `feat/character-controller` with a Conventional Commit, e.g. `feat: direct the traveller and automatic camera`.

Report via Orca `worker_done`: summary, files, commit hash, commands/results, screenshot paths, camera measurements/tuning, limitations, integration notes. Do not merge or push.
