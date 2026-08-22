/**
 * M14 — Packet Saturation (Information Processing foundation).
 *
 * BESSI Information Processing item M14 ("Handle a lot of information.")
 * — the provisional behavioural analogue is HIGH-VOLUME processing of
 * individually simple signal packets: three distinguishable channels,
 * stable visible routing rules, a short non-scored practice (4 packets),
 * then one scored intake of 12 packets that must each be routed, with
 * explicit final submission. The manipulation is QUANTITY, never rule
 * complexity: the scored run uses exactly the practice rules.
 *
 * Raw observables (recorded on the scored stage only): units presented /
 * processed / correctly routed / misrouted / omitted / revised,
 * destinations used, submission completeness and count, active time,
 * help consults, input modes. Nothing here is a score. No M15/M16/M17
 * inference is made from these events.
 */

import { commandToText, paletteFor } from './commands';
import type {
  CommandContext,
  FormId,
  Fragment,
  InputMode,
  ProgramState,
  SemanticCommand,
  TerminalActionResult,
  TerminalTaskAdapter,
  TerminalView,
} from './model';
import {
  M14_CHANNELS,
  M14_DESTINATIONS,
  M14_FORMS,
  M14_GRAMMAR,
  m14CorrectDestination,
} from './packetForms';
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

export const M14_OPPORTUNITY_ID = 'proto_m14_packet_saturation';
export const M14_ENTRY_STATE_VERSION = 'm14-packet-v1';
const OBJECT_ID = 'ip_packet_intake';

export const M14_EVENT_TYPES = declareIpEvents('proto_m14_packet', [
  'window_opened',
  'window_reopened',
  'panel_left',
  'command_added',
  'command_refused',
  'line_removed',
  'buffer_cleared',
  'practice_submitted',
  'intake_started',
  'submission_incomplete_warned',
  'submitted',
  'completed',
  'help_consulted',
  'stopped',
  'technical_failure',
  'entry_state_flagged',
]);

export type { PacketForm } from './packetForms';
export {
  M14_CHANNELS,
  M14_DESTINATIONS,
  M14_FORMS,
  M14_GRAMMAR,
  M14_RULES,
  M14_URGENT_DESTINATION,
  m14CorrectDestination,
} from './packetForms';

export type M14Stage = 'practice' | 'recorded';

interface M14State {
  window: IpWindow;
  form: FormId;
  stage: M14Stage;
  program: ProgramState;
  practice_program: ProgramState;
  practice_submitted: boolean;
  scored_started_at_ms: number | null;
  /** Distinct scored units that received more than one instruction. */
  revised_units: Set<string>;
  revisions: number;
  pointer_commands: number;
  typed_commands: number;
  incomplete_warned: boolean;
  last_console: string[];
  entry_flagged: boolean;
}

function createInitialState(form: FormId): M14State {
  return {
    window: createIpWindow({
      opportunity_id: M14_OPPORTUNITY_ID,
      owner: 'M14',
      entry_state_version: M14_ENTRY_STATE_VERSION,
      form_id: form,
    }),
    form,
    stage: 'practice',
    program: createProgramState(),
    practice_program: createProgramState(),
    practice_submitted: false,
    scored_started_at_ms: null,
    revised_units: new Set(),
    revisions: 0,
    pointer_commands: 0,
    typed_commands: 0,
    incomplete_warned: false,
    last_console: [],
    entry_flagged: false,
  };
}

let state: M14State | null = null;

function ensure(): M14State {
  if (state === null) {
    state = createInitialState(resolveForm('m14'));
  }

  return state;
}

function fragments(): readonly Fragment[] {
  const s = ensure();

  return s.stage === 'practice'
    ? M14_FORMS[s.form].practice
    : M14_FORMS[s.form].scored;
}

function context(): CommandContext {
  return {
    sets: {
      fragment: fragments().map((fragment) => fragment.id),
      destination: [...M14_DESTINATIONS],
    },
  };
}

function log(suffix: string, metadata: Record<string, unknown> = {}) {
  const s = ensure();

  logIpEvent('proto_m14_packet', OBJECT_ID, suffix, {
    ...ipWindowFields(s.window),
    stage: s.stage,
    ...metadata,
  });
  refreshIpProbe();
}

/** Routing tally for the current stage (raw counts, never a score). */
function tally(stage: M14Stage) {
  const s = ensure();
  const program = stage === 'practice' ? s.practice_program : s.program;
  const units =
    stage === 'practice'
      ? M14_FORMS[s.form].practice
      : M14_FORMS[s.form].scored;
  const evaluation = evaluateWorkspace(program.lines);
  let processed = 0;
  let correct = 0;
  let misrouted = 0;
  let omitted = 0;
  const destinations = new Set<string>();

  for (const unit of units) {
    const route = evaluation.routes[unit.id];

    if (route === undefined) {
      omitted += 1;
      continue;
    }

    processed += 1;
    destinations.add(route);

    if (route === m14CorrectDestination(unit)) {
      correct += 1;
    } else {
      misrouted += 1;
    }
  }

  return {
    evaluation,
    units_presented: units.length,
    units_processed: processed,
    units_correctly_routed: correct,
    units_misrouted: misrouted,
    units_omitted: omitted,
    destinations_used: [...destinations].sort(),
  };
}

function rawSummary() {
  const s = ensure();
  const scored = tally('recorded');

  return {
    ...ipWindowFields(s.window),
    units_presented: scored.units_presented,
    units_processed: scored.units_processed,
    units_correctly_routed: scored.units_correctly_routed,
    units_misrouted: scored.units_misrouted,
    units_omitted: scored.units_omitted,
    units_revised: s.revised_units.size,
    revisions: s.revisions,
    channels_present: M14_CHANNELS.length,
    channels_used: scored.destinations_used,
    submission_complete:
      scored.units_omitted === 0 &&
      s.window.status !== 'open' &&
      s.window.status !== 'unopened',
    command_sequence_length: s.program.lines.length,
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
    active_ms_scored:
      s.scored_started_at_ms === null ? 0 : Math.max(0, s.window.active_ms - 0),
    tutorial_status: tutorialStatus(),
  };
}

/** Tutorial gating: failed → comprehension failure; skipped → entry-state flag. */
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
      'terminal orientation failed at first open of this opportunity',
    );
    s.entry_flagged = true;
    log('entry_state_flagged', { reason: 'comprehension_failure' });
  } else if (status !== 'complete') {
    noteIpPriorExposure(s.window, 'terminal_orientation_not_completed');
    flagIpWindow(
      s.window,
      'invalid_entry_state',
      'terminal orientation not completed at first open of this opportunity',
    );
    s.entry_flagged = true;
    log('entry_state_flagged', { reason: 'invalid_entry_state' });
  }
}

export function declareM14() {
  const s = ensure();

  declareIpWindow(s.window);
  registerIpProbeSource('m14', M14_OPPORTUNITY_ID, m14Probe);
  refreshIpProbe();
}

export function m14WindowStatus() {
  return ensure().window.status;
}

function setConsole(lines: string[]) {
  ensure().last_console = lines;
}

function view(): TerminalView {
  const s = ensure();
  const closed = ipWindowIsClosed(s.window);
  const units = fragments();
  const program = s.stage === 'practice' ? s.practice_program : s.program;
  const current = tally(s.stage);
  const chips = units.map((unit) => ({
    id: unit.id,
    label: unit.flags?.includes('URGENT') ? `${unit.id} !URGENT` : unit.id,
    sub: `${unit.channel} · ${unit.payload}`,
    tone: unit.channel.toLowerCase() as 'alpha' | 'beta' | 'gamma',
    state:
      current.evaluation.routes[unit.id] === undefined
        ? ('pending' as const)
        : ('handled' as const),
  }));
  const output = units.map(
    (unit) =>
      `${unit.id.padEnd(3)} ${unit.channel.padEnd(5)}${unit.flags?.includes('URGENT') ? ' !' : '  '} → ${current.evaluation.routes[unit.id] ?? '—'}`,
  );
  const practiceReady = s.stage === 'practice' && s.practice_submitted;
  const consoleLines =
    s.last_console.length > 0
      ? s.last_console
      : closed
        ? ['Intake closed. Record kept.']
        : practiceReady
          ? ['Practice recorded. BEGIN INTAKE starts the full packet run.']
          : s.stage === 'practice'
            ? [
                `Practice: ${current.units_processed} of ${current.units_presented} packets routed. SUBMIT records the practice.`,
              ]
            : [
                `${current.units_processed} of ${current.units_presented} packets routed` +
                  (current.units_omitted > 0
                    ? ` (${current.units_omitted} without instruction).`
                    : '.'),
                'SUBMIT records the intake.',
              ];

  return {
    title: 'PACKET INTAKE TERMINAL — SATURATION RUN',
    stageLabel: closed
      ? 'CLOSED'
      : s.stage === 'practice'
        ? 'PRACTICE (not recorded as intake)'
        : 'INTAKE — 12 PACKETS',
    instructions: [
      'Packets arrive on three channels. Route EVERY packet by the channel',
      'rules in the codebook; a packet flagged !URGENT goes to RELAY regardless',
      'of channel. Drag a packet onto a destination, click ROUTE → packet →',
      'destination, or type ROUTE P3 RELAY. Revise freely before SUBMIT.',
    ],
    incomingTitle:
      s.stage === 'practice'
        ? 'INCOMING — PRACTICE (4)'
        : 'INCOMING — INTAKE (12)',
    chips,
    bins: M14_DESTINATIONS.map((id) => ({ id, label: id })),
    palette: paletteFor(M14_GRAMMAR, context(), {
      destination: 'DESTINATIONS',
    }),
    codebook: [
      {
        title: 'CODEBOOK — ROUTING RULES (stable)',
        lines: [
          'ALPHA  →  ARCHIVE',
          'BETA   →  RELAY',
          'GAMMA  →  HOLD',
          '!URGENT →  RELAY (overrides channel)',
        ],
      },
    ],
    outputTitle: 'OUTPUT PREVIEW — ROUTING TABLE',
    output,
    buffer: program.lines.map((line) => ({
      text: commandToText(line.command),
      input_mode: line.input_mode,
    })),
    consoleLines,
    primaryAction: practiceReady
      ? { id: 'BEGIN', label: 'BEGIN INTAKE', kind: 'accent' }
      : null,
    submitEnabled: !closed && !practiceReady,
    chipDropVerb: 'ROUTE',
    chipPairVerb: null,
    editing: !closed && !practiceReady,
    closed,
  };
}

function open(nowMs: number) {
  const s = ensure();

  declareM14();

  const entry = enterIpWindow(s.window, nowMs);

  if (entry === 'opened') {
    applyTutorialGate();
    log('window_opened', {
      practice_units: M14_FORMS[s.form].practice.length,
      scored_units: M14_FORMS[s.form].scored.length,
      channels: [...M14_CHANNELS],
      destinations: [...M14_DESTINATIONS],
    });
  } else if (entry === 'reopened') {
    log('window_reopened');
  }

  setConsole([]);
  refreshIpProbe();
}

function leave(nowMs: number) {
  const s = ensure();

  if (s.window.panel_open) {
    leaveIpPanel(s.window, nowMs);
    log('panel_left');
  }
}

function canEdit(): boolean {
  const s = ensure();

  return (
    s.window.status === 'open' &&
    !(s.stage === 'practice' && s.practice_submitted)
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
    return { ok: false, message: 'The intake is not accepting commands.' };
  }

  const program = s.stage === 'practice' ? s.practice_program : s.program;
  const before = evaluateWorkspace(program.lines);
  const outcome = appendLine(program, M14_GRAMMAR, context(), command, mode);

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

  if (s.stage === 'practice') {
    s.practice_program = outcome.state;
  } else {
    s.program = outcome.state;
  }

  const line = outcome.state.lines[outcome.state.lines.length - 1];
  const unit = line.command.args[0];
  const revision = s.stage === 'recorded' && before.routes[unit] !== undefined;

  if (s.stage === 'recorded') {
    if (mode === 'pointer') {
      s.pointer_commands += 1;
    } else {
      s.typed_commands += 1;
    }

    if (revision) {
      s.revisions += 1;
      s.revised_units.add(unit);
    }
  }

  log('command_added', {
    text: commandToText(line.command),
    input_mode: mode,
    unit,
    revision,
    line_index: outcome.state.lines.length - 1,
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
    return { ok: false, message: 'The intake is not accepting commands.' };
  }

  const program = s.stage === 'practice' ? s.practice_program : s.program;
  const outcome = removeLine(program, index);

  if (!outcome.result.ok) {
    setConsole([outcome.result.detail]);

    return { ok: false, message: outcome.result.detail };
  }

  const removed = program.lines[index];

  if (s.stage === 'practice') {
    s.practice_program = outcome.state;
  } else {
    s.program = outcome.state;
    s.revisions += 1;
    s.revised_units.add(removed.command.args[0]);
  }

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
    return { ok: false, message: 'The intake is not accepting commands.' };
  }

  const program = s.stage === 'practice' ? s.practice_program : s.program;
  const cleared = program.lines.length;

  if (s.stage === 'practice') {
    s.practice_program = clearProgram(program).state;
  } else {
    for (const line of program.lines) {
      s.revised_units.add(line.command.args[0]);
    }

    s.revisions += cleared;
    s.program = clearProgram(program).state;
  }

  log('buffer_cleared', { cleared, input_mode: mode });
  setConsole([]);

  return { ok: true, message: 'Buffer cleared.' };
}

function submit(mode: InputMode, nowMs: number): TerminalActionResult {
  const s = ensure();

  if (s.window.status !== 'open') {
    return { ok: false, message: 'The intake is closed.' };
  }

  if (s.stage === 'practice') {
    if (s.practice_submitted) {
      return { ok: false, message: 'Practice already recorded.' };
    }

    const practice = tally('practice');

    s.practice_submitted = true;
    log('practice_submitted', {
      units_presented: practice.units_presented,
      units_processed: practice.units_processed,
      units_correctly_routed: practice.units_correctly_routed,
      units_misrouted: practice.units_misrouted,
      units_omitted: practice.units_omitted,
      input_mode: mode,
    });
    setConsole([
      `Practice recorded: ${practice.units_correctly_routed} of ${practice.units_presented} consistent with the codebook.`,
      'BEGIN INTAKE starts the full packet run.',
    ]);

    return { ok: true, message: 'Practice recorded.' };
  }

  const scored = tally('recorded');
  const submission = bumpIpSubmission(s.window);

  if (scored.units_omitted > 0 && !s.incomplete_warned) {
    s.incomplete_warned = true;
    log('submission_incomplete_warned', {
      submission,
      units_omitted: scored.units_omitted,
      input_mode: mode,
    });
    setConsole([
      `${scored.units_omitted} packet(s) have no instruction. SUBMIT again to record the intake as it stands, or route them first.`,
    ]);

    return { ok: false, message: 'Incomplete — submit again to finalise.' };
  }

  log('submitted', {
    submission,
    ...scored,
    evaluation: undefined,
    routes: scored.evaluation.routes,
    submission_complete: scored.units_omitted === 0,
    input_mode: mode,
  });
  closeIpWindow(s.window, 'completed', nowMs);
  log('completed', rawSummary());
  setConsole(['Intake recorded. The packet run is closed.']);

  return { ok: true, message: 'Intake recorded.' };
}

function primary(
  actionId: string,
  mode: InputMode,
  nowMs: number,
): TerminalActionResult {
  const s = ensure();

  if (actionId !== 'BEGIN' || s.stage !== 'practice' || !s.practice_submitted) {
    return { ok: false, message: 'No stage action available.' };
  }

  if (s.window.status !== 'open') {
    return { ok: false, message: 'The intake is closed.' };
  }

  s.stage = 'recorded';
  s.scored_started_at_ms = nowMs;
  log('intake_started', {
    units: M14_FORMS[s.form].scored.length,
    input_mode: mode,
  });
  setConsole([]);

  return { ok: true, message: 'Intake started.' };
}

function help(mode: InputMode, nowMs: number): readonly string[] {
  void nowMs;

  const s = ensure();

  bumpIpHelp(s.window);
  log('help_consulted', { input_mode: mode });

  return [
    'ROUTE <packet> <destination> — one instruction per packet; a later',
    'instruction for the same packet supersedes the earlier one.',
    'ALPHA → ARCHIVE, BETA → RELAY, GAMMA → HOLD; !URGENT → RELAY always.',
    'Drag a packet onto a destination, click ROUTE → packet → destination,',
    'or type the command. ✕ / REMOVE n deletes a line. SUBMIT records.',
  ];
}

function stop(nowMs: number) {
  const s = ensure();

  if (s.window.status !== 'open') {
    return;
  }

  closeIpWindow(s.window, 'exited', nowMs);
  log('stopped', rawSummary());
  setConsole(['Intake closed at your request. Record kept.']);
}

function fail(nowMs: number, detail: string) {
  const s = ensure();

  if (s.window.status !== 'open') {
    return;
  }

  closeIpWindow(s.window, 'technical_failure', nowMs, detail);
  log('technical_failure', { ...rawSummary(), detail });
}

export function m14Probe(): Record<string, unknown> {
  const s = ensure();

  return {
    ...rawSummary(),
    form: s.form,
    stage: s.stage,
    practice_submitted: s.practice_submitted,
    practice: (() => {
      const practice = tally('practice');

      return {
        units_presented: practice.units_presented,
        units_processed: practice.units_processed,
        units_correctly_routed: practice.units_correctly_routed,
      };
    })(),
    routes: tally('recorded').evaluation.routes,
    buffer: s.program.lines.map((line) => ({
      text: commandToText(line.command),
      input_mode: line.input_mode,
    })),
  };
}

export const m14Adapter: TerminalTaskAdapter = {
  id: 'm14',
  grammar: () => M14_GRAMMAR,
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
  probe: m14Probe,
};

registerTerminalAdapter(m14Adapter);

/** Test-only escape hatch. */
export function resetM14State() {
  state = null;
}
