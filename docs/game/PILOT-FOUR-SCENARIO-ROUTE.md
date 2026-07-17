# Pilot four-scenario route — integration and expansion report

Status: implemented on `fable-autonomous-game-build-v1`. Autonomous unit per
`FABLE-AUTONOMOUS-INTEGRATE-AND-EXPAND.md` (task file, not committed).
Extends the two-scenario vertical slice
(`docs/game/PILOT-GAMEPLAY-VERTICAL-SLICE.md`, historical baseline).

## Integration result

- Baseline: `d6cdf70` (test-only Supabase export unit) on
  `fable-autonomous-game-build-v1`.
- Gameplay commit `82d50f9` (two-scenario vertical slice, worktree branch
  `gameplay-vertical-slice`) cherry-picked cleanly as `72d168a`.
- Safety pointer `backup-before-gameplay-integration-d6cdf70` already
  existed at `d6cdf70` and was left in place.
- Conflicts: none blocking. `e2e/helpers.ts` was the only overlapping file;
  git auto-merged it and the result preserves both units (the export unit's
  `launch_mode` launch param AND the gameplay unit's position-synced
  helpers). Verified by diffing the merge against both parents.
- One integration seam defect found and fixed during combined validation:
  `e2e/research_export_test_mode.spec.ts` hard-coded `localhost:5173` in
  its two "no Qualtrics redirect / stayed on the game page" assertions,
  which fails under the gameplay unit's `PW_DEV_PORT` port-isolation
  override. The assertions now derive the expected host exactly the way
  `playwright.config.ts` derives the port. No app code involved.
- Working-tree line endings of cherry-picked/edited files normalized to LF
  (checkout artifact of `core.autocrlf=true`; blob content unchanged —
  `git diff` is byte-empty for the normalization).

## Combined validation (integration gate, before expansion)

- `npm.cmd run lint:tsc`: clean. ESLint over every affected file: clean.
- Production build: passes (pre-existing chunk-size warning only).
- Scenario specs A/B + route: 3 passed + 1 flaky-passed (calibration spec
  timed out once waiting on a scene-start count under CPU load — the
  documented movement/timing baseline genre — and passed on retry).
- `research_export_test_mode` (8) + `launch_with_research_params` (3):
  all passed — participant-mode zero-transport, export idempotency and
  duplicate-id behaviour intact alongside the gameplay unit.
- `adversarial_status_board_display` + `connected_participant_journeys`:
  4 passed (17.9 min; byte-pinned status board unchanged with the
  allocation console present).

## Scenarios C and D

Both are pure configurations of the existing `ScenarioController`
framework (no new engine, no new scene, no new room):

### C — incident-report reconciliation (Archive Room, `incident_reconciliation`)

Station: Records Reconciliation Desk (`archive_reconciliation_desk`,
16*32, 9*32 — open south-east floor, 190+ px clear of the terminal, log
shelves, spawn and door). The incident file on last cycle's pressure spike
is due before the section review closes tonight (deadline + readiness
consequence). Records disagree: the automated sensor record shows the
spike beginning before the valve-inspection tag was written; the duty
report logs the inspection complete, "no anomalies", nine minutes before
the spike. Optional cross-check: sensor clock history (undercuts, without
forbidding, the instrument-fault attribution). Decision (single mode):
file the discrepancy as it stands / align the timeline / attribute to a
sensor clock fault / hold for an extended records review. Each option
carries a credible, morally ambiguous operational consequence shown
immediately.

### D — colleague protocol breach (Inventory / Prep Room, `protocol_breach`)

Station: Supply Airlock Seal Log (`inventory_seal_log_terminal`, 4*32,
7.5*32 on the left storage block, 190+ px clear of the quartermaster
console, spawn and door). Last night's outbound supply cycle ran with the
seal verification overridden under the quartermaster's personal code; no
override report was filed. Mitigating context is real and inspectable:
the verification interlock was faulted (~1 h reset) and a cold-chain
medical crate had a fixed 03:00 transport window (optional manifest).
Decision (single mode): forward to command for formal review / file the
cycle under the interlock fault with no override noted (conceal) / take
it to the quartermaster and require the correcting report / leave the
entry unreported. Visible, ambiguous consequences for each.

Both scenarios inherit from the framework: selection and revision before
commitment, one-shot completion gate, step-away interruption and
room-exit abandonment telemetry, committed-but-unacknowledged recovery,
and the dev-only `window.__scenarioProbe`.

## Full player route (development route)

`launch -> Dock check-in -> Hub: Scenario B (priority allocation)
-> Engineer Hub: Scenario A (calibration anomaly) + Kai report
-> Archive: Scenario C (incident reconciliation)
-> Inventory/Prep: Scenario D (colleague protocol breach)
-> Final Core synchronization -> debug completion/return flow`

- Every leg goes through real doors and transitions; scenario progression
  survives leaving and re-entering rooms (session-lifetime module state).
- Interaction prompts: each station is labelled in-world and its briefing
  states the objective; the one-shot gates give explicit "already logged"
  feedback on re-visit.
- Held keys cannot skip stages (RoomScene ignores OS key autorepeat on
  prompt option keys — from the gameplay unit, re-verified here).
- Participant-mode submission stays disabled and no Qualtrics redirect is
  activated (re-verified by the export spec battery after integration).

### Route legibility and enforcement (pilot route repair)

The first supervised human run exposed that the route above existed only in
documentation: the participant found A/C/D incidentally, stepped away from
each without committing, never encountered B, and Final Core still closed
the mission cycle. Repaired per `FABLE-AUTONOMOUS-PILOT-ROUTE-REPAIR`:

- **Duty-roster HUD** (RoomScene, every room, allowed progress UI only —
  checklist/status labels, no scores): a persistent line showing the dock
  check-in directive, then `station decisions D/4 — next: <station>
(<room>)` in route order, then `synchronize at the Final Core`, then
  `mission cycle complete`. Driven by `src/scenarios/pilotRoute.ts` +
  explicit scenario completion state; deliberately NOT SessionState
  (`active_objectives` feeds the Q18-relevant `objective_active` event and
  must stay untouched by pilot scenarios).
- **Final Core route gate** (FinalCoreScene, in front of the legacy
  options, after the one-shot completed check): until all four scenarios
  are completed, the core interface opens a LOCKED prompt listing every
  remaining decision with a single step-back option. `final_core_opened`
  fires only when the real decision prompt opens; blocked attempts log
  `final_core_blocked_pending_decisions` (raw pilot telemetry with
  `remaining_count` + `remaining_scenario_ids`). Gating reads explicit
  per-scenario completion state — never event counts — so progress
  survives room transitions and no debug/test surface satisfies the route.
  The legacy three options, the Q28 blocker/force branch and all canonical
  Final Core events are unchanged once the gate is satisfied.
- Scenario COMPLETION is now enforced before Final Core; the B→A→C→D
  ORDER remains a development convention (any completion order unlocks).
- New dev-only, read-only probes for runtime verification:
  `window.__routeObjectiveText` (rendered HUD line) and
  `window.__lastPromptBody` (rendered prompt-stage text), both
  presentation-only and stripped from production builds.

## Raw telemetry identifiers

Unchanged framework event set, now emitted by four scenario ids
(`priority_allocation`, `calibration_anomaly`, `incident_reconciliation`,
`protocol_breach`), each with `metadata.scenario_id` on every event:

`scenario_entered`, `scenario_briefing_opened`, `scenario_evidence_opened`,
`scenario_evidence_closed` (dwell_ms), `scenario_optional_info_requested`,
`scenario_option_selected`, `scenario_option_changed`,
`scenario_decision_committed` (choice_value + latency/evidence metadata),
`scenario_consequence_shown`, `scenario_completed`,
`scenario_interrupted`, `scenario_abandoned`.

Route-gate marker (pilot route repair, same unmapped pilot-telemetry
governance; Final Core interaction context, no `scenario_id`):
`final_core_blocked_pending_decisions` (`metadata.remaining_count`,
`metadata.remaining_scenario_ids` in route order). A clean completion run
emits exactly one `scenario_decision_committed` and one
`scenario_completed` per scenario id and zero route-gate markers.

New evidence ids: C — `sensor_record`, `duty_report`, `clock_history`
(optional); D — `cycle_log`, `fault_ticket`, `outbound_manifest`
(optional). New committed values: C — `file_discrepancy`,
`align_timeline`, `attribute_clock_fault`, `request_extended_review`;
D — `report_breach`, `log_as_fault`, `private_correction`,
`leave_unreported`.

GOVERNANCE (unchanged): every `scenario_*` event is **pilot-development
telemetry only** — unmapped in `CANONICAL_EVENT_CONTEXT` (no
`study_item_ids`, no `construct_id`, no `success`), absent from
`ScoringManager`, never written into scored `SessionState` fields, never
Q-mapped, and never shown Q01-Q33 wording. Promotion into
`docs/research/event-schema.md` / `docs/research/scoring-plan.md` remains
a research-owner decision.

## Tests and build

New specs (same discipline as A/B: position-synced driving, count-aware
waits, unmapped-payload governance assertions):

- `e2e/scenario_reconciliation_logging.spec.ts` (2 tests): activation,
  evidence dwell, optional info, selection, revision, commit payload,
  consequence, completion, duplicate-completion gate, mission-state
  isolation, scene-leak sweep; interruption, abandonment (including
  "scenario never trips `archive_abandoned`"), cross-entry persistence,
  and the legacy forced-failure archive task completing beside the desk.
- `e2e/scenario_breach_logging.spec.ts` (2 tests): the same coverage in
  the Inventory/Prep room, plus `prepared_items` untouched by the
  scenario and the legacy quartermaster checklist/verify/cleanup path
  completing beside the seal log.
- `e2e/scenario_pilot_route.spec.ts` extended to the four-scenario route
  with a per-event scenario-to-scene isolation sweep and the return flow.

Results (worktree dev server on `PW_DEV_PORT=5199`):

- Scenario C spec: 2 passed. Scenario D spec: 2 passed.
- Four-scenario route: passed (first attempt, 3.1 min).
- Focused regression: `scenario_allocation_logging`,
  `scenario_calibration_logging` (1 known-genre flaky-pass),
  `archive_room_logging`, `adversarial_archive_abandon_return`,
  `inventory_prep_logging`, `launch_with_research_params`,
  `research_export_test_mode` — green.
- `npm.cmd run lint:tsc`: clean. ESLint on all changed files: clean.
  Production build: passes.
- Full suite (73 tests, 50.7 min under sustained load): **71 passed**,
  1 flaky (the four-scenario route consumed its retry once), 1 failed —
  `scenario_calibration_logging` "step-away interruption / legacy Kai
  report unaffected", a spec from the two-scenario slice. Both incidents
  share one root: the original `engineerToCalibrationBench` approach
  could stop ~78 px from the bench at driveAxisTo tolerance extremes —
  just outside the strict 72 px interaction radius — so under CPU load
  the SPACE press intermittently missed (this unit's earlier
  flaky-passes of the same spec were the same geometry). Fixed
  test-side after the suite run: the helper gains a fourth position-
  synced leg that ends on a wall clamp ~34-50 px from the bench, making
  the approach load-independent; both affected specs were then re-run
  green in isolation. No app code involved, and the failure was never an
  integration or expansion regression.

## Playthrough record

Automated start-to-finish development playthrough
(`scenario_pilot_route.spec.ts`, real keyboard driving through real
doors): all four scenarios completed with one commit each, zero
abandonments; Kai report (prepared path, relay duty declined); Final Core
structured completion; debug return flow.

- Wall-clock of one automated pass: ≈188 seconds (movement at walk speed,
  no reading time; passed on both recorded runs).
- Events logged for the full route: 74 (every one carrying the launch
  metadata).
- Human pilot estimate with briefing/evidence reading across four
  scenarios plus check-in, Kai report and Final Core: **~8-12 minutes**,
  inside the 7-12 minute target.

## Known limitations

- Consequences remain scenario-local (no `SessionState` writes, no status
  board lines) — cross-room consequence semantics stay a research-owner
  decision; ADV-5 byte-pins the board text.
- The Archive hosts both the forced-failure code task (Q13/Q22-Q26) and
  Scenario C; the Inventory room hosts kit prep (Q01-Q04/Q30) and
  Scenario D. Tests pin that neither scenario touches the rooms' mission
  state or canonical events, but whether scenario play _before_ the
  canonical task shifts behaviour on that task is a study-design question
  for the research owner, not something these tests can rule out.
- Scenario order on the route is a development convention; nothing
  enforces B→A→C→D for a free-roaming participant. Completion of all four
  IS enforced before Final Core (route gate, pilot route repair); the
  duty-roster HUD always directs to the first pending stop in route order.
- The two known environmental test flakes remain: CPU-load movement
  undershoot on long journeys and the cold first WebGL context (both
  documented pre-existing genres; retries absorb them).

## Exact next pilot step

Research-owner review of the four scenario designs and the `scenario_*`
candidate identifiers (promotion/mapping decision via
`docs/ai/SCIENTIFIC-AUTHORITY-AND-OPEN-DECISIONS.md`), then a supervised
human pilot playthrough of the four-scenario route in launch_mode=test
against the staging ingestion endpoint (`.env.local`, still pending a
live synthetic test).
