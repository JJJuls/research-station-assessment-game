/**
 * Focus monitor — the browser bridge of the focused clock (Unit 1).
 *
 * Subscribes once to `window` blur/focus and `document` visibilitychange
 * and forwards them as `focus_loss` / `hidden` pause causes to every
 * registered `FocusedClock`. A clock registered while the page is already
 * unfocused or hidden starts paused. Never records anything itself: the
 * session-level focus-loss covariate stays in `DataQualityTracker`; this
 * module only shapes item-owned observation time.
 *
 * Safe without a DOM (tests, SSR): every call is a no-op there.
 */
import { FocusedClock, type PauseCause } from './focusedClock';

const clocks = new Set<FocusedClock>();
let installed = false;
let focusLost = false;
let hidden = false;

function now(): number {
  return Date.now();
}

function apply(cause: PauseCause, active: boolean) {
  const at = now();

  for (const clock of clocks) {
    if (active) {
      clock.pause(cause, at);
    } else {
      clock.resume(cause, at);
    }
  }
}

const onBlur = () => {
  focusLost = true;
  apply('focus_loss', true);
};

const onFocus = () => {
  focusLost = false;
  apply('focus_loss', false);
};

const onVisibility = () => {
  hidden = typeof document !== 'undefined' && document.hidden;
  apply('hidden', hidden);
};

/** Installs the listeners once (idempotent; no-op without a DOM). */
export function installFocusMonitor() {
  if (installed || typeof window === 'undefined') {
    return;
  }

  window.addEventListener('blur', onBlur);
  window.addEventListener('focus', onFocus);
  document.addEventListener('visibilitychange', onVisibility);
  hidden = document.hidden;
  focusLost = typeof document.hasFocus === 'function' && !document.hasFocus();
  installed = true;
}

/** Current pause causes the page environment imposes. */
export function environmentPauseCauses(): PauseCause[] {
  const causes: PauseCause[] = [];

  if (focusLost) {
    causes.push('focus_loss');
  }

  if (hidden) {
    causes.push('hidden');
  }

  return causes;
}

/**
 * Creates a clock, starts it under the current environment causes and
 * keeps it subscribed until `releaseFocusedClock`.
 */
export function startFocusedClock(nowMs: number = now()): FocusedClock {
  installFocusMonitor();

  const clock = new FocusedClock();

  clock.start(nowMs, environmentPauseCauses());
  clocks.add(clock);

  return clock;
}

/** Registers an existing clock for environment pause causes. */
export function registerFocusedClock(clock: FocusedClock) {
  installFocusMonitor();
  clocks.add(clock);

  for (const cause of environmentPauseCauses()) {
    clock.pause(cause, now());
  }
}

/** Stops forwarding environment causes to the clock (does not stop it). */
export function releaseFocusedClock(clock: FocusedClock) {
  clocks.delete(clock);
}

/** Test-only escape hatch. */
export function resetFocusMonitor() {
  if (installed && typeof window !== 'undefined') {
    window.removeEventListener('blur', onBlur);
    window.removeEventListener('focus', onFocus);
    document.removeEventListener('visibilitychange', onVisibility);
  }

  installed = false;
  focusLost = false;
  hidden = false;
  clocks.clear();
}
