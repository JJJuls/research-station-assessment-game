# pixellab-asset-manifest.md

Scaffold only. **No assets have been generated.** This document is the required
record location (V3 Section 7, step 6) for every PixelLab-generated asset's
prompt and metadata, once an asset pass is explicitly approved.

## Approval gate (read before adding anything below)

Per V3 Section 7 and `.claude/skills/pixellab-asset-pipeline/SKILL.md`:

1. PixelLab may only be called after the user gives **explicit, standalone
   approval for a specific room/step in the current session** — never inferred
   from general room-building or polish conversation.
2. The target room(s) must already have **working placeholder mechanics and
   full event logging** (per that room's `docs/game/rooms/*.md` done test).
3. Required sequence: confirm mechanics/logging -> style anchor -> player
   sprite -> minimal station tile style -> room-by-room assets (never batched
   across multiple rooms in one pass) -> update this manifest for every asset.
4. Reject inconsistent assets rather than force them into the game — log
   rejections here too, with the reason.

As of this beat (Beat 1), no room has been asset-approved, and most rooms don't
yet have their placeholder mechanics/logging fully reconciled to canonical names
(see `docs/research/event-schema.md`). This manifest exists so the structure is
ready when that changes — it is not a signal to begin asset work.

## Required future asset categories (V3 Section 7 visual target)

- Style anchor (one, generated first, before anything else).
- Player sprite / researcher character (8-direction top-down).
- Minimal station tile style (floors, walls, corridors, doors).
- Per-room interactables:
  - Dock: arrival terminal, dock signage.
  - Archive: archive terminal, log shelves/data panels.
  - Systems Repair: systems console, repair panel, repair manual station.
  - Engineer Hub: report console, duty board, Engineer Kai NPC.
  - Inventory/Prep: quartermaster console, storage system, prep bench, kit
    crate.
  - Hazard Control: hazard alert terminal, warning details panel, route
    decision console.
  - Optional Side Repair: Utility Bot NPC, repair arm, work console, parts
    shelves.
  - Interruption Corridor: Comms AI, signal beacon, door controller.
  - Final Core: Core Interface AI, status monitors, station stability meter,
    final core/reactor.
- Status monitors, warning panels, and other shared UI-adjacent set dressing.

## Visual target (must match every generated asset)

- Top-down 2D pixel art, 32x32-compatible tile scale.
- Remote research outpost / expedition station setting.
- Consistent palette; interactables stay visually readable at game scale.

**Avoid**: farming/crops, medieval fantasy, combat assets, corporate office
cubicles, player-power-upgrade visuals, and mixing isometric/top-down
perspectives unless deliberately chosen and normalized.

## Naming conventions (for when generation begins)

- Style anchor: `style-anchor-v<N>`.
- Player sprite: `player-researcher-v<N>`.
- Tile style: `tileset-outpost-<area>-v<N>` (e.g.
  `tileset-outpost-corridor-v1`).
- Per-room interactables: `<room_id>-<object_name>-v<N>` (e.g.
  `archive_room-terminal-v1`), matching `room_id` values from
  `docs/research/event-schema.md` §2.
- Version-suffix every regeneration (`-v2`, `-v3`, ...) rather than overwriting a
  prior entry — keep prior entries in this manifest marked `superseded`, not
  deleted, so the style-consistency history stays auditable.

## Asset log

_(empty — no assets generated yet)_

| Asset name | Room/category | Prompt | Date | Status | Notes                                                                           |
| ---------- | ------------- | ------ | ---- | ------ | ------------------------------------------------------------------------------- |
| —          | —             | —      | —    | —      | No entries. Populate only after an explicit, approved PixelLab generation pass. |

## Rejected/regenerated assets log

_(empty — no rejections yet)_

| Asset name | Reason rejected | Action taken | Date |
| ---------- | --------------- | ------------ | ---- |
| —          | —               | —            | —    |
