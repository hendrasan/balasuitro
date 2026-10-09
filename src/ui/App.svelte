<script lang="ts">
  import { game } from '../stores/game.svelte';
  import MainMenu from './screens/MainMenu.svelte';
  import RunScreen from './screens/RunScreen.svelte';
  import Collection from './screens/Collection.svelte';
  import Settings from './screens/Settings.svelte';
  import { enableSound } from './sound';

  const motion = $derived(game.settings.reducedMotion);

  $effect(() => {
    const root = document.documentElement;
    root.classList.toggle('reduced-motion', motion === 'on');
    root.classList.toggle('motion-system', motion === 'system');
  });

  // Browsers allow audio only after a user gesture.
  function firstGesture() {
    if (game.settings.sound) enableSound();
  }
</script>

<svelte:window onpointerdown={firstGesture} />

{#if game.screen === 'run' && game.run}
  <RunScreen />
{:else if game.screen === 'collection'}
  <Collection />
{:else if game.screen === 'settings'}
  <Settings />
{:else}
  <MainMenu />
{/if}

<div class="toasts" aria-live="polite">
  {#each game.toasts as t (t.id)}
    <div class="toast {t.kind}">{t.text}</div>
  {/each}
</div>

<style>
  .toasts {
    position: fixed;
    left: 50%;
    bottom: 16px;
    transform: translateX(-50%);
    display: flex;
    flex-direction: column;
    gap: 6px;
    align-items: center;
    z-index: 100;
    pointer-events: none;
    width: min(460px, calc(100vw - 32px));
  }
  .toast {
    padding: 8px 14px;
    border-radius: 8px;
    background: rgba(16, 22, 40, 0.95);
    border: 1px solid var(--line);
    font-size: 14px;
    box-shadow: var(--shadow);
    animation: up 0.2s var(--ease);
    text-align: center;
  }
  .toast.error {
    border-color: #e0666b;
    color: #ffc2c2;
  }
  .toast.good {
    border-color: var(--green);
  }
  @keyframes up {
    from { transform: translateY(8px); opacity: 0; }
  }
</style>
