<script lang="ts">
  import { game } from '../../stores/game.svelte';
  import { JOKER_LIST } from '../../engine/data';
  import { chapterName } from '../../engine/blinds';

  let seed = $state('');
  let confirmNew = $state(false);
  const run = $derived(game.run);
  const p = $derived(game.profile);

  function newRun() {
    if (run && run.phase !== 'gameover' && !confirmNew) {
      confirmNew = true;
      return;
    }
    confirmNew = false;
    game.startRun(seed);
  }
</script>

<div class="menu">
  <header>
    <div class="stars" aria-hidden="true">✦ ✧ ✦</div>
    <h1 class="display">Stars of Destiny</h1>
    <p class="sub">A Suikoden II card war · fan project</p>
  </header>

  <nav class="panel">
    {#if run && run.phase !== 'gameover'}
      <button class="btn gold big" type="button" onclick={() => (game.screen = 'run')}>
        Continue — Chapter {run.ante}: {chapterName(run.ante)}
      </button>
    {/if}
    <div class="new">
      <label class="sr-only" for="seed">Seed (optional)</label>
      <input id="seed" placeholder="Seed (optional)" bind:value={seed} maxlength="16" autocomplete="off" spellcheck="false" />
      <button class="btn primary" type="button" onclick={newRun}>{confirmNew ? 'Abandon current run?' : 'New run'}</button>
    </div>
    <button class="btn" type="button" onclick={() => (game.screen = 'collection')}>
      Collection <span class="muted">({p.collection.owned.length}/{JOKER_LIST.length})</span>
    </button>
    <button class="btn" type="button" disabled title="Phase 2">Castle (coming soon)</button>
    <button class="btn" type="button" onclick={() => (game.screen = 'settings')}>Settings</button>
  </nav>

  <footer class="muted">
    Runs {p.stats.runs} · Wins {p.stats.wins} · Best chapter {p.stats.bestAnte}
    <br />Non-commercial fan project. Suikoden is a trademark of Konami. Inspired by Balatro.
  </footer>
</div>

<style>
  .menu {
    min-height: 100vh;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 24px;
    padding: 24px 16px;
  }
  header {
    text-align: center;
  }
  .stars {
    color: var(--gold);
    letter-spacing: 0.6em;
    font-size: 18px;
  }
  h1 {
    margin: 4px 0;
    font-size: clamp(36px, 8vw, 64px);
    background: linear-gradient(180deg, #fff3cf, #d9a640 60%, #8a5d18);
    -webkit-background-clip: text;
    background-clip: text;
    color: transparent;
    text-shadow: 0 4px 30px rgba(217, 166, 64, 0.2);
  }
  .sub {
    margin: 0;
    color: var(--ink-dim);
    letter-spacing: 0.15em;
    text-transform: uppercase;
    font-size: 12px;
  }
  nav {
    width: min(420px, 100%);
    padding: 18px;
    display: flex;
    flex-direction: column;
    gap: 10px;
  }
  .big {
    font-size: 17px;
  }
  .new {
    display: flex;
    gap: 8px;
  }
  .new input {
    flex: 1;
    min-width: 0;
    min-height: 44px;
    padding: 0 12px;
    border-radius: 8px;
    border: 1px solid var(--line);
    background: rgba(0, 0, 0, 0.35);
    color: var(--ink);
    font: 600 15px ui-monospace, monospace;
    text-transform: uppercase;
  }
  footer {
    text-align: center;
    font-size: 12px;
  }
</style>
