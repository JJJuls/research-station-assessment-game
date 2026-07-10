/**
 * Canonical V3 §3.2 context for a specific `event_type` string, keyed by the
 * exact (legacy) event_type currently logged in this file. Populated only
 * where docs/research/MASTER_33_ALIGNMENT.md's Q01-Q33 coverage matrix and/or
 * docs/research/event-schema.md's worked examples give an unambiguous
 * mapping — see the Beat 2B.2B report for the per-event source
 * justification. Event types with no entry here (e.g. Inventory/Prep,
 * Optional Side Repair, Interruption Corridor, Final Core) still receive
 * `room_id`/`task_id` via `researchInteractions`, just no `study_item_ids`/
 * `construct_id`/`success` — those rooms' current event names have no clear
 * canonical mapping yet per event-schema.md's alias tables.
 *
 * Phase A extraction note: this interface and map were moved verbatim from
 * `src/scenes/Main.tsx` (byte-for-byte entries; only the module location
 * changed) so new room scenes and the prototype scene share one source of
 * truth for `study_item_ids`/`construct_id`. Additions for new rooms must
 * use only event names and mappings already defined in V3 §4–§5,
 * MASTER_33_ALIGNMENT.md, or event-schema.md — if a mapping is missing or
 * contradictory across those documents, stop and report instead of guessing
 * (approved plan §13.1b).
 */
export interface CanonicalEventContext {
  study_item_ids?: string[];
  construct_id?: string;
  success?: boolean | null;
  metadata?: Record<string, unknown>;
}

export const CANONICAL_EVENT_CONTEXT: Partial<
  Record<string, CanonicalEventContext>
> = {
  // Dock / Arrival Bay — control/usability data only (V3 §1 rule 1);
  // no Q-item or construct mapping exists for this room.
  dock_tutorial_opened: { study_item_ids: [] },
  dock_tutorial_skipped: { study_item_ids: [] },
  dock_instruction_shortcut: { study_item_ids: [] },
  dock_controls_reviewed: { study_item_ids: [] },
  dock_tutorial_completed: { study_item_ids: [] },
  dock_instruction_followed: { study_item_ids: [] },
  dock_movement_practiced: { study_item_ids: [] },
  dock_control_familiarisation: { study_item_ids: [] },
  // Beat 3B.1 — canonical V3 §4 Room 0 baseline-control events, additive
  // alongside the legacy dock_* events above (none renamed/removed/folded).
  dock_started: { study_item_ids: [] },
  movement_instruction_shown: { study_item_ids: [] },
  first_movement: { study_item_ids: [] },
  first_interaction: { study_item_ids: [] },
  // Phase B (Beat 3) — remaining canonical V3 §4 Room 0 events, additive
  // alongside the legacy dock_* events (event-schema.md §4 Dock table).
  // All control/usability data: study_item_ids [], no construct_id.
  // tutorial_completed carries metadata.skipped/metadata.path per the
  // schema table's fold recommendations; control_error_count carries the
  // aggregate count in metadata (payload placement documented in
  // event-schema.md §4). baseline_idle_seconds is registered but NOT
  // emitted until the user supplies the idle definition/threshold
  // (approved plan §12 — missing scientific parameter, never chosen
  // autonomously).
  tutorial_completed: { study_item_ids: [] },
  tutorial_help_shown: { study_item_ids: [] },
  control_error_count: { study_item_ids: [] },
  baseline_idle_seconds: { study_item_ids: [] },

  // Archive Room (MASTER_33_ALIGNMENT.md Q13/Q22/Q23/Q26 "Events" columns).
  // success: false — docs/game/rooms/01-archive-room.md Task flow step 2:
  // "Player attempts a code/query — the naive first attempt fails."
  archive_wrong_code: {
    study_item_ids: ['Q13'],
    construct_id: 'adaptive_persistence',
    success: false,
  },
  // success: false — docs/game/rooms/01-archive-room.md Failure/edge
  // cases: "Player repeats the exact same wrong code: must log
  // archive_same_wrong_code_repeated" (a repeat of the failed attempt
  // described in Task flow step 2).
  archive_same_wrong_code_repeated: {
    study_item_ids: ['Q26'],
    construct_id: 'inappropriate_persistence',
    success: false,
  },
  archive_feedback_used: {
    study_item_ids: ['Q13', 'Q22'],
    construct_id: 'adaptive_persistence',
  },
  // study_item_ids/construct_id/success match the worked example in
  // event-schema.md §6 verbatim; also corroborated by
  // docs/game/rooms/01-archive-room.md Valid choices/actions: "Try a
  // revised archive query (success path)".
  archive_strategy_revision: {
    study_item_ids: ['Q13', 'Q22', 'Q26'],
    construct_id: 'adaptive_persistence',
    success: true,
  },
  // study_item_ids: Q06 (productiveness) and Q13 (adaptive persistence)
  // both list this event; construct_id intentionally left unset — see
  // report. success: true — docs/game/rooms/01-archive-room.md Task flow
  // step 5: "Completion flag sent to mission checklist when a revised
  // query succeeds."
  archive_completed: {
    study_item_ids: ['Q06', 'Q13'],
    success: true,
  },

  // Systems Repair Room (MASTER_33_ALIGNMENT.md Q06/Q14/Q21/Q22/Q23/Q26).
  // success: false — docs/game/rooms/02-systems-repair-room.md Task flow
  // step 2: "Player runs a repair sequence — default/first attempt
  // fails."
  repair_failed: {
    study_item_ids: ['Q14', 'Q21'],
    construct_id: 'adaptive_persistence',
    success: false,
  },
  // success: false — docs/game/rooms/02-systems-repair-room.md
  // Failure/edge cases: "Player repeats the exact same failed sequence:
  // must log repair_same_sequence_repeated".
  repair_same_sequence_repeated: {
    study_item_ids: ['Q26'],
    construct_id: 'inappropriate_persistence',
    success: false,
  },
  repair_manual_used: {
    study_item_ids: ['Q14', 'Q21', 'Q22'],
    construct_id: 'adaptive_persistence',
  },
  // success: true — docs/game/rooms/02-systems-repair-room.md Valid
  // choices/actions: "Apply revised repair sequence (success path)".
  repair_strategy_revision: {
    study_item_ids: ['Q14', 'Q21', 'Q23'],
    construct_id: 'adaptive_persistence',
    success: true,
  },
  // study_item_ids: Q06/Q14/Q21 all list this event; construct_id
  // intentionally left unset — see report. success: true — this event is
  // logged only as part of the same "Apply revised repair sequence
  // (success path)" option as repair_strategy_revision above (see
  // getPromptOptions() 'systemsRepairFailure' case), per
  // docs/game/rooms/02-systems-repair-room.md Valid choices/actions.
  repair_completed: {
    study_item_ids: ['Q06', 'Q14', 'Q21'],
    success: true,
  },

  // Engineer Hub — only events explicitly listed under Q09 in
  // MASTER_33_ALIGNMENT.md's "Events" column get a mapping;
  // engineer_clarification_requested and
  // engineer_report_submitted_unprepared have no Events-column listing
  // for any Q-row and are intentionally left unmapped — see report.
  engineer_report_opened: {
    study_item_ids: ['Q09'],
    construct_id: 'responsibility',
  },
  engineer_evidence_reviewed: {
    study_item_ids: ['Q09'],
    construct_id: 'responsibility',
  },
  engineer_report_submitted_prepared: {
    study_item_ids: ['Q09'],
    construct_id: 'responsibility',
  },

  // Hazard Control Room (MASTER_33_ALIGNMENT.md Q12/Q27/Q31).
  hazard_warning_seen: {
    study_item_ids: ['Q12'],
    construct_id: 'prudence',
  },
  // Q12 (prudence) and Q27 (inappropriate persistence) both list this
  // event; construct_id intentionally left unset — see report.
  hazard_info_checked: {
    study_item_ids: ['Q12', 'Q27'],
  },
  // study_item_ids: Q31's Events column in MASTER_33_ALIGNMENT.md lists
  // this exact event_type. construct_id: event-schema.md's naming
  // conventions define `goal_time_exploratory` for Goal-Time constructs
  // flagged optional/exploratory, matching Q31's Construct/Proxy-status
  // columns. No source assigns a success value to this exact event_type
  // (only the sibling hazard_reckless_continue has a documented example) —
  // success is intentionally omitted rather than extended by symmetry.
  hazard_informed_continue: {
    study_item_ids: ['Q31'],
    construct_id: 'goal_time_exploratory',
  },
  // study_item_ids/construct_id/success match the worked example in
  // event-schema.md §6 verbatim for this exact event_type;
  // metadata.info_checked_before_continuing is computed live from
  // localState.hazardInfoChecked (see getCanonicalEventContext), not
  // hardcoded here.
  hazard_reckless_continue: {
    study_item_ids: ['Q12', 'Q27', 'Q31'],
    construct_id: 'inappropriate_persistence',
    success: null,
  },
};

// Structural guarantee for the shared source of truth: no room module can
// mutate any canonical mapping (entry objects and study_item_ids arrays
// included) at runtime.
for (const entry of Object.values(CANONICAL_EVENT_CONTEXT)) {
  if (entry?.study_item_ids !== undefined) {
    Object.freeze(entry.study_item_ids);
  }

  Object.freeze(entry);
}
Object.freeze(CANONICAL_EVENT_CONTEXT);
