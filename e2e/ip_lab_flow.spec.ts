/**
 * Information Processing Lab — laboratory flow with real browser input.
 *
 * Unit 1 scope: the lab boots, the Analysis Terminal orientation runs
 * end-to-end with drag/drop, click-composition and typed commands, the
 * overlay is modal (world keys inert), ESC leaves without closing the
 * window, DEV direct launch works, and the comprehension-failure path
 * closes the tutorial honestly. Later units extend this file with the
 * full laboratory playthrough.
 */

import { expect, test } from '@playwright/test';

import { M17_FORMS } from '../src/informationProcessing/syntaxForms';
import { playerProbe } from './helpers';
import {
  bootIpLab,
  clickPipeButton,
  clickRect,
  clickTerminalButton,
  composeByClick,
  dragChipToBin,
  dragPieceToCell,
  eventsOfFamily,
  expectBufferTexts,
  expectProvisionalOnly,
  holdKey,
  ipEvents,
  ipModule,
  ipModules,
  ipValidity,
  pipeCell,
  pipeProbe,
  rightClickRect,
  terminalProbe,
  typeCommand,
  waitBufferLength,
  waitCellPiece,
  waitDiagnosisOpen,
  waitPipeOpen,
  waitTerminalOpen,
  walkAndUseStation,
} from './ipHelpers';
import { captureErrors, expectNoRuntimeErrors } from './journey';

test.describe('information processing lab — orientation terminal', () => {
  test('orientation completes with drag, click-composition and typed commands', async ({
    page,
  }) => {
    test.setTimeout(180_000);

    const errors = captureErrors(page);

    await bootIpLab(page, { game_session_id: 'GS_IP_TUT_OK' });
    await walkAndUseStation(page, 'tutorial');
    await waitTerminalOpen(page, true);

    let probe = await terminalProbe(page);

    expect(probe.task).toBe('tutorial');
    expect(probe.stage).toBe('PRACTICE');
    expect(probe.chips.map((chip) => chip.id)).toEqual(['T1', 'T2', 'T3']);
    expect(probe.bins.map((bin) => bin.id)).toEqual(['ARCHIVE', 'RELAY']);
    expect(probe.submit_enabled).toBe(false);

    // 1. Drag T1 onto ARCHIVE (pointer).
    await dragChipToBin(page, 'T1', 'ARCHIVE');
    await waitBufferLength(page, 1);
    await expectBufferTexts(page, ['ROUTE T1 ARCHIVE']);

    // 2. Click-compose ROUTE → T2 → RELAY → ADD (pointer).
    await composeByClick(page, ['ROUTE', 'T2', 'RELAY']);
    await waitBufferLength(page, 2);
    await expectBufferTexts(page, ['ROUTE T1 ARCHIVE', 'ROUTE T2 RELAY']);

    // 3. Type a deliberately inconsistent instruction, then remove it.
    await typeCommand(page, 'ROUTE T3 RELAY');
    await waitBufferLength(page, 3);
    probe = await terminalProbe(page);
    expect(probe.buffer.map((line) => line.input_mode)).toEqual([
      'pointer',
      'pointer',
      'typed',
    ]);
    expect(probe.output[2]).toContain('RELAY');

    const remove = probe.buffer[2].remove;

    expect(remove).not.toBeNull();
    await clickRect(page, remove!);
    await waitBufferLength(page, 2);

    // 4. Type the consistent instruction and submit.
    await typeCommand(page, 'route t3 archive');
    await waitBufferLength(page, 3);
    await expectBufferTexts(page, [
      'ROUTE T1 ARCHIVE',
      'ROUTE T2 RELAY',
      'ROUTE T3 ARCHIVE',
    ]);
    probe = await terminalProbe(page);
    expect(probe.submit_enabled).toBe(true);

    await clickTerminalButton(page, 'submit');
    await page.waitForTimeout(300);
    probe = await terminalProbe(page);
    expect(probe.closed).toBe(true);
    expect(probe.stage).toBe('COMPLETE');
    expect(probe.console[0]).toContain('Orientation complete');
    expect(probe.submit_enabled).toBe(false);

    const tutorial = await ipModule(page, 'tutorial');

    expect(tutorial.status).toBe('complete');
    expect(tutorial.window_status).toBe('completed');
    expect(tutorial.submission_count).toBe(1);
    expect(
      (tutorial.calibration as { pointer_commands: number }).pointer_commands,
    ).toBe(2);
    expect(
      (tutorial.calibration as { typed_commands: number }).typed_commands,
    ).toBe(2);

    const validity = await ipValidity(page, 'proto_ip_terminal_tutorial');

    expect(validity.validity).toBe('valid');
    expect(validity.completed).toBe(true);

    // ESC leaves; the host resumes and movement works again.
    await page.keyboard.press('Escape');
    await waitTerminalOpen(page, false);

    const before = await playerProbe(page);

    await holdKey(page, 'ArrowLeft', 300);

    const after = await playerProbe(page);

    expect(after!.x).toBeLessThan(before!.x - 10);

    // Event family: provisional only, correct modes, tutorial family only.
    const events = await ipEvents(page);
    const family = eventsOfFamily(events, 'proto_ip_tutorial');
    const types = family.map((event) => event.event_type);

    expect(types).toContain('proto_ip_tutorial_window_opened');
    expect(types).toContain('proto_ip_tutorial_line_removed');
    expect(types).toContain('proto_ip_tutorial_submitted');
    expect(types).toContain('proto_ip_tutorial_completed');
    expect(
      family
        .filter(
          (event) => event.event_type === 'proto_ip_tutorial_command_added',
        )
        .map((event) => event.metadata?.input_mode),
    ).toEqual(['pointer', 'pointer', 'typed', 'typed']);
    expect(family.every((event) => event.episode === 'proto_ip_tutorial')).toBe(
      true,
    );
    expectProvisionalOnly(
      events.filter((event) => event.event_type.startsWith('proto_')),
    );
    expect(
      events.some((event) => /^proto_m1[3-8]_/.test(event.event_type)),
    ).toBe(false);

    expectNoRuntimeErrors(errors);
  });

  test('terminal is modal: world keys are inert, ESC clears then leaves, window survives', async ({
    page,
  }) => {
    test.setTimeout(150_000);

    const errors = captureErrors(page);

    await bootIpLab(page, { game_session_id: 'GS_IP_TUT_MODAL' });
    await walkAndUseStation(page, 'tutorial');
    await waitTerminalOpen(page, true);

    const parked = await playerProbe(page);

    // Held arrows / E / Space must not move the player or re-trigger
    // the station while the overlay is open (typed text absorbs them).
    await holdKey(page, 'ArrowRight', 400);
    await holdKey(page, 'e', 160);
    await holdKey(page, 'Space', 160);

    const still = await playerProbe(page);

    expect(Math.abs(still!.x - parked!.x)).toBeLessThan(2);
    expect(Math.abs(still!.y - parked!.y)).toBeLessThan(2);

    // The keystrokes landed in the command line instead.
    let probe = await terminalProbe(page);

    expect(probe.open).toBe(true);
    expect(probe.line.trim().length).toBeGreaterThan(0);

    // First ESC clears the line; the overlay stays.
    await page.keyboard.press('Escape');
    await page.waitForTimeout(200);
    probe = await terminalProbe(page);
    expect(probe.open).toBe(true);
    expect(probe.line).toBe('');

    // Add one line, leave with ESC, come back: the window is still open
    // and the buffer preserved.
    await dragChipToBin(page, 'T2', 'RELAY');
    await waitBufferLength(page, 1);
    await page.keyboard.press('Escape');
    await waitTerminalOpen(page, false);

    let tutorial = await ipModule(page, 'tutorial');

    expect(tutorial.window_status).toBe('open');
    expect(tutorial.status).toBe('in_progress');

    await holdKey(page, 'e', 160);
    await waitTerminalOpen(page, true);
    await expectBufferTexts(page, ['ROUTE T2 RELAY']);
    probe = await terminalProbe(page);
    expect(probe.stage).toBe('PRACTICE');

    const events = await ipEvents(page);

    expect(
      eventsOfFamily(events, 'proto_ip_tutorial').map(
        (event) => event.event_type,
      ),
    ).toEqual(
      expect.arrayContaining([
        'proto_ip_tutorial_window_opened',
        'proto_ip_tutorial_panel_left',
        'proto_ip_tutorial_window_reopened',
      ]),
    );

    // Help is reopenable and counted.
    await clickTerminalButton(page, 'help');
    probe = await terminalProbe(page);
    expect(probe.help_open).toBe(true);
    await page.keyboard.press('Escape');
    await page.waitForTimeout(150);
    probe = await terminalProbe(page);
    expect(probe.help_open).toBe(false);
    expect(probe.open).toBe(true);
    tutorial = await ipModule(page, 'tutorial');
    expect(tutorial.help_consults).toBe(1);

    expectNoRuntimeErrors(errors);
  });

  test('direct DEV launch; comprehension failure closes the orientation honestly', async ({
    page,
  }) => {
    test.setTimeout(150_000);

    const errors = captureErrors(page);

    await bootIpLab(page, {
      game_session_id: 'GS_IP_TUT_FAIL',
      module: 'tutorial',
    });
    await waitTerminalOpen(page, true);

    // Submit is refused until both input paths were demonstrated.
    await dragChipToBin(page, 'T1', 'RELAY');
    await waitBufferLength(page, 1);

    let probe = await terminalProbe(page);

    expect(probe.submit_enabled).toBe(false);
    await typeCommand(page, 'SUBMIT');
    probe = await terminalProbe(page);
    expect(probe.console[0]).toContain('still to try');
    expect(probe.closed).toBe(false);

    await typeCommand(page, 'ROUTE T2 ARCHIVE');
    await typeCommand(page, 'ROUTE T3 RELAY');
    await waitBufferLength(page, 3);

    // Two inconsistent submissions → closed as failed (never "low").
    await typeCommand(page, 'SUBMIT');
    probe = await terminalProbe(page);
    expect(probe.console[0]).toMatch(/0 of 3 routes match/);
    expect(probe.closed).toBe(false);

    await clickTerminalButton(page, 'submit');
    await page.waitForTimeout(300);
    probe = await terminalProbe(page);
    expect(probe.closed).toBe(true);
    expect(probe.stage).toBe('CLOSED');
    expect(probe.console.join(' ')).toContain('closed after two submissions');
    expect(probe.buttons.find((button) => button.id === 'add')?.enabled).toBe(
      false,
    );

    const tutorial = await ipModule(page, 'tutorial');

    expect(tutorial.status).toBe('failed');
    expect(tutorial.window_status).toBe('exhausted');
    expect(tutorial.submission_count).toBe(2);

    const events = await ipEvents(page);
    const family = eventsOfFamily(events, 'proto_ip_tutorial');

    expect(family.map((event) => event.event_type)).toContain(
      'proto_ip_tutorial_failed',
    );
    expect(
      family.filter(
        (event) => event.event_type === 'proto_ip_tutorial_submitted',
      ),
    ).toHaveLength(2);
    expectNoRuntimeErrors(errors);
  });
});

/* ------------------------------------------------------------------ *
 * Unit 5 — complete laboratory playthrough (one session, all stations)
 * ------------------------------------------------------------------ */

test('complete laboratory playthrough: every opportunity valid in one session (typed lane + pointer)', async ({
  page,
}) => {
  test.setTimeout(600_000);

  const errors = captureErrors(page);
  const startedAt = Date.now();

  await bootIpLab(page, { game_session_id: 'GS_IP_FULL_LAB', ip_form: 'A' });

  // Orientation.
  await walkAndUseStation(page, 'tutorial');
  await waitTerminalOpen(page, true);
  await dragChipToBin(page, 'T1', 'ARCHIVE');
  await waitBufferLength(page, 1);
  await typeCommand(page, 'ROUTE T2 RELAY');
  await typeCommand(page, 'ROUTE T3 ARCHIVE');
  await typeCommand(page, 'SUBMIT');
  await page.keyboard.press('Escape');
  await waitTerminalOpen(page, false);

  // M14 (typed lane).
  await walkAndUseStation(page, 'm14');
  await waitTerminalOpen(page, true);

  for (const [id, dest] of [
    ['Q1', 'ARCHIVE'],
    ['Q2', 'RELAY'],
    ['Q3', 'HOLD'],
    ['Q4', 'RELAY'],
  ]) {
    await typeCommand(page, `ROUTE ${id} ${dest}`);
  }

  await typeCommand(page, 'SUBMIT');
  await typeCommand(page, 'BEGIN');

  const scored: [string, string][] = [
    ['P1', 'RELAY'],
    ['P2', 'ARCHIVE'],
    ['P3', 'RELAY'],
    ['P4', 'ARCHIVE'],
    ['P5', 'HOLD'],
    ['P6', 'RELAY'],
    ['P7', 'RELAY'],
    ['P8', 'HOLD'],
    ['P9', 'RELAY'],
    ['P10', 'ARCHIVE'],
    ['P11', 'HOLD'],
    ['P12', 'RELAY'],
  ];

  for (const [id, dest] of scored) {
    await typeCommand(page, `ROUTE ${id} ${dest}`);
  }

  await waitBufferLength(page, 12);
  await typeCommand(page, 'SUBMIT');
  await page.keyboard.press('Escape');
  await waitTerminalOpen(page, false);

  // M15.
  await walkAndUseStation(page, 'm15');
  await waitTerminalOpen(page, true);
  await typeCommand(page, 'PAIR F3 F2');
  await typeCommand(page, 'PAIR F1 F5');
  await typeCommand(page, 'PAIR F6 F4');
  await typeCommand(page, 'SHIFT K2 2');
  await waitBufferLength(page, 4);
  await typeCommand(page, 'SUBMIT');
  await page.keyboard.press('Escape');
  await waitTerminalOpen(page, false);

  // M16.
  await walkAndUseStation(page, 'm16');
  await waitTerminalOpen(page, true);
  await typeCommand(page, 'ROUTE B1 ARCHIVE');
  await typeCommand(page, 'ROUTE B2 RELAY');
  await typeCommand(page, 'ROUTE B3 ARCHIVE');
  await typeCommand(page, 'SUBMIT');
  await typeCommand(page, 'READY');
  await typeCommand(page, 'ACKNOWLEDGE');

  for (const [id, dest] of [
    ['R1', 'RELAY'],
    ['R2', 'HOLD'],
    ['R3', 'ARCHIVE'],
    ['R4', 'HOLD'],
    ['R5', 'HOLD'],
    ['R6', 'RELAY'],
  ]) {
    await typeCommand(page, `ROUTE ${id} ${dest}`);
  }

  await waitBufferLength(page, 6);
  await typeCommand(page, 'SUBMIT');
  await page.keyboard.press('Escape');
  await waitTerminalOpen(page, false);

  // M17.
  await walkAndUseStation(page, 'm17');
  await waitTerminalOpen(page, true);
  await typeCommand(page, 'READY');

  // Sixteen trials (Station 080 Unit 9): two baseline probes, twelve
  // feedback learning trials (NEXT after each), two transfer probes —
  // every reference solution typed.
  for (const trial of M17_FORMS.A.trials) {
    await typeCommand(page, trial.reference[0]);
    await typeCommand(page, trial.reference[1]);
    await waitBufferLength(page, 2);
    await typeCommand(page, 'SUBMIT');

    if (trial.phase === 'learning') {
      await typeCommand(page, 'NEXT');
    }
  }

  await page.keyboard.press('Escape');
  await waitTerminalOpen(page, false);

  // M13 (pointer lane) then M18 (keyboard lane).
  await walkAndUseStation(page, 'm13');
  await waitPipeOpen(page, true);
  await dragPieceToCell(page, 'el1', 'A2');
  await waitCellPiece(page, 'A2', 'el1', 0);

  for (let turn = 0; turn < 3; turn++) {
    await rightClickRect(page, await pipeCell(page, 'A2'));
  }

  await dragPieceToCell(page, 'el2', 'A1');
  await waitCellPiece(page, 'A1', 'el2', 0);
  await rightClickRect(page, await pipeCell(page, 'A1'));
  await dragPieceToCell(page, 'va1', 'B1');
  await dragPieceToCell(page, 'el3', 'C1');
  await waitCellPiece(page, 'C1', 'el3', 0);
  await rightClickRect(page, await pipeCell(page, 'C1'));
  await rightClickRect(page, await pipeCell(page, 'C1'));
  await dragPieceToCell(page, 'el4', 'C2');
  await waitCellPiece(page, 'C2', 'el4', 0);
  await clickPipeButton(page, 'submit');
  await page.waitForTimeout(300);
  expect((await pipeProbe(page)).closed).toBe(true);
  await page.keyboard.press('Escape');
  await waitPipeOpen(page, false);

  await walkAndUseStation(page, 'm18');
  await waitDiagnosisOpen(page, true);
  await page.keyboard.press('Enter'); // E1
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('Enter'); // E3
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('Enter'); // T2
  await page.keyboard.press('3'); // select H3
  await page.waitForTimeout(150);

  for (let i = 0; i < 12; i++) {
    await page.keyboard.press('ArrowDown');
  }

  await page.keyboard.press('Enter'); // submit
  await page.waitForTimeout(300);
  await page.keyboard.press('Escape');
  await waitDiagnosisOpen(page, false);

  const wallMs = Date.now() - startedAt;
  const probe = await ipModules(page);

  for (const id of [
    'proto_ip_terminal_tutorial',
    'proto_m14_packet_saturation',
    'proto_m15_layered_cipher',
    'proto_m16_protocol_update',
    'proto_m17_criterion',
    'proto_m13_lattice_construction',
    'proto_m18_lattice_fault_diagnosis',
  ]) {
    const record = probe.validity.find((r) => r.opportunity_id === id)!;

    expect(record.validity, id).toBe('valid');
    expect(record.completed, id).toBe(true);
  }

  expect(probe.modules.m14.units_correctly_routed).toBe(12);
  expect(probe.modules.m15.final_reconstruction_valid).toBe(true);
  expect(probe.modules.m16.final_applications_correct).toBe(3);
  expect(probe.modules.m17.trials_completed).toBe(16);
  expect(probe.modules.m13.final_network_valid).toBe(true);
  expect(probe.modules.m18.final_solution_valid).toBe(true);

  // Automated wall time (NOT human timing) — recorded for the report.
  test.info().annotations.push({
    type: 'automated_wall_ms',
    description: String(wallMs),
  });
  expect(wallMs).toBeGreaterThan(0);
  expectNoRuntimeErrors(errors);
});
