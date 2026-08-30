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

## Unit 7 — professional presentation tokens (evidence-led pilot v2)

Presentation only; nothing here moves an interactable, a radius, a prompt
option, an event or a window. Ledger and decisions:
`docs/verification/evidence-led-pilot-v2/UNIT-7-VISUAL-DEFECT-LEDGER.md`.

| Token / rule             | Value / behaviour                                                                                                                                                                                                                                                                                 | Where                                                                          |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| Ground                   | `#0b1016` charcoal — page body, game clear colour and the `core` theme void share it; the 4:3 letterbox is never black (D-U7-1)                                                                                                                                                                   | `src/style.css`, `src/index.ts`, `proceduralTilesets.ts`                       |
| World depth              | `worldDepth(footY) = clamp(footY / 1000, 0, 0.99)` — avatar, NPC sprites and decor are y-sorted at the foot line; flat floor dressing (`proc-light-pool`, disturbed ground, footprints, mounds) sits at `-0.2`; UI depths (10/20) unchanged                                                       | `src/constants/depth.ts`, `RoomScene.addDecor`, `Player`, `NpcActor`           |
| Overlay hygiene          | On scene `PAUSE` the proximity prompt, every label chip, every NPC name chip and the hotbar caption hide; `RESUME` re-derives them                                                                                                                                                                | `RoomScene.hideWorldPrompts`, `HotbarHud`                                      |
| Objective line           | One line, 13 px, wraps at 772 px inside the 800 px viewport; the second HUD line follows the wrapped height                                                                                                                                                                                       | `RoomScene`                                                                    |
| Zone title card          | 16 px in the HUD strip right of the belt (x 660, y 574; rule 556) — no room content, prompt, chip or door leaf lives there — depth 15, 2 s hold + fade (reduced motion: 2.6 s hold)                                                                                                               | `PilotZoneScene.showZoneTitle`                                                 |
| Prompt placement         | The `SPACE / E` prompt and the name chip sit on the far side of the target from the avatar (above when approached from below, below when approached from above)                                                                                                                                   | `RoomScene.updateProximity`                                                    |
| Area signage             | `zoneSignage`: 11 px monospace, no plate, `#8497aa` on dark rooms / `#3d4d5c` on snow, depth 2 — a landmark, never a label over an object; status chips keep their plate                                                                                                                          | `PilotZoneScene.zoneSignage`                                                   |
| Feedback banner          | Screen y 72 by default; rooms with a north-wall door prompt lower it below the approach point (`feedbackMessageY`, deck 250)                                                                                                                                                                      | `RoomScene`, `UtilityCoreDeckScene`                                            |
| Overlay scrim            | 0.9 on the work surface and the feed panels — host chips/banners outside a panel never read as fragments                                                                                                                                                                                          | `WorkSurfaceScene`, `FeedPanelScene`                                           |
| Help lines               | 11 px minimum on every panel                                                                                                                                                                                                                                                                      | `WorkSurfaceScene`, `FeedPanelScene`                                           |
| Door leaves              | Interior pilot doors default to `plv1-arch-door` (PROVISIONAL, cyan-leaning tint) and every textured door carries a cyan threshold bar (the uniform interactable cue); airlocks use the iris strip's part-open frame; the blast door swaps `proc-door-core` ↔ `proc-door-core-open` with the gate | `PilotZoneScene.addPilotDoor`, `RoomScene.addDoor`, `RoomScene.setDoorTexture` |
| State art                | Utility bot standby → working (all feeds up); Core column held frame → 6-frame sync loop → held stable frame; Mast 04 damaged → restored antenna with a slow two-frame pulse                                                                                                                      | deck / chamber / yard scenes                                                   |
| Reduced motion           | Snowfall holds one faint frame; the Core column holds a mid frame; the mast pulse and the stable breathing stop; title card holds instead of fading                                                                                                                                               | `prefersReducedMotion()` gates                                                 |
| Ground drift             | Exterior snowfall tiles at depth −0.1 (slate tint, α 0.55): under every figure, marker and task graphic — no measured stimulus is ever covered                                                                                                                                                    | `ExteriorRecoveryYardScene.buildSnowfall`                                      |
| Provisional art register | Every `plv1-*` promotion is PROVISIONAL MODEL-SELECTED — NOT HUMAN-APPROVED; each scene keeps a procedural fallback when a texture is absent                                                                                                                                                      | `docs/game/PIXELLAB-RUNTIME-ASSET-PROVENANCE.md`                               |
