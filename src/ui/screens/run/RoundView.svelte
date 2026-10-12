<script lang="ts">
  import { game } from '../../../stores/game.svelte';
  import { cardById } from '../../../engine/ctx';
  import { isCardDebuffed } from '../../../engine/scoring';
  import { reorderable } from '../../drag';
  import { currentEvent, popupText } from '../../anim';
  import PlayingCard from '../../components/PlayingCard.svelte';
  import type { Card } from '../../../engine/cards';
  import { flip } from 'svelte/animate';
  import { fly } from 'svelte/transition';
  import { cubicOut } from 'svelte/easing';
  import { dur, scoreDur } from '../../motion';

  /** Fan the hand into a gentle arc. */
  function fan(i: number, n: number): string {
    const mid = (n - 1) / 2;
    // Position across the hand: -1 (left end) .. 1 (right end). The curve uses it as a whole,
    // so the arc stays smooth for any hand size.
    const t = mid > 0 ? (i - mid) / mid : 0;
    const spread = Math.min(14, 2.2 * mid); // tilt of the end cards, in degrees
    const drop = Math.min(20, 1.4 * mid * mid); // how far the end cards sit lower, in px
    return `--fan-r:${(t * spread).toFixed(2)}deg;--fan-y:${(t * t * drop).toFixed(1)}px`;
  }

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

  // A soft flick for each new card in hand, timed with the deal animation.
  let known = new Set<number>();
  $effect(() => {
    const fresh = handIds.filter((id) => !known.has(id));
    known = new Set(handIds);
    fresh.slice(0, 10).forEach((_, i) => setTimeout(() => game.sound('draw'), dur(i * 35)));
  });

  function key(e: KeyboardEvent) {
    if (e.target instanceof HTMLInputElement || e.metaKey || e.ctrlKey || e.altKey) return;
    if (document.querySelector('[role="dialog"]')) return;
    if (game.anim) {
      if (e.key === ' ' || e.key === 'Enter') game.skipReplay();
      return;
    }
    // 1-9 select cards 1-9; 0 selects card 10.
    const n = e.key === '0' ? 10 : Number(e.key);
    if (n >= 1 && n <= 10 && hand[n - 1]) {
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
          <div class:scoring={anim.result.scoring.includes(i)} in:fly|global={{ y: 80, duration: scoreDur(240), delay: i * scoreDur(45), easing: cubicOut }}>
            <PlayingCard
              card={c}
              disabled
              debuffed={isCardDebuffed(anim.prev, c)}
              active={!!hit}
              popup={hit && ev ? popupText(ev) : null}
              popupKind={ev?.kind}
              pulse={hit ? anim.step : null}
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
      <div class="hint muted">Select up to 5 cards. Keys: 1–9, 0 select · Enter play · D discard · R/S sort</div>
    {/if}
  </div>

  <div class="handrow">
  <div class="hand" use:reorderable={{ onMove: moveCard, disabled: !!anim }} aria-label="Your hand">
    {#each hand as c, i (c.id)}
      {@const heldHit = ev && ev.heldIndex !== undefined && anim?.result.heldIds[ev.heldIndex] === c.id}
      <div
        class="hc"
        data-idx={i}
        style={fan(i, hand.length)}
        animate:flip={{ duration: dur(200), easing: cubicOut }}
        in:fly|global={{ x: 260, y: -30, duration: dur(260), delay: dur(i * 35), easing: cubicOut }}
      >
        <PlayingCard
          card={c}
          selected={sel.includes(c.id)}
          debuffed={isCardDebuffed(run, c)}
          active={!!heldHit}
          popup={heldHit && ev ? popupText(ev) : null}
          popupKind={ev?.kind}
          pulse={heldHit ? anim?.step : null}
          onclick={() => game.toggleSelect(c.id)}
        />
      </div>
    {/each}
  </div>
  <div class="deck" title="Cards left to draw" aria-label="Deck: {run.drawPile.length} of {run.deck.length} cards left">
    {#each [0, 1, 2] as k (k)}
      {#if run.drawPile.length > k * 8}<span class="back" style="--k:{k}"></span>{/if}
    {/each}
    <span class="count">{run.drawPile.length}/{run.deck.length}</span>
  </div>
  </div>

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
  /* Each card sits in a slot that may shrink when space runs out; the card keeps its size,
     so big hands overlap (like Balatro) instead of growing into the deck pile. */
  .hand {
    display: flex;
    justify-content: center;
    width: 100%;
    min-width: 0;
    padding: 28px calc(var(--card-w) + 30px) 22px;
    min-height: calc(var(--card-h) + 36px);
  }
  .handrow {
    position: relative;
    width: 100%;
    display: flex;
    justify-content: center;
  }
  .hc {
    flex: 0 1 calc(var(--card-w) + 6px);
    min-width: 0;
    transform: translateY(var(--fan-y, 0)) rotate(var(--fan-r, 0deg));
    transform-origin: 50% 120%;
    transition: transform 200ms var(--ease);
  }
  .hc:last-child {
    flex: none;
  }
  .deck {
    position: absolute;
    right: 4px;
    bottom: 8px;
    width: calc(var(--card-w) * 0.8);
    height: calc(var(--card-h) * 0.8);
  }
  .back {
    position: absolute;
    inset: 0;
    border-radius: 6px;
    transform: translate(calc(var(--k) * -3px), calc(var(--k) * -3px));
    border: 1px solid #c9a24a;
    background:
      radial-gradient(circle at 50% 50%, transparent 30%, rgba(227, 184, 92, 0.55) 31%, rgba(227, 184, 92, 0.55) 33%, transparent 34%),
      radial-gradient(circle at 50% 50%, rgba(227, 184, 92, 0.35) 0 12%, transparent 13%),
      repeating-linear-gradient(45deg, rgba(255, 255, 255, 0.05) 0 3px, transparent 3px 7px),
      linear-gradient(160deg, #3a1d2a, #1b0e18);
    box-shadow: 0 2px 6px rgba(0, 0, 0, 0.5), inset 0 0 0 3px rgba(0, 0, 0, 0.35);
  }
  .count {
    position: absolute;
    left: 50%;
    bottom: -18px;
    transform: translateX(-50%);
    font-size: 11px;
    color: var(--ink-dim);
    white-space: nowrap;
  }
  @media (max-width: 760px) {
    .deck {
      display: none;
    }
  }
  @media (max-width: 760px) {
    .hand {
      padding: 28px 16px 18px;
    }
    .hint {
      display: none;
    }
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
