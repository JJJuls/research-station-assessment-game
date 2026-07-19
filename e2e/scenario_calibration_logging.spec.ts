import { expect, test } from '@playwright/test';

import {
  engineerToCalibrationBench,
  findEvent,
  findEvents,
  getEvents,
  getLastFeedbackText,
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
 * Pilot Scenario A — calibration anomaly (Engineer Hub, src/scenarios
 * framework). Room-isolation spec via the direct ?scene=engineer launch.
 *
 * scenario_* events are pilot-development telemetry: every payload is
 * asserted UNMAPPED (no study_item_ids, no construct_id, no success) with
 * metadata.scenario_id present — the governance contract for this unit.
 */

const SCENARIO_ID = 'calibration_anomaly';

test.describe('pilot scenario: calibration anomaly', () => {
  test('activation, evidence dwell, selection, revision, commit, consequence, completion, duplicate-completion gate', async ({
    page,
  }) => {
    test.setTimeout(300_000);

    const capture = captureErrors(page);

    await bootJourney(
      page,
      {
        participant_id: 'SCN_A1',
        game_session_id: 'SCN_A1_S',
        condition: 'pilot_scenario',
        scene: 'engineer',
      },
      'engineer',
    );

    // — Activation —
    await engineerToCalibrationBench(page);
    await waitForEventCount(page, 'scenario_entered', 'engineer', 1);

    let events = await getEvents(page);
    const entered = findEvent(events, 'scenario_entered');

    expect(entered?.room_id).toBe('engineer_hub');
    expect(entered?.object_id).toBe('engineer_calibration_bench');
    expect(entered?.metadata?.scenario_id).toBe(SCENARIO_ID);
    // Governance: pilot telemetry stays unmapped.
    expect(entered?.study_item_ids).toBeUndefined();
    expect(entered?.construct_id).toBeUndefined();
    expect(entered?.success).toBeUndefined();
    expect(findEvents(events, 'scenario_briefing_opened')).toHaveLength(1);

    // — Evidence: open the drift log (option 1), return (option 1) —
    await selectPromptOption(page, 1);
    await waitForEventCount(page, 'scenario_evidence_opened', 'engineer', 1);
    await selectPromptOption(page, 1);
    await waitForEventCount(page, 'scenario_evidence_closed', 'engineer', 1);

    events = await getEvents(page);
    const opened = findEvent(events, 'scenario_evidence_opened');
    const closed = findEvent(events, 'scenario_evidence_closed');

    expect(opened?.metadata?.evidence_id).toBe('drift_log');
    expect(opened?.metadata?.optional).toBe(false);
    expect(closed?.metadata?.evidence_id).toBe('drift_log');
    expect(closed?.metadata?.dwell_ms as number).toBeGreaterThanOrEqual(0);

    // — Optional info: extended diagnostic (option 3), return —
    await selectPromptOption(page, 3);
    await waitForEventCount(
      page,
      'scenario_optional_info_requested',
      'engineer',
      1,
    );
    await selectPromptOption(page, 1);
    await waitForEventCount(page, 'scenario_evidence_closed', 'engineer', 2);

    events = await getEvents(page);
    const optional = findEvent(events, 'scenario_optional_info_requested');

    expect(optional?.metadata?.evidence_id).toBe('extended_diagnostic');

    // — Decision: option 4 opens the sign-off; select "sign off as valid" —
    await selectPromptOption(page, 4);
    await selectPromptOption(page, 2);
    await waitForEventCount(page, 'scenario_option_selected', 'engineer', 1);

    events = await getEvents(page);
    const firstSelection = findEvent(events, 'scenario_option_selected');

    expect(firstSelection?.choice_value).toBe('sign_off_as_valid');
    expect(firstSelection?.metadata?.reselected).toBe(false);

    // — Revision: reconsider (option 2), pick "report the drift" instead —
    await selectPromptOption(page, 2);
    await selectPromptOption(page, 1);
    await waitForEventCount(page, 'scenario_option_changed', 'engineer', 1);

    events = await getEvents(page);
    const changed = findEvent(events, 'scenario_option_changed');

    expect(changed?.metadata?.previous_value).toBe('sign_off_as_valid');
    expect(changed?.metadata?.new_value).toBe('report_drift');
    expect(changed?.metadata?.change_number).toBe(1);

    // — Commit (option 1 on the confirm stage) —
    await selectPromptOption(page, 1);
    await waitForEventCount(page, 'scenario_decision_committed', 'engineer', 1);

    events = await getEvents(page);
    const committed = findEvent(events, 'scenario_decision_committed');

    expect(committed?.choice_value).toBe('report_drift');
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
    await waitForEventCount(page, 'scenario_completed', 'engineer', 1);

    events = await getEvents(page);
    const completedEvent = findEvent(events, 'scenario_completed');

    expect(completedEvent?.choice_value).toBe('report_drift');
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
    expect(probe?.committedValue).toBe('report_drift');
    expect(probe?.selectionChanges).toBe(1);
    expect(probe?.evidenceViewed).toEqual(['drift_log', 'extended_diagnostic']);

    // — Duplicate-completion gate: reopening shows the one-shot message and
    //   never re-fires entry/commit/completion —
    const briefingsBefore = await eventCount(
      page,
      'scenario_briefing_opened',
      'engineer',
    );

    await engineerToCalibrationBench(page);
    await page.waitForTimeout(600);

    expect(await getLastFeedbackText(page)).toContain(
      'already logged your calibration sign-off',
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

    expect(mission.completed_rooms).not.toContain('engineer_hub');

    // — Scenario events never leak into other scenes —
    for (const event of events) {
      if (String(event.event_type).startsWith('scenario_')) {
        expect(event.scene).toBe('engineer');
        expect(event.metadata?.scenario_id).toBe(SCENARIO_ID);
      }
    }

    expectNoRuntimeErrors(capture);
  });

  test('step-away interruption, room-exit abandonment, cross-entry persistence; legacy Kai report unaffected', async ({
    page,
  }) => {
    test.setTimeout(300_000);

    const capture = captureErrors(page);

    await bootJourney(
      page,
      {
        participant_id: 'SCN_A2',
        game_session_id: 'SCN_A2_S',
        condition: 'pilot_scenario',
        scene: 'engineer',
      },
      'engineer',
    );

    // — Open the briefing, then step away (option 5) —
    await engineerToCalibrationBench(page);
    await waitForEventCount(page, 'scenario_entered', 'engineer', 1);
    await selectPromptOption(page, 5);
    await waitForEventCount(page, 'scenario_interrupted', 'engineer', 1);

    let events = await getEvents(page);
    const interrupted = findEvent(events, 'scenario_interrupted');

    expect(interrupted?.metadata?.phase).toBe('briefing');
    expect(interrupted?.metadata?.had_selection).toBe(false);

    // — Reopen: briefing re-opens, scenario_entered stays once-only —
    await engineerToCalibrationBench(page);
    await waitForEventCount(page, 'scenario_briefing_opened', 'engineer', 2);

    events = await getEvents(page);
    expect(findEvents(events, 'scenario_entered')).toHaveLength(1);

    // View one evidence entry so persistence is observable across rooms.
    await selectPromptOption(page, 2);
    await waitForEventCount(page, 'scenario_evidence_opened', 'engineer', 1);
    await selectPromptOption(page, 1);
    await selectPromptOption(page, 5); // step away so the exit walk is free
    await waitForEventCount(page, 'scenario_interrupted', 'engineer', 2);

    // — Leave the room before committing: abandonment telemetry —
    await stationToHubJourney(page, 'engineer_hub');
    await waitForEventCount(page, 'scenario_abandoned', 'engineer', 1);

    events = await getEvents(page);
    const abandoned = findEvent(events, 'scenario_abandoned');

    expect(abandoned?.metadata?.had_selection).toBe(false);
    expect(abandoned?.metadata?.abandonment_number).toBe(1);

    // — Return: evidence progress persisted (session-lifetime state) —
    await hubToStationJourney(page, 'engineer_hub');

    const probe = await scenarioProbe(page, SCENARIO_ID);

    expect(probe?.entered).toBe(true);
    expect(probe?.evidenceViewed).toEqual(['cross_check']);
    expect(probe?.completed).toBe(false);

    // — Legacy Kai report still works beside the scenario station —
    await openStationAlcove(page);
    await waitForEventCount(page, 'engineer_report_opened', 'engineer', 1);
    await selectPromptOption(page, 1); // quick report -> content stage chains
    await selectPromptOption(page, 1); // NEXT-04 content stage -> duty offer
    await waitForEventCount(
      page,
      'engineer_supervision_assigned',
      'engineer',
      1,
    );
    await selectPromptOption(page, 2); // decline the duty
    await waitForEventCount(
      page,
      'engineer_supervision_declined',
      'engineer',
      1,
    );

    const mission = await missionState(page);

    expect(mission.completed_rooms).toContain('engineer_hub');

    expectNoRuntimeErrors(capture);
  });
});
