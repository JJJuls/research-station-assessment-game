/**
 * M25 — Repetition and normality belief: the field sensor post model
 * (Station 080 M01–M26 run, Unit 4). PURE (no Phaser, no runtime import):
 * the window adapter (`src/pilot/windows/m25Repetition.ts`) owns the two
 * register windows and injects the log sinks; the surface builder and
 * Vale's prompt call the commands below with their input mode.
 *
 * Approved design (specification, M25 row and "M25 loops and later
 * belief"): three REQUIRED calibration loops (never scored as
 * persistence), completion marked clearly, then OPTIONAL identical repeats
 * for at most 30 FOCUSED seconds with voluntary stopping and NO
 * futility-understanding gate; after all M24–M26 behavioural
 * opportunities have closed, every exposed participant — stoppers and
 * repeaters alike — is asked the same NPC normality question (five
 * labelled options). Two outputs, kept separate: the optional completed
 * repeat count and the 1–5 belief. Never multiplied, gated or summed.
 *
 * Mechanic: every loop is one press of "Run calibration loop" followed by
 * a standard cycle of `M25_LOOP_MS` focused milliseconds (hidden /
 * unfocused time and a closed surface never count); a press while a loop
 * runs is refused (held-key auto-repeat and a carried click can never add
 * a loop). After the third required loop the surface shows a COMPLETION
 * screen whose own controls ("Run more loops" / "Finished") present the
 * optional phase — so no press meant for a required loop can start an
 * optional one. The 30 s focused window starts when the optional phase is
 * entered; a loop still running at the cap is NOT a completed repeat.
 *
 * Measure (register `m25_optional_repeats`): completed optional loops
 * (required loops excluded) with the closure reason and censor status
 * beside it; `m25_normality_belief` is the 1–5 ordinal answered at Vale's
 * return check-in (first response immutable; missing = null). Nothing
 * here is a score, a habit claim or a clinical inference.
 */
import { FocusedClock } from '../../measurement/focusedClock';
import {
  registerFocusedClock,
  releaseFocusedClock,
} from '../../measurement/focusMonitor';
import {
  M25_NORMALITY_OPTIONS,
  M25_NORMALITY_PROMPT,
  PILOT_SETTINGS,
} from '../../measurement/protocol';

export const M25_LOOPS_OPPORTUNITY_ID = 'proto_m25_calibration_loops';
export const M25_LOOPS_WINDOW_ID = 'm25_loops_w1';
export const M25_LOOPS_FAMILY = 'proto_m25_loops_';
export const M25_BELIEF_OPPORTUNITY_ID = 'proto_m25_normality_belief';
export const M25_BELIEF_WINDOW_ID = 'm25_belief_w1';
export const M25_BELIEF_FAMILY = 'proto_m25_belief_';
export const M25_ENTRY_STATE_VERSION = 'm25-repetition-v1';
/** Version of the question stem + anchors administered in the game. */
export const M25_QUESTION_VERSION = 'm25-normality-q1';

export const M25_REQUIRED_LOOPS = PILOT_SETTINGS.m25_required_loops;
export const M25_REPEAT_CAP_MS = PILOT_SETTINGS.m25_cap_ms;
/** Standardised loop cycle (focused ms) — identical for every loop. */
export const M25_LOOP_MS = 3_000;
/**
 * Settle window after a screen change (review U4): a press arriving
 * within it cannot be a read response to the new screen — it is a carried
 * or double-tapped press from the previous one. Such presses are logged
 * and refused; the screen stays as it is (the question is re-presented).
 */
export const M25_SETTLE_MS = 400;

export type M25Phase =
  /** Required loops in progress (loop 1–3). */
  | 'required'
  /** The completion screen: calibration marked complete; optional phase not yet chosen. */
  | 'complete_marked'
  /** Optional identical repeats under the focused cap. */
  | 'optional'
  /** Closed (any closure reason). */
  | 'done';

export type M25LoopKind = 'required' | 'optional';
export type M25InputMode = 'pointer' | 'keyboard' | 'system';
export type M25LogSink = (
  suffix: string,
  metadata: Record<string, unknown>,
) => void;

/** How the loops observation ended (kept beside the count, never merged). */
export type M25StopKind =
  /** "Finished" pressed on the completion screen or in the optional phase. */
  | 'explicit'
  /** The exterior shift ended (Noor) with the post exposed but not explicitly closed. */
  | 'departure'
  /** The 30 s focused window closed the optional phase. */
  | 'cap'
  /** The Utility Deck review closed the window. */
  | 'review';

export interface M25Loop {
  loop: number;
  kind: M25LoopKind;
  /** 1-based index within its kind. */
  index: number;
  started_at_ms: number;
  start_input_mode: M25InputMode;
  focused_ms: number;
  wall_ms: number;
  completed: boolean;
  /**
   * Optional loops: focused ms of the repeat window when the loop
   * started. A loop counts only when its whole cycle fits inside the
   * window (`start + loop_ms ≤ cap`), whatever the tick granularity.
   */
  repeat_focused_at_start_ms: number | null;
}

export interface M25State {
  phase: M25Phase;
  loops: M25Loop[];
  /** Clock of the running loop (null between loops). */
  loopClock: FocusedClock | null;
  /** Focused clock of the optional window (starts when the phase is entered). */
  repeatClock: FocusedClock | null;
  required_completed_at_ms: number | null;
  /** The completion screen was shown (the repeat opportunity was PRESENTED). */
  completion_shown_at_ms: number | null;
  optional_entered_at_ms: number | null;
  cap_reached: boolean;
  loop_in_progress_at_cap: boolean;
  stop_kind: M25StopKind | null;
  closureReason: string | null;
  belief: M25BeliefState;
}

export interface M25BeliefState {
  asked_count: number;
  first_asked_at_ms: number | null;
  /** Wall time of the most recent presentation (the latency reference). */
  last_asked_at_ms: number | null;
  /** Presses refused inside the settle window (carried / double-tapped). */
  refused_presses: number;
  answered_at_ms: number | null;
  /** First (immutable) response. */
  value: 1 | 2 | 3 | 4 | 5 | null;
  label: string | null;
  /** Wall ms from the LAST presentation to the recorded answer. */
  response_latency_ms: number | null;
  /** Wall ms from the loops window closure to the first presentation. */
  delay_since_loops_closed_ms: number | null;
  loops_closed_at_ms: number | null;
}

export function createM25State(): M25State {
  return {
    phase: 'required',
    loops: [],
    loopClock: null,
    repeatClock: null,
    required_completed_at_ms: null,
    completion_shown_at_ms: null,
    optional_entered_at_ms: null,
    cap_reached: false,
    loop_in_progress_at_cap: false,
    stop_kind: null,
    closureReason: null,
    belief: {
      asked_count: 0,
      first_asked_at_ms: null,
      last_asked_at_ms: null,
      refused_presses: 0,
      answered_at_ms: null,
      value: null,
      label: null,
      response_latency_ms: null,
      delay_since_loops_closed_ms: null,
      loops_closed_at_ms: null,
    },
  };
}

// ——— derived readers ————————————————————————————————————————————————

export function m25RequiredCompleted(s: M25State): number {
  return s.loops.filter((loop) => loop.kind === 'required' && loop.completed)
    .length;
}

export function m25OptionalCompleted(s: M25State): number {
  return s.loops.filter((loop) => loop.kind === 'optional' && loop.completed)
    .length;
}

export function m25RunningLoop(s: M25State): M25Loop | null {
  const last = s.loops[s.loops.length - 1];

  return last !== undefined && !last.completed && s.loopClock !== null
    ? last
    : null;
}

/**
 * EXPOSED to the repeat opportunity: the required loops were completed
 * and the completion screen (with its repeat option) was shown. Stoppers
 * who pressed "Finished" there are exposed exactly like repeaters.
 */
export function m25Exposed(s: M25State): boolean {
  return (
    m25RequiredCompleted(s) >= M25_REQUIRED_LOOPS &&
    s.completion_shown_at_ms !== null
  );
}

/** Focused ms remaining in the optional window (null outside it). */
export function m25RepeatRemainingMs(
  s: M25State,
  nowMs: number,
): number | null {
  return s.phase === 'optional' && s.repeatClock !== null
    ? s.repeatClock.remainingMs(nowMs, M25_REPEAT_CAP_MS)
    : null;
}

/** Focused ms elapsed in the running loop (null when none runs). */
export function m25LoopElapsedMs(s: M25State, nowMs: number): number | null {
  return s.loopClock === null ? null : s.loopClock.focusedMs(nowMs);
}

/**
 * Reload guard (register §5.14): true when an earlier page load of this
 * identity already opened the post. The post is then never re-run — a
 * reload never creates fresh loops or double credit.
 */
export function m25PriorAdministration(
  priorLoadEvents: readonly { event_type: string }[],
): boolean {
  return priorLoadEvents.some(
    (event) => event.event_type === `${M25_LOOPS_FAMILY}opportunity_opened`,
  );
}

export function m25EntrySnapshot() {
  return {
    required_loops: M25_REQUIRED_LOOPS,
    loop_ms: M25_LOOP_MS,
    repeat_cap_ms: M25_REPEAT_CAP_MS,
    futility_gate: false,
    payment_fixed: true,
    route_fixed: true,
  };
}

// ——— loop commands ————————————————————————————————————————————————

/**
 * One press starts one loop. Refused while a loop runs, outside the two
 * loop phases, while the surface is closed (paused clocks) and once the
 * optional cap is reached — so a held key, a carried click or a press on
 * a paused surface never adds a loop.
 */
export function m25StartLoop(
  s: M25State,
  nowMs: number,
  inputMode: M25InputMode,
  log: M25LogSink,
): boolean {
  if (s.phase !== 'required' && s.phase !== 'optional') {
    return false;
  }

  if (m25RunningLoop(s) !== null) {
    log('loop_press_refused', {
      reason: 'loop_running',
      phase: s.phase,
      input_mode: inputMode,
    });

    return false;
  }

  if (s.phase === 'optional') {
    if (s.repeatClock === null || s.repeatClock.isPaused()) {
      return false;
    }

    if (s.repeatClock.capReached(nowMs, M25_REPEAT_CAP_MS)) {
      return false;
    }
  }

  const kind: M25LoopKind = s.phase === 'required' ? 'required' : 'optional';
  const index = s.loops.filter((loop) => loop.kind === kind).length + 1;
  const loop: M25Loop = {
    loop: s.loops.length + 1,
    kind,
    index,
    started_at_ms: nowMs,
    start_input_mode: inputMode,
    focused_ms: 0,
    wall_ms: 0,
    completed: false,
    repeat_focused_at_start_ms:
      kind === 'optional' && s.repeatClock !== null
        ? s.repeatClock.focusedMs(nowMs)
        : null,
  };

  s.loops.push(loop);

  const clock = new FocusedClock();

  clock.start(nowMs);
  registerFocusedClock(clock);
  s.loopClock = clock;
  log('loop_started', {
    loop: loop.loop,
    kind,
    index,
    loop_ms: M25_LOOP_MS,
    phase: kind === 'required' ? 'practice' : 'measurement',
    input_mode: inputMode,
  });

  return true;
}

function completeRunningLoop(s: M25State, nowMs: number, log: M25LogSink) {
  const loop = m25RunningLoop(s);

  if (loop === null || s.loopClock === null) {
    return;
  }

  s.loopClock.stop(nowMs);
  releaseFocusedClock(s.loopClock);
  loop.focused_ms = s.loopClock.focusedMs(nowMs);
  loop.wall_ms = s.loopClock.wallMs(nowMs);
  loop.completed = true;
  s.loopClock = null;
  log('loop_completed', {
    loop: loop.loop,
    kind: loop.kind,
    index: loop.index,
    focused_ms: loop.focused_ms,
    wall_ms: loop.wall_ms,
    required_completed: m25RequiredCompleted(s),
    optional_completed: m25OptionalCompleted(s),
    phase: loop.kind === 'required' ? 'practice' : 'measurement',
    input_mode: 'system',
  });
}

function endOptionalWindow(
  s: M25State,
  nowMs: number,
  stopKind: M25StopKind,
  closureReason: string,
) {
  if (s.repeatClock !== null) {
    s.repeatClock.stop(nowMs);
    releaseFocusedClock(s.repeatClock);
  }

  s.stop_kind = stopKind;
  s.closureReason = closureReason;
  s.phase = 'done';
}

/**
 * Surface tick. Completes a running loop once its standard focused cycle
 * is reached; after the third required loop the completion screen is
 * shown (the repeat opportunity is PRESENTED); in the optional phase the
 * focused cap closes the window — a loop still running then is not a
 * completed repeat. Returns what happened so the surface can re-render.
 */
export function m25Tick(
  s: M25State,
  nowMs: number,
  log: M25LogSink,
): 'none' | 'loop' | 'required_complete' | 'cap' {
  if (s.phase === 'optional' && s.repeatClock !== null) {
    if (s.repeatClock.capReached(nowMs, M25_REPEAT_CAP_MS)) {
      const running = m25RunningLoop(s);

      // A loop whose whole cycle fits inside the window counts (its start
      // plus the standard cycle within the cap — a rule on FOCUSED time,
      // independent of the tick granularity); one still running at the
      // cap does not (the cap ends the observation).
      if (running !== null && s.loopClock !== null) {
        const fits =
          running.repeat_focused_at_start_ms !== null &&
          running.repeat_focused_at_start_ms + M25_LOOP_MS <= M25_REPEAT_CAP_MS;

        if (fits && s.loopClock.capReached(nowMs, M25_LOOP_MS)) {
          completeRunningLoop(s, nowMs, log);
        } else {
          s.loopClock.stop(nowMs);
          releaseFocusedClock(s.loopClock);
          running.focused_ms = s.loopClock.focusedMs(nowMs);
          running.wall_ms = s.loopClock.wallMs(nowMs);
          s.loopClock = null;
          s.loop_in_progress_at_cap = true;
        }
      }

      s.cap_reached = true;
      log('cap_reached', {
        optional_completed: m25OptionalCompleted(s),
        loop_in_progress_at_cap: s.loop_in_progress_at_cap,
        focused_ms: s.repeatClock.focusedMs(nowMs),
        wall_ms: s.repeatClock.wallMs(nowMs),
        input_mode: 'system',
      });
      endOptionalWindow(s, nowMs, 'cap', 'cap');

      return 'cap';
    }
  }

  const running = m25RunningLoop(s);

  if (
    running === null ||
    s.loopClock === null ||
    !s.loopClock.capReached(nowMs, M25_LOOP_MS)
  ) {
    return 'none';
  }

  completeRunningLoop(s, nowMs, log);

  if (s.phase === 'required' && m25RequiredCompleted(s) >= M25_REQUIRED_LOOPS) {
    s.phase = 'complete_marked';
    s.required_completed_at_ms = nowMs;
    s.completion_shown_at_ms = nowMs;
    log('required_complete', {
      required_completed: M25_REQUIRED_LOOPS,
      completion_marked: true,
      repeat_option_presented: true,
      input_mode: 'system',
    });

    return 'required_complete';
  }

  return 'loop';
}

/**
 * Completion-screen settle guard: a press within `M25_SETTLE_MS` of the
 * screen appearing is a carried / double-tapped press from the third
 * required loop, never a decision — logged and refused (review U4).
 */
function settling(
  s: M25State,
  nowMs: number,
  control: 'more_loops' | 'finished',
  inputMode: M25InputMode,
  log: M25LogSink,
): boolean {
  const since =
    s.completion_shown_at_ms === null ? null : nowMs - s.completion_shown_at_ms;

  if (since === null || since >= M25_SETTLE_MS) {
    return false;
  }

  log('press_refused', {
    control,
    reason: 'completion_screen_settling',
    since_shown_ms: since,
    settle_ms: M25_SETTLE_MS,
    input_mode: inputMode,
  });

  return true;
}

/**
 * The completion screen's "Run more loops": enters the optional phase and
 * starts the 30 s focused window. Nothing else ever enters it.
 */
export function m25EnterOptional(
  s: M25State,
  nowMs: number,
  inputMode: M25InputMode,
  log: M25LogSink,
): boolean {
  if (s.phase !== 'complete_marked') {
    return false;
  }

  if (settling(s, nowMs, 'more_loops', inputMode, log)) {
    return false;
  }

  s.phase = 'optional';
  s.optional_entered_at_ms = nowMs;

  const clock = new FocusedClock();

  clock.start(nowMs);
  registerFocusedClock(clock);
  s.repeatClock = clock;
  log('optional_entered', {
    repeat_cap_ms: M25_REPEAT_CAP_MS,
    input_mode: inputMode,
  });

  return true;
}

/**
 * "Finished": the explicit voluntary stop — on the completion screen (a
 * stopper with zero optional repeats) or in the optional phase. A loop
 * still running is abandoned, never counted.
 */
export function m25Stop(
  s: M25State,
  nowMs: number,
  inputMode: M25InputMode,
  log: M25LogSink,
): boolean {
  if (s.phase !== 'complete_marked' && s.phase !== 'optional') {
    return false;
  }

  if (
    s.phase === 'complete_marked' &&
    settling(s, nowMs, 'finished', inputMode, log)
  ) {
    return false;
  }

  const running = m25RunningLoop(s);

  if (running !== null && s.loopClock !== null) {
    s.loopClock.stop(nowMs);
    releaseFocusedClock(s.loopClock);
    running.focused_ms = s.loopClock.focusedMs(nowMs);
    running.wall_ms = s.loopClock.wallMs(nowMs);
    s.loopClock = null;
  }

  log('stopped', {
    phase_at_stop: s.phase,
    optional_completed: m25OptionalCompleted(s),
    loop_abandoned: running !== null,
    repeat_focused_ms: s.repeatClock?.focusedMs(nowMs) ?? null,
    input_mode: inputMode,
  });
  endOptionalWindow(s, nowMs, 'explicit', 'voluntary_stop');

  return true;
}

/** The surface was closed (ESC / Leave): every running clock pauses. */
export function m25SurfaceClosed(s: M25State, nowMs: number, log: M25LogSink) {
  s.loopClock?.pause('surface_closed', nowMs);
  s.repeatClock?.pause('surface_closed', nowMs);
  log('surface_closed', {
    phase: s.phase,
    loops: s.loops.length,
    input_mode: 'system',
  });
}

/** The surface reopened: paused clocks resume. */
export function m25SurfaceReopened(
  s: M25State,
  nowMs: number,
  log: M25LogSink,
) {
  s.loopClock?.resume('surface_closed', nowMs);
  s.repeatClock?.resume('surface_closed', nowMs);
  log('surface_reopened', {
    phase: s.phase,
    loops: s.loops.length,
    input_mode: 'system',
  });
}

/**
 * Freezes every clock without completing anything (closure by the shift
 * end, the review, a reload or a reset). The stop kind names the closure.
 */
export function m25Freeze(
  s: M25State,
  nowMs: number,
  closureReason: string,
  stopKind: M25StopKind | null,
) {
  const running = m25RunningLoop(s);

  if (running !== null && s.loopClock !== null) {
    running.focused_ms = s.loopClock.focusedMs(nowMs);
    running.wall_ms = s.loopClock.wallMs(nowMs);
  }

  if (s.loopClock !== null) {
    s.loopClock.stop(nowMs);
    releaseFocusedClock(s.loopClock);
    s.loopClock = null;
  }

  if (s.repeatClock !== null) {
    s.repeatClock.stop(nowMs);
    releaseFocusedClock(s.repeatClock);
  }

  s.stop_kind = stopKind;
  s.closureReason = closureReason;
  s.phase = 'done';
}

/** Item-owned raw components (state description — never a score). */
export function m25RawComponents(
  s: M25State,
  closureReason: string,
  nowMs: number,
) {
  // A stopped clock reads frozen values whatever `nowMs` is passed.
  const repeatFocused =
    s.repeatClock === null ? null : s.repeatClock.focusedMs(nowMs);
  const repeatWall =
    s.repeatClock === null ? null : s.repeatClock.wallMs(nowMs);

  return {
    required_loops_planned: M25_REQUIRED_LOOPS,
    required_loops_completed: m25RequiredCompleted(s),
    required_complete: m25RequiredCompleted(s) >= M25_REQUIRED_LOOPS,
    completion_marked: s.completion_shown_at_ms !== null,
    exposed: m25Exposed(s),
    optional_entered: s.optional_entered_at_ms !== null,
    optional_repeats_completed: m25OptionalCompleted(s),
    optional_loops_started: s.loops.filter((loop) => loop.kind === 'optional')
      .length,
    loop_in_progress_at_cap: s.loop_in_progress_at_cap,
    cap_reached: s.cap_reached,
    repeat_cap_ms: M25_REPEAT_CAP_MS,
    repeat_focused_ms: repeatFocused,
    repeat_wall_ms: repeatWall,
    loop_ms: M25_LOOP_MS,
    stop_kind: s.stop_kind,
    futility_gate: false,
    loops: s.loops.map((loop) => ({ ...loop })),
    closure_reason: closureReason,
  };
}

// ——— belief question ————————————————————————————————————————————————

/**
 * The question is DUE when the participant was exposed to the repeat
 * opportunity, every M24–M26 behavioural opportunity is recorded closed
 * (the loops window itself included), and no first response exists yet.
 * Closure is a recorded fact, never a numerical M24 / M26 score.
 */
export function m25BeliefDue(
  s: M25State,
  closure: {
    loopsClosed: boolean;
    m24Closed: boolean;
    m26Closed: boolean;
  },
): boolean {
  return (
    m25Exposed(s) &&
    closure.loopsClosed &&
    closure.m24Closed &&
    closure.m26Closed &&
    s.belief.value === null
  );
}

/** The question was presented (every presentation counted; the first timed). */
export function m25AskBelief(
  s: M25State,
  nowMs: number,
  loopsClosedAtMs: number | null,
  log: M25LogSink,
): boolean {
  if (s.belief.value !== null) {
    return false;
  }

  s.belief.asked_count += 1;
  s.belief.last_asked_at_ms = nowMs;

  if (s.belief.first_asked_at_ms === null) {
    s.belief.first_asked_at_ms = nowMs;
    s.belief.loops_closed_at_ms = loopsClosedAtMs;
    s.belief.delay_since_loops_closed_ms =
      loopsClosedAtMs === null ? null : Math.max(0, nowMs - loopsClosedAtMs);
  }

  log('question_presented', {
    question_version: M25_QUESTION_VERSION,
    stem: M25_NORMALITY_PROMPT,
    options: M25_NORMALITY_OPTIONS.map((option) => option.label),
    asked_count: s.belief.asked_count,
    delay_since_loops_closed_ms: s.belief.delay_since_loops_closed_ms,
    optional_repeats_completed: m25OptionalCompleted(s),
    phase: 'belief',
    input_mode: 'system',
  });

  return true;
}

export type M25AnswerResult = 'answered' | 'refused' | 'invalid';

/**
 * The FIRST response is recorded; any later press is invalid. A press
 * inside the settle window after the (last) presentation is a carried or
 * double-tapped press from the preceding acknowledgement, never a read
 * response: logged with its position, refused, and the caller re-presents
 * the question (review U4).
 */
export function m25AnswerBelief(
  s: M25State,
  value: number,
  nowMs: number,
  inputMode: M25InputMode,
  log: M25LogSink,
): M25AnswerResult {
  const option = M25_NORMALITY_OPTIONS.find(
    (candidate) => candidate.value === value,
  );

  if (
    option === undefined ||
    s.belief.value !== null ||
    s.belief.last_asked_at_ms === null
  ) {
    return 'invalid';
  }

  const latency = Math.max(0, nowMs - s.belief.last_asked_at_ms);

  if (latency < M25_SETTLE_MS) {
    s.belief.refused_presses += 1;
    log('question_press_refused', {
      question_version: M25_QUESTION_VERSION,
      option_position: option.value,
      since_presented_ms: latency,
      settle_ms: M25_SETTLE_MS,
      asked_count: s.belief.asked_count,
      refused_presses: s.belief.refused_presses,
      phase: 'belief',
      input_mode: inputMode,
    });

    return 'refused';
  }

  s.belief.value = option.value;
  s.belief.label = option.label;
  s.belief.answered_at_ms = nowMs;
  s.belief.response_latency_ms = latency;
  log('question_answered', {
    question_version: M25_QUESTION_VERSION,
    value: option.value,
    label: option.label,
    option_position: option.value,
    option_count: M25_NORMALITY_OPTIONS.length,
    focus_default_position: 1,
    response_latency_ms: s.belief.response_latency_ms,
    asked_count: s.belief.asked_count,
    refused_presses: s.belief.refused_presses,
    phase: 'belief',
    input_mode: inputMode,
  });

  return 'answered';
}

export function m25BeliefRawComponents(s: M25State, closureReason: string) {
  return {
    question_version: M25_QUESTION_VERSION,
    value: s.belief.value,
    label: s.belief.label,
    asked_count: s.belief.asked_count,
    refused_presses: s.belief.refused_presses,
    first_asked_at_ms: s.belief.first_asked_at_ms,
    last_asked_at_ms: s.belief.last_asked_at_ms,
    answered_at_ms: s.belief.answered_at_ms,
    response_latency_ms: s.belief.response_latency_ms,
    delay_since_loops_closed_ms: s.belief.delay_since_loops_closed_ms,
    exposed: m25Exposed(s),
    optional_repeats_completed: m25OptionalCompleted(s),
    closure_reason: closureReason,
  };
}
