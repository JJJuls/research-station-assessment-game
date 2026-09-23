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

| Item | Direction               | Occ. | Primary feature                                                                                                                                                                                                                                                                                                                | Companions                                                                                                                                                                                                                                    | Label                   | As-built                                                                                                                                            |
| ---- | ----------------------- | ---- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| M01  | Redesign                | 2    | `m01_planned_jobs`: jobs placed before the first work action / 6; 0–6; more advance organisation                                                                                                                                                                                                                               | plan structure, job correctness per occasion                                                                                                                                                                                                  | behavioural counterpart | v3 route: `proto_m01_batch_o1` (Concourse, ep 1) + `proto_m01_batch_o2` (Records Workshop, ep 5) — implemented (U5)                                 |
| M02  | Revise and extend       | 1    | `m02_correct_first_retrievals`: correct first retrievals / 6; 0–6; better traceability                                                                                                                                                                                                                                         | filing choices, retrieval latency                                                                                                                                                                                                             | behavioural counterpart | v2-ledger route (two gated probes) — planned                                                                                                        |
| M03  | Retain and verify       | 2    | `m03_tools_restored`: restored / 6; 0–3 per occasion; more tidying                                                                                                                                                                                                                                                             | object states                                                                                                                                                                                                                                 | retained core           | v2-ledger route (five residuals per occasion) — planned                                                                                             |
| M04  | Extend occasions        | 2    | `m04_undisposed_pieces`: undisposed incl. carried / 6; more own mess                                                                                                                                                                                                                                                           | per-job values                                                                                                                                                                                                                                | behavioural counterpart | v2-ledger route (one job) — planned                                                                                                                 |
| M05  | Redesign                | 2    | `m05_start_latency`: per accepted occasion the focused ms from eligibility to the first work action + status started / deferred / exited / cap / interrupted; never a starter-only mean                                                                                                                                        | `m05_acceptance_exposure` (offer, answer, eligibility wait, exposure by cause, control views, work, late start)                                                                                                                               | behavioural counterpart | v3 route: `proto_m05_start_o1` (Concourse, ep 1) + `proto_m05_start_o2` (Recovery Yard, ep 4) — implemented (U6)                                    |
| M06  | Redesign                | 1    | `m06_unique_correct_orders`: distinct orders whose matching dispatch fell inside the one 60 s focused budget; 0–12; more useful output in equal allocated time                                                                                                                                                                 | `m06_work_period_detail` (first-pass accuracy, rework, skips, invalid dispatches, actual stop time, stop kind, per-order records)                                                                                                             | behavioural counterpart | v3 route: `proto_m06_work_period` (Records Workshop, ep 2) — implemented (U7)                                                                       |
| M07  | Retain with controls    | 1    | `m07_stages_completed`: stages / 6 at the closing milestone; more routine completion                                                                                                                                                                                                                                           | returns                                                                                                                                                                                                                                       | retained core           | v2-ledger route (P7 valid-zero defect) — planned                                                                                                    |
| M08  | Add controlled task     | 1    | `m08_work_choice_fraction`: Work / valid choices; 0–6; more work chosen (exploratory)                                                                                                                                                                                                                                          | fractions by benefit level, practice performance                                                                                                                                                                                              | exploratory             | v3 route: `proto_m08_effort_choice`, Recovery Yard, ep 4 — implemented and reviewed (U2 + U2-R)                                                     |
| M09  | Extend checkpoints      | 3    | `m09_due_checks_fulfilled`: fulfilled / eligible due checks; 0–3; more follow-through                                                                                                                                                                                                                                          | acceptance, reminders, access                                                                                                                                                                                                                 | behavioural counterpart | v2-ledger route (two checks) — planned                                                                                                              |
| M10  | Add second obligation   | 2    | `m10_obligations_fulfilled`: fulfilled or delegated / accepted accessible; 0–2; more reliability                                                                                                                                                                                                                               | per-obligation outcomes                                                                                                                                                                                                                       | behavioural counterpart | v2-ledger route (one delivery) — planned                                                                                                            |
| M11  | Add task                | 2    | `m11_unresolved_custodies`: unresolved / accepted accessible; 0–2; more unresolved stewardship                                                                                                                                                                                                                                 | understanding, handover records                                                                                                                                                                                                               | exploratory             | v3 route: `proto_m11_custody_lab` (Laboratory, ep 3) + `proto_m11_custody_yard` (Recovery Yard, ep 4) — implemented (U3)                            |
| M12  | Redesign interaction    | 2    | `m12_fields_verified`: fields explicitly judged (matches / differs) before release, summed over the released products / 6; 0–6; more checking coverage (a released product with nothing judged is an observed 0; a packet opened but never released is missing)                                                                | `m12_detection_and_correction` (per product: judgement accuracy, faulty field detected = judged "differs", correction attempted, correction successful = entered value equals the reference, unnecessary corrections, per-field records)      | behavioural counterpart | v3 route: `proto_m12_check_o1` (Concourse, ep 1), `proto_m12_check_o2` (Records Workshop, ep 2) — implemented (U8)                                  |
| M13  | Extend cases            | 3    | `m13_first_solutions`: networks solved on first submission / 3                                                                                                                                                                                                                                                                 | constraints, help                                                                                                                                                                                                                             | performance counterpart | v2-ledger route (one network) — planned                                                                                                             |
| M14  | Extend packets          | 2    | `m14_correct_first_integrations`: correct first decisions / 6                                                                                                                                                                                                                                                                  | by packet, omissions, source use                                                                                                                                                                                                              | performance counterpart | v2-ledger route (one unkeyed packet) — planned                                                                                                      |
| M15  | Extend systems          | 2    | `m15_correct_first_predictions`: correct first predictions / 4                                                                                                                                                                                                                                                                 | model correctness, exploration                                                                                                                                                                                                                | performance counterpart | v2-ledger route (one system, one intervention) — planned                                                                                            |
| M16  | Standardise             | 1    | `m16_correct_first_applications`: correct first applications / 6                                                                                                                                                                                                                                                               | form, example versions                                                                                                                                                                                                                        | performance counterpart | v2-ledger route (familiarisation with feedback) — planned                                                                                           |
| M17  | Replace trial structure | 1    | `m17_criterion_trial`: {criterion_trial 3–12, attained} — the first learning trial ending a run of three consecutive correct first responses; reported whenever reached within the administered trials; (12, false, censored) after twelve without attainment; early exit without attainment = incomplete                      | `m17_sequence_baseline_transfer` (baseline 2 / learning 12 / transfer 2 first-response sequences, feedback exposures, reference sequences shown, help, demonstration reviews, per-trial records)                                              | performance counterpart | v3 route: `proto_m17_criterion` (Diagnostics Laboratory, ep 3) — implemented (U9); **criterion values not to be read until §5.87–5.88 are decided** |
| M18  | Extend diagnosis        | 3    | `m18_correct_first_diagnoses`: / 3                                                                                                                                                                                                                                                                                             | `m18_correct_consequence_predictions`: / 3                                                                                                                                                                                                    | performance counterpart | v2-ledger route (one case, no prediction) — planned                                                                                                 |
| M19  | Add second challenge    | 2    | `m19_continuations`: further attempt / eligible difficulty encounters; 0–2                                                                                                                                                                                                                                                     | failed attempts, success, time                                                                                                                                                                                                                | behavioural counterpart | v2-ledger route (one coupling) — planned                                                                                                            |
| M20  | Extend returns          | 2    | `m20_cued_resumptions`: resumed / eligible unfinished components; 0–2                                                                                                                                                                                                                                                          | spontaneous returns, progress, cue exposure                                                                                                                                                                                                   | behavioural counterpart | v2-ledger route (one uncued resume) — planned                                                                                                       |
| M21  | Replace revisit score   | 2    | `m21_restudy_revisions`: cases with a relevant restudy (a section bearing on a fault known at the time) AND a revised application / cases whose first application was incorrect and were resolved by the participant (accepted or set aside — a review-closed case keeps its observed 1); 0–2; two first-time successes → null | per-case strategy (first_correct / restudy_and_revise / revise_without_relevant_restudy / restudy_then_exit / exit / unresolved), applications, faults, restudy sections, comprehension context (sections used, reference depth, mode, plate) | partial                 | v3 route: `proto_m21_case_o1` / `o2` (Records Workshop, ep 5) — implemented (U10)                                                                   |
| M22  | Hybrid                  | 2    | `m22_revisions_begun`: / presented requirements (2 planned)                                                                                                                                                                                                                                                                    | `m22_discouragement_ratings`: two 1–5 ratings with recall delay                                                                                                                                                                               | hybrid                  | v2-ledger route (one report, no rating) — planned                                                                                                   |
| M23  | Add second plot         | 2    | `m23_continuations_after_failure`: further search / plots with a failed dig; 0–2                                                                                                                                                                                                                                               | attempts, strategy, success                                                                                                                                                                                                                   | behavioural counterpart | v2-ledger route (one plot) — planned                                                                                                                |
| M24  | Repair boundary         | 1    | `m24_postknowledge_casts` (first included)                                                                                                                                                                                                                                                                                     | `m24_postknowledge_casts_minus_first` (sensitivity); `m24_unqualified_casts` (pre-knowledge / failed-check behaviour, switch, exit, cap)                                                                                                      | behavioural counterpart | v2-ledger route (acknowledgement, no test) — planned                                                                                                |
| M25  | Hybrid                  | 1    | `m25_optional_repeats`                                                                                                                                                                                                                                                                                                         | `m25_normality_belief` 1–5                                                                                                                                                                                                                    | hybrid                  | v3 route: `proto_m25_calibration_loops` (Recovery Yard, ep 4) + `proto_m25_normality_belief` (Concourse, ep 5) — implemented (U4)                   |
| M26  | Repair boundary         | 1    | `m26_postknowledge_retries` (first included)                                                                                                                                                                                                                                                                                   | `m26_postknowledge_retries_minus_first` (sensitivity); `m26_unqualified_retries` (pre-knowledge / failed-check behaviour, switch, exit, cap)                                                                                                  | behavioural counterpart | v2-ledger route (acknowledgement, no test) — planned                                                                                                |

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
