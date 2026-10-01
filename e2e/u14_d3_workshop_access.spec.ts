/**
 * Station 080 U14-D3 — Records Workshop access correction (research-owner
 * ruling of 1 October 2026): the cutting-annex entrance widened to 128 px,
 * the Component Locker moved to the machine bay's north wall, the
 * Assembly Bench moved one tile east, and the office's east wall
 * recomposed into an upper Work Order Board alcove and a lower open
 * Concourse doorway separated by one divider solid.
 *
 * PURE part (no browser): the approved geometry coordinate by coordinate,
 * the unchanged M04 positions and reaches, no piece reachable from the
 * widened entrance or the relocated stations, the six approaches
 * (Press B, locker, bench, Work Order Board, Seal Log, Concourse door)
 * unique and standable over their ±12 px landing boxes, and the divider
 * closing the direct way between the alcove and the doorway.
 *
 * BROWSER part (real input): the board prompt at (1312, 178) and the door
 * prompt at (1288, 268), neither winning at the other's approach; a held
 * DOWN key from the board approach stopped by the divider where the pure
 * model says; the door transitioning once to the Concourse and the return
 * spawn safe; the M08 locker engagement unchanged; and the six retained
 * screenshots (`U14D3_OUT`, default under ignored `test-results/`).
 *
 * Scientific boundary: nothing here changes or asserts a new event,
 * scoring rule or validity claim; M04 and M08 telemetry are read only.
 */
import { mkdirSync, readFileSync } from 'node:fs';

import { expect, type Page, test } from '@playwright/test';

import { PILOT_DOORS } from '../src/pilot/pilotRoute';
import { M04_PIECES } from '../src/pilot/windows/m04CuttingModel';
import {
  WORKSHOP_SITES,
  WORKSHOP_SPAWN,
  WORKSHOP_STATIONS,
} from '../src/pilot/zoneSites';
import {
  INTERACTION_RADIUS,
  WORKSHOP_REGISTRY,
} from '../src/world/interactionRegistry';
import {
  BODY,
  bodyFits,
  gridOf,
  type RoomGrid,
} from '../src/world/layouts/grid';
import {
  WORKSHOP_ANNEX,
  WORKSHOP_COLS,
  WORKSHOP_LAYOUT,
  WORKSHOP_ROWS,
  WORKSHOP_SOLIDS,
} from '../src/world/layouts/workshop';
import {
  driveAxisTo,
  getDriverStats,
  getEvents,
  playerProbe,
  press,
} from './helpers';
import {
  ANNEX_DRIVER,
  approachAudited,
  bootPilotScene,
  concourseToWorkshop,
  useDoor,
  walkTo,
  workshopVia,
} from './pilotHelpers';

type Point = { x: number; y: number };

const OUT =
  process.env.U14D3_OUT ?? 'test-results/u14d3-workshop-access/evidence';
const VIEWPORT = { width: 1280, height: 720 };

const GRID = gridOf(WORKSHOP_LAYOUT, WORKSHOP_SOLIDS);
const REACH = 64;
const STEP = 4;

const LOCKER = {
  solid: [525, 96, 61, 58],
  anchor: { x: 555, y: 148 },
  approach: { x: 555, y: 190 },
};
const BENCH = {
  solid: [486, 288, 106, 58],
  anchor: { x: 566, y: 305 },
  approach: { x: 578, y: 252 },
};
const DIVIDER = [1280, 216, 64, 16] as const;
const BOARD = { anchor: { x: 1344, y: 140 }, approach: { x: 1312, y: 178 } };
const SEAL_LOG = { anchor: { x: 1211, y: 142 }, approach: { x: 1224, y: 196 } };
const DOOR = { anchor: { x: 1332, y: 290 }, approach: { x: 1288, y: 268 } };

const away = (a: Point, b: Point): number => Math.hypot(a.x - b.x, a.y - b.y);
const entry = (id: string) => {
  const found = WORKSHOP_REGISTRY.find((candidate) => candidate.id === id);

  if (found === undefined) {
    throw new Error(`no registry entry ${id}`);
  }

  return found;
};

/** The engine's continuous feet box at a (fractional) position (collision audit). */
function engineBodyFits(grid: RoomGrid, x: number, y: number): boolean {
  return [Math.floor(x), Math.ceil(x)].every((bx) =>
    [Math.floor(y), Math.ceil(y)].every((by) => bodyFits(grid, bx, by)),
  );
}

/** Where a one-axis slide from `from` stops in the model. */
function predictStop(from: Point, axis: 'x' | 'y', dir: 1 | -1): number {
  const at = { ...from };

  for (let i = 0; i <= 2000; i += 1) {
    const next = { ...at, [axis]: at[axis] + dir };

    if (!engineBodyFits(GRID, next.x, next.y)) {
      return at[axis];
    }

    at[axis] = next[axis];
  }

  throw new Error('predictStop: no stop');
}

/** Every position the avatar can stand at, walked from the spawn on a 4 px lattice. */
function standsFromSpawn(): Point[] {
  const key = (at: Point) => `${at.x},${at.y}`;
  const reached = new Map<string, Point>([
    [key(WORKSHOP_SPAWN), { ...WORKSHOP_SPAWN }],
  ]);
  const queue = [...reached.values()];

  for (let head = 0; head < queue.length; head += 1) {
    const current = queue[head];

    for (const [dx, dy] of [
      [STEP, 0],
      [-STEP, 0],
      [0, STEP],
      [0, -STEP],
    ]) {
      const next = { x: current.x + dx, y: current.y + dy };

      if (!reached.has(key(next)) && bodyFits(GRID, next.x, next.y)) {
        reached.set(key(next), next);
        queue.push(next);
      }
    }
  }

  return [...reached.values()];
}

/** The registry objects within the 72 px range at `at`, nearest first. */
function inRange(at: Point) {
  return WORKSHOP_REGISTRY.map((object) => ({
    id: object.id,
    distance: away(at, object),
  }))
    .filter((object) => object.distance < INTERACTION_RADIUS)
    .sort((a, b) => a.distance - b.distance);
}

const PIECE_PLACES = M04_PIECES.map((piece) => ({
  id: piece.object_id,
  x: WORKSHOP_SITES.cutterScatter.x + piece.dx,
  y: WORKSHOP_SITES.cutterScatter.y + piece.dy,
}));

test.describe('U14-D3 workshop access (pure)', () => {
  test('the approved annex, locker, bench and east-wall geometry, exactly; the withdrawn solids absent', () => {
    expect([WORKSHOP_COLS, WORKSHOP_ROWS]).toEqual([43, 19]);
    expect(GRID.widthPx).toBe(1376);
    expect(GRID.heightPx).toBe(608);
    expect(WORKSHOP_ANNEX).toEqual({
      floor: [6, 12, 13, 6],
      doorway: [10, 10, 5, 2],
      doorX0: 336,
      doorX1: 464,
      axisX: 400,
    });
    // The clear opening is 128 px between the two 16 px jambs.
    expect(WORKSHOP_ANNEX.doorX1 - WORKSHOP_ANNEX.doorX0).toBe(128);
    expect(WORKSHOP_SOLIDS).toContainEqual([320, 320, 16, 64]);
    expect(WORKSHOP_SOLIDS).toContainEqual([464, 320, 16, 64]);
    expect(WORKSHOP_SOLIDS).not.toContainEqual([352, 320, 16, 64]);
    expect(WORKSHOP_SOLIDS).not.toContainEqual([432, 320, 16, 64]);
    // The annex floor rows and the doorway rows of the layout.
    for (const row of [10, 11]) {
      expect(WORKSHOP_LAYOUT[row]).toBe(
        `${'#'.repeat(10)}.....${'#'.repeat(28)}`,
      );
    }

    for (let row = 12; row < 18; row += 1) {
      expect(WORKSHOP_LAYOUT[row]).toBe(
        `${'#'.repeat(6)}${'.'.repeat(13)}${'#'.repeat(24)}`,
      );
    }

    // Component Locker: tile units [16.4, 3, 1.9, 2] on the north wall.
    expect(WORKSHOP_SOLIDS).toContainEqual(LOCKER.solid);
    expect(WORKSHOP_STATIONS.storageLocker).toEqual(LOCKER.anchor);
    expect(entry('workshop.storage_locker').approach).toEqual(LOCKER.approach);
    expect(entry('workshop.storage_locker').label).toBe('Component Locker');
    expect(entry('workshop.storage_locker').opens).toEqual({
      kind: 'inventory',
      id: 'container',
    });
    // Assembly Bench: tile units [15.2, 9, 3.3, 2], one tile east.
    expect(WORKSHOP_SOLIDS).toContainEqual(BENCH.solid);
    expect(WORKSHOP_STATIONS.assemblyBench).toEqual(BENCH.anchor);
    expect(entry('workshop.assembly_bench').approach).toEqual(BENCH.approach);
    expect(entry('workshop.assembly_bench').opens).toEqual({
      kind: 'inventory',
      id: 'workbench',
    });
    // The old south-hull locker and the old bench footprints are gone.
    expect(WORKSHOP_SOLIDS).not.toContainEqual([301, 288, 61, 58]);
    expect(WORKSHOP_SOLIDS).not.toContainEqual([454, 288, 106, 58]);
    // East wall: the one divider; the two withdrawn solids absent.
    expect(WORKSHOP_SOLIDS).toContainEqual([...DIVIDER]);
    expect(
      WORKSHOP_SOLIDS.filter(([x, y]) => x >= 1280 && y >= 96 && y < 320),
    ).toEqual([[...DIVIDER]]);
    expect(WORKSHOP_SOLIDS).not.toContainEqual([1280, 128, 64, 96]);
    expect(WORKSHOP_SOLIDS).not.toContainEqual([1312, 224, 32, 32]);
    // Unchanged anchors and approaches.
    expect(WORKSHOP_STATIONS.workOrderBoard).toEqual(BOARD.anchor);
    expect(entry('workshop.work_order_board').approach).toEqual(BOARD.approach);
    expect(WORKSHOP_SITES.sealLog).toEqual(SEAL_LOG.anchor);
    expect(entry('workshop.seal_log').approach).toEqual(SEAL_LOG.approach);
    expect(PILOT_DOORS.records_workshop).toEqual([
      { to: 'station_concourse', x: 1332, y: 290, label: 'Station Concourse' },
    ]);
    expect(entry('workshop.door_concourse')).toMatchObject({
      x: 1332,
      y: 290,
      approach: DOOR.approach,
    });
    expect(WORKSHOP_STATIONS.pressB).toEqual({ x: 302, y: 160 });
    expect(entry('workshop.press_b').approach).toEqual({ x: 302, y: 204 });
    expect(WORKSHOP_SPAWN).toEqual({ x: 1256, y: 244 });
  });

  test('M04 is untouched: cutter, bin, scatter origin, the six places, the 64/64/64 reaches', () => {
    expect(WORKSHOP_SITES.sampleCutter).toEqual({ x: 400, y: 456 });
    expect(WORKSHOP_SITES.cutterScatter).toEqual({ x: 400, y: 456 });
    expect(WORKSHOP_SITES.disposalChute).toEqual({ x: 400, y: 556 });
    expect(entry('workshop.sample_cutter').approach).toEqual({
      x: 400,
      y: 423,
    });
    expect(WORKSHOP_SOLIDS).toContainEqual([352, 451, 96, 87]);
    expect(WORKSHOP_SOLIDS).toContainEqual([374, 538, 52, 32]);
    expect(
      M04_PIECES.map((piece) => [piece.object_id, piece.dx, piece.dy]),
    ).toEqual([
      ['m04_offcut_a', -172, 20],
      ['m04_swarf_a', -188, 60],
      ['m04_wrap_a', -188, 100],
      ['m04_offcut_b', 172, 20],
      ['m04_swarf_b', 188, 60],
      ['m04_wrap_b', 188, 100],
    ]);
    expect(PIECE_PLACES.map((place) => [place.x, place.y])).toEqual([
      [228, 476],
      [212, 516],
      [212, 556],
      [572, 476],
      [588, 516],
      [588, 556],
    ]);

    // The scene's reaches (fixture check of the source): keyboard pickup,
    // pointer pickup (the pointer layer's reachRadius is PIECE_REACH) and
    // the bin, 64 px each; the administration version m04-cutting-v4.
    const scene = readFileSync('src/scenes/RecordsWorkshopScene.ts', 'utf8');

    expect(scene).toContain('const PIECE_REACH = 64;');
    expect(scene).toContain('const BIN_REACH = 64;');
    expect(scene).toContain('reachRadius: PIECE_REACH,');
    expect(scene).toMatch(/m04-cutting-v4/);
  });

  test('no piece is reachable from the widened entrance, the hall, the locker, the bench, the board or the door', () => {
    const stands = standsFromSpawn();

    expect(stands.length).toBeGreaterThan(10_000);

    // The doorway threshold: between the new jambs the feet pass at x 348 … 452.
    const threshold = stands.filter(
      (stand) => stand.y >= 312 && stand.y <= 360,
    );

    expect(Math.min(...threshold.map((stand) => stand.x))).toBe(348);
    expect(Math.max(...threshold.map((stand) => stand.x))).toBe(452);

    // From the hall and the doorway (avatar origin north of the annex
    // floor) no piece is within reach.
    const outside = stands.filter((stand) => stand.y < 384);

    expect(outside.length).toBeGreaterThan(5_000);

    // (One assertion over the whole set: the violations, listed.)
    const inReach = (from: Point[]) =>
      from.flatMap((stand) =>
        PIECE_PLACES.filter((place) => away(stand, place) <= REACH).map(
          (place) => `${place.id} from ${stand.x},${stand.y}`,
        ),
      );

    expect(inReach(outside)).toEqual([]);

    // From anywhere a relocated station, the board or the door answers a
    // press, no piece is within reach either.
    for (const anchor of [
      LOCKER.anchor,
      BENCH.anchor,
      BOARD.anchor,
      SEAL_LOG.anchor,
      DOOR.anchor,
    ]) {
      const near = stands.filter(
        (stand) => away(stand, anchor) < INTERACTION_RADIUS,
      );

      expect(near.length).toBeGreaterThan(0);
      expect(inReach(near)).toEqual([]);
    }

    // Every piece keeps its clearance from the relocated stations.
    for (const place of PIECE_PLACES) {
      expect(away(place, LOCKER.anchor)).toBeGreaterThan(
        INTERACTION_RADIUS + REACH,
      );
      expect(away(place, BENCH.anchor)).toBeGreaterThan(
        INTERACTION_RADIUS + REACH,
      );
    }
  });

  test('Press B, locker, bench, Work Order Board, Seal Log and Concourse door: standable ±12 px landing boxes, each its own strictly nearest object', () => {
    const cases = [
      'workshop.press_b',
      'workshop.storage_locker',
      'workshop.assembly_bench',
      'workshop.work_order_board',
      'workshop.seal_log',
      'workshop.door_concourse',
    ];

    for (const id of cases) {
      const object = entry(id);

      expect(
        away(object.approach, object),
        `${id} approach in radius`,
      ).toBeLessThan(INTERACTION_RADIUS);

      for (const dx of [-12, 0, 12]) {
        for (const dy of [-12, 0, 12]) {
          const landing = {
            x: object.approach.x + dx,
            y: object.approach.y + dy,
          };

          expect(
            bodyFits(GRID, landing.x, landing.y),
            `${id} standable at ${landing.x},${landing.y}`,
          ).toBe(true);

          const ranked = inRange(landing);

          expect(
            ranked[0]?.id,
            `${id} nearest at ${landing.x},${landing.y}`,
          ).toBe(id);

          if (ranked.length > 1) {
            expect(
              ranked[1].distance - ranked[0].distance,
              `${id} strictly nearest at ${landing.x},${landing.y}`,
            ).toBeGreaterThan(0);
          }
        }
      }
    }

    // Neither east-wall prompt wins at the other's approach: the door is
    // out of range at the board approach and the board at the door's.
    expect(inRange(BOARD.approach).map((o) => o.id)).toEqual([
      'workshop.work_order_board',
    ]);
    expect(inRange(DOOR.approach).map((o) => o.id)).toEqual([
      'workshop.door_concourse',
    ]);
    expect(away(BOARD.approach, DOOR.anchor)).toBeGreaterThan(
      INTERACTION_RADIUS,
    );
    expect(away(DOOR.approach, BOARD.anchor)).toBeGreaterThan(
      INTERACTION_RADIUS,
    );
    expect(away(BOARD.approach, SEAL_LOG.anchor)).toBeGreaterThan(
      INTERACTION_RADIUS,
    );
  });

  test('the divider closes the direct way between the alcove and the doorway; the way round runs west of x 1280; the spawn is clear', () => {
    // No body can stand with its feet across the divider's rows while
    // its feet box overlaps the divider's columns.
    for (let x = 1270; x <= 1333; x += 1) {
      for (let y = 193; y <= 221; y += 1) {
        expect(bodyFits(GRID, x, y), `${x},${y} blocked`).toBe(false);
      }
    }

    // Just north and just south of it the floor is standable at the
    // board's column; west of it the lane runs through.
    expect(bodyFits(GRID, 1312, 192)).toBe(true);
    expect(bodyFits(GRID, 1312, 242)).toBe(true);
    expect(bodyFits(GRID, 1269, 200)).toBe(true);
    expect(bodyFits(GRID, 1269, 216)).toBe(true);
    // A slide south from the board approach stops with the feet on the
    // divider's north face (origin y 192: feet 202 … 215).
    expect(predictStop(BOARD.approach, 'y', 1)).toBe(192);
    // A slide north from the door approach stops under it (origin 222: feet 232 … 245).
    expect(predictStop(DOOR.approach, 'y', -1)).toBe(222);

    // Both approaches are reached from the spawn, and every reachable
    // stand whose feet are level with the divider lies west of it.
    const stands = standsFromSpawn();
    const key = new Set(stands.map((stand) => `${stand.x},${stand.y}`));

    // (The lattice runs from the spawn in 4 px steps, so an approach off
    // it is checked at its nearest lattice point inside the landing box.)
    expect(key.has(`${BOARD.approach.x},${BOARD.approach.y + 2}`)).toBe(true);
    expect(key.has(`${DOOR.approach.x},${DOOR.approach.y}`)).toBe(true);
    expect(key.has(`${LOCKER.approach.x + 1},${LOCKER.approach.y + 2}`)).toBe(
      true,
    );
    expect(key.has(`${BENCH.approach.x + 2},${BENCH.approach.y}`)).toBe(true);
    expect(
      stands
        .filter((stand) => stand.y >= 196 && stand.y <= 220)
        .every((stand) => stand.x <= 1269),
    ).toBe(true);

    // The spawn keeps its clearance: standable, 80 px or more from the
    // door and outside every object's range.
    expect(bodyFits(GRID, WORKSHOP_SPAWN.x, WORKSHOP_SPAWN.y)).toBe(true);
    expect(away(WORKSHOP_SPAWN, DOOR.anchor)).toBeGreaterThanOrEqual(80);
    expect(inRange(WORKSHOP_SPAWN)).toEqual([]);
    // The divider lies outside the spawn's feet box and the spawn is not
    // walled in: the lane west and the door approach are reachable.
    expect(WORKSHOP_SPAWN.x + BODY.halfWidth - 1).toBeLessThan(DIVIDER[0]);
  });
});

// ——— Browser evidence ———————————————————————————————————————————————————

async function promptText(page: Page): Promise<string | null> {
  return page.evaluate(
    () =>
      (
        window as unknown as {
          __worldPromptProbe?: { prompt: boolean; text?: string | null } | null;
        }
      ).__worldPromptProbe?.text ?? null,
  );
}

async function avatar(page: Page): Promise<Point> {
  const at = await playerProbe(page);

  expect(at).not.toBeNull();

  return { x: at!.x, y: at!.y };
}

async function shot(page: Page, name: string) {
  await page.waitForTimeout(350);
  await page.screenshot({ path: `${OUT}/${name}.png` });
}

async function sceneOf(page: Page): Promise<string | null> {
  return page.evaluate(
    () =>
      (window as unknown as { __playerProbe?: { scene: string } | null })
        .__playerProbe?.scene ?? null,
  );
}

async function overlayOpen(page: Page): Promise<boolean> {
  return page.evaluate(
    () =>
      (
        window as unknown as {
          __inventoryUiProbe?: { open: boolean; mode?: string } | null;
        }
      ).__inventoryUiProbe?.open ?? false,
  );
}

async function overlayMode(page: Page): Promise<string | null> {
  return page.evaluate(
    () =>
      (
        window as unknown as {
          __inventoryUiProbe?: { open: boolean; mode?: string } | null;
        }
      ).__inventoryUiProbe?.mode ?? null,
  );
}

async function waitOverlay(page: Page, open: boolean) {
  await page.waitForFunction(
    (expected) =>
      ((window as unknown as { __inventoryUiProbe?: { open: boolean } | null })
        .__inventoryUiProbe?.open ?? false) === expected,
    open,
    { timeout: 10_000 },
  );
  await page.waitForTimeout(300);
}

async function eventsOf(page: Page, type: string) {
  return (await getEvents(page)).filter(
    (event) => event.event_type === type,
  ) as {
    event_type: string;
    metadata?: Record<string, unknown>;
  }[];
}

/** From the board approach: west of the divider first, then down, then to the door approach. */
async function boardToDoorApproach(page: Page) {
  await driveAxisTo(page, 'x', 1250, 8);
  await driveAxisTo(page, 'y', DOOR.approach.y, 8);
  await walkTo(page, DOOR.approach.x, DOOR.approach.y);
}

test.describe('U14-D3 workshop access (browser)', () => {
  test('the widened entrance, the relocated locker and bench, the alcove and the doorway each show their own prompt; the divider stops the avatar; the door leads to the Concourse once and the return spawn is safe', async ({
    page,
  }) => {
    test.setTimeout(600_000);
    mkdirSync(OUT, { recursive: true });
    await page.setViewportSize(VIEWPORT);
    await bootPilotScene(page, 'u14d3', 'records_workshop');

    // 1. The western bay: locker on the north wall, the widened entrance,
    //    the bench one tile east.
    await workshopVia(page, ANNEX_DRIVER.doorX, ANNEX_DRIVER.bayY);
    await shot(page, '01-western-bay-locker-entrance-bench');

    // 2. The annex, entered through the widened entrance (the feet pass
    //    between the new jambs).
    await workshopVia(page, ANNEX_DRIVER.doorX, ANNEX_DRIVER.rowY);

    const inside = await avatar(page);

    expect(inside.y).toBeGreaterThan(400);
    expect(inside.x).toBeGreaterThan(WORKSHOP_ANNEX.doorX0 + BODY.halfWidth);
    expect(inside.x).toBeLessThan(WORKSHOP_ANNEX.doorX1 - BODY.halfWidth);
    expect((await promptText(page)) ?? '').not.toContain('Component Locker');
    await shot(page, '02-annex-through-the-widened-entrance');

    // The relocated stations answer at their audited approaches.
    for (const id of [
      'workshop.storage_locker',
      'workshop.assembly_bench',
      'workshop.press_b',
    ]) {
      const object = entry(id);
      const text = await approachAudited(page, workshopVia, object, () =>
        promptText(page),
      );

      expect(text, `${id} prompt`).not.toBeNull();
      expect(text!.toLowerCase()).toContain(object.label.toLowerCase());
    }

    // 3. The Work Order Board alcove at (1312, 178): the board's prompt,
    //    the door's not.
    await workshopVia(page, BOARD.approach.x, BOARD.approach.y);
    await page.waitForTimeout(250);

    const atBoard = await avatar(page);

    expect(Math.abs(atBoard.x - BOARD.approach.x)).toBeLessThanOrEqual(12);
    expect(Math.abs(atBoard.y - BOARD.approach.y)).toBeLessThanOrEqual(12);

    const boardLine = await promptText(page);

    expect(boardLine ?? '').toContain('Work Order Board');
    expect(boardLine ?? '').not.toContain('Station Concourse');
    await shot(page, '03-upper-work-order-board-alcove-prompt');

    // The divider: a held DOWN key from the alcove ends in the wall clamp
    // where the pure model stops the body, and the door never answers.
    const stallsBefore = getDriverStats().stallAborts;
    const from = await avatar(page);
    const expectedStop = predictStop(from, 'y', 1);

    await driveAxisTo(page, 'y', GRID.heightPx + 400, 1);

    const stopped = await avatar(page);

    expect(getDriverStats().stallAborts).toBe(stallsBefore + 1);
    expect(
      Math.abs(stopped.y - expectedStop),
      `divider stop ${stopped.y} vs model ${expectedStop}`,
    ).toBeLessThanOrEqual(3);
    expect(stopped.y).toBeLessThan(DIVIDER[1] - BODY.bottom + 4);
    expect((await promptText(page)) ?? '').not.toContain('Station Concourse');

    // 4. The lower open Concourse threshold at (1288, 268), reached round
    //    the divider: the door's prompt, the board's not.
    await boardToDoorApproach(page);
    await page.waitForTimeout(250);

    const atDoor = await avatar(page);

    expect(Math.abs(atDoor.x - DOOR.approach.x)).toBeLessThanOrEqual(12);
    expect(Math.abs(atDoor.y - DOOR.approach.y)).toBeLessThanOrEqual(12);

    const doorLine = await promptText(page);

    expect(doorLine ?? '').toContain('Station Concourse');
    expect(doorLine ?? '').not.toContain('Work Order Board');
    await shot(page, '04-lower-open-concourse-threshold-prompt');

    // 6. Through the door once; the Concourse after it.
    const usedBefore = (await eventsOf(page, 'pilot_door_used')).length;

    await useDoor(page, DOOR.anchor, 'station_concourse', {
      approachOffset: {
        x: DOOR.approach.x - DOOR.anchor.x,
        y: DOOR.approach.y - DOOR.anchor.y,
      },
      yFirst: true,
    });
    expect(await sceneOf(page)).toBe('station_concourse');
    expect((await eventsOf(page, 'pilot_door_used')).length).toBe(
      usedBefore + 1,
    );
    await shot(page, '06-station-concourse-after-the-door');
    await press(page, 'Space'); // reflex press: must not bounce back
    await page.waitForTimeout(600);
    expect(await sceneOf(page)).toBe('station_concourse');

    // The return spawn: at the audited spawn, no object in range, a reflex
    // press changes nothing.
    await concourseToWorkshop(page);
    expect(await sceneOf(page)).toBe('records_workshop');

    const spawned = await avatar(page);

    expect(away(spawned, WORKSHOP_SPAWN)).toBeLessThan(24);
    await page.waitForTimeout(250);
    expect(await promptText(page)).toBeNull();
    await press(page, 'Space');
    await page.waitForTimeout(600);
    expect(await sceneOf(page)).toBe('records_workshop');
    expect(await overlayOpen(page)).toBe(false);
  });

  test('the east wall with the collision overlay: the divider between the alcove and the doorway', async ({
    page,
  }) => {
    test.setTimeout(300_000);
    mkdirSync(OUT, { recursive: true });
    await page.setViewportSize(VIEWPORT);

    const tag = `u14d3col${Date.now() % 100000}`;

    await page.goto(
      `/?participant_id=PT_${tag}&game_session_id=GS_${tag}&scene=records_workshop&collision=1`,
    );
    await page.waitForFunction(
      () =>
        (window as unknown as { __playerProbe?: { scene: string } | null })
          .__playerProbe?.scene === 'records_workshop',
      undefined,
      { timeout: 60_000 },
    );
    await page.waitForTimeout(1500);
    // 5. Stand at the door approach so the whole east wall is in frame.
    await workshopVia(page, DOOR.approach.x, DOOR.approach.y);
    await shot(page, '05-east-wall-divider-collision-overlay');
    expect((await promptText(page)) ?? '').toContain('Station Concourse');
  });

  test('M08: the Component Locker on the north wall engages the stowing job once, on its first opening, exactly as before', async ({
    page,
  }) => {
    test.setTimeout(300_000);
    await page.setViewportSize(VIEWPORT);
    await bootPilotScene(page, 'u14d3m08', 'records_workshop');

    const ENGAGED = 'secondary_m08_optional_job_engaged';

    expect((await eventsOf(page, ENGAGED)).length).toBe(0);

    const locker = entry('workshop.storage_locker');
    const text = await approachAudited(page, workshopVia, locker, () =>
      promptText(page),
    );

    expect(text ?? '').toContain('Component Locker');
    await press(page, 'Space');
    await waitOverlay(page, true);
    expect(await overlayMode(page)).toBe('container');

    const engaged = await eventsOf(page, ENGAGED);

    expect(engaged).toHaveLength(1);
    expect(engaged[0].metadata?.job).toBe('stow_supplies');
    await page.keyboard.press('Escape');
    await waitOverlay(page, false);

    // Opened again: nothing engages again.
    await press(page, 'Space');
    await waitOverlay(page, true);
    expect(await overlayMode(page)).toBe('container');
    expect((await eventsOf(page, ENGAGED)).length).toBe(1);
    await page.keyboard.press('Escape');
    await waitOverlay(page, false);

    const opened = (await getEvents(page)).filter(
      (event) => event.event_type === 'pilot_station_opened',
    ) as { metadata?: Record<string, unknown> }[];

    expect(opened.map((event) => event.metadata?.station_id)).toEqual([
      'storage_locker',
      'storage_locker',
    ]);
  });
});
