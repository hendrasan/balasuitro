// Runes (Tarot analog), Forging (Planet analog) and True Runes (Spectral analog).
// Behavior receives a RunCtx; this module has no runtime imports from ctx (avoids cycles).
import { type Card, type Enhancement, type Seal, type Suit, ENHANCEMENTS, SUITS } from './cards';
import { HAND_INFO, HAND_ORDER, type HandType } from './hands';
import type { RunCtx } from './ctx';
import type { ConsumableKind } from './state';

export interface ConsDef {
  id: string;
  kind: ConsumableKind;
  name: string;
  text: string;
  /** Selected cards required: [min, max]. */
  select?: [number, number];
  /** Needs a hand of cards (round or open pack) for random card effects. */
  needsHand?: boolean;
  hand?: HandType;
  /** Return an error string if it cannot be used now. */
  check?(r: RunCtx, targets: Card[]): string | null;
  use(r: RunCtx, targets: Card[]): void;
}

const enhance = (enh: Enhancement) => (r: RunCtx, t: Card[]) => {
  for (const c of t) c.enh = enh;
  r.log(`${t.length} card(s) became ${enh}`);
};
const toSuit = (s: Suit) => (r: RunCtx, t: Card[]) => {
  for (const c of t) c.suit = s;
  r.log(`${t.length} card(s) changed suit`);
};
const seal = (s: Seal) => (r: RunCtx, t: Card[]) => {
  for (const c of t) c.seal = s;
  r.log(`Added a ${s} seal`);
};

function randomEnhanced(r: RunCtx, ranks: number[]): Card {
  const enh = r.pick(ENHANCEMENTS.filter((e) => e !== 'stone'));
  return r.newCard(r.pick(ranks), r.pick(SUITS), { enh });
}

function destroyAndAdd(r: RunCtx, destroyN: number, ranks: number[], addN: number): void {
  const ids = r.shuffled(r.handIds()).slice(0, destroyN);
  r.destroyCards(ids);
  for (let i = 0; i < addN; i++) r.addCardToHand(randomEnhanced(r, ranks));
}

const RUNES: ConsDef[] = [
  {
    id: 'clone', kind: 'rune', name: 'Clone Rune',
    text: 'Create a copy of the last Rune or Forging card used this run (not Clone Rune)',
    check: (r) => {
      const last = r.run.stats.lastConsumable;
      if (!last || last === 'clone') return 'No Rune or Forging card used yet';
      return r.consumableRoom() > 0 ? null : 'No room for a consumable';
    },
    use: (r) => {
      const last = r.run.stats.lastConsumable;
      if (last && last !== 'clone') r.createConsumable(CONSUMABLES[last].kind, last);
    },
  },
  { id: 'fortune', kind: 'rune', name: 'Fortune Rune', text: 'Enhance up to 2 selected cards into Lucky cards', select: [1, 2], use: enhance('lucky') },
  {
    id: 'falcon', kind: 'rune', name: 'Falcon Rune', text: 'Create up to 2 random Forging cards (needs room)',
    use: (r) => {
      for (let i = 0; i < 2; i++) r.createConsumable('forging');
    },
  },
  { id: 'rage', kind: 'rune', name: 'Rage Rune', text: 'Enhance up to 2 selected cards into Mult cards', select: [1, 2], use: enhance('mult') },
  {
    id: 'wizard', kind: 'rune', name: 'Wizard Rune', text: 'Create up to 2 random Runes (needs room)',
    use: (r) => {
      for (let i = 0; i < 2; i++) r.createConsumable('rune', undefined, ['wizard']);
    },
  },
  { id: 'flowing', kind: 'rune', name: 'Flowing Rune', text: 'Enhance up to 2 selected cards into Bonus cards', select: [1, 2], use: enhance('bonus') },
  { id: 'chimera', kind: 'rune', name: 'Chimera Rune', text: 'Enhance 1 selected card into a Wild card', select: [1, 1], use: enhance('wild') },
  { id: 'shield', kind: 'rune', name: 'Shield Rune', text: 'Enhance 1 selected card into a Steel card', select: [1, 1], use: enhance('steel') },
  { id: 'mirror', kind: 'rune', name: 'Mirror Rune', text: 'Enhance 1 selected card into a Glass card', select: [1, 1], use: enhance('glass') },
  {
    id: 'turtle', kind: 'rune', name: 'Turtle Rune', text: 'Double your Potch (max +20)',
    use: (r) => r.earn(Math.max(0, Math.min(20, r.run.money)), 'Turtle Rune'),
  },
  {
    id: 'wind', kind: 'rune', name: 'Wind Rune', text: '1 in 4 chance to add Foil, Holographic or Polychrome to a random Joker',
    check: (r) => (r.run.jokers.some((j) => j.edition === 'none') ? null : 'No Joker without an edition'),
    use: (r) => {
      if (!r.chance(1, 4, false)) {
        r.log('Wind Rune: Nope!');
        return;
      }
      const j = r.pick(r.run.jokers.filter((x) => x.edition === 'none'));
      j.edition = r.pick(['foil', 'holo', 'poly'] as const);
      r.log(`Wind Rune: a Joker became ${j.edition}`);
    },
  },
  {
    id: 'boar', kind: 'rune', name: 'Boar Rune', text: 'Increase the rank of up to 2 selected cards by 1', select: [1, 2],
    use: (_r, t) => {
      for (const c of t) c.rank = c.rank === 14 ? 2 : c.rank + 1;
    },
  },
  { id: 'killer', kind: 'rune', name: 'Killer Rune', text: 'Destroy up to 2 selected cards', select: [1, 2], use: (r, t) => r.destroyCards(t.map((c) => c.id)) },
  {
    id: 'darkness', kind: 'rune', name: 'Darkness Rune', text: 'Select 2 cards: the left card becomes a copy of the right card', select: [2, 2],
    use: (_r, t) => {
      const [left, right] = t;
      if (!left || !right) return;
      left.rank = right.rank;
      left.suit = right.suit;
      left.enh = right.enh;
      left.edition = right.edition;
      left.seal = right.seal;
      left.bonusChips = right.bonusChips;
    },
  },
  {
    id: 'lion', kind: 'rune', name: 'Lion Rune', text: 'Gain the total sell value of your Jokers (max 50 Potch)',
    use: (r) => r.earn(Math.min(50, r.run.jokers.reduce((s, j) => s + r.sellValue(j), 0)), 'Lion Rune'),
  },
  { id: 'gilded', kind: 'rune', name: 'Gilded Rune', text: 'Enhance 1 selected card into a Gold card', select: [1, 1], use: enhance('gold') },
  { id: 'mother_earth', kind: 'rune', name: 'Mother Earth Rune', text: 'Enhance 1 selected card into a Stone card', select: [1, 1], use: enhance('stone') },
  { id: 'lightning', kind: 'rune', name: 'Lightning Rune', text: 'Convert up to 3 selected cards to Diamonds', select: [1, 3], use: toSuit('D') },
  { id: 'earth', kind: 'rune', name: 'Earth Rune', text: 'Convert up to 3 selected cards to Clubs', select: [1, 3], use: toSuit('C') },
  { id: 'fire', kind: 'rune', name: 'Fire Rune', text: 'Convert up to 3 selected cards to Hearts', select: [1, 3], use: toSuit('H') },
  { id: 'water', kind: 'rune', name: 'Water Rune', text: 'Convert up to 3 selected cards to Spades', select: [1, 3], use: toSuit('S') },
  {
    id: 'resurrection', kind: 'rune', name: 'Resurrection Rune', text: 'Create a random Joker (needs room)',
    check: (r) => (r.jokerRoom() > 0 ? null : 'No room for a Joker'),
    use: (r) => {
      r.createJoker();
    },
  },
];

const FORGE_NAMES: Record<HandType, string> = {
  high: 'Whetstone', pair: 'Twin Edge', twopair: 'Double Temper', three: 'Triple Fold', straight: 'Long Spear',
  flush: 'Rune Inlay', fullhouse: 'Fortress Plate', four: 'Quad Hammer', straightflush: 'Star Steel',
  five: 'Dragon Bone', flushhouse: 'Sindar Relic', flushfive: 'Legend Forging',
};

const FORGINGS: ConsDef[] = HAND_ORDER.map((h) => ({
  id: `forge_${h}`,
  kind: 'forging' as const,
  name: FORGE_NAMES[h],
  hand: h,
  text: `Level up ${HAND_INFO[h].name} (+${HAND_INFO[h].lmult} Mult, +${HAND_INFO[h].lchips} Chips)`,
  use: (r: RunCtx) => r.upgradeHand(h, 1, FORGE_NAMES[h]),
}));

const FACE = [11, 12, 13];
const NUMBERS = [2, 3, 4, 5, 6, 7, 8, 9, 10];

const TRUE_RUNES: ConsDef[] = [
  {
    id: 'beginning', kind: 'true', name: 'Rune of Beginning', text: 'Create a Legendary Joker (needs room)',
    check: (r) => (r.jokerRoom() > 0 ? null : 'No room for a Joker'),
    use: (r) => {
      r.createJoker('L');
    },
  },
  {
    id: 'beast', kind: 'true', name: 'Beast Rune', text: 'Create a random Rare Joker. Set your Potch to 0',
    check: (r) => (r.jokerRoom() > 0 ? null : 'No room for a Joker'),
    use: (r) => {
      r.createJoker('R');
      r.setMoney(0);
    },
  },
  {
    id: 'black_sword', kind: 'true', name: 'Black Sword Rune', text: 'Add Polychrome to a random Joker. Destroy all other Jokers',
    check: (r) => (r.run.jokers.some((j) => j.edition === 'none') ? null : 'No Joker without an edition'),
    use: (r) => {
      const keep = r.pick(r.run.jokers.filter((j) => j.edition === 'none'));
      keep.edition = 'poly';
      for (const j of [...r.run.jokers]) if (j.uid !== keep.uid) r.destroyJoker(j.uid, 'Black Sword Rune');
    },
  },
  {
    id: 'bright_shield', kind: 'true', name: 'Bright Shield Rune', text: 'Add Negative to a random Joker. -1 hand size',
    check: (r) => (r.run.jokers.some((j) => j.edition === 'none') ? null : 'No Joker without an edition'),
    use: (r) => {
      const j = r.pick(r.run.jokers.filter((x) => x.edition === 'none'));
      j.edition = 'negative';
      r.run.permHandSize -= 1;
    },
  },
  {
    id: 'night', kind: 'true', name: 'Night Rune', text: 'Destroy 1 random card in hand. Add 3 random enhanced Face cards to your hand',
    needsHand: true, use: (r) => destroyAndAdd(r, 1, FACE, 3),
  },
  {
    id: 'soul_eater', kind: 'true', name: 'Soul Eater', text: 'Destroy 1 random card in hand. Add 2 random enhanced Aces to your hand',
    needsHand: true, use: (r) => destroyAndAdd(r, 1, [14], 2),
  },
  {
    id: 'gate', kind: 'true', name: 'Gate Rune', text: 'Destroy 1 random card in hand. Add 4 random enhanced numbered cards to your hand',
    needsHand: true, use: (r) => destroyAndAdd(r, 1, NUMBERS, 4),
  },
  { id: 'sovereign', kind: 'true', name: 'Sovereign Rune', text: 'Add a Gold Seal to 1 selected card', select: [1, 1], use: seal('gold') },
  { id: 'punishment', kind: 'true', name: 'Rune of Punishment', text: 'Add a Red Seal to 1 selected card', select: [1, 1], use: seal('red') },
  { id: 'blue_moon', kind: 'true', name: 'Blue Moon Rune', text: 'Add a Blue Seal to 1 selected card', select: [1, 1], use: seal('blue') },
  { id: 'dragon', kind: 'true', name: 'Dragon Rune', text: 'Add a Purple Seal to 1 selected card', select: [1, 1], use: seal('purple') },
  {
    id: 'eightfold', kind: 'true', name: 'Eightfold Rune', text: 'Destroy 5 random cards in hand. Gain 20 Potch',
    needsHand: true,
    use: (r) => {
      r.destroyCards(r.shuffled(r.handIds()).slice(0, 5));
      r.earn(20, 'Eightfold Rune');
    },
  },
];

export const CONSUMABLE_LIST: ConsDef[] = [...RUNES, ...FORGINGS, ...TRUE_RUNES];
export const CONSUMABLES: Record<string, ConsDef> = Object.fromEntries(CONSUMABLE_LIST.map((c) => [c.id, c]));
