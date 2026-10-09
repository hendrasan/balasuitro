<script lang="ts">
  import { game } from '../../stores/game.svelte';
  import { SUITS, SUIT_NAMES } from '../../engine/cards';
  import PlayingCard from './PlayingCard.svelte';

  const run = $derived(game.view!);
  const inRound = $derived(run.phase === 'round');
  const remaining = $derived(new Set(run.drawPile));
  const bySuit = $derived(
    SUITS.map((s) => ({
      s,
      cards: run.deck.filter((c) => c.suit === s && c.enh !== 'stone').sort((a, b) => b.rank - a.rank),
    })),
  );
  const stones = $derived(run.deck.filter((c) => c.enh === 'stone'));
</script>

<p class="muted">
  {run.deck.length} cards in deck.{#if inRound} {run.drawPile.length} left to draw (faded cards are already drawn or played).{/if}
</p>
{#each bySuit as g (g.s)}
  <h4>{SUIT_NAMES[g.s]} ({g.cards.length})</h4>
  <div class="row">
    {#each g.cards as c (c.id)}
      <div class="mini" class:used={inRound && !remaining.has(c.id)}><PlayingCard card={c} disabled /></div>
    {/each}
  </div>
{/each}
{#if stones.length}
  <h4>Stone ({stones.length})</h4>
  <div class="row">
    {#each stones as c (c.id)}
      <div class="mini" class:used={inRound && !remaining.has(c.id)}><PlayingCard card={c} disabled /></div>
    {/each}
  </div>
{/if}

<style>
  h4 {
    margin: 10px 0 4px;
    color: var(--gold-dim);
    font-size: 13px;
  }
  .row {
    display: flex;
    flex-wrap: wrap;
    gap: 2px;
  }
  .mini {
    --card-w: 40px;
    --card-h: 56px;
    margin-right: -6px;
  }
  .mini.used {
    opacity: 0.3;
  }
</style>
