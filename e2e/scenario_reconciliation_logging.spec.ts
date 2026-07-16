import { expect, test } from '@playwright/test';

import {
  archiveToReconciliationDesk,
  findEvent,
  findEvents,
  getEvents,
  getLastFeedbackText,
  openArchiveTerminal,
  press,
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
  stationToHubJourney,
  waitForEventCount,
} from './journey';

/**
 * Pilot Scenario C — incident-report reconciliation (Archive Room,
 * src/scenarios framework). Room-isolation spec via the direct
 * ?scene=archive launch.
 *
 * scenario_* events are pilot-development telemetry: every payload is
 * asserted UNMAPPED (no study_item_ids, no construct_id, no success) with
 * metadata.scenario_id present — the governance contract for this unit.
 */

const SCENARIO_ID = 'incident_reconciliation';

test.describe('pilot scenario: incident reconciliation', () => {
  test('activation, evidence dwell, optional info, selection, revision, commit, consequence, completion, duplicate-completion gate', async ({
    page,
  }) => {
    test.setTimeout(300_000);

    const capture = captureErrors(page);

    await bootJourney(
      page,
      {
        participant_id: 'SCN_C1',
        game_session_id: 'SCN_C1_S',
        condition: 'pilot_scenario',
        scene: 'archive',
      },
      'archive',
    );

    // — Activation —
    await archiveToReconciliationDesk(page);
    await waitForEventCount(page, 'scenario_entered', 'archive', 1);

    let events = await getEvents(page);
    const entered = findEvent(events, 'scenario_entered');

    expect(entered?.room_id).toBe('archive_room');
    expect(entered?.object_id).toBe('archive_reconciliation_desk');
    expect(entered?.metadata?.scenario_id).toBe(SCENARIO_ID);
    // Governance: pilot telemetry stays unmapped.
    expect(entered?.study_item_ids).toBeUndefined();
    expect(entered?.construct_id).toBeUndefined();
    expect(entered?.success).toBeUndefined();
    expect(findEvents(events, 'scenario_briefing_opened')).toHaveLength(1);

    // — Evidence: sensor record (option 1), return (option 1) —
    await selectPromptOption(page, 1);
    await waitForEventCount(page, 'scenario_evidence_opened', 'archive', 1);
    await selectPromptOption(page, 1);
    await waitForEventCount(page, 'scenario_evidence_closed', 'archive', 1);

    events = await getEvents(page);
    const opened = findEvent(events, 'scenario_evidence_opened');
    const closed = findEvent(events, 'scenario_evidence_closed');

    expect(opened?.metadata?.evidence_id).toBe('sensor_record');
    expect(opened?.metadata?.optional).toBe(false);
    expect(closed?.metadata?.evidence_id).toBe('sensor_record');
    expect(closed?.metadata?.dwell_ms as number).toBeGreaterThanOrEqual(0);

    // — Second record: duty report (option 2), return —
    await selectPromptOption(page, 2);
    await waitForEventCount(page, 'scenario_evidence_opened', 'archive', 2);
    await selectPromptOption(page, 1);
    await waitForEventCount(page, 'scenario_evidence_closed', 'archive', 2);

    // — Optional info: sensor clock history (option 3), return —
    await selectPromptOption(page, 3);
    await waitForEventCount(
      page,
      'scenario_optional_info_requested',
      'archive',
      1,
    );
    await selectPromptOption(page, 1);
    await waitForEventCount(page, 'scenario_evidence_closed', 'archive', 3);

    events = await getEvents(page);
    const optional = findEvent(events, 'scenario_optional_info_requested');

    expect(optional?.metadata?.evidence_id).toBe('clock_history');

    // — Decision: option 4 opens the filing; select "align the timeline" —
    await selectPromptOption(page, 4);
    await selectPromptOption(page, 2);
    await waitForEventCount(page, 'scenario_option_selected', 'archive', 1);

    events = await getEvents(page);
    const firstSelection = findEvent(events, 'scenario_option_selected');

    expect(firstSelection?.choice_value).toBe('align_timeline');
    expect(firstSelection?.metadata?.reselected).toBe(false);

    // — Revision: reconsider (option 2), file the discrepancy instead —
    await selectPromptOption(page, 2);
    await selectPromptOption(page, 1);
    await waitForEventCount(page, 'scenario_option_changed', 'archive', 1);

    events = await getEvents(page);
    const changed = findEvent(events, 'scenario_option_changed');

    expect(changed?.metadata?.previous_value).toBe('align_timeline');
    expect(changed?.metadata?.new_value).toBe('file_discrepancy');
    expect(changed?.metadata?.change_number).toBe(1);

    // — Commit (option 1 on the confirm stage) —
    await selectPromptOption(page, 1);
    await waitForEventCount(page, 'scenario_decision_committed', 'archive', 1);

    events = await getEvents(page);
    const committed = findEvent(events, 'scenario_decision_committed');

    expect(committed?.choice_value).toBe('file_discrepancy');
    expect(committed?.metadata?.changes_before_commit).toBe(1);
    expect(committed?.metadata?.evidence_viewed_count).toBe(3);
    expect(committed?.metadata?.optional_info_requested).toBe(true);
    expect(
      committed?.metadata?.commit_latency_ms as number,
    ).toBeGreaterThanOrEqual(0);
    expect(committed?.metadata?.ms_since_entered as number).toBeGreaterThan(0);
    expect(findEvents(events, 'scenario_consequence_shown')).toHaveLength(1);

    // — Completion: acknowledge the consequence —
    await selectPromptOption(page, 1);
    await waitForEventCount(page, 'scenario_completed', 'archive', 1);

    events = await getEvents(page);
    const completedEvent = findEvent(events, 'scenario_completed');

    expect(completedEvent?.choice_value).toBe('file_discrepancy');
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
    expect(probe?.committedValue).toBe('file_discrepancy');
    expect(probe?.selectionChanges).toBe(1);
    expect(probe?.evidenceViewed).toEqual([
      'sensor_record',
      'duty_report',
      'clock_history',
    ]);

    // — Duplicate-completion gate: reopening shows the one-shot message and
    //   never re-fires entry/commit/completion —
    const briefingsBefore = await eventCount(
      page,
      'scenario_briefing_opened',
      'archive',
    );

    await archiveToReconciliationDesk(page);
    await page.waitForTimeout(600);

    expect(await getLastFeedbackText(page)).toContain(
      'has already been filed this shift',
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

    expect(mission.completed_rooms).not.toContain('archive_room');

    // — Scenario events never leak into other scenes —
    for (const event of events) {
      if (String(event.event_type).startsWith('scenario_')) {
        expect(event.scene).toBe('archive');
        expect(event.metadata?.scenario_id).toBe(SCENARIO_ID);
      }
    }

    expectNoRuntimeErrors(capture);
  });

  test('step-away interruption, room-exit abandonment, cross-entry persistence; legacy archive task unaffected', async ({
    page,
  }) => {
    test.setTimeout(300_000);

    const capture = captureErrors(page);

    await bootJourney(
      page,
      {
        participant_id: 'SCN_C2',
        game_session_id: 'SCN_C2_S',
        condition: 'pilot_scenario',
        scene: 'archive',
      },
      'archive',
    );

    // — Open the briefing, then step away (option 5) —
    await archiveToReconciliationDesk(page);
    await waitForEventCount(page, 'scenario_entered', 'archive', 1);
    await selectPromptOption(page, 5);
    await waitForEventCount(page, 'scenario_interrupted', 'archive', 1);

    let events = await getEvents(page);
    const interrupted = findEvent(events, 'scenario_interrupted');

    expect(interrupted?.metadata?.phase).toBe('briefing');
    expect(interrupted?.metadata?.had_selection).toBe(false);

    // — Reopen: briefing re-opens, scenario_entered stays once-only —
    await archiveToReconciliationDesk(page);
    await waitForEventCount(page, 'scenario_briefing_opened', 'archive', 2);

    events = await getEvents(page);
    expect(findEvents(events, 'scenario_entered')).toHaveLength(1);

    // View one record so persistence is observable across rooms.
    await selectPromptOption(page, 2);
    await waitForEventCount(page, 'scenario_evidence_opened', 'archive', 1);
    await selectPromptOption(page, 1);
    await selectPromptOption(page, 5); // step away so the exit walk is free
    await waitForEventCount(page, 'scenario_interrupted', 'archive', 2);

    // — Leave the room before committing: abandonment telemetry —
    await stationToHubJourney(page, 'archive_room');
    await waitForEventCount(page, 'scenario_abandoned', 'archive', 1);

    events = await getEvents(page);
    const abandoned = findEvent(events, 'scenario_abandoned');

    expect(abandoned?.metadata?.had_selection).toBe(false);
    expect(abandoned?.metadata?.abandonment_number).toBe(1);

    // The scenario never trips the room's own abandonment telemetry: no
    // archive attempt was made, so archive_abandoned must stay absent.
    expect(findEvents(events, 'archive_abandoned')).toHaveLength(0);

    // — Return: evidence progress persisted (session-lifetime state) —
    await hubToStationJourney(page, 'archive_room');

    const probe = await scenarioProbe(page, SCENARIO_ID);

    expect(probe?.entered).toBe(true);
    expect(probe?.evidenceViewed).toEqual(['duty_report']);
    expect(probe?.completed).toBe(false);

    // — Legacy archive task still works beside the scenario station:
    //   forced first failure, feedback, revised query completes. Terminal
    //   options close the prompt, so each follow-up reopens with SPACE
    //   (archive_room_logging precedent) —
    await openArchiveTerminal(page);
    await waitForEventCount(page, 'archive_terminal_opened', 'archive', 1);
    await selectPromptOption(page, 1); // enter A17 (deterministic failure)
    await waitForEventCount(page, 'archive_wrong_code', 'archive', 1);
    await press(page, 'Space'); // reopen the terminal prompt
    await selectPromptOption(page, 2); // read terminal feedback
    await waitForEventCount(page, 'archive_feedback_used', 'archive', 1);
    await press(page, 'Space'); // reopen the terminal prompt
    await selectPromptOption(page, 3); // revised query completes the task
    await waitForEventCount(page, 'archive_completed', 'archive', 1);

    const mission = await missionState(page);

    expect(mission.completed_rooms).toContain('archive_room');

    expectNoRuntimeErrors(capture);
  });
});
