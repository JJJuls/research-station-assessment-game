import { expect, test } from '@playwright/test';

import {
  bootGame,
  dockToHub,
  findEvent,
  findEvents,
  getEvents,
  getEventTypes,
  getSummary,
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
          getMissionState: () => {
            accepted_duties: string[];
            skipped_duties: string[];
            active_objectives: string[];
          };
        };
      }
    ).researchRuntime.getMissionState(),
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

  test('clarification path: supervised report telemetry, duty declined', async ({
    page,
  }) => {
    await bootGame(page, {
      participant_id: 'E2E_P5',
      game_session_id: 'E2E_ENG_S3',
      condition: 'pilot',
      game_version: 'e2e',
    });
    await dockToHub(page);
    await hubToEngineer(page);

    await openKaiPrompt(page);
    await press(page, '3'); // ask Kai for clarification, then report
    await press(page, '2'); // duty offer stage: decline

    const types = await getEventTypes(page);

    for (const expected of [
      'engineer_clarification_requested',
      'engineer_report_submitted_supervised',
      'engineer_responsibility_adaptive',
      'engineer_supervision_assigned',
      'engineer_supervision_declined',
    ]) {
      expect(types, `${expected} must be logged`).toContain(expected);
    }
    // Emission placement rule: the clarify option never fires the
    // prepared/unprepared families.
    expect(types).not.toContain('engineer_evidence_reviewed');
    expect(types).not.toContain('engineer_report_submitted_prepared');
    expect(types).not.toContain('engineer_report_submitted_unprepared');
    expect(types).not.toContain('engineer_responsibility_shortcut');

    const events = await getEvents(page);
    const clarification = findEvents(
      events,
      'engineer_clarification_requested',
    );
    const supervised = findEvents(
      events,
      'engineer_report_submitted_supervised',
    );

    // Both stay unregistered raw telemetry: no research mapping fields
    // (frozen data — the D5 mapping question is open, tests document
    // reality, never anticipate rulings).
    expect(clarification).toHaveLength(1);
    expect(supervised).toHaveLength(1);
    for (const event of [clarification[0], supervised[0]]) {
      expect(event.room_id).toBe('engineer_hub');
      expect(event.study_item_ids).toBeUndefined();
      expect(event.construct_id).toBeUndefined();
      expect(event.success).toBeUndefined();
    }

    // Scoring separation: the supervised report feeds the report-count and
    // prepared-report variables, and only the supervision flag flips.
    const summary = await getSummary(page);

    expect(summary.responsibility_supervision_used).toBe(true);
    expect(summary.responsibility_report_count).toBe(1);
    expect(summary.responsibility_prepared_report).toBe(true);
    expect(summary.responsibility_shortcut_count).toBe(0);
    expect(summary.responsibility_adaptive_count).toBe(1);

    const mission = await getMissionState(page);

    expect(mission.skipped_duties).toContain('relay_supervision');
    expect(mission.accepted_duties).not.toContain('relay_supervision');
  });
});
