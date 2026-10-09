import { describe, expect, it } from 'vitest';
import { evaluateHand, handBase, HAND_INFO, HAND_ORDER, mostPlayedHand, newHandLevels, type HandType } from '../src/engine/hands';
import { c, cards, enh, roundRun, score } from './helpers';

const type = (codes: string) => evaluateHand(cards(codes)).type;

describe('hand detection', () => {
  const table: [string, HandType][] = [
    ['AS', 'high'],
    ['AS 7H 4C 9D 2S', 'high'],
    ['KS KH', 'pair'],
    ['KS KH 2C 7D 9S', 'pair'],
    ['KS KH 2C 2D 9S', 'twopair'],
    ['5S 5H 5C', 'three'],
    ['5S 5H 5C 2D 9S', 'three'],
    ['2S 3H 4C 5D 6S', 'straight'],
    ['10S JH QC KD AS', 'straight'],
    ['AS 2H 3C 4D 5S', 'straight'],
    ['2H 4H 6H 8H 10H', 'flush'],
    ['KS KH KC 2D 2S', 'fullhouse'],
    ['9S 9H 9C 9D', 'four'],
    ['9S 9H 9C 9D 2S', 'four'],
    ['5H 6H 7H 8H 9H', 'straightflush'],
    ['AH 2H 3H 4H 5H', 'straightflush'],
    ['AS AH AC AD AS', 'five'],
    ['KH KH KH 2H 2H', 'flushhouse'],
    ['AH AH AH AH AH', 'flushfive'],
  ];
  it.each(table)('%s is %s', (codes, t) => {
    expect(type(codes)).toBe(t);
  });

  it('covers every hand type', () => {
    expect(new Set(table.map((x) => x[1]))).toEqual(new Set(HAND_ORDER));
  });

  it('does not wrap straights around the Ace', () => {
    expect(type('QS KH AC 2D 3S')).toBe('high');
    expect(type('JS QH KC AD 2S')).toBe('high');
  });

  it('needs 5 cards for straights and flushes', () => {
    expect(type('2S 3H 4C 5D')).toBe('high');
    expect(type('2H 4H 6H 8H')).toBe('high');
  });

  it('lists the hands a hand contains', () => {
    const ev = evaluateHand(cards('KS KH KC 2D 2S'));
    expect(ev.contains).toEqual(['high', 'pair', 'twopair', 'three', 'fullhouse']);
    const sf = evaluateHand(cards('5H 6H 7H 8H 9H'));
    expect(sf.contains).toContain('straight');
    expect(sf.contains).toContain('flush');
  });
});

describe('scoring card selection', () => {
  const scoring = (codes: string) => evaluateHand(cards(codes)).scoring;
  it('high card scores only the highest card', () => {
    expect(scoring('7H AS 4C 9D 2S')).toEqual([1]);
  });
  it('pair scores only the pair', () => {
    expect(scoring('2C KS 7D KH 9S')).toEqual([1, 3]);
  });
  it('two pair scores both pairs', () => {
    expect(scoring('KS 2C KH 9S 2D')).toEqual([0, 1, 2, 4]);
  });
  it('three and four of a kind score only the group', () => {
    expect(scoring('5S 2D 5H 5C 9S')).toEqual([0, 2, 3]);
    expect(scoring('9S 9H 2S 9C 9D')).toEqual([0, 1, 3, 4]);
  });
  it('five-card hands score all cards', () => {
    expect(scoring('KS KH KC 2D 2S')).toEqual([0, 1, 2, 3, 4]);
    expect(scoring('2H 4H 6H 8H 10H')).toEqual([0, 1, 2, 3, 4]);
    expect(scoring('AS 2H 3C 4D 5S')).toEqual([0, 1, 2, 3, 4]);
  });
});

describe('Wild cards', () => {
  it('complete a flush', () => {
    const hand = [c('2H'), c('4H'), c('6H'), c('8H'), enh('10S', 'wild')];
    expect(evaluateHand(hand).type).toBe('flush');
  });
  it('complete a straight flush', () => {
    const hand = [c('5H'), c('6H'), enh('7C', 'wild'), c('8H'), c('9H')];
    expect(evaluateHand(hand).type).toBe('straightflush');
  });
  it('do not make a flush of mixed suits', () => {
    const hand = [c('2H'), c('4H'), c('6S'), c('8H'), enh('10S', 'wild')];
    expect(evaluateHand(hand).type).toBe('high');
  });
});

describe('Stone cards', () => {
  it('are ignored for detection and always score', () => {
    const hand = [c('KS'), enh('2D', 'stone'), c('KH')];
    const ev = evaluateHand(hand);
    expect(ev.type).toBe('pair');
    expect(ev.scoring).toEqual([0, 1, 2]);
  });
  it('have no suit (no flush with 4 suited cards and a Stone)', () => {
    const hand = [c('2H'), c('4H'), c('6H'), c('8H'), enh('10H', 'stone')];
    expect(evaluateHand(hand).type).toBe('high');
  });
  it('have no rank (do not complete a pair)', () => {
    const hand = [c('KS'), enh('KH', 'stone')];
    expect(evaluateHand(hand).type).toBe('high');
    expect(evaluateHand(hand).scoring).toEqual([0, 1]);
  });
  it('alone make a High Card where every Stone scores', () => {
    const hand = [enh('KS', 'stone'), enh('KH', 'stone')];
    const ev = evaluateHand(hand);
    expect(ev.type).toBe('high');
    expect(ev.scoring).toEqual([0, 1]);
  });
});

describe('debuffed cards', () => {
  it('still count for detection but give no chips (Seed debuffs Spades)', () => {
    const run = roundRun([], { bossId: 'seed' });
    const res = score(run, cards('AS AH'));
    expect(res.handType).toBe('pair');
    expect(res.chips).toBe(10 + 11);
    expect(res.total).toBe(42);
    expect(res.events.filter((e) => e.kind === 'debuffed')).toHaveLength(1);
  });
});

describe('hand levels', () => {
  it('level 1 equals the table base', () => {
    for (const h of HAND_ORDER) {
      expect(handBase(h, 1)).toEqual({ chips: HAND_INFO[h].chips, mult: HAND_INFO[h].mult });
    }
  });
  it('each level adds lchips and lmult', () => {
    expect(handBase('pair', 3)).toEqual({ chips: 10 + 2 * 15, mult: 2 + 2 * 1 });
    expect(handBase('flush', 2)).toEqual({ chips: 50, mult: 6 });
    expect(handBase('straightflush', 5)).toEqual({ chips: 100 + 4 * 40, mult: 8 + 4 * 4 });
  });
  it('level below 1 is clamped to level 1', () => {
    expect(handBase('pair', 0)).toEqual(handBase('pair', 1));
  });
  it('levels feed scoring', () => {
    const run = roundRun();
    run.handLevels.pair.level = 3;
    expect(score(run, cards('KS KH')).total).toBe((40 + 20) * 4);
  });
  it('mostPlayedHand prefers the stronger hand on ties', () => {
    const lv = newHandLevels();
    lv.pair.played = 3;
    lv.flush.played = 3;
    expect(mostPlayedHand(lv)).toBe('flush');
    lv.pair.played = 4;
    expect(mostPlayedHand(lv)).toBe('pair');
  });
});
