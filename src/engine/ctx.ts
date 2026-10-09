// RunCtx: the safe set of operations that Joker, Bond, Tag and consumable effects use
// to change the run. Money earned while a cash-out is being built goes into its lines.
import { CONFIG } from './config';
import { type Card, type Edition, type Rank, type Suit, newCard } from './cards';
import { CONSUMABLES } from './consumables';
import { JOKERS } from './data';
import { HAND_INFO, HAND_ORDER, type HandType } from './hands';
import { hasTier } from './jokers/tags';
import { computePassives } from './passives';
import { rollConsumableId, rollJokerEdition, rollJokerId } from './pools';
import { chance as rngChance, int, pick, shuffle } from './rng';
import type { CashoutLine, ConsumableKind, JokerInstance, Passives, Rarity, RunState } from './state';

export function pushLog(run: RunState, msg: string): void {
  run.log.push(msg);
  run.logCount = (run.logCount ?? 0) + 1;
  if (run.log.length > CONFIG.logSize) run.log.splice(0, run.log.length - CONFIG.logSize);
}

export function markSeen(run: RunState, id: string): void {
  if (!run.discovered.seen.includes(id)) run.discovered.seen.push(id);
}

export function markOwned(run: RunState, id: string): void {
  markSeen(run, id);
  if (!run.discovered.owned.includes(id)) run.discovered.owned.push(id);
}

export function newId(run: RunState): number {
  return run.nextId++;
}

export function makeJoker(run: RunState, id: string, edition: Edition = 'none'): JokerInstance {
  return { uid: newId(run), id, edition, sellBonus: 0, state: {} };
}

export function jokerBaseCost(j: JokerInstance): number {
  return (JOKERS[j.id]?.cost ?? 4) + CONFIG.editionCost[j.edition];
}

export function sellValue(j: JokerInstance): number {
  return Math.max(1, Math.floor(jokerBaseCost(j) * CONFIG.sellFraction)) + j.sellBonus;
}

export function cardById(run: RunState, id: number): Card | undefined {
  return run.deck.find((c) => c.id === id);
}

export class RunCtx {
  constructor(
    public run: RunState,
    public lines: CashoutLine[] | null = null,
  ) {}

  passives(): Passives {
    return computePassives(this.run);
  }

  log(msg: string): void {
    pushLog(this.run, msg);
  }

  earn(n: number, source: string): void {
    if (!n) return;
    if (this.lines) this.lines.push({ label: source, amount: n });
    else {
      this.run.money += n;
      this.log(`${n > 0 ? '+' : ''}${n} Potch (${source})`);
    }
  }

  setMoney(n: number): void {
    this.run.money = n;
  }

  // ---------- randomness ----------
  pick<T>(arr: readonly T[]): T {
    return pick(this.run.rng, arr);
  }

  shuffled<T>(arr: readonly T[]): T[] {
    return shuffle(this.run.rng, [...arr]);
  }

  /**
   * Random check. For Joker effects (`joker = true`), Gambler tier 4 rerolls one
   * failed check per round.
   */
  chance(num: number, den: number, joker: boolean): boolean {
    let ok = rngChance(this.run.rng, num, den);
    if (!ok && joker && this.canGamblerReroll()) {
      this.useGamblerReroll();
      ok = rngChance(this.run.rng, num, den);
    }
    return ok;
  }

  /** Roll 1..sides for a Joker effect. `bad` results can be rerolled by Gambler tier 4. */
  roll(sides: number, bad: (v: number) => boolean): number {
    let v = int(this.run.rng, sides) + 1;
    if (bad(v) && this.canGamblerReroll()) {
      this.useGamblerReroll();
      v = int(this.run.rng, sides) + 1;
    }
    return v;
  }

  private canGamblerReroll(): boolean {
    return !this.run.cycle.gamblerReroll && hasTier(this.run, 'gambler', 4);
  }

  private useGamblerReroll(): void {
    this.run.cycle.gamblerReroll = 1;
    this.log('Gambler tag: reroll!');
  }

  counter(k: string): number {
    return this.run.cycle[k] ?? 0;
  }

  setCounter(k: string, v: number): void {
    this.run.cycle[k] = v;
  }

  // ---------- Jokers ----------
  jokerRoom(): number {
    return this.passives().jokerSlots - this.run.jokers.length;
  }

  addJoker(id: string, edition: Edition = 'none'): JokerInstance {
    const j = makeJoker(this.run, id, edition);
    this.run.jokers.push(j);
    markOwned(this.run, id);
    return j;
  }

  /** Create a random Joker if there is room. 'L' = Legendary pool. */
  createJoker(rarity?: Rarity): JokerInstance | null {
    if (this.jokerRoom() <= 0) return null;
    const id = rollJokerId(this.run, rarity);
    if (!id) {
      this.log('No Joker available');
      return null;
    }
    const ed = rarity === 'L' ? 'none' : rollJokerEdition(this.run, this.passives().editionRate);
    const j = this.addJoker(id, ed);
    this.log(`${JOKERS[id].name} joined the army!`);
    return j;
  }

  /** Destroy a Joker. Shin prevents the first destruction each Ante. Returns true if destroyed. */
  destroyJoker(uid: number, source: string): boolean {
    const idx = this.run.jokers.findIndex((j) => j.uid === uid);
    if (idx < 0) return false;
    const shin = this.run.jokers.find((j) => j.id === 'shin');
    if (shin && !this.run.anteState.shinUsed) {
      this.run.anteState.shinUsed = true;
      this.log(`Shin blocked the destruction from ${source}!`);
      return false;
    }
    const [gone] = this.run.jokers.splice(idx, 1);
    this.log(`${JOKERS[gone.id].name} was destroyed (${source})`);
    return true;
  }

  sellValue(j: JokerInstance): number {
    return sellValue(j);
  }

  // ---------- consumables ----------
  consumableRoom(): number {
    return this.passives().consumableSlots - this.run.consumables.length;
  }

  /** Create a consumable if there is room (or `force`). */
  createConsumable(kind: ConsumableKind, id?: string, exclude: string[] = [], force = false): boolean {
    if (!force && this.consumableRoom() <= 0) return false;
    const cid = id ?? rollConsumableId(this.run, kind, exclude);
    this.run.consumables.push({ uid: newId(this.run), id: cid });
    this.log(`Created ${CONSUMABLES[cid].name}`);
    return true;
  }

  // ---------- hands ----------
  upgradeHand(type: HandType, n: number, source: string): void {
    const h = this.run.handLevels[type];
    h.level = Math.max(1, h.level + n);
    this.log(`${HAND_INFO[type].name} ${n >= 0 ? 'up' : 'down'} to level ${h.level} (${source})`);
  }

  /** A random non-secret hand type, or a secret one that has been played. */
  randomHandType(): HandType {
    const visible = HAND_ORDER.filter((h) => !HAND_INFO[h].secret || this.run.handLevels[h].played > 0);
    return this.pick(visible);
  }

  // ---------- cards ----------
  newCard(rank: Rank, suit: Suit, extra: Partial<Card> = {}): Card {
    return newCard(newId(this.run), rank, suit, extra);
  }

  /** Card ids currently "in hand": the round hand, or the hand dealt for an open pack. */
  handIds(): number[] {
    if (this.run.phase === 'pack' && this.run.pack) return this.run.pack.hand;
    if (this.run.phase === 'round') return this.run.hand;
    return [];
  }

  addCardToHand(card: Card): void {
    this.run.deck.push(card);
    if (this.run.phase === 'pack' && this.run.pack) this.run.pack.hand.push(card.id);
    else if (this.run.phase === 'round') this.run.hand.push(card.id);
  }

  addCardToDeck(card: Card): void {
    this.run.deck.push(card);
  }

  destroyCards(ids: number[]): void {
    const set = new Set(ids);
    const r = this.run;
    r.deck = r.deck.filter((c) => !set.has(c.id));
    r.hand = r.hand.filter((i) => !set.has(i));
    r.drawPile = r.drawPile.filter((i) => !set.has(i));
    r.discardPile = r.discardPile.filter((i) => !set.has(i));
    if (r.pack) r.pack.hand = r.pack.hand.filter((i) => !set.has(i));
    if (ids.length) this.log(`${ids.length} card(s) destroyed`);
  }
}
