# Professional Assessment Pilot V2 — Report (Units 0–3)

**Status: IN PROGRESS — Unit 3 committed; Units 4–7 not started.** Nothing
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
| (Unit 3)  | feat(game): unify signal analysis assessment          | see §5 — file list in the commit                                                                                                                                                                                                                                                                                                                            |

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
