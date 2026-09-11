/**
 * Blockout → room grid (World V1 production). PURE, Node-importable.
 *
 * The numeric design authority
 * (docs/verification/professional-world-v1/astra-authority/world-layouts.json)
 * describes each zone as an explicit union of walkable floor rectangles in
 * tile units (x, y, w, h; origin north-west), minus authored footprints,
 * inside the hull. This module turns such a description into the character
 * grid every room scene builds from (StationMapBuilder legend):
 *
 *   '#'  hull / architecture mass (collides, drawn as wall)
 *   '.'  floor
 *   '-'  door aperture (walkable floor through the hull)
 *   'X'  prop footprint on the floor (collides; floor art beneath)
 *
 * Fractional rectangles round OUTWARD to whole cells, so an authored
 * half-cell clearance never shrinks (a 3-tile aperture centred on a cell
 * boundary becomes 4 cells). Nothing here is measurement logic.
 */

/** Tile-unit rectangle [x, y, w, h]. */
export type BlockoutRect = readonly [number, number, number, number];

export interface BlockoutSpec {
  cols: number;
  rows: number;
  /** Walkable floor union. */
  floor: readonly BlockoutRect[];
  /** Solid masses subtracted from the floor (drawn as hull). */
  solid?: readonly BlockoutRect[];
  /** Prop footprints on the floor: collide, floor art beneath. */
  footprints?: readonly BlockoutRect[];
  /** Door apertures through the hull (walkable). */
  doors?: readonly BlockoutRect[];
}

const EPS = 1e-6;

/** Whole cells covered by a tile-unit rectangle (outward rounding). */
export function cellsOfRect(
  rect: BlockoutRect,
  cols: number,
  rows: number,
): { col: number; row: number }[] {
  const [x, y, w, h] = rect;
  const c0 = Math.max(0, Math.floor(x + EPS));
  const c1 = Math.min(cols - 1, Math.ceil(x + w - EPS) - 1);
  const r0 = Math.max(0, Math.floor(y + EPS));
  const r1 = Math.min(rows - 1, Math.ceil(y + h - EPS) - 1);
  const cells: { col: number; row: number }[] = [];

  for (let row = r0; row <= r1; row += 1) {
    for (let col = c0; col <= c1; col += 1) {
      cells.push({ col, row });
    }
  }

  return cells;
}

/** Builds the character rows of a blockout. */
export function blockoutRows(spec: BlockoutSpec): string[] {
  const grid: string[][] = Array.from({ length: spec.rows }, () =>
    Array.from({ length: spec.cols }, () => '#'),
  );
  const paint = (rects: readonly BlockoutRect[] | undefined, ch: string) => {
    for (const rect of rects ?? []) {
      for (const { col, row } of cellsOfRect(rect, spec.cols, spec.rows)) {
        grid[row][col] = ch;
      }
    }
  };

  paint(spec.floor, '.');
  paint(spec.solid, '#');
  paint(spec.footprints, 'X');
  paint(spec.doors, '-');

  // The outer hull is always closed except at door apertures.
  for (let col = 0; col < spec.cols; col += 1) {
    for (const row of [0, spec.rows - 1]) {
      if (grid[row][col] !== '-') {
        grid[row][col] = '#';
      }
    }
  }

  for (let row = 0; row < spec.rows; row += 1) {
    for (const col of [0, spec.cols - 1]) {
      if (grid[row][col] !== '-') {
        grid[row][col] = '#';
      }
    }
  }

  return grid.map((row) => row.join(''));
}
