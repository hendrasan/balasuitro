import { isStone, isSuit } from '../../cards';
import { mostPlayedHand } from '../../hands';
import type { BehaviorMap } from '../types';

export const chapter6: BehaviorMap = {
  gijimu: { onHandScored: (c, j) => c.addMult(Math.min(j.p.max, j.p.multPerBoss * c.run.stats.bossesDefeated)) },
  hauser: { onHandScored: (c, j) => c.addChips(Math.min(j.p.max, j.p.chipsPerBoss * c.run.stats.bossesDefeated)) },
  kahn_marley: { onHandScored: (c, j) => c.addMult(j.p.mult) },
  koyu: { onHandScored: (c, j) => c.addChips(j.p.chips) },
  lo_wen: { onBossDefeated: (r, j) => r.earn(j.p.money, 'Lo Wen') },
  // "+1 discard per Boss Blind" = +1 discard during Boss Blinds.
  marlowe: {
    onRoundStart: (r, j) => {
      if (r.run.round?.bossId) r.run.round.discardsLeft += j.p.discards;
    },
  },
  // Rune doubling is in run.ts applyConsumable.
  sierra_mikain: { onHandScored: (c, j) => c.isBoss && c.xMult(j.p.x) },
  // Double skip rewards are in run.ts skipBlind.
  jess: {},
  georg_prime: { onHandScored: (c, j) => c.played.length === 1 && c.xMult(j.p.x) },
  gantetsu: { onHandScored: (c, j) => c.addChips(j.p.chipsPerCard * c.run.deck.length) },
  boris_wizen: { onHandScored: (c, j) => c.handType === 'twopair' && c.xMult(j.p.x) },
  pico: { onHandScored: (c, j) => c.addChips(j.p.chips) },
  alberto: { onHandScored: (c, j) => c.addMult(j.p.mult) },
  jude: { onHandScored: (c, j) => c.addChips(j.p.chipsPerStone * c.run.deck.filter(isStone).length) },
  tessai: {
    // Counts rounds won while owned. Jowy's copy does not count rounds.
    onRoundEnd: (r, j) => {
      if (j.isCopy) return;
      j.inst.state.rounds = (j.inst.state.rounds ?? 0) + 1;
      if (j.inst.state.rounds % j.p.every === 0) r.upgradeHand(mostPlayedHand(r.run.handLevels), j.p.levels, 'Tessai');
    },
  },
  vincent: { onCardScored: (c, j, card) => isSuit(card, 'D') && c.addMult(j.p.mult) },
  genshu: { onHandScored: (c, j) => c.addMult(j.p.multPerLevel * c.run.handLevels[mostPlayedHand(c.run.handLevels)].level) },
  // X1.5 per Boss defeated, multiplicative, capped at X3.
  pesmerga: { onHandScored: (c, j) => c.xMult(Math.min(j.p.max, Math.pow(j.p.x, c.run.stats.bossesDefeated))) },
  mazus: { onHandScored: (c, j) => c.xMult(j.p.x) },
};
