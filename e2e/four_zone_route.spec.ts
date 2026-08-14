import type { Page } from '@playwright/test';
import { expect, test } from '@playwright/test';

import { driveAxisTo, playerProbe, press } from './helpers';

/**
 * Four-zone map foundation: focused functional route spec.
 *
 * Verifies the participant route's structure and guidance — not
 * measurement (this route has none, and PROVING that is part of the
 * spec):
 *
 * - default participant launch enters the Station Concourse;
 * - the four zone keys are registered (`?scene=` aliases);
 * - route order is exactly Concourse → Laboratory → Yard →
 *   Utility/Core, one forward transition per zone;
 * - transitions never depend on task success (movement + door press is
 *   the whole walkthrough);
 * - previous-zone backtracking is unavailable;
 * - movement and wall collision work in all four zones;
 * - the objective line updates at each transition; the destination
 *   beacon hides on arrival;
 * - the controls legend starts hidden and toggles with H;
 * - inactive shell inspection and the whole walkthrough add ZERO
 *   events to the research event log (navigation only);
 * - no runtime error fires across the walkthrough;
 * - a legacy scene still direct-launches via its developer alias.
 */

const ZONE_ORDER = [
  'station_concourse',
  'diagnostics_laboratory',
  'exterior_recovery_yard',
  'utility_core_deck',
] as const;

async function bootToScene(page: Page, scene?: string) {
  const params = new URLSearchParams({
    participant_id: 'PT_FOURZONE',
    game_session_id: 'GS_FOURZONE',
  });

  if (scene !== undefined) {
    params.set('scene', scene);
  }

  await page.goto(`/?${params.toString()}`);
  await page.waitForFunction(
    (expected) =>
      (window as unknown as { __playerProbe?: { scene: string } | null })
        .__playerProbe?.scene === expected,
    scene ?? ZONE_ORDER[0],
    { timeout: 60_000 },
  );
  await page.waitForTimeout(1200);
}

interface ZoneProbe {
  zone: string;
  objective: string;
  legendVisible: boolean;
  beaconVisible: boolean;
  completed: boolean;
}

async function zoneProbe(page: Page): Promise<ZoneProbe> {
  const probe = await page.evaluate(
    () =>
      (window as unknown as { __zoneProbe?: ZoneProbe | null }).__zoneProbe ??
      null,
  );

  expect(probe).not.toBeNull();

  return probe!;
}

/**
 * Positive control for inspections (DEV probe, cleared on each zone
 * entry): the last transient feedback line the CURRENT zone displayed.
 * Converts change-absence assertions into proof the press landed.
 */
async function zoneFeedback(page: Page): Promise<string | null> {
  return page.evaluate(
    () =>
      (window as unknown as { __zoneFeedbackText?: string | null })
        .__zoneFeedbackText ?? null,
  );
}

async function eventCount(page: Page): Promise<number> {
  return page.evaluate(
    () =>
      (
        window as unknown as {
          researchRuntime: { getEvents: () => unknown[] };
        }
      ).researchRuntime.getEvents().length,
  );
}

async function waitForZone(page: Page, zone: string) {
  await page.waitForFunction(
    (expected) =>
      (window as unknown as { __playerProbe?: { scene: string } | null })
        .__playerProbe?.scene === expected,
    zone,
    { timeout: 30_000 },
  );
  await page.waitForTimeout(1000);
}

test('full route walkthrough: order, guidance, collision, zero events', async ({
  page,
}) => {
  test.setTimeout(300_000);

  const pageErrors: string[] = [];

  page.on('pageerror', (error) => pageErrors.push(String(error)));

  // Default participant launch (no scene param) enters the Concourse.
  await bootToScene(page);

  const baselineEvents = await eventCount(page);

  // Controls legend: hidden initially, toggles with H.
  expect((await zoneProbe(page)).legendVisible).toBe(false);
  await press(page, 'h');
  expect((await zoneProbe(page)).legendVisible).toBe(true);
  await press(page, 'h');
  expect((await zoneProbe(page)).legendVisible).toBe(false);

  // Zone 1 guidance: objective names the next zone; beacon visible.
  let probe = await zoneProbe(page);

  expect(probe.objective).toContain('Diagnostics Laboratory');
  expect(probe.beaconVisible).toBe(true);

  // Wall collision works: a west drive clamps against the wall, never
  // reaching x=0 (and never escaping the map).
  await driveAxisTo(page, 'x', 0, 4);

  const clamped = await playerProbe(page);

  expect(clamped!.x).toBeGreaterThan(30);
  expect(clamped!.x).toBeLessThan(90);

  // Inactive shell inspection (Arrival Terminal): the neutral text was
  // actually displayed (positive control) — and the research event log
  // did not grow.
  await driveAxisTo(page, 'x', 96, 14);
  await driveAxisTo(page, 'y', 428, 14);
  await press(page, 'Space');
  expect(await zoneFeedback(page)).toContain('Arrival Terminal');
  expect((await playerProbe(page))!.scene).toBe('station_concourse');
  expect(await eventCount(page)).toBe(baselineEvents);

  // Forward transition 1 → Diagnostics Laboratory (no task required).
  await driveAxisTo(page, 'x', 384, 12);
  await driveAxisTo(page, 'y', 40, 20);

  // On arrival at the destination, the beacon has disappeared.
  expect((await zoneProbe(page)).beaconVisible).toBe(false);

  await press(page, 'Space');
  await waitForZone(page, 'diagnostics_laboratory');

  // Objective updated at the transition.
  probe = await zoneProbe(page);
  expect(probe.zone).toBe('diagnostics_laboratory');
  expect(probe.objective).toContain('Exterior Airlock');

  // Backtracking unavailable: at the south entrance there is no door —
  // an interact press hits nothing (feedback probe still clear for this
  // zone) and changes nothing.
  await driveAxisTo(page, 'y', 560, 12);
  await press(page, 'Space');
  expect(await zoneFeedback(page)).toBeNull();
  expect((await playerProbe(page))!.scene).toBe('diagnostics_laboratory');

  // Inspect a west diagnostic panel — the description displayed
  // (positive control that in-range presses land) and still zero new
  // events.
  await driveAxisTo(page, 'x', 128, 14);
  await driveAxisTo(page, 'y', 288, 14);
  await press(page, 'Space');
  expect(await zoneFeedback(page)).toContain('Multi-Source Status Board');
  expect(await eventCount(page)).toBe(baselineEvents);

  // Forward transition 2 → Exterior Recovery Yard (around the briefing
  // display wall: centre aisle, sidestep east, top row, door).
  await driveAxisTo(page, 'x', 384, 12);
  await driveAxisTo(page, 'y', 200, 16);
  await driveAxisTo(page, 'x', 490, 12);
  await driveAxisTo(page, 'y', 84, 16);
  await driveAxisTo(page, 'x', 384, 12);
  await press(page, 'Space');
  await waitForZone(page, 'exterior_recovery_yard');

  probe = await zoneProbe(page);
  expect(probe.zone).toBe('exterior_recovery_yard');
  expect(probe.objective).toContain('Utility & Core Deck');

  // Clockwise service path: pad 1 inspection on the west leg (positive
  // control + zero events).
  await driveAxisTo(page, 'y', 320, 14);
  await press(page, 'Space');
  expect(await zoneFeedback(page)).toContain('Pressure Regulation Station');
  expect(await eventCount(page)).toBe(baselineEvents);

  // North leg to the north-east Utility Deck airlock.
  await driveAxisTo(page, 'y', 128, 14);
  await driveAxisTo(page, 'x', 704, 12);
  await driveAxisTo(page, 'y', 84, 16);
  await press(page, 'Space');
  await waitForZone(page, 'utility_core_deck');

  probe = await zoneProbe(page);
  expect(probe.zone).toBe('utility_core_deck');
  expect(probe.objective).toContain('Core Chamber');
  expect(probe.completed).toBe(false);

  // Route convergence: walking into the Core Chamber alcove completes
  // the route preview — arrival alone, never task success.
  await driveAxisTo(page, 'x', 390, 12);
  await driveAxisTo(page, 'y', 100, 16);

  probe = await zoneProbe(page);
  expect(probe.completed).toBe(true);
  expect(probe.objective).toContain('Route orientation complete');
  expect(probe.beaconVisible).toBe(false);

  // No exit beyond the Core Chamber: interacting at the endpoint shows
  // its neutral description (positive control that the press landed)
  // and stays in the zone.
  await press(page, 'Space');
  expect(await zoneFeedback(page)).toContain('Assessment route endpoint');
  expect((await playerProbe(page))!.scene).toBe('utility_core_deck');

  // The ENTIRE walkthrough — three transitions, three inspections, the
  // endpoint — added zero events to the research log (this also proves
  // no technical_error event fired), and no page error occurred.
  expect(await eventCount(page)).toBe(baselineEvents);
  expect(pageErrors).toEqual([]);
});

test('all four zone keys are registered as launch aliases', async ({
  page,
}) => {
  test.setTimeout(240_000);

  for (const zone of ZONE_ORDER) {
    await bootToScene(page, zone);

    const probe = await zoneProbe(page);

    expect(probe.zone).toBe(zone);
  }
});

test('legacy scene still direct-launches via its developer alias', async ({
  page,
}) => {
  test.setTimeout(120_000);

  await bootToScene(page, 'dock');
  expect((await playerProbe(page))!.scene).toBe('dock');
});
