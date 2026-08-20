/**
 * Authoritative runtime inventory store (interactive inventory foundation).
 *
 * ONE module-scope InventoryState instance for the whole session —
 * exactly the persistence model every other gameplay system uses
 * (module scope survives scene.start() transitions; a page reload starts
 * a fresh session). Every mutation goes through the transactional engine
 * and is announced to subscribers with an InventoryChange record, so the
 * overlay UI, the legacy belt adapter (src/gameplay/inventory.ts) and the
 * telemetry adapter (telemetry.ts) all observe the same single source of
 * truth.
 *
 * This store retires the pre-foundation duplicate: the old ten-slot
 * module state in src/gameplay/inventory.ts is now a thin compatibility
 * adapter over this store's hotbar container. The Q01-Q04 kit-preparation
 * substrate (src/data/itemRegistry.ts) is intentionally untouched and
 * remains a separate measurement layer.
 */

import type { OpFailureReason, OpOutcome, PickUpMode } from './engine';
import {
  addItem,
  cancelHeld,
  commitRecipe,
  computeAddCapacity,
  computeItemTotals,
  consolidateStacks,
  createInitialInventoryState,
  cycleHotbarSelection,
  discardStack,
  loadSnapshot,
  pickUp,
  place,
  quickTransfer,
  selectHotbarSlot,
  sortContainer,
  takeStackOut,
  toSnapshot,
  validateInvariants,
} from './engine';
import type {
  ContainerNamespace,
  HeldStack,
  InventorySnapshotV1,
  InventoryState,
  ItemStack,
} from './model';
import { CONTAINER_IDS } from './model';

export interface InventoryChange {
  /** Command name, e.g. 'pick_up' | 'place' | 'sort' | 'commit_recipe'. */
  op: string;
  ok: boolean;
  reason?: OpFailureReason;
  /** Containers the command addressed (used for namespace routing). */
  containerIds: readonly string[];
  /**
   * Namespace of the change: 'general' ordinary inventory, or the
   * measurement workstation the containers belong to. Telemetry routing
   * keys off this — general ops NEVER produce proto_m02_* or proto_m03_*
   * events and workstation ops never produce secondary_inventory_*.
   */
  namespace: ContainerNamespace;
  detail?: Record<string, unknown>;
}

type InventoryStoreListener = (change: InventoryChange) => void;

let state: InventoryState = createInitialInventoryState();
let labSeeded = false;
const listeners = new Set<InventoryStoreListener>();
const pendingWorldDrops: ItemStack[] = [];

export function getInventoryState(): Readonly<InventoryState> {
  return state;
}

export function getHeldStack(): HeldStack | null {
  return state.held === null ? null : structuredClone(state.held);
}

export function onInventoryStoreChange(
  listener: InventoryStoreListener,
): () => void {
  listeners.add(listener);

  return () => listeners.delete(listener);
}

function namespaceOf(containerIds: readonly string[]): ContainerNamespace {
  for (const containerId of containerIds) {
    const container = state.containers[containerId];

    if (container !== undefined && container.namespace !== 'general') {
      return container.namespace;
    }
  }

  return 'general';
}

function commit(
  op: string,
  containerIds: readonly string[],
  outcome: OpOutcome,
  extraDetail?: Record<string, unknown>,
): InventoryChange {
  const namespace = namespaceOf(containerIds);

  state = outcome.state;

  const change: InventoryChange = {
    op,
    ok: outcome.result.ok,
    ...(outcome.result.ok ? {} : { reason: outcome.result.reason }),
    containerIds,
    namespace,
    detail: {
      ...(outcome.result.ok ? outcome.result.detail : {}),
      ...extraDetail,
    },
  };

  for (const listener of listeners) {
    listener(change);
  }

  return change;
}

/* ------------------------------------------------------------------ *
 * Commands (mouse and keyboard UI paths both call exactly these)
 * ------------------------------------------------------------------ */

export function invPickUp(
  containerId: string,
  slotIndex: number,
  mode: PickUpMode,
): InventoryChange {
  return commit(
    'pick_up',
    [containerId],
    pickUp(state, { containerId, slotIndex, mode }),
    { slot_index: slotIndex, mode },
  );
}

export function invPlace(
  containerId: string,
  slotIndex: number,
): InventoryChange {
  const sourceId = state.held?.source.containerId;

  return commit(
    'place',
    sourceId !== undefined && sourceId !== containerId
      ? [containerId, sourceId]
      : [containerId],
    place(state, { containerId, slotIndex }),
    { slot_index: slotIndex },
  );
}

export function invCancelHeld(): InventoryChange {
  const sourceId = state.held?.source.containerId;

  return commit(
    'cancel_held',
    sourceId !== undefined ? [sourceId] : [],
    cancelHeld(state),
  );
}

export function invQuickTransfer(
  containerId: string,
  slotIndex: number,
  targetContainerIds: readonly string[],
): InventoryChange {
  return commit(
    'quick_transfer',
    [containerId, ...targetContainerIds],
    quickTransfer(state, { containerId, slotIndex, targetContainerIds }),
    { slot_index: slotIndex },
  );
}

export function invSortContainer(containerId: string): InventoryChange {
  return commit('sort', [containerId], sortContainer(state, { containerId }));
}

export function invConsolidate(
  containerId: string,
  definitionId: string,
): InventoryChange {
  return commit(
    'consolidate',
    [containerId],
    consolidateStacks(state, { containerId, definitionId }),
    { definition_id: definitionId },
  );
}

export function invCommitRecipe(recipeId: string): InventoryChange {
  return commit(
    'commit_recipe',
    [CONTAINER_IDS.workbenchInput, CONTAINER_IDS.workbenchOutput],
    commitRecipe(state, { recipeId }),
    { recipe_id: recipeId },
  );
}

export function invAddItem(args: {
  definitionId: string;
  quantity: number;
  targetContainerIds: readonly string[];
  allOrNothing: boolean;
}): InventoryChange {
  return commit('add_item', args.targetContainerIds, addItem(state, args), {
    definition_id: args.definitionId,
    quantity: args.quantity,
  });
}

export function invRemainingCapacity(
  definitionId: string,
  targetContainerIds: readonly string[],
): number {
  return computeAddCapacity(state, definitionId, targetContainerIds);
}

/**
 * Removes a stack for a confirmed world drop; the removed stack is queued
 * for the host scene to materialise as a recoverable world bundle when it
 * resumes (drainWorldDrops).
 */
export function invDropToWorld(
  containerId: string,
  slotIndex: number,
): InventoryChange {
  const outcome = takeStackOut(state, { containerId, slotIndex });
  const change = commit('world_drop', [containerId], outcome, {
    slot_index: slotIndex,
  });

  if (change.ok && outcome.stack !== null) {
    pendingWorldDrops.push(outcome.stack);
  }

  return change;
}

export function drainWorldDrops(): ItemStack[] {
  return pendingWorldDrops.splice(0, pendingWorldDrops.length);
}

/**
 * Legacy-belt removal (use/install/deliver): the stack leaves the
 * inventory and is consumed by the calling room mechanic — it is NOT a
 * world drop and is never queued. Exists only for the compatibility
 * adapter in src/gameplay/inventory.ts.
 */
export function invTakeStackOutForLegacyRemove(
  containerId: string,
  slotIndex: number,
): InventoryChange {
  const outcome = takeStackOut(state, { containerId, slotIndex });

  return commit('legacy_remove', [containerId], outcome, {
    slot_index: slotIndex,
  });
}

export function invDiscard(
  containerId: string,
  slotIndex: number,
): InventoryChange {
  return commit(
    'discard',
    [containerId],
    discardStack(state, { containerId, slotIndex }),
    { slot_index: slotIndex },
  );
}

export function invSelectHotbarSlot(slotIndex: number): InventoryChange {
  return commit(
    'select_hotbar',
    [CONTAINER_IDS.playerHotbar],
    selectHotbarSlot(state, slotIndex),
    { slot_index: slotIndex },
  );
}

export function invCycleHotbarSelection(): InventoryChange {
  return commit(
    'cycle_hotbar',
    [CONTAINER_IDS.playerHotbar],
    cycleHotbarSelection(state),
  );
}

/* ------------------------------------------------------------------ *
 * Snapshots
 * ------------------------------------------------------------------ */

export function snapshotInventory(): InventorySnapshotV1 {
  return toSnapshot(state);
}

export function loadInventorySnapshot(snapshot: unknown): InventoryChange {
  const outcome = loadSnapshot(snapshot);

  // A failed load keeps the CURRENT state (never the fresh fallback).
  if (!outcome.result.ok) {
    return commit('load_snapshot', [], { state, result: outcome.result });
  }

  return commit('load_snapshot', [], outcome);
}

export function inventoryTotals(): Record<string, number> {
  return computeItemTotals(state);
}

export function inventoryInvariantError(): string | null {
  return validateInvariants(state);
}

/* ------------------------------------------------------------------ *
 * Inventory Lab seeding (idempotent, once per session)
 * ------------------------------------------------------------------ */

/**
 * Positional container seeding (Lab storage stock, M02 desk layout, M03
 * residual layout). Refuses to seed a non-empty container — seeding is
 * an entry-state materialisation, never an overwrite.
 */
export function seedContainerPositional(
  containerId: string,
  entries: readonly ({ definitionId: string; quantity: number } | null)[],
  op: string,
): InventoryChange {
  const container = state.containers[containerId];
  const fail = (reason: OpFailureReason): InventoryChange =>
    commit(op, [containerId], { state, result: { ok: false, reason } });

  if (container === undefined) {
    return fail('unknown_container');
  }

  if (
    entries.length > container.capacity ||
    container.slots.some((slot) => slot !== null)
  ) {
    return fail('occupied');
  }

  const draft = structuredClone(state);
  const draftContainer = draft.containers[containerId];

  for (let index = 0; index < entries.length; index++) {
    const entry = entries[index];

    if (entry === null) {
      continue;
    }

    draftContainer.slots[index] = {
      stackId: `stk_${draft.nextStackSeq}`,
      definitionId: entry.definitionId,
      quantity: entry.quantity,
    };
    draft.nextStackSeq += 1;
  }

  if (validateInvariants(draft) !== null) {
    return fail('invariant_violation');
  }

  return commit(op, [containerId], {
    state: draft,
    result: {
      ok: true,
      detail: { seeded: entries.filter((entry) => entry !== null).length },
    },
  });
}

/** Deterministic demonstration stock for the Lab storage container. */
const LAB_STORAGE_SEED: readonly { definitionId: string; quantity: number }[] =
  [
    { definitionId: 'field_ration', quantity: 4 },
    { definitionId: 'fuse_contact', quantity: 2 },
    { definitionId: 'relay_housing', quantity: 1 },
    { definitionId: 'sample_vial', quantity: 2 },
    { definitionId: 'seal_cap', quantity: 3 },
    { definitionId: 'wire_spool', quantity: 2 },
    { definitionId: 'insulation_wrap', quantity: 2 },
    { definitionId: 'spare_gasket', quantity: 4 },
    { definitionId: 'filter_cell', quantity: 2 },
    { definitionId: 'beacon_cell', quantity: 1 },
    { definitionId: 'field_ration', quantity: 4 },
    { definitionId: 'fuse_contact', quantity: 3 },
    { definitionId: 'relay_housing', quantity: 1 },
    { definitionId: 'sample_vial', quantity: 1 },
    { definitionId: 'seal_cap', quantity: 2 },
    { definitionId: 'wire_spool', quantity: 3 },
    { definitionId: 'insulation_wrap', quantity: 3 },
    { definitionId: 'spare_gasket', quantity: 2 },
    { definitionId: 'filter_cell', quantity: 1 },
    { definitionId: 'beacon_cell', quantity: 2 },
  ];

/**
 * Seeds the Lab storage container with its demonstration stock, exactly
 * once per session. Slot-per-entry placement (no merging) so partial
 * stacks exist for the merge/split/consolidate demonstrations.
 */
export function ensureLabStorageSeeded() {
  if (labSeeded) {
    return;
  }

  labSeeded = true;
  seedContainerPositional(
    CONTAINER_IDS.labStorage,
    LAB_STORAGE_SEED,
    'seed_lab_storage',
  );
}

/* ------------------------------------------------------------------ *
 * Session reset (test-only escape hatch, resetGameplayInventory parity)
 * ------------------------------------------------------------------ */

export function resetInventoryStore() {
  state = createInitialInventoryState();
  labSeeded = false;
  pendingWorldDrops.length = 0;

  const change: InventoryChange = {
    op: 'reset',
    ok: true,
    containerIds: [],
    namespace: 'general',
  };

  for (const listener of listeners) {
    listener(change);
  }
}
