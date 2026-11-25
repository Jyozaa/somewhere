# Known issues

## Current

1. **No cross-device multiplayer.** Presence uses BroadcastChannel; only tabs in the same browser profile see each other. Supabase Realtime is documented but not configured.
2. **Contributions are device-local.** Echoes, bottles and flowers live in `localStorage`. Clearing site data removes them. No other visitor can see them.
3. **No public moderation.** Free text is local-only by design. Do not enable shared text without the plan in `docs/SECURITY.md`.
4. **World clock is compressed into 15:00–21:00.** Night and rain visuals are incomplete; fog and overcast exist as palette changes, not full weather systems.
5. **Cottage interior is not accessible.** Exterior and warm windows only.
6. **Character and vegetation are procedural primitives.** Quality depends on the integrated art pass; no skeletal animation or cloth simulation.
7. **Bench composition and echo placement need visual verification** at multiple aspect ratios.
8. **Performance has not been measured** on the integrated build. No FPS or draw-call figures are claimed.
9. **Playwright browser binaries are not committed.** Run `npx playwright install chromium` before e2e tests.
10. **No deployment.** Only a verified local production build.

## Resolved during development

None yet recorded.
