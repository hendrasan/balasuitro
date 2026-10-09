// All Joker behaviors keyed by id. Data (name, tags, text, params) is in src/data/jokers.json.
import type { BehaviorMap } from './types';
import { special } from './defs/special';
import { chapter1 } from './defs/chapter1';
import { chapter2 } from './defs/chapter2';
import { chapter3 } from './defs/chapter3';
import { chapter4 } from './defs/chapter4';
import { chapter5 } from './defs/chapter5';
import { chapter6 } from './defs/chapter6';

export const BEHAVIORS: BehaviorMap = {
  ...special,
  ...chapter1,
  ...chapter2,
  ...chapter3,
  ...chapter4,
  ...chapter5,
  ...chapter6,
};
