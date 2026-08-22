/**
 * Generic field-action telemetry (field-actions foundation).
 *
 * The `secondary_field_action_*` family: contextual/ecological raw
 * telemetry for the reusable scan/dig/magnet mechanics, mirroring the
 * `secondary_inventory_*` convention (src/inventory/telemetry.ts).
 * Emission goes through the injected field-action log sink
 * (fieldActionLog.ts) so this module stays pure and Node-testable.
 *
 * GOVERNANCE: every name is provisional. Secondary field-action events
 * are shared-infrastructure context only — they are NEVER primary
 * evidence for any measurement item, never consumed by ScoringManager
 * (which matches exact literal canonical names only), and have no
 * CANONICAL_EVENT_CONTEXT entries. The three provisional item windows
 * (src/fieldActions/opportunities/*) own their OWN disjoint families;
 * one physical action may notify the active window, but the resulting
 * item-local event belongs to that window's family alone.
 */

import { emitFieldActionLog } from './fieldActionLog';

/** The complete generic suffix set (tests assert family disjointness). */
export const SECONDARY_FIELD_ACTION_SUFFIXES = [
  'scan',
  'dig',
  'magnet_cycle',
  'refusal',
  'cache_created',
  'cache_recovered',
  'lab_entered',
] as const;

export type SecondaryFieldActionSuffix =
  (typeof SECONDARY_FIELD_ACTION_SUFFIXES)[number];

export const SECONDARY_FIELD_ACTION_EVENT_TYPES: readonly string[] =
  SECONDARY_FIELD_ACTION_SUFFIXES.map(
    (suffix) => `secondary_field_action_${suffix}`,
  );

let telemetryScene = 'field_actions_lab';

/** The scene name attached to subsequent generic events. */
export function setFieldActionTelemetryScene(scene: string): void {
  telemetryScene = scene;
}

/**
 * Logs one generic field-action event (raw pilot telemetry via the
 * unmapped interaction path — no canonical context is ever spread).
 */
export function logSecondaryFieldAction(
  suffix: SecondaryFieldActionSuffix,
  metadata: Record<string, unknown> = {},
): void {
  emitFieldActionLog({
    scene: telemetryScene,
    episode: 'secondary_field_action',
    event_type: `secondary_field_action_${suffix}`,
    object_id: 'field_action_service',
    metadata,
  });
}
