/**
 * World V1 — camera, viewport and HUD-space contract
 * (docs/game/world-v1/CAMERA-AND-SCALE-SPEC.md). Replaces v4_camera.spec.
 *
 * Positive assertions over the DEV probes with real keyboard input:
 *   - the world plate is 1024×576 world px composited at 1.25 (32×18 tiles);
 *   - the camera follows once the avatar leaves the dead zone, holds still
 *     while the avatar idles, and never leaves the room bounds;
 *   - the visible world area is the same at 800×600 and 1280×720;
 *   - the one-line prompt appears only in range with the registry text, and
 *     a HUD prompt card click lands (pointer path).
 */
import { mkdirSync } from 'node:fs';

import { expect, type Page, test } from '@playwright/test';

import { clickPromptCard, designSpace, driveAxisTo, press } from './helpers';
import { bootPilot, PILOT, registryApproach, walkTo } from './pilotHelpers';

interface CameraProbeLike {
  zoom: number;
  viewX: number;
  viewY: number;
  viewWidth: number;
  viewHeight: number;
  boundsWidth: number;
  boundsHeight: number;
  hudZoom: number | null;
  plate: { width: number; height: number; scale: number };
}

const OUT =
  process.env.WORLD_V1_OUT ?? 'docs/verification/professional-world-v1/unit1';

const cameraProbe = (page: Page) =>
  page.evaluate(
    () =>
      (window as unknown as { __cameraProbe?: CameraProbeLike | null })
        .__cameraProbe ?? null,
  );
const playerXY = (page: Page) =>
  page.evaluate(
    () =>
      (window as unknown as { __playerProbe?: { x: number; y: number } | null })
        .__playerProbe!,
  );
const promptProbe = (page: Page) =>
  page.evaluate(
    () =>
      (
        window as unknown as {
          __worldPromptProbe?: { prompt: boolean; text?: string | null } | null;
        }
      ).__worldPromptProbe ?? null,
  );

test.describe('World V1 camera and viewport contract', () => {
  test('plate scale, dead-zone follow, idle hold and room bounds', async ({
    page,
  }) => {
    await bootPilot(page, 'wv1cam_follow');
    await page.waitForTimeout(900);

    const before = (await cameraProbe(page))!;

    expect(before.zoom).toBeCloseTo(1.25, 5);
    expect(before.plate).toEqual({ width: 1024, height: 576, scale: 1.25 });
    expect(before.viewWidth).toBe(1024);
    expect(before.viewHeight).toBe(576);
    expect(before.hudZoom).toBeCloseTo(1.2, 5);

    // Idle: the camera holds still.
    await page.waitForTimeout(800);
    const idle = (await cameraProbe(page))!;

    expect(idle.viewX).toBe(before.viewX);
    expect(idle.viewY).toBe(before.viewY);

    // Walk north up the spine well past the dead zone: the camera tracks
    // and keeps the avatar inside the central band.
    const start = await playerXY(page);

    await driveAxisTo(page, 'y', start.y - 220, 10);
    await page.waitForTimeout(400);

    const after = (await cameraProbe(page))!;
    const moved = await playerXY(page);

    expect(moved.y).toBeLessThan(start.y - 150);
    expect(after.viewY).toBeLessThan(before.viewY);
    expect(moved.y).toBeGreaterThan(after.viewY + after.viewHeight * 0.2);
    expect(moved.y).toBeLessThan(after.viewY + after.viewHeight * 0.8);

    // Push into the east wall: the view clamps to the bounds.
    await driveAxisTo(page, 'x', 1120, 8);
    await page.waitForTimeout(400);

    const clamped = (await cameraProbe(page))!;

    expect(clamped.viewX).toBeGreaterThanOrEqual(0);
    expect(clamped.viewX + clamped.viewWidth).toBeLessThanOrEqual(
      clamped.boundsWidth + 0.01,
    );
    expect(clamped.viewY + clamped.viewHeight).toBeLessThanOrEqual(
      clamped.boundsHeight + 0.01,
    );
  });

  test('visible world area and design-space mapping are identical at 800×600 and 1280×720', async ({
    browser,
  }) => {
    const views: Record<string, CameraProbeLike> = {};
    const spaces: Record<string, unknown> = {};

    for (const [label, viewport] of [
      ['800x600', { width: 800, height: 600 }],
      ['1280x720', { width: 1280, height: 720 }],
    ] as const) {
      const context = await browser.newContext({ viewport });
      const page = await context.newPage();

      await bootPilot(page, `wv1parity_${label}`);
      views[label] = (await cameraProbe(page))!;
      spaces[label] = await designSpace(page);
      mkdirSync(OUT, { recursive: true });
      await page.screenshot({ path: `${OUT}/dock-arrival-${label}.png` });
      await context.close();
    }

    expect(views['800x600'].viewWidth).toBe(views['1280x720'].viewWidth);
    expect(views['800x600'].viewHeight).toBe(views['1280x720'].viewHeight);
    expect(spaces['800x600']).toEqual(spaces['1280x720']);
    expect(spaces['1280x720']).toEqual({
      width: 800,
      height: 600,
      offsetX: 160,
      offsetY: 0,
      scale: 1.2,
      canvasWidth: 1280,
      canvasHeight: 720,
    });
  });

  test('the one-line prompt appears only in range with the registry text; the pointer path reaches a HUD card', async ({
    page,
  }) => {
    await bootPilot(page, 'wv1prompt');

    expect((await promptProbe(page))?.prompt ?? false).toBe(false);

    const approach = registryApproach('dock.arrival_terminal');

    await walkTo(page, approach.x, approach.y, { yFirst: false });
    await page.waitForTimeout(300);

    const near = await promptProbe(page);
    const at = await playerXY(page);

    expect(
      near?.prompt,
      `prompt at ${Math.round(at.x)},${Math.round(at.y)} (approach ${approach.x},${approach.y})`,
    ).toBe(true);
    expect(near?.text).toBe('E — Check in at arrival terminal');

    await press(page, 'e');
    await page.waitForFunction(
      () =>
        (window as unknown as { __promptCards?: unknown[] | null })
          .__promptCards !== null,
      undefined,
      { timeout: 5000 },
    );
    expect((await promptProbe(page))?.prompt).toBe(false);

    await clickPromptCard(page, 0);
    await page.waitForFunction(
      () =>
        (window as unknown as { __promptCards?: unknown[] | null })
          .__promptCards === null,
      undefined,
      { timeout: 5000 },
    );

    // Away from every object: no prompt.
    await walkTo(
      page,
      PILOT.dock.northDoorApproach.x,
      PILOT.dock.northDoorApproach.y + 160,
      {
        yFirst: false,
      },
    );
    await page.waitForTimeout(300);
    expect((await promptProbe(page))?.prompt ?? false).toBe(false);
  });
});
