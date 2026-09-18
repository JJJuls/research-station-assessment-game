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
import type { SolidRect } from './grid';

export const DOCK_COLS = 22;
export const DOCK_ROWS = 12;

/** Walkable floor: the plate's visible open deck (cols 1–19, rows 3–8). */
export const DOCK_FLOOR: readonly BlockoutRect[] = [[1, 3, 19, 6]];

/**
 * Cell footprints: none since the collision audit (2026-09) — the cargo
 * collides through pixel solids measured on the painting (the old cells
 * had, e.g., the mid-west crate one column east of where it is painted).
 */
export const DOCK_FOOTPRINTS: readonly BlockoutRect[] = [];

/** Pixel solids [x, y, w, h]; south edges stop 6 px short of the base. */
export const DOCK_SOLIDS: readonly SolidRect[] = [
  [32, 96, 624, 38], // north wall base (wall meets the deck at y 140)
  [100, 134, 138, 20], // north-west crates and drums (base y 160)
  [242, 134, 30, 15], // check-in kiosk (base y 155)
  [80, 154, 62, 46], // west drums
  [143, 160, 34, 34], // strapped crate mid-west
  [40, 205, 80, 80], // south-west barrels
  [382, 134, 195, 24], // north-east crate groups (base y 164)
  [540, 158, 66, 42], // east drums
  [590, 210, 52, 78], // south-east crate stacks
  [550, 254, 42, 30], // low crate beside the stacks
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
