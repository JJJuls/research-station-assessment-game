/**
 * M16 — the series model of the handling rule (Station 080 M01–M26 run,
 * Unit 19; administration `m16-handling-v1`). PURE (no Phaser, no runtime
 * import): the window adapter (`m16ProtocolConsole.ts`) owns the register
 * window and injects the log sink and the clock; the surface model
 * (`m16SurfaceModel.ts`) only renders this state and calls the adapter
 * with its input mode.
 *
 * Under research-owner decision D-U19-1 with amendment A1 (11 October
 * 2026): the first-opening card; then two PASSIVE worked examples of
 * identical structure with free movement between them (every view a logged
 * interaction, never an answer); a confirmed boundary that closes teaching
 * irreversibly; then six unseen vials in fixed order, each presented only
 * after the previous vial's first response and each taking ONE confirmed
 * and immutable first response — a drawer or DON'T KNOW (incorrect) —
 * answered only by the identical neutral acknowledgement; no correctness
 * information of any kind before the sixth first response; then two
 * read-only results pages. Leaving keeps everything; there is no STOP
 * control; the review closure keeps the answers as they stand.
 *
 * Only a FRESH confirming press commits (M02 §5.210 / M13 §5.262 / M14 /
 * M15 precedent): a press inside the settle window is refused and recorded;
 * and EVERY view transition settles (the M14 closeout ruling §5.290 (b)
 * generalised): a press inside 400 ms of a view appearing drafts,
 * requests, navigates, opens or closes nothing. A held key never reaches
 * this model (the surface drops repeats).
 *
 * Nothing here scores: the first responses are raw events, and the feature
 * is recounted read-only by `features/m16.ts`. The keys are the content
 * module's approved data; this model never derives a key from a rule
 * function.
 */
import {
  reloadHoldBackClass,
  reloadHoldBackDetail,
} from '../../measurement/reloadCheck';
import {
  M16_ASSIGNED_VIAL_ORDER,
  M16_EXAMPLE_IDS,
  M16_EXAMPLES,
  M16_EXAMPLES_PLANNED,
  M16_EXAMPLES_VERSION,
  M16_FAMILY,
  M16_FORM_ID,
  M16_RULE_VERSION,
  M16_SETTLE_MS,
  M16_TEXT,
  M16_VIALS,
  M16_VIALS_PLANNED,
  type M16Example,
  type M16ExampleId,
  type M16Vial,
  m16Vial,
  type M16VialId,
} from './m16HandlingContent';

export type M16InputMode = 'pointer' | 'keyboard' | 'system';
export type M16Phase =
  | 'intro'
  | 'teaching'
  | 'measurement'
  | 'feedback'
  | 'closure';
export type M16ResponseKind = 'option' | 'dont_know';
export type M16CommitKind = 'option' | 'dont_know';
export type M16CommitTarget = 'teaching_close' | 'vial';
export type M16NextControl = 'next_vial' | 'show_results';
export type M16ExampleNavigation = 'first' | 'next' | 'back' | 'resume';
export type M16ResultsPage = 1 | 2;
export type M16LogSink = (
  suffix: string,
  metadata: Record<string, unknown>,
) => void;

export type M16Status =
  | 'unopened'
  | 'intro'
  | 'teaching'
  | 'measurement'
  | 'completed'
  | 'closed_at_review'
  | 'held_back'
  | 'technical_failure';

export type M16View =
  | 'intro'
  | 'example'
  | 'vial'
  | 'acknowledgement'
  | 'results'
  | 'record';

/** Every suffix the family may log (contract §9; names fixed). */
export const M16_EVENT_SUFFIXES = [
  'presented',
  'opportunity_opened',
  'intro_acknowledged',
  'series_reopened',
  'panel_left',
  'prior_load_checked',
  'example_viewed',
  'teaching_close_requested',
  'teaching_close_cancelled',
  'teaching_closed',
  'vial_presented',
  'option_drafted',
  'commit_requested',
  'commit_cancelled',
  'commit_press_refused',
  'commit_without_draft',
  'first_response',
  'response_acknowledged',
  'first_responses_completed',
  'results_shown',
  'help_consulted',
  'series_closed_at_review',
  'technical_failure',
  'window_closed',
] as const;

export const M16_RELOAD_DETAIL =
  'reload after administration: console not re-run';
/**
 * The U / M hold-back details (U24 RL-4; `RELOAD-CORRECTION-SPEC-r3-exec.md`
 * §2, direction c): a load whose earlier history is not verified (U) or
 * whose check contradicts itself (M) never administers the console; no
 * prior exposure is claimed. The class prefix is RL-0's.
 */
export const M16_UNVERIFIED_DETAIL = reloadHoldBackDetail(
  'U',
  'console not administered',
);
export const M16_CONTRADICTORY_DETAIL = reloadHoldBackDetail(
  'M',
  'console not administered',
);
export const M16_ACK_LINE_ID = 'vial_recorded';

/* ------------------------------------------------------------------ *
 * State
 * ------------------------------------------------------------------ */

export interface M16FirstResponse {
  response_kind: M16ResponseKind;
  option_id: string | null;
  correct: boolean;
  key_option_id: string;
  drafts_before: number;
  help_consults_before: number;
  active_ms: number;
  focused_ms: number | null;
  input_mode: M16InputMode;
  refused_presses: number;
}

export interface M16VialState {
  id: M16VialId;
  index: number;
  presented: boolean;
  draft: string | null;
  drafts: number;
  help_consults: number;
  active_ms: number;
  first_response: M16FirstResponse | null;
}

export interface M16PendingCommit {
  target: M16CommitTarget;
  kind: M16CommitKind | 'start';
  option_id: string | null;
  opened_at_ms: number;
  refused_presses: number;
  refusal_recorded: boolean;
}

export interface M16Series {
  status: M16Status;
  view: M16View;
  open_count: number;
  panel_open: boolean;
  intro_acknowledged: boolean;
  /** Index of the current example (0–1) while teaching. */
  example: number;
  example_views: Record<M16ExampleId, number>;
  back_navigations: number;
  teaching_active_ms: number;
  teaching_closed: boolean;
  /** Index of the current vial (0–5). */
  vial: number;
  vials: M16VialState[];
  pending_commit: M16PendingCommit | null;
  acknowledgement: {
    opened_at_ms: number;
    next_control: M16NextControl;
  } | null;
  help_open: boolean;
  help_consults: Record<M16Phase, number>;
  results_page: M16ResultsPage;
  results_shown: Record<M16ResultsPage, boolean>;
  closure_reason: 'completed' | 'closed_at_review' | 'technical_failure' | null;
  failure_detail: string | null;
  last_tick_ms: number | null;
  /**
   * When the current view appeared (the settle of EVERY transition — the
   * M14 closeout ruling §5.290 (b) generalised): a press inside
   * `M16_SETTLE_MS` of it changes nothing.
   */
  view_shown_at_ms: number | null;
}

export function createM16Series(): M16Series {
  return {
    status: 'unopened',
    view: 'intro',
    open_count: 0,
    panel_open: false,
    intro_acknowledged: false,
    example: 0,
    example_views: { m16_e1: 0, m16_e2: 0 },
    back_navigations: 0,
    teaching_active_ms: 0,
    teaching_closed: false,
    vial: 0,
    vials: M16_VIALS.map((entry) => ({
      id: entry.id,
      index: entry.index,
      presented: false,
      draft: null,
      drafts: 0,
      help_consults: 0,
      active_ms: 0,
      first_response: null,
    })),
    pending_commit: null,
    acknowledgement: null,
    help_open: false,
    help_consults: {
      intro: 0,
      teaching: 0,
      measurement: 0,
      feedback: 0,
      closure: 0,
    },
    results_page: 1,
    results_shown: { 1: false, 2: false },
    closure_reason: null,
    failure_detail: null,
    last_tick_ms: null,
    view_shown_at_ms: null,
  };
}

/* ------------------------------------------------------------------ *
 * Reload guard and entry snapshot
 * ------------------------------------------------------------------ */

/** True when an earlier page load of this identity already opened the console. */
/** The structural part of an earlier load's record the check reads. */
export interface M16PriorEvent {
  event_type: string;
  metadata?: Record<string, unknown>;
}

export function m16PriorAdministration(
  priorLoadEvents: readonly M16PriorEvent[],
): boolean {
  return priorLoadEvents.some(
    (event) => event.event_type === `${M16_FAMILY}opportunity_opened`,
  );
}

/**
 * D-7 (i) (U24 RL-4): an earlier load's U or M hold-back of this family
 * keeps the absence of an earlier opening unestablished in every later
 * load; an H marker never triggers this.
 */
export function m16PriorHoldBackCarried(
  priorLoadEvents: readonly M16PriorEvent[],
): boolean {
  return priorLoadEvents.some((event) => {
    if (event.event_type !== `${M16_FAMILY}technical_failure`) {
      return false;
    }

    const cls = reloadHoldBackClass(event.metadata?.detail);

    return cls === 'U' || cls === 'M';
  });
}

/** The losslessness evidence the runtime keeps beside the raw events. */
export interface M16HistoryIntegrity {
  first_sequence: number | null;
  sequence_gap_count: number;
  sequence_duplicate_count: number;
  /** The store's meta record was unreadable; the history came from chunks. */
  recovered_from_chunks: boolean;
}

/** The reload check written once per page load after a reload. */
export interface M16PriorLoadCheck {
  page_load_index: number;
  prior_page_load_event_count: number;
  prior_opening_found: boolean;
  prior_briefing_found: boolean;
  history_continuous: boolean;
  prior_opening_absence_established: boolean;
}

/**
 * The reload check of a later page load (decision D-U19-1 item 8; the M14
 * closeout ruling §5.290 (a) and D-U18-1 item 6 applied to M16): the
 * absence of an earlier opening is ESTABLISHED only when the recovered
 * history is continuous — at least one earlier record, sequence numbers
 * running from 1 without a gap or a duplicate, and the store's own meta
 * record readable — and holds no `opportunity_opened` of this family. A
 * missing or broken history never establishes absence; a found opening is
 * the hold-back. An earlier briefing is reported, never read as an opening.
 */
export function m16PriorLoadCheck(
  pageLoadIndex: number,
  priorLoadEvents: readonly M16PriorEvent[],
  integrity: M16HistoryIntegrity,
): M16PriorLoadCheck {
  const found = m16PriorAdministration(priorLoadEvents);
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
      (event) => event.event_type === `${M16_FAMILY}presented`,
    ),
    history_continuous: continuous,
    // D-7 (i): an earlier U / M hold-back of this family is carried forward.
    prior_opening_absence_established:
      !found && continuous && !m16PriorHoldBackCarried(priorLoadEvents),
  };
}

/** The entry-state snapshot written with `opportunity_opened` (contract §9). */
export function m16EntrySnapshot(stage: string | null) {
  return {
    vials_planned: M16_VIALS_PLANNED,
    examples_planned: M16_EXAMPLES_PLANNED,
    form_id: M16_FORM_ID,
    rule_version: M16_RULE_VERSION,
    examples_version: M16_EXAMPLES_VERSION,
    example_ids: [...M16_EXAMPLE_IDS],
    assigned_vial_order: [...M16_ASSIGNED_VIAL_ORDER],
    vials: M16_VIALS.map((entry) => ({
      vial_id: entry.id,
      option_ids: entry.options.map((option) => option.id),
      key_option_id: entry.key_option_id,
    })),
    teaching: 'passive_worked_examples',
    examples_after_boundary: 'closed',
    rule_card: 'always_visible',
    dont_know_available: true,
    feedback: 'after_all_first_responses',
    stop_control: false,
    settle_ms: M16_SETTLE_MS,
    stage,
  };
}

/* ------------------------------------------------------------------ *
 * Selectors
 * ------------------------------------------------------------------ */

export function m16Live(s: M16Series): boolean {
  return (
    s.status === 'intro' ||
    s.status === 'teaching' ||
    s.status === 'measurement' ||
    s.status === 'completed'
  );
}

export function m16Phase(s: M16Series): M16Phase {
  switch (s.status) {
    case 'intro':
      return 'intro';
    case 'teaching':
      return 'teaching';
    case 'measurement':
      return 'measurement';
    case 'completed':
      return 'feedback';
    default:
      return 'closure';
  }
}

export function m16CurrentExample(s: M16Series): M16Example {
  return M16_EXAMPLES[s.example];
}

export function m16CurrentVial(s: M16Series): M16Vial {
  return m16Vial(M16_ASSIGNED_VIAL_ORDER[s.vial]);
}

export function m16CurrentVialState(s: M16Series): M16VialState {
  return s.vials[s.vial];
}

export function m16AnsweredCount(s: M16Series): number {
  return s.vials.filter((entry) => entry.first_response !== null).length;
}

/** A press inside the settle window of the current view changes nothing. */
export function m16Settling(s: M16Series, nowMs: number): boolean {
  return (
    s.view_shown_at_ms !== null && nowMs - s.view_shown_at_ms < M16_SETTLE_MS
  );
}

/** The record line of a closed console (null while the console is live). */
export function m16RecordLine(s: M16Series): string | null {
  switch (s.status) {
    case 'closed_at_review':
      return M16_TEXT.closed_at_review;
    case 'held_back': {
      // U24 RL-4 (r3 §9): a U / M hold shows the two approved lines; the
      // existing H text is unchanged.
      const cls = reloadHoldBackClass(s.failure_detail);

      return cls === 'U' || cls === 'M'
        ? M16_TEXT.held_unverified.join('\n')
        : M16_TEXT.held_back;
    }
    case 'technical_failure':
      return M16_TEXT.fault;
    default:
      return null;
  }
}

/** The view name a help consult is recorded with (contract §9). */
export function m16HelpView(s: M16Series): string {
  switch (s.status) {
    case 'intro':
      return 'intro';
    case 'teaching':
      return `example_${m16CurrentExample(s).index}`;
    case 'measurement':
      return `${s.view === 'acknowledgement' ? 'ack' : 'vial'}_${m16CurrentVial(s).index}`;
    case 'completed':
      return s.view === 'results'
        ? `results_${s.results_page}`
        : `ack_${M16_VIALS_PLANNED}`;
    default:
      return 'record';
  }
}

/** The per-vial record written on every closure event. */
export function m16ClosureSnapshot(s: M16Series) {
  const vials = s.vials.map((entry) => ({
    vial_id: entry.id,
    vial_index: entry.index,
    presented: entry.presented,
    answered: entry.first_response !== null,
    response_kind: entry.first_response?.response_kind ?? null,
    option_id: entry.first_response?.option_id ?? null,
    correct: entry.first_response?.correct ?? null,
  }));

  return {
    vials_planned: M16_VIALS_PLANNED,
    examples_planned: M16_EXAMPLES_PLANNED,
    intro_acknowledged: s.intro_acknowledged,
    examples_viewed: { ...s.example_views },
    back_navigations: s.back_navigations,
    teaching_active_ms: s.teaching_active_ms,
    teaching_closed: s.teaching_closed,
    vials_presented: vials.filter((entry) => entry.presented).length,
    vials_answered: vials.filter((entry) => entry.answered).length,
    correct_first_applications: vials.filter((entry) => entry.correct === true)
      .length,
    dont_know_count: vials.filter(
      (entry) => entry.response_kind === 'dont_know',
    ).length,
    vials,
  };
}

/* ------------------------------------------------------------------ *
 * Internals
 * ------------------------------------------------------------------ */

function fields(
  s: M16Series,
  scope: 'series' | 'example' | 'vial',
  phase: M16Phase = m16Phase(s),
): Record<string, unknown> {
  const base: Record<string, unknown> = { phase, form_id: M16_FORM_ID };

  if (scope === 'example') {
    const example = m16CurrentExample(s);

    Object.assign(base, {
      example_id: example.id,
      example_index: example.index,
    });
  } else if (scope === 'vial') {
    const entry = m16CurrentVial(s);

    Object.assign(base, { vial_id: entry.id, vial_index: entry.index });
  }

  return base;
}

/** The scope of the current view. */
function currentScope(s: M16Series): 'series' | 'example' | 'vial' {
  if (s.status === 'teaching') {
    return 'example';
  }

  if (s.status === 'measurement') {
    return 'vial';
  }

  return 'series';
}

/** Active time: accrues to teaching or to the current vial while its view is open. */
function tick(s: M16Series, nowMs: number) {
  if (s.last_tick_ms !== null && s.panel_open) {
    const elapsed = Math.max(0, nowMs - s.last_tick_ms);

    if (s.status === 'teaching') {
      s.teaching_active_ms += elapsed;
    } else if (s.status === 'measurement' && s.view === 'vial') {
      m16CurrentVialState(s).active_ms += elapsed;
    }
  }

  s.last_tick_ms = nowMs;
}

function showView(s: M16Series, view: M16View, nowMs: number) {
  s.view = view;
  s.view_shown_at_ms = nowMs;
}

/** Shows the current example (a logged interaction, never an answer). */
function showExample(
  s: M16Series,
  navigation: M16ExampleNavigation,
  mode: M16InputMode,
  nowMs: number,
  sink: M16LogSink,
) {
  const example = m16CurrentExample(s);

  s.example_views[example.id] += 1;
  showView(s, 'example', nowMs);
  sink('example_viewed', {
    ...fields(s, 'example', 'teaching'),
    view_index: s.example_views[example.id],
    navigation,
    input_mode: mode,
  });
}

function presentVial(s: M16Series, nowMs: number, sink: M16LogSink) {
  const entry = m16CurrentVial(s);
  const state = m16CurrentVialState(s);

  state.presented = true;
  showView(s, 'vial', nowMs);
  sink('vial_presented', {
    ...fields(s, 'vial', 'measurement'),
    assigned_position: entry.index,
    realised_position: s.vials.filter((candidate) => candidate.presented)
      .length,
    option_ids: entry.options.map((option) => option.id),
    input_mode: 'system',
  });
}

function cancelPending(
  s: M16Series,
  reason: 'keep_working' | 'keep_reading' | 'panel_left',
  mode: M16InputMode,
  sink: M16LogSink,
) {
  const pending = s.pending_commit;

  if (pending === null) {
    return;
  }

  s.pending_commit = null;

  if (pending.target === 'teaching_close') {
    sink('teaching_close_cancelled', {
      ...fields(s, 'example', 'teaching'),
      reason,
      refused_presses: pending.refused_presses,
      input_mode: mode,
    });

    return;
  }

  sink('commit_cancelled', {
    ...fields(s, 'vial', 'measurement'),
    kind: pending.kind,
    option_id: pending.option_id,
    reason,
    refused_presses: pending.refused_presses,
    input_mode: mode,
  });
}

/** Records a results page's first display (once per page). */
function showResults(s: M16Series, mode: M16InputMode, sink: M16LogSink) {
  const page = s.results_page;

  if (s.results_shown[page]) {
    return;
  }

  s.results_shown[page] = true;
  sink('results_shown', {
    phase: 'feedback',
    form_id: M16_FORM_ID,
    page,
    vial_ids: m16ResultsVials(page).map((entry) => entry.id),
    input_mode: mode,
  });
}

/** The vials of a results page (1: vials 1–3; 2: vials 4–6). */
export function m16ResultsVials(page: M16ResultsPage): M16Vial[] {
  return page === 1 ? M16_VIALS.slice(0, 3) : M16_VIALS.slice(3, 6);
}

/* ------------------------------------------------------------------ *
 * Opening, leaving, the first-opening card
 * ------------------------------------------------------------------ */

export type M16OpenOutcome = 'opened' | 'reopened' | 'record';

/**
 * The console surface opened. The FIRST opening shows the first-opening
 * card (the adapter has already written the kit's `opportunity_opened`);
 * a later opening resumes the view as it stood (and settles it again) —
 * in teaching the example is shown again (`example_viewed`, `resume`),
 * after completion results page 1 is shown read-only; a closed console
 * shows its record.
 */
export function m16sOpen(
  s: M16Series,
  nowMs: number,
  sink: M16LogSink,
): M16OpenOutcome {
  s.open_count += 1;
  s.panel_open = true;
  s.last_tick_ms = nowMs;
  s.view_shown_at_ms = nowMs;

  if (s.status === 'unopened') {
    s.status = 'intro';
    s.view = 'intro';

    return 'opened';
  }

  if (!m16Live(s)) {
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

  if (s.status === 'teaching') {
    showExample(s, 'resume', 'system', nowMs, sink);
  } else if (s.status === 'completed') {
    showResults(s, 'system', sink);
  }

  return 'reopened';
}

/** The console surface closed (ESC, LEAVE CONSOLE, FINISH, the room). */
export function m16sLeave(s: M16Series, nowMs: number, sink: M16LogSink) {
  if (!s.panel_open) {
    return;
  }

  tick(s, nowMs);

  if (s.pending_commit !== null) {
    cancelPending(s, 'panel_left', 'system', sink);
  }

  s.help_open = false;
  s.panel_open = false;

  if (m16Live(s)) {
    sink('panel_left', {
      ...fields(s, currentScope(s)),
      view: s.view,
      input_mode: 'system',
    });
  }
}

/** SHOW EXAMPLE 1: the card acknowledged; worked example 1 shown. */
export function m16sShowExample1(
  s: M16Series,
  mode: M16InputMode,
  nowMs: number,
  sink: M16LogSink,
): boolean {
  if (s.status !== 'intro' || s.help_open || m16Settling(s, nowMs)) {
    return false;
  }

  tick(s, nowMs);
  s.intro_acknowledged = true;
  sink('intro_acknowledged', { ...fields(s, 'series'), input_mode: mode });
  s.status = 'teaching';
  s.example = 0;
  showExample(s, 'first', mode, nowMs, sink);
  s.last_tick_ms = nowMs;

  return true;
}

/* ------------------------------------------------------------------ *
 * Teaching (never a response)
 * ------------------------------------------------------------------ */

/** NEXT EXAMPLE (example 1) / BACK TO EXAMPLE 1 (example 2). */
export function m16sNavigateExample(
  s: M16Series,
  direction: 'next' | 'back',
  mode: M16InputMode,
  nowMs: number,
  sink: M16LogSink,
): boolean {
  if (
    s.status !== 'teaching' ||
    s.view !== 'example' ||
    s.pending_commit !== null ||
    s.help_open ||
    m16Settling(s, nowMs)
  ) {
    return false;
  }

  const target = direction === 'next' ? 1 : 0;

  if (target === s.example) {
    return false;
  }

  tick(s, nowMs);

  if (direction === 'back') {
    s.back_navigations += 1;
  }

  s.example = target;
  showExample(s, direction, mode, nowMs, sink);

  return true;
}

/** START THE SIX VIALS (example 2 only): opens the boundary confirmation. */
export function m16sRequestTeachingClose(
  s: M16Series,
  mode: M16InputMode,
  nowMs: number,
  sink: M16LogSink,
): boolean {
  if (
    s.status !== 'teaching' ||
    s.view !== 'example' ||
    s.example !== 1 ||
    s.pending_commit !== null ||
    s.help_open ||
    m16Settling(s, nowMs)
  ) {
    return false;
  }

  tick(s, nowMs);
  s.pending_commit = {
    target: 'teaching_close',
    kind: 'start',
    option_id: null,
    opened_at_ms: nowMs,
    refused_presses: 0,
    refusal_recorded: false,
  };
  sink('teaching_close_requested', {
    ...fields(s, 'example', 'teaching'),
    example_views: { ...s.example_views },
    input_mode: mode,
  });

  return true;
}

/* ------------------------------------------------------------------ *
 * Drafts (never a response)
 * ------------------------------------------------------------------ */

/** Makes a drawer the draft of the current vial, replaces it, or clears it. */
export function m16sDraft(
  s: M16Series,
  optionId: string,
  mode: M16InputMode,
  nowMs: number,
  sink: M16LogSink,
): boolean {
  if (
    s.status !== 'measurement' ||
    s.view !== 'vial' ||
    s.pending_commit !== null ||
    s.help_open ||
    m16Settling(s, nowMs)
  ) {
    return false;
  }

  const entry = m16CurrentVial(s);
  const state = m16CurrentVialState(s);

  if (
    state.first_response !== null ||
    !entry.options.some((option) => option.id === optionId)
  ) {
    return false;
  }

  tick(s, nowMs);

  const previous = state.draft;

  state.draft = previous === optionId ? null : optionId;
  state.drafts += 1;
  sink('option_drafted', {
    ...fields(s, 'vial', 'measurement'),
    option_id: state.draft,
    previous_option_id: previous,
    input_mode: mode,
  });

  return true;
}

/* ------------------------------------------------------------------ *
 * Commitment
 * ------------------------------------------------------------------ */

export type M16RequestOutcome = 'opened' | 'no_draft' | 'none';

/** RECORD DRAWER (the opener) or DON'T KNOW pressed: opens the confirmation. */
export function m16sRequestCommit(
  s: M16Series,
  kind: M16CommitKind,
  mode: M16InputMode,
  nowMs: number,
  sink: M16LogSink,
): M16RequestOutcome {
  if (
    s.status !== 'measurement' ||
    s.view !== 'vial' ||
    s.pending_commit !== null ||
    s.help_open ||
    m16Settling(s, nowMs)
  ) {
    return 'none';
  }

  const state = m16CurrentVialState(s);

  if (state.first_response !== null) {
    return 'none';
  }

  tick(s, nowMs);

  if (kind === 'option' && state.draft === null) {
    sink('commit_without_draft', {
      ...fields(s, 'vial', 'measurement'),
      input_mode: mode,
    });

    return 'no_draft';
  }

  s.pending_commit = {
    target: 'vial',
    kind,
    option_id: kind === 'option' ? state.draft : null,
    opened_at_ms: nowMs,
    refused_presses: 0,
    refusal_recorded: false,
  };
  sink('commit_requested', {
    ...fields(s, 'vial', 'measurement'),
    kind,
    option_id: s.pending_commit.option_id,
    input_mode: mode,
  });

  return 'opened';
}

/**
 * KEEP WORKING / KEEP READING / ESC: the view stays open without a record.
 * The dialog settles like every view: a cancelling press inside 400 ms of
 * its opening (the second click of a double click on the opener) is
 * ignored and not recorded; the dialog stays open.
 */
export function m16sCancelCommit(
  s: M16Series,
  mode: M16InputMode,
  nowMs: number,
  sink: M16LogSink,
): boolean {
  const pending = s.pending_commit;

  if (pending === null) {
    return false;
  }

  if (nowMs - pending.opened_at_ms < M16_SETTLE_MS) {
    return false;
  }

  tick(s, nowMs);
  cancelPending(
    s,
    pending.target === 'teaching_close' ? 'keep_reading' : 'keep_working',
    mode,
    sink,
  );
  // The view the dialog returns to settles again.
  s.view_shown_at_ms = nowMs;

  return true;
}

export type M16ConfirmOutcome =
  | 'recorded'
  | 'teaching_closed'
  | 'refused'
  | 'none';

/**
 * The confirming press in a dialog. Only a fresh press acts: a press
 * inside the settle window is refused and recorded once per dialog (the
 * count carried on the record). `teaching_closed` and each first response
 * are written once; a repeated confirmation finds no dialog and writes
 * nothing.
 */
export function m16sConfirmCommit(
  s: M16Series,
  mode: M16InputMode,
  nowMs: number,
  sink: M16LogSink,
  extra: { focused_ms?: number | null } = {},
): M16ConfirmOutcome {
  const pending = s.pending_commit;

  if (pending === null) {
    return 'none';
  }

  const teaching = pending.target === 'teaching_close';

  if (
    (teaching && s.status !== 'teaching') ||
    (!teaching && s.status !== 'measurement')
  ) {
    s.pending_commit = null;

    return 'none';
  }

  const sinceOpened = nowMs - pending.opened_at_ms;

  if (sinceOpened < M16_SETTLE_MS) {
    pending.refused_presses += 1;

    if (!pending.refusal_recorded) {
      pending.refusal_recorded = true;
      sink('commit_press_refused', {
        ...fields(s, teaching ? 'example' : 'vial'),
        target: pending.target,
        kind: pending.kind,
        reason: 'dialog_settling',
        since_opened_ms: sinceOpened,
        settle_ms: M16_SETTLE_MS,
        input_mode: mode,
      });
    }

    return 'refused';
  }

  if (teaching) {
    return confirmTeachingClose(s, pending, mode, nowMs, sink);
  }

  return confirmAnswer(s, pending, mode, nowMs, sink, extra);
}

function confirmTeachingClose(
  s: M16Series,
  pending: M16PendingCommit,
  mode: M16InputMode,
  nowMs: number,
  sink: M16LogSink,
): M16ConfirmOutcome {
  if (s.teaching_closed || s.view !== 'example') {
    s.pending_commit = null;

    return 'none';
  }

  tick(s, nowMs);
  s.teaching_closed = true;
  s.pending_commit = null;
  sink('teaching_closed', {
    ...fields(s, 'example', 'teaching'),
    example_views: { ...s.example_views },
    back_navigations: s.back_navigations,
    teaching_active_ms: s.teaching_active_ms,
    help_consults_before: s.help_consults.intro + s.help_consults.teaching,
    refused_presses: pending.refused_presses,
    input_mode: mode,
  });
  s.status = 'measurement';
  s.vial = 0;
  presentVial(s, nowMs, sink);
  s.last_tick_ms = nowMs;

  return 'teaching_closed';
}

function confirmAnswer(
  s: M16Series,
  pending: M16PendingCommit,
  mode: M16InputMode,
  nowMs: number,
  sink: M16LogSink,
  extra: { focused_ms?: number | null },
): M16ConfirmOutcome {
  const entry = m16CurrentVial(s);
  const state = m16CurrentVialState(s);

  if (state.first_response !== null || s.view !== 'vial') {
    s.pending_commit = null;

    return 'none';
  }

  tick(s, nowMs);

  const response: M16FirstResponse = {
    response_kind: pending.kind === 'option' ? 'option' : 'dont_know',
    option_id: pending.kind === 'option' ? pending.option_id : null,
    // DON'T KNOW is an incorrect first response whatever the draft.
    correct:
      pending.kind === 'option' && pending.option_id === entry.key_option_id,
    key_option_id: entry.key_option_id,
    drafts_before: state.drafts,
    help_consults_before: state.help_consults,
    active_ms: state.active_ms,
    focused_ms:
      typeof extra.focused_ms === 'number'
        ? Math.round(extra.focused_ms)
        : null,
    input_mode: mode,
    refused_presses: pending.refused_presses,
  };

  state.first_response = response;
  s.pending_commit = null;
  sink('first_response', {
    ...fields(s, 'vial', 'measurement'),
    ...response,
    draft_at_commit: state.draft,
  });

  const answered = m16AnsweredCount(s);
  const complete = answered === M16_VIALS_PLANNED;
  const nextControl: M16NextControl = complete ? 'show_results' : 'next_vial';

  showView(s, 'acknowledgement', nowMs);
  s.acknowledgement = { opened_at_ms: nowMs, next_control: nextControl };
  sink('response_acknowledged', {
    ...fields(s, 'vial', 'measurement'),
    line_id: M16_ACK_LINE_ID,
    next_control: nextControl,
    answered_count: answered,
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
      ...m16ClosureSnapshot(s),
      input_mode: 'system',
    });
  }

  return 'recorded';
}

export type M16NextOutcome =
  | 'vial_presented'
  | 'results_shown'
  | 'refused'
  | 'none';

/** NEXT VIAL / SHOW RESULTS after an acknowledgement. */
export function m16sNext(
  s: M16Series,
  mode: M16InputMode,
  nowMs: number,
  sink: M16LogSink,
): M16NextOutcome {
  const ack = s.acknowledgement;

  if (ack === null || s.view !== 'acknowledgement' || s.help_open) {
    return 'none';
  }

  // The control accepts a press only after the view settled; an earlier
  // press is ignored and not recorded (no suffix exists for it).
  if (nowMs - ack.opened_at_ms < M16_SETTLE_MS || m16Settling(s, nowMs)) {
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

  s.vial += 1;
  presentVial(s, nowMs, sink);
  s.last_tick_ms = nowMs;

  return 'vial_presented';
}

/* ------------------------------------------------------------------ *
 * Results (only after the sixth first response)
 * ------------------------------------------------------------------ */

/** NEXT (page 1) / BACK (page 2) between the two results pages. */
export function m16sResultsNavigate(
  s: M16Series,
  direction: 'next' | 'back',
  mode: M16InputMode,
  nowMs: number,
  sink: M16LogSink,
): boolean {
  if (s.status !== 'completed' || s.view !== 'results' || s.help_open) {
    return false;
  }

  const target: M16ResultsPage = direction === 'next' ? 2 : 1;

  if (target === s.results_page) {
    return false;
  }

  // A press inside 400 ms of the last change of view is a doubled press
  // and changes nothing.
  if (m16Settling(s, nowMs)) {
    return false;
  }

  tick(s, nowMs);
  s.results_page = target;
  s.view_shown_at_ms = nowMs;
  showResults(s, mode, sink);

  return true;
}

/**
 * FINISH on a results page: the surface may close only after the page
 * settled (a carried press from NEXT or BACK must not close the console).
 * Nothing is recorded here; the close itself is the surface's leave path.
 */
export function m16sFinish(s: M16Series, nowMs: number): boolean {
  return (
    s.status === 'completed' &&
    s.view === 'results' &&
    !s.help_open &&
    !m16Settling(s, nowMs)
  );
}

/* ------------------------------------------------------------------ *
 * Help
 * ------------------------------------------------------------------ */

/** HELP: informational; never while a dialog is open. */
export function m16sHelp(
  s: M16Series,
  mode: M16InputMode,
  nowMs: number,
  sink: M16LogSink,
): boolean {
  if (
    !m16Live(s) ||
    s.pending_commit !== null ||
    s.help_open ||
    m16Settling(s, nowMs)
  ) {
    return false;
  }

  tick(s, nowMs);
  s.help_open = true;

  const phase = m16Phase(s);

  s.help_consults[phase] += 1;

  if (s.status === 'measurement' && s.view === 'vial') {
    m16CurrentVialState(s).help_consults += 1;
  }

  sink('help_consulted', {
    ...fields(s, currentScope(s)),
    view: m16HelpView(s),
    input_mode: mode,
  });
  // The help sheet is a view of its own: it settles too.
  s.view_shown_at_ms = nowMs;

  return true;
}

/** CLOSE HELP / ESC: the view the help returns to settles again. */
export function m16sCloseHelp(s: M16Series, nowMs: number): boolean {
  if (!s.help_open || m16Settling(s, nowMs)) {
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
 * and not complete (the card, teaching, or 0–5 vials answered) closes with
 * the answers as they stand. A completed series is not reclosed.
 */
export function m16sCloseAtReview(
  s: M16Series,
  nowMs: number,
  sink: M16LogSink,
): boolean {
  if (
    s.status !== 'intro' &&
    s.status !== 'teaching' &&
    s.status !== 'measurement'
  ) {
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
    form_id: M16_FORM_ID,
    closure_reason: 'closed_at_review',
    ...m16ClosureSnapshot(s),
    input_mode: 'system',
  });

  return true;
}

/**
 * The review closure of a console never opened (U24 completion S3, C-7;
 * the M18 precedent `m18sCloseUnopenedAtReview`, REG §5.326 (b)). The kit
 * records the absence (`briefed_not_opened` / `not_briefed_not_opened`,
 * the adapter); the series itself becomes the review's closed record, so a
 * later opening shows that record, accepts no work and writes no event of
 * the family. Nothing is logged here: no opening ever happened.
 */
export function m16sCloseUnopenedAtReview(s: M16Series) {
  if (s.status !== 'unopened') {
    return false;
  }

  s.status = 'closed_at_review';
  s.closure_reason = 'closed_at_review';
  s.view = 'record';

  return true;
}

export type M16FailOutcome = 'scored_phase' | 'feedback' | 'none';

/**
 * A fault. While the series is open (the card, teaching or the vials) it
 * closes the series (the adapter records the kit's technical failure);
 * after completion it is recorded without touching the scored evidence.
 */
export function m16sFail(s: M16Series, detail: string): M16FailOutcome {
  if (
    s.status === 'intro' ||
    s.status === 'teaching' ||
    s.status === 'measurement'
  ) {
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

/** The reload hold-back: the console is never re-run in this page load. */
export function m16sHoldBack(s: M16Series, detail: string = M16_RELOAD_DETAIL) {
  if (s.status !== 'unopened') {
    return false;
  }

  s.status = 'held_back';
  s.failure_detail = detail;
  s.view = 'record';

  return true;
}
