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

| Item | Direction               | Occ. | Primary feature                                                                                                                                                                                                      | Companions                                                                                                                                   | Label                   | As-built                                                                                                                          |
| ---- | ----------------------- | ---- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| M01  | Redesign                | 2    | `m01_planned_jobs`: jobs placed before the first work action / 6; 0–6; more advance organisation                                                                                                                     | plan structure, job correctness per occasion                                                                                                 | behavioural counterpart | v2-ledger route (one full-board occasion) — planned                                                                               |
| M02  | Revise and extend       | 1    | `m02_correct_first_retrievals`: correct first retrievals / 6; 0–6; better traceability                                                                                                                               | filing choices, retrieval latency                                                                                                            | behavioural counterpart | v2-ledger route (two gated probes) — planned                                                                                      |
| M03  | Retain and verify       | 2    | `m03_tools_restored`: restored / 6; 0–3 per occasion; more tidying                                                                                                                                                   | object states                                                                                                                                | retained core           | v2-ledger route (five residuals per occasion) — planned                                                                           |
| M04  | Extend occasions        | 2    | `m04_undisposed_pieces`: undisposed incl. carried / 6; more own mess                                                                                                                                                 | per-job values                                                                                                                               | behavioural counterpart | v2-ledger route (one job) — planned                                                                                               |
| M05  | Redesign                | 2    | `m05_start_latency`: focused seconds to first work action + start/deferral/exit/cap per accepted occasion                                                                                                            | acceptance, exposure                                                                                                                         | behavioural counterpart | v2-ledger route (silent faults) — planned                                                                                         |
| M06  | Redesign                | 1    | `m06_unique_correct_orders`: unique correct orders in 60 s; 0–12; more useful output                                                                                                                                 | first-pass accuracy, rework, actual stop time                                                                                                | behavioural counterpart | v2-ledger route (four orders, no budget) — planned                                                                                |
| M07  | Retain with controls    | 1    | `m07_stages_completed`: stages / 6 at the closing milestone; more routine completion                                                                                                                                 | returns                                                                                                                                      | retained core           | v2-ledger route (P7 valid-zero defect) — planned                                                                                  |
| M08  | Add controlled task     | 1    | `m08_work_choice_fraction`: Work / valid choices; 0–6; more work chosen (exploratory)                                                                                                                                | fractions by benefit level, practice performance                                                                                             | exploratory             | v3 route: `proto_m08_effort_choice`, Recovery Yard, ep 4 — implemented and reviewed (U2 + U2-R)                                   |
| M09  | Extend checkpoints      | 3    | `m09_due_checks_fulfilled`: fulfilled / eligible due checks; 0–3; more follow-through                                                                                                                                | acceptance, reminders, access                                                                                                                | behavioural counterpart | v2-ledger route (two checks) — planned                                                                                            |
| M10  | Add second obligation   | 2    | `m10_obligations_fulfilled`: fulfilled or delegated / accepted accessible; 0–2; more reliability                                                                                                                     | per-obligation outcomes                                                                                                                      | behavioural counterpart | v2-ledger route (one delivery) — planned                                                                                          |
| M11  | Add task                | 2    | `m11_unresolved_custodies`: unresolved / accepted accessible; 0–2; more unresolved stewardship                                                                                                                       | understanding, handover records                                                                                                              | exploratory             | v3 route: `proto_m11_custody_lab` (Laboratory, ep 3) + `proto_m11_custody_yard` (Recovery Yard, ep 4) — implemented (U3)          |
| M12  | Redesign interaction    | 2    | `m12_fields_verified`: judged fields before release / 6; 0–6; more checking coverage                                                                                                                                 | detection accuracy, successful corrections                                                                                                   | behavioural counterpart | v2-ledger route (reference shown, auto-copy) — planned                                                                            |
| M13  | Extend cases            | 3    | `m13_first_solutions`: networks solved on first submission / 3                                                                                                                                                       | constraints, help                                                                                                                            | performance counterpart | v2-ledger route (one network) — planned                                                                                           |
| M14  | Extend packets          | 2    | `m14_correct_first_integrations`: correct first decisions / 6                                                                                                                                                        | by packet, omissions, source use                                                                                                             | performance counterpart | v2-ledger route (one unkeyed packet) — planned                                                                                    |
| M15  | Extend systems          | 2    | `m15_correct_first_predictions`: correct first predictions / 4                                                                                                                                                       | model correctness, exploration                                                                                                               | performance counterpart | v2-ledger route (one system, one intervention) — planned                                                                          |
| M16  | Standardise             | 1    | `m16_correct_first_applications`: correct first applications / 6                                                                                                                                                     | form, example versions                                                                                                                       | performance counterpart | v2-ledger route (familiarisation with feedback) — planned                                                                         |
| M17  | Replace trial structure | 1    | `m17_criterion_trial`: {criterion_trial 3–12, attained}; reported whenever reached within the administered trials; (12, false, censored) after twelve without attainment; early exit without attainment = incomplete | `m17_sequence_baseline_transfer` (full sequence, baseline, transfer)                                                                         | performance counterpart | v2-ledger route (2 trials, live preview) — planned                                                                                |
| M18  | Extend diagnosis        | 3    | `m18_correct_first_diagnoses`: / 3                                                                                                                                                                                   | `m18_correct_consequence_predictions`: / 3                                                                                                   | performance counterpart | v2-ledger route (one case, no prediction) — planned                                                                               |
| M19  | Add second challenge    | 2    | `m19_continuations`: further attempt / eligible difficulty encounters; 0–2                                                                                                                                           | failed attempts, success, time                                                                                                               | behavioural counterpart | v2-ledger route (one coupling) — planned                                                                                          |
| M20  | Extend returns          | 2    | `m20_cued_resumptions`: resumed / eligible unfinished components; 0–2                                                                                                                                                | spontaneous returns, progress, cue exposure                                                                                                  | behavioural counterpart | v2-ledger route (one uncued resume) — planned                                                                                     |
| M21  | Replace revisit score   | 2    | `m21_restudy_revisions`: restudy AND revised application / initially incorrect cases                                                                                                                                 | comprehension, other strategies                                                                                                              | partial                 | v2-ledger route (one case) — planned                                                                                              |
| M22  | Hybrid                  | 2    | `m22_revisions_begun`: / presented requirements (2 planned)                                                                                                                                                          | `m22_discouragement_ratings`: two 1–5 ratings with recall delay                                                                              | hybrid                  | v2-ledger route (one report, no rating) — planned                                                                                 |
| M23  | Add second plot         | 2    | `m23_continuations_after_failure`: further search / plots with a failed dig; 0–2                                                                                                                                     | attempts, strategy, success                                                                                                                  | behavioural counterpart | v2-ledger route (one plot) — planned                                                                                              |
| M24  | Repair boundary         | 1    | `m24_postknowledge_casts` (first included)                                                                                                                                                                           | `m24_postknowledge_casts_minus_first` (sensitivity); `m24_unqualified_casts` (pre-knowledge / failed-check behaviour, switch, exit, cap)     | behavioural counterpart | v2-ledger route (acknowledgement, no test) — planned                                                                              |
| M25  | Hybrid                  | 1    | `m25_optional_repeats`                                                                                                                                                                                               | `m25_normality_belief` 1–5                                                                                                                   | hybrid                  | v3 route: `proto_m25_calibration_loops` (Recovery Yard, ep 4) + `proto_m25_normality_belief` (Concourse, ep 5) — implemented (U4) |
| M26  | Repair boundary         | 1    | `m26_postknowledge_retries` (first included)                                                                                                                                                                         | `m26_postknowledge_retries_minus_first` (sensitivity); `m26_unqualified_retries` (pre-knowledge / failed-check behaviour, switch, exit, cap) | behavioural counterpart | v2-ledger route (acknowledgement, no test) — planned                                                                              |

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
