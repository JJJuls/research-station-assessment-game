# Professional World, Story, Interaction and Visual Rebuild V1 — report

Status: **IN PROGRESS** — kept current at every unit boundary. This report
never claims psychometric validation: every behavioural measure in the pilot
remains a provisional analogue pending empirical validation against its
source instrument, and nothing here promotes a provisional event, computes a
trait or classification, or resolves a research-owner decision.

Design authority: `docs/game/PROFESSIONAL-WORLD-DESIGN-V1.md` and
`docs/game/world-v1/*`. Per-unit notes: `docs/verification/professional-world-v1/`.

## 1. Branch, base, HEAD

- Branch `fable-professional-world-rebuild-v1`, worktree
  `.claude/worktrees/fable-professional-world-rebuild`, base
  `867c4d5` (`docs(verification): record return capture and final projection`
  — the V4 checkpoint after Unit 6 on `fable-visual-validity-redesign-v1`,
  which descends from the V3 pilot `aaa73fd` and carries V4 Units 0–6).
- Preflight (2026-09-05): branch exact, HEAD `867c4d5`, `git status
--porcelain` empty, no tracked change, no other worktree touched.
- HEAD at each checkpoint: see the unit table.

## 2. Commits by unit

| Unit | Commit        | Subject                                                              | State                                                                                  |
| ---- | ------------- | -------------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| U0   | `148d219`     | docs(game): define professional world rebuild baseline               | done                                                                                   |
| U1   | `998f26a`     | feat(game): establish professional camera and station vertical slice | done with open items — see `professional-world-v1/U1-CAMERA-AND-VERTICAL-SLICE.md` §5b |
| U1c  | `69eb33d`     | test(game): close the U1 interaction gate on the Dock and Concourse  | done — the interaction gate closed (U1 note §5c): driver root cause, door round trips  |
| U2   | (this commit) | feat(game): rebuild opening, story spine and mission card            | see `professional-world-v1/U2-STORY-OPENING-GUIDANCE.md`                               |
| U3   | —             | feat(game): rebuild records workshop and inventory presentation      | not started                                                                            |
| U4   | —             | feat(game): rebuild diagnostics laboratory                           | not started                                                                            |
| U5   | —             | feat(game): rebuild exterior recovery yard                           | not started                                                                            |
| U6   | —             | feat(game): rebuild utility deck and core closure                    | not started                                                                            |
| U7   | —             | test(game): verify integration and data paths after rebuild          | not started                                                                            |
| U8   | —             | docs(verification): verify professional world rebuild                | not started                                                                            |

## 3. Changed files

U0: `docs/game/PROFESSIONAL-WORLD-DESIGN-V1.md`, `docs/game/world-v1/`
(`STORY-STATE-SPEC.md`, `CAMERA-AND-SCALE-SPEC.md`, `INTERACTION-GRAMMAR.md`,
`ROOM-BLOCKOUTS.md`, `INVENTORY-ITEM-PURPOSE-AUDIT.md`,
`INTERACTION-AFFORDANCE-AUDIT.md`, `ASSET-PROVENANCE-REGISTER.md`,
`current-object-inventory.json`), this report,
`docs/verification/professional-world-v1/U0-BASELINE.md`,
`docs/verification/professional-world-v1/before-1280x720/*.png` (30),
`docs/verification/professional-world-v1/before-800x600/*.png` (30),
`docs/verification/professional-visual-v4/projection/world-v1-before.json`
(+ `.diff.json`). No source file changed in U0.

U1c (`69eb33d`, the U1 interaction-gate closure): `e2e/helpers.ts`, `e2e/pilotHelpers.ts`, `e2e/pilot_route_model.spec.ts`, `e2e/world_v1_interactions.spec.ts`, the U1 note §5c, `unit1/closure/*.png`, the regenerated `unit1/dock-arrival-*.png`.

U2: source `src/pilot/{storyState,PilotZoneScene,zoneSites}.ts`, `src/pilot/ui/{MissionCard,PilotOpeningScene,StationMapScene}.ts`, `src/world/RoomScene.ts`, `src/world/kit/kitTextures.ts`, `src/world/layouts/dock.ts`, `src/scenes/{DockScene,StationConcourseScene,ExteriorRecoveryYardScene,UtilityCoreDeckScene,CoreChamberScene}.ts`; e2e `world_v1_story_state`, `world_v1_story`, `world_v1_u2_capture` (new), `pilot_episodes_1_2`, `helpers`, `pilotHelpers`; docs: rooms 00 and 15, `world-v1/{STORY-STATE-SPEC,ROOM-BLOCKOUTS}.md`, the U2 note, `unit2/{800x600,1280x720}/*.png` (10 each), this report. Allowlist amendments: U2 note §7.

U1: see the U1 note §1 and §6 (source: `src/world/{viewport,camera,plateSampler,interactionRegistry,RoomScene}.ts`, `src/world/kit/kitTextures.ts`, `src/world/layouts/{grid,dock,concourse}.ts`, `src/constants/depth.ts`, `src/sprites/Player.ts`, `src/gameplay/{Npc,InventoryHud,physical}.ts`, `src/pilot/{PilotZoneScene,pilotRoute,zoneSites,worldBundles}.ts`, `src/scenes/{DockScene,StationConcourseScene}.ts`; e2e: `helpers`-adjacent `pilotHelpers`, `journey`, `pilot_route`, `pilot_episodes_1_2`, `pilot_deck`, `v4_visual_capture`, new `world_v1_*` specs, `v4_camera` removed; docs: rooms 00 and 15, the camera spec §7, the U1 note).

## 4. Preserved versus rebuilt

See the design authority §2. Restated per unit as work lands.

## 5. Story route

See `docs/game/world-v1/STORY-STATE-SPEC.md`: **eight acts** (U2 amendment)
over the unchanged fifteen route stages, one purposeful return. Implemented
in U2 as the pure `src/pilot/storyState.ts` (act titles, one ≤ 44-character
next action per stage × zone, restoration states from stage or terminal
disposition, map marks, return path, NPC posts, opening captions). The
opening is a top-down exterior shot through the world plate (15.4 s, wall-
clock driven, skippable; skip ≡ complete); the mission card is a two-line
canvas-corner card; the map shows true topology with "work done" marks.

## 6. Camera and room-scale decisions

`docs/game/world-v1/CAMERA-AND-SCALE-SPEC.md` §7: scale B (1.25) selected on the six comparison frames; Dock 36×24 and Concourse 40×26 built to the blockouts.

## 7. Inventory disposition table

See `docs/game/world-v1/INVENTORY-ITEM-PURPOSE-AUDIT.md`.

## 8. Interaction-registry results

U1: 13 registry objects (Dock 3, Concourse 10); pure spec 11/11 (reachability from every spawn, door clearance, class/prompt grammar, walking budget); runtime prompts asserted for every object — see the U1 note §3–§5.

U1 closure (`69eb33d`): the interaction gate closed at runtime — every object prompts at its approach point, prompts only in range, decor silent, every Dock/Concourse door traversable both ways, one press = one interaction, surfaces pause/release (U1 note §5c). The "29 px overshoot" was the test driver (late key-up processing at ≈ 11 fps), fixed on the driver layer only.

U2: the Dock terminal moved to the marker's row (registry approach derived); pure spec 26/26 with the new geometry; the Dock's guidance target is sequential (marker → terminal → exit).

## 9. M01–M26 scientific invariants

Workbook `docs/verification/input/Remote_Outpost_M01-M26_Scientific_Decision_v2.xlsx`
md5 `1535682ab88481815bbdda1206644d4c` equals the md5 recorded by the derived
ledger, so the ledger is a faithful derivation and no conflict exists at
the base. Projection comparisons per unit are tabled in §10.

## 10. Tests and captures

| Unit | Command                                                                                                                                                                                                                       | Result                                                                                                                                                                                                                                    |
| ---- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| U0   | `PW_DEV_PORT=5364 V4_OUT=…/before-1280x720 V4_VIEWPORT=1280x720 npx playwright test e2e/v4_visual_capture.spec.ts --retries=0 --workers=1`                                                                                    | 3/3 passed (8.4 min)                                                                                                                                                                                                                      |
| U0   | same at `800x600`                                                                                                                                                                                                             | see `U0-BASELINE.md`                                                                                                                                                                                                                      |
| U1c  | `PW_DEV_PORT=5372 npx playwright test e2e/world_v1_interactions.spec.ts e2e/world_v1_camera.spec.ts … --retries=0 --workers=1` (six closure runs)                                                                             | U1 note §5c: interactions 3/3, camera 3/3, legacy Dock 3/3, pure 16/16                                                                                                                                                                    |
| U2   | pure `world_v1_registry` + `world_v1_story_state` + `pilot_route_model` + `spawn_clearance`                                                                                                                                   | 26/26                                                                                                                                                                                                                                     |
| U2   | `world_v1_story`, `world_v1_interactions`, `world_v1_camera`, `dock_tutorial_paths`, `movement_and_first_interaction`; `world_v1_u2_capture` at 800×600 and 1280×720; `pilot_route` topology + `pilot_episodes_1_2` episode 1 | U2 note §3 (runs 1–3)                                                                                                                                                                                                                     |
| U2   | projection `world-v1-u2` vs `world-v1-before`                                                                                                                                                                                 | RECORDED, not green: the driven route now completes end to end (the U1 Laboratory driver failure is closed); 5 differences from one missed Concourse gauge read (M09 check 1) — driver vs defect unproven, first task of U3 (U2 note §3b) |
| U0   | `V4_LABEL=world-v1-before V4_PROJECTION_BASELINE=…/projection/baseline-v3.json npx playwright test e2e/v4_event_projection.spec.ts --retries=0 --workers=1`                                                                   | see `U0-BASELINE.md`                                                                                                                                                                                                                      |

## 11. Supabase / Qualtrics results

U7.

## 12. Reviewer findings and corrections

Per unit, from U1. U2: four read-only reviews (scientific, gameplay +
burden, visual, test) and one consolidated correction round — U2 note §4:
fixed S2 (M05 nook pool removed), G1 (one Dock cue at a time), G2 (Yard
card line), G4/V9/V8 (map wording, tag size, backdrop), G8 (Vale's opener),
V1 (shuttle legibility), V2 (airlock frame semantics), V5 (terminal state
after check-in); recorded G3/G5/G6/G7, V3/V4/V7, S4/S6/S7; routed S3 →
OD-W1-5, S5 → OD-W1-6.

## 13. Human timing

No human timing pilot has been run in this mission. Every burden figure is
a design estimate or automated wall time; the route-walking budget is a
pure computation over the blockouts (`world_v1_route_budget.spec.ts`, U1).

## 14. Open research-owner decisions

From the U1 scientific review (none resolved here):

- **OD-W1-1 (M05 occasion matching).** The Concourse rebuild moved M05
  occasion 1 (reading-desk lamp) to the north-west nook of a 40×26 hub;
  the ledger's "fixed distance/access" gate and the o1/o2 matching need
  the owner to confirm the new distance or set a matched value for the
  yard occasion in U5.
- **OD-W1-2 (M09 gauge readout).** The permanent gauge ribbon is gone; a
  reading now requires the logged read (E). Base rates may differ from
  the V3/V4 baseline; the owner confirms comparability.
- **OD-W1-3 (guidance strength vs reminder-exposure control).** The
  guidance pool/lamp is stronger than the V4 arrow; map-open rates
  (`reminder_exposure`) may shift. Monitor in the pilot.

- **OD-W1-4 (Kai's return-leg location, U2).** The story draft removed Kai
  from the Laboratory at `return_hub`; the Laboratory Kai is an authorised
  M10 handover recipient there, so presentation kept him (multiple presence
  from `return_hub`). Owner: keep the Laboratory recipient on the return
  leg, or make the Concourse post the sole recipient?
- **OD-W1-5 (opening exposure covariate, U2).** Should
  `pilot_opening_skipped/completed` carry `elapsed_ms` and captions seen;
  is the ≤ 15.4 s opening admissible inside session-elapsed controls?
- **OD-W1-6 (map look-ahead on the return, U2).** The station map
  highlights the return path to the Records Workshop at `return_hub` before
  Vale's beat names it (M20 never reminded; M22 on that leg). Acceptable?

None new at U0. Existing open decisions (`docs/ai/SCIENTIFIC-AUTHORITY-AND-OPEN-DECISIONS.md`,
V3 report §1.7/§2.6/§4.2, V4 report) remain open and are not touched.

## 15. Confirmation

Nothing was pushed, merged, tagged, deployed, published, deleted or removed.
No worktree was created or removed. No PixelLab call was made in U0.

## 16. Astra design-authority checkpoint — 2026-09-08

This section records a documentation and original-mockup authority pass at source
HEAD `f6e051f2b74db2d62213d62ebc2848b638d72d4d` on
`fable-professional-world-rebuild-v1`. U0, U1, U1 closure and U2 remain historical
implementation evidence. The [Astra package](professional-world-v1/astra-authority/README.md)
governs the next presentation rebuild; no product implementation was performed here.

The owner accepted Codex-native Workspace permissions, AGENTS.md, the explicit
mission prohibitions, a frozen 39-file documentation/mockup allowlist, bounded
read-only Git checks, explicit-path staging and final verification. The
Claude-specific guard was not modified. After the owner closed the older Codex
instance, PID 20632 was absent and no independent worktree writer was identified.
The process evidence and its point-in-time limits are in the
[checkpoint amendment](professional-world-v1/astra-authority/CHECKPOINT-AND-ALLOWLIST.md).

Selected direction: a fixed 1280×720 world plate, 40×22.5 visible tiles at both
supported resolutions, with seven rooms larger than the viewport and functional
districts around clear circulation. The existing inter-zone operations tree and
purposeful Workshop return remain; local loops provide movement choice. The
camera selection explicitly accepts and tests fractional 1.5 scaling at 1920×1080.
U1/U2 presentation is substantially revised: Dock and opening are replaced
visually, Concourse is reblocked, HUD and map are revised, while interaction
registry and story-state infrastructure remain subject to the frozen scientific
boundaries. The exact [verdict and migration instructions](professional-world-v1/astra-authority/AUDIT-AND-U1-U2-VERDICT.md)
supersede assumptions of automatic U1/U2 retention.

Evidence includes the current source/route and all rooms, historical U0/U1/U2
reports and captures, actual current browser pixels at both resolutions,
inventory/map/task surfaces, existing art inventories, the workbook and ledger,
and official benchmark pages/screenshots. The already completed Emberville
ingestion was used without repeating extraction. The normal-control route audit
reached stable Core and its visible completion notice with no page errors;
external requests were blocked and no remote data export occurred.

The five-difference U2 projection is classified as a **test-driver miss** for
the M09 Concourse read: stale RETURN coordinates and an identity-blind prompt
helper missed the relocated gauge. Current-position normal activation emitted
the M09 completion event. The historical failed projection remains unchanged;
Fable must repair only the driver and establish a fresh comparison baseline.

All 26 identities and retained scientific fields are cross-referenced without
questionnaire wording. Workbook-to-ledger comparison found zero differences in
364 retained fields. Sixteen strong design candidates, seven conditional
candidates and three questionnaire-primary items remain provisional behavioural
analogues. M16 selected-opportunity mismatch, M05 exposure, M09 semantics, M10
recipient posts and other owner questions remain explicitly held. No scientific
authority, event meaning, score, canonical status, transport or handoff semantics
were changed.

Concrete deliverables include 16 original SVG boards, an interactive gallery,
numeric layouts, camera/topology alternatives and weighted selection, an exact
M01–M26 crosswalk, an asset audit, six bounded PixelLab batches and a
[copy-paste Fable mission](professional-world-v1/astra-authority/FABLE-PRODUCTION-MISSION.md)
covering P00–P10 with literal unit scopes. Four specialist reviews inspected
actual artifacts; one consolidated correction round was applied. The
[verification record](professional-world-v1/astra-authority/REVIEW-AND-VERIFICATION.md)
records final checks, human/hardware/scientific limitations and an incidental
375-byte Chromium diagnostic log that was preserved in TEMP after appearing
outside the allowlist. No tracked file was deleted.

Production implementation and PixelLab calls remain for Fable after design
approval. Nothing was pushed, merged, tagged, deployed or published; no branch,
worktree or existing evidence was deleted or removed.
