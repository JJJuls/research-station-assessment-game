# Current Q01–Q33 Implementation Gap Audit

## 1. Document status

Evidence-based implementation-gap audit. **Documentation only** — this audit
changed no source code, no test, no event schema, no scoring plan, no ruling,
and resolved no scientific decision. It records findings; every open decision
stays with the research owner (`docs/ai/SCIENTIFIC-AUTHORITY-AND-OPEN-DECISIONS.md`
§11).

## 2. Audit date

2026-07-16.

## 3. Audited branch

`fable-autonomous-game-build-v1`.

## 4. Audited starting HEAD

`88a1635` (`docs(governance): align Claude workflow with final Q01-Q33
specification`). Working tree clean; sole untracked file
`claude-workflow-audit.txt` (obsolete pre-governance diagnostic output, not
used as authority by this audit).

## 5. Audit scope

- Alignment of the current Phaser game (`src/`), research systems
  (`src/systems/`, `src/world/CanonicalEventContext.ts`), approved event
  schema (`docs/research/event-schema.md`), approved scoring plan
  (`docs/research/scoring-plan.md`), room documentation
  (`docs/game/rooms/*.md`) and the actual browser-test suite (`e2e/`) against
  the final Q01–Q33 gamified measurement specification
  (`docs/scientific/Q01-Q33_GAMIFIED_MEASUREMENT_SPECIFICATION.md`).
- Establishes a development baseline for reaching a working participant-ready
  prototype within five days.
- Selects the first safely implementable unit (§20; operational detail in
  `docs/ai/NEXT-FABLE-IMPLEMENTATION-UNIT.md`).

## 6. Static-audit limitation statement

This is a **static** audit. No build, typecheck, lint, dev server, Playwright
run, participant bundle, or asset generation was executed. Statements about
test outcomes are sourced from **committed evidence** (gate documents,
evidence records, commit messages) and are labelled historical; existence of
a test file is never treated as proof it passes. Statements about runtime
behaviour rely on committed runtime-verification records at their recorded
commits, plus source inspection at `88a1635`.

## 7. Executive verdict

**The game world is built and technically stable, but it is not
participant-ready, and the gap is concentrated in (a) the decision-gated data
pipeline and (b) five Goal-Time/Q27 registrations that now conflict with the
approved measurement specification.**

1. **World**: all ten areas (Dock, Hub, eight assessment stations) exist as
   connected `RoomScene` subclasses with placeholder-first visuals, real door
   transitions, cross-room `SessionState` propagation into Final Core, and
   canonical event registration. Seven areas are WORKING, three PARTIAL
   (§10); none is ABSENT.
2. **Q-items**: 15 of 33 are ALIGNED for their intended current use, 11
   PARTIAL, **5 STALE** (Q27, Q29, Q30, Q31, Q33 — live registrations follow
   the superseded pre-specification rationale; every correction is gated on
   SA-1…SA-6), 2 BLOCKED (Q05 on D7; Q32 on SA-5) (§11–§12).
3. **Data foundation**: identity, launch parsing, append-only raw log,
   summary/raw separation and DEV/PROD separation are implemented and
   historically verified. **There is no production completion→return path, no
   raw-event export channel, no persistence (reload loses everything), no
   completion-status taxonomy, no event sequence numbers, and no
   schema/scoring version fields** — the previously catalogued P0 cluster,
   all decision-gated on INT-1/INT-2/INT-5/D2 (§14).
4. **Tests**: 55 tests / 23 spec files, keyboard-driven, asserting exact
   event payloads including frozen `study_item_ids`/`construct_id`. Last
   recorded full-suite result: **55/55, zero retries, at `1ad66c2`** (one
   docs-only commit behind this baseline). Not executed in this audit (§15).
5. **Five-day consequence**: the critical path to a participant-ready
   prototype is **research-owner rulings on INT-1/INT-2/INT-5 (plus
   INT-3/INT-4/INT-6 and D2) on day 1**, in parallel with the two genuinely
   unblocked technical units (§19). The SA-1…SA-6 conflicts do not block a
   participant-ready prototype technically — the affected items are
   exploratory/questionnaire-primary — but pilot data for Q27/Q29–Q33 game
   analogues remains scientifically compromised until ruled.

## 8. Authority hierarchy applied

Domain-specific hierarchy per `CLAUDE.md` and
`docs/ai/SCIENTIFIC-AUTHORITY-AND-OPEN-DECISIONS.md` §2:

| Domain                        | Authority applied                                                                                                                                                       |
| ----------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Questionnaire content         | Final 33-item battery (external, `Original_question_items`) — item wording never reproduced here beyond source-scale IDs                                                |
| Behavioural translation       | `docs/scientific/Q01-Q33_GAMIFIED_MEASUREMENT_SPECIFICATION.md` (2026-07-15)                                                                                            |
| Event names/payloads          | `docs/research/event-schema.md` (+ live registrations in `src/world/CanonicalEventContext.ts`, matrix-validated)                                                        |
| Scoring/formulas              | `docs/research/scoring-plan.md` (+ live `src/systems/ScoringManager.ts`)                                                                                                |
| Architecture/build discipline | `docs/ai/fable-claude-final-game-build-contract-v3.txt` (V3)                                                                                                            |
| Historical material           | Handoffs, prototype notes, `MASTER_33_ALIGNMENT.md` mechanic rationales for Q27/Q29–Q33 (superseded **as rationale**, still live **as registrations** until SA rulings) |

Candidate events/indicators in the specification are treated as **candidates
throughout**; nothing in this audit promotes one. Where a live registration
conflicts with the newer rationale, this audit records the conflict and the
SA-decision that owns it — it changes nothing.

## 9. Repository and implementation overview

- Stack: Phaser 3.90 + TypeScript + Vite; scenes in `src/scenes/`, shared
  room machinery in `src/world/RoomScene.ts` (proximity stations, SPACE
  prompt, deterministic 1–N option renderer, chained prompt stages,
  door transitions).
- Research systems (all present, none bypassed):
  - `src/systems/EventLogger.ts` — append-only in-memory raw log; hybrid
    legacy+canonical `RawGameEvent` (`EventLogger.ts:1-32`); `log()` only
    pushes (`:37-39`); `clear()` exists but has **no caller** in `src/`.
  - `src/systems/SessionState.ts` — identity from URL params with UUID
    fallbacks (`:44-56`); V3 §3.1 mission state (`:15-28`) with per-room
    writer methods.
  - `src/systems/ResearchRuntime.ts` — session context is authoritative on
    every event (`:91-105`); DEV-only `window.researchRuntime` 7-method debug
    API (`:189-208`).
  - `src/systems/ScoringManager.ts` — pure `computeSummary()` producing a
    59-field `GameSummaryVariables` (`:5-65`, `:75-224`); no global score;
    adaptive and inappropriate persistence kept separate (`:111-117`).
  - `src/systems/QualtricsBridge.ts` — 5-param launch parsing (`:14-22`);
    `buildReturnUrl()` (`:28-46`), **DEV-only caller** (P0-1).
  - `src/systems/DataQualityTracker.ts` — focus-loss covariates;
    `recordTechnicalError()` (`:52`) has **zero callers** (P2-13).
  - `src/world/CanonicalEventContext.ts` — frozen registration map
    (`study_item_ids`/`construct_id`/`success`) for canonical events, the
    single scientific-context source shared by all rooms.
- Routing: `src/world/SceneRouter.ts` (default start = Dock, `:30-31`),
  `src/world/stationRegistry.ts` (all eight stations have `sceneKey` set —
  every Hub door is open). `?scene=prototype` retains the legacy
  `src/scenes/Main.tsx` prototype (evidence only; not the participant path).
- No persistence, no network, no postMessage anywhere in `src/` (repo grep;
  corroborated by `docs/ai/OPUS-PRE-PILOT-PRIVACY-SECURITY-GATE.md` §5).

## 10. Current world and room inventory

Area-level status meanings per the audit brief (WORKING / PARTIAL /
PLACEHOLDER / STALE / ABSENT). "WORKING" asserts the substantive intended
area and core task flow exist in current code — **not** that it is fully
scientifically aligned or currently re-verified.

### 10.1 Dock / Arrival (`dock_arrival`) — WORKING

- Scene: `src/scenes/DockScene.ts`. NPC/system: Arrival Terminal (Station
  AI); movement marker; Hub door.
- Task: movement to highlighted marker → terminal check-in → 3-option
  tutorial prompt (skip / review / practice) (`DockScene.ts:188-233`).
- Events: canonical `dock_started`, `movement_instruction_shown`,
  `first_movement`, `first_interaction`, `tutorial_completed` (+fold
  metadata), `control_error_count` (in `metadata.count`,
  `DockScene.ts:247-251`) additive beside legacy `dock_*` events. All
  `study_item_ids: []` (control-only).
- Blocked pieces: `baseline_idle_seconds` and `tutorial_help_shown` idle
  watcher wired but **disabled** (`DOCK_IDLE_HELP_THRESHOLD_MS = null`,
  `DockScene.ts:18`) — open decision **D3**.
- SessionState: `completed_rooms['dock_arrival']`. Scoring: `control_*`
  fields only. Tests: `movement_and_first_interaction.spec.ts`,
  `state_session_continuity.spec.ts`, journeys.
- Evidence for status: full flow driven in historically green suite;
  control-only mapping matches V3 §4 Room 0.
- Primary gap: D3 idle family disabled; `control_error_count` per-visit
  lifetime semantics are a recorded user-owned observation.

### 10.2 Station Hub (`station_hub`) — WORKING

- Scene: `src/scenes/HubScene.ts`. Registry-driven eight-door ring (all
  open), Dock door, Status Board station.
- Events: `station_hub_entered` (per entry), `station_hub_status_board_viewed`,
  `station_hub_sealed_door_attempted` (currently unreachable — no sealed
  doors remain). All control-only (`study_item_ids: []`), excluded from
  scoring by schema rule (event-schema.md §2).
- Tests: `connected_world_smoke.spec.ts`,
  `adversarial_status_board_display.spec.ts` (board text asserted
  byte-for-byte against `getMissionState()`).
- Primary gap: none material; ADV-5 navigation was flake-prone until the
  position-synced driver landed at `1ad66c2`.

### 10.3 Archive (`archive_room`) — WORKING

- Scene: `src/scenes/ArchiveScene.ts`. Terminal + Log Shelves; Hub door.
- Task: scripted deterministic first failure (code A17) → feedback →
  revised query completes (`ArchiveScene.ts:152-205`). Same-wrong-code
  repeat detection (`:167-180`); leave-after-failure → `archive_abandoned`;
  re-entry → `archive_returned_after_failure` (module-scope session state,
  `:12-16`).
- Approved emitted events: `archive_room_entered`, `archive_terminal_opened`,
  `archive_code_entered`, `archive_wrong_code`, `archive_feedback_shown`,
  `archive_feedback_used`, `archive_log_compared`, `archive_strategy_revision`,
  `archive_same_wrong_code_repeated`, `archive_abandoned`,
  `archive_returned_after_failure`, `archive_completed` (+ legacy
  `archive_attempt`). Note: event-schema.md §4 still marks six of these
  "missing" — **stale doc rows**, catalogued in
  `RESEARCH-TRACEABILITY-MATRIX.md` §6.4 and D2 pack §4; not a code gap.
- SessionState: `completed_rooms`; feeds `objective_completed` parity event.
- Scoring: `blind_retry_count`, `strategy_revision_count`,
  `game_difficulty_persistence`, `failure_adaptation_index` terms.
- Tests: `archive_room_logging.spec.ts` (2),
  `adversarial_archive_abandon_return.spec.ts`, journeys.
- Primary gap: single-cycle simplification (one revised query, no graded
  difficulty); `archive_returned_after_failure` emitted but untested
  (matrix §5).

### 10.4 Systems Repair (`systems_repair_room`) — WORKING

- Scene: `src/scenes/RepairScene.ts`. Repair Panel + Repair Manual station.
- Task: deterministic default-sequence failure → manual → revised sequence
  completes; repeat detection; abandon/return pair via shared
  `roomTaskState` factory (`src/world/roomTaskState.ts:65-130`).
- Approved emitted events: `repair_room_entered`, `repair_panel_opened`,
  `repair_sequence_submitted`, `repair_failed`, `repair_manual_opened`,
  `manual_page_reviewed`, `repair_manual_used`, `repair_strategy_revision`,
  `repair_same_sequence_repeated`, `repair_abandoned`,
  `repair_returned_after_failure`, `repair_completed`.
- Blocked piece: `task_started` deliberately unemitted/unregistered — **D7**
  (V3 §5 lists Q05+Q15; MASTER_33 lists Q05 only).
- Tests: `repair_room_logging.spec.ts` (4, incl. `objective_completed`
  once-only parity), journeys.
- Primary gap: Q05 initiation-latency capture absent entirely (blocked D7 +
  no latency plumbing anywhere — scoring-plan §2 `task_initiation_latency`
  "missing").

### 10.5 Engineer Hub (`engineer_hub`) — WORKING

- Scene: `src/scenes/EngineerScene.ts`. Engineer Kai at report console.
- Task: 3 report options (quick-from-memory / review-evidence /
  clarify-first), each chaining into the relay-supervision duty offer
  (accept/decline) (`EngineerScene.ts:119-216`). Duty recorded in
  `SessionState.accepted_duties` + `active_objectives`; follow-through
  checked at Final Core (`FinalCoreScene.ts:243-257`, `:309-321`).
- Approved emitted events: `engineer_hub_entered`, `engineer_report_opened`,
  `engineer_evidence_reviewed`, `engineer_clarification_requested`,
  `engineer_report_submitted_prepared`/`_unprepared`,
  `engineer_supervision_assigned`/`_accepted`/`_declined`; at Final Core:
  `engineer_supervision_completed`, `accepted_duty_unresolved`.
- Legacy-only events still emitted: `engineer_report_submitted_supervised`
  (**D5**), derived-style `engineer_responsibility_adaptive`/`_shortcut`
  (scoring-plan §9 raw-vs-derived smell).
- Missing: `engineer_report_accuracy_scored` and any report-accuracy
  evaluation (`report_accuracy_score` "missing" in scoring-plan §2);
  `engineer_supervision_skipped` (no formal skip action — documented).
- Tests: `engineer_hub_logging.spec.ts` (2), `final_core_summary.spec.ts`
  (duty follow-through), journeys.
- Primary gap: no report-accuracy mechanism (Q09 outcome side); D5 mapping.

### 10.6 Inventory / Preparation (`inventory_prep_room`) — PARTIAL

- Scene: `src/scenes/InventoryScene.ts`. Quartermaster Console.
- Task: 3 legacy options (shortcut / checklist-systematic /
  sort-and-verify), systematic path chains into verification stage
  (run / skip) then cleanup stage (sort / leave)
  (`InventoryScene.ts:124-263`).
- Approved emitted events: `inventory_room_entered`,
  `inventory_checklist_opened` (on the checklist **option**, documented
  placement), `inventory_sequence_followed`, `inventory_verified_complete`,
  `inventory_verification_skipped`, `correct_tool_selected`, `missing_item`,
  `workspace_tidy_confirmed`, `workspace_left_disordered`,
  `cleanup_completed` (+ legacy aliases).
- Missing mechanics (events registered or schema-listed but unemittable):
  `inventory_item_sorted_correct`, `inventory_item_misplaced`,
  `wrong_tool_selected`, `prepared_tool_used`, `inventory_sequence_completed`,
  `readiness_verified` — **no per-item sorting/placement mini-game exists**;
  the room is a choice-prompt with asserted outcomes.
- SessionState: `prepared_items` (`field_kit`), `workspace_status`.
- Scoring: `organization_*` fields; naming split (legacy option-3 names vs
  canonical chained-stage names) is a recorded D2-scope observation
  (matrix §6.7).
- Tests: `inventory_prep_logging.spec.ts` (3), journeys.
- Evidence for PARTIAL: the specification's Q01–Q03 primary measurements
  (proportion correctly placed, misplacements, corrections after feedback,
  retrieval accuracy) have **no substrate** — required task logic
  incomplete.
- Primary gap: per-item mechanic absent (task-design decision); Q30 tags on
  this room's events are stale (SA-4, §16).

### 10.7 Hazard Control (`hazard_control_room`) — WORKING

- Scene: `src/scenes/HazardScene.ts`. Hazard Warning terminal.
- Task: warning on prompt open (repeatable, prototype semantics), 3 options:
  check detail / continue (informed vs reckless branch from session-lifetime
  `infoChecked`) / avoid route (`HazardScene.ts:137-201`).
- Approved emitted events: `hazard_room_entered`, `hazard_warning_seen`,
  `hazard_info_checked`, `hazard_informed_continue`,
  `hazard_reckless_continue` (with live
  `metadata.info_checked_before_continuing`), `hazard_route_avoided`
  (ruling D1, telemetry-only) + legacy `hazard_avoidance`.
- Missing: `hazard_issue_created`, `hazard_issue_resolved`,
  `final_hazard_issue` (no consequence mechanic — user-owned
  UD-HAZARD-CONSEQUENCE; `hazard_status` written but consumed by nothing).
- Tests: `hazard_control_logging.spec.ts` (4, incl. leave-and-return
  classification), `adversarial_hazard_repeat_decisions.spec.ts`, journeys.
- Evidence for WORKING: the room's implemented situation is the approved
  prudence/carefulness opportunity (Q12), which the specification retains.
- Primary risk: the room's **registrations** carry the superseded Q27/Q31
  mappings (SA-1/SA-3, §16) — the mechanics are aligned, the scientific
  tags are not.

### 10.8 Optional Side Repair / anomaly investigation

(`optional_side_repair_bay`) — PARTIAL

- Scene: `src/scenes/SideRepairScene.ts`. Utility Bot.
- Task: 4 options — ignore / start-then-stop-at-difficulty /
  work-through-and-complete / formally defer (defer keeps the offer open)
  (`SideRepairScene.ts:134-209`).
- Approved emitted events: `side_repair_discovered` (once),
  `stabiliser_option_offered`, `stabiliser_accepted`, `side_repair_accepted`,
  `side_repair_first_step`, `side_repair_abandoned_after_start`,
  `side_repair_deferred`, `side_repair_completed`, `final_bonus_unlocked`
  (+ legacy aliases incl. derived-style `side_repair_low_effort`,
  `side_repair_productive_persistence`).
- Missing: `side_repair_step_completed` — **no multi-step mechanic**; the
  "start but stop after the first difficulty" option asserts abandonment in
  one key press rather than observing it across real steps. The
  specification's Q20 anomaly arc (staged, stable-utility continuation) has
  no substrate beyond this single prompt.
- Tests: `side_repair_logging.spec.ts` (3, incl. defer-reopen),
  `adversarial_direct_launch_navigation.spec.ts`, journeys.
- Evidence for PARTIAL: required multi-step task logic and process capture
  incomplete; single choice simultaneously feeds Q07/Q16/Q20/Q29/Q32 tags
  (non-independence, §12).
- Primary gap: multi-step mechanic (task-design); Q29/Q32 registrations
  await SA-3/SA-5.

### 10.9 Interruption Corridor (`interruption_corridor`) — PARTIAL

- Scene: `src/scenes/InterruptionScene.ts`. Comms Beacon.
- Task: one 3-option prompt — switch fully / acknowledge-then-return /
  ignore (`InterruptionScene.ts:131-194`). One-shot; sets
  `interruption_status`.
- Approved emitted events: `interruption_corridor_entered`,
  `objective_active` (state-grounded: only while `active_objectives`
  non-empty, once/session), `interruption_received`, `switched_task`,
  `prior_goal_abandoned`, `returned_to_original_task`, `task_avoidance`;
  at Final Core: `final_unresolved_due_to_nonreturn`.
- Legacy derived-style events still emitted verbatim:
  `interruption_focus_lost`/`_maintained`/`_possible_rigidity`,
  `interruption_single_task_focus`, `interruption_alert_acknowledged`
  (**D6**) — scoring-plan §9 smell, preserved by design pending rebuild.
- Missing (need real cross-room objective mechanics, documented):
  `competing_task_viewed` (D6), `new_goal_offered`, `goal_switch_accepted`,
  `return_to_unfinished_task`, `prior_goal_completed`,
  `task_completed_after_interruption`; `excessive_idle_after_instruction`
  registered-not-emitted (D3).
- Tests: `interruption_corridor_logging.spec.ts` (3), journeys.
- Evidence for PARTIAL: "switch" and "return" are dialogue assertions, not
  observed behaviour against a genuinely competing objective; the
  specification's Q15/Q17/Q19 process measures (actual return acts, later
  return opportunity) lack a substrate.
- Primary gap: no real competing-objective mechanic; D6 mapping open.

### 10.10 Final Core (`final_core_room`) — WORKING

- Scene: `src/scenes/FinalCoreScene.ts`. Core Interface.
- Task: entry-time system flags computed from real `SessionState`
  (`final_core_missing_item_flagged`, `final_core_workspace_issue_flagged`,
  `final_unresolved_due_to_nonreturn`, `final_core_stability_bonus`,
  `FinalCoreScene.ts:152-185`); prompt lists outstanding flags
  (`final_core_blocker_shown`); options: quick-sync (rushed) / review &
  integrate / resolve flags (completes active relay duty) / **force
  through blocker** (4th option, only while issues exist)
  (`:187-279`).
- Approved emitted events: `final_core_entered`, `final_core_status_reviewed`,
  `unresolved_issue_reviewed`, `issue_resolution_attempted`,
  `final_core_issue_resolved`, `final_core_force_continue`,
  `final_core_rushed`, `final_core_completed`,
  `engineer_supervision_completed`, `accepted_duty_unresolved` (+ legacy
  quality-tier events).
- Missing (documented, scoring-layer scope): `final_quality_score_computed`,
  `final_summary_previewed`, `qualtrics_return_previewed`; hazard
  consequence flag (upstream blocked).
- Tests: `final_core_summary.spec.ts` (3), journeys.
- Primary risk: Q33 registrations on this room's events are prohibited
  inferences under the approved rationale (SA-6, §16);
  `final_core_force_continue` is emitted+registered but feeds **no** summary
  variable (D2 sub-item 2).

**Inventory note**: no audited area is PLACEHOLDER, STALE, or ABSENT at area
level; the prototype scene (`src/scenes/Main.tsx`, `?scene=prototype`) is
retained as historical evidence and is not on the participant path (P2-11).

## 11. Q01–Q33 traceability matrix

Classification concerns the **game-based measurement implementation** against
the final specification — not whether the questionnaire item exists (all 33
remain in the Qualtrics battery). One primary status per item.
Implementation evidence cites the emitting scene; registration evidence is
`src/world/CanonicalEventContext.ts` (CEC). Test evidence is static
(committed specs; historically green — §15).

| Q   | Source   | Item meaning (concise)                             | Intended opportunity (spec)                                                                 | Implementation evidence                                                                                                                                                    | Event-schema support                                                                                                                               | Scoring-plan support                                                                                                   | Static test support                                | Open decision                              | **Primary status** | Note                                                                                                                 |
| --- | -------- | -------------------------------------------------- | ------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------- | ------------------------------------------ | ------------------ | -------------------------------------------------------------------------------------------------------------------- |
| Q01 | BFI-C-04 | Systematic, orderly                                | Checklist + ordered kit prep, per-item placement                                            | Checklist option + chained stages (`InventoryScene.ts:155-169`); no per-item placement                                                                                     | `inventory_checklist_opened`, `inventory_sequence_followed` emitted+registered; `inventory_item_sorted_correct` registered, unemittable            | `organization_checklist_used` (rename); accuracy score missing                                                         | inventory spec systematic path                     | —                                          | **PARTIAL**        | Order/accuracy/verification measurement needs per-item mechanic (task-design)                                        |
| Q02 | BFI-C-01 | Disorganised (rev)                                 | Preventable, uncorrected misplacement + later consequence                                   | Shortcut path + `final_core_missing_item_flagged` (`InventoryScene.ts:134-152`; `FinalCoreScene.ts:160-165`)                                                               | `inventory_verification_skipped` (also Q30 — SA-4), `missing_item`, flag event registered Q02                                                      | `organization_disorganized_count` partial rename                                                                       | inventory shortcut + final core specs              | SA-4 (Q30 tag only)                        | **PARTIAL**        | Correction-opportunity step absent; only errors-after-correction should count per spec                               |
| Q03 | BFI-C-07 | Neat and tidy                                      | Maintained order + later retrieval episode                                                  | Tidy/sort actions (`InventoryScene.ts:171-190`, cleanup stage)                                                                                                             | `correct_tool_selected`, `workspace_tidy_confirmed` emitted; `wrong_tool_selected`, `prepared_tool_used` unemittable                               | `workspace_tidy_score` etc. missing                                                                                    | inventory spec                                     | —                                          | **PARTIAL**        | Later-retrieval episode does not exist                                                                               |
| Q04 | BFI-C-10 | Leaves mess (rev)                                  | Explicit restore-vs-leave after task                                                        | Cleanup stage sort/leave (`InventoryScene.ts:229-263`); Final Core flag                                                                                                    | `workspace_left_disordered`, `cleanup_completed` → Q04/organisation (CEC:322-329)                                                                  | `organization_cleanup_count` (actions, not failures — noted)                                                           | inventory spec paths 1/3                           | none (closed decision §5 of authority doc) | **ALIGNED**        | Approved cleanup interpretation implemented; never planning-before-action                                            |
| Q05 | BFI-C-05 | Difficulty starting (rev)                          | Latency to first goal-directed action                                                       | Nothing: `task_started` unemitted/unregistered; no latency capture anywhere                                                                                                | `task_started` **blocked** (D7 listing conflict)                                                                                                   | `task_initiation_latency` missing (scoring-plan §2)                                                                    | none                                               | **D7**                                     | **BLOCKED**        | Cannot proceed coherently until D7 rules the Q-listing; latency plumbing also absent                                 |
| Q06 | BFI-C-08 | Efficient, gets things done                        | Required completion + effective-action ratio                                                | Completion events across Archive/Repair/Final Core                                                                                                                         | `archive_completed`, `repair_completed`, `final_core_completed` emitted+registered Q06                                                             | `required_completion_rate`, `effective_action_ratio` missing                                                           | room specs + journeys                              | D2 (rate wiring)                           | **PARTIAL**        | Outcome captured; process side (unnecessary actions, rework) not captured                                            |
| Q07 | BFI-C-11 | Works until finished                               | Accepted multi-step task to completion                                                      | Side-repair accept/complete/defer, single-press paths (`SideRepairScene.ts:134-209`)                                                                                       | accept/complete/defer emitted; `side_repair_step_completed` missing                                                                                | `productiveness_completed_optional_task` boolean                                                                       | side repair spec (3 paths)                         | —                                          | **PARTIAL**        | No steps → completion-after-acceptance is one key press, not observed work                                           |
| Q08 | BFI-C-02 | Lazy (rev)                                         | ≥2 valid required-duty opportunities; idle/avoidance pattern                                | `task_avoidance` on ignore branch (`InterruptionScene.ts:177-193`)                                                                                                         | `task_avoidance` registered Q08; `excessive_idle_after_instruction` registered, blocked                                                            | `avoidance_count` family missing                                                                                       | interruption ignore-path test                      | **D3** (idle)                              | **PARTIAL**        | Idle component blocked (D3); only one avoidance branch exists                                                        |
| Q09 | BFI-C-03 | Dependable, steady                                 | Evidence-based report to Kai                                                                | 3-option report console (`EngineerScene.ts:119-174`)                                                                                                                       | report events emitted+registered Q09/responsibility                                                                                                | `responsibility_report_count` exact; `report_accuracy_score` missing                                                   | engineer spec (2 paths)                            | D5 (legacy supervised event)               | **ALIGNED**        | Accuracy evaluation absent — secondary gap, not a conflict                                                           |
| Q10 | BFI-C-09 | Reliable, counted on                               | Accepted duty follow-through across rooms                                                   | Duty offer→accept/decline→Final Core completion/unresolved (`EngineerScene.ts:183-216`; `FinalCoreScene.ts:243-257,309-321`)                                               | supervision events emitted+registered Q10                                                                                                          | `commitment_followthrough_rate` missing (raw events present)                                                           | engineer + final core specs                        | —                                          | **ALIGNED**        | Decline is a valid choice, never penalised — matches spec                                                            |
| Q11 | BFI-C-12 | Irresponsible (rev)                                | Review/resolve vs force finalisation with visible consequences                              | Final Core review/resolve/rush/force with real flags (`FinalCoreScene.ts:187-279`)                                                                                         | `final_core_status_reviewed`, `unresolved_issue_reviewed`, `final_core_rushed` registered Q11                                                      | `final_core_*` counts; `final_quality_score` shape open (D2)                                                           | final core spec (3 paths)                          | D2                                         | **ALIGNED**        | Quality-score shape pending D2, raw capture complete                                                                 |
| Q12 | BFI-C-06 | Careless (rev)                                     | Warning info checked vs ignored before consequential action                                 | Hazard check/informed/reckless branches (`HazardScene.ts:137-201`)                                                                                                         | all four decision events emitted+registered (Q12/prudence)                                                                                         | `prudence_check_rate` missing as standalone (folded into `strategy_revision_count` — D2 mixing)                        | hazard spec (4 tests)                              | D2 (scoring split)                         | **ALIGNED**        | Hazard = prudence is the approved interpretation                                                                     |
| Q13 | GRIT-02  | Setbacks don't discourage                          | Archive failure→feedback→revision→completion                                                | Full sequence (`ArchiveScene.ts:152-205`)                                                                                                                                  | all sequence events emitted+registered                                                                                                             | `game_difficulty_persistence` exact                                                                                    | archive spec (2) + ADV-3                           | —                                          | **ALIGNED**        | Strongest module                                                                                                     |
| Q14 | GRIT-04  | Hard worker                                        | Sustained useful effort in Repair                                                           | Failure→manual→revision→completion (`RepairScene.ts:151-197`)                                                                                                              | all emitted+registered                                                                                                                             | `game_difficulty_persistence` terms                                                                                    | repair spec (4)                                    | —                                          | **ALIGNED**        | Effort is single-cycle; multi-step effort count limited — secondary note                                             |
| Q15 | GRIT-07  | Finishes what begun                                | Interruption of a started task; return act; completion                                      | Prompt-level switch/return assertions only (`InterruptionScene.ts:140-175`)                                                                                                | `interruption_received` registered Q15/Q17; `return_to_unfinished_task`, `task_completed_after_interruption` registered, unemittable (no mechanic) | `return_to_task_rate` partial (count)                                                                                  | interruption spec                                  | —                                          | **PARTIAL**        | A dialogue assertion is not a return act (schema table note)                                                         |
| Q16 | GRIT-08  | Diligent                                           | Multi-step accuracy + verification                                                          | Single-press side-repair completion                                                                                                                                        | steps/verification events missing                                                                                                                  | `diligence_step_accuracy` missing                                                                                      | side repair spec                                   | —                                          | **PARTIAL**        | Same substrate gap as Q07                                                                                            |
| Q17 | GRIT-01  | Distracted by new projects (rev)                   | Attractive competing offer; switch w/o return is the negative signal                        | Switch/acknowledge/ignore prompt (one-shot)                                                                                                                                | `switched_task`, `returned_to_original_task` emitted+registered; `competing_task_viewed` blocked (D6)                                              | `distraction_switch_rate` missing                                                                                      | interruption spec                                  | **D6**                                     | **PARTIAL**        | Later-return opportunity absent (one-shot prompt)                                                                    |
| Q18 | GRIT-06  | Long-horizon focus (rev)                           | Weak goal-continuity proxy; questionnaire-primary                                           | `objective_active` (state-grounded) + `final_unresolved_due_to_nonreturn` (`InterruptionScene.ts:114-129`; `FinalCoreScene.ts:174-179`)                                    | both emitted+registered Q18/CI-exploratory                                                                                                         | no score (correct per decision); label mechanism open                                                                  | interruption return-path + final core specs        | SA-7 (label wording only)                  | **ALIGNED**        | Aligned **for its questionnaire-primary use**; spec's richer 3-stage calibration is a candidate design, not required |
| Q19 | GRIT-05  | Changes goals before finishing (rev)               | New credible goal vs prior commitment; abandonment observable                               | `prior_goal_abandoned` emitted; offer/accept/complete events need real mechanics                                                                                           | 3 of 4 registered events unemittable                                                                                                               | `goal_switch_without_return_count` missing                                                                             | interruption switch-path test                      | —                                          | **PARTIAL**        | Same competing-objective substrate gap as Q15/Q17                                                                    |
| Q20 | GRIT-03  | Initial obsession, later loss (rev)                | Very weak start-without-sustain; questionnaire-primary; no bespoke score                    | accept/first-step/abandon-after-start emitted (`SideRepairScene.ts:157-174`)                                                                                               | registered Q20/CI-exploratory (CEC:354-362)                                                                                                        | no Q20 score exists (correct per decision)                                                                             | side repair spec                                   | SA-7 (label wording only)                  | **ALIGNED**        | Consistent with approved decision; anomaly-arc redesign is a candidate only                                          |
| Q21 | PDD-01   | Keeps going when tough                             | Repair difficulty→support→revision→completion                                               | Full sequence (`RepairScene.ts:151-197`)                                                                                                                                   | emitted+registered                                                                                                                                 | `game_difficulty_persistence` exact                                                                                    | repair spec                                        | —                                          | **ALIGNED**        |                                                                                                                      |
| Q22 | PDD-03   | Works through difficult info                       | Support opened AND applied                                                                  | Manual/feedback use + revision events; Manual station (`RepairScene.ts:98-111`)                                                                                            | `repair_manual_used`, `manual_page_reviewed`, `archive_feedback_used` registered Q22                                                               | `manual_or_feedback_used` exact; applied-info linkage not derived                                                      | archive/repair specs                               | D2                                         | **ALIGNED**        | "Use only counts with subsequent change" is a scoring nuance for D2                                                  |
| Q23 | PDD-05   | Keeps trying when hard                             | Adaptive retry vs identical repetition                                                      | didRepeat detection both rooms (`roomTaskState.ts:85-95`)                                                                                                                  | revision + repeat events registered                                                                                                                | `blind_retry_count` exact; `adaptive_retry_count` missing                                                              | archive/repair blind-retry tests                   | —                                          | **ALIGNED**        |                                                                                                                      |
| Q24 | PDD-04   | Setbacks don't discourage                          | Independent post-setback completion (Repair replication)                                    | Repair failure→re-engage→complete + abandon/return pair                                                                                                                    | `repair_abandoned`, `repair_returned_after_failure` etc. registered Q24 (construct unset — D4)                                                     | `abandonment_after_failure_count` narrower legacy                                                                      | repair leave-and-return test                       | **D4** (construct label only)              | **ALIGNED**        | Raw capture complete; construct label is a pending ruling, not a conflict                                            |
| Q25 | PDD-02   | Sticks at difficult task                           | Leave/defer/return after explicit difficulty                                                | Leave→return detection (both rooms)                                                                                                                                        | return events registered Q24/Q25                                                                                                                   | rate missing                                                                                                           | repair spec; archive return path untested          | D4                                         | **PARTIAL**        | Formal-deferment option absent in Archive/Repair; only leave/return observable                                       |
| Q26 | IP-02    | Repeats same thing                                 | Identical failed action after feedback                                                      | Same-wrong-code/sequence repeat detection                                                                                                                                  | repeat events registered Q26/inappropriate_persistence                                                                                             | `blind_retry_count`/`game_inappropriate_persistence` exact                                                             | blind-retry tests + ADV-7 debounce                 | —                                          | **ALIGNED**        | Input-spam test guards double-press inflation                                                                        |
| Q27 | IP-01    | Continues when no point                            | **Continuation after explicit utility-stop signal** (approved primary analogue)             | **No utility-stop mechanic exists**; Q27 currently rides `hazard_info_checked` + `hazard_reckless_continue` (CEC:201-203, 220-224) — superseded rationale                  | utility-stop candidates unapproved (SA-2); live Hazard tags conflict (SA-1)                                                                        | `hazard_reckless_continue` inside `blind_retry_count` → `game_inappropriate_persistence` (ScoringManager.ts:80-83,102) | hazard tests pin the **stale** registration values | **SA-1 + SA-2**                            | **STALE**          | Most consequential stale mapping; secondary: replacement module BLOCKED                                              |
| Q28 | IP-03    | Continues knowing worthless                        | Explicit blocker + valid alternative; force attempts                                        | Blocker display + force option + resolve path (`FinalCoreScene.ts:120-133, 262-276`)                                                                                       | `final_core_blocker_shown`, `final_core_force_continue` registered Q28/inappropriate_persistence                                                   | force_continue feeds **no** summary variable yet (D2 sub-item 2)                                                       | final core Q28 test                                | D2                                         | **ALIGNED**        | Comprehension/acknowledgement evidence (blocker_understood) not captured — secondary                                 |
| Q29 | GTP-01   | Prefers long-term goals                            | Balanced immediate-vs-distributed horizon choice (shared with Q31), pre-interruption        | No balanced module; Q29 rides `stabiliser_option_offered`/`stabiliser_accepted`/`final_core_stability_bonus` (CEC:364-371, 501-504) — superseded delayed-benefit rationale | horizon-choice candidates unapproved (SA-3)                                                                                                        | none (correctly)                                                                                                       | side repair/final core specs pin stale tags        | **SA-3**                                   | **STALE**          | Shared-dimension module BLOCKED behind SA-3                                                                          |
| Q30 | GTP-03   | Works toward small goals                           | Repeated balanced granularity choices (≥2)                                                  | No granularity module; Q30 rides `inventory_verification_skipped`/`inventory_verified_complete` (CEC:303-305, 331-334) — **prohibited skipped-preparation inference**      | granularity candidates unapproved (SA-4)                                                                                                           | none                                                                                                                   | inventory specs pin stale tags                     | **SA-4**                                   | **STALE**          |                                                                                                                      |
| Q31 | GTP-04   | Prefers short-term goals                           | Same shared horizon module as Q29; one shared variable                                      | Q31 exists **only** on Hazard events (`hazard_informed_continue` CEC:211-214; `hazard_reckless_continue` CEC:220-224) — superseded                                         | shared-module candidates unapproved (SA-3)                                                                                                         | none                                                                                                                   | hazard specs pin stale tags                        | **SA-3**                                   | **STALE**          | Counting risk: MASTER_33 names separate Q29/Q31 variables — would double count                                       |
| Q32 | GTP-02   | Goals take years (long-term-oriented, NOT reverse) | Very weak extended-goal proxy; questionnaire-primary; **no distinct game score**            | Raw tags `side_repair_completed` → Q32 (CEC:351-353), `final_bonus_unlocked` → Q32 (CEC:373-376); no score exists                                                          | tag retention itself awaits **SA-5** confirmation                                                                                                  | `optional_future_benefit_score` correctly unimplemented                                                                | side repair complete-path test pins tags           | **SA-5**                                   | **BLOCKED**        | No reverse-keying anywhere (verified: none in ScoringManager) — correct                                              |
| Q33 | GTP-05   | Accomplished goals take days                       | Exploratory end-session portfolio over **self-selected** goals; never inferred from rushing | Q33 rides `final_core_rushed` (CEC:468-470), `final_core_issue_resolved` (:489-492), `final_core_completed` (:496-498) — **prohibited rush/resolution inference**          | portfolio candidates unapproved (SA-6); depends on SA-3/SA-4 modules existing                                                                      | none                                                                                                                   | final core specs pin stale tags                    | **SA-6** (behind SA-3/SA-4)                | **STALE**          |                                                                                                                      |

## 12. Q-item category totals

| Primary status     | Count  | Items                                                       |
| ------------------ | ------ | ----------------------------------------------------------- |
| ALIGNED            | **15** | Q04 Q09 Q10 Q11 Q12 Q13 Q14 Q18 Q20 Q21 Q22 Q23 Q24 Q26 Q28 |
| PARTIAL            | **11** | Q01 Q02 Q03 Q06 Q07 Q08 Q15 Q16 Q17 Q19 Q25                 |
| STALE              | **5**  | Q27 Q29 Q30 Q31 Q33                                         |
| DOCUMENTATION-ONLY | **0**  | —                                                           |
| ABSENT             | **0**  | —                                                           |
| BLOCKED            | **2**  | Q05 Q32                                                     |
| **Total**          | **33** | 15 + 11 + 5 + 0 + 0 + 2 = **33** ✓                          |

**Shared and non-independent observations** (must never be multiplied):

- **Archive failure module** → Q13 primary; Q22–Q26 supporting. One event
  sequence, not six observations.
- **Repair difficulty module** → Q14/Q21/Q24 primary; Q22/Q23/Q25
  supporting; Q13/Q24 remain conceptually redundant (cross-task convergence
  only).
- **Interruption module** → Q15/Q17/Q18/Q19 all derive from the same single
  prompt today; switching/deferment/return/abandonment must stay separate
  variables and currently cannot (one choice sets one branch).
- **Side-repair single choice** → one key press currently emits events
  tagged **Q07, Q16, Q20, Q29 and Q32 simultaneously**
  (`SideRepairScene.ts:176-194`). This is the strongest live
  non-independence risk: five items share one behavioural act.
- **Goal-horizon (Q29+Q31)** → one shared dimension by approved decision;
  the current split registrations (Q29 on side repair, Q31 on hazard) are
  not just stale but would produce two pseudo-independent observations if
  ever scored (SA-3).
- **Hazard decision** → `hazard_reckless_continue` carries Q12+Q27+Q31 —
  one act, three item tags (SA-1).
- **Goal-granularity (Q30+Q33)** → one module by approved decision; neither
  exists yet.

## 13. Expanded refined-item audit

Format per item: (1) approved interpretation; (2) intended opportunity;
(3) what code implements; (4) canonical events/registrations; (5) candidate
events; (6) scoring treatment; (7) static test treatment; (8) exact
conflict/gap; (9) SA/ruling; (10) decision(s) required; (11) smallest
coherent unit after approval; (12) current evidential weight.

### Q04 — leaves a mess / doesn't clean up (BFI-C-10)

1. Cleanup/disorder only; **never** planning-before-action (closed decision,
   authority doc §5).
2. Explicit restore-vs-leave choice after operational task completion;
   consequence flagged later only if meaningful.
3. `InventoryScene.buildCleanupStage()` (`InventoryScene.ts:229-263`): after
   the systematic path, sort-vs-leave with plausible framing; Final Core
   entry flags `final_core_workspace_issue_flagged` from
   `workspace_status = disordered` (`FinalCoreScene.ts:167-172`).
4. `workspace_left_disordered`, `cleanup_completed` → `['Q04']`,
   `organisation` (CEC:322-329); `final_core_workspace_issue_flagged` →
   `['Q04']` (CEC:449-452). All emitted.
5. Candidates not in production: `cleanup_opportunity_shown`,
   `cleanup_started`, `tool_restored`, `waste_cleared` (spec §Q04) — remain
   candidates.
6. `organization_cleanup_count` counts cleanup **actions**;
   `cleanup_failure_count` (canonical target) missing — scoring-plan §2 row.
7. `inventory_prep_logging.spec.ts` paths 1/3 assert the disorder/cleanup
   events and `workspace_status`; `final_core_summary.spec.ts` asserts the
   flag.
8. Gap: cleanup opportunity only exists on the systematic branch (shortcut
   players assert disorder in the same key press); partial-cleanup and
   proportion-restored measures absent. No conflict.
9. None open — Q04 recorded as "corrected and consistent".
10. **No schema or scoring decision** for current state; enrichment
    candidates would need event-schema approval.
11. If enrichment is ever wanted: one bounded Inventory pass adding a real
    multi-object cleanup interaction — after event-schema approval of the
    candidates. Not required for alignment.
12. Treat as **strong** reverse analogue (spec label), with the caveat that
    the choice is currently prompt-asserted rather than object-level.

### Q18 — difficulty maintaining focus on multi-month projects (GRIT-06)

1. Game supplies only a **weak goal-continuity proxy**; Q18 is
   **questionnaire-primary**; never described as long-term-focus
   measurement.
2. Background objective maintained across rooms and an interruption.
3. Relay-supervision duty (accepted at Engineer Hub) persists in
   `active_objectives`; `objective_active` fires once, state-grounded, in
   the corridor (`InterruptionScene.ts:118-128`);
   `final_unresolved_due_to_nonreturn` fires at Final Core when
   `interruption_status = switched_away` (`FinalCoreScene.ts:174-179`).
4. `objective_active`, `final_unresolved_due_to_nonreturn` → `['Q18']`,
   `consistency_of_interest_exploratory` (CEC:417-424). Both emitted.
5. Spec candidates (`background_objective_offered`, staged calibration,
   `reminder_shown`, etc.) are candidates only.
6. No Q18 score (correct). `longitudinal_focus_proxy` remains a documented
   name only; exploratory-label mechanism undecided (SA-7 / D2 sub-item 4).
7. `interruption_corridor_logging.spec.ts` return-path test asserts
   `objective_active` with pinned registration; `final_core_summary` covers
   the unresolved flag path indirectly (journeys P2).
8. Gap: none against the approved decision. The spec's three-stage
   background calibration is a richer candidate design, not required.
9. SA-7 (label text) open; live mapping recorded as **consistent**.
10. **Scoring-plan decision only** (SA-7 label wording); no schema change.
11. Smallest unit after SA-7: add the ruled label mechanism in
    `ScoringManager`/summary output (part of the D2/Beat-13 bundle).
12. **Questionnaire-primary; weak exploratory proxy** — exactly as ruled.

### Q20 — intense initial interest, later loss (GRIT-03)

1. Very weak start-without-sustain evidence only; questionnaire-primary;
   **no bespoke validated Q20 game score may be designed**.
2. Voluntary optional arc; initial engagement separated from later
   continuation, with stable utility.
3. Side-repair option 2 ("start, but stop after the first difficulty")
   asserts start-then-abandon in one press (`SideRepairScene.ts:157-174`);
   defer (option 4) and complete (option 3) are separate.
4. `side_repair_accepted` → `['Q07','Q16','Q20']` (CEC:339-341);
   `side_repair_first_step`, `side_repair_abandoned_after_start` →
   `['Q20']`, `consistency_of_interest_exploratory` (CEC:354-362). Emitted.
5. Spec's anomaly-arc candidates (`anomaly_discovered`, staged
   investigation…) are candidates only.
6. No Q20 score exists (correct per decision). Label mechanism = SA-7.
7. `side_repair_logging.spec.ts` asserts all three paths with pinned
   registrations.
8. Gap: "later continuation with stable utility" cannot be observed in a
   single-prompt implementation — acceptable while questionnaire-primary;
   no conflict.
9. SA-7 (label wording). Live mapping recorded as consistent.
10. **No schema change** for current events; **no scoring decision is being
    sought** (no Q20 score is approved).
11. None required. Any anomaly-arc build is a new event-schema decision.
12. **Questionnaire-primary; very weak** — as ruled.

### Q27 — continuing when there is no point (IP-01)

1. Primary analogue = **continuation after an explicit utility-stop /
   no-additional-benefit signal**; Hazard recklessness is **not** the
   primary analogue; Hazard stays principally prudence.
2. A utility-stop stage in an optional diagnostic/repair arc: explicit "no
   further benefit" report; stop/inspect/switch/continue-unnecessary-cycles.
3. **No utility-stop mechanic exists anywhere in `src/`.** What exists is
   the Hazard decision (`HazardScene.ts:137-201`) whose events carry Q27.
4. Live registrations: `hazard_info_checked` → `['Q12','Q27']`
   (CEC:201-203); `hazard_reckless_continue` → `['Q12','Q27','Q31']`,
   `construct_id: 'inappropriate_persistence'` (CEC:220-224).
5. Candidates (unapproved, SA-2): `utility_stop_signal`,
   `no_additional_benefit_explained`, `unnecessary_cycle_started`/
   `_completed`, `task_stopped_appropriately`; indicators
   `excess_continuation_count`, `no_point_persistence_flag`.
6. `hazard_reckless_continue` is a term of `blind_retry_count` and therefore
   of `game_inappropriate_persistence` (`ScoringManager.ts:80-83,102`) —
   i.e. the superseded Q27 interpretation is **live in a scoring formula**.
7. `hazard_control_logging.spec.ts` pins the stale registration exactly
   (frozen scientific data rule) — the tests are correct against the
   **current** schema and will need coordinated updates when SA-1 lands.
8. Exact conflict: approved rationale vs live tags + scoring term (SA-1);
   approved primary analogue entirely unimplemented (SA-2).
9. **SA-1** (Hazard tags/term) and **SA-2** (utility-stop module) — both
   research-owner.
10. **Both event-schema and scoring-plan decisions** (SA-1 + SA-2).
11. Smallest unit after approval: one bounded pass in the Side
    Repair/diagnostic arc adding the ruled utility-stop stage and its ruled
    canonical events, plus the ruled re-tagging of the two Hazard events —
    one room + one registration edit + coordinated spec updates.
12. Current game evidence for Q27 should be treated as **invalid under the
    approved rationale** (measures prudence, not pointless continuation);
    after SA-2, moderate–strong maladaptive analogue per spec.

### Q29 — prefers long-term goals (GTP-01)

1. Exploratory; shares **one** goal-horizon dimension with Q31; initial
   choice captured **before** interruption; options never labelled
   short/long-term.
2. Balanced immediate-vs-distributed objective choice, matched on effort,
   value, difficulty, risk, attractiveness.
3. **No balanced horizon-choice module exists.** Live Q29 evidence rides the
   old delayed-benefit rationale: `stabiliser_option_offered`/`_accepted`
   on side-repair offer/start (`SideRepairScene.ts:104-106,160-166`);
   `final_core_stability_bonus` at Final Core entry
   (`FinalCoreScene.ts:181-184`).
4. Registrations: all three → `['Q29']`, `goal_time_exploratory`
   (CEC:364-371, 501-504).
5. Candidates (unapproved, SA-3): `horizon_choice_offered`,
   `immediate_goal_selected`, `distributed_goal_selected`, etc.; indicator
   `goal_horizon_preference` (single shared variable).
6. No Q29 scoring variable exists (correct); `delayed_benefit_investment`
   remains a missing legacy target that must **not** be built as-is
   (double-count risk vs Q31, recorded in SA-3).
7. `side_repair_logging.spec.ts` / `final_core_summary.spec.ts` pin the
   stale tags.
8. Exact conflict: superseded delayed-benefit mapping live; approved shared
   module absent.
9. **SA-3.**
10. **Both event-schema and scoring-plan.**
11. Smallest unit after SA-3: one shared goal-horizon module (one balanced
    choice at an approved point pre-interruption, ruled events, one shared
    variable) + removal/retention of the three stale Q29 tags per ruling.
12. **Exploratory**; current tags should not be interpreted as Q29 evidence
    at all until SA-3 rules.

### Q30 — usually works towards small goals (GTP-03)

1. Goal granularity via repeated balanced choices (independent small work
   orders vs one integrated audit); **never inferred from carelessness or
   skipped preparation**; ≥2 opportunities preferred.
2. Granularity choice at the Quartermaster terminal + one later natural
   opportunity.
3. **No granularity module exists.** Live Q30 evidence is exactly the
   prohibited inference: `inventory_verification_skipped` → `['Q02','Q30']`
   (CEC:303-305) and `inventory_verified_complete` → `['Q30']`,
   `goal_time_exploratory` (CEC:331-334), emitted on the verification stage
   and shortcut path (`InventoryScene.ts:142,207-218`).
4. As above; no other Q30 events exist.
5. Candidates (unapproved, SA-4): `goal_structure_choice_offered`,
   `small_goal_set_selected`, `integrated_goal_selected`, etc.
6. No Q30 scoring variable (correct); `short_term_shortcut_count` is a
   legacy target that must not be built (same prohibited inference).
7. `inventory_prep_logging.spec.ts` pins the stale tags on all three paths.
8. Exact conflict: prohibited skipped-preparation inference is live in two
   registrations.
9. **SA-4.**
10. **Both event-schema and scoring-plan** (tag removal/retention +
    module).
11. Smallest unit after SA-4: registration edit (Q30 tags) as one micro-pass;
    the granularity module itself as a separate bounded Inventory/maintenance
    pass with ruled events.
12. **Exploratory (moderate only if repeated)**; current tags invalid as Q30
    evidence under the approved rationale.

### Q31 — prefers short-term goals (GTP-04)

1. Opposite pole of Q29's single shared dimension; one shared variable; one
   choice never counted twice; initial choice logged before interruption;
   no risk/recklessness built into the short option.
2. Same balanced module as Q29.
3. **Q31 exists only on Hazard events**: `hazard_informed_continue` →
   `['Q31']`, `goal_time_exploratory` (CEC:211-214);
   `hazard_reckless_continue` → `['Q12','Q27','Q31']` (CEC:220-224) — the
   superseded "fast reckless vs slow informed" proxy, which embeds exactly
   the risk/quality confound the spec prohibits.
4. As above. 5. Candidates shared with Q29 (SA-3).
5. No Q31 variable (correct); MASTER_33's separate `informed_delay_choice`/
   `risky_shortcut_count` must not be implemented as written (double-count,
   recorded in SA-3).
6. `hazard_control_logging.spec.ts` pins the stale tags.
7. Exact conflict: superseded mapping live; shared module absent; potential
   double-count with Q29 if legacy variables were ever built.
8. **SA-3** (with SA-1 for the shared `hazard_reckless_continue` event).
9. **Both event-schema and scoring-plan.**
10. Smallest unit: same single shared-module unit as Q29 — one module, one
    shared variable, never two.
11. **Exploratory**; current tags invalid as Q31 evidence under the approved
    rationale.

### Q32 — most goals take years to finish (GTP-02)

1. **Long-term-oriented; NOT reverse-scored relative to long-term
   orientation.** Very weak extended-goal engagement proxy;
   questionnaire-primary; **no distinct validated Q32 game score**.
2. Derived across repeated horizon opportunities and the multi-room
   distributed objective — no separate minigame.
3. Raw tags only: `side_repair_completed` → `['Q07','Q16','Q32']`
   (CEC:351-353) and `final_bonus_unlocked` → `['Q32']`,
   `goal_time_exploratory` (CEC:373-376), both emitted on the side-repair
   completion path.
4. As above. No reverse-keying exists anywhere in `ScoringManager` —
   verified by inspection (`ScoringManager.ts` contains no reverse logic;
   D2 pack §3 records the same).
5. Candidates (`distributed_goal_selected` family) belong to SA-3's module.
6. `optional_future_benefit_score` correctly **unimplemented**; must not be
   implemented as a Q32 score (approved decision).
7. `side_repair_logging.spec.ts` complete-path test pins both tags.
8. Gap/conflict: whether the raw Q32 tags may remain as weak-proxy telemetry
   is itself the open confirmation — not a prohibited inference, but not
   confirmed either.
9. **SA-5.**
10. **Event-schema decision** (tag confirmation); scoring-plan only if a
    proxy variable is ever authorised — none is.
11. Smallest unit after SA-5: a one-line-per-tag registration edit (retain
    or remove) — trivially bounded.
12. **Questionnaire-primary; very weak proxy** — treat current tags as
    pending-confirmation telemetry, not Q32 evidence.

### Q33 — accomplished goals take only days (GTP-05)

1. Exploratory end-session **portfolio over self-selected** goal-horizon/
   granularity opportunities; **never inferred from rushed Final Core
   completion**; required short tasks never count.
2. Computed at session end from genuine self-selected opportunities.
3. Live Q33 evidence is exactly the prohibited inference:
   `final_core_rushed` → `['Q11','Q33']` (CEC:468-470),
   `final_core_issue_resolved` → `['Q33']`, `goal_time_exploratory`
   (CEC:489-492), `final_core_completed` → `['Q06','Q33']` (CEC:496-498),
   emitted on Final Core options (`FinalCoreScene.ts:198-259`).
4. As above. 5. Portfolio candidates (`short_goal_completion_share`,
   `self_selected_goal_portfolio`) unapproved and **dependent on SA-3/SA-4
   modules existing first**.
5. No Q33 variable (correct); `rush_to_finish_count`/
   `delayed_finalization_score` legacy targets must not be built.
6. `final_core_summary.spec.ts` pins the stale tags.
7. Exact conflict: prohibited rush/resolution inference live in three
   registrations; approved portfolio has no substrate (needs SA-3/SA-4
   modules).
8. **SA-6**, blocked behind SA-3/SA-4.
9. **Both event-schema and scoring-plan.**
10. Smallest unit after SA-6: registration edit (Q33 tags) as a micro-pass;
    the portfolio variable only after SA-3/SA-4 modules exist.
11. **Questionnaire-primary; weak**; current tags invalid as Q33 evidence
    under the approved rationale.

**Held constant throughout** (not converted into schema/scoring decisions):
adaptive vs inappropriate persistence stay distinct (`game_persistence_total`
subtracts `game_inappropriate_persistence`, `ScoringManager.ts:111-117`);
duration alone is never effort; no global good-player score exists
(scoring-plan §7 confirmed against `GameSummaryVariables`).

## 14. Data-foundation audit

Statuses: VERIFIED / IMPLEMENTED BUT UNVERIFIED / PARTIAL / ABSENT /
BLOCKED BY DECISION. "VERIFIED" cites committed evidence; the most recent
full-suite evidence is **55/55 at `1ad66c2`** (commit message of `1ad66c2`,
2026-07-15) and **49/49 ×2 at the technical gate** (`24afcad`,
2026-07-13, `docs/ai/OPUS-OVERNIGHT-PRE-PILOT-TECHNICAL-GATE.md` §5–§6).
`src/systems/` is byte-identical between those commits and `88a1635`
(only `src/world/RoomScene.ts` changed, at `1ad66c2`, DEV-only probe).

| #   | Concern                                     | Status                         | Evidence                                                                                                                                                                                                                                            |
| --- | ------------------------------------------- | ------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Participant identity                        | **VERIFIED**                   | `SessionState.ts:44-56`; `launch_with_research_params.spec.ts` (params reflected in every event); `participant_lifecycle.spec.ts`; lifecycle audit `docs/architecture/PARTICIPANT-LIFECYCLE.md` §1; suite green at `1ad66c2`                        |
| 2   | Game-session identity                       | **VERIFIED**                   | Same sources; `session_id` = `game_session_id` on every event (`ResearchRuntime.ts:98-104`)                                                                                                                                                         |
| 3   | Experimental condition                      | **VERIFIED**                   | Parsed, default `'default'` (`SessionState.ts:49`); asserted in launch spec                                                                                                                                                                         |
| 4   | Launch-parameter parsing                    | **VERIFIED**                   | `SessionState.ts:44-56`, `QualtricsBridge.ts:14-22`; launch + lifecycle specs                                                                                                                                                                       |
| 5   | Empty-string parameter handling             | **BLOCKED BY DECISION**        | Empty string bypasses `??` fallback and is used verbatim — known P1-5, frozen by `adversarial_hostile_launch.spec.ts:53`; intended behaviour is the open **INT-3** ruling                                                                           |
| 6   | Whitespace-only parameter handling          | **PARTIAL**                    | `return_url` whitespace → `null` (`QualtricsBridge.ts:31`, verified by ADV-6); identity whitespace passes verbatim (INT-3 scope)                                                                                                                    |
| 7   | Missing launch-parameter handling           | **VERIFIED**                   | UUID fallbacks (`SessionState.ts:187-194`); `participant_lifecycle.spec.ts` bare-launch test                                                                                                                                                        |
| 8   | Duplicate/conflicting parameters            | **VERIFIED**                   | `URLSearchParams.get` first-value semantics frozen by ADV-6 ("duplicate, oversized, url-encoded params resolve deterministically")                                                                                                                  |
| 9   | Event timestamp                             | **IMPLEMENTED BUT UNVERIFIED** | `timestamp_ms` set at log time (`ResearchRuntime.ts:101`); no spec asserts timestamp presence/monotonicity directly (ADV-7 asserts log order only)                                                                                                  |
| 10  | Event sequence / ordering identifier        | **ABSENT**                     | No sequence number field exists (`EventLogger.ts:1-32`); array order only — known P1-9                                                                                                                                                              |
| 11  | Event uniqueness / deduplication            | **ABSENT**                     | No event IDs; only behavioural one-shot guards (`RoomScene.ts:147-156`)                                                                                                                                                                             |
| 12  | Raw-event preservation (append-only)        | **VERIFIED**                   | `EventLogger.log` only pushes (`:37-39`); `clear()` has no `src/` caller; purity asserted by `state_session_continuity.spec.ts` ("summary reads are pure"); event-schema §3                                                                         |
| 13  | Raw-event export                            | **BLOCKED BY DECISION**        | Only DEV-only `exportEventsJSON()` (`ResearchRuntime.ts:159-161`); no production channel — P0-2, **INT-2**                                                                                                                                          |
| 14  | Durable persistence                         | **ABSENT**                     | Zero `localStorage`/`sessionStorage`/`indexedDB` in `src/` (grep, this audit; PS gate §5) — P0-3; mechanism choice is INT-2-adjacent, but today nothing exists                                                                                      |
| 15  | Reload recovery                             | **ABSENT**                     | Reload re-boots fresh and loses all session data (technical gate §13; `adversarial_reload_partial_state.spec.ts` asserts the reset semantics)                                                                                                       |
| 16  | Crash / interruption recovery               | **ABSENT**                     | Same root cause as 14/15                                                                                                                                                                                                                            |
| 17  | Completion taxonomy                         | **BLOCKED BY DECISION**        | No status model exists (P1-7); **INT-5**                                                                                                                                                                                                            |
| 18  | Incomplete-session handling                 | **BLOCKED BY DECISION**        | INT-5 + spec §8.2 (incomplete sessions in derived variables — explicitly requires approval)                                                                                                                                                         |
| 19  | Abandonment handling (session-level)        | **BLOCKED BY DECISION**        | INT-5 taxonomy; room-level abandonment events exist and are distinct                                                                                                                                                                                |
| 20  | Game version                                | **VERIFIED**                   | Param → `VITE_APP_VERSION` → `'unknown'` (`SessionState.ts:50-54`); asserted in launch spec                                                                                                                                                         |
| 21  | Event-schema version                        | **ABSENT**                     | No schema-version field anywhere in payloads or docs metadata                                                                                                                                                                                       |
| 22  | Scoring version                             | **ABSENT**                     | No `scoring_version`; D2 codebook scope                                                                                                                                                                                                             |
| 23  | Asset-set version                           | **BLOCKED BY DECISION**        | `ASSET_SET_VERSION` exists only in the engine console banner (`src/index.ts:20`); payload inclusion is **INT-6** (P1-8)                                                                                                                             |
| 24  | Production vs development separation        | **VERIFIED**                   | All debug surfaces `import.meta.env.DEV`-gated and grep-verified absent from the production bundle (technical gate §12; PS gate §5)                                                                                                                 |
| 25  | Test vs production separation               | **BLOCKED BY DECISION**        | No `launch_mode` flag; test sessions indistinguishable in data — INT-5                                                                                                                                                                              |
| 26  | Qualtrics return URL handling               | **PARTIAL**                    | `buildReturnUrl` implemented and verified (null on absent/whitespace/unparseable; appends all summary keys — ADV-6, lifecycle audit §3); **no production caller** (P0-1, INT-1); no scheme/host allow-list (INT-4/PS-0)                             |
| 27  | Return-parameter preservation               | **VERIFIED**                   | Original `return_url` query preserved, summary appended via `searchParams.set` (ADV-6; lifecycle audit §3)                                                                                                                                          |
| 28  | postMessage origin validation               | **ABSENT**                     | No postMessage code exists (grep); required only if INT-1 chooses the iframe option                                                                                                                                                                 |
| 29  | postMessage payload validation              | **ABSENT**                     | Same                                                                                                                                                                                                                                                |
| 30  | Summary-vs-raw separation                   | **VERIFIED**                   | `computeSummary` is pure, read-only over events (`ScoringManager.ts:75-224`); scoring-plan §6; state-continuity spec                                                                                                                                |
| 31  | Participant bundle status                   | **PARTIAL**                    | Safe artifact exists (`npm run bundle`: zero external hosts, relative base — technical gate §10-§11) but is not the documented canonical command; default `npm run build` ships unpkg+ribbon (**P1-6/PS-1**); stale template title/manifest (P2-10) |
| 32  | Development-only globals / debug interfaces | **VERIFIED**                   | `window.researchRuntime`, `__lastRoomFeedbackText`, `__playerProbe` all DEV-gated (`ResearchRuntime.ts:190`, `RoomScene.ts:185-188`); absent from bundle (gate §12; `1ad66c2` message re-confirms probe absence)                                    |
| 33  | Data-quality indicators                     | **PARTIAL**                    | Focus-loss captured and exported (`DataQualityTracker.ts`, `ScoringManager.ts:160-162`); `recordTechnicalError()` has **zero callers** (grep) → `technical_error_count` is permanently 0 (P2-13)                                                    |
| 34  | Inactivity handling                         | **BLOCKED BY DECISION**        | Idle watcher wired-disabled (`DockScene.ts:18`); idle definition/threshold is **D3**                                                                                                                                                                |
| 35  | Repeated-input handling                     | **VERIFIED**                   | `adversarial_input_spam.spec.ts` (one decision set per hammer; log intact); one-shot guards per room; historical green                                                                                                                              |

**Most consequential data-foundation gaps for the five-day window**: rows 13,
14/15/16, 17, 26 (the P0 cluster — all INT-decision-gated), then 10/11
(sequence/uniqueness, P1-9) and 31 (deployment artifact, the one gap that is
**not** decision-gated).

## 15. Actual static test-coverage audit

Inventory at `88a1635`: **23 spec files, 55 tests** (counted statically from
`e2e/*.spec.ts`; the viewport spec parametrises 5 desktop viewports + 1
narrow test). Support modules: `e2e/helpers.ts`, `e2e/journey.ts`. Suite not
executed by this audit.

Verification-status legend: latest committed full-suite evidence is
**55/55, zero retries, recorded in the `1ad66c2` commit message**
(one docs-only commit behind `88a1635`) — classified below as
**HISTORICALLY VERIFIED** (HV@1ad66c2). Earlier: 49/49 ×2 at `24afcad`
(gate §5–§6); 28/28 at the Hazard beat; 24/24 at Wave 1B.

| Group / spec                                                | Covers                                   | Behavioural path                                                                                      | Event/state assertions                                                                            | Opp/Choice/Process/Outcome | Key missing assertions                                                                                                           | Flake risk (documented)                                                                                                   | Status                                                                            |
| ----------------------------------------------------------- | ---------------------------------------- | ----------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- | -------------------------- | -------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| **Launch/session** `launch_with_research_params` (3)        | QualtricsBridge, SessionState, debug API | 5-param launch; debug surface; missing-param fallback                                                 | params on every event; return URL built; fallback IDs                                             | Opp n/a; outcome yes       | timestamp fields                                                                                                                 | none                                                                                                                      | HV@1ad66c2                                                                        |
| `participant_lifecycle` (2)                                 | launch failure paths                     | bare launch; malformed return_url                                                                     | fallback identity; null return, no crash                                                          | outcome                    | whitespace identity (INT-3, frozen elsewhere)                                                                                    | none                                                                                                                      | HV@1ad66c2                                                                        |
| `state_session_continuity` (4)                              | SessionState, SceneRouter                | reload; direct room launch; unknown `?scene=`; door transition purity                                 | metadata preserved; `current_room_id`; summary purity                                             | process+outcome            | —                                                                                                                                | none                                                                                                                      | HV@1ad66c2                                                                        |
| **Movement/world** `movement_and_first_interaction` (1)     | Dock                                     | movement, first interaction, tutorial                                                                 | canonical dock events + fold metadata                                                             | opp+choice+process         | idle family (blocked D3)                                                                                                         | none                                                                                                                      | HV@1ad66c2                                                                        |
| `connected_world_smoke` (1)                                 | all transitions                          | Dock→Hub→8 stations→Dock                                                                              | entry events per room                                                                             | process                    | —                                                                                                                                | long (264 s), within budget                                                                                               | HV@1ad66c2                                                                        |
| `connected_participant_journeys` (3)                        | whole world                              | P1 adaptive / P2 shortcut+interrupted / P3 avoid+defer full sessions                                  | event subsequences, mission state, summary spot checks, zero console errors                       | all four layers            | —                                                                                                                                | long (195–266 s)                                                                                                          | HV@1ad66c2                                                                        |
| **Room/task + choice + logging** `archive_room_logging` (2) | Archive                                  | adaptive path; blind retry                                                                            | event order, pinned `study_item_ids`/`construct_id`/`success`                                     | opp+choice+process+outcome | `archive_returned_after_failure` (covered by ADV-3 instead); `archive_log_compared` untested                                     | none                                                                                                                      | HV@1ad66c2                                                                        |
| `repair_room_logging` (4)                                   | Repair                                   | adaptive; blind retry; manual station; abandon/return; `objective_completed` once                     | pinned contexts; parity event once                                                                | all four                   | `task_started` n/a (D7)                                                                                                          | none                                                                                                                      | HV@1ad66c2                                                                        |
| `engineer_hub_logging` (2)                                  | Engineer Hub                             | prepared+accept; unprepared+decline                                                                   | duty state in mission state; pinned Q09/Q10 contexts                                              | opp+choice+outcome         | clarify path (journey P3 covers partially); accuracy (unimplemented)                                                             | none                                                                                                                      | HV@1ad66c2                                                                        |
| `inventory_prep_logging` (3)                                | Inventory                                | shortcut; systematic+verify+tidy; skip-verify+disorder                                                | kit/workspace SessionState; pinned Q01/Q02/Q04/Q30 contexts                                       | all four                   | per-item events (unimplemented)                                                                                                  | none                                                                                                                      | HV@1ad66c2                                                                        |
| `hazard_control_logging` (4)                                | Hazard                                   | informed; reckless (+live metadata); avoid (D1); leave-and-return                                     | pinned Q12/**Q27/Q31** contexts (stale-by-SA-1/SA-3 but correct vs current schema); hazard_status | all four                   | consequence events (unimplemented)                                                                                               | 1 pass-on-retry historically (cold boot)                                                                                  | HV@1ad66c2                                                                        |
| `side_repair_logging` (3)                                   | Side Repair                              | complete; defer-reopen; ignore                                                                        | accept/start decomposition; pinned Q07/Q16/Q20/**Q29/Q32** contexts                               | opp+choice+outcome         | steps (unimplemented)                                                                                                            | none                                                                                                                      | HV@1ad66c2                                                                        |
| `interruption_corridor_logging` (3)                         | Interruption                             | switch; return (+`objective_active`); ignore                                                          | pinned Q15/Q17/Q18/Q08 contexts; interruption_status                                              | opp+choice+outcome         | real-return process (unimplemented)                                                                                              | none                                                                                                                      | HV@1ad66c2                                                                        |
| `final_core_summary` (3)                                    | Final Core                               | missing-kit blocker+force (Q28); resolve+duty completion (Q10); rushed+duty unresolved                | system flags; pinned **Q33**/Q28/Q11 contexts; summary fields                                     | all four                   | scoring-layer events (unimplemented)                                                                                             | none                                                                                                                      | HV@1ad66c2                                                                        |
| **Adversarial/regression** ADV-1 session isolation (1)      | cross-session                            | second participant same tab                                                                           | no inherited events/state                                                                         | —                          | —                                                                                                                                | none                                                                                                                      | HV@1ad66c2                                                                        |
| ADV-2 reload partial state (1)                              | reload                                   | mid-room reload                                                                                       | no phantom return-after-failure                                                                   | —                          | —                                                                                                                                | none                                                                                                                      | HV@1ad66c2                                                                        |
| ADV-3 archive abandon/return (1)                            | Archive edge                             | repeat abandon/return cycles                                                                          | per-departure classification; stops after completion                                              | process                    | —                                                                                                                                | historically slow (126 s)                                                                                                 | HV@1ad66c2                                                                        |
| ADV-4 hazard repeat decisions (1)                           | Hazard edge                              | repeated decisions                                                                                    | per-selection logging; last-write status                                                          | process                    | —                                                                                                                                | none                                                                                                                      | HV@1ad66c2                                                                        |
| ADV-6 hostile launch (3)                                    | launch hardening                         | duplicate/oversized/encoded, empty-string, hostile return_url                                         | deterministic resolution; **freezes P1-5 pending INT-3**; scheme pass-through (INT-4 open)        | —                          | scheme allow-list (blocked INT-4)                                                                                                | none                                                                                                                      | HV@1ad66c2                                                                        |
| ADV-7 input spam (2)                                        | input integrity                          | option-key hammering; SPACE spam                                                                      | exactly one decision set; ordered intact log                                                      | process                    | —                                                                                                                                | none                                                                                                                      | HV@1ad66c2                                                                        |
| ADV-8 direct launch + navigation (1)                        | routing                                  | `?scene=side_repair` then doors                                                                       | normal flow after direct launch                                                                   | —                          | —                                                                                                                                | none                                                                                                                      | HV@1ad66c2                                                                        |
| ADV-5 status board display (1)                              | Hub board vs SessionState                | board text across completion/defer/hazard states                                                      | byte-for-byte board rendering                                                                     | outcome                    | —                                                                                                                                | **was flaky** (fixed-duration nav); stabilized via `__playerProbe` position sync at `1ad66c2`; 5/5 + 55/55 recorded there | HV@1ad66c2                                                                        |
| **Viewport/a11y** `participant_viewport_display` (6)        | display contract                         | 5 desktop viewports + 375×667                                                                         | canvas fits, 4:3, no horizontal overflow, zero console errors                                     | —                          | —                                                                                                                                | none                                                                                                                      | HV@1ad66c2 (added `8605dc2`; run recorded in participant-experience gate + 55/55) |
| **Data lifecycle / Qualtrics / scoring output**             | —                                        | covered indirectly (launch specs, `completeDebugSession` in launch spec, journey summary spot-checks) | —                                                                                                 | —                          | **No dedicated production return/export specs — cannot exist until INT-1/2/5 land** (planned ADV-9/10/11 unbuilt, documented P2) | —                                                                                                                         | ABSENT (planned)                                                                  |

Known coverage debt (from `RESEARCH-TRACEABILITY-MATRIX.md` §5, still
accurate by static inspection): 10 ScoringManager input events referenced by
no spec (e.g. `archive_attempt`, `engineer_clarification_requested`,
`inventory_kit_verified`, `side_repair_abandoned_after_difficulty`) and 17
emitted events with no direct spec reference (incl. registered Q24/Q25 event
`archive_returned_after_failure`).

## 16. Stale-implementation findings

Live artefacts materially conflicting with the final behavioural
specification. None may be corrected autonomously; every correction is gated
as shown. Tests that pin these registrations are correct against the current
schema and must be updated **in the same ruled pass**, never before.

| ID   | File:line                                                                                                                                 | Symbol / registration                                                                                                 | Current behaviour                                                    | Governing newer decision                                      | Scientific consequence                                          | Data consequence                                                    | Gated by                                            | Minimum correction boundary            | Files affected when corrected                              |
| ---- | ----------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------- | ------------------------------------------------------------- | --------------------------------------------------------------- | ------------------------------------------------------------------- | --------------------------------------------------- | -------------------------------------- | ---------------------------------------------------------- |
| S-1  | `src/world/CanonicalEventContext.ts:220-224`                                                                                              | `hazard_reckless_continue` → `['Q12','Q27','Q31']`, `inappropriate_persistence`                                       | Hazard recklessness carries Q27+Q31                                  | Spec §Q27/§Q31; authority §6                                  | Q27 measured as prudence-failure; Q31 confounded with risk      | Event tags mislabel item linkage in every export                    | **SA-1**, SA-3                                      | Registration edit (tag set per ruling) | CEC, `hazard_control_logging.spec.ts`, traceability matrix |
| S-2  | `src/world/CanonicalEventContext.ts:201-203`                                                                                              | `hazard_info_checked` → `['Q12','Q27']`                                                                               | Info-checking carries Q27                                            | Same                                                          | Same as S-1                                                     | Same                                                                | **SA-1**                                            | Registration edit                      | Same                                                       |
| S-3  | `src/systems/ScoringManager.ts:80-83,102`                                                                                                 | `hazard_reckless_continue` term inside `blind_retry_count` → `game_inappropriate_persistence`                         | Superseded Q27 interpretation is live in an approved-formula context | Spec §Q27 (utility-stop primary)                              | Inappropriate-persistence composite partially measures prudence | Summary variable exported to Qualtrics preview carries the confound | **SA-1 + scoring-plan**                             | Formula term decision (D2-adjacent)    | ScoringManager, scoring-plan.md, specs                     |
| S-4  | `src/world/CanonicalEventContext.ts:211-214`                                                                                              | `hazard_informed_continue` → `['Q31']`, `goal_time_exploratory`                                                       | Old immediate-vs-informed Q31 proxy                                  | Spec §Q31 (shared balanced module)                            | Goal-horizon inferred from prudence behaviour                   | Mislabelled item linkage                                            | **SA-3**                                            | Registration edit                      | CEC, hazard spec                                           |
| S-5  | `src/world/CanonicalEventContext.ts:303-305,331-334`                                                                                      | `inventory_verification_skipped` → `['Q02','Q30']`; `inventory_verified_complete` → `['Q30']`                         | Q30 inferred from skipped preparation                                | Spec §Q30 (**prohibited inference**)                          | Directly violates approved Q30 rationale                        | Mislabelled item linkage                                            | **SA-4**                                            | Registration edit (Q30 tags)           | CEC, `inventory_prep_logging.spec.ts`                      |
| S-6  | `src/world/CanonicalEventContext.ts:468-470,489-492,496-498`                                                                              | `final_core_rushed`/`final_core_issue_resolved`/`final_core_completed` Q33 tags                                       | Q33 inferred from rushing/resolution                                 | Spec §Q33 (**prohibited inference**)                          | Violates approved Q33 rationale                                 | Mislabelled item linkage                                            | **SA-6**                                            | Registration edit (Q33 tags)           | CEC, `final_core_summary.spec.ts`                          |
| S-7  | `src/world/CanonicalEventContext.ts:364-371,501-504`                                                                                      | `stabiliser_option_offered`/`stabiliser_accepted`/`final_core_stability_bonus` → `['Q29']`                            | Old delayed-benefit Q29 proxy                                        | Spec §Q29 (balanced shared module)                            | Q29 evidence from an unbalanced, virtue-loaded option           | Mislabelled item linkage                                            | **SA-3**                                            | Registration edit                      | CEC, side-repair + final-core specs                        |
| S-8  | `src/world/CanonicalEventContext.ts:351-353,373-376`                                                                                      | `side_repair_completed`/`final_bonus_unlocked` Q32 tags                                                               | Weak extended-goal proxy tags, unconfirmed                           | Authority §6 Q32                                              | Pending confirmation, not prohibited                            | Pending                                                             | **SA-5**                                            | Confirm/remove tags                    | CEC, side-repair spec                                      |
| S-9  | `src/systems/ScoringManager.ts:84-87`                                                                                                     | `strategy_revision_count` = archive+repair revision **+ `hazard_info_checked`**                                       | Prudence signal mixed into a revision variable                       | Scoring-plan §4 watch item; V3 §1 rule (construct separation) | Construct mixing (adaptive persistence × prudence)              | Exported composite is contaminated                                  | **D2 sub-item 1**                                   | Formula split                          | ScoringManager, scoring-plan.md                            |
| S-10 | `src/scenes/InterruptionScene.ts:145-151,164-169,181-186`; `src/scenes/EngineerScene.ts:134-137`; `src/scenes/SideRepairScene.ts:148,186` | Derived-style raw events (`interruption_focus_lost`, `engineer_responsibility_adaptive`, `side_repair_low_effort`, …) | Interpretation asserted at log time                                  | scoring-plan §9 raw-vs-derived rule                           | Raw log is not strictly behavioural                             | Analysts must exclude/re-derive                                     | Room-rebuild beats (pre-existing, catalogued)       | Per-room rebuild                       | Scenes, ScoringManager, specs                              |
| S-11 | `docs/research/event-schema.md` §4 Archive rows; `docs/research/scoring-plan.md:66` and §5                                                | Six Archive events marked "missing" though emitted; force-continue "not implemented yet"; data-quality "dropped"      | Stale doc status rows                                                | D2 pack §4 (catalogued)                                       | None (doc drift only)                                           | Confusion risk for implementers                                     | Entangled with D2 — refresh deferred by design      | Doc refresh in the D2 pass             | event-schema.md, scoring-plan.md                           |
| S-12 | `docs/research/MASTER_33_ALIGNMENT.md` Q27/Q29–Q33 rows + V3 §5 same rows                                                                 | Superseded mechanic rationales                                                                                        | Historical rationale, live registration mirror                       | Authority §8 (recorded, kept deliberately)                    | None while treated as evidence-only                             | None                                                                | SA-1…SA-6 (registrations); the docs stay as history | Not to be rewritten to erase history   |

## 17. SA-1 – SA-7 dependency review

All seven remain **OPEN** research-owner decisions (authority doc §9.1).
None was resolved, narrowed, or reinterpreted by this audit.

| SA       | Status | Implementation evidence making it relevant                                                          | Q-items                                       | Rooms/systems                              | Event-schema entries                                                                            | Scoring-plan entries                                                 | Useful work possible without it?                | Minimum ruling needed                                                             | Consequence if deferred past the 5-day window                                   |
| -------- | ------ | --------------------------------------------------------------------------------------------------- | --------------------------------------------- | ------------------------------------------ | ----------------------------------------------------------------------------------------------- | -------------------------------------------------------------------- | ----------------------------------------------- | --------------------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| **SA-1** | OPEN   | S-1/S-2/S-3 above (live tags + scoring term)                                                        | Q12, Q27, Q31                                 | Hazard; ScoringManager                     | `hazard_reckless_continue`, `hazard_info_checked` tag sets                                      | `blind_retry_count`/`game_inappropriate_persistence` term membership | Yes — everything except Q27/Hazard re-tagging   | Keep/drop Q27 (and Q31) on the two events; keep/drop the scoring term             | Pilot Q27 game data unusable under approved rationale; questionnaire unaffected |
| **SA-2** | OPEN   | No utility-stop mechanic in `src/` (grep: no candidate names anywhere)                              | Q27                                           | Side Repair / diagnostic arc (per spec)    | All utility-stop candidates                                                                     | `excess_continuation_count` etc. (candidates)                        | Yes — Q27 stays questionnaire-covered meanwhile | Approve mechanic + canonical names + inappropriate-persistence feeding            | Q27 has no valid game analogue in pilot; acceptable only if declared            |
| **SA-3** | OPEN   | S-4/S-7; Q31 only on Hazard; Q29 on stabiliser events                                               | Q29, Q31 (+Q32 derived)                       | Side Repair, Final Core, (new module site) | Horizon-choice candidates; existing Q29/Q31 tags                                                | Single shared `goal_horizon_preference` (candidate)                  | Yes                                             | Approve module, events, the **one** shared variable, and disposition of live tags | Q29/Q31 game analogues absent/invalid in pilot; exploratory anyway              |
| **SA-4** | OPEN   | S-5 (prohibited Q30 inference live)                                                                 | Q30 (+Q02 co-tag unaffected)                  | Inventory                                  | `inventory_verification_skipped`/`inventory_verified_complete` Q30 tags; granularity candidates | granularity variable (candidate)                                     | Yes                                             | Remove/retain Q30 tags; approve granularity module                                | Q30 game data invalid in pilot if tags stay                                     |
| **SA-5** | OPEN   | S-8 (Q32 tags live, unconfirmed)                                                                    | Q32                                           | Side Repair                                | Two Q32 tags                                                                                    | None (no proxy variable authorised)                                  | Yes                                             | Confirm tags may remain as weak-proxy telemetry                                   | Low — tags are raw telemetry; flag in any analysis                              |
| **SA-6** | OPEN   | S-6 (prohibited Q33 inference live)                                                                 | Q33                                           | Final Core                                 | Three Q33 tags; portfolio candidates                                                            | portfolio variable (candidate)                                       | Yes                                             | Remove/retain Q33 tags; authorise/decline portfolio (after SA-3/SA-4)             | Q33 game data invalid in pilot if tags stay                                     |
| **SA-7** | OPEN   | No label mechanism exists in summary output (scoring-plan §8 both options undecided; D2 sub-item 4) | Q18, Q20 (pattern extends to all exploratory) | ScoringManager / Qualtrics summary         | None                                                                                            | Label mechanism + exact label text                                   | Yes                                             | Confirm label text + mechanism (suffix vs parallel map)                           | Exploratory fields reach Qualtrics unlabelled — analyst-misuse risk             |

**Net effect on the five-day plan**: none of SA-1…SA-7 blocks the
participant-ready _technical_ prototype (launch → play → complete → return).
They block _scientific validity of the Q27/Q29–Q33 game analogues_, which
are exploratory/questionnaire-primary. Recommended handling: ship the ruling
requests (they are already drafted in the authority doc §9.1 with evidence)
alongside the INT/D2 requests on day 1, but do not put them on the build
critical path.

## 18. Blocked versus unblocked work

### 18.1 UNBLOCKED (existing authority sufficient)

| Work                                                                                                                                | Why authority is sufficient                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| ----------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **U-A. Canonical participant deployment artifact + shell-metadata cleanup** (P1-6/PS-1/P2-10)                                       | Pure config/infrastructure. No scientific mapping, event, registration, formula, weight, direction, or ruling involved. The correct artifact behaviour is already proven (`npm run bundle`, technical gate §10–§13); the work is making it the single documented command and removing template shell metadata (`index.html` title/manifest/icons/gtag gating). Both gates explicitly scope this as config work ("Sonnet/config", gate §17)                                                            |
| **U-B. Global error boundary → `DataQualityTracker.recordTechnicalError()`** (P2-13)                                                | The covariate field `data_quality_technical_error_count` already exists in the approved summary shape and flows through `ComputeSummaryInput` (`ScoringManager.ts:14,162`); the tracker method exists (`DataQualityTracker.ts:52`) with zero callers. Wiring `window.onerror`/`unhandledrejection` to it adds **no event, no mapping, no formula** — it makes an existing approved control variable actually populate. Data-quality covariates are explicitly separated from trait signal (AGENTS.md) |
| U-C. Test-coverage additions for already-emitted, already-registered events (matrix §5 list, e.g. `archive_returned_after_failure`) | Specs assert committed registrations verbatim (frozen-data rule, `helpers.ts:399-412`); no new science.                                                                                                                                                                                                                                                                                                                                                                                               |
| U-D. Inventory per-item mini-game (Q01–Q03 substrate)                                                                               | Canonical event names exist in the approved schema (`inventory_item_sorted_correct`, `inventory_item_misplaced`, `wrong_tool_selected` — event-schema §4) and are already registered with Q-items/constructs (CEC:289-317). Requires a `psychometric-task-design` gate for the interface, but **no new name, mapping, or formula**. Larger than one session — sequence after U-A/U-B                                                                                                                  |
| U-E. Interruption/Q15 real return-route mechanic                                                                                    | Same shape as U-D: canonical events registered (`return_to_unfinished_task` CEC:397-400) and schema-listed; mechanic named in V3 §4 Room 7. Task-design care required (interacts with D6-adjacent events — those stay unemitted); no new schema entries needed for the core Q15 pair                                                                                                                                                                                                                  |

### 18.2 BLOCKED (exact decision named)

| Work                                                                                                                                                                | Blocking decision                                                                                                              |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| Production completion → Qualtrics return mechanism (incl. end-of-experience screen)                                                                                 | **INT-1** (mechanism), with **INT-4** (return scheme/host allow-list, PS-0) and **INT-3** (empty identity) recommended jointly |
| Raw-event export channel                                                                                                                                            | **INT-2**                                                                                                                      |
| Completion/launch/export status taxonomy (incl. `launch_mode`, incomplete-session handling)                                                                         | **INT-5**                                                                                                                      |
| Durable persistence / reload & crash recovery (mechanism + payload effects)                                                                                         | **P0-3 ruling**, entangled with INT-2 (Option E)                                                                               |
| `asset_set_version` in payloads                                                                                                                                     | **INT-6**                                                                                                                      |
| Event sequence numbers / event IDs (payload-contract change)                                                                                                        | Event-schema decision (P1-9; the canonical payload §1 has no such field — adding one is a schema edit)                         |
| Beat-13 scoring bundle: `final_core_force_continue` 4th term; `strategy_revision_count` split; `final_quality_score` shape; exploratory-label mechanism             | **D2** (sub-items 1–4; SA-7 supplies the label text)                                                                           |
| Dock/corridor idle family (`baseline_idle_seconds`, `tutorial_help_shown`, `excessive_idle_after_instruction`)                                                      | **D3**                                                                                                                         |
| Q24/Q25 `construct_id`                                                                                                                                              | **D4**                                                                                                                         |
| `engineer_report_submitted_supervised` mapping                                                                                                                      | **D5**                                                                                                                         |
| `interruption_alert_acknowledged` vs `competing_task_viewed`                                                                                                        | **D6**                                                                                                                         |
| `task_started` emission (Q05)                                                                                                                                       | **D7**                                                                                                                         |
| Hazard consequence events (`hazard_issue_created`/`_resolved`, `final_hazard_issue`)                                                                                | UD-HAZARD-CONSEQUENCE (user-owned semantics)                                                                                   |
| Q27 utility-stop module; Hazard Q27/Q31 re-tagging; Q29/Q31 horizon module; Q30 granularity module + tag removal; Q32 tag confirmation; Q33 tag removal + portfolio | **SA-1…SA-6** respectively (see §17)                                                                                           |
| event-schema.md / scoring-plan.md stale-row refresh                                                                                                                 | Deferred by design — entangled with D2 (authority doc §8)                                                                      |

Nothing above is classified unblocked on the strength of candidate names in
the measurement specification.

## 19. Five-unit implementation priority

Units are bounded, in dependency order, each completable and verifiable on
its own. Realistic for five days **provided the day-1 ruling requests go
out** (INT-1/2/5 + INT-3/4/6 + D2/SA-7; SA-1…SA-6 in parallel but off the
critical path).

### Unit 1 — Canonical participant deployment artifact (UNBLOCKED, LOW risk)

- **Objective**: make the participant-safe bundle the single documented
  deployment command and remove participant-visible template shell metadata:
  gate/remove the unpkg script + GitHub ribbon path from the participant
  flow (already stripped by `BUNDLE=true`), fix `<title>` to the committed
  product name ("Remote Outpost Assessment", already used in
  `src/index.ts:15`), clean `public/manifest.json`/icon leftovers, and gate
  the inert gtag stub.
- **Why first**: only P-cluster item that is fully decision-independent;
  every supervised test and the eventual pilot serve this artifact; closes
  PS-1 and P2-10.
- Q-items/controls: none (infrastructure); no scientific surface.
- Source files: `index.html`, `public/manifest.json` + icons, optionally
  `vite.config.mts` (base), docs (README/deployment note). **Not**
  `package.json`.
- Existing tests to change: none expected (no spec asserts the title).
  New verification: artifact grep set from technical gate §21 + §13
  production smoke method.
- Event-schema dependency: none. Scoring-plan: none. Research-owner: none.
  Deployment dependency: none.
- Exclusions: no INT-1 return work, no persistence, no scoring, no src/
  gameplay changes.
- Done criteria: bundle `dist/index.html` has zero external hosts,
  participant-appropriate title, relative base; build+tsc pass; deployment
  command documented in one place.
- Verification: artifact inspection greps; optional nested-path static-host
  check (gate §13 method).
- State: **UNBLOCKED**.

### Unit 2 — Technical-error covariate wiring (UNBLOCKED, LOW risk)

- **Objective**: register global `window.onerror` + `unhandledrejection`
  handlers (in `ResearchRuntime.start()` or a small module) that call
  `dataQualityTracker.recordTechnicalError()`, so
  `data_quality_technical_error_count` stops being permanently zero.
- Why second: pre-pilot data-quality covariate (P2-13); tiny, isolated,
  no decisions; strengthens the "technical interruption ≠ behavioural
  non-performance" control required by spec §1.3.
- Q-items/controls: control variable only.
- Source files: `src/systems/ResearchRuntime.ts` (or new small module),
  possibly `DataQualityTracker.ts` (no shape change).
- Tests: one new spec (inject a page error in DEV; assert the summary field
  increments); existing specs unchanged.
- Dependencies: none (field already approved in the summary shape and
  wired through `ComputeSummaryInput`).
- Exclusions: no new events, no logging of error _content_ (privacy), no
  taxonomy.
- Done criteria: injected error increments the covariate; suite unaffected.
- Verification: new spec + `lint:tsc` + build.
- Risk LOW. State: **UNBLOCKED**.

### Unit 3 — Production completion → return → export pipeline (BLOCKED, MEDIUM–HIGH risk)

- **Objective**: implement the ruled INT-1 completion/return mechanism +
  INT-5 status taxonomy + INT-2 export envelope (+ INT-3 empty-identity and
  INT-4 allow-list if ruled together), giving participants a real
  end-of-experience and Qualtrics a real payload.
- Why third: the single highest-value participant-readiness item (P0-1,
  P0-2, P1-7); cannot start until Unit-0 rulings land — hence the day-1
  request.
- Q-items: none directly; all summary variables transit it.
- Source: `QualtricsBridge`, `ResearchRuntime`, `FinalCoreScene` (completion
  trigger + `qualtrics_return_previewed`-family events per ruling),
  `SessionState`.
- Tests: new production-path specs (planned ADV-9/10/11 family); launch
  spec updates.
- Dependencies: **INT-1, INT-2, INT-5 (blocking), INT-3/INT-4 (jointly
  recommended), INT-6 optional**; event-schema decision for any new
  logged event.
- State: **BLOCKED** (research-owner rulings).

### Unit 4 — Durable persistence + recovery (BLOCKED, MEDIUM risk)

- **Objective**: implement the ruled persistence mechanism (P0-3; INT-2
  Option-E-compatible buffer if so ruled) with reload/crash recovery
  semantics and, if ruled, sequence numbers.
- Why fourth: protects the data the Unit-3 pipeline transports; ordering
  after Unit 3 follows the gate's dependency plan (§18 of the technical
  gate; buffer design depends on the export ruling).
- Dependencies: **P0-3/INT-2 ruling**; payload changes (sequence numbers)
  need an event-schema decision.
- State: **BLOCKED**.

### Unit 5 — Beat-13/D2 scoring bundle (BLOCKED, MEDIUM risk)

- **Objective**: apply the D2 rulings — `final_core_force_continue` 4th
  term, `strategy_revision_count` prudence split (S-9), `final_quality_score`
  shape, exploratory-label mechanism with SA-7 text — plus the entangled
  event-schema/scoring-plan doc refresh (S-11).
- Why fifth: scoring shape should settle before pilot export freezes the
  codebook; after Unit 3 so the export envelope exists.
- Dependencies: **D2 (+SA-7)**.
- State: **BLOCKED**.

(If rulings are delayed, U-D — the Inventory per-item mini-game — is the
designated unblocked fallback after Units 1–2, as one bounded room pass under
`psychometric-task-design` + `room-builder`.)

## 20. Recommended first implementation unit

**Unit 1 — Canonical participant deployment artifact + shell-metadata
cleanup** (§19 Unit 1; operational detail in
`docs/ai/NEXT-FABLE-IMPLEMENTATION-UNIT.md`).

It is scientifically coherent (touches no scientific surface at all),
currently unblocked (no INT/D/SA dependency — verified against §18.2),
valuable toward a participant-ready prototype (the artifact every
participant-facing session must serve; closes PS-1/P1-6 and P2-10, two of
the named pre-pilot gate blockers), one shared-system unit, testable in
isolation via artifact inspection without any other unit, free of SA-1…SA-7
dependencies, and narrow enough for one focused session.

## 21. Five-day development implications

- **Day 1 (critical path)**: research owner receives the ruling requests —
  INT-1/INT-2/INT-5 (+INT-3/INT-4/INT-6) and D2 (+SA-7). These packs already
  exist (`docs/decisions/QUALTRICS-INTEGRATION-DECISION-PACK.md`,
  `docs/decisions/D2-BEAT13-SCORING-DECISION-PACK.md`,
  `docs/decisions/RESEARCH-OWNER-RULING-FORM.md`); no drafting work remains.
  In parallel: implement Unit 1.
- **Day 2**: Unit 2; if rulings land, start Unit 3.
- **Days 3–4**: Unit 3 (completion/return/export) + its adversarial specs;
  Unit 4 if persistence is ruled.
- **Day 5**: Unit 5 (D2 scoring) if ruled; full-suite regression ×2; formal
  pilot-readiness re-gate.
- If INT rulings do **not** arrive by day 2, the prototype cannot become
  participant-ready within the window by any amount of coding — that is the
  single most important schedule fact in this audit. The unblocked fallback
  work (U-C, U-D) improves measurement substrate but not readiness.
- SA-1…SA-6 rulings can land any time; each is a small registration edit
  plus coordinated spec updates, safely insertable between units. Without
  them, Q27/Q29–Q33 game analogues must be declared invalid/unconfirmed in
  any pilot analysis (they remain questionnaire-covered).

## 22. Limitations and uncertainties

- Static audit: no build, typecheck, or test execution; all "green"
  statements are historical (§15). The most recent full-suite evidence
  (55/55) is recorded in the `1ad66c2` commit message rather than a
  dedicated evidence file.
- Test-count (55) was derived by static counting of `test(` blocks including
  the 5-viewport parametrised loop; `--list` was not run.
- Line numbers cite the tree at `88a1635` and will drift with future edits.
- The external locked battery (`Original_question_items`) was not re-read;
  source-scale IDs and item meanings are taken from the specification's own
  crosswalk (tier-1-derived content inside the tier-2 document).
- Whether the specification's richer candidate designs (e.g. Q18 three-stage
  calibration, Q20 anomaly arc) _should_ be built is a research-owner
  question; this audit classifies against the approved decisions, under
  which the current weak-proxy implementations are consistent.
- No Firefox/WebKit evidence exists anywhere (participant-experience gate);
  cross-browser comparability is an open external item (X-list).

## 23. Research-owner decision queue references

- `docs/ai/SCIENTIFIC-AUTHORITY-AND-OPEN-DECISIONS.md` §9 — SA-1…SA-7,
  D2–D8, INT-1…INT-6 (authoritative queue; nothing here reopens or resolves
  any entry).
- `docs/decisions/QUALTRICS-INTEGRATION-DECISION-PACK.md` — INT-1/2/5
  options and recommendations (not yet authorised).
- `docs/decisions/D2-BEAT13-SCORING-DECISION-PACK.md` — D2 decomposition.
- `docs/decisions/RESEARCH-OWNER-RULING-FORM.md` — ruling channel.

## 24. Evidence index (most load-bearing sources)

| Evidence                                      | Path                                                                                                                                                                 |
| --------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Final behavioural specification               | `docs/scientific/Q01-Q33_GAMIFIED_MEASUREMENT_SPECIFICATION.md`                                                                                                      |
| Authority + open decisions                    | `docs/ai/SCIENTIFIC-AUTHORITY-AND-OPEN-DECISIONS.md`                                                                                                                 |
| Approved event schema                         | `docs/research/event-schema.md`                                                                                                                                      |
| Approved scoring plan                         | `docs/research/scoring-plan.md`                                                                                                                                      |
| V3 build contract                             | `docs/ai/fable-claude-final-game-build-contract-v3.txt`                                                                                                              |
| Live registrations                            | `src/world/CanonicalEventContext.ts`                                                                                                                                 |
| Research systems                              | `src/systems/{EventLogger,SessionState,ResearchRuntime,ScoringManager,QualtricsBridge,DataQualityTracker}.ts`                                                        |
| Room scenes                                   | `src/scenes/{Dock,Hub,Archive,Repair,Engineer,Inventory,Hazard,SideRepair,Interruption,FinalCore}Scene.ts` + `src/world/RoomScene.ts`                                |
| Test suite                                    | `e2e/*.spec.ts` (23 files, 55 tests) + `e2e/helpers.ts`, `e2e/journey.ts`                                                                                            |
| Technical gate (49/49 ×2, P0/P1/P2 register)  | `docs/ai/OPUS-OVERNIGHT-PRE-PILOT-TECHNICAL-GATE.md`                                                                                                                 |
| Privacy/security gate (PS register)           | `docs/ai/OPUS-PRE-PILOT-PRIVACY-SECURITY-GATE.md` + `docs/security/RESEARCH-DATA-PRIVACY-THREAT-MODEL.md`                                                            |
| Participant-experience gate (55/23 inventory) | `docs/ai/OPUS-PARTICIPANT-EXPERIENCE-ACCESSIBILITY-GATE.md`                                                                                                          |
| Latest full-suite evidence (55/55)            | commit message of `1ad66c2`                                                                                                                                          |
| Pre-existing machine-validated traceability   | `docs/research/RESEARCH-TRACEABILITY-MATRIX.md` (predates the final specification — its Q27/Q29–Q33 "implemented" statuses are relative to the superseded rationale) |
| Lifecycle audit                               | `docs/architecture/PARTICIPANT-LIFECYCLE.md`                                                                                                                         |
| Decision packs                                | `docs/decisions/*.md`                                                                                                                                                |
