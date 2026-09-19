/**
 * Diagnostics Laboratory layout (World V2 rebuild — 22×12). Pure.
 *
 * One painted plate (`public/assets/world-v2/plates/laboratory-plate.png`,
 * 688×384): the signal-analysis case room — orientation console (NW),
 * sealed airlock hatch to the Recovery Yard (north), the large wall
 * display (baked dark screen; the scene draws its dynamic trace inside
 * the painted bezel), Kai's briefing desk (NE), the central workstation
 * island, and the four phase benches along the south hull flanking the
 * Concourse door (evidence table, protocol console, [door], training
 * rig, diagnostic board — the presented order reads left to right).
 *
 * Machine-audited geometry (32×42 body, ±12 px landing box, nearest-wins
 * radius 72, spawn/door clearance, BFS connectivity): the workstation
 * island (cols 12–14) is passed on the north lane (rows 4–5, feet over
 * the wall base — the workshop's accepted pattern) or the south floor
 * (rows 7–8); the phase benches are approached from the row-7 lane; the
 * south furniture is baked into the hull band (rows 9–11), so avatars
 * stand Stardew-tight in front of it.
 */
import type { BlockoutRect } from './blockout';
import { blockoutRows } from './blockout';
import type { SolidRect } from './grid';

export const LAB_COLS = 22;
export const LAB_ROWS = 12;

export const LAB_FLOOR: readonly BlockoutRect[] = [
  // North lane over the workstation island. It runs one column PAST the
  // island's east face (cols 5–16): the east bay climbs into the lane
  // through a 32 px window (x 496–528) instead of the 1 px slot the
  // first audit's 8 px BFS had accepted (in-engine finding, world V3).
  [5, 4, 12, 1],
  [3.5, 5, 15, 1],
  [2.5, 6, 17, 1],
  [2.2, 7, 17.3, 2],
];

/** Cell footprints: none — the props collide through LAB_SOLIDS. */
export const LAB_FOOTPRINTS: readonly BlockoutRect[] = [];

/**
 * Pixel solids measured on the plate (collision audit 2026-09). Kai's
 * desk starts at x 528, not at its painted west edge (x 520): the east
 * bay climbs into the north lane through the x 496–528 window, which
 * must stay a full 32 px wide.
 */
export const LAB_SOLIDS: readonly SolidRect[] = [
  [130, 110, 30, 54], // orientation console (NW wall, base y 170)
  [528, 142, 68, 42], // Kai's briefing desk (NE, base y 190)
  [402, 196, 82, 56], // signal-analysis workstation island (base y 258)
];

export const LAB_DOORS: readonly BlockoutRect[] = [];

export const LAB_LAYOUT: readonly string[] = blockoutRows({
  cols: LAB_COLS,
  rows: LAB_ROWS,
  floor: LAB_FLOOR,
  footprints: LAB_FOOTPRINTS,
  doors: LAB_DOORS,
});
