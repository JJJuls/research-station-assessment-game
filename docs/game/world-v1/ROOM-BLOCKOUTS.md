# Room blockouts (World V1)

Sizes in 32 px tiles; the view is 32×18. Grid legend (StationMapBuilder):
`#` wall (collides), `.` floor, `-` doorway floor, `P` floor variant
(walkable), space = void. Tall props stand on `#` cells (their physical
footprint); low props never collide. Door triggers sit one tile inside the
doorway (existing convention: `PILOT_DOORS`). Coordinates are tile centres
unless noted; px = tile × 32 (+16 for centres where stated).

The Dock and Concourse carry full grids (U1 builds them). The other five
zones carry area tables and placement tables; their grids are drafted in
their units against these tables.

Topology (fixed): Dock S of Concourse; Records W; Laboratory N; airlock on
the Laboratory's north side; Yard beyond; Utility Deck E; Core beyond the
Deck. Purposeful route: Dock → Concourse → Records → Concourse →
Laboratory → Yard → Laboratory → Concourse → Records (return) → Concourse
→ Deck → Core.

---

## 1. Dock (36×24, theme `dock`) — U1

Composition: docking threshold (south airlock, sealed once the shuttle has
departed) with the shuttle nose visible through the south bay windows
(landmark), a docking apron in front of it, one circulation spine north to
the station entrance, the arrival terminal in a lit alcove on the west, a
believable cargo-staging area on the east behind a rail, a service column
with pipes on the south-west. No isolated crate on empty floor.

```
          1111111111222222222233333 3
0123456789012345678901234567890123456
####################################   row 0
#################--#################   row 1  north door (cols 17-18) → Concourse; sign right of it
#..................................#   row 2
#..................................#   row 3
#..................................#   row 4
#..................................#   row 5
#..................................#   row 6
#..................................#   row 7
#..................................#   row 8
#..................................#   row 9
#..................................#   row 10
#..................................#   row 11
#...##.....................##......#   row 12 terminal kiosk base (cols 4-5, U2) ; crate stack A (cols 27-28)
#..........................##......#   row 13
#..................................#   row 14
#.......##.........................#   row 15 service column (cols 8-9)
#.......##....................##...#   row 16 crate stack B (cols 30-31)
#..................................#   row 17
#...........PPPPPPPPPPPP...........#   row 18 docking apron
#...........PPPPPPPPPPPP...........#   row 19
#...........PPPPPPPPPPPP...........#   row 20
#...........PPPPPPPPPPPP...........#   row 21
#################--#################   row 22 docking airlock (cols 17-18), bay windows either side
####################################   row 23
```

| Object                  | Class      | Tile (px)                              | Notes                                                                                                                                                    |
| ----------------------- | ---------- | -------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| north door → Concourse  | 1 (route)  | (18, 1.5) → (576, 48)                  | lintel lamp lit; sign "STATION 080 · CONCOURSE" on the wall at cols 20–22                                                                                |
| arrival terminal        | 1 then 2   | (5, 12.5) → (160, 400)                 | U2: kiosk on cells (4–5, 12), on the marker's row, so it never sits under the top-left mission card (U1 finding V1); approach from the south; light pool |
| docking airlock (south) | 3 (sealed) | (18, 21.5) → (576, 688)                | `E — Docking airlock: shuttle secured`; never transitions                                                                                                |
| bay windows             | 4          | row 22, cols 9–11, 13–15, 21–23, 25–27 | painted exterior with the shuttle nose behind the central pair                                                                                           |
| crate stacks A / B      | 4          | cells (27–28, 12–13), (30–31, 16)      | inside the cargo rail; pallet jack and hazard strip decor                                                                                                |
| cargo rail              | 4 (low)    | col 24, rows 8–20                      | no collision; marks the staging area                                                                                                                     |
| service column          | 4          | cells (8–9, 15–16)                     | `plv1-utility-tower` + pipes                                                                                                                             |
| movement marker         | guidance   | (18, 12.5) → (576, 400)                | floor ring on the spine, removed when reached (existing mechanic)                                                                                        |
| spawn (arrival)         | —          | (18, 20) → (576, 640)                  | 48 px north of the airlock trigger; the airlock is class 3, so no reflex issue                                                                           |
| spawn (from Concourse)  | —          | (18, 5) → (576, 160)                   | 112 px inside the north door                                                                                                                             |

Walking (U2 placement): spawn → marker 240 px; marker → terminal 416 px
(straight west along row 12); terminal → north door ≈ 770 px (≈ 8 s total
straight-line). The arrival spawn is the docking threshold: (18, 20) →
(576, 640), 82 px inside the sealed airlock's trigger (outside its 72 px
radius) — the participant stands where the shuttle's hatch opened.

---

## 2. Station Concourse (40×26, theme `hub`) — U1

Composition: the circulation hub. One north–south spine (cols 17–22) and one
east–west axis (rows 11–14) cross at the centre; every door has a lintel and
a wall sign. The operations desk island (Vale) stands east of the crossing
under the station-status wall (landmark). Work surfaces are integrated into
the architecture: the plan board on the north wall, the incident desk on the
east service counter, the quality packet on the south-west side counter, the
monitor gauge on the east wall south of the Deck door, the reading desk with
the faulty lamp in the north-west nook. Seating, lockers, a notice board and
a crate group are quiet structure.

```
          1111111111222222222233333333334
0123456789012345678901234567890123456789
########################################   row 0
###################--###################   row 1  north door (cols 19-20) → Laboratory
#......................................#   row 2
#......................................#   row 3
#.....##...............................#   row 4  reading desk (cols 6-7) — M05 lamp
#......................................#   row 5
#......................................#   row 6
#......................................#   row 7
#........................#######.......#   row 8  status wall panel base (cols 25-31)
#........................#######.......#   row 9
#........................#######.......#   row 10 ops counter front
#......................................#   row 11
-......................................-   row 12 west door → Records ; east door → Deck
-......................................-   row 13
#......................................#   row 14
#......................................#   row 15
#......................................#   row 16
#......................................#   row 17
#......###.............................#   row 18 quality side counter (cols 6-8)
#......................................#   row 19
#......................................#   row 20
#.##...........................##......#   row 21 crate group (2-3) ; bench block (31-32)
#.##...................................#   row 22
#......................................#   row 23
###################--###################   row 24 south door (cols 19-20) → Dock
########################################   row 25
```

| Object                       | Class      | Tile (px)                                    | Notes                                                                              |
| ---------------------------- | ---------- | -------------------------------------------- | ---------------------------------------------------------------------------------- |
| north door → Laboratory      | 1/2        | (20, 1.5) → (640, 48)                        | sign "DIAGNOSTICS LABORATORY"                                                      |
| south door → Dock            | 2          | (20, 23.5) → (640, 752)                      | sign "DOCK"                                                                        |
| west door → Records Workshop | 1/2        | (1.5, 13) → (48, 416)                        | sign "RECORDS WORKSHOP"                                                            |
| east door → Utility Deck     | 1/2        | (38.5, 13) → (1232, 416)                     | sign "UTILITY DECK"                                                                |
| Vale (ops desk)              | 1 (anchor) | (28.5, 11.5) → (912, 368)                    | in front of the counter, facing the crossing; status wall behind (rows 8–9)        |
| Kai (return shift)           | 2          | (31.5, 11.5) → (1008, 368)                   | at `return_hub`+ (existing rule)                                                   |
| plan board (M01)             | 1/2        | (13, 1.5) → (416, 48)                        | wall board west of the north door; approach from the south                         |
| incident desk (M14)          | 1/2        | (37, 7) → (1184, 224)                        | console on the east service counter (wall cells col 38 rows 5–9 carry the counter) |
| quality packet (M12 o1)      | 1/2        | (7, 17.5) → (224, 560)                       | on the south-west side counter (cells 6–8, 18)                                     |
| monitor gauge (M09)          | 2          | (37.5, 18) → (1200, 576)                     | wall gauge on the east wall; reading shown as a small dial glyph, not a ribbon     |
| reading desk lamp (M05 o1)   | fault      | (7, 4.5) → (224, 144)                        | a real desk with a lamp; the flicker is the lamp; approach from the south          |
| notice board                 | 4          | (1.5, 6) → wall                              |                                                                                    |
| seating benches              | 4          | cells (31–32, 21); (34–36, 21) low           | south-east                                                                         |
| crate group / lockers        | 4          | cells (2–3, 21–22); south wall cols 4–9      | quiet storage                                                                      |
| light pools                  | 4          | crossing, ops desk, plan board, side counter | warm in occupied areas                                                             |
| spawn from Dock              | —          | (20, 20) → (640, 640)                        | 112 px inside                                                                      |
| spawn from Laboratory        | —          | (20, 5) → (640, 160)                         |                                                                                    |
| spawn from Records           | —          | (5, 13) → (160, 416)                         |                                                                                    |
| spawn from Deck              | —          | (35, 13) → (1120, 416)                       |                                                                                    |

Spacing (tiles): plan board ↔ incident desk 24; incident desk ↔ Vale 16;
Vale ↔ quality packet 22; quality packet ↔ gauge 30; gauge ↔ Vale 11.
Walking (act 2 in order: south spawn → Vale → plan board → incident desk →
quality packet → Vale → west door) ≈ 3 200 px ≈ 18 s.

---

## 3. Records Workshop (44×26, theme `workshop`) — U3

Areas (west → east along one aisle, rows 12–15): entry from the Concourse
(east door, col 43 rows 12–13) → handover desk and work order board in the
east reception bay → document-processing desks (case workspace M02, quality
packet o2 M12, shift report desk M22) along the north records wall → press
and assembly bay (label presses A/B M03, sample cutter + disposal chute M04,
assembly bench, relay bench M21) on the south side → receiving and storage
bay (resupply pallet, component locker, calibration bench M07, dispatch
console M06, lattice bench M13, feed console M20, seal log M11) on the west.

| Object                      | Class      | Tile       | Area                                   |
| --------------------------- | ---------- | ---------- | -------------------------------------- |
| east door → Concourse       | 2          | (42.5, 13) | reception                              |
| work order board            | 1 (anchor) | (39, 4)    | reception, wall board                  |
| outbound handover desk      | 1/2        | (39, 21)   | reception, south side                  |
| case workspace (M02)        | 1          | (30, 4)    | records wall desk 1                    |
| quality packet o2 (M12)     | 1          | (22, 4)    | records wall desk 2                    |
| shift report desk (M22)     | 1          | (14, 4)    | records wall desk 3                    |
| label press A (M03 o1)      | 1          | (30, 21)   | press bay                              |
| label press B (M03 o2)      | 1          | (24, 21)   | press bay                              |
| sample cutter (M04)         | 1          | (16, 21)   | press bay; disposal chute at (12, 22)  |
| assembly bench              | 2          | (33, 17)   | press bay side counter                 |
| relay bench (M21)           | 1          | (19, 17)   | press bay side counter                 |
| resupply pallet (container) | 2          | (6, 8)     | receiving bay                          |
| component locker            | 2          | (3, 12)    | receiving bay, west wall               |
| calibration bench (M07)     | 1/2        | (6, 21)    | receiving bay, south                   |
| dispatch console (M06)      | 1          | (9, 4)     | receiving bay, north                   |
| lattice bench (M13)         | 1          | (6, 16)    | receiving bay, centre                  |
| feed console (M20 resume)   | 3 → 2      | (3, 5)     | receiving bay, north-west wall console |
| seal log (M11 secondary)    | 2          | (12, 9)    | receiving bay notice desk              |
| spawn from Concourse        | —          | (39, 13)   |                                        |

Records wall: shelving units (`prop-archive-shelves`, new candidate 6) along
row 1–2 from col 12 to col 34; the long wall is the landmark. Machinery
blocks under every desk/bench (2×1 cells). Spacing between consecutive
guided stations ≥ 8 tiles (case workspace → press A 17 tiles; press A →
sample cutter 14; cutter → dispatch 24; dispatch → calibration 17;
calibration → quality o2 24; quality → lattice 20). Return-shift order
(press B → relay bench → report desk → handover desk) 6 / 14 / 30 tiles.

---

## 4. Diagnostics Laboratory (48×24, theme `ops`) — U4

Areas: south entry lobby (door col 24 rows 22) → briefing bay on the WEST
side off the lane (Kai's desk, Noor's relay speaker, the orientation
console) → the main aisle (rows 10–13, cols 4–43) with four analysis bays
along its north side (bay 1 evidence table M15, bay 2 protocol console
M16, bay 3 training rig M17, bay 4 diagnostic board M18) → the signal
display as a wall panel over the aisle's centre (the participant reads it;
interacts through the case desk console under it) → the airlock lobby in
the north-east (airlock door col 40 row 1). The route from the south door
to the airlock is a straight, unobstructed lane along cols 36–41.

| Object                       | Class      | Tile                   |
| ---------------------------- | ---------- | ---------------------- |
| south door → Concourse       | 2          | (24, 22.5)             |
| north airlock → Yard         | 1/2        | (40, 1.5)              |
| Kai (briefing desk)          | 1 (anchor) | (8, 6)                 |
| console orientation          | 2          | (8, 16)                |
| signal analysis case desk    | 2          | (24, 6)                |
| signal display wall panel    | 4          | wall, cols 20–28 row 1 |
| bay 1 evidence table (M15)   | 1          | (14, 8)                |
| bay 2 protocol console (M16) | 1          | (22, 8)                |
| bay 3 training rig (M17)     | 1          | (30, 8)                |
| bay 4 diagnostic board (M18) | 1          | (38, 8)                |
| Noor relay speaker           | 4          | (4, 6) wall            |
| spawn from Concourse         | —          | (24, 18.5)             |
| spawn from Yard              | —          | (40, 6)                |

Bays are 6 tiles apart on the aisle (≈ 1.1 s) — they are one incident's
four independent windows, presented as neighbouring bays; each bay is a
separate alcove with its own bench, partial wall and light so they never
compete visually; only the next bay carries the lamp/pool treatment.

---

## 5. Exterior Recovery Yard (56×32, theme `exterior`) — U5

Areas: airlock apron (south-centre, cols 22–33, rows 24–30; airlock door
col 28 row 30; field-kit locker, yard supply crate, Noor) → coupling service
area (west, cols 4–14, rows 16–26: coupling housing, thaw rack, the M05
cable flag on the guy line) → marked excavation field (centre-north, cols
20–33, rows 6–15, staked and taped) → Mast 04 on its footing (cols 36–40,
rows 4–8; landmark) → metal-recovery compound (east, cols 42–53, rows 12–24,
fenced with one gate, rig, salvage tray, sorting bench) → uplink posts (north-
west, cols 6–16, rows 4–10, posts A/B, line panel, cable run). Return path:
a cleared packed-snow service path links every area back to the apron.
Boundaries are snowbanks, fence, cabling and equipment — no rectangles.

| Object                 | Class          | Tile       |
| ---------------------- | -------------- | ---------- |
| airlock → Laboratory   | 2 / 1 (return) | (28, 29.5) |
| Noor                   | 1 (anchor)     | (24, 26)   |
| field-kit locker       | 2 (container)  | (32, 26)   |
| yard supply crate      | 2              | (34, 24)   |
| coupling (M19)         | 1              | (8, 21)    |
| thaw rack              | 4              | (8, 18)    |
| cable flag (M05 o2)    | fault          | (14, 25)   |
| excavation stake (M23) | 1              | (20, 12)   |
| Mast 04 (M20)          | 1              | (38, 8)    |
| compound gate          | 4              | (42, 18)   |
| magnet rig (M24)       | 1 (= bench)    | (48, 15)   |
| sorting bench          | 1 (= rig)      | (50, 21)   |
| salvage tray           | 4              | (52, 13)   |
| uplink post A (M26)    | 1 (= B, panel) | (8, 6)     |
| uplink post B          | 1              | (14, 9)    |
| line status panel      | 1              | (11, 4)    |
| spawn from Laboratory  | —              | (28, 25)   |

The M23 plot (dig registry zone) and the M24 rig pad (F works only here)
move with their sites; forms' target cells are re-expressed relative to the
plot origin so the form assignment is unchanged.

---

## 6. Utility Deck (44×26, theme `utility`) — U6

Areas: entry from the Concourse (west door, col 0 rows 12–13) → review
station (shift review panel + station systems board, north-west, cols
4–12, rows 3–6) → the systems trunk (centre, cols 20–23, rows 4–10;
landmark; pipes and cable trays leave it toward three bays) → coolant bay
(south-west, cols 5–12, rows 17–22: valve station, intake, pipes) →
calibration bay (south-centre, cols 18–25, rows 17–22: breaker cabinet)
→ distribution bay (south-east, cols 31–38, rows 17–22: bus and coupler
rack) → Core door alcove (north-east, cols 34–38, rows 1–4; blast door;
manifold panel beside it). Walkways between bays are 4 tiles wide.

| Object                   | Class     | Tile      |
| ------------------------ | --------- | --------- |
| west door → Concourse    | 2         | (1.5, 13) |
| Core door → Core Chamber | 3 → 1     | (36, 2.5) |
| shift review panel       | 1         | (8, 5)    |
| station systems board    | 4 (state) | (12, 4)   |
| systems trunk            | 4         | (21.5, 7) |
| coolant feed valve       | 1         | (8, 19)   |
| calibration breaker      | 1         | (21, 19)  |
| distribution bus         | 1         | (34, 19)  |
| core feed manifold       | 4 (state) | (32, 3)   |
| utility bot              | 4         | (40, 22)  |
| spawn from Concourse     | —         | (5, 13)   |
| spawn from Core          | —         | (36, 6)   |

---

## 7. Core Chamber (32×22, theme `core`) — U6

Composition: octagonal chamber; entry from the south (door col 16 row 20)
→ a short approach between two coolant columns → the control position in
front of the Core column (centre, cols 14–17, rows 6–9). Kai at the feed
console on the east; the status console on the west; no clutter wall. The
exit is always available (existing exit gate only during synchronisation).

| Object                  | Class     | Tile             |
| ----------------------- | --------- | ---------------- |
| south door → Deck       | 2         | (16, 19.5)       |
| Core (control pedestal) | 1         | (16, 12)         |
| Core column (visual)    | 4         | (16, 8)          |
| Kai (feed console)      | 2         | (23, 11)         |
| status console          | 4 (state) | (9, 11)          |
| coolant columns         | 4         | (11, 9), (21, 9) |
| spawn from Deck         | —         | (16, 16)         |
