import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';

import type { Page } from '@playwright/test';
import { expect, test } from '@playwright/test';

import { driveAxisTo, press } from './helpers';

/**
 * Overnight-prototype visual evidence (Unit 5): captures viewport
 * screenshots of the key play areas into docs/verification/screenshots/.
 * Uses the documented ?scene= dev routes for speed; purely observational
 * (no research assertions beyond "the scene rendered").
 */

const SHOT_DIR = resolve(process.cwd(), 'docs', 'verification', 'screenshots');

async function bootScene(page: Page, sceneParam: string, sceneKey: string) {
  await page.goto(
    `/?scene=${sceneParam}&participant_id=PT_SNAPSHOT&game_session_id=GS_SNAPSHOT_${sceneParam}`,
  );
  await page.waitForFunction(
    (wanted) =>
      (window as unknown as { __playerProbe?: { scene: string } | null })
        .__playerProbe?.scene === wanted,
    sceneKey,
  );
  // Let the fade-in and idle animations settle.
  await page.waitForTimeout(600);
}

async function shoot(page: Page, name: string) {
  await page.screenshot({ path: resolve(SHOT_DIR, `${name}.png`) });
}

test.describe('visual snapshots (overnight prototype)', () => {
  test.beforeAll(() => {
    mkdirSync(SHOT_DIR, { recursive: true });
  });

  test('captures the key play areas', async ({ page }) => {
    test.setTimeout(300_000);

    await bootScene(page, 'dock', 'dock');
    await shoot(page, '01-dock-arrival');

    await bootScene(page, 'hub', 'hub');
    await shoot(page, '02-station-hub');

    // Vale + locker corner with an open requisition prompt.
    await driveAxisTo(page, 'y', 368, 12);
    await driveAxisTo(page, 'x', 144, 10);
    await press(page, 'Space');
    await page.waitForTimeout(300);
    await shoot(page, '03-vale-requisition-prompt');
    await press(page, '1'); // accept so the quest HUD line renders
    await page.waitForTimeout(300);
    await shoot(page, '04-hub-quest-line');

    await bootScene(page, 'field', 'field');
    await shoot(page, '05-survey-terrace');

    await bootScene(page, 'utility_bay', 'utility_bay');
    await shoot(page, '06-utility-bay');

    await bootScene(page, 'ops_annex', 'ops_annex');
    await shoot(page, '07-operations-annex');

    await bootScene(page, 'inventory', 'inventory');
    await shoot(page, '08-inventory-prep');

    await bootScene(page, 'final_core', 'final_core');
    await shoot(page, '09-final-core');

    // The canvas rendered in every scene (cheap sanity assertion).
    expect(await page.locator('canvas').count()).toBeGreaterThan(0);
  });
});
