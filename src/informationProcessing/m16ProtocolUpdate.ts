/**
 * M16 — Protocol Update (Information Processing foundation).
 *
 * BESSI Information Processing item M16 ("Process new information.") —
 * the provisional behavioural analogue is the IMMEDIATE incorporation of
 * one genuinely new, clearly explained rule: a simple established
 * protocol is familiarised (3 reports, explicit READY), the new rule is
 * revealed (explicit ACKNOWLEDGE), and it must be applied at once to
 * fresh reports (6, three governed by the new rule) with revision
 * allowed before explicit submission. This is not M15: one rule changes,
 * the material is new, and there is no relational reconstruction.
 *
 * Raw observables: base protocol complete, new rule id / presented /
 * acknowledged, first application correct, final applications correct,
 * new-rule errors, revisions and protocol consults after the rule
 * presentation, active time after READY (instruction-reading time is
 * excluded), input mode, submission count. Nothing here is a score.
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
import { refreshIpProbe, registerIpProbeSource } from './probe';
import {
  appendLine,
  clearProgram,
  createProgramState,
  evaluateWorkspace,
  removeLine,
} from './programEngine';
import {
  M16_BASE_RULES,
  M16_DESTINATIONS,
  M16_FORMS,
  M16_GRAMMAR,
  M16_NEW_RULE_ID,
  M16_NEW_RULE_TEXT,
  m16BaseDestination,
  m16RuleGoverned,
  m16UpdatedDestination,
} from './protocolForms';
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

export const M16_OPPORTUNITY_ID = 'proto_m16_protocol_update';
export const M16_ENTRY_STATE_VERSION = 'm16-protocol-v1';
const OBJECT_ID = 'ip_protocol_console';

export const M16_EVENT_TYPES = declareIpEvents('proto_m16_protocol', [
  'window_opened',
  'window_reopened',
  'panel_left',
  'command_added',
  'command_refused',
  'line_removed',
  'buffer_cleared',
  'base_submitted',
  'ready_acknowledged',
  'new_rule_presented',
  'new_rule_acknowledged',
  'first_application',
  'protocol_consulted',
  'submission_incomplete_warned',
  'submitted',
  'completed',
  'help_consulted',
  'stopped',
  'technical_failure',
  'entry_state_flagged',
]);

export {
  M16_DESTINATIONS,
  M16_FORMS,
  M16_GRAMMAR,
  M16_NEW_RULE_ID,
  m16BaseDestination,
  m16UpdatedDestination,
} from './protocolForms';

export type M16Stage = 'base' | 'reveal' | 'apply';

interface M16State {
  window: IpWindow;
  form: FormId;
  stage: M16Stage;
  base_program: ProgramState;
  program: ProgramState;
  base_submitted: boolean;
  base_consistent: number | null;
  ready_at_ms: number | null;
  rule_presented_at_ms: number | null;
  rule_acknowledged_at_ms: number | null;
  apply_active_ms: number;
  apply_active_since_ms: number | null;
  first_application: {
    unit: string;
    destination: string;
    correct: boolean;
  } | null;
  new_rule_errors: number;
  revisions_after_rule: number;
  protocol_consults_after_rule: number;
  pointer_commands: number;
  typed_commands: number;
  incomplete_warned: boolean;
  last_console: string[];
  entry_flagged: boolean;
}

function createInitialState(form: FormId): M16State {
  return {
    window: createIpWindow({
      opportunity_id: M16_OPPORTUNITY_ID,
      owner: 'M16',
      entry_state_version: M16_ENTRY_STATE_VERSION,
      form_id: form,
    }),
    form,
    stage: 'base',
    base_program: createProgramState(),
    program: createProgramState(),
    base_submitted: false,
    base_consistent: null,
    ready_at_ms: null,
    rule_presented_at_ms: null,
    rule_acknowledged_at_ms: null,
    apply_active_ms: 0,
    apply_active_since_ms: null,
    first_application: null,
    new_rule_errors: 0,
    revisions_after_rule: 0,
    protocol_consults_after_rule: 0,
    pointer_commands: 0,
    typed_commands: 0,
    incomplete_warned: false,
    last_console: [],
    entry_flagged: false,
  };
}

let state: M16State | null = null;

function ensure(): M16State {
  if (state === null) {
    state = createInitialState(resolveForm('m16'));
  }

  return state;
}

function units(): readonly Fragment[] {
  const s = ensure();

  return s.stage === 'base' ? M16_FORMS[s.form].base : M16_FORMS[s.form].apply;
}

function context(): CommandContext {
  return {
    sets: {
      fragment: units().map((unit) => unit.id),
      destination: [...M16_DESTINATIONS],
    },
  };
}

function log(suffix: string, metadata: Record<string, unknown> = {}) {
  const s = ensure();

  logIpEvent('proto_m16_protocol', OBJECT_ID, suffix, {
    ...ipWindowFields(s.window),
    stage: s.stage,
    ...metadata,
  });
  refreshIpProbe();
}

/** Active time in the application stage (after ACKNOWLEDGE). */
function applyActiveMs(nowMs?: number): number {
  const s = ensure();

  return (
    s.apply_active_ms +
    (s.apply_active_since_ms !== null && nowMs !== undefined
      ? Math.max(0, nowMs - s.apply_active_since_ms)
      : 0)
  );
}

function applyTally() {
  const s = ensure();
  const evaluation = evaluateWorkspace(s.program.lines);
  const apply = M16_FORMS[s.form].apply;
  let governedCorrect = 0;
  let governedTotal = 0;
  let routed = 0;
  let correct = 0;

  for (const unit of apply) {
    const route = evaluation.routes[unit.id];

    if (m16RuleGoverned(unit)) {
      governedTotal += 1;

      if (route === m16UpdatedDestination(unit)) {
        governedCorrect += 1;
      }
    }

    if (route !== undefined) {
      routed += 1;

      if (route === m16UpdatedDestination(unit)) {
        correct += 1;
      }
    }
  }

  return {
    evaluation,
    units_presented: apply.length,
    units_routed: routed,
    units_correct: correct,
    governed_total: governedTotal,
    final_applications_correct: governedCorrect,
  };
}

function rawSummary(nowMs?: number) {
  const s = ensure();
  const apply = applyTally();

  return {
    ...ipWindowFields(s.window),
    base_protocol_complete: s.base_submitted,
    base_consistent: s.base_consistent,
    new_rule_id: M16_NEW_RULE_ID,
    new_rule_presented: s.rule_presented_at_ms !== null,
    new_rule_acknowledged: s.rule_acknowledged_at_ms !== null,
    first_application_correct: s.first_application?.correct ?? null,
    first_application: s.first_application,
    final_applications_correct: apply.final_applications_correct,
    applications_governed: apply.governed_total,
    units_presented: apply.units_presented,
    units_routed: apply.units_routed,
    units_correct: apply.units_correct,
    new_rule_errors: s.new_rule_errors,
    revisions_after_rule_presentation: s.revisions_after_rule,
    codebook_consults_after_rule_presentation: s.protocol_consults_after_rule,
    active_ms_after_ready: applyActiveMs(nowMs),
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

export function declareM16() {
  const s = ensure();

  declareIpWindow(s.window);
  registerIpProbeSource('m16', M16_OPPORTUNITY_ID, m16Probe);
  refreshIpProbe();
}

export function m16WindowStatus() {
  return ensure().window.status;
}

function setConsole(lines: string[]) {
  ensure().last_console = lines;
}

function view(): TerminalView {
  const s = ensure();
  const closed = ipWindowIsClosed(s.window);
  const current = units();
  const program = s.stage === 'base' ? s.base_program : s.program;
  const evaluation = evaluateWorkspace(program.lines);
  const chips = current.map((unit) => ({
    id: unit.id,
    label: m16RuleGoverned(unit) ? `${unit.id} !CRITICAL` : unit.id,
    sub: `${unit.channel} · ${unit.payload}`,
    tone: unit.channel === 'NORTH' ? ('alpha' as const) : ('gamma' as const),
    state:
      evaluation.routes[unit.id] === undefined
        ? ('pending' as const)
        : ('handled' as const),
  }));
  const output = current.map(
    (unit) =>
      `${unit.id.padEnd(3)} ${unit.channel.padEnd(5)}${m16RuleGoverned(unit) ? ' !' : '  '} → ${evaluation.routes[unit.id] ?? '—'}`,
  );
  const baseLines = Object.entries(M16_BASE_RULES).map(
    ([origin, destination]) => `${origin.padEnd(6)} →  ${destination}`,
  );
  const codebook =
    s.stage === 'base'
      ? [{ title: 'PROTOCOL (established)', lines: baseLines }]
      : [
          { title: 'PROTOCOL (established)', lines: baseLines },
          {
            title: 'NEW RULE',
            lines: ['!CRITICAL → HOLD', '(overrides origin)'],
          },
        ];
  const stageLabel = closed
    ? 'CLOSED'
    : s.stage === 'base'
      ? s.base_submitted
        ? 'FAMILIARISED — READY?'
        : 'FAMILIARISATION'
      : s.stage === 'reveal'
        ? 'PROTOCOL UPDATE'
        : 'APPLY UPDATED PROTOCOL';
  const consoleLines =
    s.last_console.length > 0
      ? s.last_console
      : closed
        ? ['Console closed. Record kept.']
        : s.stage === 'base'
          ? s.base_submitted
            ? [
                'Familiarisation recorded. Press READY when you know the protocol.',
              ]
            : [
                'Route the three reports by the established protocol, then SUBMIT.',
              ]
          : s.stage === 'reveal'
            ? [
                M16_NEW_RULE_TEXT,
                'Press ACKNOWLEDGE to continue with fresh reports.',
              ]
            : [
                `${applyTally().units_routed} of ${current.length} reports routed.`,
                'Apply the updated protocol, revise freely, then SUBMIT.',
              ];

  return {
    title: 'PROTOCOL CONSOLE — REPORT ROUTING',
    stageLabel,
    instructions:
      s.stage === 'base'
        ? [
            'Station reports carry an origin. Route each by the established',
            'protocol (drag, click-compose or type ROUTE B1 ARCHIVE), SUBMIT,',
            'then press READY when the protocol is familiar.',
          ]
        : s.stage === 'reveal'
          ? [
              M16_NEW_RULE_TEXT,
              'Read it, then ACKNOWLEDGE. Fresh reports follow immediately.',
            ]
          : [
              'Route the fresh reports under the UPDATED protocol (established',
              'rules plus the new !CRITICAL rule). Revise freely; SUBMIT records.',
            ],
    incomingTitle:
      s.stage === 'base'
        ? 'INCOMING — REPORTS (3)'
        : 'INCOMING — FRESH REPORTS (6)',
    chips: s.stage === 'reveal' ? [] : chips,
    bins:
      s.stage === 'reveal'
        ? []
        : M16_DESTINATIONS.map((id) => ({ id, label: id })),
    palette:
      s.stage === 'reveal'
        ? []
        : paletteFor(M16_GRAMMAR, context(), { destination: 'DESTINATIONS' }),
    codebook,
    outputTitle: 'OUTPUT PREVIEW — ROUTING TABLE',
    output:
      s.stage === 'reveal'
        ? ['(fresh reports arrive after ACKNOWLEDGE)']
        : output,
    buffer: program.lines.map((line) => ({
      text: commandToText(line.command),
      input_mode: line.input_mode,
    })),
    consoleLines,
    primaryAction: closed
      ? null
      : s.stage === 'base' && s.base_submitted
        ? { id: 'READY', label: 'READY', kind: 'accent' }
        : s.stage === 'reveal'
          ? { id: 'ACKNOWLEDGE', label: 'ACKNOWLEDGE', kind: 'accent' }
          : null,
    submitEnabled:
      !closed &&
      s.stage !== 'reveal' &&
      !(s.stage === 'base' && s.base_submitted),
    chipDropVerb: 'ROUTE',
    chipPairVerb: null,
    editing:
      !closed &&
      s.stage !== 'reveal' &&
      !(s.stage === 'base' && s.base_submitted),
    closed,
    reference:
      s.stage === 'apply' && !closed
        ? {
            label: 'PROTOCOL',
            title: 'UPDATED PROTOCOL — reference',
            lines: [...baseLines, '', M16_NEW_RULE_TEXT],
          }
        : null,
  };
}

function open(nowMs: number) {
  const s = ensure();

  declareM16();

  const entry = enterIpWindow(s.window, nowMs);

  if (entry === 'opened') {
    applyTutorialGate();
    log('window_opened', {
      base_units: M16_FORMS[s.form].base.length,
      apply_units: M16_FORMS[s.form].apply.length,
      new_rule_id: M16_NEW_RULE_ID,
    });
  } else if (entry === 'reopened') {
    log('window_reopened');
  }

  if (s.stage === 'apply' && s.window.status === 'open') {
    s.apply_active_since_ms = nowMs;
  }

  setConsole([]);
  refreshIpProbe();
}

function leave(nowMs: number) {
  const s = ensure();

  if (s.apply_active_since_ms !== null) {
    s.apply_active_ms += Math.max(0, nowMs - s.apply_active_since_ms);
    s.apply_active_since_ms = null;
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
    s.stage !== 'reveal' &&
    !(s.stage === 'base' && s.base_submitted)
  );
}

function append(
  command: SemanticCommand,
  mode: InputMode,
  nowMs: number,
): TerminalActionResult {
  const s = ensure();

  if (!canEdit()) {
    return { ok: false, message: 'The console is not accepting commands.' };
  }

  const program = s.stage === 'base' ? s.base_program : s.program;
  const before = evaluateWorkspace(program.lines);
  const outcome = appendLine(program, M16_GRAMMAR, context(), command, mode);

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

  const line = outcome.state.lines[outcome.state.lines.length - 1];
  const [unitId, destination] = line.command.args;

  if (s.stage === 'base') {
    s.base_program = outcome.state;
  } else {
    s.program = outcome.state;

    const unit = M16_FORMS[s.form].apply.find(
      (candidate) => candidate.id === unitId,
    )!;
    const governed = m16RuleGoverned(unit);
    const correct = destination === m16UpdatedDestination(unit);

    if (mode === 'pointer') {
      s.pointer_commands += 1;
    } else {
      s.typed_commands += 1;
    }

    if (before.routes[unitId] !== undefined) {
      s.revisions_after_rule += 1;
    }

    if (governed && !correct) {
      s.new_rule_errors += 1;
    }

    if (governed && s.first_application === null) {
      s.first_application = { unit: unitId, destination, correct };
      log('first_application', {
        unit: unitId,
        destination,
        correct,
        base_destination: m16BaseDestination(unit),
        ms_after_acknowledge:
          s.rule_acknowledged_at_ms === null
            ? null
            : nowMs - s.rule_acknowledged_at_ms,
        input_mode: mode,
      });
    }
  }

  log('command_added', {
    text: commandToText(line.command),
    input_mode: mode,
    unit: unitId,
    governed:
      s.stage === 'apply' &&
      m16RuleGoverned(M16_FORMS[s.form].apply.find((c) => c.id === unitId)!),
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
    return { ok: false, message: 'The console is not accepting commands.' };
  }

  const program = s.stage === 'base' ? s.base_program : s.program;
  const outcome = removeLine(program, index);

  if (!outcome.result.ok) {
    setConsole([outcome.result.detail]);

    return { ok: false, message: outcome.result.detail };
  }

  const removed = program.lines[index];

  if (s.stage === 'base') {
    s.base_program = outcome.state;
  } else {
    s.program = outcome.state;
    s.revisions_after_rule += 1;
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
    return { ok: false, message: 'The console is not accepting commands.' };
  }

  const program = s.stage === 'base' ? s.base_program : s.program;
  const cleared = program.lines.length;

  if (s.stage === 'base') {
    s.base_program = clearProgram(program).state;
  } else {
    s.revisions_after_rule += cleared;
    s.program = clearProgram(program).state;
  }

  log('buffer_cleared', { cleared, input_mode: mode });
  setConsole([]);

  return { ok: true, message: 'Buffer cleared.' };
}

function submit(mode: InputMode, nowMs: number): TerminalActionResult {
  const s = ensure();

  if (s.window.status !== 'open' || s.stage === 'reveal') {
    return { ok: false, message: 'Nothing to submit at this stage.' };
  }

  if (s.stage === 'base') {
    if (s.base_submitted) {
      return { ok: false, message: 'Familiarisation already recorded.' };
    }

    const evaluation = evaluateWorkspace(s.base_program.lines);
    const consistent = M16_FORMS[s.form].base.filter(
      (unit) => evaluation.routes[unit.id] === m16BaseDestination(unit),
    ).length;

    s.base_submitted = true;
    s.base_consistent = consistent;
    log('base_submitted', {
      units: M16_FORMS[s.form].base.length,
      consistent,
      routes: evaluation.routes,
      input_mode: mode,
    });
    setConsole([
      `Familiarisation recorded: ${consistent} of ${M16_FORMS[s.form].base.length} consistent with the protocol.`,
      'Press READY when the protocol is familiar.',
    ]);

    return { ok: true, message: 'Familiarisation recorded.' };
  }

  const apply = applyTally();
  const submission = bumpIpSubmission(s.window);

  if (apply.units_routed < apply.units_presented && !s.incomplete_warned) {
    s.incomplete_warned = true;
    log('submission_incomplete_warned', {
      submission,
      units_unrouted: apply.units_presented - apply.units_routed,
      input_mode: mode,
    });
    setConsole([
      `${apply.units_presented - apply.units_routed} report(s) have no instruction. SUBMIT again to record as it stands, or route them first.`,
    ]);

    return { ok: false, message: 'Incomplete — submit again to finalise.' };
  }

  if (s.apply_active_since_ms !== null) {
    s.apply_active_ms += Math.max(0, nowMs - s.apply_active_since_ms);
    s.apply_active_since_ms = null;
  }

  log('submitted', {
    submission,
    routes: apply.evaluation.routes,
    units_routed: apply.units_routed,
    units_correct: apply.units_correct,
    final_applications_correct: apply.final_applications_correct,
    applications_governed: apply.governed_total,
    new_rule_errors: s.new_rule_errors,
    input_mode: mode,
  });
  closeIpWindow(s.window, 'completed', nowMs);
  log('completed', rawSummary());
  setConsole(['Routing recorded. The console is closed.']);

  return { ok: true, message: 'Routing recorded.' };
}

function primary(
  actionId: string,
  mode: InputMode,
  nowMs: number,
): TerminalActionResult {
  const s = ensure();

  if (s.window.status !== 'open') {
    return { ok: false, message: 'The console is closed.' };
  }

  if (actionId === 'READY' && s.stage === 'base' && s.base_submitted) {
    s.ready_at_ms = nowMs;
    s.stage = 'reveal';
    s.rule_presented_at_ms = nowMs;
    log('ready_acknowledged', { input_mode: mode });
    log('new_rule_presented', {
      new_rule_id: M16_NEW_RULE_ID,
      rule_text: M16_NEW_RULE_TEXT,
    });
    setConsole([]);

    return { ok: true, message: 'Protocol update follows.' };
  }

  if (actionId === 'ACKNOWLEDGE' && s.stage === 'reveal') {
    s.rule_acknowledged_at_ms = nowMs;
    s.stage = 'apply';
    s.apply_active_since_ms = nowMs;
    log('new_rule_acknowledged', {
      new_rule_id: M16_NEW_RULE_ID,
      ms_reading:
        s.rule_presented_at_ms === null ? null : nowMs - s.rule_presented_at_ms,
      input_mode: mode,
    });
    setConsole([]);

    return { ok: true, message: 'Fresh reports incoming.' };
  }

  return { ok: false, message: 'No stage action available.' };
}

function consultReference(mode: InputMode, nowMs: number): readonly string[] {
  void nowMs;

  const s = ensure();

  s.protocol_consults_after_rule += 1;
  log('protocol_consulted', {
    consult: s.protocol_consults_after_rule,
    input_mode: mode,
  });

  return [
    ...Object.entries(M16_BASE_RULES).map(
      ([origin, destination]) => `${origin.padEnd(6)} →  ${destination}`,
    ),
    '',
    M16_NEW_RULE_TEXT,
  ];
}

function help(mode: InputMode, nowMs: number): readonly string[] {
  void nowMs;

  const s = ensure();

  bumpIpHelp(s.window);
  log('help_consulted', { input_mode: mode });

  return [
    'ROUTE <report> <destination> — one instruction per report; a later',
    'instruction supersedes the earlier one. Drag a report onto a',
    'destination, click ROUTE → report → destination, or type it.',
    'SUBMIT records each stage; READY and ACKNOWLEDGE advance the stages.',
  ];
}

function stop(nowMs: number) {
  const s = ensure();

  if (s.window.status !== 'open') {
    return;
  }

  closeIpWindow(s.window, 'exited', nowMs);
  log('stopped', rawSummary());
  setConsole(['Console closed at your request. Record kept.']);
}

function fail(nowMs: number, detail: string) {
  const s = ensure();

  if (s.window.status !== 'open') {
    return;
  }

  closeIpWindow(s.window, 'technical_failure', nowMs, detail);
  log('technical_failure', { ...rawSummary(), detail });
}

export function m16Probe(): Record<string, unknown> {
  const s = ensure();

  return {
    ...rawSummary(Date.now()),
    form: s.form,
    stage: s.stage,
    routes: applyTally().evaluation.routes,
    buffer: s.program.lines.map((line) => ({
      text: commandToText(line.command),
      input_mode: line.input_mode,
    })),
  };
}

export const m16Adapter: TerminalTaskAdapter = {
  id: 'm16',
  grammar: () => M16_GRAMMAR,
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
  probe: m16Probe,
};

registerTerminalAdapter(m16Adapter);

/** Test-only escape hatch. */
export function resetM16State() {
  state = null;
}
