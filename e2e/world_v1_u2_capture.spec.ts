/**
 * World V1 — U2 capture set: the opening (exterior establishing frame,
 * the landed shuttle, the first Dock frame after the cut), the Dock at
 * the arrival spawn and at the terminal, the Concourse at the south
 * spawn and at Vale, and the station map — at the viewport given by
 * WV1_VIEWPORT (default 800x600) into WV1_OUT.
 *
 * Real input, no state injection. Frames are evidence for the visual
 * review; nothing here asserts pixels.
 */
import { mkdirSync } from 'node:fs';

import { type Page, test } from '@playwright/test';

import { DOCK_SITES } from '../src/pilot/zoneSites';
import { press, selectPromptOption } from './helpers';
import { completeDockTutorial } from './journey';
import {
  bootPilot,
  dockToConcourse,
  expectStage,
  openPromptAt,
  PILOT,
  walkTo,
} from './pilotHelpers';

const VIEWPORT = (() => {
  const raw = process.env.WV1_VIEWPORT ?? '800x600';
  const [w, h] = raw.split('x').map((value) => Number(value));

  return { width: w || 800, height: h || 600 };
})();
const OUT =
  process.env.WV1_OUT ??
  `docs/verification/professional-world-v1/unit2/${VIEWPORT.width}x${VIEWPORT.height}`;

async function shot(page: Page, name: string) {
  await page.waitForTimeout(350);
  await page.screenshot({ path: `${OUT}/${name}.png` });
}

test('U2 capture — opening, Dock, Concourse, map', async ({ page }) => {
  test.setTimeout(420_000);
  mkdirSync(OUT, { recursive: true });
  await page.setViewportSize(VIEWPORT);

  // Opening: the establishing frame, then the landed shuttle.
  await bootPilot(page, `wv1u2cap_${VIEWPORT.width}`, { skipOpening: false });
  await page.waitForTimeout(900);
  await shot(page, '01-opening-plateau');
  await page.waitForFunction(
    () =>
      (
        window as unknown as {
          __pilotOpeningProbe?: { shuttle_landed: boolean } | null;
        }
      ).__pilotOpeningProbe?.shuttle_landed === true,
    undefined,
    { timeout: 20_000 },
  );
  await page.waitForTimeout(700);
  await shot(page, '02-opening-shuttle-landed');

  // The cut to the Dock (let the opening complete on its own).
  await page.waitForFunction(
    () =>
      (window as unknown as { __playerProbe?: { scene: string } | null })
        .__playerProbe?.scene === 'dock',
    undefined,
    { timeout: 20_000 },
  );
  await page.waitForTimeout(500);
  await shot(page, '03-dock-arrival-threshold');
  await page.waitForTimeout(1800);
  await shot(page, '04-dock-arrival-airlock-sealed');

  // Terminal approach and the check-in prompt.
  await walkTo(page, DOCK_SITES.terminal.x, DOCK_SITES.terminal.y + 48, {
    yFirst: false,
  });
  await shot(page, '05-dock-terminal-prompt');
  await completeDockTutorial(page, 2);
  await shot(page, '06-dock-checked-in');

  // Concourse: spawn, Vale, the briefing card, the map.
  await dockToConcourse(page);
  await shot(page, '07-concourse-south-spawn');
  await openPromptAt(page, PILOT.concourse.vale, {
    approachOffset: { x: 0, y: 40 },
  });
  await shot(page, '08-vale-briefing');
  await selectPromptOption(page, 1);
  await expectStage(page, 'incident_handover');
  await page.waitForTimeout(400);
  await selectPromptOption(page, 3);
  await page.waitForTimeout(400);
  await selectPromptOption(page, 3);
  await page.waitForTimeout(450);
  await selectPromptOption(page, 2); // M05 (Unit 6): extra lamp job — decline
  await page.waitForTimeout(600);
  await shot(page, '09-concourse-triage');
  await press(page, 'm');
  await page.waitForFunction(
    () =>
      (window as unknown as { __pilotMapProbe?: { open: boolean } | null })
        .__pilotMapProbe?.open === true,
    undefined,
    { timeout: 5000 },
  );
  await shot(page, '10-station-map');
  await press(page, 'Escape');
});
