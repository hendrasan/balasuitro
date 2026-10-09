import { isRank, isStone } from '../../cards';
import type { BehaviorMap } from '../types';

export const chapter5: BehaviorMap = {
  sheena: { onHandScored: (c, j) => c.addMult(j.p.multPerBoss * c.run.stats.bossesDefeated) },
  lorelai: {
    onConsumableUsed: (r, j, _cons, kind) => {
      if (kind !== 'rune') return;
      const k = `lorelai:${j.slot.uid}`;
      if (r.counter(k) >= j.p.max) return;
      r.setCounter(k, r.counter(k) + j.p.money);
      r.earn(j.p.money, 'Lorelai');
    },
  },
  // "Cap raised to $40" = at most 10 Potch interest (40 held / 4).
  gordon: {
    passive: (p, _r, j) => {
      p.interestPer = Math.min(p.interestPer, j.p.per);
      p.interestCap = Math.max(p.interestCap, j.p.cap);
    },
  },
  mondo: { retrigger: (_c, j, _card, idx) => (idx === 0 ? j.p.retriggers : 0) },
  sasuke: { retrigger: (c, j, _card, idx) => (idx === c.played.length - 1 ? j.p.retriggers : 0) },
  bob: { onHandScored: (c, j) => c.addMult(j.p.mult * Math.floor(c.run.discovered.owned.length / j.p.per)) },
  tomo: { onCardScored: (c, j, card) => isStone(card) && c.addChips(j.p.chips) },
  annallee: { onHandScored: (c, j) => c.addMult(j.p.multPerJoker * c.run.jokers.length) },
  killey: { onHandScored: (c, j) => c.addMult(j.p.mult) },
  // The first hand of a run has no previous hand, so it counts as different.
  karen: { onHandScored: (c, j) => c.run.stats.lastHandType !== c.handType && c.addChips(j.p.chips) },
  maximillian: { onHandScored: (c, j) => c.played.some((x) => isRank(x, 14)) && c.addChips(j.p.chips) },
  hoi: { onHandScored: (c, j) => (c.run.round?.discardsLeft ?? 1) === 0 && c.addMult(j.p.mult) },
  // After the first discard of the round, +10 Mult for the rest of the round.
  long_chan_chan: { onHandScored: (c, j) => (c.run.round?.discardsUsed ?? 0) >= 1 && c.addMult(j.p.mult) },
  tenkou: { retrigger: (_c, j, card) => (isRank(card, j.p.rank) ? j.p.retriggers : 0) },
  raura: { onConsumableUsed: (r, j, _cons, kind) => kind === 'rune' && r.earn(j.p.money, 'Raura') },
};
