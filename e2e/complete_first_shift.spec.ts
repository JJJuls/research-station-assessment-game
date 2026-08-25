import { expect, test } from '@playwright/test';

import type { RawEventLike } from './helpers';
import {
  dismissOpenPrompt,
  driveAxisTo,
  findEvents,
  getEvents,
  getLastFeedbackText,
  press,
  selectCardByLabel,
  selectPromptOption,
} from './helpers';
import {
  captureErrors,
  completeAllPilotDecisions,
  completeDockTutorial,
  dockToHubJourney,
  eventCount,
  expectNoRuntimeErrors,
  hubToStationJourney,
  openStationAlcove,
  stationToHubJourney,
  waitForEventCount,
} from './journey';

/**
 * Action-assessment rebuild Unit 6: the COMPLETE first-shift mission
 * spine — briefing/requisition, coolant red line (work order, yard
 * survey and excavation, M23 extraction, manifold rebuild, diagnosis,
 * setback recovery), the four station decisions, the conditional Final
 * Core gate (no synchronization while Loop B is open once the work
 * order was logged), pump restart, and final synchronization. Also the
 * route-duration evidence: every event carries elapsed_seconds.
 */

async function waitForEventType(
  page: import('@playwright/test').Page,
  eventType: string,
  wantedCount: number,
  timeout = 8_000,
): Promise<boolean> {
  return page
    .waitForFunction(
      (args: { type: string; wanted: number }) =>
        (
          window as unknown as {
            researchRuntime: { getEvents: () => { event_type: string }[] };
          }
        ).researchRuntime
          .getEvents()
          .filter((event) => event.event_type === args.type).length >=
        args.wanted,
      { type: eventType, wanted: wantedCount },
      { timeout },
    )
    .then(
      () => true,
      () => false,
    );
}

async function tap(page: import('@playwright/test').Page, key: string) {
  await page.keyboard.down(key);
  await page.waitForTimeout(130);
  await page.keyboard.up(key);
}

async function tapForEvent(
  page: import('@playwright/test').Page,
  key: string,
  eventType: string,
  wanted: number,
) {
  for (let attempt = 0; attempt < 3; attempt++) {
    await tap(page, key);

    if (await waitForEventType(page, eventType, wanted, 5_000)) {
      return;
    }
  }

  const debug = JSON.stringify(
    await page.evaluate(() => ({
      player: (window as unknown as { __playerProbe?: unknown }).__playerProbe,
      hints: (window as unknown as { __actionHints?: unknown }).__actionHints,
      cards: (
        (window as unknown as { __promptCards?: unknown[] | null })
          .__promptCards ?? []
      ).length,
    })),
  );

  throw new Error(`${key} never produced ${eventType} #${wanted}: ${debug}`);
}

async function enterRoomBySpace(
  page: import('@playwright/test').Page,
  sceneName: string,
  wantedCount: number,
) {
  for (let attempt = 0; attempt < 3; attempt++) {
    await press(page, 'Space');

    const landed = await page
      .waitForFunction(
        (args: { scene: string; wanted: number }) =>
          (
            window as unknown as {
              researchRuntime: {
                getEvents: () => { event_type: string; scene?: string }[];
              };
            }
          ).researchRuntime
            .getEvents()
            .filter(
              (event) =>
                event.event_type === 'scene_start' &&
                event.scene === args.scene,
            ).length >= args.wanted,
        { scene: sceneName, wanted: wantedCount },
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

  throw new Error(`door press never reached scene ${sceneName}`);
}

/** Drive + door press retried AS A UNIT: under heavy load a leg can
 * silently clamp short, so each retry re-drives before pressing. */
async function driveAndEnter(
  page: import('@playwright/test').Page,
  drives: () => Promise<void>,
  sceneName: string,
  wantedCount: number,
) {
  for (let attempt = 0; attempt < 3; attempt++) {
    await drives();

    try {
      await enterRoomBySpace(page, sceneName, wantedCount);

      return;
    } catch {
      await page.waitForTimeout(800);
    }
  }

  // Diagnostic-rich failure (Unit 8): where the avatar actually ended up.
  const probe = await page.evaluate(
    () =>
      (
        window as unknown as {
          __playerProbe?: { scene: string; x: number; y: number } | null;
        }
      ).__playerProbe ?? null,
  );

  throw new Error(
    `drive+enter never reached ${sceneName} — player ${JSON.stringify(probe)}`,
  );
}

/** Field terrace (from-yard spawn) -> Station Hub airlock. */
async function fieldToHub(page: import('@playwright/test').Page) {
  const before = await eventCount(page, 'scene_start', 'hub');

  await driveAndEnter(
    page,
    async () => {
      await driveAxisTo(page, 'y', 96, 12);
      await driveAxisTo(page, 'x', 320, 10);
    },
    'hub',
    before + 1,
  );
  await page.waitForTimeout(1200);
}

/** Hub -> Survey Terrace -> east gate -> Coolant Yard. */
async function hubToYard(page: import('@playwright/test').Page) {
  const beforeField = await eventCount(page, 'scene_start', 'field');

  // Normalize to the hub's clear south-west lane first (the second
  // visit starts at the Final Core door return position, and a direct
  // westward drive clamps on the central console block).
  await driveAndEnter(
    page,
    async () => {
      await driveAxisTo(page, 'y', 368, 12);
      await driveAxisTo(page, 'x', 192, 10);
      await driveAxisTo(page, 'y', 418, 14);
    },
    'field',
    beforeField + 1,
  );
  await page.waitForTimeout(1200);

  const beforeYard = await eventCount(page, 'scene_start', 'coolant_yard');

  await driveAndEnter(
    page,
    async () => {
      // y=308±6: the y=320±10 lane can settle as low as y≈329 under
      // SwiftShader jank, and the terrace-expansion ridge blocks at
      // row 11 (cols 18-19) then clip the x-drive at x≈560. From
      // (640, 308) the yard gate at (672, 320) is still well inside
      // the 72px interaction radius.
      await driveAxisTo(page, 'y', 308, 6);
      await driveAxisTo(page, 'x', 640, 10);
    },
    'coolant_yard',
    beforeYard + 1,
  );
  await page.waitForTimeout(1200);
}

async function yardToPump(page: import('@playwright/test').Page) {
  const before = await eventCount(page, 'scene_start', 'pump_house');

  await driveAndEnter(
    page,
    async () => {
      await driveAxisTo(page, 'y', 96, 12);
      await driveAxisTo(page, 'x', 560, 10);
    },
    'pump_house',
    before + 1,
  );
  await page.waitForTimeout(1200);
}

async function pumpToYard(page: import('@playwright/test').Page) {
  const before = await eventCount(page, 'scene_start', 'coolant_yard');

  await driveAndEnter(
    page,
    async () => {
      await driveAxisTo(page, 'y', 400, 12);
      await driveAxisTo(page, 'x', 560, 10);
    },
    'coolant_yard',
    before + 1,
  );
  await page.waitForTimeout(1200);
}

async function yardToField(page: import('@playwright/test').Page) {
  const before = await eventCount(page, 'scene_start', 'field');

  await driveAndEnter(
    page,
    async () => {
      await driveAxisTo(page, 'x', 64, 8);
      await driveAxisTo(page, 'y', 96, 12);
      await driveAxisTo(page, 'x', 80, 8);
    },
    'field',
    before + 1,
  );
  await page.waitForTimeout(1200);
}

test.describe('complete first shift (Unit 6)', () => {
  test('briefing, coolant red line, decisions, gate and synchronization', async ({
    page,
  }) => {
    test.setTimeout(900_000);

    const errors = captureErrors(page);

    await page.goto(
      '/?participant_id=PT_FIRST_SHIFT&game_session_id=GS_FIRST_SHIFT&route=legacy',
    );
    await page.waitForFunction(
      () =>
        (window as unknown as { __playerProbe?: { scene: string } | null })
          .__playerProbe?.scene === 'dock',
    );
    await completeDockTutorial(page, 1);
    await dockToHubJourney(page);

    // — Requisition and kit collection (event-synced label selection).
    await driveAxisTo(page, 'y', 368, 12);
    await driveAxisTo(page, 'x', 144, 10);
    await selectCardByLabel(page, 'Take on the field requisition');
    expect(await waitForEventType(page, 'proto_requisition_accepted', 1)).toBe(
      true,
    );
    await driveAxisTo(page, 'x', 62, 10);
    for (let collected = 1; collected <= 3; collected++) {
      await selectCardByLabel(page, 'Take the ');
      expect(
        await waitForEventType(page, 'proto_item_collected', collected, 12_000),
      ).toBe(true);
    }

    // — To the Pump House: log the work order (opens the red line AND
    //   arms the Final Core coolant gate).
    await hubToYard(page);
    await yardToPump(page);
    await driveAxisTo(page, 'x', 160, 10);
    await driveAxisTo(page, 'y', 128, 10);
    await selectCardByLabel(page, 'Log the work order');
    expect(await waitForEventType(page, 'proto_work_order_read', 1)).toBe(true);

    // — Yard: field tools from the supply crate.
    await pumpToYard(page);
    // Around the crate's collision footprint: south first, then west.
    await driveAxisTo(page, 'y', 172, 5);
    await driveAxisTo(page, 'x', 172, 5);
    await selectCardByLabel(page, 'Take a heat canister');
    await selectCardByLabel(page, 'Take the pry bar');
    await dismissOpenPrompt(page);

    // — Survey and excavate the three line components (C scan, D dig).
    await driveAxisTo(page, 'y', 224, 8);
    await tapForEvent(page, 'c', 'proto_yard_scan', 1); // flags yd1
    await tapForEvent(page, 'd', 'proto_yard_dig', 1); // pipe segment
    await driveAxisTo(page, 'x', 320, 8);
    await driveAxisTo(page, 'y', 256, 8);
    await tapForEvent(page, 'c', 'proto_yard_scan', 2); // flags yd3
    await tapForEvent(page, 'd', 'proto_yard_dig', 2); // pipe elbow
    await driveAxisTo(page, 'x', 352, 8);
    await driveAxisTo(page, 'y', 192, 8);
    await tapForEvent(page, 'c', 'proto_yard_scan', 3); // flags yd6
    await tapForEvent(page, 'd', 'proto_yard_dig', 3); // pipe segment

    // — M23: free the coupling with a real strategy mix (3 spade acts,
    //   the heat canister, then the pry bar).
    await driveAxisTo(page, 'y', 320, 8);
    await driveAxisTo(page, 'x', 544, 8);
    await driveAxisTo(page, 'y', 480, 10);
    await driveAxisTo(page, 'x', 384, 8);
    for (const wanted of [1, 2, 3]) {
      await selectCardByLabel(page, 'Work the ice with the spade');
      expect(await waitForEventType(page, 'proto_m23_act', wanted)).toBe(true);
    }
    await selectCardByLabel(page, 'Apply a heat canister');
    expect(await waitForEventType(page, 'proto_m23_act', 4)).toBe(true);
    for (const wanted of [5, 6, 7]) {
      await selectCardByLabel(page, 'Lever the housing with the pry bar');
      expect(await waitForEventType(page, 'proto_m23_act', wanted)).toBe(true);
    }
    expect(await waitForEventType(page, 'proto_m23_completed', 1)).toBe(true);

    // — Pump House: manifold rebuild via the keyboard-card equivalent.
    await driveAxisTo(page, 'x', 544, 8);
    await driveAxisTo(page, 'y', 96, 12);
    await driveAxisTo(page, 'x', 560, 10);

    const beforePump = await eventCount(page, 'scene_start', 'pump_house');

    await enterRoomBySpace(page, 'pump_house', beforePump + 1);
    await page.waitForTimeout(1200);
    await driveAxisTo(page, 'x', 416, 8);
    await driveAxisTo(page, 'y', 224, 8);

    // Sequence-level defence: a delayed double key delivery can jump a
    // chained stage; on any stage mismatch, close the prompt and replay
    // the whole labelled sequence (count-guarded, so no double effect).
    const staged = async (labels: string[], eventType: string, n: number) => {
      for (let attempt = 0; attempt < 3; attempt++) {
        try {
          for (const label of labels) {
            await selectCardByLabel(page, label);
          }
        } catch {
          await dismissOpenPrompt(page);

          if (await waitForEventType(page, eventType, n, 2_000)) {
            return;
          }

          continue;
        }

        if (await waitForEventType(page, eventType, n)) {
          return;
        }
      }

      throw new Error(
        `staged [${labels.join(' > ')}] never reached ${eventType} #${n}`,
      );
    };
    const seat = (typeLabel: string, slotLabel: string, n: number) =>
      staged(
        ['Seat a section', typeLabel, slotLabel],
        'proto_m13_piece_placed',
        n,
      );
    const rotate = (slotLabel: string, n: number) =>
      staged(['Rotate a section', slotLabel], 'proto_m13_piece_rotated', n);

    await seat('Elbow section', 'Mount A2.', 1);
    await rotate('Mount A2.', 1);
    await rotate('Mount A2.', 2);
    await rotate('Mount A2.', 3);
    await seat('Elbow section', 'Mount A1.', 2);
    await rotate('Mount A1.', 4);
    await seat('Elbow section', 'Mount C1.', 3);
    await rotate('Mount C1.', 5);
    await rotate('Mount C1.', 6);
    await seat('Elbow section', 'Mount C2.', 4);
    await seat('Isolation valve', 'Mount B1.', 5);
    await selectCardByLabel(page, 'Open the test flow');
    expect(await waitForEventType(page, 'proto_m13_completed', 1)).toBe(true);

    // — Diagnosis, prescribed fix, standardised setback, recovery.
    await driveAxisTo(page, 'x', 512, 8);
    await driveAxisTo(page, 'y', 140, 8);
    await staged(
      ['Log the diagnosis', 'Relief valve leaking'],
      'proto_m18_diagnosis_submitted',
      1,
    );
    await driveAxisTo(page, 'x', 576, 8);
    await driveAxisTo(page, 'y', 288, 8);
    await selectCardByLabel(page, 'Fit the shop-stock seal');
    expect(await waitForEventType(page, 'proto_m22_setback_shown', 1)).toBe(
      true,
    );
    await pumpToYard(page);
    // Around the crate's collision footprint: south first, then west.
    await driveAxisTo(page, 'y', 172, 5);
    await driveAxisTo(page, 'x', 172, 5);
    await selectCardByLabel(page, 'Take a replacement valve seal');
    await dismissOpenPrompt(page);
    await yardToPump(page);
    await driveAxisTo(page, 'x', 576, 8);
    await driveAxisTo(page, 'y', 288, 8);
    await selectCardByLabel(page, 'Seat the fresh seal');
    expect(await waitForEventType(page, 'proto_m22_recovered', 1)).toBe(true);

    // — Remaining commitments: the four station decisions (pump restart
    //   deliberately left OPEN so the gate can prove itself).
    await pumpToYard(page);
    await yardToField(page);
    await fieldToHub(page);
    await completeAllPilotDecisions(page);

    // — Final Core: decisions done, Loop B open -> coolant gate blocks.
    await hubToStationJourney(page, 'final_core_room');
    await openStationAlcove(page);
    expect(
      await waitForEventType(page, 'proto_final_gate_coolant_pending', 1),
    ).toBe(true);
    expect(await getLastFeedbackText(page)).toContain(
      'Loop B restoration is still open',
    );
    expect(await eventCount(page, 'final_core_completed', 'final_core')).toBe(
      0,
    );

    // — Back to the Pump House: restart the pump (M25 lock + reset).
    await stationToHubJourney(page, 'final_core_room');
    await hubToYard(page);
    await yardToPump(page);
    await driveAxisTo(page, 'x', 320, 8);
    await driveAxisTo(page, 'y', 138, 6);
    for (const cycle of [1, 2, 3]) {
      await selectCardByLabel(page, 'Run a prime cycle');
      expect(await waitForEventType(page, 'proto_m25_prime_cycle', cycle)).toBe(
        true,
      );
    }
    await selectCardByLabel(page, 'Reset the interlock breaker');
    expect(await waitForEventType(page, 'proto_m25_pump_running', 1)).toBe(
      true,
    );

    // — Final synchronization now completes.
    await pumpToYard(page);
    await yardToField(page);
    await fieldToHub(page);
    await hubToStationJourney(page, 'final_core_room');
    await openStationAlcove(page);
    await waitForEventCount(page, 'final_core_opened', 'final_core', 1);
    await selectPromptOption(page, 2);
    await waitForEventCount(page, 'final_core_completed', 'final_core', 1);

    // — Spine integrity: milestones in strict order, no bypass.
    const events: RawEventLike[] = await getEvents(page);
    const order = [
      'proto_work_order_read',
      'proto_m23_completed',
      'proto_m13_completed',
      'proto_m18_diagnosis_submitted',
      'proto_m22_recovered',
      'proto_final_gate_coolant_pending',
      'proto_m25_pump_running',
      'final_core_completed',
    ].map((type) => events.findIndex((event) => event.event_type === type));

    for (const [i, index] of order.entries()) {
      expect(index, `milestone #${i}`).toBeGreaterThanOrEqual(0);

      if (i > 0) {
        expect(index).toBeGreaterThan(order[i - 1]);
      }
    }

    // — Route-duration evidence (automated pace; every event carries
    //   elapsed_seconds from the shared runtime clock).
    const finalEvent = findEvents(events, 'final_core_completed')[0];
    const elapsed = finalEvent.elapsed_seconds as number;

    expect(elapsed).toBeGreaterThan(0);
    expect(elapsed).toBeLessThan(1800);
    test.info().annotations.push({
      type: 'route-timing',
      description: `automated first shift: ${elapsed}s`,
    });

    expectNoRuntimeErrors(errors);
  });
});
