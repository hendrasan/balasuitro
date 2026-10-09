<script lang="ts">
  import { game } from '../../stores/game.svelte';
  import { HAND_INFO, HAND_ORDER, handBase } from '../../engine/hands';

  const run = $derived(game.view!);
  const rows = $derived(
    [...HAND_ORDER]
      .reverse()
      .filter((h) => !HAND_INFO[h].secret || run.handLevels[h].played > 0)
      .map((h) => ({ h, info: HAND_INFO[h], lv: run.handLevels[h], base: handBase(h, run.handLevels[h].level) })),
  );
</script>

<table>
  <thead><tr><th>Lv</th><th>Hand</th><th>Chips × Mult</th><th>Played</th></tr></thead>
  <tbody>
    {#each rows as r (r.h)}
      <tr>
        <td class="lv">{r.lv.level}</td>
        <td>{r.info.name}</td>
        <td><span class="c">{r.base.chips}</span> × <span class="m">{r.base.mult}</span></td>
        <td class="muted">{r.lv.played}</td>
      </tr>
    {/each}
  </tbody>
</table>

<style>
  table {
    width: 100%;
    border-collapse: collapse;
    font-size: 14px;
  }
  th {
    text-align: left;
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: var(--gold-dim);
    padding: 4px 6px;
  }
  td {
    padding: 6px;
    border-top: 1px solid rgba(255, 255, 255, 0.06);
  }
  .lv {
    color: var(--gold);
    font-weight: 700;
  }
  .c {
    color: var(--chips);
    font-weight: 700;
  }
  .m {
    color: var(--mult);
    font-weight: 700;
  }
</style>
