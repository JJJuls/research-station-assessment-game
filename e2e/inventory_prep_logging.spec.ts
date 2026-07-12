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
 * V3 §9 spec: inventory_prep_logging.spec.ts — shortcut, systematic
 * (+ verification/cleanup sub-steps), and sort-and-verify paths, with
 * SessionState propagation for the Final Core flags.
 *
 * NOTE (Wave 1A): authored compile-only — Playwright execution is disabled
 * in the authoring session; routes/choreography must be tuned/verified in
 * this room's playwright-game-verify pass.
 */

async function hubToInventory(page: import('@playwright/test').Page) {
  await hubToStationDoor(page, 'inventory_prep_room');
  await waitForRoomEntry(page, 'inventory_room_entered');
}

/** Inventory spawn -> quartermaster console: up clamps under the alcove. */
async function openConsole(page: import('@playwright/test').Page) {
  await hold(page, 'ArrowUp', 900);
  await press(page, 'Space');
}

async function getMissionState(page: import('@playwright/test').Page) {
  return page.evaluate(() =>
    (
      window as unknown as {
        researchRuntime: {
          getMissionState: () => {
            prepared_items: string[];
            workspace_status: string;
          };
        };
      }
    ).researchRuntime.getMissionState(),
  );
}

test.describe('inventory prep logging', () => {
  test('shortcut path: incomplete kit, disorder, verification skipped', async ({
    page,
  }) => {
    await bootGame(page, {
      participant_id: 'E2E_P6',
      game_session_id: 'E2E_INV_S1',
      condition: 'pilot',
      game_version: 'e2e',
    });
    await dockToHub(page);
    await hubToInventory(page);

    await openConsole(page);
    await press(page, '1'); // grab tools quickly

    const types = await getEventTypes(page);

    for (const expected of [
      'inventory_room_entered',
      'inventory_prep_opened',
      'inventory_prep_shortcut',
      'inventory_required_item_missed',
      'missing_item',
      'inventory_disorganized_action',
      'workspace_left_disordered',
      'inventory_verification_skipped',
    ]) {
      expect(types, `${expected} must be logged`).toContain(expected);
    }
    // Q01 checklist signal must NOT fire on the shortcut path (emission
    // placement rule: checklist_opened belongs to the checklist option).
    expect(types).not.toContain('inventory_checklist_opened');
    expect(types).not.toContain('inventory_checklist_used');

    const events = await getEvents(page);
    const disordered = findEvent(events, 'workspace_left_disordered');
    const skipped = findEvent(events, 'inventory_verification_skipped');

    expect(disordered?.room_id).toBe('inventory_prep_room');
    expect(disordered?.study_item_ids).toEqual(['Q04']);
    expect(disordered?.construct_id).toBe('organisation');
    // Dual-listed Q02+Q30: construct deliberately unset.
    expect(skipped?.study_item_ids).toEqual(['Q02', 'Q30']);
    expect(skipped?.construct_id).toBeUndefined();

    const mission = await getMissionState(page);

    expect(mission.prepared_items).not.toContain('field_kit');
    expect(mission.workspace_status).toBe('disordered');
  });

  test('systematic path: checklist -> verify -> tidy, kit propagated', async ({
    page,
  }) => {
    await bootGame(page, {
      participant_id: 'E2E_P6',
      game_session_id: 'E2E_INV_S2',
      condition: 'pilot',
      game_version: 'e2e',
    });
    await dockToHub(page);
    await hubToInventory(page);

    await openConsole(page);
    await press(page, '2'); // checklist + ordered packing
    await press(page, '1'); // verification stage: run the check
    await press(page, '1'); // cleanup stage: sort the workspace

    const types = await getEventTypes(page);

    for (const expected of [
      'inventory_checklist_used',
      'inventory_checklist_opened',
      'inventory_required_tools_packed',
      'correct_tool_selected',
      'inventory_systematic_prep',
      'inventory_sequence_followed',
      'inventory_verified_complete',
      'workspace_tidy_confirmed',
      'cleanup_completed',
    ]) {
      expect(types, `${expected} must be logged`).toContain(expected);
    }
    expect(types).not.toContain('inventory_verification_skipped');
    expect(types).not.toContain('workspace_left_disordered');

    const events = await getEvents(page);
    const checklist = findEvent(events, 'inventory_checklist_opened');
    const verified = findEvent(events, 'inventory_verified_complete');
    const cleanup = findEvent(events, 'cleanup_completed');

    expect(checklist?.study_item_ids).toEqual(['Q01']);
    expect(checklist?.construct_id).toBe('organisation');
    // Q30 — optional/exploratory Goal-Time proxy.
    expect(verified?.study_item_ids).toEqual(['Q30']);
    expect(verified?.construct_id).toBe('goal_time_exploratory');
    expect(cleanup?.study_item_ids).toEqual(['Q04']);
    expect(cleanup?.construct_id).toBe('organisation');

    const mission = await getMissionState(page);

    expect(mission.prepared_items).toContain('field_kit');
    expect(mission.workspace_status).toBe('tidy');

    // One-shot: console re-open must not allow a second submission.
    await openConsole(page);
    await press(page, '1');

    const typesAfter = await getEventTypes(page);

    expect(
      typesAfter.filter((t) => t === 'inventory_prep_shortcut'),
    ).toHaveLength(0);
  });

  test('systematic path with skipped verification and disordered exit', async ({
    page,
  }) => {
    await bootGame(page, {
      participant_id: 'E2E_P6',
      game_session_id: 'E2E_INV_S3',
      condition: 'pilot',
      game_version: 'e2e',
    });
    await dockToHub(page);
    await hubToInventory(page);

    await openConsole(page);
    await press(page, '2'); // checklist + ordered packing
    await press(page, '2'); // verification stage: skip the check
    await press(page, '2'); // cleanup stage: leave the bench

    const types = await getEventTypes(page);

    expect(types).toContain('inventory_verification_skipped');
    expect(types).toContain('workspace_left_disordered');
    expect(types).not.toContain('inventory_verified_complete');
    expect(types).not.toContain('workspace_tidy_confirmed');

    const mission = await getMissionState(page);

    // Kit packed (checklist path) but process signals independent of
    // outcome: skipped verification + disorder both recorded.
    expect(mission.prepared_items).toContain('field_kit');
    expect(mission.workspace_status).toBe('disordered');
  });
});
