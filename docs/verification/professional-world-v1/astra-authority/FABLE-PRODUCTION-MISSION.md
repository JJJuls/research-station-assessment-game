# Fable production mission — Professional World V1

Copy this entire document into Fable after the owner approves the Astra direction. It authorises the bounded implementation sequence below, not new scientific decisions. Read linked artifacts first.

## Mission and exact checkpoint

Work only in C:/Users/Juls/Desktop/research-station-assessment-game/.claude/worktrees/fable-professional-world-rebuild, branch **fable-professional-world-rebuild-v1**.
Source checkpoint: **f6e051f2b74db2d62213d62ebc2848b638d72d4d**. Required ancestry:867c4d5 →148d219 →998f26a →69eb33d →f6e051f.
Production base is the **local Astra authority commit containing this mission**. Resolve its full SHA from Git at start and record it before any write; require HEAD to be exactly that commit (or an explicitly accepted correction descendant). Its subject is `docs(game): establish professional world design authority`. A document cannot embed its own future content-addressed commit SHA; the final Astra handoff supplies that SHA. Do not choose a similarly named remote branch or recreate a worktree.

Verify root/branch/ancestry/clean tracked and untracked state, active AGENTS.md/CLAUDE.md, guard appropriate to Fable, and no independent writer. A material mismatch stops work; do not stash/reset/clean/switch/repair. Preserve hooks and configuration. One main writer; specialist agents read-only in bounded reviews. No push, merge, tag, deploy, publish, PR, worktree removal, branch deletion, dependency installation or destructive cleanup.

## Frozen direction and precedence

Read:

1. docs/game/PROFESSIONAL-WORLD-DESIGN-V1.md
2. docs/game/world-v1/CAMERA-AND-SCALE-SPEC.md
3. docs/game/world-v1/ROOM-BLOCKOUTS.md and STORY-STATE-SPEC.md
4. docs/game/world-v1/INTERACTION-GRAMMAR.md and INVENTORY-ITEM-PURPOSE-AUDIT.md
5. docs/verification/professional-world-v1/astra-authority/world-layouts.json and mockups.html
6. M01-M26-SPATIAL-CROSSWALK.md and its JSON companion in that directory
7. AUDIT-AND-U1-U2-VERDICT.md, PIXELLAB-PRODUCTION-BRIEF.md and REVIEW-AND-VERIFICATION.md there.

Research-owner workbook final sheets 08–14 outrank presentation. Preserve all identities, dispositions, windows, event families, raw definitions, missing/invalid/censored states, counterbalance, canonical restrictions, scoring and transport. “Strong candidate” is not validated. M08/M11/M25 stay questionnaire-primary; M25 notice is not a belief response.

**U1/U2 verdict:** revise camera foundation and Concourse substantially; replace Dock/opening presentation; keep registry/story-state seams and hotbar suppression, revise coverage/disclosure/restoration/map. The 32×18/1.25 assumption is replaced by 40×22.5 tiles,1280×720 world plate,1× at 720 and 1.5× native 1920. Keep tile 32, current player/collider 32×42 and movement 175. Enlarge all small maps. Exact geometry is an original blockout, subject only to documented collision corrections that preserve measurement invariants; do not improvise new topology.

Do not re-extract Emberville, download commercial frames into the repository or use them as asset inputs. Use official references as principles only.

## Owner-held changes and stop boundary

Keep affected current mechanics frozen until explicit disposition:

- M05 distance/access/comprehension/motion matching; do not implement the proposed 128 px pair as an approved scientific parameter.
- M09 reading/reminder/map exposure and exit semantics; existing driver correction is separately authorised.
- M10 Laboratory/return recipient availability; retain both until ruling.
- M16 workbook novelty versus current rule-update task; shell relocation alone cannot certify alignment.
- M03 floor, M15 prediction reference, M17 criterion/attempts/stop, M18 citation, M20 partial start/resume, M21 definitions, M22/M24/M26 knowledge/closure and M25 external administration.
- Opening elapsed/caption covariates, return-map look-ahead, canonical names/scoring.

If a zone's safe visual rebuild requires an unresolved scientific change, finish its independent reviewable geometry/art work, retain the current affected module and label that portion held. Do not make the decision silently or claim the zone scientifically accepted. Continue independently safe later units where practical; before enabling a production route with altered exposure, stop for the specific owner decision. No “green by default” waiver.

## Per-unit process

At entry/exit: read-only Git status/diff, verify only declared paths changed, record base/head and protected-file hashes. Implement one unit's presentation, run focused checks, inspect actual mouse/keyboard behaviour and native captures, compare relevant event projection, review once, apply one consolidated correction. A second round is allowed only for remaining blocker/material major. No endless polish loop, no broad suite as substitute for usability. Commit only explicit paths with truthful unit subject when local commits are authorised by this production mission. Never amend.

The following is a **maximum literal source/test allowlist per unit**; shared files may change only the named zone/display functions. Omitted files are read-only. Before each first write, expand its evidence outputs to a literal manifest:
`docs/verification/professional-world-v1/production/Pnn-REPORT.md`,
`.../production/Pnn-before-projection.json`,
`.../production/Pnn-after-projection.json`,
`.../production/Pnn-projection-diff.json`,
and capture files `.../production/Pnn-{before,after}-{1280x720,1920x1080}-{entry,approach,depth,overlay}.png`.
Expand every brace to exact paths in the unit report before writing; no runtime glob staging or overwriting historical evidence. Add additional named captures only by freezing the explicit names before creation. Temporary logs/browser profiles/build output stay under an explicitly recorded TEMP directory.

## Sequence and literal source scopes

### P00 — establish reliable current baseline

Product files: none.
Writable drivers: e2e/concourse_interaction_lifecycle.spec.ts (new output parameter only); e2e/returnHelpers.ts; e2e/pilotHelpers.ts; e2e/v4_event_projection.spec.ts (output-location parameter only).
Derive all RETURN.concourse coordinates from current shared sites, including gauge/Kai/Vale. Approach the gauge through the registry point; assert its identity and exactly one station-open plus watch-check event. Do not relax comparison rules or edit product code to force green. Preserve the failed U2 projection.
Run focused Concourse lifecycle/return case and a fresh full-route projection, then compare with historical baseline and explain every remaining difference. A stale-driver correction can legitimately restore an event; it does not erase the failed historical artifact.

### P01 — camera/render and common grammar foundation

Product: src/world/viewport.ts; src/world/camera.ts; src/world/plateSampler.ts; src/world/RoomScene.ts; src/world/StationMapBuilder.ts; src/world/proceduralTilesets.ts; src/world/interactionRegistry.ts; src/constants/depth.ts; src/index.ts; src/style.css; src/pilot/ui/MissionCard.ts; src/gameplay/controlsReference.ts; src/gameplay/Npc.ts.
Tests/drivers: e2e/world_v1_camera.spec.ts; e2e/world_v1_registry.spec.ts; e2e/world_v1_scale_compare.spec.ts; e2e/world_v1_interactions.spec.ts; e2e/participant_viewport_display.spec.ts; e2e/spawn_clearance.spec.ts; e2e/helpers.ts (transform/timing only).
Keep new wider production default disabled until all active maps fill it; developer-only comparison is acceptable during migration. Native render/UI transforms must be tested together. Time-based camera, fixed field, exact pointer mapping, five states and one target; no new eligibility or task guidance. Compare stationary/slow pan at both resolutions and reduced performance. Reject blurred interiors, shimmer or device-dependent field.

A0 architecture art precedes acceptance; use original fallback blocks while measuring geometry. Do not declare final visual quality while placeholders remain.

### P02 — Dock and opening replacement

Product: src/scenes/DockScene.ts; src/world/layouts/dock.ts; src/pilot/zoneSites.ts (Dock only); src/world/interactionRegistry.ts (Dock only); src/pilot/ui/PilotOpeningScene.ts; src/pilot/storyState.ts (Dock/opening display only); src/world/kit/kitTextures.ts (Dock fallback only).
Tests/drivers: e2e/world_v1_story.spec.ts; e2e/world_v1_u2_capture.spec.ts (new output only); e2e/world_v1_interactions.spec.ts; e2e/journey.ts (Dock geometry only).
Replace presentation with 48×30 original blockout and the linked 8-frame storyboard. Exact same watch/skip state; no held-input bleed or primary events before actual opportunities. Arrival terminal, transport seal and north threshold read as one arrival. A1 Dock assets close this unit.

### P03 — Concourse, story/map

Product: src/scenes/StationConcourseScene.ts; src/world/layouts/concourse.ts; src/pilot/zoneSites.ts (Concourse); src/world/interactionRegistry.ts (Concourse); src/pilot/pilotRoute.ts (Concourse door geometry/display only); src/pilot/storyState.ts (presentation only); src/pilot/PilotZoneScene.ts (story/HUD refresh only); src/pilot/ui/StationMapScene.ts; src/world/kit/kitTextures.ts (Concourse fallback).
Tests/drivers: e2e/world_v1_interactions.spec.ts; e2e/world_v1_story.spec.ts; e2e/world_v1_story_state.spec.ts; e2e/concourse_interaction_lifecycle.spec.ts (geometry/UI assertions only); e2e/pilot_episodes_1_2.spec.ts (episode 1 coordinate/navigation adaptation only; event assertions unchanged); e2e/pilotHelpers.ts; e2e/returnHelpers.ts.
60×38 cardinal hub; operations landmark and independent districts. Preserve M09/M10 access and held M05/reminder treatment. Avoid success-labelled area restoration. A1 operations assets close this unit. Re-run actual M09 read at initial and return windows; inspect mission-card/tutorial agreement.

### P04 — Records including purposeful return

Product: src/scenes/RecordsWorkshopScene.ts; new src/world/layouts/records.ts; src/pilot/zoneSites.ts (Records); src/world/interactionRegistry.ts (Records); src/pilot/pilotRoute.ts (Records doors only); src/pilot/worldBundles.ts (visible origins/positions, existing transactions unchanged); src/world/kit/kitTextures.ts (Records fallback).
Tests/drivers: e2e/pilotHelpers.ts; e2e/returnHelpers.ts; e2e/pilot_records.spec.ts (geometry); e2e/pilot_episodes_1_2.spec.ts (episode 2 coordinate/navigation adaptation only; event assertions unchanged); e2e/m02_overlay_proof.spec.ts (participant-room navigation and screenshot-crop adaptation only; open/render/pause/close/resume and event assertions unchanged); e2e/pilot_return_capture.spec.ts; e2e/v4_visual_capture.spec.ts (geometry/new outputs); e2e/world_v1_registry.spec.ts; e2e/world_v1_interactions.spec.ts.
64×40 intake/fabrication/dispatch/reconciliation districts. M03A/B independent; M04 debris input ownership preserved; no backpack carryover into measured workspace. Return feed/manual/report remain identifiable and accessible without earlier success. A2 assets before acceptance.

### P05 — Laboratory incident shell

Product: src/scenes/DiagnosticsLaboratoryScene.ts; new src/world/layouts/laboratory.ts; src/pilot/zoneSites.ts (Lab); src/world/interactionRegistry.ts (Lab); src/pilot/pilotRoute.ts (Lab doors only); src/world/kit/kitTextures.ts (Lab fallback).
Tests/drivers: e2e/pilotHelpers.ts; e2e/ipHelpers.ts (world approaches only); e2e/pilot_lab.spec.ts (geometry); e2e/pilot_signal_capture.spec.ts; e2e/world_v1_registry.spec.ts; e2e/world_v1_interactions.spec.ts.
68×42 with four functional districts. Preserve exact phase order, full external sources and independent cases; no four numbered/pulsing panels. Retain M16 current module under owner hold; do not edit task model. A3 assets before acceptance.

### P06 — Exterior Recovery Yard

Product: src/scenes/ExteriorRecoveryYardScene.ts; new src/world/layouts/yard.ts; src/pilot/zoneSites.ts (Yard); src/world/interactionRegistry.ts (Yard); src/pilot/pilotRoute.ts (Yard doors only); src/world/kit/kitTextures.ts (Yard fallback).
Tests/drivers: e2e/exteriorHelpers.ts; e2e/pilotHelpers.ts; e2e/pilot_yard.spec.ts (geometry); e2e/pilot_exterior_capture.spec.ts; e2e/world_v1_registry.spec.ts; e2e/world_v1_interactions.spec.ts.
80×48 safe apron and separated compounds. Preserve M23 absolute plot/targets/ranges/coordinate meaning, M24 finite deck and exact operating pad/tray/alternative relationships, M26 relative compound and post-knowledge retries. Turn and Thaw remain coupling commands; rack decorative. Alternative use and ordinary airlock departure do not close M24/M26. A4 assets before acceptance; M05 matched exposure remains held.

### P07 — Utility

Product: src/scenes/UtilityCoreDeckScene.ts; new src/world/layouts/utility.ts; src/pilot/zoneSites.ts (Deck); src/world/interactionRegistry.ts (Deck); src/pilot/pilotRoute.ts (Deck doors only); src/world/kit/kitTextures.ts (Deck fallback).
Tests/drivers: e2e/closureHelpers.ts; e2e/pilotHelpers.ts; e2e/pilot_deck.spec.ts (geometry); e2e/pilot_closure_capture.spec.ts; e2e/world_v1_registry.spec.ts; e2e/world_v1_interactions.spec.ts.
58×36 record closure plus three fixed service bays. No new primary, no success-dependent feed difficulty, no readout walls. A5 Utility assets.

### P08 — Core

Product: src/scenes/CoreChamberScene.ts; new src/world/layouts/core.ts; src/pilot/zoneSites.ts (Core); src/world/interactionRegistry.ts (Core); src/pilot/pilotRoute.ts (Core doors only); src/world/kit/kitTextures.ts (Core fallback).
Tests/drivers: e2e/closureHelpers.ts; e2e/pilotHelpers.ts; e2e/pilot_closure_capture.spec.ts; e2e/v4_core_dev_capture.spec.ts; e2e/pilot_closure.spec.ts (Core display assertions only, lifecycle/measurement assertions unchanged); e2e/world_v1_registry.spec.ts; e2e/world_v1_interactions.spec.ts.
44×28, restrained assembly/observation/confirmation; quiet handoff. In CoreChamberScene.reviewModel remove participant-facing recorded/not-observed/limited-evidence counts and logging bookkeeping; show operational feeds/readiness and the same controls. Preserve all readiness data, lifecycle bindings and export semantics. A5 Core assets. Now enable wider default only after all seven entry/edge views fill the world and route is accessible.

### P09 — inventory/HUD consistency

Product: new src/inventory/itemPurpose.ts (display metadata only); src/inventory/ui/InventoryOverlayScene.ts; src/inventory/ui/HotbarHud.ts; src/inventory/ui/theme.ts; src/gameplay/InventoryHud.ts; src/pilot/ui/MissionCard.ts; src/gameplay/controlsReference.ts; src/pilot/worldBundles.ts (labels/origins only).
Tests/drivers: new e2e/world_v1_inventory_purpose.spec.ts; e2e/inventory_visual_capture.spec.ts; e2e/participant_ui_cards.spec.ts (display assertions).
Empty arrival, truthful source/use/destination, current tool eligibility, no arbitrary starting parts. Preserve transaction semantics, namespaces and current transfer controls; no new no-discard restrictions. Verify actual mouse and keyboard operations. Do not open task overlay/model files for gratuitous restyling.

### P10 — integration, full route and scientific/data regression

Product files: none.
Writable test/output annotations only: e2e/pilot_full_route_timing.spec.ts; e2e/v4_visual_capture.spec.ts; e2e/v4_event_projection.spec.ts.
If a defect needs product correction, reopen its owning unit with literal file/function scope; do not use P10 as a broad source-write allowance. Full route, outcome-independent access, all 26 opportunities/dispositions, both resolutions, keyboard and mouse, reduced motion, reload/technical interruption and final handoff. Before/after projections against P00; classify every difference rather than force equality through comparator edits.

## Asset integration source scope

Only during its named batch: new src/world/kit/worldV1Assets.ts; src/scenes/Boot.ts; src/constants/assets.ts (asset map/version only), plus that zone's scene and src/world/StationMapBuilder.ts/src/world/proceduralTilesets.ts for A0. The 18 literal atlas/manifest paths in PIXELLAB-PRODUCTION-BRIEF.md are the only proposed asset outputs. Freeze their expanded manifest before first generation/write. No wholesale writes to pixellab-runtime. Existing characters remain unchanged. PixelLab requires the owner's explicit specific-batch approval; no call during Astra.

## Protected files and semantics

All scientific authority documents/workbook, event schema/scoring plan and existing research exports are read-only. No writes to src/systems, src/measurement, src/pilot/windows, src/pilot/exterior, src/pilot/return, src/pilot/closure, src/fieldActions or scientific models under src/informationProcessing. No changes to src/pilot/evidenceLedger.ts, coverageSchedule.ts, pilotCoverage.ts; src/inventory/engine.ts, store.ts, model.ts, telemetry.ts, m02Filing.ts, m03Reset.ts; src/world/CanonicalEventContext.ts; src/sprites/Player.ts physics/timing; e2e/v4Projection.ts or historical baselines.

Task overlays (WorkSurfaceScene, FeedPanelScene, SignalTerminalScene, PipeBoardScene, DiagnosisConsoleScene and their surface models) remain read-only initially. A demonstrated readability defect requires a separate exact display-function scope and review of source visibility/guidance. Scene files can contain measurement bindings: permission to edit their presentation is not permission to change those bindings.

## Focused verification matrix

- P00/P03: pilot_episodes_1_2 episode 1, concourse_interaction_lifecycle, pilot_return targeted watch, world_v1_interactions, world_v1_story_state, pilot_route_model.
- P01/P02: world_v1_camera, participant_viewport_display, spawn_clearance, dock_tutorial_paths, movement_and_first_interaction; watch versus skip state comparison.
- P04/P09: pilot_episodes_1_2 episode 2, pilot_records, pilot_return, pilot_return_models, inventory_measurement_isolation, m02_overlay_proof, physical_organisation, inventory_foundation.
- P05: pilot_signal_incident, signal_incident_models, ip_boundaries, ip_lab_flow, ip_pipe_suite.
- P06: pilot_exterior_models, pilot_exterior_isolation, field_actions_measurement, persistence_physical.
- P07/P08: pilot_closure_models, pilot_closure, pilot_coverage, participant_completion_handoff.
- P10: state_session_continuity, adversarial_reload_partial_state, event_store, research_export_test_mode, participant_completion_handoff, launch_with_research_params, projection comparison and full participant route.

These names refer to existing e2e/\*.spec.ts files unless explicitly new above. Passing model tests does not establish visible usability. For every moved station, approach with real arrow controls, inspect exact prompt, activate E/Space, then exercise visible mouse and keyboard surface controls. Capture and inspect both 1280×720 and 1920×1080; include front/behind tall objects, door/spawn, inactive and completed states, and overlay close. No debug state injection in participant-route evidence.

Run installed typecheck and scoped ESLint. Build with installed Vite CLI into a **new explicit TEMP output directory**, --emptyOutDir false, because npm run build currently invokes destructive dist cleanup; do not alter package scripts. Tests use verified dedicated local port, --retries=0 --workers=1 and explicit viewport parameters. Parameterise hard-coded historical capture/projection output paths before running; never overwrite U0/U1/U2 evidence.

Supabase/Qualtrics regressions preserve current behaviour, including permanent export failure proceeding with export_status=failed while retaining the buffer. A live roundtrip is allowed only against an already available isolated loopback stack with existing credentials; otherwise mark unperformed, do not install/start a remote stack or expose keys. Test-mode transport and launch/handoff regressions still run. No real participant data or remote writes.

## Acceptance and final report

Use measurable criteria in the authority document. Human pilot remains required for orientation/discovery/burden/equivalence; automated wall time is not human timing. Keep travel separate from construct-relevant action. Review specialists must inspect actual captures and projections, not only prose. Severity BLOCKER/MAJOR/MINOR/RESEARCH-OWNER DECISION/ACCEPTED LIMITATION; one consolidated correction round, second only for material unresolved findings.

Stop on protected-file change, unexpected writer, unapproved scientific dependency, altered window/raw definition, lost later opportunity, ambiguous projection difference, inaccessible required route, failed same-state opening, unreviewed asset or pixel-rendering failure. Do not bypass hooks or solve failures by weaker assertions.

Report exact branch/base/HEAD, per-unit files/commits, before/after captures at both sizes, actual mouse/keyboard outcomes, projection diffs and classifications, all owner holds, asset provenance/approvals, remaining human/hardware/data-test limitations and final clean status. Explicit-path staging only; git diff --check and allowlist verification before each commit. No push/merge/tag/deploy/PR/destructive cleanup.

Every Playwright invocation must use a new explicit TEMP --output directory because the runner manages prior output. Before first P00 lifecycle run, parameterise its hardcoded screenshots-concourse-hotfix output into the new run directory. Before first inventory_visual_capture or pilot_exterior_capture run, likewise parameterise their historical defaults. This is output-only adaptation; never weaken assertions.
