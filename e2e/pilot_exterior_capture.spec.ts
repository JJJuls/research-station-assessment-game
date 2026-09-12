/**
 * Exterior Recovery — participant-view visual evidence capture
 * (evidence-led pilot v2, Unit 4).
 *
 * Thirteen committed frames in
 * docs/verification/screenshots-evidence-led-pilot-v2 (09–21), each
 * produced with REAL keyboard input on the participant route (no
 * developer boot, no state injection) and inspected manually at full
 * resolution; re-running replaces them in place.
 */
import { mkdirSync } from 'node:fs';

import { expect, type Page, test } from '@playwright/test';

import {
  acceptMast,
  acknowledgeDepletion,
  acknowledgeLineAtPostA,
  beginExcavation,
  captureErrors,
  couplingAct,
  digFacing,
  doMastStage,
  enterYard,
  expectNoRuntimeErrors,
  exteriorProbe,
  faceCell,
  faProbe,
  finishOutside,
  openSite,
  powerUpUplink,
  pressExpectingEffect,
  scanAt,
  standOnPad,
  startSalvageTally,
  transmitAt,
  waitDisconnect,
  waitMagnetPhase,
  YARD,
} from './exteriorHelpers';
import { press, selectPromptOption } from './helpers';
import { pilotProbe, walkTo } from './pilotHelpers';

const OUT = 'docs/verification/screenshots-evidence-led-pilot-v2';

async function shot(page: Page, name: string, settleMs = 450) {
  await page.waitForTimeout(settleMs);
  await page.screenshot({ path: `${OUT}/${name}.png` });
}

test('exterior recovery — thirteen participant-view frames', async ({
  page,
}) => {
  test.setTimeout(1_500_000);
  mkdirSync(OUT, { recursive: true });

  const errors = captureErrors(page);

  await enterYard(page, 'cap4');

  // 09 — arrival: apron, airlock sign, objective line, beacon on the coupling.
  await walkTo(page, 420, 250, { yFirst: true });
  await shot(page, '09-exterior-arrival');

  // 10 — M05 occasion 2: the loose cable flag (presented, never mentioned).
  expect((await exteriorProbe(page)).m05.presented).toBe(true);
  await walkTo(page, YARD.flag.x - 60, YARD.flag.y - 44, { yFirst: true });
  await shot(page, '10-m05-cable-flag');

  // 11 — M19: the coupling iced after the third turn (difficulty onset).
  await couplingAct(page, 1);
  await couplingAct(page, 1);
  await couplingAct(page, 1);
  expect((await exteriorProbe(page)).m19.bound).toBe(true);
  await shot(page, '11-m19-coupling-iced', 200);

  // Thaw and finish for the later frames.
  for (let guard = 0; guard < 30; guard++) {
    const m19 = (await exteriorProbe(page)).m19;

    if (m19.completion) {
      break;
    }

    await couplingAct(page, m19.bound ? 2 : 1);
  }

  // 12 — M20: antenna restoration started (feed seated, alignment pending).
  await acceptMast(page);
  await doMastStage(page, 1);
  await doMastStage(page, 2);
  await page.waitForTimeout(2400); // let the stage feedback toast clear
  await openSite(page, 'mast');
  await shot(page, '12-m20-antenna-started');
  await selectPromptOption(page, 1);

  // 13 — scanner readouts: no signal → faint → actionable.
  const form = (await exteriorProbe(page)).m23_form;
  const spots = YARD.scanSpots[form];
  const cell = YARD.targetCells[form];

  await beginExcavation(page);
  await scanAt(page, spots.none);
  await shot(page, '13a-m23-scan-no-signal', 150);
  await scanAt(page, spots.faint);
  expect((await faProbe(page)).scan.last?.category).toBe('faint');
  await shot(page, '13b-m23-scan-faint', 150);
  await scanAt(page, spots.actionable);
  expect(['moderate', 'strong']).toContain(
    (await faProbe(page)).scan.last?.category,
  );
  await shot(page, '13c-m23-scan-actionable', 150);

  // 14 — the exact excavation and recovery.
  await faceCell(page, cell.x, cell.y);
  await digFacing(page, 'recovered');
  await shot(page, '14-m23-recovery', 200);

  // 15 — Metal Recovery Yard overview + rig panel.
  await standOnPad(page);
  await shot(page, '15-metal-recovery-yard');

  // 16 — the active timing window (marker, band, hint).
  await startSalvageTally(page);
  await standOnPad(page);
  await pressExpectingEffect(page, 'F');
  await waitMagnetPhase(page, 'timing_window', 10_000);
  await shot(page, '16-m24-timing-window', 120);
  await page.keyboard.press('Space');
  await waitMagnetPhase(page, 'resolved', 15_000).catch(() => undefined);

  // 17 — a cycle result on the magnet.
  await shot(page, '17-m24-cycle-result', 0);
  await waitMagnetPhase(page, 'idle');

  // 18 — explicit depletion (banner + statement + panel).
  for (
    let position = (await faProbe(page)).magnet.deckPosition;
    position < 6;
    position++
  ) {
    await pressExpectingEffect(page, 'F');
    await waitMagnetPhase(page, 'timing_window', 10_000);
    await page.keyboard.press('Space');
    await waitMagnetPhase(page, 'idle');
  }

  expect((await faProbe(page)).magnet.depleted).toBe(true);
  await shot(page, '18-m24-depleted', 200);
  await acknowledgeDepletion(page);

  // 19 — M26 evidence: severed conduit, LINE A ✕ OPEN chips, panel notice.
  await powerUpUplink(page);
  await transmitAt(page, 'uplinkA');
  await waitDisconnect(page);
  await openSite(page, 'panel');
  await shot(page, '19-m26-disconnect-evidence');
  await selectPromptOption(page, 1); // acknowledge at the panel
  await page.waitForTimeout(300);

  if (!(await exteriorProbe(page)).m26.disconnect_acknowledged) {
    await acknowledgeLineAtPostA(page);
  }

  await transmitAt(page, 'uplinkB');

  // 20 — inventory-full field cache is captured by the belt-full route
  // test; here the frame shows the yard state with the recovered piece
  // and the persisted excavation (disturbed ground) for the report.
  await walkTo(page, cell.x, cell.y - 40, { yFirst: true });
  await shot(page, '20-m23-persistent-excavation');

  // 21 — the return route with the persistent antenna state.
  await finishOutside(page);
  await walkTo(page, 342, 240, { yFirst: true });
  await press(page, 'm');
  await page.waitForFunction(
    () =>
      (window as unknown as { __pilotMapProbe?: { open: boolean } | null })
        .__pilotMapProbe?.open === true,
    undefined,
    { timeout: 5000 },
  );
  await shot(page, '21a-return-mission-log');
  await press(page, 'Escape');
  await page.waitForTimeout(400);
  await walkTo(page, 342, 262, { yFirst: true });
  expect((await pilotProbe(page))?.objective).toContain('Concourse');
  await shot(page, '21-return-route');

  expectNoRuntimeErrors(errors);
});
