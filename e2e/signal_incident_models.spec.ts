/**
 * Signal-analysis incident — pure model tests (evidence-led pilot v2,
 * Unit 3). Node-side, no browser, no `import.meta`.
 *
 * Proves at the model level: the four phase families (and their declared
 * event types, read from source) are pairwise disjoint; the M15 causal
 * forms are matched and every required relation is documented by the
 * evidence; the causal validator reports raw facts (edges present /
 * invalid / contradicting, both prediction readings) and never a score;
 * the M17 structure is one demonstration + two baseline probes + twelve
 * feedback learning trials + two transfer probes (Unit 9); the M18 fault
 * forms stay matched and independent of every M13 module; the incident's
 * four phases sum to the ledger's 235 s planning envelope; nothing in the
 * laboratory scene imports M13 state into M18; and no canonical schema,
 * scoring rule or trait output references any phase.
 */
import { readFileSync } from 'node:fs';

import { expect, test } from '@playwright/test';

import {
  descendants,
  evaluateCausalModel,
  M15C_FORMS,
  M15C_NODES,
  M15C_REQUIRED_EDGES,
  M15C_SOURCES,
} from '../src/informationProcessing/causalForms';
import {
  consistentHypotheses,
  M18F_FORMS,
} from '../src/informationProcessing/faultForms';
import {
  evaluateTrial,
  linesOf,
  M17_BASELINE_TRIALS,
  M17_FORMS,
  M17_GRAMMAR,
  M17_LEARNING_TRIALS,
  M17_TRANSFER_TRIALS,
  M17_TRIALS_TOTAL,
} from '../src/informationProcessing/syntaxForms';
import { EVIDENCE_LEDGER } from '../src/pilot/evidenceLedger';

const PHASE_FILES: [string, string][] = [
  ['src/informationProcessing/m15CausalModel.ts', 'proto_m15_cipher'],
  ['src/informationProcessing/m16ProtocolUpdate.ts', 'proto_m16_protocol'],
  ['src/informationProcessing/m17SyntaxAcquisition.ts', 'proto_m17_trials'],
  ['src/informationProcessing/m18FaultDiagnosis.ts', 'proto_m18_fault'],
];

function declaredSuffixes(source: string): string[] {
  const block = /declareIpEvents\('[a-z0-9_]+',\s*\[([^\]]*)\]/.exec(source);

  if (block === null) {
    return [];
  }

  return [...block[1].matchAll(/'([a-z_]+)'/g)].map((m) => m[1]);
}

test.describe('signal incident — families and boundaries (source)', () => {
  test('M15–M18 phase modules each declare and log exactly one family; the four families and their event types are pairwise disjoint', () => {
    const allTypes = new Set<string>();

    for (const [file, family] of PHASE_FILES) {
      const source = readFileSync(file, 'utf8');
      const logged = [...source.matchAll(/logIpEvent\('([a-z0-9_]+)'/g)].map(
        (m) => m[1],
      );
      const declared = [
        ...source.matchAll(/declareIpEvents\('([a-z0-9_]+)'/g),
      ].map((m) => m[1]);

      expect(new Set(logged), file).toEqual(new Set([family]));
      expect(declared, file).toEqual([family]);

      const suffixes = declaredSuffixes(source);

      expect(suffixes.length, file).toBeGreaterThan(8);

      for (const suffix of suffixes) {
        const type = `${family}_${suffix}`;

        expect(allTypes.has(type), type).toBe(false);
        allTypes.add(type);
      }
    }

    // No family prefix is a prefix of another family.
    const families = PHASE_FILES.map(([, family]) => family);

    for (const a of families) {
      for (const b of families) {
        if (a !== b) {
          expect(b.startsWith(a), `${a} prefixes ${b}`).toBe(false);
        }
      }
    }
  });

  test('the laboratory scene passes M13 state to M18 as context only; the M18 modules import nothing from M13; no canonical schema, scoring rule or trait output references a phase', () => {
    const lab = readFileSync(
      'src/scenes/DiagnosticsLaboratoryScene.ts',
      'utf8',
    );

    // The former sequencing gate is gone: no refusal text, no gate keyed on
    // the lattice window; the only M13 read is the route-context stamp.
    expect(lab).not.toMatch(/Finish or stop the lattice bench/);
    expect(lab).not.toMatch(/gate:\s*\(\)\s*=>\s*m13LatticeWindowStatus/);
    expect(lab.match(/m13LatticeWindowStatus\(\)/g)?.length ?? 0).toBe(1);
    expect(lab).toMatch(/prior_m13_window_status: m13LatticeWindowStatus\(\)/);

    for (const file of [
      'src/informationProcessing/m18FaultDiagnosis.ts',
      'src/informationProcessing/faultForms.ts',
      'src/informationProcessing/ui/DiagnosisConsoleScene.ts',
    ]) {
      const source = readFileSync(file, 'utf8')
        .replace(/\/\*[\s\S]*?\*\//g, '')
        .replace(/\/\/.*$/gm, '');

      expect(source, file).not.toMatch(
        /m13PipeNetwork|m13PipePuzzle|pipeBoardEngine/,
      );
    }

    for (const file of [
      'src/world/CanonicalEventContext.ts',
      'src/systems/ScoringManager.ts',
      'docs/research/event-schema.md',
      'docs/research/scoring-plan.md',
    ]) {
      const source = readFileSync(file, 'utf8');

      for (const [, family] of PHASE_FILES) {
        expect(source, `${file} mentions ${family}`).not.toContain(family);
      }

      expect(source).not.toMatch(
        /signal_evidence_table|signal_training_rig|signal_diagnostic_board/,
      );
    }

    // No phase module computes a score, slope, criterion or trait label.
    for (const [file] of PHASE_FILES) {
      const source = readFileSync(file, 'utf8').replace(
        /\/\*[\s\S]*?\*\//g,
        '',
      );

      expect(source, file).not.toMatch(
        /\b(score|trait|slope|weight)\b\s*[:=]/i,
      );
    }
  });

  test('the incident stays inside the ledger planning envelope: the four phases sum to 235 s of item-owned active time', () => {
    const phases = ['M15', 'M16', 'M17', 'M18'].map(
      (id) => EVIDENCE_LEDGER.find((entry) => entry.id === id)!,
    );

    expect(phases.every((entry) => entry.episode_label.startsWith('3'))).toBe(
      true,
    );
    expect(phases.map((entry) => entry.active_seconds)).toEqual([
      65, 50, 55, 65,
    ]);
    expect(phases.reduce((sum, entry) => sum + entry.active_seconds, 0)).toBe(
      235,
    );
  });
});

test.describe('M15 causal model (pure)', () => {
  for (const formId of ['A', 'B'] as const) {
    test(`form ${formId}: five nodes, four required edges (one join), four sources that together document every edge, one ruled-out distractor, one intervention`, () => {
      const form = M15C_FORMS[formId];

      expect(form.nodes).toHaveLength(M15C_NODES);
      expect(form.required).toHaveLength(M15C_REQUIRED_EDGES);
      expect(form.sources).toHaveLength(M15C_SOURCES);
      expect(form.ruledOut).toHaveLength(1);

      const ids = new Set(form.nodes.map((node) => node.id));

      for (const edge of [...form.required, ...form.ruledOut]) {
        expect(ids.has(edge.from)).toBe(true);
        expect(ids.has(edge.to)).toBe(true);
      }

      // Exactly one join node (two parents); the graph is acyclic.
      const parents = new Map<string, number>();

      for (const edge of form.required) {
        parents.set(edge.to, (parents.get(edge.to) ?? 0) + 1);
      }

      expect([...parents.values()].filter((count) => count === 2)).toHaveLength(
        1,
      );

      for (const node of form.nodes) {
        expect(descendants(node.id, form.required)).not.toContain(node.id);
      }

      // Every required edge is documented by at least one source line that
      // names both nodes (integration: no single source lists the model).
      const text = form.sources.map((source) => source.lines.join(' '));

      for (const edge of form.required) {
        const documented = text.some(
          (lines) => lines.includes(edge.from) && lines.includes(edge.to),
        );

        expect(documented, `${edge.from}→${edge.to}`).toBe(true);
      }

      const perSource = form.sources.map(
        (source) =>
          form.required.filter(
            (edge) =>
              source.lines.join(' ').includes(edge.from) &&
              source.lines.join(' ').includes(edge.to),
          ).length,
      );

      // Integration: the join edge is documented only by the bench holds
      // (the timing table shows that node steady, never a link).
      expect(
        perSource.filter((count) => count >= 1).length,
      ).toBeGreaterThanOrEqual(2);
      expect(
        form.sources.find((source) => source.id === 'states')!.lines.join(' '),
      ).toMatch(/held/);

      // The intervention node has at least two downstream nodes.
      expect(ids.has(form.intervention.node)).toBe(true);
      expect(
        descendants(form.intervention.node, form.required).length,
      ).toBeGreaterThanOrEqual(2);
      // The worked example never uses a form node.
      expect(form.guide.join(' ')).not.toMatch(new RegExp([...ids].join('|')));
    });
  }

  test('forms A and B are matched in structure and differ in surface', () => {
    const a = M15C_FORMS.A;
    const b = M15C_FORMS.B;

    expect(a.nodes.map((n) => n.id)).not.toEqual(b.nodes.map((n) => n.id));
    expect(a.required.length).toBe(b.required.length);
    expect(a.sources.map((s) => s.id)).toEqual(b.sources.map((s) => s.id));
    expect(a.intervention.node).not.toBe(b.intervention.node);
    // Matched prediction load: the same number of downstream nodes.
    expect(descendants(a.intervention.node, a.required).length).toBe(
      descendants(b.intervention.node, b.required).length,
    );
    // The held-node line never names a prediction target.
    for (const form of [a, b]) {
      const targets = descendants(form.intervention.node, form.required);
      const heldLine = form.sources
        .find((source) => source.id === 'states')!
        .lines.find((line) =>
          line.startsWith(`${form.intervention.node} held`),
        )!;

      for (const target of targets) {
        expect(heldLine, form.id).not.toContain(target);
      }
    }
  });

  test('the validator reports raw facts — required present, invalid, contradicting, both prediction readings — and never a score', () => {
    const form = M15C_FORMS.A;
    const empty = evaluateCausalModel(form, [], []);

    expect(empty.required_present).toBe(0);
    expect(empty.prediction_made).toBe(false);
    expect(empty.prediction_correct).toBe(false);
    expect(empty.model_complete).toBe(false);
    expect(empty.constraints_satisfied).toBe(1); // no invalid edge yet

    const partial = evaluateCausalModel(
      form,
      [
        { from: 'FEED', to: 'GATE' },
        { from: 'OUTPUT', to: 'BUFFER' }, // reversed → contradicting + invalid
        { from: 'CLOCK', to: 'OUTPUT' }, // ruled out by the log → contradicting
      ],
      ['BUFFER'],
    );

    expect(partial.required_present).toBe(1);
    expect(partial.invalid_edges).toHaveLength(2);
    expect(partial.contradicting_edges).toHaveLength(2);
    expect(partial.prediction_implied_by_evidence).toEqual([
      'BUFFER',
      'OUTPUT',
    ]);
    expect(partial.prediction_implied_by_own_model).toEqual([]);
    expect(partial.prediction_correct).toBe(false);
    expect(partial.prediction_consistent_with_own_model).toBe(false);

    const complete = evaluateCausalModel(
      form,
      [...form.required],
      ['OUTPUT', 'BUFFER'],
    );

    expect(complete.required_present).toBe(4);
    expect(complete.invalid_edges).toEqual([]);
    expect(complete.model_complete).toBe(true);
    expect(complete.prediction_correct).toBe(true);
    expect(complete.prediction_consistent_with_own_model).toBe(true);
    expect(complete.constraints_satisfied).toBe(3);
    expect(Object.keys(complete).join(' ')).not.toMatch(
      /score|accuracy_score|trait/i,
    );
  });
});

test.describe('M17 learning series (pure)', () => {
  test('sixteen trials — two uncoached baseline, twelve feedback learning, two transfer — two operators each; own grammar; forms matched trial by trial', () => {
    expect(M17_BASELINE_TRIALS).toBe(2);
    expect(M17_LEARNING_TRIALS).toBe(12);
    expect(M17_TRANSFER_TRIALS).toBe(2);
    expect(M17_TRIALS_TOTAL).toBe(16);
    expect(M17_GRAMMAR.id).toBe('m17-alien-v1');

    for (const formId of ['A', 'B'] as const) {
      const form = M17_FORMS[formId];

      expect(form.demo).toHaveLength(3);
      expect(form.trials.map((trial) => trial.phase)).toEqual([
        'baseline',
        'baseline',
        ...Array<string>(12).fill('learning'),
        'transfer',
        'transfer',
      ]);

      for (const trial of form.trials) {
        expect(trial.reference).toHaveLength(2);
        expect(trial.start).toHaveLength(3);
        expect(trial.goal).not.toEqual(trial.start);
        expect(
          evaluateTrial(trial, linesOf(trial.reference)).goal_reached,
        ).toBe(true);
      }
    }

    // Forms matched trial by trial in operator mix.
    for (let i = 0; i < M17_TRIALS_TOTAL; i += 1) {
      const mix = (formId: 'A' | 'B') =>
        M17_FORMS[formId].trials[i].reference
          .map((line) => line.split(' ')[0])
          .sort()
          .join('+');

      expect(mix('A')).toBe(mix('B'));
    }
  });

  test('evaluation is per trial, from that trial start: a correct buffer for one trial does not reach the next goal', () => {
    const [first, second] = M17_FORMS.A.trials;
    const lines = linesOf(first.reference);

    expect(evaluateTrial(first, lines).goal_reached).toBe(true);
    expect(evaluateTrial(second, lines).goal_reached).toBe(false);
  });
});

test.describe('M18 fault forms (pure)', () => {
  test('both forms keep exactly one evidence-consistent hypothesis and the same structure', () => {
    for (const formId of ['A', 'B'] as const) {
      const form = M18F_FORMS[formId];

      expect(consistentHypotheses(form)).toEqual([form.correct]);
      expect(form.hypotheses).toHaveLength(4);
      expect(form.panels).toHaveLength(4);
      expect(form.tests).toHaveLength(3);
    }

    expect(M18F_FORMS.A.correct).not.toBe(M18F_FORMS.B.correct);
  });
});
