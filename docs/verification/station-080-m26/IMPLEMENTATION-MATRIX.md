# Station 080 — M01–M26 implementation matrix

Audit of the working tree at `2a557b720e2b23d56a9516fe7fb3b8d800d37fec`
(branch `fable-professional-world-rescue-v2`, worktree
`.claude/worktrees/fable-professional-world-rebuild`, clean, no remote branch
contains this HEAD — 283 local commits ahead of `origin/master`) against the
owner-approved execution specification
`FABLE-M01-M26-IMPLEMENTATION-INSTRUCTIONS.md` (22 September 2026), whose
item rows reproduce `Station_080_M01-M26_Final_Measurement_Decisions.docx`.

Status vocabulary for "exists now": **as specified** · **partial** ·
**contradicts** (current behaviour is the opposite of the spec) · **absent**.
"Measure" names the primary derived feature the extractor must reproduce from
raw events; every feature is a versioned prototype output, never a validated
score. "Verification" is the minimum evidence before the row can be marked
implemented in the register.

Global findings that apply to every row:

- **No derived output exists for any item.** `src/pilot/evidenceLedger.ts` is
  a frozen registry, `coverageSchedule.ts` derives route completeness only,
  `ScoringManager`/`SummaryScope` never see a `proto_*` event. Every
  "Measure" column below needs the new read-only extractor layer.
- **No focused-time clock exists.** `DataQualityTracker` counts blur/hidden
  seconds as a session covariate only; no window pauses on focus loss and no
  15/30/60-second budget exists anywhere.
- **No "Cannot solve / Don't know / Cannot locate" affordance exists** in any
  cognitive window (M02, M13–M18); the only exits are STOP (coded missing) or
  a forced guess.
- **Reload** loses every window and the validity register (only raw events
  persist via `EventStore`); the export already partitions page loads.
- **Held-key auto-repeat** is already rejected on every relevant path.
- The v2 ledger (`docs/verification/evidence-led-pilot-v2/`) stays as the
  legacy record; the v3 register in this directory supersedes it for the
  route, and every `proto_*` identifier remains provisional.

## Item matrix

| Item | Exists now (audit, file:line)                                                                                                                                                                                                                                                                                                                                                                         | Must change                                                                                                                                                                                         | Measure (primary feature; companions)                                                                                                                            | Verification                                                                                                                  |
| ---- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| M01  | **as specified (U5)** — was contradicting at the audit base (one six-card board, commit refused unless full, work refused unless committed, 1 occasion; the v2 `proto_m01_board_*` family is retired)                                                                                                                                                                                                 | Two unrelated three-job batches (Concourse ep1, Workshop return ep5); direct work or optional sequencing; snapshot placements before the first work action; partial plans valid                     | `m01_planned_jobs`: planned jobs / 6 across two occasions (0–6, higher = more advance organisation); per occasion plan structure, job correctness                | pure: two occasions, direct path = 0/0 valid; browser: both boards reachable, direct work without board                       |
| M02  | **as specified (U13)** — was contradicting at the audit base (2 probes; a wrong pick did not advance; immediate corrective feedback; no Cannot-locate; no retrieval timing; the v2 `proto_m02_case_*` family is retired); during the requests the participant's layout and own tray labels stay visible and the system-supplied case codes and contents do not (owner ruling of 28 September, §5.137) | Six requests in balanced order; advance after each first answer or explicit Cannot locate; feedback deferred to the end; retrieval latency per request                                              | `m02_correct_first_retrievals`: correct first retrievals / 6 (higher = better traceability); `m02_retrieval_latency` and `m02_filing_layout` kept separately     | pure: wrong first answer advances, Cannot locate = incorrect, interrupted = missing; browser: six requests, deferred feedback |
| M03  | **as specified (U14; corrected U14-C — technical correction verified, not scientifically validated)** — was partial at the audit base (two occasions with five residuals each, no movement teaching, only a seed failure invalidated; the v2 `proto_m03_*` family is retired from the route and stays with the Inventory Lab workstation)                                                             | Three tools per occasion; movement practice before occasion A; reachability check per object → technical-invalid; first-departure snapshot per occasion                                             | `m03_tools_restored`: restored / 6 (0–3 per occasion, higher = more tidying); object states                                                                      | pure: 3 objects/occasion, unreachable object → invalid; browser: both presses, untouched/partial/full                         |
| M04  | **as specified (U14; corrected U14-C, U14-D and U14-D2, administration `m04-cutting-v4` — interaction correction with the owner-approved cutting annex: two mirrored three-piece clusters, register §4 "Unit 14-D2"; room access corrected U14-D3 without any M04 change, §4 "Unit 14-D3", the nearest-station statement withdrawn, §5.234 resolved by the closeout amendment of 1 October 2026; not scientifically validated)** — was partial at the audit base (one cutting job of six pieces, closure at the first room exit; the v2 `proto_m04_debris_*` family is retired)   | Two short cutting jobs (three pieces each); first departure from each job closes that occasion; later cleanup never rewrites                                                                        | `m04_undisposed_pieces`: undisposed / 6 incl. carried (higher = more own mess); two occasion values                                                              | pure: partial disposal + carried piece; browser: two jobs, return-later unchanged                                             |
| M05  | **as specified (U6)** — was contradicting at the audit base (silent unaccepted faults, clock from presentation, no deferral / exit control, no cap, no focus pausing; the v2 `proto_m05_initiation_*` family is retired)                                                                                                                                                                              | Two explicitly accepted jobs; clock from a visible usable start control with no competing required task; start / defer / exit / cap; 60 focused s; pause on focus loss                              | `m05_start_latency`: per occasion focused seconds to first work action + status (started/deferred/exited/cap); non-starts keep exposure                          | pure: cap never becomes a start, focus-loss excluded; browser: accept → start, accept → leave                                 |
| M06  | **as specified (U7)** — was partial at the audit base (2 practice + 4 scored lines, no budget, no stop, no rework, no technical-failure path; the v2 `proto_m06_dispatch_*` family is retired)                                                                                                                                                                                                        | 12 orders in one 60-second budget after practice; correction consumes the same budget; explicit early stop; denominator fixed at 60 s                                                               | `m06_unique_correct_orders`: unique correct orders within 60 s (0–12); first-pass accuracy, rework, actual stop time                                             | pure: correction counted once, early stop keeps 60 s; browser: budget end, stop                                               |
| M07  | **partial** — six stages, persistence and return exist; **P7 defect**: review opens and completes a never-visited bench as valid 0/6 (`m07Calibration.ts:265-284`)                                                                                                                                                                                                                                    | Non-engagement = absent/missing; close scoring at the common milestone (station-record closure); export returns and errors (no error concept → declared none)                                       | `m07_stages_completed`: stages / 6 at the closing milestone (higher = more routine completion); returns                                                          | pure: never-started → missing not 0; browser: resume after leaving                                                            |
| M08  | **as specified (U2 + U2-R at `0c6f2d46` + review closure)** — was absent at the audit base (secondary optional-job telemetry only, `secondaryTelemetry.ts:84-110`)                                                                                                                                                                                                                                    | New window: practice of the demanding task; six 15-second Work-or-Rest choices; work shows 1 or 3 output units (three each, counterbalanced); leisure 0; payment/route fixed                        | `m08_work_choice_fraction`: work choices / valid choices (0–6); fractions by benefit level; practice performance                                                 | pure: missing choice ≠ Rest, per-level fractions; browser: six epochs reachable                                               |
| M09  | **as specified (U15, administration `m09-watch-checks-v1`; the third check's window by research-owner decision D-U15-1 of 6 October 2026; not scientifically validated)** — was partial at the audit base (one accepted duty, two due checks, the return check open until the review; the v2 `proto_m09_watch_*` family is retired from the route)                                                    | Third due check at a distinct milestone (Concourse pass to the lab); same reminder wording; explicit access field                                                                                   | `m09_due_checks_fulfilled`: fulfilled / eligible due checks (0–3); acceptance, reminders, access                                                                 | pure: declined → no denominator, blocked gauge → invalid check; browser: three checks                                         |
| M10  | **as specified (U15, administration `m10-deliveries-v1`; not scientifically validated)** — was partial at the audit base (one delivery, one recipient, no delegation, accessibility implicit; the v2 `proto_m10_promise_*` family is retired from the route)                                                                                                                                          | Second delivery (distinct object, distinct recipient); per-delivery acceptance; accountable delegation option; accessibility flag                                                                   | `m10_obligations_fulfilled`: fulfilled or delegated / accepted accessible (0–2); decline ≠ breach                                                                | pure: delegation counts, decline null; browser: both deliveries                                                               |
| M11  | **as specified (U3)** — was absent at the audit base (seal-rule acknowledgement only; `noteM11SampleTransfer` unreachable)                                                                                                                                                                                                                                                                            | Two borrowed-instrument occasions in different rooms; return / named handover / departure with unresolved custody; decline path; objects disjoint from M03/M04                                      | `m11_unresolved_custodies`: unresolved / accepted accessible (0–2, higher = less responsibility); understanding, handover records                                | pure: refusal null, blocked return invalid; browser: both loans                                                               |
| M12  | **as specified (U8)** — was contradicting at the audit base (six lines per product, reference always displayed, opening a line = detected, auto-copied correction; the v2 `proto_m12_qc_*` family is retired)                                                                                                                                                                                         | Three fields per product, one fault each; unchecked release allowed; explicit matches/differs per inspected field; participant-entered correction; references hidden until inspected                | `m12_fields_verified`: fields explicitly judged before release / 6; detection accuracy, successful corrections separate                                          | pure: view ≠ detected, wrong judgement still a check; browser: judgement + entry                                              |
| M13  | **as specified (U16, administration `m13-networks-v1`; research-owner ruling D-U16-1 of 7 October 2026; not scientifically validated)** — was partial at the audit base (one network, four submissions with feedback between them, no Cannot solve); three keyed networks, one immutable first response each before any feedback, results and capped practice after                                   | Three independently keyed networks with different structures + alternate form; first committed solution frozen per network; Cannot solve = incorrect; later learning allowed                        | `m13_first_solutions`: networks solved on first submission / 3; constraints, help separate                                                                       | pure: keyed solvability per network/form, first ≠ later; browser: three boards                                                |
| M14  | **as specified (U17, administration `m14-integration-v1`; research-owner decisions D-U17-1 of 7 October 2026 and D-U17-2 of 8 October 2026; not scientifically validated)** — contradicted at the audit base (one packet, no answer key, mutable assignments); two keyed packets, one immutable first response per decision before any feedback, results after the sixth                              | Two packets × (6 messages, 3 gauges, 3 keyed integration decisions); first response frozen; Cannot solve = incorrect                                                                                | `m14_correct_first_integrations`: correct first decisions / 6; by packet, omissions, source use                                                                  | pure: keys require ≥2 sources (independent evaluator); browser: two packets on the route                                      |
| M15  | **as specified (U18, administration `m15-systems-v1`; research-owner decision D-U18-1 of 10 October 2026; not scientifically validated)** — was partial at the audit base (one causal system, one intervention; the cipher shared the id and family); two independently authored boxes, one immutable wiring and two immutable first predictions per box before any feedback, results after the fourth; the cipher moved to its secondary id | Two independently authored systems; explore → commit model → two unseen predictions each; cipher moved to its own secondary id                                                                      | `m15_correct_first_predictions`: correct first predictions / 4; model correctness, exploration separate                                                          | pure: oracle from system definition; browser: two systems                                                                     |
| M16  | **as specified (U19, administration `m16-handling-v1`; research-owner decision D-U19-1 with amendment A1 of 11 October 2026; not scientifically validated)** — was partial at the audit base (familiarisation with correctness feedback before the applications; one frozen response; last instruction wins); two passive worked examples of identical structure for everyone, a confirmed boundary, six unseen vials in fixed order with one immutable first response each (a drawer or DON'T KNOW) before any feedback, results after the sixth; the legacy module untouched on the developer alias; closeout of 12 October 2026 (owner rulings, register §5.314: the five contextual strings and the vial question's soft wrap accepted, TAB / ENTER named on the card and example footer and in HELP, the entry snapshot's declared definition validated in full; the correction of the same day, §5.314 (6): `vials_planned` the number 6 and `assigned_vial_order` the approved order validated, the records' storage order free)| Two identical-structure teaching examples for everyone; six unseen applications with frozen first responses; feedback only after all six; Don't know = incorrect; distinct vocabulary from tutorial | `m16_correct_first_applications`: correct first applications / 6; form and example versions                                                                      | pure: first response immutable; browser: examples then six cases                                                              |
| M17  | **as specified (U9)** — was contradicting at the audit base (1 practice + 1 transfer trial, live preview on both; the v2 `proto_m17_syntax_*` family is retired); **criterion values not to be read until register §5.87–5.88 are decided** (live preview on learning trials; correct-response rule)                                                                                                  | 2 uncoached baseline + 12 feedback learning + 2 transfer trials; no preview on baseline/transfer; criterion = 3 consecutive correct learning trials; all 12 always run; early exit = incomplete     | `m17_criterion_trial` {criterion_trial, attained}: 3–12, censored at 12; full sequence, baseline, transfer                                                       | pure: early criterion, never attain, transfer-only; browser: 16 trials                                                        |
| M18  | **as specified (U20, administration `m18-cases-v1`; research-owner decision D-U20-1 of 12 October 2026; not scientifically validated)** — was partial at the audit base (one fault case per session, two forms, no consequence prediction, forced selection); three independently designed cases in fixed order, each with three on-request deterministic tests, one immutable first diagnosis (a part or CANNOT SOLVE) that closes the tests, then one immutable first planned-step answer (an option or CANNOT SOLVE) keyed to the actual case, before any feedback; results after the sixth; the legacy board untouched on the developer alias; the two rows with separate missingness and the slot-local defect scope of item 11 | Three independent cases with discriminating tests; first diagnosis + keyed consequence prediction before feedback; Cannot solve = incorrect                                                         | `m18_correct_first_diagnoses` / 3 (primary); `m18_correct_consequence_predictions` / 3 (companion)                                                               | pure: ambiguity check rejects; browser: three cases                                                                           |
| M19  | **as specified (U21, administration `m19-lines-v2`; research-owner decision D-U21-1 of 13 October 2026; not scientifically validated)** — was partial at the audit base (one coupling, three binds); two solvable lines at the coupling panel after a recorded check, each line's designed obstacle ONE immutable boundary; the v2 `proto_m19_valve_*` family retired from the route                  | Second distinct solvable challenge; per-challenge first difficulty boundary; teaching step with recorded comprehension                                                                              | `m19_continuations`: challenges with a further work attempt / eligible difficulty encounters (0–2)                                                               | pure: no difficulty → no denominator; browser: both challenges                                                                |
| M20  | **partial** — one project, one uncued resume (`returnEpisodeModel.ts:209-214`)                                                                                                                                                                                                                                                                                                                        | Two unfinished components each with a cued return milestone; cue exposure recorded; remaining work shown                                                                                            | `m20_cued_resumptions`: resumed / eligible unfinished components (0–2); spontaneous returns, progress                                                            | pure: resume ≠ new occasion; browser: two cues                                                                                |
| M21  | **as specified (U10)** — was partial at the audit base (one case, ~130-word manual, a free pre-fit bench test, an irreversible FIT, no restudy concept; the v2 `proto_m21_manual_*` family is retired)                                                                                                                                                                                                | Two independent cases, 240–320 words total; after an incorrect first application: truthful feedback, relevant restudy + revised application / other strategy / exit                                 | `m21_restudy_revisions`: cases with relevant restudy AND revised application / initially incorrect cases; two successes = no score                               | pure: first-time success → null; browser: wrong → restudy → revise                                                            |
| M22  | **as specified (U11)** — was partial at the audit base (one report, one criterion, no rating; the v2 `proto_m22_report_*` family is retired)                                                                                                                                                                                                                                                          | **partial** — one report, one criterion (`m22ReportModel.ts:90-91`); no rating anywhere                                                                                                             | Second report with its own genuine requirement; both after the other PDD tasks; after both decisions, one 1–5 discouragement rating per report with recall delay | `m22_revisions_begun` / 2; `m22_discouragement_ratings` (two ordinal, separate; missing = null)                               | pure: null ≠ midpoint; browser: two reports + ratings                      |
| M23  | **partial** — one plot (`m23ExcavationModel.ts:71-82`); no post-failed-dig branch                                                                                                                                                                                                                                                                                                                     | Second independently keyed plot; after each first genuine failed dig, explicit continue-or-stop; keep every attempt                                                                                 | `m23_continuations_after_failure`: plots with another search action / plots with a failed dig (0–2)                                                              | pure: first-dig success → null; browser: two plots                                                                            |
| M24  | **as specified (U12)** — was contradicting at the audit base (knowledge = acknowledgement click, no understanding test, no 30 s cap, unbounded timing window; the v2 `proto_m24_magnet_utility_*` family is retired)                                                                                                                                                                                  | **contradicts** — knowledge = acknowledgement click (`m24MagnetRigModel.ts:260-272`); no understanding test; no 30 s cap; timing window unbounded                                                   | Expected-outcome test (one explanation, one recheck; first-pass vs post-explanation stored); 30 focused s continuation window; standardised cycle                | `m24_postknowledge_casts` (raw incl. first) + `m24_postknowledge_casts_minus_first`; failed understanding → null              | pure: ack ≠ knowledge, sensitivity count; browser: pass → cast/switch/exit |
| M25  | **as specified (U4)** — was absent at the audit base (questionnaire notice only, `m25HandoffModel.ts:99-110`; the notice is retained as a v2 presentation record, no longer an M25 opportunity)                                                                                                                                                                                                       | Three required calibration loops then optional identical repeats ≤ 30 focused s (no futility gate); normality belief question 1–5 for every exposed participant after all M24–M26 behaviour closed  | `m25_optional_repeats` and `m25_normality_belief` (separate, never combined)                                                                                     | pure: required loops excluded, declined belief null; browser: loops, repeats, question                                        |
| M26  | **as specified (U12)** — was partial at the audit base (disconnect / B / first-probe exclusion existed; knowledge = acknowledgement click, no 30 s cap; the v2 `proto_m26_channel_*` family is retired; the first retry is now included with max(n − 1, 0) beside)                                                                                                                                    | **partial** — disconnect/B/first-probe exclusion exist; knowledge = acknowledgement click (`m26ChannelModel.ts:319-331`); no 30 s cap                                                               | Expected-outcome test as M24; 30 focused s retry window; raw count incl. first retry + max(count−1,0)                                                            | `m26_postknowledge_retries` + `m26_postknowledge_retries_minus_first`; switch/exit/cap                                        | pure: no understanding → null; browser: pass → retry/switch                |

## Shared-rule gaps (apply to several rows)

| Rule                                                                                                                    | State                                            | Foundation work                                                                    |
| ----------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------ | ---------------------------------------------------------------------------------- |
| Focused observation time (pause on focus loss, explicit pause, unusable controls)                                       | absent                                           | `FocusedClock` (pure) + focus monitor bridge; used by M05, M06, M08, M24, M25, M26 |
| 15/30/60-second budgets with `cap` closure                                                                              | absent                                           | clock cap + `closure_reason: cap`                                                  |
| Explicit Cannot solve / Don't know = incorrect first response                                                           | absent                                           | per-window affordance; extractor rule                                              |
| Immutable first responses; later learning never overwrites                                                              | partial (M15, M17, M18 one-shot; others mutable) | first-response records per trial in every cognitive window                         |
| Denominator of zero = no score                                                                                          | absent (no derivation)                           | extractor returns `null` with `disposition`, never 0                               |
| Distinguish not presented / declined / no eligible event / failed understanding / voluntary stop / technical / complete | partial (register codes)                         | `FeatureDisposition` enum on every feature row                                     |
| Versioned protocol, register, features, export                                                                          | absent                                           | `MEASUREMENT_PROTOCOL_VERSION`, register v3, `measurement_features` export block   |
| Compact vs full export agree on coverage                                                                                | partial                                          | features ride the augmenter like coverage                                          |
| Scoring-plan / event-schema write protection                                                                            | active (guard + settings deny)                   | versioned addendum in this directory; owner insertion text                         |

## Unit plan (one commit each; order from the specification)

1. **U1 foundation** — register v3 (machine-readable, no wording), protocol
   constants, focused clock, feature extractor framework (26 rows, null by
   default), export block, schedule derived from v3, docs (this matrix, the
   register, the scoring/event addendum, unit log).
2. **U2 M08**, **U3 M11**, **U4 M25** — the three new opportunities.
3. **U5 M01**, **U6 M05**, **U7 M06**, **U8 M12**, **U9 M17**, **U10 M21**,
   **U11 M22**, **U12 M24/M26** — interpretation repairs.
4. **U13 M02**, **U14 M03/M04**, **U15 M09/M10**, **U16 M13**, **U17 M14**,
   **U18 M15**, **U19 M16**, **U20 M18**, **U21 M19**, **U22 M20**,
   **U23 M23** — independent occasions and route integration.
5. **U24 end-to-end** — ordinary-play coverage spec, reproduction fixtures,
   export/recovery checks, reviewers, final register, report and handoff.

Each unit records its contract and handoff in `UNIT-LOG.md`.

**U14-C** (between U14 and U15) corrected U14 without changing either
item's design: stricter reproduction of the M03 / M04 records from the
raw events, the presentation of a press opened before the work orders,
one target decision for the prompt and the press, and local presentation
defects (register §4 "Unit 14-C", §5.195–§5.203). Additional tests: pure
adverse cases in `m03_restore` and `m04_cutting`; browser
`u14_correction`.

**U14-D** (after U13-C, before U15; review / fix round 1 under the
owner's rulings of 30 September 2026) corrects the ADMINISTRATION of M04
without changing its design, its feature or its formula: a station in
range always keeps the press; lifting a piece never names or outlines
the bin — the bin becomes the target once every interaction key and the
pointer were released and the avatar walked into its range, or by a
pointer press of its own, or at the release of a drag carried to it; a
carried piece can be set down again where it lay ("X — Set down",
shown beside the avatar while a piece is carried) and stays undisposed;
both cuts are answered by the same line and the cutter's status reads
"No cutting order is available."; a job's first departure is the first
accepted action at another station that changed that task's recorded
state, or the room left — never a panel shown or closed, a board or a
log that was read, or a refusal. **Not implemented: the owner's ruling
on the places** (pick-up positions outside the bin's reach, two
non-interleaved clusters) — blocked by the room's geometry, register
§5.219; the six places are those of the first pass and interleave. The
administration is `m04-cutting-v3`, told apart from `-v1` (U14) and
`-v2` (U14-C) and pooled with neither (register §4 "Unit 14-D",
§5.211–§5.221). M03 is unchanged. Tests: pure `m04_cutting`; browser
`u14_correction` and `m03_m04_route`. Outside the unit and unresolved:
the M04 extractor's handling of piece events without a recognised
object (register §5.216).

**U14-D2** (the final correction of U14-D, under the owner's contract of
30 September 2026) implements the ruling on the places that U14-D left
blocked, with the geometry the owner approved: the Records Workshop is
43 × 19 tiles; the Sample Cutter and the disposal bin stand in a
13 × 6-tile cutting annex south of the machine bay, entered through a
64 px doorway where the decorative tool bench stood; job 1's three
pieces lie west of the cutter and job 2's three at the mirrored places
east of it; one 64 px reach holds for the keyboard pick-up, the pointer
pick-up and the bin; every position a piece is lifted from lies more
than 76 px from the bin. Everything U14-D implemented is kept (the
deliberate transition to the bin, the neutral set-down, the lines, the
first departure by work actually begun or the room left). The design,
the feature, the formula, the event family and every field are
unchanged. The administration is `m04-cutting-v4`; `-v3` (the blocked
U14-D pass) was never committed or released. The four versions are told
apart by `entry_state_version` and pooled by no code (register §4
"Unit 14-D2", §5.222–§5.231). M03 is unchanged. Tests: pure
`m04_cutting` (the measured geometry); browser `u14_correction`,
`m03_m04_route`, `pilot_episodes_1_2` (episode 2),
`world_v2_workshop_look` and the full collision gate
(`collision_audit`, `spawn_clearance`, `world_v1_registry`). The
owner-authorised closeout pass of 1 October 2026 repaired the collision
audit driver for rooms wider than its old fixed push (register §5.230,
resolved), removed the two residual plate artefacts (§5.226), ratified
the episode-2 expectations (§5.227) and the two side-wall strips, and
ended in the unit's single commit `fix(m04): add matched cleanup
annex`. Still outside the unit and unresolved: the
M04 extractor (register §5.216). Not established by any of it: that the
two jobs are equivalent as measurements — they are repeated occasions
in a fixed order and on fixed sides (register §5.224).

**U14-D3** (workshop access correction, under the owner's revised ruling
of 1 October 2026; one room, one bounded unit) changes the Records
Workshop's access, not M04: the cutting-annex entrance is 128 px wide
(x 336–464, jambs `[320, 320, 16, 64]` / `[464, 320, 16, 64]`), the
Component Locker stands on the machine bay's north wall
(`[16.4, 3, 1.9, 2]`, anchor 555/148, approach 555/190), the Assembly
Bench one tile east (`[15.2, 9, 3.3, 2]`, anchor 566/305, approach
578/252), and the office's east wall is recomposed into an upper Work
Order Board alcove and a lower open Concourse doorway separated by the
one divider solid `[1280, 216, 64, 16]` (the two earlier east-wall solids
were withdrawn by the owner). The 43 × 19 room, the 13 × 6 annex, its
axis, every cutter / bin / scatter / piece coordinate, the 64 / 64 / 64 px
reaches, the first-departure rule, carried and lying pieces undisposed,
later cleanup immutable, `m04-cutting-v4`, the provisional /6, the
dependence warning, every M04 and M08 event, payload and scoring rule,
and the board / Seal Log / locker / bench task semantics are unchanged
(register §4 "Unit 14-D3", §5.232–§5.233). The plate is recomposed by
the same script from the same v2 source under Python 3.12.14 /
Pillow 12.3.0 (encoder-only hash change documented; two consecutive
generations identical; changed pixels only inside the four edit regions).
Tests: pure and browser `u14_d3_workshop_access`; `m04_cutting`,
`world_v1_registry`; the affected cases of `u14_correction`,
`pilot_records`, `concourse_interaction_lifecycle`; `collision_audit`
(workshop) and `world_v2_workshop_look`. Closeout amendment (1 October
2026): `e2e/pilotHelpers.ts` added to the allowlist and the shared
driver `workshopToConcourse` given a waypoint west of the divider
(§5.233, resolved); the bench kept at its approved place and the
straight-line nearest-anchor statement of U14-D2 withdrawn in favour of
the functional guarantees `m04_cutting` now tests (§5.234, resolved);
the M08 stowing opportunity's increased walking cost recorded with the
`game_version` stratification rule and no new marker (§5.235 (d)).
Inherited and outside the unit: `pilot_records` "supply bundles" fails
at the driver's M05 tolerance list (`proto_m05_start_*` not in
`SYSTEM_DRIVEN`), unrelated to U14-D3.

**U15** (M09 / M10; bounded unit under `U15-CONTRACT-v2.md`, amendments
A1 and A2 of 6 October 2026) lands the two approved rows. M09,
administration `m09-watch-checks-v1`: one voluntarily accepted watch
duty with three check windows on the Concourse gauge — at acceptance, on
the pass toward the laboratory, and on the return from the yard — each
closing at the first Concourse exit of its visit; the third window by
research-owner decision D-U15-1 of 6 October 2026 (it replaces the
earlier until-review deadline; register §4 "Unit 15", §5.239); one
identical due line in the station log; uncredited readings recorded
apart. M10, administration `m10-deliveries-v1`: two separately accepted
deliveries — the calibration key card (Vale → Kai, with the standardised
alarm and its recap) and the yard logbook (Noor → Vale) — each completed
by a direct handover or by an accountable delegation to its one
permitted delegate before the station record is closed; accessibility is
the recorded presence of the recipient or the delegate, never a menu or
a conversation opened by the participant; late acts are kept apart. New
candidate families `proto_m09_checks_` and `proto_m10_delivery_` (the v2
families are retired from the route); extractors `m09.ts` / `m10.ts`
recount from the act events with invariants conditional on the outcome
claimed. Feature ids, formulas, directions, ranges, denominator kinds
and clustering are unchanged; nothing canonical was created; both
features are candidate indicators and not scientifically validated
(three checks share one duty; the two deliveries are not equivalent
forms; R12 and R13 remain rival explanations). M05's two offers and
M11's two loans keep their stimuli, labels, positions and rules (the
recap precedes the lamp offer for key-card accepters; Kai's prepended v2
handover card is gone). Tests: pure `m09_watch`, `m10_deliveries`,
`pilot_return_models`; browser `m09_m10_route` (R1–R4) and the adapted
`pilot_return`, `pilot_episodes_1_2`, `m11_custody_route`; results and
every failure's base comparison in `UNIT-LOG.md` "U15". Implementer
defaults and the reviews' recorded points: register §5.236–§5.255.

**U15 closeout** (6 October 2026; one extractor-only correction under two
research-owner rulings, register §5.256 and §5.257): in `m10.ts` a
delivery's `person_present` record that does not follow its acceptance
and its opening is malformed evidence — a `technical_failure`, never
accessibility and never an observed zero — and a `delegated` event must
name the delivery's own object, as a direct handover must. No gameplay,
emitted payload, formula or administration version changed; the two
rules are an explicit clarification of the provisional extraction
contract (addendum §2 "U15 closeout", §3 `m10_obligations_fulfilled`).
Regression cases in pure `m10_deliveries` ("closeout rulings"); the
browser evidence of U15 is reused, not re-run. Formatting of this file:
the M09 and M10 rows are padded to the item table's inherited column
width again; the table as a whole keeps the KIND of defect it had before
U15 — one overlong M04 cell, so Prettier would re-pad every row — though
not the identical state: that cell is 59 characters longer since U15
(the wording its contract prescribed), so Prettier's target width is 570
instead of 511 — `UNIT-LOG.md` "U15 closeout".

**U15 event-order integrity** (6 October 2026; one extractor-only
correction under the research owner's ruling, register §5.259): `m09.ts`
and `m10.ts` read the order of an accepted duty's / delivery's events
from the logger's `sequence` numbers only when every such event carries
a usable number (an integer from 1) and no two share one; a missing or
malformed number is never read as zero, and an order that cannot be
verified makes the feature a `technical_failure`, never an observed
value. Gaps between numbers are normal. No gameplay, administration,
event, payload, formula or version changed. Regression cases in pure
`m09_watch` and `m10_deliveries` ("event-order integrity"); browser
evidence reused, not re-run; limits in register §5.259 (a)–(e) —
`UNIT-LOG.md` "U15 event-order integrity".

**U16** (M13; bounded unit under `U16-CONTRACT.md`, amendment A1 of
7 October 2026; research-owner ruling D-U16-1 of the same day — register
§5.260, an owner ruling and not an implementer default): the Conduit
Lattice Bench runs the three-network series `m13-networks-v1`. Three
keyed networks on the same 3×3 board and piece set (`n1` the v2
geometry with ports on opposite sides, `n2` adjacent sides, `n3` the
same side; form B the 90° rotation of form A; solver census 18 / 32 /
39 sealed layouts, smallest sealed run five pieces in each), fixed
order `n1 → n2 → n3`. Two phases: the first-response phase takes ONE
immutable first response per network — a confirmed layout or a
confirmed CANNOT SOLVE (an incorrect first response) — answered only by
one identical neutral acknowledgement, with no flow test and no
correctness information of any kind; structural results and optional
practice (at most three test runs per network, the same after every
kind of first response) exist only after the third answer and never
change a first response. Primary `m13_first_solutions` = first
responses the shared validator accepts / networks answered (planned 3),
recounted from the raw `first_response` events; complete and stable
from the third first response; constraints, help and practice in the
row's components. New provisional family `proto_m13_networks_`, one
opportunity `proto_m13_network_series` (addendum §2 "U16"); the v2
family `proto_m13_lattice_*` is retired from the route. Not claimed:
independent situations (three observations in one bench episode),
equal difficulty, equated or independent forms, validity. Tests: pure
`m13_networks` (keys against an independent reference checker and
census, the two phases, the extractor's values, missingness and
integrity cases, wording); browser `m13_networks_route` (R1–R6 on the
participant route, twenty frames (13–18 from the unit build; see
`UNIT-LOG.md` "U16 closeout")); re-expressed `ip_pipe_suite`,
`ip_lab_flow`, `ip_boundaries` and the M13 identities of `pilot_lab`,
`pilot_episodes_1_2`, `pilot_coverage`. As-built record, defaults and
limitations: register §4 "Unit 16", §5.260–§5.274; results, reviewers
and every failure's base comparison: `UNIT-LOG.md` "U16". Not updated
(U24 backlog): the capture specs, the `interactionRegistry` window
label, the legacy laboratory's presentation of the bench.
**U17** (M14; bounded unit under `U17-CONTRACT.md`, amendments A1 of
7 October 2026 and A2 of 8 October 2026; research-owner decisions
D-U17-1 and D-U17-2 — register §5.275–§5.276, owner rulings and not
implementer defaults): the Concourse incident desk runs the two-packet
series `m14-integration-v1`. Two keyed packets (`m14-p1-v1` "Night
packet: pump bay and power", `m14-p2-v1` "Morning packet: mast, yard and
uplink"), each of six messages, three gauges and three keyed integration
decisions whose keys need at least two sources, in fixed order P1 → P2
and D1 → D3, one form; nine source tiles per packet opened on demand,
staying open until closed, any number at once (openings recorded, never
read as reading); ONE immutable first response per decision — a confirmed
option or a confirmed CANNOT SOLVE (incorrect) — answered only by the
identical neutral acknowledgement; no correctness information before the
sixth first response; results afterwards, read-only. Rendered in the wide
frame of `WorkSurfaceScene` (D-U17-2; standard surfaces verified
unchanged) with typography T1. Primary `m14_correct_first_integrations`
= keyed first responses / decisions answered (planned 6), recounted from
the raw `first_response` events; by-packet results, omissions and source
openings in the row's components. New provisional family
`proto_m14_integration_`, one opportunity `proto_m14_integration_series`
(addendum §2 "U17"); the v2 family `proto_m14_desk_*` is retired from the
route. Not claimed: independent situations (six observations in one desk
episode), equated packets or decisions, validity. Tests: pure
`m14_integration` (keys against an independent transcription and
evaluator, leave-one-out, single-source and lure consistency checks —
every wrong option stays consistent with its documented partial
reading's known sources, the misreading itself not modelled (register
§5.289 (c)) —, the model, the extractor's values, missingness and
integrity cases, T1 and wording); browser
`m14_integration_route` (R1–R7 on the participant route, twenty-two
frames); re-expressed incident-desk step of `pilot_episodes_1_2`
("episode 1"); unchanged `m12_check_route` as the standard-surface
regression. As-built record, defaults and limitations: register §4
"Unit 17", §5.275–§5.288; results, reviewers and every failure's base
comparison: `UNIT-LOG.md` "U17". Not updated (U24 backlog): the capture
specs, the `interactionRegistry` window label `m14_desk_w1`,
`world_v1_interactions` / `world_v1_registry` evidence for the desk.
**U17 closeout** (M14; 9 October 2026; research-owner closeout ruling
and dispositions — register §5.290; as-built record §4 "Unit 17
closeout"; results `UNIT-LOG.md` "U17 closeout"): (a) a reload BEFORE
the desk was opened no longer reads `interrupted` once the absence of
an earlier opening is established — the reload guard writes the
provisional `prior_load_checked` record at Concourse entry of a later
load (the recovered history continuous and without an opening) and the
extractor then applies the never-opened dispositions (`not_presented`
before the briefing, `pending` / `no_eligible_event` with
`briefed_not_opened` after it); a found opening keeps the hold-back
(orientation-only and completed earlier loads included); a missing or
discontinuous history keeps `interrupted`; (b) CLOSE HELP on the
results re-arms the 400 ms settle so a doubled press never switches the
packet or writes `results_shown`; (c) the exposure fields and
`never_opened_reason` accepted; the lure tests retained as logical
consistency checks (no claim of reproduced misreadings or validity);
typography and non-Windows font checks carried into U24 / release
verification; the two baseline `final_scientific_gates` failures kept
as documented exceptions; (d) the M05 timing of the episode-1 route
diagnosed once, instrumented, with its conclusion recorded. Tests: pure
`m14_integration` (the reload-check predicate, the results-help settle,
the established / not-established extractor cases, the hold-back
contradiction, orientation-only and completed earlier loads); browser
`m14_integration_route` R8 (a genuine reload before the opening) and
R9 (doubled ENTER and double click after CLOSE HELP on the results), R5
re-run with the check record.
**U18** (M15; bounded unit under `U18-CONTRACT.md`, v1 of 9 October 2026,
final 10 October 2026; research-owner decision D-U18-1 of 10 October 2026 —
register §5.291, an owner ruling and not an implementer default): the
Diagnostics Laboratory evidence table runs the two-box series
`m15-systems-v1` in the wide frame of `WorkSurfaceScene` (D-U17-2, used as
is). Two independently authored relay boxes (`m15-s1-v1`: dials F, G
converging on hub P that drives Q and W; `m15-s2-v1`: the chain S → X → Y →
Z with T entering at Y), each with two dials, three units, four offered
wiring options and two keyed questions about situations the bench never
shows (one LOCK, one BOOST; three options each), in fixed order 1 → 2, one
form; per box exploration by single-dial TESTs (unlimited, deterministic,
the listing computed by the model's simulator and recorded as exploration,
never a response), ONE confirmed and immutable wiring — one of the four
options or CANNOT TELL — which closes the tests, then the two questions one
at a time with ONE immutable first response each — a confirmed option or a
confirmed CANNOT SOLVE (incorrect) — answered only by the identical neutral
acknowledgement; no correctness information before the fourth first
response; results for both boxes afterwards, read-only; the 400 ms
fresh-press rule on every confirmation and a 400 ms settle on every view
transition. Primary `m15_correct_first_predictions` = keyed first responses
/ questions answered (planned 4), recounted from the raw `first_response`
events; model correctness (the recorded wiring is the station wiring; CANNOT
TELL not correct), exploration (the tests run before the wiring), by-box
results, omissions and `consistent_with_recorded_wiring` in the row's
components, never in the value. New provisional family `proto_m15_systems_`,
one opportunity `proto_m15_systems_series` (addendum §2 "U18"); the v2 ids
`proto_m15_layered_cipher` / `proto_m15_cipher_*` / `m15_causal_w1` are
retired from the route; the legacy layered cipher moves to the secondary
identity `secondary_m15_layered_cipher` / `secondary_m15_cipher_*` (M15's
`secondary_ids`, read by no extractor); the v2 causal-model module stays in
the tree, unimported and unchanged. Not claimed: independent situations
(four observations in one bench episode, two boxes), equated boxes,
validity, or that correct answers require exploration — the disclosed cues
of preview r5 §7.5 (link-substitution neighbours and per-dial reach in box
1, reach and the single-verb option in box 2, the question-kind rule
matching every key) travel with the ruling (register §5.291) and are
reported, never asserted, by the pure spec. Tests: pure `m15_systems` (the
independent oracle — its own transcription and step simulator, the 79 461
signed acyclic wirings per box, the keys, the test dependence over all
wirings and among the four offered options, the reported cues, unseen-ness
on traces; the register and the cipher; the series model; the extractor's
values, missingness and integrity cases; wording); browser
`m15_systems_route` (R1–R8 on the participant route, twenty-four frames);
re-expressed M15 steps of `pilot_lab` and `pilot_signal_incident`;
re-expressed test U8-13 of `final_scientific_gates`; the cipher's secondary
identity in `ip_boundaries`, `ip_decoder` and `ip_lab_flow`. As-built
record, defaults and limitations: register §4 "Unit 18", §5.291–§5.300;
results, reviewers and every failure's base comparison: `UNIT-LOG.md` "U18".
Not updated (U24 backlog): the capture specs, the `interactionRegistry`
window label `m15_layered_cipher`, `signal_incident_models.spec.ts`'s
description of the unimported v2 module, `world_v1_*` evidence for the
bench. Carried forward unchanged and open: the M05 competing-task
observation of register §5.290 (e) (i) and the episode-1 M05 cap on the
scripted route — an M05 matter that U18 neither tests nor changes.
**U19** (M16; bounded unit under `U19-CONTRACT.md`, v1 of 11 October 2026,
final 11 October 2026 with amendment A1; research-owner decision D-U19-1 with
amendment A1 of 11 October 2026 — register §5.302, an owner ruling and not an
implementer default): the Diagnostics Laboratory protocol console runs the
handling-rule administration `m16-handling-v1` in the wide frame of
`WorkSurfaceScene` (D-U17-2, used as is). A first-opening card; the rule card
(`m16-rule-v1`: a 2 × 2 drawer grid by site column and depth row, STAR moving
the row, RING moving the column, both marks applied) visible on every example,
vial and acknowledgement view; two PASSIVE worked examples of identical
seven-line structure (`m16-examples-v1`, each with exactly one mark present,
both ending in DRAWER 3), the same for every participant, with free movement
between them (every view a logged interaction, never an answer); a confirmed
boundary (START THE SIX VIALS) that closes teaching irreversibly; then six
unseen vials (`m16-form-1`, fixed order, keys 1, 3, 4, 1, 4, 2) each presented
only after the previous vial's first response and each taking ONE confirmed
and immutable first response — a drawer (the confirmation repeating the
drafted drawer, selection (a)) or DON'T KNOW (incorrect) — answered only by
the identical neutral acknowledgement with HELP and LEAVE CONSOLE; no
correctness information before the sixth first response; then two read-only
results pages (HELP, FINISH, NEXT / BACK; FINISH and ESC close); the 400 ms
fresh-press rule on every confirmation (the boundary's included) and a 400 ms
settle on every view transition, so a double click on the opener RECORD DRAWER
records nothing and a fresh confirm records exactly one. Primary
`m16_correct_first_applications` = keyed first responses / vials answered
(planned 6), recounted from the raw `first_response` events; the form, rule
and example versions, teaching exposure (example views, back-navigations,
teaching time), per-vial records with `error_kind`, omissions apart from DON'T
KNOW and help in the row's components, never in the value. New provisional
family `proto_m16_handling_`, one opportunity `proto_m16_handling_series`,
window `m16_handling_w1` (addendum §2 "U19"); the v2 ids
`proto_m16_protocol_update` / `proto_m16_protocol_*` / `m16_protocol_w1` are
retired from the route; the legacy module (`m16ProtocolUpdate.ts`,
`protocolForms.ts`) stays in the tree, byte-identical, imported by the
developer alias only. Not claimed: independent situations (six observations of
one rule in one console episode), equated vials, validity, questionnaire
equivalence, or that a correct answer proves understanding — the disclosed
cues of preview r3 §7 (v1 answered by 16 of the 23 listed non-guess strategies
and passing through worked example 1 as an intermediate state; the strongest
listed misreadings at 4 of 6; three of six vials needing both marks; the rule
card always visible, a ceiling plausible) travel with the ruling (register
§5.302) and are computed and reported by the pure spec — reproduced against
the preview's figures, never asserted as a ceiling.
Tests: pure `m16_handling` (the independent oracle — its own transcription of
the rule card, the worked examples and the six labels with their keys and its
own rule function; the sixteen label patterns, the threshold margin,
unseen-ness, rule-part coverage, the examples' structure, the §5.3 error
table, the reported §7 strategy table; the content cross-check; the register
and the legacy module's hashes; the series model; the extractor's values,
missingness and integrity cases; wording); browser `m16_handling_route` (R1–R9
on the participant route, twenty-six frames); re-expressed M16 steps of
`pilot_lab`, `pilot_signal_incident` (its guards test's orientation part moved
to the Training Rig) and `m15_systems_route` R8. As-built record, the ruling,
defaults and limitations: register §4 "Unit 19", §5.302–§5.313; results,
reviewers and every failure's base comparison: `UNIT-LOG.md` "U19". Not
updated (U24 backlog): the capture specs, the `interactionRegistry` `opens` /
window label `m16_protocol_update` for `lab.phase_m16`, `world_v1_*` evidence
for the console. Carried forward unchanged and open: the M05 competing-task
observation of register §5.290 (e) (i) and the episode-1 M05 cap on the
scripted route — M05 matters that U19 neither tests nor changes; the U18
salience observation H1 (§5.301), an M15 matter.

**U19 closeout** (M16; 12 October 2026; the research owner's closeout rulings
— register §5.314; as-built record §4 "Unit 19 closeout"; results
`UNIT-LOG.md` "U19 closeout results"): (a) the five contextual strings (the
fault line; the boundary and vial dialog footers; the help and closed-record
footers) accepted, with the distinction between leaving a view (ESC, the work
kept), cancelling a confirmation (ESC under a dialog, nothing recorded, the
view unchanged) and closing HELP (H or ESC, the view restored) documented; (b)
the vial question's soft wrap under the fallback fonts accepted for that one
string, the prescribed blocks keeping their fixed lines; (c) the keyboard
navigation named — the footer
`TAB moves focus · ENTER selects · H help · ESC leaves (work kept)` on the
first-opening card and both worked-example views, and the help line
`TAB moves focus. ENTER selects the focused control.` immediately before the
approved `Keys:` line — nothing else in the approved wording, focus behaviour,
controls or commitment protections changed; (d) the beacon unchanged, a U24
walkthrough issue; (e) frame 25 contextual imagery, the completion state
resting on R8's probe assertions — a supplementary close-up of the display at
a test-side 2560 × 1440 viewport after the series at `canvas=1080`
(`.playwright-mcp/u19-closeout/27a-wall-display-close-up-2560x1440.png`; the
indicator and the three ticks legible) added through the existing route, no
product change; (f) the entry snapshot's declared task definition validated in
full after the reported counterexample (a correct record beside a conflicting
duplicate and an extra unknown record, accepted as `observed` 6 of 6) was
reproduced by a focused pure test against the committed extractor — exactly
six unique known vial records, each with its four unique options in the fixed
order and its key; a missing, duplicate, conflicting, unknown or malformed
record ⇒ `technical_failure`; the responses' missingness, closure and reload
rules untouched; (g) the reporting corrections of §5.314 (7). Tests: pure
`m16_handling` (the definition test with its valid, malformed, precedence,
immutability and reload cases; the wording test pinned to the ruled strings;
49 in all), browser `m16_handling_route` R1, R7 (both fonts, extended to the
card, both examples and the help sheet, with the one-line footer check), R9
and the R8 supplementary capture, run by the test-reviewer (Sonnet 5.5) after
the code changes, with the affected checks rerun after the test-only
correction round; one targeted Opus 5.5 scientific confirmation (confirmed
with notes; one owner question recorded in §5.314 (6), resolved by the owner's
correction of the same day — the next paragraph); closeout frames in
`.playwright-mcp/u19-closeout` (the U19 evidence intact). Commit
`fix(m16): clarify controls and validate entry snapshots`. Not changed: keys,
content, versions, events, the formula, the shared framework, the legacy
module.

**U19 closeout correction** (M16; 12 October 2026; the research owner's
instruction — `UNIT-LOG.md` "U19 closeout correction"; register §5.314 (6) as
resolved, §4 "Unit 19 closeout" (9)): the two remaining metadata consistency
checks — the entry snapshot's `vials_planned` validated as the number 6 and
its `assigned_vial_order` as exactly `m16_v1`–`m16_v6` in order, the count and
order the approved administration already fixes; otherwise `technical_failure`
with the defect named. The storage order of the six per-vial records stays
unrestricted; six planned vials are never six answers (a valid partial session
of two answers keeps `pending` open and `incomplete` 2 of 2 censored at the
review); the responses' rules, missingness, closure, reload handling and the
raw log untouched; no other snapshot field added to the validation. Tests:
pure `m16_handling` (the new count-and-order test with its valid, partial,
missing, malformed, contradictory, precedence, immutability and reload cases;
50 in all), run by the test-reviewer (Sonnet 5.5) with tsc, build, ESLint,
Prettier, `git diff --check` and verify-unit (exit 1 only for the ten
untracked metadata files); one brief read-only Opus 5.5 scientific
confirmation (confirmed; two optional test recommendations adopted); no
browser run, screenshot or full matrix (none authorised). Commit
`fix(m16): validate planned count and assigned order`. Not changed: keys,
content, versions, events, the formula, the browser evidence of the unit and
the closeout.

**U20** (M18; bounded unit under `U20-CONTRACT.md`, v2 of 12 October 2026,
amended the same day with the owner's approval; research-owner decision
D-U20-1 of 12 October 2026 — register §5.315, an owner ruling and not an
implementer default): the Diagnostics Laboratory diagnostic board runs the
three-case administration `m18-cases-v1` in the wide frame of
`WorkSurfaceScene` (D-U17-2, used as is). A first-opening card; then three
independently designed cases in fixed order (`m18-content-v1`, form
`m18-form-1`: MAST RECEIVER, COOLING BAY, HATCH WINCH — each with its unit
sheet always visible, three on-request deterministic tests whose result lines
stay in the test record, four part options, one planned step with four answer
options); per case ONE confirmed and immutable first diagnosis — a part (the
confirmation repeating the draft) or CANNOT SOLVE (incorrect) — that closes
the case's tests, then, never before, ONE confirmed and immutable first
planned-step answer — an option or CANNOT SOLVE (incorrect) — keyed to the
ACTUAL case whatever part was recorded (item 1); the identical neutral
acknowledgement with HELP and LEAVE BOARD; no correctness information before
the sixth first response; then three read-only results pages (HELP, FINISH,
NEXT / BACK; FINISH and ESC close); the 400 ms fresh-press rule on every
confirmation and a 400 ms settle on every view transition (a refused press
recorded), so a double click on an opener records nothing and a fresh confirm
records exactly one; a same-test repeat inside 400 ms refused; the next case
only from the acknowledgement. Primary `m18_correct_first_diagnoses` = keyed
first diagnoses / cases with a diagnosis (planned 3); companion
`m18_correct_consequence_predictions` = keyed first planned-step answers /
cases with an answer (planned 3), never combined; both recounted from the raw
`first_response` events with their own numerator, denominator, planned
denominator and missingness; per-case records, test use, the two descriptive
indicators (`evidence_sufficient_before_part`,
`step_answer_implied_by_recorded_part`, with the null rules of item 10 and the
narrower claim), omissions apart from CANNOT SOLVE and help in the components,
never in a value. Defect scope (item 11, the approved alternative): a defect
demonstrably isolated to one slot voids that row only; shared defects of
administration, content, sequencing, exposure or the shared lifecycle void
both; where isolation cannot be established both are voided with the reason
stated; the eight setup declarations validated as part of the approved
administration. New provisional family `proto_m18_cases_`, one opportunity
`proto_m18_cases_series`, window `m18_cases_w1` (addendum §2 "U20"); the v2
ids `proto_m18_lattice_fault_diagnosis` / `proto_m18_fault_*` /
`m18_diagnosis_w1` retired from the route; the legacy board
(`m18FaultDiagnosis.ts`, `faultForms.ts`, `ui/DiagnosisConsoleScene.ts`) and
`src/measurement/m18Diagnosis.ts` byte-identical in the tree, the board on the
developer alias only; M18 reads nothing from M13 beyond the route-context
stamp `prior_m13_window_status`. Not claimed: independent situations (six
clustered observations of three independently designed cases in one episode),
equated cases, validity, questionnaire equivalence, or that a keyed answer
proves understanding or a correct diagnosis — the disclosed cues of preview
§5.3 (case 3's step key the "nothing changes" answer shared with the wrong
part HATCH, case 2's step key the "repair" answer, case 3's part key named on
button C, one test then a guess ≈ 1.17 of 3, the procedural carry-over from
case 1) travel with the ruling (register §5.315) and are computed and reported
by the pure spec's independent oracle — reproduced against the preview's
figures, never asserted as a ceiling.
Tests: pure `m18_diagnosis` (the independent oracle — its own transcription of
the three sheets, tests, options and planned steps and its own simulator per
case; every table cell, the consistent and sufficient sets, both keys, the
implied-by table, the symptom, the margins, the key positions, the reported
shortcut table, the rejected mutants; the content cross-check and the four
briefing handlers; the register rows and the legacy module's hashes; the
series model; the extractor's values, missingness, the §9.4 scopes and the
X1–X6 acceptance cases; wording); browser `m18_diagnosis_route` (R1–R9 on the
participant route, twenty-eight frames); re-expressed M18 steps of
`pilot_lab` and `pilot_signal_incident`. As-built record, the ruling, defaults
and limitations: register §4 "Unit 20", §5.315–§5.325; results, reviewers and
every failure's base comparison: `UNIT-LOG.md` "U20". Not updated (U24
backlog): the capture specs, the `interactionRegistry` `opens` / window label
`m18_lattice_fault_diagnosis` for `lab.phase_m18`, `world_v1_*` evidence for
the board, Noor's "test rig" line (agreed with by the card). Carried forward
unchanged and open: the M16 beacon salience question (§5.314 (4), a U24
walkthrough issue); the M05 competing-task observation of register §5.290 (e)
(i) and the episode-1 M05 cap on the scripted route — M05 matters that U20
neither tests nor changes; the U18 salience observation H1 (§5.301).

**U21** (M19; bounded unit under `U21-CONTRACT.md`, v2 of 13 October 2026;
research-owner decision D-U21-1 of 13 October 2026 — register §5.328, an
owner ruling and not an implementer default): the Exterior Recovery Yard
coupling station opens the coupling panel — the administration
`m19-lines-v2` in the wide frame of `WorkSurfaceScene` (D-U17-2, used as
is). A first-opening card; one panel check (one question, one explanation
after a wrong answer, one recheck; the outcomes `pass_first`,
`pass_after_explanation` and `fail` kept apart, `not_reached` and
`not_completed` kept apart from them; both lines administered whatever the
status); then two distinct, solvable, deterministic lines in fixed order
(`m19-content-v2`, form `m19-form-1`: line 1 HEATER BANK — three heaters of
1, 2 and 4 units and a SINGLE / DOUBLE feed against 10, key H1 + H3 DOUBLE;
line 2 PRESSURE TRIM — a dial 1–9 and a bypass against 9, key dial 5 OPEN),
each with unlimited distinct TRYs (an already-tried setting refused, never
an attempt), an always-available SET ASIDE behind a fresh-press
confirmation, a truthful gauge (LOW / OK / HIGH; nothing rigged) and a
designed obstacle: the first TRY after which the line's executed settings
include all of its listed evidence settings (line 1 the all-ON SINGLE
setting; line 2 dial 4 SHUT and dial 5 SHUT) is followed in the same
handler by ONE immutable `difficulty_boundary` (Option B; inferred routes
never count); nothing marks it on screen. Line 2 comes up only after line 1
is finished (restored or set aside) through the same neutral view; a
finished line never reopens; LEAVE and ESC keep everything; the end of the
outside work closes an opened series as it stands (`shift_ended`: an
eligible line without a further TRY counts 0) and records a presented,
never-opened panel (`closed_unopened`); the review censors a boundary line
without a further TRY; a runtime fault excludes the line in work only (E21 /
W1). Primary `m19_continuations` = eligible lines with a further executed
TRY of a new setting after their boundary / eligible lines (planned 2;
conditional eligibility — one eligible line is complete); the value is the
NUMERATOR COUNT (0–2) with the denominator beside it; a zero denominator
exports `numerator: null`, `denominator: 0` with its disposition
(`no_eligible_event` `obstacle_not_reached` / `no_try`, `interrupted`
`censored_only`, `technical_failure` `technical_only`); recounted from the
`attempt` and `difficulty_boundary` events (every stored reading checked
against the content rule) under the integrity rules S1–S7; restoring,
TRY counts, help, leaving, returning and time are companions, never in the
value; Option A's first-unsuccessful-TRY indicator exported as a component
only. The legacy coupling (`m19CouplingModel.ts`, its adapter functions in
`exteriorWindows.ts`) stays in the tree unchanged and leaves the route
(`exteriorWindows.ts` loses only the legacy declare and review-absent
entry; its `setComprehension('passed')` count stays 8). Tests: pure
`m19_lines` (the independent oracle of both lines, the check and every
string; the model; the extractor on the derivation cases E1–E21 and W1–W5,
S1–S7 and the descriptive flags; the clock policy; the register and legacy
source checks); browser `m19_lines_route` R1–R9 with twenty-nine frames
(R10 added at the closeout); `pilot_yard` and `pilot_exterior_isolation`
re-expressed for the new identity. Not changed (U24 backlog): the capture
specs, `exteriorHelpers.ts` `couplingAct` / `completeCoupling` (unused), the
M22 report line, the U8-12 gate's stale premise (the route's M19
comprehension is now a recorded check in `m19CouplingPanel.ts`), the
registry's `yard.coupling` description. Closeout of 14 October 2026 (the
owner's decisions on the review's questions, register §5.342; a second
local commit): HELP and LEAVE carry per-view ids so a hotkey view change
lands on the view's neutral element (review finding GP-1, fixed in M19
alone; the shared frame untouched); a two-line record for a panel reopened
after a runtime fault; the shift-end `closure_reason` mapping (D-6) and the
kit window status after a fault (D-13 (a)) accepted as documented; the
between-line fault reading retained; no event, field, formula or
disposition changed. Clustered observations in one yard visit; never a
validity claim.
