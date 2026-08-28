/**
 * Pilot route — Utility & Core Deck / Final Core (Unit 7).
 *
 * Real participant navigation over the whole route spine (no developer
 * boots), then:
 *
 * 1. Review + explicit return + terminal closure (unconfigured return):
 *    the console review is participant-safe (counts and reviewable
 *    labels only — no item ids, no scores, no validity words); the
 *    Concourse door and the console's return options work before AND
 *    during confirmation; synchronising closes every scheduled
 *    opportunity with a terminal disposition that is NEVER success
 *    (censored / missing), advances the stage to complete, shows the
 *    neutral completion screen, and performs NO navigation when no
 *    return_url is configured.
 * 2. Configured Qualtrics return: with a legitimately configured
 *    same-origin return_url the completion screen announces the return
 *    and the page navigates to it (summary variables appended) — the
 *    only navigation the pilot ever performs; no external write.
 */
import type { Page } from '@playwright/test';
import { expect, test } from '@playwright/test';

import { getEvents, selectPromptOption } from './helpers';
import {
  captureErrors,
  completeDockTutorial,
  expectNoRuntimeErrors,
} from './journey';
import {
  bootPilot,
  concourseToDeck,
  concourseToLabBriefed,
  concourseToWorkshop,
  dockToConcourse,
  interactAt,
  labToYardBriefed,
  openPromptAt,
  PILOT,
  pilotCoverage,
  pilotEventTypes,
  pilotProbe,
  returnShiftToDeckClosure,
  useDoor,
  valeHandover,
  workshopToConcourse,
  yardReturnToConcourse,
} from './pilotHelpers';

const FORBIDDEN_IDENTIFIERS =
  /proto_|\bM(0[1-9]|1[0-9]|2[0-6])\b|\bQ\d{2}\b|score|trait|valid/i;

interface CompletionProbeLike {
  confirming: boolean;
  closed: boolean;
  return_url_configured: boolean;
  navigate_scheduled: boolean;
  closure_counts: {
    censored: number;
    absent: number;
    no_opportunity: number;
    errors: number;
  } | null;
  summary: { scheduled: number; closed: number; open: number } | null;
}

async function completionProbe(
  page: Page,
): Promise<CompletionProbeLike | null> {
  return page.evaluate(
    () =>
      (
        window as unknown as {
          __pilotCompletionProbe?: CompletionProbeLike | null;
        }
      ).__pilotCompletionProbe ?? null,
  );
}

async function lastPromptBody(page: Page): Promise<string> {
  return page.evaluate(
    () =>
      (window as unknown as { __lastPromptBody?: string | null })
        .__lastPromptBody ?? '',
  );
}

/**
 * The full route spine to the deck: Dock → Concourse (Vale ×2) → Lab
 * (Kai ×2) → Yard (Noor briefing, then "I am done outside") → Lab
 * (Kai report) → Concourse (Vale report) → Deck. Fail-forward
 * throughout — no measurement work is required to reach the core.
 */
async function routeToDeck(
  page: Page,
  tag: string,
  options?: { extra?: string; touchFilingDesk?: boolean },
) {
  await bootPilot(page, tag, { extra: options?.extra });
  await completeDockTutorial(page, 1);
  await dockToConcourse(page);
  await valeHandover(page);
  await concourseToWorkshop(page);
  await openPromptAt(page, PILOT.workshop.board, {
    approachOffset: { x: 0, y: 44 },
  });
  await selectPromptOption(page, 1); // take the orders -> workshop_work

  if (options?.touchFilingDesk === true) {
    // Enter the M02 filing window and abandon it (entered, unfinished)
    // so the Final Core closure has a genuine CENSORED case to code.
    // (Space presses are retried - SwiftShader input-loss precedent.)
    let overlayOpen = false;

    for (let attempt = 0; attempt < 3 && !overlayOpen; attempt++) {
      await interactAt(page, PILOT.workshop.filingDesk, {
        approachOffset: { x: 0, y: 44 },
      });
      overlayOpen = await page
        .waitForFunction(
          () =>
            (
              window as unknown as {
                __inventoryUiProbe?: { open: boolean } | null;
              }
            ).__inventoryUiProbe?.open === true,
          undefined,
          { timeout: 4000 },
        )
        .then(
          () => true,
          () => false,
        );
    }

    expect(overlayOpen).toBe(true);
    await page.keyboard.press('Escape');
    await page.waitForFunction(
      () =>
        (
          window as unknown as {
            __inventoryUiProbe?: { open: boolean } | null;
          }
        ).__inventoryUiProbe?.open !== true,
      undefined,
      { timeout: 8000 },
    );
  }

  await openPromptAt(page, PILOT.workshop.board, {
    approachOffset: { x: 0, y: 44 },
  });
  await selectPromptOption(page, 1); // sign off -> lab_briefing
  await workshopToConcourse(page);
  await concourseToLabBriefed(page);
  await labToYardBriefed(page);
  await yardReturnToConcourse(page); // Noor "done outside" -> return_hub
  await returnShiftToDeckClosure(page); // Vale -> workshop board -> deck_closure
  await concourseToDeck(page);

  expect((await pilotProbe(page))?.stage).toBe('deck_closure');
}

async function openConsole(page: Page) {
  await openPromptAt(page, PILOT.deck.coreConsole, {
    approachOffset: { x: 0, y: 44 },
    yFirst: false,
  });
}

test.describe('pilot route — Utility & Core Deck / Final Core (Unit 7)', () => {
  test('review, explicit return, terminal closure without success, neutral completion, no navigation unconfigured', async ({
    page,
  }) => {
    test.setTimeout(720_000);

    const errors = captureErrors(page);

    await routeToDeck(page, 'core', { touchFilingDesk: true });

    // Review body: participant-safe counts + reviewable labels only.
    await openConsole(page);

    const review = await lastPromptBody(page);

    expect(review).toContain('Scheduled station tasks: 13');
    expect(review).toContain('Still open:');
    expect(review).not.toMatch(FORBIDDEN_IDENTIFIERS);

    // Explicit return from the review; the door is genuinely open.
    await selectPromptOption(page, 2);
    await useDoor(page, PILOT.deck.westDoor, 'station_concourse', {
      approachOffset: { x: 40, y: 0 },
      yFirst: true,
    });
    await useDoor(page, PILOT.concourse.eastDoor, 'utility_core_deck', {
      approachOffset: { x: -40, y: 0 },
      yFirst: true,
    });

    // Begin → confirm body → decline → review again (no entrapment).
    await openConsole(page);
    await selectPromptOption(page, 1);
    await page.waitForTimeout(400);
    await openConsole(page);
    expect(await lastPromptBody(page)).toContain('CONFIRM SYNCHRONISATION');
    await selectPromptOption(page, 2); // Not yet
    await page.waitForTimeout(400);
    await openConsole(page);
    expect(await lastPromptBody(page)).toContain('end-of-shift review');

    // Begin → confirm — the one and only closure.
    await selectPromptOption(page, 1);
    await page.waitForTimeout(400);
    await openConsole(page);
    await selectPromptOption(page, 1);
    await page.waitForFunction(
      () =>
        (
          window as unknown as {
            __pilotCompletionProbe?: { closed: boolean } | null;
          }
        ).__pilotCompletionProbe?.closed === true,
      undefined,
      { timeout: 10_000 },
    );

    const probe = await completionProbe(page);

    expect(probe?.return_url_configured).toBe(false);
    expect(probe?.navigate_scheduled).toBe(false);
    expect(probe?.summary?.scheduled).toBe(13);
    expect(probe?.summary?.open).toBe(0);
    expect(probe?.closure_counts?.errors).toBe(0);

    // Terminal dispositions are NEVER success: the abandoned filing
    // window is censored; everything untouched is missing — and no
    // opportunity was promoted to completed by the closure.
    const coverage = await pilotCoverage(page);

    // All 26 items stay distinguishable: 13 scheduled primary
    // candidates close as censored/missing; the questionnaire-primary
    // and missing items keep their honest not_applicable rows — never
    // converted, never faked, never blocking.
    expect(coverage?.final_core_closed).toBe(true);
    expect(coverage?.items).toHaveLength(26);

    for (const item of coverage?.items ?? []) {
      if (item.disposition === 'PRIMARY-CANDIDATE') {
        expect(['censored', 'missing']).toContain(item.status);
      } else {
        expect(['QUESTIONNAIRE-PRIMARY', 'MISSING']).toContain(
          item.disposition,
        );
        expect(item.status).toBe('not_applicable');
      }
    }

    const m02 = coverage?.items.find((item) => item.item === 'M02');

    expect(m02?.status).toBe('censored');

    // Stage complete; the synchronisation event exists; no navigation.
    expect((await pilotProbe(page))?.stage).toBe('complete');
    expect(await pilotEventTypes(page)).toContain(
      'pilot_final_core_synchronised',
    );
    expect(page.url()).not.toContain('pilot_return');

    // No participant-visible identifiers anywhere in the console flow.
    const consoleEvents = (await getEvents(page)).filter((event) =>
      event.event_type.startsWith('pilot_final_core'),
    );

    expect(consoleEvents.length).toBeGreaterThanOrEqual(3);
    expectNoRuntimeErrors(errors);
  });

  test('configured same-origin return_url: completion navigates with summary variables appended', async ({
    page,
  }) => {
    test.setTimeout(600_000);

    const errors = captureErrors(page);
    const returnUrl = encodeURIComponent('/?pilot_return=1');

    await routeToDeck(page, 'ret', {
      extra: `&return_url=${returnUrl}`,
    });

    await openConsole(page);
    await selectPromptOption(page, 1); // Begin
    await page.waitForTimeout(400);
    await openConsole(page);
    await selectPromptOption(page, 1); // Confirm
    await page.waitForFunction(
      () =>
        (
          window as unknown as {
            __pilotCompletionProbe?: { closed: boolean } | null;
          }
        ).__pilotCompletionProbe?.closed === true,
      undefined,
      { timeout: 10_000 },
    );

    const probe = await completionProbe(page);

    expect(probe?.return_url_configured).toBe(true);
    expect(probe?.navigate_scheduled).toBe(true);

    // The ONLY navigation the pilot performs: the configured return,
    // same-origin here so the test writes nothing externally.
    await page.waitForURL(/pilot_return=1/, { timeout: 15_000 });
    expect(page.url()).toContain('pilot_return=1');
    expect(page.url()).toContain('completed=true');
    expect(page.url()).toContain('participant_id=');
    expectNoRuntimeErrors(errors);
  });
});
