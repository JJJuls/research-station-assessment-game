/**
 * Pure alien-syntax forms + register evaluator (Information Processing
 * foundation, M17 — Station 080 Unit 9 trial structure).
 *
 * `import.meta`-free for Node-side tests. M17 has its OWN bounded
 * grammar, never reused by M14–M16: three operators over a three-slot
 * register (A B C) holding colour tokens.
 *   VEK <slot> <token>  — the slot becomes the token
 *   ZOR <slot> <slot>   — the two slots exchange tokens
 *   KAI <slot>          — the slot is cleared (NUL)
 * Every case needs exactly two operators (no case is solvable with one).
 *
 * Trial structure (register M17 row, matrix, `PILOT_SETTINGS`): after the
 * demonstration, TWO uncoached baseline probes (no preview, no feedback),
 * TWELVE feedback learning trials (all twelve always run) and TWO
 * transfer probes (no preview, no feedback) — sixteen trials, one first
 * response each. The criterion event is the first learning trial ending a
 * run of three consecutive correct first responses (`m17Criterion`).
 *
 * Forms: form A is written out; form B is DERIVED from it by a fixed slot
 * relabelling (A→C, B→A, C→B) and token relabelling (RED→GRN, GRN→BLU,
 * BLU→RED, NUL fixed), so every structural property — operator mix per
 * trial, two operators required, goal ≠ start — is shared by
 * construction while no register or command recurs verbatim.
 */

import type { FormId, GrammarSpec, ProgramLine } from './model';

export const M17_SLOTS = ['A', 'B', 'C'] as const;
export const M17_TOKENS = ['RED', 'BLU', 'GRN', 'NUL'] as const;
export const M17_BASELINE_TRIALS = 2;
export const M17_LEARNING_TRIALS = 12;
export const M17_TRANSFER_TRIALS = 2;
export const M17_TRIALS_TOTAL =
  M17_BASELINE_TRIALS + M17_LEARNING_TRIALS + M17_TRANSFER_TRIALS;
export const M17_CRITERION_RUN = 3;
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
export type M17Phase = 'baseline' | 'learning' | 'transfer';

export interface SyntaxTrial {
  /** 1–16 across the whole series. */
  index: number;
  phase: M17Phase;
  /** 1-based index within the phase. */
  phase_index: number;
  start: Register;
  goal: Register;
  /** One reference two-command solution (learning feedback text only). */
  reference: readonly string[];
}

export interface SyntaxDemo {
  command: string;
  before: Register;
  after: Register;
}

export interface SyntaxForm {
  demo: readonly SyntaxDemo[];
  trials: readonly SyntaxTrial[];
}

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

/** Program lines from reference texts ("ZOR A B"). */
export function linesOf(texts: readonly string[]): ProgramLine[] {
  return texts.map((text, seq) => {
    const [verb, ...args] = text.split(' ');

    return {
      line_id: `ref_${seq}`,
      seq,
      input_mode: 'typed' as const,
      command: { verb, args },
    };
  });
}

// ——— form A (written out) ———————————————————————————————————————————————

const DEMO_A: readonly { command: string; before: Register }[] = [
  { command: 'VEK B RED', before: ['GRN', 'NUL', 'BLU'] },
  { command: 'ZOR A C', before: ['GRN', 'RED', 'BLU'] },
  { command: 'KAI B', before: ['BLU', 'RED', 'GRN'] },
];

/**
 * (phase, start, reference) — the goal is computed by running the
 * reference. Every baseline and transfer probe changes all three slots, so
 * none can be solved by setting / clearing slots one by one (an exchange is
 * needed); learning items mix two- and three-slot changes so every operator
 * is practised. No transfer pair or goal recurs from the learning series.
 */
const TRIALS_A: readonly [M17Phase, Register, string, string][] = [
  ['baseline', ['RED', 'NUL', 'BLU'], 'ZOR A B', 'VEK C GRN'],
  ['baseline', ['GRN', 'BLU', 'RED'], 'ZOR A B', 'KAI C'],
  ['learning', ['BLU', 'GRN', 'NUL'], 'VEK C RED', 'ZOR A C'],
  ['learning', ['RED', 'BLU', 'NUL'], 'ZOR A C', 'KAI B'],
  ['learning', ['NUL', 'RED', 'GRN'], 'VEK A BLU', 'KAI C'],
  ['learning', ['GRN', 'GRN', 'RED'], 'ZOR B C', 'VEK A BLU'],
  ['learning', ['RED', 'NUL', 'GRN'], 'KAI A', 'ZOR B C'],
  ['learning', ['BLU', 'RED', 'GRN'], 'VEK B BLU', 'VEK C RED'],
  ['learning', ['GRN', 'NUL', 'BLU'], 'ZOR A C', 'KAI A'],
  ['learning', ['NUL', 'BLU', 'RED'], 'VEK A GRN', 'ZOR B C'],
  ['learning', ['RED', 'GRN', 'BLU'], 'KAI B', 'VEK A GRN'],
  ['learning', ['BLU', 'RED', 'NUL'], 'ZOR A B', 'ZOR B C'],
  ['learning', ['GRN', 'RED', 'GRN'], 'VEK C BLU', 'KAI A'],
  ['learning', ['NUL', 'GRN', 'RED'], 'ZOR A B', 'KAI C'],
  ['transfer', ['GRN', 'NUL', 'RED'], 'VEK B BLU', 'ZOR A C'],
  ['transfer', ['RED', 'GRN', 'NUL'], 'ZOR A C', 'ZOR A B'],
];

const SLOT_MAP_B: Record<string, string> = { A: 'C', B: 'A', C: 'B' };
const TOKEN_MAP_B: Record<string, string> = {
  RED: 'GRN',
  GRN: 'BLU',
  BLU: 'RED',
  NUL: 'NUL',
};

function relabelRegister(register: Register): Register {
  const out: [string, string, string] = ['', '', ''];

  M17_SLOTS.forEach((slot, index) => {
    out[M17_SLOTS.indexOf(SLOT_MAP_B[slot] as (typeof M17_SLOTS)[number])] =
      TOKEN_MAP_B[register[index]];
  });

  return out;
}

function relabelCommand(text: string): string {
  const [verb, ...args] = text.split(' ');

  return [
    verb,
    ...args.map((arg) =>
      arg in SLOT_MAP_B ? SLOT_MAP_B[arg] : (TOKEN_MAP_B[arg] ?? arg),
    ),
  ].join(' ');
}

function buildForm(
  demo: readonly { command: string; before: Register }[],
  trials: readonly [M17Phase, Register, string, string][],
): SyntaxForm {
  const counters: Record<M17Phase, number> = {
    baseline: 0,
    learning: 0,
    transfer: 0,
  };

  return {
    demo: demo.map((example) => ({
      command: example.command,
      before: example.before,
      after: runRegister(example.before, linesOf([example.command])),
    })),
    trials: trials.map(([phase, start, first, second], i) => {
      counters[phase] += 1;

      const reference = [first, second];

      return {
        index: i + 1,
        phase,
        phase_index: counters[phase],
        start,
        goal: runRegister(start, linesOf(reference)),
        reference,
      };
    }),
  };
}

export const M17_FORMS: Record<FormId, SyntaxForm> = {
  A: buildForm(DEMO_A, TRIALS_A),
  B: buildForm(
    DEMO_A.map((example) => ({
      command: relabelCommand(example.command),
      before: relabelRegister(example.before),
    })),
    TRIALS_A.map(([phase, start, first, second]) => [
      phase,
      relabelRegister(start),
      relabelCommand(first),
      relabelCommand(second),
    ]),
  ),
};

/** Slots whose token differs between two registers (structural tests). */
export function slotsChanged(a: Register, b: Register): number {
  return a.filter((token, index) => token !== b[index]).length;
}

/** Every well-formed single command of the grammar (structural tests). */
export function allSingleCommands(): string[] {
  const out: string[] = [];

  for (const slot of M17_SLOTS) {
    for (const token of M17_TOKENS) {
      out.push(`VEK ${slot} ${token}`);
    }

    for (const other of M17_SLOTS) {
      if (other !== slot) {
        out.push(`ZOR ${slot} ${other}`);
      }
    }

    out.push(`KAI ${slot}`);
  }

  return out;
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

export interface M17CriterionResult {
  /** Learning-trial index (1–12) ending the first run of three, or 12 when never attained on a full series, null when incomplete. */
  criterion_trial: number | null;
  attained: boolean;
  /** Twelve responses without attainment (the value 12 is a censoring bound). */
  censored: boolean;
  /** Fewer than twelve learning responses without attainment. */
  incomplete: boolean;
  /** Every learning trial was answered. */
  complete_sequence: boolean;
  responses: number;
}

/**
 * The criterion event from the LEARNING first-response sequence alone
 * (register `m17_criterion_trial`): the first learning trial ending a run
 * of `M17_CRITERION_RUN` consecutive correct responses. Attainment within
 * the administered trials is reported whatever came after (an early exit
 * leaves `complete_sequence` false); twelve responses without attainment
 * ⇒ (12, false, censored); fewer without attainment ⇒ incomplete.
 */
export function m17Criterion(
  learningCorrect: readonly boolean[],
  learningTotal = M17_LEARNING_TRIALS,
  run = M17_CRITERION_RUN,
): M17CriterionResult {
  let streak = 0;
  const responses = Math.min(learningCorrect.length, learningTotal);
  const complete = responses >= learningTotal;

  for (let i = 0; i < responses; i += 1) {
    streak = learningCorrect[i] ? streak + 1 : 0;

    if (streak >= run) {
      return {
        criterion_trial: i + 1,
        attained: true,
        censored: false,
        incomplete: false,
        complete_sequence: complete,
        responses,
      };
    }
  }

  if (complete) {
    return {
      criterion_trial: learningTotal,
      attained: false,
      censored: true,
      incomplete: false,
      complete_sequence: true,
      responses,
    };
  }

  return {
    criterion_trial: null,
    attained: false,
    censored: false,
    incomplete: true,
    complete_sequence: false,
    responses,
  };
}
