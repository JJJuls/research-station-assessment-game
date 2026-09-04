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
 * 3. M17 training rig — demonstration → one practice case (corrective
 *    feedback) → one changed transfer case (no reference shown; a wrong
 *    first attempt, a demonstration review, a correct second attempt);
 *    practice data never become transfer data.
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
  openPromptAt,
  PILOT,
  pilotCoverage,
  pilotProbe,
  press,
  routeToLabWork,
} from './pilotHelpers';

const BELOW = { x: 0, y: 44 } as const;

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
    await interactAt(page, at, { approachOffset: BELOW });

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

    // ——— Phase 1 — M15 evidence table ———
    await openBench(page, PILOT.lab.evidenceTable, '__workSurfaceProbe');

    let table = (await surface(page))!;

    expect(table.surface_id).toBe('m15_evidence_table');
    expect(table.elements.find((e) => e.id === 'readout_title')?.label).toBe(
      'WORKED EXAMPLE',
    );

    // Three sources opened (the fourth stays on the table, unread).
    await clickElement(page, 'source_timing');
    await clickElement(page, 'source_states');
    await clickElement(page, 'source_log');
    table = (await surface(page))!;
    expect(table.elements.find((e) => e.id === 'readout_title')?.label).toBe(
      'CASE LOG',
    );

    // Links by pointer: FEED → GATE, CLOCK → GATE.
    await clickElement(page, 'node_FEED');
    await clickElement(page, 'node_GATE');
    await clickElement(page, 'node_CLOCK');
    await clickElement(page, 'node_GATE');
    // Link by keyboard: GATE (pointer focus) → ArrowRight → BUFFER + ENTER.
    await clickElement(page, 'node_GATE');
    await press(page, 'ArrowRight');
    expect((await surface(page))?.focus).toBe('node_BUFFER');
    await press(page, 'Enter');
    // BUFFER → OUTPUT by pointer.
    await clickElement(page, 'node_BUFFER');
    await clickElement(page, 'node_OUTPUT');
    // A wrong link (CLOCK → OUTPUT, ruled out by the log) added, then
    // removed by activating the same pair again — a recorded correction.
    await clickElement(page, 'node_CLOCK');
    await clickElement(page, 'node_OUTPUT');
    table = (await surface(page))!;
    expect(table.links).toHaveLength(5);
    await clickElement(page, 'node_CLOCK');
    await clickElement(page, 'node_OUTPUT');
    table = (await surface(page))!;
    expect(table.links).toHaveLength(4);
    expect(table.links).toEqual(
      expect.arrayContaining([
        { from: 'node_FEED', to: 'node_GATE' },
        { from: 'node_GATE', to: 'node_BUFFER' },
      ]),
    );

    // Predict (hotkey 2): mark BUFFER and OUTPUT; submit (hotkey S).
    await press(page, '2');
    table = (await surface(page))!;
    expect(table.elements.find((e) => e.id === 'board_title')?.label).toMatch(
      /^PREDICT/,
    );
    await clickElement(page, 'node_BUFFER');
    await clickElement(page, 'node_OUTPUT');
    await press(page, 's');
    await page.waitForTimeout(300);
    table = (await surface(page))!;
    expect(table.elements.find((e) => e.id === 'submit')?.label).toBe(
      'RECORDED',
    );
    await press(page, 'Escape');
    await waitSurface(page, false);

    const m15 = await ipModule(page, 'm15');

    expect(m15.window_status).toBe('completed');
    expect(m15.required_causal_edges).toBe(4);
    expect(m15.required_edges_total).toBe(4);
    expect(m15.invalid_edge_count).toBe(0);
    expect(m15.contradictions_present_count).toBe(0);
    expect(m15.contradictions_resolved).toBe(1);
    expect(m15.corrections).toBe(1);
    expect(m15.model_edits).toBe(6);
    expect(m15.evidence_sources_opened_count).toBe(3);
    expect(m15.source_transitions).toBe(2);
    expect(m15.guide_presented).toBe(true);
    expect(m15.intervention_prediction_correct).toBe(true);
    expect(m15.intervention_prediction_consistent_with_own_model).toBe(true);
    expect(m15.submission_complete).toBe(true);
    expect(m15.input_mode).toBe('mixed');
    expect(m15.reading_ms_before_first_edit as number).toBeGreaterThanOrEqual(
      0,
    );
    expect(await itemStatus(page, 'M15')).toBe('completed');

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

    // ——— Phase 3 — M17 training rig ———
    await openBench(page, PILOT.lab.trainingRig, '__ipTerminalProbe');
    terminal = await terminalProbe(page);
    expect(terminal.stage).toBe('DEMONSTRATION');
    expect(terminal.output.join(' ')).toContain('VEK B RED');
    await clickTerminalButton(page, 'READY');
    terminal = await terminalProbe(page);
    expect(terminal.stage).toBe('PRACTICE');

    // Practice, first attempt correct → corrective feedback names the match.
    await typeCommand(page, 'ZOR A B');
    await composeByClick(page, ['VEK', 'C', 'GRN']);
    await waitBufferLength(page, 2);
    await clickTerminalButton(page, 'submit');
    terminal = await terminalProbe(page);
    expect(terminal.console.join(' ')).toMatch(/matches GOAL/);
    expect(terminal.stage).toBe('PRACTICE RECORDED');
    await clickTerminalButton(page, 'NEXT');
    terminal = await terminalProbe(page);
    expect(terminal.stage).toBe('TRANSFER');

    // Transfer, attempt 1 wrong (no reference sequence is ever shown);
    // the demonstration is reviewed once; attempt 2 correct.
    await typeCommand(page, 'ZOR A B');
    await typeCommand(page, 'KAI C');
    await waitBufferLength(page, 2);
    await clickTerminalButton(page, 'submit');
    terminal = await terminalProbe(page);
    expect(terminal.closed).toBe(false);
    expect(terminal.console.join(' ')).toMatch(/attempt 1 recorded/i);
    expect(terminal.console.join(' ')).not.toMatch(/Reference sequence/);
    await clickTerminalButton(page, 'reference');
    await page.waitForTimeout(250);
    await page.keyboard.press('Escape');
    await page.waitForTimeout(250);
    await typeCommand(page, 'CLEAR');
    await typeCommand(page, 'ZOR A C');
    await typeCommand(page, 'KAI B');
    await waitBufferLength(page, 2);
    await clickTerminalButton(page, 'submit');
    await page.waitForTimeout(300);
    terminal = await terminalProbe(page);
    expect(terminal.closed).toBe(true);
    await page.keyboard.press('Escape');
    await waitTerminalOpen(page, false);

    const m17 = await ipModule(page, 'm17');
    const attempts = m17.attempts as Record<string, unknown>[];

    expect(m17.window_status).toBe('completed');
    expect(
      attempts.map((a) => [a.trial_type, a.attempt, a.goal_reached]),
    ).toEqual([
      ['feedback', 1, true],
      ['transfer', 1, false],
      ['transfer', 2, true],
    ]);
    expect(m17.practice_attempts).toBe(1);
    expect(m17.practice_criterion_met).toBe(true);
    expect(m17.transfer_attempts).toBe(2);
    expect(m17.transfer_first_attempt_goal_reached).toBe(false);
    expect(m17.transfer_goal_reached).toBe(true);
    expect(m17.hints_used).toBe(1);
    expect(m17.demonstration_exposures).toBe(2);
    expect(attempts[0].feedback_presented).toBe(true);
    expect(attempts[1].feedback_presented).toBe(false);
    expect(attempts[1].input_mode).toBe('typed');
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
      m15: eventsOfFamily(events, 'proto_m15_cipher'),
      m16: eventsOfFamily(events, 'proto_m16_protocol'),
      m17: eventsOfFamily(events, 'proto_m17_syntax'),
      m18: eventsOfFamily(events, 'proto_m18_fault'),
    };
    const ids = {
      m15: ['proto_m15_layered_cipher', 'm15_causal_w1'],
      m16: ['proto_m16_protocol_update', 'm16_protocol_w1'],
      m17: ['proto_m17_syntax_acquisition', 'm17_transfer_w1'],
      m18: ['proto_m18_lattice_fault_diagnosis', 'm18_diagnosis_w1'],
    } as const;

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
    const all = Object.values(families).flat();

    expect(new Set(all).size).toBe(all.length);
    expect(all.length).toBe(
      events.filter((e) => /^proto_m1[5-8]_/.test(e.event_type)).length,
    );

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
    const activeMs = Object.values(families)
      .map((list) => list.find((e) => e.event_type.endsWith('_completed'))!)
      .reduce((sum, e) => sum + Number(metadata(e).active_ms ?? 0), 0);

    // eslint-disable-next-line no-console
    console.log(
      `signal incident: item-owned active ${Math.round(activeMs / 1000)} s; wall ${Math.round((Date.now() - startedAt) / 1000)} s`,
    );
    expect(activeMs).toBeLessThanOrEqual(235_000);

    // Kai closes the episode.
    await openPromptAt(page, PILOT.lab.kai, {
      approachOffset: { x: 0, y: 44 },
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

    // Evidence table: the world is frozen under the surface.
    await openBench(page, PILOT.lab.evidenceTable, '__workSurfaceProbe');

    const held = await playerX(page);

    await hold(page, 'ArrowRight', 350);
    expect(Math.abs((await playerX(page)) - held)).toBeLessThan(2);

    // A held S (key repeat) with an incomplete model warns exactly once
    // and never records the submission on the repeat.
    await page.keyboard.down('s');
    await page.waitForTimeout(700);
    await page.keyboard.up('s');
    await page.waitForTimeout(300);

    let m15Events = (await getEvents(page)).filter((e) =>
      e.event_type.startsWith('proto_m15_cipher_'),
    );

    expect(
      m15Events.filter(
        (e) => e.event_type === 'proto_m15_cipher_submission_incomplete_warned',
      ),
    ).toHaveLength(1);
    expect(
      m15Events.filter((e) => e.event_type === 'proto_m15_cipher_submitted'),
    ).toHaveLength(0);
    expect((await ipModule(page, 'm15')).window_status).toBe('open');

    // A second distinct press records the incomplete model as it stands —
    // completeness is a raw fact on the record, never a gate.
    await press(page, 's');
    await page.waitForTimeout(300);
    m15Events = (await getEvents(page)).filter((e) =>
      e.event_type.startsWith('proto_m15_cipher_'),
    );
    expect(
      m15Events.filter((e) => e.event_type === 'proto_m15_cipher_submitted'),
    ).toHaveLength(1);

    const m15 = await ipModule(page, 'm15');

    expect(m15.window_status).toBe('completed');
    expect(m15.submission_complete).toBe(false);
    expect(m15.required_causal_edges).toBe(0);
    expect(m15.intervention_prediction_made).toBe(false);

    // Closing the surface releases the world.
    await press(page, 'Escape');
    await waitSurface(page, false);

    const before = await playerX(page);

    await hold(page, 'ArrowLeft', 350);
    expect(Math.abs((await playerX(page)) - before)).toBeGreaterThan(6);
    expectNoRuntimeErrors(errors);
  });
});
