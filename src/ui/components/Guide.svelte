<script lang="ts">
  import { EDITION_TEXT, ENH_TEXT, ENHANCEMENTS, SEAL_TEXT, SEALS, newCard, type Edition } from '../../engine/cards';
  import { richText } from '../format';
  import PlayingCard from './PlayingCard.svelte';

  // Sample cards for the pictures. Ids are negative so they never match real cards.
  const sample = (i: number, extra: Parameters<typeof newCard>[3]) => newCard(-100 - i, 14, 'S', extra);
  const split = (t: string) => {
    const k = t.indexOf(':');
    return { name: t.slice(0, k), text: t.slice(k + 1).trim() };
  };
  const EDITIONS: Edition[] = ['foil', 'holo', 'poly'];
</script>

<section>
  <h3 class="display orn">How a hand scores</h3>
  <p>
    Your hand type gives base <b class="t-chips">Chips</b> and <b class="t-mult">Mult</b>. Each scoring card adds its Chips
    (2–10 = face value, J/Q/K = 10, A = 11). Card upgrades, Jokers, Bonds and Tags then add Chips, add Mult, or multiply
    Mult (<b class="t-x">X</b>). Score = Chips × Mult.
  </p>
</section>

<section>
  <h3 class="display orn">Enhancements</h3>
  <p class="muted">A card has at most one. Runes add them.</p>
  <div class="grid">
    {#each ENHANCEMENTS as e, i (e)}
      {@const t = split(ENH_TEXT[e])}
      <div class="row">
        <div class="mini"><PlayingCard card={sample(i, { enh: e })} disabled /></div>
        <div><b>{t.name}</b><div class="txt">{@html richText(t.text)}</div></div>
      </div>
    {/each}
  </div>
</section>

<section>
  <h3 class="display orn">Editions</h3>
  <p class="muted">On playing cards and on Jokers. Negative is only on Jokers: +1 Joker slot.</p>
  <div class="grid">
    {#each EDITIONS as e, i (e)}
      {@const t = split(EDITION_TEXT[e])}
      <div class="row">
        <div class="mini"><PlayingCard card={sample(20 + i, { edition: e })} disabled /></div>
        <div><b>{t.name}</b><div class="txt">{@html richText(t.text)}</div></div>
      </div>
    {/each}
  </div>
</section>

<section>
  <h3 class="display orn">Seals</h3>
  <p class="muted">True Runes add them.</p>
  <div class="grid">
    {#each SEALS as s, i (s)}
      {@const t = split(SEAL_TEXT[s])}
      <div class="row">
        <div class="mini"><PlayingCard card={sample(30 + i, { seal: s })} disabled /></div>
        <div><b>{t.name}</b><div class="txt">{@html richText(t.text)}</div></div>
      </div>
    {/each}
  </div>
</section>

<p class="muted tip">Tip: point at a card (or press and hold it on a touch screen) to see what it does.</p>

<style>
  section {
    margin-bottom: 14px;
  }
  h3 {
    margin: 0 0 4px;
    font-size: 16px;
    color: var(--gold);
  }
  p {
    margin: 0 0 8px;
    font-size: 14px;
  }
  .grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(min(100%, 250px), 1fr));
    gap: 10px;
  }
  .row {
    display: flex;
    gap: 10px;
    align-items: center;
    font-size: 13px;
  }
  .mini {
    --card-w: 44px;
    --card-h: 62px;
    flex: none;
  }
  .txt {
    color: var(--ink-dim);
  }
  .tip {
    font-size: 12px;
  }
</style>
