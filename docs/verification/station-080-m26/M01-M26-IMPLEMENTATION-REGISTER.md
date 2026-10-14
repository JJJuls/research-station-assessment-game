# M01–M26 implementation register — v3.0

Versioned, owner-approved scope of the Station 080 measurement run
(`FABLE-M01-M26-IMPLEMENTATION-INSTRUCTIONS.md`, 22 September 2026; item
rows reproduce `Station_080_M01-M26_Final_Measurement_Decisions.docx`).
Machine-readable twin: `src/measurement/registerV3.ts` (no source wording
enters the game bundle). Legacy record: the evidence-led pilot v2 ledger in
`docs/verification/evidence-led-pilot-v2/` stays frozen under its own version
(`09_M01_M26_FINAL`, workbook md5 `1535682ab88481815bbdda1206644d4c`) and is
never edited; where the v3 target supersedes a v2 mechanic the v2 row remains
the historical mapping.

Protocol versions: `measurement_protocol_version = station080-m26-pilot-v1`,
`measurement_schema_version = 2026-09.m26.1`, register `v3.0`, feature
extractor `1`.

Professional research prototype. Establishes no validity, reliability, norms,
cut scores or questionnaire equivalence. Every `proto_*` identifier is a
candidate until the research owner promotes it into
`docs/research/event-schema.md`; every feature is a prototype output. No
26-item global score exists or will be computed. Missing or invalid
opportunities never become low values.

## 1. Battery and questionnaire contract

12 BFI-2 Conscientiousness items + 6 BESSI Information Processing items +
5 MPS Persistence Despite Difficulty + 3 MPS Inappropriate Persistence = 26
(MPS = the Multidimensional Persistence Scale of Howard & Crayne 2019, final
Appendix A numbering). Six target groupings: Organization M01–M04,
Productiveness M05–M08, Responsibility M09–M12, Information Processing
M13–M18, PDD M19–M23, IP M24–M26. No Grit-S, Goal-Time or persistence
Appendix A 6–10 item enters this scope; the legacy Q01–Q33 records keep
their old tags.

The exact criterion wording below is internal traceability only (never
player-facing). Response formats: BFI-2 five-option agreement (reverse
`6 − response` for M02, M04, M05, M08, M11, M12 when forming keyed facet
outputs); BESSI Information Processing five-option ability rating, all six
items retained; MPS original response format as documented in the source
instrument (never the in-game M22/M25 anchors). Live Qualtrics configuration
is a later phase; this mapping is the explicit source contract.
**Questionnaire reverse keys never reverse gameplay telemetry** — each
feature's own direction is stated in §2.

| Item | Source (instrument, item no.) | Q key | Exact criterion stem (internal)                                                                     |
| ---- | ----------------------------- | ----- | --------------------------------------------------------------------------------------------------- |
| M01  | BFI-2 18                      | +     | Is systematic, likes to keep things in order.                                                       |
| M02  | BFI-2 3                       | R     | Tends to be disorganized.                                                                           |
| M03  | BFI-2 33                      | +     | Keeps things neat and tidy.                                                                         |
| M04  | BFI-2 48                      | R     | Leaves a mess, doesn't clean up.                                                                    |
| M05  | BFI-2 23                      | R     | Has difficulty getting started on tasks.                                                            |
| M06  | BFI-2 38                      | +     | Is efficient, gets things done.                                                                     |
| M07  | BFI-2 53                      | +     | Is persistent, works until the task is finished.                                                    |
| M08  | BFI-2 8                       | R     | Tends to be lazy.                                                                                   |
| M09  | BFI-2 13                      | +     | Is dependable, steady.                                                                              |
| M10  | BFI-2 43                      | +     | Is reliable, can always be counted on.                                                              |
| M11  | BFI-2 58                      | R     | Sometimes behaves irresponsibly.                                                                    |
| M12  | BFI-2 28                      | R     | Can be somewhat careless.                                                                           |
| M13  | BESSI 22                      | +     | Solve puzzles.                                                                                      |
| M14  | BESSI 54                      | +     | Handle a lot of information.                                                                        |
| M15  | BESSI 86                      | +     | Make sense of complex information.                                                                  |
| M16  | BESSI 118                     | +     | Process new information.                                                                            |
| M17  | BESSI 150                     | +     | Learn things quickly.                                                                               |
| M18  | BESSI 182                     | +     | Find logical solutions to problems.                                                                 |
| M19  | MPS Appendix A 1              | +     | I keep on going when the going gets tough.                                                          |
| M20  | MPS Appendix A 2              | +     | People describe me as someone who can stick at a task, even when it gets difficult.                 |
| M21  | MPS Appendix A 3              | +     | Even if it's difficult to understand, I will read an entire book until I "get" it.                  |
| M22  | MPS Appendix A 4              | +     | Setbacks do not discourage me.                                                                      |
| M23  | MPS Appendix A 5              | +     | Even if something is hard, I will keep trying at it.                                                |
| M24  | MPS Appendix A 11             | +     | Sometimes I find myself continuing to do something, even when there is no point in carrying on.     |
| M25  | MPS Appendix A 12             | +     | Sometimes I will keep doing the same thing over and over, but I believe that it is normal to do so. |
| M26  | MPS Appendix A 13             | +     | I will keep trying at something, even if I know my actions are worthless.                           |

## 2. Item rows (target design, feature contract, as-built status)

Columns: **Direction** (approved), **Occ.** (planned occasions), **Primary
feature** (id; numerator / denominator; range; higher means), **Companions**,
**Label** (coverage label), **As-built** (route version and implementation
status at this register version — updated by each unit).

| Item | Direction               | Occ. | Primary feature                                                                                                                                                                                                                                                                                                                | Companions                                                                                                                                                                                                                                     | Label                   | As-built                                                                                                                                                                                                                                                         |
| ---- | ----------------------- | ---- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| M01  | Redesign                | 2    | `m01_planned_jobs`: jobs placed before the first work action / 6; 0–6; more advance organisation                                                                                                                                                                                                                               | plan structure, job correctness per occasion                                                                                                                                                                                                   | behavioural counterpart | v3 route: `proto_m01_batch_o1` (Concourse, ep 1) + `proto_m01_batch_o2` (Records Workshop, ep 5) — implemented (U5)                                                                                                                                              |
| M02  | Revise and extend       | 1    | `m02_correct_first_retrievals`: correct first retrievals / 6; 0–6; better traceability                                                                                                                                                                                                                                         | filing choices (`m02_filing_layout`, provisional feature row — §5.146), retrieval latency (`m02_retrieval_latency`)                                                                                                                            | behavioural counterpart | v3 route: `proto_m02_retrieval_series` (Records Workshop, ep 2) — implemented (U13); during the requests the participant's layout and own tray labels stay visible and the system-supplied case codes and contents do not (owner ruling of 28 September, §5.137) |
| M03  | Retain and verify       | 2    | `m03_tools_restored`: restored / 6; 0–3 per occasion; more tidying                                                                                                                                                                                                                                                             | object states (`m03_object_states`, provisional feature row — §5.175)                                                                                                                                                                          | retained core           | v3 route: `proto_m03_tools_a` (Records Workshop, ep 2) + `proto_m03_tools_b` (Records Workshop, ep 5) — implemented (U14)                                                                                                                                        |
| M04  | Extend occasions        | 2    | `m04_undisposed_pieces`: undisposed incl. carried / 6; more own mess                                                                                                                                                                                                                                                           | per-job values (`m04_job_values`, provisional feature row — §5.175)                                                                                                                                                                            | behavioural counterpart | v3 route: `proto_m04_cutting_o1` / `o2` (Records Workshop, ep 2) — implemented (U14)                                                                                                                                                                             |
| M05  | Redesign                | 2    | `m05_start_latency`: per accepted occasion the focused ms from eligibility to the first work action + status started / deferred / exited / cap / interrupted; never a starter-only mean                                                                                                                                        | `m05_acceptance_exposure` (offer, answer, eligibility wait, exposure by cause, control views, work, late start)                                                                                                                                | behavioural counterpart | v3 route: `proto_m05_start_o1` (Concourse, ep 1) + `proto_m05_start_o2` (Recovery Yard, ep 4) — implemented (U6)                                                                                                                                                 |
| M06  | Redesign                | 1    | `m06_unique_correct_orders`: distinct orders whose matching dispatch fell inside the one 60 s focused budget; 0–12; more useful output in equal allocated time                                                                                                                                                                 | `m06_work_period_detail` (first-pass accuracy, rework, skips, invalid dispatches, actual stop time, stop kind, per-order records)                                                                                                              | behavioural counterpart | v3 route: `proto_m06_work_period` (Records Workshop, ep 2) — implemented (U7)                                                                                                                                                                                    |
| M07  | Retain with controls    | 1    | `m07_stages_completed`: stages / 6 at the closing milestone; more routine completion                                                                                                                                                                                                                                           | returns                                                                                                                                                                                                                                        | retained core           | v2-ledger route (P7 valid-zero defect) — planned                                                                                                                                                                                                                 |
| M08  | Add controlled task     | 1    | `m08_work_choice_fraction`: Work / valid choices; 0–6; more work chosen (exploratory)                                                                                                                                                                                                                                          | fractions by benefit level, practice performance                                                                                                                                                                                               | exploratory             | v3 route: `proto_m08_effort_choice`, Recovery Yard, ep 4 — implemented and reviewed (U2 + U2-R)                                                                                                                                                                  |
| M09  | Extend checkpoints      | 3    | `m09_due_checks_fulfilled`: fulfilled / eligible due checks; 0–3; more follow-through                                                                                                                                                                                                                                          | acceptance, reminders, access                                                                                                                                                                                                                  | behavioural counterpart | v3 route: `proto_m09_watch_duty` — one accepted duty, three check windows on the Concourse gauge (acceptance ep 1, laboratory pass ep 3, return ep 5) — implemented (U15); the third check closes at the first Concourse exit (owner decision D-U15-1, §5.239)   |
| M10  | Add second obligation   | 2    | `m10_obligations_fulfilled`: fulfilled or delegated / accepted accessible; 0–2; more reliability                                                                                                                                                                                                                               | per-obligation outcomes                                                                                                                                                                                                                        | behavioural counterpart | v3 route: `proto_m10_delivery_d1` (key card, Vale → Kai, offered in the Concourse, ep 1) + `proto_m10_delivery_d2` (yard logbook, Noor → Vale, offered in the Recovery Yard, ep 4) — implemented (U15)                                                           |
| M11  | Add task                | 2    | `m11_unresolved_custodies`: unresolved / accepted accessible; 0–2; more unresolved stewardship                                                                                                                                                                                                                                 | understanding, handover records                                                                                                                                                                                                                | exploratory             | v3 route: `proto_m11_custody_lab` (Laboratory, ep 3) + `proto_m11_custody_yard` (Recovery Yard, ep 4) — implemented (U3)                                                                                                                                         |
| M12  | Redesign interaction    | 2    | `m12_fields_verified`: fields explicitly judged (matches / differs) before release, summed over the released products / 6; 0–6; more checking coverage (a released product with nothing judged is an observed 0; a packet opened but never released is missing)                                                                | `m12_detection_and_correction` (per product: judgement accuracy, faulty field detected = judged "differs", correction attempted, correction successful = entered value equals the reference, unnecessary corrections, per-field records)       | behavioural counterpart | v3 route: `proto_m12_check_o1` (Concourse, ep 1), `proto_m12_check_o2` (Records Workshop, ep 2) — implemented (U8)                                                                                                                                               |
| M13  | Extend cases            | 3    | `m13_first_solutions`: networks solved on first submission / 3                                                                                                                                                                                                                                                                 | constraints, help                                                                                                                                                                                                                              | performance counterpart | v3 route: `proto_m13_network_series` — three keyed networks at the Conduit Lattice Bench (Workshop, ep 2), one immutable first response each before any feedback; results and capped practice after — implemented (U16; owner ruling D-U16-1, §5.260)            |
| M14  | Extend packets          | 2    | `m14_correct_first_integrations`: correct first decisions / 6                                                                                                                                                                                                                                                                  | by packet, omissions, source use                                                                                                                                                                                                               | performance counterpart | v3 route: `proto_m14_integration_series` — two keyed packets at the Concourse incident desk (ep 1), one immutable first response per decision before any feedback; results after the sixth — implemented (U17; owner decisions D-U17-1 / D-U17-2, §5.275–§5.276) |
| M15  | Extend systems          | 2    | `m15_correct_first_predictions`: correct first predictions / 4                                                                                                                                                                                                                                                                 | model correctness, exploration                                                                                                                                                                                                                 | performance counterpart | v3 route: `proto_m15_systems_series` — two relay boxes at the Laboratory evidence table (ep 3), one immutable wiring and two immutable first predictions per box before any feedback; results after the fourth — implemented (U18; decision D-U18-1, §5.291)     |
| M16  | Standardise             | 1    | `m16_correct_first_applications`: correct first applications / 6                                                                                                                                                                                                                                                               | form, example versions                                                                                                                                                                                                                         | performance counterpart | v3 route: `proto_m16_handling_series` — the handling rule at the Laboratory protocol console (ep 3), two worked examples, then six immutable first responses before any feedback; results after the sixth — implemented (U19; decision D-U19-1 + A1, §5.302)     |
| M17  | Replace trial structure | 1    | `m17_criterion_trial`: {criterion_trial 3–12, attained} — the first learning trial ending a run of three consecutive correct first responses; reported whenever reached within the administered trials; (12, false, censored) after twelve without attainment; early exit without attainment = incomplete                      | `m17_sequence_baseline_transfer` (baseline 2 / learning 12 / transfer 2 first-response sequences, feedback exposures, reference sequences shown, help, demonstration reviews, per-trial records)                                               | performance counterpart | v3 route: `proto_m17_criterion` (Diagnostics Laboratory, ep 3) — implemented (U9); **criterion values not to be read until §5.87–5.88 are decided**                                                                                                              |
| M18  | Extend diagnosis        | 3    | `m18_correct_first_diagnoses`: / 3                                                                                                                                                                                                                                                                                             | `m18_correct_consequence_predictions`: / 3                                                                                                                                                                                                     | performance counterpart | v3 route: `proto_m18_cases_series` — three diagnosis cases at the Laboratory diagnostic board (ep 3), each an immutable first diagnosis then an immutable first step answer before any feedback; results after the sixth — implemented (U20; D-U20-1, §5.315)    |
| M19  | Add second challenge    | 2    | `m19_continuations`: further attempt / eligible difficulty encounters; 0–2                                                                                                                                                                                                                                                     | failed attempts, success, time                                                                                                                                                                                                                 | behavioural counterpart | v3 route: `proto_m19_lines_series` — two coupling lines at the Yard coupling panel (ep 4) after a panel check; each line's designed obstacle one immutable boundary; continuation = a further executed TRY — implemented (U21; D-U21-1, §5.328)                  |
| M20  | Extend returns          | 2    | `m20_cued_resumptions`: resumed / eligible unfinished components; 0–2                                                                                                                                                                                                                                                          | spontaneous returns, progress, cue exposure                                                                                                                                                                                                    | exploratory             | v3 route: `proto_m20_feed_project` — two held channels at the Workshop feed console (ep 5); silent release 30 s after the hold, notice 30 s later if unresumed; spontaneous resumptions kept apart — implemented (U22; D-U22-1 as selected, §5.344)              |
| M21  | Replace revisit score   | 2    | `m21_restudy_revisions`: cases with a relevant restudy (a section bearing on a fault known at the time) AND a revised application / cases whose first application was incorrect and were resolved by the participant (accepted or set aside — a review-closed case keeps its observed 1); 0–2; two first-time successes → null | per-case strategy (first_correct / restudy_and_revise / revise_without_relevant_restudy / restudy_then_exit / exit / unresolved), applications, faults, restudy sections, comprehension context (sections used, reference depth, mode, plate)  | partial                 | v3 route: `proto_m21_case_o1` / `o2` (Records Workshop, ep 5) — implemented (U10)                                                                                                                                                                                |
| M22  | Hybrid                  | 2    | `m22_revisions_begun`: reports on which a revision was begun (a code attached after the acknowledgement of the returned note) / reports whose requirement was presented (2 planned; a review-closed report keeps its observed 1 once the revision had begun; a returned note never acknowledged ⇒ excluded)                    | `m22_discouragement_ratings`: two 1–5 ratings, each with its recall delay, its position among the questions and the time since its screen was presented; declined or missing = null, never a midpoint; `acknowledged_reports` beside           | hybrid                  | v3 route: `proto_m22_returned_o1` / `o2` (Records Workshop, ep 5) — implemented (U11)                                                                                                                                                                            |
| M23  | Add second plot         | 2    | `m23_continuations_after_failure`: further search / plots with a failed dig; 0–2                                                                                                                                                                                                                                               | attempts, strategy, success                                                                                                                                                                                                                    | behavioural counterpart | v2-ledger route (one plot) — planned                                                                                                                                                                                                                             |
| M24  | Repair boundary         | 1    | `m24_postknowledge_casts`: rig cycles committed inside the 30 s focused continuation that opens only when the expected-outcome check is passed (the first included); a never-depleted deck, an undecided or failed check ⇒ null                                                                                                | `m24_postknowledge_casts_minus_first` (sensitivity, max(n − 1, 0)); `m24_unqualified_casts` (the check's record — attempts, first-pass / post-explanation / fail — casts after the depletion before a pass or after a fail, switch, exit, cap) | behavioural counterpart | v3 route: `proto_m24_rig_continuation` (Recovery Yard, ep 4) — implemented (U12)                                                                                                                                                                                 |
| M25  | Hybrid                  | 1    | `m25_optional_repeats`                                                                                                                                                                                                                                                                                                         | `m25_normality_belief` 1–5                                                                                                                                                                                                                     | hybrid                  | v3 route: `proto_m25_calibration_loops` (Recovery Yard, ep 4) + `proto_m25_normality_belief` (Concourse, ep 5) — implemented (U4)                                                                                                                                |
| M26  | Repair boundary         | 1    | `m26_postknowledge_retries`: Post A transmissions attempted inside the 30 s focused continuation that opens only when the expected-outcome check is passed (the FIRST included — the v2 first-probe exclusion is retired); a never-disconnected channel, an undecided or failed check ⇒ null                                   | `m26_postknowledge_retries_minus_first` (sensitivity, max(n − 1, 0)); `m26_unqualified_retries` (the check's record, Post A attempts after the disconnect before a pass or after a fail, switch, exit, cap)                                    | behavioural counterpart | v3 route: `proto_m26_uplink_continuation` (Recovery Yard, ep 4) — implemented (U12)                                                                                                                                                                              |

### 2b. Occasion count, placement and clustering

"Repeated actions in one episode are not independent situations." The
register records, per item, how its observations cluster
(`independence.kind` in `registerV3.ts`); an analyst reading the features
alone can tell which denominators are clustered.

| Kind                        | Items                                            | Note                                                                                    |
| --------------------------- | ------------------------------------------------ | --------------------------------------------------------------------------------------- |
| independent occasions       | M01, M03, M05, M10, M11, M12                     | different episodes or rooms; within-occasion sub-units (cards, fields) remain clustered |
| repeated within one episode | M04, M08, M13, M14, M15, M18, M19, M21, M22, M23 | same room and episode; a shared block, bench, packet or case set                        |
| repeated within one project | M09, M20                                         | several checks / returns share one accepted duty or one project                         |
| single episode              | M02, M06, M07, M16, M17, M24, M25, M26           | one window; stability needs repeated-measures evidence later                            |

Per-item procedure, event fields, formula, eligibility, timing, test
evidence and residual limitations are appended to this file by each item
unit under §4 as the as-built record (never only a plan).

## 3. Shared rules encoded in the protocol layer

- Focused observation time (`src/measurement/focusedClock.ts`): wall time
  minus intervals with an active pause cause (`focus_loss`, `hidden`,
  `explicit_pause`, `animation_lock`, `loading`, `unusable_controls`,
  `surface_closed`); excluded time is kept BY CAUSE, and overlapping causes
  each carry the shared interval (attribution, not partition), so the
  per-cause sum may exceed `excluded_total_ms = wall_ms − focused_ms`. A
  cause recorded before the clock starts is kept (a clock never starts
  unpaused inside a documented loss of focus). A cap is a censoring
  signal, never an action. The browser bridge (`focusMonitor.ts`) feeds
  blur / visibility; the session covariate in `DataQualityTracker` is
  untouched.
- Closure reasons: `completed | voluntary_stop | declined | route_departure
| cap | session_end | closed_at_review | technical_failure`, carried on
  every feature row as `closure_reason`.
- Knowledge status (M24 / M26): `unknown | pass_first |
pass_after_explanation | fail`; an acknowledgement click never passes.
- Feature dispositions: `observed | not_presented | declined |
no_eligible_event | understanding_failed | voluntary_stop | incomplete |
interrupted | technical_failure | pending | not_implemented`; `null` is the
  only representation of "not observed"; a zero is always an observed zero;
  a fraction on fewer valid observations than planned is exported with its
  value under `incomplete`; a zero denominator carries the caller's stated
  reason (declined ≠ not presented ≠ no eligible event); after a reload an
  item with no current-load evidence is `interrupted`.
- Export: every payload (full and compact) carries `measurement_protocol`
  and `measurement_features` (all 26 items, every feature key, numerator,
  denominator and planned denominator, included ids, censor status,
  closure reason, bounded supporting sequence numbers). The augmenter runs
  once per payload; its failure is counted as a technical error.
- Pilot settings (defaults, not thresholds): M05 60 s, M06 60 s / 12 orders,
  M08 6 × 15 s, M17 2 + 12 + 2 with a three-in-a-row criterion, M24 / M25 /
  M26 30 s, M25 three required loops. The two in-game question stems are
  pinned in `protocol.ts` beside their anchors.

## 4. As-built records (appended per unit)

**Unit 22 (M20): as-built** — the two held channels of the Mast 04 feed at the
Records Workshop return-shift feed console (bounded unit under contract
`U22-CONTRACT.md`, v3 of 14 October 2026; research-owner decision D-U22-1).
**Status: technical implementation of the approved row under research-owner
decision D-U22-1 (APPROVED 14 October 2026, recorded as the owner's SPECIFIC
selections — items 1–11 as recommended, item 12 the silent-release alternative,
item 13 the exploratory-label alternative — never as "all recommendations";
against preview revision r3); `m20_cued_resumptions` is a candidate indicator
with the coverage label `exploratory` and NOT scientifically validated.** The
two channels are two components of ONE project inside ONE room and ONE shift —
clustered observations, never two independent situations; A's outcome may
change B's; longer remaining copying is not established difficulty
(`difficulty_established: false`); the task is a provisional measure of
re-engagement with a suspended, attention-demanding transcription channel —
first spontaneously, in a silent window, then after a specific notice — whose
relation to MPS item 2 requires empirical evaluation; a cued count of 2 shows
only that for each channel that was held at step 2, silently released, NOT
resumed in its silent window and then noticed, the participant executed at
least one more ALIGN before signing off; the cued outcome is conditional on the
participant not having resumed spontaneously and is no ranking across all
participants (the owner's recorded limitation); a spontaneous resumption shows
only that an executed ALIGN occurred in the silent window after the participant
opened the console on their own, and is a companion never combined with the
primary; no global or cross-item score; no questionnaire wording or pressure in
any participant text. Passing tests establish implementation correctness only,
never psychometric validity, reliability, persistence as a trait, prospective
memory or questionnaire equivalence. Parts (0)–(2) below were written BEFORE
the content module, the project model, the adapter, the surface model and the
extractor (the contract's "specify before you code"); parts (3)–(7) record the
build and its evidence.

(0) Authority. **Research-owner decision D-U22-1 — APPROVED 14 October 2026,
as the owner's selections** (an owner ruling, recorded in §5.344; not an
implementer default and not reopened): items 1–11 of preview §3.3 as
RECOMMENDED with the consequential changes item 12 requires — [O-1] the
return-shift feed console; the legacy antenna start and resume leave the
route; Mast 04 is re-wired as unmeasured outdoor preparation (its strings,
actions and state object kept; `outdoor_*` events); [O-2] six steps of 3, 3, 4,
4, 5, 5 cells per channel, the system hold the moment step 2 is aligned, A
first, B once A has ever been held; [O-3] the notice with item 12's timing (due
at `released_at_ms + 30000`), delivered only with the console closed, the
participant in the Workshop, nothing else open, the page visible and focused,
and the channel neither resumed nor aligned; shown for 6 s or ended early (a
surface or prompt opening, leaving the Workshop, closure; never by focus loss);
A before B, B ≥ 8 s after A's ACTUAL end; one per channel, never repeated;
protocol times integrity-checked; [O-4] presented at Workshop entry, guided at
return-shift order 1 until the first opening, access immediate once released;
[O-5] the vector refusal rule (`as_loaded` / `repeat` / `settling` / `held`)
and the cued credit = the first EXECUTED ALIGN after the notice; [O-6] notice →
credit or closure; sign-off ⇒ 0, review ⇒ censored, reload ⇒ `interrupted`;
the row final once no channel can still become cued-eligible; [O-7]
cued-eligible ⇔ released AND not resumed before its notice AND notice validly
presented AND not excluded; one eligible channel = complete; the
zero-denominator precedence `technical_only` > `censored_only` >
`resumed_before_cue` > `cue_not_presented` > `no_hold` > `not_begun`; [O-8]
never opened ⇒ `no_eligible_event` (`not_opened`), never `declined`; no
comprehension check; [O-9] faults keep earned cued credits and spontaneous
resumptions, exclude noticed channels awaiting a return, no eligible channel
⇒ `technical_failure` (`technical_only`), malformed evidence voids the row;
[O-10] the verify-unit foreign-metadata rule; [O-11] `closed_unopened`
(`shift_signed_off`) at the sign-off and the `pilot_route` "six-zone"
classification. **[O-12] The SILENT RELEASE (alternative selected):**
`channel_released` at `held_at_ms + 30000`, independent of notice
presentability; the first executed ALIGN after the release and before the
channel's notice is a spontaneous resumption (status `resumed_spontaneously`,
counted in `spontaneous_resumptions`, excluded from the cued denominator); a
notice is never shown for it (`cue_cancelled`, descriptive); never counted
twice; no new occasion on reopening; the primary stays the cued numerator
count with its eligible denominator — never a ratio or a combined score; the
owner's recorded limitation (the cued outcome describes channels not resumed
before their notice; two spontaneous resumptions with no cued-eligible channel
⇒ null primary, denominator 0, spontaneous 2 — E47). **[O-13] The EXPLORATORY
LABEL (alternative selected):** `registerV3.ts` M20 `coverage_label:
'exploratory'`, `difficulty_established: false`, every researcher-facing
description consistent; "difficult" never treated as established because more
copying remains. Not selected: the item-12 recommendation (hold until the
notice; spontaneous resumption unobservable) and the item-13 recommendation
(keep `behavioural_counterpart`). D-U22-1 confirms §5 items 2 and 4 for M20.
Settled consequences [A] (preview §3.1): two unfinished components of one
project, each with a cued return milestone; the NUMERATOR COUNT 0–2 with the
cued-eligible denominator, planned 2, `conditional_eligibility`; null without
an eligible cued component; spontaneous returns kept separately; a resume is
not a new occasion; clustered; access immediate; no interruption after
completion; the reload rule; no composite, no canonical promotion, no validity
claim, no questionnaire wording. The approved row is §2 (M20), §2b, §5 items 2
and 4, the matrix row, addendum §1 and §3 and `registerV3.ts` (entry `M20`).
Provenance limit: `D:\latest fabel` was checked once by the preparer and is
unavailable; the decision is an explicit decision for this implementation,
not recovered wording. Rulings D-U16-1 through D-U21-1 and the U21 sign-off of
14 October 2026 are precedent only and approve nothing here. Each rule below
carries its source: [O-n] decision D-U22-1 item n as selected, [A] approved
row or owner instruction, [P] recorded precedent, [D-n] implementer default
(§5.345 onward).

(1) Administration `m20-feed-returns-v2` — **specified before the content
module, the project model and the interface were written.**

- Place, presentation and guidance [O-1][O-4][P][D-10]: the Station Feed
  Console of the Records Workshop (`WORKSHOP_STATIONS.feedConsole`, station
  `pilotFeedConsole`, label "Station Feed Console"; operational label kept
  "Antenna restoration (Yard / Workshop)", episode 5) opens the generic
  `WorkSurfaceScene` in the WIDE frame of decision D-U17-2 (unchanged) with
  surface id `m20_feed_console`. Before the return shift the station is
  unchanged (the standby prompt). In the return shift the station's
  `onPromptOpened` logs the route record `pilot_station_opened`
  (`feed_console`), calls `openM20(now)` and opens the surface; `onClose`
  calls `closeM20Surface(now)` before the host resumes; the Leave control
  takes the same path. The scene's `create()` calls `presentM20(now)` in
  place of the legacy `m20ConsolePresent(now)` (exposure only — the kit's
  `presented` — never an opening), `declareM20Feed()` and `guardM20Reload()`.
  Guidance: the station is registered with `this.guided(...)` as
  `feed_console`, label "Station Feed Console", stages `['workshop_return']`,
  order 1, done once `m20Window().windowStatus()` is no longer `unopened` —
  the first beacon of the return shift is the console until its first
  opening, then Press B (order 2) and the rest; `RETURN_GUIDED_ORDER`
  and the board copy are unchanged (the console is listed by the guidance
  registry, not by the board). Nothing names an unfinished channel outside the
  console: the chip shows step counts only (`m20ChipText()`:
  `MAST 04 FEED · 2 channels` before the first opening, then `A k/6 · B k/6`,
  then `closed for the shift`); it never names `held` or `pass open`, so a
  release changes nothing outside the console. The M04 other-work watcher stays inside the
  return-shift branch with the signature `m20OtherWorkSignature()` = executed
  ALIGNs plus aligned steps (an opening, a refusal, a cell edit, help and a
  notice are never other work begun). No `'proto_…'` literal in the scene. The
  yard's Mast 04 keeps its participant experience: `presentM20MastBrief`,
  `acceptM20Mast`, `doM20MastStage` and `m20OutdoorFault` (adapter functions
  of the new module) call the legacy PURE `m20Accept` / `m20CompleteStage` on
  `exteriorEpisode().m20` and log `outdoor_brief_presented`,
  `outdoor_accepted`, `outdoor_stage_completed`, `outdoor_technical_failure`
  (phase `outdoor`; never counted by the extractor); acceptance registers the
  mission-log entry `m20_feed_outdoor` (the legacy pure `m20MissionLogText`),
  closed when `!accepted || pilotStageAtOrAfter('return_hub')`. The legacy
  antenna family `proto_m20_antenna_*` (`m20AntennaModel.ts`, the adapter
  functions of `exteriorWindows.ts` and `returnWindows.ts`, the legacy surface
  model) stays in the tree unchanged and leaves the route: `exteriorWindows.ts`
  loses only `w.m20.declare();`, the `m20Depart` block, the
  `m20RecordInterruption` block and the M20 review block (plus the import
  names they leave unused and one sentence in each of the two describing
  comments), keeping exactly 8 `setComprehension('passed')`; the yard scene
  replaces only the three legacy act imports and calls and routes `'M20'` in
  `guard()` to `m20OutdoorFault` (the guard signature line byte-identical);
  `reviewClosure.ts` keeps `closeM20ResumeAtReview(nowMs);` (a no-op on the
  route: the legacy resume is never presented) and adds
  `closeM20AtReview(nowMs);` directly after it.
- Content, order and form [O-2]: one pure content module
  (`m20FeedContent.ts`) holds every string of preview §4.2–§4.9 and, as data,
  the targets (A: `2 4 3`, `3 1 4`, `4 2 1 3`, `1 3 4 2`, `3 4 2 1 4`,
  `2 1 3 4 2`; B: `4 1 3`, `2 3 1`, `3 4 1 2`, `2 1 4 3`, `4 2 3 1 3`,
  `1 4 2 3 4`), the cell counts 3, 3, 4, 4, 5, 5, the loading value 1, the
  cell cycle 1 → 2 → 3 → 4 → 1, the hold step 2, `RELEASE_MS` 30 000,
  `NOTICE_AFTER_RELEASE_MS` 30 000, `NOTICE_MS` 6 000, `SPACING_MS` 8 000, the
  settle 400 and the check period 250. Versions `m20-feed-returns-v2`
  (administration), `m20-form-1` (form), `m20-content-v2` (content). Channel
  ids `m20_ch_a` / `m20_ch_b` are also the occasion ids and never change. The
  differ count of a vector is the number of cells unequal to the target; a
  step is aligned when it is 0. Line breaks are the preview's (fixed);
  wording, numbers and order never change; no questionnaire wording anywhere.
- First opening, the card [D-2]: title `MAST 04 FEED`, subtitle
  `Two channels`, status `Read the card, then CONTINUE.`, the nine lines of
  preview §4.3, CONTINUE (primary, no hidden key), `HELP  [H]`,
  `LEAVE  [ESC]`; CONTINUE records `intro_acknowledged`, starts channel A
  (`channel_started`) and presents its step 1 (`step_presented`); leaving
  before it shows the card again at the next opening.
- A step [O-2][O-5][D-3][D-4][D-11]: subtitle `Channel A · step k of 6`,
  status `Working on channel A.`, footer
  `1-5 change a cell · G align · H help · ESC leave`; the board (a neutral
  landing): `TARGET   …`, `CELLS    …`, a blank line, `Channel A: k of 6
steps done.`; the cell tiles `CELL k   v  [k]` (a tile cycles its cell,
  recorded as `cell_changed`, descriptive) and `ALIGN  [G]`; HELP and LEAVE.
  Cells load at 1 and survive leaving (the step and its cells are kept; a
  reopening offers CONTINUE, never the step itself). ALIGN on the current
  vector alone: refused `as_loaded` when every cell is 1 (`The cells are as
loaded. Change a cell first.`), refused `repeat` when the cells equal this
  step's last EXECUTED vector (`Same cells as the last ALIGN. Change a cell
first.`), refused `settling` inside the 400 ms settle of a view (no
  feedback), refused `held` on a held channel (unreachable through the
  interface); a refusal records only `align_refused`. Otherwise EXECUTED:
  `align_attempt` (`step_index`, `attempt_index` — consecutive per channel
  across its steps — `cells`, `differ`, `aligned`, `after_cue`,
  `in_silent_window`) with the feedback `Not aligned: n cells differ.` /
  `Not aligned: 1 cell differs.` or `Step k aligned.`; an older vector
  executes. An aligned attempt is followed immediately by `step_aligned`; at
  step 2 immediately by `channel_held` (`held_at_ms`) and the hold view; at
  step 6 by `channel_aligned` (`Channel A aligned.`); otherwise the next step
  is presented with its cells at 1.
- The hold [O-2]: subtitle `Channel A held`, status `Channel A is held until
its next pass.`, feedback `Step 2 aligned.`, the three lines of preview
  §4.5 (`Its next pass opens later. This console shows when it is open.`);
  after A's hold `START CHANNEL B  [B]`, HELP, LEAVE; after B's hold HELP and
  LEAVE. A held channel accepts nothing: it is never shown as a step, and a
  reopening while it is held records a blocked approach (`held_visit`).
- The silent release [O-12][D-12]: at `held_at_ms + 30000` the channel becomes
  workable whatever the participant is doing. The adapter writes
  `channel_released` (`released_at_ms = held_at_ms + 30000`, with the
  descriptive `written_at_ms`, `write_latency_ms` and the check that wrote
  it) at the first check at or after that time — the Workshop scene's tick
  (≤ 250 ms while the scene runs), the scene's RESUME, any console opening,
  the due check, the sign-off, the review or a fault — and always before any
  work on, view of, notice for or closure record of that channel. Nothing
  outside the console announces it. Opening the console shows the channel
  `pass open` with CONTINUE and records `released_visit` for each released,
  unresumed, unnoticed channel.
- The channel view [O-2][D-11]: subtitle `Both channels`, status `Choose a
channel, or LEAVE.`, footer `A / B choose · TAB move · H help · ESC leave`;
  the rows `CHANNEL A   k of 6 steps   <word>` (a neutral landing) with the
  word `not started` / `in work` (started, before its hold) / `held` /
  `pass open` (released, before or after its notice, resumed or not) /
  `aligned`; `CONTINUE CHANNEL A  [A]` / `CONTINUE CHANNEL B  [B]` for a
  channel `in work` or `pass open` (from its release on, whether or not its
  notice has come), `START CHANNEL B  [B]` when B is `not started` and A has
  ever been held, the line `No channel can be worked until its next pass.`
  when no button applies, `Both channels are aligned. The feed is restored.`
  when both are aligned; HELP and LEAVE. CONTINUE presents the channel's
  current step again (`step_presented`, `resumed: true`) with the cells as
  they stood; START B records `channel_started` B and presents B's step 1.
- Spontaneous resumption [O-12]: the first executed ALIGN on a channel after
  its `channel_released` and before its `cue_presented` sets the channel to
  `resumed_spontaneously`; the adapter then writes `cue_cancelled` (`reason`
  `resumed_before_cue`, descriptive) and that channel's notice is never
  delivered. Opening, CONTINUE, cell edits and refused ALIGNs are not
  resumptions. A channel aligned in its silent window was resumed
  spontaneously at its first executed ALIGN there.
- Transitions [A][O-6] — exactly preview §4.12: card | LEAVE / reopen | the
  card again; A step 1–2 (before the hold) | LEAVE / reopen | A `in work` →
  CONTINUE A (same step), no START B; A's hold view | START B / LEAVE | B step
  1 / on reopen START B; both held, before release | reopen | no button,
  `held_visit` per channel; A released (silent window), B held | reopen | A
  `pass open` → CONTINUE A, `released_visit` for A, `held_visit` for B
  (opening alone, edits or refusals are not a resumption); silent window |
  CONTINUE A + an executed ALIGN | spontaneous resumption of A, its notice
  cancelled and never shown; silent window | LEAVE without an executed ALIGN
  | nothing changes, A's notice stays due; A's notice shown, B not started |
  reopen | CONTINUE A, START B; after A's notice | CONTINUE A + an executed
  ALIGN | cued resumption of A; after either resumption, mid-step | LEAVE /
  reopen | CONTINUE A (same step), `post_resumption_reentries` + 1, no new
  occasion, notice or release; A aligned before any notice | automatic |
  spontaneous, completed, no notice; both aligned | automatic | the restored
  line, `project_completed` and the kit's `window_closed` (exit `completed`).
  Leaving never holds or releases a channel; a resumption (either kind) never
  writes another hold, release, notice, channel start, opening or occasion.
- The notice [O-3][O-12][D-11][D-12]: due at `released_at_ms + 30000`; one
  adapter clock (`Date.now()`) for every protocol time. `m20CueCheck(nowMs,
context)` runs from the Workshop scene's per-frame hook at most every 250 ms
  while the scene runs, and on RESUME. It first writes any due release, then
  ends an active notice whose 6 000 ms are over (`timeout`), then delivers a
  notice only if ALL hold: `now ≥ released_at_ms + 30000`; the channel is
  released, NOT resumed (no executed ALIGN since its release) and NOT aligned,
  and has no notice yet; the console is closed; the scene runs (the per-frame
  hook is reached only then); no prompt, dialog, overlay, timed world action
  or input lock is active (the scene's own eligibility predicate); the
  environment imposes no pause cause (the page visible and focused); the
  project is open; for B: A's notice has ended and `now ≥ A.ended_at_ms +
8000`, OR A will never get a notice (A resumed, aligned or not held), and
  never while A's notice is due and undelivered. A delivered notice records
  `cue_presented` (`presented_at_ms`, `released_at_ms`, `due_at_ms`,
  `deferred_ms`, `page_visible`, `page_focused`, `distance_to_console_px`,
  `remaining_steps` 4) and shows the two-line station band (preview §4.8:
  `FEED CONSOLE: the next pass for channel A is open.` / `Channel A can be
continued · 4 of 6 steps remain.`) in the Workshop HUD — 16 px design text
  on two lines inside a 16 px margin, below the shared feedback line, never
  over another surface. The band ends after 6 000 ms, or early on a surface or
  overlay opening (the scene's PAUSE; the console included:
  `surface_opened`), a prompt opening (`prompt_opened`), leaving the Workshop
  (`shutdown`) or closure (`project_closed` / `technical_failure`); focus loss
  neither ends nor extends it (`focus_lost_during_display` recorded).
  `cue_notice_ended` (`ended_at_ms`, `ended_reason`, `displayed_ms`,
  `focus_lost_during_display`) is written BEFORE any terminal record. One
  notice per channel, never repeated. Any executed ALIGN after the notice
  qualifies as the cued credit — walking back, or closing and reopening the
  console in place; there is no movement threshold. Timing validity: SCORED
  (S6) `held_at_ms`, `released_at_ms`, `presented_at_ms`, `page_visible` /
  `page_focused` and A's `ended_at_ms`; violations void the row — a release
  other than hold + 30 000 (E56), a notice before release + 30 000 (E37), a
  notice after the channel's resumption (E54), B within 8 000 ms of A's
  actual end (E38), B while A's notice was due and undelivered (E57), a notice
  end after the terminal record (E45); DESCRIPTIVE `deferred_ms`,
  `displayed_ms`, `ended_reason`, `focus_lost_during_display`, the distance,
  `cue_cancelled` and every latency or clock value.
- Help [D-5]: `HELP  [H]` on every view (card, step, hold, channel view, the
  closed records excepted); `help_consulted` (`view`); the help sheet (title
  `HELP`, the seven lines of preview §4.7, `CLOSE HELP  [H]`, footer `H or ESC
close help`) is exclusive while open and never work.
- Commitment mechanics and focus [P][D-4][D-11]: the 400 ms settle on every
  view transition (a press inside it is refused — ALIGN recorded `settling` —
  or dropped); held keys never act (the frame drops repeats); a neutral
  landing on every view (the card text, the step board, the hold text, the
  channel rows, the closed record; the help sheet on CLOSE HELP, the M19
  precedent); same-view focus stays on the acting control (cell tiles and
  ALIGN keep their ids on one step; HELP and LEAVE carry the view's name in
  their ids — `help_<view>` / `leave_<view>` — and the step view's ids carry
  the channel and step, so a hotkey that changes the view lands on the new
  view's neutral element, review finding GP-1 of U21 applied); no movement
  key and not E as a hotkey (the hotkeys are 1–5, G, A, B, H; the avatar moves
  on the arrow keys only); a double click on ALIGN executes once (the second
  click is refused `repeat` or `settling`); ESC closes help, then the console
  (an ESC inside the settle is consumed); LEAVE equals ESC.
- Leaving, closures, reload, faults [O-6][O-8][O-9][O-11][P][D-6]: leaving
  records `console_left` (the work clock pauses); a reopening records
  `console_reopened` plus the `held_visit` / `released_visit` records; leaving
  keeps everything. **Sign-off** (`workshop_return_signoff` calls
  `closeM20AtShiftEnd(now)` before advancing): (a) opened, not completed —
  due releases are written, then any active notice ends (`project_closed`),
  then `project_closed` (`shift_signed_off`, the closure snapshot) and the
  kit's `window_closed` (exit `stopped`, a completed observation: a noticed
  channel without a credit counts 0); pending notices are never delivered;
  (b) presented, never opened — one `closed_unopened` (`shift_signed_off`);
  (c) not presented — nothing; in (a) and (b) the console then shows its
  closed record (`The console closed when the shift was signed off.`).
  **Review** (`closeM20AtReview(nowMs)`, after `closeM20ResumeAtReview`): an
  open project ⇒ due releases, the notice's end, `project_closed`
  (`closed_at_review`) and the kit's `window_closed` (`closed_at_review`,
  censored: noticed channels without a credit are censored); never opened ⇒
  the kit's `markAbsent` (`presented_not_opened` when presented, never
  `declined`) plus `closed_unopened` (`closed_at_review`) when presented and
  none exists; closed ⇒ untouched; the record `The console closed at the
shift review.`. **Reload** [P]: a console opened in an earlier page load of
  this identity is never re-run — `prior_load_checked` (once per load), the
  kit's `technical_failure` (`reload after administration: console not
re-run`), the held-back record `This console was opened earlier in the
session. It stays closed now.`, row `interrupted`. **Faults**
  (`m20TechnicalFailure(detail, channelId | null)`, the `guarded` command
  wrapper [P]): due releases are written and any active notice ends
  (`technical_failure`), the project closes `technical_failure`, the register
  is marked invalid and the kit-shaped `technical_failure` record carries the
  channel in work (the kit's own `technicalFailure` cannot name it — the U21
  precedent §5.340 (a)); earned cued credits and spontaneous resumptions are
  kept; noticed channels without a credit are excluded; the Workshop stays
  usable; the console shows `The feed console has a fault and is closed.` /
  `Its record is kept as it is.`. A completed project is never reclosed.
- Entry snapshot (§9.3): `channels_planned` 2, `channel_order`,
  `steps_per_channel` 6, `cells_per_step` [3, 3, 4, 4, 5, 5],
  `hold_after_step` 2, `release_delay_ms` 30000, `notice_after_release_ms`
  30000, `notice_ms` 6000, `notice_spacing_ms` 8000, `refusal_rule`
  `vector_as_loaded_or_last_executed`, `credit_rule`
  `first_executed_align_after_cue`, `spontaneous_rule`
  `first_executed_align_after_release_before_cue`, `form_id`,
  `content_version`, `settle_ms` 400, `outdoor_prepared` (`accepted`,
  `stages_done`, `outdoor_complete` from the legacy yard state) and `stage`.
  Closure snapshot (on `project_completed` / `project_closed`):
  `channels_planned`, `spontaneous_resumptions`, per channel `channel_id`,
  `occasion_id`, `channel_index`, `started`, `steps_done`, `attempts`, `held`,
  `held_at_ms`, `released`, `released_at_ms`, `noticed`,
  `cue_presented_at_ms`, `resumption` (`spontaneous` / `cued` / null),
  `resumption_attempt_index`, `aligned`, `held_visits`, `released_visits`,
  `post_resumption_reentries`, `refused_in_silent_window`, the clocks of
  (2) below.

(2) Clocks, lifecycle, field classification, integrity rules.

- Clocks [D-12] (companions only; one adapter clock for every protocol time):
  the **work clock** per channel (a `FocusedClock` under the focus monitor)
  runs while the console is open on that channel's step view (paused
  `surface_closed` otherwise); the **release-to-spontaneous** clock starts at
  `released_at_ms` and stops at the spontaneous ALIGN (wall and focused;
  focused pauses only on focus loss or a hidden page; null without a
  spontaneous resumption); the **cue-to-credit** clock runs from
  `presented_at_ms` while the console is closed and stops at the credit, or
  without a credit at closure (`cue_to_closure_*`). Host PAUSE / RESUME starts
  or stops nothing; a closure adds nothing after the last pause; no
  finalisation in a later load. The resumption ALIGN carries its clock values
  (`release_to_align_*` / `cue_to_align_*`, descriptive).
- Lifecycle (precedence reload `interrupted` > integrity `technical_failure`
  > `pending` > the closed outcomes; "final" = a terminal record exists, or
  > both channels are resumed either way): no current-load opportunity evidence
  > (`outdoor_*` never counts) ⇒ null `not_presented` (E1, E1c; with the absence
  > record, closure `closed_at_review`, E1b); reload ⇒ null `interrupted`
  > (`reload_hold_back` / `reload_no_current_evidence`); presented, never opened
  > ⇒ `pending`, at `closed_unopened` or the absence record null
  > `no_eligible_event` (`not_opened`) (E2b, E2c, E2f); opened, not terminal,
  > some channel not resumed either way ⇒ null `pending`; denominator ≥ 1,
  > final ⇒ `observed` with the count (`censored` when a noticed channel was
  > excluded); denominator 0, final ⇒ null / null / 0 / planned 2 with
  > `technical_only` ⇒ `technical_failure`, `censored_only` ⇒ `interrupted`,
  > `resumed_before_cue` > `cue_not_presented` > `no_hold` > `not_begun` ⇒
  > `no_eligible_event`; an integrity defect ⇒ null `technical_failure` (void).
  > Per channel (recounted from the raw events): `not_begun` (no attempt),
  > `begun_not_held`, `held` / `released_awaiting` (open) or
  > `cue_not_presented` (closed) — not resumed, not noticed;
  > `resumed_spontaneously` (the first executed attempt after the release and
  > before any notice — excluded from the cued denominator, counted in
  > `spontaneous_resumptions`); `resumed` (noticed, then a credit — 1);
  > `not_resumed` (noticed, no credit, sign-off — 0); `censored_review` /
  > `excluded_technical_failure` (noticed, no credit, review / fault —
  > excluded, censored); `awaiting_return` (noticed, open — pending).
- Field classification [D-8] (contract §9.4): SCORED — the identity fields;
  `step_presented`; every `align_attempt` field; `step_aligned`;
  `channel_held.held_at_ms`; `channel_released.released_at_ms`;
  `cue_presented` (`presented_at_ms`, `page_visible`, `page_focused`);
  `cue_notice_ended.ended_at_ms`; `channel_aligned`; `project_completed`;
  `project_closed`; `closed_unopened`; the kit's `technical_failure` and
  `window_closed`; `opportunity_opened`; `presented`; `prior_load_checked`.
  DESCRIPTIVE (flags only, never the value or the disposition) —
  `input_mode`, latencies, clocks, `deferred_ms`, `displayed_ms`,
  `ended_reason`, `focus_lost_during_display`, the distance, `cell_changed`,
  `align_refused`, `held_visit`, `released_visit`, `cue_cancelled`,
  `console_*`, `help_consulted`, `after_cue`, `in_silent_window`,
  `outdoor_*`.
- Integrity rules S1–S7 [D-8] (a violation ⇒ null `technical_failure` with
  `integrity_defect`): **S1** identity — versions, the opportunity id, the
  entry snapshot; **S2** order — usable, unique sequences; **S3** channels
  and absence — without an opening only `presented`, `closed_unopened` (at
  most one, after `presented`), the absence `window_closed`,
  `prior_load_checked` and `outdoor_*` are legitimate (E2d), no
  `closed_unopened` with an opening (E2e), known channels, B's first step
  only after A's hold (E43), steps in order with `resumed: true` repeating
  the current step, no scored record before the opening; **S4** attempts —
  consecutive indices per channel, on the presented step, stored results
  equal the content rule (E25), no executed all-1 vector and none repeating
  the step's last executed vector (E30, E30b), no attempt on a held channel
  before its `channel_released` (E23), none after `channel_aligned` or the
  terminal record, `step_aligned` immediately after its aligned attempt;
  **S5** hold — exactly one `channel_held` per channel iff step 2 was
  aligned, immediately after it (E27b); **S6** release, notice and timing —
  at most one `channel_released` per channel, after its hold, with
  `released_at_ms = held_at_ms + 30000` (E56); at most one `cue_presented`
  per channel, after its release, visible and focused (E28), with
  `presented_at_ms ≥ released_at_ms + 30000` (E37); NO `cue_presented` for a
  channel with an executed ALIGN after its release or one already aligned
  (E54); at most one `cue_notice_ended` per notice, `≥ presented`; B only
  after A's notice end with ≥ 8 000 ms (E38) and never while A's notice is
  due and undelivered (E57); a notice for a channel without a hold or
  release voids (E24); **S7** closure — at most one terminal record, nothing
  scored after it except the kit's `window_closed` (a notice end after it:
  E45), `project_completed` only when both channels are aligned,
  `channel_aligned` after six steps, the closure snapshot equal to the
  recount. Descriptive inconsistencies set a named flag only.

(3) The build (after parts (0)–(2); 14 October 2026). Four new modules under
`src/pilot/windows/`: `m20FeedContent.ts` (pure: the ids and versions —
family `proto_m20_feed_`, opportunity `proto_m20_feed_project`, window
`m20_feed_w1`, `entry_state_version` `m20-feed-returns-v2`, form
`m20-form-1`, content `m20-content-v2`, object and surface
`m20_feed_console`; the two channel definitions with their targets, the
cell counts 3, 3, 4, 4, 5, 5, the loading value, the hold after step 2, the
constants 30 000 / 30 000 / 6 000 / 8 000 / 400 / 250 ms; the content rule
`m20Differ` / `m20Aligned` / `m20SameCells` / `m20AsLoaded`; every
participant string of preview §4 as `M20_TEXT` and
`m20ParticipantStrings()` for the wording audit), `m20FeedModel.ts` (pure:
the project state machine — the card, the steps, cell edits, ALIGN through
the content rule with the four refusals `as_loaded` / `repeat` / `settling`
/ `held`, the hold at the second aligned step, the SILENT release written by
`m20sWriteDueReleases` with its context `tick` / `resume` / `open` /
`shift_end` / `review` / `fault` before any work, view, notice or closure of
the channel, the spontaneous resumption (the first executed ALIGN after the
release and before the notice; `cue_cancelled` written after the align
chain), the notice delivery and ordering in `m20sCueCheck` (A before B; B
not before A's actual end + 8 000 ms; deferred while blocked, the deferral
recorded), the notice end in `m20sEndCue` with the reasons `timeout` /
`surface_opened` / `prompt_opened` / `shutdown` / `project_closed` /
`technical_failure`, the cued credit (the first executed ALIGN after the
notice), the channel view, help, leaving, the settle on every view, the
closures `m20sCloseAtShiftEnd` / `m20sCloseAtReview` / `m20sCloseUnopened`,
the fault `m20sFail`, the hold-back `m20sHoldBack`; the entry snapshot,
`m20PriorLoadCheck`, the closure snapshot `m20ClosureSnapshot` with the
per-channel records and `spontaneous_resumptions`; one work `FocusedClock`
per channel, a release-to-spontaneous `FocusedClock` per release and a
cue-to-credit accumulator counting console-closed time; `m20ChipText`
(counts only), `m20NoticeLines`, `m20WorkSignature`; a `step_shown` flag so
that CONTINUE after a hold presents the next step fresh (`resumed: false`)
while a step left in work returns `resumed: true`), `m20FeedConsole.ts`
(the adapter: `m20Window()` — the `ItemWindow` of the opportunity —, the
sink with the protocol stamp, `guarded()` turning a thrown error into
`m20TechnicalFailure` (the kit log plus `markOpportunityInvalid`),
`declareM20Feed`, `guardM20Reload`, `presentM20`, `openM20`, the surface
commands, `m20ConsumesEsc` (help before the console), `closeM20Surface`,
`resumeM20Surface`, `m20CueCheck`, `m20CueEnded`, `m20ActiveNotice`,
`closeM20AtShiftEnd`, `closeM20AtReview`, `bindM20Surface`, `m20ChipText`,
`m20OtherWorkSignature` (executed ALIGNs plus aligned steps — the M04
other-work signature, §5 table above), the yard's outdoor preparation
`presentM20MastBrief` / `acceptM20Mast` / `doM20MastStage` /
`m20OutdoorFault` (logged as `outdoor_*` through the kit log, never
counted; the mission-log entry `m20_feed_outdoor` closed at `return_hub`),
the DEV probe `window.__m20FeedProbe` (`publishM20Probe`) and
`resetM20State`), and `m20SurfaceModel.ts` (the wide frame: the card
`intro` with CONTINUE, the step board `board_<l>_<k>` with the cell tiles
`cell_<l>_<k>_<i>` and `align_<l>_<k>`, the hold view `held_<l>` with
`start_b`, the channel view `rows` with `continue_a` / `continue_b`, the
help sheet `help_sheet` / `close_help`, the record `closed` /
`leave_record`, HELP `help_<view>` and LEAVE `leave_<view>` on every
working view, the bottom row at y 462, 16 px design text). The feature
extractor `src/measurement/features/m20.ts` (registered by
`features/index.ts`): `m20_cued_resumptions` recounted read-only from the
current load's `proto_m20_feed_` events, the rules S1–S7, the dispositions
of contract §3.8, the components (`difficulty_established: false`,
`spontaneous_resumptions`, `project_closure_reason`, the per-channel
outcomes `resumed` / `not_resumed` / `resumed_spontaneously` /
`cue_not_presented` / `censored_review` / `excluded_technical_failure` /
`begun_not_held` / `not_begun`), a post-closure fault as a flag only.
`registerV3.ts` M20: `route_version` `v3`, `implementation_status`
`implemented`, `coverage_label` `exploratory`, the comment. Changed
scenes: `RecordsWorkshopScene.ts` — the return-shift `create` calls
`declareM20Feed`, `guardM20Reload`, `presentM20`; the two-line notice band
(`m20Band`, origin 0.5 / 1 at design y 584, wrap width 768, a 16 px margin;
the DEV probe `window.__m20BandProbe`); the release / due check
`runM20Check` every 250 ms and on RESUME (blocked while no physical input is
eligible or input is locked; the distance to the console passed for the
record); `endM20Notice` on a surface opening (`surface_opened`), a prompt
(`prompt_opened`) and the scene shutdown (`shutdown`); the Station Feed
Console station opens the wide surface through `openM20` /
`m20SurfaceModel` / `m20ConsumesEsc` / `closeM20Surface` with the
other-work watcher; the console guided at return-shift order 1 until
`m20Window().windowStatus() !== 'unopened'`; the chip and the prompt
fallback from `m20ChipText`; the sign-off calls `closeM20AtShiftEnd` before
`advancePilotStage`; the legacy return-surface case removed.
`ExteriorRecoveryYardScene.ts` — the Mast 04 brief, acceptance and stages
go through the adapter's outdoor functions; the guard routes an `M20` fault
to `m20OutdoorFault`. `exteriorWindows.ts` — the four legacy M20 hooks
(the declaration, the departure, the interruption, the review block)
removed with their imports; the eight `setComprehension('passed')`
assertions kept (U8-12 unchanged). `reviewClosure.ts` — `closeM20AtReview`
after `closeM20ResumeAtReview`.

(4) Events, closures and the legacy disposition as built. Thirty suffixes
under `proto_m20_feed_` (`M20_EVENT_SUFFIXES`; all provisional
candidates): `presented`, `opportunity_opened`, `intro_acknowledged`,
`console_reopened`, `console_left`, `held_visit`, `released_visit`,
`prior_load_checked`, `closed_unopened`, `channel_started`,
`step_presented`, `cell_changed`, `align_refused`, `align_attempt`,
`step_aligned`, `channel_held`, `channel_released`, `cue_presented`,
`cue_notice_ended`, `cue_cancelled`, `help_consulted`, `channel_aligned`,
`project_completed`, `project_closed`, `technical_failure`,
`window_closed`, and the never-counted `outdoor_brief_presented`,
`outdoor_accepted`, `outdoor_stage_completed`,
`outdoor_technical_failure`. The closure reasons are `completed`,
`shift_signed_off`, `closed_at_review` and `technical_failure`; a
reload after the administration holds the console back with the detail
`reload after administration: console not re-run`. The release is written
at exactly `held_at_ms + 30 000` whatever check finds it due (its
`context` is descriptive). A resumption of either kind never writes a new
hold, release, notice, channel start, opening or occasion; opening,
CONTINUE, a cell edit and a refused ALIGN are never resumptions. The v2
family `proto_m20_antenna_*` keeps its frozen meaning in the ledger and is
read by no extractor (`exteriorWindows.ts` no longer writes it). Nothing
canonical was promoted; `docs/research/event-schema.md` and
`docs/research/scoring-plan.md` are untouched.

(5) Verification evidence (14 October 2026). Development runs by the
writers — Fable 5.1 (`claude-fable-5-1`) until the owner's model change,
then Opus 5.5 (`claude-opus-5-5`) — are recorded in the UNIT-LOG "U22
results". The final matrix of contract §12 was run once, on an unchanged
tree (digest: HEAD `f391d2e6934a22915a580ee128db3af6c5226c12`, SHA-256
`0f3820c34368867ac7b4dc40e084efe2c6c8da98931d7bbb3c47c9d70a92cba2` over
`git diff f391d2e` and the seven untracked files, identical before and
after), by the test-reviewer — a general-purpose agent with the model
override `sonnet`, reporting `claude-sonnet-5-5`: `tsc` 0, `build` 0,
ESLint 0, prettier 1 (the matrix and the UNIT-LOG only, both failing at
the base), `git diff --check` clean, `verify-unit` PASS (exit 0, no FAIL
line), P1 118 / 118, P2 202 passed and 2 failed (M08 / M11 line 146; U8-12
line 405, received length 8 — both the same on the untouched export of
`f391d2e`), B1 10 / 10 (R1–R8 with R4b and both R7 fonts), B2: `pilot_yard`
3 / 3, `pilot_exterior_isolation` 2 / 2, `m03_m04_route` "both presses" 1 /
1, `m21_cases_route` and `m22_setbacks_route` 2 / 2, `pilot_return` 1 / 3
(test 2: line 947, M21 `pending` — the same on the base; test 1: line 230
`'1.4 bar'` — the same step fails on the base — and, on the repeat, line
691, M25 `pending` — a line the base never reached), `pilot_route`
"six-zone" failed with the base's thirteen offending types plus
`proto_m20_feed_closed_unopened` only (the item-11 classification: a
FAILURE, not commit-blocking). Thirty-five frames (the thirty-one of §13
plus 01b, 14b, 19b, 25b) in `.playwright-mcp/u22-evidence`, inspected and
copied to the session scratchpad; none committed.

(6) Reviews, findings and the unit's state. Three read-only reviews after
the matrix, each a general-purpose agent with the model override `opus`
that read its role file and reported `claude-opus-5-5`: scientific,
gameplay and visual. Both the scientific and the gameplay reviewer found,
independently, that while the console stays open the Workshop scene is
paused (`openWorkSurface`), so neither the 250 ms check nor any console
command writes a due release: the channel view that follows the other
channel's sixth step can show a due channel as `held` before its release is
written (contract §3.3 item 4 and §10 require the release "whatever the
context (console open, …)", before any view of the channel), and a
participant who stays in the console past a channel's due time cannot see
or work it until leaving and reopening — often losing the silent window,
since a notice already due is delivered the moment the console closes. Every
remedy shows `pass open` inside an open console, which preview §4.6 rules
out ("The console shows `pass open` only when opened"); the contract and the
preview disagree on this case and it touches the silent-release selection
(contract §14), so it is an owner-reserved exception: the part was stopped,
no correction round was applied, and the unit was NOT committed (§5.358).
The owner then ruled the same day (§5.359, the superseded expectations
§5.360); correction round 1 is recorded in (8).
The other findings, all open for the owner, are listed in §5.358. Defaults
exercised: §5.345–§5.356 as recorded; no deviation from the D-U22-1
selections was made.

(7) Limitations (stated, not resolved; preview §9 and this build). The
measure is exploratory and provisional (item 13): it samples re-engagement
with a suspended, attention-demanding copying channel — first
spontaneously in a silent window, then after a specific notice — and
longer remaining copying is not established difficulty
(`difficulty_established: false`); its relation to MPS Appendix A 2 needs
empirical evaluation. The cued outcome is selected: it describes channels
not resumed before their notice, is conditional on no spontaneous
resumption, and is no ranking across all participants — the promptest
participants leave the cued denominator, and two spontaneous resumptions
give a null primary with denominator 0 (E47); the spontaneous count, the
per-channel outcomes and the eligibility are to be reported together, never
combined. The silent windows are unequal: a deferred notice (a surface
open, the participant outside the Workshop) lengthens the window and the
chance of a spontaneous resumption (`cue_deferred_ms`,
`release_to_spontaneous_*` are exported to examine this). A spontaneous
resumption requires the participant to open the console on their own and
find the channel `pass open`; the card and help say that a pass opens later
and that a notice follows — demand information identical for all. The
explicit notice may push the cued count towards a ceiling. Two channels of
one project in a fixed order, one room and one shift are clustered; A's
outcome may change B's. Never-openers, participants who stop before a hold
and those who sign off within about 60 s of a hold are excluded from the
cued count. Cross-item spill-over (M07's bench, the board's "Anything you
left open earlier…"), the outdoor preparation and attractive alternative
jobs are uncontrolled. The browser evidence does not fault the console (no
fault injection on the route), so the fault record of §5.356 is shown by
the pure spec only; the browser cannot show the console reached within the
6 s of A's notice on the keyboard route (the console is too far from the
relay bench; the pointer route shows it). The capture specs are not updated
(U24, §5.357). No source validates the count; passing tests establish
implementation correctness only, never validity, reliability, persistence
as a trait or questionnaire equivalence.

(8) Correction rounds (14–15 October 2026; the owner's amendment §5.359,
the superseded expectations §5.360, the defaults §5.361; the UNIT-LOG "U22
correction round 1" has the full record). Round 1 implemented the seven
rulings: due releases reconciled while the console is open
(`check: 'console'`), the hold and channel views showing current
availability, CHANNELS [C], the released hold view with its CONTINUE, the
"Last ALIGN" line, state-dependent statuses and footers, ESC equal to LEAVE
inside the settle, the notice in the top strip right of the mission card,
the chip on the console's face, void rows without a spontaneous count or
channel outcome, a fault after a final result changing nothing scored, the
reworded register texts and the one-time hold sentence; the test-reviewer
(Sonnet 5.5) verified the corrected source (`tsc`, build, ESLint 0; P1
130 / 130; B1 12 / 12 including the new R10 and R11; `m03_m04_route "both
presses"` and `m21_cases_route` / `m22_setbacks_route` passed; the P2
gates, the `pilot_return` M21 / M25 lines and the six-zone item-11 case
failed exactly as classified against the base), and the three Opus 5.5
confirmations found nothing in their domains that blocks the commit. Round
2 made the scientific confirmation's N2 conform to §5.359 (3): on a void
row `fault_after_final_result` is null and its recount sits under
`invalid_diagnostic`. Remaining, non-blocking and stated for the owner:
the extractor does not check that a view or closure follows the release
(F5; the producer guarantees the order); a hold or channel view turning
"pass open" inside an open console may act as a weak in-console cue before
an ALIGN that counts as spontaneous, and neither the release record nor
CHANNELS records the view on screen (N1); a quick double ESC now closes
help and leaves the console, adding a visit if a channel is released; the
card line "The console shows when a channel's pass is open again." holds
on the hold and channel views, not on another channel's step view; the
lone LEAVE, the card's line breaks and the pre-existing M21 chip; the
success / failure colour (U24).

**Unit 21 (M19): as-built** — the two coupling lines at the Exterior Recovery
Yard coupling panel (bounded unit under contract `U21-CONTRACT.md`, v2 of 13
October 2026, amending v1 of the same day; research-owner decision D-U21-1).
**Status: technical implementation of the approved row under research-owner
decision D-U21-1 (APPROVED 13 October 2026, against preview revision r2);
`m19_continuations` is a candidate indicator and NOT scientifically
validated.** The two lines are distinct, independently designed content inside
ONE yard visit and ONE panel — clustered observations, never two independent
situations; the lines are not equated in difficulty; who meets an obstacle
depends on how the participant searches (under Option B eligibility is
selected); a count of 2 shows only that on each line, after the participant's
own TRYs had established the line's designed obstacle, at least one more new
setting was executed; restoring a line, its number of TRYs, help, leaving,
returning and time are companions, never part of the value; no global or
cross-item score. Passing tests establish implementation correctness only,
never psychometric validity, reliability, persistence as a trait or
questionnaire equivalence. Parts (0)–(2) below were written BEFORE the content
module, the series model, the adapter, the surface model and the extractor
(the contract's "specify before you code"); parts (3)–(7) record the build and
its evidence.

(0) Authority. **Research-owner decision D-U21-1 — APPROVED 13 October 2026**
(an owner ruling, recorded in §5.328; not an implementer default and not
reopened): items 1–9 of preview §3 as RECOMMENDED — line 1 HEATER BANK (three
heaters of 1, 2 and 4 units, FEED SINGLE or DOUBLE; key H1 + H3 with FEED
DOUBLE) and line 2 PRESSURE TRIM (dial 1–9 and a bypass; key dial 5, bypass
OPEN) with every string of preview §4 (`m19-content-v2`, form `m19-form-1`)
(item 1); Option B — a line's first difficulty boundary is the TRY of its
listed evidence settings that completes its designed obstacle (line 1 the
all-ON SINGLE TRY; line 2 the later of dial 4 SHUT and dial 5 SHUT), inferred
routes never establishing it, recorded once per line as an immutable record
(item 2); nothing on screen at the boundary — the truthful reading and the TRY
list, TRY and SET ASIDE available throughout, no time limit, SET ASIDE never
showing a solution (item 3); a further executed TRY after leaving and
returning qualifies, flagged `continued_after_leaving` (item 4); the check
outcomes kept apart — `fail` ⇒ `understanding_failed`, `not_completed` and
`not_reached` ⇒ `no_eligible_event`, a panel presented and never opened ⇒
`no_eligible_event` (`not_opened`), never `declined`; both lines administered
whatever the check status (item 5); fixed order, one form, line 2 only after
line 1 is finished through the same neutral view, a finished line never
reopening (item 6); an eligible line without a further TRY: SET ASIDE or the
participant's own end of the outside work ⇒ 0 in the denominator (finish
kinds kept apart), the station-record review ⇒ censored and excluded (item
7); null `pending` until BOTH lines are finished or the panel is closed, then
stable (item 8); a runtime fault line-scoped — the line in work excluded even
when a further TRY after its boundary was already recorded (its record,
boundary and TRYs kept in the components; `censored: true`, the reason named),
lines finished earlier keeping their outcome, a fault with no line in work
excluding nothing but closing the series, no eligible line left ⇒ null
`technical_failure` (`technical_only`), never a non-response disposition, a
recorded `fail` check staying `understanding_failed`, malformed or
contradictory scored evidence voiding the whole row (item 9). Settled
consequences [A]: at most one credit per line; only an executed TRY of a new
complete setting is a work attempt (help, menu navigation, reopening, elapsed
time, setting changes without TRY, refused TRYs, a cancelled SET ASIDE and the
restoring itself never qualify); no cue draws the participant back to an
unfinished line (M20's cued returns stay out of M19); a reload exports only
current-load evidence. All events and features remain provisional; no
canonical promotion, combined score or scientific-validity claim. The approved
row is §2 (M19), §2b, §5 item 2 "Completeness labelling", the matrix row,
addendum §1 and §3 and `registerV3.ts` (entry `M19`). Provenance limit: the
original owner documents are not on disk and were not searched for again; the
decision is an explicit decision for this implementation, not recovered
wording. Rulings D-U16-1 through D-U20-1 and the U20 closeout of 13 October
2026 are precedent only and approve nothing here. Each rule below carries its
source: [O-n] decision D-U21-1 item n, [A] approved row or owner instruction,
[P] recorded precedent, [D-n] implementer default (§5.329 onward).

(1) Administration `m19-lines-v2` — **specified before the content module, the
series model and the interface were written.**

- Place and access [A][O-5][P][D-10]: the coupling station of the Exterior
  Recovery Yard (`YARD_SITES.coupling`, label "Frozen Coolant Coupling",
  registry `yard.coupling`, Noor's list and the beacon order unchanged) opens
  the generic `WorkSurfaceScene` in the WIDE frame of decision D-U17-2
  (unchanged) with surface id `m19_coupling_panel`; operational label "Valve
  coupling (Yard)", episode 4. Optional; no gate, reward or route consequence;
  non-use is never read as refusal. Noor's briefing factory `ready` (the one
  closure behind every "Ready" option) calls `presentM19(now)` beside
  `presentM08(now)` — briefing exposure only (the kit's `presented`), never an
  opening. The first opening calls `dismissExteriorSite('coupling')` (guidance
  only) and the station's `isDone` reads the new window
  (`m19Window.windowStatus() !== 'unopened'`), so neither the beacon nor the
  objective line points back to the coupling after the first opening; no chip,
  NPC line or reminder names an unfinished line; the world chip reads
  `COUPLING PANEL`, the painted dial shows its static arc with no progress
  needle and the frost sheet stays hidden — a neutral state, never an
  unfinished or evaluative one. The stage at the first opening is recorded in
  the entry snapshot. The legacy coupling `src/pilot/exterior/m19CouplingModel.ts`
  and its adapter functions inside `exteriorWindows.ts` stay in the tree
  UNCHANGED under their frozen v2 identity (`proto_m19_progressive_valve`,
  `proto_m19_valve_*`, `m19_valve_w1`, `m19-coupling-v1`); the yard scene no
  longer imports or calls them; in `exteriorWindows.ts` only `w.m19.declare();`
  leaves `declareExteriorWindows()` and the entry
  `[w.m19, 'coupling never worked before the review']` leaves the review-absent
  loop of `closeExteriorWindowsAtReview`, so no legacy M19 opportunity is
  declared, offered or closed on the route; the file keeps exactly 8
  `setComprehension('passed')` occurrences; the v3 extractor never reads the
  legacy family; the registry's descriptive `opens` / window label for
  `yard.coupling` stay stale (U24 backlog).
- Content, order and form [O-1][O-6]: the content exactly as preview §4 in
  one pure content module (`m19LinesContent.ts`): the card (ten fixed lines),
  the check (two questions of three option tiles each, the keys option 2 of
  question 1 and option 3 of question 2, the four-line explanation), both
  sheets (six fixed lines each), the controls, readouts, TRY rows, readings,
  refusals, dialogs, finished views, help (eight lines), closed records,
  footers and statuses; and, as data, each line's settings, value rule, target
  and obstacle rule — line 1, value = (1·H1 + 2·H2 + 4·H3) × (FEED DOUBLE ? 2
  : 1) against 10, obstacle = the all-ON SINGLE setting has been executed; line
  2, value = 2 × dial − (bypass OPEN ? 1 : 0) against 9, obstacle = dial 4
  SHUT and dial 5 SHUT have both been executed; reading LOW below the target,
  OK at it, HIGH above it. Versions `m19-lines-v2` (administration),
  `m19-form-1` (form), `m19-content-v2` (content). Line breaks are the
  preview's (fixed); wording, numbers, order and option order never change; no
  questionnaire wording anywhere. One form; line order fixed (`m19_l1` →
  `m19_l2`); option order fixed; starting settings line 1 all heaters OFF with
  FEED SINGLE, line 2 dial 1 with the bypass SHUT (both read LOW). Limitation
  documented: content and position are confounded; line 1 may teach the use
  of a second control and change line 2's eligibility.
- First opening, the card [D-2]: the card (title `COOLANT COUPLING`, subtitle
  `Two lines`, status `Read the card, then CONTINUE.`, the ten lines) with
  CONTINUE (the primary control, no hidden key), HELP and LEAVE; activating
  CONTINUE is recorded (`intro_acknowledged`) and presents the check
  (`check_presented`, `m19_chk_q1`, attempt 1); leaving before it shows the
  card again at the next opening.
- The panel check [O-5][D-3][D-4]: subtitle `Panel check`, status
  `One short check of how the panel works.`; question 1
  `After a TRY, the line is not restored. What can you do next?` with the
  three option tiles `[1]`–`[3]` in the preview's order (key option 2); a tile
  (pointer, ENTER / SPACE on focus, or 1–3) drafts the option, another
  replaces it, the same again clears it, each change logged
  (`option_drafted`, `option_id` or null); `RECORD ANSWER  [R]` records the
  drafted option once (`check_answered`: `check_id`, `attempt` 1, `option_id`,
  `correct`); without a draft the neutral line `Choose an answer first.` and
  nothing recorded. Right ⇒ `check_recorded` with `status` `pass_first`.
  Wrong ⇒ the explanation view (`explanation_shown`; the four lines; CONTINUE,
  HELP, LEAVE), then question 2
  `A TRY has just left a line not restored. Which is true?` (`check_presented`
  attempt 2; key option 3); right ⇒ `check_recorded` `pass_after_explanation`;
  wrong ⇒ `check_recorded` `fail`. Then, identical for every status, the line
  `Check recorded. Line 1 is ready.` with `START LINE 1` (presents line 1),
  HELP and LEAVE. No correctness is shown anywhere. Each answer is recorded
  once and is immutable; leaving keeps the draft and the stage. `check_status`
  is one of `pass_first`, `pass_after_explanation`, `fail`, `not_completed` (a
  question was shown and the panel closed before an answer was recorded) or
  `not_reached` (the panel closed at the card) — never merged. The kit's
  comprehension state follows the record (`pending` from the opening,
  `passed` on a pass, `failed` on a fail); a failed check never invalidates
  the kit window, since both lines are still administered [O-5].
- A line: view and controls [O-1][O-3][D-11]: subtitle `Line N of 2`, status
  `Working on line N of 2.`; left the sheet (six lines) and the TRY list
  (header `TRIES (newest last)`, `No TRY yet.` before any TRY, rows
  `TRY n  <setting>   <reading>`; with more than nine rows the line
  `… k earlier TRYs not shown` above the newest eight); right the readout (a
  neutral landing; line 1 `ON: none · FEED SINGLE` and the like, line 2
  `DIAL 1 · BYPASS SHUT` and the like), the setting controls (line 1 the
  tiles `H1  [1]`, `H2  [2]`, `H3  [3]` — an ON heater shown as selected,
  with a marker glyph beside the colour — and `FEED  [4]`; line 2
  `DIAL DOWN  [1]`, `DIAL UP  [2]`, `BYPASS  [3]`), `TRY  [T]` and
  `SET ASIDE  [N]`; bottom `HELP  [H]` and `LEAVE  [ESC]`. Setting controls
  change only the draft setting (`setting_changed` with `control` and
  `setting_after`, descriptive); they never run the line; at a dial limit the
  line `The dial is at 9.` / `The dial is at 1.`, nothing changes and nothing
  is logged. Every setting is complete; the draft survives leaving [D-3].
- TRY evaluation and refusals [O-2][A][D-4]: TRY (T, the button, or ENTER /
  SPACE on its focus) is refused and not run — `try_refused` with `reason`
  `already_tried` (the feedback line
  `That setting was tried at TRY k; it is not run again.`) or `settling` (a
  press inside 400 ms after the current view appeared; no feedback) — when
  the setting equals any earlier executed setting of this line or falls
  inside the settle; otherwise it is EXECUTED: `attempt` (`attempt_index`
  1..n consecutive per line, `setting`, `reading` from the content rule,
  `restored` = reading OK, `after_boundary`, `since_boundary_focused_ms`) and
  the feedback line `TRY n: the gauge reads <R>. Line N is not restored.` /
  `… reads OK. Line N is restored.`; the setting stays as it was for editing.
  A double click on TRY executes at most one attempt (the second press is
  `already_tried` or settling); nothing is rigged — a TRY of the key always
  restores the line, from the first TRY onward; no forced failure, deceptive
  feedback, adaptive difficulty or required number of retries.
- The obstacle boundary [O-2][O-3]: the first executed attempt after which the
  line's executed settings include ALL of its listed evidence settings (line
  1 the all-ON SINGLE setting; line 2 dial 4 SHUT and dial 5 SHUT, in either
  order) is followed IMMEDIATELY — in the same handler, before any other event
  — by `difficulty_boundary` (`line_id`, that attempt's `attempt_index` and
  `attempt_sequence`, `rule` `designed_obstacle`,
  `evidence_attempt_indices`: the attempts that satisfy the rule),
  `input_mode: 'system'` — once per line, never moved, repeated or removed; a
  line restored without meeting its obstacle has none; any other route by
  which the obstacle could be inferred does not establish it. Nothing else
  happens at the boundary: no prompt, marker, colour, sound or change of
  controls.
- Continuation [A][O-4]: a qualifying continuation is a further executed TRY
  of a new setting on that line after its boundary and before the line is
  finished, credited once per line whichever control it changed (changing the
  second control — FEED DOUBLE on line 1, BYPASS OPEN on line 2 — is a
  companion); after leaving and returning it qualifies, flagged
  `continued_after_leaving: true`. Setting changes without TRY, refused TRYs,
  help, leaving, reopening, a cancelled SET ASIDE, elapsed time and the
  restoring itself never qualify.
- SET ASIDE [O-3][O-7][D-4]: SET ASIDE (N or the button) opens its
  confirmation (`set_aside_requested`): the three dialog lines of preview §4.8
  (`Set line N aside?` / `It finishes as it is and stays finished.` /
  `Line 2 comes next.` or `It is the last line.`), `SET ASIDE  [ENTER]` first
  in focus and `BACK  [ESC]`, footer `ENTER set aside · ESC back`; the dialog
  controls sit at panel (200, 250) and (466, 250), never at the opener's
  position (every opener at x ≥ 738), so a double click on SET ASIDE opens one
  dialog and records nothing further. Only the confirm — a fresh press at
  least 400 ms after the dialog appeared — finishes the line (`line_finished`,
  finish `set_aside`); an earlier confirm press is refused and not logged
  (M16 / M18 precedent); BACK or ESC cancels (`set_aside_cancelled`, reason
  `back`; refused inside the dialog's 400 ms, the dialog staying) changing
  nothing; leaving with the dialog open cancels it (reason `panel_left`). SET
  ASIDE never shows or hints at the solution.
- Finished views, NEXT LINE, FINISH, the final record [O-6][D-11]: a line
  restored (the attempt that reads OK) or set aside is finished immediately
  (`line_finished` with its companions) and shows its finished view — the
  sheet and the TRY list read-only, the landing `Line N finished: restored.`
  / `Line N finished: set aside.`, status `1 of 2 lines finished.`,
  `NEXT LINE` (presents line 2: `line_presented`), HELP and LEAVE; after line
  2 the landing carries `Line 2 finished: <how>.` and, on its second line,
  `Both lines finished.`, status `2 of 2 lines finished.`, `FINISH` (closes
  the panel), HELP and LEAVE; `series_completed` with the closure snapshot and
  the kit's `window_closed` (`exit_state` `completed`) are written at line 2's
  finish, so the row is final whether or not FINISH is pressed. A finished
  line never reopens and accepts nothing. Reopening afterwards shows
  `Both lines are finished. The panel takes no further settings.` with
  `LEAVE  [ESC]` (footer `ESC leave`); nothing is written.
- Help [D-5]: HELP (H or the button) on the card, the check views, the
  explanation, the recorded line, every line view and the finished views —
  never inside a dialog; the sheet `PANEL HELP` with the eight lines,
  `CLOSE HELP  [H]` first in focus, footer `H or ESC close help`; logged
  (`help_consulted`, `view`); CLOSE HELP (H, ESC or the button) restores the
  same view with everything kept and re-arms its settle. Help is never a
  continuation and never pauses the line's clock.
- Leaving and returning; commitment mechanics [P][D-2][D-3][D-4]: ESC
  closes, in order, an open dialog, the help sheet, then the panel; LEAVE and
  ESC take the SAME path (`panel_left` with the `view`, the kit window
  paused, the line's clock paused with cause `surface_closed`, the surface
  closed); `closeM19Surface` runs from the surface's `onClose` (before the
  yard resumes) and from the LEAVE control's host close, never only from
  `onClosed`. Walking away with the panel closed changes nothing. Leaving
  keeps everything (card, check draft and stage, line, draft setting, TRY
  list). Returning (`series_reopened` with the `view`) presents nothing again
  and never records an attempt; the kit window and the clock resume. Settle on
  EVERY view transition (the card, the check questions, the explanation, the
  recorded line, each line view, the finished views, the help sheet, the view
  restored by CLOSE HELP or BACK, a dialog, a reopened view): a press inside
  400 ms after the view appeared changes nothing — a TRY inside it is a
  `try_refused` `settling`, other presses are dropped and not logged; a
  carried ESC inside the settle is consumed and leaves nothing. Held keys and
  auto-repeat never act (dropped by `WorkSurfaceScene`). Every view lands on
  a NEUTRAL focus — a non-acting text landing: the card text, the check
  question, the explanation, the recorded line, the readout, the finished
  line, the closed record (the M15 / M16 / M18 mechanism) — so ENTER does
  nothing until TAB or a hotkey moves focus; in a dialog the confirm control
  is first in focus, on the help sheet CLOSE HELP. No movement key (W, A, S,
  D, arrows) and not E is a hotkey on the panel. While a dialog or the help
  sheet is open only that dialog or sheet acts.
- Shift end [O-7][D-6]: `finishOutside()` calls `closeM19AtShiftEnd(now)`
  beside `endExteriorShift(now)` and `closeM08AtShiftEnd(now)` (the card and
  help say `Telling Noor you are finished outside closes the panel as it is.`).
  (a) An OPENED, unfinished series: each presented, unfinished line gets
  `line_finished` with finish `shift_ended`, then `series_closed`
  (`closure_reason` `shift_ended`, the closure snapshot) and the kit's
  `window_closed` (`exit_state` `stopped` — a completed observation, the
  exterior precedent); the check and card states stand. (b) A PRESENTED,
  NEVER-OPENED panel: one family event `closed_unopened` (`closure_reason`
  `shift_ended`, `input_mode: 'system'`) — raw evidence that the opportunity
  ended without an opening; no `opportunity_opened`, no decline and no
  response is written; the kit window stays unopened until the review records
  its absence. (c) Not presented: nothing. In (a) and (b) the panel afterwards
  shows `The coupling panel closed when the outside work ended.` with LEAVE
  and accepts nothing. A completed series is not reclosed; a finish by the
  shift end adds no focused time (the clock was paused at LEAVE).
- Review closure [P][O-7]: `reviewClosure.ts` calls `closeM19AtReview(nowMs)`
  beside the exterior closure. An opened series still unfinished (reachable
  only when the shift-end closure did not run) closes with line finishes
  `closed_at_review`, `series_closed` (`closure_reason` `closed_at_review`)
  and the kit's `window_closed` (`exit_state` `closed_at_review`, register
  `censored`); a never-opened panel is recorded absent with the kit's
  `markAbsent` (`presented_not_opened` / `not_presented_not_opened`) and —
  when no `closed_unopened` exists yet — `closed_unopened`
  (`closed_at_review`); a closed or completed series is untouched. The panel
  afterwards shows `The coupling panel was closed at the station review.` with
  LEAVE.
- Reload [P][D-8]: an opening of this administration in an earlier page load
  of this identity ⇒ the hold-back: `prior_load_checked` once per later load at
  the first `guardM19Reload()` run (yard `create()`), then the kit's prior
  exposure note and the kit's `technical_failure` with the detail
  `reload after administration: panel not re-run`; the panel shows
  `This panel was opened earlier in the session. It stays closed now.` with
  LEAVE; the series technically incomplete; the earlier events immutable in
  `prior_page_load_events`; the row `interrupted`. A panel never opened before
  the reload runs normally — also when it was presented only before the
  reload (the briefing is not replayed; the lifecycle keys on the current-load
  opening; `presented_in_current_load: false`). Limitations as §5.290 (a).
- Faults [O-9][D-13]: every surface command runs guarded; a thrown fault
  while a line is in work finishes that line (`line_finished`, finish
  `technical_failure`), closes the series (`closure_reason`
  `technical_failure`), writes the kit-shaped family record
  `technical_failure` (`detail`, `line_id`, `line_index`, `phase` `closure`,
  `input_mode: 'system'`) and marks the opportunity `technical_failure` in
  the validity register; the faulted line is excluded from the value even when
  a continuation was already recorded on it (its boundary and attempts stay
  in the log; case E21), lines finished earlier keep their records and
  outcomes, the yard stays usable and no dialog stays stuck (the panel shows
  the record view with LEAVE; the surface closes on ESC or LEAVE). A fault
  with no line in work (card, check, between the lines): the same record with
  `line_id` null; no line record changes. A fault after completion or closure
  is recorded (`phase` `closure`) without touching the scored evidence.
- Clock policy [D-12] (companions only; never a value): one `FocusedClock`
  per line, started at `line_presented`, stopped at the line's finish. Pause
  causes: `surface_closed` while the panel is closed (LEAVE, ESC, walking
  away, leaving the yard), `focus_loss` / `hidden` from `focusMonitor`. The
  help sheet and dialogs do NOT pause the clock. The yard scene's own PAUSE /
  RESUME events never start, pause or resume the M19 clock or the kit window:
  only the panel's own open / close do; `resumeM19Surface` resumes the kit
  window only while the M19 surface is open. A finish by the shift end, the
  review, a fault or a reload adds nothing. Recorded per line on
  `line_finished`: `line_focused_ms`, `boundary_to_next_try_focused_ms`
  (null without a further TRY), `boundary_to_finish_focused_ms` (null without
  a boundary); on each attempt `since_boundary_focused_ms` (null before the
  boundary); the kit window's `active_ms` follows the same pause rule.
- Layout [D-11] (inside contract §3.9; the mockup's positions, adjustable):
  16 px design text, 20 px title, wide frame; content top 90; the sheet (12,
  90, 714 × 112) and the TRY list (12, 214, 714 × 176) in the left column;
  the readout (738, 90, 300 × 34), the setting controls from y 134 (34 high,
  4 apart), TRY at y 340 and SET ASIDE at y 394 in the right column (x 738,
  300 wide); the bottom row at y 462 — HELP (12, 160 wide), LEAVE (184, 180
  wide), the view's primary control (778, 260 wide), CLOSE HELP (388, 260
  wide); the card text (12, 90, 1026 × 186), the check question (12, 90,
  1026 × 40) with its tiles from y 140 (714 wide) and RECORD ANSWER (12, 270,
  300 wide), the explanation (12, 90, 1026 × 96), the recorded line and every
  closed record (12, 90, 1026 × 34; the two-line fault record of the closeout
  1026 × 60, §5.342), the finished landing (738, 90, 300 × 34;
  60 high on the final view), the dialog text (200, 170, 520 × 72) with its
  controls (200 / 466, 250, 254 wide), the help sheet (12, 56, 1026 × 186).
  FIXED LINES: every sheet line, card / explanation / help line, TRY row,
  readout, control label, reading and refusal line, dialog line, status,
  footer and closed record render on exactly their own number of lines under
  the default font and forced Courier New and Lucida Console at 800 × 600,
  1280 × 720 and `canvas=1080`; at least 30 design px between the lowest
  control and the feedback line's top; the TRY list shows at most nine rows.
  A wrap, an envelope breach or a needed wording change is an owner-reserved
  exception.

(2) Telemetry, lifecycle and the feature (contract §9–§10; all provisional;
nothing canonical is created).

- Identity [D-7]: family `proto_m19_lines_`; ONE opportunity
  `proto_m19_lines_series`; window `m19_lines_w1`; object and surface
  `m19_coupling_panel`; `entry_state_version` `m19-lines-v2`; `form_id`
  `m19-form-1`; `content_version` `m19-content-v2`; line ids `m19_l1`,
  `m19_l2`; check ids `m19_chk_q1`, `m19_chk_q2`, option ids `m19_chk_q1_o1`
  … `_o3`, `m19_chk_q2_o1` … `_o3`; settings line 1
  `{ h1, h2, h3: boolean, feed: 'SINGLE' | 'DOUBLE' }`, line 2
  `{ dial: 1..9, bypass: 'SHUT' | 'OPEN' }`. The v2 ids are retired from the route and keep their frozen meaning.
- Events (every event the kit's fields plus `measurement_protocol_version`,
  `phase` `intro` | `check` | `measurement` | `closure`, `form_id`,
  `content_version`, and `line_id` / `line_index` when it concerns a line;
  `input_mode` `pointer` | `keyboard` | `system`): `presented` (kit, Noor's
  briefing); `opportunity_opened` (kit, the entry snapshot); `intro_acknowledged`;
  `series_reopened` / `panel_left` (`view`); `prior_load_checked`;
  `closed_unopened` (`closure_reason`); `check_presented` (`check_id`,
  `attempt`); `option_drafted` (`check_id`, `option_id` or null,
  `previous_option_id`); `check_answered` (`check_id`, `attempt`, `option_id`,
  `correct`); `explanation_shown`; `check_recorded` (`status`);
  `line_presented` (`line_id`, `assigned_position`, `realised_position`,
  `starting_setting`); `setting_changed` (`control`, `setting_after`);
  `try_refused` (`reason`, `setting`, `after_boundary`); `attempt`
  (`attempt_index`, `setting`, `reading`, `restored`, `after_boundary`,
  `since_boundary_focused_ms`); `difficulty_boundary` (`attempt_index`,
  `attempt_sequence`, `rule`, `evidence_attempt_indices`);
  `set_aside_requested`; `set_aside_cancelled` (`reason` `back` |
  `panel_left`); `help_consulted` (`view`); `line_finished` (`finish`
  `restored` | `set_aside` | `shift_ended` | `closed_at_review` |
  `technical_failure`, `attempts`, `boundary_attempt_index`, `continued`,
  `restored_at_attempt`, `line_focused_ms`, `boundary_to_next_try_focused_ms`,
  `boundary_to_finish_focused_ms`, `help_consults`,
  `panel_leaves_after_boundary`, `continued_after_leaving`,
  `refused_tries_after_boundary`); `series_completed` (the closure snapshot)
  and the kit's `window_closed`; `series_closed` (`closure_reason`
  `shift_ended` | `closed_at_review`, the snapshot) and the kit's
  `window_closed`; `technical_failure` (`detail`, `line_id`). Logger
  `sequence` and `page_load_index` preserved; nothing backdated; no event of
  the family enters `ScoringManager`, `SummaryScope`, the canonical context
  or the return URL. Entry snapshot: `lines_planned` 2, `line_order`
  [`m19_l1`, `m19_l2`], `form_id`, `content_version`, `boundary_rule`
  `designed_obstacle`, `continuation_rule` `further_new_executed_try`,
  `stop_control` `set_aside`, `time_limit` null, `check`
  `one_question_one_explanation_one_recheck`, `settle_ms` 400, `stage`.
  Closure snapshot: `lines_planned`, `check_status`, per line {`line_id`,
  `line_index`, `presented`, `attempts`, `boundary_attempt_index`,
  `continued`, `finish`}.
- Lifecycle (contract §3.8; the lifecycle keys on the current-load OPENING
  first): not presented (no current-load `presented` and no current-load
  `opportunity_opened`) ⇒ null `not_presented` (`interrupted` when earlier
  page loads exist); presented, never opened ⇒ null `pending`, after
  `closed_unopened` null `no_eligible_event` (`not_opened`); card / check open
  (opened, no `check_recorded`) ⇒ null `pending`, after the panel's closure
  null `no_eligible_event` (`check_not_reached` without a `check_presented`,
  else `check_not_completed`); check failed ⇒ null `understanding_failed`
  (`check_failed`; stable; the line records in the components); lines in work
  (check recorded, not both lines finished, no series closure) ⇒ null
  `pending`; complete / closed (both lines finished, or the series closed by
  the shift end, the review or a fault) ⇒ denominator ≥ 1 `observed` with the
  count (`censored: true` when a line was excluded by the review or a fault),
  denominator 0 ⇒ null — `technical_failure` (`technical_only`) when a fault
  excluded a line, else `interrupted` (`censored_only`) when the review
  censored one, else `no_eligible_event` (`obstacle_not_reached` when a TRY
  was executed on a presented line, `no_try` when none); the reload hold-back
  ⇒ null `interrupted`; a fault with no line in work ⇒ as "complete / closed"
  when an eligible line exists, otherwise null `technical_failure`
  (`technical_only`; `denominator` 0 once the check was passed, null before);
  technically invalid (a defect of S1–S7) ⇒ null `technical_failure` with the
  defect named. Precedence: `interrupted` > `technical_failure` (integrity
  defect) > `understanding_failed` > `pending` > the closed outcomes. Closure
  reason: `completed`, `shift_ended`, `closed_at_review`, `technical_failure`,
  or null while open.
- Field classification and the integrity rules S1–S7 [D-8] (the smallest
  set; `features/m19.ts`, current-load events only, the raw log read and never
  changed): SCORED — `sequence`, `page_load_index`, the event suffix,
  `entry_state_version`, `opportunity_id`, `form_id`, `content_version`,
  `line_id`, `attempt_index`, `setting`, the STORED `reading` and `restored`
  of every `attempt` (each must equal the content rule's reading for that
  setting), every `difficulty_boundary` field, `line_presented`,
  `line_finished.finish` / `boundary_attempt_index` / `continued`,
  `check_presented`, `explanation_shown`, `check_answered.attempt` /
  `option_id` / `correct`, `check_recorded.status`, the series closure and its
  snapshot, `closed_unopened`, the kit's `technical_failure` (and its
  `line_id`), `opportunity_opened`; DESCRIPTIVE (never change the value or the
  disposition; an inconsistency sets a named flag) — `input_mode`, every
  timing field, `help_consulted`, `panel_left`, `series_reopened`,
  `setting_changed`, `try_refused`, `option_drafted`, `set_aside_*`,
  `after_boundary`, `since_boundary_focused_ms`, the per-line counts on
  `line_finished` other than those listed as scored. S1 identity: every family
  event has `entry_state_version` `m19-lines-v2` and `opportunity_id`
  `proto_m19_lines_series`; every `line_presented`, `attempt`,
  `difficulty_boundary`, `line_finished` and `check_answered` has `form_id`
  `m19-form-1` and `content_version` `m19-content-v2`; the entry snapshot's
  `form_id`, `content_version`, `lines_planned` (the number 2) and
  `line_order` as declared. S2 order: every family event has a usable, unique
  `sequence` (a safe integer ≥ 1; §5.259). S3 lines: each line presented at
  most once, in assigned order; line 1 after `check_recorded`; line 2 after
  line 1's `line_finished`; a known `line_id` on every line record; no
  `closed_unopened` together with an `opportunity_opened`. S4 attempts: per
  line, `attempt_index` 1, 2, … consecutive in sequence order; `setting`
  well-formed for its line; stored `reading` and `restored` equal the content
  rule's; no setting executed twice on a line; every attempt after its line's
  `line_presented` and before its `line_finished`. S5 boundary: a line has
  exactly one `difficulty_boundary` if and only if its executed settings
  include all of its listed evidence settings; its `attempt_index` is that of
  the FIRST attempt after which the rule holds, its `evidence_attempt_indices`
  are the attempts that satisfy it, its `rule` is `designed_obstacle` and its
  `attempt_sequence` is that attempt's `sequence`; it follows that attempt and
  precedes any later attempt and the line's finish. S6 finish: at most one
  `line_finished` per line; finish `restored` if and only if its last attempt
  restored the line, and then immediately after it; no attempt after
  `line_finished`; a finish `shift_ended` or `closed_at_review` only together
  with a `series_closed` of the same reason, both after every attempt and with
  no later attempt, presentation or finish; a finish `technical_failure` only
  together with a kit `technical_failure` naming that line, and a kit
  `technical_failure` naming a line only together with that line's finish
  `technical_failure`; `boundary_attempt_index` and `continued` equal the
  recount; a series closure snapshot equals the recount. S7 check: at most two
  `check_answered`, attempt 1 then 2; attempt 2 only after a wrong attempt 1
  and after `explanation_shown`; stored `correct` equals the key comparison;
  `check_recorded.status` equals the recount, once. Each violation makes the
  row null `technical_failure` with `integrity_defect` (each defect with its
  record's sequence); no record is chosen between duplicates.
- The feature (contract §10; addendum §1) [A][O-7][O-8][O-9][D-9]:
  `m19_continuations` — value = numerator = eligible lines with a further
  executed TRY after their boundary; denominator = eligible lines; planned
  denominator 2; `denominator_kind` `conditional_eligibility` (a denominator
  of 1 is complete, `observed`, never `incomplete`). Per line, from the
  recount: boundary = the first attempt after which all listed evidence
  settings have been executed; `continued` = an attempt with a higher index
  exists. Eligible ⇔ boundary AND finish not `technical_failure` AND
  (continued OR finish `set_aside` OR finish `shift_ended`); a boundary line
  finished `closed_at_review` without continuation is CENSORED (excluded); a
  line finished `technical_failure` is EXCLUDED whether or not a continuation
  was recorded before the fault (`continued` as recorded, `eligible: false`,
  `excluded_reason` `technical_failure`; case E21), lines finished before the
  fault keeping their outcome (W1); an unfinished line ⇒ row `pending` before
  the series closes. Zero denominator (the framework's `fractionFeature`):
  `value: null`, `numerator: null`, `denominator: 0`,
  `planned_denominator: 2`, `included_ids: []` with the disposition above —
  whenever the lines were read (the check was passed); rows that never reach the lines are the
  framework's empty rows (`value`, `numerator`, `denominator` null).
  `included_ids` = the eligible line ids; `censored: true` with
  `censor_reason` (`technical failure on <line>` /
  `review closed <line> without a further TRY`) when a line was excluded.
  Components (beside, never inside): `administration_version`, `form_id`, `content_version`,
  `presented_in_current_load`, `observations_share_one_episode: true`,
  `check_status` and both answers (`check`), per line {`line_id`, `presented`,
  `attempts`, `refused_tries` by reason, `boundary_attempt_index`,
  `evidence_attempt_indices`, `continued`, `tries_before_boundary`,
  `tries_after_boundary`, `refused_tries_after_boundary` by reason,
  `changed_second_control_after_boundary`, `restored`, `restored_at_attempt`,
  `finish`, `eligible`, `censored`, `excluded_reason`, `line_focused_ms`,
  `boundary_to_next_try_focused_ms`, `boundary_to_finish_focused_ms`,
  `help_consults`, `panel_leaves_after_boundary`, `continued_after_leaving`,
  Option A's `first_unsuccessful_try_index` and
  `continued_after_first_unsuccessful`}, `nonresponse_kind` (`not_presented`
  | `not_opened` | `check_not_reached` | `check_not_completed` |
  `check_failed` | `obstacle_not_reached` | `no_try` | `censored_only` |
  `technical_only` | null), `reload_check`, `flags` (descriptive
  inconsistencies), and on a voided row `integrity_defect`. Never a
  proportion; never combined with another item; the legacy family is never
  read. Worked outputs (contract §10): W1 value 1 / 1 `observed` censored
  (technical failure on `m19_l2`); E21 null, numerator null, denominator 0,
  `technical_failure` (`technical_only`), censored (technical failure on
  `m19_l1`); W2 null `interrupted`; W3 1 / 1 `observed` censored
  (`closed_at_review`); W4 1 / 2 `observed` (`shift_ended`); W5 1 / 1
  `observed`.

(3) The build (after parts (0)–(2)). Four new modules under
`src/pilot/windows/`: `m19LinesContent.ts` (pure: the ids and versions, every
participant string of preview §4, both lines' settings, value rules, targets,
keys and listed evidence settings as data, the check questions, options and
keys, `m19ParticipantStrings()` for the wording audit), `m19LinesModel.ts`
(pure: the series state machine — card, check, lines, drafts, TRY evaluation
through the content rule, refusals, the obstacle boundary written in the same
handler as its attempt, the finishes, the settle on every view, help,
leaving, the shift-end and review closures, the never-opened closure, the
fault, the hold-back; the entry snapshot, the closure snapshot, the
prior-administration predicate, the reload-check builder; one `FocusedClock`
per line started at its presentation and stopped at its finish, paused
`surface_closed` on leaving and resumed on the real reopening; the log sink
returns the logger sequence so the boundary names its attempt's sequence),
`m19CouplingPanel.ts` (the adapter: the `ItemWindow` of opportunity
`proto_m19_lines_series` and window `m19_lines_w1`, the sink with the
protocol stamp, the clocks' subscription to `focusMonitor`, `presentM19`,
`declareM19Lines`, `guardM19Reload`, `openM19(nowMs, { stage })`, the surface
commands, `m19ConsumesEsc`, `closeM19Surface`, `resumeM19Surface`,
`closeM19AtShiftEnd`, `closeM19AtReview`, `m19TechnicalFailure`,
`bindM19Surface`, `m19LineInWorkId` for the yard's DEV probe, a test reset)
and `m19SurfaceModel.ts` (pure: the wide-frame surface model of (1) "Layout",
every activation routed to the adapter with its input mode).
`src/measurement/features/m19.ts` (the read-only extractor of (2)) registered
through `features/index.ts`; `registerV3.ts` entry `M19` with the explicit v3
route and `implementation_status: 'implemented'` (feature row, texts, range,
role, denominator kind, planned denominator, coverage label, independence,
operational label and summary unchanged); `reviewClosure.ts` with the one
import and the `closeM19AtReview(nowMs)` call before the exterior closure;
`exteriorWindows.ts` with exactly the two deletions of (1) "Place and access";
`ExteriorRecoveryYardScene.ts` with the legacy imports, prompt body, option
cases and `couplingOptions` removed, `declareM19Lines()` and
`guardM19Reload()` in `create()` right after `declareExteriorWindows()`,
`presentM19(now)` in the `ready` factory beside `presentM08(now)`,
`closeM19AtShiftEnd(now)` in `finishOutside()` beside `endExteriorShift(now)`,
`resumeM19Surface(now)` in the RESUME handler, `buildCouplingSite` opening the
wide-frame surface from `onPromptOpened` (returning false; the first opening
dismissing the guidance; `isDone` reading the new window; `onClose` consuming
the ESC order and calling `closeM19Surface` before the yard resumes),
`m19SurfaceHost()` with the same close path for LEAVE and FINISH,
`logStationOpened('frozen_coupling', { window_status })`, the neutral
`refreshCouplingVisuals`, the `guard` union without `'M19'` (the legacy
`exteriorTechnicalFailure('M19', …)` branch unreachable from the scene) and
the DEV probe's `m19_panel` block. Tests: `e2e/m19_lines.spec.ts` (pure, 50
tests at the first commit and 53 after the closeout of 14 October 2026 — the
independent oracle, the model, the extractor on the derivation cases and the
integrity rules, the clock policy, the register and source checks, the
surface model), `e2e/m19_lines_route.spec.ts` (browser, 15 scenarios R1–R9b
at the first commit and 16 with R10 after the closeout, with the twenty-nine
frames), `e2e/pilot_yard.spec.ts` and
`e2e/pilot_exterior_isolation.spec.ts` re-expressed for the new identity
(the panel worked to completion by real keyboard input in test 1; the
step-away observation replaced by the panel opened, line 1 at its obstacle
and set aside, line 2 left in work and restored on re-entry in test 2; the
held E in test 3 opening the panel once and executing no TRY; the
never-opened panel's `presented` / `closed_unopened` records and the
contaminated developer-launch record in the isolation spec). Documents: this
record, §2's M19 as-built cell, §5.328–§5.342, the matrix M19 row and "U21"
paragraph, the addendum §2 "U21" paragraph and §3 row, the UNIT-LOG entry.
All eighteen paths of contract §4 were touched and no other; nothing was
deleted or renamed.

(4) Events, closures and the legacy disposition as built. Identity, suffixes,
fields, the entry and closure snapshots exactly as (2); the kit's
`window_closed` follows `series_completed` (exit `completed`), the shift-end
`series_closed` (exit `stopped` — a completed observation, decision D-U21-1
item 7) and the review's `series_closed` (exit `closed_at_review`, the
register `censored`); a never-opened panel at the review gets the kit's
absence record (`presented_not_opened` / `not_presented_not_opened`) and, when
the shift end did not write it, `closed_unopened` (`closed_at_review`). The
row's `closure_reason` uses the framework's enum: `completed`,
`closed_at_review`, `technical_failure`, and `route_departure` for the shift
end — the family's own reason (`shift_ended`) travels as the component
`series_closure_reason` [D-6]. A runtime fault is recorded as §5.340 (a): the
model finishes the line in work (`line_finished` with finish
`technical_failure`), the family record `technical_failure` carries `detail`,
`line_id`, `line_index` and `phase` `closure` through the window's `log`, the
opportunity is marked `technical_failure` through the framework's
`markOpportunityInvalid`, the kit window is paused; the reopened panel shows
the record view with the two-line fault record and LEAVE (§5.340 (b); the
record was an empty landing at the first commit and was added at the
closeout of 14 October 2026, §5.342). The legacy
coupling: `m19CouplingModel.ts` and the legacy adapter functions in
`exteriorWindows.ts` byte-identical with the base apart from the two deleted
lines; the file's `setComprehension('passed')` count 8; the legacy window
never declared, offered, presented, opened or closed on the route; no
`proto_m19_valve_` event on any route run; the probe's legacy `m19` block
untouched.

(5) Verification evidence (13 October 2026). Development runs by the writer
(Fable 5.1) while building: `tsc --noEmit`, `vite build`, ESLint with the
prettier rule on every changed `.ts` file, prettier on the register and the
addendum (clean; the matrix and the UNIT-LOG fail prettier at the base
already — the base comparison shows those two files already failed
formatting on the base, not that every current complaint in them is
inherited; owner ruling 5 of the sign-off, §5.343), `verify-unit` (PASS,
exit 0, no FAIL line), `git diff --check`
(clean), the pure spec 50 / 50, the route spec 15 / 15 after four test-side
corrections ((6) below), the six pure regression specs 80 passed and 2 failed
with both failures reproduced on the untouched export of `390d5ce` on port
5208 with the same assertion, message and received value, `pilot_yard` 3 / 3
and `pilot_exterior_isolation` 2 / 2. The final matrix of contract §12 was
then run once, on an unchanged tree, by the test-reviewer — a general-purpose
agent on model `claude-sonnet-5-5` after reading
`.claude/agents/test-reviewer.md` (the named type was not discoverable) —
against source digest `0073ceb1efdfda09305cd812d8495d5e6e126f8faef5a3ece6d488e5e538b2fe`
(SHA-256 over `git diff 390d5ce` and the seven untracked files) at HEAD
`390d5ce`, the start and end digests identical: `lint:tsc` exit 0; `build`
exit 0; ESLint with the prettier rule on the fourteen `.ts` paths exit 0;
prettier `--check` on the fourteen `.ts` paths and the four documents exit 1
with exactly the same two files flagged as on the base export (the base
check establishes that those files already failed formatting there, not
that every current complaint is inherited — §5.343 ruling 5); `git diff
--check` exit 0; `verify-unit` exit 0, "PASS - every change
is inside the unit allowlist", no FAIL line; P1 `e2e/m19_lines.spec.ts` 50
passed; P2 (`pilot_coverage`, `pilot_closure_models`,
`m26_protocol_foundation`, `pilot_exterior_models`, `evidence_ledger`,
`final_scientific_gates`) 80 passed, 2 failed — "M08 and M11 are
questionnaire-primary" (`final_scientific_gates.spec.ts:146`, received
`proto_m08_effort_choice`) and "U8-12 (recorded, not resolved)" (`:405`,
expected length 10, received 8) — both identical to the base logs, neither
touching an M19 step; B1 `e2e/m19_lines_route.spec.ts` 15 passed in 59.7 min
(R1, R2, R2 at canvas 1080, R3, R4, R5, R5b, R6, R7, R7b, R8 default, R8
Courier New, R8 Lucida Console, R9, R9b; no retry, no skip); B2 `pilot_yard`
and `pilot_exterior_isolation` 5 passed, `m24_m26_boundary_route` 1 passed,
`world_v2_yard_look` 1 passed with its sixteen frames written to the session
scratchpad (`yard-look/`). Port 5207 was free before every browser run (a
stale TIME_WAIT entry only); no flake, no retry. The U8-12 gate: received 8
on both trees — not a regression of this unit; its premise is stale for M19
because the route's M19 comprehension is now a recorded check in
`m19CouplingPanel.ts`, and the eight remaining `setComprehension('passed')`
calls of `exteriorWindows.ts` are the legacy functions off the route plus M20
and M23; the gate itself is a prohibited file and was not edited. The R8
envelope (design px, measured in the running game on the real route): content
bottom 502 and feedback top 552 (default and Lucida Console) / 554 (Courier
New), spare 50 / 50 / 52 on line 1 at its start, line 1 with ten TRYs, line 1
finished, line 2 with eight TRYs and the help sheet; the dialog 262 / 262 /
264; every text block inside its box (readout and tiles 15–17 of 34, the
sheet 90–96 of 112, the TRY log 160 of 176 at ten rows, the help sheet
120–128 of 186, the dialog 45–48 of 72); the card on ten lines and the
question and each option on one line under all three fonts; the title is the
wide frame's 20 px constant and the text its 16 px body. The twenty-nine
frames of contract §13 are in `.playwright-mcp/u21-evidence/`
(`01-yard-coupling-station-prompt` … `29-yard-after-the-first-opening`;
800 × 600 by their PNG headers except `25-line-1-at-1280x720` and
`26-line-2-at-canvas-1080`, both 1280 × 720, the latter the full-HD canvas
inside that viewport; 27 and 28 under the forced fallback fonts), written by
the test-reviewer's B1 run — frames 05, 06 and 21 by its round-1 rerun of R3
and R9 at 800 × 600 — and copied to the session scratchpad; the development
run's frames of the same scenarios were viewed one by one by the writer, the
matrix run's frames were spot-checked by the writer and read in full by the
combined review, and the three rerun frames were viewed by the writer.
Final static checks by the writer on the completed tree after correction
round 1 and these documents: prettier on the register and the addendum exit
0, `verify-unit` exit 0 (PASS, no FAIL line, whitespace clean),
`git diff --check` exit 0, the working tree exactly the eighteen allowlisted
paths. The reviews: §5.341 and the UNIT-LOG "U21 results".

Closeout verification (14 October 2026; §5.342; the UNIT-LOG "U21
closeout" holds both reports verbatim). Development runs by the writer on
the changed tree: `tsc`, `build`, ESLint and prettier on the five changed
`.ts` files all exit 0; the pure spec 53 passed; the route scenarios R2,
R2 at canvas 1080, R9b and R10 4 passed in 9.5 min. The affected checks
were then rerun by the test-reviewer (a general-purpose agent on
`claude-sonnet-5-5`, reporting Sonnet 5.5) on the source digest
`c09c5d9adbe1deb4fd0ee2d6271015a16cbd059f970e15ed7e83ba8b396772b0` (`src`
and `e2e` at HEAD `33e779f`; start and end identical): `lint:tsc` exit 0;
`build` exit 0; ESLint with the prettier rule on the five files exit 0;
prettier `--check` on the five files exit 0; `git diff --check` exit 0;
P1 53 passed; P2 (the six pure regression specs) 80 passed, 2 failed — the
same two inherited `final_scientific_gates` failures (`:146` received
`proto_m08_effort_choice`; `:405` U8-12 expected 10, received 8), nothing
else; B1 the whole route spec 16 passed in 47.3 min with no retry and no
skip (R1 3.8, R2 2.3, R2 at canvas 1080 2.2, R3 2.7, R4 4.6, R5 3.1, R5b
2.0, R6 1.9, R7 4.7, R7b 4.7, R8 default 2.3, R8 Courier New 2.2, R8 Lucida
Console 2.4, R9 3.5, R9b 2.7, R10 2.2 min); port 5207 had no listener
before each browser run; the twenty-nine frames rewritten by that run, 27
at 800 × 600 and frames 25 and 26 at 1280 × 720 by their PNG headers (the
same sizes as before; no frame shows the closeout's changes — the ids are
not drawn and the route never faults the panel). B2 was not rerun: no
shared file changed and neither spec reads the panel's element ids. The
Opus confirmation (`claude-opus-5-5`, read-only, in parallel on the same
source digest and the full-tree digest
`1b9ed3001ca0bd3b7ff7184291abe7a4b35997dd20f4ac930626fe45d6db33ce`):
GP-1 confirmed fixed by tracing every hotkey and ENTER transition of the
frame; the fault record conforming to the vocabulary, the wording audit and
the layout rule; the documents faithful to the instruction; no MATERIAL
finding; two MINOR document corrections and three NOTEs applied as
documentation (§5.342 and the UNIT-LOG name them); its open questions for
the owner (the wording's status, `content_version`) in the handoff, both
closed by the owner's sign-off of 14 October 2026 (§5.343). Final
static checks by the writer on the completed tree after these documents:
prettier on the register and the addendum, `verify-unit`,
`git diff --check` and the digest, recorded in the UNIT-LOG "U21 closeout"
with the second commit.

(6) Deviations, defaults exercised and findings. Deviations from the plan,
none from the contract: (a) the named agent types `test-reviewer`,
`scientific-reviewer`, `gameplay-reviewer` and `visual-reviewer` were not
discoverable in the session, so each reviewer ran as a general-purpose agent
with the matching model override after reading its role file (test-reviewer
on `claude-sonnet-5-5`; the one combined review on the opus override), as the
prompt's fallback allows and requires reporting; (b) the route driver replays
Noor's briefing after a page reload (the driver does not persist the stage),
so scenario R7b observes `prior_load_checked` and a fresh `presented` in the
new load with `presented_in_current_load` true, and case E18's missing
current-load `presented` is shown by the pure spec only — a limitation of the
browser evidence, not of the panel; (c) four test-side corrections while the
route spec was being brought up, none touching a source rule: the R1 row
equality across a reopening compares the stable fields (the descriptive
`reopenings`, `panel_leaves_after_boundary` and `supporting_sequences` are
expected to change with the reopening), a wrong expectation of
`changed_second_control_after_boundary` on the boundary event was removed
from R2, R7 drives back to the yard through `routeToYardWork` after the
tutorial instead of replaying the spine, and R9 compares views without the
feedback line (which clears itself after 2.2 s) and expects LEAVE from the
final view to reopen the final record of a completed series; (d) the pure
clock tests were rewritten to timestamp-based expectations after their first
version ignored the settle time the harness consumes; (e) the isolation
spec's first rewrite left two legacy blocks in place (`openSite is not
defined`); both were removed and the spec rerun. Defaults exercised:
§5.329–§5.340, in particular D-6 (`route_departure` with
`series_closure_reason`), D-8 (`attempt_sequence` read back from the
runtime's events), D-13 (a) (the fault record through `log` and
`markOpportunityInvalid`) and D-13 (b) (the empty landing after a fault).
Disclosed to the owner without resolution at the first commit (the first
two resolved by the closeout of 14 October 2026, §5.342): the reopened panel
after a runtime fault showed no record line (a wording decision, §5.340 (b));
the shared frame's focus carried onto HELP or LEAVE across a hotkey view
change (GP-1); the amber
feedback line of the last TRY stays visible under the help sheet until the
surface's own auto-clear (frame 21, cosmetic, no rule affected); the inherited
prettier state of the matrix and the UNIT-LOG; the two inherited gate
failures. The combined review (§5.341) raised one material and two lesser
findings that were fixed in correction round 1, inside the allowlist and with
the affected checks rerun by the test-reviewer ((5) and the UNIT-LOG): (f)
SC-1 — a fault with no line in work after a passed check and with no
eligible line (on the recorded view, or between the lines after line 1 was
finished before its obstacle) was exported as `no_eligible_event` (`no_try` /
`obstacle_not_reached`); contract §3.8 "fault with no line in work" requires
null `technical_failure` (`technical_only`), never a non-response — the
extractor's zero-denominator disposition now names the fault first (pure
case E19b); (g) SC-3 — a later page load with no current-load `presented`
and no opening was read `not_presented` when its reload check established
the absence of an earlier opening; contract §3.8 row 1 requires `interrupted`
while earlier page loads exist — corrected (pure case E1b; §5.335 amended);
(h) VI-3 — frames 05, 06 and 21 were written by the 1280 × 720 pointer
scenario although contract §13 asks for 800 × 600 unless stated — now
written by R3 and R9 at 800 × 600. The unresolved findings and the questions
for the owner: §5.341. The closeout of 14 October 2026 (the owner's decisions
on those questions, §5.342; a second local commit, inside the allowlist):
(i) GP-1 fixed locally in M19 — HELP and LEAVE carry the view's name in
their ids (`help_<view>` / `leave_<view>`), so a hotkey that changes the view
while one of them is focused lands on the new view's neutral element (the
shared frame untouched; pure test "HELP and LEAVE carry the view name";
route scenario R10); (j) the two-line fault record for a panel reopened
after a runtime fault (§5.340 (b); implementer wording in the shape of the
M14–M18 fault records, approved for addition by the owner, not preview
text); (k) the owner accepted D-6 (SC-2) and D-13 (a) (SC-4) as documented,
retained the between-line fault reading (`censored: false`) and the U24
deferrals (GP-2 / VI-1 among them); no event, field, formula, disposition or
other participant string changed.

(7) Limitations (stated, not resolved; preview §9 and this build). Under
Option B the eligible group is selected by search strategy — participants
who anticipate the second control, or who stop before the obstacle, are never
eligible; eligibility per line is unknown until piloted. The count may vary
little; this is unknown. Two lines in one episode, fixed order, one form:
content and position are confounded; the observations are clustered; line 1
may teach the use of the second control and lower line 2's eligibility.
Leaving and later returning counts as continuation (flagged); the shift-end
rule partly reflects route choices although the card and help state it. The
"finished outside" closure counts an eligible line's non-continuation as 0
whether the participant walked to Noor from the panel or from elsewhere. A
fault while a line is in work discards that line's credit even when a
continuation was recorded (decision D-U21-1 item 9; the raw events stay). The
focused clock excludes only documented focus loss and the panel's own
closure; help and the dialog count as working on the line. The reload
hold-back keeps the earlier load's events in `prior_page_load_events` and
exports nothing from them (the framework rule); the route driver replays
Noor's briefing after a reload, so the browser cannot show case E18's missing
current-load `presented` record (the pure spec shows it). The reopened panel
after a runtime fault shows the two-line fault record of §5.340 (b) —
implementer wording approved for addition at the closeout, not preview text;
the browser evidence does not fault the panel (no fault injection on the
route), so the record is shown by the pure spec only. M22's handover
report line "Coolant coupling — valve serviced" is unchanged whatever M19's
outcome (U24 backlog). No source validates the count; passing tests establish
implementation correctness only, never validity, reliability, persistence as
a trait or questionnaire equivalence.

**Unit 20 (M18): as-built** — the three diagnosis cases at the Diagnostics
Laboratory diagnostic board (bounded unit under contract `U20-CONTRACT.md`, v2
of 12 October 2026, amended the same day with the research owner's approval of
decision D-U20-1). **Status: technical implementation of the approved row under
research-owner decision D-U20-1 (APPROVED 12 October 2026, against preview
revision r2 with its explanatory amendment of the same day);
`m18_correct_first_diagnoses` (primary) and
`m18_correct_consequence_predictions` (companion) are candidate indicators and
NOT scientifically validated.** The six responses are clustered observations of
THREE INDEPENDENTLY DESIGNED cases at ONE board inside ONE episode — never three
or six independent situations; the cases are not equated in difficulty; the
content is one authored form; a keyed part never proves that every test was
used or that the reasoning was the one in the results; a keyed step answer
never proves a correct diagnosis (case 3's step key is shared with the wrong
part HATCH); tests run, drafts, help and time are companions, never part of a
value; the two rows are never combined. Passing tests establish implementation
correctness only, never psychometric validity or questionnaire equivalence.
Parts (0)–(2) below were written BEFORE the content module, the series model,
the adapter, the surface model and the extractor (the contract's "specify
before you code"); parts (3)–(7) record the build and its evidence.

(0) Authority. **Research-owner decision D-U20-1 — APPROVED 12 October 2026**
(an owner ruling, recorded in §5.315; not an implementer default and not
reopened): items 1–10 as recommended with the owner's clarifications — the
planned-step key is what happens in the ACTUAL case whatever part was recorded,
one key per case, the step asked after every recorded part, CANNOT SOLVE
included (item 1); the three r2 cases, their sheets, tests, every result line,
part options, planned steps, answer options, keys, results explanations and
every participant-facing string as the administered content, part keys
`m18_c1_p3` AMPLIFIER, `m18_c2_p4` HEATER, `m18_c3_p2` SENSOR and step keys
`m18_c1_s2`, `m18_c2_s1`, `m18_c3_s4` (item 2); the three tests of a case
available on request, unlimited, deterministic and repeatable before the part is
recorded, closed when it is, a repeat of the same test within 400 ms refused and
logged, test use never changing a count (item 3); tests and the part first, the
part confirmed and immutable BEFORE the planned-step question appears, the
recorded part echoed in the step view's status line in the same form for every
part (item 4); CANNOT SOLVE for the part and for the step, each an incorrect
first response in its own count and denominator, the step still asked after a
CANNOT SOLVE part, leaving never recording CANNOT SOLVE, no STOP control (item
5); the identical neutral acknowledgement after each case and no correctness
information before the sixth first response, then three read-only results pages
(item 6); one form `m18-form-1`, fixed case, test and option order, no
counterbalancing (item 7); two rows with their own numerator, denominator,
planned denominator 3 and missingness, never combined (item 8); the M15 / M16
briefing-exposure, non-use, leaving and reload conventions applied, both rows
`pending` while the series is open — also with three parts recorded and a step
pending — and each row by its own count at the review closure (item 9); the two
descriptive indicators with the null rules and the narrower claim of contract
§10 (item 10); item 11 the APPROVED ALTERNATIVE — a defect voids only the
affected row when it is demonstrably isolated, shared defects that compromise
administration, content, sequencing or exposure void both rows, and where
isolation cannot be established both rows are voided with the reason stated
(contract §9.4 "Defect scope", the isolation test I1–I4, the lifecycle and
closure-snapshot rules); the validation of the eight setup declarations
`prediction_target`, `tests`, `tests_close`, `step_after`,
`cannot_solve_available`, `feedback`, `stop_control` and `responses_per_case`
retained as part of the approved administration; `response_kind` exactly
`option` or `cannot_solve` on both response types; raw records preserved,
contradictory evidence never repaired, an uncertain response never counted. All
events, features and descriptive indicators remain provisional; no canonical
promotion, combined score or scientific-validity claim. The approved row is §2
(M18), §2b, the matrix row, addendum §3 and `registerV3.ts` (entry `M18`).
Provenance limit: the original owner documents are not on disk and were not
searched for again; the decision is an explicit decision for this
implementation, not recovered wording. Rulings D-U16-1 (M13), D-U17-1 /
D-U17-2 and the closeout ruling §5.290 (M14), D-U18-1 (M15), D-U19-1 with
amendment A1 and the closeout rulings §5.314 (M16) are precedent only and
approve nothing here. Each rule below carries its source: [O-n] decision
D-U20-1 item n, [A] approved row or owner instruction, [P] recorded precedent,
[D-n] implementer default (§5.316 onward).

(1) Administration `m18-cases-v1` — **specified before the content module, the
series model and the interface were written.**

- Place and access [A][O-9][P][D-10]: the Diagnostics Laboratory diagnostic
  board (phase 4 of the signal case; registry `lab.phase_m18`, its label
  "Diagnostic Board" and approach unchanged; surface `m18_diagnostic_board`,
  the generic `WorkSurfaceScene` in the WIDE frame of decision D-U17-2,
  unchanged), bench label "Diagnostic Board", phase name "Fault diagnosis",
  operational label "Signal case — diagnosis (Laboratory)", episode 3.
  Optional, as today: enterable whenever no other phase surface is open; Kai's
  dialogue text unchanged; no gate, reward, judgement or route consequence;
  non-use never read as refusal. Every one of the FOUR `onSelected` handlers of
  Kai's briefing acknowledgement (`lab_brief_ack` in the no-loan-offer branch;
  `lab_brief_ack`, `lab_brief_ack_loan_accept`, `lab_brief_ack_loan_decline` in
  the loan-offer branch) calls `presentM18(now)` beside
  `advancePilotStage('lab_work', now)`, `presentM15(now)` and
  `presentM16(now)` — briefing exposure only (the kit's `presented`), never a
  board opening or a case presentation. The stage at the first opening is
  recorded in the entry snapshot. The phase order, the beacon, the wall display
  (its "fault resolved" bracket once M18 is recorded), Noor's line
  `NOOR · relay: The test rig the storm left faulted is on the diagnostic board.`
  and the case brief are unchanged; the display's "recorded" state follows the
  M18 window's closure (completed or closed). Route context, never an input:
  the lattice bench's window status at the first opening is stamped in the
  entry snapshot as `prior_m13_window_status` (the U16 convention); M18 reads
  nothing else from M13 and writes nothing to it. The legacy board
  (`m18FaultDiagnosis.ts`, `faultForms.ts`, `ui/DiagnosisConsoleScene.ts`)
  stays in the tree UNCHANGED under its frozen v2 identity
  (`proto_m18_lattice_fault_diagnosis`, `proto_m18_fault_*`,
  `m18_diagnosis_w1`, entry `m18-fault-v1`), reachable only through the
  developer alias `?scene=information_processing_lab`; the laboratory scene no
  longer imports it; `src/measurement/m18Diagnosis.ts` (Pump House) is
  untouched; the v3 extractor never reads either family; the registry's
  descriptive `opens` / window label for `lab.phase_m18` stay stale (U24
  backlog).
- Content, order and form [O-2][O-7]: the content exactly as preview §3–§4 —
  the first-opening card (six fixed lines), the three unit sheets (`m18_c1`
  MAST RECEIVER, ten lines; `m18_c2` COOLING BAY, eleven lines; `m18_c3` HATCH
  WINCH, eleven lines; each ≤ 70 characters), the tests `m18_c<k>_ta` / `_tb`
  / `_tc` with their buttons (`PROBE P1  [A]`, `PROBE P2  [B]`,
  `SPARE FILTER  [C]`; `AIR AT FAN  [A]`, `AIR AT RACK  [B]`,
  `SPARE GAUGE  [C]`; `FEELER AT SEAL  [A]`, `POWER AT WINCH  [B]`,
  `SENSOR LAMP  [C]`), record labels (`A  PROBE P1` …) and the line for every
  possible result, the "if at fault" tables as data, the part options
  `m18_c<k>_p1` … `_p4` (MAST, CABLE, AMPLIFIER, FILTER; FAN, DUCT, GAUGE,
  HEATER; HATCH, SENSOR, LOCK, WINCH) with tile labels `<PART>  [k]`, the
  planned-step texts, the answer options `m18_c<k>_s1` … `_s4` with tile labels
  `<answer>  [k]`, the keys (parts at positions 3, 4, 2; steps at positions 2,
  1, 4; within each case the two differ), the confirmations, the
  acknowledgement, the help sheet, the six results lines per case and the
  closed records; versions `m18-cases-v1` (administration), `m18-form-1`
  (form), `m18-content-v1` (content). Line breaks are the preview's (fixed);
  wording, letters, numbers, order and option order never change; the
  participant strings and the tables live in one pure content module
  (`m18DiagnosisContent.ts`); no questionnaire wording anywhere. One form,
  fixed case order `m18_c1` → `m18_c2` → `m18_c3`, test order A, B, C, option
  order as listed; realised order always equals assigned order; no
  counterbalancing. Limitation documented: case content and position are
  confounded; case 1 carries first contact with the board; there is no
  practice case.
- Objective access [O-3][O-4]: while a case's part is open — the unit sheet,
  the three test buttons and the test record (the result line of every test
  run, `not run yet` otherwise), the part question, the four part tiles,
  RECORD PART, CANNOT SOLVE, HELP, LEAVE BOARD; during the planned step — the
  unit sheet, the test record as labels (the tests closed; `not run` for a test
  never run), the recorded part in the status line, the planned-step text, the
  four answer tiles, RECORD ANSWER, CANNOT SOLVE, HELP, LEAVE BOARD. Earlier
  cases' sheets, records and answers are not shown during a later case; the
  step question is never visible before the part is recorded; nothing is hidden
  on request.
- First opening [D-2]: the card (title `DIAGNOSTIC BOARD`, the six lines of
  preview §3.3) with START CASE 1 (the primary control), HELP and LEAVE BOARD;
  activating START CASE 1 is recorded (`intro_acknowledged`) and presents case
  1 (`case_presented`); leaving before it shows the card again at the next
  opening.
- A case: tests and the part [O-3][O-4][O-5][D-3][D-4]: subtitle
  `Case N of 3`, status
  `Run any tests, then choose the part at fault and record it.`. A test
  (button, A / B / C, or ENTER / SPACE on focus) writes its result line into the
  test record and logs `test_run` (`test_id`, `result_id`, `run_index` per
  test, `case_test_runs` after this run, `repeat`) — an interaction, never a
  response; a repeat shows the same line; a second activation of the SAME test
  within 400 ms of the previous one is refused and logged (`press_refused`,
  target `test`, reason `repeat_within_settle`, `since_ms`). Drafts: activating
  a part tile (pointer, ENTER / SPACE on focus, or 1–4) makes it the draft;
  another replaces it; the same again clears it; every change is logged
  (`option_drafted`, slot `diagnosis`) as an interaction, never as a response;
  the draft survives leaving and returning. Commitment: RECORD PART with a draft
  opens the part confirmation (`Record <PART> as the part at fault in case N?` /
  `The tests then close; the test record stays.` /
  `It cannot be changed afterwards.`, confirm `RECORD PART  [ENTER]`, cancel
  `KEEP WORKING  [ESC]`); CANNOT SOLVE opens its confirmation whatever the draft
  (`Record CANNOT SOLVE for the part in case N?` …, confirm `RECORD  [ENTER]`);
  RECORD PART without a draft shows the neutral line `Choose a part first.` and
  logs `commit_without_draft` only. Only the dialog's confirm records: it writes
  `first_response` (slot `diagnosis`), then `tests_closed` (`tests_run` ids,
  `test_runs`), then presents the planned step (`step_presented`,
  `step_option_ids`). The recorded part (an option or CANNOT SOLVE) is
  immutable: no later act, reopening, results view, reload or closure changes
  or duplicates it.
- The planned step [O-1][O-4][O-5]: the step view — left the unit sheet and the
  test record as labels; right the planned-step text (prose; its box the only
  other prose box), the four answer tiles, `RECORD ANSWER  [R]`,
  `CANNOT SOLVE  [N]`; status
  `Recorded part: <PART>. The tests are closed; the record stays.` with `<PART>`
  the recorded part's name or `CANNOT SOLVE` — an echo of the participant's own
  record, identical in form for every part, no correctness. Drafts,
  commitment, CANNOT SOLVE and every protection as the case view (slot
  `prediction`; the dialog repeats the drafted answer:
  `Record this answer for case N's planned step?` / `<answer>` /
  `It cannot be changed afterwards.`, confirm `RECORD ANSWER  [ENTER]`;
  `Record CANNOT SOLVE for case N's planned step?` /
  `It cannot be changed afterwards.`, confirm `RECORD  [ENTER]`;
  `Choose an answer first.` without a draft). The confirm writes
  `first_response` (slot `prediction`) and the acknowledgement. The step's key
  is the content's key of the ACTUAL case (`m18_c1_s2`, `m18_c2_s1`,
  `m18_c3_s4`) whatever part was recorded [O-1]; a step CANNOT SOLVE is
  incorrect in its own slot. The tests are closed throughout: a test command in
  the step view does nothing and writes nothing.
- Commitment mechanics and the settle [P][D-4]: only a FRESH confirming press
  commits — a press inside the first 400 ms after a dialog appeared, the press
  that opened it, a held key or an auto-repeat never confirms (held keys and
  auto-repeat are dropped by `WorkSurfaceScene` before the host and never
  recorded; the non-fresh presses that reach the host are recorded once per
  dialog as `commit_press_refused` with their count carried on the record); the
  confirm control is never at the position of its opener (dialog controls at
  panel (200, 250) / (466, 250); every opener at x ≥ 738); a double click on an
  OPENER records zero first responses; a fresh CONFIRM after 400 ms records
  exactly one, and a duplicate press immediately after it lands on the next view
  inside its settle and changes nothing. While a dialog or the help sheet is
  open the model renders only the header, the status line and that dialog or
  sheet; 1–4, A–C, R and N do nothing. Settle on EVERY view transition: a press
  arriving within 400 ms after a view appeared — the card, a case view, a step
  view, an acknowledgement, each results page, the help sheet and the view
  restored by CLOSE HELP or a cancelled dialog — changes nothing (no test,
  draft, request, confirm, navigation, help consult or `results_shown`);
  a press that would otherwise have ACTED on a control is logged as
  `press_refused` (target `view`, reason `settling`, `since_ms`) — a
  descriptive record. As built, as the M16 precedent (reviews, correction
  round 2): LEAVE BOARD and the ESC that leaves are not settle-gated (leaving
  records no response), ESC closes the help sheet at any time, and neither an
  ESC consumed inside a live view's settle nor a KEEP WORKING inside the
  dialog's first 400 ms is logged. Focus on entry
  is neutral on every view (the first focusable element is a non-acting landing
  — the card text, the part question, the planned-step text, the
  acknowledgement line, the results text (also on a page reached by NEXT or
  BACK: the page controls carry the page in their id, so the scene's
  focus-by-id carry-over cannot land on them — correction round 2), the
  closed-record line — so no
  actionable control is focused until TAB or a hotkey; the M15 / M16
  question-view mechanism [P]); in a dialog the confirm control is first in the
  focus order and acts only on a fresh press; on the help sheet CLOSE HELP is
  first. KEEP WORKING / ESC closes a dialog without a response
  (`commit_cancelled`, reason `keep_working`); the view the dialog returns to
  settles again.
- Acknowledgement and the next case [O-6]: after the step answer, the identical
  neutral acknowledgement (`Case N recorded.`, status
  `N of 3 cases recorded.`) with NEXT CASE (cases 1–2) or SHOW RESULTS (case
  3), HELP and LEAVE BOARD — no colour, glyph, sound, wording, layout or timing
  that differs with correctness; the unit sheet and the test record of the case
  stay visible. The next case is presented only from the acknowledgement
  (`case_presented` with `assigned_position`, `realised_position`, `test_ids`,
  `part_option_ids`), so each case's presentation follows the previous case's
  step answer. The sixth first response writes `first_responses_completed`
  with the closure snapshot; the kit completes the window right after it
  (`window_closed`, exit `completed`).
- Results [O-6]: only when all six first responses exist. SHOW RESULTS opens
  page 1 (case 1; title `RESULTS — CASE 1 OF 3`, status
  `Your answers are fixed. This view only shows them.`, the line
  `All three cases are recorded.`, a blank line, then the case's six results
  lines with `{part}` / `{step}` the recorded part / answer or `CANNOT SOLVE`)
  with HELP, FINISH and NEXT; page 2 (case 2) HELP, FINISH, BACK and NEXT; page
  3 (case 3) HELP, FINISH and BACK (NEXT at panel x 778, BACK at x 654 — never
  sharing a position). FINISH and ESC close the results surface from any page
  (the same leave path). Completion is established by the sixth first response
  whichever pages are later viewed; `results_shown` (phase `feedback`, `page`,
  `case_id`) is written only when a page is actually displayed, once per page.
  HELP / CLOSE HELP return to the same page with all state preserved and re-arm
  its settle. Reopening a completed board shows page 1 read-only (its
  `results_shown` then, once, if page 1 was never displayed). No results act
  changes a response.
- Help [D-5]: HELP (H or the button) on the card, every case, step and
  acknowledgement view and every results page — never while a dialog is open;
  the sheet (title `HOW THE BOARD WORKS`, the eight lines of preview §3.3);
  informational; every consult logged (`help_consulted` with `phase` and `view`
  — `intro`, `case_<k>`, `step_<k>`, `ack_<k>`, `results_<k>`) as an
  interaction, never an answer. CLOSE HELP (H, ESC or the button) restores the
  same view with all its state (case, test record, draft, step, results page)
  and re-arms its settle.
- Leaving, closure, reload, faults [P][O-9][D-6]: ESC closes, in order, an open
  dialog (its cancel refused inside the dialog's 400 ms — the dialog stays),
  then the help sheet, then leaves; LEAVE BOARD leaves; both take the SAME path
  (window pause, clock pause, surface close — the `m16SurfaceHost` precedent).
  Leaving keeps everything (card, case, test record, draft, recorded responses,
  step, acknowledgement; `panel_left` with the view); returning (`series_reopened`)
  never presents a case or a step again, never re-runs a test and never starts
  a new trial; leaving in a dialog cancels it (`commit_cancelled`, reason
  `panel_left`) and records nothing. The station-record closure at the Utility
  Deck review (`reviewClosure.ts` → `closeM18AtReview(nowMs)`, after
  `closeM16AtReview`): an opened series not complete (the card, any case, any
  step) closes as `closed_at_review` (`series_closed_at_review` with the
  closure snapshot; the kit's `window_closed`, censored): recorded answers
  kept, unanswered opportunities missing, no results afterwards; the board then
  opens as the closed record `Station record closed — the board keeps its
record.` with the status line
  `Parts recorded: P of 3 · planned steps recorded: S of 3.` and LEAVE BOARD
  only; while any closed record is shown no answer can be given and no
  `proto_m18_cases_` event is written. A completed series is not reclosed. A
  never-opened board is recorded absent with the kit's `markAbsent`
  (`briefed_not_opened` / `not_briefed_not_opened`) and the series itself
  becomes the review's closed record (nothing logged — no opening ever
  happened), so a later opening of the board after the review shows
  `Station record closed — the board keeps its record.` with
  `Parts recorded: 0 of 3 · planned steps recorded: 0 of 3.` and LEAVE BOARD
  only, accepts nothing and writes no event (gameplay review, correction round
  2 — before it the board came back live); `declined` never occurs.
  Reload: an opening of this administration in an earlier page load of the
  session ⇒ the hold-back (the closed record
  `This board was already used in this session. Its record is kept; no further answers can be given here.`,
  prior exposure recorded, the series marked technically incomplete with the
  detail `reload after administration: board not re-run`, the earlier events
  immutable in `prior_page_load_events`) — also when the earlier load
  completed all six; `prior_load_checked` once per later page load at the
  first `guardM18Reload` run (the laboratory's `create()`), before the
  hold-back record when an opening is found; a board never opened before the
  reload runs normally. Limitations as §5.290 (a): the check runs only where
  the board becomes available; continuity is read from recovered sequence
  numbers and the store's meta record and cannot reveal a lost tail when the
  meta record survived; after a reload Kai's briefing replays and the earlier
  briefing is reported in the check, never counted as this load's exposure. A
  fault while the series is open closes it as a technical failure through the
  window kit (the closed record
  `The board has a fault and is closed. Recorded answers are kept.`) and leaves
  the laboratory usable; a dialog never stays stuck after a cancelled callback;
  a fault after completion is recorded with phase `feedback` and never enters
  a value.
- Layout [D-11] (the mockup positions of preview §3.1, adjustable inside the
  contract §3.10 envelope; design px, panel-relative, 16 px text): left column
  x 12 w 714 — the unit sheet at y 90 (h 204), the test table rows at y 302 /
  340 / 378 (button w 232; the result text at x 256 w 470, h 34); right column
  x 738 w 300 — the part question at y 90 (h 72), the part tiles at y 170 /
  208 / 246 / 284, RECORD PART at y 330, CANNOT SOLVE at y 384; the step text
  at y 90 (h 112), the answer tiles at y 210 / 248 / 286 / 324, RECORD ANSWER at
  y 368, CANNOT SOLVE at y 412; the bottom row at y 462 — HELP x 12 w 160,
  LEAVE BOARD x 184 w 180, the primary control x 778 w 260; results — FINISH x
  184 w 180, BACK x 654 w 112, NEXT x 778 w 260; dialogs — text x 200 y 170 w
  520 h 72, confirm x 200 y 250 w 254, KEEP WORKING x 466 y 250 w 254; the help
  sheet text x 12 y 90 w 1026, CLOSE HELP x 388 y 462 w 260. CANNOT SOLVE is
  never adjacent to LEAVE BOARD. Footers (one line each): the card,
  acknowledgement and results views
  `TAB moves focus · ENTER selects · H help · ESC leaves (work kept)`; a case
  view
  `A-C test · 1-4 choose · R record · N cannot solve · TAB focus · H help · ESC leaves (work kept)`;
  a step view
  `1-4 choose · R record · N cannot solve · TAB focus · H help · ESC leaves (work kept)`;
  a dialog `ENTER records · ESC keeps working`; the help sheet
  `H or ESC closes the help`; a closed record `ESC leaves`.
- Wording [A]: every participant-facing string free of the tokens of contract
  §3.10 / preview §8; before the sixth first response no correctness word; no
  praise, blame or judgement; no string claims that nothing is recorded where
  tests, drafts, views or help are logged; an answer (`first_response`) is
  never conflated with a logged interaction.

(2) Telemetry, lifecycle and validation — specified before the code.

- Identity [D-7]: family `proto_m18_cases_`; ONE opportunity
  `proto_m18_cases_series`; window `m18_cases_w1`; object and surface
  `m18_diagnostic_board`; `entry_state_version` `m18-cases-v1`; `form_id`
  `m18-form-1`; `content_version` `m18-content-v1`; case ids `m18_c1` …
  `m18_c3`; test ids `m18_c<k>_ta` / `_tb` / `_tc`; part option ids
  `m18_c<k>_p1` … `_p4`; step option ids `m18_c<k>_s1` … `_s4`; slots
  `diagnosis` | `prediction`; CANNOT SOLVE is the response kind
  `cannot_solve`, never an option id. Result ids of the tests (the content's
  result keys, never shown): case 1 `tone` / `silent` for each test; case 2
  `air_6` / `air_1` (A), `air_6` / `air_1` / `air_0` (B), `hot` / `cool` (C);
  case 3 `no_gap` / `gap` (A), `none` / `on` (B), `off` / `lit` (C). The v2
  ids `proto_m18_lattice_fault_diagnosis` / `proto_m18_fault_*` /
  `m18_diagnosis_w1` / `m18-fault-v1` are retired from the route and keep their
  v2 meaning in the frozen ledger and on the developer alias.
- Events (contract §9.2; names fixed; descriptive fields may be added, none
  removed): every event carries the kit's fields plus
  `measurement_protocol_version`, `phase` (`intro` | `measurement` |
  `feedback` | `closure`), `form_id`, `content_version` and, when it concerns
  a case, `case_id` / `case_index` (1–3) and, for responses, `slot`;
  `input_mode` `pointer` | `keyboard` | `system`. Suffixes: `presented`,
  `opportunity_opened` (with the entry snapshot of (2) below),
  `intro_acknowledged`, `series_reopened` / `panel_left` (`view`),
  `prior_load_checked` (`page_load_index`, `prior_page_load_event_count`,
  `prior_opening_found`, `prior_briefing_found`, `history_continuous`,
  `prior_opening_absence_established`), `case_presented`, `test_run`,
  `press_refused`, `option_drafted` (`slot`, `option_id`, `previous_option_id`),
  `commit_requested` (`slot`, `kind`, `option_id`), `commit_cancelled` (`slot`,
  `kind`, `option_id`, `reason` `keep_working` | `panel_left`,
  `refused_presses`), `commit_press_refused` (`slot`, `kind`, `reason`
  `dialog_settling`, `since_opened_ms`, `settle_ms`; once per dialog, the
  count carried), `commit_without_draft` (`slot`), `first_response` (exactly
  one per case and slot, phase `measurement`: `slot`, `response_kind`,
  `option_id` (null for `cannot_solve`), `correct` (always false for
  `cannot_solve`), `key_option_id`, `tests_run_before` (ids), `test_runs_before`
  (incl. repeats), `drafts_before`, `help_consults_before`, `active_ms`,
  `focused_ms` (null if unavailable), `refused_presses`, `draft_at_commit`,
  `input_mode`; the test fields are those of the case at the part record, so on
  the prediction slot they repeat the diagnosis slot's), `tests_closed`
  (`tests_run`, `test_runs`), `step_presented` (`step_option_ids`),
  `response_acknowledged` (`line_id` `case_recorded`, `next_control`
  `next_case` | `show_results`, `cases_recorded`), `first_responses_completed`
  (the closure snapshot: `cases_planned`, `cases_presented`, `parts_recorded`,
  `steps_recorded`, `correct_first_diagnoses`,
  `correct_consequence_predictions`, `cannot_solve_parts`,
  `cannot_solve_steps`, `intro_acknowledged`, per case {`case_id`,
  `case_index`, `presented`, `part` {`answered`, `response_kind`, `option_id`,
  `correct`}, `step_presented`, `step` {the same four}, `tests_run` (ids),
  `test_runs`}; `closure_reason` `completed`), `results_shown` (phase
  `feedback`, `page`, `case_id`), `help_consulted` (`phase`, `view`),
  `series_closed_at_review` (the closure snapshot, `closure_reason`
  `closed_at_review`), `technical_failure` (the kit's record; the hold-back
  detail `reload after administration: board not re-run`; a post-completion
  fault with phase `feedback`), `window_closed` (the kit's). Existing logger
  `sequence` and `page_load_index` are preserved; raw logs are never rewritten;
  nothing is backdated; no event of this family enters `ScoringManager`,
  `SummaryScope`, the canonical context or the return URL.
- Entry snapshot (`opportunity_opened.entry_state_snapshot`): `cases_planned`
  3; `responses_per_case` 2; `form_id`; `content_version`;
  `assigned_case_order` [`m18_c1`, `m18_c2`, `m18_c3`]; `cases` — one record
  per case {`case_id`, `test_ids` (3, fixed order), `part_option_ids` (4, fixed
  order), `key_part_option_id`, `step_option_ids` (4, fixed order),
  `key_step_option_id`}; `prediction_target` `actual_case`; `tests`
  `on_request_unlimited`; `tests_close` `at_part_record`; `step_after`
  `part_record`; `cannot_solve_available` true; `feedback`
  `after_all_first_responses`; `stop_control` false; `settle_ms` 400; `stage`;
  `prior_m13_window_status`.
- Lifecycle (contract §3.12, both rows unless stated): not presented (no
  current-load `presented`, no opening) ⇒ `not_presented`; briefed, never
  opened, open ⇒ null `pending` (`briefed_not_opened`); open, nothing recorded
  ⇒ null `pending`; open, 1–5 responses ⇒ null `pending` with the answers in
  the components; complete (`first_responses_completed`) ⇒ `observed`,
  `completed`, stable; closed at the review with responses ⇒ the diagnosis row
  3 parts `observed` (`censored: false` — fully observed; correction round
  2; its `censor_reason` null from the closeout of 13 October 2026, the
  closure context in `closure_reason` and
  `first_response_phase_closure`), 1–2
  `incomplete` (the value on the observed denominator,
  censored), 0 null `no_eligible_event` (`intro_only` |
  `case_presented_no_response`); the prediction row 3 `observed`, 1–2
  `incomplete`, 0 with ≥ 1 part null `no_eligible_event` (`diagnosis_only`), 0
  with no part as the diagnosis row; briefed, never opened, closed ⇒ null
  `no_eligible_event` (`briefed_not_opened`, censored); interrupted (the
  hold-back, or a reloaded load without an established absence) ⇒ null
  `interrupted`; technically invalid (a fault while open — shared; or
  contradictory / malformed scored evidence with its scope [O-11]) ⇒ null
  `technical_failure` on the rows the scope names, the other row as the states
  above, read from the lifecycle. Precedence per row: `interrupted` >
  `technical_failure` > `pending` > the closed-series outcomes.
- Features (contract §10; addendum §1): `m18_correct_first_diagnoses` — value
  = numerator = cases whose FIRST `diagnosis` response is the keyed part;
  denominator = cases with a `diagnosis` first response (an option or CANNOT
  SOLVE) in the current page load; planned denominator 3.
  `m18_correct_consequence_predictions` — value = numerator = cases whose FIRST
  `prediction` response is the keyed step answer of the ACTUAL case [O-1];
  denominator = cases with a `prediction` first response; planned denominator 3. Both: the value is the NUMERATOR COUNT on 0–3 with `numerator`,
  `denominator`, `planned_denominator` and `included_ids` beside it, never a
  proportion; CANNOT SOLVE and a wrong answer in the denominator, not the
  numerator; a case without a response of the slot (unpresented, or presented
  and unanswered; a step never presented) is missing, outside the denominator,
  never incorrect, listed apart from CANNOT SOLVE; a zero denominator ⇒ `value:
null` with the lifecycle's disposition; `planned_denominator` 3 on every row;
  a closed-series row with no response of its slot exports `denominator: 0`
  with `numerator: null`; a `pending`, `interrupted`, `technical_failure` or
  `not_presented` row asserts no denominator, its components still carrying
  `answered` / `planned` per slot. Tests run, drafts, help, time and input mode
  never change either count. Both rows recounted from the `first_response`
  events (correctness recomputed from the content's keys) and compared with
  each event's `correct` flag and with the closure snapshot, each comparison
  with its scope [O-11]. Components (mirrored on both rows unless stated):
  `administration_version`, `form_id`, `content_version`, `prediction_target`
  `actual_case`, `assigned_case_order`, `realised_case_order`,
  `observations_share_one_episode: true`, `exposure` (`briefed` with its
  sequence, `board_opened` with its sequence and `stage_at_open`,
  `intro_acknowledged`, `cases_presented`, `steps_presented`,
  `never_opened_reason`), `reload_check`, `first_response_phase_complete` and
  `first_response_phase_closure`, per slot (`slots.diagnosis` /
  `slots.prediction`) `answered`, `planned`, `cannot_solve_count`,
  `unanswered_case_ids`, `unpresented_case_ids`, per case (`cases`) `part`
  {`response_kind`, `option_id`, `correct`, `key_option_id`} and `step` {the
  same}, `tests_run_before_part`, `test_runs_before_part`,
  `repeated_test_runs`, `evidence_sufficient_before_part`,
  `step_answer_implied_by_recorded_part`, drafts, help consults, active and
  focused time, input modes per slot, `help_consults` by phase, `results_shown`
  per page, `feedback_phase_faults`, `prior_m13_window_status` (route context),
  `investigation_record_consistent` (overall and per case),
  `exposure_record_consistent`; on a voided row `integrity_defect` (every
  defect found, each with its record's `sequence` and its scope),
  `defect_scope` (`shared` | `diagnosis` | `prediction` |
  `isolation_uncertain`), `isolation_failed` (when uncertain) and
  `records_unscorable`; on a retained row beside a voided one
  `other_row_defect`. No total across slots or items; the legacy families are
  never read.
- Descriptive indicators [O-10] (provisional; never in a value): per case
  `step_answer_implied_by_recorded_part` — `true` / `false` only when both
  responses are valid ordinary option responses (attributable, `response_kind`
  exactly `option`, a known option of its case and slot, no defect on either
  record) and the comparison is trustworthy (no `shared` or `uncertain` defect
  in the load, no disagreement in the case's per-case `part` or `step` fields
  of a closure snapshot): `true` when the recorded step option is the option the
  recorded part implies under the content's implied-by table (preview §5.2:
  case 1 MAST 4, CABLE 4, AMPLIFIER 2, FILTER 3; case 2 FAN 3, DUCT 4, GAUGE 2,
  HEATER 1; case 3 HATCH 4, SENSOR 4, LOCK 1, WINCH 2), `false` for any other
  option; `null` otherwise (either response missing or CANNOT SOLVE, or the
  evidence invalid). `evidence_sufficient_before_part` — `null` when the case
  has no attributable diagnosis record or its investigation record is not
  trustworthy (`investigation_record_consistent` false for the case, or the
  load's final scope `shared` / `isolation_uncertain` — then BOTH indicators
  of EVERY case are null: owner clarification of 13 October 2026, §5.327);
  otherwise from the reliable
  `test_run` records sequenced before the case's diagnosis record (a CANNOT
  SOLVE diagnosis included): `true` when those tests leave exactly one
  consistent part under the content's table, `false` when more than one. An
  isolated defect of a DETERMINATE diagnosis record (a defective `correct` /
  `key_option_id`, a later duplicate, a snapshot count) does not make it
  null; a diagnosis defect that leaves the part undetermined — a
  `response_kind` that is neither value, an `option` response with a missing
  or unknown `option_id`, a CANNOT SOLVE record carrying an option or without
  the field, or a closure-snapshot `part` whose kind or option disagrees with
  the record — fails I4 and makes it null (contract §10; scientific review,
  correction round 2); from the closeout of 13 October 2026 any I4 failure
  (also a determinate record's duplicate between the next case's
  presentation and completion) nulls both indicators of every case (§5.327).
  They describe evidence availability and response consistency only — never
  why an answer was wrong.
- Two points of the extractor's defect list and components, disclosed at the
  scientific review (correction round 2; §5.326) and settled by the closeout
  of 13 October 2026 (§5.327; §4 "Unit 20 closeout" (3), (4)): (i) a
  sequencing check that an earlier response would satisfy is withheld from
  `shared` only while an EARLIER uncertain-attribution record could be that
  response (its possible case and slot cover the missing one — the ordering
  cannot be established independently of it; both rows are voided
  `isolation_uncertain` and the record is listed); an unrelated earlier
  record, a later record or a missing step presentation leaves the proven
  defect `shared`, listed beside the uncertain record, `shared` taking
  precedence; the completion count still includes uncertain records, so an
  uncertain sixth response never invents a "fewer than six" defect; (ii) the
  per-case `part.correct` / `step.correct` in the components is the recount
  against the content key, documented as such in the extractor — the
  record's own `correct` flag is compared and never overwritten, a
  disagreement is listed as a defect of that slot, and on a voided row the
  recount is informational only (no raw-flag component is required — owner,
  13 October 2026).
- Validation (contract §9.4; the extractor `features/m18.ts`, current-load
  events only, the raw log read, never changed). Scope classes [O-11]:
  `shared` (voids BOTH rows — administration: versions, opportunity, the
  required declarations; content: case definitions, keys, result lines;
  sequencing: usable order, presentation order, response order; exposure: a
  test outside its window or of another case, an option or step named before
  it was presented, a step before its part, results or a results help view
  before completion; the shared lifecycle: completion, closures, a presentation
  or test after a closure; a fault while open); `slot` (a defect inside one
  response slot's own records — a `first_response` of that slot, a duplicate,
  a response after a closure, that slot's fields of a closure snapshot — voids
  only that row when the isolation test I1–I4 passes, otherwise both rows as
  `isolation_uncertain` with `isolation_failed`); `uncertain` (a record not
  attributable to exactly one slot and case: no / unknown case or slot, an
  option id of another case or of the other slot, a response labelled outside
  the measurement phase — both rows `isolation_uncertain`); `flag` (a
  descriptive record inconsistent — `investigation_record_consistent` or
  `exposure_record_consistent` false, the dependent indicators null, neither
  row changed). Labels: `shared` > `isolation_uncertain` > the own slot; slot
  defects in both slots and nothing else void both rows, each labelled with its
  own slot. The isolation test: I1 no `shared` or `uncertain` defect in the
  load; I2 every defective record of the slot attributable (a known case and
  slot, no option of another case or the other slot, a usable unique sequence,
  phase `measurement`, valid version, opportunity, form and content); I3 the
  other slot clean (its own defect voids its own row with its own label); I4
  the structure the other slot depends on intact and not formed by the
  defective content — for a DIAGNOSIS defect the case's earliest diagnosis
  record DETERMINATE (a valid kind; a part option of the case for `option`,
  present and null for `cannot_solve`), the defect only in `correct` /
  `key_option_id`, the snapshot's diagnosis count fields or per-case
  `part.correct`, or a later duplicate; `tests_closed` and `step_presented`,
  where they exist, after the earliest record with no `test_run` between; the
  case's prediction, where it exists, after its `step_presented`; a duplicate
  diagnosis after the case's prediction and either before the next case's
  `case_presented` (if any) or after `first_responses_completed`, or of a case
  with no prediction record (a duplicate between the next case's presentation
  and completion FAILS; an undetermined earliest record, a snapshot
  `part.response_kind` / `part.option_id` disagreement and a duplicate before
  an existing prediction of its case FAIL); for a PREDICTION defect the next
  case's `case_presented`, where it exists, after the case's earliest
  prediction record, and a duplicate prediction after the first and either
  before the next case's `case_presented` (if any) or after
  `first_responses_completed` (between the next case's presentation and
  completion FAILS); a response after a closure for a case and slot with no
  earlier record isolable when I1–I3 hold, never counted. The lifecycle (open /
  complete / closed), the six-response completion and each slot's `answered`
  are read from ATTRIBUTABLE response records written before any closure (one
  per case and slot, the earliest by sequence, whatever their content; an
  uncertain record counts as one present record for the completion check only).
  Closure snapshots compared field by field by scope: shared fields
  (`cases_planned`, `cases_presented`, per case `presented` and
  `step_presented`, `closure_reason`) against the presentation recount;
  diagnosis fields (`parts_recorded`, `correct_first_diagnoses`,
  `cannot_solve_parts`, per case `part`) only against the diagnosis recount;
  prediction fields (`steps_recorded`, `correct_consequence_predictions`,
  `cannot_solve_steps`, per case `step`) only against the prediction recount;
  `tests_run` per case a flag; a slot already voided by a record defect not
  compared again (its snapshot disagreement noted in the same
  `integrity_defect`). The table of conditions is contract §9.4 (every row with
  its scope and justification), implemented condition by condition — in
  particular the required declarations `form_id`, `content_version`,
  `cases_planned` (the number 3), `responses_per_case` (the number 2),
  `assigned_case_order`, `cases` (three records, each a known case once, tests,
  part options and step options equal to the content's in fixed order, both
  keys the content's; storage order free, additive fields allowed),
  `prediction_target` `actual_case`, `tests` `on_request_unlimited`,
  `tests_close` `at_part_record`, `step_after` `part_record`,
  `cannot_solve_available` true, `feedback` `after_all_first_responses`,
  `stop_control` false — each `shared`; `settle_ms`, `stage` and
  `prior_m13_window_status` NOT validated (read into the components). A
  reloaded load without its own `opportunity_opened` is `interrupted` before
  any position is compared unless its own `prior_load_checked` record(s)
  establish the absence with the flags agreeing. Legitimate missingness is
  never a technical failure; a well-formed CANNOT SOLVE (`cannot_solve`,
  `option_id` null, `correct` false, the content key) is a valid, incorrect
  response in its slot's denominator; missing, CANNOT SOLVE and technical
  failure are three distinct outcomes.
- Precedents applied, with their sources: the fresh-press rule and the settle
  (M02 §5.210, M13 §5.262, M14, M15, M16 [P]); tests closing at the part (M15
  D-U18-1 item 2 [P]); the consistency indicator's null convention (M15
  `consistent_with_recorded_wiring` [P]); briefing exposure and non-use (M15 /
  M16 [P]); the reload check and hold-back (§5.284, §5.290 (a) [P]); event
  order from usable, unique sequences (§5.259 [P]); the wide frame (D-U17-2
  [P]).

(3) Build. Files (inside the 17-path allowlist of contract §4): NEW
`src/pilot/windows/m18DiagnosisContent.ts` (pure: the identity constants, the
three cases with their sheets, tests, result lines, "if at fault" tables,
part and step options, keys, implied-by tables and results lines, every
fixed string, the string lists for the wording tests), NEW
`src/pilot/windows/m18DiagnosisModel.ts` (pure: the series state machine —
card, cases, tests and the test record, drafts per slot, the confirmations
with the fresh-press rule, the settle on every transition with the
`press_refused` record, the first-response freeze, `tests_closed`, the step,
the acknowledgement, completion, results pages, help, the review closure, the
fault, the hold-back; the entry snapshot; the closure snapshot; the
prior-administration predicate and the `prior_load_checked` builder), NEW
`src/pilot/windows/m18DiagnosticBoard.ts` (the adapter: the `ItemWindow`,
the log sink with the protocol stamp, the focused clock with per-case,
per-slot marks, the reload guard, `presentM18`, `declareM18Cases`,
`guardM18Reload`, `openM18(nowMs, { stage, prior_m13_window_status })`, the
commands, `m18ConsumesEsc`, `closeM18Surface`, `resumeM18Surface`,
`closeM18AtReview`, `bindM18Surface`, `m18Window`, `resetM18State`), NEW
`src/pilot/windows/m18SurfaceModel.ts` (pure: the work-surface model in the
wide frame), `src/pilot/windows/reviewClosure.ts` (one import, one
`closeM18AtReview(nowMs)` call after `closeM16AtReview` with its comment),
`src/scenes/DiagnosticsLaboratoryScene.ts` (the legacy import replaced by the
adapter's and the surface model's; `declareM18Cases()` and
`guardM18Reload()` in `create()`; `resumeM18Surface` in the RESUME handler;
the `m18` PHASES entry's status → `m18Window.windowStatus()` and
`opportunityId` → `proto_m18_cases_series`; a dedicated `m18` station branch
opening the adapter with the stage and the route context and the work surface
`m18_diagnostic_board` in the wide frame with the ESC order; the private
`m18SurfaceHost()`; `presentM18(now)` in each of the four `lab_brief_ack*`
handlers; the header comment's M18 lines; the Training Rig branch keeps
`ipStation`), NEW `src/measurement/features/m18.ts` (the read-only extractor
producing both rows), `src/measurement/features/index.ts` (one import),
`src/measurement/registerV3.ts` (the `M18` entry's explicit v3 route,
`implementation_status: 'implemented'` and a comment; the feature rows
unchanged), NEW `e2e/m18_diagnosis.spec.ts`, NEW
`e2e/m18_diagnosis_route.spec.ts`, `e2e/pilot_lab.spec.ts` and
`e2e/pilot_signal_incident.spec.ts` (the M18 steps and identity assertions
re-expressed), and the four documents. Untouched, byte-identical to the base
(SHA-256 pinned in the pure spec): `m18FaultDiagnosis.ts`, `faultForms.ts`,
`ui/DiagnosisConsoleScene.ts`, `src/measurement/m18Diagnosis.ts`;
`windowKit.ts`, `WorkSurfaceScene.ts`, every helper, every other item.
Events: exactly the family and suffixes of (2) above, with the additive
descriptive fields `view` and `control` on a settle-refused press and
`responses_per_case`, `intro_acknowledged` and per-case `test_runs` on the
closure snapshot. Formulas: as (2) — the numerator count on 0–3 with
`numerator`, `denominator`, `planned_denominator` 3 and `included_ids`
beside it on every row. Eligibility: a case enters a slot's denominator with
its attributable earliest first response of that slot written before any
closure; CANNOT SOLVE is inside, missing outside. Timing: the settle 400 ms;
the dialog's fresh-press window 400 ms; the same-test repeat window 400 ms;
no other clock. The legacy module's disposition: [D-10].

(4) Defaults as implemented (§5.316–§5.325; each owner-visible and
reversible): D-2 the card shown again if the board is left before START CASE
1, its acknowledgement recorded; D-3 drafts per slot, toggled by the same
tile, kept across leaving; D-4 the fresh-press rule, the settle on every
transition (a press that would have acted inside the settle logged as
`press_refused`, target `view`, reason `settling`, with the view and the
control refused — no M16 precedent logs it; the contract's §9.2 defines the
suffix), the same-test repeat refusal, the opener / confirm distinction, the
neutral landing on every view (the card text, the part question, the step
text, the acknowledgement line, the results text — on every page, the page
controls' ids carrying the page (correction round 2) — the closed-record line
— each a text block whose activation does nothing, first in the focus order;
LEAVE BOARD, the leaving ESC and the help sheet's ESC not settle-gated, a
consumed ESC and an early KEEP WORKING not logged — the M16 precedent),
the confirm control first in a dialog, CLOSE HELP first on the help sheet;
D-5 help on every live view, logged with the phase and the view; D-6 the
dispositions and reasons of (2); D-7 the names of (2); D-8 the §5.259 order
convention; D-9 the companion definitions of (2); D-10 the legacy board
unchanged on the developer alias; D-11 the layout of (1) "Layout" with these
details decided in the build — the help sheet's text block at y 90 (not the
mockup's y 56, which would overlap the status line), h 300, carrying the
help title `HOW THE BOARD WORKS` as its first line under the kept header
and status line, with CLOSE HELP at x 388 (the preview's own position); the
card text at y 90 inside its 200 px landing box under an empty status row
(the mockup sets it directly under the header); the results text block at y
90, h 360 (its box ends 12 design px above the bottom row; the text uses at
most 128 px of it); the test table's buttons rendered as
labelled readouts (kind `readout`, not focusable) once the tests are closed;
the closed record's counts line `Parts recorded: P of 3 · planned steps
recorded: S of 3.` in the STATUS line for the review closure and a fault, and
an EMPTY status for the reload hold-back (whose counts belong to the earlier
page load — the M16 precedent); the probe / test ids `intro_text`,
`start_case`, `question`, `sheet`, `test_a` … `result_c`, `part_1` … `part_4`,
`record_part`, `cannot_solve`, `step_text`, `answer_1` … `answer_4`,
`record_answer`, `acknowledgement`, `next`, `results_text`, `results_next_1`
/ `results_next_2` and `results_back_2` / `results_back_3` (the page in the
id, so a page change lands on the results text — contract §3.5; correction
round 2), `finish`, `close_help`, `help_text`, `confirm`,
`keep_working`, `dialog_text`, `record_text`, `help`, `leave`.

(5) Tests written. Pure `e2e/m18_diagnosis.spec.ts` (51 tests): the
independent oracle (i)–(viii) with its own transcription of the three sheets,
tests, options and planned steps and its own simulator per case (every table
cell, the authored results, exactly one consistent part, both keys, the
symptom, the §5.1 consistent and sufficient sets, the §5.2 implied-by table,
the options implied by no part, the wrong part implying the key, the case 2
margins, the key positions, the §5.3 shortcut table computed and REPORTED and
reproduced against the preview's figures, the uniqueness checker accepting
the three genuine cases and rejecting the four mutants — the equality
mutant through the comparison pairs derived from the hand physics table, a
stuck HEATER giving 12 units of heat; correction round 2); the content
cross-check (every string as transcribed; the fixed-line limits; the four
briefing handlers by source); the register rows, the schedule, the family
disjointness, the legacy-only log, the legacy hashes, the single declaring
module, the review closure order; the series model (no correctness
information in every state, the identical acknowledgement and status echo, a
results request refused, the results pages, the order and tests, the
immutability, the fresh-press rule, the settle on every transition with the
recorded refusals, help, leaving, the review closure, the reload predicate
and check, the fault, the entry snapshot and suffixes); the extractor (the
values and companions, stability, partial and open series, zero evidence and
legitimate missingness, the reload cases, the fault, the §9.4 table by scope
— administration, content, sequencing, exposure, lifecycle, sequences,
uncertain attribution — the acceptance cases X1–X6, the flags, determinism,
no mutation, the equality with the full extraction, the numerator-count
convention); the wording. Browser `e2e/m18_diagnosis_route.spec.ts`:
R1–R9 as contract §12 B1 with the twenty-eight frames of §13. Re-expressed:
`pilot_lab.spec.ts` (the arrival test opens the board as a work surface and
asserts its distinctness; the stops test opens and leaves the board
unfinished with both rows `pending`; the independence test keeps its two M13
histories and asserts the snapshot equal apart from the stamp and the stage),
`pilot_signal_incident.spec.ts` (the full case drives the three cases by
mixed pointer and keyboard input; M18 leaves the IP-family loops; an explicit
M18 check of equivalent strength; the M18 window's active time in the
envelope sum).

(6) Limitations (restated; nothing beyond the ruling's): six clustered
responses of three independently designed cases at one board in one episode,
never independent situations; one authored form, fixed order, case and
position confounded, first contact in case 1, no practice case; cases not
equated; chance 1/4; the companion dependent on the diagnosis (case 3's step
key shared with HATCH; case 3's step needing less evidence than its
diagnosis); the disclosed cues of preview §5.3; rules always visible (a
ceiling plausible); test use recorded, never adjusted for; the descriptive
indicators describe evidence availability and response consistency only; a
session ending while open exports `pending`; after a reload prior exposure
is uncertain, never proven absent (§5.290 (a)); the route's `valeHandover`
declines the M05 lamp job, so no scenario verifies M05 timing; passing tests
establish implementation correctness only. Not updated (U24 backlog): the
capture specs, the registry's `lab.phase_m18` `opens` and window label,
`world_v1_*` evidence, Noor's "test rig" line. Carried forward unchanged and
open: the M16 beacon (§5.314 (4)); the M05 matters of §5.290 (e) (i) and the
episode-1 cap; the U18 salience observation H1 (§5.301).

(7) Evidence. The twenty-eight frames of contract §13 in
`.playwright-mcp/u20-evidence/` (`01-laboratory-diagnostic-board-prompt`
… `28-wall-display-after-m18-recorded`, 800 × 600 except
`24-canvas-1080-case-3-with-draft`), plus the twelve R7 frames
`c1-courier-new-*` and `c2-lucida-console-*` (card, case-1 step with a
draft, case-2 all tests with a draft, case-2 step with a draft, help over
case 2, part confirmation), all written by `e2e/m18_diagnosis_route.spec.ts`
on the participant route and copied to the session scratchpad. The R7
envelope at both fallback fonts: content bottom 502 design px, feedback top
554 (Courier New) / 552 (Lucida Console), spare 52 / 50 design px on every
full view (the confirmation dialog 264 / 262); every text block inside its
box (the sheet 150–176 of 204, the help text 150–160 of 300, the results
text 90–128 of 360, every tile and button 15–16 of 34). The matrix (S1–S7,
P1, P2, B1 R1–R9, B2) run once by the Sonnet test-reviewer, the three
failures with their base comparisons, the correction-round rerun and the
three Opus reviews: `UNIT-LOG.md` "U20 results". The pure spec's reported
shortcut table (`[M18 oracle]`, reproduced against preview §5.3): parts —
always option 1 / 2 / 3 / 4 = 0 / 1 / 1 / 1 of 3; a part named in the Now
line 0; the part on button A / B / C = 0 / 0 / 1; a part on no button and
not in Now 0.83; a part in an abnormal-looking result line 0.50; symptom
only 0.75; one test then a uniform pick 1.17 (each of A, B, C); steps —
"repairs everything" 1, "nothing changes" 1, always option 1 / 2 / 3 / 4 =
1 / 1 / 0 / 1; reported, never a ceiling.

**Unit 20 closeout (M18; 13 October 2026)** — one bounded closeout under the
research owner's closeout authorization of 13 October 2026 (`UNIT-LOG.md` "U20
closeout authorization", recorded verbatim before the first source edit; the
owner's indicator clarification in §5.327); the "Unit 20 (M18): as-built"
record above stands except where this record says so. **Status: the kit
window's pause on leaving corrected, both descriptive indicators nulled for
every case of a `shared` or `isolation_uncertain` load, the
sequencing-suppression rule narrowed to an earlier uncertain record that could
be the missing response, the censor reason nulled on an uncensored row; no
authored content, key, option, version, event name, scoring formula, planned
denominator, missing-answer rule or administration identity changed; the
original commit `2eed381` preceded the resolution of the owner clarification;
NOT scientifically validated.**

(1) Pause timing (authorization §2; §5.326 (l)). Reproduced first on the
participant route — `e2e/m18_diagnosis_route.spec.ts` R10 on the unfixed
adapter: FAILED as reported — the review closure of a board left from the step view
recorded `active_ms` 88999 against 9449 ms on the board, the 79253 ms between
the ESC departure and the closure having accrued (LEAVE BOARD by click,
3 s away and a reopening first; log `closeout-r10-before-fix-2.log`). Cause: `WorkSurfaceScene.close()` resumes the
laboratory scene, whose RESUME handler calls `resumeM18Surface`, which
resumed the kit window right after `closeM18Surface` had paused it; a
reopening (`openM18` → the kit's `open`) resets the open timestamp, so the
spurious resume accrues only when the window is STOPPED without a reopening
after the departure — the review closure of a left board (a first R10
design that reopened and completed the series passed on the unfixed adapter
for that reason and was replaced). Correction (`m18DiagnosticBoard.ts`):
`resumeM18Surface` resumes the kit window only while the series'
`panel_open` is true (a pause of the whole scene over an open board); after
LEAVE BOARD or ESC the window stays paused until the real reopening, whatever
resumes the scene meanwhile — the surface's own close or another bench's. The
scene handler, the model, drafts, tests, responses, help and dialog behaviour,
completion and closure handling, the focused clock and the per-slot times are
unchanged; M15 / M16 keep their own handlers (U24 backlog). R10 after the fix:
passed (3.0 min; the test-reviewer's run 3.1 min; log `closeout-r10-after-fix.log`): the closure's `active_ms` within 1.5 s of the time on the board, the ≥ 10 s interval between the ESC departure and the closure not accrued; one presentation of case 1 and of its step, one response, one `window_closed` (`closed_at_review`), one `opportunity_opened`, the closure snapshot 1 / 1 / 0. The pure spec asserts the guard in the adapter's source beside the
scene's unchanged `resumeM18Surface(Date.now())` call. Review note (Opus,
MINOR): only R10's second departure (ESC, then the closure without a
reopening) discriminates the old defect — a departure followed by a reopening
never showed it, because the kit's `open` resets the timestamp; the click
departure is covered by the one shared pause path (`host.close` →
`closeM18Surface` → the surface close → RESUME, the same as ESC's
`onClose`), and R10's title says so.

(2) The indicator clarification (§5.327) as implemented (`features/m18.ts`):
`trustworthy` is "no `shared` defect and no isolation failure"
(`isolationFailed === null`), so `evidence_sufficient_before_part` and
`step_answer_implied_by_recorded_part` are null for every case when the
load's final scope is `shared` or `isolation_uncertain` — an uncertain
record (I1), an undetermined part or any other I4 failure, including a
determinate record's duplicate between the next case's presentation and
completion; under genuine isolation each case keeps its treatment (an
isolated prediction defect leaves every case's evidence indicator and the
other cases' consistency indicator at their hand values — X1 asserts `true`;
an isolated diagnosis defect of a determinate record keeps `true` — X2 and
X4's isolated pair). X4 asserts both indicators null on all three cases of
both rows for each of its eleven `isolation_uncertain` loads (the
typeof-boolean assertion of §5.326 (r) removed). No value, key, denominator
or missingness rule changed.

(3) Sequencing beside uncertain records (authorization §4; §5.326 (h)).
Established first: the walk is in event order, so only an EARLIER uncertain
record ever suppressed a check — but any such record did, whatever it could
be: a case-1 record without a slot suppressed a provable case-2
step-before-diagnosis defect (X7 (b) on the unfixed extractor:
`isolation_uncertain` where `shared` is proven). Corrected: each uncertain
record carries the (case, slot) pairs it could be — an unknown case ⇒ any
case with the recorded slot (or any slot); an unknown slot ⇒ either slot of
its case; an option of another case or of the other slot ⇒ the recorded pair
or the option's pair; a response outside the measurement phase ⇒ its recorded
pair — and each sequencing check names the missing response; the defect is
`shared` unless an earlier uncertain record could be that response. A missing
step presentation is never a response record: `shared`. Precedence unchanged
(`shared` over `isolation_uncertain`), the uncertain record stays listed,
no attribution is inferred and no record repaired; the completion count still
includes uncertain records (an uncertain sixth response invents no "fewer
than six" defect). X7 (a)–(d) cover the four situations with exact defect
lists (the step draft and its confirmation request naming a step option
before any step presentation are shared defects of their own and are listed)
and assert both indicators null for every case under `shared` as under
`isolation_uncertain` (review MINOR). Disclosed (review MINOR, owner-visible,
not changed): for a response whose option belongs to another case AND the
other slot, the candidate set holds the recorded pair and the option's pair
only — the two cross readings (the recorded case with the option's slot, the
option's case with the recorded slot) are left out, so a sequencing defect
that one of those readings would explain is reported `shared` rather than
withheld; both rows are voided and every indicator null either way.

(4) Output (authorization §5). A row closed at the review with every planned
case answered: `censored: false`, `censor_reason: null`,
`closure_reason: 'closed_at_review'` and `first_response_phase_closure` in
the components — three parts observed beside two steps incomplete (the pure
"one to five" test); genuinely censored rows keep their reason. Per-case
`part.correct` / `step.correct` stay the recount, now documented in the
extractor; the record's flag is compared and a disagreement listed. The
"case / 1?" wrap kept (no edit, no decision). Presentation and other-item
matters stay in the U24 backlog.

(5) Reporting corrected (authorization §5). The U20 pass was not
exception-free: the S4 Prettier check failed on `IMPLEMENTATION-MATRIX.md`
(the base's 28-row table hunk, inside which U20's M18 row sits in the same
style) and on `UNIT-LOG.md` (55 hunks identical to the base's — inherited —
AND ten hunks introduced by U20's own verbatim contract reproduction: three
tables left unpadded, one list continuation line, six blank lines; "U20
results" had called both files' flags inherited, wrong for those ten); the two
pre-existing P2 gate failures stood; the commit hooks did not run (the hooks
path `.husky/_` is absent in this worktree; not installed or reconfigured);
the owner clarifications of §5.326 were open at the commit. Nothing historical
was reformatted; the ten hunks stay as pasted and are reported as U20's own.

(6) Files (inside the ten-path closeout subset): `features/m18.ts`,
`m18DiagnosticBoard.ts`, `e2e/m18_diagnosis.spec.ts` (X7 new, X1 / X4 and
the review-closure test extended, the adapter guard asserted),
`e2e/m18_diagnosis_route.spec.ts` (R10 new), this register, the addendum §2
and `UNIT-LOG.md`; untouched: `m18DiagnosisModel.ts`,
`DiagnosticsLaboratoryScene.ts`, `IMPLEMENTATION-MATRIX.md`. Evidence and
the review: `UNIT-LOG.md` "U20 closeout results".

**Unit 19 closeout (M16; 12 October 2026)** — one bounded closeout under the
research owner's closeout rulings of 12 October 2026 (§5.314; `UNIT-LOG.md`
"U19 closeout", the instruction recorded verbatim before the first source
edit); the "Unit 19 (M16): as-built" record below stands except where this
record says so. **Status: two participant-facing instruction strings added and
one footer re-worded under owner ruling 3, five contextual strings and one
soft wrap accepted under rulings 1 and 2, the extractor's entry-snapshot check
corrected to validate the complete declared task definition; no authored
content, answer key, option, version, event name, scoring formula, threshold
or administration identity changed; NOT scientifically validated.**

(1) Controls named (ruling 3). `m16HandlingContent.ts`: `footer_card` — the
footer of the first-opening card and of both worked-example views (the surface
model uses it for those three views only) — is now
`TAB moves focus · ENTER selects · H help · ESC leaves (work kept)`;
`help_lines` carries `TAB moves focus. ENTER selects the focused control.` as
a separate line immediately before the approved `Keys:` line (eight lines; the
help sheet's 300 px box holds the title, a blank and the eight lines on ten
lines under both forced fonts). The results footer, the vial / acknowledgement
footer, the dialog, help and closed-record footers and the fault line are
unchanged (rulings 1 and 3). The focus landings, the tab order, the hotkeys,
the 400 ms fresh-press rule, the settle and every commitment protection of §4
"Unit 19" (1) are unchanged. The distinction the contextual strings document —
leaving a view, cancelling a confirmation, closing HELP — is written out in
§5.314 (1).

(2) The vial question's soft wrap (ruling 2). Accepted for that one string;
the rule card, the example blocks, the vial labels and the results blocks keep
their fixed lines, and R7 now also measures the first-opening card (seven
lines), example 1, example 2 and the help sheet (ten lines) under both forced
fonts, and checks that the card and example footers render on ONE line (the
feedback line's position compared with its position under the help sheet's
one-line footer; the question-only approval does not extend to the footer).
Nothing about text size, scrolling or layout was relaxed.

(3) Entry-snapshot definition (ruling 6). Reproduced first: a focused pure
test against the committed extractor (`3e24f5c`) showed the six correct vial
records accompanied by a conflicting duplicate of `m16_v2` and an extra
unknown record `m16_v7` accepted as `observed` 6 of 6 (`UNIT-LOG.md` "U19
closeout results", the reproduction log). `features/m16.ts` now validates the
complete declared task definition at `opportunity_opened`: a list of exactly
six records; each a record of a known vial, none twice; each with exactly four
unique option ids in the content's fixed order and with the content's key —
otherwise `technical_failure` with the defect named (no vial list; a count
other than six; a non-record; an unknown vial; a vial twice; options
disagreeing; a key disagreeing). The responses' rules are untouched: the new
pure test asserts `observed` on the genuine definition (also with the records
in another order and with an additive field on every record), `pending` with
two answers and the series open, `incomplete` 2 of 2 with two answers closed
at the review, `no_eligible_event` with none, beside nineteen malformed
definitions (the reported counterexample in three forms, an identical
duplicate, an extra unknown record, five records, an unknown vial in place of
a known one, one vial twice and one missing, a duplicate option id, the
options out of order, a fifth option, another vial's key, a record without its
options or its key, a null record, a string record, no records, a string in
place of the list, the list absent) and, after the Opus confirmation
(correction round 1, tests only), a defective definition with none or two
answers, open or closed at the review, as `technical_failure` with the defect
named and no answered ids (the defect is found at the opening, before any
response is read; the responses stay in the raw log), the raw log
byte-identical before and after extraction, and a reloaded load without its
own opening `interrupted` whatever the earlier load's definition. The raw log
is read, never changed. The owner question the confirmation surfaced
(`vials_planned` and `assigned_vial_order` as part of the declared definition)
was recorded in §5.314 (6) and is resolved by the owner's correction of the
same day — (9) below.

(4) Frame 25 (ruling 5). Frame 25 is contextual imagery; the completion state
rests on R8's probe assertions. A supplementary capture was feasible without
product change: the new route test "R8 supplementary capture" (the series at
`canvas=1080`, then a test-side 2560 × 1440 viewport, which the
FIT-letterboxed canvas filled) saves the whole frame and the display region
clipped to `.playwright-mcp/u19-closeout`
(`27-wall-display-after-m16-recorded-2560x1440.png`,
`27a-wall-display-close-up-2560x1440.png`); the close-up shows the "PHASE 1 /
4 — CAUSAL MODEL" indicator and the three tick marks legibly (the lamp tone
outside the clip, not claimed).

(5) The beacon (ruling 4): unchanged; the salience question is carried as an
explicit U24 walkthrough issue (§5.314 (4)).

(6) Documentation. §5.314 (the rulings as implemented, the reporting
corrections); §5.313 closed by cross-reference; the addendum §2 "U19" (the
definition rule, the closeout reference); the matrix (the M16 row, the "U19
closeout" paragraph); `UNIT-LOG.md` "U19 closeout" and "U19 closeout results".

(7) Changed files (eight of the ten paths the instruction permits, all inside
the unit's 18-path allowlist): `src/pilot/windows/m16HandlingContent.ts`,
`src/measurement/features/m16.ts`, `e2e/m16_handling.spec.ts`,
`e2e/m16_handling_route.spec.ts`, this register, the addendum, the matrix and
`UNIT-LOG.md`. Not touched: `m16HandlingModel.ts` and `m16SurfaceModel.ts`
(permitted, not needed), `m16ProtocolConsole.ts`, `reviewClosure.ts`,
`DiagnosticsLaboratoryScene.ts`, `registerV3.ts`, `features/index.ts`, the
three re-expressed specs, `windowKit.ts`, `WorkSurfaceScene.ts`, the shared
framework, the legacy module (hashes unchanged), any other item.

(8) Test evidence (12 October 2026; commands, counts and every exception in
`UNIT-LOG.md` "U19 closeout results"). Final verification by the test-reviewer
(Sonnet 5.5, as a general-purpose agent on Sonnet reading the role file — the
documented fallback; logs `closeout\final\` in the session scratchpad), on the
final source before correction round 1: tsc exit 0; build exit 0; ESLint with
the Prettier rule clean on the four changed `.ts` files; Prettier clean on
them and on the register and the addendum, the matrix and `UNIT-LOG.md`
flagged for the inherited reasons; `git diff --check` clean; verify-unit:
whitespace clean and every changed path inside the allowlist, exit 1 only for
the ten untracked files under `.agents/` and `.codex/` (unrelated, present
before the closeout, preserved as instructed, never staged); pure
`e2e/m16_handling.spec.ts` 49 passed; browser R1 and R9 2 passed (10.6 min);
R7 under both forced fonts 2 passed (4.1 min — the first-opening card 105 /
112 px on seven lines, the help sheet 150 / 160 px on ten lines inside its 300
px box, the feedback line at design y 554 / 552 on the card, both examples,
the help sheet, the vial view and results page 2 alike, so the card and
example footers are one line; spare 52 / 50 px; the question 45 / 72 and 48 /
72 px); the R8 supplementary capture 1 passed (2.0 min; canvas box 2560
× 1440). Correction round 1 (tests only, after the Opus confirmation) was
followed by the test-reviewer's rerun of the affected checks (tsc, ESLint and
Prettier on the spec, `git diff --check`, verify-unit, the pure spec): tsc
exit 0; ESLint and Prettier clean on the spec; `git diff --check` clean;
verify-unit as before (the ten untracked paths only, nothing else); the pure
spec 49 passed (3.9 s); no failure, no retry; the changed files the seven of
the first run (the register's closeout text was spliced after this rerun and
checked by the document-only rerun reported in the handoff). The documents
were written after that rerun; the document-only checks (Prettier on the
register and the addendum, `git diff --check`, verify-unit) were then rerun by
the test-reviewer and reported in the handoff. Opus 5.5 confirmation
(read-only; none of it an approval): points 1–3 CONFIRMED WITH NOTE — the
check enforces the ruling, the fixed option order read as consistent with the
approved administration, the missingness and reload paths untouched, the raw
log read only; three test recommendations adopted in correction round 1; one
owner question surfaced (§5.314 (6)).

(9) Correction of 12 October 2026 — planned count and assigned order (the
owner's instruction, `UNIT-LOG.md` "U19 closeout correction"; §5.314 (6) as
resolved). `features/m16.ts` now validates, at `opportunity_opened` after the
form and rule check and before the record check, that the entry snapshot's
`vials_planned` is the number 6 and that its `assigned_vial_order` is exactly
`m16_v1` … `m16_v6` in order — the count and order the approved administration
already fixes; otherwise `technical_failure` with the defect named. The
storage order of the six per-vial records stays unrestricted; six planned
vials are never six answers; the responses' rules, the missingness
dispositions, the closure and reload handling and the raw log are untouched;
no other snapshot field was added to the validation (§5.314 (6) lists which
fields are and are not validated). The new pure test "entry snapshot planned
count and assigned order (correction, 12 October 2026)" asserts the kit's
values, `observed` 6 of 6 with the fields as approved and with the records
stored in reverse, the valid partial session of two answers (`pending` open;
`incomplete` 2 of 2 censored at the review, `vials_planned` 6 beside
`vials_answered` 2), five missing or malformed counts, four contradictory
counts (five, seven, zero, and two beside two answers), four missing or
malformed orders, seven contradictory orders, the precedence and the defect
text for a defective count and a defective order with two answers closed at
the review (no answered ids; the log byte-identical before and after
extraction) and a reloaded load without its own opening `interrupted` whatever
the earlier load's count. Changed files (all six paths the
instruction permits):
`src/measurement/features/m16.ts`, `e2e/m16_handling.spec.ts`, this register,
the addendum, the matrix and `UNIT-LOG.md`. Not touched: the content, the
model, the surface model, the console, the route spec, every other file.
Verification (the implementer's development run first: tsc exit 0, ESLint and
Prettier clean on the two source files, the pure spec 50 passed in 4.4 s):
verification by the test-reviewer (Sonnet 5.5, as a general-purpose agent on
Sonnet reading the role file — the documented fallback; logs
`correction\final\` in the session scratchpad): first run on the final
extractor and the spec before the test additions — tsc exit 0, build exit 0,
ESLint with the Prettier rule clean on the two changed `.ts` files, Prettier
clean on them and `UNIT-LOG.md` flagged (inherited), `git diff --check` clean,
verify-unit exit 1 with the whitespace check clean, every changed path inside
the allowlist and the only FAIL lines the ten untracked metadata files under
`.agents/` and `.codex/` (present before the closeout, preserved, never
staged), the pure spec NOT run (the agent's permission classifier denied the
Playwright command; no retry, no workaround); rerun after the two test
recommendations of the scientific confirmation were adopted — tsc exit 0,
ESLint and Prettier clean on both `.ts` files, `git diff --check` clean, the
pure spec 50 passed in 4.2 s on the second and only further attempt (port 5203
free), the new test confirmed passing; document-only rerun after the four
documents were written: Prettier on the four documents, `git diff --check` and
verify-unit, reported in `UNIT-LOG.md` "U19 closeout correction results" and
in the handoff. Scientific confirmation (Opus 5.5, read-only, as a
general-purpose agent on Opus reading the role file; none of it an approval):
the extractor CONFIRMED (the two checks and nothing more; the records' storage
order free; the missingness, closure, reload paths and the raw log untouched;
the precedence scientifically acceptable — a row whose administration record
contradicts the approved administration cannot be tied to the administered
task), the test CONFIRMED WITH NOTE (two optional recommendations — the defect
text per case, a case pairing a count or order defect with a record defect —
both adopted before the rerun), no confusion of six planned vials with six
answers CONFIRMED; no open decision surfaced. Commit
`fix(m16): validate planned count and assigned order`.

**Unit 19 (M16): as-built** — the handling rule at the Diagnostics Laboratory
protocol console (bounded unit under contract `U19-CONTRACT.md`, v1 of 11
October 2026, final 11 October 2026 with amendment A1). **Status: technical
implementation of the approved row under research-owner decision D-U19-1
(APPROVED 11 October 2026, against preview revision r3) with amendment A1
(approved the same day); `m16_correct_first_applications` is a candidate
indicator and NOT scientifically validated.** The six applications are
repeated observations of ONE rule inside ONE console episode — never six
independent situations; the vials are not equated in difficulty; the content
is one authored form; a correct answer is never proof of understanding;
teaching time, example views, help, drafts and response time are companions,
never part of the value. Passing tests establish implementation correctness
only, never psychometric validity or questionnaire equivalence. Parts (0)–(2)
below were written BEFORE the series model, the adapter and the interface (the
contract's "specify before you code"); parts (3)–(7) record the build and its
evidence.

(0) Authority. **Research-owner decision D-U19-1 — APPROVED 11 October 2026,
with amendment A1** (an owner ruling, recorded in §5.302; not an implementer
default and not reopened): two passive worked examples of identical structure,
the same for every participant, before the applications (item 1); the rule,
the two worked examples, the six vials, the four drawer options plus DON'T
KNOW, the keys, every participant-facing string and the results explanations
of preview r3 §3–§5 as the administered content, with the drawer confirmation
repeating the drafted drawer — selection (a) (item 2); the complete rule card
visible beside every vial, the worked examples closed at the boundary, earlier
vials and answers not shown, HELP for controls only (item 3); self-paced
reading, free movement between the examples, a confirmed boundary that closes
teaching irreversibly (item 4); identical neutral acknowledgements and no
correctness information before the sixth first response, then two read-only
results pages (item 5); one form, fixed vial and option order, the `form_id` /
`rule_version` / `examples_version` companions (item 6); the briefing-exposure
/ voluntary non-use convention (item 7); the reload hold-back with the
`prior_load_checked` record (item 8); one to five answers with the series open
⇒ null `pending`, `incomplete` only at the review closure (item 9); amendment
A1 — accurate recording language (A1-1), complete and consistent results and
acknowledgement controls (A1-2), unambiguous double-click verification (A1-3),
consistent approval status and documentation corrections (A1-4). The approved
row is §2 (M16), §2b, the matrix row, addendum §3 and `registerV3.ts` (entry
`M16`). Provenance limit: the original owner documents are not on disk and
were not searched for again; the decision is an explicit decision for this
implementation, not recovered wording. Rulings D-U16-1 (M13), D-U17-1 /
D-U17-2 and the closeout ruling §5.290 (M14), and D-U18-1 (M15) are precedent
only and approve nothing here. Each rule below carries its source: [O-n]
decision D-U19-1 item n, [A1-n] amendment A1 part n, [A] approved row or owner
instruction, [P] recorded precedent, [D-n] implementer default (§5.303
onward).

(1) Administration `m16-handling-v1` — **specified before the series model and
the interface were written.**

- Place and access [A][O-7][P][D-10]: the Diagnostics Laboratory protocol
  console (phase 2 of the signal case; registry `lab.phase_m16`, its label
  "Protocol Console" and approach unchanged; surface `m16_protocol_console`,
  the generic `WorkSurfaceScene` in the WIDE frame of decision D-U17-2,
  unchanged), bench label "Protocol Console", phase name "Handling protocol",
  operational label "Signal case — protocol (Laboratory)", episode 3.
  Optional, as today: enterable whenever no other phase surface is open; Kai's
  dialogue text unchanged; no gate, reward, judgement or route consequence;
  non-use never read as refusal. Every one of the FOUR `onSelected` handlers
  of Kai's briefing acknowledgement (`lab_brief_ack` in the no-loan-offer
  branch; `lab_brief_ack`, `lab_brief_ack_loan_accept`,
  `lab_brief_ack_loan_decline` in the loan-offer branch) calls
  `presentM16(now)` beside `advancePilotStage('lab_work', now)` and
  `presentM15(now)` — briefing exposure only (the kit's `presented`), never a
  console opening or a vial presentation. The stage at the first opening is
  recorded in the entry snapshot. The phase order, the beacon, the wall
  display (its "Protocol lanes" ticks once M16 is recorded), Noor's line
  `NOOR · relay: The handling protocol is on the console.` and the case brief
  are unchanged; the display's "recorded" state follows the M16 window's
  closure (completed or closed). The legacy module (`m16ProtocolUpdate.ts`,
  `protocolForms.ts`) stays in the tree UNCHANGED under its frozen v2 identity
  (`proto_m16_protocol_update`, `proto_m16_protocol_*`, `m16_protocol_w1`,
  entry `m16-protocol-v1`), reachable only through the developer alias
  `?scene=information_processing_lab`; the laboratory scene no longer imports
  it; the v3 extractor never reads its family; the registry's descriptive
  `opens` / window label for `lab.phase_m16` stay stale (U24 backlog). -
  Content, order and form [O-2][O-6][A1-1]: the content exactly as preview r3
  §3–§5 — the first-opening card, the rule card, the worked examples `m16_e1`
  / `m16_e2`, the boundary confirmation, the vials `m16_v1` … `m16_v6` with
  options `m16_v<k>_d1` … `_d4` in the fixed order DRAWER 1–4, the keys, the
  confirmations, the acknowledgements, the help sheet, the results
  explanations and the closed records; versions `m16-handling-v1`
  (administration), `m16-form-1` (form), `m16-rule-v1` (rule),
  `m16-examples-v1` (worked examples). Line breaks are the preview's (fixed);
  wording, letters, numbers, order and option order never change; the
  participant strings live in one pure content module
  (`m16HandlingContent.ts`); no questionnaire wording anywhere. One form,
  fixed vial order v1 → v6; realised order always equals assigned order; no
  counterbalancing. Limitation documented: vial content and position are
  confounded; the likely easiest vial (v1, no mark) comes first. - Objective
  access while answering [O-3]: the rule card (§3.2 of the preview, nine fixed
  lines) in the left column of every example, vial and acknowledgement view;
  the current vial's label; the four option tiles; the status line; HELP
  (controls only). The worked examples are never rendered after
  `teaching_closed`; earlier vials' labels and answers are not shown; nothing
  is hidden on request, so no "consulted the instructions" companion exists. -
  First opening [D-2]: the first-opening card (preview §3.1, title
  `HANDLING RULE`, seven lines) with SHOW EXAMPLE 1, HELP and LEAVE CONSOLE;
  activating SHOW EXAMPLE 1 is recorded (`intro_acknowledged`) and presents
  worked example 1 (`example_viewed`, navigation `first`); leaving before it
  shows the card again at the next opening. - Teaching [O-1][O-4][A1-1]:
  worked example 1 then worked example 2 (subtitle `Worked example N of 2`,
  status `Worked examples: read them at your own pace.`), each the rule card
  followed by the seven-line example block of preview §4 in the left column
  and
  `Read how the rule places this vial. No answer is requested on this page.`
  in the right column; NEXT EXAMPLE (example 1) and BACK TO EXAMPLE 1 (example
  2, right column) move between them any number of times; every view is logged
  (`example_viewed` with `example_id`, `example_index`, `view_index` per
  example and `navigation` `first` | `next` | `back` | `resume`) as an
  interaction, never as an answer; nothing in teaching is a response; no
  minimum reading time, no comprehension check, no practice vial. Teaching
  time (`teaching_active_ms`), the views per example and the back-navigations
  are companions only. - The boundary [O-4]: START THE SIX VIALS (example 2
  only) opens the boundary confirmation `Start the six vials?` /
  `The worked examples close and cannot be opened again.` /
  `The handling rule stays on screen.` with `START [ENTER]` and
  `KEEP READING [ESC]` (`teaching_close_requested`); only a fresh confirming
  press — under the same 400 ms rule as the vial confirmations [D-4] — records
  `teaching_closed` once (`example_views` per example, `back_navigations`,
  `teaching_active_ms`, `help_consults_before`, `input_mode`) and presents
  vial 1; KEEP READING / ESC returns to example 2 and records
  `teaching_close_cancelled`; leaving in the dialog cancels it
  (`teaching_close_cancelled`, reason `panel_left`). After `teaching_closed`
  no view renders an example. - A vial [O-2][O-3][D-3][A1-1]: left the rule
  card and the two-line block `VIAL N OF 6` /
  `Label: site <SITE> · depth <D> m · marks: <none | STAR | RING | STAR, RING>`;
  right `Which drawer does vial N go in? Choose a drawer, then record it.`,
  the four tiles `DRAWER 1 [1]` … `DRAWER 4 [4]`, the opener
  `RECORD DRAWER [R]`, `DON'T KNOW [N]`; subtitle `Vial N of 6`; status
  `Use the handling rule. Choose a drawer, then record it.`; bottom row
  `HELP [H]` and `LEAVE CONSOLE`. Activating a tile (pointer, ENTER / SPACE on
  focus, or 1–4) makes it the draft, another replaces it, the same again
  clears it; drafts are logged (`option_drafted`, `option_id` null when
  cleared, `previous_option_id`) as interactions, never as a response, and
  survive leaving and returning. Only confirming records an answer. -
  Commitment [O-2][A1-3][D-4][P §5.210, §5.262, §5.279, §5.294]: the opener
  `RECORD DRAWER [R]` with a draft opens `Record DRAWER <n> for vial N?` /
  `It cannot be changed afterwards.` with `RECORD DRAWER [ENTER]` and
  `KEEP WORKING [ESC]` — the dialog repeats the drafted drawer (selection
  (a)); `DON'T KNOW [N]` opens `Record DON'T KNOW for vial N?` /
  `It cannot be changed afterwards.` with `RECORD [ENTER]` and
  `KEEP WORKING [ESC]` whatever the draft; the opener without a draft shows
  the neutral line `Choose a drawer first.` and records `commit_without_draft`
  only. Only the dialog's confirm control records an answer, and only a FRESH
  confirming press: a press inside the first 400 ms after the dialog appeared,
  the press that opened it, a held key or an auto-repeat never confirms (a
  held key or auto-repeat is dropped by the unchanged surface before the host,
  `event.repeat`, and is never recorded; `commit_press_refused`, reason
  `dialog_settling`, records the non-fresh presses that reach the host, once
  per dialog, the count carried on the record); a doubled confirmation records
  one response. Consequently a double click on the OPENER records zero first
  responses (the dialog opens with its 400 ms window; the second click lands
  on no control or is refused and logged), and a fresh press of the CONFIRM
  after the interval records exactly one `first_response`, a duplicate press
  immediately after it landing on the acknowledgement inside its settle and
  changing nothing. The confirm control is never at the screen position of the
  control that opened the dialog (dialog controls at panel (200, 250) /
  (466, 250); every opener at x ≥ 738 or in the bottom row). While a dialog or
  the help sheet is open the model renders only the header, the status line
  and that dialog or sheet; the confirm (or CLOSE HELP) control is the first
  focusable element; 1–4 / R / N do nothing. KEEP WORKING / ESC closes the
  dialog without a response (`commit_cancelled`); a cancel inside 400 ms of
  the dialog opening is ignored and not recorded (the dialog stays). - DON'T
  KNOW [A]: an incorrect first response whatever the draft (`response_kind`
  `dont_know`, `option_id` null, `correct` false); visually and textually
  distinct from LEAVE CONSOLE (right column against the bottom row) and never
  adjacent to it; leaving never records DON'T KNOW. - First response [A]:
  written once (`first_response`, phase `measurement`: `response_kind`
  `option` | `dont_know`, `option_id`, `correct`, `key_option_id`,
  `drafts_before`, `help_consults_before`, `active_ms`, `focused_ms` when the
  focused clock is available, `input_mode`, `refused_presses`,
  `draft_at_commit`) and immutable: no later act, reopening, results view,
  reload or closure changes or duplicates it; a second RECORD DRAWER, DON'T
  KNOW after an answer and an answer after DON'T KNOW never create a second
  one. - Acknowledgement [O-5][A1-2]: IDENTICAL for every response whatever
  its kind or correctness — right column `Vial N recorded.`, status
  `N of 6 vials recorded.` (counting recorded answers, never correct ones),
  primary NEXT VIAL (vials 1–5) / SHOW RESULTS (vial 6), and in the bottom row
  `HELP [H]` and `LEAVE CONSOLE`; the rule card and the vial's label stay; the
  recorded drawer is not repeated; same line, same controls, same timing, same
  layout, no sound (`response_acknowledged`, `line_id` `vial_recorded`,
  `next_control`). The next vial is presented only from the acknowledgement
  (NEXT VIAL), so each vial's presentation follows the previous vial's first
  response. Nothing before the sixth first response reveals correctness — no
  colour, glyph, sound, counter, tally or wording differs with the correctness
  of any answer. - Settle on EVERY view transition [P §5.290 (b),
  §5.294][D-4][A1-2]: a press that arrives within 400 ms after a view appeared
  — the first-opening card's SHOW EXAMPLE 1, an example view, the boundary
  confirmation's restored example 2, a vial's first view, an acknowledgement,
  each results page (its NEXT / BACK / FINISH / HELP), the help sheet and the
  view restored by CLOSE HELP — changes nothing (no draft, navigation, close,
  commit request, help consult or `results_shown`); CLOSE HELP and a cancelled
  dialog re-arm the restored view's settle; an ESC inside the settle of a view
  leaves nothing; an early press on anything but a confirmation is ignored and
  not recorded (no suffix exists for it); inside a confirmation it is the
  refused press above. So no carried press — the second ENTER, the second
  click of a double click, a repeated key — drafts, requests, confirms,
  navigates or closes in a newly opened view. - Results [O-5][A1-2]: only when
  all six first responses are recorded; a partial or review-closed series
  never shows results. SHOW RESULTS opens page 1 (title
  `RESULTS — VIALS 1-3 OF 6`; status
  `Your answers are fixed. This view only shows them.`; first line
  `All six vials are recorded.`; per vial `VIAL k — <label>`,
  `Your recorded drawer: DRAWER n` or `DON'T KNOW`
  `· Rule's drawer: DRAWER m`, and the two explanation lines of preview §5,
  verbatim; no tally, praise, blame or reference to the participant beyond
  "your recorded drawer") with HELP, FINISH and NEXT; NEXT opens page 2
  (`RESULTS — VIALS 4-6 OF 6`, vials 4–6) with HELP, FINISH and BACK; BACK
  returns to page 1; NEXT and BACK never share a position (x 778 / x 654).
  FINISH and ESC close the results surface from either page (through the
  model's settle, so a press carried from NEXT or BACK closes nothing).
  Completion is established by the sixth first response
  (`first_responses_completed`), whichever results pages are later viewed;
  FINISH from page 1 is legitimate and leaves page 2 unrecorded.
  `results_shown` (phase `feedback`, `page`, `vial_ids`) is written only when
  a page is actually displayed, and only at its first display — never on a
  re-display, a BACK to a page already shown or a CLOSE HELP restore. HELP
  opens the help sheet; CLOSE HELP returns to the same page with all state
  preserved and re-arms its settle. No results act changes a response.
  Reopening a completed console shows page 1 again, read-only; a page first
  displayed on a reopening is recorded then, once. - Help [D-5][A1-2]: HELP (H
  or the button) on the first-opening card, both examples, every vial view,
  every acknowledgement and both results pages — never while a dialog is open;
  the preview §3.8 sheet (title `HOW THE CONSOLE WORKS`, seven lines),
  informational, naming no vial and no correctness; every consult logged
  (`help_consulted`) with the phase and the view it was opened on (`intro`,
  `example_1`, `example_2`, `vial_<k>`, `ack_<k>`, `results_1`, `results_2`) —
  an interaction, never an answer; CLOSE HELP (H or the button) or ESC returns
  to the same view with all state (example, vial, draft, results page)
  preserved and re-arms its settle. - Leaving and returning [P]: ESC closes,
  in order, an open dialog (the boundary's or a vial's), then the help sheet,
  then leaves; LEAVE CONSOLE leaves; both take the SAME path (window pause,
  clock pause, surface close — the `m15SurfaceHost` / `m14SurfaceHost`
  precedent). Leaving keeps everything (phase, example view, vial, draft,
  answers; `panel_left`); returning (`series_reopened`, and in teaching an
  `example_viewed` with navigation `resume`) never presents a vial again and
  never starts a new trial; leaving in a dialog cancels the dialog and records
  no response. There is no STOP control. HELP and LEAVE CONSOLE are reachable
  through actual controls by pointer and by keyboard on every view where the
  preview lists them, and HELP and FINISH on both results pages (the results
  pages have no LEAVE CONSOLE; FINISH or ESC closes them). - Review closure
  [P][O-7][O-9][D-6]: at the Utility Deck record closure (`reviewClosure.ts` →
  `closeM16AtReview`, after `closeM15AtReview`) a series opened and not
  complete (first-opening card, teaching, or 0–5 vials answered) closes as
  `closed_at_review` (system; `series_closed_at_review` with the closure
  snapshot, then the kit's `window_closed`, censored): recorded answers kept,
  unanswered vials missing, no results afterwards; the console then opens as
  the closed record `Station record closed — the console keeps its record.` /
  `N of 6 vials recorded.` with LEAVE CONSOLE; while a closed record (review
  or reload) is shown no answer can be given and no `proto_m16_handling_`
  event is written. A completed series is not reclosed. A never-opened console
  is recorded absent by the kit's `markAbsent` (`briefed_not_opened` when the
  briefing was acknowledged, otherwise `not_briefed_not_opened`), never
  `declined`. - Reload [O-8][P §5.14, §5.290 (a)]: an opening of this
  administration in an earlier page load of the session identity ⇒ the console
  is never re-run in the new load (prior exposure recorded; the kit's
  `technical_failure` with a detail beginning `reload`; the closed record
  `This console was already used in this session. Its record is kept; no further answers can be given here.`;
  the load's row `interrupted`; the earlier events immutable in
  `prior_page_load_events`), also when the earlier load completed all six. At
  the first `guardM16Reload` run of a later page load (the Diagnostics
  Laboratory's `create()`) the adapter writes `prior_load_checked` once per
  load (the §5.290 (a) fields: `page_load_index`,
  `prior_page_load_event_count`, `prior_opening_found`,
  `prior_briefing_found`, `history_continuous`,
  `prior_opening_absence_established`), before the hold-back record when an
  opening is found; an established absence with continuous history reads the
  load exactly as a first load. A console never opened before the reload runs
  normally. Limitations carried unchanged from §5.290 (a): the check is made
  only where the console becomes available; continuity is read from recovered
  sequence numbers and the store's meta record and cannot reveal a lost tail
  when the meta record survived — prior exposure after a reload is uncertain,
  never proven absent; after a reload Kai's briefing replays and the earlier
  briefing is reported in the check, never counted as this load's exposure. -
  Faults: a fault while the series is open (card, teaching, vials) closes it
  as a technical failure through the window kit (the answers so far kept in
  the closure snapshot) and leaves the laboratory usable; the console then
  opens as the record
  `The console has a fault and is closed. Recorded answers are kept.` (D-11,
  implementer wording); a fault after completion is recorded (phase
  `feedback`) and never changes the scored evidence; a dialog never stays
  stuck after a cancelled callback (every host callback is guarded). -
  Completion [P]: the sixth first response writes `first_responses_completed`
  (closure snapshot, `closure_reason` `completed`) and the kit's
  `window_closed` (exit `completed`); the scored phase has no later closure
  event, and nothing afterwards (results, leaving, the review, a fault)
  reopens or changes it. - Layout [P D-U17-2][D-11]: the shared surface
  launched with `frame: 'wide'` — panel over the whole visible design area
  (1050 × 588 design px at (−125, 6), identical at the 1280 × 720 and 1920 ×
  1080 canvases); 16 px design text everywhere, title 20 px; the rule card at
  panel (12, 90), 714 × 196; the example or vial block at (12, 294) in the
  same column; the 300 px right column at panel x 738 (the question block 72
  high at y 90, the four tiles 34 high with 4 px gaps from y 170, RECORD
  DRAWER at y 330, DON'T KNOW at y 384); the bottom row at panel y 462 (HELP x
  12, LEAVE CONSOLE x 184, the view's primary control x 778 w 260, CLOSE HELP
  x 388; on the results pages HELP x 12, FINISH x 184 w 180, NEXT x 778 w 260
  on page 1, BACK x 654 w 112 on page 2); the confirmation dialogs alone with
  the header and the status line, text at (200, 170) and controls at
  (200, 250) / (466, 250) ending at x 720 — left of the right column that
  holds every opener and clear of the bottom row; the results explanations on
  fixed lines; one-line footer; at least 30 design px between the lowest
  control and the feedback line's top under the default font and under forced
  Courier New and Lucida Console (measured in the real game, R7); never
  smaller text, clipped or re-wrapped wording, scrolling or a larger minimum
  window. Keyboard and pointer each reach every control.

(2) The rule, the worked examples, the vials and the keys [O-2] — the approved
content of preview r3, transcribed unchanged; their logical correctness
establishes no empirical validity. "Unseen" as preview §5.2: no vial shares a
(site, depth class, marks) pattern with a worked example or with another vial,
and no vial repeats an example's depth; the label FORMAT is the examples'
format by design (item 1).

- The rule (`m16-rule-v1`; the rule card of preview §3.2, nine fixed lines):
  the 2 × 2 grid — ORLA column / VESK column, TOP row / BOTTOM row, DRAWER 1
  (TOP, ORLA), DRAWER 2 (TOP, VESK), DRAWER 3 (BOTTOM, ORLA), DRAWER 4
  (BOTTOM, VESK); `1 Column: the vial's site, ORLA or VESK.`;
  `2 Row: depth under 40 m — TOP row. Depth 40 m or more — BOTTOM row.`;
  `3 STAR mark: use the other row.`; `4 RING mark: use the other column.`;
  ` A vial with both marks: apply both.` - The worked examples
  (`m16-examples-v1`; identical seven-line structure, each with exactly one
  mark present): `m16_e1` — `Label: site ORLA · depth 18 m · marks: STAR` /
  `1 Site ORLA — ORLA column.` / `2 18 m is under 40 m — TOP row.` /
  `3 STAR mark — other row: BOTTOM row.` /
  `4 No RING mark — column stays ORLA.` /
  `Result: BOTTOM row, ORLA column — DRAWER 3.`; `m16_e2` —
  `Label: site VESK · depth 63 m · marks: RING` / `1 Site VESK — VESK column.`
  / `2 63 m is 40 m or more — BOTTOM row.` /
  `3 No STAR mark — row stays BOTTOM.` /
  `4 RING mark — other column: ORLA column.` /
  `Result: BOTTOM row, ORLA column — DRAWER 3.` Both end in DRAWER 3 (a
  consequence of the chosen coverage — both sites, both depth classes, each
  mark present and absent, one mark per example); no worked example shows a
  no-mark or a two-mark vial. - The six vials (`m16-form-1`; fixed order; keys
  by id): `m16_v1` `site ORLA · depth 12 m · marks: none` — KEY `m16_v1_d1`
  (DRAWER 1) — results lines `ORLA column; 12 m is under 40 m — TOP row.` /
  `No marks. DRAWER 1.`; `m16_v2` `site VESK · depth 34 m · marks: STAR, RING`
  — KEY `m16_v2_d3` (DRAWER 3) — `VESK column; 34 m is under 40 m — TOP row.`
  / `STAR — other row: BOTTOM. RING — other column: ORLA. DRAWER 3.`; `m16_v3`
  `site ORLA · depth 46 m · marks: RING` — KEY `m16_v3_d4` (DRAWER 4) —
  `ORLA column; 46 m is 40 m or more — BOTTOM row.` /
  `RING — other column: VESK. DRAWER 4.`; `m16_v4`
  `site VESK · depth 71 m · marks: STAR, RING` — KEY `m16_v4_d1` (DRAWER 1) —
  `VESK column; 71 m is 40 m or more — BOTTOM row.` /
  `STAR — other row: TOP. RING — other column: ORLA. DRAWER 1.`; `m16_v5`
  `site VESK · depth 27 m · marks: STAR` — KEY `m16_v5_d4` (DRAWER 4) —
  `VESK column; 27 m is under 40 m — TOP row.` /
  `STAR — other row: BOTTOM. DRAWER 4.`; `m16_v6`
  `site ORLA · depth 58 m · marks: STAR, RING` — KEY `m16_v6_d2` (DRAWER 2) —
  `ORLA column; 58 m is 40 m or more — BOTTOM row.` /
  `STAR — other row: TOP. RING — other column: VESK. DRAWER 2.` Key sequence
  1, 3, 4, 1, 4, 2 (no consecutive repeat; TOP / BOTTOM 3 / 3; ORLA / VESK
  column 3 / 3; drawers 1 and 4 keyed twice, 2 and 3 once); every depth at
  least 6 m from the 40 m threshold; every rule part (both sites, both depth
  classes, no mark, STAR only, RING only, both marks) required by at least one
  vial; blind-choice chance 1/4 per vial. - What each incorrect choice
  represents (preview §5.3, descriptive, never a claim about why a participant
  chose it): a wrong drawer differs from the key in the row (step 2 or STAR
  handled differently), the column (step 1 or RING handled differently) or
  both; the extractor's per-vial `error_kind` (`row` | `column` |
  `row_and_column`; null for the key and for DON'T KNOW) is recomputed from
  the content — v1 (key 1): 2 column, 3 row, 4 both; v2 (key 3): 1 row, 2
  both, 4 column; v3 (key 4): 1 both, 2 row, 3 column; v4 (key 1): 2 column, 3
  row, 4 both; v5 (key 4): 1 both, 2 row, 3 column; v6 (key 2): 1 column, 3
  both, 4 row. The disclosed cues of preview §7 (v1 answered correctly by 16
  of the 23 listed non-guess strategies and passing through worked example 1
  as an intermediate state; the strongest listed misreadings — swapped mark
  meanings and the absolute-direction readings — each at 4 of 6, so 4 of 6
  does not separate slips from one consistent misreading; three of six vials
  needing both marks; the rule card visible throughout, so a ceiling is
  plausible) travel with the content and are computed and REPORTED by the pure
  spec — reproduced against the preview's figures, never asserted as a
  ceiling.

(3) As built — the console (`src/pilot/windows/m16HandlingContent.ts` — the
administration exactly as the preview: ids, the four versions, the nine
rule-card lines, the two worked examples with their seven lines and result
drawers, the six vials with their labels as data (site, depth, marks), the
four options per vial in fixed order, the keys as approved data, the two
results explanation lines per vial, the `error_kind` recount from the 2 × 2
grid, and every participant-facing string; `m16HandlingModel.ts` — the series
state machine (card, teaching views and navigation, the boundary and its
confirmation, vial order, drafts, the confirmations and the fresh-press rule,
the settle on every transition, the first-response freeze, acknowledgements,
completion, results access and pages, help, review closure, technical failure,
hold-back), the entry and closure snapshots, the reload predicate and the
`prior_load_checked` builder; `m16ProtocolConsole.ts` — the window adapter
(`ItemWindow` item `M16`, opportunity `proto_m16_handling_series`, window
`m16_handling_w1`, family `proto_m16_handling_`, version `m16-handling-v1`,
scene `diagnostics_laboratory`, object `m16_protocol_console`), the log sink
with the protocol stamp, the optional focused clock, the reload guard with the
once-per-load check, `presentM16`, `declareM16Handling`, `guardM16Reload`,
`openM16`, the surface commands, `m16ConsumesEsc`, `closeM16Surface`,
`resumeM16Surface`, `closeM16AtReview`, `bindM16Surface`, `m16Window`, a test
reset; `m16SurfaceModel.ts` — the pure work-surface model builder for the wide
frame). The views: the first-opening card (SHOW EXAMPLE 1, HELP, LEAVE
CONSOLE); a worked example — header `HANDLING RULE` / `Worked example N of 2`,
the status line, the rule card and the example block in the left column, the
teaching note in the right column (a neutral landing), NEXT EXAMPLE
(example 1) or START THE SIX VIALS with BACK TO EXAMPLE 1 (example 2), HELP
and LEAVE CONSOLE in the bottom row; the boundary confirmation drawn alone
with the header and the status line; a vial — header `HANDLING RULE` /
`Vial N of 6`, the status line, the rule card and the two-line vial block in
the left column, the question (a neutral landing), the four drawer tiles,
`RECORD DRAWER [R]` and `DON'T KNOW [N]` in the right column, HELP and LEAVE
CONSOLE in the bottom row; the drawer and DON'T KNOW confirmations drawn
alone; the acknowledgement with NEXT VIAL / SHOW RESULTS, the rule card, the
vial block, `Vial N recorded.`, HELP and LEAVE CONSOLE; the two results pages
(HELP, FINISH, NEXT on page 1; HELP, FINISH, BACK on page 2); the help sheet
alone with CLOSE HELP; the closed records. Every activation calls one adapter
command with its input mode (pointer and keyboard converge); hotkeys 1–4
(drawers), R, N, H; ENTER / SPACE on the focused element; every control is
reachable by pointer and by keyboard. The 400 ms settle of every view
transition and the fresh-press rule live in the model (`view_shown_at_ms`,
`pending_commit.opened_at_ms`); a held key never reaches the model (the
unchanged surface drops `event.repeat`); the adapter consumes an ESC that
arrives inside the settle of a view (D-4), so a carried ESC never leaves.

(4) Events and feature. Family `proto_m16_handling_`, ONE opportunity
`proto_m16_handling_series`, window `m16_handling_w1`, administration
`m16-handling-v1`, form `m16-form-1`, rule `m16-rule-v1`, worked examples
`m16-examples-v1`; suffixes and fields in the addendum, §2 "U19". All
PROVISIONAL candidates; nothing enters `ScoringManager`, `SummaryScope`, the
canonical context or the return URL; the v2 ids `proto_m16_protocol_update` /
`proto_m16_protocol_*` / `m16_protocol_w1` / `m16-protocol-v1` are retired
from the route and not written; the legacy family is read by no extractor.
`m16_correct_first_applications` (primary, the only M16 row; `registerV3.ts`
entry `M16` now carries the explicit v3 route — the opportunity, one window
`m16_handling_w1` with occasion null in zone `diagnostics_laboratory`, episode
3, the family prefix and `secondary_ids: []` — and `implemented`; the feature
row, the planned denominator 6, the denominator kind, the range, the
direction, the coverage label, the independence, the operational label and the
summary unchanged): value = numerator = vials whose FIRST response is the
keyed drawer; denominator = vials with a first response in the current page
load; planned denominator 6. DON'T KNOW and a wrong drawer are in the
denominator and not in the numerator; a vial without a first response is
missing, never incorrect, and is listed apart from DON'T KNOW; teaching
exposure, help, drafts, time and input mode never change the numerator or the
denominator. The extractor (`src/measurement/features/m16.ts`, read-only,
current load only) recounts the value from the `first_response` events against
the content key and compares it with each event's `correct` flag and with the
closure snapshot. Dispositions and the integrity list: addendum §2 "U19" and
§5.307, §5.309; the reload-before-opening distinction: §5.290 (a) applied to
M16. Components (companions beside the value, never inside it): the versions
(`administration_version`, `form_id`, `rule_version`, `examples_version`), the
exposure stages kept distinct (`briefed`, `console_opened`,
`intro_acknowledged`, `examples_viewed`, `teaching_closed`, `vials_presented`,
`never_opened_reason`), `teaching` (`examples_viewed`, `back_navigations`,
`teaching_active_ms`, `teaching_closed`), `reload_check`, the assigned and
realised vial orders, `observations_share_one_episode: true`,
`first_response_phase_complete` and its closure, `vials_answered` /
`vials_planned`, `dont_know_count`, `omissions` (`unanswered_vial_ids`,
`unpresented_vial_ids`, apart from DON'T KNOW), per vial the response kind,
option, correctness, key, `error_kind`, drafts, help consults, active and
focused time, input mode; help consults by phase; `results_shown` per page;
`feedback_phase_faults`; `exposure_record_consistent`;
`teaching_record_consistent`. No total mixes teaching and application; no
total across items; `declined` never.

(5) Integration. `src/pilot/windows/reviewClosure.ts` calls `closeM16AtReview`
after M15's (one import, one call, its comment).
`DiagnosticsLaboratoryScene.ts`: the `m16ProtocolUpdate` import (`declareM16`,
`m16WindowStatus`) replaced by the adapter's and the surface model's;
`declareM16Handling()` and `guardM16Reload()` in `create()` in place of
`declareM16()`; `resumeM16Surface(now)` in the existing RESUME handler beside
`resumeM15Surface`; the `m16` PHASES entry's `status`
(`() => m16Window.windowStatus()` — `closed` for every closed state of the
kit, read by `windowTerminal` as recorded) and `opportunityId`
(`proto_m16_handling_series`); a dedicated `m16` station branch beside the
`m15` one (`openM16` with the route stage, `openWorkSurface` with
`surfaceId: 'm16_protocol_console'`, `frame: 'wide'`, the bound surface model
and an `onClose` that returns false while ESC closed a dialog or the help
sheet), so `ipStation` no longer serves m16; the private `m16SurfaceHost()`
modelled on `m15SurfaceHost()` (LEAVE CONSOLE, FINISH and ESC take the same
path: pause, then close); `presentM16(now)` in each of the FOUR
`lab_brief_ack*` `onSelected` handlers of both briefing branches beside
`advancePilotStage('lab_work', now)` and `presentM15(now)` [O-7]. Bench label,
phase name, Noor's lines, Kai's text, every other bench (M15, M17, M18), the
M10 / M11 handling, the wall display and the room geometry are untouched.
`features/index.ts` imports the extractor. Specs: `e2e/m16_handling.spec.ts`
(pure, new) and `e2e/m16_handling_route.spec.ts` (browser, new);
`pilot_lab.spec.ts` and `pilot_signal_incident.spec.ts` with their M16 steps
and identity assertions re-expressed (the protocol console opened as a work
surface and its distinctness from the evidence table and the training rig
asserted on what each surface shows; the former M16 STOP of `pilot_lab` leaves
M16 open and null `pending`; the full-case test drives the console through the
card, both examples, the boundary and six vials by real input, mixed pointer
and keyboard, and reads M16 through the extractor row; M16 leaves the
IP-family loops and gets an explicit check of equivalent strength; the guards
test's orientation part moved to the Training Rig, whose route module still
flags a skipped Console Orientation, with the console shown to open without
any gate); `m15_systems_route.spec.ts` R8's M16 step (the console opens its
work surface and closes with ESC). Untouched: `windowKit.ts`,
`WorkSurfaceScene.ts` (the wide frame used as is), every other
`src/pilot/windows/*` module (`m15*`, `m14*`, `signalSurfaceModels.ts`
included), all of `src/informationProcessing/**` (`m16ProtocolUpdate.ts` and
`protocolForms.ts` byte-identical to the base, pinned by SHA-256 in the pure
spec; `InformationProcessingLabScene.ts` still imports the legacy module for
the developer alias), `interactionRegistry.ts` (its `opens` / window label
`m16_protocol_update` for `lab.phase_m16` stay, U24 backlog), the frozen v2
ledger, the shared measurement framework, `e2e/pilotHelpers.ts` and every
other helper and spec (`signal_incident_models.spec.ts` still describes the
legacy module's family by source and still passes).

(6) Test evidence (11 October 2026; commands, counts, reviewers and every
exception in `UNIT-LOG.md` "U19 results"; the counts below are those of the
FINAL source as the test-reviewer ran the matrix, §5.313). Pure,
`e2e/m16_handling.spec.ts` — 48 tests passed: the independent oracle (its own
transcription of the rule card, the two worked examples and the six labels
with their keys from preview r3 §2–§5 and its own rule function; every key and
both worked results re-derived — sequence 1, 3, 4, 1, 4, 2, DRAWER 3 twice —
and equal to the module's; the rule a function over all sixteen label
patterns; every depth at least 6 m from the threshold; no vial sharing a
pattern with an example or another vial and none repeating an example depth;
every rule part required by at least one vial; the examples' identical
seven-line structure with exactly one mark each and each step line following
the rule; the §5.3 error table reproduced by the content's `error_kind`; the
§7 strategy table computed and REPORTED — 6, 4 (×6, the swapped reading under
both names and the four absolute-direction readings), 3 (×6), 2 (×3), 1.5, 1
(×5), 0 (×2) — and v1 answered correctly by 16 of the 23 listed non-guess
strategies), the content cross-check (every string, line, label, option,
confirmation, acknowledgement, help line, results line and closed-record line
as transcribed; no vial and no correctness word on the card or the help; the
four `lab_brief_ack*` handlers calling `presentM16` and `presentM15` by
source), the register row and route, the legacy module (the laboratory scene
not importing it; the opportunity declared by one adapter;
`m16ProtocolUpdate.ts` and `protocolForms.ts` byte-identical to the base by
SHA-256), the series model (no correctness information at the card, in
teaching, in the dialogs or after one to five answers; identical
acknowledgements; results refused before the sixth answer and after a review
closure; page 1 → NEXT → page 2 → BACK; FINISH and ESC through the settle;
`results_shown` once per displayed page, never on a re-display or a CLOSE HELP
restore; FINISH from page 1 leaving page 2 unrecorded; reopening read-only;
the card → example 1 ↔ example 2 → boundary order with every view logged; no
example after `teaching_closed`; fixed vial order and a vial only after the
previous first response; the first response written once; the fresh-press rule
on all three confirmations with the opener / confirm distinction; the settle
on every transition; help refused during a dialog and recorded with its view;
leaving and returning in every state; the review closures; the reload
predicate, hold-back and check; faults; the entry snapshot and suffixes) and
the extractor (6 / 6, 0 / 6 and a mixed series with DON'T KNOW; `error_kind`
per vial; omissions apart from DON'T KNOW; the versions and the teaching
exposure in the components; stability; partial and open series; zero evidence
and every legitimate-missingness case; the reload paths; every integrity case
of contract §10 including the sequence cases; the unscored-record flags;
determinism and the full extraction) and the wording. Browser,
`e2e/m16_handling_route.spec.ts` on the participant route — R1, R2, R2 at
`canvas=1080`, R3, R4, R7 (Courier New), R7 (Lucida Console), R8, R9, R5, R6:
11 passed, no scenario blocked or skipped (the dock-tutorial replay after a
reload succeeded in R5 and R6; the console after the record closure was
reached in R3), the twenty-six frames written; the real-game layout gate
measured at 52 / 50 / 50 design px (Courier New / Lucida Console /
`canvas=1080`), every element's rendered text inside its box, the rule card on
nine lines, the example block on seven, the vial block on two and results page
2 on sixteen under both forced fonts. Regression on the final source: P2 — 143
passed, 2 failed (the two documented `final_scientific_gates` exceptions,
reproduced identically on the untouched export of `361cb8c`: line 146
`toEqual([])` receiving `["proto_m08_effort_choice"]`; line 405
`toHaveLength(10)` receiving 8). B2 — `pilot_lab` 3 passed and
`pilot_signal_incident` 2 passed (11.3 min); `m15_systems_route` R3 / R4 / R6
/ R8 4 passed (11.1 min); `m14_integration_route` R3 1 passed (3.1 min);
`world_v2_lab_look` 1 passed (1.0 min) — every B2 check passed. Static:
`lint:tsc`, `build`, ESLint and Prettier on the 14 changed `.ts` files,
Prettier on the register and the addendum, `git diff --check`, `verify-unit`
(PASS, 18 of 18 paths) and the guard's tests. The matrix and UNIT-LOG fail
Prettier at the base and after this unit for the inherited reasons only (the
matrix's item-table re-padding — 56 complaint lines on both trees; UNIT-LOG's
untouched base text plus the verbatim U19 contract appendix, as the U16–U18
appendices were); the implementer's own paragraphs in them are Prettier-clean
by content. The matrix was run ONCE by the test-reviewer (Sonnet 5.5) on the
final source; the three independent reviews followed it (§5.313).

(7) Residual limitations (stated, not resolved by this unit). The six
applications share one console episode (`single_episode`, "six applications of
one rule"); one form, fixed order — vial content and position are confounded
and the likely easiest vial (v1, no mark) comes first; the rule card is
visible throughout, so the measure concerns applying a visible rule to labels
not seen before, not remembering it, and a ceiling at 6 of 6 is plausible;
both worked examples end in DRAWER 3 (a consequence of the chosen coverage;
copying their result gives 1 of 6); the vials need the steps in different
combinations and are not equated; three of six vials need both marks; 1/4
chance per vial; v1 is answered correctly by 16 of the 23 listed non-guess
strategies and worked example 1 passes through its answer as an intermediate
state; the strongest listed misreadings (swapped mark meanings, the
absolute-direction readings) reach 4 of 6, so 4 of 6 does not separate slips
from one consistent misreading — the per-vial `error_kind` pattern is reported
for that reason, never scored; strategies other than those listed are not
ruled out; no correct answer proves understanding; reading speed and care in
following a four-step procedure contribute to the answers; teaching time and
example views are recorded but never adjust the value. Absent evidence is
never proof of non-exposure and lossless recovery is never claimed: the reload
limitations of §5.290 (a) (a check only where the console becomes available —
laboratory entry; continuity read from the recovered sequence numbers and the
store's readable meta record, never a tail lost while the meta record
survived; the replayed briefing of a later load reported, never counted as
this load's exposure) apply to M16 unchanged. A session that ends before the
review exports a partial series as `pending` (item 9). The open M05 matters of
§5.290 (e) (i) — the competing briefed tasks and the episode-1 cap on the
scripted route — are carried forward unchanged and untouched (no M05 assertion
belongs to this unit; the route scenarios decline every M05 job); the U18
salience observation H1 (§5.301) is an M15 matter, untouched. The capture
specs, the `interactionRegistry` `opens` / window label `m16_protocol_update`
for `lab.phase_m16` and `world_v1_*` evidence for the console are U24 backlog.
The header title on the non-results views, the fault record line, the dialog
and help footers are implementer wording (D-11), not preview text. Passing
tests establish implementation correctness only; this unit establishes no
psychometric validity and no questionnaire equivalence.

**Unit 18 (M15): as-built** — the two relay boxes of the Diagnostics
Laboratory evidence table (bounded unit under contract `U18-CONTRACT.md`, v1
of 9 October 2026, final 10 October 2026). **Status: technical
implementation of the approved row under research-owner decision D-U18-1
(APPROVED 10 October 2026, against preview revision r5);
`m15_correct_first_predictions` is a candidate indicator and NOT
scientifically validated.** The four predictions are repeated observations
inside ONE bench episode, clustered in two boxes — never four independent
situations; the boxes are not equated in difficulty; the content is one
authored form; by-box values are descriptive; model correctness and
exploration are companions, never part of the value. Passing tests establish
implementation correctness only, never that correct answers require
exploration. Parts (0)–(2) below were written BEFORE the series model, the
adapter and the interface (the contract's "specify before you code"); parts
(3)–(7) record the build and its evidence.

(0) Authority. **Research-owner decision D-U18-1 — APPROVED 10 October
2026** (an owner ruling, recorded in §5.291; not an implementer default and
not reopened): the two boxes, the four wiring options per box, the four
questions with three options each, the keys and the results lines of preview
r5 §3–§5 as the administered content, with the owner's selected box 1 option
A `F raises W. G raises W. P raises Q. W lowers P.` and S2-Q1 asking about
unit Z (item 1); exploration by single-dial TESTs that close at the wiring
(item 2); one confirmed, immutable wiring or CANNOT TELL per box before its
questions, model correctness a companion only (item 3); identical neutral
acknowledgements and no correctness information before the fourth first
prediction, then the results for both boxes (item 4); the briefing / non-use
convention (item 5); the reload hold-back with the `prior_load_checked`
record at laboratory entry (item 6); fixed box, wiring, question and option
order, one form, an orientation card with one worked reading example and no
practice (item 7); one to three answers with the series open ⇒ null
`pending`, `incomplete` only at the review closure (item 8); the disclosed
remaining cues, the fixed-order limitations and the provisional measurement
status retained. The approved row is §2 (M15), §2b, the matrix row, addendum
§3 and `registerV3.ts` (entry `M15`). Provenance limit: the original owner
documents are not on disk and were not searched for again; the decision is
an explicit decision for this implementation, not recovered wording. Rulings
D-U16-1 (M13), D-U17-1 / D-U17-2 and the closeout ruling §5.290 (M14) are
precedent only and approve nothing here. Each rule below carries its source:
[O-n] decision D-U18-1 item n, [A] approved row or owner instruction, [P]
recorded precedent, [D-n] implementer default (§5.292 onward).

(1) Administration `m15-systems-v1` — **specified before the series model
and the interface were written.**

- Place and access [A][O-5][P]: the Diagnostics Laboratory evidence table
  (phase 1 of the signal case; registry `lab.phase_m15`, surface
  `m15_evidence_table`, the generic `WorkSurfaceScene` in the WIDE frame of
  decision D-U17-2, unchanged), bench label "Evidence Table", phase name
  "Causal model", operational label "Signal case — causal model
  (Laboratory)", episode 3. Optional, as today: enterable whenever no other
  phase surface is open; Kai's dialogue text unchanged; no gate, reward,
  judgement or route consequence; non-use never read as refusal. Every one
  of the FOUR `onSelected` handlers of Kai's briefing acknowledgement
  (`lab_brief_ack` in the no-loan-offer branch; `lab_brief_ack`,
  `lab_brief_ack_loan_accept`, `lab_brief_ack_loan_decline` in the
  loan-offer branch) calls `presentM15(now)` beside
  `advancePilotStage('lab_work', now)` — briefing exposure only (the kit's
  `presented`), never a bench opening or a question presentation. The stage
  at the first opening is recorded in the entry snapshot. The phase order,
  the beacon, the wall display and Noor's lines are unchanged; the display's
  "recorded" state follows the M15 window's closure (completed or closed).
  The legacy layered cipher (`m15LayeredCipher.ts`, developer alias only)
  keeps its mechanic and entry version `m15-cipher-v1` and moves to the
  secondary identity `secondary_m15_layered_cipher` /
  `secondary_m15_cipher`, listed as M15's `secondary_ids` and read by no
  extractor; the v2 causal-model module (`m15CausalModel.ts`,
  `causalForms.ts`, `signalSurfaceModels.ts`) stays in the tree, unimported
  by any scene and unchanged; the frozen v2 ids `proto_m15_layered_cipher` /
  `proto_m15_cipher_*` / `m15_causal_w1` keep their v2 meaning and are
  written by nothing on the route.
- Content, order and forms [O-1][O-7]: boxes `s1` (`m15-s1-v1`, "RELAY BOX 1
  OF 2", dials `s1_f` F / `s1_g` G, units `s1_p` P / `s1_q` Q / `s1_w` W)
  then `s2` (`m15-s2-v1`, "RELAY BOX 2 OF 2", dials `s2_s` S / `s2_t` T,
  units `s2_x` X / `s2_y` Y / `s2_z` Z); per box four wiring options
  `s1_w_a` … `s1_w_d` as one-line tiles in the preview's order, and two
  questions `s1_q1`, `s1_q2` (global 1–2), `s2_q1`, `s2_q2` (global 3–4),
  each with three options in the fixed order A "<unit> goes up" (`s1_q1_a`),
  B "<unit> goes down" (`s1_q1_b`), C "<unit> does not move" (`s1_q1_c`);
  the wirings, listings, keys and results lines of (2). Fixed box order 1 →
  2; within a box exploration and wiring, then question 1, then question 2,
  one at a time, the next presented only after the current one's first
  response; realised order always equals assigned order; one form; no
  counterbalancing. Limitation documented: box content and position are
  confounded; box 1 carries first contact with the bench. Wording, letters,
  order and option order never change; line breaks at 800 × 600 are the
  implementer's (D-9).
- Objective access and exploration [A][O-2]: both dials' TEST controls
  (`TEST DIAL <d>  [1]` / `[2]`; pointer, ENTER / SPACE on focus, or keys 1
  / 2) from the box's presentation until its wiring is recorded; unlimited
  and deterministic — the bench turns that one dial up one notch from rest
  and lists the steps (the listing computed by the model's simulator from
  the content's wiring, never hard-coded beside it, and equal to the
  preview's); the TEST RECORD shows one line per dial
  (`TEST <d>  not run yet` until tested, then the latest listing), and stays
  on the bench through the box's questions; every run is recorded
  (`test_run`: dial, run index per dial, the listing shown) as an
  exploration record, never a response. After the wiring is recorded both
  TEST controls are disabled beside `Tests closed`; activating them records
  nothing. LOCK, BOOST and joint turns are never available as tests; no
  question's situation is ever displayed.
- First opening [O-7][D-2]: the orientation card (preview §3.1, title "RELAY
  BOXES", the rule lines and the worked example with J, K, M, N — no dial or
  unit of either box) with START BOX 1, HELP and LEAVE BENCH; acknowledging
  it is recorded (`orientation_acknowledged`) and presents box 1
  (`box_presented`); no practice question or practice box; left before
  START, the card is shown again at the next opening.
- Wiring step [O-3][D-3]: heading
  `WIRING OF BOX N — which one fits your tests?`, the four one-line option
  tiles A–D in the bench column, the right-column instruction,
  `RECORD WIRING  [R]` and `CANNOT TELL  [N]`. Activating a tile (pointer,
  ENTER / SPACE on focus, or A–D) makes it the draft; another replaces it;
  the draft again clears it; drafts are recorded (`wiring_drafted`,
  `option_id` null when cleared), are never a response, and survive leaving
  and returning.
- Wiring commitment [O-3][D-4][P §5.210, §5.262, §5.279]: RECORD WIRING with
  a draft opens `Record wiring <letter> for box N?` /
  `The tests then close; the test record stays.` /
  `It cannot be changed afterwards.` with RECORD WIRING [ENTER] and KEEP
  WORKING [ESC]; CANNOT TELL opens `Record CANNOT TELL for box N?` with the
  same two further lines and RECORD [ENTER] / KEEP WORKING [ESC]; RECORD
  WIRING without a draft shows the neutral line `Choose a wiring first.` and
  records `commit_without_draft` only. Only a FRESH confirming press
  records: a press inside the first 400 ms after the dialog appeared, the
  press that opened it, a held key or an auto-repeat never confirms (a held
  key or auto-repeat is dropped by the unchanged surface before the host,
  `event.repeat`, and is never recorded; `commit_press_refused`, reason
  `dialog_settling`, records the non-fresh presses that reach the host, once
  per dialog, the count carried on the record). A fresh press writes
  `wiring_recorded` once (`response_kind` `option` | `cannot_tell`,
  `option_id` or null, `correct` against the station wiring — false for
  CANNOT TELL — `key_option_id`, the tests run so far per dial, dials
  tested, drafts, help consults, active time, input mode); immutable; the
  tests close; the neutral acknowledgement `Wiring recorded for box N.` with
  FIRST QUESTION follows (`response_acknowledged`, `next_control`
  `first_question`; status
  `Tests closed. The test record stays on the bench.`). No correctness
  information. KEEP WORKING / ESC closes the dialog without a response
  (`commit_cancelled`). The confirm control is never at the screen position
  of the control that opened the dialog; while a confirmation or the help
  sheet is open the model renders only the header, the status line and that
  dialog or sheet, the confirm (or close) control is the first focusable
  element and A–D / 1–2 / R / N do nothing.
- Question step [O-3][O-4][A][P]: the bench column keeps the test record and
  adds `YOUR RECORDED WIRING` with the recorded option's text (or
  `CANNOT TELL`); the right column shows `QUESTION N OF 2`, the question,
  the three option tiles, `RECORD ANSWER  [R]` and `CANNOT SOLVE  [N]`;
  status
  `Use the test record and the wiring you recorded. Choose an answer, then record it.`
  Drafting as in the wiring step (`option_drafted`). Commitment as in the
  wiring step with `Record this answer for question N?` /
  `Record CANNOT SOLVE for question N?` and
  `It cannot be changed afterwards.`, RECORD ANSWER [ENTER] / RECORD [ENTER]
  and KEEP WORKING [ESC]; RECORD ANSWER without a draft shows
  `Choose an answer first.` and records `commit_without_draft` only. CANNOT
  SOLVE (visually and textually distinct from LEAVE BENCH, never adjacent to
  it) is an incorrect first response whatever the draft. A first response is
  written once (`first_response`, phase `measurement`: `response_kind`
  `option` | `cannot_solve`, `option_id`, `correct`, `key_option_id`,
  `recorded_wiring_option_id` or `cannot_tell`,
  `consistent_with_recorded_wiring` — null when the wiring was CANNOT TELL,
  the response is CANNOT SOLVE or the recorded wiring's answer is
  magnitude-dependent under the analysis conventions of preview §7.2 (a
  guard: none of the eight options is) — `tests_before`, `drafts_before`,
  `help_consults_before`, `active_ms`, `focused_ms`, `input_mode`) and
  immutable: no later act, reopening, results view, reload or closure
  changes or duplicates it; a second RECORD ANSWER, CANNOT SOLVE after an
  answer and an answer after CANNOT SOLVE never create a second one.
- Acknowledgement [O-4][D-4]: IDENTICAL for every response whatever its kind
  or correctness — `Answer recorded for question N.` with NEXT QUESTION
  (after question 1), NEXT BOX (after box 1 question 2) or SHOW RESULTS
  (after box 2 question 2); same line, same control, same timing, same
  layout, no sound; the status counts answers recorded
  (`N of 4 answers recorded.`), never correct ones. Nothing in the
  first-response phase reveals correctness — no colour, glyph, sound,
  counter, tally or wording differs with the correctness of any wiring or
  answer.
- Settle on EVERY view transition [P §5.290 (b)][D-4]: a press that arrives
  within 400 ms after a view appeared — the orientation's START, a box's
  first view, a question's first view, an acknowledgement, the results views
  (NEXT BOX / BACK / FINISH), the help sheet, a confirmation dialog (its
  KEEP WORKING) and the view restored by CLOSE HELP — changes nothing (no
  test, no draft, no navigation, no commit request, no cancel, no
  `results_shown`, no help, no FINISH); CLOSE HELP re-arms the settle of the
  view it restores; an early press on anything but a confirmation is ignored
  and not recorded (no suffix exists for it); inside a confirmation it is
  the refused press above. So no carried press — the second ENTER, the
  second click of a double click, a repeated key — can test, draft, request,
  confirm, navigate or close in a newly opened view.
- Results [O-4][O-1][D-9]: only when all four first predictions are
  recorded; a partial or review-closed series never shows results. SHOW
  RESULTS opens one view per box (title `RESULTS — RELAY BOX N OF 2`, status
  `Your answers are fixed. This view only shows them.`,
  `All four answers are recorded.`, `Your recorded wiring: …` or
  `CANNOT TELL`, `Station wiring: …`, per question
  `QUESTION k — <short title>`, `Your recorded answer: …` or `CANNOT SOLVE`,
  `Station answer: …` and the approved results line, verbatim; no tally,
  praise, blame or reference to the participant) with NEXT BOX (box 1) /
  BACK (box 2) and FINISH — FINISH closes the surface only after the view
  settled, so a press carried from NEXT BOX or BACK, on whose place it
  stands, closes nothing; no subtitle (the title names the box); reopening a
  completed bench shows the results again, read-only; only the first showing
  of each box's results is recorded (`results_shown`).
- Help [D-5]: HELP (H or the button) at any time except while a confirmation
  is open; the preview §3.5 sheet (title `HOW THE BENCH WORKS`),
  informational, naming no dial or unit of either box and no correctness;
  closed by ESC or CLOSE HELP [H]; every consult recorded (`help_consulted`)
  with the phase, box, step and question it was opened on.
- Leaving and returning [P]: ESC closes, in order, an open dialog, then the
  help sheet, then leaves; LEAVE BENCH leaves; both take the SAME path
  (window pause, clock pause, surface close — the M14 host precedent).
  Leaving keeps everything (box, step, test record, draft, recorded wiring,
  answers; `panel_left`); returning (`series_reopened`) never presents a
  question again and never starts a new trial. There is no STOP control.
- Review closure [P][O-5][O-8][D-6]: at the Utility Deck record closure
  (`reviewClosure.ts` → `closeM15AtReview`) a series in its first-response
  phase (orientation, exploration, wiring or questions) closes as
  `closed_at_review` (system; `series_closed_at_review` with the closure
  snapshot, then the kit's `window_closed`, censored): recorded answers and
  wirings kept, unanswered questions missing, no results afterwards; the
  bench then opens as the closed record
  `Station record closed — the bench keeps its record.` with
  `N of 4 answers recorded.` and records nothing. A completed series is not
  reclosed. A never-opened bench is recorded absent by the kit's
  `markAbsent` (`briefed_not_opened` when the briefing was acknowledged,
  otherwise `not_briefed_not_opened`), never `declined`.
- Reload [O-6][P §5.14, §5.290 (a)]: the existing hold-back — an opening of
  this administration in an earlier page load of the session identity ⇒ the
  bench is never re-run in the new load (prior exposure recorded; the kit's
  `technical_failure` with a detail beginning `reload`; the closed record
  `This bench was already used in this session. Its record is kept; nothing further is recorded here.`;
  the load's row `interrupted`; the earlier events immutable in
  `prior_page_load_events`), also when the earlier load completed all four
  or saw only the orientation. In addition, at the first `guardM15Reload`
  run of a later page load (the Diagnostics Laboratory's `create()`) the
  adapter writes `prior_load_checked` once per load (the §5.290 (a) fields:
  `page_load_index`, `prior_page_load_event_count`, `prior_opening_found`,
  `prior_briefing_found`, `history_continuous`,
  `prior_opening_absence_established`), before the hold-back record when an
  opening is found; when it establishes the absence of an earlier opening
  with continuous history, the load is read exactly as a first load. A bench
  never opened before the reload runs normally. Absent evidence is never
  proof of non-exposure, and lossless recovery is never claimed (the
  limitations of §5.290 (a) apply).
- Faults: a fault while the first-response phase is open closes the series
  as a technical failure through the window kit (the answers so far kept in
  the closure snapshot) and leaves the laboratory usable; the bench then
  opens as the record
  `The bench has a fault and is closed. Recorded answers are kept.` (D-9); a
  fault after completion is recorded (phase `feedback`) and never changes
  the scored evidence; a dialog never stays stuck after a cancelled callback
  (every host callback is guarded).
- Completion [P]: the fourth first response writes
  `first_responses_completed` (closure snapshot, `closure_reason`
  `completed`) and the kit's `window_closed` (exit `completed`); the scored
  phase has no later closure event, and nothing afterwards (results,
  leaving, the review, a fault) reopens or changes it.
- Layout [P D-U17-2][D-9]: the shared surface launched with `frame: 'wide'`
  — panel over the whole visible design area (1050 × 588 design px at (−125,
  6), identical at the 1280 × 720 and 1920 × 1080 canvases); 16 px design
  text everywhere, title 20 px; the bench column 714 px wide at panel x 12
  (dials and units line, the two TEST controls, the TEST RECORD, the wiring
  option tiles or the recorded wiring); the 300 px right column at panel x
  738 (instruction or question, option tiles, the commit controls); the
  bottom row at panel y 462 (HELP, LEAVE BENCH, the view's primary control,
  CLOSE HELP); the confirmation dialog alone with the header and the status
  line, its controls at panel y 250 ending at x 720 — left of the right
  column that holds every opener and clear of the bench column's controls;
  one-line footer; at least 30 design px between the lowest control and the
  feedback line's top under the default font and under forced Courier New
  and Lucida Console (measured in the real game, R7); never smaller text,
  clipped or shortened wording, scrolling or a larger minimum window.
  Keyboard and pointer each reach every control.

(2) The two boxes, wirings, questions and keys [O-1] — the approved content
of preview r5, transcribed unchanged (box 1 option A as selected by the
owner); their logical correctness establishes no empirical validity.
"Unseen" as preview §7.3: a question's situation is never an exploration
act, and its step trace equals no test listing and no test listing with its
first step removed; sign-mirrored or partial listings are not excluded.

- Box 1 `s1` (`m15-s1-v1`; dials F, G; units P, Q, W). Station wiring: F → P
  raises, G → P raises, P → Q lowers, P → W raises. Test listings (derived
  by the simulator, equal to the preview's):
  `TEST F  step 1: P up · step 2: Q down, W up`;
  `TEST G  step 1: P up · step 2: Q down, W up`. Wiring options: `s1_w_a`
  `F raises W. G raises W. P raises Q. W lowers P.` (refuted by TEST F and
  TEST G), `s1_w_b` `F raises P. G raises P. P lowers Q. P raises W.` (KEY),
  `s1_w_c` `F raises W. G raises P. P lowers Q. P raises W.` (refuted by
  TEST F), `s1_w_d` `F raises P. G raises W. P lowers Q. P raises W.`
  (refuted by TEST G). Questions: `s1_q1` "P locked; F and G up" —
  `Unit P is LOCKED. Dials F and G are turned up together, one notch each. What does unit W do?`
  (locked P; dials F, G turned; asked W) — KEY `s1_q1_c` "W does not move" —
  results line
  `With P locked, neither dial gets past P, and only P drives W. W does not move.`;
  `s1_q2` "W locked; P boosted" —
  `Unit W is LOCKED and unit P is BOOSTED; no dial moves. What does unit Q do?`
  (locked W; boosted P; asked Q) — KEY `s1_q2_b` "Q goes down" — results
  line
  `P lowers Q directly; W drives nothing, so locking W changes nothing for Q. Q goes down.`
- Box 2 `s2` (`m15-s2-v1`; dials S, T; units X, Y, Z). Station wiring: S → X
  lowers, X → Y raises, Y → Z lowers, T → Y lowers. Test listings:
  `TEST S  step 1: X down · step 2: Y down · step 3: Z up`;
  `TEST T  step 1: Y down · step 2: Z up`. Wiring options: `s2_w_a`
  `S lowers X. X lowers Y. Y lowers Z. T lowers Y.` (refuted by TEST S),
  `s2_w_b` `S lowers X. X lowers Y. Y lowers Z. T raises Z.` (refuted by
  TEST S and TEST T), `s2_w_c`
  `S lowers X. X raises Y. Y lowers Z. T raises Z.` (refuted by TEST T),
  `s2_w_d` `S lowers X. X raises Y. Y lowers Z. T lowers Y.` (KEY).
  Questions: `s2_q1` "X boosted" —
  `Nothing is locked and no dial moves. Unit X is BOOSTED. What does unit Z do?`
  (boosted X; asked Z) — KEY `s2_q1_b` "Z goes down" — results line
  `X raises Y, and Y lowers Z: when X goes up, Y goes up and then Z goes down.`;
  `s2_q2` "Y locked; T up" —
  `Unit Y is LOCKED. Dial T is turned up one notch. What does unit Z do?`
  (locked Y; dial T turned; asked Z) — KEY `s2_q2_c` "Z does not move" —
  results line
  `T reaches Z only through Y. With Y locked, the change stops at Y. Z does not move.`
- What the tests reveal (preview §7.1, §7.4; re-derived by the unit's own
  independent oracle, P1): each station wiring is the only one of 79 461
  signed acyclic wirings consistent with both tests; over all wirings S1-Q1
  needs both tests, S1-Q2 is fixed by either, S2-Q1 is fixed by TEST S alone
  and S2-Q2 by TEST T alone; among the four OFFERED options treated as
  equally plausible, TEST F alone leaves B and D and TEST G alone leaves B
  and C (disagreeing on S1-Q1), TEST S alone leaves C and D (disagreeing on
  S2-Q2), TEST T alone leaves A and D (disagreeing on S2-Q1). Answers under
  each option (A / B / C / D): S1-Q1 up / no move / up / up; S1-Q2 up / down
  / down / down; S2-Q1 up / up / down / down; S2-Q2 no move / up / up / no
  move — four of the six wrong options imply the key of at least one
  question, which is why model correctness and prediction correctness are
  separate companions. The remaining cues of preview §7.5 (link-substitution
  neighbours, per-dial reach, dial symmetry, the single-verb option, the
  question kind, option majority) are computed and REPORTED by the pure
  spec, never asserted; a correct response never proves testing or
  understanding.

(3) As built — the bench (`src/pilot/windows/m15SystemsContent.ts` — the two
boxes exactly as the preview: ids, content versions, the links of each box,
each question's situation as data, the wiring options as link sets with
their one-line text derived from the links, the keys, the results lines and
every participant-facing string; `m15SystemsModel.ts` — the step simulator
of preview §2 with the analysis conventions of §7.2, the series state
machine, the entry and closure snapshots, the reload predicate and the
`prior_load_checked` builder; `m15RelayBench.ts` — the window adapter
(`ItemWindow` item `M15`, opportunity `proto_m15_systems_series`, window
`m15_system_s1`, family `proto_m15_systems_`, version `m15-systems-v1`,
scene `diagnostics_laboratory`, object `m15_relay_bench`), the log sink with
the protocol stamp, the optional focused clock, the reload guard,
`presentM15`, `declareM15`, `openM15`, the surface commands,
`m15ConsumesEsc`, `closeM15Surface`, `resumeM15Surface`, `closeM15AtReview`,
`bindM15Surface`, `m15Window`; `m15SurfaceModel.ts` — the pure work-surface
model builder for the wide frame). The views: the orientation card (START
BOX 1, HELP, LEAVE BENCH); a box's wiring step — header `RELAY BOX N OF 2` /
`Wiring`, the status line, the bench column (the dials and units line,
`TEST DIAL <d>  [1]` / `[2]`, TEST RECORD with one line per dial, the heading
and the four one-line option tiles), the right column (the instruction,
RECORD WIRING [R], CANNOT TELL [N]), HELP and LEAVE BENCH in the bottom row;
the confirmations drawn alone with the header and the status line; the
wiring acknowledgement (the test record with both TEST controls disabled
beside `Tests closed`, YOUR RECORDED WIRING, the line and FIRST QUESTION); a
question — header `Question N of 2`, the bench column with the test record
and YOUR RECORDED WIRING, the right column with `QUESTION N OF 2`, the
question, the three option tiles, RECORD ANSWER [R] and CANNOT SOLVE [N];
the answer acknowledgement with NEXT QUESTION / NEXT BOX / SHOW RESULTS and
the status `N of 4 answers recorded.`; the results (one view per box with
NEXT BOX / BACK, FINISH and HELP); the help sheet alone with CLOSE HELP; the
closed records. Every activation calls one adapter command with its input
mode (pointer and keyboard converge); hotkeys 1 / 2 (tests), A–D (wiring
options) / A–C (answers), R, N, H; ENTER / SPACE on the focused element;
every control is reachable by pointer and by keyboard. The 400 ms settle of
every view transition and the fresh-press rule live in the model
(`view_shown_at_ms`, `pending_commit.opened_at_ms`); a held key never
reaches the model (the unchanged surface drops `event.repeat`).

(4) Events and feature. Family `proto_m15_systems_`, ONE opportunity
`proto_m15_systems_series`, the kit's window id `m15_system_s1`, box window
ids `m15_system_s1` / `m15_system_s2`, administration `m15-systems-v1`,
content versions `m15-s1-v1` / `m15-s2-v1`; suffixes and fields in the
addendum, §2 "U18". All PROVISIONAL candidates; nothing enters
`ScoringManager`, `SummaryScope`, the canonical context or the return URL;
the v2 ids `proto_m15_layered_cipher` / `proto_m15_cipher_*` /
`m15_causal_w1` are retired from the route and not written; the cipher's
secondary identity `secondary_m15_layered_cipher` / `secondary_m15_cipher_*`
is written only in the developer-alias laboratory and read by no extractor.
`m15_correct_first_predictions` (primary, the only M15 row; `registerV3.ts`
entry `M15` now carries the explicit v3 route — the opportunity, the two box
windows in zone `diagnostics_laboratory`, episode 3, the family prefix and
`secondary_ids: ['secondary_m15_layered_cipher']` — and `implemented`; the
feature row, the planned denominator 4, the range, the direction, the
coverage label, the independence and the operational label unchanged): value
= numerator = questions whose FIRST response is the keyed option;
denominator = questions with a first response in the current page load;
planned denominator 4. CANNOT SOLVE and a wrong option are in the
denominator and not in the numerator; a question without a first response is
missing, never incorrect; an answer counts whatever wiring was recorded and
whatever tests were run. The extractor (`src/measurement/features/m15.ts`,
read-only, current load only) recounts the value from the `first_response`
events against the content key and compares it with each event's `correct`
flag and with the closure snapshot. Dispositions and the integrity list:
addendum §2 "U18" and §5.296, §5.298; the reload-before-opening distinction:
§5.290 (a) applied to M15. Components (companions beside the value, never
inside it): the exposure stages kept distinct (`briefed`, `bench_opened`,
`orientation_acknowledged`, `boxes_presented`, `questions_presented`,
`never_opened_reason`), `reload_check`, the administration and content
versions, the assigned and realised box and question orders,
`observations_share_one_episode: true`, `first_response_phase_complete`,
`by_box` (numerator, denominator, planned 2, omissions per box), `omissions`
(presented-unanswered and unpresented questions, apart from CANNOT SOLVE),
`model` (per box the recorded wiring, `wiring_correct`, the wiring key;
`models_recorded` / `models_correct` / planned 2), `exploration` (per box
the runs per dial before the wiring, the dials tested,
`both_dials_tested_before_wiring`, the total), per question the response
kind, option, correctness, key, `recorded_wiring_option_id`,
`consistent_with_recorded_wiring`, `tests_before`, drafts, help consults,
active and focused time, input mode; `cannot_solve_count`,
`cannot_tell_count`; help consults by phase; `results_shown`;
`exposure_record_consistent`; `model_record_consistent`. No total mixes
model, exploration and prediction correctness; no total across items;
`declined` never.

(5) Integration. `src/pilot/windows/reviewClosure.ts` calls
`closeM15AtReview` after M14's (one import, one call, its comment).
`DiagnosticsLaboratoryScene.ts`: the four `m15CausalModel` imports and the
`m15CausalSurfaceModel` import replaced by the adapter's and the surface
model's; `declareM15()` and `guardM15Reload()` in `create()` in place of
`declareM15Causal()`; `resumeM15Surface(now)` in the existing RESUME
handler; the `m15` PHASES entry's `status` (`() => m15Window.windowStatus()`
— `closed` for every closed state of the kit, read by `windowTerminal` as
recorded) and `opportunityId` (`proto_m15_systems_series`); the evidence
table's `onPromptOpened` (`openM15` with the route stage, `openWorkSurface`
with `frame: 'wide'`, the bound surface model and an `onClose` that returns
false while ESC closed a dialog or the help sheet); the private
`m15SurfaceHost()` in place of the v2 `surfaceHost()` (LEAVE BENCH, FINISH
and ESC take the same path: pause, then close); `presentM15(now)` in each of
the FOUR `lab_brief_ack*` `onSelected` handlers of both briefing branches
beside `advancePilotStage('lab_work', now)` [O-5]. Bench label, phase name,
Noor's lines, Kai's text, every other bench, the M10 / M11 handling and the
room geometry are untouched. `m15LayeredCipher.ts`: only the identity
(`M15_OPPORTUNITY_ID` → `secondary_m15_layered_cipher`, the family argument
of `declareIpEvents` / `logIpEvent` → `secondary_m15_cipher`, the header
comment); `telemetry.ts`: `secondary_m15_cipher` added to the `IpFamily`
union (`proto_m15_cipher` kept for the unimported v2 module).
`features/index.ts` imports the extractor. Specs: `e2e/m15_systems.spec.ts`
(pure, new) and `e2e/m15_systems_route.spec.ts` (browser, new);
`pilot_lab.spec.ts` and `pilot_signal_incident.spec.ts` with their M15 steps
and identity assertions re-expressed (the M16 / M17 / M18 assertions, the
phase order, the display and intercom progression, the modal-ownership and
no-score checks kept; M15 leaves the IP-family loop and gets an explicit
check of equivalent strength; the former STOP step of `pilot_lab` leaves M15
open and null `pending`); `final_scientific_gates.spec.ts` test U8-13
re-expressed; the cipher's secondary literals in `ip_boundaries.spec.ts`,
`ip_decoder.spec.ts` and `ip_lab_flow.spec.ts` (the orientation test's
pattern extended to `secondary_m15_cipher_`). Untouched: `windowKit.ts`,
`WorkSurfaceScene.ts` (the wide frame used as is), every other
`src/pilot/windows/*` module (`signalSurfaceModels.ts` included, now
unimported), `src/informationProcessing/**` other than the two files
(`m15CausalModel.ts`, `causalForms.ts` included — in the tree, unimported,
unchanged), `interactionRegistry.ts` (its window label `m15_layered_cipher`
stays, U24 backlog), the frozen v2 ledger, the shared measurement framework,
`e2e/pilotHelpers.ts` and every other helper and spec
(`signal_incident_models.spec.ts` still describes the unimported v2 module
and still passes).

(6) Test evidence (10 October 2026; commands, counts, reviewers and every
exception in `UNIT-LOG.md` "U18 results"; the counts below are those of the
FINAL source after correction round 1, §5.300). Pure,
`e2e/m15_systems.spec.ts` — 65 tests passed: the independent oracle (its own
transcription and simulator; both listings reproduced per box; 79 461 signed
acyclic wirings per box with exactly one consistent with both tests, the
transcribed wiring; every key the one answer over that set and equal to the
module's; the §7.1 answers-possible counts, the §7.1 option answers and the
association reading's misses; the module's own simulator agreeing with the
oracle and with the §7.1 table under each offered option for both questions
— sixteen cells; among the four offered options the §7.4 table — TEST F
alone leaves B and D, TEST G alone B and C, TEST S alone C and D, TEST T
alone A and D; each wrong option refuted by exactly the tests the preview
names; no trace equal to a listing or a shortened one; no
magnitude-dependent key, listing or option answer; the §7.5 cues computed
and reported, never asserted), the content cross-check (letters, link sets
and texts, situations, labels, results lines; no box letter in the
orientation or the help; the four `lab_brief_ack*` handlers call
`presentM15` by source), the register row and route, the cipher's secondary
identity and its inertness for the M15 row, the series model (no correctness
before the fourth answer, identical acknowledgements, results refused before
the fourth answer and after a review closure, order, exploration closing at
the wiring, the fresh-press rule on all four confirmations, the settle on
every transition including KEEP WORKING and FINISH, drafts, leaving and
returning, the review closures, the reload predicate and check, faults, the
entry snapshot and `consistent_with_recorded_wiring`), the extractor (values
and companions, stability, partial and open series, zero evidence, reload
paths, every legitimate-missingness case, every integrity case including a
box presented before every question of the earlier box was answered,
unscored-record defects, determinism) and the wording. Browser,
`e2e/m15_systems_route.spec.ts` on the participant route — R1 (with a
carried ENTER after NEXT BOX that closes nothing), R2 (with a double click
on CANNOT SOLVE opening one dialog and no dialog control over an opener's
place), R2 at `canvas=1080`, R3, R4, R5, R6, R7 (Courier New), R7 (Lucida
Console), R8: 10 passed in the implementer's run after the round's code
changes (25.0 min) and 10 passed in the final matrix (24.8 min), no scenario
blocked or skipped, the twenty-four frames rewritten; after the two
test-only assertions added at the confirmations (the wiring landing in R1,
the one-system geometry check in R2) R1, R2 and R2 at `canvas=1080` were
rerun once more and passed (UNIT-LOG "U18 results"); the real-game layout
gate measured at 52 / 50 / 50 design px (Courier New / Lucida Console /
`canvas=1080`). Regression on the final source: P2 — 153 passed, 2 failed
(the two documented `final_scientific_gates` exceptions, reproduced
identically on the untouched export of `f822eb4`: line 146 `toEqual([])`
receiving `["proto_m08_effort_choice"]`; `toHaveLength(10)` receiving 8);
the IP pure tests 12 passed. B2 — `pilot_lab` 3 passed;
`pilot_signal_incident` 2 passed; `ip_lab_flow` / `ip_decoder` /
`ip_boundaries` 21 passed, 1 skipped (the spec's own M17 skip), 1 failed —
`ip_boundaries` "families are pairwise disjoint …" at
`expect(Object.keys(families).sort()).toEqual([...FAMILIES].sort())` missing
`proto_m17_syntax`, the same assertion, message and step on the base, the
received list differing only by the cipher's renamed family;
`m14_integration_route` R3 1 passed. Static: `lint:tsc`, `build`, ESLint and
Prettier on the changed `.ts` files, Prettier on the register and the
addendum, `git diff --check`, `verify-unit` (PASS, 23 of 23 paths) and the
guard's 58 tests. The matrix and UNIT-LOG fail Prettier at the base and
after this unit for the inherited reasons only (the matrix's item table
re-padding, the verbatim contract appendix); the implementer's own
paragraphs in them are Prettier-clean by content. The first matrix (before
the round) and the final matrix (after the round's code changes; the
test-only slice at the confirmations followed and was rerun by the
implementer) were both run by the test-reviewer (Sonnet 5.5) — UNIT-LOG "U18
results"; the reviewers' confirmations of the corrections are recorded there
too.

(7) Residual limitations (stated, not resolved by this unit). The four
predictions share one bench episode and two boxes
(`repeated_within_episode`); fixed order confounds box and position; box 1
carries first contact with the bench and there is no practice box; the boxes
are not equated; three options per question (chance 1/3). Each dial's test
is needed for a prediction only if the four offered options are treated as
equally plausible: the surface preferences disclosed in preview §7.5 and
reported by the pure spec (box 1 — the link-substitution-neighbour rule and
"set the odd option A aside, then prefer dial symmetry" pick the key, reach
ties A and B; box 2 — reach and the single verb split A / D from B / C and
fix S2-Q2 without TEST T, and "drop the single-verb option, then prefer the
greatest reach" picks D) can stand in for tests, and across both boxes give
an expected 3 of 4 keys (neighbours), 3 of 4 (the two-step rule) or 2.5 of 4
(reach) with no test; the question kind predicts every key ("BOOST present →
goes down, otherwise → does not move", 4 of 4; the intuitive "lock stops,
boost raises" 2 of 4); three of four box-1 options imply S1-Q2's key; S1-Q2
is fixed by either test and its direction can be read off a partial listing;
S2-Q1 is the sign-mirror of a partial listing; box 1's two test listings are
identical. No correct response proves testing or understanding; model
correctness and exploration describe the wiring record and the tests run,
never what was understood. Absent evidence is never proof of non-exposure
and lossless recovery is never claimed: the reload limitations of §5.290 (a)
(a check only where the bench becomes available — laboratory entry;
continuity read from the recovered sequence numbers and the store's readable
meta record, never a tail lost while the meta record survived;
`foreign_records_rejected` not part of the test) apply to M15 unchanged. The
open M05 matters of §5.290 (e) (i) — the competing briefed tasks and the
episode-1 cap on the scripted route — are carried forward unchanged and
untouched (no M05 assertion belongs to this unit; the route scenarios
decline every M05 job). The capture specs, the `interactionRegistry` window
label `m15_layered_cipher`, `signal_incident_models.spec.ts`'s description
of the unimported v2 module and `world_v1_*` evidence for the bench are U24
backlog. The fault record line and the per-view footers are implementer
wording (D-9), not preview text. Passing tests establish implementation
correctness only; this unit establishes no psychometric validity and does
not show that correct answers require exploration.

**Unit 17 closeout (M14; 9 October 2026)** — one exceptional closeout
under the research owner's closeout ruling and dispositions (§5.290;
`UNIT-LOG.md` "U17 closeout"); the "Unit 17 (M14): as-built" record
below stands except where this record says so. **Status: a clarification
of the provisional reload classification and one interface settle; no
authored content, answer key, scoring formula, threshold, canonical event
or administration version changed; NOT scientifically validated.**

(1) Reload before the desk was opened (ruling §5.290 (a)). The product's
behaviour at the desk is unchanged: the guard already ran the desk
normally when no earlier opening was found and held it back when one was
(§5.285). What changed is the RECORD and the DISPOSITIONS: at its first
run in a later page load (Concourse entry) the guard writes the
provisional family record `prior_load_checked` from the runtime's
recovered history and its losslessness block — `page_load_index`,
`prior_page_load_event_count`, `prior_opening_found`,
`prior_briefing_found`, `history_continuous` (at least one earlier
record; sequence numbers from 1 without a gap or a duplicate; the store's
meta record readable) and `prior_opening_absence_established` (no opening
found AND continuous) — before the hold-back record when an opening is
found. The extractor reads a reloaded load without an opening as
`interrupted` ("the absence of an earlier opening not established") unless
every check record of the load establishes the absence with its flags
agreeing; it then reads the load exactly as a first load — the same
integrity checks (§5.284), then `not_presented` before this load's
briefing, `pending` (`briefed_not_opened`) after it, `no_eligible_event`
(`briefed_not_opened`, censored, `closed_at_review`) at the review
closure. The hold-back (an actual earlier opening — orientation-only or
completed) keeps `interrupted`; a current-load briefing is read beside it
and erases nothing; contradictory check records are flagged
(`exposure_record_consistent: false`) and establish nothing; the
components carry `reload_check`. Evidence identified first, limitations
and the owner's open points: §5.290 (a), (e). Files:
`src/pilot/windows/m14IntegrationModel.ts` (`m14PriorLoadCheck`,
`M14_EVENT_SUFFIXES`), `src/pilot/windows/m14IncidentDesk.ts`
(`recordPriorLoadCheck` in `guardM14Reload`, once per load, reset in the
test hook), `src/measurement/features/m14.ts`.

(2) CLOSE HELP on the results (ruling §5.290 (b)). `m14sCloseHelp`
re-arms the results settle (`results_shown_at_ms`) as it re-arms START
and the acknowledgement, so the second press of a doubled ENTER or the
second click of a double click on CLOSE HELP — which shares the
bottom-row place of NEXT / BACK — is refused by the existing 400 ms rule
on `m14sResultsNavigate`: the shown packet stays, no `results_shown` is
written; a settled press navigates. Nothing measured changes
(`results_shown_at_ms` serves the settle only; the score is fixed at the
sixth first response). The two comments of `m14SurfaceModel.ts` that
claimed placement alone protected CLOSE HELP now name the settle on the
results view (gameplay review F1). Controls, layout and copy unchanged.

(3) The M05 timing diagnostic (ruling §5.290 (d)). One instrumented
reproduction of the committed episode-1 route (a scratchpad spec driving
the same steps with marks between them; no product change, no faked
time, no injected state; the committed test untouched). MEASURED, times
relative to M05 'o1' `eligible` (page time 1791467150200, 11 ms after the
lamp job was accepted, `environment_paused: false`): plan board open
+6.1 s → closed +8.1 s; the incident desk reached +17.6 s (the lane
driver's walk 9.5 s), opened +18.5 s, first response +20.9 s, closed
+21.8 s; quality packet open +29.3 s → closed +31.3 s; gauge check done
+58.1 s (26.8 s for the driver's approach from above, the interaction and
its 400 ms wait; the proximity prompt is a world prompt, not a dialog);
`cap_reached` at +67.3 s wall — `focused_ms` 60 012, `wall_ms` 67 330,
`excluded_ms.unusable_controls` 7 318, every other cause 0,
`surface_open: false` — 9.3 s into the 13.3 s walk from the gauge toward
the lamp, then the kit's `window_closed` (`stopped`, closure `cap`); lamp
surface open +76.0 s (`control_presented` with `focused_ms` 60 012,
frozen); START +76.7 s ⇒ `late_start` (`after: cap`, `since_closure_ms`
9 165; no `started`); `work_completed` +78.5 s (`late: true`; the
lamp surface closed +79.4 s); the opportunity `completed` / `valid`, the
item `pending`; no runtime error.
The three surfaces open inside the window sum to 7 373 ms (plan board
2 033, desk 3 281, quality packet 2 059) against 7 318 ms excluded; the
55 ms difference is the marks' own latency around the open / close
waits, and the running segments sum to 59 957 ms against 60 012 focused;
the instrumentation's own reads inside the window (about nine marks,
each reading the events and the coverage probe) are inside both figures
and their cost was NOT measured. INFERENCE: (a) the trace explains the missing
`proto_m05_start_started` completely — the 60 s focused cap closed the
occasion as a censored non-start before the lamp was reached, so the
press is the model's late start (companion) and `work_completed` follows
it as designed; (b) M14 behaves correctly with respect to the M05 clock —
paused under the desk's surface for an interval consistent with its
open time (the excluded total is not broken down by surface) through
the Concourse's host-pause hook, resumed at the close, no M14 event or
state touching M05 (the desk keeps its own clock); (c) the failure is a
limitation of the scripted test route's EXPECTATION: the route's
cumulative focused time before the lamp (walking and interaction, 50.7 s
before the last walk; the gauge step alone 26.8 s) exceeds the cap; the
re-expressed desk step contributes about 10.4 s gross (the lane walk and
the approach, not net of the walk a route without the desk would take),
and no single step is shown to be decisive; a participant who follows
Vale's briefed order (plan board, quality packet, incident desk, then
the lamp) walks the same circuit and faces the same cap, so the finding
is not "driver-only"; it is NOT an identified U17 product regression —
nothing in the diff touches M05 and every pause and resume followed its
surface; (d) no comparable baseline exists (the untouched base stalls at
the desk step), so it is not labelled pre-existing; (e) no product defect
beyond the two approved corrections is exposed: the cap is the approved
censoring signal, the late start is recorded as designed, the
opportunity closes valid. The smallest test-side remedy, for U24 and not
made here: assert the observed start on a route whose focused time
before the lamp stays under the cap (the lamp job accepted after the
optional stations, or the gauge step driven by the lane driver), the M05
rules and the cap unchanged. The M05 competing-task observation and the
owner's options: §5.290 (e) (i).

(4) Documentation dispositions (ruling §5.290 (c)): recorded in §5.289
(the owner questions (i)–(iii) closed), §5.276 (fonts and the "tank 3:"
wrap carried to U24 / release verification), the addendum §2 "U17"
(`prior_load_checked`, the dispositions sentence, `reload_check`) and §3
(the M14 row), the matrix "U17 closeout" paragraph.

(5) Changed files (inside the 18-path allowlist; the closeout touched
nine): `src/pilot/windows/m14IntegrationModel.ts`,
`src/pilot/windows/m14IncidentDesk.ts`, `src/pilot/windows/m14SurfaceModel.ts`
(two comments), `src/measurement/features/m14.ts`,
`e2e/m14_integration.spec.ts`, `e2e/m14_integration_route.spec.ts`, this
register, the addendum, the matrix and `UNIT-LOG.md`. Not touched:
`windowKit.ts`, the extraction framework, `ResearchRuntime`, `EventStore`,
`StationConcourseScene.ts`, `m14PacketContent.ts` (no copy changed),
`e2e/pilot_episodes_1_2.spec.ts`, any other item.

(6) Test evidence (9 October 2026; commands, counts, reviewers and every
exception in `UNIT-LOG.md` "U17 closeout results"). Pure
`e2e/m14_integration.spec.ts` — 75 passed (the 71 of the unit plus the
reload-check predicate, the results-help settle, the established and
not-established extractor cases with the hold-back contradiction and the
orientation-only / completed hold-backs; the missingness list extended).
Browser `e2e/m14_integration_route.spec.ts` R5 (both parts, with the check
record beside the hold-back), R8 (a genuine reload before the opening:
`interrupted` at the opening screen, the check at Concourse entry with
`prior_briefing_found: true` and the absence established, `not_presented`
before this load's briefing, `pending` / `briefed_not_opened` after it,
the orientation card, START, the earlier load byte-identical) and R9
(six answers, HELP on the results, ENTER ENTER then a settled ENTER, a
double click on CLOSE HELP then a settled BACK) — passed; three frames in
`.playwright-mcp/u17-closeout` (c01–c03; the U17 evidence intact). The
diagnostic: (3). Static: typecheck, build, ESLint and Prettier on the
changed `.ts` files and the register and addendum clean, `git diff
--check` clean, verify-unit PASS against 5d95e6e, guard tests 58 / 58;
the matrix and UNIT-LOG fail Prettier as at 5d95e6e (compared on the
committed versions). Reviews: test-reviewer Sonnet 5.5; scientific and
gameplay reviewers Opus 5.5 (one parallel pass each); material findings
corrected in the one bounded pass (scientific F1 the integrity scope, F2
the coherent check, F4 this record; gameplay F1 the comments, F2 this
record, F3 the conclusion's wording), the affected checks rerun, the
material fixes confirmed (UNIT-LOG). Passing tests establish that the
build does what this record says, not that the measure is valid.

(7) Residual limitations. Those of the as-built record's (7) stand, with
the §5.285 sentence refined: after a reload the new load's row is
`interrupted` when the earlier load opened the desk (completed or not),
when no check of the load exists (the Concourse never reached) and when
the recovered history is not continuous; the continuity test cannot see
a tail lost while the store's meta record survived (§5.290 (a) (2)). The
M05 cap on the briefed route is an M05 design observation (§5.290 (e)
(i)), not an M14 matter.

**Unit 17 (M14): as-built** — the two-packet incident desk of the
Station Concourse (bounded unit under contract `U17-CONTRACT.md`,
amendments A1 of 7 October 2026 and A2 of 8 October 2026). **Status:
technical implementation of the approved row under research-owner
decisions D-U17-1 and D-U17-2; `m14_correct_first_integrations` is a
candidate indicator and NOT scientifically validated.** The six decisions
are repeated observations inside ONE desk episode, clustered in two
packets — never six independent situations; packets and decisions are
not equated in difficulty; the content is one authored form. Passing
tests establish implementation correctness only.

(0) Authority. **Research-owner decision D-U17-1 — APPROVED 7 October
2026** and **research-owner decision D-U17-2 — APPROVED 8 October 2026**
(owner rulings, recorded in §5.275 and §5.276; not implementer defaults
and not reopened): the approved content, keys and results lines
(item 1); sources on demand, staying open until closed, openings never
read as reading (item 2); fixed packet, decision and option order, one
form (item 3); identical neutral acknowledgements and no correctness
feedback before the sixth first response (item 4); confirmed option or
confirmed CANNOT SOLVE as the only responses, drafts never counting,
LEAVE DESK resumable, no STOP TASK (item 5); the optional desk with the
never-opened mapping and never `declined` (item 6); the wide frame, the
one-file allowlist addition and typography T1 (D-U17-2). The approved
row is §2 (M14), §2b, the matrix row, addendum §3 and `registerV3.ts`
(entry `M14`). Provenance limit: the original owner documents were not
on disk when the contract was prepared; the two decisions are explicit
decisions for this implementation, not recovered wording. Ruling
D-U16-1 belongs to M13 and approves nothing here. Each rule below
carries its source: [O-n] decision D-U17-1 item n, [O-7] / [O-8]
decision D-U17-2, [A] approved row, [P] recorded precedent, [D-n]
implementer default (§5.277 onward).

(1) Administration `m14-integration-v1` — **specified before the series
model and the interface were written.**

- Place and access [A][O-6][P]: the existing Concourse incident desk
  (station `incident_desk`, registry `concourse.incident_desk`, surface
  `m14_incident_desk`, the generic `WorkSurfaceScene`), episode 1,
  operational label "Incident desk (Concourse)". Optional, available
  whenever the station is reachable; Vale's dialogue unchanged; no
  gate, reward, judgement, progression or payment consequence; non-use
  is never read as refusal. Acknowledging Vale's briefing
  (`briefing_ack`) records the briefing exposure through the window
  kit's `present` (`presented`) because the briefing names the desk —
  exposure only, not a desk opening and not a decision presentation.
  The legacy Information Processing Lab module `m14PacketSaturation.ts`
  (family `proto_m14_packet_`) is untouched.
- Content and order [O-1][O-3][O-8]: packets `p1` (`m14-p1-v1`, "Night
  packet: pump bay and power", readings 04:00) then `p2` (`m14-p2-v1`,
  "Morning packet: mast, yard and uplink", readings 07:00), each with
  six messages (`p1_m1` … `p1_m6`), three gauges (`p1_g1` … `p1_g3`) and
  three decisions (`p1_d1` … `p1_d3`) with four options in the preview's
  order (`p1_d1_a` … `p1_d1_d`); the keys and establishing sets of (2);
  T1 applied (U+00A0 inside "tank N" / "Tank N" and before "%"). Fixed
  packet order P1 → P2; within a packet D1 → D3, one at a time, the next
  presented only after the current first response; one form; no
  counterbalancing. Gauges show label, reading and reference line only.
- Objective access [A][O-2]: all nine sources of the current packet are
  listed from the packet's presentation until the series closes
  (`packet_presented.sources_available`). A closed message tile shows
  "time · sender"; a closed gauge tile its label. Activating a tile
  (pointer, ENTER / SPACE on focus, or keys 1–6 for messages and 7–9 for
  gauges) opens it — its full text appears in place, left-aligned,
  top-aligned — or closes it if open; reopening is unlimited; any number
  may be open; nothing closes a tile automatically; opened tiles stay
  open across decisions inside the packet and across leaving and
  returning; sources of packet 2 start closed. Openings and closings are
  recorded (`source_opened` / `source_closed`) as exposure records and
  are never read as reading, understanding or use.
- First opening [D-1]: the orientation card (preview §3.1) with START
  PACKET 1 (plus HELP and LEAVE DESK); acknowledging it is recorded
  (`orientation_acknowledged`) and presents packet 1 and decision 1.
  START accepts a press only 400 ms after the desk opened or after the
  help sheet closed (a press carried from the station prompt or a
  doubled CLOSE HELP press never starts the packet). No practice
  decision, no timing. Left before START, the next opening shows the
  card again.
- Drafts [D-2]: activating an option (pointer, ENTER / SPACE, or A–D)
  makes it the draft; another option replaces it; the draft activated
  again clears it; a draft survives leaving and returning; a draft is
  recorded (`option_drafted`) and is never a response.
- Commitment by option [O-5][D-3][P §5.210, §5.262]: RECORD ANSWER (R or
  the button) with no draft shows "Choose an answer first." and records
  `commit_without_draft` only. With a draft it opens "Record this answer
  for decision N? It cannot be changed afterwards." with RECORD ANSWER
  (ENTER) and KEEP WORKING (ESC) — while the dialog is open the model
  renders only the header, the status line and the dialog, the confirm
  control is the first focusable element (ENTER confirms; A–D, 1–9, R, N
  do nothing) and the confirm control is not at the screen position of
  the control that opened the dialog. Only a fresh press confirms: a
  press inside the first 400 ms after the dialog appeared is refused and
  recorded (`commit_press_refused`, reason `dialog_settling`; one record
  per dialog, the count carried on the next record); a held key or an
  auto-repeat is dropped by the unchanged surface before the host
  (`event.repeat`) and is therefore never recorded. KEEP WORKING / ESC
  closes the dialog without a response (`commit_cancelled`). A doubled
  confirmation records one answer.
- Commitment by CANNOT SOLVE [A][O-5][D-3]: CANNOT SOLVE (N or the
  button), visible from the decision's presentation until its first
  response, opens "Record CANNOT SOLVE for decision N? It cannot be
  changed afterwards." with RECORD (ENTER) and KEEP WORKING (ESC), same
  fresh-press rule; it is an incorrect first response whatever the
  draft; it is textually distinct from LEAVE DESK and separated from it.
- The first response [A][O-5]: written once (`first_response`) and
  immutable; no later act, reopening, results view, reload or closure
  changes or duplicates it; a second RECORD ANSWER, Cannot solve after an
  option answer and an option after Cannot solve never create a second
  one (the decision's controls are gone after the response).
- Acknowledgement [O-4][D-3]: identical for every response whatever its
  kind or correctness — "Answer recorded for decision N." with NEXT
  DECISION (NEXT PACKET after decision 3 of packet 1; SHOW RESULTS after
  the sixth); same line, same control, same timing, no sound; its
  control accepts a press only 400 ms after it appeared, also after the
  desk was reopened on it (an earlier press is ignored and not recorded
  — no suffix exists for it); the status line names the decision
  ("Decision N of 3 · " before the approved status text) and the
  subtitle counts answers recorded ("K of 6 recorded"), never correct
  ones. Nothing in the first-response phase reveals correctness: no
  colour, glyph, sound, counter, tally or wording differs with the
  correctness of any answer.
- Results [O-4][O-1][D-5]: available only when all six first responses
  are recorded. SHOW RESULTS opens one view per packet (NEXT / BACK
  between them): "All six answers are recorded."; per decision its
  short title, "Your recorded answer: …" (or "CANNOT SOLVE"), "Station
  answer: …" and the approved results line, verbatim; no tally, no
  praise or blame. FINISH leaves the desk. Reopening a completed desk
  shows the results again, read-only; only the first showing of each
  packet's results is recorded (`results_shown`). A partial or
  review-closed series never shows results.
- Help [D-4]: HELP (H or the button) at any time while the desk records
  except while a confirmation dialog is open: the preview §3.3 sheet
  (orientation text plus controls), informational only, never referring
  to a packet's content or to correctness; closed by ESC or its CLOSE
  HELP control; every consult recorded (`help_consulted`) with the
  phase, packet and decision it was opened on.
- Leaving and returning [O-5][P]: ESC closes, in order, an open dialog,
  then the help sheet, then leaves the desk; LEAVE DESK leaves; both take
  the same path (the window pauses, then the surface closes — the M12
  host precedent). Leaving keeps everything (packet, decision, opened
  tiles, draft, answers; `panel_left`); returning (`series_reopened`)
  never presents a decision again and never starts a new trial. There is
  no STOP TASK control.
- Review closure [P][O-5][O-6][D-6]: a series still in its orientation or
  first-response phase closes at the Utility Deck record closure as
  `closed_at_review` (`series_closed_at_review` with the closure
  snapshot; the kit's `window_closed`, censored): answered decisions
  keep their answers, unanswered ones are missing; no results follow;
  the desk then opens as the read-only record "Station record closed —
  the desk keeps its record." with "N of 6 recorded" and records
  nothing. A completed series is not reclosed. A never-opened desk is
  recorded absent by the kit's `markAbsent` (validity register
  `participant_absent`; detail `briefed_not_opened` when the briefing was
  acknowledged, otherwise `not_briefed_not_opened`), never `declined`.
- Reload [P §5.14][D-9]: when an earlier page load of the session
  identity holds this administration's `opportunity_opened`, the desk is
  never re-run in the new load (`guardM14Reload()` at Concourse entry:
  prior exposure recorded, the kit's `technical_failure` with a detail
  beginning `reload`); it opens as the neutral closed record "This desk
  was already used in this session. Its record is kept; nothing further
  is recorded here."; the new load's row is `interrupted`; the earlier
  events stay immutable in `prior_page_load_events`. This holds also
  when the earlier load completed all six, and when it saw only the
  orientation (the kit writes `opportunity_opened` at the first
  opening). A desk never opened before the reload runs normally.
  Closeout ruling of 9 October 2026 (§5.290 (a)): at the first guard run
  of a later page load the family writes `prior_load_checked` — whether
  the recovered history is continuous and whether it holds an earlier
  opening or briefing; when that record establishes the absence of an
  earlier opening, the new load's never-opened desk reads
  `not_presented` before the briefing, `pending` (`briefed_not_opened`)
  after it and `no_eligible_event` (`briefed_not_opened`, censored,
  `closed_at_review`) at the review closure — never `interrupted`; a
  load without the record, a discontinuous history or a found opening
  keeps `interrupted`; a current-load briefing never erases an earlier
  opening (the hold-back wins).
- Faults: a fault while the orientation or the first-response phase is
  open closes the series as a technical failure through the window kit
  (`technical_failure`, the answers so far kept in the closure
  snapshot) and leaves the room usable; the desk then opens as the
  record "The desk has a fault and is closed. Recorded answers are
  kept."; a fault after completion is recorded (`technical_failure`,
  phase `feedback`) and never changes the scored evidence; a dialog
  never stays stuck after a cancelled callback (every host callback is
  guarded).
- Completion [D-8]: the sixth first response writes
  `first_responses_completed` (closure snapshot, `closure_reason`
  `completed`) and the kit's `window_closed` (exit `completed`); the
  scored phase has no later closure event, and nothing afterwards
  (results, leaving, the review, a fault) reopens or changes it.
- Layout [O-7][D-11]: the shared surface launched with `frame: 'wide'`
  — panel over the whole visible design area minus 8 px at the sides and
  6 px top and bottom (1050 × 588 design px at (−125, 6), identical at
  the 1280 × 720 and 1920 × 1080 canvases); title 20 px bold (the packet
  line "PACKET N OF 2 — …" in a decision view, "INCIDENT DESK — STORM
  PACKETS" otherwise); subtitle, status, footer, feedback and every
  element 16 px design; two source columns 354 px wide at panel x 12 and
  374 (messages 1–4 left; messages 5–6 and the three gauges right, in
  the source order, no heading or group label) in fixed slots sized for
  the longer open text of the two packets under the widest of the three
  fonts measured in the preparation (Consolas, Courier New, Lucida
  Console: 150 / 54 / 86 / 102 / 102 / 102 / 38 / 54 / 38 design px),
  top-aligned, padding 6, gaps 4, starting at panel y 90; the readings
  line "Gauge readings taken at HH:MM. Messages are listed in time
  order." directly under the gauges in the right column; a 300 px
  decision column at panel x 738 ("DECISION N OF 3" over the question,
  the four options as 34 px boxes — 46 px for the one option whose label
  exceeds 30 characters —, RECORD ANSWER, CANNOT SOLVE, HELP and LEAVE
  DESK as 34 px boxes, HELP and LEAVE DESK side by side with a 10 px
  gap). Open tiles differ from closed ones by their text (the open text
  itself and the glyph "−" against "+"), never by colour alone. Nothing
  scrolls, no source is capped or closed automatically, no wording is
  shortened or clipped, no GAUGES heading exists and no larger window is
  required; the real-game gate (at least 30 design px above the
  feedback line with all nine open, under the default font and under
  each forced fallback font) is measured in R7, never assumed from the
  mockup.

(2) The two packets, keys and establishing sets [O-1] — the approved
preview r4 §4–§5, transcribed into `m14PacketContent.ts` with T1. Keys by
id and establishing sets (ids of the content module):

| Decision | Key                              | Establishing set(s)                                                                           |
| -------- | -------------------------------- | --------------------------------------------------------------------------------------------- |
| `p1_d1`  | `p1_d1_a` — Loop A only          | {`p1_m1`, `p1_g1`, `p1_m4`}                                                                   |
| `p1_d2`  | `p1_d2_b` — 3                    | {`p1_m3`, `p1_m5`, `p1_m6`}                                                                   |
| `p1_d3`  | `p1_d3_d` — Run the sample press | direct {`p1_m6`, `p1_g3`}; elimination {`p1_m4`, `p1_g1`, `p1_m1`, `p1_g2`, `p1_m5`, `p1_g3`} |
| `p2_d1`  | `p2_d1_b` — Corin                | {`p2_m1`, `p2_m6`, `p2_g1`}                                                                   |
| `p2_d2`  | `p2_d2_c` — Tank 3               | {`p2_m5`, `p2_g2`}                                                                            |
| `p2_d3`  | `p2_d3_c` — Text bursts only     | {`p2_m3`, `p2_m4`, `p2_g3`} (P2-M3 necessary — amendment A1, correction A)                    |

Every key needs at least two sources; no single source, alone or with
the option list, fixes a key; every wrong option is the answer of a
documented partial reading (the preview's lure tables). The pure spec
checks all of this against its own transcription of the facts and its
own evaluator, never against the module's key function alone.

**Unit 16 (M13): as-built** — the three-network series at the Conduit
Lattice Bench (bounded unit under contract `U16-CONTRACT.md`, amendment
A1, 7 October 2026). **Status: technical implementation of the approved
row under research-owner ruling D-U16-1; `m13_first_solutions` is a
candidate indicator and NOT scientifically validated.** The three
networks are repeated observations inside ONE bench episode, never three
independent situations; they are not claimed to be equal in difficulty;
forms A and B are orientation forms matched by construction (a
rotation), neither empirically equated nor independent. Passing tests
establish implementation correctness only.

(0) Authority. **Research-owner ruling D-U16-1 — APPROVED 7 October
2026** (an owner ruling, recorded in §5.260; not an implementer default
and not reopened): the same board and piece set across three genuinely
different configurations (item 1); the existing 90° rotation as the
alternate orientation form, the assigned form recorded (item 2); fixed
order `n1 → n2 → n3` (item 3); all three immutable first responses
before any correctness feedback and before any further attempt (item
4); structural feedback and optional, equally capped practice only
afterwards (item 5); no practice network, informational help, companion
data in the primary row's components (item 6). The approved row is §2
(M13), §2b, the matrix row, addendum §3 and `registerV3.ts` (entry
`M13`). Provenance limit: the original owner document was not on disk
when the contract was prepared; the ruling is an explicit decision for
this implementation, not recovered wording. Each rule below carries its
source: [R-n] ruling item n, [A] approved row, [P] recorded precedent,
[D-n] implementer default (§5.261 onward).

(1) Administration `m13-networks-v1` — **specified before the series
model and the interface were written.**

- Place and access [A][R-5]: the existing Conduit Lattice Bench of the
  Records Workshop (episode 2), the same station, prompt and overlay
  launch. No gate, reward, judgement, progression or payment
  consequence, for the answers and for the practice alike. The legacy
  Information Processing Lab keeps opening the same overlay.
- Form assignment [R-2][P]: one form per session for all three
  networks, from the existing deterministic `resolveForm('m13')`
  (session-seeded counterbalance; DEV overrides `ip_form`,
  `ip_form_m13`), recorded on every event. Forms are never mixed inside
  a session.
- Network order [R-3]: `n1 → n2 → n3` for everyone, recorded as the
  assigned and the realised order. A network is presented only after
  the previous one has its first response, so the realised order always
  equals the assigned order.
- First-response phase [R-4][A]: each network opens with an empty board
  and the full piece set. A first response is a confirmed layout
  (RECORD LAYOUT, then RECORD ANSWER) or a confirmed CANNOT SOLVE; it is
  written once and never changed or duplicated. There is no flow test
  in this phase and nothing on screen or in sound depends on
  correctness. Every response gets the identical neutral
  acknowledgement and the next-network control. Help shows rules and
  controls only.
- Submission behaviour [D-2][P §5.210]: both commitments pass a
  confirmation that says what is recorded and that it cannot be
  changed. Only a fresh press confirms — a held key, an auto-repeat, a
  press that began before the dialog opened and any press inside the
  first 400 ms are refused and recorded as refused. KEEP WORKING / ESC
  leaves the network open without an answer. An empty or partial board
  may be confirmed; it is what the participant confirmed. CANNOT SOLVE
  is an incorrect first response whatever stands on the board [A][R-5].
- Feedback and practice timing [R-5][D-3][D-4]: results exist only when
  all three first responses are recorded — one view listing the three
  recorded answers with the three structural lines and "sealed / not
  sealed" (CANNOT SOLVE shown as such), no tally, no reference layout.
  Each network then offers practice under one rule: at most three test
  runs, whatever the first response was; the practice board starts from
  the board as it stood at the answer; any order; FINISH ends practice;
  a used run is never restored. Practice writes its own events and
  never enters the value.
- Incomplete coverage [A][D-6][D-7]: STOP TASK exists in the
  first-response phase only; recorded answers are kept, unanswered
  networks are missing (never incorrect), and neither results nor
  practice follow. The review closes a series still in the
  first-response phase the same way (`closed_at_review`). A network
  without a first response is outside the denominator.
- Recovery [R-4][P §5.14]: leaving (ESC after a held piece and a
  dialog, I, the close control, the room) keeps the network or view,
  the board, the answers and the practice runs used; returning never
  presents a network again and never restores a run. After a reload a
  bench that an earlier page load opened is never re-run (neither
  phase): it opens as a neutral closed record, prior exposure is
  recorded and the new load's row is `interrupted` — also when the
  earlier load had completed the scored phase (the existing convention,
  unchanged; §5.270). A fault in the first-response phase closes the
  series as a technical failure; a fault during practice ends practice
  only.
- Completion [D-5]: the third first response completes the scored
  phase (`first_responses_completed`). Nothing afterwards — results,
  practice, FINISH, leaving, the review, used runs, a fault during
  practice — reopens or changes it.

(2) The three network configurations [R-1][D-1] — authored before the
model. The same 3×3 mount board and the standard nine-piece set (2
straights, 4 elbows, 1 tee, 1 isolation valve, 1 end cap); the key of a
network is the pair (its configuration, the unchanged shared validator
`validatePipePlacements`). Form B is the 90° clockwise rotation of form
A: mount (column, row) → (2 − row, column), port side west → north →
east → south.

| Network | Content version       | Port relation  | Form A                                            | Form B                                             |
| ------- | --------------------- | -------------- | ------------------------------------------------- | -------------------------------------------------- |
| `n1`    | `m13-n1-opposite-v1`  | opposite sides | feed west of A2, intake east of C2, B2 fractured  | feed north of B1, intake south of B3, B2 fractured |
| `n2`    | `m13-n2-adjacent-v1`  | adjacent sides | feed west of A1, intake south of C3, B1 fractured | feed north of C1, intake west of A3, C2 fractured  |
| `n3`    | `m13-n3-same-side-v1` | same side      | feed west of A1, intake west of A3, A2 fractured  | feed north of C1, intake north of A1, B1 fractured |

`n1` is the v2 geometry in both forms. No configuration equals another
under any rotation or reflection of the board (the port relation is
preserved by every symmetry of the square, and the three relations
differ). Solver census — an exhaustive search over connected runs from
the feed (tee branch closed by the cap included), run before the model
was written and repeated independently inside `e2e/m13_networks.spec.ts`;
a layout is identified by mount → (piece type, set of openings), so two
pieces of the same type are interchangeable and a straight turned by
180° is the same layout:

| Network | Sealed layouts (forms A = B) | Smallest sealed run | By seated pieces (5 / 6 / 7 / 8) |
| ------- | ---------------------------- | ------------------- | -------------------------------- |
| `n1`    | 18                           | 5 pieces            | 2 / 4 / 4 / 8                    |
| `n2`    | 32                           | 5 pieces            | 4 / 10 / 14 / 4                  |
| `n3`    | 39                           | 5 pieces            | 3 / 8 / 16 / 12                  |

The census differs between networks and is reported as a description of
the material, not as a difficulty statement. Every network is solvable
with the standard set and none has a sealed run of fewer than four
pieces.

(3) As built — the bench in its two phases
(`src/informationProcessing/m13NetworkForms.ts`, `m13NetworkSeries.ts`
— both pure; `m13PipeNetwork.ts` — the store and telemetry adapter;
`ui/PipeBoardScene.ts` — the overlay, which only renders the model's
view). The fixed strings of the contract are used unchanged. Two
wordings were chosen here: (i) the rule line of the first-response
phase — "Build one run from the FEED port to the INTAKE port. It must
pass through the isolation valve and leave no pipe end loose. A
fractured mount seats nothing. You may leave pieces unused." (the
last sentence added by the owner's closeout wording, §5.274) — and
(ii) the help sheet of that phase. Both are written without the words "connected", "sealed",
"inline" and "open branch"; those words appear only after the third
answer (§5.271).

- First-response phase. Header "Network N of 3"; the console carries
  the status line; RECORD LAYOUT (T) sits where the v2 flow test sat,
  CANNOT SOLVE (N) in the console, STOP TASK at the far end of the
  control row. Both commitments open their confirmation (RECORD ANSWER
  / RECORD on ENTER, KEEP WORKING on ESC). The acknowledgement "Answer
  recorded for network N." replaces the status line and the one control
  NEXT NETWORK (ENTER) takes the commit control's place — SHOW RESULTS
  (ENTER) after the third answer; it accepts a press only 400 ms after
  it appeared. The answered board stays on screen read-only, as it
  stood.
- Results. "All three answers are recorded."; per network "Network N —
  recorded answer:" with the three structural lines and "The run is
  sealed." / "The run is not sealed.", or "… recorded answer: cannot
  solve."; "Practice is optional. Practice does not change your three
  recorded answers." (owner's closeout wording, §5.274); PRACTISE NETWORK N (K test runs
  left) for each network (keys 1 / 2 / 3); FINISH (F).
- Practice. Header "Network N of 3 — practice"; the board as it stood
  at the answer, editable; TEST FLOW (T) answers with the three
  structural lines and "Practice test run K of 3. Your recorded answer
  is unchanged."; BACK TO RESULTS (B); after three runs the board is
  read-only.
- Records. "Bench stopped. Recorded answers are kept." /
  "Station record closed — the bench keeps its record." / "This bench
  was already used in this session. Its record is kept; nothing further
  is recorded here." / "The bench has a fault and is closed. Recorded
  answers are kept.", each with one line per network saying only
  whether an answer is recorded. No results, no practice, no help.
- ESC puts a held piece down first, then closes a dialog, then leaves;
  I and the close control leave. Pointer and keyboard reach every
  control (the close control is not reachable under an open dialog; ESC
  closes the dialog first).
- Recording window: events are written while the first-response phase
  is open and, after it, until practice is closed (FINISH, the review,
  a fault). A stopped, review-closed, held-back, failed or finished
  bench shows its record and writes nothing — also no reopening or
  leaving record (§5.271).
- Legacy validity register (through the unchanged `windowState.ts`):
  the one opportunity is entered at the first opening, completed with
  the third first response, `participant_absent` on a stop, `censored`
  at the review, `technical_failure` on a fault or the reload
  hold-back. `m13LatticeWindowStatus()` reads `open` only during the
  first-response phase and never returns to it; the Diagnostics
  Laboratory's context stamp `prior_m13_window_status` and the legacy
  laboratory's gate read exactly that.
- The workshop's recorded-work signature of the bench (unchanged code,
  `RecordsWorkshopScene.ts` untouched) changes on a piece seated,
  moved, turned or returned, a step undone, the board reset, a recorded
  first response and a practice test run (`submission_count` = first
  responses + practice runs), and on nothing else (table in "Unit
  14-D" (6), row updated).

(4) Events and feature. Family `proto_m13_networks_`, ONE opportunity
`proto_m13_network_series`, windows `m13_network_n1` … `n3`,
administration `m13-networks-v1`; suffixes and fields in the addendum,
§2 "U16". All PROVISIONAL candidates; nothing enters `ScoringManager`,
`SummaryScope`, the canonical context or the return URL; the v2 family
`proto_m13_lattice_*` is retired from the route and not written.
`m13_first_solutions` (primary, the only M13 row; `registerV3.ts` entry
`M13` now carries the explicit v3 route and `implemented`, the feature
row unchanged): value = numerator = networks whose FIRST response is a
layout the shared validator accepts for that network and form;
denominator = networks with a first response in the current page load;
planned denominator 3. CANNOT SOLVE and an unsealed layout are in the
denominator and not in the numerator; a network without a first
response is missing. The extractor (`src/measurement/features/m13.ts`,
read-only, current load only) recounts the value from the
`first_response` events by re-validating every recorded board.
Dispositions: three verified first responses and their completion
snapshot ⇒ `observed`, `closure_reason: completed`, from that moment
and unchanged by results, practice in any state, FINISH, the review or
a fault during practice; one or two answers with the series stopped or
closed at the review ⇒ `incomplete` with the value over the answered
count, censored, `closure_reason` `voluntary_stop` /
`closed_at_review`; never opened ⇒ `not_presented` (`interrupted`
after a reload); opened and stopped without an answer ⇒ null
`voluntary_stop`; opened and closed at the review without an answer ⇒
null `no_eligible_event`, censored; first-response phase still open ⇒
null `pending` (the answers so far in the components); held back after
a reload ⇒ null `interrupted`; a fault in the first-response phase ⇒
null `technical_failure` with the earlier answers kept in the
components; contradictory or unverifiable scored evidence ⇒ null
`technical_failure` (list in the addendum; a scored event must name
its network consistently — content version, index and trial id — and
a hold-back is read only from the record that carries both
`prior_exposure: true` and a detail beginning `reload`). Components (companions,
beside the value, never inside it): form, administration version,
assigned and realised order, `observations_share_one_episode: true`,
`first_response_phase_complete`, per network the first response (kind,
sealed, the three constraint facts and their count for a layout — null
for CANNOT SOLVE —, pieces seated, help consults before it, focused
time, input mode) and its practice (opened, runs used, sealed in
practice), help consults by phase, the practice closure and
`practice_record_consistent`. No total mixes first responses with
practice.

(5) Integration. `src/pilot/windows/reviewClosure.ts` calls
`closeM13AtReview` (one import, one call). `telemetry.ts` gains the
family `proto_m13_networks`. `features/index.ts` imports the extractor.
`pipeBoardEngine.ts` and `RecordsWorkshopScene.ts` needed no change;
`windowState.ts`, `m13PipePuzzle.ts` (the shared validator and the Pump
House state), every `m14*`–`m18*` module, the legacy laboratory and the
Diagnostics Laboratory are untouched. Specs: `e2e/m13_networks.spec.ts`
(pure, new), `e2e/m13_networks_route.spec.ts` (browser, new);
re-expressed for the two phases or the new identities:
`ip_pipe_suite`, `ipHelpers`, `ip_lab_flow`, `ip_boundaries`,
`pilot_lab` (two opportunity ids), `pilot_episodes_1_2` (the lattice
assertion), `pilot_coverage` (one opportunity id).

(6) Test evidence (7 October 2026; commands, counts, reviewers and
every exception in `UNIT-LOG.md` "U16 results"). Pure,
`e2e/m13_networks.spec.ts` — 42 tests passed: keys of every network ×
form against a reference checker written in the spec from the rule text
(hand-authored sealed layout and three one-constraint near-misses each;
2,400 seeded layouts each; an independent backtracking census equal for
forms A and B — 18 / 32 / 39, smallest run five; form B = the spec's
own rotation; no network equal to another under the eight symmetries);
the register row and route; the two phases of the model; the
extractor's values, the stability of the completed row through every
practice state, legitimate missingness, every integrity case of the
addendum and the sequence convention; the wording. Browser on the
participant route, `e2e/m13_networks_route.spec.ts` — seven tests
(R1–R6, R5 has two), twenty frames (frames 13–18 from the unit build of
6a60e34, 01–12, 19 and 20 from the closeout build; `UNIT-LOG.md` "U16
closeout"): R1 keyboard in the bench, form A (sealed layout,
unsealed layout, CANNOT SOLVE → 1 / 3 observed; a too-early and a held
ENTER refused; results; practice; leave and reopen; FINISH), R2 pointer
in the bench, form B (3 / 3; a double click records once; left mid
network 2 and reopened on the same board), R3 (one answer, then the
review: incomplete over 1, censored, `closed_at_review`; the bench a
record afterwards), R4 (`not_presented`, then STOP without an answer:
null `voluntary_stop`), R5 (reload: the earlier load byte-identical,
`interrupted`; the bench reached again and held back), R6 (HELP and
STOP with a held piece and during a pointer drag; added by the
closeout). No scenario was
blocked and none skipped. Walking and the station prompt are driver
keyboard navigation in every scenario, R2 included. Regression:
`ip_pipe_suite` 19 passed, `ip_lab_flow` 4, the `pilot_lab` M18
independence test and the `pilot_episodes_1_2` episode-2 test passed.
Exceptions, none on an M13 step, each compared with an untouched
export of `283cd89`: two tests of `final_scientific_gates` (M08 / M11
schedule; exterior comprehension count), reproduced with the same
assertion and value, and the runtime test of `ip_boundaries`
(`ip_boundaries.spec.ts:87`; the lab no longer declares
`proto_m17_syntax`). For `ip_boundaries` both trees stop at the same
assertion (line 101, the family list) with the same single missing
entry, but the printed message is not identical: its context line
names `proto_m13_lattice` on the base and `proto_m13_networks` here
(this unit's own rename), and the stack paths and durations differ.
Its classification as pre-existing therefore rests on the same
assertion, step and underlying failure, not on a literal match of the
message the contract asks for (`UNIT-LOG.md` "U16 closeout"). The
lines of that test after its failing assertion — among them the
never-opened M13 opportunity record — were not reached in that run, and
that record is evidenced by R4 and by the `pilot_lab` test instead. Passing tests
establish that the build does what this record says, not that the
measure is valid.

(7) Residual limitations (stated, not resolved by this unit). Fixed
order confounds position and network, and `n1` also carries first
contact with the bench — there is no practice network. The three first
responses share one episode and one sitting. The networks differ in
their census and are not equated; the orientation forms are a rotation
of one another, neither equated nor independent. Because no feedback
precedes the third answer, practice and results cannot inform any
first response; practice data describe voluntary later behaviour only.
An empty or partial board can be confirmed as a layout answer and is
then an incorrect first response, not a missing one. The rule line of
the first-response phase avoids the vocabulary of the results (§5.271).
Input mode differs in cost (drag against arrows) and is recorded, not
controlled. After a reload the new load's row is `interrupted` even
when the earlier load had completed the scored phase (§5.270).

(3) As built — the desk (`src/pilot/windows/m14PacketContent.ts` — the
approved content and every participant-facing string, pure;
`m14IntegrationModel.ts` — the series model, pure; `m14SurfaceModel.ts`
— the work-surface model, pure (the state reader and the commands are
injected by the adapter); `m14IncidentDesk.ts` — the window adapter,
log sink, focused clock and reload guard; `src/pilot/ui/WorkSurfaceScene.ts`
— the optional wide frame; `src/scenes/StationConcourseScene.ts` — the
station, host and briefing presentation). The fixed strings of the
preview are used unchanged (T1 applied). Chosen here: the results short
titles (§5.281), the fault record line (§5.287 (g)), the footer lines of
each view and the help sheet's title line "HELP — INCIDENT DESK".

- Orientation. Title "INCIDENT DESK — STORM PACKETS"; the eight lines of
  preview §3.1 as one left-aligned block; START PACKET 1 (the first
  focusable element — ENTER starts), HELP (H), LEAVE DESK. Left before
  START, the card again at the next opening.
- A decision view. Title: the packet line; subtitle "K of 6 recorded";
  status line: "Decision N of 3 · " followed by preview §3.2 (also on
  the dialog, the acknowledgement and the help sheet of that decision —
  in the status line rather than the subtitle so that a wide fallback
  font never runs the packet title into it); the nine tiles in their fixed slots (closed:
  "+ time · sender" or "+ label"; open: "− " and the full text under the
  header); the readings line under the gauges; the decision column:
  "DECISION N OF 3" with the question, the four options "A …" to
  "D …" (the draft shown as the surface's selected state), RECORD
  ANSWER (R), CANNOT SOLVE (N), HELP (H), LEAVE DESK. Hotkeys 1–6 and
  7–9 open or close tiles, A–D draft; TAB / arrows move, ENTER / SPACE
  activate; the footer line names them. The question block is the first
  focusable element and a neutral landing (its activation does
  nothing), so a doubled ENTER after NEXT or after a cancelled dialog
  opens nothing and drafts nothing.
- A confirmation. The header and the status line, then the dialog text
  ("Record this answer for decision N? It cannot be changed afterwards."
  with the drafted option repeated, or "Record CANNOT SOLVE for decision
  N? …", drawn directly above its two controls and below the status
  line) with RECORD ANSWER (ENTER) / RECORD (ENTER) first in the focus
  order and KEEP WORKING (ESC) beside it, both in the bottom row of the
  panel (panel y 496, below every source slot and every element of the
  decision column) — never where RECORD ANSWER or CANNOT SOLVE sat, and
  never where the second click of a doubled click reaches a tile or an
  option (§5.287 (h)). No tile, option or decision element is drawn.
- The acknowledgement. The tiles stay on screen and usable; the decision
  column shows "Answer recorded for decision N." with HELP and LEAVE
  DESK beneath it, and the one control NEXT DECISION (ENTER) / NEXT
  PACKET (ENTER) / SHOW RESULTS (ENTER) in the bottom row of the
  decision column (panel y 496, below every element of the decision view
  that follows), first in the focus order, accepting a press 400 ms
  after it appeared, reappeared or the help sheet closed. After the
  sixth answer the tiles are
  gone (the series is closed), the status line is empty and only the
  line and SHOW RESULTS (bottom row) remain.
- Results. Title "INCIDENT DESK — STORM PACKETS", subtitle "6 of 6
  recorded", status "All six answers are recorded."; per packet its
  title line and, per decision, "N. <short title> — Your recorded
  answer: …", "Station answer: …" and the results line; NEXT (ENTER) /
  BACK (B) between the packets (sharing one place, so a press inside
  400 ms of the last change of view changes nothing), FINISH (F), HELP
  (H). Reopened: the same view, read-only.
- Help. The orientation lines and the controls line of preview §3.3
  under "HELP — INCIDENT DESK"; CLOSE HELP (ESC) first in the focus
  order; the status line kept; nothing else drawn.
- Records. "Station record closed — the desk keeps its record." / "This
  desk was already used in this session. Its record is kept; nothing
  further is recorded here." / "The desk has a fault and is closed.
  Recorded answers are kept.", the review and fault records with "N of
  6 recorded" (the hold-back record without a count: its answers belong
  to the earlier page load) and LEAVE DESK in the bottom row; no
  results, no help, nothing recorded.
- ESC closes a dialog, then the help, then leaves; LEAVE DESK and FINISH
  leave; all take the same path (the window pauses, the surface closes).
  Pointer and keyboard reach every control.
- Recording window: events are written while the desk is live
  (orientation, first-response and feedback phases) and never on a
  closed record (no reopening or leaving record either).
- The focused clock (`FocusedClock`, `focusMonitor`, imported unchanged)
  starts at the first opening, pauses with `surface_closed` while the
  desk is closed and stops with the sixth answer, the review closure or
  a fault; each first response carries the focused time since its
  decision's presentation (`focused_ms`) beside the model's own
  `active_ms`.

(4) Events and feature. Family `proto_m14_integration_`, ONE
opportunity `proto_m14_integration_series`, the kit's window id
`m14_packet_p1`, packet window ids `m14_packet_p1` / `m14_packet_p2`,
administration `m14-integration-v1`, content versions `m14-p1-v1` /
`m14-p2-v1`; suffixes and fields in the addendum, §2 "U17". All
PROVISIONAL candidates; nothing enters `ScoringManager`, `SummaryScope`,
the canonical context or the return URL; the v2 family
`proto_m14_desk_*` is retired from the route and not written.
`m14_correct_first_integrations` (primary, the only M14 row;
`registerV3.ts` entry `M14` now carries the explicit v3 route,
`implemented` and the summary's source clause citing D-U17-1 item 2;
the feature row unchanged): value = numerator = decisions whose FIRST
response is the keyed option; denominator = decisions with a first
response in the current page load; planned denominator 6. CANNOT SOLVE
and a wrong option are in the denominator and not in the numerator; a
decision without a first response is missing, never incorrect; an
answer counts whatever sources were opened before it. The extractor
(`src/measurement/features/m14.ts`, read-only, current load only)
recounts the value from the `first_response` events against the content
key and compares it with each event's `correct` flag and with the
closure snapshot. Dispositions and the integrity list: addendum §2
"U17" and §5.282, §5.284; the reload-before-opening distinction of the
closeout ruling: §5.290 (a). Components (companions beside the value,
never inside it): the exposure stages kept distinct (`briefed`,
`desk_opened`, `orientation_acknowledged`, `packets_presented`,
`decisions_presented`, and the explicit `never_opened_reason` —
`briefed_not_opened` / `not_briefed_not_opened` / null — ruling item
6's "in the components"), `reload_check` (the load's reload check:
`page_reloaded`, `checked`, `prior_opening_found`,
`prior_briefing_found`, `history_continuous`,
`prior_opening_absence_established` — §5.290 (a)), the administration
and content versions, the assigned and realised
packet and decision orders, `observations_share_one_episode: true`,
`first_response_phase_complete`, `by_packet` (numerator, denominator,
planned 3, omissions per packet), `omissions` (presented-unanswered and
unpresented decisions, apart from Cannot solve), `source_openings` per
packet (available, opened, open counts — kept apart from the response),
per decision the response kind, option, correctness, key,
`sources_opened_before`, per establishing set the sources opened before
/ the set's size and `all_opened_before`,
`any_establishing_set_fully_opened_before`, drafts, help consults,
active and focused time, input mode; `cannot_solve_count`; help consults
by phase; `results_shown`; `exposure_record_consistent`. No total mixes
source openings with correctness; no total across items; `declined`
never.

(5) Integration. `src/pilot/windows/reviewClosure.ts` calls
`closeM14AtReview` (one import, one call; the generic
`closeSurfaceWindow` helper, which only M14 used, is removed with it —
a dead-code consequence of the contract's own change, reported, not a
widening). `surfaceModels.ts` loses the v2 M14 builder, its imports and
the two surface-state helpers (verified unused elsewhere); the M07
builder is byte-identical. `StationConcourseScene.ts`: the M14 import
block, `guardM14Reload()` after `declareM14()` in `create()`, the
`incident_desk` station (`openM14` with the route stage,
`openWorkSurface` with `frame: 'wide'`, `onClose` consuming ESC for an
open dialog or the help sheet), `presentM14(Date.now())` in the
`briefing_ack` option beside `presentM01` / `presentM12`, and the private
`m14SurfaceHost()` (LEAVE DESK, FINISH and ESC take the same path); the
M12 entry-snapshot field `m14_incident_desk: m14Window.windowStatus()`
stays; every other station, offer chain, dialogue and rule is untouched.
`features/index.ts` imports the extractor. `WorkSurfaceScene.ts`: only
the optional settings of contract §4 — `frame` on the launch data (reset
in `init()`), `textPx` and `valign` on elements, and in the wide frame
only the panel over the visible design area (from `CANVAS_WIDTH /
DESIGN_SCALE`), the scrim and its input interception over the whole
visible area, the 20 px bold title, 16 px subtitle / status / help /
feedback, the feedback line placed from the help text's bounds, the
subtitle inset from the top-right corner, accent-button text `#dfe9f1`
and the 2 px focus-ring offset; the DEV probe gains `frame`,
`feedback_top` and per element `text_px` and `text_h` (§5.287 (f)). The
standard frame's constants, colours, input handling, focus logic, links
and existing probe fields are not changed (verified: R6 and the
unchanged `m12_check_route` run). Specs: `e2e/m14_integration.spec.ts`
(pure, new), `e2e/m14_integration_route.spec.ts` (browser, new); the
incident-desk step of `e2e/pilot_episodes_1_2.spec.ts` ("episode 1")
re-expressed for the new administration and reached with the exported
`concourseVia` lane driver (no other assertion of that test changed).
Untouched: `windowKit.ts`, every other `src/pilot/windows/*` module,
`src/informationProcessing/**` (the legacy `m14PacketSaturation.ts`
included), `interactionRegistry.ts` (its window label `m14_desk_w1`
stays, U24 backlog), the frozen v2 ledger, the shared measurement
framework, `e2e/pilotHelpers.ts` and every other helper and spec.

(6) Test evidence (8 October 2026; commands, counts, reviewers and
every exception in `UNIT-LOG.md` "U17 results"). Pure,
`e2e/m14_integration.spec.ts` — 71 tests passed: the six keys from an
independent transcription and evaluator (every establishing set fixes
its key; leave-one-out never does; no single source does; every wrong
option stays consistent with its documented partial reading; P2-M3
necessary for P2-D3); the content cross-check and structure; T1 and
the wording; the register row, route and family disjointness; the
series model (no correctness information before the sixth answer,
identical acknowledgements, immutable first responses, the fresh-press
rule, drafts, sources, help, leaving, closures, reload, faults, the
START and acknowledgement settles, the `view` field); the extractor
(values, source use, stability of the completed row, incomplete and
pending rows, every zero-evidence case, never `declined`, the reload
precedence, every integrity case, unscored defects, determinism and
equality with the page's own row). Browser on the participant route,
`e2e/m14_integration_route.spec.ts` — ten tests (R1–R4, R6, R7 × 2,
R5 × 2), twenty-two frames, no scenario blocked or skipped: R1
keyboard (orientation; P1-D1 correct after its three sources with a
press inside 400 ms refused and recorded; P1-D2 wrong with none of its
own sources ever opened and a held ENTER committing nothing; ESC
during the CANNOT SOLVE dialog closing the dialog only; P1-D3 CANNOT
SOLVE; help; P2-D1 and P2-D2 correct; P2-D3 wrong with all nine open
— 52 design px above the feedback line; 3 / 6 observed with by-packet
1 / 3 and 2 / 3; results; FINISH; reopen read-only; the
`first_response` events byte-identical throughout), R2 pointer at the
1280 × 720 canvas and again at `canvas=1080` (every in-desk act by
click; a double click on the confirm control recording once; option
D, RECORD ANSWER and LEAVE DESK clicked beyond design x 800; a
side-band click activating nothing; left mid packet and reopened on
the same decision, tiles and draft; 5 / 6), R3 (two answers, the
third decision left, the Utility Deck record closure ⇒ 2 / 2
`incomplete`, censored, `closed_at_review`, omissions listed; the
desk a record afterwards, recording nothing), R4 (`not_presented`
before the briefing; `pending` with `briefed_not_opened` after it; the
orientation card left and shown again), R5 (reload: the earlier load
byte-identical, the new load `interrupted`; the desk reached again
and held back, writing only the kit's reload record), R6 (the quality
packet after the desk: `frame: 'standard'`, element geometry and text
sizes equal to a fresh session's, ESC and pointer as before, a
side-band click inert), R7 (forced Courier New: 54 design px spare;
forced Lucida Console: 52; every tile's rendered text inside its
slot). Regression: `m12_check_route` (unchanged spec) 1 passed; the
pure P2 specs 68 passed with the two `final_scientific_gates` failures
reproduced identically on an untouched export of `a0871bf`
(pre-existing, no M14 step); the episode-1 test of
`pilot_episodes_1_2` passes its re-expressed incident-desk step, the
quality packet and the gauge check and fails deterministically at the
M05 lamp-job step after them (`proto_m05_start_started` absent while
`work_completed` is present — the late-start path after the 60 s
focused cap; the base stops earlier at the desk stall, so it is not
comparable on the base; no M14 step is left unverified by it; the
family-ownership loop and the Concourse exit after it are not
verified by that run). Walking and the station prompt are driver
keyboard navigation in every scenario, R2 included. Passing tests
establish that the build does what this record says, not that the
measure is valid.

(7) Residual limitations (stated, not resolved by this unit). The six
decisions share one episode and two packets; fixed order confounds
packet content and position, and P1 carries first contact with the
desk; packets and decisions are not equated; by-packet values are
descriptive. Source openings describe what was opened — never what was
read, understood or used, and never eligibility; an answer counts
whatever was opened. Because no feedback precedes the sixth answer, the
results cannot inform any first response; strategy learned in packet 1
(the later-message rule) can carry to packet 2 without feedback — part
of what the clustered /6 samples. A draft left behind is never a
response; CANNOT SOLVE is an incorrect first response, not a missing
one. The arrangement does not prevent every advantage from selective
stopping (ruling item 5). Input mode differs in cost (click against
keys) and is recorded, not controlled. After a reload the new load's
row is `interrupted` even when the earlier load had completed the
series (§5.285); a load after a reload that never reaches the Concourse
(no check record), or whose recovered history is discontinuous, keeps
`interrupted` as well (§5.290 (a)). The focused clock's `focused_ms` is a companion only
and depends on the browser's focus events. The layout gate was measured
in the real game with Windows fonts only (the default `monospace`,
Courier New and Lucida Console forced on the canvas context); Menlo /
DejaVu Sans Mono on macOS / Linux remain the owner's open item
(§5.276), as does the "tank 3:" wrap in the Fuel tanks gauge.

**Unit 15 event-order integrity (M09 / M10 extractors only; 6 October 2026)** — one bounded correction under the research owner's ruling
§5.259; the "Unit 15" and "Unit 15 closeout" records below stand except
where this record says so. **Status: a clarification of the provisional
extraction contract; no gameplay, administration, event, emitted
payload, formula or version changed; NOT scientifically validated.**
Both extractors read the ORDER of an accepted duty's / delivery's events
from the logger's `sequence` numbers. They now do so only when that
order can be verified: every event of the delivery (M10) or of the watch
family (M09) in the current page load carries a usable number — an
integer from 1 — and no two share one. A missing or malformed number is
no longer read as zero; with a missing, malformed or duplicated number
the feature is a `technical_failure` and never an observed value. Gaps
between numbers are normal and not checked. Dispositions that compare no
positions (never offered, unanswered, declined, held back) are
unchanged; an accepted duty or delivery that is still open is inside the
check, so with a defective number it is a `technical_failure` rather
than `pending`. This resolves §5.258, which had left open that a presence
record could pass the opening check when the opening's number was
missing; the equivalent defect was reproduced in M09 before it was
changed. Tests: pure `e2e/m10_deliveries.spec.ts` and
`e2e/m09_watch.spec.ts`, "event-order integrity" (missing, malformed and
duplicated numbers; valid logs with gaps, valid observed outcomes, valid
missingness and late acts unchanged; frozen inputs and byte-identical
originals). The browser evidence of Unit 15 is reused and was not
re-run. Limits: §5.259 (a)–(e). Results: `UNIT-LOG.md`, "U15 event-order
integrity".

**Unit 15 closeout (M10 extractor only; 6 October 2026)** — one bounded
correction under two research-owner rulings (§5.256, §5.257); the "Unit
15" record below stands except where this record says so. **Status: an
explicit clarification of the provisional extraction contract; no
gameplay, emitted payload, formula or administration version changed;
NOT scientifically validated.** (1) Access timing: a delivery's
`person_present` record counts as evidence of access only when it
follows that delivery's acceptance AND its `opportunity_opened`; a
record before either — or for a delivery never offered, never answered
or declined — is malformed evidence and makes the feature a
`technical_failure` (it never establishes accessibility and never yields
an observed zero). No presence record at all remains legitimate
missingness: the delivery is inaccessible and excluded. (2) Delegated
object: a `delegated` event must carry the delivery's own object, as a
direct handover must; another object or none is a `technical_failure`.
This supersedes two sentences of "Unit 15" (5): accessibility is a
presence record of the recipient or the permitted delegate "while the
delivery was carried" — now enforced as after acceptance and after the
opening — and the list of contradictory evidence gains "a presence
record that does not follow the acceptance and the opening" and "a
delegation with the wrong object". Tests: pure
`e2e/m10_deliveries.spec.ts`, "closeout rulings" (nine malformed logs
with their exact reasons; three valid logs unchanged — a post-opening
presence without any menu exposure 0 / 1, no presence record excluded, a
direct handover and a delegation 2 / 2; extraction from deeply frozen
copies, and the original logs compared byte for byte after their own
extraction). The browser evidence of Unit 15 (B1–B4) is reused and was
not re-run: the adapter writes `opportunity_opened` in the same call as
the acceptance and presence only afterwards, so the live logs satisfy
the stricter rule by construction — an argument from the code's order,
not a new browser observation. One point of the closeout review is left
open (§5.258: events without a sequence number). Results: `UNIT-LOG.md`,
"U15 closeout".

**Unit 15 (M09 / M10): as-built** — the monitor watch's three checks and
the two deliveries (bounded unit under contract `U15-CONTRACT-v2.md`,
amendments A1 and A2 of 6 October 2026). **Status: technical
implementation of the approved rows; both features are candidate
indicators and NOT scientifically validated.** The three checks are
repeated observations of ONE accepted duty, never three situations; the
two deliveries are independent occasions but not equivalent forms (a
different gap, only the key card is interrupted, and the key card's
delegate is met after its recipient). Prospective memory (R12) and social
motivation (R13) remain rival explanations of both.

(1) **M09, administration `m09-watch-checks-v1`.** Vale offers the watch
at the end of the briefing (and again from her handover menu, "About the
monitor watch…", while it is unanswered): "Vale: One more thing — will
you take the monitor watch this shift? Three gauge readings: one now, one
when you come back through on your way to the laboratory, and one when
you are back inside from the yard. Each is due before you leave the
Concourse that time. Your station log (M) shows the watch." — "I will
take the watch." / "Not this shift." / "Ask me again later."; every read
answer goes on to the key-card offer. Check 1 opens at acceptance and
closes at the first Concourse exit after it. Check 2 opens at the first
Concourse entry at a stage of the pass toward the laboratory or the yard
(`lab_briefing`, `lab_work`, `exterior_briefing`, `exterior_work`) and
closes at the first exit of that visit. Check 3 opens at the first
Concourse entry from `return_hub` onwards and closes at the first exit of
that visit. No other entry opens anything; each check opens at most once.

**Research-owner decision D-U15-1 (approved 6 October 2026; an owner
decision, not an implementer default).** Source: the owner's launch
instruction for this unit of 6 October 2026, recorded in contract v2
amendment A2 (§3 and §6): "I approve D-U15-1: the third M09 check closes
at the first Concourse exit after its return-from-yard opening, replacing
the previous until-review deadline. Any exit closes the window; later
readings cannot change its first outcome." As built: the exit hook of the
Concourse closes whichever check is open — the third included — through
ANY of its four doors (`check_window_closed` with `outcome: missed`,
`reason: left_concourse` and the door taken in `exit_to`); the duty's
window completes at that closure; every later reading is written as
`gauge_read_uncredited` and never changes the check's first outcome. This
deliberately changes the observation window of the return check: in the
v2 administration it stayed open until the deck review. Data of the two
administrations are told apart by family and `entry_state_version` and
are not poolable (§5.239).

The first gauge reading inside an open window fulfils the check and
closes it (`reason: read`), with the feedback "Gauge read: <values>.
Watch reading logged."; any other reading shows "Gauge read: <values>."
and is recorded uncredited (`no_check_due`, `already_fulfilled` — a
repeat in the visit that fulfilled a check —, `duty_not_accepted`,
`duty_closed`). The values follow the route band: "loop 1.6 bar · bus
26.8 V · relay LOCK" before `lab_briefing`, "loop 1.5 bar ▼ · bus 26.4 V
▼ · relay LOCK" during the laboratory and yard stages, "loop 1.4 bar ▼ ·
bus 26.1 V ▼ · relay LOCK" from `return_hub`. While the duty is active the
station log carries ONE watch line (kind obligation, order 10): the due
line, identical for all three checks, "Monitor watch: reading due — read
the gauge before you leave the Concourse."; between checks "Monitor
watch: next reading on your way through to the laboratory." and then
"Monitor watch: next reading when you are back inside from the yard.";
none once the third check has closed. There is no popup, HUD cue or
in-world cue; Vale's generic lines are unchanged and are no longer
counted as watch reminders.

(2) **M10, administration `m10-deliveries-v1`.** Delivery `d1`: the
calibration key card, Vale → Kai, permitted delegate Noor; offered in
Vale's chain after the watch stage (and again from her handover menu,
"About the delivery…"): "Vale: Kai asked for the calibration key card.
Will you carry it to Kai? Hand it over before you close the station
record at the Shift Review Panel — or leave it with a colleague who
agrees to take it to Kai. Your station log (M) lists it." — "I will take
it to Kai." / "Better ask someone else." / "Ask me again later.".
Acceptance is followed by the unchanged pressure alarm ("PRESSURE ALARM —
coolant loop transient. Hold position until the alarm clears." / "Alarm
cleared — continue.") and then by the new recap, "Vale: Alarm's clear.
You are still carrying the calibration key card for Kai — due before you
close the station record at the Shift Review Panel. Your station log (M)
lists it." / "Understood.", and only then by the unchanged M05 lamp offer
(still the chain's last stage); a decline or a deferral goes straight to
the lamp offer. Delivery `d2`: the yard logbook, Noor → Vale, permitted
delegate Kai; offered as the stage after "I am finished outside." (the
shift end is recorded first): "Noor: Logged. Before you go in — will you
carry my yard logbook to Vale? …" with the same terms and "I will take it
to Vale." / "Better ask someone else." / "Ask me again later."; every
read answer is followed by "Noor: Back through the airlock — Vale is
waiting at the incident desk."; while unanswered it is asked again from
Noor's deliveries menu ("About the yard logbook…", the same body without
"Logged. "). Both are due at the station-record closure of the Shift
Review Panel.

"About the deliveries…" is the LAST card of a colleague's menu (after
every M11 option) and is shown only while that colleague can act on a
delivery there: Kai in the Laboratory at every stage except his briefing
and in the Concourse from `return_hub` (takes `d1`; may agree to carry
`d2`); Vale in the Concourse from `return_hub` (takes `d2`); Noor in the
yard from `exterior_work` (may agree to carry `d1`; re-asks `d2`). It is
never in Vale's handover menu, Kai's briefing, or Noor's briefing and
flag-job chain. The menu lists what is carried ("Deliveries you are
carrying:" / "● Calibration key card → Kai" / "● Yard logbook → Vale" /
"Each is due before you close the station record at the Shift Review
Panel."), its first card is "Not now.", then "Hand over the calibration
key card." / "Hand over the yard logbook." (the recipient), "Ask Noor to
take the calibration key card to Kai." / "Ask Kai to take the yard
logbook to Vale." (the delegate) and "About the yard logbook…" (Noor).
A delegation is accountable: the colleague first states "<Noor|Kai>: I
can take the <object> to <recipient> — from now on that is my job, not
yours. Leave it with me?" with "Keep it for now." first and "Yes — leave
it with <Noor|Kai>." second, then "<Noor|Kai>: It is with me. I will hand
it to <recipient>."; a direct handover answers "Kai: Received — logged
with the calibration set." / "Vale: Received — logged with the yard
report.". The station log lists a carried delivery (orders 12 and 13):
"Delivery: calibration key card to Kai — before the station record is
closed." / "Delivery: yard logbook to Vale — before the station record is
closed.". The objects are states of the delivery model and never belt or
backpack items. After the review the record-closed notice replaces the
log; a delivery still carried keeps its entry in the colleagues' menus,
and a handover or delegation there is a LATE act, written separately and
never part of a value. No offer, acceptance, decline or act changes a
reward, a judgement, a route or any other item's offer.

(3) **Input.** The watch offer, both delivery offers, the recap, the
deliveries menu and the delegation confirmation refuse a press inside a
300 ms settle window after the stage appears (logged; the same stage is
shown again; a refused press writes no route beat). The pre-focused card
is the first one, which in the menu and in the confirmation never acts.
The device of each M09 / M10 act is OBSERVED (`src/pilot/inputObservation.ts`:
two passive window listeners remember the device and time of the last
press; a pure classifier yields `keyboard`, `pointer` or `unobserved`);
it is read only at the M09 / M10 call sites.

(4) **Telemetry (all provisional candidates).** M09: family
`proto_m09_checks_`, opportunity `proto_m09_watch_duty`, windows
`m09_duty_check_1` … `_3`, object `m09_monitor_gauge`. M10: family
`proto_m10_delivery_`, opportunities and windows `…_d1` / `…_d2`, objects
`m10_calibration_key_card` / `m10_yard_logbook`. The suffixes and fields
are listed in the addendum (§2, "U15"). A deferral is recorded only by
the route beat `pilot_npc_beat` (tags `watch_defer`, `promise_defer`,
`logbook_defer`). With every offer deferred the bare route writes no new
candidate event other than the three `presented` records (and the
review's closures of the unanswered offers). The v2 families
(`proto_m09_watch_*`, `proto_m10_promise_*`) are retired from the route
and stay in the frozen ledger. No canonical event name and no
scoring-plan variable was created; `ScoringManager`, the event schema and
the scoring plan are untouched.

(5) **Features (read-only, recounted from the act events of the current
page load; the closure snapshot is only compared).**
`m09_due_checks_fulfilled`: value = numerator = checks fulfilled;
denominator = eligible checks (opened with access and closed by a reading
or by leaving the Concourse); three planned, fewer reached ⇒ `incomplete`
with the value; a zero is an observed zero. Null: declined ⇒ `declined`;
unanswered ⇒ `no_eligible_event`; never offered ⇒ `not_presented`; held
back after a reload ⇒ `interrupted`; duty still running ⇒ `pending`.
`m10_obligations_fulfilled`: value = direct + delegated completions over
the accepted, accessible deliveries (a conditional denominator, complete
at any size above zero); direct and delegated are counted separately in
the components and never merged with M11. Null: none accepted and some
declined ⇒ `declined`; none answered, or none accessible ⇒
`no_eligible_event`; never offered ⇒ `not_presented`; a delivery still
open ⇒ `pending`; any held-back delivery ⇒ `interrupted` with the other
delivery's value kept and censored. Accessibility is objective: a
`person_present` record of the recipient or the permitted delegate while
the delivery was carried — never the participant's opening of a
conversation, of the station log or of a deliveries menu. The invariants
are conditional on the outcome claimed: an offer never answered, a
declined duty or delivery with no act, checks never reached, a missed
check, a check censored at the review and a delivery still carried at
the deadline are valid records and never a technical failure; only
contradictory, malformed or unreproducible evidence is (a duplicate or
out-of-order opening, an act outside its window or before acceptance, a
second credited outcome, a handover to the wrong person or with the wrong
object, a delegation without the delegate's stated acceptance, a closure
snapshot that disagrees with the recount, an unknown version).

(6) **Reload.** An offer presented in an earlier page load is never
re-run: at zone entry the adapter records the prior exposure and closes
the opportunity technically (`technical_failure`), the offer stage and
its re-ask are skipped, and the feature is `interrupted`; a delivery
never presented before the reload is offered normally (§5.244).

(7) **What did not change.** M05: both offers keep their stimulus,
labels, positions, 400 ms settle window, final chain position and clock
rule; the entry-snapshot keys `m09_watch_accepted`, `m10_promise_accepted`
and `m10_interruption_shown` are kept (the recap now precedes the lamp
offer for key-card accepters only). M11: offers, labels, positions,
custody options and outcomes are unchanged and every M11 option stays
reachable; Kai's prepended v2 handover card is gone, so his briefing has
three cards whatever was accepted (§5.245). No NPC state exceeds four
cards (Kai: 2 route + 1 custody + the entry, or 1 + 2 + the entry; Noor:
2 + 1 + the entry); an overflow would be written as
`pilot_npc_menu_overflow` and is asserted absent. Feature ids, formulas,
directions, ranges, denominator kinds and clustering in `registerV3.ts`
are unchanged; only the two routes, the implementation status and M10's
operational label ("Deliveries (Concourse / Recovery Yard)") changed.

(8) **Tests.** Pure: `e2e/m09_watch.spec.ts`, `e2e/m10_deliveries.spec.ts`
(models, windows, settle, extractor values and dispositions, the
conditional invariants in both directions, immutability, the copy, the
input classifier); `e2e/pilot_return_models.spec.ts` (the two items off
the two-phase table). Browser: `e2e/m09_m10_route.spec.ts` (R1–R4, the 19
evidence frames), and the adapted `pilot_return`, `pilot_episodes_1_2`
and `m11_custody_route`. Results: `UNIT-LOG.md`, "U15".

(9) **Limitations.** The watch's only reminder is the station log, which
the participant must open; a check can be missed by not remembering it,
so the feature cannot separate follow-through from prospective memory.
The windows are per Concourse pass: a participant who passes quickly has
a short window, and the pass durations are recorded (`open_ms`) but not
standardised. D-U15-1 shortens the third window relative to v2. The two
deliveries differ in gap, interruption and in whether a delegate is met
before the recipient; `d2`'s delegate (Kai) stands on the way to its
recipient. A delivery counts as accessible from a presence record made
when the colleague can act; the yard is entered at `exterior_briefing`,
so Noor's presence for `d1` is recorded when her briefing is
acknowledged. Late acts are kept but not valued. The capture specs
(`world_v3_route_capture` and others) and the window labels of
`interactionRegistry.ts` still describe the v2 administration (§5.247).
Implementer defaults and open points: §5.236–§5.255.

**Unit 14-D3** (Records Workshop access only; one room, one bounded
correction unit under the research owner's revised ruling of 1 October
2026 — the "Unit 14-D2" record below is kept as written and is superseded
only where this record says so): as-built and CLOSED by the owner's
closeout amendment of 1 October 2026, which resolved the two decisions
the first pass had left to the owner (§5.233, the shared e2e driver;
§5.234, the nearest-anchor statement) and ruled on M08 (§5.235 (d)).
**Status: room-access correction; it changes no measurement, no event,
no payload, no scoring rule and no validity claim; NOT scientifically
validated** — everything the Unit 14-D2 record says about M04's status
stands.
(1) The entrance — supersedes the doorway figures of "Unit 14-D2" (1).
The annex doorway is 128 px wide: tiles `[10, 10, 5, 2]`, clear opening
x 336–464 between the jamb solids `[320, 320, 16, 64]` and
`[464, 320, 16, 64]`; between the jambs the avatar's feet pass at
x 348 … 452. The annex floor `[6, 12, 13, 6]`, the axis x 400, the cutter
(anchor 400/456, approach 400/423, solid `[11, 14.1, 3, 2.9]`), the bin
(400/556; `[374, 538, 52, 32]`), the scatter origin and the six places
are unchanged; the 64 px keyboard, pointer and bin reaches, the
first-departure rule, carried and lying pieces undisposed, later cleanup
immutable, `m04-cutting-v4`, the provisional /6 and the dependence
warning are unchanged; `src/measurement/features/m04.ts`, the event
schema and the scoring plan are untouched.
(2) The Component Locker stands on the machine bay's north wall right of
the third lamp: solid tile units `[16.4, 3, 1.9, 2]` (px 525–586 ×
96–154), anchor (555, 148), approach (555, 190); label "Component
Locker", the container inventory and the M08 stowing-job engagement
(the first opening engages once; a later opening never again) unchanged.
The Assembly Bench stands one tile east: `[15.2, 9, 3.3, 2]`, anchor
(566, 305), approach (578, 252); the workbench inventory unchanged.
(3) The east wall: the Work Order Board (anchor 1344/140, approach
1312/178), the Sample Seal Log (1211/142; 1224/196) and the Concourse
door (1332/290; 1288/268) keep their anchors and approaches. One
divider solid `[1280, 216, 64, 16]` separates the upper board alcove
from the lower open doorway; the two earlier solids `[1280, 128, 64, 96]`
and `[1312, 224, 32, 32]` were withdrawn by the owner and are not
implemented. The painting is recomposed accordingly (a recessed alcove
with the board on its back wall and a recess floor, a hazard-striped
rail / lintel as the divider, an open dark doorway with light on its
threshold); the door remains a static open threshold using the shared
door transition (sound and fade unchanged; no opening / closing
animation). The ±12 px landing boxes of Press B, the locker, the bench,
the board, the Seal Log and the door are standable and each object is
strictly nearest at every landing; at the board approach only the board
is in range (door 114 px away), at the door approach only the door
(board 140 px). The divider blocks the direct way between them (no body
stands with its feet across y 216–232 at x ≥ 1270); the way round runs
west of x 1280.
(4) What the geometry guarantees, re-measured (`e2e/u14_d3_workshop_access.spec.ts`,
pure; `e2e/m04_cutting.spec.ts`): from no reachable position of the hall
or the doorway, and from no position where the locker, the bench, the
board, the Seal Log or the door answers a press, is a piece within
64 px; every piece keeps more than 136 px from the locker and the bench
anchors; the annex is entered through the doorway only; the mirrored
pick-up and bin positions, the equal walking costs and the 76 px bin
clearance of "Unit 14-D2" (3) hold unchanged. ONE statement of
"Unit 14-D2" (3) is WITHDRAWN by the owner's final M04 spatial ruling of
1 October 2026 (§5.234): "the Sample Cutter is the nearest station to
every piece" by straight-line anchor distance — the bench anchor
(566, 305) lies 171.1 px from job 2's coupon offcut (572, 476), the
cutter anchor 173.2 px, about 2.1 px nearer through the south hull,
which describes neither access, nor interaction competition, nor
walking cost. In its place the guarantees are functional and tested
(`m04_cutting` "register row and fixtures …" and "U14-D2: measured
from every reachable avatar position …"): every piece lies more than
the combined station and piece reaches (72 + 64 px) from every station
anchor; from every position a piece can be lifted from, no station is
in range; each piece is associated with its originating job through
its own record (`M04Piece.job`, `m04PiecesOf`); the two jobs keep their
mirrored placements and matched pick-up-to-bin walking costs; the
cutter, the bin, the six coordinates, the 64 / 64 / 64 px reaches, the
first-departure rule, the immutable records, the provisional /6, the
dependence warning and `m04-cutting-v4` are unchanged.
(5) Art: `public/assets/world-v2/plates/workshop-plate.png`, recomposed
by `scripts/world-v2/plate_edits.py workshop` from the same v2 source
under Python 3.12.14 / Pillow 12.3.0 (encoder-only hash change
documented in the provenance register, §5.232); generated twice with
identical SHA-256 `4ed99f6174265737380e4b90db0d187fa48bef288133a12ce73e0aa660540242`;
changed pixels only inside the four edit regions; rows 414–607
untouched. PROVISIONAL.
(6) Changed files: `src/world/layouts/workshop.ts`,
`src/pilot/zoneSites.ts`, `src/world/interactionRegistry.ts`,
`src/scenes/RecordsWorkshopScene.ts` (one comment),
`scripts/world-v2/plate_edits.py`, the plate, the world-v2 manifest,
`docs/game/world-v2/ASSET-PROVENANCE-REGISTER.md`,
`docs/game/rooms/12-workshop-return.md`; tests
`e2e/u14_d3_workshop_access.spec.ts` (new), `e2e/m04_cutting.spec.ts`
(the doorway figures), `e2e/u14_correction.spec.ts`,
`e2e/pilot_records.spec.ts`, `e2e/concourse_interaction_lifecycle.spec.ts`
(the locker's and the bench's audited coordinates only; what they
measure is unchanged); and the four documents of the unit. Closeout
amendment (1 October 2026): `e2e/pilotHelpers.ts` (`workshopToConcourse`
and `workshopVia` reach the east wall west of the divider; driver
only), `e2e/m04_cutting.spec.ts` (the nearest-anchor assertion replaced
by the functional guarantees), and — comments only, by the owner's
final consistency correction — `src/pilot/windows/m04CuttingModel.ts`
(the header no longer states that every piece is nearer to the cutter
than to any other station; it states the functional guarantee). Results
and their limits: unit log, U14-D3 and its closeout amendment.
Resolved by the closeout amendment: §5.233 (the shared e2e driver) and
§5.234 (the nearest-anchor statement withdrawn; bench unmoved). Carried
forward unchanged — the scientific limitations of "Unit 14-D2": the
extractor and piece events without a recognised `object_id` (§5.216);
two jobs as repeated occasions, six pieces not six observations
(§5.200); side and order not separated (§5.224); empirical evidence
pending (§5.203); the M03 concerns (§5.180, §5.196, §5.198); the art
PROVISIONAL.

**Unit 14-D2** (M04 only; the final correction of U14-D — the "Unit 14-D"
record below is kept as written and is superseded only where this record
says so): as-built. **Status: the owner's ruling on the places is
implemented with the approved cutting annex and verified by the tests
named in the unit log as far as they reach; NOT scientifically
validated** — no response-process, reliability or convergent /
discriminant evidence exists for M04 (§5.203); nothing here establishes
validity, reliability, questionnaire equivalence, norms or cut scores.
M04 stays a provisional behavioural analogue of cleanup / restoration.
Authority: the owner's M01–M26 decisions, the owner's U14-D2 contract of
30 September 2026 (the approved annex geometry, every coordinate below)
and the owner's confirmations of the same day (§5.222–§5.231). The older
Q01–Q33 material does not govern this unit. Administration version:
`entry_state_version` `m04-cutting-v4` on every event of the family.
The four versions: `-v1` Unit 14; `-v2` U14-C; `-v3` the blocked U14-D
pass recorded below — never committed, never approved and never
released, so no session carries it; `-v4` this annex. They are told
apart by that field and pooled by no code (§5.225). M03 is unchanged
(`m03-tools-v2`). Unchanged: the family `proto_m04_cutting_` and every
event suffix and field (none added), opportunity and window ids, the
feature `m04_undisposed_pieces`, its companion, its formula, its meaning
and the planned denominator of six, two jobs of three pieces, per-job
values 0–3, direction, every missingness rule, the immutable
first-departure record, a carried and a lying piece both undisposed,
later disposal recorded apart, the removal of `by`, the settle window,
the 72 px station and 44 px bundle ranges; everything stays provisional.
`src/measurement/features/m04.ts`, the event schema and the scoring plan
are untouched.
(1) The room and the places — supersedes (1) of "Unit 14-D" and resolves
§5.219. The Records Workshop is 43 × 19 tiles (1376 × 608 px;
`src/world/layouts/workshop.ts`). A 13 × 6-tile cutting annex lies south
of the machine bay: floor tiles `[6, 12, 13, 6]` (x 192–608, y 384–576);
doorway region tiles `[11, 10, 3, 2]`, open between the jamb solids
`[352, 320, 16, 64]` and `[432, 320, 16, 64]` at x 368–432, y 320–384 —
where the decorative south tool bench stood; bottom wall row y 576–608.
The Sample Cutter stands at the annex's northern centre (anchor
400, 456; solid tile units `[11, 14.1, 3, 2.9]`) and is operated from
the north (approach 400, 423); the disposal bin stands south of it
(anchor 400, 556; tile units `[11.7, 16.8, 1.6, 1.2]`, §5.223). The old
cutter island, its attached bin and the tool bench are removed from the
layout and the painting. The scatter origin is (400, 456). Places (room
px; offsets from the origin exported as `piece_offsets`): job 1 — west —
coupon offcut 228, 476 (−172, 20) · swarf tray 212, 516 (−188, 60) ·
blade wrap 212, 556 (−188, 100); job 2 — the mirror images east —
offcut 572, 476 (172, 20) · swarf tray 588, 516 (188, 60) · blade wrap
588, 556 (188, 100). The two clusters do not interleave: 344 px of floor
and the cutter lie between them. No other station, anchor, approach,
spawn, window or text of the room changed; no other room changed.
(2) Reaches — supersedes "96 px by pointer, 96 px bin" of "Unit 14-D".
One reach of 64 px holds for the keyboard pick-up, the pointer pick-up
and the bin (`PIECE_REACH`, `BIN_REACH`, the pointer layer's
`reachRadius`). Keyboard and pointer therefore lift a job's pieces from
the same floor.
(3) What the geometry guarantees — measured by the pure test "U14-D2:
measured from every reachable avatar position …" (`m04_cutting`; the
scene's own collision rule, a 4 px lattice walked from the spawn). The
annex floor and the collision footprints of the cutter, the bin and
both jambs are mirror-symmetric about x 400 (the painted cutter is a
machine, not a mirror image): a position can be stood at exactly when
its mirror image can. For each pair of corresponding pieces the positions a piece is
lifted from are the same in number and are the mirror images of each
other, by keyboard and by pointer; every one of them lies more than
76 px from the bin anchor (lifting a piece can never bring the bin into
reach) and outside every station's 72 px range (no station takes the
press meant for a piece); the walking distance from the cutter's
operating position to the nearest pick-up position and from the pick-up
positions to the nearest position the bin is used from is equal piece by
piece, and the total is equal for the two jobs; the bin is used from
mirrored pockets west and east of it, equal in number, none within the
cutter's range; from within the cutter's range no piece can be lifted;
no piece can be lifted from the doorway, from the way down to the
cutter's operating side or from the passage between the bays (more than
92 px away); the Sample Cutter is the nearest station to every piece;
the annex is entered through the doorway only and nothing south of the
records office or beside the annex can be stood on. Figures of the
writer's scratch run of the same rule (not literals of the test):
pick-up positions per piece on the 4 px lattice — offcut 456 by keyboard
/ 599 by pointer, swarf tray 158 / 404, blade wrap 90 / 229, identical
for the two jobs; nearest pick-up position to the bin 127–130 px;
walking distance cutter → piece 136 / 192 / 232 px and piece → bin
80 / 68 / 68 px, 776 px per job; 40 bin positions on each side.
(4) Kept from "Unit 14-D" and re-verified in the annex: targeting (2) —
a station or door in range keeps the press; the deliberate-transition
gate (3), now with the 64 px range — lifting a piece never names or
outlines the bin, the bin is acquired only after every interaction key
and the pointer were released and the avatar walked into its range, a
pointer press on the bin is its own gesture, the release of the drag
that lifted the piece may end in the bin; set-down (4) — "X — Set down",
neutral, reversible, never a disposal; the lines (5) — "Sample coupon 1
of 2 cut.", "Sample coupon 2 of 2 cut.", "No cutting order is
available."; the first departure (6) and its table; telemetry (7); the
entry snapshot (8), whose `piece_offsets` now hold the v4 offsets.
Because every pick-up position now lies outside the bin's range, the
case "a piece lifted within the range" of (3) no longer occurs for any
piece. Departure, clarified by the contract and already the behaviour
of (6) — no code changed for it: walking out of the annex while
remaining in the workshop closes no job, and neither does a supply
bundle collected, the questionnaire notice acknowledged or an M04 piece
handled; the final review's closure stays distinct from a departure.
(5) Art. The plate `public/assets/world-v2/plates/workshop-plate.png`
is 1376 × 608, composed locally and reproducibly from the kept source
`workshop-plate.v2.png` by `scripts/world-v2/plate_edits.py workshop`
(§5.226); collision still comes from the layout only. PROVISIONAL.
(6) Changed files of U14-D2 beyond those of "Unit 14-D":
`src/world/layouts/workshop.ts`, `src/pilot/zoneSites.ts`,
`src/world/interactionRegistry.ts`, `src/world/kit/worldV2Assets.ts`
(a comment), the plate, the world-v2 manifest and provenance register,
`scripts/world-v2/plate_edits.py`,
`docs/game/rooms/12-workshop-return.md`; tests `e2e/pilotHelpers.ts`
(the driver walks the annex), `e2e/pilot_episodes_1_2.spec.ts`
(§5.227), `e2e/world_v2_workshop_look.spec.ts`.
`src/gameplay/physical.ts` is as "Unit 14-D" left it. Results and their
limits: unit log, U14-D2.
NOT resolved here and carried forward: the extractor and piece events
without a recognised `object_id` (§5.216, a separate later unit); two
jobs are repeated occasions, not independent situations, and six pieces
are not six observations (§5.200); job 1 is always the west cluster and
always first, so side and order are not separated (§5.224); empirical
evidence is pending (§5.203); the M03 concerns (§5.180, §5.196, §5.198)
are untouched.

_Unit 14-D (M04 only, a correction of the ADMINISTRATION of Unit 14 /
14-C — the records below are kept as written and are superseded only
where this record says so): as-built after review / fix round 1.
**Status: interaction correction, verified by the tests named in the
unit log as far as they reach; owner ruling 3 (the places) is BLOCKED
and NOT implemented (§5.219); NOT scientifically validated** — no
response-process, reliability or convergent / discriminant evidence
exists for M04 (§5.203); nothing here establishes validity, reliability,
questionnaire equivalence, norms or cut scores. Authority: the owner's
M01–M26 decisions (M04: two jobs of three self-generated pieces,
disposal optional and accessible, the state recorded at the first
departure from each job, a carried piece undisposed, later cleanup never
rewriting it), the owner's U14-D contract and the owner's rulings of
30 September 2026 on the first independent review — approved U14-D
administration decisions (§5.211–§5.218 state each); the older Q01–Q33
material does not govern this unit. Administration version:
`entry_state_version` `m04-cutting-v3` on every event of the family
(U14-C: `-v2`, Unit 14: `-v1`); the three are told apart by that field
and are not pooled by any code (§5.215). `-v3` was never administered
before this correction: the first U14-D pass was not committed. M03 is
unchanged (`m03-tools-v2`). Unchanged: the family `proto_m04_cutting_`and every event suffix (none added), opportunity and window ids, the
feature`m04_undisposed_pieces`and its companion, the planned
denominator of six, two jobs of three pieces, per-job values 0–3,
direction, every missingness rule, the immutable first-departure record,
a carried and a lying piece both undisposed, later disposal recorded
apart, the reaches (64 px piece by keyboard, 96 px by pointer, 96 px
bin, 72 px station, 44 px bundle), the settle window, the station
anchors, the scatter origin and the bin; everything stays provisional.
(1) Places — UNCHANGED from the first U14-D pass and NOT as the owner
ruled (ruling 3, blocked, §5.219). The six pieces lie at fixed offsets
from the unchanged scatter origin (344, 224) — room px: job 1 offcut
462, 166 · swarf tray 548, 212 · blade wrap 582, 166; job 2 offcut 502,
166 · swarf tray 584, 212 · blade wrap 542, 166 (offsets 118, −58 ·
204, −12 · 238, −58 and 158, −58 · 240, −12 · 198, −58; exported as`piece_offsets`). Every place is on the walkable floor, off every
painted bench and machine, at least 84 px from every station anchor, at
least 58 px from every supply bundle, outside the bin's pointer zone and
at least 36 px from every other piece. What the places do NOT meet: the
places of the two jobs INTERLEAVE along the lane (they are not two
clusters); and every place has pick-up positions WITHIN the bin's 96 px
range (all six by pointer, pure test; by keyboard, where the browser
test's driver stood in the final run, four of six — the first job's
blade wrap and the second job's swarf tray, which lies at the edge of
the range, were lifted outside it). The summed
straight-line distance to the bin agrees within 1 % (249 and 250 px;
the 1 % tolerance is restored in the pure test) — a continuity check
only, no evidence that the jobs are administered alike. Measured from
every position the avatar can stand at (pure test, 4 px lattice walked
from the spawn, the scene's own collision rule): with the anchors, the
layout and the reaches as they stand, the machine bay holds TWO patches
of floor from which every keyboard and pointer pick-up position lies
outside the bin's range — one beside Label Press B (about 30 px from
its anchor, 81 px from the cutter) and one in the south-west corner
under the Relay Bench (292 px from the cutter); each is narrower than
the 36 px two pieces keep between them, so each holds one piece. Six
places in two clusters do not fit. No place was moved: a compromise
would weaken the ruling.
(2) Targeting. A station or a door in range ALWAYS keeps the press
against a loose piece: `RecordsWorkshopScene.debrisTarget`names a piece
on open floor only (unless a supply bundle in reach lies nearer, as
before). The yielding rule of §5.171 is withdrawn for pieces and kept
for the bin with a piece already carried — once the bin is the acquired
target (3). A pick-up carries the origin`pointer`or`open_floor_press`; `cutter_press`and`station_press:<id>` remain for
a disposal and for the records of v1 / v2.
(3) Disposal needs a deliberate transition (owner ruling 2). Lifting a
piece never names the bin: no line "Use disposal bin", no outline, no
disposal by the press that lifted it. The bin becomes the target of the
carried piece only after (a) the activation that lifted the piece is
over — E, SPACE and the pointer were all seen released — and (b) the
avatar walked INTO the bin's 96 px range from outside it, after that
release. A piece lifted within the range (every place of this tree
allows it, (1)) leaves the bin unnamed until the avatar has left the
range and come back; a key held from the pick-up all the way to the bin
acquires nothing, nor does its release there. Leaving the range loses
the target; entering it again acquires it anew. The gate
(`M04BinGate`, `m04BinGateStep`, pure, in `m04CuttingModel.ts`) reads
states and input-release boundaries only: no time is measured. It
writes no event and no field, and is no state of a job. Pointer: a
PRESS on the bin is a gesture of its own and is accepted once the
pick-up's activation is over (a click lifts a piece when the pointer is
released, so the press on the bin is always a second gesture); the
RELEASE of the drag that lifted the piece, over the bin and with the
avatar in reach of it, is the one continuous gesture that may end in
the bin — the bin is outlined while that drag is held over it, and a
drag released anywhere else leaves the piece in the hands (it can be
set down). The outline is decided by the scene through the new optional
`isContainerCued` of the pointer layer (`src/gameplay/physical.ts`,
default: as before; no other host passes it). The bin stays drawn in
the room and can be walked up to at any time. Interleaved events of the
interaction keys are read as held (`isDown`), so a repeated key-down
changes nothing.
(4) Set-down (owner ruling 5). While a piece is carried — and only
then — two elements are shown side by side beside the avatar: the line
"Carrying: <piece>" and the control "X — Set down". They are placed
below the avatar's feet, else to its right, to its left, farther below
or above its head: the first of these that covers no bench or machine,
no piece, not the bin, not the figure and not the line above the
avatar's target; where the room leaves none free, the one that covers
least (§5.221). The control is a pointer target of its own and shows
that it is targeted (another fill and an outline) while the pointer is
on it. The X key (wrapped in the project's key guard,
`guardKeyHandler`) and a pointer press on the control both set the
piece down: it returns to its own fixed place, from wherever the avatar
stands; `piece_put_back`is written (the existing suffix;`input_mode`
`keyboard`or`pointer`); the line is "Set down.". The piece stays
undisposed; a record already made is untouched (`after_departure:
true`). A set-down that cannot be completed keeps the piece in the
hands, writes nothing and answers "Cannot set that down right now." —
never a disposal. A pointer press on the control is not also read by
the pointer layer; the latch is cleared when the pointer is released
inside the canvas or outside it. No line names the bin, tidying or
disposal, and nothing is shown with empty hands.
(5) Lines (owner ruling 4). Both cuts are answered "Sample coupon N of
2 cut." and nothing else. The cutter's status, shown only when the
participant checks the cutter while the second coupon is not available,
reads "No cutting order is available." (`M04_NO_ORDER_LINE`; the first
pass read "The cutter is re-arming."; record `job_unavailable`,
`job_open`, unchanged). It names no leaving, no tidying and no other
work. The other lines of the cutter are unchanged. The guidance leaves
the cutter after each cut alike and returns to it when the second
coupon is available (unchanged rule).
(6) First departure (owner ruling 1). `first_departure`is written at
the first of (a) the first accepted, task-specific action at ANOTHER
station that changed that task's recorded state, (b) the room left —
once per job. The record is written AFTER the other task's transition
succeeded.`pilot_station_opened` closes nothing, and neither does a
panel shown or closed. No availability predicate is read in place of
the work (the checks the first pass copied from the windows are
removed). How (a) is read: stations that act through a prompt (Work
Order Board, seal log, handover desk, Component Locker's engagement)
compare the task's own state before and after their accepted action;
stations that open a panel or a surface keep, at the opening, what
their task has recorded of the participant's accepted work, and the
scene — paused under the panel — compares it after every game step and
once more when the panel closes (`watchOtherWork`, `checkOtherWork`).
Nothing is inferred from time, distance, facing or proximity, and no
file outside the allowlist was needed.

| Station (`detail`)                                     | Qualifying action                                                                                         | Successful transition that is read                                                                                                                            | Does not qualify there                                                                                                                                                    | Browser evidence                                             |
| ------------------------------------------------------ | --------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------ |
| Work Order Board (`work_order_board`)                  | the optional filter swap accepted                                                                         | `secondaryState().m08.filter_swap.engaged` false → true, after `noteM08JobEngaged`                                                                            | the board read; "Take the orders."; the sign-off; "Still working."; the swap only shown                                                                                   | yes (`u14_correction`, test 2)                               |
| Sample Seal Log (`seal_log`)                           | the seal rule acknowledged                                                                                | `secondaryState().m11.acknowledged` false → true, after `acknowledgeM11Obligation`                                                                            | the log read; "Close log"; the acknowledged log read again                                                                                                                | yes (test 1)                                                 |
| Component Locker (`storage_locker`)                    | its first use — the stowing job engaged; at a later opening, the first change of what the locker holds    | `secondaryState().m08.stow_supplies.engaged` false → true, after `noteM08JobEngaged('stow_supplies')`, read at the opening; later: the slots of `lab_storage` | standing at the locker; a later opening and closing with nothing moved; an item only lifted                                                                               | first use: yes (test 2); later change: no                    |
| Assembly Bench (`assembly_bench`)                      | a part laid on the bench, an assembly                                                                     | the slots of `workbench_input` / `workbench_output`                                                                                                           | the bench opened and closed (it creates no task progress); an item only lifted; the backpack rearranged                                                                   | opened and closed: yes (test 1); qualifying: no              |
| Calibration Bench (`calibration_bench`)                | a stage carried out                                                                                       | `m07State().stagesCompleted`                                                                                                                                  | the surface shown; a revisit                                                                                                                                              | both: yes (test 1; `m03_m04_route`)                          |
| Quality Packet (`qc_packet_o2`)                        | a field checked, judged or corrected; the packet released                                                 | `m12State('o2').actions`, `.released`                                                                                                                         | the surface shown; a released packet shown as a record; a packet held back after a reload                                                                                 | record only: yes (test 2); qualifying: no                    |
| Case Workspace (`case_workspace`)                      | a case moved to another tray; a tray labelled; the workspace handed over; a request answered              | `m02cState()`: `moveCount`, `labelChanges`, `handedOverAtMs`, answered `requests`                                                                             | the panel shown; a case only lifted or moved within its tray; a closed workspace shown as a record; a workspace held back after a reload                                  | no                                                           |
| Label Press A / B (`press_a`, `press_b`)               | the roll moved; a cycle run; a tool moved                                                                 | `m03tState()`: `practiceMoves`, `cycles`, `moveCount`                                                                                                         | the panel shown; a run or a move refused; the press idle, not scheduled, out of service or held back after a reload                                                       | refusals (idle, not scheduled): yes (test 1); qualifying: no |
| Dispatch Console (`dispatch_console`)                  | a token keyed or removed; the line cleared; a line sent; the work period begun; the stop armed            | `m06State()`: `tokenPresses`, `tokensRemoved`, `clears`, `practiceSent`, `typedLines`, `beganAtMs`, `stopArmPresses`                                          | the surface shown; the reference consulted; a press refused in the settle window; a second surface refused; the budget ended by the system; a closed or held-back console | no                                                           |
| Conduit Lattice Bench (`lattice_bench`)                | a piece seated, moved, turned or returned; a step undone; the board reset; a first response; a test run   | `m13LatticeProbe()`: `placements`, `moves`, `rotations`, `returns`, `undos`, `resets`, `submission_count`                                                     | the panel shown; a piece only lifted; help; a confirmation opened or cancelled; NEXT NETWORK; SHOW RESULTS; a practice board opened; FINISH; a record shown (U16)         | no                                                           |
| Return shift: Station Feed Console (`feed_console`)    | an executed ALIGN; a step aligned (U22)                                                                   | `m20OtherWorkSignature()`: executed ALIGNs plus aligned steps (`m20WorkSignature`)                                                                            | the console opened, read or closed; the card; CONTINUE; START; a cell changed; a refused ALIGN; help; the notice; a record                                                | no — not exercised by `m20_returns_route`                    |
| Return shift: Relay Bench (`relay_bench`)              | a post or the selector set; the unit applied, accepted or set aside                                       | `m21State()`: `actions`, `applications`, `accepted`, `stop_choice`                                                                                            | standby; the plate and the manual read; a refused act                                                                                                                     | no — as above                                                |
| Return shift: Shift Report Desk (`report_desk`)        | a line placed or coded; the report submitted or withdrawn; the returned note acknowledged; a rating given | `m22State()`: `slots`, `codes`, `submissions`, `setback_acknowledged_at_ms`, `stop_choice`; `m22Ratings()`                                                    | standby; a tray line selected; the register read                                                                                                                          | no — as above                                                |
| Return shift: return batch (`return_orders`)           | a card placed or returned; a job worked                                                                   | `m01State('o2')`: `placements`, `returns`, `plan_locked`, `done`                                                                                              | the board shown; a card only lifted                                                                                                                                       | no — as above                                                |
| Return shift: Outbound Handover Desk (`handover_desk`) | an item placed in the outbound tray (the one-action handover)                                             | `removeInventoryItem` and `noteHandoverPlaced` both returned true                                                                                             | the desk read; the questionnaire notice read or acknowledged (not classified by the owner, §5.220)                                                                        | no — as above                                                |
| The room's door (`room_exit`, no `detail`)             | the door used                                                                                             | the door accepted the press; the state is recorded first, the carried piece put back afterwards                                                               | walking through the room                                                                                                                                                  | yes (`m03_m04_route`)                                        |

Never a departure, at any station: `pilot_station_opened`; a panel
shown or closed; a refusal, an unavailable action, a closed or
record-only surface, a prior-administration guard, a reload hold, a
no-op; the map; the backpack; a supply bundle collected; walking;
elapsed time; proximity; every act on the pieces and the bin of M04
itself; the Sample Cutter. The trigger and its station are exported as
before (`other_station` + `detail`, `room_exit`). The second coupon
becomes available after the first job's departure, as before; a
participant who neither does other work nor leaves the room is never
offered it (§5.214).
(7) Telemetry (owner ruling 6). The field `by`, added to
`piece_put_back` by the first pass, is removed: `input_mode` alone
tells a set-down by the participant (`keyboard`, `pointer`) from the
put-back at a room exit (`system`). No event suffix, canonical event,
formula, companion output or scoring rule was added or changed.
`src/measurement/features/m04.ts` is unchanged.
(8) Entry snapshot (additive, provisional, as the first pass wrote it):
`departure: other_station_work_begun_or_room_exit` (v1 / v2:
`other_station_opened_or_room_exit`), `set_down_available: true`,
`set_down_counts_as: undisposed`, `cut_feedback:
same_line_for_both_jobs`. The snapshot names neither the gate nor the
reading of the other tasks' records (both are described here only).
Changed files: `src/pilot/windows/m04CuttingModel.ts`,
`src/pilot/windows/m04Debris.ts`, `src/scenes/RecordsWorkshopScene.ts`,
`src/gameplay/physical.ts` (the optional outline hook); tests
`e2e/m04_cutting.spec.ts` (pure), `e2e/u14_correction.spec.ts` and
`e2e/m03_m04_route.spec.ts` (browser). Results and their limits: unit
log, U14-D, review / fix round 1.
NOT resolved here and carried forward: the places (ruling 3, §5.219);
the extractor `src/measurement/features/m04.ts` (outside this unit, a
separate later unit by the owner's ruling 6) skips piece-action events
whose `object_id` is missing or not recognised, so a malformed stream
can keep an accepted observation (§5.216); repeated jobs are not
independent situations, the second job can carry learning and
carry-over from the first, and six pieces are not six observations
(§5.200); empirical evidence is pending (§5.203); the M03 input-effort
and exposure-threshold concerns (§5.180, §5.196, §5.198) are untouched.
For the owner: §5.219 (blocked), §5.220 and §5.221 (the writer's
application of the rulings where they name no case).\_

_Unit 14-C (M03 / M04, a correction of Unit 14 — the Unit 14 record
below is kept as written and is superseded only where this record says
so): as-built. **Status: technical correction verified by the tests
named here; NOT scientifically validated** — no response-process,
reliability or convergent / discriminant evidence exists for either item
(§5.203). Administration versions: `entry_state_version`
`m03-tools-v2` and `m04-cutting-v2` (Unit 14: `m03-tools-v1`,
`m04-cutting-v1`); sessions of the two versions are told apart by that
field on every event and are not pooled without an owner decision
(§5.202). Families, suffixes, opportunity and window ids, formulas,
directions, denominators and missingness rules are unchanged; no event
suffix was added; everything stays provisional.
(1) Extractors. `m04_undisposed_pieces`: a completed job is read only
when its own `opportunity_opened`, `job_run` and `first_departure`
occur once each and in that order, when `job_run` names exactly the
three pieces the job is defined with, and when the acts on those pieces
between the cut and the departure replay without a contradiction (a
piece is lifted from where it lies, put back or disposed from the hand,
and disposed once — a repeated `piece_disposed` is no longer folded
into one by a set); the recorded carried piece must be the piece the
replay leaves in the hand, and the recorded `disposed_ids` name no
piece twice. `m03_tools_restored`: a completed occasion
is read only when `opportunity_opened` and `first_departure` occur
once each and in that order, when the tools of the entry snapshot and of
the record are exactly the three the occasion is defined with, when
every move inside the window names one of them and one of the
occasion's two trays, and when every recorded container is the one the
moves lead to (the work surface for a tool never moved), and when the
recorded `move_count` and every tool's `moves` equal the raw moves
inside the window. Anything else
is `technical_failure` through the existing path (`jobs_disagreeing`
/ `occasions_disagreeing`). Unchanged: pending, absent, declined,
interrupted and system-closed records are not subject to these checks;
an event naming a piece of the OTHER job is left out of a job's
recount; a disposal after the departure is a `late_disposal` and never
enters; the work orders' `listed` is an exposure record and its
absence never invalidates a job. The extractors read and never write.
(2) Exposure. A press opened before the work orders named its batch
(Press A is open to a press from the arrival in the Workshop on) is
presented at that open: `presented` is written once, before
`surface_opened`, with `presented_by: station_direct` in the entry
snapshot and on `surface_opened`; on the ordinary route the value is
`work_orders`; after a reload, a press whose presentation lies in an
earlier page load reads `earlier_page_load` (this load never claims a
direct presentation it cannot know). A later listing writes nothing for
the press. No
prerequisite was added: both the press and the cutter can still be used
before the orders are taken. The companion `m03_object_states` gained
`presented_by` and `presented_before_panel_opened`.
(3) Prompt and press. One decision per frame
(`RecordsWorkshopScene.debrisTarget`, read through the new
`RoomScene.interactionRedirect` hook) feeds the line shown and the
press. It names a piece ("E / Space — Take coupon offcut") or, with a
piece carried, the bin ("E / Space — Use disposal bin") where Unit 14
let a press act on one: at the cutter once no coupon is waiting
and the 1.5 s settle window is over; at a station that yields (the Case
Workspace, the presses, the Component Locker, the Assembly Bench and the
first shift's benches) while a job awaits its departure, for a piece of
THAT job or the bin lying nearer than the station; on open floor unless
a supply bundle in reach lies nearer. Otherwise the station, the door
or the bundle is named and the press acts on it. A press that names a
station never lifts or drops a piece; a press that names a bundle never
lifts a piece. Reaches (64 px piece, 96 px bin, 72 px station, 44 px
bundle), the pieces' places, the settle window, the re-arm line and the
departure rule are unchanged: a job still closes when another station is
actually opened or the room is left, and never on approach. Origins are
recorded as before (`cutter_press`, `open_floor_press`,
`station_press:<id>`, `pointer`). The pointer layer is unchanged.
Differences in the raw log against Unit 14, none read by an extractor: a
keyboard pick-up or disposal made where the cutter is in range no longer
writes `pilot_station_opened {station_id: sample_cutter}` (the cutter
is not used by that press); a press at a yielding station that lifts a
piece wrote none in Unit 14 either. With a piece carried at the cutter
and the bin out of reach the press is the cutter's, states the cutter's
line and writes `job_unavailable` exactly as in Unit 14 (review S-M1:
the first version of this correction answered "Hands full." there and
changed how often the re-arm line is shown; withdrawn). The line naming
a piece is also shown for pieces left after a job's departure, at the
cutter once both coupons are cut and on open floor, during later
opportunities (§5.201).
(4) Lines. With the hands full a press on a piece named on open floor
answers "Hands full." (the pointer's line; Unit 14: a silent press);
with a piece
carried and nothing in reach a press answers "Carrying the <piece>.". A
press whose panel was stopped by the system, or that is otherwise out of
use, answers "Label press out of service."; only a panel the participant
closed answers "Label press idle. The batch is done.". The cutter answers
"Both coupons cut. The cutter is idle." only when both were cut, "The
cutter is idle." after a jam or a held-back job beside a cut, "The
cutter is out of service." when nothing was cut.
(5) Presentation at 800 × 600. On the label press a tool lifted by
keyboard was drawn over the name of its tray; it is drawn over the
focused cell, slightly raised (the `m03tools` mode only). A line naming
a piece within arm's reach is raised above the figure when it would fall
across it.
The new line is clamped to the canvas like a station's.
Tests: `e2e/m03_restore.spec.ts` (10 pure, 2 new), `e2e/m04_cutting.spec.ts`
(9 pure, 2 new), `e2e/u14_correction.spec.ts` (browser, new: direct
access from the Dock without the work orders, Press A by pointer, TAB /
SHIFT+TAB with and without a tool lifted, the named target against the
act at the cutter, a piece, the bin, a station and a bundle, the carried
piece counted at the departure, a later disposal leaving the record
byte-identical, the listing taken last), `e2e/m03_m04_route.spec.ts`
(unchanged). Results: unit log, U14-C. Limitations carried forward and
decisions pending: §5.195–§5.209._

_Unit 2 + U2-R (M08): as-built — Station Support Console, Recovery Yard
(`YARD_SITES.supportConsole` 620,520; registry `yard.support_console`);
listed by Noor's briefing as the sixth yard job (between the magnet rig
and the uplink posts; `EXTERIOR_SITE_ORDER` 'console', objective line
"Run the six slots at the station support console…"); opportunity
`proto_m08_effort_choice`, window `m08_effort_w1`, family
`proto_m08_effort_`(events:`presented`at the briefing,`opportunity*opened`, `practice_item_sorted`, `practice_complete`,
`interval_continued`, `choice_presented`, `choice_made`, `epoch_started`,
`work_item_sorted`, `epoch_completed`, `surface_closed`,
`surface_reopened`, `window_closed`, `technical_failure`only as the
reload-guard marker); procedure: 4 practice sorts (rule: ≥ 50 → Bin A,
factual per-sort feedback, no pass criterion) → interval screen →
Continue → six slots, each: choice screen with displayed benefit 1/3
(orders`order_a`= 1,3,3,1,1,3 /`order_b` = 3,1,1,3,3,1 by session hash),
explicit Sort (1) / Stand by (2), 15 focused s, interval screen with one
Continue control on its own row (no press meant for a bin can be a
choice); units are produced by sorting (`served`= at least one reading
sorted; an unserved Work slot yields 0 units — the Work choice still
counts); ESC and the Leave button take one path that pauses a running slot
or an open choice;`choice_latency_ms`(wall) and`choice_focused_ms`(focused) both recorded; formula`m08_work_choice_fraction`= work / valid
(6 planned;`incomplete`below 6; null with`voluntary_stop`when no
choice;`declined`when presented but never opened;`not_presented`when
the briefing was never reached;`interrupted`after a reload); companion`m08_work_choice_by_benefit`(null with the primary's disposition at zero
valid choices;`incomplete`below three valid per level); closure: six
ended slots at the shift end complete the window, fewer close it as a
censored stop, the review censors an open console and marks a never-opened
one absent; a console administered in an earlier page load is never re-run
(prior exposure recorded, window technically incomplete); extractor`src/measurement/features/m08.ts`; tests `e2e/m08_effort_choice.spec.ts`(4 pure) and`e2e/m08_effort_route.spec.ts`(browser, 1: pointer and
keyboard choices, leave-button pause mid-slot, offline reproduction of the
feature row from the raw family, choice screen captured at 800×600);
limitations: six choices cannot identify an individual discounting
parameter; the sorting task is the only "demanding work" sampled; a
carried-over ENTER across two consecutive screens (interval, then choice)
remains possible for keyboard users and is traceable by a near-zero`choice_focused_ms`; the by-session order assignment is a deterministic
hash, not an enforced 50/50 split.*

_Unit 3 (M11): as-built — two borrowed instruments. Occasion `lab`
(window `m11_custody_lab`, opportunity `proto_m11_custody_lab`, Diagnostics
Laboratory, episode 3): Kai's field probe (item `kai_field_probe`), offered
inside the laboratory briefing with the terms stated ("borrow it while you
work here if you like. It is mine: hand it back to me, or leave it on the
signal analysis workstation, before you leave the laboratory"); the
acknowledgement's pre-focused option 1 is the plain "Understood." (the loan
then LAPSES — untaken, outside the denominator, distinct from a refusal);
taking the loan ("Understood — and I will take the probe.") or refusing it
("Understood — no need for the probe.") are deliberate options 2 and 3;
return paths while carried: Kai ("Hand the field probe back to Kai.", owner
handover) and the Signal Analysis Workstation prompt ("Leave the field
probe on the workstation.", return point); first departure through either
Lab door freezes the outcome. Occasion `yard` (window `m11_custody_yard`,
opportunity `proto_m11_custody_yard`, Recovery Yard, episode 4): Noor's
torque driver (item `noor_torque_driver`), offered inside the yard briefing
("borrow it while you work out here if you like. It is mine: hand it back
to me, or put it back in the supply crate, before you leave the yard";
option 1 "Ready." lets it lapse; "Ready — and I will take the driver." /
"Ready — no need for the driver." are options 2 and 3); return paths: Noor
(owner handover) and the Yard Supply Crate ("Put the torque driver in the
crate", return point); first departure through the airlock freezes the
outcome. Late handovers on the return traversal (probe back to Kai; Noor's
driver to Kai "for Noor" — a named handover) are companions only. Family
`proto_m11_custody_`(events:`offer*presented`with`terms_version`,
`offer_answered`with`accepted`/`accessible`, `offer_lapsed`,
`custody_started`, `owner_available`, `return_point_available`,
`resolved`, `departed`, `late_resolved`, `window_closed`,
`technical_failure`only as the reload-guard marker); formula`m11_unresolved_custodies`= custodies unresolved at the first departure /
accepted accessible custodies (0–2; conditional eligibility — complete at
any size above zero;`declined`when every loan was refused or left
untaken;`no_eligible_event`when no accepted loan could be carried (belt
full → inaccessible);`pending`while a custody is open;`interrupted`after a reload — also when only ONE occasion was held back, the other
occasion's value kept beside the disposition;`not_presented`when no
briefing offered); a hand-back is recorded only when the belt or backpack
actually held the item (an item set down on the floor must be picked up
first — the prompt says so), and one neutral log line names the terms while the item is carried
(closed at the departure); raw components carry`owner_accessible`/`return_point_accessible`(design constants: both stand in the loan room
throughout) and`custody_ms`; companion `m11_custody_records`(per
occasion: offer, answer, lapse, accessibility, resolution before departure
with method and recipient, owner and return-point encounters while
carrying, late handover; observed whenever an offer closed,`declined`included — null only with a null primary); extractor`src/measurement/features/m11.ts`; tests `e2e/m11_custody.spec.ts`(5 pure)
and`e2e/m11_custody_route.spec.ts`(browser, 2: taken → workstation
return, taken → carried out unresolved → late handover to Kai, offline
reproduction 1 / 2; refused → Concourse-door exit →`declined`);
limitations: the pre-focused option never takes the loan, so an
inattentive acknowledgement yields no custody (untaken) rather than a false
one — at the cost of smaller denominators; the option order is fixed (never
randomised); neither instrument is needed by any task, so the loan is a
pure custody sample of stage length; ownership conventions and compliance
remain rival explanations; `input_mode` on prompt-card answers follows the
existing M09/M10 convention (`keyboard`; the cards do not report the
device); a dedicated return rack could not be placed on the audited
Laboratory plate (airlock trigger clearance and the workstation island), so
the workstation is the named return point.*

_Unit 4 (M25): as-built — Field Sensor Post, Recovery Yard
(`YARD_SITES.sensorPost` 440,330, approached from the south at 440,374;
registry `yard.sensor_post`; texture `proc-console-wall` — never `proc-scan-node`, which the yard hides and which is uplink post B's sprite); listed by Noor's
briefing as the seventh yard job, between the support console and the
uplink posts (`EXTERIOR_SITE_ORDER` 'sensor'; objective line "Run the
three sensor sweeps at the field sensor post — west field, south of the
uplinks"); participant-facing name of a calibration loop: a "sensor
sweep" ("calibration" stays the Workshop bench's word — M07); opportunity `proto_m25_calibration_loops`, window
`m25_loops_w1`, family `proto_m25_loops_`(events:`presented`at the
briefing,`opportunity*opened`, `loop_started`, `loop_press_refused`,
`loop_completed`, `required_complete`, `press_refused`(a press inside
the 400 ms settle window of the completion screen),`optional_entered`,
`cap_reached`, `stopped`, `surface_closed`, `surface_reopened`, `window_closed`,
`technical_failure` only as the reload-guard marker). Procedure: "Run
sensor sweep" (R) three times — one press starts one sweep, a sweep is
a standard 3 FOCUSED seconds (`M25_LOOP_MS`; hidden / unfocused / closed
surface excluded); while a sweep runs the button stays focusable and
reads "Sweep running…" and the model refuses and logs the press
(held-key auto-repeat and a carried click never add a sweep; keyboard
focus never falls through onto Leave or Finished); after the third required sweep the COMPLETION
screen ("Sensor check complete — 3 sweeps recorded."; "You can run
further sweeps at this post if you want to. Pay and route are not
affected." — no statement that further sweeps change nothing) offers
"Run more sweeps" (C) or "Finished" (F) — keys distinct from the sweep
key, and both refused inside the screen's 400 ms settle window
(`M25_SETTLE_MS`, logged `press_refused`), so no carried press enters the
optional phase or stops;
"Run more sweeps" starts the 30 s FOCUSED window (`M25_REPEAT_CAP_MS`), in
which "Run sweep again" (R) and "Finished — close" (F) are offered
(status "Further sweeps run the same way as the three recorded."); no
countdown is displayed; ESC / "Leave post" pauses every
running clock (no unattended time counts) and the reopen resumes them. No
futility-understanding gate exists. Closure: the explicit "Finished" is a
voluntary stop (`stop_kind: explicit`; on the completion screen it is an
exposed stopper with 0 repeats), the cap closes the window (`cap`,
censored — a sweep counts only when its whole cycle fits inside the
window on FOCUSED time, `repeat_focused_at_start_ms + 3000 ≤ 30000`,
independent of the 250 ms tick; one still running at the cap is NOT a
completed repeat and is exported as `loop_in_progress_at_cap`), Noor's shift end closes an open
exposed post by departure (`route_departure`, `stop_kind: departure`,
count as it stands) and an open unexposed post by departure, censored
(required sweeps never completed ⇒ primary null — never a stop the
participant could make: the required phase has no Finished control);
after the shift end a never-opened post is inert ("The yard shift is
logged — the post is closed.") so no post-shift sweep can be started; the review censors an
open post and marks a never-opened one absent; a post opened in an
earlier page load is never re-run (prior exposure recorded, technically
incomplete, features `interrupted`). Formula `m25_optional_repeats`=
completed optional loops (required loops excluded; recounted from the`loop_completed`events — a snapshot that disagrees with its own event
stream is`technical_failure`, `recount_agrees`exported;`null`with`no_eligible_event`when the required loops were never completed — the
repeat opportunity was never presented,`declined`when listed by Noor but never opened,`not_presented`before the briefing,`interrupted`after a reload,`pending`while open);`closure_reason`∈
{voluntary_stop, cap, route_departure, closed_at_review} and`censored`(cap / review) beside it; components: required loops completed, completion
marked, optional entered, optional loops started, loop in progress at cap,
repeat focused / wall ms, stop kind, per-loop focused ms. Belief:
opportunity`proto_m25_normality_belief`, window `m25_belief_w1`(Concourse, episode 5), family`proto_m25_belief*`(events:`presented`, `opportunity*opened`, `question_presented`with the stem and
the five labels,`question_press_refused`(a press inside the 400 ms settle window after
a presentation: position and latency logged, no response recorded, the
question re-presented in place),`question_answered`with`value`,
`label`, `option_position`= value,`option_count`5,`focus_default_position`1,`response_latency_ms`(from the LAST
presentation),`asked_count`, `refused_presses`; `window_closed`). Vale's return check-in
(`StationConcourseScene.normalityQuestionStage`): after the return
acknowledgement "Heading to the workshop." (the stage advance never waits
on the rating) a follow-up prompt stage shows "Vale: One question before
you go on — there is no right answer." followed by the pinned stem
`M25_NORMALITY_PROMPT` and exactly the five pinned anchors as option
cards 1–5 in fixed order (the first card pre-focused, as every prompt);
the stage is also offered by the workshop_return beat if still due. DUE
gate (`m25BehaviourClosed`): exposed (three required loops completed and
the completion screen shown) AND the loops window not open AND the
exterior shift ended (`shift_ended_at_ms`, which closes the M24 and M26
windows with their honest dispositions) AND neither the M24 nor the M26
window open — a RECORDED closure, never a numerical M24 / M26 score; a
never-begun rig or uplink after the shift end counts as closed (it closes
absent at the review). Stoppers and repeaters are asked alike; the first
read response is immutable; a press inside the settle window is refused
and the question shown again (a carried or double-tapped press from the
acknowledgement can never record the pre-focused first anchor); a later
press is refused; the prompt is
modal, so no sixth "prefer not to say" option exists (the owner specified
exactly five responses) and a missing rating arises only from never
reaching the check-in exposed, a reload before answering, or the review
(`not_presented`/`interrupted`, never a midpoint). Formula
`m25_normality_belief`= the recorded value 1–5 (ordinal; companion;`no_eligible_event`when not exposed,`pending`until asked,`interrupted`when asked and unanswered at the review); the two features are derived
from different families and never combined. Extractor`src/measurement/features/m25.ts`; tests `e2e/m25_repetition.spec.ts`(7
pure) and`e2e/m25_repetition_route.spec.ts`(browser, 2: repeater with
pointer + keyboard loops, refused double start, ESC pause mid-loop,
completion, two optional loops, explicit stop, shift end, the question
after the return with exactly the five anchors captured at 800×600,
immutable answer, no re-ask, offline reproduction; stopper by inaction
under the cap with the wall-clock tick, then the question answered by
keyboard). Integration dependency:`m25BehaviourClosed`reads the M24 /
M26`ItemWindow`s of `exteriorWindows()` and the exterior shift end — the
later U12 (M24 / M26 knowledge-boundary repair) must keep those windows as
the closure signal or update this reader; end-to-end verification of the
question timing against the REPAIRED M24 / M26 windows is deferred to U12
/ U24. Limitations: the loop is a pure timed cycle with no content (a
"calibration" that requires nothing), so repetition cost is time only; the
30 s cap and the 3 s cycle are pilot defaults; "exposed" is defined by the
completion screen (a participant who left before the third loop is not
asked); the yard hosts M24, M25 and M26 (all IP) in one visit — M25 is
separated from M24 by the support console and precedes M26; the prompt
cards report no input device (`input_mode: keyboard` by the existing
convention); the meaning of "normal" still needs cognitive interviewing.*

_Unit 5 (M01): as-built — two three-job batches. Occasion `o1` (window
`m01_batch_o1`, opportunity `proto_m01_batch_o1`, Concourse, episode 1):
the storm packet's plan board station (`concourse.plan_board`, surface
`m01_plan_board`, unchanged position) now opens "STORM PACKET — THREE
JOBS": jobs `isolate_loop` (no requirement), `replace_seal` (after
isolate), `log_storm` (no requirement); presented by Vale's briefing
acknowledgement (the briefing already names the plan board). Occasion
`o2` (window `m01_batch_o2`, opportunity `proto_m01_batch_o2`, Records
Workshop, episode 5): the Work Order Board's return-shift beat offers
"Open the return batch (three jobs)." (presented when that beat is read; the option
disappears once the batch is closed; the sign-off never depends on it),
opening "RETURN BATCH — THREE JOBS": `sort_spares`,
`seal_spares_crate` (after clear), `count_hand_tools`. Each surface: the
three job cards (requirement printed) on the left, an optional SEQUENCE
board of three slots on the right (lift / place / swap / take back; the
packet order is counterbalanced per occasion, `form_a` / `form_b`), and
three "Do: <job>" controls (hotkeys 1–3) on their own row; status "Three
jobs. Sequence them on the board first if you want to, or start any job
directly." The FIRST job press — runnable or not — records the board as
it stands (`plan_snapshot`: slots, `planned_jobs`, `plan_order`,
`plan_dependency_violations`, `held_returned`) and locks it (a lifted
card returns to the packet unplaced); a job whose printed requirement is
not done is refused with "<job> needs <requirement> first."
(`dependency_error` — job correctness, never a planning count); a press
inside the 400 ms settle window after a job is refused
(`work_press_refused`); all three jobs done completes the window. Family
`proto_m01_batch_`(events:`presented`, `opportunity*opened`,
`card_lifted`, `card_placed`with the board state,`card_returned`,
`plan_snapshot`, `job_done`with`step`, `planned_position`,
`followed_plan`, `dependency_error`, `work_press_refused`,
`surface_closed`, `surface_reopened`, `window_closed`,
`technical_failure`only as the reload marker). Closure: ESC / Leave
pauses (fail-forward, reopening resumes; no timers); the review completes
an open batch whose snapshot exists (a complete observation with the jobs
recorded as they stand) and censors one left before any job press (no
observation — distinct from a valid choice not to plan); never opened ⇒
absent; a batch opened in an earlier page load is never re-run. Formula`m01_planned_jobs`= Σ`planned_jobs`over occasions with a snapshot / 3 ×
those occasions (planned denominator 6;`incomplete`with one observed
occasion; the closure's count cross-checked against the`plan_snapshot`event — disagreement ⇒`technical_failure`); `null`with`voluntary_stop`when every opened batch was left before any job press,`declined`when
named on the route but never opened,`not_presented`before,`interrupted`after a reload (also when one occasion was held back, the other's value
kept),`pending`while a batch is open; components: occasions observed /
opened-unobserved / declined / interrupted, planned by occasion,`snapshot_agrees`. Companion `m01_plan_structure`(per occasion: form,
planned jobs, plan order, plan dependency violations, adherence of the
executed order to the plan, execution order, jobs done, dependency errors,
placements;`{declined}`/`{pending}`/`{interrupted}`markers, null
when never presented). Extractor`src/measurement/features/m01.ts`; tests
`e2e/m01_batches.spec.ts`(5 pure) and`e2e/m01_batches_route.spec.ts`
(browser, 1: batch 1 with one pointer placement then keyboard work, a
blocked first press, the lock, completion; the full route to the return
shift; batch 2 opened from the board's beat and worked directly by
keyboard; the sign-off unaffected; offline reproduction 1 / 6). The v2
six-card board (`proto_m01_board*\*`, one occasion, commit gated on a full
board) is retired from the route; its family keeps its v2 meaning in the
ledger. Limitations: a job is a single press (work is nominal), so the
cost of sequencing first is only the placements themselves; the two
batches share one interface, so interface preference is a shared rival;
the board's optionality is stated once in the status line; the first
press of a blocked job is the first work action by design (owner question
§5.37).\_

_Unit 6 (M05): as-built — two explicitly accepted extra jobs. Occasion
`o1` (window `m05_start_o1`, opportunity `proto_m05_start_o1`, Concourse,
episode 1): Vale's reading-desk lamp connector at the existing reading-desk
lamp station (`concourse.reading_desk_lamp`, 124,240; approached from the
east), offered by a dedicated stage at the END of the handover chain
(after the watch offer, the delivery offer and — when accepted — the
standardised interruption): "Vale: One small extra job, if you want it —
the reading-desk lamp connector has worked loose (the reading table,
south-west corner). It takes a moment at the lamp. Will you take it?" with
"Yes — I will take the lamp job." (option 1) / "No — leave the lamp job."
(option 2). Occasion `o2` (window `m05_start_o2`, opportunity
`proto_m05_start_o2`, Recovery Yard, episode 4): Noor's loose guy-line flag
at the existing cable-flag station (`yard.cable_flag`, 1124,578), offered
by a matching stage right after any of the three "Ready" options
("…the guy-line flag on the airlock apron has come loose (east of the
supply crate)…"; "Yes — I will take the flag job." / "No — leave the flag
job."). Both stages refuse a press inside a 400 ms settle window
(`M05_SETTLE_MS`; `offer_press_refused`, the stage re-presented in place,
`offer_represented`). Family `proto_m05_start_`(events:`presented`once
at the first presentation,`offer*represented`, `offer_press_refused`,
`offer_answered`with`accepted`, `option_position`, `offer_latency_ms`,
`opportunity_opened`at the answer (accepted OR declined — a decline opens
and completes the window outside the set, M11 precedent),`eligible`with`wait_before_eligible_ms`and`distance_px`, `control_presented`(the job
surface opened before the decision;`view`, `focused_ms`),
`press_refused`(a press inside the surface's settle window),`started`with`latency_focused_ms`, `latency_wall_ms`, `excluded_ms`by cause,`control_views`, `deferred`, `cap_reached`, `exited`with`detail`room_left / shift_ended,`late_start`with`after`and`since_closure_ms`, `work_completed`with`late`, `surface_closed`,
`surface_reopened`, `window_closed`, `technical_failure` only as the
reload marker). Eligibility and the clock: after acceptance the scene
polls every frame (`pollM05`); the focused clock (`FocusedClock`,
registered with the focus monitor for `focus_loss`/`hidden`) STARTS at
the first poll with no block — no prompt panel, typewriter or transition
(`physicalInputEligible`), no timed world action, and the host scene not
paused under another surface or overlay (scene PAUSE / RESUME hooks) —
so the M09 / M10 offers and the interruption that follow Vale's briefing
hold it unstarted; once running it PAUSES under `unusable_controls`(prompt / paused host) and`animation_lock`(world action) and resumes
when the block lifts; the job's own surface is never a block. Start
control: the station opens "READING-DESK LAMP" / "GUY-LINE FLAG" ("Job:
reseat the lamp connector. Start when you are ready, or not now.") with
"Start the job (S)" and "Not now (N)" on one row and "Leave (ESC)" apart;
Start is the first work action (latency = focused ms since eligibility;
the clock stops; a standard 2 FOCUSED-second work cycle`M05_WORK_MS`runs on the surface — "Reseating the connector…" → "Connector reseated."
— paused by a closed surface,`work_completed`completes the window);
"Not now" closes the occasion as`deferred` (`voluntary_stop`, exposure
recorded, latency null; the surface closes with "Noted."); leaving the
room through any door, or Noor's shift end, closes an unstarted accepted
occasion as `exited` (`route_departure`) and a started one keeps its
latency with the work cycle as it stands; 60 focused seconds without a
start close it as `cap` (`cap`, censored, latency null — silent: no
countdown, no message); a start after any closure is a LATE START
(companion `late_start`, the work runs, the primary never rewritten; "Not
now" is not offered again); before acceptance (or after a decline) the
stations read "Lamp steady." / "Guy-line flag tied off." and open no
surface; the lamp flicker / flag flap mark an accepted, unfinished job.
Reload guard: an occasion opened (accepted or declined) in an earlier
page load is never re-offered (`guardM05Reload`at zone entry: prior
exposure recorded,`technical_failure`, features `interrupted`). Review:
a never-offered occasion is absent; an accepted, still-open one closes
censored (`interrupted`, kind review). Formula `m05_start_latency`= per
ACCEPTED occasion`{status, latency_focused_ms (started only),
latency_wall_ms, exposure_focused_ms, censored, closure_reason}`— an
object keyed by occasion, never a sum or a mean (the row's`numerator`,
`denominator`and`planned_denominator`are null); cross-checked against
the`started`events (a record claiming a start without its event, or a
start event under another status, is`technical_failure`); row
disposition `observed`when at least one accepted occasion carries a
status,`pending`while an accepted occasion is open (an observed value
beside it kept under`pending`), `declined`when every offered job was
declined,`not_presented`when no offer was made,`interrupted`after a
reload (also when one occasion was held back — the other's value kept);
row`censored`when any occasion is`cap`/`interrupted`/ open;
components: accepted / observed / declined / pending / interrupted
occasions,`status_by_occasion`, `starters`, `non_starters`,
`started_event_agrees`. Companion `m05_acceptance_exposure`(per occasion:
offer presentations and refused presses, answer position and latency,
eligibility and`wait_before_eligible_ms`, `distance_px_at_eligibility`,
exposure focused / wall ms, `excluded_ms`by cause, control views, first
control view, refused surface presses, start input mode, work completion,
late start, closure reason;`{declined}`/`{pending}`/`{interrupted}`markers; null when never offered). Extractor`src/measurement/features/m05.ts`; tests `e2e/m05_start.spec.ts`(7
pure) and`e2e/m05_start_route.spec.ts`(browser, 2: accept with a
carried press refused, the plan board's time excluded, pointer start and
work, flag job accepted → keyboard "Not now" → late start, shift end,
offline reproduction; decline → lamp steady, flag job accepted → 61 s of
inaction →`cap`without a`started` event, late start still offered,
offline reproduction). The v2 silent-fault route (`proto_m05_initiation*\*`,
presented at a quiet moment, censored on departure) is retired from the
route; its family keeps its v2 meaning in the ledger. Limitations: the
work is nominal (one press plus a 2 s cycle), so the only cost of starting
is the walk and the press; the job sites are fixed, so the walking
distance from the briefing is a shared, recorded (`distance_px`)
confound; acceptance is answered on a pre-focused first card (accept
first, fixed order) behind a settle window; the cap is silent (a
participant never learns that a window closed); "exited" folds the room
departure and the shift end into one status with `detail` beside it;
deferral is terminal for the primary (a later start is a companion). Owner
questions §5.43–5.49.\_

_Unit 7 (M06): as-built — the dispatch console's timed work period.
Window `m06_orders_w1`, opportunity `proto_m06_work_period`, Records
Workshop, episode 2, at the existing Dispatch Console
(`workshop.dispatch_console`, 915,170; surface id `m06_dispatch_console`
unchanged); PRESENTED when the Work Order Board's "Take the orders." is
read (the orders list "dispatch lines"). Family `proto_m06_orders_`(events:`presented`, `opportunity*opened`, `token_pressed`,
`token_refused`, `line_typed`, `buffer_cleared`, `reference_consulted`,
`practice_dispatched`with`matches_reference`, `practice_passed`,
`ready_shown`, `press_refused`(a Begin press inside the ready screen's
400 ms settle window),`period_begun`, `order_presented`with`order_index`and`focused_ms`, `order_dispatched`with`order_index`,
`line`, `correct`, `attempt`, `focused_ms`, `within_budget`,
`unique_correct_orders`, `order_skipped`, `stopped`, `period_ended`with`stop_kind`, `surface_closed`, `surface_reopened`, `window_closed`,
`technical_failure` only as the reload marker). Procedure: the two v2
practice lines unchanged (tokens; each sent correctly once — the
criterion, never scored) → the READY screen ("Practice complete. The
work period is 60 seconds of console time. Orders arrive one at a time —
send each as it reads. Leaving the console pauses the period."; "Begin
the work period (B)") → the work period: one FOCUSED 60 s budget
(`M06_BUDGET_MS`, `FocusedClock` registered with the focus monitor;
paused by a closed surface and by focus loss / hidden), twelve orders one
at a time in the assigned form order (`form_a`= twelve distinct lines,
every token three times;`form_b` = a fixed permutation of the same
twelve — matched content; assignment by session hash), the current order
shown with its index ("ORDER 3 of 12 · SET PUMP-2 HIGH"), a tally ("SENT
CORRECTLY: n") and "TIME LEFT: n s"; Dispatch (D) compares the buffer
with the current order — a match counts the order once and presents the
next, a mismatch reads "Does not match order n. Correct it or skip it."
and leaves the order for correction (a further dispatch is rework); "Skip
order (K)" moves on without credit (never revisited); Clear (X); "Stop
work (F)" ends the period early; no send animation (a dispatch is
instant). Closure: the budget end (`stop_kind: budget`, closure
`completed` — the budget is checked before any dispatch or skip, so
nothing lands past it), the explicit stop (`explicit`, `voluntary_stop`,
denominator unchanged), all twelve handled (`all_orders`, `completed`); a
buffer left unsent at the end is discarded (`buffer_discarded_at_end`);
ESC / Leave pauses the budget and the reopen resumes it (the return shift
included); the review censors an open period with the count as it stands
(`review`, `closed_at_review`) and marks a never-opened console absent; a
console opened in an earlier page load is never re-run (prior exposure,
`technical_failure`, features `interrupted`). Formula
`m06_unique_correct_orders`= distinct orders with a correct dispatch
whose`focused_ms ≤ 60 000`(recounted from the`order_dispatched`events;
a record that disagrees ⇒`technical_failure`, `recount_agrees`exported);`null`with`no_eligible_event`when the work period never began
(practice not passed or the ready screen left;`censor_reason: work
period never begun`), `declined`when listed by the board but never
opened,`not_presented`before,`interrupted`after a reload,`pending`while open; a review-closed open period keeps its value under`observed`with`censored: true`; the row's `numerator`is the count,`denominator`null (the 60 s budget is the fixed denominator, stated in`components.budget_ms`). Companion `m06_work_period_detail`: first-pass
correct / attempted (`first_pass_accuracy`, null when nothing attempted),
rework dispatches, invalid dispatches, skipped, orders attempted /
handled, actual stop focused ms, stop kind, practice attempts, refused
presses, token presses, clears, reference consults, typed lines, the
discarded buffer, per-order records. Extractor
`src/measurement/features/m06.ts`; tests `e2e/m06_orders.spec.ts`(6
pure) and`e2e/m06_orders_route.spec.ts` (browser, 2: practice by
pointer, Begin by keyboard, a correct order, a wrong-then-corrected order,
a skipped order, ESC holding the budget, the explicit stop, sign-off
unaffected, offline reproduction; budget end by inaction ⇒ observed 0).
The v2 four-line task (`proto_m06_dispatch*\*`, no budget, 1 s send
animation excluded) is retired from the route; its family keeps its v2
meaning in the ledger. Limitations: the orders are three-token lines on
one console, so "useful output" is sampled by one routine; a visible
time-left readout and a skip control are pilot defaults with rival
readings (speed pressure; strategic skipping); the practice criterion has
no comprehension claim beyond two correct lines; typed entry remains
optional in the model only (no surface control; `typed_lines`is 0 on
the route). Review fixes (U7): digit hotkeys 1–4 on the active token row
and`dispatch_input_modes`/`practice_wall_ms` recorded; Stop work is two
presses on Q with a 3 s confirm window (`stop_armed`/`stop_disarmed`);
a Skip inside the order's 400 ms settle window is refused; Back (Z)
removes one token (`token_removed`); the last dispatch stays readable;
`all_skipped`is its own stop kind (voluntary closure); a review-closed
open period is`incomplete`with its exposure; the companion is null
with a technical-failure primary; the ready screen shown and Begin never
pressed is`declined`; the recount re-checks every dispatch line against
the form; the budget end clamps the tick overrun
(`budget_overrun_ms`); resumptions carry the route stage and the entry
snapshot the other Workshop items' window states. Owner questions
§5.56–5.73.\_

_Unit 8 (M12): as-built — two quality packets of three checkable fields.
Occasion `o1` (window `m12_check_o1`, Concourse, episode 1): the storm
delivery supply manifest on the north-east work table, presented by Vale's
briefing ("Understood." — beside the M01 presentation); occasion `o2`
(`m12_check_o2`, Records Workshop, episode 2): the bench-run calibration
tag sheet on the reception desk, presented by the Work Order Board's "Take
the orders." (beside the M06 presentation). Each product has three fields
(o1 quantities: fuse contacts 12, wire spools 24, sample vials 10; o2 the
four serial digits after "CB-": 2041, 3178, 2609) and exactly ONE fault of
matched salience — one digit differs, by the same amount within a product
(o1 +3 on the last digit: 24→27 form A, 10→13 form B; o2 −5: 3178→3173
form A, 2609→2604 form B) — at index 1 (form A) or 2 (form B), the form
drawn per occasion from the session id (`m12_check_<occasion>_form`). The
surface (`m12_qc_packet_o1`/`o2`, unchanged ids and stations) shows
each field's printed value with its reference HIDDEN ("Packing list: —" /
"Bench register: —") until that field's Check (hotkeys 1–3); the check
reveals the reference (`field_checked`, `reference_revealed: true` — a
view is never a detection) and asks the explicit judgement "Matches" (M)
/ "Differs" (D) (`field_judged`with`judgement`, `judgement_correct`,
`faulty_field`, `latency_ms`); a press inside the 400 ms settle window
after the reveal is refused (`press_refused`, `reference_settling`); the
first judgement is final; a wrong judgement is still a check. One field at
a time: while a judgement is pending or the keypad is open the other Check
controls rest (disabled, no hotkey) and the model refuses them
(`judgement_pending`/`keypad_open` — reachable in the model only).
"Differs" opens a keypad (digits 0–9 with digit hotkeys, Back Z, Clear X,
Cancel C, Confirm V — or ENTER, since Confirm takes focus exactly when the
entry is full); the confirmed value is compared with the reference and
never copied (`correction_entered`with`entered`, `reference`,
`correct`); Cancel abandons without a correction (the "differs" judgement
stands, `correction_abandoned`); the keypad may be reopened
("Correct (n)") until one correction is entered (one per field). "Release
packet" (R) is available throughout and closes the occasion with the
fields as they stand (`released`, window `completed`; an open keypad
counts as abandoned) — an unchecked release is a valid observed 0/3.
Focus discipline: a revealed reference is focusable with a neutral logged
activation (`reference_reread`) and precedes every control, so focus never
lands on a judgement control and repeated ENTER never judges. Leave (ESC
or the button, one path) pauses the window and keeps the packet open
(`surface_closed`/`surface_reopened`, no timers); the review censors an
open packet (`closed_at_review`, never a zero) and marks a never-opened
one absent; a packet opened in an earlier page load is never re-run
(prior exposure, `technical_failure`, features `interrupted`); opening the
second packet records the first as prior exposure
(`exposure:proto_m12_check_<other>_before`); the entry snapshot carries
the route stage and the neighbouring windows' states (o1: M01 batch 1,
M14 desk; o2: M02 case workspace, M04 debris, M06 orders, M07
calibration). Formula `m12_fields_verified`= Σ fields judged over the
RELEASED products / 6 (planned denominator; one released product ⇒`incomplete`on 3; recounted from the distinct`field_judged`field ids
per occasion — a record that disagrees ⇒`technical_failure`on both
rows,`recount_agrees`exported);`declined`when presented and never
opened,`not_presented`before,`interrupted`after a reload or a
held-back occasion,`pending`while a packet is open with nothing
released,`no_eligible_event`when every opened packet was closed without
a release; a released product beside a review-closed one is`incomplete`and`censored`. Companion `m12_detection_and_correction`
(per product: fields checked / judged, judgements correct, judgement
accuracy, faulty field checked / judged, fault detected, correction
attempted / successful (`null`when not attempted), unnecessary
corrections, actions, per-field records with judgement latency, refused
presses, keypad openings, abandoned corrections) — null with the primary.
Extractor`src/measurement/features/m12.ts`; tests `e2e/m12_check.spec.ts`(5 pure) and`e2e/m12_check_route.spec.ts` (browser, 1: packet 1 checked
by pointer and digit hotkeys, references hidden until checked, ENTER after
a check re-reads and judges nothing, judgements by M / D and pointer, the
faulty field corrected on the keypad — 0 typed and removed with Back, the
reference typed, Confirm focused and ENTER — released by R; packet 2 left
by the pointer button, reopened, released unchecked; offline
reproduction 3/6 with the detail apart). The v2 six-line packets
(`proto_m12_qc_\*`: reference always shown, opening a line = detection,
auto-copied correction) are retired from the route; the family keeps its
v2 meaning in the ledger. Limitations: two-digit quantities and four-digit
serials differ in difficulty and are confounded with the fixed order o1
then o2; the fault is never in the first field and about half of the
participants meet it at the same index twice (forms drawn per occasion);
checking costs more presses than releasing (inherent to the approved
design); the count of judged fields is stated at release; a completed
occasion is discarded after a reload (§5.14). Owner questions §5.74–5.86.\_

_Unit 9 (M17): as-built — the Training Rig's sixteen-trial learning
series (window `m17_trials_w1`, Diagnostics Laboratory phase 3; DEV
"Syntax Trainer" in the Information Processing Lab; station, verb and
position unchanged; registry window id `m17_trials_w1`). Structure: the
demonstration (three worked examples, one per operator VEK / ZOR / KAI)
→ READY → BASELINE 1–2 (START and GOAL shown, no NOW preview, no
feedback; SUBMIT records and moves on) → LEARNING 1–12 (START / NOW /
GOAL preview with a per-slot match marker; SUBMIT records the FIRST
response and shows "Register matches GOAL." or "Register does not match
GOAL. Reference sequence: X ; Y."; NEXT continues, the reading time
recorded as `feedback_read_ms` and paused while the panel is left; all
twelve run whatever the attainment) → TRANSFER 1–2 (no preview, no
feedback) → "All sixteen trials recorded." (window `completed`). One
submission per trial: SUBMIT requires EXACTLY two operators (an empty or
one- / three-plus-line buffer is refused without a record —
`submit_refused` with `empty_buffer` / `line_count`); stage words typed
out of stage are refused without a syntax error; REFERENCE (button or
typed) reopens the worked examples (counted); HELP as before. Forms: form
A written out (baseline: ZOR+VEK, ZOR+KAI; learning: VEK+ZOR, ZOR+KAI,
VEK+KAI, ZOR+VEK, KAI+ZOR, VEK+VEK, ZOR+KAI, VEK+ZOR, KAI+VEK, ZOR+ZOR,
VEK+KAI, ZOR+KAI; transfer: VEK+ZOR, ZOR+ZOR); form B derived by a slot
relabelling (A→C, B→A, C→B) and token relabelling (RED→GRN, GRN→BLU,
BLU→RED), so operator mix per trial, two-operator necessity and goal ≠
start are shared by construction; no case is solvable with one operator;
every baseline and transfer probe changes all three slots (an exchange is
needed — no slot-by-slot copy of GOAL solves it) while two-slot learning
items remain copyable within two operators; no transfer pair or goal
recurs from the learning series (pure-tested). Telemetry
`proto_m17_trials__`: `window*opened`/`window_reopened`/`panel_left`, `ready_acknowledged`, `phase_started`, `trial_started`(start, goal, preview, feedback flags),`command_added`/`command_refused`/`line_removed`/`buffer_cleared`, `submit_refused`,
`trial_submitted`(the whole trial record +`submit_input_mode`),
`feedback_presented` (`reference_shown`), `feedback_acknowledged`
(`read_ms`), `criterion_run_reached`(the raw fact of the first run of
three — recounted by the extractor),`demonstration_viewed`,
`help_consulted`, `completed`/`stopped`/`technical_failure`(the
raw summary),`entry_state_flagged`. Closure: STOP (confirmed) closes
`exited`— the IP framework's`participant_absent`validity mapping
stands (§5.93) while the FEATURE follows §5.1; ESC leaves the panel with
the trial or the feedback open (active and reading time paused); the
orientation gate flags an invalid entry state as before. Formula`m17_criterion_trial`= {criterion_trial, attained}: the first learning
trial ending three consecutive correct first responses, recounted from
the`trial_submitted`events (a module record that disagrees, or a
record without phase or outcome ⇒`technical_failure`on both rows;`recount_agrees`exported); attained ⇒`observed` (`numerator`= the
trial,`included_ids` the learning trials up to it), even after an early
exit (`complete_sequence: false`); twelve responses without attainment
⇒ {12, false} `observed`+`censored`; fewer without attainment ⇒
`incomplete`(null, not censored, partial sequence in`components`);
`pending`while open; a series left open at the record closure ⇒`incomplete`; never opened ⇒ `not_presented` (`interrupted`after a
reload). Companion`m17_sequence_baseline_transfer`: the three
first-response sequences, `feedback_exposures`,
`reference_sequences_shown`, help consults, demonstration reviews,
`complete_sequence`, per-trial records — never combined with the pair.
Extractor `src/measurement/features/m17.ts`; tests `e2e/m17_trials.spec.ts`(4 pure) and`e2e/m17_trials_route.spec.ts`(browser, 2: the full series
with the run of three at learning trial 4, typed and pointer input, the
demonstration reviewed, offline reproduction; an early stop after two
learning responses ⇒`incomplete`, an empty / one-line SUBMIT refused, a
stage word refused without a syntax error). The v2 rig (one practice
case with three attempts and a live preview, one transfer case,
`proto_m17_syntax\*_`) is retired from the route; its family keeps its v2
meaning in the ledger. **Review verdict (scientific stand-in): blocked
pending a research-owner decision** — the live NOW preview on learning
trials (a first response can be verified before SUBMIT) and the
definition of a correct response (goal reached with any command count vs
exactly two) may make the criterion a checking measure with a ceiling at
learning trial 3; the unit follows the literal matrix / register wording
and routes both to the owner (§5.87–5.88). Limitations: the demonstration
precedes the baseline (uncoached = no preview / feedback, not
uninstructed); REFERENCE and HELP stay available during the probes; phase
names are shown; two-digit register lines and sixteen trials with twelve
acknowledgements may fatigue; difficulty differs across phases and the
fixed order shapes where a run of three can end. Owner questions
§5.87–5.99.\_

**Unit 14 (M03): as-built** — two press occasions of three tools each.
Opportunities `proto_m03_tools_a` (window `m03_tools_o1`, Label Press A,
restoration shift, episode 2) and `proto_m03_tools_b` (window
`m03_tools_o2`, Label Press B, return shift, episode 5), Records
Workshop; the two stations, their registry ids (`workshop.press_a` /
`workshop.press_b`), positions, labels, guidance order and schedule
(Press A before the return, Press B from the return shift on; "No batch
scheduled on this press right now." otherwise) are unchanged. Presented
by the Work Order Board's "Take the orders." (occasion A, beside the
M02 / M06 / M12 presentations; the board lists "press batch A") and on
entering the Workshop once the press can run — from Vale's check-in on
(occasion B, beside the M07 / M20 / M21 / M22 presentations). Family `proto_m03tools_` (events
`presented`, `surface_opened`, `practice_presented`, `practice_move`,
`practice_completed`, `run_refused`, `press_cycle`,
`opportunity_opened`, `tool_moved`, `move_refused`, `first_departure`,
`state_at_system_close`, `surface_closed`, `window_closed`,
`technical_failure`); every event carries the occasion tag (`o1` /
`o2`), its own opportunity and window id, the object
(`m03_press_bench_a` / `_b`) and the fixed starting condition as its
form. Objects (inventory namespace `m03t`, bound to it — never in the
player's inventory, not droppable, not discardable, not sortable): three
tools — Platen Brush, Alignment Key, Feed Gauge (the same kinds on both
presses, own instances per occasion) — and one Label Roll; per occasion
a WORK SURFACE (4 × 2), a TOOL RACK (3 × 1), a ROLL SUPPLY slot and a
PRESS FEED slot; tools fit the surface and the rack only, the roll the
supply and the feed only. The panel (overlay mode `m03tools`, "LABEL
PRESS A / B — WORK SURFACE"): the LABEL PRESS box carries one line for
the activity as it stands. THE TAUGHT MOVEMENT (on every occasion): "Load
the press: move the label roll from ROLL SUPPLY to PRESS FEED. /
Keyboard: SPACE lifts it, RIGHT ARROW moves to the feed, SPACE sets it
down. / Pointer: drag it." — the roll holds the first focus; the move
uses the commands every other object of the panel uses
(`practice_move` with origin, target and input mode;
`practice_completed` once, with the moves it took and its input mode).
RUN PRESS CYCLE (the button, or C) is refused and says "Load the label
roll first." while the roll is not in the feed (`run_refused`, in both
input modes); three cycles finish the batch (`press_cycle`); the roll
is threaded from the first cycle on and no longer moves ("The roll is
threaded into the press.", `move_refused`). With the third cycle the
line reads "Press run complete. Batch logged and sent to stores." and
the three tools lie at fixed slots of the work surface (brush 1, key 4,
gauge 6); the rack is visible and empty from the first open and nothing
names it. REACHABILITY is checked per tool when the tools appear — the
tool lies at its slot, the rack accepts it and has room for all three —
and recorded in the entry snapshot (`reachability`); a tool that fails
makes the occasion a technical failure (excluded, never tools left
out). The window opens (`opportunity_opened`, entry snapshot with the
route stage and the neighbouring windows' states) when the tools lie
out. Tools move by drag / drop or by the keyboard (`tool_moved` with
origin and target container and slot, `to_home`, the input mode of the
placement and the focused time); TAB / SHIFT+TAB jump the focus to the
next / previous tray — with an object lifted, to the next tray that has
a slot for it, landing on that slot. FIRST DEPARTURE: the participant's first close of the panel (ESC,
I or X) with the tools out — `first_departure` records every tool's
container and slot, `tools_restored` (tools in the rack), the moves, the
focused / wall / excluded exposure and `exposure_sufficient` (focused
exposure ≥ 2000 ms — recorded, never invalidating), and the window
completes; the occasion is terminal ("Label press idle. The batch is
done."), so no later state exists. A panel closed BEFORE the run is
complete keeps the roll and the cycles (`surface_closed`) and records
no observation. A panel closed by the SYSTEM with the tools out is not
a departure: its state is recorded apart (`state_at_system_close` with
`close_reason`) and never becomes a value — a stop of the panel is a
technical failure (`technical_failure`, the occasion excluded), a
closure by the review censors the window (`closed_at_review`). Neither
arises on the ordinary route. Closure at the review: a never-completed
occasion is absent. Reload: an occasion whose tools lay out in an earlier page load
is never re-run (prior exposure, `technical_failure` marker, features
`interrupted`); a panel merely opened in an earlier load is recorded as
prior exposure and run. Formula `m03_tools_restored` = Σ tools in the
rack at the first departure over the observed occasions / 6 planned;
the exported denominator is 3 × the observed occasions. RECOUNTED per
occasion from the `tool_moved` events that lie between
`opportunity_opened` and `first_departure` and compared with the
snapshot tool by tool; a departure without the tools' appearance before
it, a wrong tool in the record or a wrong count ⇒ `technical_failure`
for the whole row (one disagreeing occasion voids the row). Both
observed ⇒ `observed` (every tool left where it lay is an observed
0); one ⇒ `incomplete` with the value on 3; none ⇒ null —
`interrupted` (a held-back occasion, or every tools-out panel closed by
the review), `technical_failure` (unreachable tools, a stopped panel),
`no_eligible_event` (a panel opened, its run never completed),
`declined` (listed, never opened), `not_presented` (`interrupted` after
a reload); tools out and the panel still open at export ⇒ `pending`; a
held-back occasion beside an observed one ⇒ `interrupted` with the
value kept and `censored`; an occasion closed by the review beside an
observed one ⇒ `incomplete` with the value and `censored`. After a
reload an occasion without evidence in the current load — one not yet
reached included — reads as held back (the M01 rule: its evidence may
lie in an earlier load).
Companion `m03_object_states` (per occasion: status, the tools'
records, moves, exposure, the departure's input mode, reachability, the
route stage at the open, the taught movement and its input mode, press
cycles, panel opens; a system-closed occasion keeps
`tools_in_home_at_system_close` apart). Pure model
`src/pilot/windows/m03RestoreModel.ts`, adapter
`src/pilot/windows/m03ToolRestore.ts`, extractor
`src/measurement/features/m03.ts`; tests `e2e/m03_restore.spec.ts` (8
pure) and `e2e/m03_m04_route.spec.ts` (browser: Press A partly restored
by pointer in test 1; Press A untouched and Press B fully restored by
keyboard with TAB in test 2). The v2 five-residual route (`proto_m03_*`,
`proto_m03_reset_a` / `_b`, `m03_reset_o1` / `o2`) is retired from the
route; it keeps its v2 meaning in the ledger and stays, untouched, with
the Inventory Lab workstation (`src/inventory/m03Reset.ts`, overlay mode
`m03`, namespace `m03`). Limitations: three tools in one rack are a
small, highly visible set — the count will sit near 0 or 3 for many
participants and the two occasions repeat the same panel (episode 2 and
episode 5), so the second is not naive; the rack's name and its three
empty slots are the home's only marking (cue salience is a rival
explanation); restoring by keyboard costs 12 key presses with TAB and SHIFT+TAB (16 with TAB alone)
and restoring by pointer three drags — the input mode is exported and
the effort is not matched; the panel is modal, so the departure is a
deliberate close and an ESC pressed right after the tools appear is a
departure with `exposure_sufficient: false`; the taught movement is a
required step, so a participant who cannot make it never reaches the
observation (`no_eligible_event`); reachability is checked on the model,
not on rendered pixels; the panel's text is small at 800 × 600 (body
about 9 px); the window kit's own lifecycle events carry no protocol
stamp, as in every earlier unit; the reload marker is recognised by the
wording of its `detail`, as in M02. Owner questions §5.162–5.167,
§5.175–5.180, §5.187–5.190.

**Unit 14 (M04): as-built** — two cutting jobs of three pieces each.
Opportunities `proto_m04_cutting_o1` / `proto_m04_cutting_o2` (windows
`m04_cutting_o1` / `m04_cutting_o2`), Sample Cutter, Records Workshop,
episode 2; the station, its registry id (`workshop.sample_cutter`), its
position, the scatter origin, the disposal bin and the six piece places
are unchanged. The Work Order Board lists "two sample coupons"
(`listed`, an exposure record at "Take the orders."); a job is
presented and opened by its CUT — the pieces are created by the cut, so
a job never run is not presented. Family `proto_m04_cutting_` (events
`listed`, `presented`, `opportunity_opened`, `job_run`,
`press_refused`, `job_unavailable`, `piece_picked_up`,
`piece_put_back`, `piece_disposed`, `late_disposal`,
`first_departure`, `state_at_review`, `window_closed`,
`technical_failure`); every event carries the job (`o1` / `o2`), its own
opportunity and window id and the object `m04_sample_cutter`. Pieces:
one coupon offcut, one swarf tray and one blade wrap per job at fixed
places (offsets from the scatter origin 344, 224 — job 1: offcut −28,
44 · swarf −8, 64 · wrap 52, 0; job 2: offcut 28, 44 · swarf 52, 60 ·
wrap −64, 8; recorded in the entry snapshot as `piece_offsets`); the
six places are those of the v2 scatter, shared between the jobs so that
the summed straight-line distance to the bin is matched (440.5 px and
444.3 px; piece by piece 179 / 165 / 97 px against 124 / 108 / 212 px).
Procedure: SPACE / E at the cutter cuts the waiting coupon — "Sample
coupon 1 of 2 cut. The cutter re-arms while you work another order." /
"Sample coupon 2 of 2 cut." (the same line for everyone at the cut;
never a word about the pieces) — `opportunity_opened` (entry snapshot
with the route stage and the neighbouring windows' states) and
`job_run` (the job's pieces, the earlier pieces still lying, a piece
carried at the cut). A press at the cutter inside 1.5 s of a cut is
refused and recorded (`press_refused`, `cut_settling`) — a repeated or
carried press never acts on the pieces. Pieces are carried one at a
time: a pointer click on a piece within 96 px of the avatar, or SPACE /
E, lifts the nearest piece within 64 px; a click on the bin, or SPACE /
E with the bin within 96 px, drops the carried piece into it
("Disposed." in both input modes). WHERE a press acts on a piece: at the
cutter when no coupon is waiting; on open floor, unless a supply bundle
in reach lies nearer (the press then collects the bundle the prompt
names); and at ANOTHER station while a job is open, when a piece of
that job — or, with a piece carried, the bin — lies nearer the avatar
than the station (the station is then not opened; leftover pieces of an
earlier job never intercept a station; the rule covers the stations of
the first shift — the Work Order Board and the return-shift stations
open directly, no job being open beside them). `piece_picked_up`,
`piece_disposed` and `late_disposal` carry the input mode, the focused
time and the `origin` of the act: `pointer`, `cutter_press`,
`open_floor_press`, `station_press:<id>`. A lifted piece
cannot be set down: it is carried until it is disposed of or the room
is left (`piece_put_back`, system). FIRST DEPARTURE of a job: the first
time the participant turns to other work after its cut — any other
station is opened (`other_station` with the station's id; a station
that answers with a refusal and the Work Order Board included), or the
room is left (`room_exit`) — `first_departure` records the disposed
pieces, the carried piece of that job (counted undisposed), the pieces
lying, `undisposed_at_departure`, the focused time to the first
disposal and the focused / wall / excluded exposure, and the window
completes. THE SECOND COUPON becomes available only after the first
job's departure; until then the cutter answers with the re-arm line
(`job_unavailable`, `job_open`) when no piece is in reach; the beacon
leaves the cutter at the cut and returns once the second coupon is
available. A piece disposed after its job's departure is a
`late_disposal` and changes nothing. Once the second coupon is
available a press at the cutter cuts it — also with a piece carried or
a leftover piece in reach (`carrying_at_cut`, `earlier_pieces_lying`).
The cutter cuts while the route stage precedes the return
(`return_hub`): before the orders are taken and after the sign-off
included, the stage exported with each cut; from the return on it
answers "No cutting scheduled on the cutter right now."
(`job_unavailable`, `not_scheduled`). A job whose
pieces cannot be drawn is a technical failure (excluded). A job still
open at the review was not departed from: `state_at_review`, the window
censored; a job never run is absent. Reload: once an earlier page load
holds a cut, neither job is run in the new load (prior exposure,
`technical_failure` marker, features `interrupted`). Formula
`m04_undisposed_pieces` = Σ (3 − pieces disposed before the first
departure) over the observed jobs / 6 planned, a carried piece included;
the exported denominator is 3 × the observed jobs. RECOUNTED per job from
the `piece_disposed` events of that job's own pieces that lie between
its `job_run` and its `first_departure`, and compared with the snapshot
piece by piece (the disposed ids, the count, the carried piece, the
pieces lying); a departure without its cut or any disagreement ⇒
`technical_failure` for the whole row. Both observed ⇒ `observed`
(every piece disposed is an observed 0); one ⇒ `incomplete` with the
value on 3; no job run ⇒ null `not_presented` (`cutter_listed` in the
components; `interrupted` after a reload); a cut without its departure
at export ⇒ `pending`; every job run closed by the system or held back
⇒ null `interrupted` (censored); unreachable pieces ⇒ null
`technical_failure`; a job closed by the review beside an observed one
⇒ `incomplete` with the value and `censored`; after a reload a job
without evidence in the current load reads as held back, and beside an
observed job the row is `interrupted` with the value kept (the M01
rule). A pick-up issued by a press at another station, and a disposal
before the departure that such a press issued or that followed such a
pick-up, are COUNTED like any other and flagged beside the value
(`pickups_by_station_press`, `disposed_by_or_after_station_press`).
Companion `m04_job_values` (per job:
status, undisposed at the departure and its recount, the state at the
review kept apart, disposed ids, the carried piece, pieces lying, the
closing trigger and its station, the route stage at the cut, the focused
time to the first disposal, exposure, pick-ups with their origins,
put-backs, refused presses, later disposals, the cut's input mode; null
with the primary's disposition when no job has a record). Pure model
`src/pilot/windows/m04CuttingModel.ts`, adapter
`src/pilot/windows/m04Debris.ts`, extractor
`src/measurement/features/m04.ts`; tests `e2e/m04_cutting.spec.ts` (7
pure) and `e2e/m03_m04_route.spec.ts` (browser, test 1: coupon 1, a
repeated press refused, a disposal by pointer, a press beside the
Component Locker lifting the nearer piece while the locker stays shut,
that piece carried at the departure by another station, two later
disposals, coupon 2, a piece lifted at the cutter and disposed by
keyboard, the room left, offline reproduction 4 / 6; test 2: no cutting
on the return shift). The `m04_debris` key in the entry snapshots of
M02, M06 and M12 (and now M03) keeps its name and holds the cutter's
SITE status — `open` while a job awaits its departure, `closed` once
every job that was run has had it, `unopened` before the first cut
(§5.181). The v2 single job (`proto_m04_debris_*`, six pieces, closure
at the first room exit) is retired from the route; its family keeps its
v2 meaning in the ledger. Limitations: the departure rule is an
operational definition — a participant who cuts, reads the Work Order
Board and returns to the pieces is recorded as having left them (the
station is exported with the trigger); the line at the first cut names
"another order" and the beacon leaves the cutter at the cut, so the
departure is cued for everyone alike; the bin stands at the far end of
the cutter island and a piece is carried round it, so disposal costs a
walk of roughly 200–300 px per piece; the jobs are matched on the
distance to the bin, not on the keyboard reach from the approach point
(job 1: about 50 / 59 / 48 px, job 2: 45 / 72 / 68 px against a reach of
64 px), nor piece by piece, nor on the nearness of another station
(two places of job 1 lie beside the Component Locker, one of job 2), and
job 2 follows job 1 in a fixed order; three places lie on painted art
(the wrap of job 1 at the cutter's west end, the swarf tray of job 1 on
the Component Locker's top edge, the swarf tray of job 2 at the
island's edge) and the wrap of job 2 lies among the collectible supply
bundles and resembles a small brass part — whether every piece is
perceived is not established; the line at the first cut is the only
statement that the second coupon comes later — it shows for the shared
2.2 s of every feedback line (74 characters), so its exposure depends on
reading speed, and the second cut has no such line (the two jobs differ
in the cue); a press meant for another station can lift a nearer piece
while a job is open, without a line, and a lifted piece cannot be set
down — carried to the departure it changes nothing (a carried piece is
undisposed), dropped into the bin before the departure it is a counted
disposal (flagged, its origin exported); a keyboard press with a piece
carried and the bin out of reach shows no line where the pointer shows
"Hands full."; keyboard pick-up beside another station works only while
a job is open and only for that job's pieces, so later cleanup by
keyboard is possible at the cutter and on open floor only; leftover
pieces stay visible through the return shift (one place lies 36 px from
Press B's approach point) and the entry snapshot of M03's second
occasion holds the cutter's site status, not the pieces lying; after a
jammed first cut the next cut is announced as coupon 2 of 2; the bin is
highlighted while a piece is carried within its reach (the pointer
layer, unchanged); the job's focused clock keeps running while the
backpack or the map is open; the two jobs are repeated within one
episode and one room (§2b) — never two independent situations; the
window kit's own lifecycle events carry no protocol stamp; the reload
marker is recognised by the wording of its `detail`. Owner questions
§5.168–5.191.

**Unit 13 (M02): as-built** — the case workspace's six retrieval
requests. Opportunity `proto_m02_retrieval_series`, windows
`m02_filing_w1` (the organise phase, up to and including the handover)
and `m02_requests_w1` (the requests), Records Workshop, episode 2; the
station, its registry id (`workshop.case_workspace`), its position and
the overlay mode (`m02case`) are unchanged. Presented by the Work Order
Board's "Take the orders." (beside the M06 and M12 presentations; the
board's list names the case workspace). Entry state: six case bundles of
four visible kinds (S-14, R-07, K-03, I-22, S-15, R-09) on the intake
tray in the form's order (`form_a` as listed, `form_b` reversed), four
empty 2 × 2 trays, six optional tray labels (or none); the entry snapshot
carries the form, the request order, the assigned sequence, the route
stage and the neighbouring windows' states (M04 debris, M06 orders, M07
calibration, M12 packet 2). Organise phase: cases move by drag / drop or
by the keyboard (`case_moved` with the true origin and the input mode of
the placement), labels cycle by the tray's button or L on the focused
tray (`tray_labelled`); organising is optional and nothing is compared
with a designer's arrangement. HAND OVER (the button or C) FREEZES the
layout (`handed_over` with the layout's raw description against the
participant's own labels — case locations, tray labels,
`untraceable_case_count`, `misfile_count`, `duplicate_count`,
`cases_left_on_intake`, `move_count`, `label_changes`); afterwards no
case can be moved (drag, keyboard pick-up, split and discard are all
refused, sort is inert; a drag shows "The layout is fixed after the
handover." and is logged as `layout_change_refused`) and no label
changed. RETRIEVAL CONDITION (owner ruling of 28 September,
§5.137): while a request is open the participant-created organisation is
shown as handed over — every case in the slot it was given, the trays,
the participant's own tray labels at full strength (the label controls
are inert from the handover on and are never drawn dimmed) — and the
system-supplied answer-revealing information is not: every occupied slot
draws one neutral closed-case glyph (the same size, tone and place for
every case) instead of the case's kind icon and code badge, and the
detail area reads "The cases are closed during the requests." wherever
the pointer or the keyboard focus is (no name, code, kind or icon); the
same line is shown once at the handover. Nothing is reorganised,
relabelled or added for the participant. The banner still names the
requested case and says nothing about where it is. The icons and badges
return only with the request record; a workspace that was handed over
and then closed WITHOUT its record (the review, a fault) stays closed
when it is opened again. `contents_concealed: true` on every
`request_presented` and `contents_during_requests: concealed` /
`participant_labels_during_requests: visible` in the entry snapshot are
declarations of the protocol in force, not observations of what was
drawn. The requests: all six cases are requested
once, one at a time, in one of six orders assigned by a deterministic
hash of the session (`m02_request_order`) — a 6 × 6 Williams square, so
across the orders every case stands at every position once and every
ordered pair of cases is adjacent once. The banner reads "REQUEST n OF 6
— <case>: select the slot holding it" (`request_presented` with
`trial_id`, `presented`, `accessible`, `presentation_number`). The
FIRST answer advances the request and is the only one: selecting a slot
that holds a case (a LEFT click, or SPACE / ENTER on the focused slot —
a right-click answers nothing; SHIFT changes nothing) is the answer
whether or not it is the requested case; "CANNOT LOCATE
(N)" is an answer without a selection and is incorrect
(`request_answered` with `answer_kind`, `requested_case`,
`picked_case`, `picked_container`, `correct`, `first_answer`, the
requested case's own container and label, `focused_ms` / `wall_ms` /
`excluded_ms` by cause, `presentations`, `empty_selections`,
`refused_presses`, `feedback_shown: false`). Every answer shows the same
line ("Recorded."). An empty slot is recorded and answers nothing
(`empty_slot_selected`, "Empty slot."); a press inside 400 ms of a
request's presentation is refused and logged (`press_refused`,
`request_settling`) and changes nothing on screen — the line of the
answer just recorded stays and no focus is left behind; no slot is
pre-focused for a request (the focus is cleared at the handover, after
every answer and at a reopen — a keyboard answer needs a deliberate arrow
press first). Each request has its own focused clock from its
presentation to its first answer; it pauses while the workspace is closed
(`surface_closed`) and during a lost focus or a hidden tab. Closing the
workspace (ESC, I or X) keeps the window open
(`surface_closed` / `surface_reopened`); a reopen presents the SAME
request again (`presentation_number` 2, guarded by the settle window) and
never re-seeds the trays. The sixth answer ends the series: the request
record is shown (`feedback_shown` with the record) and the window
completes (banner "REQUESTS COMPLETE — request record below"). The
record is the item's only corrective feedback — per request "n. <code>:
selected <code> — matched", "… — it was in tray n" / "… in the intake" or
"cannot locate — it was in …" (the tray's number, never its label, so a
line is at most 45 characters and fits its column) — factual, without a count,
a total or praise; a closed workspace reopens read-only with the same
record (`feedback_reviewed`). Closure: the sixth answer ⇒ `completed`;
the review closes an open workspace with the answers as they stand
(`closed_at_review`, unanswered requests missing) and marks a
never-opened one absent; a workspace opened in an earlier page load is
never re-run when it is opened again (prior exposure,
`technical_failure`, features `interrupted`) and, when it is only
listed again and not opened, the extractor reads the earlier load's
`opportunity_opened` and reports `interrupted`, never `declined` (the
register's own record is then `participant_absent`, as in the earlier
units); an intake seed failure and a layout that holds none of
the requested cases are technical failures; a single requested case the
frozen layout does not hold is `request_inaccessible` (excluded, never
incorrect — an engine-invariant breach that the route cannot produce).
Formula `m02_correct_first_retrievals` = requests whose first answer is
the requested case / 6 planned requests; the exported denominator is the
requests answered. Recounted from the `request_answered` events with the
correctness recomputed from the requested and the selected case, and
checked PER REQUEST — the requested case against the request's own
`request_presented` event (which must precede the answer) and against
the assigned order at that position, the answer against the window's
per-request record, the inaccessible count against the
`request_inaccessible` events; any disagreement, a second answer to one
request included, ⇒ `technical_failure` (`recount_agrees` exported); six
answered ⇒ `observed`; fewer ⇒ `incomplete` with the value, its
denominator and `censored`; none answered ⇒ null — `no_eligible_event`
when the workspace was never handed over, `voluntary_stop` when it was;
presented and never opened ⇒ `declined`; never presented ⇒
`not_presented` (`interrupted` after a reload); open at export ⇒
`pending` (also at a terminal export without a closure, as in the
earlier units). The time already spent on a request that was presented
and left unanswered at the review is kept in the components
(`open_request_focused_ms`, censored — never the latency of an answer).
Companions: `m02_retrieval_latency` (per request; null with the primary
and with its disposition, `incomplete` with it) and
`m02_filing_layout` (observed once the workspace was handed over and
closed, read from the `handed_over` event itself, whatever happened to
the requests — a record that disagrees about the answers voids the
primary and the latency, not the layout; never handed over ⇒ null with
the layout at closure in the components; a `technical_failure` event or
a reload voids all three rows). Each entry of the latency companion
carries a `status` (`answered`, `presented_not_answered`,
`not_presented`, `inaccessible`); a null latency row is `censored` with
the primary. `move_count` counts
changes of CONTAINER (a rearrangement inside one tray is not logged; a
swap counts both cases); `label_changes` counts steps through the label
list (the list cycles one way), not decisions.
Pure model `src/pilot/windows/m02RetrievalModel.ts`, adapter
`src/pilot/windows/m02CaseWorkspace.ts`, extractor
`src/measurement/features/m02.ts`; tests `e2e/m02_retrieval.spec.ts` (7
pure) and `e2e/m02_retrieval_route.spec.ts` (browser, 1: the ordinary
route from the Dock; organise by pointer drag and by keyboard, labels by
pointer and L, handover by C, a wrong selection by pointer, the
requested case by arrows and ENTER, the banner naming the requested
case at requests 1, 2, 4 and 6, a right-click, a drag and unfocused
SPACE / ENTER answering nothing, the closed-case condition at requests
1, 2, 4 (after the reopen) and 6 — every occupied slot drawing the same
glyph and no code, the pointer resting on a filed case and the keyboard
focus on one naming nothing, no detail icon, the tray labels at full
strength, the organisation equal to the one handed over — the icons and
badges back with the record, every record line at most 45
characters, an empty slot, Cannot locate by N and
by the button, close and reopen inside a request, the record after the
sixth answer, offline reproduction 3/6 with the latencies and the layout
apart). The v2 two-probe workspace (`proto_m02_case_*`: two gated
probes, a wrong pick never advanced, "Not the requested case.") is retired
from the route; the family keeps its v2 meaning in the ledger; the legacy
Inventory Lab filing workstation (`proto_m02_*` events of
`m02Filing.ts`) is untouched. Limitations: with the cases closed a request is answered from the
participant's own organisation — the positions and labels they chose —
and from memory of it, so memory for one's own layout is an explicit
rival explanation of the count, as the ruling states (§5.137); a case
left on the intake tray keeps the place the SYSTEM gave it (the form's
seed order), so for a participant who organised nothing the count is
memory of a system arrangement — `cases_left_on_intake` is exported
for that reason; the six answers are not independent observations — the
six occupied slots stay visible as occupied, each case is requested
once, a blind first selection is right one time in six, slots already
selected can be excluded (after five right answers the sixth is
determined), and two cases filed together by kind tend to be right or
wrong together (§5.161); one press is the answer, so a slip is an incorrect
first answer (§5.139; historical v1 only — U13-C v2 uses confirmation,
§5.210); the request order is assigned by a hash, not an enforced equal
split, and the intake form is drawn independently of it; keyboard answers
cost arrow presses that pointer answers do not, so latencies are not
comparable across input modes (the mode is exported); the window kit's
own lifecycle events (`presented`, `opportunity_opened`,
`window_closed`, `technical_failure`) carry no protocol stamp, as in
every earlier unit; a completed series is discarded after a reload
(§5.14); a keyboard answer costs up to about 22 arrow presses (the focus
starts at the first intake slot with every request and UP / DOWN stay
inside a grid — §5.151); the workspace can be opened before the orders
are taken (the station is always available), in which case no
`presented` event exists and only the snapshot's stage shows it; each
case is requested once, so a later request can tell the participant of
an earlier error before the record — with the cases closed only through
their memory of what they selected (§5.154);
the tray labels mirror the four case kinds and `misfile_count` /
`untraceable_case_count` apply that label-to-kind reading (inherited
from v2, §5.155). Owner questions §5.137–5.161.

_Unit 12 (M24 / M26): as-built — the knowledge boundary of both
inappropriate-persistence assays in the Recovery Yard repaired (windows
`m24_rig_w1` / `m26_uplink_w1`, objects `m24_magnet_rig` /
`m26_uplink_posts`, opportunities `proto_m24_rig_continuation` /
`proto_m26_uplink_continuation`). The mechanics are unchanged: the finite
counterbalanced six-position deck (every committed cycle consumes one
position whatever the timing band; post-depletion pulls empty by
construction; the depletion statement on the panel and the banner) and
the scripted disconnect of Post A after the first successful transmission
(severed conduit, LINE A ✕ OPEN, NO CARRIER; Post B three posts east
always carries) — the disconnect now waits for a Post A transmission
still in flight, so an act begun before the boundary is never classified
after it. KNOWLEDGE is established only by the expected-outcome check
(`outcomeUnderstanding.ts`, one shared model): once the statement has
been displayed (M24) / the disconnect demonstrated (M26), the station's
prompt IS the check and cannot be declined once the station is opened (a
prompt closes only on a selection) — the rig panel (never while a cycle
is still running) carries the statement and the stem "if you run one more
cycle now, what will the magnet bring up?" with three cards (the key
"Nothing — the catchment holds no further recoverable pieces." never
first); Post A (its status line) and the line panel (its notice) carry
the stem "if you transmit a report from Post A now, what happens to it?"
(the key "It does not reach the station — Line A is open, so Post A has
no carrier." never first). Every attempt stage shows the station's own
text above the stem, also when re-presented or reached through Continue.
A press inside 400 ms of a stage's presentation is refused and the stage
re-presented (`understanding_refused`); a right first answer passes
(`pass_first`); a wrong one shows ONE neutral explanation
(`explanation_shown`; its Continue card is settle-guarded too;
`explanation_dismissed`; presentation, dismissal and reading time
stored) that names neither the futile act's availability nor the
alternative, and ONE recheck — the same cards rotated right by one (form
b, the key last) — whose right answer passes (`pass_after_explanation`)
and whose wrong answer fails (`fail`); every presentation is logged with
its source (rig panel / Post A / line panel) and presentation number,
every answer with attempt, form, response, position, key, correctness,
latency (from the last presentation) and the refused presses before it;
the two passes are stored apart and an acknowledgement click no longer
exists; the window's comprehension state follows the check's status. The
line after a decided check is identical for a pass and a fail. A pass
opens the CONTINUATION (`continuation_opened`, with the reports already
delivered for M26): a focused window of `PILOT_SETTINGS.m24_cap_ms` /
`m26_cap_ms` (30 s) registered with the focus monitor, paused when the
yard is left (`unusable_controls`) or the scene pauses under another
surface or an overlay (`explicit_pause`, logged `continuation_paused` /
`continuation_resumed` — the interval may hold other yard work), whose
cap is a censoring event noticed by the scene's per-frame tick
(`cap_reached`; the tick never throws). An act still in flight at the
cap is recorded and never counted: a cycle / a Post A transmission
(`*_in_progress_at_cap`), a bench sort
(`alternative_in_progress_at_cap`), a Post B transmission
(`switch_in_progress_at_cap`). Inside the continuation every act is
classified and nothing is suggested: M24 — a committed cycle is a
post-knowledge cast (`postknowledge_cast`, the first included), the
sorting bench the useful alternative (`alternative_used`, `phase:
postknowledge`), "Finish at the rig" the explicit exit (`exit`); M26 —
a Post A transmission is a post-knowledge retry (`postknowledge_retry`,
the first included; "Transmit: carrier check" is offered once both
reports are delivered; a Transmit press within 400 ms of the post's
opening is refused, `press_refused`, and the post's options shown
again), Post B the switch (`alternative_used`; none is possible once
both reports are delivered), "Finish at the uplink" the exit; "Step
away" inside a continuation is telemetry (`stepped_away`) and closes
nothing. Casts / attempts after the depletion / disconnect and before a
pass are `pre_knowledge`, after a fail `after_fail` — kept as the
declared companions, never post-knowledge (an M26 pre-knowledge attempt
cannot arise on the route: Post A meets the check first). The exit and
the cap close the WINDOW, and with it both posts: a report the brief
listed can stay undelivered (`report_pending_at_close`). Departures
pause the windows and the clocks; Noor's shift end closes a passed
window as it stands (`route_departure`, exit `stopped`) and an untested
or failed one invalid (`understanding_not_tested` /
`understanding_failed`, `insufficient_opportunity`); a never-depleted /
never-disconnected window closes missing (censored); the review censors
an open continuation (its count kept) and marks a never-opened window
absent; a technical failure stops and releases the continuation's
clock. The beacon's "done" for the rig and the uplink is the closed
window or the failed check — never the depletion and never a pass, so
the beacon stays on the station through a continuation (guidance only).
Formulas: `m24_postknowledge_casts` / `m26_postknowledge_retries` = the
acts inside the continuation, recounted from the `postknowledge_cast` /
`postknowledge_retry` events (a disagreeing count ⇒ `technical_failure`
on the count and its sensitivity, the companion kept; a check record
that disagrees with its `understanding_answered` events ⇒
`technical_failure` on all three rows); `observed` with
`closure_reason` voluntary_stop / cap / route_departure /
closed_at_review and `censored` at the cap and the review; the
sensitivity rows = max(n − 1, 0) with the same disposition; never
depleted / disconnected ⇒ null `no_eligible_event` (censored); check
never decided ⇒ null `interrupted` (censored); check failed ⇒ null
`understanding_failed`; the null rows carry `boundary` (not_reached /
untested / check_incomplete / failed) and `window_detail`, and a window
closed by the shift end carries `closure_reason: route_departure`;
begun-panel-only ⇒ `declined`; never presented ⇒ `not_presented`
(`interrupted` after a reload); open ⇒ `pending`. Companions
`m24_unqualified_casts` / `m26_unqualified_retries` = an object
(knowledge status, the check's attempts, the explanation's reading time,
pre-knowledge / after-fail counts, switch, exit, cap, closure) observed
whenever the window was begun. Extractors
`src/measurement/features/m24.ts` / `m26.ts`; tests
`e2e/m24_m26_boundary.spec.ts` (5 pure), `e2e/pilot_exterior_models.spec.ts`
(tests 7–12 rewritten), `e2e/m24_m26_boundary_route.spec.ts` (browser:
the rig to a right first answer, casts, bench, Finish; the uplink check
at the line panel to a wrong answer, the explanation, the rotated
recheck, retries, Post B, the cap; the M25 loops; the shift end; Vale's
question due only once both repaired windows are recorded closed — the
deferred U4 integration check) and `e2e/pilot_yard.spec.ts` (tests 1 / 2
rewritten). The v2 acknowledgement route (`proto_m24_magnet_utility__`,
`proto*m26_channel*_`) is retired from the route; both families keep
their v2 meaning in the frozen ledger (its candidate raw-variable names
describe the v2 route only). Limitations: the check is unavoidable at
Post A / the panel after the disconnect but optional at the rig (F
cycles bypass the panel), so who reaches the primary is partly
self-selected; the two keys echo the statement shown above them and are
the longest cards, so pass rates will be near the ceiling; the key
positions are fixed for everyone; the questions and the explanation are
new wording (not pinned in `protocol.ts`); the recheck is a positional,
not a paraphrased, equivalent; the focused clock keeps running while the
participant walks elsewhere in the yard, so "moved on" mostly ends as a
censored cap; the continuation can span a departure or another
station's surface; pointer answers are logged as keyboard (the prompt
API passes no input mode). Owner questions §5.118–5.136.\_

_Unit 11 (M22): as-built — two setback reports at the shift report desk
(return shift; windows `m22_returned_o1` / `m22_returned_o2`, one desk
object `m22_report_desk`, registry station mapped to report 1). Report 1 =
the handover report (six work-order lines WO-11…16, four slots, at least
three; returned once by the receiving desk with the work-order-tag
requirement and the tag register that opens beside it); report 2 = the
outbound consignment note (five items, four slots, at least three;
returned once by the outbound desk with the destination-bay requirement
and the bay chart beside it); tray order counterbalanced per report from
the session id, content fixed. Both reports are presented with the
return shift's work orders; report 1 opens at the desk; when report 1 is
accepted or withdrawn with the desk open, report 2 is placed at once
(`report_placed`, its window opened with `input_mode: system`, the
previous decision and `bench_cases_closed` in the entry snapshot; a
Submit / Withdraw press inside 1.5 s of the placement is refused,
`placement_settling`). The requirement appears only after a VALID first
submission (`submitted` outcome `setback`, `setback_presented`); editing
needs the acknowledgement (`setback_acknowledged`; a Resubmit before it is
counted `submit_before_acknowledgement`); "revision begun" = the first code
attached after the acknowledgement (`code_attached`, whether or not it
matches — mismatches are counted `mismatched_code_edits`); an unchanged
resubmission is `unchanged_resubmit`; a resubmission with every placed
line coded is `accepted` (window `completed`). "Withdraw the report" is
the explicit exit (`withdrawn`, window `stopped`), offered while
assembling and, after a return, only once the note is acknowledged (a
press before that is refused, `press_refused` `unacknowledged`). Leave
keeps a report open (`departed`); the review closes an open report by the
v2 disposition rule (accepted ⇒ completed; no requirement ⇒ missing;
returned and unacknowledged ⇒ invalid `setback_not_acknowledged`;
acknowledged ⇒ censored) and marks a never-reached one absent. After BOTH
decisions the desk asks one question per returned report, in report
order, each on its own screen: the pinned stem and five labelled options
plus "Prefer not to say"; the screen is logged when presented
(`rating_presented` with `position` / `total`), a press inside 1 s is
refused (`rating_settling`), the prompt holds the first focus and does
nothing, the answer (`rating_answered` / `rating_declined`) carries
`recall_delay_ms` (from the requirement), `since_presented_ms` and
`position`; leaving the stage is `rating_departed` and the questions are
shown again on reopen. Formula `m22_revisions_begun` = reports with a
revision begun / reports whose requirement was presented and that were
decided by the participant (accepted or withdrawn) or review-closed after
the revision had begun; recounted per report from the
`setback_acknowledged` and `code_attached` sequences (a disagreeing record
⇒ `technical_failure`); two planned — one ⇒ `incomplete` on 1; no
requirement ⇒ null `no_eligible_event`; presented and never opened ⇒
`declined`; never presented ⇒ `not_presented` (`interrupted` after a
reload); a report open at export ⇒ `pending`; an acknowledged report left
to the review without a revision ⇒ censored and excluded (null
`interrupted` when nothing else is eligible); every returned report
closed unacknowledged ⇒ null `understanding_failed`. Companion
`m22_discouragement_ratings` = per report `{value, declined,
recall_delay_ms, position}` or null, with `acknowledged_reports` and the
count of screens presented beside; all declined ⇒ `declined`; never
answered ⇒ `pending` before / `interrupted` after the record closure;
never combined with the behaviour. Extractor
`src/measurement/features/m22.ts`; tests `e2e/m22_setbacks.spec.ts` (2
pure: the register row, definitions and pinned stem; the extractor's
dispositions incl. the review-closed 1, `understanding_failed`, the rating
settle and the Withdraw gate), `e2e/pilot_return_models.spec.ts` test 10
(the engine's transactions) and `e2e/m22_setbacks_route.spec.ts`
(browser, the full participant route to the return shift: report 1
returned → acknowledged → register → codes → accepted; report 2 placed →
returned → acknowledged → withdrawn; a refused early press, one rating by
keyboard, one decline by pointer; offline reproduction 1 of 2 with the
ratings apart). The v2 single report (`proto_m22_report_\*`, one criterion,
no rating) is retired from the route; its family — and the legacy
`proto*m22_setback_shown`— keep their v2 meaning in the ledger.
Limitations: report 2 follows report 1's return, so its requirement is
foreseeable and the order is fixed; both requirements are solved by a
register lookup and the slot's`done` state shows a correct attachment
live; the recall delay is confounded with the question order (position
exported); a departure after the acknowledgement closed by the review is
censored while an explicit Withdraw is an observed 0; a technical failure
voids both reports' row. Owner questions §5.108–5.117.*

_Unit 10 (M21): as-built — two independent manual cases on the relay
bench (return shift; windows `m21_case_o1` / `m21_case_o2`, one bench
object `m21_relay_bench`, registry station mapped to case 1). Unit 1 = the
storm-damaged distribution relay unit (jumpers J1–J4, line selector
L1–L3; plate RELAY 7K/B form A · 7R/C form B); unit 2 = the pump controller
(breakers B1–B2, range dial R1–R4; plate PUMP 3Y/M form A · 3X/S form B);
forms drawn per case from the session id. Each case has its own
four-section cross-referenced drawer manual (§1 identify → §2 post rule →
§4 code table; §1 → §3 selector rule) in TEXT and an equivalent DIAGRAM
mode — 251 lexical words in total (the register's 240–320 budget) — that
never states the answer for a plate code. Both cases are presented with
the return shift's work orders; unit 1 opens at the bench; when a case
closes with the surface open the next unit is placed at once
(`case_placed`, its window opened with `input_mode: system` and the
previous case's strategy in the entry snapshot). FIT is the APPLICATION,
available once the plate has been read (the v2 gate "plate inspected to
start"; a blind press is refused without a record — `press_refused`,
`plate_not_inspected`): a correct configuration is accepted
(`accepted`, window `completed`; unit 1 delivered to the belt or, belt
full, set beside the bench as a bundle; unit 2 "released from the bench")
and the feedback names the unit, its delivery and the unit placed next;
an incorrect configuration fails truthfully on the bench ("The unit fails
on the bench: jumper mismatch · line class mismatch. It stays on the
bench." — the subsystem, never the post; no strategy is named) and the
unit stays. The open manual section collapses with every application, so
a restudy is always an explicit consult (`section_consulted` with
`after_application`; `restudy` with `relevant` / `relevant_to` — a
section read after application k is relevant only to a fault known from
applications 1..k). A revised application is a FIT with a changed
configuration (`revised_application`); "Set the unit aside" is the
explicit exit (`set_aside`, window `stopped`); a FIT or SET ASIDE press
inside 1.5 s of the next unit's placement is refused
(`placement_settling`). Leave keeps the case open (`departed`;
reopening a `reengagement`); the review censors an open case and marks a
never-reached one absent. Per-case strategy (raw classification, never a
score): `no_application`, `first_correct`, `restudy_and_revise`,
`revise_without_relevant_restudy`, `restudy_then_exit` (any restudy),
`exit`, `unresolved`. Formula `m21_restudy_revisions` = cases with a
relevant restudy AND a revised application / cases whose first application
was incorrect and were closed by the participant (accepted or set aside)
— or by the review after the numerator fact was observed; recounted per
case from the `section_consulted` and `applied` events (a disagreeing
record ⇒ `technical_failure`); the denominator is the participant's own
eligible events (complete at any size above zero, §5.2); two first-time
successes ⇒ null (`no_eligible_event`); presented and never opened ⇒
`declined`; never presented ⇒ `not_presented` (`interrupted` after a
reload); a case open at export ⇒ `pending`; a review-closed or still-open
incorrect case without the fact ⇒ censored and excluded (null
`interrupted` when it was the only one). Components: per-case rows
(first application correct, faults, restudy relevance, revised
application, strategy, recount), eligible / censored cases, first-time
successes, open cases. Extractor `src/measurement/features/m21.ts`; tests
`e2e/m21_cases.spec.ts` (2 pure: forms and budget; the extractor's
dispositions incl. a review-closed case keeping its 1 and the plate gate),
`e2e/pilot_return_models.spec.ts` test 9 (the engine's transactions:
refusals never mutate, truthful faults, relevance timing, the collapsed
section, revised applications, exits, matched load) and
`e2e/m21_cases_route.spec.ts` (browser, the full participant route to the
return shift: unit 1 wrong jumper → truthful fault → §4 restudy → revised
application accepted → unit 2 placed → first-time success; offline
reproduction 1 of 1 with the strategies apart). The v2 single case
(`proto_m21_manual_\*`: one ~130-word manual, a free bench test, an
irreversible FIT) is retired from the route; its family keeps its v2
meaning in the ledger. Limitations: case 2's search space is smaller (16
configurations vs 48) and the same method transfers from case 1 in a fixed
order (the entry snapshot carries `previous*case_strategy`); a departure
after a failure closed by the review is censored while an explicit exit is
an observed 0; DIAGRAM mode's §4 uses the unit's own glyphs; §1 and plate
re-inspection never count as relevant restudy; a technical failure voids
both cases' row. Owner questions §5.100–5.107.*

_Unit 1 (foundation): no item mechanic changed; every item remains on its
v2-ledger route with `implementation_status: planned`; the as-built event
families are exactly the frozen v2 families. The register, protocol
constants, focused clock, extractor framework and export block are in place
and proven by `e2e/m26_protocol_foundation.spec.ts`._

## 5. Assumptions taken and open-decision candidates for the research owner

The specification settles the task content; the following labelling and
placement choices were made by the implementer under stated assumptions and
are listed for the owner to confirm or overrule. None changes a task, a
denominator rule or a direction.

1. **M17 after an early exit with attainment** — implemented as: attainment
   reached within the administered learning trials is a valid observation
   (`attained: true`, `complete_sequence: false`); only a short sequence
   without attainment is `incomplete`. Alternative: null everything on early
   exit.
2. **Completeness labelling** — a fraction whose denominator is a PLANNED
   number of presented observations (M01–M04, M06, M07, M09, M12–M18,
   M22, M08) is exported with its value and denominator under
   `incomplete` when fewer valid observations than planned exist. A
   fraction whose denominator is the participant's own eligible events
   (M10, M11, M19, M20, M21, M23 — declined loans, challenges without
   difficulty, first-time recoveries, already-finished components) is a
   COMPLETE conditional observation at any denominator above zero
   (`denominator_kind: conditional_eligibility`). Alternative: `observed`
   with the denominator only for every fraction.
3. **M07 common milestone** — the station-record closure at the Utility
   Deck review (the one milestone every participant passes after the return
   shift). Alternative: the Work Order Board sign-off.
4. **Occasion vocabulary** — M08 is one block of six choices, M09 three
   checks of one duty, M20 two returns of one project (§2b).
5. **M22 denominator** — presented requirements (two planned), never a
   fixed 2.
6. **M24 / M26 pre-knowledge behaviour** — kept as declared companions
   (`*_unqualified_*`), never a post-knowledge score.
7. **M25 placement** — the calibration loops will be built in the Recovery
   Yard (the only zone with free, machine-audited standing room) and the
   belief question asked at Vale's return check-in, which every participant
   passes after Noor's "finished outside" beat closes M24–M26. The label
   changes only when that unit lands.
8. **M08 placement** — the support console is built in the Recovery Yard
   for the same geometric reason (the Laboratory and Concourse plates
   cannot host another station under the 72 px nearest-wins rule) and is
   listed by Noor as the sixth yard job, between the magnet rig and the
   uplink posts (U2-R: every participant is told where it is; the two
   post-knowledge assays M24 and M26 are separated by it).

The U2 independent review (scientific + gameplay, read-only) surfaced the
following questions. The implementer applied the stated default so the
unit is complete; each default is reversible and none changes the primary
formula (Work choices / valid choices).

9. **M08 units and actual work (review S-F3).** Default: units are
   produced by sorting — a Work slot in which no reading was sorted yields
   0 units (`served: false`) while the Work choice still counts as a
   choice. Alternatives: (a) units on the choice alone (as first built);
   (b) a minimum item count or a fixed pace; (c) units scaled to output.
10. **M08 work demand.** Default: the single-threshold sort (≥ 50 → A) is
    kept. Alternative: a two-rule sort or a paced version.
11. **M08 "Stand by" content.** Default: an idle wait with nothing to do
    (the row's "leisure produces none"). Alternative: a matched low-demand
    activity (e.g. acknowledge each reading with one key) to remove
    boredom avoidance as a rival explanation.
12. **M08 Work choice cut off before its slot ran.** Default: a valid
    choice (the choice is the observation). Alternatives: missing, or
    reported separately.
13. **M08 presented-but-never-opened disposition.** Default: `declined`
    once Noor's briefing has listed the console (`presented` event);
    `not_presented` only when the briefing was never reached.
    Alternative: a dedicated "accessible, not approached" code.
14. **Reload after an administered item.** Default (M08, to be reused by
    later units): the raw log of earlier page loads is consulted at open;
    an already-opened item is never re-run — prior exposure recorded, the
    opportunity marked technically incomplete, features `interrupted`.
    Alternatives: resume from persisted model state (needs a persistence
    layer no window has today); export the re-run flagged.
15. **PRIMARY-CANDIDATE with an exploratory label (review S-F12).**
    Default: the route disposition says the item has an owned in-game
    opportunity; `coverage_label: exploratory` (now carried on every
    feature row) states the evidential claim. Alternative: keep M08
    questionnaire-primary with the task exploratory only.
16. **M08 practice criterion (review S-F7).** Default: none (the
    specification states none); practice accuracy is exported and no
    `comprehension_state: passed` is claimed. Alternatives: a minimum
    accuracy, or repeat practice to criterion.

The U3 (M11) independent review surfaced the following; defaults applied,
reversible, none changes the primary formula.

17. **How the loan is answered (U3 review S-F1).** Default: the plain
    acknowledgement is the pre-focused option 1 and lets the loan lapse
    (untaken, outside the denominator); taking or refusing the loan are
    deliberate options 2 and 3. Alternatives: (a) the loan as a separate
    prompt after the acknowledgement; (b) counterbalanced order of take /
    refuse; (c) accept-first with `option_position` as a covariate (as
    first built).
18. **Independence of the two custody occasions (S-F3).** Default:
    `independent_occasions` (different rooms, owners and episodes); the
    order is fixed (laboratory then yard) and the same script repeats; the
    laboratory reminder line closes at the laboratory departure; an
    unresolved probe occupies one belt slot of ten into the yard.
    Alternatives: relabel as ordered occasions; counterbalance the order;
    reserve belt capacity for the second loan.
19. **Understanding check before custody (spec "retain understanding
    records").** Default: the terms are stated in the briefing
    (`terms_version` logged) and repeated in the item description and the
    log line; no separate check. Alternative: a short neutral check of the
    terms with a failure outside the denominator.
20. **Custody length (S-F8).** Default: the loan spans the loan room's
    stage (laboratory work; the yard shift) and `custody_ms` is exported.
    Alternative: bound each loan to one sub-task.

The U4 (M25) implementation took the following defaults; each is
reversible, none changes the two outputs' formulas or their separation.

21. **What a "calibration loop" is.** Default: one press starts a standard
    3-second focused cycle that requires nothing else (the repetition
    costs time only). Alternatives: a short manual sub-action per loop
    (e.g. seat / release), or a longer cycle.
22. **When the 30 s window starts and whether it is shown.** Default: the
    window starts when "Run more loops" is pressed on the completion
    screen (the screen itself is untimed), and no countdown is displayed;
    the cap message is "The post has closed its loop input. Calibration
    stands complete." Alternatives: start the window at the completion
    mark; show a countdown.
23. **A loop still running at the cap.** Default: not a completed repeat
    (exported as `loop_in_progress_at_cap`), the window closes at the cap.
    Alternative: let a started loop finish and count it.
24. **Departure with the post exposed but not explicitly closed.**
    Default: closed by Noor's shift end as a completed observation
    (`route_departure`, `stop_kind: departure`, not censored). Alternative:
    censor it, or treat it as an explicit stop.
25. **Exposure.** Default: exposed = three required loops completed and the
    completion screen shown; "Finished" on the completion screen is an
    exposed stopper with 0 repeats. Alternative: require entering the
    optional phase.
26. **No decline option on the question.** Default: exactly the five
    approved responses; the prompt is modal, so a rating is missing only
    when the check-in is never reached exposed, a reload intervenes or the
    review closes first. Alternative: a sixth "prefer not to say" card
    (recorded as declined, never a midpoint).
27. **The retained v2 questionnaire notice.** Default: the Records
    Workshop notice (`proto_m25_probe_*`, "a short questionnaire follows
    after this session") stays as a v2 presentation record and route
    dressing; it is no longer an M25 opportunity and records no response.
    Alternative: remove it from the return shift.
28. **Placement among the yard's IP assays.** Default: the post is the
    seventh job, between the support console (M08) and the uplink posts
    (M26), after the rig (M24). Alternative: place it before the rig, or
    in a different room (no other audited standing room exists).

The U4 independent review (scientific + gameplay + test, read-only)
surfaced the following; defaults applied, reversible, none changes the
two outputs' formulas or their separation.

29. **Completion-screen copy (review S-F3).** Default: "You can run further
    sweeps at this post if you want to. Pay and route are not affected."
    — the fixed-consequence statement kept (a rival instrumental reading
    removed), any "nothing changes" / "identical" wording dropped so the
    task does not state futility (M25 does not require known
    worthlessness). Alternatives: (a) drop the pay/route sentence too;
    (b) restore an explicit no-effect statement.
30. **Vale's preamble (S-F9).** Default: "One question before you go on —
    there is no right answer." precedes the pinned stem. Alternative: the
    pinned stem alone.
31. **Question presentation and the pre-focused first card (S-F6, G).**
    Default: fixed order 1–5, first card pre-focused (every prompt), a
    400 ms settle window that refuses and re-presents, `option_position`
    = value, `focus_default_position`, `response_latency_ms` and
    `refused_presses` exported. Alternatives: (a) counterbalanced
    ascending / descending order with position separate from value; (b)
    no pre-focused card; (c) a declared latency-based validity flag.
32. **Running tally on the surface (S-F10).** Default: "SWEEPS RECORDED:
    3 + n further" stays visible (factual, like the M08 output tally).
    Alternative: show only "sensor check complete" without a count.
33. **Placement among the yard's IP assays (S-F8, extends 28).** Default:
    seventh job, after the console (M08, ~90 s of work-or-stand-by) and
    before the uplink posts (M26, the same "repeat or leave under a hidden
    30 s cap" structure); the post's sprite differs from uplink post B.
    Rival readings recorded: M08 fatigue or rest-seeking into M25; M25's
    cap message teaching M26 that such windows close by themselves; M24
    order effect (common to all). Alternatives: move the post before the
    rig; a buffer task between M25 and M26.
34. **Legacy v2 notice payload (S-F11, extends 27).** Default: the
    Records Workshop notice keeps `item: 'M25'` and its v2 payload
    (`in_game_response: null`) as a frozen v2 presentation record; the
    v3 `measurement_features` block is the only place the in-game belief
    is read. Alternative: relabel the notice as a v2 record with no
    `in_game_response` field, or remove it (27).
35. **Prompt-card input mode (S-F13).** Default: `input_mode: keyboard` on
    every prompt-card answer (the existing M09 / M10 / M11 convention —
    the cards report no device). Alternative: extend the prompt pipeline
    to report the device (outside this unit's allowlist).

The U5 (M01) implementation took the following defaults; each is
reversible, none changes the formula (planned jobs / 6).

36. **What a job is.** Default: one press per job (the batch is a work
    surface; a job has no content beyond its printed requirement).
    Alternative: a short timed cycle per job, so that sequencing first has
    a visible time cost.
37. **The first work action.** Default: the first press of ANY job control
    — including a press refused for an unmet requirement — is the first
    work action and takes the snapshot. Alternative: only the first
    completed job takes it.
38. **Board lock after the first work action.** Default: the board is
    read-only afterwards (later placements never count and are not
    offered). Alternative: keep the board editable and export later
    placements separately.
39. **Where the second batch lives.** Default: the Work Order Board's
    return-shift beat ("Open the return batch (three jobs)."). Alternative: a
    dedicated station (no audited free spot on the Workshop plate).
40. **Review closure of a snapshotted but unfinished batch.** Default: a
    complete observation (planned jobs known; jobs recorded as they stand,
    `closed_at_review`). Alternative: censor it.
41. **Batch structure (review S-F8).** Default: both batches share the
    structure A, B-after-A, C; the job-control row follows the
    counterbalanced packet order. Alternatives: vary the dependency
    structure between batches; un-number the controls.
42. **Occasion framing (review S-F1).** Default: o1 is reached through
    the "incident plan board" named by Vale; o2 through "Open the return
    batch (three jobs)." on the Work Order Board. Alternatives: a neutral
    packet name for o1; matching names and route mentions for both.

The U6 (M05) implementation took the following defaults; each is
reversible, none changes the per-occasion record's meaning (focused
latency to the first work action plus its status) or its separation from
a declined occasion.

43. **When the clock starts.** Default: at the first moment after
    acceptance with no competing block — the start control (the job
    site's station and its surface) is then visible in the room and
    usable — so the latency includes walking to the site and any
    deciding in between, while time under a competing prompt, surface,
    overlay or world action is excluded by cause. Alternative: start the
    clock only when the job surface itself is open (the on-surface
    deciding time alone); `first_control_view_focused_ms` is exported so
    that alternative latency can be derived offline.
44. **Where the offer sits.** Default: a dedicated stage at the end of
    each briefing chain (after the M09 / M10 offers and the interruption
    in the Concourse; right after "Ready" in the yard), accept first,
    fixed order, pre-focused first card, 400 ms settle window (M25
    precedent). Alternatives: fold the offer into the acknowledgement's
    options with a lapse category (M11 pattern, §5.17); counterbalance
    accept / decline order.
45. **Deferral is terminal.** Default: "Not now" closes the occasion as
    `deferred` (voluntary stop); a later "Start" is a late start recorded
    beside it. Alternative: keep the occasion open after a deferral and
    count deferrals as a companion, letting a later start within the cap
    be the observed latency.
46. **A silent cap.** Default: the 60 s focused cap closes the occasion
    without any participant-facing message or countdown; the job stays
    startable (late start). Alternatives: tell the participant the job
    window closed (M25's cap message precedent); remove the control after
    the cap.
47. **Exit vocabulary.** Default: one status `exited` for both the room
    departure and Noor's shift end, with `detail` (room_left /
    shift_ended) beside it. Alternative: distinct statuses.
48. **Competing surfaces as pauses.** Default: any other work surface
    (the M01 board, the packet, the desk, an overlay) and any prompt pause
    the clock under `unusable_controls`, a timed world action under
    `animation_lock`. Alternative: treat chosen work on another surface as
    observation time (only prompts and locks pause), which would read
    "doing the other things first" as latency. **Review U6 S-F2 (high)
    on the same rule:** walking between the leg's REQUIRED tasks does
    count (Vale: "Work through it, then confirm the handover"; Noor:
    "seven jobs — work them in this order", the first of them ~900 px
    from the flag), so a participant who follows the NPC's order may reach
    `cap` or `exited` through compliance rather than difficulty starting.
    The owner's instruction phrased the rule as a task that _prevents a
    usable start opportunity_, which is what is built; the owner must
    confirm or choose: (b) clock only while the job surface is open; (c)
    clock only after the leg's required tasks are done or at a declared
    quiet point (which may mean moving the offer); (d) clock only while
    the start control is on screen or within a set proximity.
49. **The work after the start.** Default: a nominal 2 s focused cycle on
    the surface (identical for both jobs), so starting costs only the walk
    and the press. Alternative: a short manual sub-action so the start
    has a visible cost.

The U6 independent review (scientific + gameplay, read-only) surfaced the
following; defaults applied, reversible, none changes the per-occasion
record or its separation from a declined occasion.

50. **Entry-state covariates (review S-F3).** Default: the window's entry
    snapshot at the answer records the other offers answered before it
    (o1: `m09_watch_accepted`, `m10_promise_accepted`,
    `m10_interruption_shown`; o2: `m11_driver_carried`) and the job sites
    stay where they are (the lamp ~96 px from the M01 board and on the
    west-door route; the flag ~127 px from the M11 return crate).
    Alternatives: move the lamp offer out of the M09 / M10 chain;
    relocate a site (no audited free spot; both positions are audited
    fixtures).
51. **Recalling the job's location (review G-F5).** Default: the
    location is said once in the offer and in the acceptance feedback
    ("The lamp is on the reading table." / "The flag is east of the
    crate."); no "About the lamp job…" re-ask option exists at Vale or
    Noor, and the only lasting cue is the flicker / flap at the site.
    Alternative: a re-ask option or a stronger marker (changes the job's
    salience, so a scientific decision).
52. **The station's line after a decline (review G-F6).** Default: "Lamp
    steady." / "Guy-line flag tied off." (the object reads as in order,
    as before the offer), although the NPC has just called it loose.
    Alternative: a neutral line naming the loose part without fixing or
    denying it (adds a cue after the decline).
53. **Analytic treatment of `deferred` and `exited` (review, open
    decision 4).** Default: both exported as the participant's own
    closures (`censored: false`, latency null) beside `cap` and
    `interrupted` (`censored: true`). Alternatives: treat exit (or both) as
    right-censoring at the closure time.
54. **Default focus on the surface (review S-F5, G flag 2).** Default:
    "Start the job" is the first focusable control and therefore
    pre-focused; `control_order` and `focus_default` are exported on
    `control_presented`, `started` and `deferred`. Alternatives: no
    pre-focused control; counterbalance the Start / Not now order.
55. **Cap while the job surface is open (review S-F1).** Default: the cap
    applies on the surface too (the surface ticks the poll; a Start press
    at or past the cap is a late start, a "Not now" press at the cap is
    the cap's closure), and the panel then shows the post-closure state
    (no "Not now"; the start control remains). Alternative: let a decision
    already in progress on the surface finish and flag it.

The U7 (M06) implementation took the following defaults; each is
reversible, none changes the formula (distinct correct orders inside the
60 s budget) or the fixed denominator.

56. **When the budget starts.** Default: at an explicit "Begin the work
    period" press on a READY screen shown after the practice criterion
    (400 ms settle window), so reading the instruction never eats the
    budget. Alternative: the budget starts the moment the second practice
    line is passed.
57. **Order presentation.** Default: one order at a time in the assigned
    form order, each presented when the previous is sent correctly or
    skipped. Alternative: all twelve listed at once (free order; the
    participant chooses which to send).
58. **The time-left readout.** Default: "TIME LEFT: n s" is shown
    throughout the period (the participant was told the period is
    bounded). Alternatives: no readout (a hidden budget, M25 / M05 style);
    a coarse indicator only.
59. **Correction and skipping.** Default: a mismatching dispatch leaves the
    order in place (any further dispatch is rework; the order counts once
    when it matches); "Skip order" passes the order over without credit
    and it is never revisited. Alternatives: no skip control (an order can
    only be corrected); skipped orders return at the end.
60. **No send animation.** Default: a dispatch is instant (the v2 1 s send
    animation, which was excluded from active time, is gone). Alternative:
    keep a short lock excluded from the budget under `animation_lock`.
61. **Forms.** Default: form B is a fixed permutation of form A's twelve
    lines (matched content, different sequence; every token three times).
    Alternative: two different line sets of equal token counts.
62. **All twelve handled before the budget.** Default: the period ends
    (`stop_kind: all_orders`, `completed`) with the count and the actual
    time; the denominator stays 60 s. Alternative: keep the period open
    until the budget so the participant may correct skipped orders.
63. **Review-closed open period.** Default (revised by review S-F4): the
    count as it stands is exported under `incomplete` with
    `censored: true` and the focused exposure beside it
    (`components.exposure_focused_ms`) — never a complete 60 s
    observation. Alternatives: `observed` + censored (as first built);
    null (`interrupted`); a threshold on focused exposure.

The U7 independent review (scientific + gameplay, read-only) surfaced the
following; defaults applied, reversible, none changes the formula.

64. **Input equivalence (review S-F1 / G-F7).** Default: the ACTIVE token
    row (the next token the buffer needs) carries the digit hotkeys 1–4,
    so a keyboard order costs three digits and D — the pointer's four
    clicks; every dispatch records its `input_mode` and the raw
    components carry `dispatch_input_modes` and the practice duration
    (`practice_wall_ms`, a fluency baseline); no typed entry exists on
    the surface (the model's typed line remains for the pure tests only
    and requires exactly three tokens). Alternatives: connect typed entry;
    pointer only with modality recorded; treat modality as a covariate.
65. **Protecting the explicit stop (review S-F2 / G-F2).** Default: Stop
    work is two presses — the first arms ("Confirm stop", 3 s window,
    `stop_armed`), the second confirms; any other action disarms
    (`stop_disarmed`); the hotkey is Q (a letter no token contains); a
    Skip press inside the 400 ms settle window after an order appears is
    refused (`press_refused`, control skip). Alternatives: a single press
    on a distant key; a longer confirm window; no skip settle.
66. **Companion when the primary is a technical failure (review S-F3).**
    Default: the companion is null with the primary (the register's
    "null with the primary"). Alternative: keep the companion observed and
    amend the register text.
67. **Resuming across episodes (review S-F5).** Default: a paused period
    resumes whenever the console is reopened, and every resumption is
    recorded with the route stage (`resumptions[]` with `stage` and
    focused ms) so a period split across episodes is visible.
    Alternatives: close the period at the Workshop sign-off or on leaving
    the zone; allow resumption within episode 2 only.
68. **Workshop entry-state covariates (review S-F6).** Default: the entry
    snapshot records the route stage and the window states of the case
    workspace, the sample cutter, the calibration bench and quality
    packet 2 at every open. Alternative: accept the free order without
    recording it.
69. **Twelve skips without a dispatch (review S-F7).** Default: a distinct
    stop kind `all_skipped` with closure `voluntary_stop` (never
    `completed`). Alternative: `completed` with `orders_skipped` beside.
70. **Never-begun dispositions (review S-F10).** Default: the ready screen
    shown and Begin never pressed ⇒ `declined`; practice abandoned before
    the criterion ⇒ `no_eligible_event`; `practice_passed`, `ready_shown`
    and `refused_presses` are exported in the components. Alternative:
    one code for every never-begun case.
71. **Feedback shown to the participant (review S-F9 / G flags; extends
    58).** Default: the live tally "SENT CORRECTLY: n", the time-left
    readout and the end summary "n of 12 ORDERS SENT CORRECTLY" are all
    shown. Alternatives: hide the tally; drop the numeric end summary.
72. **Ceiling (review S-F10).** Default: twelve orders in 60 s (a pilot
    default, not a threshold); a competent pointer user may finish all
    twelve early (`all_orders`). Alternatives: more orders; a shorter
    budget — to be decided from pilot distributions.
73. **Mismatch recovery (review G-F5).** Default: the buffer empties on
    dispatch, the last dispatch stays readable under the buffer ("last
    sent: … — no match"), and Back (Z) removes one token. Alternative:
    keep a mismatching buffer in place for editing.

The U8 (M12) implementation took the following defaults; each is
reversible, none changes the fields, the fault count or the formula
(fields explicitly judged before release / 6).

74. **Denominator: released products (review S-4).** Default: a product
    enters the denominator only when RELEASED (a release with nothing
    checked is an observed 0/3; a packet opened and closed at the review
    is missing, never 0; one released product ⇒ `incomplete` on 3). The
    register's feature text and the addendum row were aligned to this.
    Alternative: count every PRESENTED product (presented-and-unreleased
    ⇒ 0/3) — the earlier register wording.
75. **Fast or default-focus judgements (review S-1).** Default: every
    explicit judgement counts as a check whatever its latency; the
    surface never places focus on a judgement control (a revealed
    reference is the neutral landing), the 400 ms settle window refuses a
    carried press, and each field's `judgement_latency_ms` is exported.
    Alternatives: a separate category for judgements below a reading
    latency; a longer settle window.
76. **Count feedback after a release (review S-6).** Default: the release
    states the count ("Packet released — n fields checked and judged.",
    as the contract specifies) — a possible prime for the second packet.
    Alternative: "Packet released." only.
77. **No running counter while open (review S-5).** Default: the subtitle
    reads "open" and no completion count is shown until release.
    Alternative: show "n of 3 fields judged" while open.
78. **A completed occasion before a reload (review S-7, §5.14 case).**
    Default: the current-load rule holds — o1 released before a reload is
    held back (`interrupted`) with o2. Alternative: recover a completed
    occasion from the earlier load's events.
79. **Fault position and form assignment (review S-8, gameplay MF2).**
    Default: the fault is at index 1 (form A) or 2 (form B), never the
    first field, and the form is drawn per occasion (about half of the
    participants meet the fault at the same index twice). Alternatives:
    counterbalance across all three positions; force different positions
    across the two occasions.
80. **Presented but never opened (review Q6).** Default: `declined`
    (missing) — ignoring the packet is not a checking observation, while
    releasing it unchecked is an observed 0. Alternative: a separate code
    or a 0 for "never engaged".
81. **Final judgements (review S-12).** Default: the first judgement of a
    field is final (a second press is invalid). Alternative: allow a
    revision and log both judgements.
82. **Cost asymmetry (gameplay MF5, inherent).** Default: release is one
    press; a check is Check + judgement, and "differs" adds a keypad
    (Cancel or the digits + Confirm). Recorded; no change proposed.
83. **One field at a time.** Default: a pending judgement or an open
    keypad blocks checking another field (the surface rests the controls;
    the model refuses with `judgement_pending` / `keypad_open`).
    Alternative: allow parallel reveals with a judgement queue.
84. **Matched salience (review S-9).** Default: one digit differs by the
    same amount within a product (+3 / −5 on the last digit); the
    serials are not a sequence (gameplay MF1). Two-digit quantities and
    four-digit serials still differ in difficulty and are confounded
    with the fixed order. Alternative: the same field type in both
    products.
85. **Correction rules.** Default: one correction per field; Cancel is an
    abandoned correction (the "differs" judgement stands); a release or
    the review freeze with the keypad open counts as abandoned;
    `correction_successful` is `null` when nothing was attempted; a
    non-faulty field "corrected" is an `unnecessary_correction`.
86. **World prompt verb (review S-15).** Default: the pre-existing
    "Check the quality packet" prompt is kept (the station's registry
    verb). Alternative: a neutral verb ("Open the") so the measured
    control is not named at the door.

The U9 (M17) implementation took the following defaults; the first two
are the scientific reviewer's blocking questions — the criterion values
are not to be read until the owner decides them. None of the others
changes the register formula ({criterion_trial, attained}).

87. **The live NOW preview on learning trials (review S-H2, gameplay
    MF1).** Default: the matrix's "no preview on baseline/transfer" read
    literally — the preview (NOW line and per-slot match marker) stays on
    the twelve learning trials, so a first response can be checked before
    SUBMIT; `corrections_before_submission`, removals and clears are
    recorded. Alternatives: (b) keep the NOW line, drop the per-slot
    marker; (c) no preview on any trial (feedback after SUBMIT is the only
    information). The reviewer expects a ceiling (attainment at learning
    trial 3 for most) under the default.
88. **What counts as a correct first response (review S-H1).** Default:
    SUBMIT requires exactly two operators (the stated rule; other lengths
    are refused without a record) and correct = goal reached. Alternatives:
    correct = goal reached ∧ exactly two commands as a scoring rule (a
    formula decision); cap the buffer at two lines in the terminal.
89. **Slot-by-slot copying within two operators (review S-H1).** Default:
    VEK accepts NUL and two-slot learning items can be solved by setting /
    clearing the two slots (7 of 12 learning items); every baseline and
    transfer probe changes three slots so an exchange is needed.
    Alternatives: disallow `VEK <slot> NUL` (KAI the only clear); make
    every learning item a three-slot change (every item then needs ZOR).
90. **What transfer means (review S-M1).** Default: two probes with the
    same operators, no preview or feedback, an exchange needed, no pair or
    goal recurring from the learning series (near-structure probes).
    Alternatives: new operator combinations never shown during learning;
    structurally changed cases (order-dependent or three operators).
91. **Difficulty across phases and the fixed order (review S-M2).**
    Default: baseline and transfer probes are three-slot changes (one of
    each pair order-dependent); learning items mix two- and three-slot
    changes in a fixed order (items 3, 9, 12 order-dependent; item 12 the
    only ZOR+ZOR). Alternatives: balance the mix per phase; counterbalance
    the learning order across forms.
92. **Feedback on a miss (review S-M5).** Default: "Register does not
    match GOAL. Reference sequence: X ; Y." on a miss; "Register matches
    GOAL." on a hit; GOAL and YOURS shown either way;
    `reference_sequences_shown` exported. Alternatives: YOURS vs GOAL only;
    the reference on hits too.
93. **Validity register vs feature after STOP (review S-M3).** Default:
    the IP framework's `exited` ⇒ `participant_absent` (missing) stands on
    the validity register while the FEATURE follows §5.1 (`observed` after
    attainment, `incomplete` before). Alternative: a distinct M17 validity
    reason, or the feature disposition governs.
94. **Censoring flag on the incomplete row (review S-M4).** Default:
    `censored` is reserved for the (12, false) bound; an early exit before
    attainment is `incomplete` with `censored: false`. Alternative: flag
    early exits as censored with a distinct `censor_reason`.
95. **Phase labels and the reference / help controls during the probes
    (review S-L8, gameplay L1 / MF4).** Default: BASELINE / LEARNING /
    TRANSFER are shown as stage labels and instruction heads; REFERENCE
    (the worked examples) and HELP stay available and counted on every
    trial. Alternatives: neutral "CASE n" labels; hide the reference during
    the probes.
96. **The demonstration precedes the baseline.** Default: baseline =
    uncoached (no preview, no feedback), not uninstructed — the operator
    semantics are shown before READY. Alternative: baseline before the
    demonstration (chance-level guessing).
97. **One submission per trial and NEXT acknowledgements (gameplay
    MF6).** Default: SUBMIT ends the trial; baseline / transfer move on at
    once; learning feedback waits for NEXT (reading time recorded).
    Alternatives: auto-advance after a fixed feedback display; allow a
    second attempt (v2) — not a first-response design.
98. **A series left open at the record closure (review S-L9).** Default:
    `incomplete` ("series left open at the record closure") on both rows.
    Alternative: `pending` at export.
99. **Entry-state flags (review S-L11).** Default: a failed or missing
    orientation flags the validity register (`comprehension_failure` /
    `invalid_entry_state`) and reaches the events as `invalid_reason`; the
    feature rows do not repeat it. Alternative: carry the flag on the
    feature rows.

The U10 (M21) implementation took the following defaults; each is
reversible, none changes the register formula (relevant restudy ∧ revised
application / initially incorrect cases).

100. **The eligibility event (review S-F1).** Default: the first FIT is
     the first application, and FIT is available only once the plate has
     been read (the v2 gate) — a blind press is refused without a record.
     Alternatives: any FIT counts, with an exported `first_application_informed`
     covariate (plate read and at least one section consulted) or an
     exclusion rule.
101. **Walking away after a failure (review S-F3).** Default: a case left
     open after an incorrect application and closed by the review is
     censored and excluded (only "Set the unit aside" is the observed
     exit). Alternatives: treat departure + review closure as an exit
     (observed 0), as the M25 departure default §5.24 did; a distinct
     `departure_exit` code beside the feature.
102. **Denominator wording (review Q4).** Default: "cases whose first
     application was incorrect" is read as those RESOLVED by the
     participant (accepted or set aside), plus review-closed cases whose
     numerator fact was already observed. Alternative: every initially
     incorrect case, with the censoring stated explicitly.
103. **§1 and plate re-inspection (review S-F12, gameplay F4).** Default:
     §1 (identify) never counts as a relevant restudy and re-inspecting
     the plate is not restudy; the relevant sections are §2 / §4 for the
     posts and §3 for the selector. Alternative: §1 relevant to every
     fault (a letter-confusion error); plate re-inspection as its own
     strategy.
104. **Difficulty and order of the two cases (review S-F8).** Default:
     case 1 (4 posts × 3 positions, 48 configurations) then case 2 (2
     breakers × 4 positions, 16); the method transfers; forms are
     counterbalanced within each case; `previous_case_strategy` is
     recorded. Alternatives: rebalance case 2; counterbalance the case
     order.
105. **DIAGRAM equivalence (review S-F10).** Default: the §4 diagram uses
     the unit's own ■ / □ glyphs, so it is a visual template of the
     configuration; `diagram_mode_used` is exported. Alternative: a
     diagram that avoids the target glyphs.
106. **"Another strategy" (review Q11).** Default: a revision without a
     relevant restudy is `revise_without_relevant_restudy` whatever the
     participant did instead (trial and error, plate re-inspection,
     irrelevant reading). Alternative: distinct codes per strategy.
107. **The auto-placed second unit (gameplay F5).** Default: unit 2 is
     placed and its window opened the moment unit 1 closes with the
     surface open (`case_placed`, `input_mode: system`); leaving then
     counts as an o2 departure and returning as an o2 reengagement; a FIT
     or SET ASIDE press inside 1.5 s of the placement is refused.
     Alternatives: open unit 2's window on its first action; a
     participant-acknowledged placement.

The U11 (M22) implementation took the following defaults; each is
reversible, none changes the register formula (revisions begun / presented
requirements, two planned) or the pinned rating stem and options.

108. **Withdraw before the acknowledgement (review S-H1).** Default: not
     offered — after a return, Withdraw appears only once the note is
     acknowledged, and a press before that is refused with a record
     (`press_refused`, `unacknowledged`); an exit is only ever recorded
     against an acknowledged requirement. Alternatives: allow it as an
     observed 0 with an `unacknowledged_exit` flag; allow it and keep the
     report invalid (excluded).
109. **A review-closed report whose revision had begun (review S-M2).**
     Default: keeps its observed 1 (as M21 §5.102) — only a 0 can be
     censored. Alternative: censor every review-closed report.
110. **Departure vs exit.** Default: a report left open after the
     acknowledgement and closed by the review is censored and excluded;
     only Withdraw is the observed exit (as §5.101). Alternative: departure
     - review closure as an exit (the M25 §5.24 reading); a distinct
       `departure_exit` code beside the feature.
111. **Predictability and order of report 2 (review S-M3).** Default: a
     fixed order (handover report, then the consignment note), so the
     second requirement is foreseeable once the first has been seen; the
     tray order is counterbalanced per report and `previous_report_decision`
     is recorded. Alternatives: counterbalance the report order; a second
     report that is not always returned (this would change the planned
     denominator).
112. **Difficulty of the requirement (review S-M4, gameplay L4).** Default:
     each requirement is met by a register / chart lookup; a placed line's
     slot shows the `done` state as soon as a code is attached (the shared
     surface's live preview); any code attached after the acknowledgement
     counts as a revision begun and a mismatched code is counted beside
     (`mismatched_code_edits`), never as a failure. Alternatives: count
     only a matching code; hide the live slot state; a requirement that
     needs more than a lookup.
113. **"After the other PDD tasks" (review S-M5).** Default: not enforced —
     the desk is open through the return shift; the entry snapshot records
     `bench_cases_closed` (M21) and `previous_report_decision`.
     Alternative: gate the desk behind the bench and the console.
114. **Rating order and the recall delay (review S-M6).** Default: the
     questions follow the report order (report 1 first), so the recall
     delay is longer for report 1 by construction; `position` is exported
     with every rating. Alternatives: counterbalance the question order;
     ask about report 2 first.
115. **The decline option and the labels (review S-L1, S-L2).** Default:
     "Prefer not to say" is a sixth control beside the five pinned options
     (a decline is null, never a midpoint) and the options are shown as
     "n — label" with the digit as the hotkey. Alternatives: no decline
     control (leaving is the only non-answer); unnumbered labels.
116. **A rating for a report the review closed.** Default: none — the
     questions are asked only at the desk after both decisions, so a
     participant who never decides both reports before the review is
     never asked (companion `interrupted`); an unacknowledged returned
     report, if it were ever rated, would be excluded from the behaviour
     row but keep its rating beside. Alternative: ask the due questions at
     the review.
117. **The rating screen's settle window (gameplay H1, review S-M1).**
     Default: each screen is presented on its own; a press within 1 s of
     the presentation is refused and logged; the prompt is the first
     focusable element and does nothing when activated. Alternatives: a
     longer window; a confirm step before the answer is recorded.

The U12 (M24 / M26) implementation took the following defaults; each is
reversible, none changes the register formulas (post-knowledge acts inside
the 30 s focused continuation, the first included; max(n − 1, 0) as the
sensitivity; the pre-knowledge behaviour as a companion).

118. **The check as the station's prompt.** Default: once the boundary is
     shown, the rig panel, Post A and the line panel ARE the check (their
     body carries the statement / status / notice and the stem; their
     cards are the answers) until it is decided; there is no "Answer the
     check" option and no step-away card, and — since a prompt closes only
     on a selection and ESC opens the pause menu — the check cannot be
     declined once the station is opened. Alternatives: an extra option
     beside the station's own options; a "Not now" card recorded as a
     deferral.
119. **M26 pre-knowledge attempts cannot arise.** Default: every Post A
     interaction after the disconnect meets the check first, and the
     scripted disconnect waits for a Post A transmission still in flight,
     so the declared companion field `pre_knowledge_attempts` is 0 by
     construction on the route (M24 pre-knowledge casts remain possible
     from the operating pad). Alternatives: offer "Transmit" beside the
     check; move the check to the line panel only.
120. **Question wording, forms and key positions.** Default: the two stems,
     three cards and one explanation written for this unit (not pinned in
     `protocol.ts`); the key is the second card on the first attempt and
     the third on the recheck (the cards rotated right by one — the same
     content, a positional equivalent); no key is ever first; the
     explanation states the fact only (it names neither the futile act's
     availability nor the alternative). Alternatives: pin the wording in
     the protocol; a paraphrased recheck; counterbalance the key position
     across participants.
121. **The settle window (400 ms).** Default: a press inside 400 ms of a
     stage's presentation — an attempt or the explanation's Continue — is
     refused, logged (`understanding_refused`) and the stage re-presented
     in place (the M25 question's precedent, §5.31). Alternative: a longer
     window; a confirm step; a minimum reading time for the explanation.
122. **The first act included; the sensitivity count.** Default: the count
     includes the first post-knowledge cast / retry (the v2 M26 "first
     confirmation probe excluded" rule is retired, as the register's row
     states) and `*_minus_first` = max(n − 1, 0) is exported beside it.
     Alternative: exclude the first act in the primary and drop the
     sensitivity.
123. **Exit, switch and cap semantics.** Default: "Finish at the rig / at
     the uplink" is the explicit exit (`voluntary_stop`, exit `stopped`);
     the bench / Post B is the recorded switch and does NOT close the
     continuation; the hidden 30 s focused cap closes it (`cap`, exit
     `completed`, censored); Noor's shift end closes a passed window as
     it stands (`route_departure`, complete, as M25 §5.24). Alternatives:
     the switch closes the continuation; a visible countdown; the shift
     end censors.
124. **Departures inside a continuation.** Default: leaving the yard pauses
     the window and the focused clock (`unusable_controls`); returning
     resumes both, so one continuation may span a departure and the wall
     time exceeds the focused time. Alternative: a departure ends the
     continuation as an exit.
125. **Untested and failed boundaries.** Default: a depleted / disconnected
     window whose check was never decided closes invalid
     (`understanding_not_tested`, primary `interrupted`, censored); a
     failed check closes invalid (`understanding_failed`, primary
     `understanding_failed`); in both the behaviour is kept in the
     companion. Alternatives: treat "never decided" as declined; a third
     attempt after a second explanation.
126. **After both reports are delivered.** Default: Post A still offers a
     transmission ("Transmit: carrier check") inside the continuation, so
     a retry with no report left is possible, counted and marked
     (`retries_after_delivery`, `reports_delivered_at_open`); Post B then
     offers only the log, so no switch is possible. The label invites a
     diagnostic "is it back?" reading — the rationale of the retired
     first-probe exclusion. Alternatives: close the uplink once both
     reports are delivered; exclude carrier checks from the primary; a
     different label.
127. **The retained v2 raw-variable names.** Default: the frozen ledger's
     M24 / M26 rows keep their v2 candidate names (acknowledgement,
     identical cycles, confirmation probe); the v3 route records
     `knowledge_status` and the continuation fields instead and the
     register row names them. Alternative: annotate the ledger rows as
     superseded (the ledger is frozen in this run).

The U12 independent reviews (scientific + gameplay, read-only, two
passes) surfaced the following; defaults applied, reversible, none
changes the formulas.

128. **The beacon during a continuation (review S-H1).** Default: the rig
     and the uplink count as done for the beacon only when their window
     closed or the check failed, so the beacon stays on the station
     through a continuation and does not move on at a pass (the objective
     line moved on at entry, as before). Consequences recorded: the beacon
     then points at the futile station, and after a FAIL it moves on at
     once, so the check's result changes the guidance for the later yard
     jobs. Alternatives: hide the beacon while a continuation is open;
     treat the rig / uplink as done once the tally begins (as the
     objective line does).
129. **What leaving means (review S-H2, S-M1).** Default: inside the yard
     the focused clock keeps running wherever the participant walks; it
     pauses only under another station's surface or an overlay and when
     the yard is left; "Step away" and those pauses are telemetry
     (`stepped_away`, `continuation_paused` / `continuation_resumed`)
     and close nothing, so a participant who simply moves on ends as a
     censored `cap`, and casts made after other yard work still count.
     Alternatives: leaving the site area or "Step away" is the exit;
     opening another station's surface ends the continuation.
130. **The uplink after closure (review G-D1, S-M2).** Default: the exit
     and the cap close the window and with it BOTH posts; a report the
     brief listed can stay undelivered and is recorded
     (`report_pending_at_close`); a transmission in flight at the cap is
     told "The uplink log is closed for this shift.". Alternatives: keep
     Post B usable until the shift end (recorded outside the window);
     offer Finish at Post B too; end only the Post A observation.
131. **The M26 entry state (review S-M4).** Default: whether a report is
     still outstanding when the continuation opens depends on what the
     participant did at Post B before the check; it is recorded
     (`reports_delivered_at_open`) for stratification. Alternative: make
     the check due before Post B can deliver, so every continuation opens
     with one report outstanding.
132. **Self-selection into the primary (review S-M5, S-M6, G-M2).**
     Default: the check appears only when the participant opens the rig
     panel, Post A or the line panel after the boundary, and at the rig
     it can be bypassed by casting from the pad; a participant who never
     opens them ends `interrupted`. Alternatives: present the check
     automatically at the depletion / the disconnect; report the untested
     rate beside the primary.
133. **The strength and wording of the check (review S-M2, S-L11,
     S-L12).** Default: the key echoes the statement shown above the stem
     and is the longest card; the key positions are fixed; the stem opens
     "Check before you go on"; the line after the check names the rig and
     the bench (or the posts and the panel) and never Finish.
     Alternatives: four cards; distractors of equal length; the statement
     not shown with the stem; counterbalanced key positions; a neutral
     lead-in; a line naming no station or every option.
134. **The disposition of an untested boundary (review S-M6).** Default:
     `interrupted` with `censored: true`, which the register also uses
     after a reload; the two are told apart by the structured components
     (`boundary`, `window_detail`). Alternative: a distinct disposition.
135. **Settle guards on the switch (review S-L1, G-M3).** Default: only
     Post A's Transmit is guarded inside the continuation; Post B's
     Transmit and the bench's first card are not, so a carried press can
     record a switch but never a retry. Alternative: guard all three.
136. **The cap's feedback lines (review S-L3).** Default: "The salvage
     tally is closed for this shift." / "The uplink log is closed for this
     shift." appear at the cap wherever the participant is, which shows
     that such windows close by themselves (the rig precedes the sensor
     post and the uplink). Alternatives: no line; a line only when the
     station is next opened.

The U13 (M02) implementation took the following defaults; each is
reversible, none changes the register formula (requests whose first
committed answer is the requested case / 6; Cannot locate = incorrect).

137. **Tray contents during the requests — RESOLVED by the research
     owner, 28 September.** Question as raised (U13 implementation and
     review S-H1): every tray and the intake stayed visible with their
     code badges while the requests ran, so a request could be answered
     by reading the badges and the primary might sit at its ceiling and
     depend little on the layout; alternatives listed were closing the
     trays, hiding the badges, or more cases than can be read at a
     glance. RULING: during the six requests preserve the
     participant-created organisational state — the frozen spatial
     layout exactly, folders and grouping, the participant's own labels —
     and do not leave system-provided answer-revealing information
     visible at the same time: hide or neutralise the system-supplied
     case code badges and the directly readable case contents. Do not
     reorganise, relabel or improve the workspace for the participant; no
     model filing system; no designer-defined categorisation; the
     participant's own cues are never removed to raise difficulty;
     factual feedback after the first committed answer stays as the U13
     procedure specifies it. The approved primary, its first-response
     semantics and its denominator are unchanged and no new primary
     variable is created. Intent: the observation must depend on whether
     the participant created and can use a traceable personal
     organisation; it must not become a pure arbitrary-memory test —
     memory demand is retained as an explicit rival explanation.
     Implemented as the §4 record's "retrieval condition".
138. **The balanced order.** Default: six orders forming a 6 × 6 Williams
     square (every case at every position once, every ordered pair
     adjacent once), one assigned per session by a deterministic hash —
     not an enforced equal split; the intake form (`form_a` /
     `form_b`) is drawn independently. Alternatives: two orders bound to
     the form; an enforced block allocation at launch.
139. **One press is the answer.** Default: selecting a slot that holds a
     case is the first answer at once (no confirm step), so a slip is an
     incorrect first answer; the 400 ms settle window and the cleared
     focus guard against carried presses only. Alternative: a confirm
     step per answer ("Hand over this case?").
140. **An empty slot.** Default: recorded (`empty_slot_selected`) and not
     an answer. Alternative: an incorrect first answer.
141. **Cannot locate.** Default: one control ("CANNOT LOCATE (N)"),
     available from the first request, never pre-focused, guarded by the
     same settle window; it is an incorrect first answer inside the
     denominator. Alternatives: available only after a delay or after a
     first look at every tray; a different label.
142. **An interrupted series (review S-M3).** Default: the review closes
     the workspace with the answers as they stand — the value is exported
     with its own denominator under `incomplete` and `censored`; a
     request that was presented and never answered is missing. None
     answered after a handover ⇒ null `voluntary_stop`; never handed over
     ⇒ null `no_eligible_event`. Both labels strain their definitions:
     the workspace has no stop control (the review closed it), and
     "never handed over" is a task left part-way rather than a task with
     nothing to observe; both rows are `censored` and carry
     `closure_reason: closed_at_review`. Alternatives: null below six
     answers; `incomplete` with a zero denominator; a dedicated
     disposition for "left part-way".
143. **The deferred feedback.** Default: after the sixth answer every
     participant sees the same kind of record — per request what was
     selected and, when it was not the requested case, where that case
     was ("matched" otherwise: a statement per line, which is the
     approved corrective feedback) — without a count, a total or praise;
     it stays readable when the
     workspace is reopened. Alternatives: a count only; no feedback at
     all; the record only on request.
144. **A technically inaccessible request.** Default: a requested case the
     frozen layout does not hold is excluded (`request_inaccessible`);
     the row is then `incomplete` on five. The register's approved
     denominator text is unchanged; this rule is a provisional default of
     the extractor. It cannot arise on the route
     (cases are bound to the workspace's containers). Alternative: void
     the whole series.
145. **What the latency contains.** Default: focused time from the
     request's presentation to the first answer — reading, searching and
     moving the focus included; paused while the workspace is closed and
     during a lost focus or a hidden tab; no time limit and no cap.
     Keyboard answers include arrow presses, so latencies are exported
     with their input mode and are not comparable across modes.
     Alternatives: a cap per request; a pointer-only or keyboard-only
     analysis set.
146. **The layout companion.** Default: `m02_filing_layout` was added to
     the machine-readable register as a third feature row (the register's
     "filing choices"), observed once the workspace was handed over.
     Alternative: keep the layout in the primary's components only.
147. **Organising is optional.** Default: a handover with every case
     still on the intake tray is valid and the requests run over that
     layout (`cases_left_on_intake` recorded); nothing requires a case
     to be filed or a tray to be labelled. Alternative: require every
     case to leave the intake before the handover.
148. **Presented and never opened.** Default: `declined` once the Work
     Order Board has listed the workspace (the §5.13 default);
     `not_presented` only when the orders were never taken.

The U13 independent reviews (scientific + gameplay, read-only) surfaced
the following; defaults applied, reversible, none changes the formula.

149. **Whether the primary can be read (review S-H1) — RESOLVED with
     §5.137, 28 September.** As raised: with every code badge visible
     the count might reflect visual search more than the layout, and the
     row was marked "values not to be read until §5.137 is decided".
     With the ruling implemented the marking is withdrawn from the
     register, the matrix, the addendum and `registerV3.ts`; the row is
     read as any other prototype output of this run (no validity claim),
     with memory for one's own layout recorded as a rival explanation.
     The ruling settles what is visible; that the marking falls with it
     was the implementer's reading (review S3-L5) and was listed for the
     owner's confirmation. CONFIRMED by the research owner, 28 September
     (recorded at the start of U14 as a carry-forward from U13; the U13
     implementation and its commit `d8b4d94` are unchanged): "the
     withdrawal follows from the ruling. The ruling governs the
     information available during the retrieval decision —
     system-supplied case codes, kind icons and case-name/detail content
     are concealed; the participant's own organisational structure and
     labels remain legitimate cues that participants may read and use."
     This confirmation settles only the confirmation sentence of this
     entry; §5.139, §5.142, §5.150–§5.153 and §5.158–§5.161 remain
     separate owner questions.
150. **The record and the later Organisation items (review S-M5).**
     Default: the record is shown straight after the sixth answer, in
     episode 2 — before the second M01 batch, press B and any later
     Organisation opportunity — and the order of the Workshop stations
     inside episode 2 is the participant's own (recorded in the entry
     snapshot, not controlled). Alternatives: no record; a count only;
     the record held back until the last Organisation item has closed; a
     fixed station order.
151. **The keyboard path (review G-M4).** Default: the focus is cleared
     with every request and the first arrow lands on the first intake
     slot; UP / DOWN stay inside a grid, so the farthest slot costs about
     22 presses. Alternatives: UP / DOWN across grids (a change to the
     shared overlay); resume at the last position (changes what the
     latency contains, §5.145).
152. **The settle window and a slow double click (review S-L1, G-M2).**
     Default: 400 ms; a second click 400 ms or later after an answer is an
     answer to the next request (a slow double click on one slot, or on
     Cannot locate, records two answers). Alternatives: a longer window;
     refusing a repeat of the same control within about 600 ms.
153. **The handover (review G-L1, G-M1).** Default: one press (the button
     or C), no confirm step, no advance statement that requests follow or
     that the layout is then fixed; after it a drag is told "The layout
     is fixed after the handover." and nothing states that the first
     selection is final. Alternatives: a confirm step; a line before the
     handover; a line with the first request.
154. **One request per case (review S-L6).** Default: as approved — a
     later request for a case the participant already selected reveals
     that the earlier answer was not the requested one. Alternative:
     none inside the approved design; recorded as a limitation.
155. **The label vocabulary and the v2 layout counts (review S-L7).**
     Default: the six labels of v2 (four name the case kinds) and the v2
     raw counts (`misfile_count`, `untraceable_case_count`,
     `duplicate_count`) are kept in the layout companion; they read the
     participant's own labels through a fixed label-to-kind table and
     their names are evaluative. Alternatives: neutral names; free-text
     or kind-neutral labels; drop the counts and keep the locations.
156. **The time spent on an unanswered request (review S-L5).** Default:
     exported in the primary's components as censored time
     (`open_request_focused_ms`), never as a latency. Alternative: a
     censored entry inside the latency companion.
157. **A caveat the export cannot carry (review round 2, S2-M1) — no
     longer applicable, 28 September.** As raised: the "values not to be
     read" marking existed in the documents only and the exported row
     carried no flag. The marking was withdrawn with the ruling on
     §5.137, so no caveat is left to carry. The general question —
     whether a feature row should be able to carry a machine-readable
     reading caveat (M17 still has a documents-only one, §5.87–5.88) —
     stays with the owner.

The reviews of the tree after the owner's ruling (scientific + gameplay,
read-only) surfaced the following; defaults applied, reversible, none
changes the formula or the ruling.

158. **The label words and the banner's kind word (review S3-M2).**
     Default: unchanged — four of the six labels on offer name the four
     case kinds and the banner names the requested case with its kind
     ("Supply note K-03"). With the cases closed the participant's
     labels are the main cue on screen, so a participant who adopts the
     offered words files by the designer's kinds; the label is still
     their own choice, and the ruling excludes a designer-defined
     categorisation exercise. Alternatives: kind-neutral label words;
     free-text labels; a banner showing the code only. Extends §5.155.
159. **A closed case invites a click to open it (review G3-M3).**
     Default: a left click on an occupied slot is the first answer, as
     before; nothing states that the first selection is final, and with
     the cases closed a click meant to look inside is recorded as an
     answer. Alternatives: a line with the first request; a confirm
     step. Extends §5.139 / §5.153.
160. **The record's wording (review G3-L3).** Default: "n. <requested>:
     selected <selected> — it was in tray n", where "it" is the
     requested case; with the cases closed the record is the
     participant's first sight of what they selected. Alternative: name
     the requested case twice. The record is the item's only feedback,
     so its wording is the owner's.
161. **Six answers that depend on each other (review S3-M1).** Default:
     one count over six requests, as approved; with the cases closed the
     answers constrain each other (exclusion of slots already selected;
     cases filed together) — stated in the §4 limitations. Alternative:
     treat the requests as dependent in analysis; report the count with
     the layout companion.

The U14 (M03 / M04) implementation took the following defaults; each is
reversible, none changes a register formula (tools in their marked home
at the first departure / 6; pieces not disposed at the first departure,
carried pieces included / 6).

162. **M03: the movement is taught on every occasion.** Default: moving
     the label roll from ROLL SUPPLY to PRESS FEED is a required step of
     the press run on Press A and on Press B, so both occasions start
     alike and a participant who meets Press B without Press A is taught
     too. The matrix names "movement practice before occasion A".
     Alternatives: practice before occasion A only; a separate practice
     outside the press.
163. **M03: the marked home.** Default: one labelled container (TOOL
     RACK, three slots); a tool in any rack slot is restored; no slot
     belongs to one tool. Alternatives: a marked slot per tool (with
     "homes correct" kept beside "tools restored"); more slots than
     tools.
164. **M03: the first departure.** Default: the participant's first close
     of the panel with the tools out; the occasion is terminal afterwards
     (no later state exists); the 2000 ms exposure floor of the v2 route
     is recorded (`exposure_sufficient`, on focused time) and never
     invalidates. Alternatives: an exposure floor that excludes; the
     panel stays reopenable and the first room exit is the departure.
165. **M03: when the tools appear.** Default: on the completion of the
     run, at three fixed slots; the rack is visible and empty from the
     first open; the same three tool kinds on both presses. Alternatives:
     the tools start in the rack and are taken out by the run; different
     tools per press.
166. **M03: the threaded roll.** Default: from the first cycle on the roll
     stays in the feed and cannot be lifted ("The roll is threaded into
     the press.", recorded). A participant who tries to put the roll back
     is refused just before the tools appear (review S-L10).
     Alternatives: the roll is consumed by the run; a silent refusal.
167. **M03 / M04: what "reachable" means.** Default: M03 — checked on the
     model (the tool at its slot, the rack accepts it and has room); M04
     — every piece of the job has a drawable icon. Neither checks
     rendered pixels or a walking path; the places themselves are the
     audited ones. Alternative: a rendered-frame check.
168. **M04: what counts as a departure (review S-M7, G-H1).** Default:
     any other station opened — a station that only answers with a
     refusal, and the Work Order Board, included — or the room left;
     walking away, collecting a supply bundle, the backpack and the map
     are not. The station is exported with the trigger. Alternatives:
     only stations that open a surface; a distance or a time criterion;
     the room exit only.
169. **M04: the second coupon (review S-M1, G-M5).** Default: available
     only after the first job's departure, so each job has a departure of
     its own; the cut states "The cutter re-arms while you work another
     order." to everyone, and the beacon leaves the cutter at the cut and
     returns when the second coupon is available. The line and the
     beacon cue the departure that closes job 1; the second cut carries
     no such line, so the jobs differ in the cue (review S2-L8), and the
     line shows for the 2.2 s of every feedback line, so its exposure
     depends on reading speed (review G2-M4 — the display time lives in
     shared room code outside this unit).
     Alternatives: the second coupon available at once, the first job
     closing when the second is cut; no line; a second cutter.
170. **M04: the press at the cutter (review S-H1, G-H2).** Default: with
     no coupon waiting, SPACE / E at the cutter lifts the nearest piece
     within 64 px or drops the carried piece when the bin is within 96 px
     (the v2 rule); a press inside 1.5 s of a cut is refused. A lifted
     piece cannot be set down. Every pick-up keeps its origin.
     Alternatives: a set-down command; no pick-up through the cutter's
     prompt; a longer settle window.
171. **M04: a press at another station (review G-H1).** Default: while a
     job is open, a press at another station lifts a piece that lies
     nearer the avatar than that station (or drops the carried piece into
     a bin that lies nearer than the station) instead of opening the
     station — otherwise a keyboard pick-up beside the Component Locker
     or a press would open that station and close the job. Only pieces of
     the open job are lifted this way (review S2-M3); outside a job's
     window the stations answer first. The rule turns the error round for
     a participant who wanted the station: the press lifts a piece
     without a line, and the next press opens the station with the piece
     in hand (review S2-M1, G2-M1). Alternatives: move the pieces clear of every station;
     stations always first (pick-up by pointer only there).
172. **M04: a job never run.** Default: `not_presented`, as the register
     row states ("a job never run is not presented"), also when the work
     orders listed the coupons (`cutter_listed` exported). This differs
     from the run's general default (§5.13, §5.148: listed and never
     opened ⇒ `declined`) and from M03 beside it. Alternative: `declined`
     once listed.
173. **M04: the six places (review S-M4, G-M3, G-M4).** Default: the
     places of the v2 scatter, shared so that the two jobs are matched on
     the summed straight-line distance to the bin (440.5 / 444.3 px); not
     matched piece by piece, on the keyboard reach or on the nearness of
     the Component Locker; three places on painted art (review G2-M3: the
     swarf tray of job 1 lies on the locker's top edge); one among the
     supply bundles. Alternatives: new places clear of stations
     and art (needs a new audit of the Workshop); matching on reach.
174. **M04: the cutter's shift (review S-M5, G-L7).** Default: the cutter
     cuts while the route stage precedes the return, so neither job
     lies in the return shift; a cut before the orders are taken or after
     the sign-off is possible and carries its stage (review S2-L6,
     G2-L5). Alternatives: the restoration shift only (`workshop_work`);
     no gate, the stage exported only.
175. **The companions as feature rows.** Default: `m03_object_states` and
     `m04_job_values` were added to the machine-readable register as
     provisional companion rows (object-valued; the register's "object
     states" and "per-job values"). Alternative: keep them in the
     primaries' components only (precedent §5.146).
176. **The families.** Default: new candidate families `proto_m03tools_`
     and `proto_m04_cutting_`; the v2 families are retired from the
     route and keep their v2 meaning; the Inventory Lab press workstation
     is untouched. Alternative names are the owner's.
177. **Zero denominators and disagreement.** Default: precedence
     `interrupted` > `technical_failure` > `no_eligible_event` >
     `declined` (M03) and `interrupted` > `technical_failure` (M04); a
     held-back occasion or job beside an observed one ⇒ `interrupted`
     with the value kept; one occasion or job whose record disagrees with
     the raw events voids the whole row (review S-L7). Alternative: keep
     the reproducible occasion or job and exclude the other.
178. **A closure by the system (review S-M2, S-M6).** Default: a press
     panel stopped by the system with the tools out, and a cutting job
     still open at the review, had no departure — their state is recorded
     apart (`state_at_system_close`, `state_at_review`), censored and
     excluded from the primary. Neither arises on the ordinary route (the
     panel is modal; the review is reached through a room exit).
     Alternative: read the state at the review as a value (the v2 rule).
179. **After a reload (review S-L1, S-L3).** Default: M03 — an occasion
     whose tools lay out earlier is never re-run; one whose panel was only
     opened earlier is run, with the exposure on record. M04 — once an
     earlier load holds a cut, neither job is run. Alternative: block
     every occasion that was touched earlier.
180. **Effort by input mode in the press panel (review G-M2).** Default:
     TAB / SHIFT+TAB jump between the trays (the press panel only);
     restoring three tools costs 12 key presses (16 with TAB alone) against three
     drags; the input mode of every move is exported. Alternatives: a
     quick-transfer key; analysis by input mode.
181. **The `m04_debris` key of other items' entry snapshots (review
     S-L5).** Default: the key is kept and now holds the cutter's site
     status. Alternative: one key per job.
182. **Names and highlights on the measured objects (review S-L9).**
     Default: the rack and the bin carry plain names ("TOOL RACK",
     "disposal bin"), a disposal is answered "Disposed." and the bin is
     highlighted while a piece is carried within its reach (the pointer
     layer of the v2 route). No line asks for tidying or disposal.
     Alternatives: no names; no highlight.
183. **What the M04 times contain (review S-L8).** Default: focused time
     from the cut; the clock pauses on a lost focus or a hidden tab and
     keeps running while the backpack or the map is open. Alternative:
     pause under every overlay.

The second review round (scientific + gameplay, read-only) surfaced the
following; defaults applied, reversible, none changes a formula.

184. **A piece lifted by a press meant for a station and then disposed
     (review S2-M1).** Default: counted as a disposal like any other and
     flagged beside the value (`pickups_by_station_press`,
     `disposed_by_or_after_station_press`; every act keeps its
     `origin`). Alternatives: exclude such disposals; exclude the job.
185. **A press at a station with a piece carried (review S2-M2, G2-M2).**
     Default: the piece is dropped into the bin only when the bin lies
     nearer the avatar than the station; otherwise the station opens and
     the piece is carried at the departure. Alternative: a station always
     answers first while a piece is carried.
186. **The cut before everything else (review S2-L7).** Default: once the
     second coupon is available a press at the cutter cuts it, also with
     a piece carried or a leftover piece in reach, so job 2 can begin
     with hands full (recorded). Alternative: the press acts on a piece
     first.
187. **A system closure beside an observed occasion or job (review
     S2-L4, S2-L2).** Default: `incomplete` with the value and
     `censored` for a closure by the review; a press panel stopped any
     other way is a technical failure (no closure reason exists for a
     stop). Alternative: `interrupted`, as for a held-back one.
188. **After a reload, what was not reached yet (review S2-L3).**
     Default: an occasion or a job without evidence in the current load
     reads as held back — also Press B before the return shift and a
     second coupon never cut — so the row is `interrupted` with the value
     kept (the M01 rule, applied to both items). Alternative: only what
     the guard actually held back.
189. **The companion beside a null primary (review S2-L1).** Default:
     the state description is `observed` whenever an occasion or a job
     left a record (a run never completed, unreachable tools, a closure
     by the review), as the M02 layout and the M11 records are.
     Alternative: the primary's disposition on both rows.
190. **Leftover pieces and the press of the return shift (review
     G2 flag 5).** Default: pieces left at the cutter stay where they
     lie through the return shift and are visible from Press B; M03's
     entry snapshot holds the cutter's site status only. Alternatives:
     the pieces lying in the snapshot; the floor cleared between the
     shifts.
191. **Lines on a keyboard act (review G2-L2, G2-L3, G2-L7).** Default:
     a keyboard pick-up shows no line (as the pointer's does not); a
     keyboard press with a piece carried and the bin out of reach shows
     none where the pointer shows "Hands full."; on open floor a supply
     bundle in reach that lies nearer than a piece is collected first;
     after a jammed first cut the next cut is announced as coupon 2 of 2. Alternatives: the same line in both input modes; a line naming
     the lifted piece (it would make the pieces salient).
192. **A prompt naming a bundle while a nearer piece is lifted (review
     G3-L1).** Default: on open floor the press acts on whichever lies
     nearer — a supply bundle in reach or a piece in reach; where a piece
     is the nearer one the prompt still names the bundle (about the east
     half of the sample kit's reach while the second job's blade wrap
     lies on the floor), and the pick-up is exported with the origin
     `open_floor_press`, so it cannot be told apart from a pick-up made
     where no prompt was shown. Alternatives: no bundle prompt while a
     nearer piece lies in reach; the prompted bundle always first (this
     shortens the keyboard reach of that piece).
193. **Occasions and jobs without evidence inside the row (review S3-L1,
     S3-L2, S3-L5).** Default: an M03 occasion that was never presented
     (a participant who does not come back to the Workshop after Vale's
     check-in) is read from the companion (`o2: null`) and from the
     disposition `incomplete`; the components of the primary carry no
     list of absent occasions, where M04 exports `jobs_not_run`. After a
     reload a family without any event yields `interrupted` with the
     default censoring fields, a family with a listing or presentation
     only yields `interrupted` with `censored: true` and a reason. The
     two M04 flags are summed over every job with a record, observed or
     not; the lists per job are in the companion. Alternatives: a list
     of absent occasions in the M03 components; the same censoring
     fields on both reload paths; flags summed over observed jobs only.
194. **Lines after a stop or a jam (review S3-L4, G3-L2).** Default: a
     press whose panel was stopped by the system answers "Label press
     idle. The batch is done." afterwards, and after a jammed cut a press
     at the cutter with nothing in reach answers "Both coupons cut. The
     cutter is idle." — both only after a technical failure (not
     reachable on the ordinary route), neither changes a record.
     Alternatives: "out of service" after a stop; "The cutter is idle."
     unless both jobs produced their pieces.
195. **What a press names and acts on (U14-C; supersedes the defaults
     of §5.191 and §5.192 on the owner's instruction, their text kept
     above).** Default: the line above the avatar names the piece or the
     bin wherever a press acts on one, in the station grammar ("Take
     <piece>", "Use disposal bin"). Consequence to be judged by the
     owner: a keyboard user now SEES a line naming a piece in reach and
     the bin in reach — a cue Unit 14 did not show (it lifted the piece
     under the cutter's or the bundle's name, or with no line). The line
     asks for nothing and appears for the bundles and stations in the
     same form; whether it makes the pieces more salient than the
     pointer's hover cue is not known. Alternatives: no line for a piece
     (the press would then act without a named target); one line for
     every loose object.
196. **Immediate closes of the press panel (carried forward).** An M03
     panel closed at once may reflect that the tools were not perceived,
     not a choice. The 2 000 ms marker (`exposure_sufficient`) is a
     recorded fact taken over from the v2 route; it is not a validated
     threshold and excludes nothing. Not changed.
197. **What M04 measures, and the two cues (carried forward).** M04
     measures disposal BEFORE the first departure from the task or
     station. The first job's line ("The cutter re-arms while you work
     another order.") encourages that departure and differs from the
     second job's line; the jobs are therefore not administered under
     the same cue. Not changed (cue and re-arm rules are the owner's).
198. **Keyboard and pointer (carried forward).** Both input modes reach
     every object; this does not establish equal effort or equal
     opportunity (about 12 key presses against three drags for three
     tools; a carried piece is walked to the bin in both). The input
     mode is recorded on every act.
199. **No reversible set-down (carried forward; §5.170).** A lifted
     piece can be disposed of or carried, not set down again by the
     participant; a lift made by mistake can only end in a disposal or
     in a carried piece at the departure. Unresolved; not changed.
200. **Repeated occasions are not independent situations (carried
     forward).** The second press occasion and the second cutting job
     follow the first and can contain learning and carry-over; six
     objects are not six independent observations. The register's
     independence classifications are unchanged.
201. **Leftover pieces and participation (carried forward).** Pieces
     left by job 1 lie in the room during job 2 and during later
     opportunities (§5.190) and may influence them. Missingness may
     depend on task participation (a job never run, a press never
     opened, a participant who does not return to the Workshop), so a
     null is not missing at random by construction.
202. **Pooling the two administrations.** Default: sessions under
     `m03-tools-v1` / `m04-cutting-v1` and under `-v2` are told apart
     by `entry_state_version` and are not pooled by any code; a v1 log
     that lacks its opening, repeats a disposal or names other objects
     now reads `technical_failure` where Unit 14 read a value.
     Alternative: the owner declares the versions equivalent for a
     stated analysis.
203. **Empirical validation pending.** Response-process evidence,
     reliability and convergent / discriminant evidence for M03 and M04
     do not exist. "Technical correction verified" (U14-C) states that
     the records are reproducible and the interface acts on what it
     names; it states nothing about what the values mean.
204. **Event rates of the two administrations (review S-M1, S-L1; adds
     to §5.202).** Under `-v2` a keyboard act on a piece where the
     cutter is in range writes no `pilot_station_opened` for the cutter,
     and a press on open floor with the hands full shows "Hands full."
     where `-v1` showed nothing. Neither is read by an extractor; both
     differ between the versions.
205. **The Component Locker's approach during job 1 (review G-M1;
     unchanged from Unit 14, §5.171, §5.173, §5.184).** The locker's
     audited approach (310, 250) lies 19 px from the first job's coupon
     offcut, and the swarf tray lies 13 px from the locker's anchor: with
     empty hands a press there names and lifts a piece, and the locker is
     opened by keyboard only from where it is the nearer one. A lifted
     piece leaves the hands only through the bin or stays carried.
     Pick-ups with the origin `station_press:storage_locker` and the
     disposals that follow may therefore be caused by the route, not
     chosen; they are counted and flagged
     (`pickups_by_station_press`, `disposed_by_or_after_station_press`).
     Places, the yielding rule and a set-down command are the owner's.
     The reviewer's statement that the locker opens from its west rim
     only is inferred from the floor layout and was not measured.
206. **Keyboard reach of leftover pieces while coupon 2 waits (review
     G-L5; unchanged from Unit 14).** The first job's blade wrap lies
     7 px from the cutter's anchor: while the second coupon is waiting a
     press within its reach is the cutter's and cuts. The pointer
     reaches it; the keyboard reaches it again once coupon 2 is cut.
207. **What is highlighted (review V-M1, V-M2; the pointer layer is
     unchanged).** With a piece carried and the bin in reach the pointer
     layer outlines the bin (its drop-zone hint, as in Unit 14); no
     piece, station or bundle is outlined. A line naming a piece is
     raised above the figure when it would fall across it and then
     stands away from the piece; two pieces of one kind (one per job)
     carry the same name. Whether the bin's outline or the distance of
     the line changes what is noticed is not known.
208. **Lines and their form (review G-L1, G-L2, G-L3, V-L1, V-L4).**
     Default: on open floor a piece in reach is named while the hands
     are full and the press answers "Hands full." (both lines can be on
     screen together); a bundle reads "E — Take …" (every pilot zone,
     unchanged) beside "E / Space — Take …" for a piece; piece and bin
     names are lower-case (Unit 14, §5.182) beside the stations' title
     case; on the label press a tool held by keyboard is drawn over the
     focused cell and covers a tool lying in it when the arrow keys
     focus an occupied cell (TAB never lands on one). Alternatives: no
     line for a piece the hands cannot take; one grammar for every
     prompt; the held tool beside the cell.
209. **The presentation after a reload (review S-L3).** Default:
     `presented_by: earlier_page_load` when an earlier page load of the
     identity holds the occasion's `presented`; what presented it then
     is read from that load's events. Alternative: carry the earlier
     value over.
210. **M02 response clarity (U13-C; supersedes the one-press defaults
     in §5.139, §5.152, §5.153 and §5.159 for new sessions only).**
     Administration `m02-retrieval-series-v2` states before HAND OVER that
     the layout will lock and six requests will follow. During a request,
     selecting a closed case or CANNOT LOCATE opens a neutral confirmation;
     only SUBMIT commits the first answer. CANCEL or ESC leaves the same
     request open without an answer. A press within the existing 400 ms
     settling interval is still refused at selection time, so waiting in
     the confirmation cannot turn a carried press into an answer. Pointer
     and keyboard both have submit and cancel paths. The requests, order,
     participant-created layout and labels, concealed system case
     information, deferred feedback, first-committed-answer rule and
     correct-first-retrievals / 6 primary are unchanged. The focused
     answer time now includes the confirmation step. Version `-v1` and
     `-v2` are not assumed interchangeable in analysis; no raw log or
     earlier result is rewritten. The fixed label vocabulary (§5.155,
     §5.158), six dependent answers (§5.161) and input-mode cost (§5.151)
     remain pilot limitations, not resolved by this interface correction.

The U14-D correction of the M04 administration (`m04-cutting-v3`) is
governed by the owner's U14-D contract and by the owner's rulings of
30 September 2026 on the first independent review. The rulings are
APPROVED U14-D ADMINISTRATION DECISIONS — they are recorded here as
such, not as decisions pending. None changes a formula, a denominator,
a direction or a missingness rule, and none establishes validity. The
first pass's defaults are kept below only where a ruling refers to
them. Open for the owner: §5.219 (blocked), §5.220, §5.221.

211. **What a first departure is (U14-D; owner ruling 1, approved;
     supersedes the first pass's default and, for new sessions, §5.168,
     its text kept above).** Opening and closing another station's
     panel is no departure. The first departure is the room left, or
     the first accepted, task-specific action that successfully changed
     the other task's recorded state — created a genuine attempt or
     active-work state, recorded progress, consumed, placed or
     manipulated an eligible task object, recorded an explicit task
     decision, or completed a legitimate one-action task. The
     transition must have succeeded before the departure is written.
     The first pass's default (a surface opened and closed at once is a
     departure) is withdrawn. Implemented: §4 "Unit 14-D" (6) and its
     table; no file outside the allowlist was needed.
212. **Disposal needs a deliberate transition; the places (U14-D; owner
     rulings 2 and 3, approved).** Ruling 2 — lifting a piece never
     names the bin; the bin becomes eligible after the pick-up's
     activation is over and every interaction key is released, and the
     participant acquired the bin as a new target; a pointer pick-up
     and a click on the bin are separate gestures; a continuous drag to
     the bin may remain — is implemented (§4 (3)). It withdraws the
     first pass's consequence (b) (the bin's line and outline shown as
     soon as a piece is lifted). Ruling 3 — every pick-up position
     outside the bin's automatic reach, two non-interleaved clusters,
     matched routes — is NOT implemented: blocked, §5.219. Consequence
     (a) of the first pass stands with the unchanged places: every
     place lies within about 115 px of the bin, so carrying costs a few
     steps at most, less than under v1 / v2 (97–212 px, round the
     island).
213. **Set-down (U14-D; owner ruling 5, approved; resolves the
     mechanism left open in §5.170 and §5.199).** Neutral and available
     whenever a piece is carried: "X — Set down", beside the
     carried-item line in the local action hierarchy, a legible pointer
     target with feedback while it is targeted; the original place
     restored; the piece undisposed; the existing `piece_put_back`
     event; the first-departure record immutable; neutral failure
     feedback; keyboard and pointer; the X handler in the project's key
     guard; the pointer latch cleared at a release inside and outside
     the canvas. Implemented: §4 (4). The first pass's control in the
     lower left of the screen is withdrawn. Not known: whether the
     control makes the carried state, or the absence of a disposal,
     more salient.
214. **The cutter's status and the second coupon (U14-D; owner ruling
     4, approved).** Both cuts are answered "Sample coupon N of 2
     cut."; the status shown when the participant checks a cutter with
     no available job reads "No cutting order is available." and tells
     nobody to leave, to clean or to begin other work. Unchanged rule:
     the second coupon is available after the first job's departure.
     Because a panel shown, a board read or a refusal closes no job, a
     participant who does no other work and does not leave the room is
     not offered the second coupon; the row then reads `pending` /
     `incomplete` by the unchanged rules.
215. **Pooling the three administrations (adds to §5.202, §5.204).**
     `m04-cutting-v1`, `-v2` and `-v3` differ in the places, the
     carrying cost, the lines at the cut, the set-down, what a press at
     a station does, when the bin is named and what closes a job. They
     are told apart by `entry_state_version` and pooled by no code;
     equivalence is not claimed.
216. **The extractor and piece events without a recognised object
     (outside U14-D; unresolved; a separate later unit by owner ruling
     6).** `src/measurement/features/m04.ts` leaves out of a job's
     recount every `piece_picked_up`, `piece_put_back` and
     `piece_disposed` event whose `object_id` is missing or is not one
     of the job's three pieces, although the event names the job. A
     malformed stream can therefore keep an accepted observation. The
     file was not changed. U14-D does not resolve it.
217. **The Work Order Board and the seal log (U14-D; owner ruling 1,
     approved).** The board inspected, its orders taken and its
     sign-off are no departure; the optional filter swap qualifies only
     after its accepted state transition succeeded; the seal log read
     or closed is no departure; its acknowledgement qualifies only
     after the transition from unacknowledged to acknowledged
     succeeded. Implemented and browser-tested (unit log).
218. **Refusals, records and reload holds (U14-D; owner ruling 1,
     approved; supersedes the first pass's default).** A refusal, an
     unavailable action, a closed or record-only surface, a
     prior-administration guard, a reload hold and a no-op are no
     departure. The first pass asked the windows' own availability
     checks in the scene; those copied predicates are removed — the
     scene reads the other task's recorded work, which none of these
     paths changes. Browser-tested: two refusing presses, a released
     packet shown as a record. NOT exercisable with a cutting job open:
     a reload hold — after a reload that follows a cut neither job is
     run again (register §5.14), so no job is open while a station is
     held back. Pure and browser tests do not cover a reload (as under
     U12 and U14).
219. **The places — BLOCKED (U14-D; owner ruling 3; open for the
     owner).** Ruling: every piece positioned so that the avatar's
     actual keyboard and pointer pick-up positions lie outside the
     bin's automatic interaction reach, validated from reachable avatar
     positions; two visually coherent, non-interleaved clusters;
     comparable walkable routes; if six such places cannot fit without
     changing an out-of-scope anchor or layout file, stop and report.
     Measured (pure test `m04_cutting`, "measured from every reachable
     avatar position"; the scene's collision rule on a 4 px lattice
     walked from the spawn): a piece is lifted by keyboard from within
     64 px and by pointer from within 96 px, the bin answers within
     96 px — so a place needs about 160 px (keyboard) and 192 px
     (pointer) to the bin (492, 235) unless walls bound the positions.
     The machine bay's floor ends 116 px east of the bin (the wall at
     x 608); west of the bin, the floor within sight of the cutter lies
     inside the 72 px ranges of the cutter, the presses, the Case
     Workspace, the Component Locker and the Relay Bench, or within
     reach of the three supply bundles. Two patches remain from which
     every pick-up position lies outside the bin's range: beside Label
     Press B (x 328, y 176–180; about 30 px from the press's anchor,
     81 px from the cutter) and the south-west corner under the Relay
     Bench (x 96–112, y 288–316; 292 px from the cutter). Each holds
     one piece. The records office (the other bay) has clear floor
     inside its west doorway and in its north-west corner (within x
     700–844, y 132–316), about 310 px and more from the cutter and
     out of its sight (scratch measurement of the writer, the same
     rule; not part of the pure test). Nothing was moved and nothing
     weakened: the six places are those of the first pass (§4 (1)), so
     the required "non-interleaved clusters" and "pick-up outside the
     bin's reach" are NOT met and the screenshots of the two layouts
     show the interleaved places. What the gate of ruling 2 already
     guarantees with these places: no line and no outline for the bin
     after any pick-up (browser-tested for all six pieces, both modes).
     What it does not: a participant who lifts a piece within the
     bin's range must walk out of it and back in (or press the bin by
     pointer) to dispose — an administration cost that differs by
     place. Alternatives for the owner, each outside this unit's
     rulings: (a) another bin anchor or scatter origin / another room
     layout (`src/pilot/zoneSites.ts`, `src/world/layouts/workshop.ts`
     — outside the allowlist); (b) shorter reaches for the bin and for
     the pointer pick-up (in the scene; with 64 px for all three, part
     of the lane west of the island and small patches at the east wall
     open up — whether two matched clusters of three fit there was not
     established); (c) the pieces in the records office, out of sight
     of the cutter.
220. **Cases the rulings do not name (U14-D; the writer's application
     of ruling 1; for the owner's confirmation).** (a) Inside a
     multi-action surface a reading is no departure: the Dispatch
     Console's reference consulted, the lattice's help sheet, the Relay
     Bench's plate and manual, the report desk's register, the feed
     console inspected — by the ruling's sentence that a surface which
     displays work is left by "its first accepted manipulation, answer,
     placement, or decision". These acts are recorded by their tasks
     and could be read as "changes the other task's recorded state".
     (b) An object only lifted inside a panel (a case, a tool, a card,
     a lattice piece, an inventory item) is no departure; its placement
     is. (c) The questionnaire notice at the Outbound Handover Desk,
     read or acknowledged, is no departure: the owner classified the
     seal log's acknowledgement, not this one; no job can be open there
     on the ordinary route. (d) A calibration stage and an indoor feed
     stage are read when the task records them (the calibration stage
     at the press; the feed stage when it is done). (e) The Component
     Locker opened again after its first use is left by the first
     change of what it holds.
221. **Where the set-down control is drawn (U14-D; owner ruling 5;
     limit recorded).** The ruling asks for a place beside the
     carried-item status that avoids covering room artwork and is not
     a far corner. The control follows the avatar and takes the first
     of five places beside it that covers nothing (§4 (4)). The machine
     bay is dense: on the lane above the cutter island no place beside
     the avatar is free of the island, the bin, the presses and the
     wall, and the control takes the place that covers least. It is
     never drawn in a corner of the screen.

The U14-D2 correction (`m04-cutting-v4`) is governed by the owner's
U14-D2 contract of 30 September 2026 — which approves the annex geometry
coordinate by coordinate — and by the owner's confirmations of the same
day. They are APPROVED U14-D2 ADMINISTRATION DECISIONS, recorded here as
such. None changes a formula, a denominator, a direction, a missingness
rule, an event name or a field, and none establishes validity.

222. **The places — RESOLVED by the cutting annex (U14-D2; owner
     contract, approved; closes §5.219).** The owner chose alternative
     (a) of §5.219 in a specific form: a 13 × 6-tile annex south of the
     machine bay for the cutter and the bin, a 64 px doorway in place
     of the decorative tool bench, the room 43 × 19 tiles, one 64 px
     reach for the keyboard pick-up, the pointer pick-up and the bin,
     job 1's pieces west of the cutter and job 2's at the mirrored
     places east of it, every pick-up position more than 76 px from
     the bin anchor. Implemented exactly as approved: §4 "Unit 14-D2"
     (1)–(3). Ruling 3 of 30 September (pick-up positions outside the
     bin's reach, two non-interleaved clusters, matched routes) is met
     and measured by the pure test. The text of §5.219 is kept above as
     the record of the blocked pass.
223. **The bin's collision extent is authored symmetrically (U14-D2;
     owner confirmation 1, approved).** The approved bin figure, tile
     units `[11.7, 16.8, 1.6, 1.2]`, is x 374.4–425.6. Rounding the
     position and the width separately — what the layout's footprint
     helper does — gives x 374–425 and leaves the avatar one pixel more
     room east of the bin than west of it. The owner gave exact
     symmetry about x 400 precedence: the bin is the pixel solid
     `[374, 538, 52, 32]` (x 374–426). The visual anchor stays
     (400, 556). Consequence: the positions the bin is used from are
     exact mirror images (pure test: equal in number west and east; no
     annex position without its mirror image).
224. **What the mirrored layout does and does not establish (U14-D2;
     limitation recorded, no decision taken).** The two jobs are
     matched in GEOMETRY: equal distances, equal numbers of pick-up
     positions, equal walking cost, the same input sequence and the
     same lines. They are not thereby equivalent as measurements. Job 1
     is always the west cluster and always the first; job 2 always the
     east cluster and always the second, cut while whatever was left of
     job 1 still lies in view. Side and order are therefore not
     separated, and the second job can carry learning and carry-over
     from the first (§5.200). The two jobs are repeated occasions; six
     pieces are not six independent observations. Counterbalancing the
     sides was not part of the contract and was not introduced.
225. **Pooling the four administrations (adds to §5.215).**
     `m04-cutting-v1`, `-v2` and `-v4` differ in the room, the places,
     the reaches, the carrying cost, the lines at the cut, the
     set-down, what a press at a station does, when the bin is named
     and what closes a job. `-v3` was never committed, approved or
     released: no session carries it, and it is documented only so
     that the version numbers are not reused. The versions are told
     apart by `entry_state_version` and pooled by no code; equivalence
     is not claimed.
226. **The plate is a local composition; no `workshop-plate.v3.png`
     (U14-D2; owner confirmations 2 and 3, approved).** PixelLab was
     not available. The 1376 × 608 plate is reproduced deterministically
     from `docs/game/world-v2/plate-sources/workshop-plate.v2.png` by
     `scripts/world-v2/plate_edits.py workshop` (Pillow; every pixel is
     copied from the same painting or painted in its palette). No
     duplicate source image was added. The manifest and the provenance
     register name the source, the method, the dimensions, the edits
     and the final SHA-256. The owner made the composition acceptable
     only if the independent visual review confirms that the annex is
     coherent, aligned with the collision geometry, stylistically
     consistent and free of false affordances and visible seams.
     RESULT — NOT FULLY MET, open for the owner. The first plate met
     two of the five criteria (collision alignment, no false
     affordances). After the unit's one fix pass the same reviewer
     found four met — coherent, aligned with the collision geometry,
     stylistically consistent, free of false affordances — and "free
     of visible seams" NOT met, for two small, low-contrast artefacts
     the fix pass itself introduced in the band under the records
     office: a weathering patch reflected into an hourglass at the
     reflection line (about x 1093–1116, y 362–403; a smaller one at
     x 1255–1260), and a straight-edged dark rectangle in the exterior
     at the south-east corner (about x 1310–1376, y 392–412). The
     reviewer could not make either out in the in-game frame of the
     office, only in enlarged crops. No second fix pass was made (the
     contract allows one). Also for the owner: the fix pass joined the
     annex's side walls to the hull, which edits the top 384 rows in
     two 16 px strips (x 176–191, x 608–623, y 350–383) beyond the two
     edit areas the contract names; and the doorway stays a stepped
     recess, because the approved collision leaves the recess below
     y 384 walkable. The art stays PROVISIONAL and not human-approved
     as an asset set.
     CLOSEOUT (1 October 2026; the owner's exceptional closeout
     authorisation). The owner ratified the two 16 px strips as part
     of the approved composition. The two artefacts were removed by
     the same script from the same v2 source, rows 384–413 only (every
     other pixel byte-identical to the previous plate, measured): the
     continued hull face no longer reflects the painting's weathering
     patches — a patch the crop line cuts closes a few rows below it
     (half its height, rounded off unevenly, seed 53), every other
     reflected patch becomes plain face, and the continued rows carry
     seeded weathering of their own in the face's tone (44, 42, 65) at
     the painting's patch sizes and sparsity (value noise, 22 × 9 px
     cells, seed 61, faded in under the crop line so no patch is cut
     flat); and the break-up of the face into the exterior begins
     gradually over the 28 px past each walled run (the ragged edge
     starts at the base line and rises) instead of switching on a
     vertical line, which is what drew the straight-edged rectangle at
     the south-east corner (the walled columns ended at x 1310). Final
     plate SHA-256
     `473f1b4fa33905183c446114a72b7e4b9f38bf41c9013676d7f344fa84fd5dcd`
     (manifest and provenance register updated). Independent visual
     review of the final plate, the full frame and the enlarged
     repaired regions (Opus, read-only): coherent — MET; aligned with the collision
     geometry — MET; stylistically consistent — MET; free of false
     affordances — MET; free of visible seams — MET. Both named
     artefacts are gone (the hourglass's mirror image is plain face and
     a differently shaped seeded patch; the small patch is no longer
     reflected; the corner's vertical edge at x 1310 is gone and the
     exterior rises gradually from about (1312, 411) to (1331, 395), a
     rounded shadow in the frame). No new seam at y 413 where the
     changed rows meet the unchanged ones. Three minor residuals, none
     blocking: the structural reflection mirrors the worn thin band at
     the top of the face onto the one at its base (x ≈ 1085–1117 and
     ≈ 1280–1290; 3× / 8× crops only); the seeded patch at x ≈
     1095–1111, y ≈ 392–405 lies under the painting's triangle at the
     same column (two stacked patches at 3×–8×, not a reflection); the
     corner's dark mass has a nearly horizontal top at y ≈ 392–396
     across x ≈ 1343–1376 at 8× (a rounded shadow at 1× and in the
     frame). The owner's five-part condition is therefore MET. The
     reviewer approves nothing; promotion stays with the owner. The
     stepped doorway is unchanged (forced by the approved collision).
     The art stays PROVISIONAL and not human-approved as an asset set.
227. **The episode-2 route test used coordinates of the former room
     (U14-D2; owner confirmation 4, approved).**
     `e2e/pilot_episodes_1_2.spec.ts`, "episode 2", failed at this
     unit's entry state, before any change of U14-D2 and before any M04
     step: it walked to hand-typed coordinates of the former 25 × 19
     workshop, stood at no station and timed out waiting for the Case
     Workspace. A test-fixture problem, not an M04 runtime regression.
     The test now stands on the interaction registry's own approach
     points and walks the room's lanes. OPEN FOR THE OWNER — beyond the
     confirmation's wording: once the coordinates were ported, two
     expectations behind the point the test used to fail at turned out
     stale as well, both about other items and neither about M04. (a)
     M12: the test expected two `proto_m12_check_window_closed` events
     and the item `completed` after packet 2 was released; in this
     session packet 1 (Concourse) is never opened, so one window closes
     and the item is `pending` (occasion o1 `pending`, o2 `completed`)
     — the expectation was written by Unit 8 (commit `ec2f117`) when
     the test already stopped before it. (b) M11: the test expected the
     item `not_applicable` after the seal log; since M11's own unit
     (commit `e619181`) the item has two custody occasions in the
     laboratory and the yard and is `pending` in episode 2. Both
     expectations were changed to what the running game reports, with
     the reason beside them; no source file of M11 or M12 was touched.
     Whether these two readings are the intended ones is the owner's
     to confirm — the writer only observed them. Every M04 assertion
     of the test is unchanged and passes.
     RULED (1 October 2026): the owner ratified both corrections —
     only M12 occasion o2 is completed in this episode while o1 stays
     pending; M11 stays pending because its two custody occasions
     occur in later episodes; the seal-log acknowledgement remains
     secondary telemetry and completes no M11 opportunity. An
     administration and test ruling; it alters no construct
     interpretation or scoring. CLOSED.
228. **The cutter's approach point and its landing box (U14-D2; limit
     recorded).** The approved approach (400, 423) stands 4 px north of
     the machine (the avatar's feet end at y 447, the cutter's solid
     begins at y 451). The registry's usual rule — every position
     within ±12 px of an approach is standable — cannot hold on the
     south side: those positions are the cutter itself. Every position
     of the box the avatar can stand at names the cutter. The
     coordinates were not changed.
229. **Cases of §5.220 and §5.221 after the contract (U14-D2).** The
     contract's list of what closes no job names the questionnaire
     notice acknowledged, a supply or inventory pick-up, a surface
     opened or closed, a reading, an idle or refusal message, an M04
     piece handled and walking out of the annex while remaining in the
     workshop: §5.220 (c) is thereby confirmed, and (a), (b) stand as
     the writer applied them ("reading" and "opening or closing a
     surface" are on the list). (d) and (e) remain the writer's
     application. No code changed for any of it; only states the
     allowed files already observe are read, and no hook or event was
     invented. §5.221: the island is gone and the annex is open floor,
     so beside a piece the control takes its first place, below the
     avatar's feet (browser screenshot 5, unit log); the limit of
     §5.221 remains for the dense parts of the machine bay, where no
     cutting piece lies any more.
230. **The collision audit's westward sweeps of the workshop — BLOCKED
     outside the allowlist (U14-D2; open for the owner).**
     `e2e/collision_audit.spec.ts` sweeps each lane row of a room from
     the spawn with a held key, pushing 1000 px, and compares the stop
     with the pure model, whose prediction it cuts off after 1200 px.
     Until this unit the workshop's two westward sweeps (rows y 236 and
     y 262, from the spawn at x 1256) ended at the cutter island's east
     face (x 491), 765 px away. The island is gone by the approved
     geometry: the lane now runs on to the Relay Bench (x 107, 1149 px)
     and to the west wall (x 43, 1213 px). The avatar therefore ARRIVES
     at the push's own target on open floor (observed x 256.7 and
     253.8 = start − 1000), the test reads that as a stop and fails:
     "observed 256.75 vs model 107.17" and "observed 253.83 vs model
     54.25" (the second model figure is the 1200 px cut-off, not a
     stop). No collider disagrees with the model: every face of every
     workshop solid the audit pushed — the two jambs, the cutter and
     the bin among them — stopped within 0.92 px, both eastward sweeps
     within 0.33 px, and the other six rooms pass. The fix is two
     limits in `e2e/collision_audit.spec.ts` (a push and a prediction
     long enough for a 1376 px room), a file outside this unit's
     allowlist: it was not changed, and the required command
     consequently FAILS (35 passed, 1 failed). Evidence inside the
     allowlist for the part of the lane the audit no longer reaches:
     `e2e/world_v2_workshop_look.spec.ts` pushes westward along both
     rows from x 560 and compares the stop with the same model
     (observed 107.00 vs 107.83; 43.00 vs 43.33). The independent test
     review reproduced the failure twice, confirmed this reading and
     added one observation: in one of its two runs the audit also
     reported the Component Locker's east face 5 px off (observed 379
     vs model 373.9). The avatar had landed at y 296.08, a twelfth of a
     pixel inside the new doorway's depth, where the engine — correctly
     — stops it at the west jamb (x 368 + 11), while the audit's model
     counts whole pixels and sees no overlap. It depends on where the
     audit's walk happens to land (one of the reviewer's two runs; one
     of the writer's two) and is no wrong collider, but the audit will
     stay intermittent at that face until its landing is snapped to
     whole pixels — the same file, outside the allowlist.
     RESOLVED (1 October 2026; the owner put `e2e/collision_audit.spec.ts`
     on the allowlist for one exceptional closeout pass). The driver
     was repaired, not weakened: (a) there is no fixed push length any
     more — the key is held toward a target 400 px OUTSIDE the room on
     that side, so the leg can only end in the driver's wall clamp,
     however long the lane, and the audit asserts that it did (a leg
     ending any other way is an error); the avatar is therefore always
     driven past the predicted stop, and a missing collider carries it
     on to the next one and fails the comparison; (b) the prediction's
     bound is the audited room's own extent on that axis (the grid's
     outside counts as wall, so a stop always exists; running out of
     room throws); (c) the comparison tolerance stays 3 px, no room,
     row or face is excluded and no workshop result is special-cased.
     The Component Locker result, honestly: the approach to its east
     face had landed about 4 px off its aimed row (y 296.08 for 300)
     and about 3 px short on x; at that fraction the engine's feet box
     is a continuous rectangle (Arcade AABB) whose bottom edge, y + 24
     = 320.08, overlapped the new west jamb's corner (y 320) by a
     twelfth of a pixel, so the engine stopped at the jamb (x 379),
     while the pure model reads whole pixels (rows to y + 23 = 319.08,
     no overlap) and slid past to the locker (x 373.9): 5.08 px, i.e.
     the two were evaluating different bodies at the same coordinate.
     The fix is principled rather than a tighter landing: the model now
     evaluates the body at every floor / ceiling combination of the
     landed coordinates — the union of the whole-pixel bodies at
     floor(y) and ceil(y) covers exactly the pixel rows floor(y + 10)
     … ceil(y + 24) − 1 of the continuous box, likewise along x — so
     the pure model and the engine evaluate the same approach
     coordinate wherever the walk lands; the landing's offset across
     the push is recorded with every face (it is a record, not a
     requirement: a landing off its aim changes which approach is
     compared, never whether the comparison holds — in the Core
     Chamber the navigator lands one face 39.5 px off its aimed row,
     a navigator limit outside this unit, and the comparison from
     there holds to 0.33 px). FINAL EVIDENCE (the complete collision
     gate, retries off, one run after the last change; evidence under
     ignored `test-results/u14d2-collision/`): 36 / 36 passed, all seven rooms; the workshop
     in 4.7 min with every reachable face of every solid and both sweep
     rows in both directions within 0.83 px of the model — Component
     Locker east face 379 vs 379.83 (landed 1 px across the push), west
     jamb east 379 vs 379.75, east jamb north 296 vs 295.67 and west
     421 vs 420.17, cutter north 427 vs 426.83 / west 341 vs 340.75 /
     east 459 vs 459.08, bin west 363 vs 362.17 / east 437 vs 437.42;
     sweeps y 236: 1333 vs 1332.33 eastward, 107 vs 107.17 westward;
     y 262: 1333 vs 1332.17 eastward, 43 vs 43.25 westward; return to
     the spawn within 24 px. The other six rooms' largest error is
     1.00 px. Independent test review (Sonnet, read-only): every
     requirement satisfied, no blocker, no major. CLOSED.
231. **Points the independent reviews raised that the contract does not
     decide (U14-D2; open for the owner; nothing was changed for
     them).** Scientific review: (a) the first opening of the Component
     Locker records the stowing job's engagement and therefore closes
     an open cutting job (§4 "Unit 14-D" (6), unchanged) — the locker
     now stands beside the annex doorway, and the contract names both
     "opening a surface" (no departure) and "a change of another task's
     attempt state" (a departure); (b) the bin is used from two small
     pockets beside it and a full cleanup costs about 776 px of walking
     per job — accessible, but costly enough that undisposed pieces may
     reflect the cost; (c) the pieces appear 172–188 px from the
     cutter, against the annex's side walls: an undisposed piece may
     mean it was not noticed rather than left by choice, and M04 has no
     exposure marker (§5.196 records the same for M03); (d) the sides
     are not counterbalanced (§5.224). Gameplay review: (e) the cutter
     cannot be seen from the hall — only the lit doorway can — and the
     route guidance pool lies on the machine (its anchor is the north
     face), off-screen from the hall; there is no sign; a participant
     who never enters the annex is never presented a job (missing, not
     a zero); (f) the prompt lines of the cutter and of the bin are
     drawn over the cutter's body, because the avatar stands north of
     the one and beside the other; (g) the west half of the doorway's
     threshold lies within the Component Locker's 72 px range, so a
     press there opens the locker; (h) the camera is not mirrored: the
     room's west edge clamps the view at the west cluster, so job 1's
     leftovers can lie outside the view from job 2's far pieces and not
     the other way round; (i) from U14-C / U14-D, unchanged: "Take
     <piece>" is offered with full hands and then refused; a piece set
     down returns to its own place, not beside the avatar. Visual
     review, outside the plate: (j) the blade wrap's sprite reads as a
     brass key; (k) the bin is painted full and does not change; (l)
     the empty marked bay in the hall could be read as a place to put
     things. None of these was a blocker in the reviews; (a)–(d), (e)
     and (h) bear on what the measure means and are recorded so that
     they are not mistaken for settled.
232. **The plate's composition runtime changed; the hash difference is
     encoder-only (U14-D3; accepted by the owner in the ruling).** The
     workshop plate is now composed under Python 3.12.14 / Pillow 12.3.0
     (U14-D2: 3.12.7 / 10.4.0). The unchanged U14-D2 script re-run under
     the current runtime reproduces the committed U14-D2 plate pixel for
     pixel (0 decoded differences over 1376 × 608) at a different byte
     hash (`a9f566f4…` instead of `473f1b4f…`), so a byte hash is now a
     property of the encoder as well as of the pixels. The U14-D3 plate
     was generated twice in succession under the current runtime with
     identical SHA-256 `4ed99f61…`, and its decoded differences from the
     U14-D2 plate lie only inside the four authorised edit regions (rows
     414–607 untouched). Recorded so that a future hash mismatch is first
     checked against decoded pixels before it is read as a change.
233. **The shared e2e driver `workshopToConcourse` is stopped by the
     divider — blocked outside the allowlist at U14-D3's first pass;
     RESOLVED by the closeout amendment of 1 October 2026 (see the end
     of this entry; the analysis below is historical).**
     `e2e/pilotHelpers.ts` (not on the unit's allowlist at the time) walks
     from wherever the avatar stands straight to the door approach
     (1288, 268) with its axis-by-axis driver (`walkTo`, y first, then
     the reversed L). From the board approach (1312, 178) — where the
     route helpers `workshopSignOff`, `routeToWorkshopWork` and
     `returnShiftToDeckClosure` leave the avatar — every such leg now
     ends on the divider's north face (origin y 192), because the feet
     box at x 1288 (1277 … 1298) still overlaps the divider's columns
     (1280 … 1343); `useDoor` then fails after its three attempts. The
     production geometry is as the owner approved it; a participant
     simply walks round the rail (west of x 1270). Affected: every spec
     that signs the board and then calls `workshopToConcourse`
     (`m01_batches_route`, `m05_start_route`, `m11_custody_route`,
     `pilot_route`, `pilot_return`, `pilot_episodes_1_2`,
     `m03_m04_route`, `pilot_deck`, `pilot_lab`, `closureHelpers`); none
     of them is in this unit's focused verification, and the three
     affected legacy cases the owner named reach the door from the west
     and pass. The fix is one helper change — step to x ≤ 1250 before the
     door leg (as `e2e/u14_d3_workshop_access.spec.ts` does explicitly)
     — in a file this unit may not edit. Because the file is required
     for the test suite to keep working after this geometry, the unit
     stopped before its commit (contract stop condition "a
     non-allowlisted tracked file is required") and reported it.
     RESOLVED (closeout amendment, 1 October 2026): the owner added
     `e2e/pilotHelpers.ts` to the allowlist (21 paths) and ruled the
     correction an e2e-driver change, not a production route or
     measurement change. `workshopToConcourse` now takes a stable
     waypoint west of the divider — `workshopVia(page, 1250, 252)` on
     the office's south lane — before its final leg to the audited
     door approach (1288, 268) and the door; and, because the same
     defect showed at another legitimate starting position — the
     U14-D3 spec's own walk from Press B to the board approach stalled
     on the vestibule wall face at y 226, ran under the rail and met it
     from below at y 222 — `workshopVia` itself now reaches the target's
     row at x 1250 before going east whenever the target's origin x is
     1270 or more (the only such targets are the board approach and
     the door approach). The door anchor, the approach, the interaction
     radius and the participant's route are unchanged. Verified by the
     representative callers named in the amendment (`m03_m04_route`,
     `pilot_route`) and the U14-D3 spec; results in the unit log,
     "U14-D3 closeout amendment".
234. **"The Sample Cutter is the nearest station to every piece" no
     longer holds for one piece — RESOLVED by the owner's final M04
     spatial ruling (closeout amendment, 1 October 2026): the bench
     stays at `[15.2, 9, 3.3, 2]`, anchor (566, 305), approach
     (578, 252), and is NOT moved to satisfy the former straight-line
     nearest-anchor assertion; that statement is withdrawn (the bench
     anchor is about 2.1 px nearer to the coupon offcut only through a
     solid hull wall, which describes neither participant access, nor
     interaction competition, nor walking cost); `e2e/m04_cutting.spec.ts`
     and the U14-D3 records now express and test the functional
     guarantees listed in §4 "Unit 14-D3" (4) instead, with no reach,
     collision, symmetry or route-cost assertion weakened; the focused
     gate is green again (unit log, "U14-D3 closeout amendment").
     The analysis as first recorded follows.** The
     U14-D2 record's guarantee (3) and the pure test
     `e2e/m04_cutting.spec.ts` ("register row and fixtures …", the
     assertion `nearest station … toBe('sampleCutter')`) state that
     every piece's nearest station, by straight-line anchor distance, is
     the cutter. The owner's Assembly Bench anchor (566, 305) lies
     171.1 px from job 2's coupon offcut at (572, 476); the cutter anchor
     (400, 456) lies 173.2 px from it. The test therefore fails on that
     one line, deterministically, for job 2 only (job 1's mirror piece
     keeps the cutter nearest, 173.2 px against 204 px to the next
     station) — the two jobs' straight-line station neighbourhoods are
     no longer alike. Every functional guarantee holds: the bench is
     171 px from the piece (more than the 72 + 64 px that would let a
     station take a press meant for a piece, which the same test still
     asserts and passes), the bench and the piece are separated by the
     south hull (walking distance through the doorway, not 171 px), no
     piece is reachable from the bench's range, and the mirrored
     pick-up and bin positions and walking costs are unchanged. The
     unit did not change the assertion or the record (an M04 guarantee
     is the owner's), and did not move the bench (its anchor is fixed
     by the ruling). For the owner: either (a) restate the guarantee as
     "no other station lies within 136 px of a piece, and no station
     with a walking route into the annex is nearer than the cutter"
     and amend the one assertion accordingly, or (b) set the bench
     anchor 4 px north ((566, 301): 175.1 px) or the bench elsewhere.
     Until it was decided the focused gate `m04_cutting` showed 11 / 12
     with this one deterministic failure (historical; green again since
     the closeout amendment, above).
235. **Points the U14-D3 reviews raised that the ruling does not decide
     (recorded, not acted on).** Gameplay review (Opus, read-only;
     verdict "usable with noted friction", no blocker): (a) the Work
     Order Board's prompt line is clamped to the HUD and is drawn to the
     left of the alcove, above the Sample Seal Log's painted cork board
     (`RoomScene.ts`, the prompt clamp — a protected system, older than
     this unit), so a first-time participant may tie the board's prompt
     to the cork board; both objects answer correctly by proximity;
     (b) at 1280 × 720 the open doorway below the rail reads less like
     an exit than the lit alcove above it — the threshold light is
     faint and the alcove carries the orange frame and the lamp; a
     participant looking for the exit may step into the alcove first
     and get the board's prompt (mitigated: they arrived through that
     doorway and its prompt is explicit); (c) the rail reads as the
     intended striped barrier; its cost is one sidestep per sign-off.
     Measurement-adjacent, for the scientific reviewer and the owner:
     (d) **M08 effort changed** — the Component Locker moved from the
     south hull beside the supply pallet to the north wall; the walk
     from the pallet to the locker grew from roughly 120 px to roughly
     340 px, so the optional stowing job costs more effort than before
     while its meaning, events and engagement rule are unchanged; M08
     carries no administration-version marker of its own — RULED
     (closeout amendment, 1 October 2026): the approved locker position
     is retained; the increased walking cost of the optional M08
     stowing opportunity is recorded here; no M08-specific event,
     payload field, score or administration marker is added; the
     existing canonical `game_version`, attached to raw events and
     summaries, is the build-level traceability mechanism, so analyses
     combining data from different workshop layouts must check or
     stratify by `game_version`; M08 remains secondary descriptive
     telemetry and gains no validity claim;
     (e) a press made at the board while looking for the exit logs
     `pilot_station_opened` (`work_order_board`) and offers the filter
     swap (`noteM08JobOffered`), as any board visit does — low risk;
     (f) approaching supply bundle A from the north can bring the Case
     Workspace (anchor 184/170) into range before the bundle — a
     geometry older than this unit, exposed by the new driver routes
     (the test's stand was moved, participants are not). Test review
     (Sonnet, read-only; both commands green, no flake): (g) the new
     spec checks the ruling's figures as pixel literals and does not
     separately test the tile-unit → pixel conversion of the locker and
     bench masses (it is exact by construction in `workshop.ts`);
     (h) its pure blocking and reach checks run on the same solids the
     code uses — consistency with the code, not with the painted art
     (the collision audit covers engine against model); (i) the 64 px
     reaches are checked as source strings; (j) the browser tour is one
     chain, so an early failure hides later steps; (k) the Seal Log's
     prompt is shown in the browser only by the look tour, not by the
     new spec. Items (a)–(c) and (g)–(k) are cosmetic or test-shape
     suggestions and are recorded instead of extending the unit, as the
     ruling asks; (d)–(f) bear on what M08 and M02 opportunities cost
     and are recorded so that they are not mistaken for settled.

The U15 (M09 / M10) implementation took the following implementer
defaults under the approved rows; each is owner-visible and reversible,
none changes a feature id, a formula, a direction or a denominator kind.
§5.239 additionally records ONE research-owner decision (D-U15-1), which
is not a default.

236. **The second delivery (U15).** Default: `d2` is Noor's yard logbook
     for Vale, offered at the end of the outside shift (the stage after
     "I am finished outside.", once the shift end is recorded), so that
     the two deliveries have distinct objects (key card / logbook),
     issuers (Vale / Noor), recipients (Kai / Vale) and episodes (1 / 4).
     The approved row names none of these. Alternatives: a second
     Concourse delivery (same issuer, clustered offers); a workshop
     delivery on the return shift (very short gap to the deadline).
237. **The delegates, and the asymmetry of `d1` (U15).** Default: one
     permitted delegate per delivery, never its issuer or recipient —
     Noor for `d1`, Kai for `d2`. On the ordinary route the participant
     meets `d1`'s recipient (Kai, Laboratory) BEFORE its delegate (Noor,
     yard), and `d2`'s delegate (Kai, Laboratory) BEFORE its recipient
     (Vale, Concourse); a delegation of `d1` therefore means the
     recipient was passed first. The two deliveries are not equivalent
     forms. Alternative: any colleague may be asked (more menu states,
     recipients standing beside delegates).
238. **One deadline (U15).** Default: both deliveries are due at the
     station-record closure of the Shift Review Panel (stated in the
     offer, the recap, the menu and the log line); a delivery still
     carried there closes `unfulfilled_at_deadline`. Alternative: a
     per-delivery milestone (the approved row says "the stated
     milestone" without fixing it).
239. **The watch's check windows; RESEARCH-OWNER DECISION D-U15-1 for
     the third (U15).** Checks 1 and 2 — implementer default: one
     window per Concourse pass (check 1 from acceptance to the first
     exit; check 2 from the first entry at a laboratory / yard stage to
     that visit's first exit). Check 3 — **not a default: decided by the
     research owner on 6 October 2026** (source: the owner's launch
     instruction for Unit 15 of that date, recorded in contract
     `U15-CONTRACT-v2.md`, amendment A2, §3 and §6): "I approve D-U15-1:
     the third M09 check closes at the first Concourse exit after its
     return-from-yard opening, replacing the previous until-review
     deadline. Any exit closes the window; later readings cannot change
     its first outcome." Implemented exactly so (§4 "Unit 15" (1)). In
     the v2 administration the return check stayed open until the deck
     review; the v3 return window is therefore shorter and the two
     administrations are not poolable (they differ in family and
     `entry_state_version`).
240. **Visibility of the obligations (U15).** Default: the station log
     is the one reminder of the watch and of the deliveries, plus the
     recap stage after the alarm (the specification's "show the
     obligation after interruptions"). Alternative considered and not
     chosen: an automatic due notice when a check opens — it would
     overwrite M05's lamp feedback at the moment the lamp job's clock
     starts; an in-world cue on the gauge would break the route's
     one-guidance rule. Consequence: a check or a delivery can be missed
     by not opening the log (R12 stays a rival explanation).
241. **Settle window 300 ms (U15).** Default: 300 ms on the watch
     offer, both delivery offers, the recap, the deliveries menu and the
     delegation confirmation (M05 and M25 use 400 ms). A refused press
     is logged, writes no route beat and re-presents the stage.
242. **Observed input mode for M09 / M10 only (U15; narrows §5.35).**
     Default: the device of each M09 / M10 act is observed per act
     (`keyboard` / `pointer` / `unobserved` with its basis); every other
     prompt answer keeps the §5.35 constant. The observation is the
     most recent physical press within 1 500 ms of the act; it reads no
     key and no position. Alternative: extend the prompt pipeline
     itself (`RoomScene`, outside the unit).
243. **Deferral is route telemetry only (U15).** Default: "Ask me again
     later." writes no M09 / M10 event; it is counted from the
     `pilot_npc_beat` tags (`watch_defer`, `promise_defer`,
     `logbook_defer`) and exported as a component of the M10 delivery
     records. An extraction run on the item family alone therefore
     shows zero deferrals.
244. **Reload hold-back (U15; §5.14, M11 precedent).** Default: an offer
     presented in an earlier page load is never re-run (prior exposure +
     technical closure at zone entry; the offer stage and its re-ask are
     skipped; the feature `interrupted`); a delivery never presented
     before the reload is offered normally and its value is kept beside
     the `interrupted` disposition. When Vale's chain skips a held-back
     offer it goes on to the next stage instead of ending.
245. **Kai's briefing no longer varies with `d1` (U15).** The v2
     handover card that was prepended to Kai's menu while the key card
     was carried is gone: the laboratory briefing has three cards and
     the M11 options keep their positions whatever was accepted.
     Sessions of earlier builds differ here; analyses combining builds
     stratify by `game_version` (§5.235 (d) precedent).
246. **Vale's return menu (U15).** A `d2` carrier sees "About the
     deliveries…" as a second card in Vale's return check-in, i.e.
     before M25's normality question (which still follows "Heading to
     the workshop."). Non-carriers see the menu unchanged.
247. **Not updated in this unit (U24 backlog).** The capture specs
     (`world_v3_route_capture`, `pilot_return_capture`,
     `pilot_visual_capture`, `v4_visual_capture`) and the `window`
     labels of `src/world/interactionRegistry.ts` (gauge, Kai) still
     describe the v2 administration; `world_v3_route_capture` needs the
     recap step. None is measurement code.
248. **What makes a delivery accessible (U15).** Default: a
     `person_present` record is written when the recipient or the
     permitted delegate stands in the zone the participant is in AND can
     act there at the current stage, once per person and zone visit,
     while the delivery is carried and before the closure. A credited
     act with no presence record (not produced by the game) would count
     as accessible on the act itself. A delivery accepted and never
     brought into such a zone is excluded, never failed.
249. **Copy the administration text does not state (U15).** (a) With
     nothing carried (Noor's menu holding only the re-ask) the menu
     body reads "Deliveries you are carrying: none."; (b) after the
     station record is closed the menu body keeps the sentence "Each is
     due before you close the station record…" — the late act is
     possible, the sentence is then out of date; (c) a late handover
     answers with the same line as a timely one.
250. **Uncredited readings (U15).** `already_fulfilled` = a repeat in
     the Concourse visit in which a check was fulfilled;
     `duty_closed` = after the third check closed or after the review;
     `no_check_due` = any other reading of an accepted duty (including a
     late reading after a miss); `duty_not_accepted` = declined, not yet
     answered, or held back after a reload.
251. **`exit_to` (U15).** The door of a Concourse exit is the pilot door
     nearest the avatar when the exit hook runs (an exit is taken
     standing at its door).
252. **Kai in the Concourse (U15).** On the return shift Kai may agree
     to carry `d2` while its recipient Vale stands in the same room, as
     the administration states ("Kai … Concourse ≥ return_hub: d1
     direct, d2 delegation"); such a delegation is credited like any
     other.
253. **Station-log exposure (U15).** The map lists the first seven open
     lines; an exposure record carries the line's position and whether
     it was within those seven (`rendered`); only rendered exposures are
     counted.
254. **Per-pass windows are not time-standardised (U15).** A check's
     window lasts as long as that Concourse visit; `open_ms` is recorded
     on its closure and is not used by the feature.
255. **Points the U15 reviews raised (recorded, not acted on; backlog).**
     The three read-only reviews of 6 October 2026 (Opus; scientific,
     gameplay, visual) reported no material finding. Minor points,
     recorded instead of extending the unit. Scientific: (a) after a
     reload that held the watch back, a gauge reading is written with
     `reason: duty_not_accepted` although the duty was accepted in the
     earlier load (the load-local meaning of §5.250; the feature is
     `interrupted` either way) — whether to suppress that record or to
     add a provisional reason is an owner question; (b) the M10
     extractor does not require a `person_present` record to follow the
     acceptance, and does not check the `object` of a `delegated` event
     (the game writes presence only while a delivery is carried and
     delegates only the delivery's own object; only a malformed log
     could differ) — RESOLVED by the research owner's closeout rulings,
     §5.256 and §5.257: on such a log the extractor had returned an
     observed 0 / 1 from a presence record that preceded the acceptance,
     and credited a delegation naming another object; both now fail the
     item; (c) the pure failure cases assert the disposition,
     the null value and a non-null reason, not the reason's text;
     (d) the M09 extractor reads a `technical_failure` event only when
     no presentation exists in the load (today only the reload hold-back
     writes one). Gameplay: (e) the offers and the recap say "station log
     (M)" while the overlay is headed "MISSION LOG" and the key help says
     "M map / log" (`src/pilot/ui/StationMapScene.ts`, outside the unit;
     the offer wording is the approved administration) — an owner
     decision on either the overlay heading or the wording; (f) the
     logbook re-ask answered on a later yard visit still ends "Vale is
     waiting at the incident desk." although Vale may by then be sending
     the participant to the workshop; (g) a press refused inside a
     settle window gives no visible sign (M05 precedent); (h) the watch
     re-ask closes without a line when the key-card offer is already
     answered (unchanged from the base); (i) the approved offer no
     longer says where the gauge is (the v2 text did) — the first check
     depends on finding the labelled "monitor gauge". Visual (800 × 600
     evidence frames): (j) the gauge feedback banner touches the
     "STATION SECTORS" strip; a feedback banner can cover the
     laboratory's wall-monitor label; the prompt panel can hide the
     speaker's sprite; the prompt footer wraps "Enter." onto a second
     line (all older than this unit); (k) in the overlay the "NEXT
     ACTION" / "OPEN ITEMS" labels are very small, the record-closed
     notice uses a different bullet, and the current room's amber border
     mixes with the legend's meaning of amber (outside the unit).

The U15 closeout (6 October 2026) records TWO research-owner rulings.
They are owner decisions, not implementer defaults; they clarify the
provisional extraction contract of `m10_obligations_fulfilled` and change
no gameplay, no emitted payload, no formula and no administration
version (`m10-deliveries-v1` stands).

256. **RESEARCH-OWNER RULING — presence must follow the acceptance and
     the opening (U15 closeout).** Source: the owner's closeout
     instruction of 6 October 2026, ruling 1: "A delivery-specific
     person_present record before acceptance or before the delivery
     opportunity opens is malformed evidence and must produce
     technical_failure. It must never establish accessibility or produce
     an observed behavioural zero. Legitimate absence of presence
     evidence remains distinct from this malformed sequence." As built
     (`src/measurement/features/m10.ts`): a `person_present` record of a
     delivery whose sequence does not follow BOTH its `offer_answered`
     (accept) and its `opportunity_opened` fails the item — also when a
     valid later record exists, when the opportunity never opened, and
     when the delivery was never offered, never answered or declined
     (there is then no acceptance to follow). An accepted delivery with
     NO presence record stays what it was: inaccessible, excluded from
     the denominator, never a failure and never a zero. A valid record
     after the opening still makes the delivery accessible without any
     conversation, log or menu exposure (0 / 1 observed when it is still
     carried at the deadline). By the code's order the game writes
     presence only while a delivery is carried and opens the opportunity
     in the same call as the acceptance, so a log of this build should
     not contain the malformed sequence — an argument from the code, not
     an observation; the rule protects the offline reading of an
     exported log. For the owner's attention — the implementer's reading
     of "before acceptance", wider than the ruling's literal words: a
     presence record of a delivery that was never offered, never
     answered or declined also fails (no acceptance exists for it to
     follow), and the check is not limited to the recipient and the
     permitted delegate (a record naming anyone, before the acceptance
     or the opening, fails).
     Before the ruling the extractor returned an observed 0 / 1 for
     "presented → presence → accepted → opened → carried at the
     deadline" (reproduced by the regression test before the change).
257. **RESEARCH-OWNER RULING — a delegation must name the delivery's own
     object (U15 closeout).** Source: the same instruction, ruling 2: "A
     delegated event must identify the correct object for its delivery.
     A wrong object must produce technical_failure, just as it does for
     direct handover. Document this as an explicit clarification of the
     provisional extraction contract. Preserve the existing gameplay,
     emitted payloads, formulas and administration versions." As built:
     a `delegated` event whose `object` is not the delivery's own
     (`m10_calibration_key_card` for `d1`, `m10_yard_logbook` for `d2`) —
     another object or none — fails the item. This makes explicit what
     contract §9 stated only for handovers ("a handover to the wrong
     person or with the wrong object") and what §8 left implicit (its
     field list of `delegated` does not name `object`; the event has
     carried it since U15). The model has always written the delivery's
     own object on `delegated`; nothing emitted changed. Before the
     ruling a delegation naming the other delivery's object was credited
     (2 / 2 in the regression case, reproduced before the change). Not
     covered by the ruling and unchanged: the `object` of the late acts
     (`late_handover`, `late_delegation`), which never enter a value.
258. **Open after the U15 closeout review (recorded, not acted on).**
     The read-only recheck of 6 October 2026 (Opus) found no material
     defect in §5.256 / §5.257. One point is left open because it is
     wider than the two rulings: the extractors order events by their
     `sequence` number and read a missing number as 0 (the convention of
     every item extractor). In a hand-built or damaged M10 log whose
     `opportunity_opened` carries no sequence number, a presence record
     after the acceptance would pass the opening check wherever it stood
     in the log, and could still yield accessibility and an observed
     0 / 1. The game's logger numbers every event, so no session log is
     affected; whether an event without a sequence number should fail
     the item — for M10 or for all items — is an owner question.
     RESOLVED for M09 and M10 by the research owner's ruling §5.259.
259. **RESEARCH-OWNER RULING — unverifiable event order gets no observed
     value (U15 event-order integrity).** Source: the owner's
     instruction of 6 October 2026 for this correction: "an M10 outcome
     that depends on event order must not receive an observed
     behavioural value when required ordering evidence is missing or
     malformed. Do not manufacture an order by substituting zero for a
     missing sequence number. Use the existing schema's sequence
     convention; do not require consecutive numbers, since unrelated
     events may occur between relevant events." The owner also asked for
     the same specific issue to be checked in M09 and changed only if
     the equivalent defect existed — it did. Reproduced before the
     change: (i) a duty whose first check was opened, read and closed
     BEFORE the acceptance in the log, with the acceptance's number
     missing, was valued 3 / 3 (with the number present the same log
     failed); (ii) separately, on a correctly ordered log, an acceptance
     numbered null, zero, negative, with a fraction or with a string,
     and an acceptance sharing its number with the presentation, were
     each still valued 3 / 3 — the order was read from a number that
     could not carry it. An owner decision, not an implementer default.
     As built
     (`src/measurement/features/m10.ts`, `m09.ts`): the convention is the
     logger's — every event carries `sequence`, an integer from 1,
     unique within the session identity, increasing; gaps between the
     events of one item are normal and are not checked. Before an
     ACCEPTED delivery (M10) or an ACCEPTED duty (M09) is analysed — the
     part of each extractor that compares positions: acceptance,
     opening, presence, acts, closure, late acts; acceptance, check
     openings, readings, closures — every event of that delivery (M10)
     or of the family (M09) in the current page load must carry a usable
     number (a safe integer of at least 1; a missing value, null, zero,
     a negative number, a fraction, a string, NaN, an infinite value and
     an integer beyond the safe range are not), and no two of them may
     share one. Otherwise the feature is a
     `technical_failure` ("an event without a usable sequence number" /
     "two events share a sequence number"). The extractors no longer
     read a missing number as zero. An accepted duty or delivery that is
     STILL OPEN is inside the check: with a defective number it is a
     `technical_failure`, no longer `pending` (with sound numbers it
     stays `pending`). Where an extractor picks among several openings
     (M10: the earliest opening of a delivery; M09: the check openings
     in turn) it now orders them by their own numbers after the check,
     and no longer relies on the order in which the shared helper
     returned them. Unchanged: valid logs (also when
     numbered with gaps), every observed value, legitimate missingness,
     the treatment of late acts and of uncredited readings, formulas,
     denominators, versions, events and payloads. **Limits, stated so
     that they are not mistaken for settled:** (a) the dispositions that
     compare no positions — never offered, unanswered, declined, held
     back after a reload — are not failed by an unnumbered event (they
     carry no observed value); (b) uniqueness is checked inside the
     feature's own scope (one delivery; the watch family), not across
     the whole log — gaps and duplicates of the whole log remain the
     export's `event_integrity` record; (c) a log renumbered
     consistently but wrongly cannot be detected from the numbers;
     (d) the shared helper that sorts the current load
     (`features/extract.ts`, outside this correction) and the other
     items' extractors still read a missing number as zero — the same
     question is open for them; (e) the game's logger numbers every
     event, so this build's session logs are unaffected — an argument
     from the logger's code, not a new browser observation.

Unit 16 (M13) is governed by the owner's U16 contract (amendment A1)
and by the research owner's ruling D-U16-1. The ruling is recorded
first, as a ruling; §5.261–§5.270 are IMPLEMENTER DEFAULTS —
owner-visible, reversible, none of them changes the approved formula or
the ruling, and none is an owner decision.

260. **RESEARCH-OWNER RULING D-U16-1 — APPROVED 7 October 2026 (M13;
     an owner ruling for this implementation, not an implementer
     default; not reopened).** Source: the owner's instruction and
     contract of 7 October 2026 (`U16-FABLE-PROMPT.md`,
     `U16-CONTRACT.md` amendment A1). The ruling is an explicit
     decision for this implementation and NOT recovered wording from
     the missing original document (`UNIT-LOG.md` "U16", provenance
     limit). Its six items: (1) the same 3×3 board and nine-piece set
     across three genuinely different network configurations, with the
     contract's solvability checks and the rule that no configuration
     is a rotation or reflection of another; (2) the existing 90°
     rotation is the alternate orientation form for this pilot, the
     assigned form is recorded, and neither empirical difficulty
     equivalence nor independent forms is claimed; (3) fixed order
     `n1 → n2 → n3`, with the order limitation documented; (4) all
     three immutable first responses are collected BEFORE any
     correctness feedback and before any further attempt on any
     network — a response is a confirmed layout or a confirmed CANNOT
     SOLVE; a neutral acknowledgement and the next-network control
     follow; nothing reveals connected or sealed status, constraint
     results, hints, correctness-dependent controls or any other
     indirect correctness feedback; rules-and-controls help stays
     available without solution information; leaving and returning
     preserves the state; a partial or stopped series never unlocks
     feedback or practice; (5) after all three first responses:
     structural feedback and optional practice, with the same access
     and the same maximum of three additional test runs per network
     whether the first response was a layout or CANNOT SOLVE; practice
     is voluntary and has no progression or payment consequence; CANNOT
     SOLVE stays an incorrect first response, and later success after
     it — or after an incorrect layout — never changes the recorded
     first-response result; (6) no practice network before `n1`, help
     is informational only, and the companion data stay in the primary
     row's components. **Limitations that travel with the ruling:**
     fixed order confounds position and network; `n1` carries first
     contact with the bench (no practice network); the orientation
     forms are a rotation of one another, neither equated nor
     independent; the three first responses share one episode; because
     no feedback precedes the third answer, practice and results cannot
     inform any first response, and practice data describe voluntary
     later behaviour only. Implemented: §4 "Unit 16".
261. **D-1 — the concrete configurations (U16 default).** `n1` keeps
     the v2 geometry (opposite sides); `n2` has its ports on adjacent
     sides (form A: feed west of A1, intake south of C3, B1 fractured);
     `n3` on the same side (form A: feed west of A1, intake west of A3,
     A2 fractured). Each network has exactly one fractured mount, at a
     different place in each network of a form. Chosen from an
     exhaustive census so that every network's smallest sealed run is
     five pieces (the contract's floor is four); the census (18 / 32 /
     39 sealed layouts) is listed in §4 "Unit 16" (2) and differs
     between networks. Difficulty equivalence is not claimed and was
     not measured. Other configurations with the same port relations
     exist; which three are used is the owner's to change.
262. **D-2 — commitment (U16 default; M02 precedent §5.210).** Each
     first response passes a confirmation; only a fresh press confirms
     (an auto-repeat, a press that began before or as the dialog opened
     and any press inside 400 ms are refused and recorded, each reason
     once per dialog with the count on the next record). An empty or
     partial board may be confirmed after the confirmation: it is an
     incorrect LAYOUT response, not a missing one and not CANNOT SOLVE.
     The commit control is named RECORD LAYOUT; a flow test exists only
     in practice. The focused time of a network includes its
     confirmation.
263. **D-3 — practice mechanics inside the ruling (U16 default).** A
     practice board starts from the board as it stood at the answer
     (empty after a CANNOT SOLVE given on an empty board) and keeps its
     own state between visits; networks may be practised in any order;
     one run counter per network; FINISH ends practice for all three;
     a used run is never restored; a sealed first response has the same
     practice access as any other. A network whose three runs are used
     can still be opened and read.
264. **D-4 — results presentation (U16 default).** One results view
     lists the three recorded answers with the three structural lines
     and "sealed / not sealed"; CANNOT SOLVE is shown as such without
     structural lines (whatever stood on the board); no tally, no
     reference layout, no hint.
265. **D-5 — scored-phase closure (U16 default).** The scored phase is
     closed by `first_responses_completed` with the third first
     response; the legacy validity-register opportunity is completed at
     the same moment; practice has its own closure record
     (`practice_closed`: `finished`, `review`, `technical_failure`).
266. **D-6 — stopping (U16 default).** STOP TASK exists in the
     first-response phase only (also on an acknowledgement before the
     third answer); afterwards the participant ends practice with
     FINISH or by leaving.
267. **D-7 — dispositions for zero and partial evidence (U16
     default).** As §4 "Unit 16" (4): `voluntary_stop` /
     `no_eligible_event` for an opened, unanswered series (the strain
     noted in §5.142 applies — the stop is the recorded behaviour, the
     review closure is not); a fault in the first-response phase voids
     the row with the answers kept in the components; a practice-only
     record defect is flagged in the components without effect on the
     row. Two cases the contract's list does not name, recorded as
     built: (i) a fault while the bench was opening (a
     `technical_failure` event without any `series_opened`) is a
     `technical_failure`, not a never-opened bench; (ii) a
     first-response phase with no closure record is `pending` whatever
     the export — the contract's literal rule, kept also when the log
     comes from a terminal export. The runtime always writes
     `series_closed_at_review` at the review, so (ii) concerns offline
     or damaged logs only; M17 treats the analogous case as cut short
     (U9, S-L9), and which rule M13 should follow is recorded for the
     owner in §5.273 (a), not decided here.
268. **D-8 — names (U16 default; all provisional).** Family
     `proto_m13_networks_`, opportunity `proto_m13_network_series`,
     windows `m13_network_n1` … `n3`, the suffixes of the addendum §2
     "U16", administration `m13-networks-v1`, content versions
     `m13-n1-opposite-v1`, `m13-n2-adjacent-v1`, `m13-n3-same-side-v1`.
     The v2 family is retired from the route. Alternative names are the
     owner's.
269. **D-9 — event order (U16 default).** The §5.259 convention is
     applied to the M13 extractor as the same convention: once the
     bench has family events in the current load (and is not held back
     after a reload), every one of them must carry a usable, unique
     `sequence`, otherwise `technical_failure`. Results or practice
     records before the completion snapshot void the scored evidence.
     Wider than §5.259's own scope in one respect, stated so that it is
     not mistaken for settled: the check also covers an opened series
     without answers (it compares no response positions).
270. **D-10 — reload (U16 default; the existing convention, no new
     policy).** §5.14 applied unchanged to both phases: a bench that an
     earlier page load opened is never re-run; the new load's row is
     `interrupted`; the earlier load's events stay in
     `prior_page_load_events`. **Stated limitation of the existing
     convention:** this holds also when the earlier load had COMPLETED
     the scored phase — the completed record is not erased, and it is
     not carried into the new load's row either. Whether a completed
     earlier load should be recoverable for analysis is the owner's
     question, not decided here.
271. **Recorded engineering choices of U16 (inside the procedure; none
     changes an answer, a denominator or the formula).** (a) Wording:
     the fixed strings of the contract are unchanged (except the
     practice notice and the rule line's last sentence, replaced or
     added by the owner's closeout wording, §5.274); the rule line and
     the help sheet of the first-response phase were written without
     the words "connected", "sealed", "inline" and "open branch", so
     the rules read "one run from the FEED port to the INTAKE port …
     pass through the isolation valve … no pipe end loose" while the
     results use the structural vocabulary; the results help sheet
     bridges the two. Hints were shortened to fit two lines at
     800 × 600. (b) Keys: CANNOT SOLVE is N; NEXT NETWORK / SHOW
     RESULTS is ENTER; practice boards open on 1 / 2 / 3; BACK TO
     RESULTS is B; FINISH is F; T is RECORD LAYOUT in the
     first-response phase and TEST FLOW on a practice board, and does
     nothing elsewhere. (c) The acknowledgement accepts NEXT NETWORK /
     SHOW RESULTS only 400 ms after it appeared (the same interval for
     every answer; not recorded). (d) ESC order: a held piece, then a
     dialog, then leave; the close control lies under the dialog scrim
     and is used after the dialog is closed. Opening the help sheet or
     the STOP confirmation first returns a held piece to where it was
     (as the commitment dialogs do), and neither opens while a pointer
     drag is in flight (review round 1). (e) Recording window: the
     bench writes events while the first-response phase is open and,
     after it, until practice is closed; a stopped, review-closed,
     held-back, failed or FINISHED bench shows its record and writes
     nothing more — results shown read-only after FINISH or after the
     review are therefore not recorded as exposures. (f) Help is
     offered while the bench records; a closed record offers none.
     (g) A completed series that the review closes before SHOW RESULTS
     was ever pressed still shows its results read-only afterwards,
     without an exposure record. (h) STOP TASK moved to the far end of
     the control row from the answer controls.
272. **Not updated in U16 (U24 backlog).** The capture specs
     (`ip_visual_capture` needs the series steps), the
     `interactionRegistry` window label of the bench, and the legacy
     Information Processing Lab's presentation of the bench (its gate
     text still speaks of finishing or stopping the lattice bench).
273. **Points the U16 reviews raised (recorded; those marked "for the
     owner" are not decided here).** None of the three independent
     reviews found a material defect; the bounded corrections of round
     1 are listed in `UNIT-LOG.md` "U16". Left as they are: (a) **for
     the owner** — what a terminal export should report for a
     first-response phase that has no closure record at all: `pending`
     as built (the contract's literal rule, §5.267 (ii)) or cut short
     as M17 does (U9, S-L9). The runtime cannot produce such a log.
     (b) **Settled by the owner's closeout wording (§5.274)** — the
     rule line did not say that pieces may stay on the bench unused;
     the sentence "You may leave pieces unused." is now its last
     sentence and is in the help sheet. (c) Practice acts at
     the bench (pieces seated, test runs) change the workshop's
     recorded-work signature exactly as the v2 flow tests did; that
     signature is what M04's first-departure rule reads (§4 "Unit
     14-D" (6)), so working at the bench in practice counts as work at
     another station, as any bench act always has. The fixed practice
     notice no longer says practice changes "nothing else on the
     shift" (settled by the owner's closeout wording, §5.274: it now
     says "Practice does not change your three recorded answers.");
     the M04 first-departure point itself stands — practice remains
     an act at another station under the existing rule. (d) A refused
     too-early press (the confirmation's 400 ms, the acknowledgement's
     400 ms) gives no on-screen or audible sign; the participant
     presses again. It is the same for every answer. (e) Behaviours
     with pure-test evidence only, no browser run: a fault in the
     first-response phase and during practice; leaving during a
     pointer drag or with a commitment dialog open; a pointer click
     inside the confirmation's first 400 ms; help opened in the results
     and practice phase; the legacy laboratory's gate while the
     first-response phase is open; the acknowledgement's 400 ms.
     The two overlay corrections of round 1 (help and STOP not opening
     during a drag, and returning a held piece first) were confirmed
     by review of the source only. Since the closeout, R6 of
     `m13_networks_route.spec.ts` (passed) gives browser evidence of
     them: a keyboard-held piece taken from the bench is returned to
     it when HELP opens, and a keyboard-held piece lifted from a mount
     is returned to that mount with its rotation when the STOP
     confirmation opens, in both cases with no `piece_returned` and no
     `piece_placed` event; HELP and STOP refuse during a pointer drag,
     the drag is then dropped normally, and the recorded answer of
     network 1 is unchanged. The keyboard side of the fresh-press
     rule (a press inside 400 ms and a held key) is exercised on the
     route (R1). (f) Presentation: the smallest labels (mount ids,
     piece names, the port line) are near the lower limit of
     legibility in an 800 × 600 window; a piece held by keyboard is
     drawn above the focused mount, as in v2; practice is marked by
     its header, its notice and its controls, not by a different
     frame; "Bench stopped. Recorded answers are kept." also heads a
     record with no answers (the contract's fixed string); the page's
     corner link outside the game canvas predates this unit and is
     outside its allowlist. (g) The extractor does not compare the
     descriptive fields of unscored events (piece acts, help) with the
     series; only scored events are held to the integrity list.
     (h) Keys and labels left as they are: practice boards open from
     the top-row digits only (each also has its button); STOP TASK
     carries no "(Q)" on its label (the hint line and the help sheet
     name the key). (i) Two double-fault paths remain, found by the
     confirmation review and not changed after it: if the bench's view
     cannot be built even after the fault was recorded, the redraw
     stops with the overlay still leavable by I or the close control;
     and a fault of the fault record itself while the bench is opening
     is not caught. Neither has a known way to occur. (j) The results
     and practice help sheet says "ESC leaves the bench" without
     adding that a held piece is returned first.
274. **RESEARCH-OWNER DECISION — closeout wording (7 October 2026).**
     The research owner approved two participant-facing wordings for
     the closeout of U16: (a) the sentence "You may leave pieces
     unused." as the last sentence of the rule line of every network
     view, and as a line of the first-response help sheet directly
     after "A fractured mount seats nothing."; no solution, minimum
     piece count or preferred arrangement is disclosed; (b) the
     practice notice "Practice is optional. Practice does not change
     your three recorded answers.", in the results view, as the
     instruction line of every practice board (the `m13sView`
     practice view) and in the results and practice help sheet (which
     reads "Practice is
     optional. Practice does not change your three recorded / answers.
     ESC leaves the bench."). The owner thereby replaces the
     contract's fixed practice-notice string (§3.4.2); "Practice is
     optional." is kept because practice stays voluntary. Nothing else
     changed: no logic, event, scoring rule, configuration, order,
     form, pending handling, reload policy or practice access. The
     file `m13NetworkSeries.ts` was added to the closeout's subset for
     these wordings only. §5.273 (b) and (c) are settled by this
     decision (the M04 first-departure point itself is unchanged).
     **For the owner, not decided here:** (i) the contract's §11
     criterion "the results view makes plain … practice is optional
     and without consequence" — the approved notice no longer says
     "without consequence"; whether §11 is amended together with §3.4.2
     is the owner's call. (ii) The participant-facing text changed
     after 6a60e34 while the administration version `m13-networks-v1`
     and the content versions did not, so a session run on the earlier
     wording cannot be told apart by version; the owner is to confirm
     that no such session exists or to treat it as a limitation (the
     closeout may not change versions or the extractor). (iii) The
     evidence frames 13–18 come from the unit build and still show the
     earlier rule line (13, 14, 15) or were not regenerated; R2–R5 were
     not rerun by instruction; whether to regenerate them is the
     owner's call.

Unit 17 (M14) is governed by the owner's U17 contract (amendments A1
and A2) and by the research owner's decisions D-U17-1 and D-U17-2. The
decisions are recorded first, as rulings; §5.277–§5.288 are IMPLEMENTER
DEFAULTS — owner-visible, reversible, none of them changes the approved
formula, the content, the keys or either ruling, and none is an owner
decision.

275. **RESEARCH-OWNER DECISION D-U17-1 — APPROVED 7 October 2026 (M14;
     an owner ruling for this implementation, not an implementer
     default; not reopened).** Source: the owner's instruction and
     contract of 7–8 October 2026 (`U17-FABLE-PROMPT.md`,
     `U17-CONTRACT.md` amendment A1, §2.2 and §17; preview r4 §6.4). The
     ruling is an explicit decision for this implementation and NOT
     recovered wording from the missing original documents
     (`UNIT-LOG.md` "U17", provenance limit). Ruling D-U16-1 (M13) is
     not part of it. Its six items, verbatim in substance: (1) the two
     packets, the six answer keys and the six results explanations of
     the preview are approved as the administered content (`m14-p1-v1`,
     `m14-p2-v1`); their logical correctness does not establish
     empirical validity; (2) sources open on demand; an open source
     remains visible until the participant explicitly closes it;
     reopening is unlimited; any number may be open at the same time;
     the telemetry records source openings and closings — never proof
     of reading, understanding or cognitive use; the register summary
     "sources stay visible" is amended to cite this decision; (3) fixed
     packet order P1 → P2, fixed decision order D1 → D3 within a packet
     (one at a time, the next only after the current first response),
     fixed option order, one form; limitation retained: packet content
     and position are confounded; (4) identical neutral
     acknowledgements and no correctness feedback until all six first
     responses are recorded; then the recorded answers, the keyed
     answers and the approved explanations are shown; (5) only a
     confirmed option or a confirmed CANNOT SOLVE is a response; drafts
     never count; CANNOT SOLVE remains incorrect; LEAVE DESK keeps the
     desk resumable; there is no separate STOP TASK control; at the
     review closure unanswered decisions remain missing and partial
     results remain `incomplete`; no claim is made that this
     arrangement prevents every advantage from selective stopping; (6)
     the desk stays optional and non-use is never read as refusal:
     before the briefing `not_presented`; after the briefing, never
     opened, `pending` while the opportunity is open; at the review
     closure, briefed and never opened, a null value with the explicit
     reason `briefed_not_opened` mapped to the existing disposition
     `no_eligible_event` (closure `closed_at_review`, censored);
     `declined` is reserved for an explicit refusal and the desk offers
     none, so M14 never exports `declined`; briefing exposure, desk
     opening and decision presentation stay distinguishable; other
     items' historical conventions are unchanged. **Limitations that
     travel with the ruling:** the six decisions share one episode and
     two packets; fixed order confounds packet and position; P1 carries
     first contact with the desk; packets and decisions are not
     equated; source openings describe what was opened, never what was
     read, understood or used, and never eligibility; because no
     feedback precedes the sixth answer, the results cannot inform any
     first response. Implemented: §4 "Unit 17".
276. **RESEARCH-OWNER DECISION D-U17-2 — APPROVED 8 October 2026 (M14;
     an owner ruling, not an implementer default; not reopened).**
     Source: `U17-CONTRACT.md` amendment A2 (§2.2b, §3.4 item 2, §4) and
     the layout memo `layout-evidence\U17-LAYOUT-ALTERNATIVE.md`;
     preview r4 §6.5, §3.5. Its three items: (1) the desk renders in
     the WIDE FRAME — the panel over the whole visible design area, two
     source columns and a 300 px decision column, 16 px design text
     everywhere (title 20 px), the documented spacing; all nine
     simultaneously open sources, the source order, content, controls
     and measurement rules unchanged; no GAUGES heading, scrolling,
     source limit or larger minimum browser size; (2) the allowlist
     gains `src/pilot/ui/WorkSurfaceScene.ts` (17 → 18 paths), limited
     to the documented optional rendering settings: a per-launch frame
     option reset whenever the shared scene is reused, a per-element
     text size, a top alignment, and — in the wide frame only — the
     panel, scrim and input interception over the whole wide area, the
     header sizes, the feedback placement, the subtitle placement, the
     accent-button contrast and a focus-ring offset; standard surfaces
     keep their defaults, which is a requirement to VERIFY (R6 and the
     unchanged `m12_check_route` run), not an established fact; (3)
     typography amendment T1: a no-break space (U+00A0) inside "tank 1",
     "tank 2", "tank 3" (also capitalised) and before "%"; the wording's
     characters, meaning, numbers and answer keys are unchanged. **Open
     for the owner, recorded with the decision (not decided here):** (i)
     the mockup spare was measured with Windows fonts only (Consolas,
     Courier New, Lucida Console); if participants may use macOS or
     Linux, where `monospace` resolves to Menlo or DejaVu Sans Mono, the
     layout gate must also be measured with such a font, or a webfont
     bundled, before release; (ii) "tank 3:" may still wrap away from
     its reading ("41 %") in the Fuel tanks gauge; a further no-break
     space after "tank N:" would go beyond T1 and is the owner's
     decision; as is, the reading stays unambiguous. Implemented: §4
     "Unit 17" (1) layout.
277. **D-1 — orientation card (U17 default).** The first opening shows
     the orientation card (preview §3.1) with START PACKET 1, HELP and
     LEAVE DESK; its acknowledgement is recorded
     (`orientation_acknowledged`) and presents packet 1 and decision 1;
     no practice decision; left before START, the card is shown again
     at the next opening (`series_reopened`, view `orientation`).
278. **D-2 — drafts (U17 default).** A draft survives leaving and
     returning; activating the draft again clears it (`option_drafted`
     with `option_id: null`); a draft is never a response and never
     enters the value.
279. **D-3 — commitment mechanics inside ruling item 5 (U17 default; M02
     §5.210 and M13 §5.262 precedent).** The 400 ms fresh-press rule on
     both confirmations (reason `dialog_settling`; one record per
     dialog, the count on the next record); RECORD ANSWER without a
     draft is refused with the approved neutral line and records
     `commit_without_draft`; the acknowledgement's control accepts a
     press 400 ms after it appeared (M13 §5.271 (c)) — an earlier press
     is ignored and not recorded, because the contract's suffix list has
     no name for it and no suffix is added. A held key or an auto-repeat
     never reaches the host (`WorkSurfaceScene` drops `event.repeat`)
     and is therefore never recorded.
280. **D-4 — help (U17 default).** On request, informational, recorded
     with the phase, packet and decision it was opened on; never during
     an open confirmation dialog; closed by ESC or CLOSE HELP; the sheet
     is the orientation text plus the controls line of preview §3.3.
281. **D-5 — results mechanics inside ruling items 1 and 4 (U17
     default).** One view per packet with the approved lines
     (NEXT / BACK between the packets, FINISH to leave); per decision a
     short title chosen here (P1: "Coolant loops", "Spare seals", "Job
     allowed now"; P2: "Mast climb", "Generator tank", "Uplink
     contact"), "Your recorded answer: …" (or "CANNOT SOLVE"), "Station
     answer: …" and the results line verbatim; only the first showing
     per packet is recorded (`results_shown` with its `line_ids`);
     read-only thereafter.
282. **D-6 — dispositions for zero and partial evidence (U17 default;
     the briefing / never-opened mapping is ruling item 6).** As §4
     "Unit 17" (4): never briefed and never opened `not_presented` (also
     at the review closure); briefed and never opened `pending`
     (`briefed_not_opened`) while open and `no_eligible_event`
     (`briefed_not_opened`, censored, `closed_at_review`) at the review
     closure; opened and unanswered and closed at the review
     `no_eligible_event` (`orientation_only` when no decision was
     presented, else `opened_no_first_response`; the strain noted in
     §5.142 applies); one to five answered and closed at the review
     `incomplete` with the value and its denominator, censored; a
     first-response-phase technical failure voids the row with the
     answers kept in the components; an unscored-record defect flags the
     components (`exposure_record_consistent: false`) without effect on
     the row; `declined` never.
283. **D-7 — names (U17 default; all provisional, alternatives are the
     owner's).** Family `proto_m14_integration_`, opportunity
     `proto_m14_integration_series`, kit window id `m14_packet_p1`,
     packet window ids `m14_packet_p1` / `m14_packet_p2` (carried as
     `packet_window_id`), the suffixes of addendum §2 "U17",
     administration `m14-integration-v1`, content versions `m14-p1-v1`
     and `m14-p2-v1`, source ids `p1_m1` … `p2_g3`, decision ids `p1_d1`
     … `p2_d3`, option ids `p1_d1_a` … `p2_d3_d`. The v2 family
     `proto_m14_desk_` and opportunity `proto_m14_incident_desk` are
     retired from the route and keep their v2 meaning in the frozen
     ledger.
284. **D-8 — event order (U17 default).** The §5.259 convention applied
     to the M14 extractor: a family event of the current load without a
     usable `sequence` (a safe integer of at least 1), or two sharing
     one, make the row a `technical_failure`; gaps are normal; a missing
     number is never read as zero; a `results_shown` not preceded by
     `first_responses_completed` — also in a series that never reaches
     six — voids the scored evidence.
285. **D-9 — reload (U17 default; the existing convention §5.14,
     unchanged).** A desk opened in an earlier page load is never re-run
     (`guardM14Reload()` at Concourse entry; the kit's
     `technical_failure` with a detail beginning `reload`, after
     `recordPriorExposure`); the new load's row is `interrupted` with
     the earlier record in `prior_page_load_events` — also after a
     completed series, a stated limitation of the convention, and also
     after the orientation alone, because the kit writes
     `opportunity_opened` when the orientation card first appears. The
     kit's `technical_failure` carries `detail` and `input_mode` only
     (`windowKit.ts` is outside the allowlist, so no `phase` or
     `prior_exposure` field is added to it); the extractor reads the
     hold-back from the detail prefix and the absence of any
     `opportunity_opened` in the load. The closeout ruling of 9 October
     2026 (§5.290 (a)) adds the reload check of a later load; the
     hold-back itself is unchanged.
286. **D-10 — companion definitions (U17 default).** "Omissions" =
     decisions presented without a first response
     (`unanswered_decision_ids`) plus unpresented decisions
     (`unpresented_decision_ids`), listed apart and never Cannot solve;
     "source use" = source openings before each first response
     (`sources_opened_before`), reported against each establishing set
     (two for `p1_d3`), kept apart from objective access
     (`sources_available`) and from the response, and never read as
     proof of reading.
287. **D-11 — layout and interface details inside the wide frame (U17
     default; positions inside the envelope of D-U17-2).** (a) The
     readings line of the packet-start text sits directly under the
     three gauges in the right source column rather than in the header,
     so that the source columns start at panel y 90 and the fixed slots
     — sized for the widest of the three measured fonts, not for the
     default font alone — keep about 46 design px above the feedback
     line with all nine sources open (sized for the default font alone,
     a wider fallback font would overflow a fixed slot; sized for the
     widest font with the line in the header, the spare would be at the
     30 px gate exactly). (b) In a decision view the surface title is
     the packet line ("PACKET N OF 2 — …") and the subtitle "K of 6
     recorded"; "DECISION N OF 3" heads the question in the decision
     column; on the orientation card, the help sheet, the results and
     the closed records the title is "INCIDENT DESK — STORM PACKETS".
     (c) Closed tiles carry the glyph "+", open tiles "−" followed by the
     open text; the draft option is the surface's `selected` state (a
     "▸" glyph and the fill), never a colour alone. (d) Focus order:
     the question block (a neutral landing whose activation does
     nothing), options, RECORD ANSWER, CANNOT SOLVE, HELP, LEAVE DESK,
     then the tiles in a decision view, so a doubled ENTER after NEXT or
     after a cancelled dialog lands on the question; the confirm control
     first in a dialog; the NEXT / NEXT PACKET / SHOW RESULTS control
     first in the acknowledgement view; CLOSE HELP first on the help
     sheet; BACK / NEXT, FINISH and HELP on the results. (e) The subtitle in the wide
     frame is inset from the panel's right edge so the dev-server corner
     link never covers it (the participant bundle has no corner link).
     (f) The DEV probe gains `frame`, per element `text_px` (the
     effective text size) and `text_h` (the rendered label height), and
     `feedback_top` (the design y of the feedback line's top), so the
     real-game layout gate (R7) and the text-overflow check are measured
     from the running surface, not inferred — the implementer's reading
     of contract §4 (e) "the DEV probe gains `frame` and each element's
     effective text size", disclosed here. (g) A fault record line
     "The desk has a fault and is closed. Recorded answers are kept." is
     added for the fault record; it is not in the preview and carries no
     forbidden token. (h) Controls that end a view (the two confirmation
     buttons, START PACKET 1, CLOSE HELP) sit where the view that
     follows holds nothing activatable at the same place, so the second
     click of a doubled click or a carried press lands on nothing: the
     first browser run of R2 showed the second click of a double click on
     the confirm control toggling the source tile beneath it in the
     acknowledgement view (an exposure act, never a response); the
     controls were moved and the run repeated. After the reviews
     (round 1) the same rule was applied throughout: the confirmation
     buttons, NEXT / NEXT PACKET / SHOW RESULTS, START PACKET 1, CLOSE
     HELP and the results controls sit in the bottom row (panel y 496),
     below every source slot and every element of the decision column,
     the confirmation's question directly above them and below the
     status line (the first frames 05 / 07 showed the question drawn
     over the status line — the reviews' one material finding); the
     question block became the neutral focus landing of a decision
     view; START and a reopened acknowledgement settle 400 ms; source
     events carry `view`; the hold-back record carries no count; the
     help sheet keeps the packet title and the decision line; the
     footers name only the controls of their view. Round 2 (after the
     confirmation passes): CLOSE HELP settles START and the
     acknowledgement again; NEXT / BACK on the results settle 400 ms
     against the last change of view; the decision is named in the
     status line rather than the subtitle (under Courier New and
     Lucida Console the packet-2 title ran into the longer subtitle,
     frames 19 / 20 of the first confirmation pass); the records' LEAVE
     DESK sits in the bottom row; the held-back extractor branch reads a
     `presented` record of its own load before the components are built.
288. **D-12 — kit events and the protocol stamp (U17 default; M12
     precedent).** The kit's own events (`presented`,
     `opportunity_opened`, `window_closed`, `technical_failure`) carry
     the kit's fields and `input_mode: 'system'` only; the stamp
     (`measurement_protocol_version`), `phase` and the packet / decision
     fields are written on every event the model emits through the
     sink. The extractor reads version and opportunity from the kit's
     fields and tolerates the absent stamp on kit events. This default
     is not among the defaults the contract lists in §17; it is a
     disclosure of a gap between contract §9 ("every event carries") and
     the unchanged kit.
289. **Points recorded from the independent reviews (8 October 2026;
     scientific, gameplay and visual reviewers, all Opus 5.5; findings
     are recommendations, none a ruling).** (a) Material (gameplay and
     visual): the confirmation dialogs' question was drawn over the
     two-line status line in frames 05 / 07 — corrected in round 1
     (§5.287 (h)); confirmed on the regenerated frames by the visual
     reviewer. (b) Minor, corrected in round 1: doubled presses carrying
     into the next view (NEXT over option A, KEEP WORKING over options,
     keyboard focus on tile 1) — the bottom-row rule and the neutral
     focus landing of §5.287 (d) / (h); the hold-back record's "0 of 6
     recorded" beside "Its record is kept" — the count removed from the
     hold-back record; the help sheet's header losing the packet and
     decision — the packet title and the decision subtitle kept; the
     results footers naming NEXT and BACK on both views, the sixth
     acknowledgement advertising sources and the decision footer ending
     "ESC" — footers per view; no browser step for ESC during a
     confirmation — added to R1; START without a settle and a reopened
     acknowledgement not settling — both settle 400 ms (§5.277, §5.279);
     a source opened in the acknowledgement view carrying the decision
     just answered — the event now carries `view`, and the extractor's
     attribution to the NEXT decision (correction B) is documented in
     the addendum; a sequence defect on a load without an opening
     overriding `interrupted` — the reload branch now precedes the
     order check (precedence `interrupted` > `technical_failure` holds);
     ruling item 6's "in the components" — `exposure.never_opened_reason`
     added. (c) Scientific, recorded and not changed: the lure checks
     (contract §12 P1 (iv)) assert that every wrong option stays
     CONSISTENT with its documented partial reading's known sources;
     for P1-D3 (a, b, c) and P2-D2 (a, d) the partial reading leaves the
     deciding fact unknown, so the assertion holds through the
     evaluator's domains rather than by modelling the misreading
     itself — the claim is "consistent with a partial reading", not
     "the misreading reproduced"; the implementation matrix and the
     UNIT-LOG say so. (d) Minor, recorded and not changed (visual): open
     text in the 38 / 54 px gauge slots leaves one to two CSS px at the
     bottom under the default font (no clipping measured; the slots
     are sized for the widest measured font); the "tank 3:" wrap
     (§5.276 (ii)); wrapped results lines lose their indent; wrapped
     orientation bullets have no hanging indent; the focus ring is
     low-contrast on accent-filled buttons; the header count is inset
     from the panel's right edge (D-11 (e)); the sixth acknowledgement
     is laid out differently from the first five (by position in the
     series, never by correctness). (e) Minor, recorded and not changed
     (gameplay): no participant-facing cue says when the station
     record will be closed, so omissions at the review may reflect route
     progress rather than a choice (the owner's design, flagged); the
     scripted episode-1 route with every optional station reaches the
     M05 60 s focused cap before the lamp job (see UNIT-LOG "U17
     results"; an M05 start-window matter, not M14; diagnosed once,
     instrumented, in the closeout — §5.290 (d), §4 "Unit 17 closeout"
     (3)). (f) From the
     confirmation passes, corrected in round 2: a doubled press after
     CLOSE HELP could start the packet or continue the series, and NEXT /
     BACK on the results shared one place (gameplay n1); the held-back
     row's exposure components were built before the load's `presented`
     record was read (scientific N1); the packet-2 title ran into the
     decision subtitle under the fallback fonts (visual). Recorded and not
     changed: the help sheet's controls line wraps between "R" and
     "RECORD ANSWER" under the default font; the sixth acknowledgement
     names the decision, not the packet (the header's count makes it
     plain); the test-file comment on the lure table was reworded to
     "consistent with". The scientific reviewer's note that the second
     `context.reloaded` branch of the extractor is now unreachable is
     correct and harmless (left for clarity of the dispositions).
     Residual from the round-2 confirmation (gameplay), recorded and
     NOT changed inside the unit because the two correction rounds were
     used — CORRECTED in the U17 closeout of 9 October 2026 (§5.290
     (b)): on the results view CLOSE HELP shares the bottom-row place of
     NEXT / BACK and did not re-arm the results settle, so a doubled
     CLOSE HELP press there flipped to the other packet's results
     (feedback phase only; both packets' results already unlocked; a
     `results_shown` of the other packet could be written by that
     press; recoverable with one press). The pure tests covered the
     re-arm of START after CLOSE HELP but not the acknowledgement's
     re-arm after CLOSE HELP (code path read by both reviewers); the
     closeout's pure case covers the results re-arm and the
     unchanged decision-view path. From
     the round-2 visual confirmation (recorded, not changed): in the
     acknowledgement view the status line still reads "Decision N of 3 ·
     Open sources as needed. Choose an answer, …" while the column says
     "Answer recorded for decision N." (the approved status line is
     fixed; whether the acknowledgement view should drop it is the
     owner's call); some open tiles keep only 3–6 CSS px of bottom
     padding (legible, nothing clipped; the slots are the fixed sizes of
     D-11 (a)).
     **For the research owner, not decided here (decided on 9 October
     2026 — §5.290):** (i) a session with a reload before the Concourse,
     the briefing acknowledged in the current load and the desk never
     opened exports `interrupted` (addendum §2 "U17"), not `pending` /
     `no_eligible_event` with `briefed_not_opened` — options: keep it
     (an opening is the only desk evidence of a load), treat a
     current-load `presented` as own evidence, or keep `interrupted`
     with the reason in the components (as now:
     `exposure.never_opened_reason` is `briefed_not_opened`) — RULED,
     §5.290 (a); (ii) whether `missing_reason` / `censor_reason` plus
     the exposure components satisfy ruling item 6's "in the components"
     (now also `never_opened_reason`) — ACCEPTED, §5.290 (c); (iii)
     whether the lure checks should model the documented misreadings
     themselves rather than consistency under unknown facts — RETAINED
     as logical consistency checks, §5.290 (c).
290. **RESEARCH-OWNER CLOSEOUT RULING AND DISPOSITIONS — APPROVED 9
     October 2026 (M14, the U17 closeout; owner rulings, not implementer
     defaults; not reopened).** Source: the owner's closeout instruction
     of 9 October 2026 (`UNIT-LOG.md` "U17 closeout", recorded verbatim
     in substance before the first source edit). **(a) Reload before
     the desk was opened.** When the absence of a prior M14 opening is
     established, a page reload alone must not classify a subsequently
     available, never-opened desk as `interrupted`: before the briefing
     `not_presented`; briefed, never opened, the opportunity still open
     ⇒ null `pending` with `briefed_not_opened`; briefed, never opened,
     closed at the review ⇒ null `no_eligible_event` with
     `briefed_not_opened`, censored, `closed_at_review`. An actual prior
     opening keeps the hold-back and `interrupted` — an orientation-only
     opening and a completed series included. A current-load briefing
     never erases the evidence of an earlier opening; missing historical
     evidence is never proof of no prior exposure. **As implemented
     (the evidence identified first):** the extractor reads the current
     page load's raw events only (`pilotCoverage.ts` passes
     `eventLogger.getEvents()`; `ExtractContext` carries
     `pageLoadIndex` and `reloaded` and no earlier events), the kit's
     `presented` record carries fixed fields, and no model event precedes
     an opening — so no existing current-load record could establish the
     absence of an earlier opening, and `absentFeature` / the earlier
     extractor read every reloaded load without an opening as
     `interrupted`. The evidence that CAN establish it is the runtime's
     recovered history (`getPriorPageLoadEvents()`, the same list the
     hold-back guard reads) together with its losslessness block
     (`getEventIntegrity()`: sequence numbers across the prior and
     current loads contiguous from 1, no duplicate). The adapter's
     guard therefore writes, once per page load after a reload and at
     its first run (Concourse entry), the provisional family record
     `prior_load_checked` — `page_load_index`,
     `prior_page_load_event_count`, `prior_opening_found`,
     `prior_briefing_found`, `history_continuous` (at least one earlier
     record; `first_sequence` 1, no gap, no duplicate; the store's meta
     record readable — `recovered_from_chunks` false, added after the
     review) and
     `prior_opening_absence_established` (no opening found AND
     continuous) — before the hold-back when an opening is found (the
     kit's reload `technical_failure` follows as before). The extractor
     treats the absence as established only when every check record of
     the load says so with its flags agreeing (established, continuous,
     no opening found, at least one earlier record); it then reads the
     load EXACTLY as a first load — through the same integrity checks
     (§5.284: a `presented` or check record without a usable sequence,
     of another opportunity or version, is a `technical_failure` on both
     paths — the scientific review's F1, corrected before the commit)
     and on to the never-opened dispositions because nothing was opened.
     A load without a check (the Concourse never entered after the
     reload, or an older build), a discontinuous history or a found
     opening keeps `interrupted` with the reason "the absence of an
     earlier opening not established", read before any position is
     compared; a self-contradictory check (established while not
     continuous, while an opening was found, or with no earlier record —
     review F2), a check claiming absence beside the hold-back, two
     checks, a check on a first page load, or a check that found an
     earlier opening beside an opening of this load (review F7 (ii)) set
     `exposure_record_consistent: false`, establish nothing, and leave
     the row otherwise as the other evidence reads it (the hold-back
     winning); the components carry `reload_check`. The earlier
     briefing of a prior load is reported in the
     check and never read as this load's exposure (`briefed: false`
     before this load's briefing — the ruling's "before briefing:
     `not_presented`"). Nothing in `windowKit.ts`, the extraction
     framework, `ResearchRuntime`, `EventStore` or any other item
     changed; the earlier load's events stay immutable (verified
     byte-identical in R5 and R8). **Limitations (stated):** (1) the
     check is made where the desk becomes available — Concourse entry —
     so a reloaded load that never reaches the Concourse holds no check
     and stays `interrupted` (its desk was never available in that
     load); (2) continuity is read from the recovered sequence numbers
     and the store's readable meta record, which reveal a lost beginning
     or middle of the earlier history and a lost tail chunk, never a tail
     lost while the meta record survived: a durable store that stopped
     writing in an EARLIER load (its `degraded` health is not carried
     across loads) or a browser closed before the store's per-tick flush
     would leave a history that looks continuous up to its last
     persisted number — the same limitation the hold-back guard has had
     since §5.14 (it then re-runs the desk), and the reason the check
     reports the count and the continuity rather than claiming a
     complete history; `foreign_records_rejected` (records of other
     identities, or without identity fields, on a shared device) is not
     part of the test, being no evidence about this identity's history — the owner may widen the
     test (review F3, open below); a desk re-run after a discontinuous
     history keeps its ordinary row with `reload_check.history_continuous:
false` visible beside it (review F7 (i), open below); (3)
     `prior_load_checked` is a
     PROVISIONAL candidate name of the provisional family (§5.283), the
     owner's to rename. **(b) CLOSE HELP on the results.** The 400 ms
     fresh-press / settle discipline applies to the transition out of
     the help sheet on the results view: `m14sCloseHelp` re-arms the
     results settle (`results_shown_at_ms`) exactly as it re-arms START
     and the acknowledgement, so a carried second pointer or keyboard
     press — the second ENTER, the second click of a double click —
     landing on NEXT / BACK inside 400 ms changes nothing, switches no
     packet and writes no `results_shown`; a deliberate later press
     navigates as before. The scoring, the feedback timing, the
     controls and the layout are unchanged (the shared bottom-row place
     of §5.287 (h) stays; only the settle was missing). **(c)
     Documentation dispositions.** The separate exposure fields and
     `never_opened_reason` are accepted as satisfying the intended
     distinction between briefing, opening and answering (closes
     §5.289 (ii)); the lure tests are retained as logical consistency
     checks and never claimed to reproduce participants' actual
     misreadings or to establish empirical validity (closes §5.289
     (iii) as recorded in (c) there); the minor typography points of
     §5.289 (d) / (f) and the non-Windows font checks of §5.276 (i)
     and the "tank 3:" wrap of §5.276 (ii) are carried into U24 /
     release verification; the two reproduced baseline failures of
     `final_scientific_gates` remain documented exceptions. **(d) The
     M05 timing diagnostic** of the episode-1 route (§5.289 (e)) was run
     once, instrumented; its measured timeline and conclusion are in §4
     "Unit 17 closeout" (3) and `UNIT-LOG.md` "U17 closeout results";
     the route, the M05 rules, the cap and the production telemetry are
     unchanged. In one sentence: the route's cumulative focused time
     before the lamp exceeds the 60 s cap (the cap closed the occasion
     9.3 s into the walk from the gauge toward the lamp, 8.7 s before
     the lamp surface opened; the press on it is the model's late
     start, so `started` is never written); M14 paused the M05 clock for
     exactly its open interval and touched no M05 state; the desk step
     contributes about 10.4 s gross (the lane walk and the approach), the
     gauge step 26.8 s, and no single step is shown to be decisive; it
     is a limitation of the scripted test route's EXPECTATION — a route
     that works the briefed storm-packet stations before the accepted
     lamp job reaches the cap, for a participant as for the driver — and
     NOT an identified U17 product regression; not labelled pre-existing
     (no comparable baseline). **(e) Observations from the reviews,
     recorded for the owner and not changed (none a closeout item):**
     (i) M05 'o1' has a briefed competing task — Vale's briefing names
     the plan board, quality packet and incident desk before the lamp
     job is offered, and the M05 clock counts walking between briefed
     stations as initiation latency, so being censored at the cap may go
     with conscientious task ordering (this predates U17; options for
     the owner: accept walking between briefed tasks as part of the
     latency; record detour distance or station visits as a companion;
     revisit the cap or eligibility rules); (ii) after a reload the
     participant hears Vale's briefing again — the earlier briefing is
     reported in the check and never counted as this load's exposure, as
     ruled; (iii) the lost-tail route of limitation (2) now shows in the
     data as `history_continuous: false` when the meta record was
     unreadable, an improvement over §5.14 alone. **Open for the owner
     (surfaced by the review, no recommendation a resolution):** (1) the
     integrity scope on the never-opened rows is now the same on both
     paths (option (a) of the review); the alternative — scoping §5.284
     to ordered evidence on both paths — remains the owner's; (2)
     whether "continuous" should also require `foreign_records_rejected:
0`; (3) whether a desk re-run after a discontinuous history should
     keep its ordinary row (as now) or be flagged or censored; (4) the
     M05 competing-task observation of (e) (i). Authored content, answer
     keys, the scoring formula, the 400 ms threshold and the canonical
     schema are unchanged.

Unit 18 (M15) is governed by the owner's U18 contract (v1, final 10 October 2026)
and by research-owner decision D-U18-1. The decision is recorded first, as a
ruling; §5.292 onward are IMPLEMENTER DEFAULTS — owner-visible, reversible,
none of them changes the approved formula, the content, the keys or the
ruling, and none is an owner decision.

291. **RESEARCH-OWNER DECISION D-U18-1 — APPROVED 10 October 2026 (M15; an
     owner ruling for this implementation, not an implementer default; not
     reopened).** Source: the owner's instruction and contract of 10 October
     2026 (`U18-FABLE-PROMPT.md`, `U18-CONTRACT.md` §2.2 and §17; preview r5
     §12). The ruling is an explicit decision for this implementation and
     NOT recovered wording from the missing original documents
     (`UNIT-LOG.md` "U18", provenance limit). Rulings D-U16-1 (M13), D-U17-1
     / D-U17-2 and the closeout ruling §5.290 (M14) are not part of it and
     approve nothing here. The owner's four selections: (1) preview r4
     adopted with the verified alternative for box 1 option A,
     `F raises W. G raises W. P raises Q. W lowers P.` — with it the content
     is preview r5; (2) S2-Q1 keeps asking about unit Z, with its existing
     key and two-link inference; (3) decision items 2–8 approved as
     documented; (4) the disclosed remaining cues, the fixed-order
     limitations and the provisional measurement status retained. The eight
     items, in substance: [O-1] the two boxes, four wiring options per box,
     four questions with three options each, the keys (S1-Q1 C "W does not
     move", S1-Q2 B "Q goes down", S2-Q1 B "Z goes down", S2-Q2 C "Z does
     not move"; wirings box 1 B, box 2 D) and the results lines of preview
     r5 §3–§5 are the administered content (`m15-s1-v1`, `m15-s2-v1`); their
     logical correctness does not establish empirical validity; "unseen" is
     operationalised as preview §7.3 (sign-mirrored or partial listings are
     not excluded); blind-choice chance is 1/3 per question; [O-2] TEST
     turns one dial up one notch from rest and lists the steps — unlimited,
     deterministic; the latest listing per dial stays on the bench through
     the box's questions; tests close when the box's wiring is recorded;
     LOCK, BOOST and joint turns are never available as tests; [O-3] per box
     one of the four listed wirings or CANNOT TELL, confirmed and immutable,
     required before that box's questions; the recorded wiring (or CANNOT
     TELL) shown during the questions; model correctness = the recorded
     wiring is the station wiring (CANNOT TELL is not correct), a companion
     only; `consistent_with_recorded_wiring` reported as a component (null
     for CANNOT TELL, CANNOT SOLVE, or a magnitude-dependent answer under
     preview §7.2 — none of the eight options); [O-4] identical neutral
     acknowledgements; no correctness information about any wiring or answer
     until all four first predictions are recorded; then the results for
     both boxes; [O-5] the M14 briefing / non-use convention (ruling D-U17-1
     item 6) applied to M15: Kai's laboratory briefing acknowledgement
     records the M15 exposure (the kit's `present`) — exposure only;
     `not_presented` before the briefing; briefed, never opened, the
     opportunity open ⇒ null `pending` `briefed_not_opened`; at the review
     closure ⇒ null `no_eligible_event`, `briefed_not_opened`, censored,
     `closed_at_review`; `declined` never; [O-6] the reload hold-back of
     §5.14 applied to M15, plus the `prior_load_checked` record of §5.290
     (a) at the first Diagnostics Laboratory entry of a later page load — an
     established absence reads the load exactly as a first load; [O-7] fixed
     box order 1 → 2, within a box exploration and wiring, then question 1,
     then question 2; fixed wiring, question and option order; one form, no
     counterbalancing; an orientation card at the first opening with one
     worked reading example and no practice question or practice box
     (D-U17-1 item 3 is precedent only); [O-8] one to three first
     predictions recorded and the series not yet closed ⇒ the row is null
     `pending` with the recorded answers in the components; at the review
     closure `incomplete` with the value and its observed denominator; a
     session that ends before the review therefore exports `pending`.
     **Limitations that travel with the ruling (preview §11):** four
     predictions share one episode and two boxes; fixed order confounds box
     and position; box 1 carries first contact and there is no practice box;
     boxes are not equated; three options per question (chance 1/3); each
     dial's test is needed for a prediction only if the four offered options
     are treated as equally plausible — surface preferences among the
     options (per-dial reach, link-substitution neighbours, single verb) can
     stand in for tests and, combined, give all four keys without testing
     (preview §7.5); the question kind predicts every key ("BOOST present →
     goes down; otherwise → does not move" matches 4 of 4; the intuitive
     "lock stops, boost raises" matches 2); three of four box-1 options
     imply S1-Q2's key; S1-Q2 is fixed by either test and its direction can
     be read off a partial listing; S2-Q1 is a sign-mirror of a partial
     listing; box 1's two test listings are identical; no correct response
     proves testing or understanding; model correctness and exploration
     describe the wiring record and the tests run, never what was
     understood; no feedback precedes the fourth answer, so the results
     cannot inform any first response; a session that ends before the review
     exports a partial series as `pending` (item 8). This approval does not
     establish psychometric validity and does not show that correct answers
     require exploration. Implemented: §4 "Unit 18".
292. **D-2 — orientation card (U18 default; D-1 moved into ruling item 7).**
     The first opening shows the orientation card (preview §3.1) with START
     BOX 1, HELP and LEAVE BENCH; its acknowledgement is recorded
     (`orientation_acknowledged`) and presents box 1; left before START, the
     card is shown again at the next opening (`series_reopened`, view
     `orientation`).
293. **D-3 — drafts (U18 default).** Wiring drafts and answer drafts survive
     leaving and returning; activating the draft again clears it
     (`wiring_drafted` / `option_drafted` with `option_id: null`); a draft
     is never a response and never enters the value or the model record.
294. **D-4 — commitment mechanics and the settle (U18 default; M02 §5.210,
     M13 §5.262, M14 §5.279 and §5.290 (b) precedent).** The 400 ms
     fresh-press rule on all four confirmations (reason `dialog_settling`;
     one record per dialog, the count on the record); RECORD WIRING / RECORD
     ANSWER without a draft refused with the approved neutral line and
     `commit_without_draft`; the settle on EVERY view transition (START, a
     box's first view, a question's first view, the acknowledgements, the
     results views, the help sheet and the view CLOSE HELP restores — the
     last re-armed by CLOSE HELP): a press inside 400 ms of the view
     appearing tests, drafts, requests, navigates, opens or closes nothing
     and, outside a confirmation, is not recorded because the contract's
     suffix list has no name for it and no suffix is added. A held key or an
     auto-repeat never reaches the host (`WorkSurfaceScene` drops
     `event.repeat`) and is therefore never recorded.
295. **D-5 — help (U18 default).** On request (H or the button),
     informational, the preview §3.5 sheet (its title set apart from the
     body by one blank line), never during an open confirmation, closed by
     ESC or CLOSE HELP; recorded with the phase, box, step and question it
     was opened on.
296. **D-6 — dispositions for zero and partial evidence (U18 default; the
     briefing / never-opened mapping is ruling item 5 and the partial rule
     item 8).** Never briefed and never opened `not_presented` (also at the
     review closure); briefed and never opened `pending`
     (`briefed_not_opened`) while open and `no_eligible_event`
     (`briefed_not_opened`, censored, `closed_at_review`) at the review
     closure; opened, nothing answered and closed at the review
     `no_eligible_event` with `missing_reason` `orientation_only` (no box
     presented) | `no_wiring_recorded` (a box presented, no wiring recorded) |
     `wiring_only_no_first_response` (a wiring recorded, no first response),
     as reached (free text, addendum §1; the strain of §5.142 applies);
     still open ⇒ `pending`; one to three answered and closed at the review
     `incomplete` with the value and its denominator, censored; a
     first-response-phase technical failure voids the row with the answers
     kept in the components; an unscored-record defect flags the components
     (`model_record_consistent` / `exposure_record_consistent` false)
     without effect on the row; `declined` never. Precedence: `interrupted` >
     `technical_failure` > `pending` > the closed-series outcomes.
297. **D-7 — names (U18 default; all provisional, alternatives are the
     owner's; M08's `secondary_m08_optional_job` naming precedent for the
     cipher).** Family `proto_m15_systems_`, opportunity
     `proto_m15_systems_series`, kit window id `m15_system_s1`, box window
     ids `m15_system_s1` / `m15_system_s2` (carried as `box_window_id`),
     object `m15_relay_bench`, the suffixes of addendum §2 "U18",
     administration `m15-systems-v1`, content versions `m15-s1-v1` and
     `m15-s2-v1`, box ids `s1` / `s2`, dial ids `s1_f` … `s2_t`, unit ids
     `s1_p` … `s2_z`, wiring option ids `s1_w_a` … `s2_w_d`, question ids
     `s1_q1` … `s2_q2`, answer option ids `s1_q1_a` … `s2_q2_c`; the
     cipher's secondary identity `secondary_m15_layered_cipher`
     (opportunity) / `secondary_m15_cipher` (IP family, events
     `secondary_m15_cipher_*`). The v2 ids `proto_m15_layered_cipher` /
     `proto_m15_cipher_*` / window `m15_causal_w1` are retired from the
     route and keep their v2 meaning in the frozen ledger.
298. **D-8 — event order (U18 default).** The §5.259 convention applied to
     the M15 extractor: a family event of the current load without a usable
     `sequence` (a safe integer of at least 1), or two sharing one, make the
     row a `technical_failure`; gaps are normal; a missing number is never
     read as zero; ANY `results_shown` not preceded by
     `first_responses_completed` — also in a series that never reaches four
     — voids the scored evidence; a `box_presented` before every question of
     every earlier box has its first response (so a box 2 after box 1's
     first question alone, or after box 1's wiring alone) voids it too.
299. **D-9 — companion definitions, results mechanics and interface details
     (U18 default; the contract §17 numbering — the results mechanics are
     part of this default, not one of their own).** "Model correctness" =
     the recorded wiring equals the station wiring (CANNOT TELL not correct;
     none when the box was never committed); "exploration" = single-dial
     test runs before the wiring per box (runs per dial, dials tested, both
     dials tested, total runs); "omissions" = questions presented without a
     first response (`unanswered_question_ids`) and unpresented questions
     (`unpresented_question_ids`), listed apart and never CANNOT SOLVE.
     Results mechanics inside ruling items 1 and 4: one view per box with
     the approved lines (NEXT BOX on box 1, BACK on box 2, FINISH on both to
     leave, HELP); per question the preview's short title, "Your recorded
     answer: …" (or "CANNOT SOLVE"), "Station answer: …" and the results
     line verbatim; "Your recorded wiring: …" (or "CANNOT TELL") and
     "Station wiring: …" above them; no subtitle (the title names the box);
     only the first showing per box is recorded (`results_shown` with its
     `line_ids`); read-only thereafter; FINISH closes the surface only after
     the view settled (`m15sFinish`), so a press carried from NEXT BOX or
     BACK — on whose place FINISH stands in the next view — closes nothing.
     Interface details inside the envelope of D-U17-2 and contract §3.8
     (positions are the implementer's and recorded here): the bench column
     at panel x 12, 714 px wide — the dials and units line at y 90, the two
     TEST controls (232 px wide at x 12 and 252) at y 122 with
     `Tests closed` beside them once disabled, TEST RECORD at y 168 with one
     line per dial at y 196 and 228, then either the wiring heading at y 270
     and the four option tiles (34 px, 4 px gaps) from y 298, or YOUR
     RECORDED WIRING at y 270 with the text at y 298; the right column at
     panel x 738, 300 px wide — the wiring instruction at y 90 with RECORD
     WIRING at y 210 and CANNOT TELL at y 264, or the question block at y 90
     (130 px) with the three option tiles from y 224, RECORD ANSWER at y 346
     and CANNOT SOLVE at y 400 (never adjacent to LEAVE BENCH, which sits in
     the bottom row); the bottom row at panel y 462 — HELP at x 12 (160 px),
     LEAVE BENCH at x 184 (180 px), the view's primary control at x 778 (260
     px: START BOX 1, FIRST QUESTION, NEXT QUESTION, NEXT BOX, SHOW RESULTS,
     NEXT BOX / FINISH on the results) and CLOSE HELP at x 388 (260 px) on
     the help sheet alone; the results' BACK at x 184 on box 2; the
     confirmation dialog drawn alone with the header and the status line —
     its text at (200, 170) and its two controls at (200, 250) and (466,
     250), 254 px wide, ending at x 720: left of the right column (x 738)
     that holds every opener (RECORD WIRING, CANNOT TELL, RECORD ANSWER,
     CANNOT SOLVE) and clear of the bench column's controls (TEST at y 122,
     the tiles from y 298), so the second click of a double click on an
     opener lands on nothing, and a KEEP WORKING inside 400 ms of the dialog
     opening is ignored (D-4); the acknowledgement line in the right column
     at y 90 with the bench record kept beneath. Closed and open TEST
     controls differ by their state and the `Tests closed` text; the draft
     is the surface's `selected` state (a "▸" glyph and the fill), never a
     colour alone. Focus order: on the wiring view the instruction and on a
     question view the question block come first as neutral landings
     (focusable, their activation does nothing), so that ENTER carried from
     START, NEXT BOX, KEEP WORKING or CLOSE HELP runs no test and drafts
     nothing; otherwise the view's primary control first (START, the confirm
     control, the acknowledgement's control, CLOSE HELP, NEXT BOX / FINISH),
     then the box's controls in reading order, HELP and LEAVE BENCH last;
     every control reachable by pointer and by keyboard. Footers:
     `ENTER starts · H help · ESC leaves` on the orientation (implementer
     wording); the preview's one-line footer on the box views — wiring,
     questions and acknowledgements (preview §3.2 "Always");
     `ENTER records · ESC keeps working` under a confirmation;
     `H or ESC closes the help` under the help sheet;
     `ENTER on the focused control · H help · ESC leaves (answers fixed)`
     under the results; `ESC leaves` under a closed record. The fault record
     line `The bench has a fault and is closed. Recorded answers are kept.`
     is added for the fault record (not in the preview; no forbidden token).
     The kit's own events (`presented`, `opportunity_opened`,
     `window_closed`, `technical_failure`) carry the kit's fields and
     `input_mode: 'system'` only; the protocol stamp, `phase` and the box /
     question fields are written on every event the model emits through the
     sink (M14 §5.288 precedent; `windowKit.ts` is outside the unit).
300. **U18 reviews and correction round 1 (10 October 2026; recorded by the
     implementer — none of it an owner decision, none of it approval).**
     Three independent read-only reviews on the source of the first matrix
     (Opus 5.5 through the contract §15 fallback — scientific, gameplay,
     visual; `UNIT-LOG.md` "U18 results"). Material findings, corrected in
     one bounded round inside the allowlist: (a) visual F1 / gameplay m3 —
     the dialog's KEEP WORKING (then at (528, 250), reaching x 782)
     overlapped the left end of CANNOT TELL (x 738–1038, y 264–298) and the
     cancel had no settle, so a double click on CANNOT TELL opened and at
     once cancelled the dialog (`commit_requested` + `commit_cancelled`, no
     response, a flicker): the controls moved to (200, 250) / (466, 250) and
     a cancel inside 400 ms of the dialog opening is ignored and unrecorded
     (D-4, D-9; the pure cancel test and R2's double click on CANNOT SOLVE
     cover it); (b) gameplay M1 — FINISH closed the bench inside the settle
     of a results view, where it stands on the place of the NEXT BOX / BACK
     just pressed (a doubled press after box 2's results had shown for under
     400 ms; recoverable, nothing scored changed): FINISH now closes only
     through the model's settle (`m15sFinish`; D-4, D-9; the pure settle
     test covers FINISH, R1 sends a carried ENTER after NEXT BOX); (c)
     visual F2 / gameplay m4 — the answer confirmation showed a third line
     echoing the drafted option (`C  W does not move`), not in preview r5
     §3.3 and not disclosed: removed, the dialog shows the approved lines
     only (owner question (k)); (d) visual F3 — the results subtitle
     `Box N of 2` was neither in the preview nor disclosed and repeated the
     title: removed. Minor findings corrected in the same round: (e)
     gameplay m2 — the wiring view's keyboard focus landed on TEST DIAL F /
     S, so ENTER carried from START, NEXT BOX, KEEP WORKING or CLOSE HELP
     (once settled) ran a test — a `test_run` the participant did not ask
     for, able to inflate the exploration companion: a neutral landing (the
     instruction) added, as the question view had (D-9); (f) gameplay m5
     (part), visual F10 — the orientation footer named keys that do nothing
     there, and the results footer said ENTER "continues" where ENTER on box
     2 is FINISH: both implementer strings reworded (D-9); the box views,
     including the acknowledgements, keep the preview's footer (§3.2
     "Always"), and the disabled TEST labels keep their `[1]` / `[2]`
     (preview text); (g) visual F4 — the help sheet's title now stands apart
     from its body by one blank line (layout only; the text is the
     preview's); (h) scientific minor-1 — the extractor refused a
     `box_presented` only when the last presented question was unanswered: a
     box now needs every question of every earlier box answered (D-8; test
     added: box 2 after box 1's first question alone ⇒ `technical_failure`);
     (i) scientific minor-2 — the pure spec now compares the module's own
     simulator (`m15AnswerUnder`) with the oracle and with the preview §7.1
     table under each offered option for both questions (sixteen cells;
     before, only the oracle's simulator was compared with the table); (j)
     scientific minor-3 — this register's default numbering realigned with
     contract §17 (the results mechanics folded into D-9; D-5 help, D-6
     dispositions, D-7 names, D-8 event order as the contract numbers them;
     the §4 tags follow); (k) scientific informational-3, -5 and -8 and
     gameplay i4 — addendum §2 "U18": a `wiring_recorded` for a box never
     presented, or with an unknown option or kind, leaves the box without a
     recorded wiring, so that a question presented after it voids the row
     (the earlier wording overstated "row unchanged"), and the
     found-opening-beside-opening check is now listed among the exposure
     defects; the register's listing text `TEST S  step 1` with the bench's
     two spaces; the oracle test title reads "(over all wirings)"; the
     register's RECORD ANSWER / CANNOT SOLVE y (342 / 396) corrected to the
     computed 346 / 400. Recorded, not changed — each a question for the
     research owner: (l) whether the answer confirmation should echo the
     drafted option (visual F2 / gameplay m4; removed to match r5 §3.3,
     where the wiring confirmation names its letter and the answer
     confirmation does not); (m) D-3 — a draft activated again clears it, so
     click-then-ENTER on a tile clears the draft and RECORD then shows the
     neutral line; visible and recoverable, it can inflate `drafts_before`
     (gameplay m6); (n) the implementer-authored participant strings (the
     footers, the fault line — scientific minor-4): accept, replace, or
     remove where the preview has none; (o) names — alternatives are the
     owner's (D-7); (p) a reloaded load with its own opening whose check did
     not establish the absence of an earlier opening (a discontinuous
     history, no opening found) runs and is valued as usual, as contract §10
     and the M14 extractor read it, with only
     `reload_check.history_continuous: false` /
     `prior_opening_absence_established: false` showing it (scientific
     informational-1: keep; add a component flag; or read such a load
     `interrupted` — the last two would diverge from M14 unless applied to
     both); (q) after a reload whose check rules out an earlier opening, an
     earlier-load briefing does not count as exposure, so a session ending
     without a new briefing exports `not_presented`
     (`never_opened_reason: 'not_briefed_not_opened'`) beside
     `reload_check.prior_briefing_found: true` (scientific informational-2:
     keep, or add an exposure component "briefed in an earlier load"); (r)
     the drafted option's "▸" marker shifts its text about 13 px right of
     the other tiles (visual F5; column alignment bears on comparing
     options, so no implementer change); (s) with no STOP control and the
     beacon pinned until the window closes (by the contract), a participant
     who wants to move on may record CANNOT SOLVE (incorrect) where leaving
     would have been missing (gameplay i2 — a disposition note). Recorded,
     informational: the kit window's `window_closed.active_ms` includes time
     outside the bench, because the kit clock restarts on every laboratory
     RESUME, including the one the bench's own close fires (the extractor
     reads the per-question `active_ms`; M14 identical; gameplay i1);
     `presentM15` runs before the M11 calls in the four briefing handlers —
     guarded, so a fault there is caught (gameplay i3); the orientation is
     front-loaded reading, offset by the help sheet and the persistent bench
     record (gameplay i5); Kai's "transmission" and the "relay boxes" fit
     loosely (gameplay i6; fixed text); the neutral landings take the focus
     ring and so look like a selected panel (visual F8; inherent to the
     surface's focus ring); spacing is tight between the last wiring tile
     and the bottom row (about 16 design px) and LEAVE BENCH stands alone in
     the closed records' bottom row (visual F9); `TEST T  not run yet`
     outlives the closed tests beside `Tests closed` (visual F7; preview
     text); the oracle's simulator shares its design with the module's and
     differs only on the boosted unit's own notch, which no question asks
     about (scientific informational-4); the matrix's and the v3 summary's
     "two independently authored relay boxes" repeats the approved row's
     phrase while both boxes came from one search and share one format — the
     clustering is stated in this record (scientific informational-6); the
     cipher keeps its owner `M15` and probe key on the developer alias, as
     contract §4 requires (scientific informational-7); the wall-display
     frames (01, 24) are outside the unit and were not compared with the
     base (visual F12). Visual states no screenshot covers (the neutral
     lines, the CANNOT TELL confirmation, a wrong-answer or CANNOT SOLVE
     acknowledgement, the fault record, the orientation shown again, the
     results reopened, the help over the wiring or the results, the forced
     fonts on the wiring step, true 1280 × 720 / 1920 × 1080 windows) are
     exercised by the route spec's assertions, not by frames — stated, not
     claimed as visual evidence. Confirmations (each by the reviewer whose
     finding it answered, read-only, on the corrected source and the
     regenerated frames; `UNIT-LOG.md` "U18 results"): visual F1–F4
     CONFIRMED FIXED, no new overlap, clipping or hierarchy defect, the r5
     content unchanged, three notes (the wiring landing takes the focus
     border as the question landing does; the dialog sits left of centre, a
     consequence of staying left of x 738; the wall display's "PHASE 2 / 4"
     line wraps in frame 24 — outside the unit, not known to predate it);
     gameplay M1, m2, m3, m4, m5 CONFIRMED FIXED (m5 as scoped), no new
     product defect, two test notes acted on in the same round (R1 now
     asserts the wiring landing — focus on the instruction after START, a
     settled ENTER there running no test; R2's geometry assertion now reads
     both sides as the probe reports them, element centres in world
     coordinates, and requires each dialog control to end left of the
     opener's left edge), two path notes inside D-4 (an ESC or FINISH inside
     400 ms of its view does nothing, silently; the keyboard round-trip from
     the landing to RECORD takes several TABs or the named hotkey);
     scientific minor-2, minor-3 CONFIRMED FIXED, minor-1 PARTLY — the code
     right, its test not discriminating (the old check also voided that log,
     later, at the question order): the test now stops the log right after
     box 2's `box_presented`, which the old check read as an open series and
     the rule reads as a technical failure; informational-3 and -8's flag
     and positions CONFIRMED, the oracle test title NOT yet changed at
     confirmation time — changed then, with `TEST DIAL <d>  [1]` in §4 (3)
     given its two spaces; no correctness information before the fourth
     first response; nothing outside the round's remit touched (content,
     keys, formula, denominator, 400 ms, event names, the ruling). After
     these test-only and text-only changes the pure suite was rerun (65
     passed) and R1, R2 and R2 at `canvas=1080` were rerun by the
     implementer on port 5201 after the final matrix had released it
     (UNIT-LOG "U18 results").
301. **U18 closeout (10 October 2026) — reported absence of HELP / LEAVE
     BENCH on the question views: NOT REPRODUCED; no product change
     (`UNIT-LOG.md` "U18 closeout").** The report named frames 07 and 12
     (box 1 question 1, box 2 question 2) as showing the prediction
     questions without visible HELP and LEAVE BENCH. Every copy of those
     frames on disk, and the preparation's mockups, show both controls in
     the bottom row (panel y 462, HELP at x 12, LEAVE BENCH at x 184 —
     §5.299); `m15SurfaceModel.ts` pushes `helpAndLeave` unconditionally
     last on every question view, and no question-view state omits it (only
     the help sheet and a confirmation dialog are drawn alone, by design).
     Verified live with real pointer clicks by a new route case R9
     (test-only; `e2e/m15_systems_route.spec.ts`) at 800 × 600 and 1280 ×
     720: from every question view of both boxes with an unsubmitted draft,
     HELP and LEAVE BENCH are present, focusable, idle, above the feedback
     line, below the right column's controls and overlapped by nothing; HELP
     / CLOSE HELP keep the question (panel title, question block) and the
     draft and present nothing anew; LEAVE BENCH records no response and
     opens no dialog (`first_response`, `commit_requested` unchanged,
     `commit_cancelled` 0 — leaving never records CANNOT SOLVE); reopening
     restores the same question and draft with no second
     `question_presented`. R9's own in-bench M15 responses (wiring B, CANNOT
     TELL, four answers under the test identities) are needed to reach the
     four views. Independent read-only confirmation (Opus 5.5, gameplay with
     the visual role): not reproducible in any frame; the most likely
     explanation offered, unverified, is low salience — on the question
     views the bottom-left row sits below an empty band of about 105 design
     px, far from the teal right column, while on the wiring views it is
     attached to the tiles — followed by a cropped / zoomed view or a frame
     set other than the committed one; three test-side notes applied
     (screen-based question identity in R9, the spec header, a displaced
     JSDoc). Nothing about stimuli, keys, scoring, reload policy, layout,
     the settle or any owner choice changed; the twenty-four contract frames
     were not rewritten (R9's eight frames go to `U18_CLOSEOUT_OUT`, kept in
     the session scratchpad). The salience observation (H1) is recorded as a
     candidate interface question for the owner — e.g. whether the bottom
     row on the question views should sit closer to the recorded wiring —
     and not acted on.

Unit 19 (M16) is governed by the owner's U19 contract (v1, final 11 October
2026 with amendment A1) and by research-owner decision D-U19-1 with amendment
A1. The decision and the amendment are recorded first, as a ruling; §5.303
onward are IMPLEMENTER DEFAULTS — owner-visible, reversible, none of them
changes the approved formula, the content, the keys or the ruling, and none is
an owner decision.

302. **RESEARCH-OWNER DECISION D-U19-1 — APPROVED 11 October 2026, WITH
     AMENDMENT A1 — APPROVED 11 October 2026 (M16; an owner ruling for this
     implementation, not an implementer default; not reopened).** Source: the
     owner's instruction and contract of 11 October 2026
     (`U19-FABLE-PROMPT.md`, `U19-CONTRACT.md` §2.2 and §17; preview r3 §12).
     The ruling is an explicit decision for this implementation and NOT
     recovered wording from the missing original documents (`UNIT-LOG.md`
     "U19", provenance limit). Rulings D-U16-1 (M13), D-U17-1 / D-U17-2 and
     the closeout ruling §5.290 (M14), and D-U18-1 (M15) are not part of it
     and approve nothing here. The nine items as recommended, including
     selection (a) of item 2: [O-1] two PASSIVE worked examples (the rule
     applied step by step and explained; no answer requested; nothing recorded
     as a response), identical to each other in structure (the application
     label format, the same four numbered steps in the same order, one result
     line; each with exactly one mark present and one absent), shown
     identically, in the same order, to every participant, never contingent on
     performance — teaching gives no feedback on the participant's own
     answers; both examples end in DRAWER 3; no worked example shows a no-mark
     or a two-mark vial; [O-2] the rule, the two worked examples, the six
     vials, the four drawer options plus DON'T KNOW, the keys, every
     participant-facing string and the results explanations of preview r3
     §3–§5 are the administered content (`m16-rule-v1`, `m16-examples-v1`,
     form `m16-form-1`); their logical correctness does not establish
     empirical validity; the keys v1 `m16_v1_d1`, v2 `m16_v2_d3`, v3
     `m16_v3_d4`, v4 `m16_v4_d1`, v5 `m16_v5_d4`, v6 `m16_v6_d2` (sequence 1,
     3, 4, 1, 4, 2); blind-choice chance 1/4; the disclosed cues of preview §7
     travel with the content; the drawer confirmation
     `Record DRAWER <n> for vial N?` / `It cannot be changed afterwards.`
     repeats the drafted drawer (selection (a); (b)
     `Record this answer for vial N?` not selected); [O-3] the complete rule
     card on screen beside every vial; the worked examples closed at the
     boundary and never shown again; earlier vials' labels and answers not
     shown; HELP explains controls only — the measure concerns applying a
     visible rule to unseen labels, not recall; a ceiling is plausible; no
     "consulted the instructions" companion; [O-4] self-paced reading; free
     movement between example 1 and example 2 any number of times before the
     boundary; no minimum reading time, no comprehension check, no practice
     vial; the boundary START THE SIX VIALS with a confirmation — confirming
     closes teaching irreversibly and presents vial 1; leaving during teaching
     keeps the example in view; teaching time and example views are companions
     only; [O-5] an identical neutral acknowledgement after every first
     response (`Vial N recorded.`, `N of 6 vials recorded.`, NEXT VIAL / SHOW
     RESULTS) — no colour, glyph, sound, wording, layout or timing that
     differs with correctness; no correctness information about any vial until
     all six first responses are recorded; then two results views (vials 1–3,
     4–6) with the recorded drawer (or DON'T KNOW), the rule's drawer and the
     two-line explanation of preview §5 (controls as A1-2); results
     re-viewable read-only on reopening; a partial or review-closed series
     never shows results; [O-6] one form, fixed vial order v1 → v6, fixed
     option order DRAWER 1–4, no counterbalancing; the legacy counterbalanced
     forms A / B not used on the route; the companions `form_id` `m16-form-1`,
     `rule_version` `m16-rule-v1`, `examples_version` `m16-examples-v1`
     (constant in this administration) — vial content and position are
     confounded, the likely easiest vial first; [O-7] Kai's laboratory
     briefing records the M16 briefing exposure at its acknowledgement (the
     kit's `present`, in all four `lab_brief_ack*` handlers) — exposure only;
     before the briefing `not_presented`; briefed, never opened, open ⇒ null
     `pending` (`briefed_not_opened`); briefed, never opened, at the review
     closure ⇒ null `no_eligible_event`, `briefed_not_opened`, censored,
     `closed_at_review`; `declined` never; no STOP control — leaving is the
     only exit and never records DON'T KNOW (the M14 / M15 convention,
     precedent only, approved for M16 by this ruling); [O-8] an opening of
     this administration in an earlier page load ⇒ the console is never re-run
     in the new load (the neutral closed record; prior exposure recorded; the
     load's row `interrupted`; the earlier events immutable); at the first
     Diagnostics Laboratory entry of a later page load the adapter writes
     `prior_load_checked`; an established absence with continuous history
     reads the load exactly as a first load (the §5.290 (a) / D-U18-1 item 6
     convention, precedent only, approved for M16 by this ruling); [O-9] one
     to five first responses and the series not yet closed ⇒ null `pending`
     with the recorded answers in the components; at the review closure ⇒
     `incomplete` with the value and its observed denominator; a session
     ending before the review exports `pending` (the D-U18-1 item 8
     convention, precedent only, approved for M16 by this ruling). **Amendment
     A1 (approved 11 October 2026; none of it changes the rule, the worked
     examples, the six labels, the keys, the order, the scoring, the
     missingness or the reload policies):** [A1-1] accurate recording language
     — no participant string or contract statement claims that nothing is
     recorded where views, navigation, drafts or help use are logged; teaching
     says `No answer is requested on this page.`; the help says
     `Only confirming records your answer.` and
     `... then RECORD DRAWER and confirm, or DON'T KNOW and confirm.`; the
     reload record says
     `... Its record is kept; no further answers can be given here.`; an
     ANSWER (a `first_response`) is always distinguished from a LOGGED
     INTERACTION (a view, navigation, draft, help consult or refused request);
     [A1-2] complete, consistent controls — results page 1 HELP, FINISH and
     NEXT; page 2 HELP, FINISH and BACK (NEXT and BACK never share a
     position); the acknowledgements carry HELP and LEAVE CONSOLE beside NEXT
     VIAL / SHOW RESULTS; FINISH and ESC close the results surface; completion
     is established by the sixth first response whatever results pages are
     later viewed; `results_shown` only for a page actually displayed, once
     per page; HELP / CLOSE HELP return to the same page with all state
     preserved; the 400 ms transition protection covers every results
     transition; reopening stays read-only; the results controls verified
     through actual pointer and keyboard interaction; [A1-3] unambiguous
     double-click verification — the opener `RECORD DRAWER [R]` and the
     dialog's confirm `RECORD DRAWER [ENTER]` are distinct controls; a double
     click on the opener records ZERO first responses; a fresh confirm after
     the protection interval records EXACTLY ONE first response and a
     duplicate press immediately after it changes nothing; the held-key,
     auto-repeat and carried-press protections stay; [A1-4] consistent
     approval and package status — D-U19-1 recorded as APPROVED 11 October
     2026 with A1 in the contract, the preview (r3), the launch prompt and the
     launcher; documentation overstatements corrected; integrity pins
     regenerated. **Limitations that travel with the ruling (preview §11):**
     six applications of one rule in one episode; one form, fixed order (the
     likely easiest vial first); the rule card always visible (a ceiling is
     plausible); both worked examples end in DRAWER 3 (a consequence of the
     chosen coverage); the vials are not equated; chance 1/4; the listed
     partial, shortcut and absolute-direction strategies reach at most 4 of 6
     in the computed table, other strategies not ruled out, and 4 of 6 does
     not separate slips from one consistent misreading; three of six vials
     need both marks; no correct answer proves understanding; reading speed
     and care in following a four-step procedure contribute to the answers;
     teaching exposure is recorded but never adjusts the value; a session
     ending before the review exports a partial series as `pending`; after a
     reload prior exposure is uncertain. This approval does not establish
     psychometric validity, questionnaire equivalence, or that a correct
     answer shows understanding. Implemented: §4 "Unit 19".
303. **D-2 — first-opening card (U19 default).** The first opening shows the
     first-opening card (preview §3.1) with SHOW EXAMPLE 1, HELP and LEAVE
     CONSOLE; activating SHOW EXAMPLE 1 is recorded (`intro_acknowledged`) and
     presents worked example 1; left before it, the card is shown again at the
     next opening (`series_reopened`, view `intro`).
304. **D-3 — drafts (U19 default).** Drafts survive leaving and returning;
     activating the drafted tile again clears it (`option_drafted` with
     `option_id: null`); a draft is never a response and never enters the
     value.
305. **D-4 — commitment mechanics and the settle (U19 default; M02 §5.210, M13
     §5.262, M14 §5.279 and §5.290 (b), M15 §5.294 precedent; [A1-2],
     [A1-3]).** The 400 ms fresh-press rule on the drawer confirmation, the
     DON'T KNOW confirmation and the boundary confirmation (reason
     `dialog_settling`; one `commit_press_refused` record per dialog, the
     count carried on the record; the boundary dialog's refused press carries
     `target` `teaching_close`); RECORD DRAWER without a draft refused with
     the approved neutral line and `commit_without_draft`; the settle on EVERY
     view transition (SHOW EXAMPLE 1, each example view, the example 2
     restored by KEEP READING, a vial's first view, the acknowledgements, each
     results page — SHOW RESULTS, NEXT, BACK, FINISH, HELP — the help sheet
     and the view CLOSE HELP restores, the last re-armed by CLOSE HELP and by
     a cancelled dialog): a press inside 400 ms of the view appearing drafts,
     requests, confirms, navigates, opens or closes nothing and, outside a
     confirmation, is not recorded because the contract's suffix list has no
     name for it and no suffix is added; an ESC inside the settle of a view is
     consumed and leaves nothing; a cancel (KEEP WORKING / KEEP READING / ESC)
     inside 400 ms of its dialog opening is ignored and not recorded (the
     dialog stays). The opener / confirm distinction of §4 "Unit 19" (1): the
     dialog's confirm control stands at panel (200, 250), never under the
     opener (x ≥ 738 or the bottom row), so a double click on the opener
     records zero first responses and a fresh confirm records exactly one. A
     held key or an auto-repeat never reaches the host (`WorkSurfaceScene`
     drops `event.repeat`) and is therefore never recorded.
306. **D-5 — help (U19 default; [A1-2]).** On request (H or the button) on the
     first-opening card, both examples, every vial view, every acknowledgement
     and both results pages — never while a dialog is open; informational, the
     preview §3.8 sheet (its title set apart from the body by one blank line);
     closed by ESC or CLOSE HELP; recorded (`help_consulted`) with the phase
     and the view it was opened on (`intro`, `example_1`, `example_2`,
     `vial_<k>`, `ack_<k>`, `results_1`, `results_2`); CLOSE HELP restores the
     same view, draft or results page and re-arms its settle.
307. **D-6 — dispositions for zero and partial evidence (U19 default; the
     briefing / never-opened mapping is ruling item 7 and the partial rule
     item 9).** Never briefed and never opened `not_presented` (also at the
     review closure); briefed and never opened `pending`
     (`briefed_not_opened`) while open and `no_eligible_event`
     (`briefed_not_opened`, censored, `closed_at_review`) at the review
     closure; opened, nothing answered and closed at the review
     `no_eligible_event` with `missing_reason` `intro_only` (SHOW EXAMPLE 1
     never activated) | `teaching_only` (teaching started, never closed) |
     `teaching_closed_no_first_response` (vial 1 presented, no first
     response), as reached (free text, addendum §1; the strain of §5.142
     applies); still open ⇒ `pending`; one to five answered and closed at the
     review `incomplete` with the value and its observed denominator,
     censored; an open-series technical failure voids the row with the answers
     kept in the components; an unscored-record defect flags the components
     (`teaching_record_consistent` / `exposure_record_consistent` false)
     without effect on the row; `declined` never. Precedence: `interrupted` >
     `technical_failure` > `pending` > the closed-series outcomes.
308. **D-7 — names (U19 default; all provisional, alternatives are the
     owner's).** Family `proto_m16_handling_`, opportunity
     `proto_m16_handling_series`, window `m16_handling_w1`, object and surface
     id `m16_protocol_console`, the suffixes of addendum §2 "U19",
     administration `m16-handling-v1`, form `m16-form-1`, rule `m16-rule-v1`,
     worked examples `m16-examples-v1`, example ids `m16_e1` / `m16_e2`, vial
     ids `m16_v1` … `m16_v6`, option ids `m16_v<k>_d1` … `m16_v<k>_d4`; DON'T
     KNOW is the response kind `dont_know`, never an option id; the phases
     `intro` | `teaching` | `measurement` | `feedback` | `closure`; the
     acknowledgement `line_id` `vial_recorded`. The v2 ids
     `proto_m16_protocol_update` / `proto_m16_protocol_*` / `m16_protocol_w1`
     / `m16-protocol-v1` are retired from the route and keep their v2 meaning
     in the frozen ledger and on the developer alias.
309. **D-8 — event order (U19 default).** The §5.259 convention applied to the
     M16 extractor: a family event of the current load without a usable
     `sequence` (a safe integer of at least 1), or two sharing one, make the
     row a `technical_failure`; gaps are normal; a missing number is never
     read as zero; ANY `results_shown` not preceded by
     `first_responses_completed` — also in a series that never reaches six —
     voids the scored evidence; a `vial_presented` before `teaching_closed`,
     before the previous vial's `first_response`, out of the assigned order or
     twice voids it too.
310. **D-9 — companion definitions (U19 default).** "Omissions" = vials
     presented without a first response (`unanswered_vial_ids`) and
     unpresented vials (`unpresented_vial_ids`), listed apart and never DON'T
     KNOW; `error_kind` per preview §5.3 (`row` | `column` | `row_and_column`;
     null for the key and for DON'T KNOW), recomputed from the content's key
     and the 2 × 2 grid (row = drawers 1–2 TOP / 3–4 BOTTOM; column = drawers
     1, 3 ORLA / 2, 4 VESK); "teaching exposure" = the example views per
     example (`examples_viewed`), the back-navigations and the teaching active
     time before `teaching_closed`, descriptive only; the exposure stages kept
     distinct (`briefed`, `console_opened`, `intro_acknowledged`,
     `examples_viewed`, `teaching_closed`, `vials_presented`,
     `never_opened_reason`); `dont_know_count`; help consults by phase;
     `results_shown` per page; `reload_check`.
311. **D-10 — the legacy module (U19 default).**
     `src/informationProcessing/m16ProtocolUpdate.ts` and `protocolForms.ts`
     stay in the tree UNCHANGED (byte-identical to the base; their SHA-256
     pinned in the pure spec) under the frozen v2 identity, reachable only
     through the developer alias `?scene=information_processing_lab`
     (`InformationProcessingLabScene.ts`, unchanged); the laboratory scene no
     longer imports the module; the v3 extractor never reads the family
     `proto_m16_protocol_` (disjoint from `proto_m16_handling_`); the
     interaction registry's descriptive
     `opens: { kind: 'ip_overlay', id: 'm16' }` and window label
     `m16_protocol_update` for `lab.phase_m16` are NOT changed (outside the
     allowlist; U24 backlog, as U18 left `m15_layered_cipher`); the scene's
     own station construction decides what opens.
312. **D-11 — layout, focus landings, footers and interface details inside the
     wide frame (U19 default; positions of preview §10, the mockup evidence
     `layout-evidence\`; the implementer's choices recorded here).** The
     header title `HANDLING RULE` on the first-opening card, the example, vial
     and acknowledgement views and the closed records (the results pages carry
     the preview's titles); subtitles `Worked example N of 2` / `Vial N of 6`.
     The rule card at panel (12, 90), 714 × 196 (nine lines); the example
     block (seven lines) or the vial block (two lines) at (12, 294) in the
     same column; the first-opening card's text at (12, 90), 1026 wide; the
     right column at x 738, 300 wide — the teaching note
     `Read how the rule places this vial. No answer is requested on this page.`
     at y 90 (a neutral focus landing: focusable, its activation does nothing)
     with BACK TO EXAMPLE 1 at y 170 on example 2; on a vial view the question
     block at y 90 (72 high; the neutral focus landing of a vial's first view
     — the first drawer tile is NOT pre-focused), the four tiles from y 170
     (34 high, 4 px gaps), RECORD DRAWER at y 330 and DON'T KNOW at y 384
     (never adjacent to LEAVE CONSOLE in the bottom row); the acknowledgement
     line at (738, 90); the bottom row at panel y 462 — HELP at x 12 (160 px),
     LEAVE CONSOLE at x 184 (180 px), the view's primary control at x 778 (260
     px: SHOW EXAMPLE 1, NEXT EXAMPLE, START THE SIX VIALS, NEXT VIAL, SHOW
     RESULTS, NEXT on results page 1), CLOSE HELP at x 388 (260 px) on the
     help sheet alone; on the results pages HELP at x 12, FINISH at x 184 (180
     px), NEXT at x 778 (260 px, page 1) and BACK at x 654 (112 px, page 2);
     the dialogs (the boundary, the drawer, DON'T KNOW) drawn alone with the
     header and the status line — text at (200, 170), the confirm control at
     (200, 250) and the cancel at (466, 250), 254 px wide, ending at x 720;
     the results text at (12, 90), 1026 wide, on the preview's fixed lines;
     the help sheet's text at (12, 90). Focus order: the first-opening card
     SHOW EXAMPLE 1 first; the example views the teaching note first (so ENTER
     carried from SHOW EXAMPLE 1, NEXT EXAMPLE, BACK TO EXAMPLE 1, KEEP
     READING or CLOSE HELP presses no control), then the primary control, BACK
     TO EXAMPLE 1, HELP and LEAVE CONSOLE; the vial views the question block
     first, then the tiles, RECORD DRAWER, DON'T KNOW, HELP, LEAVE CONSOLE;
     the acknowledgements NEXT VIAL / SHOW RESULTS first, then HELP and LEAVE
     CONSOLE; results page 1 NEXT first, then FINISH and HELP; results page 2
     FINISH first, then BACK and HELP; a dialog its confirm control first; the
     help sheet CLOSE HELP first; the closed records LEAVE CONSOLE. The draft
     is the surface's `selected` state (a "▸" glyph and the fill), never a
     colour alone. Footers (implementer wording where the preview has none):
     `H help · ESC leaves (work kept)` on the first-opening card, the example
     views and the results pages;
     `1-4 choose · R record · N don't know · H help · ESC leaves (work kept)`
     on the vial and acknowledgement views (the preview's);
     `ENTER starts · ESC keeps reading` under the boundary confirmation;
     `ENTER records · ESC keeps working` under a vial confirmation;
     `H or ESC closes the help` under the help sheet; `ESC leaves` under a
     closed record. The fault record line
     `The console has a fault and is closed. Recorded answers are kept.` is
     added for the fault record (not in the preview; no forbidden token). A
     view restored by CLOSE HELP or by a cancelled dialog is not a new
     `example_viewed`; a reopening in teaching is (`navigation` `resume`). The
     kit's own events (`presented`, `opportunity_opened`, `window_closed`,
     `technical_failure`) carry the kit's fields and `input_mode: 'system'`
     only; the protocol stamp, `phase`, `form_id` and the example / vial
     fields are written on every event the model emits through the sink (M14
     §5.288, M15 §5.299 precedent; `windowKit.ts` is outside the unit).
313. **U19 reviews and correction round 1 (11 October 2026; recorded by the
     implementer — none of it an owner decision, none of it approval).** Three
     independent read-only reviews on the source of the final matrix (Opus 5.5
     through the contract §15 fallback — scientific, gameplay, visual;
     `UNIT-LOG.md` "U19 results"). No MATERIAL finding. Minor findings
     corrected in one bounded round inside the allowlist (test-, extractor-
     and document-only; nothing content-, key-, formula- or event-name-related
     changed; no reviewer fixed anything): (a) scientific minor-6 — the
     extractor checked the entry snapshot's `form_id` and `rule_version` but
     not each vial's `key_option_id` and `option_ids` against the content:
     `features/m16.ts` now reads a disagreeing or missing snapshot key or
     option list as `technical_failure` (contract §10, "an event
     `key_option_id` that disagrees with the content key"), with three new
     integrity cases in the pure spec; (b) scientific minor-1 — addendum §2
     "U19" said a `teaching_closed` with another form only flags the teaching
     record, while the extractor leaves such a record uncounted as the
     boundary so that a vial presented after it voids the scored evidence (a
     vial before `teaching_closed`): the addendum now says so, and the pure
     spec covers both outcomes (flagged and `pending` without a vial;
     `technical_failure` with one); (c) scientific minor-2 — §4 "Unit 19" (2)
     and the matrix said the §7 strategy table is "computed and reported,
     never asserted" while the pure spec asserts its figures equal the
     preview's: both now say "reproduced against the preview's figures, never
     asserted as a ceiling" (the contract's requirement); (d) scientific
     minor-3 — oracle test (v) checked the examples' step lines 3 and 4 by
     prefix only: it now compares every step line with the rule's intermediate
     states; (e) scientific minor-4 — the stability test now includes a fault
     after completion (recorded as `feedback_phase_faults`, the row
     unchanged); (f) gameplay minor-3 — the route spec moved the keyboard
     focus with ArrowRight only, where contract §12 R9 says TAB: R9's
     `accessFromView` now reaches HELP, LEAVE CONSOLE and FINISH with the
     literal TAB key (`focusByTab`), ArrowRight remaining elsewhere ("by focus
     and ENTER"); (g) gameplay minor-4 — the R8 title of
     `e2e/m15_systems_route.spec.ts` still said "terminal overlay" after its
     M16 step was re-expressed: the title now says "work surface" (the
     `--grep R8` selection unchanged). Recorded, not changed — each a question
     for the research owner: (h) the five implementer-authored participant
     strings not in preview r3 (the fault record line
     `The console has a fault and is closed. Recorded answers are kept.` and
     the dialog, help and closed-record footers
     `ENTER starts · ESC keeps reading`, `ENTER records · ESC keeps working`,
     `H or ESC closes the help`, `ESC leaves`), recorded as D-11 (§5.312) —
     preview §3 says every footer that mentions ESC reads "ESC leaves (work
     kept)", which would be inaccurate under a dialog or the help sheet, where
     ESC does not leave; options: accept them as written; replace them with
     preview-only text; or read the preview's footer sentence as applying to
     views only (scientific minor-5, visual m1); (i) the vial question
     `Which drawer does vial N go in? Choose a drawer, then record it.` is one
     soft-wrapped string in the 300 px right column and breaks after "in?"
     under the default font but after "go" under forced Courier New and Lucida
     Console (three lines; inside its 72 px box, never clipped — R7 measured
     45 / 72 and 48 / 72): contract §3.9 rules out re-wrapped wording and the
     preview fixes no break for this string, so whether to fix a break after
     "in?" is a content decision (visual m2); (j) no console string names TAB,
     the arrows or ENTER as the way to move the keyboard focus, and the
     example and vial views land the focus on a neutral text block (D-11), so
     a keyboard-only participant who presses ENTER on worked example 1 gets no
     response until TAB or an arrow reaches NEXT EXAMPLE (frame 03 shows the
     ring on the teaching note) — the footers and the help line are approved
     r3 strings; options: accept (M14's earlier footers on the route name TAB
     / arrows; M15 has the same pattern), or amend the example-view footer
     (gameplay minor-1); (k) with no STOP control an unfinished M16 keeps the
     beacon on the protocol console once M15 is recorded (`nextPhase`), where
     the legacy STOP could release it — approved item 7 as U18 applied it to
     M15; options: accept, record as a cross-item salience note for M17 / M18
     entry, or consider a non-scoring release (an amendment) (scientific
     informational); (l) frame 25's recorded state (the three "Protocol lanes"
     ticks and the bench-2 lamp tone) is established by R8's probe assertions
     rather than visibly at 800 × 600 — a close-up of the display would make
     it visual evidence (visual m4). Recorded, informational: results page 2
     lands the focus on FINISH (D-11, the M15 precedent) and the results
     pages' tab order runs NEXT / FINISH / HELP, the reverse of the visual
     order (gameplay minor-2); the neutral landings wear the surface's focus
     ring and can read as a selected control (visual m3; `WorkSurfaceScene.ts`
     is outside the unit, as U18 noted); help opened on the sixth
     acknowledgement before any results page is tagged `phase` `feedback` with
     `view` `ack_6` (the M15 mapping; the view tells it apart); the kit's own
     events carry no `phase`, `form_id` or protocol stamp (`windowKit.ts`
     outside the unit; disclosed in D-11); events without a `page_load_index`
     count as current-load, as in M15; a reloaded load with its own opening
     and a discontinuous history is valued as usual with only `reload_check`
     showing the uncertainty (the §5.290 (a) limitation); the scene's RESUME
     handler resumes the kit window right after the surface's close paused it,
     so the kit's `window_closed.active_ms` includes time outside the console
     (M14 and M15 identical; the extractor reads the per-vial `active_ms`);
     the approved help line "The handling rule stays on the left while you
     work." is shown over the first-opening card and the results pages, where
     no rule card is on screen (r3 wording); the unchanged case brief says
     "learn its handling protocol" outside the console (base text, required
     unchanged); the GitHub-corner badge of `index.html` sits over every frame
     (outside the unit, predating it; a backlog item for the adult
     presentation); "Choose a drawer first." is drawn in amber (a usage hint,
     no correctness signal). Visual states no frame covers (an acknowledgement
     after a wrong drawer or DON'T KNOW, the examples, the card, the help
     sheet and results page 1 under the forced fonts, a true 1280 × 720
     window, the fault record, the help over the card, an example or an
     acknowledgement, closed records other than "3 of 6") are exercised by the
     route spec's assertions, not by frames — stated, not claimed as visual
     evidence. Confirmations (each by the reviewer whose finding it answered,
     read-only, on the corrected source; Opus 5.5; none an approval):
     scientific minor-1, minor-2, minor-3, minor-4 and minor-6 CONFIRMED FIXED
     (minor-6 with one residual note, recorded here and not acted on: the
     snapshot check accepts a vial's entry when at least one entry with the
     content key exists, so a duplicate entry with a wrong key or an extra
     unknown entry would pass it — scoring is unaffected because every
     `first_response` key is checked on its own); gameplay minor-3 and minor-4
     CONFIRMED FIXED in source (the runtime pass of R9 with the literal TAB
     key rests on the rerun recorded in `UNIT-LOG.md` "U19 results"). After
     the round's changes P1 was rerun (48 passed), R1 and R9 of the route spec
     and R8 of `m15_systems_route` were rerun in the browser (`UNIT-LOG.md`
     "U19 results"), and the static checks were rerun on the final files; no
     frame changed its content, so none was regenerated beyond R1's and R9's
     own rewrites. Closed by the owner's closeout rulings of 12 October 2026
     (§5.314): (h) the five strings accepted (ruling 1); (i) the question's
     soft wrap accepted (ruling 2); (j) the card and example footer and one
     help line name TAB and ENTER (ruling 3); (k) the beacon unchanged, a U24
     walkthrough issue (ruling 4); (l) frame 25 contextual imagery with a
     supplementary close-up (ruling 5); the residual note on the snapshot
     check corrected after the counterexample was reproduced (ruling 6).
314. **RESEARCH-OWNER CLOSEOUT RULINGS — APPROVED 12 October 2026 (M16, the
     U19 closeout; owner rulings, not implementer defaults; not reopened).**
     Source: the owner's direct instruction and research-owner approval of 12
     October 2026 (`UNIT-LOG.md` "U19 closeout", recorded verbatim before the
     first source edit of the closeout). The instruction supersedes the
     original exact-text requirements and the one-commit limit only where it
     says so; the preparation package and the historical record stand
     unchanged. **(1) The five contextual strings accepted** (resolving §5.313
     (h); D-11 stands with this ruling): the fault record line
     `The console has a fault and is closed. Recorded answers are kept.`, the
     boundary dialog footer `ENTER starts · ESC keeps reading`, the vial
     dialog footer `ENTER records · ESC keeps working`, the help sheet footer
     `H or ESC closes the help` and the closed-record footer `ESC leaves` stay
     as written; an accurate contextual instruction is never replaced by the
     generic ESC footer. The distinction they document: on a VIEW (the
     first-opening card, an example, a vial, an acknowledgement, a results
     page) ESC LEAVES the console with the work kept — the window closes
     resumable (`window_closed`, `exit_state` `panel_left`), the draft and
     every recorded answer are kept, and the footer says "ESC leaves (work
     kept)"; under a CONFIRMATION dialog (the boundary, a drawer, DON'T KNOW)
     ESC CANCELS the pending commitment only — `teaching_close_cancelled` /
     `commit_cancelled` with `reason` `keep_reading` / `keep_working`, nothing
     recorded, the view behind the dialog unchanged with its draft, the
     console open ("keeps reading" / "keeps working"); on the HELP sheet H or
     ESC CLOSES the help and restores the view behind it with all its state
     (`help_closed`; nothing left, nothing cancelled, no exposure written); on
     a closed record (the review closure, the reload hold-back, the fault) ESC
     leaves a console on which no answer can be given, so "ESC leaves" states
     what remains. **(2) The vial question's soft wrap accepted** (resolving
     §5.313 (i)):
     `Which drawer does vial N go in? Choose a drawer, then record it.` is the
     one string allowed to wrap differently under the fallback fonts (two
     lines under the default font, three under forced Courier New and Lucida
     Console), while contained in its 72 px box, readable and unclipped at the
     existing 16 px text; the prescribed lines of the rule card (nine), the
     worked examples (seven), the vial labels (two) and the results blocks
     (sixteen on page 2) keep their fixed lines — R7 asserts them under both
     forced fonts. No permission to reduce the text size, to scroll or to
     relax any other layout requirement. **(3) Keyboard navigation named**
     (resolving §5.313 (j)): the footer of the first-opening card and of both
     worked-example views is
     `TAB moves focus · ENTER selects · H help · ESC leaves (work kept)`
     (replacing `H help · ESC leaves (work kept)` on those three views only;
     the results pages keep the preview's footer, the vial and acknowledgement
     views the preview's key footer); the help sheet carries the separate line
     `TAB moves focus. ENTER selects the focused control.` immediately before
     the approved `Keys:` line (eight help lines; the pure spec pins the
     list). Every other approved string, the focus landings (D-11), the
     controls and the commitment protections are unchanged; the keys, the
     content, the versions and the formula are untouched. The new footer
     renders on one line — the question-only wrapping of (2) does not extend
     to it: R7 compares the feedback line's position under the card and
     example footers with its position under the help sheet's one-line footer
     under both forced fonts (the footer is placed in design px, so the
     supported viewports — 800 × 600, 1280 × 720 and `canvas=1080` — do not
     change its wrapping). **(4) The beacon unchanged** (resolving §5.313
     (k)): an unfinished M16 keeps the beacon on the protocol console once M15
     is recorded; its possible effect on attention to the later benches (M17 /
     M18 entry) is an explicit U24 walkthrough issue, not a product change.
     **(5) Frame 25 is contextual imagery** (resolving §5.313 (l)): the
     completion-state claim rests on R8's probe assertions (`phases_recorded`
     `['m16']`, `next_phase` `m15`, the "PHASE 1 / 4" indicator and the
     evidence-table intercom line). A supplementary capture was feasible
     through the existing route without product change: the new route test "R8
     supplementary capture" repeats R8's series by keyboard at `canvas=1080`,
     asserts the probe's recorded state (`phases_recorded` `['m16']`,
     `next_phase` `m15`, the indicator), then sets a 2560 × 1440 viewport
     (test-side only; the FIT-letterboxed canvas filled it — canvas box 2560
     × 1440) and saves the whole frame
     (`27-wall-display-after-m16-recorded-2560x1440.png`) and the display
     region clipped from the canvas box
     (`27a-wall-display-close-up-2560x1440.png`, 691 × 432) in
     `.playwright-mcp/u19-closeout`; the close-up shows the display's "PHASE 1
     / 4 — CAUSAL MODEL" indicator and the three tick marks legibly; the bench
     lamp tone lies outside the clip and is not claimed. Frame 25 of the
     unit's evidence stays as it is: contextual imagery. **(6)
     Snapshot-integrity correction** (resolving the residual note of §5.313 on
     scientific minor-6): the counterexample was reproduced first by a focused
     pure test against the committed extractor (`3e24f5c`) — the six correct
     vial records accompanied by a conflicting duplicate of `m16_v2` (key
     `m16_v2_d1`) and an extra unknown record `m16_v7` were accepted
     (`observed`, 6 of 6), because the check asked only that each content vial
     have SOME matching record (`every` over `some`). The extractor now
     validates the COMPLETE declared task definition of the entry snapshot:
     exactly six vial records, each a record, each a known vial, none twice,
     each with exactly four unique option ids in the content's fixed order and
     with the content's key; a missing, duplicate, conflicting, unknown or
     malformed record or list ⇒ `technical_failure` under the scored-metadata
     integrity rule (contract §10; addendum §2 "U19"). Task-definition
     metadata only: a participant may answer zero to six vials, and every
     approved missingness, partial-series, closure and reload disposition is
     unchanged — the new pure test asserts `observed` on the genuine
     definition (also with the records in another order and with an additive
     field), `pending` with two answers and the series open, `incomplete` with
     two answers closed at the review and `no_eligible_event` with none,
     beside nineteen malformed definitions. Precedence as implemented
     (unchanged in kind from the form / rule check): a definition defect is
     found at the opening, before any response is read, so the row names the
     defect (`integrity_defect` in the components) and carries no answered ids
     — the responses stay in the raw log, which is never altered: the
     extractor reads (the new test pins a defective definition with none or
     two answers, open or closed at the review, as `technical_failure`, the
     log byte-identical before and after extraction, and a reloaded load
     without its own opening `interrupted` whatever the earlier load's
     definition — the Opus confirmation's recommendations (a)–(c), adopted as
     tests). Owner question surfaced by the Opus confirmation — whether the
     snapshot's `vials_planned` and `assigned_vial_order` also belong to the
     declared task definition — RESOLVED by the owner's correction instruction
     of 12 October 2026 (`UNIT-LOG.md` "U19 closeout correction", recorded
     verbatim before the correction's first source edit): the approved
     administration `m16-handling-v1` already fixes six planned vials and
     their assigned order, so these two checks ENFORCE THE ALREADY-APPROVED
     count and order; they are not a new requirement and not a general
     snapshot-schema audit. As implemented (`features/m16.ts`,
     `snapshotAdministrationDefect`, called at `opportunity_opened` after the
     form and rule check and before the record check): `vials_planned` must be
     the NUMBER 6 (`M16_VIALS_PLANNED`; the string "6", null, an absent field,
     a list, NaN or any other number — 0, 5, 7, or 2 beside two answers — ⇒
     `technical_failure`, `integrity_defect` "the entry snapshot's planned
     vial count is not the number 6"); `assigned_vial_order` must be a list of
     exactly the six ids `m16_v1` … `m16_v6` in that order
     (`M16_ASSIGNED_VIAL_ORDER`; absent, null, a string, empty, reversed, two
     swapped, five or seven ids, an id twice or an unknown id ⇒
     `technical_failure`, "the entry snapshot's assigned vial order disagrees
     with the content"). The STORAGE order of the six per-vial records in
     `vials` stays unrestricted — the record check of the closeout is
     unchanged and the new pure test asserts `observed` 6 of 6 with the
     records stored in reverse beside the approved order. Six PLANNED vials
     are never six ANSWERS: a participant may answer zero to six, and the
     valid partial session (two answers: `pending` while open; `incomplete` 2
     of 2, censored, `closed_at_review` when closed at the review,
     `vials_planned` 6 beside `vials_answered` 2 in the components) is pinned.
     PRECISELY which snapshot fields the extractor validates, and with what
     consequence: `form_id` and `rule_version` (unknown ⇒ `technical_failure`;
     the unit), `vials_planned` and `assigned_vial_order` (this correction),
     `vials` (the closeout's record check); `examples_version` is compared,
     but a disagreement only marks the teaching record inconsistent, never the
     row; `stage` is read into `stage_at_open`; `examples_planned`,
     `example_ids`, `teaching`, `examples_after_boundary`, `rule_card`,
     `dont_know_available`, `feedback`, `stop_control` and `settle_ms` are NOT
     validated (the `entry_state_version` check is on each event's own
     metadata, as in the unit) — no claim is made that every metadata field is
     checked. The responses' rules, the missingness dispositions, the closure
     and reload handling and the raw log are untouched: a defective count or
     order with two answers, closed at the review, is `technical_failure` with
     the defect named and no answered ids (found at the opening, before any
     response is read — the responses stay in the raw log, byte-identical
     before and after extraction), and a reloaded load without its own opening
     is `interrupted` whatever the earlier load's count. Routing of the
     correction: Fable the sole writer; Sonnet 5.5 the M16 pure spec and the
     affected static checks; one brief read-only scientific confirmation of
     the delta (the closeout's reviewer no longer reachable, so a fresh one
     through the documented fallback); exactly one additional local commit
     `fix(m16): validate planned count and assigned order`; as-built: §4 "Unit
     19 closeout" (9). **(7) Reporting corrections**, stated as the owner
     requires: the original full verification matrix (`UNIT-LOG.md` "U19
     results") PRECEDED correction round 1; the post-correction reruns of 11
     October 2026 (P1, R1 and R9, the M15 route R8, the static checks) were
     performed by the IMPLEMENTER, not by the test-reviewer; the vial question
     wraps differently under the fallback fonts while the specified
     instructional blocks retain their fixed lines; the unit's commit
     `3e24f5c` of 11 October 2026 preceded the owner's resolution of the
     wrapping and wording exceptions — the approval of 12 October 2026
     resolves them now and is not backdated; the snapshot validation was
     partially corrected in round 1 (each vial's key and option list checked)
     with the disclosed duplicate-entry limitation remaining until this
     closeout. Routing: Fable the sole writer; Sonnet 5.5 the focused closeout
     verification; one targeted read-only Opus 5.5 scientific confirmation of
     the snapshot validation and of the preserved missingness; exactly one
     additional local commit
     `fix(m16): clarify controls and validate entry snapshots`. The as-built
     record of the closeout: §4 "Unit 19 closeout".
315. **RESEARCH-OWNER DECISION D-U20-1 — APPROVED 12 October 2026 (M18, the
     three diagnosis cases; U20).** An owner ruling with its date, recorded
     here as the owner's amendment instruction of 12 October 2026 records it
     (contract `U20-CONTRACT.md` §2.2 "Owner ruling"; `UNIT-LOG.md` "U20");
     not an implementer default; not reopened by this unit. Items 1–10 of
     contract §2.2 APPROVED AS RECOMMENDED with the owner's clarifications,
     quoted: "Keep the three r2 cases, their wording, tests, options, keys and
     layouts." "Predictions are keyed to the actual case, regardless of the
     recorded diagnosis." "Tests remain optional, unlimited and repeatable
     before diagnosis commitment; they close when the diagnosis is recorded."
     "Diagnosis is immutable before the prediction question appears." "Cannot
     solve remains available for both responses and counts as incorrect;
     unanswered remains missing." "Correctness feedback appears only after all
     six responses." "Keep one form and fixed case/option order." "Keep
     separate diagnosis and prediction counts and denominators, each with
     planned denominator 3." "Accept the proposed
     pending/completion/review/reload policy, including both rows remaining
     pending while the series is open even if all three diagnoses are
     recorded." "Keep the descriptive indicators", with the null rules and the
     narrower claim of contract §10 (the indicators describe evidence
     availability and response consistency only, never why an answer was
     wrong). Item 11: the ALTERNATIVE APPROVED — "invalidate only the affected
     row when a defect is demonstrably isolated. Shared defects that
     compromise administration, content, sequencing or exposure invalidate
     both rows. If isolation cannot be established, invalidate both and state
     why." — implemented by contract §9.4 "Defect scope" (the scope classes
     `shared` / `slot` / `uncertain` / `flag`, the isolation test I1–I4, the
     lifecycle and closure-snapshot rules that keep a valid row from being
     voided through a second, generic check) and tested by contract §12 P1
     "Defect scope and indicators" (X1–X6). Declarations: "Retain validation of
     the eight setup declarations: prediction_target, tests, tests_close,
     step_after, cannot_solve_available, feedback, stop_control and
     responses_per_case. This is part of the approved administration, not
     eight additional decisions." Also required by the owner: `response_kind`
     exactly `option` or `cannot_solve` on both response types; raw records
     preserved, contradictory evidence never silently repaired, an uncertain
     response never counted. Boundaries: "All events, features and descriptive
     indicators remain provisional. No canonical promotion, combined score or
     scientific-validity claim is authorized." The content is the owner's
     approved instrument (preview r2 §3–§4; content `m18-content-v1`, form
     `m18-form-1`): part keys `m18_c1_p3` AMPLIFIER, `m18_c2_p4` HEATER,
     `m18_c3_p2` SENSOR; step keys `m18_c1_s2` (Only P1, P2 read TONE),
     `m18_c2_s1` (AIR 12 · GAUGE COOL), `m18_c3_s4` (LAMP OFF · WINCH STILL);
     chance 1/4 per response. Its documented limitations travel with it
     (preview §10): six responses clustered in three independently designed
     cases at one board in one episode; one form, fixed order (case and
     position confounded; first contact in case 1; no practice case); cases
     not equated; the step companion depends on the diagnosis (case 3's step
     key shared with HATCH; case 3's step key needs less evidence than its
     diagnosis); the disclosed cues of preview §5.3 (case 3's key the "nothing
     changes" answer, case 2's the "repair" answer, case 3's part key named on
     button C, one test then a guess ≈ 1.17 of 3 parts, the procedural
     carry-over from case 1); rules always visible (a ceiling plausible); test
     use recorded, never adjusted for; a session ending while open exports
     `pending`; after a reload prior exposure is uncertain, never proven
     absent; the research support of preview §1.3 is abstract-level. The
     provenance limit of the contract applies: the original owner documents
     are not on disk and were not searched for again. Rulings D-U16-1,
     D-U17-1 / D-U17-2 and §5.290 (M14), D-U18-1 (M15), D-U19-1 with A1 and
     §5.314 (M16) are precedent only. As-built: §4 "Unit 20".
316. **D-2 — first-opening card (U20 default).** The first opening shows the
     card (preview §3.3, six fixed lines) with START CASE 1, HELP and LEAVE
     BOARD; activating START CASE 1 is recorded (`intro_acknowledged`) and
     presents case 1; leaving before it shows the card again at the next
     opening (the M16 precedent). Reversible; owner-visible.
317. **D-3 — drafts (U20 default).** Activating a part or answer tile makes it
     the draft, another replaces it, the same again clears it; drafts are kept
     per slot (the part draft of a case; the answer draft of its step), logged
     as `option_drafted` interactions, never responses; they survive leaving
     and returning; only confirming records an answer. Reversible.
318. **D-4 — commitment mechanics and the settle (U20 default; the M02 §5.210,
     M13 §5.262, M14, M15 and M16 precedents).** The 400 ms fresh-press rule
     on every confirmation (a press inside the window refused and recorded
     once per dialog as `commit_press_refused` with the count carried on the
     record; held keys and auto-repeat dropped by the surface); RECORD PART /
     RECORD ANSWER without a draft refused with the neutral line
     (`commit_without_draft`); the settle on EVERY view transition — the card,
     a case's first view, a step's first view, the acknowledgement, each
     results page, the help sheet and the view restored by CLOSE HELP or a
     cancelled dialog (the §5.290 (b) convention generalised) — a press inside
     400 ms changing nothing and, when it would otherwise have acted, logged as
     `press_refused` (target `view`, reason `settling`); a same-test repeat
     within 400 ms refused and logged (`press_refused`, target `test`, reason
     `repeat_within_settle`); the opener / confirm distinction (every opener in
     the right column at x ≥ 738, every dialog control at panel x 200–720, so a
     double click on an opener records nothing and a fresh confirm records
     exactly one); neutral focus on entry to every view through a non-acting
     first focusable element; the confirm control first in a dialog's focus
     order. Reversible.
319. **D-5 — help (U20 default).** HELP (H or the button) on the card, every
     case, step and acknowledgement view and every results page, never while
     a dialog is open; informational (the eight approved lines); every consult
     logged (`help_consulted`) with the phase and the view (`intro`,
     `case_<k>`, `step_<k>`, `ack_<k>`, `results_<k>`) — an interaction, never
     an answer; CLOSE HELP (H, ESC or the button) restores the same view with
     all its state and re-arms its settle. Reversible.
320. **D-6 — dispositions and `missing_reason` values for zero and partial
     evidence (U20 default; contract §3.12; addendum §1 free text).** Both
     rows: `not_presented` (never briefed, never opened); `pending`
     (`briefed_not_opened` while open, or opened and open with 0–5 responses —
     also with three parts recorded and a step pending [O-9]);
     `no_eligible_event` at the review closure — `briefed_not_opened`
     (censored), the diagnosis row `intro_only` (the card only) or
     `case_presented_no_response`, the prediction row `diagnosis_only` when at
     least one part exists and no step answer, otherwise the diagnosis row's
     reason; `incomplete` for 1–2 responses of the slot closed at the review
     (the value on the observed denominator, censored); `observed` for 3, or
     at completion; `interrupted` for the hold-back and for a reloaded load
     without an established absence; `technical_failure` on the rows the
     defect's scope names; never `declined`. Reversible.
321. **D-7 — names (U20 default; all provisional, alternatives are the
     owner's).** Family `proto_m18_cases_`, opportunity
     `proto_m18_cases_series`, window `m18_cases_w1`, object and surface
     `m18_diagnostic_board`, entry version `m18-cases-v1`, form `m18-form-1`,
     content `m18-content-v1`, the case, test, part and step option ids of
     contract §9.1, the slots `diagnosis` / `prediction`, the response kinds
     `option` / `cannot_solve`, the result ids of the tests (§4 "Unit 20" (2)),
     the event suffixes of contract §9.2, the feature ids as in the register.
322. **D-8 — event order (U20 default).** The §5.259 convention: an outcome
     that depends on event order is read only from events that each carry a
     usable, distinct `sequence`; a family event of the load without one
     voids both rows (`shared`, sequencing); a `results_shown` not preceded by
     `first_responses_completed` voids both rows (a shared exposure defect);
     gaps are normal.
323. **D-9 — companion definitions (U20 default).** Omissions per slot =
     cases presented without a first response of that slot
     (`unanswered_case_ids`; a step never presented counts as unanswered for
     the prediction slot only when its case was presented), unpresented cases
     listed apart (`unpresented_case_ids`), never CANNOT SOLVE
     (`cannot_solve_count` per slot); test use = the tests run before the part
     (`tests_run_before_part` ids in A–C order, `test_runs_before_part`
     including repeats, `repeated_test_runs`); `evidence_sufficient_before_part`
     and `step_answer_implied_by_recorded_part` as ruled (item 10).
324. **D-10 — the legacy board (U20 default).** `m18FaultDiagnosis.ts`,
     `faultForms.ts` and `ui/DiagnosisConsoleScene.ts` stay in the tree
     unchanged under their frozen v2 identity, reachable only through the
     developer alias; the laboratory route no longer imports the legacy
     module; `src/measurement/m18Diagnosis.ts` untouched; the registry's
     descriptive `opens` / window label for `lab.phase_m18` stay stale (U24
     backlog); the v3 extractor reads neither legacy family.
325. **D-11 — layout and interface details inside the wide frame (U20
     default).** The positions of preview §3.1 as listed in §4 "Unit 20" (1)
     "Layout" (adjustable inside the contract §3.10 envelope); the test table's
     `not run yet` (a case view) / `not run` (after the tests close); the test
     buttons rendered as labelled readouts once the tests are closed; the
     per-view footers naming the keys and TAB; the closed-record counts line
     `Parts recorded: P of 3 · planned steps recorded: S of 3.`; the header
     `Case N of 3` on case, step, dialog and acknowledgement views; results
     titles `RESULTS — CASE N OF 3`; the help title `HOW THE BOARD WORKS`.
     Not updated in this unit (U24 backlog): the capture specs, the registry's
     `lab.phase_m18` `opens` and window label, `world_v1_*` evidence, Noor's
     "test rig" line (agreed with by the card, not changed). Carried forward
     unchanged and open: the M16 beacon salience question (§5.314 (4)); the
     M05 competing-task observation of §5.290 (e) (i) and the episode-1 M05 cap
     on the scripted route; the U18 salience observation H1 (§5.301).

326. **U20 reviews, correction rounds and recorded defaults (13 October
     2026).** Three read-only reviews on Opus 5.5 (scientific, gameplay,
     visual; general-purpose agents reading their role files — the named
     agent types were not discoverable in the session) and the Sonnet 5.5
     test-reviewer's matrix, with two bounded correction rounds inside the
     allowlist. **Round 1** (the matrix): `signal_incident_models.spec.ts`
     asserts the laboratory scene's literal
     `prior_m13_window_status: m13LatticeWindowStatus()`; the adapter's
     route-context option renamed from `priorM13WindowStatus` to that key —
     a deviation from the contract's §5 description of `openM18`, governed by
     the §12 P2 gate; no behaviour changed. **Round 2** (the reviews):
     (a) MATERIAL, scientific — `evidence_sufficient_before_part` was
     derived although the case's earliest diagnosis record left the part
     undetermined (contract §10 nulls it); fixed in the extractor and
     asserted per X4 case; a closure-snapshot `part` disagreement counts as
     undetermined (the model state that drove the echo differs from the
     record). (b) MATERIAL, gameplay — a board never opened before the
     review was recorded absent but came back live afterwards (the series
     stayed `unopened`); the adapter now closes the series as the review's
     record (`m18sCloseUnopenedAtReview`, nothing logged), so a later
     opening shows `Parts recorded: 0 of 3 · planned steps recorded: 0 of
3.`, accepts nothing and writes no event; a pure test covers it; the
     M16 precedent has the same shape (U24 backlog). (c) MATERIAL, visual
     and gameplay — a results page reached by NEXT or BACK landed on that
     control (the scene keeps focus by element id; contract §3.5 asks a
     neutral landing on every results page); the page controls now carry the
     page in their id (`results_next_1` / `results_next_2`,
     `results_back_2` / `results_back_3`) so the landing is the results text;
     R1 asserts the focus on pages 2 and 3 and on BACK; the pure spec, R2,
     R7 and R9 follow the ids. (d) MINOR, scientific — a 3-of-3 row closed at
     the review carried `censored: true`; now `censored: denominator < 3`
     (contract §3.12: 3 ⇒ `observed`). (e) MINOR, scientific, tests — oracle
     (ii)'s case 1 symptom derived from the rule chain instead of asserted;
     the equality mutant fed with pairs derived from the hand physics table;
     the X3 `stop_control` mutation (a no-op: an entry declaration) removed.
     (f) MINOR, gameplay — `pilot_signal_incident` pressed case 3's TEST A
     inside the view's settle; it now waits 450 ms and asserts both result
     lines. (g) MINOR, documentation — §4 "Unit 20" (1), (2), (4), (5)
     corrected: the settle and `press_refused` claims narrowed to the build
     (LEAVE BOARD, the leaving ESC and the help sheet's ESC not settle-gated;
     a consumed ESC and an early KEEP WORKING not logged — M16 precedent);
     D-11 records the help title inside the sheet's text block (h 300), the
     card text inside its landing box and the results box height; the
     mutant disclosure. **Disclosed, not changed** (each owner-visible):
     (h) a sequencing defect is not re-detected as `shared` while an
     uncertain-attribution record exists in the load (both rows already
     voided); (i) the per-case `correct` in the components is the recount —
     the owner may prefer the recorded flag beside it; (j) after a fault
     once all six answers are in, the board shows the fault record and a
     reopening shows the results again (the scored evidence untouched);
     (k) a double click on a part or answer tile drafts and clears it (the
     same-tile toggle has no repeat window — D-3; changing it would alter the
     draft companion); (l) the laboratory RESUME handler resumes the kit
     window when the surface itself closes, so the kit's `active_ms` accrues
     until the review (M15 / M16 precedent; the model's per-slot times and
     the focused clock are unaffected); (m) the part question wraps "case /
     1?" at the default font (a non-breaking space would change the pinned
     string — owner's call); (n) the neutral feedback line ("Choose a part
     first.") can persist up to 2.2 s into the next view (shared surface
     style; U24); (o) the amber feedback colour is the shared surface style;
     (p) frame 28's recorded state is a marker on the display trace —
     contextual imagery; (q) no pre-U20 frame of the current laboratory art
     exists for a before / after comparison; (r) from the scientific
     confirmation: a fully observed row at the review closure keeps a
     non-null `censor_reason` beside `censored: false` (descriptive; a null
     reason would be the consistent form), and X4's 'derived' branch asserts
     a boolean rather than the hand value `true` — both left as they stand
     after the second correction round. **Owner clarifications
     requested** (no implementer resolution): whether indicators of OTHER
     cases in a load with an I4 failure should also be null (the contract's
     text nulls only the undetermined case; other cases stay derived), and
     (i) above. No finding touched the content, the keys, the rule or the
     ruling D-U20-1.

327. **U20 closeout — the owner's indicator clarification and four
     corrections (13 October 2026).** Research-owner authorization of 13
     October 2026 (`UNIT-LOG.md` "U20 closeout authorization", verbatim):
     one additional local commit after focused verification and one
     read-only review, the correction-round and single-commit limits
     extended for this closeout only. **The clarification (approved by the
     owner as the research owner):** when the final defect scope of a load is
     `shared` or `isolation_uncertain`, BOTH descriptive indicators
     (`evidence_sufficient_before_part`,
     `step_answer_implied_by_recorded_part`) are null for EVERY case of that
     load — including a slot defect that fails I4 and so becomes
     `isolation_uncertain`; genuinely isolated slot defects keep the approved
     case-specific treatment, and evidence sufficiency is not erased while
     the diagnosis commitment position and the investigation record remain
     trustworthy; descriptive indicators only — no diagnosis / prediction
     formula, key, planned denominator or missing-answer rule changes. This
     settles the clarification requested in §5.326 (the other cases'
     indicators under an I4 failure: null) and the X4 note of §5.326 (r);
     the per-case `correct` question of §5.326 (i) is settled as the
     documented recount (no raw-flag component required); the censor reason
     of §5.326 (r) is null where `censored` is false. Implemented as §4
     "Unit 20 closeout" (2); the other corrections — the pause timing of
     §5.326 (l) and the sequencing suppression of §5.326 (h), narrowed to an
     earlier uncertain record that could be the missing response — as (1),
     (3) and (4) there. Left as recorded: §5.326 (j), (k), (m) (the "case /
     1?" wrap needs no edit and no new decision), (n)–(q) (U24 backlog). The
     original commit `2eed381` preceded this clarification.
328. **RESEARCH-OWNER DECISION D-U21-1 — APPROVED 13 October 2026 (M19, the
     two coupling lines; U21).** An owner ruling with its date, recorded here
     as the owner's approval of the preparation session records it (contract
     `U21-CONTRACT.md` gate line; `U21-OWNER-PREVIEW.md` status line;
     `U21-VERIFICATION-LOG.md` "Owner decision recorded"; `UNIT-LOG.md`
     "U21"); not an implementer default; not reopened by this unit. Items 1–9
     of preview §3 APPROVED AS RECOMMENDED, in the owner's words: "I approve
     D-U21-1 items 1–9 as recommended in the corrected U21 r3 package,
     including Option B and the E21/W1 runtime-fault distinction. I accept the
     documented eligibility and fixed-order limitations, with the measure
     remaining provisional pending pilot evaluation." Item 1: line 1 HEATER
     BANK (key H1 + H3 with FEED DOUBLE) and line 2 PRESSURE TRIM (key dial 5,
     bypass OPEN) with every string of preview §4 (`m19-content-v2`,
     `m19-form-1`). Item 2: Option B — the line's designed obstacle,
     established only by TRYs of its listed evidence settings (line 1 the
     all-ON SINGLE setting; line 2 dial 4 SHUT and dial 5 SHUT), inferred
     routes not counting, recorded once per line as an immutable record. Item
     3: nothing marks the boundary; TRY and SET ASIDE throughout; no time
     limit; SET ASIDE never shows a solution. Item 4: a further executed TRY
     after leaving and returning qualifies, flagged `continued_after_leaving`.
     Item 5: `check_status` keeps `fail` (⇒ `understanding_failed`),
     `not_completed` and `not_reached` (⇒ `no_eligible_event`) and a presented,
     never-opened panel (⇒ `no_eligible_event`, `not_opened`, never
     `declined`) apart; both lines administered whatever the status. Item 6:
     fixed order, one form; line 2 only after line 1 is finished through the
     same neutral view; a finished line never reopens. Item 7: an eligible line
     without a further TRY — SET ASIDE or the participant's own end of the
     outside work ⇒ 0 in the denominator (finish kinds `set_aside` and
     `shift_ended` kept apart); the station-record review ⇒ censored and
     excluded. Item 8: null `pending` until BOTH lines are finished or the
     panel is closed; then the value (or a null with its reason), stable. Item
     9: a runtime fault is line-scoped — the line in work is excluded even when
     a further TRY after its boundary was already recorded (its record kept;
     `censored: true`; the reason named), lines finished before the fault keep
     their outcome, a fault with no line in work excludes nothing but closes
     the series, no eligible line left ⇒ null `technical_failure`
     (`technical_only`), never a non-response disposition, a check already
     recorded as `fail` stays `understanding_failed`, malformed or
     contradictory scored evidence voids the whole row (contract §9.4). Settled
     consequences, implemented as [A]: at most one credit per line; only an
     executed TRY of a new complete setting is a work attempt; no cue draws
     the participant back to an unfinished line; a reload exports only
     current-load evidence. Its documented limitations travel with it
     (preview §9): under Option B who is measured depends on how participants
     search (early stoppers and participants who anticipate the second control
     are excluded; eligibility per line unknown until piloted); the count may
     vary little; two lines in one episode, fixed order, one form (content and
     position confounded; observations clustered; line 1 may teach the use of
     a second control); leaving and later returning counts, flagged; the
     shift-end rule partly reflects route choices; M22's handover line
     "Coolant coupling — valve serviced" is unchanged whatever M19's outcome
     (U24 backlog); no source validates the count. Boundaries: all events,
     features and components remain provisional; no canonical promotion,
     combined score or scientific-validity claim; no questionnaire wording or
     pressure to continue or stop in participant-facing text. The provenance
     limit of the contract applies: the original owner documents are not on
     disk and were not searched for again. Rulings D-U16-1 through D-U20-1 and
     the U20 closeout of 13 October 2026 are precedent only. As-built: §4
     "Unit 21".
329. **D-2 — first-opening card (U21 default).** The first opening shows the
     card; CONTINUE records `intro_acknowledged` and presents the check; the
     card is shown again if the panel is left before CONTINUE; the check's
     stage (question 1, the explanation, question 2, the recorded line) and
     its draft survive leaving. Reversible.
330. **D-3 — drafts (U21 default).** The check option draft (a tile drafts,
     another replaces, the same again clears; `option_drafted` with the
     previous option), line 1's heaters and feed and line 2's dial and bypass
     are drafts that survive leaving and returning; a finished line's setting
     is frozen with its view; a setting change is `setting_changed`
     (descriptive) and never a work attempt. Reversible.
331. **D-4 — commitment mechanics and the settle (U21 default; the M02
     §5.210, M13 §5.262, M14 §5.290 (b), M15, M16 and M18 precedents).** A
     400 ms settle on EVERY view transition (the card, the check questions,
     the explanation, the recorded line, each line view, the finished views,
     the help sheet, the view restored by CLOSE HELP or BACK, a dialog, a
     reopened view): a TRY inside it is `try_refused` `settling` (logged; no
     feedback), any other press is dropped and not logged, a carried ESC is
     consumed; the dialog's confirm acts only on a fresh press at least 400 ms
     after the dialog appeared (an earlier press refused and not logged), its
     cancel is refused inside the same window (the dialog stays); the confirm
     control is first in focus and never sits where the opener sat (dialog
     controls at panel x 200 / 466, every opener at x ≥ 738); every other view
     lands on a neutral, non-acting text landing; no movement key and not E is
     bound; held keys and auto-repeat are dropped by the surface; LEAVE and the
     leaving ESC are not settle-gated beyond the consumed carried ESC (M18
     precedent). Reversible.
332. **D-5 — help (U21 default).** HELP (H or the button) on the card, the
     check views, the explanation, the recorded line, every line view and the
     finished views — never inside a dialog; the sheet of preview §4.9, CLOSE
     HELP first in focus; logged `help_consulted` with the `view` (`intro`,
     `check_1`, `explanation`, `check_2`, `recorded`, `line_1`, `line_2`,
     `finished_1`, `finished_2`) — an interaction, never a continuation and
     never a clock pause; CLOSE HELP (H, ESC or the button) restores the same
     view with everything kept and re-arms its settle. Reversible.
333. **D-6 — dispositions and the free-text `missing_reason` (U21 default;
     contract §3.8; addendum §1).** `not_presented` (never presented and never
     opened in this load); `pending` (`presented_not_opened`, `check_open`,
     `lines_in_work`); `no_eligible_event` with `not_opened`,
     `check_not_reached`, `check_not_completed`, `obstacle_not_reached` or
     `no_try`; `understanding_failed` with `check_failed`; `interrupted` with
     the reload reasons or `censored_only`; `technical_failure` with
     `technical_only` or the named integrity defect; never `declined`. Each
     mirrored by the structured `nonresponse_kind` component; the kit's
     absence details `presented_not_opened` / `not_presented_not_opened` at
     the review. Reversible.
334. **D-7 — names (U21 default; all provisional, alternatives the owner's).**
     Family `proto_m19_lines_`, opportunity `proto_m19_lines_series`, window
     `m19_lines_w1`, object and surface `m19_coupling_panel`, entry version
     `m19-lines-v2`, form `m19-form-1`, content `m19-content-v2`, the line,
     check and option ids of contract §9.1, the setting field names (`h1`,
     `h2`, `h3`, `feed`; `dial`, `bypass`), the control names (`h1`, `h2`,
     `h3`, `feed`, `dial_down`, `dial_up`, `bypass`), the event suffixes of
     contract §9.2 (`closed_unopened`, `line_finished`, `reading`, `restored`
     included), the feature id as in the register; the surface element ids
     (`intro`, `continue`, `question`, `option_1` … `option_3`, `record`,
     `explanation`, `recorded`, `start`, `sheet`, `log`, `readout`,
     `heater_1` … `heater_3`, `feed`, `dial_down`, `dial_up`, `bypass`, `try`,
     `set_aside`, `finished_line`, `next`, `finish`, `dialog`, `confirm`,
     `back`, `help_<view>` and `leave_<view>` — per view since the closeout
     of 14 October 2026 (§5.342), the view named as `m19HelpView` names it
     (`help_consulted` carries the same names except `record`, which no help
     consult can reach): `intro`, `check_1`, `check_2`, `explanation`,
     `recorded`, `line_1`, `finished_1`, `line_2`, `finished_2`, `record` —
     `help_sheet`,
     `close_help`, `closed`).
335. **D-8 — event order, the field classification and the integrity rules
     S1–S7 (U21 default).** The §5.259 convention: an outcome that depends on
     event order is read only from events that each carry a usable, distinct
     `sequence`; the classification and the rules of §4 "Unit 21" (2) are the
     minimum set; every violation voids the row with the defect named and its
     sequence; descriptive inconsistencies set named flags only; the
     `attempt_sequence` of a boundary is the logger sequence of its attempt
     event, read back from the runtime's event list after the attempt was
     written (null in no case of the build; a pure sink returns its own
     number); the reload hold-back is read as the M18 precedent reads it; the
     lifecycle follows contract §3.8 row 1 — an opening of this load is
     always read from the opening (case E18), and a later load with neither a
     `presented` nor an opening of its own is `interrupted` even when its
     reload check establishes the absence of an earlier opening (correction
     round 1 after the combined review, finding SC-3; case E1b).
336. **D-9 — companion definitions (U21 default).** `tries_before_boundary`
     = attempts with an index below the boundary's (all attempts when there is
     none); `tries_after_boundary` = attempts above it; `refused_tries` and
     `refused_tries_after_boundary` by reason from `try_refused` (descriptive);
     `changed_second_control_after_boundary` = an attempt after the boundary
     with FEED DOUBLE (line 1) or the bypass OPEN (line 2); `restored` /
     `restored_at_attempt` from the stored flags (checked against the rule);
     `help_consults` and `panel_leaves_after_boundary` from the line's
     records; `continued_after_leaving` = the first attempt after the boundary
     followed a `panel_left` written after the boundary; Option A's
     `first_unsuccessful_try_index` = the first attempt with `restored: false`
     and `continued_after_first_unsuccessful` = a later attempt exists
     (null without an unsuccessful attempt) — components only, never a value;
     the timing companions as the clock policy records them.
337. **D-10 — the legacy coupling (U21 default).** `m19CouplingModel.ts` and
     the legacy adapter functions in `exteriorWindows.ts` (`m19Present`,
     `m19Act`, `m19StepAway`, `m19PromptBody`, `closeM19`, the legacy
     `exteriorTechnicalFailure('M19', …)` branch and the probe's `m19` block)
     stay in the tree unchanged under their frozen v2 identity; the yard scene
     no longer imports or calls them; `exteriorWindows.ts` loses only
     `w.m19.declare();` and the review-absent entry
     `[w.m19, 'coupling never worked before the review']`, so the legacy
     window is never declared, offered, presented, opened or closed on the
     route and the U8-12 count stays 8 (dead legacy calls plus M20 / M23); the
     exterior departure / resume calls on the undeclared, unopened legacy
     window are no-ops; the probe's `m19` block reports the untouched legacy
     state. Not updated (U24 backlog): the capture specs, `exteriorHelpers.ts`
     `couplingAct` / `completeCoupling` (unused), the M22 report line, the
     U8-12 gate's stale premise, the registry's `yard.coupling` description.
338. **D-11 — layout and interface details inside the wide frame (U21
     default).** The positions of §4 "Unit 21" (1) "Layout" (the mockup's,
     adjustable inside contract §3.9); the readout as the line view's neutral
     landing and the check question, the explanation, the recorded line, the
     finished line and the closed record as landings; the final view's
     two-line landing (`Line 2 finished: <how>.` over `Both lines finished.`)
     so both approved lines stay visible; the TRY list's nine-row rule with
     `… k earlier TRYs not shown` above the newest eight; the per-view footers
     of preview §4; the neutral world chip `COUPLING PANEL`, the static dial
     arc and the hidden frost sheet; the ON heater tiles in the surface's
     `selected` state (a marker glyph beside the colour; the readout names the
     ON heaters in words, so state is never colour alone); `series_completed`
     and the kit's completion written at line 2's finish, FINISH only closing
     the surface. Carried forward unchanged and open: the M16 beacon salience
     question (§5.314 (4)); the M05 competing-task observation of §5.290 (e)
     (i).
339. **D-12 — clock policy (U21 default; contract §9.5; the U20 closeout
     lesson).** One `FocusedClock` per line in the pure model (started at
     `line_presented`, stopped at the finish; the adapter registers each with
     `focusMonitor` for `focus_loss` / `hidden`); `surface_closed` on LEAVE /
     ESC / walking away / leaving the yard, resumed at the real reopening;
     help and dialogs never pause; the yard's PAUSE / RESUME never touch the
     clock or the kit window; `resumeM19Surface` resumes the kit window only
     while the panel is open; a finish by the shift end, the review, a fault
     or a reload adds nothing; `line_focused_ms`,
     `boundary_to_next_try_focused_ms`, `boundary_to_finish_focused_ms` and
     `since_boundary_focused_ms` as §4 "Unit 21" (1) "Clock policy".
340. **D-13 — the fault record (U21 default; owner-visible).** (a) The kit's
     `ItemWindow.technicalFailure` cannot carry the line in work (windowKit is
     outside this unit), so a runtime fault writes the family record
     `technical_failure` through the window's `log` with `detail`, `line_id`,
     `line_index` and `phase` `closure` and marks the opportunity
     `technical_failure` through the framework's `markOpportunityInvalid`
     (register and probes refreshed); the kit's private window status is not
     changed (no later kit event is expected; the kit window is paused). The
     reload hold-back keeps the kit's own `technicalFailure`. (b) The preview
     names no closed-record line for a panel reopened after a runtime fault
     (its §4.10 lists the shift-end, review and reload records only); rather
     than author one, the reopened panel after a fault shows the header, an
     empty neutral landing and `LEAVE  [ESC]` (footer `ESC leave`) and accepts
     nothing. A record line for this state is a wording decision reserved to
     the owner (U24 backlog); nothing in the value, the eligibility or the
     dispositions depends on it. Closeout (14 October 2026, §5.342): the owner
     approved adding a two-line fault record; as built, the reopened panel
     after a runtime fault shows, as its neutral landing (60 design px high,
     like the final view's two-line landing) with `LEAVE  [ESC]`,
     `The coupling panel has a fault and is closed.` over
     `Its record is kept as it is.` — implementer wording in the shape of
     the M14–M18 fault records
     (`The <object> has a fault and is closed. Recorded answers are kept.`),
     not preview text, inside the vocabulary of preview §4.1 and the wording
     audit of §8 (both lines in the pure spec's transcription and audit); the
     U24 backlog entry is closed. Sign-off (14 October 2026, §5.343 ruling
     1): the owner accepted this wording exactly; it is approved wording
     from that date.
341. **The U21 reviews, correction round 1 and the open findings
     (13 October 2026).** The final matrix (§4 "Unit 21" (5)) was run once by
     the test-reviewer on `claude-sonnet-5-5`; then ONE combined read-only
     review (the scientific, gameplay and visual roles together) was run by a
     general-purpose agent on the opus override — it reported model Opus 5.5
     (`claude-opus-5-5`) — on the matrix digest, the contract, the preview,
     the four documents, the test-reviewer's report and the twenty-nine
     frames; it ran nothing and edited nothing (the UNIT-LOG "U21 results"
     holds its report verbatim). Its verdicts: scientific — concerns found
     (one MATERIAL); gameplay — usable with noted friction; visual — readable
     with noted defects, all minor or cosmetic. Confirmed conforming by the
     reviewer from the code, not from the documents: the boundary written at
     the attempt that completes the listed evidence settings, once, immutable,
     inferred routes never counting; continuation = a further attempt only;
     the check outcomes kept apart and stable; the closure and fault rules
     with E21 / W1; the field classification and S1–S7; the zero-denominator
     and empty-row shapes; the clock policy; the oracle's independence; no
     validity claim in any document and no questionnaire stem or pressure
     word in any participant string; the legacy separation; the ESC order; a
     way out of every state; no clipping, overlap or wrapped fixed line in any
     frame; HELP and LEAVE on every working view; the vocabulary. Fixed in
     correction round 1 (inside the allowlist; the affected checks rerun by
     the test-reviewer): SC-1 MATERIAL — the zero-denominator disposition for
     a fault with no line in work (§4 "Unit 21" (6) (f); pure case E19b);
     SC-3 MINOR — the reading of a later load without current-load evidence
     (§5.335; (6) (g); pure case E1b); VI-3 NOTE — frames 05, 06 and 21 at
     800 × 600 ((6) (h)). Not fixed, disclosed: SC-2 MINOR — the shift-end
     row's `closure_reason` is the framework's `route_departure` with the
     family's `shift_ended` beside it as `series_closure_reason` (default
     D-6, §5.333; the enum lives in a prohibited file); SC-4 NOTE — the kit
     window's private status stays `open` after a runtime fault (D-13 (a),
     §5.340); SC-5 NOTE — TRY carries the accent style and SET ASIDE the plain
     style on every line view, constant over the whole line and present in
     the owner-seen mock-up, still a salience difference between the "go on"
     and the "stop" control on the measured choice; SC-6 NOTE — the coupling
     station has no stage gate (unchanged from the base; contract item [A]),
     so a panel opened before Noor's briefing writes no `presented` in that
     load (`stage_at_open` records it; `presented_in_current_load` false);
     SC-7 NOTE — the reviewer read the `verify-unit` PASS as vacuous because
     its "changed vs 390d5ce" list was empty before the commit; the script
     also checks the working tree's staged, unstaged and untracked paths
     against the allowlist (its candidate set), so the PASS covered the
     eighteen uncommitted paths, and the base list fills only after the
     commit, when the check is rerun; GP-1 MINOR — the shared wide frame keeps
     focus on the same element id across views (a prohibited file), so a
     hotkey that changes the view while HELP or LEAVE is focused lands on
     HELP or LEAVE instead of the neutral landing (M15, M16 and M18 share the
     behaviour; no record is affected; per-view control ids would fix it at
     the cost of the route spec's id conventions — U24 backlog); GP-2 / VI-1
     MINOR — the amber feedback line of the last action stays for the
     surface's 2.2 s auto-clear across a view change (frames 13, 14 and 21;
     after NEXT LINE within 2.2 s line 2's first view can still show line 1's
     feedback; the auto-clear is the shared surface's, a prohibited file;
     cosmetic); GP-3, VI-2 and VI-4 NOTE — naming and fiction, the world chip
     hidden behind the station prompt in frame 29, the accent focus ring on
     the neutral landing (precedent). Questions for the research owner raised
     by the review (options only; nothing resolved here): (1) a fault between
     the lines with line 1 eligible and line 2 never presented — keep
     `censored: false` (as built: the fault excluded no presented line) or
     mark the row censored because line 2 was never given; (2) the shift-end
     `closure_reason` — keep `route_departure` with `series_closure_reason`
     beside it, use another existing enum value, or extend the framework enum
     in a later unit; (3) TRY versus SET ASIDE salience — keep or equalise;
     (4) the record line for a panel reopened after a fault (§5.340 (b),
     already queued); (5) the kit window status after a fault (D-13 (a)) —
     accept or require a kit change later; (6) the per-view focus landing
     (GP-1) and the feedback auto-clear (GP-2) — accept the shared-surface
     behaviour or change the wide frame in a later unit. Not checked by the
     reviewer: it ran nothing; the route spec's assertions step by step; the
     pilot_yard re-expression in depth; the other items beyond the
     test-reviewer's results; the R8 figures. The affected checks after round
     1, rerun by the test-reviewer (`claude-sonnet-5-5`) on the source digest
     `aca73bbd9fd91b62c1e8b0218b3ac91673e47483bbadb950183e8a896baf5281`
     (`src` and `e2e`; start and end identical): `lint:tsc` exit 0, `build`
     exit 0, ESLint with the prettier rule on the three changed files exit 0,
     `git diff --check` exit 0, the pure spec 52 passed, the six pure
     regression specs 80 passed with the same two inherited failures and
     nothing new, the route scenarios R2 (1280 × 720 and canvas 1080), R3, R9
     and R9b 5 passed in 766 s with no retry and no skip; frames 05, 06 and
     21 measured 800 × 600 from their PNG headers (every frame 800 × 600
     except 25 and 26 at 1280 × 720, 26 being the full-HD canvas inside that
     viewport). B2 was not rerun (no shared file changed; no B2 scenario
     reloads the page or faults the panel). The final static checks on the
     completed tree are in §4 "Unit 21" (5). No second correction round was
     needed.
342. **The U21 closeout (14 October 2026): the research owner's decisions on
     the §5.341 questions, as implemented; a second local commit.** The
     owner's instruction (quoted verbatim in the UNIT-LOG "U21 closeout"):
     approve the proposed closeout — fix M19's neutral focus locally, add the
     two-line fault message, accept the documented closure-reason mapping and
     the internal-window-status exception, retain the existing between-line
     fault interpretation and the listed U24 deferrals; complete the narrow
     verification and reporting corrections, obtain the final Opus
     confirmation, make one additional local closeout commit; no push, merge,
     shared-framework redesign or U22 work. Item by item: (1) question (1) —
     a fault between the lines with line 1 eligible and line 2 never
     presented keeps `censored: false` (as built, pure case E19: the fault
     excluded no presented line; `faults` in the components names it).
     (2) question (2) / SC-2 — default D-6 (§5.333) accepted: the shift-end
     row's `closure_reason` is the framework's `route_departure` with
     `series_closure_reason` `shift_ended` beside it; no enum change.
     (3) question (3) / SC-5 — not addressed by the instruction: TRY keeps
     the accent style and SET ASIDE the plain style as in the owner-seen
     mock-up; the salience question stayed open at the closeout commit and
     was closed by the owner's sign-off (§5.343 ruling 4: retained, its
     limitation recorded for U24).
     (4) question (4) / §5.340 (b) — the two-line fault record added:
     `The coupling panel has a fault and is closed.` over
     `Its record is kept as it is.` (implementer wording in the shape of the
     M14–M18 fault records; not preview text; the vocabulary and the wording
     audit hold;
     `m19RecordLine` returns it for status `technical_failure` — on the
     open panel at the moment of the fault and on every reopening; the
     landing 60 design px high; the pure spec's transcription list, the
     strings inventory and the closed-records test carry it; the browser
     evidence never faults the panel, so the record is not rendered in any
     frame). (5) question (5) /
     SC-4 — D-13 (a) (§5.340) accepted as a documented exception: the kit
     window's private status stays `open` after a runtime fault; the family
     record and the framework's `markOpportunityInvalid` carry the fault; no
     kit change. (6) question (6) / GP-1 — fixed locally in M19, the shared
     wide frame untouched: HELP and LEAVE carry the view's name in their ids
     (`help_<view>` / `leave_<view>`, the view named as `m19HelpView` names
     it — `intro`, `check_1`, `check_2`, `explanation`, `recorded`, `line_1`,
     `finished_1`, `line_2`, `finished_2`, `record`; the closed record's
     LEAVE is `leave_record`); the frame keeps focus by element id across
     refreshes, so a hotkey that changes the view while HELP or LEAVE is
     focused (R on the check, T restoring a line) finds no such id on the new
     view and lands on the view's neutral element, as preview §4.11 states
     ("every view lands on a neutral focus"), while inside one view the
     focus is kept (a setting hotkey with TRY or HELP focused); pointer
     activations always moved the focus first and are unaffected. Evidence:
     the pure test "HELP and LEAVE carry the view name in their ids" (nine
     distinct pairs across the nine working views; every id unique within
     the final view, the other views by inspection of the model) and route
     scenario R10 in the real game (the check with HELP
     focused and R ⇒ focus `explanation`; the recheck with LEAVE focused and
     R ⇒ `recorded`; line 1 with HELP focused and a restoring T ⇒
     `finished_line`; TRY focused and a setting hotkey ⇒ TRY kept; HELP
     focused and a non-restoring T ⇒ HELP kept). GP-2 / VI-1 (the feedback
     auto-clear) stays a U24 deferral with the rest of the list. Changed by
     the closeout, all inside the allowlist: `m19SurfaceModel.ts`,
     `m19LinesModel.ts`, `m19LinesContent.ts`, the pure spec (53 tests), the
     route spec (16 scenarios, the per-view ids in every expectation, R10)
     and the four documents; no event, field, formula, disposition, default
     other than D-13 (b) or participant string other than the fault record
     changed; the frame, the kit and every prohibited file untouched. The
     closeout verification (the affected checks rerun by the test-reviewer,
     the Opus confirmation, the final static checks) is recorded in §4
     "Unit 21" (5) "Closeout verification" and in the UNIT-LOG "U21
     closeout"; the second commit's hash is in the handoff.
343. **The U21 sign-off (14 October 2026): the research owner's five
     rulings on the closeout handoff; documentation only.** The owner's
     instruction (verbatim in the UNIT-LOG "U21 sign-off") closes the
     questions the closeout handoff left open; this entry and that section
     are the only changes, made as one authorised amendment of the
     unpushed closeout commit (its subject unchanged; the implementation
     commit untouched; no source, test, asset or configuration change).
     Ruling 1 — the implemented fault wording is accepted exactly:
     `The coupling panel has a fault and is closed.` and
     `Its record is kept as it is.` are approved wording from this date
     (§5.340 (b); the "implementer wording, not preview text" labels of
     §5.342 and the UNIT-LOG stand as the history of how it was authored;
     the Opus question E 1 is closed with option (a)). Ruling 2 —
     `content_version` stays `m19-content-v2`: the closeout adds a
     post-closure message and changes no measurement content, rule or
     scoring (the lines, keys, readings, the check, the boundary rule, the
     extractor and every disposition are as at the first commit; the Opus
     question E 2 is closed with option (a)). Ruling 3 — the disclosed
     `verify-unit` result of the closeout is accepted as an exception for
     this closeout only: the actual exit status is 1, before and after the
     commit, with the reported FAIL lines confined to the ten untracked
     `.agents/` and `.codex/` metadata files that a Codex Desktop session
     materialised in the worktree at 01:29:40 (byte-identical to the
     primary checkout's); the files are preserved; the verifier, the guard
     and the ignore rules are not modified; the result is not described as
     PASS anywhere (the unit's own nine modified and eighteen base-diff
     paths were inside the allowlist and `git diff --check` was clean, which
     is what the exit 1 does not cover). Ruling 4 — the TRY / SET ASIDE
     styling (SC-5, §5.341 question (3)) and the shared feedback auto-clear
     (GP-2 / VI-1, question (6) second half) are retained as built, their
     limitations recorded for U24 (the "go on" control carries the accent
     style on the measured choice; the last action's feedback line can
     outlive a view change by up to 2.2 s); the limitation that the fault
     message has pure-spec evidence only — no browser screenshot and no
     font measurement (§4 "Unit 21" (7); Opus D-2) — is retained
     explicitly. Ruling 5 — the formatting attribution is corrected: the
     base checks establish that the matrix and the UNIT-LOG already failed
     prettier on the base export, but not that every current complaint in
     them is inherited; the earlier blanket statements in §4 "Unit 21" (5)
     and the UNIT-LOG are qualified accordingly, without any reformatting
     and without a new formatting investigation (none required by the
     owner). Nothing else of §5.342 changes; every verification limitation
     and every historical report stands as written. No owner question of
     this unit remains open.
344. **Research-owner decision D-U22-1 — APPROVED 14 October 2026, with these
     SELECTIONS (an owner ruling, not an implementer default; recorded as the
     selections, never as "all thirteen recommendations approved"; U22, M20).**
     Items 1–11 of preview §3.3 as recommended, with the consequential changes
     item 12 requires: the return-shift feed console as the place and the legacy
     antenna start and resume off the route (1); six steps of 3, 3, 4, 4, 5, 5
     cells, the hold at step 2, A first, B once A has ever been held (2); the
     notice with item 12's timing — due at release + 30 s, delivered only with
     the console closed, the participant in the Workshop, nothing else open,
     the page visible and focused, the channel neither resumed nor aligned,
     shown 6 s or ended early, A before B with B ≥ 8 s after A's actual end,
     protocol times integrity-checked (3); presented at Workshop entry, guided
     at return-shift order 1 until the first opening, access immediate once
     released (4); the cued credit = the first EXECUTED ALIGN after the notice
     and the vector refusal rule (5); notice → credit or closure, sign-off ⇒ 0,
     review ⇒ censored, reload ⇒ `interrupted`, the row final once no channel
     can still become cued-eligible (6); cued-eligible ⇔ released AND not
     resumed before its notice AND notice validly presented AND not excluded,
     one eligible channel = complete, the zero-denominator precedence (7);
     never opened ⇒ `no_eligible_event` (`not_opened`), never `declined`, no
     comprehension check (8); faults keep earned resumptions of both kinds and
     exclude noticed channels awaiting a return (9); the verify-unit
     foreign-metadata rule (10); `closed_unopened` at the sign-off and the
     `pilot_route` "six-zone" classification (11). **Item 12 — the
     SILENT-RELEASE alternative:** a channel becomes workable 30 s after its
     hold independently of whether a notice can be shown; its notice becomes
     due 30 s later under the existing safeguards and is delivered only if the
     channel is still unfinished and not resumed; the first executed ALIGN
     before the notice is an operationally defined spontaneous resumption,
     recorded separately and excluded from the cued denominator; blocked
     approaches, opening alone, cell edits alone and refused ALIGNs are never
     resumptions; the same channel is never counted in both outcomes and no
     new occasion is created when it is reopened; the primary stays the cued
     numerator count with its eligible denominator — not a ratio or a
     combined score. **The owner's recorded limitation:** the cued outcome
     describes channels not resumed before their notice and must not be read
     as a ranking across all participants; two spontaneous resumptions with no
     eligible cued channel give a null primary, denominator 0, and two
     separately recorded spontaneous resumptions (E47). **Item 13 — the
     EXPLORATORY-LABEL alternative:** `registerV3.ts` M20 `coverage_label`
     and the §2 label cell become `exploratory`;
     `difficulty_established: false` is kept; the researcher-facing
     descriptions and the planned
     registration treat the task as a provisional measure of re-engagement
     whose relation to MPS item 2 requires empirical evaluation; "difficult"
     is never treated as established because more copying remains. Not
     selected: the item-12 recommendation (hold until the notice) and the
     item-13 recommendation (`behavioural_counterpart`). The ruling confirms
     §5 items 2 and 4 for M20. Rulings D-U16-1 through D-U21-1 and the U21
     sign-off are precedent only.
345. **D-2 — the card before CONTINUE (U22 default).** The first opening shows
     the card (preview §4.3) with CONTINUE, HELP and LEAVE; CONTINUE records
     `intro_acknowledged`, starts channel A and presents its step 1; leaving
     before CONTINUE shows the card again. Alternative: start A at the first
     opening without a card (rejected: the card is the owner's approved
     content).
346. **D-3 — cells and the step survive leaving (U22 default).** A channel's
     current step and its cell values are kept across LEAVE and reopening; a
     reopening always lands on the channel view (CONTINUE presents the step
     again with `resumed: true`), never on the step itself. Alternative: reset
     the cells to the loading value at every reopening (rejected: it would
     make a `repeat` refusal after a reopening impossible to distinguish from
     an `as_loaded` one and would discard the participant's state).
347. **D-4 — commitment mechanics and same-view focus (U22 default).** The
     400 ms settle on every view transition (ALIGN inside it refused and
     recorded `settling`; any other press dropped); held keys never act; a
     neutral landing on every view (the card text, the step board, the hold
     text, the channel rows, the closed record; the help sheet on CLOSE HELP —
     the U21 precedent); same-view focus kept by element id (cell tiles and
     ALIGN on one step), with HELP / LEAVE carrying the view's name and the
     step view's ids carrying the channel and step so a hotkey view change
     lands on the new view's neutral element (U21 GP-1); the hotkeys 1–5, G,
     A, B and H (no movement key — the avatar moves on the arrow keys only —
     and not E); a double click on ALIGN executes once (the second click is
     refused `repeat` or `settling`); ESC closes help, then the console.
348. **D-5 — help (U22 default).** `HELP  [H]` on the card, the step, the hold
     and the channel view (not on the closed records); `help_consulted` with
     the view name; the sheet exclusive while open; never work and never a
     resumption.
349. **D-6 — dispositions, `nonresponse_kind` and the free-text
     `missing_reason` (U22 default).** The row's `closure_reason` uses the
     framework enum (`route_departure` for the sign-off, `closed_at_review`,
     `completed`, `technical_failure`), with the family's own reason
     (`shift_signed_off` / `closed_at_review` / `completed`) beside it as
     `project_closure_reason`; `nonresponse_kind` is one of `not_presented`,
     `not_opened`, `not_begun`, `no_hold`, `cue_not_presented`,
     `resumed_before_cue`, `censored_only`, `technical_only`,
     `reload_hold_back`, `reload_no_current_evidence` or null; the
     `missing_reason` text names the kind (and the first integrity defect on
     a void row).
350. **D-7 — names (U22 default; all provisional, alternatives the
     owner's).** Family `proto_m20_feed_`; ONE opportunity
     `proto_m20_feed_project`; window `m20_feed_w1`; object and surface id
     `m20_feed_console`; `entry_state_version` `m20-feed-returns-v2`;
     `form_id` `m20-form-1`; `content_version` `m20-content-v2`; channel ids
     `m20_ch_a` / `m20_ch_b` (also the occasion ids); the suffixes of contract
     §9.2 — `presented`, `opportunity_opened`, `intro_acknowledged`,
     `console_reopened`, `console_left`, `held_visit`, `released_visit`,
     `prior_load_checked`, `closed_unopened`, `channel_started`,
     `step_presented`, `cell_changed`, `align_refused`, `align_attempt`,
     `step_aligned`, `channel_held`, `channel_released`, `cue_presented`,
     `cue_notice_ended`, `cue_cancelled`, `help_consulted`,
     `channel_aligned`, `project_completed`, `project_closed`,
     `technical_failure`, `window_closed`, and the outdoor
     `outdoor_brief_presented`, `outdoor_accepted`, `outdoor_stage_completed`,
     `outdoor_technical_failure`; the notice-end reasons `timeout`,
     `surface_opened`, `prompt_opened`, `shutdown`, `project_closed`,
     `technical_failure`; the mission-log entry `m20_feed_outdoor`; the DEV
     probe `window.__m20FeedProbe`; the feature `m20_cued_resumptions`
     unchanged. No canonical name, no scoring-plan variable.
351. **D-8 — event order, the field classification and the integrity rules
     S1–S7 (U22 default).** As §4 "Unit 22" (2): order read only from usable,
     unique sequence numbers; the scored / descriptive split of contract
     §9.4; S1–S7 as the smallest rules that make every scored field
     checkable, each voiding the row with the defect named, never a silent
     repair; the resumption ALIGN's clock values and `cue_cancelled`
     descriptive.
352. **D-9 — companion definitions (U22 default).** Beside the value, never in
     it: `administration_version`, `form_id`, `content_version`,
     `spontaneous_resumptions` (0–2), per channel `status`, `steps_done`,
     `held_at_ms`, `released_at_ms`, `cue_presented_at_ms`, `held_to_cue_ms`,
     `cue_deferred_ms`, `cue_displayed_ms`, `cue_ended_reason`,
     `focus_lost_during_display`, `distance_to_console_at_cue_px`,
     `held_visits`, `released_visits`, `refused_in_silent_window`,
     `spontaneous_attempt_index`, `release_to_spontaneous_wall_ms` /
     `_focused_ms`, `credited`, `credit_attempt_index`,
     `arrived_after_cue_without_credit`, `refused_after_cue_before_credit`,
     `steps_after_cue`, `aligns_after_cue`, `post_resumption_reentries`,
     `aligned`, `excluded_reason`, `work_focused_ms`, `cue_to_credit_wall_ms`
     / `_console_closed_ms`, `cue_to_closure_wall_ms` / `_console_closed_ms`;
     `difficulty_established: false`; `outdoor_prepared`; `nonresponse_kind`;
     `project_closure_reason`; `observations_share_one_project: true`;
     `cued_outcome_conditional_on_no_spontaneous_resumption: true`; flags.
353. **D-10 — the legacy antenna family (U22 default).** `m20AntennaModel.ts`
     and the legacy adapter functions of `exteriorWindows.ts`,
     `returnWindows.ts` and `returnSurfaceModels.ts` stay in the tree
     unchanged under their frozen identity (`proto_m20_antenna_restoration`,
     `proto_m20_antenna_*`, `m20_antenna_start` / `m20_antenna_resume`,
     `m20-antenna-v1`) and leave the route: `exteriorWindows.ts` loses only
     the four legacy M20 records named in the contract (the declare, the
     departure, the interruption and the review block) with their unused
     imports and one sentence in each describing comment, keeping exactly 8
     `setComprehension('passed')`; the yard scene keeps the mast's strings,
     actions and state object through the new adapter functions; the
     `exteriorResume` bookkeeping of the never-opened legacy window stays (a
     no-op); `closeM20ResumeAtReview` stays and is a no-op on the route; the
     v3 extractor never reads the legacy family; the registry's descriptive
     `opens` / window label for the console, the legacy e2e helpers
     (`resumeAntenna`, `openFeedConsole`) and the capture specs stay stale
     (U24 backlog).
354. **D-11 — layout, the notice band and the counts-only chip (U22
     default).** The wide frame of D-U17-2 used as is; 16 px design text on
     every element, 20 px title; the card text, the step board, the hold text,
     the channel rows and the closed record as neutral landings; the cell
     tiles and ALIGN in the right column (x 738, w 300), the step board in
     the left column; the bottom row at y 462 with HELP (x 12), LEAVE (x 184)
     and the primary control (x 778) — the M19 geometry; CLOSE HELP in the
     middle of the bottom row; the channel view's two buttons on one row; the
     station notice a two-line 16 px band in the Workshop HUD standing at
     the bottom of the 800 × 600 design space (its base at design y 584,
     inside the 16 px margin; clear of the shared feedback line at y 128,
     the mission card and the floating station prompt labels — the
     preparation mockup's y 184 collided with a prompt label in the real
     game, frame 31 of the first R1 run), scroll-fixed, hidden when no
     notice is active, never drawn while a surface is open (the scene's
     PAUSE ends it); the chip `MAST 04 FEED · 2 channels` / `A k/6 · B k/6`
     / `closed for the shift` (counts only; never
     `held` or `pass open`); the console prompt's fallback body (reached only
     outside the return shift or when a surface cannot open) reads the chip
     text. The layout gate of R7 / R8 measures the real game; the mockup
     figures of the preparation never stand in.
355. **D-12 — the clocks and the ≤ 250 ms release / due check (U22
     default).** One adapter clock (`Date.now()`) for every protocol time;
     the check runs from the Workshop scene's per-frame hook at most every
     250 ms while the scene runs and on RESUME; a due release is also written
     by any console opening, the sign-off, the review and a fault, always
     before any work on, view of, notice for or closure record of the
     channel; the recorded `released_at_ms` is `held_at_ms + 30000` whatever
     the write latency (`written_at_ms` and `write_latency_ms` descriptive);
     blocking states are the scene's own eligibility predicate (no prompt, no
     typewriter, no transition, no timed world action), the input lock, a
     paused scene (any surface or overlay — the per-frame hook is not
     reached) and the environment's pause causes (`focus_loss`, `hidden`);
     the work clock, the release-to-spontaneous clock and the cue-to-credit
     clock as §4 "Unit 22" (2); the notice's `ended_at_ms` is the actual end
     observed by the check or the hook that ended it (so B's spacing runs
     from the actual end, as item 3 requires).
356. **D-13 — the fault record and the held-back opening (U22 default;
     owner-visible).** (a) As the U21 precedent §5.340 (a): the kit's
     `technicalFailure` cannot name the channel in work, so the fault record
     goes through the window's `log` (`technical_failure` with `channel_id`)
     and the register through `markOpportunityInvalid`. (b) The console
     opens on every return-shift press, the closed records included: a
     held-back, signed-off, reviewed or faulted console shows its record
     line with LEAVE and writes nothing (contract §3.7, preview §4.9); the
     contract's "unless held back" is read as "never re-run" — the record is
     shown, the administration is not.
357. **Not changed by U22 (U24 backlog), stated for the owner.** The capture
     specs (`pilot_return_capture`, `world_v2_workshop_look` and the rest);
     the legacy e2e helpers `openFeedConsole` / `resumeAntenna` (unused by the
     unit's specs); `interactionRegistry.ts` (the console's descriptive
     `opens` / window label); the `returnEpisodeModel.ts` legacy rows for M20
     (`RETURN_LINKED_WINDOWS`, `returnEventTypes`); the stale U8-12 premise;
     the prohibited helper `expectNoMeasurementEvents`, whose `SYSTEM_DRIVEN`
     list does not name the U21 / U22 `closed_unopened` records (the item-11
     classification of the `pilot_route` "six-zone" failure).
358. **Open for the owner after the U22 review (14 October 2026; not
     resolved; the unit was not committed).** (1) **The release while the
     console is open — owner-reserved, blocking the commit.** The Workshop
     scene is paused while a surface is open, so no due release is written
     until the console closes or reopens; the channel view after the other
     channel's sixth step can show a due channel as `held` before its
     release is written; a participant who stays in the console (B's steps,
     a hold view, help) past A's due time cannot see or work A, and a notice
     already due is delivered as the console closes, so how fast B is copied
     partly decides whether A is spontaneous or cued (scientific F1,
     gameplay G-1). Contract §3.3 item 4 and §10 require the release
     whatever the context, console open included, before any view of the
     channel; preview §4.6 says the console shows `pass open` only when
     opened, and the hold view's text is fixed. Options for the owner (not
     decided): (i) write due releases before every console command and on a
     timer while the console is open, refreshing the channel view (and say
     whether a hold, step or help view should change); (ii) keep the
     as-built behaviour and record it as a limitation, naming its effect on
     the spontaneous / cued split; (iii) another rule. Also open: whether a
     notice that fell due while the console was open may be delivered the
     moment the participant leaves it. (2) Void rows still export the
     recounted `spontaneous_resumptions` and per-channel statuses beside the
     null value (scientific F2); null or label them? (3) The `registerV3.ts`
     M20 `summary` ("the difficult project") and the feature's `higher_means`
     ("difficult work") stay unchanged as contract §4 requires; change them
     for item 13's consistency? (scientific F3). (4) A fault after a final
     zero-denominator row (both spontaneous) turns `no_eligible_event` into
     `technical_failure` as the reference derivation does; keep? (scientific
     F4). (5) Wording (gameplay G-6, visual MIN-1): "after two steps on a
     channel, its pass ends" may suggest recurring holds; "Choose a channel,
     or LEAVE." / "A / B choose" also stand on views with no channel button
     (the channel view with none workable, the completed view); the
     preview's strings are used as approved. (6) Presentation (visual MAJ-1,
     MIN-2, MIN-3, MIN-4; gameplay G-2, G-4): the counts-only chip sits under
     the console's floating prompt label (base placement) and is never
     legible in a frame; success and failure feedback share one colour; the
     notice covers the annex doorway for up to 6 s; the cell tile shows
     index, value and hotkey alike; a double click on ALIGN replaces the
     differ count with the `repeat` line; an ESC inside the 400 ms settle is
     dropped while the LEAVE button is not settled. (7) Evidence gaps for the
     next round (visual MAJ-2 and frame review): frame 11 is the 1280 × 720
     capture of R2 (byte-identical to frame 22), not an 800 × 600 frame;
     frame 26 is taken inside Press B's arrival range, where the beacon's
     light is hidden; frames 19 and 19b are identical by design (the same
     record line); `pilot_return` test 1's M25 line (691) has no base
     comparison that reaches it.
359. **Research-owner amendment for U22 correction round 1 — APPROVED 14
     October 2026 (seven rulings on §5.358; an owner ruling, not an
     implementer default).** Opus 5.5 stays the sole writer, Sonnet 5.5
     verifies, separate read-only Opus 5.5 agents confirm; the two-round
     correction limit stands. (1) **Entry state.** The uncommitted U22
     implementation on `codex/u22-m20` at `f391d2e` is authorised work to
     preserve; the 22-path allowlist and the guard are inherited. (2)
     **Release timing and usable access (§5.358 (1)).** A channel becomes
     workable at `held_at_ms + 30000` whether or not an open surface pauses
     the Workshop scene; its notice stays due 30 000 ms after the release.
     Due releases are reconciled independently of the paused scene while
     the console is active, and before the affected commands, views,
     notices and closures, with the approved effective release time and
     honest event order (no earlier raw write time is fabricated); the
     focus / hidden-page rules and the catch-up before resumed interaction
     stay. Hold and channel views show current availability without
     switching the participant out of a step or help, overwriting a draft,
     stealing focus or restarting the settle on a refresh. A reversible
     CHANNELS [C] control on the working step and hold views (after the
     card) opens the existing channel chooser inside the console, keeping
     each channel's step, cells and relevant feedback, so a released A can
     be reached while working B without leaving; HELP stays exclusive and
     closing it restores the prior view with current availability and
     CHANNELS. Using CHANNELS writes no console-open, console-left,
     resumption, hold, release or occasion record; the work clock keeps its
     approved meaning. Preview §4.6 "only when opened" is superseded:
     availability can update inside an already-open console; the release
     stays silent outside it and the chip counts only. The notice rule is
     unchanged (an overdue notice may appear at the first permitted moment
     after leaving, with every safeguard; no grace period). An executed
     ALIGN after the release and before the notice is actually presented
     stays spontaneous, also while the console stays open past the notice's
     due time; a channel is never counted both spontaneous and cued. (3)
     **Invalid evidence and later faults (§5.358 (2), (4)).** A whole-row
     integrity failure keeps the primary null, makes
     `spontaneous_resumptions` null and exports no per-channel derived
     outcome as a valid result (any recount only as explicitly invalid
     diagnostic information); raw events stay. A legitimate runtime fault
     with otherwise valid evidence keeps the approved retention of earned
     evidence. A later runtime fault never changes an already-final valid
     result merely because it occurred: two valid spontaneous resumptions
     keep the null primary, denominator 0, spontaneous 2 and
     `no_eligible_event` / `resumed_before_cue`; the fault is recorded
     separately and the participant-facing fault closure stays. Integrity
     rules still apply to later malformed or contradictory evidence, and
     channels not final when the fault occurred keep the approved handling.
     (4) **Wording (§5.358 (3), (5)).** The contract's instruction to keep
     the `registerV3.ts` M20 `summary` and `higher_means` is overridden
     where it conflicts with the exploratory ruling: operational
     descriptions of resumptions after station notices, conditional on no
     earlier spontaneous resumption, the spontaneous outcome separate;
     `exploratory` and `difficulty_established: false` kept; no claim of
     established difficulty, validated persistence, physical departure and
     return, or a ranking across participants. The one-time hold reads
     "Each channel is held once, after step 2." with the help and the card
     consistent; a released hold view replaces the stale "held" description
     with the existing "pass open" wording and a usable continuation
     control; statuses and footers name only the actions available in that
     state (no channel choice when none can be chosen; no help or channel
     control on completed or closed views; a clear exit). Ordinary concise
     copy adjustments these rulings require are authorised inside the
     existing files; the final strings are recorded. (5) **Input
     (§5.358 (6)).** A double click on ALIGN executes once and the executed
     attempt's differ count stays visible (a refused repeat never erases
     it; refusal evidence stays separate and never becomes an attempt or a
     resumption). A fresh ESC and LEAVE behave alike as non-committing
     exits, also inside the settle — an explicit exception to the blanket
     settle rule — with the protection against carried or held keys and
     accidental immediate dismissal kept; the 400 ms settle stays for
     committing actions and real view transitions, with the neutral landing
     and same-view focus rules; CHANNELS is verified by keyboard and
     pointer. (6) **Presentation and screenshots (§5.358 (6), (7)).** The
     counts-only chip readable without overlap from the floating prompt;
     the notice clear of the annex doorway and usable station controls; the
     cell index, current value and hotkey told apart by labels or spacing;
     existing assets and the existing room only (no geometry change, art,
     shared-frame rewrite or allowlist expansion); fonts, viewports, margins
     and feedback clearance kept; colour differentiation of success and
     failure deferred to U24. Frame 11 retaken as a real 800 × 600
     silent-window capture, frame 26 from outside Press B's arrival range
     with the beacon visible, and every frame the corrections affect
     retaken; frames 19 / 19b identical by design is no defect. (7)
     **Verification.** Real browser coverage of the original defect and the
     correction (B's step across A's release; HELP across a release;
     CHANNELS to resume A without closing the console; passive updates on
     hold and channel views; the console open past the notice's due time —
     no world notice while blocked, a qualifying ALIGN before presentation
     spontaneous; leaving without resuming — the overdue notice under the
     existing safeguards; no duplicate release, notice, resumption or
     occasion, no lost draft, no stolen focus); Sonnet 5.5 runs the affected
     static checks, the whole U22 pure and route suites, `m03_m04_route`
     "both presses" and the neighbouring routes whose scene or surface
     lifecycle the correction touches; a bounded investigation of the
     `pilot_return` M25 failure; new editable material formatting-clean; the
     approved baseline and six-zone classifications unchanged; source frozen
     during verification with the checked digest; each relevant reviewer
     confirms. One local commit once these are met. Rulings D-U16-1 to
     D-U22-1 stay as recorded; this amendment supersedes conflicting
     contract and preview wording and expected outputs only for these
     changes.
360. **Expectations superseded by §5.359 (the frozen preparation package,
     the verbatim contract in the UNIT-LOG and the earlier §5 entries stay
     as historical records).** (a) Contract §3.3 item 4, the release's
     write points ("the scene tick, any console opening, the due check, or
     closure"): extended by every console command and a ≤ 250 ms
     reconciliation while the console is open (`check: 'console'`). (b)
     Preview §4.6 "The console shows `pass open` only when opened": an open
     console updates availability. (c) Preview §4.5, the hold view's fixed
     three lines: a released hold view shows the pass-open lines and
     CONTINUE. (d) Preview §4.3 card lines 4–5 and §4.7 help line 3 ("after
     two steps on a channel, its pass ends …"): the one-time hold sentence;
     help gains a CHANNELS line. (e) Preview §4.4 / §4.5 / §4.6 statuses and
     footers: state-dependent, naming only available actions; the completed
     channel view shows no status and the footer `ESC leave`. (f) Preview
     §4.4 cell tile `CELL k   v  [k]`: index, value and hotkey labelled. (g)
     Preview §4.11 / §4.12 controls and transitions: CHANNELS [C] on the
     step and hold views; the step board's last-ALIGN line. (h) §5.347 (D-4)
     "an ESC inside the settle is consumed" / "any other press dropped":
     a fresh ESC and LEAVE exit inside the settle. (i) §5.354 (D-11) the
     notice band at the bottom of the design space and the chip at the
     console's `y − 62`: both moved (§5.361). (j) §5.355 (D-12) the write
     points: as (a). (k) Contract §4, `registerV3.ts` M20 `summary` and
     feature texts "unchanged": reworded (§5.359 (4)). (l) The frozen
     derivation (`derivation/expected-results.mjs`): its rule "a fault ⇒
     `technical_failure` / `technical_only`" (line 237) no longer applies to
     a fault after a final result — the post-final case is new and was not
     among E1–E61; its void rows (`voided`, spontaneous count and channels
     null) are now matched by the extractor, which had exported a recount
     there (§5.358 (2)). The 72 cases of preview §7 keep their listed
     values; the pure spec adds the distinguishing cases (UNIT-LOG "U22
     correction round 1"). (m) Contract §12 B1 and §13: the new browser
     scenarios and the retaken frames 11 and 26.
361. **Implementer defaults of U22 correction round 1 (14 October 2026;
     inside §5.359; all provisional, alternatives the owner's).** (a) The
     open console's reconciliation: every console command (CONTINUE,
     CONTINUE CHANNEL, START B, CHANNELS, a cell, ALIGN, HELP, CLOSE HELP,
     the ESC that closes help, LEAVE / ESC) first writes any due release,
     and a page timer started with the console surface (`m20ConsoleTick`,
     every 250 ms, stopped when the console closes and at the scene's
     shutdown) writes it while the participant does nothing; the record
     keeps `released_at_ms = held_at_ms + 30000` and its real
     `written_at_ms` with the new descriptive `check: 'console'`; the timer
     re-renders the open view only when it wrote a release (the same view,
     the same element ids, so the focus stays; no new settle). A page
     timer, not the surface scene's clock, because the M06 and Core-chamber
     precedents use one and the surface's clock is not running before its
     scene starts. (b) CHANNELS [C] (`channels_<view>`, bottom row x 388,
     w 200) on the step and hold views only — not on the card, help, the
     channel view or a record; it is a non-committing view change refused
     inside the settle like any other control and writes no record; the
     work clock pauses as on every non-step view; CONTINUE on the same
     channel afterwards writes the existing `step_presented` with
     `resumed: true` and the draft. (c) The released hold view keeps its
     landing id (`held_<l>`), shows
     `Pass open. Channel X can be continued.` /
     `Channel X: 2 of 6 steps done, 4 remain.`, the subtitle
     `Channel X · pass open`, the status `Channel X can be continued.` and
     CONTINUE CHANNEL X (x 12 for A, x 440 for B, y 200, the channel view's
     positions), START B staying where it was; `m20sContinueChannel` also
     accepts the channel's own released hold view. (d) The step board's
     fifth line `Last ALIGN: n cells differed.` (the last executed,
     non-aligned attempt of the current step) keeps the differ count
     visible after a refused repeat and after CHANNELS; the feedback line
     still shows the refusal. (e) Footers: the step view names its cells
     (`1-3`, `1-4` or `1-5`), as in
     `1-5 change a cell · G align · C channels · H help · ESC leave`; the
     hold view
     `TAB move · ENTER or SPACE use · C channels · H help · ESC leave`;
     the channel view the keys of its buttons (`A / B choose`,
     `A choose`, `B choose`) or none (`TAB move · H help · ESC leave`,
     empty status); the completed view `ESC leave`, empty status. (f) The
     cell tile `CELL k   value v   [k]`. (g) Help gains
     `CHANNELS shows both channels without leaving the console.` (eight
     lines); the card's lines 4–5 read
     `Each channel is held once, after step 2. Its uplink pass then ends`
     / `and the channel waits until its next pass opens.`, help line 3
     `Each channel is held once, after step 2. Its uplink pass ends then.`
     (h) ESC: help still closes first;
     otherwise a fresh ESC leaves exactly like LEAVE, also inside the
     settle; the surface drops repeated (held) key events, and the key that
     opens the console (E / Space) is not ESC. (i) The notice band in the
     top strip: left edge 16 design px right of the mission card
     (`missionCardLeft() + 360 + 16`, design x ≈ 249), top at design y 16,
     wrap width to the right margin (784); it stays above design y 80,
     where the room never draws a floating prompt, clear of the feedback
     line at y 128 and of the south wall. (j) The console chip at the
     console's `y − 22` (on its face, below the floating prompt anchored at
     `y − 56`). (k) A runtime fault after a final result (both channels
     resumed): the console still closes with the fault record (now with
     `result_final: true`), the window pauses, but the opportunity's
     validity record is not marked `technical_failure`; the extractor
     flags the fault (`fault_after_final_result: true`, the flag "a runtime
     fault after the result was final (recorded, not scored)"), keeps the
     row's disposition from the evidence and its `closure_reason`
     `technical_failure`. (l) A void row's `channels` lists only
     `channel_id`, `occasion_id`, `channel_index`, `status: null`,
     `outcome_available: false`; `invalid_diagnostic` carries
     `valid: false`, a note, `spontaneous_recount`, `channels_recount` and
     (correction round 2, the scientific confirmation's N2)
     `fault_after_final_result_recount`, the row's own
     `fault_after_final_result` being null on a void row (the full
     per-channel recount, as the derivation's `voided` rows omit). (m) The
     registerV3 M20 texts as recorded in the UNIT-LOG "U22 correction round
     1"; the `operational_label` "Antenna restoration (Yard / Workshop)" is
     outside §5.359 (4) and unchanged (U24 backlog, with §5.357).
