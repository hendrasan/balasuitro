import { describe, expect, it } from 'vitest';
import { act, freshRun, scoreWith } from './helpers';

describe('smoke', () => {
  it('scores a pair with no jokers', () => {
    // Pair: 10 chips x 2 mult. Two Kings: +10 +10 chips -> 30 x 2 = 60
    expect(scoreWith([], 'KS KH').total).toBe(60);
  });

  it('plays a round', () => {
    const run = freshRun('SMOKE');
    act(run, { type: 'selectBlind' });
    expect(run.hand.length).toBe(8);
    act(run, { type: 'play', cardIds: run.hand.slice(0, 5) });
    expect(run.round?.handsLeft).toBe(3);
  });
});
