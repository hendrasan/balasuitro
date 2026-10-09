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
  <div class="sky" aria-hidden="true"><i class="l1"></i><i class="l2"></i></div>
  <header>
    <div class="rune" aria-hidden="true"></div>
    <div class="stars" aria-hidden="true">✦ ✧ ✦</div>
    <h1 class="display">
      {#each 'Stars of Destiny'.split(' ') as w, i (i)}<span style="--i:{i}">{w}</span>{' '}{/each}
    </h1>
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
    <button class="btn" type="button" onclick={() => (game.screen = 'castle')}>
      Castle <span class="muted">({p.castle.renown} Renown · {Object.keys(p.castle.levels).length} built)</span>
    </button>
    <button class="btn" type="button" onclick={() => (game.screen = 'settings')}>Settings</button>
  </nav>

  <footer class="muted">
    Runs {p.stats.runs} · Wins {p.stats.wins} · Best chapter {p.stats.bestAnte}
    <br />Non-commercial fan project. Suikoden is a trademark of Konami. Inspired by Balatro.
  </footer>
</div>

<style>
  .menu {
    position: relative;
    overflow: hidden;
    min-height: 100vh;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 24px;
    padding: 24px 16px;
  }
  header {
    position: relative;
    text-align: center;
  }
  /* Two layers of stars drifting very slowly (menu only). */
  .sky {
    position: absolute;
    inset: 0;
    pointer-events: none;
    z-index: -1;
  }
  .sky i {
    position: absolute;
    inset: -50% 0 0 0;
    background-repeat: repeat;
  }
  .sky .l1 {
    background-image:
      radial-gradient(1.5px 1.5px at 20px 30px, #fff 50%, transparent 51%),
      radial-gradient(1px 1px at 140px 90px, #f3d79a 50%, transparent 51%),
      radial-gradient(1px 1px at 230px 180px, #fff 50%, transparent 51%),
      radial-gradient(2px 2px at 80px 220px, #fff9 50%, transparent 51%);
    background-size: 260px 260px;
    opacity: 0.6;
    animation: drift 90s linear infinite;
  }
  .sky .l2 {
    background-image:
      radial-gradient(1px 1px at 60px 40px, #fff 50%, transparent 51%),
      radial-gradient(1px 1px at 300px 160px, #f3d79a 50%, transparent 51%),
      radial-gradient(1.5px 1.5px at 180px 320px, #fff 50%, transparent 51%);
    background-size: 380px 380px;
    opacity: 0.4;
    animation: drift 150s linear infinite;
  }
  @keyframes drift {
    to { transform: translateY(33%); }
  }
  .rune {
    position: absolute;
    left: 50%;
    top: 50%;
    width: 420px;
    height: 420px;
    margin: -210px 0 0 -210px;
    z-index: -1;
    pointer-events: none;
    opacity: 0.16;
    border-radius: 50%;
    background:
      radial-gradient(circle, transparent 58%, #e3b85c 58.5% 59.3%, transparent 59.8% 66%, #e3b85c 66.5% 67%, transparent 67.5%),
      repeating-conic-gradient(from 0deg, #e3b85c 0 1.5deg, transparent 1.5deg 15deg);
    -webkit-mask: radial-gradient(circle, transparent 57%, #000 57.5% 67.5%, transparent 68%);
    mask: radial-gradient(circle, transparent 57%, #000 57.5% 67.5%, transparent 68%);
    animation: turn 120s linear infinite;
  }
  @keyframes turn {
    to { transform: rotate(360deg); }
  }
  h1 span {
    display: inline-block;
    animation: title 700ms var(--ease) both;
    animation-delay: calc(120ms + var(--i) * 90ms);
  }
  @keyframes title {
    from { transform: translateY(18px); opacity: 0; filter: blur(4px); }
  }
  nav {
    animation: title 600ms var(--ease) 420ms both;
  }
  .stars {
    color: var(--gold);
    letter-spacing: 0.6em;
    font-size: 18px;
  }
  h1 {
    margin: 4px 0;
    font-size: clamp(36px, 8vw, 64px);
    filter: drop-shadow(0 4px 24px rgba(217, 166, 64, 0.25));
  }
  h1 span {
    background: linear-gradient(180deg, #fff3cf, #d9a640 60%, #8a5d18);
    -webkit-background-clip: text;
    background-clip: text;
    color: transparent;
  }
  .sub {
    margin: 0;
    color: var(--ink-dim);
    letter-spacing: 0.15em;
    text-transform: uppercase;
    font-size: 12px;
  }
  nav.panel {
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
