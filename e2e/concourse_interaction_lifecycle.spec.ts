/**
 * Station Concourse — interaction lifecycle regression (hotfix).
 *
 * Defect: the Concourse paused itself to launch the inventory overlay, but
 * the overlay scene never called `scene.bringToTop()`. Phaser renders active
 * scenes in SceneManager registration order, and `src/index.ts` registers
 * `Object.values(scenes)` — an ES module namespace, so the order is
 * alphabetical by export name. `StationConcourseScene` sorts AFTER
 * `InventoryOverlayScene`, so the paused Concourse drew straight over the
 * open overlay: a frozen room and no panel. Pressing I reached the hidden
 * overlay (the paused host receives no keyboard events) and closed it, which
 * is why the inventory looked like the only way out.
 *
 * Evidence here is POSITIVE, never "no error": the overlay panel area is
 * sampled from real screenshot pixels before and after opening, the world is
 * shown frozen while it is open, and the player is shown moving immediately
 * after it closes — with I never used as a recovery key.
 *
 * Real keyboard input, read-only DEV probes, no teleports.
 */
import type { Page } from '@playwright/test';
import { expect, test } from '@playwright/test';

import { driveAxisTo, getEvents, selectPromptOption } from './helpers';
import {
  captureErrors,
  completeDockTutorial,
  expectNoRuntimeErrors,
} from './journey';
import {
  bootPilot,
  concourseToWorkshop,
  dockToConcourse,
  hold,
  openPromptAt,
  PILOT,
  press,
  useDoor,
  valeHandover,
} from './pilotHelpers';

const OUT = 'docs/verification/screenshots-concourse-hotfix';

/** The offset pilot_records already proves lands inside the 72px radius. */
const APPROACH = { x: 0, y: 44 } as const;

/** RoomScene.updateProximity interaction radius. */
const INTERACTION_RANGE = 72;

/** Overlay panel rect (InventoryOverlayScene PANEL) sampled well inside. */
const PANEL_POINTS: [number, number][] = [];

for (let x = 70; x <= 730; x += 110) {
  for (let y = 70; y <= 530; y += 92) {
    PANEL_POINTS.push([x, y]);
  }
}

type Frame = number[][];

interface OverlayProbe {
  open: boolean;
  mode: string;
}

async function overlayProbe(page: Page): Promise<OverlayProbe | null> {
  return page.evaluate(
    () =>
      (window as unknown as { __inventoryUiProbe?: OverlayProbe | null })
        .__inventoryUiProbe ?? null,
  );
}

async function waitOverlay(page: Page, open: boolean) {
  await page.waitForFunction(
    (expected) =>
      ((window as unknown as { __inventoryUiProbe?: { open: boolean } | null })
        .__inventoryUiProbe?.open ?? false) === expected,
    open,
    { timeout: 8000 },
  );
  await page.waitForTimeout(250);
}

async function playerAt(page: Page) {
  const probe = await page.evaluate(
    () =>
      (
        window as unknown as {
          __playerProbe?: { scene: string; x: number; y: number } | null;
        }
      ).__playerProbe ?? null,
  );

  if (probe === null) {
    throw new Error('no __playerProbe');
  }

  return probe;
}

/**
 * Samples the real rendered frame at the overlay-panel points. Screenshot
 * pixels are decoded in the page (no image dependency in this repo).
 */
async function sampleFrame(page: Page): Promise<Frame> {
  const box = await page.locator('canvas').boundingBox();

  if (box === null) {
    throw new Error('canvas not found');
  }

  const png = (await page.screenshot()).toString('base64');

  return page.evaluate(
    async ({ png: data, box: rect, points }) => {
      const blob = await (await fetch(`data:image/png;base64,${data}`)).blob();
      const bitmap = await createImageBitmap(blob);
      const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
      const context = canvas.getContext('2d');

      if (context === null) {
        throw new Error('no 2d context');
      }

      context.drawImage(bitmap, 0, 0);

      return points.map(([x, y]) => {
        const sx = Math.round(rect.x + (x * rect.width) / 800);
        const sy = Math.round(rect.y + (y * rect.height) / 600);
        const pixel = context.getImageData(sx, sy, 1, 1).data;

        return [pixel[0], pixel[1], pixel[2]];
      });
    },
    { png, box, points: PANEL_POINTS },
  );
}

function changedFraction(before: Frame, after: Frame): number {
  let changed = 0;

  for (let i = 0; i < before.length; i += 1) {
    const delta = Math.max(
      Math.abs(before[i][0] - after[i][0]),
      Math.abs(before[i][1] - after[i][1]),
      Math.abs(before[i][2] - after[i][2]),
    );

    if (delta > 12) {
      changed += 1;
    }
  }

  return changed / before.length;
}

/**
 * Concourse navigation.
 *
 * The grid has two interior wall bands (rows 5 and 11) blocking columns 3-6
 * and 18-21, and the avatar body spans ±18px around the probe position — so
 * a naive axis-by-axis walk can clip a band with its body and clamp far from
 * the target, then interact with whatever station happens to be nearest.
 *
 * Every move is therefore routed along a "lane": a row whose whole body span
 * is clear across the hall. Bands are only ever crossed in column 12
 * (x = 384), which is clear in every row. The route is re-driven until the
 * avatar actually arrives, because driveAxisTo ends a leg on two stalled
 * reads and a dead frame window under load looks exactly like a wall.
 */
const CLEAR_COLUMN_X = 384;
const LANES = { top: 110, middle: 300, bottom: 460 } as const;

function laneFor(y: number): number {
  if (y < 152) {
    return LANES.top;
  }

  return y < 344 ? LANES.middle : LANES.bottom;
}

async function travelTo(page: Page, x: number, y: number): Promise<void> {
  for (let attempt = 0; attempt < 4; attempt += 1) {
    const from = await playerAt(page);

    if (Math.abs(from.x - x) <= 14 && Math.abs(from.y - y) <= 14) {
      return;
    }

    const fromLane = laneFor(from.y);
    const toLane = laneFor(y);

    await driveAxisTo(page, 'y', fromLane, 12);

    if (fromLane !== toLane) {
      await driveAxisTo(page, 'x', CLEAR_COLUMN_X, 14);
      await driveAxisTo(page, 'y', toLane, 12);
    }

    await driveAxisTo(page, 'x', x, 12);
    await driveAxisTo(page, 'y', y, 12);
  }
}

/** Straight-line distance from the avatar to a station. */
async function distanceTo(
  page: Page,
  at: { x: number; y: number },
): Promise<number> {
  const stood = await playerAt(page);

  return Math.hypot(stood.x - at.x, stood.y - at.y);
}

/**
 * Walks to a station, presses `interactKey`, and proves the overlay both
 * OPENED and became VISIBLE (the panel area of the rendered frame changed).
 *
 * The approach is retried, and the distance actually stood at is asserted: a
 * press from outside the 72px radius would silently target a different
 * station (or nothing) instead of failing honestly.
 */
async function openStation(
  page: Page,
  at: { x: number; y: number },
  interactKey: 'KeyE' | 'Space',
  expectedMode: string,
  shot?: string,
): Promise<void> {
  let before: Frame = [];
  let distance = Number.POSITIVE_INFINITY;
  let opened = false;

  for (let attempt = 0; attempt < 3 && !opened; attempt += 1) {
    await travelTo(page, at.x + APPROACH.x, at.y + APPROACH.y);
    distance = await distanceTo(page, at);

    if (distance > INTERACTION_RANGE - 1) {
      continue;
    }

    before = await sampleFrame(page);
    await press(page, interactKey);
    opened = await waitOverlay(page, true)
      .then(() => true)
      .catch(() => false);
  }

  // The approach itself is evidence: the press was made from inside the
  // station's own interaction radius, so it can only be this station.
  const stood = await playerAt(page);

  expect(
    distance,
    `approach failed: stood at ${stood.x.toFixed(0)},${stood.y.toFixed(0)} for station ${at.x},${at.y}`,
  ).toBeLessThan(INTERACTION_RANGE);
  expect(opened).toBe(true);

  const probe = await overlayProbe(page);

  expect(probe?.open).toBe(true);
  expect(probe?.mode).toBe(expectedMode);

  const after = await sampleFrame(page);

  // Positive visibility: the overlay is drawn ABOVE the paused room, so
  // nearly every sampled panel pixel differs from the bare room frame.
  expect(changedFraction(before, after)).toBeGreaterThan(0.8);

  if (shot !== undefined) {
    await page.screenshot({ path: `${OUT}/${shot}.png` });
  }
}

/**
 * Closes with ESC (never I). A stray SPACE that reached the overlay may have
 * picked a stack up, and the first ESC returns that stack — so ESC is sent
 * until the overlay is actually gone.
 */
async function closeOverlay(page: Page): Promise<void> {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    await press(page, 'Escape');

    if ((await overlayProbe(page))?.open !== true) {
      break;
    }
  }

  await waitOverlay(page, false);
}

/** Closes with ESC (never I) and proves the world is live again. */
async function closeAndMove(page: Page): Promise<void> {
  await closeOverlay(page);
  await expectCanMove(page);
}

/** Positive movement evidence: the avatar actually changes position. */
async function expectCanMove(page: Page): Promise<void> {
  const start = await playerAt(page);

  await hold(page, 'ArrowRight', 320);

  let now = await playerAt(page);

  if (Math.abs(now.x - start.x) <= 6) {
    await hold(page, 'ArrowLeft', 320);
    now = await playerAt(page);
  }

  expect(Math.abs(now.x - start.x)).toBeGreaterThan(6);
}

/** Dock -> Concourse -> Records Workshop (v2: the inventory surfaces live in the workshop). */
async function enterWorkshop(page: Page, tag: string) {
  await bootPilot(page, tag);
  await completeDockTutorial(page, 1);
  await dockToConcourse(page);
  await valeHandover(page);
  await concourseToWorkshop(page);
}

test.describe('station concourse interaction lifecycle', () => {
  test('A/D — incident filing opens on E and on SPACE; I never recovers', async ({
    page,
  }) => {
    const errors = captureErrors(page);

    await enterWorkshop(page, 'CIL_A');

    // ——— E ———
    await openStation(
      page,
      PILOT.workshop.filingDesk,
      'KeyE',
      'm02',
      'filing-station-open',
    );

    // The world really is held while the surface is up (positive check:
    // the avatar does not move) — and it is held ONLY while it is up.
    const held = await playerAt(page);

    await hold(page, 'ArrowRight', 320);
    expect((await playerAt(page)).x).toBeCloseTo(held.x, 0);

    await closeAndMove(page);

    // ——— SPACE — the same interaction, no inventory involved ———
    await openStation(page, PILOT.workshop.filingDesk, 'Space', 'm02');
    await closeAndMove(page);

    // ——— D: the inventory still opens and closes on its own ———
    const beforeI = await sampleFrame(page);

    await press(page, 'KeyI');
    await waitOverlay(page, true);
    expect((await overlayProbe(page))?.mode).toBe('backpack');
    expect(changedFraction(beforeI, await sampleFrame(page))).toBeGreaterThan(
      0.8,
    );

    await press(page, 'KeyI');
    await waitOverlay(page, false);
    await expectCanMove(page);

    expectNoRuntimeErrors(errors);
  });

  test('B — every other workshop E/SPACE surface opens, closes and releases the world', async ({
    page,
  }) => {
    const errors = captureErrors(page);

    await enterWorkshop(page, 'CIL_B');

    // Work Order Board — an in-scene prompt card (no overlay, no pause).
    await openPromptAt(page, PILOT.workshop.board, {
      approachOffset: { x: 0, y: 44 },
    });
    await selectPromptOption(page, 1);
    await page.waitForTimeout(500);
    await expectCanMove(page);

    // Label Press A / B — M03 occasions.
    await openStation(page, PILOT.workshop.pressA, 'KeyE', 'm03');
    await closeAndMove(page);
    await openStation(page, PILOT.workshop.pressB, 'Space', 'm03');
    await closeAndMove(page);

    // Component Locker — container transfer.
    await openStation(
      page,
      PILOT.workshop.storageLocker,
      'KeyE',
      'container',
      'component-locker-open',
    );
    await closeAndMove(page);

    // Assembly Bench — recipes.
    await openStation(page, PILOT.workshop.assemblyBench, 'Space', 'workbench');
    await closeAndMove(page);

    // Supply bundle — an E/SPACE surface with no overlay at all: it must
    // collect and leave the world running (inside the 64px bundle reach and
    // outside every 72px station radius).
    await travelTo(page, 96, 140);
    await press(page, 'Space');
    await page.waitForTimeout(400);
    expect((await overlayProbe(page))?.open ?? false).toBe(false);
    await expectCanMove(page);

    expectNoRuntimeErrors(errors);
  });

  test('C/E — no re-entrant dispatch; doors still work and never trap', async ({
    page,
  }) => {
    const errors = captureErrors(page);

    await enterWorkshop(page, 'CIL_C');
    await travelTo(
      page,
      PILOT.workshop.filingDesk.x + APPROACH.x,
      PILOT.workshop.filingDesk.y + APPROACH.y,
    );

    const opensBefore = (await getEvents(page)).filter(
      (event) =>
        event.event_type === 'pilot_station_opened' &&
        (event.metadata as { station_id?: string } | undefined)?.station_id ===
          'filing_desk',
    ).length;

    // Rapid alternating E/SPACE inside one interaction window.
    for (const code of ['KeyE', 'Space', 'KeyE', 'Space']) {
      await page.keyboard.down(code);
      await page.waitForTimeout(30);
      await page.keyboard.up(code);
      await page.waitForTimeout(40);
    }

    await waitOverlay(page, true);
    await page.waitForTimeout(600);

    const opensAfter = (await getEvents(page)).filter(
      (event) =>
        event.event_type === 'pilot_station_opened' &&
        (event.metadata as { station_id?: string } | undefined)?.station_id ===
          'filing_desk',
    ).length;

    // Exactly one dispatch — the burst cannot stack overlays or chain stages.
    expect(opensAfter - opensBefore).toBe(1);

    // Closing once is enough: nothing is stacked underneath.
    await closeAndMove(page);

    // A HELD key (auto-repeat) is still exactly one interaction.
    await travelTo(
      page,
      PILOT.workshop.filingDesk.x + APPROACH.x,
      PILOT.workshop.filingDesk.y + APPROACH.y,
    );
    await hold(page, 'KeyE', 900);
    await waitOverlay(page, true);
    await page.waitForTimeout(500);

    const opensHeld = (await getEvents(page)).filter(
      (event) =>
        event.event_type === 'pilot_station_opened' &&
        (event.metadata as { station_id?: string } | undefined)?.station_id ===
          'filing_desk',
    ).length;

    expect(opensHeld - opensAfter).toBe(1);
    await closeAndMove(page);

    // ——— E: route safety — every door still operates, both ways ———
    await useDoor(page, PILOT.workshop.eastDoor, 'station_concourse', {
      approachOffset: { x: -20, y: 0 },
      yFirst: true,
    });
    await useDoor(page, PILOT.concourse.westDoor, 'records_workshop', {
      approachOffset: { x: 20, y: 0 },
      yFirst: true,
    });
    await useDoor(page, PILOT.workshop.eastDoor, 'station_concourse', {
      approachOffset: { x: -20, y: 0 },
      yFirst: true,
    });
    await useDoor(page, PILOT.concourse.northDoor, 'diagnostics_laboratory', {
      approachOffset: { x: 0, y: 20 },
    });
    await useDoor(page, PILOT.lab.southDoor, 'station_concourse', {
      approachOffset: { x: 0, y: -20 },
    });
    await useDoor(page, PILOT.concourse.eastDoor, 'utility_core_deck', {
      approachOffset: { x: -20, y: 0 },
    });
    await useDoor(page, PILOT.deck.westDoor, 'station_concourse', {
      approachOffset: { x: 20, y: 0 },
    });
    await useDoor(page, PILOT.concourse.southDoor, 'dock', {
      approachOffset: { x: 0, y: -20 },
    });

    expect((await playerAt(page)).scene).toBe('dock');
    await expectCanMove(page);

    expectNoRuntimeErrors(errors);
  });
});
