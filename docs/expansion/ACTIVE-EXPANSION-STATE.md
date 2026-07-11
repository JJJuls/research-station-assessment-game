# Active Expansion State — Wave 1A

Live checkpoint file. Updated after every commit. Newest entry first.

- **Branch**: `fable-autonomous-game-build-v1` (V1 slice frozen at `556e273`)
- **Protected branch**: `fable-final-game-prep-from-prototype` @ `e8a8994` — untouched
- **Session constraints**: main Fable agent only; Playwright + PixelLab disabled;
  no push/merge/PR/rebase/reset/branch-switch.

## Current status

- **Last commit**: `871105c` — Station beat 2: Engineer Hub
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
  6. `cb9eabf` — **U3**: RoomScene prompts generalized — N options (1..9,
     declared order, never randomised), `PromptStage` + `PromptOption.nextStage`
     chained follow-up stages; ≤3-option prompts byte-identical to V1 slice
     (panel 560×230, "Press 1, 2, or 3 to choose."). Files:
     `src/world/RoomScene.ts`, `src/world/index.ts`. Build + tsc PASS.
  7. `a57bab4` — **U4**: ~40 canonical registrations added to
     `CanonicalEventContext.ts` per the population rule. construct_id unset
     (documented) for: `inventory_verification_skipped` (Q02+Q30),
     `side_repair_accepted` (Q07+Q16+Q20), `side_repair_step_completed`
     (Q07+Q16), `interruption_received` (Q15+Q17), `final_core_rushed`
     (Q11+Q33), `final_core_completed` (Q06+Q33), `repair_abandoned` /
     `repair_returned_after_failure` (F1 precedent),
     `issue_resolution_attempted` (valence mismatch vs Q28). Skipped as
     doc-conflict: `task_started`, `objective_completed`. Deferred to room
     beats (live prototype emissions, Phase-0 baseline protection):
     `side_repair_completed`, `final_core_status_reviewed`. Build + tsc
     PASS.
  8. `6afac6b` — **U5 (rescoped)**: registry-driven Hub status board
     (`statusBoardLabel` per open station, collective sealed line;
     byte-identical output today). Original U5 (mission-state vocabulary
     helpers) **deliberately deferred to room beats**: SessionState already
     exposes every V3 §3.1 field + setter, and status vocabularies are
     room-beat decisions per its documented rule — pre-building wrappers
     would invent vocabulary. Build + tsc PASS.
  9. `9bbb5cc` — **U6**: `e2e/helpers.ts` gains `hubToStationDoor` (8
     door-ring routes, wall-clamp choreography; sealed-room routes must be
     tuned in each room's verification pass), exported `waitForRoomEntry`,
     `selectPromptOption`, `findEvent(s)`, `eventContext`. Compile-checked
     only (Playwright disabled this session). tsc + build PASS.

**Shared-architecture phase (U1–U6) complete.**

10. `26379ce` — **Station beat 1: Systems Repair Room.** `RepairScene`
    (`?scene=repair`, Hub door open, registry flip, statusBoardLabel
    'Systems repair'); audit-first port, legacy events verbatim; additive
    canonical events incl. abandon/return via U2 helpers; new
    `repairManualStation` interactable (`repair_manual_opened` +
    `manual_page_reviewed`); `task_started` NOT emitted (doc conflict —
    unresolved issue 8); `objective_completed` connected-world parity via
    `RoomScene.logObjectiveCompletedIfBothDone()` (called from Archive +
    Repair completion; archive-terminal payload context preserved);
    `e2e/repair_room_logging.spec.ts` authored compile-only. Room doc +
    event-schema §4 updated. Build + tsc PASS. **Runtime/browser
    verification owed** (Playwright disabled this session) — room is
    implemented, not yet verified "working".

11. `871105c` — **Station beat 2: Engineer Hub.** `EngineerScene`
    (`?scene=engineer`, Hub door open, statusBoardLabel 'Engineer report').
    Report path audit-first verbatim (incl. one-shot gate text). Duty
    mechanic: chained U3 stage after any report — `engineer_supervision_assigned`
    on offer; accept → `engineer_supervision_accepted` (Q10) +
    `relay_supervision` (constant in `src/data/duties.ts`) into
    accepted_duties + active_objectives; decline →
    `engineer_supervision_declined` + skipped_duties, no penalty framing.
    `engineer_supervision_completed/skipped` + `accepted_duty_unresolved`
    deferred to Final Core beat per contract wording. Additive
    `engineer_hub_entered`. Spec `engineer_hub_logging.spec.ts`
    compile-only. Room doc + event-schema updated. Build + tsc PASS.
    Runtime verification owed (issue 9).

- **Exact next action**: **Station beat 3 — Inventory / Preparation Room**
  (room-builder discipline): reconfirm
  `docs/game/rooms/04-inventory-preparation-room.md`; port the legacy
  3-option combined choice verbatim (labels/feedback/events incl.
  `inventory_prep_opened` gate); add the separable canonical sub-steps the
  contract requires via U3 stages WITHOUT altering legacy option meanings:
  canonical events `inventory_room_entered`, `inventory_checklist_opened`,
  and the per-path additive canonical equivalents from event-schema §4
  (renames emitted additively alongside legacy names, never replacing);
  record `prepared_items`/`workspace_status` in SessionState for the Final
  Core flags (vocabulary defined in this beat, documented in the room doc).
  Keep interface simple (organisation, not dexterity). Registry flip
  (`inventory`), spec compile-only, docs update.

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
8. `task_started` Q-listing conflict: V3 §5 lists it under Q05 **and** Q15;
   `MASTER_33_ALIGNMENT.md` lists it under Q05 only. Event stays unemitted
   and unregistered until resolved (affects Repair, Archive, Interruption).
9. Runtime/browser verification debt: RepairScene (beat 1) and all
   subsequent Wave 1A rooms are implemented + compile-verified only;
   a `playwright-game-verify` pass (incl. prototype-fixture regression and
   route tuning for `hubToStationDoor`) is owed before any "works" claim.

## Commit log (wave)

| SHA       | Unit   | Content                       |
| --------- | ------ | ----------------------------- |
| `dd498f2` | Docs 1 | Remaining-station inventory   |
| `f1db32f` | Docs 2 | Wave 1 plan (ranking + units) |
| `ed2a39b` | Docs 3 | Active expansion state file   |
| `2fbbd57` | U1     | Station registry + routing    |
| `b9b4d49` | Docs   | State checkpoint after U1     |
| `72c6bc9` | U2     | Room task-state factory       |
| `35599ac` | Docs   | State checkpoint after U2     |
| `cb9eabf` | U3     | N-option/multi-stage prompts  |
| `ffc817b` | Docs   | State checkpoint after U3     |
| `a57bab4` | U4     | Canonical event registrations |
| `20d6bff` | Docs   | State checkpoint after U4     |
| `6afac6b` | U5     | Registry-driven status board  |
| `cc8d597` | Docs   | State checkpoint after U5     |
| `9bbb5cc` | U6     | e2e station-driving fixtures  |
| `0a61fe2` | Docs   | State checkpoint after U6     |
| `26379ce` | Room 2 | Systems Repair Room beat      |
| `cf48ff6` | Docs   | State checkpoint after beat 1 |
| `871105c` | Room 3 | Engineer Hub beat             |
