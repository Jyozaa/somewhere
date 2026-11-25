# Deployment

## Status

Deployment-ready static build, not publicly deployed. No paid service is configured.

## Build

```bash
npm ci
npm run build
npm run preview   # verify http://localhost:4173
```

`dist/` is a static site. `base: './'` allows hosting in a subdirectory. SPA routing is not used, so no rewrite rules are required.

## Recommended free hosting

Any static host that serves HTTPS and supports custom headers: GitHub Pages, Cloudflare Pages or Netlify. None is configured; publishing requires the owner's authorisation.

## Backend (optional, blocked)

Cross-device persistence and multiplayer need a Supabase project:

1. Create a free project; enable anonymous auth.
2. Apply migrations derived from `docs/DATABASE.md`.
3. Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in the host environment. Never expose the service-role key.
4. Implement `SupabaseAdapter` behind `persistence/adapter.ts` and swap `presence.ts` to a Realtime channel with identical validation.
5. Configure moderation before enabling free-text sharing.
6. Verify row-level security with integration tests.

## Release checklist

- [x] Production build passes.
- [x] Type check and lint pass.
- [x] Unit tests pass.
- [x] No secrets or local files tracked.
- [x] Asset licence manifest complete.
- [ ] Browser smoke tests pass on Chromium.
- [ ] Performance measured and recorded.
- [ ] Known limitations reviewed.
- [ ] Owner authorises public deployment.
- [ ] HTTPS host configured.
- [ ] Backend and moderation configured, if enabling shared text.

## Environment variables

None required for the current local-first build. `.env.example` documents the future Supabase values only.
