<script lang="ts">
  import type { Snippet } from 'svelte';

  interface Props {
    title: string;
    onclose: () => void;
    children: Snippet;
    wide?: boolean;
  }
  let { title, onclose, children, wide = false }: Props = $props();

  function key(e: KeyboardEvent) {
    if (e.key === 'Escape') {
      e.stopPropagation();
      onclose();
    }
  }
</script>

<svelte:window onkeydown={key} />

<div class="backdrop" role="presentation" onclick={(e) => e.target === e.currentTarget && onclose()}>
  <div class="panel modal" class:wide role="dialog" aria-modal="true" aria-label={title}>
    <header>
      <h2>{title}</h2>
      <button class="x" type="button" aria-label="Close" onclick={onclose}>×</button>
    </header>
    <div class="body">
      {@render children()}
    </div>
  </div>
</div>

<style>
  .backdrop {
    position: fixed;
    inset: 0;
    background: rgba(3, 5, 12, 0.72);
    display: grid;
    place-items: center;
    z-index: 80;
    padding: 16px;
    animation: fade 0.15s ease-out;
  }
  .modal {
    width: min(560px, 100%);
    max-height: calc(100vh - 32px);
    display: flex;
    flex-direction: column;
    background: rgba(14, 20, 38, 0.98);
    animation: rise 0.2s var(--ease);
  }
  .modal.wide {
    width: min(900px, 100%);
  }
  header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 12px 16px;
    border-bottom: 1px solid var(--line);
  }
  h2 {
    margin: 0;
    font-size: 20px;
    color: var(--gold);
  }
  .x {
    background: none;
    border: none;
    font-size: 26px;
    cursor: pointer;
    color: var(--ink-dim);
    width: 40px;
    height: 40px;
  }
  .body {
    padding: 12px 16px 16px;
    overflow: auto;
  }
  @keyframes fade {
    from { opacity: 0; }
  }
  @keyframes rise {
    from { transform: translateY(12px); opacity: 0; }
  }
</style>
