// Seeded RNG (mulberry32). The state is one 32-bit number, so it serializes trivially.
export interface Rng {
  s: number;
}

export function hashSeed(seed: string): number {
  // xmur3-style string hash
  let h = 1779033703 ^ seed.length;
  for (let i = 0; i < seed.length; i++) {
    h = Math.imul(h ^ seed.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  h = Math.imul(h ^ (h >>> 16), 2246822507);
  h = Math.imul(h ^ (h >>> 13), 3266489909);
  return (h ^= h >>> 16) >>> 0;
}

export function makeRng(seed: string): Rng {
  return { s: hashSeed(seed) };
}

/** Returns a float in [0, 1). */
export function next(r: Rng): number {
  r.s = (r.s + 0x6d2b79f5) | 0;
  let t = r.s;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

export function int(r: Rng, n: number): number {
  return Math.floor(next(r) * n);
}

export function chance(r: Rng, num: number, den: number): boolean {
  return next(r) < num / den;
}

export function pick<T>(r: Rng, arr: readonly T[]): T {
  return arr[int(r, arr.length)];
}

export function shuffle<T>(r: Rng, arr: T[]): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = int(r, i + 1);
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export function weighted<T>(r: Rng, entries: readonly (readonly [T, number])[]): T {
  const total = entries.reduce((s, e) => s + e[1], 0);
  let x = next(r) * total;
  for (const [v, w] of entries) {
    x -= w;
    if (x < 0) return v;
  }
  return entries[entries.length - 1][0];
}

const SEED_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ123456789';
/** A new random seed string. Uses Math.random only to choose the seed itself. */
export function randomSeed(): string {
  let s = '';
  for (let i = 0; i < 8; i++) s += SEED_CHARS[Math.floor(Math.random() * SEED_CHARS.length)];
  return s;
}
