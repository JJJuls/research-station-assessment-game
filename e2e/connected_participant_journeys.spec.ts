import { expect, test } from '@playwright/test';

import {
  driveAxisTo,
  getSummary,
  hold,
  press,
  selectPromptOption,
} from './helpers';
import {
  bootJourney,
  captureErrors,
  completeDockTutorial,
  completePilotScenario,
  completeReturnFlow,
  dockToHubJourney,
  expectEventSubsequence,
  expectNoRuntimeErrors,
  expectSessionMetadata,
  hubToStationJourney,
  journeyEvents,
  missionState,
  openStationAlcove,
  stationToHubJourney,
} from './journey';

/**
 * Sprint A (A4): full connected participant journeys through REAL doors.
 *
 * Three sessions, because the Hazard branches (informed continue /
 * reckless continue / route avoided) are mutually exclusive within one
 * participant: mixing them would contaminate the frozen summary formulas
 * (blind_retry_count / uncertainty persistence / abandonment_count) and
 * invalidate the evidence. Duty accept/decline and the interruption
 * options are split along the same lines.
 *
 * Evidence record: docs/testing/connected-journey/CONNECTED-JOURNEY-EVIDENCE.md
 */

const count = (types: string[], type: string) =>
  types.filter((t) => t === type).length;

test.describe('connected participant journeys', () => {
  test('P1 adaptive completer: systematic prep, duty follow-through, informed hazard, high-quality core', async ({
    page,
  }) => {
    test.setTimeout(1_200_000);

    const errors = captureErrors(page);
    const params = {
      participant_id: 'A4_P1',
      game_session_id: 'A4_JOURNEY_S1',
      condition: 'pilot',
      game_version: 'e2e',
      return_url: 'https://example.org/return?study=ro',
    };

    await bootJourney(page, params);

    // Dock tutorial: review controls and confirm readiness (option 2).
    await completeDockTutorial(page, 2);

    expect((await missionState(page)).completed_rooms).toContain(
      'dock_arrival',
    );

    await dockToHubJourney(page);

    // Route-gate prerequisite: the four pilot decisions are completed at
    // their stations along this journey (Final Core is locked otherwise).
    await completePilotScenario(page, 'priority_allocation');

    // Inventory: checklist -> verify -> cleanup (systematic path), then
    // the seal-log decision (Scenario D) beside the legacy task.
    await hubToStationJourney(page, 'inventory_prep_room');
    await openStationAlcove(page);
    await selectPromptOption(page, 2);
    await selectPromptOption(page, 1);
    await selectPromptOption(page, 1);
    await completePilotScenario(page, 'protocol_breach');
    await stationToHubJourney(page, 'inventory_prep_room');

    let mission = await missionState(page);

    expect(mission.prepared_items).toContain('field_kit');
    expect(mission.workspace_status).toBe('tidy');

    // Engineer: prepared report, accurate status claim (kit packed, repair
    // still open at this point in the route — NEXT-04 content stage),
    // accept the relay supervision duty, then the calibration decision
    // (Scenario A) at the bench.
    await hubToStationJourney(page, 'engineer_hub');
    await openStationAlcove(page);
    await selectPromptOption(page, 2);
    await selectPromptOption(page, 3);
    await selectPromptOption(page, 1);
    await completePilotScenario(page, 'calibration_anomaly');
    await stationToHubJourney(page, 'engineer_hub');

    mission = await missionState(page);

    expect(mission.accepted_duties).toContain('relay_supervision');
    expect(mission.active_objectives).toContain('relay_supervision');

    // Side repair (FABLE-NEXT-03 observed multi-step task): accept at the
    // bot, fetch the part at the shelf (row-8 lane, west clamp against
    // the flanking block), fit and check back at the console.
    await hubToStationJourney(page, 'optional_side_repair_bay');
    await openStationAlcove(page);
    await selectPromptOption(page, 2); // accept the stabiliser repair
    await driveAxisTo(page, 'y', 272, 12);
    await hold(page, 'ArrowLeft', 2400);
    await press(page, 'Space');
    await selectPromptOption(page, 1); // collect the replacement part
    await driveAxisTo(page, 'x', 320, 12);
    await openStationAlcove(page);
    await selectPromptOption(page, 1); // seat the part
    await press(page, 'Space');
    await selectPromptOption(page, 1); // run the system check -> complete
    await stationToHubJourney(page, 'optional_side_repair_bay');

    expect((await missionState(page)).side_repair_status).toBe('completed');

    // Interruption: acknowledge, then return to the task (duty active, so
    // the state-grounded objective_active must fire).
    await hubToStationJourney(page, 'interruption_corridor');
    await openStationAlcove(page);
    await selectPromptOption(page, 2);
    await stationToHubJourney(page, 'interruption_corridor');

    expect((await missionState(page)).interruption_status).toBe(
      'returned_to_task',
    );

    // Hazard: check the detail first, then continue informed.
    await hubToStationJourney(page, 'hazard_control_room');
    await openStationAlcove(page);
    await selectPromptOption(page, 1);
    await openStationAlcove(page);
    await selectPromptOption(page, 2);
    await stationToHubJourney(page, 'hazard_control_room');

    expect((await missionState(page)).hazard_status).toBe('informed_continue');

    // Archive: fail, read feedback, revise (adaptive completion), then
    // the records decision (Scenario C) at the reconciliation desk.
    await hubToStationJourney(page, 'archive_room');
    await openStationAlcove(page);
    await selectPromptOption(page, 1);
    await openStationAlcove(page);
    await selectPromptOption(page, 2);
    await openStationAlcove(page);
    await selectPromptOption(page, 3);
    await completePilotScenario(page, 'incident_reconciliation');
    await stationToHubJourney(page, 'archive_room');

    // Repair: fail, open the manual, revise — completes the legacy
    // Archive+Repair objective pair.
    await hubToStationJourney(page, 'systems_repair_room');
    await openStationAlcove(page);
    await selectPromptOption(page, 1);
    await openStationAlcove(page);
    await selectPromptOption(page, 2);
    await openStationAlcove(page);
    await selectPromptOption(page, 3);
    await stationToHubJourney(page, 'systems_repair_room');

    // Final Core: resolve remaining flags (relay duty completes here).
    await hubToStationJourney(page, 'final_core_room');
    await openStationAlcove(page);
    await selectPromptOption(page, 3);

    mission = await missionState(page);

    expect(mission.completed_rooms).toEqual(
      expect.arrayContaining([
        'dock_arrival',
        'inventory_prep_room',
        'engineer_hub',
        'optional_side_repair_bay',
        'interruption_corridor',
        'archive_room',
        'systems_repair_room',
        'final_core_room',
      ]),
    );
    expect(mission.active_objectives).toEqual([]);
    expect(mission.final_core_status).toBe('completed_high_quality');

    const events = await journeyEvents(page);
    const types = events.map((e) => e.event_type);

    // Adaptive-path signature events, in journey order.
    expectEventSubsequence(types, [
      'dock_tutorial_completed',
      'inventory_systematic_prep',
      'inventory_verified_complete',
      'cleanup_completed',
      'engineer_report_submitted_prepared',
      'engineer_supervision_accepted',
      'side_repair_completed',
      'final_bonus_unlocked',
      'objective_active',
      'interruption_returned_to_original_task',
      'hazard_info_checked',
      'hazard_informed_continue',
      'archive_completed',
      'repair_completed',
      'objective_completed',
      'final_core_stability_bonus',
      'engineer_supervision_completed',
      'final_core_high_quality_completion',
    ]);

    // One-shots and mutually exclusive branch events.
    expect(count(types, 'objective_completed')).toBe(1);
    expect(count(types, 'objective_active')).toBe(1);
    expect(types).not.toContain('hazard_reckless_continue');
    expect(types).not.toContain('hazard_avoidance');
    expect(types).not.toContain('accepted_duty_unresolved');
    // All four decisions were completed before the core attempt: the
    // route gate must never have fired.
    expect(types).not.toContain('final_core_blocked_pending_decisions');
    // System entry flags that must NOT fire on the prepared path.
    expect(types).not.toContain('final_core_missing_item_flagged');
    expect(types).not.toContain('final_core_workspace_issue_flagged');
    expect(types).not.toContain('final_unresolved_due_to_nonreturn');

    // NEXT-04 state-varied accuracy evidence: at the engineer visit the
    // kit was already packed but Systems Repair was still open, so the
    // accurate claim differs from the fresh-session one — the evaluation
    // must follow live SessionState, not a fixed answer key.
    const accuracyEvent = events.find(
      (e) => e.event_type === 'engineer_report_accuracy_scored',
    );

    expect(accuracyEvent?.success).toBe(true);
    expect(accuracyEvent?.metadata).toMatchObject({
      report_mode: 'prepared',
      accuracy: 1,
      claimed_systems_repair_complete: false,
      claimed_field_kit_packed: true,
      actual_systems_repair_complete: false,
      actual_field_kit_packed: true,
    });

    // Frozen-summary spot checks (separation invariants).
    const summary = await getSummary(page);

    expect(summary.game_inappropriate_persistence).toBe(0);
    expect(summary.blind_retry_count).toBe(0);
    expect(summary.abandonment_count).toBe(0);
    expect(summary.game_uncertainty_persistence).toBe(2);
    expect(summary.organization_checklist_used).toBe(true);
    expect(summary.responsibility_prepared_report).toBe(true);
    expect(summary.productiveness_completed_optional_task).toBe(true);
    expect(summary.final_core_completion_quality).toBe('high');

    // Return flow: original return_url preserved, summary appended.
    const completion = await completeReturnFlow(page);

    expect(completion.returnUrl).toContain(
      'https://example.org/return?study=ro',
    );
    expect(completion.returnUrl).toContain('participant_id=A4_P1');

    expectSessionMetadata(events, params);
    expectNoRuntimeErrors(errors);
  });

  test('P2 shortcut/interrupted: skipped tutorial, declined duty, task switch, partial repair re-entry, reckless hazard, forced core', async ({
    page,
  }) => {
    test.setTimeout(1_200_000);

    const errors = captureErrors(page);
    const params = {
      participant_id: 'A4_P2',
      game_session_id: 'A4_JOURNEY_S2',
      condition: 'pilot',
      game_version: 'e2e',
    };

    await bootJourney(page, params);
    await completeDockTutorial(page, 1); // skip the tutorial
    await dockToHubJourney(page);

    // Route-gate prerequisite: even the shortcut journey completes the
    // four pilot decisions (the gate blocks Final Core otherwise).
    await completePilotScenario(page, 'priority_allocation');

    // Inventory: grab tools quickly (shortcut — no kit, workspace suffers),
    // then the seal-log decision (Scenario D).
    await hubToStationJourney(page, 'inventory_prep_room');
    await openStationAlcove(page);
    await selectPromptOption(page, 1);
    await completePilotScenario(page, 'protocol_breach');
    await stationToHubJourney(page, 'inventory_prep_room');

    expect((await missionState(page)).prepared_items).toEqual([]);

    // Engineer: unprepared quick report, inaccurate from-memory claim
    // (NEXT-04 content stage), decline the duty, then the calibration
    // decision (Scenario A).
    await hubToStationJourney(page, 'engineer_hub');
    await openStationAlcove(page);
    await selectPromptOption(page, 1);
    await selectPromptOption(page, 1);
    await selectPromptOption(page, 2);
    await completePilotScenario(page, 'calibration_anomaly');
    await stationToHubJourney(page, 'engineer_hub');

    const missionAfterEngineer = await missionState(page);

    expect(missionAfterEngineer.skipped_duties).toContain('relay_supervision');
    expect(missionAfterEngineer.active_objectives).toEqual([]);

    // Interruption: switch fully to the new request and actually run the
    // competing junction task (NEXT-05 real mechanic). The duty was
    // declined, so nothing is genuinely pending — the recorded
    // no-opportunity state; no return/abandonment observation is
    // interpretable on this journey.
    await hubToStationJourney(page, 'interruption_corridor');
    await openStationAlcove(page);
    await selectPromptOption(page, 1); // commit to the competing request
    await driveAxisTo(page, 'x', 576, 12);
    await press(page, 'Space'); // junction: switched_task at first interaction
    await selectPromptOption(page, 1); // realign the feed
    await selectPromptOption(page, 1); // confirm the realignment
    await stationToHubJourney(page, 'interruption_corridor');

    const missionAfterCorridor = await missionState(page);

    expect(missionAfterCorridor.interruption_status).toBe('switched_away');
    expect(missionAfterCorridor.competing_task_status).toBe('completed');

    // Repair: fail once, abandon (exit), return, leave unfinished again.
    await hubToStationJourney(page, 'systems_repair_room');
    await openStationAlcove(page);
    await selectPromptOption(page, 1);
    await stationToHubJourney(page, 'systems_repair_room'); // abandons
    await hubToStationJourney(page, 'systems_repair_room'); // returns
    await stationToHubJourney(page, 'systems_repair_room'); // abandons again

    // Hazard: continue with NO prior info check (reckless branch).
    await hubToStationJourney(page, 'hazard_control_room');
    await openStationAlcove(page);
    await selectPromptOption(page, 2);
    await stationToHubJourney(page, 'hazard_control_room');

    expect((await missionState(page)).hazard_status).toBe('reckless_continue');

    // Scenario C (Archive) — required by the route gate; the legacy
    // archive terminal stays untouched on this journey.
    await hubToStationJourney(page, 'archive_room');
    await completePilotScenario(page, 'incident_reconciliation');
    await stationToHubJourney(page, 'archive_room');

    // Final Core: outstanding flags shown, force the synchronization.
    await hubToStationJourney(page, 'final_core_room');
    await openStationAlcove(page);
    await selectPromptOption(page, 4);

    const mission = await missionState(page);

    expect(mission.completed_rooms).toContain('final_core_room');
    expect(mission.completed_rooms).not.toContain('systems_repair_room');
    expect(mission.final_core_status).toBe('completed_forced');

    const events = await journeyEvents(page);
    const types = events.map((e) => e.event_type);

    expectEventSubsequence(types, [
      'dock_tutorial_skipped',
      'inventory_prep_shortcut',
      'engineer_report_submitted_unprepared',
      'engineer_supervision_declined',
      'goal_switch_accepted',
      'switched_task',
      'repair_failed',
      'repair_abandoned',
      'repair_returned_after_failure',
      'repair_abandoned',
      'hazard_reckless_continue',
      'final_core_missing_item_flagged',
      'final_unresolved_due_to_nonreturn',
      'final_core_blocker_shown',
      'final_core_force_continue',
    ]);

    expect(count(types, 'repair_abandoned')).toBe(2);
    expect(count(types, 'repair_returned_after_failure')).toBe(1);
    expect(types).not.toContain('repair_completed');
    expect(types).not.toContain('hazard_info_checked');
    // Duty was declined, never active: no unresolved-duty event may fire.
    expect(types).not.toContain('accepted_duty_unresolved');
    expect(types).not.toContain('objective_active');
    // NEXT-05 no-opportunity state: nothing was genuinely pending at the
    // switch, so no return act and no prior-goal closure is interpretable —
    // prior_goal_abandoned must NOT fire even though the switch never
    // returned (only non-return with a valid original is negative).
    expect(types).not.toContain('prior_goal_abandoned');
    expect(types).not.toContain('return_to_unfinished_task');
    expect(types).not.toContain('returned_to_original_task');
    expect(types).not.toContain('prior_goal_completed');
    expect(types).not.toContain('final_core_stability_bonus');

    const reckless = events.find(
      (e) => e.event_type === 'hazard_reckless_continue',
    );

    expect(reckless?.metadata?.info_checked_before_continuing).toBe(false);

    const summary = await getSummary(page);

    expect(summary.game_inappropriate_persistence).toBe(1); // reckless only
    expect(summary.blind_retry_count).toBe(1);
    expect(summary.abandonment_count).toBe(0); // legacy metric: hazard_avoidance only
    expect(summary.control_tutorial_skipped).toBe(true);
    expect(summary.game_uncertainty_persistence).toBe(0);

    expectSessionMetadata(events, params);
    expectNoRuntimeErrors(errors);
  });

  test('P3 avoid/defer: practiced tutorial, deferred-then-completed side repair, avoided hazard, ignored alert, repeated wrong code, rushed core', async ({
    page,
  }) => {
    test.setTimeout(1_200_000);

    const errors = captureErrors(page);
    const params = {
      participant_id: 'A4_P3',
      game_session_id: 'A4_JOURNEY_S3',
      condition: 'pilot',
      game_version: 'e2e',
    };

    await bootJourney(page, params);
    await completeDockTutorial(page, 3); // practice movement first
    await dockToHubJourney(page);

    // Route-gate prerequisite: the four pilot decisions are completed on
    // the way (Final Core is locked otherwise).
    await completePilotScenario(page, 'priority_allocation');

    // Side repair: formally defer, leave, return, then complete (defer
    // must NOT complete the room; the offer must reopen on re-entry).
    await hubToStationJourney(page, 'optional_side_repair_bay');
    await openStationAlcove(page);
    await selectPromptOption(page, 3); // formally defer (FABLE-NEXT-03 order)
    await stationToHubJourney(page, 'optional_side_repair_bay');

    let mission = await missionState(page);

    expect(mission.side_repair_status).toBe('deferred');
    expect(mission.completed_rooms).not.toContain('optional_side_repair_bay');

    // Reopened offer -> the observed multi-step task (accept, fetch at
    // the shelf, fit and check at the console — FABLE-NEXT-03).
    await hubToStationJourney(page, 'optional_side_repair_bay');
    await openStationAlcove(page);
    await selectPromptOption(page, 2); // accept the stabiliser repair
    await driveAxisTo(page, 'y', 272, 12);
    await hold(page, 'ArrowLeft', 2400);
    await press(page, 'Space');
    await selectPromptOption(page, 1); // collect the replacement part
    await driveAxisTo(page, 'x', 320, 12);
    await openStationAlcove(page);
    await selectPromptOption(page, 1); // seat the part
    await press(page, 'Space');
    await selectPromptOption(page, 1); // run the system check -> complete
    await stationToHubJourney(page, 'optional_side_repair_bay');

    expect((await missionState(page)).side_repair_status).toBe('completed');

    // Hazard: avoid the uncertain route (D1 branch — legacy + canonical).
    await hubToStationJourney(page, 'hazard_control_room');
    await openStationAlcove(page);
    await selectPromptOption(page, 3);
    await stationToHubJourney(page, 'hazard_control_room');

    expect((await missionState(page)).hazard_status).toBe('route_avoided');

    // Interruption: ignore the alert completely.
    await hubToStationJourney(page, 'interruption_corridor');
    await openStationAlcove(page);
    await selectPromptOption(page, 3);
    await stationToHubJourney(page, 'interruption_corridor');

    expect((await missionState(page)).interruption_status).toBe(
      'alert_ignored',
    );

    // Scenario A (Engineer Hub) — required by the route gate; Kai's
    // report-back task stays untouched on this journey.
    await hubToStationJourney(page, 'engineer_hub');
    await completePilotScenario(page, 'calibration_anomaly');
    await stationToHubJourney(page, 'engineer_hub');

    // Archive: same wrong code twice (blind retry), then feedback +
    // revise, then the records decision (Scenario C).
    await hubToStationJourney(page, 'archive_room');
    await openStationAlcove(page);
    await selectPromptOption(page, 1);
    await openStationAlcove(page);
    await selectPromptOption(page, 1);
    await openStationAlcove(page);
    await selectPromptOption(page, 2);
    await openStationAlcove(page);
    await selectPromptOption(page, 3);
    await completePilotScenario(page, 'incident_reconciliation');
    await stationToHubJourney(page, 'archive_room');

    // Scenario D (Inventory / Prep) — required by the route gate; kit
    // prep is deliberately left untouched (missing-kit blocker preserved).
    await hubToStationJourney(page, 'inventory_prep_room');
    await completePilotScenario(page, 'protocol_breach');
    await stationToHubJourney(page, 'inventory_prep_room');

    // Final Core: start synchronization immediately (rushed, low quality;
    // the missing-kit blocker exists but options 1-3 stay available).
    await hubToStationJourney(page, 'final_core_room');
    await openStationAlcove(page);
    await selectPromptOption(page, 1);

    mission = await missionState(page);

    expect(mission.final_core_status).toBe('completed_low_quality');

    const events = await journeyEvents(page);
    const types = events.map((e) => e.event_type);

    expectEventSubsequence(types, [
      'dock_movement_practiced',
      'side_repair_deferred',
      'side_repair_completed',
      'final_bonus_unlocked',
      'hazard_avoidance',
      'hazard_route_avoided',
      'interruption_alert_ignored',
      'task_avoidance',
      'archive_same_wrong_code_repeated',
      'archive_completed',
      'final_core_stability_bonus',
      'final_core_quick_sync',
      'final_core_rushed',
      'final_core_low_quality_completion',
    ]);

    // D1 pins: the canonical avoidance event is telemetry-only.
    const avoided = events.find((e) => e.event_type === 'hazard_route_avoided');

    expect(avoided?.study_item_ids).toEqual([]);
    expect(avoided?.construct_id).toBeUndefined();

    expect(types).not.toContain('hazard_informed_continue');
    expect(types).not.toContain('hazard_reckless_continue');
    expect(count(types, 'side_repair_discovered')).toBe(1);
    expect(count(types, 'stabiliser_option_offered')).toBeGreaterThanOrEqual(2);

    const summary = await getSummary(page);

    expect(summary.abandonment_count).toBe(1); // legacy hazard_avoidance
    expect(summary.blind_retry_count).toBe(1); // repeated wrong code
    expect(summary.game_inappropriate_persistence).toBe(1);
    expect(summary.control_movement_practiced).toBe(true);
    expect(summary.final_core_completion_quality).toBe('low');
    expect(summary.productiveness_completed_optional_task).toBe(true);

    expectSessionMetadata(events, params);
    expectNoRuntimeErrors(errors);
  });
});
