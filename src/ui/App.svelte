<script lang="ts">
  import { game } from '../stores/game.svelte';
  import MainMenu from './screens/MainMenu.svelte';
  import RunScreen from './screens/RunScreen.svelte';
  import Collection from './screens/Collection.svelte';
  import Settings from './screens/Settings.svelte';
  import Castle from './screens/Castle.svelte';
  import { enableSound } from './sound';
  import { fly } from 'svelte/transition';
  import { cubicOut } from 'svelte/easing';
  import { dur } from './motion';

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
{:else if game.screen === 'castle'}
  <Castle />
{:else}
  <MainMenu />
{/if}

<div class="toasts" aria-live="polite">
  {#each game.toasts as t (t.id)}
    <div class="toast {t.kind}" in:fly={{ y: 16, duration: dur(200), easing: cubicOut }} out:fly={{ y: 16, duration: dur(160), easing: cubicOut }}>{t.text}</div>
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
    text-align: center;
  }
  .toast.error {
    border-color: #e0666b;
    color: #ffc2c2;
  }
  .toast.good {
    border-color: var(--green);
  }
</style>
