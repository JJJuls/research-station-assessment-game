import { expect, test } from '@playwright/test';

import { getEvents } from './helpers';
import {
  bootJourney,
  captureErrors,
  eventCount,
  expectNoRuntimeErrors,
  openStationAlcove,
  waitForEventCount,
} from './journey';

/**
 * ADV-7 (Sprint B Part 1, docs/testing/ADVERSARIAL-JOURNEY-PLAN.md):
 * rapid repeated input. One participant decision must produce exactly one
 * event set no matter how fast or how often the option key is hammered —
 * the prompt closes on selection, so surplus presses land on a closed
 * prompt and must be inert. Space-spam against the station must only ever
 * toggle the prompt (each real open legitimately logs its per-open events)
 * and never corrupt the log or crash.
 */

test.describe('adversarial: rapid repeated input', () => {
  test('hammering an option key yields exactly one decision event set', async ({
    page,
  }) => {
    const capture = captureErrors(page);

    await bootJourney(
      page,
      {
        participant_id: 'ADV7_P1',
        game_session_id: 'ADV7_S1',
        condition: 'adv_spam',
        scene: 'repair',
      },
      'repair',
    );

    await openStationAlcove(page); // repair panel prompt opens

    // Hammer "1" (deterministic failure option) 12× as fast as the
    // browser will deliver the keystrokes.
    for (let i = 0; i < 12; i += 1) {
      await page.keyboard.press('1', { delay: 30 });
    }
    await waitForEventCount(page, 'repair_failed', undefined, 1);
    // Settle: give any (erroneous) surplus events time to appear.
    await page.waitForTimeout(1500);

    expect(await eventCount(page, 'repair_attempt')).toBe(1);
    expect(await eventCount(page, 'repair_sequence_submitted')).toBe(1);
    expect(await eventCount(page, 'repair_failed')).toBe(1);
    expect(await eventCount(page, 'repair_same_sequence_repeated')).toBe(0);

    expectNoRuntimeErrors(capture);
  });

  test('space-spam only toggles the prompt; the log stays ordered and intact', async ({
    page,
  }) => {
    const capture = captureErrors(page);

    await bootJourney(
      page,
      {
        participant_id: 'ADV7_P2',
        game_session_id: 'ADV7_S2',
        condition: 'adv_spam',
        scene: 'repair',
      },
      'repair',
    );

    // Walk into interaction range (same approach as openStationAlcove but
    // without the initial SPACE — the spam supplies it).
    await page.keyboard.down('ArrowUp');
    await page.waitForTimeout(900);
    await page.keyboard.up('ArrowUp');
    await page.waitForTimeout(300);

    for (let i = 0; i < 14; i += 1) {
      await page.keyboard.press('Space', { delay: 40 });
    }
    await page.waitForTimeout(1500);

    const events = await getEvents(page);

    // No decision was ever made: zero decision events regardless of how
    // many open/close toggles the spam produced.
    const types = events.map((e) => e.event_type);

    expect(types).not.toContain('repair_attempt');
    expect(types).not.toContain('repair_failed');
    expect(types).not.toContain('repair_manual_used');

    // Every open logged its per-open pair together (opened events only).
    const opens = types.filter((t) => t === 'repair_panel_opened').length;

    expect(opens).toBeGreaterThanOrEqual(1);

    // Log integrity under spam: timestamps monotonic non-decreasing.
    const stamps = events.map((e) => e.timestamp_ms as number);

    for (let i = 1; i < stamps.length; i += 1) {
      expect(stamps[i]).toBeGreaterThanOrEqual(stamps[i - 1]);
    }

    expectNoRuntimeErrors(capture);
  });
});
