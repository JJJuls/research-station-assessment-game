/**
 * World V2 rebuild — Diagnostics Laboratory first look (working evidence):
 * boots the laboratory directly, walks EVERY audited approach point with
 * real input (the island crossed over its north lane), asserts the right
 * prompt appears at each (the machine-audited nearest-wins book, verified
 * in-engine), and uses both doors in both directions (airlock ↔ yard,
 * south door ↔ Concourse) with a reflex-SPACE check on each arrival.
 * Screenshots at 1280×720; nothing here asserts pixels.
 */
import { mkdirSync } from 'node:fs';

import { expect, type Page, test } from '@playwright/test';

import { LAB_REGISTRY } from '../src/world/interactionRegistry';
import { press } from './helpers';
import { bootPilotScene, labVia, PILOT, useDoor } from './pilotHelpers';

// V3 final evidence: WV3_VIEWPORT (WxH) / WV3_OUT re-run the same real-input
// tour at the native 1920×1080 canvas into its own directory.
const VIEWPORT = (() => {
  const raw = process.env.WV3_VIEWPORT ?? '1280x720';
  const [w, h] = raw.split('x').map((value) => Number(value));

  return { width: w || 1280, height: h || 720 };
})();
const OUT =
  process.env.WV3_OUT ??
  'docs/verification/professional-world-rebuild-v3/lab-look';

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

test('laboratory first look — every audited approach shows its own prompt; both doors round-trip', async ({
  page,
}) => {
  test.setTimeout(600_000);
  mkdirSync(OUT, { recursive: true });
  await page.setViewportSize(VIEWPORT);

  await bootPilotScene(page, 'wv2lab', 'diagnostics_laboratory');
  await shot(page, '01-spawn-concourse-side');

  // Every registry entry (doors included — their prompts read too), in a
  // west-hall → east-bay tour order.
  const tour = [
    'lab.signal_workstation',
    'lab.orientation_terminal',
    'lab.airlock_yard',
    'lab.phase_m15',
    'lab.phase_m16',
    'lab.door_concourse',
    'lab.kai',
    'lab.phase_m17',
    'lab.phase_m18',
  ];

  for (const [index, id] of tour.entries()) {
    const entry = LAB_REGISTRY.find((e) => e.id === id)!;

    await labVia(page, entry.approach.x, entry.approach.y);
    await page.waitForTimeout(250);

    const text = await promptText(page);

    expect(text, `${id}: prompt at audited approach`).not.toBeNull();
    expect(text!.toLowerCase(), `${id}: own label in the prompt`).toContain(
      entry.label.toLowerCase(),
    );

    await shot(
      page,
      `${String(index + 2).padStart(2, '0')}-${id.split('.')[1]}`,
    );
  }

  // Airlock → yard → back (spawns inside the airlock, reflex SPACE safe).
  await labVia(page, 250, 190);
  await useDoor(page, PILOT.lab.airlock, 'exterior_recovery_yard', {
    approachOffset: { x: 0, y: 50 },
  });
  await shot(page, '11-yard-arrival');
  await useDoor(page, PILOT.yard.airlock, 'diagnostics_laboratory', {
    approachOffset: { x: 0, y: -40 },
  });
  await shot(page, '12-spawn-yard-side');
  await press(page, 'Space');
  await page.waitForTimeout(600);
  expect(await sceneOf(page)).toBe('diagnostics_laboratory');

  // South door → Concourse → back.
  await labVia(page, 334, 252);
  await useDoor(page, PILOT.lab.southDoor, 'station_concourse', {
    approachOffset: { x: 0, y: -48 },
  });
  await shot(page, '13-concourse-arrival');
  await press(page, 'Space');
  await page.waitForTimeout(600);
  expect(await sceneOf(page)).toBe('station_concourse');
  await useDoor(page, PILOT.concourse.northDoor, 'diagnostics_laboratory', {
    approachOffset: { x: 0, y: 56 },
    yFirst: false,
  });
  await shot(page, '14-lab-return');
  await press(page, 'Space');
  await page.waitForTimeout(600);
  expect(await sceneOf(page)).toBe('diagnostics_laboratory');
});
