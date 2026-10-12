<script lang="ts">
  import { game } from '../../stores/game.svelte';
  import { BLIND_NAMES, chapterName } from '../../engine/blinds';
  import { BOSSES } from '../../engine/data';
  import { CONFIG } from '../../engine/config';
  import { previewHand, currentBossId } from '../../engine/run';
  import { HAND_INFO } from '../../engine/hands';
  import { currentEvent } from '../anim';
  import { num, mult, potch } from '../format';
  import { portraitUrl } from '../portraits';
  import { Tween } from 'svelte/motion';
  import { cubicOut } from 'svelte/easing';
  import { bump, shake, dur } from '../motion';

  interface Props {
    onmodal: (m: 'levels' | 'deck' | 'plan' | 'tags' | 'guide') => void;
  }
  let { onmodal }: Props = $props();

  const run = $derived(game.view!);
  const anim = $derived(game.anim);
  const ev = $derived(currentEvent(anim));
  const boss = $derived(run.blindIndex === 2 ? BOSSES[currentBossId(run)] : null);
  const inRound = $derived(run.phase === 'round');
  const preview = $derived(inRound && !anim ? previewHand(run, game.selected) : null);

  const box = $derived.by(() => {
    if (anim) {
      const r = anim.result;
      if (anim.step >= r.events.length) return { name: HAND_INFO[r.handType].name, chips: r.chips, mult: r.mult, lv: null as number | null };
      const e = ev ?? r.events[0];
      return { name: HAND_INFO[r.handType].name, chips: e.chips, mult: e.mult, lv: null };
    }
    if (preview) return { name: preview.name, chips: preview.chips, mult: preview.mult, lv: preview.level };
    return { name: '', chips: 0, mult: 0, lv: null };
  });
  const total = $derived(anim && anim.step >= anim.result.events.length ? anim.result.total : null);
  const score = $derived(inRound ? run.roundScore + (total ?? 0) : 0);
  const reward = $derived(CONFIG.blindRewards[run.blindIndex]);

  // Round score counts up instead of jumping.
  const shown = new Tween(0, { duration: 600, easing: cubicOut });
  $effect(() => {
    shown.set(score, { duration: dur(score > shown.target ? 600 : 0) });
  });
  const progress = $derived(Math.min(1, run.target > 0 ? shown.current / run.target : 0));
  // This hand will beat the blind: the hand box burns.
  const onFire = $derived(!!anim && run.roundScore + Math.floor(box.chips * box.mult) >= run.target);

  let chipsEl = $state<HTMLElement>();
  let multEl = $state<HTMLElement>();
  let handEl = $state<HTMLElement>();
  $effect(() => {
    if (!ev) return;
    if (ev.kind === 'chips') bump(chipsEl);
    else if (ev.kind === 'mult') bump(multEl);
    else if (ev.kind === 'xmult') {
      bump(multEl, 1.25);
      if (ev.value >= 2) shake(handEl, 5);
    }
  });
</script>

<aside class="side panel">
  <div class="blind" class:boss={!!boss} class:finale={boss?.finale}>
    {#if boss && portraitUrl(boss.id)}<img class="face" src={portraitUrl(boss.id)} alt="" />{/if}
    <div class="bname display">{boss ? boss.name : BLIND_NAMES[run.blindIndex]}</div>
    {#if boss}<div class="btitle">{boss.title}</div>{/if}
    {#if boss && (inRound || run.phase === 'blind')}<div class="btext">{boss.text}</div>{/if}
    <div class="target">
      <span class="muted">Score at least</span>
      <b>{num(run.target)}</b>
      <span class="reward">Reward {potch(reward)}</span>
    </div>
  </div>

  <div class="score">
    <span class="muted">Round score</span>
    <b class:hit={total !== null}>{num(Math.round(shown.current))}</b>
    {#if inRound}
      <span class="bar" class:full={progress >= 1} aria-hidden="true"><i style="transform:scaleX({progress})"></i></span>
    {/if}
  </div>

  <div class="hand" class:fire={onFire} bind:this={handEl}>
    <div class="hname">
      {box.name || ' '}{#if box.lv}<span class="lv">lv.{box.lv}</span>{/if}
    </div>
    <div class="cm">
      <span class="chips" bind:this={chipsEl}>{num(box.chips)}</span>
      <span class="x">×</span>
      <span class="mult" bind:this={multEl}>{mult(box.mult)}</span>
    </div>
    {#if total !== null}<div class="total">= {num(total)}</div>{/if}
  </div>

  <div class="stats">
    <div class="stat"><span>Hands</span><b class="t-chips">{run.round?.handsLeft ?? game.passives?.hands ?? 0}</b></div>
    <div class="stat"><span>Discards</span><b class="t-mult">{run.round?.discardsLeft ?? game.passives?.discards ?? 0}</b></div>
    <div class="stat wide"><span>Potch</span><b class="t-money">{potch(run.money)}</b></div>
    <div class="stat"><span>Chapter</span><b>{run.ante}/{CONFIG.finalAnte}</b></div>
    <div class="stat"><span>Round</span><b>{run.stats.roundsWon + (inRound ? 1 : 0)}</b></div>
  </div>
  <div class="chapter display">{chapterName(run.ante)}</div>

  <div class="buttons">
    <button class="btn small" type="button" onclick={() => onmodal('levels')}>Hands</button>
    <button class="btn small" type="button" onclick={() => onmodal('deck')}>Deck</button>
    <button class="btn small" type="button" onclick={() => onmodal('plan')}>Run</button>
    <button class="btn small" type="button" onclick={() => onmodal('tags')}>Tags</button>
    <button class="btn small" type="button" onclick={() => onmodal('guide')}>Guide</button>
    <button class="btn small" type="button" onclick={() => (game.screen = 'menu')}>Menu</button>
  </div>
</aside>

<style>
  .side {
    padding: 12px;
    display: flex;
    flex-direction: column;
    gap: 10px;
    align-self: start;
    position: sticky;
    top: 12px;
  }
  .blind {
    padding: 10px;
    border-radius: 8px;
    background: linear-gradient(180deg, #24406e, #152742);
    border: 1px solid #4a74b0;
    text-align: center;
  }
  .blind.boss {
    background: linear-gradient(180deg, #6e2430, #3a121a);
    border-color: #c25a62;
  }
  .blind.finale {
    background: linear-gradient(180deg, #4a1d5e, #1d0b28);
    border-color: var(--gold);
    box-shadow: 0 0 18px rgba(233, 185, 73, 0.35);
  }
  .bname {
    font-size: 20px;
  }
  .face {
    float: left;
    width: 56px;
    height: 56px;
    margin-right: 8px;
    object-fit: cover;
    object-position: 50% 20%;
    border-radius: 50%;
    border: 2px solid rgba(255, 255, 255, 0.35);
    background: rgba(0, 0, 0, 0.3);
  }
  .btitle {
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    color: var(--gold);
  }
  .btext {
    font-size: 13px;
    margin-top: 4px;
  }
  .target {
    margin-top: 6px;
    display: flex;
    flex-direction: column;
    font-size: 12px;
  }
  .target b {
    font-size: 22px;
    color: #ff8a7a;
    font-family: var(--font-display);
  }
  .reward {
    color: var(--money);
  }
  .score {
    position: relative;
    display: flex;
    justify-content: space-between;
    align-items: center;
    flex-wrap: wrap;
    padding: 8px 10px 10px;
    border-radius: 8px;
    background: rgba(0, 0, 0, 0.3);
    font-size: 12px;
  }
  .score b {
    font-size: 24px;
    font-family: var(--font-display);
    transition: transform 0.2s var(--ease);
  }
  .score b.hit {
    color: var(--gold);
    transform: scale(1.1);
  }
  .bar {
    flex-basis: 100%;
    height: 5px;
    margin-top: 6px;
    border-radius: 3px;
    background: rgba(255, 255, 255, 0.08);
    overflow: hidden;
  }
  .bar i {
    display: block;
    height: 100%;
    transform-origin: left;
    background: linear-gradient(90deg, #7d1f25, #e85b4b);
  }
  /* Target reached: the bar itself turns gold and glows (the glow sits on the track, so it is not clipped). */
  .bar.full {
    box-shadow: 0 0 10px rgba(247, 221, 151, 0.7);
    transition: box-shadow 300ms ease;
  }
  .bar.full i {
    background: linear-gradient(90deg, #b8861b, #f7dd97);
  }
  .hand {
    position: relative;
    isolation: isolate;
    overflow: hidden;
    background: rgba(0, 0, 0, 0.3);
    border-radius: 8px;
    padding: 8px;
    text-align: center;
    transition: box-shadow 200ms ease;
  }
  /* Flame glow when the hand will win the blind (only during the scoring replay). */
  .hand.fire {
    box-shadow: 0 0 0 1px #ffb347, 0 0 22px rgba(255, 120, 40, 0.55);
  }
  /* Flames rise from the bottom edge, inside the box and behind the numbers. */
  .hand.fire::after {
    content: '';
    position: absolute;
    inset: auto 0 0 0;
    height: 70%;
    z-index: -1;
    pointer-events: none;
    transform-origin: 50% 100%;
    background:
      radial-gradient(ellipse 30% 70% at 20% 100%, rgba(255, 207, 90, 0.55), transparent 70%),
      radial-gradient(ellipse 35% 90% at 50% 100%, rgba(255, 138, 42, 0.6), transparent 70%),
      radial-gradient(ellipse 30% 70% at 80% 100%, rgba(255, 207, 90, 0.55), transparent 70%);
    filter: blur(3px);
    animation: flicker 320ms ease-in-out infinite alternate;
  }
  @keyframes flicker {
    from { transform: scaleY(0.85); opacity: 0.7; }
    to { transform: scaleY(1.1); opacity: 1; }
  }
  .hname {
    font-family: var(--font-display);
    font-weight: 700;
    min-height: 1.4em;
  }
  .lv {
    margin-left: 6px;
    color: var(--ink-dim);
    font-size: 12px;
  }
  .cm {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    margin-top: 4px;
  }
  .chips,
  .mult {
    min-width: 76px;
    padding: 6px 8px;
    border-radius: 6px;
    font: 800 22px var(--font-body);
    color: #fff;
    text-align: center;
  }
  .chips {
    background: var(--blue);
    text-align: right;
  }
  .mult {
    background: var(--red);
    text-align: left;
  }
  .x {
    font-size: 20px;
    color: var(--ink-dim);
  }
  .total {
    margin-top: 6px;
    font: 800 22px var(--font-display);
    color: var(--gold);
    animation: slam 260ms var(--ease) both;
  }
  @keyframes slam {
    from { transform: scale(1.5); opacity: 0; }
  }
  .stats {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 6px;
  }
  .stat {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 6px;
    border-radius: 8px;
    background: rgba(0, 0, 0, 0.3);
    font-size: 11px;
    color: var(--ink-dim);
  }
  .stat b {
    font-size: 20px;
    font-family: var(--font-display);
    color: var(--ink);
  }
  .stat .t-chips { color: var(--chips); }
  .stat .t-mult { color: var(--mult); }
  .stat .t-money { color: var(--money); }
  .stat.wide {
    grid-column: span 2;
  }
  .chapter {
    text-align: center;
    color: var(--gold);
  }
  .buttons {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
  }
  .buttons .btn {
    flex: 1 1 auto;
  }
  @media (max-width: 900px) {
    .side {
      position: static;
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 8px;
      padding: 8px;
    }
    .blind,
    .buttons {
      grid-column: span 2;
    }
    .stats {
      grid-column: span 2;
      grid-template-columns: repeat(5, 1fr);
    }
    .stat.wide {
      grid-column: span 1;
    }
    .chapter {
      display: none;
    }
    .chips,
    .mult {
      min-width: 56px;
      font-size: 17px;
    }
    .bname {
      font-size: 17px;
    }
  }
</style>
