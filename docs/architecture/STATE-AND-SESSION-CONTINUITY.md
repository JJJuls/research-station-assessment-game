# State and Session Continuity Contract

Sprint A Phase A2 audit at `2c455c7` (base `201c8fa`). Companion to
`CONNECTED-WORLD-TRANSITION-CONTRACT.md`. Documents every state store, its
lifetime, and its continuity semantics. Scientific boundary: records what IS;
invents no semantics, thresholds, or vocabularies.

## 1. State stores and lifetimes

| Store                                                                                              | Location                                           | Lifetime                                                       | Reset by                                                 |
| -------------------------------------------------------------------------------------------------- | -------------------------------------------------- | -------------------------------------------------------------- | -------------------------------------------------------- |
| `SessionState.metadata`                                                                            | singleton field                                    | page session                                                   | reload only                                              |
| `SessionState.missionState`                                                                        | singleton field                                    | page session                                                   | reload only                                              |
| `EventLogger.events`                                                                               | singleton field, append-only                       | page session                                                   | reload (or explicit `clear()`, never called in gameplay) |
| `DataQualityTracker.metrics`                                                                       | singleton field                                    | page session                                                   | reload only                                              |
| `QualtricsBridge.launchParams`                                                                     | singleton field, read-only after construction      | page session                                                   | reload only                                              |
| `sessionOnceFlags` (`runOncePerSession`)                                                           | module scope, `RoomScene.ts`                       | page session                                                   | reload (tests: `resetSessionOnceFlags`)                  |
| Room task states (`createRoomTaskState`)                                                           | module scope, `roomTaskState.ts`                   | page session                                                   | reload (tests: `resetAllRoomTaskStates`)                 |
| `archiveSessionState`                                                                              | module scope, `ArchiveScene.ts` (pre-U2 precedent) | page session                                                   | reload only                                              |
| Scene instance fields (e.g. Dock `controlErrorCount`, `markerReached`; every `RoomScene` UI field) | scene instance                                     | **single room visit** — `scene.start()` recreates the instance | every entry                                              |

**Rule**: anything that must survive leave-and-return lives at module scope or
in SessionState; anything per-visit lives on the scene instance. The audit
verified every measured-behaviour state is at session scope:

- Archive: `archiveSessionState` (lastWrongCode/hadFailure/leftAfterFailure).
- Repair: `repairTaskState` (FailedTaskState via U2 factory).
- Hazard: `hazardTaskState.infoChecked` (informed/reckless classification
  survives leave-and-return — verified live in the Hazard gate).
- Engineer/Inventory/SideRepair/Interruption/FinalCore: all persistent facts
  go through SessionState (duties, objectives, prepared items, statuses,
  completed_rooms).

## 2. Re-entry semantics (audited per room)

- **Partial interaction → exit → re-entry**: per-visit UI resets; measured
  task state persists. Archive/Repair emit `*_abandoned` on exit-after-failure
  (via `onRoomExit`) and `*_returned_after_failure` on re-entry
  (one-shot per departure: flag clears on detection). Verified in
  `repair_room_logging.spec.ts` and the Archive V1 regression.
- **Completion → exit → re-entry**: `completed_rooms` gates redo. Archive/
  Repair/Dock suppress their task prompt ("already logged" feedback);
  Engineer's report one-shot gate text; Inventory/Interruption/FinalCore
  mark completed and gate re-runs; SideRepair completed path gates the offer.
  Room-entry events still fire on re-entry (navigation data), assessment
  events do not re-fire.
- **Defer → exit → re-entry**: SideRepair `side_repair_deferred` does NOT
  complete the room; the offer reopens on return (defer ≠ abandon, verified
  in `side_repair_logging.spec.ts`).
- **Interrupt/avoid → exit → re-entry**: Hazard has no completion gate (D1:
  no invented gate); the warning prompt reopens on every visit;
  `infoChecked` persists, so a later continue is still classified informed.
- **Repeated prompts**: prompt open events that are assessment-relevant are
  either once-per-session (`runOncePerSession`) or documented per-open
  (Hazard warning, Hub status board, `station_hub_entered`).

## 3. One-shot / duplicate-event protection

`runOncePerSession` flags in use: `dock_started`,
`dock_movement_instruction_shown`, `dock_first_movement`,
`dock_first_interaction`, `dock_tutorial_help_shown` (disabled mechanism),
`side_repair_discovered`, `interruption_objective_active`,
`final_core_entry_flags`, `objective_completed`. All module-scope — survive
transitions, cannot double-fire across visits. `objective_completed`
(Archive+Repair parity) is additionally state-gated on both completions and
covered by a dedicated spec test.

Duplicate-state protection in SessionState: `addUnique` on all list fields;
duty accept/skip mutually exclusive (each removes from the other list);
`markRoomCompleted` idempotent.

## 4. Reload and direct-launch semantics

- **Reload**: constructs a fresh runtime. Same query string ⇒ identical
  `participant_id`/`game_session_id`/`condition`/`game_version`/`return_url`;
  event history, mission state, once-flags, task states, data-quality
  metrics, and `started_at_ms` (⇒ `elapsed_seconds`) all reset. No
  client-side persistence exists, by design. A reloaded session therefore
  re-logs `session_start` — analytically distinguishable by timestamps, and
  by duplicate one-shot events if exports are concatenated per
  `game_session_id` (documented analysis caveat, not a game defect).
- **Direct room launch** (`?scene=<station>`): boots straight into the room.
  `SessionState.current_room_id` defaults to `dock_arrival` until the room's
  `create()` calls `setCurrentRoom` — during Boot's preload the default is
  technically stale (window < 1 frame of gameplay; no event can be logged
  from a room before its `create`). Baseline Dock events are simply absent
  in such sessions; nothing breaks (verified pattern: all Wave 1A/1B specs
  boot with `?scene=hub`).
- **Invalid `?scene=`**: falls back to Dock (transition contract §2).

## 5. Metadata and return-flow continuity

- Every event gets `participant_id`, `game_session_id`, `condition`,
  `game_version`, `elapsed_seconds` stamped by `buildContextFields` — caller
  fields can never override them (spread order, ResearchRuntime.logInteraction).
- `return_url` is held only by QualtricsBridge; `buildReturnUrl` preserves
  the original URL + query and appends every summary variable. Empty/blank/
  malformed URLs ⇒ `null` (no crash). Covered by
  `launch_with_research_params.spec.ts`.
- `SessionState` and `QualtricsBridge` parse `window.location.search`
  independently at construction — both singletons, same instant, no drift.

## 6. Debug API and scoring-summary consistency

- `window.researchRuntime` (dev-only): 7 methods, all read-only over live
  state except `completeDebugSession` (appends `objective_completed` +
  prints; prototype-parity debug affordance — NOT wired to any gameplay
  path). `getEvents`/`getMissionState` return defensive copies; mutation
  through the debug surface is impossible.
- `getSummary()` is a pure recomputation over (metadata, elapsed, events,
  data-quality) — calling it never mutates state; repeated calls differ only
  in `elapsed_seconds`. Summary derivations are frozen scientific formulas
  (ScoringManager) — out of audit scope beyond confirming purity.

## 7. Hazard state across transitions

- `hazardTaskState.infoChecked` (session scope): set by the info-check
  option; read by continue for informed/reckless branch + live
  `info_checked_before_continuing` metadata. Survives leave-and-return
  (verified live, Hazard gate H-series).
- `mission.hazard_status` ∈ {informed_continue, reckless_continue,
  route_avoided} (+ initial `not_started`): set on each branch selection;
  last selection wins (repeatable prompt, no gate — D1). Propagates via
  SessionState to any reader.

## 8. Final Core access and state consumption

Consumed at entry (once per session, `final_core_entry_flags`):
`prepared_items` (missing field kit ⇒ `final_core_missing_item_flagged`),
`workspace_status` (`disordered` ⇒ `final_core_workspace_issue_flagged`),
`active_objectives`+`interruption_status` (non-return ⇒
`final_unresolved_due_to_nonreturn`), side-repair completion ⇒
`final_core_stability_bonus`. Consumed at completion: duty follow-through
(`engineer_supervision_completed` / `accepted_duty_unresolved`), Q28 blocker
option list. Writes back: `markRoomCompleted('final_core_room')` +
`setFinalCoreStatus`.

**Technically available but unconsumed**: `hazard_status` (see A5 for the
available/consumed/unspecified split — the scientific consequence in Final
Core is user-owned and NOT implemented). `unresolved_objectives` list has no
writer anywhere (add/remove exist, unused) — reserved vocabulary, not a
defect.

## 9. Stale-state audit result

No stale-state defect found: every per-visit field is reinitialised in
`create()` (RoomScene resets `activePrompt`/`activeTarget`/`doors`/
`stations`/`transitioning`/`feedbackMessage` explicitly before repopulating);
every cross-visit fact lives in a session-scope store; status boards read
live SessionState at open time.

## 10. Observations (documented, not fixed — semantics not authoritative)

1. **Dock `controlErrorCount` is per-visit** (instance field): out-of-range
   SPACE presses before an exit are not counted into the single
   `control_error_count` event if the tutorial is completed on a later
   visit. Prototype had no transitions, so instance==session there; which
   lifetime is intended for the connected world is a scientific decision
   (baseline covariate definition). Left as-is; flagged for the user.
2. **`completeDebugSession` appends `objective_completed` unguarded** — it is
   a dev/debug affordance with prototype parity; a second call double-logs.
   Not reachable by participants; left as-is.
3. **Reload double-`session_start`** per `game_session_id` if the same launch
   URL is reloaded — inherent to no-client-persistence design; analysis-side
   caveat documented in §4.

## 11. Runtime coverage added in A2

`e2e/state_session_continuity.spec.ts`: reload metadata/reset semantics,
direct-room launch, invalid-scene fallback, `current_room_id` transition
tracking, `getSummary` purity/read-only debug surface. (Re-entry, one-shot,
Hazard, and Final Core continuity were already runtime-verified by the
existing 28-test suite; not duplicated.)
