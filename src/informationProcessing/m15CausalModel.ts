/**
 * M15 — Causal model of the recovered transmission (evidence-led pilot v2,
 * Unit 3: signal-analysis incident, phase 1).
 *
 * BESSI Information Processing item M15 ("Make sense of complex
 * information.") — sheet 09 final opportunity: build a compact causal
 * subsystem model from independent evidence, then predict the effect of
 * one intervention. Replaces the foundation's layered-cipher terminal ON
 * THE PARTICIPANT ROUTE (the cipher module stays as the developer test
 * bed). The frozen ledger identifiers are kept unchanged: opportunity
 * `proto_m15_layered_cipher`, family `proto_m15_cipher_*`, window
 * `m15_causal_w1` — the id string is historical; the mechanic is the one
 * the ledger describes.
 *
 * Mechanic (Evidence Table work surface): four evidence sources are all
 * visible as compact tiles and expand into a readout (opening = a source
 * consult; switching = a source transition); five subsystem nodes sit on
 * a model board; activating node A then node B draws A → B (activating a
 * drawn link removes it — a correction); PREDICT switches the board to
 * marking the nodes an intervention would change; SUBMIT is two-stage
 * (an incomplete model warns once). A worked example (diagram tutorial)
 * is shown at first open and can be reviewed at any time.
 *
 * Raw components (candidate, sheet 09 H): required_causal_edges,
 * invalid_edges, corrections, intervention prediction; plus the mission's
 * authorised fields — evidence sources opened, source transitions, model
 * edits, contradictions present / resolved, submission completeness,
 * constraints satisfied, active time, input mode, form, validity state.
 * Rival-explanation context: reading time before the first edit, guide
 * reviews, edit sequence. Nothing here is a score.
 */

import type { CausalEdge, CausalForm } from './causalForms';
import { edgeKey, evaluateCausalModel, M15C_FORMS } from './causalForms';
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

export const M15C_OPPORTUNITY_ID = 'proto_m15_layered_cipher';
export const M15C_WINDOW_ID = 'm15_causal_w1';
export const M15C_ENTRY_STATE_VERSION = 'm15-causal-v1';
const OBJECT_ID = 'signal_evidence_table';

export const M15C_EVENT_TYPES = declareIpEvents('proto_m15_cipher', [
  'window_opened',
  'window_reopened',
  'panel_left',
  'source_opened',
  'guide_viewed',
  'link_added',
  'link_removed',
  'link_refused',
  'mode_changed',
  'node_marked',
  'node_unmarked',
  'submission_incomplete_warned',
  'submitted',
  'completed',
  'help_consulted',
  'stopped',
  'technical_failure',
]);

export type M15CMode = 'model' | 'predict';

interface M15CState {
  window: IpWindow;
  form: FormId;
  mode: M15CMode;
  edges: CausalEdge[];
  marked: string[];
  linkSource: string | null;
  openSource: string | null;
  guideShown: boolean;
  sourcesOpened: string[];
  sourceLog: string[];
  sourceTransitions: number;
  guideViews: number;
  edits: { kind: 'add' | 'remove'; edge: CausalEdge; input_mode: string }[];
  contradictionsResolved: number;
  pointerActs: number;
  keyboardActs: number;
  firstEditAtMs: number | null;
  openedAtMs: number | null;
  incompleteWarned: boolean;
  feedback: string | null;
}

function createInitialState(form: FormId): M15CState {
  return {
    window: createIpWindow({
      opportunity_id: M15C_OPPORTUNITY_ID,
      owner: 'M15',
      entry_state_version: M15C_ENTRY_STATE_VERSION,
      form_id: form,
    }),
    form,
    mode: 'model',
    edges: [],
    marked: [],
    linkSource: null,
    openSource: null,
    guideShown: false,
    sourcesOpened: [],
    sourceLog: [],
    sourceTransitions: 0,
    guideViews: 0,
    edits: [],
    contradictionsResolved: 0,
    pointerActs: 0,
    keyboardActs: 0,
    firstEditAtMs: null,
    openedAtMs: null,
    incompleteWarned: false,
    feedback: null,
  };
}

let state: M15CState | null = null;

function ensure(): M15CState {
  if (state === null) {
    state = createInitialState(resolveForm('m15'));
  }

  return state;
}

export function m15CausalForm(): CausalForm {
  return M15C_FORMS[ensure().form];
}

function inputModeSummary(s: M15CState): string | null {
  return s.pointerActs > 0 && s.keyboardActs > 0
    ? 'mixed'
    : s.keyboardActs > 0
      ? 'keyboard'
      : s.pointerActs > 0
        ? 'pointer'
        : null;
}

function rawSummary() {
  const s = ensure();
  const form = M15C_FORMS[s.form];
  const evaluation = evaluateCausalModel(form, s.edges, s.marked);

  return {
    ...ipWindowFields(s.window),
    window_id: M15C_WINDOW_ID,
    evidence_sources_available: form.sources.length,
    evidence_sources_opened: [...s.sourcesOpened],
    evidence_sources_opened_count: s.sourcesOpened.length,
    source_transitions: s.sourceTransitions,
    source_view_order: [...s.sourceLog],
    guide_presented: s.guideShown,
    guide_reviews: s.guideViews,
    model_edits: s.edits.length,
    edit_sequence: s.edits.map((edit) => ({
      kind: edit.kind,
      edge: edgeKey(edit.edge),
      input_mode: edit.input_mode,
    })),
    corrections: s.edits.filter((edit) => edit.kind === 'remove').length,
    required_edges_total: evaluation.required_total,
    required_causal_edges: evaluation.required_present,
    model_complete: evaluation.model_complete,
    edges_drawn: evaluation.edges_drawn,
    edges_final: s.edges.map(edgeKey),
    invalid_edges: evaluation.invalid_edges.map(edgeKey),
    invalid_edge_count: evaluation.invalid_edges.length,
    contradictions_present: evaluation.contradicting_edges.map(edgeKey),
    contradictions_present_count: evaluation.contradicting_edges.length,
    contradictions_resolved: s.contradictionsResolved,
    intervention_node: form.intervention.node,
    intervention_prediction_marked: evaluation.prediction_marked,
    intervention_prediction_implied_by_evidence:
      evaluation.prediction_implied_by_evidence,
    intervention_prediction_implied_by_own_model:
      evaluation.prediction_implied_by_own_model,
    intervention_prediction_made: evaluation.prediction_made,
    intervention_prediction_correct: evaluation.prediction_correct,
    intervention_prediction_consistent_with_own_model:
      evaluation.prediction_consistent_with_own_model,
    submission_complete:
      evaluation.model_complete && evaluation.prediction_made,
    reading_ms_before_first_edit:
      s.firstEditAtMs === null || s.openedAtMs === null
        ? null
        : s.firstEditAtMs - s.openedAtMs,
    pointer_acts: s.pointerActs,
    keyboard_acts: s.keyboardActs,
    input_mode: inputModeSummary(s),
  };
}

function log(suffix: string, metadata: Record<string, unknown> = {}) {
  logIpEvent('proto_m15_cipher', OBJECT_ID, suffix, {
    ...ipWindowFields(ensure().window),
    window_id: M15C_WINDOW_ID,
    ...metadata,
  });
  refreshIpProbe();
}

export function declareM15Causal() {
  const s = ensure();

  declareIpWindow(s.window);
  registerIpProbeSource('m15', M15C_OPPORTUNITY_ID, m15CausalProbe);
  refreshIpProbe();
}

export function m15CausalWindowStatus() {
  return ensure().window.status;
}

/** Opens the evidence table; the worked example is shown at first open. */
export function openM15Causal(nowMs: number) {
  const s = ensure();

  declareM15Causal();

  const entry = enterIpWindow(s.window, nowMs);

  if (entry === 'opened') {
    s.openedAtMs = nowMs;
    s.guideShown = true;
    log('window_opened', {
      nodes: M15C_FORMS[s.form].nodes.map((node) => node.id),
      sources: M15C_FORMS[s.form].sources.map((source) => source.id),
      required_causal_edges: M15C_FORMS[s.form].required.length,
      intervention_node: M15C_FORMS[s.form].intervention.node,
      guide_presented: true,
    });
  } else if (entry === 'reopened') {
    log('window_reopened');
  }

  s.feedback = null;
  refreshIpProbe();
}

export function leaveM15Causal(nowMs: number) {
  const s = ensure();

  if (s.window.panel_open) {
    s.linkSource = null;
    leaveIpPanel(s.window, nowMs);
    log('panel_left');
  }
}

function canAct(): boolean {
  return ensure().window.status === 'open';
}

function countAct(s: M15CState, mode: InputMode) {
  if (mode === 'pointer') {
    s.pointerActs += 1;
  } else {
    s.keyboardActs += 1;
  }
}

export type CausalAction =
  | { kind: 'open_source'; id: string }
  | { kind: 'show_guide' }
  | { kind: 'node'; id: string }
  | { kind: 'set_mode'; mode: M15CMode };

export interface CausalActResult {
  ok: boolean;
  message: string;
}

/** Every semantic act (pointer and keyboard call exactly this). */
export function m15CausalAct(
  action: CausalAction,
  mode: InputMode,
  nowMs: number,
): CausalActResult {
  const s = ensure();
  const form = M15C_FORMS[s.form];

  if (!canAct()) {
    return { ok: false, message: 'The evidence table is closed.' };
  }

  switch (action.kind) {
    case 'open_source': {
      const source = form.sources.find(
        (candidate) => candidate.id === action.id,
      );

      if (source === undefined) {
        return { ok: false, message: 'No such source.' };
      }

      countAct(s, mode);

      if (s.openSource !== null && s.openSource !== source.id) {
        s.sourceTransitions += 1;
      }

      if (!s.sourcesOpened.includes(source.id)) {
        s.sourcesOpened.push(source.id);
      }

      s.sourceLog.push(source.id);
      s.openSource = source.id;
      log('source_opened', {
        source_id: source.id,
        view_index: s.sourceLog.length,
        first_view: s.sourceLog.filter((id) => id === source.id).length === 1,
        input_mode: mode,
      });

      return { ok: true, message: source.title };
    }
    case 'show_guide':
      countAct(s, mode);
      s.guideViews += 1;
      s.openSource = null;
      log('guide_viewed', { view_count: s.guideViews, input_mode: mode });

      return { ok: true, message: 'Worked example shown.' };
    case 'set_mode': {
      if (s.mode === action.mode) {
        return { ok: true, message: '' };
      }

      countAct(s, mode);
      s.mode = action.mode;
      s.linkSource = null;
      log('mode_changed', { mode: action.mode, input_mode: mode });

      return {
        ok: true,
        message:
          action.mode === 'predict'
            ? form.intervention.text
            : 'Model board: activate a node, then the node it drives.',
      };
    }
    case 'node': {
      const node = form.nodes.find((candidate) => candidate.id === action.id);

      if (node === undefined) {
        return { ok: false, message: 'No such node.' };
      }

      countAct(s, mode);

      if (s.mode === 'predict') {
        if (s.marked.includes(node.id)) {
          s.marked = s.marked.filter((id) => id !== node.id);
          log('node_unmarked', { node_id: node.id, input_mode: mode });

          return { ok: true, message: `${node.label}: unmarked.` };
        }

        s.marked.push(node.id);
        log('node_marked', { node_id: node.id, input_mode: mode });

        return { ok: true, message: `${node.label}: marked as changing.` };
      }

      if (s.linkSource === null) {
        s.linkSource = node.id;

        return {
          ok: true,
          message: `${node.label} → … choose the node it drives.`,
        };
      }

      if (s.linkSource === node.id) {
        s.linkSource = null;

        return { ok: true, message: 'Link cancelled.' };
      }

      const edge: CausalEdge = { from: s.linkSource, to: node.id };
      const existing = s.edges.findIndex(
        (candidate) => candidate.from === edge.from && candidate.to === edge.to,
      );

      s.linkSource = null;

      if (s.firstEditAtMs === null) {
        s.firstEditAtMs = nowMs;
      }

      if (existing >= 0) {
        const before = evaluateCausalModel(form, s.edges, s.marked);

        s.edges.splice(existing, 1);
        s.edits.push({ kind: 'remove', edge, input_mode: mode });

        const after = evaluateCausalModel(form, s.edges, s.marked);

        if (
          after.contradicting_edges.length <
            before.contradicting_edges.length ||
          after.invalid_edges.length < before.invalid_edges.length
        ) {
          s.contradictionsResolved += 1;
        }

        log('link_removed', {
          from: edge.from,
          to: edge.to,
          edit_index: s.edits.length,
          links_after: s.edges.length,
          input_mode: mode,
        });

        return { ok: true, message: `Removed ${edge.from} → ${edge.to}.` };
      }

      s.edges.push(edge);
      s.edits.push({ kind: 'add', edge, input_mode: mode });
      log('link_added', {
        from: edge.from,
        to: edge.to,
        edit_index: s.edits.length,
        links_after: s.edges.length,
        input_mode: mode,
      });

      return { ok: true, message: `Linked ${edge.from} → ${edge.to}.` };
    }
    default:
      return { ok: false, message: 'Unknown action.' };
  }
}

export interface CausalSubmitOutcome {
  ok: boolean;
  closed: boolean;
  message: string;
}

/** Two-stage submission: an incomplete model warns once, then records. */
export function m15CausalSubmit(
  mode: InputMode,
  nowMs: number,
): CausalSubmitOutcome {
  const s = ensure();
  const form = M15C_FORMS[s.form];

  if (!canAct()) {
    return {
      ok: false,
      closed: true,
      message: 'The evidence table is closed.',
    };
  }

  const evaluation = evaluateCausalModel(form, s.edges, s.marked);
  const complete = evaluation.model_complete && evaluation.prediction_made;

  if (!complete && !s.incompleteWarned) {
    s.incompleteWarned = true;
    log('submission_incomplete_warned', {
      edges_drawn: evaluation.edges_drawn,
      prediction_made: evaluation.prediction_made,
      input_mode: mode,
    });
    s.feedback = evaluation.prediction_made
      ? 'Model may be incomplete — submit again to record it as it stands.'
      : 'No prediction marked yet — PREDICT, or submit again to record as is.';

    return { ok: false, closed: false, message: s.feedback };
  }

  countAct(s, mode);

  const submission = bumpIpSubmission(s.window);

  log('submitted', {
    submission,
    ...rawSummary(),
    input_mode: mode,
  });
  closeIpWindow(s.window, 'completed', nowMs);
  s.feedback = 'Model recorded. The signal display updates.';
  log('completed', rawSummary());

  return { ok: true, closed: true, message: s.feedback };
}

export function m15CausalHelp(mode: InputMode, nowMs: number): string[] {
  void nowMs;

  const s = ensure();

  bumpIpHelp(s.window);
  log('help_consulted', { input_mode: mode });

  return [
    'Each evidence tile expands in the readout; every source stays on the table.',
    'A link A → B means A drives B. Activate A, then B; activate the pair again to remove it.',
    'PREDICT asks which nodes change when one node is held; mark them, then SUBMIT.',
  ];
}

export function m15CausalStop(nowMs: number) {
  const s = ensure();

  if (!canAct()) {
    return;
  }

  s.linkSource = null;
  closeIpWindow(s.window, 'exited', nowMs);
  s.feedback = 'Evidence table closed at your request. Record kept.';
  log('stopped', rawSummary());
}

export function m15CausalFail(nowMs: number, detail: string) {
  const s = ensure();

  if (!canAct()) {
    return;
  }

  closeIpWindow(s.window, 'technical_failure', nowMs, detail);
  log('technical_failure', { ...rawSummary(), detail });
}

export interface CausalView {
  form: FormId;
  mode: M15CMode;
  closed: boolean;
  status: IpWindow['status'];
  brief: readonly string[];
  nodes: { id: string; label: string; linkSource: boolean; marked: boolean }[];
  edges: CausalEdge[];
  sources: { id: string; title: string; summary: string; open: boolean }[];
  /** Readout: the open source's lines, or the worked example. */
  readoutTitle: string;
  readoutLines: readonly string[];
  intervention: string;
  linkSource: string | null;
  edgesDrawn: number;
  markedCount: number;
  feedback: string | null;
}

export function m15CausalView(): CausalView {
  const s = ensure();
  const form = M15C_FORMS[s.form];
  const open =
    form.sources.find((source) => source.id === s.openSource) ?? null;

  return {
    form: s.form,
    mode: s.mode,
    closed: ipWindowIsClosed(s.window),
    status: s.window.status,
    brief: form.brief,
    nodes: form.nodes.map((node) => ({
      id: node.id,
      label: node.label,
      linkSource: s.linkSource === node.id,
      marked: s.marked.includes(node.id),
    })),
    edges: s.edges.map((edge) => ({ ...edge })),
    sources: form.sources.map((source) => ({
      id: source.id,
      title: source.title,
      summary: source.summary,
      open: s.openSource === source.id,
    })),
    readoutTitle: open === null ? 'WORKED EXAMPLE' : open.title.toUpperCase(),
    readoutLines: open === null ? form.guide : open.lines,
    intervention: form.intervention.text,
    linkSource: s.linkSource,
    edgesDrawn: s.edges.length,
    markedCount: s.marked.length,
    feedback: s.feedback,
  };
}

export function m15CausalProbe(): Record<string, unknown> {
  const s = ensure();

  return {
    ...rawSummary(),
    form: s.form,
    mode: s.mode,
    link_source: s.linkSource,
    open_source: s.openSource,
    marked: [...s.marked],
  };
}

/** Test-only escape hatch. */
export function resetM15CausalState() {
  state = null;
}
