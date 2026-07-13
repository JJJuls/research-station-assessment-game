import { expect, test } from '@playwright/test';

import {
  eventContext,
  findEvents,
  getEvents,
  press,
  selectPromptOption,
} from './helpers';
import {
  bootJourney,
  captureErrors,
  completeDockTutorial,
  dockToHubJourney,
  eventCount,
  expectNoRuntimeErrors,
  hubToStationJourney,
  missionState,
  openStationAlcove,
  stationToHubJourney,
  waitForEventCount,
} from './journey';

/**
 * ADV-3 (Sprint B Part 1, docs/testing/ADVERSARIAL-JOURNEY-PLAN.md):
 * repeated Archive entry/exit around a failure — the first live coverage of
 * the registered Q24/Q25 event `archive_returned_after_failure` (flagged
 * untested by the traceability matrix). Asserts the authored semantics
 * pinned in ArchiveScene/roomTaskState byte-for-byte:
 *  - archive_abandoned fires on EVERY exit while a failure happened and the
 *    task is incomplete;
 *  - archive_returned_after_failure fires once per such departure on
 *    re-entry while still incomplete;
 *  - the same wrong code again logs the repeated variant, never a duplicate
 *    archive_wrong_code;
 *  - after completion, exits and re-entries log neither event.
 */

test.describe('adversarial: archive abandon/return cycles', () => {
  test('abandon and return classify per departure, and stop after completion', async ({
    page,
  }) => {
    test.setTimeout(360_000);

    const capture = captureErrors(page);

    await bootJourney(page, {
      participant_id: 'ADV3_P1',
      game_session_id: 'ADV3_S1',
      condition: 'adv_cycle',
    });
    await completeDockTutorial(page, 1);
    await dockToHubJourney(page);

    // — Cycle 0: fail once, then leave —
    await hubToStationJourney(page, 'archive_room');
    await openStationAlcove(page); // archive terminal
    await selectPromptOption(page, 1); // naive code A17 — scripted failure
    await waitForEventCount(page, 'archive_wrong_code', undefined, 1);
    await stationToHubJourney(page, 'archive_room');

    expect(await eventCount(page, 'archive_abandoned')).toBe(1);
    expect(await eventCount(page, 'archive_returned_after_failure')).toBe(0);

    // — Cycle 1: return (classified), leave again without a new attempt —
    await hubToStationJourney(page, 'archive_room');
    await waitForEventCount(
      page,
      'archive_returned_after_failure',
      undefined,
      1,
    );
    await stationToHubJourney(page, 'archive_room');

    // hadFailure persists while incomplete: every exit re-abandons.
    expect(await eventCount(page, 'archive_abandoned')).toBe(2);

    // — Cycle 2: return again (one-shot per departure), repeat the SAME
    //   wrong code, then complete via feedback + revision —
    await hubToStationJourney(page, 'archive_room');
    await waitForEventCount(
      page,
      'archive_returned_after_failure',
      undefined,
      2,
    );

    await openStationAlcove(page);
    await selectPromptOption(page, 1); // identical wrong code
    await waitForEventCount(
      page,
      'archive_same_wrong_code_repeated',
      undefined,
      1,
    );
    await press(page, 'Space');
    await selectPromptOption(page, 2); // read feedback
    await waitForEventCount(page, 'archive_feedback_used', undefined, 1);
    await press(page, 'Space');
    await selectPromptOption(page, 3); // revised query — completes
    await waitForEventCount(page, 'archive_completed', undefined, 1);

    const events = await getEvents(page);

    // didRepeat: the repeat replaced the plain failure event.
    expect(findEvents(events, 'archive_wrong_code').length).toBe(1);
    expect(findEvents(events, 'archive_same_wrong_code_repeated').length).toBe(
      1,
    );

    // Frozen scientific pins (CANONICAL_EVENT_CONTEXT) for the Q24/Q25
    // family — construct deliberately unset pending the D4 ruling.
    const abandoned = findEvents(events, 'archive_abandoned');
    const returned = findEvents(events, 'archive_returned_after_failure');

    expect(abandoned.length).toBe(2);
    expect(returned.length).toBe(2);

    for (const event of abandoned) {
      expect(eventContext(event)).toEqual({
        room_id: 'archive_room',
        study_item_ids: ['Q24'],
        construct_id: undefined,
        success: undefined,
      });
    }

    for (const event of returned) {
      expect(eventContext(event)).toEqual({
        room_id: 'archive_room',
        study_item_ids: ['Q24', 'Q25'],
        construct_id: undefined,
        success: undefined,
      });
    }

    // dock_arrival completes with the tutorial; archive joins on revision.
    expect((await missionState(page)).completed_rooms).toEqual([
      'dock_arrival',
      'archive_room',
    ]);

    // — Post-completion cycle: neither event may fire again —
    await stationToHubJourney(page, 'archive_room');
    await hubToStationJourney(page, 'archive_room');

    expect(await eventCount(page, 'archive_abandoned')).toBe(2);
    expect(await eventCount(page, 'archive_returned_after_failure')).toBe(2);

    // Repair never completed, so the cross-room one-shot must be absent.
    expect(await eventCount(page, 'objective_completed')).toBe(0);

    expectNoRuntimeErrors(capture);
  });
});
