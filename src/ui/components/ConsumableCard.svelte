<script lang="ts">
  import { CONSUMABLES } from '../../engine/consumables';

  interface Props {
    id: string;
    pinned?: boolean;
    onclick?: () => void;
    onhover?: (on: boolean) => void;
  }
  let { id, pinned = false, onclick, onhover }: Props = $props();
  const d = $derived(CONSUMABLES[id]);
  const icon = $derived(d.kind === 'forging' ? '⚒' : d.kind === 'true' ? '✷' : '◈');
</script>

<button
  type="button"
  class="cons k-{d.kind}"
  class:pinned
  aria-label="{d.name}. {d.text}"
  onclick={() => onclick?.()}
  onpointerenter={() => onhover?.(true)}
  onpointerleave={() => onhover?.(false)}
  onfocus={() => onhover?.(true)}
  onblur={() => onhover?.(false)}
>
  <span class="icon">{icon}</span>
  <span class="name">{d.name}</span>
  <span class="kind">{d.kind === 'true' ? 'True Rune' : d.kind === 'forging' ? 'Forging' : 'Rune'}</span>
</button>

<style>
  .cons {
    --kc: #4f7fd6;
    width: calc(var(--joker-w) * 0.86);
    height: var(--joker-h);
    flex: none;
    border-radius: 9px;
    border: 2px solid var(--kc);
    background: radial-gradient(circle at 50% 30%, color-mix(in srgb, var(--kc) 45%, #0b1020), #0b1020 80%);
    color: var(--ink);
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 4px;
    padding: 4px;
    cursor: pointer;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.55);
    transition: transform 0.18s var(--ease);
  }
  .cons:hover {
    transform: translateY(-3px);
  }
  .cons.pinned {
    box-shadow: 0 0 0 2px #fff8;
  }
  .k-forging { --kc: #c9822f; }
  .k-true { --kc: #b34fd6; }
  .icon {
    font-size: calc(var(--joker-w) * 0.38);
    line-height: 1;
    color: color-mix(in srgb, var(--kc) 60%, white);
  }
  .name {
    font: 700 calc(var(--joker-w) * 0.12) / 1.1 var(--font-display);
    text-align: center;
  }
  .kind {
    font-size: 9px;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: var(--ink-dim);
  }
</style>
