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
 * 4. M18 diagnostic board — evidence read, a test run twice (redundant),
 *    tags ruled out citing the readout (consistent and inconsistent
 *    citations both recorded), the working diagnosis placed by keyboard
 *    and by drag, one explicit submission.
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
  clickDiagnosisButton,
  clickDiagnosisPanel,
  clickDiagnosisRun,
  clickHypothesis,
  clickRect,
  clickTerminalButton,
  composeByClick,
  diagnosisProbe,
  dragChipToBin,
  dragRectToRect,
  eventsOfFamily,
  expectProvisionalOnly,
  ipModule,
  ipModules,
  ipValidity,
  terminalProbe,
  typeCommand,
  waitBufferLength,
  waitDiagnosisOpen,
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
  probeKey: '__ipTerminalProbe' | '__ipDiagnosisProbe' | '__workSurfaceProbe',
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

    // ——— Phase 2 — M16 protocol console ———
    await openBench(page, PILOT.lab.protocolConsole, '__ipTerminalProbe');

    let terminal = await terminalProbe(page);

    expect(terminal.task).toBe('m16');
    expect(terminal.stage).toBe('FAMILIARISATION');

    // Base protocol from the console's own reference: NORTH → ARCHIVE,
    // SOUTH → RELAY. The origin of every report is read from the routing
    // table preview ("B1  NORTH   → —"), exactly as a participant would.
    const originOf = (probe: { output: string[] }, id: string) => {
      const line = probe.output.find((text) => text.startsWith(`${id} `));
      const match = /\s(NORTH|SOUTH)\s/.exec(line ?? '');

      if (match === null) {
        throw new Error(`no origin for ${id}`);
      }

      return match[1];
    };
    const baseDestination = (origin: string) =>
      origin === 'NORTH' ? 'ARCHIVE' : 'RELAY';

    for (const chip of terminal.chips) {
      await typeCommand(
        page,
        `ROUTE ${chip.id} ${baseDestination(originOf(terminal, chip.id))}`,
      );
    }

    await waitBufferLength(page, 3);
    await clickTerminalButton(page, 'submit');
    await clickTerminalButton(page, 'READY');
    terminal = await terminalProbe(page);
    expect(terminal.stage).toBe('PROTOCOL UPDATE');
    await clickTerminalButton(page, 'ACKNOWLEDGE');
    terminal = await terminalProbe(page);
    expect(terminal.stage).toBe('APPLY UPDATED PROTOCOL');
    expect(terminal.chips).toHaveLength(6);

    // Fresh reports: drag, click-compose and typed aliases converge.
    const applyProbe = terminal;
    const destination = (chip: { id: string; label: string }) =>
      chip.label.includes('!CRITICAL')
        ? 'HOLD'
        : baseDestination(originOf(applyProbe, chip.id));
    const fresh = terminal.chips;

    await dragChipToBin(page, fresh[0].id, destination(fresh[0]));
    await composeByClick(page, ['ROUTE', fresh[1].id, destination(fresh[1])]);

    for (const chip of fresh.slice(2)) {
      await typeCommand(page, `ROUTE ${chip.id} ${destination(chip)}`);
    }

    await waitBufferLength(page, 6);
    await clickTerminalButton(page, 'reference');
    await page.waitForTimeout(250);
    await page.keyboard.press('Escape');
    await page.waitForTimeout(250);
    await clickTerminalButton(page, 'submit');
    await page.waitForTimeout(300);
    terminal = await terminalProbe(page);
    expect(terminal.closed).toBe(true);
    await page.keyboard.press('Escape');
    await waitTerminalOpen(page, false);

    const m16 = await ipModule(page, 'm16');

    expect(m16.window_status).toBe('completed');
    expect(m16.units_correct).toBe(6);
    expect(m16.new_rule_errors).toBe(0);
    expect(m16.first_application_correct).toBe(true);
    expect(m16.codebook_consults_after_rule_presentation).toBe(1);
    expect(m16.input_mode).toBe('mixed');
    expect(await itemStatus(page, 'M16')).toBe('completed');
    display = await signalDisplay(page);
    expect(display?.phases_recorded).toEqual(['m15', 'm16']);
    expect(display?.intercom).toMatch(/register syntax/);

    // ——— Phase 3 — M17 training rig (Station 080 Unit 9) ———
    await openBench(page, PILOT.lab.trainingRig, '__ipTerminalProbe');
    terminal = await terminalProbe(page);
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

    // ——— Phase 4 — M18 diagnostic board ———
    await openBench(page, PILOT.lab.diagnosticBoard, '__ipDiagnosisProbe');

    let board = await diagnosisProbe(page);

    expect(board.form).toBe('A');
    expect(board.hypotheses.every((h) => !h.selected && !h.rejected)).toBe(
      true,
    );

    // Read the pressure map, rule out feed_restriction citing it (consistent).
    await clickDiagnosisPanel(page, 'pressure_map');
    await clickHypothesis(page, 'feed_restriction', 'reject');
    // Run the hold test twice (the second run is redundant), rule out
    // valve_seat_leak citing it (inconsistent: the hold test does not
    // contradict that hypothesis — recorded as such, never scored).
    await clickDiagnosisRun(page, 'hold_test');
    await clickDiagnosisRun(page, 'hold_test');
    await clickHypothesis(page, 'valve_seat_leak', 'reject');
    // Working diagnosis by keyboard (digit 3 = the third tag).
    await page.keyboard.press('3');
    await page.waitForTimeout(250);
    board = await diagnosisProbe(page);
    expect(
      board.hypotheses.find((h) => h.id === 'intake_segment_leak')?.selected,
    ).toBe(true);
    // Drag the last open tag onto RULED OUT (cites the readout: hold test).
    const sensor = board.hypotheses.find(
      (h) => h.id === 'intake_sensor_fault',
    )!;
    const ruledOut = board.zones.find((zone) => zone.id === 'ruled_out')!;

    await dragRectToRect(page, sensor, ruledOut);
    await page.waitForTimeout(300);
    board = await diagnosisProbe(page);
    expect(
      board.hypotheses.find((h) => h.id === 'intake_sensor_fault')?.rejected,
    ).toBe(true);
    expect(board.submit_enabled).toBe(true);
    await clickDiagnosisButton(page, 'submit');
    await page.waitForTimeout(300);
    board = await diagnosisProbe(page);
    expect(board.closed).toBe(true);
    await clickRect(page, board.buttons.find((b) => b.id === 'close')!);
    await waitDiagnosisOpen(page, false);

    const m18 = await ipModule(page, 'm18');
    const rejections = m18.rejections as Record<string, unknown>[];

    expect(m18.window_status).toBe('completed');
    expect(m18.final_diagnosis_id).toBe('intake_segment_leak');
    expect(
      rejections.map((r) => [
        r.hypothesis_id,
        r.cited_evidence,
        r.evidence_consistent,
      ]),
    ).toEqual([
      ['feed_restriction', 'pressure_map', true],
      ['valve_seat_leak', 'hold_test', false],
      ['intake_sensor_fault', 'hold_test', false],
    ]);
    // Two ruled-out hypotheses are contradicted by evidence the
    // participant actually opened (pressure map: feed + valve); one
    // rule-out cited consistent evidence.
    expect(m18.contradictions_eliminated).toBe(2);
    expect(m18.evidence_consistent_steps).toBe(1);
    expect(m18.evidence_inconsistent_steps).toBe(2);
    expect(m18.redundant_tests).toBe(1);
    expect(m18.tests_selected).toEqual(['hold_test']);
    expect(m18.evidence_panels_viewed).toBe(1);
    expect(await itemStatus(page, 'M18')).toBe('completed');
    display = await signalDisplay(page);
    expect(display?.phases_recorded).toEqual(['m15', 'm16', 'm17', 'm18']);
    expect(display?.next_phase).toBeNull();
    expect(display?.indicator).toMatch(/CASE RECORDED/);
    expect(display?.intercom).toMatch(/Case logged/);

    // ——— Whole-case invariants ———
    const events = (await getEvents(page)) as unknown as IpEventLike[];
    const families = {
      m16: eventsOfFamily(events, 'proto_m16_protocol'),
      m17: eventsOfFamily(events, 'proto_m17_trials'),
      m18: eventsOfFamily(events, 'proto_m18_fault'),
    };
    const ids = {
      m16: ['proto_m16_protocol_update', 'm16_protocol_w1'],
      m17: ['proto_m17_criterion', 'm17_trials_w1'],
      m18: ['proto_m18_lattice_fault_diagnosis', 'm18_diagnosis_w1'],
    } as const;

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
    const all = [...Object.values(families).flat(), ...m15Events];

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

    // Straight to the protocol console without the orientation.
    await openBench(page, PILOT.lab.protocolConsole, '__ipTerminalProbe');
    expect((await terminalProbe(page)).task).toBe('m16');

    const flagged = (await getEvents(page)).filter(
      (e) => e.event_type === 'proto_m16_protocol_entry_state_flagged',
    );

    expect(flagged).toHaveLength(1);
    expect((flagged[0].metadata as { reason?: string }).reason).toBe(
      'invalid_entry_state',
    );

    const m16 = await ipValidity(page, 'proto_m16_protocol_update');

    expect(m16.entered).toBe(true);
    expect(m16.invalid_reason).toBe('invalid_entry_state');
    expect(m16.validity).toBe('invalid');
    // The task still runs (invalid ≠ blocked): a command is accepted.
    await typeCommand(page, 'ROUTE B1 ARCHIVE');
    await waitBufferLength(page, 1);
    await clickTerminalButton(page, 'close');
    await waitTerminalOpen(page, false);

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
