/**
 * V4 visual-validity redesign — scientific regression projection over the
 * complete participant route (mission §7).
 *
 * Drives the same full route as pilot_full_route_timing.spec.ts with REAL
 * input (Dock → … → stable Core), then writes a compact projection of the
 * route-stage / scene / zone sequences, opportunity ids, window ids,
 * event-family sequence and counts, payload-key sets, form assignments,
 * validity values and completion state to
 *
 *   docs/verification/professional-visual-v4/projection/<V4_LABEL>.json
 *
 * When V4_PROJECTION_BASELINE names an earlier projection file, the run
 * compares against it and FAILS on any difference (a visual change must
 * not silently change scientific events). Nothing here reads DEV state
 * into gameplay; the probes are read-only.
 *
 *   V4_LABEL                 file stem (default "current")
 *   V4_PROJECTION_BASELINE   path of the baseline projection to compare
 *   V4_VIEWPORT              WxH browser viewport (default 800x600)
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { expect, type Page, test } from '@playwright/test';

import {
  closeStationRecord,
  enterCoreChamber,
  feedPanel,
  openFeedPanel,
  openSyncReview,
  routeToUtilityDeck,
  waitCompletionNotice,
  waitCoreState,
  waitFeedPanel,
} from './closureHelpers';
import { hold, press } from './helpers';
import { captureErrors, expectNoRuntimeErrors } from './journey';
import { pilotProbe } from './pilotHelpers';
import { clickElement, keyActivate } from './returnHelpers';
import {
  buildScientificProjection,
  compareProjections,
  type ProjectionEventLike,
  type ScientificProjection,
} from './v4Projection';

const OUT_DIR = 'docs/verification/professional-visual-v4/projection';
const LABEL = process.env.V4_LABEL ?? 'current';
const BASELINE = process.env.V4_PROJECTION_BASELINE;
const VIEWPORT = (() => {
  const raw = process.env.V4_VIEWPORT ?? '800x600';
  const [w, h] = raw.split('x').map((value) => Number(value));

  return { width: w || 800, height: h || 600 };
})();

async function waitReady(page: Page) {
  await page.waitForFunction(
    () =>
      (window as unknown as { __feedPanelProbe?: { ready: boolean } | null })
        .__feedPanelProbe?.ready === true,
    undefined,
    { timeout: 10_000 },
  );
}

/** Game design-space (800×600 legacy or the V4 HUD space) → page pixel. */
async function designPoint(page: Page, x: number, y: number) {
  const box = (await page.locator('canvas').boundingBox())!;
  const space = await page.evaluate(
    () =>
      (
        window as unknown as {
          __designSpace?: {
            width: number;
            height: number;
            offsetX: number;
            offsetY: number;
            scale: number;
            canvasWidth: number;
            canvasHeight: number;
          } | null;
        }
      ).__designSpace ?? null,
  );

  if (space === null) {
    return {
      x: box.x + (x * box.width) / 800,
      y: box.y + (y * box.height) / 600,
    };
  }

  return {
    x:
      box.x +
      ((space.offsetX + x * space.scale) * box.width) / space.canvasWidth,
    y:
      box.y +
      ((space.offsetY + y * space.scale) * box.height) / space.canvasHeight,
  };
}

test('v4 scientific projection — complete participant route', async ({
  page,
}) => {
  test.setTimeout(1_800_000);
  await page.setViewportSize(VIEWPORT);

  const errors = captureErrors(page);

  await routeToUtilityDeck(page, `proj_${LABEL}`, {
    concourse: { watch: 'accept', promise: 'accept', readGauge1: true },
    calibration: true,
    mast: 'partial',
  });

  await closeStationRecord(page);

  await openFeedPanel(page, 'coolant');
  for (let chunk = 0; chunk < 10; chunk += 1) {
    await hold(page, 'ArrowRight', 700);

    const ready = await page.evaluate(
      () =>
        (window as unknown as { __feedPanelProbe?: { ready: boolean } | null })
          .__feedPanelProbe?.ready === true,
    );

    if (ready) break;
  }
  await waitReady(page);
  await press(page, 'Enter');
  await waitFeedPanel(page, false);

  await openFeedPanel(page, 'calibration');
  for (let step = 0; step < 7; step += 1) {
    await press(page, 'ArrowUp');
  }
  await press(page, 'Enter');
  await waitReady(page);
  await press(page, 'Enter');
  await waitFeedPanel(page, false);

  const bus = await openFeedPanel(page, 'distribution');
  const coupler = bus.geometry.coupler!;
  const socket = bus.geometry.socket!;
  const from = await designPoint(
    page,
    coupler.x + coupler.w / 2,
    coupler.y + coupler.h / 2,
  );
  const to = await designPoint(
    page,
    socket.x + socket.w / 2,
    socket.y + socket.h / 2,
  );

  await page.mouse.move(from.x, from.y);
  await page.mouse.down();
  await page.mouse.move((from.x + to.x) / 2, from.y, { steps: 10 });
  await page.mouse.move(to.x, to.y, { steps: 10 });
  await page.mouse.up();
  await waitReady(page);
  expect((await feedPanel(page))?.coupler).toBe('seated');
  await press(page, 'Enter');
  await waitFeedPanel(page, false);

  // World V2 deck / chamber: the door and Core approaches are driven by
  // the audited helpers themselves (deckVia / coreVia); the former raw
  // walks stood on the old 25×19 rooms.
  await enterCoreChamber(page);
  await openSyncReview(page);
  await keyActivate(page, 'arm_sync');
  await waitCoreState(page, 'confirmation_armed');
  await clickElement(page, 'confirm_sync');
  await waitCoreState(page, 'stable');
  await waitCompletionNotice(page, true);
  await press(page, 'Escape');

  // ——— Projection ———
  const events = (await page.evaluate(() =>
    JSON.parse(
      (
        window as unknown as {
          researchRuntime: { exportEventsJSON: () => string };
        }
      ).researchRuntime.exportEventsJSON(),
    ),
  )) as ProjectionEventLike[] | { events?: ProjectionEventLike[] };
  const list: ProjectionEventLike[] = Array.isArray(events)
    ? events
    : (events.events ?? []);
  const opportunities = (await page.evaluate(
    () =>
      (window as unknown as { __measurementValidity?: unknown })
        .__measurementValidity ?? [],
  )) as { opportunity_id: string }[];
  const coverage = await page.evaluate(
    () => (window as unknown as { __pilotCoverage?: unknown }).__pilotCoverage,
  );
  const probe = await pilotProbe(page);

  const projection = buildScientificProjection({
    events: list,
    opportunities,
    coverage,
    finalStage: probe?.stage ?? null,
    routeSummary: probe?.route ?? null,
  });

  mkdirSync(OUT_DIR, { recursive: true });

  const outPath = join(OUT_DIR, `${LABEL}.json`);

  writeFileSync(outPath, JSON.stringify(projection, null, 2) + '\n');
  test.info().annotations.push({
    type: 'v4-projection',
    description: `${outPath}: ${list.length} events, ${projection.opportunity_ids.length} opportunities, final stage ${projection.final_stage}`,
  });

  expect(
    projection.zone_sequence.length,
    'the route crossed zones',
  ).toBeGreaterThan(5);
  expect(projection.final_stage).toBe('complete');

  if (BASELINE !== undefined && existsSync(BASELINE)) {
    const baseline = JSON.parse(
      readFileSync(BASELINE, 'utf8'),
    ) as ScientificProjection;
    const differences = compareProjections(baseline, projection);

    writeFileSync(
      join(OUT_DIR, `${LABEL}.diff.json`),
      JSON.stringify(differences, null, 2) + '\n',
    );
    expect(differences, `projection differs from ${BASELINE}`).toEqual([]);
  }

  expectNoRuntimeErrors(errors);
});
