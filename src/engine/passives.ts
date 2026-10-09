import { CONFIG } from './config';
import { BEHAVIORS } from './jokers/registry';
import { activeBonds, BOND_BEHAVIORS } from './jokers/bonds';
import { activeTiers, TAG_BEHAVIORS } from './jokers/tags';
import { ownRefs } from './jokers/refs';
import type { Passives, RunState } from './state';
import { VOUCHERS } from './vouchers';

/** Order: config + RunModifiers, vouchers, negative editions, Jokers (left to right), Bonds, Tags. */
export function computePassives(run: RunState): Passives {
  const m = run.modifiers;
  const p: Passives = {
    hands: CONFIG.hands + m.extraHands,
    discards: CONFIG.discards + m.extraDiscards,
    handSize: CONFIG.handSize + m.extraHandSize + run.permHandSize,
    jokerSlots: CONFIG.jokerSlots + m.extraJokerSlots,
    consumableSlots: CONFIG.consumableSlots + m.extraConsumableSlots,
    shopSlots: CONFIG.shopCardSlots + m.extraShopSlots,
    previewCount: m.previewCount,
    bossLookahead: m.bossLookahead,
    runePackDiscount: m.runePackDiscount,
    shopDiscountPct: m.shopDiscountPct,
    jokerPriceMinus: 0,
    rerollMinus: m.rerollMinus,
    interestPer: CONFIG.interestPer,
    interestCap: CONFIG.interestCap,
    bossRerolls: 0,
    revealBosses: m.revealBosses,
    editionRate: 1,
    runeWeight: CONFIG.shopCardWeights.rune,
    forgingWeight: CONFIG.shopCardWeights.forging,
  };
  for (const v of run.vouchers) VOUCHERS[v]?.apply(p);
  for (const j of run.jokers) if (j.edition === 'negative') p.jokerSlots += 1;
  for (const ref of ownRefs(run)) BEHAVIORS[ref.data.id]?.passive?.(p, run, ref);
  for (const b of activeBonds(run)) BOND_BEHAVIORS[b.id]?.passive?.(p, run, b.params);
  for (const t of activeTiers(run)) TAG_BEHAVIORS[`${t.tag.id}:${t.count}`]?.passive?.(p, run, t.params);
  p.shopDiscountPct = Math.min(90, p.shopDiscountPct);
  p.handSize = Math.max(1, p.handSize);
  p.hands = Math.max(1, p.hands);
  p.discards = Math.max(0, p.discards);
  return p;
}
