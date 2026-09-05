/**
 * World V1 — three-scale comparison frames (CAMERA-AND-SCALE-SPEC.md §6).
 *
 * The same Dock state (arrival spawn after the tutorial) and the same
 * Concourse state (south-door spawn) rendered at the three candidate
 * composite scales through the DEV-only `?world_scale=` switch. Frames go
 * to docs/verification/professional-world-v1/unit1/scale-compare/; the
 * selection is a human/reviewer judgement recorded in the camera spec.
 */
import { mkdirSync } from 'node:fs';

import { test } from '@playwright/test';

import { completeDockTutorial } from './journey';
import { bootPilot, dockToConcourse, walkTo } from './pilotHelpers';

const OUT = 'docs/verification/professional-world-v1/unit1/scale-compare';

for (const scale of ['1', '1.25', '1.5'] as const) {
  test(`scale ${scale}: dock and concourse frames`, async ({ page }) => {
    test.setTimeout(240_000);
    mkdirSync(OUT, { recursive: true });
    await page.setViewportSize({ width: 1280, height: 720 });
    await bootPilot(page, `wv1scale_${scale.replace('.', '_')}`, {
      extra: `&world_scale=${scale}`,
    });
    await completeDockTutorial(page, 1);
    // Return to the apron so every candidate frames the same state.
    await walkTo(page, 576, 560, { yFirst: false });
    await page.waitForTimeout(700);
    await page.screenshot({ path: `${OUT}/dock-${scale}.png` });

    await dockToConcourse(page);
    await page.waitForTimeout(900);
    await page.screenshot({ path: `${OUT}/concourse-${scale}.png` });
  });
}
