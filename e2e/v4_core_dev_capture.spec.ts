/**
 * V4 Unit 5 — Core Chamber state frames from the labelled DEVELOPER
 * inspection launch (`?scene=core_chamber&dev_closure=inspect`): the
 * chamber's sealed/available/ARM/CONFIRM/stable presentation without the
 * 25-minute participant route. Developer launch only — never participant
 * evidence (the frames carry the DEV INSPECTION banner by design); the
 * participant-path chamber frames belong to the Unit 7 final set.
 *
 *   V4_OUT       output directory (default professional-visual-v4/current)
 *   V4_VIEWPORT  WxH browser viewport (default 1280x720)
 */
import { mkdirSync } from 'node:fs';

import { expect, type Page, test } from '@playwright/test';

import { press, selectPromptOption } from './helpers';
import { captureErrors, expectNoRuntimeErrors } from './journey';
import { openPromptAt, PILOT } from './pilotHelpers';
import { clickElement } from './returnHelpers';

const OUT =
  process.env.V4_OUT ?? 'docs/verification/professional-visual-v4/current';
const VIEWPORT = (() => {
  const raw = process.env.V4_VIEWPORT ?? '1280x720';
  const [w, h] = raw.split('x').map((value) => Number(value));

  return { width: w || 1280, height: h || 720 };
})();

async function shot(page: Page, name: string) {
  await page.waitForTimeout(400);
  await page.screenshot({ path: `${OUT}/${name}.png` });
}

async function chamberProbe(page: Page) {
  return page.evaluate(
    () =>
      (
        window as unknown as {
          __coreChamberProbe?: {
            core_state: string;
            visual_state: string;
            review_open: boolean;
            completion_open: boolean;
          } | null;
        }
      ).__coreChamberProbe ?? null,
  );
}

async function waitVisual(page: Page, state: string, timeout = 20_000) {
  await page.waitForFunction(
    (wanted) =>
      (
        window as unknown as {
          __coreChamberProbe?: { visual_state: string } | null;
        }
      ).__coreChamberProbe?.visual_state === wanted,
    state,
    { timeout },
  );
}

test('v4 core chamber state frames (developer inspection launch)', async ({
  page,
}) => {
  test.setTimeout(240_000);
  mkdirSync(OUT, { recursive: true });
  await page.setViewportSize(VIEWPORT);

  const errors = captureErrors(page);

  await page.goto(
    `/?participant_id=PT_PILOT_v4core&game_session_id=GS_PILOT_v4core_${Date.now()}&scene=core_chamber&dev_closure=inspect`,
  );
  await page.waitForFunction(
    () =>
      (window as unknown as { __coreChamberProbe?: unknown })
        .__coreChamberProbe !== undefined &&
      (window as unknown as { __coreChamberProbe?: unknown })
        .__coreChamberProbe !== null,
    undefined,
    { timeout: 60_000 },
  );
  await page.waitForTimeout(1200);

  // c1 — arrival: the chamber, the apparatus, the control position.
  await shot(page, 'c1-chamber-arrival');

  // c2 — the Core prompt (inspect / open the review).
  await openPromptAt(page, PILOT.core.core, {
    approachOffset: { x: 0, y: 44 },
  });
  await shot(page, 'c2-core-prompt');

  // The review option is the last non-"Step away" entry; under inspection
  // the chamber is prepared, so it is option 2 (Inspect = 1).
  await selectPromptOption(page, 2);
  await page.waitForFunction(
    () =>
      (window as unknown as { __workSurfaceProbe?: { open: boolean } | null })
        .__workSurfaceProbe?.open === true,
    undefined,
    { timeout: 10_000 },
  );
  await shot(page, 'c3-review-arm-available');

  // c4 — ARM (a separate control) then the armed review with CONFIRM.
  await clickElement(page, 'arm_sync');
  await page.waitForFunction(
    () =>
      (
        window as unknown as {
          __coreChamberProbe?: { core_state: string } | null;
        }
      ).__coreChamberProbe?.core_state === 'confirmation_armed',
    undefined,
    { timeout: 10_000 },
  );
  await page.waitForTimeout(400);
  await shot(page, 'c4-review-armed-confirm');

  // c5 — CONFIRM (the second, separate control) → the ramp.
  await clickElement(page, 'confirm_sync');
  await waitVisual(page, 'synchronizing', 10_000).catch(() => undefined);
  await page.waitForTimeout(900);
  await shot(page, 'c5-synchronising');

  // c6 — stable + the neutral completion notice; c7 — after the notice.
  await waitVisual(page, 'stable', 30_000);
  await page.waitForTimeout(1500);
  await shot(page, 'c6-completion-notice');

  // The notice may refuse to close while a handoff is in flight; try ESC a
  // few times over a bounded window and capture whatever state results.
  for (let attempt = 0; attempt < 6; attempt += 1) {
    await press(page, 'Escape');
    await page.waitForTimeout(1500);

    if ((await chamberProbe(page))?.completion_open === false) {
      break;
    }
  }

  await shot(page, 'c7-stable-chamber');
  expect((await chamberProbe(page))?.visual_state).toBe('stable');
  expectNoRuntimeErrors(errors);
});
