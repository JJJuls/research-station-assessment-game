/**
 * M02 — Functional traceability: the case-workspace model (Station 080
 * M01–M26 run, Unit 13). PURE (no Phaser, no runtime import): the window
 * adapter (`m02CaseWorkspace.ts`) owns the register window, reads the
 * inventory store and injects the log sink; the overlay calls the adapter
 * with its input mode.
 *
 * Approved design (register M02 row, "Revise and extend"): the
 * participant-created layout is kept; ALL SIX cases are requested once in
 * a balanced order; every request advances on its FIRST answer or on an
 * explicit "Cannot locate"; corrective feedback is deferred to the end.
 *
 * Mechanic: the participant arranges six case bundles over an intake tray
 * and four trays with optional self-chosen labels, then hands the
 * workspace over. The handover FREEZES the layout. Six requests follow,
 * one at a time: the overlay confirms a selected case or "Cannot locate"
 * before calling this model's answer method (right or wrong — the
 * request advances either way). An empty slot answers nothing. A press
 * inside the settle window after a request appeared is refused — a
 * carried press is never an answer. Nothing about correctness is shown
 * before the sixth answer. While a request is open the participant's
 * layout and own tray labels stay visible and the system-supplied case
 * codes and contents do not (owner ruling, 28 September): the surface
 * shows every filed case closed.
 *
 * Measure (register `m02_correct_first_retrievals`): requests whose first
 * committed answer is the requested case / 6; Cannot locate = incorrect;
 * an unanswered request is missing; a request whose case the frozen
 * layout does not hold is technically inaccessible and excluded.
 * Companions: the focused time per request and the layout at the
 * handover. No layout is compared with a designer's arrangement. Nothing
 * here is a score.
 */
import { FocusedClock, type PauseCause } from '../../measurement/focusedClock';
import {
  registerFocusedClock,
  releaseFocusedClock,
} from '../../measurement/focusMonitor';

export const M02_OPPORTUNITY_ID = 'proto_m02_retrieval_series';
export const M02_WINDOW_IDS = {
  filing: 'm02_filing_w1',
  requests: 'm02_requests_w1',
} as const;
// U13-C: the overlay now requires an explicit confirmation before an
// answer is committed. Earlier sessions remain a distinct administration.
export const M02_ENTRY_STATE_VERSION = 'm02-retrieval-series-v2';
export const M02_FAMILY = 'proto_m02_workspace_';
export const M02_REQUEST_COUNT = 6;
/**
 * Settle window after a request is presented (review U4–U12 precedent): a
 * press arriving within it is a carried or double-tapped press from the
 * previous answer or the handover, never an answer to THIS request.
 */
export const M02_SETTLE_MS = 400;

export const M02_INTAKE_ID = 'm02c_desk';
export const M02_TRAY_IDS = [
  'm02c_tray_1',
  'm02c_tray_2',
  'm02c_tray_3',
  'm02c_tray_4',
] as const;

export type M02Form = 'form_a' | 'form_b';
export type M02OrderId =
  | 'order_1'
  | 'order_2'
  | 'order_3'
  | 'order_4'
  | 'order_5'
  | 'order_6';
export type M02Kind = 'sample' | 'repair' | 'supply' | 'incident';
export type M02InputMode = 'pointer' | 'keyboard' | 'system';
export type M02Phase = 'unopened' | 'organise' | 'retrieve' | 'closed';
export type M02LogSink = (
  suffix: string,
  metadata: Record<string, unknown>,
) => void;

export interface M02Case {
  definitionId: string;
  code: string;
  kind: M02Kind;
  label: string;
}

/** Six heterogeneous cases (one set; the form varies the intake order). */
export const M02_CASES: readonly M02Case[] = [
  {
    definitionId: 'm02c_case_s14',
    code: 'S-14',
    kind: 'sample',
    label: 'Sample case S-14',
  },
  {
    definitionId: 'm02c_case_r07',
    code: 'R-07',
    kind: 'repair',
    label: 'Repair ticket R-07',
  },
  {
    definitionId: 'm02c_case_k03',
    code: 'K-03',
    kind: 'supply',
    label: 'Supply note K-03',
  },
  {
    definitionId: 'm02c_case_i22',
    code: 'I-22',
    kind: 'incident',
    label: 'Incident sheet I-22',
  },
  {
    definitionId: 'm02c_case_s15',
    code: 'S-15',
    kind: 'sample',
    label: 'Sample case S-15',
  },
  {
    definitionId: 'm02c_case_r09',
    code: 'R-09',
    kind: 'repair',
    label: 'Repair ticket R-09',
  },
];

/** Tray labels the participant may choose (or none). */
export const M02_LABELS = [
  'SAMPLES',
  'REPAIRS',
  'SUPPLY',
  'INCIDENTS',
  'PENDING',
  'MIXED',
] as const;

export type M02Label = (typeof M02_LABELS)[number] | null;

const LABEL_KIND: Partial<Record<Exclude<M02Label, null>, M02Kind>> = {
  SAMPLES: 'sample',
  REPAIRS: 'repair',
  SUPPLY: 'supply',
  INCIDENTS: 'incident',
};

/**
 * Balanced request orders: a 6 × 6 Williams square over the case indices.
 * Every case is requested exactly once per order; across the six orders
 * every case stands at every position exactly once and every ordered pair
 * of cases is adjacent exactly once (first-order carry-over balanced).
 * The assignment by session is a deterministic hash, not an enforced
 * equal split.
 */
export const M02_REQUEST_ORDERS: Record<M02OrderId, readonly number[]> = {
  order_1: [0, 1, 5, 2, 4, 3],
  order_2: [1, 2, 0, 3, 5, 4],
  order_3: [2, 3, 1, 4, 0, 5],
  order_4: [3, 4, 2, 5, 1, 0],
  order_5: [4, 5, 3, 0, 2, 1],
  order_6: [5, 0, 4, 1, 3, 2],
};

export const M02_ORDER_IDS = Object.keys(M02_REQUEST_ORDERS) as M02OrderId[];

export function m02Case(definitionId: string): M02Case | undefined {
  return M02_CASES.find((c) => c.definitionId === definitionId);
}

/** The six case ids in the order's request sequence. */
export function m02RequestSequence(order: M02OrderId): string[] {
  return M02_REQUEST_ORDERS[order].map(
    (index) => M02_CASES[index].definitionId,
  );
}

/** The intake tray's seed order for the form. */
export function m02IntakeOrder(form: M02Form): string[] {
  const ids = M02_CASES.map((c) => c.definitionId);

  return form === 'form_a' ? ids : [...ids].reverse();
}

// ——— layout ———————————————————————————————————————————————————————————

export interface M02Placement {
  container_id: string;
  slot_index: number;
}

export type M02Placements = Record<string, M02Placement>;

export interface M02CaseLocation {
  code: string;
  kind: M02Kind;
  container: string | null;
  slot_index: number | null;
  label: M02Label;
}

export interface M02LayoutSummary {
  case_location_at_close: Record<string, M02CaseLocation>;
  tray_labels: Record<string, M02Label>;
  untraceable_case_count: number;
  misfile_count: number;
  duplicate_count: number;
  cases_left_on_intake: number;
}

/**
 * Raw description of a layout against the participant's OWN labels (never
 * a designer key): untraceable = a case in a tray that carries no label;
 * misfile = a case in a tray whose chosen label names a different kind;
 * duplicate = a label used on more than one tray. State description,
 * never a score.
 */
export function m02LayoutSummary(
  placements: M02Placements,
  labels: Record<string, M02Label>,
): M02LayoutSummary {
  const perCase: Record<string, M02CaseLocation> = {};
  let untraceable = 0;
  let misfiled = 0;
  let onIntake = 0;

  for (const c of M02_CASES) {
    const placement = placements[c.definitionId] ?? null;
    const container = placement?.container_id ?? null;
    const label =
      container !== null && container in labels ? labels[container] : null;

    perCase[c.definitionId] = {
      code: c.code,
      kind: c.kind,
      container,
      slot_index: placement?.slot_index ?? null,
      label,
    };

    if (container === M02_INTAKE_ID) {
      onIntake += 1;
    } else if (container !== null) {
      if (label === null) {
        untraceable += 1;
      } else if (
        LABEL_KIND[label] !== undefined &&
        LABEL_KIND[label] !== c.kind
      ) {
        misfiled += 1;
      }
    }
  }

  const used = Object.values(labels).filter(
    (l): l is Exclude<M02Label, null> => l !== null,
  );

  return {
    case_location_at_close: perCase,
    tray_labels: { ...labels },
    untraceable_case_count: untraceable,
    misfile_count: misfiled,
    duplicate_count: used.length - new Set(used).size,
    cases_left_on_intake: onIntake,
  };
}

// ——— state ————————————————————————————————————————————————————————————

export type M02AnswerKind = 'pick' | 'cannot_locate';

export interface M02Answer {
  kind: M02AnswerKind;
  picked_case: string | null;
  picked_container: string | null;
  picked_slot_index: number | null;
  correct: boolean;
  focused_ms: number;
  wall_ms: number;
  excluded_ms: Record<PauseCause, number>;
  excluded_total_ms: number;
  at_ms: number;
  input_mode: M02InputMode;
}

export interface M02Request {
  /** Position in the series (0-based). */
  index: number;
  case_id: string;
  case_code: string;
  presented_at_ms: number | null;
  /** The last presentation (a reopen presents the same request again). */
  last_presented_at_ms: number | null;
  presentations: number;
  /** Null until presented; false = the frozen layout does not hold the case. */
  accessible: boolean | null;
  empty_selections: number;
  refused_presses: number;
  layout_change_attempts: number;
  answer: M02Answer | null;
  /**
   * Time spent on a request that was presented and left unanswered when
   * the workspace was frozen (censored; never the latency of an answer).
   */
  open_focused_ms: number | null;
  open_wall_ms: number | null;
}

export interface M02State {
  form: M02Form;
  order: M02OrderId;
  phase: M02Phase;
  labels: Record<string, M02Label>;
  moveCount: number;
  labelChanges: number;
  handedOverAtMs: number | null;
  /** The layout frozen at the handover (null before it). */
  layout: M02LayoutSummary | null;
  requests: M02Request[];
  /** Index of the request now presented (requests.length once all are done). */
  current: number;
  clock: FocusedClock | null;
  surfaceOpen: boolean;
  surfaceClosures: number;
  feedbackShown: boolean;
  feedbackReviews: number;
  closureReason: string | null;
}

export function createM02State(form: M02Form, order: M02OrderId): M02State {
  return {
    form,
    order,
    phase: 'unopened',
    labels: Object.fromEntries(M02_TRAY_IDS.map((id) => [id, null])),
    moveCount: 0,
    labelChanges: 0,
    handedOverAtMs: null,
    layout: null,
    requests: m02RequestSequence(order).map((caseId, index) => ({
      index,
      case_id: caseId,
      case_code: m02Case(caseId)!.code,
      presented_at_ms: null,
      last_presented_at_ms: null,
      presentations: 0,
      accessible: null,
      empty_selections: 0,
      refused_presses: 0,
      layout_change_attempts: 0,
      answer: null,
      open_focused_ms: null,
      open_wall_ms: null,
    })),
    current: 0,
    clock: null,
    surfaceOpen: false,
    surfaceClosures: 0,
    feedbackShown: false,
    feedbackReviews: 0,
    closureReason: null,
  };
}

// ——— derived readers ————————————————————————————————————————————————

/** The request now presented (null outside the series). */
export function m02CurrentRequest(s: M02State): M02Request | null {
  return s.phase === 'retrieve' ? (s.requests[s.current] ?? null) : null;
}

export function m02Answered(s: M02State): M02Request[] {
  return s.requests.filter((request) => request.answer !== null);
}

/** Requests whose first answer is the requested case (the primary's numerator). */
export function m02CorrectFirstRetrievals(s: M02State): number {
  return s.requests.filter((request) => request.answer?.correct === true)
    .length;
}

export function m02SeriesComplete(s: M02State): boolean {
  return (
    s.handedOverAtMs !== null &&
    s.requests.every(
      (request) => request.answer !== null || request.accessible === false,
    )
  );
}

/**
 * Reload guard (register §5.14): true when an earlier page load of this
 * identity already opened the workspace.
 */
export function m02PriorAdministration(
  priorLoadEvents: readonly { event_type: string }[],
): boolean {
  return priorLoadEvents.some(
    (event) => event.event_type === `${M02_FAMILY}opportunity_opened`,
  );
}

export function m02EntrySnapshot(form: M02Form, order: M02OrderId) {
  return {
    form,
    request_order: order,
    assigned_order: m02RequestSequence(order),
    intake_order: m02IntakeOrder(form),
    cases: M02_CASES.length,
    trays: M02_TRAY_IDS.length,
    labels_available: [...M02_LABELS],
    requests_planned: M02_REQUEST_COUNT,
    advance_on_first_answer: true,
    answer_commit: 'explicit_confirmation',
    cannot_locate_available: true,
    feedback: 'deferred_to_end',
    layout_frozen_at_handover: true,
    // Owner ruling (28 September): the participant's layout and labels
    // stay visible; system-supplied case codes and contents do not.
    contents_during_requests: 'concealed',
    participant_labels_during_requests: 'visible',
    settle_ms: M02_SETTLE_MS,
    time_limit: null,
    payment_fixed: true,
    route_fixed: true,
  };
}

// ——— organise ————————————————————————————————————————————————————————

/** The workspace was opened for the first time (intake seeded by the adapter). */
export function m02Begin(s: M02State): boolean {
  if (s.phase !== 'unopened') {
    return false;
  }

  s.phase = 'organise';
  s.surfaceOpen = true;

  return true;
}

/** A case changed container during the organise phase. */
export function m02NoteMove(
  s: M02State,
  caseId: string,
  from: string | null,
  to: string,
  inputMode: M02InputMode,
  log: M02LogSink,
): boolean {
  const c = m02Case(caseId);

  if (s.phase !== 'organise' || c === undefined) {
    return false;
  }

  s.moveCount += 1;
  log('case_moved', {
    case_id: c.definitionId,
    case_code: c.code,
    from_container: from,
    to_container: to,
    move_number: s.moveCount,
    workspace_phase: 'organise',
    phase: 'measurement',
    input_mode: inputMode,
  });

  return true;
}

export function m02NextLabel(current: M02Label): M02Label {
  if (current === null) {
    return M02_LABELS[0];
  }

  const index = M02_LABELS.indexOf(current);

  return index >= M02_LABELS.length - 1 ? null : M02_LABELS[index + 1];
}

/** Set a tray label (null clears). Refused once the layout is frozen. */
export function m02SetLabel(
  s: M02State,
  trayId: string,
  label: M02Label,
  inputMode: M02InputMode,
  log: M02LogSink,
): boolean {
  if (s.phase !== 'organise' || !(trayId in s.labels)) {
    return false;
  }

  const previous = s.labels[trayId];

  s.labels[trayId] = label;
  s.labelChanges += 1;
  log('tray_labelled', {
    tray_id: trayId,
    label,
    previous,
    label_change_number: s.labelChanges,
    workspace_phase: 'organise',
    phase: 'measurement',
    input_mode: inputMode,
  });

  return true;
}

// ——— the series ——————————————————————————————————————————————————————

function stopClock(s: M02State, nowMs: number) {
  if (s.clock !== null) {
    s.clock.stop(nowMs);
    releaseFocusedClock(s.clock);
    s.clock = null;
  }
}

/**
 * Presents the current request, skipping (and recording) every request
 * whose case the frozen layout does not hold. Returns false when the
 * series has no request left.
 */
function presentCurrent(s: M02State, nowMs: number, log: M02LogSink): boolean {
  while (s.current < s.requests.length) {
    const request = s.requests[s.current];
    const location = s.layout?.case_location_at_close[request.case_id] ?? null;

    if (location === null || location.container === null) {
      // Engine-invariant breach: the case is in no workspace container.
      // Technically inaccessible — excluded, never an incorrect answer.
      request.accessible = false;
      log('request_inaccessible', {
        request_index: request.index,
        trial_id: `m02_request_${request.index + 1}`,
        requested_case: request.case_id,
        accessible: false,
        reason: 'case_not_in_any_workspace_container',
        phase: 'measurement',
        input_mode: 'system',
      });
      s.current += 1;
      continue;
    }

    const clock = new FocusedClock();

    clock.start(nowMs, s.surfaceOpen ? [] : ['surface_closed']);
    registerFocusedClock(clock);
    s.clock = clock;
    request.accessible = true;
    request.presented_at_ms = nowMs;
    request.last_presented_at_ms = nowMs;
    request.presentations = 1;
    log('request_presented', {
      request_index: request.index,
      trial_id: `m02_request_${request.index + 1}`,
      requested_case: request.case_id,
      requested_code: request.case_code,
      presented: true,
      accessible: true,
      presentation_number: 1,
      contents_concealed: true,
      phase: 'measurement',
      input_mode: 'system',
    });

    return true;
  }

  return false;
}

export type M02HandOverResult = 'handed_over' | 'series_complete' | 'invalid';

/**
 * HAND OVER: freezes the layout the adapter read from the store and
 * presents the first request.
 */
export function m02HandOver(
  s: M02State,
  placements: M02Placements,
  nowMs: number,
  inputMode: M02InputMode,
  log: M02LogSink,
): M02HandOverResult {
  if (s.phase !== 'organise') {
    return 'invalid';
  }

  s.layout = m02LayoutSummary(placements, s.labels);
  s.handedOverAtMs = nowMs;
  s.phase = 'retrieve';
  log('handed_over', {
    ...s.layout,
    move_count: s.moveCount,
    label_changes: s.labelChanges,
    layout_frozen: true,
    workspace_phase: 'organise',
    phase: 'measurement',
    input_mode: inputMode,
  });

  return presentCurrent(s, nowMs, log) ? 'handed_over' : 'series_complete';
}

export type M02AnswerResult =
  | 'recorded'
  | 'series_complete'
  | 'refused'
  | 'invalid';

function settling(
  s: M02State,
  request: M02Request,
  control: string,
  nowMs: number,
  inputMode: M02InputMode,
  log: M02LogSink,
): boolean {
  const since =
    request.last_presented_at_ms === null
      ? null
      : nowMs - request.last_presented_at_ms;

  if (since === null || since >= M02_SETTLE_MS) {
    return false;
  }

  request.refused_presses += 1;
  log('press_refused', {
    control,
    reason: 'request_settling',
    request_index: request.index,
    trial_id: `m02_request_${request.index + 1}`,
    since_presented_ms: since,
    settle_ms: M02_SETTLE_MS,
    phase: 'measurement',
    input_mode: inputMode,
  });

  return true;
}

function commitAnswer(
  s: M02State,
  request: M02Request,
  answer: Pick<
    M02Answer,
    'kind' | 'picked_case' | 'picked_container' | 'picked_slot_index'
  >,
  nowMs: number,
  inputMode: M02InputMode,
  log: M02LogSink,
): M02AnswerResult {
  const clock = s.clock;

  if (clock === null) {
    return 'invalid';
  }

  clock.stop(nowMs);

  const snap = clock.snapshot(nowMs);

  releaseFocusedClock(clock);
  s.clock = null;

  const correct =
    answer.kind === 'pick' && answer.picked_case === request.case_id;
  const location = s.layout?.case_location_at_close[request.case_id] ?? null;

  request.answer = {
    ...answer,
    correct,
    focused_ms: snap.focused_ms,
    wall_ms: snap.wall_ms,
    excluded_ms: snap.excluded_ms,
    excluded_total_ms: snap.excluded_total_ms,
    at_ms: nowMs,
    input_mode: inputMode,
  };
  log('request_answered', {
    request_index: request.index,
    trial_id: `m02_request_${request.index + 1}`,
    requested_case: request.case_id,
    answer_kind: answer.kind,
    picked_case: answer.picked_case,
    picked_container: answer.picked_container,
    picked_slot_index: answer.picked_slot_index,
    correct,
    first_answer: true,
    requested_container: location?.container ?? null,
    requested_tray_label: location?.label ?? null,
    focused_ms: snap.focused_ms,
    wall_ms: snap.wall_ms,
    excluded_ms: snap.excluded_ms,
    excluded_total_ms: snap.excluded_total_ms,
    presentations: request.presentations,
    empty_selections: request.empty_selections,
    refused_presses: request.refused_presses,
    feedback_shown: false,
    phase: 'measurement',
    input_mode: inputMode,
  });
  s.current += 1;

  return presentCurrent(s, nowMs, log) ? 'recorded' : 'series_complete';
}

/**
 * The participant selected a slot that holds a case: the FIRST answer to
 * the current request, right or wrong. The request advances either way.
 */
export function m02AnswerPick(
  s: M02State,
  pickedCaseId: string,
  containerId: string,
  slotIndex: number,
  nowMs: number,
  inputMode: M02InputMode,
  log: M02LogSink,
): M02AnswerResult {
  const request = m02CurrentRequest(s);

  if (
    request === null ||
    !s.surfaceOpen ||
    m02Case(pickedCaseId) === undefined
  ) {
    return 'invalid';
  }

  if (settling(s, request, 'select_slot', nowMs, inputMode, log)) {
    return 'refused';
  }

  return commitAnswer(
    s,
    request,
    {
      kind: 'pick',
      picked_case: pickedCaseId,
      picked_container: containerId,
      picked_slot_index: slotIndex,
    },
    nowMs,
    inputMode,
    log,
  );
}

/** "Cannot locate": an explicit answer without a selection — incorrect. */
export function m02CannotLocate(
  s: M02State,
  nowMs: number,
  inputMode: M02InputMode,
  log: M02LogSink,
): M02AnswerResult {
  const request = m02CurrentRequest(s);

  if (request === null || !s.surfaceOpen) {
    return 'invalid';
  }

  if (settling(s, request, 'cannot_locate', nowMs, inputMode, log)) {
    return 'refused';
  }

  return commitAnswer(
    s,
    request,
    {
      kind: 'cannot_locate',
      picked_case: null,
      picked_container: null,
      picked_slot_index: null,
    },
    nowMs,
    inputMode,
    log,
  );
}

/**
 * A drag was begun during the requests: the layout is frozen, nothing
 * moves and nothing is answered — recorded so the time it took is
 * explained.
 */
export function m02LayoutChangeRefused(
  s: M02State,
  containerId: string,
  slotIndex: number,
  inputMode: M02InputMode,
  log: M02LogSink,
): boolean {
  const request = m02CurrentRequest(s);

  if (request === null || !s.surfaceOpen) {
    return false;
  }

  request.layout_change_attempts += 1;
  log('layout_change_refused', {
    request_index: request.index,
    trial_id: `m02_request_${request.index + 1}`,
    container_id: containerId,
    slot_index: slotIndex,
    reason: 'layout_frozen_at_handover',
    phase: 'measurement',
    input_mode: inputMode,
  });

  return true;
}

/** An empty slot was selected: recorded, never an answer. */
export function m02EmptySelection(
  s: M02State,
  containerId: string,
  slotIndex: number,
  inputMode: M02InputMode,
  log: M02LogSink,
): boolean {
  const request = m02CurrentRequest(s);

  if (request === null || !s.surfaceOpen) {
    return false;
  }

  request.empty_selections += 1;
  log('empty_slot_selected', {
    request_index: request.index,
    trial_id: `m02_request_${request.index + 1}`,
    container_id: containerId,
    slot_index: slotIndex,
    phase: 'measurement',
    input_mode: inputMode,
  });

  return true;
}

// ——— surface ————————————————————————————————————————————————————————

/** The workspace was closed without finishing: the open request's clock pauses. */
export function m02SurfaceClosed(
  s: M02State,
  nowMs: number,
  layoutNow: M02LayoutSummary,
  log: M02LogSink,
): boolean {
  if ((s.phase !== 'organise' && s.phase !== 'retrieve') || !s.surfaceOpen) {
    return false;
  }

  s.surfaceOpen = false;
  s.surfaceClosures += 1;
  s.clock?.pause('surface_closed', nowMs);
  log('surface_closed', {
    workspace_phase: s.phase,
    handed_over: s.handedOverAtMs !== null,
    request_index: m02CurrentRequest(s)?.index ?? null,
    requests_answered: m02Answered(s).length,
    ...(s.phase === 'organise' ? layoutNow : {}),
    input_mode: 'system',
  });

  return true;
}

/** The workspace was reopened: the same request is presented again. */
export function m02SurfaceReopened(
  s: M02State,
  nowMs: number,
  log: M02LogSink,
): boolean {
  if ((s.phase !== 'organise' && s.phase !== 'retrieve') || s.surfaceOpen) {
    return false;
  }

  s.surfaceOpen = true;
  s.clock?.resume('surface_closed', nowMs);
  log('surface_reopened', {
    workspace_phase: s.phase,
    request_index: m02CurrentRequest(s)?.index ?? null,
    requests_answered: m02Answered(s).length,
    input_mode: 'system',
  });

  const request = m02CurrentRequest(s);

  if (request !== null) {
    request.last_presented_at_ms = nowMs;
    request.presentations += 1;
    log('request_presented', {
      request_index: request.index,
      trial_id: `m02_request_${request.index + 1}`,
      requested_case: request.case_id,
      requested_code: request.case_code,
      presented: true,
      accessible: true,
      presentation_number: request.presentations,
      contents_concealed: true,
      phase: 'measurement',
      input_mode: 'system',
    });
  }

  return true;
}

// ——— deferred feedback ———————————————————————————————————————————————

export interface M02FeedbackLine {
  request_index: number;
  requested_case: string;
  requested_code: string;
  answer_kind: M02AnswerKind | 'not_answered' | 'not_available';
  picked_code: string | null;
  correct: boolean | null;
  requested_container: string | null;
  requested_tray_label: M02Label;
}

/** The request record shown once the series has ended (never before). */
export function m02Feedback(s: M02State): M02FeedbackLine[] {
  return s.requests.map((request) => {
    const location = s.layout?.case_location_at_close[request.case_id] ?? null;

    return {
      request_index: request.index,
      requested_case: request.case_id,
      requested_code: request.case_code,
      answer_kind:
        request.answer?.kind ??
        (request.accessible === false ? 'not_available' : 'not_answered'),
      picked_code:
        request.answer?.picked_case == null
          ? null
          : (m02Case(request.answer.picked_case)?.code ?? null),
      correct: request.answer?.correct ?? null,
      requested_container: location?.container ?? null,
      requested_tray_label: location?.label ?? null,
    };
  });
}

/**
 * Where a container is, in the participant's words. Kept short (the tray
 * number, never its label) so a record line fits its column in any
 * monospace font.
 */
export function m02ContainerName(containerId: string | null): string {
  if (containerId === null) {
    return 'not in the workspace';
  }

  if (containerId === M02_INTAKE_ID) {
    return 'the intake';
  }

  const tray = (M02_TRAY_IDS as readonly string[]).indexOf(containerId);

  return tray < 0 ? containerId : `tray ${tray + 1}`;
}

/** One participant-facing line of the request record (factual, no praise). */
export function m02FeedbackText(line: M02FeedbackLine): string {
  const head = `${line.request_index + 1}. ${line.requested_code}`;
  const where = m02ContainerName(line.requested_container);

  switch (line.answer_kind) {
    case 'pick':
      return line.correct === true
        ? `${head}: selected ${line.picked_code} — matched`
        : `${head}: selected ${line.picked_code} — it was in ${where}`;
    case 'cannot_locate':
      return `${head}: cannot locate — it was in ${where}`;
    case 'not_available':
      return `${head}: not available`;
    default:
      return `${head}: not answered`;
  }
}

/**
 * The series ended (the sixth answer): the workspace closes and the
 * request record is shown — the only corrective feedback of the item.
 */
export function m02Finish(
  s: M02State,
  nowMs: number,
  log: M02LogSink,
): boolean {
  if (s.phase !== 'retrieve' || !m02SeriesComplete(s)) {
    return false;
  }

  stopClock(s, nowMs);
  s.phase = 'closed';
  s.closureReason = 'completed';
  s.feedbackShown = true;
  log('feedback_shown', {
    requests_answered: m02Answered(s).length,
    record: m02Feedback(s),
    phase: 'feedback',
    input_mode: 'system',
  });

  return true;
}

/** The closed workspace was opened again: the record is shown again. */
export function m02NoteFeedbackReview(s: M02State, log: M02LogSink): boolean {
  if (s.phase !== 'closed' || !s.feedbackShown) {
    return false;
  }

  s.feedbackReviews += 1;
  log('feedback_reviewed', {
    review_number: s.feedbackReviews,
    phase: 'feedback',
    input_mode: 'system',
  });

  return true;
}

/**
 * Freezes the workspace without a completed series (the review, the reload
 * guard, a technical failure). Unanswered requests stay unanswered.
 */
export function m02Freeze(s: M02State, nowMs: number, closureReason: string) {
  const open = m02CurrentRequest(s);

  if (open !== null && s.clock !== null) {
    s.clock.stop(nowMs);

    const snap = s.clock.snapshot(nowMs);

    open.open_focused_ms = snap.focused_ms;
    open.open_wall_ms = snap.wall_ms;
  }

  stopClock(s, nowMs);
  s.phase = 'closed';
  s.surfaceOpen = false;
  s.closureReason = closureReason;
}

// ——— raw components ——————————————————————————————————————————————————

/**
 * The window's item-owned raw components. `layoutNow` is the layout as it
 * stands when the workspace closes before a handover (null after one —
 * the frozen layout is the record).
 */
export function m02RawComponents(
  s: M02State,
  closureReason: string,
  layoutNow: M02LayoutSummary | null = null,
) {
  const answered = m02Answered(s);
  const open = s.requests.find(
    (request) =>
      request.presented_at_ms !== null &&
      request.answer === null &&
      request.accessible === true,
  );

  return {
    form: s.form,
    request_order: s.order,
    assigned_order: m02RequestSequence(s.order),
    realised_order: s.requests
      .filter((request) => request.presented_at_ms !== null)
      .map((request) => request.case_id),
    handed_over: s.handedOverAtMs !== null,
    requests_planned: M02_REQUEST_COUNT,
    requests_presented: s.requests.filter(
      (request) => request.presented_at_ms !== null,
    ).length,
    requests_answered: answered.length,
    requests_inaccessible: s.requests.filter(
      (request) => request.accessible === false,
    ).length,
    request_open_at_closure: open?.index ?? null,
    correct_first_retrievals: m02CorrectFirstRetrievals(s),
    cannot_locate_count: answered.filter(
      (request) => request.answer!.kind === 'cannot_locate',
    ).length,
    wrong_selection_count: answered.filter(
      (request) => request.answer!.kind === 'pick' && !request.answer!.correct,
    ).length,
    empty_selections: s.requests.reduce(
      (sum, request) => sum + request.empty_selections,
      0,
    ),
    refused_presses: s.requests.reduce(
      (sum, request) => sum + request.refused_presses,
      0,
    ),
    surface_closures: s.surfaceClosures,
    feedback_shown: s.feedbackShown,
    move_count: s.moveCount,
    label_changes: s.labelChanges,
    layout_at_handover: s.layout,
    layout_at_closure: s.layout === null ? layoutNow : null,
    requests: s.requests.map((request) => ({
      request_index: request.index,
      requested_case: request.case_id,
      presented: request.presented_at_ms !== null,
      accessible: request.accessible,
      presentations: request.presentations,
      empty_selections: request.empty_selections,
      refused_presses: request.refused_presses,
      layout_change_attempts: request.layout_change_attempts,
      answer_kind: request.answer?.kind ?? null,
      picked_case: request.answer?.picked_case ?? null,
      picked_container: request.answer?.picked_container ?? null,
      correct: request.answer?.correct ?? null,
      focused_ms: request.answer?.focused_ms ?? null,
      wall_ms: request.answer?.wall_ms ?? null,
      excluded_ms: request.answer?.excluded_ms ?? null,
      excluded_total_ms: request.answer?.excluded_total_ms ?? null,
      input_mode: request.answer?.input_mode ?? null,
      open_focused_ms: request.open_focused_ms,
      open_wall_ms: request.open_wall_ms,
    })),
    closure_reason: closureReason,
  };
}

export type M02RawComponents = ReturnType<typeof m02RawComponents>;
