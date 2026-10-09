// Castle (meta progression). Facilities are unlocked by recruiting their character
// (Collection "owned") and built with Renown, earned at the end of each run.
// Built facilities are always on: they fill RunModifiers at run start.
import castleJson from '../data/castle.json';
import { JOKERS } from './data';
import { defaultModifiers, type RunModifiers, type RunState } from './state';

export interface FacilityData {
  id: string;
  name: string;
  character: string;
  cost: number;
  text: string;
  params: Record<string, number>;
}

export const FACILITY_LIST = castleJson as unknown as FacilityData[];
export const FACILITIES: Record<string, FacilityData> = Object.fromEntries(FACILITY_LIST.map((f) => [f.id, f]));

export interface CastleState {
  renown: number;
  built: string[];
  /** Unknown keys from newer versions are kept. */
  [key: string]: unknown;
}

export function newCastle(): CastleState {
  return { renown: 0, built: [] };
}

export type FacilityStatus = 'built' | 'buildable' | 'poor' | 'locked';

export function facilityStatus(castle: CastleState, owned: readonly string[], id: string): FacilityStatus {
  const f = FACILITIES[id];
  if (castle.built.includes(id)) return 'built';
  if (!owned.includes(f.character)) return 'locked';
  return castle.renown >= f.cost ? 'buildable' : 'poor';
}

export type BuildResult = { ok: true; castle: CastleState } | { ok: false; error: string };

/** Build a facility. Returns a new CastleState; the input is not changed. */
export function buildFacility(castle: CastleState, owned: readonly string[], id: string): BuildResult {
  const f = FACILITIES[id];
  if (!f) return { ok: false, error: 'Unknown facility' };
  switch (facilityStatus(castle, owned, id)) {
    case 'built':
      return { ok: false, error: 'Already built' };
    case 'locked':
      return { ok: false, error: `Recruit ${JOKERS[f.character]?.name ?? f.character} first` };
    case 'poor':
      return { ok: false, error: 'Not enough Renown' };
  }
  return { ok: true, castle: { ...castle, renown: castle.renown - f.cost, built: [...castle.built, id] } };
}

/** Renown earned by a finished run: 1 per round won, +2 per Boss, +5 for beating the finale. */
export function renownForRun(run: RunState): number {
  return run.stats.roundsWon + 2 * run.stats.bossesDefeated + (run.won ? 5 : 0);
}

/** RunModifiers from the built facilities. */
export function buildRunModifiers(castle: CastleState): RunModifiers {
  const m = defaultModifiers();
  for (const id of castle.built) {
    const p = FACILITIES[id]?.params;
    if (!p) continue;
    m.rerollMinus += p.rerollMinus ?? 0;
    m.extraHandSize += p.handSize ?? 0;
    m.bossLookahead = Math.max(m.bossLookahead, p.bossLookahead ?? 0);
    m.previewCount = Math.max(m.previewCount, p.preview ?? 0);
    m.foodPerBlind += p.foodPerBlind ?? 0;
    m.skipToShop = m.skipToShop || !!p.skipToShop;
  }
  return m;
}
