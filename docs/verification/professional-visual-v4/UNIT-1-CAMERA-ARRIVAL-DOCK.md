# V4 Unit 1 — camera, depth, arrival and Dock

Contract row: `UNIT-0-BASELINE-AUDIT.md` §5, Unit 1. Commit subject:
`feat(game): establish professional camera and arrival`.

## What changed (observable)

- **Fixed logical viewport.** The game canvas is 1280×720 (16:9),
  FIT-letterboxed in the page ground colour; at 800×600 the display is
  800×450 with 75 px bands. `participant_viewport_display.spec.ts` now
  locks 16:9 at six desktop viewports.
- **Bounded following camera.** Every room scene renders the world at
  zoom 2 (640×360 world px visible, 20 × 11.25 tiles) with whole-pixel
  scroll, following the avatar inside the room bounds. Rooms extend beyond
  the viewport by construction (25×19-tile grids).
- **HUD camera and design space.** `src/world/viewport.ts` adds a second
  camera per room scene that renders the 800×600 design space at 1.2×,
  centred. Objects authored with `scrollFactor(0)` are tracked as HUD
  objects and drawn only by that camera; world objects only by the world
  camera. Modal overlay scenes (inventory, work surface, feed panel,
  station map, the three signal terminals, the ESC menu, the opening) fit
  the same design camera over an opaque page-ground backdrop. **No panel
  geometry changed in its own coordinate system.**
- **Contextual prompt in HUD space.** `SPACE / E — interact` is projected
  from the target's world position into the design space each frame (one
  size everywhere); world-space chips and signage rasterise at 2× so they
  stay sharp under the world zoom.
- **Filtering.** Linear sampling for text, nearest-neighbour for every
  loaded/generated art texture (TextureManager `ADD` hook; UUID-keyed text
  canvases excluded) and for the baked floor; MSAA off.
- **Depth constants.** `DepthLayer` (floor, decal, marking, low prop,
  foreground, world readout) added beside the existing `Depth` enum and
  `worldDepth()`; the Dock uses them. Room-by-room migration continues in
  Units 2–5.
- **Fades.** Room entry/exit fades run on both cameras.
- **Camera shake retired.** `cameraKick` is a no-op (mission §9).
- **Objective refresh on RESUME** in every room (C7).
- **Arrival.** `PilotOpeningScene` is an in-engine establishing shot built
  from the route's own textures at the integer scale with a slow,
  deterministic push-in of the picture (static under reduced motion),
  three captions (≈8.2 s), a visible skip line, and a 300 ms interact
  guard on hand-over so the skip press never becomes the first
  interaction.
- **Dock.** Redesigned bay (see `docs/game/rooms/00-dock-arrival.md` V4
  section): terminal kiosk, painted circulation spine, cargo group,
  service rail, one interior door family, static pad lights, a floor-ring
  movement marker removed once reached, no "Move here" label. All V3
  coordinates preserved.
- **Pointer path.** The physical-manipulation layer resolves the pointer
  through the world camera and reports design-space rectangles; the e2e
  helpers convert design points to page clicks through one function
  (`designToPage`, reading `window.__designSpace`).

## Verification-environment finding (frame rate)

Under Playwright's SwiftShader renderer the frame rate is fill-bound. A
1280×720 canvas costs ≈1.9× the 800×600 fill:

| Configuration                                                         | rAF fps (dock) | 900 ms ArrowRight hold |
| --------------------------------------------------------------------- | -------------- | ---------------------- |
| V3 config (800×600, pixelArt)                                         | 19.5–20        | 160–172 px             |
| V4 first cut (1280×720, antialias + antialiasGL, themed camera clear) | 6.5–7.5        | 20–150 px (erratic)    |
| V4 without MSAA                                                       | 12             | 55–85 px               |
| V4 without MSAA and without the invisible camera clear quad           | 13–15          | 128–172 px             |

The shipped configuration is the last row. Fixed-duration key holds remain
sensitive to load (already the V2/V3 finding); the position-synced
`driveAxisTo` legs are unaffected. Real GPUs are not fill-bound at this
size.

## Review round (visual-reviewer brief, Opus, read-only) and disposition

One bounded correction round was applied after the review. Findings cite
`docs/verification/professional-visual-v4/unit1/*.png` (pre-correction
frames were replaced in place by the post-correction capture).

| #   | Finding                                                                                 | Sev     | Disposition                                                                                                                                                                                                              |
| --- | --------------------------------------------------------------------------------------- | ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| B1  | avatar drawn behind the Arrival Terminal kiosk                                          | BLOCKER | **fixed** — station and door markers were children of the depth-20 label container (a V3 defect exposed by the zoom); they now sort at their foot line (`RoomScene.sortAtFootLine`), chips stay in the container         |
| B2  | movement marker outside the arrival view once the "Move here" label was gone            | BLOCKER | **fixed** — ring moved from (544,160) to (544,224), inside the 640×360 view from the spawn; tutorial mechanic (distance < 40) unchanged; control-room geometry only, no measured construct; movement spec target updated |
| M1  | contextual prompt detached from its target                                              | MAJOR   | **fixed** — `worldToDesign` used `camera.scrollX/Y`, which Phaser keeps relative to the unzoomed viewport; it now projects from `camera.worldView`                                                                       |
| M2  | objective line smallest text on screen (13 px design)                                   | MAJOR   | **fixed** — objective 17 px, quest line 14, prompt 15, feedback 16 (design px); the full §4 ladder and contrast pass remain Unit 6 work                                                                                  |
| M3  | opening art at 2.4× (2× under the 1.2× design camera)                                   | MAJOR   | **fixed** — art scale = WORLD_ZOOM / DESIGN_SCALE so the canvas scale is an integer 2×                                                                                                                                   |
| M4  | mixed registers; bright tower clipped at the edge; doubled amber windows                | MAJOR   | **fixed in part** — tower moved into frame and held to the night register (tint), doubled window marks removed; the three source textures keep their own projections (asset limitation, recorded)                        |
| M5  | empty framed rectangle read as a UI frame (landing pad)                                 | MAJOR   | **fixed** — pad drawn from the dock pad tileset's full-pad tile at the world scale                                                                                                                                       |
| M6  | window units the brightest elements of the Dock                                         | MAJOR   | **fixed** — windows tinted to the wall register (`0x7f93a8`), low-prop depth                                                                                                                                             |
| M7  | station-map legend struck through by the log panel; log panel overhangs the outer panel | MAJOR   | **fixed** — log panel narrowed and shortened, legend moved below it                                                                                                                                                      |
| M8  | overlapping HUD strings in the Concourse                                                | MAJOR   | **deferred to Unit 2** (Concourse redesign) — recorded                                                                                                                                                                   |
| N1  | seven rows of dead wall under the Dock bay                                              | MINOR   | **fixed** — grid trimmed to 14 rows (one wall row under the arrival airlock)                                                                                                                                             |
| N2  | overlay side bands one tone lighter than the overlay interior                           | MINOR   | recorded (Unit 6 panel pass)                                                                                                                                                                                             |
| N3  | amber corner-L floor decals read as litter                                              | MINOR   | recorded (theme decal strip; Unit 6 palette pass)                                                                                                                                                                        |
| N4  | door leaf is sea-green (provisional art tint)                                           | MINOR   | recorded (asset register; Unit 6)                                                                                                                                                                                        |
| N5  | wind streaks read like snowfall                                                         | MINOR   | **fixed** — replaced by four long horizontal drift ridges                                                                                                                                                                |
| N6  | bottom-heavy composition; no shuttle                                                    | MINOR   | recorded — the approach is narrated, not depicted (no shuttle asset in register; drawing one from primitives was the V3 look being replaced)                                                                             |
| N7  | GitHub-corner embed in the captures                                                     | MINOR   | dev-only (`BUNDLE !== 'true'`), not in the participant bundle — recorded                                                                                                                                                 |

## Harness corrections found by the redesign (test-only, no assertion weakened)

- `driveAxisTo` stall budget is now held-key TIME (400 ms after motion has
  been observed, 1600 ms before), not a burst count: at ~13 fps one 100 ms
  burst can land between frames and the old two-stall rule aborted legs at
  the spawn (the V3 physical-mechanics report already called the rule
  insufficient).
- Every pointer helper converts DESIGN points to page clicks through one
  function (`designToPage` → `window.__designSpace`); the six former local
  `/ 800, / 600` conversions (`helpers`, `ipHelpers`, `returnHelpers`,
  `closureHelpers`, `pilot_closure.spec`) route through it.
- Overlay scenes hit-test the pointer in their own camera space
  (`pointer.worldX/Y`), which is what `pointer.x/y` happened to equal
  before V4. The `inRect` plain-point helper in the feed panel is unchanged
  in semantics.
- `movement_and_first_interaction` drives the same real input on the
  observed position instead of four fixed-duration holds; the asserted
  events are unchanged.
- `participant_viewport_display` locks 16:9 at six desktop viewports.
- `v4_projection_compare.spec.ts` (pure) re-checks two recorded projections
  offline with the route spec's comparator; time-like keys are stripped
  recursively on both sides.

## Tests and evidence (`--retries=0 --workers=1`, `PW_DEV_PORT=5362`)

| Command / spec                                             | Result                                                                                                                                                         |
| ---------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `npm.cmd run lint:tsc`, `npm.cmd run build`, scoped ESLint | pass                                                                                                                                                           |
| `v4_camera` (3)                                            | 3/3 — zoom 2, follow, bounds, 640×360 at both viewports, design-space probe, prompt range + pointer card                                                       |
| `participant_viewport_display` (7)                         | 7/7                                                                                                                                                            |
| `spawn_clearance` (3, pure)                                | 3/3                                                                                                                                                            |
| `dock_tutorial_paths` (2)                                  | 2/2                                                                                                                                                            |
| `movement_and_first_interaction`                           | 1/1 (position-synced)                                                                                                                                          |
| `m02_overlay_proof` (2)                                    | 2/2                                                                                                                                                            |
| `presentation_integration` (11)                            | 11/11                                                                                                                                                          |
| `pilot_route` (4)                                          | 4/4 (incl. the legacy Dock → Hub ring)                                                                                                                         |
| `v4_event_projection` (full route, Dock → stable Core)     | route completed, `unit1.json` written; `v4_projection_compare` vs `baseline-v3.json`: **0 differences** (154 events, 28 opportunities, final stage `complete`) |
| `pilot_closure` test 2 (pointer feeds, parity, recreation) | 1/1 (3.7 min) after the overlay pointer-space and click-point corrections                                                                                      |
| `v4_visual_capture` leg 1 at 1280×720 → `unit1/01…11`      | pass; frames inspected                                                                                                                                         |
| Dock frames at 800×600 and 1280×720 (`v4_camera`)          | `unit1/dock-arrival-*.png`                                                                                                                                     |

Deviations from the Unit 0 allowlist (recorded): `src/world/index.ts` was
NOT needed; `src/world/SceneRouter.ts` (both-camera fade),
`src/gameplay/effects.ts` (shake no-op), `src/inventory/ui/InventoryOverlayScene.ts`,
the three `informationProcessing/ui/*Scene.ts`, `src/pilot/ui/*.ts` and
`src/scenes/Menu.tsx` were touched exactly as the allowlist foresaw;
`e2e/pilot_closure.spec.ts` and `e2e/movement_and_first_interaction.spec.ts`
were added to the allowlist for the harness corrections above.
