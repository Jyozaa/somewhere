# Asset pipeline

## Policy

No external art assets are required. The island, vegetation, landmarks, character, bottle and flower geometry are generated procedurally at runtime from original code. The ocean, sky and post effects are original GLSL. Audio is synthesised with the Web Audio API.

This keeps the build small, the licence surface clean and every visual decision reproducible.

## Generation

- Terrain: `islandHeight(x, z)`, a deterministic composition of coastline harmonics, Gaussian hills and value-noise relief. The mesh, collision, camera and ocean depth all read the same function.
- Vegetation: seeded placement, merged tree geometry, instanced grass and rocks.
- Landmarks: procedural primitives composed in `src/world/landmarks.ts`; worker branch may extend silhouettes but must keep anchors.
- Character: lathe, capsule and sphere geometry with vertex/procedural animation.
- Bottles and flowers: small primitive assemblies, rebuilt from persisted records.

## Seeds

`WORLD.seed = 20261125`. Placement randomness must use a local seeded generator, not `Math.random`, so screenshots are reproducible.

## If external assets are added later

Record source URL, creator, licence, attribution, modifications and file location in `docs/ASSET_LICENSES.md`. Prefer CC0 sources. Do not commit unlicensed reference material. Replace placeholders before release.

## Budget

Initial JS ≈ 160 kB gzip (Three.js dominates). Keep total initial transfer under 5 MB. Models must be compressed, textures power-of-two, audio streamed or synthesised.
