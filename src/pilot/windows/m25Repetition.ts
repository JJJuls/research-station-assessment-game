/**
 * M25 — window adapter of the field sensor post and Vale's normality
 * question (Station 080 M01–M26 run, Unit 4). Owns the two register
 * windows (the calibration loops in the Recovery Yard; the belief
 * question at Vale's return check-in in the Concourse) and the session-
 * scope model state; every command delegates to the pure model
 * (`src/pilot/exterior/m25RepetitionModel.ts`) and logs through the
 * windows' `proto_m25_loops_*` / `proto_m25_belief_*` families with the
 * protocol stamp.
 *
 * Closure rules: a closed surface (ESC or the Leave button) pauses every
 * running clock; Noor's shift end closes an open post — required loops
 * never completed ⇒ a censored stop (primary null), otherwise a completed
 * observation closed by departure (the count as it stands); the review
 * marks a never-opened post absent and censors an open one; a post opened
 * in an earlier page load is never re-run (reload guard). The question is
 * DUE only when the participant was exposed to the repeat opportunity and
 * the loops, M24 and M26 windows are RECORDED closed (the exterior shift
 * ended) — never on any numerical M24 / M26 score; the first response is
 * immutable; a never-asked question closes absent at the review.
 */
import { protocolStamp } from '../../measurement/protocol';
import { researchRuntime } from '../../systems';
import {
  createM25State,
  M25_BELIEF_FAMILY,
  M25_BELIEF_OPPORTUNITY_ID,
  M25_BELIEF_WINDOW_ID,
  M25_ENTRY_STATE_VERSION,
  M25_LOOPS_FAMILY,
  M25_LOOPS_OPPORTUNITY_ID,
  M25_LOOPS_WINDOW_ID,
  M25_QUESTION_VERSION,
  m25AnswerBelief,
  type M25AnswerResult,
  m25AskBelief,
  m25BeliefDue,
  m25BeliefRawComponents,
  m25EnterOptional,
  m25EntrySnapshot,
  m25Exposed,
  m25Freeze,
  type M25LogSink,
  m25PriorAdministration,
  m25RawComponents,
  m25RequiredCompleted,
  m25StartLoop,
  type M25State,
  m25Stop,
  m25SurfaceClosed,
  m25SurfaceReopened,
  m25Tick,
} from '../exterior/m25RepetitionModel';
import { exteriorEpisode, exteriorWindows } from './exteriorWindows';
import { type InputMode, ItemWindow } from './windowKit';

export {
  M25_LOOP_MS,
  M25_REPEAT_CAP_MS,
  M25_REQUIRED_LOOPS,
} from '../exterior/m25RepetitionModel';

export const M25_PRIOR_ADMINISTRATION = 'prior_administration';

let state: M25State | null = null;
/** Wall time the loops window closed (the belief delay is measured from it). */
let loopsClosedAtMs: number | null = null;

function ensureState(): M25State {
  if (state === null) {
    state = createM25State();
  }

  return state;
}

export const m25LoopsWindow = new ItemWindow({
  item: 'M25',
  opportunityId: M25_LOOPS_OPPORTUNITY_ID,
  windowId: M25_LOOPS_WINDOW_ID,
  entryStateVersion: M25_ENTRY_STATE_VERSION,
  family: M25_LOOPS_FAMILY,
  scene: 'exterior_recovery_yard',
  objectId: 'm25_field_sensor_post',
});

export const m25BeliefWindow = new ItemWindow({
  item: 'M25',
  opportunityId: M25_BELIEF_OPPORTUNITY_ID,
  windowId: M25_BELIEF_WINDOW_ID,
  entryStateVersion: M25_ENTRY_STATE_VERSION,
  family: M25_BELIEF_FAMILY,
  scene: 'station_concourse',
  objectId: 'm25_vale_return_checkin',
});

const loopsSink: M25LogSink = (suffix, metadata) => {
  m25LoopsWindow.log(suffix, { ...protocolStamp(), ...metadata });
};

const beliefSink: M25LogSink = (suffix, metadata) => {
  m25BeliefWindow.log(suffix, { ...protocolStamp(), ...metadata });
};

// ——— loops (Recovery Yard) ————————————————————————————————————————————

export function declareM25Loops() {
  m25LoopsWindow.declare();
}

/**
 * The post was PRESENTED: Noor's briefing lists it as a yard job. Logged
 * once; a presented-but-never-opened post is `declined` at extraction.
 */
export function presentM25Loops(nowMs: number) {
  declareM25Loops();
  m25LoopsWindow.present(nowMs, m25EntrySnapshot());
}

export function m25State(): Readonly<M25State> {
  return ensureState();
}

/** True when the post was administered in an earlier page load. */
export function m25AdministeredBefore(): boolean {
  return ensureState().closureReason === M25_PRIOR_ADMINISTRATION;
}

export function m25LoopsClosedAtMs(): number | null {
  return loopsClosedAtMs;
}

export function openM25Loops(nowMs: number) {
  declareM25Loops();

  const s = ensureState();

  if (m25LoopsWindow.windowStatus() === 'unopened') {
    // Reload guard: the raw log of an earlier page load already holds an
    // opened post. Never re-run it (no fresh loops, no double credit).
    if (m25PriorAdministration(researchRuntime.getPriorPageLoadEvents())) {
      m25Freeze(s, nowMs, M25_PRIOR_ADMINISTRATION, null);
      loopsClosedAtMs = nowMs;
      m25LoopsWindow.recordPriorExposure(
        'field sensor post opened in an earlier page load of this identity',
      );
      m25LoopsWindow.technicalFailure(
        'reload after administration: post not re-run',
      );

      return;
    }
  }

  if (m25LoopsWindow.isClosed()) {
    return;
  }

  const first = !m25LoopsWindow.isOpen();

  m25LoopsWindow.open(nowMs, m25EntrySnapshot());

  if (!first) {
    m25SurfaceReopened(s, nowMs, loopsSink);
  }
}

export function startM25Loop(nowMs: number, inputMode: InputMode): boolean {
  return m25LoopsWindow.isOpen()
    ? m25StartLoop(ensureState(), nowMs, inputMode, loopsSink)
    : false;
}

/** The completion screen's "Run more loops". */
export function enterM25Optional(nowMs: number, inputMode: InputMode): boolean {
  return m25LoopsWindow.isOpen()
    ? m25EnterOptional(ensureState(), nowMs, inputMode, loopsSink)
    : false;
}

/** "Finished": the explicit voluntary stop (completion screen or optional phase). */
export function stopM25(nowMs: number, inputMode: InputMode): boolean {
  if (!m25LoopsWindow.isOpen()) {
    return false;
  }

  const s = ensureState();

  if (!m25Stop(s, nowMs, inputMode, loopsSink)) {
    return false;
  }

  loopsClosedAtMs = nowMs;
  m25LoopsWindow.complete(
    nowMs,
    m25RawComponents(s, 'voluntary_stop', nowMs),
    inputMode,
    { exitState: 'stopped' },
  );

  return true;
}

/** Surface tick; the focused cap completes the window. */
export function tickM25(nowMs: number): ReturnType<typeof m25Tick> {
  if (!m25LoopsWindow.isOpen()) {
    return 'none';
  }

  const s = ensureState();
  const result = m25Tick(s, nowMs, loopsSink);

  if (result === 'cap') {
    loopsClosedAtMs = nowMs;
    m25LoopsWindow.complete(nowMs, m25RawComponents(s, 'cap', nowMs), 'system');
  }

  return result;
}

/** ESC or the Leave button: one path, every running clock pauses. */
export function closeM25Surface(nowMs: number) {
  if (!m25LoopsWindow.isOpen()) {
    return;
  }

  m25SurfaceClosed(ensureState(), nowMs, loopsSink);
  m25LoopsWindow.pause(nowMs);
}

/**
 * Noor's shift end with the post open: required loops never completed ⇒
 * a censored stop (the primary is null — never a zero); otherwise the
 * observation is complete as it stands, closed by departure.
 */
export function closeM25LoopsAtShiftEnd(nowMs: number) {
  if (!m25LoopsWindow.isOpen()) {
    return;
  }

  const s = ensureState();

  loopsClosedAtMs = nowMs;

  if (!m25Exposed(s)) {
    // Not a stop the participant could make (the required phase has no
    // Finished control): closed by the route, censored, primary null.
    m25Freeze(s, nowMs, 'route_departure', 'departure');
    m25LoopsWindow.stop(
      nowMs,
      'departed',
      m25RawComponents(s, 'route_departure', nowMs),
      'system',
      'censored',
    );

    return;
  }

  m25Freeze(s, nowMs, 'route_departure', 'departure');
  m25LoopsWindow.complete(
    nowMs,
    m25RawComponents(s, 'route_departure', nowMs),
    'system',
    { exitState: 'stopped' },
  );
}

export function closeM25LoopsAtReview(nowMs: number) {
  if (m25LoopsWindow.windowStatus() === 'unopened') {
    m25LoopsWindow.markAbsent(
      'field sensor post never opened before the review',
    );

    return;
  }

  if (m25LoopsWindow.isOpen()) {
    const s = ensureState();

    loopsClosedAtMs = nowMs;
    m25Freeze(s, nowMs, 'closed_at_review', 'review');
    m25LoopsWindow.stop(
      nowMs,
      'closed_at_review',
      m25RawComponents(s, 'closed_at_review', nowMs),
      'system',
      'censored',
    );
  }
}

// ——— belief (Vale's return check-in, Concourse) ———————————————————————

export function declareM25Belief() {
  m25BeliefWindow.declare();
}

/**
 * Recorded closure of every M24–M26 behavioural opportunity: the loops
 * window is not open, the exterior shift has ended (Noor's "finished
 * outside" closes the M24 and M26 windows with their honest dispositions)
 * and neither the M24 nor the M26 window is open. A never-begun rig or
 * uplink after the shift end is closed in the practical sense (it closes
 * absent at the review). Integration note: a later M24 / M26 unit must
 * keep these windows as the closure signal or update this reader.
 */
export function m25BehaviourClosed(): {
  loopsClosed: boolean;
  m24Closed: boolean;
  m26Closed: boolean;
} {
  const shiftEnded = exteriorEpisode().shift_ended_at_ms !== null;
  const w = exteriorWindows();

  return {
    loopsClosed: !m25LoopsWindow.isOpen(),
    m24Closed: shiftEnded && !w.m24.isOpen(),
    m26Closed: shiftEnded && !w.m26.isOpen(),
  };
}

export function m25BeliefDueNow(): boolean {
  return (
    !m25BeliefWindow.isClosed() &&
    m25BeliefDue(ensureState(), m25BehaviourClosed())
  );
}

/** Vale presents the question (the window opens on the first presentation). */
export function askM25Belief(nowMs: number): boolean {
  if (!m25BeliefDueNow()) {
    return false;
  }

  declareM25Belief();

  const s = ensureState();

  if (!m25AskBelief(s, nowMs, loopsClosedAtMs, beliefSink)) {
    return false;
  }

  m25BeliefWindow.setComprehension('not_required');
  m25BeliefWindow.present(nowMs, { question_version: M25_QUESTION_VERSION });
  m25BeliefWindow.open(nowMs, {
    question_version: M25_QUESTION_VERSION,
    exposed: true,
    loops_closed_at_ms: loopsClosedAtMs,
  });

  return true;
}

export function answerM25Belief(
  value: number,
  nowMs: number,
  inputMode: InputMode,
): M25AnswerResult {
  if (!m25BeliefWindow.isOpen()) {
    return 'invalid';
  }

  const s = ensureState();

  const result = m25AnswerBelief(s, value, nowMs, inputMode, beliefSink);

  if (result === 'answered') {
    m25BeliefWindow.complete(
      nowMs,
      m25BeliefRawComponents(s, 'completed'),
      inputMode,
    );
  }

  return result;
}

export function m25BeliefAnswered(): boolean {
  return ensureState().belief.value !== null;
}

export function closeM25BeliefAtReview(nowMs: number) {
  const s = ensureState();

  if (m25BeliefWindow.windowStatus() === 'unopened') {
    m25BeliefWindow.markAbsent(
      m25Exposed(s)
        ? 'normality question never asked before the review'
        : m25LoopsWindow.exit() === 'technical_failure'
          ? 'post administered in an earlier page load; exposure unknown in this load'
          : `not exposed to the repeat opportunity (${m25RequiredCompleted(s)} required loops completed)`,
    );

    return;
  }

  if (m25BeliefWindow.isOpen()) {
    m25BeliefWindow.stop(
      nowMs,
      'closed_at_review',
      m25BeliefRawComponents(s, 'closed_at_review'),
      'system',
      'censored',
    );
  }
}

/** Test-only escape hatch. */
export function resetM25State() {
  if (state !== null) {
    m25Freeze(state, 0, 'reset', null);
  }

  state = null;
  loopsClosedAtMs = null;
  m25LoopsWindow.reset();
  m25BeliefWindow.reset();
}
