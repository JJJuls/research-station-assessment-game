/**
 * Transactional program buffer + generic signal-workspace evaluator
 * (Information Processing foundation).
 *
 * Inventory-engine discipline: every command runs against a structured
 * clone, is validated BEFORE commitment, and returns `{state, result}`;
 * on any failure the returned state is the untouched input state, so a
 * refused command can never mutate the buffer. Snapshots are plain JSON.
 *
 * The evaluator applies the shared verb semantics that the routing /
 * pairing / shifting tasks share (ROUTE, FILTER, PAIR, SHIFT). Module
 * files interpret the resulting workspace against their own task
 * definitions; nothing here computes a score.
 */

import { validateCommand } from './commands';
import type {
  CommandContext,
  GrammarSpec,
  InputMode,
  ProgramFailure,
  ProgramLine,
  ProgramOutcome,
  ProgramSnapshotV1,
  ProgramState,
} from './model';

export const PROGRAM_MAX_LINES = 24;

export function createProgramState(): ProgramState {
  return { lines: [], next_seq: 1 };
}

function refuse(
  state: ProgramState,
  reason: ProgramFailure,
  detail: string,
): ProgramOutcome {
  return { state, result: { ok: false, reason, detail } };
}

/**
 * Appends one command after validating it through the shared grammar
 * path. `mode` records how the command reached the engine; the engine
 * treats both modes identically.
 */
export function appendLine(
  state: ProgramState,
  grammar: GrammarSpec,
  context: CommandContext,
  raw: { verb: string; args: readonly string[] },
  mode: InputMode,
  maxLines = PROGRAM_MAX_LINES,
): ProgramOutcome {
  const parsed = validateCommand(grammar, context, raw);

  if (!parsed.ok) {
    return refuse(state, parsed.error, parsed.detail);
  }

  if (state.lines.length >= maxLines) {
    return refuse(
      state,
      'buffer_full',
      `The program buffer holds at most ${maxLines} lines.`,
    );
  }

  const draft = structuredClone(state);
  const line: ProgramLine = {
    line_id: `ln_${draft.next_seq}`,
    command: parsed.command,
    input_mode: mode,
    seq: draft.next_seq,
  };

  draft.lines.push(line);
  draft.next_seq += 1;

  return {
    state: draft,
    result: {
      ok: true,
      detail: { line_id: line.line_id, index: draft.lines.length - 1 },
    },
  };
}

export function removeLine(state: ProgramState, index: number): ProgramOutcome {
  if (!Number.isInteger(index) || index < 0 || index >= state.lines.length) {
    return refuse(
      state,
      'bad_index',
      `There is no line ${index + 1} in the buffer.`,
    );
  }

  const draft = structuredClone(state);
  const [removed] = draft.lines.splice(index, 1);

  return {
    state: draft,
    result: { ok: true, detail: { line_id: removed.line_id, index } },
  };
}

export function moveLine(
  state: ProgramState,
  from: number,
  to: number,
): ProgramOutcome {
  const valid = (index: number) =>
    Number.isInteger(index) && index >= 0 && index < state.lines.length;

  if (!valid(from) || !valid(to)) {
    return refuse(state, 'bad_index', 'Line positions are out of range.');
  }

  const draft = structuredClone(state);
  const [line] = draft.lines.splice(from, 1);

  draft.lines.splice(to, 0, line);

  return { state: draft, result: { ok: true, detail: { from, to } } };
}

export function clearProgram(state: ProgramState): ProgramOutcome {
  const draft = structuredClone(state);
  const cleared = draft.lines.length;

  draft.lines = [];

  return { state: draft, result: { ok: true, detail: { cleared } } };
}

export function toProgramSnapshot(state: ProgramState): ProgramSnapshotV1 {
  return {
    version: 1,
    lines: structuredClone(state.lines),
    next_seq: state.next_seq,
  };
}

function isLine(value: unknown): value is ProgramLine {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const line = value as Record<string, unknown>;
  const command = line.command as Record<string, unknown> | undefined;

  return (
    typeof line.line_id === 'string' &&
    typeof line.seq === 'number' &&
    (line.input_mode === 'pointer' || line.input_mode === 'typed') &&
    command !== undefined &&
    typeof command.verb === 'string' &&
    Array.isArray(command.args) &&
    command.args.every((arg) => typeof arg === 'string')
  );
}

/**
 * Restores a snapshot. A malformed snapshot yields `ok: false` and a
 * FRESH state — callers keep their current state on failure (store
 * precedent).
 */
export function loadProgramSnapshot(raw: unknown): ProgramOutcome {
  const fresh = createProgramState();

  if (typeof raw !== 'object' || raw === null) {
    return refuse(fresh, 'bad_index', 'Snapshot is not an object.');
  }

  const snapshot = raw as Record<string, unknown>;

  if (
    snapshot.version !== 1 ||
    !Array.isArray(snapshot.lines) ||
    !snapshot.lines.every(isLine) ||
    typeof snapshot.next_seq !== 'number'
  ) {
    return refuse(fresh, 'bad_index', 'Snapshot shape is not recognised.');
  }

  return {
    state: {
      lines: structuredClone(snapshot.lines as ProgramLine[]),
      next_seq: snapshot.next_seq as number,
    },
    result: { ok: true },
  };
}

/* ------------------------------------------------------------------ *
 * Shared workspace semantics
 * ------------------------------------------------------------------ */

export const DISCARD_DESTINATION = 'DISCARD';

export interface WorkspaceEvaluation {
  /** Effective destination per fragment (last instruction wins). */
  routes: Record<string, string>;
  /** Effective pairs; a fragment belongs to at most one pair. */
  pairs: { a: string; b: string; line_index: number }[];
  /** Effective shift per target (last instruction wins). */
  shifts: Record<string, string>;
  /** Line indices whose instruction a later line superseded. */
  superseded: number[];
  /** Neutral console notes (line numbers are 1-based for display). */
  notes: string[];
}

/**
 * Applies ROUTE / FILTER / PAIR / SHIFT in buffer order. Later
 * instructions on the same target supersede earlier ones (recorded, not
 * refused, so a participant can revise by adding as well as by
 * removing). Verbs outside this set are ignored here — modules with
 * their own grammar evaluate them themselves.
 */
export function evaluateWorkspace(
  lines: readonly ProgramLine[],
): WorkspaceEvaluation {
  const routes: Record<string, string> = {};
  const routeLine: Record<string, number> = {};
  const pairs: { a: string; b: string; line_index: number }[] = [];
  const shifts: Record<string, string> = {};
  const shiftLine: Record<string, number> = {};
  const superseded: number[] = [];
  const notes: string[] = [];

  const supersede = (previous: number | undefined, current: number) => {
    if (previous !== undefined) {
      superseded.push(previous);
      notes.push(`Line ${current + 1} supersedes line ${previous + 1}.`);
    }
  };

  lines.forEach((line, index) => {
    const { verb, args } = line.command;

    switch (verb) {
      case 'ROUTE': {
        const [fragment, destination] = args;

        supersede(routeLine[fragment], index);
        routes[fragment] = destination;
        routeLine[fragment] = index;
        break;
      }
      case 'FILTER': {
        const [fragment] = args;

        supersede(routeLine[fragment], index);
        routes[fragment] = DISCARD_DESTINATION;
        routeLine[fragment] = index;
        break;
      }
      case 'PAIR': {
        const [a, b] = args;

        for (let i = pairs.length - 1; i >= 0; i--) {
          const pair = pairs[i];

          if ([pair.a, pair.b].some((id) => id === a || id === b)) {
            supersede(pair.line_index, index);
            pairs.splice(i, 1);
          }
        }

        pairs.push({ a, b, line_index: index });
        break;
      }
      case 'SHIFT': {
        const [target, amount] = args;

        supersede(shiftLine[target], index);
        shifts[target] = amount;
        shiftLine[target] = index;
        break;
      }
      default:
        break;
    }
  });

  return { routes, pairs, shifts, superseded, notes };
}
