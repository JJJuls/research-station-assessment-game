/**
 * Inventory / Preparation Room per-item registry and carried-item substrate
 * (FABLE-NEXT-02, contract §R4 target minigame). This is deliberately the
 * SMALLEST kit substrate the Q01-Q04 measurement needs: a fixed item list,
 * one carried item at a time, and per-item location/attempt state. It is
 * NOT a general inventory system — no stacking, no rarity, no currency,
 * no crafting. The one cross-room consumer is the Q03 retrieval episode
 * at the Repair Panel (NEXT-09 Phase 2), which reads this state strictly
 * read-only.
 *
 * Labels are operational fiction only (anti-leakage rule, room doc): no
 * BFI/organisation item wording, and every item names its correct
 * destination in plain text (transparency safeguard — label ambiguity must
 * not mimic disorganisation; spec Q02 confounds row).
 */

/** Labelled storage bins (contract layout: 3-5 labelled bins). */
export const STORAGE_BINS = [
  { bin_id: 'bin_hand_tools', label: 'Hand Tools Rack' },
  { bin_id: 'bin_consumables', label: 'Consumables Bin' },
  { bin_id: 'bin_electronics', label: 'Electronics Shelf' },
] as const;

export type StorageBinId = (typeof STORAGE_BINS)[number]['bin_id'];

/**
 * Where a registry item can currently sit. `carried` is the single-slot
 * carried-item substrate (at most one item may be `carried` at a time —
 * enforced by the scene's pickup gating, which only offers pickup options
 * while nothing is carried).
 */
export type ItemLocation =
  | 'prep_bench'
  | 'carried'
  | 'kit_crate'
  | StorageBinId;

/** A destination the player can place a carried item into. */
export type PlacementDestination = 'kit_crate' | StorageBinId;

export interface KitRegistryItem {
  /** Stable id — becomes `object_id` on every per-item event. */
  item_id: string;
  label: string;
  /**
   * Correct destination. `kit_crate` items are the kit requisition, in
   * checklist order; bin items are stray gear tagged for a labelled rack.
   */
  destination: PlacementDestination;
}

/**
 * The full bench stock: 5 kit-required items (checklist order is this
 * array's order) + 3 stray items homed to the labelled bins. 8 items keeps
 * every bench/bin prompt within the 9-option renderer cap while satisfying
 * the task file's 6-10 item range.
 */
export const KIT_ITEM_REGISTRY: readonly KitRegistryItem[] = [
  {
    item_id: 'torque_driver',
    label: 'Torque Driver',
    destination: 'kit_crate',
  },
  {
    item_id: 'diagnostic_probe',
    label: 'Diagnostic Probe',
    destination: 'kit_crate',
  },
  {
    item_id: 'coolant_cartridge',
    label: 'Coolant Cartridge',
    destination: 'kit_crate',
  },
  { item_id: 'fuse_pack', label: 'Spare Fuse Pack', destination: 'kit_crate' },
  { item_id: 'patch_tape', label: 'Patch Tape', destination: 'kit_crate' },
  {
    item_id: 'hex_spanner',
    label: 'Hex Spanner',
    destination: 'bin_hand_tools',
  },
  {
    item_id: 'sealant_canister',
    label: 'Sealant Canister',
    destination: 'bin_consumables',
  },
  {
    item_id: 'relay_board',
    label: 'Relay Board',
    destination: 'bin_electronics',
  },
];

/** Kit requisition (checklist order), derived from the registry order. */
export const KIT_REQUIRED_ITEM_IDS: readonly string[] =
  KIT_ITEM_REGISTRY.filter((item) => item.destination === 'kit_crate').map(
    (item) => item.item_id,
  );

export function getRegistryItem(itemId: string): KitRegistryItem {
  const item = KIT_ITEM_REGISTRY.find((entry) => entry.item_id === itemId);

  if (item === undefined) {
    throw new Error(`Unknown kit registry item: ${itemId}`);
  }

  return item;
}

export function getBinLabel(binId: StorageBinId): string {
  const bin = STORAGE_BINS.find((entry) => entry.bin_id === binId);

  if (bin === undefined) {
    throw new Error(`Unknown storage bin: ${binId}`);
  }

  return bin.label;
}

/**
 * Player-facing destination tag for an item (transparency safeguard):
 * either the kit requisition or its rack's explicit label.
 */
export function getDestinationTag(item: KitRegistryItem): string {
  return item.destination === 'kit_crate'
    ? 'kit requisition'
    : `rack tag: ${getBinLabel(item.destination)}`;
}

/**
 * Live per-item preparation state. Lives at module scope so room re-entry
 * preserves kit state (contract §R4 interruption/return row) — the same
 * page-session lifetime pattern as the scenario framework's progress and
 * RoomScene's once-per-session flags. A page (re)load starts a fresh
 * session and therefore a fresh state (session-isolation guarantee).
 */
export interface KitPreparationState {
  /** True once the player has chosen the per-item preparation option. */
  engaged: boolean;
  locations: Record<string, ItemLocation>;
  /** Per-item placement count — `attempt_number` on placement events. */
  attempts: Record<string, number>;
  /**
   * First-placement order of kit-required items into the kit crate
   * (inventory_sequence_followed is derived from it at kit completion).
   */
  kit_first_placement_order: string[];
  /** Once-per-session event guards. */
  sequence_completed_logged: boolean;
  /**
   * Order compliance is judged exactly once, at the FIRST moment the kit
   * holds every required item; `sequence_followed_logged` records whether
   * inventory_sequence_followed fired at that evaluation.
   */
  sequence_followed_evaluated: boolean;
  sequence_followed_logged: boolean;
  missing_item_logged: string[];
}

function createInitialState(): KitPreparationState {
  const locations: Record<string, ItemLocation> = {};
  const attempts: Record<string, number> = {};

  for (const item of KIT_ITEM_REGISTRY) {
    locations[item.item_id] = 'prep_bench';
    attempts[item.item_id] = 0;
  }

  return {
    engaged: false,
    locations,
    attempts,
    kit_first_placement_order: [],
    sequence_completed_logged: false,
    sequence_followed_evaluated: false,
    sequence_followed_logged: false,
    missing_item_logged: [],
  };
}

/** Module-scope singleton (page-session lifetime; see interface note). */
export const kitPreparationState: KitPreparationState = createInitialState();

/** Item ids currently at a given location, in registry order. */
export function itemsAtLocation(location: ItemLocation): string[] {
  return KIT_ITEM_REGISTRY.filter(
    (item) => kitPreparationState.locations[item.item_id] === location,
  ).map((item) => item.item_id);
}

/** The carried item id, or null (single carried slot by construction). */
export function carriedItemId(): string | null {
  return itemsAtLocation('carried')[0] ?? null;
}

/** Kit-required item ids not currently in the kit crate, checklist order. */
export function missingKitItemIds(): string[] {
  return KIT_REQUIRED_ITEM_IDS.filter(
    (itemId) => kitPreparationState.locations[itemId] !== 'kit_crate',
  );
}

/**
 * Items currently at the WRONG destination (in the kit crate without being
 * kit-required, or in a bin that is not their tagged rack). Bench and
 * carried items are "still out", not misplaced.
 */
export function misplacedItemIds(): string[] {
  return KIT_ITEM_REGISTRY.filter((item) => {
    const location = kitPreparationState.locations[item.item_id];

    return (
      location !== 'prep_bench' &&
      location !== 'carried' &&
      location !== item.destination
    );
  }).map((item) => item.item_id);
}

/** True once every registry item has been placed at some destination. */
export function allItemsPlaced(): boolean {
  return itemsAtLocation('prep_bench').length === 0 && carriedItemId() === null;
}
