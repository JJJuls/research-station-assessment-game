/**
 * Station 080 M21 — the two bench units on the participant route (Unit 10,
 * browser). The return shift is reached the way `pilot_return` reaches it
 * (episodes 1–4 driven by real input, the one purposeful return, Vale's
 * check-in); the bench then runs unit 1 (relay unit: a wrong jumper first,
 * the truthful fault, a relevant restudy of §4, the revised configuration
 * accepted) and unit 2 (pump controller: first-time success). The raw
 * family reproduces 1 of 1 through the read-only extractor with the
 * per-case strategies beside it. Screenshots: the failing first
 * application and the second unit placed.
 */
import { expect, test } from '@playwright/test';

import { extractItemFeatures } from '../src/measurement/features';
import type { RawGameEvent } from '../src/systems/EventLogger';
import { press } from './helpers';
import { captureErrors, expectNoRuntimeErrors } from './journey';
import { expectStage, pilotProbe } from './pilotHelpers';
import {
  clickElement,
  enterConcourseWithOffers,
  eventsByPrefix,
  eventsByType,
  exteriorShift,
  FORBIDDEN_TEXT,
  handOverToKai,
  itemStatus,
  keyActivate,
  M21_SPEC,
  openWorkshopSurface,
  readGauge,
  returnInside,
  returnProbe,
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

test.describe('M21 two bench units on the return shift', () => {
  test('unit 1: wrong jumper, truthful fault, relevant restudy, revised application accepted; unit 2: first-time success; reproduced 1 of 1 with the strategies apart', async ({
    page,
  }) => {
    test.setTimeout(1_500_000);

    const errors = captureErrors(page);

    await enterConcourseWithOffers(page, 'm21r', {
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
    expect((await pilotProbe(page))?.zone).toBe('records_workshop');

    let rp = await returnProbe(page);

    expect(rp.m21.active).toBe('o1');
    expect(rp.m21.o1.window).toBe('unopened');
    expect(await itemStatus(page, 'M21')).toBe('pending');

    // ——— Unit 1: the relay unit ———
    await openWorkshopSurface(page, 'relayBench', 'm21_relay_bench');
    rp = await returnProbe(page);

    const form1 = rp.m21.o1.form;
    const spec1 = M21_SPEC.o1[form1];
    const probe1 = await surface(page);

    expect(probe1?.title).toContain('UNIT 1 OF 2');
    expect(`${probe1?.title}\n${probe1?.status}`).not.toMatch(FORBIDDEN_TEXT);
    await press(page, 'i');
    await page.waitForTimeout(250);
    expect((await surfaceElement(page, 'plate'))?.label).toContain(spec1.plate);
    await clickElement(page, 'section_s1_identify');
    await clickElement(page, 'ref_s2_post_rule');
    await clickElement(page, 'ref_s4_code_table');
    await keyActivate(page, 'section_s3_selector_rule');
    await clickElement(page, 'mode_diagram');
    await clickElement(page, 'mode_text');

    // A wrong jumper with the right selector, then FIT: the truthful fault.
    const wrong = M21_SPEC.o1.all.find(
      (post) => !(spec1.posts as readonly string[]).includes(post),
    )!;

    await clickElement(page, `post_${wrong}`);
    await keyActivate(page, `line_${spec1.selector}`);
    await press(page, 'f');
    await page.waitForTimeout(300);

    const failing = await surface(page);

    expect((await surfaceElement(page, 'fit_readout'))?.label).toContain(
      'jumper mismatch',
    );
    expect(failing?.status).toContain('fails on the bench');
    expect(failing?.status).not.toMatch(/J[1-4]|which post/);
    await page.screenshot({ path: 'test-results/m21-failing-800x600.png' });
    rp = await returnProbe(page);
    expect(rp.m21.o1).toMatchObject({
      applications: 1,
      first_application_correct: false,
      first_application_faults: ['posts'],
      accepted: false,
      strategy: 'unresolved',
    });
    // Unit 2 is declared but untouched: the item row reads `pending` (least
    // terminal of its two windows) while unit 1 is open.
    expect(await itemStatus(page, 'M21')).toBe('pending');

    // Relevant restudy (§4), revise, FIT again: accepted; unit 2 placed.
    await clickElement(page, 'section_s4_code_table');
    await clickElement(page, `post_${wrong}`);

    for (const post of spec1.posts) {
      await clickElement(page, `post_${post}`);
    }

    await press(page, 'f');
    await page.waitForFunction(
      () =>
        (
          window as unknown as {
            __returnProbe?: { m21: { o1: { accepted: boolean } } } | null;
          }
        ).__returnProbe?.m21.o1.accepted === true,
      undefined,
      { timeout: 5000 },
    );
    await page.waitForTimeout(300);
    rp = await returnProbe(page);
    expect(rp.m21.o1).toMatchObject({
      window: 'closed',
      exit: 'completed',
      applications: 2,
      relevant_restudy: true,
      revised_application: true,
      restudy_revision: true,
      strategy: 'restudy_and_revise',
      output_delivery: 'inventory',
    });
    expect(rp.m21.active).toBe('o2');
    expect(rp.m21.o2.window).toBe('open');
    expect(await itemStatus(page, 'M21')).toBe('open');

    const placed = await surface(page);

    expect(placed?.title).toContain('UNIT 2 OF 2');
    expect(placed?.status).toContain('unit 2 of 2');
    await page.screenshot({ path: 'test-results/m21-unit2-800x600.png' });

    // ——— Unit 2: the pump controller, first-time success ———
    const form2 = rp.m21.o2.form;
    const spec2 = M21_SPEC.o2[form2];

    // Past the placement settle window (a carried FIT / SET ASIDE press is
    // refused inside it — review G-H1).
    await page.waitForTimeout(1_600);
    await press(page, 'i');
    await page.waitForTimeout(250);
    expect((await surfaceElement(page, 'plate'))?.label).toContain(spec2.plate);
    await clickElement(page, 'section_s1_identify');
    await clickElement(page, 'ref_s3_selector_rule');
    await clickElement(page, 'section_s2_post_rule');
    await clickElement(page, 'ref_s4_code_table');

    for (const post of spec2.posts) {
      await clickElement(page, `post_${post}`);
    }

    await clickElement(page, `line_${spec2.selector}`);
    await press(page, 'f');
    await page.waitForFunction(
      () =>
        (
          window as unknown as {
            __returnProbe?: { m21: { all_closed: boolean } } | null;
          }
        ).__returnProbe?.m21.all_closed === true,
      undefined,
      { timeout: 5000 },
    );
    rp = await returnProbe(page);
    expect(rp.m21.o2).toMatchObject({
      window: 'closed',
      exit: 'completed',
      applications: 1,
      first_application_correct: true,
      strategy: 'first_correct',
      output_delivery: 'released',
    });
    expect(await itemStatus(page, 'M21')).toBe('completed');
    expect((await validityRecord(page, 'proto_m21_case_o1')).validity).toBe(
      'valid',
    );
    expect((await validityRecord(page, 'proto_m21_case_o2')).validity).toBe(
      'valid',
    );
    await clickElement(page, 'leave');
    await waitSurface(page, false);

    // Independent reproduction from the raw family alone.
    const family = (await eventsByPrefix(
      page,
      'proto_m21_case_',
    )) as unknown as RawGameEvent[];
    const applied = await eventsByType(page, 'proto_m21_case_applied');

    expect(
      applied.map((e) => [meta(e).case, meta(e).index, meta(e).correct]),
    ).toEqual([
      ['o1', 1, false],
      ['o1', 2, true],
      ['o2', 1, true],
    ]);
    expect(
      (await eventsByType(page, 'proto_m21_case_restudy')).map((e) => [
        meta(e).section,
        meta(e).relevant,
      ]),
    ).toEqual([['s4_code_table', true]]);

    const rows = extractItemFeatures('M21', family, {
      finalCoreClosed: false,
      pageLoadIndex: 1,
      reloaded: false,
    });

    expect(rows[0]).toMatchObject({
      feature_id: 'm21_restudy_revisions',
      value: 1,
      numerator: 1,
      denominator: 1,
      disposition: 'observed',
      censored: false,
    });
    expect(rows[0].components).toMatchObject({
      strategies: { o1: 'restudy_and_revise', o2: 'first_correct' },
      first_time_successes: 1,
    });
    expectNoRuntimeErrors(errors);
  });
});
