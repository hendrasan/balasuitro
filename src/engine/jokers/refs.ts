import { JOKERS } from '../data';
import type { JokerInstance, RunState } from '../state';
import { hasTier } from './tags';
import type { JokerRef } from './types';

export const JOWY = 'jowy_atreides';

export function isJokerDebuffed(run: RunState, inst: JokerInstance): boolean {
  return run.round?.debuffedJokerUid === inst.uid;
}

/** Multiplier for Beast Jokers' own effects: Beast tier 4 (+25%) and Badeaux (+50%), additive. */
export function beastScale(run: RunState): number {
  let s = 1;
  if (hasTier(run, 'beast', 4)) s += 0.25;
  const badeaux = run.jokers.find((j) => j.id === 'badeaux' && !isJokerDebuffed(run, j));
  if (badeaux) s += JOKERS.badeaux.params.pct / 100;
  return s;
}

function makeRef(inst: JokerInstance, slot: JokerInstance, index: number, isCopy: boolean, beast: number): JokerRef {
  const data = JOKERS[inst.id];
  return { inst, data, p: data.params, scale: data.tags.includes('beast') ? beast : 1, isCopy, slot, index };
}

/**
 * The effect giver in slot i, or null. Jowy's slot gives a copy of the Joker to his right
 * (if any, and not debuffed). Debuffed slots give nothing.
 */
export function refAt(run: RunState, i: number, beast = beastScale(run)): JokerRef | null {
  const inst = run.jokers[i];
  if (!inst || isJokerDebuffed(run, inst)) return null;
  if (inst.id === JOWY) {
    const target = run.jokers[i + 1];
    if (!target || target.id === JOWY || isJokerDebuffed(run, target)) return null;
    return makeRef(target, inst, i, true, beast);
  }
  return makeRef(inst, inst, i, false, beast);
}

/** All effect givers left to right, including Jowy's copy. */
export function jokerRefs(run: RunState): JokerRef[] {
  const beast = beastScale(run);
  const out: JokerRef[] = [];
  for (let i = 0; i < run.jokers.length; i++) {
    const r = refAt(run, i, beast);
    if (r) out.push(r);
  }
  return out;
}

/** Own (non-copy) refs. Used for passive modifiers, which Jowy does not copy. */
export function ownRefs(run: RunState): JokerRef[] {
  const beast = beastScale(run);
  return run.jokers
    .map((inst, i) => (isJokerDebuffed(run, inst) || inst.id === JOWY ? null : makeRef(inst, inst, i, false, beast)))
    .filter((r): r is JokerRef => r !== null);
}
