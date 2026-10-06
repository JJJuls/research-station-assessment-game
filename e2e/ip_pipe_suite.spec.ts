/**
 * Information Processing foundation — M13 lattice bench + M18 fault
 * diagnosis (Unit 2; the bench re-expressed for the three-network series
 * of Station 080 Unit 16).
 *
 * Part 1 (pure): the transactional pipe board, the shared connectivity
 * validator on both forms of the v2 geometry (network 1), the fault-form
 * consistency matrix, and the structural independence of the M18 module
 * from M13.
 *
 * Part 2 (browser): the lattice bench with REAL drag/right-click/keyboard
 * input and invalid-action losslessness in its two phases — three first
 * responses with no correctness information, then results and capped
 * practice; the diagnosis console with real pointer and keyboard paths;
 * and the M18 entry-state proof across M13 scored phase completed /
 * completed with practice / stopped / never opened.
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
  commitLatticeByKeyboard,
  commitLatticeByPointer,
  completeLatticeByKeyboard,
  diagnosisProbe,
  dragCellToBench,
  dragPieceToCell,
  eventsOfFamily,
  expectProvisionalOnly,
  holdKey,
  ipEvents,
  ipModule,
  ipValidity,
  LATTICE_LAYOUTS,
  latticeLayout,
  latticeNext,
  pipeBenchPiece,
  pipeCell,
  pipeProbe,
  pipeSeries,
  rightClickRect,
  seatLatticeByPointer,
  waitCellPiece,
  waitDiagnosisOpen,
  waitPipeOpen,
  waitPipeView,
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

const FAMILY = 'proto_m13_networks';
const OPPORTUNITY = 'proto_m13_network_series';
/** No line of the first-response phase may carry a structural result. */
const CORRECTNESS_WORDS =
  /connected|sealed|inline|open branch|test run|test flow/i;

/** n1 form A with a straight where the valve belongs (valve not inline). */
const N1_VALVE_OFF = 'A2:el1@270 A1:el2@90 C1:el3@180 C2:el4@0 B1:st1@0';

const firstResponseEvents = async (page: Page) =>
  JSON.stringify(
    eventsOfFamily(await ipEvents(page), FAMILY).filter(
      (event) => event.event_type === `${FAMILY}_first_response`,
    ),
  );

async function expectNoCorrectnessOnScreen(page: Page) {
  const probe = await pipeProbe(page);

  expect(probe.lines.join('\n')).not.toMatch(CORRECTNESS_WORDS);
  expect(
    probe.buttons
      .map((button) => button.id)
      .filter((id) => /test_flow|practise|finish|back_to_results/.test(id)),
  ).toEqual([]);
}

test.describe('M13 lattice bench (browser)', () => {
  test('mouse: drag, rotate, refused placements; three first responses with no correctness information before the third; results and practice afterwards', async ({
    page,
  }) => {
    test.setTimeout(300_000);

    const errors = captureErrors(page);

    await bootIpLab(page, {
      game_session_id: 'GS_IP_M13_MOUSE',
      ip_form: 'A',
      module: 'm13',
    });
    await waitPipeOpen(page, true);

    let probe = await pipeProbe(page);

    expect(probe.form).toBe('A');
    expect(probe.series).toMatchObject({
      status: 'first_responses',
      view: 'network',
      phase: 'measurement',
      header: 'Network 1 of 3',
      network_id: 'n1',
    });
    expect(probe.cells.find((cell) => cell.slot === 'B2')?.broken).toBe(true);
    expect(probe.cells.find((cell) => cell.slot === 'A2')?.port).toBe('feed');
    expect(probe.bench.filter((entry) => entry.piece_id !== null)).toHaveLength(
      9,
    );
    // There is no flow test in the first-response phase.
    await expectNoCorrectnessOnScreen(page);

    // A drop onto the fractured mount is refused; the piece returns to the
    // bench; nothing else changes.
    await dragPieceToCell(page, 'cap1', 'B2');
    await page.waitForTimeout(200);
    probe = await pipeProbe(page);
    expect(probe.cells.find((cell) => cell.slot === 'B2')?.piece_id).toBeNull();
    expect(probe.held).toBeNull();
    await expect(pipeBenchPiece(page, 'cap1')).resolves.toBeTruthy();

    await seatLatticeByPointer(page, latticeLayout(N1_VALVE_OFF));

    // A drop onto an occupied mount is refused (state lossless).
    await dragPieceToCell(page, 'st2', 'A2');
    await page.waitForTimeout(200);
    await waitCellPiece(page, 'A2', 'el1', 270);
    await expect(pipeBenchPiece(page, 'st2')).resolves.toBeTruthy();

    // RECORD LAYOUT opens a confirmation; KEEP WORKING leaves no answer.
    await clickPipeButton(page, 'record_layout');
    probe = await pipeProbe(page);
    expect(probe.dialog).toBe('layout');
    expect(probe.lines.join('\n')).toMatch(
      /Record this layout as your answer for network 1\? It cannot be changed afterwards\./,
    );
    await clickPipeButton(page, 'cancel_commit');
    probe = await pipeProbe(page);
    expect(probe.dialog).toBeNull();
    expect(probe.series?.answered[0].answered).toBe(false);

    // The run is connected but the valve is not inline: recorded as the
    // answer, acknowledged neutrally — nothing structural is shown.
    await commitLatticeByPointer(page, 'layout');
    probe = await pipeProbe(page);
    expect(probe.feedback).toEqual(['Answer recorded for network 1.']);
    expect(probe.series).toMatchObject({ view: 'acknowledgement' });
    expect(probe.closed).toBe(true);
    await expectNoCorrectnessOnScreen(page);

    await latticeNext(page, 'pointer');
    probe = await pipeProbe(page);
    expect(probe.series).toMatchObject({
      view: 'network',
      network_id: 'n2',
      header: 'Network 2 of 3',
    });
    // A visibly different board: other ports, another fractured mount.
    expect(probe.cells.find((cell) => cell.slot === 'A1')?.port).toBe('feed');
    expect(probe.cells.find((cell) => cell.slot === 'C3')?.port).toBe('intake');
    expect(probe.cells.find((cell) => cell.slot === 'B1')?.broken).toBe(true);
    expect(probe.cells.every((cell) => cell.piece_id === null)).toBe(true);
    await seatLatticeByPointer(
      page,
      latticeLayout(LATTICE_LAYOUTS.A.n2.sealed),
    );
    await commitLatticeByPointer(page, 'layout');
    expect((await pipeProbe(page)).feedback).toEqual([
      'Answer recorded for network 2.',
    ]);
    await expectNoCorrectnessOnScreen(page);
    await latticeNext(page, 'pointer');

    probe = await pipeProbe(page);
    expect(probe.series).toMatchObject({ view: 'network', network_id: 'n3' });
    expect(probe.cells.find((cell) => cell.slot === 'A3')?.port).toBe('intake');
    expect(probe.cells.find((cell) => cell.slot === 'A2')?.broken).toBe(true);
    await commitLatticeByPointer(page, 'cannot_solve');
    probe = await pipeProbe(page);
    expect(probe.feedback).toEqual(['Answer recorded for network 3.']);
    expect(probe.buttons.find((b) => b.id === 'next')?.label).toBe(
      'SHOW RESULTS (ENTER)',
    );
    expect(probe.lines.join('\n')).not.toMatch(CORRECTNESS_WORDS);

    // The scored phase is complete with the third first response.
    let m13 = await ipModule(page, 'm13');

    expect(m13.series_status).toBe('completed');
    expect(m13.window_status).toBe('completed');
    expect((await ipValidity(page, OPPORTUNITY)).validity).toBe('valid');

    const frozen = await firstResponseEvents(page);

    // Results: structural feedback on the three recorded answers.
    await latticeNext(page, 'pointer');
    probe = await pipeProbe(page);
    expect(probe.series).toMatchObject({ view: 'results', phase: 'feedback' });

    const results = probe.lines.join('\n');

    expect(results).toMatch(/All three answers are recorded\./);
    expect(results).toMatch(/Network 1 — recorded answer:/);
    expect(results).toMatch(/Isolation valve: NOT inline\./);
    expect(results).toMatch(/The run is not sealed\./);
    expect(results).toMatch(/The run is sealed\./);
    expect(results).toMatch(/Network 3 — recorded answer: cannot solve\./);
    expect(results).toMatch(/Practice is optional\./);
    expect(
      probe.buttons
        .filter((b) => b.id.startsWith('practise_'))
        .map((b) => b.label),
    ).toEqual([
      'PRACTISE NETWORK 1 (3 test runs left)',
      'PRACTISE NETWORK 2 (3 test runs left)',
      'PRACTISE NETWORK 3 (3 test runs left)',
    ]);

    // Practice on network 1: the board as it stood; swap in the valve.
    await clickPipeButton(page, 'practise_n1');
    await waitPipeView(page, 'practice');
    probe = await pipeProbe(page);
    expect(probe.series?.header).toBe('Network 1 of 3 — practice');
    await waitCellPiece(page, 'B1', 'st1', 0);
    await dragCellToBench(page, 'B1');
    await waitCellPiece(page, 'B1', null);
    await dragPieceToCell(page, 'va1', 'B1');
    await waitCellPiece(page, 'B1', 'va1', 0);
    await clickPipeButton(page, 'test_flow');
    await page.waitForTimeout(300);
    probe = await pipeProbe(page);
    expect(probe.feedback.join(' ')).toMatch(/CONNECTED/);
    expect(probe.feedback.join(' ')).toMatch(/Isolation valve: inline/);
    expect(probe.feedback.join(' ')).toMatch(/Open branches on the run: 0/);
    expect(probe.feedback.at(-1)).toBe(
      'Practice test run 1 of 3. Your recorded answer is unchanged.',
    );

    // Sealing the network in practice changes no first response.
    expect(await firstResponseEvents(page)).toBe(frozen);
    m13 = await ipModule(page, 'm13');

    const networks = m13.networks as {
      first_response: { response_kind: string; correct: boolean };
      practice: { runs_used: number; sealed_in_practice: boolean };
    }[];

    expect(networks.map((network) => network.first_response.correct)).toEqual([
      false,
      true,
      false,
    ]);
    expect(networks[2].first_response.response_kind).toBe('cannot_solve');
    expect(networks[0].practice).toMatchObject({
      runs_used: 1,
      sealed_in_practice: true,
    });
    expect(m13.window_status).toBe('completed');
    // Recorded work: three first responses and one practice test run.
    expect(m13.submission_count).toBe(4);
    expect(m13.pieces_available).toBe(9);

    const events = await ipEvents(page);
    const family = eventsOfFamily(events, FAMILY);
    const types = family.map((event) => event.event_type);
    const countOf = (suffix: string) =>
      types.filter((type) => type === `${FAMILY}_${suffix}`).length;

    expect(countOf('series_opened')).toBe(1);
    expect(countOf('network_presented')).toBe(3);
    expect(countOf('placement_refused')).toBeGreaterThan(0);
    expect(countOf('commit_requested')).toBe(4);
    expect(countOf('commit_cancelled')).toBe(1);
    expect(countOf('first_response')).toBe(3);
    expect(countOf('response_acknowledged')).toBe(3);
    expect(countOf('first_responses_completed')).toBe(1);
    expect(countOf('practice_test_run')).toBe(1);
    // No result or practice record precedes the third first response.
    expect(
      types.findIndex((type) => /results_shown|practice_/.test(type)),
    ).toBeGreaterThan(types.lastIndexOf(`${FAMILY}_first_response`));
    expect(family.every((event) => event.episode === FAMILY)).toBe(true);
    expect(
      family.every(
        (event) => event.metadata?.entry_state_version === 'm13-networks-v1',
      ),
    ).toBe(true);
    expectProvisionalOnly(family);
    // The retired one-network family is not written by this build.
    expect(eventsOfFamily(events, 'proto_m13_lattice')).toHaveLength(0);
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

    const keyboardEvents = eventsOfFamily(await ipEvents(page), FAMILY);
    const placedByKeyboard = keyboardEvents.filter(
      (event) => event.event_type === `${FAMILY}_piece_placed`,
    );

    expect(placedByKeyboard.length).toBeGreaterThan(0);
    expect(
      placedByKeyboard.every((event) => event.metadata?.input_mode === 'typed'),
    ).toBe(true);
    expect(
      placedByKeyboard.every(
        (event) =>
          event.metadata?.network_id === 'n1' &&
          event.metadata?.phase === 'measurement',
      ),
    ).toBe(true);

    // ESC order: a held piece first, then a dialog, then the bench.
    await key('ArrowDown', 3); // B1 → B2 → B3 → bench[1] (st2)
    await key('Space');
    expect((await pipeProbe(page)).held?.piece_id).toBe('st2');
    await key('Escape');
    probe = await pipeProbe(page);
    expect(probe.held).toBeNull();
    expect(probe.open).toBe(true);
    await key('n');
    expect((await pipeProbe(page)).dialog).toBe('cannot_solve');
    await key('Escape');
    probe = await pipeProbe(page);
    expect(probe.dialog).toBeNull();
    expect(probe.open).toBe(true);
    expect(probe.series?.answered.some((entry) => entry.answered)).toBe(false);

    // Stop the task explicitly (Q → ENTER): the series closes as stopped,
    // validity = missing (participant_absent), never "low"; the bench is a
    // read-only record without results or practice.
    await key('q');
    probe = await pipeProbe(page);
    expect(probe.confirm_open).toBe(true);
    expect(probe.dialog).toBe('stop');
    await key('Enter');
    probe = await pipeProbe(page);
    expect(probe.closed).toBe(true);
    expect(probe.series).toMatchObject({ status: 'stopped', view: 'record' });
    expect(probe.lines).toContain(
      'Bench stopped. Recorded answers are kept.\n\nNetwork 1: no answer recorded.\n\nNetwork 2: no answer recorded.\n\nNetwork 3: no answer recorded.',
    );
    await expectNoCorrectnessOnScreen(page);

    const m13 = await ipModule(page, 'm13');

    expect(m13.window_status).toBe('exited');

    const validity = await ipValidity(page, OPPORTUNITY);

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

  test('usability pass: seat/rotate feedback, UNDO and CLEAR by pointer and keyboard, validator untouched', async ({
    page,
  }) => {
    test.setTimeout(200_000);

    const errors = captureErrors(page);

    await bootIpLab(page, {
      game_session_id: 'GS_IP_M13_USABILITY',
      ip_form: 'A',
      module: 'm13',
    });
    await waitPipeOpen(page, true);

    let probe = await pipeProbe(page);

    // Undo/clear are present but inert on an empty board (nothing to revert).
    expect(probe.buttons.find((b) => b.id === 'undo')?.enabled).toBe(false);
    expect(probe.buttons.find((b) => b.id === 'reset')?.enabled).toBe(false);

    // Seating a piece flashes its mount and describes the act in one line.
    await dragPieceToCell(page, 'el1', 'A2');
    await waitCellPiece(page, 'A2', 'el1', 0);
    probe = await pipeProbe(page);
    expect(probe.snap_slot).toBe('A2');
    expect(probe.last_action).toMatch(/Seated .* at A2/);
    expect(probe.undo_available).toBe(true);
    expect(probe.seated_count).toBe(1);

    // Rotation feedback names the mount and the new angle.
    await rightClickRect(page, await pipeCell(page, 'A2'));
    await waitCellPiece(page, 'A2', 'el1', 90);
    probe = await pipeProbe(page);
    expect(probe.last_action).toMatch(/Rotated A2 → 90°/);

    // UNDO (pointer) reverts the rotation only; UNDO (keyboard) the seat.
    await clickPipeButton(page, 'undo');
    await waitCellPiece(page, 'A2', 'el1', 0);
    await page.keyboard.press('u');
    await waitCellPiece(page, 'A2', null);
    await expect(pipeBenchPiece(page, 'el1')).resolves.toBeTruthy();
    probe = await pipeProbe(page);
    expect(probe.undo_available).toBe(false);
    expect(probe.last_action).toMatch(/Undid/);

    // Seat two pieces, CLEAR by keyboard returns both; UNDO restores them.
    await dragPieceToCell(page, 'el1', 'A2');
    await waitCellPiece(page, 'A2', 'el1', 0);
    await dragPieceToCell(page, 'el2', 'A1');
    await waitCellPiece(page, 'A1', 'el2', 0);
    await page.keyboard.press('c');
    await waitCellPiece(page, 'A2', null);
    await waitCellPiece(page, 'A1', null);
    probe = await pipeProbe(page);
    expect(probe.seated_count).toBe(0);
    expect(probe.last_action).toMatch(/Board cleared/);
    await clickPipeButton(page, 'undo');
    await waitCellPiece(page, 'A2', 'el1', 0);
    await waitCellPiece(page, 'A1', 'el2', 0);
    // CLEAR by pointer empties the board again for the sealed run below.
    await clickPipeButton(page, 'reset');
    await waitCellPiece(page, 'A2', null);
    await waitCellPiece(page, 'A1', null);

    // Raw acts are recorded as their own events — never merged, never scored.
    let m13 = await ipModule(page, 'm13');

    expect(m13.undos).toBe(3);
    expect(m13.resets).toBe(2);
    expect(m13.window_status).toBe('open');

    const events = await ipEvents(page);
    const family = eventsOfFamily(events, FAMILY);
    const types = family.map((event) => event.event_type);

    expect(types.filter((t) => t === `${FAMILY}_undone`)).toHaveLength(3);
    expect(types.filter((t) => t === `${FAMILY}_board_reset`)).toHaveLength(2);
    expect(
      family
        .filter((e) => e.event_type === `${FAMILY}_undone`)
        .map((e) => e.metadata?.input_mode),
    ).toEqual(['pointer', 'typed', 'pointer']);
    expectProvisionalOnly(family);

    // The validator is untouched: the same sealed run is recorded as a
    // sealed first response (nothing on screen says so), and the answered
    // board is read-only.
    await seatLatticeByPointer(
      page,
      latticeLayout(LATTICE_LAYOUTS.A.n1.sealed),
    );
    await commitLatticeByPointer(page, 'layout');
    probe = await pipeProbe(page);
    expect(probe.closed).toBe(true);
    expect(probe.feedback).toEqual(['Answer recorded for network 1.']);
    expect(probe.buttons.find((b) => b.id === 'undo')?.enabled).toBe(false);
    await expectNoCorrectnessOnScreen(page);
    m13 = await ipModule(page, 'm13');
    expect(
      (m13.networks as { first_response: { correct: boolean } | null }[])[0]
        .first_response?.correct,
    ).toBe(true);
    // One answer of three: the first-response phase stays open.
    expect(m13.window_status).toBe('open');
    expectNoRuntimeErrors(errors);
  });

  test('practice cap: three test runs per network after any first response; a fourth is refused; first responses unchanged', async ({
    page,
  }) => {
    test.setTimeout(200_000);

    await bootIpLab(page, {
      game_session_id: 'GS_IP_M13_PRACTICE_CAP',
      ip_form: 'A',
      module: 'm13',
    });
    await waitPipeOpen(page, true);
    await completeLatticeByKeyboard(page, 'A', [
      'empty',
      'open',
      'cannot_solve',
    ]);

    const frozen = await firstResponseEvents(page);

    await latticeNext(page);
    await waitPipeView(page, 'results');

    // The same rule after CANNOT SOLVE (3), an unsealed layout (2) and an
    // empty layout (1): three runs, then the board is read-only.
    for (const digit of ['3', '2', '1']) {
      await page.keyboard.press(digit);
      await waitPipeView(page, 'practice');

      for (let run = 1; run <= 4; run++) {
        await page.keyboard.press('t');
        await page.waitForTimeout(200);

        const probe = await pipeProbe(page);

        expect(
          probe.series?.practice_runs.find(
            (entry) => entry.network_id === `n${digit}`,
          )?.runs_used,
        ).toBe(Math.min(run, 3));
        expect(probe.closed).toBe(run >= 3);
      }

      expect((await pipeProbe(page)).feedback.join(' ')).toMatch(
        /Practice test runs used/,
      );
      await page.keyboard.press('b');
      await waitPipeView(page, 'results');
    }

    const probe = await pipeProbe(page);

    expect(
      probe.buttons
        .filter((b) => b.id.startsWith('practise_'))
        .map((b) => b.label),
    ).toEqual([
      'PRACTISE NETWORK 1 (0 test runs left)',
      'PRACTISE NETWORK 2 (0 test runs left)',
      'PRACTISE NETWORK 3 (0 test runs left)',
    ]);

    // FINISH closes the bench; the first responses are as they were.
    await page.keyboard.press('f');
    await page.waitForTimeout(200);
    expect((await pipeProbe(page)).lines.join('\n')).toMatch(
      /All three networks are recorded\. The bench is closed\./,
    );
    expect(await firstResponseEvents(page)).toBe(frozen);

    const m13 = await ipModule(page, 'm13');

    expect(m13.window_status).toBe('completed');
    expect(m13.practice_closed).toBe('finished');
    expect((await ipValidity(page, OPPORTUNITY)).validity).toBe('valid');

    const types = eventsOfFamily(await ipEvents(page), FAMILY).map(
      (event) => event.event_type,
    );

    expect(
      types.filter((type) => type === `${FAMILY}_practice_test_run`),
    ).toHaveLength(9);
    expect(
      types.filter((type) => type === `${FAMILY}_practice_closed`),
    ).toHaveLength(1);
    expect(
      types.filter((type) => type === `${FAMILY}_first_response`),
    ).toHaveLength(3);
  });
});

/* ------------------------------------------------------------------ *
 * M18 + independence
 * ------------------------------------------------------------------ */

async function openDiagnosisFromLab(page: Page) {
  await walkAndUseStation(page, 'm18');
  await waitDiagnosisOpen(page, true);
}

/**
 * The LIVE console state at entry: the pure entry snapshot, the raw M18
 * module fields, and the rendered console (panels/tests/hypotheses/
 * feedback) — everything a participant could perceive or the record could
 * hold. Compared byte-for-byte across the M13 paths.
 */
async function m18Entry(page: Page) {
  const module = await ipModule(page, 'm18');
  const probe = await diagnosisProbe(page);

  return {
    snapshot: module.entry_snapshot,
    raw: {
      form: module.form,
      form_id: module.form_id,
      entry_state_id: module.entry_state_id,
      window_status: module.window_status,
      evidence_panels_viewed: module.evidence_panels_viewed,
      tests_run: module.tests_run,
      hypotheses_selected: module.hypotheses_selected,
      hypotheses_rejected: module.hypotheses_rejected,
      hypothesis_revisions: module.hypothesis_revisions,
      contradictions_present_at_submission:
        module.contradictions_present_at_submission,
      final_diagnosis_id: module.final_diagnosis_id,
      submission_count: module.submission_count,
    },
    console: {
      form: probe.form,
      panels: probe.panels.map((p) => ({ id: p.id, viewed: p.viewed })),
      tests: probe.tests.map((t) => ({ id: t.id, runs: t.runs })),
      hypotheses: probe.hypotheses.map((h) => ({
        id: h.id,
        selected: h.selected,
        rejected: h.rejected,
      })),
      detail_title: probe.detail_title,
      feedback: probe.feedback,
      submit_enabled: probe.submit_enabled,
      closed: probe.closed,
    },
  };
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

    expect(placed.length).toBeGreaterThan(0);
    expect(
      placed.every((event) => event.metadata?.input_mode === 'typed'),
    ).toBe(true);
    expect(family.map((event) => event.event_type)).toContain(
      'proto_m18_fault_submission_refused',
    );
  });

  test('entry-state proof: M13 scored phase completed, completed with practice, stopped and never-opened paths open the SAME M18 state', async ({
    browser,
  }) => {
    test.setTimeout(480_000);

    const snapshots: Record<string, unknown>[] = [];

    // (a) M13 scored phase completed (a sealed layout, CANNOT SOLVE, an
    //     empty layout); results never opened.
    {
      const context = await browser.newContext();
      const page = await context.newPage();

      await bootIpLab(page, {
        game_session_id: 'GS_IP_IND_COMPLETED',
        ip_form: 'A',
      });
      await walkAndUseStation(page, 'm13');
      await waitPipeOpen(page, true);
      await completeLatticeByKeyboard(page, 'A', [
        'sealed',
        'cannot_solve',
        'empty',
      ]);
      expect((await pipeSeries(page)).status).toBe('completed');
      await page.keyboard.press('Escape');
      await waitPipeOpen(page, false);
      await openDiagnosisFromLab(page);
      snapshots.push((await m18Entry(page)) as Record<string, unknown>);
      expect((await ipModule(page, 'm13')).window_status).toBe('completed');
      await context.close();
    }

    // (b) M13 scored phase completed, results opened and practice in
    //     progress: the lattice status never returns to open.
    {
      const context = await browser.newContext();
      const page = await context.newPage();

      await bootIpLab(page, {
        game_session_id: 'GS_IP_IND_PRACTICE',
        ip_form: 'A',
      });
      await walkAndUseStation(page, 'm13');
      await waitPipeOpen(page, true);
      await completeLatticeByKeyboard(page, 'A', ['empty', 'empty', 'empty']);
      await latticeNext(page);
      await waitPipeView(page, 'results');
      await page.keyboard.press('2');
      await waitPipeView(page, 'practice');
      await page.keyboard.press('t');
      await page.waitForTimeout(200);
      expect((await ipModule(page, 'm13')).window_status).toBe('completed');
      await page.keyboard.press('Escape');
      await waitPipeOpen(page, false);
      await openDiagnosisFromLab(page);
      snapshots.push((await m18Entry(page)) as Record<string, unknown>);
      expect((await ipModule(page, 'm13')).window_status).toBe('completed');
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

      // The gate refusal itself is observed (not just "nothing opened").
      const refusal = await page.evaluate(
        () =>
          (window as unknown as { __ipLabFeedback?: string | null })
            .__ipLabFeedback ?? null,
      );

      expect(refusal).toMatch(/Finish or stop the lattice bench first/);

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
      // Re-entry: the seated piece survived, the same network is open and
      // the re-entry was recorded — nothing was presented a second time.
      await waitCellPiece(page, 'A2', 'el1', 0);
      expect((await pipeSeries(page)).network_id).toBe('n1');

      const types = eventsOfFamily(
        await ipEvents(page),
        'proto_m13_networks',
      ).map((event) => event.event_type);

      expect(types).toContain('proto_m13_networks_series_reopened');
      expect(
        types.filter((type) => type === 'proto_m13_networks_network_presented'),
      ).toHaveLength(1);
      await clickPipeButton(page, 'stop');
      await page.keyboard.press('Enter');
      await page.waitForTimeout(200);
      expect((await pipeProbe(page)).closed).toBe(true);
      expect((await pipeSeries(page)).status).toBe('stopped');
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
      ).not.toMatch(/proto_m13|lattice_construction|network_series/);
      await context.close();
    }

    expect(snapshots).toHaveLength(4);

    for (const snapshot of snapshots.slice(1)) {
      expect(snapshot).toEqual(snapshots[0]);
    }

    const first = snapshots[0] as {
      snapshot: Record<string, unknown>;
      console: { closed: boolean; submit_enabled: boolean };
    };

    expect(first.snapshot.m13_dependency).toBe('none');
    expect(first.snapshot.panels_viewed).toEqual([]);
    expect(first.snapshot.selected).toBeNull();
    expect(first.console.closed).toBe(false);
    expect(first.console.submit_enabled).toBe(false);
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

test.describe('form B browser lane', () => {
  test('M13 form B: three rotated networks, a sealed first response on network 1; M18 form B diagnosis', async ({
    page,
  }) => {
    test.setTimeout(300_000);

    await bootIpLab(page, {
      game_session_id: 'GS_IP_FORM_B',
      ip_form: 'B',
      module: 'm13',
    });
    await waitPipeOpen(page, true);

    const ports = async () => {
      const probe = await pipeProbe(page);

      return {
        feed: probe.cells.find((cell) => cell.port === 'feed')?.slot,
        intake: probe.cells.find((cell) => cell.port === 'intake')?.slot,
        fractured: probe.cells
          .filter((cell) => cell.broken)
          .map((cell) => cell.slot),
      };
    };

    expect((await pipeProbe(page)).form).toBe('B');
    // Network 1, form B: the v2 geometry turned by 90° (north → south).
    expect(await ports()).toEqual({
      feed: 'B1',
      intake: 'B3',
      fractured: ['B2'],
    });
    await seatLatticeByPointer(
      page,
      latticeLayout(LATTICE_LAYOUTS.B.n1.sealed),
    );
    await commitLatticeByPointer(page, 'layout');
    await latticeNext(page, 'pointer');

    // Network 2, form B: adjacent sides.
    expect(await ports()).toEqual({
      feed: 'C1',
      intake: 'A3',
      fractured: ['C2'],
    });
    await commitLatticeByKeyboard(page, 'cannot_solve');
    await latticeNext(page);

    // Network 3, form B: both ports on the north side.
    expect(await ports()).toEqual({
      feed: 'C1',
      intake: 'A1',
      fractured: ['B1'],
    });
    await commitLatticeByKeyboard(page, 'layout');

    const m13 = await ipModule(page, 'm13');

    expect(m13.form).toBe('B');
    expect(m13.series_status).toBe('completed');
    expect(
      (
        m13.networks as {
          first_response: { response_kind: string; correct: boolean };
        }[]
      ).map((network) => [
        network.first_response.response_kind,
        network.first_response.correct,
      ]),
    ).toEqual([
      ['layout', true],
      ['cannot_solve', false],
      ['layout', false],
    ]);
    expect(
      eventsOfFamily(await ipEvents(page), 'proto_m13_networks').every(
        (event) => event.metadata?.form_id === 'B',
      ),
    ).toBe(true);
    await page.keyboard.press('Escape');
    await waitPipeOpen(page, false);

    await walkAndUseStation(page, 'm18');
    await waitDiagnosisOpen(page, true);
    expect((await diagnosisProbe(page)).form).toBe('B');
    await clickDiagnosisPanel(page, 'pressure_map');
    await clickDiagnosisRun(page, 'hold_test');
    await clickHypothesis(page, 'feed_restriction', 'select');
    await clickDiagnosisButton(page, 'submit');
    await page.waitForTimeout(300);

    const m18 = await ipModule(page, 'm18');

    expect(m18.final_diagnosis_id).toBe('feed_restriction');
    expect(m18.final_solution_valid).toBe(true);
    expect(m18.contradictions_present_at_submission).toBe(0);
  });
});
