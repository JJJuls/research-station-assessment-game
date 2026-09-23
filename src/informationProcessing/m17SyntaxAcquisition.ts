/**
 * M17 — Register syntax: learning to criterion (Information Processing
 * foundation; Station 080 Unit 9 trial structure).
 *
 * BESSI Information Processing item M17 ("Learn things quickly."). After
 * the demonstration (three worked examples, one per operator) and an
 * explicit READY: TWO uncoached baseline probes (START and GOAL shown, no
 * NOW preview, no feedback), TWELVE feedback learning trials (NOW preview;
 * corrective feedback after the submission, acknowledged with NEXT; all
 * twelve always run) and TWO transfer probes (no preview, no feedback).
 * One FIRST response per trial: SUBMIT records the buffer as it stands and
 * the trial ends. The bounded command grammar is M17's own (VEK / ZOR /
 * KAI over a three-slot register) and is never reused by M14–M16; the
 * demonstration can be reviewed at any time (a counted exposure).
 *
 * Trial-level state and events are preserved raw; the module records the
 * raw fact "the first run of three consecutive correct learning responses
 * ended at trial k" (`criterion_run_reached`) for the extractor to
 * RECOUNT from the `trial_submitted` events — no learning slope or other
 * derived score is computed here.
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
import type { M17Phase, Register, SyntaxTrial } from './syntaxForms';
import {
  evaluateTrial,
  M17_BASELINE_TRIALS,
  M17_COMMANDS_REQUIRED,
  M17_CRITERION_RUN,
  M17_FORMS,
  M17_GRAMMAR,
  M17_LEARNING_TRIALS,
  M17_SLOTS,
  M17_TOKENS,
  M17_TRANSFER_TRIALS,
  M17_TRIALS_TOTAL,
  m17Criterion,
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

export const M17_OPPORTUNITY_ID = 'proto_m17_criterion';
export const M17_ENTRY_STATE_VERSION = 'm17-trials-v3';
export const M17_WINDOW_ID = 'm17_trials_w1';
export const M17_FAMILY = 'proto_m17_trials';
const OBJECT_ID = 'signal_training_rig';
/** Stage / control words a participant may type in the wrong stage (never a syntax error). */
const STAGE_WORDS = new Set(['READY', 'NEXT', 'DEMO', 'FINISH']);

export const M17_EVENT_TYPES = declareIpEvents('proto_m17_trials', [
  'window_opened',
  'window_reopened',
  'panel_left',
  'ready_acknowledged',
  'demonstration_viewed',
  'phase_started',
  'trial_started',
  'command_added',
  'command_refused',
  'line_removed',
  'buffer_cleared',
  'submit_refused',
  'trial_submitted',
  'feedback_presented',
  'feedback_acknowledged',
  'criterion_run_reached',
  'completed',
  'help_consulted',
  'stopped',
  'technical_failure',
  'entry_state_flagged',
]);

export {
  evaluateTrial,
  M17_BASELINE_TRIALS,
  M17_CRITERION_RUN,
  M17_FORMS,
  M17_GRAMMAR,
  M17_LEARNING_TRIALS,
  M17_TRANSFER_TRIALS,
  M17_TRIALS_TOTAL,
  m17Criterion,
  runRegister,
} from './syntaxForms';

export interface M17TrialRecord {
  trial_index: number;
  phase: M17Phase;
  phase_index: number;
  goal_reached: boolean;
  commands_required: number;
  commands_correct: number;
  semantic_errors: number;
  syntax_errors: number;
  corrections_before_submission: number;
  feedback_presented: boolean;
  /** Reading time between the feedback and NEXT (learning trials). */
  feedback_read_ms: number | null;
  help_consults: number;
  demonstration_reviews: number;
  active_ms: number;
  command_count: number;
  pointer_commands: number;
  typed_commands: number;
  input_mode: string | null;
  buffer: string[];
  final_register: Register;
}

type Stage = 'demo' | 'trial' | 'feedback' | 'done';

interface M17State {
  window: IpWindow;
  form: FormId;
  stage: Stage;
  trial_index: number;
  program: ProgramState;
  trial_started_at_ms: number | null;
  trial_active_ms: number;
  feedback_shown_at_ms: number | null;
  feedback_read_ms_acc: number;
  feedback_lines: string[];
  syntax_errors: number;
  corrections: number;
  help_in_trial: number;
  demo_in_trial: number;
  demo_views: number;
  pointer_commands: number;
  typed_commands: number;
  submit_refusals: number;
  trials: M17TrialRecord[];
  criterion_run_trial: number | null;
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
    feedback_shown_at_ms: null,
    feedback_read_ms_acc: 0,
    feedback_lines: [],
    syntax_errors: 0,
    corrections: 0,
    help_in_trial: 0,
    demo_in_trial: 0,
    demo_views: 0,
    pointer_commands: 0,
    typed_commands: 0,
    submit_refusals: 0,
    trials: [],
    criterion_run_trial: null,
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
  const trial = currentTrial();

  logIpEvent('proto_m17_trials', OBJECT_ID, suffix, {
    ...ipWindowFields(s.window),
    window_id: M17_WINDOW_ID,
    stage: s.stage,
    trial_index: s.trial_index,
    phase: trial?.phase ?? null,
    phase_index: trial?.phase_index ?? null,
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

/** Per-phase first-response sequences (raw facts; no score). */
function sequences() {
  const s = ensure();
  const phase = (name: M17Phase) =>
    s.trials.filter((t) => t.phase === name).map((t) => t.goal_reached);

  return {
    baseline: phase('baseline'),
    learning: phase('learning'),
    transfer: phase('transfer'),
  };
}

function rawSummary() {
  const s = ensure();
  const seq = sequences();

  return {
    ...ipWindowFields(s.window),
    window_id: M17_WINDOW_ID,
    form: s.form,
    trials_total: M17_TRIALS_TOTAL,
    baseline_trials: M17_BASELINE_TRIALS,
    learning_trials: M17_LEARNING_TRIALS,
    transfer_trials: M17_TRANSFER_TRIALS,
    criterion_run: M17_CRITERION_RUN,
    trials_completed: s.trials.length,
    sequence: seq,
    /** Raw fact for the extractor's recount — never a score. */
    criterion_run_trial: s.criterion_run_trial,
    learning_responses: seq.learning.length,
    complete_sequence: s.trials.length >= M17_TRIALS_TOTAL,
    trials: s.trials.map((trial) => ({ ...trial })),
    // Window-level help (every stage) + demonstration reviews (review G-L2).
    hints_used: s.window.help_consults + s.demo_views,
    help_consults_total: s.window.help_consults,
    demonstration_exposures: 1 + s.demo_views,
    submit_refusals: s.submit_refusals,
    time_by_phase_ms: {
      baseline: s.trials
        .filter((t) => t.phase === 'baseline')
        .reduce((sum, t) => sum + t.active_ms, 0),
      learning: s.trials
        .filter((t) => t.phase === 'learning')
        .reduce((sum, t) => sum + t.active_ms, 0),
      transfer: s.trials
        .filter((t) => t.phase === 'transfer')
        .reduce((sum, t) => sum + t.active_ms, 0),
    },
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

const PHASE_TITLE: Record<M17Phase, string> = {
  baseline: 'BASELINE',
  learning: 'LEARNING',
  transfer: 'TRANSFER',
};
const PHASE_TOTAL: Record<M17Phase, number> = {
  baseline: M17_BASELINE_TRIALS,
  learning: M17_LEARNING_TRIALS,
  transfer: M17_TRANSFER_TRIALS,
};

function trialTitle(trial: SyntaxTrial): string {
  return `${PHASE_TITLE[trial.phase]} ${trial.phase_index} of ${PHASE_TOTAL[trial.phase]}`;
}

/** The NOW preview is shown on learning trials only (matrix: none on baseline / transfer). */
function previewAllowed(trial: SyntaxTrial | null): boolean {
  return trial !== null && trial.phase === 'learning';
}

function view(): TerminalView {
  const s = ensure();
  const closed = ipWindowIsClosed(s.window);
  const form = M17_FORMS[s.form];
  const trial = currentTrial();
  const inTrial = !closed && s.stage === 'trial' && trial !== null;
  const preview = inTrial && previewAllowed(trial);
  const now = inTrial ? runRegister(trial.start, s.program.lines) : null;
  const shown: Register | null = inTrial
    ? trial.start
    : s.stage === 'demo'
      ? form.demo[0].before
      : (s.trials[s.trials.length - 1]?.final_register ?? null);
  const chips =
    shown === null
      ? []
      : M17_SLOTS.map((slot, index) => ({
          id: slot,
          label: `slot ${slot}`,
          sub: inTrial
            ? preview
              ? `N:${now![index]}  G:${trial.goal[index]}`
              : `S:${trial.start[index]}  G:${trial.goal[index]}`
            : s.stage === 'demo'
              ? `example ${shown[index]}`
              : `recorded ${shown[index]}`,
          tone: 'neutral' as const,
          state:
            preview && now![index] === trial.goal[index]
              ? ('handled' as const)
              : ('pending' as const),
        }));
  const output = inTrial
    ? [
        registerLine('START', trial.start),
        ...(preview ? [registerLine('NOW', now!)] : []),
        registerLine('GOAL', trial.goal),
        '',
        trialTitle(trial),
      ]
    : s.stage === 'demo'
      ? demoLines()
      : s.stage === 'feedback' && trial !== null
        ? [
            registerLine('GOAL', trial.goal),
            registerLine(
              'YOURS',
              s.trials[s.trials.length - 1]?.final_register ?? trial.start,
            ),
            '',
            `${trialTitle(trial)} recorded.`,
          ]
        : ['All sixteen trials recorded.'];
  const stageLabel = closed
    ? 'CLOSED'
    : s.stage === 'demo'
      ? 'DEMONSTRATION'
      : s.stage === 'feedback'
        ? 'FEEDBACK'
        : trial !== null
          ? PHASE_TITLE[trial.phase]
          : 'RECORDED';
  const consoleLines =
    s.last_console.length > 0
      ? s.last_console
      : closed
        ? ['Training rig closed. Record kept.']
        : s.stage === 'demo'
          ? ['Study the three worked examples, then press READY.']
          : s.stage === 'feedback'
            ? // The feedback lines survive a leave / reopen (review G-M1).
              [...s.feedback_lines, 'NEXT continues.']
            : trial?.phase === 'baseline'
              ? [
                  'Turn START into GOAL with two operators, then SUBMIT. No result is shown on these two trials.',
                ]
              : trial?.phase === 'transfer'
                ? [
                    'Turn START into GOAL with two operators, then SUBMIT. No result is shown on these two trials.',
                  ]
                : [
                    'Turn START into GOAL with two operators, then SUBMIT for feedback.',
                  ];
  const primaryAction = closed
    ? null
    : s.stage === 'demo'
      ? { id: 'READY', label: 'READY', kind: 'accent' as const }
      : s.stage === 'feedback'
        ? { id: 'NEXT', label: 'NEXT', kind: 'accent' as const }
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
            `examples, then press READY: ${M17_TRIALS_TOTAL} short cases follow, two operators each.`,
          ]
        : trial?.phase === 'baseline'
          ? [
              `Baseline (${M17_BASELINE_TRIALS} cases): turn START into GOAL with exactly two`,
              'operators (click the operator then its arguments, or type e.g. ZOR A C).',
              'SUBMIT records your answer and moves on; nothing is shown about it.',
            ]
          : trial?.phase === 'transfer'
            ? [
                `Transfer (${M17_TRANSFER_TRIALS} cases): two further cases with the same operators.`,
                'Turn START into GOAL with exactly two operators. SUBMIT records your',
                'answer and moves on; nothing is shown about it.',
              ]
            : [
                `Learning (${M17_LEARNING_TRIALS} cases): turn START into GOAL with exactly two`,
                'operators. NOW shows the register after your buffer. SUBMIT records',
                'your answer and shows whether it matched; NEXT continues.',
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
        : s.stage === 'feedback'
          ? 'RESULT'
          : preview
            ? 'REGISTER PREVIEW'
            : 'REGISTER — START AND GOAL',
    output,
    buffer: s.program.lines.map((line) => ({
      text: commandToText(line.command),
      input_mode: line.input_mode,
    })),
    consoleLines,
    primaryAction,
    submitEnabled: !closed && inTrial,
    chipDropVerb: null,
    chipPairVerb: null,
    editing: !closed && inTrial,
    closed,
    // The terminal's typed alias for this control is REFERENCE (review G-H1).
    reference:
      !closed && s.stage !== 'demo'
        ? {
            label: 'REFERENCE',
            title: 'WORKED EXAMPLES — the demonstration (review)',
            lines: demoLines(),
          }
        : null,
  };
}

function startTrial(index: number, nowMs: number) {
  const s = ensure();
  const previous = currentTrial();

  s.trial_index = index;
  s.stage = 'trial';
  s.program = createProgramState();
  s.trial_started_at_ms = nowMs;
  s.trial_active_ms = 0;
  s.feedback_shown_at_ms = null;
  s.feedback_read_ms_acc = 0;
  s.feedback_lines = [];
  s.syntax_errors = 0;
  s.corrections = 0;
  s.help_in_trial = 0;
  s.demo_in_trial = 0;
  s.pointer_commands = 0;
  s.typed_commands = 0;

  const trial = currentTrial()!;

  if (previous === null || previous.phase !== trial.phase) {
    log('phase_started', {
      phase: trial.phase,
      trials_in_phase: PHASE_TOTAL[trial.phase],
      preview: previewAllowed(trial),
      feedback: trial.phase === 'learning',
    });
  }

  log('trial_started', {
    start: trial.start,
    goal: trial.goal,
    commands_required: M17_COMMANDS_REQUIRED,
    preview: previewAllowed(trial),
    feedback: trial.phase === 'learning',
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
      baseline_trials: M17_BASELINE_TRIALS,
      learning_trials: M17_LEARNING_TRIALS,
      transfer_trials: M17_TRANSFER_TRIALS,
      criterion_run: M17_CRITERION_RUN,
      demonstration_presented: true,
    });
  } else if (entry === 'reopened') {
    log('window_reopened');
  }

  if (s.stage === 'trial' && s.window.status === 'open') {
    s.trial_started_at_ms = nowMs;
  }

  if (s.stage === 'feedback' && s.window.status === 'open') {
    s.feedback_shown_at_ms = nowMs;
  }

  if (s.stage !== 'feedback') {
    setConsole([]);
  }

  refreshIpProbe();
}

function leave(nowMs: number) {
  const s = ensure();

  if (s.trial_started_at_ms !== null) {
    s.trial_active_ms += Math.max(0, nowMs - s.trial_started_at_ms);
    s.trial_started_at_ms = null;
  }

  if (s.feedback_shown_at_ms !== null) {
    s.feedback_read_ms_acc += Math.max(0, nowMs - s.feedback_shown_at_ms);
    s.feedback_shown_at_ms = null;
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
    return { ok: false, message: 'No case is open.' };
  }

  if (STAGE_WORDS.has(command.verb.toUpperCase())) {
    log('command_refused', {
      text: command.verb.toUpperCase(),
      reason: 'stage_word_out_of_stage',
      input_mode: mode,
    });
    setConsole([`${command.verb.toUpperCase()} is not available now.`]);

    return {
      ok: false,
      message: `${command.verb.toUpperCase()} is not available now.`,
    };
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

function completeSeries(nowMs: number) {
  const s = ensure();

  s.stage = 'done';
  closeIpWindow(s.window, 'completed', nowMs);
  log('completed', rawSummary());
  setConsole(['All sixteen trials recorded. The training rig is closed.']);
}

/** Advances after a recorded trial: the next trial, or the series end. */
function advance(nowMs: number) {
  const s = ensure();

  if (s.trial_index >= M17_TRIALS_TOTAL) {
    completeSeries(nowMs);
  } else {
    startTrial(s.trial_index + 1, nowMs);
  }
}

function submit(mode: InputMode, nowMs: number): TerminalActionResult {
  const s = ensure();
  const trial = currentTrial();

  if (!canEdit() || trial === null) {
    return { ok: false, message: 'No case is open.' };
  }

  if (s.program.lines.length !== M17_COMMANDS_REQUIRED) {
    const message =
      s.program.lines.length === 0
        ? 'Add two operators before SUBMIT.'
        : `Exactly two operators are needed — the buffer has ${s.program.lines.length}.`;

    s.submit_refusals += 1;
    log('submit_refused', {
      reason: s.program.lines.length === 0 ? 'empty_buffer' : 'line_count',
      line_count: s.program.lines.length,
      input_mode: mode,
    });
    setConsole([message]);

    return { ok: false, message };
  }

  const evaluation = evaluateTrial(trial, s.program.lines);

  if (s.trial_started_at_ms !== null) {
    s.trial_active_ms += Math.max(0, nowMs - s.trial_started_at_ms);
    s.trial_started_at_ms = null;
  }

  bumpIpSubmission(s.window);

  const record: M17TrialRecord = {
    trial_index: trial.index,
    phase: trial.phase,
    phase_index: trial.phase_index,
    goal_reached: evaluation.goal_reached,
    commands_required: evaluation.commands_required,
    commands_correct: evaluation.commands_correct,
    semantic_errors: evaluation.semantic_errors,
    syntax_errors: s.syntax_errors,
    corrections_before_submission: s.corrections,
    feedback_presented: trial.phase === 'learning',
    feedback_read_ms: null,
    help_consults: s.help_in_trial,
    demonstration_reviews: s.demo_in_trial,
    active_ms: s.trial_active_ms,
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
    buffer: s.program.lines.map((l) => commandToText(l.command)),
    final_register: evaluation.result,
  };

  s.trials.push(record);
  log('trial_submitted', { ...record, submit_input_mode: mode });
  // Per-trial counters end with the record (review S-L2).
  s.help_in_trial = 0;
  s.demo_in_trial = 0;

  if (trial.phase === 'learning') {
    // The raw fact of the first run of three (recounted by the extractor).
    if (s.criterion_run_trial === null) {
      const criterion = m17Criterion(sequences().learning);

      if (criterion.attained) {
        s.criterion_run_trial = criterion.criterion_trial;
        log('criterion_run_reached', {
          learning_trial: criterion.criterion_trial,
          run: M17_CRITERION_RUN,
        });
      }
    }

    const lines = evaluation.goal_reached
      ? ['Register matches GOAL.']
      : [
          `Register does not match GOAL. Reference sequence: ${trial.reference.join(' ; ')}.`,
        ];

    s.stage = 'feedback';
    s.feedback_shown_at_ms = nowMs;
    s.feedback_read_ms_acc = 0;
    s.feedback_lines = lines;
    log('feedback_presented', {
      goal_reached: evaluation.goal_reached,
      reference_shown: !evaluation.goal_reached,
    });
    setConsole([...lines, 'NEXT continues.']);
  } else {
    setConsole([`${trialTitle(trial)} recorded.`]);
    advance(nowMs);
  }

  return { ok: true, message: 'Answer recorded.' };
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

    return { ok: true, message: 'Baseline case 1.' };
  }

  if (actionId === 'NEXT' && s.stage === 'feedback') {
    const last = s.trials[s.trials.length - 1];
    const readMs =
      s.feedback_read_ms_acc +
      (s.feedback_shown_at_ms === null
        ? 0
        : Math.max(0, nowMs - s.feedback_shown_at_ms));

    if (last !== undefined) {
      last.feedback_read_ms = readMs;
    }

    log('feedback_acknowledged', { read_ms: readMs, input_mode: mode });
    setConsole([]);
    advance(nowMs);

    return { ok: true, message: 'Next case.' };
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
    'Each case needs exactly two operators. ✕ / REMOVE n deletes a line.',
    'SUBMIT records your answer once per case (exactly two operators);',
    'REFERENCE reopens the worked examples.',
  ];
}

/** REFERENCE button / typed REFERENCE: a counted demonstration review. */
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

  if (s.trial_started_at_ms !== null) {
    s.trial_active_ms += Math.max(0, nowMs - s.trial_started_at_ms);
    s.trial_started_at_ms = null;
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
    stage: s.stage,
    trial_index: s.trial_index,
    phase: currentTrial()?.phase ?? null,
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
