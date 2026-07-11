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
async function waitForRoomEntry(page: Page, eventType: string) {
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
  await hold(page, 'ArrowLeft', 2400); // clamps at the west wall
  await hold(page, 'ArrowUp', 2600); // clamps at the top wall (~y 82)
  await hold(page, 'ArrowRight', 500); // any delivery in 16-145 px is in range
  await press(page, 'Space');
  await waitForRoomEntry(page, 'archive_room_entered');
}

/** Archive spawn -> terminal: up clamps under the terminal alcove. */
export async function openArchiveTerminal(page: Page) {
  await hold(page, 'ArrowUp', 900);
  await press(page, 'Space');
}
