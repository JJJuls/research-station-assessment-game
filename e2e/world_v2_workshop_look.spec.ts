/**
 * World V2 rescue continuation — Records Workshop first look (working
 * evidence): boots the workshop directly, walks EVERY audited approach
 * point through the two-bay lanes and the cutting annex with real input,
 * asserts the right prompt appears at each (the machine-audited
 * nearest-wins book, verified in-engine), crosses the vestibule both ways
 * and uses the east door. Screenshots at 1280×720; nothing here asserts
 * pixels.
 *
 * Station 080 U14-D2: the room is 43×19 with the cutting annex south of
 * the machine bay. The tour enters the annex through its doorway, reads
 * the cutter's prompt at its approach north of the machine, shows that
 * the vacated cutter bay is plain floor (the avatar walks across it and
 * nothing there names the cutter) and that the band south of the records
 * office is not floor (a held DOWN key stops at the hull). Five of the
 * unit's nine screenshots are taken here (`u14d-1`, `-2`, `-7`, `-8`,
 * `-9`); the other four need cut pieces and come from
 * `u14_correction.spec.ts`.
 */
import { mkdirSync } from 'node:fs';

import { expect, type Page, test } from '@playwright/test';

import { WORKSHOP_SITES } from '../src/pilot/zoneSites';
import { WORKSHOP_REGISTRY } from '../src/world/interactionRegistry';
import { bodyFits, gridOf } from '../src/world/layouts/grid';
import {
  WORKSHOP_ANNEX,
  WORKSHOP_COLS,
  WORKSHOP_LAYOUT,
  WORKSHOP_ROWS,
  WORKSHOP_SOLIDS,
} from '../src/world/layouts/workshop';
import { driveAxisTo, playerProbe, press } from './helpers';
import {
  ANNEX_DRIVER,
  approachAudited,
  bootPilotScene,
  useDoor,
  workshopVia,
} from './pilotHelpers';

// V3 final evidence: WV3_VIEWPORT (WxH) / WV3_OUT re-run the same real-input
// tour at the native 1920×1080 canvas into its own directory.
const VIEWPORT = (() => {
  const raw = process.env.WV3_VIEWPORT ?? '1280x720';
  const [w, h] = raw.split('x').map((value) => Number(value));

  return { width: w || 1280, height: h || 720 };
})();
const OUT =
  process.env.WV3_OUT ??
  'docs/verification/professional-world-rebuild-v3/workshop-look';

async function shot(page: Page, name: string) {
  await page.waitForTimeout(350);
  await page.screenshot({ path: `${OUT}/${name}.png` });
}

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

async function avatar(page: Page): Promise<{ x: number; y: number }> {
  const at = await playerProbe(page);

  expect(at).not.toBeNull();

  return { x: at!.x, y: at!.y };
}

const GRID = gridOf(WORKSHOP_LAYOUT, WORKSHOP_SOLIDS);

/** Where the pure collision model stops a slide westward from `from`. */
function modelStopWest(from: { x: number; y: number }): number {
  let x = from.x;

  while (x > 0 && bodyFits(GRID, x - 1, from.y)) {
    x -= 1;
  }

  return x;
}

/**
 * The machine bay's lane where the cutter island stood (U14-D2): with
 * the LEFT key held from east of the old island the avatar stops where
 * the pure collision model says and nowhere before it — nothing
 * invisible is left of the island. (The collision audit's westward
 * sweeps start at the spawn and, since the U14-D2 closeout, hold the key
 * until the engine stops the avatar, so they cover the whole lane; this
 * push from x 560 is kept as the room's own, shorter check of it.)
 */
async function sweepBayWestward(page: Page, row: number) {
  await workshopVia(page, 560, row);

  const from = await avatar(page);
  const expected = modelStopWest(from);

  await driveAxisTo(page, 'x', from.x - 1000, 1);

  const stopped = await avatar(page);

  // eslint-disable-next-line no-console
  console.log(
    `[sweep] bay row y=${row} westward from ${from.x.toFixed(1)},${from.y.toFixed(1)}: observed ${stopped.x.toFixed(2)} vs model ${expected.toFixed(2)}`,
  );
  expect(expected, `row ${row}: the model's lane runs past the old island`)
    // The island's east face stopped the avatar at x 491.
    .toBeLessThan(200);
  expect(
    Math.abs(stopped.x - expected),
    `bay row y=${row} westward: observed ${stopped.x} vs model ${expected}`,
  ).toBeLessThanOrEqual(3);
}

test('workshop first look — every audited approach shows its own prompt', async ({
  page,
}) => {
  // The 15-station tour plus both vestibule crossings needs ~10 min at the
  // 1920×1080 canvas under software GL (a wait budget, not an assertion).
  test.setTimeout(VIEWPORT.width > 1280 ? 1_500_000 : 600_000);
  mkdirSync(OUT, { recursive: true });
  await page.setViewportSize(VIEWPORT);

  expect([WORKSHOP_COLS, WORKSHOP_ROWS]).toEqual([43, 19]);

  await bootPilotScene(page, 'wv2ws', 'records_workshop');
  await shot(page, '01-spawn-office');

  // The band south of the records office is hull and exterior, not floor
  // (U14-D2): holding DOWN from the office's south lane stops at the hull.
  await workshopVia(page, 996, 250);
  await driveAxisTo(page, 'y', 420, 8);

  const officeSouth = await avatar(page);

  expect(officeSouth.y, 'the office floor ends at its south hull').toBeLessThan(
    300,
  );
  await shot(page, 'u14d-8-records-office-lowest-camera');
  await driveAxisTo(page, 'y', 250, 8);

  // Every non-door registry entry, in a west-then-east tour order.
  const tour = [
    'workshop.case_workspace',
    'workshop.press_a',
    'workshop.press_b',
    'workshop.relay_bench',
    'workshop.storage_locker',
    'workshop.sample_cutter',
    'workshop.assembly_bench',
    'workshop.dispatch_console',
    'workshop.feed_console',
    'workshop.seal_log',
    'workshop.handover_desk',
    'workshop.report_desk',
    'workshop.qc_packet_o2',
    'workshop.lattice_bench',
    'workshop.work_order_board',
  ];

  for (const [index, id] of tour.entries()) {
    const entry = WORKSHOP_REGISTRY.find((e) => e.id === id)!;

    if (id === 'workshop.sample_cutter') {
      // The vacated cutter bay (U14-D2): the avatar walks across the place
      // the island stood on, and nothing there names the cutter.
      await workshopVia(page, 348, 230);
      await driveAxisTo(page, 'x', 440, 8);
      await page.waitForTimeout(250);

      const onOldIsland = await avatar(page);

      expect(onOldIsland.x, 'the old island is floor').toBeGreaterThan(424);
      expect((await promptText(page)) ?? '').not.toContain('Sample Cutter');
      await shot(page, 'u14d-7-old-cutter-bay-is-floor');

      // The annex entrance, seen from the machine bay.
      await workshopVia(page, ANNEX_DRIVER.doorX, ANNEX_DRIVER.bayY);
      await shot(page, 'u14d-1-annex-entrance-from-machine-bay');

      // Through the doorway: between the jambs on the way down.
      await workshopVia(page, ANNEX_DRIVER.doorX, ANNEX_DRIVER.rowY);

      const inside = await avatar(page);

      expect(inside.y).toBeGreaterThan(400);
      expect(inside.x).toBeGreaterThan(WORKSHOP_ANNEX.doorX0);
      expect(inside.x).toBeLessThan(WORKSHOP_ANNEX.doorX1);
      await workshopVia(page, 288, ANNEX_DRIVER.rowY);
      await shot(page, 'u14d-2-empty-annex-cutter-and-bin');
    }

    const text = await approachAudited(page, workshopVia, entry, () =>
      promptText(page),
    );

    expect(text, `${id}: prompt at audited approach`).not.toBeNull();
    expect(text!.toLowerCase(), `${id}: own label in the prompt`).toContain(
      entry.label.toLowerCase(),
    );

    if (id === 'workshop.sample_cutter') {
      // Operated from the north: the avatar stands north of the machine.
      expect((await avatar(page)).y).toBeLessThan(
        WORKSHOP_SITES.sampleCutter.y,
      );
      await shot(page, '07-sample_cutter');

      // The annex at 1280×720, from its southern end beside the bin.
      await workshopVia(
        page,
        ANNEX_DRIVER.binWest.x - 64,
        ANNEX_DRIVER.binWest.y,
      );
      await shot(page, 'u14d-9-annex-1280x720');
    } else if (index === 0 || index === 7 || index === 14) {
      await shot(
        page,
        `${String(index + 2).padStart(2, '0')}-${id.split('.')[1]}`,
      );
    }
  }

  // The lane the island used to block, swept on the audit's two rows.
  await sweepBayWestward(page, 236);
  await sweepBayWestward(page, 260);

  // The vestibule crossing, westward then back, on real input.
  await workshopVia(page, 348, 230);
  await shot(page, '17-machine-bay-west');
  await workshopVia(page, 688, 240);
  await shot(page, '18-vestibule');
  await workshopVia(page, 1288, 268);

  // The east door leads to the Concourse and back.
  await useDoor(page, { x: 1332, y: 290 }, 'station_concourse', {
    approachOffset: { x: -44, y: -22 },
    yFirst: true,
  });
  await shot(page, '19-concourse-arrival');
  await press(page, 'Space'); // reflex press: must not bounce back
  await page.waitForTimeout(600);
  expect(
    await page.evaluate(
      () =>
        (window as unknown as { __playerProbe?: { scene: string } | null })
          .__playerProbe?.scene ?? null,
    ),
  ).toBe('station_concourse');
});
