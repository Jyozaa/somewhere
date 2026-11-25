# Performance

## Targets (MacBook Pro M2 Pro, 16 GB)

- 60 FPS during ordinary exploration, stable frame pacing.
- ≤ 5 MB initial compressed transfer.
- ≤ 150 draw calls in a representative scene.
- 6–8 visitors per island instance.
- No input latency; no prolonged asset stalls; stable memory over long sessions.

These are targets, not measured results. Measurements are recorded below only when actually taken.

## Design for budget

- One 220×220 terrain mesh (shared height function, no textures).
- Instanced vegetation: 3 tree draw calls, 1 grass, 1 rock.
- One ocean plane, one sky sphere, one shadow-casting directional light.
- Procedural geometry and materials; no texture downloads beyond the CSS noise data URI.
- Pixel ratio capped at 2 / 1.4 / 1 by quality preset.
- Shadow map 2048², orthographic bounds fitted to the island.
- CSS vignette and grain instead of a post-processing pass.
- Presence at 12 Hz with interpolation; no per-frame network writes.

## How to measure

```bash
npm run build
npm run preview
# Chrome DevTools: Performance panel, 20 s exploration trace
# Rendering: draw calls via renderer.info (add temporary debug readout)
```

Record browser version, hardware, viewport, DPR, quality and scenario with every result. Do not claim performance on untested hardware.

## Measured

Pending integrated build. To be completed after visual and integration review.

| Date | Build | Scenario | FPS | Draw calls | Notes |
| --- | --- | --- | --- | --- | --- |
| — | — | — | — | — | not yet measured |
