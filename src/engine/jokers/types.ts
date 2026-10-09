import type { Card } from '../cards';
import type { HandType } from '../hands';
import type { JokerData } from '../data';
import type { Consumable, JokerInstance, Passives, RunState } from '../state';
import type { RunCtx } from '../ctx';
import type { ScoreCtx } from '../scoring';

/**
 * A Joker as seen by a hook. For Jowy's copy, `inst`/`data`/`p` belong to the copied
 * Joker, `slot` is Jowy, and `isCopy` is true. Hooks must not change counters when
 * `isCopy` is true (the copy gives the effect, not the growth).
 */
export interface JokerRef {
  inst: JokerInstance;
  data: JokerData;
  p: Record<string, number>;
  /** Beast effect multiplier (Beast tag tier 2, Badeaux). 1 for non-Beast Jokers. */
  scale: number;
  isCopy: boolean;
  slot: JokerInstance;
  index: number;
}

export interface HandFinishedInfo {
  won: boolean;
  final: boolean;
  handType: HandType;
}

export interface JokerBehavior {
  /** Static modifiers. Not copied by Jowy. */
  passive?(p: Passives, run: RunState, j: JokerRef): void;
  /** Called when a blind is selected and the round starts. */
  onRoundStart?(r: RunCtx, j: JokerRef): void;
  /** Extra retriggers for a scoring card. `playedIndex` is the index in the played hand. */
  retrigger?(c: ScoreCtx, j: JokerRef, card: Card, playedIndex: number, scoringPos: number): number;
  onCardScored?(c: ScoreCtx, j: JokerRef, card: Card, playedIndex: number, scoringPos: number): void;
  onHeld?(c: ScoreCtx, j: JokerRef, card: Card, heldIndex: number): void;
  onHandScored?(c: ScoreCtx, j: JokerRef): void;
  onHandFinished?(r: RunCtx, j: JokerRef, info: HandFinishedInfo): void;
  onDiscard?(r: RunCtx, j: JokerRef, cards: Card[]): void;
  onRoundEnd?(r: RunCtx, j: JokerRef): void;
  onBossDefeated?(r: RunCtx, j: JokerRef): void;
  onShopEnter?(r: RunCtx, j: JokerRef): void;
  onShopExit?(r: RunCtx, j: JokerRef, bought: boolean): void;
  onReroll?(r: RunCtx, j: JokerRef): void;
  /** Another Joker was sold. */
  onSell?(r: RunCtx, j: JokerRef, sold: JokerInstance): void;
  onConsumableUsed?(r: RunCtx, j: JokerRef, cons: Consumable, kind: string): void;
  onBlindSkipped?(r: RunCtx, j: JokerRef): void;
}

export type BehaviorMap = Record<string, JokerBehavior>;

/** Scale an additive value by the Beast multiplier. */
export function sc(j: JokerRef, v: number): number {
  return v * j.scale;
}

/** Scale the bonus part of an X Mult value by the Beast multiplier: X1.8 at +25% = X2.0. */
export function sx(j: JokerRef, x: number): number {
  return 1 + (x - 1) * j.scale;
}
