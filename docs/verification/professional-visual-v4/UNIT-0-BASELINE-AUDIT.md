# Professional Visual Validity & World Redesign V4 — Unit 0 baseline and audit

Branch `fable-visual-validity-redesign-v1`; base `aaa73fd9041e561fb250d13021537aaf66e46d46`
(`fable-professional-pilot-v3-v1`, Unit 7 of the V3 pilot). Preflight at
Unit 0 start: branch exact, base is an ancestor of HEAD, tree clean,
`CLAUDE.md` / settings / guard / skills / operating-mode present,
`npm.cmd run lint:tsc` and `npm.cmd run build` green on the untouched tree,
no dev server, Playwright, monitor or loop running against this worktree.

This document is the Unit 0 deliverable: the untouched baseline evidence,
the visual-confound audit, the asset compatibility audit, the selected
render/camera scale, and the scientific projection baseline. The visual
grammar, depth policy and room blockouts live in
`docs/game/VISUAL-SYSTEM-V4.md`.

## 0. Untouched baseline evidence

Captured with `e2e/v4_visual_capture.spec.ts` (the V3 capture route, real
input, no state injection) on the untouched tree:

| Set                           | Directory                                                              | Frames |
| ----------------------------- | ---------------------------------------------------------------------- | ------ |
| 800×600 browser viewport      | `docs/verification/professional-visual-v4/baseline-800x600/`           | 30     |
| 1280×720 browser viewport     | `docs/verification/professional-visual-v4/baseline-1280x720/`          | 30     |
| Scientific projection (route) | `docs/verification/professional-visual-v4/projection/baseline-v3.json` | —      |

Historical evidence (`docs/verification/screenshots-professional-pilot/`,
`screenshots-evidence-led-pilot-v2/`, …) is untouched; the V4 capture spec
writes only to `V4_OUT`.

## 1. Visual-confound audit (evidence: baseline frames + code)

Each row is a presentation property that can add construct-irrelevant
variance (visual search, working-memory load, accidental interaction,
unequal exposure). "Fix" names the V4 unit that removes it.

| #   | Confound                                                                                             | Evidence                                                                                                           | Mechanism of variance                                   | Fix    |
| --- | ---------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------- | ------ |
| C1  | Whole room compressed into one 800×600 screen; player ≈48 px, props ≈32–64 px                        | every world frame; rooms 800×608 vs 800×600 viewport (`RoomScene.ts:535`, grids 25×19)                             | visual search over the full room at once; small targets | U1     |
| C2  | ~60 permanent world labels (zone signage) + status strips + readout chips                            | `05-concourse-overview` (9 labels), `19-yard-overview` (12), `27-deck-overview` (11); `PilotZoneScene.zoneSignage` | reading load; labels compete with the objective         | U2–U6  |
| C3  | Equal salience of every station and door (all carry the cyan cue at once)                            | `12-laboratory-overview`: four bays with identical cyan markers; `27-deck-overview`                                | no visual priority; working memory decides the order    | U3–U5  |
| C4  | Ambient snowfall (tween flakes + 6 looping `plv1-fx-snowfall` sprites) near timed tasks              | `19-yard-overview`, `25-rig-timing-window`; `ExteriorRecoveryYardScene.ts:531, 1876`                               | motion near the magnet timing window and scan/dig       | U4     |
| C5  | Permanent "Move here" marker pulse after arrival; pad beacons breathing                              | `02-dock-arrival`; `DockScene.ts:190–209`                                                                          | attention capture after the tutorial                    | U1     |
| C6  | Empty ten-slot hotbar in every room                                                                  | every world frame, bottom-left                                                                                     | irrelevant UI; suggests missing content                 | U6     |
| C7  | Objective line not refreshed on overlay RESUME in the Dock and legacy rooms                          | `DockScene.ts:242` (RESUME → `resetKeys` only); comment at `RoomScene.ts:771`                                      | stale instruction after an overlay                      | U1/U6  |
| C8  | Player under machinery / inconsistent depth vocabulary (literals 0.4–3, 20)                          | `UtilityCoreDeckScene`, `CoreChamberScene`, `ExteriorRecoveryYardScene` literal depths; rig compound               | figure occluded; targets misread as background          | U1, U4 |
| C9  | Mixed scales: 96×96 promoted stills vs 40×56 / 64×64 procedural NPC fallbacks; off-grid prop crops   | asset inventory (§2)                                                                                               | inconsistent size cues; landmark ambiguity              | U2–U6  |
| C10 | Low-fidelity opening drawn from rectangles, flicker + streak loops                                   | `01-opening-arrival`; `PilotOpeningScene.ts`                                                                       | first impression of a debug build; motion               | U1     |
| C11 | Large purposeless floor (Dock, Concourse quadrants, Lab south)                                       | `02`, `05`, `12`                                                                                                   | unclear path; wandering time varies                     | U1–U3  |
| C12 | Door presentation varies (arch leaf, airlock strip, dock airlock prop, marker)                       | `05` vs `19` vs `02`                                                                                               | exit recognition                                        | U1/U6  |
| C13 | 4:3 canvas at 16:9 browsers exposes the same room at a different on-screen size; no letterbox policy | `participant_viewport_display.spec.ts` asserts 4:3                                                                 | exposure equal but legibility differs                   | U1     |
| C14 | Prompt/dialogue text 11–15 px at 800×600 (≈11–15 CSS px)                                             | `RoomScene.ts:557, 573, 1139`; `controlsReference.ts` 11 px                                                        | reading effort                                          | U1/U6  |
| C15 | Decorative NPC bob, LED blink, worker sway loops always on                                           | `Npc.ts:53`, `HubScene.ts:361`, `AmbientWorker.ts`                                                                 | motion unrelated to state                               | U6     |

Not confounds (kept as-is): the single guidance pulse on the nearest
eligible target (uniform, state-driven); contextual name chips; the zone
title card (bounded, hold under reduced motion); one-shot action
animations tied to C/D/F.

## 2. Asset compatibility audit (integration only)

Full inventory in the subagent report summarised here; source of truth for
provenance remains `docs/game/PIXELLAB-RUNTIME-ASSET-PROVENANCE.md` and
`docs/game/PILOT-ASSET-SELECTION-AND-PROVENANCE.md` (every `plv1-*`
promotion is PROVISIONAL MODEL-SELECTED — NOT HUMAN-APPROVED).

| Family                                                                                                                                                  | Resolution / projection                    | Verdict for V4                                                                                              |
| ------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------ | ----------------------------------------------------------------------------------------------------------- |
| Player `plv1-player-a` (S/W/E/N rotations, walk 8, idle 4)                                                                                              | 96×96 frames, figure ≈32×48, straight-on   | **use** (unchanged; 2× camera makes the figure ≈96 canvas px)                                               |
| Player action sheets scan/dig/pickup; effects dig-dust/scan-pulse/sparks                                                                                | 96×96 / 64×64, one-shot                    | **use** (state-driven only)                                                                                 |
| NPC stills Vale/Kai/Noor (`plv1-*`)                                                                                                                     | 96×96, same register as the player         | **use**; procedural fallbacks stay as fallbacks only                                                        |
| Robots bot-standby/working                                                                                                                              | 96×96                                      | **use** (deck state art)                                                                                    |
| Arch door / vent / grille / pipes                                                                                                                       | 66×74 / 66×68 off-grid crops               | **use on whole-tile anchors**; door leaf is the one interior door family                                    |
| Core column / pillars / console; utility desk / panel / tower                                                                                           | 56×132, 32×80, 56×72, 144×56, 64×92, 64×80 | **use** as landmarks (layer 4, foot-line depth); never scaled                                               |
| Sequences core-sync / airlock-open / antenna-signal                                                                                                     | 64×96, 96×64, 64×96 strips                 | **use** (state-driven; held frame under reduced motion)                                                     |
| `plv1-fx-snowfall`                                                                                                                                      | 96×96 ×9 loop                              | **reject** (ambient motion, mission §14)                                                                    |
| `prop-*` Phase F props (dock terminal/airlock/crates, hub board/console/doors, archive)                                                                 | 32/48/64 on-grid                           | **use**                                                                                                     |
| Wang tilesets interior-v3 / dock-v3 + procedural theme tilesets                                                                                         | 32 px, 16-tile Wang                        | **use**; exterior decal density reduced                                                                     |
| `proc-*` foundry (128 textures)                                                                                                                         | 24×24 icons … 112×136 core vessel          | **use** where in register; the 40×56 / 64×64 NPC fallbacks are not placed beside 96×96 stills               |
| Diagonal player frames (52), `*-work-a` NPC stills, `style-anchor-v1`, tuxemon prototype set                                                            | —                                          | **not used** (movement is 4-directional; duplicates; legacy)                                                |
| Non-integer `setScale` sites (`DiagnosisConsoleScene:466` 0.85, `PipeBoardScene` 1.5/1.3, `physical.ts:321` 0.8, `DiagnosticsLaboratoryScene:580` 1.25) | overlay/task surfaces                      | **left unchanged** (task-surface geometry is frozen); world lamp at 1.25 replaced by an unscaled prop in U3 |

No PixelLab or other generation is planned; no blocking asset gap was found.

## 3. Selected render / camera scale

Canvas 1280×720 (16:9), FIT + letterbox; world camera zoom 2 → 640×360
world viewport (20×11.25 tiles); HUD and overlays keep their 800×600
design space through a zoom-1.2 centred camera. Full reasoning, the
both-resolution table and the coordinate spaces: `VISUAL-SYSTEM-V4.md` §1.

## 4. Scientific projection baseline

`e2e/v4_event_projection.spec.ts` drives the complete participant route
(the `pilot_full_route_timing` driver: offers accepted, calibration
started, partial antenna start, record closure, three feeds, Core
confirmation) and writes
`docs/verification/professional-visual-v4/projection/baseline-v3.json`
with: final route stage, zone sequence, scene sequence, event-type
sequence, event counts, payload **key** sets per event type, window ids,
opportunity ids and their validity/disposition records (time-like fields
dropped), form/counterbalance assignments, the coverage summary and the
route summary. Later runs pass `V4_PROJECTION_BASELINE=<that file>` and
fail on any field difference; the diff is written beside the run's
projection.

## 5. Unit contracts (operating-mode §2 fields, per mission §20)

Common fields for every unit: **scientific rationale** — scientifically
neutral presentation/spatial work under the §6 freeze; **participant-facing
behaviour** — see the room briefs (mission §17) and `VISUAL-SYSTEM-V4.md`;
**telemetry boundary** — no new canonical event, no new derived variable, no
payload change (existing `pilot_*` route telemetry unchanged); **scientific
acceptance** — projection comparison zero-diff or every deviation
explained; **failure/recovery** — unchanged task engines; **stop
conditions** — mission §0 list; **model** — Fable implements, Opus reviews
read-only, Sonnet for test review; **entry state** — this branch, clean
tree, previous unit's commit.

| Unit | Objective                                                                                                         | Allowed files (maximum)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     | Required tests / evidence                                                                                                                                                                | Commit                                                     |
| ---- | ----------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------- |
| 0    | baseline, audits, visual system, projection baseline                                                              | `docs/game/VISUAL-SYSTEM-V4.md`, `docs/verification/professional-visual-v4/**`, `e2e/v4_visual_capture.spec.ts`, `e2e/v4_event_projection.spec.ts`, `e2e/v4Projection.ts`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   | capture ×2 resolutions, projection baseline, scoped lint                                                                                                                                 | `docs(game): define professional visual redesign baseline` |
| 1    | fixed viewport, following camera, HUD camera, depth constants, door language, arrival, Dock                       | `src/index.ts`, `src/constants/depth.ts`, `src/world/RoomScene.ts`, `src/world/StationMapBuilder.ts`, `src/world/viewport.ts` (new), `src/pilot/PilotZoneScene.ts`, `src/pilot/ui/*.ts`, `src/inventory/ui/InventoryOverlayScene.ts`, `src/inventory/ui/openOverlay.ts`, `src/informationProcessing/ui/*Scene.ts`, `src/scenes/Menu.tsx`, `src/scenes/DockScene.ts`, `src/sprites/Player.ts`, `src/gameplay/physical.ts`, `src/gameplay/effects.ts`, `e2e/helpers.ts`, `e2e/ipHelpers.ts`, `e2e/returnHelpers.ts`, `e2e/closureHelpers.ts`, `e2e/participant_viewport_display.spec.ts`, `e2e/v4_camera.spec.ts` (new), `docs/game/rooms/00-dock-arrival.md`, this directory | tsc, build, scoped lint, `v4_camera`, `participant_viewport_display`, `dock_tutorial_paths`, `movement_and_first_interaction`, `spawn_clearance`, `pilot_route`, capture Dock/arrival ×2 | `feat(game): establish professional camera and arrival`    |
| 2    | Concourse hub + Records Workshop zones                                                                            | `src/scenes/StationConcourseScene.ts`, `src/scenes/RecordsWorkshopScene.ts`, `src/pilot/zoneSites.ts` (only if a coordinate must move — none planned), room docs, e2e coordinate books touched by any moved lane, this directory                                                                                                                                                                                                                                                                                                                                                                                                                                            | `pilot_route`, `pilot_records`, `pilot_return`, `concourse_interaction_lifecycle`, `m02_overlay_proof`, projection compare, captures                                                     | `refactor(game): clarify concourse and records workshop`   |
| 3    | Diagnostics Laboratory                                                                                            | `src/scenes/DiagnosticsLaboratoryScene.ts`, room doc, e2e lanes, this directory                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             | `pilot_lab`, `ip_lab_flow`, `pilot_signal_capture` (V4 dir), projection compare                                                                                                          | `refactor(game): focus diagnostics assessment sequence`    |
| 4    | Exterior Recovery Yard                                                                                            | `src/scenes/ExteriorRecoveryYardScene.ts`, `src/gameplay/effects.ts`, `src/pilot/yardJobs.ts` (presentation strings only if any), room doc, e2e lanes, this directory                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       | `pilot_exterior_isolation`, `pilot_exterior_models`, `field_route`, `magnet_salvage_ip`, projection compare                                                                              | `refactor(game): structure exterior recovery yard`         |
| 5    | Utility & Core Deck + Core Chamber                                                                                | `src/scenes/UtilityCoreDeckScene.ts`, `src/scenes/CoreChamberScene.ts`, room docs, e2e lanes, this directory                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                | `pilot_deck`, `pilot_closure`, `pilot_closure_models`, `spawn_clearance`, projection compare                                                                                             | `refactor(game): refine utility and core closure`          |
| 6    | cross-world presentation (HUD lifecycle, prompts, hotbar, map, help, doors, lighting, reduced motion, provenance) | `src/world/RoomScene.ts`, `src/pilot/PilotZoneScene.ts`, `src/pilot/ui/StationMapScene.ts`, `src/gameplay/InventoryHud.ts`, `src/gameplay/controlsReference.ts`, `src/gameplay/Npc.ts`, `src/gameplay/AmbientWorker.ts`, `src/constants/assets.ts`, `docs/game/PIXELLAB-RUNTIME-ASSET-PROVENANCE.md`, `docs/game/VISUAL-SYSTEM-V4.md`, e2e HUD specs, this directory                                                                                                                                                                                                                                                                                                        | `presentation_integration`, `participant_ui_cards`, `pilot_route`, `v4_camera`, projection compare, captures                                                                             | `chore(game): unify assessment presentation`               |
| 7    | final verification and report                                                                                     | `docs/verification/PROFESSIONAL-VISUAL-VALIDITY-REDESIGN-V4-REPORT.md`, this directory, e2e test-only corrections                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           | full manifest in documented chunks at `--retries=0 --workers=1`, both-resolution capture set, keyboard + pointer routes, projection compare                                              | `docs(verification): verify professional visual redesign`  |

Prohibited in every unit: questionnaire/workbook/ledger content,
`src/measurement/**`, `src/systems/**` (EventLogger, EventStore,
ScoringManager, SessionState, QualtricsBridge, ResearchRuntime,
ResearchExportClient), `src/pilot/evidenceLedger.ts`,
`src/pilot/coverageSchedule.ts`, `src/pilot/windows/**`,
`src/pilot/exterior/**`, `src/pilot/return/**`, `src/pilot/closure/**`,
`src/fieldActions/**` (mechanics), `src/informationProcessing/**` except
the camera fit call in the three overlay scenes, `package*.json`,
`supabase/**`, any research-owner document.

## 6. Time box

Inspection and baseline: started 06:59, implementation planned from
≈08:00 local (the two capture runs and the projection run are the long
poles and run unattended, one Playwright job at a time on port 5361).
