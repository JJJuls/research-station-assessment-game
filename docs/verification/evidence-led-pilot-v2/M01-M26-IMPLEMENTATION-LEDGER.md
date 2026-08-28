# M01-M26 implementation ledger (evidence-led pilot v2)

Derived from `docs/verification/input/Remote_Outpost_M01-M26_Scientific_Decision_v2.xlsx` sheet `09_M01_M26_FINAL` (workbook md5 `1535682ab88481815bbdda1206644d4c`) by `scripts/pilot/derive-evidence-ledger.py`. **Do not edit by hand - regenerate.**

Frozen dispositions: **16 strong / 7 conditional / 3 questionnaire-primary or hybrid**; item-owned active seconds **1040**.

Professional research prototype. Establishes no formal validity, reliability, norms, cut scores, hiring utility or questionnaire equivalence. Candidate variables are raw components only; missing/invalid opportunities never become low values; no trait score is computed.

The exact source item wording below is internal traceability for criterion comparison. It is never shown to participants and never enters the game bundle.

| ID  | Instrument                         | Facet / scale                  | Disposition                             | Episode(s) | Sec | Provisional opportunity id(s)                        | Windows                                                      |
| --- | ---------------------------------- | ------------------------------ | --------------------------------------- | ---------- | --- | ---------------------------------------------------- | ------------------------------------------------------------ |
| M01 | BFI-2 Conscientiousness            | Organization                   | GAME-CANDIDATE — CONDITIONAL            | 1          | 35  | `proto_m01_plan_board`                               | `m01_plan_board_w1` (ep 1)                                   |
| M02 | BFI-2 Conscientiousness            | Organization                   | GAME-CANDIDATE — CONDITIONAL            | 2          | 35  | `proto_m02_case_workspace`                           | `m02_workspace_w1` (ep 2), `m02_retrieval_w1` (ep 2)         |
| M03 | BFI-2 Conscientiousness            | Organization                   | GAME-CANDIDATE — STRONG                 | 2, 5       | 25  | `proto_m03_reset_a`, `proto_m03_reset_b`             | `m03_reset_o1` (ep 2), `m03_reset_o2` (ep 5)                 |
| M04 | BFI-2 Conscientiousness            | Organization                   | GAME-CANDIDATE — STRONG                 | 2          | 25  | `proto_m04_debris_cleanup`                           | `m04_debris_w1` (ep 2)                                       |
| M05 | BFI-2 Conscientiousness            | Productiveness                 | GAME-CANDIDATE — CONDITIONAL            | 1, 4       | 20  | `proto_m05_initiation_o1`, `proto_m05_initiation_o2` | `m05_initiation_o1` (ep 1), `m05_initiation_o2` (ep 4)       |
| M06 | BFI-2 Conscientiousness            | Productiveness                 | GAME-CANDIDATE — CONDITIONAL            | 2          | 35  | `proto_m06_routine_dispatch`                         | `m06_dispatch_w1` (ep 2)                                     |
| M07 | BFI-2 Conscientiousness            | Productiveness                 | GAME-CANDIDATE — CONDITIONAL            | 2, 5       | 35  | `proto_m07_calibration_project`                      | `m07_calibration_start` (ep 2), `m07_calibration_end` (ep 5) |
| M08 | BFI-2 Conscientiousness            | Productiveness                 | QUESTIONNAIRE-PRIMARY                   | -          | 0   | - (secondary: `secondary_m08_optional_job`)          | -                                                            |
| M09 | BFI-2 Conscientiousness            | Responsibility                 | GAME-CANDIDATE — STRONG                 | 1, 5       | 25  | `proto_m09_monitor_watch`                            | `m09_check_1` (ep 1), `m09_check_2` (ep 5)                   |
| M10 | BFI-2 Conscientiousness            | Responsibility                 | GAME-CANDIDATE — STRONG                 | 1, 5       | 20  | `proto_m10_component_promise`                        | `m10_promise_accept` (ep 1), `m10_promise_handover` (ep 5)   |
| M11 | BFI-2 Conscientiousness            | Responsibility                 | QUESTIONNAIRE-PRIMARY                   | 2          | 0   | - (secondary: `secondary_m11_seal_obligation`)       | -                                                            |
| M12 | BFI-2 Conscientiousness            | Responsibility                 | GAME-CANDIDATE — CONDITIONAL            | 1, 2       | 30  | `proto_m12_qc_o1`, `proto_m12_qc_o2`                 | `m12_qc_o1` (ep 1), `m12_qc_o2` (ep 2)                       |
| M13 | BESSI-192                          | Information Processing Skill   | GAME-CANDIDATE — STRONG                 | 2          | 90  | `proto_m13_lattice_construction`                     | `m13_lattice_w1` (ep 2)                                      |
| M14 | BESSI-192                          | Information Processing Skill   | GAME-CANDIDATE — STRONG                 | 1          | 65  | `proto_m14_incident_desk`                            | `m14_desk_w1` (ep 1)                                         |
| M15 | BESSI-192                          | Information Processing Skill   | GAME-CANDIDATE — STRONG                 | 3          | 65  | `proto_m15_layered_cipher`                           | `m15_causal_w1` (ep 3)                                       |
| M16 | BESSI-192                          | Information Processing Skill   | GAME-CANDIDATE — STRONG                 | 3          | 50  | `proto_m16_protocol_update`                          | `m16_protocol_w1` (ep 3)                                     |
| M17 | BESSI-192                          | Information Processing Skill   | GAME-CANDIDATE — STRONG                 | 3          | 55  | `proto_m17_syntax_acquisition`                       | `m17_transfer_w1` (ep 3)                                     |
| M18 | BESSI-192                          | Information Processing Skill   | GAME-CANDIDATE — STRONG                 | 3          | 65  | `proto_m18_lattice_fault_diagnosis`                  | `m18_diagnosis_w1` (ep 3)                                    |
| M19 | Multidimensional Persistence Scale | Persistence Despite Difficulty | GAME-CANDIDATE — STRONG                 | 4          | 50  | `proto_m19_progressive_valve`                        | `m19_valve_w1` (ep 4)                                        |
| M20 | Multidimensional Persistence Scale | Persistence Despite Difficulty | GAME-CANDIDATE — STRONG                 | 4, 5       | 55  | `proto_m20_antenna_restoration`                      | `m20_antenna_start` (ep 4), `m20_antenna_resume` (ep 5)      |
| M21 | Multidimensional Persistence Scale | Persistence Despite Difficulty | GAME-CANDIDATE — CONDITIONAL            | 5          | 55  | `proto_m21_manual_repair`                            | `m21_manual_w1` (ep 5)                                       |
| M22 | Multidimensional Persistence Scale | Persistence Despite Difficulty | GAME-CANDIDATE — STRONG                 | 5          | 50  | `proto_m22_report_revision`                          | `m22_report_w1` (ep 5)                                       |
| M23 | Multidimensional Persistence Scale | Persistence Despite Difficulty | GAME-CANDIDATE — STRONG                 | 4          | 60  | `proto_m23_field_recovery`                           | `m23_excavation_w1` (ep 4)                                   |
| M24 | Multidimensional Persistence Scale | Inappropriate Persistence      | GAME-CANDIDATE — STRONG                 | 4          | 55  | `proto_m24_magnet_utility`                           | `m24_magnet_w1` (ep 4)                                       |
| M25 | Multidimensional Persistence Scale | Inappropriate Persistence      | QUESTIONNAIRE-PRIMARY / HYBRID REQUIRED | 5          | 0   | `proto_m25_belief_probe`                             | `m25_probe_w1` (ep 5)                                        |
| M26 | Multidimensional Persistence Scale | Inappropriate Persistence      | GAME-CANDIDATE — STRONG                 | 4          | 40  | `proto_m26_channel_disconnect`                       | `m26_channel_w1` (ep 4)                                      |

## M01 - BFI-2 Conscientiousness / Organization

- **Exact source item (criterion comparison; internal only):** Is systematic, likes to keep things in order.
- **Final disposition:** GAME-CANDIDATE — CONDITIONAL (`conditional`)
- **Analysis level:** Organization facet first; item component exploratory
- **Final game opportunity (sheet 09):** Storm incident board: inspect a compact packet, create a dependency-valid work order, then execute the first three transitions. Permit at least two equally valid orders.
- **Candidate raw variables (raw components only):** `order_board_state`, `dependency_violations`, `precommit_corrections`, `first_three_transitions`
- **Validity / missing gate:** Briefing comprehension passed; every document visible; no time pressure; matched form; board actions isolated from M05/M12/M14.
- **Main rival explanations:** Reading/planning ability; interface literacy; overly explicit instructions suppress trait expression.
- **Active seconds:** 35 / **Episode:** 1 Incident Handover
- **Implementation action:** REVISE current board; do not score one 'correct' sequence.
- **Route (this mission, provisional):** Station Concourse / Incident Desk - plan board - Storm incident plan board: inspect a compact packet, order the work into a dependency-valid sequence (two or more valid orders), then execute the first three transitions.
- **Opportunity ids:** `proto_m01_plan_board` / **Family prefixes:** `proto_m01_board_` / **Secondary telemetry:** -
- **Primary source:** https://doi.org/10.1037/pspp0000096

## M02 - BFI-2 Conscientiousness / Organization

- **Exact source item (criterion comparison; internal only):** Tends to be disorganized.
- **Final disposition:** GAME-CANDIDATE — CONDITIONAL (`conditional`)
- **Analysis level:** Organization facet first; reverse-keyed component exploratory
- **Final game opportunity (sheet 09):** Open workspace: manage six cases with optional folders/labels, then retrieve two counterbalanced cases before committing the handover.
- **Candidate raw variables (raw components only):** `case_location_at_close`, `untraceable_case_count`, `misfile_count`, `duplicate_count`, `retrieval_actions`, `retrieval_errors`
- **Validity / missing gate:** Identical cases; multiple valid organization schemas; retrieval probes fixed by form; no inventory carryover; full keyboard/pointer equivalence.
- **Main rival explanations:** Working memory; categorization; UI mastery. Correct-bin sorting alone is not sufficient evidence.
- **Active seconds:** 35 / **Episode:** 2 Records & Workshop
- **Implementation action:** REPLACE filing-as-answer-key with functional traceability + retrieval.
- **Route (this mission, provisional):** Records Workshop - open case workspace - Open workspace: six heterogeneous case bundles, optional folders and labels, free placement; then retrieval of two counterbalanced cases before the handover commit. No designer-preferred layout is scored.
- **Opportunity ids:** `proto_m02_case_workspace` / **Family prefixes:** `proto_m02_case_` / **Secondary telemetry:** -
- **Primary source:** https://doi.org/10.1037/pspp0000096

## M03 - BFI-2 Conscientiousness / Organization

- **Exact source item (criterion comparison; internal only):** Keeps things neat and tidy.
- **Final disposition:** GAME-CANDIDATE — STRONG (`strong`)
- **Analysis level:** Organization facet; aggregate two item-owned occasions
- **Final game opportunity (sheet 09):** After two unrelated jobs, allow an optional workstation reset: return the same number of item-local tools/materials to clearly marked homes before leaving.
- **Candidate raw variables (raw components only):** `objects_restored_o1`, `homes_correct_o1`, `close_state_o1`, `objects_restored_o2`, `homes_correct_o2`, `close_state_o2`
- **Validity / missing gate:** Matched object counts; independent spawn; exit remains open; no explicit cleanup order; M04 debris excluded.
- **Main rival explanations:** Demand characteristics; cue salience; matching ability.
- **Active seconds:** 25 / **Episode:** 2 + 5
- **Implementation action:** KEEP inventory foundation; add two natural route occasions.
- **Route (this mission, provisional):** Records Workshop press (occasion 1) and Workshop Return press (occasion 2) - After an unrelated job the workstation is left with a fixed number of item-local residuals and clearly marked homes; the reset is optional and never instructed; exit stays open.
- **Opportunity ids:** `proto_m03_reset_a`, `proto_m03_reset_b` / **Family prefixes:** `proto_m03_` / **Secondary telemetry:** -
- **Primary source:** https://doi.org/10.1037/pspp0000096

## M04 - BFI-2 Conscientiousness / Organization

- **Exact source item (criterion comparison; internal only):** Leaves a mess, doesn’t clean up.
- **Final disposition:** GAME-CANDIDATE — STRONG (`strong`)
- **Analysis level:** Organization facet; reverse-keyed item component
- **Final game opportunity (sheet 09):** A neutral sample job creates six standardized, self-generated debris objects. Disposal is optional and the route never gates on cleanup.
- **Candidate raw variables (raw components only):** `debris_remaining_at_exit`, `debris_disposed`, `cleanup_latency`, `window_exposure`
- **Validity / missing gate:** Exactly six salient/reachable objects; disposal works; no time pressure; debris not reused by M03; route exit always available.
- **Main rival explanations:** Perceived norms; salience; demand characteristics.
- **Active seconds:** 25 / **Episode:** 2 Records & Workshop
- **Implementation action:** KEEP, but visually strengthen debris and test untouched/partial/full states.
- **Route (this mission, provisional):** Records Workshop - sample-job debris - A neutral sample job creates six standardised, self-generated debris objects; disposal is optional, the route never gates on cleanup, debris is never reused by M03.
- **Opportunity ids:** `proto_m04_debris_cleanup` / **Family prefixes:** `proto_m04_debris_` / **Secondary telemetry:** -
- **Primary source:** https://doi.org/10.1037/pspp0000096

## M05 - BFI-2 Conscientiousness / Productiveness

- **Exact source item (criterion comparison; internal only):** Has difficulty getting started on tasks.
- **Final disposition:** GAME-CANDIDATE — CONDITIONAL (`conditional`)
- **Analysis level:** Productiveness facet; aggregate two micro-opportunities
- **Final game opportunity (sheet 09):** After objective comprehension, present two low-risk visible faults at separate quiet moments without an NPC command; other actions remain neutral.
- **Candidate raw variables (raw components only):** `eligible_opportunity`, `initiation_latency`, `initiated`, `censored_reason`, `occasion_id`
- **Validity / missing gate:** Clock starts after comprehension; fixed distance/access; valid focus/input state; no competing mandatory action; latency censoring preserved.
- **Main rival explanations:** Caution; uncertainty; motor speed; one situation is too narrow.
- **Active seconds:** 20 / **Episode:** 1 + 4
- **Implementation action:** REVISE from one latency to two matched, comprehension-gated occasions.
- **Route (this mission, provisional):** Concourse visible fault (occasion 1); Recovery Yard visible fault (occasion 2) - Two low-risk visible faults at separate quiet moments after objective comprehension, without an NPC command; the initiation clock starts after comprehension and latency censoring is preserved.
- **Opportunity ids:** `proto_m05_initiation_o1`, `proto_m05_initiation_o2` / **Family prefixes:** `proto_m05_initiation_` / **Secondary telemetry:** -
- **Primary source:** https://doi.org/10.1037/pspp0000096

## M06 - BFI-2 Conscientiousness / Productiveness

- **Exact source item (criterion comparison; internal only):** Is efficient, gets things done.
- **Final disposition:** GAME-CANDIDATE — CONDITIONAL (`conditional`)
- **Analysis level:** Productiveness facet; quality-adjusted work-sample component
- **Final game opportunity (sheet 09):** After non-scored practice, compose and dispatch four routine pseudo-commands using visible tokens/reference; typing is optional, not required.
- **Candidate raw variables (raw components only):** `correct_dispatches`, `invalid_commands`, `excess_actions`, `active_time_excl_animation`, `practice_passed`
- **Validity / missing gate:** Practice criterion; matched commands; quality floor; animation excluded; keyboard/pointer semantic equivalence.
- **Main rival explanations:** Working memory; interface fluency; gaming experience. Speed alone is prohibited.
- **Active seconds:** 35 / **Episode:** 2 Records & Workshop
- **Implementation action:** KEEP engine; simplify presentation and pre-register only raw components.
- **Route (this mission, provisional):** Records Workshop - dispatch console - After non-scored practice, compose and dispatch four routine pseudo-commands from visible tokens/reference; typing optional; animation time excluded.
- **Opportunity ids:** `proto_m06_routine_dispatch` / **Family prefixes:** `proto_m06_dispatch_` / **Secondary telemetry:** -
- **Primary source:** https://doi.org/10.1037/pspp0000096

## M07 - BFI-2 Conscientiousness / Productiveness

- **Exact source item (criterion comparison; internal only):** Is persistent, works until the task is finished.
- **Final disposition:** GAME-CANDIDATE — CONDITIONAL (`conditional`)
- **Analysis level:** Productiveness facet; distinguish routine finish-through from PDD
- **Final game opportunity (sheet 09):** Six-stage routine calibration with visible endpoint and persistent state; participant may leave and naturally return. No injected setback or difficulty spike.
- **Candidate raw variables (raw components only):** `stages_completed`, `voluntary_returns`, `useful_reengagement`, `completion`, `departure_state`
- **Validity / missing gate:** Attainable; controls known; endpoint visible; no setback; state persists; no route gate forcing completion.
- **Main rival explanations:** Interest; ability; fatigue; completion pressure.
- **Active seconds:** 35 / **Episode:** 2 + 5
- **Implementation action:** IMPLEMENT as routine project, not the difficult persistence task.
- **Route (this mission, provisional):** Records Workshop calibration bench (start) / Workshop Return (end) - Six-stage routine calibration with a visible endpoint and persistent state; the participant may leave and naturally return; no injected setback or difficulty spike; no route gate forces completion.
- **Opportunity ids:** `proto_m07_calibration_project` / **Family prefixes:** `proto_m07_calibration_` / **Secondary telemetry:** -
- **Primary source:** https://doi.org/10.1037/pspp0000096

## M08 - BFI-2 Conscientiousness / Productiveness

- **Exact source item (criterion comparison; internal only):** Tends to be lazy.
- **Final disposition:** QUESTIONNAIRE-PRIMARY (`questionnaire_primary`)
- **Analysis level:** Exact BFI-2 item; optional work behavior is secondary only
- **Final game opportunity (sheet 09):** No scored standalone minigame. Two naturally available useful jobs may generate descriptive secondary telemetry only.
- **Candidate raw variables (raw components only):** `secondary_optional_job_engagement`, `eligible_context`, `fatigue_context`
- **Validity / missing gate:** Never interpreted as a score; exact item remains in questionnaire; no rewards/route gates tied to engagement.
- **Main rival explanations:** Moralized/broad wording; fatigue; boredom; reward preference; task meaning.
- **Active seconds:** 0 / **Episode:** Across route — secondary only
- **Implementation action:** REMOVE primary game inference; retain exact questionnaire item.
- **Route (this mission, provisional):** Across route - two naturally available optional useful jobs - No scored minigame. Optional-job engagement is descriptive secondary telemetry only and is never interpreted as a score; the exact item stays in the questionnaire.
- **Opportunity ids:** - / **Family prefixes:** - / **Secondary telemetry:** `secondary_m08_optional_job`
- **Primary source:** https://doi.org/10.1037/pspp0000096

## M09 - BFI-2 Conscientiousness / Responsibility

- **Exact source item (criterion comparison; internal only):** Is dependable, steady.
- **Final disposition:** GAME-CANDIDATE — STRONG (`strong`)
- **Analysis level:** Responsibility facet; aggregate two scheduled item-owned checks
- **Final game opportunity (sheet 09):** Voluntarily accept a monitor watch with two scheduled gauge checks at fixed route milestones, equal reminders and guaranteed access.
- **Candidate raw variables (raw components only):** `check1_completed`, `check2_completed`, `due_delta_1`, `due_delta_2`, `reminder_exposure`
- **Validity / missing gate:** Explicit acceptance; both windows presented; no competing mandatory task; route access identical; failures distinguished from invalid presentation.
- **Main rival explanations:** Prospective memory; route knowledge; interruption exposure.
- **Active seconds:** 25 / **Episode:** 1 + 5
- **Implementation action:** KEEP and intentionally require one meaningful return through the hub.
- **Route (this mission, provisional):** Concourse monitor gauge - accepted in episode 1; check 1 due before leaving the Concourse, check 2 due on the return - Voluntarily accept a monitor watch with two scheduled gauge checks at fixed milestones, equal reminders and guaranteed access; failures are distinguished from invalid presentation.
- **Opportunity ids:** `proto_m09_monitor_watch` / **Family prefixes:** `proto_m09_watch_` / **Secondary telemetry:** -
- **Primary source:** https://doi.org/10.1037/pspp0000096

## M10 - BFI-2 Conscientiousness / Responsibility

- **Exact source item (criterion comparison; internal only):** Is reliable, can always be counted on.
- **Final disposition:** GAME-CANDIDATE — STRONG (`strong`)
- **Analysis level:** Responsibility facet; bounded social commitment
- **Final game opportunity (sheet 09):** Voluntarily accept delivery of a named component, receive a standardized interruption, and later hand it to the available named NPC.
- **Candidate raw variables (raw components only):** `promise_accepted`, `promise_fulfilled`, `handover_delay`, `interruption_exposure`, `cutoff_state`
- **Validity / missing gate:** Explicit acceptance; item/recipient always available; one neutral reminder; no dialogue wording scored.
- **Main rival explanations:** Memory; navigation; social desirability.
- **Active seconds:** 20 / **Episode:** 1 + 5
- **Implementation action:** KEEP; use Vale/Kai/Noor with persistent mission log and natural return.
- **Route (this mission, provisional):** Concourse (accept) -> named NPC on the return (handover) - Voluntarily accept delivery of a named component, receive a standardised interruption, and later hand it to the available named NPC; one neutral reminder; no dialogue wording scored.
- **Opportunity ids:** `proto_m10_component_promise` / **Family prefixes:** `proto_m10_promise_` / **Secondary telemetry:** -
- **Primary source:** https://doi.org/10.1037/pspp0000096

## M11 - BFI-2 Conscientiousness / Responsibility

- **Exact source item (criterion comparison; internal only):** Sometimes behaves irresponsibly.
- **Final disposition:** QUESTIONNAIRE-PRIMARY (`questionnaire_primary`)
- **Analysis level:** Exact BFI-2 item; acknowledged seal behavior is exploratory
- **Final game opportunity (sheet 09):** Keep the sample-seal obligation as a secondary safety/compliance observation only; do not use one narrow lapse as broad irresponsibility.
- **Candidate raw variables (raw components only):** `secondary_obligation_acknowledged`, `secondary_seal_resolved_at_transfer`
- **Validity / missing gate:** Exact item remains in questionnaire; no hazard penalty; transfer path works; secondary telemetry labelled non-primary.
- **Main rival explanations:** Risk interpretation; moral framing; compliance; one strong situation.
- **Active seconds:** 0 / **Episode:** 2 — secondary only
- **Implementation action:** DOWNGRADE game task to secondary; retain exact questionnaire item.
- **Route (this mission, provisional):** Records Workshop - sample-seal obligation (secondary only) - Sample-seal obligation kept as secondary safety/compliance telemetry only; no hazard penalty; never broad irresponsibility; the exact item stays in the questionnaire.
- **Opportunity ids:** - / **Family prefixes:** - / **Secondary telemetry:** `secondary_m11_seal_obligation`
- **Primary source:** https://doi.org/10.1037/pspp0000096

## M12 - BFI-2 Conscientiousness / Responsibility

- **Exact source item (criterion comparison; internal only):** Can be somewhat careless.
- **Final disposition:** GAME-CANDIDATE — CONDITIONAL (`conditional`)
- **Analysis level:** Responsibility facet; aggregate two matched QC occasions
- **Final game opportunity (sheet 09):** Inspect two independent completed work products, each with one visible-but-not-salient matched error, and optionally correct before submit.
- **Candidate raw variables (raw components only):** `error_detected_o1`, `error_corrected_o1`, `error_detected_o2`, `error_corrected_o2`, `inspection_actions`
- **Validity / missing gate:** Error present/reachable; inspection practiced; no time pressure; matched salience; accessibility equivalent.
- **Main rival explanations:** Visual acuity; domain knowledge; cautiousness; interface search.
- **Active seconds:** 30 / **Episode:** 1 + 2
- **Implementation action:** REVISE from one error to two matched observations; no speed score.
- **Route (this mission, provisional):** Concourse QC packet (occasion 1); Records Workshop completed work product (occasion 2) - Two matched, independently reachable quality-control occasions: inspect a completed work product with one visible-but-not-salient matched error and optionally correct before submit; form and order recorded; no speed score.
- **Opportunity ids:** `proto_m12_qc_o1`, `proto_m12_qc_o2` / **Family prefixes:** `proto_m12_qc_` / **Secondary telemetry:** -
- **Primary source:** https://doi.org/10.1037/pspp0000096

## M13 - BESSI-192 / Information Processing Skill

- **Exact source item (criterion comparison; internal only):** Solve puzzles.
- **Final disposition:** GAME-CANDIDATE — STRONG (`strong`)
- **Analysis level:** Information Processing facet; performance method is not self-report equivalence
- **Final game opportunity (sheet 09):** Repair a 3×3 pipe/signal network by placing and rotating a complete piece set so endpoints connect, the valve is inline and no branch remains open.
- **Candidate raw variables (raw components only):** `constraints_satisfied`, `open_branch_count`, `rotations`, `placements`, `valid_submission`, `completion`
- **Validity / missing gate:** Worked example; complete standardized set; connectivity validator; corrections allowed; no domain-specific symbols; accessible lane.
- **Main rival explanations:** Visuospatial ability; puzzle familiarity; motor/UI skill.
- **Active seconds:** 90 / **Episode:** 2 Records & Workshop
- **Implementation action:** KEEP but fix usability: snap/rotate feedback, undo/reset, no sloppy hit targets.
- **Route (this mission, provisional):** Records Workshop - conduit lattice bench (physical 3x3 pipe network) - Physical 3x3 pipe/signal network: place and rotate a complete piece set so endpoints connect, the valve is inline and no branch remains open; hit targets, rotation/snap feedback, undo/reset and an accessible lane; no auto-completion, no card answer.
- **Opportunity ids:** `proto_m13_lattice_construction` / **Family prefixes:** `proto_m13_lattice_` / **Secondary telemetry:** -
- **Primary source:** https://doi.org/10.1037/pspp0000401

## M14 - BESSI-192 / Information Processing Skill

- **Exact source item (criterion comparison; internal only):** Handle a lot of information.
- **Final disposition:** GAME-CANDIDATE — STRONG (`strong`)
- **Analysis level:** Information Processing facet; capacity/work-sample component
- **Final game opportunity (sheet 09):** One incident desk combines six messages, three gauges and one station diagram; assign faults and priorities while every source remains externally visible.
- **Candidate raw variables (raw components only):** `source_case_links`, `omissions`, `unresolved_conflicts`, `final_assignments`, `source_consults`
- **Validity / missing gate:** All sources visible; reading load controlled; no memory requirement; display accessible; independent packet/window.
- **Main rival explanations:** Reading; interface navigation; strategy; overlap with M15 if relations are reused.
- **Active seconds:** 65 / **Episode:** 1 Incident Handover
- **Implementation action:** KEEP, but make it a spatial work surface rather than repetitive card prompts.
- **Route (this mission, provisional):** Concourse - multi-source incident desk (spatial work surface) - One incident desk combining six messages, three gauges and one station diagram; assign faults and priorities while every source remains externally visible; independent packet/window.
- **Opportunity ids:** `proto_m14_incident_desk` / **Family prefixes:** `proto_m14_desk_` / **Secondary telemetry:** -
- **Primary source:** https://doi.org/10.1037/pspp0000401

## M15 - BESSI-192 / Information Processing Skill

- **Exact source item (criterion comparison; internal only):** Make sense of complex information.
- **Final disposition:** GAME-CANDIDATE — STRONG (`strong`)
- **Analysis level:** Information Processing facet; relational synthesis component
- **Final game opportunity (sheet 09):** Build a compact causal subsystem model from independent evidence, then predict the effect of one intervention.
- **Candidate raw variables (raw components only):** `required_causal_edges`, `invalid_edges`, `corrections`, `intervention_prediction_accuracy`
- **Validity / missing gate:** Independent case; diagram tutorial; domain-neutral semantics; all evidence obtainable; matched form.
- **Main rival explanations:** General reasoning; diagram literacy; reading.
- **Active seconds:** 65 / **Episode:** 3 Signal Analysis
- **Implementation action:** KEEP; embed as one phase of the signal-decoder incident, not a separate room.
- **Route (this mission, provisional):** Diagnostics Laboratory - signal case phase 1 (causal model) - Phase 1 of the signal-analysis case: build a compact causal subsystem model from independent evidence, then predict the effect of one intervention (existing relational engine and validator retained).
- **Opportunity ids:** `proto_m15_layered_cipher` / **Family prefixes:** `proto_m15_cipher_` / **Secondary telemetry:** -
- **Primary source:** https://doi.org/10.1037/pspp0000401

## M16 - BESSI-192 / Information Processing Skill

- **Exact source item (criterion comparison; internal only):** Process new information.
- **Final disposition:** GAME-CANDIDATE — STRONG (`strong`)
- **Analysis level:** Information Processing facet; novel-rule component
- **Final game opportunity (sheet 09):** Learn a novel three-part alien/signal protocol and classify six unseen cases into process lanes using tokens or typed aliases.
- **Candidate raw variables (raw components only):** `unseen_case_accuracy`, `rule_consistent_errors`, `corrections`, `study_time`, `reference_consults`
- **Validity / missing gate:** Protocol genuinely novel; example comprehension; matched forms; no prior route exposure to symbols.
- **Main rival explanations:** Reading; prior analogous knowledge; interface literacy.
- **Active seconds:** 50 / **Episode:** 3 Signal Analysis
- **Implementation action:** KEEP; one concise tutorial, then unseen cases. Avoid repeated near-identical consoles.
- **Route (this mission, provisional):** Diagnostics Laboratory - signal case phase 2 (novel protocol) - Phase 2: learn a genuinely novel three-part signal protocol and classify unseen cases into process lanes using tokens or typed aliases; one concise tutorial, then unseen cases.
- **Opportunity ids:** `proto_m16_protocol_update` / **Family prefixes:** `proto_m16_protocol_` / **Secondary telemetry:** -
- **Primary source:** https://doi.org/10.1037/pspp0000401

## M17 - BESSI-192 / Information Processing Skill

- **Exact source item (criterion comparison; internal only):** Learn things quickly.
- **Final disposition:** GAME-CANDIDATE — STRONG (`strong`)
- **Analysis level:** Information Processing facet; transfer, not speed alone
- **Final game opportunity (sheet 09):** Observe one demonstration, complete one guided practice, then solve a changed unassisted transfer case.
- **Candidate raw variables (raw components only):** `practice_accuracy`, `transfer_first_attempt`, `transfer_correct_steps`, `hints_used`, `transfer_completion`
- **Validity / missing gate:** Novel mapping; practice criterion; changed transfer; floor/ceiling pilot; motor time not scored.
- **Main rival explanations:** Motor sequence ability; prior analogous experience; instruction comprehension.
- **Active seconds:** 55 / **Episode:** 3 Signal Analysis
- **Implementation action:** KEEP and shorten to one demo + one practice + one changed transfer.
- **Route (this mission, provisional):** Diagnostics Laboratory - signal case phase 3 (demonstration / practice / transfer) - Phase 3: one demonstration, one guided practice, then one changed unassisted transfer case; motor time is not scored.
- **Opportunity ids:** `proto_m17_syntax_acquisition` / **Family prefixes:** `proto_m17_syntax_` / **Secondary telemetry:** -
- **Primary source:** https://doi.org/10.1037/pspp0000401

## M18 - BESSI-192 / Information Processing Skill

- **Exact source item (criterion comparison; internal only):** Find logical solutions to problems.
- **Final disposition:** GAME-CANDIDATE — STRONG (`strong`)
- **Analysis level:** Information Processing facet; logical hypothesis-testing component
- **Final game opportunity (sheet 09):** Test reversible hypotheses against independent evidence panels, eliminate contradictions and submit the sole evidence-consistent fault.
- **Candidate raw variables (raw components only):** `tests_selected`, `contradictions_eliminated`, `redundant_tests`, `evidence_consistent_steps`, `diagnosis_accuracy`
- **Validity / missing gate:** All evidence obtainable; no specialist knowledge; matched cases; independent from M13 state and events.
- **Main rival explanations:** General reasoning; search strategy; reading.
- **Active seconds:** 65 / **Episode:** 3 Signal Analysis
- **Implementation action:** KEEP M18 here, not in the pipe puzzle; simplify UI and remove answer-card feel.
- **Route (this mission, provisional):** Diagnostics Laboratory - signal case phase 4 (hypothesis diagnosis) - Phase 4: test reversible hypotheses against independent evidence panels, eliminate contradictions and submit the sole evidence-consistent fault; independent of M13 state and events.
- **Opportunity ids:** `proto_m18_lattice_fault_diagnosis` / **Family prefixes:** `proto_m18_fault_` / **Secondary telemetry:** -
- **Primary source:** https://doi.org/10.1037/pspp0000401

## M19 - Multidimensional Persistence Scale / Persistence Despite Difficulty

- **Exact source item (criterion comparison; internal only):** I keep on going when the going gets tough.
- **Final disposition:** GAME-CANDIDATE — STRONG (`strong`)
- **Analysis level:** PDD scale; attainable post-difficulty behavior
- **Final game opportunity (sheet 09):** Regulate a progressive valve/coupling task: resistance increases after initial progress, feedback stays informative and completion remains attainable.
- **Candidate raw variables (raw components only):** `difficulty_onset`, `postdifficulty_reengagement`, `useful_attempts`, `progress`, `completion`, `stop_choice`
- **Validity / missing gate:** Difficulty understood; matched calibration; attainable endpoint; neutral stop; no zero-utility state.
- **Main rival explanations:** Ability; attainability belief; interest; frustration tolerance.
- **Active seconds:** 50 / **Episode:** 4 Exterior Recovery
- **Implementation action:** KEEP as physical mechanic; pilot adaptive band before interpreting persistence.
- **Route (this mission, provisional):** Recovery Yard - difficult valve/coupling - Progressive physical valve/coupling: resistance increases after initial progress, feedback stays informative, completion remains attainable, a neutral stop is always available.
- **Opportunity ids:** `proto_m19_progressive_valve` / **Family prefixes:** `proto_m19_valve_` / **Secondary telemetry:** -
- **Primary source:** https://doi.org/10.1016/j.paid.2018.11.005

## M20 - Multidimensional Persistence Scale / Persistence Despite Difficulty

- **Exact source item (criterion comparison; internal only):** People describe me as someone who can stick at a task, even when it gets difficult.
- **Final disposition:** GAME-CANDIDATE — STRONG (`strong`)
- **Analysis level:** PDD scale; longitudinal return/completion component
- **Final game opportunity (sheet 09):** Begin a multi-stage antenna restoration, leave for one required intervening duty, then receive a natural opportunity to resume and finish.
- **Candidate raw variables (raw components only):** `progress_pre_interruption`, `returned`, `resume_latency`, `useful_resume_actions`, `completion`
- **Validity / missing gate:** Task remains attainable/unchanged; guaranteed return route; identical interruption; state persists visibly.
- **Main rival explanations:** Prospective memory; navigation; project interest; ability.
- **Active seconds:** 55 / **Episode:** 4 + 5
- **Implementation action:** KEEP and use it to justify one purposeful backtrack, not maze wandering.
- **Route (this mission, provisional):** Recovery Yard mast (start) -> Workshop Return feed console (resume/finish) - Multi-stage antenna restoration begun outside, interrupted by the one required return duty, then a natural (uncommanded) opportunity to resume and finish with visibly persisted state.
- **Opportunity ids:** `proto_m20_antenna_restoration` / **Family prefixes:** `proto_m20_antenna_` / **Secondary telemetry:** -
- **Primary source:** https://doi.org/10.1016/j.paid.2018.11.005

## M21 - Multidimensional Persistence Scale / Persistence Despite Difficulty

- **Exact source item (criterion comparison; internal only):** Even if it’s difficult to understand, I will read an entire book until I “get” it.
- **Final disposition:** GAME-CANDIDATE — CONDITIONAL (`conditional`)
- **Analysis level:** PDD scale; understanding/application required; reading time alone prohibited
- **Final game opportunity (sheet 09):** Use a concise unfamiliar, cross-referenced manual (text + equivalent audio/diagram mode) to infer a rule and apply it to a novel repair.
- **Candidate raw variables (raw components only):** `reference_sections_used`, `cross_reference_depth`, `reengagement`, `correct_rule_application`, `completion`
- **Validity / missing gate:** Language calibrated; accessible equivalent mode; application attainable; scrolling/reading duration never primary.
- **Main rival explanations:** Reading/language proficiency; working memory; domain familiarity.
- **Active seconds:** 55 / **Episode:** 5 Return & Handover
- **Implementation action:** REVISE for multimodal equivalence; drop if language effects dominate pilot data.
- **Route (this mission, provisional):** Workshop Return - manual-based repair - Concise unfamiliar cross-referenced manual (text + equivalent diagram mode) used to infer a rule and apply it to a novel repair; reading duration is never primary.
- **Opportunity ids:** `proto_m21_manual_repair` / **Family prefixes:** `proto_m21_manual_` / **Secondary telemetry:** -
- **Primary source:** https://doi.org/10.1016/j.paid.2018.11.005

## M22 - Multidimensional Persistence Scale / Persistence Despite Difficulty

- **Exact source item (criterion comparison; internal only):** Setbacks do not discourage me.
- **Final disposition:** GAME-CANDIDATE — STRONG (`strong`)
- **Analysis level:** PDD scale; standardized setback/recovery component
- **Final game opportunity (sheet 09):** Submit a reasonable report, receive a standardized newly revealed criterion, then revise and resubmit using actionable feedback.
- **Candidate raw variables (raw components only):** `setback_presented`, `revision_started`, `feedback_consistent_edits`, `resubmitted`, `recovery_complete`
- **Validity / missing gate:** Initial response valid; feedback understood; recovery attainable; no blame framing; same criterion by form.
- **Main rival explanations:** Writing; attribution; feedback comprehension.
- **Active seconds:** 50 / **Episode:** 5 Return & Handover
- **Implementation action:** KEEP; use direct editing/assembly rather than four multiple-choice report cards.
- **Route (this mission, provisional):** Workshop Return - shift report desk - Submit a reasonable assembled report, receive a standardised newly revealed criterion, then revise and resubmit using actionable feedback (direct editing/assembly, not multiple-choice cards).
- **Opportunity ids:** `proto_m22_report_revision` / **Family prefixes:** `proto_m22_report_` / **Secondary telemetry:** -
- **Primary source:** https://doi.org/10.1016/j.paid.2018.11.005

## M23 - Multidimensional Persistence Scale / Persistence Despite Difficulty

- **Exact source item (criterion comparison; internal only):** Even if something is hard, I will keep trying at it.
- **Final disposition:** GAME-CANDIDATE — STRONG (`strong`)
- **Analysis level:** PDD scale; useful adaptive retries only
- **Final game opportunity (sheet 09):** Scanner-guided excavation: use C-strength/bearing feedback to narrow a bounded field, then D-dig exact terrain cells to recover an attainable buried component.
- **Candidate raw variables (raw components only):** `informative_scan_moves`, `signal_strength_changes`, `exact_dig_attempts`, `useful_strategy_shifts`, `recovery_complete`
- **Validity / missing gate:** Scanner tutorial passed; target fixed/counterbalanced; feedback truthful; task attainable; blind/random actions excluded; no M24 events.
- **Main rival explanations:** Spatial reasoning; navigation; control familiarity; search strategy.
- **Active seconds:** 60 / **Episode:** 4 Exterior Recovery
- **Implementation action:** PREFER current scan/dig mechanics over another pseudo-command console; keep item-local bounded field.
- **Route (this mission, provisional):** Recovery Yard - scanner-guided excavation plot - Existing scanner-guided excavation: C-strength/bearing feedback narrows a bounded field, D-dig exact terrain cells to recover an attainable buried component; bounded and recoverable; useful progress distinguished from aimless time.
- **Opportunity ids:** `proto_m23_field_recovery` / **Family prefixes:** `proto_m23_field_recovery_` / **Secondary telemetry:** -
- **Primary source:** https://doi.org/10.1016/j.paid.2018.11.005

## M24 - Multidimensional Persistence Scale / Inappropriate Persistence

- **Exact source item (criterion comparison; internal only):** Sometimes I find myself continuing to do something, even when there is no point in carrying on.
- **Final disposition:** GAME-CANDIDATE — STRONG (`strong`)
- **Analysis level:** IP scale; behavior only after verified zero utility
- **Final game opportunity (sheet 09):** Metal Recovery Yard magnet rig: complete a finite useful deck; then show and acknowledge objective depletion while an equally visible useful alternative is available.
- **Candidate raw variables (raw components only):** `depletion_reached`, `depletion_acknowledged`, `postdepletion_casts`, `identical_postdepletion_cycles`, `alternative_opened`
- **Validity / missing gate:** Finite deck advances consistently; zero utility objectively true; no random jackpot after depletion; comprehension confirmed; misses before depletion excluded.
- **Main rival explanations:** Signal trust; curiosity; learned reward history; timing-game skill.
- **Active seconds:** 55 / **Episode:** 4 Exterior Recovery
- **Implementation action:** KEEP magnet fishing; make deck/depletion state unambiguous and persist across room returns.
- **Route (this mission, provisional):** Metal Recovery Yard - magnet rig (F, rig-local) - Finite magnet-recovery deck; every completed cycle advances the deck; objective depletion shown and acknowledged with an equally visible useful alternative; state persists across room returns; no reward after depletion; misses, empty pulls and depletion remain distinguishable.
- **Opportunity ids:** `proto_m24_magnet_utility` / **Family prefixes:** `proto_m24_magnet_utility_` / **Secondary telemetry:** -
- **Primary source:** https://doi.org/10.1016/j.paid.2018.11.005

## M25 - Multidimensional Persistence Scale / Inappropriate Persistence

- **Exact source item (criterion comparison; internal only):** Sometimes I will keep doing the same thing over and over, but I believe that it is normal to do so.
- **Final disposition:** QUESTIONNAIRE-PRIMARY / HYBRID REQUIRED (`questionnaire_primary`)
- **Analysis level:** Private belief cannot be inferred from repetition
- **Final game opportunity (sheet 09):** A locked-command repetition task may remain exploratory, but interpretation requires the exact questionnaire item or a transparent direct belief/expectancy probe.
- **Candidate raw variables (raw components only):** `secondary_unchanged_resubmits_after_lock`, `direct_belief_probe`, `lock_comprehension`
- **Validity / missing gate:** No game-only score; lock understood; bounce suppressed; reset visible; direct belief measure stored separately.
- **Main rival explanations:** Habit; interface error; curiosity; the source item's belief clause is unobserved behaviorally.
- **Active seconds:** 0 / **Episode:** 5 — questionnaire/hybrid
- **Implementation action:** REMOVE primary game-only inference; retain exact questionnaire item and optional hybrid research probe.
- **Route (this mission, provisional):** Workshop Return - transparent self-report probe (questionnaire/hybrid) - Transparent direct belief/expectancy probe presented openly as a self-report item and stored separately from every behavioural component; the exact source item remains in the questionnaire; any locked-command repetition telemetry is secondary context only.
- **Opportunity ids:** `proto_m25_belief_probe` / **Family prefixes:** `proto_m25_probe_` / **Secondary telemetry:** `secondary_m25_lock_resubmits`
- **Primary source:** https://doi.org/10.1016/j.paid.2018.11.005

## M26 - Multidimensional Persistence Scale / Inappropriate Persistence

- **Exact source item (criterion comparison; internal only):** I will keep trying at something, even if I know my actions are worthless.
- **Final disposition:** GAME-CANDIDATE — STRONG (`strong`)
- **Analysis level:** IP scale; post-knowledge behavior only
- **Final game opportunity (sheet 09):** After one successful transmission, physically disconnect the channel, demonstrate and acknowledge the state, while a working alternative channel remains available.
- **Candidate raw variables (raw components only):** `disconnect_acknowledged`, `confirmation_probe_excluded`, `postknowledge_transmissions`, `alternative_used`
- **Validity / missing gate:** Worthlessness beyond doubt; first confirmation probe excluded; alternative equally accessible; no hidden recovery.
- **Main rival explanations:** Signal trust; curiosity; desire to test once.
- **Active seconds:** 40 / **Episode:** 4 Exterior Recovery
- **Implementation action:** KEEP with explicit knowledge check and persistent physical disconnect state.
- **Route (this mission, provisional):** Recovery Yard - transmission channel post - After one successful transmission the channel is physically disconnected, demonstrated and acknowledged while a working alternative channel remains equally available; the first confirmation probe is excluded; the disconnect state persists.
- **Opportunity ids:** `proto_m26_channel_disconnect` / **Family prefixes:** `proto_m26_channel_` / **Secondary telemetry:** -
- **Primary source:** https://doi.org/10.1016/j.paid.2018.11.005
