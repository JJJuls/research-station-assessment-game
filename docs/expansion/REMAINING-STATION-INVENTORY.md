# Remaining Station Inventory — Remote Outpost Expansion Wave 1

Date: 2026-07-12 · Branch `fable-autonomous-game-build-v1` (from V1-slice HEAD
`556e273`). Companion documents: `EXPANSION-WAVE-1-PLAN.md` (ranking +
sequencing), `ACTIVE-EXPANSION-STATE.md` (live progress state).

## Scope and authority

The V1 slice shipped **Dock / Arrival Bay**, **Station Hub**, and **Archive
Room** as connected `RoomScene` rooms. Seven V3 assessment stations remain
prototype-only (reachable via `?scene=prototype`, sealed bulkheads in the Hub):

1. Systems Repair Room (`systems_repair_room`)
2. Engineer Hub / NPC Report-Back (`engineer_hub`)
3. Inventory / Preparation Room (`inventory_prep_room`)
4. Hazard Control Room (`hazard_control_room`)
5. Optional Side Repair Bay (`optional_side_repair_bay`)
6. Interruption Corridor (`interruption_corridor`)
7. Final Core Room (`final_core_room`)

Authoritative sources, in precedence order (a conflict = stop and report):

| Source                                                     | Authority over                                                              |
| ---------------------------------------------------------- | --------------------------------------------------------------------------- |
| `docs/ai/fable-claude-final-game-build-contract-v3.txt`    | Task semantics, canonical event names (§4), Q-matrix (§5), scoring (§6)     |
| `docs/research/MASTER_33_ALIGNMENT.md`                     | `study_item_ids` per event, construct labels, proxy status, cautions        |
| `docs/research/event-schema.md`                            | Payload shape, `room_id`/`task_id` naming, legacy-to-canonical alias tables |
| `docs/research/scoring-plan.md`                            | Derived-variable reconciliation, composite formulas, labelling rules        |
| `docs/game/rooms/02..08-*.md`                              | Per-room implementation contract (flow, edge cases, anti-leakage)           |
| `src/scenes/Main.tsx` + `src/data/researchInteractions.ts` | Existing prototype behaviour to preserve verbatim (legacy events)           |
| `src/world/CanonicalEventContext.ts`                       | Committed `study_item_ids`/`construct_id` per event (frozen at runtime)     |

**Port discipline (Archive precedent, Beat 4 / commit `751cfb9`)**: rooms are
ported _audit-first_ — legacy prototype event names, option labels, option
ordering, feedback strings, and one-shot guards are preserved byte-for-byte;
canonical V3 events are **added** alongside, never renamed over. `?scene=prototype`
must keep emitting the exact pre-port event sequences (regression fixture:
`docs/testing/baseline-e8a8994/`).

**Fixed and non-inventable** (repeated from the wave instructions): no station
implementation may alter or invent `study_item_ids`, `construct_id` values,
scoring formulas, option meanings/ordering, task semantics, difficulty/stimuli,
timing/idle thresholds, or authoritative event contracts.

---

## Station 1 — Systems Repair Room

- **`room_id`**: `systems_repair_room` · **`task_id`**: `repair_sequence_selection`
- **Authoritative files**: V3 §4 Room 2; `docs/game/rooms/02-systems-repair-room.md`;
  event-schema §4 "Systems Repair Room"; `Main.tsx` case `'systemsRepairFailure'`
  (lines ~802–839); `researchInteractions.systemsRepairFailure`.
- **`study_item_ids`**: Q05, Q06, Q14, Q21, Q23, Q24, Q25, Q26.
- **`construct_id` values (committed, `CANONICAL_EVENT_CONTEXT`)**:
  `repair_failed` → `adaptive_persistence` (Q14, Q21, success:false);
  `repair_same_sequence_repeated` → `inappropriate_persistence` (Q26, success:false);
  `repair_manual_used` → `adaptive_persistence` (Q14, Q21, Q22);
  `repair_strategy_revision` → `adaptive_persistence` (Q14, Q21, Q23, success:true);
  `repair_completed` → construct_id **intentionally unset** (Q06, Q14, Q21, success:true).
- **Task semantics (fixed)**: default repair sequence deterministically fails
  (scripted manipulation, same for all participants); player may repeat the
  failed sequence (blind retry), open the manual, apply the revised sequence
  (success path), or leave unresolved. Completion updates station stability.
- **Legacy events (preserve verbatim)**: `repair_attempt`, `repair_failed`,
  `repair_same_sequence_repeated` (via `didRepeat` check on
  `repairLastFailedSequence === 'default'`), `repair_manual_used`,
  `repair_strategy_revision`, `repair_completed`, plus the shared
  `objective_completed` (fires once when Archive + Repair are both complete —
  `logObjectiveIfComplete()`).
- **Canonical additions needed**: `repair_room_entered`, `repair_panel_opened`,
  `task_started`, `repair_sequence_submitted` (alongside legacy
  `repair_attempt`), `repair_manual_opened` (distinct from `_used`),
  `manual_page_reviewed`, `repair_abandoned`, `repair_returned_after_failure`.
  The abandon/return pair mirrors Archive exactly (Q24/Q25 via matrix;
  construct_id left unset — same open psychometric decision as
  `archive_abandoned`, research-data-reviewer F1 precedent).
- **Scoring restrictions**: manual use counts as productive only when followed
  by relevant revision (scoring-layer rule); repeat-identical-sequence feeds
  `blind_retry_count`/inappropriate persistence, never adaptive; raw time is
  never effort.
- **Reusable systems**: 2nd instance of the Archive failed-task/abandon/return
  pattern → extract shared task-state helper (see plan, Unit U2). Uses
  registry/routing (U1), prompt system as-is (3 options).
- **Assets**: placeholder rectangles per RoomScene default; committed props
  needed later (console, repair panel, manual station) — PixelLab pass requires
  separate explicit approval and `asset_set_version` bump (freeze gate).
- **Readiness**: **highest of all seven.** "Strong current implemented core"
  (V3); 5 exact event matches; no new mechanic; no unresolved scientific
  parameter blocking implementation (construct_id-unset rows follow committed
  precedent).
- **Risks**: `objective_completed` legacy event spans Archive+Repair — the
  ported room must keep its semantics identical for `?scene=prototype` while
  deciding (documented, additive) how the connected world logs it; the
  prototype's guard lives in Main instance state, the world port needs the
  session-level equivalent.

## Station 2 — Engineer Hub / NPC Report-Back

- **`room_id`**: `engineer_hub` · **`task_id`**: `engineer_report_submission`
- **Authoritative files**: V3 §4 Room 3; `docs/game/rooms/03-engineer-hub.md`;
  event-schema §4 "Engineer Hub"; `Main.tsx` case `'engineerReportBack'`
  (~586–626) + `markEngineerReportSubmitted()` one-shot guard;
  `researchInteractions.engineerReportBack`.
- **`study_item_ids`**: Q09, Q10, Q11.
- **`construct_id` values (committed)**: `engineer_report_opened`,
  `engineer_evidence_reviewed`, `engineer_report_submitted_prepared` → all
  `responsibility` (Q09). `engineer_clarification_requested` and
  `engineer_report_submitted_unprepared` are **intentionally unmapped** (no
  Events-column listing in the matrix) — carry room/task context only.
  Q10 supervision events (`engineer_supervision_accepted/completed`,
  `accepted_duty_unresolved`) are matrix-listed under Q10 (responsibility
  family); their exact `construct_id` assignment is a **new registration**
  requiring the documented population rule (unambiguous source or leave unset).
- **Task semantics (fixed)**: Kai requests a status report under plausible time
  pressure; player may submit quick/unprepared (must stay plausible, not
  morally obvious), review evidence then report (prepared), or ask for
  clarification first; then accept/decline a relay supervision duty that
  persists as an objective and is checked later (Final Core or related point)
  for completion vs. `accepted_duty_unresolved`.
- **Legacy events (preserve verbatim)**: `engineer_report_opened` (on prompt
  open, gated by one-shot), `engineer_report_submitted_unprepared` +
  `engineer_responsibility_shortcut`; `engineer_evidence_reviewed` +
  `engineer_report_submitted_prepared` + `engineer_responsibility_adaptive`;
  `engineer_clarification_requested` + `engineer_report_submitted_supervised` +
  `engineer_responsibility_adaptive`.
- **Canonical additions needed**: `engineer_hub_entered`,
  `engineer_report_accuracy_scored`, `engineer_supervision_assigned`,
  `engineer_supervision_accepted`, `engineer_supervision_declined`,
  `engineer_supervision_completed`, `engineer_supervision_skipped`,
  `accepted_duty_unresolved`. The **entire supervision/duty mechanic is new
  implementation**, not renaming; it consumes `SessionState.accepted_duties`/
  `skipped_duties` (fields exist, currently unused by any room).
- **Scoring restrictions**: declining the duty is a valid choice, not a
  failure (no unresolved-duty penalty on decline); one-shot guard discipline
  must extend to supervision acceptance (no unbounded
  `responsibility_adaptive_count` inflation); additions must not alter the
  persistence scoring model anywhere (V3 §1 rule 9/10).
- **Reusable systems**: duty-board / persistent-objective system — **the
  highest-value shared mechanic of the wave** (consumed again by Interruption
  Corridor's unresolved-objective check and Final Core's duty review). Needs
  multi-stage prompt flow (report choice → duty offer), i.e. controlled-option
  rendering (U3).
- **Assets**: first NPC (Engineer Kai) — placeholder marker acceptable per
  RoomScene pattern; a real NPC sprite is a PixelLab decision for later.
  Report console + duty board props.
- **Readiness**: high on the report path (5 exact matches, port-verbatim);
  the supervision mechanic is well-specified by V3 but is new design surface.
  One legacy-only mapping (`engineer_report_submitted_supervised`) explicitly
  "needs a design decision, not a blind rename" — under additive port
  discipline the legacy event stays verbatim and unmapped, so this does **not**
  block implementation; the canonical-mapping decision stays open.
- **Risks**: where the duty follow-through check fires before Final Core
  exists (contract says "Final Core or related station point") — Wave 1 should
  log duty state into `SessionState` and defer the `accepted_duty_unresolved`
  _emission point_ to the Final Core beat, so no premature semantics are
  invented.

## Station 3 — Inventory / Preparation Room

- **`room_id`**: `inventory_prep_room` · **`task_id`**: none documented
  (canonical task_id string not yet defined in event-schema §2 — assign only
  if a source documents one; otherwise leave unset like the prototype).
- **Authoritative files**: V3 §4 Room 4; `docs/game/rooms/04-inventory-preparation-room.md`;
  event-schema §4 "Inventory / Preparation Room"; `Main.tsx` case
  `'inventoryPrepChecklist'` (~672–713) + `markInventoryPrepCompleted()`;
  `researchInteractions.inventoryPrepChecklist`.
- **`study_item_ids`**: Q01, Q02, Q03, Q04, Q30.
- **`construct_id` values**: none committed yet (no inventory event is in
  `CANONICAL_EVENT_CONTEXT`). Matrix constructs: organisation (Q01–Q04),
  goal_time_exploratory (Q30). Q04 is **cleanup/disorder only** — hard
  constraint; no planning-before-acting labelling.
- **Task semantics (fixed)**: prepare a field kit via checklist; sort items,
  select tools, assemble kit, verify readiness **or skip verification** (Q30
  process signal, independent of kit-completeness outcome), tidy the workspace
  **or leave it disordered** (Q04 signal); omissions/disorder propagate to
  Final Core flags.
- **Legacy events (preserve verbatim)**: `inventory_prep_opened` (prompt open,
  one-shot gated), shortcut path `inventory_prep_shortcut` +
  `inventory_required_item_missed` + `inventory_disorganized_action`;
  systematic path `inventory_checklist_used` + `inventory_required_tools_packed`
  - `inventory_systematic_prep`; cleanup path `inventory_workspace_sorted` +
    `inventory_kit_verified` + `inventory_cleanup_completed`.
- **Canonical additions needed** (zero exact matches — weakest naming
  alignment of any room): `inventory_room_entered`,
  `inventory_checklist_opened`, `inventory_item_sorted_correct`,
  `inventory_item_misplaced`, `inventory_sequence_followed`,
  `inventory_sequence_completed`, `inventory_verification_skipped`,
  `inventory_verified_complete`, `correct_tool_selected`, `wrong_tool_selected`,
  `prepared_tool_used`, `readiness_verified`, `missing_item`,
  `workspace_tidy_confirmed`, `workspace_left_disordered`, `cleanup_completed`;
  cross-room: `final_core_missing_item_flagged`,
  `final_core_workspace_issue_flagged` (emitted at Final Core, fed by this
  room's `SessionState.prepared_items`/`workspace_status`).
- **Scoring restrictions**: interface must stay simple (measures organisation,
  not drag-and-drop skill); Q30 variables are optional/exploratory Goal-Time
  proxies, labelled as such everywhere surfaced; verification-skipped (process)
  must never be conflated with kit-incomplete (outcome).
- **Reusable systems**: multi-step sub-interaction flow (checklist → selection
  → verify → cleanup as distinguishable steps) — the contract's canonical
  design implies separable steps the single 3-option prompt can't express;
  needs U3 (controlled-option rendering) and U2 (task state), writes
  cross-room state consumed by Final Core.
- **Assets**: bins, prep bench, kit crate, quartermaster console (placeholders
  first).
- **Readiness**: medium. Mechanic conceptually exists but the canonical design
  requires splitting one combined choice into separable sub-steps — the most
  event-name and mechanic rework of any room. No blocking scientific parameter,
  but the sub-step decomposition must be validated against
  `psychometric-task-design` before coding (the room doc already specifies the
  split; ambiguity is low).
- **Risks**: over-engineering the sub-steps into a skill test (validity
  caution); choosing sub-step granularity is a design decision the room doc
  constrains but does not fully fix — keep to the doc's three separable
  clusters (checklist/selection, verification, cleanup).

## Station 4 — Hazard Control Room

- **`room_id`**: `hazard_control_room` · **`task_id`**: `hazard_route_decision`
- **Authoritative files**: V3 §4 Room 5; `docs/game/rooms/05-hazard-control.md`;
  event-schema §4 "Hazard Control Room"; `Main.tsx` case
  `'hazardUncertaintyWarning'` (~841–865, no one-shot guard — repeatable);
  `researchInteractions.hazardUncertaintyWarning`.
- **`study_item_ids`**: Q12, Q27, Q31.
- **`construct_id` values (committed)**: `hazard_warning_seen` → `prudence`
  (Q12); `hazard_info_checked` → **intentionally unset** (Q12+Q27 dual
  listing); `hazard_informed_continue` → `goal_time_exploratory` (Q31);
  `hazard_reckless_continue` → `inappropriate_persistence` (Q12, Q27, Q31,
  success:null, live `metadata.info_checked_before_continuing`).
- **Task semantics (fixed)**: warning shown on interaction
  (`hazard_warning_seen` fires on prompt open); player may check details,
  continue (informed vs. reckless determined by whether details were checked
  first — `hazardInfoChecked` local state), or avoid the uncertain route.
  Consequence state carries into Final Core (`hazard_issue_created/resolved`,
  `final_hazard_issue` — all unimplemented).
- **Legacy events (preserve verbatim)**: `hazard_warning_seen`,
  `hazard_info_checked`, `hazard_informed_continue`,
  `hazard_reckless_continue`, `hazard_avoidance`.
- **Canonical additions needed**: `hazard_room_entered`,
  `hazard_issue_created`, `hazard_issue_resolved`; cross-room
  `final_hazard_issue` (Final Core side).
- **Scoring restrictions**: measures consequence checking, never fear;
  `hazard_reckless_continue` is maladaptive (Q27) and must stay out of
  adaptive variables; known Beat-13 watch item — `strategy_revision_count`
  currently folds in `hazard_info_checked` (construct mixing, user-flagged fix,
  **do not touch autonomously**).
- **Reusable systems**: consequence propagation via
  `SessionState.hazard_status` (U2/state helpers); standard 3-option prompt.
- **Assets**: alert terminal, warning panel, route console (placeholders
  first).
- **Readiness**: technically highest alignment (4 exact matches), **but
  scientifically gated**: the `hazard_avoidance` canonical mapping ("propose
  canonical `hazard_route_avoided`, or fold under `hazard_info_checked`
  metadata") is explicitly flagged in event-schema/room doc as a
  **user/psychometric decision required before this room's implementation
  beat**. Under additive port discipline the legacy event could ship verbatim
  with the canonical question open — but the room doc's wording ("before or
  during this room's implementation beat") makes this a stop-and-report
  parameter. **Blocked on user decision.**
- **Risks**: avoid-after-checking vs. avoid-without-checking must be
  distinguishable in raw data (edge cases in room doc) regardless of which
  canonical resolution the user picks — the port should carry
  `metadata.info_checked_before_avoiding` only if the user's decision defines
  it (do not invent).

## Station 5 — Optional Side Repair Bay

- **`room_id`**: `optional_side_repair_bay` · **`task_id`**: none documented.
- **Authoritative files**: V3 §4 Room 6; `docs/game/rooms/06-optional-side-repair-bay.md`;
  event-schema §4 "Optional Side Repair Bay"; `Main.tsx` case
  `'optionalSideRepair'` (~761–800) + `markOptionalSideRepairCompleted()`;
  `researchInteractions.optionalSideRepair`.
- **`study_item_ids`**: Q07, Q16, Q20, Q29, Q32.
- **`construct_id` values**: none committed yet. Matrix constructs:
  productiveness (Q07), Grit-S PE diligence (Q16),
  consistency_of_interest_exploratory (Q20 — weak/exploratory),
  goal_time_exploratory (Q29, Q32).
- **Task semantics (fixed)**: Utility Bot offers an optional stabiliser repair
  — not required for progression, no power upgrade, visible final-stability
  benefit only. Player may skip, accept, start, complete steps, **formally
  defer** (required confound control distinguishing strategic postponement
  from abandonment), abandon after starting, or complete. Outcome feeds Final
  Core stability bonus.
- **Legacy events (preserve verbatim)**: `side_repair_opened` (prompt open,
  one-shot gated), `side_repair_ignored` + `side_repair_low_effort`;
  `side_repair_started` + `side_repair_abandoned_after_difficulty`;
  `side_repair_started` + `side_repair_completed` +
  `side_repair_productive_persistence`.
- **Canonical additions needed**: `side_repair_discovered`,
  `stabiliser_option_offered`, `stabiliser_accepted`, `side_repair_accepted`
  (distinct from _started_ — accept and start are currently conflated),
  `side_repair_first_step`, `side_repair_step_completed`,
  `side_repair_abandoned`, `side_repair_abandoned_after_start`,
  `side_repair_deferred` (**new branch**), `side_repair_completed` (exact);
  cross-room: `final_core_stability_bonus`, `final_bonus_unlocked`.
- **Scoring restrictions**: completionism/curiosity are named confounds — log
  accepted/started/deferred/abandoned/completed as separate events, never one
  "did it" flag; Q29/Q32 variables labelled optional/exploratory Goal-Time;
  Q20 labelled weak/exploratory; interim abandon-then-return stays visible in
  the raw log (never overwritten).
- **Reusable systems**: multi-step task flow with step counter (U2/U3);
  `SessionState.side_repair_status` propagation to Final Core.
- **Assets**: Utility Bot (second NPC), repair arm, work console, parts
  shelves (placeholders first).
- **Readiness**: medium. The defer branch is a **required new option** (a 4th+
  choice, exceeding the current 3-option prompt) — contract-supported, so not
  a scientific ambiguity, but it needs U3 and a multi-stage flow (offer →
  accept/defer/skip → steps → complete/abandon). Option-meaning preservation
  applies to the three legacy options; the defer branch is additive per
  explicit V3 requirement.
- **Risks**: mapping legacy `side_repair_ignored` (never-accepted) vs.
  canonical `side_repair_abandoned` conflation — keep legacy verbatim,
  emit canonical never-accepted/abandoned-after-start distinctly; do not
  reinterpret the legacy event.

## Station 6 — Interruption Corridor

- **`room_id`**: `interruption_corridor` · **`task_id`**: none documented.
- **Authoritative files**: V3 §4 Room 7; `docs/game/rooms/07-interruption-corridor.md`;
  event-schema §4 "Interruption Corridor"; `Main.tsx` case
  `'interruptionCorridor'` (~715–759) + `markInterruptionCorridorCompleted()`;
  `researchInteractions.interruptionCorridor`.
- **`study_item_ids`**: Q08, Q15, Q17, Q18, Q19, Q20.
- **`construct_id` values**: none committed yet. Matrix constructs:
  productiveness (Q08), Grit-S PE (Q15),
  consistency_of_interest_exploratory (Q17–Q20, all weak/exploratory).
- **Task semantics (fixed)**: a competing objective arrives via Comms AI while
  a prior objective is active; player may evaluate, switch, return, abandon
  the prior goal, or complete the original task; a later check (Final Core)
  surfaces unresolved non-return. Switching alone is never scored negatively —
  only unresolved non-return and abandoned prior goals.
- **Legacy events (preserve verbatim)**: `interruption_opened` (prompt open,
  one-shot gated), switch path `interruption_new_task_chosen` +
  `interruption_previous_task_abandoned` + `interruption_focus_lost`;
  return path `interruption_alert_acknowledged` +
  `interruption_returned_to_original_task` + `interruption_focus_maintained`;
  ignore path `interruption_alert_ignored` + `interruption_single_task_focus`
  - `interruption_possible_rigidity`.
- **Canonical additions needed**: `interruption_corridor_entered`,
  `objective_active`, `interruption_received`, `competing_task_viewed`,
  `new_goal_offered`, `switched_task`, `goal_switch_accepted`,
  `return_to_unfinished_task`, `prior_goal_completed`, `prior_goal_abandoned`,
  `task_completed_after_interruption`, `task_avoidance`,
  `excessive_idle_after_instruction`; cross-room
  `final_unresolved_due_to_nonreturn` (Final Core side, via
  `SessionState.interruption_status`/`unresolved_objectives`).
- **Scoring restrictions**: raw-vs-derived rule — the legacy interpretation
  events (`focus_lost/maintained/possible_rigidity`) stay verbatim for the
  prototype, but **no new interpretation-at-log-time events may be added**;
  canonical additions log raw behaviour only, interpretations belong in
  ScoringManager (scoring-plan §9). Q17–Q20 outputs labelled weak/exploratory
  everywhere.
- **Reusable systems**: consumes the duty/objective system from Engineer Hub
  (U-series); `excessive_idle_after_instruction` **depends on an idle
  definition** — the Dock idle threshold parameter is still open (user-owned);
  do not define a corridor idle threshold autonomously.
- **Assets**: comms beacon, door controller (placeholders first).
- **Readiness**: medium-low. The mechanic redesign (real active-objective
  state, competing-task offer, return route) is the most conceptually
  sensitive of the seven; `excessive_idle_after_instruction` is **blocked on
  the open idle-definition parameter** (can be registered but not emitted,
  Dock precedent).
- **Risks**: preserving prototype one-shot semantics while the canonical
  design implies multi-visit behaviour; scoring-plan §9 explicitly gates how
  the legacy interpretation events may be handled at scoring time.

## Station 7 — Final Core Room

- **`room_id`**: `final_core_room` · **`task_id`**: none documented.
- **Authoritative files**: V3 §4 Room 8; `docs/game/rooms/08-final-core-room.md`;
  event-schema §4 "Final Core Room"; `Main.tsx` case `'finalCoreIntegration'`
  (~628–670) + `markFinalCoreCompleted()`;
  `researchInteractions.finalCoreIntegration`.
- **`study_item_ids`**: Q04, Q10, Q11, Q28, Q29, Q33.
- **`construct_id` values**: none committed yet. Matrix constructs:
  organisation (Q04), responsibility (Q10, Q11), inappropriate_persistence
  (Q28 — maladaptive), goal_time_exploratory (Q29, Q33).
- **Task semantics (fixed)**: status board displays prior-room states
  (missing items, workspace disorder, unresolved duty, hazard consequence,
  blocker, stabiliser bonus); player may review, resolve, **force continue
  past an explicit blocker** (Q28 core mechanic — currently missing), rush
  finalization, or complete after resolving. Produces final quality/stability
  summary + Qualtrics return preview.
- **Legacy events (preserve verbatim)**: `final_core_opened` (prompt open,
  one-shot gated), rushed path `final_core_quick_sync` +
  `final_core_unresolved_issues_ignored` + `final_core_low_quality_completion`;
  structured path `final_core_status_reviewed` +
  `final_core_prior_results_integrated` + `final_core_structured_completion`;
  high-quality path `final_core_status_reviewed` +
  `final_core_remaining_issues_resolved` + `final_core_high_quality_completion`.
- **Canonical additions needed**: `final_core_entered`,
  `final_core_missing_item_flagged`, `final_core_workspace_issue_flagged`,
  `final_core_blocker_shown`, `unresolved_issue_reviewed`,
  `issue_resolution_attempted`, `final_core_issue_resolved`,
  `final_core_force_continue`, `final_core_rushed`, `final_core_completed`,
  `final_core_stability_bonus`, `final_quality_score_computed`,
  `final_summary_previewed`, `qualtrics_return_previewed`, `final_hazard_issue`,
  `final_unresolved_due_to_nonreturn`, `final_bonus_unlocked`.
- **Scoring restrictions**: outcome/integration room — must never become a
  global score; `final_quality_score` reflects this room's integration quality
  only; `final_core_force_continue` is the missing 4th term of the canonical
  `game_inappropriate_persistence` formula (adding it is Beat-13 scoring work,
  coordinated with the user-flagged formula fixes); `final_core_rushed`
  (unreviewed) ≠ fast-but-reviewed; graceful degradation ("no flagged issues")
  when upstream state is empty.
- **Reusable systems**: consumes everything — mission-state read model over
  all `SessionState` fields, duty system, hazard/side-repair/inventory
  propagation, U3 for blocker/force-continue branch.
- **Assets**: core interface, status monitors, stability meter (placeholders
  first).
- **Readiness**: lowest — **hard-gated on upstream rooms** (every cross-room
  flag it displays must first be written by Inventory, Engineer Hub, Hazard,
  Side Repair, Interruption). Build last (V3 Beat 11 ordering).
- **Risks**: quality-tier legacy completion events vs. canonical single
  `final_core_completed` consolidation (event-schema recommendation) — under
  additive discipline legacy tiers stay verbatim and `final_core_completed`
  is added; `final_quality_score` shape (categorical vs. numeric) is an open
  scoring-plan decision for the Beat-13-equivalent pass.

---

## Cross-station unresolved scientific parameters (user-owned, never decided autonomously)

1. **Dock idle threshold/definition** (`DOCK_IDLE_HELP_THRESHOLD_MS = null`) —
   also gates `excessive_idle_after_instruction` (Interruption Corridor) and
   any future `baseline_idle_seconds` emission.
2. **`construct_id` for abandon/return events** — `archive_abandoned` (Q24),
   `archive_returned_after_failure` (Q24+Q25); the same decision extends to
   `repair_abandoned`/`repair_returned_after_failure`. Ports leave construct_id
   unset (committed precedent).
3. **`hazard_avoidance` canonical resolution** — new canonical
   `hazard_route_avoided` vs. metadata fold; explicitly required before/during
   the Hazard beat. **Blocks Hazard Control.**
4. **`engineer_report_submitted_supervised` canonical mapping** — design
   decision; does not block implementation under additive discipline.
5. **`interruption_alert_acknowledged` mapping** to `competing_task_viewed` —
   explicit mapping decision; additive discipline defers it.
6. **Beat-13 scoring fixes** (user-flagged): `strategy_revision_count`
   prudence-mixing; `game_inappropriate_persistence` 4th term;
   `final_quality_score` shape; exploratory-label mechanism (§8 option a/b).
7. **Stimulus-freeze reviewer dispositions** (Dock decor lure MAJOR, archive
   salience, signage cue, exit-door texture, shelf geometry) — gate any
   participant use, independent of this wave.
