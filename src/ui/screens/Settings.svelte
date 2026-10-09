<script lang="ts">
  import { game } from '../../stores/game.svelte';
  import { enableSound } from '../sound';

  let importError = $state<string | null>(null);
  let confirmReset = $state(false);
  let confirmAbandon = $state(false);
  const s = $derived(game.profile.settings);

  function exportSave() {
    const blob = new Blob([game.exportJson()], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `stars-of-destiny-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }

  async function importSave(e: Event) {
    const input = e.currentTarget as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;
    const err = game.importJson(await file.text());
    importError = err;
    if (!err) game.toast('Save imported', 'good');
  }

  function toggleSound(on: boolean) {
    if (on) enableSound();
    game.updateSettings({ sound: on });
  }
</script>

<div class="settings">
  <header>
    <button class="btn small" type="button" onclick={() => (game.screen = 'menu')}>◀ Back</button>
    <h1 class="display">Settings</h1>
  </header>

  <section class="panel">
    <h2 class="display">Animation</h2>
    <label class="row">
      <span>Scoring speed</span>
      <select value={String(s.speed)} onchange={(e) => game.updateSettings({ speed: Number(e.currentTarget.value) })}>
        <option value="0.5">Slow</option><option value="1">Normal</option><option value="2">Fast</option><option value="4">Very fast</option>
      </select>
    </label>
    <label class="row">
      <span>Skip scoring animation</span>
      <input type="checkbox" checked={s.skipAnimations} onchange={(e) => game.updateSettings({ skipAnimations: e.currentTarget.checked })} />
    </label>
    <label class="row">
      <span>Reduced motion</span>
      <select value={s.reducedMotion} onchange={(e) => game.updateSettings({ reducedMotion: e.currentTarget.value as 'system' | 'on' | 'off' })}>
        <option value="system">Follow system</option><option value="on">On</option><option value="off">Off</option>
      </select>
    </label>
    <label class="row">
      <span>Sound effects</span>
      <input type="checkbox" checked={s.sound} onchange={(e) => toggleSound(e.currentTarget.checked)} />
    </label>
  </section>

  <section class="panel">
    <h2 class="display">Save data</h2>
    <p class="muted">Progress is saved in this browser. Export a file to back it up or to move it to another device.</p>
    <div class="buttons">
      <button class="btn" type="button" onclick={exportSave}>Export save</button>
      <label class="btn file">
        Import save
        <input type="file" accept="application/json,.json" onchange={importSave} />
      </label>
    </div>
    {#if importError}<p class="error" role="alert">Import failed: {importError}</p>{/if}
    <div class="buttons">
      {#if game.run}
        <button class="btn danger" type="button" onclick={() => (confirmAbandon ? (game.endRun(), (confirmAbandon = false)) : (confirmAbandon = true))}>
          {confirmAbandon ? 'Click again to abandon the run' : 'Abandon current run'}
        </button>
      {/if}
      <button class="btn danger" type="button" onclick={() => (confirmReset ? (game.resetProfile(), (confirmReset = false), game.toast('Profile reset')) : (confirmReset = true))}>
        {confirmReset ? 'Click again: erase everything' : 'Reset profile'}
      </button>
    </div>
  </section>

  <section class="panel">
    <h2 class="display">Lifetime</h2>
    <dl>
      <dt>Runs</dt><dd>{game.profile.stats.runs}</dd>
      <dt>Wins</dt><dd>{game.profile.stats.wins}</dd>
      <dt>Best chapter</dt><dd>{game.profile.stats.bestAnte}</dd>
      <dt>Bosses defeated</dt><dd>{game.profile.stats.bossesDefeated}</dd>
      <dt>Hands played</dt><dd>{game.profile.stats.handsPlayed}</dd>
      <dt>Best hand</dt><dd>{game.profile.stats.bestHand.toLocaleString('en-US')}</dd>
    </dl>
  </section>
</div>

<style>
  .settings {
    max-width: 640px;
    margin: 0 auto;
    padding: 16px;
    display: flex;
    flex-direction: column;
    gap: 14px;
  }
  header {
    display: flex;
    align-items: center;
    gap: 14px;
  }
  h1 {
    margin: 0;
    color: var(--gold);
  }
  section {
    padding: 14px 16px;
  }
  h2 {
    margin: 0 0 8px;
    font-size: 17px;
    color: var(--gold);
  }
  .row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    min-height: 44px;
    border-top: 1px solid rgba(255, 255, 255, 0.06);
  }
  select {
    min-height: 36px;
    background: var(--bg-2);
    color: var(--ink);
    border: 1px solid var(--line);
    border-radius: 6px;
  }
  input[type='checkbox'] {
    width: 22px;
    height: 22px;
    accent-color: var(--gold);
  }
  .buttons {
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
    margin: 8px 0;
  }
  .file input {
    display: none;
  }
  .file {
    display: inline-flex;
    align-items: center;
  }
  .error {
    color: #ff8a7a;
  }
  dl {
    display: grid;
    grid-template-columns: 1fr auto;
    gap: 4px;
    margin: 0;
  }
  dd {
    margin: 0;
    font-weight: 700;
  }
</style>
