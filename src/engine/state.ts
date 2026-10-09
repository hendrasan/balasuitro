// Shared state types. Type-only module: no runtime code depends on import order here.
import type { Card, Edition } from './cards';
import type { HandLevels, HandType } from './hands';
import type { Rng } from './rng';

export type Rarity = 'C' | 'U' | 'R' | 'L';

export interface JokerInstance {
  uid: number;
  id: string;
  edition: Edition;
  /** Extra sell value (Lebrante). */
  sellBonus: number;
  /** Per-Joker run counters. Kept here (not on the def) so they serialize. */
  state: Record<string, number>;
}

export type ConsumableKind = 'rune' | 'forging' | 'true' | 'food';
export interface Consumable {
  uid: number;
  id: string;
}

/** Built at run start. Phase 1 fills defaults; Phase 2 (Castle) fills it from the profile. */
export interface RunModifiers {
  startMoney: number;
  extraHands: number;
  extraDiscards: number;
  extraHandSize: number;
  extraJokerSlots: number;
  extraConsumableSlots: number;
  extraShopSlots: number;
  shopDiscountPct: number;
  rarityWeights: { C: number; U: number; R: number } | null;
  startingVouchers: string[];
  // Castle facilities
  rerollMinus: number;
  previewCount: number;
  /** How many Chapters ahead the Boss is shown. */
  bossLookahead: number;
  foodPerBlind: number;
  skipToShop: boolean;
}

export function defaultModifiers(): RunModifiers {
  return {
    startMoney: 0,
    extraHands: 0,
    extraDiscards: 0,
    extraHandSize: 0,
    extraJokerSlots: 0,
    extraConsumableSlots: 0,
    extraShopSlots: 0,
    shopDiscountPct: 0,
    rarityWeights: null,
    startingVouchers: [],
    rerollMinus: 0,
    previewCount: 0,
    bossLookahead: 0,
    foodPerBlind: 0,
    skipToShop: false,
  };
}

/** Values computed from config, modifiers, vouchers, Jokers, Bonds and Tags. */
export interface Passives {
  hands: number;
  discards: number;
  handSize: number;
  jokerSlots: number;
  consumableSlots: number;
  shopSlots: number;
  previewCount: number;
  bossLookahead: number;
  shopDiscountPct: number;
  jokerPriceMinus: number;
  rerollMinus: number;
  interestPer: number;
  interestCap: number;
  bossRerolls: number;
  revealBosses: boolean;
  editionRate: number;
  runeWeight: number;
  forgingWeight: number;
}

export type Phase = 'blind' | 'round' | 'cashout' | 'shop' | 'pack' | 'gameover' | 'victory';

export interface RoundState {
  blindIndex: number;
  bossId: string | null;
  handsLeft: number;
  discardsLeft: number;
  /** Temporary hand size bonus for this round (Juggle spoil). */
  handSizeBonus: number;
  handsPlayed: number;
  discardsUsed: number;
  cardsDiscarded: number;
  handTypes: HandType[];
  debuffedJokerUid: number | null;
}

export interface CashoutLine {
  label: string;
  amount: number;
}

export interface Cashout {
  lines: CashoutLine[];
  total: number;
  bossBeaten: boolean;
}

export type ShopItem =
  | { kind: 'joker'; joker: JokerInstance; free?: boolean }
  | { kind: 'cons'; cons: Consumable; free?: boolean };

export type PackType = 'rune' | 'forging' | 'true' | 'star' | 'standard';
export type PackSize = 'normal' | 'jumbo' | 'mega';
export interface PackOffer {
  type: PackType;
  size: PackSize;
  free?: boolean;
}

export interface ShopState {
  cards: (ShopItem | null)[];
  packs: (PackOffer | null)[];
  rerollCost: number;
  freeRerolls: number;
  boughtAny: boolean;
}

export type PackChoice =
  | { kind: 'joker'; joker: JokerInstance }
  | { kind: 'cons'; cons: Consumable }
  | { kind: 'card'; card: Card };

export interface PackState {
  type: PackType;
  size: PackSize;
  choices: (PackChoice | null)[];
  picksLeft: number;
  /** Card ids dealt from the deck so Runes in the pack can target cards. */
  hand: number[];
}

export interface PendingShop {
  freeJokers: ('U' | 'R')[];
  freeEditions: number;
  coupon: boolean;
  freeRerolls: number;
  freePacks: number;
}

export interface RunStats {
  handsPlayed: number;
  discardsUsed: number;
  unusedDiscards: number;
  rerolls: number;
  runesUsed: number;
  bossesDefeated: number;
  blindsSkipped: number;
  roundsWon: number;
  bestHand: number;
  lastHandType: HandType | null;
  lastConsumable: string | null;
}

export interface AnteState {
  skipped: boolean;
  roundsPlayed: number;
  shinUsed: boolean;
  vikiUsed: boolean;
  bossRerollsUsed: number;
  /** Spoil (skip reward) offered for the Duel and the Unit Battle of this ante. */
  spoils: [string, string];
}

export type ScoreEventKind = 'base' | 'chips' | 'mult' | 'xmult' | 'money' | 'retrigger' | 'debuffed' | 'msg' | 'blocked';

export interface ScoreEvent {
  source: string;
  kind: ScoreEventKind;
  value: number;
  text?: string;
  /** Index into the played cards. */
  cardIndex?: number;
  /** Index into the held cards. */
  heldIndex?: number;
  jokerUid?: number;
  bondId?: string;
  tagId?: string;
  /** Running totals after this event. */
  chips: number;
  mult: number;
}

export interface ScoreResult {
  handType: HandType;
  playedIds: number[];
  heldIds: number[];
  scoring: number[];
  events: ScoreEvent[];
  chips: number;
  mult: number;
  total: number;
  money: number;
  blocked: boolean;
  destroyedIds: number[];
}

export interface RunState {
  seed: string;
  rng: Rng;
  nextId: number;
  phase: Phase;
  ante: number;
  blindIndex: number;
  endless: boolean;
  won: boolean;
  money: number;

  deck: Card[];
  drawPile: number[];
  hand: number[];
  discardPile: number[];

  jokers: JokerInstance[];
  consumables: Consumable[];
  handLevels: HandLevels;
  vouchers: string[];

  /** Boss id per ante (key = ante number as string for JSON safety). */
  bosses: Record<string, string>;
  anteState: AnteState;
  anteVoucher: string | null;

  roundScore: number;
  target: number;
  round: RoundState | null;
  cashout: Cashout | null;
  shop: ShopState | null;
  lastShop: ShopState | null;
  pack: PackState | null;
  pendingShop: PendingShop;

  /** Temporary bonuses for the next round only. */
  nextRound: { hands: number; handSize: number };
  /** Food bonuses waiting for the next hand played. */
  nextHand: { chips: number; mult: number };
  /** Potch paid out after the next boss (Investment spoil). */
  investment: number;
  /** Permanent run changes (Bright Shield Rune: -1 hand size). */
  permHandSize: number;

  stats: RunStats;
  modifiers: RunModifiers;
  /** Copy of the profile collection, updated during the run. The store merges it back. */
  discovered: { seen: string[]; owned: string[] };
  unlocked: string[];

  /**
   * Counters that reset when a blind is selected. A "round" for per-round caps runs from
   * one blind selection to the next, so it includes the shop after the blind.
   * Keys: 'gamblerReroll', 'mageDup', 'runes', 'tag:mercenary', 'meg:<uid>', 'lorelai:<uid>'.
   */
  cycle: Record<string, number>;

  lastScore: ScoreResult | null;
  log: string[];
  /** Total log lines ever written (the log itself is capped). */
  logCount: number;
}
