import { type Card, type Edition, type Enhancement, type Seal, type Suit, newCard } from '../src/engine/cards';
import { applyAction, newRun, type Action } from '../src/engine/run';
import { computeScore } from '../src/engine/scoring';
import type { JokerInstance, RunState, ScoreResult } from '../src/engine/state';

export const EMPTY_PROFILE = { owned: [], seen: [], unlocked: [] };

export function freshRun(seed = 'TEST'): RunState {
  return newRun(seed, { owned: [], seen: [], unlocked: [] });
}

let cid = 10_000;
/** c('AH'), c('10S'), c('KD', {enh: 'glass'}) */
export function c(code: string, extra: Partial<Card> = {}): Card {
  const m = code.match(/^(10|[2-9JQKA])([SHCD])$/);
  if (!m) throw new Error('bad card ' + code);
  const map: Record<string, number> = { J: 11, Q: 12, K: 13, A: 14 };
  const rank = map[m[1]] ?? Number(m[1]);
  return newCard(cid++, rank, m[2] as Suit, extra);
}

export function cards(codes: string): Card[] {
  return codes.trim().split(/\s+/).map((x) => c(x));
}

export const enh = (code: string, e: Enhancement) => c(code, { enh: e });
export const ed = (code: string, e: Edition) => c(code, { edition: e });
export const sealed = (code: string, s: Seal) => c(code, { seal: s });

let uid = 50_000;
export function joker(id: string, extra: Partial<JokerInstance> = {}): JokerInstance {
  return { uid: uid++, id, edition: 'none', sellBonus: 0, state: {}, ...extra };
}

/**
 * A run in the middle of a normal round (blind 0) with the given Jokers.
 * handsLeft is the value seen during scoring (after the current hand is used).
 */
export function roundRun(jokers: (string | JokerInstance)[] = [], opts: { handsLeft?: number; handsPlayed?: number; bossId?: string | null; discardsLeft?: number } = {}): RunState {
  const run = freshRun();
  run.jokers = jokers.map((j) => (typeof j === 'string' ? joker(j) : j));
  run.phase = 'round';
  run.round = {
    blindIndex: opts.bossId ? 2 : 0,
    bossId: opts.bossId ?? null,
    handsLeft: opts.handsLeft ?? 3,
    discardsLeft: opts.discardsLeft ?? 3,
    handSizeBonus: 0,
    handsPlayed: opts.handsPlayed ?? 1,
    discardsUsed: 0,
    cardsDiscarded: 0,
    handTypes: [],
    debuffedJokerUid: null,
  };
  return run;
}

/** Score `played` with `held` in hand, using the run as it is. */
export function score(run: RunState, played: Card[], held: Card[] = []): ScoreResult {
  run.deck.push(...played, ...held);
  return computeScore(run, played, held);
}

/** Score with a fresh round run and these Jokers. */
export function scoreWith(jokers: (string | JokerInstance)[], played: string | Card[], held: Card[] = [], opts = {}): ScoreResult {
  const run = roundRun(jokers, opts);
  return score(run, typeof played === 'string' ? cards(played) : played, held);
}

export function act(run: RunState, a: Action): void {
  const r = applyAction(run, a);
  if (!r.ok) throw new Error(`${a.type}: ${r.error}`);
}
