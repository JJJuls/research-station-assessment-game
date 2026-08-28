/**
 * M05 — Two matched initiation occasions (evidence-led pilot v2, Unit 2
 * hosts occasion 1 in the Concourse; Unit 4 hosts occasion 2 in the yard).
 *
 * Ledger (sheet 09): after objective comprehension, present two low-risk
 * visible faults at separate quiet moments without an NPC command; other
 * actions remain neutral; the clock starts after comprehension; fixed
 * distance/access; valid focus/input state; no competing mandatory
 * action; latency censoring preserved.
 *
 * Mechanic: a small visible fault object (occasion 1: a flickering desk
 * lamp on the Concourse; occasion 2: a loose cable flag in the yard) at a
 * fixed distance from where the participant stands when the occasion is
 * presented. Nobody mentions it. Interacting with it (E) is the
 * initiation act (a two-second neutral fix). The window is presented
 * only when no prompt is open and no mandatory action is pending; it
 * closes (censored, with a reason) when the participant leaves the zone
 * or the route stage moves on.
 *
 * Raw components: eligible_opportunity, initiation_latency (ms from
 * presentation to the initiation act; null when censored), initiated,
 * censored_reason, occasion_id.
 */
import { type InputMode, ItemWindow } from './windowKit';

export type M05Occasion = 'o1' | 'o2';

export const M05_OPPORTUNITY_IDS: Record<M05Occasion, string> = {
  o1: 'proto_m05_initiation_o1',
  o2: 'proto_m05_initiation_o2',
};
export const M05_ENTRY_STATE_VERSION = 'm05-initiation-v1';
export const M05_FAMILY = 'proto_m05_initiation_';

export const M05_FAULTS: Record<
  M05Occasion,
  { label: string; fixLabel: string; scene: string }
> = {
  o1: {
    label: 'Flickering desk lamp',
    fixLabel: 'Reseat the lamp connector',
    scene: 'station_concourse',
  },
  o2: {
    label: 'Loose cable flag',
    fixLabel: 'Re-tie the cable flag',
    scene: 'exterior_recovery_yard',
  },
};

interface M05OccasionState {
  presentedAtMs: number | null;
  eligible: boolean;
  initiatedAtMs: number | null;
  fixedAtMs: number | null;
  censoredReason: string | null;
  closed: boolean;
  /** Distance (px) from the participant when presented. */
  presentedDistance: number | null;
}

const states: Record<M05Occasion, M05OccasionState> = {
  o1: initial(),
  o2: initial(),
};

function initial(): M05OccasionState {
  return {
    presentedAtMs: null,
    eligible: false,
    initiatedAtMs: null,
    fixedAtMs: null,
    censoredReason: null,
    closed: false,
    presentedDistance: null,
  };
}

export const m05Windows: Record<M05Occasion, ItemWindow> = {
  o1: new ItemWindow({
    item: 'M05',
    opportunityId: M05_OPPORTUNITY_IDS.o1,
    windowId: 'm05_initiation_o1',
    entryStateVersion: M05_ENTRY_STATE_VERSION,
    family: M05_FAMILY,
    scene: 'station_concourse',
    objectId: 'm05_fault_o1',
    occasion: 'o1',
  }),
  o2: new ItemWindow({
    item: 'M05',
    opportunityId: M05_OPPORTUNITY_IDS.o2,
    windowId: 'm05_initiation_o2',
    entryStateVersion: M05_ENTRY_STATE_VERSION,
    family: M05_FAMILY,
    scene: 'exterior_recovery_yard',
    objectId: 'm05_fault_o2',
    occasion: 'o2',
  }),
};

export function declareM05(occasion: M05Occasion) {
  m05Windows[occasion].declare();
}

export function m05State(occasion: M05Occasion): Readonly<M05OccasionState> {
  return states[occasion];
}

export function m05Presented(occasion: M05Occasion): boolean {
  return states[occasion].presentedAtMs !== null;
}

export function m05Open(occasion: M05Occasion): boolean {
  const s = states[occasion];

  return s.presentedAtMs !== null && !s.closed;
}

/**
 * Presents the fault (the object becomes visible/active). Call only at a
 * quiet moment: comprehension passed, no prompt open, no mandatory action.
 * `eligible=false` records an invalid-entry presentation (never low).
 */
export function presentM05(
  occasion: M05Occasion,
  nowMs: number,
  context: {
    eligible: boolean;
    distance: number;
    comprehension: 'passed' | 'skipped' | 'failed';
  },
) {
  const s = states[occasion];

  if (s.presentedAtMs !== null) {
    return;
  }

  declareM05(occasion);
  s.presentedAtMs = nowMs;
  s.eligible = context.eligible;
  s.presentedDistance = context.distance;

  const window = m05Windows[occasion];

  window.setComprehension(context.comprehension);
  window.open(nowMs, {
    fault: M05_FAULTS[occasion].label,
    distance_px: context.distance,
    eligible_opportunity: context.eligible,
  });

  if (!context.eligible || context.comprehension !== 'passed') {
    window.invalidate(
      context.comprehension !== 'passed'
        ? 'comprehension_failure'
        : 'invalid_entry_state',
      `presented ineligible: comprehension=${context.comprehension}`,
    );
  }
}

/** The initiation act (E at the fault). */
export function initiateM05(
  occasion: M05Occasion,
  nowMs: number,
  inputMode: InputMode,
): boolean {
  const s = states[occasion];

  if (!m05Open(occasion) || s.initiatedAtMs !== null) {
    return false;
  }

  s.initiatedAtMs = nowMs;
  m05Windows[occasion].log('initiated', {
    initiation_latency_ms: nowMs - (s.presentedAtMs ?? nowMs),
    input_mode: inputMode,
  });

  return true;
}

/** The neutral fix finished (timed action complete). */
export function completeM05Fix(
  occasion: M05Occasion,
  nowMs: number,
  inputMode: InputMode,
) {
  const s = states[occasion];

  if (!m05Open(occasion) || s.initiatedAtMs === null) {
    return;
  }

  s.fixedAtMs = nowMs;
  s.closed = true;
  m05Windows[occasion].complete(
    nowMs,
    {
      occasion_id: occasion,
      eligible_opportunity: s.eligible,
      initiated: true,
      initiation_latency_ms:
        s.initiatedAtMs - (s.presentedAtMs ?? s.initiatedAtMs),
      fix_duration_ms: nowMs - s.initiatedAtMs,
      censored_reason: null,
      presented_distance_px: s.presentedDistance,
    },
    inputMode,
  );
}

/**
 * Censor the occasion (left the zone / stage moved on / review). The
 * observation is COMPLETE with initiated=false and a censoring reason —
 * latency is right-censored at the closure time, never a low value.
 */
export function censorM05(
  occasion: M05Occasion,
  nowMs: number,
  reason: 'left_zone' | 'stage_advanced' | 'review',
) {
  const s = states[occasion];

  if (!m05Open(occasion)) {
    return;
  }

  s.closed = true;
  s.censoredReason = reason;
  m05Windows[occasion].complete(
    nowMs,
    {
      occasion_id: occasion,
      eligible_opportunity: s.eligible,
      initiated: s.initiatedAtMs !== null,
      initiation_latency_ms:
        s.initiatedAtMs === null
          ? null
          : s.initiatedAtMs - (s.presentedAtMs ?? 0),
      censored_at_ms: nowMs - (s.presentedAtMs ?? nowMs),
      censored_reason: reason,
      presented_distance_px: s.presentedDistance,
    },
    'system',
  );
}

/** Never presented before the review → missing (never low). */
export function closeM05AtReview(occasion: M05Occasion, nowMs: number) {
  if (!m05Presented(occasion)) {
    m05Windows[occasion].markAbsent('fault never presented before the review');
    return;
  }

  censorM05(occasion, nowMs, 'review');
}

/** Test-only escape hatch. */
export function resetM05State() {
  states.o1 = initial();
  states.o2 = initial();
  m05Windows.o1.reset();
  m05Windows.o2.reset();
}
