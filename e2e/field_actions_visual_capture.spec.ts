/**
 * Field-actions foundation — participant-view screenshot capture.
 *
 * Captures the fifteen verification frames required by the unit into
 * docs/verification/screenshots-field-actions/ (committed evidence;
 * re-running overwrites the committed frames — the documented capture
 * side effect shared by every visual_* spec).
 */

import { mkdirSync } from 'node:fs';

import { expect, type Page, test } from '@playwright/test';

import {
  driveAxisTo,
  getLastFeedbackText,
  hold,
  openNearbyPrompt,
  playerProbe,
  press,
  selectCardByLabel,
} from './helpers';

const OUT_DIR = 'docs/verification/screenshots-field-actions';

interface ProbeLike {
  worldActionActive: boolean;
  scan: {
    cooling: boolean;
    last: { strength: number; category: string } | null;
  };
  dig: {
    last: { outcome: string } | null;
    target: { col: number; row: number } | null;
  };
  magnet: {
    phase: string;
    markerInBand: boolean;
    deckPosition: number;
    depleted: boolean;
  };
  caches: unknown[];
}

async function faProbe(page: Page): Promise<ProbeLike | null> {
  return page.evaluate(
    () =>
      (window as unknown as { __fieldActionsProbe?: ProbeLike | null })
        .__fieldActionsProbe ?? null,
  );
}

async function shot(page: Page, name: string, settleMs = 250) {
  await page.waitForTimeout(settleMs);
  await page.screenshot({ path: `${OUT_DIR}/${name}.png` });
}

async function goTo(page: Page, x: number, y: number, tolerance = 10) {
  for (let attempt = 0; attempt < 4; attempt++) {
    await driveAxisTo(page, 'y', y, 8);
    await driveAxisTo(page, 'x', x, 8);

    const probe = await playerProbe(page);

    if (
      Math.abs(probe.x - x) <= tolerance &&
      Math.abs(probe.y - y) <= tolerance
    ) {
      return;
    }
  }
}

async function faceCellFromNorth(page: Page, cx: number, cy: number) {
  const targetCol = Math.floor(cx / 32);
  const targetRow = Math.floor(cy / 32);

  for (let attempt = 0; attempt < 4; attempt++) {
    await driveAxisTo(page, 'y', cy - 76, 5);
    await driveAxisTo(page, 'x', cx, 6);
    await hold(page, 'ArrowDown', 115);

    const probeNow = await faProbe(page);
    const target = probeNow?.dig.target ?? null;

    if (
      target !== null &&
      target.col === targetCol &&
      target.row === targetRow
    ) {
      return;
    }
  }

  throw new Error(`could not face cell ${targetCol}:${targetRow}`);
}

async function scanAndWait(page: Page) {
  await page.waitForFunction(
    () =>
      (window as unknown as { __fieldActionsProbe?: ProbeLike | null })
        .__fieldActionsProbe?.scan.cooling === false,
    undefined,
    { timeout: 8_000 },
  );

  const before = await page.evaluate(() =>
    JSON.stringify(
      (window as unknown as { __fieldActionsProbe?: ProbeLike | null })
        .__fieldActionsProbe?.scan.last ?? null,
    ),
  );

  await press(page, 'C');
  await page.waitForFunction(
    (prev) =>
      JSON.stringify(
        (window as unknown as { __fieldActionsProbe?: ProbeLike | null })
          .__fieldActionsProbe?.scan.last ?? null,
      ) !== prev,
    before,
    { timeout: 10_000 },
  );
}

async function waitMagnetPhase(page: Page, phase: string, timeout = 15_000) {
  await page.waitForFunction(
    (expected) =>
      (window as unknown as { __fieldActionsProbe?: ProbeLike | null })
        .__fieldActionsProbe?.magnet.phase === expected,
    phase,
    { timeout },
  );
}

test.describe('field-actions visual capture', () => {
  test.beforeAll(() => {
    mkdirSync(OUT_DIR, { recursive: true });
  });

  test('capture the fifteen field-action frames', async ({ page }) => {
    test.setTimeout(600_000);

    await page.goto(
      '/?participant_id=P_FA_VIS&game_session_id=fa_visual_1&scene=field_actions_lab',
    );
    await page.waitForFunction(
      () =>
        (window as unknown as { __playerProbe?: { scene: string } | null })
          .__playerProbe?.scene === 'field_actions_lab',
      undefined,
      { timeout: 45_000 },
    );
    await page.waitForTimeout(800);

    // 01 — lab overview from the spawn (south work band in view).
    await shot(page, '01-lab-overview', 400);

    // 02 — scanner no-signal readout.
    await goTo(page, 480, 290);
    await scanAndWait(page);
    await shot(page, '02-scanner-no-signal', 150);

    // 03 — faint signal (calibration range fringe).
    await goTo(page, 336, 300);
    await page.waitForTimeout(1000);
    await scanAndWait(page);
    // The committed frame must show what its name claims.
    expect((await faProbe(page))!.scan.last!.category).toBe('faint');
    await shot(page, '03-scanner-faint-signal', 150);

    // 04 — strong signal (close to the hidden source).
    await goTo(page, 240, 290);
    await goTo(page, 240, 200);
    await page.waitForTimeout(1000);
    await scanAndWait(page);
    await shot(page, '04-scanner-strong-signal', 150);

    // 05 — dig action in progress (bar + tool animation).
    await goTo(page, 240, 290);
    await faceCellFromNorth(page, 240, 400);
    await press(page, 'D');
    await page.waitForFunction(
      () =>
        (window as unknown as { __fieldActionsProbe?: ProbeLike | null })
          .__fieldActionsProbe?.worldActionActive === true,
      undefined,
      { timeout: 6_000 },
    );
    await shot(page, '05-dig-in-progress', 100);

    // 06 — persistent empty excavation.
    await page.waitForFunction(
      () =>
        (window as unknown as { __fieldActionsProbe?: ProbeLike | null })
          .__fieldActionsProbe?.dig.last?.outcome === 'empty',
      undefined,
      { timeout: 10_000 },
    );
    await shot(page, '06-empty-excavation-persistent', 400);

    // 07 — space-rock recovery (floating pickup text).
    await faceCellFromNorth(page, 144, 400);
    await press(page, 'D');
    await page.waitForFunction(
      () =>
        (window as unknown as { __fieldActionsProbe?: ProbeLike | null })
          .__fieldActionsProbe?.dig.last?.outcome === 'recovered',
      undefined,
      { timeout: 10_000 },
    );
    await shot(page, '07-space-rock-recovery', 100);

    // 08 — inventory-full field cache at the excavation.
    await goTo(page, 128, 817);
    await openNearbyPrompt(page);
    await selectCardByLabel(page, 'Load a full test batch');
    await faceCellFromNorth(page, 304, 464);
    await press(page, 'D');
    await page.waitForFunction(
      () =>
        (window as unknown as { __fieldActionsProbe?: ProbeLike | null })
          .__fieldActionsProbe?.dig.last?.outcome === 'cached',
      undefined,
      { timeout: 10_000 },
    );
    await shot(page, '08-inventory-full-field-cache', 200);

    // Free one belt slot so a rig pull can land in the inventory.
    await goTo(page, 128, 817);
    await openNearbyPrompt(page);
    await selectCardByLabel(page, 'Return a scrap plate');

    // 09 — Metal Recovery Yard overview.
    await driveAxisTo(page, 'y', 656, 10);
    await driveAxisTo(page, 'x', 512, 10);
    await shot(page, '09-recovery-yard-overview', 400);

    // 10 — magnet lowering (cable extending).
    await press(page, 'F');
    await waitMagnetPhase(page, 'lowering', 8_000);
    await shot(page, '10-magnet-lowering', 0);

    // 11 — timing window (moving marker, target band, hint).
    await waitMagnetPhase(page, 'timing_window');
    await shot(page, '11-magnet-timing-window', 120);

    // 12 — successful recovery (lock in band; retry misses).
    let captured12 = false;

    for (let attempt = 0; attempt < 6 && !captured12; attempt++) {
      const probe = await faProbe(page);

      if (probe!.magnet.phase === 'idle') {
        await press(page, 'F');
        await waitMagnetPhase(page, 'timing_window');
      }

      const positionBefore = (await faProbe(page))!.magnet.deckPosition;

      await page.waitForFunction(
        () =>
          (window as unknown as { __fieldActionsProbe?: ProbeLike | null })
            .__fieldActionsProbe?.magnet.markerInBand === true,
        undefined,
        { timeout: 10_000 },
      );
      await page.keyboard.press('Space');
      await waitMagnetPhase(page, 'resolved', 15_000).catch(() => undefined);

      const now = await faProbe(page);

      if (now!.magnet.deckPosition > positionBefore) {
        await shot(page, '12-magnet-successful-recovery', 0);
        captured12 = true;
      }

      await waitMagnetPhase(page, 'idle');
    }

    expect(captured12).toBe(true);

    // 13 — missed lock (deliberately outside the band); the frame is
    // only kept when the lock genuinely missed (deck unchanged).
    let missCaptured = false;

    for (let attempt = 0; attempt < 3 && !missCaptured; attempt++) {
      const posBefore = (await faProbe(page))!.magnet.deckPosition;

      await press(page, 'F');
      await waitMagnetPhase(page, 'timing_window');
      await page.waitForFunction(
        () =>
          (window as unknown as { __fieldActionsProbe?: ProbeLike | null })
            .__fieldActionsProbe?.magnet.markerInBand === false,
        undefined,
        { timeout: 10_000 },
      );
      await page.keyboard.press('Space');
      await waitMagnetPhase(page, 'resolved', 15_000).catch(() => undefined);

      const missed = (await faProbe(page))!.magnet.deckPosition === posBefore;

      if (missed) {
        await shot(page, '13-magnet-missed-recovery', 0);
        missCaptured = true;
      }

      await waitMagnetPhase(page, 'idle');
    }

    expect(missCaptured).toBe(true);

    // 14 — explicit depleted / no-benefit state.
    for (let attempt = 0; attempt < 18; attempt++) {
      const magnet = await faProbe(page);

      if (magnet!.magnet.deckPosition >= 6) {
        break;
      }

      await press(page, 'F');
      const started = await page
        .waitForFunction(
          () =>
            (window as unknown as { __fieldActionsProbe?: ProbeLike | null })
              .__fieldActionsProbe?.magnet.phase === 'timing_window',
          undefined,
          { timeout: 8_000 },
        )
        .then(
          () => true,
          () => false,
        );

      if (!started) {
        continue;
      }

      await page.waitForFunction(
        () =>
          (window as unknown as { __fieldActionsProbe?: ProbeLike | null })
            .__fieldActionsProbe?.magnet.markerInBand === true,
        undefined,
        { timeout: 10_000 },
      );
      await page.keyboard.press('Space');
      await waitMagnetPhase(page, 'idle');
    }

    expect((await faProbe(page))!.magnet.depleted).toBe(true);
    expect(await getLastFeedbackText(page)).toContain('CATCHMENT DEPLETED');
    await shot(page, '14-depleted-no-benefit-state', 100);

    // 15 — recovered results visible in the accepted inventory.
    await press(page, 'I');
    await page.waitForFunction(
      () => {
        const probe = (
          window as unknown as { __inventoryUiProbe?: unknown | null }
        ).__inventoryUiProbe;

        return probe !== null && probe !== undefined;
      },
      undefined,
      { timeout: 8_000 },
    );
    await shot(page, '15-results-in-inventory', 400);
  });
});
