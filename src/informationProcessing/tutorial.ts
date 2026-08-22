/**
 * Common terminal orientation + calibration (Information Processing
 * foundation).
 *
 * Teaches the analysis terminal once before any decoder opportunity:
 * three practice fragments, one two-line codebook, every input path
 * (drag onto a destination, click-compose, typed command), line removal,
 * and explicit submission. The closing submission doubles as the
 * comprehension check: the three fragments must be routed consistently
 * with the codebook within two submissions.
 *
 * SCIENTIFIC BOUNDARY:
 * - Family `proto_ip_tutorial_*` ONLY. Tutorial events are NEVER item
 *   evidence for M13–M18.
 * - Calibration fields (pointer/typed counts, time to first command) are
 *   contextual raw data, never a score.
 * - A failed or skipped tutorial invalidates later decoder opportunities
 *   (comprehension_failure / invalid_entry_state); it never lowers them.
 */

import { commandToText, paletteFor } from './commands';
import type {
  CommandContext,
  Fragment,
  GrammarSpec,
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
  evaluateWorkspace,
  removeLine,
} from './programEngine';
import { declareIpEvents, logIpEvent } from './telemetry';
import { registerTerminalAdapter } from './terminalAdapters';
import type { IpWindow } from './windowState';
import {
  bumpIpHelp,
  bumpIpSubmission,
  closeIpWindow,
  createIpWindow,
  declareIpWindow,
  enterIpWindow,
  ipWindowFields,
  ipWindowIsClosed,
  leaveIpPanel,
} from './windowState';

export const TUTORIAL_OPPORTUNITY_ID = 'proto_ip_terminal_tutorial';
export const TUTORIAL_ENTRY_STATE_VERSION = 'ip-terminal-tutorial-v1';
export const TUTORIAL_MAX_SUBMISSIONS = 2;
const OBJECT_ID = 'ip_terminal_tutorial';

export const TUTORIAL_EVENT_TYPES = declareIpEvents('proto_ip_tutorial', [
  'window_opened',
  'window_reopened',
  'command_added',
  'command_refused',
  'line_removed',
  'buffer_cleared',
  'help_consulted',
  'submitted',
  'completed',
  'failed',
  'panel_left',
  'stopped',
]);

export type TutorialStatus =
  | 'not_attempted'
  | 'in_progress'
  | 'complete'
  | 'failed';

export const TUTORIAL_GRAMMAR: GrammarSpec = {
  id: 'tutorial-v1',
  verbs: [
    {
      verb: 'ROUTE',
      args: [
        { kind: 'fragment', label: 'fragment' },
        { kind: 'destination', label: 'destination' },
      ],
      summary: 'Send a fragment to a destination.',
    },
  ],
};

export const TUTORIAL_FRAGMENTS: readonly Fragment[] = [
  { id: 'T1', channel: 'ALPHA', payload: 'hdr 4F' },
  { id: 'T2', channel: 'BETA', payload: 'hdr 9C' },
  { id: 'T3', channel: 'ALPHA', payload: 'hdr 2B' },
];

export const TUTORIAL_DESTINATIONS = ['ARCHIVE', 'RELAY'] as const;

/** The codebook: channel → destination (visible throughout). */
export const TUTORIAL_RULES: Record<string, string> = {
  ALPHA: 'ARCHIVE',
  BETA: 'RELAY',
};

interface TutorialState {
  window: IpWindow;
  program: ProgramState;
  status: TutorialStatus;
  pointer_commands: number;
  typed_commands: number;
  removals: number;
  first_command_at_ms: number | null;
  opened_at_ms: number | null;
  last_console: string[];
  help_lines_shown: boolean;
}

function createInitialState(): TutorialState {
  return {
    window: createIpWindow({
      opportunity_id: TUTORIAL_OPPORTUNITY_ID,
      owner: 'tutorial (no item)',
      entry_state_version: TUTORIAL_ENTRY_STATE_VERSION,
      form_id: null,
    }),
    program: createProgramState(),
    status: 'not_attempted',
    pointer_commands: 0,
    typed_commands: 0,
    removals: 0,
    first_command_at_ms: null,
    opened_at_ms: null,
    last_console: [],
    help_lines_shown: false,
  };
}

let state = createInitialState();

function context(): CommandContext {
  return {
    sets: {
      fragment: TUTORIAL_FRAGMENTS.map((fragment) => fragment.id),
      destination: [...TUTORIAL_DESTINATIONS],
    },
  };
}

function log(suffix: string, metadata: Record<string, unknown> = {}) {
  logIpEvent('proto_ip_tutorial', OBJECT_ID, suffix, {
    ...ipWindowFields(state.window),
    ...metadata,
  });
  refreshIpProbe();
}

export function tutorialStatus(): TutorialStatus {
  return state.status;
}

/** Contextual calibration record (never a score). */
export function tutorialCalibration() {
  return {
    status: state.status,
    pointer_commands: state.pointer_commands,
    typed_commands: state.typed_commands,
    removals: state.removals,
    ms_to_first_command:
      state.first_command_at_ms !== null && state.opened_at_ms !== null
        ? state.first_command_at_ms - state.opened_at_ms
        : null,
    submissions: state.window.submission_count,
    active_ms: state.window.active_ms,
  };
}

function routingSummary() {
  const evaluation = evaluateWorkspace(state.program.lines);
  let correct = 0;
  let incorrect = 0;
  let unrouted = 0;

  for (const fragment of TUTORIAL_FRAGMENTS) {
    const route = evaluation.routes[fragment.id];

    if (route === undefined) {
      unrouted += 1;
    } else if (route === TUTORIAL_RULES[fragment.channel]) {
      correct += 1;
    } else {
      incorrect += 1;
    }
  }

  return { evaluation, correct, incorrect, unrouted };
}

function declare() {
  declareIpWindow(state.window);
  registerIpProbeSource('tutorial', TUTORIAL_OPPORTUNITY_ID, tutorialProbe);
  refreshIpProbe();
}

/** Called by the Lab scene on create (the station exists → offered). */
export function declareTutorial() {
  declare();
}

function modesRemaining(): string[] {
  const remaining: string[] = [];

  if (state.pointer_commands === 0) {
    remaining.push('one command by drag or click');
  }

  if (state.typed_commands === 0) {
    remaining.push('one command by typing');
  }

  return remaining;
}

function readyToSubmit(): boolean {
  return state.status === 'in_progress' && modesRemaining().length === 0;
}

function view(): TerminalView {
  const { evaluation, correct, incorrect, unrouted } = routingSummary();
  const closed = ipWindowIsClosed(state.window);
  const chips = TUTORIAL_FRAGMENTS.map((fragment) => ({
    id: fragment.id,
    label: fragment.id,
    sub: `${fragment.channel} · ${fragment.payload}`,
    tone: fragment.channel.toLowerCase() as 'alpha' | 'beta',
    state:
      evaluation.routes[fragment.id] === undefined
        ? ('pending' as const)
        : ('handled' as const),
  }));
  const output = TUTORIAL_FRAGMENTS.map((fragment) => {
    const route = evaluation.routes[fragment.id];

    return `${fragment.id}  ${fragment.channel.padEnd(5)}  →  ${route ?? '— (no instruction)'}`;
  });
  const remaining = modesRemaining();
  const consoleLines =
    state.last_console.length > 0
      ? state.last_console
      : closed
        ? [
            state.status === 'complete'
              ? 'Orientation complete. The terminal is ready for live work.'
              : 'Orientation closed. Record kept.',
          ]
        : remaining.length > 0
          ? [`Still to try: ${remaining.join(' · ')}.`]
          : [
              `${correct + incorrect} of ${TUTORIAL_FRAGMENTS.length} fragments have an instruction` +
                (unrouted > 0 ? ` (${unrouted} without).` : '.'),
              'Check the preview against the codebook, then SUBMIT.',
            ];

  return {
    title: 'ANALYSIS TERMINAL — ORIENTATION',
    stageLabel: closed
      ? state.status === 'complete'
        ? 'COMPLETE'
        : 'CLOSED'
      : 'PRACTICE',
    instructions: [
      'Recovered fragments arrive on the left; commands go into the program',
      'buffer in order and the preview updates live. Route each practice',
      'fragment where its channel requires — drag it onto a destination,',
      'click ROUTE → fragment → destination, or type it (ROUTE T2 RELAY).',
      '✕ or REMOVE n deletes a line. Finish with SUBMIT.',
    ],
    incomingTitle: 'INCOMING — PRACTICE FRAGMENTS',
    chips,
    bins: TUTORIAL_DESTINATIONS.map((id) => ({ id, label: id })),
    palette: paletteFor(TUTORIAL_GRAMMAR, context(), {
      destination: 'DESTINATIONS',
    }),
    codebook: [
      {
        title: 'CODEBOOK — CHANNEL ROUTING',
        lines: ['ALPHA  →  ARCHIVE', 'BETA   →  RELAY'],
      },
    ],
    outputTitle: 'OUTPUT PREVIEW — ROUTING TABLE',
    output,
    buffer: state.program.lines.map((line) => ({
      text: commandToText(line.command),
      input_mode: line.input_mode,
    })),
    consoleLines,
    primaryAction: null,
    submitEnabled: readyToSubmit(),
    chipDropVerb: 'ROUTE',
    chipPairVerb: null,
    editing: !closed,
    closed,
  };
}

function setConsole(lines: string[]) {
  state.last_console = lines;
}

function open(nowMs: number) {
  declare();

  const entry = enterIpWindow(state.window, nowMs);

  if (entry === 'opened') {
    state.status = 'in_progress';
    state.opened_at_ms = nowMs;
    log('window_opened', { fragments: TUTORIAL_FRAGMENTS.length });
  } else if (entry === 'reopened') {
    log('window_reopened');
  }

  setConsole([]);
  refreshIpProbe();
}

function leave(nowMs: number) {
  if (state.window.panel_open) {
    leaveIpPanel(state.window, nowMs);
    log('panel_left');
  }
}

function append(
  command: SemanticCommand,
  mode: InputMode,
  nowMs: number,
): TerminalActionResult {
  if (state.status !== 'in_progress') {
    return { ok: false, message: 'Orientation is closed.' };
  }

  const outcome = appendLine(
    state.program,
    TUTORIAL_GRAMMAR,
    context(),
    command,
    mode,
  );

  if (!outcome.result.ok) {
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

  state.program = outcome.state;

  if (mode === 'pointer') {
    state.pointer_commands += 1;
  } else {
    state.typed_commands += 1;
  }

  if (state.first_command_at_ms === null) {
    state.first_command_at_ms = nowMs;
  }

  const line = state.program.lines[state.program.lines.length - 1];

  log('command_added', {
    text: commandToText(line.command),
    input_mode: mode,
    line_index: state.program.lines.length - 1,
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

  if (state.status !== 'in_progress') {
    return { ok: false, message: 'Orientation is closed.' };
  }

  const outcome = removeLine(state.program, index);

  if (!outcome.result.ok) {
    setConsole([outcome.result.detail]);

    return { ok: false, message: outcome.result.detail };
  }

  const removed = state.program.lines[index];

  state.program = outcome.state;
  state.removals += 1;
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

  if (state.status !== 'in_progress') {
    return { ok: false, message: 'Orientation is closed.' };
  }

  const cleared = state.program.lines.length;

  state.program = clearProgram(state.program).state;
  log('buffer_cleared', { cleared, input_mode: mode });
  setConsole([]);

  return { ok: true, message: 'Buffer cleared.' };
}

function submit(mode: InputMode, nowMs: number): TerminalActionResult {
  if (state.status !== 'in_progress') {
    return { ok: false, message: 'Orientation is closed.' };
  }

  if (!readyToSubmit()) {
    const message = `Before submitting, still to try: ${modesRemaining().join(' · ')}.`;

    setConsole([message]);

    return { ok: false, message };
  }

  const submission = bumpIpSubmission(state.window);
  const { correct, incorrect, unrouted } = routingSummary();
  const consistent =
    correct === TUTORIAL_FRAGMENTS.length && incorrect === 0 && unrouted === 0;

  log('submitted', {
    submission,
    input_mode: mode,
    routed_consistent: correct,
    routed_inconsistent: incorrect,
    unrouted,
    consistent,
    buffer_length: state.program.lines.length,
  });

  if (consistent) {
    state.status = 'complete';
    closeIpWindow(state.window, 'completed', nowMs);
    log('completed', tutorialCalibration());
    setConsole(['Orientation complete. The terminal is ready for live work.']);

    return { ok: true, message: 'Orientation complete.' };
  }

  if (submission >= TUTORIAL_MAX_SUBMISSIONS) {
    state.status = 'failed';
    closeIpWindow(state.window, 'exhausted', nowMs);
    log('failed', tutorialCalibration());
    setConsole([
      'Orientation closed after two submissions. Record kept; live work',
      'will be marked for review.',
    ]);

    return { ok: false, message: 'Orientation closed.' };
  }

  const lines = [
    `${correct} of ${TUTORIAL_FRAGMENTS.length} routes match the codebook` +
      (unrouted > 0 ? `; ${unrouted} fragment(s) have no instruction.` : '.'),
    'Revise the buffer and submit once more.',
  ];

  setConsole(lines);

  return { ok: false, message: lines[0] };
}

function help(mode: InputMode, nowMs: number): readonly string[] {
  void nowMs;
  bumpIpHelp(state.window);
  log('help_consulted', { input_mode: mode });

  return [
    'ROUTE <fragment> <destination> — one instruction per line.',
    'Drag a fragment onto a destination, click ROUTE → fragment →',
    'destination, or type the command and press ENTER.',
    'REMOVE <line> deletes a buffer line; CLEAR empties the buffer.',
    'SUBMIT records the program. ESC leaves; your work stays.',
  ];
}

function stop(nowMs: number) {
  if (state.status !== 'in_progress') {
    return;
  }

  state.status = 'failed';
  closeIpWindow(state.window, 'exited', nowMs);
  log('stopped', tutorialCalibration());
}

function fail(nowMs: number, detail: string) {
  if (state.status !== 'in_progress') {
    return;
  }

  state.status = 'failed';
  closeIpWindow(state.window, 'technical_failure', nowMs, detail);
  log('failed', { ...tutorialCalibration(), technical: detail });
}

export function tutorialProbe(): Record<string, unknown> {
  return {
    ...ipWindowFields(state.window),
    status: state.status,
    calibration: tutorialCalibration(),
    buffer: state.program.lines.map((line) => ({
      text: commandToText(line.command),
      input_mode: line.input_mode,
    })),
    routes: evaluateWorkspace(state.program.lines).routes,
  };
}

export const tutorialAdapter: TerminalTaskAdapter = {
  id: 'tutorial',
  grammar: () => TUTORIAL_GRAMMAR,
  context,
  view,
  open,
  leave,
  append,
  remove,
  clear,
  submit,
  primary: () => ({ ok: false, message: 'No stage action here.' }),
  help,
  stop,
  fail,
  probe: tutorialProbe,
};

registerTerminalAdapter(tutorialAdapter);

/** Test-only escape hatch. */
export function resetTutorialState() {
  state = createInitialState();
}
