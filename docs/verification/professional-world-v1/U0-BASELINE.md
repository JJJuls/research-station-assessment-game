# U0 — baseline and design authority (World V1)

Branch `fable-professional-world-rebuild-v1`, worktree
`.claude/worktrees/fable-professional-world-rebuild`, base and entry HEAD
`867c4d5`; `git status --porcelain` empty at entry (2026-09-05, 22:50).
Ancestry verified from the log: `aaa73fd` (V3 pilot Unit 7) → V4 Units 0–6
(`406aa63`, `72ab012`, `ce1ed35`, `f4a3a21`, `5c8f68e`, `c4d7a8e`,
`8f5dd42`, `a1490fc`, `013f589`) → `8c02bd9`, `867c4d5` (V4 docs
checkpoints). No source file differs between `013f589` and `867c4d5`.

## 1. Inputs read

`CLAUDE.md`, `.claude/settings.json`, the V4 and V3 reports, the workbook
(md5 `1535682ab88481815bbdda1206644d4c` — equal to the md5 the derived
ledger records, so ledger and workbook agree), the M01–M26 ledger, the
V4 visual system, the operating mode, the pilot room docs (00, 11, 12, 13,
14), the burden budget, the V4 baseline audit, the seven zone scenes,
`RoomScene`, `PilotZoneScene`, `pilotRoute`, `zoneSites`, `worldBundles`,
`viewport`, `Player`, `Npc`, `InventoryHud`/`HotbarHud`, `itemDefs`,
`items`, `StationMapBuilder`, `proceduralTilesets`, the procedural texture
manifest, `Boot`, `assets.ts`, the asset provenance, the e2e helpers
(`helpers`, `pilotHelpers`, `journey`), the V4 capture/camera/projection
specs, and the current V4 frames (inspected directly, not only their
capture status).

## 2. Human findings confirmed in the frames

All thirteen findings of mission §2 are visible in the `before-1280x720`
set: the opening's enlarged disconnected props (`01`), the 20-tile view
with the 96 px figure (`02`, `05`), floor crates with permanent chips
(`07`), five to six readout ribbons per view on the Deck (`27`), the
translucent plate rectangles in the Yard and Deck (`19`, `27`), the wall
display block on the Laboratory's travel band (`12`), the empty hotbar
after the yard (`27`, `42`), and the wide objective banner in every frame.
The object-by-object record is `docs/game/world-v1/INTERACTION-AFFORDANCE-AUDIT.md`
and `current-object-inventory.json`.

## 3. Baseline captures (untouched tree, real input, no state injection)

| Set                | Command                                                                                                                                                                          | Result               | Frames |
| ------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------- | ------ |
| `before-1280x720/` | `PW_DEV_PORT=5364 V4_OUT=docs/verification/professional-world-v1/before-1280x720 V4_VIEWPORT=1280x720 npx playwright test e2e/v4_visual_capture.spec.ts --retries=0 --workers=1` | 3/3 passed (8.4 min) | 30     |
| `before-800x600/`  | same with `V4_VIEWPORT=800x600`                                                                                                                                                  | 3/3 passed (8.5 min) | 30     |

Both sets were produced by one detached runner (`cmd.exe`, log in the
session scratchpad), sequentially, on port 5364. The Concourse overview
frame is byte-identical to the V4 Unit 6 frame; the others differ only by
session-dependent state (timestamps, animation phase), as expected.

## 4. Scientific projection at the base

`V4_LABEL=world-v1-before V4_PROJECTION_BASELINE=docs/verification/professional-visual-v4/projection/baseline-v3.json npx playwright test e2e/v4_event_projection.spec.ts --retries=0 --workers=1`
→ 1/1 passed (4.0 min); `projection/world-v1-before.json` written beside
the V4 projections; `world-v1-before.diff.json` = `[]` (**0 differences**
against the V3 baseline: final stage `complete`, 154 events, 80 event
types, 28 opportunity records, 25 window ids, form/counterbalance
assignments, payload-key sets, dispositions and the zone sequence all
identical). This file is the comparison baseline for every later unit.

## 5. Deliverables written

`docs/game/PROFESSIONAL-WORLD-DESIGN-V1.md` (design authority, unit
contracts), `docs/game/world-v1/STORY-STATE-SPEC.md`,
`CAMERA-AND-SCALE-SPEC.md`, `INTERACTION-GRAMMAR.md`, `ROOM-BLOCKOUTS.md`
(full grids for the Dock and Concourse; area/placement tables for the
other five zones), `INVENTORY-ITEM-PURPOSE-AUDIT.md`,
`INTERACTION-AFFORDANCE-AUDIT.md`, `ASSET-PROVENANCE-REGISTER.md`,
`current-object-inventory.json`, the mission report skeleton, this note.

Non-invasive test infrastructure: none new was needed — the V4 capture and
projection specs are parameterised by output directory and label; U1 adds
the World V1 specs named in the design authority.

## 6. Decisions taken in U0 (design, not scientific)

- Camera: 32×18-tile view from a 1024×576 world plate composited at 1.25
  with a texel-snapped sampler (`CAMERA-AND-SCALE-SPEC.md` §2); the
  three-scale comparison is produced in U1 before propagation.
- Room sizes and the fixed topology positions (`ROOM-BLOCKOUTS.md`).
- Seven acts over the unchanged fifteen stages; NPC placement per act; Kai
  leaves the Laboratory at `return_hub` (presentation only).
- Four interaction classes with a paired-alternative equality rule for
  M24 / M26 / M19 (`INTERACTION-GRAMMAR.md` §1).
- Item dispositions (`INVENTORY-ITEM-PURPOSE-AUDIT.md`): no route item is
  removed; the Records supply crates become one resupply pallet; the yard
  tools are issued from a visible locker; legacy-only items are marked
  "remove from active pilot" (never spawned on the route).

## 7. Process audit at U0 close

No listener on 5364 after the runner exited; the only `node.exe`
process is the one present at session start (not started by this
mission); no Chrome, Vite, Playwright or monitor process remains.

## 8. Confirmation

Nothing was pushed, merged, tagged, deployed, published, deleted or
removed. No worktree created or removed. No PixelLab call. No source file
changed.
