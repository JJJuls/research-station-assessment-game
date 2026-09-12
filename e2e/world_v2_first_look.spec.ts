/**
 * World V2 rescue — first-look capture (working evidence, not the final
 * capture set): the two opening shots, the Dock arrival, the check-in
 * power step-up and the Concourse entry, at 1280×720. Real input, no
 * state injection; nothing here asserts pixels.
 */
import { mkdirSync } from 'node:fs';

import { type Page, test } from '@playwright/test';

import { PILOT_DOORS } from '../src/pilot/pilotRoute';
import { DOCK_SITES } from '../src/pilot/zoneSites';
import { selectPromptOption } from './helpers';
import {
  bootPilot,
  openPromptAt,
  registryApproach,
  useDoor,
  walkTo,
} from './pilotHelpers';

const OUT = 'docs/verification/professional-world-rescue-v2/first-look';

async function shot(page: Page, name: string) {
  await page.waitForTimeout(300);
  await page.screenshot({ path: `${OUT}/${name}.png` });
}

const arrivalDone = (page: Page) =>
  page.waitForFunction(
    () =>
      (
        window as unknown as {
          __dockProbe?: { arrival_playing: boolean } | null;
        }
      ).__dockProbe?.arrival_playing === false,
    undefined,
    { timeout: 30_000 },
  );

test('first look — opening, Dock, power step-up, Concourse', async ({
  page,
}) => {
  test.setTimeout(300_000);
  mkdirSync(OUT, { recursive: true });
  await page.setViewportSize({ width: 1280, height: 720 });

  await bootPilot(page, 'wv2look', { skipOpening: false });
  await page.waitForTimeout(900);
  await shot(page, '01-opening-establishing');
  await page.waitForTimeout(4800);
  await shot(page, '02-opening-berth');

  await page.waitForFunction(
    () =>
      (window as unknown as { __pilotOpeningProbe?: { open: boolean } | null })
        .__pilotOpeningProbe?.open === false,
    undefined,
    { timeout: 30_000 },
  );
  await arrivalDone(page);
  await shot(page, '03-dock-arrival');

  // Marker, then check in (the power step-up payoff).
  await walkTo(page, DOCK_SITES.marker.x, DOCK_SITES.marker.y);
  await shot(page, '04-dock-marker');
  await openPromptAt(page, DOCK_SITES.terminal, {
    approachOffset: { x: 0, y: 56 },
  });
  await shot(page, '05-dock-checkin-prompt');
  await selectPromptOption(page, 2);
  await page.waitForTimeout(700);
  await shot(page, '06-dock-power-mid');
  await page.waitForTimeout(1600);
  await shot(page, '07-dock-powered');

  // Into the Concourse.
  await useDoor(page, PILOT_DOORS.dock[0], 'station_concourse', {
    yFirst: true,
  });
  await page.waitForTimeout(600);
  await shot(page, '08-concourse-entry');

  // Vale from the west approach.
  await openPromptAt(page, registryApproach('concourse.vale'), {
    approachOffset: { x: 0, y: 0 },
  });
  await shot(page, '09-vale-prompt');
});
