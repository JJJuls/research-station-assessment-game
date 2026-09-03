/**
 * Unit 8 — positive proof of the M02 case-workspace overlay (the open
 * finding carried since Unit 2: "filing-desk overlay did not open" on the
 * capture / pilot_deck path).
 *
 * Every claim is proven with real input against DEV probes, from a direct
 * zone boot with NO prior station visited (no hidden prerequisite):
 *   - the participant stands inside the 72 px radius of the right target
 *     (one label chip, no competing prompt card);
 *   - both the E and the SPACE paths open the overlay in `m02case` mode
 *     (never the I-key backpack);
 *   - the rendered frame actually changes (screenshot bytes differ) and the
 *     host's world prompt is hidden while the overlay is open;
 *   - the host is paused (held movement does not move the avatar);
 *   - ESC closes the overlay, the host resumes (movement works, the prompt
 *     returns);
 *   - no runtime error at any point.
 * The participant-path opening of the same overlay after the Concourse
 * briefing is exercised by `pilot_visual_capture` leg 1 (frame 08).
 */
import { expect, type Page, test } from '@playwright/test';

import { hold, press } from './helpers';
import { captureErrors, expectNoRuntimeErrors } from './journey';
import { bootPilotScene, PILOT, walkTo } from './pilotHelpers';

interface Probes {
  player: { x: number; y: number } | null;
  prompt: { prompt: boolean; chips: number } | null;
  cards: unknown;
  overlay: { open: boolean; mode?: string } | null;
}

async function probes(page: Page): Promise<Probes> {
  return page.evaluate(() => {
    const w = window as unknown as Record<string, unknown>;

    return {
      player: (w.__playerProbe as Probes['player']) ?? null,
      prompt: (w.__worldPromptProbe as Probes['prompt']) ?? null,
      cards: w.__promptCards ?? null,
      overlay: (w.__inventoryUiProbe as Probes['overlay']) ?? null,
    };
  });
}

const CLIP = { x: 40, y: 42, width: 720, height: 516 } as const;

async function proveOverlay(page: Page, key: 'e' | 'Space') {
  const errors = captureErrors(page);

  await bootPilotScene(page, `m02proof_${key}`, 'records_workshop');

  // Same lane as the participant capture: the x = 60 corridor, then the
  // filing desk from below (approach offset +44 px).
  await walkTo(page, 60, 112, { yFirst: false });
  await walkTo(page, 60, 312, { yFirst: true });
  await walkTo(
    page,
    PILOT.workshop.filingDesk.x,
    PILOT.workshop.filingDesk.y + 44,
  );
  await page.waitForFunction(
    () =>
      (window as unknown as { __worldPromptProbe?: { prompt: boolean } })
        .__worldPromptProbe?.prompt === true,
    undefined,
    { timeout: 10_000 },
  );

  const before = await probes(page);

  expect(before.player, 'player probe').not.toBeNull();
  expect(
    Math.hypot(
      before.player!.x - PILOT.workshop.filingDesk.x,
      before.player!.y - PILOT.workshop.filingDesk.y,
    ),
    'inside the 72 px interaction radius',
  ).toBeLessThan(72);
  expect(before.prompt?.prompt, 'prompt visible').toBe(true);
  expect(before.prompt?.chips, 'exactly one target chip (no competitor)').toBe(
    1,
  );
  expect(before.cards, 'no prompt card open').toBeNull();
  expect(before.overlay?.open ?? false, 'overlay closed before the press').toBe(
    false,
  );

  const frameBefore = await page.screenshot({ clip: CLIP });

  await press(page, key);
  await page.waitForFunction(
    () =>
      (window as unknown as { __inventoryUiProbe?: { open: boolean } | null })
        .__inventoryUiProbe?.open === true,
    undefined,
    { timeout: 5_000 },
  );

  const open = await probes(page);

  expect(
    open.overlay?.mode,
    'the station overlay, not the I-key backpack',
  ).toBe('m02case');
  expect(open.cards, 'no prompt card opened instead').toBeNull();
  expect(open.prompt?.prompt, 'world prompt hidden under the overlay').toBe(
    false,
  );
  expect(open.prompt?.chips, 'no label chip under the overlay').toBe(0);

  const frameOpen = await page.screenshot({ clip: CLIP });

  expect(
    frameOpen.equals(frameBefore),
    'the rendered panel region changed',
  ).toBe(false);

  // Host paused: held movement moves nothing.
  const at = open.player!;

  await hold(page, 'ArrowRight', 400);

  const still = await probes(page);

  expect(still.player, 'avatar did not move while paused').toEqual(at);
  expect(still.overlay?.open, 'overlay still open').toBe(true);

  // ESC closes; the host resumes: the prompt returns and movement works.
  await press(page, 'Escape');
  await page.waitForFunction(
    () =>
      (window as unknown as { __inventoryUiProbe?: { open: boolean } | null })
        .__inventoryUiProbe?.open !== true,
    undefined,
    { timeout: 5_000 },
  );
  await page.waitForFunction(
    () =>
      (window as unknown as { __worldPromptProbe?: { prompt: boolean } })
        .__worldPromptProbe?.prompt === true,
    undefined,
    { timeout: 5_000 },
  );

  const frameClosed = await page.screenshot({ clip: CLIP });

  expect(frameClosed.equals(frameOpen), 'the panel is gone').toBe(false);

  await hold(page, 'ArrowRight', 300);

  const moved = await probes(page);

  expect(moved.player!.x, 'movement resumed after close').toBeGreaterThan(at.x);
  expectNoRuntimeErrors(errors);
}

test.describe('M02 case-workspace overlay — positive proof', () => {
  test('E path: opens, renders, pauses the host, closes and resumes', async ({
    page,
  }) => {
    test.setTimeout(180_000);
    await proveOverlay(page, 'e');
  });

  test('SPACE path: opens, renders, pauses the host, closes and resumes', async ({
    page,
  }) => {
    test.setTimeout(180_000);
    await proveOverlay(page, 'Space');
  });
});
