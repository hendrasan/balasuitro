// RunState creation and the action reducer. `applyAction` mutates the given state;
// the UI store clones state before each action, so callers see immutable snapshots.
import { BLIND_NAMES, blindTarget, canRerollBoss, ensureBoss, planBosses, rerollBoss, rollSpoils, SPOILS } from './blinds';
import { type Card, standardDeck } from './cards';
import { CONFIG } from './config';
import { CONSUMABLES, type ConsDef } from './consumables';
import { cardById, markOwned, newId, pushLog, RunCtx, sellValue } from './ctx';
import { BONDS, BOSSES, JOKERS } from './data';
import { evaluateHand, HAND_INFO, newHandLevels, type HandType } from './hands';
import { activeBonds, BOND_BEHAVIORS } from './jokers/bonds';
import { BEHAVIORS } from './jokers/registry';
import { jokerRefs } from './jokers/refs';
import { activeTiers, hasTier, TAG_BEHAVIORS } from './jokers/tags';
import type { JokerRef } from './jokers/types';
import { computePassives } from './passives';
import { makeRng, pick, shuffle } from './rng';
import { bossMechanic, computeScore } from './scoring';
import {
  consSellValue, generateShop, itemPrice, openPack, packPrice, rerollPrice, rerollShopCards, rollVoucher, voucherPrice,
} from './shop';
import { defaultModifiers, type RunModifiers, type RunState } from './state';
import { VOUCHERS } from './vouchers';

export interface ProfileSnapshot {
  owned: string[];
  seen: string[];
  unlocked: string[];
}

export type Action =
  | { type: 'selectBlind' }
  | { type: 'skipBlind' }
  | { type: 'rerollBoss' }
  | { type: 'play'; cardIds: number[] }
  | { type: 'discard'; cardIds: number[] }
  | { type: 'sortHand'; by: 'rank' | 'suit' }
  | { type: 'reorderHand'; cardIds: number[] }
  | { type: 'moveJoker'; from: number; to: number }
  | { type: 'sellJoker'; uid: number }
  | { type: 'sellConsumable'; uid: number }
  | { type: 'useConsumable'; uid: number; cardIds: number[] }
  | { type: 'cashOut' }
  | { type: 'buyCard'; index: number }
  | { type: 'buyPack'; index: number }
  | { type: 'buyVoucher' }
  | { type: 'reroll' }
  | { type: 'leaveShop' }
  | { type: 'packPick'; index: number; cardIds: number[] }
  | { type: 'packSkip' }
  | { type: 'teleport' }
  | { type: 'continueEndless' };

export interface ActionResult {
  ok: boolean;
  error?: string;
}

const OK: ActionResult = { ok: true };
const fail = (error: string): ActionResult => ({ ok: false, error });

// ------------------------------------------------------------------ setup

export function newRun(seed: string, profile: ProfileSnapshot, modifiers: RunModifiers = defaultModifiers()): RunState {
  const deck = standardDeck(1);
  const run: RunState = {
    seed,
    rng: makeRng(seed),
    nextId: deck.length + 1,
    phase: 'blind',
    ante: 1,
    blindIndex: 0,
    endless: false,
    won: false,
    money: CONFIG.startMoney + modifiers.startMoney,
    deck,
    drawPile: [],
    hand: [],
    discardPile: [],
    jokers: [],
    consumables: [],
    handLevels: newHandLevels(),
    vouchers: [...modifiers.startingVouchers],
    bosses: {},
    anteState: { skipped: false, roundsPlayed: 0, shinUsed: false, vikiUsed: false, bossRerollsUsed: 0, spoils: ['economy', 'investment'] },
    anteVoucher: null,
    roundScore: 0,
    target: 0,
    round: null,
    cashout: null,
    shop: null,
    lastShop: null,
    pack: null,
    pendingShop: { freeJokers: [], freeEditions: 0, coupon: false, freeRerolls: 0, freePacks: 0 },
    nextRound: { hands: 0, handSize: 0 },
    nextHand: { chips: 0, mult: 0 },
    investment: 0,
    permHandSize: 0,
    stats: {
      handsPlayed: 0, discardsUsed: 0, unusedDiscards: 0, rerolls: 0, runesUsed: 0, bossesDefeated: 0,
      blindsSkipped: 0, roundsWon: 0, bestHand: 0, lastHandType: null, lastConsumable: null,
    },
    modifiers,
    discovered: { seen: [...profile.seen], owned: [...profile.owned] },
    unlocked: [...profile.unlocked],
    cycle: {},
    lastScore: null,
    log: [],
    logCount: 0,
  };
  planBosses(run);
  run.anteState.spoils = rollSpoils(run);
  run.anteVoucher = rollVoucher(run);
  updateTarget(run);
  return run;
}

function updateTarget(run: RunState): void {
  const boss = run.blindIndex === 2 ? ensureBoss(run, run.ante) : null;
  run.target = blindTarget(run.ante, run.blindIndex, boss);
}

// ------------------------------------------------------------------ helpers

function alive(run: RunState, ref: JokerRef): boolean {
  return run.jokers.includes(ref.slot);
}

function tierKey(t: { tag: { id: string }; count: number }): string {
  return `${t.tag.id}:${t.count}`;
}

export function currentBossId(run: RunState): string {
  return ensureBoss(run, run.ante);
}

export function handTarget(run: RunState): number {
  return computePassives(run).handSize + (run.round?.handSizeBonus ?? 0);
}

function draw(run: RunState): void {
  const size = handTarget(run);
  while (run.hand.length < size && run.drawPile.length > 0) run.hand.push(run.drawPile.shift()!);
}

/** An empty hand with an empty draw pile cannot play or discard: the round is lost (no softlock). */
function refillOrLose(run: RunState): void {
  if (run.phase !== 'round' || run.hand.length > 0) return;
  draw(run);
  if (run.hand.length === 0) {
    run.phase = 'gameover';
    pushLog(run, 'Out of cards! Your army has fallen...');
  }
}

function pickDebuffedJoker(run: RunState): void {
  if (!run.round) return;
  if (bossMechanic(run) !== 'crimson') return;
  run.round.debuffedJokerUid = null;
  run.round.debuffedJokerUid = run.jokers.length ? pick(run.rng, run.jokers).uid : null;
}

function handOrder(run: RunState, ids: number[]): number[] {
  return [...ids].sort((a, b) => run.hand.indexOf(a) - run.hand.indexOf(b));
}

function validSelection(run: RunState, ids: number[], pool: number[]): string | null {
  if (new Set(ids).size !== ids.length) return 'Duplicate card';
  if (ids.some((id) => !pool.includes(id))) return 'Card not in hand';
  return null;
}

// ------------------------------------------------------------------ round flow

function startRound(run: RunState): void {
  const p = computePassives(run);
  const bossId = run.blindIndex === 2 ? currentBossId(run) : null;
  run.cycle = {};
  run.round = {
    blindIndex: run.blindIndex,
    bossId,
    handsLeft: p.hands + run.nextRound.hands,
    discardsLeft: p.discards,
    handSizeBonus: run.nextRound.handSize,
    handsPlayed: 0,
    discardsUsed: 0,
    cardsDiscarded: 0,
    handTypes: [],
    debuffedJokerUid: null,
  };
  run.nextRound = { hands: 0, handSize: 0 };
  run.roundScore = 0;
  updateTarget(run);
  run.drawPile = shuffle(run.rng, run.deck.map((c) => c.id));
  run.hand = [];
  run.discardPile = [];
  run.lastScore = null;
  run.phase = 'round';

  const r = new RunCtx(run);
  for (const ref of jokerRefs(run)) if (alive(run, ref)) BEHAVIORS[ref.data.id]?.onRoundStart?.(r, ref);

  const mech = bossMechanic(run);
  if (mech === 'water') run.round.discardsLeft = 0;
  if (mech === 'needle') run.round.handsLeft = 1;
  pickDebuffedJoker(run);
  run.anteState.roundsPlayed += 1;
  // Hai Yo's Kitchen (Castle): a Food card at the start of each blind.
  for (let i = 0; i < run.modifiers.foodPerBlind; i++) r.createConsumable('food');
  if (bossId) pushLog(run, `${BOSSES[bossId].name}: ${BOSSES[bossId].text}`);
  draw(run);
  refillOrLose(run);
}

function play(run: RunState, ids: number[]): ActionResult {
  const round = run.round;
  if (run.phase !== 'round' || !round) return fail('Not in a round');
  if (ids.length < 1 || ids.length > CONFIG.maxSelect) return fail('Select 1 to 5 cards');
  const bad = validSelection(run, ids, run.hand);
  if (bad) return fail(bad);
  if (round.handsLeft <= 0) return fail('No hands left');

  const order = handOrder(run, ids);
  const played = order.map((id) => cardById(run, id)!);
  const heldIds = run.hand.filter((id) => !ids.includes(id));
  const held = heldIds.map((id) => cardById(run, id)!);
  const type = evaluateHand(played).type;
  const mech = bossMechanic(run);
  const blocked =
    (mech === 'eye' && round.handTypes.includes(type)) ||
    (mech === 'mouth' && round.handTypes.length > 0 && round.handTypes[0] !== type);
  round.handTypes.push(type);
  if (mech === 'arm' && run.handLevels[type].level > 1) {
    new RunCtx(run).upgradeHand(type, -1, 'Beast Rune');
  }
  if (mech === 'tooth') {
    run.money -= played.length;
    pushLog(run, `Lord Gorudo took ${played.length} Potch`);
  }
  round.handsLeft -= 1;
  round.handsPlayed += 1;
  run.stats.handsPlayed += 1;
  run.handLevels[type].played += 1;
  run.hand = heldIds;

  const res = computeScore(run, played, held, { blocked });
  run.nextHand = { chips: 0, mult: 0 };
  run.money += res.money;
  run.roundScore += res.total;
  run.stats.bestHand = Math.max(run.stats.bestHand, res.total);
  run.stats.lastHandType = type;
  run.lastScore = res;
  const destroyed = new Set(res.destroyedIds);
  if (destroyed.size) new RunCtx(run).destroyCards(res.destroyedIds);
  run.discardPile.push(...order.filter((id) => !destroyed.has(id)));

  const won = run.roundScore >= run.target;
  const final = round.handsLeft === 0;
  const r = new RunCtx(run);
  for (const ref of jokerRefs(run)) {
    if (alive(run, ref)) BEHAVIORS[ref.data.id]?.onHandFinished?.(r, ref, { won, final, handType: type });
  }

  if (won) {
    winRound(run);
  } else if (final) {
    run.phase = 'gameover';
    pushLog(run, 'Your army has fallen...');
  } else {
    if (mech === 'hook') {
      const gone = shuffle(run.rng, [...run.hand]).slice(0, 2);
      run.hand = run.hand.filter((id) => !gone.includes(id));
      run.discardPile.push(...gone);
      if (gone.length) pushLog(run, `Solon Jhee discarded ${gone.length} card(s)`);
    }
    draw(run);
    pickDebuffedJoker(run);
    refillOrLose(run);
  }
  return OK;
}

function discard(run: RunState, ids: number[]): ActionResult {
  const round = run.round;
  if (run.phase !== 'round' || !round) return fail('Not in a round');
  if (round.discardsLeft <= 0) return fail('No discards left');
  if (ids.length < 1 || ids.length > CONFIG.maxSelect) return fail('Select 1 to 5 cards');
  const bad = validSelection(run, ids, run.hand);
  if (bad) return fail(bad);
  const order = handOrder(run, ids);
  const cards = order.map((id) => cardById(run, id)!);
  run.hand = run.hand.filter((id) => !ids.includes(id));
  run.discardPile.push(...order);
  round.discardsLeft -= 1;
  round.discardsUsed += 1;
  round.cardsDiscarded += cards.length;
  run.stats.discardsUsed += 1;
  const r = new RunCtx(run);
  for (const c of cards) if (c.seal === 'purple') r.createConsumable('rune');
  for (const ref of jokerRefs(run)) if (alive(run, ref)) BEHAVIORS[ref.data.id]?.onDiscard?.(r, ref, cards);
  draw(run);
  refillOrLose(run);
  return OK;
}

function winRound(run: RunState): void {
  const round = run.round!;
  const isBoss = round.bossId !== null;
  const lines: { label: string; amount: number }[] = [];
  const r = new RunCtx(run, lines);
  const p = computePassives(run);
  const interest = Math.min(p.interestCap, Math.floor(Math.max(0, run.money) / p.interestPer));

  lines.push({ label: `${BLIND_NAMES[round.blindIndex]} defeated`, amount: CONFIG.blindRewards[round.blindIndex] });
  if (round.handsLeft > 0) lines.push({ label: `Remaining hands (${round.handsLeft})`, amount: round.handsLeft * CONFIG.payoutPerHand });
  if (isBoss) run.stats.bossesDefeated += 1;
  run.stats.roundsWon += 1;
  run.stats.unusedDiscards += round.discardsLeft;

  // Held cards at end of round.
  const held = run.hand.map((id) => cardById(run, id)!).filter(Boolean);
  const gold = held.filter((c) => c.enh === 'gold').length;
  if (gold) lines.push({ label: `Gold cards held (${gold})`, amount: gold * 3 });
  const lastType: HandType = round.handTypes[round.handTypes.length - 1] ?? 'high';
  for (const c of held) if (c.seal === 'blue') r.createConsumable('forging', `forge_${lastType}`);

  for (const ref of jokerRefs(run)) if (alive(run, ref)) BEHAVIORS[ref.data.id]?.onRoundEnd?.(r, ref);
  for (const b of activeBonds(run)) BOND_BEHAVIORS[b.id]?.onRoundEnd?.(r, b.params);
  for (const t of activeTiers(run)) TAG_BEHAVIORS[tierKey(t)]?.onRoundEnd?.(r, t.params);

  if (isBoss) {
    for (const ref of jokerRefs(run)) if (alive(run, ref)) BEHAVIORS[ref.data.id]?.onBossDefeated?.(r, ref);
    for (const b of activeBonds(run)) BOND_BEHAVIORS[b.id]?.onBossDefeated?.(r, b.params);
    for (const t of activeTiers(run)) TAG_BEHAVIORS[tierKey(t)]?.onBossDefeated?.(r, t.params);
    if (run.investment > 0) {
      lines.push({ label: 'War Bonds', amount: run.investment });
      run.investment = 0;
    }
    if (round.bossId === 'luca_blight' && !run.unlocked.includes('luca_blight')) {
      run.unlocked.push('luca_blight');
      pushLog(run, 'Luca Blight is defeated! He can now be recruited with the Rune of Beginning.');
    }
    if (run.ante === CONFIG.finalAnte) {
      // Uses positions only: the finale boss's random Joker debuff must not save Riou.
      const [jowy, riou] = BONDS.jowy_riou.members;
      const fated = run.jokers.find((j, i) => j.id === riou && run.jokers[i - 1]?.id === jowy);
      if (fated) r.destroyJoker(fated.uid, 'the promise at the rock');
    }
  }
  if (interest > 0) lines.push({ label: `Interest`, amount: interest });

  run.round = null;
  run.hand = [];
  run.drawPile = [];
  run.discardPile = [];
  run.cashout = { lines, total: lines.reduce((s, l) => s + l.amount, 0), bossBeaten: isBoss };
  if (isBoss && run.ante === CONFIG.finalAnte && !run.endless) {
    run.won = true;
    run.phase = 'victory';
  } else {
    run.phase = 'cashout';
  }
}

function advanceAnte(run: RunState): void {
  run.ante += 1;
  run.blindIndex = 0;
  run.anteState = { skipped: false, roundsPlayed: 0, shinUsed: false, vikiUsed: false, bossRerollsUsed: 0, spoils: rollSpoils(run) };
  run.anteVoucher = rollVoucher(run);
  ensureBoss(run, run.ante);
}

function enterShop(run: RunState): void {
  run.shop = generateShop(run);
  run.phase = 'shop';
  const r = new RunCtx(run);
  for (const ref of jokerRefs(run)) if (alive(run, ref)) BEHAVIORS[ref.data.id]?.onShopEnter?.(r, ref);
}

function cashOut(run: RunState): ActionResult {
  if (run.phase !== 'cashout' || !run.cashout) return fail('Nothing to cash out');
  run.money += run.cashout.total;
  pushLog(run, `Cashed out ${run.cashout.total} Potch`);
  if (run.cashout.bossBeaten) advanceAnte(run);
  else run.blindIndex += 1;
  run.cashout = null;
  updateTarget(run);
  enterShop(run);
  return OK;
}

// ------------------------------------------------------------------ blind select

function skipBlind(run: RunState): ActionResult {
  if (run.phase !== 'blind') return fail('Not at blind select');
  if (run.blindIndex >= 2) return fail('The Boss cannot be skipped');
  const spoil = SPOILS[run.anteState.spoils[run.blindIndex]];
  const r = new RunCtx(run);
  const times = run.jokers.some((j) => j.id === 'jess') ? 2 : 1;
  for (let i = 0; i < times; i++) spoil.apply(r);
  pushLog(run, `Skipped: ${spoil.name}${times > 1 ? ' (x2, Jess)' : ''}`);
  run.anteState.skipped = true;
  run.stats.blindsSkipped += 1;
  for (const ref of jokerRefs(run)) if (alive(run, ref)) BEHAVIORS[ref.data.id]?.onBlindSkipped?.(r, ref);
  run.blindIndex += 1;
  updateTarget(run);
  // Viki's Teleportation Gate (Castle): the skip still gives a shop visit.
  if (run.modifiers.skipToShop) {
    pushLog(run, "Viki's Gate: teleported to the shop");
    enterShop(run);
  }
  return OK;
}

function doRerollBoss(run: RunState): ActionResult {
  if (run.phase !== 'blind') return fail('Not at blind select');
  const p = computePassives(run);
  if (run.anteState.bossRerollsUsed >= p.bossRerolls) return fail('No boss rerolls left');
  if (!canRerollBoss(run)) return fail('This boss cannot be changed');
  rerollBoss(run);
  run.anteState.bossRerollsUsed += 1;
  updateTarget(run);
  pushLog(run, `Shu changed the plan: the boss is now ${BOSSES[currentBossId(run)].name}`);
  return OK;
}

function teleport(run: RunState): ActionResult {
  if (run.phase !== 'blind') return fail('Not at blind select');
  if (!run.jokers.some((j) => j.id === 'viki')) return fail('Viki is not in your army');
  if (run.anteState.vikiUsed) return fail('Viki already teleported this Ante');
  if (!run.lastShop) return fail('No previous shop');
  run.anteState.vikiUsed = true;
  run.shop = run.lastShop;
  run.phase = 'shop';
  pushLog(run, 'Viki teleported you back to the shop! ...Oops?');
  return OK;
}

// ------------------------------------------------------------------ Jokers & consumables

function sellJoker(run: RunState, uid: number): ActionResult {
  const idx = run.jokers.findIndex((j) => j.uid === uid);
  if (idx < 0) return fail('No such Joker');
  const j = run.jokers[idx];
  if (JOKERS[j.id].unsellable) return fail(`${JOKERS[j.id].name} cannot be sold`);
  const value = sellValue(j);
  run.jokers.splice(idx, 1);
  run.money += value;
  pushLog(run, `Sold ${JOKERS[j.id].name} for ${value} Potch`);
  const r = new RunCtx(run);
  for (const ref of jokerRefs(run)) if (alive(run, ref)) BEHAVIORS[ref.data.id]?.onSell?.(r, ref, j);
  return OK;
}

function sellConsumable(run: RunState, uid: number): ActionResult {
  const idx = run.consumables.findIndex((c) => c.uid === uid);
  if (idx < 0) return fail('No such card');
  const [c] = run.consumables.splice(idx, 1);
  run.money += consSellValue(c.id);
  return OK;
}

/** Why a consumable cannot be used with these targets, or null if it can. */
export function consumableError(run: RunState, def: ConsDef, targetIds: number[]): string | null {
  const r = new RunCtx(run);
  const pool = r.handIds();
  const bad = validSelection(run, targetIds, pool);
  if (bad) return bad;
  if (def.select) {
    const [min, max] = def.select;
    if (targetIds.length < min || targetIds.length > max) return min === max ? `Select ${min} card(s)` : `Select ${min} to ${max} cards`;
  }
  if (def.needsHand && pool.length === 0) return 'Needs cards in hand';
  return def.check ? def.check(r, targetIds.map((id) => cardById(run, id)!)) : null;
}

function applyConsumable(run: RunState, def: ConsDef, targetIds: number[]): void {
  const r = new RunCtx(run);
  const sierra = run.jokers.some((j) => j.id === 'sierra_mikain' && j.uid !== run.round?.debuffedJokerUid);
  const times = def.kind === 'rune' && sierra ? 2 : 1;
  // Targets keep hand order (Darkness Rune uses left/right).
  const pool = r.handIds();
  const ordered = [...targetIds].sort((a, b) => pool.indexOf(a) - pool.indexOf(b));
  for (let i = 0; i < times; i++) {
    const targets = ordered.map((id) => cardById(run, id)).filter((c): c is Card => !!c);
    def.use(r, targets);
  }
  if (times > 1) pushLog(run, 'Sierra doubled the Rune!');
  if (def.kind === 'rune') {
    run.stats.runesUsed += 1;
    run.cycle.runes = (run.cycle.runes ?? 0) + 1;
    if (hasTier(run, 'mage', 4) && !run.cycle.mageDup) {
      run.cycle.mageDup = 1;
      if (r.createConsumable('rune', def.id)) pushLog(run, 'Mage tag: the Rune was duplicated');
    }
  }
  if ((def.kind === 'rune' || def.kind === 'forging') && def.id !== 'clone') run.stats.lastConsumable = def.id;
  for (const ref of jokerRefs(run)) {
    if (alive(run, ref)) BEHAVIORS[ref.data.id]?.onConsumableUsed?.(r, ref, { uid: 0, id: def.id }, def.kind);
  }
}

function useConsumable(run: RunState, uid: number, targetIds: number[]): ActionResult {
  const idx = run.consumables.findIndex((c) => c.uid === uid);
  if (idx < 0) return fail('No such card');
  const def = CONSUMABLES[run.consumables[idx].id];
  const [removed] = run.consumables.splice(idx, 1);
  const err = consumableError(run, def, targetIds);
  if (err) {
    run.consumables.splice(idx, 0, removed);
    return fail(err);
  }
  applyConsumable(run, def, targetIds);
  // Food can raise the hand size (Dumplings): draw up to it. Other cards keep Balatro's no-redraw rule.
  if (def.kind === 'food' && run.phase === 'round') draw(run);
  refillOrLose(run);
  return OK;
}

function moveJoker(run: RunState, from: number, to: number): ActionResult {
  if (from < 0 || from >= run.jokers.length || to < 0 || to >= run.jokers.length) return fail('Bad position');
  const [j] = run.jokers.splice(from, 1);
  run.jokers.splice(to, 0, j);
  return OK;
}

// ------------------------------------------------------------------ shop

function buyCard(run: RunState, index: number): ActionResult {
  if (run.phase !== 'shop' || !run.shop) return fail('Not in the shop');
  const item = run.shop.cards[index];
  if (!item) return fail('Sold out');
  const p = computePassives(run);
  const price = itemPrice(item, p);
  if (run.money < price) return fail('Not enough Potch');
  if (item.kind === 'joker') {
    const room = p.jokerSlots + (item.joker.edition === 'negative' ? 1 : 0) - run.jokers.length;
    if (room <= 0) return fail('No room for another Joker');
    run.jokers.push(item.joker);
    markOwned(run, item.joker.id);
    pushLog(run, `${JOKERS[item.joker.id].name} joined the army!`);
  } else {
    if (run.consumables.length >= p.consumableSlots) return fail('No room for another consumable');
    run.consumables.push(item.cons);
  }
  run.money -= price;
  run.shop.cards[index] = null;
  run.shop.boughtAny = true;
  return OK;
}

function buyPack(run: RunState, index: number): ActionResult {
  if (run.phase !== 'shop' || !run.shop) return fail('Not in the shop');
  const offer = run.shop.packs[index];
  if (!offer) return fail('Sold out');
  const price = packPrice(offer, computePassives(run));
  if (run.money < price) return fail('Not enough Potch');
  run.money -= price;
  run.shop.packs[index] = null;
  run.shop.boughtAny = true;
  run.pack = openPack(run, offer);
  run.phase = 'pack';
  return OK;
}

function buyVoucher(run: RunState): ActionResult {
  if (run.phase !== 'shop' || !run.shop) return fail('Not in the shop');
  const id = run.anteVoucher;
  if (!id) return fail('No upgrade for sale');
  const price = voucherPrice(computePassives(run));
  if (run.money < price) return fail('Not enough Potch');
  run.money -= price;
  run.vouchers.push(id);
  run.anteVoucher = null;
  run.shop.boughtAny = true;
  pushLog(run, `Blacksmith upgrade: ${VOUCHERS[id].name}`);
  return OK;
}

function reroll(run: RunState): ActionResult {
  if (run.phase !== 'shop' || !run.shop) return fail('Not in the shop');
  const price = rerollPrice(run.shop, computePassives(run));
  if (run.money < price) return fail('Not enough Potch');
  run.money -= price;
  run.shop.rerollCost += CONFIG.rerollStep;
  run.stats.rerolls += 1;
  rerollShopCards(run);
  const r = new RunCtx(run);
  for (const ref of jokerRefs(run)) if (alive(run, ref)) BEHAVIORS[ref.data.id]?.onReroll?.(r, ref);
  return OK;
}

function leaveShop(run: RunState): ActionResult {
  if (run.phase !== 'shop' || !run.shop) return fail('Not in the shop');
  const r = new RunCtx(run);
  const bought = run.shop.boughtAny;
  for (const ref of jokerRefs(run)) if (alive(run, ref)) BEHAVIORS[ref.data.id]?.onShopExit?.(r, ref, bought);
  run.lastShop = run.shop;
  run.shop = null;
  run.phase = 'blind';
  updateTarget(run);
  return OK;
}

function closePack(run: RunState): void {
  run.pack = null;
  run.phase = 'shop';
}

function packPick(run: RunState, index: number, targetIds: number[]): ActionResult {
  const pack = run.pack;
  if (run.phase !== 'pack' || !pack) return fail('No pack open');
  const choice = pack.choices[index];
  if (!choice) return fail('Already taken');
  if (choice.kind === 'joker') {
    const p = computePassives(run);
    const room = p.jokerSlots + (choice.joker.edition === 'negative' ? 1 : 0) - run.jokers.length;
    if (room <= 0) return fail('No room for another Joker');
    run.jokers.push(choice.joker);
    markOwned(run, choice.joker.id);
    pushLog(run, `${JOKERS[choice.joker.id].name} joined the army!`);
  } else if (choice.kind === 'card') {
    run.deck.push(choice.card);
  } else {
    const def = CONSUMABLES[choice.cons.id];
    const err = consumableError(run, def, targetIds);
    if (err) return fail(err);
    applyConsumable(run, def, targetIds);
  }
  pack.choices[index] = null;
  pack.picksLeft -= 1;
  if (pack.picksLeft <= 0 || pack.choices.every((c) => c === null)) closePack(run);
  return OK;
}

// ------------------------------------------------------------------ hand order

const SUIT_ORDER = { S: 0, H: 1, C: 2, D: 3 };

function sortHand(run: RunState, by: 'rank' | 'suit'): ActionResult {
  const cards = run.hand.map((id) => cardById(run, id)!);
  cards.sort((a, b) =>
    by === 'rank' ? b.rank - a.rank || SUIT_ORDER[a.suit] - SUIT_ORDER[b.suit] : SUIT_ORDER[a.suit] - SUIT_ORDER[b.suit] || b.rank - a.rank,
  );
  run.hand = cards.map((c) => c.id);
  return OK;
}

function reorderHand(run: RunState, ids: number[]): ActionResult {
  if (ids.length !== run.hand.length || ids.some((id) => !run.hand.includes(id)) || new Set(ids).size !== ids.length) {
    return fail('Bad order');
  }
  run.hand = [...ids];
  return OK;
}

// ------------------------------------------------------------------ reducer

export function applyAction(run: RunState, a: Action): ActionResult {
  if (run.phase === 'gameover') return fail('The run is over');
  switch (a.type) {
    case 'selectBlind':
      if (run.phase !== 'blind') return fail('Not at blind select');
      startRound(run);
      return OK;
    case 'skipBlind':
      return skipBlind(run);
    case 'rerollBoss':
      return doRerollBoss(run);
    case 'play':
      return play(run, a.cardIds);
    case 'discard':
      return discard(run, a.cardIds);
    case 'sortHand':
      return sortHand(run, a.by);
    case 'reorderHand':
      return reorderHand(run, a.cardIds);
    case 'moveJoker':
      return moveJoker(run, a.from, a.to);
    case 'sellJoker':
      return sellJoker(run, a.uid);
    case 'sellConsumable':
      return sellConsumable(run, a.uid);
    case 'useConsumable':
      return useConsumable(run, a.uid, a.cardIds);
    case 'cashOut':
      return cashOut(run);
    case 'buyCard':
      return buyCard(run, a.index);
    case 'buyPack':
      return buyPack(run, a.index);
    case 'buyVoucher':
      return buyVoucher(run);
    case 'reroll':
      return reroll(run);
    case 'leaveShop':
      return leaveShop(run);
    case 'packPick':
      return packPick(run, a.index, a.cardIds);
    case 'packSkip':
      if (run.phase !== 'pack') return fail('No pack open');
      closePack(run);
      return OK;
    case 'teleport':
      return teleport(run);
    case 'continueEndless':
      if (run.phase !== 'victory') return fail('Not at victory');
      run.endless = true;
      run.phase = 'cashout';
      return OK;
  }
}

// ------------------------------------------------------------------ read helpers for the UI

export function previewHand(run: RunState, ids: number[]): { type: HandType; name: string; chips: number; mult: number; level: number } | null {
  if (!ids.length) return null;
  const cards = handOrder(run, ids).map((id) => cardById(run, id)).filter((c): c is Card => !!c);
  const ev = evaluateHand(cards);
  const lvl = run.handLevels[ev.type].level;
  const i = HAND_INFO[ev.type];
  return { type: ev.type, name: i.name, level: lvl, chips: i.chips + i.lchips * (lvl - 1), mult: i.mult + i.lmult * (lvl - 1) };
}

export { newId };
