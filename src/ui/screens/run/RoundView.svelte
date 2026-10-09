<script lang="ts">
  import { game } from '../../../stores/game.svelte';
  import { cardById } from '../../../engine/ctx';
  import { isCardDebuffed } from '../../../engine/scoring';
  import { reorderable } from '../../drag';
  import { currentEvent, popupText } from '../../anim';
  import PlayingCard from '../../components/PlayingCard.svelte';
  import type { Card } from '../../../engine/cards';

  const run = $derived(game.view!);
  const anim = $derived(game.anim);
  const ev = $derived(currentEvent(anim));
  const played = $derived<Card[]>(anim ? anim.result.playedIds.map((id) => cardById(anim.prev, id)).filter((c): c is Card => !!c) : []);
  const handIds = $derived(anim ? run.hand.filter((id) => !anim.result.playedIds.includes(id)) : run.hand);
  const hand = $derived(handIds.map((id) => cardById(run, id)).filter((c): c is Card => !!c));
  const round = $derived(run.round);
  const preview = $derived.by(() => {
    const n = game.passives?.previewCount ?? 0;
    return n > 0 ? run.drawPile.slice(0, n).map((id) => cardById(run, id)).filter((c): c is Card => !!c) : [];
  });
  const sel = $derived(game.selected);

  function key(e: KeyboardEvent) {
    if (e.target instanceof HTMLInputElement || e.metaKey || e.ctrlKey || e.altKey) return;
    if (document.querySelector('[role="dialog"]')) return;
    if (game.anim) {
      if (e.key === ' ' || e.key === 'Enter') game.skipReplay();
      return;
    }
    const n = Number(e.key);
    if (n >= 1 && n <= 9 && hand[n - 1]) {
      game.toggleSelect(hand[n - 1].id);
    } else if (e.key === 'Enter' || e.key === 'p') {
      game.play();
    } else if (e.key === 'd' || e.key === 'x') {
      game.discard();
    } else if (e.key === 'r') {
      game.dispatch({ type: 'sortHand', by: 'rank' });
    } else if (e.key === 's') {
      game.dispatch({ type: 'sortHand', by: 'suit' });
    } else if (e.key === 'Escape') {
      game.clearSelection();
    } else return;
    e.preventDefault();
  }

  function moveCard(from: number, to: number) {
    const ids = [...run.hand];
    const [x] = ids.splice(from, 1);
    ids.splice(to, 0, x);
    game.dispatch({ type: 'reorderHand', cardIds: ids });
  }
</script>

<svelte:window onkeydown={key} />

<div class="round">
  <div class="playarea" aria-live="polite">
    {#if anim}
      <div class="played">
        {#each played as c, i (c.id)}
          {@const hit = ev && ev.cardIndex === i}
          <div class:scoring={anim.result.scoring.includes(i)}>
            <PlayingCard
              card={c}
              disabled
              debuffed={isCardDebuffed(anim.prev, c)}
              active={!!hit}
              popup={hit && ev ? popupText(ev) : null}
              popupKind={ev?.kind}
            />
          </div>
        {/each}
      </div>
      <button class="btn small skip" type="button" onclick={() => game.skipReplay()}>Skip ▸▸</button>
    {:else if preview.length}
      <div class="scout">
        <span class="muted">Scouting report — next cards:</span>
        <div class="mini">
          {#each preview as c (c.id)}<PlayingCard card={c} disabled />{/each}
        </div>
      </div>
    {:else}
      <div class="hint muted">Select up to 5 cards. Keys: 1–9 select · Enter play · D discard · R/S sort</div>
    {/if}
  </div>

  <div class="hand" use:reorderable={{ onMove: moveCard, disabled: !!anim }} aria-label="Your hand">
    {#each hand as c, i (c.id)}
      {@const heldHit = ev && ev.heldIndex !== undefined && anim?.result.heldIds[ev.heldIndex] === c.id}
      <div class="hc" data-idx={i}>
        <PlayingCard
          card={c}
          selected={sel.includes(c.id)}
          debuffed={isCardDebuffed(run, c)}
          active={!!heldHit}
          popup={heldHit && ev ? popupText(ev) : null}
          popupKind={ev?.kind}
          onclick={() => game.toggleSelect(c.id)}
        />
      </div>
    {/each}
  </div>
  <div class="deckinfo muted">Deck {run.drawPile.length}/{run.deck.length}</div>

  <div class="controls">
    <button class="btn primary" type="button" disabled={!!anim || sel.length === 0 || !round || round.handsLeft <= 0} onclick={() => game.play()}>
      Play Hand
    </button>
    <div class="sort">
      <span class="muted">Sort</span>
      <button class="btn small" type="button" disabled={!!anim} onclick={() => game.dispatch({ type: 'sortHand', by: 'rank' })}>Rank</button>
      <button class="btn small" type="button" disabled={!!anim} onclick={() => game.dispatch({ type: 'sortHand', by: 'suit' })}>Suit</button>
    </div>
    <button class="btn danger" type="button" disabled={!!anim || sel.length === 0 || !round || round.discardsLeft <= 0} onclick={() => game.discard()}>
      Discard
    </button>
  </div>
</div>

<style>
  .round {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 10px;
  }
  .playarea {
    min-height: calc(var(--card-h) + 70px);
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 8px;
    width: 100%;
  }
  .played {
    display: flex;
    gap: 10px;
    padding-top: 30px;
  }
  .played > div:not(.scoring) {
    opacity: 0.55;
    transform: translateY(10px);
  }
  .skip {
    opacity: 0.8;
  }
  .scout {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 6px;
    font-size: 13px;
  }
  .mini {
    --card-w: 44px;
    --card-h: 62px;
    display: flex;
    gap: 4px;
  }
  .hint {
    font-size: 13px;
    text-align: center;
  }
  .hand {
    display: flex;
    justify-content: center;
    gap: 6px;
    padding: 24px 8px 8px;
    min-height: calc(var(--card-h) + 36px);
    max-width: 100%;
  }
  .hc {
    transition: transform 0.2s var(--ease);
  }
  @media (max-width: 760px) {
    .hand {
      gap: 0;
    }
    .hc {
      margin-right: -8px;
    }
  }
  .deckinfo {
    font-size: 12px;
    align-self: flex-end;
  }
  .controls {
    display: flex;
    gap: 12px;
    align-items: center;
    flex-wrap: wrap;
    justify-content: center;
  }
  .controls > .btn {
    min-width: 130px;
  }
  .sort {
    display: flex;
    align-items: center;
    gap: 4px;
    font-size: 12px;
  }
</style>
