import { expect, test } from '@playwright/test';

import {
  archiveToReconciliationDesk,
  driveAxisTo,
  engineerToCalibrationBench,
  findEvents,
  getEvents,
  getRouteObjectiveText,
  hubToAllocationConsole,
  inventoryToSealLog,
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
 * Pilot four-scenario route: the complete development play loop
 *
 *   launch -> Dock check-in -> Hub -> Scenario B (priority allocation)
 *   -> Engineer Hub -> Scenario A (calibration anomaly) -> Kai report
 *   -> Archive -> Scenario C (incident reconciliation)
 *   -> Inventory/Prep -> Scenario D (colleague protocol breach)
 *   -> Final Core synchronization -> debug completion/return flow
 *
 * Drives REAL doors and transitions end to end (journey.ts discipline) and
 * asserts all four scenarios complete, consequences fire, the scenarios
 * stay isolated per room, the run closes, and every event carries the
 * launch metadata. This is the automated start-to-finish playthrough
 * required for the pilot slice.
 */

/** Expected host scene per scenario id, for the isolation sweep. */
const SCENARIO_SCENES: Record<string, string> = {
  priority_allocation: 'hub',
  calibration_anomaly: 'engineer',
  incident_reconciliation: 'archive',
  protocol_breach: 'inventory',
};

test.describe('pilot four-scenario route', () => {
  test('full run: dock -> hub allocation -> engineer calibration -> report -> archive reconciliation -> inventory breach -> final core -> return flow', async ({
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

    // — Archive: Scenario C at the records reconciliation desk —
    await hubToStationJourney(page, 'archive_room');
    await archiveToReconciliationDesk(page);
    await waitForEventCount(page, 'scenario_entered', 'archive', 1);
    await selectPromptOption(page, 1); // sensor record evidence
    await waitForEventCount(page, 'scenario_evidence_opened', 'archive', 1);
    await selectPromptOption(page, 1); // return to overview
    await selectPromptOption(page, 4); // file the reconciliation entry
    await selectPromptOption(page, 1); // file the records as they stand
    await waitForEventCount(page, 'scenario_option_selected', 'archive', 1);
    await selectPromptOption(page, 1); // commit
    await waitForEventCount(page, 'scenario_decision_committed', 'archive', 1);
    await selectPromptOption(page, 1); // acknowledge the consequence
    await waitForEventCount(page, 'scenario_completed', 'archive', 1);
    await stationToHubJourney(page, 'archive_room');

    // — Inventory/Prep: Scenario D at the supply airlock seal log —
    await hubToStationJourney(page, 'inventory_prep_room');
    await inventoryToSealLog(page);
    await waitForEventCount(page, 'scenario_entered', 'inventory', 1);
    await selectPromptOption(page, 2); // interlock fault ticket evidence
    await waitForEventCount(page, 'scenario_evidence_opened', 'inventory', 1);
    await selectPromptOption(page, 1); // return to overview
    await selectPromptOption(page, 4); // enter your review sign-off
    await selectPromptOption(page, 3); // require the correcting report
    await waitForEventCount(page, 'scenario_option_selected', 'inventory', 1);
    await selectPromptOption(page, 1); // commit
    await waitForEventCount(
      page,
      'scenario_decision_committed',
      'inventory',
      1,
    );
    await selectPromptOption(page, 1); // acknowledge the consequence
    await waitForEventCount(page, 'scenario_completed', 'inventory', 1);
    await stationToHubJourney(page, 'inventory_prep_room');

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
      'archive_room_entered',
      'scenario_decision_committed',
      'scenario_consequence_shown',
      'scenario_completed',
      'inventory_room_entered',
      'scenario_decision_committed',
      'scenario_consequence_shown',
      'scenario_completed',
      'final_core_entered',
      'final_core_completed',
    ]);

    // All four scenarios completed, EXACTLY one commit and one completion
    // per scenario id, in their own rooms.
    const completions = findEvents(events, 'scenario_completed');
    const commits = findEvents(events, 'scenario_decision_committed');
    const routeIds = [
      'calibration_anomaly',
      'incident_reconciliation',
      'priority_allocation',
      'protocol_breach',
    ];

    expect(completions).toHaveLength(4);
    expect(completions.map((e) => e.metadata?.scenario_id).sort()).toEqual(
      routeIds,
    );
    expect(commits.map((e) => e.metadata?.scenario_id).sort()).toEqual(
      routeIds,
    );
    // Clean first-time route: no unintended abandonment or interruption,
    // and the Final Core route gate never fired (every decision was
    // completed before the core attempt).
    expect(findEvents(events, 'scenario_abandoned')).toHaveLength(0);
    expect(findEvents(events, 'scenario_interrupted')).toHaveLength(0);
    expect(types).not.toContain('final_core_blocked_pending_decisions');

    // Duty-roster HUD end state: the mission cycle reads complete.
    expect(await getRouteObjectiveText(page)).toBe(
      'Duty roster: mission cycle complete.',
    );

    // Scenario isolation: every scenario_* event belongs to exactly its
    // scenario's host scene — no cross-contamination between scenarios.
    for (const event of events) {
      if (String(event.event_type).startsWith('scenario_')) {
        const scenarioId = String(event.metadata?.scenario_id);

        expect(Object.keys(SCENARIO_SCENES)).toContain(scenarioId);
        expect(event.scene).toBe(SCENARIO_SCENES[scenarioId]);
      }
    }

    // Structured-completion additive events fire exactly once each and
    // stay unregistered raw telemetry: no research mapping fields (frozen
    // data — CanonicalEventContext has no entry for either name).
    const integrated = findEvents(
      events,
      'final_core_prior_results_integrated',
    );
    const structured = findEvents(events, 'final_core_structured_completion');

    expect(integrated).toHaveLength(1);
    expect(structured).toHaveLength(1);
    for (const event of [integrated[0], structured[0]]) {
      expect(event.room_id).toBe('final_core_room');
      expect(event.study_item_ids).toBeUndefined();
      expect(event.construct_id).toBeUndefined();
      expect(event.success).toBeUndefined();
    }

    const mission = await missionState(page);

    expect(mission.completed_rooms).toContain('dock_arrival');
    expect(mission.completed_rooms).toContain('engineer_hub');
    expect(mission.completed_rooms).toContain('final_core_room');
    expect(mission.final_core_status).toBe('completed_structured');
    // Scenarios are station-level pilot tasks, never room completions.
    expect(mission.completed_rooms).not.toContain('archive_room');
    expect(mission.completed_rooms).not.toContain('inventory_prep_room');

    expectSessionMetadata(events, {
      participant_id: 'PILOT_R1',
      game_session_id: 'PILOT_R1_S',
      condition: 'pilot_route',
    });

    // — Debug completion / return flow (dev-only surface) —
    const { summary } = await completeReturnFlow(page);

    expect(summary).toBeTruthy();
    // Scoring separation: the structured path feeds exactly the
    // final-core aggregates (integrated count = both additive events).
    expect(summary.final_core_integrated_count).toBe(2);
    expect(summary.final_core_completion_quality).toBe('structured');
    expect(summary.final_core_completed).toBe(true);
    expect(summary.final_core_quick_sync_count).toBe(0);

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
