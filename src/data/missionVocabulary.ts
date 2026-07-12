/**
 * Mission-state vocabulary tokens for SessionState's V3 §3.1 fields.
 * Each token is defined by the room beat that introduces it (SessionState's
 * documented open-vocabulary rule) and read by the Final Core beat.
 */

/**
 * Recorded in prepared_items when the field kit is packed completely
 * (Inventory/Prep beat). final_core_missing_item_flagged derives from its
 * ABSENCE.
 */
export const FIELD_KIT_ITEM_ID = 'field_kit';

/** workspace_status written by the Inventory/Prep room (Q04 source). */
export const WORKSPACE_STATUS_TIDY = 'tidy';
export const WORKSPACE_STATUS_DISORDERED = 'disordered';

/**
 * side_repair_status written by the Optional Side Repair Bay. The contract
 * requires accepted/started/deferred/abandoned/completed to stay separate
 * (completionism/curiosity confound control); 'deferred' must never be
 * scored like abandonment. Final Core reads 'completed' for the stability
 * bonus.
 */
export const SIDE_REPAIR_STATUS_IGNORED = 'ignored';
export const SIDE_REPAIR_STATUS_ABANDONED_AFTER_START = 'abandoned_after_start';
export const SIDE_REPAIR_STATUS_DEFERRED = 'deferred';
export const SIDE_REPAIR_STATUS_COMPLETED = 'completed';

/**
 * interruption_status written by the Interruption Corridor. Switching is
 * never scored negatively by itself — Final Core reads 'switched_away'
 * only as the candidate state for final_unresolved_due_to_nonreturn
 * (unresolved non-return, not mere switching).
 */
export const INTERRUPTION_STATUS_SWITCHED_AWAY = 'switched_away';
export const INTERRUPTION_STATUS_RETURNED = 'returned_to_task';
export const INTERRUPTION_STATUS_ALERT_IGNORED = 'alert_ignored';

/**
 * final_core_status written by the Final Core room: which completion path
 * closed the mission cycle. Path labels only — never a score (Final Core
 * must not become a global quality rollup).
 */
export const FINAL_CORE_STATUS_LOW_QUALITY = 'completed_low_quality';
export const FINAL_CORE_STATUS_STRUCTURED = 'completed_structured';
export const FINAL_CORE_STATUS_HIGH_QUALITY = 'completed_high_quality';
export const FINAL_CORE_STATUS_FORCED = 'completed_forced';
