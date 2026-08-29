/**
 * Utility & Core closure — participant-path visual evidence capture
 * (evidence-led pilot v2, Unit 6).
 *
 * Committed frames for docs/verification/screenshots-evidence-led-pilot-v2
 * (35–47). Every state is produced with REAL keyboard/pointer input over
 * the participant route from the Dock — no developer boot, no state
 * injection, no DEV bypass. Frames are inspected manually, not diffed;
 * re-running replaces them in place.
 */
import { mkdirSync } from 'node:fs';

import { expect, type Page, test } from '@playwright/test';

import {
  attemptCoreDoorSealed,
  closeStationRecord,
  enterCoreChamber,
  feedPanel,
  openFeedPanel,
  openSyncReview,
  routeToUtilityDeck,
  waitCompletionNotice,
  waitCoreState,
  waitFeedPanel,
} from './closureHelpers';
import { hold, press } from './helpers';
import { captureErrors, expectNoRuntimeErrors } from './journey';
import { PILOT, walkTo } from './pilotHelpers';
import { clickElement, keyActivate } from './returnHelpers';

const OUT = 'docs/verification/screenshots-evidence-led-pilot-v2';

async function shot(page: Page, name: string) {
  await page.waitForTimeout(450);
  await page.screenshot({ path: `${OUT}/${name}.png` });
}

async function waitReady(page: Page) {
  await page.waitForFunction(
    () =>
      (window as unknown as { __feedPanelProbe?: { ready: boolean } | null })
        .__feedPanelProbe?.ready === true,
    undefined,
    { timeout: 10_000 },
  );
}

test('utility & core closure — participant-path frames 35–47', async ({
  page,
}) => {
  test.setTimeout(1_500_000);
  mkdirSync(OUT, { recursive: true });

  const errors = captureErrors(page);

  await routeToUtilityDeck(page, 'clocap', {
    concourse: { watch: 'accept', promise: 'accept', readGauge1: true },
    calibration: true,
    mast: 'partial',
  });

  // 35 — Utility Deck arrival.
  await walkTo(page, 300, 272, { yFirst: false });
  await shot(page, '35-utility-arrival');

  // 36 — early Core attempt: sealed, concise operational reason.
  await attemptCoreDoorSealed(page);
  await page.waitForTimeout(150);
  await page.screenshot({ path: `${OUT}/36-core-sealed-early-access.png` });

  await closeStationRecord(page);

  // 37 — coolant feed valve before / after.
  await openFeedPanel(page, 'coolant');
  await shot(page, '37a-coolant-valve-before');
  await hold(page, 'ArrowRight', 2600);
  await waitReady(page);
  await shot(page, '37b-coolant-valve-after');
  await press(page, 'Enter');
  await waitFeedPanel(page, false);

  // 38 — calibration breaker before / after.
  await openFeedPanel(page, 'calibration');
  await shot(page, '38a-calibration-breaker-before');

  for (let step = 0; step < 7; step += 1) {
    await press(page, 'ArrowUp');
  }

  await press(page, 'Enter');
  await waitReady(page);
  await shot(page, '38b-calibration-breaker-after');
  await press(page, 'Enter');
  await waitFeedPanel(page, false);

  // 39 — distribution bus before / after (pointer drop into the socket).
  const bus = await openFeedPanel(page, 'distribution');

  await shot(page, '39a-distribution-bus-before');

  const box = (await page.locator('canvas').boundingBox())!;
  const at = (x: number, y: number) => ({
    x: box.x + (x * box.width) / 800,
    y: box.y + (y * box.height) / 600,
  });
  const coupler = bus.geometry.coupler!;
  const socket = bus.geometry.socket!;
  const from = at(coupler.x + coupler.w / 2, coupler.y + coupler.h / 2);
  const to = at(socket.x + socket.w / 2, socket.y + socket.h / 2);

  await page.mouse.move(from.x, from.y);
  await page.mouse.down();
  await page.mouse.move((from.x + to.x) / 2, from.y, { steps: 10 });
  await page.mouse.move(to.x, to.y, { steps: 10 });
  await page.mouse.up();
  await waitReady(page);
  expect((await feedPanel(page))?.coupler).toBe('seated');
  await shot(page, '39b-distribution-bus-after');
  await press(page, 'Enter');
  await waitFeedPanel(page, false);

  // 40 — all three feeds ready: manifold and door lamp live.
  await walkTo(page, 500, 220, { yFirst: false });
  await shot(page, '40-all-feeds-ready');

  // 41 — Core Chamber accessible (the open door, lamp lit).
  await walkTo(page, PILOT.deck.coreDoor.x, PILOT.deck.coreDoor.y + 60, {
    yFirst: false,
  });
  await shot(page, '41-core-chamber-accessible');

  // 42 — the Core, inactive/prepared, on arrival.
  await enterCoreChamber(page);
  await walkTo(page, 400, 380, { yFirst: true });
  await shot(page, '42-core-inactive');

  // 43 — the compact operational review.
  await openSyncReview(page);
  await shot(page, '43-operational-review');

  // 44 — confirmation armed.
  await keyActivate(page, 'arm_sync');
  await waitCoreState(page, 'confirmation_armed');
  await shot(page, '44-confirmation-armed');

  // 45 — synchronising (mid-ramp).
  await clickElement(page, 'confirm_sync');
  await waitCoreState(page, 'synchronizing', 5000);
  await page.waitForTimeout(900);
  await page.screenshot({ path: `${OUT}/45-synchronising.png` });

  // 46/47 — stable Core, then the neutral completion notice.
  await waitCoreState(page, 'stable', 20_000);
  await waitCompletionNotice(page, true);
  await shot(page, '47-neutral-completion');
  await keyActivate(page, 'close_notice');
  await waitCompletionNotice(page, false);
  await walkTo(page, 400, 380, { yFirst: true });
  await shot(page, '46-stable-core');
  expectNoRuntimeErrors(errors);
});
