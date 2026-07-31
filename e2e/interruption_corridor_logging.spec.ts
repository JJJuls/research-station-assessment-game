import { expect, test } from '@playwright/test';

import {
  bootGame,
  dockToHub,
  driveAxisTo,
  findEvent,
  findEvents,
  getEvents,
  getEventTypes,
  getLastFeedbackText,
  hold,
  hubToStationDoor,
  press,
  waitForRoomEntry,
} from './helpers';
import { completeAllPilotDecisions, hubToStationJourney } from './journey';

/**
 * Interruption Corridor logging — FABLE-NEXT-05 rebuild. The corridor now
 * hosts three stations: the Comms Beacon (legacy options verbatim; the
 * offer is concrete with balanced framing), the Relay Checkpoint (the
 * genuinely pending original objective while the accepted relay duty is
 * active — the observed return act and the original's completion are
 * physical interactions here), and the Antenna Junction (the competing
 * task actually runs: align + confirm). Canonical moments per the task
 * file's binding trigger table: new_goal_offered at the beacon open
 * (beside the frozen interruption_received), goal_switch_accepted at the
 * switch commit, switched_task at the junction's first interaction,
 * return_to_unfinished_task + returned_to_original_task co-fired at the
 * physical return act (SA-9 records the open fold question),
 * prior_goal_completed (+ task_completed_after_interruption when the
 * interruption occurred earlier) at the check-in completion, and
 * prior_goal_abandoned moved to Final-Core-bound closure. The legacy
 * ScoringManager-consumed names keep firing verbatim at their legacy
 * dialogue moments.
 */

async function hubToCorridor(page: import('@playwright/test').Page) {
  await hubToStationDoor(page, 'interruption_corridor');
  await waitForRoomEntry(page, 'interruption_corridor_entered');
}

/** Corridor spawn -> comms beacon: up clamps under the top wall. */
async function openBeacon(page: import('@playwright/test').Page) {
  await hold(page, 'ArrowUp', 900);
  await press(page, 'Space');
}

/** Top-wall lane -> the Antenna Junction (east, x=576). */
async function openJunction(page: import('@playwright/test').Page) {
  await driveAxisTo(page, 'x', 576, 12);
  await press(page, 'Space');
}

/** Top-wall lane -> the Relay Checkpoint (west, x=192). */
async function openCheckpoint(page: import('@playwright/test').Page) {
  await driveAxisTo(page, 'x', 192, 12);
  await press(page, 'Space');
}

/** Accept the relay duty at the Engineer Hub, then return to the Hub. */
async function acceptRelayDuty(page: import('@playwright/test').Page) {
  await hubToStationDoor(page, 'engineer_hub');
  await waitForRoomEntry(page, 'engineer_hub_entered');
  await hold(page, 'ArrowUp', 900);
  await press(page, 'Space');
  await press(page, '2'); // prepared report
  await press(page, '4'); // NEXT-04 content stage: accurate claim
  await press(page, '1'); // accept the duty
  await hold(page, 'ArrowDown', 2200); // back to the Hub door
  await press(page, 'Space');
  await waitForRoomEntry(page, 'station_hub_entered');
}

async function getMissionState(page: import('@playwright/test').Page) {
  return page.evaluate(() =>
    (
      window as unknown as {
        researchRuntime: {
          getMissionState: () => {
            interruption_status: string;
            competing_task_status: string;
            relay_checkpoint_status: string;
            switch_original_task_id: string;
            accepted_duties: string[];
          };
        };
      }
    ).researchRuntime.getMissionState(),
  );
}

test.describe('interruption corridor logging', () => {
  test('switch, run the competing task, observed return, original completed', async ({
    page,
  }) => {
    test.setTimeout(300_000);

    await bootGame(page, {
      participant_id: 'E2E_P8',
      game_session_id: 'E2E_INT_S1',
      condition: 'pilot',
      game_version: 'e2e',
    });
    await dockToHub(page);
    await acceptRelayDuty(page);
    await hubToCorridor(page);

    await openBeacon(page);
    await press(page, '1'); // commit to the competing request

    // The competing task actually runs at the junction.
    await openJunction(page);
    await press(page, '1'); // realign the feed
    await press(page, '1'); // confirm the realignment

    // The observed return act + the original's completion at its station.
    await openCheckpoint(page);
    await press(page, '1'); // review the relay log
    await press(page, '1'); // log the check-in as complete

    const types = await getEventTypes(page);

    for (const expected of [
      'interruption_corridor_entered',
      'objective_active',
      'interruption_opened',
      'interruption_received',
      'new_goal_offered',
      'interruption_new_task_chosen',
      'interruption_previous_task_abandoned',
      'interruption_focus_lost',
      'goal_switch_accepted',
      'switched_task',
      'return_to_unfinished_task',
      'returned_to_original_task',
      'prior_goal_completed',
      'task_completed_after_interruption',
    ]) {
      expect(types, `${expected} must be logged`).toContain(expected);
    }
    // Never-return closure events must NOT fire on the returned arc.
    expect(types).not.toContain('prior_goal_abandoned');
    expect(types).not.toContain('final_unresolved_due_to_nonreturn');
    // Unemitted-by-design (open decisions / candidates).
    expect(types).not.toContain('competing_task_viewed');
    expect(types).not.toContain('task_deferred');
    expect(types).not.toContain('task_started');
    expect(types).not.toContain('excessive_idle_after_instruction');

    // Observed-moment order: commit -> first competing interaction ->
    // return act -> original completion.
    const order = [
      'goal_switch_accepted',
      'switched_task',
      'return_to_unfinished_task',
      'prior_goal_completed',
    ].map((t) => types.indexOf(t));

    expect([...order].sort((a, b) => a - b)).toEqual(order);

    const events = await getEvents(page);
    const offered = findEvent(events, 'new_goal_offered');
    const committed = findEvent(events, 'goal_switch_accepted');
    const switched = findEvent(events, 'switched_task');
    const returnAct = findEvent(events, 'return_to_unfinished_task');
    const returned = findEvent(events, 'returned_to_original_task');
    const completed = findEvent(events, 'prior_goal_completed');
    const afterInterruption = findEvent(
      events,
      'task_completed_after_interruption',
    );

    // Offer/commit payloads: balanced framing is a validity requirement;
    // the genuinely pending original is recorded by task id.
    const offerMetadata = {
      framing: 'balanced',
      original_task_id: 'relay_checkpoint',
      competing_task_id: 'aux_antenna_alignment',
    };

    expect(offered?.room_id).toBe('interruption_corridor');
    expect(offered?.study_item_ids).toEqual(['Q19']);
    expect(offered?.construct_id).toBe('consistency_of_interest_exploratory');
    expect(offered?.metadata).toEqual(offerMetadata);
    expect(committed?.study_item_ids).toEqual(['Q19']);
    expect(committed?.metadata).toEqual(offerMetadata);

    // The competing first interaction carries the junction's own object.
    expect(switched?.object_id).toBe('aux_antenna_junction');
    expect(switched?.study_item_ids).toEqual(['Q17']);
    expect(switched?.construct_id).toBe('consistency_of_interest_exploratory');
    expect(switched?.metadata).toEqual({
      original_task_id: 'relay_checkpoint',
      competing_task_id: 'aux_antenna_alignment',
    });

    // The co-fired return act (SA-9: Q15 vs Q17 carriers, shared moment).
    expect(returnAct?.object_id).toBe('relay_checkpoint');
    expect(returnAct?.study_item_ids).toEqual(['Q15']);
    expect(returnAct?.construct_id).toBe('adaptive_persistence');
    expect(returned?.object_id).toBe('relay_checkpoint');
    expect(returned?.study_item_ids).toEqual(['Q17']);
    expect(returned?.construct_id).toBe('consistency_of_interest_exploratory');

    // The original's completion (shared act with the Q15 carrier).
    expect(completed?.study_item_ids).toEqual(['Q19']);
    expect(afterInterruption?.study_item_ids).toEqual(['Q15']);
    expect(afterInterruption?.construct_id).toBe('adaptive_persistence');

    const mission = await getMissionState(page);

    expect(mission.interruption_status).toBe('returned_to_task');
    expect(mission.competing_task_status).toBe('completed');
    expect(mission.relay_checkpoint_status).toBe('completed');

    // Once/session: re-engaging the completed stations logs nothing new.
    await openCheckpoint(page);
    expect(await getLastFeedbackText(page)).toBe(
      'The relay check-in is already logged.',
    );
    await openJunction(page);
    expect(await getLastFeedbackText(page)).toBe(
      'The auxiliary antenna feed is already aligned.',
    );

    const typesAfter = await getEventTypes(page);

    for (const once of [
      'new_goal_offered',
      'goal_switch_accepted',
      'switched_task',
      'return_to_unfinished_task',
      'returned_to_original_task',
      'prior_goal_completed',
      'task_completed_after_interruption',
      'objective_active',
    ]) {
      expect(
        typesAfter.filter((t) => t === once),
        `${once} must stay once per session`,
      ).toHaveLength(1);
    }
  });

  test('switch and never return: Final Core closure integrity', async ({
    page,
  }) => {
    test.setTimeout(900_000);

    await bootGame(page, {
      participant_id: 'E2E_P8',
      game_session_id: 'E2E_INT_S2',
      condition: 'pilot',
      game_version: 'e2e',
    });
    await dockToHub(page);
    // Route gate: the four pilot decisions must be complete first.
    await completeAllPilotDecisions(page);
    await acceptRelayDuty(page);
    await hubToCorridor(page);

    await openBeacon(page);
    await press(page, '1'); // commit to the competing request
    await openJunction(page);
    await press(page, '1'); // realign the feed
    await press(page, '1'); // confirm the realignment
    // Leave WITHOUT re-engaging the pending relay checkpoint (re-center on
    // the door column first — the junction is 192px east of the door).
    await driveAxisTo(page, 'x', 384, 12);
    await hold(page, 'ArrowDown', 2400);
    await press(page, 'Space');
    await waitForRoomEntry(page, 'station_hub_entered');

    await hubToStationJourney(page, 'final_core_room');
    await waitForRoomEntry(page, 'final_core_entered');

    // Entry flag (unchanged semantics): switched away and not returned.
    expect(await getEventTypes(page)).toContain(
      'final_unresolved_due_to_nonreturn',
    );

    await hold(page, 'ArrowUp', 900);
    await press(page, 'Space');
    await press(page, '1'); // start synchronization immediately

    const types = await getEventTypes(page);

    for (const expected of [
      'final_core_completed',
      'accepted_duty_unresolved',
      'prior_goal_abandoned',
    ]) {
      expect(types, `${expected} must be logged`).toContain(expected);
    }
    // No return act ever happened.
    expect(types).not.toContain('return_to_unfinished_task');
    expect(types).not.toContain('returned_to_original_task');
    expect(types).not.toContain('prior_goal_completed');
    expect(types).not.toContain('task_completed_after_interruption');

    const events = await getEvents(page);
    const abandoned = findEvent(events, 'prior_goal_abandoned');
    const nonreturn = findEvent(events, 'final_unresolved_due_to_nonreturn');

    // Final-Core-bound closure carries the Final Core interaction context
    // (final_unresolved_due_to_nonreturn precedent).
    expect(abandoned?.room_id).toBe('final_core_room');
    expect(abandoned?.study_item_ids).toEqual(['Q19']);
    expect(abandoned?.construct_id).toBe('consistency_of_interest_exploratory');
    expect(nonreturn?.room_id).toBe('final_core_room');
    expect(nonreturn?.study_item_ids).toEqual(['Q18']);

    expect(findEvents(events, 'prior_goal_abandoned')).toHaveLength(1);

    const mission = await getMissionState(page);

    expect(mission.interruption_status).toBe('switched_away');
    expect(mission.relay_checkpoint_status).toBe('pending');
    expect(mission.switch_original_task_id).toBe('relay_checkpoint');

    // Terminal closure guard: after the mission cycle closed with
    // prior_goal_abandoned, a late checkpoint interaction opens nothing
    // and emits nothing that could contradict the closure.
    await hold(page, 'ArrowDown', 2200);
    await press(page, 'Space');
    await waitForRoomEntry(page, 'station_hub_entered');
    await hubToCorridor(page);
    await hold(page, 'ArrowUp', 900);
    await openCheckpoint(page);
    expect(await getLastFeedbackText(page)).toBe(
      'The relay window closed with the mission cycle.',
    );

    const typesFinal = await getEventTypes(page);

    expect(typesFinal).not.toContain('return_to_unfinished_task');
    expect(typesFinal).not.toContain('returned_to_original_task');
    expect(typesFinal).not.toContain('prior_goal_completed');
  });

  test('acknowledge path: legacy telemetry, later completion without return events', async ({
    page,
  }) => {
    test.setTimeout(300_000);

    await bootGame(page, {
      participant_id: 'E2E_P8',
      game_session_id: 'E2E_INT_S3',
      condition: 'pilot',
      game_version: 'e2e',
    });
    await dockToHub(page);
    await acceptRelayDuty(page);
    await hubToCorridor(page);

    await openBeacon(page);
    await press(page, '2'); // acknowledge, then return to the task

    const types = await getEventTypes(page);

    expect(types).toContain('objective_active');
    for (const expected of [
      'interruption_alert_acknowledged',
      'interruption_returned_to_original_task',
      'interruption_focus_maintained',
    ]) {
      expect(types, `${expected} must be logged`).toContain(expected);
    }
    // The canonical return events are observed acts after a committed
    // switch — the acknowledge dialogue is not a return act.
    expect(types).not.toContain('returned_to_original_task');
    expect(types).not.toContain('return_to_unfinished_task');
    expect(types).not.toContain('goal_switch_accepted');
    expect(types).not.toContain('switched_task');

    const events = await getEvents(page);
    const objectiveActive = findEvent(events, 'objective_active');

    expect(objectiveActive?.study_item_ids).toEqual(['Q18']);
    expect(objectiveActive?.construct_id).toBe(
      'consistency_of_interest_exploratory',
    );

    // The junction stays idle without a committed switch.
    await openJunction(page);
    expect(await getLastFeedbackText(page)).toBe(
      'The junction equipment is idle.',
    );
    expect(await getEventTypes(page)).not.toContain('switched_task');

    // Completing the pending check-in is the original's completion — with
    // an interruption earlier in the session but no switch, it carries the
    // shared Q15 completion evidence and no return act.
    await openCheckpoint(page);
    await press(page, '1'); // review the relay log
    await press(page, '1'); // log the check-in as complete

    const typesAfter = await getEventTypes(page);

    expect(typesAfter).toContain('prior_goal_completed');
    expect(typesAfter).toContain('task_completed_after_interruption');
    expect(typesAfter).not.toContain('return_to_unfinished_task');
    expect(typesAfter).not.toContain('returned_to_original_task');

    const mission = await getMissionState(page);

    expect(mission.interruption_status).toBe('returned_to_task');
    expect(mission.relay_checkpoint_status).toBe('completed');
  });

  test('ignore path: task_avoidance beside legacy events, one-shot gate', async ({
    page,
  }) => {
    await bootGame(page, {
      participant_id: 'E2E_P8',
      game_session_id: 'E2E_INT_S4',
      condition: 'pilot',
      game_version: 'e2e',
    });
    await dockToHub(page);
    await hubToCorridor(page);

    await openBeacon(page);
    await press(page, '3'); // ignore the alert completely

    const types = await getEventTypes(page);

    for (const expected of [
      'interruption_alert_ignored',
      'task_avoidance',
      'interruption_single_task_focus',
      'interruption_possible_rigidity',
    ]) {
      expect(types, `${expected} must be logged`).toContain(expected);
    }

    const events = await getEvents(page);
    const avoidance = findEvent(events, 'task_avoidance');

    expect(avoidance?.study_item_ids).toEqual(['Q08']);
    expect(avoidance?.construct_id).toBe('productiveness');

    // One-shot: the beacon must not accept a second decision.
    await press(page, 'Space');
    await press(page, '1');

    const typesAfter = await getEventTypes(page);

    expect(
      typesAfter.filter((t) => t === 'interruption_new_task_chosen'),
    ).toHaveLength(0);
    expect(
      typesAfter.filter((t) => t === 'interruption_received'),
    ).toHaveLength(1);
    expect(typesAfter.filter((t) => t === 'new_goal_offered')).toHaveLength(1);
  });

  // NEXT-10 CORRIDOR DE-GATING (adopted ruling, 6154a82): the relay
  // check-in is now scheduled for EVERY participant at first corridor
  // entry, so the former "no-opportunity" arc (null original_task_id,
  // no closure observations) no longer occurs on this path. This test —
  // previously "no-opportunity state" — now pins the de-gated
  // behaviour: a duty-free session still receives a genuine pending
  // original, and the full switch/return arc is observable. Q18's
  // objective_active stays state-grounded and untouched (no active
  // objective exists without the duty).
  test('de-gated corridor: duty-free switch carries the scheduled check-in as genuine original', async ({
    page,
  }) => {
    await bootGame(page, {
      participant_id: 'E2E_P8',
      game_session_id: 'E2E_INT_S5',
      condition: 'pilot',
      game_version: 'e2e',
    });
    await dockToHub(page);
    // No duty accepted — the check-in is scheduled by the corridor.
    await hubToCorridor(page);

    const missionAtEntry = await getMissionState(page);

    expect(missionAtEntry.relay_checkpoint_status).toBe('pending');
    expect(missionAtEntry.accepted_duties).toEqual([]);

    await openBeacon(page);
    await press(page, '1'); // commit to the competing request
    await openJunction(page);
    await press(page, '1'); // realign the feed
    await press(page, '1'); // confirm the realignment

    const events = await getEvents(page);
    const offered = findEvent(events, 'new_goal_offered');
    const committed = findEvent(events, 'goal_switch_accepted');
    const switched = findEvent(events, 'switched_task');
    const scheduled = findEvent(events, 'proto_corridor_checkin_scheduled');

    // De-gated opportunity: the genuinely pending original is recorded
    // even though no duty was ever accepted; prior Q10 state is recorded
    // on the scheduling event, never used to gate.
    const offerMetadata = {
      framing: 'balanced',
      original_task_id: 'relay_checkpoint',
      competing_task_id: 'aux_antenna_alignment',
    };

    expect(offered?.metadata).toEqual(offerMetadata);
    expect(committed?.metadata).toEqual(offerMetadata);
    expect(switched?.metadata).toEqual({
      original_task_id: 'relay_checkpoint',
      competing_task_id: 'aux_antenna_alignment',
    });
    expect(scheduled?.metadata).toEqual({
      relay_duty_accepted: false,
      relay_duty_active: false,
    });

    // Q18 unchanged: no active objective exists without the duty.
    expect(events.map((e) => e.event_type)).not.toContain('objective_active');

    // The observed return + completion arc now exists duty-free.
    await hold(page, 'ArrowUp', 900);
    await openCheckpoint(page);
    await press(page, '1'); // review the relay log
    await press(page, '1'); // log the check-in as complete

    const types = await getEventTypes(page);

    expect(types).toContain('return_to_unfinished_task');
    expect(types).toContain('returned_to_original_task');
    expect(types).toContain('prior_goal_completed');
    expect(types).toContain('task_completed_after_interruption');

    const mission = await getMissionState(page);

    expect(mission.interruption_status).toBe('returned_to_task');
    expect(mission.relay_checkpoint_status).toBe('completed');
    expect(mission.switch_original_task_id).toBe('relay_checkpoint');
  });

  // NEXT-10 de-gating note: the pre-ruling premise of this test — a
  // switch committed with NOTHING genuinely pending ("opportunity-less
  // switch") — can no longer arise through the corridor, because the
  // check-in is scheduled for everyone at entry. The commit-time freeze
  // (switch_original_task_id) is retained as an invariant and pinned
  // here from the de-gated angle; the scheduling is also pinned as
  // once-per-session across re-entries and later duty acceptance.
  test('de-gated scheduling is once per session and freezes the commit-time original', async ({
    page,
  }) => {
    test.setTimeout(300_000);

    await bootGame(page, {
      participant_id: 'E2E_P8',
      game_session_id: 'E2E_INT_S6',
      condition: 'pilot',
      game_version: 'e2e',
    });
    await dockToHub(page);

    // Switch with the de-gated scheduled check-in pending (no duty).
    await hubToCorridor(page);
    await openBeacon(page);
    await press(page, '1'); // commit — original frozen at commit time
    await driveAxisTo(page, 'x', 384, 12);
    await hold(page, 'ArrowDown', 2400);
    await press(page, 'Space');
    await waitForRoomEntry(page, 'station_hub_entered');

    // Accept the duty AFTER the switch and re-enter: the schedule does
    // not re-fire, and the frozen original stays the scheduled check-in.
    await acceptRelayDuty(page);
    await hubToCorridor(page);

    const mission = await getMissionState(page);

    expect(mission.relay_checkpoint_status).toBe('pending');
    expect(mission.switch_original_task_id).toBe('relay_checkpoint');
    expect(mission.interruption_status).toBe('switched_away');

    const events = await getEvents(page);

    expect(
      events.filter((e) => e.event_type === 'proto_corridor_checkin_scheduled'),
    ).toHaveLength(1);
  });

  // NEXT-10 de-gating: a duty-free switch now has a genuinely pending
  // original (the scheduled check-in), so non-return DOES close as
  // abandonment at Final Core — previously this arc was uninterpretable
  // ("opportunity-less") without the Q10 duty. Q10's own record
  // (accepted_duty_unresolved) stays strictly duty-gated.
  test('de-gated switch without return: Final Core emits prior_goal_abandoned duty-free', async ({
    page,
  }) => {
    test.setTimeout(900_000);

    await bootGame(page, {
      participant_id: 'E2E_P8',
      game_session_id: 'E2E_INT_S7',
      condition: 'pilot',
      game_version: 'e2e',
    });
    await dockToHub(page);
    // Route gate first, so the corridor arc below stays untouched.
    await completeAllPilotDecisions(page);

    // Switch with the scheduled check-in pending (no duty ever accepted).
    await hubToCorridor(page);
    await openBeacon(page);
    await press(page, '1'); // commit — original frozen: relay_checkpoint
    await openJunction(page);
    await press(page, '1'); // realign the feed
    await press(page, '1'); // confirm the realignment
    await driveAxisTo(page, 'x', 384, 12);
    await hold(page, 'ArrowDown', 2400);
    await press(page, 'Space');
    await waitForRoomEntry(page, 'station_hub_entered');

    await hubToStationJourney(page, 'final_core_room');
    await waitForRoomEntry(page, 'final_core_entered');
    await hold(page, 'ArrowUp', 900);
    await press(page, 'Space');
    await press(page, '1'); // start synchronization immediately

    const types = await getEventTypes(page);

    expect(types).toContain('final_core_completed');
    // Entry flag: legacy switched-away semantics (opportunity-agnostic).
    expect(types).toContain('final_unresolved_due_to_nonreturn');
    // No duty was ever accepted: the Q10 record must NOT fire.
    expect(types).not.toContain('accepted_duty_unresolved');
    // De-gated closure: the switch had a genuinely pending original, the
    // player never returned, so the abandonment closure now exists.
    expect(types).toContain('prior_goal_abandoned');

    const mission = await getMissionState(page);

    expect(mission.interruption_status).toBe('switched_away');
    expect(mission.relay_checkpoint_status).toBe('pending');
    expect(mission.switch_original_task_id).toBe('relay_checkpoint');
  });
});
