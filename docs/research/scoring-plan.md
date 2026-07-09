# scoring-plan.md

Canonical scoring contract for Remote Outpost Assessment, per V3 Section 6, plus
a reconciliation table against the current `src/systems/ScoringManager.ts`
(`GameSummaryVariables`) output.

**Canonical decision**: V3's required subindices are the target. Current
`ScoringManager` output is a legacy/current variable set from the MPS
vertical-slice prototype, kept as an alias set to migrate from — it is not
extended to become the permanent schema as-is.

## 1. What `ScoringManager` must produce (V3 Section 6)

1. Raw event export (already satisfied — see `event-schema.md` §3).
2. Room-level summaries.
3. Construct-level subindices (organisation, productiveness, responsibility,
   prudence/carefulness, adaptive persistence, inappropriate persistence).
4. Optional/exploratory proxies (Goal-Time, Grit-S Consistency of Interest),
   clearly labelled as such in the output shape, not just in comments.
5. Qualtrics summary variables (already partially satisfied via
   `QualtricsBridge.buildReturnUrl()`).

## 2. Canonical required subindices (V3 Section 6) vs. current output

| Canonical subindex                 | Current `GameSummaryVariables` field | Status                          | Notes                                                                                                                                                                                                                                                                                                                                                                                                                    |
| ---------------------------------- | ------------------------------------ | ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------ | ------ | ------------------------------------------------------------------------------------------------------------------------------------ |
| `organisation_checklist_use`       | `organization_checklist_used`        | rename                          | Current is boolean; canonical implies a use-count/flag — confirm shape when Inventory room is rebuilt.                                                                                                                                                                                                                                                                                                                   |
| `organisation_accuracy_score`      | —                                    | missing                         | Closest current proxies: `organization_systematic_count`, `organization_disorganized_count` (raw counts, not a composed accuracy score).                                                                                                                                                                                                                                                                                 |
| `organisation_error_count`         | `organization_disorganized_count`    | partial rename                  |                                                                                                                                                                                                                                                                                                                                                                                                                          |
| `cleanup_failure_count`            | —                                    | missing                         | `organization_cleanup_count` counts cleanup _actions taken_, not cleanup _failures_ — not the same signal, do not conflate.                                                                                                                                                                                                                                                                                              |
| `productiveness_action_ratio`      | —                                    | missing                         |                                                                                                                                                                                                                                                                                                                                                                                                                          |
| `task_initiation_latency`          | —                                    | missing                         | No latency capture exists anywhere in the current systems (not `DataQualityTracker`, not `EventLogger`).                                                                                                                                                                                                                                                                                                                 |
| `required_completion_rate`         | —                                    | missing                         | Current only has `objective_completed` (boolean, Archive+Repair only), not a rate across required rooms.                                                                                                                                                                                                                                                                                                                 |
| `productiveness_completion_score`  | —                                    | missing                         |                                                                                                                                                                                                                                                                                                                                                                                                                          |
| `responsibility_report_count`      | `responsibility_report_count`        | **exact**                       |                                                                                                                                                                                                                                                                                                                                                                                                                          |
| `prepared_report_flag`             | `responsibility_prepared_report`     | rename                          |                                                                                                                                                                                                                                                                                                                                                                                                                          |
| `report_accuracy_score`            | —                                    | missing                         |                                                                                                                                                                                                                                                                                                                                                                                                                          |
| `commitment_followthrough_rate`    | —                                    | missing                         | Depends on Engineer Hub's accepted-duty mechanic, which is unimplemented (see `event-schema.md`).                                                                                                                                                                                                                                                                                                                        |
| `accepted_duty_unresolved_count`   | —                                    | missing                         | Same dependency.                                                                                                                                                                                                                                                                                                                                                                                                         |
| `prudence_check_rate`              | —                                    | missing                         | `hazard_info_checked` currently folds into the legacy `strategy_revision_count` composite instead of standing alone.                                                                                                                                                                                                                                                                                                     |
| `reckless_shortcut_count`          | —                                    | missing                         | `hazard_reckless_continue` currently folds into the legacy `blind_retry_count` composite instead of standing alone.                                                                                                                                                                                                                                                                                                      |
| `game_difficulty_persistence`      | `game_difficulty_persistence`        | **exact**                       | Formula matches contract intent (Archive+Repair feedback/manual/revision/completion).                                                                                                                                                                                                                                                                                                                                    |
| `failure_recovery_score`           | —                                    | missing                         |                                                                                                                                                                                                                                                                                                                                                                                                                          |
| `adaptive_persistence_count`       | —                                    | missing                         | Closest current proxy is `strategy_revision_count`, but its formula mixes Archive+Repair strategy revision with `hazard_info_checked`, which is a prudence signal, not a persistence signal — **this is a construct-mixing risk to fix**, not just a naming gap.                                                                                                                                                         |
| `blind_retry_count`                | `blind_retry_count`                  | **exact**                       |                                                                                                                                                                                                                                                                                                                                                                                                                          |
| `game_inappropriate_persistence`   | `game_inappropriate_persistence`     | **exact name**, partial formula | Canonical formula (V3 Section 6) = `archive_same_wrong_code_repeated + repair_same_sequence_repeated + hazard_reckless_continue + final_core_force_continue`. Current formula = `blindRetryCount` = the same three terms **minus** `final_core_force_continue`, because that event doesn't exist yet (see `event-schema.md` Final Core table). Once that event is implemented, this formula needs the fourth term added. |
| `abandonment_after_failure_count`  | `abandonment_count`                  | rename, narrower                | Current formula = `hazard_avoidance` only. Canonical concept spans `archive_abandoned`, `repair_abandoned`, and similar — those events don't exist yet in any room.                                                                                                                                                                                                                                                      |
| `return_to_task_rate`              | `consistency_return_to_task_count`   | partial                         | Current is a raw count, not a rate; also Interruption Corridor's return-to-task mechanic itself needs event rework (see `event-schema.md`).                                                                                                                                                                                                                                                                              |
| `goal_switch_without_return_count` | —                                    | missing                         |                                                                                                                                                                                                                                                                                                                                                                                                                          |
| `optional_future_benefit_score`    | —                                    | missing                         | Closest current proxies: `productiveness_completed_optional_task` (boolean), `productiveness_persistent_completion_count`.                                                                                                                                                                                                                                                                                               |
| `delayed_benefit_investment`       | —                                    | missing                         |                                                                                                                                                                                                                                                                                                                                                                                                                          |
| `final_quality_score`              | `final_core_completion_quality`      | different shape                 | Current is categorical (`'low'                                                                                                                                                                                                                                                                                                                                                                                           | 'structured' | 'high' | 'none'`); canonical implies a score. Decide during Final Core rebuild whether to keep categorical + add a numeric score, or convert. |

## 3. Composite examples (V3 Section 6) vs. current

**`failure_adaptation_index`** —
Canonical: `strategy_revision_count + support_use_after_failure + completion_after_failure - blind_retry_count - unresolved_abandonment`.
Current (`ScoringManager.ts`): `strategyRevisionCount + Number(manualOrFeedbackUsed) + archive_completed + repair_completed + hazard_informed_continue - blindRetryCount - abandonmentCount`.
Status: **conceptually aligned**, term-for-term close but not identical (uses raw
completion event counts instead of a single `completion_after_failure` term, and
folds `hazard_informed_continue` in as a positive term not named in the
canonical formula). Acceptable as a working approximation; revisit exact terms
when Archive/Repair/Hazard events are migrated to canonical names.

**`game_inappropriate_persistence`** — see table row above; missing the
`final_core_force_continue` term because that event isn't implemented yet.

## 4. Adaptive vs. inappropriate persistence separation

**Confirmed**: current `ScoringManager` output keeps `game_difficulty_persistence`
/ `game_uncertainty_persistence` (adaptive-leaning) separate from
`game_inappropriate_persistence` / `blind_retry_count` (maladaptive) as distinct
fields — no code path in `computeSummary()` merges them into one variable, and
`game_persistence_total` (a composite, not a required V3 subindex) subtracts
`gameInappropriatePersistence` rather than adding it, preserving the
opposite-valence relationship (V3 Section 1, rule 6).

**Watch item**: `strategy_revision_count`'s current formula
(`archive_strategy_revision + repair_strategy_revision + hazard_info_checked`)
mixes a persistence-revision signal (Archive/Repair) with a prudence-checking
signal (Hazard). This doesn't merge adaptive and inappropriate persistence
(both terms are "positive" behaviours), but it does mix two different
_constructs_ (adaptive persistence vs. prudence/carefulness) into one variable,
which weakens construct-level separation required by V3 Section 1 rule 4. Flag
for `research-data-reviewer` when Hazard Control or the scoring layer is next
touched — likely fix is splitting `hazard_info_checked` out into its own
`prudence_check_rate` contribution instead of folding it into
`strategy_revision_count`.

## 5. `DataQualityTracker` export plan

`DataQualityTracker` currently captures `focus_loss_count`, `focus_loss_seconds`,
and `technical_error_count` via `getMetrics()`, but **`ScoringManager.
computeSummary()` never reads from it** — these covariates are captured and then
dropped before reaching `GameSummaryVariables` or the Qualtrics return payload.

Plan: extend `ComputeSummaryInput` to accept the `DataQualityMetrics` object (or
have `ResearchRuntime.getSummary()` pass `dataQualityTracker.getMetrics()`
through), and add corresponding fields to `GameSummaryVariables` (proposed names:
`data_quality_focus_loss_count`, `data_quality_focus_loss_seconds`,
`data_quality_technical_error_count`) so these are available as covariates in
both the debug summary and the Qualtrics return preview. This is implementation
work for a later beat (likely Beat 13, "Full ScoringManager subindices") — no
`src/` changes are made in this beat.

## 6. Qualtrics summary variable plan

- `QualtricsBridge.buildReturnUrl()` already appends every key of
  `GameSummaryVariables` as a query parameter onto `return_url`, without
  touching the raw event log — this satisfies V3 Section 3.4's "prepare/preview
  summary variables without overwriting raw logs" requirement structurally.
- As canonical subindices are added (per §2 above), they flow into the Qualtrics
  return automatically since the bridge serializes the whole summary object —
  no separate Qualtrics-specific mapping step is needed, provided
  `GameSummaryVariables` itself stays free of a collapsed global score (§7).
- Exploratory/weak-proxy fields (§8) must still be included in the Qualtrics
  return (researchers need the data), but their field names should carry a
  recognizable suffix/prefix (e.g. `_exploratory` or `_proxy`) so downstream
  analysts don't treat them as validated measures by default.
- `qualtrics_return_previewed` (a canonical Final Core event, currently missing
  per `event-schema.md`) should log when `buildReturnUrl()` is invoked via the
  debug/completion path, so the preview action itself is auditable in the raw
  log.

## 7. No global "good player" score

**Confirmed**: neither the canonical subindex list (§2) nor the current
`GameSummaryVariables` shape contains a single combined personality or
"good player" score. `game_persistence_total` is a _persistence-family_
composite (difficulty + uncertainty + max(failure_adaptation_index, 0) -
inappropriate persistence), not a cross-construct global score — it never
combines organisation, responsibility, or productiveness signals with
persistence. This distinction must be preserved: any future composite must stay
scoped to one construct family, never spanning "everything" into one number.
Forbidden per V3 Section 6, restated here as a hard rule for all future scoring
work:

- No one global personality score.
- No one global "good player" score.
- No one mixed persistence score combining adaptive and inappropriate
  persistence.
- No unqualified Goal-Time score (see §8).

## 8. Exploratory / weak-proxy labelling rules

Every variable derived from these construct groups must carry an explicit
exploratory/weak-proxy label wherever it is surfaced (debug summary, Qualtrics
return, any future researcher-facing export) — not just in this document:

- **Goal-Time Preference** (Q29-Q33): `delayed_benefit_investment`,
  `optional_future_benefit_score`, `final_stability_gain`, and any related
  variable. Label: "Goal-Time proxy — exploratory, short-game analogue, not a
  validated multi-year goal-orientation measure."
- **Grit-S Consistency of Interest** (Q17-Q20): `longitudinal_focus_proxy`,
  `goal_switch_without_return_count`, and any related variable. Label:
  "Consistency-of-Interest proxy — weak/exploratory, scores return-to-task and
  unresolved non-return only, cannot reproduce long-horizon interest stability."

Recommended implementation: once these fields are added to
`GameSummaryVariables`, either (a) suffix the TypeScript field names themselves
(e.g. `goal_time_delayed_benefit_investment_exploratory`), or (b) ship a
parallel `exploratoryProxyLabels: Record<string, string>` map alongside the
summary object that `QualtricsBridge`/debug output always includes. Decide which
approach during Beat 13; both are acceptable, silence is not.

## 9. Raw-vs-derived design note (carried from event-schema.md)

Several current event names assert an interpretation at log time rather than a
raw behaviour (`interruption_focus_lost`, `interruption_focus_maintained`,
`interruption_possible_rigidity`, `engineer_responsibility_adaptive`,
`engineer_responsibility_shortcut`, `side_repair_low_effort`,
`side_repair_productive_persistence`). Per the `qualtrics-logging-review` skill's
raw-vs-summary separation rule, prefer computing these labels in
`ScoringManager` from underlying raw events, rather than logging the
interpretation directly as an `event_type`. This keeps the raw log strictly
behavioural and keeps all interpretive/scoring logic in one auditable place.
Flagged here for whichever beat next touches Interruption Corridor or Engineer
Hub scoring; no `src/` changes are made in this beat.
