import { describe, expect, it } from 'vitest';
import { buildFacility, buildRunModifiers, FACILITY_LIST, facilityStatus, newCastle, renownForRun } from '../src/engine/castle';
import { CONSUMABLE_LIST } from '../src/engine/consumables';
import { JOKERS } from '../src/engine/data';
import { computePassives } from '../src/engine/passives';
import { newRun } from '../src/engine/run';
import { rerollPrice } from '../src/engine/shop';
import type { RunState } from '../src/engine/state';
import { act, cards, EMPTY_PROFILE, score } from './helpers';

const castleWith = (...built: string[]) => ({ ...newCastle(), built });
const runWith = (...built: string[]): RunState => newRun('CASTLE', EMPTY_PROFILE, buildRunModifiers(castleWith(...built)));

describe('castle data', () => {
  it('every facility names a real Joker as its character', () => {
    for (const f of FACILITY_LIST) expect(JOKERS[f.character], f.id).toBeDefined();
  });
});

describe('building', () => {
  it('needs the character recruited, then enough Renown', () => {
    const c = { ...newCastle(), renown: 100 };
    expect(facilityStatus(c, [], 'tavern')).toBe('locked');
    expect(buildFacility(c, [], 'tavern').ok).toBe(false);
    expect(facilityStatus({ ...c, renown: 14 }, ['leona'], 'tavern')).toBe('poor');
    const res = buildFacility(c, ['leona'], 'tavern');
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.castle.renown).toBe(85);
    expect(res.castle.built).toEqual(['tavern']);
    expect(c.built).toEqual([]); // input not changed
    expect(facilityStatus(res.castle, ['leona'], 'tavern')).toBe('built');
    expect(buildFacility(res.castle, ['leona'], 'tavern').ok).toBe(false);
  });

  it('Renown: 1 per round won, +2 per boss, +5 for a win', () => {
    const run = runWith();
    run.stats.roundsWon = 9;
    run.stats.bossesDefeated = 3;
    expect(renownForRun(run)).toBe(15);
    run.won = true;
    expect(renownForRun(run)).toBe(20);
  });
});

describe("Leona's Tavern", () => {
  it('+1 hand size and rerolls 1 Potch cheaper', () => {
    const run = runWith('tavern');
    const p = computePassives(run);
    expect(p.handSize).toBe(9);
    expect(rerollPrice({ cards: [], packs: [], rerollCost: 5, freeRerolls: 0, boughtAny: false }, p)).toBe(4);
    act(run, { type: 'selectBlind' });
    expect(run.hand.length).toBe(9);
  });
});

describe("Richmond's Detective Agency", () => {
  it('previews 2 cards and looks one Chapter ahead', () => {
    const p = computePassives(runWith('detective'));
    expect(p.previewCount).toBe(2);
    expect(p.bossLookahead).toBe(1);
    expect(computePassives(runWith()).previewCount).toBe(0);
  });
});

describe("Hai Yo's Kitchen", () => {
  it('gives a Food card at the start of each blind, if there is room', () => {
    const run = runWith('kitchen');
    act(run, { type: 'selectBlind' });
    expect(run.consumables.map((c) => CONSUMABLE_LIST.find((d) => d.id === c.id)!.kind)).toEqual(['food']);
    const none = runWith();
    act(none, { type: 'selectBlind' });
    expect(none.consumables).toEqual([]);
  });
  it('no Food when the slots are full', () => {
    const run = runWith('kitchen');
    run.consumables = [{ uid: 9001, id: 'fire' }, { uid: 9002, id: 'water' }];
    act(run, { type: 'selectBlind' });
    expect(run.consumables.length).toBe(2);
  });
});

describe("Viki's Teleportation Gate", () => {
  it('skipping a blind goes to the shop, then on to the next blind', () => {
    const run = runWith('gate');
    act(run, { type: 'skipBlind' });
    expect(run.phase).toBe('shop');
    expect(run.blindIndex).toBe(1);
    act(run, { type: 'leaveShop' });
    expect(run.phase).toBe('blind');
    expect(run.blindIndex).toBe(1);
  });
  it('without the Gate, a skip goes straight to the next blind', () => {
    const run = runWith();
    act(run, { type: 'skipBlind' });
    expect(run.phase).toBe('blind');
  });
});

describe('Food cards', () => {
  const useFood = (run: RunState, id: string) => {
    run.consumables.push({ uid: 7000 + run.consumables.length, id });
    act(run, { type: 'useConsumable', uid: run.consumables[run.consumables.length - 1].uid, cardIds: [] });
  };

  it('Rice Ball and Spicy Ramen add to the next hand', () => {
    const run = newRun('FOOD0', EMPTY_PROFILE);
    act(run, { type: 'selectBlind' });
    useFood(run, 'rice_ball');
    useFood(run, 'spicy_ramen');
    // Pair of Kings: (10 + 10 + 10 + 30) x (2 + 8) = 600
    expect(score(run, cards('KS KH')).total).toBe(600);
  });

  it('the bonus is used up by the hand played', () => {
    const run = newRun('FOOD', EMPTY_PROFILE);
    act(run, { type: 'selectBlind' });
    useFood(run, 'rice_ball');
    act(run, { type: 'play', cardIds: run.hand.slice(0, 1) });
    expect(run.lastScore!.events.some((e) => e.source === 'Food')).toBe(true);
    expect(run.nextHand).toEqual({ chips: 0, mult: 0 });
  });

  it('Fried Fish, Curry and Dumplings change this round', () => {
    const run = newRun('FOOD2', EMPTY_PROFILE);
    act(run, { type: 'selectBlind' });
    useFood(run, 'fried_fish');
    useFood(run, 'curry');
    expect(run.round!.discardsLeft).toBe(4);
    expect(run.round!.handsLeft).toBe(5);
    useFood(run, 'dumplings');
    expect(run.hand.length).toBe(10);
  });

  it('round-only Food cannot be eaten outside a battle', () => {
    const run = newRun('FOOD3', EMPTY_PROFILE);
    run.consumables.push({ uid: 7100, id: 'curry' });
    expect(() => act(run, { type: 'useConsumable', uid: 7100, cardIds: [] })).toThrow(/battle/);
  });

  it('Steamed Bun gives 3 Potch', () => {
    const run = newRun('FOOD4', EMPTY_PROFILE);
    const before = run.money;
    useFood(run, 'steamed_bun');
    expect(run.money).toBe(before + 3);
  });

  it('Food is not a Rune: no Rune counters, Clone cannot copy it', () => {
    const run = newRun('FOOD5', EMPTY_PROFILE);
    useFood(run, 'steamed_bun');
    expect(run.stats.runesUsed).toBe(0);
    expect(run.stats.lastConsumable).toBeNull();
  });
});
