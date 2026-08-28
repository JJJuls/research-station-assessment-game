/**
 * M06 — Routine dispatch console (evidence-led pilot v2, Unit 2).
 *
 * Ledger (sheet 09): after non-scored practice, compose and dispatch four
 * routine pseudo-commands using visible tokens/reference; typing optional;
 * practice criterion; matched commands; quality floor; animation
 * excluded; keyboard/pointer semantic equivalence. Speed alone is
 * prohibited.
 *
 * Mechanic (work surface): a reference strip lists the four dispatch
 * lines to send (VERB · TARGET · VALUE). Token buttons compose one line in
 * a visible buffer; DISPATCH sends it (1.0 s send animation excluded from
 * active time); CLEAR empties the buffer. Two practice lines come first
 * (non-scored, must be sent correctly once each — the criterion); then the
 * four scored lines. The buffer also accepts typed tokens (optional).
 *
 * Raw components: correct_dispatches, invalid_commands (dispatched lines
 * not matching the reference), excess_actions (token presses beyond the
 * minimum for the lines sent), active_time_excl_animation, practice_passed.
 */
import {
  assignCounterbalance,
  currentSessionId,
  type InputMode,
  ItemWindow,
} from './windowKit';

export const M06_OPPORTUNITY_ID = 'proto_m06_routine_dispatch';
export const M06_WINDOW_ID = 'm06_dispatch_w1';
export const M06_ENTRY_STATE_VERSION = 'm06-dispatch-v1';
export const M06_FAMILY = 'proto_m06_dispatch_';
export const M06_SEND_ANIMATION_MS = 1000;

export type M06Form = 'form_a' | 'form_b';

export const M06_VERBS = ['SET', 'OPEN', 'HOLD', 'ROUTE'] as const;
export const M06_TARGETS = ['PUMP-2', 'VALVE-C', 'BUS-1', 'RELAY-N'] as const;
export const M06_VALUES = ['LOW', 'HIGH', 'AUTO', 'OFF'] as const;

export type M06Line = [string, string, string];

export const M06_PRACTICE_LINES: readonly M06Line[] = [
  ['OPEN', 'VALVE-C', 'AUTO'],
  ['HOLD', 'BUS-1', 'LOW'],
];

const M06_LINES_BY_FORM: Record<M06Form, readonly M06Line[]> = {
  form_a: [
    ['SET', 'PUMP-2', 'HIGH'],
    ['ROUTE', 'RELAY-N', 'AUTO'],
    ['HOLD', 'VALVE-C', 'OFF'],
    ['SET', 'BUS-1', 'LOW'],
  ],
  form_b: [
    ['ROUTE', 'BUS-1', 'AUTO'],
    ['SET', 'VALVE-C', 'HIGH'],
    ['HOLD', 'RELAY-N', 'OFF'],
    ['OPEN', 'PUMP-2', 'LOW'],
  ],
};

export type M06Phase = 'practice' | 'scored' | 'done';

interface M06State {
  form: M06Form;
  phase: M06Phase;
  buffer: string[];
  practiceSent: number;
  practiceCorrect: boolean[];
  practicePassed: boolean;
  scoredSent: M06Line[];
  scoredCorrect: number;
  invalidCommands: number;
  tokenPresses: number;
  clears: number;
  referenceConsults: number;
  sendingUntilMs: number | null;
  animationMs: number;
}

let state: M06State | null = null;

function ensureState(): M06State {
  if (state === null) {
    state = {
      form: assignCounterbalance<M06Form>(
        currentSessionId(),
        'm06_dispatch_form',
        ['form_a', 'form_b'],
      ),
      phase: 'practice',
      buffer: [],
      practiceSent: 0,
      practiceCorrect: [],
      practicePassed: false,
      scoredSent: [],
      scoredCorrect: 0,
      invalidCommands: 0,
      tokenPresses: 0,
      clears: 0,
      referenceConsults: 0,
      sendingUntilMs: null,
      animationMs: 0,
    };
  }

  return state;
}

export const m06Window = new ItemWindow({
  item: 'M06',
  opportunityId: M06_OPPORTUNITY_ID,
  windowId: M06_WINDOW_ID,
  entryStateVersion: M06_ENTRY_STATE_VERSION,
  family: M06_FAMILY,
  scene: 'records_workshop',
  objectId: 'm06_dispatch_console',
});

export function declareM06() {
  const s = ensureState();

  m06Window.spec.form = s.form;
  m06Window.spec.counterbalance = s.form;
  m06Window.declare();
}

export function m06State(): Readonly<M06State> {
  return ensureState();
}

export function m06ScoredLines(): readonly M06Line[] {
  return M06_LINES_BY_FORM[ensureState().form];
}

/** The line the reference strip currently asks for (null when done). */
export function m06CurrentLine(): M06Line | null {
  const s = ensureState();

  if (s.phase === 'practice') {
    return M06_PRACTICE_LINES[s.practiceSent] ?? null;
  }

  if (s.phase === 'scored') {
    return m06ScoredLines()[s.scoredSent.length] ?? null;
  }

  return null;
}

export function openM06(nowMs: number) {
  declareM06();
  m06Window.setComprehension('pending');
  m06Window.open(nowMs, {
    practice_lines: M06_PRACTICE_LINES.length,
    scored_lines: 4,
    tokens: {
      verbs: M06_VERBS.length,
      targets: M06_TARGETS.length,
      values: M06_VALUES.length,
    },
  });
}

export function m06Sending(nowMs: number): boolean {
  const s = ensureState();

  return s.sendingUntilMs !== null && nowMs < s.sendingUntilMs;
}

export function pressM06Token(
  token: string,
  nowMs: number,
  inputMode: InputMode,
): boolean {
  const s = ensureState();

  if (!m06Window.isOpen() || s.phase === 'done' || m06Sending(nowMs)) {
    return false;
  }

  if (s.buffer.length >= 3) {
    m06Window.log('token_refused', {
      token,
      reason: 'buffer_full',
      input_mode: inputMode,
    });

    return false;
  }

  s.buffer.push(token);
  s.tokenPresses += 1;
  m06Window.log('token_pressed', {
    token,
    buffer: [...s.buffer],
    phase: s.phase,
    input_mode: inputMode,
  });

  return true;
}

/** Optional typed entry: the whole line at once (semantic equivalence). */
export function typeM06Line(
  text: string,
  nowMs: number,
  inputMode: InputMode,
): boolean {
  const tokens = text.trim().toUpperCase().split(/\s+/).filter(Boolean);
  const s = ensureState();

  if (
    !m06Window.isOpen() ||
    s.phase === 'done' ||
    m06Sending(nowMs) ||
    tokens.length === 0
  ) {
    return false;
  }

  s.buffer = tokens.slice(0, 3);
  s.tokenPresses += tokens.length;
  m06Window.log('line_typed', { buffer: [...s.buffer], input_mode: inputMode });

  return true;
}

export function clearM06Buffer(inputMode: InputMode) {
  const s = ensureState();

  if (s.buffer.length === 0) {
    return;
  }

  s.buffer = [];
  s.clears += 1;
  m06Window.log('buffer_cleared', { input_mode: inputMode });
}

export function consultM06Reference(inputMode: InputMode) {
  const s = ensureState();

  s.referenceConsults += 1;
  m06Window.log('reference_consulted', {
    consults: s.referenceConsults,
    input_mode: inputMode,
  });
}

function sameLine(a: readonly string[], b: readonly string[]): boolean {
  return a.length === 3 && b.length === 3 && a.every((t, i) => t === b[i]);
}

/** Dispatch the buffer. Practice must be sent correctly before scoring starts. */
export function dispatchM06(
  nowMs: number,
  inputMode: InputMode,
): 'sent' | 'refused' {
  const s = ensureState();

  if (
    !m06Window.isOpen() ||
    s.phase === 'done' ||
    m06Sending(nowMs) ||
    s.buffer.length === 0
  ) {
    return 'refused';
  }

  const line = [...s.buffer] as M06Line;
  const expected = m06CurrentLine();
  const correct = expected !== null && sameLine(line, expected);

  s.buffer = [];
  s.sendingUntilMs = nowMs + M06_SEND_ANIMATION_MS;
  s.animationMs += M06_SEND_ANIMATION_MS;

  if (s.phase === 'practice') {
    s.practiceCorrect.push(correct);
    m06Window.log('practice_dispatched', {
      line,
      matches_reference: correct,
      practice_index: s.practiceSent,
      input_mode: inputMode,
    });

    // Practice criterion: each practice line sent correctly once (retry
    // the same line until it matches — non-scored).
    if (correct) {
      s.practiceSent += 1;
    }

    if (s.practiceSent >= M06_PRACTICE_LINES.length) {
      s.practicePassed = true;
      s.phase = 'scored';
      m06Window.setComprehension('passed');
      m06Window.log('practice_passed', {
        practice_attempts: s.practiceCorrect.length,
        input_mode: 'system',
      });
    }

    return 'sent';
  }

  s.scoredSent.push(line);

  if (correct) {
    s.scoredCorrect += 1;
  } else {
    s.invalidCommands += 1;
  }

  m06Window.log('line_dispatched', {
    line,
    matches_reference: correct,
    line_index: s.scoredSent.length - 1,
    input_mode: inputMode,
  });

  if (s.scoredSent.length >= 4) {
    s.phase = 'done';
    m06Window.complete(
      nowMs,
      {
        correct_dispatches: s.scoredCorrect,
        invalid_commands: s.invalidCommands,
        excess_actions: Math.max(
          0,
          s.tokenPresses - 3 * (s.scoredSent.length + s.practiceCorrect.length),
        ),
        token_presses: s.tokenPresses,
        clears: s.clears,
        reference_consults: s.referenceConsults,
        active_time_excl_animation_ms: Math.max(
          0,
          m06Window.activeTimeMs(nowMs) - s.animationMs,
        ),
        practice_passed: s.practicePassed,
        practice_attempts: s.practiceCorrect.length,
        lines_sent: s.scoredSent,
      },
      inputMode,
    );
  }

  return 'sent';
}

export function closeM06Surface(nowMs: number) {
  m06Window.pause(nowMs);
  m06Window.log('surface_closed', {
    phase: ensureState().phase,
    lines_sent: ensureState().scoredSent.length,
    input_mode: 'system',
  });
}

export function resumeM06Surface(nowMs: number) {
  m06Window.resume(nowMs);
}

/** Test-only escape hatch. */
export function resetM06State() {
  state = null;
  m06Window.reset();
  m06Window.spec.form = null;
  m06Window.spec.counterbalance = null;
}
