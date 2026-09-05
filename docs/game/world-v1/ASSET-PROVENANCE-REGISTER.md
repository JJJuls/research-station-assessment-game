# Asset and provenance register (World V1)

Status of every `plv1-*` and `prop-*` art file: **PROVISIONAL MODEL-SELECTED
— NOT HUMAN-APPROVED** (`docs/game/PIXELLAB-RUNTIME-ASSET-PROVENANCE.md`,
`docs/game/PILOT-ASSET-SELECTION-AND-PROVENANCE.md`). Nothing in this
register approves an asset; it records what the rebuild uses, what it
rejects, and the bounded generation plan.

## 1. Existing-asset audit (integration verdicts)

| Family                                                                    | Size / projection                         | Verdict                                                                                                                                                                         |
| ------------------------------------------------------------------------- | ----------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Player `plv1-player-a` rotations / walk 8 / idle 4                        | 96×96 frames, figure ≈ 32×48, straight-on | **use** (unchanged)                                                                                                                                                             |
| Player action sheets scan / dig / pickup; effects dust / pulse / sparks   | 96×96, 64×64 one-shot                     | **use** (state-driven)                                                                                                                                                          |
| NPC stills Vale / Kai / Noor (`plv1-*`, work pairs)                       | 96×96, same register as the player        | **use**                                                                                                                                                                         |
| Robots bot-standby / bot-working                                          | 96×96                                     | **use** (Deck state art)                                                                                                                                                        |
| `plv1-arch-door`, `-vent`, `-grille`, `-pipes`                            | 66×74 / 66×68 crops, olive register       | **use** door leaf on whole-tile anchors; vent/grille/pipes only where the olive register is neutralised by a tint; no cyan tint on the leaf (the lintel lamp carries the class) |
| `plv1-core-coolant-column`, pillars, `-core-console`                      | 56×132, 32×80, 56×72                      | **use** as Core landmarks                                                                                                                                                       |
| `plv1-utility-tower`, `-panel`, `-desk`                                   | 64×80, 64×92, 144×56                      | **use** in the Deck as machinery mass on wall cells (V4 removed them for size; V1 has the room for them)                                                                        |
| sequences core-sync / airlock-open / antenna-signal                       | strips                                    | **use** (state-driven; held frame under reduced motion)                                                                                                                         |
| `plv1-fx-snowfall`                                                        | 96×96 ×9                                  | **reject** (ambient motion)                                                                                                                                                     |
| `prop-dock-*`, `prop-hub-*`, `prop-archive-*` (Phase F)                   | 32/48/64 on-grid                          | **use** (dock terminal, airlock, crates; hub status board, console; archive shelves/panels/racks as records-wall units)                                                         |
| Wang tilesets interior-v3 / dock-v3 + procedural theme sets               | 32 px, 16-tile Wang                       | **use**; the kit adds wall-face variants and a lintel band                                                                                                                      |
| `proc-*` foundry (128 textures)                                           | 24×24 icons … 112×136                     | **use** where in register; `proc-light-pool` never as an interactable; `proc-npc-*` fallbacks unused                                                                            |
| diagonal player frames, `*-work-a` duplicates, `style-anchor-v1`, tuxemon | —                                         | **not used**                                                                                                                                                                    |
| translucent plate rectangles (code, not assets)                           | —                                         | **removed**                                                                                                                                                                     |

## 2. Kit gaps (candidates for generation — after the kit dimensions are frozen in U1)

Ordered by product value. Each candidate: exact size, top-down/three-quarter
straight-on projection, transparent background, light from top-left,
32 px density, prompt and provenance recorded, in-engine inspection at 1:1
before promotion. **Hard cap: 32 candidate calls for the whole mission.**
Full room screenshots are never generated as backgrounds.

| #     | Candidate                             | Size (px) | Zone / use                                  | Unit |
| ----- | ------------------------------------- | --------- | ------------------------------------------- | ---- |
| 1     | relief shuttle, exterior, landed      | 192×96    | opening shot; Dock bay-window silhouette    | U2   |
| 2     | dock bay window module (3 tiles)      | 96×48     | Dock north/south wall                       | U1   |
| 3     | docking threshold / airlock frame     | 96×80     | Dock south wall                             | U1   |
| 4     | operations desk island (long counter) | 160×64    | Concourse landmark                          | U1   |
| 5     | station status wall panel             | 192×64    | Concourse restoration board                 | U1   |
| 6     | records shelving unit                 | 64×80     | Records wall (×N)                           | U3   |
| 7     | document desk with reading lamp       | 64×48     | Records desks; Concourse reading nook (M05) | U3   |
| 8     | label press                           | 64×64     | Records press area                          | U3   |
| 9     | resupply pallet                       | 64×48     | Records receiving bay                       | U3   |
| 10    | signal display wall panel (waveform)  | 192×64    | Laboratory landmark                         | U4   |
| 11    | analysis bay console (desk)           | 64×48     | Laboratory bays ×4 variants                 | U4   |
| 12    | Mast 04 damaged / restored            | 64×128    | Yard landmark (2 states)                    | U5   |
| 13    | coolant coupling housing              | 64×64     | Yard service area                           | U5   |
| 14    | magnet recovery rig                   | 96×96     | Yard compound                               | U5   |
| 15    | uplink post                           | 32×80     | Yard ×2                                     | U5   |
| 16    | fence segment + gate                  | 32×48     | Yard compound boundary                      | U5   |
| 17    | snowbank / drift                      | 96×32     | Yard boundaries                             | U5   |
| 18    | field-kit locker                      | 48×64     | Yard apron                                  | U5   |
| 19    | systems trunk (tall)                  | 96×128    | Deck landmark                               | U6   |
| 20    | coolant valve station                 | 64×64     | Deck bay 1                                  | U6   |
| 21    | calibration breaker cabinet           | 64×80     | Deck bay 2                                  | U6   |
| 22    | distribution bus                      | 96×64     | Deck bay 3                                  | U6   |
| 23    | blast door (Core)                     | 96×96     | Deck alcove / Core                          | U6   |
| 24    | overhead lintel band                  | 96×32     | all interiors (door frames)                 | U1   |
| 25    | ceiling light fixture (on/off)        | 32×16     | all interiors                               | U1   |
| 26    | cable tray straight / junction        | 32×32     | interiors                                   | U1   |
| 27    | seating bench                         | 64×32     | Concourse                                   | U1   |
| 28    | notice board                          | 48×48     | Concourse                                   | U1   |
| 29–32 | reserve for rejected regenerations    | —         | —                                           | —    |

Procedural fallbacks exist (or will be added to the kit in U1) for every
candidate, so a rejected or absent asset never blocks a unit.

## 3. Rejection rules

Reject explicitly when: perspective is isometric or the front face is
foreshortened; light direction differs; density differs from 32 px; the
palette leaves the charcoal/slate/steel register (accents only cyan/amber);
the silhouette does not read at 1:1 in-engine; the size deviates from the
request. Rejected candidates are listed here with the reason.

## 4. Generation log

| #                                                 | Candidate | Prompt (verbatim) | Result file | Verdict | Reason |
| ------------------------------------------------- | --------- | ----------------- | ----------- | ------- | ------ |
| (none yet — filled in by the unit that generates) |
