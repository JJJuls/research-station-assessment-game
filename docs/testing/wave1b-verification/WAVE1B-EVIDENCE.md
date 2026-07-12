# Wave 1B verification evidence

Date: 2026-07-12 · Branch `fable-autonomous-game-build-v1` · Verified from
`d9d4789` per `docs/expansion/WAVE-1B-VERIFICATION-PLAN.md`. Playwright MCP
enabled for this session; PixelLab disabled throughout.

## 1. Consolidated Playwright suite — ALL PASS

`npx playwright test` (serial, port 5173, retries 1): **24/24 passed, 0
failed, 0 flaky in the final consolidated run** (~9.5 min). Coverage:

| Spec                           | Tests | Result                                           |
| ------------------------------ | ----- | ------------------------------------------------ |
| launch_with_research_params    | 2     | pass                                             |
| movement_and_first_interaction | 1     | pass                                             |
| archive_room_logging           | 2     | pass                                             |
| repair_room_logging            | 4     | pass (incl. NEW objective_completed parity test) |
| engineer_hub_logging           | 2     | pass                                             |
| inventory_prep_logging         | 3     | pass                                             |
| side_repair_logging            | 3     | pass                                             |
| interruption_corridor_logging  | 3     | pass                                             |
| final_core_summary             | 3     | pass                                             |
| hazard_control_logging         | —     | not created (room user-blocked)                  |

Every science pin in the suite (exact `study_item_ids`, `construct_id`,
`success`) asserts against live logged events and matched the frozen
`CANONICAL_EVENT_CONTEXT` registry (zero diff to that file this wave — see
§6). Scoring separation invariants verified at runtime in both directions
(archive + repair: adaptive path leaves `game_inappropriate_persistence` = 0
and `blind_retry_count` = 0; blind-retry path sets both to exactly 1 with no
adaptive contamination). Mission-state propagation verified via the new
read-only `getMissionState()` debug probe (accepted/skipped duties, active
objectives, `field_kit`, `workspace_status`, `side_repair_status`).

During room-by-room bring-up the only failures beyond the items in §2–§4
were two cold-start boot flakes (first Vite compile of a session exceeding
the 60 s boot window; passed on retry; absent from the final consolidated
run).

## 2. Genuine implementation defect found and fixed (1)

**SideRepairScene: Utility Bot unreachable (blocking).** The room grid's
row-7 central block (`'#.##....####....##.#'`, tiles x 256–384 / y 224–256)
overlapped the spawn point (320, 272 with the 32×42 player body) and sealed
the only approach lane to the bot at (320, 176): every player was ejected
below the block and could never open the room's prompt — all three
side-repair paths failed. Fix (`src/scenes/SideRepairScene.ts`): cleared the
central segment of row 7 (now `'#.##............##.#'`), matching the
Repair/Archive room convention; flanking shelves preserved. Placeholder
level geometry only — no option labels, meanings, order, events, or any
scientific contract touched. All 3 side-repair paths pass after the fix.

## 3. Debug-API addition (gated, additive)

The six room specs' mission-state probes assumed `window.researchRuntime`
exposes session state; it exposed exactly the 6 baseline methods
(`installDeveloperHelper` builds a literal — the prep-phase §1 claim in
WAVE-1B-VERIFICATION-PLAN.md that `sessionState.…` was "valid dev-mode API
usage" was wrong). Reviewed under `qualtrics-logging-review`:
**added dev-only, read-only `getMissionState()`** to the helper
(`src/systems/ResearchRuntime.ts`), returning SessionState's defensive copy
(no mutation path). The baseline six methods are unchanged;
`launch_with_research_params.spec.ts`'s pinned surface list now includes the
7th method with a comment. Raw logs, payloads, scoring, and Qualtrics
handling untouched.

## 4. Route/test choreography fixes (test-side only)

1. `e2e/helpers.ts`: new `waitForNthEvent()` — re-entry paths raced because
   `waitForRoomEntry` matches the first occurrence and returns instantly on
   a second visit.
2. `repair_room_logging` test 3: the manual-station leg clamps against
   either the machinery block's east face (x ≈ 144) or the west wall
   (x ≈ 48) depending on row alignment (32×42 body); the manual is in range
   from both, but the old exit legs overshot the Hub door from the x 144
   case. Exit now normalizes with a double clamp (bottom wall, then west
   wall) before the timed east leg; re-entry waits on
   `repair_returned_after_failure` itself.
3. New parity test (identified coverage gap): Archive + Repair completed in
   one session → `objective_completed` fires exactly once, only after the
   second completion, with the archive-terminal payload context
   (prototype-parity, `room_id: archive_room`).
4. `hubToStationDoor` door-ring routes: verified at runtime as authored for
   all six open stations — no tuning needed (registry door coordinates and
   Hub-grid clamp math held).

## 5. Prototype regression drive (`?scene=prototype`)

Throwaway headed-Chromium drive (script + raw output:
`proto-drive-report.json` in this directory). Fixture comparison on stable
fields (`event_type, scene, episode, object_id, room_id, task_id,
study_item_ids, construct_id, success, score_delta, metadata`; positional/
timing/session fields excluded by design):

- **S1 dock path** vs `events-dock-path.json`: 10 vs 10 events, **0 diffs**.
- **S2 archive adaptive** vs `events-archive-adaptive.json`: 11 vs 11, **0
  diffs**.
- **S3 archive maladaptive** vs `events-archive-maladaptive.json`: 9 vs 9,
  **0 diffs**; `completeDebugSession()` append-only confirmed (event count
  strictly increased); return URL preserved `return_url` params and appended
  summary variables.

### New Phase-0 reference: documented additive payload deltas (fixtures NOT rewritten)

The only two prototype payload changes of the wave, both intentional
registry additions (Wave 1A beats 4/6), verified live:

- `side_repair_completed` (prototype option 3) now carries
  `study_item_ids: ["Q07","Q16","Q32"]`, no `construct_id` — event name,
  position in the legacy triple (`side_repair_started`,
  `side_repair_completed`, `side_repair_productive_persistence`), one-shot
  gate, and all co-event payloads unchanged (co-events still carry no
  canonical context).
- `final_core_status_reviewed` (prototype option 2) now carries
  `study_item_ids: ["Q11"]`, `construct_id: "responsibility"` — event name,
  position in the legacy structured triple, one-shot gate, and co-event
  payloads unchanged.

The `baseline-e8a8994` fixture JSONs contain neither event and were not
modified.

## 6. Final gates (at commit time)

- `npm.cmd run build`: PASS (pre-existing chunk-size warning only).
- `npm.cmd run lint:tsc`: PASS.
- `git diff --check`: clean.
- Frozen scientific surfaces: `git diff` shows **zero changes** to
  `CanonicalEventContext.ts`, `ScoringManager.ts`, `QualtricsBridge.ts`,
  `EventLogger.ts`, `SessionState.ts`, `DataQualityTracker.ts`.
- Hazard Control: still unimplemented (no scene file; registry entry has no
  `sceneKey`; Hub door sealed) — awaiting the user-owned `hazard_avoidance`
  decision.
- Console errors: none on world-scene boot (headed probe, 4-event boot
  sequence clean). Environment note: script-launched **old-headless**
  Chromium fails with `Framebuffer status: Framebuffer Unsupported` before
  any scene starts (both prototype and world scenes); the Playwright test
  runner's headless-shell and headed runs are unaffected — environment
  artifact, not a game defect.
