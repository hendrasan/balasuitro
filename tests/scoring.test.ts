import { describe, expect, it } from 'vitest';
import { computeScore } from '../src/engine/scoring';
import { next } from '../src/engine/rng';
import type { ScoreResult } from '../src/engine/state';
import { act, c, cards, ed, enh, freshRun, joker, roundRun, score, scoreWith, sealed } from './helpers';

/** The event list ends at the result's chips/mult, and total = floor(chips * mult). */
function check(res: ScoreResult): ScoreResult {
  const last = res.events[res.events.length - 1];
  expect(last.chips).toBe(res.chips);
  expect(last.mult).toBe(res.mult);
  if (!res.blocked) expect(res.total).toBe(Math.floor(res.chips * res.mult));
  return res;
}

const total = (jokers: Parameters<typeof scoreWith>[0], played: Parameters<typeof scoreWith>[1], held: Parameters<typeof scoreWith>[2] = [], opts = {}) =>
  check(scoreWith(jokers, played, held, opts)).total;

describe('plain hands', () => {
  const table: [string, number][] = [
    ['AS', (5 + 11) * 1],
    ['KS KH', (10 + 20) * 2],
    ['KS KH 2C 2D 7S', (20 + 24) * 2],
    ['5S 5H 5C', (30 + 15) * 3],
    ['2S 3H 4C 5D 6S', (30 + 20) * 4],
    ['AS 2H 3C 4D 5S', (30 + 25) * 4],
    ['2H 4H 6H 8H 10H', (35 + 30) * 4],
    ['KS KH KC 2D 2S', (40 + 34) * 4],
    ['9S 9H 9C 9D 2S', (60 + 36) * 7],
    ['5H 6H 7H 8H 9H', (100 + 35) * 8],
    ['AS AH AC AD AS', (120 + 55) * 12],
    ['KH KH KH 2H 2H', (140 + 34) * 14],
    ['AH AH AH AH AH', (160 + 55) * 16],
  ];
  it.each(table)('%s scores %i', (codes, expected) => {
    expect(total([], codes)).toBe(expected);
  });

  it('starts with a base event at the hand level', () => {
    const res = scoreWith([], 'KS KH');
    expect(res.events[0]).toMatchObject({ kind: 'base', chips: 10, mult: 2 });
  });
});

describe('enhancements', () => {
  it('Bonus: +30 chips', () => {
    expect(total([], [c('KS'), enh('KH', 'bonus')])).toBe((30 + 30) * 2);
  });
  it('Mult: +4 mult', () => {
    expect(total([], [c('KS'), enh('KH', 'mult')])).toBe(30 * 6);
  });
  it('Glass: X2 mult', () => {
    expect(total([], [c('KS'), enh('KH', 'glass')])).toBe(30 * 4);
  });
  it('Steel: X1.5 mult while held, not when played', () => {
    expect(total([], 'KS KH', [enh('2C', 'steel')])).toBe(30 * 3);
    expect(total([], 'KS KH', [enh('2C', 'steel'), enh('3C', 'steel')])).toBe(Math.floor(30 * 2 * 1.5 * 1.5));
    expect(total([], [c('KS'), enh('KH', 'steel')])).toBe(60);
  });
  it('Steel with a red seal triggers twice', () => {
    expect(total([], 'KS KH', [c('2C', { enh: 'steel', seal: 'red' })])).toBe(Math.floor(30 * 2 * 1.5 * 1.5));
  });
  it('Stone: +50 chips and always scores', () => {
    expect(total([], [c('KS'), c('KH'), enh('2D', 'stone')])).toBe((10 + 20 + 50) * 2);
    expect(total([], [c('AS'), enh('2D', 'stone')])).toBe(5 + 11 + 50);
  });
  it('Lucky: uses the seeded RNG (1 in 5 for +20 Mult, 1 in 15 for +20 Potch)', () => {
    let hits = 0;
    let misses = 0;
    for (let i = 0; i < 60; i++) {
      const run = roundRun();
      run.rng = { s: 1000 + i * 7919 };
      const probe = { ...run.rng };
      const multHit = next(probe) < 1 / 5;
      const moneyHit = next(probe) < 1 / 15;
      const res = check(score(run, [c('KS'), enh('KH', 'lucky')]));
      expect(res.total).toBe(30 * (2 + (multHit ? 20 : 0)));
      expect(res.money).toBe(moneyHit ? 20 : 0);
      expect(run.rng).toEqual(probe);
      if (multHit) hits++;
      else misses++;
    }
    expect(hits).toBeGreaterThan(0);
    expect(misses).toBeGreaterThan(0);
  });
  it('Glass breaks with the seeded RNG (1 in 4)', () => {
    let broke = 0;
    for (let i = 0; i < 40; i++) {
      const run = roundRun();
      run.rng = { s: 77 + i * 104729 };
      const probe = { ...run.rng };
      const breaks = next(probe) < 1 / 4;
      const glass = enh('KH', 'glass');
      const res = score(run, [c('KS'), glass]);
      expect(res.destroyedIds).toEqual(breaks ? [glass.id] : []);
      if (breaks) broke++;
    }
    expect(broke).toBeGreaterThan(0);
  });
});

describe('card editions', () => {
  it('Foil +50 chips, Holo +10 mult, Polychrome X1.5', () => {
    expect(total([], [c('KS'), ed('KH', 'foil')])).toBe(80 * 2);
    expect(total([], [c('KS'), ed('KH', 'holo')])).toBe(30 * 12);
    expect(total([], [c('KS'), ed('KH', 'poly')])).toBe(30 * 3);
  });
  it('apply after the enhancement on the same card', () => {
    // Mult card then Polychrome: (2 + 4) * 1.5 = 9
    expect(total([], [c('KS'), c('KH', { enh: 'mult', edition: 'poly' })])).toBe(30 * 9);
  });
});

describe('Joker editions', () => {
  it('Holo applies before the Joker effect (X1.5 Valeria)', () => {
    const v = joker('valeria', { edition: 'holo' });
    // (2 + 10) * 1.5 = 18
    const res = check(scoreWith([v], 'KS KH'));
    expect(res.total).toBe(30 * 18);
    const evs = res.events.filter((e) => e.jokerUid === v.uid).map((e) => e.kind);
    expect(evs).toEqual(['mult', 'xmult']);
  });
  it('Polychrome applies after the Joker effect (+10 Killey)', () => {
    const k = joker('killey', { edition: 'poly' });
    // (2 + 10) * 1.5 = 18
    const res = check(scoreWith([k], 'KS KH'));
    expect(res.total).toBe(30 * 18);
    const evs = res.events.filter((e) => e.jokerUid === k.uid).map((e) => [e.kind, e.value]);
    expect(evs).toEqual([['mult', 10], ['xmult', 1.5]]);
  });
  it('Foil adds 50 chips', () => {
    expect(total([joker('chaco', { edition: 'foil' })], 'KS KH')).toBe((30 + 50 + 20) * 2);
  });
  it('Jokers apply left to right', () => {
    // killey (+10) then valeria (X1.5): (2+10)*1.5 = 18; reversed: 2*1.5+10 = 13
    expect(total(['killey', 'valeria'], 'KS KH')).toBe(30 * 18);
    expect(total(['valeria', 'killey'], 'KS KH')).toBe(30 * 13);
  });
});

describe('seals', () => {
  it('Red seal retriggers the card', () => {
    expect(total([], [c('KS'), sealed('KH', 'red')])).toBe(40 * 2);
  });
  it('Gold seal earns 3 Potch when scored', () => {
    const res = check(scoreWith([], [c('KS'), sealed('KH', 'gold')]));
    expect(res.money).toBe(3);
    expect(res.total).toBe(60);
  });
  it('a retriggered Gold seal earns twice', () => {
    const res = check(scoreWith(['mondo'], [sealed('KS', 'gold'), c('KH')]));
    expect(res.money).toBe(6);
  });
  it('Gold seal on a card that does not score earns nothing', () => {
    expect(scoreWith([], [c('KS'), c('KH'), sealed('2D', 'gold')]).money).toBe(0);
  });
});

describe('retrigger ordering', () => {
  it('runs the full card step again, including Joker per-card hooks', () => {
    // Barbara: +4 Mult per scoring Heart. KH with red seal + Mult enhancement.
    const res = check(scoreWith(['barbara'], [c('KS'), c('KH', { seal: 'red', enh: 'mult' })]));
    // chips 10 + 10 + 10 + 10 = 40; mult 2 + (4 + 4) * 2 = 18
    expect(res.chips).toBe(40);
    expect(res.mult).toBe(18);
    expect(res.total).toBe(720);
    const seq = res.events.filter((e) => e.cardIndex === 1).map((e) => `${e.kind}:${e.source}`);
    expect(seq).toEqual([
      'chips:Card', 'mult:Card', 'mult:Barbara',
      'retrigger:Card',
      'chips:Card', 'mult:Card', 'mult:Barbara',
    ]);
  });
  it('cards score left to right', () => {
    const res = scoreWith([], [c('KS'), c('KH')]);
    const idx = res.events.filter((e) => e.kind === 'chips').map((e) => e.cardIndex);
    expect(idx).toEqual([0, 1]);
  });
});

describe('boss debuffs', () => {
  it('Neclord debuffs face cards', () => {
    const res = check(scoreWith([], 'KS KH', [], { bossId: 'neclord' }));
    expect(res.total).toBe(10 * 2);
    expect(res.events.filter((e) => e.kind === 'debuffed')).toHaveLength(2);
  });
  it('Neclord leaves number cards alone', () => {
    expect(total([], '9S 9H', [], { bossId: 'neclord' })).toBe(28 * 2);
  });
  it('Seed debuffs Spades', () => {
    expect(total([], 'AS AH', [], { bossId: 'seed' })).toBe(21 * 2);
  });
  it('Culgan debuffs Clubs', () => {
    expect(total([], 'AC AH', [], { bossId: 'culgan' })).toBe(21 * 2);
  });
  it('a debuffed card does not trigger Joker per-card hooks', () => {
    // Huan: +4 Mult per scoring Club
    expect(total(['huan'], 'AC AH', [], { bossId: 'culgan' })).toBe(21 * 2);
  });
  it('debuffed held Steel cards do nothing', () => {
    expect(total([], '9H 9D', [enh('2C', 'steel')], { bossId: 'culgan' })).toBe(28 * 2);
  });
  it('Zombie Horde halves base chips and mult', () => {
    // Pair base 10/2 = 5, mult 2/2 = 1
    expect(total([], 'KS KH', [], { bossId: 'zombie_horde' })).toBe(25);
    // Flush base 35 -> 18 (rounded), mult 4 -> 2
    expect(total([], '2H 4H 6H 8H 10H', [], { bossId: 'zombie_horde' })).toBe((18 + 30) * 2);
  });
});

describe('blocked hands', () => {
  it('blocked option scores 0', () => {
    const run = roundRun();
    run.deck.push(...cards('KS KH'));
    const res = computeScore(run, cards('KS KH'), [], { blocked: true });
    expect(res.blocked).toBe(true);
    expect(res.total).toBe(0);
    expect(res.events[res.events.length - 1].kind).toBe('blocked');
  });
  it('Leon blocks a repeated hand type in play', () => {
    const run = freshRun('LEON');
    run.bosses['1'] = 'leon';
    run.blindIndex = 2;
    act(run, { type: 'selectBlind' });
    expect(run.round?.bossId).toBe('leon');
    act(run, { type: 'play', cardIds: [run.hand[0]] });
    expect(run.lastScore?.blocked).toBe(false);
    expect(run.lastScore!.total).toBeGreaterThan(0);
    act(run, { type: 'play', cardIds: [run.hand[0]] });
    expect(run.lastScore?.blocked).toBe(true);
    expect(run.lastScore?.total).toBe(0);
  });
  it('Agares blocks a hand type that differs from the first', () => {
    const run = freshRun('AGARES');
    run.bosses['1'] = 'agares';
    run.blindIndex = 2;
    act(run, { type: 'selectBlind' });
    act(run, { type: 'play', cardIds: [run.hand[0]] });
    // Force a pair into hand.
    const [a, b] = run.hand.map((id) => run.deck.find((x) => x.id === id)!);
    b.rank = a.rank;
    b.enh = 'none';
    a.enh = 'none';
    act(run, { type: 'play', cardIds: [a.id, b.id] });
    expect(run.lastScore?.handType).toBe('pair');
    expect(run.lastScore?.blocked).toBe(true);
  });
});
