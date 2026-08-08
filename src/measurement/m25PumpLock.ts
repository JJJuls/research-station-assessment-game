/**
 * M25 pump-interlock repetition module state (action-assessment
 * rebuild, Unit 4).
 *
 * The 26-measure developmental battery's M25 ("unchanged repetition
 * after a salient mechanical lock"): restarting the repaired coolant
 * pump. The prime-cycle control WORKS for a standardised number of
 * cycles (visible pressure gains), then a SALIENT safety interlock
 * engages: the same control becomes objectively ineffective, states so
 * on every press, and a clearly visible different control (the
 * interlock breaker reset) is available beside it the whole time.
 *
 * Window rules:
 * - M25 owns ONLY unchanged prime presses AFTER the lock engaged
 *   (proto_m25_* family). The useful cycles are context, not evidence.
 * - The lock timing is standardised (always after the same cycle
 *   count); no earlier outcome changes it. Debounce/auto-repeat is the
 *   host prompt layer's existing responsibility.
 * - Separation: nothing here is shared with M24 (recycler) or M26
 *   (reclaimed sector), the Q23 rig, the Q21/Q26 repair streams, or the
 *   Q27 utility-stop module. All identifiers provisional; no scoring.
 */

export const M25_OPPORTUNITY_ID = 'proto_m25_pump_interlock';
export const M25_ENTRY_STATE_VERSION = 'm25-pump-interlock-v1';

/** Useful prime cycles before the interlock (fixed for everyone). */
export const M25_USEFUL_CYCLES = 3;

/** Pressure readout after each useful cycle (fixed presentation). */
export const M25_CYCLE_READOUTS = [
  'Prime cycle 1 complete — loop pressure 55% and climbing.',
  'Prime cycle 2 complete — loop pressure 78% and climbing.',
  'Prime cycle 3 complete — loop pressure 96%. SAFETY INTERLOCK ENGAGED: primes are locked out until the breaker is reset.',
] as const;

/** The standardised lock statement, repeated on every post-lock prime. */
export const M25_LOCK_STATEMENT =
  'Interlock active — the prime control is locked out and does nothing. Reset the interlock breaker (beside the prime control) to continue.';

export interface M25State {
  useful_cycles: number;
  lock_engaged: boolean;
  /** Unchanged post-lock prime presses (the raw M25 record). */
  post_lock_primes: number;
  reset_done: boolean;
  running: boolean;
}

function createInitialM25State(): M25State {
  return {
    useful_cycles: 0,
    lock_engaged: false,
    post_lock_primes: 0,
    reset_done: false,
    running: false,
  };
}

export const m25State: M25State = createInitialM25State();

/**
 * One press of the prime control. Before the lock: a real cycle with a
 * visible result (the readout), the lock engaging on the final one.
 * After the lock: objectively ineffective, recorded as an unchanged
 * repetition, always answered with the same lock statement.
 */
export function pressM25Prime():
  | {
      kind: 'cycle';
      cycleNumber: number;
      readout: string;
      lockEngaged: boolean;
    }
  | { kind: 'locked'; postLockPresses: number }
  | { kind: 'running' } {
  if (m25State.running) {
    return { kind: 'running' };
  }

  if (m25State.lock_engaged && !m25State.reset_done) {
    m25State.post_lock_primes += 1;

    return { kind: 'locked', postLockPresses: m25State.post_lock_primes };
  }

  m25State.useful_cycles += 1;

  const readout = M25_CYCLE_READOUTS[m25State.useful_cycles - 1] ?? '';

  if (m25State.useful_cycles >= M25_USEFUL_CYCLES) {
    m25State.lock_engaged = true;
  }

  return {
    kind: 'cycle',
    cycleNumber: m25State.useful_cycles,
    readout,
    lockEngaged: m25State.lock_engaged,
  };
}

export function m25WindowOpen(): boolean {
  return m25State.lock_engaged && !m25State.reset_done;
}

/** The visible different strategy: resetting the breaker. */
export function resetM25Interlock(): boolean {
  if (!m25State.lock_engaged || m25State.reset_done) {
    return false;
  }

  m25State.reset_done = true;
  m25State.running = true;

  return true;
}

export function m25Summary() {
  return {
    useful_cycles: m25State.useful_cycles,
    lock_engaged: m25State.lock_engaged,
    post_lock_primes: m25State.post_lock_primes,
    reset_done: m25State.reset_done,
    running: m25State.running,
  };
}

/** Test-only escape hatch. */
export function resetM25State() {
  Object.assign(m25State, createInitialM25State());
}
