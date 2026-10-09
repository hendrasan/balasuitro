<script lang="ts">
  import { game } from '../../../stores/game.svelte';
  import { HAND_INFO } from '../../../engine/hands';
  import { num } from '../../format';
  import { renownForRun } from '../../../engine/castle';

  const run = $derived(game.view!);
  const won = $derived(run.phase === 'victory');
</script>

{#if won}<div class="rays" aria-hidden="true"></div>{/if}
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
    <dt>Renown</dt><dd class="renown">+{renownForRun(run)}{run.modifiers.renownBonusPct ? ` (incl. +${run.modifiers.renownBonusPct}% Stage)` : ''}{won ? ' — added when the run ends' : ''}</dd>
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
    animation: enter 420ms var(--ease) both;
  }
  .end:not(.won) {
    border-color: rgba(200, 90, 100, 0.5);
  }
  .end:not(.won) h2 {
    color: #d98a8a;
  }
  @keyframes enter {
    from { transform: translateY(20px) scale(0.96); opacity: 0; }
  }
  /* Victory only: slow rays behind the panel. */
  .rays {
    position: absolute;
    left: 50%;
    top: 45%;
    width: 900px;
    height: 900px;
    margin: -450px 0 0 -450px;
    pointer-events: none;
    background: repeating-conic-gradient(from 0deg, rgba(247, 221, 151, 0.12) 0 6deg, transparent 6deg 18deg);
    -webkit-mask: radial-gradient(circle, #000 10%, transparent 60%);
    mask: radial-gradient(circle, #000 10%, transparent 60%);
    animation: spin 40s linear infinite, fade 800ms ease-out both;
  }
  @keyframes spin {
    to { transform: rotate(360deg); }
  }
  @keyframes fade {
    from { opacity: 0; }
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
  .won h2 {
    font-size: 36px;
    background: linear-gradient(180deg, #fff3cf, #d9a640 60%, #8a5d18);
    -webkit-background-clip: text;
    background-clip: text;
    color: transparent;
    animation: enter 520ms var(--ease) 120ms both;
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
  .renown {
    color: var(--gold);
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
