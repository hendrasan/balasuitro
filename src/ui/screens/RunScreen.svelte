<script lang="ts">
  import { game } from '../../stores/game.svelte';
  import Sidebar from '../components/Sidebar.svelte';
  import JokerRow from '../components/JokerRow.svelte';
  import ConsumableRow from '../components/ConsumableRow.svelte';
  import TagBar from '../components/TagBar.svelte';
  import InspectPanel from '../components/InspectPanel.svelte';
  import Modal from '../components/Modal.svelte';
  import HandLevels from '../components/HandLevels.svelte';
  import DeckView from '../components/DeckView.svelte';
  import RunPlan from '../components/RunPlan.svelte';
  import TagTable from '../components/TagTable.svelte';
  import Guide from '../components/Guide.svelte';
  import BlindSelect from './run/BlindSelect.svelte';
  import RoundView from './run/RoundView.svelte';
  import CashOut from './run/CashOut.svelte';
  import Shop from './run/Shop.svelte';
  import PackView from './run/PackView.svelte';
  import EndScreen from './run/EndScreen.svelte';
  import { fly } from 'svelte/transition';
  import { cubicOut } from 'svelte/easing';
  import { dur } from '../motion';

  type ModalKind = 'levels' | 'deck' | 'plan' | 'tags' | 'guide';
  let modal = $state<ModalKind | null>(null);
  const TITLES: Record<ModalKind, string> = { levels: 'Hand Levels', deck: 'Your Deck', plan: 'Campaign', tags: 'Army Tags', guide: 'Guide' };

  const run = $derived(game.view);
  // Keep showing the round while the scoring replay runs.
  const phase = $derived(game.anim ? 'round' : run?.phase);
</script>

{#if run}
  <div class="layout">
    <Sidebar onmodal={(m) => (modal = m)} />
    <main class="main">
      <div class="a-jokers"><JokerRow /></div>
      <div class="a-cons"><ConsumableRow /></div>
      <div class="a-tags"><TagBar onopen={() => (modal = 'tags')} /></div>
      <section class="stage a-stage" class:boss={run.round?.bossId}>
        <div class="emblem" aria-hidden="true"></div>
        {#key phase}
        <div class="phase" in:fly={{ y: 14, duration: dur(240), easing: cubicOut }}>
        {#if phase === 'blind'}
          <BlindSelect />
        {:else if phase === 'round'}
          <RoundView />
        {:else if phase === 'cashout'}
          <CashOut />
        {:else if phase === 'shop'}
          <Shop />
        {:else if phase === 'pack'}
          <PackView />
        {:else}
          <EndScreen />
        {/if}
        </div>
        {/key}
      </section>
    </main>
  </div>
  <InspectPanel />
  {#if modal}
    <Modal title={TITLES[modal]} onclose={() => (modal = null)} wide={modal === 'deck' || modal === 'tags' || modal === 'guide'}>
      {#if modal === 'levels'}<HandLevels />
      {:else if modal === 'deck'}<DeckView />
      {:else if modal === 'plan'}<RunPlan />
      {:else if modal === 'guide'}<Guide />
      {:else}<TagTable />{/if}
    </Modal>
  {/if}
{/if}

<style>
  .layout {
    display: grid;
    grid-template-columns: 260px minmax(0, 1fr);
    gap: 14px;
    padding: 12px;
    max-width: 1400px;
    margin: 0 auto;
  }
  @media (max-width: 900px) {
    .layout {
      grid-template-columns: 1fr;
      padding: 8px;
      gap: 8px;
    }
  }
  .main {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    grid-template-areas: 'jokers cons' 'tags tags' 'stage stage';
    align-content: start;
    gap: 10px;
    min-width: 0;
  }
  .a-jokers { grid-area: jokers; min-width: 0; }
  .a-cons { grid-area: cons; }
  .a-tags { grid-area: tags; }
  .a-stage { grid-area: stage; }
  @media (max-width: 760px) {
    .main {
      grid-template-columns: 1fr;
      grid-template-areas: 'jokers' 'stage' 'cons' 'tags';
    }
  }
  /* The war table: felt, a gold inlay line and a faint rune circle. */
  .stage {
    --felt: 46, 92, 70;
    position: relative;
    isolation: isolate;
    overflow: hidden;
    min-height: 420px;
    padding: 14px;
    border-radius: 14px;
    background:
      radial-gradient(ellipse at 50% 35%, rgba(var(--felt), 0.5), transparent 70%),
      repeating-linear-gradient(0deg, rgba(255, 255, 255, 0.012) 0 1px, transparent 1px 3px),
      repeating-linear-gradient(90deg, rgba(0, 0, 0, 0.04) 0 1px, transparent 1px 3px),
      rgba(10, 22, 18, 0.75);
    border: 1px solid rgba(227, 184, 92, 0.35);
    box-shadow:
      inset 0 0 0 6px rgba(0, 0, 0, 0.35),
      inset 0 0 0 7px rgba(227, 184, 92, 0.18),
      inset 0 0 80px rgba(0, 0, 0, 0.6);
    transition: border-color 300ms ease;
  }
  .stage.boss {
    --felt: 120, 32, 44;
    background:
      radial-gradient(ellipse at 50% 35%, rgba(var(--felt), 0.5), transparent 70%),
      repeating-linear-gradient(0deg, rgba(255, 255, 255, 0.012) 0 1px, transparent 1px 3px),
      rgba(26, 10, 14, 0.8);
    border-color: rgba(220, 100, 110, 0.4);
  }
  .emblem {
    position: absolute;
    left: 50%;
    top: 50%;
    width: 360px;
    height: 360px;
    transform: translate(-50%, -50%);
    z-index: -1;
    pointer-events: none;
    opacity: 0.07;
    border-radius: 50%;
    background:
      radial-gradient(circle, transparent 55%, #e3b85c 55.5% 56.5%, transparent 57% 63%, #e3b85c 63.5% 64%, transparent 64.5%),
      repeating-conic-gradient(from 0deg, #e3b85c 0 2deg, transparent 2deg 30deg),
      radial-gradient(circle, #e3b85c 0 6%, transparent 6.5%);
    -webkit-mask: radial-gradient(circle, #000 8%, transparent 8.5% 54%, #000 54.5% 64.5%, transparent 65%);
    mask: radial-gradient(circle, #000 8%, transparent 8.5% 54%, #000 54.5% 64.5%, transparent 65%);
  }
  .phase {
    position: relative;
  }
  @media (max-width: 760px) {
    .stage {
      padding: 8px;
      min-height: 0;
    }
  }
</style>
