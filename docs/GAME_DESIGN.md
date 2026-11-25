# Game design

## The island

One coastal island, roughly 170 m across, walkable in a two-to-three-minute loop with enough detail for much longer visits. Every landmark is visible or discoverable from a path.

| Place | Role | Coordinates (x, z) |
| --- | --- | --- |
| Arrival pier | First composition, threshold | 0, 101–121 |
| Lighthouse | Distant landmark, symbol of presence | 56, -42 |
| Echo bench | Emotional centre | -60, 6 |
| Cottage | Warmth, shelter, implied habitation | 2, 24 |
| Memory grove | Persistent flowers from visitors | 38, 28 |
| Sunset overlook | Shared looking; wide camera state | -28, -50 |
| Bottle beach | Messages that travel through time | -58, 62 |

## Loop

Arrive → orient by landmark → follow a path → discover an interaction → sit, read, leave something → watch the weather change → leave. There is no objective, currency, inventory or completion state.

## Interactions

- **Sit** at the bench. If a preserved Echo exists, a translucent traveller appears beside you. If not, the interface says no one has sat here yet and offers to leave a moment.
- **Leave a flower** in the grove. Three per visitor; twelve quiet slots.
- **Bottles** wash ashore after time. Read, keep, release or report. Writing is local-only until moderation exists.
- **Overlook** temporarily widens the camera toward the horizon.
- **Lighthouse and cottage** offer environmental storytelling, not quests.

## Presence layers

- **Now**: live visitors in the same browser profile, via BroadcastChannel presence (10–12 Hz, interpolated).
- **Before**: locally preserved Echoes and bottles. Clearly labelled by time and authorship.
- **After**: contributions persist on the device; the Supabase seam is ready for a moderated backend.

## Deliberate exclusions

No chat, voice, profiles, follows, leaderboards, achievements, crafting, combat, inventories, quests, currency, infinite generation or engagement notifications.
