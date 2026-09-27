/**
 * Expected-outcome understanding test — the M24 / M26 knowledge boundary
 * (Station 080 M01–M26 run, Unit 12). PURE model (no Phaser, no runtime
 * imports; Node-testable), shared by the rig and the uplink.
 *
 * The register's rule: an acknowledgement click never establishes
 * knowledge; only a passed expected-outcome test does. One question about
 * what another UNCHANGED act will produce; a right first answer passes
 * (`pass_first`); a wrong one shows ONE neutral explanation and ONE
 * equivalent recheck (the same content, the option order changed); a
 * right recheck passes (`pass_after_explanation`); a wrong recheck fails
 * (`fail`). First-pass and post-explanation passes are stored apart by
 * design. The key is never the first (pre-focused) option in either form,
 * and a press inside the settle window after a stage is presented is
 * refused (never recorded) so a carried or double-tapped press can never
 * answer. Nothing here is a score; the wording never names the item.
 */
import type { KnowledgeStatus } from '../../measurement/protocol';

export const UNDERSTANDING_VERSION = 'expected-outcome-v1';

/** A press inside this window after a stage is presented is refused. */
export const UNDERSTANDING_SETTLE_MS = 400;

export type UnderstandingAttemptIndex = 1 | 2;
export type UnderstandingForm = 'a' | 'b';

export interface UnderstandingOption {
  id: string;
  label: string;
}

export interface UnderstandingQuestion {
  question_id: string;
  /** The neutral stem: what will another unchanged act produce? */
  stem: string;
  /**
   * Declared options — the key is NEVER at index 0 (form a shows this
   * order; form b, the recheck, rotates it right by one).
   */
  options: readonly UnderstandingOption[];
  key: string;
  /** The one neutral explanation shown after a wrong first answer. */
  explanation: string;
}

export interface UnderstandingAttempt {
  attempt: UnderstandingAttemptIndex;
  form: UnderstandingForm;
  question_id: string;
  response: string;
  /** 1-based position of the chosen card as displayed. */
  position: number;
  key: string;
  correct: boolean;
  presented_at_ms: number;
  answered_at_ms: number;
  latency_ms: number;
  refused_presses_before: number;
}

export interface UnderstandingState {
  status: KnowledgeStatus;
  attempts: UnderstandingAttempt[];
  /** Presentation time of the stage currently open (null when none). */
  stage_presented_at_ms: number | null;
  stage: UnderstandingStage | null;
  /** First presentation of the one explanation (null until shown). */
  explanation_presented_at_ms: number | null;
  /** Dismissal ("Continue") of the explanation — the recheck becomes due. */
  explanation_dismissed_at_ms: number | null;
  refused_presses: number;
  /** Every presentation of any stage (a re-presentation counts again). */
  presentations: number;
  passed_at_ms: number | null;
  failed_at_ms: number | null;
}

export type UnderstandingStage = 'attempt_1' | 'explanation' | 'attempt_2';

export function createUnderstandingState(): UnderstandingState {
  return {
    status: 'unknown',
    attempts: [],
    stage_presented_at_ms: null,
    stage: null,
    explanation_presented_at_ms: null,
    explanation_dismissed_at_ms: null,
    refused_presses: 0,
    presentations: 0,
    passed_at_ms: null,
    failed_at_ms: null,
  };
}

/** The next stage due, or null once the test is decided. */
export function understandingDue(
  state: UnderstandingState,
): UnderstandingStage | null {
  if (state.status !== 'unknown') {
    return null;
  }

  if (state.attempts.length === 0) {
    return 'attempt_1';
  }

  return state.explanation_dismissed_at_ms === null
    ? 'explanation'
    : 'attempt_2';
}

export function understandingPassed(state: UnderstandingState): boolean {
  return (
    state.status === 'pass_first' || state.status === 'pass_after_explanation'
  );
}

/** The form of an attempt: the declared order first, rotated for the recheck. */
export function understandingForm(
  attempt: UnderstandingAttemptIndex,
): UnderstandingForm {
  return attempt === 1 ? 'a' : 'b';
}

/** Options in display order for a form (content identical, order changed). */
export function understandingOptions(
  question: UnderstandingQuestion,
  form: UnderstandingForm,
): readonly UnderstandingOption[] {
  if (form === 'a') {
    return question.options;
  }

  const last = question.options[question.options.length - 1]!;

  return [last, ...question.options.slice(0, -1)];
}

/** The stage was shown (the settle window starts). False when not due. */
export function understandingPresent(
  state: UnderstandingState,
  stage: UnderstandingStage,
  nowMs: number,
): boolean {
  if (understandingDue(state) !== stage) {
    return false;
  }

  state.stage = stage;
  state.stage_presented_at_ms = nowMs;
  state.presentations += 1;

  if (stage === 'explanation') {
    state.explanation_presented_at_ms ??= nowMs;
  }

  return true;
}

/** The open explanation stage is still inside its settle window. */
export function understandingExplanationSettling(
  state: UnderstandingState,
  nowMs: number,
): boolean {
  return (
    state.stage === 'explanation' &&
    state.explanation_dismissed_at_ms === null &&
    state.stage_presented_at_ms !== null &&
    nowMs - state.stage_presented_at_ms < UNDERSTANDING_SETTLE_MS
  );
}

/**
 * The explanation stage was dismissed (the recheck becomes due). A press
 * inside the settle window is refused (counted, never a dismissal): a
 * carried press can never skip the one explanation.
 */
export function understandingExplained(
  state: UnderstandingState,
  nowMs: number,
): boolean {
  if (
    state.stage !== 'explanation' ||
    state.explanation_dismissed_at_ms !== null
  ) {
    return false;
  }

  if (understandingExplanationSettling(state, nowMs)) {
    state.refused_presses += 1;

    return false;
  }

  state.explanation_dismissed_at_ms = nowMs;
  state.stage = null;
  state.stage_presented_at_ms = null;

  return true;
}

export type UnderstandingAnswer =
  | { kind: 'refused'; reason: 'settling' | 'not_due' }
  | {
      kind: 'answered';
      attempt: UnderstandingAttempt;
      status: KnowledgeStatus;
      /** True when the one explanation is now due. */
      explanation_due: boolean;
    };

/** An answer on the open attempt stage. */
export function understandingAnswer(
  state: UnderstandingState,
  question: UnderstandingQuestion,
  optionId: string,
  nowMs: number,
): UnderstandingAnswer {
  const stage = state.stage;

  if (
    (stage !== 'attempt_1' && stage !== 'attempt_2') ||
    understandingDue(state) !== stage ||
    state.stage_presented_at_ms === null
  ) {
    return { kind: 'refused', reason: 'not_due' };
  }

  if (nowMs - state.stage_presented_at_ms < UNDERSTANDING_SETTLE_MS) {
    state.refused_presses += 1;

    return { kind: 'refused', reason: 'settling' };
  }

  const attemptIndex: UnderstandingAttemptIndex = stage === 'attempt_1' ? 1 : 2;
  const form = understandingForm(attemptIndex);
  const displayed = understandingOptions(question, form);
  const position = displayed.findIndex((option) => option.id === optionId) + 1;

  if (position === 0) {
    return { kind: 'refused', reason: 'not_due' };
  }

  const correct = optionId === question.key;
  const attempt: UnderstandingAttempt = {
    attempt: attemptIndex,
    form,
    question_id: question.question_id,
    response: optionId,
    position,
    key: question.key,
    correct,
    presented_at_ms: state.stage_presented_at_ms,
    answered_at_ms: nowMs,
    latency_ms: nowMs - state.stage_presented_at_ms,
    refused_presses_before: state.refused_presses,
  };

  state.attempts.push(attempt);
  state.stage = null;
  state.stage_presented_at_ms = null;

  if (correct) {
    state.status = attemptIndex === 1 ? 'pass_first' : 'pass_after_explanation';
    state.passed_at_ms = nowMs;
  } else if (attemptIndex === 2) {
    state.status = 'fail';
    state.failed_at_ms = nowMs;
  }

  return {
    kind: 'answered',
    attempt,
    status: state.status,
    explanation_due: !correct && attemptIndex === 1,
  };
}

/** Raw components of the test (never a score). */
export function understandingRaw(state: UnderstandingState) {
  return {
    knowledge_status: state.status,
    understanding_version: UNDERSTANDING_VERSION,
    attempts: state.attempts.map((attempt) => ({ ...attempt })),
    first_answer_correct:
      state.attempts[0] === undefined ? null : state.attempts[0].correct,
    explanation_shown: state.explanation_presented_at_ms !== null,
    explanation_presented_at_ms: state.explanation_presented_at_ms,
    explanation_dismissed_at_ms: state.explanation_dismissed_at_ms,
    /** First presentation → dismissal (includes any re-presentation). */
    explanation_reading_ms:
      state.explanation_presented_at_ms === null ||
      state.explanation_dismissed_at_ms === null
        ? null
        : state.explanation_dismissed_at_ms - state.explanation_presented_at_ms,
    refused_presses: state.refused_presses,
    /** Stage presentations incl. re-presentations (latency runs from the last one). */
    presentations: state.presentations,
    passed_at_ms: state.passed_at_ms,
    failed_at_ms: state.failed_at_ms,
  };
}

/** Every question must keep its key off the first card in both forms. */
export function understandingQuestionValid(
  question: UnderstandingQuestion,
): boolean {
  const ids = question.options.map((option) => option.id);

  return (
    question.options.length >= 3 &&
    new Set(ids).size === ids.length &&
    ids.includes(question.key) &&
    understandingOptions(question, 'a')[0]!.id !== question.key &&
    understandingOptions(question, 'b')[0]!.id !== question.key
  );
}
