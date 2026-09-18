# Collision and depth audit — Station 080 correction (2026-09-18)

## Root causes (structural, found before any room was touched)

1. **The avatar's physics body was the whole figure** — 32×42 px around a
   ~48 px character (`Player.ts`, origin −18 … +24). The head collided with
   everything north of the feet, so the avatar stopped ~28 px short of
   anything it approached from the south and could not pass gaps its feet
   fit through. This is the "invisible boundary during ordinary walking"
   class. Fixed: a 22×14 **feet box** (x ± 11, y + 10 … + 24).
2. **Props collided on whole 32 px cells** ('X' footprints, fractional
   rectangles rounded outward). Painted furniture rarely lies on the cell
   lattice, so every prop had an invisible wall on one side and was
   walk-through on the other; several props had no cell at all (Concourse
   radio table, incident desk, gauge; the Yard's painted uplink rack), and
   some cells sat where nothing is painted (Dock: the mid-west crate's cell
   was one column east of the crate; Yard: the "line panel" cells). Fixed:
   **pixel solids** `[x, y, w, h]` measured on the plate, per room
   (`*_SOLIDS` in `src/world/layouts/`).
3. **NPCs did not collide** — the avatar walked through Vale and Noor.
   Fixed: every NPC gets a foot solid (`npcSolid`, 22×12 at the foot line).
4. **Baked art cannot occlude** — a plate is one background image, so a
   doorway arch painted on it can never be in front of the avatar. Fixed
   where it mattered (Workshop vestibule) with a foreground layer cut from
   the plate at runtime.

Compatibility: cell walls ('#', void, remaining 'X') keep a **28 px skirt**
south of their south face (`WALL_SKIRT`), so the feet box stops exactly
where the old head stopped — rooms not yet re-authored keep their audited
north–south geometry and drivers. Pixel solids carry no skirt; their south
edge stops 6 px short of the painted base so the feet stand right at a
prop's front. The pure model (`grid.ts` `bodyFits`, `skirtRects`) mirrors
the engine exactly; registry, spawn-clearance and route-model suites pass
on it unchanged (49/49).

## Method

- **Offline overlay** (plate + cells + solids + anchors + approach boxes)
  to author and review every room without a browser.
- **DEV-only in-engine overlay** `?collision=1` (`RoomScene.drawCollisionOverlay`,
  compiled out of participant builds by `import.meta.env.DEV`): wall cells
  red, legacy 'X' cells magenta, skirts and pixel solids orange, the live
  feet box cyan.
- **Real-input audit spec** `e2e/collision_audit.spec.ts` (ordinary held
  keys, no teleport, no state mutation; grid navigator `e2e/navGrid.ts`):
  for every solid and every reachable face the avatar walks to 20 px off
  the face and pushes in until it stops; the stop must equal the pure
  model's prediction within 3 px — the avatar can neither enter what is
  painted nor be stopped by anything that is not. Lane sweeps do the same
  along the open rows (invisible / legacy colliders away from props);
  finally the spawn must be reachable again (no trap).

## Results

| Room            | Status                                                                                       | Evidence (`collision-audit/`)                                                           |
| --------------- | -------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| Dock            | re-authored, audit **passed**                                                                | `dock-clean.png`, `dock-overlay.png`, `dock-findings.json` (9.7 min, every face ≤ 3 px) |
| Concourse       | re-authored, audit **passed\***                                                              | `station_concourse-*.png`, `station_concourse-findings.json`                            |
| Workshop        | vestibule re-authored                                                                        | `../workshop-vestibule/` + `e2e/world_v2_vestibule_look.spec.ts` (passed)               |
| Yard            | see the handoff                                                                              | —                                                                                       |
| Lab, Deck, Core | **not re-authored** — still cell footprints + skirt (behaviour as before, feet box narrower) | next unit                                                                               |

\* Concourse: 44/44 solid faces within 3 px. One lane sweep (row y 250,
eastward) read 86 px short of the model: the landing (y ≈ 246.5–250) grazed
the gauge pedestal's top edge (solid y 270 = feet bottom at y 246) and the
model rounded the landing to an integer row. Classified **intended
environmental collision + audit rounding**, not a defect; the model now
uses the unrounded landing and the sweep row moved to y 236.

## Classified obstructions (owner-reported and found)

| Where                                                                              | Classification                                            | Action                                                                          |
| ---------------------------------------------------------------------------------- | --------------------------------------------------------- | ------------------------------------------------------------------------------- |
| Everywhere: stop ~28 px south of props, can't pass visible gaps                    | collider larger than visible geometry (whole-figure body) | feet box                                                                        |
| Dock mid-west crate: wall in open floor one column east, crate walk-through        | incorrect static body position                            | pixel solids                                                                    |
| Dock door leaf 40 px above the deck                                                | foreground/depth illusion (sprite in the pipe band)       | painted into the wall on the wall base; anchor y 64 → 100                       |
| Concourse radio side-table: walk-through, skewed                                   | missing collider + defective art                          | painted out (floor of the same rows)                                            |
| Concourse operations desk: 26 px invisible wall east, top strip walk-on            | collider ≠ art (cells)                                    | pixel solid 474,180 76×36                                                       |
| Concourse NE table, lockers, board, reading table                                  | collider ≠ art (cells)                                    | pixel solids                                                                    |
| Concourse gauge on the south hull ledge                                            | art outside the floor                                     | grounded on the deck (anchor y 300 → 264), base solid; approach point unchanged |
| Concourse incident desk un-footprinted                                             | missing collider                                          | base solid (the feet box fits the east strip)                                   |
| Concourse storm-damage decals on the locker fronts                                 | incorrect placement                                       | moved to the deck at the wall foot                                              |
| Vale / Noor walk-through                                                           | missing collider                                          | NPC foot solids                                                                 |
| Workshop: avatar walks over the wall between the bays                              | foreground/depth illusion + missing wall collider         | wall-face solid + foreground wall mass with door openings                       |
| Workshop black doorway to nowhere                                                  | misleading affordance                                     | sealed service shutter                                                          |
| Workshop locker vs Sample kit                                                      | nearest-wins ambiguity                                    | bundle reach 64 → 44 px                                                         |
| Workshop loose objects above the avatar                                            | depth                                                     | foot-line depth sort                                                            |
| Yard painted uplink rack walk-through; "line panel" cells where nothing is painted | missing collider + legacy collider                        | see the handoff                                                                 |

## Not done (candid)

Laboratory, Utility Deck, Core and the Yard's east half keep their cell
footprints (with the skirt). They behave as before except that the feet
box is narrower; their props still have cell-sized colliders. The 1920×1080
runs of the audit spec were not executed this session (`WV3_VIEWPORT`
supports it). The vestibule's door sills are slanted in the painting while
its colliders are rectangular — the crossing band is the sills' common
floor span.
