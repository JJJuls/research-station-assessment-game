/**
 * Station 080 M17 — sixteen-trial learning series with a three-in-a-row
 * criterion (Unit 9), pure tests.
 *
 * Playwright test blocks that never touch `page`: the register row and the
 * pilot settings; the two forms (sixteen trials in the fixed
 * baseline / learning / transfer order, two operators each, no case
 * solvable with one operator, form B a relabelling of form A so the
 * operator mix is matched trial by trial while no register recurs); the
 * criterion function (first run of three, attainment within the
 * administered trials reported after an early exit, twelve without
 * attainment censored, fewer incomplete); and the extractor over the raw
 * family — attained, censored, incomplete after a stop, pending while
 * open, never opened ≠ interrupted, a module record that disagrees with
 * the recount ⇒ technical failure on both rows, the companion sequence
 * kept apart from the criterion pair.
 */
import { expect, test } from '@playwright/test';

import {
  allSingleCommands,
  evaluateTrial,
  linesOf,
  M17_BASELINE_TRIALS,
  M17_CRITERION_RUN,
  M17_FORMS,
  M17_GRAMMAR,
  M17_LEARNING_TRIALS,
  M17_TRANSFER_TRIALS,
  M17_TRIALS_TOTAL,
  m17Criterion,
  registersEqual,
  runRegister,
  slotsChanged,
  type SyntaxTrial,
} from '../src/informationProcessing/syntaxForms';
import { extractItemFeatures } from '../src/measurement/features';
import { PILOT_SETTINGS } from '../src/measurement/protocol';
import { registerEntry } from '../src/measurement/registerV3';
import type { RawGameEvent } from '../src/systems/EventLogger';

const FAMILY = 'proto_m17_trials_';
const CONTEXT = { finalCoreClosed: true, pageLoadIndex: 1, reloaded: false };
const OPEN_CONTEXT = { ...CONTEXT, finalCoreClosed: false };

/** A captured event stream shaped like the adapter's emissions. */
function harness() {
  const events: RawGameEvent[] = [];
  const push = (suffix: string, metadata: Record<string, unknown>) => {
    events.push({
      session_id: 's',
      timestamp_ms: events.length,
      scene: 'information_processing_lab',
      event_type: `${FAMILY}${suffix}`,
      sequence: events.length + 1,
      page_load_index: 1,
      metadata: { opportunity_id: 'proto_m17_criterion', ...metadata },
    });
  };
  const trials = M17_FORMS.A.trials;

  return {
    events,
    opened: () => push('window_opened', { trials_total: M17_TRIALS_TOTAL }),
    /** Submits trial `index` (1–16) with the given correctness. */
    submit: (index: number, correct: boolean) => {
      const trial = trials[index - 1];

      push('trial_submitted', {
        trial_index: trial.index,
        phase: trial.phase,
        phase_index: trial.phase_index,
        goal_reached: correct,
        commands_correct: correct ? 2 : 0,
        semantic_errors: correct ? 0 : 2,
        syntax_errors: 0,
        corrections_before_submission: 0,
        feedback_presented: trial.phase === 'learning',
        help_consults: 0,
        demonstration_reviews: 0,
        active_ms: 1_000,
        input_mode: 'typed',
      });
    },
    runReached: (learningTrial: number) =>
      push('criterion_run_reached', {
        learning_trial: learningTrial,
        run: M17_CRITERION_RUN,
      }),
    completed: (criterionRunTrial: number | null) =>
      push('completed', { criterion_run_trial: criterionRunTrial }),
    stopped: (criterionRunTrial: number | null) =>
      push('stopped', { criterion_run_trial: criterionRunTrial }),
    failed: () => push('technical_failure', { detail: 'boom' }),
  };
}

/** Plays a whole series with the given learning pattern (baseline / transfer arbitrary). */
function play(
  h: ReturnType<typeof harness>,
  learning: readonly boolean[],
  options: { complete?: boolean; recorded?: number | null | 'auto' } = {},
) {
  h.opened();
  h.submit(1, false);
  h.submit(2, true);

  const criterion = m17Criterion(learning);

  learning.forEach((correct, i) => {
    h.submit(M17_BASELINE_TRIALS + i + 1, correct);

    if (criterion.attained && criterion.criterion_trial === i + 1) {
      h.runReached(i + 1);
    }
  });

  if (options.complete ?? true) {
    h.submit(15, true);
    h.submit(16, false);
    h.completed(
      options.recorded === undefined || options.recorded === 'auto'
        ? criterion.attained
          ? criterion.criterion_trial
          : null
        : options.recorded,
    );
  }

  return criterion;
}

test.describe('M17 learning series (pure)', () => {
  test('register row: v3 route with one laboratory window, a criterion-event primary and a sequence companion; the pilot settings match the forms', () => {
    const entry = registerEntry('M17');

    expect(entry.route.route_version).toBe('v3');
    expect(entry.route.opportunity_ids).toEqual(['proto_m17_criterion']);
    expect(entry.route.windows.map((w) => [w.id, w.zone, w.episode])).toEqual([
      ['m17_trials_w1', 'diagnostics_laboratory', 3],
    ]);
    expect(entry.route.family_prefixes).toEqual(['proto_m17_trials_']);
    expect(entry.implementation_status).toBe('implemented');
    expect(entry.independence.kind).toBe('single_episode');
    expect(entry.features.map((f) => [f.feature_id, f.kind, f.role])).toEqual([
      ['m17_criterion_trial', 'criterion_event', 'primary'],
      ['m17_sequence_baseline_transfer', 'count', 'companion'],
    ]);
    expect(M17_BASELINE_TRIALS).toBe(PILOT_SETTINGS.m17_baseline_trials);
    expect(M17_LEARNING_TRIALS).toBe(PILOT_SETTINGS.m17_learning_trials);
    expect(M17_TRANSFER_TRIALS).toBe(PILOT_SETTINGS.m17_transfer_trials);
    expect(M17_CRITERION_RUN).toBe(PILOT_SETTINGS.m17_criterion_run);
    expect(M17_TRIALS_TOTAL).toBe(16);
  });

  test('forms: sixteen trials in the fixed order, two operators each, none solvable with one operator; form B relabels form A (matched operator mix, no register recurs); the demonstration shows every operator once', () => {
    const singles = allSingleCommands();

    for (const formId of ['A', 'B'] as const) {
      const form = M17_FORMS[formId];

      expect(form.demo.map((d) => d.command.split(' ')[0])).toEqual([
        'VEK',
        'ZOR',
        'KAI',
      ]);

      for (const example of form.demo) {
        expect(
          registersEqual(
            runRegister(example.before, linesOf([example.command])),
            example.after,
          ),
        ).toBe(true);
      }

      expect(form.trials).toHaveLength(16);
      expect(form.trials.map((t) => t.phase)).toEqual([
        ...Array<string>(2).fill('baseline'),
        ...Array<string>(12).fill('learning'),
        ...Array<string>(2).fill('transfer'),
      ]);
      expect(form.trials.map((t) => t.index)).toEqual(
        form.trials.map((_, i) => i + 1),
      );
      expect(
        form.trials
          .filter((t) => t.phase === 'learning')
          .map((t) => t.phase_index),
      ).toEqual(
        form.trials.filter((t) => t.phase === 'learning').map((_, i) => i + 1),
      );

      for (const trial of form.trials) {
        expect(trial.reference).toHaveLength(2);
        expect(
          evaluateTrial(trial, linesOf(trial.reference)).goal_reached,
        ).toBe(true);
        expect(
          registersEqual(trial.start, trial.goal),
          `${formId} ${trial.index}`,
        ).toBe(false);
        expect(evaluateTrial(trial, []).goal_reached).toBe(false);
        // No single well-formed operator reaches the goal.
        for (const single of singles) {
          expect(
            registersEqual(
              runRegister(trial.start, linesOf([single])),
              trial.goal,
            ),
            `${formId} trial ${trial.index} solvable by ${single}`,
          ).toBe(false);
        }
      }
    }

    // Every baseline and transfer probe changes all three slots (an
    // exchange is needed; no slot-by-slot copy of GOAL solves it), and no
    // transfer pair or goal recurs from the learning series (review S-M1).
    for (const formId of ['A', 'B'] as const) {
      const form = M17_FORMS[formId];
      const learning = form.trials.filter((t) => t.phase === 'learning');

      for (const probe of form.trials.filter((t) => t.phase !== 'learning')) {
        expect(
          slotsChanged(probe.start, probe.goal),
          `${formId} ${probe.index}`,
        ).toBe(3);
      }

      for (const probe of form.trials.filter((t) => t.phase === 'transfer')) {
        const pair = [...probe.reference].sort().join(' ; ');

        expect(
          learning.some((t) => [...t.reference].sort().join(' ; ') === pair),
          `${formId} transfer ${probe.phase_index} pair recurs`,
        ).toBe(false);
        expect(
          learning.some((t) => registersEqual(t.goal, probe.goal)),
          `${formId} transfer ${probe.phase_index} goal recurs`,
        ).toBe(false);
      }
    }

    const ops = (trial: SyntaxTrial) =>
      trial.reference
        .map((line) => line.split(' ')[0])
        .sort()
        .join('+');

    for (let i = 0; i < 16; i += 1) {
      const a = M17_FORMS.A.trials[i];
      const b = M17_FORMS.B.trials[i];

      expect(ops(a)).toBe(ops(b));
      expect(b.start).not.toEqual(a.start);
      expect(b.reference).not.toEqual(a.reference);
    }

    // M17's grammar is its own (never a decoder verb).
    expect(M17_GRAMMAR.verbs.map((v) => v.verb)).toEqual(['VEK', 'ZOR', 'KAI']);
  });

  test('criterion: first run of three ends the event; attainment stands after an early exit; twelve without attainment is censored; fewer is incomplete', () => {
    expect(
      m17Criterion([
        false,
        true,
        true,
        true,
        false,
        true,
        true,
        true,
        true,
        true,
        true,
        true,
      ]),
    ).toMatchObject({
      criterion_trial: 4,
      attained: true,
      censored: false,
      incomplete: false,
      complete_sequence: true,
    });
    expect(m17Criterion([true, true, false, true, true, true])).toMatchObject({
      criterion_trial: 6,
      attained: true,
      complete_sequence: false,
      responses: 6,
    });
    expect(m17Criterion([true, true, true])).toMatchObject({
      criterion_trial: 3,
      attained: true,
      complete_sequence: false,
    });
    expect(m17Criterion(Array<boolean>(12).fill(false))).toMatchObject({
      criterion_trial: 12,
      attained: false,
      censored: true,
      incomplete: false,
      complete_sequence: true,
    });
    expect(
      m17Criterion([
        true,
        true,
        false,
        true,
        true,
        false,
        true,
        true,
        false,
        true,
        true,
        false,
      ]),
    ).toMatchObject({ criterion_trial: 12, attained: false, censored: true });
    expect(m17Criterion([false, true])).toMatchObject({
      criterion_trial: null,
      attained: false,
      censored: false,
      incomplete: true,
      responses: 2,
    });
    expect(m17Criterion([])).toMatchObject({ incomplete: true, responses: 0 });
  });

  test('extractor: attained (trial 5) with the sequence companion apart; censored at twelve; attained then stopped keeps the event; stopped before attainment is incomplete; pending while open; never opened ≠ interrupted; a disagreeing record fails both rows', () => {
    // Attained at learning trial 5, full series.
    {
      const h = harness();

      play(h, [
        false,
        true,
        false,
        true,
        true,
        true,
        false,
        true,
        true,
        true,
        true,
        false,
      ]);

      const rows = extractItemFeatures('M17', h.events, CONTEXT);

      expect(rows[0]).toMatchObject({
        feature_id: 'm17_criterion_trial',
        value: { criterion_trial: 6, attained: true },
        numerator: 6,
        disposition: 'observed',
        censored: false,
        closure_reason: 'completed',
        independence: 'single_episode',
      });
      expect(rows[0].components).toMatchObject({
        learning_responses: 12,
        complete_sequence: true,
        recount_agrees: true,
        recorded_run_trial: 6,
      });
      expect(rows[0].included_ids).toHaveLength(6);
      expect(rows[1]).toMatchObject({
        feature_id: 'm17_sequence_baseline_transfer',
        disposition: 'observed',
      });
      expect(rows[1].value).toMatchObject({
        baseline: [false, true],
        transfer: [true, false],
        feedback_exposures: 12,
        reference_sequences_shown: 4,
        complete_sequence: true,
      });
      expect((rows[1].value as { learning: boolean[] }).learning).toHaveLength(
        12,
      );
      expect(JSON.stringify(rows)).not.toMatch(/slope|score|speed/i);
    }

    // Twelve learning trials without attainment: (12, false) censored.
    {
      const h = harness();

      play(h, [
        true,
        true,
        false,
        true,
        true,
        false,
        false,
        true,
        true,
        false,
        true,
        true,
      ]);

      const rows = extractItemFeatures('M17', h.events, CONTEXT);

      expect(rows[0]).toMatchObject({
        value: { criterion_trial: 12, attained: false },
        disposition: 'observed',
        censored: true,
        censor_reason: 'twelve learning trials without attainment',
      });
    }

    // Attained at learning trial 3, then stopped: the event stands, complete_sequence false.
    {
      const h = harness();

      play(h, [true, true, true, false], { complete: false });
      h.stopped(3);

      const rows = extractItemFeatures('M17', h.events, CONTEXT);

      expect(rows[0]).toMatchObject({
        value: { criterion_trial: 3, attained: true },
        disposition: 'observed',
        closure_reason: 'voluntary_stop',
      });
      expect(rows[0].components).toMatchObject({
        complete_sequence: false,
        learning_responses: 4,
      });
    }

    // Stopped after two learning responses without attainment: incomplete, never non-attainment.
    {
      const h = harness();

      play(h, [false, true], { complete: false });
      h.stopped(null);

      const rows = extractItemFeatures('M17', h.events, CONTEXT);

      expect(rows[0]).toMatchObject({
        value: null,
        disposition: 'incomplete',
        censored: false,
        closure_reason: 'voluntary_stop',
      });
      expect(rows[0].components).toMatchObject({
        learning_correct: [false, true],
        learning_responses: 2,
      });
      expect(rows[1].value).toMatchObject({ learning: [false, true] });
    }

    // Open with two learning responses: pending.
    {
      const h = harness();

      play(h, [false, true], { complete: false });

      const rows = extractItemFeatures('M17', h.events, OPEN_CONTEXT);

      expect(rows[0]).toMatchObject({ value: null, disposition: 'pending' });
      expect(rows[1].disposition).toBe('pending');
    }

    // Never opened: not_presented; after a reload: interrupted.
    expect(extractItemFeatures('M17', [], CONTEXT)[0]).toMatchObject({
      value: null,
      disposition: 'not_presented',
    });
    expect(
      extractItemFeatures('M17', [], { ...CONTEXT, reloaded: true })[0],
    ).toMatchObject({ disposition: 'interrupted' });

    // Opened, nothing answered, stopped: both rows incomplete (S-L5).
    {
      const h = harness();

      h.opened();
      h.stopped(null);

      const rows = extractItemFeatures('M17', h.events, CONTEXT);

      expect(rows[0]).toMatchObject({ value: null, disposition: 'incomplete' });
      expect(rows[1]).toMatchObject({ value: null, disposition: 'incomplete' });
    }

    // Open at the record closure: incomplete, not pending (S-L9).
    {
      const h = harness();

      play(h, [false, true], { complete: false });

      const rows = extractItemFeatures('M17', h.events, CONTEXT);

      expect(rows[0]).toMatchObject({ value: null, disposition: 'incomplete' });
      expect(rows[0].missing_reason).toContain('record closure');
      expect(rows[1].disposition).toBe('observed');
    }

    // A module record that disagrees with the recount fails both rows.
    {
      const h = harness();

      play(
        h,
        [
          true,
          true,
          true,
          false,
          false,
          false,
          false,
          false,
          false,
          false,
          false,
          false,
        ],
        {
          recorded: 7,
        },
      );

      const rows = extractItemFeatures('M17', h.events, CONTEXT);

      expect(rows[0].disposition).toBe('technical_failure');
      expect(rows[1].disposition).toBe('technical_failure');
      expect(rows[0].components).toMatchObject({ recount_agrees: false });
    }

    // Technical failure closes both rows.
    {
      const h = harness();

      play(h, [true], { complete: false });
      h.failed();

      const rows = extractItemFeatures('M17', h.events, CONTEXT);

      expect(rows[0].disposition).toBe('technical_failure');
      expect(rows[1].disposition).toBe('technical_failure');
    }
  });
});
