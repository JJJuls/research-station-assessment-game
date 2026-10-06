/**
 * Input observation for the M09 / M10 acts (Station 080 M01–M26 run,
 * Unit 15).
 *
 * The prompt machinery reports every selection the same way whether a key
 * or the pointer made it, so the adapters of M09 and M10 could only ever
 * write the constant "keyboard". This module OBSERVES the device instead:
 * two passive capture listeners on the window remember the device and the
 * wall time of the most recent physical press, and a pure classifier turns
 * that record into the input mode of an act — or says it was not observed.
 * A pointer press is never labelled keyboard, and an act with no recent
 * press is `unobserved`, never guessed.
 *
 * Boundary: nothing here reads which key or where the pointer was, logs an
 * event, or changes how input reaches the game. It is read only at the
 * M09 / M10 call sites (the §5.35 convention stands everywhere else).
 */

export type ObservedDevice = 'keyboard' | 'pointer';

export interface InputRecord {
  device: ObservedDevice;
  /** Wall time of the press (`Date.now()`). */
  at: number;
}

export type ObservedInputMode = ObservedDevice | 'unobserved';

export type InputModeBasis =
  | 'window_keydown'
  | 'window_pointerdown'
  | 'no_recent_press'
  | 'not_observed';

export interface ObservedInput {
  input_mode: ObservedInputMode;
  input_mode_basis: InputModeBasis;
}

/**
 * A press older than this cannot be the press that caused the act (the
 * engine handles a queued key within a frame or two; the margin covers a
 * slow frame, never a separate earlier press sequence).
 */
export const INPUT_OBSERVATION_MAX_AGE_MS = 1500;

/**
 * Pure classifier: the device of the most recent press when it lies inside
 * the age window, otherwise `unobserved`.
 */
export function classifyObservedInput(
  last: InputRecord | null,
  nowMs: number,
  maxAgeMs: number = INPUT_OBSERVATION_MAX_AGE_MS,
): ObservedInput {
  if (last === null) {
    return { input_mode: 'unobserved', input_mode_basis: 'not_observed' };
  }

  const age = nowMs - last.at;

  if (age < 0 || age > maxAgeMs) {
    return { input_mode: 'unobserved', input_mode_basis: 'no_recent_press' };
  }

  return last.device === 'pointer'
    ? { input_mode: 'pointer', input_mode_basis: 'window_pointerdown' }
    : { input_mode: 'keyboard', input_mode_basis: 'window_keydown' };
}

let lastPress: InputRecord | null = null;
let installed = false;

function note(device: ObservedDevice) {
  return () => {
    lastPress = { device, at: Date.now() };
  };
}

/** Installs the two capture listeners once per page (idempotent). */
export function installInputObservation() {
  if (installed || typeof window === 'undefined') {
    return;
  }

  installed = true;
  window.addEventListener('keydown', note('keyboard'), {
    capture: true,
    passive: true,
  });
  window.addEventListener('pointerdown', note('pointer'), {
    capture: true,
    passive: true,
  });
}

/** The most recent press this page observed (null before the first). */
export function lastObservedPress(): InputRecord | null {
  return lastPress;
}

/** The input mode of an act happening now. */
export function observeInputNow(nowMs: number = Date.now()): ObservedInput {
  return classifyObservedInput(lastPress, nowMs);
}
