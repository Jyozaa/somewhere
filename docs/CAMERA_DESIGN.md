# Camera design

The camera is part of the identity. It behaves like a careful observer following a traveller through a miniature world.

## Defaults

- Third person, elevated and pulled back.
- Perspective FOV ≈ 37° (arrival 41°, bench 34°).
- Follow distance ≈ 16 m, height ≈ 12 m, look-ahead ≈ 3.2 m.
- Character occupies roughly 8–15% of screen height.
- The island dominates; the character remains readable.
- No pointer lock. No manual orbit. Mouse adds only a small optional framing offset.

## Behaviour

- Yaw follows movement slowly (λ ≈ 0.85) and settles when idle.
- Position is exponentially damped; frame-rate independent.
- Arrival begins wider and higher, then settles over seven seconds.
- Bench state pulls back and lowers, looking out over the sea for the length of the sit.
- Overlook state widens for a temporary horizon composition.
- Camera samples terrain between player and destination and lifts above slopes and cliffs.
- Reduced motion: faster settling, no parallax, no arrival drift.

## Acceptance

- Explore the full island without touching camera controls.
- Rapid direction changes never snap or jitter.
- No clipping through terrain, the bench, cottage or cliffs.
- Sitting and standing transitions read as one continuous move.
- Character readable at 1280×720 and 1920×1080.

## Source

`src/camera/cameraController.ts`, tuned by `CAMERA` in `src/config/world.ts`.
