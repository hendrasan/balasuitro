<script lang="ts">
  import { game } from '../../../stores/game.svelte';
  import { BLIND_NAMES, SPOILS, blindTarget, canRerollBoss, chapterName } from '../../../engine/blinds';
  import { BOSSES } from '../../../engine/data';
  import { CONFIG } from '../../../engine/config';
  import { currentBossId } from '../../../engine/run';
  import { num, potch } from '../../format';

  const run = $derived(game.view!);
  const bossId = $derived(currentBossId(run));
  const boss = $derived(BOSSES[bossId]);
  const p = $derived(game.passives!);
  const canReroll = $derived(p.bossRerolls > run.anteState.bossRerollsUsed && canRerollBoss(run));
  const hasViki = $derived(run.jokers.some((j) => j.id === 'viki'));
  const canTeleport = $derived(hasViki && !run.anteState.vikiUsed && !!run.lastShop);

  function key(e: KeyboardEvent) {
    if (e.target instanceof HTMLInputElement) return;
    if (e.key === 'Enter') game.dispatch({ type: 'selectBlind' });
  }
</script>

<svelte:window onkeydown={key} />

<div class="wrap">
  <h2 class="display">Chapter {run.ante}: {chapterName(run.ante)}</h2>
  {#if boss.finale}<p class="finale display">The final battle. Jowy waits at the Beginning.</p>{/if}
  <div class="blinds">
    {#each [0, 1, 2] as i (i)}
      {@const isBoss = i === 2}
      {@const current = run.blindIndex === i}
      {@const past = run.blindIndex > i}
      <div class="blind panel" class:current class:past class:boss={isBoss} class:finale={isBoss && boss.finale}>
        <div class="kind">{BLIND_NAMES[i]}</div>
        <div class="name display">{isBoss ? boss.name : i === 0 ? 'Skirmish' : 'Field Battle'}</div>
        {#if isBoss}
          <div class="title">{boss.title}</div>
          <div class="text">{boss.text}</div>
        {/if}
        <div class="target"><span class="muted">Score at least</span><b>{num(blindTarget(run.ante, i, isBoss ? bossId : null))}</b></div>
        <div class="reward">Reward {potch(CONFIG.blindRewards[i])}</div>
        {#if current}
          <button class="btn primary" type="button" onclick={() => game.dispatch({ type: 'selectBlind' })}>Fight</button>
          {#if !isBoss}
            {@const sp = SPOILS[run.anteState.spoils[i]]}
            <div class="spoil">
              <div class="sname">Skip for: <b>{sp.name}</b></div>
              <div class="muted">{sp.text}</div>
              <button class="btn small" type="button" onclick={() => game.dispatch({ type: 'skipBlind' })}>Skip</button>
            </div>
          {:else if canReroll}
            <button class="btn small gold" type="button" onclick={() => game.dispatch({ type: 'rerollBoss' })}>Shu: change the boss</button>
          {/if}
        {:else if past}
          <div class="done">Done</div>
        {:else}
          <div class="muted upcoming">Upcoming</div>
        {/if}
      </div>
    {/each}
  </div>
  {#if canTeleport}
    <button class="btn gold teleport" type="button" onclick={() => game.dispatch({ type: 'teleport' })}>Viki: teleport back to the shop</button>
  {/if}
</div>

<style>
  .wrap {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 12px;
  }
  h2 {
    margin: 4px 0 0;
    color: var(--gold);
  }
  .finale {
    margin: 0;
    color: #e6c3ff;
  }
  .blinds {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 220px));
    gap: 12px;
    width: 100%;
    justify-content: center;
  }
  @media (max-width: 760px) {
    .blinds {
      grid-template-columns: 1fr;
    }
  }
  .blind {
    padding: 14px;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 6px;
    text-align: center;
    opacity: 0.6;
  }
  .blind.current {
    opacity: 1;
    border-color: var(--gold);
    transform: translateY(-4px);
  }
  .blind.past {
    opacity: 0.35;
  }
  .blind.boss {
    background: linear-gradient(180deg, rgba(110, 36, 48, 0.9), rgba(40, 14, 20, 0.95));
  }
  .blind.finale {
    background: linear-gradient(180deg, rgba(74, 29, 94, 0.95), rgba(20, 8, 28, 0.95));
    box-shadow: 0 0 24px rgba(233, 185, 73, 0.3);
  }
  .kind {
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: 0.12em;
    color: var(--gold-dim);
  }
  .name {
    font-size: 20px;
  }
  .title {
    font-size: 11px;
    color: var(--gold);
    text-transform: uppercase;
    letter-spacing: 0.08em;
  }
  .text {
    font-size: 14px;
  }
  .target {
    display: flex;
    flex-direction: column;
    font-size: 12px;
  }
  .target b {
    font: 700 22px var(--font-display);
    color: #ff8a7a;
  }
  .reward {
    color: var(--money);
    font-size: 13px;
  }
  .spoil {
    margin-top: 6px;
    padding-top: 8px;
    border-top: 1px solid var(--line);
    font-size: 13px;
    display: flex;
    flex-direction: column;
    gap: 4px;
    align-items: center;
  }
  .done {
    color: var(--green);
    font-weight: 700;
  }
</style>
