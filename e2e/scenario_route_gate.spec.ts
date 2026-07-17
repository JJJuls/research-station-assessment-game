import { expect, test } from '@playwright/test';

import {
  archiveToReconciliationDesk,
  engineerToCalibrationBench,
  findEvents,
  getEvents,
  getLastFeedbackText,
  getLastPromptBody,
  getRouteObjectiveText,
  inventoryToSealLog,
  selectPromptOption,
} from './helpers';
import {
  bootJourney,
  captureErrors,
  completeDockTutorial,
  completePilotScenario,
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
 * Pilot four-scenario route gate (FABLE-AUTONOMOUS-PILOT-ROUTE-REPAIR):
 * Final Core completion is locked behind EXPLICIT completion state of all
 * four pilot scenarios (never event-count heuristics), the lock displays
 * the remaining decisions, and the route-objective HUD directs a
 * first-time participant to every scenario without external instructions.
 *
 * Test 1 reproduces the supervised pilot failure route (enter A, C, D,
 * step away and leave each, never touch B, then attempt Final Core) —
 * before the repair that route completed the mission cycle with zero
 * committed decisions; now it must be blocked with all four listed.
 */

const GATE_EVENT = 'final_core_blocked_pending_decisions';

/** Attempts Final Core from the Hub and waits for the gate display. */
async function attemptFinalCoreBlocked(
  page: import('@playwright/test').Page,
  attemptNumber: number,
) {
  await hubToStationJourney(page, 'final_core_room');
  await openStationAlcove(page);
  await waitForEventCount(page, GATE_EVENT, 'final_core', attemptNumber);
}

test.describe('pilot route gate: Final Core requires all four decisions', () => {
  test('supervised failure route (A/C/D abandoned, B never reached) is blocked with all four decisions listed', async ({
    page,
  }) => {
    test.setTimeout(900_000);

    const capture = captureErrors(page);

    await bootJourney(page, {
      participant_id: 'AUTO_GATE_P1',
      game_session_id: 'AUTO_GATE_S1',
      condition: 'route_gate',
    });
    await completeDockTutorial(page, 1);
    await dockToHubJourney(page);

    // — Scenario A (Engineer Hub): briefing + one evidence view, then step
    //   away and leave the room — the supervised participant's pattern —
    await hubToStationJourney(page, 'engineer_hub');
    await engineerToCalibrationBench(page);
    await waitForEventCount(page, 'scenario_entered', 'engineer', 1);
    await selectPromptOption(page, 1); // open one evidence entry
    await waitForEventCount(page, 'scenario_evidence_opened', 'engineer', 1);
    await selectPromptOption(page, 1); // return to the overview
    await waitForEventCount(page, 'scenario_evidence_closed', 'engineer', 1);
    await selectPromptOption(page, 5); // step away
    await waitForEventCount(page, 'scenario_interrupted', 'engineer', 1);
    await stationToHubJourney(page, 'engineer_hub');
    await waitForEventCount(page, 'scenario_abandoned', 'engineer', 1);

    // — Scenario C (Archive): same abandon pattern —
    await hubToStationJourney(page, 'archive_room');
    await archiveToReconciliationDesk(page);
    await waitForEventCount(page, 'scenario_entered', 'archive', 1);
    await selectPromptOption(page, 1);
    await waitForEventCount(page, 'scenario_evidence_opened', 'archive', 1);
    await selectPromptOption(page, 1);
    await waitForEventCount(page, 'scenario_evidence_closed', 'archive', 1);
    await selectPromptOption(page, 5);
    await waitForEventCount(page, 'scenario_interrupted', 'archive', 1);
    await stationToHubJourney(page, 'archive_room');
    await waitForEventCount(page, 'scenario_abandoned', 'archive', 1);

    // — Scenario D (Inventory / Prep): same abandon pattern —
    await hubToStationJourney(page, 'inventory_prep_room');
    await inventoryToSealLog(page);
    await waitForEventCount(page, 'scenario_entered', 'inventory', 1);
    await selectPromptOption(page, 1);
    await waitForEventCount(page, 'scenario_evidence_opened', 'inventory', 1);
    await selectPromptOption(page, 1);
    await waitForEventCount(page, 'scenario_evidence_closed', 'inventory', 1);
    await selectPromptOption(page, 5);
    await waitForEventCount(page, 'scenario_interrupted', 'inventory', 1);
    await stationToHubJourney(page, 'inventory_prep_room');
    await waitForEventCount(page, 'scenario_abandoned', 'inventory', 1);

    // — Final Core attempt with ZERO completed decisions (B never even
    //   entered): the gate must block and list all four stations —
    await attemptFinalCoreBlocked(page, 1);

    const gateBody = await getLastPromptBody(page);

    expect(gateBody).toContain('Core synchronization is locked');
    expect(gateBody).toContain('Priority Allocation (Station Hub)');
    expect(gateBody).toContain('Calibration Bench (Engineer Hub)');
    expect(gateBody).toContain('Records Reconciliation Desk (Archive)');
    expect(gateBody).toContain('Supply Airlock Seal Log (Inventory / Prep)');

    await selectPromptOption(page, 1); // step back from the interface

    const events = await getEvents(page);
    const types = events.map((e) => e.event_type);
    const gate = findEvents(events, GATE_EVENT);

    // The decision prompt never opened and nothing completed.
    expect(types).not.toContain('final_core_opened');
    expect(types).not.toContain('final_core_completed');
    expect(gate).toHaveLength(1);
    expect(gate[0]?.metadata?.remaining_count).toBe(4);
    expect(gate[0]?.metadata?.remaining_scenario_ids).toEqual([
      'priority_allocation',
      'calibration_anomaly',
      'incident_reconciliation',
      'protocol_breach',
    ]);

    const mission = await missionState(page);

    expect(mission.completed_rooms).not.toContain('final_core_room');
    expect(mission.final_core_status).toBe('not_started');

    // Abandonment telemetry stays genuine: one interruption + one
    // abandonment per entered scenario, no commits, no completions.
    expect(findEvents(events, 'scenario_interrupted')).toHaveLength(3);
    expect(findEvents(events, 'scenario_abandoned')).toHaveLength(3);
    expect(findEvents(events, 'scenario_decision_committed')).toHaveLength(0);
    expect(findEvents(events, 'scenario_completed')).toHaveLength(0);

    expectNoRuntimeErrors(capture);
  });

  test('gate unlocks exactly at four completions: blocked at 1, 2, and 3; completes immediately at 4; never completes twice', async ({
    page,
  }) => {
    test.setTimeout(1_200_000);

    const capture = captureErrors(page);

    await bootJourney(page, {
      participant_id: 'AUTO_GATE_P2',
      game_session_id: 'AUTO_GATE_S2',
      condition: 'route_gate',
    });
    await completeDockTutorial(page, 1);
    await dockToHubJourney(page);

    // — 1/4: priority allocation at the Hub console —
    await completePilotScenario(page, 'priority_allocation');
    await attemptFinalCoreBlocked(page, 1);

    let body = await getLastPromptBody(page);

    expect(body).not.toContain('Priority Allocation (Station Hub)');
    expect(body).toContain('Calibration Bench (Engineer Hub)');
    await selectPromptOption(page, 1);
    await stationToHubJourney(page, 'final_core_room');

    // — 2/4: calibration anomaly (Engineer Hub) —
    await hubToStationJourney(page, 'engineer_hub');
    await completePilotScenario(page, 'calibration_anomaly');
    await stationToHubJourney(page, 'engineer_hub');
    await attemptFinalCoreBlocked(page, 2);
    body = await getLastPromptBody(page);
    expect(body).not.toContain('Calibration Bench');
    expect(body).toContain('Records Reconciliation Desk (Archive)');
    await selectPromptOption(page, 1);
    await stationToHubJourney(page, 'final_core_room');

    // — 3/4: incident reconciliation (Archive) —
    await hubToStationJourney(page, 'archive_room');
    await completePilotScenario(page, 'incident_reconciliation');
    await stationToHubJourney(page, 'archive_room');
    await attemptFinalCoreBlocked(page, 3);
    body = await getLastPromptBody(page);
    expect(body).not.toContain('Records Reconciliation Desk');
    expect(body).toContain('Supply Airlock Seal Log (Inventory / Prep)');
    await selectPromptOption(page, 1);
    await stationToHubJourney(page, 'final_core_room');

    // — 4/4: protocol breach (Inventory / Prep), then Final Core must
    //   complete IMMEDIATELY on the next attempt —
    await hubToStationJourney(page, 'inventory_prep_room');
    await completePilotScenario(page, 'protocol_breach');
    await stationToHubJourney(page, 'inventory_prep_room');

    await hubToStationJourney(page, 'final_core_room');
    await openStationAlcove(page);
    await waitForEventCount(page, 'final_core_opened', 'final_core', 1);
    await selectPromptOption(page, 2); // review status, then integrate
    await waitForEventCount(page, 'final_core_completed', 'final_core', 1);

    // One-shot stays intact: a repeat interaction gives the legacy
    // already-logged feedback and never re-completes.
    await openStationAlcove(page);

    expect(await getLastFeedbackText(page)).toContain(
      'already logged the final integration decision',
    );
    expect(await eventCount(page, 'final_core_completed', 'final_core')).toBe(
      1,
    );

    const events = await getEvents(page);
    const gate = findEvents(events, GATE_EVENT);

    expect(gate).toHaveLength(3);
    expect(gate.map((e) => e.metadata?.remaining_count)).toEqual([3, 2, 1]);
    expect(gate[2]?.metadata?.remaining_scenario_ids).toEqual([
      'protocol_breach',
    ]);

    // Exactly one commit and one completion per scenario id.
    const commits = findEvents(events, 'scenario_decision_committed');
    const completions = findEvents(events, 'scenario_completed');
    const ids = [
      'calibration_anomaly',
      'incident_reconciliation',
      'priority_allocation',
      'protocol_breach',
    ];

    expect(commits.map((e) => e.metadata?.scenario_id).sort()).toEqual(ids);
    expect(completions.map((e) => e.metadata?.scenario_id).sort()).toEqual(ids);
    // Progress survived every leave/re-enter on the way (5 Final Core
    // visits, 4 station visits) with no spurious interruption/abandonment.
    expect(findEvents(events, 'scenario_interrupted')).toHaveLength(0);
    expect(findEvents(events, 'scenario_abandoned')).toHaveLength(0);

    const mission = await missionState(page);

    expect(mission.completed_rooms).toContain('final_core_room');
    expect(mission.final_core_status).toBe('completed_structured');

    expectNoRuntimeErrors(capture);
  });

  test('route-objective HUD directs a first-time participant to the decisions in route order', async ({
    page,
  }) => {
    test.setTimeout(600_000);

    const capture = captureErrors(page);

    await bootJourney(page, {
      participant_id: 'AUTO_GATE_P3',
      game_session_id: 'AUTO_GATE_S3',
      condition: 'route_gate',
    });

    // Before check-in the roster directs to the Arrival Terminal.
    expect(await getRouteObjectiveText(page)).toContain('Arrival Terminal');

    await completeDockTutorial(page, 2);

    // After check-in it directs to the first pending decision.
    let hud = await getRouteObjectiveText(page);

    expect(hud).toContain('0/4');
    expect(hud).toContain('Priority Allocation (Station Hub)');

    await dockToHubJourney(page);

    // The HUD survives the room transition unchanged.
    expect(await getRouteObjectiveText(page)).toBe(hud);

    // Follow the displayed direction: the console is discoverable and
    // activatable through normal movement/input alone.
    await completePilotScenario(page, 'priority_allocation');
    hud = await getRouteObjectiveText(page);
    expect(hud).toContain('1/4');
    expect(hud).toContain('Calibration Bench (Engineer Hub)');

    await hubToStationJourney(page, 'engineer_hub');
    await completePilotScenario(page, 'calibration_anomaly');
    hud = await getRouteObjectiveText(page);
    expect(hud).toContain('2/4');
    expect(hud).toContain('Records Reconciliation Desk (Archive)');

    expectNoRuntimeErrors(capture);
  });
});
