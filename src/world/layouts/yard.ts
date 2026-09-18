/**
 * Exterior Recovery Yard layout (World V2 rebuild — 43×12 two-plate
 * strip). Pure.
 *
 * TWO painted 688×384 plates stitched side-by-side
 * (`public/assets/world-v2/plates/yard-plate.png`, 1376×384): the airlock
 * apron and worksite (west: frozen coupling and its heater, the uplink
 * posts with the line-status panel between them, Mast 04 on its rock
 * footing, the supply crate and the guy-line flag by the airlock) and the
 * recovery field (east: the staked excavation field, the gantry magnet
 * rig over the scrap catchment, the control bench and the parts cart).
 * The two halves join through the DRIFT PASS the generations' facing
 * snow banks leave open (cols 18–25, rows 6–7) — no seam blending, no
 * invented wall.
 *
 * Machine-audited geometry (32×42 body, ±12 px landing box, nearest-wins
 * radius 72, spawn/door clearance, BFS connectivity, slot-width audit):
 * the snow floor is rows 2–8 on both halves; the hull band (rows 9–11)
 * carries the airlock's door pocket; every prop the player must not walk
 * through has its painted base as its footprint.
 */
import type { BlockoutRect } from './blockout';
import { blockoutRows } from './blockout';
import type { SolidRect } from './grid';

export const YARD_COLS = 43;
export const YARD_ROWS = 12;

export const YARD_FLOOR: readonly BlockoutRect[] = [
  [0.7, 2, 17.3, 7], // west half (plate A)
  [18, 6, 8, 2], // the drift pass between the halves
  [25.5, 2, 16.5, 7], // east half (plate B)
  [9.6, 9, 2.6, 1], // airlock door pocket
];

export const YARD_FOOTPRINTS: readonly BlockoutRect[] = [
  [0.8, 3, 1.6, 1.6], // rock cluster (NW)
  [0.5, 5, 3.4, 2.5], // frozen coupling pipe assembly (W)
  [6, 2, 0.6, 1], // uplink post A
  [8.3, 2.2, 1.6, 1.2], // line status panel
  [12, 2, 0.6, 0.9], // uplink post B
  [13, 4, 2, 1.6], // Mast 04 rock footing
  [34.2, 1, 0.8, 5], // gantry west leg
  [41, 1, 0.8, 5], // gantry east leg
  [38.2, 4.5, 2.8, 1.5], // scrap catchment (under the magnet)
  [40.2, 6.3, 1.6, 1.5], // rig control bench (E wall)
  [39, 9, 2.5, 1], // parts cart (hull band)
  [1.2, 8.3, 2.6, 1.2], // rock cluster (SW)
];

/**
 * Pixel solids (collision audit 2026-09). The painted uplink rack (two
 * antenna posts with the panel between them, plate x 100–200, base y 114)
 * had no collider west of post A's cell — the avatar could stand inside
 * it. The remaining yard props keep their cell footprints until the
 * yard's own rebuild unit (see the Station 080 correction handoff).
 */
export const YARD_SOLIDS: readonly SolidRect[] = [
  [100, 64, 100, 44], // uplink rack: posts + panel
];

export const YARD_DOORS: readonly BlockoutRect[] = [];

export const YARD_LAYOUT: readonly string[] = blockoutRows({
  cols: YARD_COLS,
  rows: YARD_ROWS,
  floor: YARD_FLOOR,
  footprints: YARD_FOOTPRINTS,
  doors: YARD_DOORS,
});
