# Interface contracts

Shared types: `src/core/contracts.ts`. Signatures are coordinator-owned. Workers implement systems without changing them.

## Terrain — world worker

```ts
createTerrain(): TerrainSystem
heightAt(x, z): number
normalAt(x, z, target): Vector3
slopeAt(x, z): number
isWalkable(x, z): boolean
```

`heightAt` must remain a pure, deterministic function of position. Sea level is `y = 0`. Landmark heights must be consistent with `WORLD.landmarks`. The mesh must use the same field as collision.

## Ocean — rendering worker

```ts
createOcean({ heightAt }): OceanSystem
update(dt, time, env, camera): void
```

Must use the shared `EnvironmentSample` for colour, sun, wind and fog. Shore foam should follow the real island silhouette through the injected height function.

## Sky and atmosphere — rendering worker

```ts
createSky(): SkySystem                  // update(env)
createAtmosphere(scene): AtmosphereSystem // sun, update(env, dt)
```

Sky and fog must meet at the horizon. Sun direction and colour come from `env`. Shadows configured once.

## Vegetation — world worker

```ts
createVegetation(terrain): VegetationSystem
update(time, windStrength): void
```

Use instancing. All vegetation shares one wind phase model with per-instance variation. Never obstruct the bench composition, the arrival view or the lighthouse silhouette.

## Landmarks — world worker

```ts
createLandmarks(terrain): LandmarkSystem
group: Object3D
anchors: WorldAnchor[]   // ids: bench, lighthouse, cottage, grove, overlook, bottleBeach, pierEnd, arrival
update(dt, time, env): void
```

Anchor positions are gameplay-critical. Use `WORLD.landmarks` coordinates. Bench at `(-60, 6)`, facing west (`-π/2`). Add pier planks over water at `z = 92…121`.

## Character — character worker

```ts
createCharacter(palette): CharacterSystem
update(dt, animation, speed, time)
setGhost(bool), setOpacity(0..1), setPalette()
```

Height ≈ 1.65 m. Readable at 12% screen height. Animations: idle, walk, run, sit, wave, interact, hold, stand. Ghost must be translucent, calm and clearly non-live.

## Camera — character worker

```ts
createCameraSystem(terrain, aspect): CameraSystem
update(dt, { player, mode, reducedMotion, manualYawOffset, viewportAspect })
```

No orbit controls. Terrain-aware. Never clip. See `docs/CAMERA_DESIGN.md`.

## Coordinator-owned

Game loop, input, player controller, interactions, Echoes, bottles, persistence, environment clock, audio, presence, UI, app composition, tests, CI, documentation.
