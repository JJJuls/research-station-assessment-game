/**
 * Pilot route — the complete signal-analysis incident by real input
 * (evidence-led pilot v2, Unit 3).
 *
 * One continuous case, four recorded phases, on the participant route:
 *
 * 1. M15 evidence table — sources opened, links drawn by pointer AND
 *    keyboard, a wrong link corrected, the intervention predicted; the
 *    completed record carries the authorised raw components only.
 * 2. M16 protocol console — base familiarisation, READY → new rule →
 *    ACKNOWLEDGE, six fresh reports routed by drag, click-composition and
 *    typed aliases (one shared semantic validator), one reference consult.
 * 3. M17 training rig — demonstration → two uncoached baseline probes →
 *    twelve feedback learning trials (the run of three at trial 4) → two
 *    transfer probes (no preview, no feedback; one demonstration review);
 *    sixteen first responses recorded (Station 080 Unit 9).
 * 4. M18 diagnostic board — the three diagnosis cases of Station 080
 *    Unit 20, driven through their own controls by real input (pointer
 *    and keyboard in turn): per case tests on request, one immutable first
 *    diagnosis, one immutable first planned-step answer; results after the
 *    sixth; both feature rows read from the page's own export.
 *
 * Between phases the wall display changes and Noor's intercom line moves
 * on. Every phase logs exactly its own family with its own opportunity /
 * window ids; no event carries a canonical study item, construct or
 * success flag; no probe surface contains a score; the item-owned active
 * time of the automated run stays inside the 235 s planning envelope.
 *
 * A second test proves the guards: a skipped orientation flags the
 * terminal phases' entry state (invalid, never low) while the phase still
 * runs; a held key never double-submits; the world is frozen while any
 * surface is open and moves again after it closes.
 */
// V4: the 800×600 design space sits at canvas (160 + 1.2x, 1.2y) on the
// 1280×720 canvas (src/world/viewport.ts; DEV probe window.__designSpace).
import { expect, type Page, test } from '@playwright/test';

import { M17_FORMS } from '../src/informationProcessing/syntaxForms';
import { getEvents, selectPromptOption } from './helpers';
import type { IpEventLike } from './ipHelpers';
import {
  clickTerminalButton,
  composeByClick,
  dragChipToBin,
  eventsOfFamily,
  expectProvisionalOnly,
  ipModule,
  ipModules,
  ipValidity,
  terminalProbe,
  typeCommand,
  waitBufferLength,
  waitTerminalOpen,
} from './ipHelpers';
import {
  captureErrors,
  completeDockTutorial,
  expectNoRuntimeErrors,
} from './journey';
import {
  bootPilot,
  hold,
  interactAt,
  labApproach,
  openPromptAt,
  PILOT,
  pilotCoverage,
  pilotProbe,
  press,
  routeToLabWork,
} from './pilotHelpers';
import { validityRecord } from './returnHelpers';

interface SurfaceProbe {
  open: boolean;
  surface_id: string | null;
  focus: string | null;
  feedback: string | null;
  elements: {
    id: string;
    label: string;
    x: number;
    y: number;
    w: number;
    h: number;
    state: string;
    focusable: boolean;
  }[];
  links: { from: string; to: string }[];
}

async function surface(page: Page): Promise<SurfaceProbe | null> {
  return page.evaluate(
    () =>
      (window as unknown as { __workSurfaceProbe?: SurfaceProbe | null })
        .__workSurfaceProbe ?? null,
  );
}

async function waitSurface(page: Page, open: boolean) {
  await page.waitForFunction(
    (expected) =>
      ((window as unknown as { __workSurfaceProbe?: { open: boolean } | null })
        .__workSurfaceProbe?.open ?? false) === expected,
    open,
    { timeout: 8000 },
  );
  await page.waitForTimeout(250);
}

async function clickElement(page: Page, id: string) {
  const probe = (await surface(page))!;
  const element = probe.elements.find((e) => e.id === id);

  if (element === undefined) {
    throw new Error(`surface element ${id} missing`);
  }

  const box = (await page.locator('canvas').boundingBox())!;

  await page.mouse.click(
    box.x + ((160 + element.x * 1.2) * box.width) / 1280,
    box.y + (element.y * 1.2 * box.height) / 720,
  );
  await page.waitForTimeout(220);
}

async function openBench(
  page: Page,
  at: { x: number; y: number },
  probeKey: '__ipTerminalProbe' | '__workSurfaceProbe',
) {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    await interactAt(page, at, {
      approachOffset: await labApproach(page, at),
    });

    const opened = await page
      .waitForFunction(
        (probe) =>
          (
            window as unknown as Record<
              string,
              { open?: boolean } | null | undefined
            >
          )[probe]?.open === true,
        probeKey,
        { timeout: 4000 },
      )
      .then(() => true)
      .catch(() => false);

    if (opened) {
      await page.waitForTimeout(350);
      return;
    }
  }

  throw new Error(`bench at ${at.x},${at.y} did not open ${probeKey}`);
}

async function signalDisplay(page: Page) {
  return page.evaluate(
    () =>
      (
        window as unknown as {
          __signalDisplayProbe?: {
            phases_recorded: string[];
            next_phase: string | null;
            indicator: string;
            intercom: string;
          } | null;
        }
      ).__signalDisplayProbe ?? null,
  );
}

async function playerX(page: Page): Promise<number> {
  return page.evaluate(
    () =>
      (window as unknown as { __playerProbe?: { x: number } | null })
        .__playerProbe?.x ?? -1,
  );
}

async function itemStatus(page: Page, item: string): Promise<string> {
  const coverage = await pilotCoverage(page);

  return coverage!.items.find((row) => row.item === item)!.status;
}

async function completeOrientation(page: Page) {
  await openBench(page, PILOT.lab.orientation, '__ipTerminalProbe');
  await dragChipToBin(page, 'T1', 'ARCHIVE');
  await composeByClick(page, ['ROUTE', 'T2', 'RELAY']);
  await typeCommand(page, 'ROUTE T3 ARCHIVE');
  await waitBufferLength(page, 3);
  await clickTerminalButton(page, 'submit');
  await page.waitForTimeout(400);
  expect((await terminalProbe(page)).stage).toBe('COMPLETE');
  await page.keyboard.press('Escape');
  await waitTerminalOpen(page, false);
}

function metadata(event: IpEventLike): Record<string, unknown> {
  return (event.metadata ?? {}) as Record<string, unknown>;
}

/* ------------------------------------------------------------------ *
 * M15 (Station 080 Unit 18) — the relay bench by keyboard. Every view
 * settles 400 ms; `press` already waits 450 ms after each key.
 * ------------------------------------------------------------------ */

/** RECORD (R), the settled confirming ENTER. */
async function recordByKeyboard(page: Page) {
  await press(page, 'r');
  expect((await surface(page))?.focus).toBe('confirm');
  await press(page, 'Enter');
}

/** The acknowledgement's control (FIRST QUESTION / NEXT … / SHOW RESULTS). */
async function continueByKeyboard(page: Page) {
  expect((await surface(page))?.focus).toBe('next');
  await press(page, 'Enter');
}

async function answerByKeyboard(page: Page, letter: 'a' | 'b' | 'c') {
  await press(page, letter);
  await recordByKeyboard(page);
}

/** The page's own feature rows of one item, read from the export builder. */
async function featureRows(page: Page, item: string) {
  const json = await page.evaluate(`(async () => {
    const mod = await import('/src/systems/index.ts');
    const payload = mod.researchRuntime.buildExportPayload();

    return JSON.stringify(
      (payload.measurement_features ?? []).filter((row) => row.item_id === ${JSON.stringify(item)}),
    );
  })()`);

  return JSON.parse(json as string) as Record<string, unknown>[];
}

/** The page's own feature row of one item, read from the export builder. */
async function featureRow(page: Page, item: string) {
  const json = await page.evaluate(`(async () => {
    const mod = await import('/src/systems/index.ts');
    const payload = mod.researchRuntime.buildExportPayload();

    return JSON.stringify(
      (payload.measurement_features ?? []).find((row) => row.item_id === ${JSON.stringify(item)}) ?? null,
    );
  })()`);

  return JSON.parse(json as string) as Record<string, unknown> | null;
}

test.describe('signal-analysis incident — complete case by real input (Unit 3)', () => {
  test('four phases recorded in one continuous case; the display and intercom advance; families, ids and raw components stay item-owned; no score', async ({
    page,
  }) => {
    test.setTimeout(900_000);

    const errors = captureErrors(page);
    const startedAt = Date.now();

    await bootPilot(page, 'inc', { extra: '&ip_form=A' });
    await completeDockTutorial(page, 1);
    await routeToLabWork(page);
    await completeOrientation(page);

    // ——— Phase 1 — M15 evidence table (Station 080 Unit 18: the two relay
    // boxes, driven through their own controls — tests and answers by
    // keyboard, box 1's wiring drafted by pointer) ———
    await openBench(page, PILOT.lab.evidenceTable, '__workSurfaceProbe');

    let table = (await surface(page))!;

    expect(table.surface_id).toBe('m15_evidence_table');
    expect(table.elements.find((e) => e.id === 'start')).toBeDefined();
    await press(page, 'Enter'); // START BOX 1 (the first focusable)

    // Box 1: both dials tested, wiring B drafted by pointer and recorded.
    await press(page, '1');
    await press(page, '2');
    table = (await surface(page))!;
    expect(table.elements.find((e) => e.id === 'record_f')?.label).toBe(
      'TEST F  step 1: P up · step 2: Q down, W up',
    );
    expect(table.elements.find((e) => e.id === 'record_g')?.label).toBe(
      'TEST G  step 1: P up · step 2: Q down, W up',
    );
    await clickElement(page, 'wiring_b');
    expect(
      (await surface(page))?.elements.find((e) => e.id === 'wiring_b')?.state,
    ).toBe('selected');
    await recordByKeyboard(page);
    table = (await surface(page))!;
    expect(table.elements.find((e) => e.id === 'test_f')?.state).toBe(
      'disabled',
    );
    await continueByKeyboard(page); // FIRST QUESTION
    await answerByKeyboard(page, 'c'); // S1-Q1
    await continueByKeyboard(page); // NEXT QUESTION
    await answerByKeyboard(page, 'b'); // S1-Q2
    await continueByKeyboard(page); // NEXT BOX

    // Box 2: both dials tested, wiring D, the two questions.
    await press(page, '1');
    await press(page, '2');
    await press(page, 'd');
    await recordByKeyboard(page);
    await continueByKeyboard(page);
    await answerByKeyboard(page, 'b'); // S2-Q1
    await continueByKeyboard(page);
    await answerByKeyboard(page, 'c'); // S2-Q2
    table = (await surface(page))!;
    expect(table.elements.find((e) => e.id === 'next')?.label).toBe(
      'SHOW RESULTS',
    );
    await continueByKeyboard(page); // SHOW RESULTS
    table = (await surface(page))!;
    expect(table.elements.find((e) => e.id === 'results_text')).toBeDefined();
    await press(page, 'Escape');
    await waitSurface(page, false);

    const m15Validity = await validityRecord(page, 'proto_m15_systems_series');

    expect(m15Validity.completed).toBe(true);
    expect(m15Validity.validity).toBe('valid');
    expect(await itemStatus(page, 'M15')).toBe('completed');
    expect(await featureRow(page, 'M15')).toMatchObject({
      feature_id: 'm15_correct_first_predictions',
      value: 4,
      numerator: 4,
      denominator: 4,
      disposition: 'observed',
      closure_reason: 'completed',
    });

    let display = await signalDisplay(page);

    expect(display?.phases_recorded).toEqual(['m15']);
    expect(display?.next_phase).toBe('m16');
    expect(display?.indicator).toMatch(/PHASE 2 \/ 4/);
    expect(display?.intercom).toMatch(/handling protocol/);

    // ——— Phase 2 — M16 protocol console (Station 080 Unit 19: the
    // handling rule, driven through its own controls by real input — the
    // card and the boundary by pointer, the examples by keyboard, the six
    // vials by keyboard and pointer in turn) ———
    await openBench(page, PILOT.lab.protocolConsole, '__workSurfaceProbe');

    let console_ = (await surface(page))!;

    expect(console_.surface_id).toBe('m16_protocol_console');
    expect(
      console_.elements.find((e) => e.id === 'show_example'),
    ).toBeDefined();
    await page.waitForTimeout(450);
    await clickElement(page, 'show_example'); // the card, by pointer
    await page.waitForTimeout(450);
    console_ = (await surface(page))!;
    expect(
      console_.elements.find((e) => e.id === 'example_block')?.label,
    ).toContain('WORKED EXAMPLE 1 OF 2');
    await press(page, 'ArrowRight'); // the focus from the teaching note to NEXT EXAMPLE
    expect((await surface(page))?.focus).toBe('next_example');
    await press(page, 'Enter'); // example 2, by keyboard
    console_ = (await surface(page))!;
    expect(
      console_.elements.find((e) => e.id === 'example_block')?.label,
    ).toContain('WORKED EXAMPLE 2 OF 2');
    await clickElement(page, 'start_vials'); // the boundary, by pointer
    expect((await surface(page))?.elements.map((e) => e.id)).toEqual([
      'confirm',
      'keep_reading',
      'dialog_text',
    ]);
    await page.waitForTimeout(450);
    await clickElement(page, 'confirm');
    await page.waitForTimeout(450);
    expect(
      (await surface(page))?.elements.find((e) => e.id === 'vial_block')?.label,
    ).toContain('VIAL 1 OF 6');

    // The six keyed drawers (1, 3, 4, 1, 4, 2): vials 1, 3, 4 and 6 by
    // keyboard, vials 2 and 5 by pointer. `press` already waits 450 ms
    // after each key, past every view's settle.
    const keyed = [1, 3, 4, 1, 4, 2];

    for (const [index, drawer] of keyed.entries()) {
      if (index % 3 === 1) {
        await clickElement(page, `option_${drawer}`);
        await clickElement(page, 'record_drawer');
        await page.waitForTimeout(450);
        await clickElement(page, 'confirm');
        await page.waitForTimeout(450);
      } else {
        await press(page, String(drawer));
        await press(page, 'r');
        expect((await surface(page))?.focus).toBe('confirm');
        await press(page, 'Enter');
      }

      console_ = (await surface(page))!;
      expect(
        console_.elements.find((e) => e.id === 'acknowledgement')?.label,
      ).toBe(`Vial ${index + 1} recorded.`);

      if (index < keyed.length - 1) {
        expect((await surface(page))?.focus).toBe('next');
        await press(page, 'Enter'); // NEXT VIAL
      }
    }

    console_ = (await surface(page))!;
    expect(console_.elements.find((e) => e.id === 'next')?.label).toBe(
      'SHOW RESULTS',
    );
    await press(page, 'Enter'); // SHOW RESULTS
    console_ = (await surface(page))!;
    expect(
      console_.elements.find((e) => e.id === 'results_text'),
    ).toBeDefined();
    expect(console_.title).toBe('RESULTS — VIALS 1-3 OF 6');
    await press(page, 'Escape');
    await waitSurface(page, false);

    const m16Validity = await validityRecord(page, 'proto_m16_handling_series');

    expect(m16Validity.completed).toBe(true);
    expect(m16Validity.validity).toBe('valid');
    expect(await itemStatus(page, 'M16')).toBe('completed');
    expect(await featureRow(page, 'M16')).toMatchObject({
      feature_id: 'm16_correct_first_applications',
      value: 6,
      numerator: 6,
      denominator: 6,
      disposition: 'observed',
      closure_reason: 'completed',
    });
    display = await signalDisplay(page);
    expect(display?.phases_recorded).toEqual(['m15', 'm16']);
    expect(display?.intercom).toMatch(/register syntax/);

    // ——— Phase 3 — M17 training rig (Station 080 Unit 9) ———
    await openBench(page, PILOT.lab.trainingRig, '__ipTerminalProbe');

    let terminal = await terminalProbe(page);

    expect(terminal.stage).toBe('DEMONSTRATION');
    expect(terminal.output.join(' ')).toContain('VEK B RED');
    await clickTerminalButton(page, 'READY');
    terminal = await terminalProbe(page);
    expect(terminal.stage).toBe('BASELINE');
    expect(terminal.output.some((line) => line.startsWith('NOW'))).toBe(false);

    const m17Trials = M17_FORMS.A.trials;
    const typeReference = async (index: number) => {
      for (const line of m17Trials[index].reference) {
        await typeCommand(page, line);
      }

      await waitBufferLength(page, 2);
    };
    const typeWrong = async () => {
      await typeCommand(page, 'KAI A');
      await typeCommand(page, 'KAI B');
      await waitBufferLength(page, 2);
    };

    // Baseline 1 correct (typed), baseline 2 wrong (pointer): no feedback.
    await typeReference(0);
    await clickTerminalButton(page, 'submit');
    terminal = await terminalProbe(page);
    expect(terminal.console.join(' ')).not.toMatch(
      /matches GOAL|Reference sequence/,
    );
    await composeByClick(page, ['KAI', 'A']);
    await composeByClick(page, ['KAI', 'B']);
    await waitBufferLength(page, 2);
    await clickTerminalButton(page, 'submit');
    terminal = await terminalProbe(page);
    expect(terminal.stage).toBe('LEARNING');

    // Learning: 1 wrong (the reference is shown), 2–4 correct (the run of
    // three ends at 4), the rest mixed — all twelve run.
    const learningPlan = [
      false,
      true,
      true,
      true,
      false,
      true,
      false,
      true,
      true,
      false,
      true,
      true,
    ];

    for (const [i, correct] of learningPlan.entries()) {
      if (correct) {
        await typeReference(2 + i);
      } else {
        await typeWrong();
      }

      await clickTerminalButton(page, 'submit');
      terminal = await terminalProbe(page);
      expect(terminal.stage).toBe('FEEDBACK');
      expect(terminal.console.join(' ')).toMatch(
        correct ? /matches GOAL/ : /does not match GOAL.*Reference sequence/,
      );
      await clickTerminalButton(page, 'NEXT');
    }

    // Transfer: no preview, no feedback; the demonstration reviewed once.
    terminal = await terminalProbe(page);
    expect(terminal.stage).toBe('TRANSFER');
    expect(terminal.output.some((line) => line.startsWith('NOW'))).toBe(false);
    await clickTerminalButton(page, 'reference');
    await page.waitForTimeout(250);
    await page.keyboard.press('Escape');
    await page.waitForTimeout(250);
    await typeReference(14);
    await clickTerminalButton(page, 'submit');
    await typeWrong();
    await clickTerminalButton(page, 'submit');
    await page.waitForTimeout(300);
    terminal = await terminalProbe(page);
    expect(terminal.closed).toBe(true);
    await page.keyboard.press('Escape');
    await waitTerminalOpen(page, false);

    const m17 = await ipModule(page, 'm17');
    const m17Records = m17.trials as Record<string, unknown>[];

    expect(m17.window_status).toBe('completed');
    expect(m17.trials_completed).toBe(16);
    expect(m17.criterion_run_trial).toBe(4);
    expect(m17.sequence).toEqual({
      baseline: [true, false],
      learning: learningPlan,
      transfer: [true, false],
    });
    expect(m17Records.filter((r) => r.feedback_presented)).toHaveLength(12);
    expect(m17Records[1].input_mode).toBe('pointer');
    expect(m17Records[14].demonstration_reviews).toBe(1);
    expect(m17.demonstration_exposures).toBe(2);
    expect(Object.keys(m17).join(' ')).not.toMatch(
      /slope|criterion_score|score/i,
    );
    expect(await itemStatus(page, 'M17')).toBe('completed');
    display = await signalDisplay(page);
    expect(display?.phases_recorded).toEqual(['m15', 'm16', 'm17']);
    expect(display?.intercom).toMatch(/diagnostic board/);

    // ——— Phase 4 — M18 diagnostic board (Station 080 Unit 20: the three
    // diagnosis cases, driven through their own controls by real input —
    // the card by pointer; tests, drafts and confirmations by keyboard and
    // pointer in turn; `press` already waits 450 ms after each key, past
    // every view's settle) ———
    await openBench(page, PILOT.lab.diagnosticBoard, '__workSurfaceProbe');

    let board = (await surface(page))!;

    expect(board.surface_id).toBe('m18_diagnostic_board');
    expect(board.elements.find((e) => e.id === 'start_case')).toBeDefined();
    await page.waitForTimeout(450);
    await clickElement(page, 'start_case'); // the card, by pointer
    await page.waitForTimeout(450);
    board = (await surface(page))!;
    expect(board.elements.find((e) => e.id === 'sheet')?.label).toContain(
      'MAST RECEIVER',
    );

    // Case 1: TEST A by keyboard, TEST B by pointer; part 3 (the key) by
    // keyboard; step 2 (the key) by pointer.
    await press(page, 'a');
    await clickElement(page, 'test_b');
    board = (await surface(page))!;
    expect(board.elements.find((e) => e.id === 'result_a')?.label).toBe(
      'P1 reads TONE.',
    );
    expect(board.elements.find((e) => e.id === 'result_b')?.label).toBe(
      'P2 reads SILENT.',
    );
    await press(page, '3');
    await recordByKeyboard(page);
    board = (await surface(page))!;
    expect(board.status).toBe(
      'Recorded part: AMPLIFIER. The tests are closed; the record stays.',
    );
    expect(board.elements.find((e) => e.id === 'test_a')?.focusable).toBe(
      false,
    );
    await page.waitForTimeout(450);
    await clickElement(page, 'answer_2');
    await clickElement(page, 'record_answer');
    await page.waitForTimeout(450);
    await clickElement(page, 'confirm');
    await page.waitForTimeout(450);
    board = (await surface(page))!;
    expect(board.elements.find((e) => e.id === 'acknowledgement')?.label).toBe(
      'Case 1 recorded.',
    );
    await clickElement(page, 'next'); // NEXT CASE, by pointer

    // Case 2: TEST B and TEST C by pointer; part 4 (the key) by pointer with
    // the keyboard confirm; step 1 (the key) by keyboard with the pointer
    // confirm.
    await page.waitForTimeout(450);
    await clickElement(page, 'test_b');
    await page.waitForTimeout(450);
    await clickElement(page, 'test_c');
    await clickElement(page, 'part_4');
    await press(page, 'r');
    expect((await surface(page))?.focus).toBe('confirm');
    await press(page, 'Enter');
    await press(page, '1');
    await clickElement(page, 'record_answer');
    await page.waitForTimeout(450);
    await clickElement(page, 'confirm');
    await page.waitForTimeout(450);
    board = (await surface(page))!;
    expect(board.elements.find((e) => e.id === 'acknowledgement')?.label).toBe(
      'Case 2 recorded.',
    );
    await clickElement(page, 'next');
    // Case 3 settles 400 ms after the pointer press before a key acts.
    await page.waitForTimeout(450);

    // Case 3: TEST A and TEST C by keyboard; part 2 (the key) by pointer;
    // step 4 (the key) by keyboard.
    await press(page, 'a');
    await press(page, 'c');
    await page.waitForTimeout(100);
    board = (await surface(page))!;
    for (const id of ['result_a', 'result_c']) {
      expect(
        board.elements.find((e) => e.id === id)?.label,
        `case 3 ${id}`,
      ).not.toContain('not run');
    }
    await clickElement(page, 'part_2');
    await clickElement(page, 'record_part');
    await page.waitForTimeout(450);
    await clickElement(page, 'confirm');
    // The step view settles 400 ms after the pointer confirm before a key acts.
    await page.waitForTimeout(450);
    await press(page, '4');
    await recordByKeyboard(page);
    board = (await surface(page))!;
    expect(board.elements.find((e) => e.id === 'next')?.label).toBe(
      'SHOW RESULTS',
    );
    await page.waitForTimeout(450);
    await clickElement(page, 'next'); // SHOW RESULTS
    board = (await surface(page))!;
    expect(board.elements.find((e) => e.id === 'results_text')).toBeDefined();
    // Results page 1 settles 400 ms before ESC leaves.
    await page.waitForTimeout(450);
    await press(page, 'Escape');
    await waitSurface(page, false);

    const m18Validity = await validityRecord(page, 'proto_m18_cases_series');

    expect(m18Validity.completed).toBe(true);
    expect(m18Validity.validity).toBe('valid');
    expect(await itemStatus(page, 'M18')).toBe('completed');

    const m18Rows = await featureRows(page, 'M18');

    expect(m18Rows.map((row) => row.feature_id)).toEqual([
      'm18_correct_first_diagnoses',
      'm18_correct_consequence_predictions',
    ]);

    for (const row of m18Rows) {
      expect(row).toMatchObject({
        value: 3,
        numerator: 3,
        denominator: 3,
        planned_denominator: 3,
        disposition: 'observed',
        closure_reason: 'completed',
      });
    }
    display = await signalDisplay(page);
    expect(display?.phases_recorded).toEqual(['m15', 'm16', 'm17', 'm18']);
    expect(display?.next_phase).toBeNull();
    expect(display?.indicator).toMatch(/CASE RECORDED/);
    expect(display?.intercom).toMatch(/Case logged/);

    // ——— Whole-case invariants ———
    const events = (await getEvents(page)) as unknown as IpEventLike[];
    const families = {
      m17: eventsOfFamily(events, 'proto_m17_trials'),
    };
    const ids = {
      m17: ['proto_m17_criterion', 'm17_trials_w1'],
    } as const;

    // M18 (Unit 20) is no longer an IP family: an explicit check of
    // equivalent strength — its own family only, one opportunity, the
    // window id and the administration version on every event, exactly one
    // completion and one window closure, six first responses, no v2 fault
    // event.
    const m18Events = events.filter((e) =>
      e.event_type.startsWith('proto_m18_'),
    );

    expect(m18Events.length).toBeGreaterThan(3);
    expect(
      m18Events.every((e) => e.event_type.startsWith('proto_m18_cases_')),
    ).toBe(true);
    expect(
      m18Events.filter(
        (e) => e.event_type === 'proto_m18_cases_first_responses_completed',
      ),
    ).toHaveLength(1);
    expect(
      m18Events.filter((e) => e.event_type === 'proto_m18_cases_window_closed'),
    ).toHaveLength(1);
    expect(
      m18Events.filter(
        (e) => e.event_type === 'proto_m18_cases_first_response',
      ),
    ).toHaveLength(6);

    for (const event of m18Events) {
      const m = metadata(event);

      expect(m.opportunity_id, event.event_type).toBe('proto_m18_cases_series');
      expect(m.window_id, event.event_type).toBe('m18_cases_w1');
      expect(m.entry_state_version, event.event_type).toBe('m18-cases-v1');
    }

    expectProvisionalOnly(m18Events);
    expect(eventsOfFamily(events, 'proto_m18_fault')).toHaveLength(0);
    expect(
      (await validityRecord(page, 'proto_m18_cases_series')).validity,
    ).toBe('valid');

    // The M18 first-response phase sits between its opening and its window
    // closure; only the briefing exposure precedes it and only the results
    // (and leaving) follow it.
    const m18Index = (type: string) =>
      events.findIndex((e) => e.event_type === `proto_m18_cases_${type}`);
    const m18Opened = m18Index('opportunity_opened');
    const m18Closed = m18Index('window_closed');

    expect(m18Opened).toBeGreaterThan(m18Index('presented'));
    expect(m18Closed).toBeGreaterThan(m18Opened);

    for (const event of m18Events) {
      const at = events.indexOf(event);
      const suffix = event.event_type.slice('proto_m18_cases_'.length);

      if (suffix === 'presented') {
        expect(at).toBeLessThan(m18Opened);
      } else if (
        suffix === 'results_shown' ||
        suffix === 'panel_left' ||
        suffix === 'series_reopened'
      ) {
        expect(at, event.event_type).toBeGreaterThan(m18Opened);
      } else {
        expect(at >= m18Opened && at <= m18Closed, event.event_type).toBe(true);
      }
    }

    // M16 (Unit 19) is no longer an IP family: an explicit check of
    // equivalent strength — its own family only, one opportunity, the
    // window id and the administration version on every event, exactly one
    // completion and one window closure, six first responses, no v2
    // protocol event.
    const m16Events = events.filter((e) =>
      e.event_type.startsWith('proto_m16_'),
    );

    expect(m16Events.length).toBeGreaterThan(3);
    expect(
      m16Events.every((e) => e.event_type.startsWith('proto_m16_handling_')),
    ).toBe(true);
    expect(
      m16Events.filter(
        (e) => e.event_type === 'proto_m16_handling_first_responses_completed',
      ),
    ).toHaveLength(1);
    expect(
      m16Events.filter(
        (e) => e.event_type === 'proto_m16_handling_window_closed',
      ),
    ).toHaveLength(1);
    expect(
      m16Events.filter(
        (e) => e.event_type === 'proto_m16_handling_first_response',
      ),
    ).toHaveLength(6);

    for (const event of m16Events) {
      const m = metadata(event);

      expect(m.opportunity_id, event.event_type).toBe(
        'proto_m16_handling_series',
      );
      expect(m.window_id, event.event_type).toBe('m16_handling_w1');
      expect(m.entry_state_version, event.event_type).toBe('m16-handling-v1');
    }

    expectProvisionalOnly(m16Events);
    expect(eventsOfFamily(events, 'proto_m16_protocol')).toHaveLength(0);
    expect(
      (await validityRecord(page, 'proto_m16_handling_series')).validity,
    ).toBe('valid');

    // The M16 first-response phase sits between its opening and its window
    // closure; only the briefing exposure precedes it and only the results
    // (and leaving) follow it.
    const m16Index = (type: string) =>
      events.findIndex((e) => e.event_type === `proto_m16_handling_${type}`);
    const m16Opened = m16Index('opportunity_opened');
    const m16Closed = m16Index('window_closed');

    expect(m16Opened).toBeGreaterThan(m16Index('presented'));
    expect(m16Closed).toBeGreaterThan(m16Opened);

    for (const event of m16Events) {
      const at = events.indexOf(event);
      const suffix = event.event_type.slice('proto_m16_handling_'.length);

      if (suffix === 'presented') {
        expect(at).toBeLessThan(m16Opened);
      } else if (
        suffix === 'results_shown' ||
        suffix === 'panel_left' ||
        suffix === 'series_reopened'
      ) {
        expect(at, event.event_type).toBeGreaterThan(m16Opened);
      } else {
        expect(at >= m16Opened && at <= m16Closed, event.event_type).toBe(true);
      }
    }

    // M15 (Unit 18) is no longer an IP family: an explicit check of
    // equivalent strength — its own family only, one opportunity, the
    // kit's window id on every event, both box window ids, exactly one
    // completion and one window closure, no v2 or secondary cipher event.
    const m15Events = events.filter((e) =>
      e.event_type.startsWith('proto_m15_'),
    );

    expect(m15Events.length).toBeGreaterThan(3);
    expect(
      m15Events.every((e) => e.event_type.startsWith('proto_m15_systems_')),
    ).toBe(true);
    expect(
      m15Events.filter(
        (e) => e.event_type === 'proto_m15_systems_first_responses_completed',
      ),
    ).toHaveLength(1);
    expect(
      m15Events.filter(
        (e) => e.event_type === 'proto_m15_systems_window_closed',
      ),
    ).toHaveLength(1);

    for (const event of m15Events) {
      const m = metadata(event);

      expect(m.opportunity_id, event.event_type).toBe(
        'proto_m15_systems_series',
      );
      expect(m.window_id, event.event_type).toBe('m15_system_s1');
      expect(m.entry_state_version, event.event_type).toBe('m15-systems-v1');
    }

    expect(
      new Set(m15Events.map((e) => metadata(e).box_window_id).filter(Boolean)),
    ).toEqual(new Set(['m15_system_s1', 'm15_system_s2']));
    expectProvisionalOnly(m15Events);
    expect(eventsOfFamily(events, 'proto_m15_cipher')).toHaveLength(0);
    expect(eventsOfFamily(events, 'secondary_m15_cipher')).toHaveLength(0);
    expect(
      (await validityRecord(page, 'proto_m15_systems_series')).validity,
    ).toBe('valid');

    for (const [phase, list] of Object.entries(families)) {
      expect(list.length, phase).toBeGreaterThan(3);
      expect(
        list.filter((e) => e.event_type.endsWith('_completed')),
        phase,
      ).toHaveLength(1);

      const [opportunity, window] = ids[phase as keyof typeof ids];

      for (const event of list) {
        const m = metadata(event);

        expect(m.opportunity_id, `${phase} ${event.event_type}`).toBe(
          opportunity,
        );
        expect(m.window_id, `${phase} ${event.event_type}`).toBe(window);
      }

      expectProvisionalOnly(list);
    }

    // Pairwise disjoint: no event belongs to two families.
    const all = [
      ...Object.values(families).flat(),
      ...m15Events,
      ...m16Events,
      ...m18Events,
    ];

    expect(new Set(all).size).toBe(all.length);
    expect(all.length).toBe(
      events.filter((e) => /^proto_m1[5-8]_/.test(e.event_type)).length,
    );

    // The M15 first-response phase sits between its opening and its window
    // closure; only the briefing exposure precedes it and only the results
    // (and leaving) follow it.
    const m15Index = (type: string) =>
      events.findIndex((e) => e.event_type === `proto_m15_systems_${type}`);
    const m15Opened = m15Index('opportunity_opened');
    const m15Closed = m15Index('window_closed');

    expect(m15Opened).toBeGreaterThan(m15Index('presented'));
    expect(m15Closed).toBeGreaterThan(m15Opened);

    for (const event of m15Events) {
      const at = events.indexOf(event);
      const suffix = event.event_type.slice('proto_m15_systems_'.length);

      if (suffix === 'presented') {
        expect(at).toBeLessThan(m15Opened);
      } else if (
        suffix === 'results_shown' ||
        suffix === 'panel_left' ||
        suffix === 'series_reopened'
      ) {
        expect(at, event.event_type).toBeGreaterThan(m15Opened);
      } else {
        expect(at >= m15Opened && at <= m15Closed, event.event_type).toBe(true);
      }
    }

    // Completing one phase never emitted another phase's raw events: each
    // phase's events all sit between that phase's window_opened and its
    // completed event.
    const index = (type: string) =>
      events.findIndex((e) => e.event_type === type);

    for (const [phase, list] of Object.entries(families)) {
      const family = list[0].event_type
        .replace(/_[a-z_]+$/, (s) => s)
        .split('_')
        .slice(0, 3)
        .join('_');
      const first = index(`${family}_window_opened`);
      const last = index(`${family}_completed`);

      expect(first, phase).toBeGreaterThanOrEqual(0);
      expect(last, phase).toBeGreaterThan(first);

      for (const event of list) {
        const at = events.indexOf(event);

        expect(at >= first && at <= last, `${phase} ${event.event_type}`).toBe(
          true,
        );
      }
    }

    // Every phase valid on the register; no score anywhere on the probe.
    for (const [opportunity] of Object.values(ids)) {
      expect((await ipValidity(page, opportunity)).validity).toBe('valid');
    }

    const surfaceJson = JSON.stringify((await ipModules(page)).modules);

    expect(surfaceJson).not.toMatch(
      /"score"|"item_score"|"scale_score"|"weight"|"trait"/,
    );

    // Planning envelope (sheet 11: 235 s item-owned): the automated run's
    // item-owned active time stays inside it (a human estimate is not
    // claimed here).
    const activeMs =
      Object.values(families)
        .map((list) => list.find((e) => e.event_type.endsWith('_completed'))!)
        .reduce((sum, e) => sum + Number(metadata(e).active_ms ?? 0), 0) +
      Number(
        metadata(
          m15Events.find(
            (e) => e.event_type === 'proto_m15_systems_window_closed',
          )!,
        ).active_ms ?? 0,
      ) +
      Number(
        metadata(
          m16Events.find(
            (e) => e.event_type === 'proto_m16_handling_window_closed',
          )!,
        ).active_ms ?? 0,
      ) +
      Number(
        metadata(
          m18Events.find(
            (e) => e.event_type === 'proto_m18_cases_window_closed',
          )!,
        ).active_ms ?? 0,
      );

    // eslint-disable-next-line no-console
    console.log(
      `signal incident: item-owned active ${Math.round(activeMs / 1000)} s; wall ${Math.round((Date.now() - startedAt) / 1000)} s`,
    );
    expect(activeMs).toBeLessThanOrEqual(235_000);

    // Kai closes the episode.
    await openPromptAt(page, PILOT.lab.kai, {
      approachOffset: await labApproach(page, PILOT.lab.kai),
    });
    await selectPromptOption(page, 1);
    expect((await pilotProbe(page))?.stage).toBe('exterior_briefing');
    expectNoRuntimeErrors(errors);
  });

  test('guards: a skipped orientation flags the entry state (invalid, never low) while the phase still runs; a held key never double-submits; the world is frozen under a surface and moves after it closes', async ({
    page,
  }) => {
    test.setTimeout(480_000);

    const errors = captureErrors(page);

    await bootPilot(page, 'grd', { extra: '&ip_form=A' });
    await completeDockTutorial(page, 1);
    await routeToLabWork(page);

    // Straight to the training rig without the orientation (Unit 19: the
    // protocol console teaches its own rule and has no orientation gate;
    // the rig's route module still flags a skipped Console Orientation).
    await openBench(page, PILOT.lab.trainingRig, '__ipTerminalProbe');
    expect((await terminalProbe(page)).task).toBe('m17');

    const flagged = (await getEvents(page)).filter(
      (e) => e.event_type === 'proto_m17_trials_entry_state_flagged',
    );

    expect(flagged).toHaveLength(1);
    expect((flagged[0].metadata as { reason?: string }).reason).toBe(
      'invalid_entry_state',
    );

    const m17 = await ipValidity(page, 'proto_m17_criterion');

    expect(m17.entered).toBe(true);
    expect(m17.invalid_reason).toBe('invalid_entry_state');
    expect(m17.validity).toBe('invalid');
    // The task still runs (invalid ≠ blocked): the demonstration advances.
    expect((await terminalProbe(page)).stage).toBe('DEMONSTRATION');
    await clickTerminalButton(page, 'READY');
    expect((await terminalProbe(page)).stage).toBe('BASELINE');
    await clickTerminalButton(page, 'close');
    await waitTerminalOpen(page, false);

    // The protocol console (Unit 19) opens without any orientation gate
    // and flags nothing: its first-opening card, left at once.
    await openBench(page, PILOT.lab.protocolConsole, '__workSurfaceProbe');
    expect((await surface(page))?.surface_id).toBe('m16_protocol_console');
    expect(
      (await getEvents(page)).filter((e) =>
        /^proto_m16_.*entry_state_flagged$/.test(e.event_type),
      ),
    ).toEqual([]);
    expect(
      (await validityRecord(page, 'proto_m16_handling_series')).invalid_reason,
    ).toBeNull();
    await page.waitForTimeout(450);
    await press(page, 'Escape');
    await waitSurface(page, false);

    // Evidence table (Unit 18): the world is frozen under the surface.
    await openBench(page, PILOT.lab.evidenceTable, '__workSurfaceProbe');

    const held = await playerX(page);

    await hold(page, 'ArrowRight', 350);
    expect(Math.abs((await playerX(page)) - held)).toBeLessThan(2);

    // The held ArrowRight moved the focus along the bottom row: back to
    // START (the first focusable) before the held ENTER.
    while ((await surface(page))?.focus !== 'start') {
      await page.keyboard.press('ArrowLeft');
      await page.waitForTimeout(60);
    }

    // A held ENTER on START BOX 1 (key repeat) starts box 1 exactly once:
    // the surface drops the repeats, and the box's first view settles.
    await page.waitForTimeout(450);
    await page.keyboard.down('Enter');
    await page.waitForTimeout(700);
    await page.keyboard.up('Enter');
    await page.waitForTimeout(300);

    const m15Count = async (suffix: string) =>
      (await getEvents(page)).filter(
        (e) => e.event_type === `proto_m15_systems_${suffix}`,
      ).length;

    expect(await m15Count('orientation_acknowledged')).toBe(1);
    expect(await m15Count('box_presented')).toBe(1);
    expect(await m15Count('test_run')).toBe(0);

    // A held 1 (TEST DIAL F) runs the test exactly once on the first
    // press; the repeats never reach the bench.
    await page.keyboard.down('1');
    await page.waitForTimeout(700);
    await page.keyboard.up('1');
    await page.waitForTimeout(300);
    expect(await m15Count('test_run')).toBe(1);
    expect(await m15Count('wiring_recorded')).toBe(0);

    const m15 = await validityRecord(page, 'proto_m15_systems_series');

    expect(m15.entered).toBe(true);
    expect(m15.completed).toBe(false);

    // Closing the surface releases the world; the series stays open.
    await press(page, 'Escape');
    await waitSurface(page, false);
    expect(await itemStatus(page, 'M15')).toBe('open');

    const before = await playerX(page);

    await hold(page, 'ArrowLeft', 350);
    expect(Math.abs((await playerX(page)) - before)).toBeGreaterThan(6);
    expectNoRuntimeErrors(errors);
  });
});
