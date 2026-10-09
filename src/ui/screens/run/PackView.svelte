<script lang="ts">
  import { game } from '../../../stores/game.svelte';
  import { CONSUMABLES } from '../../../engine/consumables';
  import { JOKERS } from '../../../engine/data';
  import { cardById } from '../../../engine/ctx';
  import { PACK_NAMES } from '../../../engine/shop';
  import { inspect } from '../../inspect.svelte';
  import { richText } from '../../format';
  import JokerCard from '../../components/JokerCard.svelte';
  import ConsumableCard from '../../components/ConsumableCard.svelte';
  import PlayingCard from '../../components/PlayingCard.svelte';
  import type { Card } from '../../../engine/cards';

  const run = $derived(game.view!);
  const pack = $derived(run.pack!);
  const hand = $derived(pack.hand.map((id) => cardById(run, id)).filter((c): c is Card => !!c));

  function pick(i: number) {
    if (game.dispatch({ type: 'packPick', index: i, cardIds: game.selected })) {
      game.clearSelection();
      inspect.close();
    }
  }
</script>

<div class="pack">
  <div class="top">
    <h2 class="display">{PACK_NAMES[pack.type]}</h2>
    <span class="muted">Choose {pack.picksLeft} more</span>
    <button class="btn" type="button" onclick={() => game.dispatch({ type: 'packSkip' })}>Skip</button>
  </div>

  <div class="choices">
    {#each pack.choices as ch, i (i)}
      <div class="choice" class:gone={!ch}>
        {#if ch}
          {#if ch.kind === 'joker'}
            <JokerCard
              id={ch.joker.id}
              edition={ch.joker.edition}
              onclick={() => inspect.pin({ kind: 'jokerData', id: ch.joker.id, edition: ch.joker.edition, where: 'pack' })}
              onhover={(on) => (inspect.hover = on ? { kind: 'jokerData', id: ch.joker.id, edition: ch.joker.edition, where: 'pack' } : null)}
            />
            <div class="desc">{@html richText(JOKERS[ch.joker.id].text)}</div>
          {:else if ch.kind === 'cons'}
            {@const d = CONSUMABLES[ch.cons.id]}
            <ConsumableCard id={ch.cons.id} />
            <div class="desc">{@html richText(d.text)}</div>
          {:else}
            <PlayingCard card={ch.card} disabled />
          {/if}
          <button class="btn small gold" type="button" onclick={() => pick(i)}>
            {ch.kind === 'cons' ? 'Use' : 'Take'}
          </button>
        {/if}
      </div>
    {/each}
  </div>

  {#if hand.length}
    <p class="muted center">Select target cards for a Rune, then press Use.</p>
    <div class="hand">
      {#each hand as c (c.id)}
        <PlayingCard card={c} selected={game.selected.includes(c.id)} onclick={() => game.toggleSelect(c.id)} />
      {/each}
    </div>
  {/if}
</div>

<style>
  .pack {
    display: flex;
    flex-direction: column;
    gap: 14px;
  }
  .top {
    display: flex;
    align-items: center;
    gap: 12px;
    justify-content: space-between;
    flex-wrap: wrap;
  }
  h2 {
    margin: 0;
    color: var(--gold);
  }
  .choices {
    display: flex;
    flex-wrap: wrap;
    gap: 12px;
    justify-content: center;
  }
  .choice {
    width: 150px;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 6px;
    padding: 10px;
    background: rgba(0, 0, 0, 0.25);
    border: 1px solid var(--line);
    border-radius: var(--radius);
  }
  .choice.gone {
    opacity: 0.25;
  }
  .desc {
    font-size: 12px;
    text-align: center;
  }
  .center {
    text-align: center;
    margin: 0;
  }
  .hand {
    display: flex;
    justify-content: center;
    flex-wrap: wrap;
    gap: 6px;
    padding-top: 20px;
  }
</style>
