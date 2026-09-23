/**
 * Station 080 M25 — calibration loops and Vale's normality question on the
 * participant route (Unit 4, browser). Real navigation from the Dock to
 * the Recovery Yard, real pointer AND keyboard input on the work surface
 * and on the prompt cards.
 *
 * Test 1 (repeater): the post is presented by Noor's briefing; three
 * required loops (pointer, keyboard, pointer) — a second click and a held
 * key while a loop runs start nothing; ESC mid-loop pauses the loop (no
 * unattended completion) and the reopen finishes it; completion is marked;
 * "Run more loops" (keyboard) enters the optional phase; two optional
 * loops complete; "Finished" closes the window as an explicit stop with 2
 * repeats; the shift end leaves the closed window untouched; back inside,
 * Vale's return acknowledgement is followed by the question with exactly
 * the five anchors (captured at 800×600); option 4 is the immutable answer;
 * a second visit never re-asks; the exported raw families reproduce both
 * feature rows through the read-only extractor.
 *
 * Test 2 (stopper by inaction under the cap): three loops, "Run more
 * loops", then no press for 30 focused seconds — the wall-clock tick closes
 * the window as `cap` with 0 repeats; Vale still asks (stoppers and
 * repeaters alike); option 2 answered by keyboard.
 *
 * No participant-visible study identifier anywhere.
 */
import type { Page } from '@playwright/test';
import { expect, test } from '@playwright/test';

import { extractItemFeatures } from '../src/measurement/features';
import type { RawGameEvent } from '../src/systems/EventLogger';
import {
  APPROACH,
  enterYard,
  eventsByPrefix,
  eventsByType,
  finishOutside,
  FORBIDDEN_TEXT,
  itemStatus,
  validityRecord,
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
import { clickElement, surface, waitSurface } from './returnHelpers';

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

async function elementLabel(page: Page, id: string): Promise<string> {
  const probe = await surface(page);

  return probe?.elements.find((e) => e.id === id)?.label ?? '';
}

async function waitElement(page: Page, id: string, timeout: number) {
  await page.waitForFunction(
    (wanted) =>
      (
        window as unknown as {
          __workSurfaceProbe?: { elements: { id: string }[] } | null;
        }
      ).__workSurfaceProbe?.elements.some((e) => e.id === wanted) === true,
    id,
    { timeout },
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

  const probe = await surface(page);
  const tail = (await eventsByPrefix(page, 'proto_m25_'))
    .slice(-8)
    .map((e) => `${e.event_type} ${JSON.stringify(e.metadata ?? {})}`);

  // eslint-disable-next-line no-console
  console.log(
    `[m25 waitCount ${type}=${wanted}] surface=${JSON.stringify(probe)}\n${tail.join('\n')}`,
  );
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

test.describe('M25 field sensor post and Vale question on the route', () => {
  test('presented by the briefing, three required loops (pointer + keyboard, no double start), ESC pause, completion marked, two optional loops, explicit stop, the question after the shift with exactly five anchors, immutable answer, reproduced features', async ({
    page,
  }) => {
    test.setTimeout(600_000);

    const errors = captureErrors(page);

    await enterYard(page, 'm25');
    expect(await itemStatus(page, 'M25')).toBe('pending');
    expect(await countType(page, 'proto_m25_loops_presented')).toBe(1);

    // Layout evidence (review U4 F1): the post must be VISIBLE on the field.
    await yardVia(
      page,
      YARD.sensorPost.x + APPROACH.sensorPost.x,
      YARD.sensorPost.y + APPROACH.sensorPost.y,
    );
    await page.screenshot({ path: 'test-results/m25-post-800x600.png' });
    await openPost(page);

    const opened = await surface(page);

    expect(opened?.title).not.toMatch(FORBIDDEN_TEXT);
    expect(opened?.status).not.toMatch(FORBIDDEN_TEXT);
    expect(await elementLabel(page, 'loops')).toBe('SWEEP 1 / 3');

    // Loop 1 by pointer; a second click and a held key while it runs
    // start nothing.
    await clickElement(page, 'run_loop');
    await page.waitForTimeout(300);
    await clickElement(page, 'run_loop');
    await page.keyboard.down('r');
    await page.waitForTimeout(600);
    await page.keyboard.up('r');
    await waitCount(page, 'proto_m25_loops_loop_completed', 1, 8_000);
    expect(await countType(page, 'proto_m25_loops_loop_started')).toBe(1);

    // Loop 2 by keyboard.
    await page.keyboard.press('r');
    await waitCount(page, 'proto_m25_loops_loop_completed', 2, 8_000);
    expect(await countType(page, 'proto_m25_loops_loop_started')).toBe(2);

    // Loop 3: ESC mid-loop pauses it; the loop must not complete while the
    // post is closed; the reopen finishes it and marks completion.
    await clickElement(page, 'run_loop');
    await page.waitForTimeout(1_000);
    await page.keyboard.press('Escape');
    await waitSurface(page, false);
    expect(await countType(page, 'proto_m25_loops_surface_closed')).toBe(1);
    await page.waitForTimeout(4_000);
    expect(await countType(page, 'proto_m25_loops_loop_completed')).toBe(2);
    await openPost(page);
    expect(await countType(page, 'proto_m25_loops_surface_reopened')).toBe(1);
    await waitCount(page, 'proto_m25_loops_loop_completed', 3, 8_000);
    await waitCount(page, 'proto_m25_loops_required_complete', 1, 3_000);
    await waitElement(page, 'more_loops', 3_000);
    expect(await elementLabel(page, 'loops')).toBe('SENSOR CHECK COMPLETE');
    expect(await elementLabel(page, 'run_loop')).toBe('');

    const third = (
      await eventsByType(page, 'proto_m25_loops_loop_completed')
    )[2];

    expect(third?.metadata?.focused_ms as number).toBeGreaterThanOrEqual(3_000);
    expect(third?.metadata?.focused_ms as number).toBeLessThan(3_700);
    expect(
      (third?.metadata?.wall_ms as number) -
        (third?.metadata?.focused_ms as number),
    ).toBeGreaterThanOrEqual(3_500);

    // "Run more sweeps" by keyboard enters the optional phase (after the
    // completion screen's settle window).
    await page.waitForTimeout(600);
    await page.keyboard.press('c');
    await waitCount(page, 'proto_m25_loops_optional_entered', 1, 3_000);
    await waitElement(page, 'run_loop', 3_000);
    expect(
      (await eventsByType(page, 'proto_m25_loops_optional_entered'))[0]
        ?.metadata?.input_mode,
    ).toBe('keyboard');

    await clickElement(page, 'run_loop');
    await waitCount(page, 'proto_m25_loops_loop_completed', 4, 8_000);
    await page.keyboard.press('r');
    await waitCount(page, 'proto_m25_loops_loop_completed', 5, 8_000);

    const completed = await eventsByType(
      page,
      'proto_m25_loops_loop_completed',
    );

    expect(completed.map((e) => e.metadata?.kind)).toEqual([
      'required',
      'required',
      'required',
      'optional',
      'optional',
    ]);

    // Explicit stop.
    await clickElement(page, 'finished');
    await waitCount(page, 'proto_m25_loops_window_closed', 1, 3_000);

    const closed = (
      await eventsByType(page, 'proto_m25_loops_window_closed')
    )[0];
    const raw = closed?.metadata?.raw_components as Record<string, unknown>;

    expect(closed?.metadata?.exit_state).toBe('stopped');
    expect(raw).toMatchObject({
      required_loops_completed: 3,
      optional_repeats_completed: 2,
      optional_loops_started: 2,
      stop_kind: 'explicit',
      cap_reached: false,
      closure_reason: 'voluntary_stop',
    });
    expect(
      (await validityRecord(page, 'proto_m25_calibration_loops')).validity,
    ).toBe('valid');
    expect(await elementLabel(page, 'loops')).toBe('SENSOR CHECK COMPLETE');
    expect((await surface(page))?.status).not.toMatch(FORBIDDEN_TEXT);

    await page.keyboard.press('Escape');
    await waitSurface(page, false);

    // The shift end leaves the closed window untouched; no question yet.
    await finishOutside(page);
    expect(await countType(page, 'proto_m25_loops_window_closed')).toBe(1);
    expect(await countType(page, 'proto_m25_belief_question_presented')).toBe(
      0,
    );

    // Vale's return check-in: the acknowledgement, then the question.
    await returnToVale(page);
    expect(await lastPromptBody(page)).not.toMatch(FORBIDDEN_TEXT);
    await selectPromptOption(page, 1);
    await page.waitForTimeout(400);
    await expectStage(page, 'workshop_return');
    expect(await promptLabels(page)).toEqual(ANCHORS);

    const body = await lastPromptBody(page);

    expect(body).toContain(
      'Do you think redoing the same task over and over is normal?',
    );
    expect(body).not.toMatch(FORBIDDEN_TEXT);
    expect(await countType(page, 'proto_m25_belief_question_presented')).toBe(
      1,
    );
    await page.screenshot({ path: 'test-results/m25-question-800x600.png' });
    await page.waitForTimeout(600);
    await selectPromptOption(page, 4);
    await page.waitForTimeout(400);

    const answered = await eventsByType(
      page,
      'proto_m25_belief_question_answered',
    );

    expect(answered).toHaveLength(1);
    expect(answered[0]?.metadata).toMatchObject({
      value: 4,
      label: 'Very normal',
      option_position: 4,
      option_count: 5,
    });
    expect(
      (await validityRecord(page, 'proto_m25_normality_belief')).validity,
    ).toBe('valid');
    expect(await itemStatus(page, 'M25')).toBe('completed');

    // A second visit never re-asks.
    await openPromptAt(page, PILOT.concourse.vale, {
      approachOffset: { x: 0, y: 40 },
    });
    await selectPromptOption(page, 1);
    await page.waitForTimeout(400);
    expect(await promptLabels(page)).not.toEqual(ANCHORS);
    expect(await countType(page, 'proto_m25_belief_question_presented')).toBe(
      1,
    );

    // Independent reproduction from the raw families alone.
    const family = (await eventsByPrefix(
      page,
      'proto_m25_',
    )) as unknown as RawGameEvent[];
    const rows = extractItemFeatures('M25', family, {
      finalCoreClosed: false,
      pageLoadIndex: 1,
      reloaded: false,
    });

    expect(rows[0]).toMatchObject({
      feature_id: 'm25_optional_repeats',
      value: 2,
      disposition: 'observed',
      closure_reason: 'voluntary_stop',
      censored: false,
      coverage_label: 'hybrid',
      independence: 'single_episode',
    });
    expect(rows[1]).toMatchObject({
      feature_id: 'm25_normality_belief',
      value: 4,
      disposition: 'observed',
    });
    expectNoRuntimeErrors(errors);
  });

  test('stopper by inaction: the optional window closes at the focused cap with zero repeats while the post stays open; Vale still asks; keyboard answer', async ({
    page,
  }) => {
    test.setTimeout(600_000);

    const errors = captureErrors(page);

    await enterYard(page, 'm25cap');
    await openPost(page);

    for (let loop = 1; loop <= 3; loop += 1) {
      await page.keyboard.press('r');
      await waitCount(page, 'proto_m25_loops_loop_completed', loop, 8_000);
    }

    await waitElement(page, 'more_loops', 3_000);
    await page.waitForTimeout(600);
    await clickElement(page, 'more_loops');
    await waitElement(page, 'run_loop', 3_000);

    // No press: the wall-clock tick must carry the window to its cap.
    await waitCount(page, 'proto_m25_loops_cap_reached', 1, 45_000);
    await waitCount(page, 'proto_m25_loops_window_closed', 1, 3_000);

    const closed = (
      await eventsByType(page, 'proto_m25_loops_window_closed')
    )[0];
    const raw = closed?.metadata?.raw_components as Record<string, unknown>;

    expect(raw).toMatchObject({
      optional_repeats_completed: 0,
      optional_loops_started: 0,
      cap_reached: true,
      stop_kind: 'cap',
      closure_reason: 'cap',
    });
    expect(raw.repeat_focused_ms as number).toBeGreaterThanOrEqual(30_000);
    expect(raw.repeat_focused_ms as number).toBeLessThan(30_700);
    expect((await surface(page))?.status).toContain('closed its sweep input');

    await page.keyboard.press('Escape');
    await waitSurface(page, false);
    await finishOutside(page);
    await returnToVale(page);
    await selectPromptOption(page, 1);
    await page.waitForTimeout(400);
    expect(await promptLabels(page)).toEqual(ANCHORS);
    await page.waitForTimeout(600);
    await page.keyboard.press('2');
    await page.waitForTimeout(400);

    const answered = await eventsByType(
      page,
      'proto_m25_belief_question_answered',
    );

    expect(answered).toHaveLength(1);
    expect(answered[0]?.metadata?.value).toBe(2);

    const family = (await eventsByPrefix(
      page,
      'proto_m25_',
    )) as unknown as RawGameEvent[];
    const rows = extractItemFeatures('M25', family, {
      finalCoreClosed: false,
      pageLoadIndex: 1,
      reloaded: false,
    });

    expect(rows[0]).toMatchObject({
      value: 0,
      disposition: 'observed',
      closure_reason: 'cap',
      censored: true,
    });
    expect(rows[1]).toMatchObject({ value: 2, disposition: 'observed' });
    expectNoRuntimeErrors(errors);
  });
});
