/**
 * Station 080 M08 — station support console on the participant route
 * (Unit 2 / U2-R, browser). Real navigation from the Dock to the Recovery
 * Yard, real pointer AND keyboard input on the work surface: the console
 * is presented by Noor's briefing, practice (never scored) ends on the
 * interval screen, every slot is reached through its Continue control,
 * six 15-second slots are chosen explicitly (work / stand by), the Leave
 * button pauses a running slot exactly like ESC (no unattended time counts),
 * the slot ends on focused time, the register completes the window, Noor's
 * shift end leaves a closed window untouched, and the exported raw log
 * reproduces the feature row through the read-only extractor. No
 * participant-visible study identifier anywhere. The choice screen is
 * captured at 800×600 as layout evidence (review U2-R F2).
 */
import type { Page } from '@playwright/test';
import { expect, test } from '@playwright/test';

import { extractItemFeatures } from '../src/measurement/features';
import type { RawGameEvent } from '../src/systems/EventLogger';
import {
  APPROACH,
  enterYard,
  eventsByPrefix,
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

async function waitElement(page: Page, id: string, timeout: number) {
  try {
    await page.waitForFunction(
      (wanted) =>
        (
          window as unknown as {
            __workSurfaceProbe?: {
              open: boolean;
              elements: { id: string }[];
            } | null;
          }
        ).__workSurfaceProbe?.elements.some((e) => e.id === wanted) === true,
      id,
      { timeout },
    );
  } catch (error) {
    // Diagnostics for a timed-out wait: what the surface shows and the
    // tail of the M08 family (which slot, which clock state).
    const probe = await surface(page);
    const tail = (await eventsByPrefix(page, 'proto_m08_effort_'))
      .slice(-8)
      .map((e) => `${e.event_type} ${JSON.stringify(e.metadata ?? {})}`);

    // eslint-disable-next-line no-console
    console.log(
      `[m08 waitElement ${id}] surface=${JSON.stringify(probe)}\n${tail.join('\n')}`,
    );
    throw error;
  }
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

async function openConsole(page: Page) {
  await yardVia(
    page,
    YARD.console.x + APPROACH.console.x,
    YARD.console.y + APPROACH.console.y,
  );
  await interactAt(page, YARD.console, { approachOffset: APPROACH.console });
  await waitSurface(page, true, 'm08_support_console');
}

/** Keeps sorting while the work slot runs (until the interval screen). */
async function serveWorkSlot(page: Page) {
  const until = Date.now() + 16_000;

  while (Date.now() < until) {
    const label = await elementLabel(page, 'reading');

    if (label === '') {
      break;
    }

    await sortByRule(page);
    await page.waitForTimeout(400);
  }
}

test.describe('M08 support console on the route', () => {
  test('presented by the briefing, practice, interval screens, six explicit slot choices (pointer and keyboard), leave-button pause, honest closure, reproduced feature', async ({
    page,
  }) => {
    test.setTimeout(600_000);

    const errors = captureErrors(page);

    await enterYard(page, 'm08');
    expect(await itemStatus(page, 'M08')).toBe('pending');
    // Noor's briefing lists the console: presented once, before any entry.
    expect(
      (await eventsByType(page, 'proto_m08_effort_presented')).length,
    ).toBe(1);

    await openConsole(page);

    const opened = await surface(page);

    expect(opened?.title).not.toMatch(FORBIDDEN_TEXT);
    expect(opened?.status).not.toMatch(FORBIDDEN_TEXT);
    expect(await itemStatus(page, 'M08')).toBe('open');

    // Practice: four readings, never scored; ends on the interval screen
    // (no choice is presented until Continue).
    for (let i = 0; i < 4; i += 1) {
      await sortByRule(page);
      await page.waitForTimeout(150);
    }

    expect(
      (await eventsByType(page, 'proto_m08_effort_practice_complete')).length,
    ).toBe(1);
    await waitSlotLabel(page, 'PRACTICE COMPLETE', 5_000);
    await waitElement(page, 'continue', 5_000);
    expect(
      (await eventsByType(page, 'proto_m08_effort_choice_presented')).length,
    ).toBe(0);
    expect(await elementLabel(page, 'choose_work')).toBe('');
    await clickElement(page, 'continue');
    await waitElement(page, 'choose_work', 5_000);
    await waitSlotLabel(page, 'SLOT 1 / 6', 5_000);
    // Layout evidence for the review (F2): the choice screen at 800×600.
    await page.screenshot({ path: 'test-results/m08-choice-800x600.png' });

    // Six slots: work on the 3-unit offers, stand by on the 1-unit offers.
    // Slots 1 and 2 always differ in kind (both orders), so interrupting
    // each with the Leave button mid-slot covers a work slot AND a stand-by
    // slot regardless of the counterbalance; slot 3 is chosen by keyboard
    // (hotkey) and the interval before slot 4 is continued by keyboard.
    for (let slot = 1; slot <= 6; slot += 1) {
      await waitElement(page, 'choose_work', 5_000);
      await waitSlotLabel(page, `SLOT ${slot} / 6`, 5_000);

      const offer = await elementLabel(page, 'offer');
      const threeUnits = /\+3 unit/.test(offer);

      if (slot === 3) {
        await page.keyboard.press(threeUnits ? '1' : '2');
      } else {
        await clickElement(page, threeUnits ? 'choose_work' : 'choose_rest');
      }

      if (slot <= 2) {
        // Leave mid-slot through the BUTTON (not ESC): the slot pauses; the
        // slot must not end while the console is closed, and it must tick
        // on again after the reopen (a stand-by slot has no press to
        // re-render it).
        await page.waitForTimeout(2_000);
        await clickElement(page, 'leave');
        await waitSurface(page, false);
        expect(
          (await eventsByType(page, 'proto_m08_effort_surface_closed')).length,
        ).toBe(slot);
        await page.waitForTimeout(4_000);
        expect(
          (await eventsByType(page, 'proto_m08_effort_epoch_completed')).length,
        ).toBe(slot - 1);
        await openConsole(page);
        expect(
          (await eventsByType(page, 'proto_m08_effort_surface_reopened'))
            .length,
        ).toBe(slot);
      }

      if (threeUnits) {
        await serveWorkSlot(page);
      }

      if (slot < 6) {
        await waitElement(page, 'continue', 30_000);

        if (slot === 3) {
          await page.keyboard.press('c');
        } else {
          await clickElement(page, 'continue');
        }
      } else {
        await waitSlotLabel(page, '6 / 6 SLOTS RECORDED', 30_000);
      }
    }

    const completed = await eventsByType(
      page,
      'proto_m08_effort_epoch_completed',
    );

    expect(completed).toHaveLength(6);

    for (const event of completed) {
      const focused = event.metadata?.focused_ms as number;

      // Each slot ended on its 15 focused seconds (one tick of slack).
      expect(focused).toBeGreaterThanOrEqual(15_000);
      expect(focused).toBeLessThan(15_700);
    }

    // The interrupted slots (one work, one stand-by): wall time carries the
    // closed interval, focused time does not (the Leave button paused the
    // clock).
    for (const epoch of [1, 2]) {
      const interrupted = completed.find((e) => e.metadata?.epoch === epoch)!;

      expect(
        (interrupted.metadata?.wall_ms as number) -
          (interrupted.metadata?.focused_ms as number),
      ).toBeGreaterThanOrEqual(3_500);
    }

    expect(
      new Set(completed.slice(0, 2).map((e) => e.metadata?.kind)).size,
    ).toBe(2);

    // Keyboard and pointer choices both recorded with their input mode.
    const choices = await eventsByType(page, 'proto_m08_effort_choice_made');

    expect(choices).toHaveLength(6);
    expect(choices[2]?.metadata?.input_mode).toBe('keyboard');
    expect(choices[0]?.metadata?.input_mode).toBe('pointer');
    expect(choices[1]?.metadata?.input_mode).toBe('pointer');
    expect(
      (await eventsByType(page, 'proto_m08_effort_interval_continued')).map(
        (e) => e.metadata?.input_mode,
      ),
    ).toEqual([
      'pointer',
      'pointer',
      'pointer',
      'keyboard',
      'pointer',
      'pointer',
    ]);

    const closed = await eventsByType(page, 'proto_m08_effort_window_closed');
    const raw = closed[0]?.metadata?.raw_components as Record<string, unknown>;

    expect(raw.valid_choices).toBe(6);
    expect(raw.work_choices).toBe(3);
    expect(raw.rest_choices).toBe(3);
    expect(raw.served_work_slots).toBe(3);
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

    // Independent reproduction: the raw family alone, through the same
    // read-only extractor an analyst runs offline, yields the feature row.
    const family = (await eventsByPrefix(
      page,
      'proto_m08_effort_',
    )) as unknown as RawGameEvent[];
    const rows = extractItemFeatures('M08', family, {
      finalCoreClosed: false,
      pageLoadIndex: 1,
      reloaded: false,
    });

    expect(rows[0]).toMatchObject({
      feature_id: 'm08_work_choice_fraction',
      value: 3,
      numerator: 3,
      denominator: 6,
      disposition: 'observed',
      closure_reason: 'completed',
      coverage_label: 'exploratory',
      independence: 'repeated_within_episode',
    });
    expect(rows[1].value).toEqual({
      benefit_1: { work: 0, valid: 3 },
      benefit_3: { work: 3, valid: 3 },
    });

    const coverage = await page.evaluate(() =>
      (
        window as unknown as {
          __pilotCoverage?: { items: { item: string; status: string }[] };
        }
      ).__pilotCoverage?.items.find((i) => i.item === 'M08'),
    );

    expect(coverage?.status).toBe('completed');
    expectNoRuntimeErrors(errors);
  });
});
