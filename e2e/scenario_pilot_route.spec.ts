import { expect, test } from '@playwright/test';

import {
  driveAxisTo,
  engineerToCalibrationBench,
  findEvents,
  getEvents,
  hubToAllocationConsole,
  selectPromptOption,
} from './helpers';
import {
  bootJourney,
  captureErrors,
  completeDockTutorial,
  completeReturnFlow,
  dockToHubJourney,
  expectEventSubsequence,
  expectNoRuntimeErrors,
  expectSessionMetadata,
  hubToStationJourney,
  missionState,
  openStationAlcove,
  stationToHubJourney,
  waitForEventCount,
} from './journey';

/**
 * Pilot vertical-slice route: the complete development play loop
 *
 *   launch -> Dock check-in -> Hub -> Scenario B (priority allocation)
 *   -> Engineer Hub -> Scenario A (calibration anomaly) -> Kai report
 *   -> Final Core synchronization -> debug completion/return flow
 *
 * Drives REAL doors and transitions end to end (journey.ts discipline) and
 * asserts both scenarios complete, consequences fire, the run closes, and
 * every event carries the launch metadata. This is the automated
 * start-to-finish playthrough required for the pilot slice.
 */

test.describe('pilot vertical-slice route', () => {
  test('full run: dock -> hub allocation -> engineer calibration -> report -> final core -> return flow', async ({
    page,
  }) => {
    test.setTimeout(600_000);

    const capture = captureErrors(page);
    const startedAt = Date.now();

    await bootJourney(page, {
      participant_id: 'PILOT_R1',
      game_session_id: 'PILOT_R1_S',
      condition: 'pilot_route',
    });

    // — Dock: arrival check-in (skip path, ADV-5 precedent). The skip
    //   option logs the canonical tutorial_completed (metadata.skipped),
    //   NOT the legacy dock_tutorial_completed (paths 2/3 only) —
    await completeDockTutorial(page, 1);
    await waitForEventCount(page, 'tutorial_completed', 'dock', 1);
    await dockToHubJourney(page);

    // — Scenario B: priority allocation at the Hub console —
    await hubToAllocationConsole(page);
    await waitForEventCount(page, 'scenario_entered', 'hub', 1);
    await selectPromptOption(page, 2); // load forecast evidence
    await waitForEventCount(page, 'scenario_evidence_opened', 'hub', 1);
    await selectPromptOption(page, 1); // return to overview
    await selectPromptOption(page, 4); // assign the priority slots
    await selectPromptOption(page, 1); // slot 1: life support
    await waitForEventCount(page, 'scenario_option_selected', 'hub', 1);
    await selectPromptOption(page, 1); // slot 2: cryostore
    await waitForEventCount(page, 'scenario_option_selected', 'hub', 2);
    await selectPromptOption(page, 1); // commit the allocation
    await waitForEventCount(page, 'scenario_decision_committed', 'hub', 1);
    await selectPromptOption(page, 1); // acknowledge the consequence
    await waitForEventCount(page, 'scenario_completed', 'hub', 1);

    // — Engineer Hub: Scenario A at the calibration bench —
    await hubToStationJourney(page, 'engineer_hub');
    await engineerToCalibrationBench(page);
    await waitForEventCount(page, 'scenario_entered', 'engineer', 1);
    await selectPromptOption(page, 2); // cross-check evidence
    await waitForEventCount(page, 'scenario_evidence_opened', 'engineer', 1);
    await selectPromptOption(page, 1); // return to overview
    await selectPromptOption(page, 4); // enter your sign-off
    await selectPromptOption(page, 1); // report the drift
    await waitForEventCount(page, 'scenario_option_selected', 'engineer', 1);
    await selectPromptOption(page, 1); // commit
    await waitForEventCount(page, 'scenario_decision_committed', 'engineer', 1);
    await selectPromptOption(page, 1); // acknowledge the consequence
    await waitForEventCount(page, 'scenario_completed', 'engineer', 1);

    // — Legacy Kai report (existing task, unchanged by the scenario).
    //   openStationAlcove assumes the spawn column (x 320); the scenario
    //   left the player at the bench column (x ~448), so drive back to the
    //   open mid row and the spawn column first —
    await driveAxisTo(page, 'y', 272, 16);
    await driveAxisTo(page, 'x', 320, 12);
    await openStationAlcove(page);
    await waitForEventCount(page, 'engineer_report_opened', 'engineer', 1);
    await selectPromptOption(page, 2); // review evidence, then report
    await waitForEventCount(
      page,
      'engineer_supervision_assigned',
      'engineer',
      1,
    );
    await selectPromptOption(page, 2); // decline the relay duty
    await waitForEventCount(
      page,
      'engineer_supervision_declined',
      'engineer',
      1,
    );
    await stationToHubJourney(page, 'engineer_hub');

    // — Final Core: close the mission cycle —
    await hubToStationJourney(page, 'final_core_room');
    await openStationAlcove(page);
    await waitForEventCount(page, 'final_core_opened', 'final_core', 1);
    await selectPromptOption(page, 2); // review status, then integrate
    await waitForEventCount(page, 'final_core_completed', 'final_core', 1);

    // — Route-level assertions —
    const events = await getEvents(page);
    const types = events.map((e) => e.event_type);

    expectEventSubsequence(types, [
      'session_start',
      'tutorial_completed',
      'station_hub_entered',
      'scenario_entered',
      'scenario_decision_committed',
      'scenario_consequence_shown',
      'scenario_completed',
      'engineer_hub_entered',
      'scenario_decision_committed',
      'scenario_consequence_shown',
      'scenario_completed',
      'engineer_report_opened',
      'final_core_entered',
      'final_core_completed',
    ]);

    // Both scenarios completed, one commit each, in their own rooms.
    const completions = findEvents(events, 'scenario_completed');

    expect(completions).toHaveLength(2);
    expect(completions.map((e) => e.metadata?.scenario_id).sort()).toEqual([
      'calibration_anomaly',
      'priority_allocation',
    ]);
    expect(findEvents(events, 'scenario_decision_committed')).toHaveLength(2);
    expect(findEvents(events, 'scenario_abandoned')).toHaveLength(0);

    const mission = await missionState(page);

    expect(mission.completed_rooms).toContain('dock_arrival');
    expect(mission.completed_rooms).toContain('engineer_hub');
    expect(mission.completed_rooms).toContain('final_core_room');
    expect(mission.final_core_status).toBe('completed_structured');

    expectSessionMetadata(events, {
      participant_id: 'PILOT_R1',
      game_session_id: 'PILOT_R1_S',
      condition: 'pilot_route',
    });

    // — Debug completion / return flow (dev-only surface) —
    const { summary } = await completeReturnFlow(page);

    expect(summary).toBeTruthy();

    // Record the approximate play duration for the implementation report.
    const durationSeconds = Math.round((Date.now() - startedAt) / 1000);

    test.info().annotations.push({
      type: 'pilot-route-duration-seconds',
      description: String(durationSeconds),
    });
    test.info().annotations.push({
      type: 'events-logged',
      description: String(types.length),
    });

    expectNoRuntimeErrors(capture);
  });
});
