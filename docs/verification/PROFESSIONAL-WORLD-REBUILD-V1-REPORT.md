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
| U1   | (this commit) | feat(game): establish professional camera and station vertical slice | done with open items — see `professional-world-v1/U1-CAMERA-AND-VERTICAL-SLICE.md` §5b |
| U2   | —             | feat(game): rebuild opening, story spine and mission card            | not started                                                                            |
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

U1: see the U1 note §1 and §6 (source: `src/world/{viewport,camera,plateSampler,interactionRegistry,RoomScene}.ts`, `src/world/kit/kitTextures.ts`, `src/world/layouts/{grid,dock,concourse}.ts`, `src/constants/depth.ts`, `src/sprites/Player.ts`, `src/gameplay/{Npc,InventoryHud,physical}.ts`, `src/pilot/{PilotZoneScene,pilotRoute,zoneSites,worldBundles}.ts`, `src/scenes/{DockScene,StationConcourseScene}.ts`; e2e: `helpers`-adjacent `pilotHelpers`, `journey`, `pilot_route`, `pilot_episodes_1_2`, `pilot_deck`, `v4_visual_capture`, new `world_v1_*` specs, `v4_camera` removed; docs: rooms 00 and 15, the camera spec §7, the U1 note).

## 4. Preserved versus rebuilt

See the design authority §2. Restated per unit as work lands.

## 5. Story route

See `docs/game/world-v1/STORY-STATE-SPEC.md` (seven acts over the
unchanged fifteen route stages; one purposeful return).

## 6. Camera and room-scale decisions

`docs/game/world-v1/CAMERA-AND-SCALE-SPEC.md` §7: scale B (1.25) selected on the six comparison frames; Dock 36×24 and Concourse 40×26 built to the blockouts.

## 7. Inventory disposition table

See `docs/game/world-v1/INVENTORY-ITEM-PURPOSE-AUDIT.md`.

## 8. Interaction-registry results

U1: 13 registry objects (Dock 3, Concourse 10); pure spec 11/11 (reachability from every spawn, door clearance, class/prompt grammar, walking budget); runtime prompts asserted for every object — see the U1 note §3–§5.

## 9. M01–M26 scientific invariants

Workbook `docs/verification/input/Remote_Outpost_M01-M26_Scientific_Decision_v2.xlsx`
md5 `1535682ab88481815bbdda1206644d4c` equals the md5 recorded by the derived
ledger, so the ledger is a faithful derivation and no conflict exists at
the base. Projection comparisons per unit are tabled in §10.

## 10. Tests and captures

| Unit | Command                                                                                                                                                     | Result               |
| ---- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------- |
| U0   | `PW_DEV_PORT=5364 V4_OUT=…/before-1280x720 V4_VIEWPORT=1280x720 npx playwright test e2e/v4_visual_capture.spec.ts --retries=0 --workers=1`                  | 3/3 passed (8.4 min) |
| U0   | same at `800x600`                                                                                                                                           | see `U0-BASELINE.md` |
| U0   | `V4_LABEL=world-v1-before V4_PROJECTION_BASELINE=…/projection/baseline-v3.json npx playwright test e2e/v4_event_projection.spec.ts --retries=0 --workers=1` | see `U0-BASELINE.md` |

## 11. Supabase / Qualtrics results

U7.

## 12. Reviewer findings and corrections

Per unit, from U1.

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

None new at U0. Existing open decisions (`docs/ai/SCIENTIFIC-AUTHORITY-AND-OPEN-DECISIONS.md`,
V3 report §1.7/§2.6/§4.2, V4 report) remain open and are not touched.

## 15. Confirmation

Nothing was pushed, merged, tagged, deployed, published, deleted or removed.
No worktree was created or removed. No PixelLab call was made in U0.
