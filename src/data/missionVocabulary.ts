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
 * hazard_status written by the Hazard Control room: which documented route
 * decision the player last took (V3 §4 Room 5 outcomes: informed continue,
 * reckless continue, avoid the uncertain route). Decision labels only —
 * avoidance is its own outcome category, never scored as reckless and never
 * conflated with task abandonment (user ruling D1 + room-doc edge cases).
 * The room ports the prototype's repeatable prompt (no one-shot decision
 * gate exists in the legacy scene), so this field reflects the most recent
 * decision.
 */
export const HAZARD_STATUS_INFORMED_CONTINUE = 'informed_continue';
export const HAZARD_STATUS_RECKLESS_CONTINUE = 'reckless_continue';
export const HAZARD_STATUS_ROUTE_AVOIDED = 'route_avoided';

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
 * FABLE-NEXT-05 corridor task ids (event metadata `original_task_id` /
 * `competing_task_id`) and the two additive SessionState status fields.
 *
 * competing_task_status — the beacon's real competing task (antenna
 * alignment at the corridor junction): not_started -> accepted (switch
 * committed) -> started (first junction interaction; switched_task
 * observed) -> completed. relay_checkpoint_status — the genuinely pending
 * original objective (relay check-in, available only while the accepted
 * relay-supervision duty is active): not_started -> pending -> completed.
 * Vocabulary defined by the corridor beat per SessionState's documented
 * open-vocabulary rule; Final Core reads relay_checkpoint 'pending' +
 * interruption 'switched_away' as the prior_goal_abandoned closure
 * condition (a no-opportunity session — nothing genuinely pending — can
 * never produce that closure event).
 */
export const RELAY_CHECKPOINT_TASK_ID = 'relay_checkpoint';
export const AUX_ANTENNA_TASK_ID = 'aux_antenna_alignment';
/**
 * switch_original_task_id — the opportunity state FROZEN at the moment the
 * switch is committed (gameplay-review finding: a duty accepted AFTER an
 * opportunity-less switch must not retroactively make the switch's
 * return/abandonment observations interpretable — the task file defines
 * "no switch/return observation is interpretable" for the no-opportunity
 * state). Values: RELAY_CHECKPOINT_TASK_ID (a check-in was genuinely
 * pending at commit) | SWITCH_ORIGINAL_NONE (nothing pending at commit) |
 * 'not_started' (no switch committed yet).
 */
export const SWITCH_ORIGINAL_NONE = 'none';
export const COMPETING_TASK_STATUS_ACCEPTED = 'accepted';
export const COMPETING_TASK_STATUS_STARTED = 'started';
export const COMPETING_TASK_STATUS_COMPLETED = 'completed';
export const RELAY_CHECKPOINT_STATUS_PENDING = 'pending';
export const RELAY_CHECKPOINT_STATUS_COMPLETED = 'completed';

/**
 * final_core_status written by the Final Core room: which completion path
 * closed the mission cycle. Path labels only — never a score (Final Core
 * must not become a global quality rollup).
 */
export const FINAL_CORE_STATUS_LOW_QUALITY = 'completed_low_quality';
export const FINAL_CORE_STATUS_STRUCTURED = 'completed_structured';
export const FINAL_CORE_STATUS_HIGH_QUALITY = 'completed_high_quality';
export const FINAL_CORE_STATUS_FORCED = 'completed_forced';
