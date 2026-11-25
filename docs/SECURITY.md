# Security and privacy

## Collection

No accounts, emails, names, precise location, device fingerprints, analytics or tracking. A 24-hex visitor id is generated locally and used only to keep your own contributions distinct. Echoes and bottles contain a palette index, anchor, timestamp and optional short text.

## Storage

This build stores contributions in `localStorage` on the visitor's device. There is no server, no public messaging and no moderation service. Text never leaves the browser. The interface states this plainly in settings.

## Untrusted input

- Stored records are shape-validated on read (`isEcho`, `isBottle`, `isFlower`); malformed entries are dropped.
- All user text is inserted with `textContent`, never `innerHTML`.
- Length limits: Echo message 140 characters; bottle 180; composer enforces 180.
- Presence messages validate id shape, palette range, finite bounded coordinates and known animation names before use.
- Coordinates are clamped/bounded to the island region; rendering cannot be driven to arbitrary world positions.

## Production requirements before enabling public text

Do not enable cross-device free-text submission until all of the following exist:

1. Anonymous auth with server-issued identity.
2. Row-level security policies from `docs/DATABASE.md`, verified by integration tests.
3. Server-side length and content validation; HTML escaped on render.
4. Rate limiting per identity and per IP.
5. Report, hide and delete flows with an operator review path.
6. A real moderation strategy. If unavailable, disable unrestricted free text. Do not present an unmoderated public messaging system as production-ready.
7. No service-role key in client bundles or the repository.

## Known limitations

- Local-only persistence means contributions are lost when browser storage is cleared and are invisible to other devices.
- The "report" action currently hides a local record; it does not notify a moderator.
- There is no server-side abuse prevention because there is no server.
- Do not market Somewhere as therapy or a mental health treatment.
