import type { Card } from '../cards';
import type { RunCtx } from '../ctx';
import type { ScoreCtx } from '../scoring';
import type { Passives, RunState } from '../state';

type Params = Record<string, number>;

/** Behavior for a Bond or a Tag tier. Same shape as Joker hooks, without a JokerRef. */
export interface EffectBehavior {
  passive?(p: Passives, run: RunState, params: Params): void;
  retrigger?(c: ScoreCtx, params: Params, card: Card, playedIndex: number, scoringPos: number): number;
  onCardScored?(c: ScoreCtx, params: Params, card: Card, playedIndex: number, scoringPos: number): void;
  onHandScored?(c: ScoreCtx, params: Params): void;
  onRoundEnd?(r: RunCtx, params: Params): void;
  onBossDefeated?(r: RunCtx, params: Params): void;
}
