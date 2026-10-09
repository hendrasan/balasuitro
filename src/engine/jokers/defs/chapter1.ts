import { isRank } from '../../cards';
import { JOKERS } from '../../data';
import { handRank } from '../../hands';
import { type BehaviorMap, sc } from '../types';

export function beastCount(jokers: { id: string }[]): number {
  return jokers.filter((x) => JOKERS[x.id]?.tags.includes('beast')).length;
}

export const chapter1: BehaviorMap = {
  // Beast: integer effects are rounded after the Beast scale (1.25 -> 1, 1.5 -> 2).
  mukumuku: { passive: (p, _r, j) => void (p.discards += Math.round(sc(j, j.p.discards))) },
  nanami: { onHandScored: (c, j) => c.contains('pair') && c.addMult(j.p.mult) },
  gengen: { onHandScored: (c, j) => c.played.length <= j.p.maxCards && c.addChips(j.p.chips) },
  rikimaru: {
    onHandScored: (c, j) => c.addMult(j.p.mult),
    onRoundEnd: (r, j) => r.earn(-j.p.upkeep, 'Rikimaru is hungry'),
  },
  millie: { onRoundEnd: (r, j) => r.earn(j.p.perBeast * beastCount(r.run.jokers), 'Millie') },
  // "Hands remaining" = hands left after the current hand.
  kinnison: { onHandScored: (c, j) => c.addChips(j.p.chipsPerHand * c.handsLeft) },
  shiro: { onHandScored: (c, j) => c.addMult(sc(j, j.p.mult)) },
  zamza: { onRoundEnd: (r, j) => r.earn(j.p.money, 'Zamza') },
  apple: { passive: (p, _r, j) => void (p.previewCount = Math.max(p.previewCount, j.p.preview)) },
  hanna: { onHandScored: (c, j) => c.addChips(j.p.chipsPerCard * (c.run.round?.cardsDiscarded ?? 0)) },
  tsai: { onBossDefeated: (r, j) => r.upgradeHand(r.randomHandType(), j.p.levels, 'Tsai') },
  tuta: {
    onCardScored: (c, j, card, _i, pos) => {
      if (pos !== 0 || c.rep !== 0) return;
      card.bonusChips += j.p.chips;
      c.msg(`+${j.p.chips} Chips forever`);
    },
  },
  anita: {
    onShopExit: (_r, j, bought) => {
      if (!bought && !j.isCopy) j.inst.state.mult = (j.inst.state.mult ?? 0) + j.p.mult;
    },
    onBossDefeated: (_r, j) => {
      if (!j.isCopy) j.inst.state.mult = 0;
    },
    onHandScored: (c, j) => c.addMult(j.inst.state.mult ?? 0),
  },
  templeton: { onCardScored: (c, j, card) => isRank(card, 14) && c.addChips(j.p.chips) },
  gilbert: { onHandScored: (c, j) => c.run.anteState.skipped && c.xMult(j.p.x) },
  bolgan: { onHandScored: (c, j) => handRank(c.handType) >= handRank('three') && c.addChips(j.p.chips) },
  eilie: { onHandScored: (c, j) => c.played.length === j.p.cards && c.addMult(j.p.mult) },
  rina: {
    onRoundStart: (r, j) => {
      if (!r.run.round?.bossId) return;
      for (let i = 0; i < j.p.runes; i++) r.createConsumable('rune');
    },
  },
};
