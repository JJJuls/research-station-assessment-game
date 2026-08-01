# Outpost visual system (Stardew-quality pass)

Status: working document for the `fable-stardew-quality-outpost-v1` visual
redesign. Governs presentation only — no event name, scoring formula,
measurement window, or collision footprint is defined here.

## Provenance

All participant-facing art in this pass is **original procedural pixel
art** authored in the repository:

| Source file                       | What it draws                                                                                                                            |
| --------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| `src/world/proceduralTilesets.ts` | Per-theme 16-tile Wang tilesets (floors, walls, faces, shadows) + floor-variation decal strips                                           |
| `src/world/proceduralTextures.ts` | Station props, NPC figures, item icons (pre-existing foundry, extended)                                                                  |
| `public/assets/**` (committed)    | PixelLab outpost-assets-v3 (player frames, door/terminal props, v3 tilesets) — provenance recorded in `docs/assets/` from earlier passes |

No external downloads. No Stardew Valley, Pokémon, or other copyrighted
game assets. Everything generated at Boot is a pure function of
hard-coded constants and fixed seeds (mulberry32) — deterministic across
participants, sessions, and machines (frozen-stimuli rule).

## Palette

Base family: cool slate / gunmetal / snow. Emissive cyan `#5fd3c4` is
reserved for interactable affordances (never decor). Amber/rust warmth is
reserved for the player's suit, hazard signage, and important machinery.

Each room theme shifts the family — hue identity per station:

| Theme      | Rooms                                 | Identity                                  |
| ---------- | ------------------------------------- | ----------------------------------------- |
| `hub`      | Station Hub                           | neutral slate blue, the social centre     |
| `dock`     | Dock/Arrival                          | darker deck plating, amber trim accents   |
| `prep`     | Inventory/Prep                        | grey-green workshop tint                  |
| `exterior` | Survey Terrace                        | snow/ice terrain, rock ridge walls        |
| `workshop` | Engineer, Systems Repair, Side Repair | gunmetal + rust trim, grated tread floors |
| `utility`  | Utility Bay, Hazard Control           | industrial grate, warning-amber trim      |
| `ops`      | Operations Annex                      | cleaner navy panel floor                  |
| `core`     | Final Core                            | near-black with dull teal seam trim       |
| `archive`  | Archive                               | deep indigo-slate                         |
| `corridor` | Interruption Corridor                 | neutral passage slate                     |

## Tile scale and rendering conventions

- 32 px logical tiles; dual-grid Wang rendering (StationMapBuilder) —
  collision always comes from the invisible logical layer, so art can
  never change collision footprints.
- Light source: top-left. Walls: dark top surface, front face visible
  where floor lies south, contact shadow on floor at wall boundaries.
- Floor plates align to the logical cell grid (one plate per cell).
- Floor-variation overlay: per-cell decal chosen by a deterministic
  coordinate hash (~38% of floor cells) — vents, wear, cable runs,
  guide-lines; snow themes use rocks, ripples, glaze, drifts. Purely
  decorative, never marks an interactable, never collides.
- Every room grid is padded with unreachable wall mass to at least
  25×19 cells (800×608 px) so the 800×600 viewport never shows dead
  void; the camera clear colour is the theme's `voidColor`.

## Measurement-safety rules for presentation work

- Interactable positions, interaction radii (72 px), prompt option
  lists/order, and event emission points are never moved by art passes.
- Decorative elements never gate or obstruct a measured opportunity.
- Decal/variant layouts are pure functions of cell coordinates + fixed
  seeds — identical for every participant (no per-session variation).
- Cyan emissive accents appear only on interactables (uniform-salience
  rule); decor stays duller than interactables.
