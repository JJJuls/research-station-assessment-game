/**
 * M17 feature extractor (Unit 9): `m17_criterion_trial` = the criterion
 * event {criterion_trial, attained} — the first LEARNING trial ending a
 * run of three consecutive correct first responses, recounted from the
 * `proto_m17_trials_trial_submitted` events alone (a module record that
 * disagrees ⇒ `technical_failure`); attained within the administered
 * trials ⇒ observed even after an early exit (`complete_sequence` false);
 * twelve learning responses without attainment ⇒ (12, false) observed and
 * censored; fewer without attainment ⇒ `incomplete` (null value, the
 * partial sequence exported). Companion `m17_sequence_baseline_transfer`:
 * the per-phase first-response sequences with feedback exposure and help
 * — null when no trial was answered. Read-only over the raw events; no
 * slope, no speed, no combined score.
 */
import { m17Criterion } from '../../informationProcessing/syntaxForms';
import { PILOT_SETTINGS } from '../protocol';
import { registerEntry } from '../registerV3';
import {
  absentFeature,
  currentLoadEvents,
  emptyFeature,
  eventsOfType,
  meta,
  observedFeature,
  registerFeatureExtractor,
  sequencesOf,
} from './extract';
import type { FeatureRecord } from './types';

const FAMILY = 'proto_m17_trials_';

interface TrialMeta {
  trial_index: number;
  phase: 'baseline' | 'learning' | 'transfer';
  phase_index: number;
  goal_reached: boolean;
  commands_correct: number;
  semantic_errors: number;
  syntax_errors: number;
  corrections_before_submission: number;
  feedback_presented: boolean;
  help_consults: number;
  demonstration_reviews: number;
  active_ms: number;
  input_mode: string | null;
}

registerFeatureExtractor('M17', (events, context) => {
  const entry = registerEntry('M17');
  const [primary, companion] = entry.features;
  const load = currentLoadEvents(events, context);
  const family = load.filter((e) => e.event_type.startsWith(FAMILY));
  const supporting = sequencesOf(family);
  const opened = eventsOfType(load, `${FAMILY}window_opened`);
  const submitted = eventsOfType(load, `${FAMILY}trial_submitted`);
  const completed = eventsOfType(load, `${FAMILY}completed`);
  const stopped = eventsOfType(load, `${FAMILY}stopped`);
  const failed = eventsOfType(load, `${FAMILY}technical_failure`);
  const runReached = eventsOfType(load, `${FAMILY}criterion_run_reached`);

  if (opened.length === 0) {
    return [
      absentFeature('M17', primary, context, 'training rig never opened', {
        supporting_sequences: supporting,
      }),
      absentFeature('M17', companion, context, 'training rig never opened'),
    ];
  }

  // First response per trial index (a trial is submitted once; a repeat
  // would be a module fault, so the first record stands).
  const byIndex = new Map<number, TrialMeta>();
  let malformed = 0;

  for (const event of submitted) {
    const index = meta<number>(event, 'trial_index');
    const phaseName = meta<string>(event, 'phase');
    const goalReached = meta<unknown>(event, 'goal_reached');

    // A record without its phase or outcome is never read as a wrong
    // learning response (review S-L3): it fails the item instead.
    if (
      index === undefined ||
      (phaseName !== 'baseline' &&
        phaseName !== 'learning' &&
        phaseName !== 'transfer') ||
      typeof goalReached !== 'boolean'
    ) {
      malformed += 1;
      continue;
    }

    if (!byIndex.has(index)) {
      byIndex.set(index, {
        trial_index: index,
        phase: phaseName,
        phase_index: meta<number>(event, 'phase_index') ?? 0,
        goal_reached: goalReached,
        commands_correct: meta<number>(event, 'commands_correct') ?? 0,
        semantic_errors: meta<number>(event, 'semantic_errors') ?? 0,
        syntax_errors: meta<number>(event, 'syntax_errors') ?? 0,
        corrections_before_submission:
          meta<number>(event, 'corrections_before_submission') ?? 0,
        feedback_presented: meta<boolean>(event, 'feedback_presented') ?? false,
        help_consults: meta<number>(event, 'help_consults') ?? 0,
        demonstration_reviews:
          meta<number>(event, 'demonstration_reviews') ?? 0,
        active_ms: meta<number>(event, 'active_ms') ?? 0,
        input_mode: meta<string | null>(event, 'input_mode') ?? null,
      });
    }
  }

  const trials = [...byIndex.values()].sort(
    (a, b) => a.trial_index - b.trial_index,
  );
  const phase = (name: TrialMeta['phase']) =>
    trials
      .filter((t) => t.phase === name)
      .sort((a, b) => a.phase_index - b.phase_index);
  const baseline = phase('baseline');
  const learning = phase('learning');
  const transfer = phase('transfer');
  const criterion = m17Criterion(
    learning.map((t) => t.goal_reached),
    PILOT_SETTINGS.m17_learning_trials,
    PILOT_SETTINGS.m17_criterion_run,
  );
  const terminal =
    completed.length > 0
      ? 'completed'
      : failed.length > 0
        ? 'technical_failure'
        : stopped.length > 0
          ? 'stopped'
          : null;
  const summary =
    completed[0]?.metadata ?? stopped[0]?.metadata ?? failed[0]?.metadata;
  const recordedRun =
    (summary?.criterion_run_trial as number | null | undefined) ??
    (runReached.length > 0
      ? (meta<number>(runReached[0], 'learning_trial') ?? null)
      : null);
  const recountAgrees =
    recordedRun === undefined || recordedRun === null
      ? !criterion.attained || terminal === null
      : recordedRun === criterion.criterion_trial && criterion.attained;
  const closureReason =
    terminal === 'completed'
      ? ('completed' as const)
      : terminal === 'stopped'
        ? ('voluntary_stop' as const)
        : terminal === 'technical_failure'
          ? ('technical_failure' as const)
          : null;
  const components = {
    malformed_records: malformed,
    baseline_correct: baseline.map((t) => t.goal_reached),
    learning_correct: learning.map((t) => t.goal_reached),
    transfer_correct: transfer.map((t) => t.goal_reached),
    learning_responses: learning.length,
    learning_trials_planned: PILOT_SETTINGS.m17_learning_trials,
    criterion_run: PILOT_SETTINGS.m17_criterion_run,
    complete_sequence:
      trials.length >=
      PILOT_SETTINGS.m17_baseline_trials +
        PILOT_SETTINGS.m17_learning_trials +
        PILOT_SETTINGS.m17_transfer_trials,
    terminal,
    recorded_run_trial: recordedRun ?? null,
    recount_agrees: recountAgrees,
  };
  const companionValue =
    trials.length === 0
      ? null
      : {
          baseline: baseline.map((t) => t.goal_reached),
          learning: learning.map((t) => t.goal_reached),
          transfer: transfer.map((t) => t.goal_reached),
          feedback_exposures: learning.filter((t) => t.feedback_presented)
            .length,
          // A miss shows the reference sequence; a hit does not (S-M5).
          reference_sequences_shown: learning.filter(
            (t) => t.feedback_presented && !t.goal_reached,
          ).length,
          complete_sequence: components.complete_sequence,
          help_consults: trials.reduce((sum, t) => sum + t.help_consults, 0),
          demonstration_reviews: trials.reduce(
            (sum, t) => sum + t.demonstration_reviews,
            0,
          ),
          trials: trials.map((t) => ({ ...t })),
        };

  if (terminal === 'technical_failure' || malformed > 0) {
    const reason =
      malformed > 0
        ? `${malformed} trial record(s) without phase or outcome`
        : 'technical failure closed the training rig';

    return [
      emptyFeature('M17', primary, 'technical_failure', reason, {
        closure_reason: closureReason,
        supporting_sequences: supporting,
        components,
      }),
      emptyFeature('M17', companion, 'technical_failure', reason, {
        closure_reason: closureReason,
      }),
    ];
  }

  if (terminal !== null && !recountAgrees) {
    const reason = 'module record disagrees with the trial_submitted recount';

    return [
      emptyFeature('M17', primary, 'technical_failure', reason, {
        closure_reason: closureReason,
        supporting_sequences: supporting,
        components,
      }),
      emptyFeature('M17', companion, 'technical_failure', reason, {
        closure_reason: closureReason,
      }),
    ];
  }

  // An open series at the record closure is cut short, not pending (S-L9).
  const openAtClosure = terminal === null && context.finalCoreClosed;
  const companionRow =
    companionValue === null
      ? {
          ...emptyFeature(
            'M17',
            companion,
            terminal === null && !openAtClosure ? 'pending' : 'interrupted',
            openAtClosure
              ? 'series left open at the record closure'
              : 'no trial answered',
            {
              closure_reason: closureReason,
              supporting_sequences: supporting,
            },
          ),
          ...(terminal === null && !openAtClosure
            ? {}
            : { disposition: 'incomplete' as const }),
        }
      : observedFeature('M17', companion, companionValue, {
          closure_reason: closureReason,
          supporting_sequences: supporting,
          ...(terminal === null && !openAtClosure
            ? { disposition: 'pending' as const }
            : {}),
        });

  if (criterion.attained) {
    return [
      observedFeature(
        'M17',
        primary,
        { criterion_trial: criterion.criterion_trial, attained: true },
        {
          numerator: criterion.criterion_trial,
          closure_reason: closureReason,
          censored: false,
          supporting_sequences: supporting,
          components: {
            ...components,
            complete_sequence: components.complete_sequence,
          },
          included_ids: learning
            .slice(0, criterion.criterion_trial ?? 0)
            .map((t) => `m17_learning_${t.phase_index}`),
          ...(terminal === null ? { disposition: 'pending' as const } : {}),
        },
      ),
      companionRow,
    ] satisfies FeatureRecord[];
  }

  if (criterion.censored) {
    return [
      observedFeature(
        'M17',
        primary,
        { criterion_trial: criterion.criterion_trial, attained: false },
        {
          numerator: criterion.criterion_trial,
          closure_reason: closureReason,
          censored: true,
          censor_reason: 'twelve learning trials without attainment',
          supporting_sequences: supporting,
          components,
          included_ids: learning.map((t) => `m17_learning_${t.phase_index}`),
          ...(terminal === null ? { disposition: 'pending' as const } : {}),
        },
      ),
      companionRow,
    ];
  }

  // Fewer than twelve learning responses without attainment: incomplete —
  // never non-attainment, and never the (12, false) censoring flag (S-M4).
  const pending = terminal === null && !openAtClosure;
  const reason = pending
    ? 'the learning series is still open'
    : openAtClosure
      ? `series left open at the record closure after ${learning.length} learning responses without attainment`
      : `early exit after ${learning.length} learning responses without attainment`;

  return [
    {
      ...emptyFeature(
        'M17',
        primary,
        pending ? 'pending' : 'interrupted',
        reason,
        {
          closure_reason: closureReason,
          censored: false,
          censor_reason: null,
          supporting_sequences: supporting,
          components,
          included_ids: learning.map((t) => `m17_learning_${t.phase_index}`),
        },
      ),
      disposition: pending ? ('pending' as const) : ('incomplete' as const),
    },
    companionRow,
  ];
});
