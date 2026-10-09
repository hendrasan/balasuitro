<script lang="ts">
  import { wiggle } from '../motion';
  import { type Card, SUIT_SYMBOLS, SUIT_NAMES, rankLabel, rankName, ENH_TEXT, EDITION_TEXT, SEAL_TEXT } from '../../engine/cards';

  interface Props {
    card: Card;
    selected?: boolean;
    debuffed?: boolean;
    active?: boolean;
    popup?: string | null;
    popupKind?: string;
    disabled?: boolean;
    /** Changes on every scoring event that hits this card; drives the wiggle. */
    pulse?: number | null;
    onclick?: () => void;
  }
  let {
    card, selected = false, debuffed = false, active = false, popup = null, popupKind = 'chips', disabled = false, pulse = null, onclick,
  }: Props = $props();

  let el = $state<HTMLButtonElement>();
  $effect(() => {
    if (pulse != null) wiggle(el);
  });
  const CREST: Record<number, string> = { 11: '⚔', 12: '❀', 13: '♛', 14: '✦' };

  const red = $derived(card.suit === 'H' || card.suit === 'D');
  const stone = $derived(card.enh === 'stone');
  const sym = $derived(SUIT_SYMBOLS[card.suit]);
  const label = $derived(
    [
      stone ? 'Stone card' : `${rankName(card.rank)} of ${SUIT_NAMES[card.suit]}`,
      ENH_TEXT[card.enh],
      EDITION_TEXT[card.edition],
      SEAL_TEXT[card.seal],
      card.bonusChips ? `+${card.bonusChips} bonus Chips` : '',
      debuffed ? 'Debuffed' : '',
    ]
      .filter(Boolean)
      .join('. '),
  );
</script>

<button
  bind:this={el}
  type="button"
  class="card enh-{card.enh} ed-{card.edition}"
  class:red
  class:selected
  class:active
  class:debuffed
  aria-pressed={selected}
  aria-label={label}
  title={label}
  {disabled}
  onclick={() => onclick?.()}
>
  {#if stone}
    <span class="stone-mark">STONE</span>
  {:else}
    <span class="frame" aria-hidden="true"></span>
    <span class="corner tl">{rankLabel(card.rank)}<i>{sym}</i></span>
    {#if card.rank >= 11}
      <span class="pip face-pip" class:ace={card.rank === 14}><b>{CREST[card.rank]}</b>{sym}</span>
    {:else}
      <span class="pip">{sym}</span>
    {/if}
    <span class="corner br">{rankLabel(card.rank)}<i>{sym}</i></span>
  {/if}
  {#if card.enh !== 'none' && !stone}<span class="badge">{card.enh}</span>{/if}
  {#if card.bonusChips}<span class="bonus">+{card.bonusChips}</span>{/if}
  {#if card.seal !== 'none'}<span class="seal seal-{card.seal}" aria-hidden="true"></span>{/if}
  {#if card.edition !== 'none'}<span class="sheen" aria-hidden="true"></span>{/if}
  {#if debuffed}<span class="debuff" aria-hidden="true">✕</span>{/if}
  {#if popup}
    {#key pulse}<span class="popup {popupKind}">{popup}</span>{/key}
  {/if}
</button>

<style>
  .card {
    position: relative;
    width: var(--card-w);
    height: var(--card-h);
    flex: none;
    padding: 0;
    border-radius: 7px;
    border: 1px solid #b9a77a;
    background:
      radial-gradient(ellipse at 30% 20%, rgba(255, 255, 255, 0.6), transparent 60%),
      linear-gradient(160deg, var(--parch), var(--parch-2));
    color: var(--card-ink);
    font-family: var(--font-display);
    box-shadow: 0 3px 8px rgba(0, 0, 0, 0.5), inset 0 0 0 1px rgba(255, 255, 255, 0.5);
    cursor: pointer;
    transition: transform 160ms var(--ease), box-shadow 160ms ease;
    overflow: visible;
    touch-action: none;
    user-select: none;
  }
  .card.red {
    color: #a3242b;
  }
  @media (hover: hover) and (pointer: fine) {
    .card:hover:not(:disabled):not(.selected) {
      transform: translateY(-5px);
    }
  }
  .frame {
    position: absolute;
    inset: 4px;
    border-radius: 4px;
    border: 1px solid currentColor;
    opacity: 0.18;
    pointer-events: none;
  }
  .pip.face-pip {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    line-height: 1;
    font-size: calc(var(--card-w) * 0.34);
  }
  .face-pip b {
    font-size: calc(var(--card-w) * 0.34);
    color: #b0812a;
    text-shadow: 0 1px 0 rgba(255, 255, 255, 0.6);
  }
  .face-pip.ace b {
    font-size: calc(var(--card-w) * 0.28);
  }

  .card.selected {
    transform: translateY(-18px);
    box-shadow: 0 0 0 2px var(--gold), 0 0 16px rgba(227, 184, 92, 0.45), 0 12px 20px rgba(0, 0, 0, 0.6);
  }
  .card.active {
    transform: translateY(-10px) scale(1.08);
    box-shadow: 0 0 0 3px #fff6, 0 0 22px rgba(255, 220, 140, 0.8);
  }
  .card.debuffed {
    filter: grayscale(0.8) brightness(0.7);
  }
  .card:disabled {
    cursor: default;
  }
  .corner {
    position: absolute;
    font-size: calc(var(--card-w) * 0.2);
    font-weight: 700;
    line-height: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
  }
  .corner i {
    font-style: normal;
    font-size: 0.85em;
  }
  .tl {
    top: 5px;
    left: 5px;
  }
  .br {
    bottom: 5px;
    right: 5px;
    transform: rotate(180deg);
  }
  .pip {
    position: absolute;
    inset: 0;
    display: grid;
    place-items: center;
    font-size: calc(var(--card-w) * 0.5);
  }
  .badge {
    position: absolute;
    left: 50%;
    bottom: 3px;
    transform: translateX(-50%);
    font: 700 9px/1 var(--font-body);
    text-transform: uppercase;
    letter-spacing: 0.05em;
    padding: 2px 4px;
    border-radius: 3px;
    background: rgba(20, 24, 40, 0.8);
    color: var(--parch);
  }
  .bonus {
    position: absolute;
    top: 3px;
    right: 4px;
    font: 700 10px var(--font-body);
    color: var(--blue-deep);
  }
  .seal {
    position: absolute;
    right: 5px;
    top: 40%;
    width: 12px;
    height: 12px;
    border-radius: 50%;
    box-shadow: 0 0 0 2px rgba(0, 0, 0, 0.25), inset 0 -2px 2px rgba(0, 0, 0, 0.3);
  }
  .seal-gold { background: #e9b949; }
  .seal-red { background: #d33; }
  .seal-blue { background: #3a8dde; }
  .seal-purple { background: #9b4fd1; }

  .enh-bonus { background: linear-gradient(160deg, #e3eefc, #b8cff0); }
  .enh-mult { background: linear-gradient(160deg, #fbe3df, #efb8b0); }
  .enh-wild { border: 2px solid transparent; background: linear-gradient(160deg, var(--parch), var(--parch-2)) padding-box, conic-gradient(#e55, #ec5, #5c5, #5ce, #55e, #e5c, #e55) border-box; }
  .enh-glass { background: linear-gradient(160deg, rgba(230, 245, 255, 0.75), rgba(170, 210, 240, 0.55)); }
  .enh-steel { background: linear-gradient(160deg, #e8ebf0, #9aa3b2 60%, #d5dae2); }
  .enh-gold { background: linear-gradient(160deg, #fbe7a1, #d9a93d 60%, #f5d778); }
  .enh-lucky { background: linear-gradient(160deg, #e6f6dc, #b9dea2); }
  .enh-stone {
    background: radial-gradient(circle at 30% 30%, #9a9a94, #5c5c58 70%);
    border-color: #444;
  }
  .stone-mark {
    position: absolute;
    inset: 0;
    display: grid;
    place-items: center;
    font: 700 11px var(--font-body);
    letter-spacing: 0.1em;
    color: #e9e7df;
  }
  .sheen {
    position: absolute;
    inset: 0;
    border-radius: inherit;
    pointer-events: none;
    mix-blend-mode: soft-light;
  }
  .ed-foil .sheen { background: linear-gradient(115deg, transparent 20%, rgba(140, 200, 255, 0.9) 45%, transparent 70%); }
  .ed-holo .sheen { background: linear-gradient(115deg, #f66a, #fd6a, #6f6a, #6dfa, #66fa, #f6fa); }
  .ed-poly .sheen {
    background: conic-gradient(from 0deg, #f55, #fd5, #5f8, #5cf, #a5f, #f55);
    opacity: 0.7;
    animation: hue 4s linear infinite;
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
    font-size: calc(var(--card-w) * 0.8);
    font-family: var(--font-body);
    opacity: 0.85;
  }
  .popup {
    position: absolute;
    left: 50%;
    top: -14px;
    transform: translate(-50%, -100%);
    padding: 3px 7px;
    border-radius: 6px;
    font: 800 14px var(--font-body);
    color: #fff;
    white-space: nowrap;
    z-index: 5;
    animation: pop 420ms var(--ease) both;
    box-shadow: 0 3px 8px rgba(0, 0, 0, 0.5);
    pointer-events: none;
  }
  .popup.chips { background: var(--chips); }
  .popup.mult, .popup.xmult { background: var(--mult); }
  .popup.money { background: #b8861b; }
  .popup.msg, .popup.retrigger, .popup.debuffed { background: #444b66; }
  @keyframes pop {
    0% { transform: translate(-50%, -40%) scale(0.7); opacity: 0; }
    40% { transform: translate(-50%, -110%) scale(1.12); opacity: 1; }
    100% { transform: translate(-50%, -100%) scale(1); opacity: 1; }
  }
</style>
