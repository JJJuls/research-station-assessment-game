/**
 * Pure room-grid helpers (World V1). Node-importable: used by the zone
 * scenes (through StationMapBuilder) and by the pure registry / walking-
 * budget specs. Legend: '#' wall, '.' floor, '-' doorway floor, 'P'
 * floor variant (walkable), ' ' void (collides).
 */

export const TILE = 32;

/** The avatar's physics body (Player.ts: 32×42, offset so the foot line is +24). */
export const BODY = { halfWidth: 16, top: 18, bottom: 24 } as const;

export interface RoomGrid {
  rows: string[];
  cols: number;
  widthPx: number;
  heightPx: number;
}

export function gridOf(rows: readonly string[]): RoomGrid {
  const cols = Math.max(...rows.map((row) => row.length));

  return {
    rows: [...rows],
    cols,
    widthPx: cols * TILE,
    heightPx: rows.length * TILE,
  };
}

export function isWallCell(grid: RoomGrid, col: number, row: number): boolean {
  if (row < 0 || row >= grid.rows.length || col < 0 || col >= grid.cols) {
    return true;
  }

  const ch = grid.rows[row][col];

  return ch === undefined || ch === '#' || ch === ' ';
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
