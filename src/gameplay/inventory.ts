/**
 * Gameplay inventory COMPATIBILITY ADAPTER (interactive inventory
 * foundation).
 *
 * Before this unit, this module owned its own ten-slot module-scope
 * state — one of two parallel inventory stores. It is now a thin,
 * documented adapter over the single authoritative inventory domain
 * (src/inventory/store.ts): the legacy belt IS the domain's ten-slot
 * player hotbar container. Every legacy entry point keeps its exact
 * name, signature and observable semantics (single items, first-free
 * slot, selection rules, serialised probe shape), so RoomScene, the
 * bottom belt HUD, route logic and existing specs are unchanged.
 *
 * The OBSOLETE PATH is the old private `inventory` object that lived
 * here; it no longer exists. New code should use src/inventory/store.ts
 * directly — this adapter exists only for the pre-foundation call sites.
 *
 * This is the gameplay carry layer only. It never reads or writes the
 * Q01-Q04 kit-preparation substrate (src/data/itemRegistry.ts) and never
 * feeds a measurement variable.
 */

import { CONTAINER_IDS, HOTBAR_CAPACITY } from '../inventory/model';
import {
  getInventoryState,
  invAddItem,
  invCycleHotbarSelection,
  invSelectHotbarSlot,
  invTakeStackOutForLegacyRemove,
  onInventoryStoreChange,
  resetInventoryStore,
} from '../inventory/store';
import { getGameItem } from './items';

export const INVENTORY_CAPACITY = HOTBAR_CAPACITY;

export interface GameInventorySnapshot {
  slots: (string | null)[];
  selected_index: number | null;
}

type InventoryListener = () => void;

function hotbarSlots(): (string | null)[] {
  const hotbar = getInventoryState().containers[CONTAINER_IDS.playerHotbar];

  return hotbar.slots.map((slot) => (slot === null ? null : slot.definitionId));
}

/** Subscribe to inventory changes; returns an unsubscribe function. */
export function onInventoryChange(listener: InventoryListener): () => void {
  return onInventoryStoreChange(() => listener());
}

/**
 * Adds one item to the first free hotbar slot. Returns false (no change)
 * when the belt is full — callers surface the full-inventory feedback.
 */
export function addInventoryItem(itemId: string): boolean {
  getGameItem(itemId); // validate id (legacy contract: throws on unknown)

  const change = invAddItem({
    definitionId: itemId,
    quantity: 1,
    targetContainerIds: [CONTAINER_IDS.playerHotbar],
    allOrNothing: true,
  });

  return change.ok;
}

/**
 * Removes the first hotbar slot holding the item (use/install/deliver).
 * Returns false when the item is not carried.
 */
export function removeInventoryItem(itemId: string): boolean {
  const index = hotbarSlots().indexOf(itemId);

  if (index === -1) {
    return false;
  }

  return invTakeStackOutForLegacyRemove(CONTAINER_IDS.playerHotbar, index).ok;
}

export function hasInventoryItem(itemId: string): boolean {
  return hotbarSlots().includes(itemId);
}

/** Item ids currently carried, in slot order (nulls skipped). */
export function getInventoryItems(): string[] {
  return hotbarSlots().filter((slot): slot is string => slot !== null);
}

export function getInventorySlots(): (string | null)[] {
  return hotbarSlots();
}

export function isInventoryFull(): boolean {
  return !hotbarSlots().includes(null);
}

/** Selects a slot by index (pointer path). No-op on empty slots. */
export function selectInventorySlot(index: number) {
  if (getInventoryState().hotbarSelection !== index) {
    invSelectHotbarSlot(index);
  }
}

/** Cycles selection to the next held slot (keyboard path, TAB). */
export function selectNextInventoryItem() {
  invCycleHotbarSelection();
}

export function getSelectedInventoryItem(): string | null {
  const selected = getInventoryState().hotbarSelection;

  return selected === null ? null : hotbarSlots()[selected];
}

export function getSelectedInventoryIndex(): number | null {
  return getInventoryState().hotbarSelection;
}

/** Serialisable snapshot (DEV probe / tests) — legacy belt shape. */
export function serializeInventory(): GameInventorySnapshot {
  return {
    slots: hotbarSlots(),
    selected_index: getInventoryState().hotbarSelection,
  };
}

/**
 * Test-only escape hatch (resetAllRoomTaskStates precedent): recreates
 * the WHOLE authoritative inventory from scratch. Not used by gameplay
 * code.
 */
export function resetGameplayInventory() {
  resetInventoryStore();
}
