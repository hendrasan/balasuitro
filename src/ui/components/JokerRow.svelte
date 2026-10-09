<script lang="ts">
  import { game } from '../../stores/game.svelte';
  import { activeBonds } from '../../engine/jokers/bonds';
  import { inspect } from '../inspect.svelte';
  import { reorderable } from '../drag';
  import { currentEvent, popupText } from '../anim';
  import JokerCard from './JokerCard.svelte';
  import { flip } from 'svelte/animate';
  import { scale } from 'svelte/transition';
  import { dur } from '../motion';
  import { cubicOut } from 'svelte/easing';

  const run = $derived(game.view!);
  const slots = $derived(game.passives?.jokerSlots ?? 5);
  const bonded = $derived(new Set(activeBonds(run).flatMap((b) => b.members)));
  const ev = $derived(currentEvent(game.anim));
  const debuffedUid = $derived(run.round?.debuffedJokerUid ?? null);
</script>

<section class="row" aria-label="Jokers">
  <div class="head">
    <span class="title display">Army</span>
    <span class="count">{run.jokers.length}/{slots}</span>
  </div>
  <div class="cards" use:reorderable={{ onMove: (from, to) => game.dispatch({ type: 'moveJoker', from, to }), disabled: !!game.anim }}>
    {#each run.jokers as j, i (j.uid)}
      {@const hit = ev && ev.jokerUid === j.uid && ev.cardIndex === undefined && ev.heldIndex === undefined}
      <div
        class="slot"
        data-idx={i}
        animate:flip={{ duration: dur(220), easing: cubicOut }}
        in:scale={{ start: 0.85, duration: dur(240), easing: cubicOut }}
        out:scale={{ start: 0.6, duration: dur(260), easing: cubicOut }}
      >
        <JokerCard
          id={j.id}
          edition={j.edition}
          bonded={bonded.has(j.id)}
          debuffed={j.uid === debuffedUid}
          active={!!hit}
          popup={hit && ev ? popupText(ev) : null}
          popupKind={ev?.kind}
          pulse={hit ? game.anim?.step : null}
          pinned={inspect.pinned?.kind === 'joker' && inspect.pinned.uid === j.uid}
          onclick={() => inspect.pin({ kind: 'joker', uid: j.uid })}
          onhover={(on) => (inspect.hover = on ? { kind: 'joker', uid: j.uid } : null)}
        />
      </div>
    {/each}
    {#each Array(Math.max(0, slots - run.jokers.length)) as _, k (k)}
      <div class="empty" aria-hidden="true"></div>
    {/each}
  </div>
</section>

<style>
  .row {
    min-width: 0;
  }
  .head {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    padding: 0 4px 4px;
    font-size: 12px;
    color: var(--ink-dim);
  }
  .title {
    color: var(--gold);
    font-size: 14px;
  }
  .cards {
    display: flex;
    gap: 8px;
    padding: 10px 8px 16px;
    min-height: calc(var(--joker-h) + 26px);
    background: rgba(0, 0, 0, 0.25);
    border: 1px solid var(--line);
    border-radius: var(--radius);
    flex-wrap: wrap;
  }
  .slot {
    position: relative;
    transition: transform 0.2s var(--ease);
  }
  .empty {
    width: var(--joker-w);
    height: var(--joker-h);
    border: 1px dashed rgba(212, 166, 74, 0.2);
    border-radius: 9px;
  }
  @media (max-width: 760px) {
    .cards {
      gap: 5px;
      padding: 8px 6px 14px;
    }
    .empty {
      display: none;
    }
  }
</style>
