/**
 * Pilot route — Utility Deck record closure boundaries (evidence-led pilot
 * v2, Unit 6; supersedes the Unit 7 "Final Core" console tests).
 *
 * Real participant navigation over the whole route spine (no developer
 * boot), then:
 *
 * 1. Terminal closure without success + NO navigation even when a
 *    same-origin `return_url` is configured: the Shift Review Panel's
 *    two-step closure records every scheduled opportunity with a terminal
 *    disposition that is NEVER success (the abandoned filing window is
 *    censored; everything untouched is missing; the questionnaire-primary
 *    items keep their honest rows), the review copy is participant-safe
 *    (no item ids, scores, validity words), and the page performs NO
 *    Qualtrics return in this unit — the redirect is a future unit — nor
 *    calls the runtime's debug completion (`objective_completed`).
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
  pilotProbe,
  registryApproach,
  returnShiftToDeckClosure,
  useDoor,
  valeHandover,
  workshopToConcourse,
  workshopVia,
  yardReturnToConcourse,
} from './pilotHelpers';

const FORBIDDEN_IDENTIFIERS =
  /proto_|\bM(0[1-9]|1[0-9]|2[0-6])\b|\bQ\d{2}\b|score|trait|valid/i;

/** Concourse plan board approach (World V1 registry). */
const CONCOURSE_PLAN_BOARD = registryApproach('concourse.plan_board');

async function lastPromptBody(page: Page): Promise<string> {
  return page.evaluate(
    () =>
      (window as unknown as { __lastPromptBody?: string | null })
        .__lastPromptBody ?? '',
  );
}

async function closureProbe(page: Page) {
  return page.evaluate(
    () =>
      (
        window as unknown as {
          __closureProbe?: {
            record_closed: boolean;
            review_armed: boolean;
            readiness: { ready: boolean; counts: Record<string, number> };
            context: Record<string, unknown>;
          } | null;
        }
      ).__closureProbe ?? null,
  );
}

/**
 * The full route spine to the deck: Dock → Concourse (Vale ×2) → Lab
 * (Kai ×2) → Yard (Noor briefing, then "I am done outside") → Lab
 * (Kai report) → Concourse (Vale report) → Deck. Fail-forward
 * throughout — no measurement work is required to reach the deck.
 */
async function routeToDeck(
  page: Page,
  tag: string,
  options?: { extra?: string; touchPlanBoard?: boolean },
) {
  await bootPilot(page, tag, { extra: options?.extra });
  await completeDockTutorial(page, 1);
  await dockToConcourse(page);
  await valeHandover(page);

  if (options?.touchPlanBoard === true) {
    // Enter the M01 plan-board window and leave it unfinished (entered,
    // never submitted) so the record closure has a genuine CENSORED case
    // to code. (The former M02 filing-desk driver step is the deferred
    // Unit 2 overlay finding — final verification unit.)
    let surfaceOpen = false;

    for (let attempt = 0; attempt < 3 && !surfaceOpen; attempt++) {
      await interactAt(page, CONCOURSE_PLAN_BOARD, {
        approachOffset: { x: 0, y: 0 },
      });
      surfaceOpen = await page
        .waitForFunction(
          () =>
            (
              window as unknown as {
                __workSurfaceProbe?: {
                  open: boolean;
                  surface_id: string | null;
                } | null;
              }
            ).__workSurfaceProbe?.open === true,
          undefined,
          { timeout: 4000 },
        )
        .then(
          () => true,
          () => false,
        );
    }

    expect(surfaceOpen).toBe(true);
    await page.keyboard.press('Escape');
    await page.waitForFunction(
      () =>
        (
          window as unknown as {
            __workSurfaceProbe?: { open: boolean } | null;
          }
        ).__workSurfaceProbe?.open !== true,
      undefined,
      { timeout: 8000 },
    );
    await page.waitForTimeout(300);
  }

  await concourseToWorkshop(page);
  await workshopVia(page, 1312, 178);
  await openPromptAt(page, PILOT.workshop.board, {
    approachOffset: { x: -32, y: 38 },
  });
  await selectPromptOption(page, 1); // take the orders -> workshop_work
  await openPromptAt(page, PILOT.workshop.board, {
    approachOffset: { x: -32, y: 38 },
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

async function openPanel(page: Page) {
  await openPromptAt(page, PILOT.deck.reviewPanel, {
    approachOffset: { x: 0, y: 44 },
    yFirst: false,
  });
}

test.describe('pilot route — Utility Deck record closure (Unit 6)', () => {
  test('review, explicit return, terminal closure without success, and NO navigation even with a configured return_url', async ({
    page,
  }) => {
    test.setTimeout(720_000);

    const errors = captureErrors(page);
    const returnUrl = encodeURIComponent('/?pilot_return=1');

    await routeToDeck(page, 'core', {
      touchPlanBoard: true,
      extra: `&return_url=${returnUrl}`,
    });

    // Review body: participant-safe counts + reviewable labels only.
    await openPanel(page);

    const review = await lastPromptBody(page);

    expect(review).toContain('Scheduled station tasks: 24');
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

    // Arm → confirm body → decline → review again (no entrapment).
    await openPanel(page);
    await selectPromptOption(page, 1);
    await page.waitForTimeout(400);
    expect((await closureProbe(page))?.review_armed).toBe(true);
    await openPanel(page);
    expect(await lastPromptBody(page)).toContain('CONFIRM RECORD CLOSURE');
    await selectPromptOption(page, 2); // Not yet
    await page.waitForTimeout(400);
    expect((await closureProbe(page))?.review_armed).toBe(false);
    await openPanel(page);
    expect(await lastPromptBody(page)).toContain('end-of-shift review');

    // Arm → confirm — the one and only closure.
    await selectPromptOption(page, 1);
    await page.waitForTimeout(400);
    await openPanel(page);
    await selectPromptOption(page, 1);
    await page.waitForFunction(
      () =>
        (
          window as unknown as {
            __closureProbe?: { record_closed: boolean } | null;
          }
        ).__closureProbe?.record_closed === true,
      undefined,
      { timeout: 10_000 },
    );

    const probe = (await closureProbe(page))!;

    expect(probe.readiness.ready).toBe(true);
    expect(probe.readiness.counts.open + probe.readiness.counts.pending).toBe(
      0,
    );
    expect(probe.context).toMatchObject({
      research_record_closed: true,
      gameplay_route_closed: false,
      qualtrics_completion_performed: false,
    });

    // Terminal dispositions are NEVER success: the abandoned plan-board
    // window is censored; everything untouched is missing — and no
    // opportunity was promoted to completed by the closure.
    const coverage = await pilotCoverage(page);

    expect(coverage?.final_core_closed).toBe(true);
    expect(coverage?.items).toHaveLength(26);

    for (const item of coverage?.items ?? []) {
      if (item.disposition === 'PRIMARY-CANDIDATE') {
        expect(['censored', 'missing', 'completed']).toContain(item.status);
      } else if (item.item === 'M25') {
        // The questionnaire-primary presentation window closes as a
        // presentation record only; the response stays external.
        expect(['missing', 'completed']).toContain(item.status);
      } else {
        expect(['QUESTIONNAIRE-PRIMARY', 'MISSING']).toContain(
          item.disposition,
        );
        expect(item.status).toBe('not_applicable');
      }
    }

    // Only the obligation/observation closures may read "completed" here
    // (M09 / M10 review dispositions are observations, never task
    // success); the abandoned filing window is censored.
    const promoted = (coverage?.items ?? []).filter(
      (item) =>
        item.disposition === 'PRIMARY-CANDIDATE' && item.status === 'completed',
    );

    // Only review-observation windows may read completed here: M05 (fault
    // not reported), M07 end, M09 check, M10 unfulfilled, M20 not resumed.
    expect(
      promoted.every((item) =>
        ['M05', 'M07', 'M09', 'M10', 'M20'].includes(item.item),
      ),
      `promoted: ${promoted.map((item) => item.item).join(',')}`,
    ).toBe(true);
    expect(coverage?.items.find((item) => item.item === 'M01')?.status).toBe(
      'censored',
    );

    // Stage advances to the feeds (the route is NOT complete yet).
    expect((await pilotProbe(page))?.stage).toBe('core_stabilise');

    // No navigation, no runtime debug completion, no legacy Final Core
    // events — the Qualtrics return is a future unit.
    await page.waitForTimeout(3000);
    // Still the launch URL (the encoded return_url parameter included);
    // never the navigated survey URL with the appended summary fields.
    expect(page.url()).toContain('return_url=');
    expect(page.url()).not.toContain('completed=true');
    expect(new URL(page.url()).searchParams.get('pilot_return')).toBeNull();

    const types = (await getEvents(page)).map((event) => event.event_type);

    expect(types).toContain('pilot_closure_record_closed');
    expect(types).not.toContain('objective_completed');
    expect(types.some((type) => type.startsWith('pilot_final_core'))).toBe(
      false,
    );
    expectNoRuntimeErrors(errors);
  });
});
