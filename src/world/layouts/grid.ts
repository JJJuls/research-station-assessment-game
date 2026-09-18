/**
 * Pure room-grid helpers (World V1). Node-importable: used by the zone
 * scenes (through StationMapBuilder) and by the pure registry / walking-
 * budget specs. Legend: '#' wall, '.' floor, '-' doorway floor, 'P'
 * floor variant (walkable), 'X' prop footprint (collides, floor art
 * beneath), ' ' void (collides).
 */

export const TILE = 32;

/**
 * The avatar's physics body (Player.ts): a FEET box, 22×14, spanning
 * x ± 11 and y + 10 … y + 24 around the sprite origin (the foot line is
 * +24). `top` is the distance from the origin UP to the body's top edge,
 * so a feet box that starts below the origin has a negative `top`.
 */
export const BODY = { halfWidth: 11, top: -10, bottom: 24 } as const;

/**
 * Wall skirt (px). Until the collision audit of 2026-09 the body was the
 * whole 32×42 figure (top = origin − 18); every cell grid was authored
 * against it, so a wall cell's SOUTH face stood 28 px north of where the
 * painted wall base is. Cell walls ('#', 'X', void) therefore keep a
 * 28 px skirt below their south face: the feet box stops exactly where
 * the old body's head stopped, and cell-authored rooms keep their audited
 * north-south geometry. Pixel solids (`RoomGrid.solids`) are authored to
 * the painted silhouette and carry NO skirt.
 */
export const WALL_SKIRT = 28;

/**
 * A standing figure's ground contact (NPCs share the avatar's foot line,
 * origin + 24): the avatar walks AROUND a colleague, never through them.
 */
export function npcSolid(x: number, y: number): SolidRect {
  return [x - 11, y + 12, 22, 12];
}

/** Pixel-precise collision rectangle [x, y, w, h] (world px, no skirt). */
export type SolidRect = readonly [number, number, number, number];

export interface RoomGrid {
  rows: string[];
  cols: number;
  widthPx: number;
  heightPx: number;
  solids: readonly SolidRect[];
}

export function gridOf(
  rows: readonly string[],
  solids: readonly SolidRect[] = [],
): RoomGrid {
  const cols = Math.max(...rows.map((row) => row.length));

  return {
    rows: [...rows],
    cols,
    widthPx: cols * TILE,
    heightPx: rows.length * TILE,
    solids,
  };
}

/**
 * The skirt rectangles of a grid: one per wall cell whose south
 * neighbour is walkable (the scene builds the same rectangles as static
 * bodies — StationMapBuilder.buildSolidBodies).
 */
export function skirtRects(rows: readonly string[]): SolidRect[] {
  const grid = gridOf(rows);
  const rects: SolidRect[] = [];

  for (let row = 0; row < rows.length - 1; row += 1) {
    for (let col = 0; col < grid.cols; col += 1) {
      if (isWallCell(grid, col, row) && !isWallCell(grid, col, row + 1)) {
        rects.push([col * TILE, (row + 1) * TILE, TILE, WALL_SKIRT]);
      }
    }
  }

  return rects;
}

export function isWallCell(grid: RoomGrid, col: number, row: number): boolean {
  if (row < 0 || row >= grid.rows.length || col < 0 || col >= grid.cols) {
    return true;
  }

  const ch = grid.rows[row][col];

  return ch === undefined || ch === '#' || ch === 'X' || ch === ' ';
}

/** Whether the avatar can stand with its position at (x, y). */
export function bodyFits(grid: RoomGrid, x: number, y: number): boolean {
  const left = x - BODY.halfWidth;
  const right = x + BODY.halfWidth - 1;
  const top = y - BODY.top;
  const bottom = y + BODY.bottom - 1;

  for (
    let row = Math.floor(top / TILE);
    row <= Math.floor(bottom / TILE);
    row += 1
  ) {
    for (
      let col = Math.floor(left / TILE);
      col <= Math.floor(right / TILE);
      col += 1
    ) {
      if (isWallCell(grid, col, row)) {
        return false;
      }
    }
  }

  // Wall skirts: a wall cell within WALL_SKIRT px above the body's top.
  for (
    let row = Math.floor((top - WALL_SKIRT) / TILE);
    row < Math.floor(top / TILE);
    row += 1
  ) {
    for (
      let col = Math.floor(left / TILE);
      col <= Math.floor(right / TILE);
      col += 1
    ) {
      if (isWallCell(grid, col, row) && (row + 1) * TILE + WALL_SKIRT > top) {
        return false;
      }
    }
  }

  for (const [sx, sy, sw, sh] of grid.solids) {
    if (left < sx + sw && right >= sx && top < sy + sh && bottom >= sy) {
      return false;
    }
  }

  return true;
}

/**
 * Shortest walking distance (px) between two world points over the grid,
 * on an 8 px lattice with 4-neighbour steps, or null when unreachable.
 * The start and goal are snapped to the lattice; the goal is reached when
 * the body stands within `reach` px of it.
 */
export function walkingDistance(
  grid: RoomGrid,
  from: { x: number; y: number },
  to: { x: number; y: number },
  reach = 40,
): number | null {
  const STEP = 8;
  const key = (x: number, y: number) => `${x},${y}`;
  const snap = (v: number) => Math.round(v / STEP) * STEP;
  const start = { x: snap(from.x), y: snap(from.y) };

  if (!bodyFits(grid, start.x, start.y)) {
    return null;
  }

  const visited = new Set<string>([key(start.x, start.y)]);
  const queue: { x: number; y: number; d: number }[] = [{ ...start, d: 0 }];
  let head = 0;

  while (head < queue.length) {
    const current = queue[head++];

    if (Math.hypot(current.x - to.x, current.y - to.y) <= reach) {
      return current.d;
    }

    for (const [dx, dy] of [
      [STEP, 0],
      [-STEP, 0],
      [0, STEP],
      [0, -STEP],
    ] as const) {
      const nx = current.x + dx;
      const ny = current.y + dy;
      const k = key(nx, ny);

      if (visited.has(k) || !bodyFits(grid, nx, ny)) {
        continue;
      }

      visited.add(k);
      queue.push({ x: nx, y: ny, d: current.d + STEP });
    }
  }

  return null;
}

/** Cells whose character is `ch`, as tile-centre points. */
export function cellsOf(
  grid: RoomGrid,
  ch: string,
): { col: number; row: number }[] {
  const cells: { col: number; row: number }[] = [];

  grid.rows.forEach((row, r) => {
    for (let c = 0; c < row.length; c += 1) {
      if (row[c] === ch) {
        cells.push({ col: c, row: r });
      }
    }
  });

  return cells;
}
