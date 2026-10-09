<script lang="ts">
  import { game } from '../../stores/game.svelte';
  import { JOKER_LIST, TAG_LIST } from '../../engine/data';
  import { tagCounts } from '../../engine/jokers/tags';

  const counts = $derived(game.view ? tagCounts(game.view) : {});
  const ownedIds = $derived(new Set(game.view?.jokers.map((j) => j.id) ?? []));
  const known = $derived(new Set(game.profile.collection.seen));
</script>

<p class="muted">Set bonuses apply while you own at least N Jokers with the tag. Tiers stack unless a tier says it replaces another.</p>
{#each TAG_LIST as t (t.id)}
  {@const n = counts[t.id] ?? 0}
  <div class="tag" class:on={n >= t.tiers[0].count}>
    <div class="top"><b>{t.name}</b> <span class="muted">{n} in army</span></div>
    {#each t.tiers as tier (tier.count)}
      <div class="tier" class:lit={n >= tier.count}><span>{tier.count}</span> {tier.text}</div>
    {/each}
    <div class="members">
      {#each JOKER_LIST.filter((j) => j.tags.includes(t.id)) as j (j.id)}
        <span class:own={ownedIds.has(j.id)}>{known.has(j.id) ? j.name : '???'}</span>
      {/each}
    </div>
  </div>
{/each}

<style>
  .tag {
    padding: 8px 10px;
    border-radius: 8px;
    border: 1px solid rgba(255, 255, 255, 0.08);
    margin-bottom: 8px;
    font-size: 14px;
  }
  .tag.on {
    border-color: var(--gold);
  }
  .top {
    display: flex;
    justify-content: space-between;
  }
  .tier {
    color: var(--ink-faint);
    font-size: 13px;
  }
  .tier span {
    display: inline-block;
    width: 18px;
    text-align: center;
    border-radius: 50%;
    border: 1px solid currentColor;
    font-size: 11px;
    margin-right: 4px;
  }
  .tier.lit {
    color: var(--gold);
  }
  .members {
    display: flex;
    flex-wrap: wrap;
    gap: 4px 10px;
    font-size: 12px;
    color: var(--ink-faint);
    margin-top: 4px;
  }
  .members .own {
    color: var(--ink);
    font-weight: 700;
  }
</style>
