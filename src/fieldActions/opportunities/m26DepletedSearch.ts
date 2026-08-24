/**
 * M26 provisional opportunity adapter — verified futile search
 * (field-actions foundation).
 *
 * Separates ordinary search competence from continued search after
 * verified futility. The window has two strictly separable phases:
 *
 *   1. CONTROL — a matched, genuinely attainable target in the control
 *      plot (ordinary competence). Completing it unlocks the futility
 *      verification.
 *   2. FUTILE — a distinct, staked depleted plot that verifiably
 *      contains NO remaining target (certificate + the participant's
 *      own verification scan + explicit acknowledgement). The plot can
 *      never produce a concealed reward — there is nothing registered
 *      in it, by construction.
 *
 * Control-phase and futile-phase events carry distinct names so the
 * two behaviours can never blend; no earlier M23/M24 behaviour gates
 * entry. RAW VARIABLES ONLY — no item score is computed anywhere.
 *
 * GOVERNANCE: proto_m26_depleted_search_* is a provisional candidate
 * family, pairwise-disjoint from the other three families in this
 * unit; the existing reclaimed-sector M26 module
 * (src/measurement/m26DepletedField.ts, proto_m26_*) is untouched and
 * the duplicated construct surface is an open research-owner decision.
 */

import type { DigRecord } from '../digController';
import { emitFieldActionLog } from '../fieldActionLog';
import type { ScanRecord } from '../scanController';

// NOTE: runtime-import-free (measurement-module convention): events go
// through the injected field-action log sink; validity-register
// bookkeeping belongs to the hosting scene.

let hostScene = 'field_actions_lab';

/** Pilot hosts re-home the scene field on family events (additive). */
export function setM26DepletedSearchHostScene(scene: string): void {
  hostScene = scene;
}

export const M26DS_OPPORTUNITY_ID = 'proto_m26_depleted_search';
export const M26DS_ENTRY_STATE_VERSION = 'm26-depleted-search-v1';
export const M26DS_WINDOW_ID = 'm26ds_w1';

/** Scan-trend contexts per phase (baseline resets between phases). */
export const M26DS_CONTROL_SCAN_CONTEXT = 'm26_control';
export const M26DS_FUTILE_SCAN_CONTEXT = 'm26_futile';

/** The control target's id inside the field registries. */
export const M26DS_CONTROL_TARGET_ID = 'm26ds_control_target';

/** Fixed control-target cell (matched to the M23 plot difficulty). */
export const M26DS_CONTROL_FORM = 'control_fixed';
export const M26DS_CONTROL_CELL = { col: 3, row: 19 };
export const M26DS_CONTROL_DETECTION_RADIUS = 160;

/** The participant-facing futility statement (identical for everyone). */
export const M26DS_FUTILITY_STATEMENT =
  'SECTOR VERIFICATION COMPLETE — the eastern of the two staked south ' +
  'plots has been swept and cleared: no remaining sample or material is ' +
  'present anywhere in it. Your own scanner will confirm: no survey ' +
  'signal returns from that plot.';

/** The complete provisional event family (disjointness tests). */
export const M26DS_EVENT_TYPES = [
  'proto_m26_depleted_search_opportunity_opened',
  'proto_m26_depleted_search_control_scan',
  'proto_m26_depleted_search_control_dig',
  'proto_m26_depleted_search_control_completed',
  'proto_m26_depleted_search_futility_shown',
  'proto_m26_depleted_search_futility_acknowledged',
  'proto_m26_depleted_search_pre_ack_act',
  'proto_m26_depleted_search_search_scan',
  'proto_m26_depleted_search_search_dig',
  'proto_m26_depleted_search_alternative_activity',
  'proto_m26_depleted_search_closed',
  'proto_m26_depleted_search_technical_failure',
] as const;

export type M26DepletedSearchPhase =
  | 'inactive'
  | 'control'
  | 'futile'
  | 'closed';

export type M26DepletedSearchExitStatus =
  | 'next_job'
  | 'reset'
  | 'scene_exit'
  | 'technical_failure';

interface M26DepletedSearchState {
  phase: M26DepletedSearchPhase;
  opportunity_started_at: number | null;
  control_form: string | null;
  control_completed: boolean;
  control_scan_count: number;
  control_dig_count: number;
  futility_signal_displayed_at: number | null;
  futility_signal_acknowledged: boolean;
  pre_ack_act_count: number;
  post_futility_scan_count: number;
  post_futility_dig_count: number;
  post_futility_unique_positions: Set<string>;
  post_futility_first_act_at: number | null;
  post_futility_last_act_at: number | null;
  alternative_activity_entered: boolean;
  exit_status: M26DepletedSearchExitStatus | null;
}

function createInitialState(): M26DepletedSearchState {
  return {
    phase: 'inactive',
    opportunity_started_at: null,
    control_form: null,
    control_completed: false,
    control_scan_count: 0,
    control_dig_count: 0,
    futility_signal_displayed_at: null,
    futility_signal_acknowledged: false,
    pre_ack_act_count: 0,
    post_futility_scan_count: 0,
    post_futility_dig_count: 0,
    post_futility_unique_positions: new Set(),
    post_futility_first_act_at: null,
    post_futility_last_act_at: null,
    alternative_activity_entered: false,
    exit_status: null,
  };
}

export const m26DepletedSearchState: M26DepletedSearchState =
  createInitialState();

function logM26DS(eventType: string, metadata: Record<string, unknown> = {}) {
  emitFieldActionLog({
    scene: hostScene,
    episode: 'proto_m26_depleted_search',
    event_type: eventType,
    object_id: 'm26_depleted_search_plots',
    metadata: {
      measure_id: 'M26',
      opportunity_id: M26DS_OPPORTUNITY_ID,
      window_id: M26DS_WINDOW_ID,
      entry_state_version: M26DS_ENTRY_STATE_VERSION,
      phase: m26DepletedSearchState.phase,
      ...metadata,
    },
  });
}

export function m26DepletedSearchPhase(): M26DepletedSearchPhase {
  return m26DepletedSearchState.phase;
}

export function m26DepletedSearchWindowOpen(): boolean {
  return (
    m26DepletedSearchState.phase === 'control' ||
    m26DepletedSearchState.phase === 'futile'
  );
}

/**
 * Explicit window open (range-console action): control phase first.
 * One-shot per session — reopening a closed window would restart the
 * control phase against an already-recovered control target (an
 * uncompletable, false premise).
 */
export function openM26DepletedSearchWindow(nowMs: number): void {
  if (m26DepletedSearchState.phase !== 'inactive') {
    return;
  }

  m26DepletedSearchState.phase = 'control';
  m26DepletedSearchState.control_form = M26DS_CONTROL_FORM;

  if (m26DepletedSearchState.opportunity_started_at === null) {
    m26DepletedSearchState.opportunity_started_at = nowMs;
  }

  logM26DS('proto_m26_depleted_search_opportunity_opened', {
    opportunity_started_at: nowMs,
  });
}

/** One resolved scan, routed by phase and plot. */
export function noteM26DepletedSearchScan(
  record: ScanRecord,
  nowMs: number,
  plot: 'control' | 'depleted' | 'outside',
): void {
  const state = m26DepletedSearchState;

  if (state.phase === 'control' && plot === 'control') {
    state.control_scan_count += 1;
    logM26DS('proto_m26_depleted_search_control_scan', {
      strength: record.strength,
      category: record.category,
      trend: record.trend,
      scan_number: state.control_scan_count,
    });

    return;
  }

  if (state.phase === 'futile' && plot === 'depleted') {
    if (!state.futility_signal_acknowledged) {
      state.pre_ack_act_count += 1;
      logM26DS('proto_m26_depleted_search_pre_ack_act', {
        kind: 'scan',
        strength: record.strength,
      });

      return;
    }

    state.post_futility_scan_count += 1;
    state.post_futility_unique_positions.add(
      `${Math.round(record.player_x / 16)}:${Math.round(record.player_y / 16)}`,
    );
    state.post_futility_first_act_at ??= nowMs;
    state.post_futility_last_act_at = nowMs;
    logM26DS('proto_m26_depleted_search_search_scan', {
      strength: record.strength,
      category: record.category,
      scan_number: state.post_futility_scan_count,
    });
  }
}

/** One resolved dig, routed by phase and plot. */
export function noteM26DepletedSearchDig(
  record: DigRecord,
  nowMs: number,
  plot: 'control' | 'depleted' | 'outside',
): void {
  const state = m26DepletedSearchState;

  if (state.phase === 'control' && plot === 'control') {
    state.control_dig_count += 1;
    logM26DS('proto_m26_depleted_search_control_dig', {
      col: record.col,
      row: record.row,
      outcome: record.outcome,
      dig_number: state.control_dig_count,
    });

    return;
  }

  if (state.phase === 'futile' && plot === 'depleted') {
    if (!state.futility_signal_acknowledged) {
      state.pre_ack_act_count += 1;
      logM26DS('proto_m26_depleted_search_pre_ack_act', {
        kind: 'dig',
        outcome: record.outcome,
      });

      return;
    }

    state.post_futility_dig_count += 1;
    state.post_futility_unique_positions.add(`${record.col}:${record.row}`);
    state.post_futility_first_act_at ??= nowMs;
    state.post_futility_last_act_at = nowMs;
    logM26DS('proto_m26_depleted_search_search_dig', {
      col: record.col,
      row: record.row,
      outcome: record.outcome,
      dig_number: state.post_futility_dig_count,
    });
  }
}

/** The control target left the ground — control phase completes. */
export function markM26DepletedSearchControlCompleted(nowMs: number): void {
  const state = m26DepletedSearchState;

  if (state.phase !== 'control' || state.control_completed) {
    return;
  }

  state.control_completed = true;
  state.phase = 'futile';
  logM26DS('proto_m26_depleted_search_control_completed', {
    completed_at: nowMs,
    control_scan_count: state.control_scan_count,
    control_dig_count: state.control_dig_count,
  });
}

/** The futility certificate was displayed (futile phase only). */
export function markM26DepletedSearchFutilityShown(nowMs: number): void {
  const state = m26DepletedSearchState;

  if (state.phase !== 'futile' || state.futility_signal_displayed_at !== null) {
    return;
  }

  state.futility_signal_displayed_at = nowMs;
  logM26DS('proto_m26_depleted_search_futility_shown', {
    displayed_at: nowMs,
  });
}

/** The participant acknowledged the futility statement. */
export function markM26DepletedSearchFutilityAcknowledged(nowMs: number): void {
  const state = m26DepletedSearchState;

  if (
    state.phase !== 'futile' ||
    state.futility_signal_displayed_at === null ||
    state.futility_signal_acknowledged
  ) {
    return;
  }

  state.futility_signal_acknowledged = true;
  logM26DS('proto_m26_depleted_search_futility_acknowledged', {
    acknowledged_at: nowMs,
  });
}

/** The separately represented alternative useful activity was entered. */
export function markM26DepletedSearchAlternativeActivity(nowMs: number): void {
  const state = m26DepletedSearchState;

  if (!m26DepletedSearchWindowOpen() || state.alternative_activity_entered) {
    return;
  }

  state.alternative_activity_entered = true;
  logM26DS('proto_m26_depleted_search_alternative_activity', {
    entered_at: nowMs,
  });
}

export function m26DepletedSearchSummary() {
  const state = m26DepletedSearchState;

  return {
    control_form: state.control_form,
    control_completed: state.control_completed,
    control_scan_count: state.control_scan_count,
    control_dig_count: state.control_dig_count,
    futility_signal_displayed_at: state.futility_signal_displayed_at,
    futility_signal_acknowledged: state.futility_signal_acknowledged,
    pre_ack_act_count: state.pre_ack_act_count,
    post_futility_scan_count: state.post_futility_scan_count,
    post_futility_dig_count: state.post_futility_dig_count,
    post_futility_unique_positions: state.post_futility_unique_positions.size,
    post_futility_active_time_ms:
      state.post_futility_first_act_at === null ||
      state.post_futility_last_act_at === null
        ? 0
        : state.post_futility_last_act_at - state.post_futility_first_act_at,
    alternative_activity_entered: state.alternative_activity_entered,
    exit_status: state.exit_status,
  };
}

/** Explicit window close; the summary rides the closed event. */
export function closeM26DepletedSearchWindow(
  nowMs: number,
  exitStatus: Exclude<M26DepletedSearchExitStatus, 'technical_failure'>,
): void {
  const state = m26DepletedSearchState;

  if (!m26DepletedSearchWindowOpen()) {
    return;
  }

  state.phase = 'closed';
  state.exit_status = exitStatus;
  logM26DS('proto_m26_depleted_search_closed', {
    ...m26DepletedSearchSummary(),
    closed_at: nowMs,
  });
}

/**
 * Technical failure is a validity state, never participant behaviour
 * (the hosting scene marks the register invalid alongside this call).
 */
export function markM26DepletedSearchTechnicalFailure(detail: string): void {
  m26DepletedSearchState.exit_status = 'technical_failure';
  m26DepletedSearchState.phase = 'closed';
  logM26DS('proto_m26_depleted_search_technical_failure', { detail });
}

/** Test-only escape hatch. */
export function resetM26DepletedSearchState(): void {
  const fresh = createInitialState();

  Object.assign(m26DepletedSearchState, fresh);
  m26DepletedSearchState.post_futility_unique_positions = new Set();
}
