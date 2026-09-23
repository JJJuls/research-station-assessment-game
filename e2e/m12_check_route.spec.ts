/**
 * Station 080 M12 — two quality packets on the participant route (Unit 8,
 * browser). Real navigation from the Dock through the Concourse to the
 * Records Workshop, real pointer AND keyboard input on both packets.
 *
 * Packet 1 (storm delivery manifest, Concourse): Vale's briefing presents
 * it; every field is checked (pointer and the digit hotkeys), its
 * reference is hidden until checked, every checked field is judged
 * (Matches by keyboard, Differs by pointer or keyboard), the faulty field
 * is corrected with a value typed on the keypad and confirmed, the packet
 * is released by keyboard — a 3/3 observation with the fault detected and
 * corrected.
 *
 * Packet 2 (calibration tag sheet, Workshop): the Work Order Board presents
 * it; Leave by pointer keeps the packet open (no observation yet, the
 * same path as ESC); it is released unchecked by pointer — a valid
 * observed 0/3, never a missing value. Focus never lands on a judgement
 * control (ENTER after a Check re-reads the reference), the keypad's 0 is
 * a hotkey, and ENTER confirms once the entry is full.
 *
 * The raw family reproduces the row (3/6, `incomplete` never arises here
 * because both products were released) through the read-only extractor.
 * No participant-visible study identifier anywhere.
 */
import type { Page } from '@playwright/test';
import { expect, test } from '@playwright/test';

import { extractItemFeatures } from '../src/measurement/features';
import { M12_PRODUCTS } from '../src/pilot/windows/m12CheckModel';
import type { RawGameEvent } from '../src/systems/EventLogger';
import {
  eventsByPrefix,
  eventsByType,
  FORBIDDEN_TEXT,
  itemStatus,
  validityRecord,
} from './exteriorHelpers';
import { press, selectPromptOption } from './helpers';
import {
  captureErrors,
  completeDockTutorial,
  expectNoRuntimeErrors,
} from './journey';
import {
  bootPilot,
  concourseToWorkshop,
  dockToConcourse,
  expectStage,
  interactAt,
  openPromptAt,
  PILOT,
  registryApproach,
  valeHandover,
  walkTo,
  workshopVia,
} from './pilotHelpers';
import { clickElement, surface, waitSurface } from './returnHelpers';

const PACKET_1 = registryApproach('concourse.qc_packet_o1');
const PACKET_2 = registryApproach('workshop.qc_packet_o2');

async function countType(page: Page, type: string) {
  return (await eventsByType(page, type)).length;
}

async function waitType(
  page: Page,
  type: string,
  wanted: number,
  timeout: number,
) {
  const until = Date.now() + timeout;

  while (Date.now() < until) {
    if ((await countType(page, type)) >= wanted) {
      return;
    }

    await page.waitForTimeout(200);
  }

  throw new Error(
    `timed out waiting for ${wanted} × ${type} (have ${await countType(page, type)})`,
  );
}

async function elementLabel(page: Page, id: string): Promise<string> {
  const probe = await surface(page);

  return probe?.elements.find((e) => e.id === id)?.label ?? '';
}

/** Driver evidence when a surface did not open (episode-spec precedent). */
async function expectSurface(page: Page, id: string) {
  const opened = await waitSurface(page, true, id).then(
    () => true,
    () => false,
  );

  if (opened) {
    return;
  }

  const observed = await page.evaluate(() => {
    const w = window as unknown as {
      __playerProbe?: { x: number; y: number } | null;
      __worldPromptProbe?: { prompt: boolean; text?: string | null } | null;
      __lastRoomFeedbackText?: string | null;
      __workSurfaceProbe?: { open: boolean; surface_id: string | null } | null;
      __promptCards?: { label: string }[] | null;
    };

    return JSON.stringify({
      at: w.__playerProbe ?? null,
      prompt: w.__worldPromptProbe ?? null,
      feedback: w.__lastRoomFeedbackText ?? null,
      surface: w.__workSurfaceProbe ?? null,
      cards: w.__promptCards?.map((card) => card.label) ?? null,
    });
  });

  throw new Error(`surface ${id} did not open (observed ${observed})`);
}

/**
 * The packet lies on the north-east work table, north of Vale's operations
 * desk, and its approach point sits inside Vale's 72 px radius too: a
 * landing a few px south-west (observed 413,150 for 424,140) makes Vale
 * the nearest interactable and Space opens her beat. Driver only: from
 * Vale go west into the open hall, north to the packet's row, then east;
 * then land, read the proximity prompt and step north-east until it names
 * the packet before pressing. Production geometry is never adjusted.
 */
async function openPacket1(page: Page) {
  const here = await playerAt(page);

  if (here === null || Math.abs(here.y - PACKET_1.y) > 24) {
    await walkTo(page, 368, here?.y ?? 252);
    await walkTo(page, 368, PACKET_1.y, { yFirst: true });
  }

  const landings = [
    { x: PACKET_1.x, y: PACKET_1.y },
    { x: PACKET_1.x + 8, y: PACKET_1.y - 10 },
    { x: PACKET_1.x + 14, y: PACKET_1.y - 16 },
    { x: PACKET_1.x + 4, y: PACKET_1.y - 20 },
  ];

  for (const [attempt, landing] of landings.entries()) {
    await walkTo(page, landing.x, landing.y, { tolerance: 6 });
    await page.waitForTimeout(200);

    const prompt = await page.evaluate(
      () =>
        (
          window as unknown as {
            __worldPromptProbe?: {
              prompt: boolean;
              text: string | null;
            } | null;
          }
        ).__worldPromptProbe ?? null,
    );

    if (prompt?.text?.toLowerCase().includes('quality packet')) {
      await press(page, 'Space');
      await expectSurface(page, 'm12_qc_packet_o1');

      return;
    }

    const at = await playerAt(page);

    // Never silent (test review T4 precedent): the driver's relanding is
    // recorded in the run log.
    // eslint-disable-next-line no-console
    console.log(
      `[driver] packet 1 landing ${attempt + 1} at ${Math.round(at?.x ?? NaN)},${Math.round(at?.y ?? NaN)}: prompt "${prompt?.text ?? 'none'}"`,
    );
  }

  throw new Error('packet 1: no landing put the quality packet nearest');
}

async function playerAt(page: Page) {
  return page.evaluate(
    () =>
      (window as unknown as { __playerProbe?: { x: number; y: number } | null })
        .__playerProbe ?? null,
  );
}

async function openPacket2(page: Page) {
  await workshopVia(page, PACKET_2.x, PACKET_2.y);
  await interactAt(page, PACKET_2, { approachOffset: { x: 0, y: 0 } });
  await expectSurface(page, 'm12_qc_packet_o2');
}

test.describe('M12 quality packets on the route', () => {
  test('packet 1 fully checked, judged and corrected with pointer and keyboard; packet 2 left open on ESC and released unchecked; reproduced 3/6 with detection kept apart from coverage', async ({
    page,
  }) => {
    test.setTimeout(900_000);

    const errors = captureErrors(page);

    await bootPilot(page, 'm12a');
    await completeDockTutorial(page, 1);
    await dockToConcourse(page);
    // Vale's briefing presents the storm packet's quality packet.
    expect(await countType(page, 'proto_m12_check_presented')).toBe(0);
    await valeHandover(page);
    expect(await countType(page, 'proto_m12_check_presented')).toBe(1);
    expect(await itemStatus(page, 'M12')).toBe('pending');

    await openPacket1(page);
    await waitType(page, 'proto_m12_check_opportunity_opened', 1, 3_000);

    const opened = (
      await eventsByType(page, 'proto_m12_check_opportunity_opened')
    )[0];
    const snapshot = opened?.metadata?.entry_state_snapshot as Record<
      string,
      unknown
    >;

    expect(snapshot).toMatchObject({
      occasion: 'o1',
      fields: 3,
      faults: 1,
      references_hidden_until_checked: true,
      stage: 'workshop',
    });

    const form = snapshot.form as 'form_a' | 'form_b';
    const product = M12_PRODUCTS.o1;
    const faultIndex = product.fault[form].index;
    const probe = await surface(page);

    expect(probe?.title).toBe('QUALITY PACKET — SUPPLY MANIFEST');
    expect(`${probe?.title}\n${probe?.status}\n${probe?.help}`).not.toMatch(
      FORBIDDEN_TEXT,
    );
    // Every reference is hidden before its field is checked.
    for (const field of product.fields) {
      expect(await elementLabel(page, `ref_${field.id}`)).toBe(
        'Packing list: —',
      );
    }

    // Occasion 2 is undeclared until the Workshop: the item row stays
    // `pending` while packet 1 is open (M01 route precedent).
    expect(await itemStatus(page, 'M12')).toBe('pending');
    await page.screenshot({ path: 'test-results/m12-packet1-800x600.png' });

    // Field 1 checked by pointer; judged by keyboard past the settle window.
    for (const [index, field] of product.fields.entries()) {
      const faulty = index === faultIndex;

      if (index % 2 === 0) {
        await clickElement(page, `check_${field.id}`);
      } else {
        await page.keyboard.press(`${index + 1}`);
      }

      await waitType(page, 'proto_m12_check_field_checked', index + 1, 3_000);
      await page.waitForTimeout(300);
      expect(await elementLabel(page, `ref_${field.id}`)).toBe(
        `Packing list: ${field.reference}`,
      );
      expect((await surface(page))?.elements.map((e) => e.id)).toEqual(
        expect.arrayContaining(['judge_matches', 'judge_differs']),
      );
      // Focus never lands on a judgement control (review S-1): ENTER here
      // re-reads the reference and judges nothing.
      expect((await surface(page))?.focus).toMatch(/^ref_/);
      await page.keyboard.press('Enter');
      await page.waitForTimeout(200);
      expect(await countType(page, 'proto_m12_check_field_judged')).toBe(index);

      if (faulty) {
        if (index % 2 === 0) {
          await page.keyboard.press('d');
        } else {
          await clickElement(page, 'judge_differs');
        }
      } else if (index % 2 === 0) {
        await page.keyboard.press('m');
      } else {
        await clickElement(page, 'judge_matches');
      }

      await waitType(page, 'proto_m12_check_field_judged', index + 1, 3_000);

      const judged = (await eventsByType(page, 'proto_m12_check_field_judged'))[
        index
      ];

      expect(judged?.metadata).toMatchObject({
        field_id: field.id,
        judgement: faulty ? 'differs' : 'matches',
        judgement_correct: true,
        faulty_field: faulty,
      });

      if (faulty) {
        // The keypad opens; the reference is typed on the keyboard and
        // confirmed by pointer — compared with the reference, never copied.
        await waitType(page, 'proto_m12_check_keypad_opened', 1, 3_000);
        await page.waitForTimeout(300);
        expect((await surface(page))?.elements.map((e) => e.id)).toEqual(
          expect.arrayContaining(['entry', 'key_0', 'key_9', 'key_confirm']),
        );

        // The 0 digit works as a hotkey (review S-2 / G-H1) and Back
        // removes it; the reference is then typed and confirmed with
        // ENTER — Confirm takes focus exactly when the entry is full.
        await page.keyboard.press('0');
        await waitType(page, 'proto_m12_check_keypad_digit', 1, 3_000);
        expect(await elementLabel(page, 'entry')).toContain(': 0');
        await page.keyboard.press('z');
        await waitType(page, 'proto_m12_check_keypad_back', 1, 3_000);

        for (const digit of field.reference) {
          await page.keyboard.press(digit);
          await page.waitForTimeout(150);
        }

        expect(await elementLabel(page, 'entry')).toContain(field.reference);
        await page.waitForTimeout(250);
        expect((await surface(page))?.focus).toBe('key_confirm');
        await page.screenshot({ path: 'test-results/m12-keypad-800x600.png' });
        await page.keyboard.press('Enter');
        await waitType(page, 'proto_m12_check_correction_entered', 1, 3_000);
        expect(
          (await eventsByType(page, 'proto_m12_check_correction_entered'))[0]
            ?.metadata,
        ).toMatchObject({
          field_id: field.id,
          entered: field.reference,
          correct: true,
          faulty_field: true,
          input_mode: 'keyboard',
        });
        await page.waitForTimeout(300);
        expect(await elementLabel(page, `field_${field.id}`)).toBe(
          `${field.label}: ${field.reference}`,
        );
      }
    }

    expect(await elementLabel(page, 'release')).toContain('Release packet');
    expect((await surface(page))?.status).not.toMatch(FORBIDDEN_TEXT);
    // Release by keyboard.
    await page.keyboard.press('r');
    await waitType(page, 'proto_m12_check_released', 1, 3_000);
    await waitType(page, 'proto_m12_check_window_closed', 1, 3_000);

    const closed1 = (
      await eventsByType(page, 'proto_m12_check_window_closed')
    )[0];
    const raw1 = closed1?.metadata?.raw_components as Record<string, unknown>;

    expect(closed1?.metadata?.exit_state).toBe('completed');
    expect(raw1).toMatchObject({
      occasion: 'o1',
      form,
      fields_checked: 3,
      fields_judged: 3,
      judgements_correct: 3,
      fault_detected: true,
      correction_attempted: true,
      correction_successful: true,
      unnecessary_corrections: 0,
      released: true,
      closure_reason: 'completed',
    });
    expect((await validityRecord(page, 'proto_m12_check_o1')).validity).toBe(
      'valid',
    );
    await page.waitForTimeout(300);
    expect((await surface(page))?.status).toContain('3 fields');
    expect((await surface(page))?.status).not.toMatch(FORBIDDEN_TEXT);
    await page.keyboard.press('Escape');
    await waitSurface(page, false);

    // ——— Packet 2: the Work Order Board presents it.
    await concourseToWorkshop(page);
    expect(await countType(page, 'proto_m12_check_presented')).toBe(1);
    await workshopVia(page, 1312, 178);
    await openPromptAt(page, PILOT.workshop.board, {
      approachOffset: { x: -32, y: 38 },
    });
    await selectPromptOption(page, 1); // Take the orders.
    await expectStage(page, 'workshop_work');
    expect(await countType(page, 'proto_m12_check_presented')).toBe(2);

    await openPacket2(page);
    await waitType(page, 'proto_m12_check_opportunity_opened', 2, 3_000);
    expect(
      (await eventsByType(page, 'proto_m12_check_opportunity_opened'))[1]
        ?.metadata?.entry_state_snapshot,
    ).toMatchObject({
      occasion: 'o2',
      stage: 'workshop_work',
      realised_order: ['o1', 'o2'],
    });
    expect((await surface(page))?.title).toBe(
      'QUALITY PACKET — CALIBRATION TAGS',
    );
    expect(await itemStatus(page, 'M12')).toBe('open');

    // Leave by pointer keeps the packet open: no release, no observation
    // (the Leave button and ESC take the same path — review G-M1).
    await clickElement(page, 'leave');
    await waitSurface(page, false);
    await waitType(page, 'proto_m12_check_surface_closed', 1, 3_000);
    expect(await itemStatus(page, 'M12')).toBe('open');
    expect(await countType(page, 'proto_m12_check_window_closed')).toBe(1);
    await openPacket2(page);
    await waitType(page, 'proto_m12_check_surface_reopened', 1, 3_000);
    await page.waitForTimeout(300);
    for (const field of M12_PRODUCTS.o2.fields) {
      expect(await elementLabel(page, `ref_${field.id}`)).toBe(
        'Bench register: —',
      );
    }

    // Released unchecked by pointer: an observed 0/3.
    await clickElement(page, 'release');
    await waitType(page, 'proto_m12_check_window_closed', 2, 3_000);

    const closed2 = (
      await eventsByType(page, 'proto_m12_check_window_closed')
    )[1];
    const raw2 = closed2?.metadata?.raw_components as Record<string, unknown>;

    expect(closed2?.metadata?.exit_state).toBe('completed');
    expect(raw2).toMatchObject({
      occasion: 'o2',
      fields_checked: 0,
      fields_judged: 0,
      fault_detected: false,
      correction_attempted: false,
      released: true,
    });
    expect((await validityRecord(page, 'proto_m12_check_o2')).validity).toBe(
      'valid',
    );
    expect(await itemStatus(page, 'M12')).toBe('completed');
    await page.waitForTimeout(300);
    expect((await surface(page))?.status).toContain('0 fields');
    expect((await surface(page))?.status).not.toMatch(FORBIDDEN_TEXT);
    await page.keyboard.press('Escape');
    await waitSurface(page, false);

    // Independent reproduction from the raw family alone.
    const family = (await eventsByPrefix(
      page,
      'proto_m12_check_',
    )) as unknown as RawGameEvent[];
    const rows = extractItemFeatures('M12', family, {
      finalCoreClosed: false,
      pageLoadIndex: 1,
      reloaded: false,
    });

    expect(rows[0]).toMatchObject({
      feature_id: 'm12_fields_verified',
      value: 3,
      numerator: 3,
      denominator: 6,
      disposition: 'observed',
      closure_reason: 'completed',
      censored: false,
    });
    expect(rows[0].included_ids).toEqual(['m12_check_o1', 'm12_check_o2']);
    expect(rows[0].components).toMatchObject({
      judged_by_occasion: { o1: 3, o2: 0 },
      fault_detected_by_occasion: { o1: true, o2: false },
      recount_agrees: true,
    });
    expect(rows[1].value).toMatchObject({
      o1: {
        fault_detected: true,
        correction_attempted: true,
        correction_successful: true,
      },
      o2: {
        fields_judged: 0,
        fault_detected: false,
        correction_attempted: false,
        released: true,
      },
    });
    expect(JSON.stringify(rows)).not.toMatch(/score|careless|careful/i);
    expectNoRuntimeErrors(errors);
  });
});
