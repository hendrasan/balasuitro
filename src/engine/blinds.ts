// Blind targets, boss planning and Spoils (Balatro skip tags; renamed so they do not
// clash with the Joker Tag system).
import { CONFIG } from './config';
import { BOSS_LIST, BOSSES } from './data';
import type { RunCtx } from './ctx';
import { pick, shuffle } from './rng';
import type { RunState } from './state';

export const BLIND_NAMES = ['Duel', 'Unit Battle', 'Boss'] as const;
export const CHAPTERS = ['Kyaro', 'Muse', 'Greenhill', 'Matilda', 'Gregminster', 'Tinto', 'Highland', 'The Beginning'];

export function chapterName(ante: number): string {
  return ante <= CHAPTERS.length ? CHAPTERS[ante - 1] : `Endless ${ante - CHAPTERS.length}`;
}

/** Small-blind base for an ante. Antes past 8 use Balatro's endless formula. */
export function anteBase(ante: number): number {
  if (ante < 1) return CONFIG.anteBase[0];
  if (ante <= CONFIG.anteBase.length) return CONFIG.anteBase[ante - 1];
  const a = CONFIG.anteBase[CONFIG.anteBase.length - 1];
  const c = ante - CONFIG.anteBase.length;
  const d = 1 + 0.2 * c;
  const amount = Math.floor(a * Math.pow(1.6 + Math.pow(0.75 * c, d), c));
  const k = Math.pow(10, Math.floor(Math.log10(amount)) - 1);
  return Math.floor(amount / k) * k;
}

export function blindTarget(ante: number, blindIndex: number, bossId: string | null): number {
  const mult = blindIndex === 2 && bossId ? BOSSES[bossId].targetMult : CONFIG.blindMults[blindIndex];
  return Math.floor(anteBase(ante) * mult);
}

function randomPoolBoss(run: RunState, ante: number, exclude: string[], endless: boolean): string {
  const used = new Set([...Object.values(run.bosses), ...exclude]);
  const ok = (b: (typeof BOSS_LIST)[number]) => !b.finale && (endless || !b.fixed) && b.minAnte <= Math.max(ante, 1);
  let pool = BOSS_LIST.filter((b) => ok(b) && !used.has(b.id));
  if (pool.length === 0) pool = BOSS_LIST.filter((b) => ok(b) && !exclude.includes(b.id));
  return pick(run.rng, pool).id;
}

/** Fixed plan: Jowy in Ante 8, Luca in Ante 4 or 6, Neclord in 6 (or 7 if Luca has 6). */
export function planBosses(run: RunState): void {
  const luca = pick(run.rng, CONFIG.lucaAntes);
  const neclord = luca === 6 ? 7 : 6;
  run.bosses = {};
  run.bosses[String(CONFIG.finalAnte)] = 'jowy_boss';
  run.bosses[String(luca)] = 'luca_blight';
  run.bosses[String(neclord)] = 'neclord';
  for (let a = 1; a < CONFIG.finalAnte; a++) {
    if (!run.bosses[String(a)]) run.bosses[String(a)] = randomPoolBoss(run, a, [], false);
  }
}

export function ensureBoss(run: RunState, ante: number): string {
  const key = String(ante);
  if (!run.bosses[key]) {
    run.bosses[key] = ante % CONFIG.finalAnte === 0 ? 'jowy_boss' : randomPoolBoss(run, ante, [], ante > CONFIG.finalAnte);
  }
  return run.bosses[key];
}

export function canRerollBoss(run: RunState): boolean {
  const b = BOSSES[run.bosses[String(run.ante)]];
  return !!b && !b.fixed;
}

export function rerollBoss(run: RunState): void {
  const key = String(run.ante);
  run.bosses[key] = randomPoolBoss(run, run.ante, [run.bosses[key]], run.ante > CONFIG.finalAnte);
}

// ---------------- Spoils ----------------
export interface SpoilDef {
  id: string;
  name: string;
  text: string;
  apply(r: RunCtx): void;
}

export const SPOIL_LIST: SpoilDef[] = [
  { id: 'investment', name: 'War Bonds', text: 'Gain 15 Potch after you defeat the next Boss', apply: (r) => void (r.run.investment += 15) },
  { id: 'economy', name: 'Plunder', text: 'Double your Potch (max +40)', apply: (r) => r.earn(Math.max(0, Math.min(40, r.run.money)), 'Plunder') },
  { id: 'rare', name: 'Rare Recruit', text: 'The next shop has a free Rare Joker', apply: (r) => void r.run.pendingShop.freeJokers.push('R') },
  { id: 'uncommon', name: 'Recruit', text: 'The next shop has a free Uncommon Joker', apply: (r) => void r.run.pendingShop.freeJokers.push('U') },
  { id: 'edition', name: 'Polished Arms', text: 'The next shop Joker gets Foil, Holo or Polychrome and is free', apply: (r) => void (r.run.pendingShop.freeEditions += 1) },
  { id: 'coupon', name: 'Merchant Coupon', text: 'Cards and packs in the next shop are free', apply: (r) => void (r.run.pendingShop.coupon = true) },
  { id: 'd6', name: 'Lucky Dice', text: 'Rerolls in the next shop start at 0 Potch', apply: (r) => void (r.run.pendingShop.freeRerolls += 1) },
  { id: 'handy', name: 'Veteran Pay', text: 'Gain 1 Potch per hand played this run', apply: (r) => r.earn(r.run.stats.handsPlayed, 'Veteran Pay') },
  { id: 'garbage', name: 'Scavenger', text: 'Gain 1 Potch per unused discard this run', apply: (r) => r.earn(r.run.stats.unusedDiscards, 'Scavenger') },
  { id: 'juggle', name: 'Forced March', text: '+3 hand size next round', apply: (r) => void (r.run.nextRound.handSize += 3) },
  { id: 'orbital', name: 'War Council', text: 'Upgrade a random hand type by 3 levels', apply: (r) => r.upgradeHand(r.randomHandType(), 3, 'War Council') },
  { id: 'pack', name: 'Rune Cache', text: 'The next shop has a free Mega Rune Pack', apply: (r) => void (r.run.pendingShop.freePacks += 1) },
];

export const SPOILS: Record<string, SpoilDef> = Object.fromEntries(SPOIL_LIST.map((s) => [s.id, s]));

export function rollSpoils(run: RunState): [string, string] {
  const ids = shuffle(run.rng, SPOIL_LIST.map((s) => s.id));
  return [ids[0], ids[1]];
}
