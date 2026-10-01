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

| File                               | PixelLab job                                                                      | Role                                                                                                                                    | Post-edits                                                                                                                                                       |
| ---------------------------------- | --------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `plates/dock-plate.png`            | `2aeff8c4` (create_image_pro, 688×384)                                            | Dock room plate; also the selected direction-A golden frame                                                                             | none                                                                                                                                                             |
| `plates/concourse-plate.png`       | `f2c2ea85` (create_image_pro, style ref = dock plate)                             | Concourse room plate                                                                                                                    | 3 mask-confined inpaints: W door `40ea700b`, E door `271e3af0`, lamp-table erase `c4b6e7ee`; composited with Pillow, all pixels outside the masks byte-identical |
| `opening/station-establishing.png` | `1376f7c5`                                                                        | Opening shot 1 (plateau establishing)                                                                                                   | none                                                                                                                                                             |
| `opening/shuttle-berth.png`        | `17cc1fec`                                                                        | Opening shot 2 (shuttle at the seal)                                                                                                    | none                                                                                                                                                             |
| `architecture/door-north.png`      | `e7cf8f73` idx 0 of 4                                                             | Dock → Concourse door leaf (80×96)                                                                                                      | none                                                                                                                                                             |
| `plates/workshop-plate.png`        | `d4c70eb3` (west bay) + `94c19c7e` (east bay, style ref = west bay)               | Records Workshop two-bay plate (1376×384): machine bay + records office, joined by the generations' facing painted doorways (vestibule) | Pillow stitch at x = 688 only; every pixel byte-identical to the two generations (no seam blending was needed)                                                   |
| `plates/laboratory-plate.png`      | `2e6ee856` (regen; first candidate `110ef84a` rejected: unrequested east doorway) | Diagnostics Laboratory plate (688×384)                                                                                                  | none                                                                                                                                                             |
| `plates/deck-plate.png`            | `301d5467`                                                                        | Utility Deck plate (688×384), machines dormant                                                                                          | none                                                                                                                                                             |
| `plates/core-plate.png`            | `33bbc6b5`                                                                        | Core Chamber plate (688×384), reactor dormant                                                                                           | none                                                                                                                                                             |
| `plates/yard-plate.png`            | `e5fa5c46` (west) + `0c92c2d4` (east, style ref = west)                           | Exterior Recovery Yard two-plate strip (1376×384); facing drift banks form the pass. Rendered by the yard scene since the V3 yard unit  | Pillow stitch at x = 688 only                                                                                                                                    |

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

## Station 080 correction (2026-09-18) — no generation spent

- `plates/dock-plate.png`, `plates/concourse-plate.png`,
  `plates/workshop-plate.png`: reproducible Pillow surgery on the kept V2
  paintings (`scripts/world-v2/plate_edits.py`; untouched sources under
  `docs/game/world-v2/plate-sources/`) — Dock door painted into the wall
  on the wall base, Concourse radio side-table painted out, Workshop false
  doorway painted as a sealed shutter. Hashes and edit notes in the
  world-v2 manifest.
- `props/supply-*.png` (4): hand-authored pixel art drawn with Pillow
  (`scripts/world-v2/paint_props.py`), no generator.
- Status unchanged: PROVISIONAL, not human-approved, asset-set version not
  bumped, nothing frozen.

## Station 080 U14-D2 (2026-09-30) — workshop cutting annex, no generation spent

- `plates/workshop-plate.png` is now **1376×608** (it was 1376×384): the
  two-bay hall plus the M04 cutting annex south of the machine bay.
- **Source:** `docs/game/world-v2/plate-sources/workshop-plate.v2.png`
  (the untouched stitch of generations `d4c70eb3` + `94c19c7e`), and
  nothing else. No `workshop-plate.v3.png` exists: the complete final
  plate is reproduced deterministically from the v2 source by the script,
  so a second source image would only duplicate the output.
- **Method:** local Pillow composition,
  `python scripts/world-v2/plate_edits.py workshop` (Pillow 10.4.0, run
  from the repository root; always name the room — without an argument the
  script rewrites every edited plate). PixelLab was not available for this
  unit; no generator was used. Every pixel is either copied from the same
  painting (the cutter, the bin, the hull band and face, the locker door
  leaf) or painted in colours taken from the painting's own palette; the
  exterior band, the ragged edge of the hull face and the floor wear are
  seeded (`random.Random(14)`, `(27)`, `(41)`, `(80)`, `(53)`, `(61)`),
  so the output is
  byte-reproducible.
- **Edits:**
  - the sealed-shutter edit of 2026-09-18 is kept (first step of the
    script);
  - the old sample-cutter island, its platform and the attached bin are
    painted out as floor, worn like the floor around it — the painted
    bay marking stays as an empty marked bay (top region, x 362–518,
    y 176–270);
  - the decorative south tool bench is replaced by a 64 px doorway
    (x 368–432) through the south hull, with the orange frame trims of
    the painting's other doorways (top region, x 362–448, y 270–383);
  - a 13×6-tile annex is painted below (floor x 192–608, y 384–576,
    mirrored about x 400): the cutter, re-used from the painting with its
    operating face turned north, at the northern centre (anchor 400, 456),
    its wooden platform completed on the side the old bin used to cover;
    the bin south of it (anchor 400, 556); a south wall, two wall lamps,
    floor seams, plate rivets and wear;
  - the hull face, which the painting crops at y 384, is continued to its
    base (y 412) by reflecting the painting's own rows 356–383, so panel
    seams and rivet columns run on; the weathering is not reflected (a
    patch the crop line cuts closes a few rows below it, every other
    reflected patch becomes plain face, and the continued rows carry
    seeded weathering of their own in the face's tone 44, 42, 65 at the
    painting's patch sizes and sparsity); under the two bays' straight
    south walls it ends in a base line, elsewhere it breaks up into the
    exterior along a ragged edge that begins gradually over the 28 px
    past each walled run (closeout of 2026-10-01: the earlier version
    reflected every patch — an hourglass at the crop line under the
    records office — and switched to the exterior on a vertical line at
    the south-east corner; rows 384–413 only changed, everything else
    byte-identical);
  - the annex's two side-wall tops run from the hull's wall top down to
    the annex's south wall (the annex is built onto the hull), which
    crosses the hull band in two 16 px strips (top region, x 176–191 and
    x 608–623, y 350–383) — a third edit area, added in the unit's fix
    pass because the independent visual review found the first version's
    walls detached from the hull, and ratified by the research owner on
    2026-10-01;
  - the rest of the lower band (south of the records office and beside
    the annex) is dark exterior — not floor, no doors, no stations.
  - Outside those areas the top 384 rows are pixel-identical to the
    previous plate (measured).
- **Final file:** 1376×608, SHA-256
  `473f1b4fa33905183c446114a72b7e4b9f38bf41c9013676d7f344fa84fd5dcd`
  (also in the world-v2 manifest; the pre-closeout plate was
  `a38a64cc…`). Independent visual review of the final plate
  (2026-10-01): all five criteria met (coherent, aligned with the
  collision geometry, stylistically consistent, no false affordances, no
  visible seams); both artefacts gone; three minor, non-blocking residuals
  recorded in the implementation register (§5.226). Not an approval of
  the asset set, which stays PROVISIONAL.
- Collision is unchanged in kind: it comes only from
  `src/world/layouts/workshop.ts` (43×19), which was updated in the same
  unit to match the painting.
- Status unchanged: PROVISIONAL, not human-approved, asset-set version not
  bumped, nothing frozen.
