# event-schema.md

Canonical event schema for Remote Outpost Assessment, per V3 Section 3.2, plus a
reconciliation table from the current prototype's event names to the canonical
V3 names.

**Canonical decision**: the V3 contract is the target design. Current prototype
event names (from the MPS vertical-slice, `src/scenes/Main.tsx` and
`src/data/researchInteractions.ts`) are legacy/current aliases to be migrated
toward the canonical names below — the canonical names are never bent to match
the prototype.

## 1. Canonical `RawGameEvent` payload (target shape)

Every meaningful player action must be able to carry this full payload when
logged through `ResearchRuntime`/`EventLogger` (V3 Section 3.2):

| Field             | Type                     | Notes                                                                                                                                       |
| ----------------- | ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------- |
| `session_id`      | string                   | Internal logging session identifier.                                                                                                        |
| `participant_id`  | string                   | From Qualtrics launch params (`SessionState`/`QualtricsBridge`).                                                                            |
| `game_session_id` | string                   | From Qualtrics launch params.                                                                                                               |
| `condition`       | string                   | Study condition/arm.                                                                                                                        |
| `game_version`    | string                   | Build/version tag.                                                                                                                          |
| `timestamp_ms`    | number                   | `Date.now()` at log time.                                                                                                                   |
| `elapsed_seconds` | number                   | Seconds since session start.                                                                                                                |
| `room_id`         | string                   | Canonical room id (see naming conventions below).                                                                                           |
| `task_id`         | string                   | Canonical task/mini-game id within the room.                                                                                                |
| `study_item_ids`  | string[]                 | Q-item id(s) this event maps to (e.g. `["Q13","Q22"]`); empty for control/usability events.                                                 |
| `construct_id`    | string                   | Construct label (e.g. `adaptive_persistence`, `inappropriate_persistence`, `organisation`); matches `docs/research/MASTER_33_ALIGNMENT.md`. |
| `event_type`      | string                   | Canonical event name (see per-room tables below).                                                                                           |
| `object_id`       | string                   | Interactable/object id (matches `researchInteractions` entries).                                                                            |
| `choice_value`    | string \| number \| null | The specific choice/option selected, when applicable.                                                                                       |
| `attempt_number`  | number                   | 1-indexed attempt counter for retryable tasks.                                                                                              |
| `previous_state`  | string                   | State before this event, when applicable.                                                                                                   |
| `new_state`       | string                   | State after this event, when applicable.                                                                                                    |
| `success`         | boolean \| null          | Whether the action succeeded, when applicable.                                                                                              |
| `x`               | number                   | Player x position at log time.                                                                                                              |
| `y`               | number                   | Player y position at log time.                                                                                                              |
| `metadata`        | Record<string, unknown>  | Free-form extra context (e.g. `{ skipped: true }`, `{ code_attempted: "A17" }`).                                                            |

**Current implementation gap**: `src/systems/EventLogger.ts`'s `RawGameEvent`
interface only has `session_id, timestamp_ms, scene, episode, event_type,
object_id, x, y, state_before, state_after, score_delta`. It is missing
`participant_id`, `condition`, `game_version`, `elapsed_seconds`, `task_id`,
`study_item_ids`, `construct_id`, `choice_value`, `attempt_number`, `success`,
`metadata`, and uses `scene`/`state_before`/`state_after` where the canonical
schema uses `room_id`/`previous_state`/`new_state`. Closing this gap is
implementation work for a later beat (likely Beat 2, architecture
stabilisation) — this document records the target shape and the mapping so that
work is unambiguous when it happens. **No source code is changed by this beat.**

## 2. Naming conventions

- **`room_id`** — lowercase snake_case, one of: `dock_arrival`, `archive_room`,
  `systems_repair_room`, `engineer_hub`, `inventory_prep_room`,
  `hazard_control_room`, `optional_side_repair_bay`, `interruption_corridor`,
  `final_core_room`.
  - **`station_hub`** (additive, V1 slice Phase C) — the connecting
    navigation area between the Dock and the assessment rooms. **Not a V3
    assessment room and not Q-mapped**: it exists as control/usability data
    only, under the same labelling rule as the Dock (V3 §1 rule 1). Every
    `station_hub` event carries `study_item_ids: []` and no `construct_id`,
    is excluded from all construct scoring (no ScoringManager formula may
    reference a `station_hub` event name), and entering/re-entering the Hub
    never re-fires assessment-room completion or Dock baseline events.
    Hub event names (documented before/with the code that emits them):
    `station_hub_entered` (each entry into the Hub),
    `station_hub_status_board_viewed` (mission checklist board opened),
    `station_hub_sealed_door_attempted` (sealed bulkhead interaction;
    `metadata.door` carries the target room's `room_id`).
- **`task_id`** — lowercase snake_case, scoped to the room (e.g.
  `archive_code_entry`, `repair_sequence_selection`, `engineer_report_submission`).
- **`event_type`** — lowercase snake*case, `<room_prefix>*<verb_or_state>`(e.g.`archive_wrong_code`, `repair_manual_used`, `hazard_reckless_continue`). Prefer
  the exact names from V3 Section 4 (per room) / Section 5 (Q01-Q33 matrix) —
  do not invent new names for a concept V3 already names.
- **`construct_id`** — matches the construct column in
  `docs/research/MASTER_33_ALIGNMENT.md` (e.g. `organisation`, `productiveness`,
  `responsibility`, `prudence`, `adaptive_persistence`,
  `inappropriate_persistence`, `goal_time_exploratory`,
  `consistency_of_interest_exploratory`). Exploratory constructs carry the
  `_exploratory` suffix in `construct_id` as a code-level reminder of their
  proxy status.
- Raw event names are never reused across rooms for different meanings; if two
  rooms need conceptually similar events (e.g. "reviewed evidence/details before
  acting"), give them room-prefixed distinct names rather than sharing one name.

## 3. Do not discard raw event logs

`EventLogger` must remain **append-only** for the duration of a session.
`ScoringManager.computeSummary()` and `QualtricsBridge.buildReturnUrl()` must
only ever _read_ from the raw event list to derive summary variables — never
mutate, filter-in-place, or truncate it. `window.researchRuntime.exportEventsJSON()`
must always be able to export the complete, untouched raw log for the session.
This rule is already satisfied by the current implementation (`EventLogger.log`
only pushes; `computeSummary` takes `events` as a read-only input) and must stay
true through every future beat.

## 4. Current-prototype-to-canonical alias tables (per room)

Status legend: **exact** = current name already matches canonical name;
**rename** = same concept, different string, needs a 1:1 rename;
**legacy-only** = current event has no canonical V3 equivalent, needs a decision
(fold into `metadata` on a canonical event, or propose a canonical addition);
**missing** = canonical event has no current equivalent at all (mechanic not yet
implemented).

### Dock / Arrival Bay (`dock_arrival`)

| Canonical (V3)               | Current prototype              | Status                | Notes                                                                                                                                                                                                                                                                                |
| ---------------------------- | ------------------------------ | --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `dock_started`               | `dock_tutorial_opened`         | rename                | Current fires on station prompt open, not room/session entry.                                                                                                                                                                                                                        |
| `movement_instruction_shown` | —                              | missing               |                                                                                                                                                                                                                                                                                      |
| `first_movement`             | `dock_movement_practiced`      | rename                | Only fires if player picks the "practice movement" option, not on first actual movement.                                                                                                                                                                                             |
| `first_interaction`          | `dock_instruction_followed`    | legacy-only           | Approx overlap only; not a true first-interaction marker.                                                                                                                                                                                                                            |
| `tutorial_help_shown`        | `dock_control_familiarisation` | rename                | Canonical emission wired to the DockScene idle watcher, which is **disabled** pending the user-supplied idle threshold/definition (open parameter).                                                                                                                                  |
| `tutorial_completed`         | `dock_tutorial_completed`      | exact                 | Phase B: canonical `tutorial_completed` now also emitted additively on every completion path, carrying `metadata.skipped: true` (skip) or `metadata.path: "reviewed" \| "practiced"` per the fold recommendations below; legacy events unchanged.                                    |
| `control_error_count`        | —                              | implemented (Phase B) | Emitted once at tutorial completion by DockScene; **payload placement**: the aggregate count is carried in `metadata.count` (the contracts define the event name but not field placement — this line is that additive clarification). Counts out-of-range SPACE presses in the Dock. |
| `baseline_idle_seconds`      | —                              | missing (blocked)     | Registered in CANONICAL_EVENT_CONTEXT but **not emitted**: the idle definition/threshold is not specified in any authoritative doc and awaits a user decision (approved plan §12). `DataQualityTracker` tracks focus-loss, not baseline idle specifically.                           |
| —                            | `dock_tutorial_skipped`        | legacy-only           | Recommend: fold into `tutorial_completed` with `metadata.skipped = true`.                                                                                                                                                                                                            |
| —                            | `dock_instruction_shortcut`    | legacy-only           | Recommend: deprecate, redundant with `dock_tutorial_skipped`.                                                                                                                                                                                                                        |
| —                            | `dock_controls_reviewed`       | legacy-only           | Recommend: fold into `tutorial_completed` with `metadata.path = "reviewed"`.                                                                                                                                                                                                         |

### Archive Room (`archive_room`)

| Canonical (V3)                     | Current prototype                  | Status  | Notes                                         |
| ---------------------------------- | ---------------------------------- | ------- | --------------------------------------------- |
| `archive_room_entered`             | —                                  | missing |                                               |
| `archive_terminal_opened`          | —                                  | missing |                                               |
| `archive_code_entered`             | `archive_attempt`                  | rename  |                                               |
| `archive_wrong_code`               | `archive_wrong_code`               | exact   |                                               |
| `archive_feedback_shown`           | —                                  | missing | Current only logs feedback _used_, not shown. |
| `archive_feedback_used`            | `archive_feedback_used`            | exact   |                                               |
| `archive_log_compared`             | —                                  | missing |                                               |
| `archive_strategy_revision`        | `archive_strategy_revision`        | exact   |                                               |
| `archive_same_wrong_code_repeated` | `archive_same_wrong_code_repeated` | exact   |                                               |
| `archive_abandoned`                | —                                  | missing |                                               |
| `archive_returned_after_failure`   | —                                  | missing |                                               |
| `archive_completed`                | `archive_completed`                | exact   |                                               |

Archive has the strongest current alignment (5 exact matches) — consistent with
the contract's note that Archive is "already partly implemented."

### Systems Repair Room (`systems_repair_room`)

| Canonical (V3)                  | Current prototype               | Status            | Notes                                                                                                                                                        |
| ------------------------------- | ------------------------------- | ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `repair_room_entered`           | —                               | exact (Wave 1A)   | Emitted by RepairScene on every entry (Archive precedent).                                                                                                   |
| `repair_panel_opened`           | —                               | exact (Wave 1A)   | Emitted when the repair panel prompt opens (archive_terminal_opened precedent).                                                                              |
| `task_started`                  | —                               | missing (blocked) | **Documentation conflict, never guessed**: V3 §5 lists it under Q05 and Q15; MASTER_33_ALIGNMENT.md lists it under Q05 only. Needs a user/source resolution. |
| `repair_sequence_submitted`     | `repair_attempt`                | exact (additive)  | Canonical emitted additively alongside the unchanged legacy `repair_attempt` on both sequence submissions (archive_code_entered precedent).                  |
| `repair_failed`                 | `repair_failed`                 | exact             |                                                                                                                                                              |
| `repair_manual_opened`          | —                               | exact (Wave 1A)   | Emitted by the new repair manual station (distinct object; archiveLogShelves precedent).                                                                     |
| `manual_page_reviewed`          | —                               | exact (Wave 1A)   | Emitted with `repair_manual_opened` — the station displays the manual page content on interaction, so open + review co-occur.                                |
| `repair_manual_used`            | `repair_manual_used`            | exact             | Legacy panel option unchanged.                                                                                                                               |
| `repair_strategy_revision`      | `repair_strategy_revision`      | exact             |                                                                                                                                                              |
| `repair_same_sequence_repeated` | `repair_same_sequence_repeated` | exact             |                                                                                                                                                              |
| `repair_abandoned`              | —                               | exact (Wave 1A)   | Q24; construct_id deliberately unset (F1 precedent). Fires on exit after failure with the repair incomplete.                                                 |
| `repair_returned_after_failure` | —                               | exact (Wave 1A)   | Q24+Q25; construct_id deliberately unset. Fires on re-entry after such an exit while still incomplete.                                                       |
| `repair_completed`              | `repair_completed`              | exact             |                                                                                                                                                              |

Repair also has strong alignment (5 exact matches) — consistent with the
contract's "strong current implemented core" note. **Wave 1A: the room is
ported to a connected RoomScene (`?scene=repair`, Hub door open) with all
canonical events except the blocked `task_started` emitted additively; the
prototype station is unchanged.** `objective_completed` (legacy, spans
Archive+Repair) now also fires in the connected world, once per session when
both rooms complete, with the prototype's archive-terminal payload context.

### Engineer Hub (`engineer_hub`)

| Canonical (V3)                         | Current prototype                      | Status          | Notes                                                                                                                                                                                                                  |
| -------------------------------------- | -------------------------------------- | --------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `engineer_hub_entered`                 | —                                      | exact (Wave 1A) | Emitted by EngineerScene on every entry (unmapped — no Events-column listing).                                                                                                                                         |
| `engineer_report_opened`               | `engineer_report_opened`               | exact           |                                                                                                                                                                                                                        |
| `engineer_evidence_reviewed`           | `engineer_evidence_reviewed`           | exact           |                                                                                                                                                                                                                        |
| `engineer_clarification_requested`     | `engineer_clarification_requested`     | exact           |                                                                                                                                                                                                                        |
| `engineer_report_submitted_prepared`   | `engineer_report_submitted_prepared`   | exact           |                                                                                                                                                                                                                        |
| `engineer_report_submitted_unprepared` | `engineer_report_submitted_unprepared` | exact           |                                                                                                                                                                                                                        |
| `engineer_report_accuracy_scored`      | —                                      | missing         |                                                                                                                                                                                                                        |
| `engineer_supervision_assigned`        | —                                      | exact (Wave 1A) | Duty offer shown after any report submission (chained prompt stage). Unmapped (no Events-column listing).                                                                                                              |
| `engineer_supervision_accepted`        | —                                      | exact (Wave 1A) | Q10, responsibility. Records `relay_supervision` in SessionState accepted_duties + active_objectives.                                                                                                                  |
| `engineer_supervision_declined`        | —                                      | exact (Wave 1A) | Records skipped_duties; declining is a valid choice, never a penalty. Unmapped.                                                                                                                                        |
| `engineer_supervision_completed`       | —                                      | missing         | Deferred to the Final Core beat (contract: follow-through checked "at Final Core or related station point").                                                                                                           |
| `engineer_supervision_skipped`         | —                                      | missing         | Deferred with the above.                                                                                                                                                                                               |
| `accepted_duty_unresolved`             | —                                      | missing         | Deferred to the Final Core beat (reads SessionState accepted_duties vs completion).                                                                                                                                    |
| —                                      | `engineer_report_submitted_supervised` | legacy-only     | No canonical "supervised" report type; closest is engaging `engineer_supervision_accepted`, but current usage conflates "asked for clarification" with "accepted a duty." Needs a design decision, not a blind rename. |
| —                                      | `engineer_responsibility_adaptive`     | legacy-only     | Derived-style label logged as a raw event; recommend deriving this from raw events instead (see scoring-plan.md).                                                                                                      |
| —                                      | `engineer_responsibility_shortcut`     | legacy-only     | Same concern as above.                                                                                                                                                                                                 |

5 exact matches on the report-submission path, but the entire accepted-duty /
supervision follow-through mechanic (Q10's core task) is currently
**unimplemented**, not just misnamed.

### Inventory / Preparation Room (`inventory_prep_room`)

| Canonical (V3)                       | Current prototype                 | Status          | Notes                                                                                                                                                                                                        |
| ------------------------------------ | --------------------------------- | --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `inventory_room_entered`             | —                                 | exact (Wave 1A) | Emitted by InventoryScene on every entry.                                                                                                                                                                    |
| `inventory_checklist_opened`         | `inventory_prep_opened`           | exact (Wave 1A) | **Emission placement**: fires on the "Open the checklist..." option (with legacy `inventory_checklist_used`), NOT on prompt open — the mechanical rename would credit Q01 checklist use to shortcut players. |
| `inventory_item_sorted_correct`      | —                                 | missing         | Needs a per-item mini-game (task-design decision, not in the audit-first port).                                                                                                                              |
| `inventory_item_misplaced`           | —                                 | missing         | Same.                                                                                                                                                                                                        |
| `inventory_sequence_followed`        | `inventory_systematic_prep`       | exact (Wave 1A) | Canonical emitted additively alongside the unchanged legacy name.                                                                                                                                            |
| `inventory_sequence_completed`       | —                                 | missing         | Needs a per-item mini-game.                                                                                                                                                                                  |
| `inventory_verification_skipped`     | —                                 | exact (Wave 1A) | Shortcut path (skips by meaning) + the new verification stage's plausible skip option.                                                                                                                       |
| `inventory_verified_complete`        | `inventory_kit_verified`          | exact (Wave 1A) | Additive alongside legacy on sort-and-verify; sole event on the new verification stage's check option.                                                                                                       |
| `correct_tool_selected`              | `inventory_required_tools_packed` | exact (Wave 1A) | Additive alongside legacy on the checklist option.                                                                                                                                                           |
| `wrong_tool_selected`                | —                                 | missing         | Needs a per-item mini-game.                                                                                                                                                                                  |
| `prepared_tool_used`                 | —                                 | missing         | Belongs to a later cross-room mechanic.                                                                                                                                                                      |
| `readiness_verified`                 | `inventory_kit_verified`          | missing         | Not matrix-listed; no distinct action exists — deliberately unemitted rather than double-logged with `inventory_verified_complete` from one click.                                                           |
| `missing_item`                       | `inventory_required_item_missed`  | exact (Wave 1A) | Additive alongside legacy on the shortcut path. Unmapped (not matrix-listed).                                                                                                                                |
| `workspace_tidy_confirmed`           | `inventory_workspace_sorted`      | exact (Wave 1A) | Additive alongside legacy; also the new cleanup stage's sort option.                                                                                                                                         |
| `workspace_left_disordered`          | `inventory_disorganized_action`   | exact (Wave 1A) | Additive alongside legacy; also the new cleanup stage's leave option.                                                                                                                                        |
| `cleanup_completed`                  | `inventory_cleanup_completed`     | exact (Wave 1A) | Additive alongside legacy (prefix differs only).                                                                                                                                                             |
| `final_core_missing_item_flagged`    | —                                 | missing         | SessionState source now exists (`prepared_items` lacks `field_kit`); emission belongs to the Final Core beat.                                                                                                |
| `final_core_workspace_issue_flagged` | —                                 | missing         | SessionState source now exists (`workspace_status = disordered`); emission belongs to the Final Core beat.                                                                                                   |
| —                                    | `inventory_prep_shortcut`         | legacy-only     | Kept verbatim on the shortcut path (audit-first port).                                                                                                                                                       |

Zero exact string matches — this room needs the most event-name rework of any
room, though the underlying shortcut-vs-systematic-vs-cleanup mechanic (Q01-Q04,
Q30) conceptually exists.

### Hazard Control Room (`hazard_control_room`)

| Canonical (V3)             | Current prototype          | Status      | Notes                                                                                                                                                                                                                                                                                                                                                     |
| -------------------------- | -------------------------- | ----------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `hazard_room_entered`      | —                          | missing     |                                                                                                                                                                                                                                                                                                                                                           |
| `hazard_warning_seen`      | `hazard_warning_seen`      | exact       |                                                                                                                                                                                                                                                                                                                                                           |
| `hazard_info_checked`      | `hazard_info_checked`      | exact       |                                                                                                                                                                                                                                                                                                                                                           |
| `hazard_informed_continue` | `hazard_informed_continue` | exact       |                                                                                                                                                                                                                                                                                                                                                           |
| `hazard_reckless_continue` | `hazard_reckless_continue` | exact       |                                                                                                                                                                                                                                                                                                                                                           |
| `hazard_issue_created`     | —                          | missing     |                                                                                                                                                                                                                                                                                                                                                           |
| `hazard_issue_resolved`    | —                          | missing     |                                                                                                                                                                                                                                                                                                                                                           |
| `final_hazard_issue`       | —                          | missing     | Cross-room propagation to Final Core not implemented.                                                                                                                                                                                                                                                                                                     |
| —                          | `hazard_avoidance`         | legacy-only | Third choice ("avoid uncertain route") has no canonical equivalent — V3's room task only describes informed-continue vs. reckless-continue. Recommend either propose a canonical `hazard_route_avoided` addition, or fold under `hazard_info_checked` with `metadata.outcome = "avoided"`. Flag for user/psychometric-task-design decision before Beat 8. |

Strongest alignment of any room (4 exact matches on the core decision path).

### Optional Side Repair Bay (`optional_side_repair_bay`)

| Canonical (V3)                      | Current prototype                        | Status          | Notes                                                                                                                                                                                              |
| ----------------------------------- | ---------------------------------------- | --------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `side_repair_discovered`            | —                                        | exact (Wave 1A) | Once per session on first room entry (discovery is a first-encounter fact).                                                                                                                        |
| `stabiliser_option_offered`         | `side_repair_opened`                     | exact (Wave 1A) | Canonical emitted additively alongside the unchanged legacy name on every offer.                                                                                                                   |
| `stabiliser_accepted`               | —                                        | exact (Wave 1A) | Both start paths (legacy conflates accept+start; canonical decomposition emitted additively).                                                                                                      |
| `side_repair_accepted`              | `side_repair_started`                    | exact (Wave 1A) | Additive alongside the unchanged legacy name on both start paths.                                                                                                                                  |
| `side_repair_first_step`            | —                                        | exact (Wave 1A) | Both start paths.                                                                                                                                                                                  |
| `side_repair_step_completed`        | —                                        | missing         | Needs a multi-step mini-game (step-count granularity is a task-design decision, not in the audit-first port).                                                                                      |
| `side_repair_abandoned`             | `side_repair_ignored`                    | legacy-only     | Unchanged: never-accepted branch keeps legacy `side_repair_ignored` only; the canonical name is not matrix-listed and its semantics stay flagged for decision.                                     |
| `side_repair_abandoned_after_start` | `side_repair_abandoned_after_difficulty` | exact (Wave 1A) | Additive alongside the unchanged legacy name.                                                                                                                                                      |
| `side_repair_deferred`              | —                                        | exact (Wave 1A) | NEW 4th option (appended; legacy order untouched). Deferring does not close the offer — reopenable, distinct from abandonment (confound control).                                                  |
| `side_repair_completed`             | `side_repair_completed`                  | exact           | Wave 1A: gains its CANONICAL_EVENT_CONTEXT mapping (Q07/Q16/Q32, construct unset) — intentionally changes prototype payloads; re-baseline the Phase-0 fixture field in the next verification pass. |
| `final_core_stability_bonus`        | —                                        | missing         | Emission belongs to the Final Core beat (reads side_repair_status = completed).                                                                                                                    |
| `final_bonus_unlocked`              | —                                        | exact (Wave 1A) | Emitted on the completion path (Room 6 raw event; Q32).                                                                                                                                            |
| —                                   | `side_repair_low_effort`                 | legacy-only     | Derived-style label; recommend deriving instead of logging directly.                                                                                                                               |
| —                                   | `side_repair_productive_persistence`     | legacy-only     | Derived-style label; recommend deriving instead of logging directly.                                                                                                                               |

Only 1 exact match. The defer/abandon confound-control distinction that
`psychometric-task-design` explicitly calls out as required is currently absent.

### Interruption Corridor (`interruption_corridor`)

| Canonical (V3)                      | Current prototype                        | Status            | Notes                                                                                                                |
| ----------------------------------- | ---------------------------------------- | ----------------- | -------------------------------------------------------------------------------------------------------------------- |
| `interruption_corridor_entered`     | —                                        | exact (Wave 1A)   | Emitted by InterruptionScene on every entry (unmapped).                                                              |
| `objective_active`                  | —                                        | exact (Wave 1A)   | State-grounded: once per session, only while SessionState.active_objectives is non-empty (e.g. accepted relay duty). |
| `interruption_received`             | `interruption_opened`                    | exact (Wave 1A)   | Canonical emitted additively alongside the unchanged legacy name on prompt open.                                     |
| `competing_task_viewed`             | —                                        | missing           | Open mapping decision vs legacy `interruption_alert_acknowledged` — deliberately unemitted until resolved.           |
| `new_goal_offered`                  | —                                        | missing           | Needs real objective mechanics, not a fiction-only assertion.                                                        |
| `switched_task`                     | `interruption_new_task_chosen`           | exact (Wave 1A)   | Additive alongside the unchanged legacy name.                                                                        |
| `goal_switch_accepted`              | —                                        | missing           | Needs real objective mechanics.                                                                                      |
| `return_to_unfinished_task`         | —                                        | missing           | Needs a real return-route mechanic (Q15) — a dialogue assertion is not a return act.                                 |
| `returned_to_original_task`         | `interruption_returned_to_original_task` | exact (Wave 1A)   | Canonical string emitted additively alongside the (differently-named) legacy event.                                  |
| `prior_goal_completed`              | —                                        | missing           | Needs real objective mechanics.                                                                                      |
| `prior_goal_abandoned`              | `interruption_previous_task_abandoned`   | exact (Wave 1A)   | Additive alongside the unchanged legacy name.                                                                        |
| `task_completed_after_interruption` | —                                        | missing           | Needs real objective mechanics.                                                                                      |
| `final_unresolved_due_to_nonreturn` | —                                        | missing           | Emission belongs to the Final Core beat (reads interruption_status = switched_away).                                 |
| `task_avoidance`                    | `interruption_alert_ignored`             | exact (Wave 1A)   | Room-doc-directed mapping: additive alongside the unchanged legacy name on the ignore path.                          |
| `excessive_idle_after_instruction`  | —                                        | missing (blocked) | Registered, never emitted: awaits the user-owned idle definition/threshold (Dock precedent).                         |
| —                                   | `interruption_focus_lost`                | legacy-only       | Derived-style label logged as raw event; recommend deriving instead (see scoring-plan.md §"raw vs. derived" note).   |
| —                                   | `interruption_alert_acknowledged`        | legacy-only       | Approx overlap with `competing_task_viewed`; needs explicit mapping decision.                                        |
| —                                   | `interruption_focus_maintained`          | legacy-only       | Derived-style label; recommend deriving instead.                                                                     |
| —                                   | `interruption_single_task_focus`         | legacy-only       | Overlaps with `task_avoidance`'s "ignore" branch; needs de-duplication.                                              |
| —                                   | `interruption_possible_rigidity`         | legacy-only       | Derived-style label; recommend deriving instead.                                                                     |

Only 1 exact match. Several current events assert an _interpretation_
(`focus_lost`, `focus_maintained`, `possible_rigidity`) rather than logging the
raw behaviour — flagged in scoring-plan.md as a raw-vs-derived design smell to
fix when this room is rebuilt.

### Final Core Room (`final_core_room`)

| Canonical (V3)                       | Current prototype                      | Status          | Notes                                                                                                                                                |
| ------------------------------------ | -------------------------------------- | --------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| `final_core_entered`                 | `final_core_opened`                    | exact (Wave 1A) | **Emission placement**: fires on every room entry; legacy `final_core_opened` stays on prompt open (entered ≠ opened — checklist_opened precedent).  |
| `final_core_status_reviewed`         | `final_core_status_reviewed`           | exact           | Wave 1A: gains its mapping (Q11, responsibility) — intentional prototype-payload change; re-baseline the fixture field with `side_repair_completed`. |
| `final_core_missing_item_flagged`    | —                                      | exact (Wave 1A) | System flag at room entry (once): prepared_items lacks `field_kit`. Independent of player choice.                                                    |
| `final_core_workspace_issue_flagged` | —                                      | exact (Wave 1A) | System flag at room entry (once): workspace_status = disordered.                                                                                     |
| `final_core_blocker_shown`           | —                                      | exact (Wave 1A) | Prompt open while outstanding issues exist — the flags list in the prompt body is the explicit blocker display (Q28).                                |
| `unresolved_issue_reviewed`          | —                                      | exact (Wave 1A) | Review options (2/3) while outstanding issues exist.                                                                                                 |
| `issue_resolution_attempted`         | `final_core_remaining_issues_resolved` | exact (Wave 1A) | Emitted (with `final_core_issue_resolved`) beside the unchanged legacy event on the resolve path, only when real issues exist.                       |
| `final_core_issue_resolved`          | `final_core_remaining_issues_resolved` | exact (Wave 1A) | Same condition as above.                                                                                                                             |
| `final_core_force_continue`          | —                                      | exact (Wave 1A) | NEW 4th option (appended; legacy order untouched), available only while the blocker is shown.                                                        |
| `final_core_rushed`                  | —                                      | exact (Wave 1A) | Additive beside legacy `final_core_quick_sync` (option 1 is fast AND unreviewed).                                                                    |
| `final_core_completed`               | —                                      | exact (Wave 1A) | Additive on every completion path beside the unchanged legacy quality-tier events.                                                                   |
| `final_core_stability_bonus`         | —                                      | exact (Wave 1A) | System flag at room entry (once): side_repair_status = completed (Q29).                                                                              |
| `final_quality_score_computed`       | —                                      | missing         | Emission point lives in ScoringManager (qualtrics-logging-review gate) — outside Wave 1A scope.                                                      |
| `final_summary_previewed`            | —                                      | missing         | Same.                                                                                                                                                |
| `qualtrics_return_previewed`         | —                                      | missing         | Same — `QualtricsBridge.buildReturnUrl()` is not itself logged yet.                                                                                  |
| —                                    | `final_core_quick_sync`                | legacy-only     | Recommend: rename to a `final_core_completed` variant with `metadata.quality = "low"`.                                                               |
| —                                    | `final_core_unresolved_issues_ignored` | legacy-only     | Approx overlap with `final_core_force_continue`/`blocker_ignored`; needs explicit mapping decision.                                                  |
| —                                    | `final_core_low_quality_completion`    | legacy-only     | Derived-style completion-tier event; recommend consolidating into `final_core_completed` + `metadata.quality`.                                       |
| —                                    | `final_core_prior_results_integrated`  | legacy-only     | Recommend: fold into `unresolved_issue_reviewed`/`final_core_status_reviewed` metadata.                                                              |
| —                                    | `final_core_structured_completion`     | legacy-only     | Same consolidation recommendation as `final_core_low_quality_completion`.                                                                            |
| —                                    | `final_core_high_quality_completion`   | legacy-only     | Same consolidation recommendation.                                                                                                                   |

Only 1 exact match. Final Core currently cannot reflect any cross-room state
(missing items, workspace disorder, unresolved duty, hazard consequences)
because the upstream propagation events are missing in every source room, and
`SessionState` doesn't yet hold the Section 3.1 mission-state fields needed to
carry that state between rooms.

## 5. Migration notes

- This reconciliation is a **planning artifact only** for Beat 1 — no event
  names are renamed in `src/` during this beat.
- When a room is rebuilt (its own beat, one room at a time per `room-builder`),
  migrate that room's events to the canonical names in the tables above as part
  of that room's implementation pass, and update this document's status column
  from `rename`/`missing`/`legacy-only` to `exact` as each is resolved.
- `legacy-only` rows generally fall into two buckets and should be resolved
  accordingly:
  1. **Derived-style events** (e.g. `interruption_focus_lost`,
     `engineer_responsibility_adaptive`, `side_repair_productive_persistence`) —
     these assert an interpretation at log time. Prefer removing them as raw
     events and instead deriving the equivalent signal in `ScoringManager` from
     the underlying raw behavioural events, consistent with the
     `qualtrics-logging-review` skill's raw-vs-summary separation rule.
  2. **Missing-branch events** (e.g. `hazard_avoidance`, `side_repair_deferred`'s
     current absence) — these represent a real player choice branch not covered
     by V3's exact event list. Flag to the user / `psychometric-task-design` for
     an explicit decision: either propose a canonical addition to V3 (external
     document change, out of scope for this repo) or fold the branch into an
     existing canonical event's `metadata`.
- `missing` rows split into "just needs a new logging call" (low risk, e.g.
  `archive_room_entered`) versus "mechanic doesn't exist yet" (needs real
  implementation work, e.g. Engineer Hub's entire supervision/duty system, or
  any cross-room state propagation into Final Core). Room docs under
  `docs/game/rooms/` flag which is which per room.

## 6. Examples of valid canonical events

```json
{
  "session_id": "session-abc123",
  "participant_id": "P042",
  "game_session_id": "game-session-xyz789",
  "condition": "default",
  "game_version": "0.1.0",
  "timestamp_ms": 1752150000000,
  "elapsed_seconds": 184,
  "room_id": "archive_room",
  "task_id": "archive_code_entry",
  "study_item_ids": ["Q13", "Q22", "Q26"],
  "construct_id": "adaptive_persistence",
  "event_type": "archive_strategy_revision",
  "object_id": "archive_access_terminal",
  "choice_value": "revised_query",
  "attempt_number": 3,
  "previous_state": "wrong_code_shown",
  "new_state": "revised_query_submitted",
  "success": true,
  "x": 412,
  "y": 268,
  "metadata": {}
}
```

```json
{
  "session_id": "session-abc123",
  "participant_id": "P042",
  "game_session_id": "game-session-xyz789",
  "condition": "default",
  "game_version": "0.1.0",
  "timestamp_ms": 1752150240000,
  "elapsed_seconds": 424,
  "room_id": "hazard_control_room",
  "task_id": "hazard_route_decision",
  "study_item_ids": ["Q12", "Q27", "Q31"],
  "construct_id": "inappropriate_persistence",
  "event_type": "hazard_reckless_continue",
  "object_id": "hazard_uncertainty_warning",
  "choice_value": "continue_without_checking",
  "attempt_number": 1,
  "previous_state": "warning_shown",
  "new_state": "route_taken",
  "success": null,
  "x": 588,
  "y": 210,
  "metadata": { "info_checked_before_continuing": false }
}
```
