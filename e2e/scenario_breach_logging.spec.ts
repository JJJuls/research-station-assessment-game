import { expect, test } from '@playwright/test';

import {
  findEvent,
  findEvents,
  getEvents,
  getLastFeedbackText,
  inventoryToSealLog,
  scenarioProbe,
  selectPromptOption,
} from './helpers';
import {
  bootJourney,
  captureErrors,
  eventCount,
  expectEventSubsequence,
  expectNoRuntimeErrors,
  hubToStationJourney,
  missionState,
  openStationAlcove,
  stationToHubJourney,
  waitForEventCount,
} from './journey';

/**
 * Pilot Scenario D — colleague protocol breach (Inventory / Prep Room,
 * src/scenarios framework). Room-isolation spec via the direct
 * ?scene=inventory launch.
 *
 * scenario_* events are pilot-development telemetry: every payload is
 * asserted UNMAPPED (no study_item_ids, no construct_id, no success) with
 * metadata.scenario_id present — the governance contract for this unit.
 */

const SCENARIO_ID = 'protocol_breach';

test.describe('pilot scenario: colleague protocol breach', () => {
  test('activation, evidence dwell, optional info, selection, revision, commit, consequence, completion, duplicate-completion gate', async ({
    page,
  }) => {
    test.setTimeout(300_000);

    const capture = captureErrors(page);

    await bootJourney(
      page,
      {
        participant_id: 'SCN_D1',
        game_session_id: 'SCN_D1_S',
        condition: 'pilot_scenario',
        scene: 'inventory',
      },
      'inventory',
    );

    // — Activation —
    await inventoryToSealLog(page);
    await waitForEventCount(page, 'scenario_entered', 'inventory', 1);

    let events = await getEvents(page);
    const entered = findEvent(events, 'scenario_entered');

    expect(entered?.room_id).toBe('inventory_prep_room');
    expect(entered?.object_id).toBe('inventory_seal_log_terminal');
    expect(entered?.metadata?.scenario_id).toBe(SCENARIO_ID);
    // Governance: pilot telemetry stays unmapped.
    expect(entered?.study_item_ids).toBeUndefined();
    expect(entered?.construct_id).toBeUndefined();
    expect(entered?.success).toBeUndefined();
    expect(findEvents(events, 'scenario_briefing_opened')).toHaveLength(1);

    // — Evidence: cycle log (option 1), return (option 1) —
    await selectPromptOption(page, 1);
    await waitForEventCount(page, 'scenario_evidence_opened', 'inventory', 1);
    await selectPromptOption(page, 1);
    await waitForEventCount(page, 'scenario_evidence_closed', 'inventory', 1);

    events = await getEvents(page);
    const opened = findEvent(events, 'scenario_evidence_opened');
    const closed = findEvent(events, 'scenario_evidence_closed');

    expect(opened?.metadata?.evidence_id).toBe('cycle_log');
    expect(opened?.metadata?.optional).toBe(false);
    expect(closed?.metadata?.evidence_id).toBe('cycle_log');
    expect(closed?.metadata?.dwell_ms as number).toBeGreaterThanOrEqual(0);

    // — Optional info: outbound manifest (option 3), return —
    await selectPromptOption(page, 3);
    await waitForEventCount(
      page,
      'scenario_optional_info_requested',
      'inventory',
      1,
    );
    await selectPromptOption(page, 1);
    await waitForEventCount(page, 'scenario_evidence_closed', 'inventory', 2);

    events = await getEvents(page);
    const optional = findEvent(events, 'scenario_optional_info_requested');

    expect(optional?.metadata?.evidence_id).toBe('outbound_manifest');

    // — Decision: option 4 opens the sign-off; select "log as fault" —
    await selectPromptOption(page, 4);
    await selectPromptOption(page, 2);
    await waitForEventCount(page, 'scenario_option_selected', 'inventory', 1);

    events = await getEvents(page);
    const firstSelection = findEvent(events, 'scenario_option_selected');

    expect(firstSelection?.choice_value).toBe('log_as_fault');
    expect(firstSelection?.metadata?.reselected).toBe(false);

    // — Revision: reconsider (option 2), require the correction instead —
    await selectPromptOption(page, 2);
    await selectPromptOption(page, 3);
    await waitForEventCount(page, 'scenario_option_changed', 'inventory', 1);

    events = await getEvents(page);
    const changed = findEvent(events, 'scenario_option_changed');

    expect(changed?.metadata?.previous_value).toBe('log_as_fault');
    expect(changed?.metadata?.new_value).toBe('private_correction');
    expect(changed?.metadata?.change_number).toBe(1);

    // — Commit (option 1 on the confirm stage) —
    await selectPromptOption(page, 1);
    await waitForEventCount(
      page,
      'scenario_decision_committed',
      'inventory',
      1,
    );

    events = await getEvents(page);
    const committed = findEvent(events, 'scenario_decision_committed');

    expect(committed?.choice_value).toBe('private_correction');
    expect(committed?.metadata?.changes_before_commit).toBe(1);
    expect(committed?.metadata?.evidence_viewed_count).toBe(2);
    expect(committed?.metadata?.optional_info_requested).toBe(true);
    expect(
      committed?.metadata?.commit_latency_ms as number,
    ).toBeGreaterThanOrEqual(0);
    expect(committed?.metadata?.ms_since_entered as number).toBeGreaterThan(0);
    expect(findEvents(events, 'scenario_consequence_shown')).toHaveLength(1);

    // — Completion: acknowledge the consequence —
    await selectPromptOption(page, 1);
    await waitForEventCount(page, 'scenario_completed', 'inventory', 1);

    events = await getEvents(page);
    const completedEvent = findEvent(events, 'scenario_completed');

    expect(completedEvent?.choice_value).toBe('private_correction');
    expectEventSubsequence(
      events.map((e) => e.event_type),
      [
        'scenario_entered',
        'scenario_evidence_opened',
        'scenario_evidence_closed',
        'scenario_optional_info_requested',
        'scenario_option_selected',
        'scenario_option_changed',
        'scenario_decision_committed',
        'scenario_consequence_shown',
        'scenario_completed',
      ],
    );

    const probe = await scenarioProbe(page, SCENARIO_ID);

    expect(probe?.completed).toBe(true);
    expect(probe?.committedValue).toBe('private_correction');
    expect(probe?.selectionChanges).toBe(1);
    expect(probe?.evidenceViewed).toEqual(['cycle_log', 'outbound_manifest']);

    // — Duplicate-completion gate: reopening shows the one-shot message and
    //   never re-fires entry/commit/completion —
    const briefingsBefore = await eventCount(
      page,
      'scenario_briefing_opened',
      'inventory',
    );

    await inventoryToSealLog(page);
    await page.waitForTimeout(600);

    expect(await getLastFeedbackText(page)).toContain(
      'already signed off the airlock log review',
    );

    events = await getEvents(page);
    expect(findEvents(events, 'scenario_entered')).toHaveLength(1);
    expect(findEvents(events, 'scenario_decision_committed')).toHaveLength(1);
    expect(findEvents(events, 'scenario_completed')).toHaveLength(1);
    expect(findEvents(events, 'scenario_briefing_opened')).toHaveLength(
      briefingsBefore,
    );

    // — No side effects on mission/room state: the scenario never marks the
    //   room complete and never touches SessionState —
    const mission = await missionState(page);

    expect(mission.completed_rooms).not.toContain('inventory_prep_room');
    expect(mission.prepared_items).toEqual([]);

    // — Scenario events never leak into other scenes —
    for (const event of events) {
      if (String(event.event_type).startsWith('scenario_')) {
        expect(event.scene).toBe('inventory');
        expect(event.metadata?.scenario_id).toBe(SCENARIO_ID);
      }
    }

    expectNoRuntimeErrors(capture);
  });

  test('step-away interruption, room-exit abandonment, cross-entry persistence; legacy quartermaster prep unaffected', async ({
    page,
  }) => {
    test.setTimeout(300_000);

    const capture = captureErrors(page);

    await bootJourney(
      page,
      {
        participant_id: 'SCN_D2',
        game_session_id: 'SCN_D2_S',
        condition: 'pilot_scenario',
        scene: 'inventory',
      },
      'inventory',
    );

    // — Open the briefing, then step away (option 5) —
    await inventoryToSealLog(page);
    await waitForEventCount(page, 'scenario_entered', 'inventory', 1);
    await selectPromptOption(page, 5);
    await waitForEventCount(page, 'scenario_interrupted', 'inventory', 1);

    let events = await getEvents(page);
    const interrupted = findEvent(events, 'scenario_interrupted');

    expect(interrupted?.metadata?.phase).toBe('briefing');
    expect(interrupted?.metadata?.had_selection).toBe(false);

    // — Reopen: briefing re-opens, scenario_entered stays once-only —
    await inventoryToSealLog(page);
    await waitForEventCount(page, 'scenario_briefing_opened', 'inventory', 2);

    events = await getEvents(page);
    expect(findEvents(events, 'scenario_entered')).toHaveLength(1);

    // View one entry so persistence is observable across rooms.
    await selectPromptOption(page, 2);
    await waitForEventCount(page, 'scenario_evidence_opened', 'inventory', 1);
    await selectPromptOption(page, 1);
    await selectPromptOption(page, 5); // step away so the exit walk is free
    await waitForEventCount(page, 'scenario_interrupted', 'inventory', 2);

    // — Leave the room before committing: abandonment telemetry —
    await stationToHubJourney(page, 'inventory_prep_room');
    await waitForEventCount(page, 'scenario_abandoned', 'inventory', 1);

    events = await getEvents(page);
    const abandoned = findEvent(events, 'scenario_abandoned');

    expect(abandoned?.metadata?.had_selection).toBe(false);
    expect(abandoned?.metadata?.abandonment_number).toBe(1);

    // — Return: evidence progress persisted (session-lifetime state) —
    await hubToStationJourney(page, 'inventory_prep_room');

    const probe = await scenarioProbe(page, SCENARIO_ID);

    expect(probe?.entered).toBe(true);
    expect(probe?.evidenceViewed).toEqual(['fault_ticket']);
    expect(probe?.completed).toBe(false);

    // — Legacy quartermaster prep task still works beside the scenario
    //   station: systematic path, verification, cleanup —
    await openStationAlcove(page);
    await waitForEventCount(page, 'inventory_prep_opened', 'inventory', 1);
    await selectPromptOption(page, 2); // checklist path -> verification
    await waitForEventCount(page, 'inventory_checklist_used', 'inventory', 1);
    await selectPromptOption(page, 1); // run the readiness verification
    await waitForEventCount(
      page,
      'inventory_verified_complete',
      'inventory',
      1,
    );
    await selectPromptOption(page, 1); // sort the workspace
    await waitForEventCount(page, 'cleanup_completed', 'inventory', 1);

    const mission = await missionState(page);

    expect(mission.completed_rooms).toContain('inventory_prep_room');
    expect(mission.workspace_status).toBe('tidy');

    expectNoRuntimeErrors(capture);
  });
});
