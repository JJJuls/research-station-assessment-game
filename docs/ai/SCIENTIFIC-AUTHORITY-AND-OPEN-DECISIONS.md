# Scientific Authority and Open Decisions

## 1. Purpose and status

**Purpose.** This document is the single place that records (a) which document
governs which question, (b) the scientific decisions that are **approved and
closed**, and (c) the decisions that remain **open and may only be resolved by the
research owner**. It exists because authority in this project is **domain-specific**:
several documents are simultaneously authoritative, each over a different question,
and reading any one of them as governing everything produces silent scientific error.

**Status.** Governance record, current as of the alignment pass that introduced it
(2026-07-15, branch `fable-autonomous-game-build-v1`, from checkpoint `1ad66c2`).
This document **records** decisions; it does not make them. It approves no event
name, no formula, and no mechanic on its own.

**Update 2026-07-29 (NEXT-09 global-ruling adoption pass).** §13 records the
research-owner-approved **global scientific ruling on item separation, local
independence and carryover control**, verbatim, together with its supersession
register. Where §13 conflicts with older shared-module, event-reuse, Q32/Q33
no-module, local-independence or carryover assumptions elsewhere in this
document, the historical wording is preserved and explicitly marked superseded
in place — nothing is silently rewritten. §13 changes no event registration,
no formula, and no participant-facing mechanic by itself.

**Update 2026-07-30 (NEXT-10 research-owner measurement-ruling adoption pass).**
§14 records the research-owner rulings that **adopt** the previously discussed
Q27-Q33 measurement directions as approved **measurement-design** authority:
SA-1 (Hazard ownership), SA-2 (Q27 utility-stop module), SA-3 (Q29/Q31 shared
goal-horizon), SA-4 (Q30 goal granularity), SA-5 (Q32 Active Project
Portfolio), SA-6 (Q33 Contract Closure Queue), SA-12 (independent Q03
opportunity), SA-13 (validity and counterbalance architecture), plus corridor
de-gating and the Final Core baseline issue/blocker component. The global
ruling of §13 remains **approved, binding and immutable** — §14 is issued under
it and neither reinterprets nor weakens it. §14 approves **no canonical event
name, no payload name, no variable, weight, threshold or formula, and no
implementation**; where §14 supersedes older wording (notably the Q32/Q33
"no module" and "derived from shared opportunities" statements, and the
"pending revised rulings" status), the historical wording is preserved and
marked superseded in place.

**Scope of the pass that created it.** Documentation and Claude-configuration only.
No source code, test code, event schema, or scoring code was changed. The conflicts
listed in §9 are therefore **recorded, not fixed** — the live tree still follows the
older rationale wherever §9 says so.

---

## 2. Domain-specific authority hierarchy

Apply authority **by domain**. A newer research-owner-approved scientific decision
supersedes an older mechanic rationale **only within its own scientific domain** —
it never silently rewrites a production event name, a scoring formula, or the build
discipline.

| #   | Domain                            | Authority                                                                           | What it governs                                                                                                                                                                                                   |
| --- | --------------------------------- | ----------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Exact questionnaire content       | The final exact 33-item battery (`Original_question_items`, external)               | Exact item wording; scale membership; item direction; source-scale identity; the Q01-Q33 crosswalk. **Never altered.**                                                                                            |
| 2   | Behavioural translation           | `docs/scientific/Q01-Q33_GAMIFIED_MEASUREMENT_SPECIFICATION.md`                     | How each Q-item becomes a gameplay opportunity; proposed player choices; measurement windows; behavioural reasoning; evidential-strength labels; known confounds; questionnaire-primary vs exploratory treatment. |
| 3   | Event names and payloads          | `docs/research/event-schema.md`                                                     | Currently **approved canonical production event names** and payload conventions.                                                                                                                                  |
| 4   | Scoring and derived formulas      | `docs/research/scoring-plan.md`                                                     | **Approved** derived variables, formulas, weights, reverse-key handling, composite logic.                                                                                                                         |
| 5   | Architecture and build discipline | `docs/ai/fable-claude-final-game-build-contract-v3.txt` (V3)                        | System architecture; room/task structure; build discipline; verification gates; Git and agent workflow — except where a newer approved scientific decision explicitly supersedes an older **mechanic rationale**. |
| 6   | Historical material               | Older handoffs, prototypes, obsolete branch instructions, superseded decision notes | **Evidence only.** Never overrides the current branch, the current code, the final 33-item battery, or the newer approved measurement specification.                                                              |

**Where tier 2 meets tiers 3-4.** The measurement specification governs the
_rationale_. It **records candidate events and candidate derived indicators** —
design proposals, not contracts. A candidate becomes canonical only through an
explicit research-owner event-schema or scoring-plan decision. Where the newer
rationale conflicts with a live registration, **the rationale is superseded-in-favour
of the specification and the implementation becomes an open decision** — never a
silent edit.

**Do not use modification timestamps as authority.** A newer file is not thereby
more authoritative; apply the table above.

---

## 3. Current final battery

**The final battery contains Q01-Q33.** All 33 items are retained, including
Q29-Q33. The questionnaire remains a **post-game self-report battery** administered
in Qualtrics. The game supplies **behavioural analogues** for convergent and
discriminant analysis — it is not a questionnaire replacement and does not
administer disguised questions.

---

## 4. Confirmed approved scientific decisions

Closed. Do not reopen or reinterpret.

1. Player-facing text must **never** reproduce exact or near-exact questionnaire
   wording. Exact wording is for internal traceability only (matrices, docs,
   comments).
2. Raw events, process variables and construct subindices must remain
   **distinguishable**.
3. **No single global "good player" or global personality score** — ever.
4. **Adaptive persistence and inappropriate persistence stay separate and opposite
   in interpretation.** Higher inappropriate persistence is always worse. They may
   never share a variable.
5. **Raw duration alone is neither persistence nor effort.**
6. **Candidate gameplay indicators are not automatically validated item scores.**
7. **Opportunity, choice, process, outcome and control variables must remain
   distinguishable.** No-opportunity, technical-interruption and
   comprehension-failure states stay distinguishable from behavioural
   non-performance.

---

## 5. The Q04 correction

**Q04 represents leaving a mess or failing to clean up** (BFI-C-10).

- It **must** be implemented through explicit cleanup, restoration, or
  workspace-disorder behaviour.
- It **must not** be represented as planning-before-action.

This corrects a stale mapping carried in the earlier blueprint/workbook. **Status:
corrected and already consistent in the live tree** — `workspace_left_disordered`
and `cleanup_completed` are registered to `Q04` / `organisation`
(`src/world/CanonicalEventContext.ts`), and the prohibition is restated in
`PROJECT_SPEC.md`, `room-builder`, `psychometric-task-design`, and
`research-data-reviewer`. Those restatements are the **correct** guidance and are
kept.

---

## 6. Detailed current decisions

### Q18 — difficulty maintaining focus on projects lasting more than a few months

- The game can only provide a **weak goal-continuity proxy** across rooms and
  interruptions.
- **Q18 remains questionnaire-primary.**
- Do **not** describe the game variable as direct long-term-focus measurement.
- Live mapping: `objective_active`, `final_unresolved_due_to_nonreturn` → `Q18`,
  `construct_id: consistency_of_interest_exploratory`. **Consistent** with this
  decision. The variable name `longitudinal_focus_proxy`
  (`MASTER_33_ALIGNMENT.md`) is acceptable only while it is surfaced with an
  explicit weak/exploratory label.

### Q20 — intense initial interest, later loss of interest

- The optional anomaly/project arc may provide **very weak start-without-sustain**
  evidence.
- The game **cannot** establish "obsession" or actual loss of interest.
- **Q20 remains questionnaire-primary.**
- **No bespoke validated Q20 game score is approved.** Do not design one.
- Live mapping: `side_repair_accepted`, `side_repair_first_step`,
  `side_repair_abandoned_after_start` → `Q20`,
  `construct_id: consistency_of_interest_exploratory`; no Q20 score exists.
  **Consistent** with this decision.

### Q27 — continuing when there is no point

- Q27 should **primarily** use **continuation after an explicit utility-stop /
  no-additional-benefit signal**.
- The participant **must** receive clear information that further cycles provide no
  operational benefit.
- **Hazard recklessness is not the primary Q27 analogue.**
- **Hazard remains principally a prudence/carefulness situation.**
- **Conflict with the live tree — see SA-1 and SA-2 (§9).** No utility-stop module
  exists; `hazard_reckless_continue` currently carries `Q27`.

> **Adoption note (2026-07-30, §14).** SA-1 and SA-2 are now **ruled at
> measurement-design authority** (§14.1). Hazard belongs to Q12; Q27 may take
> no primary evidence from Hazard events, states, outcomes or derived
> variables, and a dedicated Q27 utility-stop module is approved for design.
> The live registration and the `game_inappropriate_persistence` Hazard term
> are **unchanged** — they remain event-schema and scoring-plan work. The
> conflict recorded above therefore still describes the live tree.

### Q29 — prefers long-term goals

- Shares **one** goal-horizon behavioural dimension with Q31 (see below).
- **Exploratory.**
- **Conflict with the live tree — see SA-3 (§9).**

> **Adoption note (2026-07-30, §14).** SA-3 is now ruled at measurement-design
> authority (§14.1): two matched, counterbalanced horizon situations producing
> **one** shared Q29/Q31 construct-level indicator. No module is implemented
> and no event or formula is approved.

### Q30 — usually works towards small goals

- Q30 concerns **preference for small goals / goal granularity**.
- It should use **repeated choices** between (a) several independently closable
  smaller objectives and (b) one integrated multi-component objective.
- Total effort, benefit and difficulty should be **approximately balanced**.
- **At least two valid opportunities** are preferred before deriving a behavioural
  pattern.
- **Q30 must not be inferred from carelessness, skipped preparation, or Hazard
  behaviour.**
- **Conflict with the live tree — see SA-4 (§9).**

> **Adoption note (2026-07-30, §14).** SA-4 is now ruled at measurement-design
> authority (§14.1): **at least two independent Q30 opportunities** — a
> Vale/Inventory work-order granularity situation and a
> telemetry-cache/map-movement granularity situation — each Q30-specific,
> balanced and counterbalanced. The prohibitions above are re-affirmed, not
> relaxed. Nothing is implemented; no event or formula is approved.

### Q31 — prefers short-term goals

- Q29 and Q31 are **opposite ends of one shared goal-horizon dimension**.
- The appropriate situation is a **balanced choice** between:
  - a **self-contained objective** with immediate closure or benefit; and
  - a **distributed objective** with comparable total effort/value and delayed
    closure or benefit.
- The options **must not** be labelled "short-term" or "long-term".
- The **initial choice must be logged before an interruption**.
- **One choice must not be counted as two independent behavioural observations for
  Q29 and Q31.**
- **Exploratory.**
- **Conflict with the live tree — see SA-3 (§9).**

> **Adoption note (2026-07-30, §14).** As Q29: SA-3 is ruled at
> measurement-design authority. Q29/Q31 remains the **sole** authorised
> shared-construct exception (§13, ruling §2) and produces exactly one shared
> indicator; Hazard, stabiliser and shared-arc evidence is not authorised as
> primary Q29/Q31 evidence.

### Q32 — most of the goals I work on take years to finish

- **Long-term-oriented. It is NOT reverse-scored relative to long-term
  orientation.**
- The game can provide only a **very weak extended-goal engagement proxy**.
- **Q32 remains questionnaire-primary.**
- **Do not create a distinct validated Q32 game score.**
- Live mapping: `side_repair_completed` → `['Q07','Q16','Q32']`,
  `final_bonus_unlocked` → `['Q32']`; `MASTER_33_ALIGNMENT.md` names
  `optional_future_benefit_score` (unimplemented, "missing" in `scoring-plan.md` §2).
  **No reverse-keying of Q32 exists anywhere** — reverse-scoring lives on the
  Qualtrics self-report side, and `ScoringManager` applies none. The remaining
  question is whether the Q32 raw tags stay as a weak proxy — **see SA-5 (§9)**.

> **Adoption note (2026-07-30, §14) — supersession.** SA-5 is now ruled at
> measurement-design authority (§14.1): a **distinct Q32 Active Project
> Portfolio measurement module** is approved, with its own opportunity,
> window, state container and eventual primary event family, independent of
> Q29/Q31, Side Repair and every other item's primary evidence. Two clauses
> above are therefore **superseded**: (a) the "very weak extended-goal
> engagement proxy **derived** across shared opportunities" framing — Q32's
> approved evidence is its own module, never reuse of another item's events;
> and (b) any reading of "no distinct Q32 game score" as "no Q32 module". What
> **stands unchanged**: Q32 remains a questionnaire item administered in
> Qualtrics and **questionnaire-primary**; no reverse-keying; and any eventual
> indicator is an **exploratory short-session analogue only** — never a
> validated item score, and never a claim to measure literal multi-year goal
> duration. Legacy Q32 tags (`side_repair_completed`, `final_bonus_unlocked`)
> may remain only as **labelled secondary ecological telemetry** pending
> event-schema disposition; they cannot feed the Q32 primary variable.

### Q33 — accomplished goals usually take only a few days

- Do **not** infer Q33 from rushing the Final Core, poor final quality, or
  unresolved issues.
- Only **self-selected** goal-horizon or goal-granularity opportunities may
  contribute to an **exploratory end-session portfolio**.
- **Required short tasks must not count as evidence of short-goal preference.**
- **Q33 remains questionnaire-primary.**
- **Conflict with the live tree — see SA-6 (§9).**

> **Adoption note (2026-07-30, §14) — supersession.** SA-6 is now ruled at
> measurement-design authority (§14.1): a **distinct Q33 Contract Closure
> Queue measurement module** is approved, with its own self-selected
> Q33-specific closure opportunities, window, state container and eventual
> primary event family, independent of Final Core and of Q29, Q30, Q31, Q32
> and every other item's outcomes. **Superseded**: the "end-session portfolio
> derived from the Q29-Q31/Q30 self-selected opportunities" treatment — Q33's
> approved evidence is its own module, never reuse of another item's events;
> and any reading of "questionnaire-primary" as "no Q33 module". **Unchanged
> and re-affirmed**: Q33 remains a questionnaire item administered in Qualtrics
> and questionnaire-primary; required short tasks and forced completions can
> never count as Q33 evidence; Final Core rushing, issue resolution and generic
> completion are not authorised as primary Q33 evidence (they may remain
> labelled secondary telemetry pending event-schema disposition); any eventual
> indicator is an **exploratory short-session analogue only**, never a
> validated item score, and the game establishes nothing about whether
> real-world goals usually take days.

### Q29-Q33 overall

- All five **remain part of the final 33-item battery**.
- Their in-game analogues are **exploratory**.
- Do **not** represent them as direct measurements of literal days, years, or
  lifelong goal patterns.
- Do **not** implement five repetitive disguised questionnaire choices.
- **Shared behavioural dimensions and repeated natural choices are preferred.**

> **Supersession note (2026-07-29, §13).** The sentence above is historical
> wording and is **partially superseded** by the global ruling (§13, ruling
> §§1-2 and §12): shared behavioural dimensions remain permitted **only** as
> explicitly approved shared **construct-level** indicators. The sole currently
> authorised shared-construct exception is the Q29/Q31 goal-horizon dimension
> (one shared indicator, never two independent game-item scores). No other
> item — including Q32 and Q33 — is authorised to reuse those events or any
> other item's primary events for an item-level measure. The recently discussed
> Q27-Q33 solutions are **pending revised rulings** under §13 and are not
> approved.
>
> **Follow-up (2026-07-30, §14).** The final sentence of this 2026-07-29 note
> is now **superseded as a status statement**: the Q27-Q33 directions were
> adopted by the research owner on 2026-07-30 and are recorded in §14 as
> approved **measurement-design** authority (SA-1..SA-6, SA-12, SA-13). The
> rest of this note **stands**: Q29/Q31 remains the sole shared-construct
> exception, and no item may build a primary measure on another item's primary
> events. Q32 and Q33 are authorised **their own independent modules** — that
> is not a reuse permission, and it does not make them validated item scores.
> The two bullets above ("Do not represent them as direct measurements of
> literal days, years, or lifelong goal patterns"; "Do not implement five
> repetitive disguised questionnaire choices") remain binding.

---

## 7. Shared-module and non-independence rules

> **Supersession banner (2026-07-29).** This section is preserved as the
> historical shared-module doctrine. It is **superseded in part** by the global
> ruling recorded in §13 (ruling §§1, 2 and 6): a module may still be _shared
> context_ (room, NPC, art, movement, generic interaction components), but it
> may no longer supply the **primary** measurement for more than one item.
> Every item requires its own declared primary opportunity, measurement window,
> primary event family and primary behavioural variable; where similar
> mechanics are reused, a new item-specific instance and state container are
> required. "Supporting evidence" rows below remain valid **only** as
> secondary/ecological telemetry, never as primary item inputs. The single
> authorised shared-construct exception is Q29/Q31 (§13, ruling §2). Per-row
> supersession marks follow the table.

Shared evidence is shared, not multiplied. One event sequence must never be counted
as several independent item observations (specification §8).

| Module                             | Items it feeds                                                                                                       | Rule                                                                                                                          |
| ---------------------------------- | -------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| Archive failure-and-revision       | Q13 primary; Q22-Q26 supporting                                                                                      | Not six independent observations.                                                                                             |
| Systems Repair difficulty          | Q14, Q21, Q24 primary; Q22, Q23, Q25 supporting                                                                      | Cross-task convergence, not double counting (Q13/Q24 remain conceptually redundant).                                          |
| Interruption and continuity        | Q15, Q17, Q18, Q19                                                                                                   | Switching, deferment, return and abandonment stay **separate** variables.                                                     |
| Optional anomaly / side-repair arc | Q07, Q16, Q20                                                                                                        | Voluntary uptake, stages, deferment, return and completion must not be collapsed.                                             |
| **Goal-horizon**                   | Q29 + Q31 shared; Q32 weak derived                                                                                   | **One** module, **one** shared variable. Initial choice recorded **before** interruption. Never two independent observations. |
| **Goal-granularity**               | Q30 primary (exploratory); Q33 weak portfolio                                                                        | **One** module, reused; ≥2 valid opportunities preferred.                                                                     |
| Maladaptive stopping-rule          | Q26 identical repetition; Q27 continuation after utility reaches zero; Q28 explicit knowledge the action cannot work | Three **distinct** conditions; do not merge.                                                                                  |

**Architectural consequence.** Goal-horizon and goal-granularity are **shared
modules**, not five separate minigames. Q32 and Q33 get **no module of their own** —
they are derived from the same self-selected opportunities.

> **Supersession note (2026-07-29, §13).** The historical sentence above is
> preserved but **superseded in part** by the global ruling: "no module of
> their own" still stands (no separate Q32/Q33 minigame is authorised), but the
> clause "they are derived from the same self-selected opportunities" is no
> longer an authorisation. Under §13 (ruling §§1-2, 11-12) Q32 and Q33 may
> **not** reuse the Q29/Q31 goal-horizon events (or any other item's primary
> events) as item-level measures; no composite may manufacture a missing item
> measure. Any Q32/Q33 derived treatment is a **pending revised ruling**
> (SA-5/SA-6 under the new global authority). Likewise, table rows above that
> assign one module "primary" status for several items at once (Archive → Q13
> with Q22-Q26 supporting; Systems Repair → Q14/Q21/Q24 primary) are
> superseded as _primary-measurement_ claims by ruling §§1 and 6 — each item's
> primary variable requires its own item-specific event family and window; the
> historical rows remain accurate as a description of today's live shared
> telemetry.

> **Follow-up supersession (2026-07-30, §14).** Two statements above are now
> **fully superseded as current authority**:
>
> 1. The 2026-07-15 sentence "**Q32 and Q33 get no module of their own — they
>    are derived from the same self-selected opportunities**" and the
>    2026-07-29 note's retention of "no module of their own". Under §14
>    (SA-5, SA-6) Q32 and Q33 each have an **approved distinct measurement
>    module** — the Q32 Active Project Portfolio and the Q33 Contract Closure
>    Queue — with their own opportunity, window, state container and eventual
>    primary event family, independent of Q29/Q31, Side Repair, Final Core and
>    every other item's primary evidence. Neither module is implemented, and
>    neither approves a canonical event or a formula.
> 2. The §7 table rows "Goal-horizon → Q32 weak derived" and
>    "Goal-granularity → Q33 weak portfolio". Derivation of Q32/Q33 from the
>    Q29/Q31 or Q30 opportunities is **not** authorised in either direction:
>    not as reuse (already barred by ruling §§1-2) and no longer as the
>    intended design (superseded by their own modules). The rows remain an
>    accurate description of the older design intent only.
>
> **Unchanged:** Q29/Q31 remains the sole shared-construct exception; Q32 and
> Q33 remain questionnaire-primary Qualtrics items whose game analogues are
> exploratory short-session analogues, never validated item scores.

---

## 8. Documents and instructions known to be stale or historical

Retained as evidence; they never override current authority. Do not rewrite a
historical record merely to erase the former decision.

| Item                                                                                                                                                                                            | Status                                                                                                                                                                                                                                                                                                                                                                      |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Branch `fable-final-game-prep-from-prototype`; `prototype/bfi-grit-behavioural-mapping`                                                                                                         | **Historical.** The current branch is `fable-autonomous-game-build-v1`. Corrected in `CLAUDE.md`; the references remaining in V3 and the handoffs under `docs/ai/`, `docs/expansion/`, `docs/V1-SLICE-HANDOFF.md` are intentionally historical.                                                                                                                             |
| `game_proactive_total`, `game_detection_score`, `game_information_seeking_score`, `game_initiation_score`, `game_persistence_score`, `game_social_calibration_score`, `game_goal_balance_score` | **Obsolete.** An abandoned "proactivity" model; none exist in `ScoringManager`; no approved scoring plan contains them. Marked obsolete in `AGENTS.md`; they appear nowhere else in the repository.                                                                                                                                                                         |
| The minimal raw-event structure formerly in `AGENTS.md` (`scene`/`state_before`/`state_after`/`score_delta`)                                                                                    | **Obsolete as a governing schema.** The canonical payload is `docs/research/event-schema.md` §1. Marked obsolete in `AGENTS.md`.                                                                                                                                                                                                                                            |
| Older mechanic rationales for Q27, Q29, Q30, Q31, Q33 in V3 §5 and `docs/research/MASTER_33_ALIGNMENT.md`                                                                                       | **Superseded as rationale** by the measurement specification (tier 2). **Not superseded as event registrations** — the live `study_item_ids` remain in force until an event-schema decision changes them. See §9.                                                                                                                                                           |
| Several `scoring-plan.md` / `event-schema.md` status rows                                                                                                                                       | **Stale descriptions, not defects** — enumerated in `docs/decisions/D2-BEAT13-SCORING-DECISION-PACK.md` §4 (e.g. `final_core_force_continue` is emitted and registered but summed into no summary variable; `data_quality_*` now flows through `ComputeSummaryInput`; six Archive events marked "missing" are emitted). Correcting them is entangled with open D-decisions. |
| Fixed eight-spec filename list in `browser-qa-reviewer` / `playwright-game-verify`                                                                                                              | **Corrected.** The suite is now 23 specs under `e2e/`; both now require enumerating the actual suite.                                                                                                                                                                                                                                                                       |

**Not stale, deliberately kept:** every "Q04 is cleanup, never planning-before-acting"
prohibition in `PROJECT_SPEC.md` and the active skills/agents. These state the
correct rule and must remain.

---

## 9. Open decisions requiring research-owner approval

**No open decision may be resolved autonomously by an agent.** Not by a reviewer,
not by an implementer, not by inference from a document's modification date, and not
by picking the option that unblocks the work. If a bounded pass reaches one of these,
that is where the pass stops.

### 9.1 Decisions arising from this alignment pass

Each records a conflict between the **approved newer rationale** (tier 2) and a
**live registration or absent mechanic** (tiers 3-4).

> **Status banner (2026-07-30, §14) — READ BEFORE USING THIS TABLE.**
> **SA-1, SA-2, SA-3, SA-4, SA-5 and SA-6 are no longer open at the
> measurement-design level.** The research owner ruled them on 2026-07-30;
> the ruling texts are in §14.1 and they are binding tier-2 authority. **SA-7
> remains open** and is unaffected.
>
> What each of SA-1..SA-6 **still leaves open** is only its tier-3/tier-4
> residue, which the rows below continue to describe accurately:
>
> | ID   | Ruled at measurement-design authority (§14.1)                | Still open                                                                                                                                                                                                                    |
> | ---- | ------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
> | SA-1 | Hazard = Q12 prudence; Q27/Q31 take no primary from Hazard   | **Event-schema**: disposition of the Q27/Q31 cross-tags (temporarily retained as labelled legacy/secondary ecological telemetry). **Scoring-plan**: correction of inappropriate-persistence formulas containing Hazard terms. |
> | SA-2 | Dedicated Q27 utility-stop module approved for design        | **Event-schema + scoring-plan**: canonical events and any scoring use. Implementation is a separate approved pass.                                                                                                            |
> | SA-3 | Two matched Q29/Q31 horizon situations; one shared indicator | **Event-schema + scoring-plan**; implementation pass. Stabiliser/Hazard/shared-arc tag disposition rides SA-1 and the event-schema unit.                                                                                      |
> | SA-4 | ≥2 independent Q30 granularity opportunities approved        | **Event-schema + scoring-plan** (incl. removal/retention of the prohibited `inventory_verification_skipped` Q30 tag); implementation pass.                                                                                    |
> | SA-5 | Distinct Q32 Active Project Portfolio module approved        | **Event-schema** (legacy Q32 proxy-tag disposition); **scoring-plan** only if an exploratory indicator is ever specified; implementation pass.                                                                                |
> | SA-6 | Distinct Q33 Contract Closure Queue module approved          | **Event-schema** (Final-Core Q33 tag disposition); **scoring-plan** only if an exploratory indicator is ever specified; implementation pass.                                                                                  |
>
> The rows below are **preserved as the original decision requests** and as an
> accurate description of the live tree, which §14 does not change. Read them
> together with this banner and with §14.1 — never as evidence that the
> measurement-design question is still undecided.

| ID       | Decision                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    | Evidence                                                                                                                                              | Requires                                                                    |
| -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| **SA-1** | **Q27's live Hazard mapping.** `hazard_reckless_continue` is registered `study_item_ids: ['Q12','Q27','Q31']`, `construct_id: 'inappropriate_persistence'`, and is a term in `game_inappropriate_persistence`. The approved rationale makes utility-stop continuation Q27's primary analogue and keeps Hazard principally prudence/carefulness. Does `Q27` stay on this event (as secondary evidence), and does the event remain an inappropriate-persistence scoring term?                                                                                                                 | `src/world/CanonicalEventContext.ts` (hazard block); `ScoringManager` `blind_retry_count`; `MASTER_33_ALIGNMENT.md` Q27 row; specification §Q27, §Q12 | **Event-schema + scoring-plan**                                             |
| **SA-2** | **Q27 utility-stop module.** No utility-stop mechanic exists. The specification's candidates (`utility_stop_signal`, `no_additional_benefit_explained`, `unnecessary_cycle_started`, `unnecessary_cycle_completed`, `task_stopped_appropriately`; indicators `excess_continuation_count`, `no_point_persistence_flag`) are **candidates only**. Approve the mechanic, the canonical event names, and whether/how it feeds inappropriate persistence.                                                                                                                                        | Specification §Q27; no corresponding entries in `event-schema.md`                                                                                     | **Event-schema + scoring-plan**                                             |
| **SA-3** | **Q29/Q31 shared goal-horizon module.** No balanced horizon-choice module exists. Live: `stabiliser_option_offered`, `stabiliser_accepted`, `final_core_stability_bonus` → `['Q29']` (older delayed-benefit-side-repair rationale); `Q31` exists **only** on Hazard events. `MASTER_33_ALIGNMENT.md` further names **separate** Q29 (`delayed_benefit_investment`) and Q31 (`informed_delay_choice`, `risky_shortcut_count`) variables — implementing those as written would **double count** one dimension. Approve: the module, its canonical events, and the **single shared** variable. | `CanonicalEventContext.ts`; `MASTER_33_ALIGNMENT.md` Q29/Q31 rows; specification §Q29, §Q31, §8                                                       | **Event-schema + scoring-plan**                                             |
| **SA-4** | **Q30's live granularity mapping.** `inventory_verification_skipped` → `['Q02','Q30']` and `inventory_verified_complete` → `['Q30']` (`goal_time_exploratory`) infer Q30 from **skipped preparation**, which the approved rationale prohibits. No goal-granularity module (small independent work orders vs one integrated audit) exists; its candidates are unapproved. Approve: removing/retaining the Q30 tags, and the granularity module's events and variable.                                                                                                                        | `CanonicalEventContext.ts` (inventory block); `MASTER_33_ALIGNMENT.md` Q30 row; specification §Q30                                                    | **Event-schema + scoring-plan**                                             |
| **SA-5** | **Q32 raw tags.** `side_repair_completed` → `['Q07','Q16','Q32']` and `final_bonus_unlocked` → `['Q32']`. Approved rationale: very weak extended-goal engagement proxy; **no distinct validated Q32 game score**. No Q32 score exists today (`optional_future_benefit_score` is unimplemented). Confirm the raw Q32 tags may remain as weak-proxy telemetry, and that `optional_future_benefit_score` is **not** to be implemented as a Q32 score.                                                                                                                                          | `CanonicalEventContext.ts`; `scoring-plan.md` §2; specification §Q32                                                                                  | **Event-schema** (scoring-plan only if a proxy variable is ever authorised) |
| **SA-6** | **Q33's live Final-Core mapping.** `final_core_rushed` → `['Q11','Q33']`, `final_core_issue_resolved` → `['Q33']`, `final_core_completed` → `['Q06','Q33']` infer Q33 from **rushing / resolution of unresolved issues**, which the approved rationale prohibits. The approved alternative is an end-session portfolio over **self-selected** goal opportunities (excluding required short tasks) — which depends on SA-3/SA-4 existing first. Approve: removing/retaining the Q33 tags, and whether the portfolio variable is authorised.                                                  | `CanonicalEventContext.ts` (final-core block); `MASTER_33_ALIGNMENT.md` Q33 row; specification §Q33                                                   | **Event-schema + scoring-plan**                                             |
| **SA-7** | **Exploratory-label wording for Q18/Q20.** Live mappings are consistent, but the surfaced label mechanism is itself open (D2 sub-item 4). Confirm the label text for Q18 ("weak goal-continuity proxy — not long-term-focus measurement") and Q20 ("very weak start-without-sustain; questionnaire-primary; no validated game score").                                                                                                                                                                                                                                                      | `scoring-plan.md` §8; specification §Q18, §Q20                                                                                                        | **Scoring-plan**                                                            |

### 9.1b Decisions arising from implementation units (post-alignment)

| ID       | Decision                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         | Evidence                                                                                                                           | Requires                                    |
| -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------- |
| **SA-8** | **Q09 registration for `engineer_report_accuracy_scored` (FABLE-NEXT-04).** The event is now emitted (once per submission, at report-content selection) as **unmapped raw telemetry** — no CanonicalEventContext registration exists, withheld on purpose. The measurement specification lists report accuracy as a primary Q09 measurement, and `report_accuracy_score` is an approved-but-missing scoring-plan target. Approve/deny: adding a `['Q09']`/`responsibility` registration for the event (and only then any D2-family scoring use). | `src/scenes/EngineerScene.ts` (NEXT-04 content stage); `event-schema.md` §4 Engineer Hub payload clarification; specification §Q09 | **Event-schema** (scoring-plan only via D2) |

| **SA-9** | **Interruption return-act co-fire (FABLE-NEXT-05).** The observed physical return act (re-engaging the Relay Checkpoint after a committed switch while the original check-in is still pending) co-fires `return_to_unfinished_task` (Q15, adaptive_persistence) and `returned_to_original_task` (Q17, CI-exploratory) at the same moment — the task file's binding table flags whether the co-fire stands (two Q-carriers over one shared observation, never analysed as two independent observations) or one name is folded into the other. Deliberately not decided locally. | `src/scenes/InterruptionScene.ts` (onCheckpointOpened); `event-schema.md` §4 Interruption Corridor; task file FABLE-NEXT-05 events table; spec §8 | **Event-schema** |

| **SA-10** | **`task_completed_after_interruption` and the ignore branch (FABLE-NEXT-05).** The Q15 carrier fires at the original check-in's completion whenever the beacon interruption "occurred earlier in the session" — currently a temporal reading that includes the IGNORE branch (the participant saw the alert, ignored it, and later completed the check-in). Whether an ignored alert counts as "interrupted" for this shared-evidence carrier, or the event should be restricted to acknowledged/switched branches, is a trigger-semantics question the binding table leaves ambiguous. Deliberately not decided locally; current behaviour (temporal reading) is documented and spec-pinned on the acknowledge branch. | `src/scenes/InterruptionScene.ts` (completeCheckpoint); task file FABLE-NEXT-05 events table; room doc 07 | **Event-schema** |

| **SA-11** | **Inventory requisition-checklist display (FABLE-NEXT-06).** The NEXT-06 task file mandates a visible "requisition checklist" in the Inventory visual interface, but a live packed-state display pre-empts the checklist-consultation measurement (`inventory_checklist_opened` is the only Q01 checklist-credit event) and the verify-vs-skip choice (`inventory_verified_complete` / `inventory_verification_skipped`), and makes the legacy "without checking the list" option incoherent. The shipped panel conservatively shows only fiction-self-evident state (carried slot, bench contents) with NO requisition display until ruled. Options: live ticks (accept + record the confound), static names-only list, checklist-action-gated display, or keep none. | `src/scenes/InventoryScene.ts` (refreshPrepStatusPanel SA-11 comment); NEXT-06 task file §B; UI-PRESENTATION-CONTRACT.md §2 | **Measurement-environment ruling** (event-schema unaffected) |

Request form: `docs/decisions/RESEARCH-OWNER-RULING-FORM.md` §SA-8, §SA-9, §SA-10, §SA-11.

### 9.1c Recorded dispositions from the FABLE-NEXT-09 coverage audit (closed)

Raised by the Q01-Q33 gameplay-coverage audit
(`FABLE-NEXT-09-Q01-Q33-GAMEPLAY-COVERAGE.md` §13, audit baseline `d4d9bf1`)
and **approved as recorded in that contract**. Mirrored here 2026-07-25 by the
NEXT-09 Phase 1 documentation pass. These dispositions are **closed**; they
resolve nothing else — every SA-/D-/INT- entry above and below stands
unchanged, and no event name, mapping, formula, or participant-facing content
is promoted by this record.

| ID               | Disposition                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| ---------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **NEXT-09-OD-1** | **RESOLVED (framing-only).** Archive and Systems Repair become assigned duties on the participant duty roster; they remain skippable; omissions remain observable at Final Core; the existing four-scenario Final Core gate remains unchanged. Route-gate extension is removed as an option under the NEXT-09 contract. The framing change itself lands only in its own approved implementation pass (nothing is coded by Phase 1).                       |
| **NEXT-09-OD-2** | **APPROVED (documentation-only).** The `scenario_*` family and `final_core_blocked_pending_decisions` are to be documented in `event-schema.md`'s raw unmapped-telemetry section as emitted reality — with no study-item mapping and no scoring promotion of any kind. The `event-schema.md` edit is **not** part of Phase 1 (not an authorised Phase 1 file); it is owed to a later approved documentation pass.                                         |
| **NEXT-09-OD-3** | **APPROVED.** `prepared_tool_used` fires exactly once, and only when a previously packed task-relevant tool is retrieved from its stored location and first applied to the Systems Repair task — never on container opening, item selection, display, or carrying. A session with no qualifying packed tool is a no-opportunity state. This fixes the emission definition only; building the retrieval episode remains gated on NEXT-09 Phase 2 approval. |

### 9.1d Research-owner rulings on NEXT-09 Phase 2 implementation questions

Issued by the research owner after the Phase 2 landing (`81c36bb`,
2026-07-25) and mirrored here verbatim. Each ruling closes exactly the
question it names and resolves nothing else.

| ID                | Ruling                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **NEXT-09-P2-R1** | **APPROVED.** The Diagnostic Probe is the approved task-relevant tool for the Q03 prepared-tool retrieval episode. Its identity is fiction-tier, has no independent construct, scoring or validity meaning, and may later be visually or fictionally replaced without changing the storage, retrieval and first-application measurement semantics.                                                                                                            |
| **NEXT-09-P2-R2** | **APPROVED.** A qualifying opportunity exists only after Inventory preparation has been closed out. The Diagnostic Probe must previously have been packed into the Field Kit Crate and must currently be in a stored container. Its current stored location governs retrieval. A probe left on the bench, stored without previously being packed, or present during unfinished preparation is a no-opportunity state rather than participant non-performance. |

Both Phase 2 report items are now closed: R1 rules the tool identity, R2
rules the qualifying-state definition (confirming the implemented
prep-close-out + previously-packed + currently-stored test and its
no-opportunity coding). The live implementation at `81c36bb` conforms to
both rulings as coded; no code change results from this record.

### 9.2 Pre-existing open decisions (unchanged by this pass)

Recorded here for completeness; owned by their existing packs.

- **D2** — Beat-13 scoring, four sub-items: `strategy_revision_count`
  prudence-mixing; `game_inappropriate_persistence` 4th term
  (`final_core_force_continue`); `final_quality_score` shape;
  exploratory-label mechanism. → `docs/decisions/D2-BEAT13-SCORING-DECISION-PACK.md`,
  `docs/decisions/RESEARCH-OWNER-RULING-FORM.md`.
- **D3** — Dock idle threshold / "idle" definition (blocks `baseline_idle_seconds`,
  `excessive_idle_after_instruction`).
- **D4** — `construct_id` for abandon/return events (Q24/Q25 family).
- **D5** — `engineer_report_submitted_supervised` canonical mapping.
- **D6** — `interruption_alert_acknowledged` → `competing_task_viewed` mapping.
- **D7** — `task_started` Q-listing conflict (V3 §5 Q05+Q15 vs `MASTER_33` Q05 only).
- **D8** — Stimulus-freeze reviewer dispositions (asset audit).
- **INT-1, INT-2, INT-5** — completion/Qualtrics return mechanism; raw-event export
  channel; status taxonomy. **INT-3** empty-identity handling, **INT-4**
  return-scheme/host allow-list, **INT-6** `asset_set_version` payload authorisation.
  → `docs/decisions/QUALTRICS-INTEGRATION-DECISION-PACK.md`.
- **D1** — Hazard route avoidance. **Resolved** 2026-07-12 (Option A); held verbatim.

> This queue is not padded and not emptied for tidiness. Where the live tree already
> matches the approved rationale (Q04, Q18, Q20), that is recorded as consistent
> rather than manufactured into a decision.

---

## 10. Implementation dependency per refined mechanic

What each refined mechanic needs **before** it may be implemented.

| Refined mechanic                                    | Decision required                                                                                                                                                                                                                                                |
| --------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Q04 explicit cleanup / restoration                  | **No schema change** — approved rationale and live registration already agree.                                                                                                                                                                                   |
| Q18 weak goal-continuity proxy                      | **No schema change** for the raw events (`objective_active`, `final_unresolved_due_to_nonreturn`). **Scoring-plan** only for the surfaced exploratory label (SA-7, D2 sub-item 4).                                                                               |
| Q20 start-without-sustain (anomaly arc)             | **No schema change** for the existing raw events. **No scoring-plan decision is being sought** — no Q20 score is approved (SA-7 covers the label only).                                                                                                          |
| Q27 utility-stop continuation module                | **Both** — event-schema **and** scoring-plan (SA-2), plus SA-1 for the Hazard tags it displaces.                                                                                                                                                                 |
| Q27/Q12 Hazard tags and scoring term                | **Both** — event-schema **and** scoring-plan (SA-1).                                                                                                                                                                                                             |
| Q29/Q31 shared goal-horizon module                  | **Both** — event-schema **and** scoring-plan (SA-3).                                                                                                                                                                                                             |
| Q30 goal-granularity module                         | **Both** — event-schema **and** scoring-plan (SA-4).                                                                                                                                                                                                             |
| Q30 tags on inventory verification events           | **Event-schema** (SA-4).                                                                                                                                                                                                                                         |
| Q32 Active Project Portfolio module (SA-5)          | **Design approved** (§14.1). **Event-schema** for its own event family and for the legacy proxy-tag disposition; **scoring-plan** only if an exploratory indicator is ever specified — none is today.                                                            |
| Q33 Contract Closure Queue module (SA-6)            | **Design approved** (§14.1). **Event-schema** for its own event family and the Final-Core tag disposition; **scoring-plan** only if an exploratory indicator is ever specified. **No longer blocked behind SA-3/SA-4** — the module is independent, not derived. |
| Q33 tags on Final Core rush/resolve/complete events | **Event-schema** (SA-6).                                                                                                                                                                                                                                         |
| Independent Q03 opportunity (SA-12)                 | **Design approved** (§14.1). **Event-schema + scoring-plan**, then its own implementation pass. The existing prepared-tool retrieval episode stays secondary ecological evidence.                                                                                |
| Validity/counterbalance data elements (SA-13)       | **Design approved** (§14.1) as **required semantic data elements**. Exact field names, types, enumerations and payload contracts are reserved for the **event-schema** ruling.                                                                                   |
| Corridor de-gating (Q15/Q17/Q19)                    | **Design approved** (§14.1). Implementation pass; SA-9, SA-10 and D6 still govern item-specific event ownership and ignored-alert/acknowledgement semantics.                                                                                                     |
| Final Core baseline issue/blocker (Q11/Q28)         | **Design approved** (§14.1). Implementation pass; Q11/Q28 event ownership and scoring formulas remain unresolved.                                                                                                                                                |

---

## 11. No autonomous resolution

**No open decision in §9 may be resolved autonomously by an agent.** This applies to
every skill, every review agent, and the main agent alike.

- A conflict between the newer rationale and a live registration is a **finding**,
  not a licence to edit.
- A missing mapping, weight, threshold or formula is a **stop condition**, not a gap
  to fill with a plausible guess.
- Approval is never inferred — not from a document's modification date, not from a
  reviewer's agreement, not from a specification sentence, and not from the fact that
  the work is otherwise blocked.
- The branch name `fable-autonomous-game-build-v1` authorises nothing. Bounded
  work-unit discipline applies in full.

Route every open decision to the research owner via
`docs/decisions/RESEARCH-OWNER-RULING-FORM.md`.

---

## 12. What the measurement specification is, and is not

`docs/scientific/Q01-Q33_GAMIFIED_MEASUREMENT_SPECIFICATION.md` is the
**authoritative behavioural-translation source** and the **machine-readable working
source** — the file to read and cite. Its `.docx` twin is the **human-review
companion** for the research owner; the two are the same content in two forms, and
**neither document alone approves a production event name or a scoring formula.**

The specification's own words (§Document status, §1): _"This document specifies
behavioural analogues and candidate measurements. It does not approve final scoring
weights, cut-offs, composite formulas, missing-data rules or production event-schema
changes."_

Therefore:

- Its **"Candidate raw events"** rows are **candidates**. They become canonical only
  via `docs/research/event-schema.md`, through a research-owner decision.
- Its **"Candidate derived indicators"** rows are **candidates**. They become
  formulas only via `docs/research/scoring-plan.md`, through a research-owner
  decision.
- Its **rationale, measurement windows, evidential-strength labels and
  questionnaire-primary/exploratory treatment** are **authoritative now**.
- Its §8.2 list (no-opportunity coding, debounce rules, first-vs-final response,
  deferment vs abandonment, incomplete sessions, weighted composites) is explicitly
  **still requiring approval** and must not be resolved by inference.

A candidate name that appears in a spec assertion, a test expectation, or a code
comment has been **silently promoted** — that is the failure mode this section
exists to prevent.

---

## 13. Global scientific ruling — item separation, local independence and carryover control (APPROVED)

**Provenance.** Issued by the research owner and received 2026-07-29
(NEXT-09 global-ruling adoption pass, branch
`fable-next-09-global-measurement-ruling-v1`). Recorded verbatim in §13.1.
This ruling is **binding scientific authority** at tier 2 (behavioural
translation / measurement design). Per its own §9, it approves **no canonical
event or payload name** — exact names remain tier-3 event-schema decisions —
and per §12 it authorises no new composite. It supersedes older rationale
**within its own domain only** (CLAUDE.md authority hierarchy): live event
registrations, scoring formulas and build discipline are untouched until their
own rulings.

### 13.1 Ruling text (verbatim)

> GLOBAL-SCIENTIFIC-RULING — ITEM SEPARATION, LOCAL INDEPENDENCE
> AND CARRYOVER CONTROL — APPROVED
>
> 1. ITEM-SPECIFIC PRIMARY MEASUREMENT
>
> Each Q-item behavioural analogue must have:
>
> - one declared primary measurement opportunity or repeated set of
>   item-specific opportunities;
> - one item-specific measurement window;
> - one item-specific primary event family;
> - one item-specific primary behavioural variable.
>
> A primary item variable may use only behavioural events generated inside
> that item's declared measurement window.
>
> No raw behavioural event, scored state, outcome or derived variable may
> contribute to more than one primary item-level variable.
>
> 2. SHARED CONSTRUCT EXCEPTION
>
> Where an approved scientific rationale treats multiple questionnaire items
> as opposite expressions of one behavioural dimension, the game may produce
> one explicitly shared construct-level indicator rather than false independent
> item indicators.
>
> The currently approved Q29/Q31 goal-horizon dimension is such an exception.
> The same horizon choices must not be reported as two independent game-item
> scores.
>
> 3. WITHIN-ITEM LONGITUDINAL STATE
>
> A measurement may extend across rooms, interruptions or later return when
> that temporal sequence is part of the meaning of the same item.
>
> All stages must share one item-specific opportunity identifier and must not
> serve another item's primary variable.
>
> Examples include commitment follow-through, task return after interruption
> and continuity of a background objective.
>
> 4. CROSS-ITEM CARRYOVER FIREWALL
>
> The outcome of one item must not determine or materially alter another
> item's:
>
> - opportunity availability;
> - entry state;
> - instructions or NPC wording;
> - option number or option position;
> - task difficulty;
> - action count;
> - expected duration;
> - reward, consequence or social approval;
> - time pressure;
> - available tools or inventory;
> - completion route;
> - scoring rule.
>
> Every primary item opportunity must begin from a standardised or
> counterbalanced measurement-relevant entry state.
>
> 5. NARRATIVE CONTINUITY
>
> Narrative and visual consequences may persist across the game only when they
> do not alter a later item's measurement-relevant conditions.
>
> Cross-room ecological evidence may be retained as secondary raw telemetry,
> but it may not replace or contaminate the later item's primary indicator.
>
> 6. SHARED ROOMS, NPCS AND MECHANICS
>
> Items may share rooms, NPCs, art assets, movement controls or generic
> interaction components.
>
> They may not share:
>
> - scored task state;
> - progress state;
> - primary behavioural events;
> - outcome consequences;
> - item-variable inputs.
>
> When similar mechanics are reused, a new item-specific instance and state
> container are required.
>
> 7. ORDER, PRACTICE AND CONTRAST EFFECTS
>
> Order-sensitive measurement modules and matched scenario forms must be
> counterbalanced where narrative prerequisites permit.
>
> At minimum, the design must counterbalance:
>
> - option position within each choice;
> - matched scenario form;
> - repeated opportunity order;
> - order of conceptually similar modules where feasible.
>
> Fixed order is permitted only when scientifically necessary. Its rationale
> must be documented and the order must be exported as a control variable.
>
> Counterbalancing does not by itself establish absence of carryover.
>
> 8. FEEDBACK AND AFFECTIVE CONTAMINATION
>
> Before all potentially related measures are complete, the game must not
> provide feedback that reveals:
>
> - the preferred or correct personality response;
> - a trait interpretation;
> - relative performance;
> - praise or criticism capable of changing later motivation.
>
> Operational consequences may be shown only when required for the current
> item and when they do not change later measurement conditions.
>
> A brief neutral transition should separate closely related failure,
> persistence, stopping-rule and goal-time modules where practical.
>
> 9. OPPORTUNITY VALIDITY AND CONTAMINATION
>
> The raw data must preserve enough information to identify:
>
> - item and measurement opportunity;
> - presentation order and counterbalance condition;
> - whether the entry state was valid and standardised;
> - relevant prior module exposure;
> - technical or comprehension failure;
> - suspected carryover contamination;
> - whether the opportunity is valid for primary analysis.
>
> Exact canonical event and payload names require a later event-schema ruling.
>
> A contaminated or absent opportunity is missing or invalid measurement,
> not behavioural non-performance. It must never be assigned a low trait score.
>
> 10. PILOT VALIDATION
>
> Before item variables or construct composites are treated as validated
> measures, pilot analysis must test:
>
> - order and scenario-form effects;
> - practice, fatigue and contrast effects;
> - dependency between items sharing a room, NPC or mechanic;
> - whether earlier outcomes predict later item responses after controlling
>   for the intended construct;
> - response variation and missing-opportunity patterns;
> - discriminant relationships among neighbouring item variables.
>
> Material residual dependency or carryover requires redesign, separate
> modelling as a testlet/context effect, or removal from primary item scoring.
> It must not be ignored or interpreted as reliability.
>
> 11. EXISTING IMPLEMENTATION
>
> Existing shared or cross-room events may remain as raw or secondary
> ecological telemetry.
>
> They are not automatically authorised as independent primary item
> measurements.
>
> In particular, the existing Q03 prepared-tool retrieval episode remains
> valuable ecological evidence, but because its opportunity depends on prior
> Inventory behaviour, it cannot be the sole independent Q03 primary measure
> under this ruling. A later Q03-specific standardised opportunity or equivalent
> independence remedy is required.
>
> 12. SCORING SEPARATION
>
> Item-level variables, construct-level indicators, exploratory proxies,
> legacy composites and control variables must remain separate in the export.
>
> No composite may be used to manufacture a missing item measure, and no
> apparently improved reliability may be claimed from duplicated or locally
> dependent evidence.

### 13.2 Supersession register

Historical wording is preserved at its original location and marked in place;
this register is the index. "Superseded" always means _superseded as
rationale/authorisation within tier 2_ — live registrations and formulas remain
in force until their own tier-3/tier-4 rulings (§9 queue).

| #   | Historical statement (location, preserved verbatim)                                                                                                                                                                                                                                                                                                   | Status under §13                                                                                                                                                                                                                                                                               | Superseding section   |
| --- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------- |
| 1   | §7 shared-module table — modules supplying "primary" evidence to several items at once (Archive → Q13 + Q22-Q26 supporting; Systems Repair → Q14/Q21/Q24 primary), mirrored in specification §8                                                                                                                                                       | Superseded as a primary-measurement doctrine: one module may not supply more than one item's primary variable; shared rows remain valid as secondary/ecological telemetry description                                                                                                          | Ruling §§1, 6         |
| 2   | §7 / §6 "Q29-Q33 overall" — "Shared behavioural dimensions and repeated natural choices are preferred"; "Q32 and Q33 … are derived from the same self-selected opportunities"                                                                                                                                                                         | Superseded in part: Q29/Q31 is the **only** authorised shared-construct indicator; Q32/Q33 reuse of Q29-Q31 events as item measures is not authorised; any derived treatment is a pending revised ruling                                                                                       | Ruling §§1, 2, 11, 12 |
| 3   | Cross-item event reuse embedded in live registrations (`src/world/CanonicalEventContext.ts`: e.g. `hazard_reckless_continue` → Q12/Q27/Q31; `repair_strategy_revision` → Q14/Q21/Q23; `side_repair_completed` → Q07/Q16/Q32; `final_core_completed` → Q06/Q33; `inventory_verification_skipped` → Q02/Q30; `archive_strategy_revision` → Q13/Q22/Q26) | Superseded **as rationale only**: multi-item tags cannot feed more than one primary item variable. The registrations themselves stay live (tier 3) until event-schema rulings (SA-1, SA-3..SA-6, D-family)                                                                                     | Ruling §§1, 6, 11     |
| 4   | Coverage-contract / Phase-2 working assumption that the landed Q03 prepared-tool retrieval episode closes Q03's measurement gap (`FABLE-NEXT-09-Q01-Q33-GAMEPLAY-COVERAGE.md` §6-Q03; NEXT-09-P2-R1/R2 remain valid rulings on tool identity and qualifying state)                                                                                    | Superseded in part: the episode remains valuable **secondary ecological evidence**, but because its opportunity depends on prior Inventory behaviour it cannot be the sole independent Q03 primary measure; an independent Q03 remedy is required                                              | Ruling §11            |
| 5   | Local-independence and carryover assumptions implicit in the connected-world design (Final Core issue flags fed by earlier rooms; corridor opportunity gated on the accepted relay duty; retrieval episode gated on packing) — historical docs treat these as unproblematic ecological design                                                         | Superseded as an assumption: each such dependency is now a recorded carryover/opportunity-gating exposure requiring a standardised or counterbalanced entry state, contamination coding, or an independence remedy (see `docs/research/NEXT-09-ITEM-SEPARATION-AND-CARRYOVER-CONTROL-PLAN.md`) | Ruling §§4, 5, 9      |
| 6   | Specification §8 shared-module wording and §7-mirrored module table (spec v0.1)                                                                                                                                                                                                                                                                       | Updated in place 2026-07-29 (spec v0.2) with the same supersession semantics; historical wording preserved there under explicit supersession marks                                                                                                                                             | Ruling §§1-12         |

> **Row-2 follow-up (2026-07-30, §14).** Row 2's closing phrase "any derived
> treatment is a **pending revised ruling**" is **superseded as a status
> statement** by §14.1 (SA-5, SA-6). The rest of row 2 stands unchanged and is
> reinforced, not relaxed: Q29/Q31 remains the only authorised shared-construct
> indicator, and Q32/Q33 reuse of the Q29-Q31 events as item measures is still
> **not authorised**. What changed is the remedy — Q32 and Q33 each receive
> their **own independent module** (Active Project Portfolio; Contract Closure
> Queue) instead of any derived treatment. The "Status under §13" column
> remains an accurate record of the position **under §13 alone**, which is
> itself unchanged and immutable.
>
> Row 6 likewise now reads spec **v0.3** (2026-07-30) for the §14 application;
> the v0.2 record stays accurate for the 2026-07-29 pass.

### 13.3 What this ruling does NOT do

- It does **not** rename, add, remove or retag any event (§9 of the ruling:
  canonical names require a later event-schema ruling).
- It does **not** change any scoring formula, weight or composite.
- It does **not** resolve SA-1..SA-11, D2..D8 or INT-1..INT-6. Those stay open
  and are now to be evaluated **under** this global authority.
- It does **not** approve the recently discussed Q27-Q33 item-specific
  solutions (including every option and copy-paste ruling text in
  `docs/research/NEXT-09-PHASE-3-SCIENTIFIC-DECISION-DOSSIER.md`). Those are
  **pending revised rulings** under the new global authority; the dossier is a
  historical decision-evidence record and is not modified by this pass.
- It does **not** implement anything: no gameplay, no entry-state machinery,
  no counterbalancing infrastructure exists merely because this ruling is
  recorded. Implementation remains bounded, approval-gated work.

> **Status follow-up (2026-07-30).** The fourth bullet above remains an
> accurate statement about **§13's own scope** — the global ruling did not
> itself approve the Q27-Q33 item-specific solutions. It is **no longer a
> current status statement**: the research owner adopted those directions on
> 2026-07-30 and they are recorded in §14 as approved measurement-design
> authority. The `NEXT-09-PHASE-3-SCIENTIFIC-DECISION-DOSSIER.md` remains a
> **historical decision-evidence record**; §14.1, not the dossier, is the
> operative ruling text. Every other bullet in §13.3 stands unchanged — §14
> likewise renames no event, changes no formula, and implements nothing.

### 13.4 Consequential open questions routed to the research owner

> **Closed at measurement-design level (2026-07-30, §14).** Every entry in this
> subsection was **ruled by the research owner on 2026-07-30**: SA-12 (Q03
> independence remedy) and SA-13 (entry-state, counterbalance and validity
> architecture) are approved as measurement design in §14.1, and the re-scoped
> SA-1/SA-3/SA-4/SA-5/SA-6 are ruled there too. (SA-2 was never a §13.4 entry;
> it is ruled in §14.1 alongside them — see the §9.1 status banner for the full
> SA-1..SA-6 set.) The entries below are preserved
> as the original routing record. **What they still require is tier-3/tier-4
> work**: SA-13's exact field names, types, enumerations and payload contracts
> are explicitly reserved for the later event-schema ruling, and SA-12's
> canonical events and scoring remain pending.

Recorded as open; resolved only by the research owner (per §11):

- **SA-12 (new) — Q03 independence remedy.** Ruling §11 requires a
  Q03-specific standardised opportunity or equivalent independence remedy;
  design options and their event/scoring implications need a ruling
  (event-schema + measurement-environment).
- **SA-13 (new) — entry-state and counterbalance machinery.** Ruling §§4, 7
  and 9 require standardised/counterbalanced entry states, option-position
  counterbalancing, order export as a control variable, and
  opportunity-validity/contamination coding in the raw data. The concrete
  payload/flag design is an event-schema decision; nothing is implemented
  until ruled.
- **Re-scoped SA-1/SA-3/SA-4/SA-5/SA-6** — the dossier's options must be
  re-read against ruling §§1-12 before any is approved; several dossier
  options predate the firewall requirements (e.g. counterbalanced entry
  states, prohibition on outcome-dependent later opportunities).

---

## 14. Adopted research-owner measurement rulings (2026-07-30, NEXT-10) — APPROVED

**Provenance.** Issued by the research owner and received 2026-07-30
(FABLE-NEXT-10 research-owner measurement-ruling adoption unit, branch
`fable-next-10-research-owner-rulings-v1`, base `a0f298f`). The research owner
directed the project to continue by **formally adopting the previously
accepted revised measurement directions**. These rulings are binding
**tier-2** authority (behavioural translation / measurement design) and are
recorded here as the operative ruling text.

**Relationship to §13.** The 2026-07-29 global scientific ruling on item
separation, local independence and carryover control **remains approved,
binding and immutable**. §14 is issued **under** §13 and neither reinterprets,
weakens nor modifies it. Where §14 authorises a new module, it does so by
giving that item its **own independent** opportunity, window, state container
and event family — it is never a permission to reuse another item's primary
evidence, which ruling §§1-2 continue to forbid. **Q29/Q31 remains the sole
authorised shared-construct exception.**

### 14.0 Authority level — read before using any ruling below

Every ruling in §14 approves **measurement design only**. None of them
approves, and none may be read as approving:

- a **canonical production event name** or payload name — tier 3,
  `docs/research/event-schema.md`, by a separate research-owner ruling;
- a **derived variable, weight, threshold, formula or composite** — tier 4,
  `docs/research/scoring-plan.md`, by a separate research-owner ruling;
- any **implementation**. No module named below exists in the tree; building
  each remains a separately approved, bounded pass;
- any **global "good player" or personality score**, and no merging of
  adaptive with inappropriate persistence — §4 prohibitions stand absolutely.

Names such as "Utility Bot utility-stop module", "Active Project Portfolio" and
"Contract Closure Queue" are **module/opportunity designations from the ruling
text**, not event names, payload names or variable names.

**The ruling §4 firewall applies in full to every module authorised below.**
Where a §14.1 entry names only some firewall dimensions, that is an emphasis,
**never a narrowing**. For every opportunity authorised in §14, no other item's
outcome may determine or materially alter its:

> opportunity availability · entry state · instructions or NPC wording ·
> option number or option position · task difficulty · action count · expected
> duration · reward, consequence or social approval · time pressure ·
> available tools or inventory · completion route · scoring rule.

This is §13's ruling §4 verbatim in scope; §14 adds nothing to it and waives
none of it. It binds even where a module's candidate host room is shared with
other items — co-location in a room is permitted by ruling §6, but the shared
room may not supply scored task state, progress state, primary events, outcome
consequences or item-variable inputs, and a reused mechanic requires a new
item-specific instance and state container.

### 14.1 Ruling records

#### SA-1 — Hazard ownership (APPROVED)

Hazard behaviour is **principally the Q12 prudence/carefulness opportunity**.

- **Q27 and Q31 must not use Hazard events, states, outcomes or derived
  variables as primary evidence.**
- Existing Hazard cross-tags may remain **temporarily** only as **explicitly
  labelled legacy/secondary ecological telemetry**, pending the later
  event-schema unit. They are **not authorised primary inputs**.
- **Recorded for later correction:** inappropriate-persistence formulas
  containing Hazard terms require a **scoring-plan correction** in their own
  unit. **No formula is changed by this ruling.**

#### SA-2 — Q27 Utility Bot utility-stop module (APPROVED, measurement design)

A **dedicated Q27 opportunity** is approved, with these design requirements:

- a bounded useful sequence occurs first;
- a **standardised explicit signal** then states that additional cycles provide
  no operational benefit;
- the **primary window begins at that signal**;
- stopping and continuing remain **equally accessible and neutrally framed**;
- the opportunity has **its own state and eventual event family**;
- it is **independent of Hazard** and of every other persistence measure;
- neutral transition and validity controls apply.

**Independence scope (§14.0).** "Independent of Hazard and every other
persistence measure" is emphasis, not a limit: the full ruling §4 firewall
applies. In particular — because the candidate host is the post-run-check
Side Repair stage — **the Q27 opportunity's availability and entry state must
not depend on Side Repair engagement or outcome (Q07/Q16/Q20/Q32)**, and the
module requires its own instance and state container even though it shares
that bay (ruling §6).

Canonical events and scoring remain **pending**.

#### SA-3 — Q29/Q31 shared goal-horizon indicator (APPROVED, measurement design)

**Two matched, counterbalanced situations** are approved, with one
**NPC-mediated** and one **terminal-mediated** form where feasible. Each
presents:

- a **self-contained objective** with immediate closure or benefit; and
- a **distributed objective** with comparable total effort/value and delayed
  closure or benefit.

Requirements:

- record the **initial choice before interruption or consequence**;
- approximately match effort, benefit, difficulty, action count, duration,
  attractiveness and social approval;
- counterbalance option position, form, and opportunity order;
- produce **exactly one shared construct-level Q29/Q31 indicator**;
- **never** report two independent Q29 and Q31 game-item scores;
- remain independent of Hazard, Side Repair, Q32, Q33 and Final Core outcomes.

**Legacy stabiliser, Hazard and shared-arc evidence is not authorised as
primary Q29/Q31 evidence.**

#### SA-4 — Q30 goal-granularity opportunities (APPROVED, measurement design)

**At least two independent Q30 opportunities** are approved:

1. a **Vale/Inventory work-order granularity** situation;
2. a **telemetry-cache/map-movement granularity** situation.

Each compares several **independently closable smaller objectives** with **one
integrated multi-component objective**. Requirements:

- approximately balance total effort, benefit, difficulty, action count,
  duration, attractiveness and social feedback;
- use **Q30-specific instances and state**;
- counterbalance form order and option position;
- require **at least two valid opportunities** before a repeated-opportunity
  behavioural pattern is derived;
- treat absent or contaminated opportunities as **missing/invalid**;
- **do not infer Q30** from skipped verification, poor preparation,
  carelessness or Hazard behaviour.

#### SA-5 — Q32 Active Project Portfolio (APPROVED, measurement design)

A **distinct Q32 Active Project Portfolio measurement module** is approved,
with:

- its **own** opportunity, window, state container and eventual primary event
  family;
- **independence** from Q29/Q31, Side Repair and every other item's primary
  evidence;
- **standardised or counterbalanced entry conditions**;
- a firewall guarantee: earlier item outcomes **must not** alter availability,
  project count, difficulty, benefit, feedback or measurement route — **and,
  per §14.0, the full ruling §4 list applies**, including entry state,
  instructions/NPC wording, option number and position, action count, expected
  duration, time pressure, available tools or inventory, completion route and
  scoring rule.

Interpretation limits (binding):

- any eventual indicator is an **exploratory short-session analogue only**;
- the module makes **no claim** to measure literal multi-year goal duration;
- it is **never** described as a validated item score.

Legacy Q32 tags or proxies from Side Repair, bonuses or shared goal-horizon
behaviour may remain **only as labelled secondary ecological telemetry**
pending schema disposition. **They cannot feed the Q32 primary variable.**

#### SA-6 — Q33 Contract Closure Queue (APPROVED, measurement design)

A **distinct Q33 Contract Closure Queue measurement module** is approved,
with:

- its **own self-selected Q33-specific closure opportunities**;
- its **own** opportunity, window, state container and eventual primary event
  family;
- **independence** from Final Core and from Q29, Q30, Q31, Q32 and every other
  item's outcomes;
- an exclusion rule: **required short tasks and forced completions cannot
  count as Q33 evidence**;
- a firewall guarantee: earlier outcomes **must not** alter availability, queue
  content, difficulty, benefit, feedback or measurement route — **and, per
  §14.0, the full ruling §4 list applies**, including entry state,
  instructions/NPC wording, option number and position, action count, expected
  duration, time pressure, available tools or inventory, completion route and
  scoring rule.

Interpretation limits (binding):

- any eventual indicator is an **exploratory short-session analogue only**;
- the game **does not establish** whether real-world goals usually take days;
- it is **never** described as a validated item score.

**Final Core rushing, issue resolution, generic completion and other items'
completion events are not authorised as primary Q33 evidence.** They may remain
labelled secondary telemetry pending schema disposition.

#### SA-12 — Independent Q03 opportunity (APPROVED, measurement design)

A **new independently available, standardised Q03 retrieval/maintained-order
opportunity** is approved.

- Its **availability and entry state must not depend** on earlier Inventory
  behaviour, on whether a particular tool was packed, or on any other item
  outcome.
- The existing prepared-tool/probe retrieval remains **secondary ecological
  evidence only** and **cannot be the sole Q03 primary measure**.
- Canonical events and scoring remain **pending**.

This discharges the independence remedy required by ruling §11.

#### SA-13 — Validity and counterbalance architecture (APPROVED, semantic architecture)

The **semantic architecture** is approved: raw data must distinguish

- item or approved shared-construct ownership;
- measurement opportunity and instance;
- form and presentation order;
- counterbalance condition and option position;
- entry-state standardisation/validity;
- relevant prior exposure;
- comprehension failure;
- technical failure;
- carryover or contamination status and reason;
- opportunity completion, absence or censoring;
- validity for primary analysis.

**These are required semantic data elements, not approved canonical field
names.** Exact field names, types, enumerations and event payload contracts
remain **reserved for the later event-schema ruling**.

**A contaminated, technically failed, absent or otherwise invalid opportunity
is missing/invalid evidence and must never be converted into low trait
evidence.**

#### Corridor de-gating — Q15/Q17/Q19 (APPROVED, measurement design)

An **interruption opportunity for Q15/Q17/Q19 available independently of Q10
duty acceptance** is approved.

Q10 outcomes **must not alter** the corridor opportunity's availability, entry
state, wording, options, difficulty, action count, duration, reward, time
pressure, tools, route or scoring.

**Still governed elsewhere, not resolved here:** SA-9, SA-10 and D6 continue to
govern item-specific event ownership and ignored-alert/acknowledgement
semantics. **Those semantics must not be resolved autonomously.**

#### Final Core baseline — Q11/Q28 (APPROVED, measurement design)

An **identical baseline issue/blocker component for all participants** is
approved for the Q11/Q28 measurement environment.

Participant-created issues from prior rooms **may remain visible as secondary
narrative/ecological consequences**, but they **cannot** alter the baseline
opportunity or serve as substitutes for its primary evidence.

**Firewall itemisation (§14.0).** Because Q11/Q28 is ruling §4's own worked
example of a multi-dimension carryover exposure — today the inherited issue set
changes the opportunity's content, its option set (the force option appears
only with outstanding issues) and its difficulty — the full §4 list is stated
here explicitly. No earlier item outcome may alter the baseline opportunity's
availability, entry state, instructions or NPC wording, option number or option
position, task difficulty, action count, expected duration, reward/consequence/
social approval, time pressure, available tools or inventory, completion route
or scoring rule. Per-session entry-state validity coding applies (ruling §9),
and a clean session with no issues is a **no-opportunity** state — never low
responsibility and never low inappropriate persistence.

**Q11/Q28 event ownership and scoring formulas are not resolved by this
ruling.**

### 14.2 Status corrections adopted across the documentation set

The following are the **current authority** as of 2026-07-30, and every allowed
document has been reconciled to state them consistently:

1. **SA-1 through SA-6, SA-12 and SA-13 are approved at measurement-design
   authority** (§14.1).
2. **Corridor de-gating and the Final Core baseline component are approved.**
3. The **Q27, Q29/Q31, Q30, Q32 and Q33 modules are authorised for later
   implementation but are NOT implemented.** None exists in the tree.
4. **Q32 and Q33 no longer have "no distinct module permitted" as current
   authority.** Each has an approved distinct module (SA-5, SA-6).
5. **Older "Q32/Q33 derived from shared opportunities" language is
   superseded** — marked in place at §6 (Q32, Q33, "Q29-Q33 overall") and §7,
   never deleted.
6. **Q32 and Q33 remain questionnaire items administered in Qualtrics**, and
   remain questionnaire-primary.
7. **Their game analogues are exploratory and separate — not validated
   replacements** for the questionnaire items.
8. **Q29/Q31 remains the sole shared-construct exception** (§13, ruling §2).
9. **Candidate events and variables remain noncanonical.** Nothing in §14
   promotes a candidate name.
10. **Event-schema, infrastructure, individual module and scoring work remain
    separate future units.**

Historical text is **preserved and marked superseded in place**. Nothing has
been rewritten to make an older decision appear never to have existed.

### 14.3 What these rulings do NOT do

- They do **not** rename, add, remove or retag any event. The live
  registrations in `src/world/CanonicalEventContext.ts` and
  `docs/research/event-schema.md` are **unchanged**.
- They do **not** change any scoring formula, weight or composite. In
  particular, the Hazard terms inside the inappropriate-persistence family are
  **recorded for correction, not corrected**.
- They do **not** implement any module, entry-state machinery, counterbalancing
  infrastructure or validity-coding payload.
- They do **not** resolve SA-7, SA-8, SA-9, SA-10, SA-11, D2..D8 or
  INT-1..INT-6. Those remain open and are now to be read **under** §13 and
  §14 together.
- They do **not** modify `docs/research/NEXT-09-PHASE-3-SCIENTIFIC-DECISION-DOSSIER.md`,
  which remains a historical decision-evidence record superseded as ruling text
  by §14.1.
- They do **not** authorise any Q32/Q33 reuse of another item's primary
  evidence, and they create no composite that could manufacture a missing item
  measure (ruling §12).

### 14.4 Remaining gates before anything is built or scored

| Gate                                        | Owner / document                          | Status                                                                                                                       |
| ------------------------------------------- | ----------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| Canonical event names and payload contracts | `docs/research/event-schema.md` (tier 3)  | **OPEN** — required for every SA-1..SA-6/SA-12 module, for SA-13's field design, and for the corridor/Final Core changes.    |
| Derived variables and formulas              | `docs/research/scoring-plan.md` (tier 4)  | **OPEN** — including the SA-1 Hazard-term correction and any exploratory Q32/Q33 indicator.                                  |
| Validity/counterbalance infrastructure      | Event-schema, then an implementation pass | **OPEN** — SA-13 approves the semantics only.                                                                                |
| Module implementation (one pass each)       | `room-builder` discipline, approval-gated | **NOT STARTED** — Q27 utility-stop, Q29/Q31 horizon ×2, Q30 granularity ×2, Q32 portfolio, Q33 closure queue, Q03 retrieval. |
| Corridor de-gating implementation           | Approval-gated implementation pass        | **NOT STARTED** — and SA-9/SA-10/D6 semantics stay open.                                                                     |
| Final Core baseline implementation          | Approval-gated implementation pass        | **NOT STARTED** — Q11/Q28 ownership and formulas stay open.                                                                  |
| Pilot validation battery                    | Ruling §10; research owner                | **NOT STARTED** — no item variable or composite may be called validated before it runs.                                      |

### 14.5 Open question raised by the NEXT-10 review (not resolved here)

- **NEXT-10-Q1 — historical-preservation convention across document layers.**
  The authority/traceability review observed that this record (the tier-2
  ruling record) preserves every superseded sentence in place and appends a
  dated note, whereas the three operational registers —
  `NEXT-09-ITEM-SEPARATION-AND-CARRYOVER-CONTROL-PLAN.md` tables, the
  specification's per-item "Measurement independence and carryover" rows, and
  `next-09-item-measurement-ownership.json` fields — **overwrite** status text
  in place (e.g. `(pending SA-12)` → `(SA-12 APPROVED; unbuilt)`), matching
  those documents' own pre-existing current-status convention and disclosed by
  their dated banners/`revisions` records, with prior wording recoverable from
  git history.

  The review found **no scientific contradiction** arising from this, and this
  pass did not change the convention it inherited. But whether the operational
  registers must be retrofitted to the preserve-and-annotate standard used
  here is a **governance decision for the research owner** — recorded, not
  taken. Per §11 it is not resolved autonomously, and nothing in this pass
  depends on the answer.
