/**
 * M22 standardised-setback module state (action-assessment rebuild,
 * Unit 3).
 *
 * The 26-measure developmental battery's M22 ("recovery after an
 * explained standardized setback"): when the prescribed relief-valve
 * fix is applied, the shop-stock seal cracks on seating — an EXPLAINED,
 * EXTERNAL, IDENTICAL-FOR-EVERYONE complication (brittle from cold
 * storage; never the participant's fault, and stated so). A clear
 * recovery route stays available: a fresh seal is stocked in the yard
 * supply crate.
 *
 * Window rules:
 * - The window opens at the setback reveal and M22 owns ONLY
 *   post-setback recovery behaviour (proto_m22_*): fetching the spare
 *   seal, returning, seating it, or leaving (a recorded, neutral fact —
 *   never an inferred emotion).
 * - The setback timing is standardised (always on the first seating
 *   attempt); no earlier outcome changes it.
 *
 * Identifiers provisional; no scoring; no affect inference.
 */

export const M22_OPPORTUNITY_ID = 'proto_m22_seal_setback';
export const M22_ENTRY_STATE_VERSION = 'm22-seal-setback-v1';

/** The standardised setback explanation (identical for everyone). */
export const M22_SETBACK_EXPLANATION =
  'The shop-stock seal cracks as it seats — brittle from cold storage, a known batch fault. Not a workmanship issue. A fresh seal is stocked in the Coolant Yard supply crate.';

interface M22State {
  /** The prescribed fix was attempted (first seating). */
  fix_attempted: boolean;
  /** The standardised setback was revealed (window opens). */
  setback_shown: boolean;
  /** Recovery steps, in order. */
  spare_seal_fetched: boolean;
  seal_seated: boolean;
  /** The participant left the Pump House with the window open. */
  left_during_window: boolean;
  closed: boolean;
}

function createInitialM22State(): M22State {
  return {
    fix_attempted: false,
    setback_shown: false,
    spare_seal_fetched: false,
    seal_seated: false,
    left_during_window: false,
    closed: false,
  };
}

export const m22State: M22State = createInitialM22State();

export function markM22FixAttempted() {
  m22State.fix_attempted = true;
}

export function markM22SetbackShown() {
  m22State.setback_shown = true;
}

export function m22WindowOpen(): boolean {
  return m22State.setback_shown && !m22State.closed;
}

export function markM22SpareSealFetched() {
  if (m22State.setback_shown) {
    m22State.spare_seal_fetched = true;
  }
}

/** Seats the fresh seal (recovery completion). False before fetch. */
export function seatM22Seal(): boolean {
  if (!m22State.setback_shown || !m22State.spare_seal_fetched) {
    return false;
  }

  m22State.seal_seated = true;
  m22State.closed = true;

  return true;
}

export function markM22LeftDuringWindow() {
  if (m22WindowOpen()) {
    m22State.left_during_window = true;
  }
}

export function m22Summary() {
  return {
    fix_attempted: m22State.fix_attempted,
    setback_shown: m22State.setback_shown,
    spare_seal_fetched: m22State.spare_seal_fetched,
    seal_seated: m22State.seal_seated,
    left_during_window: m22State.left_during_window,
    closed: m22State.closed,
  };
}

/** Test-only escape hatch. */
export function resetM22State() {
  Object.assign(m22State, createInitialM22State());
}
