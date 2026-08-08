import { mkdirSync } from 'node:fs';

import { test } from '@playwright/test';

import { driveAxisTo, press, selectCardByLabel } from './helpers';

/**
 * Action-assessment rebuild Unit 7: participant-view frames of the new
 * coolant red line's major mechanics (yard survey sector, recycler rig,
 * frozen housing, manifold trench, diagnostic board, interlock
 * console). Presentation capture only — frames are inspected, not
 * diffed (visual_physical_capture precedent).
 */

const OUT = 'docs/verification/screenshots-rebuild';

async function shot(page: import('@playwright/test').Page, name: string) {
  await page.waitForTimeout(400);
  await page.screenshot({ path: `${OUT}/${name}.png` });
}

test('rebuild mechanics capture', async ({ page }) => {
  test.setTimeout(240_000);
  mkdirSync(OUT, { recursive: true });

  await page.goto(
    '/?participant_id=PT_CAP_REBUILD&game_session_id=GS_CAP_REBUILD&scene=coolant_yard',
  );
  await page.waitForFunction(
    () =>
      (window as unknown as { __playerProbe?: { scene: string } | null })
        .__playerProbe?.scene === 'coolant_yard',
    undefined,
    { timeout: 60_000 },
  );
  await page.waitForTimeout(2600);
  await shot(page, '01-coolant-yard-overview');

  // Reclaimed sector + reclamation post.
  await driveAxisTo(page, 'y', 320, 10);
  await driveAxisTo(page, 'x', 544, 8);
  await driveAxisTo(page, 'y', 176, 8);
  await shot(page, '02-reclaimed-sector');

  // Frozen coupling housing with its progress bar.
  await driveAxisTo(page, 'y', 480, 10);
  await driveAxisTo(page, 'x', 384, 8);
  await shot(page, '03-frozen-housing');

  // Recycler catchment rig.
  await driveAxisTo(page, 'x', 96, 8);
  await shot(page, '04-recycler-rig');

  // Pump House: trench, bench, consoles.
  const pump = async () => {
    await driveAxisTo(page, 'x', 64, 8);
    await driveAxisTo(page, 'y', 96, 12);
    await driveAxisTo(page, 'x', 560, 10);
    await press(page, 'Space');
  };

  await pump();
  await page.waitForFunction(
    () =>
      (window as unknown as { __playerProbe?: { scene: string } | null })
        .__playerProbe?.scene === 'pump_house',
    undefined,
    { timeout: 20_000 },
  );
  await page.waitForTimeout(1600);
  await driveAxisTo(page, 'x', 280, 8);
  await driveAxisTo(page, 'y', 230, 8);
  await shot(page, '05-manifold-trench-and-bench');

  // Work order card (guidance surface).
  await driveAxisTo(page, 'x', 160, 10);
  await driveAxisTo(page, 'y', 128, 10);
  await press(page, 'Space');
  await page.waitForTimeout(1200);
  await shot(page, '06-work-order-card');
  await selectCardByLabel(page, 'Log the work order');

  // Diagnostic board + relief valve + interlock consoles in frame.
  await driveAxisTo(page, 'x', 448, 8);
  await driveAxisTo(page, 'y', 176, 8);
  await shot(page, '07-pump-house-stations');
});
