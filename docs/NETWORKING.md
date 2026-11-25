# Networking

## Current implementation: local live presence

Live visitors are synchronised across tabs of the same browser profile using `BroadcastChannel` (`somewhere.presence.v1`).

- Anonymous visitor id generated locally (24 hex characters).
- Messages at ~12 Hz with position, yaw, speed, sitting state and animation name.
- Compact numeric payload; no rendering state.
- Client interpolation at 10 Hz damping; stale visitors expire after 9 s.
- `hello` / `state` / `bye` lifecycle; page hide sends `bye`.
- All incoming messages validated: id shape, palette range, finite bounded positions, known animation.
- Maximum eight visible remote travellers; extra sessions are ignored for rendering.
- No chat, no profiles, no identifiers beyond the ephemeral session.

This is real synchronisation between real clients, but only on one device/browser profile. It is not cross-device multiplayer.

## Cross-device seam (blocked on credentials)

The intended production transport is Supabase Realtime (`presence` + broadcast channels) with the same message schema and validation. Requirements:

- Anonymous session via Supabase anonymous auth; server-issued id.
- Room assignment capped at eight visitors per island instance.
- Server timestamp authority and rate limiting.
- Presence channel for join/leave; broadcast for 10–15 Hz state.
- Validate on receive exactly as the local adapter does.
- Never expose service-role keys to the client.

Until a project and credentials exist, `docs/DATABASE.md` specifies the schema and `src/multiplayer/presence.ts` is the local implementation. Do not claim cross-device multiplayer works.

## Bandwidth estimate

Per message ≈ 120 bytes JSON. At 12 Hz per visitor and eight visitors, inbound ≈ 11.5 kB/s per client, ≈ 92 kB/s per full island. A binary or delta encoding would reduce this if required.
