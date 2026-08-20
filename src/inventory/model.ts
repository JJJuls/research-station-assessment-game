/**
 * Authoritative inventory domain model (interactive inventory foundation).
 *
 * Pure data shapes only — no Phaser, no telemetry, no DOM. The engine
 * (engine.ts) operates on these shapes transactionally; the module-scope
 * store (store.ts) owns the single runtime instance. Every UI (overlay,
 * hotbar HUD, Inventory Lab stations, M02/M03 workstations) reads and
 * mutates inventory state exclusively through the engine's commands, so
 * mouse and keyboard interaction paths are guaranteed to produce the same
 * final state.
 */

export type ItemCategory =
  | 'tool'
  | 'component'
  | 'sample'
  | 'document'
  | 'container'
  | 'consumable'
  | 'record'
  | 'residue';

export interface ItemDefinition {
  /** Stable definition id (legacy gameplay item ids are reused verbatim). */
  definitionId: string;
  displayName: string;
  /** One-line in-fiction description (tooltip/detail panel). */
  description: string;
  category: ItemCategory;
  /** Icon texture key (proc-icon-* legacy foundry or inv-icon-* local). */
  icon: string;
  /** Maximum stack quantity (>= 1). Legacy carry items are always 1. */
  maxStack: number;
  tags: readonly string[];
  usable: boolean;
  droppable: boolean;
  discardable: boolean;
  /**
   * Recipe participation, human-readable (detail panel "combine" hint):
   * e.g. 'ingredient:fused_relay_cartridge' or 'output:sealed_sample'.
   */
  recipeRoles: readonly string[];
  /**
   * Measurement-workstation binding. Items bound to 'm02' or 'm03' may
   * only ever occupy containers of the same namespace — they can never
   * enter the player inventory, and general items can never enter a
   * measurement workstation. This is the structural guarantee behind the
   * M02/M03 separation requirement.
   */
  boundNamespace?: ContainerNamespace;
}

export interface ItemStack {
  /** Stable stack instance id — unique across the whole inventory state. */
  stackId: string;
  definitionId: string;
  /** 1..maxStack. A zero/negative quantity in a slot is an invariant hit. */
  quantity: number;
  /** Optional per-instance metadata (never used for scoring). */
  metadata?: Record<string, string>;
}

export type ContainerType =
  | 'backpack'
  | 'hotbar'
  | 'storage'
  | 'workbench_input'
  | 'workbench_output'
  | 'm02_desk'
  | 'm02_folder'
  | 'm03_surface'
  | 'm03_store';

export type ContainerNamespace = 'general' | 'm02' | 'm03';

export interface Container {
  containerId: string;
  containerType: ContainerType;
  /** Fixed slot capacity; slots.length always equals capacity. */
  capacity: number;
  /** Ordered slots (null = empty). */
  slots: (ItemStack | null)[];
  /** When present, an item must share at least one tag to be accepted. */
  acceptTags?: readonly string[];
  /**
   * Player-insert lock: place/quick-transfer/pickup insertion is refused
   * (workbench output — only a committed recipe writes into it).
   */
  insertLocked?: boolean;
  namespace: ContainerNamespace;
}

/**
 * A stack lifted "into the hand" (drag ghost / keyboard pick-up). The
 * source slot is recorded so cancellation, an invalid drop, closing the
 * UI, or a scene change can always restore the stack safely.
 */
export interface HeldStack {
  stack: ItemStack;
  source: { containerId: string; slotIndex: number };
}

export interface InventoryState {
  containers: Record<string, Container>;
  held: HeldStack | null;
  /** Selected hotbar slot (legacy belt selection), or null when empty. */
  hotbarSelection: number | null;
  /** Monotonic source for deterministic stack instance ids. */
  nextStackSeq: number;
}

/* ------------------------------------------------------------------ *
 * Serialisation (inventory-v1)
 * ------------------------------------------------------------------ */

export const INVENTORY_SCHEMA_VERSION = 'inventory-v1';

export interface SerializedStack {
  stack_id: string;
  definition_id: string;
  quantity: number;
  metadata?: Record<string, string>;
}

export interface SerializedContainer {
  container_id: string;
  container_type: ContainerType;
  capacity: number;
  slots: (SerializedStack | null)[];
}

export interface InventorySnapshotV1 {
  schema_version: typeof INVENTORY_SCHEMA_VERSION;
  containers: SerializedContainer[];
  hotbar_selection: number | null;
  /** Held stack at snapshot time (restored to its source on load). */
  held:
    | (SerializedStack & { source_container_id: string; source_slot: number })
    | null;
  next_stack_seq: number;
}

/**
 * The pre-foundation snapshot shape (src/gameplay/inventory.ts before this
 * unit): ten single-item slots plus a selection index. Migrated into the
 * hotbar container of an inventory-v1 state by the engine's migration op.
 */
export interface LegacyGameInventorySnapshot {
  slots: (string | null)[];
  selected_index: number | null;
}

/* ------------------------------------------------------------------ *
 * Canonical container ids (fixed world layout of this foundation)
 * ------------------------------------------------------------------ */

export const CONTAINER_IDS = {
  playerBackpack: 'player_backpack',
  playerHotbar: 'player_hotbar',
  labStorage: 'lab_storage',
  workbenchInput: 'workbench_input',
  workbenchOutput: 'workbench_output',
  m02Desk: 'm02_desk',
  m02FolderIr7: 'm02_folder_ir7',
  m02FolderIr12: 'm02_folder_ir12',
  m02FolderIr19: 'm02_folder_ir19',
  m03SurfaceA: 'm03_surface_a',
  m03StoreA: 'm03_store_a',
  m03SurfaceB: 'm03_surface_b',
  m03StoreB: 'm03_store_b',
} as const;

export const PLAYER_CONTAINER_IDS: readonly string[] = [
  CONTAINER_IDS.playerHotbar,
  CONTAINER_IDS.playerBackpack,
];

/** Capacities fixed by the unit contract. */
export const HOTBAR_CAPACITY = 10;
export const BACKPACK_CAPACITY = 20;
export const LAB_STORAGE_CAPACITY = 20;
export const WORKBENCH_INPUT_CAPACITY = 2;
export const WORKBENCH_OUTPUT_CAPACITY = 1;

/* ------------------------------------------------------------------ *
 * Recipes (non-scored demonstration assemblies)
 * ------------------------------------------------------------------ */

export interface Recipe {
  recipeId: string;
  displayName: string;
  /** Required input quantities by definition id (exact match, no extras). */
  inputs: Record<string, number>;
  output: { definitionId: string; quantity: number };
}

export const RECIPES: readonly Recipe[] = [
  {
    recipeId: 'fused_relay_cartridge',
    displayName: 'Fused Relay Cartridge',
    inputs: { fuse_contact: 2, relay_housing: 1 },
    output: { definitionId: 'fused_relay_cartridge', quantity: 1 },
  },
  {
    recipeId: 'sealed_sample',
    displayName: 'Sealed Sample',
    inputs: { sample_vial: 1, seal_cap: 1 },
    output: { definitionId: 'sealed_sample', quantity: 1 },
  },
] as const;

export function getRecipe(recipeId: string): Recipe | undefined {
  return RECIPES.find((recipe) => recipe.recipeId === recipeId);
}
