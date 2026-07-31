# Research-Owner Ruling Form — INT-1, INT-2, INT-5, D2, SA-family

**Copy-paste form.** Fill in each field, mark **APPROVED** or **NOT APPROVED**, and
add rationale. This form issues the binding rulings; the analysis behind each choice
is in `docs/decisions/QUALTRICS-INTEGRATION-DECISION-PACK.md` (INT-1/2/5) and
`docs/decisions/D2-BEAT13-SCORING-DECISION-PACK.md` (D2). **Nothing here is adopted
until you mark it APPROVED.** No implementation may begin before the fields that gate
it are approved.

> **Already issued — do not re-ask.** The section
> "**Measurement rulings ISSUED 2026-07-30 (NEXT-10)**" near the end of this
> form records rulings the research owner **has already issued** (SA-1, SA-2,
> SA-3, SA-4, SA-5, SA-6, SA-12, SA-13, corridor de-gating, Final Core
> baseline). Those fields are **APPROVED**, not pending. They approve
> **measurement design only** — no canonical event name, no formula, no
> implementation. Authoritative text:
> `docs/ai/SCIENTIFIC-AUTHORITY-AND-OPEN-DECISIONS.md` §14.

- Ruling issued by: `__________________` Date: `__________`
- Repository checkpoint this form was prepared against: branch
  `fable-autonomous-game-build-v1`, HEAD `24afcad`.

> **Recommended choice** is pre-marked `«REC»` per field. `«REC»` is a
> recommendation only and is **not** authorised until you approve it. "Custom
> ruling" is available on every field.

---

## Blocking-order note (what gates what)

- **Before ANY implementation**: INT-1 mechanism, INT-2 channel, INT-5 taxonomy, D2
  scope — Unit 0.
- **Before an internal developer test**: none of these (dev debug API already works).
- **Before a supervised usability test**: none _strictly_ (serve `npm run bundle`;
  accept no data returns) — but INT-5 `is_test`/`launch_mode` recommended so test
  sessions are taggable.
- **Before a research pilot**: INT-1, INT-2, INT-5, **D2 (deployment-gating)**, plus
  P0-3 persistence + INT-3 identity (separate forms).
- **Before formal participant data collection**: all of the above **+ reproducibility
  validated** (Unit 6) + codebook 1:1 + external DPIA/consent `[EXTERNAL]`.

---

## INT-1 — Completion & Qualtrics return mechanism

**Launch mode (blocking prerequisite)** — permitted: `standalone (whole-window)` /
`embedded (iframe)`. `«REC» standalone`.

- Selected: `__________` — APPROVED / NOT APPROVED

**INT-1.1 Selected mechanism** — permitted: `A same-window return_url navigation` /
`B postMessage+ack (embedded)` / `C hybrid` / `D manual button only` / `custom`.
`«REC» A (primary) if standalone; switch to B or C if embedded`.

- Selected: `__________` Rationale: `__________` — APPROVED / NOT APPROVED

**INT-1.2 Fallback rule** — permitted: `manual "Return to survey" panel on null/failed return` / `none` / `custom`.
`«REC» manual panel + "data may not have saved" message`.

- Selected: `__________` — APPROVED / NOT APPROVED

**INT-1.3 Acknowledgement rule** — permitted: `none (fire-and-forget nav)` /
`postMessage ack required` / `custom`. `«REC» none for A; ack required if B/C`.

- Selected: `__________` — APPROVED / NOT APPROVED

**INT-1.4 Retry rule** — permitted: `manual retry via fallback UI` / `auto-retry N times` / `none` / `custom`.
`«REC» manual retry via fallback UI`.

- Selected: `__________` N (if auto): `____` — APPROVED / NOT APPROVED

**INT-1.5 Allowed return origins/schemes** (INT-4 cross-dep) — permitted:
`http(s) only + host allow-list` / `http(s) only` / `unrestricted (current)` / `custom`.
`«REC» http(s) only + host allow-list`.

- Selected: `__________` Allow-list: `__________` — APPROVED / NOT APPROVED

**INT-1.6 Participant failure behaviour** — permitted: `show completion + failure message + manual link` / `silent` / `custom`.
`«REC» show completion + failure message + manual link`. (Ethics-review-relevant copy `[EXTERNAL]`.)

- Selected: `__________` Message copy: `__________` — APPROVED / NOT APPROVED

---

## INT-2 — Raw-event export channel

**INT-2.1 Selected channel** — permitted: `A HTTPS ingestion endpoint` /
`B Qualtrics embedded-data only` / `C parent-window messaging` /
`D hybrid (summary→Qualtrics + raw→endpoint)` / `E local durable queue→acked export` /
`F summaries-only (formally accepted)` / `custom`.
`«REC» D implemented via E (durable buffer + acked POST)`.

- Selected: `__________` Rationale: `__________` — APPROVED / NOT APPROVED

**INT-2.2 Raw-event destination** — permitted: `study HTTPS endpoint` / `not exported (F)` / `custom`.
`«REC» study HTTPS endpoint`. Endpoint URL/owner `[EXTERNAL]`: `__________`.

- Selected: `__________` — APPROVED / NOT APPROVED

**INT-2.3 Summary destination** — permitted: `Qualtrics via INT-1 return` / `endpoint only` / `both` / `custom`.
`«REC» Qualtrics via INT-1 return`.

- Selected: `__________` — APPROVED / NOT APPROVED

**INT-2.4 Persistence-before-ack rule** — permitted: `durable local buffer, retain until acked (E)` / `single POST, no buffer` / `none` / `custom`.
`«REC» durable local buffer, retain until acked` (also discharges P0-3).

- Selected: `__________` — APPROVED / NOT APPROVED

**INT-2.5 Idempotency rule** — permitted: `composite key participant_id+game_session_id+export_id` / `per-event seq (needs P1-9)` / `content hash` / `custom`.
`«REC» composite natural key`.

- Selected: `__________` — APPROVED / NOT APPROVED

**INT-2.6 Retry rule** — permitted: `retry failed POST until acked/backoff` / `retry N` / `no retry` / `custom`.
`«REC» retry with backoff until acked`.

- Selected: `__________` N/backoff: `____` — APPROVED / NOT APPROVED

**INT-2.7 Data-minimisation rule** — permitted: `raw events (pseudonymous) + summary + mission state` / `summary only (F)` / `custom`.
`«REC» raw + mission state + summary (justified by reproducibility)`. DPIA/consent cover `[EXTERNAL]`: `__________`.

- Selected: `__________` — APPROVED / NOT APPROVED

**INT-2.8 Reproducibility requirement** — permitted: `mandatory (every summary field recomputable from raw)` / `summaries-only accepted (scores NOT reproducible)` / `custom`.
`«REC» mandatory`.

- Selected: `__________` — APPROVED / NOT APPROVED

---

## INT-5 — Status taxonomy

**INT-5.1 Selected taxonomy** — permitted: `A combined enum` / `B orthogonal dimensions` / `C minimal (session_status+is_test)` / `custom`.
`«REC» B (orthogonal)`, or `C` for a first supervised test only.

- Selected: `__________` — APPROVED / NOT APPROVED

**INT-5.2 Approved status values** (tick/edit; `abandoned` held pending D3):

- `launch_mode`: `production` / `test` / `development` — approve set: `__________`
- `session_status`: `in_progress` / `completed` / `incomplete` / `error` — approve set: `__________`
- `completion_reason`: `terminal_room_reached` / `participant_exit` / `technical_error` — approve set: `__________`
- `export_status`: `pending` / `acknowledged` / `failed` — approve set: `__________`
- `return_status`: `pending` / `returned` / `failed` / `not_applicable` — approve set: `__________`
- APPROVED / NOT APPROVED

**INT-5.3 Approved state transitions** — permitted: `per pack §5.3 table` / `custom`.
`«REC» adopt §5.3 table`.

- Selected: `__________` — APPROVED / NOT APPROVED

**INT-5.4 Incomplete-session rule** — permitted: `best-effort emit on early exit (needs INT-2 E)` / `infer downstream by absence-of-completion only` / `custom`.
`«REC» infer downstream now; best-effort emit once E lands`.

- Selected: `__________` — APPROVED / NOT APPROVED

**INT-5.5 Invalid-launch rule** (ties INT-3) — permitted: `flag on session_status` / `handled entirely by INT-3` / `custom`.
`«REC» defer to INT-3 ruling`.

- Selected: `__________` — APPROVED / NOT APPROVED

**INT-5.6 Export-failure rule** — permitted: `export_status=failed + retain buffer + retry` / `custom`.
`«REC» export_status=failed + retain + retry`.

- Selected: `__________` — APPROVED / NOT APPROVED

**INT-5.7 Return-failure rule** — permitted: `return_status=failed + fallback UI` / `custom`.
`«REC» return_status=failed + fallback UI`.

- Selected: `__________` — APPROVED / NOT APPROVED

**INT-5.8 Test/development data rule** — permitted: `launch_mode axis; exclude non-production downstream` / `reserved participant_id prefix` / `custom`.
`«REC» launch_mode axis + exclude non-production in analysis`. Test signal source: `__________`.

- Selected: `__________` — APPROVED / NOT APPROVED

---

## D2 — Beat-13 scoring

**D2.1 Selected scope** — permitted: `α minimal remediation` / `β full V3 §6 migration` / `custom`.
`«REC» α (β requires uncaptured signals/undocumented formulas → would invent science)`.

- Selected: `__________` Rationale: `__________` — APPROVED / NOT APPROVED

**D2.2 Beat-13 ruling — `game_inappropriate_persistence` 4th term** — permitted:
`6A add final_core_force_continue (V3 §6)` / `6B leave out` / `custom`.
`«REC» 6A`.

- Selected: `__________` — APPROVED / NOT APPROVED

**D2.2b `strategy_revision_count` prudence-mixing** — permitted:
`5A split hazard_info_checked out into its own prudence variable` / `5B leave mixed` / `custom`.
`«REC» 5A`. New prudence variable name: `__________`.

- Selected: `__________` — APPROVED / NOT APPROVED

**D2.2c `final_quality_score` shape** — permitted:
`7A categorical + numeric` / `7B numeric only` / `7C categorical only` / `custom`.
**NO RECOMMENDATION — evidence insufficient.** If 7A/7B, supply the numeric
definition (category→value, issue netting, range, valence): `__________`.

- Selected: `__________` — APPROVED / NOT APPROVED

**D2.2d Exploratory-label mechanism** — permitted:
`8A _exploratory suffix on field names` / `8B parallel exploratoryProxyLabels map` / `custom`.
`«REC» 8A (low-confidence; both acceptable, silence is not)`.

- Selected: `__________` — APPROVED / NOT APPROVED

**D2.3 Repeated-response rule** — permitted: `count all occurrences (current)` /
`first-response only` / `final-response only` / `dedupe per task` / `custom`.
**NO RECOMMENDATION — undocumented; must be ruled.**

- Selected: `__________` Applies to: `__________` — APPROVED / NOT APPROVED

**D2.4 Incomplete-session scoring rule** — permitted:
`compute + export, tagged by INT-5 session_status` / `do not score incomplete` / `custom`.
`«REC» compute + export tagged`.

- Selected: `__________` — APPROVED / NOT APPROVED

**D2.5 Missing-item rule** — permitted: `N/A for α (no rate variables)` /
`define per rate (β)` / `custom`.
`«REC» N/A for α`.

- Selected: `__________` — APPROVED / NOT APPROVED

**D2.6 Denominator rule** — permitted: `N/A for α` / `define per rate (β)` / `custom`.
`«REC» N/A for α`.

- Selected: `__________` — APPROVED / NOT APPROVED

**D2.7 Partial-score rule** — permitted: `N/A for α` / `define (β)` / `custom`.
`«REC» N/A for α`.

- Selected: `__________` — APPROVED / NOT APPROVED

**D2.8 Composite-score rule** — permitted:
`family-scoped composites only, no global score (V3 §6)` / `custom`.
`«REC» family-scoped only, no global`. Retain `game_persistence_total`? YES / NO.

- Selected: `__________` — APPROVED / NOT APPROVED

**D2.9 Scoring-version identifier** — permitted: `<string you supply>` / `custom`.
**Required.** Value: `__________`.

- APPROVED / NOT APPROVED

**D2.10 Rounding rule** — permitted: `integers as-is (α)` / `define for floats (β)` / `custom`.
`«REC» integers as-is for α`.

- Selected: `__________` — APPROVED / NOT APPROVED

**D2.11 Export-field rule** — permitted:
`α: existing 59 fields + persistence fixes + labels + scoring_version` / `custom`.
`«REC» α field set`.

- Selected: `__________` — APPROVED / NOT APPROVED

**D2.12 Researcher notes** (task semantics, valence, cautions to preserve):
`____________________________________________`

---

## Privacy/Security addendum (added by the pre-pilot privacy/security gate)

These fields were added by `docs/ai/OPUS-PRE-PILOT-PRIVACY-SECURITY-GATE.md`
(analysis: `docs/security/RESEARCH-DATA-PRIVACY-THREAT-MODEL.md`). They are
**new** and **not adopted**; each requires **owner or institutional approval**.
No existing field above was altered.

**PSA-1 — Test/production separation signal (PS-2)** — permitted:
`launch_mode axis (INT-5) + reserved test-id convention` / `custom`.
`«REC» launch_mode=production|test|development + exclude non-production in analysis`.
**Requires owner approval; gates L3.**

- Selected: `__________` Test signal source: `__________` — APPROVED / NOT APPROVED

**PSA-2 — Return-URL identity minimisation (PS-4)** — must the return URL echo
`participant_id`? permitted: `no (Qualtrics already holds the mapping)` /
`yes (echo participant_id)` / `custom`. `«REC» minimise — summary fields only`.
**Requires owner approval.** (Raw events must NEVER travel in a URL — fixed constraint.)

- Selected: `__________` — APPROVED / NOT APPROVED

**PSA-3 — Ingestion endpoint region/provider/retention (PS-5, PS-12) `[EXTERNAL]`**
— permitted: `institutionally-approved host+region+retention` / `no endpoint (summaries-only, F)` / `custom`.
**Requires institutional approval; gates L4.**

- Host/region: `__________` Provider: `__________` Retention: `__________`
  Approval ref `[EXTERNAL]`: `__________` — APPROVED / NOT APPROVED

**PSA-4 — Participant withdrawal / deletion procedure (X6) `[EXTERNAL]`** —
permitted: `institution/ethics-defined procedure` / `custom`.
**Requires ethics/institutional approval; gates L4.** No withdrawal right or
retention period is assumed by this repository.

- Procedure ref `[EXTERNAL]`: `__________` — APPROVED / NOT APPROVED

---

## SA-8 — Q09 registration for `engineer_report_accuracy_scored` (FABLE-NEXT-04)

Added by the FABLE-NEXT-04 unit. The event is emitted (once per submission, at
report-content selection in the Engineer Hub) as **unmapped raw telemetry**; no
CanonicalEventContext registration exists — withheld on purpose. Payload is
documented in `event-schema.md` §4 (additive clarification): `success` =
all-checkable-facts-correct boolean; `metadata.accuracy` = 0-1 proportion, plus
report_mode/facts/claimed/actual keys. This ruling decides ONLY the
registration; any scoring use of `report_accuracy_score` stays gated by D2.

**SA-8.1 Q09 registration** — permitted:
`add study_item_ids ['Q09'], construct_id 'responsibility'` / `keep unmapped` / `custom`.
`«REC» add ['Q09'] + responsibility` (the specification lists report accuracy as
a primary Q09 measurement; the emission already exists and is payload-pinned).

- Selected: `__________` — APPROVED / NOT APPROVED

**SA-8.2 Success-field semantics** — permitted:
`keep both (success boolean + metadata.accuracy proportion, as emitted)` /
`success only` / `metadata.accuracy only` / `custom`.
`«REC» keep both` (already emitted and spec-pinned; either alone loses
information).

- Selected: `__________` — APPROVED / NOT APPROVED

---

## SA-9 — Interruption return-act co-fire (FABLE-NEXT-05)

Added by the FABLE-NEXT-05 unit. The observed physical return act (re-engaging
the Relay Checkpoint after a committed switch while the original check-in is
still pending) currently co-fires `return_to_unfinished_task` (Q15,
adaptive_persistence) and `returned_to_original_task` (Q17, CI-exploratory) at
the same moment — one shared observation carrying two Q-items, per the task
file's binding trigger table. Shared-evidence rule applies either way: this
moment must never be analysed as two independent observations (spec §8).

**SA-9.1 Return-act event shape** — permitted:
`keep the co-fire (both names, shared-evidence documented)` /
`fold returned_to_original_task into return_to_unfinished_task (single Q15+Q17 event)` /
`fold return_to_unfinished_task into returned_to_original_task` / `custom`.
`«REC» keep the co-fire` (already emitted and spec-pinned; a fold is a
lossless rename the D2-family pass can still apply downstream).

- Selected: `__________` — APPROVED / NOT APPROVED

---

## SA-10 — `task_completed_after_interruption` trigger scope (FABLE-NEXT-05)

Added by the FABLE-NEXT-05 unit. The Q15 shared-evidence carrier fires with
`prior_goal_completed` when the beacon interruption "occurred earlier in the
session". The live implementation reads this temporally: ANY earlier beacon
decision counts, including the ignore branch. The alternative reading
restricts it to sessions where the participant actually engaged the
interruption (acknowledge or switch).

**SA-10.1 Trigger scope** — permitted:
`temporal (any earlier beacon decision, as implemented)` /
`engaged-only (acknowledge or switch branches)` / `custom`.
`«REC» temporal` (the alert exposure itself is the interruption stimulus;
branch context stays recoverable from the co-logged branch events either way).

- Selected: `__________` — APPROVED / NOT APPROVED

---

## SA-11 — Inventory requisition-checklist display (FABLE-NEXT-06)

Added by the FABLE-NEXT-06 unit. The task file mandates a visible
"requisition checklist" in the Inventory visual interface; the
research-data review found that a live packed-state display pre-empts the
checklist-consultation (Q01 credit) and verify-vs-skip measurements. The
shipped panel conservatively shows only the carried slot and bench
contents (no requisition display) until this ruling.

**SA-11.1 Requisition display** — permitted:
`none (as shipped)` / `static names-only list` /
`live [x]/[ ] packed-state ticks (accept + record the confound)` /
`display gated behind a checklist action` / `custom`.
`«REC» static names-only list` (satisfies the task-file mandate; the
required-item names are already freely available via item destination
tags, while packed-state ticks would newly pre-empt verification).

- Selected: `__________` — APPROVED / NOT APPROVED

---

## Measurement rulings ISSUED 2026-07-30 (NEXT-10) — APPROVED

**These fields are not awaiting a decision.** They record rulings the research
owner **has issued**, on 2026-07-30, adopting the previously accepted revised
measurement directions. The authoritative ruling text is
`docs/ai/SCIENTIFIC-AUTHORITY-AND-OPEN-DECISIONS.md` §14.1; this section is the
form-side record so that the form does not read as though these questions were
still open.

- Ruling issued by: research owner Date: `2026-07-30`
- Repository checkpoint: branch `fable-next-10-research-owner-rulings-v1`,
  base `a0f298f`.

**Authority level of every field below: measurement design only.** None of them
approves a canonical event name, a payload name, a variable, a weight, a
threshold, a formula, or any implementation. Those remain event-schema (tier 3)
and scoring-plan (tier 4) rulings and separately approved build passes.

| Field                           | Ruling                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         | Status       |
| ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------ |
| **SA-1** Hazard ownership       | Hazard is principally the **Q12** prudence/carefulness opportunity. Q27 and Q31 may use no Hazard event, state, outcome or derived variable as primary evidence. Existing Hazard cross-tags remain temporarily as **explicitly labelled legacy/secondary ecological telemetry** pending the event-schema unit — not authorised primary inputs. Inappropriate-persistence formulas containing Hazard terms are **recorded as requiring a later scoring-plan correction**; no formula changes now.                                                                                                                                                                                                                                                                                                                                                                               | **APPROVED** |
| **SA-2** Q27 utility-stop       | A dedicated **Q27 Utility Bot utility-stop module** is approved: bounded useful sequence first; standardised explicit no-further-benefit signal; primary window begins at the signal; stopping and continuing equally accessible and neutrally framed; own state and eventual event family; independent of Hazard and all other persistence measures; neutral transition and validity controls. **Independence is not limited to the persistence family — the full ruling §4 firewall applies; in particular the opportunity's availability and entry state must not depend on Side Repair engagement or outcome (Q07/Q16/Q20/Q32), and the module needs its own instance and state container even though the candidate host is that bay.** Canonical events and scoring **pending**.                                                                                          | **APPROVED** |
| **SA-3** Q29/Q31 horizon        | **Two matched, counterbalanced situations** (one NPC-mediated, one terminal-mediated where feasible), each contrasting a self-contained immediate objective with a distributed objective of comparable total effort/value. Initial choice recorded **before** interruption or consequence; effort/benefit/difficulty/action count/duration/attractiveness/social approval approximately matched; option position, form and opportunity order counterbalanced. Produces **exactly one shared construct-level Q29/Q31 indicator** — never two independent game-item scores. Independent of Hazard, Side Repair, Q32, Q33 and Final Core. Legacy stabiliser/Hazard/shared-arc evidence **not authorised** as primary.                                                                                                                                                             | **APPROVED** |
| **SA-4** Q30 granularity        | **At least two independent Q30 opportunities**: (1) Vale/Inventory work-order granularity; (2) telemetry-cache/map-movement granularity. Each compares several independently closable smaller objectives with one integrated multi-component objective, balanced on total effort/benefit/difficulty/action count/duration/attractiveness/social feedback, using Q30-specific instances and state, with form order and option position counterbalanced. **≥2 valid opportunities** required before a pattern is derived; absent/contaminated opportunities are **missing/invalid**. Q30 is **never** inferred from skipped verification, poor preparation, carelessness or Hazard behaviour.                                                                                                                                                                                    | **APPROVED** |
| **SA-5** Q32 portfolio          | A **distinct Q32 Active Project Portfolio module** is approved, with its own opportunity, window, state container and eventual primary event family, independent of Q29/Q31, Side Repair and every other item's primary evidence; standardised or counterbalanced entry conditions; earlier item outcomes may not alter availability, project count, difficulty, benefit, feedback or measurement route. Any eventual indicator is an **exploratory short-session analogue only** — no claim to literal multi-year goal duration, never a validated item score. Legacy Q32 tags/proxies remain **labelled secondary ecological telemetry** pending schema disposition and **cannot feed the Q32 primary variable**.                                                                                                                                                            | **APPROVED** |
| **SA-6** Q33 closure queue      | A **distinct Q33 Contract Closure Queue module** is approved, with its own self-selected Q33-specific closure opportunities, window, state container and eventual primary event family, independent of Final Core and of Q29/Q30/Q31/Q32 and other item outcomes. **Required short tasks and forced completions cannot count as Q33 evidence.** Earlier outcomes may not alter availability, queue content, difficulty, benefit, feedback or measurement route. Any eventual indicator is an **exploratory short-session analogue only** — the game establishes nothing about whether real-world goals take days, and it is never a validated item score. Final Core rushing, issue resolution, generic completion and other items' completion events are **not authorised** as primary Q33 evidence; they may remain labelled secondary telemetry pending schema disposition. | **APPROVED** |
| **SA-12** Independent Q03       | A **new independently available, standardised Q03 retrieval/maintained-order opportunity** is approved. Its availability and entry state must not depend on earlier Inventory behaviour, on whether a particular tool was packed, or on any other item outcome. The existing prepared-tool/probe retrieval remains **secondary ecological evidence only** and cannot be the sole Q03 primary measure. Canonical events and scoring **pending**.                                                                                                                                                                                                                                                                                                                                                                                                                                | **APPROVED** |
| **SA-13** Validity architecture | The **semantic architecture** is approved: raw data must distinguish item/shared-construct ownership; measurement opportunity and instance; form and presentation order; counterbalance condition and option position; entry-state standardisation/validity; relevant prior exposure; comprehension failure; technical failure; carryover/contamination status and reason; opportunity completion, absence or censoring; and validity for primary analysis. These are **required semantic data elements, not approved canonical field names** — exact names, types, enumerations and payload contracts are **reserved for the event-schema ruling**. A contaminated, technically failed, absent or otherwise invalid opportunity is **missing/invalid evidence and must never be converted into low trait evidence**.                                                          | **APPROVED** |
| **Corridor de-gating**          | An interruption opportunity for **Q15/Q17/Q19 available independently of Q10 duty acceptance** is approved. Q10 outcomes must not alter its availability, entry state, wording, options, difficulty, action count, duration, reward, time pressure, tools, route or scoring. **SA-9, SA-10 and D6 still govern** item-specific event ownership and ignored-alert/acknowledgement semantics and are **not** resolved here.                                                                                                                                                                                                                                                                                                                                                                                                                                                      | **APPROVED** |
| **Final Core baseline**         | An **identical baseline issue/blocker component for all participants** is approved for the Q11/Q28 measurement environment. Participant-created issues from prior rooms may remain visible as secondary narrative/ecological consequences but cannot alter the baseline opportunity or substitute for its primary evidence. **Q11/Q28 event ownership and scoring formulas are not resolved here.**                                                                                                                                                                                                                                                                                                                                                                                                                                                                            | **APPROVED** |

**Firewall scope for every field above.** Where a ruling names only some
firewall dimensions, that is emphasis, **never a narrowing**. The **full global
ruling §4 firewall applies to every opportunity authorised here**: no other
item's outcome may determine or materially alter its opportunity availability,
entry state, instructions or NPC wording, option number or option position,
task difficulty, action count, expected duration, reward/consequence/social
approval, time pressure, available tools or inventory, completion route, or
scoring rule. For the Final Core baseline this is stated explicitly because
Q11/Q28 is the global ruling's own worked example of a multi-dimension
carryover exposure. Full itemisation: authority record §14.0 and the Final Core
baseline entry in §14.1.

**Consequential status corrections recorded by these rulings** (full text at
§14.2 of the authority record): Q27/Q29-Q31/Q30/Q32/Q33 modules are
**authorised but not implemented**; Q32 and Q33 no longer have "no distinct
module permitted" as current authority; older "Q32/Q33 derived from shared
opportunities" language is **superseded** (preserved in place, marked); Q32 and
Q33 **remain questionnaire items in Qualtrics** and questionnaire-primary, with
exploratory and separate game analogues that are **not validated replacements**;
**Q29/Q31 remains the sole shared-construct exception**; candidate events and
variables remain **noncanonical**; event-schema, infrastructure, module and
scoring work remain **separate future units**.

**Still awaiting a research-owner decision on this form** (unchanged by the
above): INT-1, INT-2, INT-5, D2, PSA-1..PSA-4, **SA-7**, **SA-8**, **SA-9**,
**SA-10**, **SA-11**, and D3..D8 in their own packs.

---

## Sign-off

- INT-1 complete: APPROVED / NOT APPROVED
- INT-2 complete: APPROVED / NOT APPROVED
- INT-5 complete: APPROVED / NOT APPROVED
- D2 complete: APPROVED / NOT APPROVED
- Privacy/Security addendum (PSA-1..PSA-4) complete: APPROVED / NOT APPROVED
- NEXT-10 measurement rulings (SA-1..SA-6, SA-12, SA-13, corridor de-gating,
  Final Core baseline): **ISSUED AND APPROVED 2026-07-30** — measurement design
  only; event-schema, scoring and implementation gates remain open.
- Signature: `__________` Date: `__________`

**Next authorised action after sign-off**: Unit 0 recorded → begin **Unit 1**
(empty-identity handling) verbatim from `PRE-MAX-QUALTRICS-INTEGRATION-AUDIT.md §19`,
then Units 2–7. Until every gating field above is APPROVED, **no production
integration or scoring implementation may begin.**
