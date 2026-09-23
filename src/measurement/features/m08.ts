/**
 * M08 feature extractor (Unit 2 / U2-R): `m08_work_choice_fraction` =
 * explicit Work choices / explicit valid Work-or-Stand-by choices (six
 * planned; fewer valid ⇒ `incomplete`), plus the per-benefit-level
 * fractions as a companion. Read-only over the raw `proto_m08_effort_*`
 * events; a slot without an explicit choice is never counted as Rest; a
 * companion with no valid choice is null with the primary's disposition,
 * and one with fewer than three valid choices at a level is `incomplete`.
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
import type { FeatureDisposition, FeatureRecord } from './types';

interface M08RawEpoch {
  epoch: number;
  benefit_units: 1 | 3;
  choice: 'work' | 'rest' | null;
  valid: boolean;
  served: boolean | null;
  items_sorted: number;
  completed: boolean;
}

interface M08Raw {
  work_choices: number;
  valid_choices: number;
  epochs?: M08RawEpoch[];
  by_benefit: Record<'1' | '3', { work: number; valid: number }>;
  practice: { correct: number; total: number; completed?: boolean };
  work_demand: { items_sorted: number; items_correct: number };
  served_work_slots?: number;
  unserved_work_slots?: number;
  closure_reason: string;
}

const PLANNED_PER_LEVEL = 3;

registerFeatureExtractor('M08', (events, context) => {
  const entry = registerEntry('M08');
  const [primary, byBenefit] = entry.features;
  const load = currentLoadEvents(events, context);
  const presented = eventsOfType(load, 'proto_m08_effort_presented');
  const opened = eventsOfType(load, 'proto_m08_effort_opportunity_opened');
  const closed = eventsOfType(load, 'proto_m08_effort_window_closed');
  const heldBack = eventsOfType(load, 'proto_m08_effort_technical_failure');
  const family = load.filter((e) =>
    e.event_type.startsWith('proto_m08_effort_'),
  );
  const supporting = sequencesOf(family);

  if (opened.length === 0) {
    // The reload guard refused to re-run a console administered in an
    // earlier page load: the evidence lies in `prior_page_load_events`.
    if (heldBack.length > 0) {
      return [
        emptyFeature(
          'M08',
          primary,
          'interrupted',
          'console administered in an earlier page load; not re-run after the reload',
          { supporting_sequences: supporting },
        ),
        emptyFeature(
          'M08',
          byBenefit,
          'interrupted',
          'console administered in an earlier page load; not re-run after the reload',
        ),
      ];
    }

    // Listed in Noor's briefing (presented) but never approached: the
    // participant declined an accessible opportunity — distinct from a
    // console that was never presented (briefing never reached) and from
    // a reload whose evidence lies in an earlier page load (interrupted).
    if (presented.length > 0) {
      return [
        emptyFeature(
          'M08',
          primary,
          'declined',
          'console listed in the yard briefing, never opened',
          { supporting_sequences: supporting },
        ),
        emptyFeature(
          'M08',
          byBenefit,
          'declined',
          'console listed in the yard briefing, never opened',
        ),
      ];
    }

    return [
      absentFeature('M08', primary, context, 'support console never opened', {
        supporting_sequences: supporting,
      }),
      absentFeature('M08', byBenefit, context, 'support console never opened'),
    ];
  }

  const last = closed[closed.length - 1];
  const raw =
    last === undefined
      ? null
      : (meta<M08Raw>(last, 'raw_components') ??
        meta<M08Raw>(last, 'raw_components_partial') ??
        null);
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
  const validSlotIds = (raw.epochs ?? [])
    .filter((epoch) => epoch.valid)
    .map((epoch) => `m08_slot_${epoch.epoch}`);
  const includedIds =
    validSlotIds.length === raw.valid_choices
      ? validSlotIds
      : Array.from(
          { length: raw.valid_choices },
          (_, i) => `m08_valid_${i + 1}`,
        );
  // Opened but never chose: the console was left (or the review reached)
  // before any explicit choice — a voluntary stop with no valid
  // observation, never a zero and never Rest.
  const zeroDenominator: {
    disposition: Exclude<FeatureDisposition, 'observed' | 'incomplete'>;
    reason: string;
  } = {
    disposition: 'voluntary_stop',
    reason:
      exit === 'closed_at_review'
        ? 'closed at the review before any explicit choice'
        : 'console left before any explicit choice',
  };
  const shared = {
    closure_reason: closure,
    censored: exit === 'closed_at_review',
    censor_reason: exit === 'closed_at_review' ? 'review reached' : null,
  } as const;
  const rows: FeatureRecord[] = [
    fractionFeature(
      'M08',
      primary,
      raw.work_choices,
      raw.valid_choices,
      includedIds,
      supporting,
      zeroDenominator,
      {
        ...shared,
        components: {
          practice: raw.practice,
          work_demand: raw.work_demand,
          served_work_slots: raw.served_work_slots ?? null,
          unserved_work_slots: raw.unserved_work_slots ?? null,
          missing_choices: 6 - raw.valid_choices,
        },
      },
    ),
  ];

  if (raw.valid_choices <= 0) {
    rows.push(
      emptyFeature(
        'M08',
        byBenefit,
        zeroDenominator.disposition,
        zeroDenominator.reason,
        {
          ...shared,
          denominator: 0,
          supporting_sequences: supporting,
        },
      ),
    );
  } else {
    const level1 = raw.by_benefit['1'];
    const level3 = raw.by_benefit['3'];
    const partial =
      level1.valid < PLANNED_PER_LEVEL || level3.valid < PLANNED_PER_LEVEL;

    rows.push(
      observedFeature(
        'M08',
        byBenefit,
        { benefit_1: level1, benefit_3: level3 },
        {
          ...shared,
          disposition: partial ? 'incomplete' : 'observed',
          denominator: raw.valid_choices,
          included_ids: includedIds,
          supporting_sequences: supporting,
        },
      ),
    );
  }

  return rows;
});
