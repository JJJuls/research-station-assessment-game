/**
 * Station 080 M22 — the two setback reports on the participant route (Unit
 * 11, browser). The return shift is reached as `pilot_return` reaches it
 * (episodes 1–4 by real input, the purposeful return, Vale's check-in); the
 * desk then runs report 1 (the handover report: assembled, returned with
 * the tag requirement, acknowledged, revised with the register, accepted),
 * report 2 (the consignment note, placed at once: assembled, returned with
 * the bay requirement, acknowledged, withdrawn — an exit), then the two
 * ratings (one answered by keyboard, one declined by pointer), each screen
 * presented on its own with a settle window that refuses a carried-over
 * press. Withdraw is not offered before the returned note is acknowledged.
 * The raw family reproduces 1 of 2 and the two ratings through the
 * read-only extractor. Screenshots: report 2's returned note and the
 * rating stage.
 */
import { expect, test } from '@playwright/test';

import { extractItemFeatures } from '../src/measurement/features';
import type { RawGameEvent } from '../src/systems/EventLogger';
import { press } from './helpers';
import { captureErrors, expectNoRuntimeErrors } from './journey';
import { expectStage } from './pilotHelpers';
import {
  assembleReport,
  attachCode,
  clickElement,
  codeFor,
  enterConcourseWithOffers,
  eventsByPrefix,
  eventsByType,
  exteriorShift,
  FORBIDDEN_TEXT,
  handOverToKai,
  itemStatus,
  placeThreeLines,
  readGauge,
  returnInside,
  returnProbe,
  submitReport,
  surface,
  surfaceElement,
  valeReturnCheckIn,
  validityRecord,
  waitSurface,
  workshopRestorationShift,
} from './returnHelpers';

function meta(event: { metadata?: Record<string, unknown> }) {
  return event.metadata ?? {};
}

test.describe('M22 two setback reports on the return shift', () => {
  test('report 1 returned, acknowledged, revised, accepted; report 2 returned, acknowledged, withdrawn; one rating answered and one declined; reproduced 1 of 2 with the ratings apart', async ({
    page,
  }) => {
    test.setTimeout(1_500_000);

    const errors = captureErrors(page);

    await enterConcourseWithOffers(page, 'm22r', {
      watch: 'accept',
      promise: 'accept',
      readGauge1: true,
    });
    await workshopRestorationShift(page, { startCalibration: true });
    await exteriorShift(page, 'full');
    await returnInside(page);
    await handOverToKai(page);
    await readGauge(page);
    await valeReturnCheckIn(page);
    await expectStage(page, 'workshop_return');

    let rp = await returnProbe(page);

    expect(rp.m22.active).toBe('o1');
    expect(await itemStatus(page, 'M22')).toBe('pending');

    // ——— Report 1: the handover report ———
    const placed = await assembleReport(page);

    expect(placed).toHaveLength(3);

    const before = await surface(page);

    expect(before?.title).toContain('REPORT 1 OF 2');
    expect(`${before?.title}\n${before?.status}`).not.toMatch(FORBIDDEN_TEXT);
    expect(await surfaceElement(page, 'code_WO-11')).toBeNull(); // no code before the requirement

    let feedback = await submitReport(page);

    expect(feedback).toMatch(/returned by the receiving desk/i);
    expect((await surfaceElement(page, 'returned_note'))?.label).toContain(
      'work-order tag',
    );
    expect((await surfaceElement(page, 'submit'))?.state).toBe('disabled');
    expect(await surfaceElement(page, 'withdraw_o1')).toBeNull(); // not before the acknowledgement
    await press(page, 'k');
    await page.waitForTimeout(300);
    expect(await surfaceElement(page, 'withdraw_o1')).not.toBeNull();
    await clickElement(page, 'register_toggle');

    for (const [slot, lineId] of placed.entries()) {
      await attachCode(page, slot, codeFor(lineId));
    }

    feedback = await submitReport(page);
    expect(feedback).toContain('accepted');
    rp = await returnProbe(page);
    expect(rp.m22.o1).toMatchObject({
      phase: 'accepted',
      window: 'closed',
      exit: 'completed',
      requirement_presented: true,
      revision_begun: true,
      recovery_complete: true,
      exited: false,
    });
    expect(rp.m22.active).toBe('o2');
    expect(rp.m22.o2.window).toBe('open');
    expect(await itemStatus(page, 'M22')).toBe('open');

    // ——— Report 2: the consignment note (placed at once) ———
    const placed2 = await surface(page);

    expect(placed2?.title).toContain('REPORT 2 OF 2');
    expect(placed2?.status).toContain('report 2 of 2');
    await page.waitForTimeout(1_600); // the placement settle window

    const lines2 = await placeThreeLines(page);

    expect(lines2.every((id) => id.startsWith('c_'))).toBe(true);
    feedback = await submitReport(page);
    expect(feedback).toMatch(/returned by the outbound desk/i);
    expect((await surfaceElement(page, 'returned_note'))?.label).toContain(
      'destination bay',
    );
    expect(await surfaceElement(page, 'code_BAY-A')).not.toBeNull();
    await page.screenshot({
      path: 'test-results/m22-report2-returned-800x600.png',
    });
    expect(await surfaceElement(page, 'withdraw_o2')).toBeNull();
    await press(page, 'k');
    await page.waitForTimeout(300);
    await clickElement(page, 'withdraw_o2');
    // The rating stage is presented the moment report 2 is decided: a press
    // inside its 1 s settle window is refused and logged, never recorded.
    await page.waitForTimeout(150);
    await press(page, '4');
    await page.waitForTimeout(300);
    rp = await returnProbe(page);
    expect(rp.m22.ratings.o1).toBeNull();
    expect(rp.m22.o2).toMatchObject({
      phase: 'closed',
      window: 'closed',
      exit: 'stopped',
      stop_choice: 'withdrawn',
      requirement_presented: true,
      setback_comprehension: true,
      revision_begun: false,
      exited: true,
    });
    expect(rp.m22.all_decided).toBe(true);
    expect((await validityRecord(page, 'proto_m22_returned_o2')).validity).toBe(
      'valid',
    );

    // ——— The ratings: after both decisions, one per returned report ———
    expect(rp.m22.rating_due).toBe('o1');

    const ratingStage = await surface(page);

    expect(ratingStage?.title).toContain('ONE QUESTION (1 OF 2)');
    expect(ratingStage?.elements.map((e) => e.id)).toEqual(
      expect.arrayContaining([
        'rating_prompt',
        'rating_1',
        'rating_5',
        'rating_decline',
      ]),
    );
    expect(`${ratingStage?.title}\n${ratingStage?.status}`).not.toMatch(
      FORBIDDEN_TEXT,
    );
    expect(ratingStage?.focus).toBe('rating_prompt'); // neutral first focus
    await page.screenshot({ path: 'test-results/m22-rating-800x600.png' });
    await page.waitForTimeout(1_100); // past the settle window
    await press(page, '2'); // keyboard: option 2
    await page.waitForTimeout(300);
    rp = await returnProbe(page);
    expect(rp.m22.ratings.o1).toMatchObject({
      value: 2,
      declined: false,
      position: 1,
    });
    expect(rp.m22.ratings.o1?.recall_delay_ms).toBeGreaterThan(0);
    expect(rp.m22.rating_due).toBe('o2');
    expect((await surface(page))?.title).toContain('ONE QUESTION (2 OF 2)');
    await page.waitForTimeout(1_100); // the second screen's own settle window
    await clickElement(page, 'rating_decline'); // pointer: decline
    await page.waitForTimeout(300);
    rp = await returnProbe(page);
    expect(rp.m22.ratings.o2).toMatchObject({
      value: null,
      declined: true,
      position: 2,
    });
    expect(rp.m22.desk_done).toBe(true);
    expect((await surface(page))?.status).toContain('closed');
    await clickElement(page, 'leave');
    await waitSurface(page, false);
    expect(await itemStatus(page, 'M22')).toBe('completed');

    // Independent reproduction from the raw family alone.
    const family = (await eventsByPrefix(
      page,
      'proto_m22_returned_',
    )) as unknown as RawGameEvent[];
    const submitted = await eventsByType(page, 'proto_m22_returned_submitted');

    expect(submitted.map((e) => [meta(e).report, meta(e).outcome])).toEqual([
      ['o1', 'setback'],
      ['o1', 'accepted'],
      ['o2', 'setback'],
    ]);
    expect(
      (await eventsByType(page, 'proto_m22_returned_rating_answered')).map(
        (e) => [meta(e).report, meta(e).value],
      ),
    ).toEqual([['o1', 2]]);
    expect(
      (await eventsByType(page, 'proto_m22_returned_rating_declined')).map(
        (e) => meta(e).report,
      ),
    ).toEqual(['o2']);
    expect(
      (await eventsByType(page, 'proto_m22_returned_rating_presented')).map(
        (e) => [meta(e).report, meta(e).position],
      ),
    ).toEqual([
      ['o1', 1],
      ['o2', 2],
    ]);
    expect(
      (await eventsByType(page, 'proto_m22_returned_press_refused'))
        .filter((e) => meta(e).reason === 'rating_settling')
        .map((e) => [meta(e).report, meta(e).control]),
    ).toEqual([['o1', 'rating_4']]);

    const rows = extractItemFeatures('M22', family, {
      finalCoreClosed: false,
      pageLoadIndex: 1,
      reloaded: false,
    });

    expect(rows[0]).toMatchObject({
      feature_id: 'm22_revisions_begun',
      value: 1,
      numerator: 1,
      denominator: 2,
      disposition: 'observed',
      censored: false,
    });
    expect(rows[1]).toMatchObject({
      feature_id: 'm22_discouragement_ratings',
      disposition: 'observed',
    });
    expect(rows[1].value).toMatchObject({
      o1: { value: 2, declined: false, position: 1 },
      o2: { value: null, declined: true, position: 2 },
    });
    expect(rows[1].components).toMatchObject({
      rating_screens_presented: 2,
      acknowledged_reports: ['o1', 'o2'],
    });
    expectNoRuntimeErrors(errors);
  });
});
