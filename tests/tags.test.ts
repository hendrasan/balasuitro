import { afterEach, describe, expect, it } from 'vitest';
import { CONFIG } from '../src/engine/config';
import { computePassives } from '../src/engine/passives';
import { activeTiers, hasTier, tagCounts } from '../src/engine/jokers/tags';
import type { RunState } from '../src/engine/state';
import { act, cards, freshRun, joker, roundRun, score } from './helpers';

function runWith(ids: string[]): RunState {
  const run = freshRun();
  run.jokers = ids.map((id) => joker(id));
  return run;
}
const tiersOf = (run: RunState, tag: string) => activeTiers(run).filter((t) => t.tag.id === tag).map((t) => t.count);
const tagEvents = (run: RunState, tag: string, played = 'KS KH') =>
  score(run, cards(played)).events.filter((e) => e.tagId === tag).map((e) => [e.kind, e.value]);

const VH = ['gijimu', 'hauser', 'kahn_marley', 'koyu', 'lo_wen', 'marlowe', 'sierra_mikain'];
const SWORD = ['rikimaru', 'amada', 'flik', 'viktor', 'pesmerga'];

describe('tier thresholds', () => {
  it('count - 1 is inactive, count is active', () => {
    expect(tiersOf(runWith(['mukumuku']), 'kyaro')).toEqual([]);
    expect(tiersOf(runWith(['mukumuku', 'nanami']), 'kyaro')).toEqual([2]);
    expect(tiersOf(runWith(['gabocha', 'gengen']), 'kobold')).toEqual([2]);
    expect(tiersOf(runWith(['gabocha', 'gengen', 'bob']), 'kobold')).toEqual([2, 3]);
  });
  it('a tier changes passives at its edge (Beast 2: +1 discard)', () => {
    // Shiro and Feather are Beast; Feather also gives +1 hand size.
    expect(computePassives(runWith(['shiro'])).discards).toBe(CONFIG.discards);
    expect(computePassives(runWith(['shiro', 'feather'])).discards).toBe(CONFIG.discards + 1);
  });
  it('tiers are cumulative (Kyaro 2 hand bonus stays at 4)', () => {
    const run = runWith(['mukumuku', 'nanami', 'riou', 'jowy_atreides']);
    expect(tagCounts(run).kyaro).toBe(4);
    expect(tiersOf(run, 'kyaro')).toEqual([2, 4]);
    expect(computePassives(run).hands).toBeGreaterThanOrEqual(CONFIG.hands + 1);
  });
  it('Highland 2 and 4 both apply', () => {
    const run = roundRun(['kiba_windamier', 'klaus', 'gilbert', 'pesmerga']);
    expect(tagEvents(run, 'highland')).toEqual([['mult', 15], ['xmult', 1.5]]);
  });
});

describe('replacement tiers', () => {
  it('Vampire Hunter 6 replaces 4 in Boss Blinds', () => {
    const four = roundRun(VH.slice(0, 4), { bossId: 'seed' });
    expect(tagEvents(four, 'vampire_hunter', '9H 9D')).toEqual([['xmult', 1.5]]);
    const five = roundRun(VH.slice(0, 5), { bossId: 'seed' });
    expect(tagEvents(five, 'vampire_hunter', '9H 9D')).toEqual([['xmult', 1.5]]);
    const six = roundRun(VH.slice(0, 6), { bossId: 'seed' });
    expect(tiersOf(six, 'vampire_hunter')).toEqual([2, 4, 6]);
    expect(tagEvents(six, 'vampire_hunter', '9H 9D')).toEqual([['xmult', 2]]);
  });
  it('Vampire Hunter X Mult is only in Boss Blinds', () => {
    const run = roundRun(VH.slice(0, 6));
    expect(tagEvents(run, 'vampire_hunter')).toEqual([]);
  });
  it('Swordsman 4 replaces the +10 Mult of tier 2', () => {
    const two = roundRun(SWORD.slice(0, 2), { handsPlayed: 1 });
    expect(tagEvents(two, 'swordsman')).toEqual([['mult', 10]]);
    const three = roundRun(SWORD.slice(0, 3), { handsPlayed: 1 });
    expect(tagEvents(three, 'swordsman')).toEqual([['mult', 10]]);
    const four = roundRun(SWORD.slice(0, 4), { handsPlayed: 1 });
    expect(tagEvents(four, 'swordsman')).toEqual([['xmult', 1.5]]);
  });
  it('Swordsman applies only on the first hand', () => {
    const run = roundRun(SWORD.slice(0, 4), { handsPlayed: 2 });
    expect(tagEvents(run, 'swordsman')).toEqual([]);
  });
});

describe('selling a member mid-run', () => {
  it('drops the tier at once', () => {
    const run = runWith(VH.slice(0, 6));
    expect(tiersOf(run, 'vampire_hunter')).toEqual([2, 4, 6]);
    act(run, { type: 'sellJoker', uid: run.jokers[0].uid });
    expect(tiersOf(run, 'vampire_hunter')).toEqual([2, 4]);
    act(run, { type: 'sellJoker', uid: run.jokers[0].uid });
    act(run, { type: 'sellJoker', uid: run.jokers[0].uid });
    expect(tiersOf(run, 'vampire_hunter')).toEqual([2]);
  });
  it('selling drops a passive tier (Mage 2: +1 consumable slot)', () => {
    const run = runWith(['luc', 'raura']);
    expect(computePassives(run).consumableSlots).toBe(CONFIG.consumableSlots + 1);
    act(run, { type: 'sellJoker', uid: run.jokers[1].uid });
    expect(computePassives(run).consumableSlots).toBe(CONFIG.consumableSlots);
  });
  it('a debuffed Joker does not count', () => {
    const run = roundRun(['shiro', 'feather'], { bossId: 'jowy_boss' });
    expect(hasTier(run, 'beast', 2)).toBe(true);
    run.round!.debuffedJokerUid = run.jokers[1].uid;
    expect(hasTier(run, 'beast', 2)).toBe(false);
  });
});

describe('CONFIG.copiesCountForTags', () => {
  const saved = CONFIG.copiesCountForTags;
  afterEach(() => {
    CONFIG.copiesCountForTags = saved;
  });

  it('false: Jowy counts only his own tags', () => {
    CONFIG.copiesCountForTags = false;
    const run = runWith(['jowy_atreides', 'shiro']);
    expect(tagCounts(run).beast).toBe(1);
    expect(tagCounts(run).kyaro).toBe(1);
    expect(hasTier(run, 'beast', 2)).toBe(false);
  });

  it('true: Jowy also counts the tags of the Joker he copies', () => {
    CONFIG.copiesCountForTags = true;
    const run = runWith(['jowy_atreides', 'shiro']);
    expect(tagCounts(run).beast).toBe(2);
    expect(hasTier(run, 'beast', 2)).toBe(true);
    // A tag Jowy already has is not counted twice.
    const k = runWith(['jowy_atreides', 'mukumuku']);
    expect(tagCounts(k).kyaro).toBe(2);
  });

  it('true: no copy when nobody is to his right, or when the target is debuffed', () => {
    CONFIG.copiesCountForTags = true;
    expect(tagCounts(runWith(['shiro', 'jowy_atreides'])).beast).toBe(1);
    const run = roundRun(['jowy_atreides', 'shiro'], { bossId: 'jowy_boss' });
    run.round!.debuffedJokerUid = run.jokers[1].uid;
    expect(tagCounts(run).beast ?? 0).toBe(0);
  });

  it('the flag is restored after each test', () => {
    expect(CONFIG.copiesCountForTags).toBe(saved);
  });
});
