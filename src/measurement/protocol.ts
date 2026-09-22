/**
 * Station 080 M01–M26 measurement protocol — versions, enumerations and
 * pilot settings shared by every item window and by the read-only feature
 * extractor (Unit 1 of the M01–M26 implementation run).
 *
 * PURE module (no Phaser, no import.meta): Node-importable for pure tests.
 *
 * Scientific boundary: every identifier here is a PROVISIONAL prototype
 * contract — `proto_*` event families stay candidates until the research
 * owner promotes them into `docs/research/event-schema.md`, and every
 * derived feature is a versioned prototype output, never a validated score.
 * Trial counts and the 15/30/60-second settings are selected pilot defaults,
 * not published validity thresholds (specification, "Rules shared by all 26
 * items"). Nothing here computes, weights or sums anything.
 */

/** Exact protocol release every measurement record carries. */
export const MEASUREMENT_PROTOCOL_VERSION = 'station080-m26-pilot-v1';

/** Version of the additive measurement payload (`measurement_features`). */
export const MEASUREMENT_SCHEMA_VERSION = '2026-09.m26.1';

/** Version of the machine-readable implementation register (registerV3). */
export const MEASUREMENT_REGISTER_VERSION = 'v3.0';

/** Version of the feature-extractor rule set (bumped with any rule change). */
export const FEATURE_EXTRACTOR_VERSION = '1';

/**
 * How an opportunity, occasion or trial closed. Preserves the preceding
 * state; a `cap` is a censored observation, never an observed action.
 */
export type ClosureReason =
  | 'completed'
  | 'voluntary_stop'
  | 'declined'
  | 'route_departure'
  | 'cap'
  | 'session_end'
  | 'closed_at_review'
  | 'technical_failure';

export const CLOSURE_REASONS: readonly ClosureReason[] = [
  'completed',
  'voluntary_stop',
  'declined',
  'route_departure',
  'cap',
  'session_end',
  'closed_at_review',
  'technical_failure',
];

/**
 * Outcome-understanding status for the M24 / M26 knowledge boundary: an
 * acknowledgement click never establishes knowledge; only a passed
 * expected-outcome test does. First-pass and post-explanation passes are
 * stored separately by design.
 */
export type KnowledgeStatus =
  | 'unknown'
  | 'pass_first'
  | 'pass_after_explanation'
  | 'fail';

/** Task phase of any trial record; practice never becomes scored behaviour. */
export type MeasurementPhase =
  | 'practice'
  | 'baseline'
  | 'measurement'
  | 'feedback'
  | 'transfer'
  | 'belief'
  | 'closure';

/**
 * Selected pilot defaults (specification: "selected pilot defaults, not
 * published validity thresholds"). Every duration is FOCUSED time — the
 * focused clock pauses during documented focus loss, explicit pauses,
 * animation locks and unusable controls.
 */
export const PILOT_SETTINGS = {
  /** M05: observed start-opportunity window per accepted occasion. */
  m05_start_cap_ms: 60_000,
  /** M06: one standard work budget; early stopping never shortens it. */
  m06_work_budget_ms: 60_000,
  /** M06: orders offered inside the budget. */
  m06_orders: 12,
  /** M08: one Work-or-Rest epoch. */
  m08_epoch_ms: 15_000,
  /** M08: planned epochs (three at each displayed benefit level). */
  m08_epochs: 6,
  /** M17: uncoached baseline probes before any feedback. */
  m17_baseline_trials: 2,
  /** M17: feedback learning trials — always administered in full. */
  m17_learning_trials: 12,
  /** M17: transfer probes after the learning series. */
  m17_transfer_trials: 2,
  /** M17: first attainment = this many consecutive correct learning responses. */
  m17_criterion_run: 3,
  /** M24 / M25 / M26: post-understanding (M24/M26) or post-completion (M25) window. */
  m24_cap_ms: 30_000,
  m25_cap_ms: 30_000,
  m26_cap_ms: 30_000,
  /** M25: required calibration loops (never scored as persistence). */
  m25_required_loops: 3,
} as const;

/**
 * The two owner-approved in-game question stems (a narrow approved
 * exception to the no-questionnaire-text rule; they are GAME text, never
 * source-instrument wording). Pinned beside their anchors so no unit can
 * drift the wording.
 */
export const M22_DISCOURAGEMENT_PROMPT =
  'How discouraged did you feel when that new requirement appeared?';

export const M25_NORMALITY_PROMPT =
  'Do you think redoing the same task over and over is normal?';

/**
 * Five labelled options of the M22 discouragement rating (self-report
 * within the game; a narrow approved exception, never behavioural
 * validation). Value order is the anchor order; a missing or declined
 * rating is `null`, never a midpoint.
 */
export const M22_DISCOURAGEMENT_OPTIONS: readonly {
  value: 1 | 2 | 3 | 4 | 5;
  label: string;
}[] = [
  { value: 1, label: 'Not at all' },
  { value: 2, label: 'Slightly' },
  { value: 3, label: 'Moderately' },
  { value: 4, label: 'Very' },
  { value: 5, label: 'Extremely' },
];

/** Five labelled options of the M25 normality belief question. */
export const M25_NORMALITY_OPTIONS: readonly {
  value: 1 | 2 | 3 | 4 | 5;
  label: string;
}[] = [
  { value: 1, label: 'Not at all normal' },
  { value: 2, label: 'Slightly normal' },
  { value: 3, label: 'Moderately normal' },
  { value: 4, label: 'Very normal' },
  { value: 5, label: 'Completely normal' },
];

/** Metadata stamped on every measurement record by the protocol layer. */
export function protocolStamp() {
  return {
    measurement_protocol_version: MEASUREMENT_PROTOCOL_VERSION,
    measurement_schema_version: MEASUREMENT_SCHEMA_VERSION,
    measurement_register_version: MEASUREMENT_REGISTER_VERSION,
  } as const;
}
