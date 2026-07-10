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

| Canonical (V3)                  | Current prototype               | Status  | Notes                                           |
| ------------------------------- | ------------------------------- | ------- | ----------------------------------------------- |
| `repair_room_entered`           | —                               | missing |                                                 |
| `repair_panel_opened`           | —                               | missing |                                                 |
| `task_started`                  | —                               | missing |                                                 |
| `repair_sequence_submitted`     | `repair_attempt`                | rename  |                                                 |
| `repair_failed`                 | `repair_failed`                 | exact   |                                                 |
| `repair_manual_opened`          | —                               | missing | Current jumps straight to `repair_manual_used`. |
| `manual_page_reviewed`          | —                               | missing |                                                 |
| `repair_manual_used`            | `repair_manual_used`            | exact   |                                                 |
| `repair_strategy_revision`      | `repair_strategy_revision`      | exact   |                                                 |
| `repair_same_sequence_repeated` | `repair_same_sequence_repeated` | exact   |                                                 |
| `repair_abandoned`              | —                               | missing |                                                 |
| `repair_returned_after_failure` | —                               | missing |                                                 |
| `repair_completed`              | `repair_completed`              | exact   |                                                 |

Repair also has strong alignment (5 exact matches) — consistent with the
contract's "strong current implemented core" note.

### Engineer Hub (`engineer_hub`)

| Canonical (V3)                         | Current prototype                      | Status      | Notes                                                                                                                                                                                                                  |
| -------------------------------------- | -------------------------------------- | ----------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `engineer_hub_entered`                 | —                                      | missing     |                                                                                                                                                                                                                        |
| `engineer_report_opened`               | `engineer_report_opened`               | exact       |                                                                                                                                                                                                                        |
| `engineer_evidence_reviewed`           | `engineer_evidence_reviewed`           | exact       |                                                                                                                                                                                                                        |
| `engineer_clarification_requested`     | `engineer_clarification_requested`     | exact       |                                                                                                                                                                                                                        |
| `engineer_report_submitted_prepared`   | `engineer_report_submitted_prepared`   | exact       |                                                                                                                                                                                                                        |
| `engineer_report_submitted_unprepared` | `engineer_report_submitted_unprepared` | exact       |                                                                                                                                                                                                                        |
| `engineer_report_accuracy_scored`      | —                                      | missing     |                                                                                                                                                                                                                        |
| `engineer_supervision_assigned`        | —                                      | missing     | Duty-board mechanic not implemented.                                                                                                                                                                                   |
| `engineer_supervision_accepted`        | —                                      | missing     |                                                                                                                                                                                                                        |
| `engineer_supervision_declined`        | —                                      | missing     |                                                                                                                                                                                                                        |
| `engineer_supervision_completed`       | —                                      | missing     |                                                                                                                                                                                                                        |
| `engineer_supervision_skipped`         | —                                      | missing     |                                                                                                                                                                                                                        |
| `accepted_duty_unresolved`             | —                                      | missing     |                                                                                                                                                                                                                        |
| —                                      | `engineer_report_submitted_supervised` | legacy-only | No canonical "supervised" report type; closest is engaging `engineer_supervision_accepted`, but current usage conflates "asked for clarification" with "accepted a duty." Needs a design decision, not a blind rename. |
| —                                      | `engineer_responsibility_adaptive`     | legacy-only | Derived-style label logged as a raw event; recommend deriving this from raw events instead (see scoring-plan.md).                                                                                                      |
| —                                      | `engineer_responsibility_shortcut`     | legacy-only | Same concern as above.                                                                                                                                                                                                 |

5 exact matches on the report-submission path, but the entire accepted-duty /
supervision follow-through mechanic (Q10's core task) is currently
**unimplemented**, not just misnamed.

### Inventory / Preparation Room (`inventory_prep_room`)

| Canonical (V3)                       | Current prototype                 | Status      | Notes                                                                                                                             |
| ------------------------------------ | --------------------------------- | ----------- | --------------------------------------------------------------------------------------------------------------------------------- |
| `inventory_room_entered`             | —                                 | missing     |                                                                                                                                   |
| `inventory_checklist_opened`         | `inventory_prep_opened`           | rename      |                                                                                                                                   |
| `inventory_item_sorted_correct`      | —                                 | missing     |                                                                                                                                   |
| `inventory_item_misplaced`           | —                                 | missing     |                                                                                                                                   |
| `inventory_sequence_followed`        | `inventory_systematic_prep`       | rename      |                                                                                                                                   |
| `inventory_sequence_completed`       | —                                 | missing     |                                                                                                                                   |
| `inventory_verification_skipped`     | —                                 | missing     |                                                                                                                                   |
| `inventory_verified_complete`        | `inventory_kit_verified`          | rename      |                                                                                                                                   |
| `correct_tool_selected`              | `inventory_required_tools_packed` | rename      |                                                                                                                                   |
| `wrong_tool_selected`                | —                                 | missing     |                                                                                                                                   |
| `prepared_tool_used`                 | —                                 | missing     |                                                                                                                                   |
| `readiness_verified`                 | `inventory_kit_verified`          | rename      | Same current event as above; canonical splits verified-complete vs. readiness-verified, current doesn't.                          |
| `missing_item`                       | `inventory_required_item_missed`  | rename      |                                                                                                                                   |
| `workspace_tidy_confirmed`           | `inventory_workspace_sorted`      | rename      |                                                                                                                                   |
| `workspace_left_disordered`          | `inventory_disorganized_action`   | rename      |                                                                                                                                   |
| `cleanup_completed`                  | `inventory_cleanup_completed`     | rename      | Prefix differs only.                                                                                                              |
| `final_core_missing_item_flagged`    | —                                 | missing     | Cross-room propagation not implemented.                                                                                           |
| `final_core_workspace_issue_flagged` | —                                 | missing     | Cross-room propagation not implemented.                                                                                           |
| —                                    | `inventory_prep_shortcut`         | legacy-only | Recommend: fold into `inventory_checklist_opened`/`inventory_sequence_followed` absence, or keep as `metadata.path = "shortcut"`. |

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

| Canonical (V3)                      | Current prototype                        | Status           | Notes                                                                                                                  |
| ----------------------------------- | ---------------------------------------- | ---------------- | ---------------------------------------------------------------------------------------------------------------------- |
| `side_repair_discovered`            | —                                        | missing          |                                                                                                                        |
| `stabiliser_option_offered`         | `side_repair_opened`                     | rename (partial) |                                                                                                                        |
| `stabiliser_accepted`               | —                                        | missing          |                                                                                                                        |
| `side_repair_accepted`              | `side_repair_started`                    | rename           |                                                                                                                        |
| `side_repair_first_step`            | —                                        | missing          |                                                                                                                        |
| `side_repair_step_completed`        | —                                        | missing          |                                                                                                                        |
| `side_repair_abandoned`             | `side_repair_ignored`                    | legacy-only      | Concept overlap ("skip it") but canonical distinguishes never-accepted vs. accepted-then-abandoned; current conflates. |
| `side_repair_abandoned_after_start` | `side_repair_abandoned_after_difficulty` | rename           |                                                                                                                        |
| `side_repair_deferred`              | —                                        | missing          | Defer-vs-abandon distinction (explicitly required by V3's confound-control note) is not implemented.                   |
| `side_repair_completed`             | `side_repair_completed`                  | exact            |                                                                                                                        |
| `final_core_stability_bonus`        | —                                        | missing          |                                                                                                                        |
| `final_bonus_unlocked`              | —                                        | missing          |                                                                                                                        |
| —                                   | `side_repair_low_effort`                 | legacy-only      | Derived-style label; recommend deriving instead of logging directly.                                                   |
| —                                   | `side_repair_productive_persistence`     | legacy-only      | Derived-style label; recommend deriving instead of logging directly.                                                   |

Only 1 exact match. The defer/abandon confound-control distinction that
`psychometric-task-design` explicitly calls out as required is currently absent.

### Interruption Corridor (`interruption_corridor`)

| Canonical (V3)                      | Current prototype                        | Status          | Notes                                                                                                              |
| ----------------------------------- | ---------------------------------------- | --------------- | ------------------------------------------------------------------------------------------------------------------ |
| `interruption_corridor_entered`     | —                                        | missing         |                                                                                                                    |
| `objective_active`                  | —                                        | missing         |                                                                                                                    |
| `interruption_received`             | `interruption_opened`                    | rename          |                                                                                                                    |
| `competing_task_viewed`             | —                                        | missing         |                                                                                                                    |
| `new_goal_offered`                  | —                                        | missing         |                                                                                                                    |
| `switched_task`                     | `interruption_new_task_chosen`           | rename          |                                                                                                                    |
| `goal_switch_accepted`              | —                                        | missing         |                                                                                                                    |
| `return_to_unfinished_task`         | —                                        | missing         |                                                                                                                    |
| `returned_to_original_task`         | `interruption_returned_to_original_task` | exact           |                                                                                                                    |
| `prior_goal_completed`              | —                                        | missing         |                                                                                                                    |
| `prior_goal_abandoned`              | `interruption_previous_task_abandoned`   | rename          |                                                                                                                    |
| `task_completed_after_interruption` | —                                        | missing         |                                                                                                                    |
| `final_unresolved_due_to_nonreturn` | —                                        | missing         |                                                                                                                    |
| `task_avoidance`                    | `interruption_alert_ignored`             | rename (approx) |                                                                                                                    |
| `excessive_idle_after_instruction`  | —                                        | missing         |                                                                                                                    |
| —                                   | `interruption_focus_lost`                | legacy-only     | Derived-style label logged as raw event; recommend deriving instead (see scoring-plan.md §"raw vs. derived" note). |
| —                                   | `interruption_alert_acknowledged`        | legacy-only     | Approx overlap with `competing_task_viewed`; needs explicit mapping decision.                                      |
| —                                   | `interruption_focus_maintained`          | legacy-only     | Derived-style label; recommend deriving instead.                                                                   |
| —                                   | `interruption_single_task_focus`         | legacy-only     | Overlaps with `task_avoidance`'s "ignore" branch; needs de-duplication.                                            |
| —                                   | `interruption_possible_rigidity`         | legacy-only     | Derived-style label; recommend deriving instead.                                                                   |

Only 1 exact match. Several current events assert an _interpretation_
(`focus_lost`, `focus_maintained`, `possible_rigidity`) rather than logging the
raw behaviour — flagged in scoring-plan.md as a raw-vs-derived design smell to
fix when this room is rebuilt.

### Final Core Room (`final_core_room`)

| Canonical (V3)                       | Current prototype                      | Status           | Notes                                                                                                          |
| ------------------------------------ | -------------------------------------- | ---------------- | -------------------------------------------------------------------------------------------------------------- |
| `final_core_entered`                 | `final_core_opened`                    | rename           |                                                                                                                |
| `final_core_status_reviewed`         | `final_core_status_reviewed`           | exact            |                                                                                                                |
| `final_core_missing_item_flagged`    | —                                      | missing          | Depends on Inventory room propagation (also missing there).                                                    |
| `final_core_workspace_issue_flagged` | —                                      | missing          | Depends on Inventory room propagation (also missing there).                                                    |
| `final_core_blocker_shown`           | —                                      | missing          |                                                                                                                |
| `unresolved_issue_reviewed`          | —                                      | missing          |                                                                                                                |
| `issue_resolution_attempted`         | `final_core_remaining_issues_resolved` | rename (partial) | Canonical separates attempt vs. resolved; current only has resolved.                                           |
| `final_core_issue_resolved`          | `final_core_remaining_issues_resolved` | rename           |                                                                                                                |
| `final_core_force_continue`          | —                                      | missing          |                                                                                                                |
| `final_core_rushed`                  | —                                      | missing          |                                                                                                                |
| `final_core_completed`               | —                                      | missing          | No single "completed" event; current has three quality-tier completion events instead (see below).             |
| `final_core_stability_bonus`         | —                                      | missing          | Depends on Side Repair propagation (also missing there).                                                       |
| `final_quality_score_computed`       | —                                      | missing          |                                                                                                                |
| `final_summary_previewed`            | —                                      | missing          |                                                                                                                |
| `qualtrics_return_previewed`         | —                                      | missing          | `QualtricsBridge.buildReturnUrl()` exists but is not itself logged as an event.                                |
| —                                    | `final_core_quick_sync`                | legacy-only      | Recommend: rename to a `final_core_completed` variant with `metadata.quality = "low"`.                         |
| —                                    | `final_core_unresolved_issues_ignored` | legacy-only      | Approx overlap with `final_core_force_continue`/`blocker_ignored`; needs explicit mapping decision.            |
| —                                    | `final_core_low_quality_completion`    | legacy-only      | Derived-style completion-tier event; recommend consolidating into `final_core_completed` + `metadata.quality`. |
| —                                    | `final_core_prior_results_integrated`  | legacy-only      | Recommend: fold into `unresolved_issue_reviewed`/`final_core_status_reviewed` metadata.                        |
| —                                    | `final_core_structured_completion`     | legacy-only      | Same consolidation recommendation as `final_core_low_quality_completion`.                                      |
| —                                    | `final_core_high_quality_completion`   | legacy-only      | Same consolidation recommendation.                                                                             |

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
