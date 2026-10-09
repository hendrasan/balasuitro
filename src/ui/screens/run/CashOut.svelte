<script lang="ts">
  import { game } from '../../../stores/game.svelte';
  import { potch } from '../../format';

  const run = $derived(game.view!);
  const co = $derived(run.cashout);

  function key(e: KeyboardEvent) {
    if (e.key === 'Enter' && !document.querySelector('[role="dialog"]')) game.dispatch({ type: 'cashOut' });
  }
</script>

<svelte:window onkeydown={key} />

{#if co}
  <div class="panel cash">
    <h2 class="display">Victory!</h2>
    <ul>
      {#each co.lines as l, i (i)}
        <li style="animation-delay:{i * 80}ms"><span>{l.label}</span><b class:neg={l.amount < 0}>{l.amount < 0 ? '' : '+'}{potch(l.amount)}</b></li>
      {/each}
    </ul>
    <button class="btn gold" type="button" onclick={() => game.dispatch({ type: 'cashOut' })}>Cash out {potch(co.total)}</button>
  </div>
{/if}

<style>
  .cash {
    max-width: 420px;
    margin: 20px auto;
    padding: 18px 20px;
    display: flex;
    flex-direction: column;
    gap: 10px;
  }
  h2 {
    margin: 0;
    text-align: center;
    color: var(--gold);
  }
  ul {
    list-style: none;
    margin: 0;
    padding: 0;
  }
  li {
    display: flex;
    justify-content: space-between;
    padding: 6px 0;
    border-bottom: 1px dashed rgba(255, 255, 255, 0.08);
    animation: in 0.3s var(--ease) both;
  }
  li b {
    color: var(--money);
  }
  li b.neg {
    color: var(--mult);
  }
  @keyframes in {
    from { opacity: 0; transform: translateX(-8px); }
  }
</style>
