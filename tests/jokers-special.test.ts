// Specific Joker tests required by the build brief (section 10).
import { describe, expect, it } from 'vitest';
import { RunCtx } from '../src/engine/ctx';
import { JOKER_LIST } from '../src/engine/data';
import { computePassives } from '../src/engine/passives';
import type { RunState } from '../src/engine/state';
import { act, cards, freshRun, joker, roundRun, score } from './helpers';

type J = string | ReturnType<typeof joker>;

function runWith(jokers: J[], seed = 'TEST'): RunState {
  const run = freshRun(seed);
  run.jokers = jokers.map((j) => (typeof j === 'string' ? joker(j) : j));
  return run;
}

/** Select the blind. For the Boss, use `bossId` (or the planned boss when null). */
function start(run: RunState, blindIndex = 0, bossId: string | null = 'yuber'): void {
  run.blindIndex = blindIndex;
  if (blindIndex === 2 && bossId) run.bosses[String(run.ante)] = bossId;
  act(run, { type: 'selectBlind' });
}

function win(run: RunState): void {
  run.target = 1;
  act(run, { type: 'play', cardIds: [run.hand[0]] });
  expect(run.cashout).not.toBeNull();
}

/** Win the current blind, cash out, and leave the shop. */
function clearBlind(run: RunState, blindIndex: number): void {
  start(run, blindIndex);
  win(run);
  act(run, { type: 'cashOut' });
  act(run, { type: 'leaveShop' });
}

const ids = (run: RunState) => run.jokers.map((j) => j.id);
const xmults = (res: ReturnType<typeof score>) => res.events.filter((e) => e.kind === 'xmult').map((e) => e.value);

// ------------------------------------------------------------------ Riou

describe("Riou: Collection scaling", () => {
  const withOwned = (owned: string[]) => {
    const run = roundRun(['riou']);
    run.discovered.owned = owned;
    return score(run, cards('KS KH'));
  };

  it('X1 when only Riou is in the Collection (Riou does not count himself)', () => {
    expect(withOwned(['riou']).total).toBe(60);
    expect(withOwned([]).total).toBe(60);
  });

  it('+X0.02 per other owned Joker', () => {
    const others = JOKER_LIST.filter((j) => j.id !== 'riou').map((j) => j.id);
    expect(xmults(withOwned(['riou', ...others.slice(0, 1)]))[0]).toBeCloseTo(1.02, 10);
    expect(xmults(withOwned(others.slice(0, 25)))[0]).toBeCloseTo(1.5, 10);
    expect(withOwned(others.slice(0, 50)).total).toBe(120); // X2
  });

  it('X3.24 at 113/113', () => {
    const res = withOwned(JOKER_LIST.map((j) => j.id));
    expect(xmults(res)[0]).toBeCloseTo(3.24, 10);
    expect(res.total).toBe(Math.floor(30 * 2 * 3.24)); // 194
  });

  it('only counts owned, not seen', () => {
    const run = roundRun(['riou']);
    run.discovered.seen = JOKER_LIST.map((j) => j.id);
    run.discovered.owned = [];
    expect(score(run, cards('KS KH')).total).toBe(60);
  });
});

// ------------------------------------------------------------------ Jowy

describe('Jowy: copies the Joker to his right', () => {
  it('copies a scoring effect', () => {
    expect(score(roundRun(['jowy_atreides', 'mazus']), cards('KS KH')).total).toBe(30 * 2 * 9);
  });

  it('copies only the Joker directly to the right', () => {
    expect(score(roundRun(['jowy_atreides', 'zamza', 'mazus']), cards('KS KH')).total).toBe(180);
    expect(score(roundRun(['mazus', 'jowy_atreides']), cards('KS KH')).total).toBe(180);
  });

  it('copies a per-card effect', () => {
    // Barbara: +4 per Heart, twice.
    expect(score(roundRun(['jowy_atreides', 'barbara']), cards('KS KH')).total).toBe(30 * 10);
  });

  it('copies retriggers', () => {
    // Mondo retriggers the first card once, Jowy once more: KS scores 3 times.
    expect(score(roundRun(['jowy_atreides', 'mondo']), cards('KS KH')).total).toBe((10 + 30 + 10) * 2);
  });

  it('copy of a counter Joker reads the target state', () => {
    const run = roundRun(['jowy_atreides', joker('gadget', { state: { mult: 5 } })]);
    expect(score(run, cards('KS KH')).total).toBe(30 * 12);
  });

  it('copy does not grow the counter', () => {
    const run = runWith(['jowy_atreides', 'gadget']);
    start(run);
    win(run);
    act(run, { type: 'cashOut' });
    run.money = 100;
    act(run, { type: 'reroll' });
    expect(run.jokers[1].state.mult).toBe(1);
  });

  it('copy of Anita does not double the shop growth', () => {
    const run = runWith(['jowy_atreides', 'anita']);
    start(run);
    win(run);
    act(run, { type: 'cashOut' });
    act(run, { type: 'leaveShop' });
    expect(run.jokers[1].state.mult).toBe(2);
  });

  it('copies run-event effects (Zamza pays twice)', () => {
    const run = runWith(['jowy_atreides', 'zamza']);
    start(run);
    win(run);
    expect(run.cashout!.lines.filter((l) => l.label === 'Zamza').map((l) => l.amount)).toEqual([2, 2]);
  });

  it('does not copy passives', () => {
    expect(computePassives(runWith(['jowy_atreides', 'stallion'])).hands).toBe(5);
    expect(computePassives(runWith(['jowy_atreides', 'feather'])).handSize).toBe(9);
  });

  it('does not copy another Jowy', () => {
    // First Jowy gives nothing; second copies Mazus. Two Highland Jokers: +15 Mult (Tags run last).
    // 2 x3 x3 = 18, +15 = 33.
    expect(score(roundRun(['jowy_atreides', 'jowy_atreides', 'mazus']), cards('KS KH')).total).toBe(30 * 33);
  });

  it('does not copy a debuffed Joker', () => {
    const run = roundRun(['jowy_atreides', 'mazus']);
    run.round!.debuffedJokerUid = run.jokers[1].uid;
    expect(score(run, cards('KS KH')).total).toBe(60);
  });

  it('copy events name Jowy', () => {
    const res = score(roundRun(['jowy_atreides', 'mazus']), cards('KS KH'));
    expect(res.events.some((e) => e.source === 'Jowy (copy of Mazus)')).toBe(true);
  });
});

describe('Jowy + Riou bond', () => {
  it('X2 when Riou is directly right of Jowy (plus Jowy copies Riou)', () => {
    // Riou X1 (empty Collection), copy X1, Bond X2.
    const res = score(roundRun(['jowy_atreides', 'riou']), cards('KS KH'));
    expect(res.total).toBe(120);
    expect(res.events.some((e) => e.bondId === 'jowy_riou')).toBe(true);
  });

  it('copy of a scaled Riou and the Bond stack', () => {
    const run = roundRun(['jowy_atreides', 'riou']);
    run.discovered.owned = JOKER_LIST.slice(1, 26).map((j) => j.id); // 25 others: X1.5
    expect(score(run, cards('KS KH')).total).toBe(Math.floor(60 * 1.5 * 1.5 * 2)); // 270
  });

  it('no Bond when Riou is left of Jowy or not adjacent', () => {
    expect(score(roundRun(['riou', 'jowy_atreides']), cards('KS KH')).total).toBe(60);
    expect(score(roundRun(['jowy_atreides', 'zamza', 'riou']), cards('KS KH')).total).toBe(60);
  });

  function ante8Boss(jokers: J[], seed: string): RunState {
    const run = runWith(jokers, seed);
    run.ante = 8;
    start(run, 2, null); // the planned Ante 8 boss (Jowy, debuffs a random Joker)
    expect(run.round!.bossId).toBe('jowy_boss');
    win(run);
    return run;
  }

  it('Riou is destroyed after the Ante 8 boss is won', () => {
    for (let s = 0; s < 12; s++) {
      const run = ante8Boss(['jowy_atreides', 'riou'], `R${s}`);
      expect(ids(run)).toEqual(['jowy_atreides']);
      expect(run.phase).toBe('victory');
    }
  });

  it('Riou survives without the Bond, or before Ante 8', () => {
    expect(ids(ante8Boss(['riou', 'jowy_atreides'], 'R1'))).toEqual(['riou', 'jowy_atreides']);
    const run = runWith(['jowy_atreides', 'riou']);
    run.ante = 7;
    start(run, 2);
    win(run);
    expect(ids(run)).toEqual(['jowy_atreides', 'riou']);
  });

  it('Shin protects Riou from his fate', () => {
    const run = ante8Boss(['jowy_atreides', 'riou', 'shin'], 'R1');
    expect(ids(run)).toEqual(['jowy_atreides', 'riou', 'shin']);
  });
});

// ------------------------------------------------------------------ Luca Blight

describe('Luca Blight', () => {
  it('X4 Mult', () => {
    expect(score(roundRun(['luca_blight']), cards('KS KH')).total).toBe(240);
  });

  it('destroys one random other Joker at the end of each round', () => {
    const run = runWith(['zamza', 'luca_blight', 'chaco', 'koyu']);
    start(run);
    win(run);
    expect(run.jokers.length).toBe(3);
    expect(ids(run)).toContain('luca_blight');
    act(run, { type: 'cashOut' });
    act(run, { type: 'leaveShop' });
    start(run, 1);
    win(run);
    expect(run.jokers.length).toBe(2);
    expect(ids(run)).toContain('luca_blight');
  });

  it('never destroys himself', () => {
    const run = runWith(['luca_blight']);
    start(run);
    win(run);
    expect(ids(run)).toEqual(['luca_blight']);
  });

  it('the victim is chosen by the seeded RNG', () => {
    const victims = new Set<string>();
    for (let s = 0; s < 30; s++) {
      const a = runWith(['zamza', 'luca_blight', 'chaco', 'koyu'], `L${s}`);
      const b = runWith(['zamza', 'luca_blight', 'chaco', 'koyu'], `L${s}`);
      for (const r of [a, b]) {
        start(r);
        win(r);
      }
      expect(ids(a)).toEqual(ids(b));
      victims.add(['zamza', 'chaco', 'koyu'].find((id) => !ids(a).includes(id))!);
    }
    expect([...victims].sort()).toEqual(['chaco', 'koyu', 'zamza']);
  });

  it('cannot be sold', () => {
    const run = runWith(['luca_blight', 'zamza']);
    const m = run.money;
    const res = (() => {
      try {
        act(run, { type: 'sellJoker', uid: run.jokers[0].uid });
        return 'sold';
      } catch (e) {
        return String(e);
      }
    })();
    expect(res).toMatch(/cannot be sold/);
    expect(ids(run)).toEqual(['luca_blight', 'zamza']);
    expect(run.money).toBe(m);
    act(run, { type: 'sellJoker', uid: run.jokers[1].uid });
    expect(ids(run)).toEqual(['luca_blight']);
  });
});

// ------------------------------------------------------------------ Shin

describe('Shin: prevents the next Joker destruction once per Ante', () => {
  it('blocks the first destruction, not the second', () => {
    const run = runWith(['shin', 'zamza', 'chaco']);
    const r = new RunCtx(run);
    expect(r.destroyJoker(run.jokers[1].uid, 'test')).toBe(false);
    expect(ids(run)).toEqual(['shin', 'zamza', 'chaco']);
    expect(run.anteState.shinUsed).toBe(true);
    expect(r.destroyJoker(run.jokers[1].uid, 'test')).toBe(true);
    expect(ids(run)).toEqual(['shin', 'chaco']);
  });

  it('with Luca: first round is blocked, second round destroys, a new Ante protects again', () => {
    const run = runWith(['luca_blight', 'shin', 'zamza', 'chaco', 'koyu']);
    clearBlind(run, 0);
    expect(run.jokers.length).toBe(5);
    clearBlind(run, 1);
    expect(run.jokers.length).toBe(4);
    // Boss of Ante 1. Luca destroys at round end; if Shin survived he may block again next Ante.
    start(run, 2);
    win(run);
    expect(run.jokers.length).toBe(3);
    act(run, { type: 'cashOut' });
    expect(run.ante).toBe(2);
    expect(run.anteState.shinUsed).toBe(false);
    if (ids(run).includes('shin')) {
      act(run, { type: 'leaveShop' });
      start(run, 0);
      win(run);
      expect(run.jokers.length).toBe(3);
      expect(run.anteState.shinUsed).toBe(true);
    }
  });

  it('+10 Mult', () => {
    expect(score(roundRun(['shin']), cards('KS KH')).total).toBe(360);
  });
});

// ------------------------------------------------------------------ random Jokers

describe('random Jokers use the seeded RNG', () => {
  /** Score one hand with this Joker in a run seeded `seed`. */
  function roll(id: string, seed: string) {
    const run = freshRun(seed);
    run.jokers = [joker(id)];
    start(run);
    const res = score(run, cards('KS KH'));
    return { total: res.total, money: res.money, rng: run.rng.s };
  }

  const seeds = Array.from({ length: 40 }, (_, i) => `SEED${i}`);

  it.each([
    ['tai_ho', [60, 120, 360, 660]],
    ['richmond', [60, 108]],
  ] as const)('%s: same seed gives the same result; all results are reachable', (id, outcomes) => {
    const totals = new Set<number>();
    for (const s of seeds) {
      const a = roll(id, s);
      expect(roll(id, s)).toEqual(a);
      totals.add(a.total);
    }
    expect([...totals].sort((x, y) => x - y)).toEqual([...outcomes]);
  });

  it('shilo: same seed gives the same result; both results are reachable', () => {
    const money = new Set<number>();
    for (const s of seeds) {
      const a = roll('shilo', s);
      expect(roll('shilo', s)).toEqual(a);
      money.add(a.money);
    }
    expect([...money].sort()).toEqual([0, 5]);
  });

  it('viki: the round effect is fixed by the seed and kept for the whole round', () => {
    const effects = new Set<number>();
    for (const s of seeds) {
      const a = runWith(['viki'], s);
      const b = runWith(['viki'], s);
      start(a);
      start(b);
      expect(a.jokers[0].state.effect).toBe(b.jokers[0].state.effect);
      expect(a.money).toBe(b.money);
      const e = a.jokers[0].state.effect;
      effects.add(e);
      const t1 = score(a, cards('KS KH')).total;
      const t2 = score(a, cards('KS KH')).total;
      expect(t2).toBe(t1);
      expect(t1).toBe([120, 360, 60, 90][e]);
    }
    expect([...effects].sort()).toEqual([0, 1, 2, 3]);
  });

  it('a full round with Tai Ho, Richmond and Shilo replays the same for the same seed', () => {
    const playRound = (seed: string) => {
      const run = runWith(['tai_ho', 'richmond', 'shilo'], seed);
      start(run);
      run.target = 1e9;
      const out: number[] = [];
      for (let i = 0; i < 3; i++) {
        act(run, { type: 'play', cardIds: run.hand.slice(0, 2) });
        out.push(run.lastScore!.total, run.money);
      }
      return { out, rng: run.rng.s };
    };
    expect(playRound('DET')).toEqual(playRound('DET'));
    expect(playRound('DET')).not.toEqual(playRound('OTHER'));
  });
});
