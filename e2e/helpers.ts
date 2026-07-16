import type { Page } from '@playwright/test';

/**
 * Shared driving helpers for the Remote Outpost smoke suite.
 *
 * Input rule (empirically verified): Phaser's JustDown can miss a fast
 * keyboard tap, so every key is HELD ≥150 ms. Movement legs are held
 * arrows at the player's 175 px/s.
 */

export interface RawEventLike {
  event_type: string;
  room_id?: string;
  construct_id?: string;
  study_item_ids?: string[];
  success?: boolean | null;
  metadata?: Record<string, unknown>;
  [key: string]: unknown;
}

export async function hold(page: Page, key: string, ms: number) {
  await page.keyboard.down(key);
  await page.waitForTimeout(ms);
  await page.keyboard.up(key);
  await page.waitForTimeout(120);
}

export async function press(page: Page, key: string) {
  await page.keyboard.down(key);
  await page.waitForTimeout(150);
  await page.keyboard.up(key);
  await page.waitForTimeout(450);
}

export interface LaunchParams {
  participant_id: string;
  game_session_id: string;
  condition?: string;
  game_version?: string;
  return_url?: string;
  scene?: string;
  /** Test-only ingestion unit: only `test` ever enables the exporter. */
  launch_mode?: string;
}

/** Navigates with Qualtrics-style launch params and waits for boot. */
export async function bootGame(page: Page, params: LaunchParams) {
  const search = new URLSearchParams(
    Object.entries(params).filter(([, v]) => v !== undefined) as [
      string,
      string,
    ][],
  );

  await page.goto(`/?${search.toString()}`);
  await page.waitForFunction(
    () =>
      (
        window as unknown as {
          researchRuntime?: { getEvents: () => unknown[] };
        }
      ).researchRuntime !== undefined &&
      (
        window as unknown as { researchRuntime: { getEvents: () => unknown[] } }
      ).researchRuntime.getEvents().length >= 4,
    undefined,
    // Generous: the first load of a session cold-compiles the Vite dep
    // graph, which can exceed 30s on a cold dev server.
    { timeout: 60_000 },
  );
  // Let the intro typewriter finish so prompts are not suppressed.
  await page.waitForTimeout(2200);
}

export async function getEvents(page: Page): Promise<RawEventLike[]> {
  return page.evaluate(
    () =>
      (
        window as unknown as {
          researchRuntime: { getEvents: () => unknown[] };
        }
      ).researchRuntime.getEvents() as never[],
  );
}

export async function getEventTypes(page: Page): Promise<string[]> {
  return (await getEvents(page)).map((e) => e.event_type);
}

export async function getSummary(page: Page): Promise<Record<string, unknown>> {
  return page.evaluate(() =>
    (
      window as unknown as {
        researchRuntime: { getSummary: () => Record<string, unknown> };
      }
    ).researchRuntime.getSummary(),
  );
}

/**
 * Waits until the given canonical room-entry event has been logged, then a
 * settle delay for the fade-in. A fixed post-transition timeout is not
 * enough under load: if the fade + scene boot outlasts it, the next held
 * arrow key is partially swallowed and the route silently under-shoots
 * (observed as the hub status board eating the archive-door SPACE).
 */
export async function waitForRoomEntry(page: Page, eventType: string) {
  await page.waitForFunction(
    (type) =>
      (
        window as unknown as {
          researchRuntime: { getEvents: () => { event_type: string }[] };
        }
      ).researchRuntime
        .getEvents()
        .some((e) => e.event_type === type),
    eventType,
    { timeout: 15_000 },
  );
  await page.waitForTimeout(800);
}

/**
 * Waits until the given event type has been logged at least `count` times.
 * Needed for re-entry paths: waitForRoomEntry matches the FIRST occurrence,
 * so on a second visit it returns instantly while the transition is still
 * in flight and assertions race the re-entry logging.
 */
export async function waitForNthEvent(
  page: Page,
  eventType: string,
  count: number,
) {
  await page.waitForFunction(
    ({ type, n }) =>
      (
        window as unknown as {
          researchRuntime: { getEvents: () => { event_type: string }[] };
        }
      ).researchRuntime
        .getEvents()
        .filter((e) => e.event_type === type).length >= n,
    { type: eventType, n: count },
    { timeout: 15_000 },
  );
  await page.waitForTimeout(800);
}

/**
 * Route rule: every movement leg OVERSHOOTS against a clamping wall.
 * Under CPU load Phaser's frame-delta cap makes a held key deliver less
 * distance than wall-clock duration promises, so exact-duration legs
 * under-shoot doors intermittently. Legs that end pressed into a wall or
 * doorway are load-independent.
 */

/** Dock spawn -> Hub: straight up, clamps inside the top doorway. */
export async function dockToHub(page: Page) {
  await hold(page, 'ArrowUp', 2800);
  await press(page, 'Space');
  await waitForRoomEntry(page, 'station_hub_entered');
}

/** Hub spawn -> Archive: clamp west wall, clamp top wall, short right. */
export async function hubToArchive(page: Page) {
  await hold(page, 'ArrowLeft', 4600); // clamps at the west wall
  await hold(page, 'ArrowUp', 3000); // clamps at the top wall (~y 82)
  await hold(page, 'ArrowRight', 500); // any delivery in 16-145 px is in range
  await press(page, 'Space');
  await waitForRoomEntry(page, 'archive_room_entered');
}

/** Archive spawn -> terminal: up clamps under the terminal alcove. */
export async function openArchiveTerminal(page: Page) {
  await hold(page, 'ArrowUp', 900);
  await press(page, 'Space');
}

/* ————————————————————————————————————————————————————————————————————
 * Wave 1A (U6) reusable room fixtures.
 *
 * Hub door-ring routes for the remaining stations, mirroring the verified
 * hubToArchive pattern: every route starts with wall clamps (position-
 * independent, load-robust), then one short tolerance leg to the door.
 * Door coordinates come from src/world/stationRegistry.ts. Routes for
 * still-sealed rooms are choreography prepared ahead of their build beat —
 * each room's playwright-game-verify pass MUST tune/verify its route
 * before the room's spec is trusted (this session is compile-only).
 * ———————————————————————————————————————————————————————————————————— */

/** Canonical room_ids for the door-ring stations (registry order). */
export type HubStationRoomId =
  | 'archive_room'
  | 'systems_repair_room'
  | 'engineer_hub'
  | 'inventory_prep_room'
  | 'hazard_control_room'
  | 'optional_side_repair_bay'
  | 'interruption_corridor'
  | 'final_core_room';

/**
 * Walks from anywhere in the Hub to the given station door and presses
 * SPACE. Does NOT wait for a room-entry event (sealed doors only log
 * station_hub_sealed_door_attempted; entry event names are per-room) —
 * compose with waitForRoomEntry(page, '<room>_entered') once the room
 * exists.
 */
/**
 * Normalizes the player to the Hub's north-west corner from ANY position
 * (Sprint A A3 finding: routes that clamp horizontally at mid-height wedge
 * against the central console block from side-wall return spawns, and
 * naive south/top clamps can trap the player in a doorway pocket).
 *
 * 1. Down-clamp: ends at the south corridor, on the console-block top, or
 *    inside the dock-door pocket (cols 12-13) — the only three outcomes.
 * 2. Short Up hop (~70 px): escapes any pocket/block-top onto an
 *    always-clear traversal row (rows 5 or 11-13 — never the side-door
 *    rows 6/9, never the block row 8).
 * 3. West-clamp along that clear row, then Up-clamp the obstacle-free
 *    west wall column to the corner.
 */
export async function hubToNorthWestAnchor(page: Page) {
  await hold(page, 'ArrowDown', 3200);
  await hold(page, 'ArrowUp', 400);
  await hold(page, 'ArrowLeft', 4600);
  await hold(page, 'ArrowUp', 3000);
}

export async function hubToStationDoor(page: Page, roomId: HubStationRoomId) {
  // Every route starts at the NW anchor (position independence); east-side
  // doors then clamp across the clear top row (row 2) to the NE corner.
  await hubToNorthWestAnchor(page);

  switch (roomId) {
    // Top-wall doors from the north-west corner:
    case 'archive_room': // door x 128 (~84 px from corner)
      await hold(page, 'ArrowRight', 500);
      break;
    case 'systems_repair_room': // door x 320 (~276 px from corner)
      await hold(page, 'ArrowRight', 1500);
      break;
    // Top-wall doors from the north-east corner:
    case 'engineer_hub': // door x 512 (~276 px from east corner)
      await hold(page, 'ArrowRight', 4600);
      await hold(page, 'ArrowLeft', 1500);
      break;
    case 'inventory_prep_room': // door x 704 (~84 px from east corner)
      await hold(page, 'ArrowRight', 4600);
      await hold(page, 'ArrowLeft', 400);
      break;
    // Left-wall doors (door x 24 is inside the wall; the west clamp
    // already puts the player in x-range):
    case 'hazard_control_room': // door y 208 (~126 px below corner)
      await hold(page, 'ArrowDown', 800);
      break;
    case 'optional_side_repair_bay': // door y 304 (~222 px below corner)
      await hold(page, 'ArrowDown', 1400);
      break;
    // Right-wall doors, from the north-east corner:
    case 'interruption_corridor': // door y 208
      await hold(page, 'ArrowRight', 4600);
      await hold(page, 'ArrowDown', 800);
      break;
    case 'final_core_room': // door y 304
      await hold(page, 'ArrowRight', 4600);
      await hold(page, 'ArrowDown', 1400);
      break;
  }

  await press(page, 'Space');
}

/**
 * Live active-scene player position from the dev-only, read-only probe
 * (RoomScene.update writes it every frame; stripped from production builds).
 * Returns null before the first framed update or if the hook is absent.
 */
export async function playerProbe(
  page: Page,
): Promise<{ scene: string; x: number; y: number } | null> {
  return page.evaluate(
    () =>
      (
        window as unknown as {
          __playerProbe?: { scene: string; x: number; y: number } | null;
        }
      ).__playerProbe ?? null,
  );
}

/**
 * Real-keyboard movement synchronised on OBSERVED player position: holds the
 * arrow key toward `target` on one axis in short bursts, re-reading the
 * dev-only position probe after each, until the player is within `tolerance`
 * of the target OR has stopped advancing on that axis (a wall/obstacle clamp).
 *
 * Unlike a fixed-duration hold, this cannot silently under-deliver when CPU
 * load caps Phaser's per-frame delta — it keeps moving until the game itself
 * reports arrival. Movement is genuine held-key input (no teleport, no state
 * mutation); the bounded burst count is only an anti-hang safety stop, never
 * an interaction retry.
 */
async function driveAxisTo(
  page: Page,
  axis: 'x' | 'y',
  target: number,
  tolerance: number,
) {
  let previous: number | null = null;

  for (let burst = 0; burst < 80; burst++) {
    const probe = await playerProbe(page);
    if (probe === null) {
      return;
    }

    const current = probe[axis];
    if (Math.abs(current - target) <= tolerance) {
      return;
    }
    // Advanced < 2px since the last burst => clamped against a wall on this
    // axis; this is as close as the axis can get, so stop (the caller's
    // waypoints are chosen so a wall clamp lands inside range).
    if (previous !== null && Math.abs(current - previous) < 2) {
      return;
    }
    previous = current;

    const forward = current < target;
    const key =
      axis === 'x'
        ? forward
          ? 'ArrowRight'
          : 'ArrowLeft'
        : forward
          ? 'ArrowDown'
          : 'ArrowUp';
    await hold(page, key, 100);
  }
}

/**
 * Walks from anywhere in the Hub to the Status Board and presses SPACE. The
 * board (HubScene x=13*32, y=7.5*32) is the one interactable with no wall
 * inside its 72px radius — it floats above the central console block — so a
 * fixed-duration approach leg silently under-shoots under CPU load and the
 * SPACE lands out of range. Instead we drive through the hub's guaranteed-
 * clear corridors, ending each leg on the OBSERVED player position:
 *   1. clamp the west wall  (clear vertical corridor, reachable from anywhere);
 *   2. rise to a row well north of the console block (clear across);
 *   3. move east to the board's column (now over the block);
 *   4. descend — clamps on the block top, ~26px from the board, in range.
 */
export async function hubToStatusBoard(page: Page) {
  await driveAxisTo(page, 'x', 30, 24); // west wall (stalls at the clear column)
  await driveAxisTo(page, 'y', 180, 24); // clear row north of the console block
  await driveAxisTo(page, 'x', 416, 24); // board column, over the block
  await driveAxisTo(page, 'y', 260, 20); // descend; stalls on the block top (~232)
  await press(page, 'Space');
}

/**
 * Reads the dev-only, presentation-only feedback-text probe (RoomScene.ts)
 * populated synchronously by showFeedbackMessage — safe to read immediately
 * after the corresponding event (e.g. station_hub_status_board_viewed) is
 * observed, since both happen in the same tick.
 */
export async function getLastFeedbackText(page: Page): Promise<string | null> {
  return page.evaluate(
    () =>
      (window as unknown as { __lastRoomFeedbackText?: string | null })
        .__lastRoomFeedbackText ?? null,
  );
}

/**
 * Selects a numbered prompt option (U3 renderer: numeric keys in declared
 * option order, 1-based).
 */
export async function selectPromptOption(page: Page, optionNumber: number) {
  await press(page, `${optionNumber}`);
}

/** First event of the given type, or undefined. */
export function findEvent(
  events: RawEventLike[],
  eventType: string,
): RawEventLike | undefined {
  return events.find((e) => e.event_type === eventType);
}

/** All events of the given type, in log order. */
export function findEvents(
  events: RawEventLike[],
  eventType: string,
): RawEventLike[] {
  return events.filter((e) => e.event_type === eventType);
}

/**
 * Asserts-by-return the canonical context of one logged event; specs
 * compare against the committed CANONICAL_EVENT_CONTEXT values (study
 * item ids / construct / success are frozen scientific data — specs must
 * always pin them exactly, never loosely).
 */
export function eventContext(event: RawEventLike | undefined) {
  return {
    room_id: event?.room_id,
    study_item_ids: event?.study_item_ids,
    construct_id: event?.construct_id,
    success: event?.success,
  };
}
