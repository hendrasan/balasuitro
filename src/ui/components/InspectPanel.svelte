<script lang="ts">
  import { game } from '../../stores/game.svelte';
  import { inspect } from '../inspect.svelte';
  import { BOND_LIST, CHAPTER_NAMES, JOKERS, TAGS } from '../../engine/data';
  import { CONSUMABLES } from '../../engine/consumables';
  import { EDITION_TEXT } from '../../engine/cards';
  import { activeBonds } from '../../engine/jokers/bonds';
  import { tagCounts } from '../../engine/jokers/tags';
  import { jokerStatus } from '../../engine/jokers/status';
  import { sellValue } from '../../engine/ctx';
  import { consSellValue } from '../../engine/shop';
  import { richText } from '../format';

  const RARITY: Record<string, string> = { C: 'Common', U: 'Uncommon', R: 'Rare', L: 'Legendary' };

  const run = $derived(game.view);
  const t = $derived(inspect.current);

  const owned = $derived(t?.kind === 'joker' && run ? (run.jokers.find((j) => j.uid === t.uid) ?? null) : null);
  const ownedIndex = $derived(owned && run ? run.jokers.indexOf(owned) : -1);
  const jokerId = $derived(owned ? owned.id : t?.kind === 'jokerData' ? t.id : null);
  const edition = $derived(owned ? owned.edition : t?.kind === 'jokerData' ? t.edition : 'none');
  const jd = $derived(jokerId ? JOKERS[jokerId] : null);

  const cons = $derived(t?.kind === 'cons' && run ? (run.consumables.find((c) => c.uid === t.uid) ?? null) : null);
  const consId = $derived(cons ? cons.id : t?.kind === 'consData' ? t.id : null);
  const cd = $derived(consId ? CONSUMABLES[consId] : null);

  const counts = $derived(run ? tagCounts(run) : {});
  const active = $derived(new Set(run ? activeBonds(run).map((b) => b.id) : []));
  const bonds = $derived(jokerId ? BOND_LIST.filter((b) => b.members.includes(jokerId)) : []);
  const present = (id: string) => !!run?.jokers.some((j) => j.id === id);
  const status = $derived(owned && run ? jokerStatus(run, owned) : null);
  const busy = $derived(!!game.anim);
  const inHandPhase = $derived(run?.phase === 'round' || run?.phase === 'pack');

  function use() {
    if (!cons) return;
    if (game.dispatch({ type: 'useConsumable', uid: cons.uid, cardIds: game.selected })) {
      game.clearSelection();
      inspect.close();
    }
  }
  function sellJoker() {
    if (owned && game.dispatch({ type: 'sellJoker', uid: owned.uid })) inspect.close();
  }
  function sellCons() {
    if (cons && game.dispatch({ type: 'sellConsumable', uid: cons.uid })) inspect.close();
  }
  function move(d: number) {
    if (!owned || !run) return;
    const to = ownedIndex + d;
    if (to >= 0 && to < run.jokers.length) game.dispatch({ type: 'moveJoker', from: ownedIndex, to });
  }
</script>

{#if (jd || cd) && t}
  <aside class="panel inspect" aria-live="polite">
    {#if inspect.pinned}
      <button class="close" type="button" aria-label="Close" onclick={() => inspect.close()}>×</button>
    {/if}
    {#if jd}
      <header>
        <h3 class="r-{jd.rarity}">{jd.name}</h3>
        <div class="sub">
          {RARITY[jd.rarity]} · {CHAPTER_NAMES[jd.chapter]}{edition !== 'none' ? ` · ${EDITION_TEXT[edition]}` : ''}
        </div>
      </header>
      <p class="text">{@html richText(jd.text)}</p>
      {#if status}<p class="status">{status}</p>{/if}
      {#if jd.tags.length}
        <div class="block">
          <h4>Tags</h4>
          {#each jd.tags as tag (tag)}
            {@const td = TAGS[tag]}
            {@const n = counts[tag] ?? 0}
            <div class="tagline">
              <b>{td.name}</b> <span class="muted">({n} in army)</span>
              {#each td.tiers as tier (tier.count)}
                <div class="tier" class:on={n >= tier.count}>{tier.count}: {tier.text}</div>
              {/each}
            </div>
          {/each}
        </div>
      {/if}
      {#if bonds.length}
        <div class="block">
          <h4>Bonds</h4>
          {#each bonds as b (b.id)}
            <div class="bond" class:on={active.has(b.id)}>
              <div>
                <b>{b.name}</b>
                <span class="state">{active.has(b.id) ? 'ACTIVE' : 'inactive'}</span>
              </div>
              <div class="members">
                {#each b.members as m (m)}
                  <span class:here={present(m)}>{present(m) ? '✓' : '·'} {JOKERS[m].name}</span>
                {/each}
              </div>
              <div class="muted small">
                {b.rule === 'rightOf' ? 'Riou must be directly right of Jowy. ' : b.members.length > 2 ? 'All members side by side. ' : 'Side by side. '}{@html richText(b.text)}
              </div>
            </div>
          {/each}
        </div>
      {/if}
      {#if owned}
        <div class="actions">
          <button class="btn small" type="button" disabled={busy || ownedIndex <= 0} onclick={() => move(-1)} aria-label="Move left">◀</button>
          <button class="btn small" type="button" disabled={busy || !run || ownedIndex >= run.jokers.length - 1} onclick={() => move(1)} aria-label="Move right">▶</button>
          {#if jd.unsellable}
            <span class="muted small">Cannot be sold</span>
          {:else}
            <button class="btn small danger" type="button" disabled={busy} onclick={sellJoker}>Sell {sellValue(owned)}P</button>
          {/if}
        </div>
      {/if}
    {:else if cd}
      <header>
        <h3>{cd.name}</h3>
        <div class="sub">{({ rune: 'Rune', forging: 'Forging', true: 'True Rune', food: "Food · Hai Yo's Kitchen" })[cd.kind]}</div>
      </header>
      <p class="text">{@html richText(cd.text)}</p>
      {#if cd.select}
        <p class="muted small">Select {cd.select[0] === cd.select[1] ? cd.select[0] : `${cd.select[0]}–${cd.select[1]}`} card(s) in your hand first.</p>
      {/if}
      {#if cons}
        <div class="actions">
          <button class="btn small primary" type="button" disabled={busy || (!!cd.select && !inHandPhase)} onclick={use}>Use</button>
          <button class="btn small danger" type="button" disabled={busy} onclick={sellCons}>Sell {consSellValue(cons.id)}P</button>
        </div>
      {/if}
    {/if}
  </aside>
{/if}

<style>
  .inspect {
    position: fixed;
    right: 12px;
    bottom: 12px;
    width: min(320px, calc(100vw - 24px));
    max-height: calc(100vh - 24px);
    overflow: auto;
    padding: 14px 16px;
    z-index: 50;
    background: rgba(12, 17, 32, 0.97);
  }
  @media (max-width: 760px) {
    .inspect {
      top: auto;
      bottom: 0;
      right: 0;
      left: 0;
      width: 100%;
      max-height: 55vh;
      border-radius: 14px 14px 0 0;
    }
  }
  .close {
    position: absolute;
    top: 6px;
    right: 8px;
    background: none;
    border: none;
    font-size: 24px;
    cursor: pointer;
    color: var(--ink-dim);
    width: 36px;
    height: 36px;
  }
  h3 {
    margin: 0;
    font-size: 20px;
  }
  .r-C { color: #c5cfdf; }
  .r-U { color: #7fdcae; }
  .r-R { color: #f07a80; }
  .r-L { color: var(--r-legendary); }
  .sub {
    font-size: 12px;
    color: var(--ink-dim);
  }
  .text {
    font-size: 15px;
    margin: 10px 0;
  }
  .status {
    font-size: 13px;
    color: var(--gold);
    margin: -4px 0 8px;
  }
  h4 {
    margin: 10px 0 4px;
    font-size: 12px;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    color: var(--gold-dim);
  }
  .tagline {
    font-size: 13px;
    margin-bottom: 6px;
  }
  .tier {
    color: var(--ink-faint);
    padding-left: 10px;
  }
  .tier.on {
    color: var(--gold);
  }
  .bond {
    font-size: 13px;
    padding: 6px 8px;
    border-radius: 6px;
    border: 1px solid rgba(255, 255, 255, 0.08);
    margin-bottom: 6px;
  }
  .bond.on {
    border-color: var(--gold);
    background: rgba(212, 166, 74, 0.12);
  }
  .state {
    float: right;
    font-size: 10px;
    letter-spacing: 0.1em;
    color: var(--ink-faint);
  }
  .bond.on .state {
    color: var(--gold);
  }
  .members {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    color: var(--ink-faint);
  }
  .members .here {
    color: var(--ink);
  }
  .small {
    font-size: 12px;
  }
  .actions {
    display: flex;
    gap: 8px;
    align-items: center;
    margin-top: 12px;
  }
</style>
