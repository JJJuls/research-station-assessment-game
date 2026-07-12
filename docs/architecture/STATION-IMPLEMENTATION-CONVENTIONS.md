# Station Implementation Conventions

The reusable pattern every existing station follows, plus a deliberate
assessment of what is (and is not) worth centralizing further. Written at
Sprint A A6 so a later model can add or modify a station without reverse-
engineering eight scenes. Companion docs: transition contract (A1),
continuity contract (A2), cross-room integration contract (A5),
`docs/testing/ROOM-ACCEPTANCE-TEMPLATE.md`.

## 1. Adding a station (registration convention)

One station = one entry in `src/world/stationRegistry.ts`, one scene
class, and one route registration. In order:

1. **Registry row** (`STATION_REGISTRY`): `roomId` (canonical, from V3),
   `routeParam` (`?scene=` value), `sceneKey`, `hubDoor` (door-ring coords),
   `hubSpawn` (return spawn), `statusBoardLabel`. The registry is the single
   source of truth — the Hub builds its door ring and status board from it;
   never hand-place a Hub door.
2. **Scene class** extending `RoomScene` (`src/world/RoomScene.ts`), which
   provides: 72 px proximity prompts, numbered options in declared order
   (never randomized), `PromptStage` chaining via `nextStage`,
   `transitionToRoom` (250 ms fade, `setCurrentRoom`, force-restart
   `scene.start` with `{spawn}`), `runOncePerSession`,
   `createRoomTaskState`, `logObjectiveCompletedIfBothDone`.
3. **Route**: `SceneRouter.registerSceneRoute` (throws on duplicates —
   collisions surface at boot, not at click time).
4. **Docs**: room doc under `docs/game/rooms/`; add the room to
   `docs/architecture/transition-inventory.json` (spawns, doors, entry
   event) and a writers→readers row to
   `docs/architecture/CROSS-ROOM-INTEGRATION.md` if it touches mission
   state.
5. **Events**: names come from V3 §4/5 + `docs/research/event-schema.md`
   only. Entry event logs in `create`; one-shots wrap in
   `runOncePerSession`.

## 2. State-lifetime conventions (where does this value live?)

| Lifetime needed                                        | Mechanism                                        | Example                           |
| ------------------------------------------------------ | ------------------------------------------------ | --------------------------------- |
| Whole participant session, read by other rooms         | `SessionState.missionState` field + typed setter | `hazard_status`, `prepared_items` |
| Whole session, this room only (survives exit/re-enter) | `createRoomTaskState` module store               | repair failure counts             |
| Once-per-session guard                                 | `runOncePerSession` flag                         | `side_repair_discovered`          |
| Single visit only (resets on re-entry)                 | scene instance field                             | current prompt stage              |

Rules: mission-state fields are written through dedicated setters (mutual
exclusions enforced there, e.g. duties); the event log is append-only and
is NOT state — never read it to drive mechanics; `getSummary` must stay
pure (no side effects, verified in the A2 spec).

## 3. Central transition configuration — assessment (A6 ruling)

Transition data is already centralized in three coordinated places:
`STATION_REGISTRY` (runtime source of truth), `SceneRouter` route table,
and `transition-inventory.json` (documentation mirror consumed by tests).
Duplication between scene classes is limited to each room's own exit-door
placement and spawn constants — per-room facts, not shared logic. Further
centralization (e.g. a declarative door/exit DSL) would touch all eight
verified scenes for zero behavioral gain and real re-verification cost.
**Verdict: not justified; do not centralize further without a concrete
defect.** The one accepted duplication: room dimensions appear in both
scene code and the inventory JSON — when changing a room's size, update
both (checklist item in the room template).

## 4. Fragile points (know before touching)

1. **Session context spread order**: `buildContextFields` spreads session
   context LAST so participant metadata always wins. Reordering silently
   corrupts every event's metadata.
2. **Module-scope session stores** (`createRoomTaskState`,
   `runOncePerSession` flags) persist across scene restarts within one page
   load — tests must use a fresh page (unique session) per test.
3. **Force-restart transitions**: `transitionToRoom` uses `scene.start`
   (destroy + recreate). Anything meant to survive must live in a session
   store, not on the scene.
4. **Double `setCurrentRoom`** per transition (router + scene create) is
   deliberate idempotence covering direct launches — do not "fix".
5. **Unknown `?scene=` falls back to dock silently** — documented intent
   (A1 §10); runtime-covered by the A2 spec.
6. **Hub geometry**: central console block (row 8, x 320-448) and doorway
   pockets trap naive navigation; all test routes must normalize via the
   NW anchor (`hubToNorthWestAnchor`).
7. **ScoringManager formulas are frozen** — they count specific (partly
   legacy) event names. Adding/renaming events near Inventory/Hazard/
   Archive/Repair can silently change scoring inputs; check
   `docs/research/scoring-plan.md` first, and treat any formula edit as
   Beat-13 (user-gated).
8. **Prompts are suppressed during intro typewriter** — interaction tests
   must wait for settle (bootJourney does).
