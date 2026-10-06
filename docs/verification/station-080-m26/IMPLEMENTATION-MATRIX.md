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
| M14  | **contradicts** — one packet, no answer key at all (`m14IncidentDesk.ts:55-100`); assignments mutable                                                                                                                                                                                                                                                                                                 | Two packets × (6 messages, 3 gauges, 3 keyed integration decisions); first response frozen; Cannot solve = incorrect                                                                                | `m14_correct_first_integrations`: correct first decisions / 6; by packet, omissions, source use                                                                  | pure: keys require ≥2 sources; browser: two packets                                                                           |
| M15  | **partial** — one causal system (2 forms), one intervention (`causalForms.ts:128-131`); cipher shares id and family (`m15LayeredCipher.ts:68-72`)                                                                                                                                                                                                                                                     | Two independently authored systems; explore → commit model → two unseen predictions each; cipher moved to its own secondary id                                                                      | `m15_correct_first_predictions`: correct first predictions / 4; model correctness, exploration separate                                                          | pure: oracle from system definition; browser: two systems                                                                     |
| M16  | **partial** — base familiarisation with correctness feedback before applications (`m16ProtocolUpdate.ts:701-704`); only one first response frozen; last instruction wins                                                                                                                                                                                                                              | Two identical-structure teaching examples for everyone; six unseen applications with frozen first responses; feedback only after all six; Don't know = incorrect; distinct vocabulary from tutorial | `m16_correct_first_applications`: correct first applications / 6; form and example versions                                                                      | pure: first response immutable; browser: examples then six cases                                                              |
| M17  | **as specified (U9)** — was contradicting at the audit base (1 practice + 1 transfer trial, live preview on both; the v2 `proto_m17_syntax_*` family is retired); **criterion values not to be read until register §5.87–5.88 are decided** (live preview on learning trials; correct-response rule)                                                                                                  | 2 uncoached baseline + 12 feedback learning + 2 transfer trials; no preview on baseline/transfer; criterion = 3 consecutive correct learning trials; all 12 always run; early exit = incomplete     | `m17_criterion_trial` {criterion_trial, attained}: 3–12, censored at 12; full sequence, baseline, transfer                                                       | pure: early criterion, never attain, transfer-only; browser: 16 trials                                                        |
| M18  | **partial** — one fault case per session (2 forms); no consequence prediction; forced selection                                                                                                                                                                                                                                                                                                       | Three independent cases with discriminating tests; first diagnosis + keyed consequence prediction before feedback; Cannot solve = incorrect                                                         | `m18_correct_first_diagnoses` / 3 (primary); `m18_correct_consequence_predictions` / 3 (companion)                                                               | pure: ambiguity check rejects; browser: three cases                                                                           |
| M19  | **partial** — one coupling with three binds (`m19CouplingModel.ts:67-75`); comprehension asserted (`exteriorWindows.ts:283`)                                                                                                                                                                                                                                                                          | Second distinct solvable challenge; per-challenge first difficulty boundary; teaching step with recorded comprehension                                                                              | `m19_continuations`: challenges with a further work attempt / eligible difficulty encounters (0–2)                                                               | pure: no difficulty → no denominator; browser: both challenges                                                                |
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
integrity cases, wording); browser `m13_networks_route` (R1–R5 on the
participant route, eighteen frames); re-expressed `ip_pipe_suite`,
`ip_lab_flow`, `ip_boundaries` and the M13 identities of `pilot_lab`,
`pilot_episodes_1_2`, `pilot_coverage`. As-built record, defaults and
limitations: register §4 "Unit 16", §5.260–§5.273; results, reviewers
and every failure's base comparison: `UNIT-LOG.md` "U16". Not updated
(U24 backlog): the capture specs, the `interactionRegistry` window
label, the legacy laboratory's presentation of the bench.
