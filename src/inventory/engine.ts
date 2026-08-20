/**
 * Transactional inventory engine (interactive inventory foundation).
 *
 * Pure functions over InventoryState. Every command:
 *
 * - operates on a structured clone of the state (never the live object);
 * - returns an explicit success/failure result — no silent no-ops;
 * - is validated post-hoc against the full invariant set AND an item-
 *   conservation check before it is allowed to commit. A command that
 *   would violate an invariant returns the COMPLETE prior state
 *   unchanged.
 *
 * Conserved totals are the default; only an explicitly committed recipe,
 * a confirmed discard, a world hand-off (takeStackOut) or a world pickup
 * (addItem) may declare an expected delta.
 *
 * No Phaser, no telemetry, no globals — the module-scope store
 * (store.ts) owns the single runtime instance and change notification.
 */

import { getItemDefinition, isKnownItemDefinition } from './itemDefs';
import type {
  Container,
  HeldStack,
  InventorySnapshotV1,
  InventoryState,
  ItemStack,
  LegacyGameInventorySnapshot,
  SerializedStack,
} from './model';
import {
  BACKPACK_CAPACITY,
  CONTAINER_IDS,
  getRecipe,
  HOTBAR_CAPACITY,
  INVENTORY_SCHEMA_VERSION,
  LAB_STORAGE_CAPACITY,
  WORKBENCH_INPUT_CAPACITY,
  WORKBENCH_OUTPUT_CAPACITY,
} from './model';

/* ------------------------------------------------------------------ *
 * Results
 * ------------------------------------------------------------------ */

export type OpFailureReason =
  | 'unknown_container'
  | 'unknown_slot'
  | 'empty_slot'
  | 'occupied'
  | 'not_accepted'
  | 'holding'
  | 'not_holding'
  | 'target_full'
  | 'invalid_quantity'
  | 'sort_unavailable'
  | 'recipe_unknown'
  | 'recipe_incomplete'
  | 'recipe_output_blocked'
  | 'not_discardable'
  | 'not_droppable'
  | 'unknown_definition'
  | 'bad_snapshot'
  | 'invariant_violation';

export type OpResult =
  | { ok: true; detail?: Record<string, unknown> }
  | { ok: false; reason: OpFailureReason };

export interface OpOutcome {
  state: InventoryState;
  result: OpResult;
}

/* ------------------------------------------------------------------ *
 * Container specs and initial state
 * ------------------------------------------------------------------ */

interface ContainerSpec {
  containerId: string;
  containerType: Container['containerType'];
  capacity: number;
  namespace: Container['namespace'];
  acceptTags?: readonly string[];
  insertLocked?: boolean;
}

const CONTAINER_SPECS: readonly ContainerSpec[] = [
  {
    containerId: CONTAINER_IDS.playerHotbar,
    containerType: 'hotbar',
    capacity: HOTBAR_CAPACITY,
    namespace: 'general',
  },
  {
    containerId: CONTAINER_IDS.playerBackpack,
    containerType: 'backpack',
    capacity: BACKPACK_CAPACITY,
    namespace: 'general',
  },
  {
    containerId: CONTAINER_IDS.labStorage,
    containerType: 'storage',
    capacity: LAB_STORAGE_CAPACITY,
    namespace: 'general',
  },
  {
    containerId: CONTAINER_IDS.workbenchInput,
    containerType: 'workbench_input',
    capacity: WORKBENCH_INPUT_CAPACITY,
    namespace: 'general',
  },
  {
    containerId: CONTAINER_IDS.workbenchOutput,
    containerType: 'workbench_output',
    capacity: WORKBENCH_OUTPUT_CAPACITY,
    namespace: 'general',
    insertLocked: true,
  },
  {
    containerId: CONTAINER_IDS.m02Desk,
    containerType: 'm02_desk',
    capacity: 12,
    namespace: 'm02',
    acceptTags: ['m02_record'],
  },
  {
    containerId: CONTAINER_IDS.m02FolderIr7,
    containerType: 'm02_folder',
    capacity: 4,
    namespace: 'm02',
    acceptTags: ['m02_record'],
  },
  {
    containerId: CONTAINER_IDS.m02FolderIr12,
    containerType: 'm02_folder',
    capacity: 4,
    namespace: 'm02',
    acceptTags: ['m02_record'],
  },
  {
    containerId: CONTAINER_IDS.m02FolderIr19,
    containerType: 'm02_folder',
    capacity: 4,
    namespace: 'm02',
    acceptTags: ['m02_record'],
  },
  {
    containerId: CONTAINER_IDS.m03SurfaceA,
    containerType: 'm03_surface',
    capacity: 8,
    namespace: 'm03',
    acceptTags: ['m03_residue'],
  },
  {
    containerId: CONTAINER_IDS.m03StoreA,
    containerType: 'm03_store',
    capacity: 6,
    namespace: 'm03',
    acceptTags: ['m03_residue'],
  },
  {
    containerId: CONTAINER_IDS.m03SurfaceB,
    containerType: 'm03_surface',
    capacity: 8,
    namespace: 'm03',
    acceptTags: ['m03_residue'],
  },
  {
    containerId: CONTAINER_IDS.m03StoreB,
    containerType: 'm03_store',
    capacity: 6,
    namespace: 'm03',
    acceptTags: ['m03_residue'],
  },
];

export function createInitialInventoryState(): InventoryState {
  const containers: Record<string, Container> = {};

  for (const spec of CONTAINER_SPECS) {
    containers[spec.containerId] = {
      containerId: spec.containerId,
      containerType: spec.containerType,
      capacity: spec.capacity,
      slots: new Array<ItemStack | null>(spec.capacity).fill(null),
      ...(spec.acceptTags !== undefined ? { acceptTags: spec.acceptTags } : {}),
      ...(spec.insertLocked ? { insertLocked: true } : {}),
      namespace: spec.namespace,
    };
  }

  return {
    containers,
    held: null,
    hotbarSelection: null,
    nextStackSeq: 1,
  };
}

/* ------------------------------------------------------------------ *
 * Shared helpers
 * ------------------------------------------------------------------ */

function cloneState(state: InventoryState): InventoryState {
  return structuredClone(state);
}

function getContainer(
  state: InventoryState,
  containerId: string,
): Container | undefined {
  return state.containers[containerId];
}

/** Whether a container may accept a stack of this definition at all. */
export function containerAccepts(
  container: Container,
  definitionId: string,
): boolean {
  const definition = getItemDefinition(definitionId);
  const bound = definition.boundNamespace ?? 'general';

  if (bound !== container.namespace) {
    return false;
  }

  if (container.acceptTags !== undefined) {
    return container.acceptTags.some((tag) => definition.tags.includes(tag));
  }

  return true;
}

function newStack(
  draft: InventoryState,
  definitionId: string,
  quantity: number,
  metadata?: Record<string, string>,
): ItemStack {
  const stack: ItemStack = {
    stackId: `stk_${draft.nextStackSeq}`,
    definitionId,
    quantity,
    ...(metadata !== undefined ? { metadata } : {}),
  };

  draft.nextStackSeq += 1;

  return stack;
}

/** Item totals by definition id, including a held stack. */
export function computeItemTotals(
  state: InventoryState,
): Record<string, number> {
  const totals: Record<string, number> = {};
  const add = (stack: ItemStack | null) => {
    if (stack !== null) {
      totals[stack.definitionId] =
        (totals[stack.definitionId] ?? 0) + stack.quantity;
    }
  };

  for (const container of Object.values(state.containers)) {
    for (const slot of container.slots) {
      add(slot);
    }
  }

  add(state.held?.stack ?? null);

  return totals;
}

/**
 * Full structural invariant check. Returns null when sound, otherwise a
 * description of the first violation found.
 */
export function validateInvariants(state: InventoryState): string | null {
  const seenStackIds = new Set<string>();
  const checkStack = (stack: ItemStack, where: string): string | null => {
    if (!isKnownItemDefinition(stack.definitionId)) {
      return `unknown definition ${stack.definitionId} at ${where}`;
    }

    const definition = getItemDefinition(stack.definitionId);

    if (!Number.isInteger(stack.quantity) || stack.quantity < 1) {
      return `non-positive quantity ${stack.quantity} at ${where}`;
    }

    if (stack.quantity > definition.maxStack) {
      return `stack above maximum (${stack.quantity}/${definition.maxStack}) at ${where}`;
    }

    if (seenStackIds.has(stack.stackId)) {
      return `duplicate stack id ${stack.stackId} at ${where}`;
    }

    seenStackIds.add(stack.stackId);

    return null;
  };

  for (const container of Object.values(state.containers)) {
    if (container.slots.length !== container.capacity) {
      return `container ${container.containerId} slot count ${container.slots.length} != capacity ${container.capacity}`;
    }

    for (let index = 0; index < container.slots.length; index++) {
      const stack = container.slots[index];

      if (stack === null) {
        continue;
      }

      const where = `${container.containerId}[${index}]`;
      const stackError = checkStack(stack, where);

      if (stackError !== null) {
        return stackError;
      }

      if (!containerAccepts(container, stack.definitionId)) {
        return `container ${container.containerId} does not accept ${stack.definitionId}`;
      }
    }
  }

  if (state.held !== null) {
    const heldError = checkStack(state.held.stack, 'held');

    if (heldError !== null) {
      return heldError;
    }

    if (getContainer(state, state.held.source.containerId) === undefined) {
      return `held stack source container ${state.held.source.containerId} missing`;
    }
  }

  if (state.hotbarSelection !== null) {
    const hotbar = state.containers[CONTAINER_IDS.playerHotbar];

    if (
      state.hotbarSelection < 0 ||
      state.hotbarSelection >= hotbar.capacity ||
      hotbar.slots[state.hotbarSelection] === null
    ) {
      return `hotbar selection ${state.hotbarSelection} points at an empty slot`;
    }
  }

  return null;
}

/**
 * Legacy-selection normalisation (gameplay belt semantics): the selection
 * is null exactly while the hotbar is empty; otherwise it always points
 * at an occupied slot (first occupied when the previous choice emptied).
 */
function normalizeHotbarSelection(draft: InventoryState) {
  const hotbar = draft.containers[CONTAINER_IDS.playerHotbar];
  const firstOccupied = hotbar.slots.findIndex((slot) => slot !== null);

  if (firstOccupied === -1) {
    draft.hotbarSelection = null;
    return;
  }

  if (
    draft.hotbarSelection === null ||
    hotbar.slots[draft.hotbarSelection] === null
  ) {
    draft.hotbarSelection = firstOccupied;
  }
}

/**
 * Transaction wrapper: clone → mutate → verify invariants + conservation
 * → commit or roll back. `expectedDelta` declares the only permitted
 * item-total changes (defaults to strict conservation).
 */
function transact(
  state: InventoryState,
  mutate: (draft: InventoryState) => OpResult,
  expectedDelta: Record<string, number> = {},
): OpOutcome {
  const before = computeItemTotals(state);
  const draft = cloneState(state);
  const result = mutate(draft);

  if (!result.ok) {
    return { state, result };
  }

  normalizeHotbarSelection(draft);

  const invariantError = validateInvariants(draft);

  if (invariantError !== null) {
    return {
      state,
      result: { ok: false, reason: 'invariant_violation' },
    };
  }

  const after = computeItemTotals(draft);
  const definitionIds = new Set([
    ...Object.keys(before),
    ...Object.keys(after),
    ...Object.keys(expectedDelta),
  ]);

  for (const definitionId of definitionIds) {
    const delta = (after[definitionId] ?? 0) - (before[definitionId] ?? 0);

    if (delta !== (expectedDelta[definitionId] ?? 0)) {
      return {
        state,
        result: { ok: false, reason: 'invariant_violation' },
      };
    }
  }

  return { state: draft, result };
}

function requireSlot(
  draft: InventoryState,
  containerId: string,
  slotIndex: number,
): { container: Container } | { failure: OpFailureReason } {
  const container = getContainer(draft, containerId);

  if (container === undefined) {
    return { failure: 'unknown_container' };
  }

  if (
    !Number.isInteger(slotIndex) ||
    slotIndex < 0 ||
    slotIndex >= container.capacity
  ) {
    return { failure: 'unknown_slot' };
  }

  return { container };
}

/* ------------------------------------------------------------------ *
 * Pick up / place / cancel (the shared held-stack command set)
 * ------------------------------------------------------------------ */

export type PickUpMode = 'all' | 'one' | 'half';

/** Lifts (all/one/half of) a stack into the hand. */
export function pickUp(
  state: InventoryState,
  args: { containerId: string; slotIndex: number; mode: PickUpMode },
): OpOutcome {
  return transact(state, (draft) => {
    if (draft.held !== null) {
      return { ok: false, reason: 'holding' };
    }

    const located = requireSlot(draft, args.containerId, args.slotIndex);

    if ('failure' in located) {
      return { ok: false, reason: located.failure };
    }

    const stack = located.container.slots[args.slotIndex];

    if (stack === null) {
      return { ok: false, reason: 'empty_slot' };
    }

    const takeQuantity =
      args.mode === 'all'
        ? stack.quantity
        : args.mode === 'one'
          ? 1
          : Math.ceil(stack.quantity / 2);

    if (takeQuantity >= stack.quantity) {
      located.container.slots[args.slotIndex] = null;
      draft.held = {
        stack,
        source: { containerId: args.containerId, slotIndex: args.slotIndex },
      };
    } else {
      stack.quantity -= takeQuantity;
      draft.held = {
        stack: newStack(
          draft,
          stack.definitionId,
          takeQuantity,
          stack.metadata,
        ),
        source: { containerId: args.containerId, slotIndex: args.slotIndex },
      };
    }

    return {
      ok: true,
      detail: {
        definition_id: draft.held.stack.definitionId,
        quantity: draft.held.stack.quantity,
      },
    };
  });
}

/**
 * Places the held stack onto a slot: move (empty slot), merge (same
 * definition, up to maximum — excess stays in the held stack), or swap
 * (different stack, only while the source slot is still free so the
 * displaced stack has a guaranteed home).
 */
export function place(
  state: InventoryState,
  args: { containerId: string; slotIndex: number },
): OpOutcome {
  return transact(state, (draft) => {
    const held = draft.held;

    if (held === null) {
      return { ok: false, reason: 'not_holding' };
    }

    const located = requireSlot(draft, args.containerId, args.slotIndex);

    if ('failure' in located) {
      return { ok: false, reason: located.failure };
    }

    const container = located.container;

    if (container.insertLocked) {
      return { ok: false, reason: 'not_accepted' };
    }

    if (!containerAccepts(container, held.stack.definitionId)) {
      return { ok: false, reason: 'not_accepted' };
    }

    const target = container.slots[args.slotIndex];

    // Empty slot → move.
    if (target === null) {
      container.slots[args.slotIndex] = held.stack;
      draft.held = null;

      return { ok: true, detail: { placed: 'moved' } };
    }

    // Same definition → merge up to the maximum; excess stays held.
    if (target.definitionId === held.stack.definitionId) {
      const maxStack = getItemDefinition(target.definitionId).maxStack;
      const space = maxStack - target.quantity;

      if (space <= 0) {
        return swapWithSource(draft, held, container, args.slotIndex);
      }

      const moved = Math.min(space, held.stack.quantity);

      target.quantity += moved;
      held.stack.quantity -= moved;

      if (held.stack.quantity === 0) {
        draft.held = null;
      }

      return {
        ok: true,
        detail: { placed: 'merged', moved, remainder: held.stack.quantity },
      };
    }

    return swapWithSource(draft, held, container, args.slotIndex);
  });
}

/** Swap branch of place(): displaced stack goes to the held source slot. */
function swapWithSource(
  draft: InventoryState,
  held: HeldStack,
  targetContainer: Container,
  targetSlot: number,
): OpResult {
  const source = getContainer(draft, held.source.containerId);
  const displaced = targetContainer.slots[targetSlot];

  if (
    source === undefined ||
    displaced === null ||
    source.slots[held.source.slotIndex] !== null ||
    !containerAccepts(source, displaced.definitionId) ||
    source.insertLocked
  ) {
    return { ok: false, reason: 'occupied' };
  }

  source.slots[held.source.slotIndex] = displaced;
  targetContainer.slots[targetSlot] = held.stack;
  draft.held = null;

  return { ok: true, detail: { placed: 'swapped' } };
}

/**
 * Returns the held stack to safety: its source slot when free, a merge
 * back onto its own remainder, or the first free compatible slot. Used
 * by drag cancellation, invalid drops, ESC, close-with-held and scene
 * changes — a held item can never be lost.
 */
export function cancelHeld(state: InventoryState): OpOutcome {
  return transact(state, (draft) => {
    const held = draft.held;

    if (held === null) {
      return { ok: false, reason: 'not_holding' };
    }

    const source = getContainer(draft, held.source.containerId);

    if (source !== undefined) {
      const sourceSlot = source.slots[held.source.slotIndex];

      if (sourceSlot === null) {
        source.slots[held.source.slotIndex] = held.stack;
        draft.held = null;

        return { ok: true, detail: { restored: 'source' } };
      }

      if (sourceSlot.definitionId === held.stack.definitionId) {
        // Remainder + held never exceeds the original single stack, so
        // this merge is always within the maximum.
        sourceSlot.quantity += held.stack.quantity;
        draft.held = null;

        return { ok: true, detail: { restored: 'merged' } };
      }
    }

    // Defensive fallback: first free compatible slot anywhere.
    for (const container of Object.values(draft.containers)) {
      if (
        container.insertLocked ||
        !containerAccepts(container, held.stack.definitionId)
      ) {
        continue;
      }

      const free = container.slots.findIndex((slot) => slot === null);

      if (free !== -1) {
        container.slots[free] = held.stack;
        draft.held = null;

        return { ok: true, detail: { restored: 'fallback' } };
      }
    }

    return { ok: false, reason: 'target_full' };
  });
}

/* ------------------------------------------------------------------ *
 * Quick transfer, sort, consolidate
 * ------------------------------------------------------------------ */

/**
 * Moves as much of a stack as fits into the target containers (merge
 * pass first, then free slots, in the given priority order). Fails with
 * no change when nothing fits.
 */
export function quickTransfer(
  state: InventoryState,
  args: {
    containerId: string;
    slotIndex: number;
    targetContainerIds: readonly string[];
  },
): OpOutcome {
  return transact(state, (draft) => {
    if (draft.held !== null) {
      return { ok: false, reason: 'holding' };
    }

    const located = requireSlot(draft, args.containerId, args.slotIndex);

    if ('failure' in located) {
      return { ok: false, reason: located.failure };
    }

    const stack = located.container.slots[args.slotIndex];

    if (stack === null) {
      return { ok: false, reason: 'empty_slot' };
    }

    const definition = getItemDefinition(stack.definitionId);
    let remaining = stack.quantity;

    // Merge pass across every target, in priority order.
    for (const targetId of args.targetContainerIds) {
      const target = getContainer(draft, targetId);

      if (
        target === undefined ||
        target === located.container ||
        target.insertLocked ||
        !containerAccepts(target, stack.definitionId)
      ) {
        continue;
      }

      for (const slot of target.slots) {
        if (
          remaining > 0 &&
          slot !== null &&
          slot.definitionId === stack.definitionId &&
          slot.quantity < definition.maxStack
        ) {
          const moved = Math.min(
            definition.maxStack - slot.quantity,
            remaining,
          );

          slot.quantity += moved;
          remaining -= moved;
        }
      }
    }

    // Free-slot pass: the remaining stack moves as one unit.
    if (remaining > 0) {
      for (const targetId of args.targetContainerIds) {
        const target = getContainer(draft, targetId);

        if (
          target === undefined ||
          target === located.container ||
          target.insertLocked ||
          !containerAccepts(target, stack.definitionId)
        ) {
          continue;
        }

        const free = target.slots.findIndex((slot) => slot === null);

        if (free !== -1) {
          target.slots[free] = { ...stack, quantity: remaining };
          remaining = 0;
          break;
        }
      }
    }

    if (remaining === stack.quantity) {
      return { ok: false, reason: 'target_full' };
    }

    if (remaining === 0) {
      located.container.slots[args.slotIndex] = null;
    } else {
      // Partial transfer merged some quantity away; the source keeps the
      // remainder under its original stack id (identity preserved).
      stack.quantity = remaining;
    }

    return {
      ok: true,
      detail: { moved: stack.quantity - remaining, remainder: remaining },
    };
  });
}

/** Deterministic category order for the manual sort. */
const CATEGORY_ORDER: readonly string[] = [
  'tool',
  'component',
  'sample',
  'consumable',
  'document',
  'container',
  'record',
  'residue',
];

/**
 * Deterministic manual sort of one ordinary container: category order,
 * then display name, then definition id, then stack id. Stacks are
 * re-ordered, never merged or re-created (identity preserved). Refused
 * for measurement workstations and workbench containers.
 */
export function sortContainer(
  state: InventoryState,
  args: { containerId: string },
): OpOutcome {
  return transact(state, (draft) => {
    if (draft.held !== null) {
      return { ok: false, reason: 'holding' };
    }

    const container = getContainer(draft, args.containerId);

    if (container === undefined) {
      return { ok: false, reason: 'unknown_container' };
    }

    if (
      container.namespace !== 'general' ||
      container.containerType === 'workbench_input' ||
      container.containerType === 'workbench_output'
    ) {
      return { ok: false, reason: 'sort_unavailable' };
    }

    const stacks = container.slots.filter(
      (slot): slot is ItemStack => slot !== null,
    );

    stacks.sort((a, b) => {
      const defA = getItemDefinition(a.definitionId);
      const defB = getItemDefinition(b.definitionId);
      const categoryDelta =
        CATEGORY_ORDER.indexOf(defA.category) -
        CATEGORY_ORDER.indexOf(defB.category);

      if (categoryDelta !== 0) {
        return categoryDelta;
      }

      if (defA.displayName !== defB.displayName) {
        return defA.displayName < defB.displayName ? -1 : 1;
      }

      if (a.definitionId !== b.definitionId) {
        return a.definitionId < b.definitionId ? -1 : 1;
      }

      return a.stackId < b.stackId ? -1 : a.stackId > b.stackId ? 1 : 0;
    });

    container.slots = [
      ...stacks,
      ...new Array<ItemStack | null>(container.capacity - stacks.length).fill(
        null,
      ),
    ];

    return { ok: true, detail: { sorted: stacks.length } };
  });
}

/**
 * Consolidates every partial stack of one definition inside a container
 * (double-click convenience): later partial stacks merge into earlier
 * ones up to the maximum.
 */
export function consolidateStacks(
  state: InventoryState,
  args: { containerId: string; definitionId: string },
): OpOutcome {
  return transact(state, (draft) => {
    if (draft.held !== null) {
      return { ok: false, reason: 'holding' };
    }

    const container = getContainer(draft, args.containerId);

    if (container === undefined) {
      return { ok: false, reason: 'unknown_container' };
    }

    if (!isKnownItemDefinition(args.definitionId)) {
      return { ok: false, reason: 'unknown_definition' };
    }

    const maxStack = getItemDefinition(args.definitionId).maxStack;
    let merged = 0;

    for (let target = 0; target < container.slots.length; target++) {
      const targetStack = container.slots[target];

      if (
        targetStack === null ||
        targetStack.definitionId !== args.definitionId ||
        targetStack.quantity >= maxStack
      ) {
        continue;
      }

      for (let src = target + 1; src < container.slots.length; src++) {
        const sourceStack = container.slots[src];

        if (
          sourceStack === null ||
          sourceStack.definitionId !== args.definitionId
        ) {
          continue;
        }

        const moved = Math.min(
          maxStack - targetStack.quantity,
          sourceStack.quantity,
        );

        targetStack.quantity += moved;
        sourceStack.quantity -= moved;
        merged += moved;

        if (sourceStack.quantity === 0) {
          container.slots[src] = null;
        }

        if (targetStack.quantity >= maxStack) {
          break;
        }
      }
    }

    return { ok: true, detail: { merged } };
  });
}

/* ------------------------------------------------------------------ *
 * Recipes (atomic combine)
 * ------------------------------------------------------------------ */

/**
 * Commits a recipe from the workbench input slots. The inputs must match
 * the recipe EXACTLY (an incomplete or incorrect loadout consumes
 * nothing) and the output slot must have room BEFORE any ingredient is
 * consumed. Completion is atomic.
 */
export function commitRecipe(
  state: InventoryState,
  args: { recipeId: string },
): OpOutcome {
  const recipe = getRecipe(args.recipeId);

  if (recipe === undefined) {
    return { state, result: { ok: false, reason: 'recipe_unknown' } };
  }

  const expectedDelta: Record<string, number> = {};

  for (const [definitionId, quantity] of Object.entries(recipe.inputs)) {
    expectedDelta[definitionId] = -quantity;
  }

  expectedDelta[recipe.output.definitionId] =
    (expectedDelta[recipe.output.definitionId] ?? 0) + recipe.output.quantity;

  return transact(
    state,
    (draft) => {
      if (draft.held !== null) {
        return { ok: false, reason: 'holding' };
      }

      const input = draft.containers[CONTAINER_IDS.workbenchInput];
      const output = draft.containers[CONTAINER_IDS.workbenchOutput];

      // Exact-match check: combined input contents equal the recipe.
      const loaded: Record<string, number> = {};

      for (const slot of input.slots) {
        if (slot !== null) {
          loaded[slot.definitionId] =
            (loaded[slot.definitionId] ?? 0) + slot.quantity;
        }
      }

      const requiredIds = Object.keys(recipe.inputs);
      const loadedIds = Object.keys(loaded);
      const exact =
        loadedIds.length === requiredIds.length &&
        requiredIds.every(
          (definitionId) =>
            loaded[definitionId] === recipe.inputs[definitionId],
        );

      if (!exact) {
        return { ok: false, reason: 'recipe_incomplete' };
      }

      // Output capacity check BEFORE consuming anything.
      const outputSlot = output.slots[0];
      const outputDef = getItemDefinition(recipe.output.definitionId);

      if (outputSlot !== null) {
        const sameDefinition =
          outputSlot.definitionId === recipe.output.definitionId;
        const fits =
          sameDefinition &&
          outputSlot.quantity + recipe.output.quantity <= outputDef.maxStack;

        if (!fits) {
          return { ok: false, reason: 'recipe_output_blocked' };
        }
      }

      // Atomic commit: consume all inputs, then write the output.
      input.slots = new Array<ItemStack | null>(input.capacity).fill(null);

      if (outputSlot !== null) {
        outputSlot.quantity += recipe.output.quantity;
      } else {
        output.slots[0] = newStack(
          draft,
          recipe.output.definitionId,
          recipe.output.quantity,
        );
      }

      return { ok: true, detail: { recipe_id: recipe.recipeId } };
    },
    expectedDelta,
  );
}

/* ------------------------------------------------------------------ *
 * Adding, removing, discarding (world boundary)
 * ------------------------------------------------------------------ */

/** How much of a definition the given containers could still absorb. */
export function computeAddCapacity(
  state: InventoryState,
  definitionId: string,
  targetContainerIds: readonly string[],
): number {
  const definition = getItemDefinition(definitionId);
  let capacity = 0;

  for (const targetId of targetContainerIds) {
    const target = getContainer(state, targetId);

    if (
      target === undefined ||
      target.insertLocked ||
      !containerAccepts(target, definitionId)
    ) {
      continue;
    }

    for (const slot of target.slots) {
      if (slot === null) {
        capacity += definition.maxStack;
      } else if (
        slot.definitionId === definitionId &&
        slot.quantity < definition.maxStack
      ) {
        capacity += definition.maxStack - slot.quantity;
      }
    }
  }

  return capacity;
}

/**
 * Adds items into the given containers (merge pass first, then new
 * stacks in free slots). With `allOrNothing`, either the full quantity
 * fits or nothing changes; without it, whatever fits is placed and the
 * remainder is reported back — a refused pickup never loses items.
 */
export function addItem(
  state: InventoryState,
  args: {
    definitionId: string;
    quantity: number;
    targetContainerIds: readonly string[];
    allOrNothing: boolean;
  },
): OpOutcome {
  if (!isKnownItemDefinition(args.definitionId)) {
    return { state, result: { ok: false, reason: 'unknown_definition' } };
  }

  if (!Number.isInteger(args.quantity) || args.quantity < 1) {
    return { state, result: { ok: false, reason: 'invalid_quantity' } };
  }

  const capacity = computeAddCapacity(
    state,
    args.definitionId,
    args.targetContainerIds,
  );
  const placed = Math.min(capacity, args.quantity);

  if (placed === 0 || (args.allOrNothing && placed < args.quantity)) {
    return { state, result: { ok: false, reason: 'target_full' } };
  }

  return transact(
    state,
    (draft) => {
      const definition = getItemDefinition(args.definitionId);
      let remaining = placed;

      for (const targetId of args.targetContainerIds) {
        const target = getContainer(draft, targetId);

        if (
          target === undefined ||
          target.insertLocked ||
          !containerAccepts(target, args.definitionId)
        ) {
          continue;
        }

        for (const slot of target.slots) {
          if (
            remaining > 0 &&
            slot !== null &&
            slot.definitionId === args.definitionId &&
            slot.quantity < definition.maxStack
          ) {
            const moved = Math.min(
              definition.maxStack - slot.quantity,
              remaining,
            );

            slot.quantity += moved;
            remaining -= moved;
          }
        }
      }

      for (const targetId of args.targetContainerIds) {
        const target = getContainer(draft, targetId);

        if (
          target === undefined ||
          target.insertLocked ||
          !containerAccepts(target, args.definitionId)
        ) {
          continue;
        }

        for (
          let index = 0;
          index < target.slots.length && remaining > 0;
          index++
        ) {
          if (target.slots[index] === null) {
            const quantity = Math.min(definition.maxStack, remaining);

            target.slots[index] = newStack(draft, args.definitionId, quantity);
            remaining -= quantity;
          }
        }
      }

      if (remaining > 0) {
        // Capacity was computed from this same state; disagreement means
        // a logic fault — refuse rather than commit a partial surprise.
        return { ok: false, reason: 'invariant_violation' };
      }

      return {
        ok: true,
        detail: { placed, remainder: args.quantity - placed },
      };
    },
    { [args.definitionId]: placed },
  );
}

/**
 * Removes a whole stack from the inventory and returns it to the caller
 * (world drop hand-off). The caller owns re-materialising it as a
 * recoverable world bundle; the definition must be droppable.
 */
export function takeStackOut(
  state: InventoryState,
  args: { containerId: string; slotIndex: number },
): OpOutcome & { stack: ItemStack | null } {
  const located = requireSlot(state, args.containerId, args.slotIndex);

  if ('failure' in located) {
    return {
      state,
      result: { ok: false, reason: located.failure },
      stack: null,
    };
  }

  const stack = located.container.slots[args.slotIndex];

  if (stack === null) {
    return { state, result: { ok: false, reason: 'empty_slot' }, stack: null };
  }

  if (!getItemDefinition(stack.definitionId).droppable) {
    return {
      state,
      result: { ok: false, reason: 'not_droppable' },
      stack: null,
    };
  }

  const outcome = transact(
    state,
    (draft) => {
      if (draft.held !== null) {
        return { ok: false, reason: 'holding' };
      }

      draft.containers[args.containerId].slots[args.slotIndex] = null;

      return {
        ok: true,
        detail: { definition_id: stack.definitionId, quantity: stack.quantity },
      };
    },
    { [stack.definitionId]: -stack.quantity },
  );

  return {
    ...outcome,
    stack: outcome.result.ok ? structuredClone(stack) : null,
  };
}

/**
 * Destroys a stack after an explicit confirmation (the UI owns the
 * confirmation prompt — the engine never destroys implicitly).
 */
export function discardStack(
  state: InventoryState,
  args: { containerId: string; slotIndex: number },
): OpOutcome {
  const located = requireSlot(state, args.containerId, args.slotIndex);

  if ('failure' in located) {
    return { state, result: { ok: false, reason: located.failure } };
  }

  const stack = located.container.slots[args.slotIndex];

  if (stack === null) {
    return { state, result: { ok: false, reason: 'empty_slot' } };
  }

  if (!getItemDefinition(stack.definitionId).discardable) {
    return { state, result: { ok: false, reason: 'not_discardable' } };
  }

  return transact(
    state,
    (draft) => {
      if (draft.held !== null) {
        return { ok: false, reason: 'holding' };
      }

      draft.containers[args.containerId].slots[args.slotIndex] = null;

      return {
        ok: true,
        detail: { definition_id: stack.definitionId, quantity: stack.quantity },
      };
    },
    { [stack.definitionId]: -stack.quantity },
  );
}

/* ------------------------------------------------------------------ *
 * Hotbar selection (legacy belt semantics)
 * ------------------------------------------------------------------ */

export function selectHotbarSlot(
  state: InventoryState,
  slotIndex: number,
): OpOutcome {
  return transact(state, (draft) => {
    const hotbar = draft.containers[CONTAINER_IDS.playerHotbar];

    if (slotIndex < 0 || slotIndex >= hotbar.capacity) {
      return { ok: false, reason: 'unknown_slot' };
    }

    if (hotbar.slots[slotIndex] === null) {
      return { ok: false, reason: 'empty_slot' };
    }

    draft.hotbarSelection = slotIndex;

    return { ok: true };
  });
}

export function cycleHotbarSelection(state: InventoryState): OpOutcome {
  return transact(state, (draft) => {
    const hotbar = draft.containers[CONTAINER_IDS.playerHotbar];
    const heldIndices = hotbar.slots
      .map((slot, index) => (slot !== null ? index : -1))
      .filter((index) => index !== -1);

    if (heldIndices.length === 0) {
      return { ok: false, reason: 'empty_slot' };
    }

    const currentPosition =
      draft.hotbarSelection === null
        ? -1
        : heldIndices.indexOf(draft.hotbarSelection);

    draft.hotbarSelection =
      heldIndices[(currentPosition + 1) % heldIndices.length];

    return { ok: true };
  });
}

/* ------------------------------------------------------------------ *
 * Serialisation and migration
 * ------------------------------------------------------------------ */

function serializeStack(stack: ItemStack): SerializedStack {
  return {
    stack_id: stack.stackId,
    definition_id: stack.definitionId,
    quantity: stack.quantity,
    ...(stack.metadata !== undefined
      ? { metadata: { ...stack.metadata } }
      : {}),
  };
}

export function toSnapshot(state: InventoryState): InventorySnapshotV1 {
  return {
    schema_version: INVENTORY_SCHEMA_VERSION,
    containers: Object.values(state.containers).map((container) => ({
      container_id: container.containerId,
      container_type: container.containerType,
      capacity: container.capacity,
      slots: container.slots.map((slot) =>
        slot === null ? null : serializeStack(slot),
      ),
    })),
    hotbar_selection: state.hotbarSelection,
    held:
      state.held === null
        ? null
        : {
            ...serializeStack(state.held.stack),
            source_container_id: state.held.source.containerId,
            source_slot: state.held.source.slotIndex,
          },
    next_stack_seq: state.nextStackSeq,
  };
}

function isLegacySnapshot(
  value: unknown,
): value is LegacyGameInventorySnapshot {
  return (
    typeof value === 'object' &&
    value !== null &&
    Array.isArray((value as LegacyGameInventorySnapshot).slots) &&
    !('schema_version' in value)
  );
}

function isV1Snapshot(value: unknown): value is InventorySnapshotV1 {
  return (
    typeof value === 'object' &&
    value !== null &&
    (value as InventorySnapshotV1).schema_version ===
      INVENTORY_SCHEMA_VERSION &&
    Array.isArray((value as InventorySnapshotV1).containers)
  );
}

/**
 * Loads a snapshot into a fresh state. Accepts inventory-v1 or the
 * bounded legacy shape (pre-foundation ten-slot belt), which migrates
 * into the hotbar container. A malformed snapshot loads nothing: the
 * outcome carries a pristine initial state and a bad_snapshot failure,
 * and the caller keeps its prior state.
 */
export function loadSnapshot(snapshot: unknown): OpOutcome {
  const fresh = createInitialInventoryState();

  if (isLegacySnapshot(snapshot)) {
    const draft = cloneState(fresh);
    const hotbar = draft.containers[CONTAINER_IDS.playerHotbar];

    for (
      let index = 0;
      index < Math.min(snapshot.slots.length, hotbar.capacity);
      index++
    ) {
      const itemId = snapshot.slots[index];

      if (itemId === null) {
        continue;
      }

      if (!isKnownItemDefinition(itemId)) {
        return { state: fresh, result: { ok: false, reason: 'bad_snapshot' } };
      }

      hotbar.slots[index] = newStack(draft, itemId, 1);
    }

    draft.hotbarSelection =
      typeof snapshot.selected_index === 'number' &&
      snapshot.selected_index >= 0 &&
      snapshot.selected_index < hotbar.capacity &&
      hotbar.slots[snapshot.selected_index] !== null
        ? snapshot.selected_index
        : null;

    return sealLoadedState(fresh, draft, 'legacy_belt');
  }

  if (!isV1Snapshot(snapshot)) {
    return { state: fresh, result: { ok: false, reason: 'bad_snapshot' } };
  }

  const draft = cloneState(fresh);

  for (const serialized of snapshot.containers) {
    const container = draft.containers[serialized.container_id];

    if (container === undefined) {
      // Bounded forward-compatibility: unknown containers are dropped.
      continue;
    }

    for (
      let index = 0;
      index < Math.min(serialized.slots.length, container.capacity);
      index++
    ) {
      const slot = serialized.slots[index];

      if (slot === null) {
        continue;
      }

      container.slots[index] = {
        stackId: slot.stack_id,
        definitionId: slot.definition_id,
        quantity: slot.quantity,
        ...(slot.metadata !== undefined
          ? { metadata: { ...slot.metadata } }
          : {}),
      };
    }
  }

  // A held stack in a snapshot restores into its recorded source slot
  // (the safe-restore guarantee holds across serialisation too). A
  // snapshot whose held stack has nowhere safe to go is malformed.
  if (snapshot.held !== null) {
    const source = draft.containers[snapshot.held.source_container_id];

    if (
      source === undefined ||
      source.slots[snapshot.held.source_slot] !== null
    ) {
      return { state: fresh, result: { ok: false, reason: 'bad_snapshot' } };
    }

    source.slots[snapshot.held.source_slot] = {
      stackId: snapshot.held.stack_id,
      definitionId: snapshot.held.definition_id,
      quantity: snapshot.held.quantity,
    };
  }

  draft.hotbarSelection = Number.isInteger(snapshot.hotbar_selection)
    ? snapshot.hotbar_selection
    : null;
  draft.nextStackSeq = Math.max(1, snapshot.next_stack_seq);

  return sealLoadedState(fresh, draft, INVENTORY_SCHEMA_VERSION);
}

/** Final invariant gate for snapshot loads (no conservation baseline). */
function sealLoadedState(
  fallback: InventoryState,
  draft: InventoryState,
  migratedFrom: string,
): OpOutcome {
  normalizeHotbarSelection(draft);

  const invariantError = validateInvariants(draft);

  if (invariantError !== null) {
    return { state: fallback, result: { ok: false, reason: 'bad_snapshot' } };
  }

  return {
    state: draft,
    result: { ok: true, detail: { migrated_from: migratedFrom } },
  };
}
