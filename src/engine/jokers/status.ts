// Read-only "current value" text for Jokers with counters, for the UI.
import { JOKERS } from '../data';
import { mostPlayedHand } from '../hands';
import type { JokerInstance, RunState } from '../state';

const VIKI = ['+30 Chips', '+10 Mult', '+5 Potch', 'X1.5 Mult'];

export function jokerStatus(run: RunState, j: JokerInstance): string | null {
  const p = JOKERS[j.id]?.params ?? {};
  const bosses = run.stats.bossesDefeated;
  switch (j.id) {
    case 'riou':
      return `Currently X${(1 + p.xPer * run.discovered.owned.filter((x) => x !== 'riou').length).toFixed(2)} Mult`;
    case 'luc':
      return `Currently X${(1 + p.xPer * run.stats.runesUsed).toFixed(1)} Mult`;
    case 'pesmerga':
      return `Currently X${Math.min(p.max, Math.pow(p.x, bosses)).toFixed(2)} Mult`;
    case 'anita':
    case 'gadget':
      return `Currently +${j.state.mult ?? 0} Mult`;
    case 'viki':
      return j.state.effect != null ? `This round: ${VIKI[j.state.effect]}` : null;
    case 'tessai':
      return `Rounds counted: ${j.state.rounds ?? 0}`;
    case 'sheena':
      return `Currently +${p.multPerBoss * bosses} Mult`;
    case 'gijimu':
      return `Currently +${Math.min(p.max, p.multPerBoss * bosses)} Mult`;
    case 'hauser':
      return `Currently +${Math.min(p.max, p.chipsPerBoss * bosses)} Chips`;
    case 'bob':
      return `Currently +${p.mult * Math.floor(run.discovered.owned.length / p.per)} Mult`;
    case 'genshu':
      return `Currently +${p.multPerLevel * run.handLevels[mostPlayedHand(run.handLevels)].level} Mult`;
    case 'gantetsu':
      return `Currently +${p.chipsPerCard * run.deck.length} Chips`;
    case 'futch':
      return `Pays ${Math.min(p.max, p.perBoss * bosses)} Potch per round`;
    case 'shin':
      return run.anteState.shinUsed ? 'Protection used this Ante' : 'Protection ready';
    default:
      return null;
  }
}
