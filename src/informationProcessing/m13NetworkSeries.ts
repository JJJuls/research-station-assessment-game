/**
 * M13 — the three-network series of the Conduit Lattice Bench (Station 080
 * Unit 16, administration `m13-networks-v1`): the PURE series state
 * machine (no Phaser, no runtime, no `import.meta`).
 *
 * Research-owner ruling D-U16-1 (7 October 2026) in two phases:
 * - the FIRST-RESPONSE phase (the scored phase): networks n1 → n2 → n3,
 *   one immutable first response each — a confirmed layout or a confirmed
 *   CANNOT SOLVE — answered only by one identical neutral acknowledgement.
 *   Nothing in this phase reveals whether a layout is connected or sealed;
 *   there is no flow test, no results view and no practice;
 * - RESULTS AND OPTIONAL PRACTICE, only once all three first responses are
 *   recorded: structural feedback on the recorded answers and at most three
 *   practice test runs per network, the same whatever the first response
 *   was. Nothing in this phase changes a first response.
 *
 * The model owns the presentation order, the first-response freeze, the
 * practice cap, help exposure, the closures, the snapshots and every
 * participant-facing string of the bench. It appends its events to
 * `events`; the module store (`m13PipeNetwork.ts`) forwards them to the
 * provisional telemetry family `proto_m13_networks_*`.
 *
 * SCIENTIFIC BOUNDARY: every identifier is a PROVISIONAL candidate. Raw
 * observables are recorded, never scored here. The three networks are
 * repeated observations inside one bench episode; no claim of equal
 * difficulty, of equated or independent forms, or of validity is made.
 */

import type {
  M13PieceType,
  M13Placement,
  M13SlotId,
  PipeValidationDetail,
} from '../measurement/m13PipePuzzle';
import {
  getM13Piece,
  M13_PIECES,
  M13_SLOT_IDS,
} from '../measurement/m13PipePuzzle';
import { MEASUREMENT_PROTOCOL_VERSION } from '../measurement/protocol';
import {
  M13N_ASSIGNED_ORDER,
  M13N_ENTRY_STATE_VERSION,
  M13N_FAMILY_PREFIX,
  M13N_NETWORKS_PLANNED,
  M13N_OPPORTUNITY_ID,
  type M13NetworkDef,
  m13NetworkDescriptor,
  type M13NetworkId,
  m13Networks,
} from './m13NetworkForms';
import type { FormId, InputMode } from './model';
import type {
  PipeBoardState,
  PipeHeld,
  PipeOutcome,
  PipeResult,
} from './pipeBoardEngine';
import {
  createPipeBoardState,
  pipeBenchPieces,
  pipeCancelHeld,
  pipePickUpBench,
  pipePickUpSlot,
  pipePlaceHeld,
  pipeReturnHeld,
  pipeReturnSlot,
  pipeRotateHeld,
  pipeRotateSlot,
  pipeValidate,
} from './pipeBoardEngine';

/** A confirming press inside this window after the dialog opened is refused. */
export const M13N_SETTLE_MS = 400;
/** Practice test runs per network, whatever its first response was. */
export const M13N_PRACTICE_RUNS_MAX = 3;
/** Bounded undo history per board. */
export const M13N_UNDO_DEPTH = 64;

export const M13N_CONSTRAINTS = [
  'endpoint_connected',
  'valve_inline',
  'no_open_branch',
] as const;

/** Every suffix the family may log (declared once by the module store). */
export const M13N_EVENT_SUFFIXES = [
  'series_opened',
  'series_reopened',
  'panel_left',
  'network_presented',
  'piece_picked',
  'piece_placed',
  'piece_returned',
  'piece_rotated',
  'placement_refused',
  'undone',
  'board_reset',
  'commit_requested',
  'commit_cancelled',
  'commit_press_refused',
  'first_response',
  'response_acknowledged',
  'first_responses_completed',
  'results_shown',
  'practice_opened',
  'practice_test_run',
  'practice_closed',
  'help_consulted',
  'series_stopped',
  'series_closed_at_review',
  'technical_failure',
] as const;

export type M13EventSuffix = (typeof M13N_EVENT_SUFFIXES)[number];

/** Event phase: `measurement` is the first-response (scored) phase. */
export type M13EventPhase = 'measurement' | 'feedback' | 'practice' | 'closure';

export interface M13SeriesEvent {
  suffix: M13EventSuffix;
  metadata: Record<string, unknown>;
}

export type PipeAction =
  | { kind: 'pick_bench'; piece_id: string }
  | { kind: 'pick_slot'; slot: string }
  | { kind: 'place'; slot: string }
  | { kind: 'cancel' }
  | { kind: 'return_held' }
  | { kind: 'return_slot'; slot: string }
  | { kind: 'rotate_held' }
  | { kind: 'rotate_slot'; slot: string }
  /** Revert the last board change. */
  | { kind: 'undo' }
  /** Return every seated piece to the bench. */
  | { kind: 'reset_board' };

export type M13ResponseKind = 'layout' | 'cannot_solve';

/**
 * `first_responses` — the first-response phase is open;
 * `completed` — all three first responses are recorded (results and
 * optional practice may follow; this status never changes again);
 * the remaining values close the series without completing it.
 */
export type M13SeriesStatus =
  | 'unopened'
  | 'first_responses'
  | 'completed'
  | 'stopped'
  | 'closed_at_review'
  | 'held_back'
  | 'technical_failure';

export type M13SeriesViewKind =
  | 'network'
  | 'acknowledgement'
  | 'results'
  | 'practice'
  | 'record';

export type M13PracticeClosure = 'finished' | 'review' | 'technical_failure';

/** The immutable first response of one network. */
export interface M13FirstResponse {
  response_kind: M13ResponseKind;
  /** A layout the shared validator accepts; always false for CANNOT SOLVE. */
  correct: boolean;
  reason: string;
  endpoint_connected: boolean;
  valve_inline: boolean;
  open_branch_count: number;
  /** A piece sat on the feed mount and faced the feed port. */
  source_seated: boolean;
  constraints_satisfied: number;
  /** The pieces seated at the confirmation. */
  board: Partial<Record<M13SlotId, M13Placement>>;
  path_slots: M13SlotId[];
  help_consults_before: number;
  active_ms: number;
  input_mode: InputMode;
}

interface PracticeRun {
  run_index: number;
  sealed: boolean;
}

interface NetworkState {
  def: M13NetworkDef;
  presented: boolean;
  board: PipeBoardState;
  history: PipeBoardState[];
  last_action: string | null;
  active_ms: number;
  help_consults: number;
  first_response: M13FirstResponse | null;
  practice: {
    opened: boolean;
    board: PipeBoardState;
    history: PipeBoardState[];
    last_action: string | null;
    runs: PracticeRun[];
    last_detail: PipeValidationDetail | null;
  };
}

interface PendingCommit {
  kind: M13ResponseKind;
  opened_at_ms: number;
  refused_presses: number;
  refusal_reasons: string[];
}

export interface M13Series {
  form: FormId;
  status: M13SeriesStatus;
  view: M13SeriesViewKind;
  /** Index (0–2) of the network presented in the first-response phase. */
  current: number;
  /** Index of the network whose practice board is shown. */
  practice_index: number | null;
  networks: NetworkState[];
  pending_commit: PendingCommit | null;
  practice_closed: M13PracticeClosure | null;
  /** The station record was closed at the review: nothing is recorded after. */
  record_closed: boolean;
  failure_detail: string | null;
  panel_open: boolean;
  last_tick_ms: number | null;
  active_ms: number;
  open_count: number;
  help_consults: { measurement: number; feedback: number; practice: number };
  placements: number;
  moves: number;
  rotations: number;
  returns: number;
  refused: number;
  undos: number;
  resets: number;
  /** Every event the series wrote, in order. */
  events: M13SeriesEvent[];
}

export function createM13Series(form: FormId): M13Series {
  return {
    form,
    status: 'unopened',
    view: 'record',
    current: 0,
    practice_index: null,
    networks: m13Networks(form).map((def) => ({
      def,
      presented: false,
      board: createPipeBoardState(),
      history: [],
      last_action: null,
      active_ms: 0,
      help_consults: 0,
      first_response: null,
      practice: {
        opened: false,
        board: createPipeBoardState(),
        history: [],
        last_action: null,
        runs: [],
        last_detail: null,
      },
    })),
    pending_commit: null,
    practice_closed: null,
    record_closed: false,
    failure_detail: null,
    panel_open: false,
    last_tick_ms: null,
    active_ms: 0,
    open_count: 0,
    help_consults: { measurement: 0, feedback: 0, practice: 0 },
    placements: 0,
    moves: 0,
    rotations: 0,
    returns: 0,
    refused: 0,
    undos: 0,
    resets: 0,
    events: [],
  };
}

/* ------------------------------------------------------------------ *
 * Participant-facing strings (the ONE source; the overlay only renders)
 * ------------------------------------------------------------------ */

export const M13N_TEXT = {
  title: 'CONDUIT LATTICE BENCH — RECONSTRUCTION',
  bench_label: 'BENCH — STANDARD PIECE SET',
  console_label: 'BENCH CONSOLE',
  fractured: 'FRACTURED',
  feed: 'FEED',
  intake: 'INTAKE',
  holding_nothing: 'Holding: nothing',
  // First-response phase.
  rules:
    'Build one run from the FEED port to the INTAKE port. It must pass through the isolation valve and leave no pipe end loose. A fractured mount seats nothing.',
  status_line:
    'Seat the pieces, then RECORD LAYOUT. One answer per network. Results for all three follow the third answer.',
  record_layout: 'RECORD LAYOUT (T)',
  cannot_solve: 'CANNOT SOLVE (N)',
  record_answer: 'RECORD ANSWER (ENTER)',
  record_cannot: 'RECORD (ENTER)',
  keep_working: 'KEEP WORKING (ESC)',
  next_network: 'NEXT NETWORK (ENTER)',
  show_results: 'SHOW RESULTS (ENTER)',
  stop_task: 'STOP TASK',
  stop_question:
    'Stop the bench? Networks without a recorded answer stay unanswered, and no results are shown.',
  stop_confirm: 'STOP (ENTER)',
  stop_keep: 'KEEP (ESC)',
  rotate: 'ROTATE (R)',
  return_piece: 'RETURN (DEL)',
  undo: 'UNDO (U)',
  clear: 'CLEAR (C)',
  help: 'HELP',
  close: 'X',
  hint_network:
    'Drag or click a piece, click a mount to seat it • R / right-click rotates • DEL returns • U undo • C clear\nKeyboard: arrows + SPACE • T RECORD LAYOUT • N CANNOT SOLVE • H help • Q stop • ESC leaves (work stays)',
  hint_acknowledgement:
    'ENTER or the button continues • H help • ESC leaves (recorded answers stay)',
  help_title: 'HELP — LATTICE BENCH',
  help_footer: 'ENTER / ESC / click — close help',
  // Results and optional practice.
  results_heading: 'All three answers are recorded.',
  results_header: 'Recorded answers',
  cannot_solve_answer: 'cannot solve.',
  run_sealed: 'The run is sealed.',
  run_not_sealed: 'The run is not sealed.',
  practice_notice:
    'Practice is optional. It changes nothing in your recorded answers and nothing else on the shift.',
  test_flow: 'TEST FLOW (T)',
  back_to_results: 'BACK TO RESULTS (B)',
  finish: 'FINISH (F)',
  finished: 'All three networks are recorded. The bench is closed.',
  practice_ready:
    'Practice board: up to three test runs. Your recorded answer is unchanged.',
  practice_used:
    'Practice test runs used. This board is read-only. Your recorded answer is unchanged.',
  hint_results:
    '1 / 2 / 3 or the buttons open a practice board • F finish • H help • ESC leaves (recorded answers stay)',
  hint_practice:
    'Drag or click a piece, click a mount to seat it • R / right-click rotates • DEL returns • U undo • C clear\nKeyboard: arrows + SPACE • T test flow • B back to results • H help • ESC leaves (answers stay)',
  hint_record: 'ESC leaves',
  // Closed records.
  record_header: 'Bench record',
  stopped: 'Bench stopped. Recorded answers are kept.',
  review_closed: 'Station record closed — the bench keeps its record.',
  held_back:
    'This bench was already used in this session. Its record is kept; nothing further is recorded here.',
  fault: 'The bench has a fault and is closed. Recorded answers are kept.',
} as const;

/** Short piece names under the bench slots. */
export const M13N_PIECE_SHORT: Record<M13PieceType, string> = {
  straight: 'straight',
  elbow: 'elbow',
  tee: 'tee',
  valve: 'valve',
  cap: 'cap',
};

export function m13NetworkHeader(index: number): string {
  return `Network ${index} of ${M13N_NETWORKS_PLANNED}`;
}

export function m13PracticeHeader(index: number): string {
  return `${m13NetworkHeader(index)} — practice`;
}

export function m13LayoutQuestion(index: number): string {
  return `Record this layout as your answer for network ${index}? It cannot be changed afterwards. Results are shown after all three networks.`;
}

export function m13CannotSolveQuestion(index: number): string {
  return `Record CANNOT SOLVE as your answer for network ${index}? It cannot be changed afterwards.`;
}

/** The neutral acknowledgement — identical for every kind and outcome. */
export function m13AcknowledgementLine(index: number): string {
  return `Answer recorded for network ${index}.`;
}

export function m13PractiseLabel(index: number, runsLeft: number): string {
  return `PRACTISE NETWORK ${index} (${runsLeft} test run${runsLeft === 1 ? '' : 's'} left)`;
}

export function m13PracticeRunLine(runIndex: number): string {
  return `Practice test run ${runIndex} of ${M13N_PRACTICE_RUNS_MAX}. Your recorded answer is unchanged.`;
}

export function m13RecordedAnswerLabel(index: number): string {
  return `Network ${index} — recorded answer:`;
}

export function m13RecordStatusLine(index: number, answered: boolean): string {
  return `Network ${index}: ${answered ? 'answer recorded' : 'no answer recorded'}.`;
}

/** The three structural lines of one connectivity check (results, practice). */
export function m13StructuralLines(detail: PipeValidationDetail): string[] {
  return [
    `Run: feed → intake ${detail.endpoint_connected ? 'CONNECTED' : 'NOT connected'}${
      detail.source_seated ? '' : ' (no piece faces the feed port)'
    }.`,
    `Isolation valve: ${detail.valve_inline ? 'inline' : 'NOT inline'}.`,
    `Open branches on the run: ${detail.open_branch_count}.`,
  ];
}

function structuralLineIds(detail: PipeValidationDetail): string[] {
  return [
    detail.endpoint_connected ? 'run_connected' : 'run_not_connected',
    detail.valve_inline ? 'valve_inline' : 'valve_not_inline',
    'open_branches',
  ];
}

/** Rules and controls of the first-response phase (no solution information). */
export const M13N_HELP_FIRST_RESPONSES: readonly string[] = [
  'Build one run from the FEED port to the INTAKE port. The run must pass',
  'through the isolation valve, and no pipe end may be left loose.',
  'A fractured mount seats nothing.',
  'Drag or click a piece to pick it up, click a mount to seat it.',
  'Right-click / R rotates a piece. DEL / drop on bench returns it.',
  'UNDO (U) reverts the last change; CLEAR (C) returns every piece.',
  'There are three networks. Each takes ONE answer: RECORD LAYOUT (T)',
  'records the board as it stands; CANNOT SOLVE (N) records that instead.',
  'Both ask you to confirm, and a recorded answer cannot be changed.',
  'NEXT NETWORK opens the next one. Results for all three are shown',
  'after the third answer, not before.',
  'STOP TASK (Q) ends the bench. ESC first returns a held piece to',
  'where it was, then leaves the bench and keeps your work.',
];

/** Rules and controls of the results and practice phase. */
export const M13N_HELP_RESULTS: readonly string[] = [
  'Your three answers are recorded and cannot be changed.',
  'Each result reads the recorded board: whether the run joined feed and',
  'intake (connected), whether the isolation valve sat on it (inline) and',
  'how many pipe ends were left loose (open branches). A run with all',
  'three in order is sealed.',
  'PRACTISE NETWORK (1 / 2 / 3) opens that board as you left it, for up to',
  'three test runs. TEST FLOW (T) checks the practice board.',
  'BACK TO RESULTS (B) returns. FINISH (F) closes the bench.',
  'Practice is optional. It changes nothing in your recorded answers and',
  'nothing else on the shift. ESC leaves the bench.',
];

/**
 * Every participant-facing string of the bench, by phase (wording tests).
 * `first_responses` holds everything that can be on screen before the
 * third first response is recorded.
 */
export function m13ParticipantStrings(): {
  first_responses: string[];
  results_and_practice: string[];
  records: string[];
} {
  const T = M13N_TEXT;
  const indices = [1, 2, 3];
  const pieceLines = M13_PIECES.flatMap((piece) => [
    piece.label,
    `Holding ${piece.label}.`,
    `Holding: ${piece.label} (90°)`,
    `Seated ${piece.label} at A1 · 90°.`,
  ]);
  const shared = [
    T.title,
    T.bench_label,
    T.console_label,
    T.fractured,
    T.feed,
    T.intake,
    T.holding_nothing,
    T.rotate,
    T.return_piece,
    T.undo,
    T.clear,
    T.help,
    T.close,
    ...Object.values(M13N_PIECE_SHORT),
    ...M13_SLOT_IDS,
    ...(['A', 'B'] as const).flatMap((form) =>
      m13Networks(form).map(
        (def) => `${def.config.feed_label} → ${def.config.intake_label}`,
      ),
    ),
    T.help_title,
    T.help_footer,
    'Returned to the bench.',
    'Rotated (held) → 90°.',
    'Rotated A1 → 90°.',
    'Undid the last change.',
    'Board cleared — every piece is back on the bench.',
    ...pieceLines,
  ];

  return {
    first_responses: [
      ...shared,
      T.rules,
      T.status_line,
      T.record_layout,
      T.cannot_solve,
      T.record_answer,
      T.record_cannot,
      T.keep_working,
      T.next_network,
      T.show_results,
      T.stop_task,
      T.stop_question,
      T.stop_confirm,
      T.stop_keep,
      T.hint_network,
      T.hint_acknowledgement,
      ...M13N_HELP_FIRST_RESPONSES,
      ...indices.flatMap((index) => [
        m13NetworkHeader(index),
        m13LayoutQuestion(index),
        m13CannotSolveQuestion(index),
        m13AcknowledgementLine(index),
      ]),
    ],
    results_and_practice: [
      ...shared,
      T.results_heading,
      T.results_header,
      T.cannot_solve_answer,
      T.run_sealed,
      T.run_not_sealed,
      T.practice_notice,
      T.test_flow,
      T.back_to_results,
      T.finish,
      T.finished,
      T.practice_ready,
      T.practice_used,
      T.hint_results,
      T.hint_practice,
      ...M13N_HELP_RESULTS,
      ...indices.flatMap((index) => [
        m13PracticeHeader(index),
        m13RecordedAnswerLabel(index),
        ...[0, 1, 2, 3].map((left) => m13PractiseLabel(index, left)),
        m13PracticeRunLine(index),
      ]),
      'Run: feed → intake CONNECTED.',
      'Run: feed → intake NOT connected.',
      'Run: feed → intake NOT connected (no piece faces the feed port).',
      'Isolation valve: inline.',
      'Isolation valve: NOT inline.',
      'Open branches on the run: 0.',
    ],
    records: [
      T.record_header,
      T.stopped,
      T.review_closed,
      T.held_back,
      T.fault,
      T.hint_record,
      ...indices.flatMap((index) => [
        m13RecordStatusLine(index, true),
        m13RecordStatusLine(index, false),
      ]),
    ],
  };
}

/* ------------------------------------------------------------------ *
 * Internals
 * ------------------------------------------------------------------ */

function answeredCount(s: M13Series): number {
  return s.networks.filter((network) => network.first_response !== null).length;
}

/** True once all three first responses are recorded (never reverts). */
export function m13FirstResponsesComplete(s: M13Series): boolean {
  return s.status === 'completed';
}

/** True while the series still records events. */
function live(s: M13Series): boolean {
  if (s.record_closed) {
    return false;
  }

  return (
    s.status === 'first_responses' ||
    (s.status === 'completed' && s.practice_closed === null)
  );
}

function eventPhase(s: M13Series): M13EventPhase {
  if (s.status === 'first_responses') {
    return 'measurement';
  }

  if (s.status === 'completed') {
    return s.view === 'practice' ? 'practice' : 'feedback';
  }

  return 'closure';
}

function networkFields(network: NetworkState) {
  return {
    network_id: network.def.network_id,
    network_index: network.def.network_index,
    trial_id: network.def.trial_id,
    content_version: network.def.content_version,
  };
}

function emit(
  s: M13Series,
  suffix: M13EventSuffix,
  phase: M13EventPhase,
  metadata: Record<string, unknown> = {},
  network: NetworkState | null = null,
) {
  s.events.push({
    suffix,
    metadata: {
      opportunity_id: M13N_OPPORTUNITY_ID,
      entry_state_version: M13N_ENTRY_STATE_VERSION,
      form_id: s.form,
      measurement_protocol_version: MEASUREMENT_PROTOCOL_VERSION,
      phase,
      ...(network === null ? {} : networkFields(network)),
      series_active_ms: s.active_ms,
      ...metadata,
    },
  });
}

/** Focused time: the bench open; a network's own share while it is unanswered. */
function tick(s: M13Series, nowMs: number) {
  if (!s.panel_open || s.last_tick_ms === null) {
    return;
  }

  const delta = Math.max(0, nowMs - s.last_tick_ms);

  s.last_tick_ms = nowMs;
  s.active_ms += delta;

  if (s.status === 'first_responses' && s.view === 'network') {
    s.networks[s.current].active_ms += delta;
  }
}

/** The network whose board can be edited right now, or null. */
function editable(
  s: M13Series,
): { network: NetworkState; practice: boolean } | null {
  if (!live(s) || s.pending_commit !== null) {
    return null;
  }

  if (s.status === 'first_responses' && s.view === 'network') {
    const network = s.networks[s.current];

    return network.first_response === null
      ? { network, practice: false }
      : null;
  }

  if (
    s.status === 'completed' &&
    s.view === 'practice' &&
    s.practice_index !== null
  ) {
    const network = s.networks[s.practice_index];

    return network.practice.runs.length < M13N_PRACTICE_RUNS_MAX
      ? { network, practice: true }
      : null;
  }

  return null;
}

function constraintsSatisfied(detail: PipeValidationDetail): number {
  return (
    Number(detail.endpoint_connected) +
    Number(detail.valve_inline) +
    Number(detail.open_branch_count === 0 && detail.source_seated)
  );
}

/** Per-network first-response record of a closure snapshot. */
function closureSnapshot(s: M13Series) {
  const answered = answeredCount(s);

  return {
    networks_planned: M13N_NETWORKS_PLANNED,
    networks_presented: s.networks.filter((network) => network.presented)
      .length,
    networks_answered: answered,
    first_solutions: s.networks.filter(
      (network) => network.first_response?.correct === true,
    ).length,
    assigned_order: [...M13N_ASSIGNED_ORDER],
    realised_order: s.networks
      .filter((network) => network.presented)
      .map((network) => network.def.network_id),
    first_responses: s.networks.map((network) => ({
      ...networkFields(network),
      answered: network.first_response !== null,
      response_kind: network.first_response?.response_kind ?? null,
      correct: network.first_response?.correct ?? null,
    })),
    help_consults_measurement: s.help_consults.measurement,
  };
}

function practiceRunsUsed(s: M13Series) {
  return s.networks.map((network) => ({
    network_id: network.def.network_id,
    opened: network.practice.opened,
    runs_used: network.practice.runs.length,
  }));
}

function presentCurrent(s: M13Series) {
  const network = s.networks[s.current];

  network.presented = true;
  s.view = 'network';
  emit(
    s,
    'network_presented',
    'measurement',
    {
      assigned_position: network.def.network_index,
      realised_position: s.networks.filter((entry) => entry.presented).length,
      ...m13NetworkDescriptor(network.def),
    },
    network,
  );
}

function resultLineIds(network: NetworkState): string[] {
  const response = network.first_response;

  if (response === null) {
    return [];
  }

  if (response.response_kind === 'cannot_solve') {
    return ['cannot_solve'];
  }

  return [
    response.endpoint_connected ? 'run_connected' : 'run_not_connected',
    response.valve_inline ? 'valve_inline' : 'valve_not_inline',
    'open_branches',
    response.correct ? 'run_sealed' : 'run_not_sealed',
  ];
}

function showResults(s: M13Series, trigger: string) {
  s.view = 'results';
  s.practice_index = null;
  emit(s, 'results_shown', 'feedback', {
    trigger,
    results: s.networks.map((network) => ({
      ...networkFields(network),
      line_ids: resultLineIds(network),
    })),
    practice_runs: practiceRunsUsed(s),
  });
}

/* ------------------------------------------------------------------ *
 * Opening, leaving, reload
 * ------------------------------------------------------------------ */

/**
 * Reload guard (register §5.14): true when an earlier page load of this
 * identity already opened this administration's series.
 */
export function m13PriorAdministration(
  priorLoadEvents: readonly { event_type: string }[],
): boolean {
  return priorLoadEvents.some(
    (event) => event.event_type === `${M13N_FAMILY_PREFIX}series_opened`,
  );
}

export const M13N_RELOAD_DETAIL =
  'reload after administration: bench not re-run';

export type M13OpenOutcome = 'opened' | 'reopened' | 'held_back' | 'record';

/** The bench overlay opened. Never presents a network a second time. */
export function m13sOpen(
  s: M13Series,
  nowMs: number,
  context: { priorAdministration: boolean },
): M13OpenOutcome {
  s.open_count += 1;

  if (s.status === 'unopened') {
    if (s.record_closed) {
      return 'record';
    }

    if (context.priorAdministration) {
      s.status = 'held_back';
      s.view = 'record';
      s.failure_detail = M13N_RELOAD_DETAIL;
      emit(s, 'technical_failure', 'closure', {
        detail: M13N_RELOAD_DETAIL,
        prior_exposure: true,
      });

      return 'held_back';
    }

    s.status = 'first_responses';
    s.current = 0;
    s.panel_open = true;
    s.last_tick_ms = nowMs;
    emit(s, 'series_opened', 'measurement', {
      networks_planned: M13N_NETWORKS_PLANNED,
      assigned_order: [...M13N_ASSIGNED_ORDER],
      networks: s.networks.map((network) => m13NetworkDescriptor(network.def)),
      piece_set: M13_PIECES.map((piece) => piece.piece_id),
      pieces_available: M13_PIECES.length,
      constraints: [...M13N_CONSTRAINTS],
      commit: 'explicit_confirmation',
      cannot_solve_available: true,
      feedback: 'after_all_first_responses',
      practice: {
        available_after: 'all_first_responses',
        test_runs_max_per_network: M13N_PRACTICE_RUNS_MAX,
        same_access_for_every_first_response: true,
      },
      help: 'on_request',
      settle_ms: M13N_SETTLE_MS,
    });
    presentCurrent(s);

    return 'opened';
  }

  if (!live(s)) {
    return 'record';
  }

  s.panel_open = true;
  s.last_tick_ms = nowMs;

  const shown =
    s.view === 'practice' && s.practice_index !== null
      ? s.networks[s.practice_index]
      : s.status === 'first_responses'
        ? s.networks[s.current]
        : null;

  emit(s, 'series_reopened', eventPhase(s), { view: s.view }, shown);

  if (s.status === 'completed' && s.view === 'results') {
    showResults(s, 'reopened');
  }

  return 'reopened';
}

/** The overlay closed (ESC / I / close control / room change). */
export function m13sLeave(s: M13Series, nowMs: number) {
  if (!s.panel_open) {
    return;
  }

  tick(s, nowMs);

  // A held piece always goes safely home; an open confirmation is dropped
  // without an answer.
  for (const network of s.networks) {
    if (network.board.held !== null) {
      network.board = pipeCancelHeld(network.board).state;
    }

    if (network.practice.board.held !== null) {
      network.practice.board = pipeCancelHeld(network.practice.board).state;
    }
  }

  if (s.pending_commit !== null) {
    cancelPending(s, 'panel_left', 'system');
  }

  s.panel_open = false;
  s.last_tick_ms = null;

  if (live(s)) {
    emit(s, 'panel_left', eventPhase(s), { view: s.view });
  }
}

/* ------------------------------------------------------------------ *
 * Board manipulation (first-response boards and practice boards)
 * ------------------------------------------------------------------ */

function undoOutcome(board: PipeBoardState, history: PipeBoardState[]) {
  if (history.length === 0) {
    return {
      state: board,
      result: {
        ok: false,
        reason: 'not_holding',
        detail: 'Nothing to undo.',
      },
    } satisfies PipeOutcome;
  }

  // Snapshots are taken of seated state, so an undo never loses a held piece.
  const restored = history.pop()!;

  return {
    state: restored,
    result: {
      ok: true,
      detail: { seated_after: Object.keys(restored.placements).length },
    },
  } satisfies PipeOutcome;
}

function resetOutcome(current: PipeBoardState): PipeOutcome {
  let board = current.held === null ? current : pipeCancelHeld(current).state;
  const seated = Object.keys(board.placements) as M13SlotId[];

  if (seated.length === 0) {
    return {
      state: current,
      result: {
        ok: false,
        reason: 'not_holding',
        detail: 'The board is already clear.',
      },
    };
  }

  for (const slot of seated) {
    const step = pipeReturnSlot(board, slot);

    if (step.result.ok) {
      board = step.state;
    }
  }

  return {
    state: board,
    result: { ok: true, detail: { pieces_returned: seated.length } },
  };
}

/** Every semantic manipulation (pointer and keyboard call exactly this). */
export function m13sAct(
  s: M13Series,
  action: PipeAction,
  mode: InputMode,
  nowMs: number,
): PipeResult {
  const target = editable(s);

  if (target === null) {
    return { ok: false, reason: 'holding', detail: 'The bench is closed.' };
  }

  tick(s, nowMs);

  const { network, practice } = target;
  const store = practice ? network.practice : network;
  const phase: M13EventPhase = practice ? 'practice' : 'measurement';
  const config = network.def.config;
  const before = store.board;
  let outcome: PipeOutcome;

  switch (action.kind) {
    case 'pick_bench':
      outcome = pipePickUpBench(before, action.piece_id);
      break;
    case 'pick_slot':
      outcome = pipePickUpSlot(before, action.slot);
      break;
    case 'place':
      outcome = pipePlaceHeld(before, action.slot, config);
      break;
    case 'cancel':
      outcome = pipeCancelHeld(before);
      break;
    case 'return_held':
      outcome = pipeReturnHeld(before);
      break;
    case 'return_slot':
      outcome = pipeReturnSlot(before, action.slot);
      break;
    case 'rotate_held':
      outcome = pipeRotateHeld(before);
      break;
    case 'rotate_slot':
      outcome = pipeRotateSlot(before, action.slot);
      break;
    case 'undo':
      outcome = undoOutcome(before, store.history);
      break;
    case 'reset_board':
      outcome = resetOutcome(before);
      break;
    default:
      outcome = {
        state: before,
        result: {
          ok: false,
          reason: 'unknown_slot',
          detail: 'Unknown action.',
        },
      };
  }

  if (!outcome.result.ok) {
    if (action.kind === 'place') {
      s.refused += 1;
      emit(
        s,
        'placement_refused',
        phase,
        { slot: action.slot, reason: outcome.result.reason, input_mode: mode },
        network,
      );
    }

    return outcome.result;
  }

  // Undo stack: every committed change to what is SEATED pushes the prior
  // board (a held piece goes home in the snapshot); picks, cancels and undo
  // itself never do. Bounded depth.
  if (
    action.kind === 'place' ||
    action.kind === 'return_held' ||
    action.kind === 'return_slot' ||
    action.kind === 'rotate_held' ||
    action.kind === 'rotate_slot' ||
    action.kind === 'reset_board'
  ) {
    store.history.push(
      structuredClone(
        before.held === null ? before : pipeCancelHeld(before).state,
      ),
    );

    if (store.history.length > M13N_UNDO_DEPTH) {
      store.history.shift();
    }
  }

  store.board = outcome.state;

  const board = store.board;

  switch (action.kind) {
    case 'pick_bench':
    case 'pick_slot':
      emit(
        s,
        'piece_picked',
        phase,
        {
          piece_id: board.held?.piece_id,
          source: board.held?.source,
          input_mode: mode,
        },
        network,
      );
      store.last_action =
        board.held === null
          ? null
          : `Holding ${getM13Piece(board.held.piece_id).label}.`;
      break;
    case 'place': {
      const detail = outcome.result.detail as {
        source: string;
        relocation: boolean;
      };
      const seated = board.placements[action.slot as M13SlotId];

      if (detail.relocation) {
        s.moves += 1;
      } else {
        s.placements += 1;
      }

      emit(
        s,
        'piece_placed',
        phase,
        {
          piece_id: seated?.piece_id,
          slot: action.slot,
          rotation: seated?.rotation,
          source: detail.source,
          relocation: detail.relocation,
          input_mode: mode,
        },
        network,
      );
      store.last_action =
        seated === undefined
          ? null
          : `Seated ${getM13Piece(seated.piece_id).label} at ${action.slot} · ${seated.rotation}°.`;
      break;
    }
    case 'cancel':
      // Safe restore — no raw act recorded (the piece is where it was).
      store.last_action = null;
      break;
    case 'return_held':
    case 'return_slot':
      s.returns += 1;
      emit(
        s,
        'piece_returned',
        phase,
        { ...(outcome.result.detail ?? {}), input_mode: mode },
        network,
      );
      store.last_action = 'Returned to the bench.';
      break;
    case 'rotate_held':
      s.rotations += 1;
      emit(
        s,
        'piece_rotated',
        phase,
        {
          piece_id: before.held?.piece_id,
          target: 'held',
          rotation: board.held?.rotation,
          input_mode: mode,
        },
        network,
      );
      store.last_action = `Rotated (held) → ${board.held?.rotation}°.`;
      break;
    case 'rotate_slot': {
      const seated = board.placements[action.slot as M13SlotId];

      s.rotations += 1;
      emit(
        s,
        'piece_rotated',
        phase,
        {
          piece_id: seated?.piece_id,
          target: action.slot,
          rotation: seated?.rotation,
          input_mode: mode,
        },
        network,
      );
      store.last_action = `Rotated ${action.slot} → ${seated?.rotation}°.`;
      break;
    }
    case 'undo':
      s.undos += 1;
      emit(
        s,
        'undone',
        phase,
        {
          ...(outcome.result.detail ?? {}),
          history_remaining: store.history.length,
          input_mode: mode,
        },
        network,
      );
      store.last_action = 'Undid the last change.';
      break;
    case 'reset_board':
      s.resets += 1;
      emit(
        s,
        'board_reset',
        phase,
        { ...(outcome.result.detail ?? {}), input_mode: mode },
        network,
      );
      store.last_action = 'Board cleared — every piece is back on the bench.';
      break;
    default:
      break;
  }

  return outcome.result;
}

/* ------------------------------------------------------------------ *
 * The first-response phase: commitment
 * ------------------------------------------------------------------ */

/** A confirming press as the overlay saw it. */
export interface M13Press {
  /** True for a held key's auto-repeat. */
  repeat: boolean;
  /** When this press went down (key down / pointer down). */
  down_at_ms: number;
}

function cancelPending(
  s: M13Series,
  reason: 'keep_working' | 'panel_left',
  mode: InputMode | 'system',
) {
  const pending = s.pending_commit;

  if (pending === null) {
    return;
  }

  s.pending_commit = null;
  emit(
    s,
    'commit_cancelled',
    'measurement',
    {
      kind: pending.kind,
      reason,
      refused_presses: pending.refused_presses,
      input_mode: mode,
    },
    s.networks[s.current],
  );
}

/**
 * RECORD LAYOUT / CANNOT SOLVE pressed: opens the neutral confirmation.
 * An exposure record — never a response.
 */
export function m13sRequestCommit(
  s: M13Series,
  kind: M13ResponseKind,
  mode: InputMode,
  nowMs: number,
): boolean {
  if (
    !live(s) ||
    s.status !== 'first_responses' ||
    s.view !== 'network' ||
    s.pending_commit !== null
  ) {
    return false;
  }

  const network = s.networks[s.current];

  if (network.first_response !== null) {
    return false;
  }

  tick(s, nowMs);

  if (network.board.held !== null) {
    network.board = pipeCancelHeld(network.board).state;
  }

  s.pending_commit = {
    kind,
    opened_at_ms: nowMs,
    refused_presses: 0,
    refusal_reasons: [],
  };
  emit(
    s,
    'commit_requested',
    'measurement',
    {
      kind,
      pieces_seated: Object.keys(network.board.placements).length,
      input_mode: mode,
    },
    network,
  );

  return true;
}

/** KEEP WORKING / ESC: the network stays open without an answer. */
export function m13sCancelCommit(
  s: M13Series,
  mode: InputMode,
  nowMs: number,
): boolean {
  if (s.pending_commit === null) {
    return false;
  }

  tick(s, nowMs);
  cancelPending(s, 'keep_working', mode);

  return true;
}

export type M13ConfirmOutcome = 'recorded' | 'refused' | 'none';

/**
 * RECORD ANSWER / RECORD pressed. Only a FRESH press confirms (register
 * §5.210 precedent): an auto-repeat, a press that began before or as the
 * dialog opened and any press inside the settle window are refused and
 * recorded. The first response is written once; a repeated confirmation
 * finds no open dialog and writes nothing.
 */
export function m13sConfirmCommit(
  s: M13Series,
  press: M13Press,
  mode: InputMode,
  nowMs: number,
): M13ConfirmOutcome {
  const pending = s.pending_commit;

  if (pending === null || !live(s) || s.status !== 'first_responses') {
    return 'none';
  }

  const network = s.networks[s.current];

  if (network.first_response !== null) {
    s.pending_commit = null;

    return 'none';
  }

  const sinceOpened = nowMs - pending.opened_at_ms;
  const refusal = press.repeat
    ? 'held_or_repeated_press'
    : press.down_at_ms <= pending.opened_at_ms
      ? 'press_began_before_dialog'
      : sinceOpened < M13N_SETTLE_MS
        ? 'dialog_settling'
        : null;

  if (refusal !== null) {
    pending.refused_presses += 1;

    // A held key repeats many times a second: each reason is recorded once
    // per dialog, the rest are counted on the next record.
    if (!pending.refusal_reasons.includes(refusal)) {
      pending.refusal_reasons.push(refusal);
      emit(
        s,
        'commit_press_refused',
        'measurement',
        {
          kind: pending.kind,
          reason: refusal,
          since_opened_ms: sinceOpened,
          settle_ms: M13N_SETTLE_MS,
          input_mode: mode,
        },
        network,
      );
    }

    return 'refused';
  }

  tick(s, nowMs);

  if (network.board.held !== null) {
    network.board = pipeCancelHeld(network.board).state;
  }

  const detail = pipeValidate(network.board, network.def.config);
  const layout = pending.kind === 'layout';
  const response: M13FirstResponse = {
    response_kind: pending.kind,
    // CANNOT SOLVE is an incorrect first response whatever stands on the board.
    correct: layout && detail.valid,
    reason: layout ? detail.reason : 'cannot_solve',
    endpoint_connected: detail.endpoint_connected,
    valve_inline: detail.valve_inline,
    open_branch_count: detail.open_branch_count,
    source_seated: detail.source_seated,
    constraints_satisfied: constraintsSatisfied(detail),
    board: structuredClone(network.board.placements),
    path_slots: [...detail.path_slots],
    help_consults_before: network.help_consults,
    active_ms: network.active_ms,
    input_mode: mode,
  };

  network.first_response = response;
  network.last_action = null;
  network.history = [];
  s.pending_commit = null;
  s.view = 'acknowledgement';

  const answered = answeredCount(s);
  const complete = answered === M13N_NETWORKS_PLANNED;

  emit(
    s,
    'first_response',
    'measurement',
    {
      ...response,
      constraints_total: M13N_CONSTRAINTS.length,
      refused_presses_before: pending.refused_presses,
      response_position: answered,
    },
    network,
  );
  emit(
    s,
    'response_acknowledged',
    'measurement',
    {
      line_id: 'answer_recorded',
      next_control: complete ? 'show_results' : 'next_network',
    },
    network,
  );

  if (complete) {
    s.status = 'completed';
    emit(s, 'first_responses_completed', 'closure', {
      ...closureSnapshot(s),
      closure_reason: 'completed',
    });
  }

  return 'recorded';
}

export type M13NextOutcome = 'network_presented' | 'results_shown' | 'none';

/** NEXT NETWORK / SHOW RESULTS — the one control after an acknowledgement. */
export function m13sNext(s: M13Series, nowMs: number): M13NextOutcome {
  if (!live(s) || s.view !== 'acknowledgement') {
    return 'none';
  }

  tick(s, nowMs);

  if (s.status === 'completed') {
    showResults(s, 'show_results');

    return 'results_shown';
  }

  if (s.networks[s.current].first_response === null) {
    return 'none';
  }

  s.current += 1;
  presentCurrent(s);

  return 'network_presented';
}

/* ------------------------------------------------------------------ *
 * Results and optional practice (only after all three first responses)
 * ------------------------------------------------------------------ */

function practiceAvailable(s: M13Series): boolean {
  return live(s) && s.status === 'completed';
}

export function m13sOpenPractice(
  s: M13Series,
  networkId: M13NetworkId,
  nowMs: number,
): boolean {
  if (!practiceAvailable(s) || s.view !== 'results') {
    return false;
  }

  const index = s.networks.findIndex(
    (network) => network.def.network_id === networkId,
  );
  const network = s.networks[index];

  if (network === undefined || network.first_response === null) {
    return false;
  }

  tick(s, nowMs);

  if (!network.practice.opened) {
    // The practice board starts from the board as it stood at the answer.
    network.practice.opened = true;
    network.practice.board = {
      placements: structuredClone(network.first_response.board),
      held: null,
    };
  }

  s.view = 'practice';
  s.practice_index = index;
  emit(
    s,
    'practice_opened',
    'practice',
    {
      first_response_kind: network.first_response.response_kind,
      runs_used: network.practice.runs.length,
      runs_max: M13N_PRACTICE_RUNS_MAX,
    },
    network,
  );

  return true;
}

export interface M13PracticeRunOutcome {
  recorded: boolean;
  run_index: number | null;
  lines: string[];
}

/** TEST FLOW on a practice board. Never touches a first response. */
export function m13sPracticeTest(
  s: M13Series,
  mode: InputMode,
  nowMs: number,
): M13PracticeRunOutcome {
  if (
    !practiceAvailable(s) ||
    s.view !== 'practice' ||
    s.practice_index === null
  ) {
    return { recorded: false, run_index: null, lines: [] };
  }

  const network = s.networks[s.practice_index];
  const practice = network.practice;

  if (practice.runs.length >= M13N_PRACTICE_RUNS_MAX) {
    return { recorded: false, run_index: null, lines: [] };
  }

  tick(s, nowMs);

  if (practice.board.held !== null) {
    practice.board = pipeCancelHeld(practice.board).state;
  }

  const detail = pipeValidate(practice.board, network.def.config);
  const runIndex = practice.runs.length + 1;

  practice.runs.push({ run_index: runIndex, sealed: detail.valid });
  practice.last_detail = detail;
  practice.last_action = null;
  emit(
    s,
    'practice_test_run',
    'practice',
    {
      run_index: runIndex,
      runs_max: M13N_PRACTICE_RUNS_MAX,
      sealed: detail.valid,
      reason: detail.reason,
      endpoint_connected: detail.endpoint_connected,
      valve_inline: detail.valve_inline,
      open_branch_count: detail.open_branch_count,
      constraints_satisfied: constraintsSatisfied(detail),
      constraints_total: M13N_CONSTRAINTS.length,
      board: structuredClone(practice.board.placements),
      line_ids: structuralLineIds(detail),
      first_response_kind: network.first_response?.response_kind ?? null,
      input_mode: mode,
    },
    network,
  );

  return {
    recorded: true,
    run_index: runIndex,
    lines: [...m13StructuralLines(detail), m13PracticeRunLine(runIndex)],
  };
}

export function m13sBackToResults(s: M13Series, nowMs: number): boolean {
  if (!practiceAvailable(s) || s.view !== 'practice') {
    return false;
  }

  tick(s, nowMs);

  const network =
    s.practice_index === null ? null : s.networks[s.practice_index];

  if (network !== null && network.practice.board.held !== null) {
    network.practice.board = pipeCancelHeld(network.practice.board).state;
  }

  showResults(s, 'back_to_results');

  return true;
}

function closePractice(s: M13Series, reason: M13PracticeClosure) {
  s.practice_closed = reason;
  emit(s, 'practice_closed', 'closure', {
    reason,
    practice_runs: practiceRunsUsed(s),
    results_view_reached: s.events.some(
      (event) => event.suffix === 'results_shown',
    ),
  });
  s.view = 'results';
  s.practice_index = null;
}

/** FINISH on the results view: practice ends; the first responses stand. */
export function m13sFinish(s: M13Series, nowMs: number): boolean {
  if (!practiceAvailable(s) || s.view !== 'results') {
    return false;
  }

  tick(s, nowMs);
  closePractice(s, 'finished');

  return true;
}

/* ------------------------------------------------------------------ *
 * Help, stop, review closure, fault
 * ------------------------------------------------------------------ */

/** Rules and controls of the current phase; recorded with its phase. */
export function m13sHelp(
  s: M13Series,
  mode: InputMode,
  nowMs: number,
): string[] {
  if (!live(s)) {
    return [];
  }

  tick(s, nowMs);

  const phase = eventPhase(s);
  const shown =
    s.status === 'first_responses'
      ? s.networks[s.current]
      : s.view === 'practice' && s.practice_index !== null
        ? s.networks[s.practice_index]
        : null;

  if (phase === 'measurement') {
    s.help_consults.measurement += 1;

    // Counted for the open network only while it is still unanswered.
    if (shown !== null && shown.first_response === null) {
      shown.help_consults += 1;
    }
  } else if (phase === 'practice') {
    s.help_consults.practice += 1;
  } else {
    s.help_consults.feedback += 1;
  }

  emit(
    s,
    'help_consulted',
    phase,
    {
      network_id: shown?.def.network_id ?? null,
      network_answered: shown === null ? null : shown.first_response !== null,
      sheet: phase === 'measurement' ? 'first_responses' : 'results_practice',
      input_mode: mode,
    },
    shown,
  );

  return phase === 'measurement'
    ? [...M13N_HELP_FIRST_RESPONSES]
    : [...M13N_HELP_RESULTS];
}

/** STOP TASK confirmed — first-response phase only. */
export function m13sStop(s: M13Series, nowMs: number): boolean {
  if (!live(s) || s.status !== 'first_responses') {
    return false;
  }

  tick(s, nowMs);

  const network = s.networks[s.current];

  if (network.board.held !== null) {
    network.board = pipeCancelHeld(network.board).state;
  }

  if (s.pending_commit !== null) {
    cancelPending(s, 'panel_left', 'system');
  }

  s.status = 'stopped';
  s.view = 'record';
  s.panel_open = false;
  s.last_tick_ms = null;
  emit(s, 'series_stopped', 'closure', {
    ...closureSnapshot(s),
    closure_reason: 'voluntary_stop',
  });

  return true;
}

/**
 * Station-record closure at the Utility Deck review (idempotent). A series
 * still in the first-response phase closes `closed_at_review`; a completed
 * scored phase is NOT reclosed — only an open practice ends. Afterwards
 * the bench records nothing.
 */
export function m13sCloseAtReview(s: M13Series, nowMs: number) {
  if (s.record_closed) {
    return;
  }

  tick(s, nowMs);

  if (s.status === 'first_responses') {
    if (s.pending_commit !== null) {
      cancelPending(s, 'panel_left', 'system');
    }

    s.status = 'closed_at_review';
    s.view = 'record';
    emit(s, 'series_closed_at_review', 'closure', {
      ...closureSnapshot(s),
      closure_reason: 'closed_at_review',
      input_mode: 'system',
    });
  } else if (s.status === 'completed' && s.practice_closed === null) {
    closePractice(s, 'review');
  }

  s.record_closed = true;
  s.panel_open = false;
  s.last_tick_ms = null;
}

/**
 * A bench fault. In the first-response phase it closes the series as a
 * technical failure; after the scored phase is complete it ends practice
 * only and never changes the first-response result.
 */
export function m13sFail(s: M13Series, nowMs: number, detail: string) {
  if (s.record_closed) {
    return;
  }

  if (s.status === 'unopened' || s.status === 'first_responses') {
    tick(s, nowMs);
    s.pending_commit = null;
    s.status = 'technical_failure';
    s.view = 'record';
    s.failure_detail = detail;
    s.panel_open = false;
    s.last_tick_ms = null;
    emit(s, 'technical_failure', 'measurement', {
      detail,
      networks_answered: answeredCount(s),
    });

    return;
  }

  if (s.status === 'completed' && s.practice_closed === null) {
    tick(s, nowMs);
    s.failure_detail = detail;
    emit(s, 'technical_failure', eventPhase(s), {
      detail,
      networks_answered: answeredCount(s),
    });
    closePractice(s, 'technical_failure');
  }
}

/* ------------------------------------------------------------------ *
 * Read models
 * ------------------------------------------------------------------ */

export interface M13ResultBlock {
  network_id: M13NetworkId;
  network_index: number;
  label: string;
  lines: string[];
}

/** The results view's content — null until all three answers are recorded. */
export function m13sResults(s: M13Series): M13ResultBlock[] | null {
  if (s.status !== 'completed') {
    return null;
  }

  return s.networks.map((network) => {
    const response = network.first_response!;
    const index = network.def.network_index;

    if (response.response_kind === 'cannot_solve') {
      return {
        network_id: network.def.network_id,
        network_index: index,
        label: `${m13RecordedAnswerLabel(index)} ${M13N_TEXT.cannot_solve_answer}`,
        lines: [],
      };
    }

    return {
      network_id: network.def.network_id,
      network_index: index,
      label: m13RecordedAnswerLabel(index),
      lines: [
        ...m13StructuralLines({
          valid: response.correct,
          reason: response.reason as PipeValidationDetail['reason'],
          path_slots: response.path_slots,
          endpoint_connected: response.endpoint_connected,
          valve_inline: response.valve_inline,
          open_branch_count: response.open_branch_count,
          source_seated: response.source_seated,
        }),
        response.correct ? M13N_TEXT.run_sealed : M13N_TEXT.run_not_sealed,
      ],
    };
  });
}

export interface M13PractiseControl {
  network_id: M13NetworkId;
  network_index: number;
  runs_left: number;
  label: string;
}

export interface M13SeriesView {
  form: FormId;
  status: M13SeriesStatus;
  view: M13SeriesViewKind;
  phase: M13EventPhase;
  header: string;
  /** The network whose board is on screen (network / acknowledgement / practice). */
  network: M13NetworkDef | null;
  placements: Partial<Record<M13SlotId, M13Placement>>;
  held: PipeHeld | null;
  bench: string[];
  editable: boolean;
  undo_available: boolean;
  seated_count: number;
  last_action: string | null;
  /** Lines of the bench console for this view. */
  console_lines: string[];
  /** Top instruction of the view. */
  instruction: string;
  hint: string;
  pending_commit: {
    kind: M13ResponseKind;
    question: string;
    confirm_label: string;
    cancel_label: string;
  } | null;
  controls: {
    record_layout: boolean;
    cannot_solve: boolean;
    next: 'next_network' | 'show_results' | null;
    stop: boolean;
    help: boolean;
    test_flow: boolean;
    back_to_results: boolean;
    finish: boolean;
    practise: M13PractiseControl[];
  };
  results: M13ResultBlock[] | null;
  record_lines: string[];
  answered: { network_id: M13NetworkId; answered: boolean }[];
  practice_runs: { network_id: M13NetworkId; runs_used: number }[];
  practice_closed: M13PracticeClosure | null;
}

function recordLines(s: M13Series): string[] {
  const answers = s.networks.map((network) =>
    m13RecordStatusLine(
      network.def.network_index,
      network.first_response !== null,
    ),
  );

  if (s.status === 'held_back') {
    return [M13N_TEXT.held_back];
  }

  if (s.status === 'unopened') {
    return [M13N_TEXT.review_closed];
  }

  const head =
    s.status === 'technical_failure'
      ? M13N_TEXT.fault
      : s.status === 'stopped'
        ? M13N_TEXT.stopped
        : M13N_TEXT.review_closed;

  return s.record_closed && s.status !== 'closed_at_review'
    ? [head, M13N_TEXT.review_closed, ...answers]
    : [head, ...answers];
}

/** Everything the overlay needs to draw the current state. */
export function m13sView(s: M13Series): M13SeriesView {
  const isLive = live(s);
  const phase1 = s.status === 'first_responses';
  const complete = s.status === 'completed';
  const view: M13SeriesViewKind = phase1 || complete ? s.view : 'record';
  const shown =
    view === 'network' || view === 'acknowledgement'
      ? s.networks[Math.min(s.current, s.networks.length - 1)]
      : view === 'practice' && s.practice_index !== null
        ? s.networks[s.practice_index]
        : null;
  const practiceView = view === 'practice' && shown !== null;
  const board =
    shown === null
      ? createPipeBoardState()
      : practiceView
        ? shown.practice.board
        : shown.board;
  const history =
    shown === null ? [] : practiceView ? shown.practice.history : shown.history;
  const canEdit = editable(s) !== null;
  const base = {
    form: s.form,
    status: s.status,
    view,
    phase: eventPhase(s),
    network: shown === null ? null : structuredClone(shown.def),
    placements: structuredClone(board.placements),
    held: board.held === null ? null : { ...board.held },
    bench: pipeBenchPieces(board).map((piece) => piece.piece_id),
    editable: canEdit,
    undo_available: canEdit && history.length > 0,
    seated_count: Object.keys(board.placements).length,
    answered: s.networks.map((network) => ({
      network_id: network.def.network_id,
      answered: network.first_response !== null,
    })),
    practice_runs: s.networks.map((network) => ({
      network_id: network.def.network_id,
      runs_used: network.practice.runs.length,
    })),
    practice_closed: s.practice_closed,
    results: null,
    record_lines: [],
    pending_commit: null,
  };
  const none = {
    record_layout: false,
    cannot_solve: false,
    next: null,
    stop: false,
    help: false,
    test_flow: false,
    back_to_results: false,
    finish: false,
    practise: [],
  } satisfies M13SeriesView['controls'];

  if (view === 'network' && shown !== null) {
    const index = shown.def.network_index;
    const pending = s.pending_commit;

    return {
      ...base,
      header: m13NetworkHeader(index),
      last_action: shown.last_action,
      console_lines: [M13N_TEXT.status_line],
      instruction: M13N_TEXT.rules,
      hint: M13N_TEXT.hint_network,
      pending_commit:
        pending === null
          ? null
          : {
              kind: pending.kind,
              question:
                pending.kind === 'layout'
                  ? m13LayoutQuestion(index)
                  : m13CannotSolveQuestion(index),
              confirm_label:
                pending.kind === 'layout'
                  ? M13N_TEXT.record_answer
                  : M13N_TEXT.record_cannot,
              cancel_label: M13N_TEXT.keep_working,
            },
      controls: {
        ...none,
        record_layout: isLive,
        cannot_solve: isLive,
        stop: isLive,
        help: isLive,
      },
    };
  }

  if (view === 'acknowledgement' && shown !== null) {
    return {
      ...base,
      header: m13NetworkHeader(shown.def.network_index),
      last_action: null,
      // The same line for a sealed layout, an unsealed layout and CANNOT SOLVE.
      console_lines: [m13AcknowledgementLine(shown.def.network_index)],
      instruction: M13N_TEXT.rules,
      hint: M13N_TEXT.hint_acknowledgement,
      controls: {
        ...none,
        next: !isLive ? null : complete ? 'show_results' : 'next_network',
        stop: isLive && phase1,
        help: isLive,
      },
    };
  }

  if (view === 'practice' && shown !== null) {
    const practice = shown.practice;
    const used = practice.runs.length;
    const lines =
      practice.last_detail === null
        ? [M13N_TEXT.practice_ready]
        : [
            ...m13StructuralLines(practice.last_detail),
            m13PracticeRunLine(used),
          ];

    return {
      ...base,
      header: m13PracticeHeader(shown.def.network_index),
      last_action: practice.last_action,
      console_lines:
        used >= M13N_PRACTICE_RUNS_MAX
          ? [...lines, M13N_TEXT.practice_used]
          : lines,
      instruction: M13N_TEXT.practice_notice,
      hint: M13N_TEXT.hint_practice,
      controls: {
        ...none,
        help: isLive,
        test_flow: isLive && used < M13N_PRACTICE_RUNS_MAX,
        back_to_results: isLive,
      },
    };
  }

  if (view === 'results' && complete) {
    const open = isLive;

    return {
      ...base,
      header: M13N_TEXT.results_header,
      last_action: null,
      console_lines: [],
      instruction: M13N_TEXT.results_heading,
      hint: open ? M13N_TEXT.hint_results : M13N_TEXT.hint_record,
      results: m13sResults(s),
      record_lines: [
        ...(s.record_closed ? [M13N_TEXT.review_closed] : []),
        ...(s.practice_closed === 'finished' ? [M13N_TEXT.finished] : []),
        ...(s.practice_closed === 'technical_failure' ? [M13N_TEXT.fault] : []),
        ...(open ? [M13N_TEXT.practice_notice] : []),
      ],
      controls: {
        ...none,
        help: open,
        finish: open,
        practise: open
          ? s.networks.map((network) => {
              const left =
                M13N_PRACTICE_RUNS_MAX - network.practice.runs.length;

              return {
                network_id: network.def.network_id,
                network_index: network.def.network_index,
                runs_left: left,
                label: m13PractiseLabel(network.def.network_index, left),
              };
            })
          : [],
      },
    };
  }

  return {
    ...base,
    view: 'record',
    header: M13N_TEXT.record_header,
    last_action: null,
    console_lines: [],
    instruction: '',
    hint: M13N_TEXT.hint_record,
    record_lines: recordLines(s),
    controls: none,
  };
}

/** The per-network record (probe, tests): first responses and practice. */
export function m13sRecord(s: M13Series) {
  return s.networks.map((network) => ({
    ...networkFields(network),
    presented: network.presented,
    first_response:
      network.first_response === null
        ? null
        : structuredClone(network.first_response),
    practice: {
      opened: network.practice.opened,
      runs_used: network.practice.runs.length,
      sealed_in_practice: network.practice.runs.some((run) => run.sealed),
    },
  }));
}

/** Recorded acts that count as work at the station (first responses + practice runs). */
export function m13sSubmissionCount(s: M13Series): number {
  return (
    answeredCount(s) +
    s.networks.reduce((sum, network) => sum + network.practice.runs.length, 0)
  );
}
