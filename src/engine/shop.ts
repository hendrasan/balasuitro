// Shop generation, packs, vouchers, rerolls and pricing.
import { CONFIG } from './config';
import { type Card, ENHANCEMENTS, RANKS, SEALS, SUITS, newCard } from './cards';
import { CONSUMABLES } from './consumables';
import { makeJoker, markSeen, newId } from './ctx';
import { JOKERS } from './data';
import { computePassives } from './passives';
import { rollConsumableId, rollJokerEdition, rollJokerId } from './pools';
import { next, pick, shuffle, weighted } from './rng';
import type {
  ConsumableKind, PackChoice, PackOffer, PackSize, PackState, PackType, Passives, RunState, ShopItem, ShopState,
} from './state';
import { VOUCHER_LIST, VOUCHERS } from './vouchers';

export function discounted(base: number, p: Passives): number {
  return Math.max(1, Math.floor((base * (100 - p.shopDiscountPct)) / 100));
}

export function itemPrice(item: ShopItem, p: Passives): number {
  if (item.free) return 0;
  if (item.kind === 'joker') {
    const base = (JOKERS[item.joker.id]?.cost ?? 4) + CONFIG.editionCost[item.joker.edition];
    return Math.max(1, discounted(base, p) - p.jokerPriceMinus);
  }
  return discounted(CONFIG.consumableCost[CONSUMABLES[item.cons.id].kind], p);
}

export function packPrice(offer: PackOffer, p: Passives): number {
  return offer.free ? 0 : discounted(CONFIG.packCost[offer.size], p);
}

export function voucherPrice(p: Passives): number {
  return discounted(CONFIG.voucherCost, p);
}

export function rerollPrice(shop: ShopState, p: Passives): number {
  return Math.max(0, shop.rerollCost - p.rerollMinus);
}

export function consSellValue(id: string): number {
  return Math.max(1, Math.floor(CONFIG.consumableCost[CONSUMABLES[id].kind] * CONFIG.sellFraction));
}

function shopJokerIds(run: RunState): Set<string> {
  const s = new Set<string>();
  for (const it of run.shop?.cards ?? []) if (it?.kind === 'joker') s.add(it.joker.id);
  return s;
}

function rollJokerItem(run: RunState, p: Passives, exclude: Set<string>, rarity?: 'C' | 'U' | 'R'): ShopItem | null {
  const id = rollJokerId(run, rarity, exclude);
  if (!id) return null;
  exclude.add(id);
  markSeen(run, id);
  return { kind: 'joker', joker: makeJoker(run, id, rollJokerEdition(run, p.editionRate)) };
}

function rollShopItem(run: RunState, p: Passives, exclude: Set<string>): ShopItem {
  const kind = weighted(run.rng, [
    ['joker', CONFIG.shopCardWeights.joker],
    ['rune', p.runeWeight],
    ['forging', p.forgingWeight],
  ] as const);
  if (kind === 'joker') {
    const j = rollJokerItem(run, p, exclude);
    if (j) return j;
  }
  const ck: ConsumableKind = kind === 'forging' ? 'forging' : 'rune';
  return { kind: 'cons', cons: { uid: newId(run), id: rollConsumableId(run, ck) } };
}

const PACK_WEIGHTS: [PackType, PackSize, number][] = [
  ['rune', 'normal', 4], ['rune', 'jumbo', 2], ['rune', 'mega', 0.5],
  ['forging', 'normal', 4], ['forging', 'jumbo', 2], ['forging', 'mega', 0.5],
  ['standard', 'normal', 4], ['standard', 'jumbo', 2], ['standard', 'mega', 0.5],
  ['star', 'normal', 1.2], ['star', 'jumbo', 0.6], ['star', 'mega', 0.15],
  ['true', 'normal', 0.6], ['true', 'jumbo', 0.3], ['true', 'mega', 0.07],
];

export const PACK_NAMES: Record<PackType, string> = {
  rune: 'Rune Pack', forging: 'Forging Pack', standard: 'Deck Pack', star: 'Star Pack', true: 'True Rune Pack',
};

/** [choices shown, picks allowed] */
export function packShape(type: PackType, size: PackSize): [number, number] {
  const small = type === 'star' || type === 'true';
  if (size === 'normal') return [small ? 2 : 3, 1];
  if (size === 'jumbo') return [small ? 4 : 5, 1];
  return [small ? 4 : 5, 2];
}

function rollPack(run: RunState): PackOffer {
  const w = PACK_WEIGHTS.map(([t, s, x]) => [[t, s] as const, x] as const);
  const [type, size] = weighted(run.rng, w);
  return { type, size };
}

export function rollVoucher(run: RunState): string | null {
  const pool = VOUCHER_LIST.filter((v) => !run.vouchers.includes(v.id) && (!v.requires || run.vouchers.includes(v.requires)));
  return pool.length ? pick(run.rng, pool).id : null;
}

export function generateShop(run: RunState): ShopState {
  const p = computePassives(run);
  const pend = run.pendingShop;
  const exclude = new Set<string>();
  const cards: (ShopItem | null)[] = [];
  for (const r of pend.freeJokers) {
    const it = rollJokerItem(run, p, exclude, r);
    if (it) cards.push({ ...it, free: true });
  }
  while (cards.length < Math.max(p.shopSlots, pend.freeJokers.length)) cards.push(rollShopItem(run, p, exclude));
  let eds = pend.freeEditions;
  for (const it of cards) {
    if (eds > 0 && it?.kind === 'joker' && it.joker.edition === 'none') {
      it.joker.edition = pick(run.rng, ['foil', 'holo', 'poly'] as const);
      it.free = true;
      eds--;
    }
  }
  const packs: (PackOffer | null)[] = [];
  for (let i = 0; i < CONFIG.shopPackSlots; i++) packs.push(rollPack(run));
  for (let i = 0; i < pend.freePacks; i++) packs.push({ type: 'rune', size: 'mega', free: true });
  if (pend.coupon) {
    for (const it of cards) if (it) it.free = true;
    for (const pk of packs) if (pk) pk.free = true;
  }
  const shop: ShopState = {
    cards,
    packs,
    rerollCost: pend.freeRerolls > 0 ? 0 : CONFIG.rerollBase,
    freeRerolls: 0,
    boughtAny: false,
  };
  run.pendingShop = { freeJokers: [], freeEditions: 0, coupon: false, freeRerolls: 0, freePacks: 0 };
  return shop;
}

/** Replace the card slots (not packs) with new items. */
export function rerollShopCards(run: RunState): void {
  if (!run.shop) return;
  const p = computePassives(run);
  const exclude = shopJokerIds(run);
  const cards: ShopItem[] = [];
  for (let i = 0; i < p.shopSlots; i++) cards.push(rollShopItem(run, p, exclude));
  run.shop.cards = cards;
}

function rollPackCard(run: RunState): Card {
  const c = newCard(newId(run), pick(run.rng, RANKS), pick(run.rng, SUITS));
  if (next(run.rng) < 0.4) c.enh = pick(run.rng, ENHANCEMENTS);
  const e = next(run.rng);
  if (e < 0.012) c.edition = 'poly';
  else if (e < 0.04) c.edition = 'holo';
  else if (e < 0.08) c.edition = 'foil';
  if (next(run.rng) < 0.2) c.seal = pick(run.rng, SEALS);
  return c;
}

function rollPackCons(run: RunState, kind: ConsumableKind, taken: string[]): string {
  if ((kind === 'rune' || kind === 'true') && next(run.rng) < CONFIG.soulChance && !taken.includes('beginning')) return 'beginning';
  return rollConsumableId(run, kind, taken);
}

export function openPack(run: RunState, offer: PackOffer): PackState {
  const p = computePassives(run);
  const [n, picks] = packShape(offer.type, offer.size);
  const choices: PackChoice[] = [];
  const taken: string[] = [];
  const exclude = new Set<string>();
  for (let i = 0; i < n; i++) {
    if (offer.type === 'star') {
      const id = rollJokerId(run, undefined, exclude);
      if (!id) break;
      exclude.add(id);
      markSeen(run, id);
      choices.push({ kind: 'joker', joker: makeJoker(run, id, rollJokerEdition(run, p.editionRate)) });
    } else if (offer.type === 'standard') {
      choices.push({ kind: 'card', card: rollPackCard(run) });
    } else {
      const id = rollPackCons(run, offer.type, taken);
      taken.push(id);
      choices.push({ kind: 'cons', cons: { uid: newId(run), id } });
    }
  }
  const needsHand = offer.type === 'rune' || offer.type === 'true';
  const hand = needsHand ? shuffle(run.rng, run.deck.map((c) => c.id)).slice(0, p.handSize) : [];
  return { type: offer.type, size: offer.size, choices, picksLeft: picks, hand };
}

export function voucherInfo(id: string | null) {
  return id ? VOUCHERS[id] : null;
}
