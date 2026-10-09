<script lang="ts">
  import { game } from '../../stores/game.svelte';
  import { TAG_LIST } from '../../engine/data';
  import { tagCounts } from '../../engine/jokers/tags';

  interface Props {
    onopen?: () => void;
  }
  let { onopen }: Props = $props();

  const counts = $derived(tagCounts(game.view!));
  const shown = $derived(
    TAG_LIST.filter((t) => (counts[t.id] ?? 0) > 0).map((t) => {
      const n = counts[t.id] ?? 0;
      const active = t.tiers.filter((x) => n >= x.count);
      const nextTier = t.tiers.find((x) => n < x.count);
      return { t, n, active, nextTier };
    }),
  );
</script>

<button type="button" class="bar" onclick={() => onopen?.()} aria-label="Army tags. Open details">
  {#if shown.length === 0}
    <span class="muted">No tags yet. Recruit Jokers that share a tag for set bonuses.</span>
  {/if}
  {#each shown as s (s.t.id)}
    <span class="tag" class:on={s.active.length > 0} title={s.t.tiers.map((x) => `${x.count}: ${x.text}`).join('\n')}>
      <span class="name">{s.t.name}</span>
      <span class="pips">
        {#each s.t.tiers as tier (tier.count)}
          <i class:lit={s.n >= tier.count}>{tier.count}</i>
        {/each}
      </span>
      <span class="n">{s.n}{s.nextTier ? `/${s.nextTier.count}` : ''}</span>
    </span>
  {/each}
</button>

<style>
  .bar {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    width: 100%;
    background: none;
    border: none;
    padding: 2px 0;
    cursor: pointer;
    text-align: left;
    font-size: 12px;
  }
  .tag {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    padding: 3px 8px;
    border-radius: 999px;
    border: 1px solid rgba(255, 255, 255, 0.12);
    background: rgba(255, 255, 255, 0.04);
    color: var(--ink-dim);
  }
  .tag.on {
    border-color: var(--gold);
    color: var(--ink);
    background: rgba(212, 166, 74, 0.14);
  }
  .name {
    font-weight: 700;
  }
  .pips {
    display: inline-flex;
    gap: 2px;
  }
  .pips i {
    font-style: normal;
    font-size: 10px;
    width: 15px;
    height: 15px;
    display: grid;
    place-items: center;
    border-radius: 50%;
    border: 1px solid rgba(255, 255, 255, 0.2);
  }
  .pips i.lit {
    background: var(--gold);
    color: #1a1206;
    border-color: var(--gold);
  }
  .n {
    color: var(--ink-faint);
  }
</style>
