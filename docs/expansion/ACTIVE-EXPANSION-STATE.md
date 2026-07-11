# Active Expansion State — Wave 1A

Live checkpoint file. Updated after every commit. Newest entry first.

- **Branch**: `fable-autonomous-game-build-v1` (V1 slice frozen at `556e273`)
- **Protected branch**: `fable-final-game-prep-from-prototype` @ `e8a8994` — untouched
- **Session constraints**: main Fable agent only; Playwright + PixelLab disabled;
  no push/merge/PR/rebase/reset/branch-switch.

## Current status

- **Last commit**: `72c6bc9` — U2 task-state factory
- **Completed**:
  1. `dd498f2` — `REMAINING-STATION-INVENTORY.md` (7 stations: sources,
     study_item_ids, construct_ids, semantics, legacy+canonical events,
     scoring restrictions, readiness, risks; cross-station open parameters).
  2. `f1db32f` — `EXPANSION-WAVE-1-PLAN.md` (5-criteria ranking, station
     order Repair → Engineer Hub → Inventory → Side Repair → Interruption →
     Hazard(blocked) → Final Core; shared-architecture units U1–U6).
  3. `ed2a39b` — this state file.
  4. `2fbbd57` — **U1**: `src/world/stationRegistry.ts` (8 stations: room_id,
     label, routeParam, sceneKey?, hubDoor, hubSpawn);
     `isSceneRouteRegistered` in SceneRouter; HubScene door ring + getSpawn
     read the registry; Boot calls `registerBuiltStationRoutes()`. Zero
     behaviour change (archive-only open; sealed semantics byte-identical).
     Files: `src/world/stationRegistry.ts`, `src/world/SceneRouter.ts`,
     `src/world/index.ts`, `src/scenes/HubScene.ts`, `src/scenes/Boot.ts`.
     Build + tsc PASS. ESLint: 353 pre-existing repo-wide CRLF/prettier
     errors only (not introduced by this wave).
  5. `72c6bc9` — **U2**: `src/world/roomTaskState.ts` —
     `createRoomTaskState` (module-scope session-lifetime store, duplicate
     key throws, test-only `resetAllRoomTaskStates` not barrel-exported per
     `resetSessionOnceFlags` precedent) + shared `FailedTaskState` helpers
     (`recordFailedAttempt` didRepeat check, `shouldLogAbandonedOnExit`,
     `shouldLogReturnedOnEnter` — ArchiveScene semantics byte-for-byte).
     ArchiveScene deliberately not migrated. Files:
     `src/world/roomTaskState.ts`, `src/world/index.ts`. Build + tsc PASS.
- **Exact next action**: implement **U3 — controlled-option prompt
  rendering** in `RoomScene`: N numbered options (deterministic order, no
  randomisation) instead of the fixed 1–3 keymap, plus chained prompt
  stages (PromptOption gains an optional follow-up prompt). Existing
  3-option stations must render byte-identically ("Press 1, 2, or 3 to
  choose." retained for 3-option prompts). Build + tsc; commit; update this
  file.
- **Then**: U4 canonical event-context registrations → U5 mission-state
  helpers → U6 e2e fixtures → station beats in plan order (Repair first).

## Unresolved issues (user-owned; never decided autonomously)

1. Dock idle threshold/definition (gates `baseline_idle_seconds`,
   `tutorial_help_shown` watcher, `excessive_idle_after_instruction`).
2. `construct_id` for abandon/return events (Q24/Q25 family) — ports keep
   unset per committed precedent.
3. `hazard_avoidance` canonical resolution — **blocks Hazard Control beat**.
4. `engineer_report_submitted_supervised` canonical mapping (non-blocking).
5. `interruption_alert_acknowledged` mapping (non-blocking).
6. Beat-13 scoring fixes bundle (out of Wave 1A scope by design).
7. Stimulus-freeze reviewer dispositions (gate participants, not this wave).

## Commit log (wave)

| SHA       | Unit   | Content                       |
| --------- | ------ | ----------------------------- |
| `dd498f2` | Docs 1 | Remaining-station inventory   |
| `f1db32f` | Docs 2 | Wave 1 plan (ranking + units) |
| `ed2a39b` | Docs 3 | Active expansion state file   |
| `2fbbd57` | U1     | Station registry + routing    |
| `b9b4d49` | Docs   | State checkpoint after U1     |
| `72c6bc9` | U2     | Room task-state factory       |
