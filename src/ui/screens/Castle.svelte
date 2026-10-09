<script lang="ts">
  import { game } from '../../stores/game.svelte';
  import { FACILITY_LIST, facilityLevel, facilityStatus, favoriteHands, nextLevel } from '../../engine/castle';
  import { HAND_INFO } from '../../engine/hands';
  import { JOKERS } from '../../engine/data';
  import { portraitUrl } from '../portraits';
  import { richText } from '../format';

  const castle = $derived(game.profile.castle);
  const owned = $derived(game.profile.collection.owned);
  const builtCount = $derived(Object.keys(castle.levels).length);
  const fav = $derived(favoriteHands(game.profile.stats.handPlays).slice(0, 2).map((h) => HAND_INFO[h].name));
</script>

<div class="castle">
  <header>
    <button class="btn small" type="button" onclick={() => (game.screen = 'menu')}>◀ Back</button>
    <h1 class="display">Castle</h1>
    <div class="renown" aria-label="Renown {castle.renown}">
      <span class="star" aria-hidden="true">✦</span>
      <b>{castle.renown}</b>
      <span class="muted">Renown</span>
    </div>
  </header>

  <p class="intro muted">
    Recruit a Star to open their facility, then build it with Renown. Renown comes from every run: 1 per battle won,
    +2 per Boss, +5 for winning the war (Annallee's Stage adds more). Built facilities help in every run. ({builtCount}/{FACILITY_LIST.length} built)
  </p>

  <div class="grid">
    {#each FACILITY_LIST as f, i (f.id)}
      {@const st = facilityStatus(castle, owned, f.id)}
      {@const lvl = facilityLevel(castle, f.id)}
      {@const nxt = nextLevel(castle, f.id)}
      {@const cur = lvl > 0 ? f.levels[lvl - 1] : null}
      {@const who = JOKERS[f.character]}
      {@const img = portraitUrl(f.character)}
      <article class="panel fac s-{st}" style="--i:{i}">
        <div class="art" class:dim={st === 'locked'}>
          {#if img}<img src={img} alt="" />{/if}
          {#if lvl > 0}{#key lvl}<span class="seal" aria-hidden="true">{lvl}</span>{/key}{/if}
        </div>
        <div class="body">
          <div class="title">
            <h2 class="display">{f.name}</h2>
            <span class="pips" aria-label="Level {lvl} of {f.levels.length}">
              {#each f.levels as _, k (k)}<i class:on={k < lvl}></i>{/each}
            </span>
          </div>
          {#if cur}
            <p class="text"><span class="tagline">Now</span> {@html richText(cur.text)}</p>
          {/if}
          {#if nxt}
            <p class="text next" class:first={!cur}>
              {#if cur}<span class="tagline">Level {lvl + 1}</span>{/if} {@html richText(nxt.text)}
            </p>
          {/if}
          {#if f.id === 'forge'}
            <p class="muted small">Your most played hands: {fav.join(', ')}</p>
          {/if}
          <div class="foot">
            {#if st === 'max'}
              <span class="built">Fully built · active in every run</span>
            {:else if st === 'locked'}
              <span class="lock">🔒 Recruit {who?.name ?? f.character} to unlock</span>
            {:else if nxt}
              <button class="btn gold small" type="button" disabled={st === 'poor'} onclick={() => game.build(f.id)}>
                {lvl === 0 ? 'Build' : `Upgrade to level ${lvl + 1}`} · {nxt.cost} Renown
              </button>
              {#if st === 'poor'}<span class="muted small">Need {nxt.cost - castle.renown} more</span>{/if}
            {/if}
          </div>
        </div>
      </article>
    {/each}
  </div>
</div>

<style>
  .castle {
    max-width: 960px;
    margin: 0 auto;
    padding: 16px;
  }
  header {
    display: flex;
    align-items: center;
    gap: 14px;
    flex-wrap: wrap;
  }
  h1 {
    margin: 0;
    color: var(--gold);
    flex: 1;
  }
  .renown {
    display: flex;
    align-items: baseline;
    gap: 6px;
    padding: 6px 14px;
    border-radius: 999px;
    border: 1px solid var(--gold);
    background: rgba(212, 166, 74, 0.12);
  }
  .renown b {
    font: 700 22px var(--font-display);
    color: var(--gold);
  }
  .star {
    color: var(--gold);
  }
  .intro {
    font-size: 14px;
    max-width: 70ch;
  }
  .grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(min(100%, 420px), 1fr));
    gap: 14px;
  }
  .fac {
    display: grid;
    grid-template-columns: 120px 1fr;
    gap: 14px;
    padding: 14px;
    animation: rise 360ms var(--ease) both;
    animation-delay: calc(var(--i) * 70ms);
    transition: border-color 300ms ease, box-shadow 300ms ease;
  }
  @keyframes rise {
    from { transform: translateY(16px); opacity: 0; }
  }
  .fac.s-max {
    border-color: var(--gold);
    box-shadow: var(--shadow), 0 0 22px rgba(227, 184, 92, 0.25);
  }
  .fac.s-locked {
    opacity: 0.75;
  }
  .art {
    position: relative;
    width: 120px;
    height: 136px;
    border-radius: 8px;
    overflow: hidden;
    border: 1px solid var(--line);
    background: radial-gradient(circle at 50% 35%, #3a3150, #120f1e);
  }
  .art img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    object-position: 50% 20%;
    transition: filter 400ms ease;
  }
  .art.dim img {
    filter: grayscale(1) brightness(0.45);
  }
  .seal {
    position: absolute;
    right: 6px;
    bottom: 6px;
    width: 28px;
    height: 28px;
    display: grid;
    place-items: center;
    border-radius: 50%;
    background: radial-gradient(circle at 35% 35%, #fff3cf, #c99a3f 60%, #7e5a1d);
    color: #3a2508;
    font: 700 14px var(--font-display);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.6);
    animation: stamp 420ms var(--ease) both;
  }
  .title {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 8px;
  }
  .pips {
    display: inline-flex;
    gap: 4px;
    flex: none;
  }
  .pips i {
    width: 10px;
    height: 10px;
    transform: rotate(45deg);
    border: 1px solid var(--gold-dim);
    transition: background-color 300ms ease;
  }
  .pips i.on {
    background: var(--gold);
    border-color: var(--gold);
    box-shadow: 0 0 6px rgba(227, 184, 92, 0.7);
  }
  .tagline {
    font-size: 10px;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    color: var(--gold-dim);
    margin-right: 4px;
  }
  .text.next:not(.first) {
    color: var(--ink-dim);
  }
  @keyframes stamp {
    from { transform: scale(1.6) rotate(-20deg); opacity: 0; }
  }
  .body {
    display: flex;
    flex-direction: column;
    gap: 6px;
    min-width: 0;
  }
  h2 {
    margin: 0;
    font-size: 18px;
    color: var(--parch);
  }
  .text {
    margin: 0;
    font-size: 14px;
    flex: 1;
  }
  .foot {
    display: flex;
    align-items: center;
    gap: 10px;
    flex-wrap: wrap;
  }
  .built {
    color: var(--gold);
    font-weight: 700;
    font-size: 13px;
  }
  .lock {
    color: var(--ink-dim);
    font-size: 13px;
  }
  .small {
    font-size: 12px;
  }
  @media (max-width: 480px) {
    .fac {
      grid-template-columns: 88px 1fr;
    }
    .art {
      width: 88px;
      height: 104px;
    }
  }
</style>
