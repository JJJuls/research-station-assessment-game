/**
 * Q23 separately bounded retry-quality module state (physical-mechanics
 * session, Unit 4).
 *
 * The brief's §12 remedy for Q23 ("keeps trying when hard"): a bounded
 * retry-quality opportunity with its OWN instance and state container, so
 * adaptive-retry evidence no longer has to ride the contested shared
 * repair stream (`repair_strategy_revision` Q14/Q21/Q23 — that ownership
 * split remains an open event-schema decision and is untouched here).
 *
 * The Auxiliary Intake Rig (Systems Repair room, separate station):
 * - The first alignment attempt fails deterministically for everyone
 *   (standardised, attainable setback).
 * - Usable diagnostic feedback exists and is explicit: the failure names
 *   the mismatch, and the gauge card station lists the current values.
 * - At least two meaningful strategy options: repeat the identical
 *   alignment, adjust by feel (a real but unguided change), or match the
 *   gauge values (support-informed revision).
 * - The support-informed revision succeeds; an identical retry and an
 *   unguided adjustment are distinct recorded acts, so identical
 *   repetition is DISTINGUISHABLE from adaptive retry inside this one
 *   window.
 *
 * OWNERSHIP: this module is a Q23 opportunity. Its identical-attempt
 * markers are Q23-window contrast facts ("identical vs revised"), and are
 * NOT Q26 evidence — Q26 keeps its own singly-owned identical-repetition
 * events in the Archive/Repair windows; no act here feeds two primaries.
 * All identifiers are proto_* provisional; no canonical name, formula or
 * score exists; a session that never engages the rig records absence,
 * never low persistence.
 */

export const Q23_OPPORTUNITY_ID = 'proto_q23_intake_rig';
export const Q23_ENTRY_STATE_VERSION = 'q23-intake-rig-v1';

export type Q23Strategy =
  | 'initial'
  | 'identical'
  | 'unguided_change'
  | 'guided_change';

interface Q23State {
  engaged: boolean;
  /** 1-indexed attempts, in order, with the strategy of each. */
  attempts: Q23Strategy[];
  gauge_viewed: boolean;
  completed: boolean;
}

function createInitialQ23State(): Q23State {
  return {
    engaged: false,
    attempts: [],
    gauge_viewed: false,
    completed: false,
  };
}

export const q23State: Q23State = createInitialQ23State();

export function markQ23Engaged() {
  q23State.engaged = true;
}

export function markQ23GaugeViewed() {
  q23State.gauge_viewed = true;
}

/**
 * Records one attempt and returns whether it succeeds. The first attempt
 * always fails (standardised setback); afterwards only the gauge-informed
 * revision succeeds — matching the values without having consulted the
 * gauge is impossible in-fiction, so the "match the gauge" act without a
 * prior gauge view is a real unguided change and fails as one.
 */
export function attemptQ23Alignment(
  strategy: 'identical' | 'unguided_change' | 'guided_change',
): { attemptNumber: number; recorded: Q23Strategy; success: boolean } {
  const attemptNumber = q23State.attempts.length + 1;

  if (attemptNumber === 1) {
    q23State.attempts.push('initial');

    return { attemptNumber, recorded: 'initial', success: false };
  }

  const recorded: Q23Strategy =
    strategy === 'guided_change' && !q23State.gauge_viewed
      ? 'unguided_change'
      : strategy;
  const success = recorded === 'guided_change';

  q23State.attempts.push(recorded);

  if (success) {
    q23State.completed = true;
  }

  return { attemptNumber, recorded, success };
}

export function q23Summary() {
  return {
    attempts: q23State.attempts.length,
    identical_retries: q23State.attempts.filter(
      (entry) => entry === 'identical',
    ).length,
    unguided_changes: q23State.attempts.filter(
      (entry) => entry === 'unguided_change',
    ).length,
    gauge_viewed: q23State.gauge_viewed,
    completed: q23State.completed,
  };
}

/** Test-only escape hatch (resetQ03State precedent). */
export function resetQ23State() {
  Object.assign(q23State, createInitialQ23State());
  q23State.attempts = [];
}
