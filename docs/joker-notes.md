# Joker interpretation notes

Where roster text was ambiguous, this is the literal reading that is implemented. The same notes are comments in `src/engine/jokers/defs/*.ts`. Values are in `src/data/jokers.json` (`params`).

| Joker | Reading |
|---|---|
| Riou | X(1 + 0.02 x Jokers recruited in the Collection, not counting Riou). "Recruited" = owned at least once. |
| Jowy | See `decisions.md` (copy, Bond X2, Ante 8 destruction). |
| Shu | Reveals all bosses in the Run view; 1 boss reroll per Ante (not fixed bosses). |
| Viki | Effect picked at round start; +5 Potch is paid at once. Copy and original share the same pick. |
| Luca Blight | Destroys a random other Joker at end of each won round. Jowy's copy also destroys one (it may hit Jowy). |
| Mukumuku / Feather | Rounded after the Beast scale. |
| Kinnison, Archer tag | "Hands remaining" = hands left after the current hand. |
| Rikimaru | -1 Potch on the cash-out. |
| Tuta, Craftsman 2 | The first scoring card gains Chips once per hand, after it scores (counts from the next hand). |
| Anita | +2 when you leave a shop without buying anything (packs and upgrades count as buying). Resets when a boss is defeated. |
| Gilbert | Active if any blind was skipped this Ante. |
| Bolgan | Hand type is Three of a Kind or stronger. |
| Rina | One Rune when a Boss blind starts. |
| Flik / Viktor / Clive | First hand = first hand played this round. Final hand = no hands left after it. Clive's 5 Potch is paid when the final hand wins. |
| Luc | Counts every Rune used this run (not Forging or True Runes). |
| Yam Koo | +2 Mult per full 5 Potch, max +20. |
| Adlai | Round won with exactly 1 hand played. |
| Ridley / Boris / Kiba / Abizboah / Amada / Connell | Exact hand type (Pair, Two Pair, Flush, Four of a Kind or Full House, High Card, Pair). "Contains" is used only where the text says "contains" (Nanami, Taki, Klaus). |
| Stallion | +3 Potch if no discard was used in the round just won. |
| Hai Yo | If no blind was skipped this Ante: +2 Potch and +1 hand next round. |
| Meg | Per hand, max 4 per round. |
| Hix / Tengaar | Count enhanced cards among all played cards. |
| Yuzu | Unique ranks among scoring cards (Stone cards have no rank). |
| Teresa | Each hand played: +1 Potch per Face card held in hand. |
| Shin | Blocks the first Joker destruction each Ante (any source). |
| Futch | Paid every round: 2 x bosses defeated, max 8. |
| Humphrey | +3 Potch when you sell another Joker (not when he is sold). |
| Lebrante | Every Joker's sell value +1 each round won. |
| Kasumi | +1 hand in the first round played in each Ante. |
| Lorelai | Max 5 Potch per round from Runes. |
| Mondo / Sasuke / Ninja tag | First / last **played** card (retriggers only if that card scores). |
| Karen | The first hand of a run counts as "different". |
| Hoi | 0 discards left at the time of scoring. |
| Long Chan Chan | After your first discard of the round, +10 Mult for the rest of the round. |
| Marlowe | +1 discard in Boss blinds. |
| Sierra | X2 in Boss blinds; a Rune's effect is applied twice. |
| Jess | Skipping applies the Spoil twice. |
| Gantetsu | 4 Chips per card in the full deck. |
| Tessai | Every 2nd round won, the most played hand gains a level. Jowy's copy does not count rounds. |
| Genshu | Level of the most played hand (ties go to the stronger hand). |
| Pesmerga | X1.5 to the power of bosses defeated, max X3. |
| Mazus | Not in the shop pool until 100 Jokers are recruited. |
