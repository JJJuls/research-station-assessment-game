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

## Results (session 2, 1280×720, real input, frozen runner, final tree `c8dfd52d`)

A "face" is one side of one collider. A face is pushed when the pure model
lets the avatar stand 20 px off its middle (else 12 / 6 / 2 px) and a path
exists; a face with no such stand **abuts a wall or another collider at its
middle** — the avatar cannot reach it either — and is recorded, not pushed.
An offline classification of every face against the pure model
(sessions' scratch tool) gives the same split as the runs below, i.e. the
audit pushes **every reachable face**.

| Room          | Colliders | Pushed (faces + lane sweeps) | Not pushed (abuts wall / neighbour)                          | Largest engine-vs-model error | Result            |
| ------------- | --------- | ---------------------------- | ------------------------------------------------------------ | ----------------------------- | ----------------- |
| Dock          | 10        | 18                           | 28                                                           | 0.92 px                       | **pass**          |
| Concourse     | 10 + Vale | 24                           | 26                                                           | 1.00 px                       | **pass**          |
| Workshop      | 16        | 20                           | 48 (benches line the walls)                                  | 0.83 px                       | **pass**          |
| Laboratory    | 3 + Kai   | 11                           | 11                                                           | 0.83 px                       | **pass**          |
| Utility Deck  | 3         | 7                            | 9                                                            | 1.00 px                       | **pass**          |
| Core Chamber  | 3         | 8                            | 6                                                            | 0.83 px                       | **pass**          |
| Recovery Yard | 23 + Noor | 90                           | 12 (west bank, alcove cheeks, props inside the rig compound) | 1.00 px                       | **pass** (48 min) |

Every pushed face stopped within 1 px of the model, and every room's spawn
was reachable again afterwards (no trap). Evidence per room in
`collision-audit/`: `<zone>-clean.png`, `<zone>-overlay.png` (DEV overlay)
and `<zone>-findings.json` (every push: landing, model stop, observed stop;
written after every face, so a cut-short run still shows what was pushed).

### Audit-tool defects found and fixed in session 2 (candid)

1. **False pass by under-testing.** The first all-rooms run reported the
   Yard "passed" in 2 minutes: it had pushed **1 of 102** checks. The path
   planner refused to start from a position hugging a collider (where every
   push ends), so every later face was recorded "not reachable" and never
   pushed — and a run with nothing pushed has nothing to fail. Fixed in
   `e2e/navGrid.ts` (within 24 px of the start a cell only has to fit; the
   clearance margin applies beyond), with a pure regression
   (`e2e/nav_grid_hug.spec.ts`), and re-verified: the Yard now pushes 90.
   The interior rooms were NOT affected in their totals (their pushed
   counts equal the offline count of reachable faces before and after), but
   the Workshop run had aborted on the same defect ("no path" beside the
   cutter island) and passes now.
2. **Fixed timeouts.** 25 min did not fit the Yard's colliders; the budget
   now scales with the collider count (30 s per face).
3. **Session-1 wording.** "44/44 solid faces" for the Concourse was wrong:
   the audit pushes reachable faces only (24 of 50 checks here).

Limits: a face is classified at its MIDDLE only (a long face partly blocked
by a neighbour counts by its middle); the audit was not run at 1920×1080.

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

Session 2 re-authored Laboratory, Utility Deck, Core and the whole Yard;
the Workshop's benches and machines still collide as cells + skirt (only
its vestibule is pixel-authored). The 1920×1080 runs of the AUDIT spec were
not executed (`WV3_VIEWPORT` supports it); the 1080 look tours were. The vestibule's door sills are slanted in the painting while
its colliders are rectangular — the crossing band is the sills' common
floor span.
