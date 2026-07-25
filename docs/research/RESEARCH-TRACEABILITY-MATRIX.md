# Research Traceability Matrix — Q01–Q33

Human-readable companion to the machine-validated matrix
`docs/research/research-traceability-matrix.json` (Sprint B Part 1,
2026-07-13; hand-authored emission statuses trued up against the live tree
2026-07-25, FABLE-NEXT-09 Phase 1). Where this file and the JSON disagree,
the JSON wins — it is validated against the live source tree on every run.

- **Regenerate mechanical sections**: `node scripts/validate-traceability-matrix.mjs --write`
- **Validate** (fails on any drift between the matrix, `CanonicalEventContext.ts`,
  `ScoringManager.ts`, scene sources, and the e2e specs):
  `node scripts/validate-traceability-matrix.mjs`

This document **identifies** gaps and inconsistencies; it resolves none of
them. Every scientific resolution stays user-owned (D2–D8 plus the items in
§6). Sources: `MASTER_33_ALIGNMENT.md`, `event-schema.md`, `scoring-plan.md`,
V3 contract §4–§6, `src/world/CanonicalEventContext.ts`,
`src/systems/ScoringManager.ts`, `WAVE1-USER-DECISION-BRIEF.md`, and the
verification evidence records listed in the JSON `sources.evidence`.

## 1. How a Q-item traces end to end

```
Q-item (Q01–Q33, MASTER_33_ALIGNMENT.md)
  → construct assignment (construct_id; unset where user ruling pending)
  → room + interaction source (src/scenes/*Scene.ts via stationRegistry)
  → canonical events (registered in CanonicalEventContext.ts with
    study_item_ids / construct_id / success) + required legacy events
    (emitted verbatim; alias tables in event-schema.md §4)
  → raw append-only event log (EventLogger; V3 §3.2 payload incl. metadata)
  → ScoringManager.computeSummary() event counts
  → GameSummaryVariables (59 fields)
  → QualtricsBridge.buildReturnUrl() — every summary field becomes a
    return_url query parameter
  → Playwright specs (e2e/*.spec.ts) + evidence records (docs/testing/**)
```

Per-event facts (registration values, emitting source files, ScoringManager
usage, spec references) live in the JSON `events` section — machine-derived,
never hand-edited. Per-variable event sources live in
`summary_variable_sources` (all 59 summary fields). Qualtrics launch/return
and SessionState mission-field contracts are in `qualtrics_contract`, with
the writers→readers matrix in `docs/architecture/CROSS-ROOM-INTEGRATION.md`.

## 2. Q01–Q33 status table

Legend — event suffixes: **✗** = mechanic not implemented (task-design
decision pending), **⛔** = deliberately blocked on a user decision,
**(untested)** = emitted but referenced by no Playwright spec, **∅** =
deliberately unemitted (would double-log). Operationalisation: _implemented_
= every listed event either emits or its absence is a ruled/documented state;
_partial_ = at least one listed event needs an unbuilt mechanic; _blocked_ =
nothing can emit until a user ruling.

| Q#  | Construct                           | Proxy                | Room(s)                                            | Events                                                                                                              | Status      | Decisions |
| --- | ----------------------------------- | -------------------- | -------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- | ----------- | --------- |
| Q01 | organisation                        | direct               | inventory_prep_room                                | inventory_checklist_opened<br>inventory_item_sorted_correct<br>inventory_sequence_followed                          | implemented | —         |
| Q02 | organisation                        | direct               | inventory_prep_room, final_core_room               | inventory_item_misplaced<br>inventory_verification_skipped<br>final_core_missing_item_flagged                       | implemented | —         |
| Q03 | organisation                        | direct               | inventory_prep_room                                | correct_tool_selected<br>wrong_tool_selected<br>prepared_tool_used ✗<br>workspace_tidy_confirmed                    | partial     | —         |
| Q04 | organisation                        | direct               | inventory_prep_room, final_core_room               | workspace_left_disordered<br>cleanup_completed<br>final_core_workspace_issue_flagged                                | implemented | —         |
| Q05 | productiveness                      | direct               | systems_repair_room, archive_room                  | task_started ⛔                                                                                                     | blocked     | D7        |
| Q06 | productiveness                      | direct               | systems_repair_room, archive_room, final_core_room | repair_completed<br>archive_completed<br>final_core_completed                                                       | implemented | —         |
| Q07 | productiveness                      | direct               | optional_side_repair_bay, systems_repair_room      | side_repair_accepted<br>side_repair_step_completed<br>side_repair_completed                                         | implemented | —         |
| Q08 | productiveness                      | direct               | interruption_corridor, systems_repair_room         | task_avoidance<br>excessive_idle_after_instruction ⛔                                                               | partial     | D3        |
| Q09 | responsibility                      | direct               | engineer_hub                                       | engineer_report_opened<br>engineer_evidence_reviewed<br>engineer_report_submitted_prepared                          | implemented | —         |
| Q10 | responsibility                      | direct               | engineer_hub, final_core_room                      | engineer_supervision_accepted<br>engineer_supervision_completed<br>accepted_duty_unresolved                         | implemented | —         |
| Q11 | responsibility                      | direct               | final_core_room, engineer_hub                      | final_core_status_reviewed<br>unresolved_issue_reviewed<br>final_core_rushed                                        | implemented | D2        |
| Q12 | prudence                            | direct               | hazard_control_room                                | hazard_warning_seen<br>hazard_info_checked<br>hazard_reckless_continue                                              | implemented | D2        |
| Q13 | adaptive_persistence                | direct               | archive_room                                       | archive_wrong_code<br>archive_feedback_used<br>archive_strategy_revision<br>archive_completed                       | implemented | —         |
| Q14 | adaptive_persistence                | direct               | systems_repair_room                                | repair_failed<br>repair_manual_used<br>repair_strategy_revision<br>repair_completed                                 | implemented | —         |
| Q15 | adaptive_persistence                | direct               | interruption_corridor, final_core_room             | interruption_received<br>return_to_unfinished_task<br>task_completed_after_interruption                             | implemented | —         |
| Q16 | adaptive_persistence                | direct               | optional_side_repair_bay                           | side_repair_accepted<br>side_repair_step_completed<br>side_repair_completed                                         | implemented | —         |
| Q17 | consistency_of_interest_exploratory | weak_exploratory     | interruption_corridor                              | interruption_received<br>competing_task_viewed ⛔<br>switched_task<br>returned_to_original_task                     | partial     | D6        |
| Q18 | consistency_of_interest_exploratory | weak_exploratory     | interruption_corridor, final_core_room             | objective_active<br>final_unresolved_due_to_nonreturn                                                               | implemented | —         |
| Q19 | consistency_of_interest_exploratory | weak_exploratory     | interruption_corridor                              | new_goal_offered<br>goal_switch_accepted<br>prior_goal_completed<br>prior_goal_abandoned                            | implemented | —         |
| Q20 | consistency_of_interest_exploratory | weak_exploratory     | optional_side_repair_bay, interruption_corridor    | side_repair_accepted<br>side_repair_first_step<br>side_repair_abandoned_after_start                                 | implemented | —         |
| Q21 | adaptive_persistence                | direct               | systems_repair_room                                | repair_failed<br>repair_manual_used<br>repair_strategy_revision<br>repair_completed                                 | implemented | —         |
| Q22 | adaptive_persistence                | direct               | archive_room, systems_repair_room                  | archive_feedback_used<br>repair_manual_used<br>manual_page_reviewed<br>archive_strategy_revision                    | implemented | D2        |
| Q23 | adaptive_persistence                | direct               | archive_room, systems_repair_room                  | archive_strategy_revision†<br>repair_strategy_revision                                                              | implemented | —         |
| Q24 | _unset (pending ruling)_            | direct               | archive_room, systems_repair_room                  | archive_abandoned<br>archive_returned_after_failure (untested)<br>repair_abandoned<br>repair_returned_after_failure | implemented | D4        |
| Q25 | _unset (pending ruling)_            | direct               | archive_room, systems_repair_room                  | archive_returned_after_failure (untested)<br>repair_returned_after_failure                                          | implemented | D4        |
| Q26 | inappropriate_persistence           | direct (maladaptive) | archive_room, systems_repair_room                  | archive_same_wrong_code_repeated<br>repair_same_sequence_repeated<br>archive_strategy_revision†                     | implemented | —         |
| Q27 | inappropriate_persistence           | direct (maladaptive) | hazard_control_room                                | hazard_info_checked<br>hazard_reckless_continue                                                                     | implemented | —         |
| Q28 | inappropriate_persistence           | direct (maladaptive) | final_core_room                                    | final_core_blocker_shown<br>final_core_force_continue<br>issue_resolution_attempted                                 | implemented | D2        |
| Q29 | goal_time_exploratory               | optional_exploratory | optional_side_repair_bay, final_core_room          | stabiliser_option_offered<br>stabiliser_accepted<br>final_core_stability_bonus                                      | implemented | —         |
| Q30 | goal_time_exploratory               | optional_exploratory | inventory_prep_room                                | inventory_verified_complete<br>inventory_verification_skipped                                                       | implemented | —         |
| Q31 | goal_time_exploratory               | optional_exploratory | hazard_control_room                                | hazard_informed_continue<br>hazard_reckless_continue                                                                | implemented | —         |
| Q32 | goal_time_exploratory               | optional_exploratory | optional_side_repair_bay                           | side_repair_completed<br>final_bonus_unlocked                                                                       | implemented | —         |
| Q33 | goal_time_exploratory               | optional_exploratory | final_core_room                                    | final_core_issue_resolved<br>final_core_rushed<br>final_core_completed                                              | implemented | —         |

† `archive_strategy_revision` appears on Q22/Q26 via its registration
(event-schema §6 worked example) and on Q23 via the MASTER_33 events column —
a catalogued source divergence (`known_listing_divergences`), not resolved
here. Item event lists take the union of both authoritative sources.

Construct labels for Q24/Q25 events are intentionally unset in
`CanonicalEventContext.ts` (F1 precedent) — a psychometric ruling (D4), not
an omission. Maladaptive constructs (Q26–Q28): higher = worse, never merged
with adaptive persistence. Exploratory proxies (Q17–Q20, Q29–Q33) must carry
exploratory labels wherever surfaced (labelling mechanism itself is D2
sub-item 4).

## 3. Questionnaire items without full game operationalisation

Identified only — resolutions are user-owned task-design or D-decisions.

| Q#      | Missing                                                                                                                                    | Blocked by                           |
| ------- | ------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------ |
| Q05     | `task_started` (entire item) + no initiation-latency capture anywhere                                                                      | **D7**                               |
| Q01     | — closed by FABLE-NEXT-02: per-item prep emits `inventory_item_sorted_correct` at each placement                                           | — (closed)                           |
| Q02     | — closed by FABLE-NEXT-02: `inventory_item_misplaced` emitted at the per-item misplacement act                                             | — (closed)                           |
| Q03     | `prepared_tool_used` — cross-room retrieval episode (`wrong_tool_selected` closed by FABLE-NEXT-02; emission moment fixed by NEXT-09-OD-3) | task-design (NEXT-09 Phase 2, gated) |
| Q07/Q16 | — closed by FABLE-NEXT-03: multi-step side repair emits `side_repair_step_completed` once per step                                         | — (closed)                           |
| Q08     | `excessive_idle_after_instruction`                                                                                                         | **D3**                               |
| Q15     | — closed by FABLE-NEXT-05: observed return act + post-interruption completion at the Relay Checkpoint (SA-9 co-fire ruling open)           | — (closed)                           |
| Q17     | `competing_task_viewed`                                                                                                                    | **D6**                               |
| Q19     | — closed by FABLE-NEXT-05: offer/commit/completion observed at real stations; `prior_goal_abandoned` moved to Final-Core-bound closure     | — (closed)                           |

## 4. Events without approved research mappings

Emitted events logging without `study_item_ids`/`construct_id` where the
mapping question is genuinely open (room-entry and Hub events are unmapped by
documented precedent and are not listed):

- `engineer_report_submitted_supervised` — **D5** (conflates clarification
  with duty acceptance).
- `interruption_alert_acknowledged` — **D6** (vs `competing_task_viewed`).
- `interruption_single_task_focus` — overlaps `task_avoidance` ignore branch;
  no decision recorded.
- `final_core_unresolved_issues_ignored` — overlaps
  `final_core_force_continue`; no decision recorded.
- `task_started` / `objective_completed` — unregistered because authoritative
  sources conflict (D7 / V3-vs-mirror Q06 row).
- `side_repair_abandoned` (canonical name) — not matrix-listed; semantics
  undecided (never-accepted branch keeps legacy `side_repair_ignored`).
- `engineer_report_accuracy_scored` — emitted (once per submission, at the
  record-card claim scored against live mission state; FABLE-NEXT-04/NEXT-08)
  but **deliberately unmapped raw telemetry**: the Q09 registration is
  withheld pending **SA-8**, so `report_accuracy_score` still has no approved
  source. Not in the JSON `events` universe (unregistered, not a
  ScoringManager input, not seeded) — seeding it is a validator change owned
  by a later approved pass, not by the Phase 1 docs truth-up.

## 5. Scoring terms without direct spec coverage

`ScoringManager.computeSummary()` inputs referenced by **no** Playwright spec
(machine-derived list `findings.scoring_terms_without_tested_sources`; these
feed summary variables that reach the Qualtrics return):

`archive_attempt`, `dock_control_familiarisation`,
`engineer_clarification_requested`, `engineer_report_submitted_supervised`,
`final_core_prior_results_integrated`, `final_core_structured_completion`,
`inventory_cleanup_completed`, `inventory_kit_verified`,
`inventory_workspace_sorted`, `side_repair_abandoned_after_difficulty`

The wider machine-derived list `findings.events_lacking_direct_test_coverage`
(17 events with code references and no spec references) adds:
`archive_log_compared`, `archive_returned_after_failure` (a **registered
Q24/Q25 event**), `dock_instruction_shortcut`, `final_core_opened`,
`station_hub_sealed_door_attempted`, `station_hub_status_board_viewed`,
`tutorial_help_shown` (wired-disabled, D3). These are Priority-C candidates
for the adversarial coverage plan.

## 6. Mapping inconsistencies (catalogued, unresolved)

1. `task_started`: V3 §5 lists Q05+Q15; MASTER_33 lists Q05 only (**D7**).
2. `objective_completed`: V3 §5 lists under Q06; MASTER_33 mirror omits it.
3. `archive_strategy_revision`: registration (Q13/Q22/Q26, worked example)
   vs MASTER_33 columns (Q13/Q23 rows) — see § 2 footnote.
4. `event-schema.md` §4 Archive table marks six events "missing"
   (`archive_room_entered`, `archive_terminal_opened`, `archive_code_entered`,
   `archive_feedback_shown`, `archive_abandoned`,
   `archive_returned_after_failure`) that ArchiveScene emits — stale status
   rows; documentation refresh owed, no code defect.
5. `MASTER_33_ALIGNMENT.md` Q10 note ("cross-room mechanic, currently
   unimplemented") and its closing implementation-status section predate
   Wave 1A — the duty mechanic and all eight rooms are implemented and
   runtime-verified.
6. `scoring-plan.md` §5 ("captured and then dropped") is stale — the three
   `data_quality_*` fields now flow through `ComputeSummaryInput`.
7. Inventory organization naming split: `organization_kit_verified` /
   `organization_cleanup_count` count only legacy option-3 names; the chained
   systematic path emits canonical names only (A4 observation; **D2** scope).

## 7. Blocked by user decisions (registry)

See `findings.blocked_by_user_decisions` in the JSON for the full text. In
brief: **D2** Beat-13 bundle (prudence-mixing fix, `final_core_force_continue`
4th term, `final_quality_score` shape, exploratory-label mechanism, naming
split, three scoring-layer emissions); **D3** idle family; **D4** Q24/Q25
construct; **D5**/**D6** legacy mappings; **D7** `task_started`; **D8** asset
dispositions (MAJOR: Dock decor-airlock `control_error_count` inflation);
**UD-HAZARD-CONSEQUENCE** `hazard_issue_created`/`hazard_issue_resolved`/
`final_hazard_issue` — `hazard_status` written and verified, consumed by
nothing.

## 8. Validation coverage

The validator enforces, on every run: exact agreement of every registration
(study_item_ids / construct_id / success) between the matrix and
`CanonicalEventContext.ts`; exact agreement of code/spec reference lists with
the live tree; bidirectional Q↔event linkage (modulo catalogued divergences);
summary-variable keys exactly matching `GameSummaryVariables`; every
summary-variable source being a real ScoringManager input; and freshness of
the two machine-derived findings lists. Hand-authored findings are validated
referentially (no dangling Q-ids or event names).
