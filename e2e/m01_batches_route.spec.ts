/**
 * Station 080 M01 — two three-job batches on the participant route
 * (Unit 5, browser). Real navigation and real pointer AND keyboard input.
 *
 * Batch 1 (storm packet, Concourse, after Vale's handover): one card is
 * placed on the optional sequence board (pointer), then a job is started
 * by keyboard — the snapshot records 1 planned job and locks the board; a
 * blocked job states its printed requirement; the remaining jobs complete
 * the batch. The route then runs Workshop → Laboratory → Yard → Vale's
 * return check-in → Workshop, where the Work Order Board's return beat
 * offers "Open the return batch (three jobs)."; batch 2 is worked DIRECTLY without
 * touching the board (a valid observed 0); the exported raw family
 * reproduces 1 / 6 with the per-occasion detail. Both surfaces are
 * captured at 800×600. No participant-visible study identifier anywhere.
 */
import type { Page } from '@playwright/test';
import { expect, test } from '@playwright/test';

import { extractItemFeatures } from '../src/measurement/features';
import type { RawGameEvent } from '../src/systems/EventLogger';
import {
  eventsByPrefix,
  eventsByType,
  FORBIDDEN_TEXT,
  itemStatus,
  validityRecord,
} from './exteriorHelpers';
import { selectPromptOption } from './helpers';
import {
  captureErrors,
  completeDockTutorial,
  expectNoRuntimeErrors,
} from './journey';
import {
  bootPilot,
  concourseToLabBriefed,
  concourseToWorkshop,
  dockToConcourse,
  expectStage,
  interactAt,
  labToYardBriefed,
  openPromptAt,
  PILOT,
  registryApproach,
  valeHandover,
  workshopSignOff,
  workshopToConcourse,
  workshopVia,
  yardReturnToConcourse,
} from './pilotHelpers';
import { clickElement, surface, waitSurface } from './returnHelpers';

async function promptLabels(page: Page) {
  return page.evaluate(
    () =>
      (
        window as unknown as { __promptCards?: { label: string }[] | null }
      ).__promptCards?.map((card) => card.label) ?? [],
  );
}

async function countType(page: Page, type: string) {
  return (await eventsByType(page, type)).length;
}

async function waitCount(
  page: Page,
  type: string,
  wanted: number,
  timeout = 5_000,
) {
  const until = Date.now() + timeout;

  while (Date.now() < until) {
    if ((await countType(page, type)) === wanted) {
      return;
    }

    await page.waitForTimeout(200);
  }

  throw new Error(
    `timed out waiting for ${wanted} × ${type} (have ${await countType(page, type)})`,
  );
}

test.describe('M01 job batches on the route', () => {
  test('storm packet: one card placed then keyboard work (planned 1, blocked job, completion); return orders: direct work (planned 0); reproduced 1 / 6', async ({
    page,
  }) => {
    test.setTimeout(900_000);

    const errors = captureErrors(page);

    await bootPilot(page, 'm01');
    await completeDockTutorial(page, 1);
    await dockToConcourse(page);
    await valeHandover(page);
    expect(await countType(page, 'proto_m01_batch_presented')).toBe(1);

    // Batch 1: the plan board on the storm packet.
    const board = registryApproach('concourse.plan_board');

    await interactAt(page, board, { approachOffset: { x: 0, y: 0 } });
    await waitSurface(page, true, 'm01_plan_board');

    const opened = await surface(page);

    expect(opened?.title).toBe('STORM PACKET — THREE JOBS');
    expect(`${opened?.title}\n${opened?.status}`).not.toMatch(FORBIDDEN_TEXT);
    await page.screenshot({ path: 'test-results/m01-batch1-800x600.png' });
    expect(await itemStatus(page, 'M01')).toBe('pending');

    // One deliberate placement (pointer): lift a card, place it in slot 1.
    await clickElement(page, 'card_isolate_loop');
    await clickElement(page, 'slot_0');
    await waitCount(page, 'proto_m01_batch_card_placed', 1);
    expect(await countType(page, 'proto_m01_batch_plan_snapshot')).toBe(0);

    // First work action by keyboard (job 2 — blocked by its requirement):
    // the snapshot is taken now, with 1 planned job, and the board locks.
    await page.keyboard.press('2');
    await waitCount(page, 'proto_m01_batch_plan_snapshot', 1);
    expect(
      (await eventsByType(page, 'proto_m01_batch_plan_snapshot'))[0]?.metadata,
    ).toMatchObject({
      planned_jobs: 1,
      plan_order: ['isolate_loop'],
      first_job_pressed: 'replace_seal',
      input_mode: 'keyboard',
    });
    expect(await countType(page, 'proto_m01_batch_dependency_error')).toBe(1);
    // The board is locked: a slot press places nothing now.
    await clickElement(page, 'slot_1');
    expect(await countType(page, 'proto_m01_batch_card_placed')).toBe(1);

    await page.waitForTimeout(500);
    await clickElement(page, 'do_isolate_loop');
    await waitCount(page, 'proto_m01_batch_job_done', 1);
    await page.waitForTimeout(500);
    await page.keyboard.press('2');
    await waitCount(page, 'proto_m01_batch_job_done', 2);
    await page.waitForTimeout(500);
    await clickElement(page, 'do_log_storm');
    await waitCount(page, 'proto_m01_batch_job_done', 3);
    await waitCount(page, 'proto_m01_batch_window_closed', 1);

    const closed1 = (
      await eventsByType(page, 'proto_m01_batch_window_closed')
    )[0];

    expect(closed1?.metadata?.occasion).toBe('o1');
    expect(closed1?.metadata?.raw_components).toMatchObject({
      planned_jobs: 1,
      execution_order: ['isolate_loop', 'replace_seal', 'log_storm'],
      all_done: true,
      dependency_error_count: 1,
      plan_adherence: 1,
    });
    expect((await validityRecord(page, 'proto_m01_batch_o1')).validity).toBe(
      'valid',
    );
    expect((await surface(page))?.status).not.toMatch(FORBIDDEN_TEXT);
    await page.keyboard.press('Escape');
    await waitSurface(page, false);

    // The route to the return shift (nothing here depends on the batch).
    await concourseToWorkshop(page);
    await workshopSignOff(page);
    await workshopToConcourse(page);
    await concourseToLabBriefed(page);
    await labToYardBriefed(page);
    await yardReturnToConcourse(page);
    await openPromptAt(page, PILOT.concourse.vale, {
      approachOffset: { x: 0, y: 40 },
    });
    await selectPromptOption(page, 1);
    await expectStage(page, 'workshop_return');

    // Batch 2 from the Work Order Board's return beat: direct work.
    await concourseToWorkshop(page);
    await workshopVia(page, 1312, 178);
    await openPromptAt(page, PILOT.workshop.board, {
      approachOffset: { x: -32, y: 38 },
    });

    const labels = await promptLabels(page);

    expect(labels).toContain('Open the return batch (three jobs).');
    expect(await countType(page, 'proto_m01_batch_presented')).toBe(2);
    await selectPromptOption(
      page,
      labels.indexOf('Open the return batch (three jobs).') + 1,
    );
    await waitSurface(page, true, 'm01_return_orders');
    expect((await surface(page))?.title).toBe('RETURN BATCH — THREE JOBS');
    await page.screenshot({ path: 'test-results/m01-batch2-800x600.png' });

    // Direct work in a workable order by element (the button row follows
    // the counterbalanced packet order, so hotkey 1-2-3 is not always
    // workable); the first press is the first work action (planned 0).
    for (const id of ['sort_spares', 'seal_spares_crate', 'count_hand_tools']) {
      await clickElement(page, `do_${id}`);
      await page.waitForTimeout(600);
    }

    await waitCount(page, 'proto_m01_batch_window_closed', 2);

    const closed2 = (
      await eventsByType(page, 'proto_m01_batch_window_closed')
    )[1];

    expect(closed2?.metadata?.occasion).toBe('o2');
    expect(closed2?.metadata?.raw_components).toMatchObject({
      planned_jobs: 0,
      placements: 0,
      all_done: true,
      dependency_error_count: 0,
    });
    expect(await itemStatus(page, 'M01')).toBe('completed');
    await page.keyboard.press('Escape');
    await waitSurface(page, false);

    // The sign-off never depended on the batch: still offered.
    await openPromptAt(page, PILOT.workshop.board, {
      approachOffset: { x: -32, y: 38 },
    });
    expect(await promptLabels(page)).not.toContain(
      'Open the return batch (three jobs).',
    );
    await selectPromptOption(page, 2); // Still working.

    // Independent reproduction from the raw family alone.
    const family = (await eventsByPrefix(
      page,
      'proto_m01_batch_',
    )) as unknown as RawGameEvent[];
    const rows = extractItemFeatures('M01', family, {
      finalCoreClosed: false,
      pageLoadIndex: 1,
      reloaded: false,
    });

    expect(rows[0]).toMatchObject({
      feature_id: 'm01_planned_jobs',
      value: 1,
      numerator: 1,
      denominator: 6,
      disposition: 'observed',
      independence: 'independent_occasions',
    });
    expect(rows[0].components).toMatchObject({
      planned_by_occasion: { o1: 1, o2: 0 },
      snapshot_agrees: true,
    });
    expectNoRuntimeErrors(errors);
  });
});
