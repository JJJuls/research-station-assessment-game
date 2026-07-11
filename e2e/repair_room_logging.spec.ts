import { expect, test } from '@playwright/test';

import {
  bootGame,
  dockToHub,
  findEvent,
  getEvents,
  getEventTypes,
  getSummary,
  hold,
  hubToStationDoor,
  press,
  waitForRoomEntry,
} from './helpers';

/**
 * V3 §9 spec: repair_room_logging.spec.ts — Systems Repair Room logging
 * through the connected world (Dock -> Hub -> Repair), adaptive
 * manual-then-revision path and blind repeat-failed-sequence path, plus
 * the adaptive-vs-inappropriate persistence separation invariant.
 *
 * NOTE (Wave 1A): authored compile-only — Playwright execution is disabled
 * in the authoring session; the hubToStationDoor route and in-room
 * choreography must be tuned/verified in this room's
 * playwright-game-verify pass before results are trusted.
 */

async function hubToRepair(page: import('@playwright/test').Page) {
  await hubToStationDoor(page, 'systems_repair_room');
  await waitForRoomEntry(page, 'repair_room_entered');
}

/** Repair spawn -> panel: up clamps under the console alcove. */
async function openRepairPanel(page: import('@playwright/test').Page) {
  await hold(page, 'ArrowUp', 900);
  await press(page, 'Space');
}

test.describe('repair room logging', () => {
  test('adaptive path: default failure -> manual -> revised sequence', async ({
    page,
  }) => {
    await bootGame(page, {
      participant_id: 'E2E_P4',
      game_session_id: 'E2E_REP_S1',
      condition: 'pilot',
      game_version: 'e2e',
    });
    await dockToHub(page);
    await hubToRepair(page);

    await openRepairPanel(page);
    await press(page, '1'); // default sequence — deterministic scripted failure
    await press(page, 'Space');
    await press(page, '2'); // open repair manual (legacy repair_manual_used)
    await press(page, 'Space');
    await press(page, '3'); // revised sequence — success path

    const types = await getEventTypes(page);

    for (const expected of [
      'repair_room_entered',
      'repair_panel_opened',
      'repair_attempt',
      'repair_sequence_submitted',
      'repair_failed',
      'repair_manual_used',
      'repair_strategy_revision',
      'repair_completed',
    ]) {
      expect(types, `${expected} must be logged`).toContain(expected);
    }
    expect(types).not.toContain('repair_same_sequence_repeated');
    expect(types).not.toContain('repair_abandoned');
    // Deliberately unemitted (documentation conflict — see U4 note).
    expect(types).not.toContain('task_started');

    const events = await getEvents(page);
    const failed = findEvent(events, 'repair_failed');
    const revision = findEvent(events, 'repair_strategy_revision');
    const completed = findEvent(events, 'repair_completed');

    expect(failed?.room_id).toBe('systems_repair_room');
    expect(failed?.study_item_ids).toEqual(['Q14', 'Q21']);
    expect(failed?.construct_id).toBe('adaptive_persistence');
    expect(failed?.success).toBe(false);
    expect(revision?.study_item_ids).toEqual(['Q14', 'Q21', 'Q23']);
    expect(revision?.success).toBe(true);
    expect(completed?.study_item_ids).toEqual(['Q06', 'Q14', 'Q21']);
    expect(completed?.construct_id).toBeUndefined();

    // Separation invariant: a purely adaptive path never touches the
    // inappropriate-persistence variables.
    const summary = await getSummary(page);

    expect(summary.game_inappropriate_persistence).toBe(0);
    expect(summary.blind_retry_count).toBe(0);
  });

  test('blind retry logs the repeated variant, not a duplicate repair_failed', async ({
    page,
  }) => {
    await bootGame(page, {
      participant_id: 'E2E_P4',
      game_session_id: 'E2E_REP_S2',
      condition: 'pilot',
      game_version: 'e2e',
    });
    await dockToHub(page);
    await hubToRepair(page);

    await openRepairPanel(page);
    await press(page, '1'); // default sequence fails
    await press(page, 'Space');
    await press(page, '1'); // SAME failed sequence again

    const types = await getEventTypes(page);

    expect(types.filter((t) => t === 'repair_failed')).toHaveLength(1);
    expect(
      types.filter((t) => t === 'repair_same_sequence_repeated'),
    ).toHaveLength(1);

    const events = await getEvents(page);
    const repeated = findEvent(events, 'repair_same_sequence_repeated');

    expect(repeated?.study_item_ids).toEqual(['Q26']);
    expect(repeated?.construct_id).toBe('inappropriate_persistence');
    expect(repeated?.success).toBe(false);

    const summary = await getSummary(page);

    expect(summary.game_inappropriate_persistence).toBe(1);
    expect(summary.blind_retry_count).toBe(1);
  });

  test('manual station logs opened + page reviewed; leave-and-return logs abandoned + returned', async ({
    page,
  }) => {
    await bootGame(page, {
      participant_id: 'E2E_P4',
      game_session_id: 'E2E_REP_S3',
      condition: 'pilot',
      game_version: 'e2e',
    });
    await dockToHub(page);
    await hubToRepair(page);

    await openRepairPanel(page);
    await press(page, '1'); // fail once so abandon/return arms

    // Walk to the manual station (left block, x 96 / y 208 from panel
    // area): clamp west, then down a short leg.
    await hold(page, 'ArrowLeft', 2000);
    await hold(page, 'ArrowDown', 400);
    await press(page, 'Space');

    // Leave unresolved via the Hub door (bottom-center), then return.
    await hold(page, 'ArrowRight', 1400);
    await hold(page, 'ArrowDown', 2200);
    await press(page, 'Space');
    await waitForRoomEntry(page, 'station_hub_entered');
    await hubToRepair(page);

    const types = await getEventTypes(page);

    expect(types).toContain('repair_manual_opened');
    expect(types).toContain('manual_page_reviewed');
    expect(types).toContain('repair_abandoned');
    expect(types).toContain('repair_returned_after_failure');

    const events = await getEvents(page);
    const opened = findEvent(events, 'repair_manual_opened');
    const reviewed = findEvent(events, 'manual_page_reviewed');
    const abandoned = findEvent(events, 'repair_abandoned');
    const returned = findEvent(events, 'repair_returned_after_failure');

    expect(opened?.room_id).toBe('systems_repair_room');
    expect(reviewed?.study_item_ids).toEqual(['Q22']);
    expect(reviewed?.construct_id).toBe('adaptive_persistence');
    // Q24/Q25 mapping with construct_id deliberately unset (open
    // psychometric decision — F1 precedent).
    expect(abandoned?.study_item_ids).toEqual(['Q24']);
    expect(abandoned?.construct_id).toBeUndefined();
    expect(returned?.study_item_ids).toEqual(['Q24', 'Q25']);
    expect(returned?.construct_id).toBeUndefined();
  });
});
