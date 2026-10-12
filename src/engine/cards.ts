export type Suit = 'S' | 'H' | 'C' | 'D';
export const SUITS: readonly Suit[] = ['S', 'H', 'C', 'D'];
export const SUIT_NAMES: Record<Suit, string> = { S: 'Spades', H: 'Hearts', C: 'Clubs', D: 'Diamonds' };
export const SUIT_SYMBOLS: Record<Suit, string> = { S: '♠', H: '♥', C: '♣', D: '♦' };

/** 2..10, 11 = Jack, 12 = Queen, 13 = King, 14 = Ace */
export type Rank = number;
export const RANKS: readonly Rank[] = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14];

export type Enhancement = 'none' | 'bonus' | 'mult' | 'wild' | 'glass' | 'steel' | 'stone' | 'gold' | 'lucky';
export const ENHANCEMENTS: readonly Enhancement[] = ['bonus', 'mult', 'wild', 'glass', 'steel', 'stone', 'gold', 'lucky'];
export type Edition = 'none' | 'foil' | 'holo' | 'poly' | 'negative';
export type Seal = 'none' | 'gold' | 'red' | 'blue' | 'purple';
export const SEALS: readonly Seal[] = ['gold', 'red', 'blue', 'purple'];

export interface Card {
  id: number;
  rank: Rank;
  suit: Suit;
  enh: Enhancement;
  edition: Edition;
  seal: Seal;
  /** Permanent extra chips (Tuta, Craftsman tag). */
  bonusChips: number;
}

export const ENH_TEXT: Record<Enhancement, string> = {
  none: '',
  bonus: 'Bonus: +30 Chips when scored',
  mult: 'Mult: +4 Mult when scored',
  wild: 'Wild: counts as every suit',
  glass: 'Glass: X2 Mult when scored; 1 in 4 chance to break (destroyed)',
  steel: 'Steel: X1.5 Mult while this card stays in your hand (not played)',
  stone: 'Stone: +50 Chips; no rank or suit; always scores',
  gold: 'Gold: +3 Potch if this card is in your hand at the end of the round',
  lucky: 'Lucky: when scored, 1 in 5 for +20 Mult and 1 in 15 for +20 Potch',
};
export const EDITION_TEXT: Record<Edition, string> = {
  none: '',
  foil: 'Foil: +50 Chips',
  holo: 'Holographic: +10 Mult',
  poly: 'Polychrome: X1.5 Mult',
  negative: 'Negative: +1 Joker slot',
};
export const SEAL_TEXT: Record<Seal, string> = {
  none: '',
  gold: 'Gold Seal: +3 Potch when scored',
  red: 'Red Seal: this card triggers twice (scored or held)',
  blue: 'Blue Seal: if held at the end of the round, creates a Forging card for your last hand type',
  purple: 'Purple Seal: creates a Rune when discarded',
};

export function isStone(c: Card): boolean {
  return c.enh === 'stone';
}

export function rankChips(c: Card): number {
  if (isStone(c)) return 50;
  if (c.rank <= 10) return c.rank;
  if (c.rank === 14) return 11;
  return 10;
}

export function isFace(c: Card): boolean {
  return !isStone(c) && c.rank >= 11 && c.rank <= 13;
}

export function isRank(c: Card, r: Rank): boolean {
  return !isStone(c) && c.rank === r;
}

/** Wild cards match every suit. Stone cards match none. */
export function isSuit(c: Card, s: Suit): boolean {
  if (isStone(c)) return false;
  return c.enh === 'wild' || c.suit === s;
}

export function isRed(c: Card): boolean {
  return isSuit(c, 'H') || isSuit(c, 'D');
}

export function rankLabel(r: Rank): string {
  return r <= 10 ? String(r) : ({ 11: 'J', 12: 'Q', 13: 'K', 14: 'A' } as Record<number, string>)[r];
}

export function rankName(r: Rank): string {
  return r <= 10 ? String(r) : ({ 11: 'Jack', 12: 'Queen', 13: 'King', 14: 'Ace' } as Record<number, string>)[r];
}

export function cardLabel(c: Card): string {
  if (isStone(c)) return 'Stone';
  return rankLabel(c.rank) + SUIT_SYMBOLS[c.suit];
}

export function newCard(id: number, rank: Rank, suit: Suit, extra: Partial<Card> = {}): Card {
  return { id, rank, suit, enh: 'none', edition: 'none', seal: 'none', bonusChips: 0, ...extra };
}

export function standardDeck(startId: number): Card[] {
  const out: Card[] = [];
  let id = startId;
  for (const s of SUITS) for (const r of RANKS) out.push(newCard(id++, r, s));
  return out;
}
