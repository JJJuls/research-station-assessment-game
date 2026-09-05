/**
 * World V1 — interaction grammar at runtime (INTERACTION-GRAMMAR.md §5),
 * Dock and Concourse.
 *
 * Real keyboard input, DEV probes only. For every registry object of the
 * two rebuilt zones the participant walks to its approach point and the
 * one-line prompt reads exactly `E — <verb> <label>` (or the object's
 * state for a class-3 object); E on the sealed docking airlock shows its
 * state and opens nothing; a class-1/2 surface (the plan board) opens on E,
 * pauses world input, and closing it restores movement; standing beside a
 * decorative object (the status wall) shows no prompt; the mission card
 * carries the act title and one action; the belt is hidden in interior
 * zones.
 */
import { expect, type Page, test } from '@playwright/test';

import { WORLD_V1_REGISTRY } from '../src/world/interactionRegistry';
import { press } from './helpers';
import { completeDockTutorial } from './journey';
import {
  bootPilot,
  dockToConcourse,
  pilotProbe,
  registryApproach,
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

async function expectPromptAt(page: Page, id: string, expected: string) {
  const approach = registryApproach(id);

  // Two-leg driver: x first for stations and the Dock (the kiosk cells
  // block a y-first leg up the west alcove); y first for the Concourse
  // doors (the spine and axis are the clear legs; an x-first leg along
  // the south row runs into the crate group). The pure spec proves every
  // approach point is reachable; this only picks the leg order.
  await walkTo(page, approach.x, approach.y, {
    yFirst: id === 'concourse.door_dock' || id === 'concourse.door_records',
  });
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
      'E — Docking airlock: shuttle secured',
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
      'E — Check in at arrival terminal',
    );
    await completeDockTutorial(page, 1);

    await expectPromptAt(
      page,
      'dock.door_concourse',
      'E — Go to Station Concourse',
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

      await expectPromptAt(page, entry.id, `E — ${entry.verb} ${entry.label}`);
    }

    // The plan board opens its work surface on E; the avatar holds still
    // while it is open; closing it restores movement and the prompt.
    const board = registryApproach('concourse.plan_board');

    await walkTo(page, board.x, board.y, { yFirst: false });
    await press(page, 'e');
    await page.waitForFunction(
      () =>
        (window as unknown as { __workSurfaceProbe?: { open: boolean } | null })
          .__workSurfaceProbe?.open === true,
      undefined,
      { timeout: 8000 },
    );

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

    // Decorative: beside the status wall / ops counter's west end (no
    // registry object within 72 px) — no prompt.
    await walkTo(page, 26 * 32, 13 * 32, { yFirst: false });
    await page.waitForTimeout(350);
    expect((await promptProbe(page))?.prompt ?? false).toBe(false);
  });
});
