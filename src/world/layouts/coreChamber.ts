/**
 * Core Chamber layout (World V2 rebuild — 22×12). Pure.
 *
 * One painted plate (`public/assets/world-v2/plates/core-plate.png`,
 * 688×384): the dormant reactor on its central platform (ceiling pipes
 * converge on it), the west status console, Kai's curved operator
 * console east, and the south door back to the Utility Deck. The
 * chamber's dynamic presentation (emissive ramp, ring glow, light pool,
 * Kai's reaction) layers over the dormant painted core.
 *
 * Machine-audited geometry (32×42 body, ±12 px landing box, nearest-wins
 * radius 72, spawn/door clearance, BFS connectivity, slot-width audit):
 * the platform occupies the room centre (cols 8–13, rows 4–7); the west
 * and east floors connect only through the south corridor (rows 8–9);
 * the door pocket (cols 9–11, row 10) lets a figure stand in the painted
 * doorway.
 */
import type { BlockoutRect } from './blockout';
import { blockoutRows, footprintSolids } from './blockout';
import type { SolidRect } from './grid';

export const CORE_COLS = 22;
export const CORE_ROWS = 12;

export const CORE_FLOOR: readonly BlockoutRect[] = [
  [2, 4, 6, 4], // west floor (cols 2-7, rows 4-7)
  [14, 4, 6, 4], // east floor (cols 14-19, rows 4-7)
  [2, 8, 18, 2], // south corridor (rows 8-9)
  [9, 10, 3, 1], // door pocket (cols 9-11, row 10)
];

/** The painted reactor and consoles, in tile units (audited figures). */
const CORE_MASSES: readonly BlockoutRect[] = [
  [8.4, 4.3, 5.1, 3.6], // reactor platform (cols 8-13, rows 4-7)
  [1.7, 5.3, 1.3, 2.3], // status console (west wall)
  [16.6, 5.3, 3.4, 3.1], // operator console + chair (east, rows 5-8)
];

/** Cell footprints: none — the masses collide through CORE_SOLIDS. */
export const CORE_FOOTPRINTS: readonly BlockoutRect[] = [];

/** Pixel solids: reactor platform and consoles where the book measured them. */
export const CORE_SOLIDS: readonly SolidRect[] = footprintSolids(CORE_MASSES);

export const CORE_DOORS: readonly BlockoutRect[] = [];

export const CORE_LAYOUT: readonly string[] = blockoutRows({
  cols: CORE_COLS,
  rows: CORE_ROWS,
  floor: CORE_FLOOR,
  footprints: CORE_FOOTPRINTS,
  doors: CORE_DOORS,
});
