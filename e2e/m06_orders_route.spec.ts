/**
 * Station 080 M06 — twelve orders in one 60-second focused work budget on
 * the participant route (Unit 7, browser). Real navigation from the Dock
 * to the Records Workshop, real pointer AND keyboard input on the console.
 *
 * Test 1 (work, correction, skip, pause, explicit stop): the Work Order
 * Board's "Take the orders." presents the console; the two practice lines
 * are composed by pointer and dispatched; the ready screen's Begin (B, by
 * keyboard) starts the budget and presents order 1; order 1 is sent
 * correctly (tokens by pointer, dispatch by D), order 2 first wrongly
 * (stays for correction) then correctly, order 3 is skipped (K); ESC
 * pauses the budget (the time left does not move while the console is
 * closed) and the reopen resumes it; Stop work (F) closes the period as
 * an explicit stop with the count as it stands and the budget kept as
 * the denominator; the raw family reproduces the row through the
 * read-only extractor; the sign-off never depends on the console.
 *
 * Test 2 (budget end by inaction): after the practice and Begin, no press
 * for a minute — the wall-clock tick closes the period at 60 focused
 * seconds as `budget` with an observed 0 (the period was begun), never a
 * missing value.
 *
 * No participant-visible study identifier anywhere.
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
  concourseToWorkshop,
  dockToConcourse,
  expectStage,
  interactAt,
  openPromptAt,
  PILOT,
  registryApproach,
  valeHandover,
  workshopVia,
} from './pilotHelpers';
import { clickElement, surface, waitSurface } from './returnHelpers';

const CONSOLE = registryApproach('workshop.dispatch_console');

async function countType(page: Page, type: string) {
  return (await eventsByType(page, type)).length;
}

async function waitType(
  page: Page,
  type: string,
  wanted: number,
  timeout: number,
) {
  const until = Date.now() + timeout;

  while (Date.now() < until) {
    if ((await countType(page, type)) >= wanted) {
      return;
    }

    await page.waitForTimeout(200);
  }

  throw new Error(
    `timed out waiting for ${wanted} × ${type} (have ${await countType(page, type)})`,
  );
}

async function elementLabel(page: Page, id: string): Promise<string> {
  const probe = await surface(page);

  return probe?.elements.find((e) => e.id === id)?.label ?? '';
}

/** The three tokens of the current order, read from the surface readout. */
async function currentOrderTokens(page: Page): Promise<string[]> {
  const label = await elementLabel(page, 'order');
  const match = /·\s+(.+)$/.exec(label);

  if (match === null) {
    throw new Error(`no order readout (label "${label}")`);
  }

  return match[1].trim().split(/\s+/);
}

async function timeLeftSeconds(page: Page): Promise<number> {
  const label = await elementLabel(page, 'time_left');
  const match = /TIME LEFT:\s+(\d+)/.exec(label);

  return match === null ? NaN : Number(match[1]);
}

async function composeByPointer(page: Page, tokens: readonly string[]) {
  for (const token of tokens) {
    await clickElement(page, `token_${token}`);
  }
}

async function openConsole(page: Page) {
  await workshopVia(page, CONSOLE.x, CONSOLE.y);
  await interactAt(page, CONSOLE, { approachOffset: { x: 0, y: 0 } });
  await waitSurface(page, true, 'm06_dispatch_console');
}

/** Dock → Workshop, the orders taken (M06 presented), the console open on practice. */
async function toConsolePractice(page: Page, tag: string) {
  await bootPilot(page, tag);
  await completeDockTutorial(page, 1);
  await dockToConcourse(page);
  await valeHandover(page);
  await concourseToWorkshop(page);
  await workshopVia(page, 1312, 178);
  await openPromptAt(page, PILOT.workshop.board, {
    approachOffset: { x: -32, y: 38 },
  });
  await selectPromptOption(page, 1); // Take the orders.
  await expectStage(page, 'workshop_work');
  expect(await countType(page, 'proto_m06_orders_presented')).toBe(1);
  await openConsole(page);

  const opened = await surface(page);

  expect(opened?.title).toBe('DISPATCH CONSOLE — ROUTINE ORDERS');
  expect(`${opened?.title}\n${opened?.status}`).not.toMatch(FORBIDDEN_TEXT);
  expect(await itemStatus(page, 'M06')).toBe('open');
}

/** The two practice lines by pointer, then the ready screen. */
async function passPractice(page: Page) {
  await composeByPointer(page, ['OPEN', 'VALVE-C', 'AUTO']);
  await clickElement(page, 'dispatch');
  await waitType(page, 'proto_m06_orders_practice_dispatched', 1, 3_000);
  await composeByPointer(page, ['HOLD', 'BUS-1', 'LOW']);
  await clickElement(page, 'dispatch');
  await waitType(page, 'proto_m06_orders_practice_passed', 1, 3_000);
  await waitType(page, 'proto_m06_orders_ready_shown', 1, 3_000);
  await page.waitForTimeout(300);
  expect((await surface(page))?.elements.map((e) => e.id)).toContain('begin');
  expect(await countType(page, 'proto_m06_orders_period_begun')).toBe(0);
}

test.describe('M06 timed work period on the route', () => {
  test('practice by pointer, Begin by keyboard, a correct order, a corrected order, a skipped order, a pause that holds the budget, an explicit stop; reproduced count with the 60 s denominator', async ({
    page,
  }) => {
    test.setTimeout(900_000);

    const errors = captureErrors(page);

    await toConsolePractice(page, 'm06a');
    await passPractice(page);

    // Begin by keyboard past the settle window: the budget starts, order 1 shows.
    await page.waitForTimeout(450);
    await page.keyboard.press('b');
    await waitType(page, 'proto_m06_orders_period_begun', 1, 3_000);
    await waitType(page, 'proto_m06_orders_order_presented', 1, 3_000);
    await page.waitForTimeout(300);

    const work = await surface(page);

    expect(work?.elements.map((e) => e.id)).toEqual(
      expect.arrayContaining([
        'order',
        'tally',
        'time_left',
        'dispatch',
        'skip',
        'stop',
      ]),
    );
    expect(`${work?.status}\n${work?.help}`).not.toMatch(FORBIDDEN_TEXT);
    await page.screenshot({ path: 'test-results/m06-work-800x600.png' });

    // Order 1 correctly: tokens by pointer, dispatch by keyboard.
    const first = await currentOrderTokens(page);

    await composeByPointer(page, first);
    await page.keyboard.press('d');
    await waitType(page, 'proto_m06_orders_order_dispatched', 1, 3_000);
    expect(
      (await eventsByType(page, 'proto_m06_orders_order_dispatched'))[0]
        ?.metadata,
    ).toMatchObject({
      order_index: 0,
      correct: true,
      attempt: 1,
      within_budget: true,
      unique_correct_orders: 1,
    });
    await page.waitForTimeout(300);
    expect(await elementLabel(page, 'tally')).toBe('SENT CORRECTLY: 1');

    // Order 2 wrongly first (a different VALUE), then corrected.
    const second = await currentOrderTokens(page);
    const wrongValue = ['LOW', 'HIGH', 'AUTO', 'OFF'].find(
      (value) => value !== second[2],
    )!;

    await composeByPointer(page, [second[0], second[1], wrongValue]);
    await clickElement(page, 'dispatch');
    await waitType(page, 'proto_m06_orders_order_dispatched', 2, 3_000);
    expect(
      (await eventsByType(page, 'proto_m06_orders_order_dispatched'))[1]
        ?.metadata,
    ).toMatchObject({ order_index: 1, correct: false, attempt: 1 });
    await page.waitForTimeout(300);
    expect(await elementLabel(page, 'order')).toContain('ORDER 2 of 12'); // stays
    expect(await elementLabel(page, 'tally')).toBe('SENT CORRECTLY: 1');
    await composeByPointer(page, second);
    await clickElement(page, 'dispatch');
    await waitType(page, 'proto_m06_orders_order_dispatched', 3, 3_000);
    expect(
      (await eventsByType(page, 'proto_m06_orders_order_dispatched'))[2]
        ?.metadata,
    ).toMatchObject({
      order_index: 1,
      correct: true,
      attempt: 2,
      unique_correct_orders: 2,
    });

    // Order 3 skipped by keyboard — past the order's settle window.
    await page.waitForTimeout(500);
    expect(await elementLabel(page, 'order')).toContain('ORDER 3 of 12');
    await page.keyboard.press('k');
    await waitType(page, 'proto_m06_orders_order_skipped', 1, 3_000);
    await page.waitForTimeout(300);
    expect(await elementLabel(page, 'order')).toContain('ORDER 4 of 12');
    expect(await elementLabel(page, 'tally')).toBe('SENT CORRECTLY: 2');

    // Order 4 composed by keyboard alone: the digit hotkeys of the active
    // row (1–4) and D — the same cost as four pointer clicks.
    const fourth = await currentOrderTokens(page);
    const tokenRows: readonly (readonly string[])[] = [
      ['SET', 'OPEN', 'HOLD', 'ROUTE'],
      ['PUMP-2', 'VALVE-C', 'BUS-1', 'RELAY-N'],
      ['LOW', 'HIGH', 'AUTO', 'OFF'],
    ];

    for (const [rowIndex, token] of fourth.entries()) {
      await page.keyboard.press(`${tokenRows[rowIndex].indexOf(token) + 1}`);
      await page.waitForTimeout(150);
    }

    expect(await elementLabel(page, 'buffer')).toBe(
      `BUFFER: ${fourth.join('  ')}`,
    );
    await page.keyboard.press('d');
    await waitType(page, 'proto_m06_orders_order_dispatched', 4, 3_000);
    expect(
      (await eventsByType(page, 'proto_m06_orders_order_dispatched'))[3]
        ?.metadata,
    ).toMatchObject({
      order_index: 3,
      correct: true,
      input_mode: 'keyboard',
      unique_correct_orders: 3,
    });
    await page.waitForTimeout(300);
    expect(await elementLabel(page, 'order')).toContain('ORDER 5 of 12');

    // ESC pauses the budget: the time left does not move while closed
    // (the reopen walk and the probe reads spend focused time, so the
    // tolerance is a small fraction of the closed interval).
    const leftBefore = await timeLeftSeconds(page);

    await page.keyboard.press('Escape');
    await waitSurface(page, false);
    await waitType(page, 'proto_m06_orders_surface_closed', 1, 3_000);
    expect(await itemStatus(page, 'M06')).toBe('open');
    await page.waitForTimeout(8_000);
    await openConsole(page);
    await waitType(page, 'proto_m06_orders_surface_reopened', 1, 3_000);
    await page.waitForTimeout(300);

    const leftAfter = await timeLeftSeconds(page);

    expect(leftBefore - leftAfter).toBeLessThanOrEqual(3);
    expect(await elementLabel(page, 'order')).toContain('ORDER 5 of 12');
    expect(
      (await eventsByType(page, 'proto_m06_orders_surface_reopened'))[0]
        ?.metadata,
    ).toMatchObject({ stage: 'workshop_work', resumptions: 1 });

    // Explicit stop: two presses (the first arms, the second confirms).
    await page.keyboard.press('q');
    await waitType(page, 'proto_m06_orders_stop_armed', 1, 3_000);
    await page.waitForTimeout(300);
    expect(await elementLabel(page, 'stop')).toContain('Confirm stop');
    expect(await countType(page, 'proto_m06_orders_period_ended')).toBe(0);
    await page.keyboard.press('q');
    await waitType(page, 'proto_m06_orders_period_ended', 1, 3_000);
    await waitType(page, 'proto_m06_orders_window_closed', 1, 3_000);

    const closed = (
      await eventsByType(page, 'proto_m06_orders_window_closed')
    )[0];
    const raw = closed?.metadata?.raw_components as Record<string, unknown>;

    expect(closed?.metadata?.exit_state).toBe('stopped');
    expect(raw).toMatchObject({
      period_begun: true,
      budget_ms: 60_000,
      unique_correct_orders: 3,
      orders_handled: 4,
      orders_attempted: 3,
      first_pass_correct: 2,
      rework_dispatches: 1,
      invalid_dispatches: 1,
      orders_skipped: 1,
      stop_kind: 'explicit',
      stop_arm_presses: 1,
      closure_reason: 'voluntary_stop',
      // Order 1 and order 4 were dispatched with the D key, orders 2 (twice)
      // by the pointer: the dispatch press's mode is what is recorded.
      dispatch_input_modes: { pointer: 2, keyboard: 2, system: 0 },
    });
    expect(raw.actual_stop_focused_ms as number).toBeLessThan(60_000);
    // The pause held the budget: wall time exceeds focused time by the closure.
    expect(
      (raw.wall_ms as number) - (raw.focused_ms as number),
    ).toBeGreaterThan(7_000);
    expect(
      (raw.excluded_ms as Record<string, number>).surface_closed,
    ).toBeGreaterThan(7_000);
    expect((await validityRecord(page, 'proto_m06_work_period')).validity).toBe(
      'valid',
    );
    expect(await itemStatus(page, 'M06')).toBe('completed');
    expect((await surface(page))?.status).not.toMatch(FORBIDDEN_TEXT);
    await page.keyboard.press('Escape');
    await waitSurface(page, false);

    // The sign-off never depended on the console.
    await workshopVia(page, 1312, 178);
    await openPromptAt(page, PILOT.workshop.board, {
      approachOffset: { x: -32, y: 38 },
    });
    await selectPromptOption(page, 1);
    await expectStage(page, 'lab_briefing');

    // Independent reproduction from the raw family alone.
    const family = (await eventsByPrefix(
      page,
      'proto_m06_orders_',
    )) as unknown as RawGameEvent[];
    const rows = extractItemFeatures('M06', family, {
      finalCoreClosed: false,
      pageLoadIndex: 1,
      reloaded: false,
    });

    expect(rows[0]).toMatchObject({
      feature_id: 'm06_unique_correct_orders',
      value: 3,
      numerator: 3,
      disposition: 'observed',
      closure_reason: 'voluntary_stop',
      censored: false,
      independence: 'single_episode',
    });
    expect(rows[0].components).toMatchObject({
      stop_kind: 'explicit',
      budget_ms: 60_000,
      recount_agrees: true,
      dispatch_input_modes: { pointer: 2, keyboard: 2, system: 0 },
    });
    expect(rows[1].value).toMatchObject({
      rework_dispatches: 1,
      orders_skipped: 1,
      first_pass_accuracy: 2 / 3,
    });
    expect(JSON.stringify(rows[0])).not.toMatch(/per_second|speed/i);
    expectNoRuntimeErrors(errors);
  });

  test('budget end by inaction: the period closes at 60 focused seconds as `budget` with an observed zero', async ({
    page,
  }) => {
    test.setTimeout(900_000);

    const errors = captureErrors(page);

    await toConsolePractice(page, 'm06b');
    await passPractice(page);
    await page.waitForTimeout(450);
    await clickElement(page, 'begin');
    await waitType(page, 'proto_m06_orders_period_begun', 1, 3_000);
    await page.waitForTimeout(500);
    expect(await timeLeftSeconds(page)).toBeGreaterThanOrEqual(58);
    await page.waitForTimeout(61_000);
    await waitType(page, 'proto_m06_orders_period_ended', 1, 10_000);

    const ended = (await eventsByType(page, 'proto_m06_orders_period_ended'))[0]
      ?.metadata as { stop_kind: string; unique_correct_orders: number };

    expect(ended.stop_kind).toBe('budget');
    expect(ended.unique_correct_orders).toBe(0);
    await waitType(page, 'proto_m06_orders_window_closed', 1, 3_000);

    const raw = (await eventsByType(page, 'proto_m06_orders_window_closed'))[0]
      ?.metadata?.raw_components as Record<string, unknown>;

    expect(raw).toMatchObject({
      stop_kind: 'budget',
      unique_correct_orders: 0,
      orders_handled: 0,
      actual_stop_focused_ms: 60_000,
      closure_reason: 'completed',
    });
    expect(await itemStatus(page, 'M06')).toBe('completed');
    await page.waitForTimeout(300);
    expect(await elementLabel(page, 'summary')).toContain('0 of 12');

    const family = (await eventsByPrefix(
      page,
      'proto_m06_orders_',
    )) as unknown as RawGameEvent[];
    const rows = extractItemFeatures('M06', family, {
      finalCoreClosed: false,
      pageLoadIndex: 1,
      reloaded: false,
    });

    expect(rows[0]).toMatchObject({
      value: 0,
      disposition: 'observed',
      closure_reason: 'completed',
      censored: false,
    });
    expect(rows[0].components).toMatchObject({ stop_kind: 'budget' });
    expectNoRuntimeErrors(errors);
  });
});
