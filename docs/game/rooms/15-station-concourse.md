# Station Concourse — pilot zone 2 (World V1, U1)

Scene: `src/scenes/StationConcourseScene.ts`. Layout: `src/world/layouts/concourse.ts`
(40×26, theme `hub`). Sites: `CONCOURSE_STATIONS` / `CONCOURSE_SPAWNS` in
`src/pilot/zoneSites.ts`; doors: `PILOT_DOORS.station_concourse` in
`src/pilot/pilotRoute.ts`; registry: `CONCOURSE_REGISTRY` in
`src/world/interactionRegistry.ts`. Design: `docs/game/world-v1/ROOM-BLOCKOUTS.md` §2.

## Purpose (unchanged)

Episode 1 (Storm Arrival & Incident Handover) and the return check-in of
episode 5. Windows hosted (ledger): M01 plan board, M05 initiation occasion
1 (the flickering reading-desk lamp — never mentioned), M09 monitor watch
(offered by Vale; two gauge checks), M10 component promise (offered by
Vale; standardised interruption), M12 quality packet 1, M14 incident desk.
No window, event, form, option, offer text or gauge reading changed in U1.

## Composition (World V1)

The circulation hub: a painted north–south spine (cols 17–22) crossing a
painted east–west axis (rows 11–14). Every door has a frame, a lintel lamp
and a wall sign beside it. Vale stands in front of the operations counter
under the station-status wall (the landmark; six sector lamps, dark until
the story-state spine lights them in U2 — U1 lights EXT on the return, the
two states the V4 strip carried). The work surfaces are architecture, not a
grid of stations: the incident plan board is a wall board west of the
north door; the incident desk is a console on the east service counter;
the quality packet lies on the south-west side counter; the monitor gauge
hangs on the east wall south of the Deck door; the faulty lamp stands on a
reading desk in the north-west nook. Seating, lockers, a notice board and
a crate group are quiet structure; cable trays and light fixtures run along
the north wall.

| Object (registry id)       | Class      | Tile (px)                  | Approach (px) | Window              |
| -------------------------- | ---------- | -------------------------- | ------------- | ------------------- |
| north door → Laboratory    | 1/2        | (20, 1.5) → (640, 48)      | (640, 112)    | —                   |
| south door → Dock          | 2          | (20, 23.5) → (640, 752)    | (640, 696)    | —                   |
| west door → Records        | 1/2        | (1.5, 13) → (48, 416)      | (104, 416)    | —                   |
| east door → Utility Deck   | 1/2        | (38.5, 13) → (1232, 416)   | (1176, 416)   | —                   |
| Vale (`concourse.vale`)    | 1 (anchor) | (28.5, 11.5) → (912, 368)  | (912, 412)    | M09/M10 offers      |
| Kai on the return          | 2          | (31.5, 11.5) → (1008, 368) | (1008, 412)   | M10 handover        |
| incident plan board        | 1          | (13, 1.5) → (416, 48)      | (416, 104)    | `m01_plan_board_w1` |
| incident desk              | 1          | (38, 7) → (1216, 224)      | (1168, 224)   | `m14_desk_w1`       |
| quality packet             | 1          | (8.5, 18) → (272, 576)     | (272, 528)    | `m12_qc_o1`         |
| monitor gauge              | 2          | (39, 18) → (1248, 576)     | (1200, 576)   | `m09_check_1/2`     |
| reading-desk lamp (M05 o1) | fault      | (7, 4.5) → (224, 144)      | (224, 196)    | `m05_initiation_o1` |

Spawns: from the Dock (640, 640); from the Laboratory (640, 160); from
Records (160, 416); from the Deck (1120, 416) — each ≥ 112 px inside its
door.

Presentation decisions recorded: the gauge reading is shown on the read
(E) and no longer as a permanent ribbon (the read is the M09 act; the
values are unchanged); the status strip text became the status-wall lamps.

## Verification (U1)

`e2e/world_v1_registry.spec.ts` (pure reachability, door clearance,
walking budget), `e2e/world_v1_interactions.spec.ts` (prompts, surface
pause/release, decor never prompts), `e2e/pilot_route.spec.ts`,
`e2e/pilot_episodes_1_2.spec.ts` (episode 1), `e2e/concourse_interaction_lifecycle.spec.ts`,
projection `world-v1-u1`. Frames: `docs/verification/professional-world-v1/unit1/`.

## World V1 (U2, 2026-09-06) — restoration states and the story card

Presentation only (`STORY-STATE-SPEC.md` §4); no window, event, form, offer
text or gauge reading changed.

- **Status wall.** The six sector lamps (REC · SIG · EXT · LOG · FEED · CORE)
  follow `restorationState()`: dark = damaged, amber = under recovery,
  green + a tick bar = restored (never colour alone). Records lights when
  the workshop is signed off, Signal at the exterior briefing, Exterior at
  the return, Record when the station record is closed, Feeds when the
  three feeds are up, Core when the Core is stable — stage or terminal
  disposition only, never a task value.
- **Lighting.** Five work-area pools (ops desk, plan board, side counter,
  reading nook, crossing) are cold emergency light in act 2 and warm from
  act 3 (`lightPoolTexture()`).
- **Storm evidence.** A scorched junction and a fallen fragment under the
  north-wall cable run; repaired (patch plate) once the feeds are restored.
- **Mission card.** Act title + one action from `missionCardAction()`
  ("Report to Vale at the operations desk." → "Work the storm packet, then
  see Vale." → "Records Workshop — west door." …); refreshed on every stage
  change, zone entry and overlay resume.
- DEV probe `__restorationProbe` (lighting + sectors) for the specs.

Tests: `world_v1_story.spec.ts` (restoration persists across a zone exit
and re-entry), `world_v1_interactions.spec.ts`, `pilot_route.spec.ts`.
