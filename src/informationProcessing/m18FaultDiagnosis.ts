/**
 * M18 — Evidence-based lattice fault diagnosis (Information Processing
 * foundation).
 *
 * BESSI Information Processing item M18 ("Find logical solutions to
 * problems.") — the provisional behavioural analogue is evidence-
 * consistent fault diagnosis on a STANDARDISED reference lattice after
 * the M13 window has closed: four plausible fault hypotheses, four
 * evidence panels (three diagnostic, one neutral), three reversible
 * diagnostic tests, every interpretation rule provided in-task, exactly
 * one hypothesis consistent with all the evidence, explicit final
 * submission, neutral feedback.
 *
 * INDEPENDENCE FROM M13 (by construction, not by discipline):
 * - This module imports NOTHING from m13PipeNetwork.ts / m13PipePuzzle.ts.
 * - The reference lattice, the fault, every reading and every test result
 *   are FIXED CONSTANTS of the M18 form; the entry state is identical
 *   whether M13 was solved, failed, exited, invalid or exhausted.
 * - No M13 event, act count, submission or layout is read here; the
 *   `proto_m18_fault_*` family shares no raw event with `proto_m13_*`.
 *
 * SCIENTIFIC BOUNDARY: raw observables (panels viewed, view order, tests
 * run, hypothesis selections/rejections/revisions, contradictions present
 * at submission, final diagnosis id, validity) are recorded, never scored.
 * Correctness is a raw fact, never surfaced as praise.
 */

import type { FaultForm } from './faultForms';
import {
  contradictionCount,
  M18F_FORMS,
  M18F_REFERENCE_LATTICE,
} from './faultForms';
import type { FormId, InputMode } from './model';
import { refreshIpProbe, registerIpProbeSource } from './probe';
import { declareIpEvents, logIpEvent } from './telemetry';
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
  resolveForm,
} from './windowState';

export const M18F_OPPORTUNITY_ID = 'proto_m18_lattice_fault_diagnosis';
export const M18F_ENTRY_STATE_VERSION = 'm18-fault-v1';
const OBJECT_ID = 'ip_diagnosis_console';

export const M18F_EVENT_TYPES = declareIpEvents('proto_m18_fault', [
  'window_opened',
  'window_reopened',
  'panel_left',
  'evidence_viewed',
  'test_run',
  'rules_viewed',
  'hypothesis_selected',
  'hypothesis_deselected',
  'hypothesis_rejected',
  'hypothesis_unrejected',
  'submission_refused',
  'submitted',
  'completed',
  'stopped',
  'help_consulted',
  'technical_failure',
]);

export type {
  DiagnosticTest,
  EvidencePanel,
  FaultForm,
  FaultHypothesis,
} from './faultForms';
export {
  consistentHypotheses,
  contradictionCount,
  M18F_FORMS,
  M18F_REFERENCE_LATTICE,
} from './faultForms';

/* ------------------------------------------------------------------ *
 * Module store (one authoritative container)
 * ------------------------------------------------------------------ */

interface M18FaultState {
  window: IpWindow;
  form: FormId;
  panels_viewed: string[];
  view_log: string[];
  tests_run: string[];
  rules_views: number;
  selected: string | null;
  selection_history: string[];
  rejected: string[];
  revisions: number;
  final_diagnosis_id: string | null;
  final_solution_valid: boolean | null;
  contradictions_present_at_submission: number | null;
  detail: { title: string; lines: string[] } | null;
  feedback: string[];
}

function createInitialState(form: FormId): M18FaultState {
  return {
    window: createIpWindow({
      opportunity_id: M18F_OPPORTUNITY_ID,
      owner: 'M18',
      entry_state_version: M18F_ENTRY_STATE_VERSION,
      form_id: form,
    }),
    form,
    panels_viewed: [],
    view_log: [],
    tests_run: [],
    rules_views: 0,
    selected: null,
    selection_history: [],
    rejected: [],
    revisions: 0,
    final_diagnosis_id: null,
    final_solution_valid: null,
    contradictions_present_at_submission: null,
    detail: null,
    feedback: [],
  };
}

let state: M18FaultState | null = null;

function ensure(): M18FaultState {
  if (state === null) {
    state = createInitialState(resolveForm('m18'));
  }

  return state;
}

export function m18FaultForm(): FaultForm {
  return M18F_FORMS[ensure().form];
}

/**
 * The standardised entry state — a pure function of the form constant.
 * Tests compare this across every M13 path (solved / failed / exited /
 * exhausted / never opened) and must find it byte-identical.
 */
export function m18EntrySnapshot(): Record<string, unknown> {
  const s = ensure();
  const form = M18F_FORMS[s.form];

  return {
    entry_state_id: s.window.entry_state_id,
    form: s.form,
    reference_lattice: [...M18F_REFERENCE_LATTICE],
    hypotheses: form.hypotheses.map((hypothesis) => hypothesis.id),
    panels: form.panels.map((panel) => panel.id),
    tests: form.tests.map((test) => test.id),
    rules: form.rules.length,
    panels_viewed: [],
    tests_run: [],
    selected: null,
    rejected: [],
    m13_dependency: 'none',
  };
}

function rawSummary() {
  const s = ensure();
  const form = M18F_FORMS[s.form];

  return {
    ...ipWindowFields(s.window),
    evidence_panels_available: form.panels.length,
    evidence_panels_viewed: s.panels_viewed.length,
    evidence_view_order: [...s.view_log],
    tests_available: form.tests.length,
    tests_run: s.tests_run.length,
    test_order: [...s.tests_run],
    rules_views: s.rules_views,
    hypotheses_available: form.hypotheses.length,
    hypotheses_selected: [...s.selection_history],
    hypotheses_rejected: [...s.rejected],
    hypothesis_revisions: s.revisions,
    contradictions_present_at_submission:
      s.contradictions_present_at_submission,
    final_diagnosis_id: s.final_diagnosis_id,
    final_solution_valid: s.final_solution_valid,
  };
}

function log(suffix: string, metadata: Record<string, unknown> = {}) {
  logIpEvent('proto_m18_fault', OBJECT_ID, suffix, {
    ...ipWindowFields(ensure().window),
    ...metadata,
  });
  refreshIpProbe();
}

export function declareM18Fault() {
  const s = ensure();

  declareIpWindow(s.window);
  registerIpProbeSource('m18', M18F_OPPORTUNITY_ID, m18FaultProbe);
  refreshIpProbe();
}

export function m18FaultWindowStatus() {
  return ensure().window.status;
}

/**
 * Opens the console. `context` is optional CLOSURE context supplied by the
 * host (e.g. the lattice bench window status at entry) — recorded for
 * stratification only; the console never reads any M13 state itself.
 */
export function m18FaultOpen(
  nowMs: number,
  context: Record<string, unknown> = {},
) {
  const s = ensure();

  declareM18Fault();

  const entry = enterIpWindow(s.window, nowMs);

  if (entry === 'opened') {
    log('window_opened', { entry_snapshot: m18EntrySnapshot(), ...context });
  } else if (entry === 'reopened') {
    log('window_reopened');
  }

  refreshIpProbe();
}

export function m18FaultLeave(nowMs: number) {
  const s = ensure();

  if (s.window.panel_open) {
    leaveIpPanel(s.window, nowMs);
    log('panel_left');
  }
}

function canAct(): boolean {
  return ensure().window.status === 'open';
}

export type DiagnosisAction =
  | { kind: 'view_panel'; id: string }
  | { kind: 'run_test'; id: string }
  | { kind: 'view_rules' }
  | { kind: 'select'; id: string }
  | { kind: 'reject'; id: string };

export interface DiagnosisResult {
  ok: boolean;
  message: string;
}

/** Every semantic act (mouse and keyboard call exactly this). */
export function m18FaultAct(
  action: DiagnosisAction,
  mode: InputMode,
  nowMs: number,
): DiagnosisResult {
  void nowMs;

  const s = ensure();
  const form = M18F_FORMS[s.form];

  if (!canAct()) {
    return { ok: false, message: 'The console is closed.' };
  }

  switch (action.kind) {
    case 'view_panel': {
      const panel = form.panels.find((candidate) => candidate.id === action.id);

      if (panel === undefined) {
        return { ok: false, message: 'No such evidence panel.' };
      }

      if (!s.panels_viewed.includes(panel.id)) {
        s.panels_viewed.push(panel.id);
      }

      s.view_log.push(panel.id);
      s.detail = { title: panel.title, lines: [...panel.lines] };
      log('evidence_viewed', {
        panel_id: panel.id,
        view_index: s.view_log.length,
        first_view:
          s.panels_viewed[s.panels_viewed.length - 1] === panel.id &&
          s.view_log.filter((id) => id === panel.id).length === 1,
        input_mode: mode,
      });

      return { ok: true, message: panel.title };
    }
    case 'run_test': {
      const test = form.tests.find((candidate) => candidate.id === action.id);

      if (test === undefined) {
        return { ok: false, message: 'No such test.' };
      }

      s.tests_run.push(test.id);
      s.detail = {
        title: `${test.label} — result`,
        lines: [test.procedure, ...test.result],
      };
      log('test_run', {
        test_id: test.id,
        run_index: s.tests_run.length,
        repeat: s.tests_run.filter((id) => id === test.id).length > 1,
        input_mode: mode,
      });

      return { ok: true, message: test.label };
    }
    case 'view_rules':
      // The rules open in their own reference panel (the readout keeps
      // the last panel/test content); only the consult is recorded.
      s.rules_views += 1;
      log('rules_viewed', { view_count: s.rules_views, input_mode: mode });

      return { ok: true, message: 'Rules shown.' };
    case 'select': {
      const hypothesis = form.hypotheses.find(
        (candidate) => candidate.id === action.id,
      );

      if (hypothesis === undefined) {
        return { ok: false, message: 'No such hypothesis.' };
      }

      if (s.selected === hypothesis.id) {
        s.selected = null;
        s.revisions += 1;
        log('hypothesis_deselected', {
          hypothesis_id: hypothesis.id,
          input_mode: mode,
        });

        return { ok: true, message: 'Working diagnosis cleared.' };
      }

      if (s.selected !== null) {
        s.revisions += 1;
      }

      s.selected = hypothesis.id;
      s.selection_history.push(hypothesis.id);
      s.rejected = s.rejected.filter((id) => id !== hypothesis.id);
      log('hypothesis_selected', {
        hypothesis_id: hypothesis.id,
        selection_index: s.selection_history.length,
        input_mode: mode,
      });

      return { ok: true, message: `Working diagnosis: ${hypothesis.label}` };
    }
    case 'reject': {
      const hypothesis = form.hypotheses.find(
        (candidate) => candidate.id === action.id,
      );

      if (hypothesis === undefined) {
        return { ok: false, message: 'No such hypothesis.' };
      }

      if (s.rejected.includes(hypothesis.id)) {
        s.rejected = s.rejected.filter((id) => id !== hypothesis.id);
        s.revisions += 1;
        log('hypothesis_unrejected', {
          hypothesis_id: hypothesis.id,
          input_mode: mode,
        });

        return {
          ok: true,
          message: `${hypothesis.label}: back under consideration.`,
        };
      }

      s.rejected.push(hypothesis.id);

      if (s.selected === hypothesis.id) {
        s.selected = null;
        s.revisions += 1;
      }

      log('hypothesis_rejected', {
        hypothesis_id: hypothesis.id,
        input_mode: mode,
      });

      return {
        ok: true,
        message: `${hypothesis.label}: ruled out (reversible).`,
      };
    }
    default:
      return { ok: false, message: 'Unknown action.' };
  }
}

export interface DiagnosisSubmitOutcome {
  ok: boolean;
  closed: boolean;
  lines: string[];
}

/** The single explicit final diagnosis (one-shot; refused without a selection). */
export function m18FaultSubmit(
  mode: InputMode,
  nowMs: number,
): DiagnosisSubmitOutcome {
  const s = ensure();
  const form = M18F_FORMS[s.form];

  if (!canAct()) {
    return { ok: false, closed: true, lines: ['The console is closed.'] };
  }

  if (s.selected === null) {
    log('submission_refused', { reason: 'no_selection', input_mode: mode });
    s.feedback = ['Select a working diagnosis before submitting.'];

    return { ok: false, closed: false, lines: [...s.feedback] };
  }

  const submission = bumpIpSubmission(s.window);
  const contradictions = contradictionCount(
    form,
    s.selected,
    s.panels_viewed,
    s.tests_run,
  );
  const contradictionsTotal = contradictionCount(
    form,
    s.selected,
    form.panels.map((panel) => panel.id),
    form.tests.map((test) => test.id),
  );

  s.final_diagnosis_id = s.selected;
  s.final_solution_valid = s.selected === form.correct;
  s.contradictions_present_at_submission = contradictions;
  log('submitted', {
    submission,
    final_diagnosis_id: s.final_diagnosis_id,
    final_solution_valid: s.final_solution_valid,
    contradictions_present_at_submission: contradictions,
    contradictions_total_for_final: contradictionsTotal,
    evidence_panels_viewed: s.panels_viewed.length,
    tests_run: s.tests_run.length,
    hypotheses_rejected: [...s.rejected],
    input_mode: mode,
  });
  closeIpWindow(s.window, 'completed', nowMs);
  s.feedback = [
    'Diagnosis logged to the maintenance record.',
    'The console closes; the outpost maintenance plan takes it from here.',
  ];
  log('completed', rawSummary());

  return { ok: true, closed: true, lines: [...s.feedback] };
}

export function m18FaultHelp(mode: InputMode, nowMs: number): string[] {
  void nowMs;

  const s = ensure();

  bumpIpHelp(s.window);
  log('help_consulted', { input_mode: mode });

  return [
    'Open any evidence panel to read it; run any test to see its result',
    '(tests are reversible and can be repeated). RULES lists every',
    'interpretation rule you need — no outside knowledge is required.',
    'Mark hypotheses as ruled out (reversible) and pick one working',
    'diagnosis. SUBMIT DIAGNOSIS records your final answer once.',
  ];
}

export function m18FaultStop(nowMs: number) {
  const s = ensure();

  if (!canAct()) {
    return;
  }

  closeIpWindow(s.window, 'exited', nowMs);
  s.feedback = ['Console closed at your request. Record kept.'];
  log('stopped', rawSummary());
}

export function m18FaultFail(nowMs: number, detail: string) {
  const s = ensure();

  if (!canAct()) {
    return;
  }

  closeIpWindow(s.window, 'technical_failure', nowMs, detail);
  log('technical_failure', { ...rawSummary(), detail });
}

export interface DiagnosisView {
  form: FormId;
  brief: readonly string[];
  reference: readonly string[];
  rules: readonly string[];
  hypotheses: {
    id: string;
    label: string;
    selected: boolean;
    rejected: boolean;
  }[];
  panels: { id: string; title: string; viewed: boolean }[];
  tests: { id: string; label: string; runs: number }[];
  detail: { title: string; lines: string[] } | null;
  feedback: string[];
  submitEnabled: boolean;
  closed: boolean;
  status: IpWindow['status'];
}

export function m18FaultView(): DiagnosisView {
  const s = ensure();
  const form = M18F_FORMS[s.form];

  return {
    form: s.form,
    brief: form.brief,
    reference: M18F_REFERENCE_LATTICE,
    rules: form.rules,
    hypotheses: form.hypotheses.map((hypothesis) => ({
      id: hypothesis.id,
      label: hypothesis.label,
      selected: s.selected === hypothesis.id,
      rejected: s.rejected.includes(hypothesis.id),
    })),
    panels: form.panels.map((panel) => ({
      id: panel.id,
      title: panel.title,
      viewed: s.panels_viewed.includes(panel.id),
    })),
    tests: form.tests.map((test) => ({
      id: test.id,
      label: test.label,
      runs: s.tests_run.filter((id) => id === test.id).length,
    })),
    detail:
      s.detail === null ? null : { ...s.detail, lines: [...s.detail.lines] },
    feedback: [...s.feedback],
    submitEnabled: s.selected !== null && s.window.status === 'open',
    closed: ipWindowIsClosed(s.window),
    status: s.window.status,
  };
}

export function m18FaultProbe(): Record<string, unknown> {
  const s = ensure();

  return {
    ...rawSummary(),
    form: s.form,
    entry_snapshot: m18EntrySnapshot(),
    selected: s.selected,
    rejected: [...s.rejected],
    panels_viewed_ids: [...s.panels_viewed],
    detail_title: s.detail?.title ?? null,
  };
}

/** Test-only escape hatch. */
export function resetM18FaultState() {
  state = null;
}
