import { expect, test } from '@playwright/test';

import { getEvents, getSummary } from './helpers';
import {
  bootJourney,
  captureErrors,
  completeDockTutorial,
  dockToHubJourney,
  expectNoRuntimeErrors,
  expectSessionMetadata,
  missionState,
} from './journey';

/**
 * ADV-1 (Sprint B Part 1, docs/testing/ADVERSARIAL-JOURNEY-PLAN.md):
 * cross-session participant isolation. Two participants use the SAME
 * browser page sequentially (Qualtrics relaunch in the same tab — the
 * realistic shared-computer/lab scenario). Every store in the game is
 * JS-module-scoped, so a full navigation must recreate all of them; any
 * bleed of events, mission state, or summary variables from participant A
 * into participant B silently corrupts B's derived variables — the highest
 * scientific-data risk in the plan. Asserts documented behaviour only
 * (STATE-AND-SESSION-CONTINUITY.md reload semantics).
 */

test.describe('adversarial: cross-session participant isolation', () => {
  test('second participant in the same tab inherits nothing from the first', async ({
    page,
  }) => {
    const capture = captureErrors(page);

    // — Participant A: leaves distinctive traces in every store —
    await bootJourney(page, {
      participant_id: 'ADV1_PA',
      game_session_id: 'ADV1_SA',
      condition: 'arm_a',
    });
    await completeDockTutorial(page, 1); // dock_tutorial_skipped
    await dockToHubJourney(page); // station_hub_entered + current_room_id

    const eventsA = await getEvents(page);

    expectSessionMetadata(eventsA, {
      participant_id: 'ADV1_PA',
      game_session_id: 'ADV1_SA',
      condition: 'arm_a',
    });
    expect(
      eventsA.filter((e) => e.event_type === 'dock_tutorial_skipped').length,
    ).toBe(1);

    const stateA = await missionState(page);

    expect(stateA.current_room_id).toBe('station_hub');

    // — Participant B: same tab, fresh launch URL —
    await bootJourney(page, {
      participant_id: 'ADV1_PB',
      game_session_id: 'ADV1_SB',
      condition: 'arm_b',
    });

    const eventsB = await getEvents(page);
    const typesB = eventsB.map((e) => e.event_type);

    // Fresh append-only log: exactly one session_start, first in the log.
    expect(typesB.indexOf('session_start')).toBe(0);
    expect(typesB.filter((t) => t === 'session_start').length).toBe(1);

    // No behavioural trace of participant A in B's log.
    expect(typesB).not.toContain('dock_tutorial_skipped');
    expect(typesB).not.toContain('station_hub_entered');

    // Every B event carries B's identity; A's identity appears nowhere.
    expectSessionMetadata(eventsB, {
      participant_id: 'ADV1_PB',
      game_session_id: 'ADV1_SB',
      condition: 'arm_b',
    });
    expect(eventsB.some((e) => e.participant_id === 'ADV1_PA')).toBe(false);
    expect(eventsB.some((e) => e.game_session_id === 'ADV1_SA')).toBe(false);

    // Mission state fully reset to the documented defaults.
    const stateB = await missionState(page);

    expect(stateB.current_room_id).toBe('dock_arrival');
    expect(stateB.completed_rooms).toEqual([]);
    expect(stateB.active_objectives).toEqual([]);
    expect(stateB.accepted_duties).toEqual([]);
    expect(stateB.prepared_items).toEqual([]);
    expect(stateB.workspace_status).toBe('not_started');
    expect(stateB.hazard_status).toBe('not_started');
    expect(stateB.side_repair_status).toBe('not_started');
    expect(stateB.interruption_status).toBe('not_started');

    // Summary derives from B's (empty) behaviour only.
    const summaryBBefore = await getSummary(page);

    expect(summaryBBefore).toMatchObject({
      participant_id: 'ADV1_PB',
      game_session_id: 'ADV1_SB',
      condition: 'arm_b',
      control_tutorial_skipped: false,
      control_tutorial_count: 0,
    });

    // — B acts differently from A; only B's behaviour may be reflected —
    await completeDockTutorial(page, 2); // reviewed path, not skipped

    const summaryBAfter = await getSummary(page);

    expect(summaryBAfter).toMatchObject({
      control_tutorial_skipped: false,
      control_tutorial_completed: true,
      control_instruction_followed: true,
    });

    expectNoRuntimeErrors(capture);
  });
});
