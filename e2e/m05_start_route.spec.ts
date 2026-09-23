/**
 * Station 080 M05 — two explicitly accepted extra jobs on the participant
 * route (Unit 6, browser). Real navigation from the Dock, real pointer AND
 * keyboard input on the prompt cards and the job surfaces.
 *
 * Test 1 (accept → start; accept → defer → late start): Vale's handover
 * chain ends with the lamp-job offer (a press carried straight into the
 * stage is refused and the stage re-presented; a deliberate press accepts);
 * the clock becomes eligible once the chain closes; time on the M01 plan
 * board (a competing surface) is EXCLUDED from the focused latency; the
 * lamp surface's "Start the job" records the start (focused < wall,
 * excluded time by cause) and the 2 s work cycle completes the window.
 * Noor's "Ready" is followed by the flag-job offer (accepted); "Not now"
 * closes that occasion as deferred; a later "Start" is a late start that
 * never rewrites it; the shift end leaves the closed records untouched;
 * the exported raw family reproduces both rows through the read-only
 * extractor (started beside deferred, no mean).
 *
 * Test 2 (decline; accept → cap by inaction): the lamp job is declined —
 * the lamp then reads steady and opens no surface (outside the set); the
 * flag job is accepted and the participant does nothing for a minute —
 * the 60 s FOCUSED cap closes the occasion as `cap` (censored, latency
 * null, no `started` event); the flag surface still offers a (late)
 * start afterwards without a "Not now"; the reproduced row shows the
 * declined occasion outside the set beside the censored non-start.
 *
 * No participant-visible study identifier anywhere.
 */
import type { Page } from '@playwright/test';
import { expect, test } from '@playwright/test';

import { extractItemFeatures } from '../src/measurement/features';
import type { RawGameEvent } from '../src/systems/EventLogger';
import {
  APPROACH,
  ensureOutsideCompound,
  eventsByPrefix,
  eventsByType,
  finishOutside,
  FORBIDDEN_TEXT,
  itemStatus,
  validityRecord,
  YARD,
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
  labApproach,
  openPromptAt,
  PILOT,
  press,
  registryApproach,
  useDoor,
  workshopSignOff,
  workshopToConcourse,
  yardApproach,
} from './pilotHelpers';
import { clickElement, surface, waitSurface } from './returnHelpers';

const LAMP_LABELS = [
  'Yes — I will take the lamp job.',
  'No — leave the lamp job.',
];
const FLAG_LABELS = [
  'Yes — I will take the flag job.',
  'No — leave the flag job.',
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

async function lastFeedback(page: Page) {
  return page.evaluate(
    () =>
      (window as unknown as { __lastRoomFeedbackText?: string | null })
        .__lastRoomFeedbackText ?? '',
  );
}

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

function occasionEvents(
  events: { metadata?: Record<string, unknown> }[],
  occasion: string,
) {
  return events.filter((event) => event.metadata?.occasion === occasion);
}

/** Vale's chain with both offers deferred, up to (not including) the lamp-job stage. */
async function valeChainToLampOffer(page: Page) {
  await openPromptAt(page, PILOT.concourse.vale, {
    approachOffset: { x: 0, y: 56 },
  });
  await selectPromptOption(page, 1);
  await expectStage(page, 'incident_handover');
  await page.waitForTimeout(400);
  await selectPromptOption(page, 3); // watch offer: ask me later
  await page.waitForTimeout(400);
  await selectPromptOption(page, 3); // delivery offer: ask me later
}

/** Kai "done", airlock, Noor's "Ready" — stopping at the flag-job stage. */
async function labToNoorFlagOffer(page: Page) {
  await openPromptAt(page, PILOT.lab.kai, {
    approachOffset: await labApproach(page, PILOT.lab.kai),
  });
  await selectPromptOption(page, 1);
  await expectStage(page, 'exterior_briefing');
  await useDoor(page, PILOT.lab.airlock, 'exterior_recovery_yard', {
    approachOffset: await labApproach(page, PILOT.lab.airlock),
  });
  await openPromptAt(page, PILOT.yard.noor, {
    approachOffset: await yardApproach(page, PILOT.yard.noor),
  });
  await selectPromptOption(page, 1); // Ready.
  await expectStage(page, 'exterior_work');
  await page.waitForTimeout(450);
  expect(await promptLabels(page)).toEqual(FLAG_LABELS);
  expect(await lastPromptBody(page)).not.toMatch(FORBIDDEN_TEXT);
}

async function openFlagSurface(page: Page) {
  await ensureOutsideCompound(page);
  await interactAt(page, YARD.flag, { approachOffset: APPROACH.flag });
  await waitSurface(page, true, 'm05_flag_job');
}

test.describe('M05 accepted extra jobs on the route', () => {
  test('lamp job accepted (carried press refused), clock excludes time on the plan board, pointer start with the 2 s work; flag job accepted then deferred, late start recorded beside; both rows reproduced', async ({
    page,
  }) => {
    test.setTimeout(900_000);

    const errors = captureErrors(page);

    await bootPilot(page, 'm05a');
    await completeDockTutorial(page, 1);
    await dockToConcourse(page);
    await valeChainToLampOffer(page);

    expect(await promptLabels(page)).toEqual(LAMP_LABELS);
    expect(await lastPromptBody(page)).not.toMatch(FORBIDDEN_TEXT);
    expect(await countType(page, 'proto_m05_start_presented')).toBe(1);
    // A single key press carried straight into the new stage: inside the
    // 400 ms settle window it is refused and the stage re-presented; the
    // driver's round trip can also land it past the window, in which case
    // it is a read acceptance (the refusal itself is proven
    // deterministically by the pure spec). Either way exactly one answer
    // is ever recorded.
    await press(page, '1');
    await page.waitForTimeout(150);

    const refused = await countType(
      page,
      'proto_m05_start_offer_press_refused',
    );

    expect(refused).toBeLessThanOrEqual(1);

    if ((await countType(page, 'proto_m05_start_offer_answered')) === 0) {
      expect(refused).toBe(1);
      expect(await promptLabels(page)).toEqual(LAMP_LABELS);
      await page.waitForTimeout(450);
      await selectPromptOption(page, 1); // a deliberate acceptance
    }

    await waitType(page, 'proto_m05_start_offer_answered', 1, 3_000);
    expect(await countType(page, 'proto_m05_start_offer_answered')).toBe(1);
    expect(
      (await eventsByType(page, 'proto_m05_start_offer_answered'))[0]?.metadata,
    ).toMatchObject({ occasion: 'o1', accepted: true, option_position: 1 });
    expect(await countType(page, 'proto_m05_start_opportunity_opened')).toBe(1);
    // The chain has closed: the start control is usable — the clock runs.
    await waitType(page, 'proto_m05_start_eligible', 1, 5_000);
    expect(await itemStatus(page, 'M05')).toBe('pending');

    // A competing surface (the M01 plan board) pauses the clock.
    await interactAt(page, registryApproach('concourse.plan_board'), {
      approachOffset: { x: 0, y: 0 },
    });
    await waitSurface(page, true, 'm01_plan_board');
    await page.waitForTimeout(1_500);
    await page.keyboard.press('Escape');
    await waitSurface(page, false);

    // The lamp: the job surface with its start control.
    await interactAt(page, registryApproach('concourse.reading_desk_lamp'), {
      approachOffset: { x: 0, y: 0 },
    });
    await waitSurface(page, true, 'm05_lamp_job');

    const lamp = await surface(page);

    expect(lamp?.title).toBe('READING-DESK LAMP');
    expect(`${lamp?.title}\n${lamp?.status}`).not.toMatch(FORBIDDEN_TEXT);
    expect(lamp?.elements.map((e) => e.id)).toEqual(
      expect.arrayContaining(['start', 'defer', 'leave']),
    );
    await page.screenshot({ path: 'test-results/m05-lamp-800x600.png' });
    await waitType(page, 'proto_m05_start_control_presented', 1, 3_000);
    await page.waitForTimeout(450); // past the surface's settle window
    await clickElement(page, 'start');
    await waitType(page, 'proto_m05_start_started', 1, 3_000);

    const started = (await eventsByType(page, 'proto_m05_start_started'))[0]
      ?.metadata as {
      latency_focused_ms: number;
      latency_wall_ms: number;
      excluded_ms: Record<string, number>;
      control_views: number;
      input_mode: string;
    };

    expect(started.input_mode).toBe('pointer');
    expect(started.control_views).toBe(1);
    expect(started.latency_focused_ms).toBeGreaterThan(0);
    expect(
      started.latency_wall_ms - started.latency_focused_ms,
    ).toBeGreaterThan(1_000);
    expect(started.excluded_ms.unusable_controls).toBeGreaterThan(1_000);
    await waitType(page, 'proto_m05_start_work_completed', 1, 6_000);
    await waitType(page, 'proto_m05_start_window_closed', 1, 3_000);

    const closed1 = (
      await eventsByType(page, 'proto_m05_start_window_closed')
    )[0];

    expect(closed1?.metadata?.occasion).toBe('o1');
    expect(closed1?.metadata?.raw_components).toMatchObject({
      accepted: true,
      status: 'started',
      latency_focused_ms: started.latency_focused_ms,
      work_completed: true,
      closure_reason: 'completed',
    });
    expect((await validityRecord(page, 'proto_m05_start_o1')).validity).toBe(
      'valid',
    );
    expect((await surface(page))?.status).not.toMatch(FORBIDDEN_TEXT);
    await page.keyboard.press('Escape');
    await waitSurface(page, false);

    // Handover confirmed with Vale, then to the yard: Noor's flag job, accepted.
    await openPromptAt(page, PILOT.concourse.vale, {
      approachOffset: { x: 0, y: 56 },
    });
    await selectPromptOption(page, 1);
    await expectStage(page, 'workshop');
    await concourseToWorkshop(page);
    await workshopSignOff(page);
    await workshopToConcourse(page);
    await concourseToLabBriefed(page);
    await labToNoorFlagOffer(page);
    await selectPromptOption(page, 1); // accept the flag job
    await waitType(page, 'proto_m05_start_offer_answered', 2, 3_000);
    await page.waitForTimeout(400);
    await waitType(page, 'proto_m05_start_eligible', 2, 5_000);

    // "Not now": the explicit deferral closes the occasion.
    await openFlagSurface(page);

    const flag = await surface(page);

    expect(flag?.title).toBe('GUY-LINE FLAG');
    expect(`${flag?.title}\n${flag?.status}`).not.toMatch(FORBIDDEN_TEXT);
    await page.screenshot({ path: 'test-results/m05-flag-800x600.png' });
    await page.waitForTimeout(450);
    await page.keyboard.press('n'); // keyboard parity: the hotkey defers
    await waitType(page, 'proto_m05_start_deferred', 1, 3_000);
    // The panel stays open and acknowledges the deferral (review U6 G-F1);
    // "Not now" is gone, the start control remains.
    await page.waitForTimeout(300);

    const deferredPanel = await surface(page);

    expect(deferredPanel?.status).toContain('Noted.');
    expect(deferredPanel?.elements.map((e) => e.id)).not.toContain('defer');
    expect(deferredPanel?.elements.map((e) => e.id)).toContain('start');
    await page.keyboard.press('Escape');
    await waitSurface(page, false);

    const closed2 = (
      await eventsByType(page, 'proto_m05_start_window_closed')
    ).find((e) => e.metadata?.occasion === 'o2');

    expect(closed2?.metadata?.raw_components).toMatchObject({
      status: 'deferred',
      latency_focused_ms: null,
      closure_reason: 'voluntary_stop',
    });
    expect(await itemStatus(page, 'M05')).toBe('completed');

    // A later start is a late start: recorded beside, never a rewrite.
    await openFlagSurface(page);
    expect((await surface(page))?.elements.map((e) => e.id)).not.toContain(
      'defer',
    );
    await page.waitForTimeout(450);
    await clickElement(page, 'start');
    await waitType(page, 'proto_m05_start_late_start', 1, 3_000);
    await waitType(page, 'proto_m05_start_work_completed', 2, 6_000);
    expect(
      (await eventsByType(page, 'proto_m05_start_late_start'))[0]?.metadata,
    ).toMatchObject({ occasion: 'o2', after: 'deferred' });
    expect(await countType(page, 'proto_m05_start_window_closed')).toBe(2);
    await page.keyboard.press('Escape');
    await waitSurface(page, false);

    // The shift end leaves the closed records untouched.
    await finishOutside(page);
    expect(await countType(page, 'proto_m05_start_window_closed')).toBe(2);
    expect(await itemStatus(page, 'M05')).toBe('completed');

    // Independent reproduction from the raw family alone.
    const family = (await eventsByPrefix(
      page,
      'proto_m05_start_',
    )) as unknown as RawGameEvent[];
    const rows = extractItemFeatures('M05', family, {
      finalCoreClosed: false,
      pageLoadIndex: 1,
      reloaded: false,
    });

    expect(rows[0]).toMatchObject({
      feature_id: 'm05_start_latency',
      disposition: 'observed',
      censored: false,
      included_ids: ['m05_start_o1', 'm05_start_o2'],
      independence: 'independent_occasions',
    });
    expect(rows[0].value).toMatchObject({
      o1: {
        status: 'started',
        latency_focused_ms: started.latency_focused_ms,
        censored: false,
      },
      o2: { status: 'deferred', latency_focused_ms: null, censored: false },
    });
    expect(rows[0].components).toMatchObject({
      starters: ['o1'],
      non_starters: ['o2'],
      started_event_agrees: true,
    });
    expect(JSON.stringify(rows[0])).not.toMatch(/mean|average/i);
    expect(
      (rows[1].value as { o2: { late_start: { after: string } } }).o2
        .late_start,
    ).toMatchObject({ after: 'deferred', work_completed: true });
    expectNoRuntimeErrors(errors);
  });

  test('lamp job declined (outside the set; the lamp reads steady); flag job accepted then nothing for a minute — the focused cap closes a censored non-start, never a start; a late start stays available', async ({
    page,
  }) => {
    test.setTimeout(900_000);

    const errors = captureErrors(page);

    await bootPilot(page, 'm05b');
    await completeDockTutorial(page, 1);
    await dockToConcourse(page);
    await valeChainToLampOffer(page);
    await page.waitForTimeout(450);
    await selectPromptOption(page, 2); // decline the lamp job
    await waitType(page, 'proto_m05_start_offer_answered', 1, 3_000);
    expect(
      (await eventsByType(page, 'proto_m05_start_offer_answered'))[0]?.metadata,
    ).toMatchObject({ occasion: 'o1', accepted: false, option_position: 2 });
    await page.waitForTimeout(400);
    expect(await countType(page, 'proto_m05_start_eligible')).toBe(0);
    expect((await validityRecord(page, 'proto_m05_start_o1')).completed).toBe(
      true,
    );

    // The lamp opens no surface for a declined job.
    await interactAt(page, registryApproach('concourse.reading_desk_lamp'), {
      approachOffset: { x: 0, y: 0 },
    });
    await page.waitForTimeout(600);
    expect((await surface(page))?.open ?? false).toBe(false);
    expect(await lastFeedback(page)).toBe('Lamp steady.');
    expect(await countType(page, 'proto_m05_start_control_presented')).toBe(0);

    // Handover confirmed, then to the yard: accept the flag job, then do nothing.
    await openPromptAt(page, PILOT.concourse.vale, {
      approachOffset: { x: 0, y: 56 },
    });
    await selectPromptOption(page, 1);
    await expectStage(page, 'workshop');
    await concourseToWorkshop(page);
    await workshopSignOff(page);
    await workshopToConcourse(page);
    await concourseToLabBriefed(page);
    await labToNoorFlagOffer(page);
    await selectPromptOption(page, 1); // accept the flag job
    await waitType(page, 'proto_m05_start_offer_answered', 2, 3_000);
    await waitType(page, 'proto_m05_start_eligible', 1, 5_000);
    expect(await countType(page, 'proto_m05_start_cap_reached')).toBe(0);
    await page.waitForTimeout(61_000);
    await waitType(page, 'proto_m05_start_cap_reached', 1, 10_000);

    const cap = (await eventsByType(page, 'proto_m05_start_cap_reached'))[0]
      ?.metadata as { focused_ms: number; wall_ms: number; occasion: string };

    expect(cap.occasion).toBe('o2');
    expect(cap.focused_ms).toBeGreaterThanOrEqual(60_000);
    expect(cap.focused_ms).toBeLessThan(61_500);
    expect(await countType(page, 'proto_m05_start_started')).toBe(0);

    const closed = (
      await eventsByType(page, 'proto_m05_start_window_closed')
    ).find((e) => e.metadata?.occasion === 'o2');

    expect(closed?.metadata?.raw_components).toMatchObject({
      status: 'cap',
      cap_reached: true,
      latency_focused_ms: null,
      closure_reason: 'cap',
    });
    expect(await itemStatus(page, 'M05')).toBe('completed');

    // The control stays: a start now is late, and "Not now" is gone.
    await openFlagSurface(page);

    const ids = (await surface(page))?.elements.map((e) => e.id) ?? [];

    expect(ids).toContain('start');
    expect(ids).not.toContain('defer');
    await page.keyboard.press('Escape');
    await waitSurface(page, false);
    await finishOutside(page);

    const family = (await eventsByPrefix(
      page,
      'proto_m05_start_',
    )) as unknown as RawGameEvent[];
    const rows = extractItemFeatures('M05', family, {
      finalCoreClosed: false,
      pageLoadIndex: 1,
      reloaded: false,
    });

    expect(rows[0]).toMatchObject({
      disposition: 'observed',
      censored: true,
      included_ids: ['m05_start_o2'],
    });
    expect(rows[0].value).toMatchObject({
      o1: { occasion: 'o1', declined: true },
      o2: {
        status: 'cap',
        latency_focused_ms: null,
        censored: true,
        closure_reason: 'cap',
      },
    });
    expect(rows[0].components).toMatchObject({
      occasions_declined: ['o1'],
      starters: [],
      non_starters: ['o2'],
    });
    expect(occasionEvents(family, 'o2').length).toBeGreaterThan(0);
    expectNoRuntimeErrors(errors);
  });
});
