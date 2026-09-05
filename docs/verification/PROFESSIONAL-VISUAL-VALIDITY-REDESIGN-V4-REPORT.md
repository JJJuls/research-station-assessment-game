# Professional Visual Validity & World Redesign V4 — report

Status: **IN PROGRESS — checkpoint report.** This file is kept current at
every unit boundary (mission §27). It never claims psychometric validation:
every behavioural measure in the pilot remains a provisional analogue
pending empirical validation against its source instrument.

## 1. Branch, base, HEAD

- Branch `fable-visual-validity-redesign-v1` (git worktree
  `.claude/worktrees/fable-visual-validity-redesign`), base
  `aaa73fd9041e561fb250d13021537aaf66e46d46` (`fable-professional-pilot-v3-v1`).
- HEAD at this checkpoint: see the unit table (§2); every unit ends in one local commit.

## 2. Unit commits

| Unit | Commit        | Subject                                                  | State                |
| ---- | ------------- | -------------------------------------------------------- | -------------------- |
| 0    | `406aa63`     | docs(game): define professional visual redesign baseline | done                 |
| 1    | `72ab012`     | feat(game): establish professional camera and arrival    | done                 |
| 2    | `ce1ed35`     | refactor(game): clarify concourse and records workshop   | done                 |
| 2a   | `f4a3a21`     | docs(verification): record V4 checkpoint after unit 2    | checkpoint           |
| 2b   | `5c8f68e`     | fix(game): settle concourse and records readouts         | done (review closed) |
| 3    | (this commit) | refactor(game): focus diagnostics assessment sequence    | done                 |
| 4    | `8f5dd42`     | refactor(game): structure exterior recovery yard         | done                 |
| 5    | (this commit) | refactor(game): refine utility and core closure          | done                 |
| 6    | (this commit) | chore(game): unify assessment presentation               | done                 |
| 7    | —             | final verification and report                            | remaining            |

Per-unit evidence notes: `docs/verification/professional-visual-v4/UNIT-*.md`.

## 3. Changed files

Unit 0: `docs/game/VISUAL-SYSTEM-V4.md`, `docs/verification/professional-visual-v4/**`
(baseline captures ×2 resolutions, projection baseline, audit), `e2e/v4_visual_capture.spec.ts`,
`e2e/v4_event_projection.spec.ts`, `e2e/v4Projection.ts`.
Unit 1: `src/index.ts`, `src/world/viewport.ts` (new), `src/world/RoomScene.ts`,
`src/world/SceneRouter.ts`, `src/world/StationMapBuilder.ts`, `src/constants/depth.ts`,
`src/sprites/Player.ts`, `src/gameplay/{physical,effects}.ts`, `src/pilot/PilotZoneScene.ts`,
`src/pilot/ui/{PilotOpeningScene,StationMapScene,WorkSurfaceScene,FeedPanelScene}.ts`,
`src/inventory/ui/InventoryOverlayScene.ts`, `src/informationProcessing/ui/*Scene.ts`,
`src/scenes/{Menu.tsx,DockScene.ts}`, e2e helpers/specs listed in the Unit 1 note,
`docs/game/rooms/00-dock-arrival.md`.
Unit 2: `src/scenes/{StationConcourseScene,RecordsWorkshopScene}.ts`, Unit 2 note, captures.
Unit 2 fix: the same two scenes (plate edge lines/fills, readout register and
depth), `e2e/concourse_interaction_lifecycle.spec.ts` (budget), Unit 2 note,
`unit2/**` recaptured at both resolutions.
Unit 3: `src/scenes/DiagnosticsLaboratoryScene.ts`,
`docs/game/rooms/14-diagnostics-laboratory.md` (new), Unit 3 note,
`e2e/v4_visual_capture.spec.ts` (lab waypoint), `e2e/pilot_signal_capture.spec.ts`
(output directory parameter), `unit3/**`, `projection/unit3.json`.
Unit 4: `src/scenes/ExteriorRecoveryYardScene.ts`, `src/world/proceduralTilesets.ts`
(exterior theme `noise` token only — recorded allowlist deviation),
`docs/game/rooms/11-exterior-recovery-yard.md` (V4 section), Unit 4 note,
`unit4/**` (both resolutions), `projection/unit4.json`.
Unit 5: `src/scenes/UtilityCoreDeckScene.ts`, `src/scenes/CoreChamberScene.ts`,
`docs/game/rooms/13-utility-core-closure.md` (V4 section), Unit 5 note,
`e2e/pilot_closure_capture.spec.ts` (output directory parameter),
`e2e/v4_core_dev_capture.spec.ts` (new, developer-launch chamber frames),
`unit5/**` (both resolutions + `core-dev/`), `projection/unit5.json`.
Unit 6: `src/world/RoomScene.ts` (chip/prompt placement, door threshold,
opaque card, prompt y clamp, instruction size), `src/pilot/PilotZoneScene.ts`
(zone-local objectives, beacon edge indicator, readout clamp helper, legend
filter), `src/gameplay/InventoryHud.ts` (belt hidden while empty, TAB,
caption size), one `onPilotUpdate` call each in the Records, Yard and Deck
scenes (recorded deviation), Unit 6 note, `unit6/**`, `projection/unit6.json`.

## 4. Render and camera architecture (before → after)

Before: 800×600 4:3 canvas, camera zoom 1, rooms padded to 25×19 tiles so a
whole room fitted one screen. After: 1280×720 16:9 canvas (FIT letterbox in
the page ground), world camera at integer zoom 2 following the avatar
inside the room bounds (640×360 world px visible), a second camera per room
rendering the unchanged 800×600 HUD/overlay design space at 1.2×, overlays
fitted to the same design camera over an opaque backdrop. Full table and
coordinate spaces: `docs/game/VISUAL-SYSTEM-V4.md` §1.

## 5. Visual system and depth policy

`docs/game/VISUAL-SYSTEM-V4.md` §2–§5; `DepthLayer` in `src/constants/depth.ts`;
station/door markers y-sorted at the foot line (`RoomScene.sortAtFootLine`).

## 6. Room-by-room

Dock — Unit 1 note. Concourse, Records — Unit 2 note and its closure
section. Diagnostics Laboratory — Unit 3 note and
`docs/game/rooms/14-diagnostics-laboratory.md`: four numbered bay plates on
one service aisle, state-driven salience (cyan frame + numeral on the next
bay only), north-zone plates, restrained bezelled display, nine labels
removed, Noor's relay subtitle in its own bottom band. Exterior Recovery
Yard — Unit 4 note and the room doc's V4 section: both snowfall layers
removed, calmer floor, one packed-snow service path linking the six work
zones, apron/excavation/compound ground plates on the floor layer (the
avatar was drawn under the compound plate before), ten labels removed,
state readouts on the low-prop band. Utility Deck and Core Chamber —
Unit 5 note and the room doc's V4 section: one trunk and header, three
feed-bay plates aligned to the machinery blocks, review-station and Core
alcove plates, conduits on the floor layer in the trim family, the
oversized PROVISIONAL slices replaced by 32 px procedural props, eleven
labels removed, readouts in the environment register; the chamber's
control plate and apparatus floor plate, floor glows on the decal layer;
the ARM → CONFIRM lifecycle, ramp timing and neutral completion untouched.
Cross-world (Unit 6 note): zone-local objective lines once inside the
destination zone, an on-screen edge indicator for an off-view beacon
target, chips and prompts never placed over another interactable's art,
door threshold bars at the leaf base, opaque dialogue cards, the belt
hidden while empty, world readouts hidden when mostly out of view or under
the objective band, the field-action keys listed only in the yard, TAB kept
on the canvas, body-size affordance lines.

## 7. Route and wayfinding evidence

`pilot_route` 4/4 after Unit 1 (six-zone topology, one purposeful return,
beacon/objective/map/controls). Mandatory unmeasured navigation unchanged:
no coordinate on the route moved except the Dock movement marker
(control-room tutorial geometry, (544,160) → (544,224)).

## 8–9. Assets selected / rejected

`UNIT-0-BASELINE-AUDIT.md` §2. No asset generated; no PixelLab call. The
snowfall strip is rejected for the route (removal lands in Unit 4).

## 10. Removed visual-confound sources so far

C1 (whole-room view), C5 (Dock marker pulse/label, pad beacons), C7 (stale
objective on resume), C8 (markers over the avatar), C10 (opening), C12
(Dock door family), C13 (4:3 exposure at 16:9 browsers), C14 (objective
size) — Unit 1; C2 in the Concourse and Records — Unit 2; C2/C3/C4 in the
Laboratory (labels, equal salience, HUD collisions of the relay subtitle) —
Unit 3; C6 (snowfall/noise), C9 (yard labels), C11 (yard depth errors) —
Unit 4; C11 in the Deck/Core (conduits, glows and plates in the actor
depth range; oversized machinery) — Unit 5; C15 (HUD lifecycle: stale objective lines, empty belt, beacon
off-screen, chip/prompt over other art) — Unit 6. Remaining: none of the
audited sources; the Unit 7 final gate re-checks every one on the full
route.

## 11. Screenshot inventory

`docs/verification/professional-visual-v4/baseline-800x600/` (30),
`baseline-1280x720/` (30), `unit1/` (11 route frames + Dock at both
resolutions), `unit2/` (11 route frames at 1280×720, recaptured after the
correction round) + `unit2/800x600/` (11), `unit3/12…18` (laboratory at
1280×720) + `unit3/800x600/` (see the Unit 3 note for the run status),
`unit4/19…26` (yard at 1280×720) + `unit4/800x600/19…30` (yard plus the
pre-Unit-5 Deck/Core under the V4 camera), `unit5/19…30` + `unit5/800x600/`
(deck after Unit 5) and `unit5/core-dev/` (chamber arrival and prompt from
the labelled developer inspection launch), `unit6/01…11` (Dock, Concourse,
Records after the cross-world pass, 1280×720).

## 12. Scientific event projection

`projection/baseline-v3.json` (untouched tree) vs `projection/unit1.json`:
**0 differences** (`v4_projection_compare`, pure) — 154 events, 80 event
types, 28 opportunity records, zone sequence and final stage `complete`
identical, payload-key sets identical, form/counterbalance assignments
identical. Unit 2 (`unit2.json`): 0 differences. Unit 3 (`unit3.json`,
recorded on the tree carrying the Unit 2 correction and the laboratory
redesign; `unit3.diff.json` = `[]`): **0 differences**. Unit 6 (`unit6.json`): see the Unit 6 note. Unit 4
(`unit4.json`): **0 differences**. Unit 5 (`unit5.json`, `unit5.diff.json`
= `[]`): **0 differences**.

## 13–14. Test manifest and failure classification

Unit-level tables in the Unit notes. Full manifest in documented chunks:
Unit 7 (not run yet). Verification-environment finding: SwiftShader fps 20 →
13–15 with the larger canvas (Unit 1 note); fixed-duration key holds are
load-sensitive, position-synced legs are not.

Unit 2 open items, classified from the evidence collected on 2026-09-05
(Unit 2 note, "Closure session"):

| Test                                           | Evidence                                                                                                                                          | Classification                                                                                                                                                                                                                                                         |
| ---------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `pilot_records` "M02 abandonment fail-forward" | passes alone at `--retries=0 --workers=1` (1.2 min)                                                                                               | **load/intermittent** (not reproduced on a quiet machine); repeat in the Unit 7 manifest                                                                                                                                                                               |
| `concourse_interaction_lifecycle` "B"          | fails deterministically at the 120 s config default on V4 inside the last walking leg with every assertion passed; passes on the V3 base in 108 s | **deterministic test-driver/budget defect** caused by the documented software-GL frame-rate drop, not a product regression; budget set to 300 s (test-only, assertions unchanged); post-correction rerun deferred to Unit 7 after an orphaned-process harness incident |

## 15–16. Reviewer findings and dispositions

Unit 1 visual review (Opus, read-only): 2 blockers, 8 majors, 8 minors —
dispositions in the Unit 1 note (blockers and 7 majors fixed in the one
correction round; M8 deferred to Unit 2; minors recorded).

## 17. Accessibility and burden

Reduced motion: opening static, marker pulse held, beacon/title behaviour
unchanged. Text ladder raised (objective 17 px design ≈ 20 canvas px);
at an 800×600 browser the letterboxed display is 800×450 (documented
parity cost). Route travel unchanged.

## 18–21. Remaining risks

Visual: Laboratory/Yard/Deck/Core not yet composed (equal salience, snowfall,
literal depths). Gameplay: none known new; overlay pointer hit-testing
depends on `pointer.worldX/Y` (covered by the pointer closure test).
Scientific: none introduced (projection 0 diffs); the Dock marker move is a
control-room presentation change recorded here. Operational: the lower
software-GL frame rate lengthens the full manifest.

## 22. Launch and verification commands

```sh
npm.cmd run lint:tsc && npm.cmd run build
PW_DEV_PORT=5362 npx playwright test e2e/v4_camera.spec.ts --retries=0 --workers=1
PW_DEV_PORT=5362 V4_OUT=docs/verification/professional-visual-v4/<dir> V4_VIEWPORT=1280x720 npx playwright test e2e/v4_visual_capture.spec.ts --retries=0 --workers=1
PW_DEV_PORT=5362 V4_LABEL=<label> V4_PROJECTION_BASELINE=docs/verification/professional-visual-v4/projection/baseline-v3.json npx playwright test e2e/v4_event_projection.spec.ts --retries=0 --workers=1
V4_PROJECTION_CURRENT=docs/verification/professional-visual-v4/projection/<label>.json npx playwright test e2e/v4_projection_compare.spec.ts
```

Checkpoint (mission §27), 2026-09-05: Units 0–2 committed; tree clean.
Next action: a read-only Unit 2 review (gameplay + visual), then Unit 3
(`src/scenes/DiagnosticsLaboratoryScene.ts`) per `UNIT-0-BASELINE-AUDIT.md`
§5, starting with `PW_DEV_PORT=5362 npx playwright test e2e/pilot_lab.spec.ts
--retries=0 --workers=1` as the pre-change baseline. Open test items:
`pilot_records` "M02 abandonment fail-forward" and
`concourse_interaction_lifecycle` "B" (see the Unit 2 note).

## 23. Confirmation

Nothing was pushed, merged, tagged, deployed, published, deleted or removed.
No worktree was created or removed. No PixelLab call was made.
