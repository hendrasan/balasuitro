import { describe, expect, it } from 'vitest';
import { anteBase, blindTarget, ensureBoss, planBosses } from '../src/engine/blinds';
import { CONFIG } from '../src/engine/config';
import { BOSSES, JOKER_LIST, JOKERS } from '../src/engine/data';
import { availableJokers, isJokerAvailable, rollJokerId } from '../src/engine/pools';
import { applyAction } from '../src/engine/run';
import { generateShop, openPack } from '../src/engine/shop';
import type { RunState, ShopState } from '../src/engine/state';
import { act, freshRun, joker } from './helpers';

const BRIEF_TARGETS = [
  [300, 450, 600],
  [800, 1200, 1600],
  [2000, 3000, 4000],
  [5000, 7500, 10000],
  [11000, 16500, 22000],
  [20000, 30000, 40000],
  [35000, 52500, 70000],
  [50000, 75000, 100000],
];

/** Start the current blind and make it winnable with one card. */
function startEasyRound(run: RunState): void {
  act(run, { type: 'selectBlind' });
  run.target = 1;
}

describe('blind targets', () => {
  it('match the brief for antes 1-8 (standard x2 boss)', () => {
    BRIEF_TARGETS.forEach((row, i) => {
      const ante = i + 1;
      expect([blindTarget(ante, 0, null), blindTarget(ante, 1, null), blindTarget(ante, 2, 'seed')]).toEqual(row);
    });
  });
  it('a new run targets 300', () => {
    expect(freshRun().target).toBe(300);
  });
  it('boss data can override the multiplier', () => {
    expect(blindTarget(2, 2, 'yuber')).toBe(800 * BOSSES.yuber.targetMult);
    expect(blindTarget(4, 2, 'luca_blight')).toBe(5000 * BOSSES.luca_blight.targetMult);
  });
  it('endless targets keep growing after Ante 8', () => {
    let prev = anteBase(8);
    for (let a = 9; a <= 16; a++) {
      const t = anteBase(a);
      expect(t).toBeGreaterThan(prev);
      expect(Number.isFinite(t)).toBe(true);
      prev = t;
    }
  });
});

describe('boss plan', () => {
  it('Jowy at Ante 8, Luca at 4 or 6, Neclord placed, every ante has a boss', () => {
    const lucaAntes = new Set<string>();
    for (let i = 0; i < 40; i++) {
      const run = freshRun('PLAN' + i);
      const b = run.bosses;
      expect(b['8']).toBe('jowy_boss');
      const luca = Object.keys(b).find((k) => b[k] === 'luca_blight')!;
      expect(['4', '6']).toContain(luca);
      lucaAntes.add(luca);
      const nec = Object.keys(b).filter((k) => b[k] === 'neclord');
      expect(nec).toHaveLength(1);
      expect(['6', '7']).toContain(nec[0]);
      for (let a = 1; a <= 8; a++) {
        const boss = BOSSES[b[String(a)]];
        expect(boss).toBeDefined();
        if (!boss.fixed) expect(boss.minAnte).toBeLessThanOrEqual(a);
      }
      expect(new Set(Object.values(b)).size).toBe(8);
    }
    expect(lucaAntes).toEqual(new Set(['4', '6']));
  });
  it('endless antes get a boss; Jowy returns every 8 antes; fixed bosses only in endless', () => {
    const run = freshRun('ENDLESS');
    planBosses(run);
    for (let a = 9; a <= 24; a++) {
      const id = ensureBoss(run, a);
      expect(BOSSES[id]).toBeDefined();
      if (a % 8 === 0) expect(id).toBe('jowy_boss');
      else expect(BOSSES[id].finale).toBeFalsy();
    }
  });
});

describe('skipping blinds', () => {
  it('gives the spoil and moves to the next blind', () => {
    const run = freshRun('SKIP');
    run.anteState.spoils = ['investment', 'economy'];
    act(run, { type: 'skipBlind' });
    expect(run.investment).toBe(15);
    expect(run.blindIndex).toBe(1);
    expect(run.target).toBe(450);
    expect(run.stats.blindsSkipped).toBe(1);
    expect(run.anteState.skipped).toBe(true);
    act(run, { type: 'skipBlind' });
    expect(run.money).toBe(CONFIG.startMoney * 2);
    expect(run.blindIndex).toBe(2);
    expect(applyAction(run, { type: 'skipBlind' }).ok).toBe(false);
  });
  it('War Bonds pay out after the boss', () => {
    const run = freshRun('BONDS');
    run.anteState.spoils = ['investment', 'investment'];
    act(run, { type: 'skipBlind' });
    act(run, { type: 'skipBlind' });
    expect(run.investment).toBe(30);
    startEasyRound(run);
    act(run, { type: 'play', cardIds: [run.hand[0]] });
    expect(run.cashout?.lines.find((l) => l.label === 'War Bonds')?.amount).toBe(30);
    expect(run.investment).toBe(0);
  });
});

describe('cash-out', () => {
  it('blind reward + $1 per remaining hand + interest $1 per $5', () => {
    const run = freshRun('CASH');
    startEasyRound(run);
    run.money = 23;
    act(run, { type: 'play', cardIds: [run.hand[0]] });
    expect(run.phase).toBe('cashout');
    const lines = Object.fromEntries(run.cashout!.lines.map((l) => [l.label, l.amount]));
    expect(lines['Duel defeated']).toBe(3);
    expect(lines['Remaining hands (3)']).toBe(3);
    expect(lines['Interest']).toBe(4);
    expect(run.cashout!.total).toBe(10);
    act(run, { type: 'cashOut' });
    expect(run.money).toBe(33);
    expect(run.phase).toBe('shop');
    expect(run.blindIndex).toBe(1);
  });
  it('interest is capped', () => {
    const run = freshRun('CAP');
    startEasyRound(run);
    run.money = 500;
    act(run, { type: 'play', cardIds: [run.hand[0]] });
    expect(run.cashout!.lines.find((l) => l.label === 'Interest')?.amount).toBe(CONFIG.interestCap);
  });
  it('no interest on debt, and boss reward is 5', () => {
    const run = freshRun('BOSS');
    run.blindIndex = 2;
    run.bosses['1'] = 'seed';
    startEasyRound(run);
    run.money = -3;
    act(run, { type: 'play', cardIds: [run.hand[0]] });
    expect(run.cashout!.lines.find((l) => l.label === 'Interest')).toBeUndefined();
    expect(run.cashout!.lines[0].amount).toBe(5);
    expect(run.cashout!.bossBeaten).toBe(true);
    act(run, { type: 'cashOut' });
    expect(run.ante).toBe(2);
    expect(run.blindIndex).toBe(0);
  });
});

function testShop(run: RunState): ShopState {
  run.phase = 'shop';
  run.shop = {
    cards: [
      { kind: 'joker', joker: joker('chaco') },
      { kind: 'joker', joker: joker('flik', { edition: 'foil' }) },
      { kind: 'cons', cons: { uid: 90_001, id: 'forge_pair' } },
    ],
    packs: [{ type: 'forging', size: 'normal' }],
    rerollCost: CONFIG.rerollBase,
    freeRerolls: 0,
    boughtAny: false,
  };
  return run.shop;
}

describe('shop', () => {
  it('buy prices: Joker cost + edition cost; consumable cost', () => {
    const run = freshRun('SHOP');
    testShop(run);
    run.money = 50;
    act(run, { type: 'buyCard', index: 0 });
    expect(run.money).toBe(50 - JOKERS.chaco.cost);
    act(run, { type: 'buyCard', index: 1 });
    expect(run.money).toBe(50 - 4 - (8 + CONFIG.editionCost.foil));
    act(run, { type: 'buyCard', index: 2 });
    expect(run.money).toBe(36 - CONFIG.consumableCost.forging);
    expect(run.jokers.map((j) => j.id)).toEqual(['chaco', 'flik']);
    expect(run.consumables.map((c) => c.id)).toEqual(['forge_pair']);
    expect(run.discovered.owned).toEqual(expect.arrayContaining(['chaco', 'flik']));
    expect(applyAction(run, { type: 'buyCard', index: 0 }).ok).toBe(false);
  });
  it('sell value is half the cost, rounded down, min 1', () => {
    const run = freshRun('SELL');
    run.jokers = [joker('chaco'), joker('flik', { edition: 'foil' }), joker('killey', { sellBonus: 3 })];
    run.money = 0;
    act(run, { type: 'sellJoker', uid: run.jokers[0].uid });
    expect(run.money).toBe(2);
    act(run, { type: 'sellJoker', uid: run.jokers[0].uid });
    expect(run.money).toBe(2 + 5);
    act(run, { type: 'sellJoker', uid: run.jokers[0].uid });
    expect(run.money).toBe(7 + 3 + 3);
  });
  it('Luca cannot be sold', () => {
    const run = freshRun('LUCA');
    run.jokers = [joker('luca_blight')];
    expect(applyAction(run, { type: 'sellJoker', uid: run.jokers[0].uid }).ok).toBe(false);
  });
  it('fails with too little money or no room', () => {
    const run = freshRun('POOR');
    testShop(run);
    run.money = 3;
    expect(applyAction(run, { type: 'buyCard', index: 0 }).ok).toBe(false);
    run.money = 100;
    run.jokers = ['killey', 'koyu', 'pico', 'alberto', 'chaco'].map((id) => joker(id));
    expect(applyAction(run, { type: 'buyCard', index: 1 }).ok).toBe(false);
    expect(run.money).toBe(100);
  });
  it('reroll costs 5, then +1 each time', () => {
    const run = freshRun('REROLL');
    testShop(run);
    run.money = 20;
    act(run, { type: 'reroll' });
    expect(run.money).toBe(15);
    act(run, { type: 'reroll' });
    expect(run.money).toBe(9);
    expect(run.stats.rerolls).toBe(2);
    expect(run.shop!.cards.length).toBe(CONFIG.shopCardSlots);
    run.money = 6;
    expect(applyAction(run, { type: 'reroll' }).ok).toBe(false);
  });
  it('voucher purchase', () => {
    const run = freshRun('VOUCH');
    testShop(run);
    run.anteVoucher = 'grabber';
    run.money = 10;
    act(run, { type: 'buyVoucher' });
    expect(run.vouchers).toEqual(['grabber']);
    expect(run.money).toBe(0);
    expect(applyAction(run, { type: 'buyVoucher' }).ok).toBe(false);
  });
  it('pack open and pick', () => {
    const run = freshRun('PACK');
    testShop(run);
    run.money = 10;
    act(run, { type: 'buyPack', index: 0 });
    expect(run.money).toBe(10 - CONFIG.packCost.normal);
    expect(run.phase).toBe('pack');
    expect(run.pack!.choices).toHaveLength(3);
    const choice = run.pack!.choices[1]!;
    expect(choice.kind).toBe('cons');
    const hand = choice.kind === 'cons' ? choice.cons.id.replace('forge_', '') : '';
    const before = run.handLevels[hand as 'pair'].level;
    act(run, { type: 'packPick', index: 1, cardIds: [] });
    expect(run.handLevels[hand as 'pair'].level).toBe(before + 1);
    expect(run.phase).toBe('shop');
    expect(run.pack).toBeNull();
  });
  it('pack skip returns to the shop; leaving the shop goes to blind select', () => {
    const run = freshRun('PACK2');
    testShop(run);
    run.money = 10;
    act(run, { type: 'buyPack', index: 0 });
    act(run, { type: 'packSkip' });
    expect(run.phase).toBe('shop');
    act(run, { type: 'leaveShop' });
    expect(run.phase).toBe('blind');
    expect(run.shop).toBeNull();
  });
  it('every pack type opens and can be picked or skipped', () => {
    for (const type of ['rune', 'forging', 'true', 'star', 'standard'] as const) {
      for (const size of ['normal', 'jumbo', 'mega'] as const) {
        const run = freshRun('P' + type + size);
        const pack = openPack(run, { type, size });
        expect(pack.choices.length).toBeGreaterThan(0);
        expect(pack.picksLeft).toBeGreaterThan(0);
        if (type === 'rune' || type === 'true') expect(pack.hand.length).toBe(CONFIG.handSize);
      }
    }
  });
});

describe('consumables', () => {
  it('a Rune enhances the selected cards', () => {
    const run = freshRun('RUNE');
    act(run, { type: 'selectBlind' });
    run.consumables.push({ uid: 99_001, id: 'rage' });
    const [a, b] = run.hand;
    act(run, { type: 'useConsumable', uid: 99_001, cardIds: [a, b] });
    expect(run.deck.find((x) => x.id === a)!.enh).toBe('mult');
    expect(run.deck.find((x) => x.id === b)!.enh).toBe('mult');
    expect(run.consumables).toHaveLength(0);
    expect(run.stats.runesUsed).toBe(1);
  });
  it('a Rune with a bad selection fails and is kept', () => {
    const run = freshRun('RUNE2');
    act(run, { type: 'selectBlind' });
    run.consumables.push({ uid: 99_002, id: 'rage' });
    expect(applyAction(run, { type: 'useConsumable', uid: 99_002, cardIds: [] }).ok).toBe(false);
    expect(applyAction(run, { type: 'useConsumable', uid: 99_002, cardIds: run.hand.slice(0, 3) }).ok).toBe(false);
    expect(applyAction(run, { type: 'useConsumable', uid: 99_002, cardIds: [99_999] }).ok).toBe(false);
    expect(run.consumables.map((c) => c.uid)).toEqual([99_002]);
  });
  it('a Forging card levels its hand', () => {
    const run = freshRun('FORGE');
    run.consumables.push({ uid: 99_003, id: 'forge_flush' });
    act(run, { type: 'useConsumable', uid: 99_003, cardIds: [] });
    expect(run.handLevels.flush.level).toBe(2);
    expect(run.stats.lastConsumable).toBe('forge_flush');
  });
});

describe('Luca Blight', () => {
  it('is locked from every pool until his boss is defeated', () => {
    const run = freshRun('LUCA');
    expect(isJokerAvailable(run, 'luca_blight')).toBe(false);
    expect(availableJokers(run, 'L')).not.toContain('luca_blight');
    run.ante = 4;
    run.bosses['4'] = 'luca_blight';
    run.blindIndex = 2;
    act(run, { type: 'selectBlind' });
    expect(run.round!.bossId).toBe('luca_blight');
    expect(run.round!.handsLeft).toBe(1);
    run.target = 1;
    act(run, { type: 'play', cardIds: [run.hand[0]] });
    expect(run.phase).toBe('cashout');
    expect(run.unlocked).toContain('luca_blight');
    expect(isJokerAvailable(run, 'luca_blight')).toBe(true);
    expect(availableJokers(run, 'L')).toContain('luca_blight');
  });
  it('losing to Luca does not unlock him', () => {
    const run = freshRun('LUCA2');
    run.ante = 4;
    run.bosses['4'] = 'luca_blight';
    run.blindIndex = 2;
    act(run, { type: 'selectBlind' });
    run.target = 1e12;
    act(run, { type: 'play', cardIds: [run.hand[0]] });
    expect(run.phase).toBe('gameover');
    expect(run.unlocked).not.toContain('luca_blight');
  });
});

describe('pools', () => {
  it('legendaries never appear in the shop or Star packs', () => {
    for (let i = 0; i < 150; i++) {
      const run = freshRun('POOL' + i);
      run.unlocked = ['luca_blight'];
      run.vouchers = ['overstock', 'overstock_plus'];
      const shop = generateShop(run);
      for (const it of shop.cards) if (it?.kind === 'joker') expect(JOKERS[it.joker.id].rarity).not.toBe('L');
      const pack = openPack(run, { type: 'star', size: 'mega' });
      for (const ch of pack.choices) if (ch?.kind === 'joker') expect(JOKERS[ch.joker.id].rarity).not.toBe('L');
    }
  });
  it('the shop fallback never returns a legendary', () => {
    const run = freshRun('FALLBACK');
    run.unlocked = ['luca_blight'];
    const all = new Set(JOKER_LIST.filter((j) => j.rarity !== 'L').map((j) => j.id));
    expect(rollJokerId(run, 'C', all)).toBeNull();
    expect(rollJokerId(run, undefined, all)).toBeNull();
  });
  it('Mazus needs 100 owned in the collection', () => {
    const run = freshRun('MAZUS');
    const ids = JOKER_LIST.map((j) => j.id).filter((id) => id !== 'mazus');
    run.discovered.owned = ids.slice(0, 99);
    expect(isJokerAvailable(run, 'mazus')).toBe(false);
    expect(availableJokers(run, 'R')).not.toContain('mazus');
    run.discovered.owned = ids.slice(0, 100);
    expect(isJokerAvailable(run, 'mazus')).toBe(true);
    expect(availableJokers(run, 'R')).toContain('mazus');
  });
  it('owned Jokers are not offered again', () => {
    const run = freshRun('OWNED');
    run.jokers = [joker('chaco')];
    expect(availableJokers(run, 'C')).not.toContain('chaco');
  });
});

describe('game over', () => {
  it('when hands run out below the target', () => {
    const run = freshRun('LOSE');
    act(run, { type: 'selectBlind' });
    run.target = 1e12;
    for (let i = 0; i < CONFIG.hands; i++) {
      expect(run.phase).toBe('round');
      act(run, { type: 'play', cardIds: [run.hand[0]] });
    }
    expect(run.phase).toBe('gameover');
    expect(applyAction(run, { type: 'selectBlind' }).ok).toBe(false);
  });
  it('an empty hand and empty draw pile ends the run (no softlock)', () => {
    const run = freshRun('EMPTY');
    act(run, { type: 'selectBlind' });
    run.drawPile = [];
    run.hand = run.hand.slice(0, 1);
    run.target = 1e12;
    act(run, { type: 'play', cardIds: [run.hand[0]] });
    expect(run.round!.handsLeft).toBeGreaterThan(0);
    expect(run.phase).toBe('gameover');
  });
  it('a Rune that destroys the whole hand draws a new hand', () => {
    const run = freshRun('KILLER');
    act(run, { type: 'selectBlind' });
    for (let i = 0; i < 4; i++) {
      run.consumables = [{ uid: 98_000 + i, id: 'killer' }];
      act(run, { type: 'useConsumable', uid: 98_000 + i, cardIds: run.hand.slice(0, 2) });
    }
    expect(run.hand).toHaveLength(CONFIG.handSize);
    expect(run.phase).toBe('round');
  });
  it('a deck with no cards loses at round start', () => {
    const run = freshRun('NODECK');
    run.deck = [];
    act(run, { type: 'selectBlind' });
    expect(run.phase).toBe('gameover');
  });
  it('discard draws back to hand size and runs out', () => {
    const run = freshRun('DISCARD');
    act(run, { type: 'selectBlind' });
    for (let i = 0; i < CONFIG.discards; i++) {
      act(run, { type: 'discard', cardIds: run.hand.slice(0, 5) });
      expect(run.hand).toHaveLength(CONFIG.handSize);
    }
    expect(applyAction(run, { type: 'discard', cardIds: [run.hand[0]] }).ok).toBe(false);
  });
  it('rejects bad play selections', () => {
    const run = freshRun('BAD');
    act(run, { type: 'selectBlind' });
    expect(applyAction(run, { type: 'play', cardIds: [] }).ok).toBe(false);
    expect(applyAction(run, { type: 'play', cardIds: run.hand.slice(0, 6) }).ok).toBe(false);
    expect(applyAction(run, { type: 'play', cardIds: [run.hand[0], run.hand[0]] }).ok).toBe(false);
    expect(applyAction(run, { type: 'play', cardIds: [run.drawPile[0]] }).ok).toBe(false);
    expect(run.round!.handsLeft).toBe(CONFIG.hands);
  });
});
