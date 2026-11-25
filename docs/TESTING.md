# Testing

## Strategy

Test the deterministic core, the contracts between systems, and the real browser experience. Do not infer visual quality from source code.

## Unit (Vitest)

`tests/unit/*.test.ts`:

- Terrain determinism, sea level, walkability, landmark heights.
- Camera damping and mode transitions (pure math extracted where practical).
- Echo record validation, serialization, relative time labels.
- Bottle discovery eligibility and limits.
- Presence message validation (bounds, palette, animation, identity).
- Environment sampling stays inside the artistic window and returns finite values.
- Player controller: acceleration, terrain grounding, sitting/standing, recovery.

## Browser (Playwright)

`tests/e2e/smoke.spec.ts`:

- Clean first visit: loading, enter, canvas present, no console errors.
- Movement changes the rendered frame.
- Settings opens, reduced motion toggles, closes with Escape.
- Sitting on the bench reaches the Echo state (via debug query or teleport hook if needed).
- Responsive viewport 390×844 and 1440×900.
- Two browser contexts: presence appears when both are on the island.

Run with `npx playwright install chromium` once, then `npm run test:e2e`.

## Visual review

Screenshots captured to `screenshots/` at fixed sizes and camera positions. Compare arrival, coastline, lighthouse, bench, cottage, grove and overlook. Review with the image tool, not by reading the shader.

## CI

`.github/workflows/ci.yml`: install, typecheck, lint, unit tests, production build. Browser smoke runs where Chromium installation is available.

## Honesty

No claim of visual approval, performance target or real-user testing without evidence. Screenshots and measurements belong in the repository or in the final report.
