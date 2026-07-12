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
 *
 * Wave 1A (U4) note: entries now also cover canonical V3 event names for
 * stations whose rooms are not yet built. Registration here is NOT
 * emission — nothing fires until the room's own beat logs it (precedent:
 * baseline_idle_seconds, registered but blocked). Two matrix events are
 * deliberately NOT registered because the authoritative documents disagree
 * (rule above: never guess):
 * - `task_started` — V3 §5 lists it under Q05 and Q15; the
 *   MASTER_33_ALIGNMENT.md mirror lists it under Q05 only.
 * - `objective_completed` — V3 §5 lists it under Q06; the mirror's Q06 row
 *   omits it (the legacy prototype event keeps logging unmapped, as today).
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

  // Station Hub (Phase C) — control/usability navigation area, NOT a V3
  // assessment room; documented additively in event-schema.md §2. Never
  // Q-mapped, never construct-scored (governance: approved plan §11).
  station_hub_entered: { study_item_ids: [] },
  station_hub_status_board_viewed: { study_item_ids: [] },
  station_hub_sealed_door_attempted: { study_item_ids: [] },

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
  // Phase D (research-data-reviewer finding F1): these two events ARE
  // listed in MASTER_33_ALIGNMENT.md's Events columns — Q24 lists both
  // (line "Q24 | PDD / not discouraged by setbacks"), Q25 lists
  // archive_returned_after_failure — so study_item_ids follow the matrix
  // per this map's population rule. construct_id is intentionally left
  // unset for both: Q24/Q25 sit in the adaptive-persistence family, but
  // abandonment is disengagement evidence, not adaptive persistence — the
  // construct assignment is a psychometric decision routed to the user/
  // psychometric-task-design, not auto-assigned (approved plan §13.1b).
  // No source assigns a success value to either event; omitted.
  archive_abandoned: {
    study_item_ids: ['Q24'],
  },
  archive_returned_after_failure: {
    study_item_ids: ['Q24', 'Q25'],
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

  // ————————————————————————————————————————————————————————————————————
  // Wave 1A (U4): canonical V3 event registrations for the seven remaining
  // stations, populated strictly from MASTER_33_ALIGNMENT.md's Events
  // columns (study_item_ids = union of listing rows). construct_id is set
  // only where every listing row shares one documented construct from
  // event-schema.md §2's vocabulary; dual-construct listings and
  // valence-mismatched events are left unset with the source comment
  // (committed precedents: archive_completed, hazard_info_checked,
  // archive_abandoned). No success values: no source documents one for any
  // event below. Registration ≠ emission — each event first fires in its
  // room's own build beat.
  // ————————————————————————————————————————————————————————————————————

  // Systems Repair Room — Wave 1A additions.
  // Q22 (PDD) lists manual_page_reviewed; adaptive_persistence per the
  // committed repair_manual_used precedent (Q14/Q21/Q22).
  manual_page_reviewed: {
    study_item_ids: ['Q22'],
    construct_id: 'adaptive_persistence',
  },
  // Q24 lists repair_abandoned; Q24+Q25 list repair_returned_after_failure.
  // construct_id intentionally unset — identical open psychometric decision
  // as archive_abandoned/archive_returned_after_failure (research-data-
  // reviewer F1): abandonment is disengagement evidence, never auto-assigned.
  repair_abandoned: {
    study_item_ids: ['Q24'],
  },
  repair_returned_after_failure: {
    study_item_ids: ['Q24', 'Q25'],
  },

  // Engineer Hub — Q10 (responsibility) Events column lists exactly these
  // three; the other supervision events (assigned/declined/skipped) and
  // engineer_hub_entered/engineer_report_accuracy_scored have no Events-
  // column listing and stay unmapped (engineer_clarification_requested
  // precedent).
  engineer_supervision_accepted: {
    study_item_ids: ['Q10'],
    construct_id: 'responsibility',
  },
  engineer_supervision_completed: {
    study_item_ids: ['Q10'],
    construct_id: 'responsibility',
  },
  accepted_duty_unresolved: {
    study_item_ids: ['Q10'],
    construct_id: 'responsibility',
  },

  // Inventory / Preparation Room — Q01-Q04 are organisation rows.
  inventory_checklist_opened: {
    study_item_ids: ['Q01'],
    construct_id: 'organisation',
  },
  inventory_item_sorted_correct: {
    study_item_ids: ['Q01'],
    construct_id: 'organisation',
  },
  inventory_sequence_followed: {
    study_item_ids: ['Q01'],
    construct_id: 'organisation',
  },
  inventory_item_misplaced: {
    study_item_ids: ['Q02'],
    construct_id: 'organisation',
  },
  // Q02 (organisation) and Q30 (Goal-Time exploratory) both list this
  // event; construct_id intentionally unset (hazard_info_checked precedent).
  inventory_verification_skipped: {
    study_item_ids: ['Q02', 'Q30'],
  },
  correct_tool_selected: {
    study_item_ids: ['Q03'],
    construct_id: 'organisation',
  },
  wrong_tool_selected: {
    study_item_ids: ['Q03'],
    construct_id: 'organisation',
  },
  prepared_tool_used: {
    study_item_ids: ['Q03'],
    construct_id: 'organisation',
  },
  workspace_tidy_confirmed: {
    study_item_ids: ['Q03'],
    construct_id: 'organisation',
  },
  workspace_left_disordered: {
    study_item_ids: ['Q04'],
    construct_id: 'organisation',
  },
  cleanup_completed: {
    study_item_ids: ['Q04'],
    construct_id: 'organisation',
  },
  // Q30 — optional/exploratory Goal-Time proxy (labelled per scoring-plan §8).
  inventory_verified_complete: {
    study_item_ids: ['Q30'],
    construct_id: 'goal_time_exploratory',
  },

  // Optional Side Repair Bay. Multi-row listings (Q07 productiveness,
  // Q16 Grit-S PE/adaptive family, Q20/Q32 exploratory) leave construct_id
  // unset per the dual-listing precedent.
  side_repair_accepted: {
    study_item_ids: ['Q07', 'Q16', 'Q20'],
  },
  side_repair_step_completed: {
    study_item_ids: ['Q07', 'Q16'],
  },
  // Registered in the Side Repair Bay build beat (deferred out of U4): the
  // prototype emits this exact string, so this mapping intentionally
  // changes live prototype payloads — matrix-grounded (Q07/Q16/Q32) and
  // additive, but the Phase-0 baseline fixture comparison must be
  // re-baselined for this field in the next runtime-verification pass
  // (recorded in ACTIVE-EXPANSION-STATE.md).
  side_repair_completed: {
    study_item_ids: ['Q07', 'Q16', 'Q32'],
  },
  // Q20 (Grit-S CI, weak/exploratory) single-row listings.
  side_repair_first_step: {
    study_item_ids: ['Q20'],
    construct_id: 'consistency_of_interest_exploratory',
  },
  side_repair_abandoned_after_start: {
    study_item_ids: ['Q20'],
    construct_id: 'consistency_of_interest_exploratory',
  },
  // Q29 (Goal-Time exploratory) single-row listings.
  stabiliser_option_offered: {
    study_item_ids: ['Q29'],
    construct_id: 'goal_time_exploratory',
  },
  stabiliser_accepted: {
    study_item_ids: ['Q29'],
    construct_id: 'goal_time_exploratory',
  },
  // Q32 (Goal-Time exploratory).
  final_bonus_unlocked: {
    study_item_ids: ['Q32'],
    construct_id: 'goal_time_exploratory',
  },

  // Interruption Corridor. Q08 = productiveness; Q15 = Grit-S PE (adaptive
  // family per the committed archive/repair precedent); Q17-Q19 = Grit-S CI
  // weak/exploratory.
  task_avoidance: {
    study_item_ids: ['Q08'],
    construct_id: 'productiveness',
  },
  // Registered but NOT emitted until the user supplies the idle
  // definition/threshold (baseline_idle_seconds precedent — open parameter,
  // never chosen autonomously).
  excessive_idle_after_instruction: {
    study_item_ids: ['Q08'],
    construct_id: 'productiveness',
  },
  // Q15 (adaptive family) and Q17 (CI exploratory) both list
  // interruption_received; construct_id intentionally unset.
  interruption_received: {
    study_item_ids: ['Q15', 'Q17'],
  },
  return_to_unfinished_task: {
    study_item_ids: ['Q15'],
    construct_id: 'adaptive_persistence',
  },
  task_completed_after_interruption: {
    study_item_ids: ['Q15'],
    construct_id: 'adaptive_persistence',
  },
  competing_task_viewed: {
    study_item_ids: ['Q17'],
    construct_id: 'consistency_of_interest_exploratory',
  },
  switched_task: {
    study_item_ids: ['Q17'],
    construct_id: 'consistency_of_interest_exploratory',
  },
  returned_to_original_task: {
    study_item_ids: ['Q17'],
    construct_id: 'consistency_of_interest_exploratory',
  },
  objective_active: {
    study_item_ids: ['Q18'],
    construct_id: 'consistency_of_interest_exploratory',
  },
  final_unresolved_due_to_nonreturn: {
    study_item_ids: ['Q18'],
    construct_id: 'consistency_of_interest_exploratory',
  },
  new_goal_offered: {
    study_item_ids: ['Q19'],
    construct_id: 'consistency_of_interest_exploratory',
  },
  goal_switch_accepted: {
    study_item_ids: ['Q19'],
    construct_id: 'consistency_of_interest_exploratory',
  },
  prior_goal_completed: {
    study_item_ids: ['Q19'],
    construct_id: 'consistency_of_interest_exploratory',
  },
  prior_goal_abandoned: {
    study_item_ids: ['Q19'],
    construct_id: 'consistency_of_interest_exploratory',
  },

  // Final Core Room. Q11 = responsibility; Q28 = inappropriate persistence
  // (maladaptive); Q33/Q29 = Goal-Time exploratory; Q02/Q04 = organisation
  // (cross-room flags fed by Inventory via SessionState).
  final_core_missing_item_flagged: {
    study_item_ids: ['Q02'],
    construct_id: 'organisation',
  },
  final_core_workspace_issue_flagged: {
    study_item_ids: ['Q04'],
    construct_id: 'organisation',
  },
  // Registered in the Final Core build beat (deferred out of U4): the
  // prototype emits this exact string, so this mapping intentionally
  // changes live prototype payloads — matrix-grounded (Q11,
  // responsibility) and additive; re-baseline the Phase-0 fixture field
  // in the next runtime-verification pass (with side_repair_completed).
  final_core_status_reviewed: {
    study_item_ids: ['Q11'],
    construct_id: 'responsibility',
  },
  unresolved_issue_reviewed: {
    study_item_ids: ['Q11'],
    construct_id: 'responsibility',
  },
  // Q11 (responsibility) and Q33 (Goal-Time exploratory) both list
  // final_core_rushed; construct_id intentionally unset.
  final_core_rushed: {
    study_item_ids: ['Q11', 'Q33'],
  },
  // hazard_warning_seen precedent: system-display event carries the single
  // listing row's construct.
  final_core_blocker_shown: {
    study_item_ids: ['Q28'],
    construct_id: 'inappropriate_persistence',
  },
  final_core_force_continue: {
    study_item_ids: ['Q28'],
    construct_id: 'inappropriate_persistence',
  },
  // Q28 lists issue_resolution_attempted, but attempting to RESOLVE an
  // issue is the adaptive alternative to forcing through it — assigning
  // inappropriate_persistence would invert the behaviour's valence.
  // construct_id intentionally unset; psychometric decision routed to the
  // user (archive_abandoned/F1 precedent for valence-mismatched listings).
  issue_resolution_attempted: {
    study_item_ids: ['Q28'],
  },
  final_core_issue_resolved: {
    study_item_ids: ['Q33'],
    construct_id: 'goal_time_exploratory',
  },
  // Q06 (productiveness) and Q33 (Goal-Time exploratory) both list
  // final_core_completed; construct_id intentionally unset
  // (archive_completed precedent).
  final_core_completed: {
    study_item_ids: ['Q06', 'Q33'],
  },
  // Q29 (Goal-Time exploratory) — emitted at Final Core, fed by the Side
  // Repair Bay outcome.
  final_core_stability_bonus: {
    study_item_ids: ['Q29'],
    construct_id: 'goal_time_exploratory',
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
