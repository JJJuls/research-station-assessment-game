/**
 * M09 — the monitor watch: three due checks of ONE voluntarily accepted
 * duty (Station 080 M01–M26 run, Unit 15). PURE (no Phaser, no runtime
 * import): the window adapter (`m09MonitorWatch.ts`) owns the register
 * window and the log sink; the Concourse scene calls the commands below
 * with the route stage and the observed input.
 *
 * Approved design (specification, M09 row): three brief watch checks at
 * distinct route milestones after one voluntary acceptance; the accepted
 * duty, its due status and the access stay visible; reminders use the same
 * wording and salience; the checks stay voluntary after acceptance.
 *
 * Administration `m09-watch-checks-v1`:
 *   offer     Vale, at the end of the briefing (accept / decline / later —
 *             all three deliberate; a press inside the settle window is
 *             refused and the stage re-presented).
 *   check 1   opens at acceptance; closes at the first Concourse exit.
 *   check 2   opens at the first Concourse entry on the way to the
 *             laboratory or the yard; closes at the first exit of that
 *             visit.
 *   check 3   opens at the first Concourse entry back from the yard;
 *             closes at the first exit of that visit through ANY door —
 *             research-owner decision D-U15-1 (6 October 2026), replacing
 *             the earlier until-review deadline. A later reading never
 *             changes the check's first outcome.
 * The first gauge reading inside an open window fulfils the check and
 * closes it; every other reading is recorded uncredited. A window that
 * closes without a reading is an observed miss; one still open at the
 * review is censored; one never opened is simply absent.
 *
 * Measure (register `m09_due_checks_fulfilled`): checks fulfilled /
 * eligible checks (opened with access, closed by a reading or by leaving),
 * three planned. The three checks share one accepted duty — repeated
 * observations, never three situations. Nothing here is a value: the
 * module records what happened and when.
 */
import type { ObservedInput } from '../inputObservation';

export const M09_FAMILY = 'proto_m09_checks_';
export const M09_OPPORTUNITY_ID = 'proto_m09_watch_duty';
export const M09_ENTRY_STATE_VERSION = 'm09-watch-checks-v1';
export const M09_OBJECT_ID = 'm09_monitor_gauge';
export const M09_GAUGE_REGISTRY_ID = 'concourse.monitor_gauge';
export const M09_CHECKS_PLANNED = 3;
/** Presses sooner than this after the offer stage appears are refused. */
export const M09_SETTLE_MS = 300;

export type M09CheckIndex = 1 | 2 | 3;
export type M09Milestone = 'acceptance' | 'lab_pass' | 'return_pass';
export type M09Outcome = 'fulfilled' | 'missed' | 'censored';
export type M09CloseReason = 'read' | 'left_concourse' | 'review';
export type M09UncreditedReason =
  | 'no_check_due'
  | 'already_fulfilled'
  | 'duty_not_accepted'
  | 'duty_closed';
export type M09LogSink = (
  suffix: string,
  metadata: Record<string, unknown>,
) => void;

export const M09_CHECK_INDICES: readonly M09CheckIndex[] = [1, 2, 3];

export const M09_WINDOW_IDS: Record<M09CheckIndex, string> = {
  1: 'm09_duty_check_1',
  2: 'm09_duty_check_2',
  3: 'm09_duty_check_3',
};

export const M09_MILESTONES: Record<M09CheckIndex, M09Milestone> = {
  1: 'acceptance',
  2: 'lab_pass',
  3: 'return_pass',
};

/** Route stages of the pass toward the laboratory and the yard (check 2). */
export const M09_LAB_PASS_STAGES: readonly string[] = [
  'lab_briefing',
  'lab_work',
  'exterior_briefing',
  'exterior_work',
];

/** Route stages from the return inside onwards (check 3). */
export const M09_RETURN_STAGES: readonly string[] = [
  'return_hub',
  'workshop_return',
  'deck_closure',
  'core_stabilise',
  'core_sync',
  'complete',
];

// ——— Participant-facing copy (operational; no study wording) ————————————

export const M09_OFFER_WORDING_ID = 'm09_offer_v1';
export const M09_OFFER_BODY =
  'Vale: One more thing — will you take the monitor watch this shift? Three gauge readings: one now, one when you come back through on your way to the laboratory, and one when you are back inside from the yard. Each is due before you leave the Concourse that time. Your station log (M) shows the watch.';
export const M09_OFFER_LABELS = {
  accept: 'I will take the watch.',
  decline: 'Not this shift.',
  defer: 'Ask me again later.',
} as const;
export const M09_REASK_LABEL = 'About the monitor watch…';

export type M09LogLineId =
  | 'm09_log_due'
  | 'm09_log_next_lab_pass'
  | 'm09_log_next_return_pass';

/** The due line is ONE sentence for all three checks (equal reminders). */
export const M09_LOG_LINES: Record<M09LogLineId, string> = {
  m09_log_due:
    'Monitor watch: reading due — read the gauge before you leave the Concourse.',
  m09_log_next_lab_pass:
    'Monitor watch: next reading on your way through to the laboratory.',
  m09_log_next_return_pass:
    'Monitor watch: next reading when you are back inside from the yard.',
};

export interface M09Reading {
  reading_id: string;
  values: string;
}

/** Gauge values by route band (the monitored loop drifts over the shift). */
export const M09_READINGS: Record<
  'outbound' | 'lab_pass' | 'return',
  M09Reading
> = {
  outbound: {
    reading_id: 'm09_reading_outbound',
    values: 'loop 1.6 bar · bus 26.8 V · relay LOCK',
  },
  lab_pass: {
    reading_id: 'm09_reading_lab_pass',
    values: 'loop 1.5 bar ▼ · bus 26.4 V ▼ · relay LOCK',
  },
  return: {
    reading_id: 'm09_reading_return',
    values: 'loop 1.4 bar ▼ · bus 26.1 V ▼ · relay LOCK',
  },
};

export function m09Reading(stage: string): M09Reading {
  if (M09_RETURN_STAGES.includes(stage)) {
    return M09_READINGS.return;
  }

  return M09_LAB_PASS_STAGES.includes(stage)
    ? M09_READINGS.lab_pass
    : M09_READINGS.outbound;
}

/** What the gauge says when read (the credit is stated, never judged). */
export function m09GaugeFeedback(stage: string, credited: boolean): string {
  const { values } = m09Reading(stage);

  return credited
    ? `Gauge read: ${values}. Watch reading logged.`
    : `Gauge read: ${values}.`;
}

// ——— State ————————————————————————————————————————————————————————————

export interface M09Access {
  /** The gauge can be read in this visit (objective, from the scene). */
  available: boolean;
  basis: string;
  registry_id: string;
}

export interface M09Check {
  check_index: M09CheckIndex;
  milestone: M09Milestone;
  opened_at_ms: number | null;
  stage_at_open: string | null;
  access: M09Access | null;
  /** Concourse visit (entry count) the window belongs to. */
  visit: number | null;
  fulfilled_at_ms: number | null;
  due_delta_ms: number | null;
  reading_id: string | null;
  input_mode: ObservedInput['input_mode'] | null;
  input_mode_basis: ObservedInput['input_mode_basis'] | null;
  closed_at_ms: number | null;
  outcome: M09Outcome | null;
  reason: M09CloseReason | null;
  exit_to: string | null;
  log_views_while_due: number;
}

export type M09DutyClosure = 'checks_complete' | 'review' | 'declined';

export interface M09State {
  presented_at_ms: number | null;
  /** Wall time of the most recent presentation (the settle reference). */
  last_presented_at_ms: number | null;
  presentations: number;
  refused_presses: number;
  answer: 'accept' | 'decline' | null;
  answered_at_ms: number | null;
  answer_position: number | null;
  answer_input: ObservedInput | null;
  /** Concourse entries counted by the scene (the visit serial). */
  visit: number;
  checks: Record<M09CheckIndex, M09Check>;
  uncredited_reads: number;
  log_views: number;
  duty_closed_at_ms: number | null;
  duty_closure: M09DutyClosure | null;
}

function createCheck(index: M09CheckIndex): M09Check {
  return {
    check_index: index,
    milestone: M09_MILESTONES[index],
    opened_at_ms: null,
    stage_at_open: null,
    access: null,
    visit: null,
    fulfilled_at_ms: null,
    due_delta_ms: null,
    reading_id: null,
    input_mode: null,
    input_mode_basis: null,
    closed_at_ms: null,
    outcome: null,
    reason: null,
    exit_to: null,
    log_views_while_due: 0,
  };
}

export function createM09State(): M09State {
  return {
    presented_at_ms: null,
    last_presented_at_ms: null,
    presentations: 0,
    refused_presses: 0,
    answer: null,
    answered_at_ms: null,
    answer_position: null,
    answer_input: null,
    visit: 0,
    checks: { 1: createCheck(1), 2: createCheck(2), 3: createCheck(3) },
    uncredited_reads: 0,
    log_views: 0,
    duty_closed_at_ms: null,
    duty_closure: null,
  };
}

export function m09Accepted(s: M09State): boolean {
  return s.answer === 'accept';
}

/** The duty is accepted and not yet finished (checks may still open). */
export function m09DutyActive(s: M09State): boolean {
  return s.answer === 'accept' && s.duty_closed_at_ms === null;
}

/** The check whose window is open right now (at most one). */
export function m09OpenCheck(s: M09State): M09Check | null {
  for (const index of M09_CHECK_INDICES) {
    const check = s.checks[index];

    if (check.opened_at_ms !== null && check.closed_at_ms === null) {
      return check;
    }
  }

  return null;
}

function lastClosedCheck(s: M09State): M09Check | null {
  let last: M09Check | null = null;

  for (const index of M09_CHECK_INDICES) {
    if (s.checks[index].closed_at_ms !== null) {
      last = s.checks[index];
    }
  }

  return last;
}

// ——— Offer ————————————————————————————————————————————————————————————

/**
 * The offer stage is shown. The FIRST showing is the presentation (logged
 * once, never backdated); a later showing (the re-ask, or the stage
 * re-presented after a refused press) only moves the settle reference.
 */
export function m09Present(
  s: M09State,
  nowMs: number,
  log: M09LogSink,
): boolean {
  if (s.answer !== null) {
    return false;
  }

  s.last_presented_at_ms = nowMs;
  s.presentations += 1;

  if (s.presented_at_ms !== null) {
    return false;
  }

  s.presented_at_ms = nowMs;
  log('presented', {
    checks_planned: M09_CHECKS_PLANNED,
    milestones: M09_CHECK_INDICES.map((index) => M09_MILESTONES[index]),
    window_ids: M09_CHECK_INDICES.map((index) => M09_WINDOW_IDS[index]),
    wording_id: M09_OFFER_WORDING_ID,
    log_line_ids: Object.keys(M09_LOG_LINES),
    option_count: 3,
    settle_ms: M09_SETTLE_MS,
    input_mode: 'system',
  });

  return true;
}

/** True when the press is past the settle window; a refusal is logged. */
function settled(
  s: M09State,
  optionPosition: number,
  optionCount: number,
  nowMs: number,
  log: M09LogSink,
): boolean {
  const latency = nowMs - (s.last_presented_at_ms ?? nowMs);

  if (latency >= M09_SETTLE_MS) {
    return true;
  }

  s.refused_presses += 1;
  log('offer_press_refused', {
    option_position: optionPosition,
    option_count: optionCount,
    latency_ms: latency,
    settle_ms: M09_SETTLE_MS,
    refused_presses: s.refused_presses,
    input_mode: 'system',
  });

  return false;
}

export type M09AnswerResult = 'accepted' | 'declined' | 'refused' | 'invalid';

/** The explicit answer: the first read press is the record. */
export function m09Answer(
  s: M09State,
  answer: 'accept' | 'decline',
  optionPosition: number,
  optionCount: number,
  nowMs: number,
  input: ObservedInput,
  log: M09LogSink,
): M09AnswerResult {
  if (s.presented_at_ms === null || s.answer !== null) {
    return 'invalid';
  }

  if (!settled(s, optionPosition, optionCount, nowMs, log)) {
    return 'refused';
  }

  s.answer = answer;
  s.answered_at_ms = nowMs;
  s.answer_position = optionPosition;
  s.answer_input = input;

  if (answer === 'decline') {
    s.duty_closed_at_ms = nowMs;
    s.duty_closure = 'declined';
  }

  log('offer_answered', {
    answer,
    option_position: optionPosition,
    option_count: optionCount,
    latency_ms: nowMs - (s.last_presented_at_ms ?? nowMs),
    presentations: s.presentations,
    refused_presses: s.refused_presses,
    input_mode: input.input_mode,
    input_mode_basis: input.input_mode_basis,
  });

  return answer === 'accept' ? 'accepted' : 'declined';
}

export type M09DeferResult = 'deferred' | 'refused' | 'invalid';

/**
 * "Ask me again later." — no answer is recorded (the route telemetry
 * carries the deferral); only the settle window applies.
 */
export function m09Defer(
  s: M09State,
  optionPosition: number,
  optionCount: number,
  nowMs: number,
  log: M09LogSink,
): M09DeferResult {
  if (s.presented_at_ms === null || s.answer !== null) {
    return 'invalid';
  }

  return settled(s, optionPosition, optionCount, nowMs, log)
    ? 'deferred'
    : 'refused';
}

// ——— Check windows ————————————————————————————————————————————————————

function openCheck(
  s: M09State,
  index: M09CheckIndex,
  stage: string,
  access: M09Access,
  nowMs: number,
  log: M09LogSink,
) {
  const check = s.checks[index];

  check.opened_at_ms = nowMs;
  check.stage_at_open = stage;
  check.access = { ...access };
  check.visit = s.visit;
  log('check_window_opened', {
    check_index: index,
    check_window_id: M09_WINDOW_IDS[index],
    milestone: check.milestone,
    stage,
    visit: s.visit,
    access: { ...access },
    input_mode: 'system',
  });
}

/** Check 1 opens at acceptance (the duty was taken in the Concourse). */
export function m09OpenAcceptanceCheck(
  s: M09State,
  stage: string,
  access: M09Access,
  nowMs: number,
  log: M09LogSink,
): boolean {
  if (!m09DutyActive(s) || s.checks[1].opened_at_ms !== null) {
    return false;
  }

  openCheck(s, 1, stage, access, nowMs, log);

  return true;
}

/**
 * A Concourse entry. Counts the visit and opens the check whose milestone
 * this entry is — the lab pass (check 2) or the return pass (check 3) —
 * once each. No other entry opens anything.
 */
export function m09ConcourseEntered(
  s: M09State,
  stage: string,
  access: M09Access,
  nowMs: number,
  log: M09LogSink,
): M09CheckIndex | null {
  s.visit += 1;

  if (!m09DutyActive(s) || m09OpenCheck(s) !== null) {
    return null;
  }

  if (M09_RETURN_STAGES.includes(stage)) {
    if (s.checks[3].opened_at_ms !== null) {
      return null;
    }

    openCheck(s, 3, stage, access, nowMs, log);

    return 3;
  }

  if (
    M09_LAB_PASS_STAGES.includes(stage) &&
    s.checks[2].opened_at_ms === null &&
    s.checks[3].opened_at_ms === null
  ) {
    openCheck(s, 2, stage, access, nowMs, log);

    return 2;
  }

  return null;
}

function closeCheck(
  s: M09State,
  check: M09Check,
  outcome: M09Outcome,
  reason: M09CloseReason,
  exitTo: string | null,
  nowMs: number,
  log: M09LogSink,
) {
  check.closed_at_ms = nowMs;
  check.outcome = outcome;
  check.reason = reason;
  check.exit_to = exitTo;
  log('check_window_closed', {
    check_index: check.check_index,
    check_window_id: M09_WINDOW_IDS[check.check_index],
    outcome,
    reason,
    exit_to: exitTo,
    open_ms: nowMs - (check.opened_at_ms ?? nowMs),
    log_views_while_due: check.log_views_while_due,
    input_mode: 'system',
  });

  // The third check's closure finishes the duty (D-U15-1: at the reading
  // or at the first exit, whichever comes first).
  if (check.check_index === 3 && s.duty_closed_at_ms === null) {
    s.duty_closed_at_ms = nowMs;
    s.duty_closure = 'checks_complete';
  }
}

export interface M09ReadResult {
  credited: boolean;
  check_index: M09CheckIndex | null;
  /** The duty finished with this reading (check 3 fulfilled). */
  duty_finished: boolean;
}

/**
 * The gauge was read. Inside an open window the FIRST reading fulfils the
 * check and closes it; any other reading is recorded uncredited and never
 * repairs or changes an earlier outcome.
 */
export function m09ReadGauge(
  s: M09State,
  stage: string,
  nowMs: number,
  input: ObservedInput,
  log: M09LogSink,
): M09ReadResult {
  const reading = m09Reading(stage);
  const open = m09DutyActive(s) ? m09OpenCheck(s) : null;

  if (open === null) {
    const last = lastClosedCheck(s);
    let reason: M09UncreditedReason;

    if (s.answer !== 'accept') {
      reason = 'duty_not_accepted';
    } else if (
      last !== null &&
      last.outcome === 'fulfilled' &&
      last.visit === s.visit
    ) {
      reason = 'already_fulfilled';
    } else if (s.duty_closed_at_ms !== null) {
      reason = 'duty_closed';
    } else {
      reason = 'no_check_due';
    }

    s.uncredited_reads += 1;
    log('gauge_read_uncredited', {
      reason,
      reading_id: reading.reading_id,
      stage,
      last_closed_check_index: last?.check_index ?? null,
      last_closed_outcome: last?.outcome ?? null,
      uncredited_reads: s.uncredited_reads,
      input_mode: input.input_mode,
      input_mode_basis: input.input_mode_basis,
    });

    return { credited: false, check_index: null, duty_finished: false };
  }

  open.fulfilled_at_ms = nowMs;
  open.due_delta_ms = nowMs - (open.opened_at_ms ?? nowMs);
  open.reading_id = reading.reading_id;
  open.input_mode = input.input_mode;
  open.input_mode_basis = input.input_mode_basis;
  log('check_fulfilled', {
    check_index: open.check_index,
    check_window_id: M09_WINDOW_IDS[open.check_index],
    due_delta_ms: open.due_delta_ms,
    reading_id: reading.reading_id,
    stage,
    input_mode: input.input_mode,
    basis: input.input_mode_basis,
  });
  closeCheck(s, open, 'fulfilled', 'read', null, nowMs, log);

  return {
    credited: true,
    check_index: open.check_index,
    duty_finished: open.check_index === 3,
  };
}

export interface M09ExitResult {
  closed: M09CheckIndex | null;
  /** The duty finished with this exit (check 3 left unread). */
  duty_finished: boolean;
}

/**
 * The Concourse was left through a door. An open window closes as a miss
 * — for every check, the third included (D-U15-1).
 */
export function m09ConcourseExited(
  s: M09State,
  exitTo: string | null,
  nowMs: number,
  log: M09LogSink,
): M09ExitResult {
  const open = m09DutyActive(s) ? m09OpenCheck(s) : null;

  if (open === null) {
    return { closed: null, duty_finished: false };
  }

  closeCheck(s, open, 'missed', 'left_concourse', exitTo, nowMs, log);

  return { closed: open.check_index, duty_finished: open.check_index === 3 };
}

/**
 * The shift review: a window still open is censored (never a miss), and
 * the duty ends with whatever checks were reached. Returns whether this
 * call ended the duty.
 */
export function m09CloseAtReview(
  s: M09State,
  nowMs: number,
  log: M09LogSink,
): boolean {
  if (!m09DutyActive(s)) {
    return false;
  }

  const open = m09OpenCheck(s);

  if (open !== null) {
    closeCheck(s, open, 'censored', 'review', null, nowMs, log);
  }

  if (s.duty_closed_at_ms === null) {
    s.duty_closed_at_ms = nowMs;
    s.duty_closure = 'review';
  }

  return true;
}

// ——— Station log ——————————————————————————————————————————————————————

/**
 * The watch's one station-log line under the current stage, or null when
 * the log shows none (duty not accepted, or finished).
 */
export function m09LogLine(
  s: M09State,
  stage: string,
): { line_id: M09LogLineId; text: string } | null {
  if (!m09DutyActive(s)) {
    return null;
  }

  let lineId: M09LogLineId;

  if (m09OpenCheck(s) !== null) {
    lineId = 'm09_log_due';
  } else if (
    s.checks[2].opened_at_ms !== null ||
    M09_RETURN_STAGES.includes(stage)
  ) {
    lineId = 'm09_log_next_return_pass';
  } else {
    lineId = 'm09_log_next_lab_pass';
  }

  return { line_id: lineId, text: M09_LOG_LINES[lineId] };
}

/**
 * The station log was opened while the duty is active: one exposure record
 * (which line, where it stood, whether it was rendered) — counted for the
 * check that is due when it was actually shown.
 */
export function m09NoteLogViewed(
  s: M09State,
  stage: string,
  view: { rendered: boolean; log_position: number | null },
  log: M09LogSink,
): boolean {
  const line = m09LogLine(s, stage);

  if (line === null) {
    return false;
  }

  const open = m09OpenCheck(s);

  s.log_views += 1;

  if (open !== null && view.rendered) {
    open.log_views_while_due += 1;
  }

  log('log_viewed', {
    due_check_index: open?.check_index ?? null,
    line_id: line.line_id,
    log_position: view.log_position,
    rendered: view.rendered,
    stage,
    log_views: s.log_views,
    input_mode: 'system',
  });

  return true;
}

// ——— Closure record and reload guard ——————————————————————————————————

/** Raw components for the duty's window closure (a record, never a value). */
export function m09RawComponents(s: M09State, closureReason: string) {
  const observed = M09_CHECK_INDICES.map((index) => s.checks[index]).filter(
    (check) => check.opened_at_ms !== null,
  );

  return {
    administration_version: M09_ENTRY_STATE_VERSION,
    offered: s.presented_at_ms !== null,
    answer: s.answer,
    answer_position: s.answer_position,
    answer_input_mode: s.answer_input?.input_mode ?? null,
    presentations: s.presentations,
    refused_presses: s.refused_presses,
    checks_planned: M09_CHECKS_PLANNED,
    checks: observed.map((check) => ({
      check_index: check.check_index,
      milestone: check.milestone,
      stage_at_open: check.stage_at_open,
      access_available: check.access?.available ?? null,
      outcome: check.outcome,
      reason: check.reason,
      exit_to: check.exit_to,
      due_delta_ms: check.due_delta_ms,
      reading_id: check.reading_id,
      input_mode: check.input_mode,
      log_views_while_due: check.log_views_while_due,
    })),
    checks_opened: observed.length,
    checks_fulfilled: observed.filter((check) => check.outcome === 'fulfilled')
      .length,
    uncredited_reads: s.uncredited_reads,
    log_views: s.log_views,
    observations_share_one_duty: true,
    closure_reason: closureReason,
  };
}

/**
 * Reload guard: true when an earlier page load already presented the
 * watch offer — it is then never offered again in this load.
 */
export function m09PriorAdministration(
  priorLoadEvents: readonly { event_type: string }[],
): boolean {
  return priorLoadEvents.some(
    (event) => event.event_type === `${M09_FAMILY}presented`,
  );
}
