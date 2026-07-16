import type { Page } from '@playwright/test';
import { expect } from '@playwright/test';

import type { HubStationRoomId, LaunchParams, RawEventLike } from './helpers';
import {
  driveAxisTo,
  getEvents,
  hold,
  hubToStationDoor,
  press,
} from './helpers';

/**
 * Sprint A (A3): reusable connected-journey helpers. Journeys drive the
 * world through REAL doors and transitions; direct `?scene=` launches are
 * for room-isolation specs only. Geometry references:
 * docs/architecture/transition-inventory.json (audited at 201c8fa).
 *
 * Every movement leg follows the verified wall-clamp rule (helpers.ts):
 * clamp legs are position- and load-independent; only the final short leg
 * is timed.
 */

/** Phaser scene keys per canonical room_id (transition inventory). */
export const SCENE_KEY: Record<HubStationRoomId, string> = {
  archive_room: 'archive',
  systems_repair_room: 'repair',
  engineer_hub: 'engineer',
  inventory_prep_room: 'inventory',
  hazard_control_room: 'hazard',
  optional_side_repair_bay: 'side_repair',
  interruption_corridor: 'interruption',
  final_core_room: 'final_core',
};

/**
 * Exit-door x per room, for the position-synced east leg from the west-wall
 * clamp along the clear bottom corridor. 20×13 rooms: door x 320 (verified
 * value from the Wave 1B repair spec); 24×9 interruption corridor: door
 * x 384. (Replaces the former fixed-duration 1550/1950 ms legs — the known
 * movement-undershoot flake genre: under CPU load Phaser's frame-delta cap
 * under-delivers a timed hold, observed live on this leg during the
 * pilot-slice bring-up.)
 */
const EXIT_DOOR_X: Record<HubStationRoomId, number> = {
  archive_room: 320,
  systems_repair_room: 320,
  engineer_hub: 320,
  inventory_prep_room: 320,
  hazard_control_room: 320,
  optional_side_repair_bay: 320,
  interruption_corridor: 384,
  final_core_room: 320,
};

export interface ErrorCapture {
  pageErrors: string[];
  consoleErrors: string[];
}

/**
 * Installs page-error and console-error listeners. Call BEFORE the first
 * goto; assert with expectNoRuntimeErrors at the end of the journey.
 */
export function captureErrors(page: Page): ErrorCapture {
  const capture: ErrorCapture = { pageErrors: [], consoleErrors: [] };

  page.on('pageerror', (error) => capture.pageErrors.push(String(error)));
  page.on('console', (message) => {
    if (message.type() === 'error') {
      // Headless-environment noise, not an app error: Chromium's WebAudio
      // renderer intermittently fails against the machine's audio device
      // (SwiftShader/headless session). Nothing in the game reads audio
      // state; every genuine app failure still fails the gate.
      if (
        message
          .text()
          .includes('The AudioContext encountered an error from the audio')
      ) {
        return;
      }

      capture.consoleErrors.push(message.text());
    }
  });

  return capture;
}

export function expectNoRuntimeErrors(capture: ErrorCapture) {
  expect(capture.pageErrors).toEqual([]);
  expect(capture.consoleErrors).toEqual([]);
}

interface SceneStartFilter {
  type: string;
  scene?: string;
  n: number;
}

/**
 * Current occurrence count of (event_type[, scene]). Capture this BEFORE
 * the action that should produce the next occurrence — reading it after
 * the action races the game (a fast transition may already have logged the
 * event, and waiting for count+1 would then hang; demonstrated live during
 * A3 bring-up).
 */
export async function eventCount(page: Page, type: string, scene?: string) {
  return page.evaluate(
    ({ type: t, scene: s }) => {
      const events = (
        window as unknown as {
          researchRuntime: {
            getEvents: () => { event_type: string; scene?: string }[];
          };
        }
      ).researchRuntime.getEvents();

      return events.filter(
        (e) => e.event_type === t && (s === undefined || e.scene === s),
      ).length;
    },
    { type, scene },
  );
}

/**
 * Waits until (event_type[, scene]) has occurred at least `n` times, then
 * settles for the fade-in. Compose with eventCount captured BEFORE the
 * triggering action: `waitForEventCount(page, type, scene, before + 1)`.
 * Safe for re-entries and once-per-session events alike — unlike
 * waitForRoomEntry, it can never match a stale prior occurrence.
 */
export async function waitForEventCount(
  page: Page,
  type: string,
  scene: string | undefined,
  n: number,
) {
  await page.waitForFunction(
    ({ type: t, scene: s, n: wanted }: SceneStartFilter) => {
      const events = (
        window as unknown as {
          researchRuntime: {
            getEvents: () => { event_type: string; scene?: string }[];
          };
        }
      ).researchRuntime.getEvents();

      return (
        events.filter(
          (e) => e.event_type === t && (s === undefined || e.scene === s),
        ).length >= wanted
      );
    },
    { type, scene, n },
    { timeout: 15_000 },
  );
  await page.waitForTimeout(800);
}

/**
 * Boots a session with Qualtrics-style launch params and waits for the
 * given room's scene_start (works for the Dock default and any direct
 * `?scene=` launch; tolerates the intro settle).
 */
export async function bootJourney(
  page: Page,
  params: LaunchParams,
  expectedSceneKey = 'dock',
) {
  const search = new URLSearchParams(
    Object.entries(params).filter(([, v]) => v !== undefined) as [
      string,
      string,
    ][],
  );

  await page.goto(`/?${search.toString()}`);
  await page.waitForFunction(
    (scene) => {
      const rr = (
        window as unknown as {
          researchRuntime?: {
            getEvents: () => { event_type: string; scene?: string }[];
          };
        }
      ).researchRuntime;

      return (
        rr !== undefined &&
        rr
          .getEvents()
          .some((e) => e.event_type === 'scene_start' && e.scene === scene)
      );
    },
    expectedSceneKey,
    { timeout: 60_000 },
  );
  // Intro feedback/typewriter settle (prompts are suppressed while typing).
  await page.waitForTimeout(2200);
}

/**
 * Dock -> Hub through the top door, from ANY position (pocket/crate-safe
 * anchor: south clamp, 200 ms up-hop — sized so the traversal row clears
 * BOTH the crate block rows 7-8 and the bottom doorway pocket — west
 * clamp, north clamp, timed east leg to the door at x 368).
 */
export async function dockToHubJourney(page: Page) {
  const before = await eventCount(page, 'scene_start', 'hub');

  // Anchor legs stay fixed-duration clamps; the west/north/east legs are
  // position-synced (driveAxisTo ends on the OBSERVED position or a wall
  // stall, so CPU load can never silently under-deliver them — the former
  // timed east leg to the door at x 368 failed under load).
  await hold(page, 'ArrowDown', 3000);
  await hold(page, 'ArrowUp', 200);
  await driveAxisTo(page, 'x', 30, 24);
  await driveAxisTo(page, 'y', 40, 16);
  await driveAxisTo(page, 'x', 368, 16);
  await press(page, 'Space');
  await waitForEventCount(page, 'scene_start', 'hub', before + 1);
}

/**
 * Opens the room's primary station prompt from the room's entry spawn:
 * every primary alcove (all eight stations + the Dock hub-door column) sits
 * directly north of its spawn behind a clamping alcove wall (Up 900
 * overshoots and clamps in interaction range — openArchiveTerminal
 * precedent, verified per room in the wave specs).
 */
export async function openStationAlcove(page: Page) {
  await hold(page, 'ArrowUp', 900);
  await press(page, 'Space');
}

/**
 * Dock tutorial from ANY dock position: west clamp (crate-safe at every
 * spawn row), north clamp to the terminal corner (96, 96), SPACE, then the
 * chosen option (1 skip / 2 review+confirm / 3 practice+confirm — labels
 * frozen, option order is the author's declared order).
 */
export async function completeDockTutorial(page: Page, option: 1 | 2 | 3) {
  await hold(page, 'ArrowLeft', 2400);
  await hold(page, 'ArrowUp', 2400);
  await press(page, 'Space');
  await press(page, `${option}`);
}

/** Hub bottom door -> Dock (count-aware; re-entry safe). */
export async function hubToDockJourney(page: Page) {
  const before = await eventCount(page, 'scene_start', 'dock');

  // Pocket/block-safe normalization (see hubToStationDoor): south clamp,
  // short Up hop onto a clear row, then position-synced west, south and
  // east legs to the dock door column (x 416; the door sits in the bottom
  // wall, in range from the bottom corridor row).
  await hold(page, 'ArrowDown', 3200);
  await hold(page, 'ArrowUp', 400);
  await driveAxisTo(page, 'x', 44, 12);
  await driveAxisTo(page, 'y', 424, 12);
  await driveAxisTo(page, 'x', 416, 12);
  await press(page, 'Space');
  await waitForEventCount(page, 'scene_start', 'dock', before + 1);
}

/**
 * Hub -> station through its door-ring door (count-aware wait on the
 * target's scene_start, so it works on first entry AND re-entry).
 */
export async function hubToStationJourney(
  page: Page,
  roomId: HubStationRoomId,
) {
  const scene = SCENE_KEY[roomId];
  const before = await eventCount(page, 'scene_start', scene);

  await hubToStationDoor(page, roomId);
  await waitForEventCount(page, 'scene_start', scene, before + 1);
}

/**
 * Station -> Hub through the room's single exit door, from ANY position:
 * clamp south, clamp west along the (audited) clear bottom corridor, timed
 * east leg to the door, SPACE.
 */
export async function stationToHubJourney(
  page: Page,
  roomId: HubStationRoomId,
) {
  const before = await eventCount(page, 'scene_start', 'hub');

  // Clamp legs sized for the full room extents (20×13 rooms: worst
  // horizontal traverse ≈ 552 px), so the exit works from ANY position;
  // the final east leg is position-synced on the observed player x so CPU
  // load can never make it silently under-shoot the door column.
  await hold(page, 'ArrowDown', 2400);
  await hold(page, 'ArrowLeft', 3400);
  await driveAxisTo(page, 'x', EXIT_DOOR_X[roomId], 20);
  await press(page, 'Space');
  await waitForEventCount(page, 'scene_start', 'hub', before + 1);
}

/** Round trip Hub -> station -> Hub (reachability + transition check). */
export async function stationRoundTrip(page: Page, roomId: HubStationRoomId) {
  await hubToStationJourney(page, roomId);
  await stationToHubJourney(page, roomId);
}

export interface MissionStateLike {
  current_room_id: string;
  completed_rooms: string[];
  active_objectives: string[];
  unresolved_objectives: string[];
  accepted_duties: string[];
  skipped_duties: string[];
  prepared_items: string[];
  workspace_status: string;
  hazard_status: string;
  side_repair_status: string;
  interruption_status: string;
  final_core_status: string;
}

/** Live mission state via the dev-only debug API (defensive copy). */
export async function missionState(page: Page): Promise<MissionStateLike> {
  return page.evaluate(() =>
    (
      window as unknown as {
        researchRuntime: { getMissionState: () => MissionStateLike };
      }
    ).researchRuntime.getMissionState(),
  );
}

/**
 * Asserts `expected` appears within `types` in order (subsequence match —
 * other events may interleave). Reports the first missing element.
 */
export function expectEventSubsequence(types: string[], expected: string[]) {
  let cursor = 0;

  for (const wanted of expected) {
    const found = types.indexOf(wanted, cursor);

    expect(
      found,
      `expected "${wanted}" after index ${cursor} in [${types.join(', ')}]`,
    ).toBeGreaterThanOrEqual(0);
    cursor = found + 1;
  }
}

/** Asserts every logged event carries the launch metadata (V3 §3.2). */
export function expectSessionMetadata(
  events: RawEventLike[],
  expected: Pick<LaunchParams, 'participant_id' | 'game_session_id'> & {
    condition?: string;
    game_version?: string;
  },
) {
  expect(events.length).toBeGreaterThan(0);

  for (const event of events) {
    expect(event.participant_id).toBe(expected.participant_id);
    expect(event.game_session_id).toBe(expected.game_session_id);

    if (expected.condition !== undefined) {
      expect(event.condition).toBe(expected.condition);
    }

    if (expected.game_version !== undefined) {
      expect(event.game_version).toBe(expected.game_version);
    }
  }
}

/**
 * Completes the debug session and returns { summary, returnUrl } for
 * return-flow assertions (dev-only surface; appends objective_completed —
 * call only at the END of a journey).
 */
export async function completeReturnFlow(page: Page) {
  return page.evaluate(() =>
    (
      window as unknown as {
        researchRuntime: {
          completeDebugSession: () => {
            summary: Record<string, unknown>;
            returnUrl: string | null;
          };
        };
      }
    ).researchRuntime.completeDebugSession(),
  );
}

/** All raw events (re-exported for journey specs' single import). */
export async function journeyEvents(page: Page): Promise<RawEventLike[]> {
  return getEvents(page);
}
