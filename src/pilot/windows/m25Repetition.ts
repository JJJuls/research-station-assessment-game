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
 *
 * Reload (U24 RL-3, `RELOAD-CORRECTION-SPEC-r3-exec.md` §2, §4 and §6;
 * owner decisions D-3 = P and D-4): ONE `proto_m25_loops_prior_load_checked`
 * record per reloaded load covers the loops, the belief question and the
 * questionnaire-notice probe; the first M25 host reached writes it (the
 * yard briefing or the post, Vale's question or the Workshop's
 * declaration) and each host holds only its own occasion. The post is held
 * at its availability unless its absence is established (A). A question
 * displayed earlier is never asked again (H); an uncertain or
 * contradictory history holds it (U / M); a first display after a reload is
 * permitted only when the check establishes the earlier required
 * completion and no earlier display — then it records
 * `exposure_page_load_index` and measures its delay from the earlier
 * closure when the clocks are comparable, else null with the reason.
 */
import {
  classifyM25Reload,
  m25CheckEvidence,
  m25PriorLoadCheck,
  type M25ReloadOccasion,
} from '../../measurement/features/m25';
import { protocolStamp } from '../../measurement/protocol';
import {
  PRIOR_LOAD_CHECK_SUFFIX,
  type PriorLoadCheck,
  type ReloadClass,
  reloadHoldBackDetail,
} from '../../measurement/reloadCheck';
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
  type M25CrossLoadExposure,
  m25CrossLoadExposureFrom,
  m25EnterOptional,
  m25EntrySnapshot,
  m25Exposed,
  m25Freeze,
  type M25LogSink,
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

// ——— the reload check (U24 RL-3) ————————————————————————————————————

type HeldClass = Exclude<ReloadClass, 'A'>;

/** The loops' closure reason of a held post, by its class. */
const HOLD_BACK_REASON: Readonly<Record<HeldClass, string>> = {
  H: M25_PRIOR_ADMINISTRATION,
  U: 'prior_history_unverified',
  M: 'prior_check_contradictory',
};

/** This load's one M25 check (undefined until the first host of the load). */
let priorLoadCheck: PriorLoadCheck | null | undefined;
/** The class the belief question is held under after a reload, or null. */
let beliefHeld: HeldClass | null = null;

/**
 * Writes the load's one M25 record (loops, belief and probe) once — never
 * on a first load — and returns it. Every M25 host calls this first, the
 * Workshop's declaration included (the probe).
 */
export function ensureM25PriorLoadCheck(): PriorLoadCheck | null {
  if (priorLoadCheck === undefined) {
    priorLoadCheck = m25PriorLoadCheck(
      researchRuntime.getPageLoadIndex(),
      researchRuntime.getPriorPageLoadEvents(),
      researchRuntime.getEventIntegrity(),
    );

    if (priorLoadCheck !== null) {
      loopsSink(PRIOR_LOAD_CHECK_SUFFIX, {
        ...priorLoadCheck,
        input_mode: 'system',
      });
    }
  }

  return priorLoadCheck;
}

/** True once a host of this load has written (or computed) its check. */
export function m25PriorLoadCheckWritten(): boolean {
  return priorLoadCheck != null;
}

/** An occasion's class from this load's check; null when administered. */
export function m25ReloadHeldClass(
  occasion: M25ReloadOccasion,
): HeldClass | null {
  const check = ensureM25PriorLoadCheck();
  const cls = classifyM25Reload(
    researchRuntime.getPageLoadIndex(),
    check === null ? [] : [check],
  ).occasions[occasion].class;

  return cls === null || cls === 'A' ? null : cls;
}

/** The class the post is held under after a reload (null when not held). */
export function m25LoopsHoldBackClass(): HeldClass | null {
  const reason = ensureState().closureReason;

  return (
    (['H', 'U', 'M'] as const).find(
      (cls) => HOLD_BACK_REASON[cls] === reason,
    ) ?? null
  );
}

/**
 * Reload guard of the post (register §5.14; U24 RL-3): an unopened post of
 * a reloaded load is held unless its class is A — never re-run (H: no fresh
 * loops, no double credit) or never administered (U / M). True when held.
 * The reload-freeze time is never a loops closure (D-3): it is not kept.
 */
function guardM25Loops(nowMs: number): boolean {
  if (m25LoopsWindow.windowStatus() !== 'unopened') {
    return m25LoopsHoldBackClass() !== null;
  }

  const cls = m25ReloadHeldClass('loops');

  if (cls === null) {
    return false;
  }

  m25Freeze(ensureState(), nowMs, HOLD_BACK_REASON[cls], null);

  if (cls === 'H') {
    m25LoopsWindow.recordPriorExposure(
      'field sensor post opened in an earlier page load of this identity',
    );
    m25LoopsWindow.technicalFailure(
      'reload after administration: post not re-run',
    );
  } else {
    m25LoopsWindow.technicalFailure(
      reloadHoldBackDetail(cls, 'post not administered'),
    );
  }

  return true;
}

/**
 * Reload guard of the question (U24 RL-3; r3 §6): an unasked question of a
 * reloaded load whose class is not A is held — displayed earlier,
 * answered or not (H, cases 1 and 2), never asked again; an uncertain or
 * contradictory history (U / M, case 4) never asks it. True when held.
 */
function guardM25Belief(): boolean {
  if (beliefHeld !== null) {
    return true;
  }

  if (m25BeliefWindow.windowStatus() !== 'unopened') {
    return false;
  }

  const cls = m25ReloadHeldClass('belief');

  if (cls === null) {
    return false;
  }

  beliefHeld = cls;

  if (cls === 'H') {
    const answered = m25CheckEvidence(
      priorLoadCheck ?? undefined,
      'belief',
      'prior_belief_answered',
    );

    m25BeliefWindow.recordPriorExposure(
      answered
        ? 'normality question answered in an earlier page load of this identity'
        : 'normality question displayed in an earlier page load of this identity',
    );
    m25BeliefWindow.technicalFailure(
      reloadHoldBackDetail('H', 'question not asked again'),
    );
  } else {
    m25BeliefWindow.technicalFailure(
      reloadHoldBackDetail(cls, 'question not administered'),
    );
  }

  return true;
}

/**
 * D-3 = P (U24 RL-3; r3 §6 case 3): the exposure this load's check
 * establishes in an earlier page load — the belief question's absence of an
 * earlier display established (A) and the earlier `required_complete` with
 * the completion screen shown found — or null. The delay's reference and
 * the clock rule are the pure model's (`m25CrossLoadExposureFrom`).
 */
export function m25CrossLoadExposure(
  nowMs: number,
): M25CrossLoadExposure | null {
  const check = ensureM25PriorLoadCheck();

  if (
    check === null ||
    classifyM25Reload(researchRuntime.getPageLoadIndex(), [check]).occasions
      .belief.class !== 'A' ||
    !m25CheckEvidence(check, 'loops', 'prior_required_complete')
  ) {
    return null;
  }

  return m25CrossLoadExposureFrom(
    researchRuntime.getPriorPageLoadEvents(),
    nowMs,
  );
}

// ——— loops (Recovery Yard) ————————————————————————————————————————————

export function declareM25Loops() {
  m25LoopsWindow.declare();
}

/**
 * The post was PRESENTED: Noor's briefing lists it as a yard job. Logged
 * once; a presented-but-never-opened post is `declined` at extraction.
 * After a reload the check is written first and a held post is held here,
 * at its availability (U24 RL-3).
 */
export function presentM25Loops(nowMs: number) {
  declareM25Loops();
  ensureM25PriorLoadCheck();
  m25LoopsWindow.present(nowMs, m25EntrySnapshot());
  guardM25Loops(nowMs);
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

  // Reload guard (U24 RL-3): the load's check is written first when the
  // briefing did not run in this load; a held post opens its record only.
  if (guardM25Loops(nowMs)) {
    return;
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
    // A check of this load holds a post that is not A: held, never absent
    // (U24 RL-3; U is never `participant_absent`).
    if (priorLoadCheck != null && guardM25Loops(nowMs)) {
      return;
    }

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

/**
 * U24 RL-3: Vale's question consults the load's check first (it may be the
 * first M25 host of the load): a held question is never due; otherwise it
 * is due on a same-load exposure as before, or on the exposure the check
 * establishes in an earlier page load (D-3 = P).
 */
export function m25BeliefDueNow(): boolean {
  ensureM25PriorLoadCheck();

  if (guardM25Belief()) {
    return false;
  }

  const s = ensureState();

  return (
    !m25BeliefWindow.isClosed() &&
    m25BeliefDue(
      s,
      m25BehaviourClosed(),
      !m25Exposed(s) && m25CrossLoadExposure(Date.now()) !== null,
    )
  );
}

/** Vale presents the question (the window opens on the first presentation). */
export function askM25Belief(nowMs: number): boolean {
  if (!m25BeliefDueNow()) {
    return false;
  }

  declareM25Belief();

  const s = ensureState();
  // A first display after a reload (D-3 = P) records where the exposure
  // was and measures from the earlier closure, or null with the reason.
  const crossLoad = m25Exposed(s) ? null : m25CrossLoadExposure(nowMs);
  const closedAt =
    crossLoad === null ? loopsClosedAtMs : crossLoad.loops_closed_at_ms;

  if (!m25AskBelief(s, nowMs, loopsClosedAtMs, beliefSink, crossLoad)) {
    return false;
  }

  m25BeliefWindow.setComprehension('not_required');
  m25BeliefWindow.present(nowMs, { question_version: M25_QUESTION_VERSION });
  m25BeliefWindow.open(nowMs, {
    question_version: M25_QUESTION_VERSION,
    exposed: true,
    loops_closed_at_ms: closedAt,
    ...(crossLoad === null
      ? {}
      : { exposure_page_load_index: crossLoad.exposure_page_load_index }),
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
    // A check of this load holds a question that is not A: held, never
    // absent (U24 RL-3). An earlier completion the check establishes is
    // never reported as "not exposed" or "0 required loops" (r3 §6).
    if (priorLoadCheck != null && guardM25Belief()) {
      return;
    }

    const exposedEarlier =
      priorLoadCheck != null && m25CrossLoadExposure(nowMs) !== null;
    const loopsHeld = m25LoopsHoldBackClass();

    m25BeliefWindow.markAbsent(
      m25Exposed(s) || exposedEarlier
        ? 'normality question never asked before the review'
        : loopsHeld === 'U' || loopsHeld === 'M'
          ? 'post not administered after a reload; exposure unknown in this load'
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
  priorLoadCheck = undefined;
  beliefHeld = null;
  m25LoopsWindow.reset();
  m25BeliefWindow.reset();
}
