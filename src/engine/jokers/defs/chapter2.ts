import { isRank, isSuit } from '../../cards';
import type { BehaviorMap } from '../types';

export const chapter2: BehaviorMap = {
  flik: { onHandScored: (c, j) => c.isFirst && c.xMult(j.p.x) },
  viktor: { onHandScored: (c, j) => c.isFinal && c.xMult(j.p.x) },
  freed_yamamoto: { retrigger: (_c, j, card) => (isRank(card, j.p.rank) ? j.p.retriggers : 0) },
  yoshino_yamamoto: { onCardScored: (c, j, card) => isRank(card, 11) && c.addChips(j.p.chips) },
  barbara: { onCardScored: (c, j, card) => isSuit(card, 'H') && c.addMult(j.p.mult) },
  huan: { onCardScored: (c, j, card) => isSuit(card, 'C') && c.addMult(j.p.mult) },
  leona: { onCardScored: (c, j, card) => isSuit(card, 'S') && c.addMult(j.p.mult) },
  luc: { onHandScored: (c, j) => c.xMult(1 + j.p.xPer * c.run.stats.runesUsed) },
  amada: { onHandScored: (c, j) => c.handType === 'high' && c.addChips(j.p.chips) },
  tai_ho: {
    // Chinchirorin: 1-2 nothing, 3-4 +Mult, 5 +more Mult, 6 X Mult.
    onHandScored: (c, j) => {
      const d = c.roll(6, (v) => v <= 2);
      c.msg(`Rolled ${d}`);
      if (d === 3 || d === 4) c.addMult(j.p.midMult);
      else if (d === 5) c.addMult(j.p.highMult);
      else if (d === 6) c.xMult(j.p.x);
    },
  },
  yam_koo: {
    onHandScored: (c, j) => c.addMult(Math.min(j.p.max, j.p.multPer * Math.floor(Math.max(0, c.run.money) / j.p.per))),
  },
  oulan: { onCardScored: (c, j, card) => isRank(card, 12) && c.addMult(j.p.mult) },
  richmond: { onHandScored: (c, j) => (c.chance(j.p.num, j.p.den) ? c.xMult(j.p.x) : c.msg('Nope!')) },
  alex: { passive: (p, _r, j) => void (p.rerollMinus += j.p.rerollMinus) },
  hilda: { onReroll: (r, j) => r.earn(j.p.money, 'Hilda') },
  adlai: { onRoundEnd: (r, j) => r.run.round?.handsPlayed === 1 && r.earn(j.p.money, 'Adlai') },
  clive: {
    onHandScored: (c, j) => c.isFinal && c.xMult(j.p.x),
    onHandFinished: (r, j, info) => info.final && info.won && r.earn(j.p.money, 'Clive'),
  },
};
