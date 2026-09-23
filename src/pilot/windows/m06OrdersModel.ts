/**
 * M06 — Efficiency: the timed work-period model of the dispatch console
 * (Station 080 M01–M26 run, Unit 7). PURE (no Phaser, no runtime import):
 * the window adapter (`m06RoutineDispatch.ts`) owns the register window
 * and injects the log sink; the surface calls the commands below with
 * their input mode.
 *
 * Approved design (register M06 row, "Redesign"): after the non-scored
 * practice, twelve simple orders in ONE standard 60-second FOCUSED work
 * budget; each order counts once when sent correctly; a correction
 * consumes the same budget; an explicit early stop closes the period
 * without shortening the denominator. Focused time pauses under a closed
 * surface and documented loss of focus (never behind a closed panel).
 *
 * Mechanic: the two practice lines of the v2 console are kept (tokens or
 * typed; each sent correctly once — the practice criterion). Then a READY
 * screen states the budget; "Begin the work period" starts the focused
 * clock and presents order 1 of 12. Orders arrive one at a time in the
 * assigned form order (form B is a permutation of form A's twelve lines —
 * matched content); Dispatch compares the buffer with the current order:
 * a match counts the order (once) and presents the next; a mismatch
 * leaves the order for correction (a further dispatch of the same order
 * is rework); "Skip order" moves on without credit. The period ends at
 * the budget, at the explicit stop, or when all twelve orders are
 * handled; a buffer left unsent is discarded, never a dispatch.
 *
 * Measure (register `m06_unique_correct_orders`): distinct orders whose
 * matching dispatch fell inside the budget (0–12); companion
 * `m06_work_period_detail` (first-pass accuracy, rework, skips, invalid
 * dispatches, actual stop time, stop kind, per-order records). Speed is
 * never a feature; nothing here is a score.
 */
import { FocusedClock } from '../../measurement/focusedClock';
import {
  registerFocusedClock,
  releaseFocusedClock,
} from '../../measurement/focusMonitor';
import { PILOT_SETTINGS } from '../../measurement/protocol';

export const M06_OPPORTUNITY_ID = 'proto_m06_work_period';
export const M06_WINDOW_ID = 'm06_orders_w1';
export const M06_ENTRY_STATE_VERSION = 'm06-orders-v1';
export const M06_FAMILY = 'proto_m06_orders_';

/** One standard focused work budget (pilot default). */
export const M06_BUDGET_MS = PILOT_SETTINGS.m06_work_budget_ms;
/** Orders offered inside the budget. */
export const M06_ORDER_COUNT = PILOT_SETTINGS.m06_orders;
/**
 * Settle window after a screen change (review U4 / U5 / U6 precedent): a
 * press arriving within it is a carried or double-tapped press from the
 * previous screen, never a read response — logged and refused.
 */
export const M06_SETTLE_MS = 400;
/**
 * "Stop work" is two presses: the first arms the stop (the control reads
 * "Confirm stop"), the second within this window ends the period; any
 * other action disarms it (review U7 G-F2 — a single keystroke beside
 * Dispatch ended the period for good).
 */
export const M06_STOP_CONFIRM_MS = 3_000;

export type M06Form = 'form_a' | 'form_b';

export const M06_VERBS = ['SET', 'OPEN', 'HOLD', 'ROUTE'] as const;
export const M06_TARGETS = ['PUMP-2', 'VALVE-C', 'BUS-1', 'RELAY-N'] as const;
export const M06_VALUES = ['LOW', 'HIGH', 'AUTO', 'OFF'] as const;

export type M06Line = readonly [string, string, string];

/** Non-scored practice (each line sent correctly once — the criterion). */
export const M06_PRACTICE_LINES: readonly M06Line[] = [
  ['OPEN', 'VALVE-C', 'AUTO'],
  ['HOLD', 'BUS-1', 'LOW'],
];

/** Form A: twelve distinct orders; every token appears three times. */
const FORM_A_ORDERS: readonly M06Line[] = [
  ['SET', 'PUMP-2', 'HIGH'],
  ['ROUTE', 'RELAY-N', 'AUTO'],
  ['HOLD', 'VALVE-C', 'OFF'],
  ['OPEN', 'BUS-1', 'LOW'],
  ['SET', 'RELAY-N', 'OFF'],
  ['OPEN', 'PUMP-2', 'AUTO'],
  ['ROUTE', 'BUS-1', 'HIGH'],
  ['HOLD', 'RELAY-N', 'LOW'],
  ['OPEN', 'VALVE-C', 'HIGH'],
  ['SET', 'BUS-1', 'AUTO'],
  ['ROUTE', 'PUMP-2', 'OFF'],
  ['HOLD', 'VALVE-C', 'LOW'],
];

/**
 * Form B is a fixed permutation of the same twelve orders (matched
 * content, different sequence), so both forms have identical difficulty
 * by construction.
 */
const FORM_B_PERMUTATION: readonly number[] = [
  6, 1, 9, 4, 11, 0, 7, 10, 2, 8, 5, 3,
];

export function m06OrdersFor(form: M06Form): readonly M06Line[] {
  return form === 'form_a'
    ? FORM_A_ORDERS
    : FORM_B_PERMUTATION.map((index) => FORM_A_ORDERS[index]);
}

export type M06Phase = 'practice' | 'ready' | 'work' | 'done';
export type M06InputMode = 'pointer' | 'keyboard' | 'system';
export type M06LogSink = (
  suffix: string,
  metadata: Record<string, unknown>,
) => void;

/** How the work period ended — kept beside the count, never merged. */
export type M06StopKind =
  /** The 60 s focused budget ran out. */
  | 'budget'
  /** "Stop work" pressed before the budget ran out. */
  | 'explicit'
  /** Every order was sent correctly or skipped before the budget ran out. */
  | 'all_orders'
  /** Every order was skipped without a single dispatch (review U7 S-F7). */
  | 'all_skipped'
  /** The Utility Deck review closed an open period. */
  | 'review'
  /** A reload or technical fault closed the record. */
  | 'reload';

export interface M06Dispatch {
  attempt: number;
  line: string[];
  correct: boolean;
  focused_ms: number;
  within_budget: boolean;
  input_mode: M06InputMode;
}

export interface M06Order {
  index: number;
  line: M06Line;
  presented_at_focused_ms: number | null;
  /** Wall time of the presentation (the skip control's settle reference). */
  presented_at_ms: number | null;
  dispatches: M06Dispatch[];
  /** Focused ms of the matching dispatch (null while not yet correct). */
  correct_at_focused_ms: number | null;
  first_pass_correct: boolean | null;
  skipped: boolean;
}

export interface M06State {
  form: M06Form;
  phase: M06Phase;
  buffer: string[];
  practiceSent: number;
  practiceAttempts: { line: string[]; correct: boolean }[];
  practicePassed: boolean;
  readyShownAtMs: number | null;
  /** Presses refused inside the ready screen's settle window. */
  refusedPresses: number;
  beganAtMs: number | null;
  /** Focused clock of the work budget (null before begin / after the end). */
  clock: FocusedClock | null;
  orders: M06Order[];
  /** Index of the current order (M06_ORDER_COUNT once all are handled). */
  current: number;
  tokenPresses: number;
  tokensRemoved: number;
  clears: number;
  referenceConsults: number;
  typedLines: number;
  /** The most recent dispatch (shown on the surface until the next one). */
  lastDispatch: {
    phase: 'practice' | 'work';
    order_index: number | null;
    line: string[];
    correct: boolean;
  } | null;
  /** Wall time the stop was armed (null when not armed). */
  stopArmedAtMs: number | null;
  stopArmPresses: number;
  /** Wall time of the first practice token press and of the criterion. */
  practiceStartedAtMs: number | null;
  practicePassedAtMs: number | null;
  /** Every reopen of a paused period, with the route stage the host reported (review U7 S-F5). */
  resumptions: {
    at_ms: number;
    focused_ms: number | null;
    stage: string | null;
  }[];
  /** Focused ms past the budget when the tick closed it (never counted). */
  budgetOverrunMs: number | null;
  stopKind: M06StopKind | null;
  closureReason: string | null;
  actualStopFocusedMs: number | null;
  focusedMs: number | null;
  wallMs: number | null;
  excludedMs: Record<string, number> | null;
  bufferDiscardedAtEnd: string[] | null;
}

export function createM06State(form: M06Form): M06State {
  return {
    form,
    phase: 'practice',
    buffer: [],
    practiceSent: 0,
    practiceAttempts: [],
    practicePassed: false,
    readyShownAtMs: null,
    refusedPresses: 0,
    beganAtMs: null,
    clock: null,
    orders: m06OrdersFor(form).map((line, index) => ({
      index,
      line,
      presented_at_focused_ms: null,
      presented_at_ms: null,
      dispatches: [],
      correct_at_focused_ms: null,
      first_pass_correct: null,
      skipped: false,
    })),
    current: 0,
    tokenPresses: 0,
    tokensRemoved: 0,
    clears: 0,
    referenceConsults: 0,
    typedLines: 0,
    lastDispatch: null,
    stopArmedAtMs: null,
    stopArmPresses: 0,
    practiceStartedAtMs: null,
    practicePassedAtMs: null,
    resumptions: [],
    budgetOverrunMs: null,
    stopKind: null,
    closureReason: null,
    actualStopFocusedMs: null,
    focusedMs: null,
    wallMs: null,
    excludedMs: null,
    bufferDiscardedAtEnd: null,
  };
}

// ——— derived readers ————————————————————————————————————————————————

/** The line the reference currently asks for (null on the ready / done screens). */
export function m06CurrentLine(s: M06State): M06Line | null {
  if (s.phase === 'practice') {
    return M06_PRACTICE_LINES[s.practiceSent] ?? null;
  }

  if (s.phase === 'work') {
    return s.orders[s.current]?.line ?? null;
  }

  return null;
}

export function m06CurrentOrder(s: M06State): M06Order | null {
  return s.phase === 'work' ? (s.orders[s.current] ?? null) : null;
}

/** Orders whose matching dispatch fell inside the budget (the primary). */
export function m06UniqueCorrect(s: M06State): number {
  return s.orders.filter(
    (order) =>
      order.correct_at_focused_ms !== null &&
      order.correct_at_focused_ms <= M06_BUDGET_MS,
  ).length;
}

export function m06Begun(s: M06State): boolean {
  return s.beganAtMs !== null;
}

/** Focused ms of the work budget so far (frozen at the end; null before begin). */
export function m06FocusedMs(s: M06State, nowMs: number): number | null {
  if (s.clock === null) {
    return s.focusedMs;
  }

  return s.clock.focusedMs(nowMs);
}

export function m06RemainingMs(s: M06State, nowMs: number): number | null {
  return s.phase === 'work' && s.clock !== null
    ? s.clock.remainingMs(nowMs, M06_BUDGET_MS)
    : null;
}

/** The surface is paused (closed) — no dispatch can be sent. */
export function m06Paused(s: M06State): boolean {
  return s.clock !== null && s.clock.isPaused();
}

/**
 * Reload guard (register §5.14): true when an earlier page load of this
 * identity already opened the console. It is then never re-run — a
 * reload never creates a fresh work period.
 */
export function m06PriorAdministration(
  priorLoadEvents: readonly { event_type: string }[],
): boolean {
  return priorLoadEvents.some(
    (event) => event.event_type === `${M06_FAMILY}opportunity_opened`,
  );
}

export function m06EntrySnapshot(form: M06Form) {
  return {
    form,
    practice_lines: M06_PRACTICE_LINES.length,
    orders: M06_ORDER_COUNT,
    budget_ms: M06_BUDGET_MS,
    settle_ms: M06_SETTLE_MS,
    tokens: {
      verbs: M06_VERBS.length,
      targets: M06_TARGETS.length,
      values: M06_VALUES.length,
    },
    send_animation: false,
    time_left_shown: true,
    payment_fixed: true,
    route_fixed: true,
  };
}

// ——— buffer commands (practice and work) ————————————————————————————

function composing(s: M06State): boolean {
  return (
    (s.phase === 'practice' || s.phase === 'work') &&
    !(s.phase === 'work' && m06Paused(s))
  );
}

/**
 * The token row the next press belongs to (0 verbs, 1 targets, 2 values;
 * null when the buffer is full). The surface gives that row's tokens the
 * digit hotkeys 1–4, so a keyboard order costs three digits and D — the
 * pointer's four clicks (review U7 S-F1 / G-F7).
 */
export function m06ActiveRow(s: M06State): 0 | 1 | 2 | null {
  return s.buffer.length >= 3 ? null : (s.buffer.length as 0 | 1 | 2);
}

export function m06PressToken(
  s: M06State,
  token: string,
  inputMode: M06InputMode,
  log: M06LogSink,
): boolean {
  if (!composing(s)) {
    return false;
  }

  if (s.phase === 'practice' && s.practiceStartedAtMs === null) {
    // The practice duration is a pointer/keyboard fluency baseline; the
    // model has no clock here, so the adapter's wall time arrives with the
    // first dispatch — recorded then (see dispatchPractice).
    s.practiceStartedAtMs = -1;
  }

  if (s.buffer.length >= 3) {
    log('token_refused', {
      token,
      reason: 'buffer_full',
      phase: s.phase,
      input_mode: inputMode,
    });

    return false;
  }

  disarmStop(s, log);
  s.buffer.push(token);
  s.tokenPresses += 1;
  log('token_pressed', {
    token,
    buffer: [...s.buffer],
    phase: s.phase,
    order_index: s.phase === 'work' ? s.current : null,
    input_mode: inputMode,
  });

  return true;
}

/** "Back": removes the last token of the buffer (review U7 G-F5). */
export function m06RemoveLastToken(
  s: M06State,
  inputMode: M06InputMode,
  log: M06LogSink,
): boolean {
  if (!composing(s) || s.buffer.length === 0) {
    return false;
  }

  disarmStop(s, log);

  const token = s.buffer.pop();

  s.tokensRemoved += 1;
  log('token_removed', {
    token,
    buffer: [...s.buffer],
    phase: s.phase,
    order_index: s.phase === 'work' ? s.current : null,
    input_mode: inputMode,
  });

  return true;
}

/** Any action other than a second Stop press disarms an armed stop. */
function disarmStop(s: M06State, log: M06LogSink) {
  if (s.stopArmedAtMs === null) {
    return;
  }

  s.stopArmedAtMs = null;
  log('stop_disarmed', { input_mode: 'system' });
}

/** True while an armed stop awaits its confirming press. */
export function m06StopArmed(s: M06State, nowMs: number): boolean {
  return (
    s.stopArmedAtMs !== null && nowMs - s.stopArmedAtMs < M06_STOP_CONFIRM_MS
  );
}

/** Optional typed entry: the whole line at once (semantic equivalence). */
export function m06TypeLine(
  s: M06State,
  text: string,
  inputMode: M06InputMode,
  log: M06LogSink,
): boolean {
  const tokens = text.trim().toUpperCase().split(/\s+/).filter(Boolean);

  // Exactly three tokens: a longer line is never silently truncated into
  // a match (review U7 S-F11).
  if (!composing(s) || tokens.length !== 3) {
    return false;
  }

  disarmStop(s, log);
  s.buffer = tokens;
  s.tokenPresses += tokens.length;
  s.typedLines += 1;
  log('line_typed', {
    buffer: [...s.buffer],
    phase: s.phase,
    order_index: s.phase === 'work' ? s.current : null,
    input_mode: inputMode,
  });

  return true;
}

export function m06ClearBuffer(
  s: M06State,
  inputMode: M06InputMode,
  log: M06LogSink,
): boolean {
  if (!composing(s) || s.buffer.length === 0) {
    return false;
  }

  disarmStop(s, log);
  s.buffer = [];
  s.clears += 1;
  log('buffer_cleared', { phase: s.phase, input_mode: inputMode });

  return true;
}

export function m06ConsultReference(
  s: M06State,
  inputMode: M06InputMode,
  log: M06LogSink,
) {
  s.referenceConsults += 1;
  log('reference_consulted', {
    consults: s.referenceConsults,
    phase: s.phase,
    input_mode: inputMode,
  });
}

function sameLine(a: readonly string[], b: readonly string[]): boolean {
  return a.length === 3 && b.length === 3 && a.every((t, i) => t === b[i]);
}

// ——— practice ———————————————————————————————————————————————————————

function dispatchPractice(
  s: M06State,
  nowMs: number,
  inputMode: M06InputMode,
  log: M06LogSink,
): 'practice_correct' | 'practice_incorrect' {
  const line = [...s.buffer];
  const expected = m06CurrentLine(s);
  const correct = expected !== null && sameLine(line, expected);

  if (s.practiceAttempts.length === 0) {
    // First practice dispatch: the practice clock's reference (wall time).
    s.practiceStartedAtMs = nowMs;
  }

  s.buffer = [];
  s.lastDispatch = { phase: 'practice', order_index: null, line, correct };
  s.practiceAttempts.push({ line, correct });
  log('practice_dispatched', {
    line,
    matches_reference: correct,
    practice_index: s.practiceSent,
    phase: 'practice',
    input_mode: inputMode,
  });

  // Practice criterion: each practice line sent correctly once (retry
  // the same line until it matches — non-scored).
  if (correct) {
    s.practiceSent += 1;
  }

  if (s.practiceSent >= M06_PRACTICE_LINES.length) {
    s.practicePassed = true;
    s.practicePassedAtMs = nowMs;
    s.phase = 'ready';
    s.readyShownAtMs = nowMs;
    log('practice_passed', {
      practice_attempts: s.practiceAttempts.length,
      input_mode: 'system',
    });
    log('ready_shown', {
      budget_ms: M06_BUDGET_MS,
      orders: M06_ORDER_COUNT,
      input_mode: 'system',
    });
  }

  return correct ? 'practice_correct' : 'practice_incorrect';
}

// ——— the work period ————————————————————————————————————————————————

function presentCurrentOrder(s: M06State, nowMs: number, log: M06LogSink) {
  const order = s.orders[s.current];

  if (order === undefined || s.clock === null) {
    return;
  }

  order.presented_at_focused_ms = s.clock.focusedMs(nowMs);
  order.presented_at_ms = nowMs;
  log('order_presented', {
    order_index: order.index,
    line: [...order.line],
    focused_ms: order.presented_at_focused_ms,
    input_mode: 'system',
  });
}

export type M06BeginResult = 'begun' | 'refused' | 'invalid';

/**
 * "Begin the work period": starts the focused budget and presents the
 * first order. A press inside the ready screen's settle window is a
 * carried press from the last practice dispatch — refused.
 */
export function m06Begin(
  s: M06State,
  nowMs: number,
  inputMode: M06InputMode,
  log: M06LogSink,
): M06BeginResult {
  if (s.phase !== 'ready') {
    return 'invalid';
  }

  const since = s.readyShownAtMs === null ? null : nowMs - s.readyShownAtMs;

  if (since !== null && since < M06_SETTLE_MS) {
    s.refusedPresses += 1;
    log('press_refused', {
      control: 'begin',
      reason: 'ready_screen_settling',
      since_shown_ms: since,
      settle_ms: M06_SETTLE_MS,
      input_mode: inputMode,
    });

    return 'refused';
  }

  const clock = new FocusedClock();

  clock.start(nowMs);
  registerFocusedClock(clock);
  s.clock = clock;
  s.phase = 'work';
  s.beganAtMs = nowMs;
  s.buffer = [];
  log('period_begun', {
    budget_ms: M06_BUDGET_MS,
    orders: M06_ORDER_COUNT,
    phase: 'measurement',
    input_mode: inputMode,
  });
  presentCurrentOrder(s, nowMs, log);

  return 'begun';
}

function endPeriod(
  s: M06State,
  nowMs: number,
  stopKind: M06StopKind,
  closureReason: string,
  log: M06LogSink | null,
) {
  if (s.clock !== null) {
    s.clock.stop(nowMs);
    releaseFocusedClock(s.clock);

    const snap = s.clock.snapshot(nowMs);

    s.focusedMs = snap.focused_ms;
    s.wallMs = snap.wall_ms;
    s.excludedMs = snap.excluded_ms;
    // The budget end is the budget: the tick's overrun (≤ one tick) is
    // recorded beside, never as exposure (review U7 S-F11).
    s.actualStopFocusedMs =
      stopKind === 'budget'
        ? Math.min(snap.focused_ms, M06_BUDGET_MS)
        : snap.focused_ms;
    s.budgetOverrunMs =
      stopKind === 'budget'
        ? Math.max(0, snap.focused_ms - M06_BUDGET_MS)
        : null;
    s.clock = null;
  }

  s.bufferDiscardedAtEnd = s.buffer.length > 0 ? [...s.buffer] : null;
  s.buffer = [];
  s.stopArmedAtMs = null;
  s.stopKind = stopKind;
  s.closureReason = closureReason;
  s.phase = 'done';

  if (log !== null) {
    log('period_ended', {
      stop_kind: stopKind,
      unique_correct_orders: m06UniqueCorrect(s),
      orders_handled: s.current,
      actual_stop_focused_ms: s.actualStopFocusedMs,
      wall_ms: s.wallMs,
      budget_ms: M06_BUDGET_MS,
      buffer_discarded: s.bufferDiscardedAtEnd,
      input_mode: 'system',
    });
  }
}

/**
 * Surface tick: the budget end closes the period (`budget`). Returns
 * what happened so the surface can re-render.
 */
export function m06Tick(
  s: M06State,
  nowMs: number,
  log: M06LogSink,
): 'none' | 'budget' {
  if (
    s.phase !== 'work' ||
    s.clock === null ||
    !s.clock.capReached(nowMs, M06_BUDGET_MS)
  ) {
    return 'none';
  }

  endPeriod(s, nowMs, 'budget', 'completed', log);

  return 'budget';
}

function advance(
  s: M06State,
  nowMs: number,
  log: M06LogSink,
): 'next' | 'all_orders' {
  s.current += 1;

  if (s.current >= M06_ORDER_COUNT) {
    // Twelve skips without one dispatch are not a completed work period
    // (review U7 S-F7): a distinct stop kind, a voluntary closure.
    const attempted = s.orders.some((order) => order.dispatches.length > 0);

    endPeriod(
      s,
      nowMs,
      attempted ? 'all_orders' : 'all_skipped',
      attempted ? 'completed' : 'voluntary_stop',
      log,
    );

    return 'all_orders';
  }

  presentCurrentOrder(s, nowMs, log);

  return 'next';
}

export type M06DispatchResult =
  | 'practice_correct'
  | 'practice_incorrect'
  | 'correct'
  | 'incorrect'
  | 'all_orders'
  | 'budget'
  | 'refused';

/**
 * Dispatch the buffer. In practice: the criterion. In the work period: a
 * match counts the order once and presents the next; a mismatch leaves
 * the order for correction (rework). The budget is checked first, so no
 * dispatch can land past it.
 */
export function m06Dispatch(
  s: M06State,
  nowMs: number,
  inputMode: M06InputMode,
  log: M06LogSink,
): M06DispatchResult {
  if (s.phase === 'practice') {
    if (s.buffer.length === 0) {
      return 'refused';
    }

    return dispatchPractice(s, nowMs, inputMode, log);
  }

  if (s.phase !== 'work' || m06Paused(s) || s.buffer.length === 0) {
    return 'refused';
  }

  disarmStop(s, log);

  if (m06Tick(s, nowMs, log) === 'budget') {
    return 'budget';
  }

  const order = s.orders[s.current];

  if (order === undefined || s.clock === null) {
    return 'refused';
  }

  const line = [...s.buffer];
  const correct = sameLine(line, order.line);

  s.lastDispatch = { phase: 'work', order_index: order.index, line, correct };
  const focused = s.clock.focusedMs(nowMs);
  const dispatch: M06Dispatch = {
    attempt: order.dispatches.length + 1,
    line,
    correct,
    focused_ms: focused,
    within_budget: focused <= M06_BUDGET_MS,
    input_mode: inputMode,
  };

  s.buffer = [];
  order.dispatches.push(dispatch);

  if (dispatch.attempt === 1) {
    order.first_pass_correct = correct;
  }

  if (correct) {
    order.correct_at_focused_ms = focused;
  }

  log('order_dispatched', {
    order_index: order.index,
    line,
    correct,
    attempt: dispatch.attempt,
    focused_ms: focused,
    within_budget: dispatch.within_budget,
    unique_correct_orders: m06UniqueCorrect(s),
    phase: 'measurement',
    input_mode: inputMode,
  });

  if (!correct) {
    return 'incorrect';
  }

  return advance(s, nowMs, log) === 'all_orders' ? 'all_orders' : 'correct';
}

export type M06SkipResult = 'skipped' | 'all_orders' | 'budget' | 'refused';

/** "Skip order": the current order is passed over without credit (never revisited). */
export function m06Skip(
  s: M06State,
  nowMs: number,
  inputMode: M06InputMode,
  log: M06LogSink,
): M06SkipResult {
  if (s.phase !== 'work' || m06Paused(s)) {
    return 'refused';
  }

  disarmStop(s, log);

  if (m06Tick(s, nowMs, log) === 'budget') {
    return 'budget';
  }

  const order = s.orders[s.current];

  if (order === undefined || s.clock === null) {
    return 'refused';
  }

  // A skip inside the settle window after the order appeared is a carried
  // or double-tapped press, never a decision about THIS order (review U7
  // G-F8: a double press skipped two orders).
  const since =
    order.presented_at_ms === null ? null : nowMs - order.presented_at_ms;

  if (since !== null && since < M06_SETTLE_MS) {
    s.refusedPresses += 1;
    log('press_refused', {
      control: 'skip',
      reason: 'order_settling',
      order_index: order.index,
      since_presented_ms: since,
      settle_ms: M06_SETTLE_MS,
      input_mode: inputMode,
    });

    return 'refused';
  }

  order.skipped = true;
  s.buffer = [];
  log('order_skipped', {
    order_index: order.index,
    dispatches_before_skip: order.dispatches.length,
    focused_ms: s.clock.focusedMs(nowMs),
    input_mode: inputMode,
  });

  return advance(s, nowMs, log) === 'all_orders' ? 'all_orders' : 'skipped';
}

export type M06StopResult = 'armed' | 'stopped' | 'budget' | 'refused';

/**
 * "Stop work": the explicit early stop (the denominator stays the budget).
 * Two presses: the first arms ("Confirm stop"), the second inside
 * `M06_STOP_CONFIRM_MS` stops; any other action disarms.
 */
export function m06Stop(
  s: M06State,
  nowMs: number,
  inputMode: M06InputMode,
  log: M06LogSink,
): M06StopResult {
  if (s.phase !== 'work' || m06Paused(s)) {
    return 'refused';
  }

  if (m06Tick(s, nowMs, log) === 'budget') {
    return 'budget';
  }

  if (!m06StopArmed(s, nowMs)) {
    s.stopArmedAtMs = nowMs;
    s.stopArmPresses += 1;
    log('stop_armed', {
      confirm_ms: M06_STOP_CONFIRM_MS,
      arm_presses: s.stopArmPresses,
      focused_ms: s.clock?.focusedMs(nowMs) ?? null,
      input_mode: inputMode,
    });

    return 'armed';
  }

  log('stopped', {
    unique_correct_orders: m06UniqueCorrect(s),
    orders_handled: s.current,
    focused_ms: s.clock?.focusedMs(nowMs) ?? null,
    input_mode: inputMode,
  });
  endPeriod(s, nowMs, 'explicit', 'voluntary_stop', log);

  return 'stopped';
}

/** The surface was closed (ESC / Leave): the budget pauses. */
export function m06SurfaceClosed(s: M06State, nowMs: number, log: M06LogSink) {
  s.clock?.pause('surface_closed', nowMs);
  log('surface_closed', {
    phase: s.phase,
    orders_handled: s.current,
    input_mode: 'system',
  });
}

/**
 * The surface reopened: a paused budget resumes. The host reports the
 * route stage so a period split across episodes is visible in the data
 * (review U7 S-F5).
 */
export function m06SurfaceReopened(
  s: M06State,
  nowMs: number,
  log: M06LogSink,
  stage: string | null = null,
) {
  s.clock?.resume('surface_closed', nowMs);

  if (s.phase === 'work') {
    s.resumptions.push({
      at_ms: nowMs,
      focused_ms: s.clock?.focusedMs(nowMs) ?? null,
      stage,
    });
  }

  log('surface_reopened', {
    phase: s.phase,
    orders_handled: s.current,
    stage,
    resumptions: s.resumptions.length,
    input_mode: 'system',
  });
}

/**
 * Freezes the period without completing anything (the review, a reload,
 * a reset). The stop kind names the closure.
 */
export function m06Freeze(
  s: M06State,
  nowMs: number,
  closureReason: string,
  stopKind: M06StopKind | null,
) {
  if (s.phase === 'done') {
    return;
  }

  endPeriod(s, nowMs, stopKind ?? 'review', closureReason, null);
}

/** Item-owned raw components (state description — never a score). */
export function m06RawComponents(
  s: M06State,
  closureReason: string,
  nowMs: number,
) {
  const attempted = s.orders.filter((order) => order.dispatches.length > 0);
  const firstPassCorrect = attempted.filter(
    (order) => order.first_pass_correct === true,
  ).length;
  const rework = s.orders.reduce(
    (sum, order) => sum + Math.max(0, order.dispatches.length - 1),
    0,
  );
  const invalid = s.orders.reduce(
    (sum, order) =>
      sum + order.dispatches.filter((dispatch) => !dispatch.correct).length,
    0,
  );
  const dispatchInputModes: Record<M06InputMode, number> = {
    pointer: 0,
    keyboard: 0,
    system: 0,
  };

  for (const order of s.orders) {
    for (const dispatch of order.dispatches) {
      dispatchInputModes[dispatch.input_mode] += 1;
    }
  }

  return {
    form: s.form,
    practice_lines: M06_PRACTICE_LINES.length,
    practice_attempts: s.practiceAttempts.length,
    practice_passed: s.practicePassed,
    /** Wall ms from the first practice dispatch to the criterion (a fluency baseline). */
    practice_wall_ms:
      s.practiceStartedAtMs === null ||
      s.practiceStartedAtMs < 0 ||
      s.practicePassedAtMs === null
        ? null
        : s.practicePassedAtMs - s.practiceStartedAtMs,
    dispatch_input_modes: dispatchInputModes,
    resumptions: s.resumptions.map((resumption) => ({ ...resumption })),
    budget_overrun_ms: s.budgetOverrunMs,
    ready_shown: s.readyShownAtMs !== null,
    refused_presses: s.refusedPresses,
    period_begun: m06Begun(s),
    budget_ms: M06_BUDGET_MS,
    orders_planned: M06_ORDER_COUNT,
    orders_presented: s.orders.filter(
      (order) => order.presented_at_focused_ms !== null,
    ).length,
    orders_handled: Math.min(s.current, M06_ORDER_COUNT),
    orders_attempted: attempted.length,
    unique_correct_orders: m06UniqueCorrect(s),
    first_pass_correct: firstPassCorrect,
    first_pass_accuracy:
      attempted.length === 0 ? null : firstPassCorrect / attempted.length,
    rework_dispatches: rework,
    invalid_dispatches: invalid,
    orders_skipped: s.orders.filter((order) => order.skipped).length,
    stop_kind: s.stopKind,
    actual_stop_focused_ms: s.actualStopFocusedMs ?? m06FocusedMs(s, nowMs),
    focused_ms: s.focusedMs ?? m06FocusedMs(s, nowMs),
    wall_ms: s.wallMs ?? (s.clock === null ? null : s.clock.wallMs(nowMs)),
    excluded_ms: s.excludedMs ?? s.clock?.excludedMs(nowMs) ?? null,
    buffer_discarded_at_end: s.bufferDiscardedAtEnd,
    token_presses: s.tokenPresses,
    tokens_removed: s.tokensRemoved,
    stop_arm_presses: s.stopArmPresses,
    clears: s.clears,
    reference_consults: s.referenceConsults,
    typed_lines: s.typedLines,
    orders: s.orders.map((order) => ({
      index: order.index,
      line: [...order.line],
      presented_at_focused_ms: order.presented_at_focused_ms,
      dispatches: order.dispatches.map((dispatch) => ({ ...dispatch })),
      correct_at_focused_ms: order.correct_at_focused_ms,
      first_pass_correct: order.first_pass_correct,
      skipped: order.skipped,
    })),
    send_animation: false,
    closure_reason: closureReason,
  };
}
