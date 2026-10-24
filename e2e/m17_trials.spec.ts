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
import {
  classifyM17Reload,
  m17PriorLoadCheck,
} from '../src/measurement/features/m17';
import { PILOT_SETTINGS } from '../src/measurement/protocol';
import { registerEntry } from '../src/measurement/registerV3';
import {
  classifyReload,
  computePriorLoadCheck,
  RELOAD_HOLD_BACK_PREFIX,
  type ReloadEvent,
} from '../src/measurement/reloadCheck';
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

/* ------------------------------------------------------------------ *
 * U24 RL-3 — the training rig's reload check (pure)
 *
 * Expected values come from RELOAD-CORRECTION-SPEC-r3-exec.md §2 (classes,
 * permission, the H / U / M readings), §5 (single-occasion rows: under A
 * the first-load reading) and r1 §1's stage map (no stage 1 or 2; stage 3
 * `window_opened`); records from RL-0's helper with that map written here.
 * ------------------------------------------------------------------ */

const RL3_CONTINUOUS = {
  first_sequence: 1,
  sequence_gap_count: 0,
  sequence_duplicate_count: 0,
  recovered_from_chunks: false,
};
const RL3_STAGES = {
  opening: (event: ReloadEvent) =>
    event.event_type === `${FAMILY}window_opened`,
  holdBack: (event: ReloadEvent) =>
    event.event_type === `${FAMILY}technical_failure`,
};
const RL3_DETAIL = {
  H: `${RELOAD_HOLD_BACK_PREFIX.H}: training rig not re-run`,
  U: `${RELOAD_HOLD_BACK_PREFIX.U}: training rig not administered`,
  M: `${RELOAD_HOLD_BACK_PREFIX.M}: training rig not administered`,
} as const;

function rl3Number(
  events: readonly RawGameEvent[],
  load: number,
  from: number,
) {
  return events.map((event, i) => ({
    ...event,
    page_load_index: load,
    sequence: from + i,
  }));
}

/** Load 1: the session start, the rig opened (or not). */
function rl3Prior(opened: boolean): RawGameEvent[] {
  const h = harness();

  h.events.push({
    session_id: 's',
    timestamp_ms: 0,
    scene: 'dock',
    event_type: 'session_start',
    metadata: {},
  });

  if (opened) {
    play(h, [true, true, true]);
  }

  return rl3Number(h.events, 1, 1);
}

/** Load 2 as the runtime writes it: the record at the declaration, the marker when not A, then `after`. */
function rl3Load(
  prior: RawGameEvent[],
  options: {
    integrity?: typeof RL3_CONTINUOUS;
    records?: (record: Record<string, unknown>) => object[];
    after?: (h: ReturnType<typeof harness>) => void;
  } = {},
) {
  const record = computePriorLoadCheck({
    pageLoadIndex: 2,
    priorLoadEvents: prior,
    integrity: options.integrity ?? RL3_CONTINUOUS,
    stages: RL3_STAGES,
  }) as unknown as Record<string, unknown>;
  const records = options.records?.(record) ?? [record];
  const reload = classifyReload({ pageLoadIndex: 2, checks: records });
  const cls = reload.occasions.row.class;
  const h = harness();
  const events: RawGameEvent[] = records.map((r) => ({
    session_id: 's',
    timestamp_ms: 0,
    scene: 'diagnostics_laboratory',
    event_type: `${FAMILY}prior_load_checked`,
    metadata: { ...r, input_mode: 'system' },
  }));

  if (cls !== 'A') {
    events.push({
      session_id: 's',
      timestamp_ms: 0,
      scene: 'diagnostics_laboratory',
      event_type: `${FAMILY}technical_failure`,
      metadata: { detail: RL3_DETAIL[cls ?? 'U'], input_mode: 'system' },
    });
  } else {
    options.after?.(h);
  }

  const current = rl3Number([...events, ...h.events], 2, prior.length + 1);
  const rows = extractItemFeatures('M17', [...prior, ...current], {
    finalCoreClosed: true,
    pageLoadIndex: 2,
    reloaded: true,
  });

  return { record, reload, rows, current };
}

const rl3Class = (reload: ReturnType<typeof classifyReload>) => [
  reload.occasions.row.class,
  reload.occasions.row.administration_permitted,
];

test.describe('M17 the reload check (U24 RL-3, pure)', () => {
  test('the extractor’s stage map is r1 §1’s; a first load writes none; the same classes', () => {
    for (const opened of [true, false]) {
      const prior = rl3Prior(opened);
      const record = computePriorLoadCheck({
        pageLoadIndex: 2,
        priorLoadEvents: prior,
        integrity: RL3_CONTINUOUS,
        stages: RL3_STAGES,
      });

      expect(m17PriorLoadCheck(2, prior, RL3_CONTINUOUS)).toEqual(record);
      expect(classifyM17Reload(2, [record!])).toEqual(
        classifyReload({ pageLoadIndex: 2, checks: [record!] }),
      );
    }

    expect(m17PriorLoadCheck(1, [], RL3_CONTINUOUS)).toBeNull();
  });

  test('H: a rig opened earlier is held — refused, both rows interrupted with the H reason, nothing administered', () => {
    const h = rl3Load(rl3Prior(true));

    expect(rl3Class(h.reload)).toEqual(['H', false]);
    expect(h.rows.map((row) => [row.disposition, row.value])).toEqual([
      ['interrupted', null],
      ['interrupted', null],
    ]);
    expect(h.rows[0].missing_reason).toBe(
      'training rig opened in an earlier page load; not re-run after the reload',
    );
  });

  test('A: an established absence takes the first-load readings — not_presented with no rig evidence, and an ordinary administration after the check', () => {
    const prior = rl3Prior(false);
    const nop = rl3Load(prior);

    expect(rl3Class(nop.reload)).toEqual(['A', true]);
    expect(
      nop.rows.map((row) => [row.disposition, row.missing_reason]),
    ).toEqual([
      ['not_presented', 'training rig never opened'],
      ['not_presented', 'training rig never opened'],
    ]);

    const run = rl3Load(prior, {
      after: (h) => play(h, [true, true, true]),
    });

    expect(run.rows[0]).toMatchObject({
      disposition: 'observed',
      value: { criterion_trial: 3, attained: true },
    });
    expect(run.rows[0].supporting_sequences).not.toContain(
      run.current[0].sequence,
    );
  });

  test('U and M: an unverified history or a contradictory record holds the rig — refused, interrupted with its reason; a malformed record is a technical failure; without a check an unreached rig keeps its reading', () => {
    const prior = rl3Prior(false);
    const u = rl3Load(prior, {
      integrity: { ...RL3_CONTINUOUS, recovered_from_chunks: true },
    });

    expect(rl3Class(u.reload)).toEqual(['U', false]);
    expect(u.rows[0].missing_reason).toBe(
      'training rig not administered after a reload: earlier history not verified',
    );

    const m = rl3Load(prior, {
      records: (record) => [{ ...record, history_continuous: false }],
    });

    expect(rl3Class(m.reload)).toEqual(['M', false]);
    expect(m.rows[1]).toMatchObject({
      disposition: 'interrupted',
      missing_reason:
        'training rig not administered after a reload: earlier check contradictory',
    });

    const malformed = rl3Load(prior, {
      records: (record) => [{ ...record, page_load_index: 3 }],
    });

    expect(malformed.rows.map((row) => row.disposition)).toEqual([
      'technical_failure',
      'technical_failure',
    ]);
    expect(
      extractItemFeatures('M17', prior, {
        finalCoreClosed: true,
        pageLoadIndex: 2,
        reloaded: true,
      })[0],
    ).toMatchObject({
      disposition: 'interrupted',
      missing_reason:
        'no current-load evidence after a reload: training rig never opened',
    });
  });
});
