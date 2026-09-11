# Professional World Rebuild V1 — vertical slice report (opening, Dock, Concourse)

Fable, 2026-09-11. Contract: `SLICE-MANIFEST.md` (frozen before the first
write). Branch `fable-professional-world-rebuild-v1`, entry HEAD `ba1a534`
(base 867c4d5 → 148d219 → 998f26a → 69eb33d → f6e051f → ba1a534), tree clean
at entry, no other writer. One local commit closes the unit (SHA in the
handoff). Nothing pushed, merged, tagged, deployed, deleted or removed.

## 1. What was built

- **Camera / rendering** (`src/world/viewport.ts`, `camera.ts`,
  `StationMapBuilder.ts`): the fixed-wide field — a 1280×720 world plate
  (40×22.5 tiles) composited at 1× on the native 1280×720 canvas and at
  1.5× on the native 1920×1080 canvas (chosen once at boot from the
  browser viewport; DEV `?canvas=720|1080` forces one). The 1.5×
  composite goes through the existing texel-snapped sampler
  (`plateSampler.ts`): exact texel interiors, one-screen-pixel seams; at
  1× the plate is NEAREST 1:1. HUD/design space scales with the canvas
  (1.2× → 1.8×; body text 18 → 27 physical px). Camera: dead zone 128×80,
  time-based damping α = 1 − e^(−dt/160 ms) (frame-rate independent),
  clamped to the room, frozen while a modal owns the scene, never moved by
  a task result. Zones not yet rebuilt keep their U1 field
  (`field: 'legacy'` → 1024×576 at 1.25×/1.875×) so they show no void
  bands; this is a migration state, recorded as a limitation.
- **Rooms** from the numeric authority (`world-layouts.json` walkable
  unions → `src/world/layouts/blockout.ts` → character grids; `X` = prop
  footprint, collides, floor beneath): **Dock 48×30**, **Concourse 60×38**.
  Two documented collision corrections: the Concourse operations island
  is solid and the authority's Vale/Kai lanes that crossed it are replaced
  by the reception district floor; the reception district and the reading
  bay open onto the spine along rows 26–31. Sites, doors and registry
  approaches follow the authority contact anchors (station approaches
  56 px south of the anchor, doors 56 px inside the room — 16 px inside
  the unchanged 72 px reach for driver landing error).
- **Assets**: 56 PixelLab frames + the airlock strip + the exterior
  tileset (`public/assets/world-v1/`, `manifest.json`,
  `src/world/kit/worldV1Assets.ts`, Boot loader) — PROVISIONAL, model
  selected, NOT human approved. Interior floor/wall tilesets were
  generated three times and rejected; the interior keeps the procedural
  theme tiles (hub/dock wall tops lifted so hull masses read as plate).
  Existing characters reused. Register: `ASSET-PROVENANCE-REGISTER.md`.
- **Opening** (`PilotOpeningScene.ts` + `DockScene.beginArrival`): one
  continuous wall-clock arrival — plateau with the station in its true
  topology, Mast 04 bent, cleared lane; the shuttle enters from the
  south-west, decelerates and berths at the Dock's south seal (8.6 s,
  four storyboard captions), cut to the same Dock: roof cover lifts, the
  participant steps from the open seal to the exact spawn while the iris
  closes, station line, release at 4.6 s. Total ≈ 13.4 s (storyboard 16 s:
  the "camera settles" segment is shorter because the Dock's initial
  composition is already the clamped arrival view — documented change).
  Skip and watched share `finishArrival()`; proven identical by
  `world_v1_story.spec.ts` (event types bar the outcome, stage, zone,
  spawn, card, instruction).
- **Interaction language**: no standing lamp on any station (door lintel
  lamps only), one soft floor pool under the current route target, prompt
  `E / Space — <verb> <object>`, class-3/5 objects answer with their state
  (`checked in`, `shuttle secured`); decorative props never prompt; the
  terminal's screen dims once checked in.
- **HUD**: the two-line mission card stays (canvas corner); inventory
  begins empty and the belt stays hidden in interior zones (unchanged).
- **Restoration** (crosswalk record appended to
  `M01-M26-SPATIAL-CROSSWALK.md`): Dock `dock-weather-cover` at
  `handover_briefing`; Concourse `operations-service-lamp` + district
  service lamps + warm pools at `workshop`. Stage-driven only.

## 2. Verification

| Check                                                                 | Result                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| --------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `tsc --noEmit`                                                        | pass                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| `vite build` → TEMP outDir                                            | pass (existing chunk-size warnings only)                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| scoped ESLint + Prettier                                              | pass on every changed source/spec                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| `world_v1_registry` (pure)                                            | 8/8 — every approach reachable from every spawn, door clearance, walking budget acts 1–2 = 62.7 s (bound raised 45 → 75 s for the authority footprints; recorded)                                                                                                                                                                                                                                                                                                                                  |
| `world_v1_story_state` (pure), `spawn_clearance`, `pilot_route_model` | pass                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| `world_v1_camera`                                                     | 3/3 — 1280×720 plate at 1×; identical field at 800×600 / 1280×720 / native 1920×1080 (plate 1.5×, HUD 1.8×); prompt only in range; pointer card path                                                                                                                                                                                                                                                                                                                                               |
| `world_v1_story`                                                      | 3/3 — opening ≤ 20 s, four captions, berth, scripted arrival; **skip ≡ watched**; mission card canvas-safe and clear of terminal/avatar; restoration persists across exit/re-entry                                                                                                                                                                                                                                                                                                                 |
| `dock_tutorial_paths`, `movement_and_first_interaction` (legacy Dock) | 3/3                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| `world_v1_interactions` — Dock                                        | 1/1 (prompts, sealed airlock, check-in)                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| `world_v1_interactions` — Concourse prompts / doors                   | **0/2 after three runs**: driver legs (500–900 px) abort under the software-GL renderer (a runtime probe walked the full spine to y = 18, so the geometry is open); the stall budget was raised (`e2e/helpers.ts`) and approaches moved 16 px inside reach, but the two tests still ended out of range. Recorded as **unverified by the driver**, not as a defect: the same registry approaches are exercised by the capture run (Vale prompt opens and the handover completes at both viewports). |
| `world_v1_slice_capture` 1280×720 / 1920×1080                         | 1/1 each — all manifest frames + motion pair                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| gameplay recording                                                    | `slice/slice-gameplay-1280x720.webm` (4 min real-time run: opening → arrival → check-in → Concourse → Vale → restoration; the run's final Dock return leg stalled — driver)                                                                                                                                                                                                                                                                                                                        |
| `v4_event_projection` (`world-v1-slice` vs U0 `world-v1-before`)      | see §4                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |

Frame time: the software-GL verification renderer runs slower than in
U1 (the wide plate is 1.56× the pixels and both rooms are 2–3× larger);
no target-hardware measurement was made (design gate, not evidence).

## 3. PixelLab summary

Generated: 4 tilesets (3 interior rejected, 1 exterior accepted), 5 object
batches (O1 16, O2 64 candidates → 23 selected, O3/O4/O5 4 each), 1
animation (frames 4–6 rejected), 3 shuttle images (1 accepted, tinted),
2 roofs, 2 exterior props — 21 calls. Used: 56 frames + strip + tileset.
Rejected: listed in the register. No commercial reference imagery was
used as input; every prompt is original.

## 4. Scientific projection — NOT RECORDED (gate open)

`v4_event_projection` (label `world-v1-slice`, baseline U0
`world-v1-before.json`) was run three times. Run 1 died at boot
("Execution context was destroyed" — the intermittent first-load
navigation flake); runs 2 and 3 completed the Dock, the Concourse
handover and Vale's briefing and then failed to drive the west door leg
(observed positions 336,754 and 1168,722: the two-leg walker clamps on a
district wall of the larger room even after the spine-routed
`concourseVia` helper was added). No projection file was written, so
**no before/after event comparison exists for this slice** — the number of
projection differences is therefore unknown, not zero. What is known:
the source diff (reviewed read-only, §5 S1) changes no event name,
payload key, window, form, option or offer text; every measurement
binding in `StationConcourseScene.ts` and `DockScene.ts` is untouched;
`world_v1_story.spec.ts` proves the watched and skipped openings emit the
same event types; `expectNoMeasurementEvents` held on the Dock/Concourse
interaction run. The historical U2 five-difference projection remains as
recorded. Closing this gate needs a driver that follows the loops
(waypoint routing) or a human-driven route — a stop-and-report item, not
something to force through comparator edits.

## 5. Reviews (read-only) and the one correction round

One combined read-only review (general-purpose agent, opus, running the
visual / gameplay / scientific / technical briefs against the actual
captures and the source diff; the project reviewer agents were not
discoverable in this session). Verdict: **pass with corrections** — "the
world now reads as a place rather than a grid, but the Concourse's empty
west half plus the tiled console bank still let it read as a task
interface with decoration". Findings and dispositions:

| #   | Finding                                                                                                                               | Disposition                                                                                                                                                                                                                                        |
| --- | ------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------- |
| V1  | Operations counter = one module tiled ×3; identical chair pairs recur 4×                                                              | **fixed** (two counter modules + crew lockers; seats replaced by a stool/bin cluster and one anchored pair)                                                                                                                                        |
| V2  | West half of the Concourse reads as purposeless floor; dark slabs ambiguous (floor or wall)                                           | **partly**: hub/dock wall tops lifted so hull reads as plate; the west half is the authority's reading bay + archive recess and already carries the reading desk, QC counter, cabinet, seats — recorded for the research owner's visual inspection |
| V3  | Opening: buildings on a flat white void, mixed projection with the top-down interior                                                  | **partly**: cool storm tint on the plateau; the three-quarter module images are the accepted P2 candidates — projection mix recorded as a limitation                                                                                               |
| G1  | Dock terminal less salient than the lamp beside it                                                                                    | **fixed** (painted service pad + caution edge under the terminal; the guidance pool is unchanged)                                                                                                                                                  |
| G2  | Three HUD text layers stack top-left; prompt anchored above the target                                                                | recorded (global prompt/toast placement rule; unchanged in this slice)                                                                                                                                                                             |
| S1  | Diff clean: no event/payload/window/form/option/offer text change; restoration reads the stage only; M05 lamp excluded                | pass                                                                                                                                                                                                                                               |
| S2  | Pre-existing (U2, untouched): `sector_record`/`sector_feeds`/`sector_core` lamps read terminal closure dispositions (`storyState.ts`) | recorded for the research owner (outside this slice)                                                                                                                                                                                               |
| T1  | 1.5× composite has a 2:1:2:1 texel duty cycle — possible shimmer in motion at 1080p                                                   | recorded; matches the authority's "honest pixel constraint"; the sampler keeps interiors exact and the plate sits at device offset 0 — the motion pair `1920x1080/motion/pan-a                                                                     | b.png` is the evidence for human inspection |

No second review round was run (context budget); the remaining items are
listed for the human approval gate.

## 6. Limitations stated plainly

- Assets are model-selected candidates; no human approval; interior
  floors/walls are still the procedural tiles.
- The five other zones keep their U1 field and V4 art (void-free by the
  legacy field); the Records/Lab/Yard/Deck/Core rebuilds are not started.
- Two Concourse driver tests are unverified (driver stalls), not proven
  green; the capture run and a runtime probe exercise the same geometry.
- No human usability, timing or empirical-validity claim; no
  target-hardware frame time; devicePixelRatio > 1 displays are upscaled
  by the browser (native canvas chosen by CSS viewport size only).
- Asset set version not bumped (two protected export specs pin `v5`;
  stimulus-freeze gate is a human decision).
- `world_v1_scale_compare.spec.ts` (U1 DEV `?world_scale=` comparison) is
  superseded and was not run.
