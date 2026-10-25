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

U17 (M14, candidates as before; one new provisional family, no canonical
event, no scoring-plan variable, no formula changed): the Concourse
incident desk leaves the v2 family under research-owner decisions
D-U17-1 of 7 October 2026 and D-U17-2 of 8 October 2026 (register §4
"Unit 17", §5.275–§5.276).

- **M14** — family `proto_m14_integration_`; ONE opportunity
  `proto_m14_integration_series`; the kit's window id `m14_packet_p1`;
  packet window ids `m14_packet_p1` and `m14_packet_p2` (carried as
  `packet_window_id`); object `m14_incident_desk`;
  `entry_state_version` = `m14-integration-v1`; content versions
  `m14-p1-v1` and `m14-p2-v1`. The v2 family `proto_m14_desk_` and its
  opportunity `proto_m14_incident_desk` are retired from the route and
  keep their v2 meaning in the frozen ledger; this build writes neither.
  The legacy Information Processing Lab family `proto_m14_packet_` is
  untouched.
- **Phases.** `orientation` (the card); `measurement` (the
  first-response phase: packets p1 → p2, decisions D1 → D3, one
  immutable first response each — a confirmed option or a confirmed
  CANNOT SOLVE — and no correctness feedback of any kind); `feedback`
  (the results, only after the sixth first response); `closure`.
- **Every event the model emits** carries the kit's fields
  (`measure_id`, `opportunity_id`, `window_id`, `entry_state_version`,
  `presented_at_ms`, `window_status`, the validity fields),
  `measurement_protocol_version`, `phase` and — when it concerns a
  packet or decision — `packet_id`, `packet_index` (1–2),
  `packet_window_id`, `content_version`, `decision_id`,
  `decision_index` (1–3) and `decision_global_index` (1–6);
  `input_mode` is `pointer`, `keyboard` or `system`. The kit's own
  records (`presented`, `opportunity_opened`, `window_closed`,
  `technical_failure`) carry the kit's fields and `input_mode: 'system'`
  only (`windowKit.ts` is outside the unit). Suffixes:
  - `presented` — Vale's briefing acknowledged: exposure only, not a
    desk opening and not a decision presentation;
  - `opportunity_opened` — the first opening; `entry_state_snapshot`:
    `packets_planned` (2), `decisions_planned` (6),
    `assigned_packet_order`, per packet {`packet_id`,
    `packet_window_id`, `content_version`, `source_ids`,
    `decision_ids`, per decision `option_ids` and `key_option_id`},
    `commit` (`explicit_confirmation`), `cannot_solve_available` (true),
    `feedback` (`after_all_first_responses`), `source_presentation`
    (`on_demand_stay_open`), `stop_control` (false), `settle_ms` (400),
    `stage`;
  - `orientation_acknowledged`; `series_reopened` and `panel_left` —
    `view` (written while the desk is live, never on a closed record);
  - `packet_presented` — `assigned_position`, `realised_position`,
    `sources_available` (the nine ids), `decision_ids`; exactly once per
    packet;
  - `decision_presented` — `assigned_position` (the global index),
    `realised_position`, `option_ids`; exactly once per decision;
  - `source_opened` / `source_closed` — `source_id`, `source_kind`
    (`message` | `gauge`), `open_count` for that source,
    `sources_open`, `view` (`decision` or `acknowledgement`), the
    decision current at the act — a tile toggled in the acknowledgement
    view carries the decision just answered and counts toward the NEXT
    decision's `sources_opened_before` (contract correction B);
    exposure records, never a response and never proof of reading;
  - `option_drafted` — `option_id` (null when cleared),
    `previous_option_id`; never a response;
  - `commit_requested` — `kind` (`option` | `cannot_solve`),
    `option_id`; `commit_cancelled` — `reason` (`keep_working` |
    `panel_left`), `refused_presses`; `commit_press_refused` — `reason`
    (`dialog_settling`), `since_opened_ms`, `settle_ms`; recorded once
    per dialog, the count carried on the next record;
    `commit_without_draft` — RECORD ANSWER with no draft;
  - `first_response` — exactly one per answered decision, `phase`
    `measurement`: `response_kind` (`option` | `cannot_solve`),
    `option_id` (null for Cannot solve), `correct` (always false for
    `cannot_solve`), `key_option_id`, `sources_opened_before` (ids opened
    at least once in the packet before the confirmation),
    `establishing_source_sets` (two for `p1_d3`),
    `establishing_sets_opened_before` (per set the count opened before),
    `sources_open_at_commit`, `drafts_before`, `help_consults_before`,
    `active_ms`, `focused_ms` (the focused clock, null if unavailable),
    `refused_presses`, `draft_at_commit`, `input_mode`;
  - `response_acknowledged` — `line_id` (`answer_recorded`),
    `next_control` (`next_decision` | `next_packet` | `show_results`),
    `answered_count`; identical in content for every response;
  - `packet_completed` — the packet's three-decision record;
  - `first_responses_completed` — with the sixth first response: the
    closure snapshot (`decisions_planned`, `decisions_presented`,
    `decisions_answered`, `correct_first_decisions`,
    `cannot_solve_count`, `by_packet`, per decision `presented`,
    `answered`, `response_kind`, `option_id`, `correct`) and
    `closure_reason` `completed`; the kit's `window_closed` (exit
    `completed`) follows; the scored phase has no later closure event;
  - `results_shown` — `phase` `feedback`, `packet_id`, `line_ids`;
    only after `first_responses_completed`; once per packet;
  - `help_consulted` — `phase`, `view`, the packet and decision it was
    opened on;
  - `series_closed_at_review` — first-response (or orientation) phase
    only: the closure snapshot and `closure_reason` `closed_at_review`;
    the kit's `window_closed` (censored) follows;
  - `prior_load_checked` — written once per page load after a reload,
    at the first run of the reload guard (Concourse entry; research-owner
    closeout ruling of 9 October 2026, register §5.290 (a)): `phase`
    `series`, `page_load_index`, `prior_page_load_event_count`,
    `prior_opening_found`, `prior_briefing_found`, `history_continuous`
    (the recovered history holds at least one record, its sequence
    numbers run from 1 without a gap or a duplicate, and the store's
    meta record was readable — `recovered_from_chunks` false) and
    `prior_opening_absence_established` (no opening found AND
    continuous); `input_mode` `system`; never on a first page load;
    before the hold-back record when an opening is found;
  - `technical_failure` — the kit's record (`detail`); the reload
    hold-back uses the detail `reload after administration: desk not
re-run` and is read as a hold-back only in a load without an
    `opportunity_opened`; a fault after completion is recorded with
    `phase` `feedback` and never enters the value.
- **Extraction rules** (`src/measurement/features/m14.ts`): current-load
  events only; the value is recounted from the `first_response` events
  (each response's correctness recomputed from the content module's key
  for that decision and content version) and compared with the event's
  own `correct` flag and with the closure snapshot. `technical_failure`,
  never a value, for contradictory, malformed or unverifiable SCORED
  evidence — an unknown or mismatched version or opportunity, an unknown
  packet, decision or option, a decision of another packet, a content
  version that does not match its packet, a packet or decision presented
  twice, out of the assigned order or before the previous first
  response, a first response without its presentation, a second first
  response, a `correct` flag that contradicts the key, a CANNOT SOLVE
  marked correct or carrying an option, an option response without an
  option of its own decision, a non-boolean `correct`, a `key_option_id`
  that disagrees with the content, a first response outside
  `measurement` or after the completion, six first responses without the
  completion snapshot or that snapshot with fewer, a snapshot that
  disagrees with the recount, ANY `results_shown` before the completion
  (also in a series that never reaches six), and a family event of the
  load without a usable, unique `sequence` (the §5.259 convention).
  A held-back load (the kit's reload record and no opening of its own)
  still reads a `presented` record of its own, so its exposure stage is
  accurate. Legitimate missingness is never a technical failure. A defect confined
  to unscored records (a `source_closed` without its opening, an orphan
  draft, a help record without a decision, a `sources_opened_before` list
  that disagrees with the openings) sets `exposure_record_consistent:
false` in the components and leaves the row unchanged. Dispositions:
  six verified first responses ⇒ `observed` (`completed`), stable
  whatever follows; one to five answered and closed at the review ⇒
  `incomplete`, censored; never briefed and never opened ⇒
  `not_presented`; briefed and never opened ⇒ `pending`
  (`briefed_not_opened`) while open and null `no_eligible_event`
  (`briefed_not_opened`, censored, `closed_at_review`) at the review
  closure; opened and unanswered at the review closure ⇒
  `no_eligible_event` (`orientation_only` or `opened_no_first_response`);
  still open ⇒ `pending`; a load after a reload without an
  `opportunity_opened` of its own ⇒ `interrupted` (read before any
  position is compared, so a sequence defect on such a load never
  overrides it) UNLESS its own `prior_load_checked` record establishes
  the absence of an earlier opening (its flags agreeing: established,
  continuous, no opening found, at least one earlier record), in which
  case the load is read exactly as a first load — the same integrity
  checks, then the never-opened dispositions above (closeout ruling of
  9 October 2026, register §5.290 (a): a load without a check, a
  discontinuous history or a found opening never establishes it; a
  self-contradictory check, a check claiming absence beside the
  hold-back, two checks, a check on a first page load, or a check that
  found an earlier opening beside an opening of this load set
  `exposure_record_consistent: false` and establish nothing, the
  hold-back winning and the row otherwise as the other evidence reads
  it); a fault in the
  first-response phase ⇒ `technical_failure` with the answers kept in
  the components; never `declined`. Precedence: `interrupted` >
  `technical_failure` > `pending` > the closed-series outcomes.
  Components (beside the value, never inside it): the exposure stages
  (`briefed`, `desk_opened`, `orientation_acknowledged`,
  `packets_presented`, `decisions_presented`, each with its sequence
  where recorded, and `never_opened_reason` — `briefed_not_opened`,
  `not_briefed_not_opened` or null), `reload_check` (`page_reloaded`,
  `checked`, `prior_opening_found`, `prior_briefing_found`,
  `history_continuous`, `prior_opening_absence_established`), the
  versions and orders, `by_packet` (numerator,
  denominator, planned 3, omissions), `omissions`
  (`unanswered_decision_ids`, `unpresented_decision_ids`),
  `source_openings` per packet (available, opened, open counts), per
  decision the response and its source-use record (per establishing set
  the sources opened before / the set's size and `all_opened_before`),
  `help_consults` by phase, `results_shown`, `exposure_record_consistent`.

U18 (M15, candidates as before; one new provisional family, no canonical
event, no scoring-plan variable, no formula changed): the Diagnostics
Laboratory evidence table leaves the v2 one-system causal-model bench under
research-owner decision D-U18-1 of 10 October 2026 (register §4 "Unit 18",
§5.291); the legacy layered cipher moves to a secondary identity that no
extractor reads.

- **M15** — family `proto_m15_systems_`; ONE opportunity
  `proto_m15_systems_series`; the kit's window id `m15_system_s1`; box
  window ids `m15_system_s1` and `m15_system_s2` (carried as
  `box_window_id`); object `m15_relay_bench`; `entry_state_version` =
  `m15-systems-v1`; content versions `m15-s1-v1` and `m15-s2-v1`. The v2 ids
  `proto_m15_layered_cipher` / `proto_m15_cipher_*` / window `m15_causal_w1`
  are retired from the route and keep their v2 meaning in the frozen ledger;
  this build writes none of them. The legacy layered cipher (developer alias
  only) now writes `secondary_m15_layered_cipher` (opportunity) /
  `secondary_m15_cipher_*` (events) — M15's `secondary_ids` in the register,
  read by no extractor and never a contributor to the M15 row.
- **Phases.** `orientation` (the card); `exploration` (the single-dial TESTs
  of a box before its wiring); `model` (the wiring step's drafts, commitment
  and acknowledgement); `measurement` (the questions: one immutable first
  response each — a confirmed option or a confirmed CANNOT SOLVE — and no
  correctness feedback of any kind); `feedback` (the results, only after the
  fourth first response); `closure`.
- **Every event the model emits** carries the kit's fields (`measure_id`,
  `opportunity_id`, `window_id`, `entry_state_version`, `presented_at_ms`,
  `window_status`, the validity fields), `measurement_protocol_version`,
  `phase` and — when it concerns a box or a question — `box_id`, `box_index`
  (1–2), `box_window_id`, `content_version`, `question_id`, `question_index`
  (1–2) and `question_global_index` (1–4); `input_mode` is `pointer`,
  `keyboard` or `system`. The kit's own records (`presented`,
  `opportunity_opened`, `window_closed`, `technical_failure`) carry the
  kit's fields and `input_mode: 'system'` only (`windowKit.ts` is outside
  the unit). Suffixes:
  - `presented` — Kai's laboratory briefing acknowledged (each of the four
    `lab_brief_ack*` handlers): exposure only, not a bench opening and not a
    question presentation;
  - `opportunity_opened` — the first opening; `entry_state_snapshot`:
    `boxes_planned` (2), `predictions_planned` (4), `assigned_box_order`,
    per box {`box_id`, `box_window_id`, `content_version`, `dial_ids`,
    `unit_ids`, `wiring_option_ids`, `wiring_key_option_id`, `question_ids`,
    per question `option_ids` and `key_option_id`}, `exploration`
    (`single_dial_tests_close_at_wiring`), `model_commit`
    (`required_before_questions`), `cannot_solve_available` (true),
    `cannot_tell_available` (true), `feedback`
    (`after_all_first_predictions`), `stop_control` (false), `settle_ms`
    (400), `stage`;
  - `orientation_acknowledged`; `series_reopened` and `panel_left` — `view`
    (written while the bench is live, never on a closed record);
  - `box_presented` — `assigned_position`, `realised_position`,
    `dials_available`, `wiring_option_ids`, `question_ids`; exactly once per
    box, phase `exploration`;
  - `test_run` — `dial_id`, `run_index` (per dial), `listing` (the text
    shown) and `steps` (the moves per step); phase `exploration`; an
    exploration record, never a response; only before the box's
    `wiring_recorded` (a later request records nothing);
  - `wiring_drafted` — `option_id` (null when cleared),
    `previous_option_id`; phase `model`; never a response;
  - `wiring_recorded` — once per box, phase `model`: `response_kind`
    (`option` | `cannot_tell`), `option_id` (null for CANNOT TELL),
    `correct` (the recorded option is the station wiring; false for CANNOT
    TELL), `key_option_id`, `tests_before` (runs per dial),
    `dials_tested_before`, `drafts_before`, `help_consults_before`,
    `active_ms`, `refused_presses`, `draft_at_commit`, `input_mode`;
  - `question_presented` — `assigned_position` (the global index),
    `realised_position`, `option_ids`; exactly once per question; only after
    its box's `wiring_recorded`;
  - `option_drafted` — `option_id` (null when cleared),
    `previous_option_id`; never a response;
  - `commit_requested` — `target` (`wiring` | `question`), `kind` (`option` |
    `cannot`), `option_id`; `commit_cancelled` — `target`, `kind`, `reason`
    (`keep_working` | `panel_left`), `refused_presses`;
    `commit_press_refused` — `target`, `kind`, `reason` (`dialog_settling`),
    `since_opened_ms`, `settle_ms`; recorded once per dialog, the count
    carried on the record; `commit_without_draft` — RECORD WIRING / RECORD
    ANSWER with no draft (`target`);
  - `first_response` — exactly one per answered question, phase
    `measurement`: `response_kind` (`option` | `cannot_solve`), `option_id`
    (null for CANNOT SOLVE), `correct` (always false for `cannot_solve`),
    `key_option_id`, `recorded_wiring_option_id` (the box's recorded option,
    or `cannot_tell`), `consistent_with_recorded_wiring` (boolean; null when
    the wiring was CANNOT TELL, the response is CANNOT SOLVE, or the
    recorded wiring's answer is magnitude-dependent under preview §7.2 —
    none of the eight options is), `tests_before` (runs per dial),
    `drafts_before`, `help_consults_before`, `active_ms`, `focused_ms` (the
    focused clock, null if unavailable), `refused_presses`,
    `draft_at_commit`, `input_mode`;
  - `response_acknowledged` — `line_id` (`wiring_recorded` after a wiring,
    `answer_recorded` after an answer), `next_control` (`first_question` |
    `next_question` | `next_box` | `show_results`), `answered_count`;
    identical in content for every response of its kind;
  - `box_completed` — the box's record (the wiring and its two questions);
  - `first_responses_completed` — with the fourth first response: the
    closure snapshot (`boxes_planned`, `predictions_planned`,
    `boxes_presented`, `models_recorded`, `models_correct`,
    `questions_presented`, `predictions_answered`,
    `correct_first_predictions`, `cannot_solve_count`, `cannot_tell_count`,
    `by_box`, per question `presented`, `answered`, `response_kind`,
    `option_id`, `correct`) and `closure_reason` `completed`; the kit's
    `window_closed` (exit `completed`) follows; the scored phase has no
    later closure event;
  - `results_shown` — phase `feedback`, `box_id`, `line_ids`; only after
    `first_responses_completed`; once per box;
  - `help_consulted` — `phase`, `step` (`wiring` | the view), `view`, the
    box and question it was opened on;
  - `series_closed_at_review` — orientation, exploration, wiring or question
    phase only: the closure snapshot and `closure_reason`
    `closed_at_review`; the kit's `window_closed` (censored) follows;
  - `prior_load_checked` — written once per page load after a reload, at the
    first run of the reload guard (the Diagnostics Laboratory's `create()`;
    decision D-U18-1 item 6, the closeout ruling §5.290 (a) applied to M15):
    `page_load_index`, `prior_page_load_event_count`, `prior_opening_found`,
    `prior_briefing_found`, `history_continuous` and
    `prior_opening_absence_established`; `input_mode` `system`; never on a
    first page load; before the hold-back record when an opening is found;
  - `technical_failure` — the kit's record (`detail`); the reload hold-back
    uses the detail `reload after administration: bench not re-run` and is
    read as a hold-back only in a load without an `opportunity_opened`; a
    fault after completion is recorded with `phase` `feedback` and never
    enters the value.
- **Extraction rules** (`src/measurement/features/m15.ts`): current-load
  events only; the value is recounted from the `first_response` events (each
  response's correctness recomputed from the content module's key for that
  question and content version) and compared with the event's own `correct`
  flag and with the closure snapshot; an answer counts whatever wiring was
  recorded and whatever tests were run. `technical_failure`, never a value,
  for contradictory, malformed or unverifiable SCORED evidence — an unknown
  or mismatched version or opportunity, an unknown box, question or option,
  a question of another box, a content version that does not match its box,
  a box or question presented twice or out of the assigned order, a box
  presented before every question of the earlier boxes had its first
  response, a question presented before the previous first response or
  before its box's wiring, a first response without its presentation, a
  second first response, a `correct` flag that contradicts the key, a CANNOT
  SOLVE marked correct or carrying an option, an option response without an
  option of its own question, a non-boolean `correct`, a `key_option_id`
  that disagrees with the content, a first response outside `measurement` or
  after the completion, four first responses without the completion snapshot
  or that snapshot with fewer, a snapshot that disagrees with the recount,
  ANY `results_shown` before the completion (also in a series that never
  reaches four), a family event of the load without a usable, unique
  `sequence` (the §5.259 convention), and a `presented` or
  `prior_load_checked` record of another opportunity or version or without a
  usable sequence. Legitimate missingness is never a technical failure. A
  defect confined to unscored records sets a component flag and leaves the
  row unchanged: `model_record_consistent: false` for a `test_run` after the
  box's `wiring_recorded`, two `wiring_recorded` for one box, a
  `wiring_recorded` whose `correct` or key disagrees with the wiring key, a
  `wiring_recorded` for a box never presented or with an unknown option or
  kind (it leaves the box without a recorded wiring, so a question presented
  after it voids the row as presented before its box's wiring), or a
  response whose `recorded_wiring_option_id` / `tests_before` disagree with
  the box's record; `exposure_record_consistent: false` for an orphan draft,
  a help record without its box or question, a `results_shown` without a
  box, a check record on a first load, two check records, a
  self-contradictory check, a check claiming absence beside the hold-back,
  or a check that found an earlier opening beside an opening of this load.
  Dispositions: four verified first responses ⇒ `observed` (`completed`),
  stable whatever follows; one to three answered and closed at the review ⇒
  `incomplete` with the value and its denominator, censored; one to three
  answered and still open ⇒ `pending` with the answers in the components
  (D-U18-1 item 8); never briefed and never opened ⇒ `not_presented` (also
  at the review closure); briefed and never opened ⇒ `pending`
  (`briefed_not_opened`) while open and null `no_eligible_event`
  (`briefed_not_opened`, censored, `closed_at_review`) at the review
  closure; opened and unanswered at the review closure ⇒ `no_eligible_event`
  (`orientation_only` | `no_wiring_recorded` |
  `wiring_only_no_first_response`, as reached); still open ⇒ `pending`; a
  load after a reload without an `opportunity_opened` of its own ⇒
  `interrupted` (read before any position is compared) UNLESS its own
  `prior_load_checked` record establishes the absence of an earlier opening
  (flags agreeing: established, continuous, no opening found, at least one
  earlier record), in which case the load is read exactly as a first load;
  held back after a reload ⇒ `interrupted` (also when the earlier load
  completed all four); a fault in the first-response phase ⇒
  `technical_failure` with the answers kept in the components; never
  `declined`. Precedence: `interrupted` > `technical_failure` > `pending` >
  the closed-series outcomes. Components (beside the value, never inside
  it): the exposure stages (`briefed`, `bench_opened`,
  `orientation_acknowledged`, `boxes_presented`, `questions_presented`, each
  with its sequence where recorded, and `never_opened_reason`),
  `reload_check`, the administration and content versions, the assigned and
  realised box and question orders, `observations_share_one_episode: true`,
  `first_response_phase_complete` and its closure, `predictions_answered` /
  `predictions_planned`, `cannot_solve_count`, `cannot_tell_count`, `by_box`
  (numerator, denominator, planned 2, omissions per box), `omissions`
  (`unanswered_question_ids`, `unpresented_question_ids`), `model` (per box
  the recorded wiring, `wiring_correct`, the wiring key; `models_recorded` /
  `models_correct` / `models_planned` 2), `exploration` (per box runs per
  dial before the wiring, the dials tested,
  `both_dials_tested_before_wiring`, the total), per question the response
  kind, option, correctness, key, `recorded_wiring_option_id`,
  `consistent_with_recorded_wiring`, `tests_before`, drafts, help consults,
  active and focused time, input mode, `help_consults` by phase,
  `results_shown`, `exposure_record_consistent`, `model_record_consistent`.
  No total mixes model, exploration and prediction correctness; no total
  across items.

U19 (M16, candidates as before; one new provisional family, no canonical
event, no scoring-plan variable, no formula changed): the Diagnostics
Laboratory protocol console leaves the v2 protocol-update terminal task under
research-owner decision D-U19-1 with amendment A1 of 11 October 2026 (register
§4 "Unit 19", §5.302) and the owner's closeout rulings of 12 October 2026
(register §4 "Unit 19 closeout", §5.314: the card and example footer and one
help line name the keyboard navigation; the entry snapshot's declared task
definition is validated in full — no event, key, version or formula changed);
the legacy module stays untouched on the developer alias and its family is
read by no extractor.

- **M16** — family `proto_m16_handling_`; ONE opportunity
  `proto_m16_handling_series`; window `m16_handling_w1`; object and surface id
  `m16_protocol_console`; `entry_state_version` = `m16-handling-v1`; `form_id`
  `m16-form-1`; `rule_version` `m16-rule-v1`; `examples_version`
  `m16-examples-v1`; example ids `m16_e1` / `m16_e2`; vial ids `m16_v1` …
  `m16_v6`; option ids `m16_v<k>_d1` … `m16_v<k>_d4`; DON'T KNOW is the
  response kind `dont_know`, never an option id. The v2 ids
  `proto_m16_protocol_update` / `proto_m16_protocol_*` / window
  `m16_protocol_w1` / entry `m16-protocol-v1` are retired from the route and
  keep their v2 meaning in the frozen ledger and on the developer alias
  (`InformationProcessingLabScene.ts`); this build writes none of them on the
  route.

- **Phases.** `intro` (the first-opening card); `teaching` (the two worked
  examples and the boundary confirmation); `measurement` (the vials: one
  immutable first response each — a confirmed drawer or a confirmed DON'T KNOW
  — and no correctness feedback of any kind); `feedback` (the results, only
  after the sixth first response); `closure`.

- **Every event the model emits** carries the kit's fields (`measure_id`,
  `opportunity_id`, `window_id`, `entry_state_version`, `presented_at_ms`,
  `window_status`, the validity fields), `measurement_protocol_version`,
  `phase`, `form_id` and — when it concerns an example or a vial —
  `example_id` / `example_index` (1–2) or `vial_id` / `vial_index` (1–6);
  `input_mode` is `pointer`, `keyboard` or `system`. The kit's own records
  (`presented`, `opportunity_opened`, `window_closed`, `technical_failure`)
  carry the kit's fields and `input_mode: 'system'` only (`windowKit.ts` is
  outside the unit). Suffixes:
  - `presented` — Kai's laboratory briefing acknowledged (each of the four
    `lab_brief_ack*` handlers): exposure only, not a console opening and not a
    vial presentation; a console opened before the briefing writes no later
    `presented`;
  - `opportunity_opened` — the first opening; `entry_state_snapshot`:
    `vials_planned` (6), `examples_planned` (2), `form_id`, `rule_version`,
    `examples_version`, `example_ids`, `assigned_vial_order`, per vial
    {`vial_id`, `option_ids`, `key_option_id`}, `teaching`
    (`passive_worked_examples`), `examples_after_boundary` (`closed`),
    `rule_card` (`always_visible`), `dont_know_available` (true), `feedback`
    (`after_all_first_responses`), `stop_control` (false), `settle_ms` (400),
    `stage`;
  - `intro_acknowledged` — SHOW EXAMPLE 1; `series_reopened` and `panel_left` —
    `view` (written while the console is live, never on a closed record);
  - `example_viewed` — `example_id`, `example_index`, `view_index` (per
    example), `navigation` (`first` | `next` | `back` | `resume`); a teaching
    record, never a response; a view restored by CLOSE HELP or by KEEP READING
    is not a new record, a reopening in teaching is (`resume`);
  - `teaching_close_requested` — START THE SIX VIALS (`example_views`);
    `teaching_close_cancelled` — `reason` (`keep_reading` | `panel_left`),
    `refused_presses`; `teaching_closed` — once: `example_views` per example,
    `back_navigations`, `teaching_active_ms`, `help_consults_before` (the
    card's and the examples'), `refused_presses`, `input_mode`;
  - `vial_presented` — `assigned_position`, `realised_position`, `option_ids`;
    exactly once per vial; only after `teaching_closed` and, for vial k > 1,
    after vial k − 1's `first_response`; phase `measurement`;
  - `option_drafted` — `option_id` (null when cleared), `previous_option_id`;
    never a response;
  - `commit_requested` — `kind` (`option` | `dont_know`), `option_id`;
    `commit_cancelled` — `kind`, `option_id`, `reason` (`keep_working` |
    `panel_left`), `refused_presses`; `commit_press_refused` — `target`
    (`vial` | `teaching_close`), `kind`, `reason` (`dialog_settling`),
    `since_opened_ms`, `settle_ms`; recorded once per dialog, the count
    carried on the record; `commit_without_draft` — the opener RECORD DRAWER
    with no draft;
  - `first_response` — exactly one per answered vial, phase `measurement`:
    `response_kind` (`option` | `dont_know`), `option_id` (null for DON'T
    KNOW), `correct` (always false for `dont_know`), `key_option_id`,
    `drafts_before`, `help_consults_before`, `active_ms`, `focused_ms` (the
    focused clock, null if unavailable), `refused_presses`, `draft_at_commit`,
    `input_mode`;
  - `response_acknowledged` — `line_id` (`vial_recorded`), `next_control`
    (`next_vial` | `show_results`), `answered_count`; identical in content for
    every response;
  - `first_responses_completed` — with the sixth first response: the closure
    snapshot (`vials_planned`, `examples_planned`, `intro_acknowledged`,
    `examples_viewed`, `back_navigations`, `teaching_active_ms`,
    `teaching_closed`, `vials_presented`, `vials_answered`,
    `correct_first_applications`, `dont_know_count`, per vial `presented`,
    `answered`, `response_kind`, `option_id`, `correct`) and `closure_reason`
    `completed`; the kit's `window_closed` (exit `completed`) follows; the
    scored phase has no later closure event;
  - `results_shown` — phase `feedback`, `page` (1 | 2), `vial_ids`; only after
    `first_responses_completed`; only when that page is actually displayed;
    once per page (a page never displayed has none; a BACK to a page already
    shown, a re-display and a CLOSE HELP restore write nothing);
  - `help_consulted` — `phase`, `view` (`intro`, `example_1`, `example_2`,
    `vial_<k>`, `ack_<k>`, `results_1`, `results_2`) and the example or vial
    it was opened on; a logged interaction, never an answer;
  - `series_closed_at_review` — an open series only (the card, teaching, or 0–5
    vials answered): the closure snapshot and `closure_reason`
    `closed_at_review`; the kit's `window_closed` (censored) follows;
  - `prior_load_checked` — written once per page load after a reload, at the
    first run of the reload guard (the Diagnostics Laboratory's `create()`;
    decision D-U19-1 item 8, the closeout ruling §5.290 (a) and D-U18-1 item 6
    applied to M16): `page_load_index`, `prior_page_load_event_count`,
    `prior_opening_found`, `prior_briefing_found`, `history_continuous` and
    `prior_opening_absence_established`; `input_mode` `system`; never on a
    first page load; before the hold-back record when an opening is found;
  - `technical_failure` — the kit's record (`detail`); the reload hold-back uses
    the detail `reload after administration: console not re-run` and is read
    as a hold-back only in a load without an `opportunity_opened`; a fault
    after completion is recorded with `phase` `feedback` and never enters the
    value.

- **Extraction rules** (`src/measurement/features/m16.ts`): current-load
  events only; the value is recounted from the `first_response` events (each
  response's correctness recomputed from the content module's key for that
  vial) and compared with the event's own `correct` flag and with the closure
  snapshot. `technical_failure`, never a value, for contradictory, malformed
  or unverifiable SCORED evidence — an unknown or mismatched
  `entry_state_version` or opportunity on any event of the family, a `form_id`
  other than `m16-form-1` on a `vial_presented` or `first_response`, an entry
  snapshot whose `form_id` or `rule_version` is unknown or whose declared task
  definition is not the content's complete definition — exactly six vial
  records, each a record of a known vial, none twice, each with exactly four
  unique option ids in the fixed order and with the content's key; a missing,
  duplicate, conflicting, unknown or malformed record or list fails the row
  (the U19 closeout of 12 October 2026, register §5.314 (6): one matching
  record beside a conflicting one never passes; task-definition metadata only,
  the responses' own rules unchanged), or whose `vials_planned` is not the
  number 6 or whose `assigned_vial_order` is not exactly `m16_v1`–`m16_v6` in
  that order (the owner's correction of 12 October 2026, §5.314 (6): the
  already-approved count and order enforced; the per-vial records' storage
  order unrestricted; six planned vials never six answers; `examples_version`
  and the other snapshot fields are not failure conditions) — an unknown
  `vial_id` or `option_id` or an option of another vial, a vial presented
  twice, before `teaching_closed`, before the previous vial's first response
  or out of the assigned order, a first response without its presentation, a
  second first response for one vial, a `correct` flag that contradicts the
  key, a DON'T KNOW marked correct or carrying an option, an option response
  without an option of its own vial, a non-boolean `correct`, a
  `key_option_id` that disagrees with the content, a first response outside
  `measurement` or after the completion, six first responses without the
  completion snapshot or that snapshot with fewer than six, a snapshot that
  disagrees with the recount, ANY `results_shown` before the completion (also
  in a series that never reaches six), a double closure or a closure after the
  completion, a family event of the load without a usable, unique `sequence`
  (the §5.259 convention), and a `presented` or `prior_load_checked` record of
  another opportunity or version or without a usable sequence. Legitimate
  missingness is never a technical failure. A defect confined to unscored
  records sets a component flag and leaves the row unchanged:
  `teaching_record_consistent: false` for an `example_viewed` after
  `teaching_closed`, before the opening or with an unknown example, a second
  `teaching_closed`, a `teaching_closed` before the opening or with another
  form (such a record is not counted as the boundary, so a vial presented
  after it is a vial before `teaching_closed` and voids the scored evidence),
  a `teaching_closed` whose `example_views` disagree with the views counted,
  or an `examples_version` in the snapshot other than `m16-examples-v1`;
  `exposure_record_consistent: false` for an orphan draft (an unknown or
  unpresented vial), a help record without a phase or a measurement help
  record without its vial, a `results_shown` without a page or a page recorded
  as shown twice, a check record on a first load, two check records, a
  self-contradictory check, a check claiming absence beside the hold-back, or
  a check that found an earlier opening beside an opening of this load.
  Dispositions: six verified first responses ⇒ `observed` (`completed`),
  stable whatever follows; one to five answered and closed at the review ⇒
  `incomplete` with the value and its observed denominator, censored; one to
  five answered and still open ⇒ `pending` with the answers in the components
  (D-U19-1 item 9); never briefed and never opened ⇒ `not_presented` (also at
  the review closure); briefed and never opened ⇒ `pending`
  (`briefed_not_opened`) while open and null `no_eligible_event`
  (`briefed_not_opened`, censored, `closed_at_review`) at the review closure;
  opened and unanswered at the review closure ⇒ `no_eligible_event`
  (`intro_only` | `teaching_only` | `teaching_closed_no_first_response`, as
  reached); still open ⇒ `pending`; a load after a reload without an
  `opportunity_opened` of its own ⇒ `interrupted` (read before any position is
  compared) UNLESS its own `prior_load_checked` record establishes the absence
  of an earlier opening (flags agreeing: established, continuous, no opening
  found, at least one earlier record), in which case the load is read exactly
  as a first load; held back after a reload ⇒ `interrupted` (also when the
  earlier load completed all six); a fault while the series is open ⇒
  `technical_failure` with the answers kept in the components; never
  `declined`. Precedence: `interrupted` > `technical_failure` > `pending` >
  the closed-series outcomes. Components (beside the value, never inside it):
  the versions (`administration_version`, `form_id`, `rule_version`,
  `examples_version`), the assigned and realised vial orders,
  `observations_share_one_episode: true`, the exposure stages kept distinct
  (`briefed` with its sequence, `console_opened` with its sequence and
  `stage_at_open`, `intro_acknowledged`, `examples_viewed` per example,
  `teaching_closed`, `vials_presented`, `never_opened_reason`), `teaching`
  (`examples_viewed`, `back_navigations`, `teaching_active_ms`,
  `teaching_closed`), `reload_check`, `first_response_phase_complete` and its
  closure, `vials_answered` / `vials_planned`, `dont_know_count`, `omissions`
  (`unanswered_vial_ids`, `unpresented_vial_ids`), per vial the response kind,
  option, correctness, key, `error_kind` (`row` | `column` | `row_and_column`;
  null for the key and DON'T KNOW), drafts, help consults, active and focused
  time, input mode, `help_consults` by phase, `results_shown` per page,
  `feedback_phase_faults`, `exposure_record_consistent`,
  `teaching_record_consistent`. No total mixes teaching and application; no
  total across items.

U20 (M18, candidates as before; one new provisional family, no canonical
event, no scoring-plan variable, no formula changed): the Diagnostics
Laboratory diagnostic board leaves the v2 single-case board under
research-owner decision D-U20-1 of 12 October 2026 (register §4 "Unit 20",
§5.315); the legacy board stays untouched on the developer alias and its
families are read by no extractor. The six responses are clustered
observations of three independently designed cases inside one board episode,
never three or six independent situations; the two rows are never combined.

- **M18** — family `proto_m18_cases_`; ONE opportunity
  `proto_m18_cases_series`; window `m18_cases_w1`; object and surface id
  `m18_diagnostic_board`; `entry_state_version` = `m18-cases-v1`; `form_id`
  `m18-form-1`; `content_version` `m18-content-v1`; case ids `m18_c1` …
  `m18_c3`; test ids `m18_c<k>_ta` / `_tb` / `_tc`; part option ids
  `m18_c<k>_p1` … `_p4`; step option ids `m18_c<k>_s1` … `_s4`; slots
  `diagnosis` | `prediction`; CANNOT SOLVE is the response kind
  `cannot_solve`, never an option id; result ids per test (the content's
  result keys, never shown) `tone` / `silent` (case 1), `air_6` / `air_1` /
  `air_0` and `hot` / `cool` (case 2), `no_gap` / `gap`, `none` / `on`,
  `off` / `lit` (case 3). The v2 ids `proto_m18_lattice_fault_diagnosis` /
  `proto_m18_fault_*` / window `m18_diagnosis_w1` / entry `m18-fault-v1` are
  retired from the route and keep their v2 meaning in the frozen ledger and
  on the developer alias (`InformationProcessingLabScene.ts`); this build
  writes none of them on the route; `proto_m18_pressure_*` (Pump House) is
  untouched.

- **Phases.** `intro` (the first-opening card); `measurement` (the cases:
  per case the on-request tests, one immutable first diagnosis — a part or
  CANNOT SOLVE — that closes the tests, then one immutable first
  planned-step answer — an option or CANNOT SOLVE — and no correctness
  feedback of any kind); `feedback` (the results, only after the sixth first
  response); `closure`.

- **Every event the model emits** carries the kit's fields (`measure_id`,
  `opportunity_id`, `window_id`, `entry_state_version`, `presented_at_ms`,
  `window_status`, the validity fields), `measurement_protocol_version`,
  `phase`, `form_id`, `content_version` and — when it concerns a case —
  `case_id` / `case_index` (1–3) and, for responses, `slot`; `input_mode` is
  `pointer`, `keyboard` or `system`. The kit's own records (`presented`,
  `opportunity_opened`, `window_closed`, `technical_failure`) carry the
  kit's fields and `input_mode: 'system'` only (`windowKit.ts` is outside
  the unit). Suffixes:
  - `presented` — Kai's laboratory briefing acknowledged (each of the four
    `lab_brief_ack*` handlers): exposure only, not a board opening and not a
    case presentation; a board opened before the briefing writes no later
    `presented`;
  - `opportunity_opened` — the first opening; `entry_state_snapshot`:
    `cases_planned` (3), `responses_per_case` (2), `form_id`,
    `content_version`, `assigned_case_order`, per case {`case_id`,
    `test_ids`, `part_option_ids`, `key_part_option_id`, `step_option_ids`,
    `key_step_option_id`}, `prediction_target` (`actual_case`), `tests`
    (`on_request_unlimited`), `tests_close` (`at_part_record`), `step_after`
    (`part_record`), `cannot_solve_available` (true), `feedback`
    (`after_all_first_responses`), `stop_control` (false), `settle_ms`
    (400), `stage`, `prior_m13_window_status` (route context only);
  - `intro_acknowledged` — START CASE 1; `series_reopened` and `panel_left` —
    `view` (written while the board is live, never on a closed record);
  - `case_presented` — `assigned_position`, `realised_position`, `test_ids`,
    `part_option_ids`; exactly once per case; case 1 only after
    `intro_acknowledged`; case k > 1 only after case k − 1's `first_response`
    (slot `prediction`) and from its acknowledgement; phase `measurement`;
  - `test_run` — `test_id`, `result_id`, `run_index` (per test),
    `case_test_runs` (per case, after this run), `repeat`; only between its
    case's `case_presented` and that case's `diagnosis` first response;
    never a response;
  - `press_refused` — `target` (`test` | `view`), `reason`
    (`repeat_within_settle` | `settling`), `since_ms`, and for a view the
    `view` and the `control` refused; a descriptive record;
  - `option_drafted` — `slot`, `option_id` (null when cleared),
    `previous_option_id`; never a response;
  - `commit_requested` — `slot`, `kind` (`option` | `cannot_solve`),
    `option_id`; `commit_cancelled` — `slot`, `kind`, `option_id`, `reason`
    (`keep_working` | `panel_left`), `refused_presses`;
    `commit_press_refused` — `slot`, `kind`, `reason` (`dialog_settling`),
    `since_opened_ms`, `settle_ms` (once per dialog, the count carried);
    `commit_without_draft` — `slot`;
  - `first_response` — exactly one per case and slot, phase `measurement`:
    `slot`, `response_kind` (exactly `option` | `cannot_solve`), `option_id`
    (null for `cannot_solve`), `correct` (always false for `cannot_solve`;
    the step keyed to the ACTUAL case whatever part was recorded — D-U20-1
    item 1), `key_option_id`, `tests_run_before` (ids), `test_runs_before`
    (incl. repeats; both the case's test use at the part record, so the
    prediction slot repeats the diagnosis slot's), `drafts_before`,
    `help_consults_before`, `active_ms`, `focused_ms` (null if unavailable),
    `refused_presses`, `draft_at_commit`, `input_mode`;
  - `tests_closed` — immediately after the diagnosis first response:
    `tests_run` (ids), `test_runs`; `step_presented` — after `tests_closed`:
    `step_option_ids`; exactly once per case;
  - `response_acknowledged` — `line_id` (`case_recorded`), `next_control`
    (`next_case` | `show_results`), `cases_recorded`; identical in content
    for every response;
  - `first_responses_completed` — with the sixth first response: the closure
    snapshot (`cases_planned`, `responses_per_case`, `intro_acknowledged`,
    `cases_presented`, `parts_recorded`, `steps_recorded`,
    `correct_first_diagnoses`, `correct_consequence_predictions`,
    `cannot_solve_parts`, `cannot_solve_steps`, per case {`case_id`,
    `case_index`, `presented`, `part` {`answered`, `response_kind`,
    `option_id`, `correct`}, `step_presented`, `step` {the same},
    `tests_run`, `test_runs`}) and `closure_reason` `completed`; the kit's
    `window_closed` (exit `completed`) follows;
  - `results_shown` — phase `feedback`, `page` (1–3), `case_id`; only after
    `first_responses_completed`; only when that page is displayed; once per
    page; `help_consulted` — `phase`, `view` (`intro`, `case_<k>`,
    `step_<k>`, `ack_<k>`, `results_<k>`);
  - `series_closed_at_review` — an open series only: the closure snapshot
    and `closure_reason` `closed_at_review`; the kit's `window_closed`
    (censored) follows;
  - `prior_load_checked` — once per page load after a reload, at the first
    `guardM18Reload` run (the laboratory's `create()`): `page_load_index`,
    `prior_page_load_event_count`, `prior_opening_found`,
    `prior_briefing_found`, `history_continuous`,
    `prior_opening_absence_established`; never on a first load; before the
    hold-back record when an opening is found;
  - `technical_failure` — the kit's record (`detail`); the reload hold-back
    uses the detail `reload after administration: board not re-run`; a
    fault after completion is recorded with `phase` `feedback` and never
    enters a value.

- **Validated declarations** (the owner's retention of 12 October 2026, as
  part of the approved administration; every failure `shared`): on the entry
  snapshot `form_id`, `content_version`, `cases_planned` (the number 3),
  `responses_per_case` (the number 2), `assigned_case_order` (exactly the
  three ids in order), `cases` (three records, each a known case once, its
  tests, part options and step options equal to the content's in fixed
  order, both keys the content's; storage order free; additive fields
  allowed), `prediction_target` `actual_case`, `tests`
  `on_request_unlimited`, `tests_close` `at_part_record`, `step_after`
  `part_record`, `cannot_solve_available` true, `feedback`
  `after_all_first_responses`, `stop_control` false. NOT validated:
  `settle_ms`, `stage`, `prior_m13_window_status` (read into the
  components).

- **Extraction rules** (`src/measurement/features/m18.ts`, contract §9.4
  and §10; both rows from one read): current-load events only; each row is
  recounted from the `first_response` events of its slot (correctness
  recomputed from the content's keys) and compared with the event's own
  `correct` flag and with the closure snapshot. Every failure condition
  carries a SCOPE (decision D-U20-1 item 11, the approved alternative):
  `shared` voids BOTH rows — an unknown or mismatched `entry_state_version`
  or opportunity on any event; a `form_id` or `content_version` absent or
  other on a `case_presented`, `test_run`, `step_presented`,
  `first_response` or `first_responses_completed`; a declaration above
  missing, malformed or contradictory; an unknown case on a presentation,
  test or step; the board opened twice; a case presented twice, out of the
  assigned order, before the opening, before the card was acknowledged,
  before the previous case's planned-step answer or after a closure; a test
  of another case, a test before its presentation, after its diagnosis or
  after a closure, a test run without a known result or with a result other
  than the content's; a step presented twice, before its diagnosis or after
  a closure; a diagnosis without, or before, its case presentation; a
  prediction without, or before, its diagnosis or its step presentation; a
  draft or `commit_*` naming a case or an option not yet presented (a step
  option before its step); `results_shown` or a results help view before
  completion; the completion twice, after a closure or with fewer than six
  attributable records, or absent with six; a closure after completion or
  twice; a family event without a usable, unique `sequence`; a fault while
  the series was open; a closure snapshot absent, not a record, or
  disagreeing in a shared field (`cases_planned`, `cases_presented`, per
  case `presented` / `step_presented`, `closure_reason`). `uncertain` voids
  BOTH rows as `isolation_uncertain` — a `first_response` without a known
  case or slot, carrying an option of another case or of the other slot, or
  labelled outside the measurement phase before a closure. `slot` voids ONLY
  its row when the isolation test I1–I4 passes (otherwise both rows as
  `isolation_uncertain` with `isolation_failed`) — a `response_kind` not
  exactly `option` or `cannot_solve`, an option response without an option
  id or with an id that is no option of the series, a CANNOT SOLVE without
  the `option_id` field, with an option or marked correct, a non-boolean
  `correct`, a `correct` contradicting the key, a `key_option_id` not the
  content's, a second record for one case and slot, a response after a
  closure, or a closure snapshot disagreeing in that slot's fields
  (`parts_recorded`, `correct_first_diagnoses`, `cannot_solve_parts`, per
  case `part`; `steps_recorded`, `correct_consequence_predictions`,
  `cannot_solve_steps`, per case `step`); in the diagnosis slot an
  undetermined earliest record, a snapshot `part.response_kind` /
  `part.option_id` disagreement and a duplicate before an existing
  prediction of its case fail I4; in either slot a duplicate written between
  the next case's presentation and completion fails I4. The lifecycle, the
  completion count and each slot's `answered` are read from ATTRIBUTABLE
  response records written before any closure (the earliest per case and
  slot), an uncertain record counting as present for the completion check
  only; a defect confined to one slot never moves completion and is never
  re-detected as a shared defect; a slot already voided is not compared
  again with the snapshot (noted). `flag` sets a consistency flag and
  changes no row — `investigation_record_consistent` (overall and per case)
  false for a test run naming no test of the series, a `tests_closed`
  twice, before its diagnosis, absent after one or disagreeing with the
  recount, or a snapshot `tests_run` disagreement; `exposure_record_consistent`
  false for a draft or `commit_*` after a closure or with an unknown case or
  option, a results page recorded twice or without a page, a help record
  without a phase or a measurement help record without its case, a check
  record on a first load, two checks, a self-contradictory check, a check
  claiming absence beside the hold-back, or an opening found beside an
  opening of this load. Legitimate missingness is never a technical
  failure. Dispositions: six verified first responses ⇒ both rows
  `observed` (`completed`), stable whatever follows; while the series is
  open both rows null `pending` with the answers in the components — also
  with three parts recorded and a step pending (D-U20-1 item 9); at the
  review closure each row by its own count — 3 ⇒ `observed`, 1–2 ⇒
  `incomplete` with the value on its observed denominator, censored, 0 ⇒
  null `no_eligible_event` (the diagnosis row `intro_only` |
  `case_presented_no_response`; the prediction row `diagnosis_only` when
  parts exist, otherwise as the diagnosis row); never briefed and never
  opened ⇒ `not_presented` (also at the review closure); briefed and never
  opened ⇒ `pending` (`briefed_not_opened`) while open and null
  `no_eligible_event` (`briefed_not_opened`, censored, `closed_at_review`)
  at the review closure; a load after a reload without an
  `opportunity_opened` of its own ⇒ `interrupted` (read before any position
  is compared) UNLESS its own `prior_load_checked` record establishes the
  absence of an earlier opening (flags agreeing), in which case the load is
  read exactly as a first load; held back after a reload ⇒ `interrupted`
  (also when the earlier load completed all six); never `declined`.
  Precedence per row: `interrupted` > `technical_failure` > `pending` > the
  closed-series outcomes. Components (beside the values, never inside them;
  mirrored on both rows): `administration_version`, `form_id`,
  `content_version`, `prediction_target`, the assigned and realised case
  orders, `observations_share_one_episode: true`, the exposure stages kept
  distinct (`briefed` with its sequence, `board_opened` with its sequence
  and `stage_at_open`, `intro_acknowledged`, `cases_presented`,
  `steps_presented`, `never_opened_reason`), `reload_check`,
  `first_response_phase_complete` and its closure, per slot (`slots`)
  `answered` / `planned`, `cannot_solve_count`, `unanswered_case_ids`,
  `unpresented_case_ids`, per case (`cases`) `part` and `step` {response
  kind, option, correctness, key, drafts, help consults, active and focused
  time, input mode}, `tests_run_before_part`, `test_runs_before_part`,
  `repeated_test_runs`, `evidence_sufficient_before_part` and
  `step_answer_implied_by_recorded_part` (the descriptive indicators of
  D-U20-1 item 10 with their null rules: `true` / `false` only from
  trustworthy, valid ordinary option responses; a load whose final scope is
  `shared` or `isolation_uncertain` nulls both for EVERY case — an uncertain
  record, an undetermined part or any other I4 failure (owner clarification
  of 13 October 2026, register §5.327); under genuine isolation an isolated
  defect of a determinate record nulls only the consistency indicator of its
  case; they describe
  evidence availability and response consistency, never why an answer was
  wrong),
  `help_consults` by phase, `results_shown` per page,
  `feedback_phase_faults`, `prior_m13_window_status`,
  `investigation_record_consistent`, `exposure_record_consistent`; on a
  voided row `integrity_defect`, `defect_scope`, `isolation_failed`,
  `records_unscorable`; on a retained row beside a voided one
  `other_row_defect`. No total across slots or items.

U21 (M19, candidates as before; one new provisional family, no canonical
event, no scoring-plan variable, no formula changed): the Exterior Recovery
Yard coupling station leaves the v2 frozen coupling under research-owner
decision D-U21-1 of 13 October 2026 (register §4 "Unit 21", §5.328); the
legacy coupling module stays in the tree unchanged, off the route, and its
family is read by no extractor. The two lines are clustered observations
inside one yard visit and one panel, never two independent situations. The
U21 closeout of 14 October 2026 (register §5.342: per-view HELP / LEAVE
ids, a two-line fault record, the owner's acceptance of the shift-end
`closure_reason` mapping and of the kit window status after a fault)
changed no event, field, formula or disposition of this section.

- **M19** — family `proto_m19_lines_`; ONE opportunity
  `proto_m19_lines_series`; window `m19_lines_w1`; object and surface id
  `m19_coupling_panel`; `entry_state_version` = `m19-lines-v2`; `form_id`
  `m19-form-1`; `content_version` `m19-content-v2`; line ids `m19_l1`,
  `m19_l2`; check ids `m19_chk_q1` / `m19_chk_q2` with option ids
  `m19_chk_q<k>_o1` … `_o3`; settings line 1 `{ h1, h2, h3, feed }`, line 2
  `{ dial, bypass }`. Suffixes: `presented`, `opportunity_opened` (the
  entry snapshot: `lines_planned` 2, `line_order`, `form_id`,
  `content_version`, `boundary_rule` `designed_obstacle`,
  `continuation_rule` `further_new_executed_try`, `stop_control`
  `set_aside`, `time_limit` null, `check`
  `one_question_one_explanation_one_recheck`, `settle_ms` 400, `stage`),
  `intro_acknowledged`, `series_reopened` / `panel_left` (`view`),
  `prior_load_checked`, `closed_unopened` (`closure_reason` `shift_ended` |
  `closed_at_review`; a presented, never-opened panel only),
  `check_presented`, `option_drafted`, `check_answered` (`check_id`,
  `attempt`, `option_id`, `correct`), `explanation_shown`, `check_recorded`
  (`status`), `line_presented` (`assigned_position`, `realised_position`,
  `starting_setting`), `setting_changed`, `try_refused` (`reason`
  `already_tried` | `settling`), `attempt` (`attempt_index`, `setting`,
  `reading` LOW | OK | HIGH, `restored`, `after_boundary`,
  `since_boundary_focused_ms`), `difficulty_boundary` (`attempt_index`,
  `attempt_sequence`, `rule` `designed_obstacle`,
  `evidence_attempt_indices`; `input_mode: 'system'`; immediately after
  its attempt; once per line), `set_aside_requested`,
  `set_aside_cancelled`, `help_consulted`, `line_finished` (`finish`
  `restored` | `set_aside` | `shift_ended` | `closed_at_review` |
  `technical_failure` with the per-line companions), `series_completed`
  and `series_closed` (`closure_reason` `shift_ended` | `closed_at_review`;
  the closure snapshot) each with the kit's `window_closed`,
  `technical_failure` (`detail`, `line_id`). Every event carries `phase`
  (`intro` | `check` | `measurement` | `closure`), `form_id`,
  `content_version` and, for a line record, `line_id` / `line_index`. The
  v2 ids `proto_m19_progressive_valve` / `proto_m19_valve_*` /
  `m19_valve_w1` are retired from the route and keep their frozen meaning.
  Scored fields (contract §9.4) are integrity-checked by the rules S1–S7; a
  contradiction voids the row, never a silent repair; descriptive fields
  set flags only. Components: `administration_version`, `form_id`,
  `content_version`, `presented_in_current_load`,
  `observations_share_one_episode`, `check` (status and both answers), per
  line {`presented`, `attempts`, `refused_tries`, `boundary_attempt_index`,
  `evidence_attempt_indices`, `continued`, `tries_before_boundary`,
  `tries_after_boundary`, `refused_tries_after_boundary`,
  `changed_second_control_after_boundary`, `restored`,
  `restored_at_attempt`, `finish`, `eligible`, `censored`,
  `excluded_reason`, the focused-time companions, `help_consults`,
  `panel_leaves_after_boundary`, `continued_after_leaving`, Option A's
  `first_unsuccessful_try_index` and `continued_after_first_unsuccessful`},
  `nonresponse_kind`, `series_closure_reason`, `reload_check`, `flags`, on
  a voided row `integrity_defect`. The row's `closure_reason` is the
  framework's enum (`completed`, `route_departure` for the shift end,
  `closed_at_review`, `technical_failure`); the family's own reason is
  `series_closure_reason`. No total across items.

U22 (M20, candidates as before; one new provisional family, no canonical
event, no scoring-plan variable, no formula changed): the Records Workshop
feed console leaves the v2 antenna restoration under research-owner
decision D-U22-1 of 14 October 2026, recorded as the owner's SPECIFIC
selections — items 1–11 as recommended, item 12 the silent-release
alternative, item 13 the exploratory-label alternative (register §4 "Unit
22", §5.344); the legacy antenna module and its adapter functions stay in
the tree unchanged, off the route, and their family is read by no
extractor. The two channels are clustered observations inside one project,
one room and one shift, never two independent situations; the cued outcome
is conditional on no spontaneous resumption and is no ranking across
participants; the spontaneous count is a companion beside the value, never
inside it; the label is `exploratory` with `difficulty_established: false`.

- **M20** — family `proto_m20_feed_`; ONE opportunity
  `proto_m20_feed_project`; window `m20_feed_w1`; object and surface id
  `m20_feed_console`; `entry_state_version` = `m20-feed-returns-v2`;
  `form_id` `m20-form-1`; `content_version` `m20-content-v2`; channel ids
  `m20_ch_a`, `m20_ch_b`, which are also the occasion ids (never changed; a
  resume is not a new occasion). Suffixes: `presented`, `opportunity_opened`
  (the entry snapshot: `channels_planned` 2, `channel_order`,
  `steps_per_channel` 6, `cells_per_step` [3, 3, 4, 4, 5, 5],
  `hold_after_step` 2, `release_delay_ms` 30000,
  `notice_after_release_ms` 30000, `notice_ms` 6000, `notice_spacing_ms`
  8000, `refusal_rule` `vector_as_loaded_or_last_executed`, `credit_rule`
  `first_executed_align_after_cue`, `spontaneous_rule`
  `first_executed_align_after_release_before_cue`, `form_id`,
  `content_version`, `settle_ms` 400, `outdoor_prepared`, `stage`),
  `intro_acknowledged`, `console_reopened` / `console_left` (`view`),
  `held_visit` (a blocked approach), `released_visit` (a silent-window
  visit), `prior_load_checked`, `closed_unopened` (`closure_reason`
  `shift_signed_off` | `closed_at_review`; a presented, never-opened console
  only), `channel_started`, `step_presented` (`step_index`, `cells_n`,
  `cells`, `resumed`), `cell_changed`, `align_refused` (`reason`
  `as_loaded` | `repeat` | `settling` | `held`), `align_attempt`
  (`step_index`, `attempt_index`, `cells`, `differ`, `aligned`, `after_cue`,
  `in_silent_window`, `resumption` and the clock values, descriptive),
  `step_aligned`, `channel_held` (`held_at_ms`), `channel_released`
  (`released_at_ms` = `held_at_ms` + 30000; `written_at_ms`,
  `write_latency_ms` and the check descriptive; `input_mode: 'system'`),
  `cue_presented` (`presented_at_ms`, `released_at_ms`, `due_at_ms`,
  `deferred_ms`, `page_visible`, `page_focused`, `distance_to_console_px`,
  `remaining_steps`), `cue_notice_ended` (`ended_at_ms`, `ended_reason`
  `timeout` | `surface_opened` | `prompt_opened` | `shutdown` |
  `project_closed` | `technical_failure`, `displayed_ms`,
  `focus_lost_during_display`; written before any terminal record),
  `cue_cancelled` (`reason` `resumed_before_cue`; descriptive),
  `help_consulted`, `channel_aligned`, `project_completed` and
  `project_closed` (`closure_reason` `shift_signed_off` | `closed_at_review`;
  the closure snapshot with the per-channel records and
  `spontaneous_resumptions`) each with the kit's `window_closed`,
  `technical_failure` (`detail`, `channel_id`), and the yard's unmeasured
  `outdoor_brief_presented`, `outdoor_accepted`, `outdoor_stage_completed`,
  `outdoor_technical_failure` (phase `outdoor`; never counted). Every
  console event carries `phase` (`intro` | `measurement` | `cue` |
  `closure`), `form_id`, `content_version` and, for a channel record,
  `channel_id` / `occasion_id` / `channel_index`. The v2 ids
  `proto_m20_antenna_restoration` / `proto_m20_antenna_*` /
  `m20_antenna_start` / `m20_antenna_resume` are retired from the route and
  keep their frozen meaning. Scored fields (contract §9.4) are
  integrity-checked by the rules S1–S7; a contradiction voids the row, never
  a silent repair; descriptive fields set flags only. Components:
  `administration_version`, `form_id`, `content_version`,
  `presented_in_current_load`, `observations_share_one_project`,
  `cued_outcome_conditional_on_no_spontaneous_resumption`,
  `difficulty_established: false`, `spontaneous_resumptions` (0–2), per
  channel {`status`, `steps_done`, `attempts`, `held_at_ms`,
  `released_at_ms`, `cue_presented_at_ms`, `held_to_cue_ms`,
  `cue_deferred_ms`, `cue_displayed_ms`, `cue_ended_reason`,
  `focus_lost_during_display`, `distance_to_console_at_cue_px`,
  `held_visits`, `released_visits`, `refused_in_silent_window`,
  `spontaneous_attempt_index`, `release_to_spontaneous_wall_ms` /
  `_focused_ms`, `credited`, `credit_attempt_index`,
  `arrived_after_cue_without_credit`, `refused_after_cue_before_credit`,
  `steps_after_cue`, `aligns_after_cue`, `post_resumption_reentries`,
  `aligned`, `eligible`, `excluded_reason`, `work_focused_ms`,
  `cue_to_credit_wall_ms` / `_console_closed_ms`, `cue_to_closure_wall_ms` /
  `_console_closed_ms`}, `nonresponse_kind`, `project_closure_reason`,
  `outdoor_prepared`, `reload_check`, `flags`, on a voided row
  `integrity_defect`. The row's `closure_reason` is the framework's enum
  (`completed`, `route_departure` for the sign-off, `closed_at_review`,
  `technical_failure`); the family's own reason is `project_closure_reason`.
  No total across items. **Correction round 1 (research-owner amendment of
  14 October 2026, register §5.359–§5.361; all provisional):** due releases
  are also written while the console is open — before every console
  command and by the open console's ≤ 250 ms check — with the new
  descriptive `check` value `console` (`released_at_ms` unchanged, the real
  write time); CHANNELS [C] writes no record; a voided row exports
  `spontaneous_resumptions: null`, per channel only `status: null` and
  `outcome_available: false`, and the recount solely under
  `invalid_diagnostic` (`valid: false`); a runtime fault after the result
  was final (both channels resumed) leaves the value and the disposition as
  the evidence gives them, adds `fault_after_final_result: true` and a
  flag, and writes `result_final` on the `technical_failure` record.

U23 (M23, candidates as before; one new provisional family, no canonical
event, no scoring-plan variable, no formula changed — the §3 row
`m23_continuations_after_failure` is the approved formula and stays as it
is): the two-plot excavation series at the Exterior Recovery Yard stake
replaces the v2 single-plot field recovery under research-owner decision
D-U23-1 of 16 October 2026 (all nine rows approved — A the A-adjusted
layout with the numeric reading and the neutral final copy, B the passive
two-page example, C the genuine new-cell failure as eligibility and the
completed qualifying scan or new-cell dig after CONTINUE as the credit, D1
the direct first-failure choice, D2 the informed shift-end resolution, D3
the diagnostic of a system-cancelled start, E(c) for an unknown eligible
response, F the M23-only field tray, G provisional telemetry with no
canonical promotion; register §4 "Unit 23", §5.362). The legacy model and
adapter functions stay in the tree
unchanged, off the route, and their family is read by no extractor. The
two plots are clustered observations inside one series, one yard and one
shift, never two independent situations; the value is the count of known
1s with the resolved denominator beside it, never a ratio; while any valid
eligible plot's response is unknown the value and the numerator are null.

- **M23** — family `proto_m23_plots_`; ONE opportunity
  `proto_m23_excavation_series`; window `m23_plots_w1`; object and surface
  id `m23_excavation_field`; `entry_state_version` = `m23-plots-v1`;
  `layout_id` `a_adjusted_v1`; plot ids `plot_a`, `plot_b`, which are also
  the occasion ids (never changed; a RESUME is not a new occasion); forms
  `a1` / `a2` and `b1` / `b2` (the keyed cell), the plot order `AB` /
  `BA` and the option order `continue_left` / `stop_left` assigned per
  session by ONE M23-local joint assignment over the sixteen cells (round
  3, the closeout amendment approved 19 October 2026, OD-6: FNV-1a 32 over
  `<session id>:m23_plots_assignment` with murmur3's fmix32, cell = hash
  mod 16; the validity register's shared two-option hash, which realised
  only two of the sixteen cells, is no longer used by M23 and is itself
  unchanged). The entry snapshot carries the provisional field
  `assignment_scheme` = `m23_joint16_fnv1a_fmix32_v1`; `entry_state_version`
  stays `m23-plots-v1`, and every record produced before the amendment is
  distinguished as "pre-amendment assignment scheme (correlated)" in the
  UNIT-LOG. `closure_reason` on a both-plots-terminal closure is
  `voluntary_stop` if any explicit stop, otherwise `completed`, and
  `technical_failure` only when the evidence is wholly invalid — two plots
  that faulted AFTER verified outcomes close `completed` (round 3, the
  conformance correction; fixtures T09a–T09c). Suffixes:
  `presented`, `closure_explanation_presented` (the brief's own line,
  logged on the first USABLE render; `presentation_id`, `copy`,
  `copy_version`, `usable`), `example_viewed`
  (`page` 1 | 2, `surface` brief | help), `opportunity_opened` (the entry
  snapshot: `plots_planned` 2, `layout_id`, the assignment, `stage`,
  `visibility`, `prior_load`, `tools`), `surface_opened` /
  `surface_closed` (`view`, `close_reason`), `help_opened` / `help_closed`
  (`origin`), `plot_opened` / `resumed` (`approach_id`, `entry_kind`,
  `start_x` / `start_y`, `start_inside_region`, `assigned_position`,
  `realised_position`, `resume_count`, `choice_pending`),
  `search_region_entered` (`stance` `interior` | `boundary_stance`,
  `first_plot_region_entry`, `movement_sample_count`, `path_complete`,
  `direct_displacement_px`, `travelled_path_length_px`,
  `first_entry_at_ms`; descriptive), `approach_ended` (the same path
  fields, `reason`), `paused` (`cause` `esc` | `panel` | `overlay` |
  `search_region_exit` | `plot_switch` | `yard_departure` | `focus_loss` |
  `hidden` | `scene_shutdown`, `state_before` / `state_after`),
  `action_started`
  (`action_id`, `kind` scan | dig, `attempt_number`, `planned_duration_ms`,
  `player_x` / `player_y`, `zone_membership`, `selected_cell` and its
  label, `pre_cell_state`, `after_continue`, `failure_action_id`),
  `scan_resolved` (`strength` 0–100 and `reported_strength`, `band`,
  `trend`, `comparison_action_id`, `qualifying_continuation`, `credited`,
  `after_continue`, `target_distance_px` — research-only, never shown),
  `dig_resolved` (`cell`, `outcome` empty | recovered,
  `first_failure`, `object_id`, `delivery` `field_tray`), `action_cancelled`
  (`cancellation_reason` `esc` | `panel` | `help` | `overlay` |
  `plot_switch` | `yard_departure` | `search_region_exit` | `focus_loss` |
  `hidden` | `scene_shutdown` | `series_boundary`, `elapsed_action_ms`,
  `planned_duration_ms`, `continuation_started_then_system_cancelled` —
  D3's diagnostic, never a credit), `action_refused` (`reason`
  `plot_not_active` | `plot_terminal` | `choice_pending` |
  `outside_scan_region` | `outside_plot` | `already_dug` | `action_busy` |
  `cooldown`; never a resolution), `failure_choice_presented`
  (`presentation_id`, `presentation_count`, `resume`, `visible` /
  `focused` / `operable`, `option_order`, `left_option` / `right_option`,
  `failure_to_presentation_ms`), `failure_choice` (`response` continue |
  stop,
  `chosen_visual_side`, `option_order`, `navigation_family`,
  `navigation_steps`, `navigation_tokens` (≤ 32, `navigation_tokens_total`
  and `_truncated` beside), `tab_count` / `shift_tab_count` /
  `arrow_count`, `input_mode`; at most ONE per failure, never a second
  after CONTINUE), `stop_requested` / `stop_cancelled` (`stop_request_id`,
  the selector's confirmation), `plot_closed` (`plot_closure_reason`
  `recovered` | `explicit_stop` | `shift_end` | `review` | `reload` |
  `technical_failure`, `source` `first_failure_choice` | `selector` |
  `system`, `confirmed_stop`, `failure_action_id`,
  `failure_choice_presented`,
  `response`, `credited_action_id`, `observed_continuation` true | false |
  null, `stopped_before_failure`, `recovered_without_failure`,
  `participant_initiated`, `origin_input_mode`, `shift_end_command_id`,
  `shift_end_sequence`, `informed_shift_end`,
  `continuation_started_then_system_cancelled`,
  `system_cancelled_action_ids`), `reload_blocked` (the hold-back after a
  measured opening in an earlier load; `detail`, `kind`, `plot_id`),
  `invalidated` (a declared plot-scoped suffix that this build never
  writes), `technical_failure` (`scope` plot | series, `detail`) and the
  kit's
  `window_closed` (`raw_components` — the closure snapshot: the series
  trigger, the realised order, the tray, per plot {`status`, `opened`,
  `attempts`, `scans`, `digs`, `first_failure`, `presentation`, `response`,
  `credit`, `closure`, `observed_continuation`} — or
  `raw_components_partial` with `invalid_detail`
  `eligible_response_unresolved` when an eligible response is unknown).
  Every series record carries `phase` (`presentation` | `measurement` |
  `closure`), `content_version`, `layout_id`, `assigned_order`,
  `realised_order`, `failure_option_order`, `series_status`, `plot_status`,
  `selected_plot` and, for a plot record, `plot_id` / `occasion_id` /
  `form`, beside the kit's stamps (`measure_id`, `opportunity_id`,
  `window_id`, `entry_state_version`, `comprehension_state`
  `not_required`, `window_status`, `validity_status`, `sequence`,
  `page_load_index`). The v2 ids
  `proto_m23_field_recovery`, the family prefix
  `proto_m23_field_recovery_` and `m23_excavation_w1` are retired from the
  route and keep their frozen meaning. Scored fields are integrity-checked by the extractor's rules
  S1–S6 (the family's identity, one record per sequence, order, one
  terminal transition per action, a resolution needs its start, a response
  needs its failure, a dig outcome agrees with the plot's key); a
  contradiction voids the row or excludes the plot, never a silent repair;
  descriptive fields and the closure snapshots set flags only. Components:
  `administration_version`, `content_version`, `layout_id`,
  `presented_in_current_load`, `presented_sequence`, `opened_sequence`,
  `assignment`, `example_views`, `help_opens`, `surface_opens`,
  `closure_explanations_presented`, `observations_share_one_episode`,
  `planned_denominator`, `eligible_plots_total`, `included_ids`,
  `observed_count`, `denominator_resolved`, `known_outcomes_by_plot`,
  `resolved_eligible_ids`, `unknown_eligible_ids`, `invalid_ids` /
  `invalid_reasons`, `unopened_ids`, `recovered_without_failure_ids`,
  `stopped_before_failure_ids`, `searched_no_failure_ids`,
  `failure_choice_unpresented_ids`, `shift_end_unresolved_ids`,
  `shift_end_resolved_zero_ids`,
  `continuation_started_then_system_cancelled_ids`, `plots` (the
  per-plot recount), `series_fault`, `window_closed`, `reload_check`,
  `held_back_after_reload`, `series_closure_trigger`, `flags`. The row's
  `closure_reason` is the
  framework's enum (`completed`, `voluntary_stop`, `session_end`,
  `closed_at_review`, `technical_failure`); the series' own trigger is
  `series_closure_trigger`. No total across items.

U24-A (M07, candidates as before; the existing family, ONE new provisional
record type by the owner's decision RA-1, no canonical event, no
scoring-plan variable, no formula changed — the §3 row
`m07_stages_completed` is the approved formula and stays as it is): the
calibration project is closed as specified under the owner's Part A ruling
of 21 October 2026 (D-U24-1 M07-1 to M07-4 a, clarification 2, RA-1, RA-2;
register §4 "Unit 24-A", §5.367–§5.377). Provisional throughout; nothing
becomes canonical.

- **M07** — family `proto_m07_calibration_`; ONE opportunity
  `proto_m07_calibration_project`; windows `m07_calibration_start` /
  `m07_calibration_end` (both carried on every record with `phase`);
  object and surface id `m07_calibration_bench`; `entry_state_version` =
  `m07-calibration-v2` on every record (v1 — the administration whose
  review opened and completed a never-opened bench — is read as
  `technical_failure` "superseded administration"; no participant data
  exist under it). Existing suffixes, unchanged in name and fields:
  `opportunity_opened` (written ONLY by the participant's opening — entry,
  M07-1 a; the entry snapshot carries `stages`, `settle_ms`,
  `endpoint_visible` and no longer an `opened_by` field, because the review
  never opens the bench), `stage_advanced` (`stage`, `of`, `visit`,
  `input_mode`), `departed`, `returned`, `end_presented`,
  `end_opened_without_start`, `window_closed` (exit `completed` with
  `raw_components` — completion true at 6/6, false at the review — or exit
  `closed_at_review` WITHOUT raw components for a never-entered bench, the
  kit's `markAbsent`: validity `participant_absent`, M07-4 a), and the
  kit's `technical_failure` (`detail`, `input_mode`).
- **New provisional record (RA-1): `proto_m07_calibration_prior_load_checked`**
  — written once per page load with `page_load_index` > 1, at the first
  Workshop entry of that load, before any M07 opening; never on a first
  page load. Fields: `page_load_index`, `prior_page_load_event_count`,
  `prior_opening_found` (an earlier `opportunity_opened` of either phase),
  `prior_end_presented_found` (an earlier `end_presented`; reported only —
  the RA-1 adaptation of §5.290 (a)'s `prior_briefing_found`, register
  §5.368), `history_continuous` (at least one earlier record;
  `first_sequence` 1, no gap and no duplicate across the prior and current
  records so far; `recovered_from_chunks` false),
  `prior_opening_absence_established` (no opening found AND continuous AND
  no earlier hold-back record that an earlier review closure does not
  explain, register §5.379; only a hold-back whose detail names that
  closure is explained, §5.381 (2)), `input_mode: 'system'`, plus the kit's
  required fields and M07's phase fields. The record precedes the
  hold-back, which the kit records as `technical_failure` with one of three
  details (register §5.14 / §5.270 / §5.378): "reload after
  administration: bench not re-run" (an earlier opening found; preceded by
  the kit's `recordPriorExposure`), "reload with an unverified earlier
  state: bench not administered" (the absence not established, §5.378 (3))
  or "reload after a review closure: bench not reopened" (an earlier
  review closure of the unopened bench with the absence established,
  §5.378 (4)). A held-back bench writes nothing else in that load. No new
  record type is added by the closeout. The `technical_failure` validity of
  a held-back load (each kind, the terminal review closure included,
  §5.381 (3)) is a non-valid reload disposition told apart by its
  `invalid_detail`, not evidence of an application crash; the earlier
  absence record and the null / interrupted feature stay as they are.
- **Held-back presentation (RA-2; §5.378 (3) / (4))**, participant-facing
  on the reload path only: the bench keeps its title and shows the kind's
  two lines — "This calibration bench was opened earlier in this
  session." / "It stays closed after a reload."; "The earlier state of
  this bench could not be verified." / "It stays closed after this
  reload."; "This calibration bench was closed at the station review." /
  "It stays closed after a reload." — with LEAVE only; showing or leaving
  it writes no record of the family. On the normal bench, LEAVE and ESC
  write the same `departed` (register §5.383 (1)); before that repair the
  Leave button wrote none (finding L1).
- **Features.** `m07_stages_completed` = stages completed / 6 of an ENTERED
  project when the station-record review closes it (`fraction`, planned
  denominator 6; an entered project left at 0 is an observed 0); never
  entered ⇒ null — `no_eligible_event` (`presented_not_entered`) when the
  end was presented, `not_presented` when the bench was never presented,
  `pending` before the review; `m07_returns` = the voluntary `returned`
  records (companion, never in the value, null with the primary). Reload:
  a check record whose own `page_load_index` names another load ⇒
  `technical_failure` (§5.378 (6)); the hold-back ⇒ `interrupted` with the
  kind's reason (an earlier opening found; the absence of an earlier
  opening not established; an earlier review closure — never a zero, a new
  opportunity or a carried-forward score); a load whose one check record
  establishes the absence is read exactly as a first load; every other
  reloaded load ⇒ `interrupted` ("the absence of an earlier opening not
  established"), also when the bench ran in it (a log the amended runtime
  cannot write; flagged inconsistent). Integrity: a v1 or unknown
  administration, another opportunity, a missing, malformed or shared
  `sequence`, a duplicate, out-of-order or over-6 stage, a hold-back record
  of an unknown kind, two hold-back records, or a contradictory record ⇒
  `technical_failure` with the reason. Components:
  `administration_version`, `stages_planned`, `errors: 'not_defined'`,
  `exposure`, `stages_completed`, `completion`, `returns`,
  `departure_state`, `reload_check`, `exposure_record_consistent`, and
  `held_back_after_reload` with `hold_back_kind`, or
  `opened_after_unestablished_absence`, where they apply. No total across
  items.

U24-B (M22 only, candidates as before; no event, suffix, field or formula
added or changed): by the owner's Part B ruling I-1 = a (22 October 2026)
the M22 administration is `entry_state_version: 'm22-setbacks-v4'`
(was `m22-setbacks-v3`), because two participant-facing report-1 lines
changed to the ruled outcome-neutral wording (WO-11 "Coolant coupling — line
check", WO-13 "Excavation field — survey record"). M22's requirement logic,
forms and the `m22_revisions_begun` formula are unchanged; the version
makes records written under the earlier wording self-identifying.

U24 RL-0 (PROVISIONAL, never canonical; D-4 of the owner's ruling of 23
October 2026, `RELOAD-CORRECTION-SPEC-r3-exec.md` §2–§3; register §5.404):
the shared reload check `src/measurement/reloadCheck.ts`, pure and not yet
wired to any row — no row's administration, event, text, disposition or
formula changes in RL-0, and §1's reload rule stands until RL-1 to RL-4
wire their rows. **Record** `<family>prior_load_checked` (the suffix M07
and M14–M20 already write; at most one per family per load, written by the
family's first host before any opening, never on a first load; never task
evidence — excluded from family evidence tests and `supporting_sequences`):
`page_load_index`, `prior_page_load_event_count`, `history_continuous`
(exactly r3 §3's five conditions: at least one earlier record,
`first_sequence` 1, no gap, no duplicate, `recovered_from_chunks` false;
`store_evictions` is not read), `prior_briefing_found` (stage 1),
`prior_presentation_found` (stage 2, present only where the family's stage
map names a stage-2 record), `prior_opening_found` (stage 3),
`prior_opening_absence_established` (continuous, no opening found, and no
earlier U or M hold-back of that occasion, D-7 (i)),
`prior_opening_sequences` (P-1: the sequence numbers of the earlier
openings found), and, where the task has occasions,
`occasions: { <id>: { the same four flags, the sequences } }` with the row
flags summarising them (an opening of any occasion; the absence for the row
only when established for every occasion). A family may add named boolean
flags under an occasion's `evidence` object (M25's belief and probe
fields, D-4; their names and logged shape are RL-3's). **Classifier**
`classifyReload`, per occasion: a first load ⇒ no class, first-load
administration; no record, or two or more records (D-6 (i), even when they
agree) ⇒ U for every occasion; a malformed record (another load's
`page_load_index`, or an expected occasion missing) ⇒ every occasion held
with `check_malformed` and the reason "check record malformed" (the
callers' existing `technical_failure` rules); a self-contradictory record
(the `checkCoherent` rule, extended to the record's whole occasion map) ⇒ M
for every occasion; otherwise, per occasion, its own contradictory flags ⇒
M, an earlier opening found ⇒ H, a discontinuous history ⇒ U, the absence
established ⇒ A, else U (a carried-forward hold-back); M04's joint
hold-back is a caller option (an A job is held beside a held job). Only A
is administered; H, U and M are held. Beside `check_coherent` (the records'
content) the result carries §5.290 (a)'s existing
`exposure_record_consistent` (false for two or more records). Hold-back
details begin "reload after administration" (H), "reload with an
unverified earlier state" (U) or "reload with a contradictory earlier
check" (M); reasons "earlier opening found", "earlier history not
verified", "earlier check contradictory". The H-before-U order beside a
discontinuous history, the per-occasion M label, the malformed handling,
the M prefix and the reasons are IMPLEMENTER DEFAULTS, owner-visible and
reversible (register §5.404 readings (a), (c), (d), (h); (a) awaits the
owner's confirmation). `absentFeature` and `extract.ts` are unchanged.

U24 RL-1 (PROVISIONAL, never canonical; D-4, D-5 and owner ruling R-1 /
R-2 of 23 October 2026; `RELOAD-CORRECTION-SPEC-r3-exec.md` §2, §4, §5,
§9; register §5.405): the record of RL-0 is now written for eight families,
once per reloaded load, before any opening, by the family's host —
`proto_m01_batch_prior_load_checked` (`presentM01`; occasions `o1`, `o2`),
`proto_m02_workspace_prior_load_checked` (`presentM02C`; no occasions),
`proto_m03tools_prior_load_checked` (`presentM03T`; occasions `o1`, `o2`
for the press occasions a, b), `proto_m04_cutting_prior_load_checked`
(`listM04`, or the cut when no listing came first; occasions `o1`, `o2`),
`proto_m06_orders_prior_load_checked` (`presentM06`),
`proto_m08_effort_prior_load_checked` (`presentM08`),
`proto_m12_check_prior_load_checked` (`presentM12`; occasions `o1`, `o2`)
and `proto_m13_networks_prior_load_checked` (`declareM13Lattice`; the
suffix is added to the family's declared list). Each carries the window's
usual fields and RL-0's flags; the stage maps are r1 §1's: stage 1 the
existing `presented` record (M04: `listed`; M13: none), stage 2 only for
M03 (`surface_opened`, a panel opened without its tools laying out — never
an opening) and M04 (`presented` at the cut), stage 3 the existing opening
(`opportunity_opened`; M13 `series_opened`). **Hold-back markers** (the
existing `technical_failure`, detail beginning "reload"): H keeps each
row's existing detail and prior-exposure entry; U "reload with an
unverified earlier state: ⟨station⟩ not administered" and M "reload with a
contradictory earlier check: ⟨station⟩ not administered", with no
prior-exposure entry (M13: `prior_exposure` false). **M04 joint hold-back
(R-2):** a job held as H, U or M holds the other job; a job held only by
that dependency keeps its own class and its own record flags and gets the
detail "reload with a joint hold-back: cutting job not run; the other job
is held (⟨the other job's reason⟩) and shares its starting state" — a
prefix that names no class, so D-7's carry-forward never reads it — and a
prior-exposure entry naming the other job ("the other cutting job was
administered in an earlier page load of this identity; this job, never
cut, shares its starting state") only when the other job's own class is H.
The M04 primary row's components gain `reload_jobs` (after a reload or
beside a check only): per job `own_class`, `own_basis`, `effective_class`,
`administration_permitted`, `basis`, `reason`, `joint_hold_back`,
`held_with` and the job's `prior_opening_found`,
`prior_opening_absence_established` and `prior_opening_sequences` as the
record holds them (a writer's shape, provisional). **Readings:** with an
established check an occasion takes the first-load reading (r3 §5 column
B); an unopened occasion that is not A is held with its class's reason —
the H reason unchanged, U "⟨station⟩ not administered after a reload:
earlier history not verified", M "… earlier check contradictory" (M03 and
M04 append "earlier history not verified" / "earlier check contradictory"
to their existing "held back after a reload" reason); a malformed record is
a technical failure of the row (§5.290 (a)); without any check, the
existing F5 and `absentFeature` reload readings are unchanged. No formula,
weight, denominator rule or event name other than the suffix above
changes.

U24 RL-1C (PROVISIONAL, never canonical; the owner's RL-1C ruling of 24
October 2026, decisions A–D; register §5.406, which supersedes the
sentence "without any check, the existing F5 and `absentFeature` reload
readings are unchanged" above **only** for a presented, unopened
occasion): in a reloaded load without the family's check, a presented,
unopened occasion (M04: coupons `listed`) is U (`no_check`), refused, and
reads held with the row's U reason; M13, which has no presentation record,
is unchanged; a genuinely unreached occasion keeps the F5 / `absentFeature`
reading and a first load its own reading. **Diagnostics** (after a reload
or beside a check only; a first load's shape is unchanged): the primary
row's components of M01, M02, M03, M04, M06, M08, M12 and M13 gain
`exposure_record_consistent` (the existing name of §5.290 (a); on these
rows only two of its conditions are wired: the check-record part, and false
when an occasion whose own record found an earlier opening is opened in
this load too — register §5.406 reading (h)), and the occasion rows (M01,
M03, M04, M12) gain `exposure_record_inconsistent_occasions` (the offending
occasions only); M04's `reload_jobs` entries gain
`joint_hold_back_bypassed` (a job held only with the other and cut in this
load; B2 open). The M12 context note `exposure:<other>_before` again names
only the other packet opened, or its held screen opened, in this load.
**Reading changes (decision A only):** without a check, a presented,
unopened occasion changes from declined (M03 / M04: the generic held
reason) to held with the U reason, and — a consequence of the same rule —
M01 / M12 / M03 OBS + DEC without a check reads interrupted · x · x/3 (the
S-F2 reading) instead of `incomplete`. The diagnostics change no
disposition, value, numerator or denominator. No formula, weight,
denominator rule or event name changes.

U24 RL-2 (PROVISIONAL, never canonical; D-4, D-5 and RL-1C's decision A in
force; the owner's RL-2 instruction of 24 October 2026;
`RELOAD-CORRECTION-SPEC-r3-exec.md` §2, §4 G2, §5, §9; register §5.407):
the record of RL-0 is now written for the four offer families, once per
reloaded load, before any offer, by the family's first host —
`proto_m05_start_prior_load_checked` (`guardM05Reload` at the Concourse or
Yard entry, or `presentM05Offer`; occasions `o1`, `o2`),
`proto_m09_checks_prior_load_checked` (`guardM09Reload`; no occasions),
`proto_m10_delivery_prior_load_checked` (`guardM10Reload`; occasions `d1`,
`d2`) and `proto_m11_custody_prior_load_checked` (`m11OfferAvailable`;
occasions `lab`, `yard`), each with the window's usual fields and RL-0's
flags. **Stage maps** (r3 §4 G2): stage 1 the offer's `presented`; no stage
2; stage 3 the row's existing guard record, so that each row's existing
per-occasion held-back rule is kept — M05 the answer's `opportunity_opened`
(accepted or declined), M09 and M10 the offer's `presented` itself (an offer
presented earlier is held, answered or not; their stage-1 and stage-3 flags
coincide), M11 the model's `offer_presented`. **Hold-back markers:** H keeps
each row's existing detail and prior-exposure entry ("reload after
administration: job not re-offered"; "reload after the offer: watch /
delivery / custody not re-run"); U "reload with an unverified earlier
state: ⟨job | watch | delivery | custody⟩ not administered" and M "reload
with a contradictory earlier check: … not administered", with no
prior-exposure entry;
the offer is then not presented (M09, M10 and M11 have no screen). The
station review holds an unoffered occasion that this load's check does not
classify A instead of marking it absent. **M05's held screen:** a held
job's station opens the existing read-only surface and logs nothing (before
RL-2 the station opened only for a job accepted in the same load, so the
held surface was never shown); H keeps the existing line, U / M show the
§9 lines "The earlier state of this job could not be verified." / "It stays
closed after this reload."; no held screen draws the job readout or a
subtitle (register §5.407 reading (g), for the owner's ratification).
**Readings:** with an
established check an occasion takes the first-load reading (r3 §5): M05
OBS + NOP observed, NOP + NOP `not_presented`; M09, M10 and M11 with
nothing offered `not_presented` with their first-load reasons; an
unanswered occasion that is not A is held with its class's reason — H
unchanged, U "⟨job | watch | delivery | custody⟩ not administered after a
reload: earlier history not verified", M "… earlier check contradictory"
(beside an offered occasion M10 and M11 append "earlier history not
verified" / "earlier check contradictory" to their generic "held back after
a reload" reason); a held delivery or loan is never counted as offered or
pending; a malformed record is a technical failure of the item. **Reading
change (M10, M11; register §5.407 reading (d), owner confirmation
requested — confirmed by the owner's RL-2 closeout ruling 2, register
§5.408; it can affect downstream inclusion):** with a check, an occasion offered in an earlier load whose
room is not reached in this load, or reached only at the review, reads held
— `interrupted`, the other occasion's value kept — where it read
`not_presented` beside an observed sibling before. **Without a
check** (RL-1C decision A): an offer presented and left unanswered in a
reloaded load is U and held; a genuinely unreached occasion keeps its
existing reading (M05's F5; M10 / M11 `not_presented` beside the other
occasion; the `absentFeature` reload branch when the load holds nothing).
The RL-1C exposure-record diagnostics are not added to these rows. No
formula, weight, denominator rule or event name other than the suffix above
changes.

U24 RL-3 (PROVISIONAL, never canonical; D-2 (i), D-3 = P, D-4, D-5,
D-6 (i), D-7 (i) and RL-1C's decision A in force; the owner's RL-3
instruction of 24 October 2026; `RELOAD-CORRECTION-SPEC-r3-exec.md` §2, §4
G4 / G5, §5, §6, §9; register §5.409): RL-0's record is written once per
reloaded load, before any opening, by the family's first host —
`proto_m17_trials_prior_load_checked` (`declareM17`; no occasions),
`proto_m21_case_prior_load_checked` (`m21Present`; occasions `o1`, `o2`),
`proto_m22_returned_prior_load_checked` (`m22Present`; `o1`, `o2`),
`proto_m23_plots_prior_load_checked` (`guardM23Reload`; the existing
check's fields plus RL-0's), `proto_m24_rig_prior_load_checked` and
`proto_m26_uplink_prior_load_checked` (`declareExteriorWindows`), and ONE
`proto_m25_loops_prior_load_checked` (occasions `loops`, `belief`, `probe`;
evidence `prior_required_complete`, `prior_belief_displayed`,
`prior_belief_answered`) written by the first of `presentM25Loops`,
`openM25Loops`, `m25BeliefDueNow` / `askM25Belief` or
`declareReturnWindows`. **Stage maps:** M17 stage 3 `window_opened`; M21 /
M22 stage 1 `presented`, stage 3 `opportunity_opened` per case / report;
M23, M24, M26 stage 1 the route's advance to `exterior_work`, stage 2
`presented`, stage 3 `opportunity_opened`; M25 loops `presented` /
`opportunity_opened`, the question's display records (display =
administration), the notice's `presented` / `opportunity_opened`.
**Hold-back markers** (the family's `technical_failure`; M23 also
`reload_blocked`): H "reload after administration: ⟨station⟩ not re-run"
with a prior-exposure entry (the M25 post's and M23's existing H details
kept); U / M "reload with an unverified earlier state / a contradictory
earlier check: ⟨station⟩ not administered", no prior-exposure entry; the
station administers nothing. **D-3 = P:** a first display of the M25
question after a reload, permitted only when the check establishes the
earlier `required_complete` and no earlier display, adds to
`question_presented` `exposure_page_load_index` and
`delay_since_loops_closed_null_reason`; `delay_since_loops_closed_ms` is
measured from the earlier `proto_m25_loops_window_closed` `timestamp_ms`
(both values are `Date.now()` epoch milliseconds) when it is a finite
number not later than now, otherwise null with "earlier closure time not
comparable with this load's clock", or, without an earlier closure, null
with "earlier closure time not recorded"; never zero, never the
reload-freeze time. A same-load display's payload is unchanged.
**Readings:** under A the first-load readings (M17, M23, M24, M26
`not_presented` with no evidence in the load; M21 / M22 `declined` when
presented and never opened, `not_presented` with none); a held station
`interrupted` with its class's reason; **D-2 (i)** for M21 / M22 (a reload
marker is no longer a technical failure of the row; a held case / report
beside an observed one: `interrupted` · x · x / 1; with none opened
`interrupted` · null · null / null; with one opened and none eligible, a
would-be `no_eligible_event` reads `interrupted` · null · null / 0, other
readings kept); the M25 companion by its own occasion (cases 1 and 2 and 4
`interrupted`; case 3 the first-load readings, with
`exposure_page_load_index` and the null reason in the components); RL-1C's
decision A where the row has a presentation record (not M17); a malformed
record is a technical failure. **Screens (§9):** the new H lines ("This
⟨station⟩ was opened earlier in this session." / "It stays closed after a
reload.") for the training rig, relay bench, shift report desk, magnet rig
and uplink post; the U / M lines ("The earlier state of this ⟨station⟩
could not be verified." / "It stays closed after this reload.") for those
five and the excavation stake and the post; M23's and the post's existing
H texts unchanged; no screen for the question or the notice. No formula,
weight, denominator rule or event name changes other than the suffix,
`exposure_page_load_index` (approved by D-3) and the writer's
`delay_since_loops_closed_null_reason` (the approved "explicit reason" as a
field; register §5.409 reading (c)). Beside a held M22 report the ratings
companion keeps its own reading (reading (n)); with denominator 0 only a
`no_eligible_event` row becomes `interrupted` · null / 0 (reading (g)).

U24 RL-4 (PROVISIONAL, never canonical; D-5, D-6 (i), D-7 (i); the owner's
ruling of 23 October 2026 and the owner's authorisation of 25 October 2026;
`RELOAD-CORRECTION-SPEC-r3-exec.md` §2, §3, §4 G1, §8 RL-4, §9; register
§5.410): the existing `prior_load_checked` records of M14, M15, M16, M18,
M19 and M20 (their field sets unchanged) are classified at each guard with
RL-0's classifier; only A administers. **Hold-back markers** (the family's
`technical_failure`): H keeps the existing detail ("reload after
administration: ⟨desk | bench | console | board | panel | console⟩ not
re-run") with a prior-exposure entry; U / M add "reload with an unverified
earlier state / a contradictory earlier check: ⟨…⟩ not administered", with
no prior-exposure entry and no administration. **D-7 (i):** the check's
`prior_opening_absence_established` is false when an earlier load holds a
U / M marker of the family (never for an H marker). **D-6 (i):** the
extractor establishes the absence from exactly one coherent record of the
load; two or more establish nothing and are flagged — `exposure_record_consistent`
false in M14, M15, M16 and M18; in M19 and M20, which carry no such
component, the `flags` entry "the reload check records are inconsistent".
**Readings:** a U / M marker without an opening of the load ⇒ `interrupted`
with the family's existing not-established reason (kept, not unified with
the newer families' "earlier history not verified"; r3 §8 RL-4),
`held_back_after_reload: true`; the H reading and the first load are
unchanged. **Screens (§9):** the U / M lines ("The earlier state of this
⟨station⟩ could not be verified." / "It stays closed after this reload.")
for the incident desk, relay bench, protocol console, diagnostic board,
coupling panel and feed console, rendered by the existing record view
(text and LEAVE only); the existing held-back texts unchanged. No formula,
weight, denominator rule, event name or component field changes.

U24 completion S2 (PROVISIONAL, never canonical; the owner's RL-3 closeout
decisions 1–5 of 25 October 2026 in the authorisation of the consolidated
completion run; register §5.411). **M22 ratings companion (decision 1):**
a provisional component `held_reports: [{ report, class }]` names every
report held after a reload (class H, U or M from its marker or its class in
the one record) on every companion row that carries components — the
observed companion, the empty companion and the D-2 (i) early return; it is
`[]` when nothing is held. It is kept apart from `missing_reports` (a due
report whose rating was not given): a held report is never due, never rated,
never in a denominator, and no rating is fabricated or copied. The
disposition rules, the independently observed sibling rating and the primary
D-2 (i) rule are unchanged. **M25 cross-load delay (decision 2):** the
existing `m25CrossLoadExposureFrom` rule is ratified by fixtures without a
code change — a non-finite (NaN, ±Infinity) or future closure timestamp
gives null with "earlier closure time not comparable with this load's
clock"; no recorded closure gives null with "earlier closure time not
recorded"; never the reload time, never zero; every null keeps
`exposure_page_load_index`, so missing delay evidence never erases an
established exposure. **Decisions 3–5** change no event, field or reading:
the M17 held view and the held questionnaire notice are presentation-only
(the scene reads a new `held` flag of the terminal view; the Workshop reads
the probe's existing hold), and a held notice still writes nothing — no
acknowledgement, no presentation. Inspection-only M-screen coverage is
reported as INSPECTION in the ledger, apart from executed browser coverage.

## 3. Feature formulas (primary; companions listed in the register)

| Feature                               | Formula                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       | Direction                 | Null rule                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| ------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `m01_planned_jobs`                    | Σ jobs placed before first work action over 2 occasions / 6                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   | ↑ organisation            | no accessible occasion                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| `m02_correct_first_retrievals`        | correct first answers / 6 (Cannot locate = incorrect): requests whose FIRST committed answer is the requested case / 6 planned requests (one per case, in the balanced order assigned to the session); the exported denominator is the requests answered — recounted from the `request_answered` events, each checked against its `request_presented` event, the assigned order and the window's per-request record; focused ms per request and the layout at the handover kept as the companions `m02_retrieval_latency` and `m02_filing_layout` (U13); during the requests the participant's layout and own tray labels stay visible and the system-supplied case codes and contents do not (owner ruling of 28 September, §5.137)                                                                                                                                                                                                                                                                                                                                          | ↑ traceability            | no request answered ⇒ null (`no_eligible_event` when the workspace was never handed over, `voluntary_stop` when it was — provisional, register §5.142); fewer than six answered ⇒ `incomplete` with the value and its denominator (an unanswered request is missing, never incorrect); a record that disagrees with the raw answers anywhere ⇒ `technical_failure`                                                                                                                                                                      |
| `m03_tools_restored`                  | Σ tools in the tool rack at the first departure (the participant's first close of the press panel with the tools out) over the observed occasions / 6 planned (three per occasion; the exported denominator is 3 × the observed occasions) — recounted per occasion from the `tool_moved` events between `opportunity_opened` and `first_departure` and compared with the snapshot tool by tool; a completed occasion is read only with `opportunity_opened` and `first_departure` once each and in that order, the occasion's own three tools in the entry snapshot and in the record, and every recorded container the one the moves lead to (U14-C); the object states kept as the companion `m03_object_states` (U14)                                                                                                                                                                                                                                                                                                                                                     | ↑ tidying                 | no occasion observed ⇒ null (`declined` when listed and never opened; `no_eligible_event` when a panel was opened and its run never completed; `technical_failure` when the tools could not be reached; `interrupted` after a reload or when a panel with the tools out was closed by the system); one occasion ⇒ `incomplete` with the value; an occasion with an unreachable tool is excluded; a record that disagrees with the raw moves ⇒ `technical_failure`                                                                       |
| `m04_undisposed_pieces`               | Σ (3 − pieces disposed before the job's first departure) over the observed jobs / 6 planned, a carried piece included (three per job; the exported denominator is 3 × the observed jobs); the first departure of a job = the room left, or another station opened (administrations `m04-cutting-v1` / `-v2`) / work at another station actually begun (administrations `m04-cutting-v3`, U14-D, never released, and `m04-cutting-v4`, U14-D2; the formula itself is unchanged and the administrations are not pooled) — recounted per job from the `piece_picked_up`, `piece_put_back` and `piece_disposed` events between `job_run` and `first_departure`, replayed in order, and compared with the snapshot piece by piece; a completed job is read only with `opportunity_opened`, `job_run` and `first_departure` once each and in that order, the job's own three pieces named by the cut, and every disposal once and after its pick-up (U14-C; `listed` is never required); a later disposal never enters; per-job values kept as the companion `m04_job_values` (U14) | ↑ own mess                | no job run ⇒ null `not_presented` (a job never run is not presented, also when the work orders listed the coupons — provisional, register §5.172); one job ⇒ `incomplete` with the value; a job closed by the system (the review) or held back after a reload ⇒ censored, excluded (`interrupted` when it is every job run); unreachable pieces ⇒ excluded (`technical_failure`); a record that disagrees with the raw events ⇒ `technical_failure`                                                                                     |
| `m05_start_latency`                   | per ACCEPTED occasion (object keyed o1 / o2, never summed or averaged): focused ms from eligibility (accepted; start control usable; no prompt, surface, overlay or world action) to the first work action + status started / deferred / exited / cap / interrupted (U6)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      | ↑ initiation difficulty   | declined ⇒ excluded; cap ⇒ censored, latency null; interrupted / never-eligible exit ⇒ missing, never a non-start                                                                                                                                                                                                                                                                                                                                                                                                                       |
| `m06_unique_correct_orders`           | distinct orders whose matching dispatch fell inside the one 60 s focused budget (denominator fixed at the budget; an explicit early stop never shortens it; recounted from the dispatch events) (U7)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          | ↑ useful output           | work period never begun ⇒ null (`no_eligible_event`); interrupted / technical ⇒ null; a review-closed open period ⇒ censored value                                                                                                                                                                                                                                                                                                                                                                                                      |
| `m07_stages_completed`                | stages at the closing milestone / 6                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           | ↑ routine completion      | project never entered                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| `m08_work_choice_fraction`            | Work choices / valid choices                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  | ↑ work chosen             | no valid choice                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| `m09_due_checks_fulfilled`            | checks fulfilled / eligible checks of the ONE accepted duty (three planned; fewer reached ⇒ `incomplete` with the value): a check is eligible when it was opened with access (`check_window_opened.access.available`) and closed by a reading (`read`) or by leaving the Concourse (`left_concourse`); fulfilled = exactly one `check_fulfilled` inside its window — recounted per check from `check_window_opened`, `check_fulfilled` and `check_window_closed` and compared with the closure snapshot; a check censored at the review, one opened without access and one never opened are outside the denominator; uncredited and late readings never enter the value; the three checks share one duty (repeated observations, never three situations) (U15)                                                                                                                                                                                                                                                                                                                | ↑ follow-through          | duty declined (`declined`); offer unanswered (`no_eligible_event`); never offered (`not_presented`); held back after a reload (`interrupted`); duty still open (`pending`); contradictory evidence, or an event order that cannot be verified (`technical_failure`)                                                                                                                                                                                                                                                                     |
| `m10_obligations_fulfilled`           | (deliveries handed to their recipient + deliveries left with the permitted delegate after the delegate's stated acceptance) / accepted, accessible deliveries (two planned; a conditional denominator, complete at any size above zero): accessible = a `person_present` record of the recipient or the permitted delegate while the delivery was carried — never the participant's opening of a conversation, the station log or a deliveries menu — recounted per delivery from `offer_answered`, `opportunity_opened`, `person_present`, `delegate_accepted`, `handed_over`, `delegated` and `window_closed` and compared with the closure snapshot; direct and delegated are counted separately in the components; a delivery still carried at the station-record closure is an observed non-fulfilment when accessible and excluded when not; late acts never enter the value; never merged with M11 (U15); closeout clarification (register §5.256–§5.257): presence counts only after acceptance and opening; `delegated` must name the delivery's own `object`        | ↑ reliability             | none accepted and some declined (`declined`); none answered, or none accessible (`no_eligible_event`); never offered (`not_presented`); a delivery held back after a reload (`interrupted`, the other delivery's value kept beside it); a delivery still open (`pending`); contradictory evidence, or an event order that cannot be verified (`technical_failure`)                                                                                                                                                                      |
| `m11_unresolved_custodies`            | unresolved / accepted accessible                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              | ↑ unresolved stewardship  | none accepted                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| `m12_fields_verified`                 | Σ fields explicitly judged (matches or differs) before release over the RELEASED products / 6 (planned denominator; one released product ⇒ `incomplete` on 3; a released product with nothing judged is 0; recounted from the `field_judged` events) (U8)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     | ↑ checking                | no product released ⇒ null (`declined` when presented and never opened; a packet opened and closed at the review is missing, never 0)                                                                                                                                                                                                                                                                                                                                                                                                   |
| `m13_first_solutions`                 | networks whose FIRST response is a layout the shared validator accepts for that network and form / networks with a first response in the current page load (planned denominator 3; CANNOT SOLVE and an unsealed layout are in the denominator, not the numerator; a network without a first response is missing, never incorrect; fewer than three answered and the series closed ⇒ `incomplete` on the answered count; recounted from the `first_response` events by re-validating each recorded board and compared with the event's `correct` flag and the closure snapshot; results, practice, help, time and input mode never enter; complete and stable from the third first response) (U16)                                                                                                                                                                                                                                                                                                                                                                             | ↑ puzzle performance      | none answered ⇒ null (`not_presented` never opened; `voluntary_stop` opened and stopped; `no_eligible_event` opened and closed at the review; `pending` while the first-response phase is open, also with one or two answers; `interrupted` held back after a reload; `technical_failure` for a fault in the first-response phase or contradictory / unverifiable scored evidence)                                                                                                                                                      |
| `m14_correct_first_integrations`      | correct first decisions / 6: decisions whose FIRST response is the keyed option of that decision / decisions with a first response in the current page load (planned denominator 6; CANNOT SOLVE and a wrong option are in the denominator, not the numerator; a decision without a first response is missing, never incorrect; an answer counts whatever sources were opened before it — source openings never exclude, discount or weight an answer; fewer than six answered and the series closed at the review ⇒ `incomplete` on the answered count; recounted from the `first_response` events against the content key and compared with the event's `correct` flag and the closure snapshot; by-packet results, omissions and source openings in the components, never in the value; complete and stable from the sixth first response) (U17)                                                                                                                                                                                                                           | ↑ integration             | none answered ⇒ null (`not_presented` never briefed and never opened; `pending` briefed and never opened while open, or opened and still open; `no_eligible_event` briefed and never opened at the review closure (`briefed_not_opened`) or opened and unanswered there; `interrupted` held back after a reload, or after a reload without the absence of an earlier opening established (register §5.290 (a)); `technical_failure` for a first-response-phase fault or contradictory / unverifiable scored evidence; never `declined`) |
| `m15_correct_first_predictions`       | correct first predictions / 4: questions whose FIRST response is the keyed option of that question / questions with a first response in the current page load (planned denominator 4; CANNOT SOLVE and a wrong option are in the denominator, not the numerator; a question without a first response — unpresented or presented and unanswered — is missing, never incorrect; an answer counts whatever wiring was recorded and whatever tests were run (wiring, tests, help, drafts, time and input mode never change the count); fewer than four answered and the series closed at the review ⇒ `incomplete` on the answered count; one to three answered and the series still open ⇒ null `pending` (D-U18-1 item 8); recounted from the `first_response` events against the content key and compared with the event's `correct` flag and the closure snapshot; by-box results, omissions, model correctness and exploration in the components, never in the value; complete and stable from the fourth first response) (U18)                                              | ↑ understanding           | none answered ⇒ null (`not_presented` never briefed and never opened; `pending` while open — briefed and never opened, or opened, also with 1–3 answers; `no_eligible_event` at the review closure — briefed and never opened (`briefed_not_opened`) or opened and unanswered (`orientation_only` / `no_wiring_recorded` / `wiring_only_no_first_response`); `interrupted` held back after a reload or an unestablished absence of an earlier opening; `technical_failure` for a fault or unverifiable evidence; never `declined`)      |
| `m16_correct_first_applications`      | correct first applications / 6: vials whose FIRST response is the keyed drawer of that vial / vials with a first response in the current page load (planned denominator 6; DON'T KNOW and a wrong drawer are in the denominator, not the numerator; a vial without a first response — unpresented or presented and unanswered — is missing, never incorrect, and is listed apart from DON'T KNOW; teaching exposure, help, drafts, time and input mode never change the count; fewer than six answered and the series closed at the review ⇒ `incomplete` on the answered count; one to five answered and the series still open ⇒ null `pending` (D-U19-1 item 9); recounted from the `first_response` events against the content key and compared with the event's `correct` flag and the closure snapshot; the form, rule and example versions, teaching exposure, per-vial records with `error_kind`, omissions and help in the components, never in the value; complete and stable from the sixth first response) (U19)                                                   | ↑ transfer                | none answered ⇒ null (`not_presented` never briefed and never opened; `pending` while open — briefed and never opened, or opened, also with 1–5 answers; `no_eligible_event` at the review closure — briefed and never opened (`briefed_not_opened`) or opened and unanswered (`intro_only` / `teaching_only` / `teaching_closed_no_first_response`); `interrupted` held back after a reload or an unestablished absence of an earlier opening; `technical_failure` for a fault or unverifiable evidence; never `declined`)             |
| `m17_criterion_trial`                 | first learning trial ending 3 consecutive correct FIRST responses (one SUBMIT of exactly two operators per trial; recounted from the `trial_submitted` events), with attained = true, reported whenever reached within the administered trials (even after an early exit, `complete_sequence` false); 12 / false / censored when all twelve ran without attainment (U9)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       | earlier = faster          | early exit WITHOUT attainment ⇒ incomplete (not censored); never opened ⇒ null; owner decisions §5.87–5.88 pending before use                                                                                                                                                                                                                                                                                                                                                                                                           |
| `m18_correct_first_diagnoses`         | correct first diagnoses / 3: cases whose FIRST `diagnosis` response is the keyed part / cases with a diagnosis first response in the current page load (planned denominator 3; CANNOT SOLVE and a wrong part are in the denominator, not the numerator; a case without a diagnosis — unpresented, or presented and unanswered — is missing, never incorrect, listed apart from CANNOT SOLVE; tests, drafts, help, time and input mode never change the count; fewer than three answered and closed at the review ⇒ `incomplete`; the series open ⇒ null `pending`, also with three parts and a step pending (D-U20-1 item 9); recounted from the `first_response` events against the content key and compared with the event's `correct` flag and the closure snapshot, each comparison with its scope (contract §9.4; item 11: a defect isolated to the prediction slot leaves this row its own value); versions, per-case records, test use, the descriptive indicators and omissions in the components, never in the value; stable from the sixth first response) (U20)    | ↑ diagnosis               | none answered ⇒ null (`not_presented` never briefed and never opened; `pending` while open — briefed and never opened, or opened, also with 1–5 responses; `no_eligible_event` at the review closure — `briefed_not_opened`, or opened and unanswered (`intro_only` / `case_presented_no_response`); `interrupted` held back after a reload or an unestablished absence of an earlier opening; `technical_failure` for a fault, a shared or uncertain defect, or an isolated defect of this slot; never `declined`)                     |
| `m18_correct_consequence_predictions` | correct first planned-step answers / 3 (companion; never combined with the diagnosis count): cases whose FIRST `prediction` response is the keyed answer of the ACTUAL case whatever part was recorded (D-U20-1 item 1; in case 3 the wrong part HATCH implies the keyed answer) / cases with a prediction first response in the current page load (planned denominator 3; CANNOT SOLVE and a wrong answer are in the denominator, not the numerator; a case whose step was never presented or never answered is missing, listed apart from CANNOT SOLVE; a part without a step answer counts in the primary only; fewer than three answered and the series closed at the review ⇒ `incomplete`; the series open ⇒ null `pending`; recounted from the prediction slot's `first_response` events against the content key with the scope rules of contract §9.4 (a defect isolated to the diagnosis slot leaves this row its own value); `step_answer_implied_by_recorded_part` per case in the components, never in the value) (U20)                                           | ↑ prediction (companion)  | none answered ⇒ null (`not_presented`, `pending` and `interrupted` as the primary; `no_eligible_event` at the review closure — `briefed_not_opened`, `diagnosis_only` when at least one part exists and no step answer, otherwise the primary row's reason; `technical_failure` for a fault, a shared or uncertain defect, or an isolated defect of this slot; never `declined`)                                                                                                                                                        |
| `m19_continuations`                   | eligible lines with a further executed TRY of a NEW setting after their first difficulty boundary / eligible lines (planned denominator 2; conditional, complete at any size above zero): per line, from the `attempt` events alone, the boundary = the first attempt after which the executed settings include all listed evidence settings (line 1 the all-ON SINGLE setting; line 2 dial 4 SHUT and dial 5 SHUT — D-U21-1 item 2, Option B; inferred routes never count), `continued` = a later attempt exists; eligible ⇔ boundary AND finish not `technical_failure` AND (continued OR finish `set_aside` OR `shift_ended`); a boundary line closed at the review without a continuation is censored; a line finished `technical_failure` is excluded with or without a recorded continuation (E21), earlier finished lines keeping their outcome (W1); the value is the NUMERATOR COUNT with the denominator beside it; every stored reading and the boundary record are checked against the recount (S1–S7; a contradiction voids the row) (U21)                       | ↑ continuation            | null `pending` until both lines are finished or the panel is closed; no boundary ⇒ `numerator: null`, `denominator: 0`, `no_eligible_event` (`obstacle_not_reached` / `no_try`), never 0 and never failure; check failed ⇒ `understanding_failed`; check not reached or not answered, or never opened ⇒ `no_eligible_event`, never `declined`; the only boundary line censored by the review ⇒ `interrupted` (`censored_only`); a fault with no eligible line ⇒ `technical_failure` (`technical_only`); reload ⇒ `interrupted`          |
| `m20_cued_resumptions`                | cued-eligible channels with a cued credit / cued-eligible channels (planned 2; conditional, complete above zero): per channel, from the raw events alone, held = `channel_held` after the aligned second step; released = `channel_released` at `held_at_ms + 30000`; a spontaneous resumption = the first executed `align_attempt` after the release and before the channel's `cue_presented` (or with no notice) — EXCLUDED from the cued denominator, counted in the companion `spontaneous_resumptions` (D-U22-1 item 12); the cued credit = the first executed attempt after `cue_presented`; cued-eligible ⇔ released AND not resumed before its notice AND the notice validly presented (visible, focused, ≥ release + 30000, A before B, B ≥ 8000 ms after A's actual end) AND not excluded; noticed without a credit: 0 at the sign-off, censored at the review, excluded by a fault; the NUMERATOR COUNT with the denominator beside it; every differ count and protocol time checked against the recount (S1–S7; a notice after a resumption voids) (U22)          | ↑ cued re-engagement      | null `pending` until no channel can still become cued-eligible or the project is closed; no cued-eligible channel ⇒ `numerator: null`, `denominator: 0` (`technical_only` ⇒ `technical_failure`, `censored_only` ⇒ `interrupted`, `resumed_before_cue` / `cue_not_presented` / `no_hold` / `not_begun` ⇒ `no_eligible_event`), the value never 0; never opened ⇒ `no_eligible_event` (`not_opened`), never `declined`; reload ⇒ `interrupted`; the spontaneous count beside the primary, never added to it                              |
| `m21_restudy_revisions`               | cases with a relevant restudy (a section read after application k bearing on a fault known from applications 1..k) AND a revised application (a FIT with a changed configuration) / cases whose first FIT (the application, available once the plate is read) was incorrect and were resolved by the participant — recounted from the `section_consulted` and `applied` events (U10)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          | ↑ re-engagement           | no incorrect first application ⇒ null; a review-closed incorrect case without the fact ⇒ censored, excluded                                                                                                                                                                                                                                                                                                                                                                                                                             |
| `m22_revisions_begun`                 | reports with a revision begun (a code attached after the acknowledgement of the returned note) / reports whose requirement was presented (2 planned) and that the participant decided — or the review closed after the revision had begun; recounted from the `setback_acknowledged` and `code_attached` events (U11)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         | ↑ re-engagement           | none presented ⇒ null; a returned note never acknowledged ⇒ excluded (`understanding_failed` when it is every one); acknowledged and left to the review without a revision ⇒ censored, excluded                                                                                                                                                                                                                                                                                                                                         |
| `m23_continuations_after_failure`     | further search after first failed dig / plots with failed dig                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 | ↑ trying again            | no failed dig                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| `m24_postknowledge_casts`             | rig cycles committed inside the 30 s focused continuation that opens only on a PASSED expected-outcome check (the first included) — recounted from the `postknowledge_cast` events (U12); sensitivity max(n−1,0) beside; the pre-knowledge / after-fail casts, the check's record and switch / exit / cap kept as the companion `m24_unqualified_casts`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       | ↑ known-futile repetition | deck never depleted ⇒ null (no boundary); check never decided ⇒ null `interrupted`; check failed ⇒ null `understanding_failed`; cap / review censor the count                                                                                                                                                                                                                                                                                                                                                                           |
| `m25_optional_repeats`                | optional repeats after required loops; belief 1–5 separate                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    | ↑ IP (not desirable)      | loops never completed                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| `m26_postknowledge_retries`           | Post A transmissions attempted inside the 30 s focused continuation that opens only on a PASSED expected-outcome check (the FIRST included; the v2 first-probe exclusion retired) — recounted from the `postknowledge_retry` events (U12); sensitivity max(n−1,0) beside; the pre-knowledge / after-fail attempts, the check's record and switch / exit / cap kept as the companion `m26_unqualified_retries`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 | ↑ known-futile repetition | channel never disconnected ⇒ null (no boundary); check never decided ⇒ null `interrupted`; check failed ⇒ null `understanding_failed`; cap / review censor the count                                                                                                                                                                                                                                                                                                                                                                    |

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
