/**
 * M06 — window adapter of the dispatch console's timed work period
 * (Station 080 M01–M26 run, Unit 7). Owns the register window and the
 * session-scope model state; every command delegates to the pure model
 * (`m06OrdersModel.ts`) and logs through the window's `proto_m06_orders_*`
 * family with the protocol stamp.
 *
 * Closure rules: the budget end, the explicit stop and "all twelve
 * handled" complete the window with distinct stop kinds (the denominator
 * is always the 60 s budget); ESC / Leave pauses the budget and the reopen
 * resumes it; the review censors an open period with the count as it
 * stands and marks a never-opened console absent; a console opened in an
 * earlier page load is never re-run (reload guard). The v2 four-line task
 * (`proto_m06_dispatch_*`) keeps its v2 meaning in the frozen ledger and
 * is no longer on the route.
 */
import { protocolStamp } from '../../measurement/protocol';
import { researchRuntime } from '../../systems';
import {
  createM06State,
  M06_ENTRY_STATE_VERSION,
  M06_FAMILY,
  M06_OPPORTUNITY_ID,
  M06_WINDOW_ID,
  m06Begin,
  type M06BeginResult,
  m06ClearBuffer,
  m06ConsultReference,
  m06Dispatch,
  type M06DispatchResult,
  m06EntrySnapshot,
  type M06Form,
  m06Freeze,
  type M06LogSink,
  m06PressToken,
  m06PriorAdministration,
  m06RawComponents,
  m06RemoveLastToken,
  m06Skip,
  type M06SkipResult,
  type M06State,
  m06Stop,
  type M06StopResult,
  m06SurfaceClosed,
  m06SurfaceReopened,
  m06Tick,
  m06TypeLine,
} from './m06OrdersModel';
import {
  assignCounterbalance,
  currentSessionId,
  type InputMode,
  ItemWindow,
} from './windowKit';

export {
  M06_BUDGET_MS,
  M06_FAMILY,
  M06_OPPORTUNITY_ID,
  M06_ORDER_COUNT,
  M06_PRACTICE_LINES,
  M06_SETTLE_MS,
  M06_STOP_CONFIRM_MS,
  M06_TARGETS,
  M06_VALUES,
  M06_VERBS,
  M06_WINDOW_ID,
  m06ActiveRow,
  m06CurrentLine,
  m06CurrentOrder,
  m06FocusedMs,
  m06OrdersFor,
  m06Paused,
  m06RemainingMs,
  m06StopArmed,
  m06UniqueCorrect,
} from './m06OrdersModel';

export const M06_PRIOR_ADMINISTRATION = 'prior_administration';

let state: M06State | null = null;

function ensureState(): M06State {
  if (state === null) {
    state = createM06State(
      assignCounterbalance<M06Form>(currentSessionId(), 'm06_orders_form', [
        'form_a',
        'form_b',
      ]),
    );
  }

  return state;
}

export const m06Window = new ItemWindow({
  item: 'M06',
  opportunityId: M06_OPPORTUNITY_ID,
  windowId: M06_WINDOW_ID,
  entryStateVersion: M06_ENTRY_STATE_VERSION,
  family: M06_FAMILY,
  scene: 'records_workshop',
  objectId: 'm06_dispatch_console',
});

const sink: M06LogSink = (suffix, metadata) => {
  m06Window.log(suffix, { ...protocolStamp(), ...metadata });
};

export function declareM06() {
  const s = ensureState();

  m06Window.spec.form = s.form;
  m06Window.spec.counterbalance = s.form;
  m06Window.declare();
}

export function m06State(): Readonly<M06State> {
  return ensureState();
}

/** True when the console was administered in an earlier page load. */
export function m06AdministeredBefore(): boolean {
  return ensureState().closureReason === M06_PRIOR_ADMINISTRATION;
}

/**
 * The console was PRESENTED: the Work Order Board's briefing lists the
 * dispatch lines. Logged once; a presented-but-never-opened console is
 * `declined` at extraction.
 */
export function presentM06(nowMs: number) {
  declareM06();
  m06Window.present(nowMs, m06EntrySnapshot(ensureState().form));
}

/**
 * Opens (or reopens) the console. `entry` carries what the host scene knows
 * at the open — the route stage and the other Workshop items' window
 * states (review U7 S-F5 / S-F6): recorded in the entry snapshot on the
 * first open, and the stage with every resumption.
 */
export function openM06(
  nowMs: number,
  entry: { stage?: string | null } & Record<string, unknown> = {},
) {
  declareM06();

  const s = ensureState();

  if (m06Window.windowStatus() === 'unopened') {
    // Reload guard: the raw log of an earlier page load already holds an
    // opened console. Never re-run it (no fresh work period, no double
    // credit).
    if (m06PriorAdministration(researchRuntime.getPriorPageLoadEvents())) {
      m06Freeze(s, nowMs, M06_PRIOR_ADMINISTRATION, 'reload');
      m06Window.recordPriorExposure(
        'dispatch console opened in an earlier page load of this identity',
      );
      m06Window.technicalFailure(
        'reload after administration: console not re-run',
      );

      return;
    }
  }

  if (m06Window.isClosed()) {
    return;
  }

  const first = !m06Window.isOpen();

  m06Window.setComprehension(s.practicePassed ? 'passed' : 'pending');
  m06Window.open(nowMs, { ...m06EntrySnapshot(s.form), ...entry });

  if (!first) {
    m06SurfaceReopened(s, nowMs, sink, entry.stage ?? null);
  }
}

/** Completes the window once the model ended the period. */
function completeIfEnded(nowMs: number, inputMode: InputMode) {
  const s = ensureState();

  if (s.phase !== 'done' || !m06Window.isOpen()) {
    return;
  }

  m06Window.complete(
    nowMs,
    m06RawComponents(s, s.closureReason ?? 'completed', nowMs),
    inputMode,
    { exitState: s.stopKind === 'explicit' ? 'stopped' : 'completed' },
  );
}

export function pressM06Token(token: string, inputMode: InputMode): boolean {
  return m06Window.isOpen()
    ? m06PressToken(ensureState(), token, inputMode, sink)
    : false;
}

export function typeM06Line(text: string, inputMode: InputMode): boolean {
  return m06Window.isOpen()
    ? m06TypeLine(ensureState(), text, inputMode, sink)
    : false;
}

export function clearM06Buffer(inputMode: InputMode): boolean {
  return m06Window.isOpen()
    ? m06ClearBuffer(ensureState(), inputMode, sink)
    : false;
}

/** "Back": removes the last token of the buffer. */
export function removeM06Token(inputMode: InputMode): boolean {
  return m06Window.isOpen()
    ? m06RemoveLastToken(ensureState(), inputMode, sink)
    : false;
}

export function consultM06Reference(inputMode: InputMode) {
  if (m06Window.isOpen()) {
    m06ConsultReference(ensureState(), inputMode, sink);
  }
}

/** Practice dispatch, or an order dispatch inside the work period. */
export function dispatchM06(
  nowMs: number,
  inputMode: InputMode,
): M06DispatchResult {
  if (!m06Window.isOpen()) {
    return 'refused';
  }

  const s = ensureState();
  const result = m06Dispatch(s, nowMs, inputMode, sink);

  if (s.practicePassed) {
    m06Window.setComprehension('passed');
  }

  completeIfEnded(nowMs, inputMode);

  return result;
}

/** The ready screen's "Begin the work period". */
export function beginM06Period(
  nowMs: number,
  inputMode: InputMode,
): M06BeginResult {
  return m06Window.isOpen()
    ? m06Begin(ensureState(), nowMs, inputMode, sink)
    : 'invalid';
}

export function skipM06Order(
  nowMs: number,
  inputMode: InputMode,
): M06SkipResult {
  if (!m06Window.isOpen()) {
    return 'refused';
  }

  const result = m06Skip(ensureState(), nowMs, inputMode, sink);

  completeIfEnded(nowMs, inputMode);

  return result;
}

/** "Stop work": the explicit early stop (two presses — arm, then confirm). */
export function stopM06(nowMs: number, inputMode: InputMode): M06StopResult {
  if (!m06Window.isOpen()) {
    return 'refused';
  }

  const result = m06Stop(ensureState(), nowMs, inputMode, sink);

  completeIfEnded(nowMs, inputMode);

  return result;
}

/** Surface tick; the budget end completes the window. */
export function tickM06(nowMs: number): 'none' | 'budget' {
  if (!m06Window.isOpen()) {
    return 'none';
  }

  const result = m06Tick(ensureState(), nowMs, sink);

  completeIfEnded(nowMs, 'system');

  return result;
}

/** ESC or the Leave button: one path; the budget pauses. */
export function closeM06Surface(nowMs: number) {
  if (!m06Window.isOpen()) {
    return;
  }

  m06SurfaceClosed(ensureState(), nowMs, sink);
  m06Window.pause(nowMs);
}

/** The host resumed: the window's active time resumes (the budget resumes on reopen). */
export function resumeM06Surface(nowMs: number) {
  m06Window.resume(nowMs);
}

/** Never opened → absent; open at the review → censored (count as it stands). */
export function closeM06AtReview(nowMs: number) {
  const s = ensureState();

  if (m06Window.windowStatus() === 'unopened') {
    m06Window.markAbsent('dispatch console never opened before the review');

    return;
  }

  if (m06Window.isOpen()) {
    m06Freeze(s, nowMs, 'closed_at_review', 'review');
    m06Window.stop(
      nowMs,
      'closed_at_review',
      m06RawComponents(s, 'closed_at_review', nowMs),
      'system',
      'censored',
    );
  }
}

/** Test-only escape hatch. */
export function resetM06State() {
  if (state !== null) {
    m06Freeze(state, 0, 'reset', null);
  }

  state = null;
  m06Window.reset();
  m06Window.spec.form = null;
  m06Window.spec.counterbalance = null;
}
