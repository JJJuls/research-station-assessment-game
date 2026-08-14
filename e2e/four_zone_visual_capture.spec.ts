import { mkdirSync } from 'node:fs';

import type { Page } from '@playwright/test';
import { test } from '@playwright/test';

import { driveAxisTo } from './helpers';

/**
 * Four-zone map foundation: visual capture spec.
 *
 * Produces 8 participant-view frames — one arrival and one
 * route-readability shot per zone — at the supported 800×600 viewport
 * with no debug overlays (no `?debug`). Presentation capture only:
 * frames are inspected manually, not diffed
 * (visual_rebuild_capture precedent).
 */

const OUT = 'docs/verification/screenshots-four-zone';

const ZONES: {
  zone: string;
  /** Representative route/readability vantage (drive legs). */
  vantage: { axis: 'x' | 'y'; target: number; tolerance: number }[];
}[] = [
  {
    zone: 'station_concourse',
    // Mid-concourse: operations desk, both bays and the north door.
    vantage: [
      { axis: 'y', target: 300, tolerance: 12 },
      { axis: 'x', target: 340, tolerance: 12 },
    ],
  },
  {
    zone: 'diagnostics_laboratory',
    // Central aisle between the west and east diagnostic panels.
    vantage: [
      { axis: 'y', target: 300, tolerance: 12 },
      { axis: 'x', target: 384, tolerance: 12 },
    ],
  },
  {
    zone: 'exterior_recovery_yard',
    // North-west path bend: landmark, pads 2-4 and the NE airlock.
    vantage: [
      { axis: 'y', target: 150, tolerance: 12 },
      { axis: 'x', target: 260, tolerance: 12 },
    ],
  },
  {
    zone: 'utility_core_deck',
    // Converging centre lane below the Core Chamber alcove.
    vantage: [
      { axis: 'x', target: 390, tolerance: 12 },
      { axis: 'y', target: 250, tolerance: 12 },
    ],
  },
];

async function bootZone(page: Page, zone: string) {
  await page.goto(
    `/?participant_id=PT_CAP_FOURZONE&game_session_id=GS_CAP_FOURZONE&scene=${zone}`,
  );
  await page.waitForFunction(
    (expected) =>
      (window as unknown as { __playerProbe?: { scene: string } | null })
        .__playerProbe?.scene === expected,
    zone,
    { timeout: 60_000 },
  );
  // Let the fade-in and the transient zone-title card finish so frames
  // show the settled guidance HUD.
  await page.waitForTimeout(3400);
}

async function shot(page: Page, name: string) {
  await page.waitForTimeout(400);
  await page.screenshot({ path: `${OUT}/${name}.png` });
}

test('four-zone arrival and route readability capture', async ({ page }) => {
  test.setTimeout(360_000);
  mkdirSync(OUT, { recursive: true });

  for (let index = 0; index < ZONES.length; index++) {
    const { zone, vantage } = ZONES[index];

    await bootZone(page, zone);
    await shot(page, `${index + 1}a-${zone}-arrival`);

    for (const leg of vantage) {
      await driveAxisTo(page, leg.axis, leg.target, leg.tolerance);
    }

    await shot(page, `${index + 1}b-${zone}-route`);
  }
});
