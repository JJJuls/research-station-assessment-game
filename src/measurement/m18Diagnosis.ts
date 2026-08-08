/**
 * M18 pressure-diagnosis module state (action-assessment rebuild,
 * Unit 3).
 *
 * The 26-measure developmental battery's M18 ("evidence-consistent
 * logical diagnosis"): after the manifold is rebuilt (M13) the test
 * flow exposes ONE standardised residual fault, and the participant
 * diagnoses it from checkable evidence.
 *
 * Independence rules implemented here:
 * - The fault and every reading are FIXED CONSTANTS, identical for all
 *   participants and fully independent of how the M13 puzzle went; the
 *   correct answer cannot be inferred from puzzle success (the puzzle
 *   run is sealed and valid — the fault sits downstream of it).
 * - M18 owns ONLY evidence checks and the diagnosis submission
 *   (proto_m18_*). It reuses no M13 placement/rotation/submission act.
 * - Diagnosis option order is counterbalanced per session and recorded;
 *   correctness is recorded as a raw fact, never surfaced as praise.
 *
 * Identifiers are provisional; no scoring exists here.
 */

export const M18_OPPORTUNITY_ID = 'proto_m18_pressure_diagnosis';
export const M18_ENTRY_STATE_VERSION = 'm18-pressure-v1';

/** The standardised post-rebuild evidence set (identical for all). */
export const M18_EVIDENCE = [
  {
    evidence_id: 'gauge_feed',
    label: 'Feed gauge (A)',
    reading: 'Feed line A: 96 kPa — inside the nominal band.',
  },
  {
    evidence_id: 'gauge_manifold',
    label: 'Manifold outlet gauge (B)',
    reading: 'Manifold outlet B: 94 kPa — inside the nominal band.',
  },
  {
    evidence_id: 'gauge_intake',
    label: 'Pump intake gauge (C)',
    reading: 'Pump intake C: 58 kPa — far below the nominal band.',
  },
  {
    evidence_id: 'valve_panel',
    label: 'Valve state panel',
    reading:
      'Isolation valve: OPEN and seated. Relief valve (between manifold and intake): indicator cycling — seat not holding steady.',
  },
] as const;

export type M18EvidenceId = (typeof M18_EVIDENCE)[number]['evidence_id'];

export interface M18DiagnosisOption {
  option_id: string;
  label: string;
  correct: boolean;
}

/** The standardised diagnosis options (order counterbalanced by host). */
export const M18_OPTIONS: readonly M18DiagnosisOption[] = [
  {
    option_id: 'feed_restriction',
    label: 'Feed supply restriction upstream of the manifold.',
    correct: false,
  },
  {
    option_id: 'relief_valve_leak',
    label: 'Relief valve leaking between the manifold and the pump intake.',
    correct: true,
  },
  {
    option_id: 'manifold_leak',
    label: 'Leak inside the rebuilt manifold run.',
    correct: false,
  },
  {
    option_id: 'pump_impeller',
    label: 'Pump impeller failure inside the pump housing.',
    correct: false,
  },
] as const;

/** Counterbalanced presentation orders (recorded per session). */
export const M18_OPTION_ORDERS: readonly (readonly number[])[] = [
  [0, 1, 2, 3],
  [1, 2, 3, 0],
  [2, 3, 0, 1],
  [3, 0, 1, 2],
] as const;

interface M18State {
  /** Test flow ran and the residual fault presented. */
  fault_presented: boolean;
  /** Evidence sources inspected, in order (repeats recorded once). */
  evidence_checked: M18EvidenceId[];
  /** The submitted diagnosis (single final act), if any. */
  submitted_option_id: string | null;
  submitted_correct: boolean | null;
}

function createInitialM18State(): M18State {
  return {
    fault_presented: false,
    evidence_checked: [],
    submitted_option_id: null,
    submitted_correct: null,
  };
}

export const m18State: M18State = createInitialM18State();

export function markM18FaultPresented() {
  m18State.fault_presented = true;
}

export function recordM18EvidenceCheck(evidenceId: M18EvidenceId) {
  if (!m18State.evidence_checked.includes(evidenceId)) {
    m18State.evidence_checked.push(evidenceId);
  }
}

export function m18DiagnosisSubmitted(): boolean {
  return m18State.submitted_option_id !== null;
}

/**
 * Records the single final diagnosis. Returns the recorded fact, or
 * null when a diagnosis was already submitted (the window is one-shot).
 */
export function submitM18Diagnosis(
  optionId: string,
): { option_id: string; correct: boolean } | null {
  if (m18State.submitted_option_id !== null) {
    return null;
  }

  const option = M18_OPTIONS.find((entry) => entry.option_id === optionId);

  if (option === undefined) {
    throw new Error(`Unknown M18 diagnosis option: ${optionId}`);
  }

  m18State.submitted_option_id = option.option_id;
  m18State.submitted_correct = option.correct;

  return { option_id: option.option_id, correct: option.correct };
}

export function m18Summary() {
  return {
    fault_presented: m18State.fault_presented,
    evidence_checks: m18State.evidence_checked.length,
    submitted_option_id: m18State.submitted_option_id,
    submitted_correct: m18State.submitted_correct,
  };
}

/** Test-only escape hatch. */
export function resetM18State() {
  Object.assign(m18State, createInitialM18State());
  m18State.evidence_checked = [];
}
