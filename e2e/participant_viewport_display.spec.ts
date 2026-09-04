import type { Browser, Page } from '@playwright/test';
import { expect, test } from '@playwright/test';

/**
 * Participant-experience viewport/display regression (OPUS participant-
 * experience & accessibility gate). V4: the game uses Phaser Scale.FIT +
 * CENTER_BOTH on a 1280x720 (16:9) base (src/index.ts,
 * docs/game/VISUAL-SYSTEM-V4.md §1), so at every desktop viewport the
 * canvas must:
 *   - fit fully inside the viewport (never exceed it),
 *   - preserve the 16:9 aspect ratio (1.778) — letterbox, never stretch, and
 *   - never introduce a horizontal page scrollbar.
 * This locks that contract so a future Scale-mode change cannot silently
 * ship a clipped or overflowing participant layout. Purely presentational —
 * no scientific/event/scoring surface is touched.
 *
 * These run against the DEV server (playwright.config webServer); the canvas
 * dimensions and page-overflow metrics are identical to the participant
 * bundle (Scale config is shared) — the only DEV/PROD visual delta is the
 * arcade physics-debug overlay, which does not affect canvas sizing.
 */

interface DisplayMetrics {
  canvasW: number;
  canvasH: number;
  scrollW: number;
  aspect: number;
}

async function bootAtViewport(
  browser: Browser,
  width: number,
  height: number,
): Promise<{ page: Page; metrics: DisplayMetrics; errors: string[] }> {
  const context = await browser.newContext({ viewport: { width, height } });
  const page = await context.newPage();
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text());
  });

  await page.goto('/?participant_id=VPT&game_session_id=vpt-1&route=legacy');
  await page.waitForSelector('canvas', { timeout: 30_000 });
  await page.waitForFunction(
    () => {
      const c = document.querySelector('canvas') as HTMLCanvasElement | null;
      return !!c && c.getBoundingClientRect().width > 0;
    },
    undefined,
    { timeout: 30_000 },
  );
  await page.waitForTimeout(1200);

  const metrics = await page.evaluate<DisplayMetrics>(() => {
    const c = document.querySelector('canvas') as HTMLCanvasElement;
    const r = c.getBoundingClientRect();
    return {
      canvasW: Math.round(r.width),
      canvasH: Math.round(r.height),
      scrollW: document.documentElement.scrollWidth,
      aspect: Math.round((r.width / r.height) * 1000) / 1000,
    };
  });

  return { page, metrics, errors };
}

const DESKTOP_VIEWPORTS = [
  { w: 1920, h: 1080 },
  { w: 1536, h: 864 },
  { w: 1366, h: 768 },
  { w: 1280, h: 720 },
  { w: 1024, h: 768 },
  { w: 800, h: 600 },
];

for (const vp of DESKTOP_VIEWPORTS) {
  test(`canvas fits and preserves 16:9 at ${vp.w}x${vp.h}`, async ({
    browser,
  }) => {
    const { page, metrics, errors } = await bootAtViewport(browser, vp.w, vp.h);

    expect(metrics.canvasW, 'canvas width fits viewport').toBeLessThanOrEqual(
      vp.w + 2,
    );
    expect(metrics.canvasH, 'canvas height fits viewport').toBeLessThanOrEqual(
      vp.h + 2,
    );
    // 16:9 aspect preserved (1280/720 = 1.778) — no stretch/distortion.
    expect(metrics.aspect).toBeGreaterThan(1.76);
    expect(metrics.aspect).toBeLessThan(1.79);
    // Body must never scroll horizontally.
    expect(metrics.scrollW, 'no horizontal page overflow').toBeLessThanOrEqual(
      vp.w + 2,
    );
    expect(errors, `page/console errors: ${errors.join(' | ')}`).toEqual([]);

    await page.context().close();
  });
}

test('narrow viewport 375x667: content letterboxes, never overflows horizontally', async ({
  browser,
}) => {
  // NOT a mobile-support claim: at a phone-sized viewport the canvas shrinks
  // (unreadably small) but FIT keeps it fully inside the viewport with no
  // horizontal overflow and no clipping — documented graceful degradation.
  const { page, metrics } = await bootAtViewport(browser, 375, 667);

  expect(metrics.canvasW).toBeLessThanOrEqual(375 + 2);
  expect(metrics.scrollW).toBeLessThanOrEqual(375 + 2);
  expect(metrics.aspect).toBeGreaterThan(1.76);
  expect(metrics.aspect).toBeLessThan(1.79);

  await page.context().close();
});
