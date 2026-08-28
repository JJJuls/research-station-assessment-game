/**
 * Pure alien-syntax forms + register evaluator (Information Processing
 * foundation, M17).
 *
 * `import.meta`-free for Node-side tests. M17 has its OWN bounded
 * grammar, never reused by M14–M16: three operators over a three-slot
 * register (A B C) holding colour tokens.
 *   VEK <slot> <token>  — the slot becomes the token
 *   ZOR <slot> <slot>   — the two slots exchange tokens
 *   KAI <slot>          — the slot is cleared (NUL)
 * Every case needs exactly two operators. Evidence-led pilot v2 (sheet 09
 * M17: "one demo + one practice + one changed transfer"): each form has
 * ONE practice case (ZOR+VEK — both operators appear in the demonstration
 * as the two "set / exchange" moves) and ONE transfer case (ZOR+KAI — the
 * same length and register, a changed goal, and the KAI operator that the
 * practice never used). No practice reference command recurs in the
 * transfer reference, so the practice's corrective feedback can never
 * hand out a transfer step (scientific review BL-1). Forms are matched
 * case by case in operator mix. Up to M17_MAX_ATTEMPTS attempts per case.
 */

import type { FormId, GrammarSpec, ProgramLine } from './model';

export const M17_SLOTS = ['A', 'B', 'C'] as const;
export const M17_TOKENS = ['RED', 'BLU', 'GRN', 'NUL'] as const;
export const M17_FEEDBACK_TRIALS = 1;
export const M17_TRIALS_TOTAL = 2;
export const M17_MAX_ATTEMPTS = 3;
export const M17_COMMANDS_REQUIRED = 2;

export const M17_GRAMMAR: GrammarSpec = {
  id: 'm17-alien-v1',
  verbs: [
    {
      verb: 'VEK',
      args: [
        { kind: 'slot', label: 'slot' },
        { kind: 'token', label: 'token' },
      ],
      summary: 'VEK <slot> <token> — the slot becomes the token.',
    },
    {
      verb: 'ZOR',
      args: [
        { kind: 'slot', label: 'slot', distinct: true },
        { kind: 'slot', label: 'slot', distinct: true },
      ],
      summary: 'ZOR <slot> <slot> — the two slots exchange tokens.',
    },
    {
      verb: 'KAI',
      args: [{ kind: 'slot', label: 'slot' }],
      summary: 'KAI <slot> — the slot is cleared (NUL).',
    },
  ],
};

export type Register = readonly [string, string, string];

export interface SyntaxTrial {
  index: number;
  type: 'feedback' | 'transfer';
  start: Register;
  goal: Register;
  /** One reference two-command solution (for feedback text only). */
  reference: readonly string[];
}

export interface SyntaxForm {
  demo: readonly { command: string; before: Register; after: Register }[];
  trials: readonly SyntaxTrial[];
}

function trial(
  index: number,
  type: 'feedback' | 'transfer',
  start: Register,
  goal: Register,
  reference: readonly string[],
): SyntaxTrial {
  return { index, type, start, goal, reference };
}

export const M17_FORMS: Record<FormId, SyntaxForm> = {
  A: {
    demo: [
      {
        command: 'VEK B RED',
        before: ['GRN', 'NUL', 'BLU'],
        after: ['GRN', 'RED', 'BLU'],
      },
      {
        command: 'ZOR A C',
        before: ['GRN', 'RED', 'BLU'],
        after: ['BLU', 'RED', 'GRN'],
      },
      {
        command: 'KAI B',
        before: ['BLU', 'RED', 'GRN'],
        after: ['BLU', 'NUL', 'GRN'],
      },
    ],
    trials: [
      trial(
        1,
        'feedback',
        ['RED', 'NUL', 'BLU'],
        ['NUL', 'RED', 'GRN'],
        ['ZOR A B', 'VEK C GRN'],
      ),
      trial(
        2,
        'transfer',
        ['RED', 'BLU', 'GRN'],
        ['GRN', 'NUL', 'RED'],
        ['ZOR A C', 'KAI B'],
      ),
    ],
  },
  B: {
    demo: [
      {
        command: 'VEK A BLU',
        before: ['NUL', 'GRN', 'RED'],
        after: ['BLU', 'GRN', 'RED'],
      },
      {
        command: 'ZOR B C',
        before: ['BLU', 'GRN', 'RED'],
        after: ['BLU', 'RED', 'GRN'],
      },
      {
        command: 'KAI A',
        before: ['BLU', 'RED', 'GRN'],
        after: ['NUL', 'RED', 'GRN'],
      },
    ],
    trials: [
      trial(
        1,
        'feedback',
        ['BLU', 'RED', 'NUL'],
        ['GRN', 'NUL', 'RED'],
        ['ZOR B C', 'VEK A GRN'],
      ),
      trial(
        2,
        'transfer',
        ['GRN', 'RED', 'BLU'],
        ['BLU', 'NUL', 'GRN'],
        ['ZOR A C', 'KAI B'],
      ),
    ],
  },
};

/** Applies the alien operators in buffer order to a start register. */
export function runRegister(
  start: Register,
  lines: readonly ProgramLine[],
): Register {
  const register = [...start] as [string, string, string];
  const slotIndex = (slot: string) =>
    M17_SLOTS.indexOf(slot as (typeof M17_SLOTS)[number]);

  for (const line of lines) {
    const { verb, args } = line.command;

    switch (verb) {
      case 'VEK': {
        const index = slotIndex(args[0]);

        if (index >= 0) {
          register[index] = args[1];
        }

        break;
      }
      case 'ZOR': {
        const a = slotIndex(args[0]);
        const b = slotIndex(args[1]);

        if (a >= 0 && b >= 0) {
          [register[a], register[b]] = [register[b], register[a]];
        }

        break;
      }
      case 'KAI': {
        const index = slotIndex(args[0]);

        if (index >= 0) {
          register[index] = 'NUL';
        }

        break;
      }
      default:
        break;
    }
  }

  return register;
}

export function registersEqual(a: Register, b: Register): boolean {
  return a.every((token, index) => token === b[index]);
}

/**
 * Raw facts of one trial's buffer: goal reached, commands that appear in
 * the reference solution (order-insensitive), and semantic errors (well-
 * formed commands outside the reference solution).
 */
export function evaluateTrial(
  trial: SyntaxTrial,
  lines: readonly ProgramLine[],
) {
  const result = runRegister(trial.start, lines);
  const goalReached = registersEqual(result, trial.goal);
  const reference = new Set(trial.reference);
  let matching = 0;
  let semanticErrors = 0;

  for (const line of lines) {
    const text = [line.command.verb, ...line.command.args].join(' ');

    if (reference.has(text)) {
      matching += 1;
    } else {
      semanticErrors += 1;
    }
  }

  return {
    result,
    goal_reached: goalReached,
    commands_required: M17_COMMANDS_REQUIRED,
    commands_correct: goalReached
      ? M17_COMMANDS_REQUIRED
      : Math.min(matching, M17_COMMANDS_REQUIRED),
    semantic_errors: goalReached ? 0 : semanticErrors,
    command_count: lines.length,
  };
}
