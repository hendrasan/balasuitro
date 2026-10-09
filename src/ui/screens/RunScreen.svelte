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
  import BlindSelect from './run/BlindSelect.svelte';
  import RoundView from './run/RoundView.svelte';
  import CashOut from './run/CashOut.svelte';
  import Shop from './run/Shop.svelte';
  import PackView from './run/PackView.svelte';
  import EndScreen from './run/EndScreen.svelte';

  type ModalKind = 'levels' | 'deck' | 'plan' | 'tags';
  let modal = $state<ModalKind | null>(null);
  const TITLES: Record<ModalKind, string> = { levels: 'Hand Levels', deck: 'Your Deck', plan: 'Campaign', tags: 'Army Tags' };

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
      </section>
    </main>
  </div>
  <InspectPanel />
  {#if modal}
    <Modal title={TITLES[modal]} onclose={() => (modal = null)} wide={modal === 'deck' || modal === 'tags'}>
      {#if modal === 'levels'}<HandLevels />
      {:else if modal === 'deck'}<DeckView />
      {:else if modal === 'plan'}<RunPlan />
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
  .stage {
    min-height: 420px;
    padding: 14px;
    border-radius: 14px;
    background:
      radial-gradient(ellipse at 50% 40%, rgba(46, 92, 70, 0.35), transparent 70%),
      rgba(10, 20, 18, 0.55);
    border: 1px solid rgba(120, 170, 130, 0.2);
    box-shadow: inset 0 0 60px rgba(0, 0, 0, 0.5);
  }
  .stage.boss {
    background:
      radial-gradient(ellipse at 50% 40%, rgba(110, 30, 40, 0.35), transparent 70%),
      rgba(24, 10, 12, 0.6);
    border-color: rgba(200, 90, 100, 0.25);
  }
  @media (max-width: 760px) {
    .stage {
      padding: 8px;
      min-height: 0;
    }
  }
</style>
