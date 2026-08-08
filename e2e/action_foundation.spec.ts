import { expect, test } from '@playwright/test';

import type { RawEventLike } from './helpers';
import { driveAxisTo, findEvents, getEvents, press } from './helpers';
import {
  captureErrors,
  completeDockTutorial,
  dockToHubJourney,
  eventCount,
  expectNoRuntimeErrors,
  waitForEventCount,
} from './journey';

/**
 * Action-assessment rebuild Unit 1: the consolidated control language.
 *
 * - Movement is arrows-only: the letter keys are action keys, so WASD
 *   must never move the avatar (input-contamination guard for the
 *   scan/dig measures).
 * - E is a full keyboard alias of SPACE for contextual interaction.
 * - C performs a real subsurface scan at an eligible survey marker with
 *   no prompt card open — the same flow, state and telemetry as the
 *   card path (redundant-activator rule).
 * - D digs an eligible flagged deposit the same way.
 * - ESC cancels a cancellable timed world action cleanly: no state
 *   change, no telemetry, no frozen avatar.
 * - The __actionHints DEV probe lists exactly the actions that are
 *   currently eligible.
 */

async function questObjective(page: import('@playwright/test').Page) {
  return page.evaluate(
    () =>
      (window as unknown as { __questObjectiveText?: string | null })
        .__questObjectiveText ?? null,
  );
}

async function inventoryItems(page: import('@playwright/test').Page) {
  return page.evaluate(() => {
    const probe = (
      window as unknown as {
        __inventoryProbe?: { slots: (string | null)[] } | null;
      }
    ).__inventoryProbe;

    return (probe?.slots ?? []).filter((slot) => slot !== null);
  });
}

async function actionHints(page: import('@playwright/test').Page) {
  return page.evaluate(
    () =>
      (
        window as unknown as {
          __actionHints?: { hints: { key: string; label: string }[] } | null;
        }
      ).__actionHints?.hints ?? [],
  );
}

async function playerPosition(page: import('@playwright/test').Page) {
  return page.evaluate(() => {
    const probe = (
      window as unknown as {
        __playerProbe?: { x: number; y: number } | null;
      }
    ).__playerProbe;

    return probe === null || probe === undefined
      ? null
      : { x: probe.x, y: probe.y };
  });
}

/** Short tap (no trailing settle) for tight action/cancel sequencing. */
async function tap(page: import('@playwright/test').Page, key: string) {
  await page.keyboard.down(key);
  await page.waitForTimeout(130);
  await page.keyboard.up(key);
}

test.describe('action and inventory foundation (Unit 1)', () => {
  test('arrows-only movement, E interact, C scan, D dig, ESC cancel', async ({
    page,
  }) => {
    test.setTimeout(300_000);

    const errors = captureErrors(page);

    await page.goto(
      '/?participant_id=PT_ACTION_FOUNDATION&game_session_id=GS_ACTION_FOUNDATION',
    );
    await page.waitForFunction(
      () =>
        (window as unknown as { __playerProbe?: { scene: string } | null })
          .__playerProbe?.scene === 'dock',
    );
    // Typewriter settle (bootGame precedent) before scripted input.
    await page.waitForTimeout(2200);

    // — WASD must NOT move the avatar (letters belong to actions now).
    const beforeWasd = await playerPosition(page);

    for (const letter of ['w', 'a', 's', 'd']) {
      await page.keyboard.down(letter);
      await page.waitForTimeout(220);
      await page.keyboard.up(letter);
    }

    const afterWasd = await playerPosition(page);

    expect(afterWasd).toEqual(beforeWasd);

    // — Arrows do move it.
    await page.keyboard.down('ArrowRight');
    await page.waitForTimeout(350);
    await page.keyboard.up('ArrowRight');

    const afterArrow = await playerPosition(page);

    expect(afterArrow!.x).toBeGreaterThan(beforeWasd!.x + 20);

    await completeDockTutorial(page, 1);
    await dockToHubJourney(page);

    // — Vale's requisition, opened with E (the SPACE alias).
    await driveAxisTo(page, 'y', 368, 12);
    await driveAxisTo(page, 'x', 144, 10);
    await press(page, 'e');
    expect(
      await page.evaluate(
        () =>
          (window as unknown as { __promptCards?: unknown[] | null })
            .__promptCards,
      ),
    ).not.toBeNull();
    await press(page, '1');

    // — Collect the issued kit from the locker (card path, unchanged).
    await driveAxisTo(page, 'x', 62, 10);
    await press(page, 'Space');
    for (let i = 0; i < 3; i++) {
      await press(page, '1');
      await page.waitForTimeout(1300);
      if (i < 2) {
        await press(page, 'Space');
      }
    }

    expect(await inventoryItems(page)).toEqual([
      'field_scanner',
      'excavation_spade',
      'sample_case',
    ]);

    // — Out to the Survey Terrace.
    const beforeField = await eventCount(page, 'scene_start', 'field');

    await driveAxisTo(page, 'x', 192, 10);
    await driveAxisTo(page, 'y', 418, 14);
    await press(page, 'Space');
    await waitForEventCount(page, 'scene_start', 'field', beforeField + 1);

    // — Kai's briefing (E alias again).
    await driveAxisTo(page, 'x', 416, 12);
    await press(page, 'e');
    await press(page, '1');
    expect(await questObjective(page)).toContain(
      'Scan the survey markers (0/4)',
    );

    // — Marker 1 (x160 y272): the C hint appears in reach…
    await driveAxisTo(page, 'y', 272, 10);
    await driveAxisTo(page, 'x', 160, 10);

    const hintsAtMarker = await actionHints(page);

    expect(hintsAtMarker.map((hint) => hint.key)).toContain('C');

    // …ESC cancels a started scan with no state change and no event…
    await tap(page, 'c');
    await tap(page, 'Escape');
    await page.waitForTimeout(400);

    let events: RawEventLike[] = await getEvents(page);

    expect(findEvents(events, 'proto_scan_performed')).toHaveLength(0);
    expect(
      await page.evaluate(
        () =>
          (window as unknown as { __lastRoomFeedbackText?: string | null })
            .__lastRoomFeedbackText,
      ),
    ).toContain('Action cancelled');

    // …the avatar is free (not frozen) after the cancel…
    await driveAxisTo(page, 'x', 130, 8);
    await driveAxisTo(page, 'x', 160, 10);

    // …and C performs the real scan with NO prompt card open.
    await tap(page, 'c');
    await page.waitForTimeout(1600);
    events = await getEvents(page);
    expect(findEvents(events, 'proto_scan_performed')).toHaveLength(1);
    expect(await questObjective(page)).toContain('(1/4)');

    // A second C at the same marker is inert (marker consumed; hint gone).
    expect((await actionHints(page)).map((hint) => hint.key)).not.toContain(
      'C',
    );
    await tap(page, 'c');
    await page.waitForTimeout(1400);
    events = await getEvents(page);
    expect(findEvents(events, 'proto_scan_performed')).toHaveLength(1);

    // — Marker 2 (anomaly, x96 y160): C scan flags it, then D digs it.
    await driveAxisTo(page, 'y', 208, 10);
    await driveAxisTo(page, 'x', 96, 10);
    await tap(page, 'c');
    await page.waitForTimeout(1600);
    events = await getEvents(page);
    expect(findEvents(events, 'proto_scan_performed')).toHaveLength(2);

    const digHints = await actionHints(page);

    expect(digHints.map((hint) => hint.key)).toContain('D');

    await tap(page, 'd');
    await page.waitForTimeout(2000);
    events = await getEvents(page);
    expect(findEvents(events, 'proto_dig_performed')).toHaveLength(1);
    expect(await inventoryItems(page)).toContain('relay_coupling');

    // Key-path events carry no canonical measurement context.
    for (const event of [
      ...findEvents(events, 'proto_scan_performed'),
      ...findEvents(events, 'proto_dig_performed'),
    ]) {
      expect(event.study_item_ids).toBeUndefined();
      expect(event.construct_id).toBeUndefined();
    }

    expectNoRuntimeErrors(errors);
  });
});
