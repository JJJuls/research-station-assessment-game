/**
 * Q03 independent prepared-tool retrieval module state (SA-12 adopted
 * design; Unit 3).
 *
 * A standardised retrieval/maintained-order opportunity at the Station
 * Hub Calibration Cabinet, in two phases:
 *  - STOW (standardised organisation micro-episode): every participant
 *    receives the same three returned bench tools and the same four
 *    labelled slots, and stows each tool somewhere;
 *  - RETRIEVE (the retrieval episode): on a later Hub visit (after at
 *    least one other room), the bench requests one specific tool; the
 *    participant opens slots until they produce it.
 *
 * INDEPENDENCE (SA-12): availability and entry state are identical for
 * every participant and depend on NO other item's outcome — never on the
 * Inventory/Prep room, never on whether a tool was packed. The existing
 * Inventory-gated probe retrieval at the Repair Panel remains SECONDARY
 * evidence and is untouched. Event names are internal/provisional; no
 * scoring exists.
 */

import { getRoomEntryLog } from './validity';

export const Q03_OPPORTUNITY_ID = 'proto_q03_calibration_retrieval';
export const Q03_ENTRY_STATE_VERSION = 'q03-cabinet-v1';

export interface Q03Slot {
  slot_id: string;
  label: string;
}

/** Fixed labelled slots (identical for everyone). */
export const Q03_SLOTS: readonly Q03Slot[] = [
  { slot_id: 'slot_measurement', label: 'Measurement shelf' },
  { slot_id: 'slot_optics', label: 'Optics shelf' },
  { slot_id: 'slot_fasteners', label: 'Fasteners drawer' },
  { slot_id: 'slot_general', label: 'General tray' },
] as const;

export interface Q03Tool {
  tool_id: string;
  label: string;
}

/** Fixed returned-tool set, in fixed presentation order. */
export const Q03_TOOLS: readonly Q03Tool[] = [
  { tool_id: 'flux_calibrator_bench', label: 'Flux Calibrator' },
  { tool_id: 'hex_gauge', label: 'Hex Gauge' },
  { tool_id: 'lens_kit', label: 'Lens Kit' },
] as const;

/** The tool the later retrieval episode requests (fixed for everyone). */
export const Q03_RETRIEVAL_TARGET_ID = 'flux_calibrator_bench';

interface Q03State {
  stow_offered: boolean;
  /** tool_id -> slot_id chosen during the stow phase. */
  stowed: Record<string, string>;
  stow_completed: boolean;
  /** Room-entry-log length at stow completion (retrieval eligibility). */
  stow_completed_room_index: number | null;
  retrieval_offered: boolean;
  /** Slots opened during retrieval, in order. */
  retrieval_opens: string[];
  retrieval_completed: boolean;
}

function createInitialQ03State(): Q03State {
  return {
    stow_offered: false,
    stowed: {},
    stow_completed: false,
    stow_completed_room_index: null,
    retrieval_offered: false,
    retrieval_opens: [],
    retrieval_completed: false,
  };
}

export const q03State: Q03State = createInitialQ03State();

export function markQ03StowOffered() {
  q03State.stow_offered = true;
}

export function unstowedQ03Tools(): Q03Tool[] {
  return Q03_TOOLS.filter(
    (tool) => q03State.stowed[tool.tool_id] === undefined,
  );
}

export function stowQ03Tool(toolId: string, slotId: string) {
  q03State.stowed[toolId] = slotId;

  if (unstowedQ03Tools().length === 0) {
    q03State.stow_completed = true;
    q03State.stow_completed_room_index = getRoomEntryLog().length;
  }
}

/**
 * The retrieval episode becomes eligible on a Hub visit after at least
 * one OTHER room has been entered since the stow completed (a real
 * later-retrieval window, identical rule for every participant).
 */
export function q03RetrievalEligible(): boolean {
  if (!q03State.stow_completed || q03State.retrieval_offered) {
    return false;
  }

  const sinceStow = getRoomEntryLog().slice(
    q03State.stow_completed_room_index ?? 0,
  );

  return sinceStow.some((roomId) => roomId !== 'station_hub');
}

export function markQ03RetrievalOffered() {
  q03State.retrieval_offered = true;
}

/**
 * Opens one slot during retrieval. Returns whether the requested tool
 * was in that slot (i.e. the slot the participant stowed it in).
 */
export function openQ03Slot(slotId: string): boolean {
  q03State.retrieval_opens.push(slotId);

  const found = q03State.stowed[Q03_RETRIEVAL_TARGET_ID] === slotId;

  if (found) {
    q03State.retrieval_completed = true;
  }

  return found;
}

export function q03RetrievalSummary() {
  return {
    stowed_slot: q03State.stowed[Q03_RETRIEVAL_TARGET_ID] ?? null,
    opens_count: q03State.retrieval_opens.length,
    first_open_correct:
      q03State.retrieval_opens.length > 0 &&
      q03State.retrieval_opens[0] === q03State.stowed[Q03_RETRIEVAL_TARGET_ID],
    completed: q03State.retrieval_completed,
  };
}

export function getQ03Slot(slotId: string): Q03Slot {
  const slot = Q03_SLOTS.find((entry) => entry.slot_id === slotId);

  if (slot === undefined) {
    throw new Error(`Unknown Q03 slot: ${slotId}`);
  }

  return slot;
}

export function getQ03Tool(toolId: string): Q03Tool {
  const tool = Q03_TOOLS.find((entry) => entry.tool_id === toolId);

  if (tool === undefined) {
    throw new Error(`Unknown Q03 tool: ${toolId}`);
  }

  return tool;
}

/** Test-only escape hatch. */
export function resetQ03State() {
  Object.assign(q03State, createInitialQ03State());
  q03State.stowed = {};
  q03State.retrieval_opens = [];
}
