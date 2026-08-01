import { mkdirSync } from 'node:fs';
import { join } from 'node:path';

import { expect, test } from '@playwright/test';

import { driveAxisTo, findEvents, getEvents, press } from './helpers';
import {
  captureErrors,
  completeAllPilotDecisions,
  completeDockTutorial,
  dockToHubJourney,
  eventCount,
  expectNoRuntimeErrors,
  hubToStationJourney,
  missionState,
  waitForEventCount,
} from './journey';

/**
 * Stardew-quality pass Unit G: drives the COMPLETE participant first
 * shift through normal controls and captures the participant-view
 * screenshot set (docs/verification/screenshots-stardew/). The capture
 * doubles as a route regression: it asserts the field route completes,
 * all four pilot decisions land, and the Final Core synchronization
 * closes the mission cycle — with zero runtime errors.
 */

const SHOT_DIR = join(
  __dirname,
  '..',
  'docs',
  'verification',
  'screenshots-stardew',
);

async function shot(page: import('@playwright/test').Page, name: string) {
  await page.screenshot({ path: join(SHOT_DIR, `${name}.png`) });
}

/** Hub SW area -> Exterior Airlock -> Survey Terrace (field_route). */
async function hubToFieldSite(page: import('@playwright/test').Page) {
  const before = await eventCount(page, 'scene_start', 'field');

  await driveAxisTo(page, 'x', 192, 10);
  await driveAxisTo(page, 'y', 418, 14);
  await press(page, 'Space');
  await waitForEventCount(page, 'scene_start', 'field', before + 1);
}

/** Presses a numbered option until its expected event lands (swallowed-
 * press robustness — a lost dialogue accept otherwise derails the run). */
async function pressUntilEvent(
  page: import('@playwright/test').Page,
  key: string,
  eventType: string,
  scene: string,
) {
  const before = await eventCount(page, eventType, scene);

  for (let attempt = 0; attempt < 3; attempt++) {
    await press(page, key);

    const landed = await page
      .waitForFunction(
        ({ type, s, wanted }) =>
          (
            window as unknown as {
              researchRuntime: {
                getEvents: () => { event_type: string; scene?: string }[];
              };
            }
          ).researchRuntime
            .getEvents()
            .filter((e) => e.event_type === type && e.scene === s).length >=
          wanted,
        { type: eventType, s: scene, wanted: before + 1 },
        { timeout: 6_000 },
      )
      .then(
        () => true,
        () => false,
      );

    if (landed) {
      return;
    }
  }

  throw new Error(`${eventType} did not land after 3 presses of ${key}`);
}

test('first shift: full route with participant-view captures', async ({
  page,
}) => {
  test.setTimeout(900_000);
  mkdirSync(SHOT_DIR, { recursive: true });

  const errors = captureErrors(page);

  await page.goto(
    '/?participant_id=PT_VISUAL_ROUTE&game_session_id=GS_VISUAL_ROUTE',
  );
  await page.waitForFunction(
    () =>
      (window as unknown as { __playerProbe?: { scene: string } | null })
        .__playerProbe?.scene === 'dock',
  );
  await page.waitForTimeout(2400);
  await shot(page, '01-dock-arrival');

  await completeDockTutorial(page, 2);
  await dockToHubJourney(page);
  await page.waitForTimeout(1200); // let the ambient crew walk into view
  await shot(page, '02-station-hub');

  // — Vale's requisition offer + physical collection.
  await driveAxisTo(page, 'y', 368, 12);
  await driveAxisTo(page, 'x', 144, 10);
  await press(page, 'Space');
  await shot(page, '03-vale-requisition');
  await pressUntilEvent(page, '1', 'proto_requisition_accepted', 'hub');
  await driveAxisTo(page, 'x', 62, 10);
  await press(page, 'Space');
  for (let i = 0; i < 3; i++) {
    await press(page, '1');
    await page.waitForTimeout(1300);
    if (i < 2) {
      await press(page, 'Space');
    }
  }

  await shot(page, '04-toolbelt-equipped');

  // — Out the exterior airlock to the Survey Terrace.
  await hubToFieldSite(page);
  await page.waitForTimeout(600);
  await shot(page, '05-survey-terrace');

  // — Kai's briefing.
  await driveAxisTo(page, 'x', 416, 12);
  await press(page, 'Space');
  await shot(page, '06-kai-briefing');
  await pressUntilEvent(page, '1', 'proto_field_briefing_accepted', 'field');

  // Event-synced marker interaction: SPACE + option 1, retried until the
  // expected proto event lands (swallowed-press robustness under load).
  const fieldAct = async (eventType: string, midShot?: string) => {
    const before = await eventCount(page, eventType, 'field');

    for (let attempt = 0; attempt < 3; attempt++) {
      await press(page, 'Space');
      await press(page, '1');

      if (midShot !== undefined) {
        await page.waitForTimeout(400);
        await shot(page, midShot);
        midShot = undefined;
      }

      const landed = await page
        .waitForFunction(
          ({ type, wanted }) =>
            (
              window as unknown as {
                researchRuntime: {
                  getEvents: () => { event_type: string; scene?: string }[];
                };
              }
            ).researchRuntime
              .getEvents()
              .filter((e) => e.event_type === type && e.scene === 'field')
              .length >= wanted,
          { type: eventType, wanted: before + 1 },
          { timeout: 8_000 },
        )
        .then(
          () => true,
          () => false,
        );

      if (landed) {
        await page.waitForTimeout(600);

        return;
      }
    }

    throw new Error(`field action ${eventType} did not land`);
  };

  // — Marker 4: scan (mid-action capture), then dig (mid capture).
  await driveAxisTo(page, 'x', 576, 10);
  await fieldAct('proto_scan_performed', '07-scan-action');
  await fieldAct('proto_dig_performed', '08-dig-action');

  // — Antenna feed housing, still damaged (before shot). Route west
  // FIRST (the y-descent at marker 4's column is blocked by the row-6
  // outcrop), then south, then east along the clear bottom lane.
  await driveAxisTo(page, 'x', 416, 10);
  await driveAxisTo(page, 'y', 272, 10);
  await driveAxisTo(page, 'x', 576, 10);
  await shot(page, '09-antenna-before');

  // — Remaining markers (field_route choreography).
  await driveAxisTo(page, 'x', 416, 10);
  await fieldAct('proto_scan_performed');
  await driveAxisTo(page, 'x', 160, 10);
  await fieldAct('proto_scan_performed');
  await driveAxisTo(page, 'y', 208, 10);
  await driveAxisTo(page, 'x', 96, 10);
  await fieldAct('proto_scan_performed');
  await fieldAct('proto_dig_performed');

  // — Three-step install, then the repaired antenna (after shot).
  await driveAxisTo(page, 'x', 160, 10);
  await driveAxisTo(page, 'y', 272, 12);
  await driveAxisTo(page, 'x', 576, 10);
  for (let step = 0; step < 3; step++) {
    await fieldAct('proto_install_step_completed');
  }

  await shot(page, '10-antenna-after');

  // — Deliver the sample to Kai (route completes; Kai's done pose).
  await driveAxisTo(page, 'x', 416, 10);
  await driveAxisTo(page, 'y', 128, 10);
  await fieldAct('proto_sample_delivered');
  await shot(page, '11-kai-route-complete');

  const fieldEvents = await getEvents(page);

  expect(fieldEvents.map((e) => e.event_type)).toContain(
    'proto_route_completed',
  );
  expect(findEvents(fieldEvents, 'proto_scan_performed')).toHaveLength(4);

  // — Back into the Hub, then the Utility Bay diagnostic.
  const hubReturn1 = await eventCount(page, 'scene_start', 'hub');

  await driveAxisTo(page, 'y', 128, 10);
  await driveAxisTo(page, 'x', 320, 10);
  await driveAxisTo(page, 'y', 96, 14);
  await press(page, 'Space');
  await waitForEventCount(page, 'scene_start', 'hub', hubReturn1 + 1);
  await page.waitForTimeout(800);

  const bayBefore = await eventCount(page, 'scene_start', 'utility_bay');

  await driveAxisTo(page, 'y', 368, 14);
  await driveAxisTo(page, 'x', 576, 10);
  await driveAxisTo(page, 'y', 418, 14);
  await press(page, 'Space');
  await waitForEventCount(page, 'scene_start', 'utility_bay', bayBefore + 1);

  await driveAxisTo(page, 'x', 288, 10);
  await driveAxisTo(page, 'y', 176, 10);
  for (let i = 0; i < 3; i++) {
    const cycleBefore = await eventCount(
      page,
      'proto_q27_useful_cycle',
      'utility_bay',
    );

    await press(page, 'Space');
    await press(page, '1');
    await waitForEventCount(
      page,
      'proto_q27_useful_cycle',
      'utility_bay',
      cycleBefore + 1,
    );
    await page.waitForTimeout(400);
  }

  await shot(page, '12-utility-bay');
  await press(page, 'Space');
  await press(page, '2'); // close the diagnostic session

  // — Operations Annex: portfolio + closure queue.
  const doorBefore = await eventCount(page, 'scene_start', 'ops_annex');
  const hubReturn2 = await eventCount(page, 'scene_start', 'hub');

  await driveAxisTo(page, 'y', 128, 10);
  await driveAxisTo(page, 'x', 192, 12);
  await driveAxisTo(page, 'y', 96, 14);
  await press(page, 'Space');
  await waitForEventCount(page, 'scene_start', 'hub', hubReturn2 + 1);
  await driveAxisTo(page, 'y', 368, 14);
  await driveAxisTo(page, 'x', 704, 10);
  await driveAxisTo(page, 'y', 418, 14);
  await press(page, 'Space');
  await waitForEventCount(page, 'scene_start', 'ops_annex', doorBefore + 1);
  await page.waitForTimeout(500);
  await shot(page, '13-ops-annex');

  // Q32 portfolio board prompt.
  await driveAxisTo(page, 'x', 448, 10);
  await driveAxisTo(page, 'y', 176, 10);
  await press(page, 'Space');
  await shot(page, '14-q32-portfolio');

  const cards = await page.evaluate(
    () =>
      (
        window as unknown as {
          __promptCards?: { index: number }[] | null;
        }
      ).__promptCards ?? null,
  );

  if (cards !== null && cards.length > 0) {
    await press(page, `${cards.length}`); // last option closes the board
  }

  // Q33 closure desk prompt.
  await driveAxisTo(page, 'x', 288, 10);
  await driveAxisTo(page, 'y', 256, 10);
  await press(page, 'Space');
  await shot(page, '15-q33-closure-queue');

  const deskCards = await page.evaluate(
    () =>
      (
        window as unknown as {
          __promptCards?: { index: number }[] | null;
        }
      ).__promptCards ?? null,
  );

  if (deskCards !== null && deskCards.length > 0) {
    await press(page, `${deskCards.length}`); // step away
  }

  // — Back to the Hub, complete the four pilot decisions, Final Core.
  const hubBefore = await eventCount(page, 'scene_start', 'hub');

  await driveAxisTo(page, 'y', 128, 10);
  await driveAxisTo(page, 'x', 288, 10);
  await driveAxisTo(page, 'y', 96, 14);
  await press(page, 'Space');
  await waitForEventCount(page, 'scene_start', 'hub', hubBefore + 1);

  await completeAllPilotDecisions(page);

  await hubToStationJourney(page, 'final_core_room');
  await driveAxisTo(page, 'x', 320, 10);
  await driveAxisTo(page, 'y', 220, 12);
  await press(page, 'Space');
  await shot(page, '16-final-core');
  await press(page, '3'); // resolve the remaining flags, then synchronize
  await page.waitForTimeout(900);
  await shot(page, '17-completion');

  const mission = await missionState(page);

  expect(mission.completed_rooms).toContain('final_core_room');

  expectNoRuntimeErrors(errors);
});
