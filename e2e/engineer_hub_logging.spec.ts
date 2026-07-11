import { expect, test } from '@playwright/test';

import {
  bootGame,
  dockToHub,
  findEvent,
  getEvents,
  getEventTypes,
  hold,
  hubToStationDoor,
  press,
  waitForRoomEntry,
} from './helpers';

/**
 * V3 §9 spec: engineer_hub_logging.spec.ts — Engineer Hub report paths
 * (prepared vs unprepared) plus the new supervision-duty offer
 * (accept/decline) and its SessionState effects.
 *
 * NOTE (Wave 1A): authored compile-only — Playwright execution is disabled
 * in the authoring session; routes and choreography must be tuned/verified
 * in this room's playwright-game-verify pass.
 */

async function hubToEngineer(page: import('@playwright/test').Page) {
  await hubToStationDoor(page, 'engineer_hub');
  await waitForRoomEntry(page, 'engineer_hub_entered');
}

/** Engineer spawn -> Kai's console: up clamps under the alcove. */
async function openKaiPrompt(page: import('@playwright/test').Page) {
  await hold(page, 'ArrowUp', 900);
  await press(page, 'Space');
}

async function getMissionState(page: import('@playwright/test').Page) {
  return page.evaluate(() =>
    (
      window as unknown as {
        researchRuntime: {
          sessionState: {
            getMissionState: () => {
              accepted_duties: string[];
              skipped_duties: string[];
              active_objectives: string[];
            };
          };
        };
      }
    ).researchRuntime.sessionState.getMissionState(),
  );
}

test.describe('engineer hub logging', () => {
  test('prepared report, then duty accepted', async ({ page }) => {
    await bootGame(page, {
      participant_id: 'E2E_P5',
      game_session_id: 'E2E_ENG_S1',
      condition: 'pilot',
      game_version: 'e2e',
    });
    await dockToHub(page);
    await hubToEngineer(page);

    await openKaiPrompt(page);
    await press(page, '2'); // review evidence, then report (prepared)
    await press(page, '1'); // duty offer stage: accept

    const types = await getEventTypes(page);

    for (const expected of [
      'engineer_hub_entered',
      'engineer_report_opened',
      'engineer_evidence_reviewed',
      'engineer_report_submitted_prepared',
      'engineer_responsibility_adaptive',
      'engineer_supervision_assigned',
      'engineer_supervision_accepted',
    ]) {
      expect(types, `${expected} must be logged`).toContain(expected);
    }
    expect(types).not.toContain('engineer_report_submitted_unprepared');
    expect(types).not.toContain('engineer_supervision_declined');

    const events = await getEvents(page);
    const prepared = findEvent(events, 'engineer_report_submitted_prepared');
    const accepted = findEvent(events, 'engineer_supervision_accepted');
    const assigned = findEvent(events, 'engineer_supervision_assigned');

    expect(prepared?.room_id).toBe('engineer_hub');
    expect(prepared?.study_item_ids).toEqual(['Q09']);
    expect(prepared?.construct_id).toBe('responsibility');
    expect(accepted?.study_item_ids).toEqual(['Q10']);
    expect(accepted?.construct_id).toBe('responsibility');
    // Offer-shown event is deliberately unmapped (no Events-column listing).
    expect(assigned?.study_item_ids).toBeUndefined();

    const mission = await getMissionState(page);

    expect(mission.accepted_duties).toContain('relay_supervision');
    expect(mission.active_objectives).toContain('relay_supervision');
    expect(mission.skipped_duties).not.toContain('relay_supervision');
  });

  test('unprepared report, duty declined — valid choice, no unresolved duty', async ({
    page,
  }) => {
    await bootGame(page, {
      participant_id: 'E2E_P5',
      game_session_id: 'E2E_ENG_S2',
      condition: 'pilot',
      game_version: 'e2e',
    });
    await dockToHub(page);
    await hubToEngineer(page);

    await openKaiPrompt(page);
    await press(page, '1'); // quick report from memory (unprepared)
    await press(page, '2'); // duty offer stage: decline

    const types = await getEventTypes(page);

    for (const expected of [
      'engineer_report_submitted_unprepared',
      'engineer_responsibility_shortcut',
      'engineer_supervision_assigned',
      'engineer_supervision_declined',
    ]) {
      expect(types, `${expected} must be logged`).toContain(expected);
    }
    expect(types).not.toContain('engineer_evidence_reviewed');
    expect(types).not.toContain('engineer_supervision_accepted');
    // Declining never creates an unresolved-duty record (room doc edge case).
    expect(types).not.toContain('accepted_duty_unresolved');

    const mission = await getMissionState(page);

    expect(mission.skipped_duties).toContain('relay_supervision');
    expect(mission.accepted_duties).not.toContain('relay_supervision');
    expect(mission.active_objectives).not.toContain('relay_supervision');

    // One-shot: re-opening Kai must not allow a second submission.
    await openKaiPrompt(page);
    await press(page, '1');

    const typesAfter = await getEventTypes(page);

    expect(
      typesAfter.filter((t) => t === 'engineer_report_submitted_unprepared'),
    ).toHaveLength(1);
    expect(
      typesAfter.filter((t) => t === 'engineer_supervision_assigned'),
    ).toHaveLength(1);
  });
});
