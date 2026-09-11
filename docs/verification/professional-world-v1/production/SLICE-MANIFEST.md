# Professional World Rebuild V1 — vertical-slice production manifest

Frozen BEFORE the first repository write (2026-09-11). Mission: "PROFESSIONAL
WORLD REBUILD V1 — GATED VISUAL VERTICAL SLICE — OPENING, DOCK AND CONCOURSE"
(research-owner instruction, this session). Entry HEAD
`ba1a5346e1a72da1ffab4d0e6d747551d40c3d35` on `fable-professional-world-rebuild-v1`
(ancestry 867c4d5 → 148d219 → 998f26a → 69eb33d → f6e051f → ba1a534 verified;
tree clean including untracked files; no other writer found).

## Unit contract (docs/ai/CLAUDE-OPERATING-MODE.md §2)

1. **Objective** — a playable, professionally presented vertical slice of
   Station 080: replacement opening, Arrival/Dock (48×30), Station Concourse
   (60×38), the fixed-wide 40×22.5-tile camera with resolution parity, the
   five-state interaction language, the quiet mission card / map
   introduction, and one visible, scientifically neutral restoration change.
2. **Scientific rationale** — scientifically neutral presentation work.
   M01, M05, M09, M10, M12, M14 (Concourse) and the Dock control covariates
   keep their identities, windows, forms, options, event names and
   dispositions; only geometry and presentation move (authority:
   `docs/verification/professional-world-v1/astra-authority/world-layouts.json`,
   `M01-M26-SPATIAL-CROSSWALK.md`).
3. **Participant-facing behaviour** — arrive by shuttle at the Dock, check in,
   walk north into the Concourse, meet Vale at the operations counter; no
   questionnaire wording anywhere.
4. **Exact allowed-file list** — see "Allowlist" below.
5. **Prohibited areas** — `src/systems`, `src/measurement`,
   `src/pilot/windows`, `src/pilot/exterior`, `src/pilot/return`,
   `src/pilot/closure`, `src/fieldActions`, `src/informationProcessing`,
   `src/pilot/{evidenceLedger,coverageSchedule,pilotCoverage}.ts`,
   `src/inventory/*` engine files, `src/world/CanonicalEventContext.ts`,
   `src/sprites/Player.ts`, `e2e/v4Projection.ts`, every historical
   evidence file, every scientific/research/decision document, package
   files, hooks and configuration, other zones' scenes.
6. **Entry state** — branch `fable-professional-world-rebuild-v1`, HEAD
   `ba1a534`, clean.
7. **Success behaviour** — the watched and skipped openings end in one Dock
   state; every Dock/Concourse registry object prompts at its approach and
   opens its existing surface; doors traverse both ways; the projection
   against the committed baseline shows only classified differences.
8. **Failure/recovery** — unchanged: sealed messages, class-3 prompts,
   modal pause/resume, the existing route stage machine.
9. **Telemetry boundary** — no new canonical event name, payload field or
   derived variable. Existing `pilot_*` route telemetry and Dock
   `dock_*`/`tutorial_*` events unchanged.
10. **Scientific acceptance** — zero unclassified projection differences;
    no measurement event before its opportunity; the restoration change is a
    function of the route stage only.
11. **Gameplay acceptance** — mission §9/§11/§12 criteria; the reviewer's
    "grid of assets / placeholders / console row / task interface" test.
12. **Required tests** — `npm.cmd run lint:tsc`, production build (Vite into
    a TEMP outDir), scoped ESLint + Prettier, `git diff --check`,
    `world_v1_registry`, `world_v1_camera`, `world_v1_interactions`,
    `world_v1_story`, `world_v1_story_state`, `spawn_clearance`,
    `pilot_route_model`, `world_v1_slice_capture` (both viewports),
    `v4_event_projection` (label `world-v1-slice`, baseline U0
    `world-v1-before`), `dock_tutorial_paths`, `movement_and_first_interaction`.
13. **Required screenshots** — see "Capture manifest".
14. **Stop conditions** — mission §14.
15. **Model** — Fable (implementation); read-only reviews by general-purpose
    subagents running the project reviewer briefs.
16. **Commit** — `feat(game): build the professional world vertical slice`.

## Allowlist (exact; everything else read-only)

Product:
`src/index.ts`, `src/style.css`, `src/constants/assets.ts`, `src/constants/depth.ts`,
`src/scenes/Boot.ts`, `src/scenes/DockScene.ts`, `src/scenes/StationConcourseScene.ts`,
`src/world/viewport.ts`, `src/world/camera.ts`, `src/world/plateSampler.ts`,
`src/world/RoomScene.ts`, `src/world/StationMapBuilder.ts`, `src/world/proceduralTilesets.ts`,
`src/world/interactionRegistry.ts`, `src/world/index.ts`,
`src/world/layouts/grid.ts`, `src/world/layouts/dock.ts`, `src/world/layouts/concourse.ts`,
`src/world/layouts/blockout.ts` (new), `src/world/kit/kitTextures.ts`,
`src/world/kit/worldV1Assets.ts` (new), `src/pilot/zoneSites.ts`,
`src/pilot/pilotRoute.ts` (PILOT_DOORS dock/concourse geometry only),
`src/pilot/storyState.ts` (opening captions / presentation only),
`src/pilot/PilotZoneScene.ts` (HUD/story refresh only), `src/pilot/ui/MissionCard.ts`,
`src/pilot/ui/PilotOpeningScene.ts`, `src/pilot/ui/StationMapScene.ts`,
`src/gameplay/controlsReference.ts`, `src/gameplay/Npc.ts`, `src/gameplay/physical.ts`
(plate-scale probe only).
Assets: `public/assets/world-v1/**` (new).
Tests/drivers: `e2e/world_v1_camera.spec.ts`, `e2e/world_v1_registry.spec.ts`,
`e2e/world_v1_interactions.spec.ts`, `e2e/world_v1_story.spec.ts`,
`e2e/world_v1_story_state.spec.ts`, `e2e/world_v1_scale_compare.spec.ts`,
`e2e/world_v1_u2_capture.spec.ts`, `e2e/world_v1_slice_capture.spec.ts` (new),
`e2e/spawn_clearance.spec.ts`, `e2e/pilotHelpers.ts`, `e2e/returnHelpers.ts`
(Concourse coordinates from shared sites only), `e2e/journey.ts` (Dock geometry only),
`e2e/helpers.ts` (transform/timing only), `e2e/pilot_episodes_1_2.spec.ts`
(episode-1 navigation only), `e2e/concourse_interaction_lifecycle.spec.ts`
(geometry/output only), `e2e/v4_event_projection.spec.ts` (output location only).
Docs: `docs/verification/professional-world-v1/production/**` (new),
`docs/verification/professional-world-v1/projection/world-v1-slice*.json` (new),
`docs/game/rooms/00-dock-arrival.md`, `docs/game/rooms/15-station-concourse.md`,
`docs/game/world-v1/ASSET-PROVENANCE-REGISTER.md` (append),
`docs/assets/pixellab-asset-manifest.md` (append),
`docs/verification/professional-world-v1/astra-authority/M01-M26-SPATIAL-CROSSWALK.md`
(append an implementation record only), `docs/verification/PROFESSIONAL-WORLD-REBUILD-V1-REPORT.md` (append).

## Asset batch manifest (PixelLab; frozen state-to-frame counts)

Output root `public/assets/world-v1/`. Every accepted frame is one PNG plus
an entry in `manifest.json` (id, file, source job/object id, prompt, size,
footprint, anchor, state, acceptance). Candidate exports live in the session
scratchpad until accepted; rejected candidates are listed in the register,
never committed.

| Batch   | Tool                         | Content (state × frames)                                                                                                                                                                                                                                                                         | Cap     |
| ------- | ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------- |
| T1      | create_topdown_tileset 32 px | interior deck floor → hull wall (16 Wang tiles)                                                                                                                                                                                                                                                  | 2 calls |
| T2      | create_topdown_tileset 32 px | exterior packed snow → rock ridge (16 Wang tiles), opening plateau                                                                                                                                                                                                                               | 2 calls |
| O1      | create_1_direction_object 64 | **style-anchor batch**: check-in terminal (available 1, settled 1), plan board 1, evidence desk 1, reading desk 1, QC counter 1, wall gauge 1, filing cabinet 1, notice board 1, crate stack 1, tool cart 1, pallet jack 1, document trolley 1, cable drum 1, service lamp (standby 1, steady 1) | 2 calls |
| O2      | create_1_direction_object 32 | small props: chair, small crate, extinguisher, wall fixture (standby/steady), junction box, cable tray, bollard, debris fragment ×2, vent, pipe run, bench end, paper stack, cable coil, drum                                                                                                    | 2 calls |
| O3      | create_1_direction_object 96 | thresholds: north-wall door closed, side-wall door closed, berth airlock closed, berth airlock open                                                                                                                                                                                              | 2 calls |
| O4      | create_1_direction_object 96 | operations counter section, locker bank, dock glazing window (storm outside, shuttle nose), status back-wall service panel (standby)                                                                                                                                                             | 2 calls |
| O5      | create_1_direction_object 96 | weather cover loose, weather cover secured, service panel steady, shelving rack                                                                                                                                                                                                                  | 2 calls |
| P1      | create_image_pixen 192×96    | relief shuttle, top-down, transparent                                                                                                                                                                                                                                                            | 3 calls |
| P2      | create_image_pixen 192×128   | station module roof ×2 variants, dock module with berth sleeve                                                                                                                                                                                                                                   | 4 calls |
| P3      | create_image_pixen ≤96       | mast tower (bent), landing pad markers, snow drift, rock outcrop                                                                                                                                                                                                                                 | 4 calls |
| A1      | animate_object v3            | berth airlock open (6 frames) — static end frame kept for reduced motion                                                                                                                                                                                                                         | 2 calls |
| Reserve | —                            | documented rejections only                                                                                                                                                                                                                                                                       | 4 calls |

Maximum 31 calls. Existing characters (player, Vale, Kai, Noor) are reused.

## Capture manifest (frozen names)

`docs/verification/professional-world-v1/production/slice/1280x720/`:
`01-opening-establishing.png`, `02-opening-shuttle-approach.png`,
`03-opening-shuttle-berthed.png`, `04-dock-arrival.png`, `05-dock-checkin-range.png`,
`06-dock-checked-in.png`, `07-concourse-entry.png`, `08-concourse-vale-counter.png`,
`09-concourse-before-restoration.png`, `10-concourse-after-restoration.png`,
`11-dock-before-restoration.png`, `12-dock-after-restoration.png`, `13-station-map.png`.
`docs/verification/professional-world-v1/production/slice/1920x1080/`:
`04-dock-arrival.png`, `05-dock-checkin-range.png`, `07-concourse-entry.png`,
`08-concourse-vale-counter.png`, `09-concourse-before-restoration.png`,
`10-concourse-after-restoration.png`.
Recording: `docs/verification/professional-world-v1/production/slice/slice-gameplay-1280x720.webm`.
Motion stability: `docs/verification/professional-world-v1/production/slice/motion/` (frame pairs at both sizes).
Projection: `docs/verification/professional-world-v1/projection/world-v1-slice.json` and `.diff.json`.
Report: `docs/verification/professional-world-v1/production/SLICE-REPORT.md`.

Temporary logs, browser profiles and build output: the session scratchpad
(`%TEMP%\claude\...\scratchpad`) only.
