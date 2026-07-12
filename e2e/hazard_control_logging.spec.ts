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
  waitForNthEvent,
  waitForRoomEntry,
} from './helpers';

/**
 * V3 §9 spec: hazard_control_logging.spec.ts — Hazard Control Room logging
 * through the connected world (Dock -> Hub -> Hazard Control), per
 * docs/expansion/HAZARD-VERIFICATION-PLAN.md (H1-H11) and user ruling D1:
 * informed/reckless/avoid branches, warning repeatability (no one-shot),
 * the additive canonical hazard_route_avoided beside the verbatim legacy
 * hazard_avoidance (telemetry-only: study_item_ids [], no construct), the
 * live info_checked_before_continuing metadata, session-lifetime informed
 * classification across leave-and-return, hazard_status propagation, and
 * scoring separation (abandonment_count legacy derivation; no construct
 * variable moved by avoidance).
 */

async function hubToHazard(page: import('@playwright/test').Page) {
  await hubToStationDoor(page, 'hazard_control_room');
  await waitForRoomEntry(page, 'hazard_room_entered');
}

/** Hazard spawn -> alert terminal: up clamps under the alcove. */
async function openHazardTerminal(page: import('@playwright/test').Page) {
  await hold(page, 'ArrowUp', 900);
  await press(page, 'Space');
}

/** Terminal alcove -> Hub door (bottom-center, straight lane at x 320). */
async function exitToHub(page: import('@playwright/test').Page, nth: number) {
  await hold(page, 'ArrowDown', 2400);
  await press(page, 'Space');
  await waitForNthEvent(page, 'station_hub_entered', nth);
}

async function getHazardStatus(page: import('@playwright/test').Page) {
  return page.evaluate(
    () =>
      (
        window as unknown as {
          researchRuntime: {
            getMissionState: () => { hazard_status: string };
          };
        }
      ).researchRuntime.getMissionState().hazard_status,
  );
}

test.describe('hazard control logging', () => {
  test('informed path: repeatable warning, info check, informed continue', async ({
    page,
  }) => {
    // H1: no fatal console errors / uncaught exceptions across the whole
    // driven path (collected for the test's full duration).
    const pageErrors: string[] = [];
    const consoleErrors: string[] = [];

    page.on('pageerror', (err) => pageErrors.push(String(err)));
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    await bootGame(page, {
      participant_id: 'E2E_P8',
      game_session_id: 'E2E_HAZ_S1',
      condition: 'pilot',
      game_version: 'e2e',
    });
    await dockToHub(page);
    await hubToHazard(page);

    // H1: canonical entry event, unmapped (no Events-column listing).
    const entered = findEvent(await getEvents(page), 'hazard_room_entered');

    expect(entered?.room_id).toBe('hazard_control_room');
    expect(entered?.study_item_ids).toBeUndefined();
    expect(entered?.construct_id).toBeUndefined();

    // H10: Qualtrics/session metadata rides on room events.
    expect(entered?.participant_id).toBe('E2E_P8');
    expect(entered?.game_session_id).toBe('E2E_HAZ_S1');
    expect(entered?.condition).toBe('pilot');
    expect(entered?.game_version).toBe('e2e');
    expect(entered?.session_id).toBeTruthy();
    expect(typeof entered?.timestamp_ms).toBe('number');
    expect(typeof entered?.elapsed_seconds).toBe('number');

    // H3: check hazard detail.
    await openHazardTerminal(page);
    await press(page, '1');

    // H2: reopening shows the warning again (no one-shot guard).
    await press(page, 'Space');
    await press(page, '2'); // H4: continue after checking -> informed

    const events = await getEvents(page);
    const warnings = findEvents(events, 'hazard_warning_seen');
    const infoChecked = findEvent(events, 'hazard_info_checked');
    const informed = findEvent(events, 'hazard_informed_continue');

    expect(warnings).toHaveLength(2);
    expect(warnings[0]?.study_item_ids).toEqual(['Q12']);
    expect(warnings[0]?.construct_id).toBe('prudence');
    expect(warnings[1]?.study_item_ids).toEqual(['Q12']);

    expect(infoChecked?.room_id).toBe('hazard_control_room');
    // Q12+Q27 dual listing: construct deliberately unset.
    expect(infoChecked?.study_item_ids).toEqual(['Q12', 'Q27']);
    expect(infoChecked?.construct_id).toBeUndefined();
    expect(infoChecked?.success).toBeUndefined();

    expect(informed?.study_item_ids).toEqual(['Q31']);
    expect(informed?.construct_id).toBe('goal_time_exploratory');
    expect(informed?.success).toBeUndefined();
    // No documented metadata mapping for the informed branch.
    expect(informed?.metadata).toBeUndefined();

    expect(await getEventTypes(page)).not.toContain('hazard_reckless_continue');
    expect(await getHazardStatus(page)).toBe('informed_continue');

    // Uncertainty persistence counts info_checked + informed_continue
    // (pre-existing formula, unchanged this beat); nothing maladaptive.
    const summary = await getSummary(page);

    expect(summary.game_uncertainty_persistence).toBe(2);
    expect(summary.game_inappropriate_persistence).toBe(0);
    expect(summary.blind_retry_count).toBe(0);
    expect(summary.abandonment_count).toBe(0);

    expect(pageErrors).toEqual([]);
    expect(consoleErrors).toEqual([]);
  });

  test('reckless path: continue without checking carries live metadata', async ({
    page,
  }) => {
    await bootGame(page, {
      participant_id: 'E2E_P8',
      game_session_id: 'E2E_HAZ_S2',
      condition: 'pilot',
      game_version: 'e2e',
    });
    await dockToHub(page);
    await hubToHazard(page);

    await openHazardTerminal(page);
    await press(page, '2'); // H5: continue with NO prior info check

    const events = await getEvents(page);
    const reckless = findEvent(events, 'hazard_reckless_continue');
    const types = events.map((e) => e.event_type);

    expect(reckless?.room_id).toBe('hazard_control_room');
    expect(reckless?.study_item_ids).toEqual(['Q12', 'Q27', 'Q31']);
    expect(reckless?.construct_id).toBe('inappropriate_persistence');
    expect(reckless?.success).toBeNull();
    // Live-computed flag (event-schema.md §6 worked example).
    expect(reckless?.metadata).toEqual({
      info_checked_before_continuing: false,
    });

    expect(types).not.toContain('hazard_informed_continue');
    expect(types).not.toContain('hazard_info_checked');
    expect(await getHazardStatus(page)).toBe('reckless_continue');

    // H9: pre-existing maladaptive term (formula untouched this beat).
    const summary = await getSummary(page);

    expect(summary.game_inappropriate_persistence).toBe(1);
    expect(summary.blind_retry_count).toBe(1);
    expect(summary.abandonment_count).toBe(0);
    expect(summary.game_uncertainty_persistence).toBe(0);
  });

  test('avoid path (D1): legacy + canonical additive, telemetry-only, no construct scoring', async ({
    page,
  }) => {
    await bootGame(page, {
      participant_id: 'E2E_P8',
      game_session_id: 'E2E_HAZ_S3',
      condition: 'pilot',
      game_version: 'e2e',
    });
    await dockToHub(page);
    await hubToHazard(page);

    await openHazardTerminal(page);
    await press(page, '3'); // H6: avoid uncertain route

    const events = await getEvents(page);
    const types = events.map((e) => e.event_type);
    const legacyAvoid = findEvent(events, 'hazard_avoidance');
    const canonicalAvoid = findEvent(events, 'hazard_route_avoided');

    // D1 invariant 1: both events, legacy first, from one choice.
    expect(findEvents(events, 'hazard_avoidance')).toHaveLength(1);
    expect(findEvents(events, 'hazard_route_avoided')).toHaveLength(1);
    expect(types.indexOf('hazard_avoidance')).toBeLessThan(
      types.indexOf('hazard_route_avoided'),
    );

    // Legacy event preserved verbatim: unregistered, no science context.
    expect(legacyAvoid?.room_id).toBe('hazard_control_room');
    expect(legacyAvoid?.study_item_ids).toBeUndefined();
    expect(legacyAvoid?.construct_id).toBeUndefined();

    // D1 invariant 2: canonical event is raw telemetry only.
    expect(canonicalAvoid?.room_id).toBe('hazard_control_room');
    expect(canonicalAvoid?.study_item_ids).toEqual([]);
    expect(canonicalAvoid?.construct_id).toBeUndefined();
    expect(canonicalAvoid?.success).toBeUndefined();

    // D1 invariants 3-4: avoidance is distinct from every other branch.
    expect(types).not.toContain('hazard_info_checked');
    expect(types).not.toContain('hazard_informed_continue');
    expect(types).not.toContain('hazard_reckless_continue');
    expect(await getHazardStatus(page)).toBe('route_avoided');

    // H8 / D1 invariant 5: abandonment_count still derives solely from the
    // legacy event; avoidance moves NO construct variable.
    const summary = await getSummary(page);

    expect(summary.abandonment_count).toBe(1);
    expect(summary.game_inappropriate_persistence).toBe(0);
    expect(summary.blind_retry_count).toBe(0);
    expect(summary.game_uncertainty_persistence).toBe(0);

    // H11: no completion gate was invented — the room is not marked
    // completed and the terminal stays interactive (legacy repeatable
    // semantics), warning firing again on reopen.
    const completedRooms = await page.evaluate(
      () =>
        (
          window as unknown as {
            researchRuntime: {
              getMissionState: () => { completed_rooms: string[] };
            };
          }
        ).researchRuntime.getMissionState().completed_rooms,
    );

    expect(completedRooms).not.toContain('hazard_control_room');

    await press(page, 'Space');
    await waitForNthEvent(page, 'hazard_warning_seen', 2);
  });

  test('leave-and-return: informed classification survives scene restart', async ({
    page,
  }) => {
    await bootGame(page, {
      participant_id: 'E2E_P8',
      game_session_id: 'E2E_HAZ_S4',
      condition: 'pilot',
      game_version: 'e2e',
    });
    await dockToHub(page);
    await hubToHazard(page);

    // Check details, then leave without continuing.
    await openHazardTerminal(page);
    await press(page, '1');
    await exitToHub(page, 2);

    // H7: return and continue — still an informed continuation (session-
    // lifetime infoChecked state; prototype Main-scene parity).
    await hubToStationDoor(page, 'hazard_control_room');
    await waitForNthEvent(page, 'hazard_room_entered', 2);
    await openHazardTerminal(page);
    await press(page, '2');

    const events = await getEvents(page);
    const types = events.map((e) => e.event_type);

    expect(findEvents(events, 'hazard_room_entered')).toHaveLength(2);
    expect(types).toContain('hazard_informed_continue');
    expect(types).not.toContain('hazard_reckless_continue');
    expect(await getHazardStatus(page)).toBe('informed_continue');
  });
});
