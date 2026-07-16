# Pilot gameplay vertical slice — implementation report

Status: implemented on branch `gameplay-vertical-slice` (worktree), based on
`fable-autonomous-game-build-v1` @ `8f7a07c`. Autonomous gameplay unit per
`FABLE-AUTONOMOUS-GAMEPLAY-VERTICAL-SLICE.md` (task file, not committed).

## What this unit delivers

A playable 5–10 minute research-assessment loop:

`launch -> Dock check-in -> Station Hub -> Scenario B (priority allocation)
-> Engineer Hub -> Scenario A (calibration anomaly) -> engineer report
-> Final Core synchronization -> debug completion/return flow`

plus a reusable, configuration-driven ethical-decision scenario framework
(`src/scenarios/`) powering both scenarios through the existing RoomScene
prompt machinery — one engine, two configured scenarios, zero duplicated
scene logic.

## Files changed

New:

- `src/scenarios/scenarioTypes.ts` — scenario configuration types.
- `src/scenarios/ScenarioController.ts` — the framework engine: stage flow
  (briefing → evidence → decision → confirm/revise → commit → consequence →
  completion), session-lifetime state, event logging, dev-only progress
  probe (`window.__scenarioProbe`), deterministic reset hook.
- `src/scenarios/definitions/calibrationAnomaly.ts` — Scenario A content.
- `src/scenarios/definitions/priorityAllocation.ts` — Scenario B content.
- `src/scenarios/index.ts` — barrel.
- `e2e/scenario_calibration_logging.spec.ts` — Scenario A room-isolation
  spec (2 tests).
- `e2e/scenario_allocation_logging.spec.ts` — Scenario B room-isolation
  spec (1 test).
- `e2e/scenario_pilot_route.spec.ts` — full start-to-finish pilot route
  (1 test).
- `docs/game/PILOT-GAMEPLAY-VERTICAL-SLICE.md` — this report.

Modified (narrow integrations only):

- `src/world/RoomScene.ts` — additive `logScenarioEvent()` (interaction
  context + first-class `choice_value` + metadata; deliberately does not
  spread canonical context) and an OS key-autorepeat guard on prompt option
  keys (see "Defects found and fixed").
- `src/data/researchInteractions.ts` — two additive registry entries:
  `engineerCalibrationBench` (engineer_hub), `hubPriorityAllocation`
  (station_hub). No task_id, empty score_tags, no canonical mapping.
- `src/scenes/EngineerScene.ts` — Calibration Bench station (16*32, 5.5*32)
  - scenario prompt branch + room-exit abandonment hook. Legacy Kai report
    task untouched.
- `src/scenes/HubScene.ts` — Priority Allocation console (11.5*32, 9.5*32,
  south face of the console block) + scenario prompt branch + room-exit
  abandonment hook. Status-board text untouched (ADV-5 byte-pins it).
- `e2e/helpers.ts` — exported `driveAxisTo` (now with adaptive burst
  length), added position-synced `hubToAllocationConsole` /
  `engineerToCalibrationBench` navigation, the `scenarioProbe` reader, and
  converted `hubToStationDoor` / `hubToNorthWestAnchor` final legs from
  fixed-duration holds to position-synced driving (the known
  movement-undershoot flake genre — observed live four times during this
  unit's bring-up under parallel-job CPU load).
- `e2e/journey.ts` — same conversion for `dockToHubJourney`,
  `hubToDockJourney` and `stationToHubJourney`; `captureErrors` now filters
  the environmental headless-Chromium "AudioContext … audio device" console
  error (not an app error; every genuine failure still fails the gate).
- `playwright.config.ts` — dev-server port overridable via `PW_DEV_PORT`
  (default 5173 unchanged). Without it, `reuseExistingServer` silently
  reused another checkout's stale :5173 server and tested the WRONG code —
  observed live during this unit's first test run.

## Rooms/zones used

Existing rooms only (no new scenes): Station Hub (Scenario B), Engineer Hub
(Scenario A). Both stations are placed clear of existing spawn radii,
door routes, and the specs' position-synced driving lanes; existing
interactables remain the strict nearest target on their own approaches.

## Reusable framework

`ScenarioDefinition` (data) + `ScenarioController` (engine):

- scenario identity (`id`, station interaction key, station label);
- room/interaction trigger via `buildStationConfig()` → RoomScene station;
- briefing stage with fixed-order options;
- inspectable evidence entries (open/close with dwell), `optional: true`
  entries additionally log an information-request marker;
- decision modes: `single` (choose → confirm/reconsider) and `ordered`
  (slot-by-slot allocation → review → commit/revise) — the reusable
  choice/ordering component;
- optional revision before commitment (reconsider / revise, logged);
- committed outcome (`resolveOutcome(committedValue)`) with consequence
  stage and acknowledge step;
- completion flag with one-shot re-open gate ("already logged" feedback);
- abandonment (room exit before commit) and interruption (step-away)
  telemetry via the host scene's exit hook;
- deterministic reset (`resetAllScenarioStates()`; fresh page load resets
  everything in practice) and a dev-only read-only progress probe.

Scenario state lives at module scope for the page-session lifetime
(roomTaskState precedent), so leave-and-return keeps evidence/selection
progress and completed scenarios stay completed across room transitions.

## Scenarios implemented

### A — equipment calibration anomaly (Engineer Hub, `calibration_anomaly`)

Sensor array C drifts; tonight's readings feed the supply request and the
uplink window closes at end of shift. Evidence: drift log, array B
cross-check, extended diagnostic (optional). Decision (single mode):
report the drift now / sign off as valid to hold the window / hold for a
supervised re-check. Each option carries a credible operational cost;
consequences are shown immediately (late corrected request / on-time
request with an unresolved drift flag / request waiting on verification).

### B — status-board resource allocation (Station Hub, `priority_allocation`)

Two overnight power priority slots, three competing requests (life-support
scrubber margin, sample cryostore, crew quarters), explicit performance
target (green readiness at morning inspection) against fairness pressure
(crew repeatedly deprioritised, comfort unscored). Decision (ordered mode):
assign slot 1 then slot 2, review, commit or revise. The consequence follows
from whichever need was left unpowered.

## Player path and duration

Route: Dock (check-in) → Hub (allocation console) → Engineer Hub
(calibration bench, then Kai report) → Hub → Final Core (synchronization).
The automated full-route playthrough (`scenario_pilot_route.spec.ts`)
records its wall-clock duration as a test annotation; see "Playthrough
record" below. Human play with reading time is estimated at 6–10 minutes.

## Instrumentation added

All events flow through the existing `EventLogger` via
`ResearchRuntime.logInteraction` (no new store). Stable identifiers, every
one carrying `metadata.scenario_id`:

`scenario_entered`, `scenario_briefing_opened`, `scenario_evidence_opened`,
`scenario_evidence_closed` (dwell_ms), `scenario_optional_info_requested`,
`scenario_option_selected` (choice_value; slot metadata in ordered mode),
`scenario_option_changed` (previous/new), `scenario_decision_committed`
(choice_value, changes_before_commit, evidence_viewed_count,
optional_info_requested, commit_latency_ms, ms_since_first_selection,
ms_since_entered), `scenario_consequence_shown`, `scenario_completed`,
`scenario_interrupted`, `scenario_abandoned`.

GOVERNANCE: these are **pilot-development telemetry candidates only** —
deliberately absent from `CANONICAL_EVENT_CONTEXT` (no `study_item_ids`, no
`construct_id`, no `success`), absent from `ScoringManager`, never Q-mapped,
and never shown wording from the Q01-Q33 battery. Promoting any identifier
into `docs/research/event-schema.md` / `scoring-plan.md` is a research-owner
decision (see `docs/ai/SCIENTIFIC-AUTHORITY-AND-OPEN-DECISIONS.md` process).
No existing event schema was changed.

## Tests and results

New Playwright specs (deterministic, position-synced driving; no
snapshots): scenario activation; evidence inspection logging with dwell;
option selection and revision (both modes); decision commitment with
latency payloads; duplicate-completion prevention; consequence/progression
state; cross-entry persistence and fresh-session reset (new boot = clean
state, asserted implicitly by every fresh-boot test starting at zero
counts); no effect on unrelated scenes/mission state (status board
byte-format untouched, `completed_rooms` untouched by scenarios); event
identifiers and payload fields pinned; full playable route through both
scenarios plus run completion.

Results (worktree dev server on `PW_DEV_PORT=5199`, machine under parallel
test load from a second session):

- `scenario_calibration_logging` (2 tests), `scenario_allocation_logging`
  (1 test), `scenario_pilot_route` (1 test): **all 4 passed**
  (`.last-run.json: "passed"`, zero failed tests; the route test consumed
  its single retry once under load).
- Focused regression battery — `adversarial_status_board_display` (ADV-5,
  byte-pinned board with the new console present),
  `engineer_hub_logging`, `connected_world_smoke`,
  `movement_and_first_interaction`, `adversarial_input_spam` (2 tests):
  **7/7 passed**.
- `npm.cmd run lint:tsc`: clean. ESLint on every changed file: clean.
- `npm.cmd run build` (production): passes (pre-existing chunk-size
  warning only).
- Full suite not re-run in this unit (≈90+ min under current machine
  load); the battery above covers every scene/helper this unit touched.

## Playthrough record

Automated start-to-finish playthrough (`scenario_pilot_route.spec.ts`,
real keyboard driving through real doors):

- Path: Dock (skip-path check-in) → Hub → Priority Allocation console
  (evidence: load forecast; slots: life support, cryostore; commit;
  consequence: crew-quarters complaints; acknowledge) → Engineer Hub →
  Calibration Bench (evidence: array B cross-check; decision: report the
  drift; commit; consequence: late corrected supply request; acknowledge)
  → Kai report (prepared path, relay duty declined) → Hub → Final Core
  (blocker shown for the missing field kit; structured completion) →
  debug completion/return flow.
- Scenarios completed: 2/2 (`priority_allocation`, `calibration_anomaly`),
  one commit each, zero abandonments.
- Events produced: ~50 for the route (verified in-order subsequence from
  `session_start` through `final_core_completed`, plus the return-flow
  `objective_completed`); every event carries the launch metadata.
- Wall-clock duration of one automated pass: ≈3 minutes (no reading time,
  movement at walk speed). Human pilot estimate with briefing/evidence
  reading: **6–10 minutes**.
- Mission state at completion: `dock_arrival`, `engineer_hub`,
  `final_core_room` completed; `final_core_status =
completed_structured`; scenarios deliberately absent from
  `completed_rooms` (they are station-level tasks, not rooms).

## Defects found and fixed

- Initial console placement (13*32, 9.5*32) sat 64 px from the Dock-entry
  hub spawn — inside the 72 px interaction radius, violating the registry's
  spawn-clearance rule. Moved to (11.5*32, 9.5*32) (80 px clearance) before
  any test run.
- OS key autorepeat could cascade a held numeric key through chained prompt
  stages (briefing → evidence → back …), a real-player double-activation
  path amplified by the scenario framework's multi-stage flows. Fixed in
  `RoomScene` by ignoring `KeyboardEvent.repeat` on prompt option keys —
  discrete presses (all existing specs, normal play) are unaffected.

## Known limitations

- Consequences are scenario-local (consequence stage + one-shot gate);
  they do not write `SessionState` fields or status-board lines — avoided
  deliberately because ADV-5 byte-pins the board text and cross-room
  consequence semantics are a research-owner decision.
- Scenario progress is not shown on the Hub status board (same reason).
- The prompt panel's fixed geometry caps briefing length (~3 wrapped
  lines above 5 options); longer evidence bodies fit their 1-option stages.
- Evidence inspection is optional by design (information search is the
  measured behaviour); there is no forced-evidence gate before deciding.
- `resetAllScenarioStates()` exists for future unit tests; e2e reset is a
  fresh page load.
- Repo-wide ESLint currently reports CRLF prettier errors in THIS worktree
  only (checkout artifact of `core.autocrlf=true`; the primary tree is LF).
  All files touched by this unit were normalized to LF and lint clean.
- Merge-conflict surface with the parallel data-export unit: this unit
  touches no export/infrastructure files (`ResearchRuntime`,
  `SessionState`, `QualtricsBridge`, `ScoringManager`, Supabase code all
  untouched), but `e2e/helpers.ts` / `e2e/journey.ts` are shared test
  infrastructure — if the export unit edited them too, expect a small,
  mechanical merge.

## Recommended next gameplay unit

1. Research-owner review of the `scenario_*` candidate identifiers and the
   two scenario designs (mapping/promotion decision; open-decision queue).
2. Scenario C (incident report reconciliation) as a third configuration of
   the same framework — the engine already supports it (single mode +
   evidence comparison), so it is mostly content work.
3. Optional: surface scenario completion as status-board lines once the
   research owner approves changing the pinned board format (requires
   updating ADV-5's byte-pinned expectations in the same change).
