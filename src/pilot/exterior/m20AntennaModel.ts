/**
 * M20 — antenna restoration, START window only (evidence-led pilot v2,
 * Unit 4). PURE model (no Phaser, no runtime imports; Node-testable).
 *
 * Ledger (sheet 09): begin a multi-stage antenna restoration, leave for
 * one required intervening duty, then receive a natural opportunity to
 * resume and finish. Raw components `progress_pre_interruption`,
 * `returned`, `resume_latency`, `useful_resume_actions`, `completion`.
 * Validity gate: task remains attainable/unchanged; guaranteed return
 * route; identical interruption; state persists visibly.
 *
 * UNIT 4 SCOPE — START ONLY. This module records the accepted task, the
 * outdoor starting stages the participant performs at Mast 04, the visible
 * unfinished state, and the interruption point (the required return duty
 * begins when the participant declares the shift outside finished). The
 * resume/finish window (`m20_antenna_resume`, episode 5) is NOT
 * implemented here: `returned`, `resume_latency`, `useful_resume_actions`
 * and `completion` are never written by this module, no end event exists,
 * and no M20 outcome is manufactured to close the start window. The
 * opportunity stays ENTERED (open) on the validity register until the
 * Return episode observes it; a session that ends before then censors it.
 *
 * Outdoor stages (fixed, identical for everyone): clear the iced base
 * clamp, then seat the feed line. The third stage — aligning the feed —
 * is only possible at the station feed console (Records Workshop,
 * episode 5), so the mast reads "ALIGNMENT PENDING" once the outdoor
 * stages are done. The state is session-scope and re-rendered by the yard
 * on every scene creation. Nothing here is a score.
 */

export const M20_OPPORTUNITY_ID = 'proto_m20_antenna_restoration';
export const M20_START_WINDOW_ID = 'm20_antenna_start';
/** Episode-5 window id (ledger); reserved for the Return episode — unused here. */
export const M20_RESUME_WINDOW_ID = 'm20_antenna_resume';
export const M20_ENTRY_STATE_VERSION = 'm20-antenna-v1';
export const M20_FAMILY = 'proto_m20_antenna_';

/** Start-window event suffixes (family = M20_FAMILY + suffix). No end event. */
export const M20_START_EVENT_SUFFIXES = [
  'presented',
  'opportunity_opened',
  'accepted',
  'stage_completed',
  'departed',
  'interruption_recorded',
  'technical_failure',
] as const;

export type M20OutdoorStage = 'clear_base_clamp' | 'seat_feed_line';

/** Outdoor stages in their fixed order. */
export const M20_OUTDOOR_STAGES: readonly M20OutdoorStage[] = [
  'clear_base_clamp',
  'seat_feed_line',
];

/** The stage that can only be done inside (episode 5). Never done here. */
export const M20_INDOOR_STAGE = 'align_feed' as const;

export const M20_STAGE_LABELS: Record<M20OutdoorStage, string> = {
  clear_base_clamp: 'Clear the iced base clamp',
  seat_feed_line: 'Seat the feed line',
};

export const M20_STAGE_MS: Record<M20OutdoorStage, number> = {
  clear_base_clamp: 1500,
  seat_feed_line: 1500,
};

export interface M20State {
  accepted: boolean;
  accepted_at_ms: number | null;
  stages_done: M20OutdoorStage[];
  stage_completed_at_ms: Partial<Record<M20OutdoorStage, number>>;
  /** The required intervening duty began (shift outside declared finished). */
  interruption_at_ms: number | null;
  /** Outdoor progress frozen at the interruption (ledger raw name). */
  progress_pre_interruption: number | null;
  departures: number;
  technical_failure: string | null;
}

export function createM20State(): M20State {
  return {
    accepted: false,
    accepted_at_ms: null,
    stages_done: [],
    stage_completed_at_ms: {},
    interruption_at_ms: null,
    progress_pre_interruption: null,
    departures: 0,
    technical_failure: null,
  };
}

export function m20Accept(state: M20State, nowMs: number): boolean {
  if (state.accepted) {
    return false;
  }

  state.accepted = true;
  state.accepted_at_ms = nowMs;

  return true;
}

/** The next outdoor stage the participant can perform, or null. */
export function m20NextStage(state: M20State): M20OutdoorStage | null {
  if (!state.accepted) {
    return null;
  }

  return M20_OUTDOOR_STAGES[state.stages_done.length] ?? null;
}

export function m20OutdoorComplete(state: M20State): boolean {
  return state.stages_done.length === M20_OUTDOOR_STAGES.length;
}

/** Completes the NEXT outdoor stage only (fixed order; idempotent). */
export function m20CompleteStage(
  state: M20State,
  stage: M20OutdoorStage,
  nowMs: number,
): boolean {
  if (m20NextStage(state) !== stage || state.interruption_at_ms !== null) {
    return false;
  }

  state.stages_done.push(stage);
  state.stage_completed_at_ms[stage] = nowMs;

  return true;
}

/**
 * The interruption: the participant leaves for the required return duty.
 * Freezes `progress_pre_interruption`; idempotent; never an outcome.
 */
export function m20RecordInterruption(state: M20State, nowMs: number): boolean {
  if (!state.accepted || state.interruption_at_ms !== null) {
    return false;
  }

  state.interruption_at_ms = nowMs;
  state.progress_pre_interruption = state.stages_done.length;

  return true;
}

export function m20Depart(state: M20State): boolean {
  if (!state.accepted) {
    return false;
  }

  state.departures += 1;

  return true;
}

/** Participant-facing mast status line (operational; no item wording). */
export function m20MastStatus(state: M20State): string {
  if (!state.accepted) {
    return 'MAST 04 — storm damage · restoration not started';
  }

  if (m20OutdoorComplete(state)) {
    return 'MAST 04 — feed seated · ALIGNMENT PENDING (station feed console)';
  }

  if (state.stages_done.length === 1) {
    return 'MAST 04 — base clamp cleared · feed line not seated';
  }

  return 'MAST 04 — restoration accepted · base clamp iced';
}

/** Concise mission-log line (neutral obligation; never a reminder text). */
export function m20MissionLogText(state: M20State): string {
  const done = state.stages_done.length;
  const total = M20_OUTDOOR_STAGES.length;

  if (m20OutdoorComplete(state)) {
    return 'Antenna restoration — Mast 04 feed seated; alignment pending at the station feed console.';
  }

  return `Antenna restoration — Mast 04 started (${done}/${total} outdoor stages).`;
}

/** Start-window snapshot (probe / persistence tests). Nothing ends here. */
export function m20Snapshot(state: M20State) {
  return {
    accepted: state.accepted,
    accepted_at_ms: state.accepted_at_ms,
    stages_done: [...state.stages_done],
    outdoor_stages_total: M20_OUTDOOR_STAGES.length,
    outdoor_complete: m20OutdoorComplete(state),
    next_stage: m20NextStage(state),
    indoor_stage_pending: state.accepted,
    interruption_recorded: state.interruption_at_ms !== null,
    progress_pre_interruption: state.progress_pre_interruption,
    departures: state.departures,
    // Episode-5 raw components: explicitly absent in Unit 4.
    returned: null,
    resume_latency: null,
    useful_resume_actions: null,
    completion: null,
    resume_window_implemented: false,
  };
}
