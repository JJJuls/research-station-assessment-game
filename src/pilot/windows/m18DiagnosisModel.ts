/**
 * M18 — the series model of the three diagnosis cases (Station 080 M01–M26
 * run, Unit 20; administration `m18-cases-v1`). PURE (no Phaser, no runtime
 * import): the window adapter (`m18DiagnosticBoard.ts`) owns the register
 * window and injects the log sink and the clock; the surface model
 * (`m18SurfaceModel.ts`) only renders this state and calls the adapter with
 * its input mode.
 *
 * Under research-owner decision D-U20-1 (12 October 2026): the first-opening
 * card; then three independently designed cases in fixed order, each
 * presented only after the previous case's planned-step answer. Per case:
 * three deterministic tests on request, unlimited and repeatable (each run a
 * logged interaction, never a response; a same-test repeat inside 400 ms
 * refused); ONE confirmed and immutable first diagnosis — a part or CANNOT
 * SOLVE (incorrect) — that closes the case's tests; then, never before, the
 * planned-step question with ONE confirmed and immutable first answer — an
 * option or CANNOT SOLVE (incorrect) — keyed to the ACTUAL case whatever
 * part was recorded; the identical neutral acknowledgement; no correctness
 * information of any kind before the sixth first response; then three
 * read-only results pages. Leaving keeps everything; there is no STOP
 * control; the review closure keeps the answers as they stand.
 *
 * Only a FRESH confirming press commits (M02 §5.210 / M13 §5.262 / M14 /
 * M15 / M16 precedent): a press inside the settle window is refused and
 * recorded; and EVERY view transition settles (the M14 closeout ruling
 * §5.290 (b) generalised): a press inside 400 ms of a view appearing tests,
 * drafts, requests, navigates, opens or closes nothing — it is recorded as
 * `press_refused` (target `view`, reason `settling`). A held key never
 * reaches this model (the surface drops repeats).
 *
 * Nothing here scores: the first responses are raw events, and both
 * features are recounted read-only by `features/m18.ts`. The keys and the
 * test results are the content module's approved data; this model never
 * derives a key from a rule function.
 */
import {
  M18_ASSIGNED_CASE_ORDER,
  M18_CASES,
  M18_CASES_PLANNED,
  M18_CONTENT_VERSION,
  M18_FAMILY,
  M18_FORM_ID,
  M18_RESPONSES_PER_CASE,
  M18_SETTLE_MS,
  M18_TEXT,
  type M18Case,
  m18Case,
  type M18CaseId,
  type M18ResponseKind,
  m18ResultFor,
  type M18Slot,
} from './m18DiagnosisContent';

export type M18InputMode = 'pointer' | 'keyboard' | 'system';
export type M18Phase = 'intro' | 'measurement' | 'feedback' | 'closure';
export type M18CommitKind = 'option' | 'cannot_solve';
export type M18NextControl = 'next_case' | 'show_results';
export type M18ResultsPage = 1 | 2 | 3;
export type M18LogSink = (
  suffix: string,
  metadata: Record<string, unknown>,
) => void;

export type M18Status =
  | 'unopened'
  | 'intro'
  | 'measurement'
  | 'completed'
  | 'closed_at_review'
  | 'held_back'
  | 'technical_failure';

export type M18View =
  | 'intro'
  | 'case'
  | 'step'
  | 'acknowledgement'
  | 'results'
  | 'record';

/** Every suffix the family may log (contract §9.2; names fixed). */
export const M18_EVENT_SUFFIXES = [
  'presented',
  'opportunity_opened',
  'intro_acknowledged',
  'series_reopened',
  'panel_left',
  'prior_load_checked',
  'case_presented',
  'test_run',
  'press_refused',
  'option_drafted',
  'commit_requested',
  'commit_cancelled',
  'commit_press_refused',
  'commit_without_draft',
  'first_response',
  'tests_closed',
  'step_presented',
  'response_acknowledged',
  'first_responses_completed',
  'results_shown',
  'help_consulted',
  'series_closed_at_review',
  'technical_failure',
  'window_closed',
] as const;

export const M18_RELOAD_DETAIL =
  'reload after administration: board not re-run';
export const M18_ACK_LINE_ID = 'case_recorded';

/* ------------------------------------------------------------------ *
 * State
 * ------------------------------------------------------------------ */

export interface M18FirstResponse {
  slot: M18Slot;
  response_kind: M18ResponseKind;
  option_id: string | null;
  correct: boolean;
  key_option_id: string;
  /** The tests run before the part was recorded (ids, A–C order). */
  tests_run_before: string[];
  /** The test runs before the part was recorded, repeats included. */
  test_runs_before: number;
  drafts_before: number;
  help_consults_before: number;
  active_ms: number;
  focused_ms: number | null;
  refused_presses: number;
  input_mode: M18InputMode;
}

export interface M18TestState {
  id: string;
  runs: number;
  last_run_at_ms: number | null;
  /** The result shown (the content's result id), once run. */
  result_id: string | null;
}

export interface M18SlotState {
  draft: string | null;
  drafts: number;
  help_consults: number;
  active_ms: number;
  first_response: M18FirstResponse | null;
}

export interface M18CaseState {
  id: M18CaseId;
  index: number;
  presented: boolean;
  tests: M18TestState[];
  step_presented: boolean;
  diagnosis: M18SlotState;
  prediction: M18SlotState;
}

export interface M18PendingCommit {
  slot: M18Slot;
  kind: M18CommitKind;
  option_id: string | null;
  opened_at_ms: number;
  refused_presses: number;
  refusal_recorded: boolean;
}

export interface M18Series {
  status: M18Status;
  view: M18View;
  open_count: number;
  panel_open: boolean;
  intro_acknowledged: boolean;
  /** Index of the current case (0–2). */
  case: number;
  cases: M18CaseState[];
  pending_commit: M18PendingCommit | null;
  acknowledgement: {
    opened_at_ms: number;
    next_control: M18NextControl;
  } | null;
  help_open: boolean;
  help_consults: Record<M18Phase, number>;
  results_page: M18ResultsPage;
  results_shown: Record<M18ResultsPage, boolean>;
  closure_reason: 'completed' | 'closed_at_review' | 'technical_failure' | null;
  failure_detail: string | null;
  last_tick_ms: number | null;
  /**
   * When the current view appeared (the settle of EVERY transition — the
   * M14 closeout ruling §5.290 (b) generalised): a press inside
   * `M18_SETTLE_MS` of it changes nothing.
   */
  view_shown_at_ms: number | null;
}

function slotState(): M18SlotState {
  return {
    draft: null,
    drafts: 0,
    help_consults: 0,
    active_ms: 0,
    first_response: null,
  };
}

export function createM18Series(): M18Series {
  return {
    status: 'unopened',
    view: 'intro',
    open_count: 0,
    panel_open: false,
    intro_acknowledged: false,
    case: 0,
    cases: M18_CASES.map((entry) => ({
      id: entry.id,
      index: entry.index,
      presented: false,
      tests: entry.tests.map((item) => ({
        id: item.id,
        runs: 0,
        last_run_at_ms: null,
        result_id: null,
      })),
      step_presented: false,
      diagnosis: slotState(),
      prediction: slotState(),
    })),
    pending_commit: null,
    acknowledgement: null,
    help_open: false,
    help_consults: { intro: 0, measurement: 0, feedback: 0, closure: 0 },
    results_page: 1,
    results_shown: { 1: false, 2: false, 3: false },
    closure_reason: null,
    failure_detail: null,
    last_tick_ms: null,
    view_shown_at_ms: null,
  };
}

/* ------------------------------------------------------------------ *
 * Reload guard and entry snapshot
 * ------------------------------------------------------------------ */

/** True when an earlier page load of this identity already opened the board. */
export function m18PriorAdministration(
  priorLoadEvents: readonly { event_type: string }[],
): boolean {
  return priorLoadEvents.some(
    (event) => event.event_type === `${M18_FAMILY}opportunity_opened`,
  );
}

/** The losslessness evidence the runtime keeps beside the raw events. */
export interface M18HistoryIntegrity {
  first_sequence: number | null;
  sequence_gap_count: number;
  sequence_duplicate_count: number;
  /** The store's meta record was unreadable; the history came from chunks. */
  recovered_from_chunks: boolean;
}

/** The reload check written once per page load after a reload. */
export interface M18PriorLoadCheck {
  page_load_index: number;
  prior_page_load_event_count: number;
  prior_opening_found: boolean;
  prior_briefing_found: boolean;
  history_continuous: boolean;
  prior_opening_absence_established: boolean;
}

/**
 * The reload check of a later page load (decision D-U20-1 item 9; the M14
 * closeout ruling §5.290 (a), D-U18-1 item 6 and D-U19-1 item 8 applied to
 * M18): the absence of an earlier opening is ESTABLISHED only when the
 * recovered history is continuous — at least one earlier record, sequence
 * numbers running from 1 without a gap or a duplicate, and the store's own
 * meta record readable — and holds no `opportunity_opened` of this family.
 * A missing or broken history never establishes absence; a found opening is
 * the hold-back. An earlier briefing is reported, never read as an opening.
 */
export function m18PriorLoadCheck(
  pageLoadIndex: number,
  priorLoadEvents: readonly { event_type: string }[],
  integrity: M18HistoryIntegrity,
): M18PriorLoadCheck {
  const found = m18PriorAdministration(priorLoadEvents);
  const continuous =
    priorLoadEvents.length > 0 &&
    integrity.first_sequence === 1 &&
    integrity.sequence_gap_count === 0 &&
    integrity.sequence_duplicate_count === 0 &&
    integrity.recovered_from_chunks === false;

  return {
    page_load_index: pageLoadIndex,
    prior_page_load_event_count: priorLoadEvents.length,
    prior_opening_found: found,
    prior_briefing_found: priorLoadEvents.some(
      (event) => event.event_type === `${M18_FAMILY}presented`,
    ),
    history_continuous: continuous,
    prior_opening_absence_established: !found && continuous,
  };
}

/** The entry-state snapshot written with `opportunity_opened` (contract §9.3). */
export function m18EntrySnapshot(
  stage: string | null,
  priorM13WindowStatus: string | null,
) {
  return {
    cases_planned: M18_CASES_PLANNED,
    responses_per_case: M18_RESPONSES_PER_CASE,
    form_id: M18_FORM_ID,
    content_version: M18_CONTENT_VERSION,
    assigned_case_order: [...M18_ASSIGNED_CASE_ORDER],
    cases: M18_CASES.map((entry) => ({
      case_id: entry.id,
      test_ids: entry.tests.map((item) => item.id),
      part_option_ids: entry.parts.map((option) => option.id),
      key_part_option_id: entry.key_part_option_id,
      step_option_ids: entry.steps.map((option) => option.id),
      key_step_option_id: entry.key_step_option_id,
    })),
    prediction_target: 'actual_case',
    tests: 'on_request_unlimited',
    tests_close: 'at_part_record',
    step_after: 'part_record',
    cannot_solve_available: true,
    feedback: 'after_all_first_responses',
    stop_control: false,
    settle_ms: M18_SETTLE_MS,
    stage,
    // Route context only (the U16 convention), never an input.
    prior_m13_window_status: priorM13WindowStatus,
  };
}

/* ------------------------------------------------------------------ *
 * Selectors
 * ------------------------------------------------------------------ */

export function m18Live(s: M18Series): boolean {
  return (
    s.status === 'intro' ||
    s.status === 'measurement' ||
    s.status === 'completed'
  );
}

export function m18Phase(s: M18Series): M18Phase {
  switch (s.status) {
    case 'intro':
      return 'intro';
    case 'measurement':
      return 'measurement';
    case 'completed':
      return 'feedback';
    default:
      return 'closure';
  }
}

export function m18CurrentCase(s: M18Series): M18Case {
  return m18Case(M18_ASSIGNED_CASE_ORDER[s.case]);
}

export function m18CurrentCaseState(s: M18Series): M18CaseState {
  return s.cases[s.case];
}

/** The slot the current view answers (null outside a case or step view). */
export function m18CurrentSlot(s: M18Series): M18Slot | null {
  return s.view === 'case'
    ? 'diagnosis'
    : s.view === 'step'
      ? 'prediction'
      : null;
}

export function m18PartsRecorded(s: M18Series): number {
  return s.cases.filter((entry) => entry.diagnosis.first_response !== null)
    .length;
}

export function m18StepsRecorded(s: M18Series): number {
  return s.cases.filter((entry) => entry.prediction.first_response !== null)
    .length;
}

/** The first responses recorded in all (0–6). */
export function m18AnsweredCount(s: M18Series): number {
  return m18PartsRecorded(s) + m18StepsRecorded(s);
}

/** The ids of the tests run at least once (A–C order). */
export function m18TestsRun(state: M18CaseState): string[] {
  return state.tests.filter((item) => item.runs > 0).map((item) => item.id);
}

/** The test runs of a case, repeats included. */
export function m18TestRuns(state: M18CaseState): number {
  return state.tests.reduce((sum, item) => sum + item.runs, 0);
}

/** A press inside the settle window of the current view changes nothing. */
export function m18Settling(s: M18Series, nowMs: number): boolean {
  return (
    s.view_shown_at_ms !== null && nowMs - s.view_shown_at_ms < M18_SETTLE_MS
  );
}

/** The record line of a closed board (null while the board is live). */
export function m18RecordLine(s: M18Series): string | null {
  switch (s.status) {
    case 'closed_at_review':
      return M18_TEXT.closed_at_review;
    case 'held_back':
      return M18_TEXT.held_back;
    case 'technical_failure':
      return M18_TEXT.fault;
    default:
      return null;
  }
}

/** The view name a help consult is recorded with (contract §9.2). */
export function m18HelpView(s: M18Series): string {
  switch (s.status) {
    case 'intro':
      return 'intro';
    case 'measurement':
      return `${s.view === 'acknowledgement' ? 'ack' : s.view === 'step' ? 'step' : 'case'}_${m18CurrentCase(s).index}`;
    case 'completed':
      return s.view === 'results'
        ? `results_${s.results_page}`
        : `ack_${M18_CASES_PLANNED}`;
    default:
      return 'record';
  }
}

/** The recorded part's name, CANNOT SOLVE, or null (not recorded). */
export function m18RecordedPartName(state: M18CaseState): string | null {
  const response = state.diagnosis.first_response;

  if (response === null) {
    return null;
  }

  if (response.response_kind === 'cannot_solve') {
    return M18_TEXT.cannot_solve_recorded;
  }

  return (
    m18Case(state.id).parts.find((option) => option.id === response.option_id)
      ?.name ?? null
  );
}

/** The recorded answer's text, CANNOT SOLVE, or null (not recorded). */
export function m18RecordedStepName(state: M18CaseState): string | null {
  const response = state.prediction.first_response;

  if (response === null) {
    return null;
  }

  if (response.response_kind === 'cannot_solve') {
    return M18_TEXT.cannot_solve_recorded;
  }

  return (
    m18Case(state.id).steps.find((option) => option.id === response.option_id)
      ?.name ?? null
  );
}

function slotRecord(slot: M18SlotState) {
  return {
    answered: slot.first_response !== null,
    response_kind: slot.first_response?.response_kind ?? null,
    option_id: slot.first_response?.option_id ?? null,
    correct: slot.first_response?.correct ?? null,
  };
}

/** The per-case record written on every closure event (contract §9.2). */
export function m18ClosureSnapshot(s: M18Series) {
  const cases = s.cases.map((entry) => ({
    case_id: entry.id,
    case_index: entry.index,
    presented: entry.presented,
    part: slotRecord(entry.diagnosis),
    step_presented: entry.step_presented,
    step: slotRecord(entry.prediction),
    tests_run: m18TestsRun(entry),
    test_runs: m18TestRuns(entry),
  }));

  return {
    cases_planned: M18_CASES_PLANNED,
    responses_per_case: M18_RESPONSES_PER_CASE,
    intro_acknowledged: s.intro_acknowledged,
    cases_presented: cases.filter((entry) => entry.presented).length,
    parts_recorded: cases.filter((entry) => entry.part.answered).length,
    steps_recorded: cases.filter((entry) => entry.step.answered).length,
    correct_first_diagnoses: cases.filter(
      (entry) => entry.part.correct === true,
    ).length,
    correct_consequence_predictions: cases.filter(
      (entry) => entry.step.correct === true,
    ).length,
    cannot_solve_parts: cases.filter(
      (entry) => entry.part.response_kind === 'cannot_solve',
    ).length,
    cannot_solve_steps: cases.filter(
      (entry) => entry.step.response_kind === 'cannot_solve',
    ).length,
    cases,
  };
}

/** The case of a results page (page k shows case k). */
export function m18ResultsCase(page: M18ResultsPage): M18Case {
  return M18_CASES[page - 1];
}

/* ------------------------------------------------------------------ *
 * Internals
 * ------------------------------------------------------------------ */

function fields(
  s: M18Series,
  scope: 'series' | 'case',
  phase: M18Phase = m18Phase(s),
): Record<string, unknown> {
  const base: Record<string, unknown> = {
    phase,
    form_id: M18_FORM_ID,
    content_version: M18_CONTENT_VERSION,
  };

  if (scope === 'case') {
    const entry = m18CurrentCase(s);

    Object.assign(base, { case_id: entry.id, case_index: entry.index });
  }

  return base;
}

/** The scope of the current view. */
function currentScope(s: M18Series): 'series' | 'case' {
  return s.status === 'measurement' ? 'case' : 'series';
}

/** Active time: accrues to the current case's open slot while its view is open. */
function tick(s: M18Series, nowMs: number) {
  if (s.last_tick_ms !== null && s.panel_open) {
    const elapsed = Math.max(0, nowMs - s.last_tick_ms);

    if (s.status === 'measurement') {
      const state = m18CurrentCaseState(s);

      if (s.view === 'case') {
        state.diagnosis.active_ms += elapsed;
      } else if (s.view === 'step') {
        state.prediction.active_ms += elapsed;
      }
    }
  }

  s.last_tick_ms = nowMs;
}

function showView(s: M18Series, view: M18View, nowMs: number) {
  s.view = view;
  s.view_shown_at_ms = nowMs;
}

/**
 * A press that would have acted, arriving inside the settle of the current
 * view: refused and recorded (a descriptive record, never a response).
 */
function refuseSettling(
  s: M18Series,
  control: string,
  mode: M18InputMode,
  nowMs: number,
  sink: M18LogSink,
) {
  sink('press_refused', {
    ...fields(s, currentScope(s)),
    target: 'view',
    reason: 'settling',
    since_ms: nowMs - (s.view_shown_at_ms ?? nowMs),
    view: s.view,
    control,
    input_mode: mode,
  });
}

function presentCase(s: M18Series, nowMs: number, sink: M18LogSink) {
  const entry = m18CurrentCase(s);
  const state = m18CurrentCaseState(s);

  state.presented = true;
  showView(s, 'case', nowMs);
  sink('case_presented', {
    ...fields(s, 'case', 'measurement'),
    assigned_position: entry.index,
    realised_position: s.cases.filter((candidate) => candidate.presented)
      .length,
    test_ids: entry.tests.map((item) => item.id),
    part_option_ids: entry.parts.map((option) => option.id),
    input_mode: 'system',
  });
}

function cancelPending(
  s: M18Series,
  reason: 'keep_working' | 'panel_left',
  mode: M18InputMode,
  sink: M18LogSink,
) {
  const pending = s.pending_commit;

  if (pending === null) {
    return;
  }

  s.pending_commit = null;
  sink('commit_cancelled', {
    ...fields(s, 'case', 'measurement'),
    slot: pending.slot,
    kind: pending.kind,
    option_id: pending.option_id,
    reason,
    refused_presses: pending.refused_presses,
    input_mode: mode,
  });
}

/** Records a results page's first display (once per page). */
function showResults(s: M18Series, mode: M18InputMode, sink: M18LogSink) {
  const page = s.results_page;

  if (s.results_shown[page]) {
    return;
  }

  s.results_shown[page] = true;
  sink('results_shown', {
    phase: 'feedback',
    form_id: M18_FORM_ID,
    content_version: M18_CONTENT_VERSION,
    page,
    case_id: m18ResultsCase(page).id,
    input_mode: mode,
  });
}

/* ------------------------------------------------------------------ *
 * Opening, leaving, the first-opening card
 * ------------------------------------------------------------------ */

export type M18OpenOutcome = 'opened' | 'reopened' | 'record';

/**
 * The board surface opened. The FIRST opening shows the first-opening card
 * (the adapter has already written the kit's `opportunity_opened`); a later
 * opening resumes the view as it stood (and settles it again) — after
 * completion results page 1 is shown read-only; a closed board shows its
 * record.
 */
export function m18sOpen(
  s: M18Series,
  nowMs: number,
  sink: M18LogSink,
): M18OpenOutcome {
  s.open_count += 1;
  s.panel_open = true;
  s.last_tick_ms = nowMs;
  s.view_shown_at_ms = nowMs;

  if (s.status === 'unopened') {
    s.status = 'intro';
    s.view = 'intro';

    return 'opened';
  }

  if (!m18Live(s)) {
    s.view = 'record';

    return 'record';
  }

  if (s.status === 'completed') {
    s.view = 'results';
    s.results_page = 1;
    s.acknowledgement = null;
  }

  // A reopened acknowledgement settles again: its control accepts a press
  // only 400 ms after it reappeared (a carried press never continues).
  if (s.acknowledgement !== null) {
    s.acknowledgement.opened_at_ms = nowMs;
  }

  sink('series_reopened', {
    ...fields(s, currentScope(s)),
    view: s.view,
    input_mode: 'system',
  });

  if (s.status === 'completed') {
    showResults(s, 'system', sink);
  }

  return 'reopened';
}

/** The board surface closed (ESC, LEAVE BOARD, FINISH, the room). */
export function m18sLeave(s: M18Series, nowMs: number, sink: M18LogSink) {
  if (!s.panel_open) {
    return;
  }

  tick(s, nowMs);

  if (s.pending_commit !== null) {
    cancelPending(s, 'panel_left', 'system', sink);
  }

  s.help_open = false;
  s.panel_open = false;

  if (m18Live(s)) {
    sink('panel_left', {
      ...fields(s, currentScope(s)),
      view: s.view,
      input_mode: 'system',
    });
  }
}

/** START CASE 1: the card acknowledged; case 1 presented. */
export function m18sStartCase1(
  s: M18Series,
  mode: M18InputMode,
  nowMs: number,
  sink: M18LogSink,
): boolean {
  if (s.status !== 'intro' || s.help_open) {
    return false;
  }

  if (m18Settling(s, nowMs)) {
    refuseSettling(s, 'start_case_1', mode, nowMs, sink);

    return false;
  }

  tick(s, nowMs);
  s.intro_acknowledged = true;
  sink('intro_acknowledged', { ...fields(s, 'series'), input_mode: mode });
  s.status = 'measurement';
  s.case = 0;
  presentCase(s, nowMs, sink);
  s.last_tick_ms = nowMs;

  return true;
}

/* ------------------------------------------------------------------ *
 * Tests (never a response)
 * ------------------------------------------------------------------ */

export type M18TestOutcome = 'run' | 'refused' | 'none';

/**
 * A test of the current case (button, A / B / C, ENTER / SPACE on focus):
 * writes its result line into the test record and logs `test_run`. A
 * repeat shows the same line (logged with its run index); a second
 * activation of the SAME test within 400 ms of the previous one is refused
 * and logged. Once the part is recorded the tests are closed: a test
 * command does nothing and writes nothing.
 */
export function m18sRunTest(
  s: M18Series,
  testId: string,
  mode: M18InputMode,
  nowMs: number,
  sink: M18LogSink,
): M18TestOutcome {
  if (
    s.status !== 'measurement' ||
    s.view !== 'case' ||
    s.pending_commit !== null ||
    s.help_open
  ) {
    return 'none';
  }

  const state = m18CurrentCaseState(s);
  const item = state.tests.find((candidate) => candidate.id === testId);

  if (item === undefined || state.diagnosis.first_response !== null) {
    return 'none';
  }

  if (m18Settling(s, nowMs)) {
    refuseSettling(s, 'test', mode, nowMs, sink);

    return 'refused';
  }

  if (
    item.last_run_at_ms !== null &&
    nowMs - item.last_run_at_ms < M18_SETTLE_MS
  ) {
    sink('press_refused', {
      ...fields(s, 'case', 'measurement'),
      target: 'test',
      reason: 'repeat_within_settle',
      since_ms: nowMs - item.last_run_at_ms,
      test_id: item.id,
      input_mode: mode,
    });

    return 'refused';
  }

  tick(s, nowMs);
  item.runs += 1;
  item.last_run_at_ms = nowMs;
  item.result_id = m18ResultFor(state.id, item.id);
  sink('test_run', {
    ...fields(s, 'case', 'measurement'),
    test_id: item.id,
    result_id: item.result_id,
    run_index: item.runs,
    case_test_runs: m18TestRuns(state),
    repeat: item.runs > 1,
    input_mode: mode,
  });

  return 'run';
}

/* ------------------------------------------------------------------ *
 * Drafts (never a response)
 * ------------------------------------------------------------------ */

/** Makes an option the draft of the current slot, replaces it, or clears it. */
export function m18sDraft(
  s: M18Series,
  optionId: string,
  mode: M18InputMode,
  nowMs: number,
  sink: M18LogSink,
): boolean {
  const slot = m18CurrentSlot(s);

  if (
    s.status !== 'measurement' ||
    slot === null ||
    s.pending_commit !== null ||
    s.help_open
  ) {
    return false;
  }

  const entry = m18CurrentCase(s);
  const state = m18CurrentCaseState(s)[slot];
  const options = slot === 'diagnosis' ? entry.parts : entry.steps;

  if (
    state.first_response !== null ||
    !options.some((option) => option.id === optionId)
  ) {
    return false;
  }

  if (m18Settling(s, nowMs)) {
    refuseSettling(s, 'draft', mode, nowMs, sink);

    return false;
  }

  tick(s, nowMs);

  const previous = state.draft;

  state.draft = previous === optionId ? null : optionId;
  state.drafts += 1;
  sink('option_drafted', {
    ...fields(s, 'case', 'measurement'),
    slot,
    option_id: state.draft,
    previous_option_id: previous,
    input_mode: mode,
  });

  return true;
}

/* ------------------------------------------------------------------ *
 * Commitment
 * ------------------------------------------------------------------ */

export type M18RequestOutcome = 'opened' | 'no_draft' | 'none';

/** RECORD PART / RECORD ANSWER (the opener) or CANNOT SOLVE pressed: opens the confirmation. */
export function m18sRequestCommit(
  s: M18Series,
  kind: M18CommitKind,
  mode: M18InputMode,
  nowMs: number,
  sink: M18LogSink,
): M18RequestOutcome {
  const slot = m18CurrentSlot(s);

  if (
    s.status !== 'measurement' ||
    slot === null ||
    s.pending_commit !== null ||
    s.help_open
  ) {
    return 'none';
  }

  const state = m18CurrentCaseState(s)[slot];

  if (state.first_response !== null) {
    return 'none';
  }

  if (m18Settling(s, nowMs)) {
    refuseSettling(
      s,
      kind === 'option' ? `record_${slot}` : 'cannot_solve',
      mode,
      nowMs,
      sink,
    );

    return 'none';
  }

  tick(s, nowMs);

  if (kind === 'option' && state.draft === null) {
    sink('commit_without_draft', {
      ...fields(s, 'case', 'measurement'),
      slot,
      input_mode: mode,
    });

    return 'no_draft';
  }

  s.pending_commit = {
    slot,
    kind,
    option_id: kind === 'option' ? state.draft : null,
    opened_at_ms: nowMs,
    refused_presses: 0,
    refusal_recorded: false,
  };
  sink('commit_requested', {
    ...fields(s, 'case', 'measurement'),
    slot,
    kind,
    option_id: s.pending_commit.option_id,
    input_mode: mode,
  });

  return 'opened';
}

/**
 * KEEP WORKING / ESC: the view stays open without a record. The dialog
 * settles like every view: a cancelling press inside 400 ms of its opening
 * (the second click of a double click on the opener) is ignored and not
 * recorded; the dialog stays open.
 */
export function m18sCancelCommit(
  s: M18Series,
  mode: M18InputMode,
  nowMs: number,
  sink: M18LogSink,
): boolean {
  const pending = s.pending_commit;

  if (pending === null) {
    return false;
  }

  if (nowMs - pending.opened_at_ms < M18_SETTLE_MS) {
    return false;
  }

  tick(s, nowMs);
  cancelPending(s, 'keep_working', mode, sink);
  // The view the dialog returns to settles again.
  s.view_shown_at_ms = nowMs;

  return true;
}

export type M18ConfirmOutcome = 'recorded' | 'refused' | 'none';

/**
 * The confirming press in a dialog. Only a fresh press acts: a press inside
 * the settle window is refused and recorded once per dialog (the count
 * carried on the record). Each first response is written once; a repeated
 * confirmation finds no dialog and writes nothing. A recorded part closes
 * the tests and presents the planned step; a recorded answer brings the
 * acknowledgement (and, for the sixth response, the completion).
 */
export function m18sConfirmCommit(
  s: M18Series,
  mode: M18InputMode,
  nowMs: number,
  sink: M18LogSink,
  extra: { focused_ms?: number | null } = {},
): M18ConfirmOutcome {
  const pending = s.pending_commit;

  if (pending === null) {
    return 'none';
  }

  if (s.status !== 'measurement' || m18CurrentSlot(s) !== pending.slot) {
    s.pending_commit = null;

    return 'none';
  }

  const sinceOpened = nowMs - pending.opened_at_ms;

  if (sinceOpened < M18_SETTLE_MS) {
    pending.refused_presses += 1;

    if (!pending.refusal_recorded) {
      pending.refusal_recorded = true;
      sink('commit_press_refused', {
        ...fields(s, 'case', 'measurement'),
        slot: pending.slot,
        kind: pending.kind,
        reason: 'dialog_settling',
        since_opened_ms: sinceOpened,
        settle_ms: M18_SETTLE_MS,
        input_mode: mode,
      });
    }

    return 'refused';
  }

  const entry = m18CurrentCase(s);
  const caseState = m18CurrentCaseState(s);
  const state = caseState[pending.slot];

  if (state.first_response !== null) {
    s.pending_commit = null;

    return 'none';
  }

  tick(s, nowMs);

  const keyOptionId =
    pending.slot === 'diagnosis'
      ? entry.key_part_option_id
      : entry.key_step_option_id;
  const response: M18FirstResponse = {
    slot: pending.slot,
    response_kind: pending.kind === 'option' ? 'option' : 'cannot_solve',
    option_id: pending.kind === 'option' ? pending.option_id : null,
    // CANNOT SOLVE is an incorrect first response whatever the draft; the
    // step's key is the outcome in the ACTUAL case (decision D-U20-1 item 1).
    correct: pending.kind === 'option' && pending.option_id === keyOptionId,
    key_option_id: keyOptionId,
    tests_run_before: m18TestsRun(caseState),
    test_runs_before: m18TestRuns(caseState),
    drafts_before: state.drafts,
    help_consults_before: state.help_consults,
    active_ms: state.active_ms,
    focused_ms:
      typeof extra.focused_ms === 'number'
        ? Math.round(extra.focused_ms)
        : null,
    refused_presses: pending.refused_presses,
    input_mode: mode,
  };

  state.first_response = response;
  s.pending_commit = null;
  sink('first_response', {
    ...fields(s, 'case', 'measurement'),
    ...response,
    draft_at_commit: state.draft,
  });

  if (pending.slot === 'diagnosis') {
    // The tests close at the part (decision D-U20-1 item 3); the planned
    // step is presented only now (item 4).
    sink('tests_closed', {
      ...fields(s, 'case', 'measurement'),
      tests_run: m18TestsRun(caseState),
      test_runs: m18TestRuns(caseState),
      input_mode: 'system',
    });
    caseState.step_presented = true;
    showView(s, 'step', nowMs);
    sink('step_presented', {
      ...fields(s, 'case', 'measurement'),
      step_option_ids: entry.steps.map((option) => option.id),
      input_mode: 'system',
    });
    s.last_tick_ms = nowMs;

    return 'recorded';
  }

  const recorded = m18StepsRecorded(s);
  const complete = recorded === M18_CASES_PLANNED;
  const nextControl: M18NextControl = complete ? 'show_results' : 'next_case';

  showView(s, 'acknowledgement', nowMs);
  s.acknowledgement = { opened_at_ms: nowMs, next_control: nextControl };
  sink('response_acknowledged', {
    ...fields(s, 'case', 'measurement'),
    line_id: M18_ACK_LINE_ID,
    next_control: nextControl,
    cases_recorded: recorded,
    input_mode: 'system',
  });

  if (complete) {
    s.status = 'completed';
    s.closure_reason = 'completed';
    // The scored phase closes here; the adapter completes the kit window
    // right after this event, so `window_closed` follows it.
    sink('first_responses_completed', {
      ...fields(s, 'series', 'measurement'),
      closure_reason: 'completed',
      ...m18ClosureSnapshot(s),
      input_mode: 'system',
    });
  }

  return 'recorded';
}

export type M18NextOutcome =
  | 'case_presented'
  | 'results_shown'
  | 'refused'
  | 'none';

/** NEXT CASE / SHOW RESULTS after an acknowledgement. */
export function m18sNext(
  s: M18Series,
  mode: M18InputMode,
  nowMs: number,
  sink: M18LogSink,
): M18NextOutcome {
  const ack = s.acknowledgement;

  if (ack === null || s.view !== 'acknowledgement' || s.help_open) {
    return 'none';
  }

  // The control accepts a press only after the view settled.
  if (nowMs - ack.opened_at_ms < M18_SETTLE_MS || m18Settling(s, nowMs)) {
    refuseSettling(s, 'next', mode, nowMs, sink);

    return 'refused';
  }

  tick(s, nowMs);
  s.acknowledgement = null;

  if (s.status === 'completed') {
    s.results_page = 1;
    showView(s, 'results', nowMs);
    showResults(s, mode, sink);

    return 'results_shown';
  }

  if (s.status !== 'measurement') {
    return 'none';
  }

  s.case += 1;
  presentCase(s, nowMs, sink);
  s.last_tick_ms = nowMs;

  return 'case_presented';
}

/* ------------------------------------------------------------------ *
 * Results (only after the sixth first response)
 * ------------------------------------------------------------------ */

/** NEXT (pages 1–2) / BACK (pages 2–3) between the three results pages. */
export function m18sResultsNavigate(
  s: M18Series,
  direction: 'next' | 'back',
  mode: M18InputMode,
  nowMs: number,
  sink: M18LogSink,
): boolean {
  if (s.status !== 'completed' || s.view !== 'results' || s.help_open) {
    return false;
  }

  const target = s.results_page + (direction === 'next' ? 1 : -1);

  if (target < 1 || target > 3) {
    return false;
  }

  // A press inside 400 ms of the last change of view is a doubled press
  // and changes nothing.
  if (m18Settling(s, nowMs)) {
    refuseSettling(s, `results_${direction}`, mode, nowMs, sink);

    return false;
  }

  tick(s, nowMs);
  s.results_page = target as M18ResultsPage;
  s.view_shown_at_ms = nowMs;
  showResults(s, mode, sink);

  return true;
}

/**
 * FINISH on a results page: the surface may close only after the page
 * settled (a carried press from NEXT or BACK must not close the board).
 * Nothing else is recorded here; the close itself is the surface's leave
 * path.
 */
export function m18sFinish(
  s: M18Series,
  mode: M18InputMode,
  nowMs: number,
  sink: M18LogSink,
): boolean {
  if (s.status !== 'completed' || s.view !== 'results' || s.help_open) {
    return false;
  }

  if (m18Settling(s, nowMs)) {
    refuseSettling(s, 'finish', mode, nowMs, sink);

    return false;
  }

  return true;
}

/* ------------------------------------------------------------------ *
 * Help
 * ------------------------------------------------------------------ */

/** HELP: informational; never while a dialog is open. */
export function m18sHelp(
  s: M18Series,
  mode: M18InputMode,
  nowMs: number,
  sink: M18LogSink,
): boolean {
  if (!m18Live(s) || s.pending_commit !== null || s.help_open) {
    return false;
  }

  if (m18Settling(s, nowMs)) {
    refuseSettling(s, 'help', mode, nowMs, sink);

    return false;
  }

  tick(s, nowMs);
  s.help_open = true;

  const phase = m18Phase(s);

  s.help_consults[phase] += 1;

  const slot = m18CurrentSlot(s);

  if (s.status === 'measurement' && slot !== null) {
    m18CurrentCaseState(s)[slot].help_consults += 1;
  }

  sink('help_consulted', {
    ...fields(s, currentScope(s)),
    view: m18HelpView(s),
    input_mode: mode,
  });
  // The help sheet is a view of its own: it settles too.
  s.view_shown_at_ms = nowMs;

  return true;
}

/** CLOSE HELP (H or the button): the view the help returns to settles again. */
export function m18sCloseHelp(
  s: M18Series,
  mode: M18InputMode,
  nowMs: number,
  sink: M18LogSink,
): boolean {
  if (!s.help_open) {
    return false;
  }

  if (m18Settling(s, nowMs)) {
    refuseSettling(s, 'close_help', mode, nowMs, sink);

    return false;
  }

  s.help_open = false;
  s.view_shown_at_ms = nowMs;

  if (s.acknowledgement !== null) {
    s.acknowledgement.opened_at_ms = nowMs;
  }

  return true;
}

/* ------------------------------------------------------------------ *
 * Closures
 * ------------------------------------------------------------------ */

/**
 * The station-record closure at the Utility Deck review: a series opened
 * and not complete (the card, any case, any step) closes with the answers
 * as they stand. A completed series is not reclosed.
 */
export function m18sCloseAtReview(
  s: M18Series,
  nowMs: number,
  sink: M18LogSink,
): boolean {
  if (s.status !== 'intro' && s.status !== 'measurement') {
    return false;
  }

  tick(s, nowMs);
  s.pending_commit = null;
  s.help_open = false;
  s.acknowledgement = null;
  s.status = 'closed_at_review';
  s.closure_reason = 'closed_at_review';
  s.view = 'record';
  sink('series_closed_at_review', {
    phase: 'closure',
    form_id: M18_FORM_ID,
    content_version: M18_CONTENT_VERSION,
    closure_reason: 'closed_at_review',
    ...m18ClosureSnapshot(s),
    input_mode: 'system',
  });

  return true;
}

export type M18FailOutcome = 'scored_phase' | 'feedback' | 'none';

/**
 * A fault. While the series is open (the card or the cases) it closes the
 * series (the adapter records the kit's technical failure); after
 * completion it is recorded without touching the scored evidence.
 */
export function m18sFail(s: M18Series, detail: string): M18FailOutcome {
  if (s.status === 'intro' || s.status === 'measurement') {
    s.status = 'technical_failure';
    s.closure_reason = 'technical_failure';
    s.failure_detail = detail;
    s.pending_commit = null;
    s.help_open = false;
    s.acknowledgement = null;
    s.view = 'record';

    return 'scored_phase';
  }

  if (s.status === 'completed') {
    s.failure_detail = detail;
    s.view = 'record';

    return 'feedback';
  }

  return 'none';
}

/** The reload hold-back: the board is never re-run in this page load. */
export function m18sHoldBack(s: M18Series) {
  if (s.status !== 'unopened') {
    return false;
  }

  s.status = 'held_back';
  s.failure_detail = M18_RELOAD_DETAIL;
  s.view = 'record';

  return true;
}

/**
 * The review closure of a board never opened. The kit records the absence
 * (`briefed_not_opened` / `not_briefed_not_opened`, the adapter); the
 * series itself becomes the review's closed record, so a later opening shows
 * that record (`Parts recorded: 0 of 3 · planned steps recorded: 0 of 3.`),
 * accepts no answer and writes no event of the family (contract §3.11).
 * Nothing is logged here: no opening ever happened.
 */
export function m18sCloseUnopenedAtReview(s: M18Series) {
  if (s.status !== 'unopened') {
    return false;
  }

  s.status = 'closed_at_review';
  s.closure_reason = 'closed_at_review';
  s.view = 'record';

  return true;
}
