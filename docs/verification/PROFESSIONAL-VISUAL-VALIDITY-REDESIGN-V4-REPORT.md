# Professional Visual Validity & World Redesign V4 — report

Status: **IN PROGRESS — checkpoint report.** This file is kept current at
every unit boundary (mission §27). It never claims psychometric validation:
every behavioural measure in the pilot remains a provisional analogue
pending empirical validation against its source instrument.

## 1. Branch, base, HEAD

- Branch `fable-visual-validity-redesign-v1` (git worktree
  `.claude/worktrees/fable-visual-validity-redesign`), base
  `aaa73fd9041e561fb250d13021537aaf66e46d46` (`fable-professional-pilot-v3-v1`).
- HEAD: see §2 (the last listed commit).

## 2. Unit commits

| Unit | Commit        | Subject                                                  | State              |
| ---- | ------------- | -------------------------------------------------------- | ------------------ |
| 0    | `406aa63`     | docs(game): define professional visual redesign baseline | done               |
| 1    | `72ab012`     | feat(game): establish professional camera and arrival    | done               |
| 2    | (this commit) | refactor(game): clarify concourse and records workshop   | done (review owed) |
| 3–7  | —             | not started                                              | remaining          |

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

Dock — Unit 1 note. Concourse, Records — Unit 2 note. Laboratory, Yard, Deck,
Core Chamber — not yet redesigned (they render through the new camera only).

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
size) — Unit 1; C2 in the Concourse and Records — Unit 2. Remaining: C3, C4,
C6, C9, C11 (Laboratory/Yard/Deck), C15.

## 11. Screenshot inventory

`docs/verification/professional-visual-v4/baseline-800x600/` (30),
`baseline-1280x720/` (30), `unit1/` (11 route frames + Dock at both
resolutions), `unit2/` (11 route frames at 1280×720).

## 12. Scientific event projection

`projection/baseline-v3.json` (untouched tree) vs `projection/unit1.json`:
**0 differences** (`v4_projection_compare`, pure) — 154 events, 80 event
types, 28 opportunity records, zone sequence and final stage `complete`
identical, payload-key sets identical, form/counterbalance assignments
identical. Unit 2: see §22.

## 13–14. Test manifest and failure classification

Unit-level tables in the Unit notes. Full manifest in documented chunks:
Unit 7 (not run yet). Verification-environment finding: SwiftShader fps 20 →
13–15 with the larger canvas (Unit 1 note); fixed-duration key holds are
load-sensitive, position-synced legs are not.

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
