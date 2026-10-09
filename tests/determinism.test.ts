import { describe, expect, it } from 'vitest';
import { rankChips } from '../src/engine/cards';
import { CONSUMABLES } from '../src/engine/consumables';
import { cardById } from '../src/engine/ctx';
import { JOKER_LIST, JOKERS } from '../src/engine/data';
import { evaluateHand, handBase, HAND_ORDER } from '../src/engine/hands';
import { computePassives } from '../src/engine/passives';
import { rollJokerId } from '../src/engine/pools';
import { applyAction, consumableError, newRun, type Action } from '../src/engine/run';
import { itemPrice, packPrice } from '../src/engine/shop';
import type { Phase, RunState } from '../src/engine/state';
import { validateRun } from '../src/engine/save';
import { act, freshRun } from './helpers';

const plain = <T>(x: T): T => JSON.parse(JSON.stringify(x));

function combos<T>(arr: T[], k: number): T[][] {
  if (k === 0) return [[]];
  if (arr.length < k) return [];
  const [h, ...t] = arr;
  return [...combos(t, k - 1).map((c) => [h, ...c]), ...combos(t, k)];
}

/** Best-looking cards to play: highest base estimate, ignoring Jokers. */
function bestPlay(run: RunState): { ids: number[]; type: string } {
  let best = { ids: [run.hand[0]], type: 'high', est: -1 };
  for (let k = 1; k <= Math.min(5, run.hand.length); k++) {
    for (const ids of combos(run.hand, k)) {
      const cards = ids.map((id) => cardById(run, id)!);
      const ev = evaluateHand(cards);
      const b = handBase(ev.type, run.handLevels[ev.type].level);
      const est = (b.chips + ev.scoring.reduce((s, i) => s + rankChips(cards[i]), 0)) * b.mult;
      if (est > best.est) best = { ids, type: ev.type, est };
    }
  }
  return best;
}

interface BotOpts {
  /** Make the run winnable: raise all hand levels to this before each blind. */
  level?: number;
  /** Extra Potch given in each shop. */
  allowance?: number;
  /** Stop after this ante's boss when continuing into endless. */
  endlessUntil?: number;
}

/** The bot's next action, or null when the run is over. */
function botAction(run: RunState, opts: BotOpts): Action | null {
  const p = computePassives(run);
  switch (run.phase) {
    case 'blind':
      return { type: 'selectBlind' };
    case 'round': {
      // Use a consumable if one can be used now.
      for (const c of run.consumables) {
        const def = CONSUMABLES[c.id];
        const targets = run.hand.slice(0, def.select?.[0] ?? 0);
        if (!consumableError(run, def, targets) && def.kind !== 'true') return { type: 'useConsumable', uid: c.uid, cardIds: targets };
      }
      const best = bestPlay(run);
      if (best.type === 'high' && run.round!.discardsLeft > 0 && run.round!.handsLeft > 1 && run.drawPile.length > 0) {
        return { type: 'discard', cardIds: run.hand.filter((id) => !best.ids.includes(id)).slice(0, 5) };
      }
      return { type: 'play', cardIds: best.ids };
    }
    case 'cashout':
      return { type: 'cashOut' };
    case 'shop': {
      const shop = run.shop!;
      for (let i = 0; i < shop.cards.length; i++) {
        const it = shop.cards[i];
        if (!it || run.money < itemPrice(it, p)) continue;
        if (it.kind === 'joker' && run.jokers.length >= p.jokerSlots + (it.joker.edition === 'negative' ? 1 : 0)) continue;
        if (it.kind === 'cons' && run.consumables.length >= p.consumableSlots) continue;
        return { type: 'buyCard', index: i };
      }
      for (let i = 0; i < shop.packs.length; i++) {
        const pk = shop.packs[i];
        if (pk && run.money >= packPrice(pk, p)) return { type: 'buyPack', index: i };
      }
      return { type: 'leaveShop' };
    }
    case 'pack': {
      const pack = run.pack!;
      for (let i = 0; i < pack.choices.length; i++) {
        const ch = pack.choices[i];
        if (!ch) continue;
        if (ch.kind === 'joker') {
          if (run.jokers.length < p.jokerSlots + (ch.joker.edition === 'negative' ? 1 : 0)) return { type: 'packPick', index: i, cardIds: [] };
          continue;
        }
        if (ch.kind === 'card') return { type: 'packPick', index: i, cardIds: [] };
        const def = CONSUMABLES[ch.cons.id];
        const targets = pack.hand.slice(0, def.select?.[0] ?? 0);
        if (!consumableError(run, def, targets)) return { type: 'packPick', index: i, cardIds: targets };
      }
      return { type: 'packSkip' };
    }
    case 'victory':
      if (opts.endlessUntil && run.ante < opts.endlessUntil) return { type: 'continueEndless' };
      return null;
    case 'gameover':
      return null;
  }
}

interface BotResult {
  run: RunState;
  actions: Action[];
  phases: Set<Phase>;
  maxAnte: number;
}

function playBot(seed: string, opts: BotOpts = {}, maxSteps = 5000): BotResult {
  const run = newRun(seed, { owned: [], seen: [], unlocked: [] });
  const actions: Action[] = [];
  const phases = new Set<Phase>([run.phase]);
  let maxAnte = 1;
  for (let step = 0; step < maxSteps; step++) {
    if (opts.endlessUntil && run.endless && run.ante > opts.endlessUntil) break;
    if (run.phase === 'blind' && opts.level) for (const h of HAND_ORDER) run.handLevels[h].level = Math.max(run.handLevels[h].level, opts.level);
    if (run.phase === 'shop' && opts.allowance && !run.cycle.botPaid) {
      run.money += opts.allowance;
      run.cycle.botPaid = 1;
    }
    const a = botAction(run, opts);
    if (!a) break;
    actions.push(a);
    const r = applyAction(run, a);
    if (!r.ok) throw new Error(`seed ${seed} step ${step} ${a.type} in ${run.phase}: ${r.error}`);
    phases.add(run.phase);
    maxAnte = Math.max(maxAnte, run.ante);
    expect(Number.isFinite(run.roundScore)).toBe(true);
    expect(Number.isFinite(run.money)).toBe(true);
  }
  return { run, actions, phases, maxAnte };
}

describe('determinism', () => {
  it('same seed + same actions => same final state', () => {
    const a = freshRun('DET-1');
    const b = freshRun('DET-1');
    expect(plain(a)).toStrictEqual(plain(b));
    const first = playBot('DET-1', { level: 50, allowance: 10 }, 300);
    // Replay the recorded actions on a fresh run.
    const replay = freshRun('DET-1');
    for (const [i, x] of first.actions.entries()) {
      if (replay.phase === 'blind') for (const h of HAND_ORDER) replay.handLevels[h].level = Math.max(replay.handLevels[h].level, 50);
      if (replay.phase === 'shop' && !replay.cycle.botPaid) {
        replay.money += 10;
        replay.cycle.botPaid = 1;
      }
      const r = applyAction(replay, x);
      expect(r.ok, `action ${i}`).toBe(true);
    }
    expect(plain(replay)).toStrictEqual(plain(first.run));
  });

  it('a run cloned mid-way continues identically', () => {
    const run = freshRun('CLONE');
    act(run, { type: 'selectBlind' });
    const copy = structuredClone(run);
    for (const r of [run, copy]) {
      act(r, { type: 'discard', cardIds: r.hand.slice(0, 3) });
      act(r, { type: 'play', cardIds: r.hand.slice(0, 5) });
    }
    expect(plain(copy)).toStrictEqual(plain(run));
  });

  it('different seeds differ', () => {
    const a = freshRun('SEED-A');
    const b = freshRun('SEED-B');
    act(a, { type: 'selectBlind' });
    act(b, { type: 'selectBlind' });
    expect(a.hand).not.toEqual(b.hand);
    expect(plain(a)).not.toStrictEqual(plain(b));
  });
});

describe('greedy bot', () => {
  const seeds = ['BOT-1', 'BOT-2', 'BOT-3', 'BOT-4', 'BOT-5', 'BOT-6', 'BOT-7', 'BOT-8'];
  it.each(seeds)('%s reaches victory with boosted hand levels', (seed) => {
    const res = playBot(seed, { level: 300, allowance: 15 });
    expect(res.run.phase).toBe('victory');
    expect(res.run.won).toBe(true);
    expect(res.run.ante).toBe(8);
    expect(res.run.stats.bossesDefeated).toBe(8);
    for (const ph of ['blind', 'round', 'cashout', 'shop', 'victory'] as Phase[]) expect(res.phases).toContain(ph);
    expect(res.run.unlocked).toContain('luca_blight');
  });

  it('continues into endless mode', () => {
    const res = playBot('BOT-ENDLESS', { level: 2000, allowance: 15, endlessUntil: 10 });
    expect(res.run.endless).toBe(true);
    expect(res.maxAnte).toBeGreaterThanOrEqual(10);
    expect(res.run.phase).not.toBe('gameover');
  });

  it('every state the bot reaches is a valid save', () => {
    const res = playBot('BOT-SAVE', { level: 300, allowance: 15 });
    const replay = freshRun('BOT-SAVE');
    for (const a of res.actions) {
      if (replay.phase === 'blind') for (const h of HAND_ORDER) replay.handLevels[h].level = Math.max(replay.handLevels[h].level, 300);
      if (replay.phase === 'shop' && !replay.cycle.botPaid) {
        replay.money += 15;
        replay.cycle.botPaid = 1;
      }
      act(replay, a);
      expect(validateRun(plain(replay))).toEqual([]);
    }
    expect(replay.phase).toBe('victory');
  });

  it('an unboosted bot plays until a normal end without errors', () => {
    for (const seed of ['RAW-1', 'RAW-2', 'RAW-3']) {
      const res = playBot(seed);
      expect(['gameover', 'victory']).toContain(res.run.phase);
    }
  });
});

describe('all 113 Jokers can appear', () => {
  it('the roster has 113 Jokers', () => {
    expect(JOKER_LIST).toHaveLength(113);
  });

  it('every non-legendary Joker is reachable through the shop pool', () => {
    const run = freshRun('ALL');
    run.discovered.owned = JOKER_LIST.map((j) => j.id).slice(0, 100); // Mazus needs 100
    const seen = new Set<string>();
    for (;;) {
      const id = rollJokerId(run, undefined, seen);
      if (!id) break;
      seen.add(id);
    }
    const expected = JOKER_LIST.filter((j) => j.rarity !== 'L').map((j) => j.id);
    expect([...seen].sort()).toEqual(expected.sort());
  });

  it('legendaries come from the Rune of Beginning; Luca only after unlock', () => {
    const got = (unlocked: string[]) => {
      const run = freshRun('LEGEND');
      run.unlocked = unlocked;
      const ids: string[] = [];
      for (let i = 0; i < 6; i++) {
        const uid = 70_000 + i;
        run.consumables = [{ uid, id: 'beginning' }];
        if (!applyAction(run, { type: 'useConsumable', uid, cardIds: [] }).ok) break;
      }
      for (const j of run.jokers) ids.push(j.id);
      return ids;
    };
    const legends = JOKER_LIST.filter((j) => j.rarity === 'L').map((j) => j.id);
    const locked = got([]);
    expect(locked.sort()).toEqual(legends.filter((id) => id !== 'luca_blight').sort());
    const unlocked = got(['luca_blight']);
    expect(unlocked.sort()).toEqual(legends.sort());
    for (const id of unlocked) expect(JOKERS[id].rarity).toBe('L');
  });
});
