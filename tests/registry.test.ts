import { describe, expect, it } from 'vitest';
import { BOND_LIST, JOKER_LIST, JOKERS, TAG_LIST, TAGS } from '../src/engine/data';
import { BEHAVIORS } from '../src/engine/jokers/registry';
import { BOND_BEHAVIORS } from '../src/engine/jokers/bonds';
import { TAG_BEHAVIORS } from '../src/engine/jokers/tags';

describe('registry', () => {
  it('has 113 Jokers with unique ids', () => {
    expect(JOKER_LIST.length).toBe(113);
    expect(new Set(JOKER_LIST.map((j) => j.id)).size).toBe(113);
  });

  it('every Joker in jokers.json has a behavior', () => {
    const missing = JOKER_LIST.filter((j) => !(j.id in BEHAVIORS)).map((j) => j.id);
    expect(missing).toEqual([]);
  });

  it('every behavior has a Joker in jokers.json', () => {
    const extra = Object.keys(BEHAVIORS).filter((id) => !JOKERS[id]);
    expect(extra).toEqual([]);
  });

  it('every Joker tag exists in tags.json', () => {
    const bad = JOKER_LIST.flatMap((j) => j.tags.filter((t) => !TAGS[t]).map((t) => `${j.id}:${t}`));
    expect(bad).toEqual([]);
  });

  it('every bond member is a real Joker and every bond has a behavior', () => {
    const bad = BOND_LIST.flatMap((b) => b.members.filter((m) => !JOKERS[m]).map((m) => `${b.id}:${m}`));
    expect(bad).toEqual([]);
    expect(BOND_LIST.filter((b) => !BOND_BEHAVIORS[b.id]).map((b) => b.id)).toEqual([]);
    expect(Object.keys(BOND_BEHAVIORS).filter((id) => !BOND_LIST.some((b) => b.id === id))).toEqual([]);
  });

  it('every tag tier has a behavior and every tag behavior has a tier', () => {
    const keys = TAG_LIST.flatMap((t) => t.tiers.map((x) => `${t.id}:${x.count}`));
    expect(keys.filter((k) => !TAG_BEHAVIORS[k])).toEqual([]);
    expect(Object.keys(TAG_BEHAVIORS).filter((k) => !keys.includes(k))).toEqual([]);
  });

  it('every tag has at least one member Joker', () => {
    const empty = TAG_LIST.filter((t) => !JOKER_LIST.some((j) => j.tags.includes(t.id))).map((t) => t.id);
    expect(empty).toEqual([]);
  });
});
