/**
 * M08 feature extractor (Unit 2): `m08_work_choice_fraction` = explicit
 * Work choices / explicit valid Work-or-Stand-by choices (six planned;
 * fewer valid ⇒ `incomplete`), plus the per-benefit-level fractions as a
 * companion. Read-only over the raw `proto_m08_effort_*` events; a slot
 * without an explicit choice is never counted as Rest.
 */
import { registerEntry } from '../registerV3';
import {
  absentFeature,
  currentLoadEvents,
  emptyFeature,
  eventsOfType,
  fractionFeature,
  meta,
  observedFeature,
  registerFeatureExtractor,
  sequencesOf,
} from './extract';
import type { FeatureRecord } from './types';

interface M08Raw {
  work_choices: number;
  valid_choices: number;
  by_benefit: Record<'1' | '3', { work: number; valid: number }>;
  practice: { correct: number; total: number; passed: boolean };
  work_demand: { items_sorted: number; items_correct: number };
  closure_reason: string;
}

registerFeatureExtractor('M08', (events, context) => {
  const entry = registerEntry('M08');
  const [primary, byBenefit] = entry.features;
  const load = currentLoadEvents(events, context);
  const opened = eventsOfType(load, 'proto_m08_effort_opportunity_opened');
  const closed = eventsOfType(load, 'proto_m08_effort_window_closed');
  const family = load.filter((e) =>
    e.event_type.startsWith('proto_m08_effort_'),
  );
  const supporting = sequencesOf(family);

  if (opened.length === 0) {
    return [
      absentFeature('M08', primary, context, 'support console never opened'),
      absentFeature('M08', byBenefit, context, 'support console never opened'),
    ];
  }

  const last = closed[closed.length - 1];
  const raw =
    meta<M08Raw>(last, 'raw_components') ??
    meta<M08Raw>(last, 'raw_components_partial') ??
    null;
  const exit = last === undefined ? null : meta<string>(last, 'exit_state');

  if (raw === null) {
    const pending: FeatureRecord[] = [
      emptyFeature('M08', primary, 'pending', 'console open, no closure yet', {
        supporting_sequences: supporting,
      }),
      emptyFeature('M08', byBenefit, 'pending', 'console open, no closure yet'),
    ];

    return pending;
  }

  const closure =
    exit === 'closed_at_review'
      ? 'closed_at_review'
      : raw.closure_reason === 'voluntary_stop'
        ? 'voluntary_stop'
        : 'completed';
  const rows: FeatureRecord[] = [
    fractionFeature(
      'M08',
      primary,
      raw.work_choices,
      raw.valid_choices,
      Array.from({ length: raw.valid_choices }, (_, i) => `m08_valid_${i + 1}`),
      supporting,
      {
        // Opened but never chose: the console was left (or the review
        // reached) before any explicit choice — a voluntary stop with no
        // valid observation, never a zero and never Rest.
        disposition: 'voluntary_stop',
        reason:
          exit === 'closed_at_review'
            ? 'closed at the review before any explicit choice'
            : 'console left before any explicit choice',
      },
      {
        closure_reason: closure,
        censored: exit === 'closed_at_review',
        censor_reason: exit === 'closed_at_review' ? 'review reached' : null,
        components: {
          practice: raw.practice,
          work_demand: raw.work_demand,
          missing_choices: 6 - raw.valid_choices,
        },
      },
    ),
    observedFeature(
      'M08',
      byBenefit,
      {
        benefit_1: raw.by_benefit['1'],
        benefit_3: raw.by_benefit['3'],
      },
      { closure_reason: closure, supporting_sequences: supporting },
    ),
  ];

  return rows;
});
