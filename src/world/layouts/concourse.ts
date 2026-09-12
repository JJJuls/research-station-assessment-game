/**
 * Station Concourse layout (World V2 rescue — 22×12). Pure.
 *
 * The rescue slice replaces the rejected 60×38 blockout with a small,
 * dense, AUTHORED room: the collision grid is mapped cell-by-cell to the
 * painted concourse plate
 * (`public/assets/world-v2/plates/concourse-plate.png`, 688×384 px —
 * provenance in the world-v2 manifest). Rows 0–2 are the north wall band
 * (plan board, lockers, the Laboratory door recess and the status wall
 * are baked there), rows 9–11 the south hull with the Dock hatch, and
 * the 'X' footprints cover the plate's baked furniture (plan board
 * stand, lockers, the north-east work table, the operations desk with
 * its radio, the reading table) plus the incident-desk sprite the scene
 * layers on. The Records and Utility Deck doorways are inpainted into
 * the west and east wall faces. Interaction coordinates live in
 * src/pilot/zoneSites.ts.
 */
import type { BlockoutRect } from './blockout';
import { blockoutRows } from './blockout';

export const CONCOURSE_COLS = 22;
export const CONCOURSE_ROWS = 12;

/**
 * Walkable floor: the plate's visible deck. The upper band (rows 3–4)
 * starts at col 3 (the west wall face leans wider at the top) and ends
 * at col 18; the lower band (rows 5–8) runs cols 2–19.
 */
export const CONCOURSE_FLOOR: readonly BlockoutRect[] = [
  [3, 3, 16, 2],
  [2, 5, 18, 4],
];

/** Prop footprints (collide; baked art / layered sprites beneath). */
export const CONCOURSE_FOOTPRINTS: readonly BlockoutRect[] = [
  [3, 3, 3, 2], // plan board stand (north-west wall)
  [6, 3, 2, 2], // crew lockers beside the board
  // (The incident-desk sprite in the south-east corner is deliberately
  // NOT footprinted: the two-column east strip is the only north–south
  // lane to the Deck door, and the desk is a y-sorted sprite, so a
  // passing avatar occludes correctly instead of colliding.)
  // North-east work table (the quality packet). Two columns, not three:
  // the col-17 lane past the table's east edge is the one walkable link
  // between the north lane and the east strip (gauge, Deck door).
  [15, 3, 2, 3],
  // Operations desk (Vale's counter): one row — the lane south of the
  // desk (rows 7–8) is the walkable link between the hall and the east
  // strip (gauge, Deck door). The avatar passes close in front of the
  // desk and the floor radio, Stardew-tight; both stay baked art.
  [15, 6, 3, 1],
  [2.4, 7.3, 2.6, 1.7], // reading table (south-west bay)
];

export const CONCOURSE_DOORS: readonly BlockoutRect[] = [];

export const CONCOURSE_LAYOUT: readonly string[] = blockoutRows({
  cols: CONCOURSE_COLS,
  rows: CONCOURSE_ROWS,
  floor: CONCOURSE_FLOOR,
  footprints: CONCOURSE_FOOTPRINTS,
  doors: CONCOURSE_DOORS,
});
