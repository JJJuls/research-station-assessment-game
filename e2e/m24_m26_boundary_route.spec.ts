/**
 * Station 080 M24 / M26 — the knowledge boundary on the participant route
 * (Unit 12, browser). The yard is reached as `pilot_yard` reaches it; the
 * rig runs to depletion, one pre-knowledge cast, the check (a right first
 * answer — the stage captured), the continuation (two casts, the bench,
 * Finish); the uplink runs to the disconnect, the check (a wrong answer,
 * the explanation captured, Continue, the rotated recheck answered right),
 * the continuation (two retries incl. the first, Post B, the hidden 30 s
 * focused cap); the field sensor post's three loops (exposure for M25);
 * Noor's shift end; Vale's check-in asks the M25 question once both
 * repaired windows are recorded closed (the deferred U4 integration
 * check). Offline reproduction of all three items from the raw families.
 *
 * The deferred M25 browser reload check was attempted here and is a
 * recorded block: after `page.reload()` the journey driver cannot replay
 * the dock tutorial (its scene_start counts include the earlier page
 * load), so the yard is not reachable again in one browser session; the
 * prior-load guard stays covered by the pure `m25_repetition` spec.
 */
import type { Page } from '@playwright/test';
import { expect, test } from '@playwright/test';

import { extractItemFeatures } from '../src/measurement/features';
import { M24_UNDERSTANDING_QUESTION } from '../src/pilot/exterior/m24MagnetRigModel';
import { M26_UNDERSTANDING_QUESTION } from '../src/pilot/exterior/m26ChannelModel';
import type { RawGameEvent } from '../src/systems/EventLogger';
import {
  answerOpenCheck,
  APPROACH,
  continueUplinkExplanation,
  depleteDeck,
  enterYard,
  eventsByPrefix,
  eventsByType,
  exteriorProbe,
  finishAtRig,
  finishOutside,
  itemStatus,
  magnetCycle,
  openSite,
  OPPORTUNITY,
  powerUpUplink,
  standOnPad,
  startSalvageTally,
  transmitAt,
  useSortingBench,
  validityRecord,
  waitContinuationClosed,
  waitDisconnect,
  YARD,
} from './exteriorHelpers';
import { selectPromptOption } from './helpers';
import { captureErrors, expectNoRuntimeErrors } from './journey';
import {
  expectStage,
  interactAt,
  labApproach,
  openPromptAt,
  PILOT,
  useDoor,
  yardApproach,
  yardVia,
} from './pilotHelpers';
import { clickElement, waitSurface } from './returnHelpers';

const ANCHORS = [
  'Not at all normal',
  'Slightly normal',
  'Moderately normal',
  'Very normal',
  'Completely normal',
];

async function promptLabels(page: Page) {
  return page.evaluate(
    () =>
      (
        window as unknown as { __promptCards?: { label: string }[] | null }
      ).__promptCards?.map((card) => card.label) ?? [],
  );
}

async function lastPromptBody(page: Page) {
  return page.evaluate(
    () =>
      (window as unknown as { __lastPromptBody?: string | null })
        .__lastPromptBody ?? '',
  );
}

async function countType(page: Page, type: string) {
  return (await eventsByType(page, type)).length;
}

async function waitCount(
  page: Page,
  type: string,
  wanted: number,
  timeout: number,
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

async function openPost(page: Page) {
  await yardVia(
    page,
    YARD.sensorPost.x + APPROACH.sensorPost.x,
    YARD.sensorPost.y + APPROACH.sensorPost.y,
  );
  await interactAt(page, YARD.sensorPost, {
    approachOffset: APPROACH.sensorPost,
  });
  await waitSurface(page, true, 'm25_field_sensor_post');
}

/** Three required loops by pointer, then the surface closed (the post stays open, exposed). */
async function runRequiredLoops(page: Page) {
  await openPost(page);

  for (let loop = 1; loop <= 3; loop++) {
    await clickElement(page, 'run_loop');
    await waitCount(page, 'proto_m25_loops_loop_completed', loop, 8_000);
  }

  await waitCount(page, 'proto_m25_loops_required_complete', 1, 3_000);
}

/** Yard (return_hub) → Laboratory → Concourse → Vale's prompt (open). */
async function returnToVale(page: Page) {
  await useDoor(page, PILOT.yard.airlock, 'diagnostics_laboratory', {
    approachOffset: await yardApproach(page, PILOT.yard.airlock),
  });
  await useDoor(page, PILOT.lab.southDoor, 'station_concourse', {
    approachOffset: await labApproach(page, PILOT.lab.southDoor),
  });
  await openPromptAt(page, PILOT.concourse.vale, {
    approachOffset: { x: 0, y: 40 },
  });
}

test.describe('M24 / M26 knowledge boundary on the route', () => {
  test('rig: depletion, a pre-knowledge cast, a right first answer, two casts, the bench, Finish; uplink: the disconnect, a wrong answer, the explanation, the rotated recheck, two retries, Post B, the cap; the shift end; Vale asks the M25 question once both windows are recorded closed; reproduced offline', async ({
    page,
  }) => {
    test.setTimeout(900_000);

    const errors = captureErrors(page);

    await enterYard(page, 'm2426');
    expect(await itemStatus(page, 'M24')).toBe('pending');
    expect(await itemStatus(page, 'M26')).toBe('pending');

    // ——— M24 ———
    await startSalvageTally(page);
    await depleteDeck(page);
    await standOnPad(page);
    await magnetCycle(page, true); // pre-knowledge

    let ext = await exteriorProbe(page);

    expect(ext.m24.knowledge).toBe('depleted_untested');
    expect(ext.m24.casts_pre_knowledge).toBe(1);

    // The check IS the rig panel while it is due (the statement + the stem).
    await openSite(page, 'rig');
    await page.waitForFunction(
      (stem) =>
        (
          (window as unknown as { __lastPromptBody?: string | null })
            .__lastPromptBody ?? ''
        ).includes(stem),
      M24_UNDERSTANDING_QUESTION.stem,
      { timeout: 6000 },
    );
    expect(await promptLabels(page)).toEqual(
      M24_UNDERSTANDING_QUESTION.options.map((option) => option.label),
    );
    expect(await lastPromptBody(page)).toContain('CATCHMENT DEPLETED');
    await page.screenshot({ path: 'test-results/m24-check-800x600.png' });
    // (The settle refusal of a carried press is pure-tested: the reads and
    // the screenshot above already outlast the 400 ms window.)
    await answerOpenCheck(page, 'M24', 'correct');
    ext = await exteriorProbe(page);
    expect(ext.m24.knowledge_status).toBe('pass_first');
    expect(ext.m24.continuation_open).toBe(true);

    await standOnPad(page);
    await magnetCycle(page, true);
    await magnetCycle(page, true);
    await useSortingBench(page);
    await finishAtRig(page);
    ext = await exteriorProbe(page);
    expect(ext.m24).toMatchObject({
      window: 'closed',
      exit: 'stopped',
      postknowledge_casts: 2,
      postknowledge_casts_minus_first: 1,
      alternative_used: true,
      exited: true,
      continuation_closure: 'voluntary_stop',
    });
    expect((await validityRecord(page, OPPORTUNITY.m24)).validity).toBe(
      'valid',
    );
    expect(await itemStatus(page, 'M24')).toBe('completed');

    // ——— M26 ———
    await powerUpUplink(page);
    await transmitAt(page, 'uplinkA');
    await waitDisconnect(page);
    // The line panel IS the check too (the longest body — captured).
    await openSite(page, 'panel');
    await page.waitForFunction(
      (stem) =>
        (
          (window as unknown as { __lastPromptBody?: string | null })
            .__lastPromptBody ?? ''
        ).includes(stem),
      M26_UNDERSTANDING_QUESTION.stem,
      { timeout: 6000 },
    );
    expect(await lastPromptBody(page)).toContain('LINE A');
    await page.screenshot({
      path: 'test-results/m26-panel-check-800x600.png',
    });
    await answerOpenCheck(page, 'M26', 'wrong');
    ext = await exteriorProbe(page);
    expect(ext.m26.knowledge).toBe('disconnected_testing');
    await page.waitForFunction(
      (text) =>
        (
          (window as unknown as { __lastPromptBody?: string | null })
            .__lastPromptBody ?? ''
        ).includes(text),
      M26_UNDERSTANDING_QUESTION.explanation,
      { timeout: 6000 },
    );
    expect(await promptLabels(page)).toEqual(['Continue']);
    await page.screenshot({
      path: 'test-results/m26-explanation-800x600.png',
    });
    await continueUplinkExplanation(page);
    // The recheck: the same content, the order rotated (the key last).
    expect(await promptLabels(page)).toEqual([
      M26_UNDERSTANDING_QUESTION.options[2]!.label,
      M26_UNDERSTANDING_QUESTION.options[0]!.label,
      M26_UNDERSTANDING_QUESTION.options[1]!.label,
    ]);
    await answerOpenCheck(page, 'M26', 'correct');
    ext = await exteriorProbe(page);
    expect(ext.m26.knowledge_status).toBe('pass_after_explanation');
    expect(ext.m26.continuation_open).toBe(true);

    await transmitAt(page, 'uplinkA');
    await transmitAt(page, 'uplinkA');
    await transmitAt(page, 'uplinkB');
    ext = await exteriorProbe(page);
    expect(ext.m26.postknowledge_retries).toBe(2);
    expect(ext.m26.alternative_used).toBe(true);
    await waitContinuationClosed(page, 'm26', 45_000);
    ext = await exteriorProbe(page);
    expect(ext.m26).toMatchObject({
      window: 'closed',
      continuation_closure: 'cap',
      cap_reached: true,
      postknowledge_retries: 2,
    });
    expect(await itemStatus(page, 'M26')).toBe('completed');

    // ——— M25 exposure (three required loops), then the shift end ———
    await runRequiredLoops(page);
    await page.keyboard.press('Escape');
    await waitSurface(page, false);
    await finishOutside(page);
    expect(await itemStatus(page, 'M24')).toBe('completed');
    expect(await itemStatus(page, 'M26')).toBe('completed');
    expect(await countType(page, 'proto_m25_belief_question_presented')).toBe(
      0,
    );

    // ——— Vale: the question is due — both repaired windows are recorded closed ———
    await returnToVale(page);
    await selectPromptOption(page, 1);
    await page.waitForTimeout(400);
    await expectStage(page, 'workshop_return');
    expect(await promptLabels(page)).toEqual(ANCHORS);
    await page.waitForTimeout(600);
    await selectPromptOption(page, 3);
    await page.waitForTimeout(400);
    expect(await countType(page, 'proto_m25_belief_question_answered')).toBe(1);
    expect(await itemStatus(page, 'M25')).toBe('completed');

    // ——— offline reproduction ———
    const context = {
      finalCoreClosed: false,
      pageLoadIndex: 1,
      reloaded: false,
    };
    const m24 = extractItemFeatures(
      'M24',
      (await eventsByPrefix(
        page,
        'proto_m24_rig_',
      )) as unknown as RawGameEvent[],
      context,
    );
    const m26 = extractItemFeatures(
      'M26',
      (await eventsByPrefix(
        page,
        'proto_m26_uplink_',
      )) as unknown as RawGameEvent[],
      context,
    );
    const m25 = extractItemFeatures(
      'M25',
      (await eventsByPrefix(page, 'proto_m25_')) as unknown as RawGameEvent[],
      context,
    );

    expect(m24[0]).toMatchObject({
      feature_id: 'm24_postknowledge_casts',
      value: 2,
      disposition: 'observed',
      closure_reason: 'voluntary_stop',
      censored: false,
    });
    expect(m24[1]).toMatchObject({ value: 1, disposition: 'observed' });
    expect(m24[2].value).toMatchObject({
      knowledge_status: 'pass_first',
      casts_pre_knowledge: 1,
      switch: true,
      exit: true,
    });
    expect(m26[0]).toMatchObject({
      feature_id: 'm26_postknowledge_retries',
      value: 2,
      disposition: 'observed',
      closure_reason: 'cap',
      censored: true,
    });
    expect(m26[1]).toMatchObject({ value: 1, disposition: 'observed' });
    expect(m26[2].value).toMatchObject({
      knowledge_status: 'pass_after_explanation',
      explanation_shown: true,
      switch: true,
      cap: true,
    });
    expect(m25[1]).toMatchObject({
      feature_id: 'm25_normality_belief',
      value: 3,
      disposition: 'observed',
    });
    expectNoRuntimeErrors(errors);
  });
});
