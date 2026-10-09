// Typed access to the JSON data files.
import jokersJson from '../data/jokers.json';
import tagsJson from '../data/tags.json';
import bondsJson from '../data/bonds.json';
import bossesJson from '../data/bosses.json';
import type { Rarity } from './state';

export interface JokerData {
  id: string;
  num: number;
  name: string;
  rarity: Rarity;
  chapter: number;
  tags: string[];
  text: string;
  bondText: string;
  cost: number;
  params: Record<string, number>;
  locked?: boolean;
  unsellable?: boolean;
  minCollection?: number;
}

export interface TagTier {
  count: number;
  text: string;
  params: Record<string, number>;
}
export interface TagData {
  id: string;
  name: string;
  tiers: TagTier[];
}

export interface BondData {
  id: string;
  name: string;
  members: string[];
  rule: 'adjacent' | 'rightOf';
  text: string;
  params: Record<string, number>;
  invented?: boolean;
}

export type BossMechanic =
  | 'needle' | 'plant' | 'crimson' | 'hook' | 'water' | 'tooth' | 'eye'
  | 'wall' | 'goad' | 'club' | 'arm' | 'flint' | 'mouth';

export interface BossData {
  id: string;
  name: string;
  title: string;
  mechanic: BossMechanic;
  text: string;
  targetMult: number;
  minAnte: number;
  fixed?: boolean;
  finale?: boolean;
}

export const JOKER_LIST = jokersJson as JokerData[];
export const JOKERS: Record<string, JokerData> = Object.fromEntries(JOKER_LIST.map((j) => [j.id, j]));
export const TAG_LIST = tagsJson as TagData[];
export const TAGS: Record<string, TagData> = Object.fromEntries(TAG_LIST.map((t) => [t.id, t]));
export const BOND_LIST = bondsJson as BondData[];
export const BONDS: Record<string, BondData> = Object.fromEntries(BOND_LIST.map((b) => [b.id, b]));
export const BOSS_LIST = bossesJson as BossData[];
export const BOSSES: Record<string, BossData> = Object.fromEntries(BOSS_LIST.map((b) => [b.id, b]));

export const CHAPTER_NAMES = [
  'Special', 'Kyaro / Muse', 'Jowston Alliance', 'Lakewest / Two River',
  'Greenhill / Matilda', 'Gregminster / Rokkaku', 'Tinto / Highland',
];

export function bondsOf(jokerId: string): BondData[] {
  return BOND_LIST.filter((b) => b.members.includes(jokerId));
}
