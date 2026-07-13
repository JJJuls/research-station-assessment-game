import { expect, test } from '@playwright/test';

import { getEvents, selectPromptOption } from './helpers';
import {
  bootJourney,
  captureErrors,
  eventCount,
  expectNoRuntimeErrors,
  expectSessionMetadata,
  hubToStationJourney,
  missionState,
  openStationAlcove,
  stationToHubJourney,
  waitForEventCount,
} from './journey';

/**
 * ADV-8 (Sprint B Part 1, docs/testing/ADVERSARIAL-JOURNEY-PLAN.md):
 * direct-room launch followed by ordinary door navigation. A researcher-
 * style `?scene=` launch must produce a session indistinguishable from a
 * walked one afterwards: metadata on every event, current_room_id tracked
 * through door transitions, first-entry one-shots (side_repair_discovered)
 * honouring the direct entry, and no double room-entry artifacts.
 */

test.describe('adversarial: direct launch then ordinary navigation', () => {
  test('direct side-repair launch flows into normal door navigation', async ({
    page,
  }) => {
    test.setTimeout(240_000);

    const capture = captureErrors(page);

    await bootJourney(
      page,
      {
        participant_id: 'ADV8_P1',
        game_session_id: 'ADV8_S1',
        condition: 'adv_direct',
        scene: 'side_repair',
      },
      'side_repair',
    );

    // Direct entry IS the first discovery (one-shot fired here).
    expect(await eventCount(page, 'side_repair_discovered')).toBe(1);
    expect((await missionState(page)).current_room_id).toBe(
      'optional_side_repair_bay',
    );

    // Decide: ignore the optional repair (option 1 — legacy order).
    await openStationAlcove(page);
    await selectPromptOption(page, 1);
    await waitForEventCount(page, 'side_repair_ignored', undefined, 1);

    expect((await missionState(page)).side_repair_status).toBe('ignored');

    // Ordinary navigation onward: door to Hub, then interruption corridor.
    await stationToHubJourney(page, 'optional_side_repair_bay');

    expect((await missionState(page)).current_room_id).toBe('station_hub');

    await hubToStationJourney(page, 'interruption_corridor');

    expect((await missionState(page)).current_room_id).toBe(
      'interruption_corridor',
    );

    // Ignore the alert (option 3) — task_avoidance beside the legacy event.
    await openStationAlcove(page);
    await selectPromptOption(page, 3);
    await waitForEventCount(page, 'task_avoidance', undefined, 1);

    expect((await missionState(page)).interruption_status).toBe(
      'alert_ignored',
    );

    // Re-entering the launch room via a door must NOT re-fire discovery.
    await stationToHubJourney(page, 'interruption_corridor');
    await hubToStationJourney(page, 'optional_side_repair_bay');

    expect(await eventCount(page, 'side_repair_discovered')).toBe(1);

    // Identity from the direct-launch URL rides on every event throughout.
    expectSessionMetadata(await getEvents(page), {
      participant_id: 'ADV8_P1',
      game_session_id: 'ADV8_S1',
      condition: 'adv_direct',
    });

    expectNoRuntimeErrors(capture);
  });
});
