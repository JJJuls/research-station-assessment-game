/**
 * M23 — the series model of the two-plot excavation protocol (Station 080
 * M01–M26 run, Unit 23; administration `m23-plots-v1`). PURE (no Phaser, no
 * runtime import): the window adapter (`m23Plots.ts`) owns the register
 * window, injects the log sink and the clock, drives the field controllers
 * and the camera; the surface model (`m23SurfaceModel.ts`) only renders this
 * state and calls the adapter with its input mode.
 *
 * Under research-owner decision D-U23-1 (16 October 2026, all nine rows
 * approved as the recommended choices): two independently keyed 7 × 6 plots
 * (A-adjusted, contract §12) opened freely from the plot panel; a plot
 * OPENed or RESUMEd outside its qualifying region approaches under the
 * ordinary follow camera and refuses SCAN and DIG (`outside_scan_region`)
 * until the first body-valid entry, which engages the fixed frame; the
 * first completed empty dig in a new cell of a plot is its immutable
 * genuine failure (C); the first-failure panel offers CONTINUE SEARCH and
 * STOP THIS PLOT with one fresh activation each, STOP direct (D1); after
 * CONTINUE one fully resolved qualifying-region scan (zero or unchanged
 * readings included) or one completed valid new-cell dig credits 1 (C);
 * started-then-system-cancelled acts earn nothing and are retained as a
 * diagnostic (D3); an informed participant shift-end resolves an eligible
 * unknown to 0 only with a usable presented choice, the closure explanation
 * presented and no credit (D2); review, reload and system boundaries never
 * manufacture a 0; the primary is recounted read-only by `features/m23.ts`
 * under E(c). Nothing here scores.
 */
import {
  isM23PlotId,
  M23_ASSIGNMENT_SCHEME,
  M23_CLOSURE_COPY_VERSION,
  M23_DIG_MS,
  M23_LAYOUT_ID,
  M23_NAVIGATION_TOKEN_LIMIT,
  M23_PATH_DISCONTINUITY_PX,
  M23_PLOTS,
  M23_PLOTS_PLANNED,
  M23_SCAN_MS,
  M23_SCAN_REGION_VERSION,
  M23_SETTLE_MS,
  M23_TEXT,
  type M23Band,
  m23Band,
  type M23Cell,
  m23CellCentre,
  m23CellInside,
  m23CellLabel,
  type M23FailureOptionOrder,
  m23KeyCell,
  m23OtherPlotId,
  M23P_CONTENT_VERSION,
  m23Plot,
  type M23PlotDef,
  type M23PlotForm,
  type M23PlotId,
  type M23PlotLetter,
  type M23PlotOrder,
  type M23SelectorStatus,
  m23Signal,
  type M23Trend,
  m23Trend,
} from './m23PlotsContent';

export type M23InputMode = 'pointer' | 'keyboard' | 'system';
/** The sink returns the logger sequence of the event it wrote (null when unknown). */
export type M23LogSink = (
  suffix: string,
  metadata: Record<string, unknown>,
) => number | null | undefined | void;

export type M23SeriesStatus =
  | 'unopened'
  | 'presented'
  | 'open'
  | 'closed'
  | 'held_back'
  | 'technical_failure';

export type M23View =
  | 'none'
  | 'brief'
  | 'example_1'
  | 'example_2'
  | 'selector'
  | 'first_failure'
  | 'stop_confirm'
  | 'record';

export type M23PlotStatus =
  | 'not_started'
  | 'approaching'
  | 'searching'
  | 'choice_pending'
  | 'paused'
  | 'stopped'
  | 'recovered'
  | 'closed_shift_end'
  | 'closed_review'
  | 'technical_failure';

export type M23ActionKind = 'scan' | 'dig';

export type M23RefusalReason =
  | 'plot_not_active'
  | 'choice_pending'
  | 'plot_terminal'
  | 'outside_scan_region'
  | 'outside_plot'
  | 'already_dug'
  | 'action_busy'
  | 'cooldown';

export type M23PauseCause =
  | 'esc'
  | 'panel'
  | 'help'
  | 'overlay'
  | 'plot_switch'
  | 'yard_departure'
  | 'search_region_exit'
  | 'focus_loss'
  | 'hidden'
  | 'scene_shutdown'
  | 'series_boundary';

export type M23CancelReason = M23PauseCause;

/** System causes: a start after CONTINUE cancelled by one of these is the D3 diagnostic. */
export const M23_SYSTEM_CANCEL_CAUSES: readonly M23CancelReason[] = [
  'focus_loss',
  'hidden',
  'scene_shutdown',
];

export type M23PlotClosureReason =
  | 'recovered'
  | 'explicit_stop'
  | 'shift_end'
  | 'review'
  | 'technical_failure'
  | 'reload';

export type M23SeriesTrigger =
  | 'both_plots_terminal'
  | 'shift_end'
  | 'review'
  | 'reload'
  | 'whole_series_fault';

export type M23SeriesClosureReason =
  | 'voluntary_stop'
  | 'completed'
  | 'technical_failure'
  | 'session_end'
  | 'closed_at_review';

export type M23Response = 'continue' | 'stop';
export type M23ResponseSource =
  | 'first_failure_choice'
  | 'selector'
  | 'shift_end';

/** Every suffix the family may log (contract §5; names fixed, all provisional). */
export const M23_EVENT_SUFFIXES = [
  'approach_ended',
  'search_region_entered',
  'presented',
  'opportunity_opened',
  'example_viewed',
  'closure_explanation_presented',
  'plot_opened',
  'surface_opened',
  'surface_closed',
  'help_opened',
  'help_closed',
  'action_started',
  'action_cancelled',
  'scan_resolved',
  'dig_resolved',
  'action_refused',
  'failure_choice_presented',
  'failure_choice',
  'stop_requested',
  'stop_cancelled',
  'plot_closed',
  'paused',
  'resumed',
  'reload_blocked',
  'invalidated',
  'technical_failure',
  'window_closed',
] as const;

export const M23_RELOAD_DETAIL =
  'reload after measured opening: excavation not re-run';

/* ------------------------------------------------------------------ *
 * State
 * ------------------------------------------------------------------ */

export interface M23Assignment {
  plot_a_form: Extract<M23PlotForm, 'a1' | 'a2'>;
  plot_b_form: Extract<M23PlotForm, 'b1' | 'b2'>;
  plot_order: M23PlotOrder;
  failure_option_order: M23FailureOptionOrder;
}

export interface M23ActionToken {
  id: string;
  plot_id: M23PlotId;
  kind: M23ActionKind;
  attempt_number: number;
  started_at_ms: number;
  planned_duration_ms: number;
  input_mode: M23InputMode;
  origin: { x: number; y: number };
  stance: 'interior' | 'boundary_stance';
  cell: M23Cell | null;
  after_continue: boolean;
  terminal: 'resolved' | 'cancelled' | null;
  sequence: number | null;
}

export interface M23Approach {
  id: string;
  entry_kind: 'open' | 'resume';
  start: { x: number; y: number };
  started_at_ms: number;
  start_inside_region: boolean;
  last: { x: number; y: number };
  path_px: number;
  samples: number;
  discontinuity: string | null;
}

export interface M23FirstFailure {
  action_id: string;
  sequence: number | null;
  at_ms: number;
  cell: M23Cell;
  player: { x: number; y: number };
  cell_target_distance_px: number;
  player_target_distance_px: number;
  last_scan_strength: number | null;
  last_scan_action_id: string | null;
}

export interface M23Presentation {
  id: string;
  count: number;
  first_usable_at_ms: number | null;
  /** The failure happened but no usable panel has been shown yet. */
  unpresented: boolean;
}

export interface M23ChosenResponse {
  response: M23Response;
  source: M23ResponseSource;
  at_ms: number;
  sequence: number | null;
  input_mode: M23InputMode;
}

export interface M23Credit {
  action_id: string;
  kind: M23ActionKind;
  at_ms: number;
  sequence: number | null;
}

export interface M23StopRequest {
  id: string;
  at_ms: number;
  origin_view: M23View;
  origin_status: M23PlotStatus;
}

export interface M23ShiftEndSource {
  participant_initiated: boolean;
  origin_input_mode: M23InputMode;
  shift_end_command_id: string | null;
  shift_end_sequence: number | null;
}

export interface M23PlotClosure {
  reason: M23PlotClosureReason;
  at_ms: number;
  sequence: number | null;
  observed_continuation: boolean | null;
  confirmed_stop: boolean;
  stop_request_id: string | null;
  source: M23ResponseSource | 'system' | null;
  stopped_before_failure: boolean;
  shift_end: M23ShiftEndSource | null;
  informed: boolean | null;
}

export interface M23DugCell {
  cell: M23Cell;
  outcome: 'empty' | 'recovered';
  action_id: string;
  sequence: number | null;
  at_ms: number;
}

export interface M23ScanRecord {
  action_id: string;
  at_ms: number;
  strength: number;
  band: M23Band;
  trend: M23Trend;
  comparison_action_id: string | null;
  qualifying: boolean;
}

export interface M23PlotState {
  id: M23PlotId;
  letter: M23PlotLetter;
  form: M23PlotForm;
  key: M23Cell;
  def: M23PlotDef;
  status: M23PlotStatus;
  /** The status before a pause (restored on RESUME inside the region). */
  status_before_pause: Exclude<M23PlotStatus, 'paused'> | null;
  opened: boolean;
  opened_at_ms: number | null;
  realised_position: number | null;
  resume_count: number;
  approach: M23Approach | null;
  approach_count: number;
  region_entries: number;
  first_region_entry_at_ms: number | null;
  stance: 'interior' | 'boundary_stance' | null;
  dug: M23DugCell[];
  scans: M23ScanRecord[];
  attempts: number;
  cancelled: number;
  first_failure: M23FirstFailure | null;
  presentation: M23Presentation | null;
  response: M23ChosenResponse | null;
  credit: M23Credit | null;
  /** D3: action ids started after CONTINUE and cancelled by a system cause. */
  system_cancelled_after_continue: string[];
  stop_request: M23StopRequest | null;
  closure: M23PlotClosure | null;
  tray: boolean;
  fault_detail: string | null;
  last_resolved_action_id: string | null;
  refusals: number;
  pauses: number;
}

export interface M23NavigationTrace {
  focus_epoch_id: string;
  tokens: string[];
  total: number;
  arrow: number;
  tab: number;
  shift_tab: number;
  steps: number;
  /** The id of the element focused now (the renderer's model id). */
  focus: string | null;
}

export interface M23SeriesClosure {
  trigger: M23SeriesTrigger;
  reason: M23SeriesClosureReason;
  at_ms: number;
}

export interface M23ReloadCheck {
  page_load_index: number;
  prior_page_load_event_count: number;
  prior_opening_found: boolean;
  prior_presentation_found: boolean;
  history_continuous: boolean;
  prior_opening_absence_established: boolean;
}

export interface M23Series {
  status: M23SeriesStatus;
  view: M23View;
  surface_open: boolean;
  help_replay: boolean;
  help_origin: M23View | null;
  assignment: M23Assignment;
  plots: [M23PlotState, M23PlotState];
  selected: M23PlotId | null;
  presented: boolean;
  presented_count: number;
  example_views: { page_1: number; page_2: number };
  closure_explanations: number;
  last_closure_explanation_id: string | null;
  opened: boolean;
  opened_at_ms: number | null;
  guidance_addressed: boolean;
  action: M23ActionToken | null;
  counters: {
    action: number;
    approach: number;
    presentation: number;
    stop: number;
    epoch: number;
    explanation: number;
    surface: number;
  };
  view_shown_at_ms: number | null;
  navigation: M23NavigationTrace | null;
  closure: M23SeriesClosure | null;
  fault_detail: string | null;
  reload: M23ReloadCheck | null;
  stale_callbacks: number;
  /** Positions realised: the order plots were actually opened. */
  realised_order: M23PlotId[];
}

function plotState(def: M23PlotDef, form: M23PlotForm): M23PlotState {
  return {
    id: def.id,
    letter: def.letter,
    form,
    key: m23KeyCell(def.id, form)!,
    def,
    status: 'not_started',
    status_before_pause: null,
    opened: false,
    opened_at_ms: null,
    realised_position: null,
    resume_count: 0,
    approach: null,
    approach_count: 0,
    region_entries: 0,
    first_region_entry_at_ms: null,
    stance: null,
    dug: [],
    scans: [],
    attempts: 0,
    cancelled: 0,
    first_failure: null,
    presentation: null,
    response: null,
    credit: null,
    system_cancelled_after_continue: [],
    stop_request: null,
    closure: null,
    tray: false,
    fault_detail: null,
    last_resolved_action_id: null,
    refusals: 0,
    pauses: 0,
  };
}

export function createM23Series(assignment: M23Assignment): M23Series {
  return {
    status: 'unopened',
    view: 'none',
    surface_open: false,
    help_replay: false,
    help_origin: null,
    assignment,
    plots: [
      plotState(M23_PLOTS[0], assignment.plot_a_form),
      plotState(M23_PLOTS[1], assignment.plot_b_form),
    ],
    selected: null,
    presented: false,
    presented_count: 0,
    example_views: { page_1: 0, page_2: 0 },
    closure_explanations: 0,
    last_closure_explanation_id: null,
    opened: false,
    opened_at_ms: null,
    guidance_addressed: false,
    action: null,
    counters: {
      action: 0,
      approach: 0,
      presentation: 0,
      stop: 0,
      epoch: 0,
      explanation: 0,
      surface: 0,
    },
    view_shown_at_ms: null,
    navigation: null,
    closure: null,
    fault_detail: null,
    reload: null,
    stale_callbacks: 0,
    realised_order: [],
  };
}

/* ------------------------------------------------------------------ *
 * Selectors
 * ------------------------------------------------------------------ */

export function m23PlotOf(s: M23Series, id: M23PlotId): M23PlotState {
  return s.plots.find((plot) => plot.id === id)!;
}

export function m23Selected(s: M23Series): M23PlotState | null {
  return s.selected === null ? null : m23PlotOf(s, s.selected);
}

export function m23Live(s: M23Series): boolean {
  return s.status === 'open';
}

export function m23PlotTerminal(plot: M23PlotState): boolean {
  return (
    plot.status === 'stopped' ||
    plot.status === 'recovered' ||
    plot.status === 'closed_shift_end' ||
    plot.status === 'closed_review' ||
    plot.status === 'technical_failure'
  );
}

/** The plot can still be worked (opened or not). */
export function m23PlotAvailable(plot: M23PlotState): boolean {
  return !m23PlotTerminal(plot);
}

export function m23PlotActive(s: M23Series, id: M23PlotId): boolean {
  return s.selected === id && m23PlotOf(s, id).status === 'searching';
}

/** The plot's usable first-failure choice is still unanswered. */
export function m23ChoicePending(plot: M23PlotState): boolean {
  return plot.first_failure !== null && plot.response === null;
}

export function m23Settling(s: M23Series, nowMs: number): boolean {
  return (
    s.view_shown_at_ms !== null && nowMs - s.view_shown_at_ms < M23_SETTLE_MS
  );
}

/** The plots in their ASSIGNED displayed row order (contract §3). */
export function m23DisplayedPlots(s: M23Series): [M23PlotState, M23PlotState] {
  return s.assignment.plot_order === 'AB'
    ? [s.plots[0], s.plots[1]]
    : [s.plots[1], s.plots[0]];
}

/** Which first-failure option sits on the physical LEFT / RIGHT. */
export function m23FailureSides(s: M23Series): {
  left: M23Response;
  right: M23Response;
} {
  return s.assignment.failure_option_order === 'continue_left'
    ? { left: 'continue', right: 'stop' }
    : { left: 'stop', right: 'continue' };
}

export function m23SelectorStatus(plot: M23PlotState): M23SelectorStatus {
  switch (plot.status) {
    case 'not_started':
      return M23_TEXT.status.not_started;
    case 'approaching':
      return M23_TEXT.status.approaching;
    case 'searching':
      return M23_TEXT.status.searching;
    case 'choice_pending':
      return M23_TEXT.status.choice_pending;
    case 'paused':
      return m23ChoicePending(plot)
        ? M23_TEXT.status.choice_pending
        : M23_TEXT.status.paused;
    case 'stopped':
      return M23_TEXT.status.stopped;
    case 'recovered':
      return M23_TEXT.status.recovered;
    case 'closed_shift_end':
      return M23_TEXT.status.closed_shift_end;
    case 'closed_review':
      return M23_TEXT.status.closed_before_choice;
    case 'technical_failure':
      return M23_TEXT.status.technical;
  }
}

export function m23TrayLetters(s: M23Series): M23PlotLetter[] {
  return s.plots.filter((plot) => plot.tray).map((plot) => plot.letter);
}

export function m23DugCellLabel(plot: M23PlotState, cell: M23Cell): string {
  return m23CellLabel(plot.def.bounds, cell);
}

export function m23CellDug(plot: M23PlotState, cell: M23Cell): boolean {
  return plot.dug.some(
    (entry) => entry.cell.col === cell.col && entry.cell.row === cell.row,
  );
}

/** The scanner readout lines (contract §4). */
export function m23ScannerLines(plot: M23PlotState): string[] {
  const last = plot.scans[plot.scans.length - 1];

  return [
    M23_TEXT.scanner_heading(plot.letter),
    ...(last === undefined
      ? [M23_TEXT.scanner_none]
      : [M23_TEXT.scanner_reading(last.strength, last.band), last.trend]),
  ];
}

/** The last-dig / facing readout lines (contract §4). */
export function m23DigLines(
  plot: M23PlotState,
  facing: M23Cell | null,
): string[] {
  const last = plot.dug[plot.dug.length - 1];
  const facingLine =
    facing !== null && m23CellInside(plot.def.bounds, facing)
      ? M23_TEXT.facing(m23CellLabel(plot.def.bounds, facing))
      : M23_TEXT.facing_outside;

  return [
    M23_TEXT.dig_heading(plot.letter),
    last === undefined
      ? M23_TEXT.dig_none
      : last.outcome === 'empty'
        ? M23_TEXT.dig_empty(m23CellLabel(plot.def.bounds, last.cell))
        : M23_TEXT.dig_recovered(m23CellLabel(plot.def.bounds, last.cell)),
    facingLine,
  ];
}

export function m23TrayLine(s: M23Series): string {
  const letters = m23TrayLetters(s);

  return letters.length === 0 ? M23_TEXT.tray_empty : M23_TEXT.tray(letters);
}

/* ------------------------------------------------------------------ *
 * Internals
 * ------------------------------------------------------------------ */

function fields(
  s: M23Series,
  plot: M23PlotState | null,
  phase: string,
): Record<string, unknown> {
  const base: Record<string, unknown> = {
    phase,
    content_version: M23P_CONTENT_VERSION,
    layout_id: M23_LAYOUT_ID,
    plot_id: plot?.id ?? null,
    occasion_id: plot?.id ?? null,
    form: plot?.form ?? null,
    assigned_order: s.assignment.plot_order,
    realised_order: [...s.realised_order],
    failure_option_order: s.assignment.failure_option_order,
    series_status: s.status,
    plot_status: plot?.status ?? null,
    selected_plot: s.selected,
  };

  return base;
}

function id(s: M23Series, kind: keyof M23Series['counters']): string {
  s.counters[kind] += 1;

  return `m23_${kind}_${s.counters[kind]}`;
}

function distance(
  a: { x: number; y: number },
  b: { x: number; y: number },
): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function sequenceOf(written: number | null | undefined | void): number | null {
  return typeof written === 'number' ? written : null;
}

function showView(s: M23Series, view: M23View, nowMs: number) {
  s.view = view;
  s.view_shown_at_ms = nowMs;
}

/** Every plot terminal → the series closes by its own completion. */
function maybeCloseBothTerminal(s: M23Series, nowMs: number, sink: M23LogSink) {
  if (!m23Live(s) || !s.plots.every((plot) => m23PlotTerminal(plot))) {
    return false;
  }

  const anyValid = s.plots.some((plot) => plot.status !== 'technical_failure');
  const anyStop = s.plots.some((plot) => plot.status === 'stopped');

  closeSeries(
    s,
    'both_plots_terminal',
    !anyValid ? 'technical_failure' : anyStop ? 'voluntary_stop' : 'completed',
    nowMs,
    sink,
  );

  return true;
}

function closeSeries(
  s: M23Series,
  trigger: M23SeriesTrigger,
  reason: M23SeriesClosureReason,
  nowMs: number,
  sink: M23LogSink,
) {
  void sink;
  s.closure = { trigger, reason, at_ms: nowMs };
  s.status = reason === 'technical_failure' ? 'technical_failure' : 'closed';
  s.selected = null;
  s.view = s.surface_open ? 'record' : 'none';
  s.view_shown_at_ms = nowMs;
}

function endApproach(
  s: M23Series,
  plot: M23PlotState,
  nowMs: number,
  entered: { x: number; y: number } | null,
  reason: string,
  sink: M23LogSink,
) {
  const approach = plot.approach;

  if (approach === null) {
    return;
  }

  plot.approach = null;

  const end = entered ?? approach.last;
  const complete = approach.discontinuity === null;
  const payload = {
    ...fields(s, plot, 'approach'),
    approach_id: approach.id,
    entry_kind: approach.entry_kind,
    start_x: approach.start.x,
    start_y: approach.start.y,
    started_at_ms: approach.started_at_ms,
    start_inside_region: approach.start_inside_region,
    end_x: end.x,
    end_y: end.y,
    direct_displacement_px:
      Math.round(distance(approach.start, end) * 1000) / 1000,
    travelled_path_length_px: complete
      ? Math.round(approach.path_px * 1000) / 1000
      : null,
    movement_sample_count: approach.samples,
    path_complete: complete,
    discontinuity_reason: approach.discontinuity,
    approach_ms: nowMs - approach.started_at_ms,
    input_mode: 'system',
  };

  if (entered !== null) {
    plot.region_entries += 1;
    plot.first_region_entry_at_ms ??= nowMs;
    sink('search_region_entered', {
      ...payload,
      entry_x: entered.x,
      entry_y: entered.y,
      entered_at_ms: nowMs,
      first_plot_region_entry: plot.region_entries === 1,
    });
  } else {
    sink('approach_ended', {
      ...payload,
      end_reason: reason,
      first_entry_at_ms: null,
    });
  }
}

/** One terminal transition per action token; a second callback is a stale no-op. */
function takeAction(
  s: M23Series,
  actionId: string,
  terminal: 'resolved' | 'cancelled',
): M23ActionToken | null {
  const token = s.action;

  if (token === null || token.id !== actionId || token.terminal !== null) {
    s.stale_callbacks += 1;

    return null;
  }

  token.terminal = terminal;
  s.action = null;

  return token;
}

/* ------------------------------------------------------------------ *
 * Presentation: the brief, the examples, the selector
 * ------------------------------------------------------------------ */

/** The stake prompt opened the surface on the brief (exposure only). */
export function m23sSurfaceOpened(
  s: M23Series,
  view: M23View,
  nowMs: number,
  sink: M23LogSink,
  replay = false,
) {
  s.surface_open = true;
  s.help_replay = replay;
  showView(s, view, nowMs);
  sink('surface_opened', {
    ...fields(s, m23Selected(s), 'presentation'),
    view,
    surface_index: ++s.counters.surface,
    help_replay: replay,
    input_mode: 'system',
  });
}

export function m23sSurfaceClosed(
  s: M23Series,
  nowMs: number,
  sink: M23LogSink,
  reason: string,
) {
  if (!s.surface_open) {
    return;
  }

  const view = s.view;

  s.surface_open = false;
  s.help_replay = false;
  s.help_origin = null;
  s.navigation = null;
  showView(s, 'none', nowMs);
  sink('surface_closed', {
    ...fields(s, m23Selected(s), 'presentation'),
    view,
    close_reason: reason,
    input_mode: 'system',
  });
}

/** The brief is shown (its closure explanation is logged when usable). */
export function m23sBriefShown(
  s: M23Series,
  nowMs: number,
  usable: boolean,
  sink: M23LogSink,
  surface: 'brief' | 'help' = 'brief',
) {
  if (s.status === 'unopened') {
    s.status = 'presented';
  }

  s.presented = true;
  s.presented_count += 1;
  showView(s, 'brief', nowMs);

  if (usable) {
    const explanationId = id(s, 'explanation');

    s.closure_explanations += 1;
    s.last_closure_explanation_id = explanationId;
    sink('closure_explanation_presented', {
      ...fields(s, null, 'presentation'),
      surface,
      copy: M23_TEXT.closure_explanation,
      copy_version: M23_CLOSURE_COPY_VERSION,
      presentation_id: explanationId,
      usable: true,
      input_mode: 'system',
    });
  }
}

export function m23sExampleViewed(
  s: M23Series,
  page: 1 | 2,
  nowMs: number,
  sink: M23LogSink,
  mode: M23InputMode,
) {
  if (page === 1) {
    s.example_views.page_1 += 1;
  } else {
    s.example_views.page_2 += 1;
  }

  showView(s, page === 1 ? 'example_1' : 'example_2', nowMs);
  sink('example_viewed', {
    ...fields(s, null, 'presentation'),
    page,
    view_index: page === 1 ? s.example_views.page_1 : s.example_views.page_2,
    source: s.help_replay ? 'help' : 'brief',
    control_example: true,
    input_mode: mode,
  });
}

export function m23sHelpOpened(
  s: M23Series,
  origin: M23View,
  nowMs: number,
  mode: M23InputMode,
  sink: M23LogSink,
) {
  s.help_replay = true;
  s.help_origin = origin;
  sink('help_opened', {
    ...fields(s, m23Selected(s), 'presentation'),
    origin_view: origin,
    input_mode: mode,
  });
  m23sExampleViewed(s, 1, nowMs, sink, mode);
}

export function m23sHelpClosed(
  s: M23Series,
  nowMs: number,
  mode: M23InputMode,
  sink: M23LogSink,
): M23View | null {
  const origin = s.help_origin;

  s.help_replay = false;
  s.help_origin = null;
  sink('help_closed', {
    ...fields(s, m23Selected(s), 'presentation'),
    return_view: origin,
    input_mode: mode,
  });

  if (origin !== null && origin !== 'none') {
    showView(s, origin, nowMs);

    return origin;
  }

  showView(s, 'none', nowMs);

  return null;
}

/**
 * The selector is actually usable: the FIRST time is the measured opening
 * (the kit's `opportunity_opened` is written by the adapter right after
 * this returns `first`); guidance is addressed on the same transition.
 */
export function m23sSelectorShown(
  s: M23Series,
  nowMs: number,
): 'first' | 'again' | 'closed' {
  if (!m23Live(s) && s.status !== 'presented') {
    showView(s, 'record', nowMs);

    return 'closed';
  }

  showView(s, 'selector', nowMs);

  if (s.opened) {
    return 'again';
  }

  s.opened = true;
  s.opened_at_ms = nowMs;
  s.status = 'open';
  s.guidance_addressed = true;

  return 'first';
}

/** The entry-state snapshot written with the kit's `opportunity_opened` (contract §5). */
export function m23EntrySnapshot(
  s: M23Series,
  context: {
    stage: string | null;
    visibility: { page_visible: boolean; page_focused: boolean };
    prior_load: M23ReloadCheck | null;
    tools: string[];
  },
) {
  return {
    layout_id: M23_LAYOUT_ID,
    content_version: M23P_CONTENT_VERSION,
    plots_planned: M23_PLOTS_PLANNED,
    plots: s.plots.map((plot) => ({
      plot_id: plot.id,
      bounds: { ...plot.def.bounds },
      form: plot.form,
      key_cell: { ...plot.key },
      object_id: plot.def.object_id,
      target_id: plot.def.target_id,
      fixed_scroll: { ...plot.def.fixed_scroll },
    })),
    assigned_plot_order: s.assignment.plot_order,
    failure_option_order: s.assignment.failure_option_order,
    forms: {
      plot_a: s.assignment.plot_a_form,
      plot_b: s.assignment.plot_b_form,
    },
    // Provisional (round 3, OD-6): which assignment mechanism realised the
    // forms and orders above.
    assignment_scheme: M23_ASSIGNMENT_SCHEME,
    scan_region_definition: 'body_valid_inverse_probe_union_not_other_plot',
    scan_region_version: M23_SCAN_REGION_VERSION,
    signal_rule: 'round(100*clamp(1-distance/160,0,1))',
    scanner_display_mode: 'numeric',
    scan_ms: M23_SCAN_MS,
    dig_ms: M23_DIG_MS,
    settle_ms: M23_SETTLE_MS,
    tools: [...context.tools],
    example_exposure: { ...s.example_views },
    closure_explanations_presented: s.closure_explanations,
    closure_copy_version: M23_CLOSURE_COPY_VERSION,
    visibility_state: { ...context.visibility },
    prior_load_evidence: context.prior_load,
    stage: context.stage,
  };
}

/* ------------------------------------------------------------------ *
 * Reload guard
 * ------------------------------------------------------------------ */

export function m23PriorAdministration(
  priorLoadEvents: readonly { event_type: string }[],
): boolean {
  return priorLoadEvents.some(
    (event) => event.event_type === 'proto_m23_plots_opportunity_opened',
  );
}

export function m23PriorLoadCheck(
  pageLoadIndex: number,
  priorLoadEvents: readonly { event_type: string }[],
  integrity: {
    first_sequence: number | null;
    sequence_gap_count: number;
    sequence_duplicate_count: number;
    recovered_from_chunks: boolean;
  },
): M23ReloadCheck {
  const found = m23PriorAdministration(priorLoadEvents);
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
    prior_presentation_found: priorLoadEvents.some(
      (event) => event.event_type === 'proto_m23_plots_presented',
    ),
    history_continuous: continuous,
    prior_opening_absence_established: !found && continuous,
  };
}

/**
 * The reload lock: a series opened in an earlier page load is never re-run.
 * U24 RL-3: a series whose earlier state could not be verified, or whose
 * check is contradictory (U / M), takes the same lock with its own detail
 * (`reloadHoldBackDetail`); the default is the existing H detail.
 */
export function m23sHoldBack(
  s: M23Series,
  check: M23ReloadCheck,
  nowMs: number,
  sink: M23LogSink,
  detail: string = M23_RELOAD_DETAIL,
): boolean {
  if (s.status !== 'unopened' && s.status !== 'presented') {
    return false;
  }

  s.reload = check;
  s.status = 'held_back';
  s.fault_detail = detail;
  // The guidance stays addressed across a hold-back (§12 M1, G04): the
  // yard's later objectives are never held behind a locked stake.
  s.guidance_addressed = true;
  s.closure = { trigger: 'reload', reason: 'session_end', at_ms: nowMs };
  sink('reload_blocked', {
    ...fields(s, null, 'closure'),
    ...check,
    detail,
    input_mode: 'system',
  });

  return true;
}

/* ------------------------------------------------------------------ *
 * Plots: open, resume, approach, region, pause
 * ------------------------------------------------------------------ */

export type M23OpenOutcome =
  | { kind: 'refused'; reason: 'not_live' | 'terminal' | 'settling' }
  | {
      kind: 'choice_first';
      plot_id: M23PlotId;
      entry_kind: 'open' | 'resume';
    }
  | {
      kind: 'approaching' | 'searching';
      plot_id: M23PlotId;
      entry_kind: 'open' | 'resume';
    };

/**
 * OPEN PLOT X / RESUME PLOT X from the selector (contract §12 M2): the
 * previous selection pauses; a pending usable first-failure choice is
 * served first; otherwise the actual origin decides approaching (outside
 * the region) or searching (inside, the fixed frame engaged by the host).
 */
export function m23sOpenPlot(
  s: M23Series,
  plotId: M23PlotId,
  mode: M23InputMode,
  nowMs: number,
  origin: { x: number; y: number },
  member: { member: boolean; stance: 'interior' | 'boundary_stance' | null },
  sink: M23LogSink,
): M23OpenOutcome {
  if (!m23Live(s)) {
    return { kind: 'refused', reason: 'not_live' };
  }

  if (m23Settling(s, nowMs)) {
    return { kind: 'refused', reason: 'settling' };
  }

  const plot = m23PlotOf(s, plotId);

  if (m23PlotTerminal(plot)) {
    return { kind: 'refused', reason: 'terminal' };
  }

  if (s.selected !== null && s.selected !== plotId) {
    m23sPause(s, 'plot_switch', nowMs, sink, 'system');
  }

  s.selected = plotId;

  const entryKind: 'open' | 'resume' = plot.opened ? 'resume' : 'open';

  if (!plot.opened) {
    plot.opened = true;
    plot.opened_at_ms = nowMs;
    s.realised_order.push(plotId);
    plot.realised_position = s.realised_order.length;
  } else {
    plot.resume_count += 1;
  }

  const approach: M23Approach = {
    id: id(s, 'approach'),
    entry_kind: entryKind,
    start: { ...origin },
    started_at_ms: nowMs,
    start_inside_region: member.member,
    last: { ...origin },
    path_px: 0,
    samples: 1,
    discontinuity: null,
  };

  plot.approach = approach;
  plot.approach_count += 1;

  const payload = {
    ...fields(s, plot, 'measurement'),
    approach_id: approach.id,
    entry_kind: entryKind,
    start_x: origin.x,
    start_y: origin.y,
    started_at_ms: nowMs,
    start_inside_region: member.member,
    assigned_position: s.assignment.plot_order.indexOf(plot.letter) + 1,
    realised_position: plot.realised_position,
    resume_count: plot.resume_count,
    choice_pending: m23ChoicePending(plot),
    input_mode: mode,
  };

  if (entryKind === 'open') {
    sink('plot_opened', payload);
  } else {
    sink('resumed', payload);
  }

  if (m23ChoicePending(plot)) {
    // The same unanswered choice first; search input stays closed.
    plot.status = 'choice_pending';
    plot.status_before_pause = null;

    return { kind: 'choice_first', plot_id: plotId, entry_kind: entryKind };
  }

  return enterOrApproach(s, plot, nowMs, origin, member, sink, entryKind);
}

/** After CONTINUE (or with no pending choice): inspect the origin. */
function enterOrApproach(
  s: M23Series,
  plot: M23PlotState,
  nowMs: number,
  origin: { x: number; y: number },
  member: { member: boolean; stance: 'interior' | 'boundary_stance' | null },
  sink: M23LogSink,
  entryKind: 'open' | 'resume',
): M23OpenOutcome {
  if (member.member) {
    plot.status = 'searching';
    plot.status_before_pause = null;
    plot.stance = member.stance;
    endApproach(s, plot, nowMs, origin, 'inside', sink);

    return { kind: 'searching', plot_id: plot.id, entry_kind: entryKind };
  }

  plot.status = 'approaching';
  plot.status_before_pause = null;
  plot.stance = null;

  return { kind: 'approaching', plot_id: plot.id, entry_kind: entryKind };
}

/**
 * CONTINUE from a served pending choice on OPEN / RESUME: the plot then
 * evaluates its origin exactly as an opening does (fixture P09).
 */
export function m23sAfterChoiceEnter(
  s: M23Series,
  plotId: M23PlotId,
  nowMs: number,
  origin: { x: number; y: number },
  member: { member: boolean; stance: 'interior' | 'boundary_stance' | null },
  sink: M23LogSink,
): M23OpenOutcome {
  const plot = m23PlotOf(s, plotId);

  if (!m23Live(s) || s.selected !== plotId || m23PlotTerminal(plot)) {
    return { kind: 'refused', reason: 'not_live' };
  }

  if (plot.approach === null) {
    plot.approach = {
      id: id(s, 'approach'),
      entry_kind: 'resume',
      start: { ...origin },
      started_at_ms: nowMs,
      start_inside_region: member.member,
      last: { ...origin },
      path_px: 0,
      samples: 1,
      discontinuity: null,
    };
    plot.approach_count += 1;
  }

  return enterOrApproach(s, plot, nowMs, origin, member, sink, 'resume');
}

/** A movement sample while approaching (the host calls this every frame). */
export function m23sApproachSample(
  s: M23Series,
  x: number,
  y: number,
  nowMs: number,
) {
  void nowMs;

  const plot = m23Selected(s);

  if (
    plot === null ||
    plot.status !== 'approaching' ||
    plot.approach === null
  ) {
    return;
  }

  const approach = plot.approach;
  const step = distance(approach.last, { x, y });

  if (step > M23_PATH_DISCONTINUITY_PX && approach.discontinuity === null) {
    approach.discontinuity = 'teleport_or_missing_samples';
  }

  approach.path_px += step;
  approach.samples += 1;
  approach.last = { x, y };
}

/** The approaching plot's region is entered body-valid (the host engages the frame). */
export function m23sEnterRegion(
  s: M23Series,
  x: number,
  y: number,
  stance: 'interior' | 'boundary_stance',
  nowMs: number,
  sink: M23LogSink,
): boolean {
  const plot = m23Selected(s);

  if (plot === null || plot.status !== 'approaching') {
    return false;
  }

  m23sApproachSample(s, x, y, nowMs);
  plot.status = 'searching';
  plot.stance = stance;
  endApproach(s, plot, nowMs, { x, y }, 'inside', sink);

  return true;
}

/**
 * Pauses the selected plot (contract §3 engineering interruptions): the
 * running action is cancelled with the same cause, the approach segment
 * ends, the fixed frame is released by the host. An approaching plot that
 * leaves without having entered records no region-exit pause.
 */
export function m23sPause(
  s: M23Series,
  cause: M23PauseCause,
  nowMs: number,
  sink: M23LogSink,
  mode: M23InputMode,
): boolean {
  const plot = m23Selected(s);

  if (plot === null || m23PlotTerminal(plot)) {
    return false;
  }

  if (cause === 'search_region_exit' && plot.status !== 'searching') {
    return false;
  }

  const cancelled = m23sCancelAction(s, cause, nowMs, sink, mode);

  if (plot.status !== 'approaching' && plot.status !== 'searching') {
    // A paused plot or an unanswered choice has nothing further to pause:
    // the choice stays pending and is served again on RESUME.
    return cancelled;
  }

  const before = plot.status;

  endApproach(s, plot, nowMs, null, cause, sink);
  plot.status_before_pause = before;
  plot.status = m23ChoicePending(plot) ? 'choice_pending' : 'paused';
  plot.stance = null;
  plot.pauses += 1;
  sink('paused', {
    ...fields(s, plot, 'measurement'),
    cause,
    state_before: before,
    state_after: plot.status,
    input_mode: mode,
  });

  return true;
}

/** The searching plot's origin left the region (host-detected, per frame). */
export function m23sRegionExit(
  s: M23Series,
  nowMs: number,
  sink: M23LogSink,
): boolean {
  return m23sPause(s, 'search_region_exit', nowMs, sink, 'system');
}

/* ------------------------------------------------------------------ *
 * Actions: admission, start, resolve, cancel, refuse
 * ------------------------------------------------------------------ */

export interface M23Admission {
  admitted: boolean;
  reason: M23RefusalReason | null;
  plot: M23PlotState | null;
}

/**
 * Admission (contract §3, F5 / M2): only the selected plot in `searching`
 * accepts a scan or a dig; the first refusal in this precedence applies.
 */
export function m23Admit(
  s: M23Series,
  kind: M23ActionKind,
  context: {
    member: { member: boolean; stance: 'interior' | 'boundary_stance' | null };
    cell: M23Cell | null;
    busy: boolean;
    cooling: boolean;
    /** The point is inside one of the plot rectangles (no selection). */
    insidePlot: M23PlotId | null;
    /**
     * The ONE plot whose qualifying region holds the point when the point is
     * outside both rectangles (amendment OD-4); `null` in the overlap band
     * (both regions), which the field governs but associates with neither
     * plot; `undefined` (or absent) outside both regions.
     */
    regionPlot?: M23PlotId | null;
  },
): M23Admission {
  const plot = m23Selected(s);

  if (plot === null) {
    const governed = context.insidePlot ?? context.regionPlot ?? null;

    if (governed === null) {
      // The overlap band: governed by the field, nothing to associate —
      // refused, never an ordinary reading. Outside both regions nothing is
      // governed and the admission stays the ungoverned null.
      return context.insidePlot === null && context.regionPlot === null
        ? { admitted: false, reason: 'plot_not_active', plot: null }
        : { admitted: false, reason: null, plot: null };
    }

    const inside = m23PlotOf(s, governed);

    return {
      admitted: false,
      reason: m23PlotTerminal(inside) ? 'plot_terminal' : 'plot_not_active',
      plot: inside,
    };
  }

  if (m23PlotTerminal(plot)) {
    return { admitted: false, reason: 'plot_terminal', plot };
  }

  if (plot.status === 'approaching') {
    return { admitted: false, reason: 'outside_scan_region', plot };
  }

  if (plot.status === 'choice_pending') {
    return { admitted: false, reason: 'choice_pending', plot };
  }

  if (plot.status !== 'searching') {
    return { admitted: false, reason: 'plot_not_active', plot };
  }

  if (context.busy) {
    return { admitted: false, reason: 'action_busy', plot };
  }

  if (kind === 'scan') {
    if (context.cooling) {
      return { admitted: false, reason: 'cooldown', plot };
    }

    if (!context.member.member) {
      return { admitted: false, reason: 'outside_scan_region', plot };
    }

    return { admitted: true, reason: null, plot };
  }

  if (context.cell === null || !m23CellInside(plot.def.bounds, context.cell)) {
    return { admitted: false, reason: 'outside_plot', plot };
  }

  if (m23CellDug(plot, context.cell)) {
    return { admitted: false, reason: 'already_dug', plot };
  }

  if (!context.member.member) {
    return { admitted: false, reason: 'outside_scan_region', plot };
  }

  return { admitted: true, reason: null, plot };
}

/** The copy of a refusal (contract §4). */
export function m23RefusalCopy(reason: M23RefusalReason): string {
  switch (reason) {
    case 'plot_not_active':
    case 'choice_pending':
    case 'plot_terminal':
      return M23_TEXT.refused_inactive;
    case 'outside_scan_region':
      return M23_TEXT.refused_outside_region;
    case 'outside_plot':
      return M23_TEXT.refused_outside_plot;
    case 'already_dug':
      return M23_TEXT.refused_duplicate;
    case 'action_busy':
      return M23_TEXT.refused_busy;
    case 'cooldown':
      return M23_TEXT.refused_cooldown;
  }
}

export function m23sRefuse(
  s: M23Series,
  kind: M23ActionKind,
  reason: M23RefusalReason,
  plot: M23PlotState | null,
  at: { x: number; y: number; cell: M23Cell | null },
  mode: M23InputMode,
  sink: M23LogSink,
) {
  if (plot !== null) {
    plot.refusals += 1;
  }

  sink('action_refused', {
    ...fields(s, plot, 'measurement'),
    attempted_kind: kind,
    reason,
    attempted_x: at.x,
    attempted_y: at.y,
    attempted_cell: at.cell === null ? null : { ...at.cell },
    attempted_cell_label:
      at.cell === null || plot === null
        ? null
        : m23CellLabel(plot.def.bounds, at.cell),
    input_mode: mode,
  });
}

/** A scan or dig started on the admitted plot (the host runs the timed action). */
export function m23sStartAction(
  s: M23Series,
  kind: M23ActionKind,
  nowMs: number,
  origin: { x: number; y: number },
  stance: 'interior' | 'boundary_stance',
  cell: M23Cell | null,
  mode: M23InputMode,
  sink: M23LogSink,
): M23ActionToken | null {
  const plot = m23Selected(s);

  if (plot === null || plot.status !== 'searching' || s.action !== null) {
    return null;
  }

  const token: M23ActionToken = {
    id: id(s, 'action'),
    plot_id: plot.id,
    kind,
    attempt_number: plot.attempts + plot.cancelled + 1,
    started_at_ms: nowMs,
    planned_duration_ms: kind === 'scan' ? M23_SCAN_MS : M23_DIG_MS,
    input_mode: mode,
    origin: { ...origin },
    stance,
    cell: cell === null ? null : { ...cell },
    after_continue: plot.response?.response === 'continue',
    terminal: null,
    sequence: null,
  };

  s.action = token;
  token.sequence = sequenceOf(
    sink('action_started', {
      ...fields(s, plot, 'measurement'),
      action_id: token.id,
      kind,
      attempt_number: token.attempt_number,
      started_at_ms: nowMs,
      planned_duration_ms: token.planned_duration_ms,
      player_x: origin.x,
      player_y: origin.y,
      zone_membership: stance,
      selected_cell: token.cell,
      selected_cell_label:
        token.cell === null ? null : m23CellLabel(plot.def.bounds, token.cell),
      pre_cell_state:
        token.cell === null
          ? null
          : m23CellDug(plot, token.cell)
            ? 'dug'
            : 'untouched',
      after_continue: token.after_continue,
      failure_action_id: plot.first_failure?.action_id ?? null,
      input_mode: mode,
    }),
  );

  return token;
}

export interface M23ScanOutcome {
  kind: 'resolved';
  action_id: string;
  strength: number;
  band: M23Band;
  trend: M23Trend;
  qualifying: boolean;
  credited: boolean;
}

/**
 * A scan fully elapsed. The strength is recomputed from the actual target
 * distance by the content rule; the trend compares only this plot's
 * preceding scan. A qualifying-region scan after CONTINUE is the credit.
 */
export function m23sResolveScan(
  s: M23Series,
  actionId: string,
  nowMs: number,
  origin: { x: number; y: number },
  member: { member: boolean; stance: 'interior' | 'boundary_stance' | null },
  sink: M23LogSink,
  reported: { strength: number | null } = { strength: null },
): M23ScanOutcome | null {
  const token = takeAction(s, actionId, 'resolved');

  if (token === null || token.kind !== 'scan') {
    return null;
  }

  const plot = m23PlotOf(s, token.plot_id);
  const target = m23CellCentre(plot.key);
  const d = distance(origin, target);
  const strength = m23Signal(d);
  const band = m23Band(strength);
  const previous = plot.scans[plot.scans.length - 1] ?? null;
  const trend = m23Trend(previous?.strength ?? null, strength);
  const qualifying = member.member && plot.status === 'searching';
  const credited =
    qualifying &&
    plot.response?.response === 'continue' &&
    plot.credit === null;
  const record: M23ScanRecord = {
    action_id: token.id,
    at_ms: nowMs,
    strength,
    band,
    trend,
    comparison_action_id: previous?.action_id ?? null,
    qualifying,
  };

  plot.scans.push(record);
  plot.attempts += 1;
  plot.last_resolved_action_id = token.id;

  const sequence = sequenceOf(
    sink('scan_resolved', {
      ...fields(s, plot, 'measurement'),
      action_id: token.id,
      started_at_ms: token.started_at_ms,
      resolved_at_ms: nowMs,
      elapsed_action_ms: nowMs - token.started_at_ms,
      planned_duration_ms: token.planned_duration_ms,
      player_x: origin.x,
      player_y: origin.y,
      zone_membership_at_start: token.stance,
      zone_membership_at_resolution: member.stance,
      region_member_at_resolution: member.member,
      target_id: plot.def.target_id,
      target_distance_px: Math.round(d * 1000) / 1000,
      strength,
      reported_strength: reported.strength,
      band,
      trend,
      comparison_action_id: record.comparison_action_id,
      qualifying_continuation: qualifying,
      after_continue: token.after_continue,
      credited,
      input_mode: token.input_mode,
    }),
  );

  if (credited) {
    plot.credit = { action_id: token.id, kind: 'scan', at_ms: nowMs, sequence };
  }

  return {
    kind: 'resolved',
    action_id: token.id,
    strength,
    band,
    trend,
    qualifying,
    credited,
  };
}

export interface M23DigOutcome {
  kind: 'resolved';
  action_id: string;
  outcome: 'empty' | 'recovered';
  first_failure: boolean;
  credited: boolean;
  /** The failure's panel is due (the host shows it and reports usability). */
  choice_due: boolean;
  plot_id: M23PlotId;
}

/**
 * A dig fully elapsed at its selected cell: the keyed cell recovers, any
 * other cell is empty; the FIRST empty new cell is the plot's immutable
 * genuine failure; after CONTINUE a new-cell dig is the credit; recovery
 * closes the plot (`recovered`) and fills the tray.
 */
export function m23sResolveDig(
  s: M23Series,
  actionId: string,
  nowMs: number,
  origin: { x: number; y: number },
  sink: M23LogSink,
): M23DigOutcome | null {
  const token = takeAction(s, actionId, 'resolved');

  if (token === null || token.kind !== 'dig' || token.cell === null) {
    return null;
  }

  const plot = m23PlotOf(s, token.plot_id);
  const cell = token.cell;
  const recovered = cell.col === plot.key.col && cell.row === plot.key.row;
  const outcome: 'empty' | 'recovered' = recovered ? 'recovered' : 'empty';
  const duplicate = m23CellDug(plot, cell);
  const firstFailure =
    !duplicate && outcome === 'empty' && plot.first_failure === null;
  const credited =
    !duplicate &&
    plot.response?.response === 'continue' &&
    plot.credit === null &&
    plot.status === 'searching';
  const targetCentre = m23CellCentre(plot.key);
  const cellCentre = m23CellCentre(cell);
  const lastScan = plot.scans[plot.scans.length - 1] ?? null;

  plot.attempts += 1;
  plot.last_resolved_action_id = token.id;

  if (!duplicate) {
    plot.dug.push({
      cell: { ...cell },
      outcome,
      action_id: token.id,
      sequence: null,
      at_ms: nowMs,
    });
  }

  const sequence = sequenceOf(
    sink('dig_resolved', {
      ...fields(s, plot, 'measurement'),
      action_id: token.id,
      started_at_ms: token.started_at_ms,
      resolved_at_ms: nowMs,
      elapsed_action_ms: nowMs - token.started_at_ms,
      planned_duration_ms: token.planned_duration_ms,
      player_x: origin.x,
      player_y: origin.y,
      cell: { ...cell },
      cell_label: m23CellLabel(plot.def.bounds, cell),
      new_cell: !duplicate,
      outcome,
      dig_number: plot.dug.length,
      first_dig_of_plot: plot.dug.length === 1,
      first_failure: firstFailure,
      failure_action_id: firstFailure
        ? token.id
        : (plot.first_failure?.action_id ?? null),
      after_continue: token.after_continue,
      credited,
      object_id: recovered ? plot.def.object_id : null,
      delivery: recovered ? 'field_tray' : null,
      input_mode: token.input_mode,
    }),
  );

  const dugEntry = plot.dug[plot.dug.length - 1];

  if (dugEntry !== undefined && dugEntry.action_id === token.id) {
    dugEntry.sequence = sequence;
  }

  if (firstFailure) {
    plot.first_failure = {
      action_id: token.id,
      sequence,
      at_ms: nowMs,
      cell: { ...cell },
      player: { ...origin },
      cell_target_distance_px:
        Math.round(distance(cellCentre, targetCentre) * 1000) / 1000,
      player_target_distance_px:
        Math.round(distance(origin, targetCentre) * 1000) / 1000,
      last_scan_strength: lastScan?.strength ?? null,
      last_scan_action_id: lastScan?.action_id ?? null,
    };
    plot.presentation = {
      id: id(s, 'presentation'),
      count: 0,
      first_usable_at_ms: null,
      unpresented: true,
    };
    plot.status = 'choice_pending';
  }

  if (credited) {
    plot.credit = { action_id: token.id, kind: 'dig', at_ms: nowMs, sequence };
  }

  if (recovered) {
    plot.tray = true;
    closePlot(s, plot, 'recovered', nowMs, sink, {
      source: 'system',
      input_mode: token.input_mode,
    });
  }

  return {
    kind: 'resolved',
    action_id: token.id,
    outcome,
    first_failure: firstFailure,
    credited,
    choice_due: firstFailure,
    plot_id: plot.id,
  };
}

/** Cancels the running action with its cause (one terminal transition). */
export function m23sCancelAction(
  s: M23Series,
  reason: M23CancelReason,
  nowMs: number,
  sink: M23LogSink,
  mode: M23InputMode,
): boolean {
  const current = s.action;

  if (current === null) {
    return false;
  }

  const token = takeAction(s, current.id, 'cancelled');

  if (token === null) {
    return false;
  }

  const plot = m23PlotOf(s, token.plot_id);
  const system = M23_SYSTEM_CANCEL_CAUSES.includes(reason);
  // D3's diagnostic: every system-cancelled start after CONTINUE, with or
  // without an earlier credit (never a credit itself).
  const diagnostic = token.after_continue && system;

  plot.cancelled += 1;

  if (diagnostic) {
    plot.system_cancelled_after_continue.push(token.id);
  }

  sink('action_cancelled', {
    ...fields(s, plot, 'measurement'),
    action_id: token.id,
    kind: token.kind,
    started_at_ms: token.started_at_ms,
    cancelled_at_ms: nowMs,
    elapsed_action_ms: Math.max(0, nowMs - token.started_at_ms),
    planned_duration_ms: token.planned_duration_ms,
    cancellation_reason: reason,
    started_input_mode: token.input_mode,
    after_continue: token.after_continue,
    continuation_started_then_system_cancelled: diagnostic,
    input_mode: system ? 'system' : mode,
  });

  return true;
}

/* ------------------------------------------------------------------ *
 * The first-failure choice
 * ------------------------------------------------------------------ */

/**
 * The first-failure panel is on screen; `usable` is the host's actual
 * visibility / focus / operability. Only a usable presentation is the
 * record; an unusable one leaves the failure `unpresented`.
 */
export function m23sPresentFailureChoice(
  s: M23Series,
  plotId: M23PlotId,
  nowMs: number,
  usable: boolean,
  focusEpochId: string,
  sink: M23LogSink,
): boolean {
  const plot = m23PlotOf(s, plotId);

  if (plot.first_failure === null || plot.presentation === null) {
    return false;
  }

  showView(s, 'first_failure', nowMs);

  if (!usable) {
    return false;
  }

  plot.presentation.count += 1;
  plot.presentation.first_usable_at_ms ??= nowMs;
  plot.presentation.unpresented = false;
  s.navigation = {
    focus_epoch_id: focusEpochId,
    tokens: [],
    total: 0,
    arrow: 0,
    tab: 0,
    shift_tab: 0,
    steps: 0,
    focus: null,
  };
  sink('failure_choice_presented', {
    ...fields(s, plot, 'measurement'),
    failure_action_id: plot.first_failure.action_id,
    failure_sequence: plot.first_failure.sequence,
    presentation_id: plot.presentation.id,
    presentation_count: plot.presentation.count,
    presented_at_ms: nowMs,
    failure_to_presentation_ms: nowMs - plot.first_failure.at_ms,
    option_order: s.assignment.failure_option_order,
    left_option: m23FailureSides(s).left,
    right_option: m23FailureSides(s).right,
    visible: true,
    focused: true,
    operable: true,
    focus_epoch_id: focusEpochId,
    resume: plot.presentation.count > 1,
    input_mode: 'system',
  });

  return true;
}

/** An accepted navigation token on the first-failure view (observer only). */
export function m23sNavigationToken(
  s: M23Series,
  token: string,
  family: 'arrow' | 'tab' | 'shift_tab',
  focus: string | null,
) {
  const trace = s.navigation;

  if (trace === null) {
    return;
  }

  trace.total += 1;
  trace.steps += 1;
  trace.focus = focus;

  if (family === 'arrow') {
    trace.arrow += 1;
  } else if (family === 'tab') {
    trace.tab += 1;
  } else {
    trace.shift_tab += 1;
  }

  if (trace.tokens.length < M23_NAVIGATION_TOKEN_LIMIT) {
    trace.tokens.push(token);
  }
}

export interface M23ChoiceOutcome {
  kind: 'chosen' | 'refused';
  response: M23Response | null;
  reason: 'no_pending_choice' | 'settling' | null;
}

/**
 * The first-failure response: CONTINUE SEARCH or STOP THIS PLOT with one
 * fresh activation (D1). STOP commits the plot's closure in the same
 * transition (no request, no confirmation). The navigation trace rides the
 * record (contract §12 M3).
 */
export function m23sChoose(
  s: M23Series,
  plotId: M23PlotId,
  response: M23Response,
  mode: M23InputMode,
  nowMs: number,
  side: 'left' | 'right' | null,
  sink: M23LogSink,
): M23ChoiceOutcome {
  const plot = m23PlotOf(s, plotId);

  if (!m23Live(s) || !m23ChoicePending(plot) || plot.presentation === null) {
    return { kind: 'refused', response: null, reason: 'no_pending_choice' };
  }

  if (m23Settling(s, nowMs)) {
    return { kind: 'refused', response: null, reason: 'settling' };
  }

  const trace = s.navigation;
  const family =
    trace === null || trace.total === 0
      ? 'none'
      : trace.arrow > 0 && trace.tab + trace.shift_tab > 0
        ? 'mixed'
        : trace.arrow > 0
          ? 'arrow'
          : 'tab';
  const sequence = sequenceOf(
    sink('failure_choice', {
      ...fields(s, plot, 'measurement'),
      response,
      source: 'first_failure_choice',
      failure_action_id: plot.first_failure!.action_id,
      failure_sequence: plot.first_failure!.sequence,
      presentation_id: plot.presentation.id,
      chosen_at_ms: nowMs,
      failure_to_choice_ms: nowMs - plot.first_failure!.at_ms,
      presentation_to_choice_ms:
        plot.presentation.first_usable_at_ms === null
          ? null
          : nowMs - plot.presentation.first_usable_at_ms,
      chosen_visual_side: side,
      option_order: s.assignment.failure_option_order,
      focus_epoch_id: trace?.focus_epoch_id ?? null,
      navigation_family: family,
      navigation_steps: trace?.steps ?? 0,
      arrow_count: trace?.arrow ?? 0,
      tab_count: trace?.tab ?? 0,
      shift_tab_count: trace?.shift_tab ?? 0,
      navigation_tokens: trace === null ? [] : [...trace.tokens],
      navigation_tokens_total: trace?.total ?? 0,
      navigation_tokens_truncated:
        trace !== null && trace.total > trace.tokens.length,
      input_mode: mode,
    }),
  );

  plot.response = {
    response,
    source: 'first_failure_choice',
    at_ms: nowMs,
    sequence,
    input_mode: mode,
  };
  s.navigation = null;

  if (response === 'stop') {
    closePlot(s, plot, 'explicit_stop', nowMs, sink, {
      source: 'first_failure_choice',
      input_mode: mode,
    });
  } else {
    // Search resumes: the host re-evaluates the origin (approaching or
    // searching) through `m23sAfterChoiceEnter`.
    plot.status = 'paused';
    plot.status_before_pause = 'searching';
  }

  return { kind: 'chosen', response, reason: null };
}

/* ------------------------------------------------------------------ *
 * The selector STOP (request, cancel, confirm)
 * ------------------------------------------------------------------ */

export function m23sRequestStop(
  s: M23Series,
  plotId: M23PlotId,
  mode: M23InputMode,
  nowMs: number,
  sink: M23LogSink,
): boolean {
  const plot = m23PlotOf(s, plotId);

  if (!m23Live(s) || m23PlotTerminal(plot) || m23Settling(s, nowMs)) {
    return false;
  }

  if (plot.stop_request !== null) {
    return false;
  }

  plot.stop_request = {
    id: id(s, 'stop'),
    at_ms: nowMs,
    origin_view: s.view,
    origin_status: plot.status,
  };
  showView(s, 'stop_confirm', nowMs);
  sink('stop_requested', {
    ...fields(s, plot, 'measurement'),
    stop_request_id: plot.stop_request.id,
    source: 'selector',
    origin_surface: 'selector',
    origin_state: plot.stop_request.origin_status,
    failure_action_id: plot.first_failure?.action_id ?? null,
    presentation_id: plot.presentation?.id ?? null,
    current_response: plot.response?.response ?? null,
    current_credit: plot.credit?.action_id ?? null,
    input_mode: mode,
  });

  return true;
}

export function m23sCancelStop(
  s: M23Series,
  plotId: M23PlotId,
  mode: M23InputMode,
  nowMs: number,
  reason: 'back' | 'esc' | 'overlay' | 'closure',
  sink: M23LogSink,
): boolean {
  const plot = m23PlotOf(s, plotId);
  const request = plot.stop_request;

  if (request === null) {
    return false;
  }

  plot.stop_request = null;

  if (s.view === 'stop_confirm') {
    showView(s, 'selector', nowMs);
  }

  sink('stop_cancelled', {
    ...fields(s, plot, 'measurement'),
    stop_request_id: request.id,
    source: 'selector',
    cancellation_reason: reason,
    input_mode: mode,
  });

  return true;
}

/**
 * The confirmed selector STOP (D1: confirmation retained at this
 * boundary): an unanswered usable first-failure choice records its single
 * `failure_choice(stop)`; after CONTINUE no second choice is written; a
 * pre-failure stop closes with `stopped_before_failure` and fabricates no
 * opening, action or failure.
 */
export function m23sConfirmStop(
  s: M23Series,
  plotId: M23PlotId,
  mode: M23InputMode,
  nowMs: number,
  sink: M23LogSink,
): boolean {
  const plot = m23PlotOf(s, plotId);
  const request = plot.stop_request;

  if (
    request === null ||
    !m23Live(s) ||
    m23PlotTerminal(plot) ||
    m23Settling(s, nowMs)
  ) {
    return false;
  }

  if (s.selected === plot.id) {
    m23sCancelAction(s, 'panel', nowMs, sink, mode);
    endApproach(s, plot, nowMs, null, 'stop', sink);
  }

  if (
    m23ChoicePending(plot) &&
    plot.presentation !== null &&
    !plot.presentation.unpresented
  ) {
    const sequence = sequenceOf(
      sink('failure_choice', {
        ...fields(s, plot, 'measurement'),
        response: 'stop',
        source: 'selector',
        failure_action_id: plot.first_failure!.action_id,
        failure_sequence: plot.first_failure!.sequence,
        presentation_id: plot.presentation.id,
        stop_request_id: request.id,
        chosen_at_ms: nowMs,
        failure_to_choice_ms: nowMs - plot.first_failure!.at_ms,
        presentation_to_choice_ms:
          plot.presentation.first_usable_at_ms === null
            ? null
            : nowMs - plot.presentation.first_usable_at_ms,
        chosen_visual_side: null,
        option_order: s.assignment.failure_option_order,
        focus_epoch_id: null,
        navigation_family: 'none',
        navigation_steps: 0,
        arrow_count: 0,
        tab_count: 0,
        shift_tab_count: 0,
        navigation_tokens: [],
        navigation_tokens_total: 0,
        navigation_tokens_truncated: false,
        input_mode: mode,
      }),
    );

    plot.response = {
      response: 'stop',
      source: 'selector',
      at_ms: nowMs,
      sequence,
      input_mode: mode,
    };
  }

  plot.stop_request = null;
  closePlot(s, plot, 'explicit_stop', nowMs, sink, {
    source: 'selector',
    input_mode: mode,
    confirmed: true,
    stop_request_id: request.id,
  });

  if (m23Live(s)) {
    showView(s, 'selector', nowMs);
  }

  return true;
}

/* ------------------------------------------------------------------ *
 * Plot and series closures
 * ------------------------------------------------------------------ */

/** The plot's per-plot observed continuation under D1 / D2 / D3 (null = unknown). */
export function m23ObservedContinuation(plot: M23PlotState): boolean | null {
  if (plot.first_failure === null) {
    return null;
  }

  if (plot.credit !== null) {
    return true;
  }

  if (plot.response?.response === 'stop') {
    return false;
  }

  // A confirmed selector stop after the usable choice was presented (with
  // CONTINUE and no executable action, or unanswered) is the participant's
  // own stop: a known 0 (fixture B03). A stop of a failure whose choice
  // was never presented stays eligible and unknown (contract §5, D2).
  if (
    plot.closure !== null &&
    plot.closure.reason === 'explicit_stop' &&
    plot.presentation !== null &&
    !plot.presentation.unpresented
  ) {
    return false;
  }

  if (plot.closure !== null && plot.closure.reason === 'shift_end') {
    return plot.closure.informed === true ? false : null;
  }

  return null;
}

function closePlot(
  s: M23Series,
  plot: M23PlotState,
  reason: M23PlotClosureReason,
  nowMs: number,
  sink: M23LogSink,
  detail: {
    source: M23ResponseSource | 'system';
    input_mode: M23InputMode;
    confirmed?: boolean;
    stop_request_id?: string;
    shift_end?: M23ShiftEndSource;
    fault?: string;
  },
) {
  if (m23PlotTerminal(plot)) {
    return;
  }

  if (s.action !== null && s.action.plot_id === plot.id) {
    m23sCancelAction(
      s,
      reason === 'shift_end' || reason === 'review' || reason === 'reload'
        ? 'series_boundary'
        : 'panel',
      nowMs,
      sink,
      detail.input_mode,
    );
  }

  endApproach(s, plot, nowMs, null, reason, sink);

  const unpresented =
    plot.first_failure !== null &&
    (plot.presentation === null || plot.presentation.unpresented);
  const informed =
    reason === 'shift_end'
      ? detail.shift_end?.participant_initiated === true &&
        !unpresented &&
        s.closure_explanations > 0 &&
        plot.first_failure !== null
      : null;
  const stoppedBeforeFailure =
    reason === 'explicit_stop' && plot.first_failure === null;

  plot.status =
    reason === 'recovered'
      ? 'recovered'
      : reason === 'explicit_stop'
        ? 'stopped'
        : reason === 'shift_end'
          ? 'closed_shift_end'
          : reason === 'review' || reason === 'reload'
            ? 'closed_review'
            : 'technical_failure';
  plot.stance = null;
  plot.stop_request = null;

  if (reason === 'technical_failure') {
    plot.fault_detail = detail.fault ?? 'technical failure';
  }

  plot.closure = {
    reason,
    at_ms: nowMs,
    sequence: null,
    observed_continuation: null,
    confirmed_stop: detail.confirmed === true,
    stop_request_id: detail.stop_request_id ?? null,
    source: detail.source,
    stopped_before_failure: stoppedBeforeFailure,
    shift_end: detail.shift_end ?? null,
    informed,
  };
  plot.closure.observed_continuation = m23ObservedContinuation(plot);

  const sequence = sequenceOf(
    sink('plot_closed', {
      ...fields(s, plot, 'closure'),
      plot_closure_reason: reason,
      closed_at_ms: nowMs,
      source: detail.source,
      confirmed_stop: detail.confirmed === true,
      stop_request_id: detail.stop_request_id ?? null,
      failure_action_id: plot.first_failure?.action_id ?? null,
      failure_sequence: plot.first_failure?.sequence ?? null,
      failure_choice_presented: plot.first_failure !== null && !unpresented,
      presentation_id: plot.presentation?.id ?? null,
      response: plot.response?.response ?? null,
      response_source: plot.response?.source ?? null,
      credited_action_id: plot.credit?.action_id ?? null,
      observed_continuation: plot.closure.observed_continuation,
      stopped_before_failure: stoppedBeforeFailure,
      recovered_without_failure:
        reason === 'recovered' && plot.first_failure === null,
      last_resolved_action_id: plot.last_resolved_action_id,
      total_attempts: plot.attempts,
      cancelled_actions: plot.cancelled,
      dug_cells: plot.dug.length,
      tray: plot.tray,
      participant_initiated: detail.shift_end?.participant_initiated ?? null,
      origin_input_mode: detail.shift_end?.origin_input_mode ?? null,
      shift_end_command_id: detail.shift_end?.shift_end_command_id ?? null,
      shift_end_sequence: detail.shift_end?.shift_end_sequence ?? null,
      closure_explanation_presentation_id: s.last_closure_explanation_id,
      closure_explanations_presented: s.closure_explanations,
      informed_shift_end: informed,
      continuation_started_then_system_cancelled:
        plot.system_cancelled_after_continue.length > 0,
      system_cancelled_action_ids: [...plot.system_cancelled_after_continue],
      fault_detail: plot.fault_detail,
      input_mode: detail.input_mode,
    }),
  );

  plot.closure.sequence = sequence;

  if (s.selected === plot.id) {
    s.selected = null;
  }

  // A series boundary (shift end, review, reload) closes the series itself
  // with its own trigger; only a participant's or a fault's plot closure
  // settles the series through "both plots terminal".
  if (reason !== 'shift_end' && reason !== 'review' && reason !== 'reload') {
    maybeCloseBothTerminal(s, nowMs, sink);
  }
}

/** Noor's "finished outside": every live plot closes `shift_end` (D2 applied per plot). */
export function m23sCloseAtShiftEnd(
  s: M23Series,
  nowMs: number,
  source: M23ShiftEndSource,
  sink: M23LogSink,
): boolean {
  if (!m23Live(s)) {
    return false;
  }

  for (const plot of s.plots) {
    if (!m23PlotTerminal(plot)) {
      if (plot.stop_request !== null) {
        m23sCancelStop(s, plot.id, 'system', nowMs, 'closure', sink);
      }

      closePlot(s, plot, 'shift_end', nowMs, sink, {
        source: 'system',
        input_mode: 'system',
        shift_end: source,
      });
    }
  }

  // Both plots already terminal at the boundary keep the trigger that
  // closed the series (`both_plots_terminal`).
  if (m23Live(s)) {
    closeSeries(s, 'shift_end', 'session_end', nowMs, sink);
  }

  return true;
}

/** The station-record review: live plots close `review` (unknowns stay unknown). */
export function m23sCloseAtReview(
  s: M23Series,
  nowMs: number,
  sink: M23LogSink,
): boolean {
  if (!m23Live(s)) {
    return false;
  }

  for (const plot of s.plots) {
    if (!m23PlotTerminal(plot)) {
      if (plot.stop_request !== null) {
        m23sCancelStop(s, plot.id, 'system', nowMs, 'closure', sink);
      }

      closePlot(s, plot, 'review', nowMs, sink, {
        source: 'system',
        input_mode: 'system',
      });
    }
  }

  if (m23Live(s)) {
    closeSeries(s, 'review', 'closed_at_review', nowMs, sink);
  }

  return true;
}

export type M23FailOutcome =
  | { kind: 'plot'; plot_id: M23PlotId; series_closed: boolean }
  | { kind: 'series' }
  | { kind: 'after_closure' }
  | { kind: 'none' };

/**
 * A runtime fault: with a plot named (or selected) only that plot
 * terminates (`technical_failure`), the other stays usable; without one
 * the whole series terminates. Verified outcomes of other plots are kept.
 */
export function m23sFail(
  s: M23Series,
  detail: string,
  plotId: M23PlotId | null,
  nowMs: number,
  sink: M23LogSink,
): M23FailOutcome {
  if (s.status === 'closed' || s.status === 'technical_failure') {
    s.fault_detail = detail;

    return { kind: 'after_closure' };
  }

  if (s.status !== 'open') {
    return { kind: 'none' };
  }

  const target = plotId ?? s.selected;

  if (target !== null) {
    const plot = m23PlotOf(s, target);

    if (!m23PlotTerminal(plot)) {
      if (plot.stop_request !== null) {
        m23sCancelStop(s, plot.id, 'system', nowMs, 'closure', sink);
      }

      sink('technical_failure', {
        ...fields(s, plot, 'closure'),
        scope: 'plot',
        detail,
        at_ms: nowMs,
        input_mode: 'system',
      });
      closePlot(s, plot, 'technical_failure', nowMs, sink, {
        source: 'system',
        input_mode: 'system',
        fault: detail,
      });

      return { kind: 'plot', plot_id: target, series_closed: !m23Live(s) };
    }
  }

  m23sCancelAction(s, 'series_boundary', nowMs, sink, 'system');

  for (const plot of s.plots) {
    if (!m23PlotTerminal(plot)) {
      endApproach(s, plot, nowMs, null, 'whole_series_fault', sink);
      plot.status = 'technical_failure';
      plot.fault_detail = detail;
    }
  }

  s.fault_detail = detail;
  closeSeries(s, 'whole_series_fault', 'technical_failure', nowMs, sink);

  return { kind: 'series' };
}

/** The per-plot and series record written on the kit's `window_closed`. */
export function m23ClosureSnapshot(s: M23Series, nowMs: number) {
  return {
    plots_planned: M23_PLOTS_PLANNED,
    layout_id: M23_LAYOUT_ID,
    series_closure_trigger: s.closure?.trigger ?? null,
    closure_reason: s.closure?.reason ?? null,
    closed_at_ms: nowMs,
    assigned_order: s.assignment.plot_order,
    realised_order: [...s.realised_order],
    failure_option_order: s.assignment.failure_option_order,
    example_exposure: { ...s.example_views },
    closure_explanations_presented: s.closure_explanations,
    stale_callbacks: s.stale_callbacks,
    tray: m23TrayLetters(s),
    plots: s.plots.map((plot) => ({
      plot_id: plot.id,
      occasion_id: plot.id,
      form: plot.form,
      status: plot.status,
      opened: plot.opened,
      realised_position: plot.realised_position,
      resume_count: plot.resume_count,
      approaches: plot.approach_count,
      region_entries: plot.region_entries,
      attempts: plot.attempts,
      scans: plot.scans.length,
      digs: plot.dug.length,
      cancelled: plot.cancelled,
      refusals: plot.refusals,
      pauses: plot.pauses,
      first_failure_action_id: plot.first_failure?.action_id ?? null,
      first_failure_sequence: plot.first_failure?.sequence ?? null,
      failure_choice_presented:
        plot.first_failure !== null &&
        plot.presentation !== null &&
        !plot.presentation.unpresented,
      response: plot.response?.response ?? null,
      response_source: plot.response?.source ?? null,
      credited_action_id: plot.credit?.action_id ?? null,
      credited_kind: plot.credit?.kind ?? null,
      observed_continuation: m23ObservedContinuation(plot),
      continuation_started_then_system_cancelled:
        plot.system_cancelled_after_continue.length > 0,
      system_cancelled_action_ids: [...plot.system_cancelled_after_continue],
      plot_closure_reason: plot.closure?.reason ?? null,
      stopped_before_failure: plot.closure?.stopped_before_failure ?? false,
      recovered_without_failure:
        plot.status === 'recovered' && plot.first_failure === null,
      informed_shift_end: plot.closure?.informed ?? null,
      fault_detail: plot.fault_detail,
      tray: plot.tray,
    })),
  };
}

/** True for a known plot id (the surface and the extractor share it). */
export function m23IsPlotId(value: unknown): value is M23PlotId {
  return isM23PlotId(value);
}

/** The other plot's id (re-exported for the adapter). */
export { m23OtherPlotId, m23Plot };
