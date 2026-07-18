import { expect, test } from '@playwright/test';

import {
  bootGame,
  dockToHub,
  findEvent,
  findEvents,
  getEvents,
  getEventTypes,
  hold,
  hubToStationDoor,
  press,
  waitForRoomEntry,
} from './helpers';
import { completeAllPilotDecisions } from './journey';

/**
 * V3 §9 spec: final_core_summary.spec.ts — Final Core integration through
 * the connected world: system flag events from real SessionState, the Q28
 * blocker/force-continue branch, duty follow-through, and completion
 * paths. The debug-session/Qualtrics-return preview remains covered by
 * launch_with_research_params.spec.ts (V1 slice).
 *
 * Route gate (pilot route repair): Final Core is locked until all four
 * pilot decisions are completed, so every test completes them first
 * (completeAllPilotDecisions — normal controls, Hub -> Hub). Kit prep,
 * workspace and duty state are untouched by the scenarios, so every
 * legacy flag/blocker assertion below is preserved.
 *
 * NOTE (Wave 1A): authored compile-only — Playwright execution is disabled
 * in the authoring session; routes/choreography must be tuned/verified in
 * this room's playwright-game-verify pass.
 */

async function hubToFinalCore(page: import('@playwright/test').Page) {
  await hubToStationDoor(page, 'final_core_room');
  await waitForRoomEntry(page, 'final_core_entered');
}

/** Core spawn -> core interface: up clamps under the alcove. */
async function openCoreInterface(page: import('@playwright/test').Page) {
  await hold(page, 'ArrowUp', 900);
  await press(page, 'Space');
}

test.describe('final core integration', () => {
  test('fresh session: missing-kit flag, blocker shown, force continue (Q28)', async ({
    page,
  }) => {
    test.setTimeout(900_000);

    await bootGame(page, {
      participant_id: 'E2E_P9',
      game_session_id: 'E2E_CORE_S1',
      condition: 'pilot',
      game_version: 'e2e',
    });
    await dockToHub(page);
    // Route gate: complete the four pilot decisions first (kit prep stays
    // untouched, so the missing-kit flag below is preserved).
    await completeAllPilotDecisions(page);
    await hubToFinalCore(page);

    const typesOnEntry = await getEventTypes(page);

    // No kit was prepared in this session: the system flag is a fact
    // independent of player choices.
    expect(typesOnEntry).toContain('final_core_entered');
    expect(typesOnEntry).toContain('final_core_missing_item_flagged');
    // No workspace interaction happened: no disorder evidence, no flag.
    expect(typesOnEntry).not.toContain('final_core_workspace_issue_flagged');
    expect(typesOnEntry).not.toContain('final_core_stability_bonus');
    expect(typesOnEntry).not.toContain('final_unresolved_due_to_nonreturn');

    await openCoreInterface(page);

    // Outstanding flags exist -> blocker shown, 4th option available.
    expect(await getEventTypes(page)).toContain('final_core_blocker_shown');

    await press(page, '4'); // force through the blocker

    const types = await getEventTypes(page);

    expect(types).toContain('final_core_force_continue');
    expect(types).toContain('final_core_completed');
    // No duty was accepted: no unresolved-duty record.
    expect(types).not.toContain('accepted_duty_unresolved');
    // Legacy quick-sync path was NOT taken.
    expect(types).not.toContain('final_core_quick_sync');

    const events = await getEvents(page);
    const force = findEvent(events, 'final_core_force_continue');
    const completed = findEvent(events, 'final_core_completed');
    const blocker = findEvent(events, 'final_core_blocker_shown');

    expect(force?.room_id).toBe('final_core_room');
    expect(force?.study_item_ids).toEqual(['Q28']);
    expect(force?.construct_id).toBe('inappropriate_persistence');
    expect(blocker?.study_item_ids).toEqual(['Q28']);
    // Dual-listed Q06+Q33: construct deliberately unset.
    expect(completed?.study_item_ids).toEqual(['Q06', 'Q33']);
    expect(completed?.construct_id).toBeUndefined();
  });

  test('resolve path completes the accepted duty (Q10 follow-through)', async ({
    page,
  }) => {
    test.setTimeout(900_000);

    await bootGame(page, {
      participant_id: 'E2E_P9',
      game_session_id: 'E2E_CORE_S2',
      condition: 'pilot',
      game_version: 'e2e',
    });
    await dockToHub(page);
    // Route gate: complete the four pilot decisions first.
    await completeAllPilotDecisions(page);

    // Accept the relay duty at the Engineer Hub first.
    await hubToStationDoor(page, 'engineer_hub');
    await waitForRoomEntry(page, 'engineer_hub_entered');
    await hold(page, 'ArrowUp', 900);
    await press(page, 'Space');
    await press(page, '2'); // prepared report
    await press(page, '4'); // NEXT-04 content stage: accurate claim
    await press(page, '1'); // accept the duty
    await hold(page, 'ArrowDown', 2200);
    await press(page, 'Space');
    await waitForRoomEntry(page, 'station_hub_entered');

    await hubToFinalCore(page);
    await openCoreInterface(page);
    await press(page, '3'); // resolve remaining issue flags

    const types = await getEventTypes(page);

    for (const expected of [
      'final_core_status_reviewed',
      'unresolved_issue_reviewed',
      'final_core_remaining_issues_resolved',
      'issue_resolution_attempted',
      'final_core_issue_resolved',
      'engineer_supervision_completed',
      'final_core_high_quality_completion',
      'final_core_completed',
    ]) {
      expect(types, `${expected} must be logged`).toContain(expected);
    }
    // Duty resolved: never recorded as unresolved.
    expect(types).not.toContain('accepted_duty_unresolved');
    expect(types).not.toContain('final_core_force_continue');

    const events = await getEvents(page);
    const reviewed = findEvent(events, 'final_core_status_reviewed');
    const dutyDone = findEvent(events, 'engineer_supervision_completed');
    const attempted = findEvent(events, 'issue_resolution_attempted');

    expect(reviewed?.study_item_ids).toEqual(['Q11']);
    expect(reviewed?.construct_id).toBe('responsibility');
    expect(dutyDone?.study_item_ids).toEqual(['Q10']);
    expect(dutyDone?.construct_id).toBe('responsibility');
    // Valence-mismatch registration: construct deliberately unset.
    expect(attempted?.study_item_ids).toEqual(['Q28']);
    expect(attempted?.construct_id).toBeUndefined();
  });

  test('rushed path with unresolved duty logs accepted_duty_unresolved', async ({
    page,
  }) => {
    test.setTimeout(900_000);

    await bootGame(page, {
      participant_id: 'E2E_P9',
      game_session_id: 'E2E_CORE_S3',
      condition: 'pilot',
      game_version: 'e2e',
    });
    await dockToHub(page);
    // Route gate: complete the four pilot decisions first.
    await completeAllPilotDecisions(page);

    // Accept the duty, then never resolve it.
    await hubToStationDoor(page, 'engineer_hub');
    await waitForRoomEntry(page, 'engineer_hub_entered');
    await hold(page, 'ArrowUp', 900);
    await press(page, 'Space');
    await press(page, '1'); // quick report
    await press(page, '1'); // NEXT-04 content stage: quick claim from memory
    await press(page, '1'); // accept the duty
    await hold(page, 'ArrowDown', 2200);
    await press(page, 'Space');
    await waitForRoomEntry(page, 'station_hub_entered');

    await hubToFinalCore(page);
    await openCoreInterface(page);
    await press(page, '1'); // start synchronization immediately

    const types = await getEventTypes(page);

    for (const expected of [
      'final_core_quick_sync',
      'final_core_rushed',
      'final_core_unresolved_issues_ignored',
      'final_core_low_quality_completion',
      'final_core_completed',
      'accepted_duty_unresolved',
    ]) {
      expect(types, `${expected} must be logged`).toContain(expected);
    }

    const events = await getEvents(page);
    const rushed = findEvent(events, 'final_core_rushed');
    const unresolvedDuty = findEvent(events, 'accepted_duty_unresolved');

    // Dual-listed Q11+Q33: construct deliberately unset.
    expect(rushed?.study_item_ids).toEqual(['Q11', 'Q33']);
    expect(rushed?.construct_id).toBeUndefined();
    expect(unresolvedDuty?.study_item_ids).toEqual(['Q10']);
    expect(unresolvedDuty?.construct_id).toBe('responsibility');

    // One-shot: the interface must not accept a second decision.
    await press(page, 'Space');
    await press(page, '3');

    expect(
      findEvents(await getEvents(page), 'final_core_completed'),
    ).toHaveLength(1);
  });
});
