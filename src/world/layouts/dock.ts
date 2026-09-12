/**
 * Dock layouts (World V2 rescue — Arrival / Dock 22×12).
 *
 * Pure. The rescue slice replaces the rejected 48×30 blockout with a
 * small, dense, AUTHORED room: the collision grid is mapped cell-by-cell
 * to the painted dock plate (`public/assets/world-v2/plates/dock-plate.png`,
 * 688×384 px — provenance in the world-v2 manifest). Rows 0–2 are the
 * north wall band (the Concourse door sprite sits at x 352), rows 9–11
 * the south hull with the sealed docking vault (centre x 328), and the
 * 'X' footprints cover the plate's baked cargo groups so the avatar
 * collides with what the art shows. The legacy 25×14 bay that the
 * historical `?route=legacy` regression specs drive is unchanged.
 * Interaction coordinates live in src/pilot/zoneSites.ts.
 */
import type { BlockoutRect } from './blockout';
import { blockoutRows } from './blockout';

export const DOCK_COLS = 22;
export const DOCK_ROWS = 12;

/** Walkable floor: the plate's visible open deck (cols 1–19, rows 3–8). */
export const DOCK_FLOOR: readonly BlockoutRect[] = [[1, 3, 19, 6]];

/**
 * Prop footprints (collide; the plate's baked art beneath): the cargo
 * groups, drums and the check-in kiosk exactly where the plate paints
 * them.
 */
export const DOCK_FOOTPRINTS: readonly BlockoutRect[] = [
  [1, 3, 5, 2], // north-west crate / drum wall cluster
  [1, 5, 2, 1], // west drums
  [1, 6, 2, 3], // west red barrels
  [6, 5, 1, 2], // single crate mid-west
  [7, 3, 2, 1], // check-in kiosk (baked into the plate)
  [12, 3, 2, 2], // mid crate cluster
  [14, 3, 4, 2], // north-east crate group
  [16, 5, 3, 1], // east drums
  [18, 6, 3, 3], // east crate stacks
];

export const DOCK_DOORS: readonly BlockoutRect[] = [];

export const DOCK_LAYOUT: readonly string[] = blockoutRows({
  cols: DOCK_COLS,
  rows: DOCK_ROWS,
  floor: DOCK_FLOOR,
  footprints: DOCK_FOOTPRINTS,
  doors: DOCK_DOORS,
});

/** V4 arrival bay (unchanged for the legacy route). */
export const LEGACY_DOCK_LAYOUT: readonly string[] = [
  '#########################',
  '###########--############',
  '#......................##',
  '#.................#######',
  '#.................#######',
  '#....................####',
  '#....................####',
  '#......####..........####',
  '#......####..........####',
  '#........PPPPPP......####',
  '#........PPPPPP......####',
  '#........PPPPPP......####',
  '###########--############',
  '#########################',
];
