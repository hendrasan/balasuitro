import type { RunState } from '../../state';
import type { BehaviorMap, JokerRef } from '../types';

/** Viki's random effect for the current round: 0 +Chips, 1 +Mult, 2 +Potch, 3 X Mult. */
export function vikiEffect(run: RunState, j: JokerRef, pickFn: () => number): number {
  const key = run.ante * 10 + run.blindIndex;
  if (j.inst.state.roundKey !== key) {
    j.inst.state.roundKey = key;
    j.inst.state.effect = pickFn();
  }
  return j.inst.state.effect;
}

export const special: BehaviorMap = {
  riou: {
    // X1, +X0.02 for every other Joker recruited (owned at least once) in the Collection.
    onHandScored: (c, j) => {
      const n = c.run.discovered.owned.filter((id) => id !== 'riou').length;
      c.xMult(1 + j.p.xPer * n);
    },
  },
  // Copy is done by refs.ts. The X2 with Riou is the jowy_riou Bond.
  jowy_atreides: {},
  shu: {
    passive: (p, _run, j) => {
      p.revealBosses = true;
      p.bossRerolls += j.p.bossRerolls;
    },
    onHandScored: (c, j) => c.xMult(j.p.x),
  },
  viki: {
    onRoundStart: (r, j) => {
      const e = vikiEffect(r.run, j, () => r.pick([0, 1, 2, 3]));
      const names = ['+30 Chips', '+10 Mult', '+5 Potch', 'X1.5 Mult'];
      r.log(`Viki: this round gives ${names[e]}`);
      if (e === 2) r.earn(j.p.money, 'Viki');
    },
    onHandScored: (c, j) => {
      const e = vikiEffect(c.run, j, () => c.r.pick([0, 1, 2, 3]));
      if (e === 0) c.addChips(j.p.chips);
      if (e === 1) c.addMult(j.p.mult);
      if (e === 3) c.xMult(j.p.x);
    },
  },
  luca_blight: {
    onHandScored: (c, j) => c.xMult(j.p.x),
    onRoundEnd: (r, j) => {
      const others = r.run.jokers.filter((x) => x.uid !== j.inst.uid);
      if (others.length) r.destroyJoker(r.pick(others).uid, 'Luca Blight');
    },
  },
};
