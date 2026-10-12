// Short explanations for game keywords found in Joker and Rune texts.
import { EDITION_TEXT, ENH_TEXT, SEAL_TEXT, type Edition, type Enhancement, type Seal } from '../engine/cards';

const ENH_WORDS: [RegExp, Enhancement][] = [
  [/\bBonus card/i, 'bonus'],
  [/\bMult card/i, 'mult'],
  [/\bWild card/i, 'wild'],
  [/\bGlass card/i, 'glass'],
  [/\bSteel card/i, 'steel'],
  [/\bStone card/i, 'stone'],
  [/\bGold card/i, 'gold'],
  [/\bLucky card/i, 'lucky'],
];
const SEAL_WORDS: [RegExp, Seal][] = [
  [/Gold Seal/i, 'gold'],
  [/Red Seal/i, 'red'],
  [/Blue Seal/i, 'blue'],
  [/Purple Seal/i, 'purple'],
];
const EDITION_WORDS: [RegExp, Edition][] = [
  [/\bFoil\b/i, 'foil'],
  [/\bHolographic\b/i, 'holo'],
  [/\bPolychrome\b/i, 'poly'],
  [/\bNegative\b/i, 'negative'],
];

/** Explanations for every card keyword that appears in `text`. */
export function keywordNotes(text: string): string[] {
  const out: string[] = [];
  for (const [re, e] of ENH_WORDS) if (re.test(text)) out.push(ENH_TEXT[e]);
  if (/enhanced card/i.test(text)) out.push('Enhanced card: any card with an enhancement (Bonus, Mult, Wild, Glass, Steel, Stone, Gold or Lucky)');
  for (const [re, s] of SEAL_WORDS) if (re.test(text)) out.push(SEAL_TEXT[s]);
  for (const [re, e] of EDITION_WORDS) if (re.test(text)) out.push(EDITION_TEXT[e]);
  if (/Face card/i.test(text)) out.push('Face card: a Jack, Queen or King');
  if (/retrigger/i.test(text)) out.push('Retrigger: the card scores again, with all its effects');
  return out;
}
