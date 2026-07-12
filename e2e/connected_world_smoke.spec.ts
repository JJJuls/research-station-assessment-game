import { expect, test } from '@playwright/test';

import {
  bootJourney,
  captureErrors,
  dockToHubJourney,
  expectEventSubsequence,
  expectNoRuntimeErrors,
  expectSessionMetadata,
  hubToDockJourney,
  journeyEvents,
  missionState,
  stationRoundTrip,
} from './journey';

/**
 * Sprint A (A3): connected-world navigation smoke — validates the journey
 * helpers by driving REAL doors through the full door ring in one session.
 * Navigation-only (no assessment prompts are opened), so a single
 * participant session is scientifically valid: it produces control/
 * navigation data and cannot mix exclusive assessment branches.
 * Full participant journeys (with task branches) live in the A4 specs.
 */

test.describe('connected-world navigation smoke', () => {
  test('dock -> hub -> all eight stations round trip -> dock, one session', async ({
    page,
  }) => {
    test.setTimeout(600_000);

    const errors = captureErrors(page);
    const params = {
      participant_id: 'A3_NAV_P1',
      game_session_id: 'A3_NAV_S1',
      condition: 'pilot',
      game_version: 'e2e',
    };

    await bootJourney(page, params);

    expect((await missionState(page)).current_room_id).toBe('dock_arrival');

    await dockToHubJourney(page);

    expect((await missionState(page)).current_room_id).toBe('station_hub');

    // Full door ring in registry order. Each leg asserts the transition by
    // count-aware scene_start waits inside the helpers; reachability of
    // every door and every return spawn is exercised by the round trip.
    for (const roomId of [
      'archive_room',
      'systems_repair_room',
      'engineer_hub',
      'inventory_prep_room',
      'hazard_control_room',
      'optional_side_repair_bay',
      'interruption_corridor',
      'final_core_room',
    ] as const) {
      await stationRoundTrip(page, roomId);

      const mission = await missionState(page);

      expect(mission.current_room_id).toBe('station_hub');
      // Navigation alone never completes an assessment room.
      expect(mission.completed_rooms).toEqual([]);
    }

    // Back to the Dock and return to the Hub once more (both directions of
    // the Dock door verified count-aware).
    await hubToDockJourney(page);

    expect((await missionState(page)).current_room_id).toBe('dock_arrival');

    await dockToHubJourney(page);

    expect((await missionState(page)).current_room_id).toBe('station_hub');

    const events = await journeyEvents(page);
    const types = events.map((e) => e.event_type);

    // Entry-event ordering along the ring (first visits, in ring order).
    expectEventSubsequence(types, [
      'session_start',
      'dock_started',
      'station_hub_entered',
      'archive_room_entered',
      'repair_room_entered',
      'engineer_hub_entered',
      'inventory_room_entered',
      'hazard_room_entered',
      'side_repair_discovered',
      'interruption_corridor_entered',
      'final_core_entered',
    ]);

    // Hub was re-entered after every station + the final dock return:
    // 8 returns + first entry + last return = 10 entries.
    expect(types.filter((t) => t === 'station_hub_entered')).toHaveLength(10);

    // No assessment or baseline one-shot may double-fire on re-entries.
    expect(types.filter((t) => t === 'dock_started')).toHaveLength(1);
    expect(types.filter((t) => t === 'side_repair_discovered')).toHaveLength(1);
    expect(types.filter((t) => t === 'session_start')).toHaveLength(1);

    expectSessionMetadata(events, params);
    expectNoRuntimeErrors(errors);
  });
});
