// Optional sound effects with ZzFX. Off by default. The library is loaded only after
// the player turns sound on, because it creates an AudioContext when imported.
type Zzfx = (...p: (number | undefined)[]) => unknown;
let play: Zzfx | null = null;
let loading = false;

export type Sfx = 'chips' | 'mult' | 'xmult' | 'money' | 'select' | 'play' | 'win' | 'lose' | 'buy';

const SOUNDS: Record<Sfx, (number | undefined)[]> = {
  chips: [0.4, 0.05, 520, , 0.01, 0.05, 1, 1.5, , , , , , , , , , 0.5],
  mult: [0.4, 0.05, 330, , 0.02, 0.08, 2, 1.2, , , , , , , , , , 0.6],
  xmult: [0.6, 0.05, 160, 0.01, 0.05, 0.2, 3, 1.8, , , 220, 0.05],
  money: [0.4, 0, 1300, , 0.02, 0.15, 1, 1.5, , , 400, 0.05],
  select: [0.2, 0.05, 900, , 0.01, 0.02, 1, 2],
  play: [0.4, 0.05, 240, 0.02, 0.05, 0.1, 4, 0.8],
  win: [0.6, 0, 523, 0.05, 0.3, 0.4, 1, 1.4, , , 260, 0.1, 0.1],
  lose: [0.6, 0, 200, 0.05, 0.3, 0.5, 2, 0.8, -1, , , , 0.2],
  buy: [0.4, 0, 700, , 0.04, 0.1, 1, 1.5, , , 300, 0.04],
};

export function enableSound(): void {
  if (play || loading) return;
  loading = true;
  import('zzfx')
    .then((m) => {
      m.ZZFX.volume = 0.25;
      play = m.zzfx;
    })
    .catch(() => {
      /* sound is optional */
    })
    .finally(() => (loading = false));
}

export function sfx(name: Sfx, enabled: boolean): void {
  if (!enabled) return;
  if (!play) {
    enableSound();
    return;
  }
  try {
    play(...SOUNDS[name]);
  } catch {
    /* ignore */
  }
}
