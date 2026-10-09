// Scoring pipeline. Produces the final score and an ordered list of ScoreEvents.
// The UI only replays events; this module is the source of truth.
//
// Order (Balatro): base hand chips/mult -> each scoring card left to right
// (card chips, enhancement, edition, seal, Joker per-card hooks, then per-card Tag and Bond
// effects; with retriggers) -> held-in-hand effects -> Jokers left to right
// (foil/holo, hook, polychrome) -> Bonds -> Tags.
// Deviation: per-card Tag effects (Matilda 2, Craftsman 2) and per-card Bond effects
// (Freed/Yoshino, Camus/Miklotov, Tsai/Tomo) run in the card step, because they are
// per-card by nature. See docs/decisions.md.
import { CONFIG } from './config';
import { type Card, isFace, isSuit, rankChips } from './cards';
import { BOSSES } from './data';
import { RunCtx } from './ctx';
import { evaluateHand, handBase, type HandEval, type HandType } from './hands';
import { activeBonds, BOND_BEHAVIORS } from './jokers/bonds';
import { BEHAVIORS } from './jokers/registry';
import { beastScale, jokerRefs } from './jokers/refs';
import { activeTiers, TAG_BEHAVIORS } from './jokers/tags';
import type { JokerRef } from './jokers/types';
import { chance as rngChance } from './rng';
import type { RunState, ScoreEvent, ScoreEventKind, ScoreResult } from './state';

export function bossMechanic(run: RunState): string | null {
  const id = run.round?.bossId;
  return id ? (BOSSES[id]?.mechanic ?? null) : null;
}

export function isCardDebuffed(run: RunState, card: Card): boolean {
  switch (bossMechanic(run)) {
    case 'plant':
      return isFace(card);
    case 'goad':
      return isSuit(card, 'S');
    case 'club':
      return isSuit(card, 'C');
    default:
      return false;
  }
}

interface Src {
  source: string;
  jokerUid?: number;
  bondId?: string;
  tagId?: string;
  cardIndex?: number;
  heldIndex?: number;
}

export class ScoreCtx {
  chips = 0;
  mult = 0;
  money = 0;
  events: ScoreEvent[] = [];
  /** Repetition index while scoring a card (0 = first trigger). */
  rep = 0;
  src: Src = { source: 'Hand' };
  readonly r: RunCtx;
  readonly handsLeft: number;
  readonly isFirst: boolean;
  readonly isFinal: boolean;
  readonly isBoss: boolean;
  readonly beastScale: number;

  constructor(
    public run: RunState,
    public played: Card[],
    public held: Card[],
    public ev: HandEval,
  ) {
    this.r = new RunCtx(run);
    const round = run.round;
    this.handsLeft = round?.handsLeft ?? 0;
    this.isFirst = (round?.handsPlayed ?? 1) === 1;
    this.isFinal = this.handsLeft === 0;
    this.isBoss = !!round?.bossId;
    this.beastScale = beastScale(run);
  }

  get handType(): HandType {
    return this.ev.type;
  }

  get scoringCards(): Card[] {
    return this.ev.scoring.map((i) => this.played[i]);
  }

  contains(t: HandType): boolean {
    return this.ev.contains.includes(t);
  }

  private push(kind: ScoreEventKind, value: number, text?: string): void {
    this.events.push({ ...this.src, kind, value, text, chips: this.chips, mult: this.mult });
  }

  addChips(n: number): void {
    if (!n) return;
    this.chips += n;
    this.push('chips', n);
  }

  addMult(n: number): void {
    if (!n) return;
    this.mult += n;
    this.push('mult', n);
  }

  xMult(x: number): void {
    if (x === 1) return;
    this.mult *= x;
    this.push('xmult', x);
  }

  earn(n: number): void {
    if (!n) return;
    this.money += n;
    this.push('money', n);
  }

  msg(text: string): void {
    this.push('msg', 0, text);
  }

  /** Random check for a Joker effect (Gambler tier 4 can reroll a failure). */
  chance(num: number, den: number): boolean {
    return this.r.chance(num, den, true);
  }

  /** Random check that is not a Joker effect. */
  rawChance(num: number, den: number): boolean {
    return rngChance(this.run.rng, num, den);
  }

  roll(sides: number, bad: (v: number) => boolean): number {
    return this.r.roll(sides, bad);
  }

  roundCounter(k: string): number {
    return this.run.cycle[k] ?? 0;
  }

  setRoundCounter(k: string, v: number): void {
    this.run.cycle[k] = v;
  }

  setSrc(s: Src): void {
    this.src = s;
  }

  event(kind: ScoreEventKind, value: number, text?: string): void {
    this.push(kind, value, text);
  }
}

function jokerSrc(ref: JokerRef, extra: Partial<Src> = {}): Src {
  const name = ref.isCopy ? `Jowy (copy of ${ref.data.name})` : ref.data.name;
  return { source: name, jokerUid: ref.slot.uid, ...extra };
}

export interface ScoreOptions {
  blocked?: boolean;
}

/**
 * Score a played hand. `played` and `held` are in their current order.
 * Mutates the run only for effects that are permanent by rule (RNG state, permanent
 * card chips, per-round counters). Money is returned in `money`, not applied.
 */
export function computeScore(run: RunState, played: Card[], held: Card[], opts: ScoreOptions = {}): ScoreResult {
  const ev = evaluateHand(played);
  const c = new ScoreCtx(run, played, held, ev);
  const lvl = run.handLevels[ev.type].level;
  let base = handBase(ev.type, lvl);
  if (bossMechanic(run) === 'flint') {
    base = { chips: Math.floor(base.chips / 2 + 0.5), mult: Math.max(1, Math.floor(base.mult / 2 + 0.5)) };
  }
  c.chips = base.chips;
  c.mult = base.mult;
  c.setSrc({ source: 'Hand' });
  c.event('base', 0, `Level ${lvl}`);
  // Food eaten before this hand (Hai Yo's Kitchen).
  c.setSrc({ source: 'Food' });
  c.addChips(run.nextHand?.chips ?? 0);
  c.addMult(run.nextHand?.mult ?? 0);

  const result = (blocked: boolean, destroyedIds: number[]): ScoreResult => {
    const total = blocked ? 0 : Math.floor(c.chips * c.mult);
    return {
      handType: ev.type,
      playedIds: played.map((x) => x.id),
      heldIds: held.map((x) => x.id),
      scoring: ev.scoring,
      events: c.events,
      chips: c.chips,
      mult: c.mult,
      total,
      money: c.money,
      blocked,
      destroyedIds,
    };
  };

  if (opts.blocked) {
    c.event('blocked', 0, 'Not allowed!');
    return result(true, []);
  }

  const refs = jokerRefs(run);
  const bonds = activeBonds(run);
  const tiers = activeTiers(run);
  const destroyed: number[] = [];

  // ---- scoring cards ----
  ev.scoring.forEach((idx, pos) => {
    const card = played[idx];
    if (isCardDebuffed(run, card)) {
      c.setSrc({ source: 'Debuffed', cardIndex: idx });
      c.event('debuffed', 0, 'Debuffed');
      return;
    }
    let reps = 1 + (card.seal === 'red' ? 1 : 0);
    for (const ref of refs) reps += BEHAVIORS[ref.data.id]?.retrigger?.(c, ref, card, idx, pos) ?? 0;
    for (const t of tiers) reps += TAG_BEHAVIORS[`${t.tag.id}:${t.count}`]?.retrigger?.(c, t.params, card, idx, pos) ?? 0;
    for (const b of bonds) reps += BOND_BEHAVIORS[b.id]?.retrigger?.(c, b.params, card, idx, pos) ?? 0;

    for (let rep = 0; rep < reps; rep++) {
      c.rep = rep;
      c.setSrc({ source: 'Card', cardIndex: idx });
      if (rep > 0) c.event('retrigger', rep, 'Again!');
      c.addChips(rankChips(card) + card.bonusChips);
      if (card.enh === 'bonus') c.addChips(30);
      if (card.enh === 'mult') c.addMult(4);
      if (card.enh === 'glass') c.xMult(2);
      if (card.enh === 'lucky') {
        if (c.rawChance(1, CONFIG.luckyMultDen)) c.addMult(20);
        if (c.rawChance(1, CONFIG.luckyMoneyDen)) c.earn(20);
      }
      if (card.edition === 'foil') c.addChips(50);
      if (card.edition === 'holo') c.addMult(10);
      if (card.edition === 'poly') c.xMult(1.5);
      if (card.seal === 'gold') c.earn(3);
      for (const ref of refs) {
        const b = BEHAVIORS[ref.data.id];
        if (!b?.onCardScored) continue;
        c.setSrc(jokerSrc(ref, { cardIndex: idx }));
        b.onCardScored(c, ref, card, idx, pos);
      }
      for (const t of tiers) {
        const b = TAG_BEHAVIORS[`${t.tag.id}:${t.count}`];
        if (!b?.onCardScored) continue;
        c.setSrc({ source: `${t.tag.name} tag`, tagId: t.tag.id, cardIndex: idx });
        b.onCardScored(c, t.params, card, idx, pos);
      }
      for (const bd of bonds) {
        const b = BOND_BEHAVIORS[bd.id];
        if (!b?.onCardScored) continue;
        c.setSrc({ source: bd.name, bondId: bd.id, cardIndex: idx });
        b.onCardScored(c, bd.params, card, idx, pos);
      }
    }
    c.rep = 0;
    if (card.enh === 'glass' && c.rawChance(1, CONFIG.glassBreakDen)) {
      destroyed.push(card.id);
      c.setSrc({ source: 'Glass', cardIndex: idx });
      c.event('msg', 0, 'Shattered!');
    }
  });

  // ---- held in hand ----
  held.forEach((card, hi) => {
    if (isCardDebuffed(run, card)) return;
    const reps = 1 + (card.seal === 'red' ? 1 : 0);
    for (let rep = 0; rep < reps; rep++) {
      c.rep = rep;
      c.setSrc({ source: 'Held card', heldIndex: hi });
      if (card.enh === 'steel') c.xMult(1.5);
      for (const ref of refs) {
        const b = BEHAVIORS[ref.data.id];
        if (!b?.onHeld) continue;
        c.setSrc(jokerSrc(ref, { heldIndex: hi }));
        b.onHeld(c, ref, card, hi);
      }
    }
  });
  c.rep = 0;

  // ---- Jokers left to right ----
  for (const ref of refs) {
    const slot = ref.slot;
    c.setSrc(jokerSrc(ref));
    if (slot.edition === 'foil') c.addChips(50);
    if (slot.edition === 'holo') c.addMult(10);
    BEHAVIORS[ref.data.id]?.onHandScored?.(c, ref);
    c.setSrc(jokerSrc(ref));
    if (slot.edition === 'poly') c.xMult(1.5);
  }
  // A debuffed slot still shows as such in the replay.
  const off = run.round?.debuffedJokerUid;
  if (off != null && run.jokers.some((j) => j.uid === off)) {
    c.setSrc({ source: 'Debuffed Joker', jokerUid: off });
    c.event('debuffed', 0, 'Debuffed');
  }

  // ---- Bonds ----
  for (const bd of bonds) {
    const b = BOND_BEHAVIORS[bd.id];
    if (!b?.onHandScored) continue;
    c.setSrc({ source: bd.name, bondId: bd.id });
    b.onHandScored(c, bd.params);
  }

  // ---- Tags ----
  for (const t of tiers) {
    const b = TAG_BEHAVIORS[`${t.tag.id}:${t.count}`];
    if (!b?.onHandScored) continue;
    c.setSrc({ source: `${t.tag.name} tag`, tagId: t.tag.id });
    b.onHandScored(c, t.params);
  }

  return result(false, destroyed);
}
