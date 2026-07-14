# D2 / Beat-13 Scoring Decision Pack

Bounded, evidence-grounded **pre-implementation** decision package for the
Beat-13 scoring beat (V3 §10) and the user-owned **D2** ruling that gates _any_
deployment. This document reconstructs the current scoring architecture and
decision history, decomposes D2, and prepares ruling options. **It adopts no
scientific decision and invents no formula, weight, mapping, or task semantic.**
Where the repository evidence is insufficient to recommend a scientifically
defensible option, that is stated plainly and the minimum additional researcher
input is named.

- **Repository checkpoint**: branch `fable-autonomous-game-build-v1`, HEAD
  `24afcad`, clean tree.
- **Scientific authority sources**: `docs/ai/fable-claude-final-game-build-contract-v3.txt`
  §1 (non-negotiable scientific position), §4 (per-room constructs), §5 (Q01–Q33
  coverage matrix), §6 (scoring contract), §10 Beat 13; `docs/research/MASTER_33_ALIGNMENT.md`;
  `docs/research/scoring-plan.md`; `docs/research/RESEARCH-TRACEABILITY-MATRIX.md`
  (+ the machine-validated `research-traceability-matrix.json`);
  `docs/expansion/reviews/WAVE1-USER-DECISION-BRIEF.md` §D2; `WAVE1-REVIEW-GATE.md`
  (finding RD-1). Implementation ground truth: `src/systems/ScoringManager.ts`,
  `src/world/CanonicalEventContext.ts`, `src/scenes/FinalCoreScene.ts`.
- **Integration sibling**: `docs/decisions/QUALTRICS-INTEGRATION-DECISION-PACK.md`
  (INT-2 transports the scores this pack defines; reproducibility is a joint gate).

---

## 1. Scientific authority hierarchy (do not override)

1. **V3 §1 non-negotiable scientific position** + §6 scoring contract — the game is
   a _behavioural analogue layer_, not a questionnaire replacement; subindices stay
   **separate**; **no global score**; **adaptive and inappropriate persistence never
   merge**; Goal-Time and Consistency-of-Interest are **exploratory/weak proxies**.
2. **V3 §5 Q01–Q33 coverage matrix** + `MASTER_33_ALIGNMENT.md` — item→construct→
   event→variable mappings (where the two conflict, the conflict is a **user
   decision**, e.g. D7 — never silently resolved).
3. **Committed canonical registrations** — `CanonicalEventContext.ts`
   (`study_item_ids` / `construct_id` / `success`), validated against the matrix by
   `scripts/validate-traceability-matrix.mjs`.
4. **User rulings on record** — D1 (Hazard, 2026-07-12, Option A).
5. **Scoring-plan reconciliation** (`scoring-plan.md`) — _descriptive_; several rows
   are **stale** (§4 below) and must not be treated as authoritative where they
   contradict the live tree.
6. **This pack** — options only; adopts nothing.

**Scientific invariants held constant by this pack (never modified, reinterpreted,
or invented):** Q01–Q33 mappings; `study_item_ids`; `construct_id`; scoring
formulas; scoring weights; reverse-scoring; task semantics; option wording/ordering;
stimuli; condition mappings; event semantics; hazard scientific consequences.

**Known Hazard ruling (held verbatim):** canonical event `hazard_route_avoided`,
`study_item_ids: []`, **no** construct, **no** scoring contribution
`[FACT: CanonicalEventContext.ts:233, D1 brief §A]`. Legacy `hazard_avoidance`
stays emitted verbatim and legacy `abandonment_count` continues to derive from it
`[FACT: ScoringManager.ts:88]`. These semantics are **not merged or normalised**.

---

## 2. Current scoring architecture (reconstructed from source)

`[FACT]` `ScoringManager.computeSummary()` (`ScoringManager.ts:75-224`) is a **pure,
non-destructive derivation**: it reads `metadata`, `elapsed_seconds`, `completed`, a
read-only `events` slice, and `data_quality`, and returns a **59-field**
`GameSummaryVariables` object (`ScoringManager.ts:5-65`). It **counts event types**
(`countEventTypes` `:226-370`) and composes counts/booleans/one categorical. **No
path mutates or discards the raw event log** — the primary data-integrity invariant
holds (audit §5, contract §11). `data_quality_*` covariates now flow through
`ComputeSummaryInput` (`:151-162`, wired from `ResearchRuntime.getSummary` `:113`).

**Current derived families (as implemented):** persistence
(`game_persistence_total`, `game_difficulty_persistence`,
`game_uncertainty_persistence`, `game_inappropriate_persistence`,
`failure_adaptation_index`, `blind_retry_count`, `strategy_revision_count`,
`abandonment_count`), responsibility, organization, productiveness, consistency
(exploratory), control (Dock covariates), final-core. `[FACT]` No single global /
"good player" score exists; `game_persistence_total` **subtracts**
`game_inappropriate_persistence`, preserving opposite valence (scoring-plan §7,
V3 §1 rule 6).

---

## 3. Authoritative scoring elements (already ruled / committed)

| Element                                                                                            | Authority                                     | Status                                                                                                                                                                                                                              |
| -------------------------------------------------------------------------------------------------- | --------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Q01–Q33 → construct → room mappings                                                                | V3 §5, MASTER_33                              | **authoritative**                                                                                                                                                                                                                   |
| `study_item_ids` / `construct_id` per canonical event                                              | `CanonicalEventContext.ts` (matrix-validated) | **authoritative**                                                                                                                                                                                                                   |
| Required subindex **names** (26 targets)                                                           | V3 §6 lines 1004–1030                         | **authoritative (as targets)**                                                                                                                                                                                                      |
| `game_inappropriate_persistence` **4-term** formula                                                | V3 §6 lines 1040–1044                         | **authoritative intent** (impl missing 4th term — §5)                                                                                                                                                                               |
| `failure_adaptation_index` composite _example_                                                     | V3 §6 lines 1033–1038                         | **authoritative as example**; exact terms flagged divergent (§6)                                                                                                                                                                    |
| No global score / no merged persistence / exploratory labels required                              | V3 §1, §6; scoring-plan §7/§8                 | **authoritative**                                                                                                                                                                                                                   |
| D1 Hazard: `hazard_route_avoided` []/no-construct/no-score; `abandonment_count`=`hazard_avoidance` | D1 ruling (brief §A)                          | **authoritative**                                                                                                                                                                                                                   |
| Q24/Q25 abandon-return `construct_id` **unset** (F1 precedent)                                     | brief §D4 (deferred)                          | **authoritative-as-unset**, D4 open                                                                                                                                                                                                 |
| Reverse-scored items                                                                               | —                                             | **Not in scope of game scoring**: reverse-scoring lives on the Qualtrics self-report side; the game logs behaviour, no reverse-keying is applied or documented in `ScoringManager`. `[FACT: no reverse logic in ScoringManager.ts]` |

**Authoritative task identifiers / study_item_ids / construct_ids** are enumerated
in `RESEARCH-TRACEABILITY-MATRIX.md` §2 (Q01–Q33 table) and the machine JSON; this
pack does not restate or alter them.

---

## 4. Documented contradictions between authoritative documents (must be flagged)

These are **stale-doc vs live-tree** conflicts. The live tree + matrix win; the
stale rows must not drive a ruling.

1. **`scoring-plan.md:66`** states the `game_inappropriate_persistence` 4th term is
   missing _"because that event isn't implemented yet."_ **STALE.** `[FACT]`
   `final_core_force_continue` **is** emitted (`FinalCoreScene.ts:270`) and
   **registered** with `study_item_ids: ['Q28'], construct_id:
'inappropriate_persistence'` (`CanonicalEventContext.ts:477-480`). The correct
   statement (audit §7 P0-4, matrix, review-gate RD-1): the event is **emitted +
   logged raw but summed into NO summary variable** — it is absent from
   `ScoringManager.countEventTypes` (`:226-369`). The D2 sub-item is a **scoring
   wiring** decision, not an event-implementation one.
2. **`scoring-plan.md §5`** ("`DataQualityTracker` … captured and then dropped") is
   **STALE** — the three `data_quality_*` fields now flow through
   `ComputeSummaryInput` `[FACT: ScoringManager.ts:151-162; matrix §6.6]`.
3. **`event-schema.md §4` Archive table** marks six events "missing" that
   `ArchiveScene` emits (matrix §6.4) — stale status rows, no code defect.
4. **`task_started` listing**: V3 §5 (Q05+Q15) vs `MASTER_33_ALIGNMENT.md` (Q05
   only) — **D7**, unresolved; the event stays unregistered/unemitted.
5. **`MASTER_33` Q10 "unimplemented" note** predates Wave 1A; the duty mechanic and
   all eight rooms are implemented (matrix §6.5).

_These are reported, not corrected — correcting the docs is out of scope for this
decision pack and several are entangled with open D-decisions._

---

## 5. Beat-13 evidence and the four D2 sub-items

`[FACT]` **Beat 13** (V3 §10 line 1180) = _"Full ScoringManager subindices"_ — the
supervised scoring beat. `ScoringManager`/`QualtricsBridge` are **zero-diff since
Beat 13 was deferred** (brief §D2.3). The **user-flagged D2 sub-items** on record
(brief §D2.1; matrix §7; review-gate RD-1):

1. **`strategy_revision_count` prudence-mixing.** `[FACT: ScoringManager.ts:84-87]`
   current formula = `archive_strategy_revision + repair_strategy_revision +
hazard_info_checked`. `hazard_info_checked` is a **prudence** signal (Q12/Q27),
   not adaptive persistence — folding it in **mixes two constructs** in one variable,
   weakening the construct separation required by V3 §1 rule 4 (scoring-plan §4).
2. **`game_inappropriate_persistence` 4th term.** `[FACT: ScoringManager.ts:80-83,102]`
   current = `blindRetryCount` = `archive_same_wrong_code_repeated +
repair_same_sequence_repeated + hazard_reckless_continue` — **missing**
   `final_core_force_continue`, which V3 §6 lines 1040–1044 lists as the 4th term.
   The event is emitted+registered (§4.1); only the count wiring is absent.
3. **`final_quality_score` shape.** `[FACT: ScoringManager.ts:64,372-388]` current =
   categorical `'low' | 'structured' | 'high' | 'none'` (`final_core_completion_quality`).
   V3 §6 line 1030 lists `final_quality_score` implying a **score**. **No numeric
   mapping/weights are documented anywhere.**
4. **Exploratory-label mechanism.** `[FACT: scoring-plan.md:144-164]` two documented
   options: **(a)** `_exploratory` suffix on surfaced field names, or **(b)** a
   parallel `exploratoryProxyLabels: Record<string,string>` map shipped alongside
   the summary. Currently Goal-Time (Q29–Q33) and Consistency-of-Interest (Q17–Q20)
   proxies are **not** labelled `_exploratory` in the surfaced output.

**Also in D2 scope per the machine matrix** (`research-traceability-matrix.json`
`decisions.D2`; matrix §7): the **inventory naming split** (canonical vs legacy
option-3 names for `organization_kit_verified` / `organization_cleanup_count`;
matrix §6.7), and **three unemitted scoring-layer events**
(`final_quality_score_computed`, `final_summary_previewed`,
`qualtrics_return_previewed`), plus the **scoring-version stamp** (stimulus-freeze
item 4).

**Force-continue registration held constant** `[FACT: CanonicalEventContext.ts:477]`:
`final_core_force_continue → Q28 / inappropriate_persistence` — **higher = worse**
(maladaptive). Any wiring must add it to the maladaptive family only, never to an
adaptive/mixed variable.

---

## 6. Implementations that exceed / diverge from scientific authority; contracts without implementation

**Implementation exceeding or diverging from stated authority (needs a ruling to
retain, revise, or formally accept):**

- `strategy_revision_count` **construct-mixing** (§5.1) — divergence from V3 §1 rule 4. `[unresolved — required before deployment]`
- `failure_adaptation_index` current terms (`ScoringManager.ts:103-110`) **fold
  `hazard_informed_continue` as a positive term not named** in the V3 §6 example and
  use raw completion counts instead of a single `completion_after_failure` term
  (scoring-plan §3). `[technically implied but not scientifically authorised]`
- `game_persistence_total` is a composite **not in the V3 §6 required list** (an
  extra family composite); scoring-plan §7 accepts it as _family-scoped_, but it is
  implemented beyond the explicit contract. `[technically implied; within the
family-composite permission — confirm retention]`

**Contract without implementation (V3 §6 required subindices absent from
`GameSummaryVariables`):** `organisation_accuracy_score`, `cleanup_failure_count`,
`productiveness_action_ratio`, `task_initiation_latency` (**no latency capture
exists anywhere** — scoring-plan §2), `required_completion_rate`,
`productiveness_completion_score`, `report_accuracy_score`,
`commitment_followthrough_rate`, `prudence_check_rate`, `reckless_shortcut_count`,
`failure_recovery_score`, `adaptive_persistence_count`,
`abandonment_after_failure_count` (canonical, spanning archive/repair — current
`abandonment_count` is hazard-only), `return_to_task_rate` (as a rate),
`goal_switch_without_return_count`, `optional_future_benefit_score`,
`delayed_benefit_investment` (scoring-plan §2). Several depend on **unbuilt
mechanics or uncaptured signals** — they **cannot** be computed without new
task-design + capture, and computing them now would require **inventing** formulas
(forbidden).

---

## 7. D2 decision decomposition (classification of every candidate ruling)

Legend: **[A]** already authoritative · **[TI]** technically implied, not
scientifically authorised · **[UR]** unresolved, **required** before deployment ·
**[UD]** unresolved but deferrable · **[NA]** not applicable.

| #   | Candidate D2 ruling                                                                                                     | Class                                                                                                                              | Basis                                            |
| --- | ----------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------ |
| 1   | Does Beat 13 contribute to scoring / what is it                                                                         | **[A]** it _is_ the scoring beat; **[UR]** its **scope**                                                                           | V3 §10 Beat 13                                   |
| 2   | What Beat 13 represents                                                                                                 | **[A]** full ScoringManager subindices pass                                                                                        | V3 §10                                           |
| 3   | Item/construct relationship of new variables                                                                            | **[A]** mappings fixed (V3 §5); **[UR]** which land this beat                                                                      | §3                                               |
| 4   | Raw-only vs derived score per variable                                                                                  | **[UR]** per the ruled scope                                                                                                       | §6                                               |
| 5   | `strategy_revision_count` prudence-mixing fix                                                                           | **[UR]** required                                                                                                                  | §5.1, RD-flag                                    |
| 6   | `game_inappropriate_persistence` 4th term (add `final_core_force_continue`)                                             | **[UR]** required (RD-1, single review-gate major)                                                                                 | §5.2, V3 §6                                      |
| 7   | `final_quality_score` shape                                                                                             | **[UR]** required — **evidence insufficient to recommend**                                                                         | §5.3                                             |
| 8   | Exploratory-label mechanism (a suffix / b map)                                                                          | **[UR]** required (silence forbidden)                                                                                              | §5.4                                             |
| 9   | Inventory naming split                                                                                                  | **[UR]** required                                                                                                                  | matrix §6.7                                      |
| 10  | Three scoring-layer emissions (`final_quality_score_computed`, `final_summary_previewed`, `qualtrics_return_previewed`) | **[UR]** required (auditability of the preview action)                                                                             | scoring-plan §6, V3 §4 Room 8 events             |
| 11  | Scoring-version stamp (name + where surfaced)                                                                           | **[UR]** required (stimulus-freeze item 4; reproducibility)                                                                        | §6, freeze checklist                             |
| 12  | First-response vs final-response treatment                                                                              | **[UR]** required — **not documented anywhere**; current = count _all_ occurrences                                                 | `ScoringManager.countEvents` `:390-392`          |
| 13  | Repeated-decision treatment (dedupe vs count)                                                                           | **[UR]** required — current counts each occurrence (e.g. repeated hazard/final-core prompts)                                       | §12; ADV-4 froze last-write _state_, not scoring |
| 14  | Incomplete-session scoring (score/export a non-terminal session?)                                                       | **[UR]** required — ties to INT-5 `session_status` + INT-2                                                                         | INT-5 §5                                         |
| 15  | Missing-item handling                                                                                                   | **[UR if rates land / UD otherwise]** — only matters for rate/denominator variables not yet built                                  | §6                                               |
| 16  | Minimum answered-item rule                                                                                              | **[UD]** — single-session behavioural analogue, not item-response; likely N/A but researcher-owned                                 | V3 §1                                            |
| 17  | Denominator rules (for rates)                                                                                           | **[UR if rates land]** — `required_completion_rate`, `prudence_check_rate`, `return_to_task_rate` need denominators                | §6                                               |
| 18  | Partial-score rules                                                                                                     | **[UR if rates/composites land]**                                                                                                  | §6                                               |
| 19  | Composite-score permission                                                                                              | **[A]** family composites allowed, global forbidden (V3 §6); **[UR]** exact terms for divergent composites                         | §6, scoring-plan §7                              |
| 20  | Score rounding                                                                                                          | **[TI/UD]** — only matters once floats (rates) exist; counts are integer                                                           | §6                                               |
| 21  | Score range                                                                                                             | **[TI]** — derivable once formulas fixed; document per variable                                                                    | —                                                |
| 22  | Invalid-response handling                                                                                               | **[UR]** — define once mechanics/denominators ruled                                                                                | —                                                |
| 23  | Abandoned tasks contribute?                                                                                             | **[UR]** — `archive_abandoned`/`repair_abandoned` exist; `abandonment_after_failure_count` (canonical) not implemented; ties to D4 | §6, brief §D4                                    |
| 24  | Deferred tasks contribute?                                                                                              | **[UR]** — side-repair deferred/abandoned logged separately (confound named); whether scored                                       | psychometric skill check 8                       |
| 25  | Scoring-version naming                                                                                                  | **[UR]** = #11                                                                                                                     | §6                                               |
| 26  | Summary export fields                                                                                                   | **[UR]** — which of the 59 fields change/add under the ruled scope                                                                 | §2                                               |
| 27  | Reproducibility requirement                                                                                             | **[UR]** — joint with INT-2 (audit P0-2); required before deployment                                                               | INT-2                                            |

---

## 8. Scoring traceability matrix (raw event → … → exported field)

Representative chains; **where the chain breaks, it stops at the last authoritative
stage and labels the missing ruling.** Full per-event chains live in
`research-traceability-matrix.json`.

| Raw event                                | Option/task response             | Study item  | Construct                               | Transformation       | Aggregation                                                                  | Exported field                                            | Chain status                                                                                                                                   |
| ---------------------------------------- | -------------------------------- | ----------- | --------------------------------------- | -------------------- | ---------------------------------------------------------------------------- | --------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| `archive_same_wrong_code_repeated`       | repeat wrong code after feedback | Q26         | inappropriate_persistence (maladaptive) | count                | + repair-repeat + hazard-reckless                                            | `blind_retry_count` / `game_inappropriate_persistence`    | **complete** `[ScoringManager.ts:80-83,102]`                                                                                                   |
| `final_core_force_continue`              | force through blocker            | Q28         | inappropriate_persistence (maladaptive) | count                | _should_ + to `game_inappropriate_persistence`                               | `game_inappropriate_persistence`                          | **BREAKS at aggregation** — event registered `[CanonicalEventContext.ts:477]` but **absent from `countEventTypes`** → **D2 sub-item 6 (RD-1)** |
| `archive_strategy_revision`              | revise strategy after failure    | Q13/Q22/Q23 | adaptive_persistence                    | count                | + repair-revision (+ `hazard_info_checked` ⚠)                                | `strategy_revision_count`                                 | **complete but CONSTRUCT-MIXED** — `hazard_info_checked` is prudence → **D2 sub-item 5**                                                       |
| `hazard_info_checked`                    | check warning detail             | Q12/Q27     | prudence / (maladaptive pair)           | count                | folded into `strategy_revision_count` **and** `game_uncertainty_persistence` | `strategy_revision_count`, `game_uncertainty_persistence` | **complete but should stand alone** as `prudence_check_rate` (V3 §6) → **contract-without-impl**                                               |
| `hazard_route_avoided`                   | avoid uncertain route            | **[]**      | **none** (D1)                           | **none**             | **none**                                                                     | **none** (telemetry only)                                 | **terminal by ruling** — D1                                                                                                                    |
| `hazard_avoidance` (legacy)              | avoid route (legacy)             | —           | —                                       | count                | = `abandonment_count`                                                        | `abandonment_count`                                       | **complete (legacy, preserved)** `[:88]`                                                                                                       |
| `side_repair_abandoned_after_difficulty` | abandon optional repair          | Q16/Q20     | adaptive_persistence / CI-exploratory   | count                | —                                                                            | `productiveness_difficulty_abandonment_count`             | **complete raw**; whether it _scores_ a construct = **D2 #24**                                                                                 |
| Final Core quality events                | rushed / structured / high       | Q11/Q33     | responsibility / GT-exploratory         | first-match category | —                                                                            | `final_core_completion_quality` (categorical)             | **complete as categorical**; numeric `final_quality_score` = **D2 #7 (evidence insufficient)**                                                 |
| Goal-Time proxies (Q29–Q33)              | delayed-benefit choices          | Q29–Q33     | goal_time_exploratory                   | count/bool           | —                                                                            | various                                                   | **complete raw**; **missing `_exploratory` label** → **D2 #8**                                                                                 |
| CI proxies (Q17–Q20)                     | interruption/switch              | Q17–Q20     | consistency_of_interest_exploratory     | count                | —                                                                            | `consistency_*`                                           | **complete raw**; **missing `_exploratory` label** → **D2 #8**                                                                                 |
| initiation latency                       | (any)                            | Q05         | productiveness                          | —                    | —                                                                            | `task_initiation_latency`                                 | **BREAKS at raw** — **no latency capture exists** (scoring-plan §2); needs task-design + D7                                                    |

---

## 9. Scientifically defensible D2 option packages

Two **scope** packages (α vs β) frame the beat; then per-sub-item options where
evidence permits alternatives. **A recommendation is given only where evidence
supports one on validity grounds — never on ease of implementation.**

### 9.1 Scope package D2-α — Minimal remediation (RECOMMENDED for the deployment gate)

1. **Scope**: only the flagged defects + provenance — sub-items 5, 6, 8, 9, 10, 11
   (§5); wire `final_core_force_continue`; de-mix `strategy_revision_count`; label
   exploratory proxies; resolve the inventory naming split; emit the three
   scoring-layer events; stamp `scoring_version`. Leave the remaining current legacy
   variable set as a **documented working approximation**; do **not** attempt the
   full V3 §6 rate/latency migration.
2. **Affected items/events**: Q12/Q26/Q27/Q28 (persistence family), Q29–Q33 &
   Q17–Q20 (labels), inventory (Q01–Q04), Final Core preview events.
3. **Inclusion rule**: existing emitted events only; no new mechanics.
4. **Repeated-response rule**: **must be ruled** (§7 #12/#13) even in α — recommend
   documenting the current "count all occurrences" as the intended rule _or_ ruling a
   dedupe; α does not force a change but must make the rule explicit.
5. **Incomplete-session rule**: **must be ruled** (§7 #14) — recommend: compute the
   summary regardless (already does), tag `session_status` (INT-5) so analysts filter.
6. **Missing-data rule**: N/A for α (no rate variables added).
7. **Aggregation rule**: counts unchanged except the two persistence fixes.
8. **Expected score range**: `game_inappropriate_persistence` gains one non-negative
   term (range widens by the max force-continue count); `strategy_revision_count`
   _narrows_ (loses `hazard_info_checked`). Document both.
9. **Reproducibility**: every changed field recomputable from raw events (the events
   already exist) — satisfiable by the INT-2 raw export + a Unit-6 reproduction script.
10. **Scientific advantages**: fixes the two construct-integrity defects (RD-1 +
    mixing) and the exploratory-label gap — the highest-validity-return items — with
    **no invented formulas**.
11. **Scientific risks**: leaves many V3 §6 subindices unimplemented → the summary is
    an _approximation_ of the full contract; must be **documented as such** (not
    presented as the complete V3 §6 set).
12. **Data-analysis consequences**: analysts get corrected persistence variables +
    labelled proxies; absent subindices are known gaps, not silent.
13. **Implementation consequences**: bounded diff to `ScoringManager` (+
    `QualtricsBridge`/`ResearchRuntime` for emissions/labels); gated by
    `qualtrics-logging-review` + `research-data-reviewer` (mandatory re-review).
14. **Migration/versioning**: bump `scoring_version`; no already-collected data to
    migrate (none collected). Reversible pre-collection.
15. **Acceptance criteria**: `game_inappropriate_persistence` includes
    `final_core_force_continue`; `strategy_revision_count` excludes
    `hazard_info_checked`; exploratory proxies carry the chosen label; naming split
    resolved; three emissions present; `scoring_version` stamped and exported.
16. **Tests required**: §11.

### 9.2 Scope package D2-β — Full V3 §6 subindex migration (NOT recommended now)

1. **Scope**: implement _all_ 26 V3 §6 required subindices incl. rates
   (`required_completion_rate`, `prudence_check_rate`, `return_to_task_rate`),
   latency (`task_initiation_latency`), canonical `abandonment_after_failure_count`,
   and canonical renames.
   2–8. **Rules**: would require **new denominators, missing-data rules, partial-score
   rules, rounding** for every rate — **none of which are documented**, and
   **`task_initiation_latency` has no capture anywhere** (scoring-plan §2).
2. **Advantages**: full contract fidelity.
3. **Risks (decisive)**: β **cannot be completed without inventing formulas,
   denominators, and capture mechanics** — which V3 §1 and this task **forbid**. It
   also entangles D3 (idle), D4 (abandon construct), D7 (`task_started`/latency), and
   new task-design. Attempting β now trades a _known, labelled approximation_ for
   _invented science_.
4. **Implementation**: large, multi-room, new mechanics — not a single bounded beat.
5. **Acceptance**: not achievable at HEAD without prior task-design rulings.

> **Scope RECOMMENDATION — NOT YET AUTHORISED.** Prefer **D2-α**. The rationale is
> **scientific-integrity and feasibility, not ease**: β's missing rates/latency
> require capture that does not exist and formulas that are not documented, so β
> would force invented science; α fixes the two genuine construct-integrity defects
> (RD-1, prudence-mixing) and the labelling gap with zero invented formulas, and
> explicitly records the remaining V3 §6 subindices as a documented approximation
> deferred to post-pilot task-design.

### 9.3 Per-sub-item options and recommendations

**Sub-item 6 — `game_inappropriate_persistence` 4th term**

- **(6A)** Add `final_core_force_continue` to the count (V3 §6 canonical 4-term
  formula). **(6B)** Leave it out.
- **RECOMMENDATION — NOT YET AUTHORISED: 6A.** Directly authoritative (V3 §6 lines
  1040–1044); the event is registered as `Q28 / inappropriate_persistence`
  (maladaptive, higher=worse); lowest scientific risk; closes the single review-gate
  major (RD-1). 6B contradicts V3 §6.

**Sub-item 5 — `strategy_revision_count` prudence-mixing**

- **(5A)** Split `hazard_info_checked` **out** of `strategy_revision_count` (leaving
  `archive_strategy_revision + repair_strategy_revision`) and route the prudence
  signal to its own variable (V3 §6 `prudence_check_rate`, or an interim
  `prudence_check_count`). **(5B)** Leave mixed.
- **RECOMMENDATION — NOT YET AUTHORISED: 5A (as a de-mix into a count)**, deferring
  the _rate_ form of `prudence_check_rate` to β. Rationale: restores construct
  separation (V3 §1 rule 4) using only existing events; **new variable name requires
  approval**. 5B keeps a documented construct-mixing defect.

**Sub-item 7 — `final_quality_score` shape**

- **(7A)** Keep categorical + add a numeric score. **(7B)** Convert to numeric.
  **(7C)** Keep categorical only.
- **NO RECOMMENDATION — EVIDENCE INSUFFICIENT.** A numeric `final_quality_score`
  requires a **mapping/weighting the repository does not document** (what value each
  category, resolved-issue, force-continue, rush maps to). Recommending any numeric
  form would **invent a formula** — forbidden. **Minimum researcher input needed**:
  the numeric definition (category→value, whether it nets resolved vs unresolved
  issues, its range/valence) _or_ an explicit ruling to keep categorical only (7C)
  for the pilot.

**Sub-item 8 — exploratory-label mechanism**

- **(8A)** `_exploratory` suffix on surfaced field names. **(8B)** Parallel
  `exploratoryProxyLabels: Record<string,string>` map shipped with the summary.
- **RECOMMENDATION — NOT YET AUTHORISED: 8A**, low-confidence. Rationale: the label
  travels _with_ the variable into Qualtrics via the existing key-serialisation
  (`buildReturnUrl` appends every key), so downstream analysts cannot miss it; the
  Qualtrics codebook does **not exist yet** (contract §14), so renaming now costs no
  migration. Trade-off: 8A changes field names (touches specs); 8B is additive but
  requires the bridge/return to also carry the map. **Both are documented as
  acceptable (scoring-plan §8); silence is not.** Defer the final pick to the owner.

**Sub-items 9/10/11** — naming split, three emissions, `scoring_version` stamp:
mechanical once ruled; no scientific alternative beyond _do it_ vs _defer_ — all
**required before deployment** (reproducibility + auditability).

---

## 10. Research-validity risks

- **Silent construct-mixing** (`strategy_revision_count`) misattributes prudence to
  persistence → biased convergent/discriminant validity. Fixed by 5A.
- **Under-counting maladaptive persistence** (missing 4th term) → `Q28` force-through
  behaviour invisible in the summary → RD-1. Fixed by 6A.
- **Unlabelled exploratory proxies** → analysts may treat Goal-Time / CI variables as
  validated measures (V3 §1 forbids). Fixed by 8A/8B.
- **Inventing β formulas/latency** → fabricated instruments; the largest risk, and
  the reason β is not recommended.
- **Irreproducibility** → if raw events are not exported (INT-2), _no_ scoring
  version is reproducible regardless of α/β. **Joint gate with INT-2.**
- **Repeated-response ambiguity** (#12/#13) → if unruled, count semantics under
  re-entry are implicit; a downstream analyst cannot know if repeats inflate counts.

---

## 11. Required implementation tests (once a ruling is authorised)

- `e2e/final_core_summary.spec.ts` — assert `game_inappropriate_persistence`
  **includes** `final_core_force_continue` (6A); the event is already asserted
  present (`:72,80`) and absent on the no-blocker path (`:135`).
- `strategy_revision_count` no longer counts `hazard_info_checked` (5A); a prudence
  variable receives it.
- Exploratory proxies carry the chosen label (8A field-name assertion / 8B map key).
- Three scoring-layer emissions present at completion/preview.
- `scoring_version` present in summary + envelope.
- Repeated-decision spec: assert the ruled count semantics under re-entry.
- **Mandatory re-review**: `research-data-reviewer` + `qualtrics-logging-review`
  (CLAUDE.md; review-gate §7) before any "done".

## 12. Required dataset validation

- **Reproduction script (Unit 6)**: recompute every changed `GameSummaryVariables`
  field from an exported raw log and match production output byte-for-byte (audit
  P0-2). This is the operational definition of "reproducible."
- **Codebook 1:1**: every summary/exported field mapped to a codebook entry with its
  construct, valence, and **exploratory label** where applicable (contract §14).
- **Version stamp**: dataset records `scoring_version` + `game_version` +
  (INT-6) `asset_set_version`.

## 13. Minimum additional researcher input needed (where evidence is insufficient)

| Gap                                        | Needed input                                                                                                  |
| ------------------------------------------ | ------------------------------------------------------------------------------------------------------------- |
| `final_quality_score` numeric (sub-item 7) | the numeric definition (category→value, issue netting, range, valence) **or** ruling to keep categorical (7C) |
| Repeated/first/final-response (#12/#13)    | rule: count all vs first vs final vs deduped, per repeatable task                                             |
| Incomplete-session scoring (#14)           | rule: score+export non-terminal sessions? (with INT-5 tag)                                                    |
| Prudence variable name/shape (5A)          | approve `prudence_check_count` (interim) vs wait for `prudence_check_rate` (β)                                |
| Exploratory-label pick (8A vs 8B)          | choose one                                                                                                    |
| β subindices (rates/latency/abandonment)   | task-design + D3/D4/D7 first — out of scope for the deployment gate                                           |
| `scoring_version` string                   | the version identifier to stamp                                                                               |

---

## 14. Explicit non-adoption statement

**No D2 or Beat-13 decision has been adopted.** Every scope package, sub-item option,
and recommendation is marked **RECOMMENDATION ONLY — NOT YET AUTHORISED**. No
scientific invariant (Q01–Q33 mappings, `study_item_ids`, `construct_id`, formulas,
weights, reverse-scoring, task semantics, wording, stimuli, condition mappings, event
semantics, hazard consequences) has been modified, reinterpreted, or invented. No
source, test, scoring, or scientific-contract file has been changed. Binding rulings
are issued only via `docs/decisions/RESEARCH-OWNER-RULING-FORM.md`, followed by a
supervised implementation beat under mandatory `research-data-reviewer` +
`qualtrics-logging-review`. Implementation has **not** begun.
