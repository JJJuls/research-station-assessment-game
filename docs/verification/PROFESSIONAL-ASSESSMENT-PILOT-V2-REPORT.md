# Professional Assessment Pilot V2 — Report (Units 0–8)

**Status: Unit 8 (final verification) complete — see §15. Verification
closed with three unresolved possible-regression rows, two specs that
exceeded their deadline unclassified, and the inherited failures recorded
rather than repaired; a hands-on human timing pilot is still outstanding.
No product source was modified in Unit 8.** Nothing was pushed, merged,
tagged, deployed or removed; every commit is local.

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
| `7ec425d` | feat(game): integrate exterior recovery assessment    | see §11.1                                                                                                                                                                                                                                                                                                                                                   |

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

Branch `fable-evidence-led-pilot-v2`, HEAD = the Unit 4 commit `7ec425d` (see §2),
working tree clean. Next: Unit 5 (Return, Revision & Handover — M03(2),
M07-end, M09-end, M10-end, **M20-end/resume** via the Workshop Return feed
console using `M20_RESUME_WINDOW_ID` and the open start window, M21, M22,
M25 questionnaire probe), starting with a base-checkout run of the two
pre-existing failures above.

## 12. Unit 5 — Return, Revision & Handover (M03(2), M07/M09/M10 end, M20 resume, M21, M22, M25)

### 12.1 Inherited-failure classification (Part A)

Both Unit 4 regression failures were re-run isolated twice at
`--retries=0 --workers=1` (`PW_DEV_PORT=5321`) before any Unit 5 edit.

| Failure                                                    | Run 1                                                                     | Run 2       | Classification                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| ---------------------------------------------------------- | ------------------------------------------------------------------------- | ----------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `magnet_salvage_ip.spec.ts` "recycler rig"                 | ✓ 1.1 min                                                                 | ✓ 42 s      | **Not deterministic.** Passes in isolation; every file on its path (`e2e/magnet_salvage_ip.spec.ts`, `e2e/helpers.ts`, `e2e/journey.ts`, `src/scenes/CoolantYardScene.ts`, `src/gameplay/**`, `src/measurement/**`, `src/fieldActions/**`, `src/world/RoomScene.ts`, `src/systems/**`, both configs) is byte-identical to base `0e1a8aa` (`git diff --stat` empty). The Unit 4 batch failure (`cast never produced proto_m24_pull #5` inside a 40-minute batch) is a load flake on base-identical code. **No fix** (not deterministic).                                                                                                                                                                                                                          |
| `pilot_visual_capture.spec.ts` "dock, concourse, workshop" | ✘ `door at 48,272 did not reach records_workshop` (`pilotHelpers.ts:275`) | ✘ identical | **Deterministic, spec-driver defect.** Root cause: the capture spec pressed option 1 twice at Vale; since Unit 2 (`7824ab0`) "Understood." chains the voluntary watch/delivery offers as follow-up stages, and prompts confirm on **ENTER only** (`RoomScene.ts:1323`; SPACE does nothing while a prompt is open), so the offer stage stayed open and the avatar could never reach the west door. The participant path is sound (the same door passes in `pilot_route`, `pilot_episodes_1_2`, `concourse_interaction_lifecycle`). **Fixed in the spec only**: the spine's dismissal sequence ("Ask me again later" ×2, then the handover confirmation) now runs before the door; no assertion weakened, no sleep added, no screenshot replaced to hide anything. |

Base execution: the two clean worktrees at `0e1a8aa`
(`opus-concourse-interaction-hotfix`, `fable-professional-assessment-pilot`)
have no usable `node_modules` (no `@playwright`, no `vite`) and installing
is disallowed, so **no base execution was run**; the classification rests
on the isolated reruns and the byte-identical code-path comparison. The
capture spec is not claimed pre-existing at base (its Vale step was
rewritten in Unit 1 and broken by Unit 2's scene change).

### 12.2 Exact changed files

| Area                        | Files                                                                                                                                                                                                                                                                                                                                                                                                                     |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Pure models (Node-testable) | `src/pilot/return/{returnEpisodeModel,m21ManualModel,m22ReportModel,m25HandoffModel}.ts` (new); `src/pilot/exterior/m20AntennaModel.ts` (resume/end phase)                                                                                                                                                                                                                                                                |
| Window adapters / surfaces  | `src/pilot/windows/returnWindows.ts` (new), `returnSurfaceModels.ts` (new), `reviewClosure.ts` (M03 / M20-resume / M21 / M22 / M25 closures), `exteriorWindows.ts` (mission-log closure on completion; review comment), `m07Calibration.ts` (`presentM07End`, phase metadata, `start_state`), `m09MonitorWatch.ts` (check window ids per phase, `m09Check2Due`), `m10ComponentPromise.ts` (phase metadata, `handed_over`) |
| Inventory / items           | `src/inventory/m03Reset.ts` (ledger window ids `m03_reset_o1/o2`, occasion + episode fields, ledger raw names, exposure rule, `closeM03AtReview`); `src/gameplay/items.ts` (`relay_unit`)                                                                                                                                                                                                                                 |
| Scenes / sites / keys       | `src/scenes/RecordsWorkshopScene.ts` (four return stations, surfaces, handover desk + M25 notice, chips, probe), `src/scenes/StationConcourseScene.ts` (neutral Vale/Kai return beats, changed gauge reading, status strip, check-1 mention), `src/pilot/zoneSites.ts`, `src/data/researchInteractions.ts` (four `pilot*` keys)                                                                                           |
| Tests                       | `e2e/returnHelpers.ts` (new), `e2e/pilot_return_models.spec.ts` (14 pure, new), `e2e/pilot_return.spec.ts` (3 route, new), `e2e/pilot_return_capture.spec.ts` (frames 22–34, new), `e2e/pilot_visual_capture.spec.ts` (Part A driver fix), `e2e/pilot_records.spec.ts` (M03 window-id pin), `e2e/pilot_exterior_models.spec.ts` (M20 resume now implemented)                                                              |
| Docs                        | `docs/game/rooms/12-workshop-return.md` (new), this report, `docs/verification/screenshots-evidence-led-pilot-v2/22–34*.png`                                                                                                                                                                                                                                                                                              |

Untouched: the workbook, the ledger, `event-schema.md`, `scoring-plan.md`,
`ScoringManager`, `EventLogger`, `SessionState`, `QualtricsBridge`,
`DataQualityTracker`, `ResearchRuntime`, `package*.json`, `yardJobs.ts`
(still an unused no-op host; retirement stays an owner decision).

### 12.3 Route

Sheet 11 row 5 — the ONE purposeful return: Recovery Yard airlock →
Diagnostics Laboratory (Kai redirects) → Station Concourse (status strip
`exterior shift logged · return shift open`; Kai beside the desk; the
gauge chip shows the CHANGED reading `loop 1.4 bar ▼ · bus 26.1 V ▼`) →
Vale's check-in (`workshop_return`) → Records Workshop return shift. The
workshop keeps every Unit 2 station and adds four return stations placed
by the D-V2-1 rule off the y = 272 lane: Station Feed Console (480, 224),
Relay Bench (192, 384), Shift Report Desk (608, 320), Outbound Handover
Desk (608, 96). Guided order (beacon only): Press B → Relay Bench → Report
Desk → Handover Desk → board; the feed console and the calibration bench
are deliberately never guided (uncommanded resume / natural return) and
the board copy names neither. Sign-off → `deck_closure`; the core console
still offers only "Return to the station" before that stage (route test
2). No Utility/Core closure, completion or Qualtrics return was touched.
Kai is also an M10 recipient in the laboratory (episode 3, Unit 2
design): a participant may hand the component over there; the route
tests withhold it to exercise the return handover.

### 12.4 M03 occasion 2

Press B (existing matched-occasion architecture): three press cycles seed
the same five residuals in the same slots (`fixed_identical_layout`,
recorded as `form`); the panel close is the observation. Window ids now
match the ledger (`m03_reset_o1` / `m03_reset_o2`, with `occasion` and
`episode_number` on every event); the closure writes the ledger raw names
(`objects_restored`, `homes_correct` — one marked home — `close_state`)
beside the surface state. Distinguished: no exposure (batch never run →
absent at review), insufficient exposure (panel closed < 2000 ms →
`insufficient_opportunity`, invalid — route test 3), exited untouched
with sufficient exposure (a valid observation — route test 2), technical
failure (seed failure, unchanged). One occasion never writes the other
(pure test 1; route test 1 asserts occasion A untouched by B).

### 12.5 M07 / M09 / M10 start–end linking

Every two-phase event carries `phase`, `start_window_id` and
`end_window_id` (`phaseMetadata`, one table in `returnEpisodeModel.ts`
proven against the ledger by pure tests 3–6). M07: `end_presented` on the
return entry with `start_state` present / missing / completed; a bench
first opened on the return logs `end_opened_without_start` and closes
with `start_state: 'missing'` — never a low value (route test 2). M09:
check 1 / check 2 own `m09_check_1` / `m09_check_2`; check 2 is due at
`return_hub` and is never closed by a detour; the return reading is a
changed operational state; Vale's return line is the same neutral "still
yours" mention as the incident beat (equal exposure; the gauge
parenthetical was removed). M10: Kai's line is neutral (never asks); the
handover is an option chosen while carrying; feedback "Received — logged
with the calibration set." M09 and M10 use different stations, modules
and events (pure test 6; route tests 1–3 cover complete / omitted in
every combination).

### 12.6 M20 resume semantics and state histories

The SAME opportunity (`proto_m20_antenna_restoration`) continues at the
feed console under `m20_antenna_resume` (`M20_RESUME_WINDOW_ID`): the
window id switches when the resume opportunity is PRESENTED (workshop
entry at ≥ `return_hub` with a valid start), every later event carries
`phase: 'end'` + both window ids, and `window_closed` exists only in the
resume phase. Sequence: valid start → unresolved feed (chip `ALIGNMENT
PENDING`) → return → console available → resume / delay / inspect / leave
→ three routine console stages (power → align → lock, timed on the
surface clock) → completion, or closure at the review as a COMPLETED
observation (`returned` / `completion` as they stand) whenever the resume
was presented (a never-presented start still censors, Unit 4 rule). Raw
(ledger names): `progress_pre_interruption`, `returned`, `resume_latency`
(presentation → resume act), `useful_resume_actions`, `completion`;
context: `start_history`, stage lists, `interruption_to_return_ms`,
console inspections / departures. Histories (pure test 8; route tests
1–3): valid, exited (`start_not_interrupted`), missing
(`resume_unavailable` once, no fabricated start, no resume), invalid
(presented; record stays invalid), technical failure (console offline),
closed, partial outdoor start (console stages completable, `completion`
stays false — never manufactured), scene recreation (state re-rendered).
No M19/M23/M24/M26 outcome is read anywhere on the path.

### 12.7 M21 manual-based repair

Relay bench work surface: a storm-damaged distribution relay unit (plate
read by INSPECT, posts J1–J4, line selector L1–L3 initially L2), an
informative BENCH TEST (jumper mismatch / line class mismatch / pass —
never which post), FIT, SET ASIDE (explicit stop), LEAVE (departure,
window open). Drawer manual: four concise cross-referenced sections (§1
identify → §2 jumper rule → §4 variant table; §1 → §3 selector rule),
each in TEXT and an equivalent DIAGRAM mode; the answer follows from the
plate code through two rule hops and is stated nowhere. Two matched forms
(`RELAY 7K/B` → J1 J3 L3; `RELAY 7R/C` → J2 J4 L1). Pointer and keyboard
converge on the surface's single `onActivate` path (system, keyboard and
pointer input modes asserted on the live stream). Recorded (ledger names
first): `reference_sections_used`, `cross_reference_depth` (hops followed
inside the manual), `reengagement` (manual after a failed test; bench
reopened unfinished), `correct_rule_application`, `completion`; context:
section visits, reference follows, mode switches, plate inspections,
repair actions, invalid actions, revisions (changes after a test), tests,
time by phase (manual / unit, active only), departures, stop choice,
output delivery. Nothing infers the construct from opening the manual;
reading time is context only. The fitted unit is a physical output
(`relay_unit`): belt full → a recoverable bench bundle (route test 3, belt
filled outside beforehand).

### 12.8 M22 setback and revision

Shift report desk work surface: assemble ≥ 3 of six fixed subsystem lines
into four ordered slots (direct assembly, no cards), SUBMIT. The first
valid submission is RETURNED with one standardised criterion — every line
must carry its work-order tag from a register that only now opens beside
the report (visibly changed evidence; identical for every form; not a
misleading control). ACKNOWLEDGE (comprehension) before editing; attach
tags; resubmit. Feedback names how many lines still lack a matching tag
(actionable, never which). Distinguished raw facts: initial action,
setback presented, setback comprehension, inspection (register opened),
strategy change (first consistent edit), repeated unchanged action,
useful revision (`feedback_consistent_edits`, mismatched tags counted
separately), other edits, progress, `resubmitted`, `recovery_complete`,
exit (departures; WITHDRAW = explicit stop), technical failure. Closure:
accepted → completed; withdrawn after the acknowledgement → completed
observation (recovery false); setback never acknowledged →
`insufficient_opportunity`; never submitted → censored at review. No
loop, no random success, no endurance.

### 12.9 M21 / M22 independence

Different opportunity / window ids, families (`proto_m21_manual_` vs
`proto_m22_report_`), objects (`m21_relay_bench` vs `m22_report_desk`),
state objects and counters; the pure models never import each other; the
adapter's M21 block never reads M22 state and vice versa (pure test 11);
M22 runs to recovery with M21 never entered / exited / set aside (pure
test 11; route test 2 exits M21 early then completes M22). The handover
desk offers a neutral equivalent (the notice, no relay unit) when M21 has
no output.

### 12.10 M25 decision

Workbook: QUESTIONNAIRE-PRIMARY / HYBRID REQUIRED; no in-game probe
wording is authorised anywhere in the repository (CLAUDE.md forbids
questionnaire wording in player-facing text; no approved hybrid prompt
exists; `QualtricsBridge` carries no M25 item). Implemented: the
**handoff shell only** — a transparent notice at the outbound handover
desk ("SHIFT QUESTIONNAIRE NOTICE … Nothing is answered here …") with one
acknowledgement; window `m25_probe_w1` is a presentation record
(`direct_belief_probe: null`, `administration:
questionnaire_primary_pending_external`, `in_game_response: null`); no
locked-command repetition task is hosted; nothing is inferred from M22 /
M24 / M26. The exact item stays in Qualtrics. Recorded as an open owner
decision (§12.17).

### 12.11 Event-family isolation

Families `proto_m03_`, `proto_m07_calibration_`, `proto_m09_watch_`,
`proto_m10_promise_`, `proto_m20_antenna_`, `proto_m21_manual_`,
`proto_m22_report_`, `proto_m25_probe_` are pairwise disjoint from each
other, from every Unit 4 family and from the secondary families (pure
test 14); every Unit 5 event type is unique; every item-owned event
carries opportunity id, window id, validity status and input mode; no
`study_item_ids`, `construct_id` or `success` on any event (route test 1).
`ScoringManager`, `event-schema.md` and `scoring-plan.md` mention no Unit
5 family (pure test 14). Navigation (`pilot_*`) and the handover tray
(`pilot_handover_placed`) remain unmapped route telemetry.

### 12.12 Missing / invalid handling

Absent (never opened → `markAbsent` / `participant_absent`), censored
(entered, unfinished at review; M03 unfinished batch), invalid
(`insufficient_opportunity`: M03 exposure < 2 s, M22 unacknowledged
setback; technical failure via the kit), stopped observations (M21 set
aside, M22 withdrawn, M20 presented-not-resumed at review, M07 unfinished
at review) are distinct register states; none is a low value (pure tests
8, 13; route tests 2–3).

### 12.13 Timing (automated; not a human estimate)

Planning target 265 s. Route test 1 (full return shift by real input,
from the Dock): **item-owned active 91 s** — work surfaces 74 s
(`active_ms` of the M07 / M20 / M21 / M22 / M25 closures, paused whenever
a surface is closed), M03 occasion 2 exposure 6 s, M09 check 2 due→read
11 s; the M10 handover is one prompt option (a few seconds; its window
spans the whole route by design and is not summed). Wall **287 s** from
the Dock including the whole Unit 1–4 spine; the return episode alone is
roughly 150 s of wall time. Route/transition overhead (yard → laboratory
→ Concourse → workshop, three doors) ≈ 25 s; modal/instruction time
(Vale, Kai, board, notice prompts) ≈ 15 s. Automation walks faster than a
person and never pauses to read, so no human duration is claimed; the
envelope is asserted (≤ 265 s) not the human estimate.

### 12.14 Tests (retries=0, workers=1, `PW_DEV_PORT=5321`/`5322`)

- `lint:tsc` ✓ · production build ✓ (`vite build`, 2.2 s) · scoped ESLint
  ✓ (autofix for formatting only) · `git diff --check` ✓.
- Pure: `pilot_return_models.spec.ts` **14/14**; `pilot_exterior_models.spec.ts`
  **12/12** (test 5 updated: the resume phase now exists; every end field
  is still null before the return).
- Route: `pilot_return.spec.ts` **3/3** after the correction round (test 1 the
  complete shift; test 2 omissions, missing starts, overlays between start
  and end, core locked, M21 exited then M22 completed, Press B untouched,
  repeated entry, set-aside; test 3 handover with the gauge omitted,
  partial antenna start resumed but not completable, insufficient-exposure
  Press B recorded, held ENTER, belt-full relay unit as a bench bundle,
  M22 withdrawn, world frozen under a surface). Seven driver defects were
  found and fixed on the way (all e2e-only): the offer-stage dismissal at
  Vale, Kai's lab handover option shifting the briefing card, Kai's boxed
  column (rows 5/11 blocks) and the gauge's contested approach (48 px from
  the Dock door — a production placement hazard recorded for the owner),
  the handover column (x = 564 → 576), probe staleness under a paused host
  (probe now refreshed from surface rebuilds), and the M07 settle
  re-render (a Unit 2 bench defect: the ADVANCE control stayed
  "Settling…" until another activation — fixed via the surface clock).
- Capture: `pilot_return_capture.spec.ts` green (frames 22–34, regenerated after
  the correction round so 32–34 show the accepted state).
- Regression scope: 23 spec files, 159 tests, 1.2 h: **150 passed, 9 failed**, every
  failure diagnosed: (a) ×3 the M03 exposure floor invalidating quick
  panel closes (`inventory_measurement_isolation` M03, `pilot_records` M03,
  `pilot_deck` review) — **reverted** in the correction round (exposure is
  recorded, never a validity marker; the generic Final Core closure
  handles M03 as before); (b) `pilot_episodes_1_2` episode 1 and (c) the
  two Unit 5 route tests — the contested gauge approach and the handover
  column, driver fixes above; (d) `pilot_records` "supply bundles" asserts
  no `proto_m0*` event on a spine that has emitted the Unit 2 system-driven
  presentations since `7824ab0` — pre-existing, not in Unit 4's green list,
  recorded (not silenced); (e) `pilot_route` topology walk — the known
  intermittent Concourse→Dock door timeout under long batches (Unit 3 §6);
  (f) `pilot_visual_capture` leg 1 now passes the fixed Vale step and
  stalls at the M02 overlay under batch load. Targeted rerun after the
  correction: 49 passed, 5 failed — failing: 6 e2e\pilot_deck.spec.ts:172:7 › review, explici; 27 e2e\pilot_records.spec.ts:650:7 › supply b; 36 e2e\pilot_return_models.spec.ts:372:7 › 8. every M2; 47 e2e\pilot_route.spec.ts:121:7 › six-zone hub-and-loop:; 50 e2e\pilot_visual_capture.spec.ts:117:5 › pilot route visual capture — dock, concourse, workshop (1.9m). Green in the batch: evidence_ledger 11,
  pilot_coverage 8, pilot_route_model 8, signal_incident_models 10,
  field_actions_models, pilot_exterior_models 12, pilot_return_models 14,
  concourse_interaction_lifecycle 3, inventory_foundation,
  inventory_measurement_isolation (all but M03), field_actions_lab,
  field_actions_measurement, pilot_lab 3, pilot_signal_incident 2,
  pilot_yard 3, pilot_exterior_isolation 2, the other pilot_deck / route /
  records / capture tests.
- Allowlist: run without `CLAUDE_UNIT_ALLOWLIST`; the commit stages the
  Unit 5 files by explicit path (§12.2).

### 12.15 Screenshots

`docs/verification/screenshots-evidence-led-pilot-v2/`:
`22-return-airlock-entry`, `23-station-status-changed`,
`23b-workshop-return-overview`, `24-m03-occasion-2-workspace`,
`25-m07-end-opportunity`, `26-m09-gauge-opportunity`,
`27-m10-handover-opportunity`, `28-m20-feed-console-persisted`,
`28b-m20-console-stage-in-progress`, `29-m21-manual-inspection`,
`30-m21-repair-manipulation`, `31-m22-setback`,
`32-m22-revised-recovered`, `33-m25-questionnaire-handoff`,
`34-final-objective-utility-deck` (800×600 participant view, real input).
Inspected at full resolution by the writer: 23, 23b, 28, 29, 31, 33 (and
23b/31 again after the fixes); all 15 by the visual reviewer. Corrected
from the first pass: the M22 criterion overflowing the feedback strip
(short feedback + wrapped strip), the console chip colliding with the
report-desk proximity labels, the tray chip vs "WORK ORDERS", the bench
chip vs "STORAGE · ASSEMBLY", the Concourse status strip over the
incident-desk decor.

### 12.16 Reviews and correction disposition

Two waves of two, read-only. **Correction rounds used: 1 of 1.**

- **Scientific (Opus)** — no scoring/authority breach; ids and families
  match the ledger and are disjoint; missing/invalid/censored distinct.
  BLOCKER B1 (M20 `completion` structurally false for a partial outdoor
  start; refused mast attempts unlogged) — **fixed** in part: `completion`
  is now `null` while an outdoor stage remains (never false by
  construction); reopening the outdoor stages after the return and
  logging a refused attempt are owner decisions (§12.17.1). MAJ A (M22
  lines named "Mast 04" and cued the uncommanded resume) — **fixed**
  (line replaced by "Coolant loop — pressure log"). MAJ C (resume window
  id stamped on unavailable histories) — **fixed** (logged on the start
  window). MAJ E (`end_presented` after a completed M07) — **fixed**
  (nothing presented for a completed project). MAJ F (M09 mention
  asymmetry) — **fixed** (the offer line counts as the check-1 mention).
  MAJ B (`resume_latency` anchored at workshop entry, confounded with
  M03/M21/M22 time) and MAJ D (`homes_correct` = `objects_restored` with
  one home) — owner decisions (§12.17.3–4). Minors fixed: M03 `scene`
  (`records_workshop`), no fabricated interruption at the review,
  `M20_RESUME_WINDOW_ID` imported. Minors recorded: `revision_started`
  ⇔ consistent edits, unequal M22 tag ceiling, M21 reengagement kinds
  merged into one count (split by event `kind`), M25 acknowledgement is a
  presentation record.
- **Gameplay (Opus)** — no blockers. **Fixed**: silent M22 slot
  activations now give feedback; the belt-full delivery is said; hotkeys
  R/A and K documented; set-aside / withdraw feedback readable (1.6 s);
  the deck lock names the Work Order Board; the board is live at
  `return_hub`; §1 diagram fits the wrap width; the M22 tray no longer
  names the antenna. **Recorded / owner**: the gauge chip may satisfy
  "read the gauge" by looking (M09 semantics); the gauge's approach from
  below is contested by the Dock door (Unit 2 placement — production
  move is an owner/gameplay decision; drivers approach from above);
  Press A/B unsigned and sharing the cutter texture; keyboard focus order
  places FIT / SET ASIDE before the manual and no confirmation on the
  explicit stops (measurement-relevant — owner); M20 chip vs no M07 chip
  (unequal cue exposure — owner); the hidden controls legend (foundation);
  map dismiss-on-any-click (foundation); assemble-note gives no basis for
  which lines (owner).
- **Test quality (Sonnet)** — tsc ✓, ESLint ✓; pure proofs 1–14 all
  COVERED with real state-invariance checks (no vacuous assertion, no
  window mutation); route proofs COVERED across the three tests; the
  reviewer ran out of budget before the helper file, so the "drivers use
  real input" claim rests on the writer's evidence (every driver walks,
  presses and clicks; the only `window` reads are DEV probes).
- **Visual (Opus)** — BLOCKER 1 (frame 34's objective named a door the
  workshop lacks) — **fixed** (`deck_closure` objective now routes via
  the Concourse east door); BLOCKER 2 (stale 32–34) — **regenerated**.
  Majors recorded as foundation/asset work for Unit 6: the interaction
  prompt drawn over the avatar, chip vs prop-label weight, duplicate
  "INCIDENT DESK" labels and title-card overlaps, gauge salience (text
  only), setback salience (measurement-relevant — owner), FIT button
  salience vs BENCH TEST (owner), the 1.2× non-integer upscale, ~14
  interchangeable bench rectangles, the "Fiel" hotbar clip under modals,
  dead floor bands. Asset gaps: distinct silhouettes for interactive
  stations, an analogue gauge face, report state art, door/exit markers
  incl. a Utility Deck marker, legible manual diagram art, grid item
  icons, NPC palette match, a speaker portrait for the handover desk, a
  prompt frame anchored above the target.

### 12.17 Open research-owner decisions (Unit 5)

1. **M25**: no in-game probe wording is authorised — the handoff shell
   records `direct_belief_probe: null` pending external administration.
   Authorise (or not) a transparent hybrid probe text and its storage.
2. **M03 exposure floor**: 2000 ms of residual visibility before a "left
   as it stands" departure counts as a valid observation; below it the
   occasion is `insufficient_opportunity`. Confirm the threshold.
3. **M20 review closure**: a PRESENTED resume opportunity that was never
   taken closes as a completed observation (`returned: false`) at the
   review; a start never re-encountered inside still censors.
   `resume_latency` is measured from the console's availability, not from
   the interruption (both recorded).
4. **M07 missing start**: the end opportunity is presented and recorded
   with `start_state: 'missing'`; whether such records are analysable is
   an owner call (never low).
5. **M21 / M22 explicit stops** follow the Unit 4 ruling (explicit stop =
   completed observation; review = censored); M22's unacknowledged setback
   is invalid, like the unacknowledged M24/M26 closures.
6. **M21 definitions**: `reengagement` (first manual consult after a
   failed test; bench reopened unfinished) and `cross_reference_depth`
   (reference hops followed inside the manual) are implementation
   definitions of the ledger names.
7. **M09 equal reminder**: the check-1 mention rides Vale's incident beat
   and the check-2 mention the return beat, both the neutral "still yours"
   line; the mission-log line remains the one directive reminder per
   check.
8. **M10 in the laboratory**: Kai already accepts the component in
   episode 3 (Unit 2 design); the return handover is therefore one of two
   fulfilment points. Confirm, or restrict the recipient to the return.
9. `yardJobs.ts` (old ambient M22/M25) remains an unused no-op host —
   retire in the verification unit or by owner decision.
10. **M20 partial outdoor start** (scientific B1): the console cannot
    finish a restoration whose outdoor stage remains; `completion` is
    now `null` for that history. Options: keep it structurally
    non-completable, or reopen the outdoor stages after the return (a
    second exterior trip) and log refused mast attempts.
11. **M03 `homes_correct`** (scientific D): one marked home makes it equal
    to `objects_restored`; decide whether the occasion needs ≥ 2 homes.
12. **Concourse gauge placement** (gameplay 2): the natural approach from
    below lies 48 px from the Dock door (Unit 2 layout); a mis-press walks
    the participant out and closes check 1 — move the gauge or the door,
    or accept and record.
13. **Gauge chip vs check** (gameplay 1): the live reading chip could let a
    participant satisfy "read the gauge" by looking without the E read
    that records check 2; keep the chip (state visibility) or hide the
    values until read.

### 12.18 Confirmations

No disposition, canonical event, scoring formula, weight, trait label or
score was created or changed; no assessment completion, Utility/Core
closure or Qualtrics return was implemented; no questionnaire wording
appears in `src/` (pure test 14, source + comments); the workbook and the
ledger are unmodified. Nothing was pushed, merged, tagged, deployed,
PR'd, deleted or removed.

### 12.19 Checkpoint for Unit 6

Branch `fable-evidence-led-pilot-v2`, HEAD = the Unit 5 commit (see §2),
working tree clean. Next: **Unit 6 — Utility & Core closure** (sheet 11
row 6: non-scored finale; Core unlocks only after every required window
is completed/missing/invalid; explicit review; no early irreversible
completion), then Unit 7 (verification: full-suite sweep, the two
pre-existing intermittents, the visual-integration asset gaps above).
Nothing here implements assessment completion or the Qualtrics return.

## 13. Unit 6 — Utility & Core closure (non-scored finale)

### 13.1 Scope

Sheet 11 row 6 (`NONE — non-scored closure`; "Professional payoff only. No
new trait inference, no click-card answer test, no irreversible early
completion") and row 16 ("Core unlocks only after all required windows are
completed/missing/invalid; physical feed sequence is non-scored"). Built:
the Utility Deck (record review + three physical feeds + gated Core door)
and a new Core Chamber zone (inspect, compact operational review, two-step
confirmation, visible stabilisation, neutral completion notice). No item
window, no `proto_*` event, no score, no trait label, no Qualtrics
redirect, no `completeDebugSession` call. M25 stays questionnaire-primary /
pending external administration. The Unit 2 M02-overlay finding was not
investigated (it does not block the Unit 6 participant path — §13.17).

### 13.2 Exact changed files

| Area                  | Files                                                                                                                                                                                                                                                                                                                                                             |
| --------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Pure model / session  | `src/pilot/closure/utilityCoreClosure.ts` (new, Node-testable), `src/pilot/closure/closureSession.ts` (new, session-scope singleton + the only register contact)                                                                                                                                                                                                  |
| Scenes / overlay      | `src/scenes/UtilityCoreDeckScene.ts` (rewritten), `src/scenes/CoreChamberScene.ts` (new), `src/pilot/ui/FeedPanelScene.ts` (new physical overlay), `src/scenes/index.ts`                                                                                                                                                                                          |
| Route / world         | `src/pilot/pilotRoute.ts` (zone `core_chamber`, stage `core_sync`, doors, objectives, chamber-entry flip), `src/pilot/zoneSites.ts`, `src/pilot/ui/StationMapScene.ts` (7th box + link), `src/world/RoomScene.ts` (`RoomDoorConfig.gate`, additive), `src/pilot/PilotZoneScene.ts` (gate passthrough), `src/world/SceneRouter.ts` (alias), `src/constants/key.ts` |
| Copy / registry / art | `src/scenes/StationConcourseScene.ts` (Vale `core_sync` beat), `src/scenes/ExteriorRecoveryYardScene.ts` (Noor stage case), `src/data/researchInteractions.ts` (5 `pilot*` keys), `src/world/proceduralTextures.ts` (10 deterministic textures)                                                                                                                   |
| Tests                 | `e2e/closureHelpers.ts` (new), `e2e/pilot_closure_models.spec.ts` (19 pure, new), `e2e/pilot_closure.spec.ts` (3 route, new), `e2e/pilot_closure_capture.spec.ts` (frames 35–47, new), `e2e/pilot_deck.spec.ts` (rewritten), `e2e/{pilot_route_model,pilot_route,pilot_visual_capture,proc_textures_determinism}.spec.ts`, `e2e/{pilotHelpers,returnHelpers}.ts`  |
| Docs                  | `docs/game/rooms/13-utility-core-closure.md` (new), this report, `docs/verification/screenshots-evidence-led-pilot-v2/35–47*.png`                                                                                                                                                                                                                                 |

Untouched: the workbook, the ledger, `event-schema.md`, `scoring-plan.md`,
`ScoringManager`, `EventLogger`, `SessionState`, `QualtricsBridge`,
`DataQualityTracker`, `ResearchRuntime`, `reviewClosure.ts`, every window
module, `package*.json`.

### 13.3 Readiness model

`deriveRouteReadiness(coverage, { routeAtClosureStage, recordReviewed,
closureErrors })` is a pure READ of the live coverage registry
(`pilotCoverage()` → `deriveCoverage(serializeOpportunities())`), never a
hand-maintained list. Per scheduled item: `completed` → _recorded_;
`censored` / non-technical `invalid` → _recorded with limited evidence_;
`missing` → _not observed_; technical-failure `invalid` → _technical state
recorded_; M25 (questionnaire-primary, presentation window) → _questionnaire
handoff prepared_ (route-terminal once reviewed; research-pending always);
M08/M11 → not scheduled. `pending` (never entered) and `open` (entered,
unfinished) are NOT terminal. Ready ⇔ route ≥ `deck_closure` ∧ record
reviewed ∧ every scheduled item route-terminal ∧ no closure error. Sealed
reasons are one neutral sentence naming a location/task class (operational
label; MAJ-9 stopping-rule windows never named), never an item id, a
validity word, a score or the desired behaviour.

### 13.4 Terminal-state treatment (the explicit review)

The Shift Review Panel's **two-step record closure** (arm → reopen →
confirm, with "Not yet — return to the station" at both steps and the
Concourse door open throughout) runs the committed review-closure model
unchanged: `closeEpisodeWindowsAtReview` (module rules: absent / censored
`closed_at_review` / completed observation) then
`closePilotCoverageAtFinalCore` (generic: censored / `participant_absent` /
`no_opportunity`; already-terminal records never overwritten). It is
offered only at stage ≥ `deck_closure` (board sign-off) and refused under
DEV inspection. This is the readiness step: afterwards every scheduled
item is terminal and the feeds become available. Route test 1 asserts:
nothing pending was promoted to `completed`; obligations closed as
observations; the SA-13 register is byte-identical from the closure to the
stable Core (feeds + synchronisation mutate no prior record).

Design note for the research owner: the record closes at the Utility
review (before the physical finale), not at the Core confirmation as the
old console did — row 16's "Core unlocks only after all required windows
are completed/missing/invalid" is read literally. The Core confirmation
closes the **gameplay route** only. Recorded as §13.14 open decision 1.

### 13.5 M25 external-pending treatment

`closeM25AtReview` (Unit 5) closes the presentation window as a
presentation record (`direct_belief_probe: null`, `administration:
questionnaire_primary_pending_external`). Readiness class
`external_pending`: route-terminal after the review, research-pending
regardless of the presentation record (`externalQuestionnairePending`
always true; pure test 5). Participant copy: "Questionnaire handoff:
prepared — administered outside the station (pending)". No response is
invented; nothing marks M25 completed; the finale never blocks on it.

### 13.6 Three physical feeds (FeedPanelScene over one pure state machine)

Operational order coolant → calibration → distribution (placards, chips,
objective; out-of-order attempts refused neutrally at the station:
"Calibration line unpowered — open the coolant feed valve first."). Each
feed completes exactly once; partial states persist across scene
transitions; ESC always leaves a recoverable state.

1. **Coolant feed valve** — hand wheel: drag the knob clockwise around the
   hub (angle-delta integration) or hold → (← turns back), wall-clock
   integrated (Phaser's smoothed delta under-delivers on SwiftShader);
   travel 0..1 latches OPEN at full travel; gauge needle, sight-glass fill,
   travel arc and label change; world: valve sprite → open, chip `OPEN ·
flowing`, conduit lit, manifold `COOL ●`.
2. **Calibration breaker** — lever on an index scale (drag, or ↑/↓ steps)
   to the placard index 7, then ENGAGE (click / ENTER / SPACE / E);
   off-index engage refused neutrally ("Lever at index n — the placard
   names index 7. Align the lever, then engage."), lever stays; three lamp
   indicators glyph+fill; engaged once; world: bank sprite → on, chip
   `ENGAGED · live`.
3. **Distribution bus** — the single coupler in a tray: lift (drag / SPACE),
   slide along a constrained rail (drag / hold →), SEAT inside the socket
   zone (drop / SPACE); a drop outside the socket or ESC returns the
   coupler to the tray (transactional, `returns_to_tray` counted); seat
   short of the socket refused ("Not seated — slide the coupler into the
   socket, then seat it."); power band propagates → CORE; world: cabinet
   sprite → seated, chip `CONNECTED · live`, door lamp cyan.

No answer cards, no random outcome, no timer pressure, no colour-only
state, no reuse of any M-item evidence, no trait inference from order or
mistakes (refusals are emitted as non-scored `pilot_closure_feed_refused`
context events with their reason and input mode, and counted in the DEV
probe; they are excluded from analysis — §13.14 OD-4).

### 13.7 Core lifecycle

`sealed → accessible → review_open → confirmation_armed → synchronizing →
stable` (`coreCommand`; every transition validates its source state,
rejected commands change nothing, `stable` is final). The deck door's
`gate` re-derives sealed/accessible on every activation
(`coreAccessReady()` = readiness valid ∧ three feeds). Visual states:
inactive (dormant teal sight column), prepared (amber collars/lamps),
synchronising (2.4 s counter tween — 300 ms under reduced motion — fills
the sight column and lights the four collar lamps, `sfxMachineOn`, world
input inert for the ramp only), stable (steady cyan, light pool breathing
at ~3 s, `sfxComplete`, Kai `plv1-kai` → `plv1-kai-done`, status console
`STABLE`). The chamber is entered and left freely before the confirmation
(door sealed only during the ramp).

### 13.8 Explicit confirmation

Core prompt → "Open the synchronisation review" (WorkSurfaceScene,
`core_sync_review`) → `ARM SYNCHRONISATION` → the surface re-renders with
`STAND DOWN` (focus index 0) and `CONFIRM SYNCHRONISATION` (a separate
control, different position) → confirm. One physical press cannot arm and
confirm (the prompt option and the surface are separate keydowns; the
surface ignores `repeat`; after arming the keyboard focus sits on STAND
DOWN, so a held ENTER stands down exactly once — asserted). ESC while
armed stands down and keeps the review open; ESC again closes it. After
the ramp the neutral completion notice opens (`core_completion_notice`,
closable, reopenable from the Core); the Core then offers only the notice;
no second synchronisation exists; map/inventory/doors keep working.

### 13.9 Non-scored event boundaries

Events: `pilot_closure_review_opened`, `_record_review_armed`,
`_record_review_stood_down`, `_record_closed`, `_feed_panel_opened`,
`_feed_refused`, `_feed_ready`, `_core_door`, `_core_inspected`,
`_core_{unseal,seal,open_review,close_review,arm,stand_down,confirm,finish}`,
`_synchronised`, `_stable`, `_completion_notice_opened` — all unmapped route
telemetry via `logScenarioEvent` (no canonical context, no study item, no
`success`) carrying `non_scored: true`, `closure_context_only: true` and
`dev_inspection`. Static (pure test 19, code with comments stripped): no
`'proto_m…'` literal, no `ScoringManager` / `CANONICAL_EVENT_CONTEXT`, no
`QualtricsBridge` / `buildReturnUrl` / `completeDebugSession` /
`location.assign` / `return_url`, no `Q\d\d`, no weight/cut-score. Dynamic
(route test 1): the `proto_*` event count is unchanged from the record
closure to the stable Core; the validity register is deep-equal; no
`objective_completed`, no `pilot_final_core_*`; `page.url()` never
navigates even with a configured same-origin `return_url`
(`pilot_deck.spec.ts`). The four closure facts are reported separately
(`ClosureContext`) — never one boolean.

### 13.10 Navigation / exit

Concourse ⇄ Utility Deck (always), Utility Deck ⇄ Core Chamber (gated on
the deck side; sealed → one neutral reason; the chamber side sealed only
during the 2.4 s ramp). Stages `deck_closure` (beacon: review panel) →
`core_stabilise` (beacon: next feed, then the door) → `core_sync` (flips
on chamber entry; beacon: the Core) → `complete` (no beacon). Map: seventh
box "Core Chamber" north of "Utility Deck" (renamed from "Utility Deck &
Core"), linked; discovered only once entered. Vale's `core_sync` beat
redirects east then north; Noor's return beat unchanged.

### 13.11 Tests (retries=0, workers=1, `PW_DEV_PORT=5321`)

- `lint:tsc` ✓ · production build ✓ (`vite build`, 2.7 s) · scoped ESLint
  ✓ (autofix for formatting/import order only) · `git diff --check` ✓ ·
  `verify-unit.mjs` run with every changed path allowed (explicit list;
  no `CLAUDE_UNIT_ALLOWLIST` env, Unit 4/5 precedent).
- Pure: `pilot_closure_models.spec.ts` **19/19**; `pilot_route_model.spec.ts`
  **8/8** (7 zones, `core_chamber` leaf, sequence ends `utility_core_deck →
core_chamber`, still one purposeful return); `pilot_coverage.spec.ts`
  **8/8**; `evidence_ledger.spec.ts` **11/11**.
- Route (final, on the corrected code): `pilot_closure.spec.ts` **3/3**
  (test 1 participant path 4.9 min; test 2 pointer/refusals/parity/
  recreation 3.5 min; test 3 developer launches 1.6 min);
  `pilot_deck.spec.ts` **1/1** (configured same-origin `return_url` →
  no navigation, no `objective_completed`, M01 censored, only
  review-observation windows read completed); `pilot_closure_capture.spec.ts`
  **1/1** (frames 35–47 regenerated after the correction round).
- Test defects found and fixed on the way (all e2e-only): forbidden-text
  regex matched the `non_scored` flag; the Dock never publishes
  `__pilotCoverage` (test 3 now walks to the Concourse); the former M02
  filing-desk driver step is the deferred Unit 2 overlay finding (the
  censored case now uses the M01 plan board); M05's review disposition
  is a completed observation; the encoded `return_url` parameter contains
  the substring the old no-navigation check looked for; a refusal helper
  that read a stale feedback line on a swallowed key press now retries
  the press and waits for a NEW line.
- Regression scope (20 spec files, sequential, 1.1 h, on the corrected
  code): **green** — `proc_textures_determinism` 2 (manifest pin updated
  for the 10 Unit 6 textures), `pilot_return_models` 14, `pilot_exterior_models`
  12, `signal_incident_models` 10, `field_actions_models` 21, `ip_engine` 15,
  `ip_boundaries` 3, `pilot_return` 3 (Unit 5 endpoint → deck lock →
  workshop), `pilot_yard` 3, `pilot_exterior_isolation` 2,
  `pilot_signal_incident` 2, `pilot_lab` 3, `concourse_interaction_lifecycle`
  3, `inventory_foundation` 26, `inventory_measurement_isolation` 5,
  `field_actions_lab` 8, `field_actions_measurement` 4; plus 3 of 4 in
  `pilot_records`, 1 of 2 in `pilot_episodes_1_2`, 3 of 4 in `pilot_route`.
  **Three failures, none in Unit 6 code**: (a) `pilot_records` "supply
  bundles" — the pre-existing Unit 2 system-driven-presentation assertion
  (Unit 5 §12.14 (d), unchanged); (b) `pilot_route` "six-zone" —
  `expectNoMeasurementEvents` met `proto_m20_antenna_resume_unavailable`,
  the Unit 5 system-driven availability record (`input_mode: 'system'`)
  logged once when the workshop is entered on the return without an
  antenna start; the bare-route helper's tolerance set never learned it —
  **helper fixed** (e2e only, no assertion weakened: the record is not a
  participant act) and the test re-run in isolation (result below);
  (c) `pilot_episodes_1_2` "episode 1" — the M05 initiation press after a
  bare 2.6 s driver sleep produced no `initiated` event under sweep load;
  re-run in isolation (result below); the driver's sleep-based wait is
  queued for the final verification unit.
- Isolated re-runs (retries=0): `pilot_episodes_1_2` episode 1 **passed**
  (1.2 min) — a load flake of the sleep-based M05 driver, not
  deterministic; `pilot_route` "six-zone" **failed again, earlier**, on
  `door at 384,496 did not reach dock` — the known Concourse→Dock door
  intermittent (Unit 3 §6, Unit 5 §12.14 (e)), before the leg the helper
  fix addresses; the helper fix is therefore verified by inspection only
  (the tolerated event is the `input_mode: 'system'` availability record)
  and the test stays on the final verification unit's list. No Unit 6
  code path is involved in either failure.

### 13.12 Screenshots (participant view, 800×600, real input)

`docs/verification/screenshots-evidence-led-pilot-v2/`: `35-utility-arrival`,
`36-core-sealed-early-access`, `37a/37b-coolant-valve-before/after`,
`38a/38b-calibration-breaker-before/after`, `39a/39b-distribution-bus-before/after`,
`40-all-feeds-ready`, `41-core-chamber-accessible`, `42-core-inactive`,
`43-operational-review`, `44-confirmation-armed`, `45-synchronising`,
`46-stable-core`, `47-neutral-completion`. Inspected at full resolution by
the writer (first pass: 35, 36, 37b, 38a, 39a, 40, 42, 43, 44, 46, 47);
corrected from the first pass: the Core door's interaction prompt
colliding with the objective HUD line (door moved into the alcove at
y = 120), the valve panel's feedback line over the `FEED · FLOWING` label
(riser shortened), the breaker's index-10 mark over the readout (track
lowered), the Core rendering as the default placeholder rectangle (now
`proc-core-interface` pedestal) and thin machinery mass around the vessel
(flanking coolant towers + four props); the frames were regenerated after
the correction round. The visual reviewer's frame-by-frame findings are in
§13.14.

### 13.13 Timing (automated; not a human estimate)

Planning target 75 s. Route test 1 (real input, participant path with
obligations accepted, calibration started, partial antenna start) on the
corrected code: **73.8 s wall from the record-closure confirmation to the
stable Core** — including the test's own detours (re-reading the closed
panel, the deliberate out-of-order refusal, re-opening the finished valve
panel, entering and leaving the chamber, ESC/stand-down exercises);
feeds 30.6 s wall (13.2 s inside the three panels); Core review → armed →
confirmed → stable 19.4 s; 95.5 s from deck arrival including the early
sealed-door attempt, the refused feed and a Concourse round trip. The
sealed-door reason, the panels' help lines and the ramp (2.4 s) are the
only fixed waits. Automation walks faster than a person and never pauses
to read, so no human duration is claimed; the closure envelope is met by
automation with slack for reading time.

### 13.14 Reviewer findings and correction disposition

Two waves of two, read-only (scientific + gameplay, then test-quality +
visual). **Correction rounds used: 1 of 1** (consolidated; re-verified by
the final focused run in §13.11).

- **Scientific (Opus)** — verdict: no blocker; terminality-not-success,
  M25 external, MAJ-9, no canonical/scoring contact and the DEV bypass all
  confirmed. **Fixed**: F1 (mission log kept inviting closed work) — after
  the record closes the log shows one neutral notice
  (`setMissionLogNotice`, presentation only, no window touched); F3 (live
  coverage counter on the deck board at any stage) — the numeric count now
  appears only at stage ≥ `deck_closure`, the state word before; F5
  (event attribution) — feed events carry their station's interaction key
  and Core events `pilotCore`; the registry names the event that fires;
  F7 — the raw event count and the "n of 6" numeral left the review
  ("session record active", "all six"); F8 — "four" → "five" closure
  facts. **Recorded, not changed**: F2 → §13.14 owner decisions below
  (OD-1…OD-6); F4 — the "no prior record mutated" claim is narrowed to the
  tested path (register byte-identical from the closure to the stable
  Core without revisiting a measured station; a post-closure revisit
  assertion is queued for the final verification unit); F6 —
  `pilot_closure_*` process data (refusals, stand-downs, arm→confirm
  latency) exist in the export and are **excluded from all analysis by
  this unit's written rule** (room doc) pending OD-4; §13.6's "DEV probe
  only" wording corrected here: refusal reasons are emitted as non-scored
  events, not probe-only counters; F9 (hint label "Calibration bench
  (Workshop)" vs the deck's "Calibration Breaker") — hygiene, the hint
  names the Workshop; F10 — the legacy yard-window parity writes are
  inert on the v2 route.
- **Gameplay (Opus)** — verdict: usable, no blocker; sequence
  understandable, Core never a trap, confirmation deliberate, finale
  satisfying without answer cards; copy audit clean. **Fixed**: F-1 stale
  objective once the feeds are up (deck overrides the line: "Feeds up —
  enter the Core Chamber through the north door."); F-2 closure copy
  implying the exit closes ("Confirming closes the record only — the
  station stays open to you."); F-3 help-line legibility (11 px, faint
  rather than dim); F-4 armed-state signposting ("move focus right (→) to
  CONFIRM"); F-5 a plain click on the coupler tray now lifts it instead of
  rolling back; F-6 door state as text (`DOOR · SEALED/OPEN` chip beside
  the lamp); F-7 Core pedestal texture; F-8 "CORE CHAMBER" sign off the
  approach point; F-10 Vale's `core_stabilise` beat now points at the
  feeds; abbreviations — one token per feed everywhere (sign words).
  **Recorded**: F-9 ESC during the 2.4 s ramp opens the pause menu (the
  ramp resumes cleanly; foundation ESC convention — Unit 8); F-11 the
  shared `sfxComplete` triad is the project-wide completion cue (owner
  call whether the finale should use a flatter cue); the review-panel
  counts + never-entered labels invite late remediation (Unit 1/2 design,
  MAJ-9 scoped — owner call, OD-5); `short_attempts`/`returns_to_tray`
  are input-mode-asymmetric context counters (excluded from analysis, OD-4).
- **Test quality (Sonnet)** — tsc ✓, ESLint ✓, pure 35/35 run by the
  reviewer; all 19 pure proofs COVERED with real state shapes; route
  proofs COVERED; no state injection, no vacuous assertions, positive
  readiness evidence present. **Fixed**: the two sleep-only negative waits
  (`attemptFeedRefused`, `attemptCoreDoorSealed` now wait for the actual
  feedback line), dead code in the timing reducer, `\blow\b`/`\bhigh\b`
  anchoring, quote-agnostic `proto_m` scan. **Recorded**: route-level
  `invalid` / `technical_failure` dispositions are proven at the pure
  level only (the participant spine produces neither without return-shift
  work) and no "all tasks correct" route run exists in this unit —
  both belong to the complete-route run of the final verification unit.
- **Visual (Opus)** — every one of the 16 frames inspected; verdict:
  readable with noted defects, no blocker, register adult throughout, no
  trait/score/item-id language, no flashing (ramp/breathing restrained and
  reduced-motion gated). The consolidated correction round was already
  spent, so the majors are **recorded for Unit 7 (presentation)**, in
  priority order: (V1) the host's `SPACE / E — interact` prompt survives
  as a sliced fragment at the feed-panel edges (hide the proximity prompt
  while an overlay is open, `RoomScene`); (V2) breaker-panel copy
  overlaps (readout vs `CALIBRATION LINE` header; lamp label over its
  glyph, `FeedPanelScene.ts`); (V3) the `CORE · SYNCHRONISING` chip covers
  the avatar at the interaction point (move the chip above the pedestal);
  (V4) the blast door has one texture — open state carried only by the
  lamp + `DOOR · OPEN` chip (open-leaf variant); (V5) the objective line
  inside the chamber still says "Enter the Core Chamber …" (chamber
  override, deck precedent); (V6) duplicated "ENTER or ESC" lines in every
  panel's ready state (drop the suffix from the feedback string). Minors:
  refusal banner over the door prompt; name chip over the `CORE CHAMBER`
  sign; `FEED 3` sign over the utility bot; the `core` theme's walls
  nearly invisible against the void; oversized completion card and
  strip-shaped bus panel; modal panels clip the hotbar caption
  ("Fiel"); Kai unlabeled/static in the chamber; `→ CORE · LIVE` on the
  same-hue band; `dimText` help at 10 px on the WorkSurface. Deferred
  polish: bare mid-deck and chamber floor bands. Asset gaps (none
  promoted): door open-leaf variant, Core vessel state frames, `core`-theme
  bulkhead/perimeter art, deck floor dressing, textured wheel/lever/
  coupler/socket, distinct interactive silhouettes for the three feed
  machines, NPC register mismatch (raster Kai beside procedural props),
  Kai idle/nameplate. The board's `n/24 tasks closed` line is routed to
  OD-3/OD-5.

**Open research-owner decisions (Unit 6)** — recorded, none resolved:

1. **OD-1 Closure placement.** (a) record closure at the Shift Review
   Panel before the feeds and the Core confirmation (as built; row 16 read
   literally), (b) at the Core confirmation as the old console did with the
   gate reading "terminal-or-closeable", or (c) at the review with the
   Concourse door sealed afterwards. Row 6's "no irreversible early
   completion" pulls toward (b)/(c).
2. **OD-2 Mission log after closure.** Hidden behind one notice (as built,
   presentation only), left visible, or reworded.
3. **OD-3 Mid-route coverage counter.** Numeric count only at stage ≥
   `deck_closure` (as built), never, or always; and whether the count's
   treatment of pending stopping-rule windows as closed (MAJ-9 exclusion)
   is acceptable on a participant surface.
4. **OD-4 `pilot_closure_*` process data.** Excluded from analysis by
   written rule (as built), retained as usability/control variables, or
   reserved.
5. **OD-5 Data-quality numerals on participant surfaces.** Counts shown
   (as built), words only, or not shown; and whether the pre-closure
   review's counts/never-entered labels (Unit 1/2 design) may invite late
   remediation.
6. **OD-6 Event-name registration.** `pilot_closure_*` stay unmapped route
   telemetry (Units 1–5 precedent); which document is the export's data
   dictionary (`event-schema.md` carries no `pilot_*` entry).

### 13.15 Remaining asset gaps (recorded for Unit 7, none promoted)

See also the visual reviewer's gap list in §13.14.

Valve/breaker/bus station art (procedural 56×64 / 64×64 silhouettes),
the Core vessel (procedural 112×136), the blast door, a manifold plate,
a review-panel screen; Kai's chamber pose set (`plv1-kai` idle/done reused);
conduit/cover-plate floor art (drawn with Graphics); a Core emissive sheet
(drawn with Graphics); the Core Chamber has no dedicated wall/floor set
(shared `core` theme).

### 13.16 Confirmations

No disposition, canonical event, scoring formula, weight, trait label or
score was created or changed; `ScoringManager`, `EventLogger`,
`SessionState`, `QualtricsBridge`, `DataQualityTracker`, `ResearchRuntime`,
`event-schema.md`, `scoring-plan.md`, the workbook and the ledger are
unmodified; no questionnaire wording appears in `src/`; the Qualtrics
return is not implemented (the old console's navigation was removed from
the Core path — the redirect is a separate future unit); the M25 decision
is preserved. Nothing was pushed, merged, tagged, deployed, PR'd, deleted
or removed.

### 13.18 Checkpoint for the next session

Branch `fable-evidence-led-pilot-v2`, HEAD = the Unit 6 commit (see §2),
working tree clean, base `0e1a8aa`. The overnight addendum's next steps:
**Unit 7 — Professional Presentation Integration** (baseline capture of the
whole route first; the PixelLab candidate pack read-only at
`.claude/worktrees/fable-pixelab-asset-candidates/asset-candidates/pixelab-v1`;
every runtime promotion "PROVISIONAL MODEL-SELECTED — NOT HUMAN-APPROVED"
with a provenance document; the visual majors V1–V6 and minors of §13.14
are its first work items; commit `art(game): integrate professional outpost
presentation` or `chore(assets): …`), then **Unit 8 — Final Pilot
Verification** (M02 overlay positive verification, the `pilot_episodes_1_2`
M05 driver sleep, the `pilot_records` supply-bundle assertion, a
post-closure station-revisit assertion, route-level `invalid`/`technical`
closure cases, full manifest sweep in documented chunks, complete
participant route with timing, burden gate, five reviews). This session
stopped after Unit 6 because its context budget was nearly exhausted (the
addendum's ~85 % rule), not because of a gate failure.

### 13.17 Deferred to the final verification unit

The Unit 2 M02 filing/workspace overlay failure on the capture/pilot_deck
path (`pilot_deck.spec.ts` still exercises `touchFilingDesk` — see §13.11
for its result); the `pilot_route` topology-walk intermittent; the legacy
recycler-rig intermittent; the professional-pilot capture set (frames
27–30 re-targeted to the review panel in `pilot_visual_capture.spec.ts`,
not re-captured here).

## 14. Unit 7 — Professional Presentation Integration (presentation only)

### 14.1 Scope and freeze

Workbook sheet 13 gate **G4** ("Adult visual integration": existing
PixelLab pack after inventory, coherent 96×96 characters / 32×32 world,
professional UI hierarchy, restrained palette, no placeholder panels, no
unapproved asset silently promoted, no new generation until the inventory
records a gap). Everything in this unit is presentation: **no item window,
disposition, event name, payload, score, weight, trait label,
missing/invalid semantic, approach point, interaction radius, gate or
measured timing changed**; M25 stays questionnaire-primary / external
pending; Utility/Core stays non-scored; no validity is claimed. The
scientific reviewer's boundary check is in §14.10.

Bounded-unit contract (the mission text is the contract): objective — a
visually coherent adult outpost; scientific rationale — G4 / none
(presentation); participant-facing behaviour — same route, same stations,
same words except the copy fixes listed in §14.4; allowed files — §14.2;
prohibited — the workbook, the ledger, `event-schema.md`,
`scoring-plan.md`, every window module, the research runtime,
`package*.json`; entry state — Unit 6 HEAD `897f5f4`; success — the
acceptance list in §14.8; failure/recovery — every scene keeps a
procedural fallback when a texture is absent; telemetry boundary — no new
event; acceptance — §14.8 + tests §14.9; screenshots — the full route
re-captured; stop conditions — any non-presentation diff; model — Fable
(writer), Opus/Sonnet (read-only reviews); commit — one.

### 14.2 Exact changed files

| Area                      | Files                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| ------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Shared presentation layer | `src/world/RoomScene.ts` (PAUSE-time `hideWorldPrompts`, objective word-wrap + second-line follow, `addDecor` y-depth + floor set, `setDoorTexture`, `stopNpcWorkLoop`, `feedbackMessageY`, door-leaf tint, DEV `__worldPromptProbe`), `src/pilot/PilotZoneScene.ts` (title card y 62 / 16 px, `zoneSignage`, door-leaf default), `src/constants/depth.ts` (`worldDepth`), `src/sprites/Player.ts` (foot-line depth), `src/gameplay/Npc.ts` (depth, chip depth, stoppable work loop), `src/inventory/ui/HotbarHud.ts` (caption hides on PAUSE), `src/pilot/ui/WorkSurfaceScene.ts` (11 px help), `src/index.ts` + `src/style.css` (charcoal ground), `src/world/proceduralTilesets.ts` (`core` theme void/walls) |
| Assets                    | `src/constants/assets.ts` (`UNIT7_STILL_URLS`, `UNIT7_STRIP_URLS`), `src/scenes/Boot.ts` (loads), `public/assets/pixellab-runtime/{robots/bot-standby,robots/bot-working,sequences/core-sync,sequences/airlock-open,sequences/antenna-signal,effects/snowfall,props/core-coolant-column,props/core-pillar-a,props/core-pillar-b,props/core-console,props/utility-tower,props/utility-panel,props/utility-desk,props/arch-door,props/arch-window,props/arch-vent,props/arch-grille,props/arch-pipes}.png` (18 new, 112 KB), `src/world/proceduralTextures.ts` (`proc-door-core-open`)                                                                                                                             |
| Rooms                     | `src/scenes/UtilityCoreDeckScene.ts`, `src/scenes/CoreChamberScene.ts`, `src/pilot/ui/FeedPanelScene.ts`, `src/scenes/ExteriorRecoveryYardScene.ts`, `src/scenes/DiagnosticsLaboratoryScene.ts`, `src/scenes/StationConcourseScene.ts`, `src/scenes/RecordsWorkshopScene.ts`                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| Tests                     | `e2e/presentation_integration.spec.ts` (new, 11 tests), `e2e/proc_textures_determinism.spec.ts` (manifest pin +1), `e2e/pilot_visual_capture.spec.ts` (one test-lane fix, V30)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| Docs / evidence           | `docs/verification/evidence-led-pilot-v2/UNIT-7-VISUAL-DEFECT-LEDGER.md` (new), `docs/game/PIXELLAB-RUNTIME-ASSET-PROVENANCE.md` (Unit 7 table), `docs/game/VISUAL-SYSTEM.md` (tokens), `docs/game/rooms/{11,12,13}-*.md`, this report, every frame in `docs/verification/screenshots-evidence-led-pilot-v2/` and `docs/verification/screenshots-professional-pilot/` (re-captured)                                                                                                                                                                                                                                                                                                                              |

Untouched: the workbook, the M01–M26 ledger, `event-schema.md`,
`scoring-plan.md`, `ScoringManager`, `EventLogger`, `SessionState`,
`QualtricsBridge`, `DataQualityTracker`, `ResearchRuntime`, every
`src/pilot/windows/*` module, every `src/pilot/{closure,exterior,return}`
model, `package*.json`. The candidate pack worktree is unmodified.

### 14.3 Baseline capture (Phase 7.1)

Before any edit the five capture specs were re-run at HEAD `897f5f4`
(`PW_DEV_PORT=5331`, `--retries=0 --workers=1`): `pilot_visual_capture`
3/3 (the M02 filing-desk leg included), `pilot_signal_capture` 1/1,
`pilot_exterior_capture` 1/1, `pilot_return_capture` 1/1,
`pilot_closure_capture` 1/1 — 25.5 min. The committed frames at `897f5f4`
are the baseline set (git holds them). Every frame was inspected at full
resolution; the ledger (`UNIT-7-VISUAL-DEFECT-LEDGER.md`) records V1–V6
(preserved from §13.14) plus V7–V27 from the baseline and V28–V30 from
the first Unit 7 pass, each classed blocker / major / minor / asset gap /
deferred polish / environment / test. No blocker was found.

### 14.4 What changed for the participant (observable)

- **Ground and depth.** One charcoal ground (`#0b1016`) behind the 4:3
  canvas, as the game clear colour and as the `core` theme void — no black
  band at 1280×720 (D-U7-1: the base canvas stays 800×600 `Scale.FIT`; the
  160 px side bands are the same charcoal). Avatar, NPC sprites and decor
  are y-sorted at the foot line (`worldDepth`); floor dressing stays under
  everything; the `core` theme's perimeter walls are lifted so the chamber
  diamond reads.
- **Overlay hygiene (V1, V12).** Any overlay pauses the host with the
  proximity prompt, the label chip, the NPC name chips and the hotbar
  caption hidden; they return on resume.
- **Guidance surfaces.** The objective line word-wraps inside the viewport
  (V7); the zone title card is a 16 px band at y 62 (V8); area signage is one
  shared dim 10 px style in every zone (V17); signs sit beside/under door
  leaves (V28); the deck's feedback banner sits under the north-door prompt
  (V13).
- **Doors.** Interior pilot doors show the PROVISIONAL door leaf
  (cool-tinted) instead of a cyan square; the two airlocks show the iris
  airlock's closed frame; the blast door swaps to an open-leaf variant with
  the gate (V4, V9).
- **Utility Deck.** Breaker readout / lamp labels no longer overlap (V2);
  ready feedback no longer repeats the help line (V6); utility bot still
  (standby → working when all feeds are up), utility tower / panel / desk
  machinery mass, `CORE CHAMBER` sign on the wall band (V13, V20).
- **Core Chamber.** The Core is the PROVISIONAL core column strip (held
  frame inactive-dimmed / prepared / stable; slow 6-frame loop while
  synchronising; reduced motion holds a mid frame) between two coolant
  columns; the `CORE · …` chip stands beside the pedestal (V3); Kai works
  the feed console until the Core is stable, then holds the finished pose
  (V14); inside the chamber the objective line reads "At the Core: inspect
  it, open the synchronisation review, then confirm." / "Synchronising —
  stand by; the Core stabilises in a moment." (V5); pillars frame the south
  door.
- **Exterior.** Restrained slate-tinted snowfall (reduced motion: one faint
  frame), restored-antenna art with a slow two-frame pulse once Mast 04's
  restoration is outdoor-complete (V19, V29); scanner signals, dig cells
  and the rig readouts are untouched.
- **Concourse / Workshop / Laboratory.** Wall modules (window, vent,
  grille, pipes) as dressing, dim signage, door leaves.

### 14.5 Assets and provenance

Eighteen files promoted from the read-only `pixelab-v1` pack (commit
`62ed985`), every one **PROVISIONAL MODEL-SELECTED — NOT HUMAN-APPROVED**,
each recorded in `docs/game/PIXELLAB-RUNTIME-ASSET-PROVENANCE.md` (Unit 7
table: candidate ID, source path, runtime path, role, transformation,
technical compatibility, selection reason, known defects, approval status).
Composition used a stdlib-only PNG codec from the session scratchpad
(pixel-exact crops / strips; no resampling, no retouching); the pack is
unmodified; nothing was generated (D-U7-2 — the recorded gaps V21–V24 are
prop / tileset families, not ≤24 single-object fills). Explicitly not
promoted: the isometric-leaning workshop / laboratory / archive prop
sheets, every measurement board, the unpacked bot move / work frames,
player action sheets beyond scan / dig / pickup (D-U7-3).
`ASSET_SET_VERSION` was not bumped — the stimulus freeze is a
research-owner gate (open item, §14.11).

### 14.6 Asset gaps recorded (none promoted)

V21 valve / breaker / bus silhouettes; V22 a straight-on interior prop set
(workshop presses / benches / case cabinet, lab benches); V23 salvage
piles / magnet rig / crane; V24 wall / floor tilesets; the completion card
and the work-surface panel geometry (V15 / V25) stay shared 720×516
panels.

### 14.7 Defects found on the way (test lane; none product)

V30: the `pilot_visual_capture` frame-07 lane (`walkTo(96,112)`, ±12 px)
could stop with the avatar's foot inside workshop grid row 4, where the
cols-13-16 machinery block stops the x-leg at x = 560; the following Space
opened the handover-desk prompt (movement holds while a prompt is open)
and the filing-desk approach never happened ("overlay at 96,272 did not
open"). Reproduced 2/2 in isolation with a diagnostic spec (deleted before
commit); the filing desk itself opened correctly from a direct boot
(`__inventoryUiProbe.open` true, prompt hidden, chips 0, no error). The
lane now targets y = 84 (body rows 2–3). Product collision is untouched.

### 14.8 Acceptance (at 800×600 inside a 1280×720 viewport; every frame inspected at full resolution)

| Criterion                    | Result                                                                                                                                                                                                            |
| ---------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| No black bands               | met — page ground, canvas clear colour and every theme void share `#0b1016`; the 4:3 letterbox is the same charcoal (D-U7-1); the visual reviewer confirmed no black band in any frame                            |
| No clipped rooms             | met — every 25×19 zone fits the 800×600 view; north-wall modules that clipped at the top edge were removed (V31/M9)                                                                                               |
| No unreachable interactions  | met — every station, door and window is untouched in code; the closure, yard and return route suites pass on the final code (§14.9)                                                                               |
| No hidden overlays           | met — overlay scrim 0.9; prompt, label chips, NPC name chips and the belt caption hide on PAUSE and return on RESUME (V1, V34, V38; probe-proven)                                                                 |
| No panel overflow            | met — help lines wrap inside the panel and anchor at its foot (V37); the breaker readout stays in its column (V2)                                                                                                 |
| No label collision           | met for the enumerated cases (V13, V28, V36, V41); the prompt/name-chip pair now sits on the far side of the target (V35)                                                                                         |
| No character clipping        | met — the avatar is never covered by its own prompt (V35); walk-through decor that y-sorted in front of the avatar was moved to the wall band (V42, desk); coolant columns / bot remain y-sorted and are recorded |
| No unexplained dead space    | partly — machinery mass added on the deck and in the chamber; the shared 720×516 work-surface geometry (V15/V25) and the bare exterior seams (V24) stay recorded as deferred polish / asset gaps                  |
| No inconsistent sprite scale | met — player, NPCs and the bot are 96×96 pack sprites; props are pack slices at 1× or foundry textures; no non-integer scaling anywhere                                                                           |
| Clear professional hierarchy | met with recorded register notes — the promoted slices' olive/amber register (P1/P2) and the Core-vs-column hue (P3) are owner/asset calls                                                                        |
| Clear route landmark         | met — door leaves carry the uniform cyan cue (threshold bar) and the beacon; the airlocks read as irises; the destination sign never sits behind a leaf (V28)                                                     |
| Clear current objective      | met — one wrapped objective line (V7); chamber-specific line (V5)                                                                                                                                                 |

### 14.9 Verification (`--retries=0 --workers=1`, `PW_DEV_PORT=5331`, sequential; no source edited while a server chunk ran)

Gates on the final code: `lint:tsc` ✓ · `vite build` ✓ (2.1 s) · scoped
ESLint ✓ (autofix for formatting/import order only) · `git diff --check`
✓ · `verify-unit.mjs` **PASS** with the explicit allowlist of §14.2
(122 modified + 19 untracked paths, every one inside the list).

Runs, in order (each spec its own process):

1. **Baseline (HEAD `897f5f4`, before any edit)** — five capture specs
   green (§14.3).
2. **First Unit 7 pass** — `proc_textures_determinism` 2/2;
   `pilot_closure_capture` 1/1; `pilot_visual_capture` **2/3** (leg 1:
   V30 test lane, reproduced 2/2 in isolation, lane fixed, then 1/1);
   `pilot_exterior_capture`, `pilot_signal_capture`, `pilot_return_capture`
   1/1 each.
3. **Corrected code (V28–V30)** — `presentation_integration` 10/11 → the
   provenance test read one record only (fixed to both records, 1/1 in
   isolation); `proc_textures_determinism` 2/2; all five captures green.
4. **Review round (V31–V45, V47)** — run #1: `presentation_integration`
   11/11; `proc_textures_determinism` 2/2; `pilot_closure` **2/3** (test 1:
   the Unit 6 spec's `plv1-kai` expectation vs the intended working pose —
   V47, expectation updated); `pilot_yard` 3/3; `pilot_return` **fail** —
   Phaser `glTexture`/`drawImage` of null from the V34 RESUME handler on a
   destroyed caption after a zone re-entry (**V48, product defect
   introduced by this unit, fixed**); the run was stopped there so no leg
   would execute against changing code.
5. **Final code (V48 fix + `arch-window` removal)** — run #2:
   `presentation_integration` **11/11** (1.0 min); `proc_textures_determinism`
   **2/2**; `pilot_closure` **3/3** (9.1 min); `pilot_yard` **2/3** (test 2:
   the magnet-rig `F` press "produced no observable effect" — the known
   swallowed-keypress family under sweep load); `pilot_return` **3/3**
   (12.2 min, no unhandled error across the zone re-entries);
   `pilot_closure_capture`, `pilot_visual_capture` (3/3),
   `pilot_exterior_capture`, `pilot_signal_capture`, `pilot_return_capture`
   all green.
6. **Placement fix (title card → HUD strip, deck banner y 250)** — run #3:
   `pilot_yard` test 2 **in isolation 1/1** (3.7 min) → the run-#2 failure
   is classified **intermittent**, not deterministic; `presentation_integration`
   **11/11**; the five capture specs **all green** — this is the committed
   frame set (`screenshots-evidence-led-pilot-v2/01–47`,
   `screenshots-professional-pilot/01–30`, every frame regenerated on the
   final code and inspected).

Deterministic failures found and fixed on the way: V30 (test lane), the
provenance-record scope (test), V47 (test expectation), V48 (product,
introduced by V34). Intermittent, not fixed, recorded for Unit 8: the
magnet-rig `F` press under sweep load (`pilot_yard` test 2, run #2 only).
Not run in this unit (queued for Unit 8's full manifest sweep): the other
78 spec files, including the measurement-isolation suites of rooms whose
only Unit 7 change is decor/signage/door art (Concourse, Workshop,
Laboratory, Signal lab).

What the tests prove and do not prove: asset existence, dimensions, RGBA
and provenance naming (real bytes, independent tables); every v2 zone
boots with the promoted art and requests every registry URL with no
runtime error; the overlay hides the world prompt and label chips and
restores them (probe-proven); the reduced-motion and muted boots execute
their branches without error (not visual correctness); the closure, yard
and return route suites still pass on the final code (windows, gates,
approach points unchanged). Sprite anchor/scale, animation registration,
depth order and label collisions are inspected manually in the frames, not
asserted (test reviewer, recorded).

Screenshot inventory: `docs/verification/screenshots-evidence-led-pilot-v2/`
58 files (01–47 with a/b/c variants) and
`docs/verification/screenshots-professional-pilot/` 30 files (three stale
frames from an earlier route removed — V49). Every frame was regenerated
by the run-#3 captures on the final code and inspected at full
resolution by the writer; the visual reviewer's frame-by-frame findings
(on the pre-correction set) are in §14.10.

Timing note (automated, not a human estimate): the closure route test 1
ran 3.9 min, the return route test 1 2.8 min, the yard test 2 3.7 min in
isolation — unchanged in kind from Units 4–6; no participant duration is
claimed by this unit (burden is Unit 8's gate).

### 14.10 Reviews (two waves of two, read-only; one consolidated correction round)

Wave 1: gameplay/usability (Opus) + visual/adult presentation (Opus).
Wave 2: test quality (Sonnet) + scientific boundary (Opus). Each reviewer
hit its turn limit before reporting and was asked to report from what it
had read; each names the files/frames it did not reach (recorded below as
review gaps, not as clearance).

- **Gameplay (Opus)** — verdict: usable with noted friction, no blocker.
  Fixed in the round: G1 door-leaf affordance (cyan tint + threshold bar,
  V31), G2 mast art gating (V32), G3 snow over task graphics (V33), G4 V12
  on the wrong HUD class (V34), G5 title card vs the deck re-entry prompt
  (V36), G6 refusal banner over the door (V41), G7 desk on the walk lane
  (V42), G10 signage contrast (V43), G12 airlock closed-iris grammar (V44).
  Recorded: G8 markers above the avatar at doorways, G9 stations hidden
  while a prompt panel is open (pre-existing), G11 work-surface readout
  values at 10 px (window content across 26 windows — not touched). Item 8
  ("anything not presentation-only"): none found; caveat that the reviewer
  had no diff and read files, not screenshots.
- **Visual (Opus)** — verdict: readable with noted defects. V1 partly fixed
  in the first pass (status chips / beat box outside the panel) → scrim 0.9
  (V38); V2–V6 fixed (V6 residual in M21's status/feedback repeat is window
  content — recorded). Fixed in the round: B1/M1/M2/N4 prompt over the
  avatar/target (V35), M3 title card vs status chips (V36), M4/M5 help-line
  overflow (V37), M9 window modules read as doors (V31), N7 caption (V34),
  N8 Dock signage (V39), A1 bot salience (V40), N2 banner (V41). Recorded:
  M6 avatar over the lab phase display at the airlock spawn (wall panel
  occlusion order is correct; the spawn sits under the panel), M7 player/NPC
  overlap at Noor's talk point, M8 two unlabelled NPCs beside Vale, M10 M24
  timing cue placement (measured — not touched), M11 exterior seams (V24),
  N1/N10–N13, S1/S2 (5 px dot indicators; text carries the state), P1–P3
  register clashes, stale duplicate frame numbers in the professional-pilot
  set (23/24/26 pairs from an earlier route — deleted in the final
  inventory, §14.9). No frame shows praise, a score, a trait or an item id.
- **Test quality (Sonnet)** — tsc / build / scoped ESLint / `git diff
--check` all exit 0 (re-run by the reviewer). Fixed: T-M1 chamber
  reduced-motion branches now booted, T-M2 strip presence asserted, T-m3
  independent `STRIP_DIMENSIONS` + RGBA check, the fixed 800 ms wait →
  probe-gated (V45). Recorded: the provenance check is a substring match
  over two records (real rows verified by the reviewer); the reduced-motion
  and muted tests prove branch execution without error, not visual
  correctness; anchor/scale, animation registration, depth order and sign
  collisions are inspected manually (frames), not asserted.
- **Scientific (Opus)** — verdict: two majors on the rendered stimulus, no
  code-semantics breach found. Fixed: S-M1 snow above exterior stimuli
  (M05 o2 flag, M19 collar, M23 plot) → ground drift at depth −0.1 under
  every marker and graphic (V33); S-M2 Mast 04 restored cue inside M20's
  resume phase → gated on full `m20Complete` (V32); S-M3 the freeze claim
  narrowed to code semantics with the affected windows enumerated
  (ledger); N13 title card vs the wrapped objective (V36); m9 room doc 11
  follows the code; N12 V30 baseline status stated (did not reproduce at
  `897f5f4`). `hideWorldPrompts` on PAUSE verified: no act lost, no latency
  component reads prompt visibility. Copy audit of every new
  participant-facing string: clean. Missing/invalid, MAJ-9, M25 and the
  non-scored closure: no touchpoint. Owner decisions surfaced: OD-7
  (door affordance class), OD-8 (`ASSET_SET_VERSION`), OD-9 (mast art),
  OD-10 (scope of "presentation only"); the "Unit 7" naming collision with
  the physical-mechanics session's comments is a note for the owner.

The correction round was spent once (V31–V45 + V47/V48); after it the
re-run in §14.9 is the evidence. This section is a record of findings and
dispositions, not a clearance: the reviewers are read-only and approve
nothing.

### 14.11 Open research-owner decisions (Unit 7) — recorded, none resolved

- **OD-7 Door affordance class** (as built: leaf art + cyan cue on doors,
  cyan marker on stations; the bot still belongs to the same asset call).
- **OD-8 `ASSET_SET_VERSION`** (`outpost-assets-v5` unchanged after 17 new
  runtime files + one procedural texture; bump now / hold for the freeze
  gate / rule presentation art out — interacts with INT-6).
- **OD-9 Mast 04 art** (restored at full `m20Complete`, as built / no
  state art / outdoor-complete with a contamination flag).
- **OD-10 Scope of "presentation only"** (code semantics vs rendered
  stimulus; determines whether V31–V33 were defects or accepted design).
- **Asset approval.** Every promoted file stays PROVISIONAL MODEL-SELECTED —
  NOT HUMAN-APPROVED; the reviewers' register notes (P1–P3, A1) are inputs
  to that decision, not resolutions.

### 14.12 Confirmations

No disposition, canonical event, scoring formula, weight, trait label or
score was created or changed; `ScoringManager`, `EventLogger`,
`SessionState`, `QualtricsBridge`, `DataQualityTracker`, `ResearchRuntime`,
`event-schema.md`, `scoring-plan.md`, the workbook, the M01–M26 ledger and
every window module are unmodified; no questionnaire wording appears in
`src/`; no PixelLab generation was run; the candidate pack worktree is
unmodified; no validity is claimed. Nothing was pushed, merged, tagged,
deployed, PR'd, deleted (other than the `arch-window` slice this unit
had added and the Dock's garbled signage decor line) or removed.

### 14.13 Checkpoint for the next session

Branch `fable-evidence-led-pilot-v2`, HEAD = the Unit 7 commit (see §2),
working tree clean, base `0e1a8aa`. Next: **Unit 8 — Final Verification**
(M02 overlay positive proof on the `pilot_deck`/capture path, the
`pilot_route` topology intermittent, the legacy recycler-rig intermittent,
the Concourse→Dock door intermittent, stale/overwritten screenshots,
obsolete scene-default helpers, closure invalid/technical-state gaps; full
manifest sweep in sequential chunks at `--retries=0 --workers=1`; the
complete participant route with timing against the burden budget; final
scientific gates; five read-only reviews; the final report).

## 15. Unit 8 — Final verification (evidence, classification, limits)

### 15.1 Checkpoint

Branch `fable-evidence-led-pilot-v2` in worktree
`.claude/worktrees/fable-evidence-led-pilot-v2`; base `0e1a8aa`; entry HEAD
`0651149` (Unit 7, "chore(assets): integrate professional outpost
presentation"); Unit 6 = `897f5f4`. A detached read-only comparison
worktree at `.claude/worktrees/u8-baseline-897f5f4` (`897f5f4`) was used for
every two-sided comparison and was never rebased, merged, committed to or
removed. All runs `--retries=0 --workers=1`, each spec in its own
Playwright process, `PW_DEV_PORT=5331` (final) / `5333` (baseline), never
concurrently.

**This unit modified no product source file.** The only code touched is
one new Unit 8 test spec (§15.6).

### 15.2 What the full sweep did and did not establish

The pre-existing full manifest sweep — **418 tests in 89 files, 401
passed, 17 failed across 14 spec files, retries=0, workers=1** — is
recorded as-is. Part of that run was contaminated by concurrent load, so a
sweep failure is **not** evidence of a defect on its own. **It is not
claimed that all 418 tests passed.** Unit 8 did not repeat the sweep; it
re-ran the failing specs in isolation, and — where isolation still failed
— against the Unit 6 baseline.

Two attempts per spec on final code and one on baseline was the standing
budget; it was not exceeded. Where that budget ran out before a
classification was reached, the row below says so rather than guessing.

### 15.3 Per-spec classification

| Spec (test)                                                             | Final #1                                        | Final #2        | Baseline `897f5f4`              | Classification                              |
| ----------------------------------------------------------------------- | ----------------------------------------------- | --------------- | ------------------------------- | ------------------------------------------- |
| `inventory_prep_logging` "systematic path: checklist to verify to tidy" | FAIL                                            | —               | FAIL, byte-identical error      | **Inherited**                               |
| `inventory_prep_logging` "NEXT-08 coherence"                            | FAIL (line 901)                                 | FAIL (line 854) | PASS                            | **Unresolved — possible Unit 7 regression** |
| `participant_ui_cards` "inventory prep status panel (phase 3)"          | FAIL                                            | FAIL            | FAIL, identical received string | **Inherited**                               |
| `participant_ui_cards` "repair and engineer status panels"              | PASS                                            | FAIL            | PASS                            | Intermittent                                |
| `pipe_diagnosis_setback` "manifold rebuild, diagnosis and seal setback" | FAIL                                            | FAIL            | PASS (2/2)                      | **Unresolved — possible Unit 7 regression** |
| `magnet_salvage_ip` "recycler rig / M24 window"                         | FAIL (#1)                                       | FAIL (#4)       | PASS                            | **Unresolved — possible Unit 7 regression** |
| `magnet_salvage_ip` "pump interlock"                                    | FAIL                                            | FAIL            | FAIL                            | **Inherited**                               |
| `artifact_survey` "full physical sweep"                                 | FAIL                                            | FAIL            | FAIL, identical error           | **Inherited**                               |
| `field_actions_visual_capture`                                          | FAIL                                            | FAIL            | FAIL, identical error           | **Inherited**                               |
| `measurement_boundaries`                                                | 5/5 PASS                                        | —               | —                               | Load/intermittent                           |
| `archive_room_logging`                                                  | 3/3 PASS                                        | —               | —                               | Load/intermittent                           |
| `adversarial_reload_partial_state`                                      | 1/1 PASS                                        | —               | —                               | Load/intermittent                           |
| `field_actions_measurement`                                             | 4/4 PASS                                        | —               | —                               | Load/intermittent                           |
| `visual_physical_capture`                                               | 6/6 PASS                                        | —               | —                               | Load/intermittent                           |
| `repair_tool_retrieval`                                                 | 4 passed / 2 failed, **hit the 900 s deadline** | —               | —                               | **Timed out — unclassified**                |
| `connected_participant_journeys`                                        | 1 passed / 1 failed, **hit the 900 s deadline** | —               | —                               | **Timed out — unclassified**                |

Carried forward unchanged from the recovery checkpoint (files unchanged
since; not re-run to pad counts): `engineer_hub_logging` inherited
pre-Unit-7 failure; `pilot_records` supply-bundles inherited Unit 2
assertion; `pilot_yard` rig test intermittent; `pilot_route` topology
8/8 over two isolated runs.

### 15.4 The three unresolved rows — what is and is not established

> **Cross-reference added after Unit 8:** all three of these rows, and
> both "Timed out — unclassified" rows in the §15.3 table, were
> subsequently reproduced at 5× per revision and **reclassified** in
> §16. None is a Unit 7 regression. The Unit 8 results below are left
> exactly as recorded; §16 supersedes their classification, not their
> evidence.

Each failed twice on final code and passed once on baseline. **That is a
weak result and it is not claimed as a proven regression.** One baseline
pass gives no variance estimate, and this suite fails non-reproducibly:
five specs above were classified _inherited_ on the same 2-vs-1 sample
shape with the pass/fail sides swapped. Two of the three failed at
**different assertion points** across the two runs — a timing signature,
though on its own that does not discriminate between pre-existing flake
and a newly-introduced load regression.

Read-only review of `git diff 897f5f4 0651149 -- src/` found two candidate
mechanisms and disposed of a third:

- **`magnet_salvage_ip` / M24 timing window.** Unit 7 added
  `buildSnowfall()` to `ExteriorRecoveryYardScene` — six sprites on a
  nine-frame loop at 7 fps, running indefinitely in the very scene that
  hosts the M24 timing-window mini-game. The sprites are created once at
  `ExteriorRecoveryYardScene.ts:526`, **not** per frame; the only new
  per-frame call, `refreshMastArt()`, is guarded and O(1). The load is
  therefore modest — but it is new, sustained, and in the wrong scene, and
  it is suppressed by `prefersReducedMotion()`, which makes a clean
  controlled experiment available.
- **`inventory_prep_logging` / "NEXT-08 coherence".** Unit 7 changed
  `src/pilot/ui/WorkSurfaceScene.ts` — the exact panel the test probes via
  `__minigameSurface` — altering help-text size, `wordWrap`, text origin
  (`0.5` to `0.5,1`) and anchor y. Layout changes to the panel under test
  are a plausible cause of a "read before layout settled" failure
  (`trayRows` length 0; station label undefined).
- **`pipe_diagnosis_setback`.** Weakest of the three. The Unit 7 diff for
  `DiagnosticsLaboratoryScene.ts` is purely cosmetic (airlock texture, two
  signage offsets, delegation to a shared `zoneSignage`), and the M13
  puzzle module is not in the diff at all. No line in the Unit 7 diff
  explains "Mount A1./Mount C1. not among the top-level card list."

**A hypothesis raised during this unit and then refuted, recorded so it is
not re-raised:** Unit 7 added a scene `PAUSE` handler
(`RoomScene.ts:641`) whose `hideWorldPrompts()` sets
`this.activeTarget = null` (`RoomScene.ts:2477`) — interaction state, in a
unit declared presentation-only, where the baseline has no PAUSE handler
at all. The concern was that an interact press after RESUME could reach
the `activeTarget === null` branch (`RoomScene.ts:2349`) and be counted by
`onEmptyInteract()`, which in `DockScene.ts:334` increments
`controlErrorCount` and is reported as the `control_error_count` event
(`DockScene.ts:398`). **This does not occur.** `updateProximity()`
re-derives `this.activeTarget = nearest` at `RoomScene.ts:2296`, before
the null branch at 2349, inside the same call; the PAUSE-time null cannot
survive into it. `PilotZoneScene.ts:202` and `DockScene.ts:243` also call
`resetKeys()` on RESUME. **No measured covariate is affected.** Assigning
interaction state inside a method documented as "pure presentation"
remains a readability note bearing on OD-10, not a defect.

None of the three is fixed here. §15.11 is the bounded repair brief.

### 15.5 M02 overlay proof and the final scientific gates

`e2e/m02_overlay_proof.spec.ts` — **2/2 PASS** (1.1 min). The Unit 2 open
finding ("filing-desk overlay did not open") is now positively closed for
the direct-boot entry state: from a boot with no prior station visited,
both the `E` and `SPACE` paths open the overlay in `m02case` mode, the
rendered frame bytes change, the world prompt and label chips hide, held
movement does not move the avatar (host genuinely paused), `ESC` closes,
the prompt returns and movement resumes, with no runtime error. **Limit,
per the scientific review:** the spec boots via the `scene=` developer
alias, so it proves the direct-boot entry state; the participant entry
state (after episode-1 play, participant launch mode) still rests on
`pilot_visual_capture` leg 1, not on this spec.

`e2e/final_scientific_gates.spec.ts` — **11/11 PASS** (12.9 s). Verified
independently of the spec: the authority documents and the runtime
(`docs/research/event-schema.md`, `docs/research/scoring-plan.md`,
`src/systems`) are byte-identical to base `0e1a8aa`; the workbook and the
M01-M26 ledger are untouched by Units 7-8; the ledger's
`classification_counts` are `{strong: 16, conditional: 7,
questionnaire_primary: 3}` over 26 items, and the six facet/scale models
partition the 26 exactly.

**Correction to the mission brief.** The brief asked the gate to prove
"16 behavioural, 7 questionnaire-primary and 3 missing classifications".
That is not what the ledger holds or what the gate asserts. The actual
partition is **16 GAME-CANDIDATE — STRONG, 7 GAME-CANDIDATE —
CONDITIONAL, 3 questionnaire-primary** (2 `QUESTIONNAIRE-PRIMARY` plus
1 `QUESTIONNAIRE-PRIMARY / HYBRID REQUIRED`). The gate is correct; the
brief's restatement was not, and nothing was changed to make it true.

**Gates that are weaker than their names** (scientific review, verified
where cited — recorded, not repaired):

- The "event families are pairwise disjoint" gate
  (`final_scientific_gates.spec.ts:102-112`) and the "M13/M18, M24/M26
  independence" gate (114-137) compare `proto_mNN_...` **string
  prefixes**. Two prefixes with different `NN` can never nest and
  identical ones are skipped, so both can only fail if two schedule
  entries share an item number — which `PILOT_SCHEDULE` already forbids by
  construction. They are close to tautologies. The substantive
  independence claims are about _state and derivation_, and no assertion
  in the file touches state.
- The "missing/invalid never become low values" gate (226-242) asserts a
  **substring of the ledger's own prose**, not behaviour. The property
  nonetheless **holds**: `opportunityCoverageStatus`
  (`src/pilot/coverageSchedule.ts:260-284`) keeps `pending / open /
completed / missing / invalid / censored / not_applicable` as seven
  distinguishable terminal codes with no numeric collapse anywhere in the
  reviewed scope. The gate is simply not what establishes it.
- "Every closure event carries `non_scored`" (169-189) is one `toContain`
  over concatenated sources — one occurrence anywhere satisfies "every".
  Its companion `not.toMatch(/proto_m\d\d/)` is defeated by indirection:
  `closureSession.ts:280-292` reaches two M-item records through imported
  constants, so no `proto_mNN` literal appears while the closure code does
  contact M-item records.
- The "runtime unchanged" gate (205-224) uses `git diff`, which does not
  report **untracked** files; a new `src/systems/*.ts` would pass
  silently. `src/systems` was confirmed to hold only its eight expected
  modules.

### 15.6 The three Unit 8 specs — and three authoring defects found in one

`m02_overlay_proof.spec.ts` and `final_scientific_gates.spec.ts` were
unchanged from their previously tested state and passed as delivered.

`pilot_full_route_timing.spec.ts` **had never run to completion.** It
failed 2/2 at an identical point before any product code was suspected.
Three test-only defects were found and corrected in this unit — the file
is one of the paths this unit commits, and **no product source was
touched**:

1. `keyActivate(page, 'arm')` / `clickElement(page, 'confirm')` — the real
   element ids in `src/scenes/CoreChamberScene.ts` are **`arm_sync`** and
   **`confirm_sync`**. Symptom: `element arm is not focusable`, 2/2.
2. `waitCompletionNotice(page)` — the helper signature in
   `e2e/closureHelpers.ts:685` is `(page, open: boolean)`; with `open`
   undefined the wait could never be satisfied. Symptom: 12 s timeout.
3. No `waitCoreState(page, 'confirmation_armed')` between arm and confirm
   — a latent race every other caller in the repo guards against
   (`pilot_closure.spec.ts:382-383, 395-396, 404-406, 754-756`;
   `pilot_closure_capture.spec.ts:143-144`). Added.

After these corrections: `lint:tsc` clean, scoped ESLint clean, and the
spec passes **twice, independently** (213.7 s and 209.4 s process time).

This matters beyond the spec: the mission's premise that the driver was
"now probe-gated" and previously tested did not hold, and the first two
failures would have been easy to misread as a product regression at the
Core.

### 15.7 Full participant route — automation timing

One complete run, alone on an otherwise quiet machine, real input,
participant launch mode, `--retries=0 --workers=1`. Two successful runs
were recorded; the second is quoted, the first in brackets.

| Measure                                                | Value                                                                                                     |
| ------------------------------------------------------ | --------------------------------------------------------------------------------------------------------- |
| Automation wall time, Dock to completion notice closed | **199.5 s** [205.2 s]                                                                                     |
| Deck arrival                                           | 146.4 s [154.1 s]                                                                                         |
| Station record closed                                  | 152.7 s [160.7 s]                                                                                         |
| All three feeds up                                     | 180.9 s [188.6 s]                                                                                         |
| Core stable                                            | 198.5 s [204.1 s]                                                                                         |
| Completion notice closed                               | 199.5 s [205.2 s]                                                                                         |
| Events emitted                                         | 154                                                                                                       |
| Zones traversed                                        | 10 door transitions across 6 distinct zones                                                               |
| Scheduled windows                                      | **24 scheduled, 24 closed, 0 open**, no never-entered labels                                              |
| Final Core                                             | `final_core_closed: true`                                                                                 |
| Item outcomes on this route                            | 5 completed (M05, M07, M09, M10, M20), 2 not-applicable (M08, M11), **19 missing / `participant_absent`** |
| Idle or technical interruptions                        | none; no runtime error                                                                                    |

**Every scheduled window reached a valid terminal state** (24/24 closed,
0 open) and the route completed.

**This is automation time and nothing else.** It is not converted into a
human estimate, and no human completion time is claimed. Against the
nominal 30-minute study ceiling it is a _provisional engineering
observation only_: 199.5 s of automation is far under it, but automation
walks at full speed, never reads, never deliberates, and **engaged only 5
of 26 items** on this route — the remaining 19 closed as
`participant_absent`. The planned budget (item-owned 1,040 s + shared
overhead 420 s + closure 75 s = 1,535 s) describes a route where items are
actually worked. **A hands-on human timing pilot remains necessary and
nothing here substitutes for it.**

**Burden-budget discrepancies recorded, not resolved:**

1. `item_owned_active_ms_from_surface_events` = **282.1 s [312.3 s]**,
   which **exceeds the 199.5 s wall time of the same run.** The reduce
   (`pilot_full_route_timing.spec.ts:177-181`) sums `metadata.active_ms`
   across _every_ event carrying the field, with no item filter — it also
   catches non-scored practice (`src/informationProcessing/tutorial.ts`)
   and the legacy ambient yard windows (`src/pilot/yardJobs.ts`). It is
   therefore **not** the ledger's `item_owned_active_seconds` line and must
   not be read against the 1,040 s budget. The field name overstates what
   it holds.
2. The record reflects **one fixed choice set** (`watch: accept, promise:
accept, readGauge1: true, calibration: true, mast: partial`). Burden
   varies with M09/M10 acceptance and M20 progress; the artifact carries
   only the AUTOMATION caveat, not this one.
3. `coverage.summary.closed` is a **participant-facing display value**:
   `coverageSchedule.ts:379-393` excludes every `reviewNaming: 'never'`
   item (M22, M24, M25, M26) from `open`, so those four count as closed
   regardless of actual status. Read as a coverage statistic it can
   overstate closure by up to four items.
4. `pilot_door_used`, on which the whole `zone_sequence` /
   `door_transitions` record rests, does **not** appear in
   `docs/research/event-schema.md`. It is unmapped route telemetry, not a
   canonical event, and is labelled as such wherever quoted.

### 15.8 Screenshot audit and restoration

Capture specs silently overwrite committed evidence. Before any change, a
path/hash manifest of all modified files was written to the session
scratchpad and audited:

- **133 modified files at entry, 136 after the Unit 8 capture specs ran.**
- **100% were `.png` files inside existing `docs/verification/screenshots*`
  directories.** No non-PNG file and no product file was modified at any
  point.
- All 136 were **dimension-identical** to `HEAD`.
- **None was byte-only churn.** A stdlib PNG decode of all 136 pairs found
  real pixel differences in every one: median 0.4%-29% of pixels by
  directory, up to **60.3%** (`screenshots/09-final-core.png`), with max
  channel deltas to 255.
- Representative pairs were compared at full resolution. The legacy sets
  (`screenshots-field-actions`, `-stardew`, `-physical`,
  `-information-processing`, `-rebuild`, `-concourse-hotfix`) show genuine
  **Unit 7 presentation applied to pre-Unit-7 evidence** — different
  avatar sprite, snowfall, prop art, prompt placement. The current-unit
  sets (`-evidence-led-pilot-v2`, `-professional-pilot`) show the same
  scene re-rendered at a slightly different camera offset and animation
  frame — materially equivalent, nondeterministic re-capture.

**Disposition: all 136 restored explicitly to HEAD `0651149`, by explicit
path list.** `git restore` was never run across the repository; the three
Unit 8 specs were untouched; no non-PNG modification existed to discard.
This is right on both counts: the legacy directories are the historical
evidence _of their own units_, and overwriting them with Unit-7-era
renders would silently falsify that record; and the two current sets were
already deliberately regenerated on the final code and committed at
`0651149` (Unit 7 run #3), so a nondeterministic re-capture adds nothing.
**No new evidence image is committed by this unit.** The audit was
repeated after the last capture spec; the tree is clean apart from the
three specs.

### 15.9 Reviews

Five read-only reviews, at most two concurrent, none permitted to edit,
run tests or delegate. Each names what it did not reach; none approves
anything, and none resolved a scientific decision.

- **Scientific measurement integrity (Opus)** — _Concerns found, no
  blocker._ No scoring, formula, weight, trait label or cut score was
  created; missing/invalid is never collapsed to a low value; the
  `hideWorldPrompts` concern was traced and **refuted** (§15.4). MAJORs:
  the disjointness and M13/M18, M24/M26 gates are near-tautologies; the
  M25 gate reads one file while a **second, undeclared M25 behavioural
  family exists in the tree**; "missing never becomes low" asserts prose,
  not behaviour; "every closure event carries `non_scored`" is one
  `toContain`; the "runtime unchanged" gate is blind to untracked files;
  `pilot_full_route_timing` never asserts route completeness and its
  headline active-time figure is not the construct its name implies.
  MINORs: reduced motion varies rendered stimulus in three measured
  windows with no control variable recorded; `pilot_door_used` is
  load-bearing but unmapped. _Could not read the Unit 7 diff (no git
  tool) — its scope claims are reconstructed from §14.2 and in-tree
  markers; did not read the external battery or the workbook, so the
  16/7/3 split and the six-model partition are confirmed only for internal
  self-consistency._
- **Test quality and failure-classification validity (Sonnet)** —
  _Classifications directionally sound, statistically weak._ Confirmed
  bluntly that one baseline pass is near-zero evidence and that none of
  the three "regression" candidates clears a bar the "inherited" rows did
  not. Supplied the two candidate mechanisms in §15.4 and found the third
  latent defect in the timing spec. Confirmed `m02_overlay_proof` has no
  assertion weaker than its name. _Ran no test; all regression/flake calls
  are diff-based plausibility, not reproductions. Did not review
  `presentation_integration.spec.ts` or six other files in the same
  commit._
- **Participant route and gameplay coherence (Opus)** — _Usable with noted
  friction; no blocker._ The route is navigable end to end by a first-time
  adult: one objective line, one next-hop beacon computed by BFS so beacon
  and door always agree, directional signage in every zone, and a
  stage-keyed redirect on every NPC so a lost participant can always be
  re-pointed. Backtracking is **justified, not busywork** — two of the
  three Concourse re-entries are forced pass-throughs (Workshop and Deck
  each have exactly one door) and the single genuine return leg is
  materially changed on arrival. **No dead ends and no unrecoverable
  state**; every gate gives a message and a named location, carried debris
  is dropped rather than lost, belt-full recoveries become caches. Copy
  audit clean: no praise, no trait words, no exclamation marks in
  participant copy. MAJORs recorded: the mission log is the _designated_
  re-show surface for accepted obligations but its `M` key is taught
  nowhere in any participant-facing string (the controls panel starts
  hidden in pilot zones); an M05 reduced-motion asymmetry between the two
  matched occasions (Concourse lamp flickers unconditionally, Yard cable
  flag is held static); three spawn points land **inside** a door's 72 px
  interaction radius (Workshop 64 px, Concourse-from-Workshop 64 px,
  Deck-from-Chamber 56 px) so a reflex SPACE on arrival walks straight
  back out — a rule `DockScene.ts:80-81` already applies deliberately
  elsewhere; and the route has **no ending for the participant** (no
  beacon, no return, no instruction at `complete`). MINORs: stale
  objective on arrival at the Workshop; Kai promises a report-back the
  route never asks for; two competing first instructions at the Dock; four
  consecutive dialogue cards at first NPC contact; 10 px world chips
  carrying operational state. _Static reading only — no runtime evidence;
  opened one screenshot; did not read the 26 window modules' internal
  surfaces, so interaction quality inside the work surfaces is
  unassessed._
- **Participant burden and assessment usability (Opus)** — _Usable with
  noted friction for an uninterrupted single sitting._ **The 1,040 s
  item-owned figure reconciles exactly** — the 26 per-item
  `active_seconds` sum to 1040, the three zero-second items are precisely
  the three questionnaire-primary ones, and the constant is mirrored at
  `src/pilot/evidenceLedger.ts:147` (independently recomputed and
  confirmed). Burden is concentrated by **episode, not by item**: no
  single item exceeds M13's 90 s, but Episode 3 (Signal Analysis) is 235 s
  of continuous seated reasoning in one room with no traversal relief, at
  roughly the 10-15 minute mark and immediately before the physically
  heaviest episode; Episode 4 is 260 s. **27-30 min is not demonstrated
  and the slack is not real**: 1,535 s is 25.6 min, leaving 85 s (5.5%)
  under the median target — inside the noise of one participant
  re-reading two prompts. The ledger says so itself
  (`burden_budget.status`: "Planning estimate only - requires human
  pilot"). Most likely overruns, in order: the open-ended persistence
  items M19/M23/M24/M26 (205 s budgeted, uncapped **by construction** —
  the stopping decision _is_ the measurement, so no burden fix can bound
  them without changing what is measured); M14 budgeted at 65 s for six
  messages, three gauges, twelve discrete assignment acts and a submit
  (≈5 s per act including first-time reading); and traversal at ~28 s per
  stage across 15 stages. Found **no** unskippable text wall, forced
  dialogue chain or mandatory animation wait; the opening is 7.5 s and
  skippable, and `ItemWindow.pause/resume` correctly excludes
  hidden-surface time from active-time accounting. _Static reading of nine
  files; no runtime evidence; did not read M13's implementation — the
  single longest item — so cannot say whether 90 s fits it._
- **Visual professionalism and adult-assessment suitability (Opus)** —
  _Readable with noted defects; no blocker; not yet credible as a finished
  instrument._ The split is clean: the **panels** are professional
  (monospace, desaturated, restrained cyan, defensive closure copy), the
  **world** is not — the participant's first frame is flat placeholder
  art, and the utility bot reads as a cartoon mascot with lamp-eyes.
  **Hard constraint holds: no score, trait label, praise, performance
  judgement, item id or questionnaire wording appears in any frame
  inspected**; all visible identifiers are in-fiction (`S-14`, `WO-11`,
  `MAST 04`). MAJORs, three of which I verified directly in
  `23-station-status-changed.png`: the Concourse north-door leaf occludes
  the middle of the station-status chip; two HUD chips overprint each
  other; the Utility Deck systems board is occluded by its own decor in
  every deck frame (ledger V28 records this as fixed — **it is not fixed
  on disk**); modal overlays leave world chips and the belt caption
  undimmed (V1/V12/V34 residual on the dialogue/notice path); prompt and
  name chip land on top of the door they describe (V35 solved "prompt over
  avatar" and reintroduced "prompt over target"); the avatar spawns over
  the laboratory phase display; the M24 action cue is clipped at the right
  canvas edge on a **timed** task; and the Records Workshop gives ~16
  near-identical props and ~12 floating labels with exactly one approach
  marker, so a first-time participant cannot tell what is usable. Also
  confirmed: `INCIDENT DESK` is duplicated in one room, and the `▼ DOCK`
  exit label is clipped by the hotbar. **No black band found** in any
  frame. Environment note: the dev GitHub-corner wedge appears in _every_
  frame in both sets and collides with objective text in three; V27 says
  the participant bundle strips it, which this evidence set cannot
  confirm. Evidence hygiene: `15-decoder-bank.png` and
  `30-shift-complete.png` no longer show what their filenames claim.
  _Inspected 21 of 58 v2 frames and 9 of 30 professional-pilot frames;
  stills cannot settle any animated behaviour; every promoted asset
  remains PROVISIONAL, MODEL-SELECTED, NOT HUMAN-APPROVED and nothing in
  the review clears one._

### 15.10 Unresolved findings carried out of Unit 8

**Product-code, unresolved (no fix attempted here):**

- **U8-1 (MAJOR, unresolved).** Three specs fail twice on final and pass
  once on baseline — `inventory_prep_logging` "NEXT-08 coherence",
  `pipe_diagnosis_setback` "manifold rebuild...", `magnet_salvage_ip`
  "recycler rig / M24 window". Not proven to be regressions; not cleared
  either. Repair brief in §15.11.
- **U8-2 (MAJOR, unresolved, scientific).** `src/pilot/yardJobs.ts:37-69`
  declares complete behavioural families `proto_m22_housing_*` (7 events)
  and `proto_m25_yardpump_*` for **M22 (STRONG)** and **M25
  (questionnaire-primary / external pending)**. Neither prefix is the
  ledger-declared family (`proto_m22_report_`, `proto_m25_probe_`), so
  `primaryFamilyPrefixes()` — and therefore the disjointness gate — never
  sees them. `closureSession.ts:274-293` still writes censored records
  against both ids at record closure. Verified: the only importer is
  `closureSession.ts`, no scene opens these windows, so they are
  unreachable on the v2 route — but that mitigation is a code comment and
  an absent call site, **not an assertion**, and nothing would notice a
  future re-hosting. An export could otherwise carry
  `proto_m25_yardpump_*` records for an item whose ledger entry reads
  `active_seconds: 0`.
- **U8-3 (MINOR, unresolved).** `prefers-reduced-motion` changes the
  rendered stimulus of measured exterior windows (snowfall alpha 0.3 vs
  0.55, static vs animated) and is recorded nowhere in `src/systems`, so
  it cannot be modelled or excluded post hoc.
- **U8-4 (INFORMATIONAL, pre-existing).** `RoomScene.ts:2387-2392`
  short-circuits `JustDown(space) || JustDown(interactKeyE)`; because
  `JustDown` consumes the flag it reads, SPACE and E pressed in the same
  frame can leak a second contextual interact on the next frame. Marked
  "Unit 1", not introduced by Unit 7, not covered by the new M02 spec
  (which tests the two keys in separate sessions).
- **U8-7 (MAJOR, unresolved, measurement).** `noteM09ReminderLogViewed()`
  (`src/pilot/windows/m09MonitorWatch.ts:184`) is the declared
  reminder-exposure **control variable** for M09/M10. Verified: it is
  **defined and never called anywhere in `src/` or `e2e/`.** It will
  therefore read 0 for every participant, while actual mission-log
  exposure genuinely varies — and varies with an undiscoverable `M` key
  taught in no participant-facing string. A control variable that is
  constant by construction cannot control for anything.
- **U8-8 (MAJOR, unresolved, participant-facing).** Three spawn points sit
  inside the 72 px interaction radius of the door just used (Records
  Workshop 64 px, Concourse-from-Workshop 64 px, Deck-from-Chamber 56 px).
  A reflex SPACE on arrival re-triggers the door. `DockScene.ts:80-81`
  already documents and applies the opposite rule deliberately, so this is
  an inconsistency, not an unknown.
- **U8-9 (MAJOR, unresolved, visual).** The Utility Deck systems-board
  readout is occluded by its own decor in every deck frame. The Unit 7
  ledger records V28 as fixed in the consolidated correction round; the
  committed frames show it is **not** fixed. The ledger entry and the
  evidence disagree, and the evidence is what a reader will cite.
- **U8-10 (MINOR, unresolved, evidence hygiene).** Two committed frames no
  longer show what their filenames claim
  (`screenshots-professional-pilot/15-decoder-bank.png` shows the signal
  laboratory; `30-shift-complete.png` shows the deck at `feeds 0/3 up`).
  Same class as the stale frames V49 deleted, surviving under live names.
  Not corrected here: regenerating them would re-open the churn §15.8
  deliberately closed.
- **U8-11 (INFORMATIONAL, participant-facing, owner call).** The Core
  operational review shows the participant a card grid reading `Station
tasks recorded 5 · Recorded with limited evidence 0 · Not observed 18 ·
Technical state recorded 0` (`CoreChamberScene.ts:583-614`), above the
  disclaimer "Data-quality status only. Nothing here is a result." Each
  word is neutral; the juxtaposition is legible to an adult as "5 of 23".
  Compounding it, the pre-closure count is knowingly incomplete — the four
  `reviewNaming: 'never'` items are excluded from `open`
  (`coverageSchedule.ts:380-393`) — and the not-yet-visited list is capped
  at three plus "and N more". This is OD-3 / OD-5 and is **not** resolved
  here; the experience evidence argues only against shipping the current
  middle position (numeric, incomplete, and not actionable).

- **U8-12 (MAJOR, unresolved, measurement).** `exteriorWindows.ts` calls
  `w.setComprehension('passed')` **unconditionally at 10 sites** (lines
  283, 297, 457, 469, 512, 528, 663, 679, 794, 806 — verified), while the
  ledger's validity gates for those items require "comprehension
  confirmed" (`evidenceLedger.ts:1059`) and "Scanner tutorial passed"
  (`:1022`). Comprehension is therefore **asserted, not checked**: those
  gates are currently unverifiable, and adding real checks would grow the
  burden budget by an unbudgeted amount.
- **U8-13 (MAJOR, unresolved, measurement).** The opportunity id
  `proto_m15_layered_cipher` is declared in **two** modules —
  `src/informationProcessing/m15CausalModel.ts:52` (`M15C_OPPORTUNITY_ID`)
  and `src/informationProcessing/m15LayeredCipher.ts:69`
  (`M15_OPPORTUNITY_ID`) — verified. If both are reachable, M15's 65 s
  becomes ~130 s and the participant works two near-identical cipher
  consoles, which the ledger explicitly warns against ("Avoid repeated
  near-identical consoles", `evidenceLedger.ts:761`); if only one is
  reachable, the other is dead code carrying a live item id. Needs a
  runtime route trace, not a guess.
- **U8-14 (MAJOR, pre-existing, deployment risk).** A page reload destroys
  the session: `pilotRoute.ts:8-9` states outright that "a reload is a new
  session", and route stage, mission log, coverage register and every open
  `ItemWindow` are module-level singletons with no persistence. At minute
  22 an accidental refresh, tab crash or sleep-killed WebGL context
  returns the participant to the Dock with everything lost. Window closure
  as `participant_absent` fires only at the Utility Deck review, so an
  abandonment before `deck_closure` leaves every window non-terminal with
  no closure event. **Pre-existing and not introduced by Unit 7 or 8** —
  and `adversarial_reload_partial_state` (1/1 green in this unit) tests
  that partial state is handled _safely_, not that it is recoverable. In a
  27-minute assessment this is the largest single drop-out risk in the
  build and is a deployment/study-owner decision, not a bug to patch here.

**Test-suite, unresolved:**

- **U8-5.** `repair_tool_retrieval` and `connected_participant_journeys`
  both exceed a 900 s deadline and could not be classified. Their observed
  assertion failures remain open. Neither is claimed to pass.
- **U8-6.** Five gates in `final_scientific_gates.spec.ts` are weaker than
  their names (§15.5). The underlying properties were verified by hand
  where cited; the gates were **not** strengthened in this unit, because
  doing so is a measurement-design decision, not a verification task.

**Study-owner decisions surfaced, none resolved:** item-level collapse
precedence (`STATUS_RANK`, `coverageSchedule.ts:286-294`) has no cited
authority and is the kind of rule `scoring-plan.md` governs; whether the
runtime coverage record should carry STRONG vs CONDITIONAL rather than
collapsing both to `PRIMARY-CANDIDATE` (`coverageSchedule.ts:186-190`);
disposition of the legacy yard M22/M25 windows (remove / declare as
legacy / keep with an unreachability assertion); whether reduced motion is
recorded, forced off, or accepted as unmodelled variation; and whether the
full-route artifact should split `active_ms` by item-owned / shared /
closure or rename the single figure. Unit 7's OD-7 to OD-10 remain open
and were not touched.

### 15.11 Bounded repair brief for the next unit (U8-1)

> **Cross-reference added after Unit 8: this brief is superseded — see
> §16.10.** Step 1 was executed in full and found no rate difference in
> the regression direction, which closes the gate steps 2 and 3 were
> conditional on; neither was run. U8-1 should be marked superseded
> rather than executed. §16.11 recommends the replacement unit (U9,
> test-only).

Not started here, deliberately. Scope it as one unit, **investigation
first, no fix without a reproduction**:

1. Reproduce under control. Run each of the three specs **5x on final and
   5x on baseline `897f5f4`**, isolated, `--retries=0 --workers=1`, quiet
   machine. Five-and-five is the minimum that makes a rate comparison mean
   anything; the 2-vs-1 evidence in §15.3 does not.
2. If `magnet_salvage_ip` M24 confirms a rate difference, test the stated
   mechanism directly: run it with `prefers-reduced-motion` forced on,
   which suppresses the snowfall animation
   (`ExteriorRecoveryYardScene.ts:1916-1918`). A rate that recovers under
   reduced motion localises the cause to the added animation load.
3. If `inventory_prep_logging` "NEXT-08 coherence" confirms, bisect the
   `WorkSurfaceScene.ts` layout changes (help font 10 to 11 px,
   `wordWrap`, text origin `0.5` to `0.5,1`, anchor y `height-14` to
   `height-6`) against the `__minigameSurface` probe read.
4. `pipe_diagnosis_setback` has no candidate mechanism in the Unit 7 diff.
   Treat it as suspected pre-existing flake unless step 1 shows a clear
   rate difference.
5. Allowed files: only those the reproduction implicates. **No product
   change without a confirmed rate difference**; a fix that cannot be
   shown to move the failure rate is not a fix.

### 15.12 Gates

`npm run lint:tsc` pass; `npm run build` pass (2.11 s); scoped ESLint on
the three Unit 8 specs pass (no issues); `git diff --check` clean;
`node scripts/claude/verify-unit.mjs` **PASS** against the exact intended
paths — every change inside the allowlist, nothing else in the tree.

### 15.13 Confirmations

- **No product source file was modified.** The only code change is
  `e2e/pilot_full_route_timing.spec.ts` (three test-only corrections,
  §15.6). The 136 test-overwritten PNGs were restored to `0651149`.
- No canonical event name, scoring formula, weight, trait label, cut
  score, norm or Q-item mapping was created or changed. All identifiers
  remain `proto_*` / provisional.
- `event-schema.md`, `scoring-plan.md` and `src/systems` are
  **byte-identical to base `0e1a8aa`** (verified directly, not only via
  the gate). The workbook, the M01-M26 ledger, `ScoringManager`,
  `EventLogger`, `SessionState`, `QualtricsBridge`, `DataQualityTracker`
  and `ResearchRuntime` are untouched by Units 7-8.
- **Missing / invalid was never interpreted as a low value**, and the 19
  `participant_absent` items from the timing run are recorded as missing,
  never as zero or as poor performance.
- No questionnaire wording appears in any participant-facing string
  reviewed; no item id is shown to the participant.
- M25 remains questionnaire-primary with external administration pending;
  M08 and M11 remain questionnaire-primary; the Utility/Core closure
  remains non-scored.
- **Not claimed:** that all 418 sweep tests passed; that any inherited
  failure was repaired; any human completion time; criterion validity;
  construct validity; equivalence to the source questionnaires; or
  readiness beyond the evidence above. This remains a professional
  research prototype that establishes no validity, reliability, norms or
  cut scores.
- Nothing was pushed, merged, tagged, deployed, PR'd or removed. Neither
  worktree was removed and no branch was deleted. Nothing was committed,
  rebased or merged in the baseline worktree. It was **not** untouched,
  however: the two baseline capture runs
  (`field_actions_visual_capture`) transiently overwrote 11 PNGs there,
  exactly as capture specs do in the main tree. Those were audited (all
  PNG, no untracked file, no source file) and restored, leaving that
  worktree clean at `897f5f4`.

## 16. Post-Unit-8 reliability closure (verification-only, no product change)

Appended after Unit 8. This section closes the three rows §15.3 marked
**"Unresolved — possible Unit 7 regression"** and the two rows it marked
**"Timed out — unclassified"**. It runs the reproduction protocol §15.11
step 1 asked for, and it does not run step 2 or step 3, because step 1
did not produce the rate difference those steps are conditional on. **No
product, measurement or scientific file was touched.** The only change in
the closure commit is this section.

### 16.1 Checkpoint

Branch `fable-evidence-led-pilot-v2` in worktree
`.claude/worktrees/fable-evidence-led-pilot-v2`; base `0e1a8aa`; entry
HEAD `9928312`; comparison worktree
`.claude/worktrees/u8-baseline-897f5f4` at `897f5f4` (Unit 6). Both
working trees verified clean before the first attempt and after the last.

### 16.2 The three rows, resolved to exact targets

§15.11 named "the three specs" without test ids. Read off §15.3 and §15.4
and confirmed against the files, they are:

| Row | Spec file                            | Exact test title                                                                              |
| --- | ------------------------------------ | --------------------------------------------------------------------------------------------- |
| A   | `e2e/inventory_prep_logging.spec.ts` | `NEXT-08 coherence: bin silhouettes, carrying tray, take-back path, review pin, inert clicks` |
| B   | `e2e/pipe_diagnosis_setback.spec.ts` | `manifold rebuild, diagnosis and seal setback run as separate windows`                        |
| C   | `e2e/magnet_salvage_ip.spec.ts`      | `recycler rig: controlled deck, objective exhaustion, M24 window`                             |

All three titles are **byte-identical in both worktrees**, so `-g`
selected the same test on both revisions.

### 16.3 Protocol actually executed

- One Playwright process at a time, start to finish. No concurrent
  final/baseline run, no persistent monitor, no background poll loop
  driving the tests, no unrelated dev server.
- Every attempt: a **new** Playwright process, `--retries=0 --workers=1`,
  `--reporter=list`, one spec, `-g` pinned to the single test (whole-spec
  for §16.7).
- Hard deadline enforced per attempt by GNU `timeout` 8.32
  (`--kill-after=30s`): **900 s** for rows A/B/C, **1200 s** for the two
  timeout specs. No attempt was cut by its deadline; the longest was
  941 s against a 1200 s cap.
- Dedicated ports, never shared: final `PW_DEV_PORT=5341`, baseline
  `PW_DEV_PORT=5343`. Chosen deliberately because `playwright.config.ts`
  sets `reuseExistingServer: true`, so a stray server on the other tree's
  port would silently test the wrong code.
- **Port verified free before every attempt** (`netstat -ano`, LISTENING
  filter) — a busy port aborts the attempt as `PREFLIGHT_FAIL` rather
  than running against a foreign server. This never fired.
- **Process exit confirmed after every attempt**: the runner re-checks
  its port 3 s after the process returns and records the listener set.
  Every one of the 34 attempts recorded `leftover=[]`. After the last
  attempt: no listener on 5341/5343, no Playwright-owned `chrome.exe`
  (checked via `Win32_Process` command lines against `ms-playwright`),
  and the only `node.exe` on the box is the agent session itself. **No
  global Node or process termination was used at any point** — nothing
  needed killing.
- Identical toolchain both sides, verified rather than assumed: Node
  `v24.19.0`, `@playwright/test` `1.61.1`, `vite` `8.0.10`.
- Setup and cleanup were equivalent on both revisions — same runner
  script, same flags, same deadline, same preflight and postflight.
- **Final and baseline attempts were alternated** (F1, B1, F2, B2, …)
  within each row, never all-final-then-all-baseline.
- Every attempt was appended to a scratchpad results table as it
  finished, and its complete log preserved outside the repository.

One discarded non-attempt is recorded for completeness: the first
invocation of the runner failed in 0 s before Playwright started
(`'C:\Program' is not recognized`) — the `npx.cmd` shim breaking on a
space in `PATH`. It produced no test result. The runner was switched to
`node node_modules/@playwright/test/cli.js` and all 34 attempts below
used that path.

### 16.4 Row A — `inventory_prep_logging` "NEXT-08 coherence"

Run order and results (alternating, top to bottom):

| #   | Attempt | Revision        | Result | Duration | Failure stage and signature                                                |
| --- | ------- | --------------- | ------ | -------- | -------------------------------------------------------------------------- |
| 1   | A-F1    | final `9928312` | PASS   | 91 s     | —                                                                          |
| 2   | A-B1    | base `897f5f4`  | PASS   | 104 s    | —                                                                          |
| 3   | A-F2    | final `9928312` | FAIL   | 66 s     | `spec.ts:854` `expect(trayRows).toHaveLength(7)` — received length 0, `[]` |
| 4   | A-B2    | base `897f5f4`  | PASS   | 119 s    | —                                                                          |
| 5   | A-F3    | final `9928312` | FAIL   | 66 s     | `spec.ts:854` — identical, received length 0, `[]`                         |
| 6   | A-B3    | base `897f5f4`  | FAIL   | 57 s     | `spec.ts:854` — identical, received length 0, `[]`                         |
| 7   | A-F4    | final `9928312` | FAIL   | 58 s     | `spec.ts:854` — identical                                                  |
| 8   | A-B4    | base `897f5f4`  | FAIL   | 59 s     | `spec.ts:854` — identical                                                  |
| 9   | A-F5    | final `9928312` | FAIL   | 57 s     | `spec.ts:854` — identical                                                  |
| 10  | A-B5    | base `897f5f4`  | FAIL   | 61 s     | `spec.ts:854` — identical                                                  |

**Pass proportions: final 1/5, baseline 2/5.** All eight failures are the
same failure: the `carryingSurface` probe returns zero `tray` rows where
seven are expected, at `inventory_prep_logging.spec.ts:854`.
Byte-identical message and byte-identical received value on **both**
revisions — only the worktree path in the stack differs.

**Classification: intermittent, present on both revisions. Not a Unit 7
regression.** This supersedes the §15.3 row. The Unit 8 2-vs-1 sample
(final FAIL ×2, baseline PASS ×1) is fully explained by baseline's own
3/5 failure rate.

**Observation, not a conclusion:** on both revisions the passes fell in
the first two attempts of the row and every later attempt failed. That
ordering is a confound this design does not control (machine warm state,
accumulating `test-results`, thermal/scheduler drift), and it is a
further reason the row is not read as a revision effect. It is recorded,
not investigated — investigating it was out of this session's scope.

### 16.5 Row B — `pipe_diagnosis_setback` "manifold rebuild, diagnosis and seal setback"

| #   | Attempt | Revision        | Result | Duration | Failure stage and signature                                                                                                                                                  |
| --- | ------- | --------------- | ------ | -------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | B-F1    | final `9928312` | PASS   | 100 s    | —                                                                                                                                                                            |
| 2   | B-B1    | base `897f5f4`  | FAIL   | 45 s     | `seatViaCards` → `selectCardByLabel` (`helpers.ts:1178`): card `"Elbow section"` not among `[Mount B1. / Mount C1. / Mount C2. / Mount A3. / Mount B3. / Mount C3. / Back.]` |
| 3   | B-F2    | final `9928312` | FAIL   | 103 s    | `spec.ts:371` `waitForEventType(page, 'proto_m18_diagnosis_submitted', 1)` returned false                                                                                    |
| 4   | B-B2    | base `897f5f4`  | PASS   | 114 s    | —                                                                                                                                                                            |
| 5   | B-F3    | final `9928312` | PASS   | 111 s    | —                                                                                                                                                                            |
| 6   | B-B3    | base `897f5f4`  | FAIL   | 60 s     | `selectCardByLabel`: card `"Isolation valve"` not among `[Mount B1. / Mount A3. / Mount B3. / Mount C3. / Back.]`                                                            |
| 7   | B-F4    | final `9928312` | PASS   | 111 s    | —                                                                                                                                                                            |
| 8   | B-B4    | base `897f5f4`  | FAIL   | 47 s     | `selectCardByLabel`: card `"Mount C1."` not among `[Open the test flow. / Seat a section… / Rotate a section… / Return a section to the bench… / Step back.]`                |
| 9   | B-F5    | final `9928312` | FAIL   | 60 s     | `selectCardByLabel`: card `"Isolation valve"` not among `[Mount B1. / Mount A3. / Mount B3. / Mount C3. / Back.]` — identical to B-B3                                        |
| 10  | B-B5    | base `897f5f4`  | PASS   | 123 s    | —                                                                                                                                                                            |

**Pass proportions: final 3/5, baseline 2/5.** Failures are **not**
identical to each other: four distinct signatures across five failures —
three of them the same `selectCardByLabel` "card not among" shape at
different points in the card sequence, one an event that never arrived.
One signature (`"Isolation valve"` against the same four-mount list)
appears on **both** revisions.

**Classification: intermittent, present on both revisions. Not a Unit 7
regression.** Baseline's pass rate is _lower_ than final's here, the
opposite of the direction a regression would produce. This is consistent
with §15.4's own note that this row was "weakest of the three" and that
the Unit 7 diff for `DiagnosticsLaboratoryScene.ts` contains no line
explaining a card-list failure.

### 16.6 Row C — `magnet_salvage_ip` "recycler rig"

| #   | Attempt | Revision        | Result | Duration | Failure stage and signature                                                                |
| --- | ------- | --------------- | ------ | -------- | ------------------------------------------------------------------------------------------ |
| 1   | C-F1    | final `9928312` | PASS   | 55 s     | —                                                                                          |
| 2   | C-B1    | base `897f5f4`  | FAIL   | 64 s     | `castAndHook` (`spec.ts:202`, from `spec.ts:300`): `cast never produced proto_m24_pull #1` |
| 3   | C-F2    | final `9928312` | PASS   | 51 s     | —                                                                                          |
| 4   | C-B2    | base `897f5f4`  | PASS   | 52 s     | —                                                                                          |
| 5   | C-F3    | final `9928312` | FAIL   | 67 s     | `castAndHook`: `cast never produced proto_m24_pull #3`                                     |
| 6   | C-B3    | base `897f5f4`  | PASS   | 56 s     | —                                                                                          |
| 7   | C-F4    | final `9928312` | PASS   | 52 s     | —                                                                                          |
| 8   | C-B4    | base `897f5f4`  | PASS   | 50 s     | —                                                                                          |
| 9   | C-F5    | final `9928312` | FAIL   | 70 s     | `castAndHook`: `cast never produced proto_m24_pull #4`                                     |
| 10  | C-B5    | base `897f5f4`  | PASS   | 54 s     | —                                                                                          |

**Pass proportions: final 3/5, baseline 4/5.** Same failure **mode** on
both revisions — the M24 cast/hook wait expiring at
`magnet_salvage_ip.spec.ts:202` — at a different pull index each time
(#1 on baseline, #3 and #4 on final), so the failures are not identical.

**Classification: intermittent, present on both revisions. Not a Unit 7
regression.** A 3/5-vs-4/5 split is nowhere near the 5/5-vs-5/5 pattern
the protocol requires for regression evidence.

**Consequence for §15.11 step 2:** the conditional
`prefers-reduced-motion` experiment on the Unit 7 `buildSnowfall()`
hypothesis was **not run**, because step 2 is gated on step 1 confirming
a rate difference and step 1 did not. The snowfall hypothesis is neither
confirmed nor refuted here; it is simply no longer supported by a rate
difference, and the M24 wait fails on a revision that contains no
snowfall at all. Likewise §15.11 step 3 (bisecting the
`WorkSurfaceScene.ts` layout changes for row A) was **not run**: row A's
identical failure occurs on the baseline, which does not contain those
layout changes.

### 16.7 The two timeout specs, run individually on final code

Whole-spec runs (no `-g`), final code first, hard 1200 s deadline.

**`e2e/repair_tool_retrieval.spec.ts` — T1-F1: 7/7 PASS, 941 s (15.7 min).**

| Test                                             | Result | Duration |
| ------------------------------------------------ | ------ | -------- |
| qualifying packed tool                           | PASS   | 1.8 m    |
| actual stored location (re-stowed probe)         | PASS   | 1.9 m    |
| no-opportunity: legacy checklist prep            | PASS   | 2.1 m    |
| no-opportunity: per-item, no stored packed probe | PASS   | 1.6 m    |
| no-opportunity: stowed in bin but never packed   | PASS   | 1.7 m    |
| room re-entry: opportunity persists, event once  | PASS   | 2.6 m    |
| keyboard and mouse parity                        | PASS   | 3.8 m    |

**Classification: the Unit 8 timeout was a deadline artefact, and the
underlying spec passes.** The spec needs ~941 s of wall clock; Unit 8
capped it at 900 s, so it could never finish. Unit 8's incidental
observation of "4 passed / 2 failed" before the cut **did not
reproduce**: all seven tests passed, first attempt, `--retries=0`. Per
the protocol, one passing attempt closes this spec — no second final
attempt and no baseline attempt were run, and none were needed. Recorded
as **intermittent / load-and-deadline-related, now passing**. U8-5 is
closed for this spec.

**`e2e/connected_participant_journeys.spec.ts` — 2 final attempts, then 1
baseline attempt (the protocol maximum; not exceeded).**

| #   | Attempt | Revision        | Result | Duration | P1   | P2   | P3   |
| --- | ------- | --------------- | ------ | -------- | ---- | ---- | ---- |
| 1   | T2-F1   | final `9928312` | FAIL   | 700 s    | FAIL | PASS | PASS |
| 2   | T2-F2   | final `9928312` | FAIL   | 715 s    | FAIL | PASS | PASS |
| 3   | T2-B1   | base `897f5f4`  | FAIL   | 471 s    | FAIL | PASS | FAIL |

P1 failure signature, **byte-identical in all three attempts on both
revisions** — `selectExpectingEvent` at
`connected_participant_journeys.spec.ts:106`, reached from line 129:

> `option 1 never produced inventory_verified_complete — recent events: [inventory_checklist_opened, inventory_required_tools_packed, correct_tool_selected, inventory_systematic_prep, inventory_sequence_followed, inventory_verification_skipped, workspace_tidy_confirmed, cleanup_completed]`

P3's single failure (baseline only) is a different signature:
`TimeoutError: page.waitForFunction: Timeout 15000ms exceeded` in
`waitForEventCount` (`e2e/journey.ts:145`, via `hubToStationJourney`,
`journey.ts:327`).

Classifications:

- **Spec-level timeout: resolved.** The spec completes in 471–715 s, well
  inside 1200 s. Unit 8's 900 s cap was tight rather than the spec
  hanging. U8-5 is closed for this spec too.
- **P1 "adaptive completer": inherited.** Identical failure and identical
  received event tail on final ×2 and baseline ×1 — 3/3 occurrences, zero
  passes on either revision. It is a real open failure and it is **not**
  introduced by Unit 7 or Unit 8. It is not claimed to pass.
- **P3 "avoid/defer": intermittent.** 2/2 PASS on final, 1 FAIL on
  baseline, and the baseline failure signature matches nothing seen on
  final.
- **P2 "shortcut/interrupted": passes on both revisions**, 3/3.

### 16.8 Consolidated classifications

| Target                                                    | Unit 8 classification            | Closure evidence                         | Closure classification                           |
| --------------------------------------------------------- | -------------------------------- | ---------------------------------------- | ------------------------------------------------ |
| `inventory_prep_logging` "NEXT-08 coherence"              | Unresolved — possible regression | final 1/5, base 2/5, failures identical  | **Intermittent, both revisions. No regression.** |
| `pipe_diagnosis_setback` "manifold rebuild…"              | Unresolved — possible regression | final 3/5, base 2/5, failures differ     | **Intermittent, both revisions. No regression.** |
| `magnet_salvage_ip` "recycler rig…"                       | Unresolved — possible regression | final 3/5, base 4/5, same mode both      | **Intermittent, both revisions. No regression.** |
| `repair_tool_retrieval` (whole spec)                      | Timed out — unclassified         | 7/7 PASS, 941 s                          | **Deadline artefact. Spec passes.**              |
| `connected_participant_journeys` (whole spec, wall clock) | Timed out — unclassified         | 471–715 s, inside 1200 s                 | **Deadline artefact. No longer times out.**      |
| `connected_participant_journeys` P1                       | (inside the timeout)             | final 2/2 FAIL, base 1/1 FAIL, identical | **Inherited. Open failure, not a regression.**   |
| `connected_participant_journeys` P3                       | (inside the timeout)             | final 2/2 PASS, base 1/1 FAIL            | **Intermittent.**                                |
| `connected_participant_journeys` P2                       | (inside the timeout)             | 3/3 PASS both revisions                  | **Passing.**                                     |

**Not one of the three §15.11 rows met the protocol's regression bar**
(final 5/5 FAIL with one signature while baseline passes 5/5). Every one
of them failed on the Unit 6 baseline as well.

### 16.9 Limits of this evidence

- **Five and five is an engineering sample, not a statistical one.** No
  significance test was computed and none is claimed. "final 3/5 vs base
  4/5" is a rate _observation_; at n=5 per side, a difference of one or
  two attempts carries no inferential weight. Nothing in §16 should be
  cited as a formal statistical result.
- **What the design does support is the negative:** a spec that fails on
  the Unit 6 baseline with a byte-identical message cannot have had that
  failure introduced by Unit 7. That inference needs one baseline
  failure, not a rate estimate, and rows A and C and P1 each supply
  identical-signature baseline failures.
- **The within-row ordering confound is uncontrolled** (§16.4).
  Alternating attempts between revisions protects the _comparison_, but
  does not remove drift in absolute rates over a ~90-minute run.
- **One machine, one OS, one browser build, headless SwiftShader.** Rates
  here do not predict rates on other hardware or on a participant's
  machine.
- These are **test-harness outcomes**, not statements about participant
  experience. A flaky probe wait is not evidence that a participant would
  fail the task, and a green spec is not evidence that they would succeed.
- The five Unit 8 reviews were not repeated, the full suite was not
  re-run, and already-classified inherited failures were not
  re-investigated — all three were out of scope by instruction.

### 16.10 Is a bounded Fable repair required?

**Not the one §15.11 scoped.** U8-1 was framed as "investigation first,
no fix without a reproduction," with product-code changes gated on a
confirmed rate difference. Step 1 has now been run and **found no rate
difference in the regression direction on any of the three rows**, so
U8-1's gate is closed: there is no confirmed Unit 7 regression to repair,
and steps 2 and 3 are moot. **U8-1 as written should be marked
superseded, not executed.**

**A different, narrower unit is warranted, and it is test-only.** The
evidence points at the e2e harness's waiting strategy rather than at game
code. Every failure recorded in §16 is a _wait that expired_, in one of
four places:

- `selectExpectingEvent` (`connected_participant_journeys.spec.ts:106`)
- `castAndHook` (`magnet_salvage_ip.spec.ts:202`)
- `selectCardByLabel` (`e2e/helpers.ts:1178`)
- `waitForEventCount` (`e2e/journey.ts:145`, fixed `Timeout 15000ms`)

None of these failures reported a wrong value; each reported an expected
value that had not arrived yet. That is the signature of a bounded poll
racing a slow frame, and it reproduces on a revision containing no Unit 7
changes. **That characterisation is a hypothesis formed from failure
messages, not a diagnosis** — the next unit should confirm it before
changing anything. The `connected_participant_journeys` P1 failure in
particular is 3/3 deterministic and may well be a genuine task-state or
spec-expectation mismatch rather than a timing one, since
`inventory_verification_skipped` arrives where
`inventory_verified_complete` is expected.

### 16.11 Recommended next unit

**U9 — e2e determinism and P1 inventory-verification triage
(test-only).** One bounded unit, investigation first, allowlist limited to
`e2e/**` plus one report/doc file. Ordered scope:

1. Triage `connected_participant_journeys` P1. It fails 3/3 with an
   identical received event tail on both revisions; establish whether the
   "systematic" option genuinely emits `inventory_verification_skipped`
   where the spec expects `inventory_verified_complete` (a spec/mechanic
   mismatch, which is a research-owner question) or whether the verify
   step is merely late (a harness question). **Do not change a mechanic
   or an event name to make the spec pass** — if it is a mismatch, it is
   an event-schema / measurement question and stops there.
2. Replace fixed-deadline polls with event-driven waits at the four call
   sites above, one at a time, each change justified by a reproduction.
3. Re-measure rows A, B and C at 5×5 after each change to show the rate
   moved. Per §15.11 step 5's principle: a change that cannot be shown to
   move the failure rate is not a fix.
4. Leave `docs/research/event-schema.md`,
   `docs/research/scoring-plan.md`, `src/systems` and all product code
   untouched.

The pilot-readiness blockers recorded in §15.10 (the P0 cluster, PS-0 /
PS-2 / PS-3, the reload/abandonment exposure, X1–X11) are **unchanged by
this section** and remain ahead of U9 in priority for anything
participant-facing. §16 closes test-reliability findings only; it does
not move the build closer to pilot-ready.

### 16.12 Confirmations for this section

- **No product code changed. No `src/` file, asset, event name, scoring
  formula, weight, trait label, cut score, norm, Q-item mapping, spec
  file or test expectation was modified in this session.** Not one file
  was edited to make a test pass. The only change in the closure commit
  is this §16.
- Both working trees were clean at entry and are clean at exit — the final
  worktree at `9928312` plus this section, the baseline worktree
  untouched at `897f5f4` with nothing committed, rebased or merged in it.
- **Repository hygiene.** The runs generated only untracked, gitignored
  Playwright artefacts (`/test-results`, ignored at `.gitignore:21`): two
  files in the final tree, three in the baseline tree, enumerated by
  explicit path before removal and listed in the preserved manifest. All
  three `error-context.md` files and all 34 attempt logs were copied
  **outside the repository** first. Removal was by explicit path only.
  **No tracked file was overwritten by any run in either tree** (these
  five specs are not capture specs), so no restore was needed. `git
clean`, `git reset --hard` and `git restore .` were **not** used, and no
  broad deletion was performed. **Unit 7's committed evidence was not
  touched.**
- Nothing was pushed, merged, tagged, deployed, PR'd, branch-deleted or
  worktree-removed. No scientific decision was resolved and no open
  decision in `docs/ai/SCIENTIFIC-AUTHORITY-AND-OPEN-DECISIONS.md` was
  touched.
- **Not claimed:** that any inherited failure was repaired; that the suite
  is now reliable; that the three rows will pass on any given future run;
  that 5×5 constitutes statistical evidence; or any readiness beyond
  §15.10. This remains a professional research prototype that establishes
  no validity, reliability, norms or cut scores.
