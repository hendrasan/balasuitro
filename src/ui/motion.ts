// Motion helpers. All motion goes through here so the reduced-motion setting
// (Settings > Reduced motion, or the system preference) applies everywhere.
import { game } from '../stores/game.svelte';

export const EASE_OUT = 'cubic-bezier(0.23, 1, 0.32, 1)';
export const EASE_IN_OUT = 'cubic-bezier(0.77, 0, 0.175, 1)';

export function reduced(): boolean {
  return game.reducedMotion();
}

/** Duration for Svelte transitions: 0 when motion is reduced. */
export function dur(ms: number): number {
  return reduced() ? 0 : ms;
}

/** Scoring-replay durations follow the speed setting. */
export function scoreDur(ms: number): number {
  return reduced() ? 0 : ms / Math.max(0.5, game.settings.speed);
}

/** Web Animations API call that does nothing when motion is reduced. */
export function play(el: Element | null | undefined, frames: Keyframe[], opts: KeyframeAnimationOptions): void {
  if (!el || reduced() || typeof el.animate !== 'function') return;
  el.animate(frames, opts);
}

/** Short "this fired" wiggle for a card or Joker during the scoring replay. */
export function wiggle(el: Element | null | undefined): void {
  play(
    el,
    [
      { transform: 'rotate(0deg) scale(1)' },
      { transform: 'rotate(-4deg) scale(1.12)', offset: 0.3 },
      { transform: 'rotate(3deg) scale(1.08)', offset: 0.6 },
      { transform: 'rotate(0deg) scale(1)' },
    ],
    { duration: scoreDur(320), easing: EASE_OUT },
  );
}

/** Small scale bump for a number box that changed. */
export function bump(el: Element | null | undefined, size = 1.14): void {
  play(el, [{ transform: 'scale(1)' }, { transform: `scale(${size})`, offset: 0.35 }, { transform: 'scale(1)' }], {
    duration: scoreDur(220),
    easing: EASE_OUT,
  });
}

/** Horizontal shake, for X Mult hits. */
export function shake(el: Element | null | undefined, px = 4): void {
  play(
    el,
    [
      { transform: 'translateX(0)' },
      { transform: `translateX(${-px}px) rotate(-1deg)` },
      { transform: `translateX(${px}px) rotate(1deg)` },
      { transform: `translateX(${-px / 2}px)` },
      { transform: 'translateX(0)' },
    ],
    { duration: scoreDur(260), easing: EASE_IN_OUT },
  );
}
