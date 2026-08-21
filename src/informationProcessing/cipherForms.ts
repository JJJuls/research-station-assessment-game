/**
 * Pure cipher forms + reconstruction (Information Processing foundation,
 * M15).
 *
 * Phaser-free, runtime-free and `import.meta`-free so Node-side tests can
 * import it directly. `reconstructCipher` evaluates a program against a
 * form through the shared workspace semantics (PAIR / SHIFT) and reports
 * raw relational facts — never a score.
 */

import type { FormId, Fragment, GrammarSpec, ProgramState } from './model';
import { evaluateWorkspace } from './programEngine';

export const M15_KEYS = ['K1', 'K2', 'K3'] as const;
export const M15_SHIFT_AMOUNTS = ['1', '2', '3'] as const;
export const M15_RULES_PRESENTED = 4;

export const M15_GRAMMAR: GrammarSpec = {
  id: 'm15-v1',
  verbs: [
    {
      verb: 'PAIR',
      args: [
        { kind: 'fragment', label: 'fragment', distinct: true },
        { kind: 'fragment', label: 'fragment', distinct: true },
      ],
      summary: 'Link the two fragments that share a key.',
    },
    {
      verb: 'SHIFT',
      args: [
        { kind: 'key', label: 'key' },
        { kind: 'amount', label: 'rows' },
      ],
      summary: 'Move a key’s codebook selection down n rows.',
    },
  ],
};

export interface CipherFragment extends Fragment {
  key: string;
  /** Header fragments carry a code; payload fragments carry a shift. */
  role: 'header' | 'payload';
  code?: string;
  shift?: number;
}

export interface CipherForm {
  /** Eight codebook rows: code → word. */
  codebook: readonly { code: string; word: string }[];
  fragments: readonly CipherFragment[];
  /** The correct reconstruction, key order K1 K2 K3. */
  target: readonly string[];
}

function header(id: string, key: string, code: string): CipherFragment {
  return {
    id,
    channel: 'ALPHA',
    payload: `code ${code}`,
    key,
    role: 'header',
    code,
  };
}

function payload(id: string, key: string, shift: number): CipherFragment {
  return {
    id,
    channel: 'BETA',
    payload: `shift +${shift}`,
    key,
    role: 'payload',
    shift,
  };
}

const CODEBOOK_A = [
  { code: 'H1', word: 'RELAY' },
  { code: 'H2', word: 'CORE' },
  { code: 'H3', word: 'STABLE' },
  { code: 'H4', word: 'VENT' },
  { code: 'H5', word: 'SEALED' },
  { code: 'H6', word: 'NORTH' },
  { code: 'H7', word: 'HOLDING' },
  { code: 'H8', word: 'ARRAY' },
] as const;

const CODEBOOK_B = [
  { code: 'J1', word: 'SIGNAL' },
  { code: 'J2', word: 'DRIFT' },
  { code: 'J3', word: 'SOUTH' },
  { code: 'J4', word: 'ANCHOR' },
  { code: 'J5', word: 'ONLINE' },
  { code: 'J6', word: 'FEED' },
  { code: 'J7', word: 'QUIET' },
  { code: 'J8', word: 'BEACON' },
] as const;

/**
 * Equivalent forms: 6 fragments (3 headers + 3 payloads), 3 keys, exactly
 * one non-zero shift, 8-row codebook, 3-word target.
 * Form A: K1 H2(+0)→CORE, K2 H3(+2)→SEALED, K3 H7(+0)→HOLDING.
 * Form B: K1 J4(+0)→ANCHOR, K2 J6(+0)→FEED, K3 J1(+2)→SOUTH.
 */
export const M15_FORMS: Record<FormId, CipherForm> = {
  A: {
    codebook: CODEBOOK_A,
    fragments: [
      header('F1', 'K2', 'H3'),
      payload('F2', 'K1', 0),
      header('F3', 'K1', 'H2'),
      payload('F4', 'K3', 0),
      payload('F5', 'K2', 2),
      header('F6', 'K3', 'H7'),
    ],
    target: ['CORE', 'SEALED', 'HOLDING'],
  },
  B: {
    codebook: CODEBOOK_B,
    fragments: [
      payload('F1', 'K3', 2),
      header('F2', 'K2', 'J6'),
      payload('F3', 'K2', 0),
      header('F4', 'K3', 'J1'),
      header('F5', 'K1', 'J4'),
      payload('F6', 'K1', 0),
    ],
    target: ['ANCHOR', 'FEED', 'SOUTH'],
  },
};

/* ------------------------------------------------------------------ *
 * Pure reconstruction
 * ------------------------------------------------------------------ */

export interface CipherKeyState {
  key: string;
  /** The effective pair for this key (both fragments), if any. */
  pair: { a: string; b: string } | null;
  /** Pair is header+payload of this key. */
  pair_correct: boolean;
  shift_issued: string | null;
  shift_required: number;
  shift_correct: boolean;
  word: string | null;
}

export interface CipherReconstruction {
  keys: CipherKeyState[];
  message: (string | null)[];
  relations_required: number;
  relations_constructed: number;
  relations_correct: number;
  rule_violations: number;
  complete: boolean;
  valid: boolean;
}

/** Pure evaluation of a program against a form (tests + the adapter). */
export function reconstructCipher(
  form: CipherForm,
  lines: ProgramState['lines'],
): CipherReconstruction {
  const evaluation = evaluateWorkspace(lines);
  const byId = new Map(
    form.fragments.map((fragment) => [fragment.id, fragment]),
  );
  const keys: CipherKeyState[] = [];
  let constructed =
    evaluation.pairs.length + Object.keys(evaluation.shifts).length;
  let correct = 0;
  let violations = 0;
  const requiredShifts = form.fragments.filter(
    (fragment) => fragment.role === 'payload' && (fragment.shift ?? 0) > 0,
  ).length;
  const relationsRequired = M15_KEYS.length + requiredShifts;

  // Pairs that link mismatched keys or two fragments of the same role are
  // rule violations (they still count as constructed relations).
  for (const pair of evaluation.pairs) {
    const a = byId.get(pair.a);
    const b = byId.get(pair.b);

    if (a === undefined || b === undefined) {
      violations += 1;
      continue;
    }

    if (a.key !== b.key || a.role === b.role) {
      violations += 1;
    }
  }

  for (const key of M15_KEYS) {
    const headerFragment = form.fragments.find(
      (fragment) => fragment.key === key && fragment.role === 'header',
    )!;
    const payloadFragment = form.fragments.find(
      (fragment) => fragment.key === key && fragment.role === 'payload',
    )!;
    const pair =
      evaluation.pairs.find(
        (candidate) =>
          [candidate.a, candidate.b].includes(headerFragment.id) ||
          [candidate.a, candidate.b].includes(payloadFragment.id),
      ) ?? null;
    const pairCorrect =
      pair !== null &&
      [pair.a, pair.b].includes(headerFragment.id) &&
      [pair.a, pair.b].includes(payloadFragment.id);
    const shiftRequired = payloadFragment.shift ?? 0;
    const shiftIssued = evaluation.shifts[key] ?? null;
    const shiftApplied = shiftIssued === null ? 0 : Number(shiftIssued);
    const shiftCorrect = shiftApplied === shiftRequired;
    let word: string | null = null;

    if (pairCorrect) {
      correct += 1;

      const row = form.codebook.findIndex(
        (entry) => entry.code === headerFragment.code,
      );

      if (row >= 0) {
        word = form.codebook[(row + shiftApplied) % form.codebook.length].word;
      }
    }

    if (shiftIssued !== null) {
      if (shiftRequired > 0 && shiftCorrect) {
        correct += 1;
      } else {
        violations += 1;
      }
    }

    keys.push({
      key,
      pair: pair === null ? null : { a: pair.a, b: pair.b },
      pair_correct: pairCorrect,
      shift_issued: shiftIssued,
      shift_required: shiftRequired,
      shift_correct: shiftCorrect,
      word,
    });
  }

  const message = keys.map((entry) => entry.word);
  const complete = message.every((word) => word !== null);
  const valid =
    complete && message.every((word, index) => word === form.target[index]);

  constructed = Math.max(constructed, 0);

  return {
    keys,
    message,
    relations_required: relationsRequired,
    relations_constructed: constructed,
    relations_correct: correct,
    rule_violations: violations,
    complete,
    valid,
  };
}
