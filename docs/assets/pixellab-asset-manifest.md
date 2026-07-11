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

## Approval record (V1 slice asset pass)

The V1 asset pass was explicitly approved by the user in-session (2026-07-11,
AskUserQuestion): plan approval covers the sequence style anchor → player +
animations → tilesets → Dock props → Hub props → Archive props, executable
only after the Phase E placeholder verification — which passed (Playwright
suite green, commit `7559d6c`). Style anchor is self-reviewed against the
visual bible per the same approval. `asset_set_version`: **outpost-assets-v1**
(embedded in the build alongside `game_version` when assets are integrated).

**Static-stimuli rule:** all production assets are downloaded and committed
under `public/assets/`; the game never calls PixelLab at participant runtime.

## Asset log

Index table (one row per asset; full reproducibility record in the per-asset
subsections below):

| Asset name                         | Room/category | Date       | Status                                                                                                                                                                                                                                                                   |
| ---------------------------------- | ------------- | ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `style-anchor-v1`                  | Style anchor  | 2026-07-11 | **accepted**                                                                                                                                                                                                                                                             |
| `player-researcher-v1`             | Player sprite | 2026-07-11 | **accepted** (rotations + walk 8f + idle 4f)                                                                                                                                                                                                                             |
| `tileset-outpost-interior-v3`      | Station tiles | 2026-07-11 | **accepted** (v1, v2 rejected — see log)                                                                                                                                                                                                                                 |
| `tileset-outpost-dock-v3`          | Dock pad      | 2026-07-11 | **accepted** (attempts 1–2 rejected/superseded)                                                                                                                                                                                                                          |
| `dock_arrival-arrival-terminal-v1` | Dock          | 2026-07-11 | **accepted**                                                                                                                                                                                                                                                             |
| `dock_arrival-airlock-door-v1`     | Dock          | 2026-07-11 | **accepted** (record corrected per reviewer finding 4: amber mark is a ~4×6 px status glyph, not the "~2px dot" first recorded; amber usage to be re-audited against the warning-amber reservation when Hazard Control assets are generated)                             |
| `dock_arrival-signage-v1`          | Dock          | 2026-07-11 | **accepted** (decor; stencil pseudo-text, no meaning)                                                                                                                                                                                                                    |
| `dock_arrival-supply-crates-v1`    | Dock          | 2026-07-11 | **accepted**                                                                                                                                                                                                                                                             |
| `station_hub-status-board-v1`      | Hub           | 2026-07-11 | **accepted**                                                                                                                                                                                                                                                             |
| `station_hub-door-frame-v1`        | Hub           | 2026-07-11 | **accepted** (open-door affordance)                                                                                                                                                                                                                                      |
| `station_hub-hub-console-v1`       | Hub           | 2026-07-11 | **accepted** (decor)                                                                                                                                                                                                                                                     |
| `station_hub-locked-door-v1`       | Hub           | 2026-07-11 | **accepted** (sealed-door affordance)                                                                                                                                                                                                                                    |
| `archive_room-terminal-v1`         | Archive       | 2026-07-11 | **accepted**                                                                                                                                                                                                                                                             |
| `archive_room-log-shelves-v1`      | Archive       | 2026-07-11 | **accepted**                                                                                                                                                                                                                                                             |
| `archive_room-data-panels-v1`      | Archive       | 2026-07-11 | **accepted** (decor; record corrected per reviewer findings 2/6: in-engine the panels read brighter than the interactive log-shelves — a salience inversion, not "deliberately dim" as first recorded; disposition pending user decision, see stimulus-freeze checklist) |
| `archive_room-server-racks-v1`     | Archive       | 2026-07-11 | **accepted** (decor)                                                                                                                                                                                                                                                     |

### Wave 3 room props — shared record fields

All 12 props: tool `create_map_object` (basic mode — deviation from the plan's
background-image inpainting method, chosen because palette-locked prompts
against the anchor proved sufficient and base64 screenshots are token-costly;
acceptance rules unchanged); view "low top-down", outline "single color
outline", shading "basic shading"; seed n/a; created 2026-07-11;
condition-invariant; PixelLab subscription licence; first generation, no
rejections; committed in the Phase F integration commit. Full prompts are the
`description` fields recorded with each job ID below; SHA-256 of every
committed file listed below. Interactable props are measurement-relevant;
props marked "(decor)" above are decorative.

| File (public/assets/)                     | Job ID                                 | SHA-256                                                            |
| ----------------------------------------- | -------------------------------------- | ------------------------------------------------------------------ |
| `props/dock/arrival-terminal.png` (32×32) | `179d497b-8cfa-4209-a777-577caf043f17` | `b0e28fb2b73abbe491ac00f28aa8dc8927370eca68b5d5a2d21beb6bb5a45972` |
| `props/dock/airlock-door.png` (64×64)     | `0fd35352-5cb1-4ca2-b9db-5b26d8517b93` | `30c688aceca209612509fe2ba66afeada5914f04a1fe9ec422c24b27489bb99a` |
| `props/dock/signage.png` (48×48)          | `1abe6ea3-7fcc-4f60-9ccf-edcd4e701fc3` | `ea8438a63dcc30decccb95a220f8df8ce8f7754f3cd340aa91425504ba410a57` |
| `props/dock/supply-crates.png` (64×64)    | `825fa381-4261-4a12-b32b-0186df9073ca` | `1d1ef54b568f996bb1660b9d71253bb0cc9678559791a788fd708c60d290faac` |
| `props/hub/status-board.png` (64×64)      | `c0d96fee-2a46-4d2f-a8db-27b0053168a3` | `c9f5c39512f37b8e08b997d1e7b91a3ecd9aa8e9a4e5d005d853d99f0f313c26` |
| `props/hub/door-frame.png` (48×48)        | `f2bfb929-1a17-4aa1-8993-b64da46b1ef4` | `6c373c5abd19120a8b8c145800bc7a98d33ae9a96dde235a99fc7b2235b5cf32` |
| `props/hub/hub-console.png` (32×32)       | `8c418baf-76d7-44b6-bdb6-b3edd6050650` | `1f115a24653d2ec4e06936a27735f1988ae36c55f0cc95a687ac4cb13a11ee78` |
| `props/hub/locked-door.png` (48×48)       | `c4af095f-ac90-4386-b489-5043358199ff` | `e4d7f959e9a8d6f17a5a15c68169448702e4112cc216381dfb045d32664e9e7d` |
| `props/archive/terminal.png` (32×32)      | `5b48850b-8a35-45c8-b3a0-ffbb4368d243` | `80957a44446cc4ead6113f7c79036753b9b234a9039bd5f1816644ec402295b3` |
| `props/archive/log-shelves.png` (64×64)   | `192c41cd-1958-4732-b1ca-d5ae638d6eeb` | `3f628efc715f3d0e41970c52d441cae73054a23a7325dbfc6798632570a6e862` |
| `props/archive/data-panels.png` (48×48)   | `354f69b3-922a-4081-a5d8-ff30391f28ba` | `c8a3a9d99518e39653a67b08d9f5cb8c80f49b35f55bff81e8ed5dcf59d94245` |
| `props/archive/server-racks.png` (64×64)  | `7dc57083-5e94-4953-9259-243bbcacea72` | `f47ea39901d2b895dad60480bfc53d13ff046b202ef1f0cc64c4ca9247247a19` |

### Final tileset/player records (supplements to the sections below)

- `tileset-outpost-interior-v3`: job `22f5661a-7726-492b-aff9-d94bdc3948eb`;
  file `tiles/station/tileset-outpost-interior-v3.png` (+ committed metadata
  JSON); SHA-256
  `d11bf0de84990f643efb62ed52f6f427e7e443f2ddc72565bb2c5b9fac86c86a`;
  lineage v1→v2→v3 (see rejection log); wall base `004b1f6a…` preserved from
  v1/v2; measurement-relevant; rendered via the dual-grid Wang layer
  (collision unchanged, structurally guaranteed — placeholder layer keeps all
  collision and is hidden).
- `tileset-outpost-dock-v3`: job `326cc809-97dd-4732-80d6-7466c7ce758d`;
  file `tiles/station/tileset-outpost-dock-v3.png` (+ metadata); SHA-256
  `8e89d3905422d1acc82297e441b7c2d492e4e35047117ed14416439f83e24021`;
  chained to interior v3's deck base `06c4f6e8…`; decorative floor zone
  ('P' cells collide identically to '.').
- `player-researcher-v1` files: `characters/player/rotations/{8 dirs}.png`,
  `characters/player/walk/{dir}/{0..7}.png`,
  `characters/player/idle/{dir}/{0..3}.png` (104 PNGs; loaded cardinal-only
  in V1). Representative SHA-256: rotations/south
  `defe634ccf090b20e51225d57fc15105a13085d3705cecb8005d08a0c8c223b6`,
  walk/south/0
  `cf370402b85f0628f050dcd2c086e90dbb8eb004ed1d8ea23ac9780da1f1fab4`,
  idle/south/0
  `b6dff5219ee4fc11649a9f794aea1e2048cbc7498f56b06bc8df830810c9bde5`
  (all files committed; bundle-level integrity via git object hashes).
  Walk = template `walking-8-frames` (jobs of 2026-07-11), idle = template
  `breathing-idle` (4f). Same 32×42 collision body and frameRate 10 as the
  placeholder skin (measurement equivalence).

### style-anchor-v1

- **Stable identifier:** `style-anchor-v1`
- **Filename / repo path:** `public/assets/pixellab/style-anchor/style-anchor-v1.png` (pending download)
- **PixelLab MCP tool:** `create_map_object` (basic mode)
- **Full prompt:** "Corner of a remote polar research outpost arrival bay interior: cold steel-blue gunmetal bulkhead wall panels with rivets and cable runs, desaturated slate insulated deck floor plating with subtle teal tint, one glowing cyan-teal emissive arrival terminal screen mounted on the wall, a small amber-orange warning stripe on one wall panel, a metal supply crate with stencil markings, cold aurora violet-green glow through a narrow window slit. Clean readable silhouettes, consistent muted cold palette with warm accents only on the terminal glow and warning stripe."
- **Model/generation mode:** create_map_object basic (no style-matching background)
- **Job/generation ID:** `042ea47a-1e82-4c3c-bcfe-b9ceaa90721c`
- **Seed:** n/a (API does not expose one)
- **Dimensions / layout:** 128×128 px single image (vignette; not tiled)
- **Animation:** none
- **Generation parameters (non-default):** view "low top-down", outline "single color outline", shading "basic shading", detail "medium detail"
- **Creation date:** 2026-07-11
- **Intended room/function:** style anchor — defines palette/outline/shading for every subsequent V1 asset; not shipped in-game
- **Classification:** decorative (reference only; never player-facing)
- **Condition applicability:** condition-invariant (all V1 assets are)
- **Status:** **accepted** — self-review vs visual bible passed (steel-blue/gunmetal structure, slate-teal deck, cyan emissive interactable cue, amber confined to warning stripe, single-color dark outline, basic shading, readable silhouettes; nothing from the V3 §7 avoid-list). Palette locked from this image for all subsequent V1 assets.
- **Rejection reason:** —
- **Regeneration lineage:** first generation, accepted
- **Source/style dependency:** none (this is the anchor)
- **SHA-256:** `ffd67fddde48d49a8023cf37185eb5500ee70bfd4f622b098c72cd938b8f1128`
- **Implementing commit:** pending (Phase F wave commit)
- **Licence/provenance:** generated via PixelLab (subscription) for this project; PixelLab ToS apply

### player-researcher-v1

- **Stable identifier:** `player-researcher-v1`
- **Filename / repo path:** `public/assets/characters/player/` (pending download; 8-direction rotations + animations)
- **PixelLab MCP tool:** `create_character`
- **Full prompt:** "Polar research outpost field assistant in a warm rust-orange insulated expedition suit, fur-lined hood down on the shoulders, dark slate-blue gloves and boots, small glowing cyan-teal badge on the chest, utility belt with small pouches. Muted cold-weather palette matching a steel-blue arctic station: the suit's rust-orange is the only warm mid-tone, with dark single-color outlines and basic shading. Clean readable silhouette for a 32px-tile top-down RPG."
- **Model/generation mode:** v3 (2 generations, always 8 directions)
- **Job/generation ID:** `eb70b436-f056-4cdd-a3cb-c6e7477ce05f`
- **Seed:** n/a (not exposed)
- **Dimensions / layout:** 48 px character (~68 px canvas), 8 directional rotations
- **Animation:** walk + idle queued separately in Wave 2 (recorded below when queued)
- **Generation parameters (non-default):** view "low top-down", outline "single color black outline", detail "medium detail", mode v3
- **Creation date:** 2026-07-11
- **Intended room/function:** the player avatar — measurement-relevant (movement/interaction affordance for every task)
- **Classification:** measurement-relevant
- **Condition applicability:** condition-invariant
- **Status:** generating
- **Rejection reason:** —
- **Regeneration lineage:** first generation
- **Source/style dependency:** style-anchor-v1 palette (prompt-derived)
- **SHA-256:** pending
- **Implementing commit:** pending
- **Licence/provenance:** PixelLab subscription generation for this project

### tileset-outpost-interior-v1

- **Stable identifier:** `tileset-outpost-interior-v1`
- **Filename / repo path:** `public/assets/tiles/station/tileset-outpost-interior-v1.png` (pending download)
- **PixelLab MCP tool:** `create_topdown_tileset`
- **Full prompt:** lower "insulated slate-blue metal deck floor plating with a subtle teal tint, riveted seams and faint panel lines, muted cold palette"; upper "raised cold steel-blue gunmetal bulkhead wall blocks with rivets, panel lines and a darker top surface, muted cold palette"; transition "riveted metal wall base trim with a subtle shadow line where the bulkhead meets the deck"
- **Model/generation mode:** standard Wang pipeline
- **Job/generation ID:** `c86a6650-d727-418a-a157-8abbbd741b62`; base tile IDs: lower(deck) `cd497676-c5d2-4694-8d91-ed21f77a95a6`, upper(wall) `004b1f6a-42bd-462e-bd80-f18b6baaac9d`
- **Seed:** n/a (not exposed)
- **Dimensions / layout:** 32×32 px tiles, 16-tile Wang corner set (transition_size 0.5)
- **Animation:** none
- **Generation parameters (non-default):** view "low top-down", outline "single color outline", shading "basic shading", detail "medium detail", transition_size 0.5
- **Creation date:** 2026-07-11
- **Intended room/function:** shared interior floor/wall tiles for Dock, Hub, Archive (and later rooms)
- **Classification:** measurement-relevant (walkable space + collision boundaries)
- **Condition applicability:** condition-invariant
- **Status:** generating
- **Rejection reason:** —
- **Regeneration lineage:** first generation
- **Source/style dependency:** style-anchor-v1 palette (prompt-derived); its lower base tile ID seeds `tileset-outpost-dock-v1` (Wave 2 chaining)
- **SHA-256:** pending
- **Implementing commit:** pending
- **Licence/provenance:** PixelLab subscription generation for this project

## Rejected/regenerated assets log

| Asset name                            | Job ID                                 | Reason rejected                                                                                                                                                                                                                                        | Action taken                                                                                                                                                                                                           | Date       |
| ------------------------------------- | -------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- |
| `tileset-outpost-interior-v1`         | `c86a6650-d727-418a-a157-8abbbd741b62` | Wall-base trim rendered as prominent warm amber/orange banding — §10 rule 2 reserves warning-amber for hazard assets (hazard-salience uniformity)                                                                                                      | Regenerated as v2 chained to v1's own base tiles with explicitly cool-toned transition                                                                                                                                 | 2026-07-11 |
| `tileset-outpost-interior-v2`         | `105f7d4a-faf2-4c55-a356-dbe50ae673f7` | Passed sheet-level review but **rejected at the in-engine screenshot check**: deck rendered bright cyan-teal, deviating from the anchor's muted slate deck AND camouflaging the cyan interactable markers (measurement check 2, affordance uniformity) | Regenerated as v3 with dark desaturated deck prompt, wall base preserved via `upper_base_tile_id`                                                                                                                      | 2026-07-11 |
| `tileset-outpost-dock-v1` (attempt 1) | `b2c46a24-3e1a-4ea8-a7e8-7e4119c27dcb` | Cream/tan seam (off-palette warm) and deck side far more saturated than the accepted interior deck                                                                                                                                                     | Regenerated with transition_size 0 and dark-cool constraints (attempt 2, `e2340dd5-…`); attempt 2 then superseded unassessed because the interior deck itself changed to v3 — the pad must chain to v3's new deck base | 2026-07-11 |
