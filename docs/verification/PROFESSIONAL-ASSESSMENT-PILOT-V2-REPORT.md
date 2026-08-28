# Professional Assessment Pilot V2 — Report (checkpoint, Units 0–2)

**Status: IN PROGRESS — checkpoint after Unit 2.** Units 3–7 (signal
analysis, exterior + return, utility/core closure, visual integration, full
verification/reviews) are NOT started. Nothing was pushed, merged, tagged,
deployed or removed; every commit is local.

## 1. Branch, base, HEAD

- Branch `fable-evidence-led-pilot-v2` in worktree
  `.claude/worktrees/fable-evidence-led-pilot-v2`, created by this mission
  from `0e1a8aa` (tip of `opus-concourse-interaction-hotfix-v1`). The branch
  did not pre-exist; the expected path held only the pre-staged workbook.
  Main checkout (`fable-autonomous-game-build-v1` @ `6154a82`) untouched.
- Preflight deviations reported: branch created (base exact); fresh worktree
  checked out CRLF (tracked files normalised to LF in place; blobs already
  LF); `node_modules` junction to the main checkout.
- Workbook `docs/verification/input/Remote_Outpost_M01-M26_Scientific_Decision_v2.xlsx`
  (md5 `1535682ab88481815bbdda1206644d4c`), 15 sheets incl. 08–14 — read in
  full, committed unchanged, never modified.

## 2. Commits (local) and file lists

| Commit    | Subject                                                   | Files                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| --------- | --------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `f304f7b` | docs(verification): freeze evidence-led pilot v2 contract | workbook; `docs/verification/evidence-led-pilot-v2/M01-M26-IMPLEMENTATION-LEDGER.{json,md}`; `scripts/pilot/derive-evidence-ledger.py` + `evidenceLedger.header.ts.tmpl`; `src/pilot/evidenceLedger.ts`; `src/pilot/index.ts`; `e2e/evidence_ledger.spec.ts`                                                                                                                                                                                                                                                                                                                               |
| `cf57b80` | refactor(game): establish evidence-led assessment route   | `src/pilot/{pilotRoute,PilotZoneScene,zoneSites}.ts`, `src/pilot/ui/{StationMapScene,WorkSurfaceScene}.ts`, `src/pilot/windows/windowKit.ts`, `src/scenes/{RecordsWorkshopScene (new),StationConcourseScene,DiagnosticsLaboratoryScene,ExteriorRecoveryYardScene,UtilityCoreDeckScene,index}.ts`, `src/world/SceneRouter.ts`, `src/constants/key.ts`, `src/data/researchInteractions.ts`, `e2e/{pilotHelpers,pilot_route.spec,pilot_route_model.spec,pilot_records.spec,pilot_lab.spec,pilot_yard.spec,pilot_deck.spec,pilot_visual_capture.spec,concourse_interaction_lifecycle.spec}.ts` |
| (Unit 2)  | feat(game): integrate records and workshop assessment     | see §4 — file list in the commit                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |

## 3. M01–M26 disposition and implementation status

Frozen (sheet 09; asserted by `e2e/evidence_ledger.spec.ts`): 16 strong /
7 conditional / 3 questionnaire-primary-or-hybrid; item-owned active time
1,040 s. Full per-item ledger: `docs/verification/evidence-led-pilot-v2/M01-M26-IMPLEMENTATION-LEDGER.md`.

| Item    | Class                | Implemented this checkpoint                                                                                  | Where                |
| ------- | -------------------- | ------------------------------------------------------------------------------------------------------------ | -------------------- |
| M01     | conditional          | yes — plan board work surface (`proto_m01_board_*`)                                                          | Concourse            |
| M02     | conditional          | yes — open case workspace + retrieval (`proto_m02_case_*`, overlay mode `m02case`)                           | Workshop             |
| M03     | strong               | occasion 1 (ep 2) retained from foundation; occasion 2 gated to the return shift                             | Workshop             |
| M04     | strong               | yes — sample-cutter debris, physical layer (`proto_m04_debris_*`)                                            | Workshop             |
| M05     | conditional          | occasion 1 (desk lamp, silent presentation, censoring); occasion 2 pending (Unit 4)                          | Concourse / Yard     |
| M06     | conditional          | yes — dispatch console, practice criterion (`proto_m06_dispatch_*`)                                          | Workshop             |
| M07     | conditional          | start + persistent state + returns (`proto_m07_calibration_*`); return-shift end pending                     | Workshop             |
| M08     | questionnaire        | secondary telemetry only (`secondary_m08_optional_job_*`)                                                    | route                |
| M09     | strong               | offer + check 1 window + check 2 on return (`proto_m09_watch_*`)                                             | Concourse            |
| M10     | strong               | offer + standardised interruption + hand-over at Kai (`proto_m10_promise_*`)                                 | Concourse / Lab      |
| M11     | questionnaire        | secondary telemetry only (`secondary_m11_seal_obligation_*`)                                                 | Workshop             |
| M12     | conditional          | two matched occasions, forms counterbalanced (`proto_m12_qc_*`)                                              | Concourse / Workshop |
| M13     | strong               | lattice bench moved to the workshop (engine unchanged); usability pass NOT done                              | Workshop             |
| M14     | strong               | yes — spatial incident desk (`proto_m14_desk_*`)                                                             | Concourse            |
| M15–M18 | strong               | foundation decoders still in the lab (Unit 3 pending); M18 still carries the M13 sequencing gate (to remove) | Lab                  |
| M19–M26 | strong/questionnaire | not started (Unit 4); legacy yard windows still declared under v1 ids                                        | Yard                 |

## 4. Facet/scale inference architecture

Six models (BFI-2 Organization M01–M04, Productiveness M05–M08,
Responsibility M09–M12; BESSI-192 Information Processing M13–M18; MPS
Persistence Despite Difficulty M19–M23; MPS Inappropriate Persistence
M24–M26) recorded in the ledger (`LEDGER_INFERENCE_MODEL`) and asserted by
test. Item-owned windows keep provenance; no item score, facet score,
weight, cut score or trait label exists anywhere in code.

## 5. Route

Hub-and-loop, all doors bidirectional (`pilot_route_model.spec`): Dock →
Concourse (ep 1) → Records Workshop (ep 2) → Laboratory (ep 3) → Recovery
Yard (ep 4) → **one purposeful return** Concourse → Workshop (ep 5) →
Utility Deck (ep 6, closure). 14 stages, one objective line each, beacon
hides on arrival, M = map + mission log, H = controls. Core synchronisation
is offered only from the closure stage; the deck door always returns.

## 6. Raw variables and validity gates

Every v2 window goes through `src/pilot/windows/windowKit.ts` (`ItemWindow`):
declare/offer/enter/complete/stop/absent/technical-failure on the SA-13
register, and every event stamps item id, opportunity id, window id, form/
counterbalance, occasion, presented timestamp, comprehension state, window
status, validity status + reason, input mode; raw components are recorded
at `*_window_closed` as state descriptions. Missing/invalid/technical
failure never become a value (kit + `reviewClosure.ts`).

## 7. No scores, no canonical promotions

`e2e/evidence_ledger.spec.ts` asserts no ledger family/id appears in
`CANONICAL_EVENT_CONTEXT`, `event-schema.md`, `scoring-plan.md` or
`ScoringManager.ts`; the Unit 2 spec asserts no v2 event carries
`study_item_ids`/`construct_id`/`success`. Dormant legacy composites in
`ScoringManager` evaluate to zero on this route (pre-existing; flagged).

## 8. Route and burden

Automated: topology walk 2.6 min (not a human estimate). Human timing is
**unvalidated** until a pilot exists; planning estimate 1,535 s (sheet 08).

## 9. Assets

No asset promoted or generated this checkpoint (Unit 6 not started). The
lifecycle spec regenerated two hotfix screenshots (evidence refresh).

## 10. Tests (retries=0, workers=1, `PW_DEV_PORT=5321`)

- Pure: `evidence_ledger` 11/11, `pilot_route_model` 8/8, `pilot_coverage` 8/8.
- `pilot_route` 4/4 (topology rerun green after the lab-descent fix).
- `concourse_interaction_lifecycle` 3/3 (workshop).
- `pilot_records` 4/6 first run → two expectation corrections (anchor label,
  board-column walk); rerun pending.
- `pilot_episodes_1_2` (retries=0): episode 1 walks offers → plan board →
  incident desk → quality packet → gauge check → silent fault initiation
  (last run failed only on an aggregate-status expectation, corrected,
  rerun pending); episode 2 reaches the case workspace hand-over and the
  sample cutter (6 debris objects rendered) but the `proto_m04_debris_job_run`
  event assertion fails — OPEN DEFECT (see §14).
- `pilot_records` marked `describe.skip` as superseded by the M02 redesign
  (needs a rewrite against the workshop).
- Not re-run since Unit 1: `pilot_lab`, `pilot_yard`, `pilot_deck`,
  `pilot_visual_capture` (retargeted, unverified); full suite not run.

## 11–12. Screenshots / reviews

Not captured / not run at this checkpoint (Unit 7).

## 13. Open research-owner decisions (new)

- M25 presented as a transparent hybrid belief/expectancy probe with
  original wording (CLAUDE.md forbids verbatim questionnaire wording in
  player-facing text); the exact item stays in the questionnaire.
- M20 resume placed at a workshop feed console (ep 5) rather than a second
  exterior trip — one purposeful return only.
- M02 `misfile_count` defined against the participant's OWN tray labels
  (never a designer key); `untraceable` = case in an unlabelled tray.
- M09 check 1 due before first leaving the Concourse (ep 1), check 2 on the
  return; deferral ("ask me again later") of the M09/M10 offers is allowed
  and never scored.

## 14. Remaining deterministic defects

- D-V2-1: episode-2 spec — `proto_m04_debris_job_run` not found in the log
  after the sample-cutter interaction although the debris rendered; verify
  the `ItemWindow.open()`/`log()` path of `m04Debris.ts` (possible exception
  inside `open()` after `jobRun` is set) — deterministic, unresolved.
- D-V2-2: `pilot_records` bundle test (`nearest` null on the workshop walk)
  — superseded spec, rewrite pending.
- M13 pipe-board usability pass (hit targets, snap feedback, undo/reset,
  accessible lane) not started.
- Retargeted `pilot_lab`/`pilot_yard`/`pilot_deck`/`pilot_visual_capture`
  unverified since Unit 1.

## 15. Human-pilot requirements

Unchanged from V1 §16 plus: form balance check for M01/M02/M06/M12/M14,
comprehension records for M13/M18 (gap carried), latency censoring review
for M05.

## 16. Confirmation

Nothing pushed, merged, tagged, deployed, PR'd or removed; workbook
unchanged; no canonical event, formula or score created.
