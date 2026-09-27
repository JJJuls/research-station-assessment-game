/**
 * M24 — Metal Recovery Yard magnet rig window (Station 080 M01–M26 run,
 * Unit 12; the evidence-led pilot v2 mechanics of Unit 4 kept). PURE
 * model (no Phaser; Node-testable — the focused clock and its monitor
 * registration are the only runtime touch, as in the M25 model).
 *
 * The MECHANICS are the accepted foundation: the finite counterbalanced
 * deck (src/fieldActions/magnetDeck.ts — every committed cycle consumes
 * one position, in-band or not; post-depletion pulls are empty BY
 * CONSTRUCTION) and the winch state machine. This model classifies each
 * resolved cycle the rig reports while the window is open:
 *
 *   pre-depletion committed cycles          → useful / empty outcomes
 *   after depletion, before a passed check  → pre-knowledge casts
 *   after a FAILED check                    → casts after fail
 *   inside the post-knowledge continuation  → post-knowledge casts
 *
 * KNOWLEDGE is established only by the expected-outcome test
 * (`outcomeUnderstanding.ts`): one question about what one more unchanged
 * cycle will bring up, one neutral explanation on a wrong first answer,
 * one equivalent recheck; `pass_first` and `pass_after_explanation` are
 * stored apart; an acknowledgement click never passes. A pass opens the
 * CONTINUATION: a focused window of `PILOT_SETTINGS.m24_cap_ms` in which
 * another cycle, the sorting bench (the useful alternative) and "Finish
 * at the rig" (the explicit exit) are all available and nothing tells the
 * participant which to choose; the cap closes it as a censoring event.
 * Neither continuing nor stopping is interpreted anywhere. Timing-band
 * accuracy is secondary motor telemetry only. Nothing here is a score.
 */
import { FocusedClock, type PauseCause } from '../../measurement/focusedClock';
import {
  registerFocusedClock,
  releaseFocusedClock,
} from '../../measurement/focusMonitor';
import {
  type KnowledgeStatus,
  PILOT_SETTINGS,
} from '../../measurement/protocol';
import {
  createUnderstandingState,
  type UnderstandingAnswer,
  understandingAnswer,
  understandingDue,
  understandingExplained,
  understandingPassed,
  understandingPresent,
  type UnderstandingQuestion,
  understandingRaw,
  type UnderstandingStage,
  type UnderstandingState,
} from './outcomeUnderstanding';

export const M24_OPPORTUNITY_ID = 'proto_m24_rig_continuation';
export const M24_WINDOW_ID = 'm24_rig_w1';
export const M24_ENTRY_STATE_VERSION = 'm24-rig-continuation-v3';
export const M24_FAMILY = 'proto_m24_rig_';
/** The post-knowledge continuation cap (focused time; pilot default). */
export const M24_CAP_MS = PILOT_SETTINGS.m24_cap_ms;

export const M24_EVENT_SUFFIXES = [
  'presented',
  'opportunity_opened',
  'cycle',
  'depletion_reached',
  'depletion_shown',
  'understanding_presented',
  'understanding_answered',
  'understanding_refused',
  'explanation_shown',
  'explanation_dismissed',
  'continuation_opened',
  'continuation_paused',
  'continuation_resumed',
  'stepped_away',
  'postknowledge_cast',
  'alternative_used',
  'exit',
  'cap_reached',
  'departed',
  'window_closed',
  'technical_failure',
] as const;

/** The participant-facing depletion statement (identical for everyone). */
export const M24_DEPLETION_STATEMENT =
  'CATCHMENT DEPLETED — every recoverable piece in this heap has been brought up. Further cycles bring up nothing.';

/** Rig brief shown before the first cycle (comprehension exposure). */
export const M24_RIG_BRIEF =
  'Salvage tally. The catchment under the rig holds a finite set of recoverable pieces. Each cycle (F on the operating pad) lowers the magnet and brings up the next piece — or nothing; ESC cancels a cycle while the magnet is still lowering. When the panel reads CATCHMENT DEPLETED, nothing further can be recovered from it. The sorting bench beside the rig logs recovered stock.';

/**
 * The expected-outcome test (Unit 12). The key is never the first card in
 * either form; the wording names no item and states no preference.
 */
export const M24_UNDERSTANDING_QUESTION: UnderstandingQuestion = {
  question_id: 'm24_next_cycle_outcome',
  stem: 'Check before you go on: if you run one more cycle now, what will the magnet bring up?',
  options: [
    {
      id: 'next_piece',
      label: 'The next recoverable piece from the catchment.',
    },
    {
      id: 'nothing',
      label: 'Nothing — the catchment holds no further recoverable pieces.',
    },
    {
      id: 'depends_timing',
      label: 'It depends on how well the timing band is hit.',
    },
  ],
  key: 'nothing',
  explanation:
    'The catchment is finite and every recoverable piece in it has been brought up. From now on every cycle brings up nothing, however the timing band is hit.',
};

/** Neutral line after the check is decided — identical for a pass and a fail. */
export const M24_CHECK_RECORDED =
  'Check recorded. The rig and the sorting bench remain available.';

/** Structural subset of the foundation MagnetCycleRecord. */
export interface M24CycleLike {
  cancelled: boolean;
  hook_set: boolean;
  locked_in_band: boolean;
  lock_source: string | null;
  outcome_tier: string | null;
  item_id: string | null;
  item_delivery: 'inventory' | 'cache' | null;
  pull_position: number | null;
  post_depletion: boolean;
  depleted_now: boolean;
  cycle_duration_ms: number | null;
}

export type M24KnowledgeState =
  | 'not_depleted'
  | 'depleted_untested'
  | 'depleted_testing'
  | 'depleted_passed'
  | 'depleted_failed';

export type M24CastClass =
  | 'cancelled'
  | 'useful'
  | 'empty'
  | 'pre_knowledge'
  | 'after_fail'
  | 'postknowledge';

export type M24ContinuationClosure =
  | 'voluntary_stop'
  | 'cap'
  | 'route_departure'
  | 'closed_at_review';

export type M24StopChoice = 'ended_shift_outside' | 'closed_at_review' | null;

export interface M24State {
  deck_form: string;
  deck_position_at_open: number | null;
  entered: boolean;
  closed: boolean;
  opened_at_ms: number | null;
  cycles_committed: number;
  cycles_cancelled: number;
  useful_outcomes: number;
  empty_outcomes_pre_depletion: number;
  in_band_locks: number;
  out_of_band_locks: number;
  depletion_reached_ms: number | null;
  depletion_reached_at_cycle: number | null;
  depletion_shown_count: number;
  depletion_shown_first_ms: number | null;
  understanding: UnderstandingState;
  /** Post-depletion casts before the check was decided. */
  casts_pre_knowledge: number;
  /** Post-depletion casts after a failed check. */
  casts_after_fail: number;
  /** Casts inside the continuation (the first included). */
  postknowledge_casts: number;
  postknowledge_cast_focused_ms: number[];
  continuation_opened_at_ms: number | null;
  continuation_closed_at_ms: number | null;
  continuation_closure: M24ContinuationClosure | null;
  continuation_focused_ms: number | null;
  continuation_wall_ms: number | null;
  continuationClock: FocusedClock | null;
  cap_reached: boolean;
  cast_in_progress_at_cap: boolean;
  /** A bench sort still running at the cap (recorded, never counted). */
  alternative_in_progress_at_cap: boolean;
  /** "Step away" chosen at the panel inside the continuation (telemetry). */
  steps_away_in_continuation: number;
  alternative_used_pre_depletion: number;
  alternative_used_pre_knowledge: number;
  alternative_used_postknowledge: number;
  alternative_used_postknowledge_ms: number | null;
  exit_ms: number | null;
  last_cycle_ms: number | null;
  departures: number;
  stop_choice: M24StopChoice;
}

export function createM24State(deckForm: string): M24State {
  return {
    deck_form: deckForm,
    deck_position_at_open: null,
    entered: false,
    closed: false,
    opened_at_ms: null,
    cycles_committed: 0,
    cycles_cancelled: 0,
    useful_outcomes: 0,
    empty_outcomes_pre_depletion: 0,
    in_band_locks: 0,
    out_of_band_locks: 0,
    depletion_reached_ms: null,
    depletion_reached_at_cycle: null,
    depletion_shown_count: 0,
    depletion_shown_first_ms: null,
    understanding: createUnderstandingState(),
    casts_pre_knowledge: 0,
    casts_after_fail: 0,
    postknowledge_casts: 0,
    postknowledge_cast_focused_ms: [],
    continuation_opened_at_ms: null,
    continuation_closed_at_ms: null,
    continuation_closure: null,
    continuation_focused_ms: null,
    continuation_wall_ms: null,
    continuationClock: null,
    cap_reached: false,
    cast_in_progress_at_cap: false,
    alternative_in_progress_at_cap: false,
    steps_away_in_continuation: 0,
    alternative_used_pre_depletion: 0,
    alternative_used_pre_knowledge: 0,
    alternative_used_postknowledge: 0,
    alternative_used_postknowledge_ms: null,
    exit_ms: null,
    last_cycle_ms: null,
    departures: 0,
    stop_choice: null,
  };
}

export function m24Open(state: M24State): boolean {
  return state.entered && !state.closed;
}

export function m24Enter(
  state: M24State,
  nowMs: number,
  deckPositionAtOpen: number,
): boolean {
  if (state.entered || state.closed) {
    return false;
  }

  state.entered = true;
  state.opened_at_ms = nowMs;
  state.deck_position_at_open = deckPositionAtOpen;

  return true;
}

function elapsed(state: M24State, nowMs: number): number {
  return Math.max(0, nowMs - (state.opened_at_ms ?? nowMs));
}

export function m24Depleted(state: M24State): boolean {
  return state.depletion_reached_ms !== null;
}

export function m24KnowledgeStatus(state: M24State): KnowledgeStatus {
  return state.understanding.status;
}

export function m24KnowledgeState(state: M24State): M24KnowledgeState {
  if (!m24Depleted(state)) {
    return 'not_depleted';
  }

  switch (state.understanding.status) {
    case 'pass_first':
    case 'pass_after_explanation':
      return 'depleted_passed';
    case 'fail':
      return 'depleted_failed';
    default:
      return state.understanding.attempts.length === 0
        ? 'depleted_untested'
        : 'depleted_testing';
  }
}

/** The continuation is open: passed, opened, not yet closed. */
export function m24ContinuationOpen(state: M24State): boolean {
  return (
    m24Open(state) &&
    state.continuation_opened_at_ms !== null &&
    state.continuation_closed_at_ms === null
  );
}

export interface M24CycleNote {
  committed: boolean;
  post_depletion: boolean;
  classification: M24CastClass;
  depletion_reached_now: boolean;
  /** Post-knowledge casts so far (this one included when it is one). */
  postknowledge_count: number;
  /** Focused ms into the continuation at this cast (post-knowledge only). */
  continuation_focused_ms: number | null;
}

/** One resolved rig cycle inside the open window. */
export function m24NoteCycle(
  state: M24State,
  record: M24CycleLike,
  nowMs: number,
): M24CycleNote {
  if (!m24Open(state)) {
    throw new Error('M24: cycle outside the open window');
  }

  state.last_cycle_ms = elapsed(state, nowMs);

  if (record.cancelled) {
    state.cycles_cancelled += 1;

    return {
      committed: false,
      post_depletion: false,
      classification: 'cancelled',
      depletion_reached_now: false,
      postknowledge_count: state.postknowledge_casts,
      continuation_focused_ms: null,
    };
  }

  state.cycles_committed += 1;

  if (record.locked_in_band) {
    state.in_band_locks += 1;
  } else {
    state.out_of_band_locks += 1;
  }

  if (record.post_depletion) {
    let classification: M24CastClass;
    let focused: number | null = null;

    if (m24ContinuationOpen(state)) {
      classification = 'postknowledge';
      state.postknowledge_casts += 1;
      focused = state.continuationClock?.focusedMs(nowMs) ?? null;
      state.postknowledge_cast_focused_ms.push(focused ?? 0);
    } else if (state.understanding.status === 'fail') {
      classification = 'after_fail';
      state.casts_after_fail += 1;
    } else {
      classification = 'pre_knowledge';
      state.casts_pre_knowledge += 1;
    }

    return {
      committed: true,
      post_depletion: true,
      classification,
      depletion_reached_now: false,
      postknowledge_count: state.postknowledge_casts,
      continuation_focused_ms: focused,
    };
  }

  if (record.item_id !== null) {
    state.useful_outcomes += 1;
  } else {
    state.empty_outcomes_pre_depletion += 1;
  }

  let reachedNow = false;

  if (record.depleted_now && state.depletion_reached_ms === null) {
    state.depletion_reached_ms = elapsed(state, nowMs);
    state.depletion_reached_at_cycle = state.cycles_committed;
    reachedNow = true;
  }

  return {
    committed: true,
    post_depletion: false,
    classification: record.item_id !== null ? 'useful' : 'empty',
    depletion_reached_now: reachedNow,
    postknowledge_count: state.postknowledge_casts,
    continuation_focused_ms: null,
  };
}

/** The depletion statement was displayed (every display counted). */
export function m24NoteDepletionShown(state: M24State, nowMs: number): boolean {
  if (!m24Open(state) || state.depletion_reached_ms === null) {
    return false;
  }

  state.depletion_shown_count += 1;
  state.depletion_shown_first_ms ??= elapsed(state, nowMs);

  return true;
}

// ——— the expected-outcome test ————————————————————————————————————————

/** The check stage due now (after depletion, statement shown), or null. */
export function m24TestDue(state: M24State): UnderstandingStage | null {
  if (!m24Open(state) || state.depletion_shown_first_ms === null) {
    return null;
  }

  return understandingDue(state.understanding);
}

export function m24PresentTest(
  state: M24State,
  stage: UnderstandingStage,
  nowMs: number,
): boolean {
  if (m24TestDue(state) !== stage) {
    return false;
  }

  return understandingPresent(state.understanding, stage, nowMs);
}

/** The explanation stage was dismissed; the recheck becomes due. */
export function m24Explained(state: M24State, nowMs: number): boolean {
  return m24Open(state) && understandingExplained(state.understanding, nowMs);
}

/**
 * An answer on the open check stage. A pass opens the continuation at
 * once (its focused clock starts and is registered with the monitor).
 */
export function m24AnswerTest(
  state: M24State,
  optionId: string,
  nowMs: number,
): UnderstandingAnswer {
  if (!m24Open(state)) {
    return { kind: 'refused', reason: 'not_due' };
  }

  const result = understandingAnswer(
    state.understanding,
    M24_UNDERSTANDING_QUESTION,
    optionId,
    nowMs,
  );

  if (
    result.kind === 'answered' &&
    understandingPassed(state.understanding) &&
    state.continuation_opened_at_ms === null
  ) {
    const clock = new FocusedClock();

    clock.start(nowMs);
    registerFocusedClock(clock);
    state.continuationClock = clock;
    state.continuation_opened_at_ms = nowMs;
  }

  return result;
}

function closeContinuation(
  state: M24State,
  nowMs: number,
  closure: M24ContinuationClosure,
) {
  if (!m24ContinuationOpen(state)) {
    return false;
  }

  const clock = state.continuationClock;

  if (clock !== null) {
    clock.stop(nowMs);
    releaseFocusedClock(clock);
    state.continuation_focused_ms = clock.focusedMs(nowMs);
    state.continuation_wall_ms = clock.wallMs(nowMs);
  }

  state.continuation_closed_at_ms = nowMs;
  state.continuation_closure = closure;

  return true;
}

/** Focused ms remaining under the cap (null when the continuation is not open). */
export function m24ContinuationRemainingMs(
  state: M24State,
  nowMs: number,
): number | null {
  if (!m24ContinuationOpen(state) || state.continuationClock === null) {
    return null;
  }

  return state.continuationClock.remainingMs(nowMs, M24_CAP_MS);
}

/**
 * Host tick: the focused cap closes the continuation (a censoring event,
 * never an action). `castInProgress` records a cycle still running at the
 * cap — it is never counted.
 */
export function m24Tick(
  state: M24State,
  nowMs: number,
  castInProgress: boolean,
  alternativeInProgress = false,
): 'none' | 'cap' {
  if (
    !m24ContinuationOpen(state) ||
    state.continuationClock === null ||
    !state.continuationClock.capReached(nowMs, M24_CAP_MS)
  ) {
    return 'none';
  }

  state.cap_reached = true;
  state.cast_in_progress_at_cap = castInProgress;
  state.alternative_in_progress_at_cap = alternativeInProgress;
  closeContinuation(state, nowMs, 'cap');

  return 'cap';
}

/** "Finish at the rig": the explicit exit inside the continuation. */
export function m24Exit(state: M24State, nowMs: number): boolean {
  if (!m24ContinuationOpen(state)) {
    return false;
  }

  state.exit_ms = elapsed(state, nowMs);

  return closeContinuation(state, nowMs, 'voluntary_stop');
}

/** "Step away" at the panel inside the continuation (telemetry only; nothing closes). */
export function m24NoteStepAway(state: M24State): boolean {
  if (!m24ContinuationOpen(state)) {
    return false;
  }

  state.steps_away_in_continuation += 1;

  return true;
}

/**
 * A technical failure ends the window: the continuation's clock is stopped
 * and released (never left registered with the focus monitor).
 */
export function m24Abort(state: M24State, nowMs: number) {
  const clock = state.continuationClock;

  if (clock !== null && state.continuation_closed_at_ms === null) {
    clock.stop(nowMs);
    releaseFocusedClock(clock);
    state.continuation_focused_ms = clock.focusedMs(nowMs);
    state.continuation_wall_ms = clock.wallMs(nowMs);
    state.continuation_closed_at_ms = nowMs;
  }

  state.closed = true;
}

/** The equally visible alternative (sorting bench) was used. */
export function m24NoteAlternative(
  state: M24State,
  nowMs: number,
): 'pre_depletion' | 'pre_knowledge' | 'postknowledge' | null {
  if (!m24Open(state)) {
    return null;
  }

  if (!m24Depleted(state)) {
    state.alternative_used_pre_depletion += 1;

    return 'pre_depletion';
  }

  if (m24ContinuationOpen(state)) {
    state.alternative_used_postknowledge += 1;
    state.alternative_used_postknowledge_ms ??=
      state.continuationClock?.focusedMs(nowMs) ?? null;

    return 'postknowledge';
  }

  state.alternative_used_pre_knowledge += 1;

  return 'pre_knowledge';
}

/** The rig became unusable (yard left, focus lost is the monitor's): the clock pauses. */
export function m24Pause(state: M24State, cause: PauseCause, nowMs: number) {
  state.continuationClock?.pause(cause, nowMs);
}

export function m24Resume(state: M24State, cause: PauseCause, nowMs: number) {
  state.continuationClock?.resume(cause, nowMs);
}

export function m24Depart(state: M24State): boolean {
  if (!m24Open(state)) {
    return false;
  }

  state.departures += 1;

  return true;
}

/** The route closes the window (Noor's shift end or the review). */
export function m24Close(
  state: M24State,
  choice: Exclude<M24StopChoice, null>,
  nowMs: number,
): boolean {
  if (!m24Open(state)) {
    return false;
  }

  closeContinuation(
    state,
    nowMs,
    choice === 'closed_at_review' ? 'closed_at_review' : 'route_departure',
  );
  state.closed = true;
  state.stop_choice = choice;

  return true;
}

/**
 * Register semantics for the closure (host applies): the observation is
 * complete only once the check was PASSED (the continuation exists, however
 * it closed); never depleted → missing (no boundary arose); depleted but
 * the check never decided → invalid (knowledge unverified); check failed →
 * invalid (`understanding_failed`, the behaviour kept as unqualified).
 * Never a low value.
 */
export type M24Closure =
  | { kind: 'completed' }
  | { kind: 'missing'; detail: string }
  | { kind: 'invalid'; detail: string };

export function m24ClosureDisposition(state: M24State): M24Closure {
  if (!m24Depleted(state)) {
    return { kind: 'missing', detail: 'deck_never_depleted' };
  }

  if (state.depletion_shown_first_ms === null) {
    return { kind: 'invalid', detail: 'depletion_statement_never_displayed' };
  }

  switch (state.understanding.status) {
    case 'unknown':
      return { kind: 'invalid', detail: 'understanding_not_tested' };
    case 'fail':
      return { kind: 'invalid', detail: 'understanding_failed' };
    default:
      return { kind: 'completed' };
  }
}

/** Participant-facing rig panel line (no remaining count before depletion). */
export function m24PanelLine(state: M24State, depleted: boolean): string {
  if (!state.entered) {
    return depleted ? 'CATCHMENT DEPLETED' : 'RIG READY — read the panel (E)';
  }

  if (state.closed) {
    return 'TALLY CLOSED';
  }

  return `CYCLES ${state.cycles_committed} · RECOVERED ${state.useful_outcomes}`;
}

/** Ledger raw components + contextual counts (never a score). */
export function m24RawComponents(state: M24State) {
  return {
    deck_form: state.deck_form,
    deck_position_at_open: state.deck_position_at_open,
    depletion_reached: m24Depleted(state),
    depletion_reached_ms: state.depletion_reached_ms,
    depletion_reached_at_cycle: state.depletion_reached_at_cycle,
    depletion_shown_count: state.depletion_shown_count,
    depletion_shown_first_ms: state.depletion_shown_first_ms,
    ...understandingRaw(state.understanding),
    knowledge_state: m24KnowledgeState(state),
    /** The feature's fact: casts inside the continuation (the first included). */
    postknowledge_casts: state.postknowledge_casts,
    postknowledge_casts_minus_first: Math.max(0, state.postknowledge_casts - 1),
    postknowledge_cast_focused_ms: [...state.postknowledge_cast_focused_ms],
    casts_pre_knowledge: state.casts_pre_knowledge,
    casts_after_fail: state.casts_after_fail,
    postdepletion_casts:
      state.casts_pre_knowledge +
      state.casts_after_fail +
      state.postknowledge_casts,
    continuation_opened: state.continuation_opened_at_ms !== null,
    continuation_closure: state.continuation_closure,
    continuation_focused_ms: state.continuation_focused_ms,
    continuation_wall_ms: state.continuation_wall_ms,
    continuation_cap_ms: M24_CAP_MS,
    cap_reached: state.cap_reached,
    cast_in_progress_at_cap: state.cast_in_progress_at_cap,
    alternative_in_progress_at_cap: state.alternative_in_progress_at_cap,
    steps_away_in_continuation: state.steps_away_in_continuation,
    exited: state.exit_ms !== null,
    exit_ms: state.exit_ms,
    alternative_used: state.alternative_used_postknowledge > 0,
    alternative_used_postknowledge: state.alternative_used_postknowledge,
    alternative_used_postknowledge_ms: state.alternative_used_postknowledge_ms,
    alternative_used_pre_knowledge: state.alternative_used_pre_knowledge,
    alternative_used_pre_depletion: state.alternative_used_pre_depletion,
    // Contextual.
    cycles_committed: state.cycles_committed,
    cycles_cancelled: state.cycles_cancelled,
    useful_outcomes: state.useful_outcomes,
    empty_outcomes_pre_depletion: state.empty_outcomes_pre_depletion,
    in_band_locks: state.in_band_locks,
    out_of_band_locks: state.out_of_band_locks,
    time_post_depletion_ms:
      state.depletion_reached_ms === null || state.last_cycle_ms === null
        ? null
        : Math.max(0, state.last_cycle_ms - state.depletion_reached_ms),
    departures: state.departures,
    stop_choice: state.stop_choice,
  };
}
