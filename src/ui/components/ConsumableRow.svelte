<script lang="ts">
  import { game } from '../../stores/game.svelte';
  import { inspect } from '../inspect.svelte';
  import ConsumableCard from './ConsumableCard.svelte';

  const run = $derived(game.view!);
  const slots = $derived(game.passives?.consumableSlots ?? 2);
</script>

<section class="row" aria-label="Consumables">
  <div class="head">
    <span class="title display">Runes</span>
    <span class="count">{run.consumables.length}/{slots}</span>
  </div>
  <div class="cards">
    {#each run.consumables as c (c.uid)}
      <ConsumableCard
        id={c.id}
        pinned={inspect.pinned?.kind === 'cons' && inspect.pinned.uid === c.uid}
        onclick={() => inspect.pin({ kind: 'cons', uid: c.uid })}
        onhover={(on) => (inspect.hover = on ? { kind: 'cons', uid: c.uid } : null)}
      />
    {/each}
    {#each Array(Math.max(0, slots - run.consumables.length)) as _, k (k)}
      <div class="empty" aria-hidden="true"></div>
    {/each}
  </div>
</section>

<style>
  .head {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    padding: 0 4px 4px;
    font-size: 12px;
    color: var(--ink-dim);
  }
  .title {
    color: var(--gold);
    font-size: 14px;
  }
  .cards {
    display: flex;
    gap: 8px;
    padding: 10px 8px 16px;
    min-height: calc(var(--joker-h) + 26px);
    background: rgba(0, 0, 0, 0.25);
    border: 1px solid var(--line);
    border-radius: var(--radius);
  }
  .empty {
    width: calc(var(--joker-w) * 0.86);
    height: var(--joker-h);
    border: 1px dashed rgba(212, 166, 74, 0.2);
    border-radius: 9px;
  }
  @media (max-width: 760px) {
    .cards {
      gap: 5px;
      padding: 8px 6px 14px;
    }
  }
</style>
