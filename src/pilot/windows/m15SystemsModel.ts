/**
 * M15 — the series model of the two relay boxes (Station 080 M01–M26
 * run, Unit 18; administration `m15-systems-v1`). PURE (no Phaser, no
 * runtime import): the window adapter (`m15RelayBench.ts`) owns the
 * register window and injects the log sink and the clock; the surface
 * model (`m15SurfaceModel.ts`) only renders this state and calls the
 * adapter with its input mode.
 *
 * Under research-owner decision D-U18-1 (10 October 2026): the
 * orientation card, then box 1 and box 2 in fixed order; in each box
 * exploration by single-dial TESTs (unlimited, deterministic; the
 * listing computed here from the content's links), ONE confirmed and
 * immutable wiring — one of the four offered options or CANNOT TELL —
 * which closes the tests, then question 1 and question 2 one at a time,
 * each taking ONE immutable first response — a confirmed option or a
 * confirmed CANNOT SOLVE (incorrect) — answered only by the identical
 * neutral acknowledgement; no correctness information of any kind before
 * the fourth first response; then the results for both boxes, read-only.
 * Leaving keeps everything; there is no STOP control; the review closure
 * keeps the answers as they stand.
 *
 * Only a FRESH confirming press commits (M02 §5.210 / M13 §5.262 / M14
 * precedent): a press inside the settle window is refused and recorded;
 * and EVERY view transition settles (the M14 closeout ruling §5.290 (b)
 * generalised): a press inside 400 ms of a view appearing tests, drafts,
 * requests, navigates, opens or closes nothing. A held key never reaches
 * this model (the surface drops repeats).
 *
 * Nothing here scores: the first responses are raw events, and the
 * feature is recounted read-only by `features/m15.ts`. The step
 * simulator below follows the taught semantics of preview §2; its
 * analysis conventions (preview §7.2: same-step changes add up, an answer
 * is the sign of the total; a unit receiving opposite changes or moving at
 * two steps is "magnitude-dependent") are never needed for a key and
 * serve only `consistent_with_recorded_wiring` and the pure tests.
 */
import {
  M15_ANSWER_LETTERS,
  M15_ASSIGNED_BOX_ORDER,
  M15_BOX_WINDOW_IDS,
  M15_BOXES,
  M15_BOXES_PLANNED,
  M15_FAMILY,
  M15_PREDICTIONS_PLANNED,
  M15_SETTLE_MS,
  M15_TEXT,
  type M15AnswerLetter,
  type M15Box,
  m15Box,
  type M15BoxId,
  type M15Direction,
  type M15Link,
  type M15Question,
  type M15Situation,
  m15UnitLetter,
} from './m15SystemsContent';

export type M15InputMode = 'pointer' | 'keyboard' | 'system';
export type M15Phase =
  | 'orientation'
  | 'exploration'
  | 'model'
  | 'measurement'
  | 'feedback'
  | 'closure';
export type M15ResponseKind = 'option' | 'cannot_solve';
export type M15WiringKind = 'option' | 'cannot_tell';
export type M15CommitTarget = 'wiring' | 'question';
export type M15CommitKind = 'option' | 'cannot';
export type M15NextControl =
  | 'first_question'
  | 'next_question'
  | 'next_box'
  | 'show_results';
export type M15LogSink = (
  suffix: string,
  metadata: Record<string, unknown>,
) => void;

export type M15Status =
  | 'unopened'
  | 'orientation'
  | 'first_responses'
  | 'completed'
  | 'closed_at_review'
  | 'held_back'
  | 'technical_failure';

export type M15View =
  | 'orientation'
  | 'wiring'
  | 'wiring_acknowledgement'
  | 'question'
  | 'acknowledgement'
  | 'results'
  | 'record';

/** Every suffix the family may log (contract §9; names fixed). */
export const M15_EVENT_SUFFIXES = [
  'presented',
  'opportunity_opened',
  'orientation_acknowledged',
  'series_reopened',
  'panel_left',
  'prior_load_checked',
  'box_presented',
  'test_run',
  'wiring_drafted',
  'wiring_recorded',
  'question_presented',
  'option_drafted',
  'commit_requested',
  'commit_cancelled',
  'commit_press_refused',
  'commit_without_draft',
  'first_response',
  'response_acknowledged',
  'box_completed',
  'first_responses_completed',
  'results_shown',
  'help_consulted',
  'series_closed_at_review',
  'technical_failure',
  'window_closed',
] as const;

export const M15_RELOAD_DETAIL =
  'reload after administration: bench not re-run';
export const M15_ACK_LINE_ID = 'answer_recorded';
export const M15_WIRING_ACK_LINE_ID = 'wiring_recorded';
export const M15_CANNOT_TELL = 'cannot_tell';

/* ------------------------------------------------------------------ *
 * The step simulator (preview §2 semantics; §7.2 analysis conventions)
 * ------------------------------------------------------------------ */

export interface M15StepMove {
  unit_id: string;
  direction: 'up' | 'down';
}

export interface M15Step {
  step: number;
  moves: M15StepMove[];
}

export interface M15Simulation {
  steps: M15Step[];
  /** The net change of every unit (the sign is the unit's answer). */
  totals: Record<string, number>;
  /** A unit received opposite changes at one step, or moved at two steps. */
  magnitude_dependent: boolean;
}

const MAX_STEPS = 12;

/**
 * Runs one situation on one wiring: the turned dials and the boosted
 * units carry a change of +1 at step 0; whatever carries a change passes
 * it on one step later to each unit it drives (raises: same sign; lowers:
 * opposite sign); a locked unit never moves and passes nothing on. Steps
 * list the units that moved and their direction, in the box's unit
 * order. A boosted unit's own notch counts toward its total.
 */
export function m15Simulate(
  box: M15Box,
  links: readonly M15Link[],
  situation: M15Situation,
): M15Simulation {
  const locked = new Set(situation.locked_unit_ids);
  const totals: Record<string, number> = Object.fromEntries(
    box.units.map((unit) => [unit.id, 0]),
  );
  const movedAt = new Map<string, number>();
  let wave = new Map<string, number>();
  let magnitudeDependent = false;

  for (const id of [
    ...situation.dials_turned_ids,
    ...situation.boosted_unit_ids,
  ]) {
    if (!locked.has(id)) {
      wave.set(id, (wave.get(id) ?? 0) + 1);
    }
  }

  for (const id of situation.boosted_unit_ids) {
    if (!locked.has(id) && id in totals) {
      totals[id] += 1;
      movedAt.set(id, 1);
    }
  }

  const steps: M15Step[] = [];

  for (let step = 1; step <= MAX_STEPS && wave.size > 0; step += 1) {
    const next = new Map<string, number>();
    const signs = new Map<string, Set<number>>();

    for (const [from, amount] of wave) {
      if (amount === 0 || locked.has(from)) {
        continue;
      }

      for (const entry of links) {
        if (entry.from !== from || locked.has(entry.to)) {
          continue;
        }

        const change = (entry.kind === 'raises' ? 1 : -1) * amount;

        next.set(entry.to, (next.get(entry.to) ?? 0) + change);

        const seen = signs.get(entry.to) ?? new Set<number>();

        seen.add(Math.sign(change));
        signs.set(entry.to, seen);
      }
    }

    for (const seen of signs.values()) {
      if (seen.size > 1) {
        magnitudeDependent = true;
      }
    }

    const moves: M15StepMove[] = [];

    for (const unit of box.units) {
      const change = next.get(unit.id) ?? 0;

      if (change !== 0) {
        moves.push({ unit_id: unit.id, direction: change > 0 ? 'up' : 'down' });
        totals[unit.id] = (totals[unit.id] ?? 0) + change;
        movedAt.set(unit.id, (movedAt.get(unit.id) ?? 0) + 1);
      }
    }

    if (moves.length > 0) {
      steps.push({ step, moves });
    }

    wave = new Map([...next].filter(([, change]) => change !== 0));
  }

  for (const count of movedAt.values()) {
    if (count > 1) {
      magnitudeDependent = true;
    }
  }

  return { steps, totals, magnitude_dependent: magnitudeDependent };
}

/** The participant listing of a run: `step 1: P up · step 2: Q down, W up`. */
export function m15ListingText(box: M15Box, steps: readonly M15Step[]): string {
  return steps
    .map(
      (entry) =>
        `step ${entry.step}: ` +
        entry.moves
          .map(
            (move) => `${m15UnitLetter(box, move.unit_id)} ${move.direction}`,
          )
          .join(', '),
    )
    .join(' · ');
}

/** The situation of a TEST: that one dial up one notch from rest. */
export function m15TestSituation(dialId: string): M15Situation {
  return {
    locked_unit_ids: [],
    boosted_unit_ids: [],
    dials_turned_ids: [dialId],
  };
}

/** The listing a TEST of this dial shows for the box's station wiring. */
export function m15TestListing(box: M15Box, dialId: string): string {
  return m15ListingText(
    box,
    m15Simulate(box, box.links, m15TestSituation(dialId)).steps,
  );
}

export function m15DirectionOf(total: number): M15Direction {
  return total > 0 ? 'up' : total < 0 ? 'down' : 'none';
}

/**
 * The answer a wiring implies for a question — the option letter whose
 * direction is the sign of the asked unit's total — or null when the
 * answer is magnitude-dependent under the analysis conventions.
 */
export function m15AnswerUnder(
  box: M15Box,
  links: readonly M15Link[],
  question: M15Question,
): M15AnswerLetter | null {
  const run = m15Simulate(box, links, question.situation);

  if (run.magnitude_dependent) {
    return null;
  }

  const direction = m15DirectionOf(run.totals[question.asked_unit_id] ?? 0);

  return (
    M15_ANSWER_LETTERS.find(
      (letter) =>
        (letter === 'a' && direction === 'up') ||
        (letter === 'b' && direction === 'down') ||
        (letter === 'c' && direction === 'none'),
    ) ?? null
  );
}

/* ------------------------------------------------------------------ *
 * State
 * ------------------------------------------------------------------ */

export interface M15WiringRecord {
  response_kind: M15WiringKind;
  option_id: string | null;
  correct: boolean;
  key_option_id: string;
  /** Runs per dial before the wiring was recorded. */
  tests_before: Record<string, number>;
  dials_tested_before: string[];
  drafts_before: number;
  help_consults_before: number;
  active_ms: number;
  input_mode: M15InputMode;
  refused_presses: number;
}

export interface M15FirstResponse {
  response_kind: M15ResponseKind;
  option_id: string | null;
  correct: boolean;
  key_option_id: string;
  /** The box's recorded wiring option id, or `cannot_tell`. */
  recorded_wiring_option_id: string;
  consistent_with_recorded_wiring: boolean | null;
  tests_before: Record<string, number>;
  drafts_before: number;
  help_consults_before: number;
  active_ms: number;
  focused_ms: number | null;
  input_mode: M15InputMode;
  refused_presses: number;
}

export interface M15QuestionState {
  id: string;
  index: number;
  global_index: number;
  presented: boolean;
  draft: string | null;
  drafts: number;
  help_consults: number;
  active_ms: number;
  first_response: M15FirstResponse | null;
}

export interface M15DialState {
  id: string;
  runs: number;
  /** The latest listing shown (identical on every run). */
  listing: string | null;
}

export interface M15BoxState {
  id: M15BoxId;
  index: number;
  presented: boolean;
  dials: M15DialState[];
  /** The wiring step's draft (an option id), drafts, help and time. */
  wiring_draft: string | null;
  wiring_drafts: number;
  wiring_help_consults: number;
  wiring_active_ms: number;
  wiring: M15WiringRecord | null;
  questions: M15QuestionState[];
  results_shown: boolean;
}

export interface M15PendingCommit {
  target: M15CommitTarget;
  kind: M15CommitKind;
  option_id: string | null;
  opened_at_ms: number;
  refused_presses: number;
  refusal_recorded: boolean;
}

export interface M15Series {
  status: M15Status;
  view: M15View;
  open_count: number;
  panel_open: boolean;
  orientation_acknowledged: boolean;
  /** Index of the current box (0–1) and question (0–1). */
  box: number;
  question: number;
  boxes: M15BoxState[];
  pending_commit: M15PendingCommit | null;
  acknowledgement: {
    opened_at_ms: number;
    next_control: M15NextControl;
  } | null;
  help_open: boolean;
  help_consults: Record<M15Phase, number>;
  /** The box shown in the results view (0–1). */
  results_box: number;
  closure_reason: 'completed' | 'closed_at_review' | 'technical_failure' | null;
  failure_detail: string | null;
  last_tick_ms: number | null;
  /**
   * When the current view appeared (the settle of EVERY transition — the
   * M14 closeout ruling §5.290 (b) generalised): a press inside
   * `M15_SETTLE_MS` of it changes nothing.
   */
  view_shown_at_ms: number | null;
}

export function createM15Series(): M15Series {
  return {
    status: 'unopened',
    view: 'orientation',
    open_count: 0,
    panel_open: false,
    orientation_acknowledged: false,
    box: 0,
    question: 0,
    boxes: M15_BOXES.map((box) => ({
      id: box.id,
      index: box.index,
      presented: false,
      dials: box.dials.map((dial) => ({ id: dial.id, runs: 0, listing: null })),
      wiring_draft: null,
      wiring_drafts: 0,
      wiring_help_consults: 0,
      wiring_active_ms: 0,
      wiring: null,
      questions: box.questions.map((entry) => ({
        id: entry.id,
        index: entry.index,
        global_index: entry.global_index,
        presented: false,
        draft: null,
        drafts: 0,
        help_consults: 0,
        active_ms: 0,
        first_response: null,
      })),
      results_shown: false,
    })),
    pending_commit: null,
    acknowledgement: null,
    help_open: false,
    help_consults: {
      orientation: 0,
      exploration: 0,
      model: 0,
      measurement: 0,
      feedback: 0,
      closure: 0,
    },
    results_box: 0,
    closure_reason: null,
    failure_detail: null,
    last_tick_ms: null,
    view_shown_at_ms: null,
  };
}

/* ------------------------------------------------------------------ *
 * Reload guard and entry snapshot
 * ------------------------------------------------------------------ */

/** True when an earlier page load of this identity already opened the bench. */
export function m15PriorAdministration(
  priorLoadEvents: readonly { event_type: string }[],
): boolean {
  return priorLoadEvents.some(
    (event) => event.event_type === `${M15_FAMILY}opportunity_opened`,
  );
}

/** The losslessness evidence the runtime keeps beside the raw events. */
export interface M15HistoryIntegrity {
  first_sequence: number | null;
  sequence_gap_count: number;
  sequence_duplicate_count: number;
  /** The store's meta record was unreadable; the history came from chunks. */
  recovered_from_chunks: boolean;
}

/** The reload check written once per page load after a reload. */
export interface M15PriorLoadCheck {
  page_load_index: number;
  prior_page_load_event_count: number;
  prior_opening_found: boolean;
  prior_briefing_found: boolean;
  history_continuous: boolean;
  prior_opening_absence_established: boolean;
}

/**
 * The reload check of a later page load (decision D-U18-1 item 6; the
 * M14 closeout ruling §5.290 (a) applied to M15): the absence of an
 * earlier opening is ESTABLISHED only when the recovered history is
 * continuous — at least one earlier record, sequence numbers running
 * from 1 without a gap or a duplicate, and the store's own meta record
 * readable — and holds no `opportunity_opened` of this family. A missing
 * or broken history never establishes absence; a found opening is the
 * hold-back. An earlier briefing is reported, never read as an opening.
 */
export function m15PriorLoadCheck(
  pageLoadIndex: number,
  priorLoadEvents: readonly { event_type: string }[],
  integrity: M15HistoryIntegrity,
): M15PriorLoadCheck {
  const found = m15PriorAdministration(priorLoadEvents);
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
      (event) => event.event_type === `${M15_FAMILY}presented`,
    ),
    history_continuous: continuous,
    prior_opening_absence_established: !found && continuous,
  };
}

/** The entry-state snapshot written with `opportunity_opened` (contract §9). */
export function m15EntrySnapshot(stage: string | null) {
  return {
    boxes_planned: M15_BOXES_PLANNED,
    predictions_planned: M15_PREDICTIONS_PLANNED,
    assigned_box_order: [...M15_ASSIGNED_BOX_ORDER],
    boxes: M15_BOXES.map((box) => ({
      box_id: box.id,
      box_window_id: M15_BOX_WINDOW_IDS[box.id],
      content_version: box.content_version,
      dial_ids: box.dials.map((dial) => dial.id),
      unit_ids: box.units.map((unit) => unit.id),
      wiring_option_ids: box.wiring_options.map((option) => option.id),
      wiring_key_option_id: box.wiring_key_option_id,
      question_ids: box.questions.map((entry) => entry.id),
      questions: box.questions.map((entry) => ({
        question_id: entry.id,
        option_ids: entry.options.map((option) => option.id),
        key_option_id: entry.key_option_id,
      })),
    })),
    exploration: 'single_dial_tests_close_at_wiring',
    model_commit: 'required_before_questions',
    cannot_solve_available: true,
    cannot_tell_available: true,
    feedback: 'after_all_first_predictions',
    stop_control: false,
    settle_ms: M15_SETTLE_MS,
    stage,
  };
}

/* ------------------------------------------------------------------ *
 * Selectors
 * ------------------------------------------------------------------ */

export function m15Live(s: M15Series): boolean {
  return (
    s.status === 'orientation' ||
    s.status === 'first_responses' ||
    s.status === 'completed'
  );
}

/** The step of the current box: exploration and wiring, or the questions. */
export function m15InWiringStep(s: M15Series): boolean {
  return (
    s.status === 'first_responses' &&
    (s.view === 'wiring' || s.view === 'wiring_acknowledgement')
  );
}

export function m15Phase(s: M15Series): M15Phase {
  switch (s.status) {
    case 'orientation':
      return 'orientation';
    case 'first_responses':
      if (s.view === 'wiring') {
        return m15CurrentBoxState(s).wiring === null ? 'exploration' : 'model';
      }

      return s.view === 'wiring_acknowledgement' ? 'model' : 'measurement';
    case 'completed':
      return 'feedback';
    default:
      return 'closure';
  }
}

export function m15CurrentBox(s: M15Series): M15Box {
  return m15Box(M15_ASSIGNED_BOX_ORDER[s.box]);
}

export function m15CurrentBoxState(s: M15Series): M15BoxState {
  return s.boxes[s.box];
}

export function m15CurrentQuestion(s: M15Series): M15Question {
  return m15CurrentBox(s).questions[s.question];
}

export function m15CurrentQuestionState(s: M15Series): M15QuestionState {
  return s.boxes[s.box].questions[s.question];
}

export function m15AnsweredCount(s: M15Series): number {
  return s.boxes.reduce(
    (count, box) =>
      count +
      box.questions.filter((entry) => entry.first_response !== null).length,
    0,
  );
}

/** The record line of a closed bench (null while the bench is live). */
export function m15RecordLine(s: M15Series): string | null {
  switch (s.status) {
    case 'closed_at_review':
      return M15_TEXT.closed_at_review;
    case 'held_back':
      return M15_TEXT.held_back;
    case 'technical_failure':
      return M15_TEXT.fault;
    default:
      return null;
  }
}

/** The recorded wiring's text for the box view (or CANNOT TELL). */
export function m15RecordedWiringText(
  box: M15Box,
  state: M15BoxState,
): string | null {
  if (state.wiring === null) {
    return null;
  }

  if (state.wiring.response_kind === 'cannot_tell') {
    return M15_TEXT.cannot_tell_recorded;
  }

  return (
    box.wiring_options.find((option) => option.id === state.wiring?.option_id)
      ?.text ?? null
  );
}

/** The per-box and per-question record written on every closure event. */
export function m15ClosureSnapshot(s: M15Series) {
  const questions = s.boxes.flatMap((box) =>
    box.questions.map((entry) => ({
      question_id: entry.id,
      box_id: box.id,
      presented: entry.presented,
      answered: entry.first_response !== null,
      response_kind: entry.first_response?.response_kind ?? null,
      option_id: entry.first_response?.option_id ?? null,
      correct: entry.first_response?.correct ?? null,
    })),
  );
  const byBox = Object.fromEntries(
    s.boxes.map((box) => [
      box.id,
      {
        presented: box.presented,
        wiring_recorded: box.wiring !== null,
        wiring_option_id:
          box.wiring === null
            ? null
            : box.wiring.response_kind === 'cannot_tell'
              ? M15_CANNOT_TELL
              : box.wiring.option_id,
        wiring_correct: box.wiring?.correct ?? null,
        test_runs: box.dials.reduce((count, dial) => count + dial.runs, 0),
        answered: box.questions.filter((entry) => entry.first_response).length,
        correct: box.questions.filter(
          (entry) => entry.first_response?.correct === true,
        ).length,
      },
    ]),
  );

  return {
    boxes_planned: M15_BOXES_PLANNED,
    predictions_planned: M15_PREDICTIONS_PLANNED,
    boxes_presented: s.boxes.filter((box) => box.presented).length,
    models_recorded: s.boxes.filter((box) => box.wiring !== null).length,
    models_correct: s.boxes.filter((box) => box.wiring?.correct === true)
      .length,
    questions_presented: questions.filter((entry) => entry.presented).length,
    predictions_answered: questions.filter((entry) => entry.answered).length,
    correct_first_predictions: questions.filter(
      (entry) => entry.correct === true,
    ).length,
    cannot_solve_count: questions.filter(
      (entry) => entry.response_kind === 'cannot_solve',
    ).length,
    cannot_tell_count: s.boxes.filter(
      (box) => box.wiring?.response_kind === 'cannot_tell',
    ).length,
    by_box: byBox,
    questions,
  };
}

/* ------------------------------------------------------------------ *
 * Internals
 * ------------------------------------------------------------------ */

function fields(
  s: M15Series,
  scope: 'series' | 'box' | 'question',
  phase: M15Phase = m15Phase(s),
): Record<string, unknown> {
  const base: Record<string, unknown> = { phase };

  if (scope === 'series') {
    return base;
  }

  const box = m15CurrentBox(s);

  Object.assign(base, {
    box_id: box.id,
    box_index: box.index,
    box_window_id: M15_BOX_WINDOW_IDS[box.id],
    content_version: box.content_version,
  });

  if (scope === 'question') {
    const entry = m15CurrentQuestion(s);

    Object.assign(base, {
      question_id: entry.id,
      question_index: entry.index,
      question_global_index: entry.global_index,
    });
  }

  return base;
}

/** The scope of the current view (series on the orientation, else box or question). */
function currentScope(s: M15Series): 'series' | 'box' | 'question' {
  if (s.status === 'orientation' || s.status === 'unopened') {
    return 'series';
  }

  if (s.status === 'first_responses') {
    return m15InWiringStep(s) ? 'box' : 'question';
  }

  return 'series';
}

/** Active time: accrues to the current step while its view is open. */
function tick(s: M15Series, nowMs: number) {
  if (s.last_tick_ms !== null && s.panel_open) {
    const elapsed = Math.max(0, nowMs - s.last_tick_ms);

    if (s.status === 'first_responses') {
      if (s.view === 'wiring') {
        m15CurrentBoxState(s).wiring_active_ms += elapsed;
      } else if (s.view === 'question') {
        m15CurrentQuestionState(s).active_ms += elapsed;
      }
    }
  }

  s.last_tick_ms = nowMs;
}

/** A press inside the settle window of the current view changes nothing. */
function settling(s: M15Series, nowMs: number): boolean {
  return (
    s.view_shown_at_ms !== null && nowMs - s.view_shown_at_ms < M15_SETTLE_MS
  );
}

function showView(s: M15Series, view: M15View, nowMs: number) {
  s.view = view;
  s.view_shown_at_ms = nowMs;
}

function testsBefore(state: M15BoxState): Record<string, number> {
  return Object.fromEntries(state.dials.map((dial) => [dial.id, dial.runs]));
}

function presentBox(s: M15Series, nowMs: number, sink: M15LogSink) {
  const box = m15CurrentBox(s);
  const state = m15CurrentBoxState(s);

  state.presented = true;
  showView(s, 'wiring', nowMs);
  sink('box_presented', {
    ...fields(s, 'box', 'exploration'),
    assigned_position: box.index,
    realised_position: s.boxes.filter((candidate) => candidate.presented)
      .length,
    dials_available: box.dials.map((dial) => dial.id),
    wiring_option_ids: box.wiring_options.map((option) => option.id),
    question_ids: box.questions.map((entry) => entry.id),
    input_mode: 'system',
  });
}

function presentQuestion(s: M15Series, nowMs: number, sink: M15LogSink) {
  const entry = m15CurrentQuestion(s);
  const state = m15CurrentQuestionState(s);

  state.presented = true;
  showView(s, 'question', nowMs);
  sink('question_presented', {
    ...fields(s, 'question', 'measurement'),
    assigned_position: entry.global_index,
    realised_position: s.boxes.reduce(
      (count, box) =>
        count + box.questions.filter((candidate) => candidate.presented).length,
      0,
    ),
    option_ids: entry.options.map((option) => option.id),
    input_mode: 'system',
  });
}

function cancelPending(
  s: M15Series,
  reason: 'keep_working' | 'panel_left',
  mode: M15InputMode,
  sink: M15LogSink,
) {
  const pending = s.pending_commit;

  if (pending === null) {
    return;
  }

  s.pending_commit = null;
  sink('commit_cancelled', {
    ...fields(s, currentScope(s)),
    target: pending.target,
    kind: pending.kind,
    option_id: pending.option_id,
    reason,
    refused_presses: pending.refused_presses,
    input_mode: mode,
  });
}

/* ------------------------------------------------------------------ *
 * Opening, leaving, orientation
 * ------------------------------------------------------------------ */

export type M15OpenOutcome = 'opened' | 'reopened' | 'record';

/**
 * The bench surface opened. The FIRST opening starts the orientation (the
 * adapter has already written the kit's `opportunity_opened`); a later
 * opening resumes the view as it stood (and settles it again); a closed
 * bench shows its record.
 */
export function m15sOpen(
  s: M15Series,
  nowMs: number,
  sink: M15LogSink,
): M15OpenOutcome {
  s.open_count += 1;
  s.panel_open = true;
  s.last_tick_ms = nowMs;
  s.view_shown_at_ms = nowMs;

  if (s.status === 'unopened') {
    s.status = 'orientation';
    s.view = 'orientation';

    return 'opened';
  }

  if (!m15Live(s)) {
    s.view = 'record';

    return 'record';
  }

  if (s.status === 'completed') {
    s.view = s.boxes.some((box) => box.results_shown)
      ? 'results'
      : 'acknowledgement';
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

  return 'reopened';
}

/** The bench surface closed (ESC, LEAVE BENCH, FINISH, the room). */
export function m15sLeave(s: M15Series, nowMs: number, sink: M15LogSink) {
  if (!s.panel_open) {
    return;
  }

  tick(s, nowMs);

  if (s.pending_commit !== null) {
    cancelPending(s, 'panel_left', 'system', sink);
  }

  s.help_open = false;
  s.panel_open = false;

  if (m15Live(s)) {
    sink('panel_left', {
      ...fields(s, currentScope(s)),
      view: s.view,
      input_mode: 'system',
    });
  }
}

/** START BOX 1: the orientation acknowledged; box 1 presented. */
export function m15sStart(
  s: M15Series,
  mode: M15InputMode,
  nowMs: number,
  sink: M15LogSink,
): boolean {
  if (s.status !== 'orientation' || s.help_open || settling(s, nowMs)) {
    return false;
  }

  tick(s, nowMs);
  s.orientation_acknowledged = true;
  sink('orientation_acknowledged', {
    ...fields(s, 'series'),
    input_mode: mode,
  });
  s.status = 'first_responses';
  s.box = 0;
  s.question = 0;
  presentBox(s, nowMs, sink);
  s.last_tick_ms = nowMs;

  return true;
}

/* ------------------------------------------------------------------ *
 * Exploration (single-dial tests; never a response)
 * ------------------------------------------------------------------ */

export type M15TestOutcome = 'run' | 'closed' | 'none';

/**
 * TEST a dial: the listing of the station wiring for that one dial up one
 * notch from rest — computed by the simulator, identical on every run;
 * recorded as an exploration record. Refused once the box's wiring is
 * recorded (`closed`, nothing recorded) and inside a settle window.
 */
export function m15sTest(
  s: M15Series,
  dialId: string,
  mode: M15InputMode,
  nowMs: number,
  sink: M15LogSink,
): M15TestOutcome {
  if (s.status !== 'first_responses') {
    return 'none';
  }

  const box = m15CurrentBox(s);
  const state = m15CurrentBoxState(s);
  const dial = state.dials.find((candidate) => candidate.id === dialId);

  if (dial === undefined) {
    return 'none';
  }

  // Once the box's wiring is recorded the tests are closed in every view
  // of that box: nothing is recorded.
  if (state.wiring !== null) {
    return 'closed';
  }

  if (
    s.view !== 'wiring' ||
    s.pending_commit !== null ||
    s.help_open ||
    settling(s, nowMs)
  ) {
    return 'none';
  }

  tick(s, nowMs);

  const run = m15Simulate(box, box.links, m15TestSituation(dialId));
  const listing = m15ListingText(box, run.steps);

  dial.runs += 1;
  dial.listing = listing;
  sink('test_run', {
    ...fields(s, 'box', 'exploration'),
    dial_id: dialId,
    run_index: dial.runs,
    listing,
    steps: run.steps.map((step) => ({
      step: step.step,
      moves: step.moves.map((move) => ({ ...move })),
    })),
    input_mode: mode,
  });

  return 'run';
}

/* ------------------------------------------------------------------ *
 * Drafts (never a response)
 * ------------------------------------------------------------------ */

/**
 * Makes a wiring option or an answer option the draft of the current
 * step, replaces the draft, or clears it (activated again).
 */
export function m15sDraft(
  s: M15Series,
  optionId: string,
  mode: M15InputMode,
  nowMs: number,
  sink: M15LogSink,
): boolean {
  if (
    s.status !== 'first_responses' ||
    s.pending_commit !== null ||
    s.help_open ||
    settling(s, nowMs)
  ) {
    return false;
  }

  if (s.view === 'wiring') {
    const box = m15CurrentBox(s);
    const state = m15CurrentBoxState(s);

    if (
      state.wiring !== null ||
      !box.wiring_options.some((option) => option.id === optionId)
    ) {
      return false;
    }

    tick(s, nowMs);

    const previous = state.wiring_draft;

    state.wiring_draft = previous === optionId ? null : optionId;
    state.wiring_drafts += 1;
    sink('wiring_drafted', {
      ...fields(s, 'box', 'model'),
      option_id: state.wiring_draft,
      previous_option_id: previous,
      input_mode: mode,
    });

    return true;
  }

  if (s.view !== 'question') {
    return false;
  }

  const entry = m15CurrentQuestion(s);
  const state = m15CurrentQuestionState(s);

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
    ...fields(s, 'question', 'measurement'),
    option_id: state.draft,
    previous_option_id: previous,
    input_mode: mode,
  });

  return true;
}

/* ------------------------------------------------------------------ *
 * Commitment
 * ------------------------------------------------------------------ */

export type M15RequestOutcome = 'opened' | 'no_draft' | 'none';

/**
 * RECORD WIRING / CANNOT TELL (wiring step) or RECORD ANSWER / CANNOT
 * SOLVE (question step) pressed: opens the confirmation.
 */
export function m15sRequestCommit(
  s: M15Series,
  kind: M15CommitKind,
  mode: M15InputMode,
  nowMs: number,
  sink: M15LogSink,
): M15RequestOutcome {
  if (
    s.status !== 'first_responses' ||
    s.pending_commit !== null ||
    s.help_open ||
    settling(s, nowMs)
  ) {
    return 'none';
  }

  let target: M15CommitTarget;
  let draft: string | null;
  let scope: 'box' | 'question';
  let phase: M15Phase;

  if (s.view === 'wiring') {
    const state = m15CurrentBoxState(s);

    if (state.wiring !== null) {
      return 'none';
    }

    target = 'wiring';
    draft = state.wiring_draft;
    scope = 'box';
    phase = 'model';
  } else if (s.view === 'question') {
    const state = m15CurrentQuestionState(s);

    if (state.first_response !== null) {
      return 'none';
    }

    target = 'question';
    draft = state.draft;
    scope = 'question';
    phase = 'measurement';
  } else {
    return 'none';
  }

  tick(s, nowMs);

  if (kind === 'option' && draft === null) {
    sink('commit_without_draft', {
      ...fields(s, scope, phase),
      target,
      input_mode: mode,
    });

    return 'no_draft';
  }

  s.pending_commit = {
    target,
    kind,
    option_id: kind === 'option' ? draft : null,
    opened_at_ms: nowMs,
    refused_presses: 0,
    refusal_recorded: false,
  };
  sink('commit_requested', {
    ...fields(s, scope, phase),
    target,
    kind,
    option_id: s.pending_commit.option_id,
    input_mode: mode,
  });

  return 'opened';
}

/**
 * KEEP WORKING / ESC: the step stays open without a record. The dialog
 * settles like every view: a cancelling press inside 400 ms of its opening
 * (the second click of a double click on the opener) is ignored and not
 * recorded; the dialog stays open.
 */
export function m15sCancelCommit(
  s: M15Series,
  mode: M15InputMode,
  nowMs: number,
  sink: M15LogSink,
): boolean {
  if (s.pending_commit === null) {
    return false;
  }

  if (nowMs - s.pending_commit.opened_at_ms < M15_SETTLE_MS) {
    return false;
  }

  tick(s, nowMs);
  cancelPending(s, 'keep_working', mode, sink);
  // The view the dialog returns to settles again.
  s.view_shown_at_ms = nowMs;

  return true;
}

export type M15ConfirmOutcome = 'recorded' | 'refused' | 'none';

/**
 * The confirming press in the dialog. Only a fresh press records: a press
 * inside the settle window is refused and recorded once per dialog (the
 * count carried on the record). The wiring and the first response are
 * each written once; a repeated confirmation finds no dialog and writes
 * nothing.
 */
export function m15sConfirmCommit(
  s: M15Series,
  mode: M15InputMode,
  nowMs: number,
  sink: M15LogSink,
  extra: { focused_ms?: number | null } = {},
): M15ConfirmOutcome {
  const pending = s.pending_commit;

  if (pending === null || s.status !== 'first_responses') {
    return 'none';
  }

  const sinceOpened = nowMs - pending.opened_at_ms;
  const scope = pending.target === 'wiring' ? 'box' : 'question';
  const phase: M15Phase = pending.target === 'wiring' ? 'model' : 'measurement';

  if (sinceOpened < M15_SETTLE_MS) {
    pending.refused_presses += 1;

    if (!pending.refusal_recorded) {
      pending.refusal_recorded = true;
      sink('commit_press_refused', {
        ...fields(s, scope, phase),
        target: pending.target,
        kind: pending.kind,
        reason: 'dialog_settling',
        since_opened_ms: sinceOpened,
        settle_ms: M15_SETTLE_MS,
        input_mode: mode,
      });
    }

    return 'refused';
  }

  if (pending.target === 'wiring') {
    return confirmWiring(s, pending, mode, nowMs, sink);
  }

  return confirmAnswer(s, pending, mode, nowMs, sink, extra);
}

function confirmWiring(
  s: M15Series,
  pending: M15PendingCommit,
  mode: M15InputMode,
  nowMs: number,
  sink: M15LogSink,
): M15ConfirmOutcome {
  const box = m15CurrentBox(s);
  const state = m15CurrentBoxState(s);

  if (state.wiring !== null || s.view !== 'wiring') {
    s.pending_commit = null;

    return 'none';
  }

  tick(s, nowMs);

  const record: M15WiringRecord = {
    response_kind: pending.kind === 'option' ? 'option' : 'cannot_tell',
    option_id: pending.option_id,
    // CANNOT TELL is not a correct model whatever the draft.
    correct:
      pending.kind === 'option' &&
      pending.option_id === box.wiring_key_option_id,
    key_option_id: box.wiring_key_option_id,
    tests_before: testsBefore(state),
    dials_tested_before: state.dials
      .filter((dial) => dial.runs > 0)
      .map((dial) => dial.id),
    drafts_before: state.wiring_drafts,
    help_consults_before: state.wiring_help_consults,
    active_ms: state.wiring_active_ms,
    input_mode: mode,
    refused_presses: pending.refused_presses,
  };

  state.wiring = record;
  s.pending_commit = null;
  sink('wiring_recorded', {
    ...fields(s, 'box', 'model'),
    ...record,
    draft_at_commit: state.wiring_draft,
  });

  // The tests close with the wiring; the neutral acknowledgement follows.
  showView(s, 'wiring_acknowledgement', nowMs);
  s.acknowledgement = { opened_at_ms: nowMs, next_control: 'first_question' };
  sink('response_acknowledged', {
    ...fields(s, 'box', 'model'),
    line_id: M15_WIRING_ACK_LINE_ID,
    next_control: 'first_question',
    answered_count: m15AnsweredCount(s),
    input_mode: 'system',
  });

  return 'recorded';
}

function confirmAnswer(
  s: M15Series,
  pending: M15PendingCommit,
  mode: M15InputMode,
  nowMs: number,
  sink: M15LogSink,
  extra: { focused_ms?: number | null },
): M15ConfirmOutcome {
  const box = m15CurrentBox(s);
  const boxState = m15CurrentBoxState(s);
  const entry = m15CurrentQuestion(s);
  const state = m15CurrentQuestionState(s);

  if (
    state.first_response !== null ||
    s.view !== 'question' ||
    boxState.wiring === null
  ) {
    s.pending_commit = null;

    return 'none';
  }

  tick(s, nowMs);

  const wiring = boxState.wiring;
  const recordedWiring =
    wiring.response_kind === 'cannot_tell'
      ? M15_CANNOT_TELL
      : (wiring.option_id ?? M15_CANNOT_TELL);
  const option = box.wiring_options.find(
    (candidate) => candidate.id === wiring.option_id,
  );
  // Whether the answer agrees with the one the recorded wiring implies —
  // null for CANNOT TELL, for CANNOT SOLVE, and when the recorded
  // wiring's answer is magnitude-dependent (a guard: none of the eight
  // options is).
  let consistent: boolean | null = null;

  if (
    pending.kind === 'option' &&
    wiring.response_kind === 'option' &&
    option !== undefined
  ) {
    const implied = m15AnswerUnder(box, option.links, entry);

    consistent =
      implied === null ? null : `${entry.id}_${implied}` === pending.option_id;
  }

  const response: M15FirstResponse = {
    response_kind: pending.kind === 'option' ? 'option' : 'cannot_solve',
    option_id: pending.option_id,
    // CANNOT SOLVE is an incorrect first response whatever the draft.
    correct:
      pending.kind === 'option' && pending.option_id === entry.key_option_id,
    key_option_id: entry.key_option_id,
    recorded_wiring_option_id: recordedWiring,
    consistent_with_recorded_wiring: consistent,
    tests_before: testsBefore(boxState),
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
    ...fields(s, 'question', 'measurement'),
    ...response,
    draft_at_commit: state.draft,
  });

  const answered = m15AnsweredCount(s);
  const boxDone = boxState.questions.every(
    (candidate) => candidate.first_response !== null,
  );
  const complete = answered === M15_PREDICTIONS_PLANNED;
  const nextControl: M15NextControl = complete
    ? 'show_results'
    : boxDone
      ? 'next_box'
      : 'next_question';

  showView(s, 'acknowledgement', nowMs);
  s.acknowledgement = { opened_at_ms: nowMs, next_control: nextControl };
  sink('response_acknowledged', {
    ...fields(s, 'question', 'measurement'),
    line_id: M15_ACK_LINE_ID,
    next_control: nextControl,
    answered_count: answered,
    input_mode: 'system',
  });

  if (boxDone) {
    sink('box_completed', {
      ...fields(s, 'box', 'measurement'),
      wiring: {
        response_kind: wiring.response_kind,
        option_id: wiring.option_id,
        correct: wiring.correct,
        tests_before: { ...wiring.tests_before },
      },
      questions: boxState.questions.map((candidate) => ({
        question_id: candidate.id,
        response_kind: candidate.first_response?.response_kind ?? null,
        option_id: candidate.first_response?.option_id ?? null,
        correct: candidate.first_response?.correct ?? null,
      })),
      input_mode: 'system',
    });
  }

  if (complete) {
    s.status = 'completed';
    s.closure_reason = 'completed';
    // The scored phase closes here; the adapter completes the kit window
    // right after this event, so `window_closed` follows it.
    sink('first_responses_completed', {
      ...fields(s, 'series', 'measurement'),
      closure_reason: 'completed',
      ...m15ClosureSnapshot(s),
      input_mode: 'system',
    });
  }

  return 'recorded';
}

export type M15NextOutcome =
  | 'question_presented'
  | 'box_presented'
  | 'results_shown'
  | 'refused'
  | 'none';

/** FIRST QUESTION / NEXT QUESTION / NEXT BOX / SHOW RESULTS after an acknowledgement. */
export function m15sNext(
  s: M15Series,
  mode: M15InputMode,
  nowMs: number,
  sink: M15LogSink,
): M15NextOutcome {
  const ack = s.acknowledgement;

  if (
    ack === null ||
    (s.view !== 'acknowledgement' && s.view !== 'wiring_acknowledgement') ||
    s.help_open
  ) {
    return 'none';
  }

  // The control accepts a press only after the view settled; an earlier
  // press is ignored and not recorded (no suffix exists for it).
  if (nowMs - ack.opened_at_ms < M15_SETTLE_MS || settling(s, nowMs)) {
    return 'refused';
  }

  tick(s, nowMs);
  s.acknowledgement = null;

  if (s.status === 'completed') {
    showView(s, 'results', nowMs);
    s.results_box = 0;
    showResults(s, mode, sink);

    return 'results_shown';
  }

  if (s.status !== 'first_responses') {
    return 'none';
  }

  if (ack.next_control === 'first_question') {
    s.question = 0;
    presentQuestion(s, nowMs, sink);
    s.last_tick_ms = nowMs;

    return 'question_presented';
  }

  if (ack.next_control === 'next_box') {
    s.box += 1;
    s.question = 0;
    presentBox(s, nowMs, sink);
    s.last_tick_ms = nowMs;

    return 'box_presented';
  }

  s.question += 1;
  presentQuestion(s, nowMs, sink);
  s.last_tick_ms = nowMs;

  return 'question_presented';
}

/* ------------------------------------------------------------------ *
 * Results (only after the fourth first response)
 * ------------------------------------------------------------------ */

function showResults(s: M15Series, mode: M15InputMode, sink: M15LogSink) {
  const box = M15_BOXES[s.results_box];
  const state = s.boxes[s.results_box];

  if (state.results_shown) {
    return;
  }

  state.results_shown = true;
  sink('results_shown', {
    phase: 'feedback',
    box_id: box.id,
    box_index: box.index,
    box_window_id: M15_BOX_WINDOW_IDS[box.id],
    content_version: box.content_version,
    line_ids: [
      `${box.id}_wiring_result`,
      ...box.questions.map((entry) => `${entry.id}_result`),
    ],
    input_mode: mode,
  });
}

/** NEXT BOX / BACK between the two results views. */
export function m15sResultsNavigate(
  s: M15Series,
  direction: 'next' | 'back',
  mode: M15InputMode,
  nowMs: number,
  sink: M15LogSink,
): boolean {
  if (s.status !== 'completed' || s.view !== 'results' || s.help_open) {
    return false;
  }

  const target = direction === 'next' ? 1 : 0;

  if (target === s.results_box) {
    return false;
  }

  // A press inside 400 ms of the last change of view is a doubled press
  // and changes nothing.
  if (settling(s, nowMs)) {
    return false;
  }

  tick(s, nowMs);
  s.results_box = target;
  s.view_shown_at_ms = nowMs;
  showResults(s, mode, sink);

  return true;
}

/**
 * FINISH on a results view: the surface may close only after the view
 * settled (a carried press from NEXT BOX or BACK lands on FINISH and must
 * not close the bench). Nothing is recorded here; the close itself is the
 * surface's leave path.
 */
export function m15sFinish(s: M15Series, nowMs: number): boolean {
  return (
    s.status === 'completed' &&
    s.view === 'results' &&
    !s.help_open &&
    !settling(s, nowMs)
  );
}

/* ------------------------------------------------------------------ *
 * Help
 * ------------------------------------------------------------------ */

/** HELP: informational; never while a confirmation dialog is open. */
export function m15sHelp(
  s: M15Series,
  mode: M15InputMode,
  nowMs: number,
  sink: M15LogSink,
): boolean {
  if (
    !m15Live(s) ||
    s.pending_commit !== null ||
    s.help_open ||
    settling(s, nowMs)
  ) {
    return false;
  }

  tick(s, nowMs);
  s.help_open = true;

  const phase = m15Phase(s);

  s.help_consults[phase] += 1;

  if (s.status === 'first_responses') {
    if (m15InWiringStep(s)) {
      m15CurrentBoxState(s).wiring_help_consults += 1;
    } else {
      m15CurrentQuestionState(s).help_consults += 1;
    }
  }

  sink('help_consulted', {
    ...fields(s, currentScope(s)),
    step: m15InWiringStep(s) ? 'wiring' : s.view,
    view: s.view,
    input_mode: mode,
  });
  // The help sheet is a view of its own: it settles too.
  s.view_shown_at_ms = nowMs;

  return true;
}

/** CLOSE HELP / ESC: the view the help returns to settles again. */
export function m15sCloseHelp(s: M15Series, nowMs: number): boolean {
  if (!s.help_open || settling(s, nowMs)) {
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
 * The station-record closure at the Utility Deck review: a series still
 * in its orientation or first-response phase closes with the wirings and
 * answers as they stand. A completed series is not reclosed.
 */
export function m15sCloseAtReview(
  s: M15Series,
  nowMs: number,
  sink: M15LogSink,
): boolean {
  if (s.status !== 'orientation' && s.status !== 'first_responses') {
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
    closure_reason: 'closed_at_review',
    ...m15ClosureSnapshot(s),
    input_mode: 'system',
  });

  return true;
}

export type M15FailOutcome = 'scored_phase' | 'feedback' | 'none';

/**
 * A fault. In the orientation or the first-response phase it closes the
 * series (the adapter records the kit's technical failure); after
 * completion it is recorded without touching the scored evidence.
 */
export function m15sFail(s: M15Series, detail: string): M15FailOutcome {
  if (s.status === 'orientation' || s.status === 'first_responses') {
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

/** The reload hold-back: the bench is never re-run in this page load. */
export function m15sHoldBack(s: M15Series) {
  if (s.status !== 'unopened') {
    return false;
  }

  s.status = 'held_back';
  s.failure_detail = M15_RELOAD_DETAIL;
  s.view = 'record';

  return true;
}
