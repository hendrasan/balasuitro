// All tunable game numbers. Balatro white-stake baseline.
export const CONFIG = {
  startMoney: 4,
  handSize: 8,
  hands: 4,
  discards: 3,
  jokerSlots: 5,
  consumableSlots: 2,
  shopCardSlots: 2,
  shopPackSlots: 2,
  maxSelect: 5,

  // Economy ($ = Potch)
  interestPer: 5, // $1 per $5 held
  interestCap: 5, // max interest earned per round
  payoutPerHand: 1,
  blindRewards: [3, 4, 5] as const, // Duel, Unit Battle, Boss
  rerollBase: 5,
  rerollStep: 1,
  sellFraction: 0.5,

  // Blind targets. Index 0 = Ante 1. Small blind base; big = x1.5, boss = x2 (boss data can override).
  anteBase: [300, 800, 2000, 5000, 11000, 20000, 35000, 50000],
  blindMults: [1, 1.5, 2] as const,
  finalAnte: 8,
  lucaAntes: [4, 6],

  // Shop
  rarityWeights: { C: 50, U: 38, R: 12 } as Record<'C' | 'U' | 'R', number>,
  shopCardWeights: { joker: 20, rune: 4, forging: 4 },
  editionCost: { none: 0, foil: 2, holo: 3, poly: 5, negative: 5 },
  jokerEditionOdds: { foil: 0.02, holo: 0.014, poly: 0.003, negative: 0.003 },
  consumableCost: { rune: 3, forging: 3, true: 4 },
  packCost: { normal: 4, jumbo: 6, mega: 8 },
  voucherCost: 10,
  soulChance: 0.003, // chance a Rune / True Rune pack slot becomes the Rune of Beginning

  // Cards
  glassBreakDen: 4,
  luckyMultDen: 5,
  luckyMoneyDen: 15,

  // Tags: do Jowy's copies count toward tag totals? See docs/decisions.md.
  copiesCountForTags: false,
  logSize: 40,
};

export type Config = typeof CONFIG;
