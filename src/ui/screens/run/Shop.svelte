<script lang="ts">
  import { game } from '../../../stores/game.svelte';
  import { CONSUMABLES } from '../../../engine/consumables';
  import { itemPrice, packPrice, rerollPrice, voucherPrice, PACK_NAMES, packShape } from '../../../engine/shop';
  import { VOUCHERS } from '../../../engine/vouchers';
  import { JOKERS } from '../../../engine/data';
  import { inspect } from '../../inspect.svelte';
  import { richText, potch } from '../../format';
  import JokerCard from '../../components/JokerCard.svelte';
  import ConsumableCard from '../../components/ConsumableCard.svelte';

  const run = $derived(game.view!);
  const shop = $derived(run.shop!);
  const p = $derived(game.passives!);
  const voucher = $derived(run.anteVoucher ? VOUCHERS[run.anteVoucher] : null);

  function buy(i: number) {
    if (game.dispatch({ type: 'buyCard', index: i })) {
      game.sound('buy');
      inspect.close();
    }
  }
</script>

<div class="shop">
  <div class="top">
    <h2 class="display orn">Merchant's Camp</h2>
    <div class="actions">
      <button class="btn primary" type="button" onclick={() => game.dispatch({ type: 'leaveShop' })}>Next battle ▸</button>
      <button class="btn" type="button" disabled={run.money < rerollPrice(shop, p)} onclick={() => game.dispatch({ type: 'reroll' })}>
        Reroll {potch(rerollPrice(shop, p))}
      </button>
    </div>
  </div>

  <div class="items">
    {#each shop.cards as it, i (it ? (it.kind === 'joker' ? it.joker.uid : it.cons.uid) : `sold-${i}`)}
      <div class="item" class:empty={!it} style="--i:{i}">
        {#if it}
          {#if it.kind === 'joker'}
            <JokerCard
              id={it.joker.id}
              edition={it.joker.edition}
              pinned={inspect.pinned?.kind === 'jokerData' && inspect.pinned.id === it.joker.id}
              onclick={() => inspect.pin({ kind: 'jokerData', id: it.joker.id, edition: it.joker.edition, where: 'shop' })}
              onhover={(on) => (inspect.hover = on ? { kind: 'jokerData', id: it.joker.id, edition: it.joker.edition, where: 'shop' } : null)}
            />
            <div class="desc">{@html richText(JOKERS[it.joker.id].text)}</div>
          {:else}
            <ConsumableCard
              id={it.cons.id}
              onclick={() => inspect.pin({ kind: 'consData', id: it.cons.id })}
              onhover={(on) => (inspect.hover = on ? { kind: 'consData', id: it.cons.id } : null)}
            />
            <div class="desc">{@html richText(CONSUMABLES[it.cons.id].text)}</div>
          {/if}
          <button class="btn small gold" type="button" disabled={run.money < itemPrice(it, p)} onclick={() => buy(i)}>
            Buy {itemPrice(it, p) === 0 ? 'FREE' : potch(itemPrice(it, p))}
          </button>
        {:else}
          <div class="sold">Sold</div>
        {/if}
      </div>
    {/each}
  </div>

  <div class="lower">
    <div class="voucher panel">
      <h3 class="display orn">Blacksmith</h3>
      {#if voucher}
        <b>{voucher.name}</b>
        <p class="muted">{voucher.text}</p>
        <button class="btn small gold" type="button" disabled={run.money < voucherPrice(p)} onclick={() => game.dispatch({ type: 'buyVoucher' })}>
          Forge {potch(voucherPrice(p))}
        </button>
      {:else}
        <p class="muted">Come back next Chapter for a new upgrade.</p>
      {/if}
      {#if run.vouchers.length}
        <p class="owned">Owned: {run.vouchers.map((v) => VOUCHERS[v].name).join(', ')}</p>
      {/if}
    </div>
    <div class="packs">
      {#each shop.packs as pk, i (i)}
        <div class="pack panel" class:gone={!pk}>
          {#if pk}
            {@const shape = packShape(pk.type, pk.size)}
            <div class="sigil t-{pk.type}" aria-hidden="true">{pk.type === 'rune' ? '◈' : pk.type === 'forging' ? '⚒' : pk.type === 'true' ? '✷' : pk.type === 'star' ? '★' : '♠'}</div>
            <div class="ptype t-{pk.type} display">{pk.size === 'normal' ? '' : pk.size === 'jumbo' ? 'Jumbo ' : 'Mega '}{PACK_NAMES[pk.type]}</div>
            <div class="muted small">Choose {shape[1]} of {shape[0]}</div>
            <button class="btn small gold" type="button" disabled={run.money < packPrice(pk, p)} onclick={() => game.dispatch({ type: 'buyPack', index: i })}>
              Open {packPrice(pk, p) === 0 ? 'FREE' : potch(packPrice(pk, p))}
            </button>
          {:else}
            <div class="muted">Opened</div>
          {/if}
        </div>
      {/each}
    </div>
  </div>
</div>

<style>
  .shop {
    display: flex;
    flex-direction: column;
    gap: 14px;
  }
  .top {
    display: flex;
    justify-content: space-between;
    align-items: center;
    flex-wrap: wrap;
    gap: 10px;
  }
  h2 {
    margin: 0;
    color: var(--gold);
  }
  .actions {
    display: flex;
    gap: 8px;
  }
  .items {
    display: flex;
    flex-wrap: wrap;
    gap: 14px;
    justify-content: center;
  }
  .item {
    width: 170px;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 6px;
    padding: 12px 10px 10px;
    background:
      linear-gradient(180deg, rgba(255, 255, 255, 0.04), transparent 40%),
      rgba(0, 0, 0, 0.3);
    border: 1px solid var(--line);
    border-radius: var(--radius);
    box-shadow: 0 8px 18px rgba(0, 0, 0, 0.35);
    /* Cards flip onto the counter on shop entry and on reroll. */
    animation: deal 360ms var(--ease) both;
    animation-delay: calc(var(--i) * 70ms);
    transform-origin: 50% 100%;
  }
  .item.empty {
    animation: none;
    box-shadow: none;
    background: rgba(0, 0, 0, 0.15);
  }
  @keyframes deal {
    from { transform: perspective(600px) rotateY(-75deg) translateY(10px); opacity: 0; }
  }
  .desc {
    font-size: 12px;
    text-align: center;
    min-height: 3em;
  }
  .sold {
    height: var(--joker-h);
    display: grid;
    place-items: center;
    color: var(--ink-faint);
  }
  .lower {
    display: grid;
    grid-template-columns: 1fr 2fr;
    gap: 12px;
  }
  @media (max-width: 760px) {
    .lower {
      grid-template-columns: 1fr;
    }
    .item {
      width: 46%;
    }
  }
  .voucher {
    padding: 12px;
  }
  .voucher h3 {
    margin: 0 0 6px;
    color: var(--gold);
    font-size: 16px;
  }
  .voucher p {
    margin: 4px 0 8px;
    font-size: 13px;
  }
  .owned {
    font-size: 11px;
    color: var(--ink-faint);
  }
  .packs {
    display: flex;
    gap: 12px;
    flex-wrap: wrap;
  }
  .pack {
    flex: 1 1 140px;
    padding: 12px;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 6px;
    text-align: center;
    background:
      repeating-linear-gradient(135deg, rgba(255, 255, 255, 0.03) 0 6px, transparent 6px 12px),
      var(--panel);
  }
  .sigil {
    width: 46px;
    height: 46px;
    display: grid;
    place-items: center;
    font-size: 24px;
    border-radius: 50%;
    border: 1px solid currentColor;
    background: radial-gradient(circle, rgba(255, 255, 255, 0.12), transparent 70%);
    box-shadow: 0 0 14px color-mix(in srgb, currentColor 35%, transparent);
  }
  @media (hover: hover) and (pointer: fine) {
    .pack:not(.gone):hover .sigil {
      transform: rotate(-8deg) scale(1.08);
    }
  }
  .sigil {
    transition: transform 180ms var(--ease);
  }
  .pack.gone {
    opacity: 0.4;
  }
  .ptype {
    font-size: 15px;
  }
  .t-rune { color: #8fb4ff; }
  .t-forging { color: #f0a85a; }
  .t-true { color: #d79cff; }
  .t-star { color: var(--gold); }
  .t-standard { color: var(--parch); }
  .small {
    font-size: 12px;
  }
</style>
