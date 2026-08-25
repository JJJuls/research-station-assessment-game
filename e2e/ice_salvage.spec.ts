import { expect, test } from '@playwright/test';

import {
  buildSalvageDeck,
  salvageSeedFromSession,
} from '../src/gameplay/iceSalvage';
import {
  driveAxisTo,
  findEvent,
  findEvents,
  getEvents,
  getLastFeedbackText,
  openNearbyPrompt,
  press,
  selectPromptOption,
} from './helpers';
import {
  bootJourney,
  captureErrors,
  expectNoRuntimeErrors,
  waitForEventCount,
} from './journey';

/**
 * Physical-mechanics session (Unit 7): post-assessment ice salvage.
 *
 * Verifies the scientific isolation contract: locked until the primary
 * route completes (or the explicit DEV free-play flag), deterministic
 * seeded loot deck, catches never touch the primary inventory, no
 * primary Q tags anywhere in the salvage family, and both hit and miss
 * paths resolve cleanly.
 */

async function inventorySlots(page: import('@playwright/test').Page) {
  return page.evaluate(() => {
    const probe = (
      window as unknown as {
        __inventoryProbe?: { slots: (string | null)[] } | null;
      }
    ).__inventoryProbe;

    return probe?.slots ?? [];
  });
}

/**
 * Terrace spawn → the ice bore (SW corner, row 14): west along the open
 * row 9, then down the clear col-2 column (row-11 rocks flank col 3).
 */
async function walkToBore(page: import('@playwright/test').Page) {
  // Unit 8 repair (merge-era lane clamp, complete_first_shift class):
  // an x≈86 settle puts the body edge against the row-11 wall (col 3
  // starts at x=96) and the descent then strands the avatar out of the
  // bore's 72px range. Target deeper into the col-2 corridor and
  // re-drive both axes once so drift under load self-corrects.
  await driveAxisTo(page, 'y', 318, 8); // row 10 (clears the row-8 rocks)

  for (let pass = 0; pass < 2; pass++) {
    await driveAxisTo(page, 'x', 76, 4); // col-2 corridor, wall-safe
    await driveAxisTo(page, 'y', 430, 14); // descend; clamps in bore range
  }
}

test.describe('post-assessment ice salvage (Unit 7)', () => {
  test('locked during the duty shift (no free-play flag)', async ({ page }) => {
    test.setTimeout(240_000);

    const errors = captureErrors(page);

    await bootJourney(
      page,
      {
        participant_id: 'PT_SALVAGE_LOCK',
        game_session_id: 'GS_SALVAGE_LOCK',
        scene: 'field',
      },
      'field',
    );

    await walkToBore(page);
    await press(page, 'Space');
    await page.waitForTimeout(600);

    if ((await getLastFeedbackText(page)) === null) {
      await press(page, 'Space'); // documented input-loss retry
      await page.waitForTimeout(600);
    }

    expect(await getLastFeedbackText(page)).toContain('capped');

    const events = await getEvents(page);

    expect(findEvent(events, 'proto_salvage_opened')).toBeUndefined();

    expectNoRuntimeErrors(errors);
  });

  test('deterministic deck, hit and miss, zero primary influence', async ({
    page,
  }) => {
    test.setTimeout(420_000);

    const errors = captureErrors(page);
    const sessionId = 'GS_SALVAGE_PLAY';
    const expectedDeck = buildSalvageDeck(salvageSeedFromSession(sessionId));

    await bootJourney(
      page,
      {
        participant_id: 'PT_SALVAGE_PLAY',
        game_session_id: sessionId,
        scene: 'field',
        freeplay: '1',
      },
      'field',
    );

    const slotsBefore = await inventorySlots(page);

    await walkToBore(page);
    await openNearbyPrompt(page);
    await waitForEventCount(page, 'proto_salvage_opened', 'field', 1);

    // — Cast 1: set the hook inside the band (probe-timed) → first deck
    // card, exactly as computed from the session seed.
    await selectPromptOption(page, 1); // Lower the magnet
    await page.waitForFunction(
      () =>
        (
          window as unknown as {
            __salvageProbe?: { phase: string } | null;
          }
        ).__salvageProbe?.phase === 'tension',
      undefined,
      { timeout: 10_000 },
    );
    await page.waitForFunction(
      () =>
        (
          window as unknown as {
            __salvageProbe?: { markerInBand: boolean } | null;
          }
        ).__salvageProbe?.markerInBand === true,
      undefined,
      { timeout: 10_000 },
    );
    await press(page, 'Space');
    await waitForEventCount(page, 'proto_salvage_pull', 'field', 1);

    let events = await getEvents(page);
    const firstPull = findEvent(events, 'proto_salvage_pull');
    const firstMetadata = firstPull?.metadata as {
      catch_id?: string;
      tier?: string;
      pull_number?: number;
    };

    expect(firstMetadata.catch_id).toBe(expectedDeck[0].catch_id);
    expect(firstMetadata.tier).toBe(expectedDeck[0].tier);
    expect(firstMetadata.pull_number).toBe(1);

    // — Cast 2: set the hook OUTSIDE the band → a clean miss, no draw.
    await press(page, 'Space');
    await selectPromptOption(page, 1);
    await page.waitForFunction(
      () =>
        (
          window as unknown as {
            __salvageProbe?: { phase: string; markerInBand: boolean } | null;
          }
        ).__salvageProbe?.phase === 'tension' &&
        (
          window as unknown as {
            __salvageProbe?: { phase: string; markerInBand: boolean } | null;
          }
        ).__salvageProbe?.markerInBand === false,
      undefined,
      { timeout: 10_000 },
    );
    await press(page, 'Space');
    await waitForEventCount(page, 'proto_salvage_miss', 'field', 1);

    // — Cast 3: hit again → second deck card in order.
    await press(page, 'Space');
    await selectPromptOption(page, 1);
    await page.waitForFunction(
      () =>
        (
          window as unknown as {
            __salvageProbe?: { phase: string; markerInBand: boolean } | null;
          }
        ).__salvageProbe?.phase === 'tension' &&
        (
          window as unknown as {
            __salvageProbe?: { phase: string; markerInBand: boolean } | null;
          }
        ).__salvageProbe?.markerInBand === true,
      undefined,
      { timeout: 10_000 },
    );
    await press(page, 'Space');
    await waitForEventCount(page, 'proto_salvage_pull', 'field', 2);

    events = await getEvents(page);

    const pulls = findEvents(events, 'proto_salvage_pull');

    expect(
      pulls.map((event) => (event.metadata as { catch_id?: string }).catch_id),
    ).toEqual([expectedDeck[0].catch_id, expectedDeck[1].catch_id]);

    // — The seed is logged once as secondary telemetry.
    const opened = findEvent(events, 'proto_salvage_opened');

    expect((opened?.metadata as { seed?: number }).seed).toBe(
      salvageSeedFromSession(sessionId),
    );

    // — Zero primary influence: the primary inventory is untouched,
    // catches carry no canonical context, and no measurement-family
    // (proto_q*) event fired from the moment salvage opened onward.
    expect(await inventorySlots(page)).toEqual(slotsBefore);

    const salvageStart = events.findIndex(
      (event) => event.event_type === 'proto_salvage_opened',
    );

    expect(salvageStart).toBeGreaterThanOrEqual(0);

    for (const event of events) {
      if (event.event_type.startsWith('proto_salvage_')) {
        expect(event.study_item_ids).toBeUndefined();
        expect(event.construct_id).toBeUndefined();
      }
    }

    for (const event of events.slice(salvageStart)) {
      expect(event.event_type.startsWith('proto_q')).toBe(false);
    }

    expectNoRuntimeErrors(errors);
  });
});
