# Wave 1B Verification Plan — Consolidated Runtime Verification

Date: 2026-07-12 · Branch `fable-autonomous-game-build-v1` · Base commit
`7a76cf4` (Wave 1A build phase complete). Companion documents:
`ACTIVE-EXPANSION-STATE.md` (live state), `EXPANSION-WAVE-1-PLAN.md`
(build-phase plan), `REMAINING-STATION-INVENTORY.md` (station facts),
`docs/testing/playwright-smoke-plan.md` (suite principles).

Purpose: everything a `playwright-game-verify` pass needs to convert the six
Wave 1A rooms from "implemented, compile-verified" to "verified working" —
with zero scientific decisions taken in the process. This document changes no
mappings, formulas, semantics, stimuli, thresholds, or event contracts.

## 1. Preparation gate results (this session)

- `npm.cmd run build` — **PASS** (only the pre-existing chunk-size warning).
- `npm.cmd run lint:tsc` — **PASS** (zero errors).
- All `study_item_ids` / `construct_id` / `success` values pinned by the six
  Wave 1A specs were statically cross-checked against the frozen
  `CANONICAL_EVENT_CONTEXT` (`src/world/CanonicalEventContext.ts`) — **all
  match**; no spec pins a value the registry does not commit.
- ~~`window.researchRuntime.sessionState` is a public readonly field on
  `ResearchRuntime` (`src/systems/ResearchRuntime.ts:32`), so the specs'
  `sessionState.getMissionState()` probes are valid dev-mode API usage.~~
  **Corrected during the verification pass:** the class field exists, but
  the `window.researchRuntime` helper is a 6-method literal that never
  exposed it. Resolved by the gated additive `getMissionState()` debug
  method — see `docs/testing/wave1b-verification/WAVE1B-EVIDENCE.md` §3.
- Baseline fixtures `docs/testing/baseline-e8a8994/*.json` contain **no**
  `side_repair_completed` or `final_core_status_reviewed` events (verified by
  content grep) — see §5 for what "re-baseline" therefore actually means.

## 2. Suite mechanics

- Config: `playwright.config.ts` — testDir `./e2e`, serial (`workers: 1`),
  retries 1, viewport 800×600, dev server auto-start on
  `http://localhost:5173` (`reuseExistingServer: true`).
- Run all: `npx playwright test` · one room: `npx playwright test
e2e/<spec>.spec.ts`.
- Input discipline (verified V1 rule, `e2e/helpers.ts`): every key HELD
  ≥150 ms; every movement leg overshoots into a clamping wall; room entry
  waits on the room's canonical entry event via `waitForRoomEntry`, never a
  fixed timeout.

## 3. Wave 1A room inventory (expected behaviour per room)

Legend: entry = canonical entry event awaited by the spec; route = the
`hubToStationDoor` case in `e2e/helpers.ts` (all routes are untuned
choreography — see §4).

### 3.1 Systems Repair Room — `e2e/repair_room_logging.spec.ts`

- **Scene/route**: `RepairScene`, `?scene=repair`, room_id
  `systems_repair_room`. Hub door top wall x 320; entry
  `repair_room_entered`; return to Hub via bottom door →
  `station_hub_entered`.
- **Controlled choices** (3-option prompt, fixed order): 1 = default
  sequence (deterministic scripted failure), 2 = open repair manual,
  3 = revised sequence (success). Separate `repairManualStation`
  interactable (manual opened/page reviewed).
- **Canonical events**: `repair_room_entered`, `repair_panel_opened`,
  `repair_sequence_submitted`, `repair_manual_opened`,
  `manual_page_reviewed`, `repair_abandoned`,
  `repair_returned_after_failure`. `task_started` deliberately NOT emitted
  (unresolved issue 8 — spec asserts absence).
- **Legacy events (verbatim)**: `repair_attempt`, `repair_failed`,
  `repair_same_sequence_repeated`, `repair_manual_used`,
  `repair_strategy_revision`, `repair_completed`, shared
  `objective_completed` (Archive+Repair both complete, once — via
  `RoomScene.logObjectiveCompletedIfBothDone()`).
- **Pinned science** (all registry-matched): `repair_failed` Q14+Q21 /
  adaptive_persistence / success:false; `repair_same_sequence_repeated` Q26 /
  inappropriate_persistence / false; `repair_strategy_revision` Q14+Q21+Q23 /
  adaptive_persistence / true; `repair_completed` Q06+Q14+Q21 / construct
  unset / true; `manual_page_reviewed` Q22 / adaptive_persistence;
  `repair_abandoned` Q24, `repair_returned_after_failure` Q24+Q25 — both
  construct unset (F1 precedent).
- **Completion/defer/return paths**: complete via revised sequence;
  leave-after-failure → `repair_abandoned` on exit,
  `repair_returned_after_failure` on re-entry (U2 helpers, Archive
  semantics). No defer branch in this room.
- **Runtime state**: summary separation invariant — adaptive path leaves
  `game_inappropriate_persistence` = 0 and `blind_retry_count` = 0; blind
  retry path sets both to 1 with exactly one `repair_failed` and one
  `repair_same_sequence_repeated`.

### 3.2 Engineer Hub — `e2e/engineer_hub_logging.spec.ts`

- **Scene/route**: `EngineerScene`, `?scene=engineer`, room_id
  `engineer_hub`. Hub door top wall x 512; entry `engineer_hub_entered`.
- **Controlled choices**: stage 1 (report, one-shot): 1 = quick/unprepared,
  2 = review evidence then report (prepared), 3 = clarification first.
  Stage 2 (chained U3 duty offer after any report): 1 = accept relay
  supervision, 2 = decline.
- **Canonical events**: `engineer_hub_entered`,
  `engineer_supervision_assigned` (offer shown, unmapped — no
  Events-column listing), `engineer_supervision_accepted`,
  `engineer_supervision_declined` (unmapped).
  `engineer_supervision_completed` / `accepted_duty_unresolved` emit at
  Final Core only; `engineer_supervision_skipped` unemitted (no formal skip
  action — documented).
- **Legacy events (verbatim)**: `engineer_report_opened` (one-shot),
  `engineer_report_submitted_unprepared` +
  `engineer_responsibility_shortcut`; `engineer_evidence_reviewed` +
  `engineer_report_submitted_prepared` +
  `engineer_responsibility_adaptive`; `engineer_clarification_requested` +
  `engineer_report_submitted_supervised` +
  `engineer_responsibility_adaptive`.
- **Pinned science**: `engineer_report_submitted_prepared` Q09 /
  responsibility; `engineer_supervision_accepted` Q10 / responsibility;
  `engineer_supervision_assigned` study_item_ids undefined (spec asserts
  absence of mapping).
- **Runtime state**: accept → `relay_supervision` in `accepted_duties` AND
  `active_objectives`; decline → in `skipped_duties` only, no
  `accepted_duty_unresolved` ever from declining. One-shot: second
  interaction produces no second submission/offer.

### 3.3 Inventory / Preparation Room — `e2e/inventory_prep_logging.spec.ts`

- **Scene/route**: `InventoryScene`, `?scene=inventory`, room_id
  `inventory_prep_room`. Hub door top wall x 704; entry
  `inventory_room_entered`.
- **Controlled choices**: stage 1 (one-shot): 1 = grab tools quickly
  (shortcut), 2 = checklist + ordered packing (systematic), 3 = third legacy
  option (verbatim). Systematic path chains: verification stage (1 = verify /
  2 = plausible skip) → cleanup stage (1 = tidy / 2 = leave disordered).
  Shortcut path implies skipped verification + disorder.
- **Canonical events**: `inventory_room_entered`,
  `inventory_checklist_opened` (**only** on the checklist option, never on
  prompt open — Q01 contamination guard; spec asserts absence on shortcut),
  `correct_tool_selected`, `inventory_sequence_followed`,
  `inventory_verified_complete` / `inventory_verification_skipped`,
  `workspace_tidy_confirmed` / `workspace_left_disordered`,
  `cleanup_completed`, `missing_item`. Per-item events
  (`inventory_item_sorted_correct` etc.) registered but unemitted (needs
  per-item mini-game — user decision).
- **Legacy events (verbatim)**: `inventory_prep_opened` (one-shot),
  shortcut: `inventory_prep_shortcut` + `inventory_required_item_missed` +
  `inventory_disorganized_action`; systematic: `inventory_checklist_used` +
  `inventory_required_tools_packed` + `inventory_systematic_prep`; cleanup:
  `inventory_workspace_sorted` + `inventory_kit_verified` +
  `inventory_cleanup_completed`.
- **Pinned science**: `inventory_checklist_opened` Q01 / organisation;
  `workspace_left_disordered` Q04 / organisation; `cleanup_completed` Q04 /
  organisation; `inventory_verified_complete` Q30 / goal_time_exploratory;
  `inventory_verification_skipped` Q02+Q30 / construct unset.
- **Runtime state**: `prepared_items` contains `field_kit` on checklist
  paths (regardless of verification choice — process ≠ outcome), absent on
  shortcut; `workspace_status` = `tidy` / `disordered`
  (`src/data/missionVocabulary.ts`). Both feed Final Core flags.

### 3.4 Optional Side Repair Bay — `e2e/side_repair_logging.spec.ts`

- **Scene/route**: `SideRepairScene`, `?scene=side_repair`, room_id
  `optional_side_repair_bay`. Hub door left wall y 304; entry wait uses
  `side_repair_discovered` — **first entry only** (once-per-session event);
  any re-entry test must wait differently.
- **Controlled choices** (4 options — defer is the additive branch): 1 =
  ignore, 2 = start then abandon after difficulty (legacy), 3 = work
  through and complete, 4 = formally defer (reopens offer; does NOT
  complete the room).
- **Canonical events**: `side_repair_discovered` (once),
  `stabiliser_option_offered` (every offer — count doubles on
  defer-then-reopen), `stabiliser_accepted` + `side_repair_accepted` +
  `side_repair_first_step` (accept/start decomposition),
  `side_repair_deferred`, `side_repair_abandoned_after_start`,
  `side_repair_completed`, `final_bonus_unlocked`. Unemitted, documented:
  `side_repair_step_completed` (needs multi-step mini-game), canonical
  `side_repair_abandoned` (not matrix-listed).
- **Legacy events (verbatim)**: `side_repair_opened` (one-shot),
  `side_repair_ignored` + `side_repair_low_effort`; `side_repair_started` +
  `side_repair_abandoned_after_difficulty`; `side_repair_started` +
  `side_repair_completed` + `side_repair_productive_persistence`.
- **Pinned science**: `side_repair_accepted` Q07+Q16+Q20 / unset;
  `side_repair_first_step` Q20 / consistency_of_interest_exploratory;
  `side_repair_completed` Q07+Q16+Q32 / unset (**prototype payload delta —
  §5**); `final_bonus_unlocked` Q32 / goal_time_exploratory;
  `stabiliser_option_offered` + `stabiliser_accepted` Q29 /
  goal_time_exploratory.
- **Completion/defer/return paths**: defer ≠ abandon (confound control):
  defer keeps the offer open, exactly one `side_repair_deferred` survives in
  the log after later completion (never overwritten); ignore is a terminal
  decision (offer one-shots, no completion afterwards).
- **Runtime state**: `side_repair_status` ∈ ignored /
  abandoned_after_start / deferred / completed; completed unlocks the Final
  Core stability bonus.

### 3.5 Interruption Corridor — `e2e/interruption_corridor_logging.spec.ts`

- **Scene/route**: `InterruptionScene`, `?scene=interruption`, room_id
  `interruption_corridor`. Hub door right wall y 208; entry
  `interruption_corridor_entered`.
- **Controlled choices** (3 options, one-shot): 1 = switch fully to the new
  request, 2 = acknowledge then return to original task, 3 = ignore the
  alert.
- **Canonical events** (direct alias renames only — scoring-plan §9, no new
  interpretation-at-log-time events): `interruption_corridor_entered`,
  `interruption_received`, `switched_task`, `prior_goal_abandoned`,
  `returned_to_original_task`, `task_avoidance`; state-grounded
  `objective_active` (once per session, ONLY while `active_objectives` is
  non-empty — e.g. relay duty accepted first). Unemitted, documented:
  `competing_task_viewed` (open decision 5), `new_goal_offered`,
  `goal_switch_accepted`, `return_to_unfinished_task`,
  `prior_goal_completed`, `task_completed_after_interruption` (need real
  objective mechanics), `final_unresolved_due_to_nonreturn` (Final Core),
  `excessive_idle_after_instruction` (idle parameter — user-owned issue 1).
- **Legacy events (verbatim)**: `interruption_opened` (one-shot); switch:
  `interruption_new_task_chosen` + `interruption_previous_task_abandoned` +
  `interruption_focus_lost`; return: `interruption_alert_acknowledged` +
  `interruption_returned_to_original_task` +
  `interruption_focus_maintained`; ignore: `interruption_alert_ignored` +
  `interruption_single_task_focus` + `interruption_possible_rigidity`.
- **Pinned science**: `interruption_received` Q15+Q17 / unset;
  `switched_task` Q17, `returned_to_original_task` Q17,
  `prior_goal_abandoned` Q19 — all consistency_of_interest_exploratory;
  `objective_active` Q18 / consistency_of_interest_exploratory;
  `task_avoidance` Q08 / productiveness.
- **Runtime state**: `interruption_status` ∈ switched_away /
  returned_to_task / alert_ignored; `objective_active` absent when no duty
  was accepted (spec asserts absence in the no-duty session).

### 3.6 Final Core Room — `e2e/final_core_summary.spec.ts`

- **Scene/route**: `FinalCoreScene`, `?scene=final_core`, room_id
  `final_core_room`. Hub door right wall y 304; entry `final_core_entered`.
- **Controlled choices**: legacy 3 options verbatim (1 = start
  synchronization immediately/rushed, 2 = review status then integrate,
  3 = review + resolve remaining issues); option 4 = force continue,
  appended ONLY when outstanding flags exist (Q28 blocker; issue-free
  sessions see exactly the legacy prompt).
- **Canonical events**: entry-time system flags once per session from real
  SessionState — `final_core_missing_item_flagged` (no `field_kit`),
  `final_core_workspace_issue_flagged` (disordered — absent when no
  evidence either way), `final_unresolved_due_to_nonreturn`,
  `final_core_stability_bonus` (side repair completed);
  `final_core_blocker_shown`, `final_core_force_continue`,
  `final_core_rushed`, `final_core_completed`,
  `unresolved_issue_reviewed`, `issue_resolution_attempted`,
  `final_core_issue_resolved` (real-state conditioned); duty follow-through
  — resolve path: `engineer_supervision_completed` + objective cleared; any
  other completion with duty active: `accepted_duty_unresolved`. Missing,
  documented: `final_quality_score_computed`, `final_summary_previewed`,
  `qualtrics_return_previewed` (ScoringManager/QualtricsBridge gate —
  Beat-13, out of scope), hazard consequence flags (upstream blocked).
- **Legacy events (verbatim)**: `final_core_opened` (one-shot); rushed:
  `final_core_quick_sync` + `final_core_unresolved_issues_ignored` +
  `final_core_low_quality_completion`; structured:
  `final_core_status_reviewed` + `final_core_prior_results_integrated` +
  `final_core_structured_completion`; high-quality:
  `final_core_status_reviewed` + `final_core_remaining_issues_resolved` +
  `final_core_high_quality_completion`.
- **Pinned science**: `final_core_force_continue` + `final_core_blocker_shown`
  Q28 / inappropriate_persistence; `final_core_completed` Q06+Q33 / unset;
  `final_core_rushed` Q11+Q33 / unset; `final_core_status_reviewed` Q11 /
  responsibility (**prototype payload delta — §5**);
  `unresolved_issue_reviewed` Q11 / responsibility;
  `issue_resolution_attempted` Q28 / unset (valence mismatch);
  `engineer_supervision_completed` + `accepted_duty_unresolved` Q10 /
  responsibility; `final_core_stability_bonus` Q29 / goal_time_exploratory.
- **Runtime state**: one-shot interface (exactly one `final_core_completed`
  per session); fresh session shows missing-kit flag but no workspace flag,
  no bonus, no nonreturn flag (graceful degradation).

## 4. Playwright updates required (and nothing more)

The six specs exist, compile, and pin registry-correct science. No spec
re-authoring is needed. The verification pass owes exactly:

1. **Route tuning (all six rooms)** — every `hubToStationDoor` case except
   `archive_room` is untested choreography (helpers.ts note); tune door legs
   against the live Hub before trusting any spec. Also tune the in-room
   legs: repair manual-station walk + exit-door route
   (`repair_room_logging` test 3), Engineer-exit legs duplicated in
   `interruption_corridor_logging` test 2 and `final_core_summary` tests
   2–3, and each room's "spawn → interactable" up-clamp.
2. **`objective_completed` parity gap (only identified coverage gap)** — no
   spec drives Archive + Repair to completion in one session to observe the
   shared legacy `objective_completed` firing exactly once via
   `RoomScene.logObjectiveCompletedIfBothDone()`. Add one test (natural
   home: `repair_room_logging.spec.ts`) during the verification pass.
3. **Prototype baseline regression** — no spec covers `?scene=prototype`;
   run the §5 checks manually or as a scripted drive during the pass.
4. **Known wait-constraint, no change needed now**: `hubToSideRepair` waits
   on once-per-session `side_repair_discovered`; if the pass adds a
   re-entry scenario it must wait on something else.
5. **Out of scope**: `hazard_control_logging.spec.ts` (V3 §9) waits for the
   Hazard Control beat (user-blocked); Beat-13 summary/return-URL additions
   to `final_core_summary.spec.ts` wait for the supervised scoring beat.

## 5. Prototype fixture re-baseline (what it actually is)

Verified this session: none of `docs/testing/baseline-e8a8994/*.json`
contains `side_repair_completed` or `final_core_status_reviewed` — the
fixtures cover the dock path and the two archive protocols only. Therefore
**no fixture file needs rewriting.** The owed regression check is:

- Drive `?scene=prototype` along the dock + archive protocols and confirm
  event sequences still match the three fixture JSONs (names, order,
  payloads).
- Drive the prototype side-repair-complete and final-core-structured paths
  and confirm the ONLY delta vs. pre-wave behaviour is the documented
  additive canonical context now attached to `side_repair_completed`
  (Q07+Q16+Q32, construct unset) and `final_core_status_reviewed` (Q11,
  responsibility) — same event names, same order, same one-shot guards.
- Record the observed sequences under `docs/testing/` as the new Phase-0
  reference for these two events (additive documentation, not a fixture
  overwrite).

## 6. Verification-pass execution order (when Playwright is enabled)

1. Code gates: `npm.cmd run build` + `npm.cmd run lint:tsc` (§1 already
   green at `7a76cf4`).
2. V1 regression first: `launch_with_research_params`,
   `movement_and_first_interaction`, `archive_room_logging` (must stay
   green untouched).
3. Rooms in build order: repair → engineer → inventory → side_repair →
   interruption → final_core, tuning routes per §4.1 as each spec is run.
4. Add the `objective_completed` parity test (§4.2); rerun repair spec.
5. Prototype baseline checks (§5).
6. Debug-API pass per `docs/testing/playwright-smoke-plan.md` (each
   `window.researchRuntime` method exercised on at least one driven path).
7. Only then: dispatch `research-data-reviewer` +
   `gameplay-implementation-reviewer` over the wave, per the Wave 1A plan.

## 7. Blocked scientific decisions (unchanged, user-owned)

Verification must not resolve any of these; specs assert around them:

1. Dock idle threshold (`excessive_idle_after_instruction` stays unemitted).
2. Abandon/return `construct_id` (Q24/Q25 family — stays unset).
3. `hazard_avoidance` canonical resolution — blocks the Hazard beat and its
   spec.
4. `engineer_report_submitted_supervised` canonical mapping (legacy stays
   verbatim/unmapped).
5. `interruption_alert_acknowledged` → `competing_task_viewed` mapping
   (`competing_task_viewed` stays unemitted).
6. Beat-13 scoring bundle (ScoringManager/QualtricsBridge untouched;
   `final_quality_score_computed` / `final_summary_previewed` /
   `qualtrics_return_previewed` stay unemitted).
7. `task_started` Q05/Q15 dual-listing conflict (stays unemitted +
   unregistered; specs assert absence).
