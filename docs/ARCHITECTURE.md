# Architecture

## Overview

```
index.html
  └─ src/main.ts
       └─ SomewhereApp (composition root)
            ├─ core/contracts.ts        shared interfaces
            ├─ config/world.ts          coordinates, palette, tuning
            ├─ world/terrain.ts         deterministic heightfield + mesh
            ├─ world/vegetation.ts      instanced trees, grass, rocks
            ├─ world/landmarks.ts       pier, lighthouse, bench, cottage, anchors
            ├─ rendering/ocean.ts       custom GLSL water with depth shore foam
            ├─ rendering/sky.ts         gradient sky, sun, clouds, stars
            ├─ rendering/atmosphere.ts  directional light, hemisphere, fog
            ├─ character/controller.ts  camera-relative movement + collision
            ├─ character/character.ts   procedural traveller and animation
            ├─ camera/cameraController  damped automatic camera states
            ├─ environment/environment  shared artistic clock and palette
            ├─ interactions/, echoes/, persistence/, multiplayer/, audio/, ui/
            └─ ui/ui.ts                 DOM overlay, prompts, settings, composer
```

## Principles

- **One composition root.** `SomewhereApp` creates systems, owns lifecycle and connects contracts. Systems do not import each other except through `core/contracts.ts`.
- **Pure world function.** `islandHeight(x, z)` is deterministic and shared by terrain meshes, collision, camera, character grounding, ocean depth and prop placement. Rendering never owns collision truth.
- **Environment as shared state.** One `EnvironmentSample` drives sky, fog, sun, water, vegetation wind, audio and exposure. No disconnected effects.
- **Simulation separated from presentation.** Player state is plain data in `core/contracts.ts`; UI reads snapshots. No DOM work in the render loop except small text updates on change.
- **Local-first persistence.** `persistence/adapter.ts` validates and stores records. A Supabase adapter can replace it behind the same functions.
- **Honest presence.** Local Echoes carry `authored` and `contributorId`. Live presence is a separate channel and is labelled as live.

## Lifecycle

`init()` builds the scene behind the arrival veil, renders once, then exposes **Enter the island**. The gesture starts audio. The frame loop clamps delta to 50 ms, updates simulation, then renders. Panels pause movement without stopping rendering.

## Rendering budget

One terrain mesh, instanced vegetation (three tree draw calls, one grass call), one ocean plane, one sky sphere, a handful of landmark meshes, one player and up to eight remote travellers. Shadow map 2048². Pixel ratio capped by quality preset.

## Failure handling

WebGL failure shows a readable message. Missing storage falls back to memory. Missing BroadcastChannel disables live presence only. Missing backend credentials never block the solo experience.
