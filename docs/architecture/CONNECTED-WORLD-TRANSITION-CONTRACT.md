# Connected-World Transition Contract

Authoritative description of the connected-world scene graph as implemented at
`201c8fa` (Sprint A, Phase A1 audit). Machine-readable mirror:
`docs/architecture/transition-inventory.json`. Source of truth for door/spawn
coordinates is `src/world/stationRegistry.ts` + each scene's `populateRoom()`;
this document records the audited contract, not a second copy to hand-edit.

Scientific boundary: nothing in this file defines or alters event semantics,
`study_item_ids`, constructs, or scoring. It covers routing, geometry, and
technical transition mechanics only.

## 1. Scene registrations

All scenes are registered once, from `src/index.ts` (`scenes.Boot` first, then
every other export of `src/scenes/index.ts`). Phaser scene keys
(`src/constants/key.ts`):

| Scene class       | Key            | Kind                       |
| ----------------- | -------------- | -------------------------- |
| Boot              | `boot`         | loader/router (auto-start) |
| DockScene         | `dock`         | control room               |
| HubScene          | `hub`          | control room               |
| ArchiveScene      | `archive`      | assessment station         |
| RepairScene       | `repair`       | assessment station         |
| EngineerScene     | `engineer`     | assessment station         |
| InventoryScene    | `inventory`    | assessment station         |
| HazardScene       | `hazard`       | assessment station         |
| SideRepairScene   | `side_repair`  | assessment station         |
| InterruptionScene | `interruption` | assessment station         |
| FinalCoreScene    | `final_core`   | assessment station         |
| Main (prototype)  | `main`         | legacy prototype world     |
| Menu              | `menu`         | pause overlay (launched)   |

Invariants:

- Every key is unique; no scene is registered twice (`Object.values(scenes)`
  de-dupes Boot explicitly).
- `menu` is never a transition target; it is `scene.launch`ed over a paused
  room (ESC) and resumes via `resumeKey` (`Menu.tsx`), defaulting to `main`
  for prototype parity.
- All station rooms + Dock + Hub extend `RoomScene` (`src/world/RoomScene.ts`),
  which owns the shared create/transition lifecycle.

## 2. `?scene=` query routes (SceneRouter)

`resolveStartSceneKey()` (`src/world/SceneRouter.ts`) maps the launch query
param. Static map: `archive`, `dock`, `hub`, `prototype` (→ `main`).
`registerBuiltStationRoutes()` (Boot.create, before resolution) adds one alias
per registry station whose `sceneKey` is defined — with all eight stations
built, the full route table is:

| `?scene=`      | Scene key      |
| -------------- | -------------- |
| `dock`         | `dock`         |
| `hub`          | `hub`          |
| `archive`      | `archive`      |
| `repair`       | `repair`       |
| `engineer`     | `engineer`     |
| `inventory`    | `inventory`    |
| `hazard`       | `hazard`       |
| `side_repair`  | `side_repair`  |
| `interruption` | `interruption` |
| `final_core`   | `final_core`   |
| `prototype`    | `main`         |
| _(absent)_     | `dock`         |
| _(unknown)_    | `dock`         |

Invariants:

- **Invalid-scene behaviour**: any unknown `?scene=` value silently falls back
  to the Dock (connected-world default). No error, no crash, no partial state.
  This is intended (SceneRouter doc comment) — direct links can never strand a
  participant outside the connected world.
- `registerSceneRoute` throws on duplicate registration; the registry guards
  with `isSceneRouteRegistered` first (archive is in both the static map and
  the registry — the static entry wins, the registry skips it).
- `?scene=prototype` is protected and must keep working until every prototype
  station is ported (approved plan §11).
- `boot`, `main` (except via `prototype`), and `menu` are deliberately NOT
  routable.

## 3. World graph (doors and targets)

Every transition goes through `transitionToRoom()` (SceneRouter): fade-out
250 ms (force-restarted so an in-flight entry fade can never soft-lock it),
`sessionState.setCurrentRoom(target.roomId)`, then `scene.start(sceneKey,
{ spawn })`. The `transitioning` flag on `RoomScene` suppresses further
interaction until the new scene's `create()` resets it.

Graph edges (all bidirectional pairs; coordinates in `transition-inventory.json`):

```
Boot ──(auto)──> resolved start scene (default: Dock)

Dock  <──door──> Hub          (Dock top door / Hub bottom door)
Hub   <──door──> Archive          (top ring, door 1)
Hub   <──door──> Systems Repair   (top ring, door 2)
Hub   <──door──> Engineer Hub     (top ring, door 3)
Hub   <──door──> Inventory / Prep (top ring, door 4)
Hub   <──door──> Hazard Control   (left wall, row 6)
Hub   <──door──> Side Repair Bay  (left wall, row 9)
Hub   <──door──> Interruption     (right wall, row 6)
Hub   <──door──> Final Core       (right wall, row 9)

Main (prototype) — standalone; no doors into the connected world.
```

Invariants:

- The Hub is the only multi-door room; every station has exactly one exit
  door, back to the Hub, passing `spawn: '<station room_id>'`.
- Station→Hub spawn = registry `hubSpawn` (80 px inside the door, outside the
  72 px interaction radius, so an immediate SPACE cannot bounce back).
- Hub→station spawn data is always `'station_hub'`; every station currently
  ignores it (single fixed spawn), except Dock which distinguishes
  `station_hub` (top-door return) from fresh arrival (bottom airlock).
- Hub `getSpawn` for unknown/absent spawn data (fresh `?scene=hub` launch, or
  return from Dock whose room_id is not a registry entry) = Dock-airlock
  default `(416, 368)`.
- Door-ring order IS the registry array order — frozen presentation; do not
  reorder.
- Sealed-door branch (`station_hub_sealed_door_attempted` + sealed message) is
  now **unreachable** with all eight stations open. It is kept deliberately:
  the registry contract says a station with `sceneKey: undefined` seals again
  (safety for future rooms), and its event stays documented in
  event-schema.md. Not dead code to remove.

## 4. Spawn / interaction-radius audit

Interaction radius is 72 px (RoomScene `updateProximity`). Audited distances
(spawn → nearest door/station), all ≥ 80 px unless noted:

| Scene entry                                                   | Spawn                 | Nearest interactable      | Distance |
| ------------------------------------------------------------- | --------------------- | ------------------------- | -------- |
| Dock fresh arrival                                            | (384, 352)            | Arrival Terminal (96, 96) | far      |
| Dock ← Hub                                                    | (384, 128)            | Hub door (368, 48)        | ~81.6 px |
| Hub fresh / ← Dock                                            | (416, 368)            | Status board (416, 240)   | 128 px   |
| Hub ← top-ring station                                        | (door.x, 128)         | its door (door.x, 48)     | 80 px    |
| Hub ← side-wall station                                       | (door.x ± 80, door.y) | its door                  | 80 px    |
| Archive/Repair/Engineer/Inventory/Hazard/SideRepair/FinalCore | (320, 272)            | Hub door (320, 368)       | 96 px    |
| Interruption Corridor                                         | (384, 160)            | Hub door (384, 240)       | 80 px    |

All spawns are on walkable tiles inside their room's collision boundary;
`Player` uses `setCollideWorldBounds(true)` and collides with the wall layer,
and `physics.world.setBounds` = room pixel size in every room (RoomScene
`create`), so edge doorway tiles ('-' at map borders in the Hub side walls)
cannot leak the player out of the map.

## 5. Camera and scale

- Game canvas 800×600, `Phaser.Scale.FIT` + `CENTER_BOTH` (`src/index.ts`) —
  identical for every room; per-room scale variation is impossible.
- Every room: `cameras.main.setBounds(0, 0, roomWidth, roomHeight)` then
  `Player` `startFollow(this)` + `setZoom(1)`.
- Rooms smaller than the viewport (Hub 832×512, Dock 768×448, stations
  smaller) clamp the camera at the bounds; letterboxing is engine-standard
  and uniform across participants.
- Entry fade-in 200 ms in `RoomScene.create`; exit fade-out 250 ms in
  `transitionToRoom` (force-restart, see §3).

## 6. Transition-event emission

- `scene_start` — logged by `RoomScene.create` for every room entry (and by
  the prototype scene), every time, with full session context.
- Per-room canonical entry events (`*_entered` etc.) are logged by each
  room's `onRoomEntered()` override — one place per room, so all entry paths
  (door, direct `?scene=` launch) log identically. Hub's
  `station_hub_entered` is deliberately per-entry (navigation data), never
  once-per-session.
- Exit-in-progress events (e.g. `archive_abandoned`) are logged in
  `onRoomExit()`, which fires before the fade so player coordinates are still
  in-room.
- Doors themselves log an event only when configured (`eventType` on
  `RoomDoorConfig`); currently only the (unreachable) sealed-door path does.
  Open-door transitions are represented by the target room's entry events —
  a door-traversal event pair does NOT exist and must not be invented.
- `session_start` is logged exactly once by `researchRuntime.start()` before
  the Phaser game boots; it is transition-independent.

## 7. Session-metadata preservation

- `researchRuntime` (and its `SessionState`, `EventLogger`,
  `DataQualityTracker`, `QualtricsBridge`) is a module-scope singleton —
  scene transitions can never recreate it. `participant_id`,
  `game_session_id`, `condition`, `game_version`, `return_url` are read from
  the launch URL once, in the `SessionState` constructor, and stamped onto
  every event via `buildContextFields` (caller fields are spread first, so
  session context always wins on collision).
- Missing launch params fall back to `participant-<uuid>` /
  `session-<uuid>` / `default` / `VITE_APP_VERSION` — a session is never
  blocked by absent params.
- **Reload semantics**: a page reload constructs a fresh runtime — the event
  log is in-memory and append-only, so events from before the reload are
  gone; with the same query string the identifying metadata is identical,
  without it new fallback ids are generated. There is no persistence layer,
  by design (no storage of participant data client-side beyond the session).
- `runOncePerSession` guards and `createRoomTaskState` stores are
  module-scope: they survive scene transitions, and reset only on reload —
  matching the event log's lifetime exactly.

## 8. Interaction reachability

Audited per room (static geometry vs collision grids; runtime-verified by the
28-test suite at `201c8fa`, plus Wave 1B's SideRepair reachability fix): every
station marker and door in every room is on/adjacent to walkable floor with an
unobstructed approach ≤ 72 px. The one historical reachability defect
(SideRepair row-7 block, Wave 1B) is fixed and regression-covered by
`e2e/side_repair_logging.spec.ts`.

## 9. Prototype development route

`?scene=prototype` boots `Main` (`src/scenes/Main.tsx`): the full legacy
single-map world with its own stations, camera, and logging. It shares the
runtime singleton (same metadata/event pipeline) but has no doors to or from
the connected world. Its behaviour is regression-pinned against
`docs/testing/baseline-e8a8994/` fixtures and must not change until every
station is ported.

## 10. Known non-defect observations (do not "fix" without a ruling)

1. `setCurrentRoom` is called twice per transition (in `transitionToRoom` and
   again in the target's `create`) — redundant but idempotent and safe; the
   second call also covers direct `?scene=` launches, which is why it exists.
2. Sealed-door branch unreachable (§3) — intentional safety net.
3. Unknown `?scene=` silently defaults to Dock (§2) — documented intent; a
   diagnostic event for it does not exist and inventing one is a scientific
   decision (event vocabulary).
4. Hub comment says "26×16" grid; the grid is 26 wide × 16 rows — matches.
5. Idle-help plumbing in Dock is disabled (`null` threshold) — open
   scientific parameter, not dead code.

## 11. Audit result

Zero demonstrated technical defects in the transition graph at `201c8fa`.
All fixes owed: none. Runtime verification of the full graph via real door
traversal (rather than per-room specs) is delivered by Phase A3/A4's
connected-journey suite (`e2e/journeys/`).
