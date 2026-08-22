/**
 * Pilot-route e2e helpers (professional pilot, Unit 2+).
 *
 * Real keyboard input only (position-synced via the DEV `__playerProbe`),
 * read-only DEV probes (`__pilotProbe`, `__pilotMapProbe`,
 * `__pilotOpeningProbe`, `__pilotCoverage`), never teleports, never mutates
 * game state through the window.
 */
import type { Page } from '@playwright/test';
import { expect } from '@playwright/test';

import { driveAxisTo, getEvents, hold, press } from './helpers';

export interface PilotProbe {
  zone: string;
  stage: string;
  objective: string;
  beacon: {
    x: number;
    y: number;
    label: string;
    kind: string;
    visible: boolean;
  } | null;
  launch_mode: string;
  route: {
    stage: string;
    current_zone: string | null;
    visited: string[];
    entry_counts: Record<string, number>;
  };
}

export interface PilotCoverageProbe {
  launch_mode: string;
  developer_scenes_visited: string[];
  items: {
    item: string;
    disposition: string;
    status: string;
    opportunities: { opportunity_id: string; status: string }[];
  }[];
  summary: {
    scheduled: number;
    closed: number;
    open: number;
    neverEnteredLabels: string[];
  };
  final_core_closed: boolean;
}

/** Well-known pilot positions (mirrors src/pilot/pilotRoute.ts PILOT_DOORS + zoneSites). */
export const PILOT = {
  dock: { terminal: { x: 96, y: 96 }, northDoor: { x: 368, y: 48 } },
  concourse: {
    vale: { x: 496, y: 272 },
    filingDesk: { x: 96, y: 272 },
    pressA: { x: 192, y: 272 },
    pressB: { x: 288, y: 272 },
    northDoor: { x: 384, y: 48 },
    southDoor: { x: 384, y: 496 },
    eastDoor: { x: 752, y: 272 },
  },
  lab: {
    kai: { x: 448, y: 304 },
    orientation: { x: 112, y: 176 },
    lattice: { x: 672, y: 224 },
    diagnosis: { x: 672, y: 384 },
    airlock: { x: 384, y: 48 },
    southDoor: { x: 384, y: 496 },
  },
  yard: {
    noor: { x: 300.8, y: 428.8 },
    airlock: { x: 384, y: 496 },
  },
  deck: {
    coreConsole: { x: 400, y: 134.4 },
    westDoor: { x: 64, y: 272 },
  },
} as const;

export async function pilotProbe(page: Page): Promise<PilotProbe | null> {
  return page.evaluate(
    () =>
      (window as unknown as { __pilotProbe?: PilotProbe | null })
        .__pilotProbe ?? null,
  );
}

export async function pilotCoverage(
  page: Page,
): Promise<PilotCoverageProbe | null> {
  return page.evaluate(
    () =>
      (window as unknown as { __pilotCoverage?: PilotCoverageProbe | null })
        .__pilotCoverage ?? null,
  );
}

export async function playerScene(page: Page): Promise<string | null> {
  return page.evaluate(
    () =>
      (window as unknown as { __playerProbe?: { scene: string } | null })
        .__playerProbe?.scene ?? null,
  );
}

export async function waitScene(page: Page, scene: string, timeout = 30_000) {
  await page.waitForFunction(
    (expected) =>
      (window as unknown as { __playerProbe?: { scene: string } | null })
        .__playerProbe?.scene === expected,
    scene,
    { timeout },
  );
  await page.waitForTimeout(900);
}

/**
 * Boots the participant default (the Dock, opening overlay shown) and skips
 * the opening with one key press; resolves once the Dock is live.
 */
export async function bootPilot(
  page: Page,
  tag: string,
  options?: { extra?: string; skipOpening?: boolean },
) {
  await page.goto(
    `/?participant_id=PT_PILOT_${tag}&game_session_id=GS_PILOT_${tag}_${Date.now()}${options?.extra ?? ''}`,
  );
  await page.waitForFunction(
    () =>
      (
        window as unknown as {
          __pilotOpeningProbe?: { open: boolean } | null;
        }
      ).__pilotOpeningProbe?.open === true,
    undefined,
    { timeout: 60_000 },
  );

  if (options?.skipOpening !== false) {
    await page.waitForTimeout(400);
    await press(page, 'Space');
    await waitScene(page, 'dock', 60_000);
    // Typewriter/feedback settle (bootGame precedent).
    await page.waitForTimeout(1600);
  }
}

/** Boots a developer alias directly (no opening). */
export async function bootPilotScene(page: Page, tag: string, scene: string) {
  await page.goto(
    `/?participant_id=PT_PILOT_${tag}&game_session_id=GS_PILOT_${tag}_${Date.now()}&scene=${scene}`,
  );
  await waitScene(page, scene, 60_000);
  await page.waitForTimeout(1200);
}

/** Axis-by-axis position-synced walk (x first unless yFirst). */
export async function walkTo(
  page: Page,
  x: number,
  y: number,
  options?: { yFirst?: boolean; tolerance?: number },
) {
  const tolerance = options?.tolerance ?? 12;

  if (options?.yFirst) {
    await driveAxisTo(page, 'y', y, tolerance);
    await driveAxisTo(page, 'x', x, tolerance);
  } else {
    await driveAxisTo(page, 'x', x, tolerance);
    await driveAxisTo(page, 'y', y, tolerance);
  }
}

/** Walks next to an interactable and presses SPACE (retrying swallowed presses). */
export async function interactAt(
  page: Page,
  at: { x: number; y: number },
  options?: { yFirst?: boolean; approachOffset?: { x: number; y: number } },
) {
  const target = {
    x: at.x + (options?.approachOffset?.x ?? 0),
    y: at.y + (options?.approachOffset?.y ?? 0),
  };

  await walkTo(page, target.x, target.y, { yFirst: options?.yFirst });
  await press(page, 'Space');
}

/** Opens a prompt at the interactable and waits for its cards. */
export async function openPromptAt(
  page: Page,
  at: { x: number; y: number },
  options?: { yFirst?: boolean; approachOffset?: { x: number; y: number } },
) {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    await interactAt(page, at, options);

    const opened = await page
      .waitForFunction(
        () =>
          (window as unknown as { __promptCards?: unknown[] | null })
            .__promptCards !== null &&
          (window as unknown as { __promptCards?: unknown[] | null })
            .__promptCards !== undefined,
        undefined,
        { timeout: 3000 },
      )
      .then(() => true)
      .catch(() => false);

    if (opened) {
      return;
    }
  }

  throw new Error(`prompt did not open at ${at.x},${at.y}`);
}

/** Uses a pilot door and waits for the destination scene. */
export async function useDoor(
  page: Page,
  door: { x: number; y: number },
  destination: string,
  options?: { yFirst?: boolean; approachOffset?: { x: number; y: number } },
) {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    await interactAt(page, door, options);

    const arrived = await page
      .waitForFunction(
        (scene) =>
          (window as unknown as { __playerProbe?: { scene: string } | null })
            .__playerProbe?.scene === scene,
        destination,
        { timeout: 6000 },
      )
      .then(() => true)
      .catch(() => false);

    if (arrived) {
      await page.waitForTimeout(900);
      return;
    }
  }

  throw new Error(`door at ${door.x},${door.y} did not reach ${destination}`);
}

export async function pilotEventTypes(page: Page): Promise<string[]> {
  return (await getEvents(page)).map((event) => event.event_type);
}

export async function expectNoMeasurementEvents(page: Page) {
  const types = await pilotEventTypes(page);

  expect(types.filter((type) => type.startsWith('proto_'))).toEqual([]);
}

export { hold, press };
