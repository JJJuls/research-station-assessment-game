/**
 * M20 — antenna restoration: START window (Unit 4) and RESUME/END window
 * (Unit 5) of the evidence-led pilot v2. PURE model (no Phaser, no runtime
 * imports; Node-testable).
 *
 * Ledger (sheet 09): begin a multi-stage antenna restoration, leave for
 * one required intervening duty, then receive a natural opportunity to
 * resume and finish. Raw components `progress_pre_interruption`,
 * `returned`, `resume_latency`, `useful_resume_actions`, `completion`.
 * Validity gate: task remains attainable/unchanged; guaranteed return
 * route; identical interruption; state persists visibly.
 *
 * START (Unit 4): the accepted task, the outdoor starting stages the
 * participant performs at Mast 04, the visible unfinished state, and the
 * interruption point (the required return duty begins when the participant
 * declares the shift outside finished). The start phase never manufactures
 * an outcome: the opportunity stays ENTERED (open) on the register.
 *
 * RESUME / END (Unit 5): the SAME opportunity continues at the station
 * feed console (Records Workshop, return shift) under the ledger window id
 * `m20_antenna_resume`. The resume opportunity is PRESENTED when the
 * participant is back inside with a valid start (accepted + interrupted)
 * and the console is available; it is never commanded and never gated.
 * The participant may resume, delay, inspect or leave; the indoor stages
 * (power → align → lock, routine timed actions, no difficulty spike) are
 * attainable and unchanged. `returned`, `resume_latency`,
 * `useful_resume_actions` and `completion` are written ONLY by the resume
 * phase; start and resume events stay traceably linked (one opportunity
 * id, two window ids, `phase` on every event). A start history that is
 * missing, exited (never interrupted), invalid or a technical failure is
 * classified — never converted into a low value.
 *
 * Outdoor stages (fixed, identical for everyone): clear the iced base
 * clamp, then seat the feed line. Indoor stages (fixed): power the feed,
 * align the feed, lock the alignment. Completion = every outdoor AND
 * indoor stage done. State is session-scope and re-rendered by the yard
 * and the workshop on every scene creation. Nothing here is a score.
 */

export const M20_OPPORTUNITY_ID = 'proto_m20_antenna_restoration';
export const M20_START_WINDOW_ID = 'm20_antenna_start';
/** Episode-5 window id (ledger): the resume/end phase at the feed console. */
export const M20_RESUME_WINDOW_ID = 'm20_antenna_resume';
export const M20_ENTRY_STATE_VERSION = 'm20-antenna-v1';
export const M20_FAMILY = 'proto_m20_antenna_';

/** Start-window event suffixes (family = M20_FAMILY + suffix). */
export const M20_START_EVENT_SUFFIXES = [
  'presented',
  'opportunity_opened',
  'accepted',
  'stage_completed',
  'departed',
  'interruption_recorded',
  'technical_failure',
] as const;

/**
 * Resume-window event suffixes (Unit 5; `phase: 'resume'` on every one).
 * `window_closed` exists ONLY in the resume phase: the start phase never
 * closes the window.
 */
export const M20_RESUME_EVENT_SUFFIXES = [
  'resume_presented',
  'resume_unavailable',
  'returned',
  'console_inspected',
  'indoor_stage_completed',
  'console_left',
  'window_closed',
] as const;

export type M20OutdoorStage = 'clear_base_clamp' | 'seat_feed_line';

/** Outdoor stages in their fixed order. */
export const M20_OUTDOOR_STAGES: readonly M20OutdoorStage[] = [
  'clear_base_clamp',
  'seat_feed_line',
];

/** The indoor stage family (episode 5, feed console). */
export const M20_INDOOR_STAGE = 'align_feed' as const;

export type M20IndoorStage = 'power_feed' | 'align_feed' | 'lock_alignment';

/** Indoor stages in their fixed order (routine timed actions). */
export const M20_INDOOR_STAGES: readonly M20IndoorStage[] = [
  'power_feed',
  'align_feed',
  'lock_alignment',
];

export const M20_INDOOR_STAGE_LABELS: Record<M20IndoorStage, string> = {
  power_feed: 'Power the feed line',
  align_feed: 'Align the feed',
  lock_alignment: 'Lock the alignment',
};

export const M20_INDOOR_STAGE_MS: Record<M20IndoorStage, number> = {
  power_feed: 1200,
  align_feed: 1500,
  lock_alignment: 1000,
};

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
  // ——— resume / end phase (Unit 5) ———
  /** The feed console became available with a valid start (once). */
  resume_presented_at_ms: number | null;
  /** The participant chose to resume (once). */
  returned_at_ms: number | null;
  indoor_stages_done: M20IndoorStage[];
  indoor_stage_completed_at_ms: Partial<Record<M20IndoorStage, number>>;
  /** Console opened with the start state read (any availability). */
  console_inspections: number;
  /** Console left with the restoration unfinished. */
  console_departures: number;
  completed_at_ms: number | null;
  resume_closed_reason: 'completed' | 'closed_at_review' | null;
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
    resume_presented_at_ms: null,
    returned_at_ms: null,
    indoor_stages_done: [],
    indoor_stage_completed_at_ms: {},
    console_inspections: 0,
    console_departures: 0,
    completed_at_ms: null,
    resume_closed_reason: null,
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

  if (m20Complete(state)) {
    return 'MAST 04 — feed aligned · restoration complete';
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

  if (m20Complete(state)) {
    return 'Antenna restoration — Mast 04 complete.';
  }

  if (state.returned_at_ms !== null) {
    return `Antenna restoration — feed alignment in progress at the station feed console (${state.indoor_stages_done.length}/${M20_INDOOR_STAGES.length}).`;
  }

  if (m20OutdoorComplete(state)) {
    return 'Antenna restoration — Mast 04 feed seated; alignment pending at the station feed console.';
  }

  return `Antenna restoration — Mast 04 started (${done}/${total} outdoor stages).`;
}

// ——— Resume / end phase (Unit 5) ———————————————————————————————————————

/**
 * How the start phase reached the feed console. `valid` = accepted and
 * interrupted by the one required return duty; `exited` = accepted but the
 * return duty never began (the participant walked back inside without
 * ending the shift with Noor); `missing` = never accepted; `invalid` = the
 * register already holds an invalid start (contamination / entry state);
 * `technical_failure`; `closed` = the resume phase already closed.
 */
export type M20StartHistory =
  | 'valid'
  | 'exited'
  | 'missing'
  | 'invalid'
  | 'technical_failure'
  | 'closed';

export interface M20ResumeAvailability {
  available: boolean;
  history: M20StartHistory;
  reason: string;
}

/**
 * Whether the console offers the resume opportunity. `startInvalid` is the
 * register's verdict on the start (read-only context: the opportunity is
 * still presented so the behaviour is preserved, but the record is invalid
 * — never a low value).
 */
export function m20ResumeAvailability(
  state: M20State,
  startInvalid = false,
): M20ResumeAvailability {
  if (state.technical_failure !== null) {
    return {
      available: false,
      history: 'technical_failure',
      reason: 'start_technical_failure',
    };
  }

  if (!state.accepted) {
    return { available: false, history: 'missing', reason: 'start_missing' };
  }

  if (state.resume_closed_reason !== null) {
    return {
      available: false,
      history: 'closed',
      reason: `resume_${state.resume_closed_reason}`,
    };
  }

  if (state.interruption_at_ms === null) {
    return {
      available: false,
      history: 'exited',
      reason: 'start_not_interrupted',
    };
  }

  if (startInvalid) {
    return { available: true, history: 'invalid', reason: 'start_invalid' };
  }

  return { available: true, history: 'valid', reason: 'start_valid' };
}

/** The resume opportunity is PRESENTED (console available inside; once). */
export function m20PresentResume(state: M20State, nowMs: number): boolean {
  if (
    !m20ResumeAvailability(state).available ||
    state.resume_presented_at_ms !== null
  ) {
    return false;
  }

  state.resume_presented_at_ms = nowMs;

  return true;
}

export function m20ResumePresented(state: M20State): boolean {
  return state.resume_presented_at_ms !== null;
}

/** Console opened (any availability): a read of the persisted state. */
export function m20InspectConsole(state: M20State): void {
  state.console_inspections += 1;
}

/** The participant chose to resume (once; requires the presentation). */
export function m20Return(state: M20State, nowMs: number): boolean {
  if (
    state.resume_presented_at_ms === null ||
    state.returned_at_ms !== null ||
    state.resume_closed_reason !== null
  ) {
    return false;
  }

  state.returned_at_ms = nowMs;

  return true;
}

export function m20Returned(state: M20State): boolean {
  return state.returned_at_ms !== null;
}

/** The next indoor stage the participant can perform, or null. */
export function m20NextIndoorStage(state: M20State): M20IndoorStage | null {
  if (state.returned_at_ms === null || state.resume_closed_reason !== null) {
    return null;
  }

  return M20_INDOOR_STAGES[state.indoor_stages_done.length] ?? null;
}

export function m20IndoorComplete(state: M20State): boolean {
  return state.indoor_stages_done.length === M20_INDOOR_STAGES.length;
}

/** Completes the NEXT indoor stage only (fixed order; idempotent). */
export function m20CompleteIndoorStage(
  state: M20State,
  stage: M20IndoorStage,
  nowMs: number,
): boolean {
  if (m20NextIndoorStage(state) !== stage) {
    return false;
  }

  state.indoor_stages_done.push(stage);
  state.indoor_stage_completed_at_ms[stage] = nowMs;

  if (m20Complete(state)) {
    state.completed_at_ms = nowMs;
  }

  return true;
}

/** Restoration complete = every outdoor AND indoor stage done. */
export function m20Complete(state: M20State): boolean {
  return m20OutdoorComplete(state) && m20IndoorComplete(state);
}

/** Console left with the restoration unfinished (window stays open). */
export function m20LeaveConsole(state: M20State): boolean {
  if (state.returned_at_ms === null || m20Complete(state)) {
    return false;
  }

  state.console_departures += 1;

  return true;
}

/** Closes the resume phase (completion or the review). Idempotent. */
export function m20CloseResume(
  state: M20State,
  reason: 'completed' | 'closed_at_review',
): boolean {
  if (state.resume_closed_reason !== null) {
    return false;
  }

  state.resume_closed_reason = reason;

  return true;
}

/**
 * Item-owned raw components of the resume/end phase (ledger names first).
 * Descriptions of state — never a score. `resume_latency` is measured
 * from the PRESENTATION of the resume opportunity (console available
 * inside) to the resume act; `interruption_to_return_ms` is context.
 */
export function m20ResumeRawComponents(state: M20State) {
  const presented = state.resume_presented_at_ms;
  const returned = state.returned_at_ms;

  return {
    progress_pre_interruption: state.progress_pre_interruption,
    returned: returned !== null,
    resume_latency:
      presented === null || returned === null ? null : returned - presented,
    useful_resume_actions: state.indoor_stages_done.length,
    // Null (not false) while an outdoor stage remains: the console cannot
    // complete the restoration, so the end-phase variable is unobservable.
    completion: m20OutdoorComplete(state) ? m20Complete(state) : null,
    start_history: m20ResumeAvailability(state).history,
    outdoor_stages_done: [...state.stages_done],
    indoor_stages_done: [...state.indoor_stages_done],
    outdoor_complete: m20OutdoorComplete(state),
    indoor_complete: m20IndoorComplete(state),
    interruption_to_return_ms:
      state.interruption_at_ms === null || returned === null
        ? null
        : returned - state.interruption_at_ms,
    resume_presented: presented !== null,
    console_inspections: state.console_inspections,
    console_departures: state.console_departures,
    resume_closed_reason: state.resume_closed_reason,
  };
}

/** Participant-facing feed-console status line (operational; no item wording). */
export function m20ConsoleStatus(state: M20State): string {
  const availability = m20ResumeAvailability(state);

  if (m20Complete(state)) {
    return 'FEED CONSOLE · Mast 04 feed aligned — restoration complete';
  }

  if (state.returned_at_ms !== null) {
    return `FEED CONSOLE · Mast 04 alignment in progress (${state.indoor_stages_done.length}/${M20_INDOOR_STAGES.length})`;
  }

  switch (availability.history) {
    case 'valid':
    case 'invalid':
      return m20OutdoorComplete(state)
        ? 'FEED CONSOLE · Mast 04 feed seated — ALIGNMENT PENDING'
        : `FEED CONSOLE · Mast 04 restoration on file (${state.stages_done.length}/${M20_OUTDOOR_STAGES.length} outdoor stages) — alignment pending`;
    case 'exited':
      return 'FEED CONSOLE · Mast 04 restoration on file — exterior shift not yet logged';
    case 'technical_failure':
      return 'FEED CONSOLE · offline — fault logged';
    case 'closed':
      return 'FEED CONSOLE · Mast 04 job closed for this shift';
    case 'missing':
    default:
      return 'FEED CONSOLE · no feed-alignment job on file';
  }
}

/** Start-window snapshot (probe / persistence tests). */
export function m20Snapshot(state: M20State) {
  return {
    accepted: state.accepted,
    accepted_at_ms: state.accepted_at_ms,
    stages_done: [...state.stages_done],
    outdoor_stages_total: M20_OUTDOOR_STAGES.length,
    outdoor_complete: m20OutdoorComplete(state),
    next_stage: m20NextStage(state),
    indoor_stage_pending: state.accepted && !m20Complete(state),
    interruption_recorded: state.interruption_at_ms !== null,
    progress_pre_interruption: state.progress_pre_interruption,
    departures: state.departures,
    // Episode-5 raw components (Unit 5): written by the resume phase only.
    resume_presented: state.resume_presented_at_ms !== null,
    returned: state.returned_at_ms === null ? null : true,
    resume_latency:
      state.resume_presented_at_ms === null || state.returned_at_ms === null
        ? null
        : state.returned_at_ms - state.resume_presented_at_ms,
    useful_resume_actions:
      state.returned_at_ms === null ? null : state.indoor_stages_done.length,
    indoor_stages_done: [...state.indoor_stages_done],
    completion: state.returned_at_ms === null ? null : m20Complete(state),
    resume_closed_reason: state.resume_closed_reason,
    resume_window_implemented: true,
  };
}
