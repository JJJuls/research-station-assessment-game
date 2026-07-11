/**
 * Session-lifetime task state for room scenes (U2, Wave 1A).
 *
 * Leave-and-return is measured behaviour: repeat-same-wrong-response
 * comparison, abandoned-after-failure, and returned-after-failure detection
 * must survive `scene.start()` restarts (docs/game/rooms/*.md failure/edge
 * cases). Scene instances are recreated on every entry, so task state lives
 * at module scope for the lifetime of the page session — the committed
 * Archive precedent (`archiveSessionState` in ArchiveScene, Beat 4).
 *
 * This module generalizes that precedent for the remaining stations without
 * changing ArchiveScene: Archive keeps its local copy until a maintenance
 * pass proves the ported event order is identical.
 */

type Initializer = () => object;

const initializers = new Map<string, Initializer>();
const states = new Map<string, object>();

export interface RoomTaskStateHandle<T extends object> {
  /** The live session-lifetime state object (mutate in place). */
  get(): T;
}

/**
 * Declares a room's session-lifetime task state at module scope of the room
 * scene file. `key` should be the canonical room_id (one state per room —
 * a duplicate key is a wiring mistake and throws).
 */
export function createRoomTaskState<T extends object>(
  key: string,
  createInitial: () => T,
): RoomTaskStateHandle<T> {
  if (initializers.has(key)) {
    throw new Error(`Room task state "${key}" is already registered`);
  }

  initializers.set(key, createInitial);
  states.set(key, createInitial());

  return {
    get: () => states.get(key) as T,
  };
}

/**
 * Test-only escape hatch mirroring `resetSessionOnceFlags` (deliberately
 * NOT re-exported through the world barrel — specs import it directly).
 * Recreates every registered state from its initializer.
 */
export function resetAllRoomTaskStates() {
  for (const [key, createInitial] of initializers) {
    states.set(key, createInitial());
  }
}

/**
 * The shared failed-task pattern (Archive Beat 4 semantics, reused by
 * Systems Repair and any future forced-failure room): tracks the last wrong
 * response for same-wrong-response repeat detection (Q26 family), whether
 * any failure occurred, and whether the player left after a failure with
 * the task unresolved (Q24/Q25 family).
 */
export interface FailedTaskState {
  lastWrongResponse: string | null;
  hadFailure: boolean;
  leftAfterFailure: boolean;
}

export function createFailedTaskState(): FailedTaskState {
  return {
    lastWrongResponse: null,
    hadFailure: false,
    leftAfterFailure: false,
  };
}

/**
 * Records a failed attempt and reports whether it repeats the previous
 * wrong response verbatim (ArchiveScene `didRepeat` check: the repeat event
 * — e.g. archive_same_wrong_code_repeated / repair_same_sequence_repeated —
 * replaces the plain failure event, never duplicates it).
 */
export function recordFailedAttempt(
  state: FailedTaskState,
  wrongResponse: string,
): boolean {
  const didRepeat = state.lastWrongResponse === wrongResponse;

  state.lastWrongResponse = wrongResponse;
  state.hadFailure = true;

  return didRepeat;
}

/**
 * Exit-time check (RoomScene.onRoomExit): true exactly when the room's
 * abandoned event must fire — a failure happened and the task is still
 * incomplete (ArchiveScene.onRoomExit semantics, byte-for-byte).
 */
export function shouldLogAbandonedOnExit(
  state: FailedTaskState,
  isCompleted: boolean,
): boolean {
  if (state.hadFailure && !isCompleted) {
    state.leftAfterFailure = true;
    return true;
  }

  return false;
}

/**
 * Entry-time check (RoomScene.onRoomEntered): true exactly when the room's
 * returned-after-failure event must fire — the player previously left after
 * a failure and the task is still incomplete. One-shot per departure: the
 * flag clears on detection (ArchiveScene.onRoomEntered semantics).
 */
export function shouldLogReturnedOnEnter(
  state: FailedTaskState,
  isCompleted: boolean,
): boolean {
  if (state.leftAfterFailure && state.hadFailure && !isCompleted) {
    state.leftAfterFailure = false;
    return true;
  }

  return false;
}
