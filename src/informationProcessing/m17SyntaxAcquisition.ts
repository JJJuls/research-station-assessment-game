/**
 * M17 — Register syntax: demonstration, practice, transfer (Information
 * Processing foundation; evidence-led pilot v2 Unit 3 structure).
 *
 * BESSI Information Processing item M17 ("Learn things quickly.") — sheet
 * 09 final opportunity: observe ONE demonstration, complete ONE guided
 * practice case with neutral corrective feedback, then solve ONE changed,
 * unassisted transfer case. The bounded command grammar is M17's own
 * (VEK / ZOR / KAI over a three-slot register) and is never reused by
 * M14–M16. Explicit READY after the demonstration; explicit submission
 * per attempt; up to three attempts on each case; the demonstration can
 * be reviewed at any time (a counted exposure). Trial-level state and
 * events are preserved raw; NO learning slope, trials-to-criterion or
 * other derived score is computed here.
 *
 * Raw observables per attempt: case type, attempt number, commands
 * required / correct, semantic errors, syntax errors, corrections before
 * submission, feedback presented, help consults, demonstration reviews,
 * active time after READY, goal reached, input mode. Plus the case
 * summary: practice attempts / criterion met, transfer attempts / first
 * attempt / completion / correct steps.
 */

import { commandToText, paletteFor } from './commands';
import type {
  CommandContext,
  FormId,
  InputMode,
  ProgramState,
  SemanticCommand,
  TerminalActionResult,
  TerminalTaskAdapter,
  TerminalView,
} from './model';
import { refreshIpProbe, registerIpProbeSource } from './probe';
import {
  appendLine,
  clearProgram,
  createProgramState,
  removeLine,
} from './programEngine';
import type { Register, SyntaxTrial } from './syntaxForms';
import {
  evaluateTrial,
  M17_COMMANDS_REQUIRED,
  M17_FEEDBACK_TRIALS,
  M17_FORMS,
  M17_GRAMMAR,
  M17_MAX_ATTEMPTS,
  M17_SLOTS,
  M17_TOKENS,
  M17_TRIALS_TOTAL,
  runRegister,
} from './syntaxForms';
import { declareIpEvents, logIpEvent } from './telemetry';
import { registerTerminalAdapter } from './terminalAdapters';
import { tutorialStatus } from './tutorial';
import type { IpWindow } from './windowState';
import {
  bumpIpHelp,
  bumpIpSubmission,
  closeIpWindow,
  createIpWindow,
  declareIpWindow,
  enterIpWindow,
  flagIpWindow,
  ipWindowFields,
  ipWindowIsClosed,
  leaveIpPanel,
  noteIpPriorExposure,
  resolveForm,
} from './windowState';

export const M17_OPPORTUNITY_ID = 'proto_m17_syntax_acquisition';
export const M17_ENTRY_STATE_VERSION = 'm17-syntax-v2';
export const M17_WINDOW_ID = 'm17_transfer_w1';
const OBJECT_ID = 'signal_training_rig';

export const M17_EVENT_TYPES = declareIpEvents('proto_m17_syntax', [
  'window_opened',
  'window_reopened',
  'panel_left',
  'ready_acknowledged',
  'demonstration_viewed',
  'trial_started',
  'command_added',
  'command_refused',
  'line_removed',
  'buffer_cleared',
  'trial_submitted',
  'feedback_presented',
  'trial_finished',
  'completed',
  'help_consulted',
  'stopped',
  'technical_failure',
  'entry_state_flagged',
]);

export {
  evaluateTrial,
  M17_FORMS,
  M17_GRAMMAR,
  M17_MAX_ATTEMPTS,
  M17_TRIALS_TOTAL,
  runRegister,
} from './syntaxForms';

interface AttemptRecord {
  trial_index: number;
  trial_type: 'feedback' | 'transfer';
  attempt: number;
  commands_required: number;
  commands_correct: number;
  semantic_errors: number;
  syntax_errors: number;
  corrections_before_submission: number;
  feedback_presented: boolean;
  help_consults: number;
  demonstration_reviews: number;
  active_ms_after_ready: number;
  trial_complete: boolean;
  goal_reached: boolean;
  command_count: number;
  pointer_commands: number;
  typed_commands: number;
  input_mode: string | null;
  final_register: Register;
}

interface M17State {
  window: IpWindow;
  form: FormId;
  stage: 'demo' | 'trial' | 'between' | 'done';
  trial_index: number;
  attempt: number;
  program: ProgramState;
  trial_started_at_ms: number | null;
  trial_active_ms: number;
  syntax_errors: number;
  corrections: number;
  help_in_trial: number;
  demo_in_trial: number;
  demo_views: number;
  pointer_commands: number;
  typed_commands: number;
  attempts: AttemptRecord[];
  last_console: string[];
  entry_flagged: boolean;
}

function createInitialState(form: FormId): M17State {
  return {
    window: createIpWindow({
      opportunity_id: M17_OPPORTUNITY_ID,
      owner: 'M17',
      entry_state_version: M17_ENTRY_STATE_VERSION,
      form_id: form,
    }),
    form,
    stage: 'demo',
    trial_index: 0,
    attempt: 0,
    program: createProgramState(),
    trial_started_at_ms: null,
    trial_active_ms: 0,
    syntax_errors: 0,
    corrections: 0,
    help_in_trial: 0,
    demo_in_trial: 0,
    demo_views: 0,
    pointer_commands: 0,
    typed_commands: 0,
    attempts: [],
    last_console: [],
    entry_flagged: false,
  };
}

let state: M17State | null = null;

function ensure(): M17State {
  if (state === null) {
    state = createInitialState(resolveForm('m17'));
  }

  return state;
}

function currentTrial(): SyntaxTrial | null {
  const s = ensure();

  return s.trial_index >= 1 && s.trial_index <= M17_TRIALS_TOTAL
    ? M17_FORMS[s.form].trials[s.trial_index - 1]
    : null;
}

function context(): CommandContext {
  return { sets: { slot: [...M17_SLOTS], token: [...M17_TOKENS] } };
}

function log(suffix: string, metadata: Record<string, unknown> = {}) {
  const s = ensure();

  logIpEvent('proto_m17_syntax', OBJECT_ID, suffix, {
    ...ipWindowFields(s.window),
    window_id: M17_WINDOW_ID,
    stage: s.stage,
    trial_index: s.trial_index,
    attempt: s.attempt,
    ...metadata,
  });
  refreshIpProbe();
}

function trialActiveMs(nowMs?: number): number {
  const s = ensure();

  return (
    s.trial_active_ms +
    (s.trial_started_at_ms !== null && nowMs !== undefined
      ? Math.max(0, nowMs - s.trial_started_at_ms)
      : 0)
  );
}

/** Per-case summary (raw facts; no slope, no criterion score). */
function caseSummary() {
  const s = ensure();
  const practice = s.attempts.filter((a) => a.trial_type === 'feedback');
  const transfer = s.attempts.filter((a) => a.trial_type === 'transfer');
  const last = (list: AttemptRecord[]) =>
    list.length > 0 ? list[list.length - 1] : null;

  return {
    practice_attempts: practice.length,
    practice_criterion_met: practice.some((a) => a.goal_reached),
    practice_first_attempt_goal_reached: practice[0]?.goal_reached ?? null,
    practice_feedback_presented: practice.filter((a) => a.feedback_presented)
      .length,
    transfer_attempts: transfer.length,
    transfer_first_attempt_goal_reached: transfer[0]?.goal_reached ?? null,
    transfer_goal_reached: transfer.some((a) => a.goal_reached),
    transfer_completion: transfer.some((a) => a.goal_reached),
    transfer_correct_steps_first: transfer[0]?.commands_correct ?? null,
    transfer_correct_steps_final: last(transfer)?.commands_correct ?? null,
    hints_used:
      s.attempts.reduce((sum, a) => sum + a.help_consults, 0) + s.demo_views,
    demonstration_exposures: 1 + s.demo_views,
    time_by_phase_ms: {
      practice: practice.reduce((sum, a) => sum + a.active_ms_after_ready, 0),
      transfer: transfer.reduce((sum, a) => sum + a.active_ms_after_ready, 0),
    },
  };
}

function rawSummary() {
  const s = ensure();

  return {
    ...ipWindowFields(s.window),
    window_id: M17_WINDOW_ID,
    trials_total: M17_TRIALS_TOTAL,
    feedback_trials: M17_FEEDBACK_TRIALS,
    max_attempts_per_trial: M17_MAX_ATTEMPTS,
    trials_completed: new Set(
      s.attempts.filter((a) => a.trial_complete).map((a) => a.trial_index),
    ).size,
    attempts: s.attempts.map((attempt) => ({ ...attempt })),
    ...caseSummary(),
    grammar_id: M17_GRAMMAR.id,
    tutorial_status: tutorialStatus(),
  };
}

function applyTutorialGate() {
  const s = ensure();

  if (s.entry_flagged) {
    return;
  }

  const status = tutorialStatus();

  if (status === 'failed') {
    flagIpWindow(
      s.window,
      'comprehension_failure',
      'console orientation failed at first open of this opportunity',
    );
    s.entry_flagged = true;
    log('entry_state_flagged', { reason: 'comprehension_failure' });
  } else if (status !== 'complete') {
    noteIpPriorExposure(s.window, 'terminal_orientation_not_completed');
    flagIpWindow(
      s.window,
      'invalid_entry_state',
      'console orientation not completed at first open of this opportunity',
    );
    s.entry_flagged = true;
    log('entry_state_flagged', { reason: 'invalid_entry_state' });
  }
}

export function declareM17() {
  const s = ensure();

  declareIpWindow(s.window);
  registerIpProbeSource('m17', M17_OPPORTUNITY_ID, m17Probe);
  refreshIpProbe();
}

export function m17WindowStatus() {
  return ensure().window.status;
}

function setConsole(lines: string[]) {
  ensure().last_console = lines;
}

function registerLine(label: string, register: Register): string {
  return `${label.padEnd(6)} A:${register[0].padEnd(3)}  B:${register[1].padEnd(3)}  C:${register[2].padEnd(3)}`;
}

function demoLines(): string[] {
  const s = ensure();

  return M17_FORMS[s.form].demo.flatMap((example) => [
    `${example.command}`,
    `  ${registerLine('before', example.before)}`,
    `  ${registerLine('after', example.after)}`,
  ]);
}

function trialTitle(trial: SyntaxTrial | null): string {
  if (trial === null) {
    return '';
  }

  return trial.type === 'transfer' ? 'TRANSFER CASE' : 'PRACTICE CASE';
}

function view(): TerminalView {
  const s = ensure();
  const closed = ipWindowIsClosed(s.window);
  const form = M17_FORMS[s.form];
  const trial = currentTrial();
  const inTrial = s.stage === 'trial' && trial !== null;
  const now = inTrial ? runRegister(trial.start, s.program.lines) : null;
  const attemptsLeft = M17_MAX_ATTEMPTS - s.attempt;
  const shown: Register | null = inTrial
    ? now
    : s.stage === 'demo'
      ? form.demo[0].before
      : (s.attempts[s.attempts.length - 1]?.final_register ?? null);
  const chips =
    shown === null
      ? []
      : M17_SLOTS.map((slot, index) => ({
          id: slot,
          label: `slot ${slot}`,
          sub: inTrial
            ? `now ${shown[index]} · goal ${trial.goal[index]}`
            : s.stage === 'demo'
              ? `example start ${shown[index]}`
              : `recorded ${shown[index]}`,
          tone: 'neutral' as const,
          state:
            inTrial && shown[index] === trial.goal[index]
              ? ('handled' as const)
              : ('pending' as const),
        }));
  const output = inTrial
    ? [
        registerLine('START', trial.start),
        registerLine('NOW', now!),
        registerLine('GOAL', trial.goal),
        '',
        `${trialTitle(trial)} — attempt ${s.attempt} of ${M17_MAX_ATTEMPTS}${
          trial.type === 'transfer' ? ' (no corrective feedback)' : ''
        }`,
      ]
    : s.stage === 'demo'
      ? demoLines()
      : s.stage === 'between'
        ? [
            `${trialTitle(M17_FORMS[s.form].trials[s.trial_index - 1])} recorded.`,
          ]
        : ['Both cases recorded.'];
  const stageLabel = closed
    ? 'CLOSED'
    : s.stage === 'demo'
      ? 'DEMONSTRATION'
      : s.stage === 'between'
        ? 'PRACTICE RECORDED'
        : trial?.type === 'transfer'
          ? 'TRANSFER'
          : 'PRACTICE';
  const consoleLines =
    s.last_console.length > 0
      ? s.last_console
      : closed
        ? ['Training rig closed. Record kept.']
        : s.stage === 'demo'
          ? ['Study the three worked examples, then press READY.']
          : s.stage === 'between'
            ? [
                'NEXT starts the transfer case: a changed register, no corrective feedback.',
              ]
            : trial?.type === 'transfer'
              ? [
                  'Turn START into GOAL with two operators, then SUBMIT. The preview shows your result; no reference is given.',
                ]
              : [
                  'Turn START into GOAL with two operators, then SUBMIT for feedback.',
                ];
  const primaryAction = closed
    ? null
    : s.stage === 'demo'
      ? { id: 'READY', label: 'READY', kind: 'accent' as const }
      : s.stage === 'between'
        ? { id: 'NEXT', label: 'NEXT — TRANSFER', kind: 'accent' as const }
        : inTrial && s.attempts.some((a) => a.trial_index === trial.index)
          ? { id: 'FINISH', label: 'FINISH CASE', kind: 'plain' as const }
          : null;

  return {
    title: 'SIGNAL CASE — PHASE 3 · REGISTER SYNTAX',
    stageLabel,
    instructions:
      s.stage === 'demo'
        ? [
            'The recovered protocol drives a three-slot register (A B C) with',
            'three operators: VEK <slot> <token> sets a slot; ZOR <slot> <slot>',
            'exchanges two slots; KAI <slot> clears a slot. Study the worked',
            'examples, then press READY for one practice case.',
          ]
        : trial?.type === 'transfer'
          ? [
              'Transfer: a changed register. Turn START into GOAL with exactly two',
              'operators (click operator then arguments, or type e.g. ZOR A C).',
              `Up to ${M17_MAX_ATTEMPTS} attempts; the DEMO can be reviewed at any time.`,
            ]
          : [
              'Practice: turn START into GOAL with exactly two operators (click the',
              'operator then its arguments, or type e.g. ZOR A C). SUBMIT shows',
              `neutral feedback; up to ${M17_MAX_ATTEMPTS} attempts before the transfer case.`,
            ],
    incomingTitle: inTrial
      ? 'REGISTER — SLOTS'
      : s.stage === 'demo'
        ? 'REGISTER — EXAMPLE START'
        : 'REGISTER — LAST RECORDED',
    chips,
    bins: [],
    palette: inTrial
      ? paletteFor(M17_GRAMMAR, context(), { slot: 'SLOTS', token: 'TOKENS' })
      : [],
    codebook: [
      {
        title: 'OPERATORS',
        lines: [
          'VEK <slot> <token>  set',
          'ZOR <slot> <slot>   exchange',
          'KAI <slot>          clear → NUL',
        ],
      },
    ],
    outputTitle:
      s.stage === 'demo'
        ? 'DEMONSTRATION — WORKED EXAMPLES'
        : 'REGISTER PREVIEW',
    output,
    buffer: s.program.lines.map((line) => ({
      text: commandToText(line.command),
      input_mode: line.input_mode,
    })),
    consoleLines,
    primaryAction,
    submitEnabled: !closed && inTrial && attemptsLeft > 0,
    chipDropVerb: null,
    chipPairVerb: null,
    editing: !closed && inTrial && attemptsLeft > 0,
    closed,
    reference:
      !closed && s.stage !== 'demo'
        ? {
            label: 'DEMO',
            title: 'DEMONSTRATION — worked examples (review)',
            lines: demoLines(),
          }
        : null,
  };
}

function startTrial(index: number, nowMs: number) {
  const s = ensure();

  s.trial_index = index;
  s.stage = 'trial';
  s.attempt = 1;
  s.program = createProgramState();
  s.trial_started_at_ms = nowMs;
  s.trial_active_ms = 0;
  s.syntax_errors = 0;
  s.corrections = 0;
  s.help_in_trial = 0;
  s.demo_in_trial = 0;
  s.pointer_commands = 0;
  s.typed_commands = 0;

  const trial = currentTrial()!;

  log('trial_started', {
    trial_type: trial.type,
    start: trial.start,
    goal: trial.goal,
    commands_required: M17_COMMANDS_REQUIRED,
    max_attempts: M17_MAX_ATTEMPTS,
  });
}

function open(nowMs: number) {
  const s = ensure();

  declareM17();

  const entry = enterIpWindow(s.window, nowMs);

  if (entry === 'opened') {
    applyTutorialGate();
    log('window_opened', {
      grammar_id: M17_GRAMMAR.id,
      trials_total: M17_TRIALS_TOTAL,
      feedback_trials: M17_FEEDBACK_TRIALS,
      max_attempts_per_trial: M17_MAX_ATTEMPTS,
      demonstration_presented: true,
    });
  } else if (entry === 'reopened') {
    log('window_reopened');
  }

  if (s.stage === 'trial' && s.window.status === 'open') {
    s.trial_started_at_ms = nowMs;
  }

  setConsole([]);
  refreshIpProbe();
}

function leave(nowMs: number) {
  const s = ensure();

  if (s.trial_started_at_ms !== null) {
    s.trial_active_ms += Math.max(0, nowMs - s.trial_started_at_ms);
    s.trial_started_at_ms = null;
  }

  if (s.window.panel_open) {
    leaveIpPanel(s.window, nowMs);
    log('panel_left');
  }
}

function canEdit(): boolean {
  const s = ensure();

  return (
    s.window.status === 'open' &&
    s.stage === 'trial' &&
    s.attempt <= M17_MAX_ATTEMPTS
  );
}

function append(
  command: SemanticCommand,
  mode: InputMode,
  nowMs: number,
): TerminalActionResult {
  void nowMs;

  const s = ensure();

  if (!canEdit()) {
    return { ok: false, message: 'No case is open.' };
  }

  const outcome = appendLine(s.program, M17_GRAMMAR, context(), command, mode);

  if (!outcome.result.ok) {
    s.syntax_errors += 1;
    log('command_refused', {
      text: commandToText({
        verb: command.verb.toUpperCase(),
        args: command.args,
      }),
      reason: outcome.result.reason,
      input_mode: mode,
    });
    setConsole([outcome.result.detail]);

    return { ok: false, message: outcome.result.detail };
  }

  s.program = outcome.state;

  if (mode === 'pointer') {
    s.pointer_commands += 1;
  } else {
    s.typed_commands += 1;
  }

  const line = s.program.lines[s.program.lines.length - 1];

  log('command_added', {
    text: commandToText(line.command),
    input_mode: mode,
    line_index: s.program.lines.length - 1,
  });
  setConsole([]);

  return { ok: true, message: `Added: ${commandToText(line.command)}` };
}

function remove(
  index: number,
  mode: InputMode,
  nowMs: number,
): TerminalActionResult {
  void nowMs;

  const s = ensure();

  if (!canEdit()) {
    return { ok: false, message: 'No case is open.' };
  }

  const outcome = removeLine(s.program, index);

  if (!outcome.result.ok) {
    setConsole([outcome.result.detail]);

    return { ok: false, message: outcome.result.detail };
  }

  const removed = s.program.lines[index];

  s.program = outcome.state;
  s.corrections += 1;
  log('line_removed', {
    text: commandToText(removed.command),
    input_mode: mode,
    line_index: index,
  });
  setConsole([]);

  return { ok: true, message: `Removed line ${index + 1}.` };
}

function clear(mode: InputMode, nowMs: number): TerminalActionResult {
  void nowMs;

  const s = ensure();

  if (!canEdit()) {
    return { ok: false, message: 'No case is open.' };
  }

  const cleared = s.program.lines.length;

  s.corrections += cleared;
  s.program = clearProgram(s.program).state;
  log('buffer_cleared', { cleared, input_mode: mode });
  setConsole([]);

  return { ok: true, message: 'Buffer cleared.' };
}

/** Ends the current case (attempts exhausted, goal reached or FINISH). */
function finishTrial(nowMs: number, reason: string) {
  const s = ensure();
  const trial = currentTrial();

  if (trial === null) {
    return;
  }

  if (s.trial_started_at_ms !== null) {
    s.trial_active_ms += Math.max(0, nowMs - s.trial_started_at_ms);
    s.trial_started_at_ms = null;
  }

  log('trial_finished', {
    trial_type: trial.type,
    attempts: s.attempts.filter((a) => a.trial_index === trial.index).length,
    reason,
  });

  if (trial.index >= M17_TRIALS_TOTAL) {
    s.stage = 'done';
    closeIpWindow(s.window, 'completed', nowMs);
    log('completed', rawSummary());
    setConsole(['Both cases recorded. The training rig is closed.']);
  } else {
    s.stage = 'between';
  }
}

function submit(mode: InputMode, nowMs: number): TerminalActionResult {
  const s = ensure();
  const trial = currentTrial();

  if (!canEdit() || trial === null) {
    return { ok: false, message: 'No case is open.' };
  }

  const evaluation = evaluateTrial(trial, s.program.lines);

  if (s.trial_started_at_ms !== null) {
    s.trial_active_ms += Math.max(0, nowMs - s.trial_started_at_ms);
    s.trial_started_at_ms = nowMs;
  }

  bumpIpSubmission(s.window);

  const record: AttemptRecord = {
    trial_index: trial.index,
    trial_type: trial.type,
    attempt: s.attempt,
    commands_required: evaluation.commands_required,
    commands_correct: evaluation.commands_correct,
    semantic_errors: evaluation.semantic_errors,
    syntax_errors: s.syntax_errors,
    corrections_before_submission: s.corrections,
    feedback_presented: trial.type === 'feedback',
    help_consults: s.help_in_trial,
    demonstration_reviews: s.demo_in_trial,
    active_ms_after_ready: s.trial_active_ms,
    trial_complete: true,
    goal_reached: evaluation.goal_reached,
    command_count: evaluation.command_count,
    pointer_commands: s.pointer_commands,
    typed_commands: s.typed_commands,
    input_mode:
      s.pointer_commands > 0 && s.typed_commands > 0
        ? 'mixed'
        : s.typed_commands > 0
          ? 'typed'
          : s.pointer_commands > 0
            ? 'pointer'
            : null,
    final_register: evaluation.result,
  };

  s.attempts.push(record);
  log('trial_submitted', {
    ...record,
    input_mode: mode,
    buffer: s.program.lines.map((l) => commandToText(l.command)),
  });

  const attemptsLeft = M17_MAX_ATTEMPTS - s.attempt;

  if (trial.type === 'feedback') {
    const lines = evaluation.goal_reached
      ? ['Register matches GOAL.']
      : [
          `Register does not match GOAL. Reference sequence: ${trial.reference.join(' ; ')}.`,
        ];

    log('feedback_presented', { goal_reached: evaluation.goal_reached });

    if (evaluation.goal_reached || attemptsLeft === 0) {
      setConsole([...lines, 'NEXT continues with the transfer case.']);
      finishTrial(
        nowMs,
        evaluation.goal_reached ? 'goal_reached' : 'attempts_used',
      );
    } else {
      s.attempt += 1;
      s.syntax_errors = 0;
      s.corrections = 0;
      setConsole([
        ...lines,
        `Revise and SUBMIT again (attempt ${s.attempt} of ${M17_MAX_ATTEMPTS}), or FINISH CASE.`,
      ]);
    }
  } else if (evaluation.goal_reached || attemptsLeft === 0) {
    setConsole(['Transfer attempt recorded.']);
    finishTrial(
      nowMs,
      evaluation.goal_reached ? 'goal_reached' : 'attempts_used',
    );
  } else {
    s.attempt += 1;
    s.syntax_errors = 0;
    s.corrections = 0;
    setConsole([
      `Transfer attempt ${s.attempt - 1} recorded. Revise and SUBMIT again (attempt ${s.attempt} of ${M17_MAX_ATTEMPTS}), or FINISH CASE.`,
    ]);
  }

  return { ok: true, message: 'Attempt recorded.' };
}

function primary(
  actionId: string,
  mode: InputMode,
  nowMs: number,
): TerminalActionResult {
  const s = ensure();

  if (s.window.status !== 'open') {
    return { ok: false, message: 'The training rig is closed.' };
  }

  if (actionId === 'READY' && s.stage === 'demo') {
    log('ready_acknowledged', { input_mode: mode });
    startTrial(1, nowMs);
    setConsole([]);

    return { ok: true, message: 'Practice case.' };
  }

  if (actionId === 'NEXT' && s.stage === 'between') {
    startTrial(s.trial_index + 1, nowMs);
    setConsole([]);

    return { ok: true, message: 'Transfer case.' };
  }

  if (
    actionId === 'FINISH' &&
    s.stage === 'trial' &&
    s.attempts.some((a) => a.trial_index === s.trial_index)
  ) {
    log('trial_finished', { requested: true, input_mode: mode });
    finishTrial(nowMs, 'finished_by_participant');

    return { ok: true, message: 'Case finished.' };
  }

  return { ok: false, message: 'No stage action available.' };
}

function help(mode: InputMode, nowMs: number): readonly string[] {
  void nowMs;

  const s = ensure();

  bumpIpHelp(s.window);
  s.help_in_trial += 1;
  log('help_consulted', { input_mode: mode });

  return [
    'VEK <slot> <token> sets a slot (e.g. VEK B RED).',
    'ZOR <slot> <slot> exchanges two slots (e.g. ZOR A C).',
    'KAI <slot> clears a slot to NUL (e.g. KAI B).',
    'Each case needs exactly two operators; the preview shows the',
    'register after your buffer. ✕ / REMOVE n deletes a line. SUBMIT',
    'records an attempt; DEMO reopens the worked examples.',
  ];
}

/** DEMO button / typed REFERENCE: a counted demonstration review. */
function consultReference(mode: InputMode, nowMs: number): readonly string[] {
  void nowMs;

  const s = ensure();

  s.demo_views += 1;
  s.demo_in_trial += 1;
  log('demonstration_viewed', {
    view_count: s.demo_views + 1,
    review: true,
    input_mode: mode,
  });

  return demoLines();
}

function stop(nowMs: number) {
  const s = ensure();

  if (s.window.status !== 'open') {
    return;
  }

  closeIpWindow(s.window, 'exited', nowMs);
  log('stopped', rawSummary());
  setConsole(['Training rig closed at your request. Record kept.']);
}

function fail(nowMs: number, detail: string) {
  const s = ensure();

  if (s.window.status !== 'open') {
    return;
  }

  closeIpWindow(s.window, 'technical_failure', nowMs, detail);
  log('technical_failure', { ...rawSummary(), detail });
}

export function m17Probe(): Record<string, unknown> {
  const s = ensure();

  return {
    ...rawSummary(),
    form: s.form,
    stage: s.stage,
    trial_index: s.trial_index,
    attempt: s.attempt,
    active_ms_current_trial: trialActiveMs(Date.now()),
    buffer: s.program.lines.map((line) => ({
      text: commandToText(line.command),
      input_mode: line.input_mode,
    })),
  };
}

export const m17Adapter: TerminalTaskAdapter = {
  id: 'm17',
  grammar: () => M17_GRAMMAR,
  context,
  view,
  open,
  leave,
  append,
  remove,
  clear,
  submit,
  primary,
  help,
  consultReference,
  stop,
  fail,
  probe: m17Probe,
};

registerTerminalAdapter(m17Adapter);

/** Test-only escape hatch. */
export function resetM17State() {
  state = null;
}
