import { expect, test } from '@playwright/test';

import { getEvents } from './helpers';
import {
  captureErrors,
  completeReturnFlow,
  expectNoRuntimeErrors,
  waitForEventCount,
} from './journey';

/**
 * Sprint A Phase 4 (lifecycle audit): the two launch-parameter failure
 * paths not covered by the A2 continuity spec (which covers invalid
 * `?scene=`) or the A4 journeys (which cover the fully-parameterised
 * happy path): a bare launch with NO Qualtrics parameters, and a
 * malformed `return_url`. Both behaviours are code-defined
 * (SessionState fallback ids / QualtricsBridge try-catch → null), so
 * asserting them freezes the intended semantics without inventing any.
 */

test.describe('participant lifecycle — launch-parameter failure paths', () => {
  test('bare launch (no params) gets fallback identity and a working session', async ({
    page,
  }) => {
    const capture = captureErrors(page);

    await page.goto('/');
    await waitForEventCount(page, 'scene_start', 'dock', 1);

    const events = await getEvents(page);

    // session_start precedes the first scene_start (append-only order).
    const types = events.map((event) => event.event_type);

    expect(types.indexOf('session_start')).toBe(0);

    // Every event carries ONE stable fallback identity (prefixes from
    // SessionState.createFallbackId) and the default condition.
    const participantIds = new Set(events.map((e) => e.participant_id));
    const sessionIds = new Set(events.map((e) => e.game_session_id));

    expect(participantIds.size).toBe(1);
    expect(sessionIds.size).toBe(1);
    expect([...participantIds][0]).toMatch(/^participant-/);
    expect([...sessionIds][0]).toMatch(/^session-/);

    for (const event of events) {
      expect(event.condition).toBe('default');
    }

    // Return flow degrades gracefully: summary computes, no return URL.
    const { summary, returnUrl } = await completeReturnFlow(page);

    expect(returnUrl).toBeNull();
    expect(summary).toHaveProperty('participant_id', [...participantIds][0]);

    expectNoRuntimeErrors(capture);
  });

  test('malformed return_url yields null return URL without a crash', async ({
    page,
  }) => {
    const capture = captureErrors(page);
    const search = new URLSearchParams({
      participant_id: 'LIFECYCLE_P1',
      game_session_id: 'LIFECYCLE_S1',
      // "http://[" is unparseable even against a base URL, so it exercises
      // QualtricsBridge.buildReturnUrl's catch path.
      return_url: 'http://[',
    });

    await page.goto(`/?${search.toString()}`);
    await waitForEventCount(page, 'scene_start', 'dock', 1);

    const { summary, returnUrl } = await completeReturnFlow(page);

    expect(returnUrl).toBeNull();
    expect(summary).toHaveProperty('participant_id', 'LIFECYCLE_P1');

    expectNoRuntimeErrors(capture);
  });
});
