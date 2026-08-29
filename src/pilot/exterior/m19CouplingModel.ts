/**
 * M19 — progressive frozen coolant coupling (evidence-led pilot v2, Unit 4).
 *
 * PURE model (no Phaser, no runtime imports; Node-testable). The window
 * adapter in ../windows/exteriorWindows.ts binds it to the ItemWindow kit.
 *
 * Ledger (sheet 09): regulate a progressive valve/coupling task —
 * resistance increases after initial progress, feedback stays informative
 * and completion remains attainable. Validity gate: difficulty understood;
 * matched calibration; attainable endpoint; neutral stop; no zero-utility
 * state.
 *
 * Mechanic: a valve wheel on a frozen coolant coupling. Each TURN is one
 * discrete timed act that opens the valve by a fixed step; at fixed,
 * identical progress thresholds the collar ICES (difficulty onset) and
 * turning no longer moves the wheel (repeated ineffective action). A THAW
 * act (heat gun on the rack beside the coupling) frees the collar; each
 * later icing needs one more thaw pass than the last (resistance rises
 * after initial progress). Every bound state is resolvable by thawing —
 * there is never a zero-utility state — and the endpoint is always
 * attainable. INSPECT reads the coupling state without acting. STEP AWAY
 * is the neutral stop. Nothing is random.
 *
 * Distinguished acts (each its own event suffix): useful turn, ineffective
 * turn, thaw (useful / not needed), inspect (pause), strategy shift (a thaw
 * after an ineffective turn), stop, completion, departure, technical
 * failure. Raw components use the ledger names (`difficulty_onset`,
 * `postdifficulty_reengagement`, `useful_attempts`, `progress`,
 * `completion`, `stop_choice`); every other count is contextual. Nothing
 * here is a score, a threshold on persistence, or a trait label.
 */

export const M19_OPPORTUNITY_ID = 'proto_m19_progressive_valve';
export const M19_WINDOW_ID = 'm19_valve_w1';
export const M19_ENTRY_STATE_VERSION = 'm19-coupling-v1';
export const M19_FAMILY = 'proto_m19_valve_';

/** Item-owned event suffixes (family = M19_FAMILY + suffix). */
export const M19_EVENT_SUFFIXES = [
  'presented',
  'opportunity_opened',
  'turn',
  'thaw',
  'inspect',
  'difficulty_onset',
  'strategy_shift',
  'departed',
  'window_closed',
  'technical_failure',
] as const;

/** One standardised calibration (identical for everyone; form recorded). */
export type M19Form = 'standard_v1';

export interface M19Schedule {
  form: M19Form;
  /** Valve opening per effective turn (percentage points). */
  turn_step: number;
  /** Completion target (percentage). */
  target: number;
  /** Progress values at which the collar ices (difficulty onsets). */
  bind_thresholds: readonly number[];
  /** Thaw passes needed to free the collar at the n-th icing. */
  thaw_passes: readonly number[];
}

export const M19_SCHEDULES: Record<M19Form, M19Schedule> = {
  standard_v1: {
    form: 'standard_v1',
    turn_step: 10,
    target: 100,
    bind_thresholds: [30, 60, 80],
    thaw_passes: [1, 2, 3],
  },
};

/** Timed-act durations (ms) the host performs in the world (game feel). */
export const M19_TURN_MS = 700;
export const M19_THAW_MS = 1500;

export type M19StopChoice =
  | 'step_away'
  | 'ended_shift_outside'
  | 'closed_at_review'
  | null;

export type M19Act =
  | 'turn_effective'
  | 'turn_ineffective'
  | 'thaw_useful'
  | 'thaw_not_needed'
  | 'inspect';

export interface M19State {
  form: M19Form;
  entered: boolean;
  closed: boolean;
  progress: number;
  /** The collar is iced — turning does nothing until thawed. */
  bound: boolean;
  /** Number of icings so far (index into thaw_passes). */
  binds: number;
  /** Thaw passes still needed to free the collar. */
  thaw_remaining: number;
  turns_effective: number;
  turns_ineffective: number;
  thaw_useful: number;
  thaw_not_needed: number;
  inspections: number;
  /** Ineffective turns in a row (current run / longest run). */
  ineffective_run: number;
  ineffective_run_max: number;
  strategy_shifts: number;
  /** First icing: elapsed ms since the window opened and progress then. */
  difficulty_onset_ms: number | null;
  difficulty_onset_progress: number | null;
  /** First USEFUL act after the first icing (re-engagement). */
  reengagement_ms: number | null;
  completed_ms: number | null;
  stop_choice: M19StopChoice;
  departures: number;
  last_act: M19Act | null;
  opened_at_ms: number | null;
  acts: number;
}

export function createM19State(form: M19Form = 'standard_v1'): M19State {
  return {
    form,
    entered: false,
    closed: false,
    progress: 0,
    bound: false,
    binds: 0,
    thaw_remaining: 0,
    turns_effective: 0,
    turns_ineffective: 0,
    thaw_useful: 0,
    thaw_not_needed: 0,
    inspections: 0,
    ineffective_run: 0,
    ineffective_run_max: 0,
    strategy_shifts: 0,
    difficulty_onset_ms: null,
    difficulty_onset_progress: null,
    reengagement_ms: null,
    completed_ms: null,
    stop_choice: null,
    departures: 0,
    last_act: null,
    opened_at_ms: null,
    acts: 0,
  };
}

export interface M19TurnResult {
  effective: boolean;
  progress: number;
  bound: boolean;
  /** This turn crossed a threshold and iced the collar. */
  bind_engaged: boolean;
  /** This turn reached the target. */
  completed: boolean;
  /** First icing of the window (difficulty onset). */
  difficulty_onset: boolean;
}

export interface M19ThawResult {
  useful: boolean;
  /** Thaw passes still needed after this pass (0 = collar free). */
  thaw_remaining: number;
  freed: boolean;
  strategy_shift: boolean;
}

export function m19Schedule(state: M19State): M19Schedule {
  return M19_SCHEDULES[state.form];
}

export function m19Open(state: M19State): boolean {
  return state.entered && !state.closed;
}

export function m19Completed(state: M19State): boolean {
  return state.completed_ms !== null;
}

/** The participant entered the window (first act). Idempotent. */
export function m19Enter(state: M19State, nowMs: number): boolean {
  if (state.entered || state.closed) {
    return false;
  }

  state.entered = true;
  state.opened_at_ms = nowMs;

  return true;
}

function elapsed(state: M19State, nowMs: number): number {
  return Math.max(0, nowMs - (state.opened_at_ms ?? nowMs));
}

function noteUsefulAct(state: M19State, nowMs: number) {
  if (state.difficulty_onset_ms !== null && state.reengagement_ms === null) {
    state.reengagement_ms = elapsed(state, nowMs);
  }
}

/** One turn of the wheel (a discrete timed act performed by the host). */
export function m19Turn(state: M19State, nowMs: number): M19TurnResult {
  if (!m19Open(state) || m19Completed(state)) {
    throw new Error('M19: turn outside the open window');
  }

  const schedule = m19Schedule(state);

  state.acts += 1;

  if (state.bound) {
    state.turns_ineffective += 1;
    state.ineffective_run += 1;
    state.ineffective_run_max = Math.max(
      state.ineffective_run_max,
      state.ineffective_run,
    );
    state.last_act = 'turn_ineffective';

    return {
      effective: false,
      progress: state.progress,
      bound: true,
      bind_engaged: false,
      completed: false,
      difficulty_onset: false,
    };
  }

  noteUsefulAct(state, nowMs);
  state.turns_effective += 1;
  state.ineffective_run = 0;
  state.progress = Math.min(
    schedule.target,
    state.progress + schedule.turn_step,
  );
  state.last_act = 'turn_effective';

  const completed = state.progress >= schedule.target;

  if (completed) {
    state.completed_ms = elapsed(state, nowMs);

    return {
      effective: true,
      progress: state.progress,
      bound: false,
      bind_engaged: false,
      completed: true,
      difficulty_onset: false,
    };
  }

  const threshold = schedule.bind_thresholds[state.binds];
  const bindEngaged = threshold !== undefined && state.progress >= threshold;
  let difficultyOnset = false;

  if (bindEngaged) {
    state.bound = true;
    state.thaw_remaining = schedule.thaw_passes[state.binds] ?? 1;
    state.binds += 1;

    if (state.difficulty_onset_ms === null) {
      state.difficulty_onset_ms = elapsed(state, nowMs);
      state.difficulty_onset_progress = state.progress;
      difficultyOnset = true;
    }
  }

  return {
    effective: true,
    progress: state.progress,
    bound: state.bound,
    bind_engaged: bindEngaged,
    completed: false,
    difficulty_onset: difficultyOnset,
  };
}

/** One thaw pass with the heat gun (a discrete timed act). */
export function m19Thaw(state: M19State, nowMs: number): M19ThawResult {
  if (!m19Open(state) || m19Completed(state)) {
    throw new Error('M19: thaw outside the open window');
  }

  state.acts += 1;

  if (!state.bound) {
    state.thaw_not_needed += 1;
    state.last_act = 'thaw_not_needed';

    return {
      useful: false,
      thaw_remaining: 0,
      freed: false,
      strategy_shift: false,
    };
  }

  const strategyShift = state.last_act === 'turn_ineffective';

  if (strategyShift) {
    state.strategy_shifts += 1;
  }

  noteUsefulAct(state, nowMs);
  state.thaw_useful += 1;
  state.ineffective_run = 0;
  state.thaw_remaining = Math.max(0, state.thaw_remaining - 1);
  state.last_act = 'thaw_useful';

  const freed = state.thaw_remaining === 0;

  if (freed) {
    state.bound = false;
  }

  return {
    useful: true,
    thaw_remaining: state.thaw_remaining,
    freed,
    strategy_shift: strategyShift,
  };
}

/** Inspect the coupling (a pause that reads the state; never acts). */
export function m19Inspect(state: M19State): string {
  if (m19Open(state)) {
    state.inspections += 1;
    state.acts += 1;
    state.last_act = 'inspect';
  }

  return m19Readout(state);
}

/** Participant-facing state line (no evaluative wording). */
export function m19Readout(state: M19State): string {
  const valve = `Valve ${state.progress}% open`;

  if (m19Completed(state)) {
    return `${valve} — coupling fully open, flow restored.`;
  }

  if (state.bound) {
    const passes = state.thaw_remaining;

    return `${valve}. Collar ICED — the wheel will not move while it is frozen. Heat gun on the rack: ${passes} thaw pass${passes === 1 ? '' : 'es'} to free it.`;
  }

  return `${valve}. Collar free — the wheel turns.`;
}

/** Ledger raw components + contextual counts (never a score). */
export function m19RawComponents(state: M19State) {
  const schedule = m19Schedule(state);

  return {
    form: state.form,
    difficulty_onset:
      state.difficulty_onset_ms === null
        ? null
        : {
            elapsed_ms: state.difficulty_onset_ms,
            progress: state.difficulty_onset_progress,
          },
    postdifficulty_reengagement:
      state.difficulty_onset_ms === null
        ? null
        : state.reengagement_ms !== null,
    postdifficulty_reengagement_latency_ms:
      state.difficulty_onset_ms === null || state.reengagement_ms === null
        ? null
        : state.reengagement_ms - state.difficulty_onset_ms,
    useful_attempts: state.turns_effective + state.thaw_useful,
    progress: state.progress,
    completion: m19Completed(state),
    completion_elapsed_ms: state.completed_ms,
    stop_choice: state.stop_choice,
    // Contextual (secondary) counts — distinguishable, never aggregated.
    ineffective_attempts: state.turns_ineffective + state.thaw_not_needed,
    turns_effective: state.turns_effective,
    turns_ineffective: state.turns_ineffective,
    thaw_passes: state.thaw_useful,
    thaw_not_needed: state.thaw_not_needed,
    inspections: state.inspections,
    strategy_shifts: state.strategy_shifts,
    ineffective_run_max: state.ineffective_run_max,
    binds_encountered: state.binds,
    binds_scheduled: schedule.bind_thresholds.length,
    departures: state.departures,
    acts: state.acts,
  };
}

/** A scene exit while the window is open (recorded, never terminal). */
export function m19Depart(state: M19State): boolean {
  if (!m19Open(state)) {
    return false;
  }

  state.departures += 1;

  return true;
}

/**
 * Terminal closure. Completion is its own terminal state; otherwise the
 * stop choice records HOW the window ended (explicit neutral stop, the
 * shift ended outside, or the review closed it). Never a low value.
 */
export function m19Close(
  state: M19State,
  choice: Exclude<M19StopChoice, null>,
): boolean {
  if (!m19Open(state)) {
    return false;
  }

  state.closed = true;

  if (!m19Completed(state)) {
    state.stop_choice = choice;
  }

  return true;
}
