// Random picks for Jokers, editions and consumables. All use the run RNG.
import { CONFIG } from './config';
import type { Edition } from './cards';
import { CONSUMABLE_LIST } from './consumables';
import { JOKER_LIST } from './data';
import { next, pick, weighted } from './rng';
import type { ConsumableKind, Rarity, RunState } from './state';

export function rollRarity(run: RunState): 'C' | 'U' | 'R' {
  const w = run.modifiers.rarityWeights ?? CONFIG.rarityWeights;
  return weighted(run.rng, [['C', w.C], ['U', w.U], ['R', w.R]] as const);
}

export function isJokerAvailable(run: RunState, id: string): boolean {
  const d = JOKER_LIST.find((j) => j.id === id);
  if (!d) return false;
  if (d.locked && !run.unlocked.includes(d.id)) return false;
  if (d.minCollection && run.discovered.owned.length < d.minCollection) return false;
  return true;
}

export function availableJokers(run: RunState, rarity: Rarity, exclude: Set<string> = new Set()): string[] {
  const owned = new Set(run.jokers.map((j) => j.id));
  return JOKER_LIST.filter(
    (d) => d.rarity === rarity && !owned.has(d.id) && !exclude.has(d.id) && isJokerAvailable(run, d.id),
  ).map((d) => d.id);
}

/** Random Joker id of the given rarity (or a weighted rarity). Falls back to any rarity. */
export function rollJokerId(run: RunState, rarity?: Rarity, exclude: Set<string> = new Set()): string | null {
  const r = rarity ?? rollRarity(run);
  let pool = availableJokers(run, r, exclude);
  if (pool.length === 0 && r !== 'L') {
    pool = (['C', 'U', 'R'] as const).flatMap((x) => availableJokers(run, x, exclude));
  }
  return pool.length ? pick(run.rng, pool) : null;
}

export function rollJokerEdition(run: RunState, rate: number): Edition {
  const o = CONFIG.jokerEditionOdds;
  const x = next(run.rng);
  if (x < o.negative) return 'negative';
  if (x < o.negative + o.poly * rate) return 'poly';
  if (x < o.negative + (o.poly + o.holo) * rate) return 'holo';
  if (x < o.negative + (o.poly + o.holo + o.foil) * rate) return 'foil';
  return 'none';
}

export function rollConsumableId(run: RunState, kind: ConsumableKind, exclude: string[] = []): string {
  const pool = CONSUMABLE_LIST.filter((c) => {
    if (c.kind !== kind || exclude.includes(c.id)) return false;
    if (c.id === 'beginning') return false; // Only through CONFIG.soulChance.
    if (c.hand && (c.hand === 'five' || c.hand === 'flushhouse' || c.hand === 'flushfive')) {
      return run.handLevels[c.hand].played > 0;
    }
    return true;
  });
  return pick(run.rng, pool).id;
}
