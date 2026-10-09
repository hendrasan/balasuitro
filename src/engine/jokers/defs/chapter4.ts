import { isFace, isRed, isSuit } from '../../cards';
import type { BehaviorMap } from '../types';
import { sc, sx } from '../types';
import { beastCount } from './chapter1';

export const chapter4: BehaviorMap = {
  // Per hand played: each Face card held in hand gives +1 Potch.
  teresa_wisemail: { onHeld: (c, j, card) => isFace(card) && c.earn(j.p.money) },
  nina: { onCardScored: (c, j, card) => isFace(card) && c.addChips(j.p.chips) },
  // Destruction protection is in RunCtx.destroyJoker.
  shin: { onHandScored: (c, j) => c.addMult(j.p.mult) },
  jeane: {
    onRoundEnd: (r, j) => {
      for (let i = 0; i < j.p.runes; i++) r.createConsumable('rune');
    },
  },
  // Paid at the end of every round.
  futch: { onRoundEnd: (r, j) => r.earn(Math.min(j.p.max, j.p.perBoss * r.run.stats.bossesDefeated), 'Futch') },
  humphrey_mintz: { onSell: (r, j) => r.earn(j.p.money, 'Humphrey') },
  camus: { onCardScored: (c, j, card) => isSuit(card, 'C') && c.addChips(j.p.chips) },
  miklotov: { onCardScored: (c, j, card) => isSuit(card, 'S') && c.addChips(j.p.chips) },
  // "If hand is a Flush" = the hand type is exactly Flush.
  kiba_windamier: { onHandScored: (c, j) => c.handType === 'flush' && c.xMult(j.p.x) },
  klaus: { onHandScored: (c, j) => c.contains('flush') && c.addChips(j.p.chips) },
  // Applied through the Beast scale in refs.ts.
  badeaux: {},
  connell: { onHandScored: (c, j) => c.handType === 'pair' && c.earn(j.p.money) },
  ayda: { onHandScored: (c, j) => c.addChips(j.p.chipsPerBeast * beastCount(c.run.jokers)) },
  feather: { passive: (p, _r, j) => void (p.handSize += Math.round(sc(j, j.p.handSize))) },
  sigfried: {
    onHandScored: (c, j) => {
      const s = c.scoringCards;
      if (s.length > 0 && s.every(isRed)) c.xMult(sx(j, j.p.x));
    },
  },
  abizboah: { onHandScored: (c, j) => (c.handType === 'four' || c.handType === 'fullhouse') && c.xMult(sx(j, j.p.x)) },
  lebrante: {
    onRoundEnd: (r, j) => {
      for (const x of r.run.jokers) x.sellBonus += j.p.money;
      r.log('Lebrante raised Joker sell values');
    },
  },
  simone_verdricci: { onCardScored: (c, j, card) => isSuit(card, 'H') && c.addMult(j.p.mult) },
  kasumi: {
    onRoundStart: (r, j) => {
      if (r.run.anteState.roundsPlayed === 0 && r.run.round) r.run.round.handsLeft += j.p.hands;
    },
    onHandScored: (c, j) => c.addMult(j.p.mult),
  },
  valeria: { onHandScored: (c, j) => c.xMult(j.p.x) },
};
