/**
 * World V2 rescue — final capture set: the two opening shots, the Dock
 * arrival, marker, check-in prompt, the power step-up before/after, the
 * Concourse entry, Vale's briefing, the plan board / packet / gauge
 * districts and the full route Dock → Concourse → Dock, at the viewport
 * given by WV2_VIEWPORT (default 1280x720; 1920x1080 adds `?canvas=1080`)
 * into WV2_OUT. WV2_VIDEO=1 records the run.
 *
 * Real input, no state injection. Frames are evidence for the visual
 * review; nothing here asserts pixels.
 */
import { mkdirSync } from 'node:fs';

import { type Page, test } from '@playwright/test';

import { PILOT_DOORS } from '../src/pilot/pilotRoute';
import { DOCK_SITES } from '../src/pilot/zoneSites';
import { press, selectPromptOption } from './helpers';
import {
  bootPilot,
  interactAt,
  openPromptAt,
  registryApproach,
  useDoor,
  walkTo,
} from './pilotHelpers';

const VIEWPORT = (() => {
  const raw = process.env.WV2_VIEWPORT ?? '1280x720';
  const [w, h] = raw.split('x').map((value) => Number(value));

  return { width: w || 1280, height: h || 720 };
})();
const FULL_HD = VIEWPORT.height >= 1080;
const OUT =
  process.env.WV2_OUT ??
  `docs/verification/professional-world-rescue-v2/slice/${VIEWPORT.width}x${VIEWPORT.height}`;
const EXTRA = FULL_HD ? '&canvas=1080' : '';

test.use({
  video:
    process.env.WV2_VIDEO === '1'
      ? { mode: 'on', size: { width: VIEWPORT.width, height: VIEWPORT.height } }
      : 'off',
});

async function shot(page: Page, name: string) {
  await page.waitForTimeout(320);
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

test('rescue capture — opening, Dock, power step-up, Concourse, return', async ({
  page,
}) => {
  test.setTimeout(480_000);
  mkdirSync(OUT, { recursive: true });
  await page.setViewportSize(VIEWPORT);

  // Opening, watched to the end.
  await bootPilot(page, `wv2cap_${VIEWPORT.width}`, {
    skipOpening: false,
    extra: EXTRA,
  });
  await page.waitForTimeout(1100);
  await shot(page, '01-opening-establishing');
  await page.waitForTimeout(4600);
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

  // Marker, then the check-in and its power step-up (before/after).
  await walkTo(page, DOCK_SITES.marker.x, DOCK_SITES.marker.y, {
    tolerance: 24,
  });
  await shot(page, '04-dock-marker-reached');
  await openPromptAt(page, DOCK_SITES.terminal, {
    approachOffset: { x: 0, y: 56 },
  });
  await shot(page, '05-dock-before-power');
  await selectPromptOption(page, 2);
  await page.waitForTimeout(2400);
  await shot(page, '06-dock-after-power');

  // Into the Concourse; Vale's briefing.
  await useDoor(page, PILOT_DOORS.dock[0], 'station_concourse', {
    yFirst: true,
  });
  await page.waitForTimeout(500);
  await shot(page, '07-concourse-entry');
  await openPromptAt(page, registryApproach('concourse.vale'));
  await shot(page, '08-vale-briefing');
  await selectPromptOption(page, 1);
  await page.waitForTimeout(400);
  // The briefing chains the two voluntary offers: leave both UNANSWERED
  // ("ask me again later" — no behavioural event, valeHandover precedent).
  await selectPromptOption(page, 3);
  await page.waitForTimeout(400);
  await selectPromptOption(page, 3);
  await page.waitForTimeout(400);

  // The handover districts: plan board, quality packet, monitor gauge.
  // The board opens a WORK SURFACE (no prompt cards): interact and wait
  // on the surface probe, then close it with Escape.
  await interactAt(page, registryApproach('concourse.plan_board'), {
    approachOffset: { x: 0, y: 0 },
  });
  for (let attempt = 0; attempt < 4; attempt += 1) {
    const open = await page
      .waitForFunction(
        () =>
          (
            window as unknown as {
              __workSurfaceProbe?: { open: boolean } | null;
            }
          ).__workSurfaceProbe?.open === true,
        undefined,
        { timeout: 5_000 },
      )
      .then(() => true)
      .catch(() => false);

    if (open) {
      break;
    }

    await press(page, 'e');
  }
  await shot(page, '09-plan-board-open');
  await press(page, 'Escape');
  await page.waitForFunction(
    () =>
      (window as unknown as { __workSurfaceProbe?: { open: boolean } | null })
        .__workSurfaceProbe?.open === false,
    undefined,
    { timeout: 10_000 },
  );
  await page.waitForTimeout(400);
  await walkTo(
    page,
    registryApproach('concourse.qc_packet_o1').x,
    registryApproach('concourse.qc_packet_o1').y,
  );
  await shot(page, '10-quality-packet-range');
  // South lane discipline (y >= 242) before the eastward leg.
  await walkTo(page, 424, 252, { yFirst: true, tolerance: 8 });
  await walkTo(page, registryApproach('concourse.monitor_gauge').x, 252, {
    tolerance: 8,
  });
  await shot(page, '11-monitor-gauge-range');

  // Back to the Dock (the powered state persists across re-entry).
  await useDoor(page, PILOT_DOORS.station_concourse[0], 'dock', {
    yFirst: true,
  });
  await page.waitForTimeout(600);
  await shot(page, '12-dock-reentry-powered');
});
