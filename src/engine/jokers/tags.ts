// Tag set bonuses. Counts are re-evaluated from the Joker row every time they are needed,
// so buying, selling and destroying Jokers update tiers at once.
import { CONFIG } from '../config';
import { isFace } from '../cards';
import { JOKERS, TAG_LIST, type TagData } from '../data';
import type { RunState } from '../state';
import type { EffectBehavior } from './effects';

/** Jokers that count right now (debuffed Jokers do not count). */
export function activeJokerList(run: RunState) {
  const off = run.round?.debuffedJokerUid ?? null;
  return run.jokers.filter((j) => j.uid !== off);
}

export function tagCounts(run: RunState): Record<string, number> {
  const counts: Record<string, number> = {};
  const list = activeJokerList(run);
  for (let i = 0; i < list.length; i++) {
    const j = list[i];
    const tags = new Set(JOKERS[j.id]?.tags ?? []);
    if (CONFIG.copiesCountForTags && j.id === 'jowy_atreides') {
      const right = list[i + 1];
      const idx = run.jokers.indexOf(j);
      // Copy target is the Joker directly right of Jowy in the real row.
      if (right && run.jokers[idx + 1] === right) for (const t of JOKERS[right.id]?.tags ?? []) tags.add(t);
    }
    for (const t of tags) counts[t] = (counts[t] ?? 0) + 1;
  }
  return counts;
}

export interface ActiveTier {
  tag: TagData;
  count: number;
  params: Record<string, number>;
}

export function activeTiers(run: RunState): ActiveTier[] {
  const counts = tagCounts(run);
  const out: ActiveTier[] = [];
  for (const tag of TAG_LIST) {
    const n = counts[tag.id] ?? 0;
    for (const tier of tag.tiers) if (n >= tier.count) out.push({ tag, count: tier.count, params: tier.params });
  }
  return out;
}

export function hasTier(run: RunState, tag: string, count: number): boolean {
  return (tagCounts(run)[tag] ?? 0) >= count;
}

export const TAG_BEHAVIORS: Record<string, EffectBehavior> = {
  'kyaro:2': { passive: (p, _r, q) => void (p.hands += q.hands) },
  'kyaro:4': { onHandScored: (c, q) => c.isFinal && c.xMult(q.x) },
  'beast:2': { passive: (p, _r, q) => void (p.discards += q.discards) },
  'beast:4': {}, // Applied through the Beast scale in refs.ts.
  'circus:2': { onRoundEnd: (r, q) => r.earn(q.money, 'Circus tag') },
  'circus:3': { onHandScored: (c, q) => c.xMult(q.x) },
  'highland:2': { onHandScored: (c, q) => c.addMult(q.mult) },
  'highland:4': { onHandScored: (c, q) => c.xMult(q.x) },
  'mercenary:2': {
    onHandScored: (c, q) => {
      const k = 'tag:mercenary';
      const got = c.roundCounter(k);
      if (got < q.max) {
        c.setRoundCounter(k, got + q.money);
        c.earn(q.money);
      }
    },
  },
  'mercenary:4': { onHandScored: (c, q) => c.isFirst && c.xMult(q.x) },
  'ninja:2': { retrigger: (_c, q, _card, idx) => (idx === 0 ? q.retriggers : 0) },
  'ninja:4': { retrigger: (c, q, _card, idx) => (idx === c.played.length - 1 ? q.retriggers : 0) },
  'gambler:2': { onHandScored: (c, q) => c.rawChance(q.num, q.den) && c.earn(q.money) },
  'gambler:4': {}, // Applied in RunCtx.chance().
  'merchant:2': { passive: (p, _r, q) => void (p.shopDiscountPct += q.pct) },
  'merchant:4': { passive: (p, _r, q) => void (p.interestCap += q.cap) },
  'mage:2': { passive: (p, _r, q) => void (p.consumableSlots += q.slots) },
  'mage:4': {}, // Applied in run.ts useConsumable.
  'strategist:2': {
    passive: (p, _r, q) => void (p.previewCount = Math.max(p.previewCount, q.preview)),
    onHandScored: (c, q) => c.xMult(q.x),
  },
  'archer:2': { onHandScored: (c, q) => c.addChips(q.chipsPerHand * c.handsLeft) },
  'swordsman:2': { onHandScored: (c, q) => c.isFirst && !hasTier(c.run, 'swordsman', 4) && c.addMult(q.mult) },
  'swordsman:4': { onHandScored: (c, q) => c.isFirst && c.xMult(q.x) },
  'craftsman:2': {
    onCardScored: (c, q, card, _i, pos) => {
      if (pos === 0 && c.rep === 0) {
        card.bonusChips += q.chips;
        c.msg(`+${q.chips} Chips forever`);
      }
    },
  },
  'craftsman:4': { onBossDefeated: (r, q) => r.upgradeHand(r.randomHandType(), q.levels, 'Craftsman tag') },
  'kobold:2': { onHandScored: (c, q) => c.addChips(q.chips) },
  'kobold:3': { onHandScored: (c, q) => c.played.length <= q.maxCards && c.xMult(q.x) },
  'troupe:2': { onHandScored: (c, q) => c.addMult(q.multPerJoker * c.run.jokers.length) },
  'troupe:4': { onHandScored: (c, q) => c.xMult(q.x) },
  'vampire_hunter:2': { onBossDefeated: (r, q) => r.earn(q.money, 'Vampire Hunter tag') },
  'vampire_hunter:4': { onHandScored: (c, q) => c.isBoss && !hasTier(c.run, 'vampire_hunter', 6) && c.xMult(q.x) },
  'vampire_hunter:6': { onHandScored: (c, q) => c.isBoss && c.xMult(q.x) },
  'brawler:2': { onHandScored: (c, q) => c.played.length === 5 && c.addChips(q.chips) },
  'brawler:4': { onHandScored: (c, q) => c.played.length === 5 && c.xMult(q.x) },
  'matilda:2': { onCardScored: (c, q, card) => isFace(card) && c.addChips(q.chips) },
  'matilda:4': { onHandScored: (c, q) => c.played.some(isFace) && c.xMult(q.x) },
};
