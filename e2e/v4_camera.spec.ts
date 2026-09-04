/**
 * V4 visual-validity redesign — camera, viewport and HUD-space contract
 * (docs/game/VISUAL-SYSTEM-V4.md §1; mission §9 / §22).
 *
 * Positive assertions over the DEV probes with real keyboard input:
 *   - the world camera runs at the fixed integer zoom and follows the
 *     avatar (scroll changes as the avatar walks; the avatar stays inside
 *     the visible world window);
 *   - the camera never leaves the room bounds;
 *   - the visible world area is the same at 800×600 and 1280×720;
 *   - the design-space probe describes the HUD mapping the pointer helpers
 *     rely on, and a HUD prompt card click lands (pointer path works);
 *   - the contextual prompt appears only inside the interaction range.
 *
 * Every state is produced by walking; no DEV state mutation.
 */
import { mkdirSync } from 'node:fs';

import { expect, type Page, test } from '@playwright/test';

import {
  clickPromptCard,
  designSpace,
  driveAxisTo,
  getEventTypes,
  press,
} from './helpers';
import { bootPilot } from './pilotHelpers';

interface CameraProbeLike {
  scene: string;
  zoom: number;
  scrollX: number;
  scrollY: number;
  viewX: number;
  viewY: number;
  viewWidth: number;
  viewHeight: number;
  boundsWidth: number;
  boundsHeight: number;
  hudZoom: number | null;
  roundPixels: boolean;
}

const OUT =
  process.env.V4_OUT ?? 'docs/verification/professional-visual-v4/unit1';

async function cameraProbe(page: Page): Promise<CameraProbeLike | null> {
  return page.evaluate(
    () =>
      (window as unknown as { __cameraProbe?: CameraProbeLike | null })
        .__cameraProbe ?? null,
  );
}

async function playerXY(page: Page): Promise<{ x: number; y: number }> {
  const probe = await page.evaluate(
    () =>
      (window as unknown as { __playerProbe?: { x: number; y: number } | null })
        .__playerProbe ?? null,
  );

  if (probe === null) {
    throw new Error('player probe unavailable');
  }

  return probe;
}

async function worldPromptVisible(page: Page): Promise<boolean> {
  return page.evaluate(
    () =>
      (window as unknown as { __worldPromptProbe?: { prompt: boolean } | null })
        .__worldPromptProbe?.prompt ?? false,
  );
}

async function bootDock(page: Page, tag: string) {
  // Participant default launch (the skippable opening is dismissed by the
  // helper with a real key press), exactly as a participant arrives.
  await bootPilot(page, `v4cam_${tag}`);
  await page.waitForTimeout(900);
}

test.describe('V4 camera and viewport contract', () => {
  test('world camera: fixed integer zoom, follows the avatar, stays inside the room bounds', async ({
    page,
  }) => {
    await bootDock(page, 'follow');

    const before = await cameraProbe(page);

    expect(before).not.toBeNull();
    expect(before!.zoom).toBe(2);
    expect(before!.hudZoom).toBeCloseTo(1.2, 5);
    expect(before!.roundPixels).toBe(true);
    // 640×360 world pixels visible (20 × 11.25 tiles).
    expect(Math.round(before!.viewWidth)).toBe(640);
    expect(Math.round(before!.viewHeight)).toBe(360);

    // Walk east along the arrival lane (position-synced — the software-GL
    // verification renderer is frame-rate bound): the camera must track.
    const start = await playerXY(page);

    await driveAxisTo(page, 'x', 480, 10);

    const after = await cameraProbe(page);
    const moved = await playerXY(page);

    expect(moved.x).toBeGreaterThan(start.x + 40);
    expect(after!.scrollX).not.toBe(before!.scrollX);
    // The avatar is inside the visible world window, in its central band.
    expect(moved.x).toBeGreaterThan(after!.viewX + after!.viewWidth * 0.25);
    expect(moved.x).toBeLessThan(after!.viewX + after!.viewWidth * 0.75);
    expect(moved.y).toBeGreaterThan(after!.viewY);
    expect(moved.y).toBeLessThan(after!.viewY + after!.viewHeight);

    // Push into the room's east wall: the camera clamps to the bounds and
    // never reveals space outside the room.
    await driveAxisTo(page, 'x', 760, 8);

    const clamped = await cameraProbe(page);

    expect(clamped!.viewX).toBeGreaterThanOrEqual(0);
    expect(clamped!.viewY).toBeGreaterThanOrEqual(0);
    expect(clamped!.viewX + clamped!.viewWidth).toBeLessThanOrEqual(
      clamped!.boundsWidth + 0.01,
    );
    expect(clamped!.viewY + clamped!.viewHeight).toBeLessThanOrEqual(
      clamped!.boundsHeight + 0.01,
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

      await bootDock(page, `parity-${label}`);
      views[label] = (await cameraProbe(page))!;
      spaces[label] = await designSpace(page);

      // Unit evidence: the Dock arrival frame at this viewport.
      mkdirSync(OUT, { recursive: true });
      await page.screenshot({ path: `${OUT}/dock-arrival-${label}.png` });

      const box = (await page.locator('canvas').boundingBox())!;

      // FIT letterbox: the canvas keeps 16:9 and never overflows.
      expect(box.width).toBeLessThanOrEqual(viewport.width + 2);
      expect(box.height).toBeLessThanOrEqual(viewport.height + 2);
      expect(box.width / box.height).toBeGreaterThan(1.76);
      expect(box.width / box.height).toBeLessThan(1.79);

      await context.close();
    }

    expect(Math.round(views['800x600'].viewWidth)).toBe(
      Math.round(views['1280x720'].viewWidth),
    );
    expect(Math.round(views['800x600'].viewHeight)).toBe(
      Math.round(views['1280x720'].viewHeight),
    );
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

  test('contextual prompt appears only in range; the pointer path reaches a HUD card', async ({
    page,
  }) => {
    await bootDock(page, 'prompt');

    // Far from every interactable at spawn: no prompt.
    expect(await worldPromptVisible(page)).toBe(false);

    // Approach the Arrival Terminal (world 96,96) from below.
    await driveAxisTo(page, 'x', 96, 10);
    await driveAxisTo(page, 'y', 150, 10);
    await page.waitForTimeout(300);
    expect(await worldPromptVisible(page)).toBe(true);

    // Open the prompt with SPACE, then click the first card through the
    // design-space mapping (the pointer path).
    await press(page, 'Space');
    await page.waitForFunction(
      () =>
        (
          window as unknown as {
            __promptCards?: { x: number; y: number }[] | null;
          }
        ).__promptCards !== null,
      undefined,
      { timeout: 5000 },
    );
    expect(await worldPromptVisible(page)).toBe(false);

    await clickPromptCard(page, 0);
    await page.waitForFunction(
      () =>
        (window as unknown as { __promptCards?: unknown[] | null })
          .__promptCards === null,
      undefined,
      { timeout: 5000 },
    );

    // The card click selected the first tutorial option (skip) — the
    // pointer path reached the HUD card through the design-space mapping.
    const types = await getEventTypes(page);

    expect(types).toContain('dock_tutorial_skipped');
    expect((await playerXY(page)).x).toBeLessThan(140);
  });
});
