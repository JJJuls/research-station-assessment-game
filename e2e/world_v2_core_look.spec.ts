/**
 * World V2 rebuild — Core Chamber first look (working evidence): boots
 * the chamber directly (developer inspection: no feed is up, so the Core
 * is INACTIVE), walks EVERY audited approach point with real input (west
 * floor ↔ east floor through the south corridor), asserts the right
 * prompt at each, opens the Core's inspect prompt, then uses the south
 * door to the deck and confirms the blast door's sealed reason on the
 * way back. The prepared / synchronising / stable states are captured by
 * the full-route closure capture. Screenshots at 1280×720; nothing here
 * asserts pixels.
 */
import { mkdirSync } from 'node:fs';

import { expect, type Page, test } from '@playwright/test';

import { CORE_REGISTRY } from '../src/world/interactionRegistry';
import { press, selectPromptOption } from './helpers';
import {
  approachAudited,
  coreVia,
  deckVia,
  PILOT,
  useDoor,
  waitScene,
} from './pilotHelpers';

// V3 final evidence: WV3_VIEWPORT (WxH) / WV3_OUT re-run the same real-input
// tour at the native 1920×1080 canvas into its own directory.
const VIEWPORT = (() => {
  const raw = process.env.WV3_VIEWPORT ?? '1280x720';
  const [w, h] = raw.split('x').map((value) => Number(value));

  return { width: w || 1280, height: h || 720 };
})();
const OUT =
  process.env.WV3_OUT ??
  'docs/verification/professional-world-rebuild-v3/core-look';

async function shot(page: Page, name: string) {
  await page.waitForTimeout(350);
  await page.screenshot({ path: `${OUT}/${name}.png` });
}

async function promptText(page: Page): Promise<string | null> {
  return page.evaluate(
    () =>
      (
        window as unknown as {
          __worldPromptProbe?: { prompt: boolean; text?: string | null } | null;
        }
      ).__worldPromptProbe?.text ?? null,
  );
}

async function sceneOf(page: Page): Promise<string | null> {
  return page.evaluate(
    () =>
      (window as unknown as { __playerProbe?: { scene: string } | null })
        .__playerProbe?.scene ?? null,
  );
}

async function coreVisualState(page: Page): Promise<string | null> {
  return page.evaluate(
    () =>
      (
        window as unknown as {
          __coreChamberProbe?: { visual_state: string } | null;
        }
      ).__coreChamberProbe?.visual_state ?? null,
  );
}

test('core chamber first look — every audited approach shows its own prompt; the south door leads to the deck and the sealed blast door refuses the way back', async ({
  page,
}) => {
  test.setTimeout(600_000);
  mkdirSync(OUT, { recursive: true });
  await page.setViewportSize(VIEWPORT);

  await page.goto(
    `/?participant_id=PT_PILOT_wv2core&game_session_id=GS_PILOT_wv2core_${Date.now()}&scene=core_chamber&dev_closure=inspect`,
  );
  await waitScene(page, 'core_chamber', 60_000);
  await page.waitForTimeout(1200);
  await shot(page, '01-spawn-corridor');

  const tour = ['core.door_deck', 'core.core', 'core.kai'];

  for (const [index, id] of tour.entries()) {
    const entry = CORE_REGISTRY.find((e) => e.id === id)!;

    const text = await approachAudited(page, coreVia, entry, () =>
      promptText(page),
    );

    expect(text, `${id}: prompt at audited approach`).not.toBeNull();
    expect(text!.toLowerCase(), `${id}: own label in the prompt`).toContain(
      entry.label.toLowerCase(),
    );

    await shot(
      page,
      `${String(index + 2).padStart(2, '0')}-${id.split('.')[1]}`,
    );
  }

  // The dormant core from the control point. Under developer inspection
  // no feed is up, so the Core is INACTIVE and synchronisation is not
  // offered — the prepared/synchronising/stable states are captured by
  // the full-route closure capture, never by a shortcut here.
  await coreVia(page, 220, 205);
  await shot(page, '05-core-inactive');
  expect(await coreVisualState(page)).toBe('inactive');

  // The Core prompt: inspect (no surface), then step away.
  await press(page, 'Space');
  await page.waitForFunction(
    () =>
      (window as unknown as { __promptCards?: unknown[] | null })
        .__promptCards != null,
    undefined,
    { timeout: 4000 },
  );
  await shot(page, '06-core-prompt');
  await selectPromptOption(page, 1);
  await page.waitForTimeout(600);
  await shot(page, '07-core-inspected');

  // South door → deck → back (reflex SPACE safe on both arrivals).
  await coreVia(page, 348, 300);
  await useDoor(page, PILOT.core.southDoor, 'utility_core_deck', {
    approachOffset: { x: 0, y: -30 },
  });
  await shot(page, '08-deck-arrival-from-core');
  await press(page, 'Space');
  await page.waitForTimeout(600);
  expect(await sceneOf(page)).toBe('utility_core_deck');

  // The way back is the deck's readiness gate: with the feeds down the
  // painted blast door stays sealed with its neutral operational reason
  // (the open door is exercised by the closure suite on the full route).
  // V3 verification: at the 1080p canvas (~28 px per rendered frame) a
  // landing can sit on the edge of the door's range or the press can fall
  // between frames; re-approach and press again, at most three times,
  // waiting for the sealed reason each time (real input; no state touched).
  let sealed = false;

  for (let attempt = 0; attempt < 3 && !sealed; attempt += 1) {
    await deckVia(page, 412, 192);
    await press(page, 'Space');
    sealed = await page
      .waitForFunction(
        () =>
          /^Core sealed/.test(
            (window as unknown as { __lastRoomFeedbackText?: string | null })
              .__lastRoomFeedbackText ?? '',
          ),
        undefined,
        { timeout: 6000 },
      )
      .then(() => true)
      .catch(() => false);
  }

  expect(sealed, 'the sealed Core door answers with its reason').toBe(true);
  await shot(page, '09-core-door-sealed-from-deck');
  expect(await sceneOf(page)).toBe('utility_core_deck');
});
