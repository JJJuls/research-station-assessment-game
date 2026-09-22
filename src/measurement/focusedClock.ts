/**
 * Focused clock — the ONE observation-time model of the M01–M26 protocol
 * (Unit 1).
 *
 * "Pause focused observation time during documented loss of focus, explicit
 * pauses, or unusable controls. Reading, deciding, or waiting while the task
 * is usable remains observation time." (specification, shared rules)
 *
 * The clock therefore counts wall time between `start` and `stop` MINUS
 * every interval during which at least one pause cause is active; each
 * cause's excluded time is kept by cause so an export can separate
 * `focused_ms`, `wall_ms` and `excluded_ms` (per cause). Stillness in a
 * visible, usable task is never excluded. A cap is reported by
 * `capReached`; it is a censoring event for the caller, never an action.
 *
 * PURE class (no Phaser, no DOM). The browser bridge that feeds `focus_loss`
 * and `hidden` from `blur` / `visibilitychange` lives in `focusMonitor.ts`.
 */

export type PauseCause =
  | 'focus_loss'
  | 'hidden'
  | 'explicit_pause'
  | 'animation_lock'
  | 'loading'
  | 'unusable_controls'
  | 'surface_closed';

export const PAUSE_CAUSES: readonly PauseCause[] = [
  'focus_loss',
  'hidden',
  'explicit_pause',
  'animation_lock',
  'loading',
  'unusable_controls',
  'surface_closed',
];

export interface FocusedClockSnapshot {
  running: boolean;
  paused: boolean;
  active_causes: PauseCause[];
  focused_ms: number;
  wall_ms: number;
  /**
   * Excluded time BY CAUSE. Overlapping causes each carry the whole shared
   * interval (attribution, not partition), so Σ excluded_ms may exceed
   * `excluded_total_ms`; the total is always `wall_ms − focused_ms`.
   */
  excluded_ms: Record<PauseCause, number>;
  excluded_total_ms: number;
  started_at_ms: number | null;
  stopped_at_ms: number | null;
}

function zeroExcluded(): Record<PauseCause, number> {
  return {
    focus_loss: 0,
    hidden: 0,
    explicit_pause: 0,
    animation_lock: 0,
    loading: 0,
    unusable_controls: 0,
    surface_closed: 0,
  };
}

export class FocusedClock {
  private startedAtMs: number | null = null;
  private stoppedAtMs: number | null = null;
  private focusedAccumulatedMs = 0;
  /** Start of the current focused run (null while paused or not running). */
  private focusedRunStartMs: number | null = null;
  private readonly causes = new Set<PauseCause>();
  /** Start of the current paused interval (null while unpaused). */
  private pausedSinceMs: number | null = null;
  private readonly excluded = zeroExcluded();

  /**
   * Starts the clock. `initialCauses` lets a clock begin already paused
   * (e.g. the tab is hidden when the opportunity opens). Idempotent while
   * running.
   */
  start(nowMs: number, initialCauses: readonly PauseCause[] = []) {
    if (this.startedAtMs !== null && this.stoppedAtMs === null) {
      return;
    }

    // Causes recorded BEFORE the start (e.g. the focus monitor paused a
    // registered clock while the tab was hidden — before the first start
    // or while stopped) are kept: a clock never starts unpaused inside a
    // documented loss of focus.
    const carried = [...this.causes];

    this.startedAtMs = nowMs;
    this.stoppedAtMs = null;
    this.focusedAccumulatedMs = 0;
    this.causes.clear();
    this.pausedSinceMs = null;

    for (const cause of PAUSE_CAUSES) {
      this.excluded[cause] = 0;
    }

    for (const cause of [...carried, ...initialCauses]) {
      this.causes.add(cause);
    }

    if (this.causes.size > 0) {
      this.pausedSinceMs = nowMs;
      this.focusedRunStartMs = null;
    } else {
      this.focusedRunStartMs = nowMs;
    }
  }

  isRunning(): boolean {
    return this.startedAtMs !== null && this.stoppedAtMs === null;
  }

  isPaused(): boolean {
    return this.isRunning() && this.causes.size > 0;
  }

  activeCauses(): PauseCause[] {
    return [...this.causes];
  }

  /** Adds a pause cause; the first active cause stops focused time. */
  pause(cause: PauseCause, nowMs: number) {
    if (!this.isRunning()) {
      this.causes.add(cause);
      return;
    }

    if (this.causes.size === 0) {
      this.settleFocusedRun(nowMs);
      this.pausedSinceMs = nowMs;
    } else {
      // Attribute the interval so far to the causes that were active; the
      // new cause starts accruing only from now.
      this.settlePausedInterval(nowMs);
    }

    this.causes.add(cause);
  }

  /** Removes a pause cause; focused time resumes once no cause remains. */
  resume(cause: PauseCause, nowMs: number) {
    if (!this.causes.has(cause)) {
      return;
    }

    if (!this.isRunning()) {
      this.causes.delete(cause);
      return;
    }

    this.settlePausedInterval(nowMs);
    this.causes.delete(cause);

    if (this.causes.size === 0) {
      this.pausedSinceMs = null;
      this.focusedRunStartMs = nowMs;
    } else {
      this.pausedSinceMs = nowMs;
    }
  }

  /** Focused milliseconds so far (or at stop). */
  focusedMs(nowMs: number): number {
    if (this.startedAtMs === null) {
      return 0;
    }

    if (this.stoppedAtMs !== null || this.focusedRunStartMs === null) {
      return this.focusedAccumulatedMs;
    }

    return (
      this.focusedAccumulatedMs + Math.max(0, nowMs - this.focusedRunStartMs)
    );
  }

  /** Wall milliseconds between start and now/stop. */
  wallMs(nowMs: number): number {
    if (this.startedAtMs === null) {
      return 0;
    }

    const end = this.stoppedAtMs ?? nowMs;

    return Math.max(0, end - this.startedAtMs);
  }

  /** Excluded milliseconds by cause, including the open paused interval. */
  excludedMs(nowMs: number): Record<PauseCause, number> {
    const out = { ...this.excluded };

    if (this.isRunning() && this.pausedSinceMs !== null) {
      const open = Math.max(0, nowMs - this.pausedSinceMs);

      for (const cause of this.causes) {
        out[cause] += open;
      }
    }

    return out;
  }

  /** True once focused time has reached `capMs` (a censoring signal). */
  capReached(nowMs: number, capMs: number): boolean {
    return this.focusedMs(nowMs) >= capMs;
  }

  /** Focused milliseconds remaining before the cap (never negative). */
  remainingMs(nowMs: number, capMs: number): number {
    return Math.max(0, capMs - this.focusedMs(nowMs));
  }

  /** Stops the clock; later reads are frozen. Idempotent. */
  stop(nowMs: number) {
    if (!this.isRunning()) {
      return;
    }

    if (this.causes.size === 0) {
      this.settleFocusedRun(nowMs);
    } else {
      this.settlePausedInterval(nowMs);
      this.pausedSinceMs = null;
    }

    this.focusedRunStartMs = null;
    this.stoppedAtMs = nowMs;
  }

  snapshot(nowMs: number): FocusedClockSnapshot {
    return {
      running: this.isRunning(),
      paused: this.isPaused(),
      active_causes: this.activeCauses(),
      focused_ms: this.focusedMs(nowMs),
      wall_ms: this.wallMs(nowMs),
      excluded_ms: this.excludedMs(nowMs),
      excluded_total_ms: Math.max(
        0,
        this.wallMs(nowMs) - this.focusedMs(nowMs),
      ),
      started_at_ms: this.startedAtMs,
      stopped_at_ms: this.stoppedAtMs,
    };
  }

  private settleFocusedRun(nowMs: number) {
    if (this.focusedRunStartMs !== null) {
      this.focusedAccumulatedMs += Math.max(0, nowMs - this.focusedRunStartMs);
      this.focusedRunStartMs = null;
    }
  }

  private settlePausedInterval(nowMs: number) {
    if (this.pausedSinceMs === null) {
      return;
    }

    const interval = Math.max(0, nowMs - this.pausedSinceMs);

    for (const cause of this.causes) {
      this.excluded[cause] += interval;
    }

    this.pausedSinceMs = nowMs;
  }
}
