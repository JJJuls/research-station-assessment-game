# Visual system V4 — professional visual validity redesign

Status: governing presentation document for the
`fable-visual-validity-redesign-v1` mission (V4). Presentation, spatial
design and usability only. Nothing here defines or changes an event name,
a payload, a window, a formula, a mapping, a form allocation, a trial
count, a task solution or a disposition rule (mission §6 scientific
freeze). Where a rule below would require any of those, the existing
implementation is preserved and the conflict is recorded in the V4 report.

Supersedes, for the seven pilot zones, the presentation tokens of
`docs/game/VISUAL-SYSTEM.md` (kept as history for the legacy rooms).

## 1. Render and camera architecture

### 1.1 Decision

| Item                 | V3 (before)                                                                    | V4 (after)                                                                                                                                                      |
| -------------------- | ------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Game canvas          | 800×600 (4:3), `Scale.FIT`, `CENTER_BOTH`                                      | **1280×720 (16:9)**, `Scale.FIT`, `CENTER_BOTH` — letterbox/pillarbox bands in the page ground colour                                                           |
| World camera         | zoom 1, follow, bounds = room; rooms 800×608 so the whole room fits one screen | **zoom 2**, follow (lerp 1), bounds = room, `roundPixels` — a **640×360 world-pixel viewport (20×11.25 tiles)**                                                 |
| Tile / art scale     | 32 px logical tile, 1:1                                                        | unchanged art; rendered at integer 2× inside the canvas                                                                                                         |
| Player on screen     | ~48 px figure in 600 px (8 %)                                                  | ~96 canvas px in 720 (13 %) — Pokémon/Coromon proportion (player ≈ 1.5 tiles tall)                                                                              |
| HUD / prompt panel   | world scene objects with `scrollFactor(0)` at 800×600 coordinates              | rendered by a **dedicated HUD camera** (zoom 1.2, centred): the 800×600 design space maps to the central 960×720 of the canvas; positions in code are unchanged |
| Modal overlay scenes | 800×600, 1:1                                                                   | same 800×600 design space, camera zoom 1.2 centred, plus an opaque canvas-wide backdrop under the scene                                                         |
| Texture filtering    | `pixelArt: true` (NEAREST everything, CSS `pixelated`)                         | `antialias: true`; NEAREST set per texture through the TextureManager `ADD` hook (all art, tiles, baked floors); Text stays LINEAR                              |
| Resize               | none                                                                           | FIT letterbox only; no world re-exposure, no zoom change                                                                                                        |

Rationale: with 32 px tiles and a 32×48 px figure, the natural "room larger
than the screen" viewport is ~20×11 tiles. A 640×360 world viewport rendered
at 2× is pixel-exact at 1280×720 and gives the player and interactables a
legible size; a 4:3 canvas would have forced a non-integer 2.4× at the
primary 1280×720 target or a 12.5-tile-wide view. The 800×600 design space
for HUD and overlays is preserved deliberately so that no task panel's
geometry (card sizes, drag distances, pipe-board layout, feed-panel
controls) changes in its own coordinate system — the freeze on motor
precision and information exposure is kept by construction, and the existing
DEV probes keep reporting design-space rectangles.

### 1.2 Both target resolutions

| Browser viewport | Canvas display                    | Scale | World tile on screen | Player height on screen | Objective text (22 px design ×1.2) |
| ---------------- | --------------------------------- | ----- | -------------------- | ----------------------- | ---------------------------------- |
| 1280×720         | 1280×720                          | 1.0   | 64 CSS px            | ≈96 CSS px              | ≈26 CSS px                         |
| 800×600          | 800×450 (+75 px bands top/bottom) | 0.625 | 40 CSS px            | ≈60 CSS px              | ≈16.5 CSS px                       |

Visible world area is identical at both (640×360 world px); only the display
scale differs. A 20-tile-wide view at 800×600 is the parity cost of a 16:9
letterbox; it is documented, not hidden.

### 1.3 Coordinate spaces (for code and tests)

- **World space**: room pixels (32 px grid). Interaction radii (72 px),
  station and door positions, spawn points, physics — unchanged by V4.
- **Design space** (800×600): every `scrollFactor(0)` object in a room
  scene, every modal overlay scene, prompt cards, feed panels, work
  surfaces. Mapped to the canvas by `x' = 160 + 1.2x`, `y' = 1.2y`.
- **Canvas space** (1280×720) and **page space** (browser CSS px): the DEV
  probe `window.__designSpace` publishes `{width, height, offsetX, offsetY,
scale, canvasWidth, canvasHeight}` so e2e pointer helpers convert design
  rectangles to page clicks with one formula. World-space probes that used
  to subtract `camera.worldView` now also multiply by the camera zoom.

### 1.4 What is explicitly not done

- No dynamic zoom, no zoom by room, no automatic whole-room zoom-out, no
  camera shake anywhere on the participant route (`cameras.main.shake` is
  removed from the reachable effects), no camera drift.
- No non-integer scaling of pixel art inside the canvas (the only
  non-integer factor is the browser FIT at non-1280 widths, applied to the
  whole canvas).
- No overlay geometry change: a task panel's design-space layout is
  byte-identical to V3.

## 2. Visual grammar

Palette hierarchy (≈70 / 20 / 10):

| Role (share)                     | Tokens                                                                                                                                                                                                                                    |
| -------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Quiet base (70 %)                | theme floors/walls from `STATION_THEMES` (desaturated slate/gunmetal); exterior snow held to `#c9d9e6` floor with reduced decal density                                                                                                   |
| Structure / zone identity (20 %) | wall faces, trims, floor markings, alcove edges, machinery groups in the theme's `trim` colour                                                                                                                                            |
| Functional accent (10 %)         | **cyan `#5fd3c4`** = the current usable interactable only; **amber `#c9a24a`** = operational warning / incomplete state; **muted red `#b8574f`** = genuine error or hazard only; completed states drop to the base palette with no motion |

Consistency rules (one of each): 32 px tile scale; straight-on top-down
projection with a slight south-facing front face on walls and machines;
one 1 px dark outline family on props; light from the top-left, drop
shadows south-east; one door family (`plv1-arch-door` leaf + cyan threshold
bar for interior doors, airlock iris strip for the two exterior airlocks,
blast door for the Core); one NPC/player scale (96×96 frames, figure
≈32×48); one workstation footprint family (48–64 px wide props on the
grid); one HUD system; one panel system (slate `#101820` panel, 1 px
`#33475a` border); one interaction highlight (cyan pulse on the nearest
eligible target only).

Salience order: 1 player → 2 current objective / speaking NPC → 3 current
usable exit → 4 active workstation → 5 relevant environment → 6 inactive
workstations → 7 decoration. Inactive and completed workstations must never
carry cyan, motion or a label.

## 3. Depth policy

| Layer | Depth value(s)                  | Contents                                                                                                 |
| ----- | ------------------------------- | -------------------------------------------------------------------------------------------------------- |
| 1     | `-1`                            | baked floor + wall RenderTexture                                                                         |
| 2     | `-0.9 … -0.2`                   | floor decals, light pools, footprints, disturbed ground, landing pad, cable runs                         |
| 3     | `-0.19 … -0.01`                 | low props that never occlude a figure (rails, floor markers, crates ≤ 24 px tall)                        |
| 4     | `worldDepth(footY) ∈ [0, 0.99]` | y-sorted actors and obstacles: player, NPCs, tall props (foot line = bottom of the sprite)               |
| 5     | `1 … 3`                         | foreground / overhead elements (door lintels, hanging pipes, catwalk edges) — never over a prompt target |
| 6     | `Depth.AbovePlayer` (10)        | world interaction cues (beacon, marker rings) — HUD-camera prompts supersede world-space prompts         |
| 7     | `Depth.AboveWorld` (20+)        | HUD camera: objective, prompt, feedback, hotbar, panels; modal overlay scenes render above the room      |

Rules: a figure is never drawn under ordinary machinery (tall props use
layer 4 with their foot line; masks are explicit layer-5 objects); visual
footprint and collision footprint correspond (wall cells under every
colliding prop; no free-floor decor larger than a figure that the player
could walk through); doorway openings are ≥ 2 tiles wide (64 px) for the
32 px body; arrival spawns sit ≥ 80 px inside the door and outside its 72 px
radius; no stretched or non-integer-scaled pixel art in the world.

`src/constants/depth.ts` is extended with named constants for layers 2, 3
and 5 in Unit 1; the mixed literal depths in the pilot scenes (`0.4`,
`0.5`, `2`, `3`, `20`) are migrated to the named layers room by room.

## 4. HUD, guidance and text

- World view shows at most: one objective line (top-left), one contextual
  prompt (projected above/below the target in HUD space), one transient
  feedback/dialogue message. Hotbar hidden while empty. Controls legend
  hidden until **H**. **M** map, **I** inventory, **E/SPACE** interact;
  task keys (C/D/F) appear as hints only while relevant.
- Objective text describes the current reachable action and is refreshed
  on scene entry, prompt selection, route change **and overlay RESUME** in
  every room (the Dock included).
- Sizes in the 800×600 design space (×1.2 on the canvas): objective 18 px
  (≈22 canvas), body 15 px (≈18), prompt 14 px (≈17), help lines ≥ 11 px.
  Contrast ≥ 4.5:1 for essential text on the `#101820` panel.
- No permanent floating labels over ordinary props. Area signage is
  replaced by architecture (floor markings, wall bands, machinery groups)
  and by contextual chips shown only for the nearest eligible target.
- No coordinates, event names, window ids, M/Q numbers or developer terms
  in participant mode. The `DEV INSPECTION` banners stay behind their
  explicit `dev_closure=inspect` gate (developer launch only).

## 5. Motion and effects

Removed on the participant route: ambient snowfall (both the tween
snowfall and the `plv1-fx-snowfall` loop), Dock pad beacons, permanent
"Move here" marker pulse after arrival, NPC idle bob, decorative LED
blink, opening-sequence flicker. Retained (state-driven, bounded,
reduced-motion aware): door/airlock frame change on use, scanner pulse on
C, dig dust on D, magnet-rig timing marker, Core column sync (held frame
under reduced motion), mast restoration pulse → static after completion,
zone title card hold/fade, the single guidance pulse on the nearest
eligible target.

## 6. Asset selection (integration only, no generation)

Use, in priority order: (1) runtime-promoted `plv1-*` and `prop-*` art
that sits on the 32 px grid at the straight-on projection (player frames,
NPC stills, action/effect sheets, arch door/vent/grille/pipes, core
column/pillars/console, utility desk/panel/tower, airlock/core/antenna
strips, dock terminal/airlock/crates, hub/archive props); (2) procedural
`proc-*` textures in the same register; (3) the Wang tilesets. Rejected
for V4: snowfall strip (ambient motion), the two duplicate `-work-a` NPC
stills (unloaded), the 52 diagonal player frames (movement stays
4-directional), `style-anchor-v1`, the tuxemon prototype tileset (legacy
only). All `plv1-*` art remains **PROVISIONAL MODEL-SELECTED — NOT
HUMAN-APPROVED** (`docs/game/PIXELLAB-RUNTIME-ASSET-PROVENANCE.md`).
Off-grid crops (66×74, 56×132, 144×56 …) are placed on whole-tile anchors
and never scaled.

## 7. Room blockouts (spatial design targets)

Interactable and door coordinates are the V3 values (`PILOT_DOORS`,
`zoneSites.ts`, the e2e coordinate books); V4 restructures walls, alcoves,
material zones and dressing around them. Grids stay 25×19 unless a room
brief needs more and the extra cells are appended at an edge that moves
no existing coordinate.

| Zone                   | Path & landmark                                                                                                                               | Composition                                                                                                                                                       |
| ---------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Dock                   | arrival airlock (S) → landing pad → terminal (NW) → north airlock; landmark = the landing pad ring with the shuttle bay window                | compact bay: cargo group east, terminal alcove west, wall-window band north, no free floor wider than 6 tiles without a marking or prop group                     |
| Station Concourse      | central N–S spine (Dock ↔ Laboratory) crossed by the E–W axis (Workshop ↔ Deck); landmark = Vale's incident desk island with the status board | four door bays framed by identical arch modules, floor spine marking, desk island centred, the two work surfaces moved into side alcoves so the crossing is clear |
| Records Workshop       | entry (E) → intake → records/press → storage/assembly → handover (return); landmark = the long records wall                                   | five functional areas separated by partial walls and floor bands so the camera reveals them progressively; labels replaced by area dressing                       |
| Diagnostics Laboratory | Kai's desk then bays 1→4 left to right along the south wall; landmark = the signal display wall                                               | four bays with numbered floor plates; only the current bay carries cyan; wall display restrained; Noor's relay in its own alcove                                  |
| Exterior Recovery Yard | airlock apron → coupling (W) → Mast 04 (N) → excavation field (centre) → Metal Recovery compound (E) → uplink posts (NW) → airlock            | static storm aftermath (drifts, debris groups), a cleared service path in packed snow, the rig compound fenced with the rig drawn on layer 4, no snowfall         |
| Utility & Core Deck    | entry (W) → Shift Review → trunk → three feed bays (S) → Core door (N alcove); landmark = the central systems trunk                           | one trunk, three separated bays with their own floor plates, cable routing on layer 2, Core door alcove as the terminal landmark                                  |
| Core Chamber           | one control position facing one Core apparatus                                                                                                | symmetric chamber, column centred, console in front, 2.4 s activation sequence held restrained, neutral completion                                                |

## 8. Verification hooks introduced by V4

- `e2e/v4_visual_capture.spec.ts` — the V3 capture route, parameterised
  by `V4_OUT` and `V4_VIEWPORT`; never writes to a historical directory.
- `e2e/v4_event_projection.spec.ts` + `e2e/v4Projection.ts` — the
  scientific projection (mission §7) written per label and compared
  field-by-field to the baseline.
- `window.__designSpace` — DEV-only design-space → canvas mapping.
