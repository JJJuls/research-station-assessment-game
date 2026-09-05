# Camera and spatial-scale specification (World V1)

Supersedes `docs/game/VISUAL-SYSTEM-V4.md` §1 for the seven pilot zones.
Presentation only: interaction radii (72 world px), body size (32×42),
movement speed (175 px/s) and every task surface's 800×600 design-space
geometry are unchanged.

## 1. Acceptance targets (mission §8) at 1280×720

| Target                                | Required | This design                                  |
| ------------------------------------- | -------- | -------------------------------------------- |
| tiles visible horizontally            | ≈ 28–34  | **32**                                       |
| tiles visible vertically              | ≈ 16–20  | **18**                                       |
| participant sprite / viewport height  | ≈ 6–8 %  | **8.3 %** (48 world px → 60 canvas px)       |
| architecture visible to identify room | yes      | ≥ 1.5 rooms-worth of context in any position |
| cropped door/station at interaction   | none     | bounded follow + spawn rules                 |

## 2. Render architecture

```
world scene objects ──(world camera, zoom 1, integer scroll)──▶ WORLD PLATE 1024×576 (RenderTexture)
                                                                   │  sharp-bilinear sampler ×1.25
HUD objects (scrollFactor 0, 800×600 design space) ──(HUD camera, zoom 1.2)──▶ CANVAS 1280×720 ──FIT──▶ browser
overlay scenes (800×600 design space) ──(overlay camera, zoom 1.2)────────────▶
```

- **World plate**: every world object (everything not `scrollFactor(0)`) is
  drawn once per frame into a 1024×576 RenderTexture by a plate camera at
  zoom 1 with whole-pixel scroll. Pixel art is therefore rendered 1:1 —
  exact texels, no sub-pixel placement.
- **Composite**: the plate is drawn to the canvas as one image at scale
  1.25 (1024×576 → 1280×720) through a **texel-snapped bilinear** fragment
  shader (the standard "pixel-art anti-aliasing" sampler: UV snapped to the
  texel centre, with a one-screen-pixel linear ramp at texel boundaries
  derived from `fwidth`). Interiors of texels are exact; boundaries resolve
  to one screen pixel with no thickness alternation; motion is smooth. This
  is the pixel-stable implementation for a non-integer ratio; a plain
  NEAREST composite would produce 4→5 pixel crawl and a plain LINEAR
  composite would soften every texel.
- **HUD and overlays**: unchanged design-space cameras at 1.2× — text stays
  LINEAR and crisp at canvas resolution; every task surface's geometry is
  byte-identical to V4.
- **Depth**: the plate preserves the scene's depth order (objects sorted by
  depth, then display-list order) — the y-sort model of §10 of the design
  authority applies inside the plate.
- **Pointer**: world objects take no pointer input on the pilot route
  (pointer belongs to panels); nothing changes. DEV probes convert world →
  design → canvas through the plate transform (`worldToDesign`,
  `worldToCanvas`, `__cameraProbe`, `__designSpace`).

## 3. Follow rules

| Parameter   | Value                                                                                            |
| ----------- | ------------------------------------------------------------------------------------------------ |
| dead zone   | 96×64 world px (3×2 tiles), centred                                                              |
| smoothing   | bounded lerp 0.12 per frame toward the dead-zone-corrected target; snap when the residual < 1 px |
| bounds      | room rectangle; the view never shows beyond the room                                             |
| snapping    | scroll rounded to whole world px before the plate render                                         |
| idle        | no motion while the avatar stays inside the dead zone (idle animation never moves the camera)    |
| transitions | fade in/out 200 ms on both cameras (existing)                                                    |
| effects     | none: no shake, no zoom, no pan, no drift                                                        |

## 4. Room-size and spacing rules

| Rule                                      | Value                                                                                                                                          |
| ----------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| ordinary interior                         | 1.5–2.5 views (864–1440 tiles)                                                                                                                 |
| large yard                                | 2–3 views (1152–1728 tiles)                                                                                                                    |
| Core                                      | compact (≈ 1.2 views), architecturally distinct                                                                                                |
| main corridor width                       | ≥ 4 tiles                                                                                                                                      |
| secondary lane width                      | ≥ 3 tiles                                                                                                                                      |
| related primary stations                  | 12–20 tiles apart along the aisle                                                                                                              |
| door trigger clearance                    | no station, NPC, board or decoration within 3 tiles of a door trigger or inside a required corridor                                            |
| arrival spawn                             | ≥ 96 px inside the door, outside its 72 px radius                                                                                              |
| total non-task walking (purposeful route) | ≤ 3.5 min at 175 px/s, computed by a pure test from the blockouts (BFS over the collision grids between consecutive guided stations and doors) |

## 5. Both target resolutions

| Browser  | Canvas display                      | World tile on screen | Figure on screen |
| -------- | ----------------------------------- | -------------------- | ---------------- |
| 1280×720 | 1280×720 (scale 1.0)                | 40 CSS px            | ≈ 60 CSS px      |
| 800×600  | 800×450 (+75 px bands, scale 0.625) | 25 CSS px            | ≈ 37.5 CSS px    |

The visible world area (32×18 tiles) is identical at both; only the display
scale differs (documented parity cost, unchanged policy).

## 6. Three-scale comparison protocol (U1, before propagation)

Same state, same frame: the Dock at the arrival spawn after the tutorial
(participant launch, opening skipped) and the Concourse at the south-door
spawn. Rendered at:

| Candidate | Method                                      | Tiles visible | Figure | Pixel stability                                          |
| --------- | ------------------------------------------- | ------------- | ------ | -------------------------------------------------------- |
| A 1.0     | direct, integer                             | 40 × 22.5     | 6.7 %  | exact                                                    |
| B 1.25    | plate 1024×576 + sharp-bilinear composite   | 32 × 18       | 8.3 %  | exact interiors, single-pixel AA boundaries, no crawl    |
| C 1.5     | direct, roundPixels, scroll snapped to 2 px | 26.7 × 15     | 10 %   | fixed 2→3 pattern; moving sprites alternate texel widths |

Frames are written to `docs/verification/professional-world-v1/unit1/scale-compare/`
(`dock-A-1.00.png`, `dock-B-1.25.png`, `dock-C-1.50.png`, `concourse-*`) plus
4× magnified crops of a 1 px wall seam and the figure at each candidate. The
choice and the reason are recorded in §7 by the U1 note; the design intent
is B.

## 7. Selection record (U1, 2026-09-06)

Frames: `docs/verification/professional-world-v1/unit1/scale-compare/`
(`dock-1.png`, `dock-1.25.png`, `dock-1.5.png`, `concourse-*.png`; same
Dock apron state after the tutorial, same Concourse south-door spawn).
**Selected: B (1.25).** 32×18 tiles and a figure at 8.3 % satisfy the
acceptance range; the Concourse crossing with two doors and their signs
reads in one view. A (1.0) shows 40×22.5 tiles with the figure at 6.7 %:
door signs and indicator lamps fall below comfortable legibility at
1280×720 and the room reads as a diagram. C (1.5) shows 26.7×15 tiles
(under the range) with the figure at 10 %. Pixel stability at B comes
from the plate + texel-snapped sampler (§2), inspected at 1:1 on the
1280×720 frames: no NEAREST crawl, no softened texel interiors. The
mission's "6–8 %" figure target is met within 0.3 %; recorded, not hidden.

## 8. Probes and tests

- `window.__cameraProbe` gains `plate: {width, height, scale}` and reports
  the plate camera's `worldView`; `__designSpace` unchanged.
- `e2e/world_v1_camera.spec.ts`: the visible world window is 1024×576 world
  px at both browser sizes; the camera follows (scroll changes as the avatar
  walks out of the dead zone and does not change inside it); the camera
  never leaves the room; the prompt appears only in range; a HUD card click
  lands (pointer path).
- `e2e/world_v1_route_budget.spec.ts` (pure): the walking budget of §4.
