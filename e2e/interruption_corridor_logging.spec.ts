import { expect, test } from '@playwright/test';

import {
  bootGame,
  dockToHub,
  findEvent,
  getEvents,
  getEventTypes,
  hold,
  hubToStationDoor,
  press,
  waitForRoomEntry,
} from './helpers';

/**
 * Interruption Corridor logging (general room-coverage pass — no dedicated
 * V3 §9 spec name): switch, acknowledge-and-return, and ignore paths, plus
 * the state-grounded objective_active emission.
 *
 * NOTE (Wave 1A): authored compile-only — Playwright execution is disabled
 * in the authoring session; routes/choreography must be tuned/verified in
 * this room's playwright-game-verify pass.
 */

async function hubToCorridor(page: import('@playwright/test').Page) {
  await hubToStationDoor(page, 'interruption_corridor');
  await waitForRoomEntry(page, 'interruption_corridor_entered');
}

/** Corridor spawn -> comms beacon: up clamps under the top wall. */
async function openBeacon(page: import('@playwright/test').Page) {
  await hold(page, 'ArrowUp', 900);
  await press(page, 'Space');
}

test.describe('interruption corridor logging', () => {
  test('switch path: raw switch/abandon aliases beside legacy events', async ({
    page,
  }) => {
    await bootGame(page, {
      participant_id: 'E2E_P8',
      game_session_id: 'E2E_INT_S1',
      condition: 'pilot',
      game_version: 'e2e',
    });
    await dockToHub(page);
    await hubToCorridor(page);

    await openBeacon(page);
    await press(page, '1'); // switch fully to the new request

    const types = await getEventTypes(page);

    for (const expected of [
      'interruption_corridor_entered',
      'interruption_opened',
      'interruption_received',
      'interruption_new_task_chosen',
      'switched_task',
      'interruption_previous_task_abandoned',
      'prior_goal_abandoned',
      'interruption_focus_lost',
    ]) {
      expect(types, `${expected} must be logged`).toContain(expected);
    }
    // No objective was active (relay duty not accepted in this session):
    // the state-grounded Q18 event must NOT fire.
    expect(types).not.toContain('objective_active');
    // Unemitted-by-design events (open decisions / real-mechanic gaps).
    expect(types).not.toContain('goal_switch_accepted');
    expect(types).not.toContain('competing_task_viewed');
    expect(types).not.toContain('excessive_idle_after_instruction');

    const events = await getEvents(page);
    const received = findEvent(events, 'interruption_received');
    const switched = findEvent(events, 'switched_task');
    const abandoned = findEvent(events, 'prior_goal_abandoned');

    expect(received?.room_id).toBe('interruption_corridor');
    // Dual-listed Q15+Q17: construct deliberately unset.
    expect(received?.study_item_ids).toEqual(['Q15', 'Q17']);
    expect(received?.construct_id).toBeUndefined();
    expect(switched?.study_item_ids).toEqual(['Q17']);
    expect(switched?.construct_id).toBe('consistency_of_interest_exploratory');
    expect(abandoned?.study_item_ids).toEqual(['Q19']);
    expect(abandoned?.construct_id).toBe('consistency_of_interest_exploratory');
  });

  test('return path after accepting the relay duty: objective_active fires', async ({
    page,
  }) => {
    await bootGame(page, {
      participant_id: 'E2E_P8',
      game_session_id: 'E2E_INT_S2',
      condition: 'pilot',
      game_version: 'e2e',
    });
    await dockToHub(page);

    // Accept the relay supervision duty first (Engineer Hub), so a real
    // multi-room objective is active when the corridor is entered.
    await hubToStationDoor(page, 'engineer_hub');
    await waitForRoomEntry(page, 'engineer_hub_entered');
    await hold(page, 'ArrowUp', 900);
    await press(page, 'Space');
    await press(page, '2'); // prepared report
    await press(page, '4'); // NEXT-04 content stage: accurate claim
    await press(page, '1'); // accept the duty
    await hold(page, 'ArrowDown', 2200); // back to the Hub door
    await press(page, 'Space');
    await waitForRoomEntry(page, 'station_hub_entered');

    await hubToCorridor(page);

    await openBeacon(page);
    await press(page, '2'); // acknowledge, then return to the task

    const types = await getEventTypes(page);

    expect(types).toContain('objective_active');
    for (const expected of [
      'interruption_alert_acknowledged',
      'interruption_returned_to_original_task',
      'returned_to_original_task',
      'interruption_focus_maintained',
    ]) {
      expect(types, `${expected} must be logged`).toContain(expected);
    }

    const events = await getEvents(page);
    const objectiveActive = findEvent(events, 'objective_active');
    const returned = findEvent(events, 'returned_to_original_task');

    expect(objectiveActive?.study_item_ids).toEqual(['Q18']);
    expect(objectiveActive?.construct_id).toBe(
      'consistency_of_interest_exploratory',
    );
    expect(returned?.study_item_ids).toEqual(['Q17']);
  });

  test('ignore path: task_avoidance beside legacy events, one-shot gate', async ({
    page,
  }) => {
    await bootGame(page, {
      participant_id: 'E2E_P8',
      game_session_id: 'E2E_INT_S3',
      condition: 'pilot',
      game_version: 'e2e',
    });
    await dockToHub(page);
    await hubToCorridor(page);

    await openBeacon(page);
    await press(page, '3'); // ignore the alert completely

    const types = await getEventTypes(page);

    for (const expected of [
      'interruption_alert_ignored',
      'task_avoidance',
      'interruption_single_task_focus',
      'interruption_possible_rigidity',
    ]) {
      expect(types, `${expected} must be logged`).toContain(expected);
    }

    const events = await getEvents(page);
    const avoidance = findEvent(events, 'task_avoidance');

    expect(avoidance?.study_item_ids).toEqual(['Q08']);
    expect(avoidance?.construct_id).toBe('productiveness');

    // One-shot: the beacon must not accept a second decision.
    await press(page, 'Space');
    await press(page, '1');

    const typesAfter = await getEventTypes(page);

    expect(
      typesAfter.filter((t) => t === 'interruption_new_task_chosen'),
    ).toHaveLength(0);
    expect(
      typesAfter.filter((t) => t === 'interruption_received'),
    ).toHaveLength(1);
  });
});
