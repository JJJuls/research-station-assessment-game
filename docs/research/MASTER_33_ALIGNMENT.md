# MASTER_33_ALIGNMENT.md

Canonical Q01-Q33 alignment for Remote Outpost Assessment, derived from V3
Sections 1, 4, and 5 of `docs/ai/fable-claude-final-game-build-contract-v3.txt`.

Primary source of truth (external, not in-repo):
`remote_outpost_MASTER_33_alignment_LOCKED_v0_2.xlsx`
Secondary: `remote_outpost_behavioural_blueprint_MASTER_corrected_v1_0.xlsx`
Exact-item reference: `remote_outpost_exact_33_item_list_ALIGNED_to_blueprint.xlsx`

This file is a working, in-repo mirror of the alignment for engineering use. If it
ever disagrees with the locked spreadsheets above, the spreadsheets win.

## Non-negotiable rules (V3 Section 1)

1. Q01-Q33 is the stable reference key. Every room, mini-game, event name, derived
   variable, and scoring rule must trace back to Q01-Q33 or be explicitly labelled
   control/usability data.
2. Never show validated questionnaire item wording in player-facing dialogue.
3. Never collapse behavioural output into one global "good player" score.
4. Compute separate subindices: organisation, productiveness, responsibility,
   prudence/carefulness, adaptive persistence, inappropriate persistence, and the
   optional goal-time/delayed-benefit proxy.
5. **Inappropriate Persistence is maladaptive.** Higher = more blind/counter-
   productive persistence, not better persistence. It must never be merged with
   adaptive persistence into one variable.
6. **Goal-Time Preference is optional/exploratory.** A short game cannot directly
   measure literal multi-year goal orientation — label every Goal-Time-derived
   variable as such wherever it's surfaced.
7. **Grit-S Consistency of Interest (Q17-Q20) is partly weak/exploratory** in a
   short game. Score return-to-task and unresolved non-return, not mere
   task-switching — switching can be rational behaviour.
8. **Q04 is cleanup/disorder.** It must never be implemented as, or read as, the
   old planning-before-acting construct.
9. **Engineer Hub / NPC Report-Back is priority** because it fills the
   responsibility/dependability gap (Q09-Q11) without touching the persistence
   scoring model.

## Q01-Q33 coverage matrix

| Q#  | Construct                                                     | Room                                        | Mechanic (behavioural, non-leaking)                                    | Canonical events (see event-schema.md)                                                                     | Derived variables                                                               | Proxy status                                                                           |
| --- | ------------------------------------------------------------- | ------------------------------------------- | ---------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| Q01 | Organisation / systematic approach                            | Inventory/Prep                              | Checklist-driven, ordered kit assembly                                 | `inventory_checklist_opened`, `inventory_item_sorted_correct`, `inventory_sequence_followed`               | `organisation_checklist_use`, `organisation_accuracy_score`, `sequence_quality` | direct                                                                                 |
| Q02 | Organisation / disorganisation (reverse)                      | Inventory/Prep; Final Core                  | Preventable omission tracking                                          | `inventory_item_misplaced`, `inventory_verification_skipped`, `final_core_missing_item_flagged`            | `avoidable_omission_count`, `organisation_error_count`                          | direct                                                                                 |
| Q03 | Organisation / neat resource management                       | Inventory/Prep                              | Correct tool retrieval, tidy storage                                   | `correct_tool_selected`, `wrong_tool_selected`, `prepared_tool_used`, `workspace_tidy_confirmed`           | `prepared_resource_use`, `tool_retrieval_accuracy`, `workspace_tidy_score`      | direct                                                                                 |
| Q04 | Organisation / cleanup-disorder (reverse)                     | Inventory/Prep; Final Core                  | Cleanup/verify workspace before leaving; unresolved mess flagged later | `workspace_left_disordered`, `cleanup_completed`, `final_core_workspace_issue_flagged`                     | `cleanup_failure_count`, `unresolved_workspace_issue_count`                     | direct — **cleanup/disorder only, see caution below**                                  |
| Q05 | Productiveness / task initiation (reverse)                    | Repair; Archive                             | Start active objective after instruction                               | `task_started`                                                                                             | `task_initiation_latency`, `productiveness_action_ratio`                        | direct                                                                                 |
| Q06 | Productiveness / efficient completion                         | Repair; Archive; Final Core                 | Complete required objectives without avoidable waste                   | `repair_completed`, `archive_completed`, `final_core_completed`                                            | `required_completion_rate`, `productiveness_completion_score`                   | direct                                                                                 |
| Q07 | Productiveness / works until finished                         | Optional Side Repair; Repair                | Continue useful task until complete                                    | `side_repair_accepted`, `side_repair_step_completed`, `side_repair_completed`                              | `voluntary_effort_count`, `optional_completion_score`                           | direct                                                                                 |
| Q08 | Productiveness / low engagement (reverse)                     | Interruption Corridor; Repair               | Objective unresolved while participant avoids/idles/drifts             | `task_avoidance`, `excessive_idle_after_instruction`                                                       | `avoidance_count`, `low_productive_engagement_proxy`                            | direct                                                                                 |
| Q09 | Responsibility / dependable report-back                       | Engineer Hub                                | Evidence-based status report                                           | `engineer_report_opened`, `engineer_evidence_reviewed`, `engineer_report_submitted_prepared`               | `prepared_report_flag`, `report_accuracy_score`                                 | direct                                                                                 |
| Q10 | Responsibility / keeps accepted duties                        | Engineer Hub; Final Core                    | Accepted duty persists across rooms; must complete or skip             | `engineer_supervision_accepted`, `engineer_supervision_completed`, `accepted_duty_unresolved`              | `commitment_followthrough_rate`, `accepted_duty_unresolved_count`               | direct — **cross-room mechanic, currently unimplemented**                              |
| Q11 | Responsibility / irresponsible outcome handling (reverse)     | Final Core; Engineer Hub                    | Review/resolve issues vs. rush finalization                            | `final_core_status_reviewed`, `unresolved_issue_reviewed`, `final_core_rushed`                             | `unresolved_issue_count`, `accountability_review_flag`, `final_quality_score`   | direct                                                                                 |
| Q12 | Responsibility/prudence / careless warning handling (reverse) | Hazard Control                              | Warning details checked vs. reckless continuation                      | `hazard_warning_seen`, `hazard_info_checked`, `hazard_reckless_continue`                                   | `prudence_check_rate`, `reckless_shortcut_count`                                | direct                                                                                 |
| Q13 | Grit-S PE / continues after setback                           | Archive                                     | Wrong code -> feedback -> revise/complete or abandon                   | `archive_wrong_code`, `archive_feedback_used`, `archive_strategy_revision`, `archive_completed`            | `post_failure_reengagement`, `adaptive_persistence_count`                       | direct                                                                                 |
| Q14 | Grit-S PE / effort in demanding task                          | Repair                                      | Failed repair -> manual -> revised sequence -> completion              | `repair_failed`, `repair_manual_used`, `repair_strategy_revision`, `repair_completed`                      | `difficulty_persistence_score`, `manual_use_flag`                               | direct                                                                                 |
| Q15 | Grit-S PE / finishes what is started                          | Interruption Corridor; Final Core           | Interruption while task active; return and complete                    | `interruption_received`, `return_to_unfinished_task`, `task_completed_after_interruption`                  | `return_to_task_rate`, `started_task_completion_rate`                           | direct                                                                                 |
| Q16 | Grit-S PE / diligence                                         | Optional Side Repair                        | Optional multi-step repair, sustained accuracy                         | `side_repair_accepted`, `side_repair_step_completed`, `side_repair_completed`                              | `diligence_step_count`, `optional_task_completion`                              | direct                                                                                 |
| Q17 | Grit-S CI / distracted by new task (reverse)                  | Interruption Corridor                       | Competing task offered while objective remains active                  | `interruption_received`, `competing_task_viewed`, `switched_task`, `returned_to_original_task`             | `distraction_switch_rate`, `return_after_switch_flag`                           | **weak/exploratory**                                                                   |
| Q18 | Grit-S CI / long focus (reverse)                              | Interruption Corridor; Final Core           | Multi-room objective remains active; final check on revisit            | `objective_active`, `final_unresolved_due_to_nonreturn`                                                    | `longitudinal_focus_proxy`, `unresolved_after_interruption`                     | **weak/exploratory — cannot reproduce months-long interest stability in a short game** |
| Q19 | Grit-S CI / changes goals before finishing (reverse)          | Interruption Corridor                       | New side goal offered while prior duty pending                         | `new_goal_offered`, `goal_switch_accepted`, `prior_goal_completed`, `prior_goal_abandoned`                 | `goal_switch_without_return_count`                                              | **weak/exploratory**                                                                   |
| Q20 | Grit-S CI / starts then disengages (reverse)                  | Optional Side Repair; Interruption Corridor | Accept optional task, first step, abandon as effort rises              | `side_repair_accepted`, `side_repair_first_step`, `side_repair_abandoned_after_start`                      | `start_without_sustain_count`, `optional_followthrough_rate`                    | **weak/exploratory**                                                                   |
| Q21 | PDD / keeps working when hard                                 | Repair                                      | Failed repair creates difficulty; support/revision then continue       | `repair_failed`, `repair_manual_used`, `repair_strategy_revision`, `repair_completed`                      | `game_difficulty_persistence`, `failure_recovery_score`                         | direct                                                                                 |
| Q22 | PDD / works through difficult information                     | Archive; Repair                             | Feedback/manual/log use followed by revision                           | `archive_feedback_used`, `repair_manual_used`, `manual_page_reviewed`                                      | `manual_or_feedback_used`, `strategy_revision_count`                            | direct                                                                                 |
| Q23 | PDD / keeps trying when hard                                  | Archive; Repair                             | Continue after difficulty, ideally with adaptive revision              | `archive_strategy_revision`, `repair_strategy_revision`                                                    | `difficulty_retry_count`, `adaptive_retry_quality`                              | direct                                                                                 |
| Q24 | PDD / not discouraged by setbacks                             | Archive; Repair                             | Setback occurs; player re-engages instead of disengaging               | `archive_abandoned`, `archive_returned_after_failure`, `repair_abandoned`, `repair_returned_after_failure` | `reengagement_after_failure`, `abandonment_after_failure_count`                 | direct                                                                                 |
| Q25 | PDD / sticks with difficult task                              | Archive; Repair                             | Unresolved station remains; player returns/re-engages                  | `archive_returned_after_failure`, `repair_returned_after_failure`                                          | `abandonment_after_failure_count`, `reengagement_after_failure`                 | direct                                                                                 |
| Q26 | Inappropriate Persistence / repeated ineffective response     | Archive; Repair                             | Repeat same wrong code/default sequence after feedback                 | `archive_same_wrong_code_repeated`, `repair_same_sequence_repeated`                                        | `blind_retry_count`, `game_inappropriate_persistence`                           | direct — **maladaptive, higher = worse**                                               |
| Q27 | Inappropriate Persistence / continuation despite poor basis   | Hazard Control                              | Proceed despite warning and available information                      | `hazard_info_checked`, `hazard_reckless_continue`                                                          | `reckless_shortcut_count`, `uncertainty_inappropriate_count`                    | direct — **maladaptive, higher = worse**                                               |
| Q28 | Inappropriate Persistence / force through known blocker       | Final Core                                  | Explicit blocker shown; resolve or force continue                      | `final_core_blocker_shown`, `final_core_force_continue`, `issue_resolution_attempted`                      | `force_continue_count`, `blocker_ignored_count`                                 | direct — **maladaptive, higher = worse**                                               |
| Q29 | Goal-Time / delayed benefit proxy                             | Optional Side Repair; Final Core            | Optional stabiliser costs time now, improves later stability           | `stabiliser_option_offered`, `stabiliser_accepted`, `final_core_stability_bonus`                           | `delayed_benefit_investment`, `final_stability_gain`                            | **optional/exploratory**                                                               |
| Q30 | Goal-Time / short-term shortcut proxy                         | Inventory/Prep                              | Skip verification for quick progress vs. prepare for later quality     | `inventory_verified_complete`, `inventory_verification_skipped`                                            | `short_term_shortcut_count`, `preparation_delay_benefit`                        | **optional/exploratory**                                                               |
| Q31 | Goal-Time / immediate path vs. slower quality proxy           | Hazard Control                              | Faster reckless route vs. slower informed route                        | `hazard_informed_continue`, `hazard_reckless_continue`                                                     | `informed_delay_choice`, `risky_shortcut_count`                                 | **optional/exploratory**                                                               |
| Q32 | Goal-Time / extra work for future benefit proxy               | Optional Side Repair                        | Complete optional side repair helping final status later               | `side_repair_completed`, `final_bonus_unlocked`                                                            | `optional_future_benefit_score`                                                 | **optional/exploratory**                                                               |
| Q33 | Goal-Time / rush finish vs. resolve before finish proxy       | Final Core                                  | Finalize now or spend time resolving preventable issues                | `final_core_issue_resolved`, `final_core_rushed`, `final_core_completed`                                   | `delayed_finalization_score`, `rush_to_finish_count`                            | **optional/exploratory**                                                               |

Control/usability data (not Q-mapped): all Dock/Arrival Bay events
(`dock_started`, `first_movement`, `first_interaction`, `tutorial_completed`,
`control_error_count`, `baseline_idle_seconds`) — used as covariates, never scored
as personality.

## Behavioural proxy notes

- **Direct** proxies (Q01-Q16, Q21-Q28) map onto a single room's core mechanic with
  a defensible behavioural analogue. These are the primary scoring targets.
- **Weak/exploratory** proxies (Q17-Q20, Grit-S Consistency of Interest) cannot
  reproduce genuine long-horizon interest stability in a 15-20 minute session.
  Treat their derived variables as directional signals only, always labelled as
  such in `docs/research/scoring-plan.md` and in any Qualtrics summary export.
- **Optional/exploratory** proxies (Q29-Q33, Goal-Time Preference) measure a
  short-game analogue (spend time/effort now for a later, visible payoff) rather
  than literal multi-year goal orientation. Never present these as validated
  Goal-Time measures.

## Scoring caution notes

- Never compute one global personality score or one global "good player" score.
- Never compute one mixed persistence score combining adaptive (Q13-Q16, Q21-Q25)
  and inappropriate (Q26-Q28) persistence — they are opposite-valence and must stay
  in separate variables (confirmed below).
- Composite indices (e.g. `failure_adaptation_index`) may combine adaptive signals
  with a penalty term for inappropriate/abandonment signals, per V3 Section 6's
  worked examples — but the underlying inappropriate-persistence variable must
  still exist standalone and unmixed elsewhere.
- Manual/feedback use should only score positively when followed by a relevant
  revision — raw time-on-task is never treated as "effort" alone (Repair/Archive
  validity caution, V3 Section 4).
- Completionism/curiosity are named confounds for Optional Side Repair (Q07, Q16,
  Q20, Q29, Q32) — log accepted/started/deferred/abandoned/completed as separate
  events rather than collapsing them into one "did it" flag.

## Explicit confirmations required by this document

- **Q04 confirmation**: Q04 is implemented (and must remain implemented) as
  cleanup/disorder — i.e., whether the player tidies/resolves workspace state
  before leaving the Inventory/Prep room, and whether that disorder is later
  flagged at Final Core. Q04 is **not** a planning-before-acting mechanic, and no
  mechanic that measures pre-action planning may be labelled Q04.
- **Adaptive vs. inappropriate persistence separation confirmation**: adaptive
  persistence (Q13-Q16, Q21-Q25: revision, re-engagement, manual/feedback use
  followed by improvement) and inappropriate persistence (Q26-Q28: repeating an
  identical failed action, forcing through a known blocker, reckless continuation
  past a warning) must remain distinct derived variables at all times. Higher
  inappropriate-persistence values are worse, never better. See
  `docs/research/scoring-plan.md` for the current-vs-canonical variable
  reconciliation that enforces this in code.

## Current implementation status (cross-reference)

See `docs/research/event-schema.md` for the full current-prototype-to-canonical
event alias tables, and `docs/research/scoring-plan.md` for the derived-variable
reconciliation. Summary: Archive, Repair, and Hazard Control have the closest
current event-name alignment to this matrix; Engineer Hub, Inventory/Prep,
Optional Side Repair, Interruption Corridor, and Final Core need the most
reconciliation work, and several cross-room mechanics implied by this matrix
(Q10 accepted-duty follow-through, Q18 multi-room objective revisit, Q29/Q32
final-core stability bonus) are not yet implemented in `src/`.
