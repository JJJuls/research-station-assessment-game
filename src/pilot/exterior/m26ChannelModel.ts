/**
 * M26 — disconnected uplink channel window (Station 080 M01–M26 run, Unit
 * 12; the evidence-led pilot v2 mechanics of Unit 4 kept). PURE model (no
 * Phaser; Node-testable — the focused clock and its monitor registration
 * are the only runtime touch, as in the M25 model).
 *
 * Mechanic: two field uplink posts. The recovery brief requires two
 * reports (coupling recovery, salvage tally). Post A is the primary
 * uplink; Post B the backup, three tiles away, always working. After the
 * FIRST successful transmission the storm tears the conduit to Post A
 * open — a standardised, scripted, visibly demonstrated event (severed
 * conduit segment, continuity indicator LINE A ✕ OPEN, line-status panel
 * notice, and every later Post A transmit attempt returns NO CARRIER).
 * The disconnect is real by construction: Post A can never deliver again
 * in this session — there is no hidden recovery.
 *
 * KNOWLEDGE is established only by the expected-outcome test
 * (`outcomeUnderstanding.ts`): one question about what a report sent
 * from Post A will do now, one neutral explanation on a wrong first
 * answer, one equivalent recheck; `pass_first` and
 * `pass_after_explanation` are stored apart; an acknowledgement click
 * never passes. A pass opens the CONTINUATION: a focused window of
 * `PILOT_SETTINGS.m26_cap_ms` in which another Post A transmission (a
 * post-knowledge retry — the FIRST INCLUDED; the v2 first-probe exclusion
 * is retired), Post B (the switch) and "Finish at the uplink" (the
 * explicit exit) are all available and nothing tells the participant
 * which to choose; the cap closes it as a censoring event. Post A
 * attempts after the disconnect and before a pass are `pre_knowledge`;
 * after a failed check `after_fail` — preserved, never post-knowledge.
 * Neither continuing nor switching is interpreted anywhere. Nothing here
 * is a score.
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

export const M26_OPPORTUNITY_ID = 'proto_m26_uplink_continuation';
export const M26_WINDOW_ID = 'm26_uplink_w1';
export const M26_ENTRY_STATE_VERSION = 'm26-uplink-continuation-v3';
export const M26_FAMILY = 'proto_m26_uplink_';
/** The post-knowledge continuation cap (focused time; pilot default). */
export const M26_CAP_MS = PILOT_SETTINGS.m26_cap_ms;

export const M26_EVENT_SUFFIXES = [
  'presented',
  'opportunity_opened',
  'transmission',
  'disconnect_demonstrated',
  'evidence_viewed',
  'understanding_presented',
  'understanding_answered',
  'understanding_refused',
  'press_refused',
  'explanation_shown',
  'explanation_dismissed',
  'continuation_opened',
  'continuation_paused',
  'continuation_resumed',
  'stepped_away',
  'postknowledge_retry',
  'alternative_used',
  'exit',
  'cap_reached',
  'departed',
  'window_closed',
  'technical_failure',
] as const;

export type M26Channel = 'A' | 'B';

export type M26Report = 'coupling_recovery' | 'salvage_tally';

/** The two required reports, in the order they are queued. */
export const M26_REPORTS: readonly M26Report[] = [
  'coupling_recovery',
  'salvage_tally',
];

export const M26_REPORT_LABELS: Record<M26Report, string> = {
  coupling_recovery: 'Coupling recovery report',
  salvage_tally: 'Salvage tally report',
};

/** Line-status panel notice after the disconnect (identical for everyone). */
export const M26_DISCONNECT_NOTICE =
  'LINE A ✕ OPEN — conduit severed at junction 2 after the gust. No carrier on Post A: nothing sent from it can reach the station. LINE B ● CARRIER OK — backup uplink, three posts east.';

export const M26_CARRIER_OK_NOTICE =
  'LINE A ● CARRIER OK — primary uplink.   LINE B ● CARRIER OK — backup uplink.';

export const M26_UPLINK_BRIEF =
  'Field uplink. Two recovery reports are due: the coupling recovery report and the salvage tally report. Transmit from Post A (primary); Post B (backup) carries the same reports. Each transmission takes a moment and the post shows the result.';

/** Transmit act duration (ms) the host performs in the world. */
export const M26_TRANSMIT_MS = 1200;

/** Delay (ms) between the first ACK and the scripted conduit failure. */
export const M26_DISCONNECT_DELAY_MS = 1400;

/**
 * The expected-outcome test (Unit 12). The key is never the first card in
 * either form; the wording names no item and states no preference.
 */
export const M26_UNDERSTANDING_QUESTION: UnderstandingQuestion = {
  question_id: 'm26_post_a_transmission_outcome',
  stem: 'Check before you go on: if you transmit a report from Post A now, what happens to it?',
  options: [
    {
      id: 'reaches_delayed',
      label: 'It reaches the station after a short delay.',
    },
    {
      id: 'not_received',
      label:
        'It does not reach the station — Line A is open, so Post A has no carrier.',
    },
    {
      id: 'reaches_after_gust',
      label: 'It reaches the station once the gust has passed.',
    },
  ],
  key: 'not_received',
  explanation:
    'The conduit to Post A is severed at junction 2 and cannot be repaired this shift. Nothing sent from Post A reaches the station — now or later.',
};

/** Neutral line after the check is decided — identical for a pass and a fail. */
export const M26_CHECK_RECORDED =
  'Check recorded. Post A, Post B and the line panel remain available.';

export type M26Knowledge =
  | 'connected'
  | 'disconnected_untested'
  | 'disconnected_testing'
  | 'disconnected_passed'
  | 'disconnected_failed';

export type M26Classification =
  | 'delivered'
  | 'pre_knowledge'
  | 'after_fail'
  | 'postknowledge';

export interface M26Transmission {
  channel: M26Channel;
  report: M26Report | null;
  delivered: boolean;
  classification: M26Classification;
  elapsed_ms: number;
  /** Focused ms into the continuation (inside it only). */
  continuation_focused_ms: number | null;
}

export type M26ContinuationClosure =
  | 'voluntary_stop'
  | 'cap'
  | 'route_departure'
  | 'closed_at_review';

export type M26StopChoice = 'ended_shift_outside' | 'closed_at_review' | null;

export interface M26State {
  entered: boolean;
  closed: boolean;
  opened_at_ms: number | null;
  transmissions: M26Transmission[];
  delivered: Partial<Record<M26Report, M26Channel>>;
  first_success_ms: number | null;
  first_success_channel: M26Channel | null;
  successes_on_a_before_disconnect: number;
  disconnected_ms: number | null;
  evidence_views: number;
  first_evidence_ms: number | null;
  evidence_sources: string[];
  understanding: UnderstandingState;
  /** Post A attempts after the disconnect, before the check was decided. */
  pre_knowledge_attempts: number;
  /** Post A attempts after a failed check. */
  attempts_after_fail: number;
  /** Post A attempts inside the continuation (the first included). */
  postknowledge_retries: number;
  postknowledge_retry_focused_ms: number[];
  postknowledge_retries_after_delivery: number;
  continuation_opened_at_ms: number | null;
  continuation_closed_at_ms: number | null;
  continuation_closure: M26ContinuationClosure | null;
  continuation_focused_ms: number | null;
  continuation_wall_ms: number | null;
  continuationClock: FocusedClock | null;
  cap_reached: boolean;
  retry_in_progress_at_cap: boolean;
  /** A Post B transmission still running at the cap (recorded, never counted). */
  switch_in_progress_at_cap: boolean;
  /** "Step away" chosen at Post A inside the continuation (telemetry). */
  steps_away_in_continuation: number;
  /** The reports already delivered when the continuation opened (entry state). */
  reports_delivered_at_open: number | null;
  /** Post B deliveries after the disconnect (any knowledge state). */
  b_transmissions_after_disconnect: number;
  alternative_used_ms: number | null;
  /** Post B inside the continuation (the switch). */
  alternative_used_postknowledge: number;
  alternative_used_postknowledge_ms: number | null;
  exit_ms: number | null;
  departures: number;
  stop_choice: M26StopChoice;
}

export function createM26State(): M26State {
  return {
    entered: false,
    closed: false,
    opened_at_ms: null,
    transmissions: [],
    delivered: {},
    first_success_ms: null,
    first_success_channel: null,
    successes_on_a_before_disconnect: 0,
    disconnected_ms: null,
    evidence_views: 0,
    first_evidence_ms: null,
    evidence_sources: [],
    understanding: createUnderstandingState(),
    pre_knowledge_attempts: 0,
    attempts_after_fail: 0,
    postknowledge_retries: 0,
    postknowledge_retry_focused_ms: [],
    postknowledge_retries_after_delivery: 0,
    continuation_opened_at_ms: null,
    continuation_closed_at_ms: null,
    continuation_closure: null,
    continuation_focused_ms: null,
    continuation_wall_ms: null,
    continuationClock: null,
    cap_reached: false,
    retry_in_progress_at_cap: false,
    switch_in_progress_at_cap: false,
    steps_away_in_continuation: 0,
    reports_delivered_at_open: null,
    b_transmissions_after_disconnect: 0,
    alternative_used_ms: null,
    alternative_used_postknowledge: 0,
    alternative_used_postknowledge_ms: null,
    exit_ms: null,
    departures: 0,
    stop_choice: null,
  };
}

export function m26Open(state: M26State): boolean {
  return state.entered && !state.closed;
}

export function m26Enter(state: M26State, nowMs: number): boolean {
  if (state.entered || state.closed) {
    return false;
  }

  state.entered = true;
  state.opened_at_ms = nowMs;

  return true;
}

function elapsed(state: M26State, nowMs: number): number {
  return Math.max(0, nowMs - (state.opened_at_ms ?? nowMs));
}

export function m26Disconnected(state: M26State): boolean {
  return state.disconnected_ms !== null;
}

export function m26KnowledgeStatus(state: M26State): KnowledgeStatus {
  return state.understanding.status;
}

export function m26Knowledge(state: M26State): M26Knowledge {
  if (!m26Disconnected(state)) {
    return 'connected';
  }

  switch (state.understanding.status) {
    case 'pass_first':
    case 'pass_after_explanation':
      return 'disconnected_passed';
    case 'fail':
      return 'disconnected_failed';
    default:
      return state.understanding.attempts.length === 0
        ? 'disconnected_untested'
        : 'disconnected_testing';
  }
}

/** The continuation is open: passed, opened, not yet closed. */
export function m26ContinuationOpen(state: M26State): boolean {
  return (
    m26Open(state) &&
    state.continuation_opened_at_ms !== null &&
    state.continuation_closed_at_ms === null
  );
}

/** The next report still to deliver, or null when both are delivered. */
export function m26NextReport(state: M26State): M26Report | null {
  return (
    M26_REPORTS.find((report) => state.delivered[report] === undefined) ?? null
  );
}

export function m26AllDelivered(state: M26State): boolean {
  return m26NextReport(state) === null;
}

/**
 * Whether the scripted disconnect is due: after the first successful
 * transmission (on either post), once, while Post A is still connected.
 */
export function m26DisconnectDue(state: M26State): boolean {
  return (
    m26Open(state) &&
    state.first_success_ms !== null &&
    state.disconnected_ms === null
  );
}

/** One transmit attempt on a post. Post B always carries; Post A carries
 * only while connected. Classification follows the knowledge state. */
export function m26Transmit(
  state: M26State,
  channel: M26Channel,
  nowMs: number,
): M26Transmission {
  if (!m26Open(state)) {
    throw new Error('M26: transmit outside the open window');
  }

  const report = m26NextReport(state);
  const connected = channel === 'B' || !m26Disconnected(state);
  const at = elapsed(state, nowMs);
  const inContinuation = m26ContinuationOpen(state);
  const focused = inContinuation
    ? (state.continuationClock?.focusedMs(nowMs) ?? null)
    : null;

  if (connected) {
    if (report !== null) {
      state.delivered[report] = channel;
    }

    if (state.first_success_ms === null) {
      state.first_success_ms = at;
      state.first_success_channel = channel;
    }

    if (channel === 'A') {
      state.successes_on_a_before_disconnect += 1;
    } else if (m26Disconnected(state)) {
      state.b_transmissions_after_disconnect += 1;
      state.alternative_used_ms ??= at;

      if (inContinuation) {
        state.alternative_used_postknowledge += 1;
        state.alternative_used_postknowledge_ms ??= focused;
      }
    }

    const transmission: M26Transmission = {
      channel,
      report,
      delivered: report !== null,
      classification: 'delivered',
      elapsed_ms: at,
      continuation_focused_ms: focused,
    };

    state.transmissions.push(transmission);

    return transmission;
  }

  // Post A after the disconnect: NO CARRIER, classified by knowledge.
  let classification: M26Classification;

  if (inContinuation) {
    classification = 'postknowledge';
    state.postknowledge_retries += 1;
    state.postknowledge_retry_focused_ms.push(focused ?? 0);

    if (report === null) {
      state.postknowledge_retries_after_delivery += 1;
    }
  } else if (state.understanding.status === 'fail') {
    classification = 'after_fail';
    state.attempts_after_fail += 1;
  } else {
    classification = 'pre_knowledge';
    state.pre_knowledge_attempts += 1;
  }

  const transmission: M26Transmission = {
    channel,
    report,
    delivered: false,
    classification,
    elapsed_ms: at,
    continuation_focused_ms: focused,
  };

  state.transmissions.push(transmission);

  return transmission;
}

/** The scripted, visible conduit failure happened (once). */
export function m26Demonstrate(state: M26State, nowMs: number): boolean {
  if (!m26DisconnectDue(state)) {
    return false;
  }

  state.disconnected_ms = elapsed(state, nowMs);

  return true;
}

/** The participant viewed the evidence (panel / post inspection). */
export function m26ViewEvidence(
  state: M26State,
  nowMs: number,
  source: string,
): boolean {
  if (!m26Open(state) || !m26Disconnected(state)) {
    return false;
  }

  state.evidence_views += 1;
  state.first_evidence_ms ??= elapsed(state, nowMs);

  if (!state.evidence_sources.includes(source)) {
    state.evidence_sources.push(source);
  }

  return true;
}

// ——— the expected-outcome test ————————————————————————————————————————

/** The check stage due now (after the demonstrated disconnect), or null. */
export function m26TestDue(state: M26State): UnderstandingStage | null {
  if (!m26Open(state) || !m26Disconnected(state)) {
    return null;
  }

  return understandingDue(state.understanding);
}

export function m26PresentTest(
  state: M26State,
  stage: UnderstandingStage,
  nowMs: number,
): boolean {
  if (m26TestDue(state) !== stage) {
    return false;
  }

  return understandingPresent(state.understanding, stage, nowMs);
}

/** The explanation stage was dismissed; the recheck becomes due. */
export function m26Explained(state: M26State, nowMs: number): boolean {
  return m26Open(state) && understandingExplained(state.understanding, nowMs);
}

/**
 * An answer on the open check stage. A pass opens the continuation at
 * once (its focused clock starts and is registered with the monitor).
 */
export function m26AnswerTest(
  state: M26State,
  optionId: string,
  nowMs: number,
): UnderstandingAnswer {
  if (!m26Open(state)) {
    return { kind: 'refused', reason: 'not_due' };
  }

  const result = understandingAnswer(
    state.understanding,
    M26_UNDERSTANDING_QUESTION,
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
    state.reports_delivered_at_open = Object.keys(state.delivered).length;
  }

  return result;
}

function closeContinuation(
  state: M26State,
  nowMs: number,
  closure: M26ContinuationClosure,
) {
  if (!m26ContinuationOpen(state)) {
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
export function m26ContinuationRemainingMs(
  state: M26State,
  nowMs: number,
): number | null {
  if (!m26ContinuationOpen(state) || state.continuationClock === null) {
    return null;
  }

  return state.continuationClock.remainingMs(nowMs, M26_CAP_MS);
}

/**
 * Host tick: the focused cap closes the continuation (a censoring event,
 * never an action). `retryInProgress` records a transmission still running
 * at the cap — it is never counted.
 */
export function m26Tick(
  state: M26State,
  nowMs: number,
  retryInProgress: boolean,
  switchInProgress = false,
): 'none' | 'cap' {
  if (
    !m26ContinuationOpen(state) ||
    state.continuationClock === null ||
    !state.continuationClock.capReached(nowMs, M26_CAP_MS)
  ) {
    return 'none';
  }

  state.cap_reached = true;
  state.retry_in_progress_at_cap = retryInProgress;
  state.switch_in_progress_at_cap = switchInProgress;
  closeContinuation(state, nowMs, 'cap');

  return 'cap';
}

/** "Step away" at Post A inside the continuation (telemetry only; nothing closes). */
export function m26NoteStepAway(state: M26State): boolean {
  if (!m26ContinuationOpen(state)) {
    return false;
  }

  state.steps_away_in_continuation += 1;

  return true;
}

/**
 * A technical failure ends the window: the continuation's clock is stopped
 * and released (never left registered with the focus monitor).
 */
export function m26Abort(state: M26State, nowMs: number) {
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

/** "Finish at the uplink": the explicit exit inside the continuation. */
export function m26Exit(state: M26State, nowMs: number): boolean {
  if (!m26ContinuationOpen(state)) {
    return false;
  }

  state.exit_ms = elapsed(state, nowMs);

  return closeContinuation(state, nowMs, 'voluntary_stop');
}

/** The posts became unusable (yard left; focus loss is the monitor's): the clock pauses. */
export function m26Pause(state: M26State, cause: PauseCause, nowMs: number) {
  state.continuationClock?.pause(cause, nowMs);
}

export function m26Resume(state: M26State, cause: PauseCause, nowMs: number) {
  state.continuationClock?.resume(cause, nowMs);
}

export function m26Depart(state: M26State): boolean {
  if (!m26Open(state)) {
    return false;
  }

  state.departures += 1;

  return true;
}

/** The route closes the window (Noor's shift end or the review). */
export function m26Close(
  state: M26State,
  choice: Exclude<M26StopChoice, null>,
  nowMs: number,
): boolean {
  if (!m26Open(state)) {
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
 * Register semantics (host applies): complete once the check was PASSED
 * (the continuation exists, however it closed); never disconnected (no
 * successful transmission) → missing; disconnected but the check never
 * decided → invalid (knowledge unverified — attempts stay pre-knowledge);
 * check failed → invalid (`understanding_failed`, the behaviour kept as
 * unqualified). Never a low value.
 */
export type M26Closure =
  | { kind: 'completed' }
  | { kind: 'missing'; detail: string }
  | { kind: 'invalid'; detail: string };

export function m26ClosureDisposition(state: M26State): M26Closure {
  if (!m26Disconnected(state)) {
    return { kind: 'missing', detail: 'channel_never_disconnected' };
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

/** Participant-facing post status line (glyph + text, never colour-only). */
export function m26PostStatus(state: M26State, channel: M26Channel): string {
  if (channel === 'B') {
    return 'LINE B ● CARRIER OK';
  }

  return m26Disconnected(state)
    ? 'LINE A ✕ OPEN — NO CARRIER'
    : 'LINE A ● CARRIER OK';
}

/** Ledger raw components + contextual counts (never a score). */
export function m26RawComponents(state: M26State) {
  return {
    disconnect_demonstrated: m26Disconnected(state),
    disconnect_demonstrated_ms: state.disconnected_ms,
    ...understandingRaw(state.understanding),
    knowledge_state: m26Knowledge(state),
    /** The feature's fact: Post A attempts inside the continuation (the first included). */
    postknowledge_retries: state.postknowledge_retries,
    postknowledge_retries_minus_first: Math.max(
      0,
      state.postknowledge_retries - 1,
    ),
    postknowledge_retry_focused_ms: [...state.postknowledge_retry_focused_ms],
    postknowledge_retries_after_delivery:
      state.postknowledge_retries_after_delivery,
    pre_knowledge_attempts: state.pre_knowledge_attempts,
    attempts_after_fail: state.attempts_after_fail,
    continuation_opened: state.continuation_opened_at_ms !== null,
    continuation_closure: state.continuation_closure,
    continuation_focused_ms: state.continuation_focused_ms,
    continuation_wall_ms: state.continuation_wall_ms,
    continuation_cap_ms: M26_CAP_MS,
    cap_reached: state.cap_reached,
    retry_in_progress_at_cap: state.retry_in_progress_at_cap,
    switch_in_progress_at_cap: state.switch_in_progress_at_cap,
    steps_away_in_continuation: state.steps_away_in_continuation,
    reports_delivered_at_open: state.reports_delivered_at_open,
    /** A report the brief listed was still undelivered when the window closed. */
    report_pending_at_close: state.closed && !m26AllDelivered(state),
    exited: state.exit_ms !== null,
    exit_ms: state.exit_ms,
    alternative_used: state.alternative_used_postknowledge > 0,
    alternative_used_postknowledge: state.alternative_used_postknowledge,
    alternative_used_postknowledge_ms: state.alternative_used_postknowledge_ms,
    alternative_used_any_ms: state.alternative_used_ms,
    b_transmissions_after_disconnect: state.b_transmissions_after_disconnect,
    // Contextual.
    evidence_views: state.evidence_views,
    evidence_sources: [...state.evidence_sources],
    first_evidence_ms: state.first_evidence_ms,
    first_success_ms: state.first_success_ms,
    first_success_channel: state.first_success_channel,
    successes_on_a_before_disconnect: state.successes_on_a_before_disconnect,
    reports_delivered: { ...state.delivered },
    all_reports_delivered: m26AllDelivered(state),
    transmissions: state.transmissions.map((entry) => ({ ...entry })),
    departures: state.departures,
    stop_choice: state.stop_choice,
  };
}
