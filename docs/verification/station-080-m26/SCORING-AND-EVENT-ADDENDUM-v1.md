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

U14-C (M03 / M04, candidates as before; no event suffix added):
`entry_state_version` reads `m03-tools-v2` / `m04-cutting-v2` (Unit
14: `-v1`); `presented_by` (`work_orders` | `station_direct` | `earlier_page_load`) in the
entry snapshot of `proto_m03tools_opportunity_opened` and on
`proto_m03tools_surface_opened` — `presented` is written once, before
the panel, by whichever presented the press first;
`proto_m04_cutting_listed` is an exposure record and is never a
condition of a job's observation.

U14-D (M04 only, candidates as before; no event suffix added, no
formula changed): `entry_state_version` reads `m04-cutting-v3` (U14-C:
`-v2`, Unit 14: `-v1`; the three administrations are told apart by that
field and pooled by no code). `proto_m04_cutting_piece_put_back` — the
existing suffix — is now also written when the participant sets a
carried piece down; the existing `input_mode` is its sole
discriminator (`keyboard` | `pointer` = the participant, `system` =
the put-back at a room exit; no field `by` exists — owner ruling 6 of
30 September 2026); the piece stays undisposed and the event never
enters a value. `proto_m04_cutting_first_departure` keeps its fields
and its triggers (`other_station` with the station in `detail`,
`room_exit`); under v3 `other_station` is written after the first
accepted action at that station that changed that task's recorded
state, never when a station was only reached, shown, read or refused
(owner ruling 1; register §4 "Unit 14-D" (6)). Under v3 a pick-up
carries the origin `pointer` or `open_floor_press`. The entry snapshot
gained `set_down_available`, `set_down_counts_as`, `cut_feedback`, and
`departure` reads `other_station_work_begun_or_room_exit`. When the bin
becomes the target of a carried piece (owner ruling 2) is a rule of the
interface: it writes no event and no field. No event suffix, canonical
event, formula, companion output or scoring rule was added or changed
by the rulings. All of it is provisional metadata on candidate events.

U14-D2 (M04 only, candidates as before; no event, suffix or field
added, no formula changed): `entry_state_version` reads
`m04-cutting-v4`. `-v3` (the blocked U14-D pass above) was never
committed, approved or released, so no session carries it; everything
the U14-D paragraph says of v3 holds for v4. The four administrations
(`-v1` Unit 14, `-v2` U14-C, `-v3`, `-v4`) are told apart by that field
and pooled by no code. The only value that changed is the content of
`piece_offsets` in the entry snapshot of
`proto_m04_cutting_opportunity_opened`: the three offsets of the job's
pieces from the scatter origin are now those of the cutting annex
(job 1: −172, 20 · −188, 60 · −188, 100; job 2: 172, 20 · 188, 60 ·
188, 100; register §4 "Unit 14-D2"). The field, its shape and every
other field are unchanged. The room geometry itself (the 43 × 19
workshop, the annex, the 64 px reaches) is described in the register
and writes no event and no field. `m04_undisposed_pieces` keeps its
meaning, its formula and its planned denominator of six; the
first-departure snapshot stays immutable; `by` stays removed.

U15 (M09 / M10, candidates as before; two new provisional families, no
canonical event, no scoring-plan variable, no formula changed): the
monitor watch and the deliveries leave the v2 families.

- **M09** — family `proto_m09_checks_`; ONE opportunity
  `proto_m09_watch_duty`; window ids `m09_duty_check_1`,
  `m09_duty_check_2`, `m09_duty_check_3` (the id on an event names the
  check that is, or was last, due); object `m09_monitor_gauge`;
  `entry_state_version` = `m09-watch-checks-v1`. Suffixes:
  - `presented` — snapshot: `checks_planned` (3), `milestones`,
    `window_ids`, `wording_id`, `log_line_ids`, `option_count`,
    `settle_ms` (300);
  - `offer_press_refused` — a press inside the settle window:
    `option_position`, `latency_ms`;
  - `offer_answered` — `answer` (`accept` or `decline`),
    `option_position`, `option_count`, `input_mode`, `input_mode_basis`;
  - `opportunity_opened`;
  - `check_window_opened` — `check_index`, `milestone` (`acceptance`,
    `lab_pass` or `return_pass`), `stage`, `visit`, `access`
    (`available`, `basis`, `registry_id`);
  - `log_viewed` — `due_check_index` (or null), `line_id`,
    `log_position`, `rendered`;
  - `check_fulfilled` — `check_index`, `due_delta_ms`, `reading_id`,
    `input_mode`, `basis`;
  - `gauge_read_uncredited` — `reason` (`no_check_due`,
    `already_fulfilled`, `duty_not_accepted` or `duty_closed`),
    `last_closed_check_index`, `last_closed_outcome`;
  - `check_window_closed` — `check_index`, `outcome` (`fulfilled`,
    `missed` or `censored`), `reason` (`read`, `left_concourse` or
    `review`), `exit_to`, `log_views_while_due`;
  - `window_closed` — raw components: the per-check records of the one
    duty;
  - `technical_failure` — the reload hold-back.

  The third check closes at the first Concourse exit after its opening —
  research-owner decision D-U15-1 of 6 October 2026 (register §4
  "Unit 15", §5.239).

- **M10** — family `proto_m10_delivery_`; opportunities
  `proto_m10_delivery_d1` and `proto_m10_delivery_d2`; windows
  `m10_delivery_d1` and `m10_delivery_d2`; `occasion` and `delivery`
  (`d1` or `d2`) on every event; objects `m10_calibration_key_card` and
  `m10_yard_logbook`; `entry_state_version` = `m10-deliveries-v1`.
  Suffixes:
  - `presented` — `issuer`, `recipient`, `object`, `deadline`
    (`station_record_closure`), `permitted_delegate`, `wording_id`,
    `offer_milestone`, `settle_ms` (300);
  - `press_refused` — `step` (`offer`, `recap`, `deliveries_menu` or
    `delegation_confirm`);
  - `offer_answered` — as M09's;
  - `opportunity_opened`;
  - `interruption_shown`, `interruption_acknowledged` — `d1` only;
  - `obligation_shown` — `channel` (`after_interruption`, `station_log`
    or `deliveries_menu`), `deliveries`, `after_closure`; for the station
    log also `log_position`, `rendered`;
  - `person_present` — `person`, `role` (`recipient` or `delegate`),
    `zone`, `stage`, `visit`: the objective accessibility record;
  - `recipient_prompt_opened`;
  - `delegate_accepted` — `delegate`, `for`, `line_id`;
  - `handed_over` — `to`, `object`, `delay_ms`, `input_mode`, `basis`;
  - `delegated` — `to`, `for`, `object`, `delay_ms`, `input_mode`,
    `basis`;
  - `window_closed` — raw components: the delivery's record;
  - `late_handover`, `late_delegation` — after the closure:
    `after_closure_ms`; never part of a value;
  - `technical_failure` — the reload hold-back.

A deferral ("Ask me again later.") writes no M09 or M10 event: it is
recorded only by the existing route beat `pilot_npc_beat` with the tags
`watch_defer`, `promise_defer` (`d1`) and `logbook_defer` (`d2`). The
unit's other beat tags are `watch_accept`, `watch_decline`,
`promise_accept`, `promise_decline`, `promise_recap_ack`,
`logbook_accept`, `logbook_decline`, `logbook_offer_again`,
`deliveries_open` and the menu choices prefixed `m10_` — all unmapped
route telemetry. One route event is added, `pilot_npc_menu_overflow`
(unmapped; written only if an NPC state would exceed four option cards;
never a measurement; the unit's browser scenarios assert that it does
not occur). `input_mode` on the M09 / M10 acts is OBSERVED per act —
`keyboard`, `pointer` or `unobserved`, with its basis (`window_keydown`,
`window_pointerdown`, `no_recent_press` or `not_observed`) — while every
other prompt answer keeps the constant of register §5.35. The v2
families (prefixes `proto_m09_watch_` and `proto_m10_promise_`) are
retired from the route and keep their v2 meaning in the frozen ledger;
this build writes neither. Every name above is a candidate; §5 is
unchanged.

U15 closeout (6 October 2026; M10 extraction only — an explicit
clarification of the provisional extraction contract under two
research-owner rulings, register §5.256 and §5.257; no event, suffix,
field, emitted payload, formula or administration version changed):

- **Access timing.** A `person_present` record is evidence of access
  only when its sequence follows BOTH the delivery's `offer_answered`
  (accept) and its `opportunity_opened`. A record before either, or for
  a delivery never offered, never answered or declined, is malformed
  evidence: the feature is `technical_failure`; the record never
  establishes accessibility and never yields an observed zero. An
  accepted delivery with no presence record at all is unchanged:
  inaccessible, excluded, never failed.
- **Delegated object.** The `object` field of `delegated` (written since
  U15 with the delivery's own object, although the field list above does
  not require it) must equal the delivery's object —
  `m10_calibration_key_card` for `d1`, `m10_yard_logbook` for `d2` — as
  the `object` of `handed_over` must. Another object, or none, is a
  `technical_failure`.

U15 event-order integrity (6 October 2026; M09 and M10 extraction only —
a clarification of the provisional extraction contract under the
research owner's ruling, register §5.259; no event, suffix, field,
emitted payload, formula or administration version changed). Both
extractors read the order of events from `sequence`, the logger's
integrity number: an integer from 1, unique within the session identity
and increasing; gaps between the events of one item are normal. The
order of an ACCEPTED duty's (M09) or an ACCEPTED delivery's (M10) events
is read only when every event of the watch family (M09) or of that
delivery (M10) in the current page load carries a usable number (a safe
integer of at least 1) and no two share one. A missing or malformed
number is never read as zero; with a missing, malformed or duplicated
number the feature is `technical_failure`, never an observed value.
Dispositions that compare no positions (`not_presented`, unanswered →
`no_eligible_event`, `declined`, `interrupted` after a reload) are
unchanged.

U16 (M13, candidates as before; one new provisional family, no canonical
event, no scoring-plan variable, no formula changed): the Conduit Lattice
Bench leaves the v2 family under research-owner ruling D-U16-1 of
7 October 2026 (register §4 "Unit 16", §5.260).

- **M13** — family `proto_m13_networks_` (IpFamily
  `proto_m13_networks`); ONE opportunity `proto_m13_network_series`;
  trial / window ids `m13_network_n1`, `m13_network_n2`,
  `m13_network_n3`; object `ip_lattice_bench`; `entry_state_version` =
  `m13-networks-v1`. The v2 family `proto_m13_lattice_` and its
  opportunity `proto_m13_lattice_construction` are retired from the
  route and keep their v2 meaning in the frozen ledger; this build
  writes neither. The Pump House family `proto_m13_*` of the legacy
  scene is untouched.
- **Two phases.** The FIRST-RESPONSE phase (`phase: measurement`, the
  scored phase): networks `n1 → n2 → n3`, one immutable first response
  each — a confirmed layout or a confirmed CANNOT SOLVE — and no
  correctness feedback of any kind. RESULTS AND OPTIONAL PRACTICE
  (`phase: feedback` / `practice`) exist only after the third first
  response and never enter a value.
- **Every event** carries `opportunity_id`, `entry_state_version`,
  `form_id`, `measurement_protocol_version`, `phase` (`measurement`,
  `feedback`, `practice` or `closure`), `series_active_ms`, and — when it
  concerns a network — `network_id`, `network_index` (1–3), `trial_id`
  and `content_version`. `input_mode` is `pointer`, `typed` or `system`.
  Suffixes:
  - `series_opened` — entry snapshot: `networks_planned` (3),
    `assigned_order`, `networks` (per network: id, index, trial id,
    content version, port relation, feed and intake mount and side,
    blocked mounts), `piece_set`, `constraints`, `commit`
    (`explicit_confirmation`), `cannot_solve_available`, `feedback`
    (`after_all_first_responses`), `practice` (`available_after`,
    `test_runs_max_per_network` 3,
    `same_access_for_every_first_response`), `help` (`on_request`),
    `settle_ms` (400);
  - `series_reopened`, `panel_left` — `view`;
  - `network_presented` — `assigned_position`, `realised_position`, the
    configuration; once per presented network;
  - `piece_picked`, `piece_placed`, `piece_returned`, `piece_rotated`,
    `placement_refused`, `undone`, `board_reset` — the v2 fields plus the
    network and phase fields (also written on a practice board, with
    `phase: practice`);
  - `commit_requested` — `kind` (`layout` or `cannot_solve`),
    `pieces_seated`; `commit_cancelled` — `reason` (`keep_working` or
    `panel_left`); `commit_press_refused` — `reason`
    (`held_or_repeated_press`, `press_began_before_dialog` or
    `dialog_settling`), `since_opened_ms`; each reason recorded once per
    dialog, the count carried on the next record. Exposure records,
    never a response;
  - `first_response` — one per answered network: `response_kind`,
    `correct` (always false for `cannot_solve`), `reason`,
    `endpoint_connected`, `valve_inline`, `open_branch_count`,
    `source_seated`, `constraints_satisfied`, `constraints_total` (3),
    `board` (the pieces seated at the confirmation — the answer itself
    for a layout, context only for CANNOT SOLVE), `path_slots`,
    `help_consults_before`, `active_ms` (focused time on that network
    from its presentation, the confirmation included),
    `refused_presses_before`, `response_position`, `input_mode`.
    Recorded, never shown in the first-response phase;
  - `response_acknowledged` — `line_id` (`answer_recorded`),
    `next_control` (`next_network` or `show_results`); identical for
    every response;
  - `first_responses_completed` — with the third first response: the
    closure snapshot of the scored phase (`networks_answered`,
    `first_solutions`, `assigned_order`, `realised_order`, per network
    `answered`, `response_kind`, `correct`) and `closure_reason`
    `completed`. The scored phase has no later closure event;
  - `results_shown` — `trigger` (`show_results`, `back_to_results` or
    `reopened`), per network the `line_ids` shown, `practice_runs`;
  - `practice_opened` — `first_response_kind`, `runs_used`, `runs_max`;
    `practice_test_run` — `run_index` (1–3), `sealed`, the structural
    fields, `board`, `line_ids`; `practice_closed` — `reason`
    (`finished`, `review` or `technical_failure`), `practice_runs`,
    `results_view_reached`. Never part of a value;
  - `help_consulted` — its `phase`, `network_id` (or null),
    `network_answered`, `sheet`;
  - `series_stopped`, `series_closed_at_review` — first-response phase
    only, each with the closure snapshot and `closure_reason`
    (`voluntary_stop` or `closed_at_review`);
  - `technical_failure` — `detail` and `phase`; the reload hold-back
    uses the detail `reload after administration: bench not re-run`
    with `prior_exposure: true`, and the extractor reads a hold-back
    only from a record that carries both marks.
- **Extraction rules** (`src/measurement/features/m13.ts`): current-load
  events only; the value is recounted from the `first_response` events
  (each recorded layout board re-validated against the configuration of
  that event's network and form) and compared with the event's own
  `correct` flag and with the closure snapshot. `technical_failure`,
  never a value, for contradictory, malformed or unverifiable SCORED
  evidence — an unknown version or opportunity, a form that changes, an
  unknown network or a content version, network index or trial id that
  does not match it, a network presented twice, out of order or before the previous first
  response, a first response without its presentation, a second first
  response, a `correct` flag that contradicts the board, a CANNOT SOLVE
  marked correct, a layout without a usable board, a non-boolean
  `correct`, a first response outside `measurement` or after the
  completion, three first responses without the completion snapshot or
  that snapshot with fewer, a snapshot that disagrees with the recount,
  ANY `results_shown` or `practice_*` record before the completion, and
  a family event of the load without a usable, unique `sequence` (the
  §5.259 convention applied to this extractor). Legitimate missingness
  is never a technical failure. A defect confined to the practice
  records after a verified, complete scored phase sets
  `practice_record_consistent: false` in the components and leaves the
  row unchanged. Precedence: `interrupted` (held back after a reload) >
  `technical_failure` > `pending` > the closed-series outcomes.

## 3. Feature formulas (primary; companions listed in the register)

| Feature                           | Formula                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       | Direction                 | Null rule                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| --------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `m01_planned_jobs`                | Σ jobs placed before first work action over 2 occasions / 6                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   | ↑ organisation            | no accessible occasion                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| `m02_correct_first_retrievals`    | correct first answers / 6 (Cannot locate = incorrect): requests whose FIRST committed answer is the requested case / 6 planned requests (one per case, in the balanced order assigned to the session); the exported denominator is the requests answered — recounted from the `request_answered` events, each checked against its `request_presented` event, the assigned order and the window's per-request record; focused ms per request and the layout at the handover kept as the companions `m02_retrieval_latency` and `m02_filing_layout` (U13); during the requests the participant's layout and own tray labels stay visible and the system-supplied case codes and contents do not (owner ruling of 28 September, §5.137)                                                                                                                                                                                                                                                                                                                                          | ↑ traceability            | no request answered ⇒ null (`no_eligible_event` when the workspace was never handed over, `voluntary_stop` when it was — provisional, register §5.142); fewer than six answered ⇒ `incomplete` with the value and its denominator (an unanswered request is missing, never incorrect); a record that disagrees with the raw answers anywhere ⇒ `technical_failure`                                                                                                |
| `m03_tools_restored`              | Σ tools in the tool rack at the first departure (the participant's first close of the press panel with the tools out) over the observed occasions / 6 planned (three per occasion; the exported denominator is 3 × the observed occasions) — recounted per occasion from the `tool_moved` events between `opportunity_opened` and `first_departure` and compared with the snapshot tool by tool; a completed occasion is read only with `opportunity_opened` and `first_departure` once each and in that order, the occasion's own three tools in the entry snapshot and in the record, and every recorded container the one the moves lead to (U14-C); the object states kept as the companion `m03_object_states` (U14)                                                                                                                                                                                                                                                                                                                                                     | ↑ tidying                 | no occasion observed ⇒ null (`declined` when listed and never opened; `no_eligible_event` when a panel was opened and its run never completed; `technical_failure` when the tools could not be reached; `interrupted` after a reload or when a panel with the tools out was closed by the system); one occasion ⇒ `incomplete` with the value; an occasion with an unreachable tool is excluded; a record that disagrees with the raw moves ⇒ `technical_failure` |
| `m04_undisposed_pieces`           | Σ (3 − pieces disposed before the job's first departure) over the observed jobs / 6 planned, a carried piece included (three per job; the exported denominator is 3 × the observed jobs); the first departure of a job = the room left, or another station opened (administrations `m04-cutting-v1` / `-v2`) / work at another station actually begun (administrations `m04-cutting-v3`, U14-D, never released, and `m04-cutting-v4`, U14-D2; the formula itself is unchanged and the administrations are not pooled) — recounted per job from the `piece_picked_up`, `piece_put_back` and `piece_disposed` events between `job_run` and `first_departure`, replayed in order, and compared with the snapshot piece by piece; a completed job is read only with `opportunity_opened`, `job_run` and `first_departure` once each and in that order, the job's own three pieces named by the cut, and every disposal once and after its pick-up (U14-C; `listed` is never required); a later disposal never enters; per-job values kept as the companion `m04_job_values` (U14) | ↑ own mess                | no job run ⇒ null `not_presented` (a job never run is not presented, also when the work orders listed the coupons — provisional, register §5.172); one job ⇒ `incomplete` with the value; a job closed by the system (the review) or held back after a reload ⇒ censored, excluded (`interrupted` when it is every job run); unreachable pieces ⇒ excluded (`technical_failure`); a record that disagrees with the raw events ⇒ `technical_failure`               |
| `m05_start_latency`               | per ACCEPTED occasion (object keyed o1 / o2, never summed or averaged): focused ms from eligibility (accepted; start control usable; no prompt, surface, overlay or world action) to the first work action + status started / deferred / exited / cap / interrupted (U6)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      | ↑ initiation difficulty   | declined ⇒ excluded; cap ⇒ censored, latency null; interrupted / never-eligible exit ⇒ missing, never a non-start                                                                                                                                                                                                                                                                                                                                                 |
| `m06_unique_correct_orders`       | distinct orders whose matching dispatch fell inside the one 60 s focused budget (denominator fixed at the budget; an explicit early stop never shortens it; recounted from the dispatch events) (U7)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          | ↑ useful output           | work period never begun ⇒ null (`no_eligible_event`); interrupted / technical ⇒ null; a review-closed open period ⇒ censored value                                                                                                                                                                                                                                                                                                                                |
| `m07_stages_completed`            | stages at the closing milestone / 6                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           | ↑ routine completion      | project never entered                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| `m08_work_choice_fraction`        | Work choices / valid choices                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  | ↑ work chosen             | no valid choice                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| `m09_due_checks_fulfilled`        | checks fulfilled / eligible checks of the ONE accepted duty (three planned; fewer reached ⇒ `incomplete` with the value): a check is eligible when it was opened with access (`check_window_opened.access.available`) and closed by a reading (`read`) or by leaving the Concourse (`left_concourse`); fulfilled = exactly one `check_fulfilled` inside its window — recounted per check from `check_window_opened`, `check_fulfilled` and `check_window_closed` and compared with the closure snapshot; a check censored at the review, one opened without access and one never opened are outside the denominator; uncredited and late readings never enter the value; the three checks share one duty (repeated observations, never three situations) (U15)                                                                                                                                                                                                                                                                                                                | ↑ follow-through          | duty declined (`declined`); offer unanswered (`no_eligible_event`); never offered (`not_presented`); held back after a reload (`interrupted`); duty still open (`pending`); contradictory evidence, or an event order that cannot be verified (`technical_failure`)                                                                                                                                                                                               |
| `m10_obligations_fulfilled`       | (deliveries handed to their recipient + deliveries left with the permitted delegate after the delegate's stated acceptance) / accepted, accessible deliveries (two planned; a conditional denominator, complete at any size above zero): accessible = a `person_present` record of the recipient or the permitted delegate while the delivery was carried — never the participant's opening of a conversation, the station log or a deliveries menu — recounted per delivery from `offer_answered`, `opportunity_opened`, `person_present`, `delegate_accepted`, `handed_over`, `delegated` and `window_closed` and compared with the closure snapshot; direct and delegated are counted separately in the components; a delivery still carried at the station-record closure is an observed non-fulfilment when accessible and excluded when not; late acts never enter the value; never merged with M11 (U15); closeout clarification (register §5.256–§5.257): presence counts only after acceptance and opening; `delegated` must name the delivery's own `object`        | ↑ reliability             | none accepted and some declined (`declined`); none answered, or none accessible (`no_eligible_event`); never offered (`not_presented`); a delivery held back after a reload (`interrupted`, the other delivery's value kept beside it); a delivery still open (`pending`); contradictory evidence, or an event order that cannot be verified (`technical_failure`)                                                                                                |
| `m11_unresolved_custodies`        | unresolved / accepted accessible                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              | ↑ unresolved stewardship  | none accepted                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| `m12_fields_verified`             | Σ fields explicitly judged (matches or differs) before release over the RELEASED products / 6 (planned denominator; one released product ⇒ `incomplete` on 3; a released product with nothing judged is 0; recounted from the `field_judged` events) (U8)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     | ↑ checking                | no product released ⇒ null (`declined` when presented and never opened; a packet opened and closed at the review is missing, never 0)                                                                                                                                                                                                                                                                                                                             |
| `m13_first_solutions`             | networks whose FIRST response is a layout the shared validator accepts for that network and form / networks with a first response in the current page load (planned denominator 3; CANNOT SOLVE and an unsealed layout are in the denominator, not the numerator; a network without a first response is missing, never incorrect; fewer than three answered and the series closed ⇒ `incomplete` on the answered count; recounted from the `first_response` events by re-validating each recorded board and compared with the event's `correct` flag and the closure snapshot; results, practice, help, time and input mode never enter; complete and stable from the third first response) (U16)                                                                                                                                                                                                                                                                                                                                                                             | ↑ puzzle performance      | none answered ⇒ null (`not_presented` never opened; `voluntary_stop` opened and stopped; `no_eligible_event` opened and closed at the review; `pending` while the first-response phase is open, also with one or two answers; `interrupted` held back after a reload; `technical_failure` for a fault in the first-response phase or contradictory / unverifiable scored evidence)                                                                                |
| `m14_correct_first_integrations`  | correct first decisions / 6                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   | ↑ integration             | none answered                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| `m15_correct_first_predictions`   | correct first predictions / 4                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 | ↑ understanding           | none answered                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| `m16_correct_first_applications`  | correct first applications / 6                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                | ↑ transfer                | none answered                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| `m17_criterion_trial`             | first learning trial ending 3 consecutive correct FIRST responses (one SUBMIT of exactly two operators per trial; recounted from the `trial_submitted` events), with attained = true, reported whenever reached within the administered trials (even after an early exit, `complete_sequence` false); 12 / false / censored when all twelve ran without attainment (U9)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       | earlier = faster          | early exit WITHOUT attainment ⇒ incomplete (not censored); never opened ⇒ null; owner decisions §5.87–5.88 pending before use                                                                                                                                                                                                                                                                                                                                     |
| `m18_correct_first_diagnoses`     | correct first diagnoses / 3                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   | ↑ diagnosis               | none answered                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| `m19_continuations`               | further attempts after first boundary / eligible encounters                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   | ↑ continuation            | no difficulty                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| `m20_cued_resumptions`            | resumed / cued unfinished components                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          | ↑ return                  | none unfinished                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| `m21_restudy_revisions`           | cases with a relevant restudy (a section read after application k bearing on a fault known from applications 1..k) AND a revised application (a FIT with a changed configuration) / cases whose first FIT (the application, available once the plate is read) was incorrect and were resolved by the participant — recounted from the `section_consulted` and `applied` events (U10)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          | ↑ re-engagement           | no incorrect first application ⇒ null; a review-closed incorrect case without the fact ⇒ censored, excluded                                                                                                                                                                                                                                                                                                                                                       |
| `m22_revisions_begun`             | reports with a revision begun (a code attached after the acknowledgement of the returned note) / reports whose requirement was presented (2 planned) and that the participant decided — or the review closed after the revision had begun; recounted from the `setback_acknowledged` and `code_attached` events (U11)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         | ↑ re-engagement           | none presented ⇒ null; a returned note never acknowledged ⇒ excluded (`understanding_failed` when it is every one); acknowledged and left to the review without a revision ⇒ censored, excluded                                                                                                                                                                                                                                                                   |
| `m23_continuations_after_failure` | further search after first failed dig / plots with failed dig                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 | ↑ trying again            | no failed dig                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| `m24_postknowledge_casts`         | rig cycles committed inside the 30 s focused continuation that opens only on a PASSED expected-outcome check (the first included) — recounted from the `postknowledge_cast` events (U12); sensitivity max(n−1,0) beside; the pre-knowledge / after-fail casts, the check's record and switch / exit / cap kept as the companion `m24_unqualified_casts`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       | ↑ known-futile repetition | deck never depleted ⇒ null (no boundary); check never decided ⇒ null `interrupted`; check failed ⇒ null `understanding_failed`; cap / review censor the count                                                                                                                                                                                                                                                                                                     |
| `m25_optional_repeats`            | optional repeats after required loops; belief 1–5 separate                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    | ↑ IP (not desirable)      | loops never completed                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| `m26_postknowledge_retries`       | Post A transmissions attempted inside the 30 s focused continuation that opens only on a PASSED expected-outcome check (the FIRST included; the v2 first-probe exclusion retired) — recounted from the `postknowledge_retry` events (U12); sensitivity max(n−1,0) beside; the pre-knowledge / after-fail attempts, the check's record and switch / exit / cap kept as the companion `m26_unqualified_retries`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 | ↑ known-futile repetition | channel never disconnected ⇒ null (no boundary); check never decided ⇒ null `interrupted`; check failed ⇒ null `understanding_failed`; cap / review censor the count                                                                                                                                                                                                                                                                                              |

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
