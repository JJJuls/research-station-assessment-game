/**
 * World V1 production slice — capture set (SLICE-MANIFEST.md "Capture
 * manifest"): the opening (establishing frame, shuttle approach, shuttle
 * berthed), the playable Dock (arrival, check-in range, checked in), the
 * Concourse (entry, Vale at the counter), the restoration before/after
 * (Concourse service lighting at the `workshop` stage; Dock weather cover
 * at `handover_briefing`) and the station map — at the viewport given by
 * WV1_VIEWPORT (default 1280x720; 1920x1080 adds `?canvas=1080`) into
 * WV1_OUT.
 *
 * Real input, no state injection. Frames are evidence for the visual
 * review; nothing here asserts pixels.
 */
import { copyFileSync, mkdirSync } from 'node:fs';

import { type Page, test } from '@playwright/test';

import { press, selectPromptOption } from './helpers';
import { completeDockTutorial } from './journey';
import {
  bootPilot,
  dockToConcourse,
  expectStage,
  openPromptAt,
  PILOT,
  registryApproach,
  useDoor,
  walkTo,
} from './pilotHelpers';

const VIEWPORT = (() => {
  const raw = process.env.WV1_VIEWPORT ?? '1280x720';
  const [w, h] = raw.split('x').map((value) => Number(value));

  return { width: w || 1280, height: h || 720 };
})();
const FULL_HD = VIEWPORT.height >= 1080;
const OUT =
  process.env.WV1_OUT ??
  `docs/verification/professional-world-v1/production/slice/${VIEWPORT.width}x${VIEWPORT.height}`;
const EXTRA = FULL_HD ? '&canvas=1080' : '';

/** WV1_VIDEO=1 records the run (real-time gameplay recording evidence). */
test.use({
  video:
    process.env.WV1_VIDEO === '1'
      ? { mode: 'on', size: { width: VIEWPORT.width, height: VIEWPORT.height } }
      : 'off',
});

async function shot(page: Page, name: string) {
  await page.waitForTimeout(350);
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

test('slice capture — opening, Dock, Concourse, restoration, map', async ({
  page,
}) => {
  test.setTimeout(600_000);
  mkdirSync(OUT, { recursive: true });
  await page.setViewportSize(VIEWPORT);

  // Opening: establishing frame, approach, berthed (watched to the end).
  await bootPilot(page, `wv1slice_${VIEWPORT.width}`, {
    skipOpening: false,
    extra: EXTRA,
  });
  await page.waitForTimeout(700);
  await shot(page, '01-opening-establishing');
  await page.waitForFunction(
    () =>
      (
        window as unknown as {
          __pilotOpeningProbe?: { elapsed_ms: number } | null;
        }
      ).__pilotOpeningProbe !== null &&
      (
        window as unknown as {
          __pilotOpeningProbe?: { elapsed_ms: number } | null;
        }
      ).__pilotOpeningProbe!.elapsed_ms >= 4200,
    undefined,
    { timeout: 20_000 },
  );
  await shot(page, '02-opening-shuttle-approach');
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
  await page.waitForTimeout(500);
  await shot(page, '03-opening-shuttle-berthed');

  // The cut and the scripted arrival, then the playable Dock.
  await page.waitForFunction(
    () =>
      (window as unknown as { __playerProbe?: { scene: string } | null })
        .__playerProbe?.scene === 'dock',
    undefined,
    { timeout: 30_000 },
  );
  await arrivalDone(page);
  await page.waitForTimeout(600);
  await shot(page, '04-dock-arrival');
  await shot(page, '11-dock-before-restoration');

  const terminal = registryApproach('dock.arrival_terminal');

  await walkTo(page, terminal.x, terminal.y, { yFirst: true });
  await shot(page, '05-dock-checkin-range');
  await completeDockTutorial(page, 2);
  await page.waitForTimeout(400);
  await shot(page, '06-dock-checked-in');

  // Concourse: entry, Vale at the counter, the briefing.
  await dockToConcourse(page);
  await shot(page, '07-concourse-entry');

  // Pixel-stability evidence in motion: two frames 120 ms apart while the
  // camera follows a slow northward walk (compare texel edges by eye).
  mkdirSync(`${OUT}/motion`, { recursive: true });
  await page.keyboard.down('ArrowUp');
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${OUT}/motion/pan-a.png` });
  await page.waitForTimeout(120);
  await page.screenshot({ path: `${OUT}/motion/pan-b.png` });
  await page.keyboard.up('ArrowUp');
  await page.waitForTimeout(400);
  await walkTo(page, PILOT.concourse.vale.x, PILOT.concourse.vale.y + 56, {
    yFirst: true,
  });
  await shot(page, '08-concourse-vale-counter');
  await shot(page, '09-concourse-before-restoration');

  // Handover: Vale's briefing (→ incident_handover), the two voluntary
  // offers dismissed without an answer, then the confirmation (→ workshop):
  // the fixed crew service phase — the restoration change.
  await openPromptAt(page, PILOT.concourse.vale, {
    approachOffset: { x: 0, y: 56 },
  });
  await selectPromptOption(page, 1);
  await expectStage(page, 'incident_handover');
  await page.waitForTimeout(400);
  await selectPromptOption(page, 3);
  await page.waitForTimeout(400);
  await selectPromptOption(page, 3);
  await page.waitForTimeout(400);
  await openPromptAt(page, PILOT.concourse.vale, {
    approachOffset: { x: 0, y: 56 },
  });
  await selectPromptOption(page, 1);
  await expectStage(page, 'workshop');
  await page.waitForTimeout(700);
  await shot(page, '10-concourse-after-restoration');

  if (!FULL_HD) {
    await press(page, 'm');
    await page.waitForFunction(
      () =>
        (window as unknown as { __pilotMapProbe?: { open: boolean } | null })
          .__pilotMapProbe?.open === true,
      undefined,
      { timeout: 5000 },
    );
    await shot(page, '13-station-map');
    await press(page, 'Escape');
    await page.waitForTimeout(400);

    // Back to the Dock: the crew has secured the weather cover.
    await useDoor(page, PILOT.concourse.southDoor, 'dock', {
      approachOffset: { x: 0, y: -64 },
      yFirst: true,
    });
    await walkTo(page, 768, 700, { yFirst: true });
    await page.waitForTimeout(400);
    await shot(page, '12-dock-after-restoration');
  }

  const video = page.video();

  if (video !== null) {
    await page.context().close();
    copyFileSync(
      await video.path(),
      `${process.env.WV1_VIDEO_OUT ?? OUT}/slice-gameplay-${VIEWPORT.width}x${VIEWPORT.height}.webm`,
    );
  }
});
