/**
 * Return, Revision & Handover — participant-path visual evidence capture
 * (evidence-led pilot v2, Unit 5).
 *
 * Committed frames for docs/verification/screenshots-evidence-led-pilot-v2
 * (22–34). Every state is produced with REAL keyboard/pointer input over
 * the participant route from the Dock — no developer boot, no state
 * injection. Frames are inspected manually, not diffed; re-running
 * replaces them in place.
 */
import { mkdirSync } from 'node:fs';

import { expect, type Page, test } from '@playwright/test';

import { leaveYard } from './exteriorHelpers';
import { press, selectPromptOption } from './helpers';
import {
  expectStage,
  openPromptAt,
  PILOT,
  pilotProbe,
  useDoor,
  walkTo,
} from './pilotHelpers';
import {
  assembleReport,
  attachTag,
  captureErrors,
  clickElement,
  closeSurface,
  enterConcourseWithOffers,
  expectNoRuntimeErrors,
  exteriorShift,
  kaiViaLane,
  keyActivate,
  M21_SPEC,
  M22_TAG,
  openFeedConsole,
  openHandoverDesk,
  openWorkshopSurface,
  placeOutbound,
  RETURN,
  returnProbe,
  signOffReturnShift,
  submitReport,
  surfaceElement,
  uiProbe,
  valeReturnCheckIn,
  waitSurface,
  workshopApproach,
  workshopRestorationShift,
} from './returnHelpers';

// V4: an explicit output directory keeps the historical v2 evidence
// untouched when the capture is re-run for a later visual pass.
const OUT =
  process.env.PILOT_RETURN_OUT ??
  'docs/verification/screenshots-evidence-led-pilot-v2';

async function shot(page: Page, name: string) {
  await page.waitForTimeout(450);
  await page.screenshot({ path: `${OUT}/${name}.png` });
}

test('return, revision & handover — participant-path frames 22–34', async ({
  page,
}) => {
  test.setTimeout(1_500_000);
  mkdirSync(OUT, { recursive: true });

  const errors = captureErrors(page);

  await enterConcourseWithOffers(page, 'retcap', {
    watch: 'accept',
    promise: 'accept',
    readGauge1: true,
  });
  await workshopRestorationShift(page, { startCalibration: true });
  await exteriorShift(page, 'full');

  // 22 — the return: through the airlock into the laboratory.
  await leaveYard(page);
  await page.waitForTimeout(600);
  await shot(page, '22-return-airlock-entry');
  await walkTo(page, 240, 456, { yFirst: true });
  await useDoor(page, PILOT.lab.southDoor, 'station_concourse', {
    approachOffset: { x: 0, y: -40 },
  });
  await expectStage(page, 'return_hub');

  // 23 — the changed station status on the Concourse (wall console + gauge).
  await walkTo(page, 432, 240, { yFirst: false });
  await shot(page, '23-station-status-changed');

  // 26 — the M09 monitoring opportunity: the gauge with its changed reading.
  await walkTo(page, RETURN.concourse.gauge.x, RETURN.concourse.gauge.y - 44, {
    yFirst: true,
  });
  await shot(page, '26-m09-gauge-opportunity');
  await press(page, 'Space');
  await page.waitForTimeout(600);

  // 27 — the M10 handover opportunity at Kai (option offered, never asked).
  await kaiViaLane(page);
  await openPromptAt(page, RETURN.concourse.kai, {
    approachOffset: { x: 0, y: 40 },
  });
  await shot(page, '27-m10-handover-opportunity');
  await selectPromptOption(page, 1);
  await page.waitForTimeout(500);

  await valeReturnCheckIn(page);

  // 23b — the workshop on the return: chips reflect the persisted state.
  await walkTo(page, 560, RETURN.laneY, { yFirst: true });
  await shot(page, '23b-workshop-return-overview');

  // 24 — M03 occasion 2: the press-B work surface with the residuals.
  await workshopApproach(page, 'pressB');
  await press(page, 'Space');
  await page.waitForFunction(
    () =>
      (window as unknown as { __inventoryUiProbe?: { open: boolean } | null })
        .__inventoryUiProbe?.open === true,
    undefined,
    { timeout: 8000 },
  );

  for (let cycle = 0; cycle < 3; cycle += 1) {
    await press(page, 'c');
    await page.waitForTimeout(350);
  }

  await page.waitForTimeout(1200);
  await shot(page, '24-m03-occasion-2-workspace');
  await page.waitForTimeout(1200);
  await page.keyboard.press('Escape');
  await page.waitForFunction(
    () =>
      (window as unknown as { __inventoryUiProbe?: { open: boolean } | null })
        .__inventoryUiProbe?.open === false,
    undefined,
    { timeout: 8000 },
  );
  expect((await uiProbe(page))?.open).toBe(false);

  // 25 — M07 end: the bench reopened on the return with stage 1 done.
  await openWorkshopSurface(page, 'calibrationBench', 'm07_calibration_bench');
  await shot(page, '25-m07-end-opportunity');
  await closeSurface(page);

  // 28 — the persisted M20 feed console (outdoor stages done, resume offered).
  await openFeedConsole(page);
  await shot(page, '28-m20-feed-console-persisted');
  await keyActivate(page, 'resume');
  await page.waitForTimeout(400);
  await clickElement(page, 'stage_action');
  await page.waitForTimeout(600);
  await shot(page, '28b-m20-console-stage-in-progress');
  await page.waitForFunction(
    () =>
      ((
        window as unknown as {
          __returnProbe?: { m20: { indoor_stages_done: string[] } } | null;
        }
      ).__returnProbe?.m20.indoor_stages_done.length ?? 0) >= 1,
    undefined,
    { timeout: 8000 },
  );
  await closeSurface(page);

  // 29 — M21 manual inspection: §2 open in DIAGRAM mode.
  await openWorkshopSurface(page, 'relayBench', 'm21_relay_bench');

  const form = (await returnProbe(page)).m21.form;
  const spec = M21_SPEC[form];

  await press(page, 'i');
  await page.waitForTimeout(250);
  await clickElement(page, 'section_s1_identify');
  await clickElement(page, 'ref_s2_jumper_rule');
  await clickElement(page, 'mode_diagram');
  await shot(page, '29-m21-manual-inspection');
  await clickElement(page, 'ref_s4_variant_table');
  await clickElement(page, 'mode_text');
  await clickElement(page, 'section_s3_selector_rule');

  // 30 — M21 repair manipulation: jumpers + selector set, bench test PASS.
  for (const post of spec.jumpers) {
    await clickElement(page, `post_${post}`);
  }

  await clickElement(page, `line_${spec.selector}`);
  await press(page, 't');
  await page.waitForTimeout(300);
  expect((await surfaceElement(page, 'test_readout'))?.label).toContain('PASS');
  await shot(page, '30-m21-repair-manipulation');
  await press(page, 'f');
  await page.waitForTimeout(500);
  await clickElement(page, 'leave');
  await waitSurface(page, false);

  // 31 — M22 setback: the returned note and the newly opened register.
  const placed = await assembleReport(page);

  await submitReport(page);
  await shot(page, '31-m22-setback');
  await press(page, 'k');
  await page.waitForTimeout(300);
  await clickElement(page, 'register_toggle');

  for (const [slot, lineId] of placed.entries()) {
    await attachTag(page, slot, M22_TAG[lineId]);
  }

  // 32 — M22 revised and recovered (accepted).
  await submitReport(page);
  await shot(page, '32-m22-revised-recovered');
  await clickElement(page, 'leave');
  await waitSurface(page, false);

  // 33 — the M25 questionnaire handoff notice at the handover desk.
  await openHandoverDesk(page);
  await page.waitForTimeout(200);

  const labels = await page.evaluate(
    () =>
      (
        window as unknown as { __promptCards?: { label: string }[] | null }
      ).__promptCards?.map((card) => card.label) ?? [],
  );
  const noticeIndex = labels.findIndex((label) =>
    /questionnaire notice/i.test(label),
  );

  await selectPromptOption(page, noticeIndex + 1);
  await page.waitForTimeout(400);
  await shot(page, '33-m25-questionnaire-handoff');
  await selectPromptOption(page, 1);
  await page.waitForTimeout(300);
  await placeOutbound(page);
  expect((await returnProbe(page)).handover.relay_unit).toBe(true);

  // 34 — the final Unit 5 objective: the route points at the Utility Deck.
  await signOffReturnShift(page);
  await walkTo(page, PILOT.workshop.board.x, RETURN.laneY, { yFirst: true });
  await walkTo(page, 620, RETURN.laneY, { yFirst: true });
  expect((await pilotProbe(page))?.objective).toContain('Utility Deck');
  await shot(page, '34-final-objective-utility-deck');
  expectNoRuntimeErrors(errors);
});
