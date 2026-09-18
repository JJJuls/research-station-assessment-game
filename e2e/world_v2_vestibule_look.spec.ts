/**
 * Workshop vestibule layering (regression for the "avatar climbs the
 * doorway" defect): on ordinary held-key input the avatar crosses from the
 * records office to the machine bay and back. While its feet are between
 * the two painted door sills the foreground wall mass must be shown (the
 * avatar passes THROUGH the doorways, hidden by the wall between them),
 * never while it stands in either bay; and the wall faces north of the
 * sills must stop it. Frames at every stage; nothing asserts pixels.
 */
import { mkdirSync } from 'node:fs';

import { expect, type Page, test } from '@playwright/test';

import { driveAxisTo, playerProbe } from './helpers';
import { bootPilotScene, workshopVia } from './pilotHelpers';

const OUT =
  process.env.WV3_OUT ??
  'docs/verification/station-080-correction/workshop-vestibule';
const VIEWPORT = (() => {
  const [w, h] = (process.env.WV3_VIEWPORT ?? '1280x720')
    .split('x')
    .map(Number);

  return { width: w || 1280, height: h || 720 };
})();

async function foregroundShown(page: Page): Promise<boolean> {
  return page.evaluate(
    () =>
      (window as unknown as { __vestibuleProbe?: { foreground: boolean } })
        .__vestibuleProbe?.foreground ?? false,
  );
}

test('the avatar passes through the vestibule doorways, never over the wall', async ({
  page,
}) => {
  test.setTimeout(600_000);
  mkdirSync(OUT, { recursive: true });
  await page.setViewportSize(VIEWPORT);
  await bootPilotScene(page, 'vest', 'records_workshop');

  await workshopVia(page, 800, 250);
  await page.screenshot({ path: `${OUT}/01-office-side.png` });
  expect(await foregroundShown(page)).toBe(false);

  // The wall face north of the sill stops a walk at the old upper rows.
  await driveAxisTo(page, 'y', 214, 4);
  await driveAxisTo(page, 'x', 700, 4);

  const blocked = await playerProbe(page);

  expect(blocked!.x, 'wall face north of the east sill').toBeGreaterThan(760);

  await driveAxisTo(page, 'y', 256, 4);
  await driveAxisTo(page, 'x', 742, 4);
  await page.screenshot({ path: `${OUT}/02-in-east-doorway.png` });
  await driveAxisTo(page, 'x', 690, 4);
  await page.screenshot({ path: `${OUT}/03-between-the-walls.png` });
  expect(await foregroundShown(page)).toBe(true);
  await driveAxisTo(page, 'x', 636, 4);
  await page.screenshot({ path: `${OUT}/04-in-west-doorway.png` });
  await driveAxisTo(page, 'x', 560, 4);
  await page.screenshot({ path: `${OUT}/05-machine-bay-side.png` });
  expect(await foregroundShown(page)).toBe(false);

  // And back: no trap, same layering.
  await driveAxisTo(page, 'x', 690, 4);
  expect(await foregroundShown(page)).toBe(true);
  await driveAxisTo(page, 'x', 800, 4);
  expect(await foregroundShown(page)).toBe(false);
});
