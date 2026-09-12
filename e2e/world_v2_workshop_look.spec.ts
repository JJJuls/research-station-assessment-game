/**
 * World V2 rescue continuation — Records Workshop first look (working
 * evidence): boots the workshop directly, walks EVERY audited approach
 * point through the two-bay lanes with real input, asserts the right
 * prompt appears at each (the machine-audited nearest-wins book, verified
 * in-engine), crosses the vestibule both ways and uses the east door.
 * Screenshots at 1280×720; nothing here asserts pixels.
 */
import { mkdirSync } from 'node:fs';

import { expect, type Page, test } from '@playwright/test';

import { WORKSHOP_REGISTRY } from '../src/world/interactionRegistry';
import { press } from './helpers';
import { bootPilotScene, useDoor, workshopVia } from './pilotHelpers';

const OUT = 'docs/verification/professional-world-rebuild-v3/workshop-look';

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

test('workshop first look — every audited approach shows its own prompt', async ({
  page,
}) => {
  test.setTimeout(600_000);
  mkdirSync(OUT, { recursive: true });
  await page.setViewportSize({ width: 1280, height: 720 });

  await bootPilotScene(page, 'wv2ws', 'records_workshop');
  await shot(page, '01-spawn-office');

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

    await workshopVia(page, entry.approach.x, entry.approach.y);
    await page.waitForTimeout(250);

    const text = await promptText(page);

    expect(text, `${id}: prompt at audited approach`).not.toBeNull();
    expect(text!.toLowerCase(), `${id}: own label in the prompt`).toContain(
      entry.label.toLowerCase(),
    );

    if (index === 0 || index === 5 || index === 7 || index === 14) {
      await shot(
        page,
        `${String(index + 2).padStart(2, '0')}-${id.split('.')[1]}`,
      );
    }
  }

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
