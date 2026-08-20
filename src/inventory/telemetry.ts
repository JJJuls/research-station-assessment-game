/**
 * Secondary inventory telemetry adapter (interactive inventory
 * foundation).
 *
 * SCIENTIFIC BOUNDARY — read before editing:
 *
 * - Ordinary inventory behaviour is SHARED INFRASTRUCTURE. Its events are
 *   `secondary_inventory_*`: contextual/ecological telemetry only, NEVER
 *   primary evidence for any questionnaire item, and in particular never
 *   M02/M03 evidence. A generally tidy player inventory must never count
 *   as organisation measurement data.
 * - `proto_m02_*` / `proto_m03_*` events belong exclusively to the two
 *   workstation modules (m02Filing.ts / m03Reset.ts). This adapter
 *   IGNORES every store change in the 'm02'/'m03' namespaces so the
 *   three event families stay disjoint by construction.
 * - Every name here is PROVISIONAL (scenario_* / proto_* precedent, logged
 *   through researchRuntime.logInteraction with no CANONICAL_EVENT_CONTEXT
 *   entry, no study_item_ids, no construct_id, no success flag). Nothing
 *   here is an approved event-schema entry, and no derived variable or
 *   score consumes these events (ScoringManager matches exact literal
 *   names only).
 */

import { researchRuntime } from '../systems';
import type { InventoryChange } from './store';
import { onInventoryStoreChange } from './store';

/** Committed general-namespace state changes worth an ecological record. */
const LOGGED_OPS = new Set([
  'place',
  'quick_transfer',
  'sort',
  'consolidate',
  'commit_recipe',
  'discard',
  'world_drop',
  'add_item',
]);

let installed = false;
let sceneLabel = 'inventory';

/** The scene label stamped on subsequent secondary events (display only). */
export function setInventoryTelemetryScene(scene: string) {
  sceneLabel = scene;
}

/**
 * One provisional secondary event, logged immediately (overlay open/close,
 * world pickup context and similar UI-level moments).
 */
export function logSecondaryInventoryEvent(
  suffix: string,
  metadata: Record<string, unknown> = {},
) {
  researchRuntime.logInteraction({
    scene: sceneLabel,
    object_id: 'inventory_service',
    episode: 'secondary_inventory',
    event_type: `secondary_inventory_${suffix}`,
    metadata,
  });
}

/**
 * Installs the store→telemetry bridge once per session. General-namespace
 * committed operations become secondary_inventory_* events; measurement
 * namespaces are ignored here by design (see the boundary note above).
 */
export function installInventoryTelemetry() {
  if (installed) {
    return;
  }

  installed = true;

  onInventoryStoreChange((change: InventoryChange) => {
    if (!change.ok || change.namespace !== 'general') {
      return;
    }

    if (!LOGGED_OPS.has(change.op)) {
      return;
    }

    logSecondaryInventoryEvent(change.op, {
      containers: [...change.containerIds],
      ...change.detail,
    });
  });
}
