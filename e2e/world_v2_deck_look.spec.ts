/**
 * World V2 rebuild — Utility Deck first look (working evidence): boots
 * the deck directly, walks EVERY audited approach point with real input
 * (the rows 5–6 band above the south machines), asserts the right prompt
 * appears at each (the machine-audited nearest-wins book, verified
 * in-engine), and uses the west door both ways with a reflex-SPACE check
 * on each arrival. The Core door is expected SEALED here (no record
 * closure on a developer boot) — its prompt still reads. Screenshots at
 * 1280×720; nothing here asserts pixels.
 */
import { mkdirSync } from 'node:fs';

import { expect, type Page, test } from '@playwright/test';

import { DECK_REGISTRY } from '../src/world/interactionRegistry';
import { press } from './helpers';
import { bootPilotScene, deckVia, PILOT, useDoor } from './pilotHelpers';

const OUT = 'docs/verification/professional-world-rebuild-v3/deck-look';

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

test('deck first look — every audited approach shows its own prompt; the west door round-trips', async ({
  page,
}) => {
  test.setTimeout(600_000);
  mkdirSync(OUT, { recursive: true });
  await page.setViewportSize({ width: 1280, height: 720 });

  await bootPilotScene(page, 'wv2deck', 'utility_core_deck');
  await shot(page, '01-spawn-concourse-side');

  const tour = [
    'deck.review_panel',
    'deck.door_concourse',
    'deck.feed_coolant',
    'deck.feed_calibration',
    'deck.door_core',
    'deck.feed_distribution',
  ];

  for (const [index, id] of tour.entries()) {
    const entry = DECK_REGISTRY.find((e) => e.id === id)!;

    await deckVia(page, entry.approach.x, entry.approach.y);
    await page.waitForTimeout(250);

    const text = await promptText(page);

    expect(text, `${id}: prompt at audited approach`).not.toBeNull();
    expect(text!.toLowerCase(), `${id}: own label in the prompt`).toContain(
      entry.label.toLowerCase(),
    );

    await shot(
      page,
      `${String(index + 2).padStart(2, '0')}-${id.split('.')[1]}`,
    );
  }

  // The Core door is sealed on a developer boot: E gives the neutral
  // operational reason and the scene stays the deck.
  await deckVia(page, 412, 192);
  await press(page, 'Space');
  await page.waitForTimeout(700);
  expect(await sceneOf(page)).toBe('utility_core_deck');
  await shot(page, '08-core-door-sealed');

  // West door → Concourse → back (reflex SPACE safe on both arrivals).
  await deckVia(page, 100, 188);
  await useDoor(page, PILOT.deck.westDoor, 'station_concourse', {
    approachOffset: { x: 40, y: -12 },
  });
  await shot(page, '09-concourse-arrival');
  await press(page, 'Space');
  await page.waitForTimeout(600);
  expect(await sceneOf(page)).toBe('station_concourse');
  await useDoor(page, PILOT.concourse.eastDoor, 'utility_core_deck', {
    approachOffset: { x: -56, y: 0 },
    yFirst: true,
  });
  await shot(page, '10-deck-return');
  await press(page, 'Space');
  await page.waitForTimeout(600);
  expect(await sceneOf(page)).toBe('utility_core_deck');
});
