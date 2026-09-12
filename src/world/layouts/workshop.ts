/**
 * Records Workshop layout (World V2 rescue — 43×12 two-bay hall). Pure.
 *
 * The workshop is the first zone rebuilt past the rescue slice: TWO
 * painted 688×384 plates stitched side-by-side
 * (`public/assets/world-v2/plates/workshop-plate.png`, 1376×384) — the
 * machine bay (west: case/records desk, both label presses, the relay
 * bench, the sample-cutter island with its disposal bin, the storage
 * locker and assembly benches) and the records office (east: dispatch
 * desk, feed console, seal-tag board, handover desk, the four south-hull
 * work benches, the work-order board and the Concourse door). The two
 * bays join through the painted doorway VESTIBULE both generations put
 * on their facing walls (cols 19–23, rows 6–8) — no seam blending was
 * needed and no wall was invented.
 *
 * The collision grid is mapped cell-by-cell to the painting; every
 * anchor/approach pair below and in the registry was machine-audited
 * (32×42 body, ±12 px landing box, nearest-wins radius 72, spawn/door
 * clearance, bundle keyboard reach, debris reach, full BFS connectivity)
 * by the workshop geometry checker before being committed. Routes: the
 * south lane (rows 7–8) runs the whole hall except the cutter island
 * (cols 12–15), which is passed on the north lane (rows 4–5, cols
 * 10–18) — deliberately, the way a real machine floor walks.
 */
import type { BlockoutRect } from './blockout';
import { blockoutRows } from './blockout';

export const WORKSHOP_COLS = 43;
export const WORKSHOP_ROWS = 12;

/** Walkable floor union (see header; audited). */
export const WORKSHOP_FLOOR: readonly BlockoutRect[] = [
  // Machine bay (plate A)
  [10, 4, 9, 1], // north lane over the cutter island
  [3, 5, 16, 1],
  [2, 6, 17, 1],
  [1, 7, 18, 2],
  [2, 9, 17, 1],
  // Vestibule passage between the bays (painted facing doorways)
  [19, 6, 5, 3],
  // Records office (plate B)
  [24, 4, 3, 1],
  [31, 4, 3, 1],
  [38, 4, 4, 1],
  [23, 5, 19, 1],
  [22, 6, 20, 3],
  [22, 9, 20, 1],
];

/** Prop footprints (collide; the plate's baked art beneath). */
export const WORKSHOP_FOOTPRINTS: readonly BlockoutRect[] = [
  [2, 2, 4, 3], // records/case desk + pigeonholes (NW)
  [6.5, 2, 1.7, 3], // label press A
  [8.6, 2, 1.4, 3], // label press B
  [1, 6, 2.0, 2], // relay bench (west wall)
  [12.1, 6, 2.9, 3], // sample-cutter island + platform
  [14.8, 6.2, 1.2, 1.6], // disposal bin (attached east of the cutter)
  [9.4, 9, 1.9, 2], // component storage locker (south hull)
  [11.8, 9, 2.3, 2], // south tool bench (decor)
  [14.2, 9, 3.3, 2], // assembly bench (south hull)
  [27.1, 2, 3.0, 3], // dispatch console desk (office north)
  [34.4, 3, 2.9, 2], // outbound handover desk (office north)
  [24.1, 9, 3.8, 2], // calibration bench (office south hull)
  [29.5, 9, 3.3, 2], // shift report desk (office south hull)
  [33.2, 9, 2.4, 2], // quality-packet table (office south hull)
  [35.6, 9, 3.3, 2], // conduit lattice bench (office south hull)
];

export const WORKSHOP_DOORS: readonly BlockoutRect[] = [];

export const WORKSHOP_LAYOUT: readonly string[] = blockoutRows({
  cols: WORKSHOP_COLS,
  rows: WORKSHOP_ROWS,
  floor: WORKSHOP_FLOOR,
  footprints: WORKSHOP_FOOTPRINTS,
  doors: WORKSHOP_DOORS,
});
