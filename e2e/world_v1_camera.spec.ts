/**
 * World V1 — camera, viewport and HUD-space contract
 * (docs/game/world-v1/CAMERA-AND-SCALE-SPEC.md). Replaces v4_camera.spec.
 *
 * Positive assertions over the DEV probes with real keyboard input:
 *   - the world plate is 1280×720 world px (40×22.5 tiles) at 1× on the
 *     1280×720 canvas and 1.5× on the native 1920×1080 canvas;
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

    expect(before.zoom).toBeCloseTo(1, 5);
    expect(before.plate).toEqual({ width: 1280, height: 720, scale: 1 });
    expect(before.viewWidth).toBe(1280);
    expect(before.viewHeight).toBe(720);
    expect(before.hudZoom).toBeCloseTo(1.2, 5);

    // Idle: the camera holds still.
    await page.waitForTimeout(800);
    const idle = (await cameraProbe(page))!;

    expect(idle.viewX).toBe(before.viewX);
    expect(idle.viewY).toBe(before.viewY);

    // Walk north up the spine well past the dead zone: the camera tracks
    // and keeps the avatar inside the central band.
    const start = await playerXY(page);

    await driveAxisTo(page, 'y', start.y - 400, 10);
    await page.waitForTimeout(400);

    const after = (await cameraProbe(page))!;
    const moved = await playerXY(page);

    expect(moved.y).toBeLessThan(start.y - 150);
    expect(after.viewY).toBeLessThan(before.viewY);
    expect(moved.y).toBeGreaterThan(after.viewY + after.viewHeight * 0.2);
    expect(moved.y).toBeLessThan(after.viewY + after.viewHeight * 0.8);

    // Push into the east wall along the east–west main: the view clamps
    // to the bounds.
    await driveAxisTo(page, 'y', 480, 10);
    await driveAxisTo(page, 'x', 1400, 8);
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

  test('the visible world field is identical at 800×600, 1280×720 and native 1920×1080; the design space scales with the canvas', async ({
    browser,
  }) => {
    const views: Record<string, CameraProbeLike> = {};
    const spaces: Record<string, unknown> = {};

    for (const [label, viewport] of [
      ['800x600', { width: 800, height: 600 }],
      ['1280x720', { width: 1280, height: 720 }],
      ['1920x1080', { width: 1920, height: 1080 }],
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

    // Equal exposure: the same 1280×720 world field on every canvas.
    for (const label of ['800x600', '1280x720', '1920x1080'] as const) {
      expect(views[label].viewWidth, label).toBe(1280);
      expect(views[label].viewHeight, label).toBe(720);
      expect(views[label].viewX, label).toBe(views['1280x720'].viewX);
      expect(views[label].viewY, label).toBe(views['1280x720'].viewY);
    }

    expect(views['1280x720'].plate).toEqual({
      width: 1280,
      height: 720,
      scale: 1,
    });
    expect(views['1920x1080'].plate).toEqual({
      width: 1280,
      height: 720,
      scale: 1.5,
    });
    expect(views['1920x1080'].hudZoom).toBeCloseTo(1.8, 5);
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
    expect(spaces['1920x1080']).toEqual({
      width: 800,
      height: 600,
      offsetX: 240,
      offsetY: 0,
      scale: 1.8,
      canvasWidth: 1920,
      canvasHeight: 1080,
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
    expect(near?.text).toBe('E / Space — Check in at arrival terminal');

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
