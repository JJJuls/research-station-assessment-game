/**
 * Q27 Utility Bot utility-stop module state (SA-2 adopted design; Unit 3).
 *
 * A dedicated diagnostic-assist task with a bounded useful sequence
 * (three cycles with visible utility), then a standardised explicit
 * utility-stop signal stating that further cycles return no new
 * information and no additional benefit. The PRIMARY WINDOW begins at
 * that signal: continuing and stopping are equally accessible and
 * neutrally framed, and stopping immediately is a fully valid outcome.
 *
 * Independence (SA-2): its own state container and proto_* event family;
 * reads and writes NOTHING of Hazard, Side Repair, Q12, or Q29/Q31.
 * Event names are internal/provisional; no scoring exists.
 */

export const Q27_OPPORTUNITY_ID = 'proto_q27_utility_stop';
export const Q27_ENTRY_STATE_VERSION = 'q27-utility-bay-v1';

/** Useful cycles before the utility-stop signal (fixed for everyone). */
export const Q27_USEFUL_CYCLES = 3;

/** Per-cycle useful results shown during the bounded useful sequence. */
export const Q27_CYCLE_RESULTS = [
  'Cycle 1 complete — 2 sensor faults isolated.',
  'Cycle 2 complete — 1 further fault isolated.',
  'Cycle 3 complete — sweep finished. 0 new faults.',
] as const;

/**
 * The standardised utility-stop signal (identical for every participant;
 * SA-2 credibility requirement: no new information AND no benefit).
 */
export const Q27_STOP_SIGNAL =
  'Diagnostic complete. Further cycles will return no new information and no additional operational benefit.';

export interface Q27State {
  /** Useful cycles completed (0-3). */
  useful_cycles_done: number;
  /** True once the utility-stop signal has been displayed. */
  stop_signal_shown: boolean;
  /** Post-signal cycles run (the raw continuation record). */
  extra_cycles: number;
  /** True once the rationale was inspected after the signal. */
  rationale_inspected: boolean;
  /** True once the session was explicitly closed after the signal. */
  closed: boolean;
  /** True if the player left the bay with the window open (a valid stop). */
  left_during_window: boolean;
}

function createInitialQ27State(): Q27State {
  return {
    useful_cycles_done: 0,
    stop_signal_shown: false,
    extra_cycles: 0,
    rationale_inspected: false,
    closed: false,
    left_during_window: false,
  };
}

export const q27State: Q27State = createInitialQ27State();

export function q27WindowOpen(): boolean {
  return q27State.stop_signal_shown && !q27State.closed;
}

export function completeUsefulCycle(): string {
  const result = Q27_CYCLE_RESULTS[q27State.useful_cycles_done] ?? '';

  if (q27State.useful_cycles_done < Q27_USEFUL_CYCLES) {
    q27State.useful_cycles_done += 1;
  }

  return result;
}

export function markStopSignalShown() {
  q27State.stop_signal_shown = true;
}

export function completeExtraCycle(): number {
  q27State.extra_cycles += 1;

  return q27State.extra_cycles;
}

export function markRationaleInspected() {
  q27State.rationale_inspected = true;
}

export function closeDiagnostic() {
  q27State.closed = true;
}

export function markLeftDuringWindow() {
  if (q27WindowOpen()) {
    q27State.left_during_window = true;
  }
}

/** Test-only escape hatch. */
export function resetQ27State() {
  Object.assign(q27State, createInitialQ27State());
}
