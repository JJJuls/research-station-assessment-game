import { expect, test } from '@playwright/test';

import { bootGame, getEvents } from './helpers';

/**
 * V3 §9 / smoke-plan spec 1: Qualtrics launch parameters are parsed and
 * reflected; the debug API surface works; the raw log is append-only.
 */
test.describe('launch with research params', () => {
  test('parses the five launch params and reflects them in every event', async ({
    page,
  }) => {
    await bootGame(page, {
      participant_id: 'E2E_P1',
      game_session_id: 'E2E_LAUNCH_S1',
      condition: 'pilot',
      game_version: 'e2e',
      return_url: 'https://example.org/return?study=ro',
    });

    const events = await getEvents(page);

    expect(events.length).toBeGreaterThanOrEqual(4);
    expect(events.map((e) => e.event_type).slice(0, 4)).toEqual([
      'session_start',
      'scene_start',
      'dock_started',
      'movement_instruction_shown',
    ]);

    for (const event of events) {
      expect(event.participant_id).toBe('E2E_P1');
      expect(event.game_session_id).toBe('E2E_LAUNCH_S1');
      expect(event.session_id).toBe('E2E_LAUNCH_S1');
      expect(event.condition).toBe('pilot');
      expect(event.game_version).toBe('e2e');
    }
  });

  test('debug API surface works and completeDebugSession preserves the return URL', async ({
    page,
  }) => {
    await bootGame(page, {
      participant_id: 'E2E_P1',
      game_session_id: 'E2E_LAUNCH_S2',
      condition: 'pilot',
      game_version: 'e2e',
      return_url: 'https://example.org/return?study=ro',
    });

    const result = await page.evaluate(() => {
      const rr = (
        window as unknown as {
          researchRuntime: {
            getEvents: () => unknown[];
            exportEventsJSON: () => string;
            printSummary: () => void;
            printEvents: () => void;
            getSummary: () => Record<string, unknown>;
            completeDebugSession: () => {
              summary: Record<string, unknown>;
              returnUrl: string | null;
            };
          };
        }
      ).researchRuntime;

      const surface = Object.keys(rr).sort();
      const exported = JSON.parse(rr.exportEventsJSON()) as unknown[];
      const before = rr.getEvents().length;

      rr.printSummary();
      rr.printEvents();

      const completion = rr.completeDebugSession();
      const after = rr.getEvents().length;

      return {
        surface,
        exportedLength: exported.length,
        before,
        after,
        returnUrl: completion.returnUrl,
        summaryHasSeparatedVars:
          'game_inappropriate_persistence' in completion.summary &&
          'game_difficulty_persistence' in completion.summary &&
          'strategy_revision_count' in completion.summary,
      };
    });

    // Baseline six methods plus getMissionState (Wave 1B additive,
    // read-only mission-state probe) plus getLastExportResult /
    // submitSessionExport (test-only ingestion unit, additive dev-only
    // export surface; baseline-e8a8994's 6-method surface is a minimum,
    // extended deliberately for runtime verification).
    expect(result.surface).toEqual([
      'completeDebugSession',
      'exportEventsJSON',
      'getEvents',
      'getLastExportResult',
      'getMissionState',
      'getSummary',
      'printEvents',
      'printSummary',
      'submitSessionExport',
    ]);
    expect(result.exportedLength).toBe(result.before);
    // Append-only: completing a session adds events, never removes.
    expect(result.after).toBeGreaterThan(result.before);
    // Return URL preserved with original query params intact, summary
    // variables appended.
    expect(result.returnUrl).toContain('https://example.org/return?study=ro');
    expect(result.returnUrl).toContain('participant_id=E2E_P1');
    expect(result.returnUrl).toContain('game_inappropriate_persistence=');
    expect(result.summaryHasSeparatedVars).toBe(true);
  });

  test('missing params fall back to generated ids without crashing', async ({
    page,
  }) => {
    await page.goto('/');
    await page.waitForFunction(
      () =>
        (
          window as unknown as {
            researchRuntime?: { getEvents: () => unknown[] };
          }
        ).researchRuntime !== undefined &&
        (
          window as unknown as {
            researchRuntime: { getEvents: () => unknown[] };
          }
        ).researchRuntime.getEvents().length >= 4,
      undefined,
      { timeout: 30_000 },
    );

    const first = (await getEvents(page))[0];

    expect(typeof first.participant_id).toBe('string');
    expect((first.participant_id as string).length).toBeGreaterThan(0);
    expect(first.condition).toBe('default');
  });
});
