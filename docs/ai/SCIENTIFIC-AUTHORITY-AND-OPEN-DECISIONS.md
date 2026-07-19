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

### Q29 — prefers long-term goals

- Shares **one** goal-horizon behavioural dimension with Q31 (see below).
- **Exploratory.**
- **Conflict with the live tree — see SA-3 (§9).**

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

### Q33 — accomplished goals usually take only a few days

- Do **not** infer Q33 from rushing the Final Core, poor final quality, or
  unresolved issues.
- Only **self-selected** goal-horizon or goal-granularity opportunities may
  contribute to an **exploratory end-session portfolio**.
- **Required short tasks must not count as evidence of short-goal preference.**
- **Q33 remains questionnaire-primary.**
- **Conflict with the live tree — see SA-6 (§9).**

### Q29-Q33 overall

- All five **remain part of the final 33-item battery**.
- Their in-game analogues are **exploratory**.
- Do **not** represent them as direct measurements of literal days, years, or
  lifelong goal patterns.
- Do **not** implement five repetitive disguised questionnaire choices.
- **Shared behavioural dimensions and repeated natural choices are preferred.**

---

## 7. Shared-module and non-independence rules

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

| Refined mechanic                                    | Decision required                                                                                                                                                                                       |
| --------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Q04 explicit cleanup / restoration                  | **No schema change** — approved rationale and live registration already agree.                                                                                                                          |
| Q18 weak goal-continuity proxy                      | **No schema change** for the raw events (`objective_active`, `final_unresolved_due_to_nonreturn`). **Scoring-plan** only for the surfaced exploratory label (SA-7, D2 sub-item 4).                      |
| Q20 start-without-sustain (anomaly arc)             | **No schema change** for the existing raw events. **No scoring-plan decision is being sought** — no Q20 score is approved (SA-7 covers the label only).                                                 |
| Q27 utility-stop continuation module                | **Both** — event-schema **and** scoring-plan (SA-2), plus SA-1 for the Hazard tags it displaces.                                                                                                        |
| Q27/Q12 Hazard tags and scoring term                | **Both** — event-schema **and** scoring-plan (SA-1).                                                                                                                                                    |
| Q29/Q31 shared goal-horizon module                  | **Both** — event-schema **and** scoring-plan (SA-3).                                                                                                                                                    |
| Q30 goal-granularity module                         | **Both** — event-schema **and** scoring-plan (SA-4).                                                                                                                                                    |
| Q30 tags on inventory verification events           | **Event-schema** (SA-4).                                                                                                                                                                                |
| Q32 extended-goal engagement proxy                  | **Event-schema** for the tags (SA-5); scoring-plan only if a proxy variable is ever authorised — none is today.                                                                                         |
| Q33 self-selected portfolio                         | **Both** — event-schema **and** scoring-plan (SA-6), and it is **blocked behind** SA-3/SA-4, since the portfolio is defined over self-selected horizon/granularity opportunities that do not yet exist. |
| Q33 tags on Final Core rush/resolve/complete events | **Event-schema** (SA-6).                                                                                                                                                                                |

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
