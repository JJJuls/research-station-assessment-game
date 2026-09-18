/**
 * Grid navigator for the collision audit (test driver only).
 *
 * Plans a walk over a room's PURE collision model (cell grid + wall
 * skirts + pixel solids — src/world/layouts/grid.ts `bodyFits`) and drives
 * it with ordinary held-key input through `driveAxisTo`. Nothing here
 * teleports, mutates state or reads anything but the DEV position probe.
 * The plan keeps a clearance margin so a ±tolerance landing never clips a
 * corner; the audit's push tests then leave the plan on purpose.
 */
import type { Page } from '@playwright/test';

import type { RoomGrid } from '../src/world/layouts/grid';
import { bodyFits } from '../src/world/layouts/grid';
import { driveAxisTo, playerProbe } from './helpers';

export interface Point {
  x: number;
  y: number;
}

const STEP = 8;

function fitsWithMargin(grid: RoomGrid, x: number, y: number, margin: number) {
  return (
    bodyFits(grid, x - margin, y - margin) &&
    bodyFits(grid, x + margin, y - margin) &&
    bodyFits(grid, x - margin, y + margin) &&
    bodyFits(grid, x + margin, y + margin)
  );
}

/** Axis-aligned waypoints from `from` to within `reach` px of `to`, or null. */
export function planPath(
  grid: RoomGrid,
  from: Point,
  to: Point,
  options?: { margin?: number; reach?: number },
): Point[] | null {
  const margin = options?.margin ?? 5;
  const reach = options?.reach ?? 6;
  const snap = (v: number) => Math.round(v / STEP) * STEP;
  const key = (x: number, y: number) => `${x},${y}`;
  const start = { x: snap(from.x), y: snap(from.y) };
  const parents = new Map<string, string | null>([
    [key(start.x, start.y), null],
  ]);
  const queue: Point[] = [start];
  let head = 0;
  let goal: Point | null = null;

  while (head < queue.length) {
    const current = queue[head++];

    if (Math.hypot(current.x - to.x, current.y - to.y) <= reach) {
      goal = current;
      break;
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

      // The start cell may sit closer to a wall than the margin allows.
      if (parents.has(k) || !fitsWithMargin(grid, nx, ny, margin)) {
        continue;
      }

      parents.set(k, key(current.x, current.y));
      queue.push({ x: nx, y: ny });
    }
  }

  if (goal === null) {
    return null;
  }

  const cells: Point[] = [];
  let cursor: string | null = key(goal.x, goal.y);

  while (cursor !== null) {
    const [x, y] = cursor.split(',').map(Number);

    cells.unshift({ x, y });
    cursor = parents.get(cursor) ?? null;
  }

  // Compress runs on one axis into single legs.
  const legs: Point[] = [];

  for (let i = 1; i < cells.length; i += 1) {
    const prev = cells[i - 1];
    const next = cells[i + 1];
    const here = cells[i];
    const turning =
      next === undefined ||
      here.x - prev.x !== next.x - here.x ||
      here.y - prev.y !== next.y - here.y;

    if (turning) {
      legs.push(here);
    }
  }

  return legs;
}

/** Walks to `to` along a planned path; returns the final observed position. */
export async function navigateTo(
  page: Page,
  grid: RoomGrid,
  to: Point,
  options?: { margin?: number; reach?: number; tolerance?: number },
): Promise<Point> {
  const tolerance = options?.tolerance ?? 4;

  for (let attempt = 0; attempt < 3; attempt += 1) {
    const probe = await playerProbe(page);

    if (probe === null) {
      throw new Error('navigateTo: no player probe');
    }

    if (
      Math.hypot(probe.x - to.x, probe.y - to.y) <=
      (options?.reach ?? 6) + tolerance
    ) {
      return { x: probe.x, y: probe.y };
    }

    const path =
      planPath(grid, probe, to, options) ??
      planPath(grid, probe, to, { ...options, margin: 2 });

    if (path === null) {
      throw new Error(
        `navigateTo: no path from (${probe.x.toFixed(0)},${probe.y.toFixed(0)}) to (${to.x},${to.y})`,
      );
    }

    let cursor: Point = { x: probe.x, y: probe.y };

    for (const leg of path) {
      const axis =
        Math.abs(leg.x - cursor.x) >= Math.abs(leg.y - cursor.y) ? 'x' : 'y';

      await driveAxisTo(page, axis, leg[axis], tolerance);

      const after = await playerProbe(page);

      if (after === null) {
        throw new Error('navigateTo: probe lost mid-path');
      }

      cursor = { x: after.x, y: after.y };
    }
  }

  const final = await playerProbe(page);

  return { x: final?.x ?? Number.NaN, y: final?.y ?? Number.NaN };
}
