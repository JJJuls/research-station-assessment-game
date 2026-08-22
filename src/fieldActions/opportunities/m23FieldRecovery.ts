/**
 * M23 provisional opportunity adapter — difficult-but-attainable field
 * recovery (field-actions foundation).
 *
 * A standardised HARD scan-and-dig recovery window over the generic
 * field mechanics: a fixed/counterbalanced buried target (recorded
 * form), genuinely attainable, typically needing several scans and digs.
 * No false statement about the target ever appears (it IS present), no
 * dependency on earlier performance gates entry, and the window opens
 * and closes explicitly. RAW PROCESS VARIABLES ONLY — no persistence
 * score, no threshold, no trait label is computed anywhere.
 *
 * GOVERNANCE: every identifier here is a provisional candidate
 * (proto_m23_field_recovery_*). The family is pairwise-disjoint from
 * proto_m24_magnet_utility_*, proto_m26_depleted_search_*, and
 * secondary_field_action_*; generic action events are never primary
 * item evidence. The existing coolant-yard M23 module
 * (src/measurement/m23Excavation.ts, proto_m23_*) is untouched — the
 * duplicated construct surface is an open research-owner decision
 * recorded in the unit report. Nothing here registers a canonical
 * event or touches ScoringManager.
 */

import type { DigRecord } from '../digController';
import { emitFieldActionLog } from '../fieldActionLog';
import type { ScanRecord } from '../scanController';

// NOTE: this module is deliberately runtime-import-free (measurement-
// module convention): events go through the injected field-action log
// sink, and ALL validity-register bookkeeping (declare / offered /
// entered / completed / invalid) belongs to the hosting scene — exactly
// the CoolantYard ↔ m23Excavation division of responsibility.

export const M23FR_OPPORTUNITY_ID = 'proto_m23_field_recovery';
export const M23FR_ENTRY_STATE_VERSION = 'm23-field-recovery-v1';
export const M23FR_WINDOW_ID = 'm23fr_w1';

/** Scan-trend context id while this window is active. */
export const M23FR_SCAN_CONTEXT = 'm23_field_recovery';

/** The buried target's id inside the field registries. */
export const M23FR_TARGET_ID = 'm23fr_target';

export type M23FieldRecoveryForm = 'form_a' | 'form_b';

/**
 * Counterbalanced target cells (tile coords inside the M23 plot). Both
 * forms sit deep in the plot so recovery difficulty is equivalent.
 */
export const M23FR_FORMS: Record<
  M23FieldRecoveryForm,
  { col: number; row: number }
> = {
  form_a: { col: 14, row: 12 },
  form_b: { col: 17, row: 14 },
};

/** Detection radius (px) for the M23 target — a hard, tight gradient. */
export const M23FR_DETECTION_RADIUS = 160;

/** Activity/idle split: gaps above this count as idle time. */
const ACTIVITY_GAP_MS = 15000;

/** The complete provisional event family (disjointness tests). */
export const M23FR_EVENT_TYPES = [
  'proto_m23_field_recovery_opportunity_opened',
  'proto_m23_field_recovery_scan',
  'proto_m23_field_recovery_dig',
  'proto_m23_field_recovery_invalid_action',
  'proto_m23_field_recovery_completed',
  'proto_m23_field_recovery_closed',
  'proto_m23_field_recovery_technical_failure',
] as const;

export type M23FieldRecoveryExitStatus =
  | 'completed'
  | 'reset'
  | 'scene_exit'
  | 'technical_failure';

interface M23FieldRecoveryState {
  window_open: boolean;
  opportunity_started_at: number | null;
  form: M23FieldRecoveryForm | null;
  scan_count: number;
  valid_scan_count: number;
  unique_scan_positions: Set<string>;
  best_signal_strength: number;
  direction_improving_transitions: number;
  last_target_strength: number | null;
  dig_attempt_count: number;
  unique_cells_excavated: Set<string>;
  invalid_action_count: number;
  active_time_ms: number;
  idle_time_ms: number;
  last_activity_at: number | null;
  interruptions: number;
  completed: boolean;
  completion_time_ms: number | null;
  exit_status: M23FieldRecoveryExitStatus | null;
}

function createInitialState(): M23FieldRecoveryState {
  return {
    window_open: false,
    opportunity_started_at: null,
    form: null,
    scan_count: 0,
    valid_scan_count: 0,
    unique_scan_positions: new Set(),
    best_signal_strength: 0,
    direction_improving_transitions: 0,
    last_target_strength: null,
    dig_attempt_count: 0,
    unique_cells_excavated: new Set(),
    invalid_action_count: 0,
    active_time_ms: 0,
    idle_time_ms: 0,
    last_activity_at: null,
    interruptions: 0,
    completed: false,
    completion_time_ms: null,
    exit_status: null,
  };
}

export const m23FieldRecoveryState: M23FieldRecoveryState =
  createInitialState();

function logM23FR(eventType: string, metadata: Record<string, unknown> = {}) {
  emitFieldActionLog({
    scene: 'field_actions_lab',
    episode: 'proto_m23_field_recovery',
    event_type: eventType,
    object_id: 'm23_field_recovery_plot',
    metadata: {
      measure_id: 'M23',
      opportunity_id: M23FR_OPPORTUNITY_ID,
      window_id: M23FR_WINDOW_ID,
      entry_state_version: M23FR_ENTRY_STATE_VERSION,
      form: m23FieldRecoveryState.form,
      ...metadata,
    },
  });
}

export function m23FieldRecoveryWindowOpen(): boolean {
  return m23FieldRecoveryState.window_open;
}

/**
 * Explicit window open (range-console action). One-shot per session: a
 * window already closed (completed or reset) never reopens — a reopened
 * completed window would let the console assert a target that no longer
 * exists, and counters would accumulate across runs.
 */
export function openM23FieldRecoveryWindow(
  nowMs: number,
  form: M23FieldRecoveryForm,
): void {
  if (
    m23FieldRecoveryState.window_open ||
    m23FieldRecoveryState.exit_status !== null
  ) {
    return;
  }

  m23FieldRecoveryState.window_open = true;
  m23FieldRecoveryState.form = form;

  if (m23FieldRecoveryState.opportunity_started_at === null) {
    m23FieldRecoveryState.opportunity_started_at = nowMs;
  }

  m23FieldRecoveryState.last_activity_at = nowMs;
  logM23FR('proto_m23_field_recovery_opportunity_opened', {
    opportunity_started_at: nowMs,
  });
}

function recordActivity(nowMs: number): void {
  const state = m23FieldRecoveryState;

  if (state.last_activity_at !== null) {
    const gap = Math.max(0, nowMs - state.last_activity_at);

    if (gap <= ACTIVITY_GAP_MS) {
      state.active_time_ms += gap;
    } else {
      state.idle_time_ms += gap;
    }
  }

  state.last_activity_at = nowMs;
}

/** One resolved scan inside the open window. */
export function noteM23FieldRecoveryScan(
  record: ScanRecord,
  nowMs: number,
): void {
  const state = m23FieldRecoveryState;

  if (!state.window_open) {
    return;
  }

  recordActivity(nowMs);
  state.scan_count += 1;
  state.unique_scan_positions.add(
    `${Math.round(record.player_x / 16)}:${Math.round(record.player_y / 16)}`,
  );

  const onTarget = record.target_id === M23FR_TARGET_ID;

  if (onTarget) {
    state.valid_scan_count += 1;

    if (
      state.last_target_strength !== null &&
      record.strength > state.last_target_strength
    ) {
      state.direction_improving_transitions += 1;
    }

    state.last_target_strength = record.strength;
    state.best_signal_strength = Math.max(
      state.best_signal_strength,
      record.strength,
    );
  }

  logM23FR('proto_m23_field_recovery_scan', {
    strength: record.strength,
    category: record.category,
    trend: record.trend,
    on_target: onTarget,
    player_x: record.player_x,
    player_y: record.player_y,
    scan_number: state.scan_count,
  });
}

/** One resolved dig inside the open window. */
export function noteM23FieldRecoveryDig(
  record: DigRecord,
  nowMs: number,
): void {
  const state = m23FieldRecoveryState;

  if (!state.window_open) {
    return;
  }

  recordActivity(nowMs);
  state.dig_attempt_count += 1;
  state.unique_cells_excavated.add(`${record.col}:${record.row}`);
  logM23FR('proto_m23_field_recovery_dig', {
    col: record.col,
    row: record.row,
    zone_id: record.zone_id,
    on_plot: record.zone_id === 'm23_plot',
    outcome: record.outcome,
    dig_number: state.dig_attempt_count,
  });
}

/** A refused action inside the open window (invalid-location press). */
export function noteM23FieldRecoveryInvalidAction(nowMs: number): void {
  const state = m23FieldRecoveryState;

  if (!state.window_open) {
    return;
  }

  recordActivity(nowMs);
  state.invalid_action_count += 1;
  logM23FR('proto_m23_field_recovery_invalid_action', {
    invalid_action_count: state.invalid_action_count,
  });
}

/** Scene pause (menu/overlay) while the window is open. */
export function noteM23FieldRecoveryInterruption(): void {
  if (m23FieldRecoveryState.window_open) {
    m23FieldRecoveryState.interruptions += 1;
  }
}

/** The buried target left the ground (recovered or cached). */
export function markM23FieldRecoveryCompleted(nowMs: number): void {
  const state = m23FieldRecoveryState;

  if (!state.window_open || state.completed) {
    return;
  }

  recordActivity(nowMs);
  state.completed = true;
  state.completion_time_ms =
    state.opportunity_started_at === null
      ? null
      : nowMs - state.opportunity_started_at;
  logM23FR('proto_m23_field_recovery_completed', {
    completion_time_ms: state.completion_time_ms,
    scan_count: state.scan_count,
    dig_attempt_count: state.dig_attempt_count,
  });
}

export function m23FieldRecoverySummary() {
  const state = m23FieldRecoveryState;

  return {
    opportunity_started_at: state.opportunity_started_at,
    form_id: state.form,
    scan_count: state.scan_count,
    valid_scan_count: state.valid_scan_count,
    unique_scan_positions: state.unique_scan_positions.size,
    best_signal_strength: state.best_signal_strength,
    direction_improving_transitions: state.direction_improving_transitions,
    dig_attempt_count: state.dig_attempt_count,
    unique_cells_excavated: state.unique_cells_excavated.size,
    invalid_action_count: state.invalid_action_count,
    active_time_ms: state.active_time_ms,
    idle_time_ms: state.idle_time_ms,
    interruptions: state.interruptions,
    completed: state.completed,
    completion_time_ms: state.completion_time_ms,
    exit_status: state.exit_status,
  };
}

/** Explicit window close; the summary rides the closed event. */
export function closeM23FieldRecoveryWindow(
  nowMs: number,
  exitStatus: Exclude<M23FieldRecoveryExitStatus, 'technical_failure'>,
): void {
  const state = m23FieldRecoveryState;

  if (!state.window_open) {
    return;
  }

  recordActivity(nowMs);
  state.window_open = false;
  state.exit_status = state.completed ? 'completed' : exitStatus;
  logM23FR('proto_m23_field_recovery_closed', m23FieldRecoverySummary());
}

/**
 * Technical failure is a validity state, never participant behaviour
 * (the hosting scene marks the register invalid alongside this call).
 */
export function markM23FieldRecoveryTechnicalFailure(detail: string): void {
  m23FieldRecoveryState.exit_status = 'technical_failure';
  m23FieldRecoveryState.window_open = false;
  logM23FR('proto_m23_field_recovery_technical_failure', { detail });
}

/** Test-only escape hatch. */
export function resetM23FieldRecoveryState(): void {
  const fresh = createInitialState();

  Object.assign(m23FieldRecoveryState, fresh);
  m23FieldRecoveryState.unique_scan_positions = new Set();
  m23FieldRecoveryState.unique_cells_excavated = new Set();
}
