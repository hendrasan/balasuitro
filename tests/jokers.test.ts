// One or more tests per Joker. Expected values are computed by hand:
// base hand (HAND_INFO) + card chips (2-10 face value, J/Q/K 10, A 11) + Joker effects.
// Pair Lv1 = 10 chips x 2 Mult, so "KS KH" alone = 30 x 2 = 60.
import { describe, expect, it } from 'vitest';
import type { Card } from '../src/engine/cards';
import { RunCtx, sellValue } from '../src/engine/ctx';
import { JOKER_LIST } from '../src/engine/data';
import { BEHAVIORS } from '../src/engine/jokers/registry';
import { jokerRefs } from '../src/engine/jokers/refs';
import type { JokerBehavior, JokerRef } from '../src/engine/jokers/types';
import { computePassives } from '../src/engine/passives';
import { isJokerAvailable } from '../src/engine/pools';
import { itemPrice } from '../src/engine/shop';
import type { RunState } from '../src/engine/state';
import { act, c, cards, freshRun, joker, roundRun, score } from './helpers';

// ------------------------------------------------------------------ helpers

type J = string | ReturnType<typeof joker>;

/** Own (non-copy) ref of the first Joker with this id. */
function refOf(run: RunState, id: string): JokerRef {
  const r = jokerRefs(run).find((x) => x.data.id === id && !x.isCopy);
  if (!r) throw new Error('no ref ' + id);
  return r;
}

/** Call one run-event hook of a Joker directly, with a RunCtx (money goes to run.money). */
function fire<K extends keyof JokerBehavior>(run: RunState, id: string, hook: K, ...rest: unknown[]): void {
  const fn = BEHAVIORS[id][hook] as unknown as (r: RunCtx, j: JokerRef, ...a: unknown[]) => void;
  if (!fn) throw new Error(`${id} has no ${hook}`);
  fn(new RunCtx(run), refOf(run, id), ...rest);
}

function runWith(jokers: J[], seed = 'TEST'): RunState {
  const run = freshRun(seed);
  run.jokers = jokers.map((j) => (typeof j === 'string' ? joker(j) : j));
  return run;
}

/** Select the current blind (with a benign boss if it is the Boss blind). */
function start(run: RunState, blindIndex = 0, bossId = 'yuber'): void {
  run.blindIndex = blindIndex;
  if (blindIndex === 2) run.bosses[String(run.ante)] = bossId;
  act(run, { type: 'selectBlind' });
}

/** Win the round with one card. Returns the cash-out lines. */
function win(run: RunState): { label: string; amount: number }[] {
  run.target = 1;
  act(run, { type: 'play', cardIds: [run.hand[0]] });
  expect(run.cashout).not.toBeNull();
  return run.cashout!.lines;
}

function line(lines: { label: string; amount: number }[], label: string): number | undefined {
  return lines.find((l) => l.label === label)?.amount;
}

/** Go from cash-out into the shop with lots of money. */
function toShop(run: RunState): void {
  act(run, { type: 'cashOut' });
  run.money = 100;
}

// ------------------------------------------------------------------ scoring table

interface Case {
  id: string;
  name: string;
  jokers?: J[];
  played: string | Card[];
  held?: Card[];
  opts?: Parameters<typeof roundRun>[1];
  setup?: (run: RunState) => void;
  total: number;
  money?: number;
}

const st = (id: string, state: Record<string, number>) => joker(id, { state });

const CASES: Case[] = [
  // Special
  { id: 'riou', name: '10 others owned: X1.2', played: 'KS KH', setup: (r) => (r.discovered.owned = ['riou', ...JOKER_LIST.slice(1, 11).map((j) => j.id)]), total: 72 },
  { id: 'riou', name: 'only Riou owned: X1', played: 'KS KH', setup: (r) => (r.discovered.owned = ['riou']), total: 60 },
  { id: 'jowy_atreides', name: 'copies Kahn Marley (+6 twice)', jokers: ['jowy_atreides', 'kahn_marley'], played: 'KS KH', total: 30 * 14 },
  { id: 'jowy_atreides', name: 'nothing to copy', jokers: ['kahn_marley', 'jowy_atreides'], played: 'KS KH', total: 30 * 8 },
  { id: 'shu', name: 'X2', played: 'KS KH', total: 120 },
  { id: 'viki', name: 'round effect +30 Chips', jokers: [st('viki', { roundKey: 10, effect: 0 })], played: 'KS KH', total: 120 },
  { id: 'viki', name: 'round effect +10 Mult', jokers: [st('viki', { roundKey: 10, effect: 1 })], played: 'KS KH', total: 360 },
  { id: 'viki', name: 'round effect Potch: no score change', jokers: [st('viki', { roundKey: 10, effect: 2 })], played: 'KS KH', total: 60 },
  { id: 'viki', name: 'round effect X1.5', jokers: [st('viki', { roundKey: 10, effect: 3 })], played: 'KS KH', total: 90 },
  { id: 'luca_blight', name: 'X4', played: 'KS KH', total: 240 },
  // Chapter 1
  { id: 'nanami', name: 'Pair: +10 Mult', played: 'KS KH', total: 360 },
  { id: 'nanami', name: 'no Pair', played: 'KS', total: 15 },
  { id: 'gengen', name: '2 cards: +30 Chips', played: 'KS KH', total: 120 },
  { id: 'gengen', name: '4 cards: nothing', played: 'KS KH 2C 4D', total: 60 },
  { id: 'rikimaru', name: '+8 Mult', played: 'KS KH', total: 300 },
  { id: 'kinnison', name: '3 hands left: +45 Chips', played: 'KS KH', total: 150 },
  { id: 'kinnison', name: '0 hands left', played: 'KS KH', opts: { handsLeft: 0 }, total: 60 },
  { id: 'shiro', name: '+4 Mult', played: 'KS KH', total: 180 },
  { id: 'hanna', name: '4 cards discarded: +40 Chips', played: 'KS KH', setup: (r) => (r.round!.cardsDiscarded = 4), total: 140 },
  { id: 'tuta', name: 'first score is not changed (bonus is for later hands)', played: 'KS KH', total: 60 },
  { id: 'anita', name: 'stored +4 Mult', jokers: [st('anita', { mult: 4 })], played: 'KS KH', total: 180 },
  { id: 'templeton', name: 'Aces +15 Chips each', played: 'AS AH', total: (10 + 22 + 30) * 2 },
  { id: 'gilbert', name: 'skipped this Ante: X1.3', played: 'KS KH', setup: (r) => (r.anteState.skipped = true), total: 78 },
  { id: 'gilbert', name: 'no skip', played: 'KS KH', total: 60 },
  { id: 'bolgan', name: 'Three of a Kind: +40 Chips', played: 'KS KH KC', total: (30 + 30 + 40) * 3 },
  { id: 'bolgan', name: 'Pair: nothing', played: 'KS KH', total: 60 },
  { id: 'eilie', name: 'exactly 2 cards: +6 Mult', played: 'KS KH', total: 240 },
  { id: 'eilie', name: '3 cards: nothing', played: 'KS KH 2C', total: 60 },
  // Chapter 2
  { id: 'flik', name: 'first hand: X1.5', played: 'KS KH', total: 90 },
  { id: 'flik', name: 'second hand: nothing', played: 'KS KH', opts: { handsPlayed: 2 }, total: 60 },
  { id: 'viktor', name: 'final hand: X1.5', played: 'KS KH', opts: { handsLeft: 0 }, total: 90 },
  { id: 'viktor', name: 'not final', played: 'KS KH', total: 60 },
  { id: 'freed_yamamoto', name: 'retrigger 10s', played: '10S 10H', total: (10 + 20 + 20) * 2 },
  { id: 'yoshino_yamamoto', name: 'Jacks +10 Chips', played: 'JS JH', total: (10 + 20 + 20) * 2 },
  { id: 'barbara', name: '+4 Mult per Heart', played: 'KS KH', total: 30 * 6 },
  { id: 'huan', name: '+4 Mult per Club', played: 'KS KC', total: 30 * 6 },
  { id: 'leona', name: '+4 Mult per Spade', played: 'KS KH', total: 30 * 6 },
  { id: 'luc', name: '5 Runes used: X1.5', played: 'KS KH', setup: (r) => (r.stats.runesUsed = 5), total: 90 },
  { id: 'amada', name: 'High Card: +30 Chips', played: 'KS', total: 5 + 10 + 30 },
  { id: 'amada', name: 'Pair: nothing', played: 'KS KH', total: 60 },
  { id: 'yam_koo', name: '20 Potch: +8 Mult', played: 'KS KH', setup: (r) => (r.money = 20), total: 30 * 10 },
  { id: 'yam_koo', name: '200 Potch: capped at +20', played: 'KS KH', setup: (r) => (r.money = 200), total: 30 * 22 },
  { id: 'oulan', name: 'Queens +8 Mult', played: 'QS QH', total: 30 * 18 },
  { id: 'clive', name: 'final hand: X2', played: 'KS KH', opts: { handsLeft: 0 }, total: 120 },
  { id: 'clive', name: 'not final', played: 'KS KH', total: 60 },
  // Chapter 3
  { id: 'taki', name: 'Straight: +12 Mult', played: '9S 10H JC QD KS', total: (30 + 49) * 16 },
  { id: 'tetsu', name: '5 cards: +6 Mult', played: 'KS KH 2C 3D 5S', total: 30 * 8 },
  { id: 'tetsu', name: '2 cards: nothing', played: 'KS KH', total: 60 },
  { id: 'chaco', name: '+20 Chips', played: 'KS KH', total: 100 },
  { id: 'ridley_wizen', name: 'Pair: X1.5', played: 'KS KH', total: 90 },
  { id: 'ridley_wizen', name: 'Three of a Kind: nothing', played: 'KS KH KC', total: 60 * 3 },
  { id: 'sid', name: '2s +15 Chips each', played: '2S 2H', total: (10 + 4 + 30) * 2 },
  { id: 'gabocha', name: '+20 Chips', played: 'KS KH', total: 100 },
  { id: 'gadget', name: 'stored +3 Mult', jokers: [st('gadget', { mult: 3 })], played: 'KS KH', total: 150 },
  { id: 'meg', name: 'earns 1 Potch per hand', played: 'KS KH', total: 60, money: 1 },
  { id: 'wakaba', name: 'Ante 1: +2 Mult', played: 'KS KH', total: 120 },
  { id: 'wakaba', name: 'Ante 3: +6 Mult', played: 'KS KH', setup: (r) => (r.ante = 3), total: 240 },
  { id: 'tony', name: 'first scoring card retriggers twice', played: 'KS KH', total: (10 + 30 + 10) * 2 },
  { id: 'hix', name: '+4 Mult per enhanced card', played: [c('KS', { enh: 'mult' }), c('KH')], total: 30 * 10 },
  { id: 'tengaar', name: '+30 Chips per enhanced card', played: [c('KS', { enh: 'mult' }), c('KH')], total: 60 * 6 },
  { id: 'yuzu', name: 'one rank: +10 Chips', played: 'KS KH', total: 80 },
  { id: 'yuzu', name: 'two ranks: +20 Chips', played: 'KS KH 3S 3H', total: (20 + 26 + 20) * 2 },
  // Chapter 4
  { id: 'teresa_wisemail', name: 'Face cards held: +1 Potch each', played: 'KS KH', held: cards('QS JD 2C'), total: 60, money: 2 },
  { id: 'nina', name: '+30 Chips per scoring Face', played: 'KS KH', total: 90 * 2 },
  { id: 'nina', name: 'no Face', played: '2S 2H', total: 14 * 2 },
  { id: 'shin', name: '+10 Mult', played: 'KS KH', total: 360 },
  { id: 'camus', name: '+15 Chips per Club', played: 'KS KC', total: 45 * 2 },
  { id: 'miklotov', name: '+15 Chips per Spade', played: 'KS KH', total: 45 * 2 },
  { id: 'kiba_windamier', name: 'Flush: X2', played: '2H 4H 6H 8H 10H', total: 65 * 8 },
  { id: 'kiba_windamier', name: 'not a Flush', played: 'KS KH', total: 60 },
  { id: 'klaus', name: 'Flush: +40 Chips', played: '2H 4H 6H 8H 10H', total: 105 * 4 },
  { id: 'klaus', name: 'not a Flush', played: 'KS KH', total: 60 },
  { id: 'badeaux', name: 'Shiro +50%: +6 Mult', jokers: ['badeaux', 'shiro'], played: 'KS KH', total: 30 * 8 },
  { id: 'badeaux', name: 'alone: nothing', played: 'KS KH', total: 60 },
  { id: 'connell', name: 'Pair: +1 Potch', played: 'KS KH', total: 60, money: 1 },
  { id: 'connell', name: 'High Card: nothing', played: 'KS', total: 15, money: 0 },
  { id: 'ayda', name: '1 Beast (Feather, not adjacent): +25 Chips', jokers: ['ayda', 'zamza', 'feather'], played: 'KS KH', total: 55 * 2 },
  { id: 'ayda', name: 'no Beast', played: 'KS KH', total: 60 },
  { id: 'sigfried', name: 'all red: X1.8', played: 'KH KD', total: 108 },
  { id: 'sigfried', name: 'a Spade scores: nothing', played: 'KS KH', total: 60 },
  { id: 'abizboah', name: 'Four of a Kind: X2', played: 'KS KH KC KD', total: 100 * 14 },
  { id: 'abizboah', name: 'Full House: X2', played: 'KS KH KC 2S 2H', total: (40 + 34) * 8 },
  { id: 'simone_verdricci', name: '+4 Mult per Heart', played: 'KS KH', total: 180 },
  { id: 'kasumi', name: '+8 Mult', played: 'KS KH', total: 300 },
  { id: 'valeria', name: 'X1.5', played: 'KS KH', total: 90 },
  // Chapter 5
  { id: 'sheena', name: '3 Bosses: +6 Mult', played: 'KS KH', setup: (r) => (r.stats.bossesDefeated = 3), total: 240 },
  { id: 'mondo', name: 'retrigger first played card', played: 'KS KH', total: 40 * 2 },
  { id: 'sasuke', name: 'retrigger last played card', played: 'KS KH', total: 40 * 2 },
  { id: 'sasuke', name: 'last card does not score', played: 'KS KH 2C', total: 60 },
  { id: 'bob', name: '20 in Collection: +6 Mult', played: 'KS KH', setup: (r) => (r.discovered.owned = JOKER_LIST.slice(0, 20).map((j) => j.id)), total: 240 },
  { id: 'bob', name: '9 in Collection: nothing', played: 'KS KH', setup: (r) => (r.discovered.owned = JOKER_LIST.slice(0, 9).map((j) => j.id)), total: 60 },
  { id: 'tomo', name: 'Stone card +20 Chips', played: [c('KS'), c('2H', { enh: 'stone' })], total: 5 + 10 + 50 + 20 },
  { id: 'annallee', name: '3 Jokers: +6 Mult', jokers: ['annallee', 'zamza', 'chaco'], played: 'KS KH', total: 50 * 8 },
  { id: 'killey', name: '+10 Mult', played: 'KS KH', total: 360 },
  { id: 'karen', name: 'first hand counts as different: +15 Chips', played: 'KS KH', total: 90 },
  { id: 'karen', name: 'same type as last hand', played: 'KS KH', setup: (r) => (r.stats.lastHandType = 'pair'), total: 60 },
  { id: 'maximillian', name: 'contains an Ace: +25 Chips', played: 'AS AH', total: 57 * 2 },
  { id: 'maximillian', name: 'Ace that does not score still counts', played: 'KS KH AC', total: 55 * 2 },
  { id: 'hoi', name: '0 discards left: +12 Mult', played: 'KS KH', opts: { discardsLeft: 0 }, total: 30 * 14 },
  { id: 'hoi', name: 'discards left', played: 'KS KH', total: 60 },
  { id: 'long_chan_chan', name: 'after first discard: +10 Mult', played: 'KS KH', setup: (r) => (r.round!.discardsUsed = 1), total: 360 },
  { id: 'long_chan_chan', name: 'no discard yet', played: 'KS KH', total: 60 },
  { id: 'tenkou', name: 'retrigger 5s', played: '5S 5H', total: 30 * 2 },
  // Chapter 6
  { id: 'gijimu', name: '5 Bosses: +5 Mult', played: 'KS KH', setup: (r) => (r.stats.bossesDefeated = 5), total: 30 * 7 },
  { id: 'gijimu', name: 'capped at +30', played: 'KS KH', setup: (r) => (r.stats.bossesDefeated = 50), total: 30 * 32 },
  { id: 'hauser', name: '2 Bosses: +60 Chips', played: 'KS KH', setup: (r) => (r.stats.bossesDefeated = 2), total: 90 * 2 },
  { id: 'hauser', name: 'capped at +300', played: 'KS KH', setup: (r) => (r.stats.bossesDefeated = 20), total: 330 * 2 },
  { id: 'kahn_marley', name: '+6 Mult', played: 'KS KH', total: 240 },
  { id: 'koyu', name: '+40 Chips', played: 'KS KH', total: 140 },
  { id: 'sierra_mikain', name: 'Boss: X2', played: 'KS KH', opts: { bossId: 'yuber' }, total: 120 },
  { id: 'sierra_mikain', name: 'not Boss', played: 'KS KH', total: 60 },
  // King scores twice: (5 + 10 + 10) x (1 x 5) = 125
  { id: 'georg_prime', name: '1 card: retrigger + X5', played: 'KS', total: 125 },
  { id: 'georg_prime', name: '2 cards: nothing', played: 'KS KH', total: 60 },
  // score() adds the 2 played cards to the 52-card deck: 54 cards x 4 = +216 Chips.
  { id: 'gantetsu', name: '+4 Chips per card in deck', played: 'KS KH', total: (30 + 216) * 2 },
  { id: 'boris_wizen', name: 'Two Pair: X1.5', played: 'KS KH 3S 3H', total: 46 * 3 },
  { id: 'boris_wizen', name: 'Pair: nothing', played: 'KS KH', total: 60 },
  { id: 'pico', name: '+15 Chips', played: 'KS KH', total: 90 },
  { id: 'alberto', name: '+4 Mult', played: 'KS KH', total: 180 },
  { id: 'jude', name: '2 Stone cards in deck: +60 Chips', played: 'KS KH', held: [c('2C', { enh: 'stone' }), c('3C', { enh: 'stone' })], total: 90 * 2 },
  { id: 'vincent', name: '+4 Mult per Diamond', played: 'KS KD', total: 180 },
  { id: 'genshu', name: 'most played hand (Pair) Lv3: +6 Mult', played: 'KS', setup: (r) => (r.handLevels.pair = { level: 3, played: 5 }), total: 15 * 7 },
  { id: 'pesmerga', name: '0 Bosses: X1', played: 'KS KH', total: 60 },
  { id: 'pesmerga', name: '1 Boss: X1.5', played: 'KS KH', setup: (r) => (r.stats.bossesDefeated = 1), total: 90 },
  { id: 'pesmerga', name: '2 Bosses: X2.25', played: 'KS KH', setup: (r) => (r.stats.bossesDefeated = 2), total: 135 },
  { id: 'pesmerga', name: '5 Bosses: capped at X3', played: 'KS KH', setup: (r) => (r.stats.bossesDefeated = 5), total: 180 },
  { id: 'mazus', name: 'X3', played: 'KS KH', total: 180 },
];

describe('Joker scoring effects', () => {
  it.each(CASES.map((k) => [`${k.id}: ${k.name}`, k] as const))('%s', (_n, k) => {
    const run = roundRun(k.jokers ?? [k.id], k.opts);
    k.setup?.(run);
    const played = typeof k.played === 'string' ? cards(k.played) : k.played;
    const res = score(run, played, k.held ?? []);
    expect(res.total).toBe(k.total);
    if (k.money !== undefined) expect(res.money).toBe(k.money);
  });

  it('Tuta: first scoring card gains +3 Chips forever', () => {
    const run = roundRun(['tuta']);
    const played = cards('KS KH');
    expect(score(run, played).total).toBe(60);
    expect(played[0].bonusChips).toBe(3);
    expect(played[1].bonusChips).toBe(0);
    expect(computeAgain(run, played)).toBe((10 + 13 + 10) * 2);
    expect(played[0].bonusChips).toBe(6);
  });

  it('Meg: at most 4 Potch per round', () => {
    const run = roundRun(['meg']);
    let money = 0;
    for (let i = 0; i < 6; i++) money += score(run, cards('KS KH')).money;
    expect(money).toBe(4);
  });

  it('Tai Ho: every roll gives one of the four Chinchirorin results', () => {
    const seen = new Set<number>();
    for (let s = 0; s < 60; s++) {
      const run = roundRun(['tai_ho']);
      run.rng.s = s * 7919;
      seen.add(score(run, cards('KS KH')).total);
    }
    expect([...seen].sort((a, b) => a - b)).toEqual([60, 120, 360, 660]);
  });

  it('Richmond: X1.8 or nothing', () => {
    const seen = new Set<number>();
    for (let s = 0; s < 40; s++) {
      const run = roundRun(['richmond']);
      run.rng.s = s * 7919;
      seen.add(score(run, cards('KS KH')).total);
    }
    expect([...seen].sort((a, b) => a - b)).toEqual([60, 108]);
  });

  it('Shilo: +5 Potch or nothing', () => {
    const seen = new Set<number>();
    for (let s = 0; s < 40; s++) {
      const run = roundRun(['shilo']);
      run.rng.s = s * 7919;
      const res = score(run, cards('KS KH'));
      expect(res.total).toBe(60);
      seen.add(res.money);
    }
    expect([...seen].sort((a, b) => a - b)).toEqual([0, 5]);
  });
});

/** Score the same cards again (no deck push), for permanent-chip checks. */
function computeAgain(run: RunState, played: Card[]): number {
  return score(run, played).total;
}

// ------------------------------------------------------------------ passives

describe('Joker passive effects', () => {
  const base = computePassives(freshRun());
  const p = (ids: string[]) => computePassives(runWith(ids));

  it('Mukumuku: +1 discard', () => expect(p(['mukumuku']).discards).toBe(base.discards + 1));
  it('Apple: preview 3 cards', () => expect(p(['apple']).previewCount).toBe(3));
  it('Alex: rerolls cost 1 less', () => expect(p(['alex']).rerollMinus).toBe(1));
  it('Hans: Jokers cost 1 less', () => {
    expect(p(['hans']).jokerPriceMinus).toBe(1);
    const item = { kind: 'joker' as const, joker: joker('zamza') };
    expect(itemPrice(item, p(['hans']))).toBe(itemPrice(item, base) - 1);
  });
  it('Stallion: +1 hand', () => expect(p(['stallion']).hands).toBe(base.hands + 1));
  it('Emilia: +1 consumable slot', () => expect(p(['emilia']).consumableSlots).toBe(base.consumableSlots + 1));
  it('Feather: +1 hand size', () => expect(p(['feather']).handSize).toBe(base.handSize + 1));
  it('Gordon: 1 Potch per 4 held, cap 10', () => {
    const g = p(['gordon']);
    expect(g.interestPer).toBe(4);
    expect(g.interestCap).toBe(10);
  });
  it('Shu: reveals bosses and gives 1 boss reroll', () => {
    const s = p(['shu']);
    expect(s.revealBosses).toBe(true);
    expect(s.bossRerolls).toBe(1);
  });
});

// ------------------------------------------------------------------ run events through the reducer

describe('Joker round-end effects (reducer)', () => {
  it('Rikimaru: -1 Potch at end of round', () => {
    const run = runWith(['rikimaru']);
    start(run);
    expect(line(win(run), 'Rikimaru is hungry')).toBe(-1);
  });

  it('Millie: +1 Potch per Beast Joker', () => {
    const run = runWith(['millie', 'shiro', 'sigfried']);
    start(run);
    expect(line(win(run), 'Millie')).toBe(2);
  });

  it('Zamza: +2 Potch', () => {
    const run = runWith(['zamza']);
    start(run);
    expect(line(win(run), 'Zamza')).toBe(2);
  });

  it('Adlai: +3 Potch when the blind is won with 1 hand', () => {
    const run = runWith(['adlai']);
    start(run);
    expect(line(win(run), 'Adlai')).toBe(3);
  });

  it('Adlai: nothing when 2 hands were used', () => {
    const run = runWith(['adlai']);
    start(run);
    run.target = 1e9;
    act(run, { type: 'play', cardIds: [run.hand[0]] });
    expect(line(win(run), 'Adlai')).toBeUndefined();
  });

  it('Clive: +5 Potch when the final hand wins', () => {
    const run = runWith(['clive']);
    start(run);
    run.round!.handsLeft = 1;
    const m = run.money;
    win(run);
    expect(run.money).toBe(m + 5);
  });

  it('Fitcher: +1 Potch per Joker owned', () => {
    const run = runWith(['fitcher', 'zamza']);
    start(run);
    expect(line(win(run), 'Fitcher')).toBe(2);
  });

  it('Fitcher: capped at 6', () => {
    const run = runWith(['fitcher', 'zamza', 'koyu', 'chaco', 'pico', 'alberto', 'killey', 'mazus']);
    start(run);
    expect(line(win(run), 'Fitcher')).toBe(6);
  });

  it('Stallion: +3 Potch with 0 discards used, none after a discard', () => {
    const a = runWith(['stallion']);
    start(a);
    expect(line(win(a), 'Stallion')).toBe(3);
    const b = runWith(['stallion']);
    start(b);
    act(b, { type: 'discard', cardIds: [b.hand[0]] });
    expect(line(win(b), 'Stallion')).toBeUndefined();
  });

  it('Hai Yo: +2 Potch and +1 hand next round if no Blind was skipped', () => {
    const run = runWith(['hai_yo']);
    start(run);
    expect(line(win(run), 'Hai Yo')).toBe(2);
    toShop(run);
    act(run, { type: 'leaveShop' });
    start(run, 1);
    expect(run.round!.handsLeft).toBe(5);
  });

  it('Hai Yo: nothing after a skip', () => {
    const run = runWith(['hai_yo']);
    act(run, { type: 'skipBlind' });
    start(run, 1);
    expect(line(win(run), 'Hai Yo')).toBeUndefined();
  });

  it('Jeane: creates a Rune at end of round', () => {
    const run = runWith(['jeane']);
    start(run);
    win(run);
    expect(run.consumables.length).toBe(1);
  });

  it('Futch: +2 Potch per Boss defeated, max 8', () => {
    const run = runWith(['futch']);
    run.stats.bossesDefeated = 2;
    start(run);
    expect(line(win(run), 'Futch')).toBe(4);
    const big = runWith(['futch']);
    big.stats.bossesDefeated = 9;
    start(big);
    expect(line(win(big), 'Futch')).toBe(8);
  });

  it('Lebrante: every Joker sell value +1', () => {
    const run = runWith(['lebrante', 'zamza']);
    start(run);
    win(run);
    expect(run.jokers.map((j) => j.sellBonus)).toEqual([1, 1]);
  });

  it('Gordon: interest 1 per 4 Potch, up to 10', () => {
    const run = runWith(['gordon']);
    start(run);
    run.money = 40;
    expect(line(win(run), 'Interest')).toBe(10);
    const plain = runWith([]);
    start(plain);
    plain.money = 40;
    expect(line(win(plain), 'Interest')).toBe(5);
  });

  it('Tessai: upgrades the most played hand every 2 rounds', () => {
    const run = runWith(['tessai']);
    run.handLevels.flush.played = 9;
    fire(run, 'tessai', 'onRoundEnd');
    expect(run.handLevels.flush.level).toBe(1);
    fire(run, 'tessai', 'onRoundEnd');
    expect(run.handLevels.flush.level).toBe(2);
  });
});

describe('Joker Boss effects (reducer)', () => {
  const levelSum = (run: RunState) => Object.values(run.handLevels).reduce((s, h) => s + h.level, 0);

  it('Tsai: upgrades a random hand after a Boss', () => {
    const run = runWith(['tsai']);
    start(run, 2);
    const before = levelSum(run);
    win(run);
    expect(levelSum(run)).toBe(before + 1);
  });

  it('Tsai: nothing after a normal blind', () => {
    const run = runWith(['tsai']);
    start(run);
    const before = levelSum(run);
    win(run);
    expect(levelSum(run)).toBe(before);
  });

  it('Lo Wen: +3 Potch after a Boss', () => {
    const run = runWith(['lo_wen']);
    start(run, 2);
    expect(line(win(run), 'Lo Wen')).toBe(3);
  });

  it('Anita: resets on Boss defeat', () => {
    const run = runWith([st('anita', { mult: 6 })]);
    start(run, 2);
    win(run);
    expect(run.jokers[0].state.mult).toBe(0);
  });
});

describe('Joker round-start effects (reducer)', () => {
  it('Rina: creates a Rune when a Boss Blind is selected', () => {
    const run = runWith(['rina']);
    start(run, 2);
    expect(run.consumables.length).toBe(1);
    const n = runWith(['rina']);
    start(n);
    expect(n.consumables.length).toBe(0);
  });

  it('Kasumi: +1 hand on the first round of the Ante only', () => {
    const run = runWith(['kasumi']);
    start(run);
    expect(run.round!.handsLeft).toBe(5);
    win(run);
    toShop(run);
    act(run, { type: 'leaveShop' });
    start(run, 1);
    expect(run.round!.handsLeft).toBe(4);
  });

  it('Marlowe: +1 discard in Boss Blinds', () => {
    const run = runWith(['marlowe']);
    start(run, 2);
    expect(run.round!.discardsLeft).toBe(4);
    const n = runWith(['marlowe']);
    start(n);
    expect(n.round!.discardsLeft).toBe(3);
  });

  it('Viki: the +5 Potch round effect pays at round start', () => {
    const run = runWith([joker('viki', { state: { roundKey: 10, effect: 2 } })]);
    const m = run.money;
    start(run);
    expect(run.money).toBe(m + 5);
  });

  it('Mukumuku: round starts with 4 discards', () => {
    const run = runWith(['mukumuku']);
    start(run);
    expect(run.round!.discardsLeft).toBe(4);
  });

  it('Feather: 9 cards dealt', () => {
    const run = runWith(['feather']);
    start(run);
    expect(run.hand.length).toBe(9);
  });

  it('Stallion: round starts with 5 hands', () => {
    const run = runWith(['stallion']);
    start(run);
    expect(run.round!.handsLeft).toBe(5);
  });

  it('Apple: preview count read at round start', () => {
    const run = runWith(['apple']);
    start(run);
    expect(computePassives(run).previewCount).toBe(3);
  });
});

describe('Joker shop and sell effects (reducer)', () => {
  function shopRun(ids: J[]): RunState {
    const run = runWith(ids);
    start(run);
    win(run);
    toShop(run);
    return run;
  }

  it('Anita: +2 Mult after leaving a shop without buying', () => {
    const run = shopRun(['anita']);
    act(run, { type: 'leaveShop' });
    expect(run.jokers[0].state.mult).toBe(2);
  });

  it('Anita: nothing if something was bought', () => {
    const run = shopRun(['anita']);
    run.shop!.boughtAny = true;
    act(run, { type: 'leaveShop' });
    expect(run.jokers[0].state.mult ?? 0).toBe(0);
  });

  it('Gadget: +1 Mult per reroll', () => {
    const run = shopRun(['gadget']);
    act(run, { type: 'reroll' });
    act(run, { type: 'reroll' });
    expect(run.jokers[0].state.mult).toBe(2);
  });

  it('Hilda: +1 Potch per reroll', () => {
    const run = shopRun(['hilda']);
    const cost = run.shop!.rerollCost;
    act(run, { type: 'reroll' });
    expect(run.money).toBe(100 - cost + 1);
  });

  it('Alex: rerolls cost 1 less', () => {
    const run = shopRun(['alex']);
    const cost = run.shop!.rerollCost;
    act(run, { type: 'reroll' });
    expect(run.money).toBe(100 - (cost - 1));
  });

  it('Humphrey: +3 Potch extra when selling another Joker', () => {
    const run = shopRun(['humphrey_mintz', 'zamza']);
    const z = run.jokers[1];
    const v = sellValue(z);
    act(run, { type: 'sellJoker', uid: z.uid });
    expect(run.money).toBe(100 + v + 3);
  });

  it('Jess: skipping a Blind gives the Spoil twice', () => {
    const run = runWith(['jess']);
    run.anteState.spoils = ['investment', 'investment'];
    act(run, { type: 'skipBlind' });
    expect(run.investment).toBe(30);
    const plain = runWith([]);
    plain.anteState.spoils = ['investment', 'investment'];
    act(plain, { type: 'skipBlind' });
    expect(plain.investment).toBe(15);
  });

  it('Gilbert: skipping through the reducer turns on X1.3', () => {
    const run = runWith(['gilbert']);
    act(run, { type: 'skipBlind' });
    start(run, 1);
    expect(score(run, cards('KS KH')).total).toBe(78);
  });
});

describe('Joker consumable effects (reducer)', () => {
  /** Use a Rune from the consumable area. Turtle doubles Potch (max +20); Falcon makes Forging cards. */
  function useRune(run: RunState, id = 'turtle'): void {
    const uid = 99_000 + run.nextId++;
    run.consumables.push({ uid, id });
    act(run, { type: 'useConsumable', uid, cardIds: [] });
  }
  const useTurtle = (run: RunState) => useRune(run, 'turtle');

  it('Lorelai: +1 Potch per Rune', () => {
    const run = runWith(['lorelai']);
    run.money = 4;
    useTurtle(run);
    expect(run.money).toBe(4 + 4 + 1);
  });

  it('Lorelai: max 5 Potch per round', () => {
    const run = runWith(['lorelai']);
    run.money = 0;
    run.consumables = [];
    for (let i = 0; i < 7; i++) useRune(run, 'falcon');
    expect(run.money).toBe(5);
  });

  it('Raura: +2 Potch per Rune', () => {
    const run = runWith(['raura']);
    run.money = 4;
    useTurtle(run);
    expect(run.money).toBe(4 + 4 + 2);
  });

  it('Sierra: Runes are doubled', () => {
    const run = runWith(['sierra_mikain']);
    run.money = 4;
    useTurtle(run);
    expect(run.money).toBe(16);
  });

  it('Luc: X Mult grows with Runes used', () => {
    const run = runWith(['luc']);
    useTurtle(run);
    useTurtle(run);
    start(run);
    expect(score(run, cards('KS KH')).total).toBe(72);
  });
});

describe('Joker collection and pool rules', () => {
  it('Mazus: appears only with 100 Jokers in the Collection', () => {
    const run = freshRun();
    run.discovered.owned = JOKER_LIST.slice(0, 99).map((j) => j.id);
    expect(isJokerAvailable(run, 'mazus')).toBe(false);
    run.discovered.owned = JOKER_LIST.slice(0, 100).map((j) => j.id);
    expect(isJokerAvailable(run, 'mazus')).toBe(true);
  });

  it('Luca Blight: locked until unlocked', () => {
    const run = freshRun();
    expect(isJokerAvailable(run, 'luca_blight')).toBe(false);
    run.unlocked.push('luca_blight');
    expect(isJokerAvailable(run, 'luca_blight')).toBe(true);
  });
});

describe('coverage', () => {
  // Jokers tested only in the run-event blocks above (not in the scoring table).
  const EVENT_TESTED = [
    'mukumuku', 'millie', 'zamza', 'apple', 'tsai', 'rina', 'alex', 'hilda', 'adlai', 'hans', 'fitcher',
    'stallion', 'hai_yo', 'shilo', 'richmond', 'tai_ho', 'emilia', 'jeane', 'futch', 'humphrey_mintz',
    'feather', 'lebrante', 'lorelai', 'gordon', 'raura', 'lo_wen', 'marlowe', 'jess', 'tessai',
  ];

  it('every Joker has a test in this file', () => {
    const tested = new Set([...CASES.map((k) => k.id), ...EVENT_TESTED]);
    expect(JOKER_LIST.filter((j) => !tested.has(j.id)).map((j) => j.id)).toEqual([]);
  });
});
