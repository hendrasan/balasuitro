<script lang="ts">
  import { game } from '../../stores/game.svelte';
  import { BOND_LIST, CHAPTER_NAMES, JOKER_LIST, JOKERS, TAG_LIST } from '../../engine/data';
  import { inspect } from '../inspect.svelte';
  import JokerCard from '../components/JokerCard.svelte';
  import InspectPanel from '../components/InspectPanel.svelte';

  let tag = $state('all');
  let rarity = $state('all');
  let chapter = $state('all');
  let view = $state<'jokers' | 'tags' | 'bonds'>('jokers');

  const owned = $derived(new Set(game.profile.collection.owned));
  const seen = $derived(new Set(game.profile.collection.seen));
  const unlocked = $derived(new Set(game.profile.unlocks));
  const list = $derived(
    JOKER_LIST.filter(
      (j) =>
        (tag === 'all' || (tag === 'none' ? j.tags.length === 0 : j.tags.includes(tag))) &&
        (rarity === 'all' || j.rarity === rarity) &&
        (chapter === 'all' || String(j.chapter) === chapter),
    ),
  );
  const known = (id: string) => seen.has(id) || owned.has(id);
  const status = (id: string) => (owned.has(id) ? 'Recruited' : seen.has(id) ? 'Seen' : 'Undiscovered');
</script>

<div class="col">
  <header>
    <button class="btn small" type="button" onclick={() => { inspect.close(); game.screen = 'menu'; }}>◀ Back</button>
    <h1 class="display">Collection</h1>
    <span class="muted">{owned.size} recruited · {seen.size} seen · {JOKER_LIST.length} total</span>
  </header>

  <div class="tabs" role="tablist">
    {#each ['jokers', 'tags', 'bonds'] as const as v (v)}
      <button class="btn small" class:on={view === v} role="tab" aria-selected={view === v} type="button" onclick={() => (view = v)}>
        {v === 'jokers' ? 'Stars' : v === 'tags' ? 'Tags' : 'Bonds'}
      </button>
    {/each}
  </div>

  {#if view === 'jokers'}
    <div class="filters">
      <label>Tag
        <select bind:value={tag}>
          <option value="all">All</option>
          {#each TAG_LIST as t (t.id)}<option value={t.id}>{t.name}</option>{/each}
          <option value="none">No tag</option>
        </select>
      </label>
      <label>Rarity
        <select bind:value={rarity}>
          <option value="all">All</option>
          <option value="C">Common</option><option value="U">Uncommon</option><option value="R">Rare</option><option value="L">Legendary</option>
        </select>
      </label>
      <label>Chapter
        <select bind:value={chapter}>
          <option value="all">All</option>
          {#each CHAPTER_NAMES as n, i (i)}<option value={String(i)}>{n}</option>{/each}
        </select>
      </label>
    </div>
    <div class="grid">
      {#each list as j (j.id)}
        <div class="entry" class:owned={owned.has(j.id)}>
          <span class="num">#{j.num}</span>
          <JokerCard
            id={j.id}
            silhouette={!known(j.id)}
            badge={j.locked && !unlocked.has(j.id) ? '🔒' : null}
            onclick={() => known(j.id) && inspect.pin({ kind: 'jokerData', id: j.id, edition: 'none', where: 'collection' })}
            onhover={(on) => known(j.id) && (inspect.hover = on ? { kind: 'jokerData', id: j.id, edition: 'none', where: 'collection' } : null)}
          />
          <span class="st">{status(j.id)}</span>
        </div>
      {/each}
    </div>
  {:else if view === 'tags'}
    <div class="cards">
      {#each TAG_LIST as t (t.id)}
        {@const members = JOKER_LIST.filter((j) => j.tags.includes(t.id))}
        <div class="panel box">
          <h3 class="display">{t.name}</h3>
          {#each t.tiers as tier (tier.count)}<div class="tier"><b>{tier.count}</b> {tier.text}</div>{/each}
          <div class="members">
            {#each members as m (m.id)}<span class:own={owned.has(m.id)}>{known(m.id) ? m.name : '???'}</span>{/each}
          </div>
        </div>
      {/each}
    </div>
  {:else}
    <div class="cards">
      {#each BOND_LIST as b (b.id)}
        {@const disc = b.members.every(known)}
        <div class="panel box" class:dim={!disc}>
          <h3 class="display">{disc ? b.name : '??? Bond'}</h3>
          <div class="members">
            {#each b.members as m (m)}<span class:own={owned.has(m)}>{known(m) ? JOKERS[m].name : '???'}</span>{/each}
          </div>
          <div class="tier">{disc ? b.text : 'Discover every member to reveal this Bond.'}</div>
        </div>
      {/each}
    </div>
  {/if}
</div>
<InspectPanel />

<style>
  .col {
    max-width: 1200px;
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
  }
  .tabs {
    display: flex;
    gap: 6px;
    margin: 12px 0;
  }
  .tabs .on {
    border-color: var(--gold);
    color: var(--gold);
  }
  .filters {
    display: flex;
    flex-wrap: wrap;
    gap: 12px;
    margin-bottom: 12px;
    font-size: 13px;
  }
  .filters label {
    display: flex;
    flex-direction: column;
    gap: 3px;
    color: var(--ink-dim);
  }
  select {
    min-height: 38px;
    background: var(--bg-2);
    color: var(--ink);
    border: 1px solid var(--line);
    border-radius: 6px;
    padding: 0 8px;
  }
  .grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(calc(var(--joker-w) + 16px), 1fr));
    gap: 12px;
  }
  .entry {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 4px;
    font-size: 11px;
  }
  .num {
    color: var(--ink-faint);
  }
  .st {
    color: var(--ink-faint);
  }
  .owned .st {
    color: var(--gold);
  }
  .cards {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
    gap: 10px;
  }
  .box {
    padding: 12px;
  }
  .box.dim {
    opacity: 0.6;
  }
  .box h3 {
    margin: 0 0 6px;
    color: var(--gold);
    font-size: 16px;
  }
  .tier {
    font-size: 13px;
    margin: 2px 0;
  }
  .members {
    display: flex;
    flex-wrap: wrap;
    gap: 4px 10px;
    font-size: 12px;
    color: var(--ink-faint);
    margin: 6px 0;
  }
  .members .own {
    color: var(--ink);
    font-weight: 700;
  }
</style>
