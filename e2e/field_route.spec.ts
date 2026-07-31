import { expect, test } from '@playwright/test';

import {
  driveAxisTo,
  findEvent,
  findEvents,
  getEvents,
  getLastFeedbackText,
  press,
} from './helpers';
import {
  captureErrors,
  completeDockTutorial,
  dockToHubJourney,
  eventCount,
  expectNoRuntimeErrors,
  waitForEventCount,
} from './journey';

/**
 * Unit 2 core playable route (overnight prototype): Vale's requisition in
 * the Hub, physical collection from the equipment locker, Kai's survey
 * briefing on the Survey Terrace, scan/dig/recover at the survey markers,
 * the three-step relay-coupling install, and the core-sample delivery.
 *
 * All proto_* events are raw prototype telemetry: the spec also pins that
 * they carry NO canonical study_item_ids/construct_id (scenario_* rule).
 */

async function questObjective(page: import('@playwright/test').Page) {
  return page.evaluate(
    () =>
      (window as unknown as { __questObjectiveText?: string | null })
        .__questObjectiveText ?? null,
  );
}

async function inventoryItems(page: import('@playwright/test').Page) {
  return page.evaluate(() => {
    const probe = (
      window as unknown as {
        __inventoryProbe?: { slots: (string | null)[] } | null;
      }
    ).__inventoryProbe;

    return (probe?.slots ?? []).filter((slot) => slot !== null);
  });
}

/** Hub dock-entry position -> Vale's requisition desk (SW area). */
async function hubToVale(page: import('@playwright/test').Page) {
  await driveAxisTo(page, 'y', 368, 12);
  await driveAxisTo(page, 'x', 144, 10);
  await press(page, 'Space');
}

/** Vale's desk -> the equipment locker beside it. */
async function valeToLocker(page: import('@playwright/test').Page) {
  await driveAxisTo(page, 'x', 62, 10);
  await press(page, 'Space');
}

/** Hub SW area -> Exterior Airlock -> Survey Terrace. */
async function hubToFieldSite(page: import('@playwright/test').Page) {
  const before = await eventCount(page, 'scene_start', 'field');

  await driveAxisTo(page, 'x', 192, 10);
  await driveAxisTo(page, 'y', 418, 14);
  await press(page, 'Space');
  await waitForEventCount(page, 'scene_start', 'field', before + 1);
}

test.describe('field survey route (Unit 2)', () => {
  test('full route: requisition, collect, scan, dig, install, deliver', async ({
    page,
  }) => {
    test.setTimeout(300_000);

    const errors = captureErrors(page);

    await page.goto(
      '/?participant_id=PT_FIELD_ROUTE&game_session_id=GS_FIELD_ROUTE',
    );
    await page.waitForFunction(
      () =>
        (window as unknown as { __playerProbe?: { scene: string } | null })
          .__playerProbe?.scene === 'dock',
    );
    await completeDockTutorial(page, 1);
    await dockToHubJourney(page);

    // — Vale's requisition offer.
    await hubToVale(page);
    await press(page, '1');
    expect(await questObjective(page)).toContain(
      'Collect the issued equipment from the locker (0/3)',
    );

    // — Physically collect the three issued items (timed collect actions).
    await valeToLocker(page);
    for (let i = 0; i < 3; i++) {
      await press(page, '1');
      await page.waitForTimeout(1300);
      if (i < 2) {
        await press(page, 'Space');
      }
    }

    expect(await inventoryItems(page)).toEqual([
      'field_scanner',
      'excavation_spade',
      'sample_case',
    ]);
    expect(await questObjective(page)).toContain('Exterior Airlock');

    // — Through the exterior airlock to the Survey Terrace.
    await hubToFieldSite(page);

    // — Kai's briefing.
    await driveAxisTo(page, 'x', 416, 12);
    await press(page, 'Space');
    await press(page, '1');
    expect(await questObjective(page)).toContain(
      'Scan the survey markers (0/4)',
    );

    // — Marker 4 (anomaly): scan, then dig out the core sample.
    await driveAxisTo(page, 'x', 576, 10);
    await press(page, 'Space');
    await press(page, '1');
    await page.waitForTimeout(1600);
    await press(page, 'Space');
    await press(page, '1');
    await page.waitForTimeout(2000);
    expect(await inventoryItems(page)).toContain('core_sample');

    // — Marker 3 (clear).
    await driveAxisTo(page, 'x', 416, 10);
    await driveAxisTo(page, 'y', 272, 10);
    await press(page, 'Space');
    await press(page, '1');
    await page.waitForTimeout(1600);

    // — Marker 1 (clear).
    await driveAxisTo(page, 'x', 160, 10);
    await press(page, 'Space');
    await press(page, '1');
    await page.waitForTimeout(1600);

    // — Marker 2 (anomaly): approach from the south lane, scan, dig.
    await driveAxisTo(page, 'y', 208, 10);
    await driveAxisTo(page, 'x', 96, 10);
    await press(page, 'Space');
    await press(page, '1');
    await page.waitForTimeout(1600);
    expect(await questObjective(page)).toContain('Dig out the flagged markers');
    await press(page, 'Space');
    await press(page, '1');
    await page.waitForTimeout(2000);
    expect(await inventoryItems(page)).toContain('relay_coupling');
    expect(await questObjective(page)).toContain('Install the relay coupling');

    // — Feed housing: three-step tactile install.
    await driveAxisTo(page, 'x', 160, 10);
    await driveAxisTo(page, 'y', 272, 12);
    await driveAxisTo(page, 'x', 576, 10);
    for (let step = 0; step < 3; step++) {
      await press(page, 'Space');
      await press(page, '1');
      await page.waitForTimeout(1400);
    }

    expect(await inventoryItems(page)).not.toContain('relay_coupling');
    expect(await questObjective(page)).toContain(
      'Deliver the core sample to Engineer Kai',
    );

    // — Deliver the sample back to Kai.
    await driveAxisTo(page, 'x', 416, 10);
    await driveAxisTo(page, 'y', 128, 10);
    await press(page, 'Space');
    await press(page, '1');

    expect(await inventoryItems(page)).toEqual([
      'field_scanner',
      'excavation_spade',
      'sample_case',
    ]);
    // With the field route fully completed, the quest line moves on to
    // the next accepted task (Unit 3 bench maintenance at the Hub
    // Calibration Cabinet) — never stuck on a finished route task.
    const finalObjective = await questObjective(page);

    expect(finalObjective).not.toContain('Field requisition');
    expect(finalObjective).not.toContain('Survey recovery');
    expect(finalObjective).toContain('Bench maintenance');

    // — Telemetry: the full proto_* trail, with no canonical context.
    const events = await getEvents(page);
    const types = events.map((event) => event.event_type);

    expect(types).toContain('proto_requisition_accepted');
    expect(findEvents(events, 'proto_item_collected')).toHaveLength(3);
    expect(types).toContain('proto_field_briefing_accepted');
    expect(findEvents(events, 'proto_scan_performed')).toHaveLength(4);
    expect(findEvents(events, 'proto_dig_performed')).toHaveLength(2);
    expect(findEvents(events, 'proto_item_recovered')).toHaveLength(2);
    expect(findEvents(events, 'proto_install_step_completed')).toHaveLength(3);
    expect(types).toContain('proto_coupling_installed');
    expect(types).toContain('proto_sample_delivered');
    expect(types).toContain('proto_route_completed');

    const anomalyScans = findEvents(events, 'proto_scan_performed').filter(
      (event) =>
        (event.metadata as { anomaly?: boolean } | undefined)?.anomaly === true,
    );

    expect(anomalyScans).toHaveLength(2);

    for (const eventType of [
      'proto_requisition_accepted',
      'proto_scan_performed',
      'proto_route_completed',
    ]) {
      const event = findEvent(events, eventType);

      expect(event?.study_item_ids).toBeUndefined();
      expect(event?.construct_id).toBeUndefined();
    }

    expectNoRuntimeErrors(errors);
  });

  test('locker and markers gate politely before the route is active', async ({
    page,
  }) => {
    test.setTimeout(240_000);

    await page.goto(
      '/?participant_id=PT_FIELD_GATE&game_session_id=GS_FIELD_GATE',
    );
    await page.waitForFunction(
      () =>
        (window as unknown as { __playerProbe?: { scene: string } | null })
          .__playerProbe?.scene === 'dock',
    );
    await completeDockTutorial(page, 1);
    await dockToHubJourney(page);

    // Locker before Vale: quartermaster-issued, no options open.
    await driveAxisTo(page, 'y', 368, 12);
    await driveAxisTo(page, 'x', 62, 10);
    await press(page, 'Space');
    expect(await getLastFeedbackText(page)).toContain('quartermaster-issued');

    // Terrace reachable without any equipment; markers stay dormant.
    await hubToFieldSite(page);
    await driveAxisTo(page, 'x', 416, 12);
    await driveAxisTo(page, 'y', 272, 10);
    await press(page, 'Space');
    expect(await getLastFeedbackText(page)).toContain('dormant');

    // Return to the Hub through the airlock (round trip works).
    const before = await eventCount(page, 'scene_start', 'hub');

    await driveAxisTo(page, 'y', 128, 10);
    await driveAxisTo(page, 'x', 320, 10);
    await driveAxisTo(page, 'y', 96, 14);
    await press(page, 'Space');
    await waitForEventCount(page, 'scene_start', 'hub', before + 1);
  });
});
