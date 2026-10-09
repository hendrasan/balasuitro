// Bonds: adjacency bonuses. Resolved from Joker positions on every check.
import { isStone, isSuit, isRank } from '../cards';
import { BOND_LIST, JOKERS, type BondData } from '../data';
import type { RunState } from '../state';
import type { EffectBehavior } from './effects';

/** True if every member is present (not debuffed) and the rule holds. */
export function bondActive(run: RunState, bond: BondData): boolean {
  const off = run.round?.debuffedJokerUid ?? null;
  const pos = bond.members.map((id) => run.jokers.findIndex((j) => j.id === id && j.uid !== off));
  if (pos.some((p) => p < 0)) return false;
  if (bond.rule === 'rightOf') return pos[1] === pos[0] + 1;
  // Adjacent: members form one contiguous group, any order.
  return Math.max(...pos) - Math.min(...pos) === bond.members.length - 1;
}

export function activeBonds(run: RunState): BondData[] {
  return BOND_LIST.filter((b) => bondActive(run, b));
}

/** Members of the bond that are in the Joker row (for "partners present" display). */
export function bondMembersPresent(run: RunState, bond: BondData): string[] {
  return bond.members.filter((id) => run.jokers.some((j) => j.id === id));
}

const xm: EffectBehavior = { onHandScored: (c, q) => c.xMult(q.x) };
const addMult: EffectBehavior = { onHandScored: (c, q) => c.addMult(q.mult) };
const addChips: EffectBehavior = { onHandScored: (c, q) => c.addChips(q.chips) };
const hands: EffectBehavior = { passive: (p, _r, q) => void (p.hands += q.hands) };
const money: EffectBehavior = { onRoundEnd: (r, q) => r.earn(q.money, 'Bond') };

export const BOND_BEHAVIORS: Record<string, EffectBehavior> = {
  riou_nanami: hands,
  jowy_riou: xm, // The Ante 8 destruction is in run.ts (winRound).
  kinnison_shiro: {
    // "Both effects are doubled": add each effect once more.
    onHandScored: (c) => {
      c.addChips(JOKERS.kinnison.params.chipsPerHand * c.handsLeft);
      c.addMult(JOKERS.shiro.params.mult * c.beastScale);
    },
  },
  apple_shu: { passive: (p, _r, q) => void (p.previewCount = Math.max(p.previewCount, q.preview)) },
  tsai_tomo: { onCardScored: (c, q, card) => isStone(card) && c.addChips(q.chips) },
  flik_viktor: hands,
  freed_yoshino: { onCardScored: (c, q, card) => isRank(card, 11) && c.addMult(q.mult) },
  taiho_yamkoo: addMult,
  alex_hilda: money,
  chaco_fitcher_ridley: xm,
  ridley_boris: xm,
  gabocha_gengen: addChips,
  gadget_meg: money,
  longchanchan_wakaba: addMult,
  hix_tengaar: xm,
  teresa_nina_shin: xm,
  jeane_raura: {
    onRoundEnd: (r, q) => {
      for (let i = 0; i < q.runes; i++) r.createConsumable('rune');
    },
  },
  futch_humphrey: money,
  camus_miklotov: {
    onCardScored: (c, q, card) => {
      if (isSuit(card, 'C')) c.addMult(q.mult);
      if (isSuit(card, 'S')) c.addMult(q.mult);
    },
  },
  kiba_klaus: { onHandScored: (c, q) => c.contains('flush') && c.addChips(q.chips) },
  ayda_feather: addChips,
  simone_vincent: addMult,
  mondo_sasuke: xm,
  annallee_pico_alberto: xm,
  killey_alex: money,
  tessai_viktor: xm,
};
