<script lang="ts">
  import type { Edition } from '../../engine/cards';
  import { JOKERS } from '../../engine/data';
  import { initials, hue } from '../format';
  import { portraitUrl } from '../portraits';
  import { wiggle } from '../motion';

  interface Props {
    id: string;
    edition?: Edition;
    active?: boolean;
    debuffed?: boolean;
    bonded?: boolean;
    popup?: string | null;
    popupKind?: string;
    silhouette?: boolean;
    pinned?: boolean;
    badge?: string | null;
    pulse?: number | null;
    onclick?: () => void;
    onhover?: (on: boolean) => void;
  }
  let {
    id, edition = 'none', active = false, debuffed = false, bonded = false, popup = null, popupKind = 'mult',
    silhouette = false, pinned = false, badge = null, pulse = null, onclick, onhover,
  }: Props = $props();

  let el = $state<HTMLButtonElement>();
  $effect(() => {
    if (pulse != null) wiggle(el);
  });

  const d = $derived(JOKERS[id]);
  const rarity = $derived(d?.rarity ?? 'C');
  const h = $derived(hue(id));
  const src = $derived(portraitUrl(id));
  const label = $derived(silhouette ? 'Undiscovered Joker' : `${d?.name}. ${d?.text}`);
</script>

<button
  bind:this={el}
  type="button"
  class="joker r-{rarity} ed-{edition}"
  class:active
  class:debuffed
  class:bonded
  class:silhouette
  class:pinned
  aria-label={label}
  onclick={() => onclick?.()}
  onpointerenter={() => onhover?.(true)}
  onpointerleave={() => onhover?.(false)}
  onfocus={() => onhover?.(true)}
  onblur={() => onhover?.(false)}
>
  <span class="art" style="--h:{h}">
    {#if silhouette}
      <span class="mono">?</span>
    {:else if src}
      <img {src} alt="" draggable="false" loading="lazy" decoding="async" />
    {:else}
      <span class="mono">{initials(d?.name ?? '?')}</span>
    {/if}
  </span>
  <span class="gem" aria-hidden="true"></span>
  <span class="name">{silhouette ? '???' : d?.name}</span>
  {#if bonded}<span class="bond-mark" title="Bond active">⛓</span>{/if}
  {#if badge}<span class="badge">{badge}</span>{/if}
  {#if edition !== 'none'}<span class="sheen" aria-hidden="true"></span>{/if}
  {#if debuffed}<span class="debuff" aria-hidden="true">✕</span>{/if}
  {#if popup}
    {#key pulse}<span class="popup {popupKind}">{popup}</span>{/key}
  {/if}
</button>

<style>
  .joker {
    --rc: var(--r-common);
    position: relative;
    width: var(--joker-w);
    height: var(--joker-h);
    flex: none;
    padding: 4px;
    border-radius: 9px;
    border: 2px solid var(--rc);
    background:
      linear-gradient(180deg, rgba(255, 255, 255, 0.08), transparent 30%),
      linear-gradient(180deg, color-mix(in srgb, var(--rc) 22%, #1d2440), #0d1222);
    box-shadow:
      0 4px 12px rgba(0, 0, 0, 0.55),
      inset 0 0 0 1px rgba(0, 0, 0, 0.6),
      inset 0 0 0 2px color-mix(in srgb, var(--rc) 35%, transparent);
    display: flex;
    flex-direction: column;
    gap: 3px;
    cursor: pointer;
    transition: transform 160ms var(--ease), box-shadow 160ms ease;
    touch-action: none;
    user-select: none;
  }
  .r-U { --rc: var(--r-uncommon); }
  .r-R { --rc: var(--r-rare); }
  .r-L {
    --rc: var(--r-legendary);
    box-shadow: 0 0 14px rgba(233, 185, 73, 0.35), 0 4px 12px rgba(0, 0, 0, 0.55);
  }
  @media (hover: hover) and (pointer: fine) {
    .joker:hover {
      transform: translateY(-4px) rotate(-1deg);
    }
    /* Light sweep across Legendary art on hover. */
    .r-L:hover .art::before {
      animation: sweep 700ms var(--ease) both;
    }
  }
  .r-L .art::before {
    content: '';
    position: absolute;
    inset: 0;
    z-index: 2;
    pointer-events: none;
    background: linear-gradient(110deg, transparent 35%, rgba(255, 240, 200, 0.55) 50%, transparent 65%);
    transform: translateX(-120%);
  }
  @keyframes sweep {
    to { transform: translateX(120%); }
  }
  .gem {
    position: absolute;
    top: -5px;
    left: 50%;
    width: 10px;
    height: 10px;
    transform: translateX(-50%) rotate(45deg);
    background: radial-gradient(circle at 35% 35%, #fff, var(--rc) 55%, color-mix(in srgb, var(--rc) 50%, #000));
    border: 1px solid rgba(0, 0, 0, 0.6);
    box-shadow: 0 0 6px var(--rc);
    z-index: 3;
  }
  .silhouette .gem {
    display: none;
  }
  .joker.pinned {
    box-shadow: 0 0 0 2px #fff8, 0 6px 14px rgba(0, 0, 0, 0.6);
  }
  .joker.active {
    transform: translateY(-8px) scale(1.07);
    box-shadow: 0 0 0 2px #fff, 0 0 24px rgba(255, 215, 130, 0.85);
  }
  .joker.bonded {
    outline: 2px solid rgba(233, 185, 73, 0.75);
    outline-offset: 2px;
  }
  .joker.debuffed {
    filter: grayscale(1) brightness(0.6);
  }
  :global(.dragging) {
    z-index: 20;
    transition: none !important;
    box-shadow: 0 16px 30px rgba(0, 0, 0, 0.7) !important;
  }
  .art {
    flex: 1;
    border-radius: 5px;
    overflow: hidden;
    display: grid;
    place-items: center;
    background:
      radial-gradient(circle at 50% 35%, hsl(var(--h) 45% 42%), hsl(var(--h) 50% 16%) 75%),
      #222;
    border: 1px solid rgba(255, 255, 255, 0.12);
  }
  .art {
    position: relative;
  }
  /* Art is trimmed to its visible part (about 7:8). The card window is taller,
     so cover-fit keeps the face (upper middle) in view. */
  .art img {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    object-fit: cover;
    object-position: 50% 20%;
    pointer-events: none;
  }
  .art:has(img)::after {
    content: '';
    position: absolute;
    inset: 0;
    box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.1), inset 0 -18px 16px -12px rgba(0, 0, 0, 0.55);
    pointer-events: none;
  }
  .mono {
    font: 700 calc(var(--joker-w) * 0.34) / 1 var(--font-display);
    color: rgba(255, 245, 220, 0.92);
    text-shadow: 0 2px 6px rgba(0, 0, 0, 0.6);
  }
  .silhouette .art {
    background: #0c0f1a;
    filter: none;
  }
  .silhouette .mono {
    color: #3a4160;
  }
  .name {
    font: 700 calc(var(--joker-w) * 0.12) / 1.1 var(--font-display);
    color: #2a1d0c;
    text-align: center;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    padding: 2px 2px 1px;
    background: linear-gradient(180deg, #f3e6c4, #d8c08a);
    border-radius: 3px;
    box-shadow: inset 0 0 0 1px rgba(120, 80, 20, 0.5);
  }
  .silhouette .name {
    background: #1a1f33;
    color: #4a5070;
    box-shadow: none;
  }
  .bond-mark {
    position: absolute;
    top: -8px;
    left: -8px;
    font-size: 14px;
    background: #2a2210;
    border: 1px solid var(--gold);
    border-radius: 50%;
    width: 22px;
    height: 22px;
    display: grid;
    place-items: center;
  }
  .badge {
    position: absolute;
    top: 6px;
    right: 6px;
    font: 700 10px var(--font-body);
    background: rgba(0, 0, 0, 0.7);
    color: var(--gold);
    padding: 1px 4px;
    border-radius: 4px;
  }
  .sheen {
    position: absolute;
    inset: 0;
    border-radius: inherit;
    pointer-events: none;
    mix-blend-mode: screen;
    opacity: 0.35;
  }
  .ed-foil .sheen { background: linear-gradient(115deg, transparent 25%, #8cf 50%, transparent 75%); }
  .ed-holo .sheen { background: linear-gradient(115deg, #f66, #fd6, #6f6, #6df, #66f, #f6f); }
  .ed-poly .sheen { background: conic-gradient(#f55, #fd5, #5f8, #5cf, #a5f, #f55); animation: hue 4s linear infinite; }
  .ed-negative {
    filter: invert(0.88) hue-rotate(180deg);
  }
  @keyframes hue {
    to { filter: hue-rotate(360deg); }
  }
  .debuff {
    position: absolute;
    inset: 0;
    display: grid;
    place-items: center;
    color: var(--red);
    font-size: calc(var(--joker-w) * 0.8);
  }
  .popup {
    position: absolute;
    left: 50%;
    bottom: -12px;
    transform: translate(-50%, 100%);
    padding: 3px 7px;
    border-radius: 6px;
    font: 800 14px var(--font-body);
    color: #fff;
    white-space: nowrap;
    z-index: 5;
    pointer-events: none;
    animation: pop 420ms var(--ease) both;
    box-shadow: 0 3px 8px rgba(0, 0, 0, 0.5);
  }
  .popup.chips { background: var(--chips); }
  .popup.mult, .popup.xmult { background: var(--mult); }
  .popup.money { background: #b8861b; }
  .popup.msg, .popup.retrigger, .popup.debuffed { background: #444b66; }
  @keyframes pop {
    0% { transform: translate(-50%, 40%) scale(0.7); opacity: 0; }
    40% { transform: translate(-50%, 110%) scale(1.12); opacity: 1; }
    100% { transform: translate(-50%, 100%) scale(1); opacity: 1; }
  }
</style>
