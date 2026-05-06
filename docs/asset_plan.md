# Asset Plan

## 1. Current Asset Audit Summary

The project currently uses a small Phaser RPG template asset set:

- `src/assets/atlas/atlas.png` and `atlas.json`: active player sprite atlas using `misa-*` walking frames.
- `src/assets/sprites/spaceman.png`: loaded by `Boot`, but not currently used by gameplay.
- `src/assets/tilesets/tuxemon-sample-32px-extruded.png`: single outdoor RPG town tileset.
- `src/assets/tilemaps/tuxemon-town.json` and `tuxemon-town.tmx`: current Tiled map with `Below Player`, `World`, `Above Player`, and `Objects` layers.
- `public/app-icon.png`, `favicon.ico`, `logo192.png`, and `logo512.png`: browser/PWA branding assets.

The current visual set is useful as temporary scaffolding for movement, collision, and interaction logging. It does not yet fit the final research-station assessment theme.

## 2. Target Visual Direction: Campus-Style Research Station

The target setting should read as a small institutional research campus rather than a fantasy RPG town. The tone should be grounded, calm, and workplace-oriented:

- Outdoor campus hub with paths, building entrances, signage, landscaping, and controlled movement boundaries.
- Interior spaces that support behavioral assessment tasks: labs, control consoles, data archives, break spaces, and equipment rooms.
- Clear interactable objects such as terminals, documents, instruments, storage cabinets, noticeboards, and workstations.
- Pixel-art style can remain, but the final art should avoid monster-collecting, fantasy-town, or Pokemon/Tuxemon-like visual language.

## 3. Required Asset Categories

- Player sprite: neutral participant/research assistant character with four-direction walking animations.
- NPC sprites: researchers, technicians, supervisors, peers, or station staff.
- Outdoor tiles: paths, grass, pavement, fences, signs, exterior walls, doors, windows, campus boundaries.
- Interior lab tiles: floors, walls, doors, benches, counters, lab equipment, monitors, sample stations.
- Control room tiles: consoles, screens, server racks, status boards, operator desks.
- Archive/data room tiles: filing cabinets, shelves, document boxes, data terminals, secure storage.
- Break room/dorm tiles: tables, chairs, couch, kitchenette, beds or lockers if needed.
- Workshop/equipment tiles: tool benches, machines, crates, maintenance props, equipment racks.
- Interaction props: highlightable task objects with clear object IDs.
- UI support assets: icons or panels only if needed; the current UI is Phaser text/shape based.

## 4. Proposed Level Structure

- Outdoor hub: central campus entry area connecting the major rooms. Use this as the navigation and orientation space.
- Main lab: primary assessment workspace with research tasks, evidence collection, equipment checks, and task prioritization objects.
- Control room: monitoring and decision-making area with consoles, alerts, and system-status interactions.
- Archive/data room: information-seeking area with records, terminals, files, and cross-checking tasks.
- Break room/dorm: social-calibration or interruption-management space, with NPC or message-style interactions if added later.
- Workshop/equipment room: persistence and troubleshooting area with tools, repair tasks, inventory-like props, and equipment state changes.

## 5. Recommended Tile Size Compatibility

The current project uses a 32x32 tilemap:

- Current map tile size: 32x32.
- Current map dimensions: 40x40 tiles.
- Current Phaser scale mode: fit-to-canvas, pixel-art rendering enabled.

Recommended compatibility target:

- Prefer 32x32 tiles for direct replacement with minimal map-system changes.
- 16x16 assets can work if upscaled or adapted, but they will require more map/layout care.
- Avoid mixed tile sizes inside the same first pass unless the tileset is already authored for Tiled compatibility.
- Prefer tilesets that include Tiled-friendly spacing/margin guidance or are already used in Phaser/Tiled examples.

## 6. Keep/Replace/Add Table

| Asset                              | Current Use               | Recommendation              | Notes                                                                             |
| ---------------------------------- | ------------------------- | --------------------------- | --------------------------------------------------------------------------------- |
| `atlas.png` / `atlas.json`         | Active player character   | Replace                     | Temporary only; fantasy/RPG trainer style does not fit final station theme.       |
| `spaceman.png`                     | Loaded but unused         | Keep temporarily or replace | Could be reframed for testing, but too small/limited for final player or NPC set. |
| `tuxemon-sample-32px-extruded.png` | Current overworld tileset | Replace                     | Useful for scaffolding; final assets should avoid Tuxemon/Pokemon-like style.     |
| `tuxemon-town.json` / `.tmx`       | Current map               | Replace later               | Keep while testing research systems; replace when station tiles are ready.        |
| Public icons/logos                 | Browser/PWA branding      | Replace                     | Current branding still reflects Phaser RPG template.                              |
| Audio                              | None                      | Add only if needed          | Avoid audio unless required by the assessment design.                             |
| Research-station interiors         | Missing                   | Add                         | Needed for lab, control, archive, break, and workshop rooms.                      |
| Research props/interactables       | Mostly missing            | Add                         | Needed for meaningful assessment events and object IDs.                           |

## 7. Asset Licensing Checklist

Before adding any external asset pack:

- Confirm the license permits browser game use.
- Confirm the license permits research/prototype use.
- Confirm whether commercial use is allowed, even if the current project is non-commercial.
- Confirm whether edits, recolors, and derived tilesets are allowed.
- Confirm attribution requirements and keep attribution text in `docs/` or a credits file.
- Record source URL, author, license name, download date, and version if available.
- Avoid assets with unclear provenance, AI-generated ambiguity, or copied franchise styling.
- Prefer licenses such as CC0, CC-BY with clear attribution, MIT-style asset licenses, or paid packs with explicit usage terms.

## 8. Search Terms For External Asset Packs

Useful search terms:

- `32x32 pixel art laboratory tileset`
- `32x32 pixel art research facility tileset`
- `pixel art science lab interior tileset`
- `pixel art office interior tileset 32x32`
- `pixel art modern building exterior tileset`
- `pixel art campus tileset`
- `pixel art sci fi lab tileset 32x32`
- `pixel art control room tileset`
- `pixel art server room tileset`
- `pixel art dorm room interior tileset`
- `pixel art workshop tileset 32x32`
- `Tiled compatible 32x32 lab tileset`
- `Phaser 3 32x32 tileset lab`

## 9. Priority Order For Asset Acquisition

1. Core 32x32 interior tileset for labs, corridors, walls, floors, and doors.
2. Player character replacement with four-direction walking animations.
3. Research/workplace props for interactable objects.
4. NPC/staff sprites with compatible scale and palette.
5. Outdoor campus tiles for the hub and building exteriors.
6. Specialized rooms: control room, archive/data room, break room/dorm, workshop/equipment room.
7. Public branding icons and favicon.
8. Optional UI icons or panel art if text/shape UI becomes insufficient.
9. Optional audio only if required by the study design.

## 10. Copyright And Style Notes

The current Tuxemon-style template assets should not be treated as final participant-facing art. Final assets should avoid:

- Pokemon-like town layouts, monster-game visual motifs, or recognizably derivative creature-collector styling.
- Tuxemon-specific tiles, branding, or character designs unless the license and attribution requirements are explicitly satisfied.
- Fan art, ripped sprites, ROM-derived tiles, or asset packs that imitate a copyrighted franchise too closely.
- Mixed-source assets with incompatible licenses or inconsistent attribution requirements.

For the final prototype, choose assets that read as an original research campus/workplace environment and maintain a clear record of licensing and attribution.
