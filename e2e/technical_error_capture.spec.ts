import type { Page } from '@playwright/test';
import { expect, test } from '@playwright/test';

import { bootGame, getEvents, getSummary } from './helpers';

/**
 * Unit 2 (gap-audit P2-13): global technical-error capture. Uncaught window
 * errors and unhandled promise rejections must increment the
 * `data_quality_technical_error_count` covariate exactly once each — count
 * only, no error content, no new raw events, no change to the debug surface.
 */

/** Polls the debug summary until the covariate reaches `minimum`. */
function waitForTechnicalErrorCount(page: Page, minimum: number) {
  return page.waitForFunction(
    (n) =>
      ((
        window as unknown as {
          researchRuntime: {
            getSummary: () => { data_quality_technical_error_count: number };
          };
        }
      ).researchRuntime.getSummary().data_quality_technical_error_count ?? 0) >=
      n,
    minimum,
    { timeout: 10_000 },
  );
}

async function technicalErrorCount(page: Page): Promise<number> {
  return (await getSummary(page)).data_quality_technical_error_count as number;
}

test.describe('technical error capture', () => {
  test('uncaught errors and unhandled rejections each count exactly once, without touching the raw log', async ({
    page,
  }) => {
    await bootGame(page, {
      participant_id: 'E2E_TE_P1',
      game_session_id: 'E2E_TECH_S1',
      condition: 'pilot',
      game_version: 'e2e',
    });

    // A clean boot records no technical errors.
    expect(await technicalErrorCount(page)).toBe(0);

    const summaryKeysBefore = Object.keys(await getSummary(page)).sort();
    const eventsBefore = (await getEvents(page)).length;

    // 1. Genuine uncaught error (setTimeout escapes the evaluate call stack,
    // so the throw reaches the window as a real uncaught error).
    await page.evaluate(() => {
      setTimeout(() => {
        throw new Error('E2E synthetic uncaught error');
      }, 0);
    });
    await waitForTechnicalErrorCount(page, 1);
    expect(await technicalErrorCount(page)).toBe(1);

    // 2. Unhandled rejection carrying an Error.
    await page.evaluate(() => {
      void Promise.reject(new Error('E2E synthetic rejection'));
    });
    await waitForTechnicalErrorCount(page, 2);
    expect(await technicalErrorCount(page)).toBe(2);

    // 3. Unhandled rejection carrying a plain string (non-Error value).
    await page.evaluate(() => {
      void Promise.reject('E2E string rejection');
    });
    await waitForTechnicalErrorCount(page, 3);
    expect(await technicalErrorCount(page)).toBe(3);

    // 4. Unhandled rejection carrying undefined — the reporting path must
    // not itself throw on a valueless reason (a throw inside the handler
    // would surface as a further uncaught error and break the exact count).
    await page.evaluate(() => {
      void Promise.reject(undefined);
    });
    await waitForTechnicalErrorCount(page, 4);

    // Settle, then pin the EXACT total: any duplicated handler, cascading
    // handler failure, or double-count would push this past 4.
    await page.waitForTimeout(500);
    expect(await technicalErrorCount(page)).toBe(4);

    // Covariate only: the append-only raw event log gained nothing, and the
    // summary shape is unchanged (no new taxonomy fields).
    expect((await getEvents(page)).length).toBe(eventsBefore);
    expect(Object.keys(await getSummary(page)).sort()).toEqual(
      summaryKeysBefore,
    );
  });

  test('re-running start() does not re-register handlers or double-count', async ({
    page,
  }) => {
    await bootGame(page, {
      participant_id: 'E2E_TE_P2',
      game_session_id: 'E2E_TECH_S2',
      condition: 'pilot',
      game_version: 'e2e',
    });

    const result = await page.evaluate(async () => {
      // Vite dev serves the app's own module graph; importing the systems
      // barrel by URL yields the SAME live researchRuntime singleton the
      // game booted with (verified below via the session id).
      const modulePath = '/src/systems/index.ts';
      const mod = (await import(modulePath)) as {
        researchRuntime: {
          start: () => void;
          getEvents: () => { game_session_id?: string }[];
          dataQualityTracker: {
            start: () => void;
            getMetrics: () => { technical_error_count: number };
          };
        };
      };
      const rr = mod.researchRuntime;
      const sameInstance = rr.getEvents()[0]?.game_session_id === 'E2E_TECH_S2';
      const eventsBefore = rr.getEvents().length;

      // Duplicate registration attempts: both lifecycle guards must no-op.
      rr.start();
      rr.dataQualityTracker.start();

      const eventsAfterRestart = rr.getEvents().length;

      // Synchronous synthetic dispatch: with a single registered handler
      // this increments the counter exactly once.
      window.dispatchEvent(new ErrorEvent('error', { message: 'e2e' }));

      return {
        sameInstance,
        eventsBefore,
        eventsAfterRestart,
        count: rr.dataQualityTracker.getMetrics().technical_error_count,
      };
    });

    expect(result.sameInstance).toBe(true);
    // Re-running ResearchRuntime.start() logged no second session_start.
    expect(result.eventsAfterRestart).toBe(result.eventsBefore);
    // One dispatched error event -> exactly one record.
    expect(result.count).toBe(1);
  });
});
