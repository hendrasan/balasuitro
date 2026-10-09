import { describe, expect, it } from 'vitest';
import { BONDS } from '../src/engine/data';
import { activeBonds, bondActive, bondMembersPresent } from '../src/engine/jokers/bonds';
import type { RunState } from '../src/engine/state';
import { act, freshRun, joker, roundRun, score, cards } from './helpers';

function runWith(ids: string[]): RunState {
  const run = freshRun();
  run.jokers = ids.map((id) => joker(id));
  return run;
}
const active = (run: RunState) => activeBonds(run).map((b) => b.id);

describe('pair bonds (adjacent)', () => {
  it('active when the two members are next to each other, either order', () => {
    expect(active(runWith(['ridley_wizen', 'boris_wizen']))).toContain('ridley_boris');
    expect(active(runWith(['boris_wizen', 'ridley_wizen']))).toContain('ridley_boris');
    expect(active(runWith(['chaco', 'boris_wizen', 'ridley_wizen', 'killey']))).toContain('ridley_boris');
  });
  it('inactive when separated or when one member is missing', () => {
    expect(active(runWith(['ridley_wizen', 'chaco', 'boris_wizen']))).not.toContain('ridley_boris');
    expect(active(runWith(['ridley_wizen']))).not.toContain('ridley_boris');
  });
  it('active bond changes the score', () => {
    // Ridley (X1.5 on Pair) + Boris: bond X1.4. Chaco (+20 Chips) between them breaks it.
    const on = roundRun(['ridley_wizen', 'boris_wizen']);
    const off = roundRun(['ridley_wizen', 'chaco', 'boris_wizen']);
    const a = score(on, cards('KS KH'));
    const b = score(off, cards('KS KH'));
    expect(a.events.some((e) => e.bondId === 'ridley_boris' && e.kind === 'xmult')).toBe(true);
    expect(b.events.some((e) => e.bondId === 'ridley_boris')).toBe(false);
    expect(a.total).toBe(Math.floor(30 * 2 * 1.5 * 1.4));
    expect(b.total).toBe(50 * 2 * 1.5);
  });
});

describe('trio bonds', () => {
  const trio = BONDS.chaco_fitcher_ridley;
  it('active only when all three are one contiguous group, any order', () => {
    for (const order of [
      ['chaco', 'fitcher', 'ridley_wizen'],
      ['ridley_wizen', 'chaco', 'fitcher'],
      ['fitcher', 'ridley_wizen', 'chaco'],
    ]) {
      expect(bondActive(runWith(order), trio)).toBe(true);
      expect(bondActive(runWith(['killey', ...order, 'koyu']), trio)).toBe(true);
    }
  });
  it('inactive with a gap or with only two members', () => {
    expect(bondActive(runWith(['chaco', 'fitcher', 'killey', 'ridley_wizen']), trio)).toBe(false);
    expect(bondActive(runWith(['chaco', 'killey', 'fitcher', 'ridley_wizen']), trio)).toBe(false);
    expect(bondActive(runWith(['chaco', 'fitcher']), trio)).toBe(false);
  });
  it('reports present members', () => {
    expect(bondMembersPresent(runWith(['chaco', 'killey', 'fitcher']), trio)).toEqual(['chaco', 'fitcher']);
  });
});

describe('rightOf rule (Jowy and Riou)', () => {
  const bond = BONDS.jowy_riou;
  it('active only when Riou is directly right of Jowy', () => {
    expect(bondActive(runWith(['jowy_atreides', 'riou']), bond)).toBe(true);
    expect(bondActive(runWith(['riou', 'jowy_atreides']), bond)).toBe(false);
    expect(bondActive(runWith(['jowy_atreides', 'chaco', 'riou']), bond)).toBe(false);
  });
});

describe('reorder with moveJoker', () => {
  it('moving a member away deactivates; moving it back activates', () => {
    const run = runWith(['ridley_wizen', 'boris_wizen', 'chaco']);
    expect(active(run)).toContain('ridley_boris');
    act(run, { type: 'moveJoker', from: 1, to: 2 });
    expect(run.jokers.map((j) => j.id)).toEqual(['ridley_wizen', 'chaco', 'boris_wizen']);
    expect(active(run)).not.toContain('ridley_boris');
    act(run, { type: 'moveJoker', from: 2, to: 0 });
    expect(run.jokers.map((j) => j.id)).toEqual(['boris_wizen', 'ridley_wizen', 'chaco']);
    expect(active(run)).toContain('ridley_boris');
  });
  it('reorder completes a trio', () => {
    const run = runWith(['chaco', 'killey', 'fitcher', 'ridley_wizen']);
    expect(active(run)).not.toContain('chaco_fitcher_ridley');
    act(run, { type: 'moveJoker', from: 1, to: 3 });
    expect(active(run)).toContain('chaco_fitcher_ridley');
  });
  it('rejects bad positions', () => {
    const run = runWith(['chaco']);
    expect(run.jokers.length).toBe(1);
    const r = { type: 'moveJoker', from: 0, to: 3 } as const;
    expect(() => act(run, r)).toThrow();
  });
});

describe('selling and debuffs', () => {
  it('selling a member deactivates the bond', () => {
    const run = runWith(['ridley_wizen', 'boris_wizen']);
    act(run, { type: 'sellJoker', uid: run.jokers[1].uid });
    expect(active(run)).not.toContain('ridley_boris');
  });
  it('selling the middle Joker can activate a bond', () => {
    const run = runWith(['ridley_wizen', 'chaco', 'boris_wizen']);
    act(run, { type: 'sellJoker', uid: run.jokers[1].uid });
    expect(active(run)).toContain('ridley_boris');
  });
  it('a debuffed member (Jowy boss) deactivates the bond', () => {
    const run = roundRun(['ridley_wizen', 'boris_wizen'], { bossId: 'jowy_boss' });
    expect(active(run)).toContain('ridley_boris');
    run.round!.debuffedJokerUid = run.jokers[0].uid;
    expect(active(run)).not.toContain('ridley_boris');
    const res = score(run, cards('KS KH'));
    expect(res.events.some((e) => e.bondId === 'ridley_boris')).toBe(false);
  });
});
