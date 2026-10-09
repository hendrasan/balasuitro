# Decisions

Decisions made where the brief or the roster did not fix the answer. Each item names where the code is.

## Architecture
- **Engine is pure TypeScript** in `src/engine/` (no Svelte, no DOM). The UI store (`src/stores/game.svelte.ts`) clones the run with `structuredClone` before each action, calls `applyAction`, and replaces the snapshot. Engine functions mutate the clone only.
- **Joker data vs. behavior.** Name, rarity, tags, text, cost and all tunable numbers (`params`) are in `src/data/jokers.json`. Behavior is in `src/engine/jokers/defs/*.ts`, keyed by id. Bonds are in `src/data/bonds.json` + `jokers/bonds.ts`; tags in `src/data/tags.json` + `jokers/tags.ts`; bosses in `src/data/bosses.json`.
- **One RNG stream** (mulberry32, state = one integer in `run.rng`). Same seed + same actions = same state (tested). The UI never consumes RNG.
- **Collection inside the run.** At run start the profile's collection and unlocks are copied into `run.discovered` / `run.unlocked`. The engine updates them; the store merges them back into the profile after every action. This keeps the run self-contained and deterministic (Riou, Bob and Mazus read it).

## Scoring order
Order follows the brief: base hand -> scoring cards left to right (card chips, enhancement, edition, seal, Joker per-card hooks, then per-card Tag and Bond effects; each repeated for retriggers) -> held-in-hand (Steel, Joker held hooks) -> Jokers left to right (foil/holo, effect, polychrome) -> Bonds -> Tags.

**Differences from the brief:**
- Per-card Tag effects (Matilda 2: Face +10 Chips; Craftsman 2: permanent +5 Chips) and per-card Bond effects (Freed/Yoshino, Camus/Miklotov, Tsai/Tomo) run in the card step, because they act on each card.
- Ninja tag retriggers are counted with the card's other retriggers.
- Joker editions belong to the slot: Jowy's foil/holo/poly applies to his slot even when he copies.

## Jowy (copy)
- Jowy's slot gives a copy of the Joker directly to his right: all event hooks and scoring hooks. The copy reads the target's counters (Gadget, Anita) but does not grow them.
- Jowy does **not** copy passive modifiers (hands, discards, hand size, slots, prices, interest, preview). Same as Balatro's Blueprint.
- Jowy has no effect of his own. The X2 with Riou is the `jowy_riou` Bond (rule `rightOf`: Riou directly right of Jowy), so Jowy gives the copy of Riou **and** the X2.
- Riou is destroyed after the Ante 8 boss win if he is directly right of Jowy (checked by position, so the finale's Joker debuff does not save him). Shin can block it.
- `CONFIG.copiesCountForTags` (default **false**): when true, Jowy also counts the copied Joker's tags.

## Bonds
- A Bond listed on two rows (e.g. Flik/Viktor "+1 hand") is **one** Bond and applies once, except where the text says "both".
- Trios apply only when all three are side by side (any order).
- Debuffed members make a Bond inactive for that hand. Debuffed Jokers also do not count for Tags.
- Six roster Bonds have no stated effect. I invented small ones, marked `"invented": true` in `bonds.json`: Tsai+Tomo (Stone +20 Chips), Futch+Humphrey (+2 Potch per round), Ayda+Feather (+50 Chips), Simone+Vincent (+8 Mult), Long Chan Chan+Wakaba (+10 Mult), Tessai+Viktor (X1.2 Mult).

## Tags
- Tiers stack. Vampire Hunter 6 replaces 4; Swordsman 4 replaces 2 (as the roster says).
- Beast tier 4 (+25%) and Badeaux (+50%) add up (x1.75). X Mult is scaled on the bonus part (X1.8 -> X2.4 at +75%). Whole-number effects (Mukumuku discards, Feather hand size) are rounded to the nearest integer.
- Gambler tier 4: once per round, a failed random **Joker** check (Tai Ho rolling 1-2, Richmond, Shilo) is rerolled automatically. Lucky cards and the Gambler tier 2 chance are not Joker effects.
- Mage tier 4: the first Rune used each round creates a copy of itself (needs a free slot).

## "Round" for per-round caps
Per-round caps (Meg, Mercenary tag, Lorelai, Mage tier 4, Gambler tier 4) reset when a blind is selected. So the shop after a round counts as part of that round.

## Bosses
- Fixed: Jowy in Ante 8 (finale), Luca in Ante 4 or 6 (seeded), Neclord in Ante 6 (or 7 if Luca takes 6). Other antes draw from 10 named bosses without repeats. Endless: Jowy every 8th ante, others random (Luca and Neclord included).
- Luca's boss is Balatro's Needle: 1 hand, target **1x** base (5000 in Ante 4, not 10000). Yuber is the Wall (4x).
- Eye/Mouth "not allowed" hands still use a hand and score 0.
- Shu's boss reroll cannot change fixed bosses.

## Shop and economy
- Interest cap means the most interest per round (5). Gordon: 1 per 4 held and cap 10 ("$40 held"). Merchant tier 4 adds +10 to the cap.
- No duplicate Jokers in the shop or in packs while you own that Joker.
- Skip rewards are called **Spoils** in game and code, so they do not clash with the Joker Tag system.
- The Rune of Beginning (Soul analog) appears only by `CONFIG.soulChance` (0.3%) per slot in Rune and True Rune packs, as in Balatro.
- Viki's teleport: once per Ante, from blind select, back to the last shop with its remaining stock.
- An empty hand with an empty draw pile ends the run (no softlock).

## UI
- Portraits: source art is `docs/suiko-characters/*.png` (400x400, the art fills only the left ~350 px). `scripts/portraits.py` trims each image to its visible part, scales it to 256 px high and writes `public/portraits/<id>.webp` (Joker and boss ids) plus `src/data/portraits.json`. Cards show the art with cover-fit, anchored on the upper middle (the face). Ids not listed use a monogram, so there are no 404 requests. Beast Rune and Zombie Horde have no art yet.
- Sound uses ZzFX, off by default, loaded only after the player turns it on.
- After a refresh the app opens the run in progress.
- The Castle is built on `profile.castle` and `RunModifiers` (see "Castle" below).

## Visual style and motion
- All motion goes through `src/ui/motion.ts` (`dur`, `scoreDur`, `play`, `wiggle`, `bump`, `shake`), so the Reduced motion setting (or the system preference) turns it off everywhere. CSS animations are also cut by the `.reduced-motion` / `.motion-system` root classes in `app.css`.
- Curves: `--ease` = `cubic-bezier(0.23, 1, 0.32, 1)` for UI, `--ease-in-out` for on-screen movement. UI motion stays under 300 ms; the scoring replay follows the speed setting.
- Frequent actions (selecting cards, sorting, keyboard keys) get only small, fast feedback (≤ 200 ms). Big motion is kept for rare moments: main menu, finale boss, victory.
- Hover motion is gated with `@media (hover: hover) and (pointer: fine)` so touch taps do not leave cards lifted.

## Castle (meta progression)
- Data: `src/data/castle.json`. Logic: `src/engine/castle.ts` (pure). Screen: `src/ui/screens/Castle.svelte`.
- **Unlock + build:** a facility can be built once its character is recruited (owned at least once in the Collection). Building costs **Renown**.
- **Renown** is added when a run ends (defeat, or "End run" after a win): 1 per round won, +2 per Boss defeated, +5 for beating the Ante 8 finale. Endless runs pay once, at the end.
- **Always on:** every built facility is active in every new run. `buildRunModifiers(castle)` turns them into `RunModifiers` at run start; a run in progress is not changed by building.
- Facilities:
  - Leona's Tavern (15): rerolls 1 Potch cheaper, +1 hand size.
  - Richmond's Detective Agency (20): at the Boss blind of a Chapter, the next Chapter's Boss is shown (Balatro shows it only when the Chapter starts, so this is "one round earlier"). The top 2 cards of the draw pile are shown during a round.
  - Hai Yo's Kitchen (25): one random Food card at the start of each blind, if a consumable slot is free.
  - Viki's Teleportation Gate (30): skipping a blind opens the shop, then play continues at the next blind. Viki is Legendary, so this is a late-game goal.
- **Food** is a fourth consumable kind (only from the Kitchen; never in the shop or packs). It does not count as a Rune (Luc, Lorelai, Raura, Mage tag, Sierra, Clone Rune ignore it). Rice Ball / Spicy Ramen add Chips / Mult to the next hand played (shown as "Food" in the score replay). Fried Fish, Hai Yo's Curry and Dumplings work only during a battle; Dumplings draw up to the new hand size at once. Steamed Bun gives 3 Potch. Food sells for 1 Potch.
- Save format v2 (see `save-format.md`).
