/**
 * M03 — provisional repeated optional workstation reset (interactive
 * inventory foundation).
 *
 * Two distinct matched occasions (A and B). Each follows a real short
 * activity (a press run) that leaves exactly five standardised residual
 * objects on the work surface. The participant is NEVER instructed to
 * tidy: a component store tray simply exists, departure is always
 * available, and the surface state is captured when the window closes.
 * Leaving everything in place is a fully valid observation.
 *
 * SCIENTIFIC BOUNDARY:
 * - Every event is in the `proto_m03_*` family ONLY, with opportunity_id
 *   distinguishing occasions A and B (both belong exclusively to M03).
 * - Objects are disjoint from M02's (residuals, not records) and from
 *   ordinary inventory items (namespace-bound: never enter the player
 *   inventory).
 * - Occasions are independent of M02 completion and of each other's
 *   tidying behaviour; the starting state is identical by construction
 *   and recorded as such.
 * - No ordinary Sort control exists in this context; no final M03 score
 *   is calculated anywhere.
 */

import {
  declareOpportunity,
  markOpportunityCompleted,
  markOpportunityEntered,
  markOpportunityInvalid,
  markOpportunityOffered,
  refreshValidityProbe,
} from '../measurement/validity';
import { researchRuntime } from '../systems';
import { M03_RESIDUAL_IDS } from './itemDefs';
import { CONTAINER_IDS } from './model';
import type { InventoryChange } from './store';
import {
  getInventoryState,
  onInventoryStoreChange,
  seedContainerPositional,
} from './store';

export type M03OccasionId = 'a' | 'b';

export const M03_OPPORTUNITY_IDS: Record<M03OccasionId, string> = {
  a: 'proto_m03_reset_a',
  b: 'proto_m03_reset_b',
};

export const M03_ENTRY_STATE_VERSION = 'm03-reset-v1';

/** Identical starting state for both occasions (recorded, not varied). */
export const M03_STARTING_CONDITION = 'fixed_identical_layout';

export const M03_CONTAINERS: Record<
  M03OccasionId,
  { surface: string; store: string }
> = {
  a: { surface: CONTAINER_IDS.m03SurfaceA, store: CONTAINER_IDS.m03StoreA },
  b: { surface: CONTAINER_IDS.m03SurfaceB, store: CONTAINER_IDS.m03StoreB },
};

/** Residuals land scattered on the surface grid (slots 0,2,3,5,7). */
const RESIDUAL_SURFACE_SLOTS = [0, 2, 3, 5, 7] as const;

export const M03_PRESS_CYCLES_REQUIRED = 3;

export type M03OccasionStatus =
  | 'idle'
  | 'activity_running'
  | 'window_open'
  | 'closed';

interface M03Occasion {
  status: M03OccasionStatus;
  pressCycles: number;
  moves: number;
  storedEver: number;
  openedAtMs: number | null;
  activeMs: number;
  unsubscribe: (() => void) | null;
}

function createOccasion(): M03Occasion {
  return {
    status: 'idle',
    pressCycles: 0,
    moves: 0,
    storedEver: 0,
    openedAtMs: null,
    activeMs: 0,
    unsubscribe: null,
  };
}

let occasions: Record<M03OccasionId, M03Occasion> = {
  a: createOccasion(),
  b: createOccasion(),
};

function logM03(
  occasionId: M03OccasionId,
  eventType: string,
  metadata: Record<string, unknown> = {},
) {
  researchRuntime.logInteraction({
    scene: 'inventory_lab',
    object_id: `m03_press_bench_${occasionId}`,
    episode: 'proto_m03',
    event_type: eventType,
    metadata: {
      measure_id: 'M03',
      opportunity_id: M03_OPPORTUNITY_IDS[occasionId],
      window_id: `m03_reset_window_${occasionId}`,
      entry_state_version: M03_ENTRY_STATE_VERSION,
      // Not a counterbalance assignment: both occasions share one fixed
      // recorded starting condition (register `form` carries the same).
      starting_condition: M03_STARTING_CONDITION,
      ...metadata,
    },
  });
}

/** Residual locations for one occasion: surface vs store, per object. */
export function m03SurfaceState(occasionId: M03OccasionId) {
  const { surface, store } = M03_CONTAINERS[occasionId];
  const state = getInventoryState();
  const locate = (containerId: string) =>
    state.containers[containerId].slots
      .filter((slot): slot is NonNullable<typeof slot> => slot !== null)
      .map((slot) => slot.definitionId);
  const onSurface = locate(surface);
  const inStore = locate(store);

  return {
    on_surface: onSurface,
    in_store: inStore,
    left_count: onSurface.length,
    stored_count: inStore.length,
  };
}

export function m03OccasionStatus(
  occasionId: M03OccasionId,
): M03OccasionStatus {
  return occasions[occasionId].status;
}

export function m03PressCycles(occasionId: M03OccasionId): number {
  return occasions[occasionId].pressCycles;
}

/**
 * Declares both occasions (Lab scene create). Neither is gated on M02 or
 * on the other occasion — both are offered by existing in the room.
 */
export function declareM03Opportunities() {
  for (const occasionId of ['a', 'b'] as const) {
    declareOpportunity({
      opportunity_id: M03_OPPORTUNITY_IDS[occasionId],
      owner: 'M03',
      entry_state_version: M03_ENTRY_STATE_VERSION,
      // `form` records the fixed identical starting condition; the
      // counterbalance slot stays null because nothing is counterbalanced.
      form: M03_STARTING_CONDITION,
    });
    markOpportunityOffered(M03_OPPORTUNITY_IDS[occasionId]);
  }

  refreshValidityProbe();
}

function observeOccasion(occasionId: M03OccasionId) {
  const occasion = occasions[occasionId];
  const { surface, store } = M03_CONTAINERS[occasionId];

  let lastState = m03SurfaceState(occasionId);

  occasion.unsubscribe = onInventoryStoreChange((change: InventoryChange) => {
    if (
      !change.ok ||
      change.namespace !== 'm03' ||
      occasion.status !== 'window_open' ||
      !change.containerIds.some(
        (containerId) => containerId === surface || containerId === store,
      )
    ) {
      return;
    }

    if (change.op === 'seed_m03_surface') {
      lastState = m03SurfaceState(occasionId);
      return;
    }

    const nextState = m03SurfaceState(occasionId);
    const newlyStored = nextState.in_store.filter(
      (definitionId) => !lastState.in_store.includes(definitionId),
    );
    const movedCount =
      newlyStored.length +
      lastState.in_store.filter(
        (definitionId) => !nextState.in_store.includes(definitionId),
      ).length;

    if (movedCount > 0 || change.op === 'place') {
      occasion.moves += 1;
      logM03(occasionId, 'proto_m03_residual_moved', { op: change.op });
    }

    for (const definitionId of newlyStored) {
      occasion.storedEver += 1;
      logM03(occasionId, 'proto_m03_residual_stored', {
        object_id: definitionId,
      });
    }

    lastState = nextState;
  });
}

/**
 * One press cycle of the bench activity. On the final cycle the activity
 * completes, the five standardised residuals appear on the surface and
 * the reset window opens.
 */
export function runM03PressCycle(
  occasionId: M03OccasionId,
  nowMs: number,
): {
  status: M03OccasionStatus;
  cycles: number;
} {
  const occasion = occasions[occasionId];

  if (occasion.status === 'closed' || occasion.status === 'window_open') {
    return { status: occasion.status, cycles: occasion.pressCycles };
  }

  occasion.status = 'activity_running';
  occasion.pressCycles += 1;
  logM03(occasionId, 'proto_m03_press_cycle', {
    cycle: occasion.pressCycles,
    of: M03_PRESS_CYCLES_REQUIRED,
  });

  if (occasion.pressCycles < M03_PRESS_CYCLES_REQUIRED) {
    return { status: occasion.status, cycles: occasion.pressCycles };
  }

  const entries: ({ definitionId: string; quantity: number } | null)[] =
    new Array(8).fill(null);

  M03_RESIDUAL_IDS.forEach((definitionId, index) => {
    entries[RESIDUAL_SURFACE_SLOTS[index]] = { definitionId, quantity: 1 };
  });

  const seedChange = seedContainerPositional(
    M03_CONTAINERS[occasionId].surface,
    entries,
    'seed_m03_surface',
  );

  if (!seedChange.ok) {
    markOpportunityInvalid(
      M03_OPPORTUNITY_IDS[occasionId],
      'technical_failure',
      `residual seed failed: ${seedChange.reason ?? 'unknown'}`,
    );
    refreshValidityProbe();
    logM03(occasionId, 'proto_m03_technical_failure', {
      stage: 'seed',
      reason: seedChange.reason ?? 'unknown',
    });

    return { status: occasion.status, cycles: occasion.pressCycles };
  }

  occasion.status = 'window_open';
  occasion.openedAtMs = nowMs;
  markOpportunityEntered(M03_OPPORTUNITY_IDS[occasionId]);
  refreshValidityProbe();
  observeOccasion(occasionId);
  logM03(occasionId, 'proto_m03_opportunity_opened', {
    residual_slots: [...RESIDUAL_SURFACE_SLOTS],
    residuals: [...M03_RESIDUAL_IDS],
  });

  return { status: occasion.status, cycles: occasion.pressCycles };
}

/**
 * Departure/window close: captures the surface state exactly as left.
 * This is the observation — completing WITHOUT tidying is fully valid,
 * so closure marks the opportunity completed either way.
 */
export function closeM03Window(
  occasionId: M03OccasionId,
  nowMs: number,
): boolean {
  const occasion = occasions[occasionId];

  if (occasion.status !== 'window_open') {
    return false;
  }

  occasion.status = 'closed';
  occasion.activeMs +=
    occasion.openedAtMs === null ? 0 : Math.max(0, nowMs - occasion.openedAtMs);
  occasion.unsubscribe?.();
  occasion.unsubscribe = null;

  // The panel IS the work surface, so closing the panel is the only
  // departure path; a single close reason is recorded (no dead variants).
  logM03(occasionId, 'proto_m03_surface_state_at_departure', {
    ...m03SurfaceState(occasionId),
    move_count: occasion.moves,
    close_reason: 'panel_closed',
    elapsed_active_ms: occasion.activeMs,
  });
  logM03(occasionId, 'proto_m03_window_closed', {
    close_reason: 'panel_closed',
  });
  markOpportunityCompleted(M03_OPPORTUNITY_IDS[occasionId]);
  refreshValidityProbe();

  return true;
}

/** Technical-failure contamination hook (never a low measurement). */
export function markM03TechnicalFailure(
  occasionId: M03OccasionId,
  detail: string,
) {
  markOpportunityInvalid(
    M03_OPPORTUNITY_IDS[occasionId],
    'technical_failure',
    detail,
  );
  refreshValidityProbe();
  logM03(occasionId, 'proto_m03_technical_failure', { detail });
}

/** Test-only escape hatch (resetGameplayInventory precedent). */
export function resetM03State() {
  for (const occasion of Object.values(occasions)) {
    occasion.unsubscribe?.();
  }

  occasions = { a: createOccasion(), b: createOccasion() };
}
