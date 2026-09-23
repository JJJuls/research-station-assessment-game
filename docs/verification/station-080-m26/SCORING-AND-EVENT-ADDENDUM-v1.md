# Scoring and event-contract addendum — Station 080 M01–M26, v1

`docs/research/scoring-plan.md` and `docs/research/event-schema.md` are
write-protected for the agent (guard rule "research event-schema /
scoring-plan tree"; settings deny `Edit(docs/research/**)`). This addendum
is the **versioned candidate contract** of the M01–M26 run. Nothing in it is
canonical until the research owner pastes the insertion text in §5 into the
protected files. Until then every event family stays `proto_*` (candidate)
and every feature stays a prototype output.

## 1. Payload additions (additive, read-only)

Every research export payload — full, compact, keep-alive and return
envelope alike — now carries:

```
measurement_protocol: {
  protocol_version: "station080-m26-pilot-v1",
  schema_version:   "2026-09.m26.1",
  register_version: "v3.0",
  feature_extractor_version: "1"
}
measurement_features: FeatureRecord[]   // all 26 items, every register feature
```

`export_schema_version` (`2026-09.1`) is deliberately **unchanged**: the two
fields are optional and additive, and their own contract version is
`measurement_protocol.schema_version`. Consumers keyed on
`export_schema_version` see the same envelope; consumers of the feature block
key on the protocol block.

`FeatureRecord` (`src/measurement/features/types.ts`):

| Field                                                                  | Meaning                                                                                                                                                                                                                                                                               |
| ---------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `item_id`, `feature_id`, `feature_version`, `protocol_version`, `role` | identity (`role` = primary / companion / sensitivity)                                                                                                                                                                                                                                 |
| `coverage_label`, `independence`                                       | the register's evidential label (exploratory / partial / hybrid / …) and clustering kind (register §2b) on every row, so the features alone show the claim level and which denominators are clustered (U2-R)                                                                          |
| `value`                                                                | number, boolean, object, array or `null`; `null` is the only "not observed"; a partial value is exported under `incomplete`; for a fraction feature `value` is the NUMERATOR COUNT on the feature's stated range (never a ratio) — read it with `numerator` / `denominator` beside it |
| `disposition`                                                          | observed / not_presented / declined / no_eligible_event / understanding_failed / voluntary_stop / incomplete / interrupted / technical_failure / pending / not_implemented                                                                                                            |
| `numerator`, `denominator`, `planned_denominator`, `included_ids`      | reproducibility of every fraction; zero denominator ⇒ `value: null` with the caller's stated disposition (declined, not presented, no eligible event …); denominator below the planned denominator ⇒ `incomplete` with the value kept                                                 |
| `censored`, `censor_reason`                                            | cap or interruption                                                                                                                                                                                                                                                                   |
| `closure_reason`                                                       | the window's own closure (`completed / voluntary_stop / declined / route_departure / cap / session_end / closed_at_review / technical_failure`), never inferred from the disposition                                                                                                  |
| `missing_reason`                                                       | free text when `value` is null                                                                                                                                                                                                                                                        |
| `supporting_sequences`, `supporting_sequences_truncated`               | raw event `sequence` numbers the value was derived from (bounded at 200, cut flagged)                                                                                                                                                                                                 |
| `components`                                                           | companion detail kept beside, never inside, the value                                                                                                                                                                                                                                 |

Reload rule: an item with no evidence in the current page load is
`interrupted` when earlier page loads exist (its evidence may lie in
`prior_page_load_events`), never `not_presented`; a reload never creates
fresh independent trials.

The summary contract of the scoring plan (`ScoringManager.computeSummary`,
59 fields, `SummaryScope` masking) is untouched; no legacy field changes
meaning; the return URL is unchanged.

## 2. Event-contract semantics every item window must satisfy

Additive metadata on `proto_*` events (names remain candidates):
`measurement_protocol_version`, `opportunity_id`, `occasion_id` (a resume is
not a new occasion), `trial_id` with `phase`
(practice / baseline / measurement / feedback / transfer / belief / closure),
`form_id` and content version, assigned and realised order,
`presented` / `accessible` with reason, `accepted` / `entered`,
`knowledge_status` (M24–M26) with question id, response, key, explanation
exposure and attempt index, `input_mode` (keyboard / pointer / system —
system events are never voluntary actions), `closure_reason`,
`focused_ms` / `wall_ms` / `excluded_ms` by cause (overlapping causes each
carry the shared interval; `excluded_total_ms = wall_ms − focused_ms`). The
existing logger `sequence` and `page_load_index` are preserved; recovered
events are never renumbered.

## 3. Feature formulas (primary; companions listed in the register)

| Feature                           | Formula                                                                                                                                                                                                                                                                  | Direction                | Null rule                                                                                                                             |
| --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------- |
| `m01_planned_jobs`                | Σ jobs placed before first work action over 2 occasions / 6                                                                                                                                                                                                              | ↑ organisation           | no accessible occasion                                                                                                                |
| `m02_correct_first_retrievals`    | correct first answers / 6 (Cannot locate = incorrect)                                                                                                                                                                                                                    | ↑ traceability           | no request answered                                                                                                                   |
| `m03_tools_restored`              | Σ restored at first departure / 6                                                                                                                                                                                                                                        | ↑ tidying                | no valid occasion                                                                                                                     |
| `m04_undisposed_pieces`           | Σ (3 − disposed) incl. carried / 6                                                                                                                                                                                                                                       | ↑ own mess               | no job run                                                                                                                            |
| `m05_start_latency`               | per ACCEPTED occasion (object keyed o1 / o2, never summed or averaged): focused ms from eligibility (accepted; start control usable; no prompt, surface, overlay or world action) to the first work action + status started / deferred / exited / cap / interrupted (U6) | ↑ initiation difficulty  | declined ⇒ excluded; cap ⇒ censored, latency null; interrupted / never-eligible exit ⇒ missing, never a non-start                     |
| `m06_unique_correct_orders`       | distinct orders whose matching dispatch fell inside the one 60 s focused budget (denominator fixed at the budget; an explicit early stop never shortens it; recounted from the dispatch events) (U7)                                                                     | ↑ useful output          | work period never begun ⇒ null (`no_eligible_event`); interrupted / technical ⇒ null; a review-closed open period ⇒ censored value    |
| `m07_stages_completed`            | stages at the closing milestone / 6                                                                                                                                                                                                                                      | ↑ routine completion     | project never entered                                                                                                                 |
| `m08_work_choice_fraction`        | Work choices / valid choices                                                                                                                                                                                                                                             | ↑ work chosen            | no valid choice                                                                                                                       |
| `m09_due_checks_fulfilled`        | checks read in window / eligible checks                                                                                                                                                                                                                                  | ↑ follow-through         | duty declined                                                                                                                         |
| `m10_obligations_fulfilled`       | fulfilled or delegated / accepted accessible                                                                                                                                                                                                                             | ↑ reliability            | none accepted                                                                                                                         |
| `m11_unresolved_custodies`        | unresolved / accepted accessible                                                                                                                                                                                                                                         | ↑ unresolved stewardship | none accepted                                                                                                                         |
| `m12_fields_verified`             | Σ fields explicitly judged (matches or differs) before release over the RELEASED products / 6 (planned denominator; one released product ⇒ `incomplete` on 3; a released product with nothing judged is 0; recounted from the `field_judged` events) (U8)                | ↑ checking               | no product released ⇒ null (`declined` when presented and never opened; a packet opened and closed at the review is missing, never 0) |
| `m13_first_solutions`             | first-submission solves / 3                                                                                                                                                                                                                                              | ↑ puzzle performance     | none answered                                                                                                                         |
| `m14_correct_first_integrations`  | correct first decisions / 6                                                                                                                                                                                                                                              | ↑ integration            | none answered                                                                                                                         |
| `m15_correct_first_predictions`   | correct first predictions / 4                                                                                                                                                                                                                                            | ↑ understanding          | none answered                                                                                                                         |
| `m16_correct_first_applications`  | correct first applications / 6                                                                                                                                                                                                                                           | ↑ transfer               | none answered                                                                                                                         |
| `m17_criterion_trial`             | first learning trial ending 3 consecutive correct, with attained = true, reported whenever reached within the administered trials (even after an early exit, `complete_sequence` false); 12 / false / censored when all twelve ran without attainment                    | earlier = faster         | early exit WITHOUT attainment ⇒ incomplete                                                                                            |
| `m18_correct_first_diagnoses`     | correct first diagnoses / 3                                                                                                                                                                                                                                              | ↑ diagnosis              | none answered                                                                                                                         |
| `m19_continuations`               | further attempts after first boundary / eligible encounters                                                                                                                                                                                                              | ↑ continuation           | no difficulty                                                                                                                         |
| `m20_cued_resumptions`            | resumed / cued unfinished components                                                                                                                                                                                                                                     | ↑ return                 | none unfinished                                                                                                                       |
| `m21_restudy_revisions`           | restudy ∧ revised application / initially incorrect cases                                                                                                                                                                                                                | ↑ re-engagement          | no incorrect first application                                                                                                        |
| `m22_revisions_begun`             | revisions begun / presented requirements (2 planned)                                                                                                                                                                                                                     | ↑ re-engagement          | none presented                                                                                                                        |
| `m23_continuations_after_failure` | further search after first failed dig / plots with failed dig                                                                                                                                                                                                            | ↑ trying again           | no failed dig                                                                                                                         |
| `m24_postknowledge_casts`         | casts after passed test (first included); sensitivity max(n−1,0); unqualified casts kept as a companion                                                                                                                                                                  | ↑ IP (not desirable)     | understanding failed                                                                                                                  |
| `m25_optional_repeats`            | optional repeats after required loops; belief 1–5 separate                                                                                                                                                                                                               | ↑ IP (not desirable)     | loops never completed                                                                                                                 |
| `m26_postknowledge_retries`       | A retries after passed test (first included); sensitivity max(n−1,0); unqualified retries kept as a companion                                                                                                                                                            | ↑ IP (not desirable)     | understanding failed                                                                                                                  |

Partial accuracy is exported with its denominator wherever fewer than the
planned observations exist, under `disposition: incomplete` — never as a
complete component score, so selective early stopping is never rewarded.
This applies to planned-observation denominators only
(`denominator_kind: planned_observations`). Conditional-eligibility
denominators (`m10`, `m11`, `m19`, `m20`, `m21`, `m23`) are the
participant's own eligible events and are complete at any size above zero.

## 4. What this addendum does not do

No 26-item total, no facet composite, no weights, no normative cut, no
fitted parameter, no "good player" score. Companion and sensitivity outputs
are never merged with primaries. Questionnaire reverse keys are not applied
to telemetry.

## 5. Owner insertion text (paste into the protected files when approved)

**scoring-plan.md, new section "Station 080 M01–M26 prototype features":**

> The research export carries `measurement_protocol` and
> `measurement_features` (protocol `station080-m26-pilot-v1`, schema
> `2026-09.m26.1`). Each feature row is derived read-only from raw events
> by `src/measurement/features/` under the register
> `src/measurement/registerV3.ts`; formulas are those of
> `docs/verification/station-080-m26/SCORING-AND-EVENT-ADDENDUM-v1.md` §3.
> A `null` value with a disposition is the only representation of a
> non-observed feature; a partial denominator is exported as `incomplete`;
> no composite is formed across items.

**event-schema.md, new section "Station 080 M01–M26 candidate families":**

> The event families listed in
> `docs/verification/station-080-m26/M01-M26-IMPLEMENTATION-REGISTER.md`
> §4 (the as-built record appended by each implemented unit — at register
> v3.0 exactly the frozen v2 families, unchanged) and the additive metadata
> of `SCORING-AND-EVENT-ADDENDUM-v1.md` §2 are approved as provisional,
> exported, unscored pilot telemetry under protocol
> `station080-m26-pilot-v1`. Legacy `proto_*` and `secondary_*` records keep
> their earlier meanings under their earlier versions. No family is approved
> before its unit has appended it to §4.
