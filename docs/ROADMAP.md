# Roadmap

| Phase | Scope | State |
| --- | --- | --- |
| 0 | Repository, contracts, scaffold, baseline, orchestration | Done |
| 1 | Rendering laboratory: ocean, sky, terrain, vegetation, character, camera | In progress |
| 2 | Playable vertical slice: pier, lighthouse, bench, path, audio | Baseline present, integrate worker work |
| 3 | Echo experience: sit, historical playback, consent, local persistence | Baseline present, polish |
| 4 | Backend and persistence | Local adapter only; Supabase schema ready, blocked on credentials |
| 5 | Live multiplayer | Same-browser presence done; cross-device blocked on backend |
| 6 | Complete island: cottage, grove, overlook, bottle beach, details | Baseline landmarks, needs art pass |
| 7 | Expanded interactions: bottles, flowers, shared moments | Bottles and flowers present; shared moments partial |
| 8 | Weather, time, sound | Artistic clock and synthesised audio present; rain/fog visual pass pending |
| 9 | UI, accessibility, moderation | Core UI and a11y present; moderation blocked on backend |
| 10 | Performance | Measure and optimise after integration |
| 11 | Production QA | Pending |
| 12 | Release preparation | Deployment docs present; no public deploy |

## Immediate next tasks

1. Integrate rendering, world and character/camera branches.
2. Visual review of arrival, bench and lighthouse compositions; fix composition and colour.
3. Full interaction regression pass.
4. Unit tests, Playwright smoke, CI.
5. Performance trace and quality tuning.
6. Final documentation, known limitations, release build.
