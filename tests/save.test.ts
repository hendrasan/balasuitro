import { describe, expect, it } from 'vitest';
import {
  buildExport, loadProfile, loadRun, memoryStorage, mergeDiscoveries, migrate, newProfile, parseImport,
  PROFILE_KEY, RUN_KEY, saveProfile, saveRun, SCHEMA_VERSION, type Profile,
} from '../src/engine/save';
import type { RunState } from '../src/engine/state';
import { act, freshRun } from './helpers';

/** A run in the middle of a round with some history. */
function midRun(): RunState {
  const run = freshRun('SAVE');
  act(run, { type: 'selectBlind' });
  act(run, { type: 'discard', cardIds: run.hand.slice(0, 2) });
  act(run, { type: 'play', cardIds: run.hand.slice(0, 5) });
  return run;
}

function richProfile(): Profile {
  const p = newProfile();
  p.collection = { seen: ['chaco', 'killey', 'riou'], owned: ['chaco'] };
  p.unlocks = ['luca_blight'];
  p.stats.runs = 3;
  p.stats.bestHand = 1234;
  p.settings.speed = 2;
  p.castle = { renown: 12, levels: { tavern: 2, forge: 1 }, hq: { level: 2, rooms: ['forge', 'library'] }, note: 'future keys are kept' };
  p.stats.handPlays = { pair: 14, flush: 3 };
  return p;
}

const plain = <T>(x: T): T => JSON.parse(JSON.stringify(x));

describe('storage round trip', () => {
  it('profile', () => {
    const s = memoryStorage();
    const p = richProfile();
    saveProfile(s, p);
    expect(loadProfile(s)).toStrictEqual(p);
  });
  it('a missing or corrupt profile gives a new profile', () => {
    const s = memoryStorage();
    expect(loadProfile(s)).toStrictEqual(newProfile());
    s.set(PROFILE_KEY, '{nope');
    expect(loadProfile(s)).toStrictEqual(newProfile());
    s.set(PROFILE_KEY, JSON.stringify({ schemaVersion: 1, collection: 3 }));
    expect(loadProfile(s)).toStrictEqual(newProfile());
  });
  it('run (mid-round, with RNG state) and the loaded run continues identically', () => {
    const s = memoryStorage();
    const run = midRun();
    saveRun(s, run);
    const loaded = loadRun(s)!;
    expect(loaded).toStrictEqual(plain(run));
    // Both continue the same way.
    act(run, { type: 'play', cardIds: run.hand.slice(0, 3) });
    act(loaded, { type: 'play', cardIds: loaded.hand.slice(0, 3) });
    expect(plain(loaded)).toStrictEqual(plain(run));
  });
  it('saving null removes the run', () => {
    const s = memoryStorage();
    saveRun(s, midRun());
    saveRun(s, null);
    expect(s.get(RUN_KEY)).toBeNull();
    expect(loadRun(s)).toBeNull();
  });
  it('a corrupt run loads as null', () => {
    const s = memoryStorage();
    s.set(RUN_KEY, '[]');
    expect(loadRun(s)).toBeNull();
    s.set(RUN_KEY, JSON.stringify({ schemaVersion: 1, run: { seed: 5 } }));
    expect(loadRun(s)).toBeNull();
  });
  it('stored objects carry schemaVersion', () => {
    const s = memoryStorage();
    saveProfile(s, newProfile());
    saveRun(s, freshRun());
    expect(JSON.parse(s.get(PROFILE_KEY)!).schemaVersion).toBe(SCHEMA_VERSION);
    expect(JSON.parse(s.get(RUN_KEY)!).schemaVersion).toBe(SCHEMA_VERSION);
  });
});

describe('export / import', () => {
  it('reproduces the profile and the run exactly', () => {
    const profile = richProfile();
    const run = midRun();
    const text = JSON.stringify(buildExport(profile, run, new Date('2026-01-02T03:04:05Z')));
    const res = parseImport(text);
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.data.profile).toStrictEqual(profile);
    expect(res.data.run).toStrictEqual(plain(run));
    expect(res.data.exportedAt).toBe('2026-01-02T03:04:05.000Z');
    expect(res.data.schemaVersion).toBe(SCHEMA_VERSION);
  });
  it('works without a run', () => {
    const res = parseImport(JSON.stringify(buildExport(richProfile(), null)));
    expect(res.ok && res.data.run).toBeNull();
  });
  it('round-trips profile.castle untouched', () => {
    const p = richProfile();
    const res = parseImport(JSON.stringify(buildExport(p, null)));
    expect(res.ok && res.data.profile.castle).toStrictEqual(p.castle);
  });
  it('export of an imported file is identical', () => {
    const text = JSON.stringify(buildExport(richProfile(), midRun(), new Date(0)));
    const res = parseImport(text);
    if (!res.ok) throw new Error(res.error);
    expect(JSON.stringify(buildExport(res.data.profile, res.data.run ?? null, new Date(0)))).toBe(text);
  });
});

describe('migrations', () => {
  it('v1 profile gets an empty castle and keeps old castle keys', () => {
    const v1 = { ...newProfile(), schemaVersion: 1, castle: { note: 'old' } } as unknown as Record<string, unknown>;
    const m = migrate(v1) as unknown as Profile;
    expect(m.schemaVersion).toBe(SCHEMA_VERSION);
    expect(m.castle).toStrictEqual({ renown: 0, levels: {}, note: 'old' });
  });
  it('v2 castle "built" list becomes level 1 of each facility; stats get handPlays', () => {
    const base = newProfile() as unknown as Record<string, unknown>;
    const { handPlays: _hp, ...oldStats } = newProfile().stats;
    const v2 = { ...base, schemaVersion: 2, stats: oldStats, castle: { renown: 7, built: ['tavern', 'kitchen'] } };
    const m = migrate(v2) as unknown as Profile;
    expect(m.castle).toStrictEqual({ renown: 7, levels: { tavern: 1, kitchen: 1 } });
    expect(m.stats.handPlays).toStrictEqual({});
    expect(parseImport(JSON.stringify({ schemaVersion: 2, exportedAt: 'x', profile: v2 })).ok).toBe(true);
  });
  it('v1 stored run gets the new run fields and loads', () => {
    const s = memoryStorage();
    const run = midRun() as unknown as Record<string, unknown>;
    delete run.nextHand;
    const mods = { ...(run.modifiers as Record<string, unknown>) };
    for (const k of ['rerollMinus', 'previewCount', 'bossLookahead', 'foodPerBlind', 'skipToShop', 'rescuePct', 'startHandLevels']) delete mods[k];
    delete run.rescued;
    run.modifiers = mods;
    s.set(RUN_KEY, JSON.stringify({ schemaVersion: 1, run }));
    const loaded = loadRun(s);
    expect(loaded).not.toBeNull();
    expect(loaded!.nextHand).toStrictEqual({ chips: 0, mult: 0 });
    expect(loaded!.modifiers.skipToShop).toBe(false);
    expect(loaded!.modifiers.foodPerBlind).toBe(0);
    expect(loaded!.modifiers.startHandLevels).toStrictEqual({});
    expect(loaded!.rescued).toBe(false);
  });
  it('rejects a castle with an unknown facility, a bad level or negative renown', () => {
    const c = richProfile();
    c.castle.levels = { tavern: 9 };
    expect(parseImport(JSON.stringify(buildExport(c, null))).ok).toBe(false);
    const a = richProfile();
    a.castle.levels = { moon_base: 1 };
    expect(parseImport(JSON.stringify(buildExport(a, null))).ok).toBe(false);
    const b = richProfile();
    b.castle.renown = -1;
    expect(parseImport(JSON.stringify(buildExport(b, null))).ok).toBe(false);
  });
  it('v0 (no schemaVersion) migrates to the current version', () => {
    const p = richProfile() as Partial<Profile>;
    delete p.schemaVersion;
    const m = migrate(p as Record<string, unknown>);
    expect(m.schemaVersion).toBe(SCHEMA_VERSION);
    expect(m).toStrictEqual(richProfile());
  });
  it('a v0 export file imports', () => {
    const p = richProfile() as Partial<Profile>;
    delete p.schemaVersion;
    const res = parseImport(JSON.stringify({ exportedAt: 'x', profile: p }));
    expect(res.ok).toBe(true);
    if (res.ok) expect(res.data.profile).toStrictEqual(richProfile());
  });
  it('a v0 stored profile loads', () => {
    const s = memoryStorage();
    const p = richProfile() as Partial<Profile>;
    delete p.schemaVersion;
    s.set(PROFILE_KEY, JSON.stringify(p));
    expect(loadProfile(s)).toStrictEqual(richProfile());
  });
  it('a newer version is rejected', () => {
    expect(() => migrate({ schemaVersion: SCHEMA_VERSION + 1 })).toThrow(/newer/);
    const file = { ...buildExport(richProfile(), null), schemaVersion: SCHEMA_VERSION + 1 };
    const res = parseImport(JSON.stringify(file));
    expect(res.ok).toBe(false);
  });
  it('does not mutate the input', () => {
    const o = { a: 1 };
    migrate(o);
    expect(o).toStrictEqual({ a: 1 });
  });
});

describe('import validation', () => {
  const good = () => plain(buildExport(richProfile(), midRun())) as unknown as Record<string, any>;
  const bad = (mutate: (f: Record<string, any>) => void) => {
    const f = good();
    mutate(f);
    return parseImport(JSON.stringify(f));
  };
  const expectFail = (res: ReturnType<typeof parseImport>) => {
    expect(res.ok).toBe(false);
    expect(res).not.toHaveProperty('data');
    if (!res.ok) expect(res.error.length).toBeGreaterThan(0);
  };

  it('rejects text that is not JSON', () => {
    expectFail(parseImport('not json'));
    expectFail(parseImport(''));
    expectFail(parseImport('{"profile":'));
  });
  it('rejects wrong top-level shapes', () => {
    expectFail(parseImport('null'));
    expectFail(parseImport('[]'));
    expectFail(parseImport('42'));
    expectFail(parseImport('"text"'));
  });
  it('rejects missing fields', () => {
    expectFail(bad((f) => delete f.exportedAt));
    expectFail(bad((f) => delete f.profile));
    expectFail(bad((f) => delete f.profile.collection));
    expectFail(bad((f) => delete f.profile.castle));
    expectFail(bad((f) => delete f.profile.settings));
    expectFail(bad((f) => delete f.run.deck));
    expectFail(bad((f) => delete f.run.rng));
    expectFail(bad((f) => delete f.run.handLevels));
  });
  it('rejects wrong shapes', () => {
    expectFail(bad((f) => (f.profile = 'x')));
    expectFail(bad((f) => (f.profile.collection.seen = 'chaco')));
    expectFail(bad((f) => (f.profile.stats.runs = -1)));
    expectFail(bad((f) => (f.profile.settings.reducedMotion = 'maybe')));
    expectFail(bad((f) => (f.profile.castle = [])));
    expectFail(bad((f) => (f.run = 'x')));
    expectFail(bad((f) => (f.run.phase = 'lunch')));
    expectFail(bad((f) => (f.run.ante = 0)));
    expectFail(bad((f) => (f.run.money = 'lots')));
    expectFail(bad((f) => (f.run.deck[0].rank = 99)));
    expectFail(bad((f) => (f.run.deck[0].suit = 'X')));
    expectFail(bad((f) => (f.run.hand = ['a'])));
    expectFail(bad((f) => (f.run.bosses = { 1: 'nobody' })));
  });
  it('rejects runs that are not consistent (softlock or crash on load)', () => {
    expectFail(bad((f) => (f.run.round = null)));
    expectFail(bad((f) => (f.run.phase = 'shop')));
    expectFail(bad((f) => (f.run.phase = 'pack')));
    expectFail(bad((f) => (f.run.phase = 'cashout')));
    expectFail(bad((f) => f.run.hand.push(123_456)));
    expectFail(bad((f) => f.run.drawPile.push(123_456)));
  });
  it('rejects unknown Joker and consumable ids', () => {
    expectFail(bad((f) => f.profile.collection.owned.push('mcdohl')));
    expectFail(bad((f) => (f.run.jokers = [{ uid: 1, id: 'mcdohl', edition: 'none', sellBonus: 0, state: {} }])));
    expectFail(bad((f) => (f.run.consumables = [{ uid: 1, id: 'nope' }])));
  });
  it('rejects a profile with a different version inside a valid file', () => {
    expectFail(bad((f) => (f.profile.schemaVersion = 99)));
  });
});

describe('mergeDiscoveries', () => {
  it('adds run discoveries and unlocks to the profile', () => {
    const p = newProfile();
    const run = freshRun();
    run.discovered.seen.push('chaco');
    run.discovered.owned.push('chaco');
    run.unlocked.push('luca_blight');
    const m = mergeDiscoveries(p, run);
    expect(m.collection).toStrictEqual({ seen: ['chaco'], owned: ['chaco'] });
    expect(m.unlocks).toStrictEqual(['luca_blight']);
    expect(mergeDiscoveries(m, run)).toBe(m);
  });
});
