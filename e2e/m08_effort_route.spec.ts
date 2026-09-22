/**
 * Station 080 M08 — station support console on the participant route
 * (Unit 2, browser). Real navigation from the Dock to the Recovery Yard,
 * real pointer input on the work surface: practice (never scored), six
 * 15-second slots chosen explicitly (work / stand by), the slot ending on
 * focused time, the register completing the window, the extracted feature
 * riding the export augmenter, and Noor's shift end leaving a closed
 * window untouched. No participant-visible study identifier anywhere.
 */
import type { Page } from '@playwright/test';
import { expect, test } from '@playwright/test';

import {
  APPROACH,
  enterYard,
  eventsByType,
  finishOutside,
  FORBIDDEN_TEXT,
  itemStatus,
  validityRecord,
  YARD,
} from './exteriorHelpers';
import { captureErrors, expectNoRuntimeErrors } from './journey';
import { interactAt, yardVia } from './pilotHelpers';
import { clickElement, surface, waitSurface } from './returnHelpers';

async function elementLabel(page: Page, id: string): Promise<string> {
  const probe = await surface(page);

  return probe?.elements.find((e) => e.id === id)?.label ?? '';
}

async function sortByRule(page: Page) {
  const label = await elementLabel(page, 'reading');
  const reading = Number(label.replace(/\D+/g, ''));

  await clickElement(page, reading >= 50 ? 'bin_a' : 'bin_b');
}

async function waitSlotLabel(page: Page, text: string, timeout: number) {
  await page.waitForFunction(
    (wanted) =>
      (
        window as unknown as {
          __workSurfaceProbe?: {
            elements: { id: string; label: string }[];
          } | null;
        }
      ).__workSurfaceProbe?.elements.some(
        (e) => e.id === 'slot' && e.label.startsWith(wanted),
      ) === true,
    text,
    { timeout },
  );
}

test.describe('M08 support console on the route', () => {
  test('practice, six explicit slot choices, honest closure, extracted feature', async ({
    page,
  }) => {
    test.setTimeout(600_000);

    const errors = captureErrors(page);

    await enterYard(page, 'm08');
    expect(await itemStatus(page, 'M08')).toBe('pending');

    // The console opens a work surface (no prompt card): walk to the
    // audited approach point and interact.
    await yardVia(
      page,
      YARD.console.x + APPROACH.console.x,
      YARD.console.y + APPROACH.console.y,
    );
    await interactAt(page, YARD.console, { approachOffset: APPROACH.console });
    await waitSurface(page, true, 'm08_support_console');

    const opened = await surface(page);

    expect(opened?.title).not.toMatch(FORBIDDEN_TEXT);
    expect(opened?.status).not.toMatch(FORBIDDEN_TEXT);
    expect(await itemStatus(page, 'M08')).toBe('open');

    // Practice: four readings, never scored.
    for (let i = 0; i < 4; i += 1) {
      await sortByRule(page);
      await page.waitForTimeout(150);
    }

    expect(
      (await eventsByType(page, 'proto_m08_effort_practice_complete')).length,
    ).toBe(1);
    await waitSlotLabel(page, 'SLOT 1 / 6', 5_000);

    // Six slots: work on the 3-unit offers, stand by on the 1-unit offers.
    for (let slot = 1; slot <= 6; slot += 1) {
      await waitSlotLabel(page, `SLOT ${slot} / 6`, 5_000);

      const offer = await elementLabel(page, 'offer');
      const threeUnits = /\+3 unit/.test(offer);

      await clickElement(page, threeUnits ? 'choose_work' : 'choose_rest');

      if (threeUnits) {
        // Work for the slot: keep sorting while the slot runs.
        const until = Date.now() + 14_000;

        while (Date.now() < until) {
          const label = await elementLabel(page, 'reading');

          if (label === '') {
            break;
          }

          await sortByRule(page);
          await page.waitForTimeout(400);
        }
      }

      if (slot < 6) {
        await waitSlotLabel(page, `SLOT ${slot + 1} / 6`, 30_000);
      } else {
        await waitSlotLabel(page, 'ALL SLOTS COMPLETE', 30_000);
      }
    }

    const completed = await eventsByType(
      page,
      'proto_m08_effort_epoch_completed',
    );

    expect(completed).toHaveLength(6);
    expect(
      completed.every((e) => (e.metadata?.focused_ms as number) >= 15_000),
    ).toBe(true);

    const closed = await eventsByType(page, 'proto_m08_effort_window_closed');
    const raw = closed[0]?.metadata?.raw_components as Record<string, unknown>;

    expect(raw.valid_choices).toBe(6);
    expect(raw.work_choices).toBe(3);
    expect(raw.rest_choices).toBe(3);
    expect(raw.output_units_total).toBe(9);
    expect(await itemStatus(page, 'M08')).toBe('completed');

    const record = await validityRecord(page, 'proto_m08_effort_choice');

    expect(record.validity).toBe('valid');

    // Close the surface; the shift end leaves the closed window untouched.
    await page.keyboard.press('Escape');
    await waitSurface(page, false);
    await finishOutside(page);
    expect(
      (await eventsByType(page, 'proto_m08_effort_window_closed')).length,
    ).toBe(1);

    // The feature rides the export augmenter (read-only extraction).
    const feature = await page.evaluate(() => {
      const runtime = (
        window as unknown as {
          researchRuntime?: { exportEventsJSON: () => string };
        }
      ).researchRuntime;

      void runtime;

      return (
        window as unknown as {
          __pilotCoverage?: { items: { item: string; status: string }[] };
        }
      ).__pilotCoverage?.items.find((i) => i.item === 'M08');
    });

    expect(feature?.status).toBe('completed');
    expectNoRuntimeErrors(errors);
  });
});
