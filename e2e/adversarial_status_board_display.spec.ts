import type { Page } from '@playwright/test';
import { expect, test } from '@playwright/test';

import {
  getLastFeedbackText,
  hubToStatusBoard,
  press,
  selectPromptOption,
} from './helpers';
import type { MissionStateLike } from './journey';
import {
  bootJourney,
  captureErrors,
  completeDockTutorial,
  dockToHubJourney,
  expectNoRuntimeErrors,
  hubToStationJourney,
  missionState,
  openStationAlcove,
  stationToHubJourney,
  waitForEventCount,
} from './journey';

/**
 * ADV-5 (Sprint B Part 1, docs/testing/ADVERSARIAL-JOURNEY-PLAN.md, family
 * 14 "stale mission-state display"): the Hub status board must be an
 * accurate, deterministic rendering of SessionState.getMissionState() at
 * every point it is viewed — never stale, never leaked across sessions.
 *
 * Board vocabulary pinned verbatim from the authored source
 * (src/scenes/HubScene.ts buildStatusBoardText + src/world/stationRegistry.ts
 * statusBoardLabel, in door-ring order): "STATION STATUS", "Arrival
 * check-in", then one line per built station using its exact
 * statusBoardLabel, each rendered "logged" (SessionState.completed_rooms
 * includes the room) or "pending" (it does not). All eight stations are
 * built as of this sprint, so the "sealed" collective line never renders —
 * asserted absent, not invented as a new case.
 *
 * Hazard Control's board line is a documented D1 consequence, not a defect:
 * HazardScene never calls markRoomCompleted, so its line stays "pending" no
 * matter which (repeatable) decision is taken — asserted as-is.
 */

const BOARD_LABELS: { roomId: string; label: string }[] = [
  { roomId: 'archive_room', label: 'Archive access' },
  { roomId: 'systems_repair_room', label: 'Systems repair' },
  { roomId: 'engineer_hub', label: 'Engineer report' },
  { roomId: 'inventory_prep_room', label: 'Kit preparation' },
  { roomId: 'hazard_control_room', label: 'Hazard control' },
  { roomId: 'optional_side_repair_bay', label: 'Stabiliser repair' },
  { roomId: 'interruption_corridor', label: 'Comms interruption' },
  { roomId: 'final_core_room', label: 'Core synchronization' },
];

function expectedBoardText(
  mission: Pick<MissionStateLike, 'completed_rooms'>,
): string {
  const done = (roomId: string) =>
    mission.completed_rooms.includes(roomId) ? 'logged' : 'pending';

  const lines = [
    'STATION STATUS',
    `Arrival check-in: ${done('dock_arrival')}`,
    ...BOARD_LABELS.map(({ roomId, label }) => `${label}: ${done(roomId)}`),
  ];

  return lines.join('\n');
}

/** Current occurrence count of the board-viewed event, scoped to the Hub. */
async function boardViewCount(page: Page): Promise<number> {
  return page.evaluate(
    () =>
      (
        window as unknown as {
          researchRuntime: {
            getEvents: () => { event_type: string; scene?: string }[];
          };
        }
      ).researchRuntime
        .getEvents()
        .filter(
          (e) =>
            e.event_type === 'station_hub_status_board_viewed' &&
            e.scene === 'hub',
        ).length,
  );
}

/**
 * Walks to the Status Board, opens it, and returns the rendered text.
 * Captures the view-count baseline BEFORE the triggering walk+SPACE
 * (count-after-action race rule, journey.ts precedent).
 */
async function readBoard(page: Page): Promise<string | null> {
  const before = await boardViewCount(page);

  await hubToStatusBoard(page);
  await waitForEventCount(
    page,
    'station_hub_status_board_viewed',
    'hub',
    before + 1,
  );

  return getLastFeedbackText(page);
}

test.describe('adversarial: Hub status-board display', () => {
  test('board lines are an accurate, deterministic rendering of SessionState across completion, defer, and hazard-decision states', async ({
    page,
  }) => {
    test.setTimeout(900_000);

    const capture = captureErrors(page);

    await bootJourney(page, {
      participant_id: 'ADV5_P1',
      game_session_id: 'ADV5_S1',
      condition: 'adv_status_board',
    });
    await completeDockTutorial(page, 1);
    await dockToHubJourney(page);

    // — Baseline: dock done, all eight stations untouched —
    let board = await readBoard(page);
    let mission = await missionState(page);

    expect(mission.completed_rooms).toEqual(['dock_arrival']);
    expect(board).toBe(expectedBoardText(mission));
    expect(board).not.toContain('sealed');

    // — Archive: fail + abandon (still incomplete) must NOT flip the line —
    await hubToStationJourney(page, 'archive_room');
    await openStationAlcove(page);
    await selectPromptOption(page, 1); // scripted wrong code
    await waitForEventCount(page, 'archive_wrong_code', undefined, 1);
    await stationToHubJourney(page, 'archive_room');

    board = await readBoard(page);
    mission = await missionState(page);
    expect(mission.completed_rooms).toEqual(['dock_arrival']); // still incomplete
    expect(board).toBe(expectedBoardText(mission));

    const boardAfterAbandon = board;

    // — Archive: revisit and complete —
    await hubToStationJourney(page, 'archive_room');
    await openStationAlcove(page);
    await selectPromptOption(page, 3); // revised query — completes
    await waitForEventCount(page, 'archive_completed', undefined, 1);
    await stationToHubJourney(page, 'archive_room');

    board = await readBoard(page);
    mission = await missionState(page);
    expect(mission.completed_rooms).toContain('archive_room');
    expect(board).toBe(expectedBoardText(mission));
    expect(board).not.toBe(boardAfterAbandon); // no stale text carried over

    // — Systems Repair: complete —
    await hubToStationJourney(page, 'systems_repair_room');
    await openStationAlcove(page);
    await selectPromptOption(page, 3); // revised sequence — completes
    await waitForEventCount(page, 'repair_completed', undefined, 1);
    await stationToHubJourney(page, 'systems_repair_room');

    board = await readBoard(page);
    mission = await missionState(page);
    expect(board).toBe(expectedBoardText(mission));

    // — Engineer Hub: quick report, then decline the duty offer —
    await hubToStationJourney(page, 'engineer_hub');
    await openStationAlcove(page);
    await selectPromptOption(page, 1); // quick report -> chains the duty offer
    await waitForEventCount(
      page,
      'engineer_supervision_assigned',
      undefined,
      1,
    );
    await selectPromptOption(page, 2); // decline the duty
    await waitForEventCount(
      page,
      'engineer_supervision_declined',
      undefined,
      1,
    );
    await stationToHubJourney(page, 'engineer_hub');

    board = await readBoard(page);
    mission = await missionState(page);
    expect(board).toBe(expectedBoardText(mission));

    // — Inventory / Prep: sort + verify (single step, no chain) —
    await hubToStationJourney(page, 'inventory_prep_room');
    await openStationAlcove(page);
    await selectPromptOption(page, 3); // sort workspace + verify kit
    await waitForEventCount(page, 'inventory_cleanup_completed', undefined, 1);
    await stationToHubJourney(page, 'inventory_prep_room');

    board = await readBoard(page);
    mission = await missionState(page);
    expect(board).toBe(expectedBoardText(mission));

    // — Optional Side Repair Bay: DEFER first (must NOT flip the line) —
    await hubToStationJourney(page, 'optional_side_repair_bay');
    await openStationAlcove(page);
    await selectPromptOption(page, 4); // formally defer
    await waitForEventCount(page, 'side_repair_deferred', undefined, 1);
    await stationToHubJourney(page, 'optional_side_repair_bay');

    board = await readBoard(page);
    mission = await missionState(page);
    expect(mission.side_repair_status).toBe('deferred');
    expect(mission.completed_rooms).not.toContain('optional_side_repair_bay');
    expect(board).toBe(expectedBoardText(mission));

    const boardAfterDefer = board;

    // — Side Repair: revisit (offer reopens after defer) and complete —
    await hubToStationJourney(page, 'optional_side_repair_bay');
    await openStationAlcove(page);
    await selectPromptOption(page, 1); // ignore -> still completes the room
    await waitForEventCount(page, 'side_repair_ignored', undefined, 1);
    await stationToHubJourney(page, 'optional_side_repair_bay');

    board = await readBoard(page);
    mission = await missionState(page);
    expect(mission.completed_rooms).toContain('optional_side_repair_bay');
    expect(board).toBe(expectedBoardText(mission));
    expect(board).not.toBe(boardAfterDefer); // deferred -> logged is a real flip

    // — Interruption Corridor: ignore the alert (alert_ignored state) —
    await hubToStationJourney(page, 'interruption_corridor');
    await openStationAlcove(page);
    await selectPromptOption(page, 3); // ignore the alert completely
    await waitForEventCount(page, 'interruption_alert_ignored', undefined, 1);
    await stationToHubJourney(page, 'interruption_corridor');

    board = await readBoard(page);
    mission = await missionState(page);
    expect(mission.interruption_status).toBe('alert_ignored');
    expect(mission.completed_rooms).toContain('interruption_corridor');
    expect(board).toBe(expectedBoardText(mission));

    // — Hazard Control: repeatable decisions, last-write-wins hazard_status,
    //   board line NEVER flips (no markRoomCompleted call exists for this
    //   room — documented D1 consequence, asserted as-is) —
    await hubToStationJourney(page, 'hazard_control_room');
    await openStationAlcove(page);
    await selectPromptOption(page, 3); // avoid uncertain route
    await waitForEventCount(page, 'hazard_route_avoided', undefined, 1);
    await stationToHubJourney(page, 'hazard_control_room');

    board = await readBoard(page);
    mission = await missionState(page);
    expect(mission.hazard_status).toBe('route_avoided');
    expect(mission.completed_rooms).not.toContain('hazard_control_room');
    expect(board).toBe(expectedBoardText(mission));

    await hubToStationJourney(page, 'hazard_control_room');
    await openStationAlcove(page);
    await selectPromptOption(page, 1); // check hazard detail
    await waitForEventCount(page, 'hazard_info_checked', undefined, 1);
    await press(page, 'Space'); // feedback dismiss -> prompt re-opens
    await selectPromptOption(page, 2); // continue -> informed (last-write wins)
    await waitForEventCount(page, 'hazard_informed_continue', undefined, 1);
    await stationToHubJourney(page, 'hazard_control_room');

    board = await readBoard(page);
    mission = await missionState(page);
    expect(mission.hazard_status).toBe('informed_continue'); // overwrote route_avoided
    expect(mission.completed_rooms).not.toContain('hazard_control_room'); // still pending
    expect(board).toBe(expectedBoardText(mission));

    // — Final Core: complete last, so the aggregate check below has every
    //   station decided —
    await hubToStationJourney(page, 'final_core_room');
    await openStationAlcove(page);
    await selectPromptOption(page, 1); // start synchronization immediately
    await waitForEventCount(page, 'final_core_completed', undefined, 1);
    await stationToHubJourney(page, 'final_core_room');

    // — Full aggregate check: seven stations logged, Hazard alone pending,
    //   in exact door-ring order, byte-for-byte —
    board = await readBoard(page);
    mission = await missionState(page);

    expect([...mission.completed_rooms].sort()).toEqual(
      [
        'dock_arrival',
        'archive_room',
        'systems_repair_room',
        'engineer_hub',
        'inventory_prep_room',
        'optional_side_repair_bay',
        'interruption_corridor',
        'final_core_room',
      ].sort(),
    );
    expect(board).toBe(
      [
        'STATION STATUS',
        'Arrival check-in: logged',
        'Archive access: logged',
        'Systems repair: logged',
        'Engineer report: logged',
        'Kit preparation: logged',
        'Hazard control: pending',
        'Stabiliser repair: logged',
        'Comms interruption: logged',
        'Core synchronization: logged',
      ].join('\n'),
    );
    expect(board).toBe(expectedBoardText(mission));

    // — Cross-session isolation: a second participant in the SAME browser
    //   context must see a FRESH board (module-scope stores re-created on
    //   load), never P1's seven completed stations —
    await bootJourney(page, {
      participant_id: 'ADV5_P2',
      game_session_id: 'ADV5_S2',
      condition: 'adv_status_board',
    });
    await dockToHubJourney(page);

    board = await readBoard(page);
    mission = await missionState(page);

    expect(mission.completed_rooms).toEqual([]); // no leakage from P1
    expect(board).toBe(expectedBoardText(mission));
    expect(board).toBe(
      [
        'STATION STATUS',
        'Arrival check-in: pending',
        'Archive access: pending',
        'Systems repair: pending',
        'Engineer report: pending',
        'Kit preparation: pending',
        'Hazard control: pending',
        'Stabiliser repair: pending',
        'Comms interruption: pending',
        'Core synchronization: pending',
      ].join('\n'),
    );

    expectNoRuntimeErrors(capture);
  });
});
