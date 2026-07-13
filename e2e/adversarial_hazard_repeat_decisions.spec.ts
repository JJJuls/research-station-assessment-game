import { expect, test } from '@playwright/test';

import {
  eventContext,
  findEvents,
  getEvents,
  getSummary,
  press,
  selectPromptOption,
} from './helpers';
import {
  bootJourney,
  captureErrors,
  eventCount,
  expectNoRuntimeErrors,
  hubToStationJourney,
  missionState,
  openStationAlcove,
  stationToHubJourney,
  waitForEventCount,
} from './journey';

/**
 * ADV-4 (Sprint B Part 1, docs/testing/ADVERSARIAL-JOURNEY-PLAN.md):
 * repeated Hazard decisions within a visit and across re-entries. The
 * prototype-ported prompt is deliberately repeatable (NO one-shot decision
 * gate — HazardScene doc comment), so this spec pins the authored
 * consequences of a participant deciding more than once:
 *  - warning fires on every prompt open, decisions log once per selection;
 *  - hazard_status is last-write-wins across repeated decisions;
 *  - abandonment_count counts every legacy hazard_avoidance occurrence;
 *  - the session-lifetime infoChecked flag keeps later continues informed
 *    across re-entries (hazard spec t4 precedent), never reckless.
 * Reckless-branch repeats stay in the existing hazard spec's separate
 * session (mutually exclusive with info-checking — A4 rule).
 */

test.describe('adversarial: repeated hazard decisions', () => {
  test('repeat decisions log per selection; status is last-write; avoidance counts accumulate', async ({
    page,
  }) => {
    test.setTimeout(300_000);

    const capture = captureErrors(page);

    await bootJourney(
      page,
      {
        participant_id: 'ADV4_P1',
        game_session_id: 'ADV4_S1',
        condition: 'adv_hazard',
        scene: 'hazard',
      },
      'hazard',
    );

    // — Visit 1: avoid twice in one visit (repeatable prompt, no gate) —
    let warnings = await eventCount(page, 'hazard_warning_seen');

    await openStationAlcove(page);
    await waitForEventCount(
      page,
      'hazard_warning_seen',
      undefined,
      warnings + 1,
    );
    await selectPromptOption(page, 3); // avoid uncertain route
    await waitForEventCount(page, 'hazard_route_avoided', undefined, 1);

    expect((await missionState(page)).hazard_status).toBe('route_avoided');

    warnings = await eventCount(page, 'hazard_warning_seen');
    await press(page, 'Space'); // feedback dismiss -> prompt re-opens
    await waitForEventCount(
      page,
      'hazard_warning_seen',
      undefined,
      warnings + 1,
    );
    await selectPromptOption(page, 3); // avoid AGAIN
    await waitForEventCount(page, 'hazard_route_avoided', undefined, 2);

    expect(await eventCount(page, 'hazard_avoidance')).toBe(2);

    // — Re-entry: decide differently (check info, then continue) —
    await stationToHubJourney(page, 'hazard_control_room');
    await hubToStationJourney(page, 'hazard_control_room');

    warnings = await eventCount(page, 'hazard_warning_seen');
    await openStationAlcove(page);
    await waitForEventCount(
      page,
      'hazard_warning_seen',
      undefined,
      warnings + 1,
    );
    await selectPromptOption(page, 1); // check hazard detail
    await waitForEventCount(page, 'hazard_info_checked', undefined, 1);
    await press(page, 'Space');
    await selectPromptOption(page, 2); // continue -> informed (info checked)
    await waitForEventCount(page, 'hazard_informed_continue', undefined, 1);

    // Last decision wins in mission state.
    expect((await missionState(page)).hazard_status).toBe('informed_continue');

    // — Second re-entry: continue directly; the session-lifetime
    //   infoChecked flag keeps the classification informed —
    await stationToHubJourney(page, 'hazard_control_room');
    await hubToStationJourney(page, 'hazard_control_room');

    await openStationAlcove(page);
    await selectPromptOption(page, 2); // continue without re-checking
    await waitForEventCount(page, 'hazard_informed_continue', undefined, 2);

    const events = await getEvents(page);

    // No reckless event anywhere on this path.
    expect(findEvents(events, 'hazard_reckless_continue').length).toBe(0);

    // Frozen scientific pins. D1: route_avoided is telemetry-only; the
    // legacy avoidance event carries no canonical mapping at all.
    for (const event of findEvents(events, 'hazard_route_avoided')) {
      expect(eventContext(event)).toEqual({
        room_id: 'hazard_control_room',
        study_item_ids: [],
        construct_id: undefined,
        success: undefined,
      });
    }

    for (const event of findEvents(events, 'hazard_avoidance')) {
      expect(event.study_item_ids).toBeUndefined();
      expect(event.construct_id).toBeUndefined();
    }

    const informed = findEvents(events, 'hazard_informed_continue');

    expect(informed.length).toBe(2);

    for (const event of informed) {
      expect(eventContext(event)).toEqual({
        room_id: 'hazard_control_room',
        study_item_ids: ['Q31'],
        construct_id: 'goal_time_exploratory',
        success: undefined,
      });
    }

    // Legacy summary derivations across repeated decisions: every
    // hazard_avoidance counts (abandonment_count = 2); uncertainty
    // persistence = info_checked (1) + informed_continue (2); the
    // maladaptive lane stays untouched.
    const summary = await getSummary(page);

    expect(summary.abandonment_count).toBe(2);
    expect(summary.game_uncertainty_persistence).toBe(3);
    expect(summary.game_inappropriate_persistence).toBe(0);
    expect(summary.blind_retry_count).toBe(0);

    expectNoRuntimeErrors(capture);
  });
});
