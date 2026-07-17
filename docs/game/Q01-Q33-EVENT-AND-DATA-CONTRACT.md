# Q01-Q33 Event and Data Contract (blueprint view)

Documentation only; base `bfca741`. This file organises the event/data
surface by class and states the blueprint-level rules. It approves
nothing: `docs/research/event-schema.md` remains the ONLY source of
approved event names/payloads and `docs/research/scoring-plan.md` the ONLY
source of approved formulas. Every name marked CANDIDATE requires a
research-owner event-schema decision; every derived variable not marked
"approved" requires a scoring-plan decision. Final scoring weights are
explicitly NOT approved here.

## 1. Event classes

| Class                           | Definition                                                                                                                              | `study_item_ids` / `construct_id`   | ScoringManager                                 | Examples                                                                        |
| ------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------- | ---------------------------------------------- | ------------------------------------------------------------------------------- |
| Research events                 | Behavioural events registered in `CanonicalEventContext` with Q mapping                                                                 | populated                           | May feed approved subindices                   | `archive_strategy_revision`, `workspace_left_disordered`                        |
| Raw exploratory scenario events | Pilot ethics layer (the scenario _system_ is classified ENGAGEMENT_ONLY_UNSCORED in the admission matrix; its _events_ form this class) | empty / unset (by governance)       | NEVER referenced                               | `scenario_decision_committed`, `final_core_blocked_pending_decisions`           |
| General gameplay events         | Connected-world events in assessment rooms with no construct claim                                                                      | empty                               | Never                                          | unmapped room-entry events (e.g. `engineer_hub_entered`, `hazard_room_entered`) |
| Control/usability events        | Dock and Hub covariate surface (event-schema.md labels ALL `station_hub_*` events this class)                                           | empty (control label)               | Control fields only (`control_*`)              | `tutorial_completed`, `control_error_count`, `station_hub_entered`              |
| Technical errors                | Global error boundary → DataQualityTracker                                                                                              | n/a (covariate metrics, not events) | `data_quality_technical_error_count` covariate | window.onerror capture (no content logged)                                      |
| Data-quality events/metrics     | Focus loss etc.                                                                                                                         | n/a                                 | `data_quality_*` covariates                    | focus-loss metrics                                                              |

Class rules:

1. A name lives in exactly one class; classes never migrate silently
   (scenario→research promotion = research-owner ruling).
2. Research events not yet mechanically emittable stay schema-listed with
   status `missing` — never emitted speculatively.
3. Derived-style interpretations are computed in ScoringManager, never
   logged as raw events (S-10 cleanup per room rebuild).
4. Technical/comprehension/no-opportunity states must remain separable
   from behavioural non-performance; the coding rules themselves are OPEN
   (spec §8.2) and are implemented only after approval.

## 2. Per-event contract fields

For every event, the authoritative row (event-schema.md §4 tables, plus
this blueprint's contracts for target modules) must state: stable name;
module (`room_id`/`task_id`); Q mapping or non-scored class; trigger;
payload specifics (`choice_value`, `attempt_number`, `previous_state`/
`new_state`, `success`, `metadata` keys); duplication rule (one-shot per
session, per entry, per selection, or debounced-cycle); opportunity-flag
dependency (which availability/shown event must precede it); sequence
dependency (what must precede it for valid interpretation, e.g.
failure→feedback→revision order); derived-variable consumers; versioning
context. New rows enter event-schema.md only via research-owner decision.

Duplication rules currently in force (unchanged): one-shot session guards
(`side_repair_discovered`, `objective_active`, system flags at Final Core
entry); per-entry events (`*_entered`); per-selection decision events
(hazard repeats logged per selection with last-write status); debounce for
identical-repetition cycles (ADV-7 pins one decision set per key hammer).

## 3. Payload and versioning

Canonical payload = event-schema.md §1 (V3 §3.2), unchanged. Standing
gaps, all decision-gated, restated as blueprint requirements for Stage 3:

| Requirement                           | Status                                                                                                           | Gate                         |
| ------------------------------------- | ---------------------------------------------------------------------------------------------------------------- | ---------------------------- |
| Preserve event order                  | Array order today; **no sequence numbers**                                                                       | P1-9 — event-schema decision |
| Event uniqueness/IDs                  | Absent                                                                                                           | same schema decision         |
| `game_version`                        | Present                                                                                                          | —                            |
| Event-schema version field            | Absent                                                                                                           | schema decision (Stage 3)    |
| Scoring version field                 | Absent                                                                                                           | D2 codebook scope            |
| `asset_set_version` in payloads       | Console banner + test-mode export envelope (`ResearchExportPayload.asset_set_version`); per-event payloads: none | INT-6                        |
| Technical-error separation            | Wired (`326da2e`), count-only, no content                                                                        | done                         |
| No-opportunity state coding           | Undefined                                                                                                        | spec §8.2 — research owner   |
| Durable persistence/recovery          | Absent                                                                                                           | P0-3/INT-2                   |
| Production completion→return          | Absent                                                                                                           | INT-1 (+INT-3/INT-4)         |
| Raw-event export channel (production) | Test-only Supabase path exists                                                                                   | INT-2/INT-5                  |
| Completion-status taxonomy            | Taxonomy absent; the `launch_mode=test` export gate itself exists and is enforced                                | INT-5                        |

## 4. Opportunity flags (blueprint rule)

Every measurement module logs, at minimum: module entry, station/prompt
opened, and task availability — so analysts can compute per-item
opportunity exposure (`was the opportunity presented and functionally
accessible?`) before interpreting choice/process/outcome variables. The
traceability matrix lists per-item opportunity conditions. Where an
availability event is missing today (e.g. cleanup opportunity on the
shortcut path; correction opportunity in Inventory), the gap is recorded
there and its event is a CANDIDATE — not silently added.

## 5. Scoring architecture — separate candidate subindices only

Authority: scoring-plan.md (approved targets and current state). This
section only organises the target shape; NO new formula, weight or
composite is approved here, and no global score may ever exist.

| Subindex (separate, never merged)            | Contributing Q items            | Eligible modules                                                | Candidate variables (status)                                                                                                                                                                           | Exclusions                                                                  | Direction / notes                                                                                                            |
| -------------------------------------------- | ------------------------------- | --------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| Organisation                                 | Q01-Q04                         | Inventory (+retrieval episode; Final Core flags)                | `organisation_checklist_use`, `organisation_accuracy_score`, `organisation_error_count`, `cleanup_failure_count` (approved targets, partly missing)                                                    | First mistakes before correction; shortcut-credit; Q30 tags (SA-4)          | Higher = more organised; Q02/Q04 reverse-keyed at item level only on the questionnaire side — game variables stay raw counts |
| Productiveness                               | Q05-Q08                         | Repair, Archive, Final Core, duties                             | `required_completion_rate`, `productiveness_completion_score`, `task_initiation_latency`, `productiveness_action_ratio` (targets, missing; Q05 blocked D7)                                             | Raw speed; single delays                                                    | Completion+process, never speed alone                                                                                        |
| Responsibility/dependability                 | Q09-Q11                         | Engineer Hub, Final Core                                        | `responsibility_report_count` (approved), `prepared_report_flag`, `report_accuracy_score`, `commitment_followthrough_rate`, `accepted_duty_unresolved_count` (targets)                                 | Declined duties; separate from persistence by rule                          | Higher = more dependable                                                                                                     |
| Prudence/carefulness                         | Q12 (Hazard principal)          | Hazard Control                                                  | `prudence_check_rate`, `reckless_shortcut_count` (targets, missing; currently folded into other composites — D2 sub-item 1 split)                                                                      | Q27/Q31 readings of hazard acts (SA-1/SA-3)                                 | Higher check-rate = more prudent                                                                                             |
| Adaptive persistence                         | Q13-Q16, Q21-Q25                | ARC, REP, INT return, OPT                                       | `game_difficulty_persistence` (approved), `failure_recovery_score`, `adaptive_persistence_count`, `return_to_task_rate` (targets)                                                                      | Blind retries; raw duration; prudence signals (split per D2)                | Higher = better; NEVER merged with inappropriate persistence                                                                 |
| Inappropriate persistence                    | Q26-Q28 (Q27 pending SA-1/SA-2) | ARC/REP repeats, utility-stop module (future), Final Core force | `blind_retry_count`, `game_inappropriate_persistence` (approved; 4th term = D2), `excess_continuation_count` (CANDIDATE, SA-2)                                                                         | Adaptive signals; hazard prudence acts (SA-1)                               | **Maladaptive: higher = worse, always**                                                                                      |
| Goal-time preference (optional, exploratory) | Q29-Q33                         | HOR/GRA modules (future), OPT weak tags                         | `goal_horizon_preference` (ONE shared Q29/Q31 variable), `goal_granularity_preference`, portfolio (`short_goal_completion_share`) — ALL CANDIDATES behind SA-3/SA-4/SA-6; Q32 has no score by decision | Required short tasks; rush/carelessness inferences; double-counting Q29/Q31 | Exploratory labels mandatory wherever surfaced (SA-7 mechanism)                                                              |

Double-counting safeguards (binding): shared modules produce shared
evidence (matrix §2); one Q29/Q31 choice = one observation; Q32/Q33 derive
from the same self-selected opportunities; ARC/REP sequences count once
per construct level. No-opportunity handling: subindices must carry (or be
accompanied by) valid-opportunity counts once the §8.2 coding rules are
approved — otherwise absence of behaviour is uninterpretable.

Exploratory labelling (scoring-plan §8, mechanism = SA-7/D2-4): every
Goal-Time and Consistency-of-Interest variable carries an explicit
exploratory/weak-proxy label in every surfaced output (debug summary,
Qualtrics return, exports).

## 6. Pilot-telemetry annexe (unmapped)

`scenario_*` event set + `final_core_blocked_pending_decisions` as listed
in `docs/game/PILOT-FOUR-SCENARIO-ROUTE.md`: raw exploratory class,
governance unchanged. Promotion path: research-owner ruling via
`docs/ai/SCIENTIFIC-AUTHORITY-AND-OPEN-DECISIONS.md`.
