import { expect, test } from '@playwright/test';

import { getEvents } from './helpers';
import {
  captureErrors,
  completeReturnFlow,
  expectNoRuntimeErrors,
  waitForEventCount,
} from './journey';

/**
 * ADV-6 (Sprint B Part 1, docs/testing/ADVERSARIAL-JOURNEY-PLAN.md):
 * hostile launch/return battery, extending the lifecycle spec's bare-launch
 * and one-malformed-return_url cases. Every assertion pins CODE-DEFINED
 * behaviour (SessionState `??` fallbacks read the FIRST occurrence of a
 * param and only substitute on absence; QualtricsBridge try/catch → null on
 * unparseable URLs) — no new validation semantics are invented. Where
 * current behaviour is surprising but authored (empty-string identity,
 * non-http return schemes surviving), the spec freezes it and the sprint
 * handoff carries the exact user question.
 */

test.describe('adversarial: hostile launch and return parameters', () => {
  test('duplicate, oversized, and url-encoded params resolve deterministically', async ({
    page,
  }) => {
    const capture = captureErrors(page);
    const oversized = 'P'.repeat(2048);

    // Duplicate params: URLSearchParams.get takes the FIRST value.
    // Oversized + encoded values pass through verbatim (no truncation
    // layer exists anywhere in SessionState/QualtricsBridge).
    await page.goto(
      '/?participant_id=ADV6_FIRST&participant_id=ADV6_SECOND' +
        `&game_session_id=${oversized}` +
        '&condition=arm%20with%20spaces%2Bplus',
    );
    await waitForEventCount(page, 'scene_start', 'dock', 1);

    const events = await getEvents(page);

    expect(events.length).toBeGreaterThan(0);

    for (const event of events) {
      expect(event.participant_id).toBe('ADV6_FIRST');
      expect(event.game_session_id).toBe(oversized);
      expect(event.condition).toBe('arm with spaces+plus');
    }

    expectNoRuntimeErrors(capture);
  });

  test('empty-string params pass through verbatim (?? only guards absence)', async ({
    page,
  }) => {
    const capture = captureErrors(page);

    await page.goto('/?participant_id=&game_session_id=&condition=');
    await waitForEventCount(page, 'scene_start', 'dock', 1);

    const events = await getEvents(page);

    // Code-defined: `searchParams.get() ?? fallback` — an empty string is
    // present, so NO fallback id is generated. Frozen as-is; whether empty
    // identities should instead fall back is a user question (handoff).
    for (const event of events) {
      expect(event.participant_id).toBe('');
      expect(event.game_session_id).toBe('');
      expect(event.condition).toBe('');
    }

    const { summary, returnUrl } = await completeReturnFlow(page);

    expect(summary).toHaveProperty('participant_id', '');
    expect(returnUrl).toBeNull(); // no return_url supplied

    expectNoRuntimeErrors(capture);
  });

  test('hostile return_url shapes: relative resolves, unparseable nulls, schemes pass through', async ({
    page,
  }) => {
    const capture = captureErrors(page);

    // Relative return_url resolves against the app origin (new URL with
    // base — code-defined).
    await page.goto(
      '/?participant_id=ADV6_R1&game_session_id=ADV6_RS1&return_url=thanks.html',
    );
    await waitForEventCount(page, 'scene_start', 'dock', 1);

    const relative = await completeReturnFlow(page);

    expect(relative.returnUrl).not.toBeNull();
    expect(relative.returnUrl).toContain('/thanks.html?');
    expect(relative.returnUrl).toContain('participant_id=ADV6_R1');

    // Whitespace-only return_url is treated as absent (trim check).
    await page.goto(
      '/?participant_id=ADV6_R2&game_session_id=ADV6_RS2&return_url=%20%20',
    );
    await waitForEventCount(page, 'scene_start', 'dock', 1);

    const blank = await completeReturnFlow(page);

    expect(blank.returnUrl).toBeNull();

    // Non-http scheme: `new URL('javascript:...')` parses, so the bridge
    // currently returns it with the summary appended. Frozen as-is — the
    // "should buildReturnUrl enforce http(s)?" question is user-owned
    // (QualtricsBridge is a protected module) and recorded in the handoff.
    await page.goto(
      '/?participant_id=ADV6_R3&game_session_id=ADV6_RS3&return_url=javascript:void(0)',
    );
    await waitForEventCount(page, 'scene_start', 'dock', 1);

    const scheme = await completeReturnFlow(page);

    expect(scheme.returnUrl).not.toBeNull();
    expect(scheme.returnUrl).toMatch(/^javascript:/);
    expect(scheme.returnUrl).toContain('participant_id=ADV6_R3');

    expectNoRuntimeErrors(capture);
  });
});
