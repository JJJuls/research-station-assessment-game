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
| M14  | Extend packets          | 2    | `m14_correct_first_integrations`: correct first decisions / 6                                                                                                                                                                                                                                                                  | by packet, omissions, source use                                                                                                                                                                                                               | performance counterpart | v2-ledger route (one unkeyed packet) — planned                                                                                                                                                                                                                   |
| M15  | Extend systems          | 2    | `m15_correct_first_predictions`: correct first predictions / 4                                                                                                                                                                                                                                                                 | model correctness, exploration                                                                                                                                                                                                                 | performance counterpart | v2-ledger route (one system, one intervention) — planned                                                                                                                                                                                                         |
| M16  | Standardise             | 1    | `m16_correct_first_applications`: correct first applications / 6                                                                                                                                                                                                                                                               | form, example versions                                                                                                                                                                                                                         | performance counterpart | v2-ledger route (familiarisation with feedback) — planned                                                                                                                                                                                                        |
| M17  | Replace trial structure | 1    | `m17_criterion_trial`: {criterion_trial 3–12, attained} — the first learning trial ending a run of three consecutive correct first responses; reported whenever reached within the administered trials; (12, false, censored) after twelve without attainment; early exit without attainment = incomplete                      | `m17_sequence_baseline_transfer` (baseline 2 / learning 12 / transfer 2 first-response sequences, feedback exposures, reference sequences shown, help, demonstration reviews, per-trial records)                                               | performance counterpart | v3 route: `proto_m17_criterion` (Diagnostics Laboratory, ep 3) — implemented (U9); **criterion values not to be read until §5.87–5.88 are decided**                                                                                                              |
| M18  | Extend diagnosis        | 3    | `m18_correct_first_diagnoses`: / 3                                                                                                                                                                                                                                                                                             | `m18_correct_consequence_predictions`: / 3                                                                                                                                                                                                     | performance counterpart | v2-ledger route (one case, no prediction) — planned                                                                                                                                                                                                              |
| M19  | Add second challenge    | 2    | `m19_continuations`: further attempt / eligible difficulty encounters; 0–2                                                                                                                                                                                                                                                     | failed attempts, success, time                                                                                                                                                                                                                 | behavioural counterpart | v2-ledger route (one coupling) — planned                                                                                                                                                                                                                         |
| M20  | Extend returns          | 2    | `m20_cued_resumptions`: resumed / eligible unfinished components; 0–2                                                                                                                                                                                                                                                          | spontaneous returns, progress, cue exposure                                                                                                                                                                                                    | behavioural counterpart | v2-ledger route (one uncued resume) — planned                                                                                                                                                                                                                    |
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
fractured mount seats nothing." — and (ii) the help sheet of that
phase. Both are written without the words "connected", "sealed",
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
  solve."; "Practice is optional. …"; PRACTISE NETWORK N (K test runs
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
participant route, `e2e/m13_networks_route.spec.ts` — 6 tests passed,
eighteen frames: R1 keyboard in the bench, form A (sealed layout,
unsealed layout, CANNOT SOLVE → 1 / 3 observed; a too-early and a held
ENTER refused; results; practice; leave and reopen; FINISH), R2 pointer
in the bench, form B (3 / 3; a double click records once; left mid
network 2 and reopened on the same board), R3 (one answer, then the
review: incomplete over 1, censored, `closed_at_review`; the bench a
record afterwards), R4 (`not_presented`, then STOP without an answer:
null `voluntary_stop`), R5 (reload: the earlier load byte-identical,
`interrupted`; the bench reached again and held back). No scenario was
blocked and none skipped. Walking and the station prompt are driver
keyboard navigation in every scenario, R2 included. Regression:
`ip_pipe_suite` 19 passed, `ip_lab_flow` 4, the `pilot_lab` M18
independence test and the `pilot_episodes_1_2` episode-2 test passed.
Exceptions, all reproduced with the same assertion on an untouched
export of `283cd89` and none on an M13 step: two tests of
`final_scientific_gates` (M08 / M11 schedule; exterior comprehension
count) and the runtime test of `ip_boundaries` (the lab no longer
declares `proto_m17_syntax`); the lines of that `ip_boundaries` test
after its failing assertion — among them the never-opened M13
opportunity record — were not reached in that run, and that record is
evidenced by R4 and by the `pilot_lab` test instead. Passing tests
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
| Return shift: Station Feed Console (`feed_console`)    | the restoration resumed; an indoor stage done                                                             | `returnProbeSnapshot().m20`: `returned`, `useful_resume_actions`                                                                                              | standby; an unavailable history; the console inspected                                                                                                                    | no — no job can be open there on the ordinary route          |
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
     the fixed strings of the contract are unchanged; the rule line and
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
     (b) **For the owner** — the rule line never says that pieces may
     stay on the bench unused; some participants may believe all nine
     must be seated. The v2 text did not say it either; adding it is a
     wording decision with a possible hint value. (c) Practice acts at
     the bench (pieces seated, test runs) change the workshop's
     recorded-work signature exactly as the v2 flow tests did; that
     signature is what M04's first-departure rule reads (§4 "Unit
     14-D" (6)), so working at the bench in practice counts as work at
     another station, as any bench act always has. The fixed practice
     notice says practice changes "nothing else on the shift": true
     of everything the participant can see or is paid for, while a
     practice act can still be the M04 first-departure signal — a
     measurement consequence, **for the owner** to weigh. (d) A refused
     too-early press (the confirmation's 400 ms, the acknowledgement's
     400 ms) gives no on-screen or audible sign; the participant
     presses again. It is the same for every answer. (e) Behaviours
     with pure-test evidence only, no browser run: a fault in the
     first-response phase and during practice; leaving during a
     pointer drag or with a commitment dialog open; a pointer click
     inside the confirmation's first 400 ms; help opened in the results
     and practice phase; the legacy laboratory's gate while the
     first-response phase is open; the acknowledgement's 400 ms; and
     the two overlay corrections of round 1 (help and STOP not opening
     during a drag, and returning a held piece first), which were
     confirmed by review of the source, not by a test. The keyboard side of the fresh-press
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
