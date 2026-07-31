/**
 * Gameplay inventory state (overnight playable prototype, Unit 1).
 *
 * A real, visible inventory: fixed slot count, item identity, select /
 * use / remove, serialisable, session-lifetime (module scope — survives
 * scene.start() restarts exactly like roomTaskState; a page reload starts
 * a fresh session and therefore a fresh inventory).
 *
 * This is the gameplay carry layer only. It never reads or writes the
 * Q01-Q04 kit-preparation substrate (src/data/itemRegistry.ts) and never
 * feeds a measurement variable — raw prototype telemetry about pickups is
 * logged by the scenes that host them, not here.
 */

import { getGameItem } from './items';

export const INVENTORY_CAPACITY = 10;

export interface GameInventorySnapshot {
  slots: (string | null)[];
  selected_index: number | null;
}

type InventoryListener = () => void;

interface GameInventoryInternal {
  slots: (string | null)[];
  selectedIndex: number | null;
}

function createInitialInventory(): GameInventoryInternal {
  return {
    slots: new Array<string | null>(INVENTORY_CAPACITY).fill(null),
    selectedIndex: null,
  };
}

let inventory = createInitialInventory();
const listeners = new Set<InventoryListener>();

function notify() {
  for (const listener of listeners) {
    listener();
  }
}

/** Subscribe to inventory changes; returns an unsubscribe function. */
export function onInventoryChange(listener: InventoryListener): () => void {
  listeners.add(listener);

  return () => listeners.delete(listener);
}

/**
 * Adds one item to the first free slot. Returns false (no change) when the
 * inventory is full — callers surface the full-inventory feedback.
 */
export function addInventoryItem(itemId: string): boolean {
  getGameItem(itemId); // validate id

  const freeIndex = inventory.slots.indexOf(null);

  if (freeIndex === -1) {
    return false;
  }

  inventory.slots[freeIndex] = itemId;

  if (inventory.selectedIndex === null) {
    inventory.selectedIndex = freeIndex;
  }

  notify();

  return true;
}

/**
 * Removes the first slot holding the item (use/install/deliver). Returns
 * false when the item is not carried.
 */
export function removeInventoryItem(itemId: string): boolean {
  const index = inventory.slots.indexOf(itemId);

  if (index === -1) {
    return false;
  }

  inventory.slots[index] = null;

  if (inventory.selectedIndex === index) {
    const nextHeld = inventory.slots.findIndex((slot) => slot !== null);

    inventory.selectedIndex = nextHeld === -1 ? null : nextHeld;
  }

  notify();

  return true;
}

export function hasInventoryItem(itemId: string): boolean {
  return inventory.slots.includes(itemId);
}

/** Item ids currently carried, in slot order (nulls skipped). */
export function getInventoryItems(): string[] {
  return inventory.slots.filter((slot): slot is string => slot !== null);
}

export function getInventorySlots(): (string | null)[] {
  return [...inventory.slots];
}

export function isInventoryFull(): boolean {
  return !inventory.slots.includes(null);
}

/** Selects a slot by index (pointer path). No-op on empty slots. */
export function selectInventorySlot(index: number) {
  if (
    index >= 0 &&
    index < inventory.slots.length &&
    inventory.slots[index] !== null &&
    inventory.selectedIndex !== index
  ) {
    inventory.selectedIndex = index;
    notify();
  }
}

/** Cycles selection to the next held slot (keyboard path, TAB). */
export function selectNextInventoryItem() {
  const heldIndices = inventory.slots
    .map((slot, index) => (slot !== null ? index : -1))
    .filter((index) => index !== -1);

  if (heldIndices.length === 0) {
    return;
  }

  const currentPos =
    inventory.selectedIndex === null
      ? -1
      : heldIndices.indexOf(inventory.selectedIndex);

  inventory.selectedIndex = heldIndices[(currentPos + 1) % heldIndices.length];
  notify();
}

export function getSelectedInventoryItem(): string | null {
  return inventory.selectedIndex === null
    ? null
    : inventory.slots[inventory.selectedIndex];
}

export function getSelectedInventoryIndex(): number | null {
  return inventory.selectedIndex;
}

/** Serialisable snapshot (DEV probe / tests). */
export function serializeInventory(): GameInventorySnapshot {
  return {
    slots: [...inventory.slots],
    selected_index: inventory.selectedIndex,
  };
}

/**
 * Test-only escape hatch (resetAllRoomTaskStates precedent): recreates the
 * inventory from scratch. Not used by gameplay code.
 */
export function resetGameplayInventory() {
  inventory = createInitialInventory();
  notify();
}
