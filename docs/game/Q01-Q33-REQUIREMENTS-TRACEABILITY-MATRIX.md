# Q01-Q33 Requirements Traceability Matrix (playable-game blueprint)

Documentation only. Base `bfca741`. Sources: tier-2 measurement specification
(`docs/scientific/Q01-Q33_GAMIFIED_MEASUREMENT_SPECIFICATION.md`) for
rationale/strength/windows; `docs/research/event-schema.md` for **approved**
event names; `docs/research/scoring-plan.md` for approved/target variables;
`docs/ai/SCIENTIFIC-AUTHORITY-AND-OPEN-DECISIONS.md` for gates;
`docs/research/audits/CURRENT-Q01-Q33-IMPLEMENTATION-GAP-AUDIT.md` for
current status. Exact questionnaire wording appears **nowhere** in this file
and must never appear in player-facing text; "meaning" rows are neutral
paraphrases for traceability.

Conventions:

- **Approved events** = names present in `event-schema.md` (or ruled, e.g.
  D1). **CANDIDATE** = names from the tier-2 spec, unapproved; they require
  an event-schema decision before any implementation emits them.
- **"Approved raw events" rows list module-relevant approved names — NOT
  a claim that each name carries a live registration to this Q item.**
  Live `study_item_ids`/`construct_id` registrations are exactly those in
  `src/world/CanonicalEventContext.ts`; where a listed name is registered
  to a different item (or deliberately unmapped), the row says so inline.
  Nothing in this file adds, moves, or implies a registration.
- All derived indicators listed under "Candidate derived variables" require
  a scoring-plan decision unless marked "approved target" (named in
  scoring-plan §2).
- Shared modules (spec §8, authority doc §7) — evidence is shared, never
  multiplied: **ARC** Archive failure-and-revision (Q13 primary; Q22-Q26
  supporting); **REP** Repair difficulty (Q14/Q21/Q24 primary; Q22/Q23/Q25
  supporting); **INT** interruption/continuity (Q15/Q17/Q18/Q19); **OPT**
  optional side-repair/anomaly arc (Q07/Q16/Q20); **HOR** goal-horizon
  (Q29+Q31 shared, Q32 weak derived); **GRA** goal-granularity (Q30 primary,
  Q33 weak portfolio); **STOP** maladaptive stopping rules (Q26/Q27/Q28 —
  three distinct conditions).
- Opportunity/accessibility flags: every module must log that the
  opportunity was presented and functionally accessible, and sessions must
  distinguish no-opportunity / technical-interruption / comprehension-failure
  from behavioural non-performance (spec §1.3/§1.4). Coding rules for these
  states are OPEN (spec §8.2) — research-owner approval required.

## 0. Summary table

| Q   | Neutral meaning                     | Domain (source)                                     | Strength (spec)                      | Module / room                                    | Current status             | Gate                                  |
| --- | ----------------------------------- | --------------------------------------------------- | ------------------------------------ | ------------------------------------------------ | -------------------------- | ------------------------------------- |
| Q01 | Systematic, ordered approach        | Organisation (BFI-C-04, +)                          | Strong                               | Inventory/Prep                                   | PARTIAL                    | — (task-design)                       |
| Q02 | Disorganised (rev)                  | Organisation (BFI-C-01, −)                          | Strong reverse                       | Inventory/Prep + Final Core                      | PARTIAL                    | SA-4 (Q30 co-tag only)                |
| Q03 | Keeps things orderly/tidy           | Organisation (BFI-C-07, +)                          | Strong                               | Inventory/Prep + later retrieval                 | PARTIAL                    | — (task-design)                       |
| Q04 | Leaves mess, no cleanup (rev)       | Organisation (BFI-C-10, −)                          | Strong reverse                       | Inventory/Prep (+Repair option), Final Core flag | ALIGNED                    | closed (never planning-before-action) |
| Q05 | Slow to start tasks (rev)           | Productiveness (BFI-C-05, −)                        | Moderate reverse                     | First required objective (Repair)                | BLOCKED                    | D7                                    |
| Q06 | Efficient, completes work           | Productiveness (BFI-C-08, +)                        | Strong                               | Cross-room required tasks                        | PARTIAL                    | D2 (rate wiring)                      |
| Q07 | Works until finished                | Productiveness (BFI-C-11, +)                        | Strong-moderate                      | OPT (Side Repair)                                | PARTIAL                    | — (task-design steps)                 |
| Q08 | Low engagement/avoidance (rev)      | Productiveness (BFI-C-02, −)                        | Moderate reverse                     | ≥2 required duties + idle                        | PARTIAL                    | D3 (idle)                             |
| Q09 | Dependable, steady                  | Responsibility (BFI-C-03, +)                        | Strong                               | Engineer Hub report-back                         | ALIGNED                    | D5 (legacy event)                     |
| Q10 | Reliable follow-through             | Responsibility (BFI-C-09, +)                        | Strong                               | Engineer duty across rooms → Final Core          | ALIGNED                    | —                                     |
| Q11 | Irresponsible outcomes (rev)        | Responsibility (BFI-C-12, −)                        | Strong reverse                       | Final Core review/force                          | ALIGNED                    | D2 (quality shape)                    |
| Q12 | Careless with available info (rev)  | Responsibility/prudence (BFI-C-06, −)               | Strong reverse                       | Hazard Control                                   | ALIGNED                    | D2 (prudence split)                   |
| Q13 | Not discouraged by setback          | Adaptive persistence (GRIT-02, +)                   | Strong                               | ARC (Archive)                                    | ALIGNED                    | —                                     |
| Q14 | Hard, useful work                   | Adaptive persistence (GRIT-04, +)                   | Moderate-strong                      | REP (Repair)                                     | ALIGNED                    | —                                     |
| Q15 | Finishes what is begun              | Adaptive persistence (GRIT-07, +)                   | Strong                               | INT applied to started task                      | PARTIAL                    | — (mechanic)                          |
| Q16 | Diligent multi-step accuracy        | Adaptive persistence (GRIT-08, +)                   | Strong-moderate                      | OPT / Inventory verification                     | PARTIAL                    | — (steps)                             |
| Q17 | Diverted by new options (rev)       | Consistency of interest (GRIT-01, −)                | Moderate exploratory                 | INT                                              | PARTIAL                    | D6                                    |
| Q18 | Sustaining long project focus (rev) | Consistency of interest (GRIT-06, −)                | Weak; questionnaire-primary          | Background objective across rooms                | ALIGNED (for approved use) | SA-7 (label only)                     |
| Q19 | Switches goals pre-completion (rev) | Consistency of interest (GRIT-05, −)                | Moderate exploratory                 | INT + prior commitment                           | PARTIAL                    | — (mechanic)                          |
| Q20 | Early interest not sustained (rev)  | Consistency of interest (GRIT-03, −)                | Very weak; questionnaire-primary     | OPT anomaly arc                                  | ALIGNED (for approved use) | SA-7 (label only)                     |
| Q21 | Continues when difficult            | Persistence despite difficulty (PDD-01, +)          | Strong                               | REP                                              | ALIGNED                    | —                                     |
| Q22 | Works through hard information      | Persistence despite difficulty (PDD-03, +)          | Strong (+reading controls)           | ARC/REP support material                         | ALIGNED                    | D2 (applied-use nuance)               |
| Q23 | Keeps trying, adapts                | Persistence despite difficulty (PDD-05, +)          | Strong                               | ARC/REP                                          | ALIGNED                    | —                                     |
| Q24 | Recovers after setback              | Persistence despite difficulty (PDD-04, +)          | Strong                               | REP replication of Q13                           | ALIGNED                    | D4 (construct label)                  |
| Q25 | Sticks with difficult task          | Persistence despite difficulty (PDD-02, +)          | Moderate                             | ARC/REP leave/return                             | PARTIAL                    | D4                                    |
| Q26 | Repeats identical failed action     | Inappropriate persistence (IP-02, maladaptive+)     | Strong maladaptive                   | STOP (ARC/REP repeats)                           | ALIGNED                    | —                                     |
| Q27 | Continues past zero utility         | Inappropriate persistence (IP-01, maladaptive+)     | Moderate-strong maladaptive          | STOP utility-stop module (absent)                | STALE                      | **SA-1 + SA-2**                       |
| Q28 | Forces known-futile action          | Inappropriate persistence (IP-03, maladaptive+)     | Strong maladaptive                   | STOP (Final Core blocker)                        | ALIGNED                    | D2 (4th term)                         |
| Q29 | Longer-horizon goal preference      | Goal-time (GTP-01, exploratory)                     | Moderate exploratory                 | HOR (absent)                                     | STALE                      | **SA-3**                              |
| Q30 | Small-goal granularity preference   | Goal-time (GTP-03, exploratory)                     | Moderate if repeated                 | GRA (absent)                                     | STALE                      | **SA-4**                              |
| Q31 | Shorter-horizon goal preference     | Goal-time (GTP-04, exploratory)                     | Moderate exploratory (shared w/ Q29) | HOR (absent)                                     | STALE                      | **SA-3**                              |
| Q32 | Extended-goal engagement            | Goal-time (GTP-02, long-term-oriented, NOT reverse) | Very weak; questionnaire-primary     | Derived from HOR/OPT                             | BLOCKED                    | **SA-5**                              |
| Q33 | Short-goal completion portfolio     | Goal-time (GTP-05, exploratory)                     | Weak; questionnaire-primary          | Derived portfolio over HOR/GRA                   | STALE                      | **SA-6** (behind SA-3/SA-4)           |

## 1. Per-item rows

Each block carries the full required fields. "Required implementation" states
the smallest change that closes the gap **after** its gate (if any) is ruled.

### Q01 — systematic/ordered approach (Organisation, BFI-C-04, positive)

| Field                           | Value                                                                                                                                                                                                                                   |
| ------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Evidence strength               | Strong analogue                                                                                                                                                                                                                         |
| Module/room                     | Inventory/Prep — Quartermaster console, checklist, kit bench                                                                                                                                                                            |
| Standardised opportunity        | Labelled readiness checklist + sortable items available before kit assembly; checklist use optional, correction possible, verification offered                                                                                          |
| Player-visible situation        | Prepare a field kit for the next station cycle: sort supplies into labelled bins, follow (or skip) the checklist, verify the kit                                                                                                        |
| Actions/choices                 | Open checklist before acting; inspect labels; place items; correct detected error; verify kit; or proceed unsystematically                                                                                                              |
| Process variables               | Checklist-open-before-first-placement; ordered-step compliance; corrections after feedback; verification performed                                                                                                                      |
| Outcome variables               | Proportion correctly placed; preventable omissions at exit                                                                                                                                                                              |
| Opportunity/accessibility flags | Checklist availability logged (`inventory_checklist_opened` presence vs room entry); per-item mini-game must log opportunity shown; comprehension controls from Dock                                                                    |
| Contamination risks             | Reading/UI skill, label ambiguity, gaming experience — mitigate with explicit labels, simple controls, Dock covariates; never reward speed alone                                                                                        |
| Overlapping items               | Q02 (reverse of same behaviour), Q03 (maintenance vs one-time compliance), Q16 (verification overlap)                                                                                                                                   |
| Double-counting warning         | Q01 order/accuracy vs Q03 maintained-order must stay distinct variables; one placement act never feeds both as independent observations                                                                                                 |
| Current status                  | PARTIAL — checklist/sequence choice exists; no per-item placement substrate                                                                                                                                                             |
| Required implementation         | Per-item sort/placement mini-game emitting already-approved events (FABLE-NEXT-02)                                                                                                                                                      |
| Approved raw events             | `inventory_room_entered`, `inventory_checklist_opened`, `inventory_sequence_followed`, `inventory_item_sorted_correct` (schema-listed, unemitted), `inventory_sequence_completed` (schema-listed), `readiness_verified` (schema-listed) |
| Candidate raw events            | `inventory_checklist_available`, `inventory_item_placed`, `inventory_item_corrected` (CANDIDATE — event-schema decision)                                                                                                                |
| Candidate derived variables     | `organisation_checklist_use` (approved target), `organisation_accuracy_score` (approved target), `sequence_quality`, `preventable_omission_count` (CANDIDATE)                                                                           |
| Pilot status                    | Include; questionnaire-anchored validation                                                                                                                                                                                              |
| Scientific-claim boundary       | Orderly task approach in a single standardised preparation episode; not a general life-organisation measure                                                                                                                             |

### Q02 — disorganisation (Organisation, BFI-C-01, reverse)

| Field                           | Value                                                                                                                                                                                                                                                                                                         |
| ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Evidence strength               | Strong reverse analogue                                                                                                                                                                                                                                                                                       |
| Module/room                     | Inventory/Prep; consequence surfaced at Final Core                                                                                                                                                                                                                                                            |
| Standardised opportunity        | Misplacement/omission possible; a clear correction opportunity is offered; only errors surviving correction count                                                                                                                                                                                             |
| Player-visible situation        | Same kit-prep task; a review step highlights problems; player may repair the kit or leave it incomplete                                                                                                                                                                                                       |
| Actions/choices                 | Review kit; correct misplacements; verify; or leave disordered/incomplete                                                                                                                                                                                                                                     |
| Process variables               | Corrections after feedback; verification skipped                                                                                                                                                                                                                                                              |
| Outcome variables               | Unresolved misplacements; preventable missing-item consequence at Final Core                                                                                                                                                                                                                                  |
| Opportunity/accessibility flags | Correction opportunity must be evidenced before errors count as trait evidence — in the target design the review step is structurally guaranteed, so the flag is derivable from event order (sequence-derived, pending open spec §8.2 coding rules); a dedicated opportunity-shown event would be a CANDIDATE |
| Contamination risks             | Misunderstood labels mimic disorganisation — task transparency + correctable errors are mandatory safeguards                                                                                                                                                                                                  |
| Overlapping items               | Q01/Q03 (same room), Q04 (disorder ≠ mess-leaving; separate acts)                                                                                                                                                                                                                                             |
| Double-counting warning         | Final Core missing-item flag is consequence evidence for Q02, not an independent second observation                                                                                                                                                                                                           |
| Current status                  | PARTIAL — shortcut path + Final Core flag exist; correction-opportunity step absent                                                                                                                                                                                                                           |
| Required implementation         | Correction stage inside the per-item mini-game (same pass as Q01)                                                                                                                                                                                                                                             |
| Approved raw events             | `inventory_item_misplaced` (schema-listed, unemitted), `inventory_verification_skipped`, `missing_item`, `final_core_missing_item_flagged`                                                                                                                                                                    |
| Candidate raw events            | `inventory_item_corrected` (CANDIDATE)                                                                                                                                                                                                                                                                        |
| Candidate derived variables     | `organisation_error_count` (approved target), `avoidable_omission_count` (CANDIDATE), `correction_rate` (CANDIDATE)                                                                                                                                                                                           |
| Pilot status                    | Include                                                                                                                                                                                                                                                                                                       |
| Scientific-claim boundary       | Preventable, uncorrected disorder in one episode; first ordinary mistakes are never trait evidence. Note: the live Q30 co-tag on `inventory_verification_skipped` is SA-4's question, not Q02's                                                                                                               |

### Q03 — maintained order/tidiness (Organisation, BFI-C-07, positive)

| Field                           | Value                                                                                                                                                          |
| ------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Evidence strength               | Strong analogue                                                                                                                                                |
| Module/room                     | Inventory/Prep + one later retrieval episode (Repair or Final Core)                                                                                            |
| Standardised opportunity        | Organised storage earlier; a later moment genuinely needs a specific tool/manual                                                                               |
| Player-visible situation        | Later task calls for a specific tool; well-kept storage lets the player fetch it directly, disorder forces searching                                           |
| Actions/choices                 | Return items to labelled storage; leave tools out; retrieve from expected location; search bins; select wrong tool                                             |
| Process variables               | Wrong-bin openings; retrieval latency (secondary only)                                                                                                         |
| Outcome variables               | Workspace/order state; correct first retrieval; prepared tool available and used                                                                               |
| Opportunity/accessibility flags | Retrieval episode must log that retrieval was actually required (opportunity) and reachable                                                                    |
| Contamination risks             | Speed and spatial memory — accuracy and state maintenance primary, never retrieval time                                                                        |
| Overlapping items               | Q01 (do not duplicate checklist score), Q04 (cleanup act distinct from maintained order)                                                                       |
| Double-counting warning         | Persistent-order state + retrieval feeds Q03 only; Q01's checklist score must not be re-counted here                                                           |
| Current status                  | PARTIAL — tidy/sort actions exist; later-retrieval episode does not                                                                                            |
| Required implementation         | Later retrieval episode (cross-room prepared-tool use), emitting approved events (FABLE-NEXT-02 scope boundary; retrieval episode may land with FABLE-NEXT-03) |
| Approved raw events             | `correct_tool_selected`, `wrong_tool_selected` (schema-listed, unemitted), `prepared_tool_used` (schema-listed, unemitted), `workspace_tidy_confirmed`         |
| Candidate raw events            | `workspace_order_state`, `tool_returned_to_storage`, `tool_bin_opened` (CANDIDATE)                                                                             |
| Candidate derived variables     | `workspace_tidy_score`, `tool_retrieval_accuracy`, `prepared_resource_use` (CANDIDATE; first is a MASTER_33 name, still unapproved as formula)                 |
| Pilot status                    | Include if retrieval episode lands; otherwise partial evidence only                                                                                            |
| Scientific-claim boundary       | Order that remains functional later in the same session                                                                                                        |

### Q04 — leaves mess / no cleanup (Organisation, BFI-C-10, reverse)

| Field                           | Value                                                                                                                                                       |
| ------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Evidence strength               | Strong reverse analogue                                                                                                                                     |
| Module/room                     | Explicit post-task cleanup at Inventory/Prep (optionally Repair bench later); Final Core disorder flag                                                      |
| Standardised opportunity        | After task completion, tools/waste visibly remain; leaving, partial cleanup and full restore are all open and non-moralised                                 |
| Player-visible situation        | Objective complete; bench still covered in tools and packaging; player may reset it, partially tidy, or go                                                  |
| Actions/choices                 | Return tools; clear waste; reset bench; inspect area; leave everything; partial cleanup                                                                     |
| Process variables               | Cleanup initiated; proportion restored                                                                                                                      |
| Outcome variables               | Workspace state at exit; later flag only if meaningful                                                                                                      |
| Opportunity/accessibility flags | `cleanup_opportunity` must be distinguishable from no-opportunity exits (shortcut path currently asserts disorder in the same key press — enrichment noted) |
| Contamination risks             | If cleanup looks irrelevant, leaving is rational — expectation/purpose must be visible without moralising                                                   |
| Overlapping items               | Q02 (omission vs mess), Q03 (maintenance)                                                                                                                   |
| Double-counting warning         | Final Core workspace flag is consequence evidence, not a second observation                                                                                 |
| Current status                  | ALIGNED — closed decision; cleanup/restore-vs-leave implemented; **never planning-before-action**                                                           |
| Required implementation         | None required. Optional enrichment (multi-object cleanup, partial-restore proportion) needs event-schema approval of candidates                             |
| Approved raw events             | `workspace_left_disordered`, `cleanup_completed`, `final_core_workspace_issue_flagged`                                                                      |
| Candidate raw events            | `cleanup_opportunity_shown`, `cleanup_started`, `tool_restored`, `waste_cleared` (CANDIDATE)                                                                |
| Candidate derived variables     | `cleanup_failure_count` (approved target, missing), `workspace_disorder_at_exit`, `partial_cleanup_count` (CANDIDATE)                                       |
| Pilot status                    | Include                                                                                                                                                     |
| Scientific-claim boundary       | Restoration behaviour after explicit opportunity; any planning-before-action mechanic is out of scope for Q04 by closed decision                            |

### Q05 — difficulty getting started (Productiveness, BFI-C-05, reverse)

| Field                           | Value                                                                                                                                                       |
| ------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Evidence strength               | Moderate reverse analogue                                                                                                                                   |
| Module/room                     | First required objective after Dock (preferably Systems Repair)                                                                                             |
| Standardised opportunity        | Clear objective + interaction marker presented; control restored; instructions inspectable                                                                  |
| Player-visible situation        | A clearly marked station task awaits; the player can begin, read instructions, wander or idle                                                               |
| Actions/choices                 | Begin task; inspect task-relevant instructions (not counted as avoidance); delay via unrelated actions; idle                                                |
| Process variables               | Task-initiation latency; task-relevant vs irrelevant actions; idle duration; repeated departures before starting                                            |
| Outcome variables               | Started/not started within episode                                                                                                                          |
| Opportunity/accessibility flags | Clock starts only after objective confirmed AND control restored; exclude comprehension-failure and technical-interruption trials                           |
| Contamination risks             | Navigation difficulty, confusion, reading speed — Dock covariates mandatory; **no universal seconds cut-off**, calibrate in pilot                           |
| Overlapping items               | Q08 (avoidance pattern vs initiation), Q06 (efficiency)                                                                                                     |
| Double-counting warning         | Initiation latency never doubles as an effort or persistence variable                                                                                       |
| Current status                  | BLOCKED — D7 (`task_started` Q-listing conflict) + no latency plumbing anywhere                                                                             |
| Required implementation         | After D7: emit `task_started`, add latency capture (objective_confirmed→first goal-directed action), Dock-covariate exclusion rules                         |
| Approved raw events             | `task_started` (schema-listed, blocked D7)                                                                                                                  |
| Candidate raw events            | `objective_confirmed`, `control_restored`, `task_relevant_info_opened`, `first_goal_directed_action`, `irrelevant_interaction`, `idle_interval` (CANDIDATE) |
| Candidate derived variables     | `task_initiation_latency` (approved target, missing), `prestart_avoidance_count`, `productiveness_action_ratio` (approved target) (CANDIDATE formulas)      |
| Pilot status                    | Exclude until D7 ruled; questionnaire covers meanwhile                                                                                                      |
| Scientific-claim boundary       | Initiation after comprehension — never movement speed                                                                                                       |

### Q06 — efficient completion (Productiveness, BFI-C-08, positive)

| Field                           | Value                                                                                                                                   |
| ------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| Evidence strength               | Strong analogue                                                                                                                         |
| Module/room                     | Across required Archive, Repair, Final Core objectives                                                                                  |
| Standardised opportunity        | Clear required objectives with simple learnable routes; completion + effective action observable per room                               |
| Player-visible situation        | Ordinary station duties completed (or left unresolved) across the visit                                                                 |
| Actions/choices                 | Use available information; goal-relevant actions; correct errors; complete; abandon                                                     |
| Process variables               | Effective-action ratio; unnecessary-action count; avoidable rework; time after comprehension (adjusted, secondary)                      |
| Outcome variables               | Required completion rate (multi-room)                                                                                                   |
| Opportunity/accessibility flags | Each required objective logs presented/accessible; incomplete-session handling is an OPEN spec §8.2 rule                                |
| Contamination risks             | Cognitive ability and game skill — tasks simple after feedback; never a pure speed score                                                |
| Overlapping items               | Q05 (initiation), Q08 (engagement), Q11 (final quality)                                                                                 |
| Double-counting warning         | Completion events shared with room-specific items count once per construct level                                                        |
| Current status                  | PARTIAL — completions captured; process side (unnecessary actions, rework) not captured                                                 |
| Required implementation         | `goal_relevant_action`/`unnecessary_action` capture is CANDIDATE-gated; rate wiring lands with D2 scoring bundle                        |
| Approved raw events             | `archive_completed`, `repair_completed`, `final_core_completed`                                                                         |
| Candidate raw events            | `objective_started`, `goal_relevant_action`, `unnecessary_action`, `objective_abandoned` (CANDIDATE)                                    |
| Candidate derived variables     | `required_completion_rate` (approved target), `productiveness_completion_score` (approved target), `effective_action_ratio` (CANDIDATE) |
| Pilot status                    | Include (outcome level); process level post-decision                                                                                    |
| Scientific-claim boundary       | Multi-task completion pattern; not IQ, not speed                                                                                        |

### Q07 — works until finished (Productiveness, BFI-C-11, positive)

| Field                           | Value                                                                                                                                                                                                                   |
| ------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Evidence strength               | Strong-moderate analogue                                                                                                                                                                                                |
| Module/room                     | OPT — accepted multi-step useful task (Side Repair)                                                                                                                                                                     |
| Standardised opportunity        | Task knowingly accepted with visible utility; several real steps; defer/return/complete all possible                                                                                                                    |
| Player-visible situation        | Utility Bot offers a stabiliser repair that visibly helps final station stability; player may take it on and see it through — or not                                                                                    |
| Actions/choices                 | Accept/decline; complete steps; consult support; formally defer; abandon; return; finish                                                                                                                                |
| Process variables               | Steps completed; formal deferment; return latency; completion after return                                                                                                                                              |
| Outcome variables               | Completion after acceptance; non-return                                                                                                                                                                                 |
| Opportunity/accessibility flags | Only accepted tasks create the follow-through opportunity; declining is never negative evidence                                                                                                                         |
| Contamination risks             | Curiosity/completionism — acceptance and completion logged separately; task utility explicit                                                                                                                            |
| Overlapping items               | Q16 (diligence, same arc), Q20 (start-without-sustain, same arc), Q10 (accepted-duty follow-through — different commitment object)                                                                                      |
| Double-counting warning         | OPT is one shared arc for Q07/Q16/Q20 (+ stale Q29/Q32 tags): one act never counts as five observations — currently the single completion key press carries five tags (worst live non-independence risk; gap audit §12) |
| Current status                  | PARTIAL — accept/defer/abandon/complete exist as single presses; no steps                                                                                                                                               |
| Required implementation         | Multi-step substrate emitting `side_repair_step_completed` (schema-listed; step granularity is a task-design gate) — FABLE-NEXT-03-adjacent scope, bounded to Side Repair                                               |
| Approved raw events             | `stabiliser_option_offered`, `side_repair_accepted`, `side_repair_step_completed` (schema-listed, unemitted), `side_repair_deferred`, `side_repair_abandoned_after_start`, `side_repair_completed`                      |
| Candidate raw events            | `side_repair_offered` (spec name; schema name is `stabiliser_option_offered`), `side_repair_returned` (CANDIDATE — return-after-defer act is currently implicit in re-opening the offer)                                |
| Candidate derived variables     | `accepted_task_completion_rate`, `optional_followthrough_rate`, `abandonment_after_acceptance` (CANDIDATE)                                                                                                              |
| Pilot status                    | Include as secondary evidence beside required-task completion                                                                                                                                                           |
| Scientific-claim boundary       | Persistence-to-finish on one accepted optional task; never a sole work-ethic score                                                                                                                                      |

### Q08 — low engagement (Productiveness, BFI-C-02, reverse)

| Field                           | Value                                                                                                                                                      |
| ------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Evidence strength               | Moderate reverse analogue                                                                                                                                  |
| Module/room                     | ≥2 valid required-duty opportunities after Dock competence established                                                                                     |
| Standardised opportunity        | Low-complexity required duty with adequate time/competence; avoidance possible via idling/unrelated interaction/leaving unresolved                         |
| Player-visible situation        | Simple assigned duties; the player may simply not do them                                                                                                  |
| Actions/choices                 | Start and progress; formally defer with valid reason; unrelated optional activity; idle; leave unresolved                                                  |
| Process variables               | Prolonged inactive intervals; repeated non-task interactions; valid deferments                                                                             |
| Outcome variables               | Required-task engagement ratio; unresolved duties                                                                                                          |
| Opportunity/accessibility flags | Pattern-level only (never one delay); fatigue/accessibility/technical states excluded                                                                      |
| Contamination risks             | Fatigue, confusion, accessibility barriers, strategic prioritisation                                                                                       |
| Overlapping items               | Q05 (initiation), Q06 (completion), Q15/Q17 (switching is not laziness)                                                                                    |
| Double-counting warning         | `task_avoidance` (ignore branch) also relates to INT items — keep engagement variables separate from switching variables                                   |
| Current status                  | PARTIAL — only one avoidance branch exists; idle component BLOCKED (D3)                                                                                    |
| Required implementation         | After D3: idle capture; more than one required-duty opportunity arrives naturally with Stage 1 room substrates                                             |
| Approved raw events             | `task_avoidance`, `excessive_idle_after_instruction` (registered, blocked D3)                                                                              |
| Candidate raw events            | `required_duty_available`, `duty_started`, `duty_deferred`, `unrelated_optional_action`, `prolonged_idle`, `duty_completed`, `duty_unresolved` (CANDIDATE) |
| Candidate derived variables     | `productive_engagement_rate`, `avoidant_delay_count`, `unresolved_required_task_count` (CANDIDATE)                                                         |
| Pilot status                    | Exploratory pattern-level only                                                                                                                             |
| Scientific-claim boundary       | Low productive engagement across ≥2 opportunities; a single delay is never evidence                                                                        |

### Q09 — dependable reporting (Responsibility, BFI-C-03, positive)

| Field                           | Value                                                                                                                                                                                                                                                                                                                                            |
| ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Evidence strength               | Strong analogue                                                                                                                                                                                                                                                                                                                                  |
| Module/room                     | Engineer Hub — Engineer Kai + report terminal                                                                                                                                                                                                                                                                                                    |
| Standardised opportunity        | Status report requested after evidence exists elsewhere; logs consultable; clarification available                                                                                                                                                                                                                                               |
| Player-visible situation        | Kai asks for a status report before the next cycle; the player may check records first or answer from memory                                                                                                                                                                                                                                     |
| Actions/choices                 | Review evidence; ask clarification; report accurate status; report uncertain status; submit unverified answer                                                                                                                                                                                                                                    |
| Process variables               | Evidence review; clarification use; prepared vs unprepared submission                                                                                                                                                                                                                                                                            |
| Outcome variables               | Report accuracy vs logged state                                                                                                                                                                                                                                                                                                                  |
| Opportunity/accessibility flags | Evidence must be accessible; options never moral labels                                                                                                                                                                                                                                                                                          |
| Contamination risks             | Memory and reading skill                                                                                                                                                                                                                                                                                                                         |
| Overlapping items               | Q10 (commitment vs communication), Q11 (outcome ownership)                                                                                                                                                                                                                                                                                       |
| Double-counting warning         | Report events feed responsibility only — separate from persistence scores by rule                                                                                                                                                                                                                                                                |
| Current status                  | ALIGNED — report console complete; accuracy evaluation absent (secondary gap); D5 legacy event open                                                                                                                                                                                                                                              |
| Required implementation         | `engineer_report_accuracy_scored` emission + evaluation basis (schema-listed missing) — FABLE-NEXT-04                                                                                                                                                                                                                                            |
| Approved raw events             | `engineer_report_opened`, `engineer_evidence_reviewed`, `engineer_clarification_requested`, `engineer_report_submitted_prepared`, `engineer_report_submitted_unprepared`, `engineer_report_accuracy_scored` (schema-listed, unemitted, **deliberately unmapped in CEC** — a Q09 registration is an event-schema decision for the research owner) |
| Candidate raw events            | —                                                                                                                                                                                                                                                                                                                                                |
| Candidate derived variables     | `prepared_report_flag` (approved target), `report_accuracy_score` (approved target, missing), `responsibility_report_count` (approved, exact)                                                                                                                                                                                                    |
| Pilot status                    | Include                                                                                                                                                                                                                                                                                                                                          |
| Scientific-claim boundary       | Accurate, grounded communication in one episode                                                                                                                                                                                                                                                                                                  |

### Q10 — reliable follow-through (Responsibility, BFI-C-09, positive)

| Field                           | Value                                                                                                                                                                                                                                            |
| ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Evidence strength               | Strong analogue                                                                                                                                                                                                                                  |
| Module/room                     | Engineer Hub duty assignment → visible across rooms → Final Core check                                                                                                                                                                           |
| Standardised opportunity        | Duty may be accepted, declined or clarified; if accepted it persists and is completable before Final Core                                                                                                                                        |
| Player-visible situation        | Kai asks the player to keep an eye on a relay; the duty stays on the roster until handled                                                                                                                                                        |
| Actions/choices                 | Accept; decline before commitment; clarify; formally defer; complete; accept-and-leave-unresolved                                                                                                                                                |
| Process variables               | Reminders; return to duty                                                                                                                                                                                                                        |
| Outcome variables               | Completion before closure; accepted duty unresolved                                                                                                                                                                                              |
| Opportunity/accessibility flags | Only accepted commitments count; declining honestly is never unreliability                                                                                                                                                                       |
| Contamination risks             | Social desirability                                                                                                                                                                                                                              |
| Overlapping items               | Q18 (same persistent objective feeds the weak continuity proxy — shared evidence), Q15 (return-to-task)                                                                                                                                          |
| Double-counting warning         | Duty follow-through (Q10) and goal-continuity proxy (Q18) derive from one objective — keep variables separate and never multiply                                                                                                                 |
| Current status                  | ALIGNED — offer/accept/decline/complete/unresolved all live                                                                                                                                                                                      |
| Required implementation         | None required; `commitment_followthrough_rate` wiring is a scoring-plan target for the D2-family pass                                                                                                                                            |
| Approved raw events             | `engineer_supervision_assigned`, `engineer_supervision_accepted`, `engineer_supervision_declined`, `engineer_supervision_completed`, `accepted_duty_unresolved`, (`engineer_supervision_skipped` schema-listed, no formal skip act — documented) |
| Candidate raw events            | `duty_details_viewed`, `duty_deferred` (CANDIDATE)                                                                                                                                                                                               |
| Candidate derived variables     | `commitment_followthrough_rate` (approved target, missing), `accepted_duty_unresolved_count` (approved target), `reminder_dependence` (CANDIDATE)                                                                                                |
| Pilot status                    | Include                                                                                                                                                                                                                                          |
| Scientific-claim boundary       | Follow-through conditional on explicit acceptance                                                                                                                                                                                                |

### Q11 — irresponsible outcome handling (Responsibility, BFI-C-12, reverse)

| Field                           | Value                                                                                                                                                                                                                     |
| ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Evidence strength               | Strong reverse analogue                                                                                                                                                                                                   |
| Module/room                     | Final Core integration/status review                                                                                                                                                                                      |
| Standardised opportunity        | Preventable unresolved issues + practical consequences visible; inspect/resolve/acknowledge/force all open                                                                                                                |
| Player-visible situation        | Core status board lists outstanding problems; the player can deal with them or push the sync through anyway                                                                                                               |
| Actions/choices                 | Review status; resolve issues; acknowledge unavoidable issue; request support; force finalisation with preventable issues                                                                                                 |
| Process variables               | Status review; resolution attempts                                                                                                                                                                                        |
| Outcome variables               | Preventable unresolved count at completion; force-finalise acts                                                                                                                                                           |
| Opportunity/accessibility flags | No coercive countdown unless time pressure is an experimental condition                                                                                                                                                   |
| Contamination risks             | Unclear consequences, time pressure                                                                                                                                                                                       |
| Overlapping items               | Q28 (force-through blocker is a distinct STOP condition), Q06 (completion)                                                                                                                                                |
| Double-counting warning         | Final-quality outcome stays separate from specific responsibility events                                                                                                                                                  |
| Current status                  | ALIGNED — review/resolve/rush/force with real cross-room flags                                                                                                                                                            |
| Required implementation         | `final_quality_score` shape = D2; nothing else                                                                                                                                                                            |
| Approved raw events             | `final_core_status_reviewed`, `unresolved_issue_reviewed`, `issue_resolution_attempted`, `final_core_issue_resolved`, `final_core_rushed`, `final_core_force_continue`                                                    |
| Candidate raw events            | `issue_acknowledged` (CANDIDATE — acknowledge-vs-resolve distinction). Note: `final_core_force_continue` in the approved row is registered to **Q28**, not Q11 — it appears here as module-relevant evidence context only |
| Candidate derived variables     | `accountability_review_flag`, `preventable_unresolved_count`, `irresponsible_finalisation_count` (CANDIDATE); `final_quality_score` (approved target, shape open D2)                                                      |
| Pilot status                    | Include                                                                                                                                                                                                                   |
| Scientific-claim boundary       | Ownership of visible consequences at integration; rushing is Q11-relevant only through preventable-unresolved outcomes — never Q33 evidence (SA-6)                                                                        |

### Q12 — carelessness with available information (Responsibility/prudence, BFI-C-06, reverse)

| Field                           | Value                                                                                                                                                                                                                           |
| ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Evidence strength               | Strong reverse analogue                                                                                                                                                                                                         |
| Module/room                     | Hazard Control warning/details interaction                                                                                                                                                                                      |
| Standardised opportunity        | Salient warning + accessible detail before a consequential action; informed and unchecked continuation both possible; avoidance possible (D1)                                                                                   |
| Player-visible situation        | A hazard warning covers the route ahead; details are one interaction away; the player decides how to proceed                                                                                                                    |
| Actions/choices                 | Read details; inspect consequence info; informed continue; unchecked continue; avoid route                                                                                                                                      |
| Process variables               | Info checked; detail dwell/interaction                                                                                                                                                                                          |
| Outcome variables               | Informed vs unchecked action; avoidable consequence (consequence mechanic pending UD-HAZARD-CONSEQUENCE)                                                                                                                        |
| Opportunity/accessibility flags | Warning visibility logged (`hazard_warning_seen`); reading-comprehension controls                                                                                                                                               |
| Contamination risks             | Risk preference, curiosity, reading comprehension — never framed as fear                                                                                                                                                        |
| Overlapping items               | Q27/Q31 tags currently on these events are the SA-1/SA-3 conflicts — Hazard remains principally prudence by approved decision                                                                                                   |
| Double-counting warning         | One hazard act currently carries Q12+Q27+Q31 tags — SA-gated cleanup; never score one act into multiple constructs                                                                                                              |
| Current status                  | ALIGNED (mechanics); registrations partially STALE via co-tags                                                                                                                                                                  |
| Required implementation         | None for Q12; prudence-vs-revision scoring split is D2 sub-item 1                                                                                                                                                               |
| Approved raw events             | `hazard_warning_seen`, `hazard_info_checked`, `hazard_informed_continue`, `hazard_reckless_continue`, `hazard_route_avoided` (D1), `hazard_issue_created`/`hazard_issue_resolved`/`final_hazard_issue` (schema-listed, blocked) |
| Candidate raw events            | `hazard_clarification_requested` (CANDIDATE)                                                                                                                                                                                    |
| Candidate derived variables     | `prudence_check_rate` (approved target, missing), `unchecked_action_count`, `avoidable_hazard_consequence` (CANDIDATE)                                                                                                          |
| Pilot status                    | Include                                                                                                                                                                                                                         |
| Scientific-claim boundary       | Neglect of salient, accessible consequence information — not risk appetite, not goal-time preference                                                                                                                            |

### Q13 — undeterred by setback (Adaptive persistence, GRIT-02, positive)

| Field                           | Value                                                                                                                                                                            |
| ------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Evidence strength               | Strong analogue                                                                                                                                                                  |
| Module/room                     | ARC — Archive failure-and-feedback sequence                                                                                                                                      |
| Standardised opportunity        | First plausible attempt fails deterministically; usable feedback provided; revision learnable                                                                                    |
| Player-visible situation        | Archive query fails; the terminal explains why; the player may revise, retry blind, leave or finish                                                                              |
| Actions/choices                 | Open feedback; revise query; retry unchanged; leave; return; complete                                                                                                            |
| Process variables               | Post-failure re-engagement; feedback use; strategy revision                                                                                                                      |
| Outcome variables               | Completion after setback; non-return                                                                                                                                             |
| Opportunity/accessibility flags | Failure standardised (code A17 scripted); feedback must make solution learnable                                                                                                  |
| Contamination risks             | Puzzle ability                                                                                                                                                                   |
| Overlapping items               | Q22-Q26 supporting on the same sequence; Q24 conceptual redundancy (Repair replication)                                                                                          |
| Double-counting warning         | ARC feeds six items as ONE evidence sequence                                                                                                                                     |
| Current status                  | ALIGNED — strongest module                                                                                                                                                       |
| Required implementation         | None                                                                                                                                                                             |
| Approved raw events             | `archive_wrong_code`, `archive_feedback_shown`, `archive_feedback_used`, `archive_strategy_revision`, `archive_returned_after_failure`, `archive_completed`, `archive_abandoned` |
| Candidate raw events            | —                                                                                                                                                                                |
| Candidate derived variables     | `post_failure_reengagement`, `adaptive_persistence_count` (approved target, missing), `game_difficulty_persistence` (approved, exact)                                            |
| Pilot status                    | Include                                                                                                                                                                          |
| Scientific-claim boundary       | Productive re-engagement after one standardised setback                                                                                                                          |

### Q14 — hard, useful work (Adaptive persistence, GRIT-04, positive)

| Field                           | Value                                                                                                                                                                                     |
| ------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Evidence strength               | Moderate-strong analogue                                                                                                                                                                  |
| Module/room                     | REP — Systems Repair multi-step task                                                                                                                                                      |
| Standardised opportunity        | Repair needs several meaningful actions + revised sequence after diagnosis; manual available                                                                                              |
| Player-visible situation        | A failed station system needs diagnosis, manual work and a corrected sequence                                                                                                             |
| Actions/choices                 | Diagnose; consult manual; perform steps; correct sequence; complete; abandon                                                                                                              |
| Process variables               | Goal-relevant effort actions; useful effort after failure; unnecessary repetition                                                                                                         |
| Outcome variables               | Stages completed; completion                                                                                                                                                              |
| Opportunity/accessibility flags | Difficulty standardised and solvable after support                                                                                                                                        |
| Contamination risks             | Ability and task length — count effective effort, never total actions or raw time                                                                                                         |
| Overlapping items               | Q21/Q24 primary on same module; Q22/Q23/Q25 supporting                                                                                                                                    |
| Double-counting warning         | REP is one shared sequence                                                                                                                                                                |
| Current status                  | ALIGNED — single-cycle; multi-step effort granularity limited (secondary note)                                                                                                            |
| Required implementation         | Optional enrichment (multi-cycle/multi-stage effort within existing approved event names + `attempt_number`) — FABLE-NEXT-03                                                              |
| Approved raw events             | `repair_panel_opened`, `repair_sequence_submitted`, `repair_failed`, `repair_manual_opened`, `manual_page_reviewed`, `repair_manual_used`, `repair_strategy_revision`, `repair_completed` |
| Candidate raw events            | `repair_started` (spec name; schema name is `repair_panel_opened`), `repair_diagnostic_completed`, `repair_step_completed` (CANDIDATE — no schema entry for Systems Repair steps)         |
| Candidate derived variables     | `useful_effort_count`, `difficulty_persistence_score`, `repair_completion_quality` (CANDIDATE); `game_difficulty_persistence` (approved, exact)                                           |
| Pilot status                    | Include                                                                                                                                                                                   |
| Scientific-claim boundary       | Sustained useful effort in one demanding task; cross-task evidence, not a one-room score                                                                                                  |

### Q15 — finishes what is begun (Adaptive persistence, GRIT-07, positive)

| Field                           | Value                                                                                                                                                                                                                                                                                                                      |
| ------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Evidence strength               | Strong analogue                                                                                                                                                                                                                                                                                                            |
| Module/room                     | INT applied to an already-started task; closure checked at Final Core                                                                                                                                                                                                                                                      |
| Standardised opportunity        | Competing task appears while an original objective is genuinely incomplete and resumable                                                                                                                                                                                                                                   |
| Player-visible situation        | Mid-task, a comms request pulls attention elsewhere; the original job stays on the roster                                                                                                                                                                                                                                  |
| Actions/choices                 | Continue original; switch and return; formally defer; switch and abandon; complete original first                                                                                                                                                                                                                          |
| Process variables               | Return after interruption (as an observed act)                                                                                                                                                                                                                                                                             |
| Outcome variables               | Started-task completion rate; unfinished accepted tasks                                                                                                                                                                                                                                                                    |
| Opportunity/accessibility flags | Interruption timing/urgency logged; formal deferment distinct from abandonment (OPEN §8.2 rule)                                                                                                                                                                                                                            |
| Contamination risks             | Rational prioritisation — non-return, not switching, is the negative evidence                                                                                                                                                                                                                                              |
| Overlapping items               | Q17/Q18/Q19 on the same INT module                                                                                                                                                                                                                                                                                         |
| Double-counting warning         | Switching, deferment, return, abandonment stay separate variables                                                                                                                                                                                                                                                          |
| Current status                  | PARTIAL — switch/return are dialogue assertions; no real return act                                                                                                                                                                                                                                                        |
| Required implementation         | Real competing-objective + return-route mechanic emitting approved events (FABLE-NEXT-05)                                                                                                                                                                                                                                  |
| Approved raw events             | `task_started` (blocked D7 — Q15 listing part of the conflict), `interruption_received`, `switched_task`, `return_to_unfinished_task` (schema-listed, unemitted), `returned_to_original_task`, `prior_goal_abandoned`, `task_completed_after_interruption` (schema-listed, unemitted), `final_unresolved_due_to_nonreturn` |
| Candidate raw events            | `task_deferred` (CANDIDATE)                                                                                                                                                                                                                                                                                                |
| Candidate derived variables     | `started_task_completion_rate` (CANDIDATE), `return_to_task_rate` (approved target, partial), `unfinished_started_task_count` (CANDIDATE)                                                                                                                                                                                  |
| Pilot status                    | Include after mechanic lands                                                                                                                                                                                                                                                                                               |
| Scientific-claim boundary       | Completion of initiated goals across one interruption                                                                                                                                                                                                                                                                      |

### Q16 — diligence (Adaptive persistence, GRIT-08, positive)

| Field                           | Value                                                                                                                                                                                                                                          |
| ------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Evidence strength               | Strong-moderate analogue                                                                                                                                                                                                                       |
| Module/room                     | OPT multi-step task or Inventory verification sequence                                                                                                                                                                                         |
| Standardised opportunity        | Several simple steps + final verification; no complex puzzle                                                                                                                                                                                   |
| Player-visible situation        | A fiddly but clear multi-part job that rewards care                                                                                                                                                                                            |
| Actions/choices                 | Complete all stages accurately; verify; correct errors; partially complete; defer; abandon                                                                                                                                                     |
| Process variables               | Accurate stages; verification; correction; sustained engagement                                                                                                                                                                                |
| Outcome variables               | Completion after acceptance                                                                                                                                                                                                                    |
| Opportunity/accessibility flags | Steps must be simple; accuracy primary, duration supporting                                                                                                                                                                                    |
| Contamination risks             | Completionism, conscientious test-taking — interpret with Q07 + organisation, never alone                                                                                                                                                      |
| Overlapping items               | Q07/Q20 (OPT shared arc); Q01 (verification overlap)                                                                                                                                                                                           |
| Double-counting warning         | OPT shared-arc rule as Q07                                                                                                                                                                                                                     |
| Current status                  | PARTIAL — same substrate gap as Q07 (no steps)                                                                                                                                                                                                 |
| Required implementation         | Rides the Q07 multi-step substrate (`side_repair_step_completed`) and/or the Inventory per-item mini-game                                                                                                                                      |
| Approved raw events             | `side_repair_step_completed` (schema-listed, unemitted), `inventory_verified_complete` (registered **Q30** today — the SA-4 stale tag; module-relevant to Q16's verification behaviour only), `side_repair_completed` (registered Q07/Q16/Q32) |
| Candidate raw events            | `multi_step_task_accepted`, `task_step_completed`, `task_error_corrected`, `task_verified` (CANDIDATE — generic forms)                                                                                                                         |
| Candidate derived variables     | `diligence_step_accuracy`, `verified_completion_rate`, `optional_task_completion` (CANDIDATE)                                                                                                                                                  |
| Pilot status                    | Include after substrate                                                                                                                                                                                                                        |
| Scientific-claim boundary       | Careful sustained execution across steps in one session                                                                                                                                                                                        |

### Q17 — diverted by new options (Consistency of interest, GRIT-01, reverse)

| Field                           | Value                                                                                                                                    |
| ------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| Evidence strength               | Moderate exploratory analogue                                                                                                            |
| Module/room                     | INT — Comms offer of attractive non-mandatory objective                                                                                  |
| Standardised opportunity        | Competing offer neither better nor more urgent; original remains valid; later return opportunity exists                                  |
| Player-visible situation        | An interesting optional signal comes in while work is pending                                                                            |
| Actions/choices                 | Ignore; inspect; switch; formally defer original; continue original; switch-then-return                                                  |
| Process variables               | Offer inspected; switch; formal deferment; return                                                                                        |
| Outcome variables               | Prior task completed vs unresolved                                                                                                       |
| Opportunity/accessibility flags | Offer attractiveness/urgency balance documented; later-return opportunity must exist (currently one-shot — gap)                          |
| Contamination risks             | Switching may be rational — negative pattern is switch-without-return with valid original                                                |
| Overlapping items               | Q15/Q18/Q19 (INT shared)                                                                                                                 |
| Double-counting warning         | Same INT module; separate variables                                                                                                      |
| Current status                  | PARTIAL — one-shot prompt; `competing_task_viewed` blocked (D6)                                                                          |
| Required implementation         | Later-return opportunity in the real competing-objective mechanic (FABLE-NEXT-05); D6 mapping ruled before `competing_task_viewed` emits |
| Approved raw events             | `interruption_received`, `switched_task`, `returned_to_original_task`, `competing_task_viewed` (blocked D6)                              |
| Candidate raw events            | `competing_task_offered` (CANDIDATE — distinct from received)                                                                            |
| Candidate derived variables     | `distraction_switch_rate`, `switch_without_return_count`, `return_after_switch_flag` (CANDIDATE; exploratory labels mandatory)           |
| Pilot status                    | Exploratory/discriminant only                                                                                                            |
| Scientific-claim boundary       | Short-session diversion susceptibility; never "loss of interest"                                                                         |

### Q18 — sustaining long-project focus (Consistency of interest, GRIT-06, reverse)

| Field                           | Value                                                                                                                                                                                |
| ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Evidence strength               | Weak exploratory; **questionnaire-primary** (closed decision)                                                                                                                        |
| Module/room                     | Persistent background objective across rooms + interruption                                                                                                                          |
| Standardised opportunity        | Objective assigned early, continuously visible, resolvable late                                                                                                                      |
| Player-visible situation        | A standing duty stays on the roster while other work happens                                                                                                                         |
| Actions/choices                 | Continue; switch; defer; return voluntarily; complete; leave unresolved                                                                                                              |
| Process variables               | Stage continuity; voluntary revisit; return latency                                                                                                                                  |
| Outcome variables               | Unresolved status at Final Core                                                                                                                                                      |
| Opportunity/accessibility flags | Objective visibility is the opportunity condition                                                                                                                                    |
| Contamination risks             | Cannot represent months; non-return may be prioritisation/memory/low value                                                                                                           |
| Overlapping items               | Q10 (same duty object — shared evidence), Q15/Q17/Q19                                                                                                                                |
| Double-counting warning         | One duty feeds Q10 (follow-through) and Q18 (weak continuity proxy) as separate, never-multiplied variables                                                                          |
| Current status                  | ALIGNED for approved questionnaire-primary use (`objective_active`, `final_unresolved_due_to_nonreturn`)                                                                             |
| Required implementation         | None required; richer 3-stage background calibration is a CANDIDATE design needing event-schema approval                                                                             |
| Approved raw events             | `objective_active`, `final_unresolved_due_to_nonreturn`                                                                                                                              |
| Candidate raw events            | `background_objective_offered/accepted/deferred/completed`, `background_stage_completed`, `objective_revisited`, `reminder_shown` (CANDIDATE)                                        |
| Candidate derived variables     | `extended_focus_proxy`/`longitudinal_focus_proxy` (name acceptable only with explicit weak/exploratory label — SA-7), `return_after_interruption`, `reminder_dependence` (CANDIDATE) |
| Pilot status                    | Questionnaire-primary; game variable supplementary with SA-7 label                                                                                                                   |
| Scientific-claim boundary       | Weak goal-continuity proxy — never "long-term focus measurement"                                                                                                                     |

### Q19 — switches goals before finishing (Consistency of interest, GRIT-05, reverse)

| Field                           | Value                                                                                                                                                                       |
| ------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Evidence strength               | Moderate exploratory analogue                                                                                                                                               |
| Module/room                     | INT — credible new goal vs active accepted commitment                                                                                                                       |
| Standardised opportunity        | Original goal accepted first; new option credible but balanced; deferment formal; return possible                                                                           |
| Player-visible situation        | Midway through a committed job, a different worthwhile request arrives                                                                                                      |
| Actions/choices                 | Stay; switch; formally defer; return; complete new then original; abandon original                                                                                          |
| Process variables               | Goal switch; deferment; prior-goal return                                                                                                                                   |
| Outcome variables               | Prior-goal abandonment; unfinished-commitment accumulation                                                                                                                  |
| Opportunity/accessibility flags | Urgency/value balance logged                                                                                                                                                |
| Contamination risks             | Strategic switching — score abandonment/non-return, not switching                                                                                                           |
| Overlapping items               | Q15/Q17/Q18 (INT shared)                                                                                                                                                    |
| Double-counting warning         | Same INT module                                                                                                                                                             |
| Current status                  | PARTIAL — `prior_goal_abandoned` emitted; offer/accept/complete events unemittable (no mechanic)                                                                            |
| Required implementation         | Rides FABLE-NEXT-05 competing-objective mechanic (`new_goal_offered`, `goal_switch_accepted`, `prior_goal_completed` all schema-listed)                                     |
| Approved raw events             | `new_goal_offered` (schema-listed, unemitted), `goal_switch_accepted` (schema-listed, unemitted), `prior_goal_completed` (schema-listed, unemitted), `prior_goal_abandoned` |
| Candidate raw events            | `new_goal_accepted`, `prior_goal_deferred`, `prior_goal_revisited` (CANDIDATE)                                                                                              |
| Candidate derived variables     | `goal_switch_without_return_count` (approved target, missing), `unfinished_commitment_accumulation`, `goal_return_rate` (CANDIDATE)                                         |
| Pilot status                    | Exploratory                                                                                                                                                                 |
| Scientific-claim boundary       | Observable goal change with prior commitment left unresolved, one session                                                                                                   |

### Q20 — early interest not sustained (Consistency of interest, GRIT-03, reverse)

| Field                           | Value                                                                                                                                                                                             |
| ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Evidence strength               | Very weak exploratory; **questionnaire-primary; no bespoke validated game score** (closed decision)                                                                                               |
| Module/room                     | OPT anomaly-investigation arc (staged, stable utility)                                                                                                                                            |
| Standardised opportunity        | Voluntary attractive first stage; later stages with stable utility and no rational stop signal                                                                                                    |
| Player-visible situation        | An intriguing anomaly can be looked into now and followed up later                                                                                                                                |
| Actions/choices                 | Decline; begin; complete stage 1; continue; defer; return later; abandon without deferring; complete                                                                                              |
| Process variables               | Voluntary uptake; early engagement separated from later continuation                                                                                                                              |
| Outcome variables               | Start-without-sustain; final completion                                                                                                                                                           |
| Opportunity/accessibility flags | Utility stability must be explicit or stopping is rational                                                                                                                                        |
| Contamination risks             | Difficulty, priorities, reward, time — the game cannot establish obsession or interest loss                                                                                                       |
| Overlapping items               | Q07/Q16 (OPT shared)                                                                                                                                                                              |
| Double-counting warning         | OPT shared-arc rule                                                                                                                                                                               |
| Current status                  | ALIGNED for approved use (single-prompt accept/first-step/abandon events); staged arc is CANDIDATE only                                                                                           |
| Required implementation         | None required. Staged anomaly arc = event-schema decision first                                                                                                                                   |
| Approved raw events             | `side_repair_accepted`, `side_repair_first_step`, `side_repair_abandoned_after_start`                                                                                                             |
| Candidate raw events            | `anomaly_discovered`, `anomaly_investigation_started`, `anomaly_first_stage_completed`, `anomaly_deferred`, `anomaly_revisited`, `anomaly_abandoned_after_start`, `anomaly_completed` (CANDIDATE) |
| Candidate derived variables     | `start_without_sustain_count`, `voluntary_return_flag` (CANDIDATE; supplementary process evidence only — no Q20 score may be designed)                                                            |
| Pilot status                    | Questionnaire-primary                                                                                                                                                                             |
| Scientific-claim boundary       | Start-without-sustain pattern only, with stable utility — never obsession/interest loss                                                                                                           |

### Q21 — continues when difficult (PDD-01, positive)

| Field                           | Value                                                                                                                                      |
| ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| Evidence strength               | Strong analogue                                                                                                                            |
| Module/room                     | REP standardised difficulty sequence                                                                                                       |
| Standardised opportunity        | Clear setback; support available; adaptation/continuation/leaving/blind repetition all open                                                |
| Player-visible situation        | The repair fights back; support exists; the player chooses how to respond                                                                  |
| Actions/choices                 | Use diagnostic/manual; revise; continue; leave; return; complete                                                                           |
| Process variables               | Continued engagement; support use; revised action                                                                                          |
| Outcome variables               | Completion; abandonment; blind repetition                                                                                                  |
| Opportunity/accessibility flags | Difficulty standardised, solvable after support                                                                                            |
| Contamination risks             | Raw retries never rewarded                                                                                                                 |
| Overlapping items               | Q14/Q24 primary, Q22/Q23/Q25 supporting on REP                                                                                             |
| Double-counting warning         | REP shared sequence                                                                                                                        |
| Current status                  | ALIGNED                                                                                                                                    |
| Required implementation         | None                                                                                                                                       |
| Approved raw events             | `repair_failed`, `repair_manual_used`, `repair_strategy_revision`, `repair_returned_after_failure`, `repair_completed`, `repair_abandoned` |
| Candidate raw events            | `repair_reengaged` (CANDIDATE — currently implicit in return event)                                                                        |
| Candidate derived variables     | `game_difficulty_persistence` (approved, exact), `failure_recovery_score` (approved target, missing)                                       |
| Pilot status                    | Include                                                                                                                                    |
| Scientific-claim boundary       | Productive continuation in one controlled difficulty episode                                                                               |

### Q22 — works through difficult information (PDD-03, positive)

| Field                           | Value                                                                                                                                              |
| ------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| Evidence strength               | Strong analogue with reading controls                                                                                                              |
| Module/room                     | ARC feedback / REP manual                                                                                                                          |
| Standardised opportunity        | Concise necessary task information after failure; applying it must be observable                                                                   |
| Player-visible situation        | The manual/log actually contains the fix, if worked through                                                                                        |
| Actions/choices                 | Open; navigate relevant section; request simpler explanation; close unused; apply; repeat unchanged                                                |
| Process variables               | Support opened; relevant section viewed; information applied (next action reflects it)                                                             |
| Outcome variables               | Strategy changed vs unchanged retry                                                                                                                |
| Opportunity/accessibility flags | Text concise; clarification allowed; language/reading controls                                                                                     |
| Contamination risks             | Reading comprehension, language proficiency                                                                                                        |
| Overlapping items               | ARC/REP shared                                                                                                                                     |
| Double-counting warning         | Use-only-counts-with-subsequent-change is a D2 scoring nuance                                                                                      |
| Current status                  | ALIGNED — use + revision events live; applied-info linkage not yet derived                                                                         |
| Required implementation         | None at raw level; applied-use derivation = D2-family                                                                                              |
| Approved raw events             | `archive_feedback_used`, `archive_log_compared`, `repair_manual_opened`, `manual_page_reviewed`, `repair_manual_used`                              |
| Candidate raw events            | `support_available`, `clarification_requested`, `support_applied`, `unchanged_retry` (CANDIDATE — generic forms)                                   |
| Candidate derived variables     | `manual_or_feedback_used` (approved, exact), `applied_information_flag`, `strategy_revision_count` (approved; prudence-mixing fix = D2 sub-item 1) |
| Pilot status                    | Include                                                                                                                                            |
| Scientific-claim boundary       | Working through and applying task-relevant information                                                                                             |

### Q23 — keeps trying, adaptively (PDD-05, positive)

| Field                           | Value                                                                                                                        |
| ------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| Evidence strength               | Strong analogue                                                                                                              |
| Module/room                     | ARC + REP failure sequences                                                                                                  |
| Standardised opportunity        | Retry possible with revised method, identical repeat, or stop                                                                |
| Player-visible situation        | After a miss, try differently, try the same, or walk away                                                                    |
| Actions/choices                 | Revise; seek support; retry productively; repeat unchanged; defer; abandon; complete                                         |
| Process variables               | Adaptive retry count; unique strategies; support-informed attempts                                                           |
| Outcome variables               | Completion; identical retries                                                                                                |
| Opportunity/accessibility flags | Guessed novelty ≠ revision — require feedback/support evidence or meaningful change                                          |
| Contamination risks             | Lucky guesses as pseudo-revision                                                                                             |
| Overlapping items               | Q26 (identical repetition — opposite valence, separate variable)                                                             |
| Double-counting warning         | Adaptive trying (positive) and identical repetition (maladaptive) must never share a variable                                |
| Current status                  | ALIGNED — repeat-detection live in both rooms                                                                                |
| Required implementation         | `adaptive_retry_count` derivation = D2-family                                                                                |
| Approved raw events             | `archive_strategy_revision`, `repair_strategy_revision`, `archive_same_wrong_code_repeated`, `repair_same_sequence_repeated` |
| Candidate raw events            | `adaptive_retry`, `identical_retry` (CANDIDATE — generic forms)                                                              |
| Candidate derived variables     | `adaptive_retry_count` (approved target, missing), `blind_retry_count` (approved, exact)                                     |
| Pilot status                    | Include                                                                                                                      |
| Scientific-claim boundary       | Adaptation vs rigidity across valid difficulty episodes                                                                      |

### Q24 — recovers after setback (PDD-04, positive)

| Field                           | Value                                                                                               |
| ------------------------------- | --------------------------------------------------------------------------------------------------- |
| Evidence strength               | Strong analogue                                                                                     |
| Module/room                     | REP independent replication of Q13's ARC episode                                                    |
| Standardised opportunity        | Setback + attainable recovery route                                                                 |
| Player-visible situation        | The failed repair can still be brought home                                                         |
| Actions/choices                 | Use support; revise; return after brief departure; complete; abandon                                |
| Process variables               | Re-engagement after setback; time to re-engage (supporting)                                         |
| Outcome variables               | Completion after setback; abandonment                                                               |
| Opportunity/accessibility flags | Same REP standardisation                                                                            |
| Contamination risks             | Conceptual redundancy with Q13 — cross-task convergence, never double counting                      |
| Overlapping items               | Q13 (ARC twin), Q25                                                                                 |
| Double-counting warning         | Q13/Q24 are shared-evidence twins across two tasks                                                  |
| Current status                  | ALIGNED — abandon/return pair live; construct label pending D4                                      |
| Required implementation         | None; D4 rules `construct_id` for the abandon/return family                                         |
| Approved raw events             | `repair_abandoned`, `repair_returned_after_failure`, `repair_completed`, `repair_strategy_revision` |
| Candidate raw events            | `repair_setback`, `repair_completed_after_failure` (CANDIDATE — currently derivable from order)     |
| Candidate derived variables     | `post_setback_completion_score`, `setback_reengagement_rate` (CANDIDATE)                            |
| Pilot status                    | Include                                                                                             |
| Scientific-claim boundary       | Cross-task convergence with Q13, not an independent observation                                     |

### Q25 — sticks with difficult task (PDD-02, positive)

| Field                           | Value                                                                                                                                                   |
| ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Evidence strength               | Moderate analogue                                                                                                                                       |
| Module/room                     | ARC/REP with leave-and-return; closure checked at Final Core                                                                                            |
| Standardised opportunity        | After explicit difficulty: remain, leave temporarily, formally defer, return, or never return                                                           |
| Player-visible situation        | The unresolved station stays open and revisitable; other rooms remain accessible in the meantime                                                        |
| Actions/choices                 | Continue; use support; formally defer; explore elsewhere; return; abandon                                                                               |
| Process variables               | Engagement after difficulty; deferment; re-engagement                                                                                                   |
| Outcome variables               | Unresolved non-return; eventual completion                                                                                                              |
| Opportunity/accessibility flags | Leaving can be exploration — only no-return with unresolved objective is abandonment                                                                    |
| Contamination risks             | Exploration misread as abandonment                                                                                                                      |
| Overlapping items               | Q13/Q24 (return family), Q15                                                                                                                            |
| Double-counting warning         | Return events registered Q24/Q25 — shared, not doubled                                                                                                  |
| Current status                  | PARTIAL — leave/return observable; formal-deferment option absent in ARC/REP                                                                            |
| Required implementation         | Formal defer option in ARC/REP would need a task-design pass + candidate event approval (`task_deferred` family)                                        |
| Approved raw events             | `archive_abandoned`, `archive_returned_after_failure`, `repair_abandoned`, `repair_returned_after_failure`                                              |
| Candidate raw events            | `difficulty_onset`, `station_left_after_failure`, `task_deferred`, `station_reengaged`, `task_unresolved_at_end` (CANDIDATE)                            |
| Candidate derived variables     | `reengagement_after_failure`, `abandonment_after_failure_count` (approved target, narrower legacy exists), `difficult_task_completion_rate` (CANDIDATE) |
| Pilot status                    | Include (moderate process indicator)                                                                                                                    |
| Scientific-claim boundary       | Strategic pause-and-return counts as sticking; no continuous-stay requirement                                                                           |

### Q26 — repeats identical failed action (Inappropriate persistence, IP-02, maladaptive-positive)

| Field                           | Value                                                                                                                                                 |
| ------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| Evidence strength               | Strong maladaptive analogue                                                                                                                           |
| Module/room                     | STOP condition 1 — ARC/REP after explicit feedback                                                                                                    |
| Standardised opportunity        | Same failed input remains selectable after the system explains the failure                                                                            |
| Player-visible situation        | The exact same code/sequence can be re-run despite the explanation                                                                                    |
| Actions/choices                 | Change strategy; use support; repeat identical failed action in a new cycle                                                                           |
| Process variables               | Identical failed-response cycles; feedback ignored                                                                                                    |
| Outcome variables               | Repetition count after repeated failure                                                                                                               |
| Opportunity/accessibility flags | Debounce mandatory — accidental double presses excluded (input-spam spec guards this)                                                                 |
| Contamination risks             | Input bounce; misunderstanding                                                                                                                        |
| Overlapping items               | Q23 (opposite valence), Q27/Q28 (distinct STOP conditions — never merged)                                                                             |
| Double-counting warning         | Higher = worse, always; never shares a variable with adaptive persistence                                                                             |
| Current status                  | ALIGNED                                                                                                                                               |
| Required implementation         | None                                                                                                                                                  |
| Approved raw events             | `archive_same_wrong_code_repeated`, `repair_same_sequence_repeated`                                                                                   |
| Candidate raw events            | `failed_action_identified`, `feedback_shown` (CANDIDATE generic forms; ARC has `archive_feedback_shown` approved)                                     |
| Candidate derived variables     | `blind_retry_count` (approved, exact), `identical_failure_cycle_count`, `game_inappropriate_persistence` (approved, formula 4th term = D2 sub-item 2) |
| Pilot status                    | Include                                                                                                                                               |
| Scientific-claim boundary       | Rigid repetition despite evidence; maladaptive direction fixed                                                                                        |

### Q27 — continues past zero utility (Inappropriate persistence, IP-01, maladaptive-positive)

| Field                           | Value                                                                                                                                                                 |
| ------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Evidence strength               | Moderate-strong maladaptive analogue (approved rationale)                                                                                                             |
| Module/room                     | STOP condition 2 — utility-stop stage in an optional diagnostic/repair arc (**module does not exist**)                                                                |
| Standardised opportunity        | After useful cycles, system explicitly reports no additional operational benefit; stopping, inspecting rationale, switching, or continuing are all open and free      |
| Player-visible situation        | The diagnostic says further cycles change nothing; the player may keep running them anyway                                                                            |
| Actions/choices                 | Stop; acknowledge; inspect rationale; switch to useful task; continue no-benefit cycles                                                                               |
| Process variables               | Acknowledgement; rationale inspection; switch to useful action                                                                                                        |
| Outcome variables               | Excess cycles after zero-utility signal                                                                                                                               |
| Opportunity/accessibility flags | Signal must be credible, unambiguous, and state no new information/benefit will result                                                                                |
| Contamination risks             | Curiosity — minimised by explicit no-new-information statement                                                                                                        |
| Overlapping items               | Q26/Q28 (distinct STOP conditions); current Hazard tags are the SA-1 conflict                                                                                         |
| Double-counting warning         | Hazard recklessness is NOT the Q27 analogue (closed decision); current tags produce prudence-contaminated Q27 data                                                    |
| Current status                  | STALE — live tags follow superseded rationale; approved module absent                                                                                                 |
| Required implementation         | BLOCKED: SA-2 (module + canonical events + scoring feed) and SA-1 (displaced Hazard tags + `game_inappropriate_persistence` term)                                     |
| Approved raw events             | none for the approved analogue (Hazard tags live but superseded-as-rationale)                                                                                         |
| Candidate raw events            | `utility_stop_signal`, `no_additional_benefit_explained`, `unnecessary_cycle_started`, `unnecessary_cycle_completed`, `task_stopped_appropriately` (CANDIDATE — SA-2) |
| Candidate derived variables     | `excess_continuation_count`, `no_point_persistence_flag` (CANDIDATE — SA-2)                                                                                           |
| Pilot status                    | Exclude game analogue until SA-1/SA-2; declare current Q27 game data invalid under approved rationale                                                                 |
| Scientific-claim boundary       | Continuation only after an explicit, understood utility-stop signal                                                                                                   |

### Q28 — forces known-futile action (Inappropriate persistence, IP-03, maladaptive-positive)

| Field                           | Value                                                                                                                                            |
| ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| Evidence strength               | Strong maladaptive analogue                                                                                                                      |
| Module/room                     | STOP condition 3 — Final Core blocker (or repair prerequisite)                                                                                   |
| Standardised opportunity        | Interface states the action cannot work until a named prerequisite is fixed; valid resolution path available                                     |
| Player-visible situation        | The sync is blocked for a stated reason with a fix available; forcing it is still possible                                                       |
| Actions/choices                 | Resolve prerequisite; seek clarification; switch strategy; stop; force repeated attempts                                                         |
| Process variables               | Blocker seen; comprehension/acknowledgement (currently not captured — secondary); alternatives used                                              |
| Outcome variables               | Force attempts; blocker resolved                                                                                                                 |
| Opportunity/accessibility flags | Scoring valid only after blocker exposure is evidenced; comprehension evidence is the known secondary gap                                        |
| Contamination risks             | Unread/misunderstood blocker cannot support Q28                                                                                                  |
| Overlapping items               | Q11 (responsibility outcome vs forcing act), Q26/Q27                                                                                             |
| Double-counting warning         | Three STOP conditions stay distinct                                                                                                              |
| Current status                  | ALIGNED — blocker display + force option + resolve path live                                                                                     |
| Required implementation         | `final_core_force_continue` 4th term into `game_inappropriate_persistence` = D2 sub-item 2; optional `blocker_acknowledged` capture is CANDIDATE |
| Approved raw events             | `final_core_blocker_shown`, `final_core_force_continue`, `issue_resolution_attempted`, `final_core_issue_resolved`                               |
| Candidate raw events            | `blocker_acknowledged`, `prerequisite_available`, `strategy_changed`, `blocker_resolved` (CANDIDATE)                                             |
| Candidate derived variables     | `known_worthless_attempt_count`, `blocker_ignored_count` (CANDIDATE); `game_inappropriate_persistence` (approved, D2 term)                       |
| Pilot status                    | Include                                                                                                                                          |
| Scientific-claim boundary       | Forcing with evidenced knowledge + feasible alternative                                                                                          |

### Q29 — longer-horizon goal preference (Goal-time, GTP-01, exploratory)

| Field                           | Value                                                                                                                                                                                                                                                                                 |
| ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Evidence strength               | Moderate exploratory analogue                                                                                                                                                                                                                                                         |
| Module/room                     | HOR — balanced goal-horizon choice (Engineer Kai or planning terminal); **module does not exist**                                                                                                                                                                                     |
| Standardised opportunity        | Two equally credible objectives: self-contained-now vs distributed-with-late-closure, matched on effort/value/difficulty/risk/attractiveness/social approval; options never labelled short/long-term; initial choice logged before any interruption; ideally repeated counterbalanced |
| Player-visible situation        | Two worthwhile work orders; one wraps up immediately, one spreads across the visit with its payoff near the core sync                                                                                                                                                                 |
| Actions/choices                 | Inspect details; choose immediate; choose distributed; request clarification                                                                                                                                                                                                          |
| Process variables               | Detail inspection; consistency across opportunities                                                                                                                                                                                                                                   |
| Outcome variables               | Initial horizon choice (preference); later return/completion kept separate as follow-through                                                                                                                                                                                          |
| Opportunity/accessibility flags | Balance documentation is itself a validity requirement (spec §9 goal-horizon balance check)                                                                                                                                                                                           |
| Contamination risks             | Virtue-loading of the distributed option; order effects (counterbalance)                                                                                                                                                                                                              |
| Overlapping items               | Q31 (SAME dimension), Q32 (weak derived), Q33 (portfolio input)                                                                                                                                                                                                                       |
| Double-counting warning         | **One choice never counts for Q29 and Q31 independently** (closed decision); MASTER_33's separate Q29/Q31 variables must not be built                                                                                                                                                 |
| Current status                  | STALE — live tags ride superseded stabiliser/delayed-benefit rationale                                                                                                                                                                                                                |
| Required implementation         | BLOCKED: SA-3 (module, canonical events, ONE shared variable, disposition of live tags)                                                                                                                                                                                               |
| Approved raw events             | none for the approved module (`stabiliser_option_offered`/`stabiliser_accepted`/`final_core_stability_bonus` carry live Q29 tags pending SA-3)                                                                                                                                        |
| Candidate raw events            | `horizon_choice_offered`, `option_details_viewed`, `immediate_goal_selected`, `distributed_goal_selected`, `distributed_goal_revisited`, `distributed_goal_completed` (CANDIDATE — SA-3)                                                                                              |
| Candidate derived variables     | `goal_horizon_preference` (single shared variable), `distributed_goal_choice_rate` (CANDIDATE — SA-3)                                                                                                                                                                                 |
| Pilot status                    | Exploratory; exclude game analogue until SA-3                                                                                                                                                                                                                                         |
| Scientific-claim boundary       | Session-scale horizon preference proxy; never literal long-term goal orientation                                                                                                                                                                                                      |

### Q30 — small-goal granularity preference (Goal-time, GTP-03, exploratory)

| Field                           | Value                                                                                                                                                                                                        |
| ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Evidence strength               | Moderate if repeated (≥2 opportunities); otherwise questionnaire-primary                                                                                                                                     |
| Module/room                     | GRA — goal-structure choice at Quartermaster terminal + one later natural opportunity; **module does not exist**                                                                                             |
| Standardised opportunity        | Same readiness requirement structured as (A) several independently closable work orders or (B) one integrated audit; actions/benefit/difficulty approximately equal; choice recorded before outcome feedback |
| Player-visible situation        | The same prep work can be taken as a stack of small orders or one combined job                                                                                                                               |
| Actions/choices                 | Choose small set; choose integrated; inspect components; restructure before starting if permitted                                                                                                            |
| Process variables               | Structure changes; component inspection                                                                                                                                                                      |
| Outcome variables               | Small vs integrated selections across valid opportunities; completions per structure                                                                                                                         |
| Opportunity/accessibility flags | ≥2 valid opportunities preferred before deriving any pattern                                                                                                                                                 |
| Contamination risks             | Subgoal-decomposition can reflect good planning; options must be genuinely different goal structures, not layouts                                                                                            |
| Overlapping items               | Q33 (portfolio input); Q01/Q02 (same room — keep granularity choice distinct from organisation accuracy)                                                                                                     |
| Double-counting warning         | **Never inferred from carelessness, skipped preparation or Hazard behaviour** (closed decision) — the live verification-skip tags are exactly that prohibited inference                                      |
| Current status                  | STALE — prohibited inference live on two registrations                                                                                                                                                       |
| Required implementation         | BLOCKED: SA-4 (tag removal/retention + module + events + variable)                                                                                                                                           |
| Approved raw events             | none for the approved module (`inventory_verification_skipped`/`inventory_verified_complete` carry live Q30 tags pending SA-4)                                                                               |
| Candidate raw events            | `goal_structure_choice_offered`, `small_goal_set_selected`, `integrated_goal_selected`, `small_goal_completed`, `integrated_goal_completed` (CANDIDATE — SA-4)                                               |
| Candidate derived variables     | `small_goal_choice_rate`, `goal_granularity_preference` (CANDIDATE — SA-4)                                                                                                                                   |
| Pilot status                    | Exploratory; exclude game analogue until SA-4                                                                                                                                                                |
| Scientific-claim boundary       | Goal-size structuring preference in-session; never shortcut/carelessness                                                                                                                                     |

### Q31 — shorter-horizon goal preference (Goal-time, GTP-04, exploratory)

| Field                           | Value                                                                                |
| ------------------------------- | ------------------------------------------------------------------------------------ |
| Evidence strength               | Moderate exploratory; **shared dimension with Q29**                                  |
| Module/room                     | HOR — the same balanced module as Q29                                                |
| Standardised opportunity        | As Q29; the immediate option carries no risk, recklessness or quality sacrifice      |
| Player-visible situation        | As Q29                                                                               |
| Actions/choices                 | Select immediate or distributed after reviewing concrete consequences                |
| Process variables               | Consistency across opportunities                                                     |
| Outcome variables               | Immediate-choice rate (the same single shared variable, opposite pole)               |
| Opportunity/accessibility flags | Order/framing counterbalanced                                                        |
| Contamination risks             | Current Hazard-based tags embed exactly the risk/quality confound the spec prohibits |
| Overlapping items               | Q29 (same dimension), Q33                                                            |
| Double-counting warning         | ONE shared variable; one binary choice can never make two item scores                |
| Current status                  | STALE — Q31 exists only on Hazard events (superseded)                                |
| Required implementation         | BLOCKED: SA-3 (same single unit as Q29)                                              |
| Approved raw events             | none for the approved module                                                         |
| Candidate raw events            | shared with Q29 (CANDIDATE — SA-3)                                                   |
| Candidate derived variables     | `goal_horizon_preference` (shared), `immediate_goal_choice_rate` (CANDIDATE — SA-3)  |
| Pilot status                    | Exploratory; exclude until SA-3                                                      |
| Scientific-claim boundary       | Opposite pole of the one shared horizon dimension                                    |

### Q32 — extended-goal engagement (Goal-time, GTP-02, long-term-oriented; NOT reverse-scored)

| Field                           | Value                                                                                                                                                            |
| ------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Evidence strength               | Very weak proxy; **questionnaire-primary; no distinct validated game score** (closed decision)                                                                   |
| Module/room                     | Derived across HOR opportunities + the multi-room distributed objective — no module of its own                                                                   |
| Standardised opportunity        | Whole session; ≥2 valid horizon-related opportunities required                                                                                                   |
| Player-visible situation        | None dedicated — evidence arises from choosing/sustaining/completing distributed objectives                                                                      |
| Actions/choices                 | Select distributed goals; complete stages; return after interruption; leave extended goals incomplete                                                            |
| Process variables               | Stage sustainment; return after interruption                                                                                                                     |
| Outcome variables               | Extended-goal selection and completion pattern                                                                                                                   |
| Opportunity/accessibility flags | Depends entirely on SA-3 module existing                                                                                                                         |
| Contamination risks             | Severe time-horizon mismatch (minutes ≠ years); overlap with diligence/persistence                                                                               |
| Overlapping items               | Q29/Q31 (source opportunities), Q07/Q16                                                                                                                          |
| Double-counting warning         | Derived from the same self-selected opportunities — never an independent observation                                                                             |
| Current status                  | BLOCKED — raw tags (`side_repair_completed`, `final_bonus_unlocked`) pending SA-5 confirmation; no score exists (correct); no reverse-keying anywhere (verified) |
| Required implementation         | SA-5 tag confirmation only; `optional_future_benefit_score` must NOT be implemented as a Q32 score                                                               |
| Approved raw events             | `side_repair_completed`, `final_bonus_unlocked` (live weak-proxy tags, SA-5-pending)                                                                             |
| Candidate raw events            | `distributed_stage_completed`, `distributed_goal_unresolved` (CANDIDATE — SA-3 family)                                                                           |
| Candidate derived variables     | `extended_goal_engagement_proxy`, `extended_goal_completion_rate` (CANDIDATE; only if ever authorised)                                                           |
| Pilot status                    | Questionnaire-primary; tags pending-confirmation telemetry                                                                                                       |
| Scientific-claim boundary       | Willingness to engage a longer distributed objective in-session; never "years", never "most goals"                                                               |

### Q33 — short-goal completion portfolio (Goal-time, GTP-05, exploratory)

| Field                           | Value                                                                                                                                                     |
| ------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Evidence strength               | Weak proxy; **questionnaire-primary** (closed decision)                                                                                                   |
| Module/room                     | End-of-session portfolio derived from self-selected HOR/GRA choices — no module of its own                                                                |
| Standardised opportunity        | Computed at session end using only genuine self-selected opportunities; required short tasks excluded                                                     |
| Player-visible situation        | None dedicated — no Final Core rush choice may be used                                                                                                    |
| Actions/choices                 | Arise inside HOR/GRA modules                                                                                                                              |
| Process variables               | —                                                                                                                                                         |
| Outcome variables               | Completion share by horizon/granularity over self-selected goals                                                                                          |
| Opportunity/accessibility flags | Valid-opportunity count must be recorded with the portfolio                                                                                               |
| Contamination risks             | Minutes are not days; overlap with Q30/Q31                                                                                                                |
| Overlapping items               | Q29/Q30/Q31 (portfolio inputs)                                                                                                                            |
| Double-counting warning         | **Never inferred from rushing, poor final quality or unresolved issues** (closed decision) — the three live Final Core tags are that prohibited inference |
| Current status                  | STALE — prohibited inference live on three registrations                                                                                                  |
| Required implementation         | BLOCKED: SA-6 (tag removal/retention + portfolio authorisation), itself behind SA-3/SA-4                                                                  |
| Approved raw events             | none for the approved treatment (`final_core_rushed`/`final_core_issue_resolved`/`final_core_completed` carry live Q33 tags pending SA-6)                 |
| Candidate raw events            | portfolio consumes SA-3/SA-4 family events (CANDIDATE)                                                                                                    |
| Candidate derived variables     | `short_goal_completion_share`, `self_selected_goal_portfolio` (CANDIDATE — SA-6)                                                                          |
| Pilot status                    | Questionnaire-primary; exclude game analogue until SA-6                                                                                                   |
| Scientific-claim boundary       | Exploratory portfolio over self-selected goals only                                                                                                       |

## 2. Cross-matrix warnings (apply to every consumer of this file)

1. One event sequence never becomes several independent item observations
   (ARC ×6, REP ×6, INT ×4, OPT ×3(+stale ×5), HOR ×2(+Q32), GRA ×2).
2. Adaptive and inappropriate persistence never share a variable; higher
   inappropriate persistence is always worse.
3. No global "good player"/personality score, ever.
4. Raw duration is never effort or persistence.
5. Q18/Q20/Q32/Q33 stay questionnaire-primary; every Goal-Time and
   Consistency-of-Interest variable carries an exploratory/weak-proxy label
   wherever surfaced (mechanism = SA-7/D2 sub-item 4).
6. Dock/tutorial and Hub data are controls, never personality.
7. `scenario_*` events are a separate unmapped exploratory layer — never
   Q01-Q33 evidence (see blueprint §6).
8. No-opportunity / technical-interruption / comprehension-failure coding
   rules are OPEN (spec §8.2) — implement nothing that hard-codes them.
