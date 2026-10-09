import { type Card, isStone } from './cards';

export type HandType =
  | 'high' | 'pair' | 'twopair' | 'three' | 'straight' | 'flush'
  | 'fullhouse' | 'four' | 'straightflush' | 'five' | 'flushhouse' | 'flushfive';

/** Weakest to strongest. */
export const HAND_ORDER: readonly HandType[] = [
  'high', 'pair', 'twopair', 'three', 'straight', 'flush',
  'fullhouse', 'four', 'straightflush', 'five', 'flushhouse', 'flushfive',
];

export interface HandInfo {
  name: string;
  chips: number;
  mult: number;
  lchips: number;
  lmult: number;
  /** Secret hands are hidden until played once. */
  secret: boolean;
}

export const HAND_INFO: Record<HandType, HandInfo> = {
  high: { name: 'High Card', chips: 5, mult: 1, lchips: 10, lmult: 1, secret: false },
  pair: { name: 'Pair', chips: 10, mult: 2, lchips: 15, lmult: 1, secret: false },
  twopair: { name: 'Two Pair', chips: 20, mult: 2, lchips: 20, lmult: 1, secret: false },
  three: { name: 'Three of a Kind', chips: 30, mult: 3, lchips: 20, lmult: 2, secret: false },
  straight: { name: 'Straight', chips: 30, mult: 4, lchips: 30, lmult: 3, secret: false },
  flush: { name: 'Flush', chips: 35, mult: 4, lchips: 15, lmult: 2, secret: false },
  fullhouse: { name: 'Full House', chips: 40, mult: 4, lchips: 25, lmult: 2, secret: false },
  four: { name: 'Four of a Kind', chips: 60, mult: 7, lchips: 30, lmult: 3, secret: false },
  straightflush: { name: 'Straight Flush', chips: 100, mult: 8, lchips: 40, lmult: 4, secret: false },
  five: { name: 'Five of a Kind', chips: 120, mult: 12, lchips: 35, lmult: 3, secret: true },
  flushhouse: { name: 'Flush House', chips: 140, mult: 14, lchips: 40, lmult: 4, secret: true },
  flushfive: { name: 'Flush Five', chips: 160, mult: 16, lchips: 50, lmult: 3, secret: true },
};

export interface HandLevel {
  level: number;
  played: number;
}
export type HandLevels = Record<HandType, HandLevel>;

export function newHandLevels(): HandLevels {
  const out = {} as HandLevels;
  for (const h of HAND_ORDER) out[h] = { level: 1, played: 0 };
  return out;
}

export function handBase(type: HandType, level: number): { chips: number; mult: number } {
  const i = HAND_INFO[type];
  const l = Math.max(1, level) - 1;
  return { chips: i.chips + i.lchips * l, mult: i.mult + i.lmult * l };
}

export function handRank(t: HandType): number {
  return HAND_ORDER.indexOf(t);
}

export interface HandEval {
  type: HandType;
  /** Indices into the played cards that score, in play order. */
  scoring: number[];
  /** Every hand type this hand contains (a Full House contains a Pair, etc.). */
  contains: HandType[];
}

const SUIT_LIST = ['S', 'H', 'C', 'D'] as const;

function isFlush(cards: Card[]): boolean {
  if (cards.length < 5) return false;
  return SUIT_LIST.some((s) => cards.every((c) => c.enh === 'wild' || c.suit === s));
}

function isStraight(ranks: number[]): boolean {
  if (ranks.length < 5) return false;
  const u = [...new Set(ranks)].sort((a, b) => a - b);
  if (u.length !== 5) return false;
  if (u[4] - u[0] === 4) return true;
  // Ace low: A 2 3 4 5
  return u[4] === 14 && u[0] === 2 && u[3] === 5;
}

/**
 * Detects the best poker hand. Stone cards have no rank or suit, are ignored for
 * detection and always score. Debuffed cards still count for detection.
 */
export function evaluateHand(cards: Card[]): HandEval {
  const idx = cards.map((_, i) => i);
  const normal = idx.filter((i) => !isStone(cards[i]));
  const stones = idx.filter((i) => isStone(cards[i]));
  const nc = normal.map((i) => cards[i]);

  const groups = new Map<number, number[]>();
  for (const i of normal) {
    const r = cards[i].rank;
    if (!groups.has(r)) groups.set(r, []);
    groups.get(r)!.push(i);
  }
  const sizes = [...groups.values()].map((g) => g.length).sort((a, b) => b - a);
  const flush = isFlush(nc);
  const straight = isStraight(nc.map((c) => c.rank));
  const top = sizes[0] ?? 0;
  const second = sizes[1] ?? 0;

  const has: Record<HandType, boolean> = {
    high: true,
    pair: top >= 2,
    twopair: top >= 2 && second >= 2,
    three: top >= 3,
    straight,
    flush,
    fullhouse: top >= 3 && second >= 2,
    four: top >= 4,
    straightflush: straight && flush,
    five: top >= 5,
    flushhouse: top >= 3 && second >= 2 && flush,
    flushfive: top >= 5 && flush,
  };
  const contains = HAND_ORDER.filter((h) => has[h]);
  const type = contains[contains.length - 1];

  let scoring: number[];
  const groupWith = (n: number) => [...groups.values()].filter((g) => g.length >= n);
  switch (type) {
    case 'four':
      scoring = groupWith(4)[0];
      break;
    case 'three':
      scoring = groupWith(3)[0];
      break;
    case 'twopair':
      scoring = groupWith(2).flat();
      break;
    case 'pair':
      scoring = groupWith(2)[0];
      break;
    case 'high': {
      if (normal.length === 0) {
        scoring = [];
      } else {
        let best = normal[0];
        for (const i of normal) if (cards[i].rank > cards[best].rank) best = i;
        scoring = [best];
      }
      break;
    }
    default:
      scoring = normal;
  }
  scoring = [...scoring, ...stones].sort((a, b) => a - b);
  return { type, scoring, contains };
}

/** The hand type with the most plays. Ties go to the stronger hand. */
export function mostPlayedHand(levels: HandLevels): HandType {
  let best: HandType = 'high';
  for (const h of HAND_ORDER) if (levels[h].played >= levels[best].played) best = h;
  return best;
}
