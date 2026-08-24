/**
 * M24 provisional opportunity adapter — utility-stop magnet recovery
 * (field-actions foundation).
 *
 * Observes rig behaviour around an EXPLICIT no-benefit signal: the
 * finite counterbalanced deck exhausts by construction, an unambiguous
 * depletion message is shown to every participant (display and
 * acknowledgement both recorded), and post-signal cycles are recorded
 * separately. A clearly available alternative useful activity (the
 * maintenance bench) is represented separately. The window's CLOSE
 * never depends on choosing the "correct" behaviour, and neither
 * stopping nor continuing is interpreted as good or bad anywhere.
 *
 * GOVERNANCE: proto_m24_magnet_utility_* is a provisional candidate
 * family, pairwise-disjoint from the other three families in this
 * unit; the existing recycler M24 module
 * (src/measurement/m24SalvageExhaustion.ts, proto_m24_*) is untouched
 * and the duplicated construct surface is an open research-owner
 * decision. No score, no canonical event, no ScoringManager contact.
 */

import { emitFieldActionLog } from '../fieldActionLog';
import type { MagnetCycleRecord } from '../magnetWinchController';

// NOTE: runtime-import-free (measurement-module convention): events go
// through the injected field-action log sink; validity-register
// bookkeeping belongs to the hosting scene.

let hostScene = 'field_actions_lab';

/** Pilot hosts re-home the scene field on family events (additive). */
export function setM24MagnetUtilityHostScene(scene: string): void {
  hostScene = scene;
}

export const M24MU_OPPORTUNITY_ID = 'proto_m24_magnet_utility';
export const M24MU_ENTRY_STATE_VERSION = 'm24-magnet-utility-v1';
export const M24MU_WINDOW_ID = 'm24mu_w1';

/** The participant-facing depletion statement (identical for everyone). */
export const M24MU_DEPLETION_STATEMENT =
  'CATCHMENT DEPLETED — the recoverable material in this heap is exhausted. ' +
  'Further pulls will bring up nothing.';

/** The complete provisional event family (disjointness tests). */
export const M24MU_EVENT_TYPES = [
  'proto_m24_magnet_utility_opportunity_opened',
  'proto_m24_magnet_utility_cycle',
  'proto_m24_magnet_utility_depletion_shown',
  'proto_m24_magnet_utility_depletion_acknowledged',
  'proto_m24_magnet_utility_alternative_activity',
  'proto_m24_magnet_utility_closed',
  'proto_m24_magnet_utility_technical_failure',
] as const;

export type M24MagnetUtilityExitStatus =
  | 'next_job'
  | 'reset'
  | 'scene_exit'
  | 'technical_failure';

interface M24MagnetUtilityState {
  window_open: boolean;
  opportunity_started_at: number | null;
  deck_form: string | null;
  /** Deck position when the window opened (pre-window free-play use). */
  deck_position_at_open: number | null;
  cycle_count_pre_signal: number;
  useful_outcomes: number;
  empty_outcomes: number;
  depletion_signal_displayed_at: number | null;
  depletion_signal_acknowledged: boolean;
  cycle_count_post_signal: number;
  last_cycle_at: number | null;
  alternative_activity_entered: boolean;
  exit_status: M24MagnetUtilityExitStatus | null;
}

function createInitialState(): M24MagnetUtilityState {
  return {
    window_open: false,
    opportunity_started_at: null,
    deck_form: null,
    deck_position_at_open: null,
    cycle_count_pre_signal: 0,
    useful_outcomes: 0,
    empty_outcomes: 0,
    depletion_signal_displayed_at: null,
    depletion_signal_acknowledged: false,
    cycle_count_post_signal: 0,
    last_cycle_at: null,
    alternative_activity_entered: false,
    exit_status: null,
  };
}

export const m24MagnetUtilityState: M24MagnetUtilityState =
  createInitialState();

function logM24MU(eventType: string, metadata: Record<string, unknown> = {}) {
  emitFieldActionLog({
    scene: hostScene,
    episode: 'proto_m24_magnet_utility',
    event_type: eventType,
    object_id: 'm24_magnet_utility_rig',
    metadata: {
      measure_id: 'M24',
      opportunity_id: M24MU_OPPORTUNITY_ID,
      window_id: M24MU_WINDOW_ID,
      entry_state_version: M24MU_ENTRY_STATE_VERSION,
      deck_form: m24MagnetUtilityState.deck_form,
      ...metadata,
    },
  });
}

export function m24MagnetUtilityWindowOpen(): boolean {
  return m24MagnetUtilityState.window_open;
}

/**
 * Explicit window open (range-console action). One-shot per session: a
 * window that was already opened and closed never reopens (reopening
 * would accumulate counters and double-emit the opened event).
 * `deckPositionAtOpen` records pre-window free-play deck use so a
 * non-standard entry state is screenable (see the unit report §20).
 */
export function openM24MagnetUtilityWindow(
  nowMs: number,
  deckForm: string,
  deckPositionAtOpen = 0,
): void {
  if (
    m24MagnetUtilityState.window_open ||
    m24MagnetUtilityState.exit_status !== null
  ) {
    return;
  }

  m24MagnetUtilityState.window_open = true;
  m24MagnetUtilityState.deck_form = deckForm;
  m24MagnetUtilityState.deck_position_at_open = deckPositionAtOpen;

  if (m24MagnetUtilityState.opportunity_started_at === null) {
    m24MagnetUtilityState.opportunity_started_at = nowMs;
  }

  logM24MU('proto_m24_magnet_utility_opportunity_opened', {
    opportunity_started_at: nowMs,
    deck_position_at_open: deckPositionAtOpen,
  });
}

/**
 * One resolved rig cycle inside the open window. Pre-signal and
 * post-signal cycles are counted separately (post = after the
 * depletion statement was DISPLAYED); cancelled cycles are recorded on
 * the event but never counted as pulls.
 */
export function noteM24MagnetUtilityCycle(
  record: MagnetCycleRecord,
  nowMs: number,
): void {
  const state = m24MagnetUtilityState;

  if (!state.window_open) {
    return;
  }

  state.last_cycle_at = nowMs;

  const postSignal = state.depletion_signal_displayed_at !== null;

  if (!record.cancelled) {
    if (postSignal) {
      state.cycle_count_post_signal += 1;
    } else {
      state.cycle_count_pre_signal += 1;
    }

    if (record.item_id !== null) {
      state.useful_outcomes += 1;
    } else {
      state.empty_outcomes += 1;
    }
  }

  logM24MU('proto_m24_magnet_utility_cycle', {
    cancelled: record.cancelled,
    hook_set: record.hook_set,
    locked_in_band: record.locked_in_band,
    lock_source: record.lock_source,
    outcome_tier: record.outcome_tier,
    item_id: record.item_id,
    item_delivery: record.item_delivery,
    pull_position: record.pull_position,
    cycle_duration_ms: record.cycle_duration_ms,
    post_depletion: record.post_depletion,
    post_signal: postSignal,
    cycle_number_pre_signal: state.cycle_count_pre_signal,
    cycle_number_post_signal: state.cycle_count_post_signal,
  });
}

/** The explicit no-benefit statement was displayed. */
export function markM24MagnetUtilityDepletionShown(nowMs: number): void {
  const state = m24MagnetUtilityState;

  if (!state.window_open || state.depletion_signal_displayed_at !== null) {
    return;
  }

  state.depletion_signal_displayed_at = nowMs;
  logM24MU('proto_m24_magnet_utility_depletion_shown', {
    displayed_at: nowMs,
  });
}

/** The participant acknowledged the statement. */
export function markM24MagnetUtilityDepletionAcknowledged(nowMs: number): void {
  const state = m24MagnetUtilityState;

  if (
    !state.window_open ||
    state.depletion_signal_displayed_at === null ||
    state.depletion_signal_acknowledged
  ) {
    return;
  }

  state.depletion_signal_acknowledged = true;
  logM24MU('proto_m24_magnet_utility_depletion_acknowledged', {
    acknowledged_at: nowMs,
  });
}

/** The separately represented alternative useful activity was entered. */
export function markM24MagnetUtilityAlternativeActivity(nowMs: number): void {
  const state = m24MagnetUtilityState;

  if (!state.window_open || state.alternative_activity_entered) {
    return;
  }

  state.alternative_activity_entered = true;
  logM24MU('proto_m24_magnet_utility_alternative_activity', {
    entered_at: nowMs,
  });
}

export function m24MagnetUtilitySummary() {
  const state = m24MagnetUtilityState;

  return {
    opportunity_started_at: state.opportunity_started_at,
    deck_form: state.deck_form,
    deck_position_at_open: state.deck_position_at_open,
    cycle_count_pre_signal: state.cycle_count_pre_signal,
    useful_outcomes: state.useful_outcomes,
    empty_outcomes: state.empty_outcomes,
    depletion_signal_displayed_at: state.depletion_signal_displayed_at,
    depletion_signal_acknowledged: state.depletion_signal_acknowledged,
    cycle_count_post_signal: state.cycle_count_post_signal,
    time_post_signal_ms:
      state.depletion_signal_displayed_at === null ||
      state.last_cycle_at === null
        ? null
        : Math.max(
            0,
            state.last_cycle_at - state.depletion_signal_displayed_at,
          ),
    alternative_activity_entered: state.alternative_activity_entered,
    exit_status: state.exit_status,
  };
}

/**
 * Explicit window close (console reset / scene exit) — NEVER a function
 * of whether the participant stopped or continued. The opportunity
 * counts as completed observation either way once the window closes
 * after the depletion signal was displayed.
 */
export function closeM24MagnetUtilityWindow(
  nowMs: number,
  exitStatus: Exclude<M24MagnetUtilityExitStatus, 'technical_failure'>,
): void {
  const state = m24MagnetUtilityState;

  if (!state.window_open) {
    return;
  }

  state.window_open = false;
  state.exit_status = exitStatus;
  logM24MU('proto_m24_magnet_utility_closed', {
    ...m24MagnetUtilitySummary(),
    closed_at: nowMs,
  });
}

/**
 * Technical failure is a validity state, never participant behaviour
 * (the hosting scene marks the register invalid alongside this call).
 */
export function markM24MagnetUtilityTechnicalFailure(detail: string): void {
  m24MagnetUtilityState.exit_status = 'technical_failure';
  m24MagnetUtilityState.window_open = false;
  logM24MU('proto_m24_magnet_utility_technical_failure', { detail });
}

/** Test-only escape hatch. */
export function resetM24MagnetUtilityState(): void {
  Object.assign(m24MagnetUtilityState, createInitialState());
}
