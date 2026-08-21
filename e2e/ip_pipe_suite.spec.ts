/**
 * Information Processing foundation — M13 lattice construction + M18
 * fault diagnosis (Unit 2).
 *
 * Part 1 (pure): the transactional pipe board, the shared connectivity
 * validator on both forms, the fault-form consistency matrix, and the
 * structural independence of the M18 module from M13.
 *
 * Part 2 (browser): the lattice bench with REAL drag/right-click/keyboard
 * input, invalid-action losslessness, explicit submission, bounded
 * closure; the diagnosis console with real pointer and keyboard paths;
 * and the M18 entry-state proof across M13 success / exhaustion / exit /
 * direct launch.
 */

import { readFileSync } from 'node:fs';

import { expect, type Page, test } from '@playwright/test';

import {
  consistentHypotheses,
  contradictionCount,
  M18F_FORMS,
} from '../src/informationProcessing/faultForms';
import {
  createPipeBoardState,
  loadPipeSnapshot,
  M13L_FORMS,
  pipeBenchPieces,
  pipeCancelHeld,
  pipePickUpBench,
  pipePickUpSlot,
  pipePlaceHeld,
  pipeRotateHeld,
  pipeRotateSlot,
  toPipeSnapshot,
} from '../src/informationProcessing/pipeBoardEngine';
import type { M13SlotId } from '../src/measurement/m13PipePuzzle';
import { validatePipePlacements } from '../src/measurement/m13PipePuzzle';
import { playerProbe } from './helpers';
import {
  bootIpLab,
  clickDiagnosisButton,
  clickDiagnosisPanel,
  clickDiagnosisRun,
  clickHypothesis,
  clickPipeButton,
  clickRect,
  diagnosisProbe,
  dragCellToBench,
  dragPieceToCell,
  eventsOfFamily,
  expectProvisionalOnly,
  holdKey,
  ipEvents,
  ipModule,
  ipValidity,
  pipeBenchPiece,
  pipeCell,
  pipeProbe,
  rightClickRect,
  waitCellPiece,
  waitDiagnosisOpen,
  waitPipeOpen,
  walkAndUseStation,
} from './ipHelpers';
import { captureErrors, expectNoRuntimeErrors } from './journey';

/* ------------------------------------------------------------------ *
 * Part 1 — pure
 * ------------------------------------------------------------------ */

const FORM_A = M13L_FORMS.A;
const FORM_B = M13L_FORMS.B;

/** Form A sealed detour: A2 → A1 → B1(valve) → C1 → C2. */
const SOLUTION_A = {
  A2: { piece_id: 'el1', rotation: 270 },
  A1: { piece_id: 'el2', rotation: 90 },
  B1: { piece_id: 'va1', rotation: 0 },
  C1: { piece_id: 'el3', rotation: 180 },
  C2: { piece_id: 'el4', rotation: 0 },
} as const;

/** Form B sealed detour (north feed → south intake): B1 → A1 → A2 → A3 → B3. */
const SOLUTION_B = {
  B1: { piece_id: 'el1', rotation: 270 },
  A1: { piece_id: 'el2', rotation: 90 },
  A2: { piece_id: 'va1', rotation: 90 },
  A3: { piece_id: 'el3', rotation: 0 },
  B3: { piece_id: 'el4', rotation: 180 },
} as const;

test.describe('pipe board engine and validator', () => {
  test('deterministic initial board; bench holds the complete standard set', () => {
    const state = createPipeBoardState();

    expect(state).toEqual({ placements: {}, held: null });
    expect(pipeBenchPieces(state).map((piece) => piece.piece_id)).toEqual([
      'st1',
      'st2',
      'el1',
      'el2',
      'el3',
      'el4',
      'te1',
      'va1',
      'cap1',
    ]);
  });

  test('invalid placements never mutate state (broken mount, occupied mount, not holding)', () => {
    let state = createPipeBoardState();
    const notHolding = pipePlaceHeld(state, 'A1', FORM_A);

    expect(notHolding.result.ok).toBe(false);
    expect(notHolding.state).toBe(state);

    state = pipePickUpBench(state, 'el1').state;
    expect(state.held).toEqual({
      piece_id: 'el1',
      rotation: 0,
      source: 'bench',
    });
    expect(
      pipeBenchPieces(state).some((piece) => piece.piece_id === 'el1'),
    ).toBe(false);

    const broken = pipePlaceHeld(state, 'B2', FORM_A);

    expect(broken.result.ok).toBe(false);
    expect(broken.state).toBe(state);
    expect(state.held?.piece_id).toBe('el1');

    state = pipePlaceHeld(state, 'A1', FORM_A).state;
    state = pipePickUpBench(state, 'st1').state;

    const occupied = pipePlaceHeld(state, 'A1', FORM_A);

    expect(occupied.result.ok).toBe(false);
    expect(occupied.state).toBe(state);
    expect(state.placements.A1).toEqual({ piece_id: 'el1', rotation: 0 });
  });

  test('cancel returns a picked-up seated piece to its mount at its rotation', () => {
    let state = createPipeBoardState();

    state = pipePickUpBench(state, 'el2').state;
    state = pipeRotateHeld(state).state;
    state = pipeRotateHeld(state).state;
    state = pipePlaceHeld(state, 'C1', FORM_A).state;
    expect(state.placements.C1).toEqual({ piece_id: 'el2', rotation: 180 });

    state = pipePickUpSlot(state, 'C1').state;
    expect(state.placements.C1).toBeUndefined();
    expect(state.held).toEqual({
      piece_id: 'el2',
      rotation: 180,
      source: 'C1',
    });

    state = pipeCancelHeld(state).state;
    expect(state.held).toBeNull();
    expect(state.placements.C1).toEqual({ piece_id: 'el2', rotation: 180 });

    state = pipeRotateSlot(state, 'C1').state;
    expect(state.placements.C1?.rotation).toBe(270);
  });

  test('snapshot round-trips; malformed snapshots are refused', () => {
    let state = createPipeBoardState();

    state = pipePickUpBench(state, 'va1').state;
    state = pipePlaceHeld(state, 'B1', FORM_A).state;

    const restored = loadPipeSnapshot(
      JSON.parse(JSON.stringify(toPipeSnapshot(state))),
    );

    expect(restored.result.ok).toBe(true);
    expect(restored.state).toEqual(state);
    expect(
      loadPipeSnapshot({
        version: 1,
        placements: { Z9: { piece_id: 'va1', rotation: 0 } },
      }).result.ok,
    ).toBe(false);
    expect(loadPipeSnapshot(null).result.ok).toBe(false);
  });

  test('connectivity: both forms accept their sealed detour and reject structural faults', () => {
    const a = validatePipePlacements(SOLUTION_A, FORM_A);

    expect(a.valid).toBe(true);
    expect(a.open_branch_count).toBe(0);
    expect(a.valve_inline).toBe(true);
    expect(a.endpoint_connected).toBe(true);

    const b = validatePipePlacements(SOLUTION_B, FORM_B);

    expect(b.valid).toBe(true);
    expect(b.open_branch_count).toBe(0);

    // Forms are matched: same piece count and same constraint structure.
    expect(Object.keys(SOLUTION_A).length).toBe(Object.keys(SOLUTION_B).length);

    // Valve missing (straight in its place) — connected but rejected.
    const noValve = validatePipePlacements(
      { ...SOLUTION_A, B1: { piece_id: 'st1', rotation: 0 } },
      FORM_A,
    );

    expect(noValve.valid).toBe(false);
    expect(noValve.reason).toBe('valve_missing');
    expect(noValve.endpoint_connected).toBe(true);

    // A tee on the run leaves one open end: rejected as an open branch,
    // and the open-branch count reports it.
    const tee = validatePipePlacements(
      { ...SOLUTION_A, C1: { piece_id: 'te1', rotation: 180 } },
      FORM_A,
    );

    expect(tee.valid).toBe(false);
    expect(tee.reason).toBe('open_branch');
    expect(tee.open_branch_count).toBeGreaterThan(0);

    // No path: the intake elbow missing.
    const { C2: _drop, ...withoutIntake } = SOLUTION_A;

    void _drop;

    const noPath = validatePipePlacements(
      withoutIntake as Partial<
        Record<M13SlotId, { piece_id: string; rotation: 0 | 90 | 180 | 270 }>
      >,
      FORM_A,
    );

    expect(noPath.valid).toBe(false);
    expect(noPath.reason).toBe('no_path');
    expect(noPath.endpoint_connected).toBe(false);

    // Nothing seated facing the feed: no path, source not seated.
    const empty = validatePipePlacements({}, FORM_A);

    expect(empty.valid).toBe(false);
    expect(empty.source_seated).toBe(false);
  });
});

test.describe('fault-form consistency and M18 independence', () => {
  for (const formId of ['A', 'B'] as const) {
    test(`form ${formId}: exactly one evidence-consistent hypothesis; every other is contradicted`, () => {
      const form = M18F_FORMS[formId];

      expect(form.hypotheses).toHaveLength(4);
      expect(form.panels.length).toBeGreaterThanOrEqual(3);
      expect(form.tests.length).toBeGreaterThanOrEqual(2);
      expect(consistentHypotheses(form)).toEqual([form.correct]);

      const allPanels = form.panels.map((panel) => panel.id);
      const allTests = form.tests.map((t) => t.id);

      for (const hypothesis of form.hypotheses) {
        const count = contradictionCount(
          form,
          hypothesis.id,
          allPanels,
          allTests,
        );

        if (hypothesis.id === form.correct) {
          expect(count).toBe(0);
        } else {
          expect(count, hypothesis.id).toBeGreaterThanOrEqual(2);
        }
      }

      // Contradictions are only counted for items actually seen.
      const wrong = form.hypotheses.find((h) => h.id !== form.correct)!;

      expect(contradictionCount(form, wrong.id, [], [])).toBe(0);
    });
  }

  test('forms A and B have matched structure', () => {
    const a = M18F_FORMS.A;
    const b = M18F_FORMS.B;

    expect(a.hypotheses.map((h) => h.id)).toEqual(
      b.hypotheses.map((h) => h.id),
    );
    expect(a.panels.map((p) => p.id)).toEqual(b.panels.map((p) => p.id));
    expect(a.tests.map((t) => t.id)).toEqual(b.tests.map((t) => t.id));
    expect(a.rules).toEqual(b.rules);
    expect(a.correct).not.toBe(b.correct);
  });

  test('the M18 modules import nothing from any M13 module', () => {
    for (const file of [
      'src/informationProcessing/m18FaultDiagnosis.ts',
      'src/informationProcessing/faultForms.ts',
    ]) {
      const source = readFileSync(file, 'utf8');
      const importLines = source
        .split('\n')
        .filter(
          (line) =>
            /^\s*(import|export)\b.*from\s+'/.test(line) ||
            /from '[^']+';$/.test(line),
        );

      for (const line of importLines) {
        expect(line, `${file}: ${line}`).not.toMatch(
          /m13|pipeBoardEngine|measurement\//i,
        );
      }
    }
  });
});

/* ------------------------------------------------------------------ *
 * Part 2 — browser
 * ------------------------------------------------------------------ */

async function solveLatticeByMouse(page: Page) {
  await dragPieceToCell(page, 'el1', 'A2');
  await waitCellPiece(page, 'A2', 'el1', 0);

  for (let turn = 0; turn < 3; turn++) {
    await rightClickRect(page, await pipeCell(page, 'A2'));
  }

  await waitCellPiece(page, 'A2', 'el1', 270);
  await dragPieceToCell(page, 'el2', 'A1');
  await waitCellPiece(page, 'A1', 'el2', 0);
  await rightClickRect(page, await pipeCell(page, 'A1'));
  await waitCellPiece(page, 'A1', 'el2', 90);
  await dragPieceToCell(page, 'el3', 'C1');
  await waitCellPiece(page, 'C1', 'el3', 0);
  await rightClickRect(page, await pipeCell(page, 'C1'));
  await rightClickRect(page, await pipeCell(page, 'C1'));
  await waitCellPiece(page, 'C1', 'el3', 180);
  await dragPieceToCell(page, 'el4', 'C2');
  await waitCellPiece(page, 'C2', 'el4', 0);
}

test.describe('M13 lattice bench (browser)', () => {
  test('mouse: drag, rotate, refused placements, premature test, sealed run', async ({
    page,
  }) => {
    test.setTimeout(240_000);

    const errors = captureErrors(page);

    await bootIpLab(page, {
      game_session_id: 'GS_IP_M13_MOUSE',
      ip_form: 'A',
      module: 'm13',
    });
    await waitPipeOpen(page, true);

    let probe = await pipeProbe(page);

    expect(probe.form).toBe('A');
    expect(probe.cells.find((cell) => cell.slot === 'B2')?.broken).toBe(true);
    expect(probe.cells.find((cell) => cell.slot === 'A2')?.port).toBe('feed');
    expect(probe.bench.filter((entry) => entry.piece_id !== null)).toHaveLength(
      9,
    );

    // A drop onto the fractured mount is refused; the piece returns to the
    // bench; nothing else changes.
    await dragPieceToCell(page, 'cap1', 'B2');
    await page.waitForTimeout(200);
    probe = await pipeProbe(page);
    expect(probe.cells.find((cell) => cell.slot === 'B2')?.piece_id).toBeNull();
    expect(probe.held).toBeNull();
    await expect(pipeBenchPiece(page, 'cap1')).resolves.toBeTruthy();

    await solveLatticeByMouse(page);

    // A drop onto an occupied mount is refused (state lossless).
    await dragPieceToCell(page, 'st1', 'A2');
    await page.waitForTimeout(200);
    await waitCellPiece(page, 'A2', 'el1', 270);
    await expect(pipeBenchPiece(page, 'st1')).resolves.toBeTruthy();

    // Premature TEST FLOW with a straight where the valve belongs: the run
    // is connected but the valve is not inline — neutral structural
    // feedback, window stays open, run counted.
    await dragPieceToCell(page, 'st1', 'B1');
    await waitCellPiece(page, 'B1', 'st1', 0);
    await clickPipeButton(page, 'submit');
    await page.waitForTimeout(300);
    probe = await pipeProbe(page);
    expect(probe.closed).toBe(false);
    expect(probe.submissions_used).toBe(1);
    expect(probe.feedback.join(' ')).toMatch(/CONNECTED/);
    expect(probe.feedback.join(' ')).toMatch(/NOT inline/);
    expect(probe.feedback.join(' ')).toMatch(/Open branches on the run: 0/);

    // Drag the straight back to the bench (return), seat the valve, test
    // again → sealed run, window completes.
    await dragCellToBench(page, 'B1');
    await waitCellPiece(page, 'B1', null);
    await dragPieceToCell(page, 'va1', 'B1');
    await waitCellPiece(page, 'B1', 'va1', 0);
    await clickPipeButton(page, 'submit');
    await page.waitForTimeout(300);
    probe = await pipeProbe(page);
    expect(probe.closed).toBe(true);
    expect(probe.feedback.join(' ')).toMatch(/holds pressure/);

    const m13 = await ipModule(page, 'm13');

    expect(m13.window_status).toBe('completed');
    expect(m13.final_network_valid).toBe(true);
    expect(m13.submission_count).toBe(2);
    expect(m13.constraints_total).toBe(3);
    expect(m13.constraints_satisfied_at_submission).toBe(3);
    expect(m13.open_branch_count_at_submission).toBe(0);
    expect(m13.endpoint_connected_at_submission).toBe(true);
    expect(m13.valve_inline_at_submission).toBe(true);
    expect(m13.placements).toBe(6);
    expect(m13.returns).toBe(1);
    expect(m13.rotations).toBe(6);
    expect(m13.pieces_available).toBe(9);
    expect(
      (await ipValidity(page, 'proto_m13_lattice_construction')).validity,
    ).toBe('valid');

    const events = await ipEvents(page);
    const family = eventsOfFamily(events, 'proto_m13_lattice');
    const types = family.map((event) => event.event_type);

    expect(types).toContain('proto_m13_lattice_window_opened');
    expect(types).toContain('proto_m13_lattice_placement_refused');
    expect(
      types.filter((type) => type === 'proto_m13_lattice_submitted'),
    ).toHaveLength(2);
    expect(types).toContain('proto_m13_lattice_completed');
    expect(family.every((event) => event.episode === 'proto_m13_lattice')).toBe(
      true,
    );
    expectProvisionalOnly(family);
    // No M18 event was produced by anything M13 did.
    expect(eventsOfFamily(events, 'proto_m18_fault')).toHaveLength(0);
    expectNoRuntimeErrors(errors);
  });

  test('keyboard parity: the same semantic state as the pointer path; lossless refusals', async ({
    page,
  }) => {
    test.setTimeout(200_000);

    const errors = captureErrors(page);

    await bootIpLab(page, {
      game_session_id: 'GS_IP_M13_KEYS',
      ip_form: 'A',
      module: 'm13',
    });
    await waitPipeOpen(page, true);

    const key = async (name: string, times = 1) => {
      for (let i = 0; i < times; i++) {
        await page.keyboard.press(name);
        await page.waitForTimeout(120);
      }
    };

    // Focus starts at A1. Bench row 0 = st1 st2 el1. Go to el1: Right×2,
    // Down×3 (A1→… C3 → bench[2]).
    await key('ArrowRight', 2);
    await key('ArrowDown', 3);

    let probe = await pipeProbe(page);

    expect(probe.focus).toEqual({ kind: 'bench', id: '2' });
    await key('Space');
    probe = await pipeProbe(page);
    expect(probe.held).toEqual({
      piece_id: 'el1',
      rotation: 0,
      source: 'bench',
    });
    await key('r', 3);
    probe = await pipeProbe(page);
    expect(probe.held?.rotation).toBe(270);

    // Try to seat it on the fractured mount: refused, still held, board
    // unchanged.
    await key('ArrowUp', 2); // C3 → C2
    await key('ArrowLeft'); // B2
    probe = await pipeProbe(page);
    expect(probe.focus).toEqual({ kind: 'cell', id: 'B2' });
    await key('Space');
    probe = await pipeProbe(page);
    expect(probe.held?.piece_id).toBe('el1');
    expect(probe.cells.every((cell) => cell.piece_id === null)).toBe(true);

    // Seat at A2 (Left), then pick st1 from the bench and seat at B1 rotated.
    await key('ArrowLeft');
    await key('Space');
    await waitCellPiece(page, 'A2', 'el1', 270);
    await key('ArrowDown', 2); // A3 → bench[0] (st1)
    probe = await pipeProbe(page);
    expect(probe.focus).toEqual({ kind: 'bench', id: '0' });
    await key('Space');
    await key('r');
    await key('ArrowUp', 3); // A3 → A2 → A1
    await key('ArrowRight'); // B1
    await key('Enter');
    await waitCellPiece(page, 'B1', 'st1', 90);

    // DEL returns the focused seated piece to the bench.
    await key('Delete');
    await waitCellPiece(page, 'B1', null);
    await expect(pipeBenchPiece(page, 'st1')).resolves.toBeTruthy();

    // Mouse does the same two acts in a second lane: final semantic state
    // must match byte for byte (placements map).
    const keyboardState = (await ipModule(page, 'm13')).placements_map;

    expect(keyboardState).toEqual({ A2: { piece_id: 'el1', rotation: 270 } });

    const keyboardEvents = eventsOfFamily(
      await ipEvents(page),
      'proto_m13_lattice',
    );

    expect(
      keyboardEvents
        .filter(
          (event) => event.event_type === 'proto_m13_lattice_piece_placed',
        )
        .every((event) => event.metadata?.input_mode === 'typed'),
    ).toBe(true);

    // Stop the task explicitly (Q → ENTER): the window closes as exited,
    // validity = missing (participant_absent), never "low".
    await key('q');
    probe = await pipeProbe(page);
    expect(probe.confirm_open).toBe(true);
    await key('Enter');
    probe = await pipeProbe(page);
    expect(probe.closed).toBe(true);

    const m13 = await ipModule(page, 'm13');

    expect(m13.window_status).toBe('exited');

    const validity = await ipValidity(page, 'proto_m13_lattice_construction');

    expect(validity.validity).toBe('missing');
    expect(validity.invalid_reason).toBe('participant_absent');
    expect(validity.entered).toBe(true);

    // I leaves the closed bench.
    await key('i');
    await waitPipeOpen(page, false);
    expectNoRuntimeErrors(errors);
  });

  test('pointer path produces the identical semantic state to the keyboard lane', async ({
    page,
  }) => {
    test.setTimeout(120_000);

    await bootIpLab(page, {
      game_session_id: 'GS_IP_M13_MOUSE_LANE',
      ip_form: 'A',
      module: 'm13',
    });
    await waitPipeOpen(page, true);
    await dragPieceToCell(page, 'el1', 'A2');
    await waitCellPiece(page, 'A2', 'el1', 0);

    for (let turn = 0; turn < 3; turn++) {
      await rightClickRect(page, await pipeCell(page, 'A2'));
    }

    await waitCellPiece(page, 'A2', 'el1', 270);
    await dragPieceToCell(page, 'st1', 'B1');
    await waitCellPiece(page, 'B1', 'st1', 0);
    await rightClickRect(page, await pipeCell(page, 'B1'));
    await waitCellPiece(page, 'B1', 'st1', 90);
    await dragCellToBench(page, 'B1');
    await waitCellPiece(page, 'B1', null);

    expect((await ipModule(page, 'm13')).placements_map).toEqual({
      A2: { piece_id: 'el1', rotation: 270 },
    });
  });

  test('bounded closure: four invalid test runs exhaust the window; the station reports review', async ({
    page,
  }) => {
    test.setTimeout(150_000);

    await bootIpLab(page, {
      game_session_id: 'GS_IP_M13_EXHAUST',
      ip_form: 'A',
      module: 'm13',
    });
    await waitPipeOpen(page, true);

    for (let run = 1; run <= 4; run++) {
      await clickPipeButton(page, 'submit');
      await page.waitForTimeout(250);

      const probe = await pipeProbe(page);

      expect(probe.submissions_used).toBe(run);
      expect(probe.closed).toBe(run === 4);
    }

    const probe = await pipeProbe(page);

    expect(probe.feedback.join(' ')).toMatch(/Test runs used/);

    const m13 = await ipModule(page, 'm13');

    expect(m13.window_status).toBe('exhausted');
    expect(m13.final_network_valid).toBe(false);
    expect(
      (await ipValidity(page, 'proto_m13_lattice_construction')).validity,
    ).toBe('valid');
    expect(
      eventsOfFamily(await ipEvents(page), 'proto_m13_lattice')
        .map((event) => event.event_type)
        .filter((type) => type === 'proto_m13_lattice_exhausted'),
    ).toHaveLength(1);
  });
});

/* ------------------------------------------------------------------ *
 * M18 + independence
 * ------------------------------------------------------------------ */

async function openDiagnosisFromLab(page: Page) {
  await walkAndUseStation(page, 'm18');
  await waitDiagnosisOpen(page, true);
}

async function m18Entry(page: Page) {
  return (await ipModule(page, 'm18')).entry_snapshot;
}

test.describe('M18 fault diagnosis (browser)', () => {
  test('mouse: evidence, tests, reversible hypotheses, explicit submission', async ({
    page,
  }) => {
    test.setTimeout(180_000);

    const errors = captureErrors(page);

    await bootIpLab(page, {
      game_session_id: 'GS_IP_M18_MOUSE',
      ip_form: 'A',
      module: 'm18',
    });
    await waitDiagnosisOpen(page, true);

    let probe = await diagnosisProbe(page);

    expect(probe.form).toBe('A');
    expect(probe.panels).toHaveLength(4);
    expect(probe.tests).toHaveLength(3);
    expect(probe.hypotheses).toHaveLength(4);
    expect(probe.submit_enabled).toBe(false);

    // Without a working diagnosis the submit control is visibly disabled
    // and a click does nothing.
    expect(probe.buttons.find((b) => b.id === 'submit')?.enabled).toBe(false);
    await clickDiagnosisButton(page, 'submit');
    probe = await diagnosisProbe(page);
    expect(probe.closed).toBe(false);

    await clickDiagnosisPanel(page, 'pressure_map');
    probe = await diagnosisProbe(page);
    expect(probe.detail_title).toContain('Pressure map');
    expect(probe.detail_lines.join(' ')).toContain('58 kPa');
    await clickDiagnosisPanel(page, 'valve_log');
    await clickDiagnosisRun(page, 'valve_seat_test');
    probe = await diagnosisProbe(page);
    expect(probe.detail_title).toContain('Valve seat test');
    expect(probe.tests.find((t) => t.id === 'valve_seat_test')?.runs).toBe(1);
    await clickDiagnosisRun(page, 'valve_seat_test'); // reversible / repeatable
    await clickDiagnosisButton(page, 'rules');
    probe = await diagnosisProbe(page);
    expect(probe.rules_open).toBe(true);
    expect(probe.detail_title).toContain('Valve seat test'); // readout kept
    await page.keyboard.press('Escape');
    await page.waitForTimeout(150);
    probe = await diagnosisProbe(page);
    expect(probe.rules_open).toBe(false);
    expect(probe.open).toBe(true);

    // Select H2, rule it out (reversible), select H3, submit.
    await clickHypothesis(page, 'valve_seat_leak', 'select');
    probe = await diagnosisProbe(page);
    expect(
      probe.hypotheses.find((h) => h.id === 'valve_seat_leak')?.selected,
    ).toBe(true);
    expect(probe.submit_enabled).toBe(true);
    await clickHypothesis(page, 'valve_seat_leak', 'reject');
    probe = await diagnosisProbe(page);
    expect(
      probe.hypotheses.find((h) => h.id === 'valve_seat_leak')?.rejected,
    ).toBe(true);
    expect(
      probe.hypotheses.find((h) => h.id === 'valve_seat_leak')?.selected,
    ).toBe(false);
    await clickHypothesis(page, 'valve_seat_leak', 'reject'); // un-reject
    probe = await diagnosisProbe(page);
    expect(
      probe.hypotheses.find((h) => h.id === 'valve_seat_leak')?.rejected,
    ).toBe(false);
    await clickHypothesis(page, 'intake_sensor_fault', 'reject');
    await clickHypothesis(page, 'intake_segment_leak', 'card');
    probe = await diagnosisProbe(page);
    expect(
      probe.hypotheses.find((h) => h.id === 'intake_segment_leak')?.selected,
    ).toBe(true);

    await clickDiagnosisButton(page, 'submit');
    await page.waitForTimeout(300);
    probe = await diagnosisProbe(page);
    expect(probe.closed).toBe(true);
    expect(probe.feedback.join(' ')).toContain('logged');

    const m18 = await ipModule(page, 'm18');

    expect(m18.window_status).toBe('completed');
    expect(m18.final_diagnosis_id).toBe('intake_segment_leak');
    expect(m18.final_solution_valid).toBe(true);
    expect(m18.evidence_panels_viewed).toBe(2);
    expect(m18.evidence_view_order).toEqual(['pressure_map', 'valve_log']);
    expect(m18.tests_run).toBe(2);
    expect(m18.test_order).toEqual(['valve_seat_test', 'valve_seat_test']);
    expect(m18.hypotheses_selected).toEqual([
      'valve_seat_leak',
      'intake_segment_leak',
    ]);
    expect(m18.hypotheses_rejected).toEqual(['intake_sensor_fault']);
    expect(m18.contradictions_present_at_submission).toBe(0);
    expect(m18.hypothesis_revisions).toBeGreaterThanOrEqual(2);
    expect(m18.evidence_panels_available).toBe(4);
    expect(m18.tests_available).toBe(3);
    expect(m18.hypotheses_available).toBe(4);
    expect(
      (await ipValidity(page, 'proto_m18_lattice_fault_diagnosis')).validity,
    ).toBe('valid');

    const events = await ipEvents(page);
    const family = eventsOfFamily(events, 'proto_m18_fault');
    const types = family.map((event) => event.event_type);

    expect(types).toContain('proto_m18_fault_window_opened');
    expect(types).not.toContain('proto_m18_fault_submission_refused');
    expect(types).toContain('proto_m18_fault_evidence_viewed');
    expect(types).toContain('proto_m18_fault_test_run');
    expect(types).toContain('proto_m18_fault_hypothesis_rejected');
    expect(types).toContain('proto_m18_fault_hypothesis_unrejected');
    expect(types).toContain('proto_m18_fault_submitted');
    expect(types).toContain('proto_m18_fault_completed');
    expect(family.every((event) => event.episode === 'proto_m18_fault')).toBe(
      true,
    );
    expectProvisionalOnly(family);
    expect(eventsOfFamily(events, 'proto_m13_lattice')).toHaveLength(0);
    expect(JSON.stringify(family)).not.toMatch(
      /proto_m13|lattice_construction/,
    );
    expectNoRuntimeErrors(errors);
  });

  test('keyboard: focus ring, ENTER/X/digits reach the same final state', async ({
    page,
  }) => {
    test.setTimeout(150_000);

    await bootIpLab(page, {
      game_session_id: 'GS_IP_M18_KEYS',
      ip_form: 'A',
      module: 'm18',
    });
    await waitDiagnosisOpen(page, true);

    const key = async (name: string, times = 1) => {
      for (let i = 0; i < times; i++) {
        await page.keyboard.press(name);
        await page.waitForTimeout(120);
      }
    };

    // ENTER on the submit row without a working diagnosis is refused and
    // recorded (neutral); the console stays open.
    await key('ArrowDown', 11);

    let probe = await diagnosisProbe(page);

    expect(probe.focus).toBe('submit:submit');
    await key('Enter');
    probe = await diagnosisProbe(page);
    expect(probe.closed).toBe(false);
    expect(probe.feedback.join(' ')).toMatch(/Select a working diagnosis/);
    await key('ArrowUp', 11);

    // panels[0] focused → ENTER views E1; Down → E2 ENTER; Down×3 → T1
    // ENTER runs; Down×3 → H1 … H4: X rejects H4; '3' selects H3; Down to
    // submit; ENTER.
    await key('Enter');
    await key('ArrowDown');
    await key('Enter');
    await key('ArrowDown', 3);
    probe = await diagnosisProbe(page);
    expect(probe.focus).toBe('test:valve_seat_test');
    await key('Enter');
    await key('Enter');
    await key('ArrowDown', 6);
    probe = await diagnosisProbe(page);
    expect(probe.focus).toBe('hypothesis:intake_sensor_fault');
    await key('x');
    await key('3');
    probe = await diagnosisProbe(page);
    expect(
      probe.hypotheses.find((h) => h.id === 'intake_sensor_fault')?.rejected,
    ).toBe(true);
    expect(
      probe.hypotheses.find((h) => h.id === 'intake_segment_leak')?.selected,
    ).toBe(true);
    await key('ArrowDown', 2);
    probe = await diagnosisProbe(page);
    expect(probe.focus).toBe('submit:submit');
    await key('Enter');
    await page.waitForTimeout(300);

    const m18 = await ipModule(page, 'm18');

    expect(m18.window_status).toBe('completed');
    expect(m18.final_diagnosis_id).toBe('intake_segment_leak');
    expect(m18.evidence_view_order).toEqual(['pressure_map', 'valve_log']);
    expect(m18.test_order).toEqual(['valve_seat_test', 'valve_seat_test']);
    expect(m18.hypotheses_rejected).toEqual(['intake_sensor_fault']);
    expect(m18.contradictions_present_at_submission).toBe(0);

    const family = eventsOfFamily(await ipEvents(page), 'proto_m18_fault');
    const placed = family.filter(
      (event) => event.event_type === 'proto_m18_fault_hypothesis_selected',
    );

    expect(
      placed.every((event) => event.metadata?.input_mode === 'typed'),
    ).toBe(true);
    expect(family.map((event) => event.event_type)).toContain(
      'proto_m18_fault_submission_refused',
    );
  });

  test('entry-state proof: M13 solved, exhausted and never-opened paths open the SAME M18 state', async ({
    browser,
  }) => {
    test.setTimeout(420_000);

    const snapshots: Record<string, unknown>[] = [];

    // (a) M13 solved.
    {
      const context = await browser.newContext();
      const page = await context.newPage();

      await bootIpLab(page, {
        game_session_id: 'GS_IP_IND_SOLVED',
        ip_form: 'A',
      });
      await walkAndUseStation(page, 'm13');
      await waitPipeOpen(page, true);
      await solveLatticeByMouse(page);
      await dragPieceToCell(page, 'va1', 'B1');
      await waitCellPiece(page, 'B1', 'va1', 0);
      await clickPipeButton(page, 'submit');
      await page.waitForTimeout(300);
      expect((await pipeProbe(page)).closed).toBe(true);
      await page.keyboard.press('Escape');
      await waitPipeOpen(page, false);
      await openDiagnosisFromLab(page);
      snapshots.push((await m18Entry(page)) as Record<string, unknown>);
      expect((await ipModule(page, 'm13')).window_status).toBe('completed');
      await context.close();
    }

    // (b) M13 exhausted after four invalid test runs.
    {
      const context = await browser.newContext();
      const page = await context.newPage();

      await bootIpLab(page, {
        game_session_id: 'GS_IP_IND_EXHAUST',
        ip_form: 'A',
      });
      await walkAndUseStation(page, 'm13');
      await waitPipeOpen(page, true);
      await dragPieceToCell(page, 'te1', 'A2');

      for (let run = 0; run < 4; run++) {
        await clickPipeButton(page, 'submit');
        await page.waitForTimeout(200);
      }

      expect((await pipeProbe(page)).closed).toBe(true);
      await page.keyboard.press('Escape');
      await waitPipeOpen(page, false);
      await openDiagnosisFromLab(page);
      snapshots.push((await m18Entry(page)) as Record<string, unknown>);
      expect((await ipModule(page, 'm13')).window_status).toBe('exhausted');
      await context.close();
    }

    // (c) M13 in progress blocks the console (sequencing), then stopping it
    //     (exited) unblocks; M18 state identical.
    {
      const context = await browser.newContext();
      const page = await context.newPage();

      await bootIpLab(page, {
        game_session_id: 'GS_IP_IND_EXIT',
        ip_form: 'A',
      });
      await walkAndUseStation(page, 'm13');
      await waitPipeOpen(page, true);
      await dragPieceToCell(page, 'el1', 'A2');
      await page.keyboard.press('Escape');
      await waitPipeOpen(page, false);
      expect((await ipModule(page, 'm13')).window_status).toBe('open');

      await walkAndUseStation(page, 'm18');
      await page.waitForTimeout(600);

      const blocked = await page.evaluate(
        () =>
          (
            window as unknown as {
              __ipDiagnosisProbe?: { open: boolean } | null;
            }
          ).__ipDiagnosisProbe?.open ?? false,
      );

      expect(blocked).toBe(false);
      expect((await ipModule(page, 'm18')).window_status).toBe('unopened');

      await walkAndUseStation(page, 'm13');
      await waitPipeOpen(page, true);
      await clickPipeButton(page, 'stop');
      await page.keyboard.press('Enter');
      await page.waitForTimeout(200);
      expect((await pipeProbe(page)).closed).toBe(true);
      await page.keyboard.press('Escape');
      await waitPipeOpen(page, false);
      await openDiagnosisFromLab(page);
      snapshots.push((await m18Entry(page)) as Record<string, unknown>);
      expect((await ipModule(page, 'm13')).window_status).toBe('exited');
      await context.close();
    }

    // (d) M13 never opened (direct console launch).
    {
      const context = await browser.newContext();
      const page = await context.newPage();

      await bootIpLab(page, {
        game_session_id: 'GS_IP_IND_DIRECT',
        ip_form: 'A',
        module: 'm18',
      });
      await waitDiagnosisOpen(page, true);
      snapshots.push((await m18Entry(page)) as Record<string, unknown>);
      expect((await ipModule(page, 'm13')).window_status).toBe('unopened');

      // And the M18 family carries no M13 reference at all.
      const events = await ipEvents(page);

      expect(
        JSON.stringify(eventsOfFamily(events, 'proto_m18_fault')),
      ).not.toMatch(/proto_m13|lattice_construction/);
      await context.close();
    }

    expect(snapshots).toHaveLength(4);

    for (const snapshot of snapshots.slice(1)) {
      expect(snapshot).toEqual(snapshots[0]);
    }

    expect(snapshots[0].m13_dependency).toBe('none');
    expect(snapshots[0].panels_viewed).toEqual([]);
    expect(snapshots[0].selected).toBeNull();
  });

  test('console is modal and ESC leaves with the window open', async ({
    page,
  }) => {
    test.setTimeout(120_000);

    await bootIpLab(page, { game_session_id: 'GS_IP_M18_MODAL', ip_form: 'B' });
    await walkAndUseStation(page, 'm18');
    await waitDiagnosisOpen(page, true);

    const parked = await playerProbe(page);

    await holdKey(page, 'ArrowRight', 400);

    const still = await playerProbe(page);

    expect(Math.abs(still!.x - parked!.x)).toBeLessThan(2);

    const probe = await diagnosisProbe(page);

    expect(probe.form).toBe('B');
    await clickRect(page, probe.panels[0]);
    await page.keyboard.press('Escape');
    await waitDiagnosisOpen(page, false);

    const m18 = await ipModule(page, 'm18');

    expect(m18.window_status).toBe('open');
    expect(m18.evidence_panels_viewed).toBe(1);
  });
});
