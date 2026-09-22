/**
 * M08 — Effort allocation: the station support console model (Station 080
 * M01–M26 run, Unit 2). PURE (no Phaser, no runtime import): the window
 * adapter (`src/pilot/windows/m08EffortChoice.ts`) owns the register
 * window and injects the log sink; the surface builder calls the commands
 * below with their input mode.
 *
 * Approved design (specification, M08 row): six 15-second choices between
 * practised demanding work and a matched low-demand activity; work shows 1
 * or 3 displayed station-output units (each level three times,
 * counterbalanced), standing by none; payment and route access fixed.
 *
 * Mechanic: a short practice (sort four readings by a visible rule — the
 * demanding work, never scored), then six slots. Every slot opens with a
 * CHOICE screen showing the slot's displayed benefit; the participant
 * chooses SORT (work) or STAND BY; either way the slot lasts 15 FOCUSED
 * seconds (hidden / unfocused time and a closed surface never count) and
 * ends with the same neutral line. The output tally is fictional station
 * output — nothing else changes with it.
 *
 * Measure (register `m08_work_choice_fraction`): Work choices / explicit
 * valid choices (six planned); per-benefit fractions kept separately;
 * practice performance and work demand recorded. A slot without an
 * explicit choice (surface left, shift ended or review reached first) is a
 * MISSING choice — never Rest. Exploratory counterpart only; nothing here
 * is a score.
 */
import { FocusedClock } from '../../measurement/focusedClock';
import {
  registerFocusedClock,
  releaseFocusedClock,
} from '../../measurement/focusMonitor';
import { PILOT_SETTINGS } from '../../measurement/protocol';

export const M08_OPPORTUNITY_ID = 'proto_m08_effort_choice';
export const M08_WINDOW_ID = 'm08_effort_w1';
export const M08_ENTRY_STATE_VERSION = 'm08-effort-v1';
export const M08_FAMILY = 'proto_m08_effort_';
export const M08_EPOCH_MS = PILOT_SETTINGS.m08_epoch_ms;
export const M08_EPOCHS = PILOT_SETTINGS.m08_epochs;
export const M08_PRACTICE_ITEMS = 4;
/** The visible sorting rule (work demand): readings at or above go to A. */
export const M08_THRESHOLD = 50;

export type M08Benefit = 1 | 3;
export type M08Order = 'order_a' | 'order_b';
export type M08Choice = 'work' | 'rest';
export type M08Phase = 'practice' | 'choice' | 'work' | 'rest' | 'done';
export type M08Bin = 'A' | 'B';
export type M08InputMode = 'pointer' | 'keyboard' | 'system';
export type M08LogSink = (
  suffix: string,
  metadata: Record<string, unknown>,
) => void;

/** Three of each benefit level, counterbalanced by session. */
export const M08_BENEFIT_ORDERS: Record<M08Order, readonly M08Benefit[]> = {
  order_a: [1, 3, 3, 1, 1, 3],
  order_b: [3, 1, 1, 3, 3, 1],
};

/** Deterministic reading stream (identical for everyone; no RNG). */
const READINGS: readonly number[] = [
  62, 37, 81, 44, 55, 29, 73, 48, 91, 12, 66, 33, 58, 41, 77, 25, 69, 50, 38,
  84, 46, 71, 19, 63, 54, 32, 88, 45, 60, 27, 75, 49, 92, 36, 57, 43, 79, 22,
  67, 51,
];

export interface M08Epoch {
  epoch: number;
  benefit_units: M08Benefit;
  choice: M08Choice | null;
  /** True only for an explicit Sort / Stand-by choice. */
  valid: boolean;
  choice_latency_ms: number | null;
  focused_ms: number;
  items_sorted: number;
  items_correct: number;
  output_units: number;
  completed: boolean;
}

export interface M08State {
  order: M08Order;
  phase: M08Phase;
  practice: { sorted: number; correct: number; passed: boolean };
  epochs: M08Epoch[];
  /** Index of the current slot (0–5) once practice is done. */
  current: number;
  readingCursor: number;
  choicePresentedAtMs: number | null;
  clock: FocusedClock | null;
  outputUnitsTotal: number;
  closureReason: string | null;
}

export function createM08State(order: M08Order): M08State {
  return {
    order,
    phase: 'practice',
    practice: { sorted: 0, correct: 0, passed: false },
    epochs: M08_BENEFIT_ORDERS[order].map((benefit, index) => ({
      epoch: index + 1,
      benefit_units: benefit,
      choice: null,
      valid: false,
      choice_latency_ms: null,
      focused_ms: 0,
      items_sorted: 0,
      items_correct: 0,
      output_units: 0,
      completed: false,
    })),
    current: 0,
    readingCursor: 0,
    choicePresentedAtMs: null,
    clock: null,
    outputUnitsTotal: 0,
    closureReason: null,
  };
}

export function m08CurrentEpoch(s: M08State): M08Epoch | null {
  return s.phase === 'practice' || s.phase === 'done'
    ? null
    : (s.epochs[s.current] ?? null);
}

/** The reading currently shown for sorting (practice or work). */
export function m08CurrentReading(s: M08State): number {
  return READINGS[s.readingCursor % READINGS.length];
}

export function m08EntrySnapshot(s: M08State) {
  return {
    order: s.order,
    epochs: M08_EPOCHS,
    epoch_ms: M08_EPOCH_MS,
    benefit_levels: [1, 3],
    practice_items: M08_PRACTICE_ITEMS,
    payment_fixed: true,
    route_fixed: true,
  };
}

export function m08PresentChoice(s: M08State, nowMs: number, log: M08LogSink) {
  const epoch = s.epochs[s.current];

  s.phase = 'choice';
  s.choicePresentedAtMs = nowMs;
  log('choice_presented', {
    epoch: epoch.epoch,
    benefit_units: epoch.benefit_units,
    position: s.current + 1,
    phase: 'measurement',
    input_mode: 'system',
  });
}

/** Practice: sort one reading (never scored; records demand familiarity). */
export function m08SortPractice(
  s: M08State,
  bin: M08Bin,
  nowMs: number,
  inputMode: M08InputMode,
  log: M08LogSink,
): boolean {
  if (s.phase !== 'practice') {
    return false;
  }

  const reading = m08CurrentReading(s);
  const correct = (reading >= M08_THRESHOLD ? 'A' : 'B') === bin;

  s.readingCursor += 1;
  s.practice.sorted += 1;

  if (correct) {
    s.practice.correct += 1;
  }

  log('practice_item_sorted', {
    item: s.practice.sorted,
    reading,
    bin,
    correct,
    phase: 'practice',
    input_mode: inputMode,
  });

  if (s.practice.sorted >= M08_PRACTICE_ITEMS) {
    s.practice.passed = true;
    log('practice_complete', {
      correct: s.practice.correct,
      total: s.practice.sorted,
      phase: 'practice',
      input_mode: 'system',
    });
    m08PresentChoice(s, nowMs, log);
  }

  return true;
}

/** The explicit slot choice. Both options last the same 15 focused seconds. */
export function m08Choose(
  s: M08State,
  choice: M08Choice,
  nowMs: number,
  inputMode: M08InputMode,
  log: M08LogSink,
): boolean {
  if (s.phase !== 'choice') {
    return false;
  }

  const epoch = s.epochs[s.current];

  epoch.choice = choice;
  epoch.valid = true;
  epoch.choice_latency_ms =
    s.choicePresentedAtMs === null
      ? null
      : Math.max(0, nowMs - s.choicePresentedAtMs);
  s.phase = choice === 'work' ? 'work' : 'rest';

  const clock = new FocusedClock();

  clock.start(nowMs);
  registerFocusedClock(clock);
  s.clock = clock;

  log('choice_made', {
    epoch: epoch.epoch,
    choice,
    benefit_units: epoch.benefit_units,
    choice_latency_ms: epoch.choice_latency_ms,
    phase: 'measurement',
    input_mode: inputMode,
  });
  log('epoch_started', {
    epoch: epoch.epoch,
    kind: choice,
    epoch_ms: M08_EPOCH_MS,
    input_mode: 'system',
  });

  return true;
}

/** Work slot: sort the current reading. */
export function m08SortWork(
  s: M08State,
  bin: M08Bin,
  nowMs: number,
  inputMode: M08InputMode,
  log: M08LogSink,
): boolean {
  const epoch = m08CurrentEpoch(s);

  if (
    s.phase !== 'work' ||
    epoch === null ||
    s.clock === null ||
    s.clock.isPaused()
  ) {
    return false;
  }

  const reading = m08CurrentReading(s);
  const correct = (reading >= M08_THRESHOLD ? 'A' : 'B') === bin;

  s.readingCursor += 1;
  epoch.items_sorted += 1;

  if (correct) {
    epoch.items_correct += 1;
  }

  log('work_item_sorted', {
    epoch: epoch.epoch,
    item: epoch.items_sorted,
    reading,
    bin,
    correct,
    focused_ms: s.clock.focusedMs(nowMs),
    input_mode: inputMode,
  });

  return true;
}

/** Focused ms remaining in the running slot (null when no slot runs). */
export function m08EpochRemainingMs(s: M08State, nowMs: number): number | null {
  if (s.clock === null || (s.phase !== 'work' && s.phase !== 'rest')) {
    return null;
  }

  return s.clock.remainingMs(nowMs, M08_EPOCH_MS);
}

/**
 * Surface tick: ends the running slot once its 15 focused seconds are
 * reached (the slot's fixed duration, identical for work and standing by —
 * not a censoring cap). Returns `epoch` when a slot ended, `done` when the
 * last slot ended, else `none`.
 */
export function m08Tick(
  s: M08State,
  nowMs: number,
  log: M08LogSink,
): 'none' | 'epoch' | 'done' {
  const epoch = m08CurrentEpoch(s);

  if (
    s.clock === null ||
    epoch === null ||
    (s.phase !== 'work' && s.phase !== 'rest') ||
    !s.clock.capReached(nowMs, M08_EPOCH_MS)
  ) {
    return 'none';
  }

  s.clock.stop(nowMs);
  releaseFocusedClock(s.clock);
  epoch.focused_ms = s.clock.focusedMs(nowMs);
  epoch.completed = true;
  epoch.output_units = epoch.choice === 'work' ? epoch.benefit_units : 0;
  s.outputUnitsTotal += epoch.output_units;
  log('epoch_completed', {
    epoch: epoch.epoch,
    kind: epoch.choice,
    focused_ms: epoch.focused_ms,
    wall_ms: s.clock.wallMs(nowMs),
    excluded_ms: s.clock.excludedMs(nowMs),
    items_sorted: epoch.items_sorted,
    items_correct: epoch.items_correct,
    output_units: epoch.output_units,
    output_units_total: s.outputUnitsTotal,
    input_mode: 'system',
  });
  s.clock = null;

  if (s.current + 1 >= M08_EPOCHS) {
    s.phase = 'done';
    s.closureReason = 'completed';

    return 'done';
  }

  s.current += 1;
  m08PresentChoice(s, nowMs, log);

  return 'epoch';
}

/** The surface was closed (ESC / leave): a running slot pauses. */
export function m08SurfaceClosed(s: M08State, nowMs: number, log: M08LogSink) {
  s.clock?.pause('surface_closed', nowMs);
  log('surface_closed', {
    phase: s.phase,
    epoch: s.current + 1,
    input_mode: 'system',
  });
}

/** The surface reopened: a paused slot resumes. */
export function m08SurfaceReopened(
  s: M08State,
  nowMs: number,
  log: M08LogSink,
) {
  s.clock?.resume('surface_closed', nowMs);
  log('surface_reopened', {
    phase: s.phase,
    epoch: s.current + 1,
    input_mode: 'system',
  });
}

/** Stops any running slot clock without completing the slot (closure). */
export function m08Freeze(s: M08State, nowMs: number, closureReason: string) {
  if (s.clock !== null) {
    s.clock.stop(nowMs);
    releaseFocusedClock(s.clock);
    s.clock = null;
  }

  s.closureReason = closureReason;
  s.phase = 'done';
}

export function m08RawComponents(s: M08State, closureReason: string) {
  const valid = s.epochs.filter((epoch) => epoch.valid);
  const byBenefit = (benefit: M08Benefit) => {
    const level = valid.filter((epoch) => epoch.benefit_units === benefit);

    return {
      work: level.filter((epoch) => epoch.choice === 'work').length,
      valid: level.length,
    };
  };

  return {
    order: s.order,
    epochs: s.epochs.map((epoch) => ({ ...epoch })),
    work_choices: valid.filter((epoch) => epoch.choice === 'work').length,
    rest_choices: valid.filter((epoch) => epoch.choice === 'rest').length,
    valid_choices: valid.length,
    missing_choices: M08_EPOCHS - valid.length,
    by_benefit: { 1: byBenefit(1), 3: byBenefit(3) },
    practice: { ...s.practice },
    work_demand: {
      items_sorted: s.epochs.reduce((sum, e) => sum + e.items_sorted, 0),
      items_correct: s.epochs.reduce((sum, e) => sum + e.items_correct, 0),
    },
    output_units_total: s.outputUnitsTotal,
    epochs_completed: s.epochs.filter((epoch) => epoch.completed).length,
    closure_reason: closureReason,
  };
}
