# Professional Assessment Pilot V2 — Report (Units 0–4)

**Status: IN PROGRESS — Unit 4 committed; Units 5–7 not started.** Nothing
was pushed, merged, tagged, deployed or removed; every commit is local.

## 1. Branch, base, HEAD

- Branch `fable-evidence-led-pilot-v2` in worktree
  `.claude/worktrees/fable-evidence-led-pilot-v2`, base `0e1a8aa`.
- Commits: `f304f7b` (U0 ledger) → `cf57b80` (U1 route) → `7824ab0` (U2
  checkpoint) → `b1a8be5` (U2 closure) → Unit 3 (see §2).
- Workbook `docs/verification/input/Remote_Outpost_M01-M26_Scientific_Decision_v2.xlsx`
  read (sheets 09, 11, 13 re-read for Unit 3), never modified.

## 2. Commits (local) and file lists

| Commit    | Subject                                               | Files                                                                                                                                                                                                                                                                                                                                                       |
| --------- | ----------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `b1a8be5` | fix(game): complete records workshop evidence windows | `src/pilot/windows/{m04Debris,m02CaseWorkspace}.ts`, `src/scenes/{RecordsWorkshopScene,StationConcourseScene}.ts`, `src/informationProcessing/{m13PipeNetwork,ui/PipeBoardScene}.ts`, `e2e/{pilot_episodes_1_2,pilot_records,concourse_interaction_lifecycle,ip_pipe_suite}.spec.ts`, `e2e/{pilotHelpers,ipHelpers}.ts`, one refreshed lifecycle screenshot |
| `fb161c6` | feat(game): unify signal analysis assessment          | see §5                                                                                                                                                                                                                                                                                                                                                      |
| (Unit 4)  | feat(game): integrate exterior recovery assessment    | see §11.1                                                                                                                                                                                                                                                                                                                                                   |

## 3. D-V2-1 — root cause and fix

Reproduced first (`pilot_episodes_1_2` ep 2, retries=0): the failure was
**position-dependent, not a logging fault**. Two production defects:

1. **Contested interaction target.** The sample cutter (320,352) and Press B
   (288,272) both lay inside the 72 px interaction radius of the cutter's
   natural approach point (320,308). With the ±12 px landing error of a
   walk, a landing at (308,296) is 31 px from Press B and 57 px from the
   cutter, so SPACE opened Press B ("no batch scheduled") and
   `runM04SampleJob` never ran. The same class hit the lattice bench (608,96)
   vs the Work Order Board (640,160) and, on the Concourse, nothing else.
2. **Debris materialised before the job.** `m04RemainingDebris()` filtered
   only disposed/carried objects, so all six debris objects existed from
   scene creation: "six rendered objects" was never evidence that the job
   ran.

Fix (production, `m04Debris.ts` / `RecordsWorkshopScene.ts`): debris exists
only after the job (compact scatter that stays clear of the machinery
block); cutter → (352,384), chute → (416,344), lattice bench → (704,416)
(each approach point has no other station nearer even with ±12 px error,
and each walking column clears the machinery blocks x 416–543 given the 32
px body); SPACE/E at the idle cutter acts on the debris (keyboard parity).
The candidate family `proto_m04_debris_*`, opportunity and window are
unchanged; missing (`closeM04AtReview` → absent), invalid and incomplete
remain distinct. The spec now asserts 0 debris before the job, `job_run`
plus exactly one `opportunity_opened`, 6 after, status `open`, and the
completed closure at the first workshop exit. Episode 2 was green three
consecutive times at `--retries=0 --workers=1` after the fix.

Further defects found while closing Unit 2 (all fixed, all production):

- **D-V2-4** — the M05 desk-lamp fix opened a manual world-action bracket
  and never ended it: after the fix, every Concourse interaction and all
  movement stayed frozen ("prompt did not open at Vale"). Ended on the
  fix timer and on scene shutdown.
- **D-V2-2** — the bundle test's "nearest null": the x-first leg west from
  the board approach point (y ≈ 192–216) clamps on the upper machinery
  block; `routeToWorkshopWork` now ends on the clear y = 272 lane.
- `workspace_committed` was stamped with the retrieval window id; the
  commit now carries `m02_workspace_w1`, retrieval events `m02_retrieval_w1`.
- M13 undo snapshots kept a held piece in the hand (found by the new test).
- Two DEV-only refresh-from-timer paths (pipe snap flash; fault-board drag
  highlight) rebuilt the board mid-drag and destroyed the dragged object;
  both now restyle in place.

## 4. Unit 2 verification (complete)

- Episode 1 through the M05 initiation, aggregate-status expectations
  confirmed (green after D-V2-4); episode 2 green ×3.
- `pilot_records` rewritten around the M02 open workspace: entry state (six
  cases, four empty trays, no sort/answer control), free organisation by
  pointer and keyboard, `misfile_count` / `untraceable_case_count` /
  `duplicate_count` computed against the participant's OWN labels (asserted
  field-by-field; no v1 `misfiled_count`/`unfiled` or designer-key field
  exists), functional retrieval with one wrong pick recorded, window ids on
  workspace vs retrieval events, form = counterbalance recorded, no other
  workshop family fired during the whole M02 flow; abandonment fail-forward
  (window stays open, reopen resumes, sign-off advances); M03 occasion A
  under its own ids with B refused before the return and both records
  distinct on the register; bundle inventory play secondary-only. 4/4.
- M12 matched packets: `proto_m12_qc_o1` / `_o2` distinct, form and order
  recorded (episode specs).
- M08/M11: `secondary_*` telemetry only, no register entry, coverage
  `not_applicable` (episode 2 spec).
- M13 usability pass: UNDO (U) / CLEAR (C) buttons + keys as raw acts with
  their own events (`undone`, `board_reset`, counted in `undos`/`resets`),
  seat/rotate feedback (mount flash + one-line description), button relayout,
  concise help; no auto-completion, no answer card; validator untouched
  (the sealed run still completes; `ip_pipe_suite` green incl. the new
  usability test).
- Runs (retries=0, workers=1): pure suites (evidence_ledger 11, route_model
  8, coverage 8, ip_engine 15), pilot_records 4/4, ip_pipe_suite (all),
  inventory_foundation, inventory_measurement_isolation, pilot_route 4/4,
  concourse_interaction_lifecycle 3/3 (expectations moved to `m02case` /
  `case_workspace` / Press B refusal), lint:tsc, eslint (scoped), production
  build, `git diff --check` — all green before `b1a8be5`.

## 5. Unit 3 — the Signal Analysis Incident (M15–M18)

One coherent laboratory case: an unknown transmission recovered from the
storm relay (Noor, on the intercom from outside; Kai remains the route
anchor and M10 recipient). Central **Signal Analysis Workstation** with a
wall display that changes after every recorded phase, a compact phase
indicator ("PHASE n / 4 — …"), one Noor intercom line per case state, a
reviewable case brief (workstation prompt), and four visually and
mechanically distinct benches on one row in presented order — each
independently enterable whenever no other phase surface is open (no
outcome gates another window; G2).

| Phase | Bench            | Surface                                                                                                                                                                                           | Item / opportunity / window / family                                               |
| ----- | ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| 1     | Evidence Table   | work surface: 4 evidence tiles + readout, 5-node model board with drawn links, PREDICT mode                                                                                                       | M15 `proto_m15_layered_cipher` · `m15_causal_w1` · `proto_m15_cipher_*`            |
| 2     | Protocol Console | signal terminal: base protocol → READY → new rule → ACKNOWLEDGE → 6 fresh reports (drag / click-compose / typed → one validator), PROTOCOL reference                                              | M16 `proto_m16_protocol_update` · `m16_protocol_w1` · `proto_m16_protocol_*`       |
| 3     | Training Rig     | signal terminal: demonstration → READY → one practice case (corrective feedback, ≤3 attempts) → one changed transfer case (no reference, ≤3 attempts), DEMO review                                | M17 `proto_m17_syntax_acquisition` · `m17_transfer_w1` · `proto_m17_syntax_*`      |
| 4     | Diagnostic Board | fault board: evidence panels + reversible tests + readout; hypotheses are tags moved between OPEN / WORKING DIAGNOSIS / RULED OUT by drag, click, keyboard; ruling out cites the readout evidence | M18 `proto_m18_lattice_fault_diagnosis` · `m18_diagnosis_w1` · `proto_m18_fault_*` |

Files: `src/informationProcessing/{causalForms,m15CausalModel}.ts` (new),
`m17SyntaxAcquisition.ts` + `syntaxForms.ts` (1 practice + 1 transfer,
`M17_MAX_ATTEMPTS = 3`, `demonstration_viewed`, `trial_finished`),
`m18FaultDiagnosis.ts` (`rejections[]` with cited evidence,
`contradictions_eliminated`, `evidence_consistent_steps`,
`evidence_inconsistent_steps`, `redundant_tests`, `tests_selected`),
`m16ProtocolUpdate.ts` (title, window id stamp), `ui/DiagnosisConsoleScene.ts`
(fault board), `src/pilot/ui/WorkSurfaceScene.ts` (`links`),
`src/pilot/windows/signalSurfaceModels.ts` (new), `src/scenes/DiagnosticsLaboratoryScene.ts`
(rewritten), `src/pilot/zoneSites.ts`, `src/data/researchInteractions.ts`
(`pilotSignalWorkstation`), specs `e2e/{pilot_lab,pilot_signal_incident,signal_incident_models,pilot_signal_capture,ip_decoder,ip_visual_capture,pilot_visual_capture}.spec.ts`,
`e2e/{pilotHelpers,ipHelpers}.ts`. The foundation cipher module
(`m15LayeredCipher.ts`) stays as the developer test bed only.

### 5.1 Raw variables and validity gates

- **M15** (candidate, sheet 09 H + mission list): `evidence_sources_opened`
  (+ count, order, `source_transitions`), `guide_presented` /
  `guide_reviews` (diagram tutorial shown at first open), `model_edits`
  with the full `edit_sequence`, `corrections`, `required_causal_edges` /
  `required_edges_present`, `edges_final`, `invalid_edges`,
  `contradictions_present` / `contradictions_resolved`,
  `intervention_prediction_marked` / `_implied_by_evidence` /
  `_implied_by_own_model` / `_made` / `_correct` /
  `_consistent_with_own_model`, `submission_complete`,
  `constraints_satisfied` (of 3), `reading_ms_before_first_edit`,
  `pointer_acts` / `keyboard_acts` / `input_mode`, form, IP window fields.
  Two-stage submission (incomplete warns once, then records as it stands —
  completeness is a raw fact, never a gate). Validity: completed / exited
  (STOP → missing) / technical_failure (invalid); no terminal-orientation
  gate (different interface).
- **M16**: unchanged foundation observables (reference consults, parsed /
  refused commands, revisions, first application, units correct,
  `active_ms_after_ready`, input mode, form) + `window_id`; entry-state
  flagged `invalid_entry_state` when the console orientation was skipped
  (invalid, never low; the task still runs).
- **M17**: per-attempt records (`trial_type`, `attempt`, commands
  required/correct, semantic/syntax errors, corrections, feedback
  presented, help consults, `demonstration_reviews`, active ms, goal
  reached, input mode) + case summary (`practice_attempts`,
  `practice_criterion_met`, `transfer_attempts`,
  `transfer_first_attempt_goal_reached`, `transfer_goal_reached`,
  `transfer_correct_steps_first/final`, `hints_used`,
  `demonstration_exposures`, `time_by_phase_ms`). No slope, no criterion
  score. Practice buffers never evaluate against the transfer goal (pure
  test).
- **M18**: foundation observables + `rejections[]` (hypothesis, cited
  evidence, `evidence_consistent`), `contradictions_eliminated`,
  `evidence_consistent_steps`, `evidence_inconsistent_steps`,
  `uncited_rule_outs`, `redundant_tests`, `tests_selected`; correctness a
  raw fact, never surfaced.

### 5.2 M13 / M18 independence evidence

- The laboratory's M13 sequencing gate is removed; the only M13 read in
  the scene is the route-context stamp `prior_m13_window_status` on the
  M18 open event (asserted by source test).
- `m18FaultDiagnosis.ts`, `faultForms.ts`, `DiagnosisConsoleScene.ts`
  import nothing from any M13 module (source test, comments stripped).
- Route proof (`pilot_lab` test 3): never-opened vs explicitly-exited
  lattice histories open a byte-identical `entry_snapshot`
  (`m13_dependency: 'none'`); the M13 record is unchanged by the board;
  no `proto_m13_*` event is emitted from the laboratory. The IP-lab proof
  (solved / exhausted / in-progress-then-exited / never opened) stays green.
- Families pairwise disjoint (source + runtime); each phase's events carry
  only its own opportunity and window id (full-incident spec).

### 5.3 Timing status

Ledger planning envelope: 65 + 50 + 55 + 65 = 235 s item-owned (pure test).
Automated-route accounting (full incident by real input, `pilot_signal_incident`):
item-owned active 61–84 s, wall 152–186 s across four runs — inside the
235 s envelope (asserted ≤ 235 s). Human timing remains unvalidated until a
pilot exists; automated time is not a human estimate.

## 6. Tests (retries=0, workers=1, `PW_DEV_PORT=5321`)

Final chain after the consolidated correction round:

- `lint:tsc` ✓ · production build ✓ · scoped ESLint ✓ · `git diff --check` ✓.
- Run 1 (17 spec files, 140 tests, 38.3 min): 139 passed; the single failure
  was the Unit 1 bare-route check counting M05's **system-driven** silent
  presentation (`opportunity_opened` / censored `window_closed`,
  `input_mode: system`) as a participant act → helper now excludes
  system-driven registrations; participant acts remain forbidden.
- Run 2 (captures + acceptance): 4 passed; three failures all "prompt did
  not open at Kai" — the 40 px lateral approach left a 12 px margin under
  load (flagged by the gameplay review) → Kai approached from below.
- Reruns of the affected set (topology walk, `pilot_lab` ×3,
  `pilot_signal_incident` ×2, `pilot_signal_capture`, laboratory capture):
  rerun 1 **8/8**; rerun 2 7/8 — the Unit 1 topology walk timed out at a
  Concourse→Dock door transition (a door Unit 3 does not touch); in
  isolation it passes (3 of 4 executions green). Recorded as an
  intermittent door-transition timeout under long batches, not attributed
  to Unit 3 and not silenced.
- Green in this chain: signal_incident_models 10/10, evidence_ledger 11,
  pilot_coverage 8, pilot_route_model 8, ip_engine 15, ip_boundaries 3,
  ip_decoder (incl. the rewritten M17 case), ip_lab_flow (full
  playthrough), ip_pipe_suite (all M13/M18 incl. four-history entry-state
  proof and usability), pilot_lab 3/3, pilot_signal_incident 2/2,
  pilot_episodes_1_2 2/2, pilot_route 4/4 (run 1 topology excepted as
  above), concourse_interaction_lifecycle 3/3, inventory_foundation,
  inventory_measurement_isolation, pilot_signal_capture, laboratory and
  M17 visual captures. Retries 0, workers 1, `PW_DEV_PORT=5321`.
- Allowlist verifier: this mission ran without a `CLAUDE_UNIT_ALLOWLIST`;
  the commit stages only the Unit 3 files by explicit path.

## 6a. Work resumed after the rate-limit interruption

The interruption (API session limit) hit while three reviewers were
running; none had reported. Resumed from the working tree on `b1a8be5`
with the four visual corrections already applied and typechecked:
(1) Noor's intercom overlapped the workstation sprite → now a timed
subtitle in the top-right HUD band (wall row; no sprite, label or door);
(2) the M15 brief/evidence title collided → one-line brief, short titles,
board title fits; (3) M18 tags overflowed → two-line 9 px tags, zones sized
by tag count, cited-evidence line below the label; (4) the "completed"
frame stayed at phase 2/4 because the capture never submitted M16 (and its
keyboard ENTER toggled the M18 diagnosis off) → the capture now submits
every phase through the normal participant path (typed/click/drag for M16,
the SUBMIT DIAGNOSIS button for M18), reports to Kai, and asserts
`phases_recorded = [m15,m16,m17,m18]`, `CASE RECORDED`, no surface left
open, stage `exterior_briefing`, no runtime error. No DEV state is
mutated and no internal completion function is called.

## 7. Screenshots

`docs/verification/screenshots-evidence-led-pilot-v2/` (participant view,
800×600, real input): `01-signal-arrival`, `02-signal-case-brief`,
`03-m15-causal-model`, `03b-m15-prediction`, `04-m16-protocol-reference`,
`04b-m16-command-surface`, `05-m17-demonstration`,
`05b-m17-practice-feedback`, `06-m17-transfer`, `07-m18-diagnosis-board`,
`08-signal-incident-complete`. Refreshed laboratory frames in
`screenshots-professional-pilot/12–18` and M17 frames in
`screenshots-information-processing/22–23`. All inspected at full
resolution after the correction round.

## 8. Reviews (four independent, read-only; two waves of two)

- **Scientific (Opus)** — architecture sound (four item-owned windows,
  disjoint families, M13/M18 independence, missing≠invalid≠low). Blockers:
  BL-1 practice feedback revealed a transfer command (`ZOR A C` shared) —
  **fixed**: practice references re-cut (`ZOR A B`/`VEK C GRN`,
  `ZOR B C`/`VEK A GRN`), pure test asserts no shared command; BL-2 M15
  forms unmatched on the prediction and form B's held-line named a target —
  **fixed**: form B intervenes on the join node (two downstream nodes like
  A), pure test asserts matched load and no target in the held line.
  Majors: MAJ-1 `required_causal_edges` was a constant — **fixed** (now the
  participant count; `required_edges_total` carries the constant); MAJ-2
  `constraints_satisfied` composite in the M15 record — **fixed** (removed;
  booleans kept separately); MAJ-6 two names for one count — **fixed**
  (`contradictions_eliminated` = ruled-out hypotheses contradicted by
  evidence the participant opened; `evidence_consistent_steps` = citations
  that contradict); MAJ-7 "receiver chain" framing over lattice content —
  **fixed** (labels, Noor and brief now name the test rig; content
  untouched); MAJ-8 stale spec regex — fixed; MAJ-4 orientation optional by
  copy — **wording made unconditional**, semantics an owner decision;
  MAJ-3 tutorial stop/failure both map to `comprehension_failure` on
  M16/M17 — **deferred** (shared foundation semantics; owner decision 7);
  MAJ-5 citation-by-context — recorded raw, owner decision; MAJ-9 the
  authorised M15 field list lives in the mission prompt, restated in §5.1.
  Minors: `practice_goal_reached` duplicate removed; others recorded.
- **Gameplay (Opus)** — no trapping, placement rule passes numerically,
  mechanics distinct. Blockers/majors **fixed**: phase-4 fiction
  relabelled to the test rig (F-1 copy); Noor's line keyed to the NEXT
  phase and never asserts an outcome (F-2); wall display drawn beneath
  sprites (F-3); Kai/brief order copy consistent (F-4); orientation beacon
  releases once any phase is entered (F-5); two-step STOP on the evidence
  table (F-6); H/Q advertised on the board and the close button reads
  `ESC` (F-7/F-8); M15 button row clear of the feedback line (F-10); dead
  board frame removed (F-16); placeholder wording (F-14). Deferred as
  minor/polish: 9 px faint text contrast, linear arrow focus on the ring,
  exit-sign vs belt (moved up), reference-modal size (shared chrome),
  KAI operator token name, `■` marks for stopped phases, orientation
  optionality (owner decisions).
- **Test quality (Sonnet)** — no blockers; tsc/build/pure suites green
  twice; 14-proof map: 12 covered, proofs 4 and 5 "partial" only because
  the reviewer stopped before reading `ip_engine.spec.ts` ("append
  validates before commit; invalid commands never mutate state") and the
  terminal's single `dispatchAppend → adapter.append → appendLine` path —
  both are in the tree and green.
- **Visual (Opus)** — B1/B2/M1 were read from the stale professional-pilot
  lab frames captured before the corrections (now re-captured); M2 empty
  register panel in the demo/recorded stages — **fixed** (register shown
  in every stage); M5 contradictory directives — **fixed** (indicator and
  Noor carry no directive; the objective line owns it); fourth display
  cell unfilled — **fixed**; indicator/airlock collision — **fixed**
  (indicator inside the panel header); exit sign under the belt —
  **fixed**. Deferred: phases 2/3 share the terminal chrome (asset gap:
  phase identity marks), reference-chain art, non-colour state glyphs,
  footer contrast, reference-modal sizing — recorded for Unit 6.

Correction rounds used: **1 of 2** (this consolidated round).

## 9. Open research-owner decisions (new in Units 2–3)

- **Identifier naming**: the frozen ledger binds M15 to opportunity
  `proto_m15_layered_cipher` / family `proto_m15_cipher_*` and M18 to
  `proto_m18_lattice_fault_diagnosis`; the mechanics are now the causal
  model and the receiver-chain diagnostic board. Rename candidates
  (`proto_m15_causal_*`, `proto_m18_diagnosis`) at the next ledger
  regeneration — a naming decision only.
- **M15 raw-variable set**: the mission's authorised list and sheet 09 H
  are both recorded; `intervention_prediction_correct` (vs evidence) and
  `_consistent_with_own_model` are both kept — which one the analysis
  treats as primary is an owner decision.
- **M17 attempts**: up to three attempts per case (practice with feedback,
  transfer without) and the FINISH action are implementation choices;
  `practice_criterion_met` is recorded, never enforced.
- **M18 citation**: ruling a tag out cites whatever the readout shows
  (attachment by context); an explicit "attach evidence" drag was not
  added. `evidence_consistent_steps` counts consistent citations only.
- **M13 gate**: removed from the laboratory; `prior_m13_window_status`
  retained as route context only.
- Earlier items (M25 wording, M20 resume placement, M02 own-label
  definitions, M09 deferral) unchanged.

## 10. Confirmation

No disposition, canonical event, scoring formula, weight, trait label or
score was created or changed; `ScoringManager`, `CanonicalEventContext`,
`event-schema.md` and `scoring-plan.md` do not reference any phase family
(asserted). Nothing pushed, merged, tagged, deployed, PR'd or removed.

## 11. Unit 4 — Exterior Recovery (M05 o2, M19, M20-start, M23, M24, M26)

### 11.1 Scope and files

Sheet 11 row 4 (Exterior Recovery, 300 s): M05(2), M19, M20-start, M23,
M24, M26 — valve difficulty → antenna start → scan/dig recovery → magnet
deck/depletion → disconnected channel. Not in this unit: M20 end/return,
M21, M22, M25, Utility/Core, scoring, trait labels (sheet 13 G0/G6).

| Area                                         | Files                                                                                                                                                                                                                                                                                               |
| -------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Pure item models (Node-testable)             | `src/pilot/exterior/{m19CouplingModel,m20AntennaModel,m23ExcavationModel,m24MagnetRigModel,m26ChannelModel,exteriorEpisodeModel}.ts` (new)                                                                                                                                                          |
| Window adapters (ItemWindow kit, ledger ids) | `src/pilot/windows/exteriorWindows.ts` (new); `windowKit.ts` (`complete(..., {exitState})`); `reviewClosure.ts` (episode-4 closure)                                                                                                                                                                 |
| Scene                                        | `src/scenes/ExteriorRecoveryYardScene.ts` (rewritten); `src/pilot/zoneSites.ts` (`YARD_SITES`, `YARD_RIG_PAD`); `src/pilot/PilotZoneScene.ts` (`refreshGuidance()`, probe objective = displayed line); `src/data/researchInteractions.ts` (six `pilot*` site keys)                                  |
| Tests                                        | `e2e/pilot_exterior_models.spec.ts` (12 pure), `e2e/pilot_yard.spec.ts` (rewritten, 3 route tests), `e2e/pilot_exterior_isolation.spec.ts` (2), `e2e/pilot_exterior_capture.spec.ts` (13 frames), `e2e/exteriorHelpers.ts` (new), `e2e/pilot_visual_capture.spec.ts` (yard frames 19–26 retargeted) |
| Docs                                         | `docs/game/rooms/11-exterior-recovery-yard.md` (new), this report, `docs/verification/screenshots-evidence-led-pilot-v2/09–21*.png`                                                                                                                                                                 |

Untouched on purpose: the field-actions foundation
(`src/fieldActions/**` — controllers, deck, registries, the developer-lab
adapters), `src/pilot/yardJobs.ts` (the old M22/M25 ambient orchestration
is no longer hosted by the yard; the Utility Deck's finalisation calls
remain harmless no-ops), the ledger, the workbook, every protected
authority file.

### 11.2 Route and subarea design

One connected 25×19 exterior (theme `exterior`), reached through the
laboratory airlock; the same airlock is the only door and leads back
(`▼ AIRLOCK — RETURN TO STATION`). Rock ridges shape seven legible
subareas without a maze: airlock apron (Noor, supply crate, the M05 cable
flag), the frozen coupling with its heat-gun rack (west), Mast 04 over its
rock footing (north-centre), the staked 7×6 excavation field with a dashed
outline and corner posts (east), the Metal Recovery Yard compound behind a
south ridge with a darker scrap floor, rig, tray and sorting bench
(north-east), and the uplink posts A/B with the line-status panel and a
drawn conduit (north-west). Every interactable follows the D-V2-1
placement rule (no other interactable nearer than the station at its
44 px approach point).

Guidance: at `exterior_work` the ONE objective line is the current site
in operational order (coupling → mast → excavation → rig → uplink → "Report
to Noor, then return inside through the airlock"), each with its tool hint
only where relevant; the beacon points at the first non-terminal site and
hides on arrival; stable landmark names; the M map/log lists the antenna
obligation neutrally once accepted. The order is guidance only: every site
is independently enterable, no outcome gates another, "I am finished
outside." is available at every Noor visit, and the airlock is never
gated. Noor's brief lists the five sites once; each site carries its own
panel brief (comprehension exposure recorded as `presented` /
`comprehension_state: passed`).

### 11.3 M05 occasion 2

`m05Initiation.ts` (Unit 2) hosts o2 unchanged: a loose guy-line cable
flag on the apron (`proc-survey-stake-flagged` + a flapping marker),
never mentioned, presented at the first quiet moment after Noor's
"Ready." (comprehension = brief acknowledged; `input_mode: system`,
`presented_at_ms`, `distance_px` recorded), E = the initiation act with a
2 s neutral fix under the manual world-action bracket (ended on the timer
and on shutdown). Censored `left_zone` at the airlock and `stage_advanced`
at Noor's shift end; `closeM05AtReview('o2')` at the review. Occasion
number, window id `m05_initiation_o2`, form/order fields ride every event;
entry never reads occasion 1 (the route spec proves o2 presents after an
uninitiated, censored o1); nothing aggregates the two occasions.

### 11.4 M19 — frozen coolant coupling

Mechanic (`m19CouplingModel.ts`): a valve wheel on a frozen coupling. TURN
(E → "Turn the wheel", a 700 ms timed world action) opens the valve by 10
points; at the identical thresholds 30 / 60 / 80 the collar ICES
(difficulty onset, explained in the feedback line) and turns are
ineffective until THAW (E → "Thaw the collar (heat gun)", 1500 ms) frees
it — 1, then 2, then 3 passes (resistance rises after initial progress);
INSPECT reads the state; STEP AWAY is the neutral stop. In-world dial,
frost overlay and a status chip (`VALVE 40% · ❄ COLLAR ICED`) persist
across scene creations. Form `standard_v1` recorded. Completion is
attainable (10 effective turns + 6 thaw passes) and no state has zero
utility. No rapid clicking: every act is a discrete timed action.

Distinguished events: `turn` (`effective` true/false, `bind_engaged`,
`ineffective_run`), `thaw` (`useful`, `freed`), `inspect`,
`difficulty_onset`, `strategy_shift` (thaw after an ineffective turn),
`departed`, `window_closed`, `technical_failure`. Raw components (ledger
names): `difficulty_onset` {elapsed_ms, progress},
`postdifficulty_reengagement` (+ latency), `useful_attempts`, `progress`,
`completion`, `stop_choice` (`step_away` / `ended_shift_outside` /
`closed_at_review` / null); contextual counts kept separately
(ineffective attempts, thaw passes, inspections, strategy shifts, longest
ineffective run, departures). Explicit stop = completed observation with
`exit_state: 'stopped'` (the stop is the recorded behaviour, as M05's
censor is); scene exit = `departed` + pause; shift end closes with
`stop_choice: ended_shift_outside`.

### 11.5 M20 — antenna restoration, START only

`m20AntennaModel.ts`: E at Mast 04 → "Accept the restoration"
(`accepted`, window `m20_antenna_start` opens = register ENTERED) → two
outdoor stages in fixed order (`clear_base_clamp`, `seat_feed_line`;
1.5 s timed actions, `stage_completed` events) → the mast reads
`FEED SEATED · ALIGNMENT PENDING (station feed console)`; the mission log
carries the obligation neutrally. The start window never completes: no
`window_closed`, no `returned` / `resume_latency` /
`useful_resume_actions` / `completion` (all `null` in the snapshot,
`resume_window_implemented: false`); Noor's "finished outside" records
`interruption_recorded` with `progress_pre_interruption` (0–2) and pauses
the window, which stays OPEN on the register for the Return episode
(`m20_antenna_resume`, ledger episode 5 — not this unit). No reminder is
given at the return instruction. At the Utility Deck review a still-open
start window is CENSORED (never an outcome). State persists across scene
exits (tested: leaving after one stage, re-entry shows one stage;
completing M23/M24/M26 never touches it; the obligation is visible in the
Concourse mission log after the return).

### 11.6 M23 — scanner-guided excavation

The accepted foundation mechanics are reused unchanged (ScanController,
DigController, DigSurfaceRegistry, FieldTargetRegistry, FieldCacheManager);
`m23ExcavationModel.ts` only classifies their records while the window is
open. E at the stake → brief (scanner/spade semantics, no direction, no
coordinates) → "Begin the excavation" (window `m23_excavation_w1`,
comprehension passed). Counterbalanced target cells form*a (18,9) /
form_b (20,12), both deep in the 7×6 field, detection radius 160 px
(strong ≤ 53 px, moderate ≤ 106, faint ≤ 160, none beyond); the readout
is the foundation's strength / FAINT–MODERATE–STRONG / temporal trend
with a visible cooldown. Only the exact cell holds the coupling; empty
digs leave persistent disturbed ground (replayed on scene creation);
belt-full recovery creates a field cache at the cell that persists across
scene exits and is collected with SPACE/E (item conservation). Inside the
staked field, C and D are refused neutrally before the window and after a
stop ("read the stake panel" / "closed for this shift") so a fake
no-signal readout never appears; outside the window C/D remain
`secondary_field_action*\*` only.

Raw components (ledger names): `informative_scan_moves` (comparable
sweep ≥ 24 px from the previous), `signal_strength_changes`
{stronger, weaker, unchanged, sequence}, `exact_dig_attempts` (+ cells),
`useful_strategy_shifts` (re-localise after an empty dig; relocate ≥ 48 px
after a weaker reading), `recovery_complete`; contextual: scans, on-signal
scans, unique 16 px bins, best strength, first actionable signal
(MODERATE/STRONG), actionable→recovery ms, off-plot digs, invalid actions,
path length, delivery (inventory/cache), stop choice, departures. No
composite search score anywhere.

### 11.7 M24 — Metal Recovery Yard magnet rig

Foundation deck and winch unchanged (finite deck of 6, forms A/B = one
multiset in two orders; every committed cycle consumes one position
in-band or not; post-depletion pulls are empty by construction; ESC
cancels only lowering/timing; one lock per cycle). E at the rig → brief
(finite catchment, "CATCHMENT DEPLETED means nothing further can be
recovered", the sorting bench) → "Start the salvage tally" (window
`m24_magnet_w1`; `deck_position_at_open` recorded and stamped as prior
exposure when > 0). F runs only on the operating pad and only inside the
open window. The rig chip shows `CYCLES n · RECOVERED r` (no remaining
count before depletion); depletion shows the banner `■ CATCHMENT
DEPLETED`, the statement, and the same statement on every later cycle
and on the panel (`depletion_shown` counted); the panel offers
"Acknowledge the depletion notice" (knowledge verified). Continue and stop
are presented identically.

Raw components (ledger names): `depletion_reached` (+ ms, at_cycle),
`depletion_acknowledged` (+ ms), `postdepletion_casts` (split
`postdepletion_casts_pre_ack` / `identical_postdepletion_cycles` = post-
acknowledgement committed casts), `alternative_opened` (sorting bench
after depletion; pre-depletion uses counted separately); contextual:
committed/cancelled cycles, useful/empty outcomes, in/out-of-band locks
(motor telemetry only), time post depletion, departures. Closure at
Noor's shift end: completed iff shown AND acknowledged; never depleted →
censored (missing); depleted but never shown / never acknowledged →
`insufficient_opportunity` (invalid). Deck state persists across yard
exits (tested at position 2).

### 11.8 M26 — disconnected uplink channel

`m26ChannelModel.ts`: two field uplink posts (A primary, B backup, three
tiles east, equally accessible) and a line-status panel; the brief queues
two recovery reports (coupling recovery, salvage tally — a neutral route
substitute report is sent whether or not M23/M24 succeeded). After the
FIRST successful transmission (ACK), a scripted, standardised event 1.4 s
later tears the conduit to Post A open: the drawn conduit breaks with a
hazard mark, Post A's chip reads `LINE A ✕ OPEN — NO CARRIER`, the panel
notice names the severed junction and Line B, and every later Post A
transmit returns NO CARRIER. The disconnect is real by construction (Post
A can never deliver again; no hidden recovery) and, if the participant
leaves before it fires, it fires on re-entry. Knowledge: evidence views
(post status, panel, "Inspect the line") are logged; the participant
acknowledges at Post A or at the panel. Attempts before the
acknowledgement are `pre_knowledge` (never continuation); the first Post
A attempt after it is the excluded `confirmation_probe`; later ones are
`postknowledge_transmission`s; any Post B delivery after the disconnect is
`alternative_used`.

Raw components (ledger names): `disconnect_acknowledged`,
`confirmation_probe_excluded`, `postknowledge_transmissions`,
`alternative_used`; contextual: demonstrated ms, evidence views/sources,
pre-knowledge attempts, first success channel, successes on A before the
disconnect, reports delivered, every transmission with its classification.
Closure at shift end: completed iff demonstrated AND acknowledged; never a
successful transmission → censored; unacknowledged →
`insufficient_opportunity` (invalid). M24 and M26 share no object, window,
event family or raw attempt (asserted statically and on the live stream).

### 11.9 Event-family isolation and missing/invalid handling

Families (ledger-exact): `proto_m05_initiation_`, `proto_m19_valve_`,
`proto_m20_antenna_`, `proto_m23_field_recovery_`,
`proto_m24_magnet_utility_`, `proto_m26_channel_` — pairwise disjoint
from each other, from `secondary_field_action_*` and from the foundation
depleted-search family (pure test 10). Every item-owned event carries
measure id, opportunity id, window id, entry-state version,
form/counterbalance/occasion, presented timestamp, comprehension state,
window status, validity status + reason, input mode; closures carry the
raw components and active ms. Missing (censored / absent), invalid
(`insufficient_opportunity`, technical failure via the scene's guard →
`technicalFailure`) and stopped/completed observations are distinct
register states; none becomes a low value (route tests 2 and isolation 1).
Developer launch of the yard contaminates every route window (isolation 2).

### 11.10 Tests (retries=0, workers=1, `PW_DEV_PORT=5321`)

- Pure: `pilot_exterior_models.spec.ts` **12/12** (signal monotone + forms,
  dig/reach + conservation, cache persistence, M19 schedule + terminals,
  M20 start persistence with no end field, deterministic deck, one
  position per committed cycle, zero reward after depletion, M26
  knowledge gate, family disjointness, missing/invalid/technical
  semantics, static no-score/no-canonical/no-wording contact).
- Route (`pilot_yard.spec.ts`, 3 tests), isolation
  (`pilot_exterior_isolation.spec.ts`, 2), capture
  (`pilot_exterior_capture.spec.ts`): **6/6 green** before the correction
  round (17.9 min batch); after the correction round the focused set ran 17/18
  (the single failure was a register-detail string moved by the
  single-marker change; `ItemWindow.stop` now carries the reason detail)
  and the affected route test 2 + the 12 pure tests re-ran **13/13**;
  route 1 after the corrections: item-owned active 240 s (M20 start 9 s),
  wall 285 s. The e2e gate lane was tightened afterwards (helper only).
- Regression scope (18 spec files, 139 tests, 40.2 min): **137 passed, 2
  failed**, both reproduced in isolation (deterministic) and both outside
  Unit 4's touched code paths: (a) `magnet_salvage_ip.spec.ts` "recycler
  rig" (`cast never produced proto_m24_pull #5`) exercises the legacy
  Coolant-Yard salvage modules (`src/gameplay/iceSalvage*`,
  `src/measurement/m24SalvageExhaustion.ts` — untouched; the spec was
  not part of Unit 3's green set); (b) `pilot_visual_capture.spec.ts`
  "dock, concourse, workshop" (`door at 48,272 did not reach
records_workshop`) — the same Concourse west door passes in
  `pilot_route`, `pilot_episodes_1_2` and `concourse_interaction_lifecycle`
  in the same batch. Both are recorded as pre-existing pending a
  base-checkout confirmation (next session), not silenced. Green in the
  batch: evidence_ledger 11, pilot_coverage 8, pilot_route_model 8,
  signal_incident_models 10, field_actions_models, ip_engine 15,
  ip_boundaries 3, pilot_lab 3, pilot_signal_incident 2, pilot_episodes_1_2
  2, pilot_route 4, concourse_interaction_lifecycle 3, inventory_foundation,
  inventory_measurement_isolation, field_actions_lab, field_actions_measurement,
  the other magnet_salvage_ip tests and the other pilot_visual_capture tests.
- `lint:tsc` ✓ · scoped ESLint ✓ · `git diff --check` ✓ · production build:
  ✓ (`vite build`, 2.6 s).
- Allowlist: run without `CLAUDE_UNIT_ALLOWLIST`; the commit stages the
  Unit 4 files by explicit path (list in §11.1).

### 11.11 Screenshots (participant view, 800×600, real input)

`docs/verification/screenshots-evidence-led-pilot-v2/`: `09-exterior-arrival`,
`10-m05-cable-flag`, `11-m19-coupling-iced`, `12-m20-antenna-started`,
`13a/13b/13c-m23-scan-{no-signal,faint,actionable}`, `14-m23-recovery`,
`15-metal-recovery-yard`, `16-m24-timing-window`, `17-m24-cycle-result`,
`18-m24-depleted`, `19-m26-disconnect-evidence`,
`20-m23-persistent-excavation`, `21-return-route`, `21a-return-mission-log`
(the inventory-full field cache is exercised and asserted by route test 3;
no standalone frame). Inspected at full resolution: 09, 11, 12, 13c, 16,
18, 19, 20, 21 by the writer; all 16 by the visual reviewer. Frames 19–26
of `screenshots-professional-pilot` were re-targeted to the new yard.

### 11.12 Reviews (two waves of two, read-only) and the correction round

- **Scientific (Opus)** — no leak, families disjoint, adaptive vs
  inappropriate persistence separate, no gating; two majors **fixed**:
  (1) review-closure of M19/M23 now CENSORS (`stop` with
  `closed_at_review`) instead of completing; (2) guidance is terminal on
  window ENTRY or an explicit step-away — never at an acknowledgement or
  depletion (`exteriorSiteDone`, `guidance_dismissed`); M23 tightening
  **fixed** (strategy shift needs an exact empty dig AND ≥ 24 px
  relocation; informative moves need on-plot previous and current
  sweeps); minors **fixed**: technical failure no longer writes a
  `stop_choice`; the unacknowledged M24/M26 path carries ONE terminal
  marker (`insufficient_opportunity` via `ItemWindow.stop`); M26 records
  `postknowledge_transmissions_after_delivery` and
  `confirmation_probe_rule_applied` / `confirmation_probe_made`; the M05
  register semantics (`entered` = shown) are documented in the room doc.
  Owner decisions recorded (§11.14): B-first M26 (acknowledgement stays
  available at the line panel and Post A), M19 fully-informed difficulty
  (ledger says pilot the adaptive band first), M05 fixed-distance gate
  (distance recorded, not enforced — same as occasion 1), the foundation
  developer-lab adapters sharing the ledger prefixes.
- **Gameplay (Opus)** — majors **fixed**: guidance no longer pins on a
  declined site (each site panel's "Step away" releases guidance);
  the Sorting Bench moved ≥ 100 px from the rig, off the entry path, and
  now opens a confirming card ("Sort the recovered stock") so the M24
  alternative is a deliberate act; the M23 brief stays in the stake panel
  above the counters; objective lines name the E step before C/D and F;
  ESC named in the rig brief; label pile-ups (MAST 04 sign, heat gun,
  coupling chip flush left, tray vs banner) repositioned; the cable-flag
  flap honours reduced motion; room-doc drift corrected. Deferred (not in
  the allowlist / owner call): the winch hint clamp and timing-UI depth
  (foundation `magnetWinchController.ts`), `sfxUnavailable` on an
  out-of-band lock and scene-wide pointer lock (foundation), "Noor: Go
  on." wording, Records Workshop "Recovery Yard"/"Metal Recovery Yard"
  naming, 10–11 px chip text size, snowfall/pulse under reduced motion
  (shared), the `not_diggable` refusal text (foundation).
- **Test quality (Sonnet)** — tsc ✓, 39/39 pure (4 specs) ✓, one ESLint
  `preserve-caught-error` finding **fixed** (`cause` attached); pure proof
  list 12/12 COVERED; route/isolation proofs COVERED or representative;
  the completed/exited/never-opened × recovered/exited/missing ×
  fresh/depleted/never-opened matrix is covered ACROSS specs (route 1 =
  completed chain, route 2 = stopped/exited chain incl. departure and
  re-entry, isolation 1 = never-opened chain); `waitForTimeout` calls are
  UI-settle waits beside probe/event waits, never state substitutes; no
  window mutation, no vacuous assertion found.
- **Visual (Opus)** — reviewed the frames; items already covered by the
  correction round: static `FROZEN` sign copy → `COOLANT LINE — COUPLING`;
  valve chip under the sprite (moved down); mast chip pile-up near the
  stake (chip relocated above the tower, sign removed); chip vs banner
  duplication (chip keeps the tally). Deferred as foundation/shared:
  timing-hint clamp and band visibility/depth, pickup toast depth, world
  chips under a modal panel, HUD strip under the map modal, `CYCLES 0`
  at the resolved-hold instant (repaint precedes the resolution callback
  by the 700 ms hold — a capture instant, not a count defect). Asset gaps
  (recorded, none promoted): plain excavated-cell decal, plain airlock
  tile, hotbar icons 4–6, banner style, the corner mute-icon wedge.

Correction rounds used for Unit 4: **1 of 1** (consolidated; re-verified
by the final focused run above).

### 11.13 Timing (automated; not a human estimate)

Planning target 300 s. Route test 1 (full operation by real input, from
the Dock): item-owned active **236 s** (M05 fix + M19 + M23 + M24 + M26
window active time from `window_closed.active_ms`, plus the M20 start
window's 6 s to the second stage) — inside the 300 s envelope (asserted
≤ 300 s); wall **284–293 s** from the Dock including the whole Unit 1–3
spine and every walk; exterior-only wall ≈ 210 s. Modal/idle time is not
excluded from `active_ms` beyond the pause-on-departure rule; automation
walks faster than a person and never pauses to read, so no human duration
is claimed.

### 11.14 Open research-owner decisions (Unit 4)

1. Stop semantics: an explicit "Step away"/"Stop" closes M19/M23 as a
   COMPLETED observation with `exit_state: 'stopped'` (stop is the
   behaviour); a shift end closes with `stop_choice: ended_shift_outside`;
   only the Utility-Deck review censors. Confirm or route stops to
   censoring.
2. M24/M26 unacknowledged closure = `insufficient_opportunity` (invalid);
   never depleted / never disconnected = censored (missing). Confirm.
3. M26 first success on Post B triggers the disconnect (recorded as
   `first_success_channel: 'B'`, `successes_on_a_before_disconnect: 0`);
   whether such records are analysable, or the brief should force A.
4. M19 difficulty is fully explained (thaw passes shown); the ledger asks
   for the adaptive band to be piloted before interpreting persistence.
5. M05 occasion 2 records presentation distance rather than enforcing a
   fixed band (identical to occasion 1); confound or gate.
6. The foundation developer-lab adapters (`m23FieldRecovery.ts`,
   `m24MagnetUtility.ts`) share the ledger prefixes/opportunity ids with
   the route windows (first-write-wins on the register; reachable only in
   contaminated developer sessions) — rename or retire.
7. `yardJobs.ts` (old M22/M25 ambient orchestration) is no longer hosted
   by the yard; its Utility-Deck finalisation remains a no-op. Retire in
   Unit 5 when M22 moves to the Workshop Return.
8. Two pre-existing deterministic failures (§11.10) need a base-checkout
   run to confirm they predate this branch.

### 11.15 Confirmations

No disposition, canonical event, scoring formula, weight, trait label or
score was created or changed; `ScoringManager`, `CanonicalEventContext`,
`EventLogger`, `SessionState`, `QualtricsBridge`, `event-schema.md` and
`scoring-plan.md` do not reference any Unit 4 family (asserted by pure
test 12); no M20 end event exists; no Core/assessment completion was
touched; no questionnaire wording appears in `src/`. Nothing was pushed,
merged, tagged, deployed, PR'd, deleted or removed.

### 11.16 Checkpoint for the next session

Branch `fable-evidence-led-pilot-v2`, HEAD = the Unit 4 commit (see §2),
working tree clean. Next: Unit 5 (Return, Revision & Handover — M03(2),
M07-end, M09-end, M10-end, **M20-end/resume** via the Workshop Return feed
console using `M20_RESUME_WINDOW_ID` and the open start window, M21, M22,
M25 questionnaire probe), starting with a base-checkout run of the two
pre-existing failures above.
