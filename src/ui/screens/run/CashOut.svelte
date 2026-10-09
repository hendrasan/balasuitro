<script lang="ts">
  import { game } from '../../../stores/game.svelte';
  import { potch } from '../../format';
  import { Tween } from 'svelte/motion';
  import { cubicOut } from 'svelte/easing';
  import { dur } from '../../motion';

  const run = $derived(game.view!);
  const co = $derived(run.cashout);
  // Total counts up after the lines have dealt in.
  const total = new Tween(0, { easing: cubicOut });
  $effect(() => {
    const n = co?.lines.length ?? 0;
    total.set(co?.total ?? 0, { duration: dur(500), delay: dur(n * 80 + 120) });
  });

  function key(e: KeyboardEvent) {
    if (e.key === 'Enter' && !document.querySelector('[role="dialog"]')) game.dispatch({ type: 'cashOut' });
  }
</script>

<svelte:window onkeydown={key} />

{#if co}
  <div class="panel cash">
    <h2 class="display orn">{run.rescued && co.lines[0]?.label === 'Saved by the squirrels' ? 'Saved by the Squirrels!' : 'Battle Won'}</h2>
    <ul>
      {#each co.lines as l, i (i)}
        <li style="animation-delay:{i * 80}ms"><span>{l.label}</span><b class:neg={l.amount < 0}>{l.amount < 0 ? '' : '+'}{potch(l.amount)}</b></li>
      {/each}
    </ul>
    <div class="sum"><span>Total</span><b>+{potch(Math.round(total.current))}</b></div>
    <button class="btn gold shine" type="button" onclick={() => game.dispatch({ type: 'cashOut' })}>Cash out {potch(co.total)}</button>
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
    justify-content: center;
    color: var(--gold);
  }
  .sum {
    display: flex;
    justify-content: space-between;
    font: 700 20px var(--font-display);
  }
  .sum b {
    color: var(--money);
    text-shadow: 0 0 12px rgba(242, 193, 78, 0.45);
  }
  .shine {
    position: relative;
    overflow: hidden;
  }
  .shine::after {
    content: '';
    position: absolute;
    inset: 0;
    background: linear-gradient(110deg, transparent 35%, rgba(255, 255, 255, 0.6) 50%, transparent 65%);
    transform: translateX(-120%);
    animation: sweep 900ms var(--ease) 700ms both;
    pointer-events: none;
  }
  @keyframes sweep {
    to { transform: translateX(120%); }
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
