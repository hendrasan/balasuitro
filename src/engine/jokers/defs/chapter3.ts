import { isRank, isStone } from '../../cards';
import type { BehaviorMap } from '../types';

export const chapter3: BehaviorMap = {
  taki: { onHandScored: (c, j) => c.contains('straight') && c.addMult(j.p.mult) },
  hans: { passive: (p, _r, j) => void (p.jokerPriceMinus += j.p.minus) },
  tetsu: { onHandScored: (c, j) => c.played.length === 5 && c.addMult(j.p.mult) },
  chaco: { onHandScored: (c, j) => c.addChips(j.p.chips) },
  fitcher: { onRoundEnd: (r, j) => r.earn(Math.min(j.p.max, j.p.perJoker * r.run.jokers.length), 'Fitcher') },
  ridley_wizen: { onHandScored: (c, j) => c.handType === 'pair' && c.xMult(j.p.x) },
  stallion: {
    passive: (p, _r, j) => void (p.hands += j.p.hands),
    onRoundEnd: (r, j) => r.run.round?.discardsUsed === 0 && r.earn(j.p.money, 'Stallion'),
  },
  hai_yo: {
    // "Skipped no Blind" = no Blind skipped this Ante.
    onRoundEnd: (r, j) => {
      if (r.run.anteState.skipped) return;
      r.earn(j.p.money, 'Hai Yo');
      r.run.nextRound.hands += j.p.hands;
    },
  },
  shilo: { onHandScored: (c, j) => c.chance(j.p.num, j.p.den) && c.earn(j.p.money) },
  sid: { onCardScored: (c, j, card) => isRank(card, 2) && c.addChips(j.p.chips) },
  gabocha: { onHandScored: (c, j) => c.addChips(j.p.chips) },
  gadget: {
    onReroll: (_r, j) => {
      if (!j.isCopy) j.inst.state.mult = (j.inst.state.mult ?? 0) + j.p.mult;
    },
    onHandScored: (c, j) => c.addMult(j.inst.state.mult ?? 0),
  },
  meg: {
    onHandScored: (c, j) => {
      const k = `meg:${j.slot.uid}`;
      const got = c.roundCounter(k);
      if (got >= j.p.max) return;
      c.setRoundCounter(k, got + j.p.money);
      c.earn(j.p.money);
    },
  },
  wakaba: { onHandScored: (c, j) => c.addMult(j.p.perAnte * c.run.ante) },
  tony: { retrigger: (_c, j, _card, _i, pos) => (pos === 0 ? j.p.retriggers : 0) },
  hix: { onHandScored: (c, j) => c.addMult(j.p.mult * c.played.filter((x) => x.enh !== 'none').length) },
  tengaar: { onHandScored: (c, j) => c.addChips(j.p.chips * c.played.filter((x) => x.enh !== 'none').length) },
  yuzu: {
    onHandScored: (c, j) => {
      const ranks = new Set(c.scoringCards.filter((x) => !isStone(x)).map((x) => x.rank));
      c.addChips(j.p.chips * ranks.size);
    },
  },
  emilia: { passive: (p, _r, j) => void (p.consumableSlots += j.p.slots) },
};
