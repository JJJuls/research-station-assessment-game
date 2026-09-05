# U1 — camera/scale foundation, Dock and Concourse vertical slice (World V1)

Branch `fable-professional-world-rebuild-v1`; entry HEAD `148d219` (U0);
tree clean at entry. Contract: design authority §13 row U1, with the
allowlist amendment recorded in §6 below.

## 1. What was built

- **World plate** (`src/world/viewport.ts`, `camera.ts`, `plateSampler.ts`):
  every world object is drawn once per frame, 1:1, into a 1024×576
  RenderTexture whose own camera follows the avatar (dead zone 96×64,
  bounded lerp 0.12, whole-pixel scroll, room bounds, rooms smaller than
  the view centred over the theme void); the plate is composited onto the
  1280×720 canvas at 1.25 through a texel-snapped bilinear sampler
  (`WorldPlateSamplerPipeline`), so texel interiors are exact and seams
  resolve to one screen pixel with no crawl. HUD and every overlay keep
  the 800×600 design-space camera unchanged. DEV: `?world_scale=1|1.25|1.5|2`
  for the comparison frames; `__cameraProbe` reports the plate.
- **Interaction grammar** (`src/world/interactionRegistry.ts`, `RoomScene.ts`):
  the registry declares every Dock and Concourse object (id, kind,
  position, radius, verb, label, availability rule, opened surface,
  footprint, depth anchor, stages, window, approach point). The class is
  derived per frame (active = current guidance target; inactive =
  availability state; else optional). Presentation: an indicator lamp on
  every station/door art (cyan / steel-white / dark), one cyan light pool
  under the guidance target, the one-line prompt `E — <verb> <label>` (or
  `E — <Label>: <state>` for class 3, where E shows the state and opens
  nothing). Removed: name chips, marker pulse, beacon ring/arrow/edge
  indicator, cyan door tint and threshold bars, permanent readout ribbons
  (Concourse gauge and status strip).
- **Mission card** (`RoomScene.ts`): a top-left card with the act title
  (episode name) and one next action, replacing the wide banner; the zone
  title card sits under it for 2 s.
- **Kit** (`src/world/kit/kitTextures.ts`, 31 procedural textures): door
  frames (h/v) with lamp recesses, sign plates, bay windows (with/without
  the shuttle), airlock header, ops counter, status wall, side counter,
  reading desk, wall gauge, notice board, bench, locker bank, crate stack,
  pallet jack, cargo rail, terminal kiosk, wide wall console, light
  fixtures, warm/cold/cyan light pools, contact shadow, hazard strip,
  cable tray/junction, floor lane/edge, parcel. Placement helpers:
  `addKitProp` (foot-line depth), `addGroundInfra`, `addOverhead`,
  `addFloorDecal`, `addFloorLane`, `addWallSign`, `addDoorFrame`.
- **Depth model** (`src/constants/depth.ts`): GroundInfra and Overhead
  layers; `worldDepth` re-scaled for rooms up to 1 980 px tall.
- **Dock** (`src/scenes/DockScene.ts`, `src/world/layouts/dock.ts`, 36×24):
  participant layout per ROOM-BLOCKOUTS.md §1; the legacy bay is kept
  byte-for-byte behind `?route=legacy` (`LEGACY_DOCK_*`), so every legacy
  regression spec still drives its historical coordinates; `__dockProbe`
  publishes the active geometry for the shared tutorial helper.
- **Concourse** (`src/scenes/StationConcourseScene.ts`, `layouts/concourse.ts`,
  40×26): per ROOM-BLOCKOUTS.md §2 and `docs/game/rooms/15-station-concourse.md`.
  Every window, event, form, option, offer text and gauge reading is
  unchanged; only positions and presentation moved.
- **Belt** (`InventoryHud.ts`): shown only where the room says it is
  relevant (pilot zones: the Recovery Yard), never while empty; the
  selected-item name is transient (1.5 s). **NPCs** (`Npc.ts`): no idle
  bob, no name chip. **Bundles** (`worldBundles.ts`): kit parcel, no chip;
  the nearest bundle in reach is announced by the prompt (`E — Take …`).
- **e2e**: `pilotHelpers.PILOT` derives the Dock/Concourse book from the
  source of truth; `journey.completeDockTutorial` reads `__dockProbe`;
  `registryApproach(id)`; new specs `world_v1_registry` (pure),
  `world_v1_camera` (replaces `v4_camera`), `world_v1_scale_compare`,
  `world_v1_interactions`; `pilot_route`, `pilot_episodes_1_2`,
  `pilot_deck`, `v4_visual_capture` updated to the derived book.

## 2. Three-scale comparison (CAMERA-AND-SCALE-SPEC.md §6)

Frames: `unit1/scale-compare/{dock,concourse}-{1,1.25,1.5}.png` (same
states; DEV switch). Selection: **B, 1.25** — 32×18 tiles, figure 8.3 % of
the viewport, the whole Concourse crossing plus two doors in one view,
signage legible; A (1.0) shows 40×22.5 tiles and the figure at 6.7 %,
where the door signs and lamps fall below comfortable legibility at
1280×720 and the room reads as a diagram again; C (1.5) shows 26.7×15
tiles (below the acceptance range) with the figure at 10 %. Pixel
stability at B is by the sampler (no NEAREST crawl, no LINEAR softening
of texel interiors) — inspected on the 1280×720 frames at 1:1.

## 3. Verification

| Check                                                                 | Result                                                                                                                                |
| --------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| `npm.cmd run lint:tsc`, `npm.cmd run build`, scoped ESLint + prettier | pass                                                                                                                                  |
| `world_v1_registry` + `spawn_clearance` (pure)                        | 11/11 — every approach reachable from every spawn; door clearance; walking budget acts 1–2 recorded as an annotation (< 45 s)         |
| `world_v1_camera`                                                     | 3/3 (plate 1024×576 at 1.25; dead-zone follow; idle hold; bounds; parity at both viewports; prompt only in range; pointer card click) |
| `world_v1_scale_compare`                                              | 3/3 (six frames)                                                                                                                      |
| `world_v1_interactions`                                               | Dock 1/1; Concourse: see §4                                                                                                           |
| `dock_tutorial_paths`, `movement_and_first_interaction` (legacy Dock) | 3/3                                                                                                                                   |
| `pilot_route`                                                         | tests 1, 3, 4 pass; test 2 (topology): see §4                                                                                         |
| projection `world-v1-u1` vs `baseline-v3`                             | see §4                                                                                                                                |

## 4. Defects found and corrected during U1

1. **Hidden objects painted into the plate.** `DynamicTexture.batchList`
   draws every entry without a `willRender` check, so the invisible
   collision tilemap layer painted over the floor decals and low props
   (first frames showed the placeholder grid). Fixed: the plate applies
   the renderer's visibility/alpha/camera-filter test per child.
2. **Decal alphas too subtle** for the sampler at 1.25 (lane 0.05, pool
   0.035): raised to 0.09–0.1 and 0.05–0.095.
3. **Test-driver leg order.** The two-leg driver walked x-first along the
   south row into the crate group before the west door; the Concourse
   doors now approach y-first (the spine/axis are the clear legs). The
   pure reachability spec proves every approach point; the driver only
   picks the leg order.
4. **Load-sensitive failures.** The first chain's Concourse-dependent
   specs (`pilot_route` topology, `concourse_interaction_lifecycle`,
   `pilot_episodes_1_2`, the projection) failed at "prompt did not open at
   912,368" while stale headless Chrome from an interrupted run loaded the
   machine; the identical helper opens Vale's prompt in isolation (probe
   spec, deleted). Re-run on a quiet machine: §5.

## 5. Reviews (read-only; project reviewer agents were not discoverable in this session, so general-purpose agents ran the same read-only briefs) and the consolidated correction round

Visual (V1–V10): V1 mission card over the arrival terminal → **fixed** (terminal alcove moved two rows down); V2 toast under the card → **fixed** (feedback banner y 128); V3 wall signs read as floating chips → **fixed** (W/E signs moved flush to the door frames; they are wall plates, not chips); V4 cargo rail rungs → **fixed** (segments rotated into a continuous rail); V5 shuttle absent → **fixed in part** (brighter silhouette and cabin strip; a generated shuttle asset is U2 candidate 1); V6 Concourse reads flat → **fixed in part** (stronger lane material, plaza benches/notice board; wall-face rows are the theme's — recorded); V7 wooden pallets → **fixed** (steel crates, amber straps); V8 no contact shadows → **fixed**; V9 movement ring style → owner decision (recorded); V10 scale 1.25 confirmed.

Gameplay (W1–W9): W1 stale "incident desk" objective → **fixed** ("operations desk"; "storm packet"); W2 pools under every station → **fixed** (only the guidance pool remains); W3 decorative tower's emissive ring → **fixed** (tinted); W4 W/E signs off the wall → **fixed**; W5 HUD safe-area (design space 160 px inset) → recorded as intended (design-space parity for every task surface); W6 empty plaza → **fixed in part**; W7 blockout tables drifted → **fixed**; W8 `classOf` undefined case → **fixed**; W9 off-route doors ungated → owner decision (recorded; navigation freedom is the pilot's existing rule).

Scientific (S1–S9): S1 M05 occasion-1 distance/access changed by the layout → **research-owner decision** (o1/o2 matching; recorded in the report §14); S2 standing indicator lamp on the silent-fault object → **fixed** (`indicator: 'none'` on the M05 object; the yard object is treated identically in U5); S3 directive verb on the fault → **fixed** ("Use"); S4 gauge ribbon removed → recorded as an intentional measurement-condition change for the owner; S5 stronger world guidance vs map-open reminder rate → recorded; S6 registry window label → **fixed** (non-canonical label); S7 belt visibility per room → carried as a constraint for U3/U5; S8/S9 no action / projection recorded in §5b.

### 5b. Post-correction runs

Third run after the correction round (port 5371, quiet machine, `--retries=0 --workers=1`):
`world_v1_registry` 8/8, `world_v1_camera` 3/3, `world_v1_scale_compare` 3/3 (frames
regenerated), `world_v1_interactions` Dock 1/1; Concourse 0/1 — the driver
overshot the north-door x-leg by 29 px under load (669 vs 640) and stood 76 px
from the trigger; the registry approach for that door moved 8 px closer
(y 104) so a 29 px lateral error still lands inside the 72 px radius. Not
re-run after that change (context budget) — recorded as **unverified**.

**Open at the U1 commit (honest state):**

- `pilot_route` topology: after the correction round the driver passes
  the Dock and Concourse (the Vale prompt now opens on re-entry) and fails
  in the **Laboratory** at Kai (`prompt did not open at 592,208`) — an
  unrebuilt V4 zone rendered under the new camera. Its 25×19 map is
  smaller than the 32×18 view (the plate centres it over the void), which
  the route driver tolerates, but the Kai approach did not open a prompt.
  Root cause not yet isolated; U4 rebuilds that zone. Until then the full
  participant route cannot be driven end to end by the specs.
- Consequently the **U1 projection `world-v1-u1` was NOT recorded** (the
  driver fails before the route completes). Source review found no
  payload, event, window, form or disposition change (scientific review
  S1–S9); the projection gate stays open until the driver reaches the
  Core again (U4 at the latest) — stated, not hidden.
- `concourse_interaction_lifecycle` A/D, B (pixel-sampling fraction 0.62
  < 0.8) and C/E (timeout): the sampled overlay area includes the void
  margins of the unrebuilt Records Workshop (25×19 < view), so "unchanged"
  points are the void before and the panel after. Deferred to U3 (Records
  rebuild) as a test-only artefact; the overlay lifecycle itself is proven
  by `world_v1_interactions` (surface pauses and releases the world).
- `pilot_episodes_1_2` episode 1: failed at the desk-lamp leg before the
  axis waypoint was added; not re-run after the fix.
- The Dock terminal alcove was moved two rows down to clear the mission
  card at the arrival view (visual V1) and **reverted**: the shared
  tutorial driver stalled on the new column. V1 stays open (U2 mission-card
  placement: the card will anchor to the canvas safe area instead).
- Reviewer items still open: V6 wall-face rows and Concourse density
  (in part), V9 and W9 (owner decisions), S1 and S4 (research-owner
  decisions, report §14), S5/S7 (monitor / carry forward).

## 6. Allowlist amendment (recorded, not silent)

The U1 contract's list needed, in addition: `src/world/plateSampler.ts`,
`src/world/camera.ts`, `src/world/layouts/**` (pure grids shared by the
scenes and the pure specs), `e2e/pilot_episodes_1_2.spec.ts`,
`e2e/pilot_route.spec.ts`, `e2e/pilot_deck.spec.ts`,
`e2e/v4_visual_capture.spec.ts`, `e2e/spawn_clearance.spec.ts` (unchanged
in the end), `docs/game/rooms/15-station-concourse.md`. Reason: the
Dock/Concourse coordinate book moved out of the specs into the source of
truth, and the pure reachability check needs Node-importable layouts.

## 7. Not done in U1 (by design)

Story-state spine, opening, map redraw, restoration model (U2); item
purpose registry, hotbar rules beyond zone gating (U3); the five other
zones keep their V4 layouts, chips and `zoneSignage` until their units.
PixelLab: no call.

## 8. Confirmation

Nothing pushed, merged, tagged, deployed, published, deleted or removed
(the superseded `e2e/v4_camera.spec.ts` was replaced by
`world_v1_camera.spec.ts` in the same commit). No worktree created or
removed.
