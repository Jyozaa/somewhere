# Somewhere

**Someone, somewhere, is experiencing life at the same time as you.**

Somewhere is a quiet, atmospheric multiplayer island at the edge of the ocean. Explore a hand-composed coastline, sit on a bench above the sea, encounter a preserved moment left by another visitor, and leave one of your own.

Built with TypeScript, Vite, Three.js and WebGL 2. No image, model or audio assets are sampled from other games; the island, shaders and soundscape are generated in code.

## Run locally

```bash
npm install
npm run dev
```

Open http://localhost:5173. Choose **Enter the island**. Sound starts after that gesture, as browsers require.

For visual QA, append `?at=bench`, `?at=pierEnd`, `?at=lighthouse` (or any other anchor id) to start at that anchor. This only changes the starting position; it does not create or fake another visitor.

## Quality gates

```bash
npm run typecheck
npm run lint
npm test
npm run build
npm run test:e2e   # requires: npx playwright install chromium
```

## Current status

See [docs/STATUS.md](docs/STATUS.md) for the active phase, integration state and known limitations.

## Documentation

- [Architecture](docs/ARCHITECTURE.md)
- [Game design](docs/GAME_DESIGN.md)
- [Art direction](docs/ART_DIRECTION.md)
- [Camera design](docs/CAMERA_DESIGN.md)
- [Interface contracts](docs/INTERFACE_CONTRACTS.md)
- [Testing](docs/TESTING.md)
- [Known issues](docs/KNOWN_ISSUES.md)
- [Deployment](docs/DEPLOYMENT.md)

## Privacy

This is a public repository, but the running experience collects no personal data. This build stores visitor contributions in the browser's local storage only. There is no public messaging backend or moderation service yet, so free-text messages never leave the device. See [docs/SECURITY.md](docs/SECURITY.md).

## Licence

Original source code and generated assets. Third-party dependencies retain their own licences; see [docs/ASSET_LICENSES.md](docs/ASSET_LICENSES.md).
