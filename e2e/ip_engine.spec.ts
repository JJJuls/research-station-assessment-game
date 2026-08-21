/**
 * Information Processing foundation — domain engine invariants.
 *
 * Pure, browser-free tests over the signal-command engine: grammar
 * parsing, typed/pointer semantic equivalence, transactional buffer
 * rollback, snapshot round-trips, and the shared workspace evaluator.
 * (Repository convention: domain tests are Playwright specs importing
 * the pure modules directly — inventory_foundation.spec.ts precedent.)
 */

import { expect, test } from '@playwright/test';

import {
  commandsEqual,
  commandToText,
  composeCommand,
  paletteFor,
  parseCommandText,
  tokenizeCommandText,
  validateCommand,
} from '../src/informationProcessing/commands';
import type {
  CommandContext,
  GrammarSpec,
} from '../src/informationProcessing/model';
import {
  appendLine,
  clearProgram,
  createProgramState,
  evaluateWorkspace,
  loadProgramSnapshot,
  moveLine,
  PROGRAM_MAX_LINES,
  removeLine,
  toProgramSnapshot,
} from '../src/informationProcessing/programEngine';

const GRAMMAR: GrammarSpec = {
  id: 'test',
  verbs: [
    {
      verb: 'ROUTE',
      args: [
        { kind: 'fragment', label: 'fragment' },
        { kind: 'destination', label: 'destination' },
      ],
      summary: 'route',
    },
    {
      verb: 'FILTER',
      args: [{ kind: 'fragment', label: 'fragment' }],
      summary: 'filter',
    },
    {
      verb: 'PAIR',
      args: [
        { kind: 'fragment', label: 'fragment', distinct: true },
        { kind: 'fragment', label: 'fragment', distinct: true },
      ],
      summary: 'pair',
    },
    {
      verb: 'SHIFT',
      args: [
        { kind: 'channel', label: 'channel' },
        { kind: 'amount', label: 'amount' },
      ],
      summary: 'shift',
    },
  ],
};

const CONTEXT: CommandContext = {
  sets: {
    fragment: ['P1', 'P2', 'P3'],
    destination: ['ARCHIVE', 'RELAY'],
    channel: ['ALPHA', 'BETA'],
    amount: ['1', '2'],
  },
};

test.describe('command grammar and parser', () => {
  test('typed text and pointer composition yield identical commands', () => {
    const typed = parseCommandText(GRAMMAR, CONTEXT, '  route   p2, relay ');
    const pointer = composeCommand(GRAMMAR, CONTEXT, 'ROUTE', ['P2', 'RELAY']);

    expect(typed.ok).toBe(true);
    expect(pointer.ok).toBe(true);

    if (typed.ok && pointer.ok) {
      expect(commandsEqual(typed.command, pointer.command)).toBe(true);
      expect(typed.command).toEqual({ verb: 'ROUTE', args: ['P2', 'RELAY'] });
      expect(commandToText(typed.command)).toBe('ROUTE P2 RELAY');
    }
  });

  test('tokeniser splits on whitespace and commas', () => {
    expect(tokenizeCommandText('pair p1,  p3')).toEqual(['pair', 'p1', 'p3']);
    expect(tokenizeCommandText('   ')).toEqual([]);
  });

  test('every error class is typed and neutral', () => {
    const cases: [string, string][] = [
      ['', 'empty'],
      ['LAUNCH P1', 'unknown_verb'],
      ['ROUTE P1', 'missing_argument'],
      ['ROUTE P1 RELAY NOW', 'extra_argument'],
      ['ROUTE P9 RELAY', 'unknown_argument'],
      ['PAIR P1 P1', 'duplicate_argument'],
    ];

    for (const [text, error] of cases) {
      const result = parseCommandText(GRAMMAR, CONTEXT, text);

      expect(result.ok, text).toBe(false);

      if (!result.ok) {
        expect(result.error, text).toBe(error);
        expect(result.detail.length, text).toBeGreaterThan(0);
        expect(result.detail).not.toMatch(/wrong|bad|stupid|fail/i);
      }
    }
  });

  test('validation ignores case and surrounding whitespace but not arity', () => {
    const ok = validateCommand(GRAMMAR, CONTEXT, {
      verb: 'shift',
      args: [' beta ', '2'],
    });

    expect(ok).toEqual({
      ok: true,
      command: { verb: 'SHIFT', args: ['BETA', '2'] },
    });
  });

  test('palette lists verbs plus only the labelled argument kinds', () => {
    const palette = paletteFor(GRAMMAR, CONTEXT, {
      destination: 'DESTINATIONS',
      amount: 'AMOUNTS',
    });

    expect(palette[0]).toEqual({
      group: 'COMMANDS',
      values: ['ROUTE', 'FILTER', 'PAIR', 'SHIFT'],
    });
    expect(palette.map((group) => group.group)).toEqual([
      'COMMANDS',
      'DESTINATIONS',
      'AMOUNTS',
    ]);
  });
});

test.describe('transactional program buffer', () => {
  test('deterministic initial state', () => {
    expect(createProgramState()).toEqual({ lines: [], next_seq: 1 });
    expect(createProgramState()).toEqual(createProgramState());
  });

  test('append validates before commit; invalid commands never mutate state', () => {
    const initial = createProgramState();
    const refused = appendLine(
      initial,
      GRAMMAR,
      CONTEXT,
      { verb: 'ROUTE', args: ['P1'] },
      'typed',
    );

    expect(refused.result.ok).toBe(false);
    expect(refused.state).toBe(initial);
    expect(initial.lines).toEqual([]);

    const accepted = appendLine(
      initial,
      GRAMMAR,
      CONTEXT,
      { verb: 'route', args: ['p1', 'archive'] },
      'pointer',
    );

    expect(accepted.result.ok).toBe(true);
    expect(accepted.state).not.toBe(initial);
    expect(initial.lines).toEqual([]);
    expect(accepted.state.lines).toEqual([
      {
        line_id: 'ln_1',
        command: { verb: 'ROUTE', args: ['P1', 'ARCHIVE'] },
        input_mode: 'pointer',
        seq: 1,
      },
    ]);
  });

  test('remove / move / clear are transactional and index-checked', () => {
    let state = createProgramState();

    for (const [fragment, destination] of [
      ['P1', 'ARCHIVE'],
      ['P2', 'RELAY'],
      ['P3', 'RELAY'],
    ]) {
      state = appendLine(
        state,
        GRAMMAR,
        CONTEXT,
        { verb: 'ROUTE', args: [fragment, destination] },
        'typed',
      ).state;
    }

    const badRemove = removeLine(state, 7);

    expect(badRemove.result.ok).toBe(false);
    expect(badRemove.state).toBe(state);

    const moved = moveLine(state, 2, 0);

    expect(moved.result.ok).toBe(true);
    expect(moved.state.lines.map((line) => line.line_id)).toEqual([
      'ln_3',
      'ln_1',
      'ln_2',
    ]);
    expect(state.lines.map((line) => line.line_id)).toEqual([
      'ln_1',
      'ln_2',
      'ln_3',
    ]);

    const removed = removeLine(moved.state, 1);

    expect(removed.state.lines.map((line) => line.line_id)).toEqual([
      'ln_3',
      'ln_2',
    ]);

    const cleared = clearProgram(removed.state);

    expect(cleared.state.lines).toEqual([]);
    expect(cleared.state.next_seq).toBe(4);
    expect(removed.state.lines.length).toBe(2);
  });

  test('buffer is bounded and refuses past the limit without mutation', () => {
    let state = createProgramState();

    for (let index = 0; index < PROGRAM_MAX_LINES; index++) {
      state = appendLine(
        state,
        GRAMMAR,
        CONTEXT,
        { verb: 'FILTER', args: ['P1'] },
        'typed',
      ).state;
    }

    const overflow = appendLine(
      state,
      GRAMMAR,
      CONTEXT,
      { verb: 'FILTER', args: ['P2'] },
      'typed',
    );

    expect(overflow.result.ok).toBe(false);

    if (!overflow.result.ok) {
      expect(overflow.result.reason).toBe('buffer_full');
    }

    expect(overflow.state).toBe(state);
  });

  test('snapshot round-trips and malformed snapshots are refused', () => {
    let state = createProgramState();

    state = appendLine(
      state,
      GRAMMAR,
      CONTEXT,
      { verb: 'PAIR', args: ['P1', 'P3'] },
      'pointer',
    ).state;

    const snapshot = toProgramSnapshot(state);
    const restored = loadProgramSnapshot(JSON.parse(JSON.stringify(snapshot)));

    expect(restored.result.ok).toBe(true);
    expect(restored.state).toEqual(state);
    expect(restored.state).not.toBe(state);

    for (const bad of [
      null,
      42,
      {},
      { version: 2, lines: [], next_seq: 1 },
      { version: 1, lines: [{}], next_seq: 1 },
    ]) {
      const outcome = loadProgramSnapshot(bad);

      expect(outcome.result.ok, JSON.stringify(bad)).toBe(false);
      expect(outcome.state).toEqual(createProgramState());
    }
  });

  test('input mode is recorded per line and does not change semantics', () => {
    const typed = appendLine(
      createProgramState(),
      GRAMMAR,
      CONTEXT,
      { verb: 'route', args: ['p1', 'relay'] },
      'typed',
    ).state;
    const pointer = appendLine(
      createProgramState(),
      GRAMMAR,
      CONTEXT,
      { verb: 'ROUTE', args: ['P1', 'RELAY'] },
      'pointer',
    ).state;

    expect(typed.lines[0].command).toEqual(pointer.lines[0].command);
    expect(typed.lines[0].input_mode).toBe('typed');
    expect(pointer.lines[0].input_mode).toBe('pointer');
    expect(evaluateWorkspace(typed.lines)).toEqual(
      evaluateWorkspace(pointer.lines),
    );
  });
});

test.describe('shared workspace evaluator', () => {
  function program(commands: [string, string[]][]) {
    let state = createProgramState();

    for (const [verb, args] of commands) {
      const outcome = appendLine(
        state,
        GRAMMAR,
        CONTEXT,
        { verb, args },
        'typed',
      );

      expect(outcome.result.ok, `${verb} ${args.join(' ')}`).toBe(true);
      state = outcome.state;
    }

    return state.lines;
  }

  test('last instruction wins and superseded lines are recorded', () => {
    const evaluation = evaluateWorkspace(
      program([
        ['ROUTE', ['P1', 'ARCHIVE']],
        ['ROUTE', ['P2', 'RELAY']],
        ['ROUTE', ['P1', 'RELAY']],
        ['FILTER', ['P2']],
      ]),
    );

    expect(evaluation.routes).toEqual({ P1: 'RELAY', P2: 'DISCARD' });
    expect(evaluation.superseded).toEqual([0, 1]);
    expect(evaluation.notes).toEqual([
      'Line 3 supersedes line 1.',
      'Line 4 supersedes line 2.',
    ]);
  });

  test('a fragment belongs to at most one pair; re-pairing supersedes', () => {
    const evaluation = evaluateWorkspace(
      program([
        ['PAIR', ['P1', 'P2']],
        ['PAIR', ['P2', 'P3']],
      ]),
    );

    expect(evaluation.pairs).toEqual([{ a: 'P2', b: 'P3', line_index: 1 }]);
    expect(evaluation.superseded).toEqual([0]);
  });

  test('shift is per target, last wins, untouched routes unaffected', () => {
    const evaluation = evaluateWorkspace(
      program([
        ['SHIFT', ['BETA', '1']],
        ['SHIFT', ['BETA', '2']],
        ['ROUTE', ['P3', 'ARCHIVE']],
      ]),
    );

    expect(evaluation.shifts).toEqual({ BETA: '2' });
    expect(evaluation.routes).toEqual({ P3: 'ARCHIVE' });
    expect(evaluation.superseded).toEqual([0]);
  });

  test('an empty program evaluates to an empty workspace', () => {
    expect(evaluateWorkspace([])).toEqual({
      routes: {},
      pairs: [],
      shifts: {},
      superseded: [],
      notes: [],
    });
  });
});
