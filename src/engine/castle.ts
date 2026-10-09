// Castle (meta progression). A facility opens when its character is recruited
// (Collection "owned"); each level is bought with Renown, earned at the end of a run.
// Built facilities are always on: their current level fills RunModifiers at run start.
import castleJson from '../data/castle.json';
import { JOKERS } from './data';
import { HAND_ORDER, handRank, type HandType } from './hands';
import { defaultModifiers, type RunModifiers, type RunState } from './state';

export interface FacilityLevel {
  cost: number;
  text: string;
  params: Record<string, number>;
}

export interface FacilityData {
  id: string;
  name: string;
  character: string;
  levels: FacilityLevel[];
}

export const FACILITY_LIST = castleJson as unknown as FacilityData[];
export const FACILITIES: Record<string, FacilityData> = Object.fromEntries(FACILITY_LIST.map((f) => [f.id, f]));

export interface CastleState {
  renown: number;
  /** Facility id -> built level (1 = first level). Missing = not built. */
  levels: Record<string, number>;
  /** Unknown keys from newer versions are kept. */
  [key: string]: unknown;
}

export function newCastle(): CastleState {
  return { renown: 0, levels: {} };
}

export function facilityLevel(castle: CastleState, id: string): number {
  return castle.levels[id] ?? 0;
}

/** 'max' = fully built; 'ready' = next level affordable; 'poor' = not enough Renown; 'locked' = character not recruited. */
export type FacilityStatus = 'max' | 'ready' | 'poor' | 'locked';

export function nextLevel(castle: CastleState, id: string): FacilityLevel | null {
  return FACILITIES[id]?.levels[facilityLevel(castle, id)] ?? null;
}

export function facilityStatus(castle: CastleState, owned: readonly string[], id: string): FacilityStatus {
  const f = FACILITIES[id];
  const next = nextLevel(castle, id);
  if (!next) return 'max';
  if (!owned.includes(f.character)) return 'locked';
  return castle.renown >= next.cost ? 'ready' : 'poor';
}

export type BuildResult = { ok: true; castle: CastleState } | { ok: false; error: string };

/** Build the next level of a facility. Returns a new CastleState; the input is not changed. */
export function buildFacility(castle: CastleState, owned: readonly string[], id: string): BuildResult {
  const f = FACILITIES[id];
  if (!f) return { ok: false, error: 'Unknown facility' };
  const next = nextLevel(castle, id);
  switch (facilityStatus(castle, owned, id)) {
    case 'max':
      return { ok: false, error: 'Already at the top level' };
    case 'locked':
      return { ok: false, error: `Recruit ${JOKERS[f.character]?.name ?? f.character} first` };
    case 'poor':
      return { ok: false, error: 'Not enough Renown' };
  }
  return {
    ok: true,
    castle: { ...castle, renown: castle.renown - next!.cost, levels: { ...castle.levels, [id]: facilityLevel(castle, id) + 1 } },
  };
}

/**
 * Renown earned by a finished run: 1 per round won, +2 per Boss, +5 for beating the finale,
 * then the Annallee's Stage bonus (fixed at run start), rounded up.
 */
export function renownForRun(run: RunState): number {
  const base = run.stats.roundsWon + 2 * run.stats.bossesDefeated + (run.won ? 5 : 0);
  return Math.ceil((base * (100 + (run.modifiers.renownBonusPct ?? 0))) / 100);
}

/** Hand types by lifetime plays, most first. Ties go to the stronger hand. Default: Pair, then High Card. */
export function favoriteHands(handPlays: Partial<Record<HandType, number>>): HandType[] {
  const fallback: Partial<Record<HandType, number>> = { pair: 0.2, high: 0.1 };
  const score = (h: HandType) => (handPlays[h] ?? 0) + (fallback[h] ?? 0);
  return [...HAND_ORDER].sort((a, b) => score(b) - score(a) || handRank(b) - handRank(a));
}

/** RunModifiers from the built facilities (current level of each). */
export function buildRunModifiers(castle: CastleState, handPlays: Partial<Record<HandType, number>> = {}): RunModifiers {
  const m = defaultModifiers();
  for (const [id, lvl] of Object.entries(castle.levels)) {
    const p = FACILITIES[id]?.levels[lvl - 1]?.params;
    if (!p) continue;
    m.rerollMinus += p.rerollMinus ?? 0;
    m.extraHandSize += p.handSize ?? 0;
    m.previewCount = Math.max(m.previewCount, p.preview ?? 0);
    m.bossLookahead = Math.max(m.bossLookahead, p.bossLookahead ?? 0);
    m.revealBosses = m.revealBosses || !!p.revealBosses;
    m.foodPerBlind += p.food ?? 0;
    m.extraConsumableSlots += p.slots ?? 0;
    m.skipToShop = m.skipToShop || !!p.skipToShop;
    m.teleport = m.teleport || !!p.teleport;
    if (p.rescuePct) m.rescuePct = m.rescuePct ? Math.min(m.rescuePct, p.rescuePct) : p.rescuePct;
    m.startMoney += p.money ?? 0;
    m.shopDiscountPct += p.discount ?? 0;
    m.guaranteedRunePack = m.guaranteedRunePack || !!p.runePack;
    m.runePackDiscount += p.runePackDiscount ?? 0;
    m.soulChanceMult = Math.max(m.soulChanceMult, p.soulMult ?? 1);
    m.extraJokerSlots += p.jokerSlots ?? 0;
    m.renownBonusPct += p.renownPct ?? 0;
    if (p.forgeTop || p.forgeSecond) {
      const [first, second] = favoriteHands(handPlays);
      if (p.forgeTop) m.startHandLevels[first] = (m.startHandLevels[first] ?? 0) + p.forgeTop;
      if (p.forgeSecond) m.startHandLevels[second] = (m.startHandLevels[second] ?? 0) + p.forgeSecond;
    }
  }
  return m;
}
