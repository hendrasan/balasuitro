# Balance notes

No roster numbers were changed. These are concerns to check in playtesting.

- **Riou + Jowy.** Full Collection Riou is X3.24. With Jowy's copy (X3.24) and the Bond (X2) the slot pair gives about X21 until Ante 8.
- **Teresa** pays per hand for every Face card held. With 8+ cards in hand this is often 3-5 Potch per hand.
- **Badeaux + Mukumuku / Feather.** 1 x 1.5 rounds to 2: +2 discards / +2 hand size.
- **Luca boss** uses the Needle target (1x base). One hand to reach 5000 (Ante 4) or 20000 (Ante 6) can still be hard for early builds.
- **Jowy copying Luca** destroys two Jokers per round and can destroy Jowy.
- **Rune of Beginning** chance is 0.3% per pack slot (Balatro). Legendaries will be rare; raise `CONFIG.soulChance` to test them.
- **Rarity weights** are the roster's C 50 / U 38 / R 12 (Balatro is 70 / 25 / 5), so Rares show up about twice as often as in Balatro.
- **Pesmerga** caps at X3 after 3 bosses; with the multiplicative reading she is X2.25 after 2 bosses.
- **Invented Bonds** (marked in `bonds.json`) are first guesses.
- **Kasumi** gives her extra hand in the Unit Battle if the Duel was skipped (first round *played* in the Ante).
- **Castle values are first guesses.** Renown (1 per round, +2 per Boss, +5 per win) means a typical early loss gives about 5-12 Renown. The cheap first steps (Trading Post 10, Tavern and Forge 15) come after 1-2 runs; all levels of everything cost 905 Renown. Annallee's Stage (110 for all levels) pays for itself in about 6 runs at level 1 (about +3 Renown per typical run) and speeds up the rest. Costs are in `src/data/castle.json`.
- **Shu's War Room (+1 Joker slot, 80)** is the strongest single upgrade. If it is too strong, raise the cost or make it need the other facilities first.
- **Squirrel Corps level 2 (25%)** is forgiving; it is the main "safety net" for new players.
- **Leona's Tavern +1 hand size** is a permanent Paint Brush in every run; strong for a first facility.
- **Hai Yo's Curry (+1 hand)** is the strongest Food; with the Kitchen, a Curry can show up every blind.
