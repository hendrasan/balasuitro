// Serialization, versioning, migrations, export/import. No DOM: storage is injected.
import { ENHANCEMENTS, SEALS, SUITS } from './cards';
import { CONSUMABLES } from './consumables';
import { BOSSES, JOKERS } from './data';
import { HAND_ORDER } from './hands';
import { type CastleState, FACILITIES, newCastle } from './castle';
import { defaultModifiers, type RunState } from './state';

export const SCHEMA_VERSION = 2;
export const PROFILE_KEY = 'sod.profile';
export const RUN_KEY = 'sod.run';

export interface StorageAdapter {
  get(key: string): string | null;
  set(key: string, value: string): void;
  remove(key: string): void;
}

/** In-memory adapter, for tests and as a fallback when localStorage is blocked. */
export function memoryStorage(): StorageAdapter {
  const m = new Map<string, string>();
  return {
    get: (k) => m.get(k) ?? null,
    set: (k, v) => void m.set(k, v),
    remove: (k) => void m.delete(k),
  };
}

export interface Settings {
  /** Scoring animation speed multiplier. */
  speed: number;
  skipAnimations: boolean;
  reducedMotion: 'system' | 'on' | 'off';
  sound: boolean;
}

export interface LifetimeStats {
  runs: number;
  wins: number;
  bestAnte: number;
  bossesDefeated: number;
  handsPlayed: number;
  bestHand: number;
}

export interface Profile {
  schemaVersion: number;
  collection: { seen: string[]; owned: string[] };
  unlocks: string[];
  stats: LifetimeStats;
  settings: Settings;
  /** Castle meta progression (Renown and built facilities). Unknown keys are kept. */
  castle: CastleState;
}

export interface StoredRun {
  schemaVersion: number;
  run: RunState;
}

export interface ExportFile {
  schemaVersion: number;
  exportedAt: string;
  profile: Profile;
  run?: RunState | null;
}

export function newProfile(): Profile {
  return {
    schemaVersion: SCHEMA_VERSION,
    collection: { seen: [], owned: [] },
    unlocks: [],
    stats: { runs: 0, wins: 0, bestAnte: 0, bossesDefeated: 0, handsPlayed: 0, bestHand: 0 },
    settings: { speed: 1, skipAnimations: false, reducedMotion: 'system', sound: false },
    castle: newCastle(),
  };
}

// ---------------------------------------------------------------- migrations

type Json = Record<string, unknown>;

/** MIGRATIONS[n] converts a version-n object to version n+1. Add entries here; never edit old ones. */
export const MIGRATIONS: Record<number, (o: Json) => Json> = {
  // Version 0 = pre-release files without schemaVersion. Same shape as v1.
  0: (o) => ({ ...o, schemaVersion: 1 }),
  // v2 adds the Castle (renown, built) and run fields for Castle modifiers and Food.
  1: (o) => {
    const out: Json = { ...o, schemaVersion: 2 };
    if ('collection' in o) out.castle = { ...newCastle(), ...(isObj(o.castle) ? o.castle : {}) };
    if (isObj(o.run)) out.run = upgradeRunV2(o.run);
    return out;
  },
};

function upgradeRunV2(r: Json): Json {
  return {
    ...r,
    nextHand: isObj(r.nextHand) ? r.nextHand : { chips: 0, mult: 0 },
    modifiers: { ...defaultModifiers(), ...(isObj(r.modifiers) ? r.modifiers : {}) },
  };
}

export function migrate(o: Json, target = SCHEMA_VERSION): Json {
  let cur: Json = { ...o };
  let v = typeof cur.schemaVersion === 'number' ? cur.schemaVersion : 0;
  if (v > target) throw new Error(`Save version ${v} is newer than this game (${target})`);
  while (v < target) {
    const step = MIGRATIONS[v];
    if (!step) throw new Error(`No migration from version ${v}`);
    cur = step(cur);
    v = cur.schemaVersion as number;
  }
  return cur;
}

// ---------------------------------------------------------------- validation

const isObj = (x: unknown): x is Json => typeof x === 'object' && x !== null && !Array.isArray(x);
const isNum = (x: unknown): x is number => typeof x === 'number' && Number.isFinite(x);
const isInt = (x: unknown): x is number => Number.isInteger(x);
const isStrArr = (x: unknown): x is string[] => Array.isArray(x) && x.every((s) => typeof s === 'string');

export function validateProfile(p: unknown): string[] {
  const e: string[] = [];
  if (!isObj(p)) return ['profile is not an object'];
  if (p.schemaVersion !== SCHEMA_VERSION) e.push('profile.schemaVersion is wrong');
  const col = p.collection;
  if (!isObj(col) || !isStrArr(col.seen) || !isStrArr(col.owned)) e.push('profile.collection is invalid');
  else {
    const bad = [...col.seen, ...col.owned].filter((id) => !JOKERS[id]);
    if (bad.length) e.push(`unknown Joker ids: ${bad.slice(0, 5).join(', ')}`);
  }
  if (!isStrArr(p.unlocks)) e.push('profile.unlocks is invalid');
  const st = p.stats;
  if (!isObj(st) || !['runs', 'wins', 'bestAnte', 'bossesDefeated', 'handsPlayed', 'bestHand'].every((k) => isNum(st[k]) && (st[k] as number) >= 0)) {
    e.push('profile.stats is invalid');
  }
  const se = p.settings;
  if (!isObj(se) || !isNum(se.speed) || typeof se.skipAnimations !== 'boolean' || typeof se.sound !== 'boolean' || !['system', 'on', 'off'].includes(se.reducedMotion as string)) {
    e.push('profile.settings is invalid');
  }
  const ca = p.castle;
  if (!isObj(ca)) e.push('profile.castle must be an object');
  else if (!isNum(ca.renown) || ca.renown < 0 || !isStrArr(ca.built) || ca.built.some((id) => !FACILITIES[id])) {
    e.push('profile.castle is invalid');
  }
  return e;
}

function validCard(c: unknown): boolean {
  return (
    isObj(c) && isInt(c.id) && isInt(c.rank) && (c.rank as number) >= 2 && (c.rank as number) <= 14 &&
    SUITS.includes(c.suit as never) && (c.enh === 'none' || ENHANCEMENTS.includes(c.enh as never)) &&
    ['none', 'foil', 'holo', 'poly', 'negative'].includes(c.edition as string) &&
    (c.seal === 'none' || SEALS.includes(c.seal as never)) && isNum(c.bonusChips)
  );
}

const PHASES = ['blind', 'round', 'cashout', 'shop', 'pack', 'gameover', 'victory'];

export function validateRun(r: unknown): string[] {
  const e: string[] = [];
  if (!isObj(r)) return ['run is not an object'];
  if (typeof r.seed !== 'string') e.push('run.seed is invalid');
  if (!isObj(r.rng) || !isInt(r.rng.s)) e.push('run.rng is invalid');
  if (!PHASES.includes(r.phase as string)) e.push('run.phase is invalid');
  if (!isInt(r.ante) || (r.ante as number) < 1 || (r.ante as number) > 1000) e.push('run.ante is invalid');
  if (!isInt(r.blindIndex) || (r.blindIndex as number) < 0 || (r.blindIndex as number) > 2) e.push('run.blindIndex is invalid');
  if (!isNum(r.money) || Math.abs(r.money) > 1e12) e.push('run.money is invalid');
  if (!isInt(r.nextId)) e.push('run.nextId is invalid');
  if (!Array.isArray(r.deck) || !r.deck.every(validCard)) e.push('run.deck is invalid');
  for (const k of ['drawPile', 'hand', 'discardPile']) {
    if (!Array.isArray(r[k]) || !(r[k] as unknown[]).every(isInt)) e.push(`run.${k} is invalid`);
  }
  if (!Array.isArray(r.jokers) || !r.jokers.every((j) => isObj(j) && isInt(j.uid) && typeof j.id === 'string' && !!JOKERS[j.id] && isObj(j.state))) {
    e.push('run.jokers is invalid');
  }
  if (!Array.isArray(r.consumables) || !r.consumables.every((c) => isObj(c) && isInt(c.uid) && typeof c.id === 'string' && !!CONSUMABLES[c.id])) {
    e.push('run.consumables is invalid');
  }
  const hl = r.handLevels;
  if (!isObj(hl) || !HAND_ORDER.every((h) => isObj(hl[h]) && isInt((hl[h] as Json).level) && isInt((hl[h] as Json).played))) {
    e.push('run.handLevels is invalid');
  }
  if (!isObj(r.bosses) || !Object.values(r.bosses).every((b) => typeof b === 'string' && !!BOSSES[b])) e.push('run.bosses is invalid');
  for (const k of ['anteState', 'stats', 'modifiers', 'discovered', 'pendingShop', 'nextRound', 'nextHand', 'cycle']) {
    if (!isObj(r[k])) e.push(`run.${k} is invalid`);
  }
  if (!isStrArr(r.unlocked) || !isStrArr(r.vouchers) || !isStrArr(r.log)) e.push('run lists are invalid');
  // Consistency: the object the phase needs must exist, and card piles must point into the deck.
  const needs: Record<string, string[]> = { round: ['round'], cashout: ['cashout'], shop: ['shop'], pack: ['pack'] };
  for (const k of needs[r.phase as string] ?? []) if (!isObj(r[k])) e.push(`run.${k} is missing for phase ${r.phase}`);
  if (Array.isArray(r.deck) && r.deck.every(validCard)) {
    const ids = new Set((r.deck as Json[]).map((c) => c.id));
    for (const k of ['drawPile', 'hand', 'discardPile']) {
      if (Array.isArray(r[k]) && !(r[k] as unknown[]).every((id) => ids.has(id))) e.push(`run.${k} has unknown cards`);
    }
  }
  return e;
}

// ---------------------------------------------------------------- import / export

export function buildExport(profile: Profile, run: RunState | null, now = new Date()): ExportFile {
  return { schemaVersion: SCHEMA_VERSION, exportedAt: now.toISOString(), profile, run: run ?? null };
}

export type ImportResult = { ok: true; data: ExportFile } | { ok: false; error: string };

/** Parse and validate an export file. Returns all or nothing. */
export function parseImport(text: string): ImportResult {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return { ok: false, error: 'The file is not valid JSON.' };
  }
  if (!isObj(raw)) return { ok: false, error: 'The file is not a save file.' };
  try {
    const top = migrate(raw);
    if (typeof top.exportedAt !== 'string') return { ok: false, error: 'exportedAt is missing.' };
    const profile = isObj(top.profile) ? migrate(top.profile) : top.profile;
    const pe = validateProfile(profile);
    if (pe.length) return { ok: false, error: `Profile: ${pe.join('; ')}` };
    let run: RunState | null = null;
    if (top.run != null) {
      const re = validateRun(top.run);
      if (re.length) return { ok: false, error: `Run: ${re.join('; ')}` };
      run = top.run as unknown as RunState;
    }
    return { ok: true, data: { schemaVersion: SCHEMA_VERSION, exportedAt: top.exportedAt, profile: profile as unknown as Profile, run } };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Unknown error' };
  }
}

// ---------------------------------------------------------------- storage

export function loadProfile(s: StorageAdapter): Profile {
  const text = s.get(PROFILE_KEY);
  if (!text) return newProfile();
  try {
    const p = migrate(JSON.parse(text));
    return validateProfile(p).length ? newProfile() : (p as unknown as Profile);
  } catch {
    return newProfile();
  }
}

export function saveProfile(s: StorageAdapter, p: Profile): void {
  s.set(PROFILE_KEY, JSON.stringify(p));
}

export function loadRun(s: StorageAdapter): RunState | null {
  const text = s.get(RUN_KEY);
  if (!text) return null;
  try {
    const o = migrate(JSON.parse(text));
    if (!isObj(o.run) || validateRun(o.run).length) return null;
    return o.run as unknown as RunState;
  } catch {
    return null;
  }
}

export function saveRun(s: StorageAdapter, run: RunState | null): void {
  if (!run) s.remove(RUN_KEY);
  else s.set(RUN_KEY, JSON.stringify({ schemaVersion: SCHEMA_VERSION, run } satisfies StoredRun));
}

/** Merge what the run discovered into the profile (seen, owned, unlocks). */
export function mergeDiscoveries(p: Profile, run: RunState): Profile {
  const seen = new Set([...p.collection.seen, ...run.discovered.seen]);
  const owned = new Set([...p.collection.owned, ...run.discovered.owned]);
  const unlocks = new Set([...p.unlocks, ...run.unlocked]);
  if (seen.size === p.collection.seen.length && owned.size === p.collection.owned.length && unlocks.size === p.unlocks.length) return p;
  return { ...p, collection: { seen: [...seen], owned: [...owned] }, unlocks: [...unlocks] };
}
