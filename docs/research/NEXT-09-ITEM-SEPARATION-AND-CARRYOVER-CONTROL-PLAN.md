# NEXT-09 — Item Separation and Carryover Control Plan (Q01–Q33)

Status: DOCUMENTATION ONLY — audit + plan. Nothing here implements gameplay,
registers/retags an event, changes a formula, or approves a pending
item-specific ruling. Companion machine-readable register:
`docs/research/next-09-item-measurement-ownership.json`.

- Baseline: `f64d1ce` on `fable-autonomous-game-build-v1` (2026-07-29).
- Branch: `fable-next-09-global-measurement-ruling-v1` (worktree).
- Governing authority: the research-owner-approved **global scientific ruling
  on item separation, local independence and carryover control**, recorded
  verbatim in `docs/ai/SCIENTIFIC-AUTHORITY-AND-OPEN-DECISIONS.md` §13.1
  (referenced below as "ruling §N"). The behavioural translation is
  `docs/scientific/Q01-Q33_GAMIFIED_MEASUREMENT_SPECIFICATION.md` v0.2.
  Event names: `docs/research/event-schema.md`. Formulas:
  `docs/research/scoring-plan.md`. The NEXT-09 Phase 3 dossier
  (`docs/research/NEXT-09-PHASE-3-SCIENTIFIC-DECISION-DOSSIER.md`) is a
  historical decision-evidence record; its options and ruling texts are
  **pending revised rulings** under the new global authority.

## 1. Executive scientific finding

The connected-world design delivers ecological richness at the price of
systematic local dependence. Audited item by item at `f64d1ce`:

1. **No Q-item currently has a fully compliant primary measurement** under
   ruling §1 in the strict sense (declared opportunity id + exclusive event
   family + exclusive variable + standardised entry state + validity coding).
   Two items are _nearly_ compliant, needing only coding-rule declarations
   (Q01 and Q09 — `compliant_pending_coding_rules` in the register); six more
   are `partially_compliant` (Q02, Q04, Q08, Q10, Q12, Q26); the gaps for the
   rest are structural (see table §4).
2. **Cross-item event reuse is the norm, not the exception**: 18 of the 70
   registered canonical events with study-item tags carry more than one
   `study_item_ids` entry; every multi-tag is a ruling-§1 conflict if read as
   primary for more than one item (register: §8).
3. **The scoring layer is construct/legacy-composite only.** No item-level
   variable exists; the live composites (`game_persistence_total`,
   `failure_adaptation_index`, `strategy_revision_count`,
   `blind_retry_count`, …) mix constructs (prudence + persistence +
   goal-time) and read legacy event names. Under ruling §12 they can stand
   only as clearly-labelled legacy composites, never item measures (§9).
4. **Opportunity gating is the deepest carryover channel**: the corridor
   items (Q15/Q17/Q19) exist only after Q10's duty acceptance; Q03's only
   live opportunity requires prior Inventory behaviour (named by ruling §11);
   Q11/Q28's Final Core issue/blocker content is manufactured by earlier item
   outcomes (Q02/Q04/Q10/non-return). These violate ruling §4 as primary
   designs and need remedies or contamination coding (§10-§11).
5. **Six items have no compliant opportunity at all** (Q05 blocked on D7/D3;
   Q27/Q29/Q30/Q31 blocked on re-scoped SA rulings; Q33 derivable only via a
   not-authorised reuse), and four are questionnaire-primary by approved
   design (Q18, Q20, Q32, Q33).
6. **The remedy path is bounded**: single-ownership rulings for five shared
   streams (inventory close-out, side-repair arc, archive failure, repair
   difficulty, corridor), two entry-state standardisations (Final Core
   baseline issue; corridor de-gating), one independence remedy (Q03), the
   already-queued SA/D rulings, and export-layer separation. No item needs
   the connected world dismantled; ruling §5 explicitly preserves narrative
   continuity that does not alter measurement conditions.

## 2. Governing ruling

Verbatim text: `docs/ai/SCIENTIFIC-AUTHORITY-AND-OPEN-DECISIONS.md` §13.1
(sections 1–12: item-specific primary measurement; shared-construct exception
(Q29/Q31 only); within-item longitudinal state; cross-item carryover firewall;
narrative continuity; shared rooms/NPCs/mechanics; order/practice/contrast;
feedback/affective contamination; opportunity validity and contamination;
pilot validation; existing implementation; scoring separation). That record
is the binding authority for this plan; this plan adds no requirement beyond
it and waives none.

## 3. All-33-item ownership table

Primary opportunity/event/variable entries are **declarations required by
ruling §1**; every event/variable name remains a CANDIDATE pending
event-schema/scoring rulings. "(pending)" = requires a ruling before any
compliant primary exists. Full field-level detail per item: the JSON register.

| Item | Construct (direction)       | Primary opportunity (declared/required)                      | Primary event family                                                                   | Primary variable                             |
| ---- | --------------------------- | ------------------------------------------------------------ | -------------------------------------------------------------------------------------- | -------------------------------------------- |
| Q01  | Organisation (+)            | Inventory checklist-guided kit prep                          | Q01-exclusive checklist/placement/sequence acts (live, singly tagged)                  | checklist-guided preparation quality (cand.) |
| Q02  | Organisation (−)            | Errors left after close-out correction                       | misplacement-after-correction acts (verification-skip tag contested, SA-4)             | unresolved preventable-error count (cand.)   |
| Q03  | Organisation (+)            | **(pending SA-12)** independent standardised retrieval       | live Q03 events = gated episode, secondary only (ruling §11)                           | independent retrieval accuracy (cand.)       |
| Q04  | Organisation (−)            | Restore-vs-leave at close-out                                | Q04-exclusive cleanup acts (live)                                                      | cleanup completion/failure state (cand.)     |
| Q05  | Productiveness (−)          | **(pending D7/D3)** initiation window after confirmation act | objective-confirmation family (cand.)                                                  | task_initiation_latency (cand.)              |
| Q06  | Productiveness (+)          | Required-duty completion portfolio (OD-1 framing)            | **(pending)** duty-level completion acts — current completions are other items' events | required_completion_rate (cand.)             |
| Q07  | Productiveness (+)          | Accepted side-repair follow-through (ruling §3)              | **(pending split)** arc acts multi-tagged Q07/Q16/Q20/Q32                              | accepted_task_completion_rate (cand.)        |
| Q08  | Productiveness (−)          | ≥2 required-duty engagement/avoidance windows                | partial (task_avoidance) + (pending D3 + duty framing)                                 | productive_engagement_rate (cand.)           |
| Q09  | Responsibility (+)          | Kai report-back episode                                      | Q09-exclusive report acts (live; accuracy registration = SA-8)                         | report accuracy/preparedness (cand.)         |
| Q10  | Responsibility (+)          | Accepted duty follow-through (ruling §3)                     | Q10-exclusive duty lifecycle (live)                                                    | commitment_followthrough_rate (cand.)        |
| Q11  | Responsibility (−)          | Final Core review/resolve/force                              | mostly exclusive; `final_core_rushed` dual-tag (SA-6); **entry state noncompliant**    | preventable_unresolved_count (cand.)         |
| Q12  | Responsibility/prudence (−) | Hazard warning → informed/unchecked action                   | Q12 window owns hazard acts; Q27/Q31 tags contested (SA-1/SA-3)                        | prudence_check_rate (cand.)                  |
| Q13  | Grit-PE (+)                 | Archive failure → revision → completion                      | **(pending split)** archive stream multi-tagged Q13/Q22/Q26/Q06                        | post_failure_reengagement (cand.)            |
| Q14  | Grit-PE (+)                 | Repair useful-effort breadth                                 | **(pending split)** repair stream multi-tagged Q14/Q21/Q22/Q23/Q06                     | useful_effort_count (cand.)                  |
| Q15  | Grit-PE (+)                 | Return/completion after interruption (ruling §3)             | contested at SA-9 co-fire + `interruption_received` dual-tag; **gated on Q10**         | started_task_completion_rate (cand.)         |
| Q16  | Grit-PE (+)                 | **(pending)** own execution-accuracy window                  | none compliant (borrows Q07 arc / Q01-Q02 verification)                                | diligence_step_accuracy (cand.)              |
| Q17  | Grit-CI (−, expl.)          | Competing-task switch-without-return                         | contested (SA-9, D6, dual-tag); gated on Q10                                           | switch_without_return_count (cand.)          |
| Q18  | Grit-CI (−, QP)             | none permitted as primary (questionnaire-primary)            | none (shadow telemetry secondary only)                                                 | none authorised                              |
| Q19  | Grit-CI (−, expl.)          | New-goal offer → prior-goal closure                          | Q19-exclusive (live); gated on Q10; Final-Core-censored                                | goal_switch_without_return_count (cand.)     |
| Q20  | Grit-CI (−, QP)             | none permitted as primary (questionnaire-primary)            | none compliant (rides Q07 arc)                                                         | none authorised                              |
| Q21  | PDD (+)                     | Repair post-failure continuation                             | **(pending split)** shared repair stream                                               | failure_recovery_score (cand.)               |
| Q22  | PDD (+)                     | Support consulted AND applied                                | **(pending split)** support acts multi-tagged                                          | applied-information flag (cand.)             |
| Q23  | PDD (+)                     | Adaptive-retry quality                                       | **(pending split + divergence fix)**                                                   | adaptive_retry_count (cand.)                 |
| Q24  | PDD (+)                     | Repair setback re-engagement                                 | **(pending Q24/Q25 split + D4)**                                                       | post_setback_completion_score (cand.)        |
| Q25  | PDD (+)                     | Leave-then-return vs non-return                              | **(pending Q24/Q25 split)**; `abandonment_count` mis-wire noted                        | reengagement_after_failure (cand.)           |
| Q26  | IP (+ maladaptive)          | Identical repetition after feedback                          | Q26-exclusive repetition events (live) — best-in-tree                                  | blind-repetition count (cand., de-polluted)  |
| Q27  | IP (+ maladaptive)          | **(pending SA-1/SA-2 revised)** utility-stop continuation    | none (candidates only; hazard tags contested)                                          | excess_continuation_count (cand.)            |
| Q28  | IP (+ maladaptive)          | Blocker-understood → force/resolve                           | Q28-exclusive events (live); **entry state noncompliant**                              | force_continue_count (cand.)                 |
| Q29  | GTP long pole (expl.)       | **(pending SA-3 revised)** balanced horizon choice ×2        | none (candidates; stabiliser tags superseded)                                          | **one shared** goal_horizon_preference       |
| Q30  | GTP small-goal (expl.)      | **(pending SA-4 revised)** granularity choice ×≥2            | none (verification tags prohibited)                                                    | goal_granularity_preference (cand.)          |
| Q31  | GTP short pole (expl.)      | same shared module as Q29 (sole exception, ruling §2)        | none (hazard tags superseded)                                                          | the same single shared indicator             |
| Q32  | GTP long (QP)               | none permitted — no module, no score                         | none (weak-proxy tags secondary, SA-5)                                                 | none authorised                              |
| Q33  | GTP short (QP)              | none permitted — portfolio **not authorised** (reuse ban)    | none (final-core tags prohibited inference, SA-6)                                      | none authorised                              |

## 4. All-33-item compliance and remediation table

Status vocabulary (JSON `implementation_status`): compliant_pending_coding_rules ·
partially_compliant · shared_stream_noncompliant · opportunity_gated_noncompliant ·
entry_state_noncompliant · absent_blocked · questionnaire_primary_no_module.

| Item | Status                          | Minimum remediation (nothing implemented by this plan)                       |
| ---- | ------------------------------- | ---------------------------------------------------------------------------- |
| Q01  | compliant_pending_coding_rules  | Declare window boundaries + opportunity id; D2 scoring alignment             |
| Q02  | partially_compliant             | SA-4 tag ruling; standardise/code the Final Core consequence exposure        |
| Q03  | opportunity_gated_noncompliant  | **SA-12** independence remedy (ruling §11); episode stays secondary          |
| Q04  | partially_compliant             | Standardise/code cleanup entry state; Final Core exposure coding             |
| Q05  | absent_blocked                  | D7 + D3, then the confirmation act/window in its own pass                    |
| Q06  | shared_stream_noncompliant      | Q06-exclusive duty-completion family (event-schema + scoring rulings)        |
| Q07  | shared_stream_noncompliant      | Side-repair arc ownership split (Q07/Q16/Q20/Q32)                            |
| Q08  | partially_compliant             | D3 + duty framing pass + engagement/avoidance family                         |
| Q09  | compliant_pending_coding_rules  | SA-8; record prior-state configuration in validity coding                    |
| Q10  | partially_compliant             | Corridor de-gating ruling or dependency coding (its own internals are sound) |
| Q11  | entry_state_noncompliant        | Standardised baseline issue ruling; SA-6 for the Q33 co-tag                  |
| Q12  | partially_compliant             | SA-1/SA-3 tag rulings; D2 composite splits                                   |
| Q13  | shared_stream_noncompliant      | Archive stream ownership split                                               |
| Q14  | shared_stream_noncompliant      | Repair stream ownership split                                                |
| Q15  | opportunity_gated_noncompliant  | SA-9/SA-10 + corridor de-gating ruling                                       |
| Q16  | shared_stream_noncompliant      | Q16-exclusive execution-accuracy family (own instance or ruled split)        |
| Q17  | opportunity_gated_noncompliant  | SA-9 + D6 + corridor de-gating                                               |
| Q18  | questionnaire_primary_no_module | None required; optional arc = own event-schema ruling                        |
| Q19  | opportunity_gated_noncompliant  | Corridor de-gating + censoring-coding rule                                   |
| Q20  | questionnaire_primary_no_module | None required; anomaly arc = own ruling (lowest priority)                    |
| Q21  | shared_stream_noncompliant      | Repair stream ownership split                                                |
| Q22  | shared_stream_noncompliant      | Support-act ownership + D2 hazard-term removal                               |
| Q23  | shared_stream_noncompliant      | Revision-act ownership + registration-divergence fix                         |
| Q24  | shared_stream_noncompliant      | Q24/Q25 return-act assignment + D4                                           |
| Q25  | shared_stream_noncompliant      | Same split + D2 `abandonment_count` fix                                      |
| Q26  | partially_compliant             | D2 de-pollution (hazard term) + debounce ruling                              |
| Q27  | absent_blocked                  | SA-1 + SA-2 **revised** rulings, then module in its own pass                 |
| Q28  | entry_state_noncompliant        | Standardised baseline blocker ruling (shared with Q11) + D2 term             |
| Q29  | absent_blocked                  | SA-3 revised ruling, then module                                             |
| Q30  | absent_blocked                  | SA-4 revised ruling, then module                                             |
| Q31  | absent_blocked                  | SA-3 (shared) + SA-1 for hazard tag                                          |
| Q32  | questionnaire_primary_no_module | SA-5 revised ruling on tags only                                             |
| Q33  | questionnaire_primary_no_module | SA-6 revised ruling on tags; any treatment needs an independence ruling      |

## 5. Primary-event ownership table

Target state under ruling §1: every registered event feeds **at most one**
item's primary variable; all other tags demote to secondary/contextual. This
table records the target owner **as a proposal for the research owner** —
no registration changes here.

| Live event (multi-tagged today)                                     | Current tags  | Proposed single primary owner     | Displaced tags become                     |
| ------------------------------------------------------------------- | ------------- | --------------------------------- | ----------------------------------------- |
| `inventory_verification_skipped`                                    | Q02, Q30      | Q02                               | Q30: removed (prohibited inference; SA-4) |
| `archive_feedback_used`                                             | Q13, Q22      | Q22 (application window)          | Q13: secondary context                    |
| `archive_strategy_revision`                                         | Q13, Q22, Q26 | Q13 (revision-after-setback)      | Q22/Q26: secondary; divergence fixed      |
| `archive_completed`                                                 | Q06, Q13      | Q13 (window closure)              | Q06: replaced by duty-level family        |
| `repair_failed`                                                     | Q14, Q21      | Q21 (setback onset)               | Q14: secondary                            |
| `repair_manual_used`                                                | Q14, Q21, Q22 | Q22 (application window)          | Q14/Q21: secondary                        |
| `repair_strategy_revision`                                          | Q14, Q21, Q23 | Q23 (retry quality)               | Q14/Q21: secondary                        |
| `repair_completed`                                                  | Q06, Q14, Q21 | Q21 (post-failure completion)     | Q06: duty-level family; Q14: secondary    |
| `archive/repair_returned_after_failure`                             | Q24, Q25      | Q25 (leave-return pattern)        | Q24: own setback-completion acts          |
| `interruption_received`                                             | Q15, Q17      | Q15 (window opener)               | Q17: secondary context                    |
| `return_to_unfinished_task` + `returned_to_original_task` (co-fire) | Q15 + Q17     | SA-9's call (one owner)           | other: folded or secondary                |
| `hazard_info_checked`                                               | Q12, Q27      | Q12                               | Q27: removed (SA-1)                       |
| `hazard_reckless_continue`                                          | Q12, Q27, Q31 | Q12                               | Q27/Q31: removed (SA-1/SA-3)              |
| `side_repair_accepted`                                              | Q07, Q16, Q20 | Q07                               | Q16: own family; Q20: secondary           |
| `side_repair_step_completed`                                        | Q07, Q16      | Q07 (or Q16 per ruling)           | other: secondary                          |
| `side_repair_completed`                                             | Q07, Q16, Q32 | Q07                               | Q16: own family; Q32: SA-5                |
| `final_core_rushed`                                                 | Q11, Q33      | Q11                               | Q33: removed (SA-6)                       |
| `final_core_completed`                                              | Q06, Q33      | none (context) pending Q06 family | Q33: removed (SA-6)                       |

Singly-owned today and to be preserved: Q01 inventory acts, Q04 cleanup acts,
Q09 report acts, Q10 duty acts, Q19 goal events, Q26 repetition events, Q28
blocker/force events, Q12 `hazard_warning_seen`.

## 6. Primary-variable ownership table

No item-level variable exists today; this is the target ownership map (all
candidates; scoring-plan rulings required).

| Item    | Proposed primary variable (candidate)                   | Existing related variable and its status                       |
| ------- | ------------------------------------------------------- | -------------------------------------------------------------- |
| Q01     | checklist-guided preparation quality                    | `organization_checklist_used` (legacy boolean; rename pending) |
| Q02     | unresolved preventable-error count                      | `organization_disorganized_count` (legacy name feed)           |
| Q03     | independent retrieval accuracy (post-SA-12)             | none (`prepared_tool_used` read by no formula)                 |
| Q04     | cleanup completion/failure state                        | `organization_cleanup_count` (counts actions, not failures)    |
| Q05     | task_initiation_latency                                 | none                                                           |
| Q06     | required_completion_rate                                | none (`objective_completed` boolean)                           |
| Q07     | accepted_task_completion_rate                           | `productiveness_completed_optional_task` (multi-tag feed)      |
| Q08     | productive_engagement_rate                              | none                                                           |
| Q09     | report_accuracy_score (SA-8/D2)                         | `responsibility_report_count` (exact, count only)              |
| Q10     | commitment_followthrough_rate                           | none                                                           |
| Q11     | preventable_unresolved_count                            | `final_core_completion_quality` (categorical; D2 shape)        |
| Q12     | prudence_check_rate                                     | folded into `strategy_revision_count` (defect)                 |
| Q13     | post_failure_reengagement                               | `game_difficulty_persistence` (construct-level only)           |
| Q14     | useful_effort_count                                     | same construct composite                                       |
| Q15     | started_task_completion_rate                            | `consistency_return_to_task_count` (raw legacy count)          |
| Q16     | diligence_step_accuracy                                 | none                                                           |
| Q17     | switch_without_return_count                             | none                                                           |
| Q18     | none authorised (weak-proxy label per SA-7 if ever)     | none                                                           |
| Q19     | goal_switch_without_return_count                        | none                                                           |
| Q20     | none authorised                                         | none                                                           |
| Q21     | failure_recovery_score                                  | construct composite only                                       |
| Q22     | applied-information flag                                | `manual_or_feedback_used` (boolean, near)                      |
| Q23     | adaptive_retry_count                                    | `blind_retry_count` (contrast class; polluted)                 |
| Q24     | post_setback_completion_score                           | none (D4 open)                                                 |
| Q25     | reengagement_after_failure                              | `abandonment_count` (mis-wired to `hazard_avoidance`)          |
| Q26     | identical-repetition count (de-polluted)                | `blind_retry_count` (hazard term to remove)                    |
| Q27     | excess_continuation_count (post-SA-2)                   | none                                                           |
| Q28     | force_continue_count                                    | D2 4th-term question                                           |
| Q29+Q31 | **one shared** goal_horizon_preference (sole exception) | none                                                           |
| Q30     | goal_granularity_preference                             | none                                                           |
| Q32     | none authorised                                         | `optional_future_benefit_score` intentionally unimplemented    |
| Q33     | none authorised                                         | none                                                           |

## 7. Cross-item dependency and carryover graphs

Full edge data (51 edges, all 9 fields each): `cross_item_edges` in the JSON
register. Summary by category:

### 7.1 Opportunity-gating and state-inheritance graph (hard dependencies)

```
Q10 ──gates──> Q15, Q17, Q19            (corridor exists only after duty acceptance)
Q01/Q02 ──gates──> Q03                   (retrieval episode needs close-out + packed + stored)
Q02, Q04, Q10, Q15 ──feed──> Q11 issue set ──gates──> Q28 blocker opportunity
Q11 ──shares live issue state with──> Q28 (same interface, same visit)
Q19 ──closure censored by──> Final Core reachability
```

### 7.2 Carryover graph (soft channels: practice, affect, NPC, order, fatigue)

```
Q13 (Archive episode) ──practice──> Q14, Q21, Q23   ──affect──> Q24
Q09 ──NPC social momentum (Kai)──> Q10  [and ──> Q18 arc if built]
Q21-family success ──contrast──> Q27 stop-signal response   (proposed module)
Q29 module <──contrast──> Q30 module                        (proposed modules)
Q01 console familiarity ──practice──> Q30 first instance    (proposed)
all modules ──fatigue──> late Final Core windows (Q11, Q28, any Q33 derivation)
```

### 7.3 Event-reuse edges (register)

Q07↔Q16↔Q20↔Q29↔Q32 (side-repair arc incl. co-fired stabiliser acts and the
Final Core stability bonus) · Q13↔Q22↔Q26↔Q06 (archive stream) ·
Q14↔Q21↔Q22↔Q23↔Q06 (repair stream) · Q24↔Q25 (return acts) · Q15↔Q17
(corridor + SA-9 co-fire) · Q12↔Q27↔Q31 (hazard tags) · Q02↔Q30
(verification skip) · Q11↔Q33, Q06↔Q33 (final-core tags).

### 7.4 Variable-reuse edges (register)

`blind_retry_count`/`game_inappropriate_persistence` ← Q26 events + Q12/Q27/Q31-tagged
hazard event · `strategy_revision_count` ← Q13/Q23-family + Q12-tagged
`hazard_info_checked` · `game_uncertainty_persistence` ← Q12+Q31-tagged events ·
`game_difficulty_persistence` ← archive+repair streams (construct-level only) ·
`abandonment_count` ← legacy `hazard_avoidance` (mis-wire) ·
`failure_adaptation_index`/`game_persistence_total` ← nearly everything
(legacy composites; must stay labelled legacy, ruling §12). Authorised:
Q29+Q31 single shared indicator (ruling §2).

## 8. Prohibited event reuse

Under ruling §1 (and §2's single exception), the following are **prohibited**
and recorded; the live registrations stay in force until their own rulings —
prohibition here means _no primary variable may be built on them_:

1. Any multi-tagged event feeding more than one item primary (§5 list).
2. Q32/Q33 reuse of Q29-Q31 horizon/granularity events — no permission
   exists; the historical "derived portfolio" treatment is superseded.
3. Q27/Q31 reuse of Hazard events (Hazard is prudence — Q12's window).
4. Q30 inference from `inventory_verification_skipped`/`inventory_verified_complete`
   (skipped preparation — prohibited by approved decision and ruling §1).
5. Q33 inference from `final_core_rushed`/`final_core_issue_resolved`/
   `final_core_completed` (rushing/quality — prohibited).
6. The SA-9 co-fire pair counted as two observations (one act, one owner).
7. `wrong_tool_selected` cross-room reuse (Inventory-scoped by schema rule).
8. Composite variables standing in for missing item measures (ruling §12).

## 9. Permissible shared context events

Ruling §6 permits shared rooms/NPCs/assets/movement/generic components. The
following remain shared, **unscored for every item**: room entry/exit and
movement telemetry; `scenario_*` pilot family and
`final_core_blocked_pending_decisions` (route gate; never Q-mapped); dock
control/usability covariates (`dock_*`, `tutorial_*`, `control_error_count`);
hub navigation (`station_hub_*`); `hazard_route_avoided` (D1: telemetry-only);
DEV probes and debug API traffic; prompt/panel UI interactions (never logged
as behaviour). These provide context and controls, feed no primary variable,
and are the _only_ things modules may share beside art/mechanics shells.

## 10. Shared-room, NPC and mechanic rules

- One room may host several items' windows **only** with disjoint windows,
  disjoint event families and disjoint state containers (ruling §6). Current
  violations to remedy by ruling: Final Core (Q11/Q28 share live issue state),
  Inventory close-out (Q01/Q02/Q04 windows interleave in one flow — boundary
  declarations required), side-repair arc (a **five-item** state machine:
  Q07/Q16/Q20 via the shared arc events, **plus Q29** via the co-fired
  stabiliser acts — `stabiliser_option_offered` fires with the offer,
  `stabiliser_accepted` with the accept, the same physical acts as
  `side_repair_accepted` — **and Q32** via `side_repair_completed`/
  `final_bonus_unlocked` at completion; SA-3's review must see this
  entanglement, not just the Q07/Q16/Q20 triple), corridor (Q15/Q17/Q19 one
  beacon state machine). The side-repair outcome additionally produces the
  Q29-tagged `final_core_stability_bonus` at Final Core — a Q07-outcome →
  Q29-tagged-event state inheritance recorded in the edge register.
- NPC wording must be invariant to earlier outcomes (ruling §4). Kai's
  acknowledgements are already outcome-invariant (verified); this must remain
  frozen and extends to any future NPC surface.
- Reused mechanics (card panels, step tiles, consoles) are generic components
  and stay shareable; any _scored_ reuse requires a new item-specific
  instance and state container (e.g. the proposed second granularity
  instance, the utility-stop console).

## 11. Standardised entry-state requirements

Per ruling §4, every primary opportunity must begin from a standardised or
counterbalanced measurement-relevant entry state. Requirements (all pending
rulings for the machinery; nothing implemented here):

1. **Final Core baseline issue component** for Q11/Q28: identical review-and
   blocker material for every session; participant-caused issues retained as
   secondary ecological telemetry.
2. **Corridor de-gating** for Q15/Q17/Q19: an interruption opportunity that
   exists regardless of the Q10 outcome, or explicit dependency coding.
3. **Q03 independent retrieval opportunity** (SA-12; ruling §11).
4. **Cleanup entry state** for Q04: equivalent disorder to restore regardless
   of earlier tidiness.
5. **Report equivalence** for Q09: claim-card set reachable and equivalent
   under every prior-state configuration.
6. **Offer invariance** for Q07/Q10/Q17/Q19: wording, option count and
   position identical across sessions (modulo counterbalance condition).
7. **Module entry standardisation** for every future module (Q27 stop signal
   after a fixed cycle count; Q29/Q30 matched options).
8. Every entry state exports a validity flag (ruling §9).

## 12. Counterbalancing and parallel-form requirements

- **Option position** within every choice card: counterbalanced across
  sessions, or fixed with documented rationale + exported order (ruling §7).
- **Matched scenario forms**: where parallel forms exist (second horizon/
  granularity instances), forms are matched on effort/value/difficulty/
  attractiveness/social approval and assigned counterbalanced.
- **Repeated-opportunity order**: instance order counterbalanced (Q29 ×2,
  Q30 ×≥2 when ruled).
- **Module order**: free-roam self-selection means order cannot be imposed
  without redesign — therefore visit order, module order and session position
  are **exported as control variables**, the fixed route-gate order (scenarios
  → Final Core) is documented as scientifically necessary, and pilot analysis
  tests order effects (ruling §§7, 10). Counterbalancing never by itself
  proves absence of carryover.
- Counterbalance condition is recorded in the raw data (ruling §9).

## 13. Opportunity and contamination coding

Per ruling §9 the raw export must identify, per item opportunity: opportunity
id; presentation order and counterbalance condition; entry-state validity;
relevant prior module exposure; technical/comprehension failure; suspected
carryover contamination; and a primary-analysis validity verdict. Canonical
payload/flag names are an **event-schema decision (SA-13)** — nothing is
implemented here. Coding principles already binding: a contaminated or absent
opportunity is missing/invalid measurement, never behavioural non-performance,
never a low trait score; no-opportunity, censored (Final Core unreached),
insufficient-opportunity (<2 instances where ≥2 required) and invalid-entry
states are distinguishable from every behavioural code.

## 14. Participant-burden implications

- The remediation set adds, at most: one standardised Q03 retrieval moment
  (~15–30 s), a baseline Final Core issue (~20–40 s), a de-gated corridor
  beacon (no added time — replaces gating), the SA-gated modules already
  budgeted by the NEXT-09 coverage contract (horizon ×2, granularity ×2,
  utility-stop, confirmation act: ≈8–10 added median minutes, unchanged), and
  entry-state/counterbalance machinery with **zero** participant-visible cost.
- Standardisation _reduces_ burden variance (fewer participant-dependent long
  paths); contamination coding costs nothing at play time.
- The optional Q18/Q20 arcs remain optional/non-blocking outside the budget.
- Pilot calibration (ruling §10) must confirm the total stays inside the
  14–18-minute design envelope; if it does not, the research owner chooses
  cuts — never silent trimming of measurement controls.

## 15. Proposed phased implementation sequence

Every phase is approval-gated, one bounded unit, one commit; phases stop for
their named rulings. Nothing below is started by this plan.

- **Phase A (docs, this pass):** record ruling; update specification; publish
  this plan + JSON register. DONE by this commit.
- **Phase B (rulings intake):** research owner issues re-scoped SA-1/SA-3/
  SA-4/SA-5/SA-6 (dossier options re-read under the ruling), SA-8..SA-11
  where touched, SA-12 (Q03), SA-13 (validity-coding payloads), corridor
  de-gating and Final Core baseline-issue decisions, D2..D7 as they choose.
- **Phase C (event-schema pass):** apply ruled ownership splits/retags in
  `event-schema.md` + `CanonicalEventContext.ts` exactly as ruled; matrix
  truth-up; no mechanics.
- **Phase D (entry-state and coding pass):** implement ruled standardised
  entry states + opportunity/contamination payloads; Route G invariance for
  untouched streams.
- **Phase E (module passes, one each):** Q27 utility-stop; Q29/Q31 horizon;
  Q30 granularity; Q05 initiation window; each with counterbalance machinery
  and its own verification.
- **Phase F (scoring pass, D2-family):** item-variable layer + export-layer
  separation (item / construct / exploratory / legacy / control).
- **Phase G (pilot analysis):** ruling-§10 test battery; outcomes feed
  redesign/testlet/removal decisions by the research owner. Named
  discriminant-dependency pairs the battery must cover (beyond the generic
  sweep): Q13/Q24 (conceptual redundancy across modules); Q23/Q26 (adaptive
  vs identical retries inside the same failure windows); Q12 vs Q29/Q31
  (hazard tags vs horizon dimension); Q17/Q19 (two switch-pattern readings of
  one corridor); Q07/Q16/Q20/Q29/Q32 (side-repair co-location); Q11/Q28
  (shared Final Core state); Q09→Q10 (hard-chained NPC windows).

Rollback boundaries: each phase is one commit on its own branch; Phase C is
the retag boundary (schema + registry move together or not at all); Phase D/E
never modify pre-existing event emissions (allowlisted additions only, Route G
zero-diff on avoidance replays); Phase F touches `ScoringManager` only. Any
phase can be reverted without unwinding earlier phases.

## 16. Acceptance criteria

1. Every Q-item has, in the JSON register and matching schema/scoring
   documents: one declared primary opportunity, window, event family and
   variable — or an explicit questionnaire-primary/no-primary record.
2. No registered event feeds more than one primary variable (Q29/Q31 shared
   indicator excepted); validator + a dedicated ownership check pass.
3. Every primary opportunity has a standardised or counterbalanced entry
   state, with validity flags in the raw export.
4. Order/counterbalance condition and module order exported as controls.
5. Contaminated/absent opportunities coded missing, never trait-scored, in
   every derived variable.
6. Export layers separated: item, construct, exploratory (labelled), legacy
   composite (labelled), control.
7. Pilot battery of ruling §10 executed and reviewed by the research owner
   before any validity claim.
8. All-Route Playwright suite green; Route G invariance holds at every phase.

## 17. Unresolved research-owner decisions

Nothing below is resolved by this plan (CLAUDE.md §"No autonomous
resolution"): re-scoped **SA-1, SA-3, SA-4, SA-5, SA-6** (dossier options are
pending revised rulings under the global authority); **SA-2** (utility-stop
module); **SA-7** (labels); **SA-8** (Q09 accuracy registration); **SA-9/
SA-10** (corridor co-fire/ignore semantics); **SA-11** (requisition display);
**SA-12 (new)** Q03 independence remedy; **SA-13 (new)** validity-coding
payload design; corridor de-gating decision; Final Core baseline-issue
decision; Q01/Q02/Q04 window-boundary declarations; Q06/Q08 duty-family
events; Q16 instance-vs-split; Q24/Q25 return-act assignment (with **D4**);
**D2** family (composite cleanup incl. `abandonment_count` mis-wire and
hazard-term pollution); **D3** idle; **D5/D6/D7**; §8.2 coding principles
(debounce, first-vs-final, deferment, incomplete sessions, weights);
INT-family export questions.
