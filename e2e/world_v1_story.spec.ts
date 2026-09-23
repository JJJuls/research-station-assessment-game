/**
 * World V1 — story spine at runtime (U2): opening/skip equivalence, the
 * mission card in every act reached on the participant route's first
 * acts, its canvas-safe placement clear of the arrival terminal and the
 * avatar, immediate refresh on a narrative transition, the station map's
 * state, and restoration persistence across a zone exit and re-entry.
 *
 * Real keyboard input, DEV probes only, no state injection.
 */
import { expect, type Page, test } from '@playwright/test';

import { missionCardAction, STORY_ACT_TITLES } from '../src/pilot/storyState';
import { DOCK_SITES } from '../src/pilot/zoneSites';
import { getEvents, press, selectPromptOption } from './helpers';
import {
  captureErrors,
  completeDockTutorial,
  expectNoRuntimeErrors,
} from './journey';
import {
  bootPilot,
  dockToConcourse,
  expectStage,
  openPromptAt,
  PILOT,
  pilotProbe,
  useDoor,
  walkTo,
} from './pilotHelpers';

interface CardProbe {
  title: string;
  action: string;
  x: number;
  y: number;
  width: number;
  height: number;
  visible: boolean;
}

interface OpeningProbe {
  open: boolean;
  caption_index: number;
  outcome: 'completed' | 'skipped' | null;
  elapsed_ms: number;
  shuttle_landed: boolean;
}

interface RestorationProbe {
  lighting: string;
  sectors: Record<string, string>;
}

const cardProbe = (page: Page) =>
  page.evaluate(
    () =>
      (window as unknown as { __missionCardProbe?: CardProbe | null })
        .__missionCardProbe ?? null,
  );
const openingProbe = (page: Page) =>
  page.evaluate(
    () =>
      (window as unknown as { __pilotOpeningProbe?: OpeningProbe | null })
        .__pilotOpeningProbe ?? null,
  );
const restorationProbe = (page: Page) =>
  page.evaluate(
    () =>
      (window as unknown as { __restorationProbe?: RestorationProbe | null })
        .__restorationProbe ?? null,
  );
const routeText = (page: Page) =>
  page.evaluate(
    () =>
      (window as unknown as { __routeObjectiveText?: string | null })
        .__routeObjectiveText ?? null,
  );
const designSpace = (page: Page) =>
  page.evaluate(
    () =>
      (
        window as unknown as {
          __designSpace?: {
            offsetX: number;
            offsetY: number;
            scale: number;
            canvasWidth: number;
            canvasHeight: number;
          } | null;
        }
      ).__designSpace!,
  );
const cameraView = (page: Page) =>
  page.evaluate(
    () =>
      (
        window as unknown as {
          __cameraProbe?: {
            viewX: number;
            viewY: number;
            plate: { scale: number };
          } | null;
        }
      ).__cameraProbe!,
  );
const playerXY = (page: Page) =>
  page.evaluate(
    () =>
      (window as unknown as { __playerProbe?: { x: number; y: number } | null })
        .__playerProbe!,
  );

/** Dock-state fingerprint used for the skip/complete equivalence. */
async function dockFingerprint(page: Page) {
  const types = (await getEvents(page))
    .map((event) => event.event_type)
    .filter(
      (type) =>
        type !== 'pilot_opening_skipped' && type !== 'pilot_opening_completed',
    )
    .sort();
  const probe = await pilotProbe(page);
  const at = await playerXY(page);
  const card = await cardProbe(page);

  return {
    types,
    stage: probe?.stage ?? null,
    zone: probe?.zone ?? null,
    at: { x: Math.round(at.x), y: Math.round(at.y) },
    card: card === null ? null : { title: card.title, action: card.action },
    feedback: await page.evaluate(
      () =>
        (window as unknown as { __lastRoomFeedbackText?: string | null })
          .__lastRoomFeedbackText ?? null,
    ),
  };
}

/** Canvas rect of the mission card (from the design-space probe). */
async function cardCanvasRect(page: Page) {
  const card = (await cardProbe(page))!;
  const space = await designSpace(page);

  return {
    left: space.offsetX + card.x * space.scale,
    top: space.offsetY + card.y * space.scale,
    right: space.offsetX + (card.x + card.width) * space.scale,
    bottom: space.offsetY + (card.y + card.height) * space.scale,
  };
}

/** Canvas rect of a world object (centre + half sizes, world px). */
async function worldCanvasRect(
  page: Page,
  x: number,
  y: number,
  halfW: number,
  halfH: number,
) {
  const view = await cameraView(page);
  const scale = view.plate.scale;

  return {
    left: (x - halfW - view.viewX) * scale,
    top: (y - halfH - view.viewY) * scale,
    right: (x + halfW - view.viewX) * scale,
    bottom: (y + halfH - view.viewY) * scale,
  };
}

const overlaps = (
  a: { left: number; top: number; right: number; bottom: number },
  b: { left: number; top: number; right: number; bottom: number },
) =>
  a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom;

test.describe('World V1 story spine (runtime)', () => {
  test('the opening runs ≤ 20 s with four captions, the shuttle berthing and the scripted arrival; completing and skipping leave the Dock identical', async ({
    browser,
  }) => {
    test.setTimeout(240_000);

    // Completed opening.
    const completedContext = await browser.newContext({
      viewport: { width: 800, height: 600 },
    });
    const completed = await completedContext.newPage();
    const completedErrors = captureErrors(completed);

    await bootPilot(completed, 'wv1open_full', { skipOpening: false });

    const started = Date.now();

    await completed.waitForFunction(
      () =>
        (
          window as unknown as {
            __pilotOpeningProbe?: { caption_index: number } | null;
          }
        ).__pilotOpeningProbe?.caption_index === 3,
      undefined,
      { timeout: 20_000 },
    );

    const midway = (await openingProbe(completed))!;

    expect(midway.open).toBe(true);
    expect(midway.shuttle_landed).toBe(true);

    await completed.waitForFunction(
      () =>
        (
          window as unknown as {
            __pilotOpeningProbe?: { outcome: string | null } | null;
          }
        ).__pilotOpeningProbe?.outcome === 'completed',
      undefined,
      { timeout: 20_000 },
    );
    expect(Date.now() - started).toBeLessThan(20_000);
    await completed.waitForFunction(
      () =>
        (window as unknown as { __playerProbe?: { scene: string } | null })
          .__playerProbe?.scene === 'dock',
      undefined,
      { timeout: 20_000 },
    );
    // The scripted arrival (frames 5–8) ends at its fixed release.
    await completed.waitForFunction(
      () =>
        (
          window as unknown as {
            __dockProbe?: { arrival_playing: boolean } | null;
          }
        ).__dockProbe?.arrival_playing === false,
      undefined,
      { timeout: 20_000 },
    );
    await completed.waitForTimeout(2600);

    const fullState = await dockFingerprint(completed);

    expect(fullState.types).toContain('pilot_opening_shown');
    expect(
      (await getEvents(completed)).map((event) => event.event_type),
    ).toContain('pilot_opening_completed');
    expectNoRuntimeErrors(completedErrors);
    await completedContext.close();

    // Skipped opening.
    const skippedContext = await browser.newContext({
      viewport: { width: 800, height: 600 },
    });
    const skipped = await skippedContext.newPage();

    await bootPilot(skipped, 'wv1open_skip');
    await skipped.waitForTimeout(2600);

    const skipState = await dockFingerprint(skipped);

    expect(
      (await getEvents(skipped)).map((event) => event.event_type),
    ).toContain('pilot_opening_skipped');
    await skippedContext.close();

    // Identical Dock: same events (bar the outcome), stage, zone, spawn,
    // card and instruction.
    expect(skipState.types).toEqual(fullState.types);
    expect(skipState.stage).toBe(fullState.stage);
    expect(skipState.zone).toBe(fullState.zone);
    expect(skipState.at).toEqual(fullState.at);
    expect(skipState.card).toEqual(fullState.card);
    expect(skipState.feedback).toBe(fullState.feedback);
  });

  test('mission card: act title + one action in every act reached; canvas-safe; clear of the terminal and the avatar; refreshed on every transition', async ({
    page,
  }) => {
    test.setTimeout(300_000);

    const errors = captureErrors(page);

    await bootPilot(page, 'wv1card');

    // Act 1 in the Dock, before the check-in.
    let card = (await cardProbe(page))!;

    expect(card.title).toBe(STORY_ACT_TITLES[1].toUpperCase());
    expect(card.action).toBe(missionCardAction('arrival', 'dock'));
    expect(card.action.split('\n')).toHaveLength(1);

    // Canvas-safe: inside the canvas with the 8 px inset, top-left.
    const space = await designSpace(page);
    let rect = await cardCanvasRect(page);

    expect(rect.left).toBeGreaterThanOrEqual(7);
    expect(rect.top).toBeGreaterThanOrEqual(7);
    expect(rect.right).toBeLessThan(space.canvasWidth / 2);
    expect(rect.bottom).toBeLessThan(space.canvasHeight / 6);

    // Never over the arrival terminal's art (kiosk 48×64 on its foot) nor
    // the avatar, from the spawn and from the terminal approach.
    const terminal = await worldCanvasRect(
      page,
      DOCK_SITES.terminal.x,
      DOCK_SITES.terminal.y - 30,
      17,
      30,
    );

    expect(overlaps(rect, terminal), 'card over the terminal (spawn)').toBe(
      false,
    );

    let at = await playerXY(page);

    expect(
      overlaps(rect, await worldCanvasRect(page, at.x, at.y, 16, 24)),
      'card over the avatar (spawn)',
    ).toBe(false);

    await walkTo(page, DOCK_SITES.terminal.x, DOCK_SITES.terminal.y + 56, {
      yFirst: true,
    });
    rect = await cardCanvasRect(page);
    expect(
      overlaps(
        rect,
        await worldCanvasRect(
          page,
          DOCK_SITES.terminal.x,
          DOCK_SITES.terminal.y - 30,
          17,
          30,
        ),
      ),
      'card over the terminal (approach)',
    ).toBe(false);
    at = await playerXY(page);
    expect(
      overlaps(rect, await worldCanvasRect(page, at.x, at.y, 16, 24)),
      'card over the avatar (approach)',
    ).toBe(false);

    // After the check-in the line flips to the exit at once.
    await completeDockTutorial(page, 2);
    expect(await routeText(page)).toBe(
      missionCardAction('arrival', 'dock', { dockCheckedIn: true }),
    );

    // Act 2 in the Concourse.
    await dockToConcourse(page);
    card = (await cardProbe(page))!;
    expect(card.title).toBe(STORY_ACT_TITLES[2].toUpperCase());
    expect(card.action).toBe(
      missionCardAction('handover_briefing', 'station_concourse'),
    );

    // Vale's first beat advances the stage: the card refreshes before the
    // participant can move (read straight after the selection).
    await openPromptAt(page, PILOT.concourse.vale, {
      approachOffset: { x: 0, y: 40 },
    });
    await selectPromptOption(page, 1);
    await expectStage(page, 'incident_handover');
    expect(await routeText(page)).toBe(
      missionCardAction('incident_handover', 'station_concourse'),
    );
    // Dismiss the chained offers without answering (no behavioural event).
    await page.waitForTimeout(400);
    await selectPromptOption(page, 3);
    await page.waitForTimeout(400);
    await selectPromptOption(page, 3);
    await page.waitForTimeout(450);
    await selectPromptOption(page, 2); // M05 (Unit 6): extra lamp job — decline
    await page.waitForTimeout(300);

    // In another zone the line names the way back, never a passed door.
    await useDoor(page, PILOT.concourse.southDoor, 'dock', {
      approachOffset: { x: 0, y: -20 },
      yFirst: true,
    });
    expect(await routeText(page)).toBe(
      missionCardAction('incident_handover', 'dock'),
    );
    expect(await routeText(page)).not.toContain('Report to Vale');

    // Map from the Dock: act 2, current Dock, destination Concourse, Dock
    // restored (act 1 passed), no return path yet.
    await press(page, 'm');
    await page.waitForFunction(
      () =>
        (window as unknown as { __pilotMapProbe?: { open: boolean } | null })
          .__pilotMapProbe?.open === true,
      undefined,
      { timeout: 5000 },
    );

    const map = await page.evaluate(
      () =>
        (
          window as unknown as {
            __pilotMapProbe?: {
              current: string | null;
              destination: string | null;
              discovered: string[];
              restored: string[];
              return_path: string[] | null;
              act: number;
              log_entries: string[];
            } | null;
          }
        ).__pilotMapProbe ?? null,
    );

    expect(map?.act).toBe(2);
    expect(map?.current).toBe('dock');
    expect(map?.destination).toBe('station_concourse');
    expect(map?.restored).toEqual(['dock']);
    expect(map?.return_path).toBeNull();
    expect(map?.discovered).toEqual(
      expect.arrayContaining(['dock', 'station_concourse']),
    );

    for (const line of map?.log_entries ?? []) {
      expect(line).not.toMatch(/proto_|\bM\d{2}\b|\bQ\d{2}\b/);
    }

    await press(page, 'Escape');
    await page.waitForFunction(
      () =>
        (window as unknown as { __pilotMapProbe?: { open: boolean } | null })
          .__pilotMapProbe?.open === false,
      undefined,
      { timeout: 5000 },
    );

    expectNoRuntimeErrors(errors);
  });

  test('restoration: emergency lighting and dark sectors in act 2, unchanged across a zone exit and re-entry', async ({
    page,
  }) => {
    test.setTimeout(240_000);
    await bootPilot(page, 'wv1restore');
    await completeDockTutorial(page, 1);
    await dockToConcourse(page);

    const before = (await restorationProbe(page))!;

    expect(before.lighting).toBe('recovering');
    expect(Object.values(before.sectors)).toEqual([
      'damaged',
      'damaged',
      'damaged',
      'damaged',
      'damaged',
      'damaged',
    ]);

    await useDoor(page, PILOT.concourse.southDoor, 'dock', {
      approachOffset: { x: 0, y: -20 },
      yFirst: true,
    });
    await walkTo(
      page,
      PILOT.dock.northDoorApproach.x,
      PILOT.dock.northDoorApproach.y,
      { yFirst: true },
    );
    await useDoor(page, PILOT.dock.northDoor, 'station_concourse', {
      approachOffset: { x: 0, y: 20 },
    });

    expect(await restorationProbe(page)).toEqual(before);
  });
});
