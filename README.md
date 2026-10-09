# Stars of Destiny

A Balatro-style roguelike deckbuilder where every Joker is a Suikoden II character. Non-commercial fan project. Static single-page app (Svelte 5 + Vite + TypeScript), no backend.

```sh
pnpm install
pnpm dev        # local dev server
pnpm test       # Vitest engine tests
pnpm check      # svelte-check (types)
pnpm build      # static files in dist/ (works from any subfolder)
```

## Layout
- `src/engine/` – pure TypeScript game engine (no DOM). Entry points: `newRun`, `applyAction` (`run.ts`), `computeScore` (`scoring.ts`), `save.ts`.
- `src/data/` – Jokers, Tags, Bonds, Bosses (JSON). Tunable numbers live here and in `src/engine/config.ts`.
- `src/stores/` – rune-based store around the engine. `src/ui/` – Svelte screens and components.
- `tests/` – Vitest tests (engine only).
- `docs/` – brief, roster, `decisions.md`, `joker-notes.md`, `balance-notes.md`, `save-format.md`.

## Controls
Click or tap cards to select. Keys in a round: `1`-`9` select, `Enter` play, `D` discard, `R`/`S` sort, `Esc` clear. Drag Jokers (and hand cards) left or right to reorder; tap a Joker for details, Sell and move buttons.

## Portraits
Source PNGs are in `docs/suiko-characters/`. Run `python3 scripts/portraits.py` (needs Pillow) to rebuild `public/portraits/*.webp` and `src/data/portraits.json`. File names that differ from the Joker id are mapped in the script's `ALIAS` table.
