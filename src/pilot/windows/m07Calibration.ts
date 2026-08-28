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
import { type InputMode, ItemWindow } from './windowKit';

export const M07_OPPORTUNITY_ID = 'proto_m07_calibration_project';
export const M07_ENTRY_STATE_VERSION = 'm07-calibration-v1';
export const M07_FAMILY = 'proto_m07_calibration_';
export const M07_STAGES = 6;
export const M07_SETTLE_MS = 1400;

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
  };
}

export const m07Window = new ItemWindow({
  item: 'M07',
  opportunityId: M07_OPPORTUNITY_ID,
  windowId: 'm07_calibration_start',
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
    m07Window.spec.windowId = 'm07_calibration_end';
    m07Window.log('returned', {
      visit: state.visits,
      stages_completed: state.stagesCompleted,
      route_stage: stage,
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
  m07Window.log('stage_advanced', {
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

    m07Window.complete(
      nowMs,
      {
        stages_completed: state.stagesCompleted,
        voluntary_returns: state.voluntaryReturns,
        useful_reengagement: state.usefulReengagements,
        completion: true,
        departure_state: [...state.departures],
        visits: state.visits,
      },
      inputMode,
    );
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

    m07Window.log('departed', {
      stages_completed: state.stagesCompleted,
      visit: state.visits,
      input_mode: 'system',
    });
  }
}

/** Deck review: an unfinished project closes as a completed observation. */
export function closeM07AtReview(nowMs: number) {
  if (m07Window.windowStatus() === 'unopened') {
    m07Window.markAbsent('bench never opened before the review');
    return;
  }

  if (m07Window.isOpen()) {
    closeM07Surface(nowMs);
    m07Window.complete(
      nowMs,
      {
        stages_completed: state.stagesCompleted,
        voluntary_returns: state.voluntaryReturns,
        useful_reengagement: state.usefulReengagements,
        completion: false,
        departure_state: [...state.departures],
        visits: state.visits,
      },
      'system',
    );
  }
}

/** Test-only escape hatch. */
export function resetM07State() {
  state = initial();
  m07Window.reset();
  m07Window.spec.windowId = 'm07_calibration_start';
}
