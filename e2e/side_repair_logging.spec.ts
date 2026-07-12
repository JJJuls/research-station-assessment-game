import { expect, test } from '@playwright/test';

import {
  bootGame,
  dockToHub,
  findEvent,
  findEvents,
  getEvents,
  getEventTypes,
  hold,
  hubToStationDoor,
  press,
  waitForRoomEntry,
} from './helpers';

/**
 * Optional Side Repair Bay logging (folded into the general room-coverage
 * pass per docs/testing/playwright-smoke-plan.md — no dedicated V3 §9 spec
 * name exists for this room): ignore, complete, and formal-defer paths,
 * with the defer-vs-abandon separation the contract names as a
 * confound-control requirement.
 *
 * NOTE (Wave 1A): authored compile-only — Playwright execution is disabled
 * in the authoring session; routes/choreography must be tuned/verified in
 * this room's playwright-game-verify pass.
 */

async function hubToSideRepair(page: import('@playwright/test').Page) {
  await hubToStationDoor(page, 'optional_side_repair_bay');
  await waitForRoomEntry(page, 'side_repair_discovered');
}

/** Side bay spawn -> utility bot: up clamps under the alcove. */
async function openBotPrompt(page: import('@playwright/test').Page) {
  await hold(page, 'ArrowUp', 900);
  await press(page, 'Space');
}

async function getSideRepairStatus(page: import('@playwright/test').Page) {
  return page.evaluate(
    () =>
      (
        window as unknown as {
          researchRuntime: {
            sessionState: {
              getMissionState: () => { side_repair_status: string };
            };
          };
        }
      ).researchRuntime.sessionState.getMissionState().side_repair_status,
  );
}

test.describe('side repair bay logging', () => {
  test('complete path: accept/start decomposition + bonus unlock', async ({
    page,
  }) => {
    await bootGame(page, {
      participant_id: 'E2E_P7',
      game_session_id: 'E2E_SIDE_S1',
      condition: 'pilot',
      game_version: 'e2e',
    });
    await dockToHub(page);
    await hubToSideRepair(page);

    await openBotPrompt(page);
    await press(page, '3'); // work through and complete

    const types = await getEventTypes(page);

    for (const expected of [
      'side_repair_discovered',
      'side_repair_opened',
      'stabiliser_option_offered',
      'side_repair_started',
      'stabiliser_accepted',
      'side_repair_accepted',
      'side_repair_first_step',
      'side_repair_completed',
      'final_bonus_unlocked',
      'side_repair_productive_persistence',
    ]) {
      expect(types, `${expected} must be logged`).toContain(expected);
    }
    expect(types).not.toContain('side_repair_deferred');
    expect(types).not.toContain('side_repair_abandoned_after_start');

    const events = await getEvents(page);
    const accepted = findEvent(events, 'side_repair_accepted');
    const firstStep = findEvent(events, 'side_repair_first_step');
    const completed = findEvent(events, 'side_repair_completed');
    const bonus = findEvent(events, 'final_bonus_unlocked');

    expect(accepted?.room_id).toBe('optional_side_repair_bay');
    // Multi-row listing: construct deliberately unset.
    expect(accepted?.study_item_ids).toEqual(['Q07', 'Q16', 'Q20']);
    expect(accepted?.construct_id).toBeUndefined();
    expect(firstStep?.study_item_ids).toEqual(['Q20']);
    expect(firstStep?.construct_id).toBe('consistency_of_interest_exploratory');
    expect(completed?.study_item_ids).toEqual(['Q07', 'Q16', 'Q32']);
    expect(completed?.construct_id).toBeUndefined();
    expect(bonus?.study_item_ids).toEqual(['Q32']);
    expect(bonus?.construct_id).toBe('goal_time_exploratory');

    expect(await getSideRepairStatus(page)).toBe('completed');
  });

  test('defer path stays reopenable and distinct from abandonment', async ({
    page,
  }) => {
    await bootGame(page, {
      participant_id: 'E2E_P7',
      game_session_id: 'E2E_SIDE_S2',
      condition: 'pilot',
      game_version: 'e2e',
    });
    await dockToHub(page);
    await hubToSideRepair(page);

    await openBotPrompt(page);
    await press(page, '4'); // formally defer

    let types = await getEventTypes(page);

    expect(types).toContain('side_repair_deferred');
    expect(types).not.toContain('side_repair_ignored');
    expect(types).not.toContain('side_repair_abandoned_after_start');
    expect(await getSideRepairStatus(page)).toBe('deferred');

    // Deferral does NOT close the offer: reopening presents it again and
    // completing afterwards logs the full interim history (defer visible,
    // never overwritten).
    await press(page, 'Space');
    await press(page, '3');

    types = await getEventTypes(page);

    const events = await getEvents(page);

    expect(findEvents(events, 'side_repair_deferred')).toHaveLength(1);
    expect(findEvents(events, 'stabiliser_option_offered')).toHaveLength(2);
    expect(types).toContain('side_repair_completed');
    expect(await getSideRepairStatus(page)).toBe('completed');
  });

  test('ignore path: never-accepted, one-shot after decision', async ({
    page,
  }) => {
    await bootGame(page, {
      participant_id: 'E2E_P7',
      game_session_id: 'E2E_SIDE_S3',
      condition: 'pilot',
      game_version: 'e2e',
    });
    await dockToHub(page);
    await hubToSideRepair(page);

    await openBotPrompt(page);
    await press(page, '1'); // ignore and move on

    const types = await getEventTypes(page);

    expect(types).toContain('side_repair_ignored');
    expect(types).toContain('side_repair_low_effort');
    expect(types).not.toContain('side_repair_accepted');
    expect(types).not.toContain('stabiliser_accepted');
    expect(await getSideRepairStatus(page)).toBe('ignored');

    // Decision logged: the prompt must not reopen.
    await press(page, 'Space');
    await press(page, '3');

    const events = await getEvents(page);

    expect(findEvents(events, 'side_repair_completed')).toHaveLength(0);
    expect(findEvents(events, 'stabiliser_option_offered')).toHaveLength(1);
  });
});
