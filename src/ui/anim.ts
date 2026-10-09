import type { ScoreEvent } from '../engine/state';
import type { ScoringAnim } from '../stores/game.svelte';
import { mult, num } from './format';

export function currentEvent(a: ScoringAnim | null): ScoreEvent | null {
  if (!a || a.step < 0) return null;
  return a.result.events[a.step] ?? null;
}

export function popupText(e: ScoreEvent): string {
  switch (e.kind) {
    case 'chips':
      return `+${num(e.value)}`;
    case 'mult':
      return `+${mult(e.value)} Mult`;
    case 'xmult':
      return `X${mult(e.value)}`;
    case 'money':
      return `+${e.value}P`;
    default:
      return e.text ?? '';
  }
}
