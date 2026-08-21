/**
 * M17 — Alien Syntax Acquisition (Information Processing foundation).
 *
 * BESSI Information Processing item M17 ("Learn things quickly.") — the
 * provisional behavioural analogue is learning a NEW bounded command
 * grammar (its own: VEK / ZOR / KAI over a three-slot register) across
 * matched short trials: a standardised demonstration, explicit READY,
 * four feedback trials of matched difficulty (two operators each), one
 * transfer trial without corrective feedback, explicit submission per
 * trial. Trial-level state and events are preserved raw; NO learning
 * slope, trials-to-criterion or other derived score is computed here.
 *
 * Raw observables per trial: trial index/type, commands required /
 * correct, semantic errors, syntax errors, corrections before submission,
 * feedback presented, help consults, active time after READY, trial
 * complete, input mode. Plus the raw number of completed trials.
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
export const M17_ENTRY_STATE_VERSION = 'm17-syntax-v1';
const OBJECT_ID = 'ip_syntax_trainer';

export const M17_EVENT_TYPES = declareIpEvents('proto_m17_syntax', [
  'window_opened',
  'window_reopened',
  'panel_left',
  'ready_acknowledged',
  'trial_started',
  'command_added',
  'command_refused',
  'line_removed',
  'buffer_cleared',
  'trial_submitted',
  'feedback_presented',
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
  M17_TRIALS_TOTAL,
  runRegister,
} from './syntaxForms';

interface TrialRecord {
  trial_index: number;
  trial_type: 'feedback' | 'transfer';
  commands_required: number;
  commands_correct: number;
  semantic_errors: number;
  syntax_errors: number;
  corrections_before_submission: number;
  feedback_presented: boolean;
  help_consults: number;
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
  program: ProgramState;
  trial_started_at_ms: number | null;
  trial_active_ms: number;
  syntax_errors: number;
  corrections: number;
  help_in_trial: number;
  pointer_commands: number;
  typed_commands: number;
  trials: TrialRecord[];
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
    program: createProgramState(),
    trial_started_at_ms: null,
    trial_active_ms: 0,
    syntax_errors: 0,
    corrections: 0,
    help_in_trial: 0,
    pointer_commands: 0,
    typed_commands: 0,
    trials: [],
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
    stage: s.stage,
    trial_index: s.trial_index,
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

function rawSummary() {
  const s = ensure();

  return {
    ...ipWindowFields(s.window),
    trials_total: M17_TRIALS_TOTAL,
    feedback_trials: M17_FEEDBACK_TRIALS,
    trials_completed: s.trials.filter((trial) => trial.trial_complete).length,
    trials: s.trials.map((trial) => ({ ...trial })),
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
      'terminal orientation failed before this opportunity',
    );
    s.entry_flagged = true;
    log('entry_state_flagged', { reason: 'comprehension_failure' });
  } else if (status !== 'complete') {
    noteIpPriorExposure(s.window, 'terminal_orientation_not_completed');
    flagIpWindow(
      s.window,
      'invalid_entry_state',
      'terminal orientation not completed before this opportunity',
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

function view(): TerminalView {
  const s = ensure();
  const closed = ipWindowIsClosed(s.window);
  const form = M17_FORMS[s.form];
  const trial = currentTrial();
  const inTrial = s.stage === 'trial' && trial !== null;
  const now = inTrial ? runRegister(trial.start, s.program.lines) : null;
  const chips = inTrial
    ? M17_SLOTS.map((slot, index) => ({
        id: slot,
        label: `slot ${slot}`,
        sub: `now ${now![index]} · goal ${trial.goal[index]}`,
        tone: 'neutral' as const,
        state:
          now![index] === trial.goal[index]
            ? ('handled' as const)
            : ('pending' as const),
      }))
    : [];
  const output = inTrial
    ? [
        registerLine('START', trial.start),
        registerLine('NOW', now!),
        registerLine('GOAL', trial.goal),
        '',
        `Trial ${trial.index} of ${M17_TRIALS_TOTAL}${trial.type === 'transfer' ? ' — transfer (no feedback)' : ''}`,
      ]
    : s.stage === 'demo'
      ? form.demo.flatMap((example) => [
          `${example.command}`,
          `  ${registerLine('before', example.before)}`,
          `  ${registerLine('after', example.after)}`,
        ])
      : s.stage === 'between'
        ? [`Trial ${s.trial_index} recorded. NEXT TRIAL continues.`]
        : ['All five trials recorded.'];
  const stageLabel = closed
    ? 'CLOSED'
    : s.stage === 'demo'
      ? 'DEMONSTRATION'
      : s.stage === 'between'
        ? `TRIAL ${s.trial_index} RECORDED`
        : trial?.type === 'transfer'
          ? 'TRANSFER TRIAL'
          : `TRIAL ${s.trial_index} OF ${M17_TRIALS_TOTAL}`;
  const consoleLines =
    s.last_console.length > 0
      ? s.last_console
      : closed
        ? ['Trainer closed. Record kept.']
        : s.stage === 'demo'
          ? ['Study the three worked examples, then press READY.']
          : s.stage === 'between'
            ? ['NEXT TRIAL starts the next register.']
            : [
                'Compose the two operators that turn START into GOAL, then SUBMIT.',
              ];

  return {
    title: 'SYNTAX TRAINER — REGISTER OPERATORS',
    stageLabel,
    instructions:
      s.stage === 'demo'
        ? [
            'A recovered control dialect drives a three-slot register (A B C).',
            'Three operators: VEK <slot> <token> sets a slot; ZOR <slot> <slot>',
            'exchanges two slots; KAI <slot> clears a slot to NUL. Study the',
            'worked examples in the preview, then press READY for trial 1.',
          ]
        : [
            'Turn START into GOAL with exactly two operators: click the operator',
            'then its arguments in the palette, or type them (e.g. ZOR A C).',
            'Revise before SUBMIT; each trial is recorded separately.',
          ],
    incomingTitle: inTrial ? 'REGISTER — SLOTS' : 'REGISTER',
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
    outputTitle: s.stage === 'demo' ? 'WORKED EXAMPLES' : 'REGISTER PREVIEW',
    output,
    buffer: s.program.lines.map((line) => ({
      text: commandToText(line.command),
      input_mode: line.input_mode,
    })),
    consoleLines,
    primaryAction: closed
      ? null
      : s.stage === 'demo'
        ? { id: 'READY', label: 'READY', kind: 'accent' }
        : s.stage === 'between'
          ? { id: 'NEXT', label: 'NEXT TRIAL', kind: 'accent' }
          : null,
    submitEnabled: !closed && inTrial,
    chipDropVerb: null,
    chipPairVerb: null,
    editing: !closed && inTrial,
    closed,
  };
}

function startTrial(index: number, nowMs: number) {
  const s = ensure();

  s.trial_index = index;
  s.stage = 'trial';
  s.program = createProgramState();
  s.trial_started_at_ms = nowMs;
  s.trial_active_ms = 0;
  s.syntax_errors = 0;
  s.corrections = 0;
  s.help_in_trial = 0;
  s.pointer_commands = 0;
  s.typed_commands = 0;

  const trial = currentTrial()!;

  log('trial_started', {
    trial_type: trial.type,
    start: trial.start,
    goal: trial.goal,
    commands_required: M17_COMMANDS_REQUIRED,
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

  return s.window.status === 'open' && s.stage === 'trial';
}

function append(
  command: SemanticCommand,
  mode: InputMode,
  nowMs: number,
): TerminalActionResult {
  void nowMs;

  const s = ensure();

  if (!canEdit()) {
    return { ok: false, message: 'No trial is open.' };
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
    return { ok: false, message: 'No trial is open.' };
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
    return { ok: false, message: 'No trial is open.' };
  }

  const cleared = s.program.lines.length;

  s.corrections += cleared;
  s.program = clearProgram(s.program).state;
  log('buffer_cleared', { cleared, input_mode: mode });
  setConsole([]);

  return { ok: true, message: 'Buffer cleared.' };
}

function submit(mode: InputMode, nowMs: number): TerminalActionResult {
  const s = ensure();
  const trial = currentTrial();

  if (!canEdit() || trial === null) {
    return { ok: false, message: 'No trial is open.' };
  }

  const evaluation = evaluateTrial(trial, s.program.lines);

  if (s.trial_started_at_ms !== null) {
    s.trial_active_ms += Math.max(0, nowMs - s.trial_started_at_ms);
    s.trial_started_at_ms = null;
  }

  bumpIpSubmission(s.window);

  const record: TrialRecord = {
    trial_index: trial.index,
    trial_type: trial.type,
    commands_required: evaluation.commands_required,
    commands_correct: evaluation.commands_correct,
    semantic_errors: evaluation.semantic_errors,
    syntax_errors: s.syntax_errors,
    corrections_before_submission: s.corrections,
    feedback_presented: trial.type === 'feedback',
    help_consults: s.help_in_trial,
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

  s.trials.push(record);
  log('trial_submitted', {
    ...record,
    input_mode: mode,
    buffer: s.program.lines.map((l) => commandToText(l.command)),
  });

  if (trial.type === 'feedback') {
    const lines = evaluation.goal_reached
      ? ['Register matches GOAL.']
      : [
          `Register does not match GOAL. Reference sequence: ${trial.reference.join(' ; ')}.`,
        ];

    log('feedback_presented', { goal_reached: evaluation.goal_reached });
    setConsole([...lines, 'NEXT TRIAL continues.']);
  } else {
    setConsole(['Transfer trial recorded.']);
  }

  if (trial.index >= M17_TRIALS_TOTAL) {
    s.stage = 'done';
    closeIpWindow(s.window, 'completed', nowMs);
    log('completed', rawSummary());
    setConsole(['All five trials recorded. The trainer is closed.']);
  } else {
    s.stage = 'between';
  }

  return { ok: true, message: 'Trial recorded.' };
}

function primary(
  actionId: string,
  mode: InputMode,
  nowMs: number,
): TerminalActionResult {
  const s = ensure();

  if (s.window.status !== 'open') {
    return { ok: false, message: 'The trainer is closed.' };
  }

  if (actionId === 'READY' && s.stage === 'demo') {
    log('ready_acknowledged', { input_mode: mode });
    startTrial(1, nowMs);
    setConsole([]);

    return { ok: true, message: 'Trial 1.' };
  }

  if (actionId === 'NEXT' && s.stage === 'between') {
    startTrial(s.trial_index + 1, nowMs);
    setConsole([]);

    return { ok: true, message: `Trial ${s.trial_index}.` };
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
    'Each trial needs exactly two operators; the preview shows the',
    'register after your buffer. ✕ / REMOVE n deletes a line. SUBMIT',
    'records the trial.',
  ];
}

function stop(nowMs: number) {
  const s = ensure();

  if (s.window.status !== 'open') {
    return;
  }

  closeIpWindow(s.window, 'exited', nowMs);
  log('stopped', rawSummary());
  setConsole(['Trainer closed at your request. Record kept.']);
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
  stop,
  fail,
  probe: m17Probe,
};

registerTerminalAdapter(m17Adapter);

/** Test-only escape hatch. */
export function resetM17State() {
  state = null;
}
