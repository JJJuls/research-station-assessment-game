import { expect, test } from '@playwright/test';

import {
  bootGame,
  dockToHub,
  driveAxisTo,
  findEvent,
  findEvents,
  getEvents,
  getEventTypes,
  getSummary,
  hold,
  hubToStationDoor,
  press,
  waitForRoomEntry,
} from './helpers';
import { eventCount, waitForEventCount } from './journey';

/**
 * Optional Side Repair Bay logging (folded into the general room-coverage
 * pass per docs/testing/playwright-smoke-plan.md — no dedicated V3 §9 spec
 * name exists for this room).
 *
 * FABLE-NEXT-03 (task A): the accepted repair is a real three-step task
 * (parts shelf fetch -> console fit -> system check). Covered paths:
 * observed complete path, offer-stage defer reopenability, mid-task
 * defer-resume across rooms (progress kept, no offer inflation), the
 * legacy-verbatim ignore path, and the observed walk-away abandonment
 * after two real steps.
 */

async function hubToSideRepair(page: import('@playwright/test').Page) {
  await hubToStationDoor(page, 'optional_side_repair_bay');
  await waitForRoomEntry(page, 'side_repair_discovered');
}

/** Side bay spawn / floor -> utility bot: up clamps under the alcove. */
async function openBotPrompt(page: import('@playwright/test').Page) {
  await driveAxisTo(page, 'x', 320, 12);
  await hold(page, 'ArrowUp', 900);
  await press(page, 'Space');
}

/**
 * Bot/console -> parts shelf (96, 240): position-synced down to the row-8
 * lane, then a west clamp that stops against the row-7 flanking block's
 * east face (x ~144) — the shelf is inside the 72 px radius from there.
 */
async function fetchPartFromShelf(page: import('@playwright/test').Page) {
  await driveAxisTo(page, 'y', 272, 12);
  await hold(page, 'ArrowLeft', 2400);
  await press(page, 'Space');
  await press(page, '1'); // collect the replacement part
}

/** Any floor position -> Hub through the bottom-center door (x 320). */
async function exitToHub(page: import('@playwright/test').Page) {
  const before = await eventCount(page, 'station_hub_entered');

  await hold(page, 'ArrowDown', 2400);
  await driveAxisTo(page, 'x', 320, 20);
  await press(page, 'Space');
  await waitForEventCount(page, 'station_hub_entered', undefined, before + 1);
}

/** Hub -> side bay on a RE-entry (count-aware on the scene_start). */
async function reenterSideRepair(page: import('@playwright/test').Page) {
  const before = await eventCount(page, 'scene_start', 'side_repair');

  await hubToStationDoor(page, 'optional_side_repair_bay');
  await waitForEventCount(page, 'scene_start', 'side_repair', before + 1);
}

async function getSideRepairStatus(page: import('@playwright/test').Page) {
  return page.evaluate(
    () =>
      (
        window as unknown as {
          researchRuntime: {
            getMissionState: () => { side_repair_status: string };
          };
        }
      ).researchRuntime.getMissionState().side_repair_status,
  );
}

test.describe('side repair bay logging', () => {
  test('observed complete path: accept, fetch, fit, check — steps and families in order', async ({
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
    await press(page, '2'); // accept: start the stabiliser repair

    let types = await getEventTypes(page);

    for (const expected of [
      'side_repair_discovered',
      'side_repair_opened',
      'stabiliser_option_offered',
      'side_repair_started',
      'stabiliser_accepted',
      'side_repair_accepted',
    ]) {
      expect(types, `${expected} must be logged on accept`).toContain(expected);
    }
    // The first step is OBSERVED, never asserted at the accept press.
    expect(types).not.toContain('side_repair_first_step');
    expect(types).not.toContain('side_repair_step_completed');

    await fetchPartFromShelf(page);
    await openBotPrompt(page);
    await press(page, '1'); // adjust the misaligned mounting, seat the part
    await press(page, 'Space'); // re-open the console
    await press(page, '1'); // run the system check -> completion

    const events = await getEvents(page);

    types = events.map((e) => e.event_type);
    for (const expected of [
      'side_repair_first_step',
      'side_repair_step_completed',
      'side_repair_completed',
      'final_bonus_unlocked',
      'side_repair_productive_persistence',
    ]) {
      expect(types, `${expected} must be logged`).toContain(expected);
    }
    expect(types).not.toContain('side_repair_deferred');
    expect(types).not.toContain('side_repair_abandoned_after_start');
    expect(types).not.toContain('side_repair_abandoned_after_difficulty');

    // Exactly one observed step record per step, in fixed order, with the
    // additive metadata.step payload placement.
    const steps = findEvents(events, 'side_repair_step_completed');

    expect(steps.map((e) => (e.metadata as { step?: string })?.step)).toEqual([
      'fetch_component',
      'fit_component',
      'run_check',
    ]);
    // side_repair_first_step fires at the observed first step: after the
    // accept family, immediately before the fetch step record.
    expect(types.indexOf('side_repair_first_step')).toBeGreaterThan(
      types.indexOf('side_repair_accepted'),
    );
    expect(types.indexOf('side_repair_first_step')).toBe(
      types.indexOf('side_repair_step_completed') - 1,
    );

    // Offer events fire only while unaccepted: console re-opens after
    // acceptance never inflate the Q29-tagged opportunity count.
    expect(findEvents(events, 'stabiliser_option_offered')).toHaveLength(1);
    expect(findEvents(events, 'side_repair_opened')).toHaveLength(1);

    const accepted = findEvent(events, 'side_repair_accepted');
    const firstStep = findEvent(events, 'side_repair_first_step');
    const stepEvent = steps[0];
    const completed = findEvent(events, 'side_repair_completed');
    const bonus = findEvent(events, 'final_bonus_unlocked');

    expect(accepted?.room_id).toBe('optional_side_repair_bay');
    // Multi-row listing: construct deliberately unset.
    expect(accepted?.study_item_ids).toEqual(['Q07', 'Q16', 'Q20']);
    expect(accepted?.construct_id).toBeUndefined();
    expect(firstStep?.study_item_ids).toEqual(['Q20']);
    expect(firstStep?.construct_id).toBe('consistency_of_interest_exploratory');
    // The fetch step logs from the parts shelf station object.
    expect(firstStep?.object_id).toBe('side_repair_parts_shelf');
    expect(stepEvent?.study_item_ids).toEqual(['Q07', 'Q16']);
    expect(stepEvent?.construct_id).toBeUndefined();
    expect(completed?.study_item_ids).toEqual(['Q07', 'Q16', 'Q32']);
    expect(completed?.construct_id).toBeUndefined();
    expect(bonus?.study_item_ids).toEqual(['Q32']);
    expect(bonus?.construct_id).toBe('goal_time_exploratory');

    expect(await getSideRepairStatus(page)).toBe('completed');

    // One-shot after completion: the prompt must not reopen, nothing
    // double-logs.
    await press(page, 'Space');
    await press(page, '1');
    expect(
      findEvents(await getEvents(page), 'side_repair_completed'),
    ).toHaveLength(1);

    const summary = await getSummary(page);

    expect(summary.productiveness_completed_optional_task).toBe(true);
    expect(summary.productiveness_difficulty_abandonment_count).toBe(0);
  });

  test('offer-stage defer stays reopenable and distinct from abandonment', async ({
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
    await press(page, '3'); // formally defer (offer stage)

    const types = await getEventTypes(page);

    expect(types).toContain('side_repair_deferred');
    expect(types).not.toContain('side_repair_ignored');
    expect(types).not.toContain('side_repair_abandoned_after_start');
    expect(await getSideRepairStatus(page)).toBe('deferred');

    // Deferral does NOT close the offer: reopening presents it again and
    // accepting afterwards keeps the interim defer visible in the raw log
    // (never overwritten).
    await press(page, 'Space');
    await press(page, '2'); // accept on the reopened offer

    let events = await getEvents(page);

    expect(findEvents(events, 'side_repair_deferred')).toHaveLength(1);
    expect(findEvents(events, 'stabiliser_option_offered')).toHaveLength(2);
    expect(findEvents(events, 'side_repair_accepted')).toHaveLength(1);

    // Step-0 console branch: reviewing the work order logs nothing, and
    // deferring before any step is a real deferral act (no offer events
    // fire on the post-acceptance console).
    await press(page, 'Space');
    await press(page, '1'); // review the work order (no events)
    await press(page, 'Space');
    await press(page, '2'); // defer from the console at zero steps

    events = await getEvents(page);

    expect(findEvents(events, 'side_repair_deferred')).toHaveLength(2);
    expect(findEvents(events, 'stabiliser_option_offered')).toHaveLength(2);
    expect(findEvents(events, 'side_repair_step_completed')).toHaveLength(0);
    expect(findEvents(events, 'side_repair_first_step')).toHaveLength(0);
    expect(await getSideRepairStatus(page)).toBe('deferred');
  });

  test('mid-task defer keeps step progress across rooms without offer or step inflation', async ({
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
    await press(page, '2'); // accept
    await fetchPartFromShelf(page); // step 1 done
    await openBotPrompt(page);
    await press(page, '2'); // log the remaining work for later (defer)

    expect(await getSideRepairStatus(page)).toBe('deferred');

    // Leaving after a formal deferral is strategic postponement, never a
    // walk-away.
    await exitToHub(page);

    let events = await getEvents(page);

    expect(
      findEvents(events, 'side_repair_abandoned_after_start'),
    ).toHaveLength(0);
    expect(
      findEvents(events, 'side_repair_abandoned_after_difficulty'),
    ).toHaveLength(0);

    // Return and finish: progress kept (no second fetch), no new offer.
    await reenterSideRepair(page);
    await openBotPrompt(page);
    await press(page, '1'); // fit (step 2 — step 1 survived the round trip)
    await press(page, 'Space');
    await press(page, '1'); // check -> completion

    events = await getEvents(page);

    const steps = findEvents(events, 'side_repair_step_completed');

    expect(steps.map((e) => (e.metadata as { step?: string })?.step)).toEqual([
      'fetch_component',
      'fit_component',
      'run_check',
    ]);
    expect(findEvents(events, 'side_repair_deferred')).toHaveLength(1);
    expect(findEvents(events, 'stabiliser_option_offered')).toHaveLength(1);
    expect(findEvents(events, 'side_repair_completed')).toHaveLength(1);
    expect(findEvents(events, 'side_repair_first_step')).toHaveLength(1);
    expect(await getSideRepairStatus(page)).toBe('completed');
  });

  test('accepted-zero-step exit emits nothing and the task stays resumable', async ({
    page,
  }) => {
    await bootGame(page, {
      participant_id: 'E2E_P7',
      game_session_id: 'E2E_SIDE_S6',
      condition: 'pilot',
      game_version: 'e2e',
    });
    await dockToHub(page);
    await hubToSideRepair(page);

    await openBotPrompt(page);
    await press(page, '2'); // accept

    // Walk out with ZERO completed steps and no deferral: no approved
    // event exists for accepted-never-started abandonment (canonical
    // side_repair_abandoned stays a flagged candidate), so the exit must
    // emit nothing and must NOT close the decision.
    await exitToHub(page);

    let events = await getEvents(page);

    expect(
      findEvents(events, 'side_repair_abandoned_after_start'),
    ).toHaveLength(0);
    expect(
      findEvents(events, 'side_repair_abandoned_after_difficulty'),
    ).toHaveLength(0);
    expect(findEvents(events, 'side_repair_deferred')).toHaveLength(0);
    expect(await getSideRepairStatus(page)).toBe('not_started');

    // Return: the accepted task resumes (no re-offer, no re-accept) and
    // real work continues from step 1.
    await reenterSideRepair(page);
    await fetchPartFromShelf(page);

    events = await getEvents(page);

    expect(findEvents(events, 'stabiliser_option_offered')).toHaveLength(1);
    expect(findEvents(events, 'side_repair_accepted')).toHaveLength(1);
    expect(findEvents(events, 'side_repair_first_step')).toHaveLength(1);
    expect(
      findEvents(events, 'side_repair_step_completed').map(
        (e) => (e.metadata as { step?: string })?.step,
      ),
    ).toEqual(['fetch_component']);
  });

  test('ignore path: never-accepted, one-shot after decision', async ({
    page,
  }) => {
    await bootGame(page, {
      participant_id: 'E2E_P7',
      game_session_id: 'E2E_SIDE_S4',
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
    await press(page, '2');

    const events = await getEvents(page);

    expect(findEvents(events, 'side_repair_completed')).toHaveLength(0);
    expect(findEvents(events, 'stabiliser_option_offered')).toHaveLength(1);
  });

  test('walk-away after two real steps logs the observed abandonment pair once', async ({
    page,
  }) => {
    await bootGame(page, {
      participant_id: 'E2E_P7',
      game_session_id: 'E2E_SIDE_S5',
      condition: 'pilot',
      game_version: 'e2e',
    });
    await dockToHub(page);
    await hubToSideRepair(page);

    await openBotPrompt(page);
    await press(page, '2'); // accept
    await fetchPartFromShelf(page); // step 1
    await openBotPrompt(page);
    await press(page, '1'); // fit (step 2)

    // Real walk-away at step 2: exit without deferring.
    await exitToHub(page);

    const events = await getEvents(page);
    const types = events.map((e) => e.event_type);

    // Legacy alias + canonical name fire at the observed moment, in the
    // legacy option order.
    const abandonedDifficulty = findEvents(
      events,
      'side_repair_abandoned_after_difficulty',
    );
    const abandonedStart = findEvent(
      events,
      'side_repair_abandoned_after_start',
    );

    expect(abandonedDifficulty).toHaveLength(1);
    expect(
      findEvents(events, 'side_repair_abandoned_after_start'),
    ).toHaveLength(1);
    expect(types.indexOf('side_repair_abandoned_after_difficulty')).toBe(
      types.indexOf('side_repair_abandoned_after_start') - 1,
    );

    // Separation: abandonment-after-start is neither completion, formal
    // deferral, nor never-accepted ignoring.
    expect(types).not.toContain('side_repair_completed');
    expect(types).not.toContain('side_repair_deferred');
    expect(types).not.toContain('side_repair_ignored');
    expect(types).not.toContain('side_repair_low_effort');
    expect(types).not.toContain('final_bonus_unlocked');
    expect(types).not.toContain('side_repair_productive_persistence');

    // Canonical difficulty-abandonment name stays unregistered raw
    // telemetry: no research mapping fields (frozen data).
    expect(abandonedDifficulty[0].room_id).toBe('optional_side_repair_bay');
    expect(abandonedDifficulty[0].study_item_ids).toBeUndefined();
    expect(abandonedDifficulty[0].construct_id).toBeUndefined();
    expect(abandonedDifficulty[0].success).toBeUndefined();

    // Registered legacy alias keeps its frozen registration.
    expect(abandonedStart?.study_item_ids).toEqual(['Q20']);
    expect(abandonedStart?.construct_id).toBe(
      'consistency_of_interest_exploratory',
    );

    // Both real steps stay in the log; nothing double-fires on the exit.
    expect(
      findEvents(events, 'side_repair_step_completed').map(
        (e) => (e.metadata as { step?: string })?.step,
      ),
    ).toEqual(['fetch_component', 'fit_component']);

    // Scoring separation: the difficulty abandonment feeds exactly the
    // productiveness aggregates; completion stays untouched.
    const summary = await getSummary(page);

    expect(summary.productiveness_difficulty_abandonment_count).toBe(1);
    expect(summary.productiveness_side_task_count).toBe(1);
    expect(summary.productiveness_started_side_task).toBe(true);
    expect(summary.productiveness_completed_optional_task).toBe(false);
    expect(summary.productiveness_low_effort_count).toBe(0);

    expect(await getSideRepairStatus(page)).toBe('abandoned_after_start');

    // The walk-away closed the decision one-shot (legacy semantics): the
    // offer does not reopen and nothing new logs on a return visit.
    await reenterSideRepair(page);
    await openBotPrompt(page);
    await press(page, '1');

    const finalEvents = await getEvents(page);

    expect(findEvents(finalEvents, 'side_repair_completed')).toHaveLength(0);
    expect(findEvents(finalEvents, 'stabiliser_option_offered')).toHaveLength(
      1,
    );
    expect(
      findEvents(finalEvents, 'side_repair_abandoned_after_start'),
    ).toHaveLength(1);
  });
});
