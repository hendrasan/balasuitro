# Save format

All data is stored locally (`localStorage`, behind the `StorageAdapter` interface in `src/engine/save.ts`).

| Key | Content |
|---|---|
| `sod.profile` | `Profile` |
| `sod.run` | `{ "schemaVersion": 3, "run": RunState }` (absent when no run is active) |

## Export file

```json
{
  "schemaVersion": 3,
  "exportedAt": "2026-10-09T12:00:00.000Z",
  "profile": { ... },
  "run": { ... } | null
}
```

### Profile (v3)
```json
{
  "schemaVersion": 3,
  "collection": { "seen": ["joker ids"], "owned": ["joker ids"] },
  "unlocks": ["luca_blight"],
  "stats": { "runs": 0, "wins": 0, "bestAnte": 0, "bossesDefeated": 0, "handsPlayed": 0, "bestHand": 0, "handPlays": { "pair": 14 } },
  "settings": { "speed": 1, "skipAnimations": false, "reducedMotion": "system", "sound": false },
  "castle": { "renown": 0, "levels": { "tavern": 2, "forge": 1 } }
}
```
- `owned` = recruited at least once (counts for Riou, Bob, Mazus). `seen` = appeared in a shop or pack.
- `castle.renown` is the meta currency; `castle.levels` maps facility ids (`src/data/castle.json`) to their built level (1 = first level). Unknown keys in `castle` are kept.
- `stats.handPlays` counts hands played per hand type over all runs (used by Tessai's Forge).

### RunState (v3)
The full type is `RunState` in `src/engine/state.ts`. Main fields:

| Field | Meaning |
|---|---|
| `seed`, `rng.s` | Seed string and current mulberry32 state (32-bit int). |
| `phase` | `blind`, `round`, `cashout`, `shop`, `pack`, `gameover`, `victory`. |
| `ante`, `blindIndex` | Chapter (1-8, more in endless) and blind (0 Duel, 1 Unit Battle, 2 Boss). |
| `money` | Potch. |
| `deck` | Every owned card: `{id, rank 2-14, suit S/H/C/D, enh, edition, seal, bonusChips}`. |
| `drawPile`, `hand`, `discardPile` | Card ids (only during a round). Top of the draw pile is index 0. |
| `jokers` | `{uid, id, edition, sellBonus, state}` left to right. `state` holds counters. |
| `consumables` | `{uid, id}`. Ids are listed in `src/engine/consumables.ts`. |
| `handLevels` | `{ [handType]: {level, played} }` for all 12 hand types. |
| `vouchers` | Blacksmith upgrade ids (`src/engine/vouchers.ts`). |
| `bosses` | `{ "<ante>": bossId }` (`src/data/bosses.json`). |
| `round`, `cashout`, `shop`, `pack` | Present only in their phases. |
| `discovered`, `unlocked` | Collection copy updated during the run. |
| `cycle` | Per-round counters (reset at blind select). |
| `modifiers` | `RunModifiers` built at run start from the Castle (see `state.ts`). |
| `rescued` | The Squirrel Corps has saved this run. |
| `nextHand` | `{chips, mult}` from Food, added to the next hand played. |
| `lastScore` | The last `ScoreResult` with its `ScoreEvent` list. |

## Versioning and migration
- Every stored object has `schemaVersion`. `MIGRATIONS[n]` in `save.ts` turns version n into n+1. A newer version than the game is rejected.
  - 0 → 1: files without `schemaVersion` (same shape).
  - 1 → 2: profiles get `castle: {renown: 0, built: []}` (old castle keys are kept); runs get `nextHand` and the new `modifiers` fields with default values.
  - 2 → 3: `castle.built` becomes `castle.levels` (each built facility = level 1); `stats.handPlays` is added; runs get `rescued` and the new `modifiers` fields.
- Import validates the whole file (JSON, shape, known ids, value ranges, phase consistency) **before** anything is applied. A bad file changes nothing.
