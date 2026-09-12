# World V2 rescue — asset provenance register

Status: **PROVISIONAL, MODEL-SELECTED — NOT HUMAN-APPROVED.** Generator:
PixelLab MCP (subscription generations; ~280 used this pass of 1860).
SHA-256 per file in `public/assets/world-v2/manifest.json`. No commercial
reference imagery was used as input; every prompt is original. The
benchmark games (Stardew Valley, Graveyard Keeper, etc.) were quality
references only — no asset, palette file or layout was copied.

## Production model

The rescue slice renders each rebuilt room as an **authored painted
plate**: one coherent key-art painting is the entire room background;
the collision grid (`src/world/layouts/dock.ts`, `concourse.ts`) is
mapped cell-by-cell to the painting; interactive objects, door leaves
and dynamic lighting are layered sprites. Art can therefore never change
collision or interaction geometry (the logical layer stays the only
collision source — same structural guarantee as the previous tile-art
swaps).

## Accepted assets

| File                               | PixelLab job                                          | Role                                                        | Post-edits                                                                                                                                                       |
| ---------------------------------- | ----------------------------------------------------- | ----------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `plates/dock-plate.png`            | `2aeff8c4` (create_image_pro, 688×384)                | Dock room plate; also the selected direction-A golden frame | none                                                                                                                                                             |
| `plates/concourse-plate.png`       | `f2c2ea85` (create_image_pro, style ref = dock plate) | Concourse room plate                                        | 3 mask-confined inpaints: W door `40ea700b`, E door `271e3af0`, lamp-table erase `c4b6e7ee`; composited with Pillow, all pixels outside the masks byte-identical |
| `opening/station-establishing.png` | `1376f7c5`                                            | Opening shot 1 (plateau establishing)                       | none                                                                                                                                                             |
| `opening/shuttle-berth.png`        | `17cc1fec`                                            | Opening shot 2 (shuttle at the seal)                        | none                                                                                                                                                             |
| `architecture/door-north.png`      | `e7cf8f73` idx 0 of 4                                 | Dock → Concourse door leaf (80×96)                          | none                                                                                                                                                             |

## Rejected / study material

- Direction B (`2ef9864f`, clean Antarctic, oblique projection) and
  direction C (`32c1cc32`, emergency-lit, isometric) — projection
  mismatch with the top-down character sprites; kept as direction
  studies in `docs/verification/professional-world-rescue-v2/directions/`
  (B's floor wayfinding lines and C's frost/emergency-lamp language were
  folded into the chosen direction as runtime effects).
- Door candidates idx 1–3 of `e7cf8f73` — style / readability mismatch.
- The Concourse plate's small lamp table (baked by generation) — erased
  by inpaint `c4b6e7ee` to free the floor Vale stands on.

## Reused assets (unchanged provenance)

Player/NPC sprites (`assets/characters/`, `assets/pixellab-runtime/npcs/`),
the w1 prop set still used as layered sprites (`w1-evidence-desk`,
`w1-gauge`, `w1-airlock-closed` [hidden interaction marker]) — see
`docs/game/world-v1/ASSET-PROVENANCE-REGISTER.md`.
