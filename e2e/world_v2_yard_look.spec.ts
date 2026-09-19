/**
 * World V2 rebuild — Exterior Recovery Yard first look (working
 * evidence): boots the yard directly, walks EVERY audited approach point
 * with real input (west half ↔ east half through the drift pass),
 * asserts the right prompt at each, and uses the airlock to the
 * laboratory and back with a reflex-SPACE check on each arrival.
 * Screenshots at 1280×720; nothing here asserts pixels.
 */
import { mkdirSync } from 'node:fs';

import { expect, type Page, test } from '@playwright/test';

import { YARD_REGISTRY } from '../src/world/interactionRegistry';
import { press } from './helpers';
import {
  approachAudited,
  bootPilotScene,
  labApproach,
  PILOT,
  useDoor,
  yardVia,
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
  'docs/verification/professional-world-rebuild-v3/yard-look';

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

async function sceneOf(page: Page): Promise<string | null> {
  return page.evaluate(
    () =>
      (window as unknown as { __playerProbe?: { scene: string } | null })
        .__playerProbe?.scene ?? null,
  );
}

test('yard first look — every audited approach shows its own prompt; the airlock round-trips', async ({
  page,
}) => {
  test.setTimeout(900_000);
  mkdirSync(OUT, { recursive: true });
  await page.setViewportSize(VIEWPORT);

  await bootPilotScene(page, 'wv2yard', 'exterior_recovery_yard');
  await shot(page, '01-spawn-airlock');

  // West half first (apron → coupling → uplink → mast), then the pass and
  // the east half (stake → rig → bench).
  const tour = [
    'yard.noor',
    'yard.airlock_lab',
    'yard.supply_crate',
    'yard.cable_flag',
    'yard.coupling',
    'yard.uplink_a',
    'yard.line_panel',
    'yard.uplink_b',
    'yard.mast',
    'yard.plot_stake',
    'yard.magnet_rig',
    'yard.sorting_bench',
  ];

  for (const [index, id] of tour.entries()) {
    const entry = YARD_REGISTRY.find((e) => e.id === id)!;

    const text = await approachAudited(page, yardVia, entry, () =>
      promptText(page),
    );

    expect(text, `${id}: prompt at audited approach`).not.toBeNull();
    expect(text!.toLowerCase(), `${id}: own label in the prompt`).toContain(
      entry.label.toLowerCase(),
    );

    await shot(
      page,
      `${String(index + 2).padStart(2, '0')}-${id.split('.')[1]}`,
    );
  }

  // The drift pass, westward, on real input.
  await yardVia(page, 900, 400);
  await shot(page, '14-open-field');

  // Airlock → laboratory → back (reflex SPACE safe on both arrivals).
  await yardVia(page, 896, 636);
  await useDoor(page, PILOT.yard.airlock, 'diagnostics_laboratory', {
    approachOffset: { x: 0, y: -40 },
  });
  await shot(page, '15-lab-arrival-from-yard');
  await press(page, 'Space');
  await page.waitForTimeout(600);
  expect(await sceneOf(page)).toBe('diagnostics_laboratory');
  await useDoor(page, PILOT.lab.airlock, 'exterior_recovery_yard', {
    approachOffset: await labApproach(page, PILOT.lab.airlock),
  });
  await shot(page, '16-yard-return');
  await press(page, 'Space');
  await page.waitForTimeout(600);
  expect(await sceneOf(page)).toBe('exterior_recovery_yard');
});
