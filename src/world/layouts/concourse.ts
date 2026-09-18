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
import type { SolidRect } from './grid';

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

/**
 * Cell footprints: none. Since the collision audit (2026-09) every prop
 * collides through a pixel solid authored to its painted silhouette
 * (CONCOURSE_SOLIDS) — the former whole-cell footprints left invisible
 * walls beside the furniture and let the avatar stand on the rest of it.
 */
export const CONCOURSE_FOOTPRINTS: readonly BlockoutRect[] = [];

/**
 * Pixel solids [x, y, w, h], measured on the plate. A solid's south edge
 * stops 6 px short of the painted base so the feet box can stand right at
 * a prop's front; north-wall items share the wall-base line.
 */
export const CONCOURSE_SOLIDS: readonly SolidRect[] = [
  [96, 96, 512, 40], // north wall base (painted wall meets the deck at y 142)
  [122, 136, 82, 16], // plan board stand (legs to y 158)
  [209, 136, 64, 13], // crew lockers (base y 155)
  [98, 150, 44, 16], // cable coil by the west wall
  [489, 136, 77, 25], // north-east work table (legs to y 167)
  [474, 180, 76, 36], // operations desk (Vale's counter, base y 222)
  [80, 252, 92, 37], // reading table (south-west bay, legs to y 295)
  [38, 256, 40, 24], // cable coil by the Records door
  [502, 270, 36, 20], // monitor gauge pedestal (layered sprite base)
  [588, 262, 56, 27], // incident desk (layered sprite base)
];

export const CONCOURSE_DOORS: readonly BlockoutRect[] = [];

export const CONCOURSE_LAYOUT: readonly string[] = blockoutRows({
  cols: CONCOURSE_COLS,
  rows: CONCOURSE_ROWS,
  floor: CONCOURSE_FLOOR,
  footprints: CONCOURSE_FOOTPRINTS,
  doors: CONCOURSE_DOORS,
});
