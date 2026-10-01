/**
 * Collision audit (2026-09) — engine vs. the pure collision model, on
 * ORDINARY HELD-KEY INPUT (no teleport, no state mutation).
 *
 * For every audited room the spec boots the zone, then for every pixel
 * solid and every reachable side of it walks the avatar to a point 20 px
 * off the side's middle (grid navigator, e2e/navGrid.ts) and holds the
 * key into the solid until the engine stops the avatar — there is no
 * fixed push length: the held key's target lies outside the room, so the
 * leg can only end in a wall clamp, however long the lane (U14-D2: the
 * workshop's south lane is 1 213 px). The stop position must equal the
 * pure model's prediction (src/world/layouts/grid.ts `bodyFits`, the same
 * geometry the DEV collision overlay draws over the art), to 3 px: the
 * avatar can neither enter what is painted nor be stopped by anything
 * that is not. Because the avatar is always driven PAST the predicted
 * stop, a missing collider carries it on to the next one and fails the
 * comparison outright. A set of open-floor sweeps does the same along
 * every lane row, which catches invisible / legacy colliders away from
 * the props. Afterwards the avatar must be able to walk back to the
 * room's spawn (no trap).
 *
 * The model is evaluated at the coordinate the walk actually landed on
 * (recorded per face, with its offset from the aimed approach), and at
 * that coordinate's fraction of a pixel exactly as the engine sees it —
 * see `predictStop`.
 *
 * COLLISION_ROOM=<zone key> limits the run to one room; COLLISION_OUT
 * sets the evidence directory (a clean frame and the `?collision=1`
 * overlay frame per room).
 */
import { mkdirSync, writeFileSync } from 'node:fs';

import { expect, type Page, test } from '@playwright/test';

import {
  CONCOURSE_SPAWNS,
  CONCOURSE_STATIONS,
  CORE_SPAWN,
  DECK_SPAWNS,
  DOCK_SITES,
  LAB_SPAWNS,
  LAB_STATIONS,
  WORKSHOP_SPAWN,
  YARD_SITES,
  YARD_SPAWN,
} from '../src/pilot/zoneSites';
import {
  CONCOURSE_LAYOUT,
  CONCOURSE_SOLIDS,
} from '../src/world/layouts/concourse';
import { CORE_LAYOUT, CORE_SOLIDS } from '../src/world/layouts/coreChamber';
import { DECK_LAYOUT, DECK_SOLIDS } from '../src/world/layouts/deck';
import { DOCK_LAYOUT, DOCK_SOLIDS } from '../src/world/layouts/dock';
import type { RoomGrid, SolidRect } from '../src/world/layouts/grid';
import { BODY, bodyFits, gridOf, npcSolid } from '../src/world/layouts/grid';
import { LAB_LAYOUT, LAB_SOLIDS } from '../src/world/layouts/laboratory';
import {
  WORKSHOP_LAYOUT,
  WORKSHOP_SOLIDS,
} from '../src/world/layouts/workshop';
import { YARD_LAYOUT, YARD_SOLIDS } from '../src/world/layouts/yard';
import { driveAxisTo, getDriverStats, playerProbe } from './helpers';
import { navigateTo, planPath, type Point } from './navGrid';
import { waitScene } from './pilotHelpers';

interface AuditRoom {
  scene: string;
  spawn: Point;
  solids: readonly SolidRect[];
  grid: RoomGrid;
  /** Sweep rows (avatar origin y) pushed west→east and east→west. */
  sweepRows: readonly number[];
}

const room = (
  scene: string,
  rows: readonly string[],
  solids: readonly SolidRect[],
  npcs: readonly Point[],
  spawn: Point,
  sweepRows: readonly number[],
): AuditRoom => {
  const all = [...solids, ...npcs.map((npc) => npcSolid(npc.x, npc.y))];

  return { scene, spawn, solids: all, grid: gridOf(rows, all), sweepRows };
};

const ROOMS: Record<string, AuditRoom> = {
  station_concourse: room(
    'station_concourse',
    CONCOURSE_LAYOUT,
    CONCOURSE_SOLIDS,
    [CONCOURSE_STATIONS.vale],
    CONCOURSE_SPAWNS.fromDock,
    [150, 200, 236],
  ),
  dock: room(
    'dock',
    DOCK_LAYOUT,
    DOCK_SOLIDS,
    [],
    DOCK_SITES.spawnArrival,
    [170, 215, 250],
  ),
  records_workshop: room(
    'records_workshop',
    WORKSHOP_LAYOUT,
    WORKSHOP_SOLIDS,
    [],
    WORKSHOP_SPAWN,
    [236, 262],
  ),
  diagnostics_laboratory: room(
    'diagnostics_laboratory',
    LAB_LAYOUT,
    LAB_SOLIDS,
    [LAB_STATIONS.kai],
    LAB_SPAWNS.fromConcourse,
    [170, 216, 250],
  ),
  utility_core_deck: room(
    'utility_core_deck',
    DECK_LAYOUT,
    DECK_SOLIDS,
    [],
    DECK_SPAWNS.fromConcourse,
    [150, 190],
  ),
  core_chamber: room(
    'core_chamber',
    CORE_LAYOUT,
    CORE_SOLIDS,
    [],
    CORE_SPAWN,
    [280],
  ),
  exterior_recovery_yard: room(
    'exterior_recovery_yard',
    YARD_LAYOUT,
    YARD_SOLIDS,
    [YARD_SITES.noor],
    YARD_SPAWN,
    [240, 420, 500],
  ),
};

const OUT =
  process.env.COLLISION_OUT ??
  'docs/verification/station-080-correction/collision-audit';
const VIEWPORT = (() => {
  const [w, h] = (process.env.WV3_VIEWPORT ?? '1280x720')
    .split('x')
    .map(Number);

  return { width: w || 1280, height: h || 720 };
})();

type Side = 'north' | 'south' | 'west' | 'east';

const SIDES: Record<
  Side,
  { axis: 'x' | 'y'; dir: 1 | -1; start: (s: SolidRect, off: number) => Point }
> = {
  // Pushing SOUTH into the solid's north face, etc. `start` is the avatar
  // origin whose feet box stands 20 px off the face's middle.
  north: {
    axis: 'y',
    dir: 1,
    start: ([x, y, w], off) => ({ x: x + w / 2, y: y - off - BODY.bottom }),
  },
  south: {
    axis: 'y',
    dir: -1,
    start: ([x, y, w, h], off) => ({
      x: x + w / 2,
      y: y + h + off + BODY.top,
    }),
  },
  west: {
    axis: 'x',
    dir: 1,
    start: ([x, y, , h], off) => ({
      x: x - off - BODY.halfWidth,
      y: y + h / 2 - (BODY.bottom - BODY.top) / 2,
    }),
  },
  east: {
    axis: 'x',
    dir: -1,
    start: ([x, y, w, h], off) => ({
      x: x + w + off + BODY.halfWidth,
      y: y + h / 2 - (BODY.bottom - BODY.top) / 2,
    }),
  },
};

/**
 * Whether the engine's feet box fits at a (fractional) position. The
 * engine separates continuous rectangles (Arcade AABB), `bodyFits` reads
 * whole pixels: a body at a fractional y covers the pixel rows
 * floor(y + 10) … ceil(y + 24) − 1, which is exactly the union of the
 * whole-pixel bodies at floor(y) and ceil(y) — likewise along x. The two
 * geometries therefore agree when the body is required to fit at every
 * floor / ceiling combination of its coordinates. (U14-D2: the walk had
 * landed a twelfth of a pixel inside the annex doorway's depth; the
 * engine, correctly, stopped at the jamb's corner while the rounded
 * model slid past it to the Component Locker — 5.08 px apart.)
 */
function engineBodyFits(grid: RoomGrid, x: number, y: number): boolean {
  return [Math.floor(x), Math.ceil(x)].every((bx) =>
    [Math.floor(y), Math.ceil(y)].every((by) => bodyFits(grid, bx, by)),
  );
}

/**
 * The model's stop coordinate when sliding from `from` along one axis,
 * one pixel at a time until the body no longer fits. The slide is
 * bounded by the room's own extent on that axis; the outside of the grid
 * counts as wall, so a stop always exists and running out of room is a
 * defect of the model, not a result.
 */
function predictStop(
  grid: RoomGrid,
  from: Point,
  axis: 'x' | 'y',
  dir: 1 | -1,
): number {
  const extent = axis === 'x' ? grid.widthPx : grid.heightPx;
  const at = { ...from };

  for (let i = 0; i <= extent; i += 1) {
    const next = { ...at, [axis]: at[axis] + dir };

    if (!engineBodyFits(grid, next.x, next.y)) {
      return at[axis];
    }

    at[axis] = next[axis];
  }

  throw new Error(
    `predictStop: no stop within ${extent} px from (${from.x}, ${from.y}) along ${axis}${dir > 0 ? '+' : '-'}`,
  );
}

/**
 * Holds the key along `axis` until the engine stops the avatar. The leg's
 * target lies 400 px outside the room on that side, so it can never be
 * reached: the leg ends only when the avatar has stopped advancing (the
 * driver's wall clamp), whatever the lane's length, and the avatar is
 * always carried past the model's predicted stop. A leg that ends any
 * other way — the driver's burst budget exhausted, the probe lost — is an
 * error of the audit, not a stop.
 */
async function push(page: Page, grid: RoomGrid, axis: 'x' | 'y', dir: 1 | -1) {
  const extent = axis === 'x' ? grid.widthPx : grid.heightPx;
  const far = dir > 0 ? extent + 400 : -400;
  const stallsBefore = getDriverStats().stallAborts;

  await driveAxisTo(page, axis, far, 1);

  const after = await playerProbe(page);

  if (after === null) {
    throw new Error('push: no player probe');
  }

  if (getDriverStats().stallAborts !== stallsBefore + 1) {
    throw new Error(
      `push: the held ${axis}${dir > 0 ? '+' : '-'} key did not end in a wall clamp (avatar at ${after.x}, ${after.y})`,
    );
  }

  return { x: after.x, y: after.y };
}

for (const [zone, spec] of Object.entries(ROOMS)) {
  test(`${zone}: the engine stops the avatar exactly where the painted collision model says`, async ({
    page,
  }) => {
    test.skip(
      process.env.COLLISION_ROOM !== undefined &&
        process.env.COLLISION_ROOM !== zone,
      'other room selected',
    );
    // ~12 s per pushed face under software GL, plus the sweeps and boots.
    test.setTimeout(600_000 + spec.solids.length * 4 * 30_000);
    mkdirSync(OUT, { recursive: true });
    await page.setViewportSize(VIEWPORT);

    const tag = `col${Date.now() % 100000}`;

    // Evidence first: the clean participant frame, then the DEV overlay.
    await page.goto(
      `/?participant_id=PT_${tag}&game_session_id=GS_${tag}&scene=${spec.scene}`,
    );
    await waitScene(page, spec.scene, 60_000);
    await page.waitForTimeout(1500);
    await page.screenshot({ path: `${OUT}/${zone}-clean.png` });
    await page.goto(
      `/?participant_id=PT_${tag}&game_session_id=GS_${tag}o&scene=${spec.scene}&collision=1`,
    );
    await waitScene(page, spec.scene, 60_000);
    await page.waitForTimeout(1500);
    await page.screenshot({ path: `${OUT}/${zone}-overlay.png` });

    const findings: Record<string, unknown>[] = [];
    // Written after every face, so a run that is cut short still shows
    // exactly what was pushed.
    const writeFindings = () =>
      writeFileSync(
        `${OUT}/${zone}-findings.json`,
        `${JSON.stringify({ zone, viewport: VIEWPORT, findings }, null, 1)}
`,
      );
    const check = async (
      label: string,
      start: Point,
      axis: 'x' | 'y',
      dir: 1 | -1,
    ) => {
      const probe = await playerProbe(page);

      if (
        probe === null ||
        !bodyFits(spec.grid, Math.round(start.x), Math.round(start.y)) ||
        (planPath(spec.grid, probe, start) ??
          planPath(spec.grid, probe, start, { margin: 2 })) === null
      ) {
        findings.push({ label, result: 'side not reachable (model)' });

        return;
      }

      const landed = await navigateTo(page, spec.grid, start);
      // The comparison is made from the point the walk actually landed
      // on, fraction and all (`predictStop`), so a landing off its aim
      // changes which approach is compared, never whether the comparison
      // holds; the offset across the push is recorded with every face so
      // the reader can see which approach was pushed.
      const across = axis === 'x' ? 'y' : 'x';
      const landingError = landed[across] - start[across];
      const expected = predictStop(spec.grid, landed, axis, dir);
      const stopped = await push(page, spec.grid, axis, dir);
      const error = stopped[axis] - expected;

      findings.push({
        label,
        start,
        landed,
        landingError: Number(landingError.toFixed(2)),
        expected,
        observed: stopped[axis],
        error: Number(error.toFixed(2)),
      });
      expect
        .soft(
          Math.abs(error),
          `${label}: observed ${stopped[axis]} vs model ${expected}`,
        )
        .toBeLessThanOrEqual(3);

      // Step back off the face so the next plan starts clear of it.
      await driveAxisTo(page, axis, stopped[axis] - dir * 16, 4);
    };

    for (const [index, solid] of spec.solids.entries()) {
      for (const side of Object.keys(SIDES) as Side[]) {
        const { axis, dir, start } = SIDES[side];

        // The closest stand-off that fits: 20 px, else 12 / 6 / 2 px. A face
        // with none abuts a wall or another collider at its middle — it
        // cannot be reached by the avatar either (recorded, not pushed).
        const off = [20, 12, 6, 2].find((candidate) => {
          const stand = start(solid, candidate);

          return bodyFits(spec.grid, Math.round(stand.x), Math.round(stand.y));
        });

        await check(
          `solid#${index} [${solid.join(',')}] ${side} face`,
          start(solid, off ?? 20),
          axis,
          dir,
        );
        writeFindings();
      }
    }

    for (const y of spec.sweepRows) {
      await check(`sweep row y=${y} eastward`, { x: spec.spawn.x, y }, 'x', 1);
      await check(`sweep row y=${y} westward`, { x: spec.spawn.x, y }, 'x', -1);
    }

    // No trap: the spawn is reachable again from wherever the audit ended.
    const home = await navigateTo(page, spec.grid, spec.spawn, { reach: 10 });

    expect(
      Math.hypot(home.x - spec.spawn.x, home.y - spec.spawn.y),
    ).toBeLessThan(24);

    writeFindings();
  });
}
