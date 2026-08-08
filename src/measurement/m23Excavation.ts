/**
 * M23 frozen-coupling excavation module state (action-assessment
 * rebuild, Unit 2).
 *
 * The 26-measure developmental battery's M23 ("useful persistence on a
 * hard but attainable extraction"): a resistant coolant-coupling
 * housing in the Coolant Yard that takes sustained, visible work to
 * free. Design rules implemented here:
 *
 * - HARD BUT ATTAINABLE: pure digging alone always completes the
 *   extraction (ten effective digs); the heat canister and pry bar are
 *   genuinely useful alternative strategies that shorten it. No fail
 *   state, no timer, no lockout — persistence is never punished.
 * - PROGRESS IS VISIBLE: every effective act advances a 0-100 progress
 *   value the host renders at the site.
 * - STRATEGY IS RECORDED, NOT SCORED: each act is logged with its kind
 *   and effectiveness so useful persistence stays distinguishable from
 *   any ineffective input, and strategy changes are visible in the raw
 *   record. Nothing here computes a score.
 *
 * OWNERSHIP (provisional M-battery namespace): this is an M23
 * opportunity with its own state container and proto_m23_* event
 * family. It reads/writes nothing of the Q23 intake rig, the repair
 * stream, or any other module. The M23<->Q-item crosswalk is an OPEN
 * research-owner decision; identifiers here are internal and
 * provisional, never canonical.
 */

export const M23_OPPORTUNITY_ID = 'proto_m23_frozen_coupling';
export const M23_ENTRY_STATE_VERSION = 'm23-frozen-coupling-v1';

/** Progress required to free the coupling. */
export const M23_PROGRESS_TARGET = 100;

/** Effective progress per act kind (fixed for every participant). */
export const M23_ACT_PROGRESS = {
  dig: 10,
  heat: 25,
  pry: 15,
} as const;

/** Pry bar leverage engages only once the housing is partly freed. */
export const M23_PRY_THRESHOLD = 50;

export type M23ActKind = 'dig' | 'heat' | 'pry';

export interface M23Act {
  kind: M23ActKind;
  /** False when the act could not advance progress (e.g. pry too early,
   * second heat with no canister). Ineffective acts stay recorded. */
  effective: boolean;
  /** Progress value after the act. */
  progress_after: number;
}

interface M23State {
  engaged: boolean;
  progress: number;
  acts: M23Act[];
  heat_used: boolean;
  completed: boolean;
}

function createInitialM23State(): M23State {
  return {
    engaged: false,
    progress: 0,
    acts: [],
    heat_used: false,
    completed: false,
  };
}

export const m23State: M23State = createInitialM23State();

export function markM23Engaged() {
  m23State.engaged = true;
}

/**
 * Applies one excavation act. `heatAvailable` is the host's inventory
 * fact (a heat canister is consumed by the host only when the act is
 * effective). Returns the recorded act.
 */
export function applyM23Act(
  kind: M23ActKind,
  options?: { heatAvailable?: boolean },
): M23Act {
  let effective = !m23State.completed;

  if (
    kind === 'heat' &&
    (m23State.heat_used || options?.heatAvailable !== true)
  ) {
    effective = false;
  }

  if (kind === 'pry' && m23State.progress < M23_PRY_THRESHOLD) {
    effective = false;
  }

  if (effective) {
    m23State.progress = Math.min(
      M23_PROGRESS_TARGET,
      m23State.progress + M23_ACT_PROGRESS[kind],
    );

    if (kind === 'heat') {
      m23State.heat_used = true;
    }

    if (m23State.progress >= M23_PROGRESS_TARGET) {
      m23State.completed = true;
    }
  }

  const act: M23Act = {
    kind,
    effective,
    progress_after: m23State.progress,
  };

  m23State.acts.push(act);

  return act;
}

export function m23Summary() {
  return {
    engaged: m23State.engaged,
    progress: m23State.progress,
    acts: m23State.acts.length,
    dig_acts: m23State.acts.filter((act) => act.kind === 'dig').length,
    heat_acts: m23State.acts.filter((act) => act.kind === 'heat').length,
    pry_acts: m23State.acts.filter((act) => act.kind === 'pry').length,
    ineffective_acts: m23State.acts.filter((act) => !act.effective).length,
    completed: m23State.completed,
  };
}

/** Test-only escape hatch (resetQ23State precedent). */
export function resetM23State() {
  Object.assign(m23State, createInitialM23State());
  m23State.acts = [];
}
