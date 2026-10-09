// Thin rune-based wrapper around the engine. Holds the profile, the run snapshot,
// UI selection and the scoring animation. All rules live in src/engine.
import { CONFIG } from '../engine/config';
import { buildFacility, buildRunModifiers, renownForRun } from '../engine/castle';
import { computePassives } from '../engine/passives';
import { randomSeed } from '../engine/rng';
import { applyAction, newRun, type Action } from '../engine/run';
import {
  buildExport, loadProfile, loadRun, mergeDiscoveries, newProfile, parseImport, saveProfile, saveRun,
  type Profile, type Settings,
} from '../engine/save';
import type { Passives, RunState, ScoreEvent, ScoreResult } from '../engine/state';
import type { HandType } from '../engine/hands';
import { sfx, type Sfx } from '../ui/sound';
import { browserStorage } from './storage';

export type Screen = 'menu' | 'run' | 'collection' | 'settings' | 'castle';

export interface ScoringAnim {
  result: ScoreResult;
  /** The run as it was before the hand, used for display during the replay. */
  prev: RunState;
  /** Index of the current event; events.length = showing the total. */
  step: number;
}

export interface Toast {
  id: number;
  text: string;
  kind: 'info' | 'error' | 'good';
}

const storage = browserStorage();
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

class Game {
  profile = $state<Profile>(loadProfile(storage));
  run = $state.raw<RunState | null>(loadRun(storage));
  // A refresh resumes the run in progress.
  screen = $state<Screen>(this.run && this.run.phase !== 'gameover' ? 'run' : 'menu');
  selected = $state<number[]>([]);
  anim = $state.raw<ScoringAnim | null>(null);
  toasts = $state<Toast[]>([]);
  private skipAnim = false;
  private toastId = 0;

  /** What to draw: the pre-hand snapshot during a scoring replay, else the live run. */
  view = $derived<RunState | null>(this.anim ? this.anim.prev : this.run);
  passives = $derived<Passives | null>(this.view ? computePassives(this.view) : null);

  get settings(): Settings {
    return this.profile.settings;
  }

  reducedMotion(): boolean {
    const s = this.settings.reducedMotion;
    if (s === 'on') return true;
    if (s === 'off') return false;
    return typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  sound(name: Sfx): void {
    sfx(name, this.settings.sound);
  }

  toast(text: string, kind: Toast['kind'] = 'info'): void {
    const id = ++this.toastId;
    this.toasts = [...this.toasts.slice(-4), { id, text, kind }];
    setTimeout(() => (this.toasts = this.toasts.filter((t) => t.id !== id)), kind === 'error' ? 2600 : 3200);
  }

  // ------------------------------------------------------------ run lifecycle

  startRun(seed?: string): void {
    if (this.run && this.run.phase !== 'gameover') this.recordRun(this.run);
    const s = (seed ?? '').trim().toUpperCase() || randomSeed();
    const p = this.profile;
    this.run = newRun(s, { owned: p.collection.owned, seen: p.collection.seen, unlocked: p.unlocks }, buildRunModifiers(p.castle, p.stats.handPlays));
    this.selected = [];
    this.anim = null;
    saveRun(storage, this.run);
    this.screen = 'run';
  }

  /** Leave the current run and count it in lifetime stats. */
  endRun(): void {
    if (this.run && this.run.phase !== 'gameover') this.recordRun(this.run);
    this.run = null;
    this.anim = null;
    this.selected = [];
    saveRun(storage, null);
    this.screen = 'menu';
  }

  /** Count a finished run: lifetime stats and Renown for the Castle. */
  private recordRun(run: RunState): void {
    const renown = renownForRun(run);
    const st = { ...this.profile.stats };
    st.runs += 1;
    st.bestAnte = Math.max(st.bestAnte, run.ante);
    st.bossesDefeated += run.stats.bossesDefeated;
    st.handsPlayed += run.stats.handsPlayed;
    st.bestHand = Math.max(st.bestHand, run.stats.bestHand);
    const plays = { ...st.handPlays };
    for (const [h, lv] of Object.entries(run.handLevels)) {
      if (lv.played) plays[h as HandType] = (plays[h as HandType] ?? 0) + lv.played;
    }
    st.handPlays = plays;
    this.setProfile({ ...this.profile, stats: st, castle: { ...this.profile.castle, renown: this.profile.castle.renown + renown } });
    if (renown > 0) this.toast(`+${renown} Renown for the Castle`, 'good');
  }

  build(id: string): boolean {
    const res = buildFacility(this.profile.castle, this.profile.collection.owned, id);
    if (!res.ok) {
      this.toast(res.error, 'error');
      return false;
    }
    this.setProfile({ ...this.profile, castle: res.castle });
    this.sound('buy');
    return true;
  }

  setProfile(p: Profile): void {
    this.profile = p;
    saveProfile(storage, $state.snapshot(this.profile) as Profile);
  }

  updateSettings(patch: Partial<Settings>): void {
    this.setProfile({ ...this.profile, settings: { ...this.profile.settings, ...patch } });
  }

  // ------------------------------------------------------------ actions

  dispatch(a: Action): boolean {
    if (!this.run || this.anim) return false;
    const next = structuredClone(this.run);
    const res = applyAction(next, a);
    if (!res.ok) {
      this.toast(res.error ?? 'Not allowed', 'error');
      return false;
    }
    const prev = this.run;
    this.run = next;
    this.afterChange(prev, next);
    return true;
  }

  private afterChange(prev: RunState, next: RunState): void {
    saveRun(storage, next);
    const merged = mergeDiscoveries(this.profile, next);
    if (merged !== this.profile) this.setProfile(merged);
    const fresh = next.logCount - prev.logCount;
    if (fresh > 0) for (const line of next.log.slice(-Math.min(fresh, 3))) this.toast(line);
    if (prev.phase !== 'gameover' && next.phase === 'gameover') {
      this.recordRun(next);
      this.sound('lose');
    }
    if (prev.phase !== 'victory' && next.phase === 'victory') {
      this.setProfile({ ...this.profile, stats: { ...this.profile.stats, wins: this.profile.stats.wins + 1 } });
      this.sound('win');
    }
    if (next.phase === 'cashout' && prev.phase === 'round') this.sound('win');
    // Drop selections that are no longer in hand.
    const ids = new Set(next.phase === 'pack' ? (next.pack?.hand ?? []) : next.hand);
    this.selected = this.selected.filter((id) => ids.has(id));
  }

  toggleSelect(id: number): void {
    if (this.anim) return;
    if (this.selected.includes(id)) this.selected = this.selected.filter((x) => x !== id);
    else if (this.selected.length < CONFIG.maxSelect) {
      this.selected = [...this.selected, id];
      this.sound('select');
    }
  }

  clearSelection(): void {
    this.selected = [];
  }

  play(): void {
    if (!this.run || this.anim || this.selected.length === 0) return;
    const prev = this.run;
    if (!this.dispatch({ type: 'play', cardIds: this.selected })) return;
    this.selected = [];
    this.sound('play');
    const result = this.run?.lastScore;
    if (!result || this.settings.skipAnimations || this.reducedMotion()) return;
    void this.replay(result, prev);
  }

  discard(): void {
    if (this.selected.length === 0) return;
    if (this.dispatch({ type: 'discard', cardIds: this.selected })) this.selected = [];
  }

  skipReplay(): void {
    this.skipAnim = true;
  }

  private eventDelay(e: ScoreEvent): number {
    const base = e.kind === 'base' ? 450 : e.kind === 'msg' || e.kind === 'retrigger' ? 380 : e.kind === 'xmult' ? 420 : 300;
    return base / Math.max(0.25, this.settings.speed);
  }

  private async replay(result: ScoreResult, prev: RunState): Promise<void> {
    this.skipAnim = false;
    this.anim = { result, prev, step: -1 };
    await sleep(250 / this.settings.speed);
    for (let i = 0; i < result.events.length; i++) {
      if (this.skipAnim || !this.anim) break;
      this.anim = { ...this.anim, step: i };
      const e = result.events[i];
      if (e.kind === 'chips') this.sound('chips');
      else if (e.kind === 'mult') this.sound('mult');
      else if (e.kind === 'xmult') this.sound('xmult');
      else if (e.kind === 'money') this.sound('money');
      await sleep(this.eventDelay(e));
    }
    if (this.anim) this.anim = { ...this.anim, step: result.events.length };
    if (!this.skipAnim) await sleep(900 / this.settings.speed);
    this.anim = null;
  }

  // ------------------------------------------------------------ export / import

  exportJson(): string {
    return JSON.stringify(buildExport($state.snapshot(this.profile) as Profile, this.run), null, 2);
  }

  importJson(text: string): string | null {
    const res = parseImport(text);
    if (!res.ok) return res.error;
    this.anim = null;
    this.selected = [];
    this.setProfile(res.data.profile);
    this.run = res.data.run ?? null;
    saveRun(storage, this.run);
    return null;
  }

  resetProfile(): void {
    this.setProfile({ ...newProfile(), settings: this.profile.settings });
    this.run = null;
    saveRun(storage, null);
  }
}

export const game = new Game();
