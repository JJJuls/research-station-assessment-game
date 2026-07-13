import { expect, test } from '@playwright/test';

import { getEvents, press, selectPromptOption } from './helpers';
import {
  bootJourney,
  captureErrors,
  eventCount,
  expectNoRuntimeErrors,
  expectSessionMetadata,
  missionState,
  openStationAlcove,
  waitForEventCount,
} from './journey';

/**
 * ADV-2 (Sprint B Part 1, docs/testing/ADVERSARIAL-JOURNEY-PLAN.md):
 * reload during partial room state. A participant fails the repair once
 * (partial task state: failure recorded in the module-scope store, room
 * incomplete) and then the page reloads mid-room — the realistic
 * mid-session refresh/crash-recovery scenario. Documented semantics
 * (STATE-AND-SESSION-CONTINUITY.md): module-scope stores and the event log
 * reset on reload; URL-derived metadata persists. The scientific risk is a
 * PHANTOM abandon/return classification crossing the reload boundary —
 * repair_returned_after_failure must NOT fire on the post-reload entry,
 * because the failure evidence died with the previous JS session.
 */

const PARAMS = {
  participant_id: 'ADV2_P1',
  game_session_id: 'ADV2_S1',
  condition: 'adv_reload',
  scene: 'repair',
};

test.describe('adversarial: reload during partial room state', () => {
  test('mid-room reload resets task state without phantom return-after-failure', async ({
    page,
  }) => {
    const capture = captureErrors(page);

    // — Direct room launch, then a single failure (partial state) —
    await bootJourney(page, PARAMS, 'repair');
    await openStationAlcove(page); // repair panel prompt

    const failuresBefore = await eventCount(page, 'repair_failed');

    await selectPromptOption(page, 1); // default sequence -> deterministic failure
    await waitForEventCount(
      page,
      'repair_failed',
      undefined,
      failuresBefore + 1,
    );

    const preReload = await getEvents(page);

    expect(
      preReload.filter((e) => e.event_type === 'repair_failed').length,
    ).toBe(1);
    expect(preReload.map((e) => e.event_type)).not.toContain(
      'repair_completed',
    );

    // — Full reload on the same URL (fresh JS session, same launch params) —
    await bootJourney(page, PARAMS, 'repair');

    const postReload = await getEvents(page);
    const postTypes = postReload.map((e) => e.event_type);

    // Fresh append-only log: one session_start, first in the log; the
    // pre-reload failure is gone (raw logs are per-JS-session by design).
    expect(postTypes.indexOf('session_start')).toBe(0);
    expect(postTypes.filter((t) => t === 'session_start').length).toBe(1);
    expect(postTypes).not.toContain('repair_failed');

    // The room re-entered normally — and WITHOUT a phantom
    // return-after-failure: the module-scope failure state must not
    // survive the reload (no cross-boundary Q24/Q25 classification).
    expect(postTypes.filter((t) => t === 'repair_room_entered').length).toBe(1);
    expect(postTypes).not.toContain('repair_returned_after_failure');
    expect(postTypes).not.toContain('repair_abandoned');

    // URL-derived identity persists across the reload.
    expectSessionMetadata(postReload, {
      participant_id: 'ADV2_P1',
      game_session_id: 'ADV2_S1',
      condition: 'adv_reload',
    });

    // Mission state is fully reset (completed_rooms empty, room tracked).
    const stateAfterReload = await missionState(page);

    expect(stateAfterReload.current_room_id).toBe('systems_repair_room');
    expect(stateAfterReload.completed_rooms).toEqual([]);

    // — The session continues normally after the reload —
    await openStationAlcove(page);
    await selectPromptOption(page, 2); // consult the manual
    await waitForEventCount(page, 'repair_manual_used', undefined, 1);
    await press(page, 'Space'); // dismiss feedback, re-open the prompt
    await selectPromptOption(page, 3); // revised sequence -> completion
    await waitForEventCount(page, 'repair_completed', undefined, 1);

    const finalEvents = await getEvents(page);
    const finalTypes = finalEvents.map((e) => e.event_type);

    expect(finalTypes.filter((t) => t === 'repair_completed').length).toBe(1);
    // Still no phantom failure-family events from the pre-reload session.
    expect(finalTypes).not.toContain('repair_failed');
    expect(finalTypes).not.toContain('repair_returned_after_failure');

    const stateAfterCompletion = await missionState(page);

    expect(stateAfterCompletion.completed_rooms).toEqual([
      'systems_repair_room',
    ]);

    expectNoRuntimeErrors(capture);
  });
});
