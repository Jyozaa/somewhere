# Status

Updated: 2026-11-25 (Phase 1 coordinator integration)

## Current phase

Phase 2 — Echo and presence polish on an integrated Phase 1 foundation.

## Repository

- Origin: https://github.com/Jyozaa/somewhere.git
- Integration branch: `main`
- Baseline commit: `68fa20a` (Phase 0 scaffold, pushed)
- Phase 1 integration commit: `fe93809` (pushed to `origin/main`)
- Visibility: public

## Orchestration

Phase 1 was dispatched as three supervised Orca workers on isolated worktrees:

| Task | Branch | Worktree | Outcome |
| --- | --- | --- | --- |
| Ocean, sky and atmosphere | `feat/ocean-rendering` | `somewhere-rendering` | Stopped on provider free-usage limit before committing |
| Island world and landmarks | `feat/island-environment` | `somewhere-world` | Stopped on provider free-usage limit before committing |
| Traveller and camera | `feat/character-controller` | `somewhere-character` | Stopped on provider free-usage limit before committing |

The branches contain no commits beyond the baseline, so there was no worker work to
merge. The coordinator completed the Phase 1 pass directly on `main`. The task specs
remain in `docs/tasks/` for a future worker pass.

## What changed in this integration

### Fixed

- **Island failed to boot.** Tree geometry merged indexed cylinders with non-indexed
  icosahedra; `mergeGeometries` returned `null` and the first render threw
  `Cannot read properties of null (reading 'boundingSphere')`. Geometry merging now
  normalises index buffers and fails loudly.
- **The entire island rendered unlit.** The directional light's shadow frustum was
  resized but its projection matrix was never updated, so shadow lookups sampled
  outside the map. The projection is now rebuilt after fitting.
- **The world clock ran 1000× fast.** `DAY_SECONDS` was 86,400 milliseconds, cycling
  the artistic day and weather every 86 seconds. It is now a real day in
  milliseconds, with the artistic window mapping 24 h onto 15:00–21:00.
- **The ocean surfaced through inland ground.** The island interior sat about a metre
  above sea level while swell crests reached almost a metre. The interior is raised,
  the coast falls away to the seabed, and swell amplitude is calmer.
- **The camera framed almost straight down,** with no horizon and the character
  dead-centre. It now holds a shallow enough line to keep the horizon in frame,
  clears terrain along the boom, and offsets the bench composition.

### Built

- Directed third-person camera with arrival, explore, bench and viewpoint framing,
  damped follow yaw, terrain clearance, tiny pointer parallax and reduced-motion
  handling.
- Full landmark set: arrival pier with ramp, posts and rope rails; moored boat with
  swell motion; striped lighthouse with gallery, lantern room and a restrained
  rotating dusk beam; framed Echo bench; stone cottage with pitched roof, chimney
  smoke, lit windows and outside seat; memory grove with ring of trees, stones and
  hanging lanterns; sunset overlook with stone platform and railing; bottle cove with
  driftwood. Plus a path signpost.
- Pier deck is a real walkable surface layered over the terrain, so the pier-end
  anchor is reachable.
- Ocean: depth-tinted shallows, irregular animated foam, crest shading, fresnel sky
  reflection and a horizon haze that matches the scene fog.
- Island terrain: higher interior, extended south-west cove shelf, narrower paths and
  calmer painterly palette.

## Verification

Run on the integration commit:

- `npm run typecheck` — passing.
- `npm run lint` — passing, zero warnings.
- `npm test` — 26 unit tests passing across 5 files (terrain, environment, controller,
  echoes, pier surface).
- `npm run build` — production build passing.
- `npm run test:e2e` — 2 Playwright tests passing (first visit, settings/reduced motion)
  on Chromium with software WebGL.

## Screenshots

Captured from the production build at 1440×900 in headless Chromium (software
rendering, not the M2 Pro GPU):

- `screenshots/rendering/arrival.png`
- `screenshots/rendering/pier-and-sea.png`
- `screenshots/character-camera/bench-seaward.png`
- `screenshots/baseline/00-loading.png` (the pre-fix failure state)

## Blockers and limitations

- Worker time was lost to provider limits; the worker branches are empty. A second
  Phase 1 pass could still improve character animation, ocean wave shape at close
  range and landmark detail.
- Screen captures are software-rendered; frame-rate was not measured on real hardware.
- No Supabase project credentials: persistence and cross-device multiplayer use local
  adapters. The Supabase schema and adapter seam are documented and ready.
- No real moderation service: free-text messages remain device-local. Do not enable
  public submission until moderation is configured.
- No deployment: production build is verified locally only.

## Next

- Character animation polish: sit alignment, coat/scarf secondary motion at distance.
- Echo reveal timing and ghost fade review in the real browser.
- Bottle and flower flows end to end.
- Performance pass on real hardware; then documentation and release.
