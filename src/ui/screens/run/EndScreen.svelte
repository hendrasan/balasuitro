<script lang="ts">
  import { game } from '../../../stores/game.svelte';
  import { HAND_INFO } from '../../../engine/hands';
  import { num } from '../../format';

  const run = $derived(game.view!);
  const won = $derived(run.phase === 'victory');
</script>

<div class="end panel" class:won>
  {#if won}
    <h2 class="display">The War Is Over</h2>
    <p>You defeated Jowy at the Beginning. The Stars of Destiny shine on your army.</p>
  {:else}
    <h2 class="display">Defeat</h2>
    <p>Your army has fallen in Chapter {run.ante}.</p>
  {/if}
  <dl>
    <dt>Seed</dt><dd class="mono">{run.seed}</dd>
    <dt>Best hand</dt><dd>{num(run.stats.bestHand)}</dd>
    <dt>Bosses defeated</dt><dd>{run.stats.bossesDefeated}</dd>
    <dt>Hands played</dt><dd>{run.stats.handsPlayed}</dd>
    <dt>Last hand</dt><dd>{run.stats.lastHandType ? HAND_INFO[run.stats.lastHandType].name : '—'}</dd>
  </dl>
  <div class="buttons">
    {#if won}
      <button class="btn gold" type="button" onclick={() => game.dispatch({ type: 'continueEndless' })}>Continue (Endless)</button>
    {/if}
    <button class="btn primary" type="button" onclick={() => game.startRun()}>New run</button>
    <button class="btn" type="button" onclick={() => game.endRun()}>Main menu</button>
  </div>
</div>

<style>
  .end {
    max-width: 460px;
    margin: 30px auto;
    padding: 22px;
    text-align: center;
  }
  .end.won {
    border-color: var(--gold);
    box-shadow: 0 0 40px rgba(233, 185, 73, 0.3);
  }
  h2 {
    margin: 0 0 6px;
    font-size: 30px;
    color: var(--gold);
  }
  dl {
    display: grid;
    grid-template-columns: auto auto;
    gap: 4px 14px;
    justify-content: center;
    text-align: left;
  }
  dt {
    color: var(--ink-dim);
  }
  dd {
    margin: 0;
    font-weight: 700;
  }
  .mono {
    font-family: ui-monospace, monospace;
    user-select: all;
  }
  .buttons {
    display: flex;
    gap: 8px;
    justify-content: center;
    flex-wrap: wrap;
    margin-top: 14px;
  }
</style>
