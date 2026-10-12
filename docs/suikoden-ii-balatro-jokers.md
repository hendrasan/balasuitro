# Suikoden II x Balatro: Joker Roster (Draft v2)

Design notes:
- Currency is **Potch** (shown as $). Mult/Chips follow Balatro conventions.
- **113 Jokers total.** 112 are in the normal pool from the start (Jowy included). Only **Luca Blight** is unlockable (defeat his Boss Blind once).
- No either/or recruit limits: Kasumi AND Valeria, Ridley AND Boris, and all three of Feather / Abizboah / Sigfried can appear in the same run.
- **Bond** = adjacency bonus between specific Jokers (listed per row). **Tags** = group membership with run-wide set bonuses (see Tag Reference below). They are separate systems and can stack.
- Legendary Jokers (Riou, Jowy, Shu, Viki, Luca Blight once unlocked) enter a Legendary pool obtained via a True Rune consumable (the Spectral "Soul" equivalent), not the normal shop.
- Tag membership is a design choice, not canon. Adjust freely during playtesting.
- Numbers are a first pass and need playtesting.

Legend: C = Common, U = Uncommon, R = Rare, L = Legendary

## Tag Reference

Set bonuses apply while you own at least N Jokers with that tag. Each tier is cumulative with lower tiers. Show active tiers in the UI.

| Tag | Members | Tier 1 | Tier 2 |
|-----|---------|--------|--------|
| Kyaro | Riou, Jowy, Nanami, Mukumuku | 2: +1 hand each round | 4: X1.5 Mult on the final hand of the round |
| Beast | Mukumuku, Shiro, Feather, Sigfried, Abizboah | 2: +1 discard each round | 4: Beast Jokers' own effects +25% |
| Circus | Bolgan, Eilie, Rina | 2: +$2 at end of round | 3: X1.5 Mult |
| Highland | Jowy, Luca Blight, Pesmerga, Gilbert, Kiba, Klaus | 2: +15 Mult | 4: X1.5 Mult |
| Mercenary | Flik, Viktor, Jess, Templeton | 2: earn $1 per hand played (max $4) | 4: X1.5 Mult on the first hand of the round |
| Ninja | Kasumi, Valeria, Mondo, Sasuke | 2: retrigger the first played card | 4: also retrigger the last played card |
| Gambler | Tai Ho, Yam Koo, Shilo, Richmond | 2: 1 in 4 chance of +$4 each hand | 4: once per round, reroll the result of any random Joker effect |
| Merchant | Alex, Hilda, Hans, Fitcher, Gordon, Lebrante | 2: shop prices -10% | 4: interest cap +$10 |
| Mage | Luc, Sierra, Jeane, Raura, Viki | 2: +1 consumable slot | 4: the first Rune used each round is duplicated |
| Strategist | Shu, Apple | 2: preview the top 3 cards of your deck at round start, and X1.3 Mult | none |
| Archer | Kinnison, Clive | 2: +20 Chips per hand remaining | none |
| Swordsman | Rikimaru, Flik, Viktor, Pesmerga, Amada | 2: +10 Mult on the first hand of the round | 4: that bonus becomes X1.5 Mult |
| Craftsman | Tsai, Tuta, Tomo, Tessai, Genshu, Jude | 2: first scoring card each hand permanently gains +5 Chips | 4: upgrade a random hand type after each Boss Blind |
| Kobold | Gengen, Gabocha, Bob | 2: +30 Chips | 3: X1.5 Mult on hands of 3 or fewer cards |
| Troupe | Annallee, Pico, Alberto, Karen | 2: +2 Mult per Joker owned | 4: X1.4 Mult |
| Vampire Hunter | Gijimu, Hauser, Kahn Marley, Koyu, Lo Wen, Marlowe, Sierra | 2: +$2 after each Boss Blind | 4: X1.5 Mult in Boss Blinds. 6: X2 Mult in Boss Blinds (replaces the 4 bonus) |
| Brawler | Nanami, Bolgan, Gantetsu, Amada, Tetsu | 2: +30 Chips on 5-card hands | 4: X1.4 Mult on 5-card hands |
| Matilda | Teresa Wisemail, Nina, Shin, Camus, Miklotov | 2: scoring Face cards give +10 Chips | 4: X1.4 Mult if hand contains a Face card |

Tag-payoff Jokers that reward owning a tag directly: Millie, Badeaux, Ayda (Beast), Bob (Collection size), Annallee (Joker count).

## Special / Legendary

| # | Joker | Rarity | Tags | Effect | Bond |
|---|-------|--------|------|--------|------|
| 1 | Riou | L | Kyaro | X1 Mult, +X0.02 for every other Joker recruited in your Collection (X3.24 at 113/113) | Nanami; Jowy |
| 2 | Jowy Atreides | L | Kyaro, Highland | Copies the Joker to its right. If that Joker is Riou: X2 Mult, but Riou is destroyed after the Ante 8 boss | Riou |
| 3 | Shu | L | Strategist | X2 Mult. At run start, reveal every Boss Blind effect for the run; reroll one Boss Blind per Ante | Apple |
| 4 | Viki | L | Mage | Each round gets a random effect: +30 Chips / +10 Mult / +$5 / X1.5 Mult. Once per Ante you may teleport back to the previous shop | none |
| 5 | Luca Blight | L (UNLOCK: defeat his Boss Blind once) | Highland | X4 Mult. Destroys a random other Joker at end of each round. Cannot be sold | none |

## Chapter 1: Kyaro, Ryube, Toto, Muse

| # | Joker | Rarity | Tags | Effect | Bond |
|---|-------|--------|------|--------|------|
| 6 | Mukumuku | C | Kyaro, Beast | +1 discard each round | none |
| 7 | Nanami | U | Kyaro, Brawler | +10 Mult if hand contains a Pair | Riou: +1 hand each round |
| 8 | Gengen | C | Kobold | +30 Chips if 3 or fewer cards are played | none |
| 9 | Rikimaru | C | Swordsman | +8 Mult. Lose $1 at end of round (always hungry) | none |
| 10 | Millie | C | none | Earn $1 per Beast Joker owned at end of round | none |
| 11 | Kinnison | C | Archer | +15 Chips per hand remaining | Shiro: doubled |
| 12 | Shiro | C | Beast | +4 Mult | Kinnison: doubled |
| 13 | Zamza | C | none | Earn $2 at end of round | none |
| 14 | Apple | U | Strategist | After selecting a Blind, preview the top 3 cards of your deck | Shu: preview 5 |
| 15 | Hanna | C | none | +10 Chips per card discarded this round | none |
| 16 | Tsai | U | Craftsman | Upgrade a random hand type by 1 level after each Boss Blind | Tomo |
| 17 | Tuta | C | Craftsman | First scoring card each hand permanently gains +3 Chips | none |
| 18 | Anita | C | none | +2 Mult each time you leave a shop without buying (resets on Boss) | none |
| 19 | Templeton | C | Mercenary | Scoring Aces give +15 Chips | none |
| 20 | Gilbert | U | Highland | X1.3 Mult if you Skipped a Blind this Ante (defector) | none |
| 21 | Bolgan | U | Circus, Brawler | +40 Chips if hand is Three of a Kind or better | none |
| 22 | Eilie | C | Circus | +6 Mult if exactly 2 cards are played | none |
| 23 | Rina | U | Circus | Create a Rune card when a Boss Blind is selected (needs room) | none |

## Chapter 2: Jowston Alliance, Radat, Kuskus

| # | Joker | Rarity | Tags | Effect | Bond |
|---|-------|--------|------|--------|------|
| 24 | Flik | R | Mercenary, Swordsman | X1.5 Mult on the first hand of each round | Viktor: +1 hand |
| 25 | Viktor | R | Mercenary, Swordsman | X1.5 Mult on the final hand of each round | Flik: +1 hand |
| 26 | Freed Yamamoto | U | none | Retrigger scoring 10s | Yoshino |
| 27 | Yoshino Yamamoto | U | none | Scoring Jacks give +10 Chips | Freed: Jacks also give +5 Mult |
| 28 | Barbara | C | none | +4 Mult per scoring Heart | none |
| 29 | Huan | C | none | +4 Mult per scoring Club | none |
| 30 | Leona | C | none | +4 Mult per scoring Spade | none |
| 31 | Luc | U | Mage | +0.1 X Mult per Rune used this run | none |
| 32 | Amada | C | Swordsman, Brawler | +30 Chips if hand is High Card (duel) | none |
| 33 | Tai Ho | U | Gambler | Roll a d6 each hand: 1-2 nothing, 3-4 +10 Mult, 5 +20 Mult, 6 X2 Mult (Chinchirorin) | Yam Koo |
| 34 | Yam Koo | C | Gambler | +2 Mult per $5 owned (max +20) | Tai Ho: +10 Mult more |
| 35 | Oulan | U | none | Scoring Queens give +8 Mult | none |
| 36 | Richmond | U | Gambler | Coin flip each hand: 50% X1.8 Mult, otherwise nothing | none |
| 37 | Alex | C | Merchant | Shop rerolls cost $1 less | Hilda: both earn +$2 per round |
| 38 | Hilda | C | Merchant | Earn $1 each time you reroll the shop | Alex |
| 39 | Adlai | C | none | Earn $3 if you win a Blind using only 1 hand | none |
| 40 | Clive | R | Archer | Final hand of the round: X2 Mult. If it wins the Blind, earn $5 | none |

## Chapter 3: Lakewest, Two River, Forest Village

| # | Joker | Rarity | Tags | Effect | Bond |
|---|-------|--------|------|--------|------|
| 41 | Taki | C | none | +12 Mult if hand contains a Straight | none |
| 42 | Hans | C | Merchant | Jokers in the shop cost $1 less (min $1) | none |
| 43 | Tetsu | C | Brawler | +6 Mult on 5-card hands | none |
| 44 | Chaco | C | none | +20 Chips | Trio: Fitcher, Ridley |
| 45 | Fitcher | U | Merchant | Earn $1 per Joker owned at end of round (max $6) | Trio |
| 46 | Ridley Wizen | U | none | X1.5 Mult on Pair hands | Trio: all three adjacent X1.3. Boris: X1.4 |
| 47 | Stallion | U | none | +1 hand each round. Earn $3 if you used 0 discards last round | none |
| 48 | Hai Yo | U | none | Cook: end of round, +$2 and +1 hand next round if you skipped no Blind | none |
| 49 | Shilo | C | Gambler | 1 in 3 chance for +$5 each hand (Chinchirorin) | none |
| 50 | Sid | C | none | +15 Chips per scoring 2 | none |
| 51 | Gabocha | C | Kobold | +20 Chips | Gengen: +20 more |
| 52 | Gadget | C | none | Gains +1 Mult each time you reroll the shop | Meg |
| 53 | Meg | C | none | Earn $1 per hand played (max $4) | Gadget: both +$1 |
| 54 | Wakaba | C | none | +Mult equal to 2x current Ante | Long Chan Chan |
| 55 | Tony | U | none | Retrigger the first scoring card twice | none |
| 56 | Hix | U | none | +4 Mult per enhanced card in played hand | Tengaar: Unite X1.5 |
| 57 | Tengaar | U | none | +30 Chips per enhanced card in played hand | Hix: Unite X1.5 |
| 58 | Yuzu | C | none | +10 Chips per unique rank scored | none |
| 59 | Emilia | C | none | +1 consumable slot (Librarian) | none |

## Chapter 4: Greenhill, Matilda, Rockaxe

| # | Joker | Rarity | Tags | Effect | Bond |
|---|-------|--------|------|--------|------|
| 60 | Teresa Wisemail | U | Matilda | Face cards held in hand give +$1 | Trio: Nina, Shin |
| 61 | Nina | U | Matilda | +30 Chips per scoring Face card | Trio |
| 62 | Shin | U | Matilda | Prevent the next Joker destruction this Ante. +10 Mult | Trio: all three adjacent X1.4 |
| 63 | Jeane | R | Mage | Create a Rune at end of each round if you have room | Raura: create 2 Runes |
| 64 | Futch | C | none | Earn $2 per Boss Blind defeated this run (max $8) | Humphrey |
| 65 | Humphrey Mintz | U | none | Selling a Joker gives +$3 extra | Futch |
| 66 | Camus | U | Matilda | +15 Chips per scoring Club | Miklotov: also +4 Mult per Club |
| 67 | Miklotov | U | Matilda | +15 Chips per scoring Spade | Camus: also +4 Mult per Spade |
| 68 | Kiba Windamier | R | Highland | X2 Mult if hand is a Flush | Klaus |
| 69 | Klaus | U | Highland | +40 Chips if hand contains a Flush | Kiba: +40 more |
| 70 | Badeaux | U | none | Beast Jokers have their effects increased by 50% | none |
| 71 | Connell | C | none | Earn $1 on each Pair played | none |
| 72 | Ayda | U | none | +25 Chips per Beast Joker owned | Feather |
| 73 | Feather | U | Beast | +1 hand size (griffin) | Ayda |
| 74 | Sigfried | R | Beast | X1.8 Mult if all scoring cards are red (unicorn) | none |
| 75 | Abizboah | R | Beast | X2 Mult on Four of a Kind or Full House | none |
| 76 | Lebrante | C | Merchant | Joker sell values increase by $1 each round | none |
| 77 | Simone Verdricci | C | none | +4 Mult per scoring Heart | Vincent |
| 78 | Kasumi | U | Ninja | +1 hand on the first round of each Ante. +8 Mult | none |
| 79 | Valeria | R | Ninja | X1.5 Mult | none |

## Chapter 5: Gregminster, Luca Blight, Rokkaku

| # | Joker | Rarity | Tags | Effect | Bond |
|---|-------|--------|------|--------|------|
| 80 | Sheena | C | none | +2 Mult per Boss Blind defeated this run | none |
| 81 | Lorelai | C | none | Earn $1 per Rune card used (max $5 per round) | none |
| 82 | Gordon | U | Merchant | Interest: $1 per $4 held instead of $5, cap raised to $40 | none |
| 83 | Mondo | U | Ninja | Retrigger the first played card | Sasuke: X1.2 |
| 84 | Sasuke | U | Ninja | Retrigger the last played card | Mondo: X1.2 |
| 85 | Bob | C | Kobold | +3 Mult per 10 Jokers recruited in your Collection | none |
| 86 | Tomo | C | Craftsman | Stone cards give +20 Chips more | Tsai |
| 87 | Annallee | U | Troupe | +2 Mult per Joker owned | Pico + Alberto: all adjacent X1.3 |
| 88 | Killey | U | none | +10 Mult | Alex: +$2 per round |
| 89 | Karen | C | Troupe | +15 Chips if hand type differs from your previous hand | none |
| 90 | Maximillian | C | none | +25 Chips if played hand contains an Ace | none |
| 91 | Hoi | C | none | +12 Mult if you have 0 discards left | none |
| 92 | Long Chan Chan | C | none | +10 Mult on your first discard of the round | Wakaba |
| 93 | Tenkou | C | none | Retrigger scoring 5s | none |
| 94 | Raura | C | Mage | Earn $2 each time a Rune is used | Jeane |

## Chapter 6: Tinto, Neclord, Highland

| # | Joker | Rarity | Tags | Effect | Bond |
|---|-------|--------|------|--------|------|
| 95 | Gijimu | U | Vampire Hunter | +1 Mult per Boss Blind defeated this run (max +30) | none |
| 96 | Hauser | U | Vampire Hunter | +30 Chips per Boss Blind defeated this run (max +300) | none |
| 97 | Kahn Marley | C | Vampire Hunter | +6 Mult | none |
| 98 | Koyu | C | Vampire Hunter | +40 Chips | none |
| 99 | Lo Wen | C | Vampire Hunter | Earn $3 after each Boss Blind | none |
| 100 | Marlowe | C | Vampire Hunter | +1 discard per Boss Blind | none |
| 101 | Sierra Mikain | R | Mage, Vampire Hunter | X2 Mult in Boss Blinds. Runes you use are doubled | none |
| 102 | Jess | U | Mercenary | Skipping a Blind gives double rewards | none |
| 103 | Georg Prime | R | none | If exactly 1 card is played: retrigger it once and X5 Mult (assassin strikes twice) | none |
| 104 | Gantetsu | U | Brawler | +Chips equal to 4x the number of cards in your deck | none |
| 105 | Boris Wizen | U | none | X1.5 Mult on Two Pair | Ridley: X1.4 |
| 106 | Pico | C | Troupe | +15 Chips | Annallee trio |
| 107 | Alberto | C | Troupe | +4 Mult | Annallee trio |
| 108 | Jude | C | Craftsman | +30 Chips per Stone card in deck | none |
| 109 | Tessai | U | Craftsman | Upgrade level of your most played hand every 2 rounds | Viktor |
| 110 | Vincent | C | none | +4 Mult per scoring Diamond | Simone |
| 111 | Genshu | U | Craftsman | +2 Mult per level of your most played hand | none |
| 112 | Pesmerga | R | Highland, Swordsman | X1.5 Mult per Boss Blind defeated this run (max X3) | none |
| 113 | Mazus | R | none | X3 Mult. Only appears once you have recruited 100 Jokers in your Collection | none |

## Rarity distribution (current)

L: 5 (Luca unlockable). R: 12. U: 42. C: 54. Suggested shop weights: C 50, U 38, R 12. Legendaries come only from the True Rune consumable.
