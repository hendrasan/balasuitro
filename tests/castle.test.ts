import { describe, expect, it } from 'vitest';
import {
  buildFacility, buildRunModifiers, FACILITY_LIST, facilityLevel, facilityStatus, favoriteHands, newCastle, renownForRun,
  type CastleState,
} from '../src/engine/castle';
import { CONFIG } from '../src/engine/config';
import { CONSUMABLE_LIST } from '../src/engine/consumables';
import { JOKERS } from '../src/engine/data';
import type { HandType } from '../src/engine/hands';
import { computePassives } from '../src/engine/passives';
import { newRun } from '../src/engine/run';
import { generateShop, packPrice, rerollPrice } from '../src/engine/shop';
import type { RunState } from '../src/engine/state';
import { act, cards, EMPTY_PROFILE, score } from './helpers';

const castle = (levels: Record<string, number>): CastleState => ({ ...newCastle(), levels });
const runWith = (levels: Record<string, number>, plays: Partial<Record<HandType, number>> = {}, seed = 'CASTLE'): RunState =>
  newRun(seed, EMPTY_PROFILE, buildRunModifiers(castle(levels), plays));

describe('castle data', () => {
  it('every facility names a real Joker and has rising level costs', () => {
    for (const f of FACILITY_LIST) {
      expect(JOKERS[f.character], f.id).toBeDefined();
      expect(f.levels.length).toBeGreaterThan(0);
      for (let i = 1; i < f.levels.length; i++) expect(f.levels[i].cost).toBeGreaterThan(f.levels[i - 1].cost);
    }
  });
  it("Shu's War Room is the most expensive single purchase", () => {
    const max = Math.max(...FACILITY_LIST.flatMap((f) => f.levels.map((l) => l.cost)));
    expect(FACILITY_LIST.find((f) => f.id === 'warroom')!.levels[0].cost).toBe(max);
  });
});

describe('building and levels', () => {
  it('needs the character, then Renown per level, up to the top level', () => {
    let c: CastleState = { ...newCastle(), renown: 200 };
    expect(facilityStatus(c, [], 'tavern')).toBe('locked');
    expect(buildFacility(c, [], 'tavern').ok).toBe(false);
    expect(facilityStatus({ ...c, renown: 14 }, ['leona'], 'tavern')).toBe('poor');
    for (const cost of [15, 30, 60]) {
      const res = buildFacility(c, ['leona'], 'tavern');
      if (!res.ok) throw new Error(res.error);
      expect(res.castle.renown).toBe(c.renown - cost);
      c = res.castle;
    }
    expect(facilityLevel(c, 'tavern')).toBe(3);
    expect(facilityStatus(c, ['leona'], 'tavern')).toBe('max');
    expect(buildFacility(c, ['leona'], 'tavern').ok).toBe(false);
  });
  it('does not change the input castle', () => {
    const c = { ...newCastle(), renown: 50 };
    buildFacility(c, ['leona'], 'tavern');
    expect(c).toStrictEqual({ renown: 50, levels: {} });
  });
  it('Renown: 1 per round won, +2 per boss, +5 for a win', () => {
    const run = runWith({});
    run.stats.roundsWon = 9;
    run.stats.bossesDefeated = 3;
    expect(renownForRun(run)).toBe(15);
    run.won = true;
    expect(renownForRun(run)).toBe(20);
  });
});

describe("Annallee's Stage", () => {
  it('adds +25% / +50% / +100% Renown, rounded up', () => {
    const base = (levels: Record<string, number>) => {
      const run = runWith(levels);
      run.stats.roundsWon = 7;
      run.stats.bossesDefeated = 2; // base 11
      return renownForRun(run);
    };
    expect(base({})).toBe(11);
    expect(base({ stage: 1 })).toBe(14); // 13.75
    expect(base({ stage: 2 })).toBe(17); // 16.5
    expect(base({ stage: 3 })).toBe(22);
  });
  it('a run saved before the Stage existed still pays the base amount', () => {
    const run = runWith({});
    delete (run.modifiers as Partial<typeof run.modifiers>).renownBonusPct;
    run.stats.roundsWon = 3;
    expect(renownForRun(run)).toBe(3);
  });
});

describe("Leona's Tavern", () => {
  it('level 1: +1 hand size, rerolls 1 cheaper; level 3: +2 hand size, 2 cheaper', () => {
    const shop = { cards: [], packs: [], rerollCost: 5, freeRerolls: 0, boughtAny: false };
    const p1 = computePassives(runWith({ tavern: 1 }));
    expect(p1.handSize).toBe(9);
    expect(rerollPrice(shop, p1)).toBe(4);
    const p3 = computePassives(runWith({ tavern: 3 }));
    expect(p3.handSize).toBe(10);
    expect(rerollPrice(shop, p3)).toBe(3);
  });
});

describe("Richmond's Detective Agency", () => {
  it('previews cards, looks ahead, and reveals every boss at level 3', () => {
    const p1 = computePassives(runWith({ detective: 1 }));
    expect([p1.previewCount, p1.bossLookahead, p1.revealBosses]).toEqual([2, 1, false]);
    const p3 = computePassives(runWith({ detective: 3 }));
    expect([p3.previewCount, p3.revealBosses]).toEqual([3, true]);
  });
});

describe("Hai Yo's Kitchen", () => {
  const foodKinds = (run: RunState) => run.consumables.map((c) => CONSUMABLE_LIST.find((d) => d.id === c.id)!.kind);
  it('level 1: one Food per blind; level 3: two Food and +1 slot', () => {
    const r1 = runWith({ kitchen: 1 });
    act(r1, { type: 'selectBlind' });
    expect(foodKinds(r1)).toEqual(['food']);
    const r3 = runWith({ kitchen: 3 });
    expect(computePassives(r3).consumableSlots).toBe(3);
    act(r3, { type: 'selectBlind' });
    expect(foodKinds(r3)).toEqual(['food', 'food']);
  });
  it('no Food when the slots are full', () => {
    const run = runWith({ kitchen: 1 });
    run.consumables = [{ uid: 9001, id: 'fire' }, { uid: 9002, id: 'water' }];
    act(run, { type: 'selectBlind' });
    expect(run.consumables.length).toBe(2);
  });
});

describe("Viki's Teleportation Gate", () => {
  it('level 1: a skip goes to the shop, then to the next blind', () => {
    const run = runWith({ gate: 1 });
    act(run, { type: 'skipBlind' });
    expect(run.phase).toBe('shop');
    act(run, { type: 'leaveShop' });
    expect([run.phase, run.blindIndex]).toEqual(['blind', 1]);
    expect(() => act(run, { type: 'teleport' })).toThrow(/Viki/);
  });
  it('level 2: teleport back to the last shop without owning Viki', () => {
    const run = runWith({ gate: 2 });
    act(run, { type: 'skipBlind' });
    act(run, { type: 'leaveShop' });
    act(run, { type: 'teleport' });
    expect(run.phase).toBe('shop');
  });
  it('without the Gate, a skip goes straight to the next blind', () => {
    const run = runWith({});
    act(run, { type: 'skipBlind' });
    expect(run.phase).toBe('blind');
  });
});

describe("Mukumuku's Squirrel Corps", () => {
  /** Play the last hand of a round with a given score so far. */
  function loseWith(levels: Record<string, number>, pctScored: number, seed = 'SQ') {
    const run = runWith(levels, {}, seed);
    act(run, { type: 'selectBlind' });
    run.round!.handsLeft = 1;
    run.roundScore = Math.floor((run.target * pctScored) / 100) - 1; // the last hand adds a little
    act(run, { type: 'play', cardIds: run.hand.slice(0, 1) });
    return run;
  }
  it('level 1 saves a loss at 50% or more, once per run, with no blind reward', () => {
    const run = loseWith({ squirrels: 1 }, 55);
    expect(run.phase).toBe('cashout');
    expect(run.rescued).toBe(true);
    expect(run.cashout!.lines[0]).toEqual({ label: 'Saved by the squirrels', amount: 0 });
    expect(run.cashout!.lines.some((l) => l.label.includes('defeated'))).toBe(false);
  });
  it('level 1 does not save at 30%; level 2 does', () => {
    expect(loseWith({ squirrels: 1 }, 30).phase).toBe('gameover');
    expect(loseWith({ squirrels: 2 }, 30).phase).toBe('cashout');
  });
  it('only once per run', () => {
    const run = loseWith({ squirrels: 2 }, 60);
    act(run, { type: 'cashOut' });
    act(run, { type: 'leaveShop' });
    act(run, { type: 'selectBlind' });
    run.round!.handsLeft = 1;
    run.roundScore = run.target - 1000;
    act(run, { type: 'play', cardIds: run.hand.slice(0, 1) });
    expect(run.phase).toBe('gameover');
  });
  it('cannot win the finale', () => {
    const run = runWith({ squirrels: 2 });
    run.ante = CONFIG.finalAnte;
    run.blindIndex = 2;
    act(run, { type: 'selectBlind' });
    run.round!.handsLeft = 1;
    run.roundScore = run.target - 10_000;
    act(run, { type: 'play', cardIds: run.hand.slice(0, 1) });
    expect(run.phase).toBe('gameover');
  });
  it('without the Corps, a loss is a loss', () => {
    expect(loseWith({}, 90).phase).toBe('gameover');
  });
});

describe("Tessai's Forge", () => {
  it('favorite hands come from lifetime plays (Pair, then High Card when there are none)', () => {
    expect(favoriteHands({}).slice(0, 2)).toEqual(['pair', 'high']);
    expect(favoriteHands({ flush: 12, twopair: 30 }).slice(0, 2)).toEqual(['twopair', 'flush']);
  });
  it('raises the starting levels of the favorite hands', () => {
    const plays = { flush: 12, twopair: 30 };
    const r1 = runWith({ forge: 1 }, plays);
    expect(r1.handLevels.twopair.level).toBe(2);
    expect(r1.handLevels.flush.level).toBe(1);
    const r3 = runWith({ forge: 3 }, plays);
    expect(r3.handLevels.twopair.level).toBe(3);
    expect(r3.handLevels.flush.level).toBe(2);
  });
});

describe("Gordon's Trading Post", () => {
  it('more starting Potch, and 10% off at level 3', () => {
    expect(runWith({ trading: 1 }).money).toBe(CONFIG.startMoney + 5);
    const r3 = runWith({ trading: 3 });
    expect(r3.money).toBe(CONFIG.startMoney + 10);
    expect(computePassives(r3).shopDiscountPct).toBe(10);
  });
});

describe("Jeane's Rune Shop", () => {
  it('every shop has a Rune Pack, and Rune Packs cost 2 less', () => {
    for (const seed of ['J1', 'J2', 'J3', 'J4', 'J5']) {
      const run = runWith({ runeshop: 1 }, {}, seed);
      const shop = generateShop(run);
      expect(shop.packs.some((p) => p?.type === 'rune')).toBe(true);
      const p = computePassives(run);
      const normal = packPrice({ type: 'rune', size: 'normal' }, p);
      expect(normal).toBe(CONFIG.packCost.normal - 2);
      expect(packPrice({ type: 'star', size: 'normal' }, p)).toBe(CONFIG.packCost.normal);
    }
  });
  it('level 2 makes the Rune of Beginning 3X more likely', () => {
    expect(runWith({ runeshop: 1 }).modifiers.soulChanceMult).toBe(1);
    expect(runWith({ runeshop: 2 }).modifiers.soulChanceMult).toBe(3);
  });
});

describe("Shu's War Room", () => {
  it('+1 Joker slot', () => {
    expect(computePassives(runWith({ warroom: 1 })).jokerSlots).toBe(CONFIG.jokerSlots + 1);
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
