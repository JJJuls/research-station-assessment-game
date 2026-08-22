# Information Processing Minigame Foundation — Verification Report

Branch: `fable-information-processing-minigames-v1` · base `eb87bd9`
(`fable-interactive-inventory-foundation-v1`) · worktree
`.claude/worktrees/fable-information-processing-minigames` · 2026-08-21/22.

**Claim.** The six opportunities (M13–M18) and the common terminal
orientation are theory-driven **provisional behavioural analogues** designed
to generate item-local raw process data for later empirical validation
against the original BESSI items and competing explanations. They are not
validated BESSI replacements. No item score, scale score, weight, formula or
canonical event name was created; nothing was integrated into the
participant route.

## 1. Commits

| Unit | Commit           | Subject                                                                        |
| ---- | ---------------- | ------------------------------------------------------------------------------ |
| 1    | `4e68d6a`        | feat(game): add information processing terminal engine, tutorial and lab shell |
| 2    | `612b6fc`        | feat(game): add M13 lattice bench and independent M18 fault diagnosis console  |
| 3    | `088425e`        | feat(game): add M14 packet saturation and M15 layered cipher terminals         |
| 4    | `0c78341`        | feat(game): add M16 protocol update and M17 syntax acquisition terminals       |
| 5    | see `git log -1` | test(game): integrated proving-ground verification, review fixes and report    |

## 2. Changed files (all inside the frozen allowlist, `docs/game/INFORMATION-PROCESSING-LAB.md` §1)

New: `src/informationProcessing/{model,commands,programEngine,telemetry,windowState,probe,terminalAdapters,tutorial,pipeBoardEngine,m13PipeNetwork,faultForms,m18FaultDiagnosis,packetForms,m14PacketSaturation,cipherForms,m15LayeredCipher,protocolForms,m16ProtocolUpdate,syntaxForms,m17SyntaxAcquisition}.ts`,
`src/informationProcessing/ui/{ipTheme,openIpOverlay,SignalTerminalScene,PipeBoardScene,DiagnosisConsoleScene}.ts`,
`src/scenes/InformationProcessingLabScene.ts`, `e2e/ipHelpers.ts`,
`e2e/ip_{engine,pipe_suite,decoder,boundaries,lab_flow,visual_capture}.spec.ts`,
`docs/game/INFORMATION-PROCESSING-LAB.md`, this report, 27 screenshots under
`docs/verification/screenshots-information-processing/`.
Modified shared files (exactly five): `src/constants/key.ts` (+4 scene keys),
`src/scenes/index.ts` (+4 barrel exports), `src/world/SceneRouter.ts`
(+`information_processing_lab` alias), `src/measurement/m13PipePuzzle.ts`
(behaviour-preserving extraction of `validatePipePlacements`),
`src/measurement/index.ts` (+re-exports). No protected file was touched.

## 3. Local reuse and external references

Reused: the M13 connectivity validator (extracted to a pure, configurable
`validatePipePlacements` with open-branch count; the Pump House caller is
unchanged and its pure test passes), the standard piece set and `proc-pipe-*`
textures, `guardKeyHandler`, `UiButton`, the inventory theme tokens, the
pause-and-launch overlay pattern, the SA-13 validity register
(`declareOpportunity`/`markOpportunity*`/`assignCounterbalance`), the
`researchRuntime.logInteraction` provisional-event path, the DEV `window.__*`
probe convention, `driveAxisTo`/`captureErrors` e2e helpers. Rejected as
inadequate: the Pump House M18 card-stack (no tests, no reversible
hypotheses). External: Phaser 3 documentation (docs.phaser.io, MIT) read
only; no code copied; no dependency added.

## 4. Architecture

`docs/game/INFORMATION-PROCESSING-LAB.md` §3. One authoritative state store
per module; pure `import.meta`-free engines/forms for Node-side tests;
transactional operations (`{state,result}`, full rollback, snapshots); the
Signal Terminal is a presentation adapter over a `TerminalTaskAdapter`. Both
input modes compile to the same `SemanticCommand` and call the same adapter
method; `input_mode` is recorded on every command. Every overlay calls
`scene.bringToTop()` (alphabetical scene registry pitfall, §5.9 of the design
doc).

## 5. Mouse / keyboard equivalence

Terminal: drag chip→bin / chip→chip, click-compose (chips/palette → ADD),
typed command + ENTER all reach `adapter.append(raw)` → `validateCommand`
(`ip_engine.spec`: identical commands; `ip_lab_flow`/`ip_decoder`: buffers
equal across lanes; `input_mode` recorded). Meta words REMOVE/CLEAR/SUBMIT/
HELP/STOP/CODEBOOK and the stage actions (BEGIN/READY/ACKNOWLEDGE/NEXT) are
typed or clicked. Pipe board: drag/click/right-click vs arrows/SPACE/R/DEL/T
(`ip_pipe_suite` keyboard vs pointer lanes produce byte-identical
`placements_map`). Diagnosis console: clicks vs arrows/ENTER/X/1–4
(identical final state in both lanes).

## 6. Mechanics and raw variables

- **M13 lattice bench** (`proto_m13_lattice_*`, `proto_m13_lattice_construction`, forms A west→east / B north→south, broken B2, 9 pieces, max 4 test runs): `pieces_available, placements, moves, returns, rotations, placements_refused, constraints_total=3, constraints_satisfied_at_submission, open_branch_count_at_submission, endpoint_connected_at_submission, valve_inline_at_submission, submission_count, final_network_valid, active_ms, help_consults, window_status, invalid_reason, entry_state_id, form_id`.
- **M18 diagnosis console** (`proto_m18_fault_*`, `proto_m18_lattice_fault_diagnosis`, forms A intake-segment leak / B supply restriction; 4 hypotheses, 4 panels (E4 neutral), 3 reversible tests, rules reference): `evidence_panels_available/viewed, evidence_view_order, tests_available/run, test_order, rules_views, hypotheses_available/selected/rejected, hypothesis_revisions, contradictions_present_at_submission (+ contradictions_total_for_final), final_diagnosis_id, final_solution_valid, submission_count, active_ms, help_consults, window_status, invalid_reason`.
- **M14 packet intake** (`proto_m14_packet_*`, 4 practice + 12 scored, 3 channels, URGENT override): `units_presented/processed/correctly_routed/misrouted/omitted/revised, revisions, channels_present, channels_used, submission_complete, submission_count, command_sequence_length, pointer/typed commands, input_mode, active_ms, help_consults, window_status, invalid_reason, tutorial_status`.
- **M15 cipher workstation** (`proto_m15_cipher_*`, 6 fragments, 3 keys, 1 shift, 8-row codebook): `rules_presented=4, relations_required, relations_constructed, relations_correct_at_submission, rule_violations_at_submission, command_sequence_length, revisions, codebook_consults, final_reconstruction_valid, final_message, submission_count, input_mode, active_ms, window_status, invalid_reason`.
- **M16 protocol console** (`proto_m16_protocol_*`, 3 base + 6 fresh, rule `critical_override_hold`): `base_protocol_complete, base_consistent, new_rule_id, new_rule_presented, new_rule_acknowledged, first_application (+_correct), final_applications_correct, applications_governed, new_rule_errors, revisions_after_rule_presentation, codebook_consults_after_rule_presentation, active_ms_after_ready, input_mode, submission_count, window_status, invalid_reason`.
- **M17 syntax trainer** (`proto_m17_syntax_*`, own VEK/ZOR/KAI grammar, 4 feedback + 1 transfer trials, 2 operators each): per trial `trial_index, trial_type, commands_required, commands_correct, semantic_errors, syntax_errors, corrections_before_submission, feedback_presented, help_consults, active_ms_after_ready, trial_complete, goal_reached, input_mode, final_register`; plus `trials_completed`. No slope / criterion score (asserted).
- **Tutorial** (`proto_ip_tutorial_*`): calibration `pointer_commands, typed_commands, removals, ms_to_first_command, submissions, active_ms`; status `complete | failed`.

## 7. M13/M18 independence

`faultForms.ts` and `m18FaultDiagnosis.ts` import no M13 module (asserted on
import lines); the M18 entry snapshot is a pure function of the M18 form;
`ip_pipe_suite` opens the console after M13 solved, exhausted (4 invalid
runs), stopped (exited) and never opened (direct launch) and finds the four
entry snapshots deep-equal with `m13_dependency: 'none'`; the M18 family
never references `proto_m13`/`lattice_construction`; the lab only sequences
(console refuses while the bench window is `open`).

## 8. Event-family isolation and boundaries

`ip_boundaries.spec`: seven families declared at lab boot, pairwise disjoint
(every name unique, every name prefixed by exactly its family); each module
source declares/logs exactly one family; `CanonicalEventContext.ts`,
`ScoringManager.ts`, `EventLogger.ts`, `SessionState.ts`, `QualtricsBridge.ts`,
`docs/research/event-schema.md`, `docs/research/scoring-plan.md` contain no
IP family, alias or probe name; every proto event carries no
`study_item_ids`/`construct_id`/`success`.

## 9. Missing / invalid / censored

Window closure → register: completed/exhausted → completed (valid, raw
outcome recorded), exited (STOP TASK) → `participant_absent` (missing),
technical failure → `technical_failure` (invalid), never-opened → pending
with `entered:false`. Tutorial failed → decoder windows flagged
`comprehension_failure`; tutorial skipped → `invalid_entry_state` + prior-
exposure note (`ip_decoder`, `ip_boundaries`). A stopped M14 does not gate
M15. No module converts a missing opportunity into a value.

## 10. Tests and builds

Per unit: `npm.cmd run lint:tsc` and `npm.cmd run build` green before each
commit; ESLint clean on all touched files. Focused Playwright (`--retries=0
--workers=1`, `PW_DEV_PORT=5199`): `ip_engine` 15/15, `ip_lab_flow` 4/4,
`ip_pipe_suite` 17/17, `ip_decoder` 16/16, `ip_boundaries` 3/3,
`ip_visual_capture` 4/4 (final re-runs in Unit 5; see §13 for the sweep).
Automated full-lab playthrough wall time: **187.8 s** (one session, all
seven stations, typed lane + pointer).

## 11. Human-time estimate (NOT validated — no human pilot yet)

Estimated by walking the flows at a deliberate pace: tutorial ~60–75 s; M14
~50–60 s; M15 ~60–75 s; M16 ~45–55 s; M17 ~80–95 s; M13+M18 ~2.5–3.5 min;
total ≈ 7.5–9 min. Automated timing (187.8 s) is not human timing.

## 12. Screenshots (all inspected manually)

01 lab overview · 02 terminal open · 03 drag valid target · 04 drag no
target · 05 keyboard entry · 06 invalid command feedback · 07 help · 08
orientation complete · 09 M13 untouched · 10 M13 drag · 11 M13 invalid
target · 12 M13 keyboard-held piece · 13 M13 valid submitted network · 14
M18 console entry · 15 M18 evidence + test readout · 16 M18 hypothesis
interaction · 16b M18 rules reference · 17 M18 diagnosis logged · 18 M14
intake · 19 M15 reconstruction · 19b M15 codebook · 20 M16 new-rule reveal ·
21 M16 application · 22 M17 early feedback trial · 23 M17 transfer trial ·
24 lab after the suite. Defects found and fixed during inspection: chip
labels hidden behind rects (depth), instruction strip overlap, diagnosis
console invisible (scene order → `bringToTop`), rules overflowing the
readout (→ rules panel), M14 chip sub-label and 12-row output overflow, M15
rule lines overrunning the column.

## 13. Broader regression sweep and baseline

Final IP run after the fix round (`--retries=0 --workers=1`, port 5199):
**60/60 passed** across `ip_engine`, `ip_pipe_suite` (18 incl. the new
form-B lane), `ip_decoder` (16), `ip_boundaries` (3), `ip_lab_flow` (4),
`ip_visual_capture` (4) in 15.8 min.

Broader regression: a full sequential sweep of all 197 non-IP tests was
started but stopped at 12/197 (0 failures) because its projected runtime
(>5 h at ~2 min/test) exceeded the session budget; a documented chunk was
run instead — `four_zone_route`, `participant_viewport_display`,
`inventory_measurement_isolation`, `visual_snapshots`,
`pipe_diagnosis_setback`, `proc_textures_determinism`: **18/19 passed**; the
one failure (`proc_textures_determinism › manifest is pinned, fully
generated at Boot`, 60 s boot timeout) **fails identically at base
`eb87bd9`** (1/2 there too). Earlier paired runs: `connected_world_smoke`
and `movement_and_first_interaction` fail at base as well (boot timeout,
dock-default breakage); `pipe_diagnosis_setback` (Pump House) passed in
this chunk and in 3/5 earlier branch runs vs 3/3 at base (see §15). Note:
`visual_snapshots.spec.ts` overwrites `docs/verification/screenshots/*.png`
in place; those out-of-allowlist overwrites were restored with
`git checkout -- docs/verification/screenshots/` before the commit.
The full sweep remains a follow-up for the research owner's CI.

## 14. Reviews

Four independent read-only reviews ran after the first complete
implementation (fallback general-purpose agents adopting the project's
`scientific-reviewer`, `gameplay-reviewer`, `test-reviewer` and
`visual-reviewer` briefs — the named agents were not discoverable in this
session). No reviewer edited a file. One consolidated fix round was applied.

**Scientific (no blocking; 4 major, 4 minor, 3 notes).** Applied: raw
lab-level order field `ip_windows_opened_before` on every window payload
(finding 1); M18 `window_opened` now records `prior_m13_window_status`
supplied by the lab as closure context only — the console still imports and
reads no M13 state (3); entry-flag detail reads "at first open" (6); M14
stage/event renamed `recorded` / `intake_started` (8). Routed to the
research owner: M14 load dimension (2), tutorial calibration as per-item
control (5), `constraints_satisfied_at_submission` (kept — required by the
mission's raw list — labelled descriptive count) and
`contradictions_total_for_final` as candidate indicators (4), `exited` →
`participant_absent` register mapping (7; documented in windowState.ts).
Verified: no wording leakage (9), families disjoint (10), M17 no slope (11).

**Gameplay (usable with noted friction; 2 major, 11 minor/notes).**
Applied: M18 brief now states "SUBMIT DIAGNOSIS records ONE final answer"
(1); `rulesOpen` guards submit / stop / `I` (2–3); terminal footer is
adapter-driven and chips are draggable only when a drop or pair verb exists
(4); footer names the ESC layering and the typed meta words (5, 8); bench
copy states "up to four test runs" (6); `hoverSlot` cleared on pointer-out
(7). Not applied (noted): typed-line limit cue (9), buffer scroll (10), M15
instruction density (11), 9–10 px sub-label sizes (12), CLEAR without
confirm (13); confirm-before-submit routed to the research owner.

**Test (no blocking; 4 major, 4 minor, 3 notes).** Applied: the M18 entry
proof now compares the live console probe and raw M18 fields across the
four M13 paths, not only the pure snapshot (1); the blocked-console check
asserts the observed gate refusal via `__ipLabFeedback` (2); form-B browser
lane for M13 sealed run + M18 submission (4); `.every()` guards (5); M13
re-entry assertions (6); refused typed commands asserted in M14 (7). Not
applied: technical-failure / censored paths have no non-test trigger (3 —
documented gap; `censored` is currently unreachable), fixed post-action
sleeps (8 — probe-synced where state changes, noted as residual flake risk).

**Visual (readable with noted defects; 3 major, 7 minor, 3 notes).**
Applied: 50 % scrim behind help / rules / codebook modals (1); per-task
footer (3); "Form A" label removed from participant view (7); drag ghost
offset so target labels stay readable (5). Not applied: completed-station
cue in the lab after the suite (2), interstitial empty panels (9), label
sizes (10), lab chip/prompt overlap (4), keyboard-ghost placement (6).

## 15. Remaining defects and research-owner decisions

- Pump House `pipe_diagnosis_setback.spec.ts` (route) is intermittent on
  this branch (2 fails in 5 runs vs 3/3 pass at base): RoomScene prompt
  number-key handlers are unguarded `keydown-*` listeners (keyboard-queue
  replay under slow frames). Outside the allowlist; routed to route
  maintainers.
- Research-owner decisions (not resolved here): promotion of any
  `proto_m13_lattice_*` … `proto_m17_syntax_*` name or raw variable into the
  event schema / scoring plan; whether the lab M13/M18 supersedes the Pump
  House M13/M18; tutorial-gating policy (skip → `invalid_entry_state`);
  whether the M14 URGENT override counts as a second rule; M17 derived
  indicators (slope / trials-to-criterion) remain analysis-side only.
- Deviations: `I` does not close the terminal overlay (typed letters);
  `src/informationProcessing/` rather than `src/measurement/…`; bounded-unit
  "stop after one unit" overridden by the mission's explicit five-unit
  authorisation.

## 16. Confirmations

No score or canonical event was created; no protected file was modified; no
dependency installed; PixelLab not called; nothing pushed, merged, tagged,
deployed, deleted or removed.

## 17. Launch and focused verification

```
npm.cmd run start      # then open /?scene=information_processing_lab
#   DEV direct launch:  &module=tutorial|m14|m15|m16|m17|m13|m18   &ip_form=A|B
npm.cmd run lint:tsc && npm.cmd run build
PW_DEV_PORT=5199 npx playwright test e2e/ip_engine.spec.ts e2e/ip_pipe_suite.spec.ts e2e/ip_decoder.spec.ts e2e/ip_boundaries.spec.ts e2e/ip_lab_flow.spec.ts e2e/ip_visual_capture.spec.ts --retries=0 --workers=1
node scripts/claude/verify-unit.mjs --allowlist-file <list from docs/game/INFORMATION-PROCESSING-LAB.md §1>
```
