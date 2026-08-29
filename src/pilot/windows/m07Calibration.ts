/**
 * M07 — Six-stage routine calibration project (evidence-led pilot v2;
 * Unit 2 hosts the start in the Records Workshop, the same bench hosts
 * the natural return in episode 5).
 *
 * Ledger (sheet 09): six-stage routine calibration with a visible
 * endpoint and persistent state; the participant may leave and naturally
 * return; no injected setback or difficulty spike; attainable; controls
 * known; no route gate forces completion. Distinguish routine finish-
 * through from PDD.
 *
 * Mechanic (work surface): the calibration bench shows six stage tiles
 * (1/6 … 6/6) and one ADVANCE control; each advance runs a 1.4 s settle
 * and marks the stage done. State is session-scope: leaving the surface,
 * the workshop or the zone keeps progress; the bench shows the same
 * progress on every return. The endpoint (6/6) is always visible.
 *
 * Raw components: stages_completed, voluntary_returns (surface reopened
 * after leaving with stages remaining), useful_reengagement (returns that
 * advanced ≥1 stage), completion, departure_state (stage count at each
 * departure; last one at close).
 */
import { registerMissionLogEntry } from '../pilotRoute';
import { phaseMetadata } from '../return/returnEpisodeModel';
import { type InputMode, ItemWindow } from './windowKit';

export const M07_OPPORTUNITY_ID = 'proto_m07_calibration_project';
export const M07_ENTRY_STATE_VERSION = 'm07-calibration-v1';
export const M07_FAMILY = 'proto_m07_calibration_';
export const M07_WINDOW_IDS = {
  start: 'm07_calibration_start',
  end: 'm07_calibration_end',
} as const;
export const M07_STAGES = 6;
export const M07_SETTLE_MS = 1400;

/**
 * How the start phase reached the return (Unit 5): `present` = the bench
 * was opened in episode 2; `missing` = never opened before the return
 * (the end opportunity is still presented and recorded as such — never a
 * low value); `completed` = the project finished in episode 2.
 */
export type M07StartState = 'present' | 'missing' | 'completed';

interface M07State {
  stagesCompleted: number;
  settlingUntilMs: number | null;
  surfaceOpen: boolean;
  visits: number;
  voluntaryReturns: number;
  usefulReengagements: number;
  stagesAtVisitStart: number;
  departures: number[];
  completed: boolean;
  /** The end opportunity was presented (workshop entered on the return). */
  endPresentedAtMs: number | null;
  startState: M07StartState | null;
}

let state: M07State = initial();

function initial(): M07State {
  return {
    stagesCompleted: 0,
    settlingUntilMs: null,
    surfaceOpen: false,
    visits: 0,
    voluntaryReturns: 0,
    usefulReengagements: 0,
    stagesAtVisitStart: 0,
    departures: [],
    completed: false,
    endPresentedAtMs: null,
    startState: null,
  };
}

export const m07Window = new ItemWindow({
  item: 'M07',
  opportunityId: M07_OPPORTUNITY_ID,
  windowId: M07_WINDOW_IDS.start,
  entryStateVersion: M07_ENTRY_STATE_VERSION,
  family: M07_FAMILY,
  scene: 'records_workshop',
  objectId: 'm07_calibration_bench',
});

export function declareM07() {
  m07Window.declare();
}

export function m07State(): Readonly<M07State> {
  return state;
}

/** Every event carries its phase and BOTH ledger window ids (Unit 5). */
function m07Phase() {
  return phaseMetadata(
    'M07',
    m07Window.spec.windowId === M07_WINDOW_IDS.end ? 'end' : 'start',
  );
}

function logM07(suffix: string, metadata: Record<string, unknown>) {
  m07Window.log(suffix, { ...m07Phase(), ...metadata });
}

/**
 * The END opportunity is presented: the workshop is entered on the return
 * shift with the bench available (once). Whatever the start history —
 * present, missing or already completed — the route is identical and the
 * fact is recorded; a missing start never becomes a low result.
 */
export function presentM07End(nowMs: number) {
  if (state.endPresentedAtMs !== null) {
    return;
  }

  declareM07();
  state.endPresentedAtMs = nowMs;
  state.startState = state.completed
    ? 'completed'
    : state.visits > 0
      ? 'present'
      : 'missing';

  if (state.completed) {
    return; // the window closed in episode 2: nothing to present
  }

  m07Window.spec.windowId = M07_WINDOW_IDS.end;
  logM07('end_presented', {
    start_state: state.startState,
    stages_completed: state.stagesCompleted,
    input_mode: 'system',
  });
}

function rawComponents(completion: boolean) {
  return {
    ...m07Phase(),
    stages_completed: state.stagesCompleted,
    voluntary_returns: state.voluntaryReturns,
    useful_reengagement: state.usefulReengagements,
    completion,
    departure_state: [...state.departures],
    visits: state.visits,
    start_state: state.startState ?? (state.visits > 0 ? 'present' : 'missing'),
    end_presented: state.endPresentedAtMs !== null,
  };
}

export function m07Settling(nowMs: number): boolean {
  return state.settlingUntilMs !== null && nowMs < state.settlingUntilMs;
}

/** The bench surface was opened (first time = start; later = a visit/return). */
export function openM07(
  nowMs: number,
  stage: 'workshop_work' | 'workshop_return' | 'other',
) {
  declareM07();
  m07Window.open(nowMs, {
    stages: M07_STAGES,
    settle_ms: M07_SETTLE_MS,
    endpoint_visible: true,
  });
  state.visits += 1;
  state.stagesAtVisitStart = state.stagesCompleted;
  state.surfaceOpen = true;

  if (state.visits > 1 && !state.completed) {
    state.voluntaryReturns += 1;
    m07Window.spec.windowId = M07_WINDOW_IDS.end;
    logM07('returned', {
      visit: state.visits,
      stages_completed: state.stagesCompleted,
      route_stage: stage,
      start_state: state.startState ?? 'present',
      input_mode: 'system',
    });
  } else if (
    state.visits === 1 &&
    m07Window.spec.windowId === M07_WINDOW_IDS.end
  ) {
    // The bench is first opened on the return: the end opportunity with a
    // MISSING start (recorded as such; never a low value).
    logM07('end_opened_without_start', {
      route_stage: stage,
      start_state: 'missing',
      input_mode: 'system',
    });
  }

  m07Window.resume(nowMs);
  registerMissionLogEntry({
    id: 'm07_project',
    kind: 'project',
    order: 20,
    text: () =>
      `Calibration bench: stage ${state.stagesCompleted} of ${M07_STAGES} done.`,
    isClosed: () => state.completed,
  });
}

export function advanceM07(nowMs: number, inputMode: InputMode): boolean {
  if (!m07Window.isOpen() || state.completed || m07Settling(nowMs)) {
    return false;
  }

  state.stagesCompleted += 1;
  state.settlingUntilMs = nowMs + M07_SETTLE_MS;
  logM07('stage_advanced', {
    stage: state.stagesCompleted,
    of: M07_STAGES,
    visit: state.visits,
    input_mode: inputMode,
  });

  if (state.stagesCompleted >= M07_STAGES) {
    state.completed = true;

    if (state.visits > 1) {
      state.usefulReengagements +=
        state.stagesCompleted > state.stagesAtVisitStart ? 1 : 0;
    }

    m07Window.complete(nowMs, rawComponents(true), inputMode);
  }

  return true;
}

/** The surface was closed (departure with the project at its current stage). */
export function closeM07Surface(nowMs: number) {
  if (!state.surfaceOpen) {
    return;
  }

  state.surfaceOpen = false;
  m07Window.pause(nowMs);

  if (!state.completed) {
    state.departures.push(state.stagesCompleted);

    if (state.visits > 1 && state.stagesCompleted > state.stagesAtVisitStart) {
      state.usefulReengagements += 1;
    }

    logM07('departed', {
      stages_completed: state.stagesCompleted,
      visit: state.visits,
      input_mode: 'system',
    });
  }
}

/**
 * Deck review: an unfinished project closes as a completed observation
 * (completion false). A bench never opened in EITHER phase records
 * absence; a bench never opened but whose end opportunity was presented
 * on the return closes as a completed observation with `start_state:
 * 'missing'` and zero stages — never a low value, never censored.
 */
export function closeM07AtReview(nowMs: number) {
  if (m07Window.windowStatus() === 'unopened') {
    if (state.endPresentedAtMs === null) {
      m07Window.markAbsent('bench never opened before the review');
      return;
    }

    m07Window.open(nowMs, {
      stages: M07_STAGES,
      settle_ms: M07_SETTLE_MS,
      endpoint_visible: true,
      opened_by: 'review_closure',
    });
  }

  if (m07Window.isOpen()) {
    closeM07Surface(nowMs);
    m07Window.complete(nowMs, rawComponents(false), 'system');
  }
}

/** Test-only escape hatch. */
export function resetM07State() {
  state = initial();
  m07Window.reset();
  m07Window.spec.windowId = M07_WINDOW_IDS.start;
}
