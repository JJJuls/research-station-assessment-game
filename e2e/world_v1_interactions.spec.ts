/**
 * World V1 — interaction grammar at runtime (INTERACTION-GRAMMAR.md §5),
 * Dock and Concourse.
 *
 * Real keyboard input, DEV probes only. For every registry object of the
 * two rebuilt zones the participant walks to its approach point and the
 * one-line prompt reads exactly `E / Space — <verb> <label>` (or the object's
 * state for a class-3 object); E on the sealed docking airlock shows its
 * state and opens nothing; a class-1/2 surface (the plan board) opens on E,
 * pauses world input, and closing it restores movement; standing beside a
 * decorative object (the status wall) shows no prompt; the mission card
 * carries the act title and one action; the belt is hidden in interior
 * zones.
 */
import { mkdirSync } from 'node:fs';

import { expect, type Page, test } from '@playwright/test';

import { WORLD_V1_REGISTRY } from '../src/world/interactionRegistry';
import { press } from './helpers';
import {
  captureErrors,
  completeDockTutorial,
  eventCount,
  expectNoRuntimeErrors,
} from './journey';
import {
  bootPilot,
  dockToConcourse,
  expectNoMeasurementEvents,
  PILOT,
  pilotProbe,
  registryApproach,
  useDoor,
  walkTo,
} from './pilotHelpers';

const promptProbe = (page: Page) =>
  page.evaluate(
    () =>
      (
        window as unknown as {
          __worldPromptProbe?: { prompt: boolean; text?: string | null } | null;
        }
      ).__worldPromptProbe ?? null,
  );
const playerXY = (page: Page) =>
  page.evaluate(
    () =>
      (window as unknown as { __playerProbe?: { x: number; y: number } | null })
        .__playerProbe!,
  );
const feedback = (page: Page) =>
  page.evaluate(
    () =>
      (window as unknown as { __lastRoomFeedbackText?: string | null })
        .__lastRoomFeedbackText ?? null,
  );
const surfaceOpen = (page: Page) =>
  page.evaluate(
    () =>
      (window as unknown as { __workSurfaceProbe?: { open: boolean } | null })
        .__workSurfaceProbe?.open ?? false,
  );

/**
 * Waypoint routes for the two-leg axis driver in the rescue Concourse:
 * the operations desk and the north-east table split the hall into a
 * west hall, a south lane and an east strip — these vias walk the lane
 * the pure BFS proves walkable before the final approach legs.
 */
const PROMPT_VIA: Record<
  string,
  { x: number; y: number; yFirst?: boolean; tolerance?: number }[]
> = {
  'concourse.door_records': [
    // The west pocket is entered along the rows-5/6 band only (the
    // reading table blocks row 7): a tight-tolerance waypoint keeps the
    // y-leg inside the band before the westward leg.
    { x: 96, y: 188, yFirst: true, tolerance: 8 },
  ],
  // The south lane is safe for east–west travel only at y ≥ 242 (the
  // body's top edge clears the desk row); every lane waypoint targets
  // y 252 with an 8 px tolerance.
  'concourse.door_deck': [
    { x: 368, y: 252, yFirst: true, tolerance: 8 },
    { x: 604, y: 252, tolerance: 8 },
  ],
  'concourse.vale': [
    { x: 604, y: 252, yFirst: true, tolerance: 8 },
    { x: 384, y: 252, tolerance: 8 },
  ],
  'concourse.incident_desk': [
    { x: 368, y: 252, yFirst: true, tolerance: 8 },
    { x: 604, y: 252, tolerance: 8 },
    { x: 604, y: 224, yFirst: true, tolerance: 8 },
  ],
  'concourse.qc_packet_o1': [
    { x: 604, y: 252, tolerance: 8 },
    { x: 368, y: 252, tolerance: 8 },
    { x: 368, y: 160, yFirst: true, tolerance: 8 },
  ],
  'concourse.monitor_gauge': [{ x: 424, y: 252, yFirst: true, tolerance: 8 }],
  'concourse.reading_desk_lamp': [{ x: 188, y: 252, tolerance: 8 }],
};

async function expectPromptAt(page: Page, id: string, expected: string) {
  const approach = registryApproach(id);

  for (const waypoint of PROMPT_VIA[id] ?? []) {
    await walkTo(page, waypoint.x, waypoint.y, {
      yFirst: waypoint.yFirst ?? false,
      tolerance: waypoint.tolerance ?? 16,
    });
  }

  // Two-leg driver: x first for stations and the Dock (the kiosk cells
  // block a y-first leg up the west alcove); y first for the Concourse
  // doors (the spine and axis are the clear legs; an x-first leg along
  // the south row runs into the crate group). The pure spec proves every
  // approach point is reachable; this only picks the leg order.
  // World V1 production: every approach is reached y-first from the spine
  // side (the districts hang off the spine and the loops); the walker's
  // second attempt reverses the leg order on a clamp.
  await walkTo(page, approach.x, approach.y, { yFirst: true });
  await page.waitForTimeout(350);

  const probe = await promptProbe(page);
  const at = await playerXY(page);
  const where = `${id} at ${Math.round(at.x)},${Math.round(at.y)} (approach ${approach.x},${approach.y})`;

  expect(probe?.prompt, `${where} prompt visible`).toBe(true);
  expect(probe?.text, `${where} prompt text`).toBe(expected);
}

test.describe('World V1 interaction grammar — Dock and Concourse', () => {
  test('Dock: registry prompts, the sealed airlock states itself, terminal check-in', async ({
    page,
  }) => {
    test.setTimeout(240_000);
    await bootPilot(page, 'wv1dock');

    await expectPromptAt(
      page,
      'dock.docking_airlock',
      'E / Space — Docking airlock: shuttle secured',
    );
    await press(page, 'e');
    expect(await feedback(page)).toContain('shuttle');
    expect(
      await page.evaluate(
        () =>
          (window as unknown as { __promptCards?: unknown[] | null })
            .__promptCards,
      ),
    ).toBeNull();

    await expectPromptAt(
      page,
      'dock.arrival_terminal',
      'E / Space — Check in at arrival terminal',
    );
    await completeDockTutorial(page, 1);

    await expectPromptAt(
      page,
      'dock.door_concourse',
      'E / Space — Go to Station Concourse',
    );

    // Belt hidden in an interior zone; mission card shows act + action.
    const hudBelt = await page.evaluate(
      () =>
        (
          window as unknown as {
            __inventoryProbe?: { slots: unknown[] } | null;
          }
        ).__inventoryProbe?.slots.filter((slot) => slot !== null).length ?? 0,
    );

    expect(hudBelt).toBe(0);
  });

  test('Concourse: every registry object prompts with its verb and label; a surface pauses and releases; decor never prompts', async ({
    page,
  }) => {
    test.setTimeout(420_000);
    await bootPilot(page, 'wv1conc');
    await completeDockTutorial(page, 1);
    await dockToConcourse(page);

    const probe = await pilotProbe(page);

    expect(probe?.objective).toContain('Vale');

    for (const entry of WORLD_V1_REGISTRY.station_concourse!) {
      if (entry.id === 'concourse.kai_return') {
        continue; // present from the return leg only
      }

      await expectPromptAt(
        page,
        entry.id,
        `E / Space — ${entry.verb} ${entry.label}`,
      );
    }

    // The plan board opens its work surface on E; the avatar holds still
    // while it is open; closing it restores movement and the prompt. One
    // physical press = exactly one station opening (re-entrancy guard).
    const board = registryApproach('concourse.plan_board');
    const openedBefore = await eventCount(
      page,
      'pilot_station_opened',
      'station_concourse',
    );

    await walkTo(page, board.x, board.y, { yFirst: false });
    await press(page, 'e');
    await page.waitForFunction(
      () =>
        (window as unknown as { __workSurfaceProbe?: { open: boolean } | null })
          .__workSurfaceProbe?.open === true,
      undefined,
      { timeout: 8000 },
    );
    expect(
      await eventCount(page, 'pilot_station_opened', 'station_concourse'),
    ).toBe(openedBefore + 1);

    const held = await playerXY(page);

    await page.keyboard.down('ArrowDown');
    await page.waitForTimeout(400);
    await page.keyboard.up('ArrowDown');
    expect((await playerXY(page)).y).toBe(held.y);
    expect((await promptProbe(page))?.prompt ?? false).toBe(false);

    await press(page, 'Escape');
    await page.waitForFunction(
      () =>
        (window as unknown as { __workSurfaceProbe?: { open: boolean } | null })
          .__workSurfaceProbe?.open === false,
      undefined,
      { timeout: 8000 },
    );
    expect(await surfaceOpen(page)).toBe(false);

    await page.keyboard.down('ArrowDown');
    await page.waitForTimeout(500);
    await page.keyboard.up('ArrowDown');
    expect((await playerXY(page)).y).toBeGreaterThan(held.y + 20);

    // Decorative: beside the operations island's west end (no registry
    // object within 72 px) — no prompt.
    // Open hall floor clear of every interactable's 72 px radius.
    await walkTo(page, 368, 160, { yFirst: true });
    await page.waitForTimeout(350);
    expect((await promptProbe(page))?.prompt ?? false).toBe(false);
  });

  test('Concourse: every door is traversable both ways and one press logs one door use', async ({
    page,
  }) => {
    test.setTimeout(420_000);

    const errors = captureErrors(page);

    await bootPilot(page, 'wv1doors');
    await completeDockTutorial(page, 1);
    await dockToConcourse(page);

    if (process.env.WV1_OUT !== undefined) {
      const viewport = page.viewportSize()!;

      mkdirSync(process.env.WV1_OUT, { recursive: true });
      await page.waitForTimeout(600);
      await page.screenshot({
        path: `${process.env.WV1_OUT}/concourse-south-spawn-${viewport.width}x${viewport.height}.png`,
      });
    }

    // Each leg: the Concourse door out (one pilot_door_used from the
    // Concourse), the destination's return door back (one pilot_door_used
    // from the destination). The return doors of the unrebuilt zones keep
    // their V4 coordinates (PILOT_DOORS); the driver approaches each from
    // its arrival spawn along one clear axis.
    const legs: {
      id: string;
      destination: string;
      out: { yFirst: boolean; offset: { x: number; y: number } };
      back: { x: number; y: number; offset: { x: number; y: number } };
      /** Waypoints the axis driver walks first (routes around furniture). */
      via?: { x: number; y: number; yFirst?: boolean; tolerance?: number }[];
    }[] = [
      {
        id: 'concourse.door_records',
        destination: 'records_workshop',
        via: [{ x: 96, y: 188, yFirst: true, tolerance: 8 }],
        out: { yFirst: true, offset: { x: 40, y: 0 } },
        back: { ...PILOT.workshop.eastDoor, offset: { x: -44, y: -22 } },
      },
      {
        id: 'concourse.door_lab',
        destination: 'diagnostics_laboratory',
        out: { yFirst: false, offset: { x: 0, y: 20 } },
        back: { ...PILOT.lab.southDoor, offset: { x: 0, y: -40 } },
      },
      {
        id: 'concourse.door_deck',
        destination: 'utility_core_deck',
        // Around the operations desk: south lane first, east, then north
        // up the east strip to the door.
        via: [
          { x: 368, y: 252, yFirst: true, tolerance: 8 },
          { x: 604, y: 252, tolerance: 8 },
        ],
        out: { yFirst: true, offset: { x: -40, y: 0 } },
        back: { ...PILOT.deck.westDoor, offset: { x: 40, y: 0 } },
      },
      {
        id: 'concourse.door_dock',
        destination: 'dock',
        // From the Deck-side spawn: down the east strip, west along the
        // south lane, then to the hatch.
        via: [{ x: 604, y: 252, yFirst: true, tolerance: 8 }],
        out: { yFirst: false, offset: { x: 0, y: -20 } },
        // 20 px inside the doorway (dockToConcourse precedent): an offset
        // of 64 plus the 12 px landing tolerance lands outside the 72 px
        // radius.
        back: { ...PILOT.dock.northDoor, offset: { x: 0, y: 20 } },
      },
    ];

    for (const leg of legs) {
      const door = WORLD_V1_REGISTRY.station_concourse!.find(
        (entry) => entry.id === leg.id,
      )!;
      const approach = registryApproach(leg.id);

      for (const waypoint of leg.via ?? []) {
        await walkTo(page, waypoint.x, waypoint.y, {
          yFirst: waypoint.yFirst ?? false,
          tolerance: waypoint.tolerance ?? 16,
        });
      }

      await walkTo(page, approach.x, approach.y, { yFirst: leg.out.yFirst });
      await page.waitForTimeout(300);

      const at = await playerXY(page);

      expect(
        (await promptProbe(page))?.text,
        `${leg.id} at ${Math.round(at.x)},${Math.round(at.y)} (approach ${approach.x},${approach.y})`,
      ).toBe(`E / Space — Go to ${door.label}`);

      const outBefore = await eventCount(
        page,
        'pilot_door_used',
        'station_concourse',
      );
      const arrivalsBefore = await eventCount(
        page,
        'scene_start',
        leg.destination,
      );

      await useDoor(page, { x: door.x, y: door.y }, leg.destination, {
        approachOffset: leg.out.offset,
        yFirst: leg.out.yFirst,
      });
      expect(
        await eventCount(page, 'pilot_door_used', 'station_concourse'),
        `${leg.id}: one press, one door use`,
      ).toBe(outBefore + 1);
      expect(
        await eventCount(page, 'scene_start', leg.destination),
        `${leg.id}: one press, one arrival`,
      ).toBe(arrivalsBefore + 1);

      // Back: the destination's return door (the Dock's north door logs
      // its historical events, not pilot_door_used — arrivals are the
      // uniform count).
      const returnsBefore = await eventCount(
        page,
        'scene_start',
        'station_concourse',
      );

      await useDoor(
        page,
        { x: leg.back.x, y: leg.back.y },
        'station_concourse',
        { approachOffset: leg.back.offset, yFirst: true },
      );
      expect(
        await eventCount(page, 'scene_start', 'station_concourse'),
        `${leg.destination} → Concourse: one press, one arrival`,
      ).toBe(returnsBefore + 1);
      // A runtime error surfaces at the leg that raised it.
      expect(errors.pageErrors, `${leg.id}: page errors`).toEqual([]);
    }

    // The bare topology walk emits no participant act and no runtime error.
    await expectNoMeasurementEvents(page);
    expectNoRuntimeErrors(errors);
  });
});
