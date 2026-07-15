<!--
Canonical Markdown companion to the research-owner review draft.
Generated from the Q01–Q33 Word specification on 15 July 2026.
Exact questionnaire wording remains governed by Original_question_items.
-->

REMOTE OUTPOST ASSESSMENT

# Q01–Q33 Gamified Measurement Translation Specification

_How each questionnaire item is represented through gameplay opportunities, choices, process measures and outcomes_

| Document status    | Research-owner review draft                                                                                                |
| ------------------ | -------------------------------------------------------------------------------------------------------------------------- |
| Version            | 0.1                                                                                                                        |
| Date               | 15 July 2026                                                                                                               |
| Scientific battery | 33 items: BFI-2 Conscientiousness, Grit-S, Persistence Despite Difficulty, Inappropriate Persistence, Goal-Time Preference |
| Purpose            | Consolidate the agreed translation logic before further implementation and scoring decisions                               |

This document specifies behavioural analogues and candidate measurements. It does not approve final scoring weights, cut-offs, composite formulas, missing-data rules or production event-schema changes.

# 1. Purpose and current scientific position

Core design position. The 33 validated questionnaire items remain a post-game self-report battery. The game does not reproduce the item wording as disguised questions. Instead, it creates standardised behavioural opportunities in which persistence, organisation, productiveness, responsibility, prudence and goal-horizon preferences may be expressed. The resulting behavioural variables are then compared with the self-report scores.
Important interpretation boundary. A game event is not automatically an item score. Several questionnaire items—especially Grit-S Consistency of Interest and Goal-Time Preference—describe habitual or multi-month/multi-year patterns. A short game can only provide exploratory analogues of those constructs.

## 1.1 Locked source and mapping corrections

- Q01–Q33 are project-specific identifiers and do not follow the original questionnaire item order.
- Q04 maps to BFI-C-10, “Leaves a mess, doesn’t clean up.” It must be represented by explicit cleanup/restoration behaviour, not planning-before-action.
- Q18 maps to GRIT-06 and Q20 maps to GRIT-03; both remain questionnaire-primary because their original meanings are long-horizon.
- Q29–Q33 are retained in the 33-item battery as Goal-Time Preference items, but their game measures are exploratory.
- Q32 (“Most of the goals I work on take years to finish.”) is long-term-oriented. It is not reverse-scored relative to long-term orientation.
- Q29 and Q31 share one goal-horizon behavioural dimension; they must not be counted as independent observations when they arise from the same choice.

## 1.2 Evidence-strength labels

| Label                     | Meaning                                                                                                                |
| ------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| Strong analogue           | The opportunity closely matches the item meaning and can be measured with a clear event sequence, subject to controls. |
| Moderate analogue         | The behaviour is relevant but has plausible alternative explanations or requires multiple observations.                |
| Weak exploratory analogue | The game samples only a short-session proxy for a broader or long-horizon construct.                                   |
| Questionnaire-primary     | The original item meaning cannot be reproduced defensibly in a short session; game variables are supplementary only.   |

## 1.3 Measurement architecture applied to every item

Opportunity: Was the participant exposed to a valid, comprehensible situation in which the behaviour could occur?
Choice/action: What option or action did the participant select?
Process: What was the order of actions, latency, feedback use, revision, return, abandonment or verification pattern?
Outcome: Was the task completed, left unresolved, completed with avoidable errors, or associated with a later consequence?
Controls: Dock performance, gaming experience, keyboard comfort, instruction comprehension and technical interruptions must be separated from trait interpretation.

## 1.4 Timing principles

- The intended playable assessment is approximately 14–18 minutes, subject to usability testing.
- No item should be scored using a universal rule such as “more time equals more persistence.”
- Latency is primary only where the construct concerns initiation; elsewhere it is a supporting process variable.
- Task-specific clocks begin only after the objective is clearly presented and the player has control.
- No-opportunity, technical interruption and comprehension-failure states must be distinguishable from behavioural non-performance.
  | Module | Designed exposure | Primary role | Time interpretation |
  | --- | --- | --- | --- |
  | Dock / Arrival Bay | 1–2 min | Controls only | Tutorial and navigation covariates; never a personality score. |
  | Archive | 1.5–2.5 min | Failure, feedback and revision | Sequence matters more than total duration. |
  | Systems Repair | 1.5–2.5 min | Difficulty persistence and completion | Effort must be productive and adaptation-aware. |
  | Engineer Hub | 1–1.5 min plus later follow-through | Reporting and responsibility | Commitment is measured across rooms. |
  | Inventory / Prep | 1.5–2.5 min | Organisation and goal granularity | Accuracy/order primary; speed secondary. |
  | Hazard Control | 1–1.5 min | Prudence/carefulness | Not a fear or goal-time measure. |
  | Optional Side Repair / Anomaly Arc | 1.5–3 min, optional and distributed | Diligence, follow-through, exploratory interest continuity | Acceptance, stages, deferment and return are separate. |
  | Interruption Corridor | Embedded across 1–2 min | Switching, return and continuity | Initial choice must be recorded before interruption. |
  | Final Core | 1.5–2.5 min | Issue review, integration and completion portfolio | Do not equate rushing with short-term preference. |

# 2. Q01–Q33 summary matrix

| ID  | Item meaning                        | Primary game evidence                                                  | Status                            |
| --- | ----------------------------------- | ---------------------------------------------------------------------- | --------------------------------- |
| Q01 | Systematic / orderly                | Inventory checklist and ordered kit preparation                        | Strong                            |
| Q02 | Disorganised                        | Preventable misplacement and omissions after correction opportunity    | Strong                            |
| Q03 | Neat and tidy                       | Maintained order and accurate later retrieval                          | Strong                            |
| Q04 | Leaves mess / no cleanup            | Explicit restore-or-leave-workspace choice                             | Strong                            |
| Q05 | Difficulty getting started          | Latency to first goal-directed action after clear instruction          | Moderate                          |
| Q06 | Efficient / gets things done        | Required-task completion with avoidable-action control                 | Strong                            |
| Q07 | Works until finished                | Completion of accepted multi-step useful task                          | Strong–moderate                   |
| Q08 | Lazy / low engagement               | Avoidance and unresolved required work after valid opportunity         | Moderate                          |
| Q09 | Dependable / steady                 | Prepared and accurate report-back to Engineer Kai                      | Strong                            |
| Q10 | Reliable / counted on               | Follow-through on an accepted duty across rooms                        | Strong                            |
| Q11 | Irresponsible                       | Force-finalisation with preventable unresolved issues                  | Strong                            |
| Q12 | Careless                            | Available warning/details ignored before consequential action          | Strong                            |
| Q13 | Setbacks do not discourage          | Archive failure → feedback → revision → completion                     | Strong                            |
| Q14 | Hard worker                         | Useful effort and adapted completion in Systems Repair                 | Moderate–strong                   |
| Q15 | Finishes whatever begun             | Return and completion after interruption                               | Strong                            |
| Q16 | Diligent                            | Accurate completion of a sustained multi-step optional task            | Strong–moderate                   |
| Q17 | Distracted by new projects          | Switch plus non-return after attractive competing task                 | Moderate exploratory              |
| Q18 | Focus over months                   | Background objective maintained across rooms and interruption          | Weak / questionnaire-primary      |
| Q19 | Changes goals before finishing      | New-goal uptake with prior commitment left unresolved                  | Moderate exploratory              |
| Q20 | Initial interest then loss          | Voluntary anomaly arc started but not sustained without rational cause | Very weak / questionnaire-primary |
| Q21 | Keeps going when tough              | Repair difficulty → support → revision → completion                    | Strong                            |
| Q22 | Works through difficult information | Manual/log consulted and correctly applied                             | Strong                            |
| Q23 | Keeps trying when hard              | Adaptive retries distinguished from identical repetition               | Strong                            |
| Q24 | Setbacks do not discourage          | Independent post-setback completion sequence                           | Strong                            |
| Q25 | Sticks with difficult task          | Re-engagement or non-return after leaving a difficult task             | Moderate                          |
| Q26 | Repeats same thing                  | Identical failed action repeated after feedback                        | Strong                            |
| Q27 | Continues when no point             | Excess continuation after explicit utility-stop signal                 | Moderate–strong                   |
| Q28 | Continues knowing action worthless  | Force attempt after explicit blocker and valid alternative             | Strong                            |
| Q29 | Prefers long-term goals             | Balanced immediate-versus-distributed goal-horizon choice              | Moderate exploratory              |
| Q30 | Usually works toward small goals    | Repeated small-goal versus integrated-goal structure choices           | Moderate if repeated              |
| Q31 | Prefers short-term goals            | Immediate-versus-distributed horizon choice; shared with Q29           | Moderate exploratory              |
| Q32 | Goals take years                    | Derived extended-goal engagement and completion pattern                | Very weak / questionnaire-primary |
| Q33 | Accomplished goals take days        | End-session portfolio of self-selected short-goal completions          | Weak / questionnaire-primary      |

# 3. BFI-2 Conscientiousness: Q01–Q12

## Q01 — Is systematic, likes to keep things in order.

> Exact questionnaire item: “Is systematic, likes to keep things in order.”
> | Source and scoring direction | BFI-C-04 • BFI-2 Organisation • positive-scored |
> | --- | --- |
> | Current evidential status | Strong analogue |
> | Primary game context | Inventory / Prep — Quartermaster console, checklist and kit-preparation bench. |
> | Player-facing situation | The player receives a clearly labelled readiness checklist and must sort tools/supplies into bins before assembling a kit. The interface permits acting immediately, consulting the checklist, correcting errors and verifying readiness. |
> | Player choices | Open checklist before acting; inspect item labels; place each item; correct a detected error; verify the completed kit; or proceed without systematic checking. |
> | Measurement window | From checklist availability to readiness verification. Designed exposure: approximately 90–150 seconds. Time is secondary; sequence and accuracy are primary. |
> | Primary measurements | Checklist opened before first placement; proportion correctly placed; ordered-step compliance; corrections after feedback; verification completed; preventable omissions. |
> | Candidate raw events | inventory_checklist_available; inventory_checklist_opened; inventory_item_placed; inventory_item_corrected; inventory_sequence_completed; readiness_verified. |
> | Candidate derived indicators | organisation_checklist_use; organisation_accuracy_score; sequence_quality; preventable_omission_count. |
> | Why this translation is appropriate | The task directly samples an orderly, rule-guided approach to preparing materials. It preserves the item’s meaning without requiring complex puzzle ability. |
> | Confounds and safeguards | Reading/UI skill, colour or label ambiguity and prior gaming experience. Use explicit labels, simple controls, no hidden knowledge, and Dock covariates. |
> | Current design decision | Use order, accuracy and verification as primary evidence. Do not reward speed alone. |

## Q02 — Tends to be disorganized.

> Exact questionnaire item: “Tends to be disorganized.”
> | Source and scoring direction | BFI-C-01 • BFI-2 Organisation • reverse-scored |
> | --- | --- |
> | Current evidential status | Strong reverse analogue |
> | Primary game context | Inventory / Prep, with consequences displayed later at the Final Core. |
> | Player-facing situation | The player can pack the kit with misplaced or missing items, receive a correction opportunity, and either repair the organisation or leave preventable omissions. |
> | Player choices | Review the kit; correct misplaced items; verify readiness; or leave with an incomplete/disordered kit. |
> | Measurement window | From first item placement through final verification and later Final Core consequence. Only errors remaining after a clear correction opportunity contribute. |
> | Primary measurements | Misplacements; unresolved misplacements; skipped verification; preventable missing-item consequence; corrections made after feedback. |
> | Candidate raw events | inventory_item_misplaced; inventory_item_corrected; inventory_verification_skipped; final_core_missing_kit_item. |
> | Candidate derived indicators | organisation_error_count; avoidable_omission_count; correction_rate. |
> | Why this translation is appropriate | Disorganisation is represented by preventable disorder and omission, not by the first ordinary mistake. The later consequence demonstrates whether the disordered state mattered. |
> | Confounds and safeguards | Misunderstood labels can mimic disorganisation. The task must be transparent and errors must be correctable. |
> | Current design decision | Score unresolved preventable errors; do not score first mistakes as trait evidence. |

## Q03 — Keeps things neat and tidy.

> Exact questionnaire item: “Keeps things neat and tidy.”
> | Source and scoring direction | BFI-C-07 • BFI-2 Organisation • positive-scored |
> | --- | --- |
> | Current evidential status | Strong analogue |
> | Primary game context | Inventory / Prep and a later tool-retrieval opportunity in Repair or Final Core. |
> | Player-facing situation | After organising the storage area, the player later needs a specific tool or manual. Well-maintained storage supports accurate retrieval; disorder produces searching and wrong selection. |
> | Player choices | Return items to labelled storage; leave tools out; retrieve from the expected location; search multiple bins; or select the wrong tool. |
> | Measurement window | Initial organisation plus one later retrieval episode. Retrieval latency is recorded only as a secondary measure. |
> | Primary measurements | Workspace/order state; items returned; correct first retrieval; wrong-bin openings; prepared tool available and used. |
> | Candidate raw events | workspace_order_state; tool_returned_to_storage; tool_bin_opened; correct_tool_selected; wrong_tool_selected; prepared_tool_used. |
> | Candidate derived indicators | workspace_tidy_score; tool_retrieval_accuracy; prepared_resource_use. |
> | Why this translation is appropriate | Neatness is represented as maintained order that remains functional later, separating it from one-time checklist compliance. |
> | Confounds and safeguards | Speed and spatial memory. Prioritise accuracy and state maintenance over retrieval time. |
> | Current design decision | Use persistent storage order plus later retrieval; do not duplicate Q01’s checklist score. |

## Q04 — Leaves a mess, doesn’t clean up.

> Exact questionnaire item: “Leaves a mess, doesn’t clean up.”
> | Source and scoring direction | BFI-C-10 • BFI-2 Organisation • reverse-scored |
> | --- | --- |
> | Current evidential status | Strong reverse analogue |
> | Primary game context | Explicit post-task cleanup at Inventory / Prep or Systems Repair. |
> | Player-facing situation | After a task, tools, packaging and used components remain visibly out. The player is told the operational objective is complete and can leave immediately, restore the workspace, or perform a partial cleanup. |
> | Player choices | Return tools; dispose of waste; reset the bench; inspect the area; leave everything; or partially clean and depart. |
> | Measurement window | Begins only after task completion, when cleanup is a distinct optional/expected action. Designed exposure: 20–45 seconds. |
> | Primary measurements | Cleanup opportunity received; cleanup initiated; proportion of objects restored; workspace state at exit; later consequence only if meaningful. |
> | Candidate raw events | cleanup_opportunity_shown; cleanup_started; tool_restored; waste_cleared; workspace_left_disordered; cleanup_completed. |
> | Candidate derived indicators | cleanup_completion_rate; workspace_disorder_at_exit; partial_cleanup_count. |
> | Why this translation is appropriate | This is the direct behavioural translation of leaving a mess. It corrects the stale planning-before-action mapping in the earlier workbook. |
> | Confounds and safeguards | If cleanup is hidden or framed as irrelevant, leaving is rational. The expectation and practical purpose must be clear without moralising. |
> | Current design decision | Use explicit restore-versus-leave behaviour. Do not use planning events as Q04 evidence. |

## Q05 — Has difficulty getting started on tasks.

> Exact questionnaire item: “Has difficulty getting started on tasks.”
> | Source and scoring direction | BFI-C-05 • BFI-2 Productiveness • reverse-scored |
> | --- | --- |
> | Current evidential status | Moderate reverse analogue |
> | Primary game context | First required objective after the Dock, preferably Systems Repair. |
> | Player-facing situation | A clear objective and interaction marker are presented. The player has control and can begin, inspect relevant instructions, wander, idle or interact with irrelevant objects. |
> | Player choices | Begin the assigned task; inspect task-relevant instructions; delay through unrelated actions; or remain idle. |
> | Measurement window | From objective_confirmed and control restored to first goal-directed task action. Reading instructions is not counted as avoidance. |
> | Primary measurements | Task-initiation latency; task-relevant versus irrelevant actions; idle duration; repeated departures before starting. |
> | Candidate raw events | objective_confirmed; control_restored; task_relevant_info_opened; first_goal_directed_action; irrelevant_interaction; idle_interval. |
> | Candidate derived indicators | task_initiation_latency; prestart_avoidance_count; productiveness_action_ratio. |
> | Why this translation is appropriate | The sequence captures initiation after the task is understood, rather than general movement speed. |
> | Confounds and safeguards | Navigation difficulty, confusion and reading speed. Use Dock controls and exclude trials with failed comprehension or technical interruption. |
> | Current design decision | No universal seconds cut-off. Calibrate latency distribution in pilot data. |

## Q06 — Is efficient, gets things done.

> Exact questionnaire item: “Is efficient, gets things done.”
> | Source and scoring direction | BFI-C-08 • BFI-2 Productiveness • positive-scored |
> | --- | --- |
> | Current evidential status | Strong analogue |
> | Primary game context | Across required Archive, Repair and Final Core objectives. |
> | Player-facing situation | The player must complete clear objectives through simple, learnable routes. Efficiency is inferred from effective actions and successful completion, not merely speed. |
> | Player choices | Use available information; perform goal-relevant actions; correct errors; complete; or leave objectives unresolved. |
> | Measurement window | Across required task opportunities, with room-level and total-session indicators. |
> | Primary measurements | Required completion rate; effective-action ratio; unnecessary action count; time after comprehension; avoidable rework. |
> | Candidate raw events | objective_started; goal_relevant_action; unnecessary_action; objective_completed; objective_abandoned. |
> | Candidate derived indicators | required_completion_rate; productiveness_completion_score; effective_action_ratio. |
> | Why this translation is appropriate | The item combines completion and efficiency. A multi-task pattern is more defensible than one puzzle outcome. |
> | Confounds and safeguards | Cognitive ability and game skill. Tasks must be simple after feedback and time must be adjusted by controls. |
> | Current design decision | Completion plus process efficiency; never a pure speed score. |

## Q07 — Is persistent, works until the task is finished.

> Exact questionnaire item: “Is persistent, works until the task is finished.”
> | Source and scoring direction | BFI-C-11 • BFI-2 Productiveness • positive-scored |
> | --- | --- |
> | Current evidential status | Strong–moderate analogue |
> | Primary game context | Optional Side Repair or another accepted multi-step useful task. |
> | Player-facing situation | The player knowingly accepts a useful task requiring several steps. They may continue, formally defer, leave without deferring, return later or complete it. |
> | Player choices | Accept or decline; complete steps; request/consult support; defer; abandon; return; finish. |
> | Measurement window | From task acceptance to completion or Final Core closure. Only accepted tasks create a valid follow-through opportunity. |
> | Primary measurements | Steps completed; completion after acceptance; formal deferment; non-return; return latency; completion after return. |
> | Candidate raw events | side_repair_offered; side_repair_accepted; side_repair_step_completed; side_repair_deferred; side_repair_returned; side_repair_abandoned; side_repair_completed. |
> | Candidate derived indicators | accepted_task_completion_rate; optional_followthrough_rate; abandonment_after_acceptance. |
> | Why this translation is appropriate | The player has committed to a defined task, allowing persistence-to-finish to be observed over time. |
> | Confounds and safeguards | Curiosity and completionism. Acceptance and completion must be separated, and the task must have clear utility. |
> | Current design decision | Use as secondary evidence alongside required-task completion, not as a sole work-ethic score. |

## Q08 — Tends to be lazy.

> Exact questionnaire item: “Tends to be lazy.”
> | Source and scoring direction | BFI-C-02 • BFI-2 Productiveness • reverse-scored |
> | --- | --- |
> | Current evidential status | Moderate reverse analogue |
> | Primary game context | A simple required duty assigned by Engineer Kai or a clear repair objective. |
> | Player-facing situation | After instruction, the player has adequate time and competence to perform a low-complexity required task but may avoid it through prolonged idling, unrelated interactions or leaving it unresolved. |
> | Player choices | Start and progress; formally defer for a valid reason; engage in unrelated optional activity; idle; or leave the duty unresolved. |
> | Measurement window | Across at least two valid required-task opportunities after Dock competence is established. |
> | Primary measurements | Required-task engagement ratio; prolonged inactive intervals; unresolved duties; repeated non-task interactions; valid deferments. |
> | Candidate raw events | required_duty_available; duty_started; duty_deferred; unrelated_optional_action; prolonged_idle; duty_completed; duty_unresolved. |
> | Candidate derived indicators | productive_engagement_rate; avoidant_delay_count; unresolved_required_task_count. |
> | Why this translation is appropriate | Low productive engagement is closer to the item than rational task switching or slow movement. |
> | Confounds and safeguards | Fatigue, confusion, accessibility barriers and strategic prioritisation. Do not infer laziness from one delay. |
> | Current design decision | Pattern-level exploratory score with Dock and comprehension controls. |

## Q09 — Is dependable, steady.

> Exact questionnaire item: “Is dependable, steady.”
> | Source and scoring direction | BFI-C-03 • BFI-2 Responsibility • positive-scored |
> | --- | --- |
> | Current evidential status | Strong analogue |
> | Primary game context | Engineer Hub report-back with Engineer Kai and a report terminal. |
> | Player-facing situation | Kai asks for a status report based on work completed elsewhere. The player may consult logs, ask clarification, submit a prepared report or answer immediately without checking. |
> | Player choices | Review evidence; ask clarification; report accurate status; report uncertain status; or submit an unverified answer. |
> | Measurement window | From report request to submission, after relevant evidence has been generated. |
> | Primary measurements | Evidence review; clarification use; report accuracy; consistency with logged state; prepared versus unprepared submission. |
> | Candidate raw events | engineer_report_requested; engineer_evidence_reviewed; engineer_clarification_requested; engineer_report_submitted; report_accuracy_evaluated. |
> | Candidate derived indicators | prepared_report_flag; report_accuracy_score; responsibility_report_count. |
> | Why this translation is appropriate | Dependability is sampled through accurate, steady communication grounded in actual task state. |
> | Confounds and safeguards | Memory and reading skill. Evidence must be accessible and report options must not be moral labels. |
> | Current design decision | Primary responsibility indicator; separate from persistence scores. |

## Q10 — Is reliable, can always be counted on.

> Exact questionnaire item: “Is reliable, can always be counted on.”
> | Source and scoring direction | BFI-C-09 • BFI-2 Responsibility • positive-scored |
> | --- | --- |
> | Current evidential status | Strong analogue |
> | Primary game context | Engineer Kai assigns a duty that remains active across later rooms. |
> | Player-facing situation | The player may accept, decline or request details. If accepted, the duty remains visible and can be completed later before Final Core. |
> | Player choices | Accept; decline before commitment; clarify; formally defer; complete; or accept and leave unresolved. |
> | Measurement window | From assignment through Final Core. Only accepted commitments contribute to reliability/follow-through. |
> | Primary measurements | Commitment accepted; reminders; return; completion before deadline; accepted duty unresolved. |
> | Candidate raw events | supervision_duty_offered; duty_details_viewed; duty_accepted; duty_declined; duty_deferred; duty_completed; accepted_duty_unresolved. |
> | Candidate derived indicators | commitment_followthrough_rate; accepted_duty_unresolved_count; reminder_dependence. |
> | Why this translation is appropriate | Reliability is best represented by delayed follow-through after a voluntary/explicit commitment. |
> | Confounds and safeguards | Social desirability. Declining honestly should not be scored as unreliability; only broken accepted commitments are negative. |
> | Current design decision | Score follow-through conditional on acceptance. |

## Q11 — Sometimes behaves irresponsibly.

> Exact questionnaire item: “Sometimes behaves irresponsibly.”
> | Source and scoring direction | BFI-C-12 • BFI-2 Responsibility • reverse-scored |
> | --- | --- |
> | Current evidential status | Strong reverse analogue |
> | Primary game context | Final Core integration and status review. |
> | Player-facing situation | The Final Core shows preventable unresolved issues and their practical consequences. The player can inspect, resolve, acknowledge/defer appropriately, or force finalisation. |
> | Player choices | Review status; resolve issues; acknowledge an unavoidable issue; request support; or force finalisation while preventable issues remain. |
> | Measurement window | From final status board display to final completion. |
> | Primary measurements | Status review; preventable issues resolved; acknowledged unavoidable issues; force-finalise action; unresolved preventable count. |
> | Candidate raw events | final_status_displayed; issue_reviewed; issue_resolution_started; issue_resolved; issue_acknowledged; final_core_force_finalised. |
> | Candidate derived indicators | accountability_review_flag; preventable_unresolved_count; irresponsible_finalisation_count. |
> | Why this translation is appropriate | Responsibility concerns ownership of consequences. The final integration stage makes those consequences visible. |
> | Confounds and safeguards | Time pressure and unclear consequences. No countdown should coerce rushing unless time pressure is itself an experimental condition. |
> | Current design decision | Separate final-quality outcome from specific responsibility events. |

## Q12 — Can be somewhat careless.

> Exact questionnaire item: “Can be somewhat careless.”
> | Source and scoring direction | BFI-C-06 • BFI-2 Responsibility • reverse-scored |
> | --- | --- |
> | Current evidential status | Strong reverse analogue |
> | Primary game context | Hazard Control warning/details interaction. |
> | Player-facing situation | A warning is visible before a consequential route or system action. The player can inspect details, seek clarification or proceed without checking. |
> | Player choices | Read details; inspect consequence information; choose informed action; or ignore available information and proceed. |
> | Measurement window | From hazard_warning_seen to route/action confirmation. |
> | Primary measurements | Information checked; relevant detail dwell/interaction; informed choice; avoidable consequence after ignored warning. |
> | Candidate raw events | hazard_warning_seen; hazard_info_checked; hazard_clarification_requested; hazard_informed_action; hazard_unchecked_action; avoidable_hazard_issue. |
> | Candidate derived indicators | prudence_check_rate; unchecked_action_count; avoidable_hazard_consequence. |
> | Why this translation is appropriate | Carelessness is sampled as neglect of salient, accessible consequence information—not as willingness to face danger. |
> | Confounds and safeguards | Risk preference, curiosity and reading comprehension. Keep risk levels clear and do not frame as fear. |
> | Current design decision | Hazard is prudence/carefulness evidence, not Goal-Time or Persistence Despite Fear. |

# 4. Grit-S: Q13–Q20

## Q13 — Setbacks don’t discourage me.

> Exact questionnaire item: “Setbacks don’t discourage me.”
> | Source and scoring direction | GRIT-02 • Grit-S Perseverance of Effort • positive-scored |
> | --- | --- |
> | Current evidential status | Strong analogue |
> | Primary game context | Archive Room failure-and-feedback sequence. |
> | Player-facing situation | The first plausible code/query attempt fails. The Archive AI provides usable feedback, and the player can revise, repeat blindly, leave or complete. |
> | Player choices | Open feedback; revise query; retry unchanged; leave; return; complete. |
> | Measurement window | From first failure to completion or validated abandonment. |
> | Primary measurements | Post-failure re-engagement; feedback use; strategy revision; completion after setback; non-return. |
> | Candidate raw events | archive_attempt_failed; archive_feedback_available; archive_feedback_used; archive_strategy_revision; archive_reengaged; archive_completed. |
> | Candidate derived indicators | post_failure_reengagement; adaptive_persistence_count; archive_post_setback_completion. |
> | Why this translation is appropriate | The task standardises a setback and observes whether the player remains engaged productively. |
> | Confounds and safeguards | Puzzle ability. Feedback must make the revised solution learnable. |
> | Current design decision | Use ordered failure → feedback/revision → completion evidence. |

## Q14 — I am a hard worker.

> Exact questionnaire item: “I am a hard worker.”
> | Source and scoring direction | GRIT-04 • Grit-S Perseverance of Effort • positive-scored |
> | --- | --- |
> | Current evidential status | Moderate–strong analogue |
> | Primary game context | Systems Repair multi-step task. |
> | Player-facing situation | A repair requires several meaningful actions and a revised sequence after diagnosis. The player may use the manual, persist, perform minimal work or leave. |
> | Player choices | Diagnose; consult manual; perform steps; correct sequence; complete; or abandon. |
> | Measurement window | Across the repair task, approximately 90–150 seconds. |
> | Primary measurements | Goal-relevant effort actions; stages completed; useful effort after failure; completion; unnecessary repetition. |
> | Candidate raw events | repair_started; repair_diagnostic_completed; repair_manual_used; repair_step_completed; repair_strategy_revision; repair_completed. |
> | Candidate derived indicators | useful_effort_count; difficulty_persistence_score; repair_completion_quality. |
> | Why this translation is appropriate | Hard work is represented by sustained, useful effort toward a demanding objective, not button presses or time spent. |
> | Confounds and safeguards | Ability and task length. Keep mechanics simple and count effective effort rather than total actions. |
> | Current design decision | Use as cross-task effort evidence, not a direct one-room score. |

## Q15 — I finish whatever I begin.

> Exact questionnaire item: “I finish whatever I begin.”
> | Source and scoring direction | GRIT-07 • Grit-S Perseverance of Effort • positive-scored |
> | --- | --- |
> | Current evidential status | Strong analogue |
> | Primary game context | Interruption Corridor applied to an already-started task. |
> | Player-facing situation | A competing task appears while an original objective is incomplete. The original remains visible and can be resumed later. |
> | Player choices | Continue original; switch and return; formally defer; switch and abandon; or complete original before new task. |
> | Measurement window | From original task start through Final Core closure. |
> | Primary measurements | Started-task completion rate; return after interruption; unfinished accepted tasks; completion after switch. |
> | Candidate raw events | task_started; interruption_received; task_deferred; switched_task; returned_to_original_task; task_completed_after_interruption; task_left_unfinished. |
> | Candidate derived indicators | started_task_completion_rate; return_to_task_rate; unfinished_started_task_count. |
> | Why this translation is appropriate | The item is directly about completion of initiated goals. The interruption prevents the measure from being trivial. |
> | Confounds and safeguards | Rational prioritisation. Formal deferment and task urgency must be logged. |
> | Current design decision | Non-return, not switching itself, is the negative evidence. |

## Q16 — I am diligent.

> Exact questionnaire item: “I am diligent.”
> | Source and scoring direction | GRIT-08 • Grit-S Perseverance of Effort • positive-scored |
> | --- | --- |
> | Current evidential status | Strong–moderate analogue |
> | Primary game context | Optional Side Repair or Inventory verification sequence. |
> | Player-facing situation | The task requires sustained attention to several simple steps and a final verification, with no complex cognitive puzzle. |
> | Player choices | Complete all stages accurately; verify; correct errors; partially complete; defer; or abandon. |
> | Measurement window | Across the selected multi-step task. |
> | Primary measurements | Accurate stages; verification; correction; sustained engagement; completion after acceptance. |
> | Candidate raw events | multi_step_task_accepted; task_step_completed; task_error_corrected; task_verified; task_abandoned; task_completed. |
> | Candidate derived indicators | diligence_step_accuracy; verified_completion_rate; optional_task_completion. |
> | Why this translation is appropriate | Diligence is represented by careful, sustained execution across multiple steps. |
> | Confounds and safeguards | Completionism and conscientious test-taking. Interpret with Q07 and organisation measures rather than alone. |
> | Current design decision | Accuracy and follow-through are primary; duration is supporting. |

## Q17 — New ideas and projects sometimes distract me from previous ones.

> Exact questionnaire item: “New ideas and projects sometimes distract me from previous ones.”
> | Source and scoring direction | GRIT-01 • Grit-S Consistency of Interest • reverse-scored |
> | --- | --- |
> | Current evidential status | Moderate exploratory analogue |
> | Primary game context | Interruption Corridor / Comms AI. |
> | Player-facing situation | An attractive but non-mandatory new objective is offered while an active task remains unfinished. The new task is not automatically better or more urgent. |
> | Player choices | Ignore; inspect; switch; formally defer original; continue original; or switch and later return. |
> | Measurement window | Initial response plus later return opportunity. |
> | Primary measurements | Competing task inspected; switch; formal deferment; return; prior task completed; prior task unresolved. |
> | Candidate raw events | competing_task_offered; competing_task_viewed; switched_task; prior_task_deferred; returned_to_original_task; prior_task_unresolved. |
> | Candidate derived indicators | distraction_switch_rate; switch_without_return_count; return_after_switch_flag. |
> | Why this translation is appropriate | The situation samples susceptibility to diversion while preserving the distinction between curiosity and actual loss of goal focus. |
> | Confounds and safeguards | Switching may be rational. The key negative pattern is switching without return when the original remains valid. |
> | Current design decision | Exploratory/discriminant only. |

## Q18 — I have difficulty maintaining my focus on projects that take more than a few months to complete.

> Exact questionnaire item: “I have difficulty maintaining my focus on projects that take more than a few months to complete.”
> | Source and scoring direction | GRIT-06 • Grit-S Consistency of Interest • reverse-scored |
> | --- | --- |
> | Current evidential status | Weak exploratory; questionnaire-primary |
> | Primary game context | Persistent background calibration assigned in Engineer Hub and completed across several rooms. |
> | Player-facing situation | A three-stage calibration begins early, remains continuously visible and has stages in later locations. After the initial stage, a competing event is introduced. The player can continue, switch, formally defer and later return. |
> | Player choices | Accept/decline before commitment; complete stage 1; continue; switch; formally defer; return voluntarily; respond to reminder; complete all stages; or leave unresolved. |
> | Measurement window | From early assignment through Final Core. The task should span multiple rooms and at least one interruption; no artificial real-time waiting is needed. |
> | Primary measurements | Stage continuity; voluntary revisit; number of reminders; return latency; completion after interruption; unresolved status at Final Core. |
> | Candidate raw events | background_objective_offered; background_objective_accepted; background_stage_completed; interruption_received; background_objective_deferred; objective_revisited; reminder_shown; background_objective_completed; final_unresolved_due_to_nonreturn. |
> | Candidate derived indicators | extended_focus_proxy; return_after_interruption; reminder_dependence; unresolved_after_interruption. |
> | Why this translation is appropriate | This is the closest feasible short-session analogue of sustaining focus across time and competing demands. |
> | Confounds and safeguards | It cannot represent months. Non-return may reflect prioritisation, memory or low task value. Keep the task visible and useful. |
> | Current design decision | Questionnaire remains primary. Use only as a weak continuity proxy and do not call it long-term focus measurement. |

## Q19 — I often set a goal but later choose to pursue a different one.

> Exact questionnaire item: “I often set a goal but later choose to pursue a different one.”
> | Source and scoring direction | GRIT-05 • Grit-S Consistency of Interest • reverse-scored |
> | --- | --- |
> | Current evidential status | Moderate exploratory analogue |
> | Primary game context | Active Engineer duty or calibration plus a new side objective. |
> | Player-facing situation | After accepting an original goal, the player receives a credible new option. The original remains valid and can be formally deferred or completed. |
> | Player choices | Stay; switch; formally defer; return; complete new then original; or abandon original. |
> | Measurement window | From new-goal offer until both opportunities close. |
> | Primary measurements | Goal switch; deferment; prior-goal return; prior-goal abandonment; accumulation of unfinished commitments. |
> | Candidate raw events | new_goal_offered; new_goal_accepted; prior_goal_deferred; prior_goal_revisited; prior_goal_completed; prior_goal_abandoned. |
> | Candidate derived indicators | goal_switch_without_return_count; unfinished_commitment_accumulation; goal_return_rate. |
> | Why this translation is appropriate | The item concerns changing goals before completion; the task makes the prior commitment and subsequent choice observable. |
> | Confounds and safeguards | A switch may be strategic. Information about urgency and value must be balanced and logged. |
> | Current design decision | Score abandonment/non-return, not switching alone. |

## Q20 — I have been obsessed with a certain idea or project for a short time but later lost interest.

> Exact questionnaire item: “I have been obsessed with a certain idea or project for a short time but later lost interest.”
> | Source and scoring direction | GRIT-03 • Grit-S Consistency of Interest • reverse-scored |
> | --- | --- |
> | Current evidential status | Very weak exploratory; questionnaire-primary |
> | Primary game context | Optional anomaly-investigation arc beginning in Side Repair and continuing later. |
> | Player-facing situation | An interesting anomaly is discovered. The player can voluntarily investigate an attractive first stage. Two later stages remain available, with stable utility, understandable requirements and no new evidence that makes stopping rational. |
> | Player choices | Decline; begin; complete first stage; continue immediately; formally defer; return later; abandon without deferment; or complete. |
> | Measurement window | From first discovery through Final Core. Initial engagement and later continuation must be separated. |
> | Primary measurements | Voluntary uptake; early engagement; first-stage completion; deferment; later return; start-without-sustain; final completion. |
> | Candidate raw events | anomaly_discovered; anomaly_investigation_started; anomaly_first_stage_completed; anomaly_deferred; anomaly_revisited; anomaly_abandoned_after_start; anomaly_completed. |
> | Candidate derived indicators | start_without_sustain_count; optional_followthrough_rate; voluntary_return_flag. |
> | Why this translation is appropriate | The design samples an initial-interest-versus-sustained-engagement pattern without directly asking about interest. |
> | Confounds and safeguards | The game cannot establish “obsession” or true loss of interest. Stopping may reflect difficulty, priorities, reward or time. |
> | Current design decision | No bespoke item score. Retain as supplementary process evidence only when continued utility and opportunity are clear. |

# 5. Persistence Despite Difficulty: Q21–Q25

## Q21 — I keep on going when the going gets tough.

> Exact questionnaire item: “I keep on going when the going gets tough.”
> | Source and scoring direction | PDD-01 • Persistence Despite Difficulty • positive-scored |
> | --- | --- |
> | Current evidential status | Strong analogue |
> | Primary game context | Systems Repair standardised difficulty sequence. |
> | Player-facing situation | An initial repair attempt produces a clear setback. Support is available and the player can adapt, continue, leave or repeat blindly. |
> | Player choices | Use diagnostic/manual; revise; continue; leave; return; complete. |
> | Measurement window | First failure through completion or validated abandonment. |
> | Primary measurements | Continued engagement; support use; revised action; completion; abandonment; blind repetition. |
> | Candidate raw events | repair_failed; repair_manual_used; repair_strategy_revision; repair_reengaged; repair_completed; repair_abandoned. |
> | Candidate derived indicators | game_difficulty_persistence; failure_recovery_score. |
> | Why this translation is appropriate | The task creates a controlled difficulty episode and observes productive continuation. |
> | Confounds and safeguards | Difficulty must be standardised and solvable after support. |
> | Current design decision | Preserve event sequence; do not reward raw retries. |

## Q22 — Even if it’s difficult to understand, I will read an entire book until I “get” it.

> Exact questionnaire item: “Even if it’s difficult to understand, I will read an entire book until I “get” it.”
> | Source and scoring direction | PDD-03 • Persistence Despite Difficulty • positive-scored |
> | --- | --- |
> | Current evidential status | Strong analogue with reading controls |
> | Primary game context | Archive logs or Systems Repair manual. |
> | Player-facing situation | After failure, the player receives concise but necessary task information. Opening it is not enough; the next action must reflect the information. |
> | Player choices | Open; navigate relevant section; request simpler explanation; close without use; apply information; or repeat unchanged. |
> | Measurement window | From support availability to next meaningful task action. |
> | Primary measurements | Support opened; relevant section viewed; information correctly applied; strategy changed; unchanged retry. |
> | Candidate raw events | support_available; manual_opened; relevant_section_viewed; clarification_requested; support_applied; unchanged_retry. |
> | Candidate derived indicators | manual_or_feedback_used; applied_information_flag; strategy_revision_count. |
> | Why this translation is appropriate | The item’s core is persistence with difficult information. The game samples whether relevant information is worked through and used. |
> | Confounds and safeguards | Reading comprehension and language proficiency. Keep text concise and allow clarification. |
> | Current design decision | Count support use only when followed by a relevant behavioural change. |

## Q23 — Even if something is hard, I will keep trying at it.

> Exact questionnaire item: “Even if something is hard, I will keep trying at it.”
> | Source and scoring direction | PDD-05 • Persistence Despite Difficulty • positive-scored |
> | --- | --- |
> | Current evidential status | Strong analogue |
> | Primary game context | Archive and Repair failure sequences. |
> | Player-facing situation | After an unsuccessful attempt, the player can try again with a revised method, repeat identically or stop. |
> | Player choices | Revise; seek support; retry productively; repeat unchanged; defer; abandon; complete. |
> | Measurement window | Across all valid difficulty episodes. |
> | Primary measurements | Adaptive retry count; unique strategies; support-informed attempts; identical retries; completion. |
> | Candidate raw events | attempt_failed; support_used; strategy_revised; adaptive_retry; identical_retry; task_completed. |
> | Candidate derived indicators | adaptive_retry_count; strategy_revision_count; blind_retry_count. |
> | Why this translation is appropriate | The design distinguishes persistence from rigid repetition, which is essential for construct validity. |
> | Confounds and safeguards | A guessed new option may look like strategy revision. Require evidence of feedback/support or meaningful change. |
> | Current design decision | Adaptive trying positive; identical repetition belongs to inappropriate persistence. |

## Q24 — Setbacks do not discourage me.

> Exact questionnaire item: “Setbacks do not discourage me.”
> | Source and scoring direction | PDD-04 • Persistence Despite Difficulty • positive-scored |
> | --- | --- |
> | Current evidential status | Strong analogue |
> | Primary game context | Independent replication in Systems Repair, complementing Q13’s Archive episode. |
> | Player-facing situation | A setback occurs; the player has an attainable recovery route and can re-engage and complete. |
> | Player choices | Use support; revise; return after brief departure; complete; or abandon. |
> | Measurement window | Failure → re-engagement/revision → completion sequence. |
> | Primary measurements | Re-engagement after setback; completion after setback; time to re-engage; abandonment. |
> | Candidate raw events | repair_setback; repair_reengaged; repair_strategy_revision; repair_completed_after_failure; repair_abandoned. |
> | Candidate derived indicators | post_setback_completion_score; setback_reengagement_rate. |
> | Why this translation is appropriate | Using a second task avoids relying entirely on the same Archive event for Q13 and Q24. |
> | Confounds and safeguards | The two items remain conceptually redundant; treat behavioural indicators as shared evidence, not independent item scores. |
> | Current design decision | Use cross-task convergence, not double counting. |

## Q25 — People describe me as someone who can stick at a task, even when it gets difficult.

> Exact questionnaire item: “People describe me as someone who can stick at a task, even when it gets difficult.”
> | Source and scoring direction | PDD-02 • Persistence Despite Difficulty • positive-scored |
> | --- | --- |
> | Current evidential status | Moderate analogue |
> | Primary game context | Archive/Repair with the possibility of leaving and later returning. |
> | Player-facing situation | After difficulty is explicit, the player may remain, leave temporarily, formally defer, return or never return. |
> | Player choices | Continue; use support; formally defer; explore elsewhere; return; or abandon. |
> | Measurement window | From difficulty onset through Final Core. |
> | Primary measurements | Time engaged after difficulty; formal deferment; later re-engagement; unresolved non-return; eventual completion. |
> | Candidate raw events | difficulty_onset; station_left_after_failure; task_deferred; station_reengaged; task_completed; task_unresolved_at_end. |
> | Candidate derived indicators | reengagement_after_failure; abandonment_after_failure_count; difficult_task_completion_rate. |
> | Why this translation is appropriate | Sticking with a difficult task may include a strategic pause and return, not only uninterrupted effort. |
> | Confounds and safeguards | Leaving can be exploration. Only no-return with unresolved objective is abandonment. |
> | Current design decision | Moderate process indicator; no continuous-stay requirement. |

# 6. Inappropriate Persistence: Q26–Q28

## Q26 — Sometimes I will keep doing the same thing over and over, but I believe that it is normal to do so.

> Exact questionnaire item: “Sometimes I will keep doing the same thing over and over, but I believe that it is normal to do so.”
> | Source and scoring direction | IP-02 • Inappropriate Persistence • positive-scored as maladaptive |
> | --- | --- |
> | Current evidential status | Strong maladaptive analogue |
> | Primary game context | Archive and Repair after explicit feedback. |
> | Player-facing situation | The same failed code or repair sequence remains selectable after the system explains that it failed. |
> | Player choices | Change strategy; use support; or repeat the identical failed action in a new interaction cycle. |
> | Measurement window | After explicit failure/feedback. Accidental double presses are excluded. |
> | Primary measurements | Identical failed-response cycles; feedback ignored; strategy change; repetition after repeated failure. |
> | Candidate raw events | failed_action_identified; feedback_shown; identical_action_repeated; strategy_changed. |
> | Candidate derived indicators | blind_retry_count; identical_failure_cycle_count; game_inappropriate_persistence. |
> | Why this translation is appropriate | This directly samples rigid repetition despite evidence that change is needed. |
> | Confounds and safeguards | Input bounce and misunderstanding. Debounce and require distinct completed cycles. |
> | Current design decision | Keep separate from adaptive persistence; higher values mean more maladaptive behaviour. |

## Q27 — Sometimes I find myself continuing to do something, even when there is no point in carrying on.

> Exact questionnaire item: “Sometimes I find myself continuing to do something, even when there is no point in carrying on.”
> | Source and scoring direction | IP-01 • Inappropriate Persistence • positive-scored as maladaptive |
> | --- | --- |
> | Current evidential status | Moderate–strong maladaptive analogue |
> | Primary game context | A utility-stop stage within the optional diagnostic/repair arc. |
> | Player-facing situation | After useful diagnostic cycles, the system explicitly reports that further cycles provide no additional operational benefit. The player can stop, inspect the rationale, switch to another useful task or continue unnecessary cycles. |
> | Player choices | Stop; acknowledge; inspect rationale; switch; or continue one or more no-benefit cycles. |
> | Measurement window | Only after a clear utility_stop_signal and while the player is free to leave. |
> | Primary measurements | Continuation after utility reaches zero; number of excess cycles; acknowledgement; switch to useful action. |
> | Candidate raw events | utility_stop_signal; no_additional_benefit_explained; unnecessary_cycle_started; unnecessary_cycle_completed; task_stopped_appropriately. |
> | Candidate derived indicators | excess_continuation_count; no_point_persistence_flag. |
> | Why this translation is appropriate | The task makes “no point in carrying on” explicit without relying on risk-taking or moral judgement. |
> | Confounds and safeguards | The signal must be credible and unambiguous. Continuing for curiosity should be minimised by stating that no new information or benefit will result. |
> | Current design decision | Prefer this over the older Hazard shortcut mapping, which mainly measured prudence. |

## Q28 — I will keep trying at something, even if I know my actions are worthless.

> Exact questionnaire item: “I will keep trying at something, even if I know my actions are worthless.”
> | Source and scoring direction | IP-03 • Inappropriate Persistence • positive-scored as maladaptive |
> | --- | --- |
> | Current evidential status | Strong maladaptive analogue |
> | Primary game context | Final Core blocker or repair prerequisite. |
> | Player-facing situation | The interface explicitly states that the current action cannot work until a named prerequisite is fixed. A valid resolution path is available. The player may resolve it, change strategy, seek help or force the blocked action again. |
> | Player choices | Resolve prerequisite; seek clarification; switch strategy; stop blocked action; or force repeated attempts. |
> | Measurement window | After blocker_understood is established, not merely after a generic failure. |
> | Primary measurements | Explicit blocker seen; comprehension/acknowledgement; force attempts; alternative used; blocker resolved. |
> | Candidate raw events | blocker_shown; blocker_acknowledged; prerequisite_available; force_blocked_action; strategy_changed; blocker_resolved. |
> | Candidate derived indicators | known_worthless_attempt_count; blocker_ignored_count. |
> | Why this translation is appropriate | The design distinguishes knowledge of worthlessness from ordinary trial-and-error. |
> | Confounds and safeguards | Knowledge must be evidenced. If the participant did not read/understand the blocker, the event cannot support Q28. |
> | Current design decision | Require explicit blocker exposure and a feasible alternative before scoring. |

# 7. Goal-Time Preference: Q29–Q33

Special rule for this section. Q29–Q33 remain part of the final 33-item questionnaire, but the gameplay evidence is exploratory. The design uses shared behavioural dimensions rather than five separate disguised questions.

## Q29 — I prefer to work on long-term goals.

> Exact questionnaire item: “I prefer to work on long-term goals.”
> | Source and scoring direction | GTP-01 • Goal-Time Preference • long-term-oriented |
> | --- | --- |
> | Current evidential status | Moderate exploratory analogue |
> | Primary game context | Balanced goal-horizon choice presented by Engineer Kai or a planning terminal. |
> | Player-facing situation | The player chooses between two equally credible objectives: (A) a self-contained task completed now with immediate local benefit; or (B) a distributed task with comparable total steps/value whose later stages and benefit occur near Final Core. The options are not labelled short- or long-term. |
> | Player choices | Inspect details; choose immediate objective; choose distributed objective; or request clarification. The initial choice is recorded before any interruption. |
> | Measurement window | After the player understands game mechanics but before the Interruption Corridor. Ideally repeated in a second balanced opportunity with option order counterbalanced. |
> | Primary measurements | Initial horizon choice; detail inspection; distributed-choice rate; later return and completion kept as separate follow-through measures. |
> | Candidate raw events | horizon_choice_offered; option_details_viewed; immediate_goal_selected; distributed_goal_selected; distributed_goal_revisited; distributed_goal_completed. |
> | Candidate derived indicators | goal_horizon_preference; distributed_goal_choice_rate. |
> | Why this translation is appropriate | A concrete immediate-versus-distributed goal choice is more interpretable than inferring temporal preference from carelessness or risk. |
> | Confounds and safeguards | Options must be matched on total effort, value, difficulty, risk, attractiveness and social approval. The distributed option must not be obviously virtuous. |
> | Current design decision | Exploratory choice variable. Do not interpret completion as the same construct as initial preference. |

## Q30 — I usually work towards small goals.

> Exact questionnaire item: “I usually work towards small goals.”
> | Source and scoring direction | GTP-03 • Goal-Time Preference • short/small-goal-oriented |
> | --- | --- |
> | Current evidential status | Moderate if repeated; otherwise questionnaire-primary |
> | Primary game context | Goal-granularity choice at the Quartermaster terminal, with a second natural opportunity later. |
> | Player-facing situation | The same readiness requirement can be structured as (A) several independent, separately closable work orders or (B) one integrated multi-component audit. Total actions, benefit and difficulty are approximately equal. |
> | Player choices | Choose small independent work orders; choose one integrated goal; inspect components; change structure before beginning if permitted. |
> | Measurement window | One choice in Inventory / Prep and preferably one later choice in maintenance/final preparation. Record choice before outcome feedback. |
> | Primary measurements | Small-goal selections across valid opportunities; integrated-goal selections; completed self-selected small goals; structure changes. |
> | Candidate raw events | goal_structure_choice_offered; small_goal_set_selected; integrated_goal_selected; small_goal_completed; integrated_goal_completed. |
> | Candidate derived indicators | small_goal_choice_rate; goal_granularity_preference. |
> | Why this translation is appropriate | The item concerns the size/granularity of goals, not short cuts, carelessness or reward delay. |
> | Confounds and safeguards | Breaking a large task into subgoals may reflect good planning. The two options must be genuinely different goal structures, not merely interface layouts. |
> | Current design decision | Require at least two valid opportunities before deriving a behavioural pattern. |

## Q31 — I prefer to work on short-term goals.

> Exact questionnaire item: “I prefer to work on short-term goals.”
> | Source and scoring direction | GTP-04 • Goal-Time Preference • short-term-oriented |
> | --- | --- |
> | Current evidential status | Moderate exploratory; shared with Q29 |
> | Primary game context | The same balanced goal-horizon module used for Q29. |
> | Player-facing situation | Immediate closure and benefit are contrasted with a distributed objective of comparable total value and effort. No risk, recklessness or quality sacrifice is built into the short option. |
> | Player choices | Select immediate or distributed objective after reviewing concrete consequences. |
> | Measurement window | Initial choice before interruption; repeated once if feasible. |
> | Primary measurements | Immediate-goal choice rate; distributed-goal choice rate; consistency across opportunities. |
> | Candidate raw events | horizon_choice_offered; immediate_goal_selected; distributed_goal_selected. |
> | Candidate derived indicators | goal_horizon_preference; immediate_goal_choice_rate. |
> | Why this translation is appropriate | Q29 and Q31 are opposite ends of the same behavioural preference dimension. |
> | Confounds and safeguards | One binary choice cannot create two independent item scores. Order and framing must be counterbalanced. |
> | Current design decision | Use one shared variable; never count the same choice independently for Q29 and Q31. |

## Q32 — Most of the goals I work on take years to finish.

> Exact questionnaire item: “Most of the goals I work on take years to finish.”
> | Source and scoring direction | GTP-02 • Goal-Time Preference • long-term-oriented |
> | --- | --- |
> | Current evidential status | Very weak proxy; questionnaire-primary |
> | Primary game context | Derived across repeated horizon opportunities and the multi-room distributed objective. |
> | Player-facing situation | No separate question or minigame is created. Evidence comes from selecting, sustaining and completing extended/distributed objectives across rooms. |
> | Player choices | Select distributed goals; complete stages; return after interruption; or leave extended goals incomplete. |
> | Measurement window | Whole session, requiring at least two valid horizon-related opportunities. |
> | Primary measurements | Extended goals selected; stages sustained; return after interruption; extended-goal completion rate. |
> | Candidate raw events | distributed_goal_selected; distributed_stage_completed; distributed_goal_revisited; distributed_goal_completed; distributed_goal_unresolved. |
> | Candidate derived indicators | extended_goal_engagement_proxy; extended_goal_completion_rate. |
> | Why this translation is appropriate | The game can sample willingness to engage with a longer, distributed objective, but cannot represent goals taking years or the word “most.” |
> | Confounds and safeguards | Severe time-horizon mismatch and overlap with diligence/persistence. |
> | Current design decision | Questionnaire-primary. No distinct Q32 game score and no reverse scoring relative to long-term orientation. |

## Q33 — Most goals I accomplish only take a few days to complete.

> Exact questionnaire item: “Most goals I accomplish only take a few days to complete.”
> | Source and scoring direction | GTP-05 • Goal-Time Preference • short-duration-oriented |
> | --- | --- |
> | Current evidential status | Weak proxy; questionnaire-primary |
> | Primary game context | End-of-session portfolio derived from self-selected goal-horizon and goal-granularity choices. |
> | Player-facing situation | No separate Final Core rush choice is used. The game summarises which self-selected short versus distributed goals the participant chose and completed. |
> | Player choices | Arise naturally in Q29–Q31 modules: choose short/self-contained goals, integrated goals or distributed goals; complete or leave them. |
> | Measurement window | Computed at session end using only genuine self-selected opportunities, not required short room tasks. |
> | Primary measurements | Number of self-selected short goals completed; distributed goals completed; completion share by horizon; valid opportunities. |
> | Candidate raw events | immediate_goal_selected; immediate_goal_completed; distributed_goal_selected; distributed_goal_completed; small_goal_selected; small_goal_completed. |
> | Candidate derived indicators | short_goal_completion_share; self_selected_goal_portfolio. |
> | Why this translation is appropriate | A repeated portfolio is more defensible than interpreting rapid Final Core completion or unresolved issues as preference for short-duration goals. |
> | Confounds and safeguards | Minutes are not days, and the behaviour overlaps with Q30/Q31. Required short tasks must be excluded. |
> | Current design decision | Questionnaire-primary; use only as an exploratory portfolio variable. |

# 8. Shared modules, dependencies and non-independence

Archive failure-and-revision module: Primary evidence for Q13 and supporting evidence for Q22–Q26. The same event sequence must not be counted as six independent observations.
Systems Repair difficulty module: Primary evidence for Q14, Q21 and Q24, with supporting evidence for Q22, Q23 and Q25.
Interruption and continuity module: Supports Q15, Q17, Q18 and Q19. Switching, deferment, return and abandonment must remain separate variables.
Optional anomaly / side-repair arc: Supports Q07, Q16 and Q20. Voluntary uptake, task stages, deferment, return and completion must not be collapsed.
Goal-horizon module: Shared evidence for Q29 and Q31; weak derived evidence for Q32. Initial choice is recorded before interruption.
Goal-granularity module: Primary exploratory evidence for Q30 and weak portfolio evidence for Q33.
Maladaptive stopping-rule module: Q26 concerns identical repetition, Q27 concerns continuation after utility becomes zero, and Q28 requires explicit knowledge that the action cannot work.

## 8.1 Candidate analysis hierarchy

1. Level 1 — raw event sequences and opportunity flags.
1. Level 2 — task-specific process variables (for example feedback use, blind retry, return after switch).
1. Level 3 — construct subindices kept separate: perseverance, inappropriate persistence, organisation, productiveness, responsibility and prudence/carefulness.
1. Level 4 — item-level convergence analyses with the 33 self-report items/subscales.
1. No single global “good player” score should be created before empirical validation.

## 8.2 Missing and repeated response principles still requiring approval

- How no-opportunity cases are coded.
- How repeated identical inputs are debounced and counted.
- Whether first response, final response or both are retained for decision tasks.
- How formal deferment differs from abandonment.
- How incomplete sessions enter derived variables.
- Whether any item-level game indicators are combined into weighted composites.

# 9. Implementation and validation checklist

| Check                   | Acceptance criterion                                                                                                     | Status              |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------ | ------------------- |
| Scientific traceability | Every event and derived variable links to a stated opportunity, item/construct rationale and contamination safeguard.    | To verify / approve |
| Opportunity flags       | The dataset records whether each relevant task was presented and functionally accessible.                                | To verify / approve |
| Sequence integrity      | Failure, feedback, revision, return and completion are preserved in event order.                                         | To verify / approve |
| Versioning              | Payloads include game version, event-schema version, scoring version and asset-set version.                              | To verify / approve |
| Controls                | Dock tutorial variables, gaming experience, keyboard comfort and comprehension are available as controls.                | To verify / approve |
| Accessibility           | Keyboard/browser/device barriers are separated from behavioural non-performance.                                         | To verify / approve |
| No double counting      | Shared modules are analysed as shared evidence, not independent item replications.                                       | To verify / approve |
| Pilot calibration       | Latency distributions, task difficulty, option balance and wording are tested before thresholds are set.                 | To verify / approve |
| Goal-horizon balance    | Immediate and distributed options are matched on total effort, expected value, risk, attractiveness and social approval. | To verify / approve |
| Scientific claims       | Q18, Q20, Q32 and Q33 remain questionnaire-primary; game variables are described as proxies.                             | To verify / approve |

# 10. Source documents and references

- Original_question_items.docx / Original_question_items(1).docx. Exact 33-item battery and original item wording.
- remote_outpost_blueprint(1).xlsx. Item-to-game matrix, room blueprint, event taxonomy, scoring concepts, validity risks and implementation roadmap. Earlier mappings superseded where this specification explicitly records a later correction.
- game_assessment_scale_decision_note(1).docx. Final battery rationale and direct implications for the game.
- Gamifying Perseverance and Conscientiousness Scales for a Psychology Thesis.pdf. Multi-method measurement rationale, scale comparison and psychometric discussion.
- remote_outpost_project_brain_handoff. Historical design logic for rooms, NPCs, behavioural indices and controls.
- Hartvigsen, C. R., Nguyen, D. L. H., & Jacobsen, M. M. (2023). Feedback Through Games: Research, Design and Evaluation of Online Survey Gamification. Aalborg University. Used for design principles concerning clear goals, intentional feedback, access, attention, diverse motivation and integration of game and assessment.
- Soto, C. J., & John, O. P. (2017). The next Big Five Inventory (BFI-2). Journal of Personality and Social Psychology, 113(1), 117–143.
- Duckworth, A. L., & Quinn, P. D. (2009). Development and validation of the Short Grit Scale (Grit-S). Journal of Personality Assessment, 91(2), 166–174.

## 10.1 Document authority statement

This specification records the current research-owner discussion as of 15 July 2026. It is intended to become the authoritative behavioural-translation document after review. The exact questionnaire wording remains governed by the final 33-item source document. Final scoring and data-handling rules remain subject to the formal research-owner ruling process.
