# Build Brief: "Stars of Destiny" (working title)

A Balatro-style roguelike deckbuilder where every Joker is a character from Suikoden II. This is a non-commercial fan project. Build it as a static single-page web app with no backend.

You will receive this brief plus `suikoden-ii-balatro-jokers.md` (the full Joker roster with tags and bonds). Treat the roster file as the source of truth for Joker data.

## 1. Scope

**Phase 1 (this build), all required:**
- Complete Balatro-style core loop: antes, blinds, poker hand scoring, shop, consumables, endless mode after Ante 8.
- All 113 Jokers from the roster, implemented and working.
- The **Bond** system (adjacency bonuses between specific Jokers).
- The **Tag** system (set bonuses for owning N Jokers with a shared tag).
- Local persistence and JSON export/import of progress.
- A Collection screen showing all Jokers (owned/seen/undiscovered), tags and bonds.

**Phase 2 (NOT in this build, but do not block it):** Castle meta-progression (HQ facilities that unlock shop options, consumable slots, starting perks, and persist between runs). Leave clean extension points (see section 7).

**Non-goals:** multiplayer, accounts, servers, leaderboards, analytics, monetization, mobile-native packaging (the app should merely be responsive and touch-friendly).

## 2. Tech stack (fixed)

- **Svelte 5 using runes** (`$state`, `$derived`, `$effect`). Do not write Svelte 4 syntax (no `export let`, no `$:` reactive statements, no `writable` stores for new code).
- **Vite** as a plain SPA. **Do not use SvelteKit.** There is no server, so there is no need for it.
- **TypeScript in strict mode** everywhere, including the Svelte components.
- **Vitest** for the engine tests.
- **pnpm** as the package manager. Pin dependency versions exactly. Keep dependencies minimal: no UI frameworks, no state libraries, no animation libraries. Use CSS transitions/animations and the Web Animations API.
- Plain CSS with custom properties for theming. Scoped component styles are fine.
- Output must build to static files (`pnpm build`) that run when served from any static host or a subfolder (use `base: './'` in Vite config).

## 3. Architecture

The single most important rule: **the game engine is pure TypeScript with zero Svelte or DOM imports.** The UI reads engine state and sends actions; it never contains game rules. This is what makes the project maintainable and lets the engine be reused elsewhere later.

```
src/
  engine/            pure TS, no DOM, no Svelte
    rng.ts           seeded RNG (sfc32 or mulberry32), serializable state
    cards.ts         Card, Rank, Suit, Enhancement, Edition, Seal
    hands.ts         poker hand detection + hand levels
    scoring.ts       scoring pipeline (see below)
    blinds.ts        ante/blind targets, boss blinds, skip tags
    shop.ts          shop generation, packs, vouchers, rerolls, pricing
    consumables.ts   Runes (tarot analog), Forging (planet analog), True Runes (spectral analog)
    jokers/
      types.ts       JokerDef, hook signatures
      registry.ts    all JokerDefs keyed by id
      bonds.ts       bond resolution
      tags.ts        tag set bonuses
      defs/          one file per chapter (chapter1.ts ... chapter6.ts, special.ts)
    run.ts           RunState + reducer-style actions
    save.ts          serialization, versioning, migrations, export/import
  data/
    jokers.json      generated or hand-converted from the roster file (id, name, rarity, tags, bonds, text)
  ui/
    App.svelte, screens/, components/
  stores/            thin rune-based wrappers around engine state
tests/               Vitest, engine only
```

### Scoring pipeline

Implement scoring as an ordered pipeline that emits a **list of ScoreEvents** (`{source, kind: 'chips'|'mult'|'xmult'|'money'|'retrigger'|..., value, targetCardIndex?, jokerId?}`). The UI replays these events as animation, one at a time. The engine must produce the final number without any UI involved, and the UI animation must never be the source of truth.

Order, matching Balatro: base hand chips and mult (by hand level) -> each scoring card left to right (card chips, enhancement, edition, seal, then Joker per-card hooks, with retriggers) -> held-in-hand effects -> Joker hooks left to right (including editions) -> Bond effects -> Tag set bonuses. Document any place where you chose an order that differs from this.

### Joker effect system

- Each Joker is a `JokerDef` with an id, rarity, tags, bonds, text, and **hook functions**. Examples of hooks: `onCardScored`, `onHandScored`, `onHandPlayed`, `onDiscard`, `onRoundStart`, `onRoundEnd`, `onBossDefeated`, `onShopEnter`, `onReroll`, `onSell`, `onConsumableUsed`, `onBlindSkipped`, plus passive modifiers (hand size, discards, hands, slots, price modifiers, interest rules).
- Joker data (name, tags, text) lives in JSON; Joker **behavior** lives in code and references the JSON by id. A test must assert that every id in `jokers.json` has a registered behavior and vice versa.
- Per-Joker run state (counters like "gains +1 Mult each reroll") lives in `RunState`, not on the definition, so it serializes.
- The engine must handle: retriggers, copy effects (Jowy copies the Joker to its right), Joker destruction (Luca Blight, Shin's protection, Riou's fate with Jowy), selling, and edition modifiers.

### Bonds and Tags

- **Bond**: data is `bonds: [{with: [ids], rule: 'adjacent', effect: ...}]`. Resolved from Joker positions every scoring pass. Bond effects are listed per Joker in the roster ("Bond" column). Multi-member bonds (trios) apply only when all members are adjacent as a contiguous group.
- **Tag**: `tags: string[]` on each Joker. A tag table defines tier thresholds and effects (see "Tag Reference" in the roster file). Tag bonuses are re-evaluated whenever Jokers change. The UI shows active tiers and progress toward the next one.
- Bonds and Tags are independent and stack. Both must be unit tested with at least: threshold edges, selling a member mid-run, copied Jokers (do copies count toward tags? Decide, document, and make it a config flag).

## 4. Game rules to replicate (reskinned Balatro)

Use Balatro's structure and numbers as the baseline, in a single config file so tuning is easy:
- 52-card deck, hand size 8, 4 hands and 3 discards per round, 5 Joker slots, 2 consumable slots, $4 starting money (Potch), interest $1 per $5 up to the cap, payout per remaining hand.
- 8 antes with 3 blinds each. Chip requirements (white-stake baseline): Ante 1: 300/450/600, 2: 800/1200/1600, 3: 2000/3000/4000, 4: 5000/7500/10000, 5: 11000/16500/22000, 6: 20000/30000/40000, 7: 35000/52500/70000, 8: 50000/75000/100000. Put these in config and verify them. Endless mode after Ante 8 with scaling targets.
- Poker hands with levels (planet-analog upgrades), including the standard hand list.
- Card enhancements (Bonus, Mult, Wild, Glass, Steel, Stone, Gold, Lucky), editions, and seals. Roster Jokers reference enhanced cards and Stone cards, so these must exist.
- Shop: Jokers, packs, vouchers, rerolls, selling. Skip tags when skipping Small/Big blinds.

### Reskin table

| Balatro | This game |
|---|---|
| Money ($) | Potch (display "P" or the Potch symbol; keep "$" in code comments if easier) |
| Small / Big / Boss Blind | Duel / Unit Battle / Boss (a named enemy) |
| Ante | Chapter (Kyaro, Muse, Greenhill, Matilda, Gregminster, Tinto, Highland, The Beginning) |
| Tarot | Runes (elemental) |
| Planet | Forging (hand-type upgrades, "weapon level") |
| Spectral | True Runes (rare, powerful, with a drawback). One True Rune is the "Soul" analog that yields a Legendary Joker |
| Voucher | Blacksmith upgrade (keep Balatro's effects) |
| Joker | Star (the character) |

### Boss Blinds

Reuse Balatro's boss-blind *mechanics*, themed. Required fixed bosses:
- **Luca Blight**: appears as a boss in Ante 4 or 6. Mechanic like "only 1 hand per round". **Defeating him once unlocks the Luca Blight Joker permanently.**
- **Neclord**: face cards are debuffed (vampire theme).
- **Jowy Atreides**: the Ante 8 final boss. Suggested mechanic: a random Joker is debuffed each hand. Make it feel climactic and say in the UI that this is the finale.

You choose and name 8 or more additional bosses (Highland commanders and similar), each mapped to a Balatro boss mechanic. Keep the name-to-mechanic mapping in one data file.

## 5. Joker roster (from the attached file)

- 113 Jokers. 112 are in the normal pool from the start (Jowy included). **Only Luca Blight is locked** until his boss is defeated.
- Legendary Jokers (Riou, Jowy, Shu, Viki, and Luca once unlocked) are obtained only via the True Rune "Soul" analog, not the shop.
- No exclusivity rules: every Joker can appear in the same run as any other.
- Where a Joker's text is ambiguous, implement the most literal reading and write the interpretation in a comment and in `docs/joker-notes.md`. Do not silently change values.
- The roster numbers are a first pass. Put all tunable values (Mult, Chips, thresholds, prices) in the data file where practical, not hardcoded in logic, so balance changes do not need code edits.

## 6. Persistence and export

- All persistence is local. Use `localStorage` (data is small). Wrap it in a storage adapter interface (`get/set/remove`) so it can be swapped for IndexedDB or a file system later without touching the engine.
- Two stored objects:
  - `profile`: collection (which Jokers have been seen/owned/unlocked), unlocks (e.g. Luca), lifetime stats, settings, and a reserved empty `castle: {}` object for Phase 2.
  - `run`: the in-progress run snapshot (full RunState including RNG state) so a refresh resumes exactly where the player was. Autosave after every action.
- Every stored object carries `schemaVersion`. Provide a migration function chain (even if only v1 exists now) with a test.
- **Export / Import**: a button to download one JSON file containing `{schemaVersion, exportedAt, profile, run?}` and a button to import it. Validate on import (shape, version, plausible values), show a clear error on failure, and never partially apply a bad import. The file format must be documented in `docs/save-format.md` so it can be loaded by another front end later.
- Seeded runs: show the run seed, allow entering a seed to replay, and make runs fully deterministic given the seed and the sequence of player actions.

## 7. Phase 2 extension points (do not implement the castle)

- `profile.castle` reserved and round-tripped through export/import untouched.
- A `RunModifiers` object built at run start (starting money, extra slots, shop weights, etc.) that the engine reads from. In Phase 1 it is filled with defaults; in Phase 2 the castle will fill it.
- A main menu with a disabled "Castle (coming soon)" entry.

## 8. UI/UX requirements

- Screens: Main menu, Run (hand/play area, Joker row, consumables, blind info, score tally), Shop, Boss/blind select, Collection, Settings (including export/import and reset), Game over / victory.
- Joker row: drag to reorder (order matters for Bonds and left-to-right scoring), hover/tap shows full text, tags, bonds, and which bond partners are present. Clearly highlight **active Bonds** and **active Tag tiers**.
- Scoring animation driven by ScoreEvents with a skip/speed setting.
- Collection screen: filter by tag, rarity, chapter; show each Joker's bonds and which are discovered. Undiscovered Jokers show as silhouettes with "???".
- Keyboard support for core actions (select cards, play, discard) and touch-friendly sizing. Reduced-motion setting respected.
- Dark, rich fantasy-war visual identity inspired by the game's setting. No external fonts required (system fonts or a single bundled open-license font).

## 9. Assets

- I will find the assets for you (ex character portraits for Joker cards) later.
- Sound: optional, off by default, use https://github.com/danielwh2/cuelume and/or https://github.com/KilledByAPixel/ZzFX for cheap and light but good sound effects.

## 10. Testing and acceptance criteria

Vitest tests for the engine (not the UI):
- Hand detection for every hand type, including edge cases (wild cards, Stone cards, five of a kind/flush five if implemented).
- Scoring pipeline golden tests with known inputs and expected totals, including retriggers and edition ordering.
- Every Joker has at least one test proving its effect. Table-driven tests are fine. Include specific tests for: Riou's Collection scaling, Jowy copying and the Riou destruction, Luca Blight's destruction, Shin's protection, Chinchirorin/random Jokers using the seeded RNG.
- Bonds: adjacency, trios, reorder, sell.
- Tags: thresholds, tiers, sell mid-run.
- Save/load round trip, migration, and import validation (including malformed files).
- Determinism: same seed plus same actions produces the same final state.

**Done means:** `pnpm install && pnpm test && pnpm build` all pass; a full run from Ante 1 to the Ante 8 boss is playable; all 113 Jokers can appear; Luca is locked until his boss is beaten; refreshing mid-run resumes; export then import reproduces the profile and run exactly; no console errors in a normal playthrough.

## 11. Suggested build order

1. Engine skeleton: cards, RNG, hand detection, hand levels, scoring pipeline, tests.
2. Run loop: blinds, antes, hands/discards, economy, boss blinds, skip tags.
3. Shop, consumables, vouchers, enhancements/editions/seals.
4. Joker framework, then Jokers chapter by chapter (with tests as you go), then Bonds, then Tags.
5. Persistence, export/import, migrations.
6. UI screens and scoring animation; Collection screen last.
7. Polish, balance pass notes, `docs/` files.

## 12. How to work

- Deliver complete files, not snippets, and keep the project runnable after each milestone.
- Do not ask clarifying questions unless something blocks you. Where you must decide, choose, document the choice in `docs/decisions.md`, and continue.
- Do not change roster numbers on your own. If you think a value is broken, implement it as written and list the concern in `docs/balance-notes.md`.
- Keep engine code free of Svelte/DOM imports. If you are tempted to put a rule in a component, move it into the engine.
