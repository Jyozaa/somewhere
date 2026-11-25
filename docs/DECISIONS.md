# Decisions

| Date | Decision | Reason | Consequence |
| --- | --- | --- | --- |
| 2026-11-25 | Vite + Three.js + plain DOM, no React | The world loop is imperative; UI is small and state-light. React adds reconciliation with no benefit. | Smaller bundle, direct lifecycle control. |
| 2026-11-25 | Single pure `islandHeight(x, z)` shared by visuals and collision | Prevents camera, character, ocean and terrain disagreeing. | Terrain must stay cheap enough to sample per frame. |
| 2026-11-25 | Procedural assets only | Licence safety, reproducibility, no external download budget. | Requires stronger shader and composition work to look handmade. |
| 2026-11-25 | CSS vignette and grain instead of an effect composer | Preserves frame time and avoids colour-space complexity; restraint is the art direction. | No bloom/DOF; depth comes from light and fog. |
| 2026-11-25 | Local persistence first | No backend credentials. The solo and historical experience must not depend on infrastructure. | Contributions are device-local; documented limitation. |
| 2026-11-25 | BroadcastChannel presence for live visitors | Real multi-client synchronisation without an external service; testable on one machine. | Not cross-device; Supabase seam documented. |
| 2026-11-25 | Artistic world clock mapped to 15:00–21:00 UTC day | Every first visit receives a composed, beautiful light state; still deterministic and shared. | True night is not reachable in this build. |
| 2026-11-25 | No authored Echoes by default | Never imply a real visitor was present. Authored content appears only via `?demo=1` and is labelled. | Empty bench is honest and emotionally intentional. |
| 2026-11-25 | Synthesised audio | No licence obligations, tiny transfer, responsive to weather. | Less richness than recorded ambience; needs careful mixing. |
| 2026-11-25 | Three Orca workers with isolated worktrees | Parallel specialist work without shared-file conflicts. | Coordinator integrates and verifies; workers never push `main`. |
