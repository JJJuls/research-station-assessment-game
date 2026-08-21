/**
 * M15 — Layered Cipher (Information Processing foundation).
 *
 * BESSI Information Processing item M15 ("Make sense of complex
 * information.") — the provisional behavioural analogue is LOW-VOLUME,
 * HIGH-RELATIONAL reconstruction: six fragments, three link keys, a
 * header/payload pairing rule, a codebook row lookup, a shift rule that
 * depends on the paired payload, and a key-ordered message. The
 * participant CONSTRUCTS the message through PAIR / SHIFT commands and
 * sees the live reconstruction; there are no answer cards.
 *
 * Binding contrast with M14: fewer units (6 vs 12), more interdependent
 * rules (4 vs a per-unit lookup). Command-sequence length is contextual
 * raw data — fewer commands are never treated as better.
 *
 * Raw observables: rules presented, relations required / constructed /
 * correct at submission, rule violations at submission, command-sequence
 * length, revisions, codebook consults, final reconstruction validity,
 * submission count, active time, input mode. Nothing here is a score.
 */

import type { CipherForm, CipherReconstruction } from './cipherForms';
import {
  M15_FORMS,
  M15_GRAMMAR,
  M15_KEYS,
  M15_RULES_PRESENTED,
  M15_SHIFT_AMOUNTS,
  reconstructCipher,
} from './cipherForms';
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

export const M15_OPPORTUNITY_ID = 'proto_m15_layered_cipher';
export const M15_ENTRY_STATE_VERSION = 'm15-cipher-v1';
const OBJECT_ID = 'ip_cipher_workstation';

export const M15_EVENT_TYPES = declareIpEvents('proto_m15_cipher', [
  'window_opened',
  'window_reopened',
  'panel_left',
  'command_added',
  'command_refused',
  'line_removed',
  'buffer_cleared',
  'codebook_consulted',
  'submission_incomplete_warned',
  'submitted',
  'completed',
  'help_consulted',
  'stopped',
  'technical_failure',
  'entry_state_flagged',
]);

export type {
  CipherForm,
  CipherFragment,
  CipherKeyState,
  CipherReconstruction,
} from './cipherForms';
export {
  M15_FORMS,
  M15_GRAMMAR,
  M15_KEYS,
  M15_RULES_PRESENTED,
  M15_SHIFT_AMOUNTS,
  reconstructCipher,
} from './cipherForms';

/* ------------------------------------------------------------------ *
 * Module store
 * ------------------------------------------------------------------ */

interface M15State {
  window: IpWindow;
  form: FormId;
  program: ProgramState;
  revisions: number;
  codebook_consults: number;
  pointer_commands: number;
  typed_commands: number;
  incomplete_warned: boolean;
  last_console: string[];
  entry_flagged: boolean;
  final: CipherReconstruction | null;
}

function createInitialState(form: FormId): M15State {
  return {
    window: createIpWindow({
      opportunity_id: M15_OPPORTUNITY_ID,
      owner: 'M15',
      entry_state_version: M15_ENTRY_STATE_VERSION,
      form_id: form,
    }),
    form,
    program: createProgramState(),
    revisions: 0,
    codebook_consults: 0,
    pointer_commands: 0,
    typed_commands: 0,
    incomplete_warned: false,
    last_console: [],
    entry_flagged: false,
    final: null,
  };
}

let state: M15State | null = null;

function ensure(): M15State {
  if (state === null) {
    state = createInitialState(resolveForm('m15'));
  }

  return state;
}

function form(): CipherForm {
  return M15_FORMS[ensure().form];
}

function context(): CommandContext {
  return {
    sets: {
      fragment: form().fragments.map((fragment) => fragment.id),
      key: [...M15_KEYS],
      amount: [...M15_SHIFT_AMOUNTS],
    },
  };
}

function log(suffix: string, metadata: Record<string, unknown> = {}) {
  logIpEvent('proto_m15_cipher', OBJECT_ID, suffix, {
    ...ipWindowFields(ensure().window),
    ...metadata,
  });
  refreshIpProbe();
}

function current(): CipherReconstruction {
  const s = ensure();

  return reconstructCipher(M15_FORMS[s.form], s.program.lines);
}

function rawSummary() {
  const s = ensure();
  const reconstruction = s.final ?? current();

  return {
    ...ipWindowFields(s.window),
    rules_presented: M15_RULES_PRESENTED,
    relations_required: reconstruction.relations_required,
    relations_constructed: reconstruction.relations_constructed,
    relations_correct_at_submission: s.final?.relations_correct ?? null,
    rule_violations_at_submission: s.final?.rule_violations ?? null,
    command_sequence_length: s.program.lines.length,
    revisions: s.revisions,
    codebook_consults: s.codebook_consults,
    final_reconstruction_valid: s.final?.valid ?? null,
    final_message: s.final?.message ?? null,
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
    units_presented: form().fragments.length,
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

export function declareM15() {
  const s = ensure();

  declareIpWindow(s.window);
  registerIpProbeSource('m15', M15_OPPORTUNITY_ID, m15Probe);
  refreshIpProbe();
}

export function m15WindowStatus() {
  return ensure().window.status;
}

function setConsole(lines: string[]) {
  ensure().last_console = lines;
}

function view(): TerminalView {
  const s = ensure();
  const closed = ipWindowIsClosed(s.window);
  const f = form();
  const reconstruction = current();
  const pairedIds = new Set(
    reconstruction.keys.flatMap((entry) =>
      entry.pair === null ? [] : [entry.pair.a, entry.pair.b],
    ),
  );
  const chips = f.fragments.map((fragment) => ({
    id: fragment.id,
    label: fragment.id,
    sub: `${fragment.key} · ${fragment.payload}`,
    tone: fragment.role === 'header' ? ('alpha' as const) : ('beta' as const),
    state: pairedIds.has(fragment.id)
      ? ('handled' as const)
      : ('pending' as const),
  }));
  const output = reconstruction.keys.map((entry) => {
    const pairText =
      entry.pair === null ? '— unpaired' : `${entry.pair.a}+${entry.pair.b}`;
    const shiftText =
      entry.shift_issued === null ? '' : ` shift +${entry.shift_issued}`;

    return `${entry.key}  ${pairText.padEnd(12)}${shiftText.padEnd(9)} → ${entry.word ?? '—'}`;
  });

  output.push('');
  output.push(
    `MESSAGE: ${reconstruction.message.map((word) => word ?? '____').join(' ')}`,
  );

  const consoleLines =
    s.last_console.length > 0
      ? s.last_console
      : closed
        ? ['Reconstruction closed. Record kept.']
        : [
            `${reconstruction.keys.filter((entry) => entry.pair !== null).length} of 3 keys paired` +
              (reconstruction.complete ? '; message complete.' : '.'),
            'Check the preview, then SUBMIT.',
          ];

  return {
    title: 'CIPHER WORKSTATION — LAYERED RECONSTRUCTION',
    stageLabel: closed ? 'CLOSED' : 'RECONSTRUCTION',
    instructions: [
      'Six fragments carry a three-word message. Each link key (K1–K3) has',
      'an ALPHA header (a code) and a BETA payload (a shift). PAIR the two',
      'fragments of each key (drag one onto the other, click PAIR → fragment',
      '→ fragment, or type PAIR F1 F5). The header code selects a CODEBOOK',
      'row; a payload "shift +n" needs SHIFT <key> <n>. Message order K1 K2 K3.',
    ],
    incomingTitle: 'INCOMING — CIPHER FRAGMENTS (6)',
    chips,
    bins: [],
    palette: paletteFor(M15_GRAMMAR, context(), {
      key: 'KEYS',
      amount: 'ROWS',
    }),
    codebook: [
      {
        title: 'RULES',
        lines: [
          'R1 PAIR each key: header + payload',
          'R2 header code → row in CODEBOOK',
          'R3 payload shift +n → SHIFT key n',
          'R4 message order K1 K2 K3',
        ],
      },
    ],
    outputTitle: 'OUTPUT PREVIEW — RECONSTRUCTION',
    output,
    buffer: s.program.lines.map((line) => ({
      text: commandToText(line.command),
      input_mode: line.input_mode,
    })),
    consoleLines,
    primaryAction: null,
    submitEnabled: !closed,
    chipDropVerb: null,
    chipPairVerb: 'PAIR',
    editing: !closed,
    closed,
    reference: closed
      ? null
      : {
          label: 'CODEBOOK',
          title: 'CODEBOOK — ROW TABLE (top to bottom)',
          lines: f.codebook.map(
            (entry, index) =>
              `row ${index + 1}   ${entry.code}  →  ${entry.word}`,
          ),
        },
  };
}

function open(nowMs: number) {
  const s = ensure();

  declareM15();

  const entry = enterIpWindow(s.window, nowMs);

  if (entry === 'opened') {
    applyTutorialGate();
    log('window_opened', {
      units: form().fragments.length,
      keys: [...M15_KEYS],
      rules_presented: M15_RULES_PRESENTED,
      relations_required: current().relations_required,
      codebook_rows: form().codebook.length,
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
  return ensure().window.status === 'open';
}

function append(
  command: SemanticCommand,
  mode: InputMode,
  nowMs: number,
): TerminalActionResult {
  void nowMs;

  const s = ensure();

  if (!canEdit()) {
    return { ok: false, message: 'The workstation is closed.' };
  }

  const before = evaluateWorkspace(s.program.lines);
  const outcome = appendLine(s.program, M15_GRAMMAR, context(), command, mode);

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

  s.program = outcome.state;

  const after = evaluateWorkspace(s.program.lines);
  const revision = after.superseded.length > before.superseded.length;

  if (mode === 'pointer') {
    s.pointer_commands += 1;
  } else {
    s.typed_commands += 1;
  }

  if (revision) {
    s.revisions += 1;
  }

  const line = s.program.lines[s.program.lines.length - 1];

  log('command_added', {
    text: commandToText(line.command),
    input_mode: mode,
    revision,
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
    return { ok: false, message: 'The workstation is closed.' };
  }

  const outcome = removeLine(s.program, index);

  if (!outcome.result.ok) {
    setConsole([outcome.result.detail]);

    return { ok: false, message: outcome.result.detail };
  }

  const removed = s.program.lines[index];

  s.program = outcome.state;
  s.revisions += 1;
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
    return { ok: false, message: 'The workstation is closed.' };
  }

  const cleared = s.program.lines.length;

  s.revisions += cleared;
  s.program = clearProgram(s.program).state;
  log('buffer_cleared', { cleared, input_mode: mode });
  setConsole([]);

  return { ok: true, message: 'Buffer cleared.' };
}

function submit(mode: InputMode, nowMs: number): TerminalActionResult {
  const s = ensure();

  if (!canEdit()) {
    return { ok: false, message: 'The workstation is closed.' };
  }

  const reconstruction = current();
  const submission = bumpIpSubmission(s.window);

  if (!reconstruction.complete && !s.incomplete_warned) {
    s.incomplete_warned = true;
    log('submission_incomplete_warned', {
      submission,
      message: reconstruction.message,
      input_mode: mode,
    });
    setConsole([
      'The message is not complete. SUBMIT again to record it as it stands, or keep working.',
    ]);

    return { ok: false, message: 'Incomplete — submit again to finalise.' };
  }

  s.final = reconstruction;
  log('submitted', {
    submission,
    message: reconstruction.message,
    relations_required: reconstruction.relations_required,
    relations_constructed: reconstruction.relations_constructed,
    relations_correct: reconstruction.relations_correct,
    rule_violations: reconstruction.rule_violations,
    final_reconstruction_valid: reconstruction.valid,
    command_sequence_length: s.program.lines.length,
    input_mode: mode,
  });
  closeIpWindow(s.window, 'completed', nowMs);
  log('completed', rawSummary());
  setConsole(['Reconstruction recorded. The workstation is closed.']);

  return { ok: true, message: 'Reconstruction recorded.' };
}

function consultReference(mode: InputMode, nowMs: number): readonly string[] {
  void nowMs;

  const s = ensure();

  s.codebook_consults += 1;
  log('codebook_consulted', { consult: s.codebook_consults, input_mode: mode });

  return form().codebook.map(
    (entry, index) => `row ${index + 1}   ${entry.code}  →  ${entry.word}`,
  );
}

function help(mode: InputMode, nowMs: number): readonly string[] {
  void nowMs;

  const s = ensure();

  bumpIpHelp(s.window);
  log('help_consulted', { input_mode: mode });

  return [
    'PAIR <fragment> <fragment> links the header and payload of one key',
    '(drag a fragment onto its partner, or click PAIR → one → the other).',
    'SHIFT <key> <n> moves that key’s codebook row down n rows — only',
    'when its payload says shift +n. CODEBOOK opens the row table.',
    'A later PAIR/SHIFT on the same fragment or key supersedes the earlier',
    'one; ✕ / REMOVE n deletes a line. SUBMIT records the reconstruction.',
  ];
}

function stop(nowMs: number) {
  const s = ensure();

  if (!canEdit()) {
    return;
  }

  closeIpWindow(s.window, 'exited', nowMs);
  log('stopped', rawSummary());
  setConsole(['Workstation closed at your request. Record kept.']);
}

function fail(nowMs: number, detail: string) {
  const s = ensure();

  if (!canEdit()) {
    return;
  }

  closeIpWindow(s.window, 'technical_failure', nowMs, detail);
  log('technical_failure', { ...rawSummary(), detail });
}

export function m15Probe(): Record<string, unknown> {
  const s = ensure();
  const reconstruction = current();

  return {
    ...rawSummary(),
    form: s.form,
    message: reconstruction.message,
    keys: reconstruction.keys,
    buffer: s.program.lines.map((line) => ({
      text: commandToText(line.command),
      input_mode: line.input_mode,
    })),
  };
}

export const m15Adapter: TerminalTaskAdapter = {
  id: 'm15',
  grammar: () => M15_GRAMMAR,
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
  consultReference,
  stop,
  fail,
  probe: m15Probe,
};

registerTerminalAdapter(m15Adapter);

/** Test-only escape hatch. */
export function resetM15State() {
  state = null;
}
