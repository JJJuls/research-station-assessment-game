/**
 * M19 — the series model of the two coupling lines (Station 080 M01–M26
 * run, Unit 21; administration `m19-lines-v2`). PURE (no Phaser, no runtime
 * import): the window adapter (`m19CouplingPanel.ts`) owns the register
 * window, injects the log sink and registers the per-line focused clocks
 * with the focus monitor; the surface model (`m19SurfaceModel.ts`) only
 * renders this state and calls the adapter with its input mode.
 *
 * Under research-owner decision D-U21-1 (13 October 2026): the first-opening
 * card; one panel check (one question, one explanation, one recheck; every
 * outcome kept apart); then two distinct, solvable, deterministic lines in
 * fixed order — line 2 only after line 1 is finished — each with unlimited
 * distinct TRYs, an always-available SET ASIDE, a truthful gauge and a
 * designed obstacle (Option B): the first executed TRY after which the
 * line's executed settings include all of its listed evidence settings is
 * followed, in the same handler, by ONE immutable `difficulty_boundary`;
 * nothing marks it on screen. A further executed TRY of a new setting after
 * the boundary and before the line is finished is the continuation (credited
 * once per line, after leaving and returning included); setting changes
 * without TRY, refused TRYs, help, leaving, reopening, a cancelled SET ASIDE,
 * elapsed time and the restoring itself never qualify. Nothing is rigged: a
 * TRY of the key always restores the line.
 *
 * Only a FRESH press confirms SET ASIDE (M02 §5.210 / M13 §5.262 / M14 /
 * M15 / M16 / M18 precedent) and EVERY view transition settles: a TRY inside
 * 400 ms of a view appearing is refused and recorded (`try_refused`,
 * `settling`); any other press inside it is dropped. A held key never
 * reaches this model (the surface drops repeats).
 *
 * Nothing here scores: the attempts and the boundary are raw events, and
 * `m19_continuations` is recounted read-only by `features/m19.ts`. The keys
 * and the obstacle rules are the content module's approved data.
 */
import { FocusedClock } from '../../measurement/focusedClock';
import {
  reloadHoldBackClass,
  reloadHoldBackDetail,
} from '../../measurement/reloadCheck';
import {
  isM19LineId,
  M19_CHECKS,
  M19_CONTENT_VERSION,
  M19_DIAL_MAX,
  M19_DIAL_MIN,
  M19_FAMILY,
  M19_FORM_ID,
  M19_LINE_ORDER,
  M19_LINES,
  M19_LINES_PLANNED,
  M19_LOG_ROWS,
  M19_LOG_TAIL,
  M19_SETTLE_MS,
  M19_TEXT,
  type M19Check,
  type M19CheckId,
  type M19Control,
  m19EvidenceAttemptIndices,
  type M19Line,
  type M19Line1Setting,
  type M19Line2Setting,
  type M19LineId,
  m19ObstacleEstablished,
  type M19Reading,
  m19Reading,
  type M19Setting,
  m19SettingKey,
} from './m19LinesContent';

export type M19InputMode = 'pointer' | 'keyboard' | 'system';
export type M19Phase = 'intro' | 'check' | 'measurement' | 'closure';
/** The sink returns the logger sequence of the event it wrote (null when unknown). */
export type M19LogSink = (
  suffix: string,
  metadata: Record<string, unknown>,
) => number | null | undefined | void;

export type M19Status =
  | 'unopened'
  | 'intro'
  | 'check'
  | 'lines'
  | 'completed'
  | 'closed'
  | 'held_back'
  | 'technical_failure';

export type M19View =
  | 'intro'
  | 'check'
  | 'explanation'
  | 'recorded'
  | 'line'
  | 'finished'
  | 'record';

export type M19Finish =
  | 'restored'
  | 'set_aside'
  | 'shift_ended'
  | 'closed_at_review'
  | 'technical_failure';

export type M19CheckStatus = 'pass_first' | 'pass_after_explanation' | 'fail';
export type M19CheckStage = 'q1' | 'explanation' | 'q2' | 'recorded';
export type M19ClosureReason =
  | 'completed'
  | 'shift_ended'
  | 'closed_at_review'
  | 'technical_failure';

/** Every suffix the family may log (contract §9.2; names fixed). */
export const M19_EVENT_SUFFIXES = [
  'presented',
  'opportunity_opened',
  'intro_acknowledged',
  'series_reopened',
  'panel_left',
  'prior_load_checked',
  'closed_unopened',
  'check_presented',
  'option_drafted',
  'check_answered',
  'explanation_shown',
  'check_recorded',
  'line_presented',
  'setting_changed',
  'try_refused',
  'attempt',
  'difficulty_boundary',
  'set_aside_requested',
  'set_aside_cancelled',
  'help_consulted',
  'line_finished',
  'series_completed',
  'series_closed',
  'technical_failure',
  'window_closed',
] as const;

export const M19_RELOAD_DETAIL =
  'reload after administration: panel not re-run';
/**
 * The U / M hold-back details (U24 RL-4; `RELOAD-CORRECTION-SPEC-r3-exec.md`
 * §2, direction c): a load whose earlier history is not verified (U) or
 * whose check contradicts itself (M) never administers the panel; no prior
 * exposure is claimed. The class prefix is RL-0's.
 */
export const M19_UNVERIFIED_DETAIL = reloadHoldBackDetail(
  'U',
  'panel not administered',
);
export const M19_CONTRADICTORY_DETAIL = reloadHoldBackDetail(
  'M',
  'panel not administered',
);

/* ------------------------------------------------------------------ *
 * State
 * ------------------------------------------------------------------ */

export interface M19Attempt {
  index: number;
  setting: M19Setting;
  reading: M19Reading;
  restored: boolean;
  after_boundary: boolean;
  /** The logger sequence of the attempt event (from the sink). */
  sequence: number | null;
  /** Focused ms of the line at this attempt. */
  focused_ms: number;
}

export interface M19Boundary {
  attempt_index: number;
  attempt_sequence: number | null;
  evidence_attempt_indices: number[];
  focused_ms: number;
}

export interface M19RefusedCounts {
  already_tried: number;
  settling: number;
}

export interface M19LineState {
  id: M19LineId;
  index: number;
  presented: boolean;
  /** The draft setting (survives leaving; frozen once finished). */
  setting: M19Setting;
  attempts: M19Attempt[];
  boundary: M19Boundary | null;
  finish: M19Finish | null;
  restored_at_attempt: number | null;
  help_consults: number;
  panel_leaves_after_boundary: number;
  /** The panel was left after the boundary and before the continuation. */
  left_since_boundary: boolean;
  continued_after_leaving: boolean | null;
  refused: M19RefusedCounts;
  refused_after_boundary: M19RefusedCounts;
  /** Focused ms at the first attempt after the boundary. */
  next_try_focused_ms: number | null;
  line_focused_ms: number | null;
  clock: FocusedClock;
}

export interface M19CheckAnswer {
  check_id: M19CheckId;
  attempt: 1 | 2;
  option_id: string;
  correct: boolean;
}

export interface M19CheckState {
  stage: M19CheckStage;
  draft: string | null;
  answers: M19CheckAnswer[];
  status: M19CheckStatus | null;
  /** The question presented at least once (q1, q2). */
  presented: [boolean, boolean];
  explanation_shown: boolean;
}

export interface M19PendingSetAside {
  line: number;
  opened_at_ms: number;
}

/** Hooks the adapter uses to subscribe each line's clock to the focus monitor. */
export interface M19ClockHooks {
  register?: (clock: FocusedClock) => void;
  release?: (clock: FocusedClock) => void;
}

export interface M19Series {
  status: M19Status;
  view: M19View;
  open_count: number;
  panel_open: boolean;
  intro_acknowledged: boolean;
  check: M19CheckState;
  /** Index of the current line (0 or 1). */
  line: number;
  lines: [M19LineState, M19LineState];
  pending_set_aside: M19PendingSetAside | null;
  help_open: boolean;
  closure_reason: M19ClosureReason | null;
  failure_detail: string | null;
  /**
   * When the current view appeared (the settle of EVERY transition): a press
   * inside `M19_SETTLE_MS` of it changes nothing.
   */
  view_shown_at_ms: number | null;
  hooks: M19ClockHooks;
}

function lineState(line: M19Line): M19LineState {
  return {
    id: line.id,
    index: line.index,
    presented: false,
    setting: { ...(line.start as M19Setting) },
    attempts: [],
    boundary: null,
    finish: null,
    restored_at_attempt: null,
    help_consults: 0,
    panel_leaves_after_boundary: 0,
    left_since_boundary: false,
    continued_after_leaving: null,
    refused: { already_tried: 0, settling: 0 },
    refused_after_boundary: { already_tried: 0, settling: 0 },
    next_try_focused_ms: null,
    line_focused_ms: null,
    clock: new FocusedClock(),
  };
}

export function createM19Series(hooks: M19ClockHooks = {}): M19Series {
  return {
    status: 'unopened',
    view: 'intro',
    open_count: 0,
    panel_open: false,
    intro_acknowledged: false,
    check: {
      stage: 'q1',
      draft: null,
      answers: [],
      status: null,
      presented: [false, false],
      explanation_shown: false,
    },
    line: 0,
    lines: [
      lineState(M19_LINES[0] as M19Line),
      lineState(M19_LINES[1] as M19Line),
    ],
    pending_set_aside: null,
    help_open: false,
    closure_reason: null,
    failure_detail: null,
    view_shown_at_ms: null,
    hooks,
  };
}

/* ------------------------------------------------------------------ *
 * Reload guard and entry snapshot
 * ------------------------------------------------------------------ */

/** True when an earlier page load of this identity already opened the panel. */
/** The structural part of an earlier load's record the check reads. */
export interface M19PriorEvent {
  event_type: string;
  metadata?: Record<string, unknown>;
}

export function m19PriorAdministration(
  priorLoadEvents: readonly M19PriorEvent[],
): boolean {
  return priorLoadEvents.some(
    (event) => event.event_type === `${M19_FAMILY}opportunity_opened`,
  );
}

/**
 * D-7 (i) (U24 RL-4): an earlier load's U or M hold-back of this family
 * keeps the absence of an earlier opening unestablished in every later
 * load; an H marker never triggers this.
 */
export function m19PriorHoldBackCarried(
  priorLoadEvents: readonly M19PriorEvent[],
): boolean {
  return priorLoadEvents.some((event) => {
    if (event.event_type !== `${M19_FAMILY}technical_failure`) {
      return false;
    }

    const cls = reloadHoldBackClass(event.metadata?.detail);

    return cls === 'U' || cls === 'M';
  });
}

export interface M19HistoryIntegrity {
  first_sequence: number | null;
  sequence_gap_count: number;
  sequence_duplicate_count: number;
  recovered_from_chunks: boolean;
}

export interface M19PriorLoadCheck {
  page_load_index: number;
  prior_page_load_event_count: number;
  prior_opening_found: boolean;
  prior_briefing_found: boolean;
  history_continuous: boolean;
  prior_opening_absence_established: boolean;
}

/**
 * The reload check of a later page load (the M14 closeout ruling §5.290
 * (a) and the M18 precedent applied to M19): the absence of an earlier
 * opening is ESTABLISHED only when the recovered history is continuous and
 * holds no `opportunity_opened` of this family; a found opening is the
 * hold-back; an earlier briefing is reported, never read as an opening.
 */
export function m19PriorLoadCheck(
  pageLoadIndex: number,
  priorLoadEvents: readonly M19PriorEvent[],
  integrity: M19HistoryIntegrity,
): M19PriorLoadCheck {
  const found = m19PriorAdministration(priorLoadEvents);
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
      (event) => event.event_type === `${M19_FAMILY}presented`,
    ),
    history_continuous: continuous,
    // D-7 (i): an earlier U / M hold-back of this family is carried forward.
    prior_opening_absence_established:
      !found && continuous && !m19PriorHoldBackCarried(priorLoadEvents),
  };
}

/** The entry-state snapshot written with `opportunity_opened` (contract §9.3). */
export function m19EntrySnapshot(stage: string | null) {
  return {
    lines_planned: M19_LINES_PLANNED,
    line_order: [...M19_LINE_ORDER],
    form_id: M19_FORM_ID,
    content_version: M19_CONTENT_VERSION,
    boundary_rule: 'designed_obstacle',
    continuation_rule: 'further_new_executed_try',
    stop_control: 'set_aside',
    time_limit: null,
    check: 'one_question_one_explanation_one_recheck',
    settle_ms: M19_SETTLE_MS,
    stage,
  };
}

/* ------------------------------------------------------------------ *
 * Selectors
 * ------------------------------------------------------------------ */

/** The series can still be worked (card, check or lines). */
export function m19Live(s: M19Series): boolean {
  return s.status === 'intro' || s.status === 'check' || s.status === 'lines';
}

export function m19Phase(s: M19Series): M19Phase {
  switch (s.status) {
    case 'intro':
      return 'intro';
    case 'check':
      return 'check';
    case 'lines':
      return 'measurement';
    default:
      return 'closure';
  }
}

export function m19CurrentLine(s: M19Series): M19Line {
  return M19_LINES[s.line] as M19Line;
}

export function m19CurrentLineState(s: M19Series): M19LineState {
  return s.lines[s.line];
}

/** The line presented and not yet finished (null outside the lines). */
export function m19LineInWork(s: M19Series): M19LineState | null {
  if (s.status !== 'lines') {
    return null;
  }

  const state = s.lines[s.line];

  return state.presented && state.finish === null ? state : null;
}

export function m19Settling(s: M19Series, nowMs: number): boolean {
  return (
    s.view_shown_at_ms !== null && nowMs - s.view_shown_at_ms < M19_SETTLE_MS
  );
}

export function m19LinesFinished(s: M19Series): number {
  return s.lines.filter((line) => line.finish !== null).length;
}

/** The continuation of a line as the model recorded it (null without a boundary). */
export function m19Continued(line: M19LineState): boolean | null {
  return line.boundary === null
    ? null
    : line.attempts.length > line.boundary.attempt_index;
}

export function m19CheckOf(stage: 'q1' | 'q2'): M19Check {
  return stage === 'q1' ? M19_CHECKS[0] : M19_CHECKS[1];
}

/** The record line of a closed panel (null while it can be worked or is completed). */
export function m19RecordLine(s: M19Series): string | null {
  switch (s.status) {
    case 'closed':
      return s.closure_reason === 'closed_at_review'
        ? M19_TEXT.closed_review
        : M19_TEXT.closed_shift;
    case 'held_back': {
      // U24 RL-4 (r3 §9): a U / M hold shows the two approved lines; the
      // existing H text is unchanged.
      const cls = reloadHoldBackClass(s.failure_detail);

      return cls === 'U' || cls === 'M'
        ? M19_TEXT.held_unverified.join('\n')
        : M19_TEXT.held_back;
    }
    case 'technical_failure':
      // The two-line fault record (register §5.340 (b); added at the U21
      // closeout of 14 October 2026).
      return M19_TEXT.closed_fault.join('\n');
    case 'completed':
      return s.view === 'record' ? M19_TEXT.final_record : null;
    default:
      return null;
  }
}

/** The view name a help consult is recorded with. */
export function m19HelpView(s: M19Series): string {
  switch (s.status) {
    case 'intro':
      return 'intro';
    case 'check':
      return s.view === 'explanation'
        ? 'explanation'
        : s.view === 'recorded'
          ? 'recorded'
          : s.check.stage === 'q2'
            ? 'check_2'
            : 'check_1';
    case 'lines':
      return `${s.view === 'finished' ? 'finished' : 'line'}_${s.line + 1}`;
    case 'completed':
      return s.view === 'finished' ? 'finished_2' : 'record';
    default:
      return 'record';
  }
}

/** The TRY list rows of a line as the surface shows them (the nine-row rule). */
export function m19LogRows(line: M19LineState): string[] {
  const def = M19_LINES[line.index - 1] as M19Line;
  const rows = line.attempts.map((attempt) =>
    (def.row as (n: number, s: M19Setting, r: M19Reading) => string)(
      attempt.index,
      attempt.setting,
      attempt.reading,
    ),
  );

  if (rows.length === 0) {
    return [M19_TEXT.log_header, M19_TEXT.log_none];
  }

  if (rows.length <= M19_LOG_ROWS) {
    return [M19_TEXT.log_header, ...rows];
  }

  return [
    M19_TEXT.log_header,
    M19_TEXT.log_earlier(rows.length - M19_LOG_TAIL),
    ...rows.slice(-M19_LOG_TAIL),
  ];
}

function lineRecord(line: M19LineState) {
  return {
    line_id: line.id,
    line_index: line.index,
    presented: line.presented,
    attempts: line.attempts.length,
    boundary_attempt_index: line.boundary?.attempt_index ?? null,
    continued: m19Continued(line),
    finish: line.finish,
  };
}

/** The per-line record written on every series closure (contract §9.2). */
export function m19ClosureSnapshot(s: M19Series) {
  return {
    lines_planned: M19_LINES_PLANNED,
    check_status: s.check.status,
    lines: s.lines.map(lineRecord),
  };
}

/* ------------------------------------------------------------------ *
 * Internals
 * ------------------------------------------------------------------ */

function fields(
  s: M19Series,
  line: M19LineState | null,
  phase: M19Phase = m19Phase(s),
): Record<string, unknown> {
  const base: Record<string, unknown> = {
    phase,
    form_id: M19_FORM_ID,
    content_version: M19_CONTENT_VERSION,
  };

  if (line !== null) {
    base.line_id = line.id;
    base.line_index = line.index;
  }

  return base;
}

function serialise(line: M19LineState, setting: M19Setting) {
  const def = M19_LINES[line.index - 1] as M19Line;

  return (def.serialise as (s: M19Setting) => Record<string, unknown>)(setting);
}

function showView(s: M19Series, view: M19View, nowMs: number) {
  s.view = view;
  s.view_shown_at_ms = nowMs;
}

function presentCheck(
  s: M19Series,
  stage: 'q1' | 'q2',
  nowMs: number,
  sink: M19LogSink,
) {
  const check = m19CheckOf(stage);

  s.check.stage = stage;
  s.check.draft = null;
  s.check.presented[stage === 'q1' ? 0 : 1] = true;
  showView(s, 'check', nowMs);
  sink('check_presented', {
    ...fields(s, null, 'check'),
    check_id: check.id,
    attempt: check.attempt,
    input_mode: 'system',
  });
}

function presentLine(
  s: M19Series,
  at: number,
  nowMs: number,
  sink: M19LogSink,
) {
  const line = s.lines[at];

  s.line = at;
  line.presented = true;
  showView(s, 'line', nowMs);
  line.clock.start(nowMs);
  s.hooks.register?.(line.clock);
  sink('line_presented', {
    ...fields(s, line, 'measurement'),
    assigned_position: line.index,
    realised_position: s.lines.filter((candidate) => candidate.presented)
      .length,
    starting_setting: serialise(line, line.setting),
    input_mode: 'system',
  });
}

/** Finishes a line: stops its clock and writes `line_finished` with the companions. */
function finishLine(
  s: M19Series,
  line: M19LineState,
  finish: M19Finish,
  nowMs: number,
  sink: M19LogSink,
) {
  if (line.finish !== null) {
    return;
  }

  line.clock.stop(nowMs);
  s.hooks.release?.(line.clock);
  line.finish = finish;
  line.line_focused_ms = Math.round(line.clock.focusedMs(nowMs));

  const boundary = line.boundary;

  sink('line_finished', {
    ...fields(s, line, 'measurement'),
    finish,
    attempts: line.attempts.length,
    boundary_attempt_index: boundary?.attempt_index ?? null,
    continued: m19Continued(line),
    restored_at_attempt: line.restored_at_attempt,
    line_focused_ms: line.line_focused_ms,
    boundary_to_next_try_focused_ms:
      boundary !== null && line.next_try_focused_ms !== null
        ? Math.round(line.next_try_focused_ms - boundary.focused_ms)
        : null,
    boundary_to_finish_focused_ms:
      boundary !== null
        ? Math.round(line.line_focused_ms - boundary.focused_ms)
        : null,
    help_consults: line.help_consults,
    panel_leaves_after_boundary: line.panel_leaves_after_boundary,
    continued_after_leaving: line.continued_after_leaving,
    refused_tries_after_boundary: { ...line.refused_after_boundary },
    input_mode: 'system',
  });
}

function cancelPending(
  s: M19Series,
  reason: 'back' | 'panel_left',
  mode: M19InputMode,
  sink: M19LogSink,
) {
  const pending = s.pending_set_aside;

  if (pending === null) {
    return;
  }

  s.pending_set_aside = null;
  sink('set_aside_cancelled', {
    ...fields(s, s.lines[pending.line], 'measurement'),
    reason,
    input_mode: mode,
  });
}

function closeSeries(
  s: M19Series,
  reason: 'shift_ended' | 'closed_at_review',
  nowMs: number,
  sink: M19LogSink,
): boolean {
  if (!m19Live(s)) {
    return false;
  }

  s.pending_set_aside = null;
  s.help_open = false;

  for (const line of s.lines) {
    if (line.presented && line.finish === null) {
      finishLine(s, line, reason, nowMs, sink);
    }
  }

  s.status = 'closed';
  s.closure_reason = reason;
  s.view = 'record';
  sink('series_closed', {
    ...fields(s, null, 'closure'),
    closure_reason: reason,
    ...m19ClosureSnapshot(s),
    input_mode: 'system',
  });

  return true;
}

/* ------------------------------------------------------------------ *
 * Opening, leaving, the card
 * ------------------------------------------------------------------ */

export type M19OpenOutcome = 'opened' | 'reopened' | 'record';

/**
 * The panel surface opened. The FIRST opening shows the card (the adapter
 * has already written the kit's `opportunity_opened`); a later opening
 * resumes the view as it stood (and settles it again); a completed series
 * shows its final record; a closed panel shows its record.
 */
export function m19sOpen(
  s: M19Series,
  nowMs: number,
  sink: M19LogSink,
): M19OpenOutcome {
  s.open_count += 1;
  s.panel_open = true;
  s.view_shown_at_ms = nowMs;

  if (s.status === 'unopened') {
    s.status = 'intro';
    s.view = 'intro';

    return 'opened';
  }

  if (!m19Live(s) && s.status !== 'completed') {
    s.view = 'record';

    return 'record';
  }

  if (s.status === 'completed') {
    s.view = 'record';
  }

  const inWork = m19LineInWork(s);

  if (inWork !== null) {
    inWork.clock.resume('surface_closed', nowMs);
  }

  sink('series_reopened', {
    ...fields(s, inWork),
    view: s.view,
    input_mode: 'system',
  });

  return 'reopened';
}

/** The panel surface closed (ESC, LEAVE, FINISH, walking away). */
export function m19sLeave(s: M19Series, nowMs: number, sink: M19LogSink) {
  if (!s.panel_open) {
    return;
  }

  if (s.pending_set_aside !== null) {
    cancelPending(s, 'panel_left', 'system', sink);
  }

  s.help_open = false;
  s.panel_open = false;

  const inWork = m19LineInWork(s);

  if (inWork !== null) {
    inWork.clock.pause('surface_closed', nowMs);

    if (inWork.boundary !== null) {
      inWork.panel_leaves_after_boundary += 1;

      if (m19Continued(inWork) === false) {
        inWork.left_since_boundary = true;
      }
    }
  }

  if (m19Live(s) || s.status === 'completed') {
    sink('panel_left', {
      ...fields(s, inWork),
      view: s.view,
      input_mode: 'system',
    });
  }
}

/** CONTINUE on the card: the card acknowledged; question 1 presented. */
export function m19sContinue(
  s: M19Series,
  mode: M19InputMode,
  nowMs: number,
  sink: M19LogSink,
): boolean {
  if (s.status !== 'intro' || s.help_open || m19Settling(s, nowMs)) {
    return false;
  }

  s.intro_acknowledged = true;
  sink('intro_acknowledged', { ...fields(s, null), input_mode: mode });
  s.status = 'check';
  presentCheck(s, 'q1', nowMs, sink);

  return true;
}

/* ------------------------------------------------------------------ *
 * The panel check
 * ------------------------------------------------------------------ */

/** A check option tile: drafts it, replaces the draft, or clears it. */
export function m19sDraft(
  s: M19Series,
  optionId: string,
  mode: M19InputMode,
  nowMs: number,
  sink: M19LogSink,
): boolean {
  if (
    s.status !== 'check' ||
    s.view !== 'check' ||
    s.help_open ||
    m19Settling(s, nowMs)
  ) {
    return false;
  }

  const stage = s.check.stage;

  if (stage !== 'q1' && stage !== 'q2') {
    return false;
  }

  const check = m19CheckOf(stage);

  if (!check.options.some((option) => option.id === optionId)) {
    return false;
  }

  const previous = s.check.draft;

  s.check.draft = previous === optionId ? null : optionId;
  sink('option_drafted', {
    ...fields(s, null),
    check_id: check.id,
    option_id: s.check.draft,
    previous_option_id: previous,
    input_mode: mode,
  });

  return true;
}

export type M19RecordOutcome = 'recorded' | 'no_draft' | 'none';

/**
 * RECORD ANSWER: records the drafted option once (immutable). A right first
 * answer records the check `pass_first`; a wrong first answer shows the
 * explanation; a right recheck records `pass_after_explanation`, a wrong
 * one `fail`. The recorded line that follows is identical for every status.
 */
export function m19sRecordAnswer(
  s: M19Series,
  mode: M19InputMode,
  nowMs: number,
  sink: M19LogSink,
): M19RecordOutcome {
  if (
    s.status !== 'check' ||
    s.view !== 'check' ||
    s.help_open ||
    m19Settling(s, nowMs)
  ) {
    return 'none';
  }

  const stage = s.check.stage;

  if (stage !== 'q1' && stage !== 'q2') {
    return 'none';
  }

  if (s.check.draft === null) {
    return 'no_draft';
  }

  const check = m19CheckOf(stage);
  const optionId = s.check.draft;
  const correct = optionId === check.key_option_id;
  const answer: M19CheckAnswer = {
    check_id: check.id,
    attempt: check.attempt,
    option_id: optionId,
    correct,
  };

  s.check.answers.push(answer);
  s.check.draft = null;
  sink('check_answered', { ...fields(s, null), ...answer, input_mode: mode });

  if (correct) {
    s.check.status = stage === 'q1' ? 'pass_first' : 'pass_after_explanation';
  } else if (stage === 'q2') {
    s.check.status = 'fail';
  } else {
    s.check.stage = 'explanation';
    s.check.explanation_shown = true;
    showView(s, 'explanation', nowMs);
    sink('explanation_shown', { ...fields(s, null), input_mode: 'system' });

    return 'recorded';
  }

  s.check.stage = 'recorded';
  showView(s, 'recorded', nowMs);
  sink('check_recorded', {
    ...fields(s, null),
    status: s.check.status,
    input_mode: 'system',
  });

  return 'recorded';
}

/** CONTINUE on the explanation: question 2 presented. */
export function m19sContinueExplanation(
  s: M19Series,
  mode: M19InputMode,
  nowMs: number,
  sink: M19LogSink,
): boolean {
  if (
    s.status !== 'check' ||
    s.view !== 'explanation' ||
    s.help_open ||
    m19Settling(s, nowMs)
  ) {
    return false;
  }

  void mode;
  presentCheck(s, 'q2', nowMs, sink);

  return true;
}

/** START LINE 1 on the recorded line: line 1 presented (whatever the status). */
export function m19sStartLine1(
  s: M19Series,
  mode: M19InputMode,
  nowMs: number,
  sink: M19LogSink,
): boolean {
  if (
    s.status !== 'check' ||
    s.view !== 'recorded' ||
    s.check.status === null ||
    s.help_open ||
    m19Settling(s, nowMs)
  ) {
    return false;
  }

  void mode;
  s.status = 'lines';
  presentLine(s, 0, nowMs, sink);

  return true;
}

/* ------------------------------------------------------------------ *
 * A line: settings, TRY, the boundary
 * ------------------------------------------------------------------ */

export type M19ChangeOutcome = 'changed' | 'limit' | 'none';

/** A setting control: changes only the draft setting; never runs the line. */
export function m19sChange(
  s: M19Series,
  control: M19Control,
  mode: M19InputMode,
  nowMs: number,
  sink: M19LogSink,
): M19ChangeOutcome {
  const line = m19LineInWork(s);

  if (
    line === null ||
    s.view !== 'line' ||
    s.pending_set_aside !== null ||
    s.help_open ||
    m19Settling(s, nowMs)
  ) {
    return 'none';
  }

  const def = m19CurrentLine(s);

  if (!def.controls.includes(control)) {
    return 'none';
  }

  if (line.index === 1) {
    const setting = { ...(line.setting as M19Line1Setting) };

    if (control === 'feed') {
      setting.feed = setting.feed === 'SINGLE' ? 'DOUBLE' : 'SINGLE';
    } else if (control === 'h1' || control === 'h2' || control === 'h3') {
      setting[control] = !setting[control];
    }

    line.setting = setting;
  } else {
    const setting = { ...(line.setting as M19Line2Setting) };

    if (control === 'bypass') {
      setting.bypass = setting.bypass === 'SHUT' ? 'OPEN' : 'SHUT';
    } else if (control === 'dial_down') {
      if (setting.dial <= M19_DIAL_MIN) {
        return 'limit';
      }

      setting.dial -= 1;
    } else if (control === 'dial_up') {
      if (setting.dial >= M19_DIAL_MAX) {
        return 'limit';
      }

      setting.dial += 1;
    }

    line.setting = setting;
  }

  sink('setting_changed', {
    ...fields(s, line, 'measurement'),
    control,
    setting_after: serialise(line, line.setting),
    input_mode: mode,
  });

  return 'changed';
}

export type M19TryOutcome =
  | { kind: 'executed'; attempt: M19Attempt; restored: boolean }
  | { kind: 'already_tried'; attempt_index: number }
  | { kind: 'settling' }
  | { kind: 'none' };

/**
 * TRY: refused and not run (`try_refused`) when the setting equals any
 * earlier executed setting of this line or the press falls inside the
 * settle; otherwise EXECUTED — `attempt`, then, when the line's executed
 * settings now include every listed evidence setting and no boundary exists
 * yet, IMMEDIATELY `difficulty_boundary` (once per line); an attempt that
 * restores the line finishes it right after.
 */
export function m19sTry(
  s: M19Series,
  mode: M19InputMode,
  nowMs: number,
  sink: M19LogSink,
): M19TryOutcome {
  const line = m19LineInWork(s);

  if (
    line === null ||
    s.view !== 'line' ||
    s.pending_set_aside !== null ||
    s.help_open
  ) {
    return { kind: 'none' };
  }

  const def = m19CurrentLine(s);
  const afterBoundary = line.boundary !== null;
  const refuse = (
    reason: 'already_tried' | 'settling',
    extra: Record<string, unknown>,
  ) => {
    line.refused[reason] += 1;

    if (afterBoundary) {
      line.refused_after_boundary[reason] += 1;
    }

    sink('try_refused', {
      ...fields(s, line, 'measurement'),
      reason,
      setting: serialise(line, line.setting),
      after_boundary: afterBoundary,
      ...extra,
      input_mode: mode,
    });
  };

  if (m19Settling(s, nowMs)) {
    refuse('settling', {
      since_ms: nowMs - (s.view_shown_at_ms ?? nowMs),
      settle_ms: M19_SETTLE_MS,
    });

    return { kind: 'settling' };
  }

  const key = m19SettingKey(def, line.setting);
  const earlier = line.attempts.find(
    (attempt) => m19SettingKey(def, attempt.setting) === key,
  );

  if (earlier !== undefined) {
    refuse('already_tried', { tried_at_attempt: earlier.index });

    return { kind: 'already_tried', attempt_index: earlier.index };
  }

  const reading = m19Reading(def, line.setting);
  const restored = reading === 'OK';
  const focused = line.clock.focusedMs(nowMs);
  const attempt: M19Attempt = {
    index: line.attempts.length + 1,
    setting: { ...line.setting },
    reading,
    restored,
    after_boundary: afterBoundary,
    sequence: null,
    focused_ms: focused,
  };
  const written = sink('attempt', {
    ...fields(s, line, 'measurement'),
    attempt_index: attempt.index,
    setting: serialise(line, attempt.setting),
    reading,
    restored,
    after_boundary: afterBoundary,
    since_boundary_focused_ms:
      line.boundary === null
        ? null
        : Math.round(focused - line.boundary.focused_ms),
    input_mode: mode,
  });

  attempt.sequence = typeof written === 'number' ? written : null;
  line.attempts.push(attempt);

  if (afterBoundary && line.next_try_focused_ms === null) {
    // The continuation: credited once per line; after leaving and
    // returning it qualifies, flagged (decision D-U21-1 item 4).
    line.next_try_focused_ms = focused;
    line.continued_after_leaving = line.left_since_boundary;
  }

  if (restored) {
    line.restored_at_attempt = attempt.index;
  }

  const executed = line.attempts.map((entry) => entry.setting);

  if (line.boundary === null && m19ObstacleEstablished(def, executed)) {
    // The designed obstacle (Option B): one immutable record, in the same
    // handler, before any other event (decision D-U21-1 item 2).
    line.boundary = {
      attempt_index: attempt.index,
      attempt_sequence: attempt.sequence,
      evidence_attempt_indices: m19EvidenceAttemptIndices(def, executed),
      focused_ms: focused,
    };
    sink('difficulty_boundary', {
      ...fields(s, line, 'measurement'),
      attempt_index: attempt.index,
      attempt_sequence: attempt.sequence,
      rule: 'designed_obstacle',
      evidence_attempt_indices: [...line.boundary.evidence_attempt_indices],
      input_mode: 'system',
    });
  }

  if (restored) {
    finishLine(s, line, 'restored', nowMs, sink);
    afterFinish(s, nowMs, sink);
  }

  return { kind: 'executed', attempt, restored };
}

/** After a line's finish: the finished view; after line 2 the completion. */
function afterFinish(s: M19Series, nowMs: number, sink: M19LogSink) {
  showView(s, 'finished', nowMs);

  if (s.lines.every((line) => line.finish !== null)) {
    s.status = 'completed';
    s.closure_reason = 'completed';
    // The row is final here (decision D-U21-1 item 8); the adapter
    // completes the kit window right after this event, so `window_closed`
    // follows it. FINISH only closes the surface.
    sink('series_completed', {
      ...fields(s, null, 'measurement'),
      closure_reason: 'completed',
      ...m19ClosureSnapshot(s),
      input_mode: 'system',
    });
  }
}

/* ------------------------------------------------------------------ *
 * SET ASIDE
 * ------------------------------------------------------------------ */

/** SET ASIDE pressed: opens the confirmation (a view of its own). */
export function m19sRequestSetAside(
  s: M19Series,
  mode: M19InputMode,
  nowMs: number,
  sink: M19LogSink,
): boolean {
  const line = m19LineInWork(s);

  if (
    line === null ||
    s.view !== 'line' ||
    s.pending_set_aside !== null ||
    s.help_open ||
    m19Settling(s, nowMs)
  ) {
    return false;
  }

  s.pending_set_aside = { line: s.line, opened_at_ms: nowMs };
  s.view_shown_at_ms = nowMs;
  sink('set_aside_requested', {
    ...fields(s, line, 'measurement'),
    attempts: line.attempts.length,
    after_boundary: line.boundary !== null,
    input_mode: mode,
  });

  return true;
}

/**
 * BACK / ESC in the dialog: the line stays in work. A cancelling press
 * inside 400 ms of the dialog's opening (the second click of a double
 * click) is ignored and not recorded; the dialog stays open.
 */
export function m19sCancelSetAside(
  s: M19Series,
  mode: M19InputMode,
  nowMs: number,
  sink: M19LogSink,
): boolean {
  const pending = s.pending_set_aside;

  if (pending === null) {
    return false;
  }

  if (nowMs - pending.opened_at_ms < M19_SETTLE_MS) {
    return false;
  }

  cancelPending(s, 'back', mode, sink);
  s.view_shown_at_ms = nowMs;

  return true;
}

export type M19ConfirmOutcome = 'finished' | 'refused' | 'none';

/** The confirming press: only a fresh press finishes the line (`set_aside`). */
export function m19sConfirmSetAside(
  s: M19Series,
  mode: M19InputMode,
  nowMs: number,
  sink: M19LogSink,
): M19ConfirmOutcome {
  const pending = s.pending_set_aside;

  if (pending === null) {
    return 'none';
  }

  const line = m19LineInWork(s);

  if (line === null || pending.line !== s.line) {
    s.pending_set_aside = null;

    return 'none';
  }

  if (nowMs - pending.opened_at_ms < M19_SETTLE_MS) {
    return 'refused';
  }

  void mode;
  s.pending_set_aside = null;
  finishLine(s, line, 'set_aside', nowMs, sink);
  afterFinish(s, nowMs, sink);

  return 'finished';
}

/* ------------------------------------------------------------------ *
 * NEXT LINE, FINISH
 * ------------------------------------------------------------------ */

/** NEXT LINE on line 1's finished view: line 2 presented. */
export function m19sNextLine(
  s: M19Series,
  mode: M19InputMode,
  nowMs: number,
  sink: M19LogSink,
): boolean {
  if (
    s.status !== 'lines' ||
    s.view !== 'finished' ||
    s.help_open ||
    s.line !== 0 ||
    s.lines[0].finish === null ||
    s.lines[1].presented ||
    m19Settling(s, nowMs)
  ) {
    return false;
  }

  void mode;
  presentLine(s, 1, nowMs, sink);

  return true;
}

/** FINISH on the final view: true when the settled surface may close. */
export function m19sFinish(
  s: M19Series,
  mode: M19InputMode,
  nowMs: number,
): boolean {
  void mode;

  return (
    s.status === 'completed' &&
    s.view === 'finished' &&
    !s.help_open &&
    !m19Settling(s, nowMs)
  );
}

/* ------------------------------------------------------------------ *
 * Help
 * ------------------------------------------------------------------ */

/** HELP: informational; never inside a dialog; never a clock pause. */
export function m19sHelp(
  s: M19Series,
  mode: M19InputMode,
  nowMs: number,
  sink: M19LogSink,
): boolean {
  if (
    (!m19Live(s) && !(s.status === 'completed' && s.view === 'finished')) ||
    s.pending_set_aside !== null ||
    s.help_open ||
    m19Settling(s, nowMs)
  ) {
    return false;
  }

  s.help_open = true;

  const inWork = m19LineInWork(s);

  if (inWork !== null) {
    inWork.help_consults += 1;
  }

  sink('help_consulted', {
    ...fields(s, inWork),
    view: m19HelpView(s),
    input_mode: mode,
  });
  s.view_shown_at_ms = nowMs;

  return true;
}

/** CLOSE HELP (H or the button): the view the help returns to settles again. */
export function m19sCloseHelp(
  s: M19Series,
  mode: M19InputMode,
  nowMs: number,
): boolean {
  void mode;

  if (!s.help_open || m19Settling(s, nowMs)) {
    return false;
  }

  s.help_open = false;
  s.view_shown_at_ms = nowMs;

  return true;
}

/* ------------------------------------------------------------------ *
 * Closures
 * ------------------------------------------------------------------ */

/** The end of the outside work: an opened, unfinished series closes `shift_ended`. */
export function m19sCloseAtShiftEnd(
  s: M19Series,
  nowMs: number,
  sink: M19LogSink,
): boolean {
  return closeSeries(s, 'shift_ended', nowMs, sink);
}

/** The station-record review: an opened, unfinished series closes `closed_at_review`. */
export function m19sCloseAtReview(
  s: M19Series,
  nowMs: number,
  sink: M19LogSink,
): boolean {
  return closeSeries(s, 'closed_at_review', nowMs, sink);
}

/**
 * A presented, never-opened panel closed by the shift end or the review:
 * the series becomes the closed record (the adapter writes
 * `closed_unopened`), so a later opening shows it and writes nothing.
 */
export function m19sCloseUnopened(
  s: M19Series,
  reason: 'shift_ended' | 'closed_at_review',
): boolean {
  if (s.status !== 'unopened') {
    return false;
  }

  s.status = 'closed';
  s.closure_reason = reason;
  s.view = 'record';

  return true;
}

export type M19FailOutcome =
  | { kind: 'closed'; line_id: M19LineId | null }
  | { kind: 'after_closure' }
  | { kind: 'none' };

/**
 * A runtime fault. While the series can be worked it closes the series:
 * the line in work (if any) is finished `technical_failure` (its record,
 * boundary and attempts kept), lines finished earlier keep their records;
 * after completion or closure the fault is recorded without touching the
 * scored evidence.
 */
export function m19sFail(
  s: M19Series,
  detail: string,
  nowMs: number,
  sink: M19LogSink,
): M19FailOutcome {
  if (m19Live(s)) {
    const inWork = m19LineInWork(s);

    s.pending_set_aside = null;
    s.help_open = false;

    if (inWork !== null) {
      finishLine(s, inWork, 'technical_failure', nowMs, sink);
    }

    s.status = 'technical_failure';
    s.closure_reason = 'technical_failure';
    s.failure_detail = detail;
    s.view = 'record';

    return { kind: 'closed', line_id: inWork?.id ?? null };
  }

  if (s.status === 'completed' || s.status === 'closed') {
    s.failure_detail = detail;
    s.pending_set_aside = null;
    s.help_open = false;

    return { kind: 'after_closure' };
  }

  return { kind: 'none' };
}

/** The reload hold-back: the panel is never re-run in this page load. */
export function m19sHoldBack(
  s: M19Series,
  detail: string = M19_RELOAD_DETAIL,
): boolean {
  if (s.status !== 'unopened') {
    return false;
  }

  s.status = 'held_back';
  s.failure_detail = detail;
  s.view = 'record';

  return true;
}

/** True for a known line id (the surface and the extractor share it). */
export function m19IsLineId(value: unknown): value is M19LineId {
  return isM19LineId(value);
}
