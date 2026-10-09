<script lang="ts">
  import { game } from '../../stores/game.svelte';
  import { BOSSES } from '../../engine/data';
  import { chapterName, blindTarget } from '../../engine/blinds';
  import { CONFIG } from '../../engine/config';
  import { num } from '../format';

  const run = $derived(game.view!);
  const reveal = $derived(!!game.passives?.revealBosses);
  const antes = $derived(Array.from({ length: Math.max(CONFIG.finalAnte, run.ante) }, (_, i) => i + 1));
</script>

<p>Seed: <b class="seed">{run.seed}</b> <span class="muted">(same seed + same choices = same run)</span></p>
{#if !reveal}<p class="muted">Recruit Shu to reveal every Boss in advance.</p>{/if}
<table>
  <tbody>
    {#each antes as a (a)}
      {@const id = run.bosses[String(a)]}
      {@const known = reveal || a <= run.ante || (id && BOSSES[id]?.fixed)}
      <tr class:now={a === run.ante}>
        <td class="ch">{a}. {chapterName(a)}</td>
        <td>
          {#if id && known}
            <b>{BOSSES[id].name}</b> <span class="muted">— {BOSSES[id].text}</span>
          {:else}
            <span class="muted">???</span>
          {/if}
        </td>
        <td class="num">{num(blindTarget(a, 2, known ? id : null))}</td>
      </tr>
    {/each}
  </tbody>
</table>

<style>
  .seed {
    font-family: ui-monospace, monospace;
    color: var(--gold);
    user-select: all;
  }
  table {
    width: 100%;
    border-collapse: collapse;
    font-size: 14px;
  }
  td {
    padding: 6px;
    border-top: 1px solid rgba(255, 255, 255, 0.06);
    vertical-align: top;
  }
  tr.now td {
    background: rgba(212, 166, 74, 0.1);
  }
  .ch {
    white-space: nowrap;
    color: var(--gold-dim);
  }
  .num {
    text-align: right;
    white-space: nowrap;
  }
</style>
