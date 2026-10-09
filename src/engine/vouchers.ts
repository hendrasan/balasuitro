// Blacksmith upgrades (Voucher analog). Effects match Balatro.
import type { Passives } from './state';

export interface VoucherDef {
  id: string;
  name: string;
  text: string;
  requires?: string;
  apply(p: Passives): void;
}

export const VOUCHER_LIST: VoucherDef[] = [
  { id: 'overstock', name: 'Wider Counter', text: '+1 card slot in the shop', apply: (p) => void (p.shopSlots += 1) },
  { id: 'overstock_plus', name: 'Grand Bazaar', text: '+1 more card slot in the shop', requires: 'overstock', apply: (p) => void (p.shopSlots += 1) },
  { id: 'clearance', name: 'Haggling', text: 'All shop items are 25% off', apply: (p) => void (p.shopDiscountPct += 25) },
  { id: 'liquidation', name: 'Old Friend Discount', text: 'All shop items are 50% off', requires: 'clearance', apply: (p) => void (p.shopDiscountPct += 25) },
  { id: 'reroll_surplus', name: 'Spare Parts', text: 'Rerolls cost 2 Potch less', apply: (p) => void (p.rerollMinus += 2) },
  { id: 'reroll_glut', name: 'Master Stock', text: 'Rerolls cost 2 Potch less again', requires: 'reroll_surplus', apply: (p) => void (p.rerollMinus += 2) },
  { id: 'crystal_ball', name: 'Rune Pouch', text: '+1 consumable slot', apply: (p) => void (p.consumableSlots += 1) },
  { id: 'grabber', name: 'Sharpened Edge', text: '+1 hand each round', apply: (p) => void (p.hands += 1) },
  { id: 'nacho_tong', name: 'Tempered Edge', text: '+1 more hand each round', requires: 'grabber', apply: (p) => void (p.hands += 1) },
  { id: 'wasteful', name: 'Light Armor', text: '+1 discard each round', apply: (p) => void (p.discards += 1) },
  { id: 'recyclomancy', name: 'Swift Boots', text: '+1 more discard each round', requires: 'wasteful', apply: (p) => void (p.discards += 1) },
  { id: 'seed_money', name: 'Savings Box', text: 'Raise the interest cap to 10 Potch', apply: (p) => void (p.interestCap = Math.max(p.interestCap, 10)) },
  { id: 'money_tree', name: 'Treasure Vault', text: 'Raise the interest cap to 20 Potch', requires: 'seed_money', apply: (p) => void (p.interestCap = Math.max(p.interestCap, 20)) },
  { id: 'paint_brush', name: 'Long Grip', text: '+1 hand size', apply: (p) => void (p.handSize += 1) },
  { id: 'palette', name: 'Masterwork Grip', text: '+1 more hand size', requires: 'paint_brush', apply: (p) => void (p.handSize += 1) },
  { id: 'hone', name: 'Polish', text: 'Foil, Holographic and Polychrome Jokers appear 2X more often', apply: (p) => void (p.editionRate = Math.max(p.editionRate, 2)) },
  { id: 'glow_up', name: 'Mirror Finish', text: 'Foil, Holographic and Polychrome Jokers appear 4X more often', requires: 'hone', apply: (p) => void (p.editionRate = Math.max(p.editionRate, 4)) },
  { id: 'tarot_merchant', name: 'Rune Dealer', text: 'Runes appear 2.4X more often in the shop', apply: (p) => void (p.runeWeight = Math.max(p.runeWeight, 9.6)) },
  { id: 'tarot_tycoon', name: 'Rune Tycoon', text: 'Runes appear 8X more often in the shop', requires: 'tarot_merchant', apply: (p) => void (p.runeWeight = Math.max(p.runeWeight, 32)) },
  { id: 'planet_merchant', name: 'Forge Dealer', text: 'Forging cards appear 2.4X more often in the shop', apply: (p) => void (p.forgingWeight = Math.max(p.forgingWeight, 9.6)) },
  { id: 'planet_tycoon', name: 'Forge Tycoon', text: 'Forging cards appear 8X more often in the shop', requires: 'planet_merchant', apply: (p) => void (p.forgingWeight = Math.max(p.forgingWeight, 32)) },
];

export const VOUCHERS: Record<string, VoucherDef> = Object.fromEntries(VOUCHER_LIST.map((v) => [v.id, v]));
