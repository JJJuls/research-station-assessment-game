/**
 * Pure causal-model forms + validator (M15 — evidence-led pilot v2,
 * Unit 3, signal-analysis incident phase 1).
 *
 * `import.meta`-free for Node-side tests. Sheet 09 M15 ("Make sense of
 * complex information."): build a compact causal subsystem model from
 * independent evidence, then predict the effect of one intervention.
 *
 * Each matched form (A/B) has five domain-neutral subsystem nodes, four
 * required directed edges forming one chain with one join, four
 * independent evidence sources that must be INTEGRATED (each edge is
 * supported by timing, state or log evidence — no single source lists
 * the model), one distractor relation that the case log explicitly rules
 * out, and one intervention whose downstream effect follows from the
 * model. Everything a participant needs is on the surface; no domain
 * knowledge is required and no answer card exists.
 *
 * SCIENTIFIC BOUNDARY: `evaluateCausalModel` returns raw facts (edges
 * present / invalid / contradicting, prediction sets) — never a score.
 */

import type { FormId } from './model';

export interface CausalNode {
  id: string;
  label: string;
}

export interface CausalEdge {
  from: string;
  to: string;
}

export interface EvidenceSource {
  id: string;
  /** Short title on the compact tile. */
  title: string;
  /** Two-line summary shown while the source is not expanded. */
  summary: string;
  /** Full lines shown in the readout when the source is opened. */
  lines: readonly string[];
}

export interface CausalForm {
  id: FormId;
  brief: readonly string[];
  nodes: readonly CausalNode[];
  /** Ground truth implied by the evidence (four edges). */
  required: readonly CausalEdge[];
  /** Relations the evidence explicitly rules out (distractors). */
  ruledOut: readonly CausalEdge[];
  sources: readonly EvidenceSource[];
  /** The one intervention: the node held steady / isolated. */
  intervention: { node: string; text: string };
  /** Worked example (diagram tutorial) — never uses a form node. */
  guide: readonly string[];
}

export const M15C_REQUIRED_EDGES = 4;
export const M15C_NODES = 5;
export const M15C_SOURCES = 4;

export const M15C_FORMS: Record<FormId, CausalForm> = {
  A: {
    id: 'A',
    brief: [
      'Receiver chain of the recovered transmission: draw which subsystem drives which, then predict one intervention.',
    ],
    nodes: [
      { id: 'FEED', label: 'Feed' },
      { id: 'CLOCK', label: 'Clock' },
      { id: 'GATE', label: 'Gate' },
      { id: 'BUFFER', label: 'Buffer' },
      { id: 'OUTPUT', label: 'Output' },
    ],
    required: [
      { from: 'FEED', to: 'GATE' },
      { from: 'CLOCK', to: 'GATE' },
      { from: 'GATE', to: 'BUFFER' },
      { from: 'BUFFER', to: 'OUTPUT' },
    ],
    ruledOut: [{ from: 'CLOCK', to: 'OUTPUT' }],
    sources: [
      {
        id: 'waveform',
        title: 'Waveform fragments',
        summary: 'Three dropout traces with timestamps.',
        lines: [
          'W1  FEED drops at 0 ms. GATE drops 40 ms later.',
          'W2  BUFFER drops 30 ms after GATE.',
          'W3  OUTPUT drops 20 ms after BUFFER.',
          '(Later than = downstream of.)',
        ],
      },
      {
        id: 'timing',
        title: 'Timing table',
        summary: 'Event order across the dropout.',
        lines: [
          'CLOCK   steady throughout the dropout',
          'FEED    0 ms',
          'GATE    +40 ms',
          'BUFFER  +70 ms',
          'OUTPUT  +90 ms',
        ],
      },
      {
        id: 'states',
        title: 'Subsystem states',
        summary: 'Bench holds and isolations.',
        lines: [
          'CLOCK held: GATE stalls even with FEED steady.',
          'BUFFER isolated: OUTPUT holds its last value.',
          'GATE held: FEED keeps running unchanged.',
        ],
      },
      {
        id: 'log',
        title: 'Case log',
        summary: 'Two handover notes.',
        lines: [
          'Noor — anomaly first seen on the feed side.',
          'Kai — CLOCK never reaches OUTPUT directly;',
          '      any effect passes through the gate.',
        ],
      },
    ],
    intervention: {
      node: 'GATE',
      text: 'Hold the Gate steady. Mark every node whose trace changes.',
    },
    guide: [
      'EXAMPLE (not part of the case):',
      '"FLOW rises 10 ms after the PUMP starts" means the pump drives the flow.',
      'Draw it as PUMP → FLOW: activate PUMP, then FLOW.',
      'A link means "the first drives the second". Activate a link again to remove it.',
    ],
  },
  B: {
    id: 'B',
    brief: [
      'Receiver chain of the recovered transmission: draw which subsystem drives which, then predict one intervention.',
    ],
    nodes: [
      { id: 'ANTENNA', label: 'Antenna' },
      { id: 'TIMER', label: 'Timer' },
      { id: 'FILTER', label: 'Filter' },
      { id: 'STORE', label: 'Store' },
      { id: 'DISPLAY', label: 'Display' },
    ],
    required: [
      { from: 'ANTENNA', to: 'FILTER' },
      { from: 'TIMER', to: 'FILTER' },
      { from: 'FILTER', to: 'STORE' },
      { from: 'STORE', to: 'DISPLAY' },
    ],
    ruledOut: [{ from: 'ANTENNA', to: 'DISPLAY' }],
    sources: [
      {
        id: 'waveform',
        title: 'Waveform fragments',
        summary: 'Three dropout traces with timestamps.',
        lines: [
          'W1  ANTENNA drops at 0 ms. FILTER drops 50 ms later.',
          'W2  STORE drops 25 ms after FILTER.',
          'W3  DISPLAY drops 15 ms after STORE.',
          '(Later than = downstream of.)',
        ],
      },
      {
        id: 'timing',
        title: 'Timing table',
        summary: 'Event order across the dropout.',
        lines: [
          'TIMER    steady throughout the dropout',
          'ANTENNA  0 ms',
          'FILTER   +50 ms',
          'STORE    +75 ms',
          'DISPLAY  +90 ms',
        ],
      },
      {
        id: 'states',
        title: 'Subsystem states',
        summary: 'Bench holds and isolations.',
        lines: [
          'TIMER held: FILTER stalls even with ANTENNA steady.',
          'STORE isolated: DISPLAY holds its last value.',
          'FILTER held: ANTENNA keeps running unchanged.',
        ],
      },
      {
        id: 'log',
        title: 'Case log',
        summary: 'Two handover notes.',
        lines: [
          'Noor — anomaly first seen on the antenna side.',
          'Kai — ANTENNA never reaches DISPLAY directly;',
          '      any effect passes through the filter.',
        ],
      },
    ],
    intervention: {
      node: 'FILTER',
      text: 'Hold the Filter steady. Mark every node whose trace changes.',
    },
    guide: [
      'EXAMPLE (not part of the case):',
      '"FLOW rises 10 ms after the PUMP starts" means the pump drives the flow.',
      'Draw it as PUMP → FLOW: activate PUMP, then FLOW.',
      'A link means "the first drives the second". Activate a link again to remove it.',
    ],
  },
};

export function edgeKey(edge: CausalEdge): string {
  return `${edge.from}>${edge.to}`;
}

function sameEdge(a: CausalEdge, b: CausalEdge): boolean {
  return a.from === b.from && a.to === b.to;
}

/** Descendants of `node` in an arbitrary directed graph (cycle-safe). */
export function descendants(
  node: string,
  edges: readonly CausalEdge[],
): string[] {
  const seen = new Set<string>();
  const stack = [node];

  while (stack.length > 0) {
    const current = stack.pop()!;

    for (const edge of edges) {
      if (edge.from === current && !seen.has(edge.to)) {
        seen.add(edge.to);
        stack.push(edge.to);
      }
    }
  }

  seen.delete(node);

  return [...seen].sort();
}

export interface CausalEvaluation {
  edges_drawn: number;
  required_total: number;
  required_present: number;
  /** Drawn edges that are not in the required set. */
  invalid_edges: CausalEdge[];
  /** Drawn edges that reverse a documented order or are ruled out. */
  contradicting_edges: CausalEdge[];
  /** Prediction implied by the form's ground truth. */
  prediction_implied_by_evidence: string[];
  /** Prediction implied by the participant's own drawn model. */
  prediction_implied_by_own_model: string[];
  prediction_marked: string[];
  prediction_made: boolean;
  prediction_correct: boolean;
  prediction_consistent_with_own_model: boolean;
  /** Required edges present + no invalid edge + prediction made. */
  constraints_satisfied: number;
  constraints_total: number;
  model_complete: boolean;
}

/** Raw facts about a drawn model + prediction; never a score. */
export function evaluateCausalModel(
  form: CausalForm,
  edges: readonly CausalEdge[],
  marked: readonly string[],
): CausalEvaluation {
  const requiredPresent = form.required.filter((required) =>
    edges.some((edge) => sameEdge(edge, required)),
  ).length;
  const invalid = edges.filter(
    (edge) => !form.required.some((required) => sameEdge(edge, required)),
  );
  const contradicting = edges.filter(
    (edge) =>
      form.required.some((required) =>
        sameEdge({ from: edge.to, to: edge.from }, required),
      ) || form.ruledOut.some((ruled) => sameEdge(edge, ruled)),
  );
  const impliedByEvidence = descendants(form.intervention.node, form.required);
  const impliedByOwn = descendants(form.intervention.node, edges);
  const markedSorted = [...marked].sort();
  const same = (a: string[], b: string[]) =>
    a.length === b.length && a.every((value, index) => value === b[index]);
  const predictionMade = marked.length > 0;
  const modelComplete = requiredPresent === form.required.length;
  const constraints = [
    modelComplete,
    invalid.length === 0,
    predictionMade,
  ].filter(Boolean).length;

  return {
    edges_drawn: edges.length,
    required_total: form.required.length,
    required_present: requiredPresent,
    invalid_edges: invalid.map((edge) => ({ ...edge })),
    contradicting_edges: contradicting.map((edge) => ({ ...edge })),
    prediction_implied_by_evidence: impliedByEvidence,
    prediction_implied_by_own_model: impliedByOwn,
    prediction_marked: markedSorted,
    prediction_made: predictionMade,
    prediction_correct: predictionMade && same(markedSorted, impliedByEvidence),
    prediction_consistent_with_own_model:
      predictionMade && same(markedSorted, impliedByOwn),
    constraints_satisfied: constraints,
    constraints_total: 3,
    model_complete: modelComplete,
  };
}
