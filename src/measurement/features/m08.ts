/**
 * M08 feature extractor (Unit 2 / U2-R): `m08_work_choice_fraction` =
 * explicit Work choices / explicit valid Work-or-Stand-by choices (six
 * planned; fewer valid ⇒ `incomplete`), plus the per-benefit-level
 * fractions as a companion. Read-only over the raw `proto_m08_effort_*`
 * events; a slot without an explicit choice is never counted as Rest; a
 * companion with no valid choice is null with the primary's disposition,
 * and one with fewer than three valid choices at a level is `incomplete`.
 *
 * Reload (U24 RL-1, `RELOAD-CORRECTION-SPEC-r3-exec.md` §2 and §5): the
 * load's `prior_load_checked` record classifies the console H / A / U /
 * M; with its absence of an earlier opening established (A) a load with
 * no console evidence takes the first-load reading. The record is never
 * task evidence.
 */
import { m08PriorAdministration } from '../../pilot/exterior/m08EffortModel';
import { registerEntry } from '../registerV3';
import {
  classifyReload,
  computePriorLoadCheck,
  PRIOR_LOAD_CHECK_SUFFIX,
  type PriorLoadCheck,
  type ReloadClassification,
  type ReloadEvent,
  type ReloadHistoryIntegrity,
  reloadHoldBackClass,
  withoutPriorLoadChecks,
} from '../reloadCheck';
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

const FAMILY = 'proto_m08_effort_';

/**
 * The load's reload check (U24 RL-1; r1 §1 stage map): stage 1 the
 * console listed in the yard briefing (`presented`), no stage 2, stage 3
 * the opening (`opportunity_opened`, the guard's own record), and the
 * console's hold-back markers. Null on a first load.
 */
export function m08PriorLoadCheck(
  pageLoadIndex: number,
  priorLoadEvents: readonly ReloadEvent[],
  integrity: ReloadHistoryIntegrity,
): PriorLoadCheck | null {
  return computePriorLoadCheck({
    pageLoadIndex,
    priorLoadEvents,
    integrity,
    stages: {
      briefing: (event) => event.event_type === `${FAMILY}presented`,
      opening: (event) => m08PriorAdministration([event]),
      holdBack: (event) => event.event_type === `${FAMILY}technical_failure`,
    },
  });
}

/** The console's class from the load's check records (r3 §2). */
export function classifyM08Reload(
  pageLoadIndex: number,
  checks: readonly object[],
): ReloadClassification {
  return classifyReload({ pageLoadIndex, checks });
}

/** The current-load reason of a held console, by its marker's class. */
const HELD_REASON = {
  H: 'console administered in an earlier page load; not re-run after the reload',
  U: 'console not administered after a reload: earlier history not verified',
  M: 'console not administered after a reload: earlier check contradictory',
} as const;

registerFeatureExtractor('M08', (events, context) => {
  const entry = registerEntry('M08');
  const [primary, byBenefit] = entry.features;
  const load = currentLoadEvents(events, context);
  const presented = eventsOfType(load, `${FAMILY}presented`);
  const opened = eventsOfType(load, `${FAMILY}opportunity_opened`);
  const closed = eventsOfType(load, `${FAMILY}window_closed`);
  const heldBack = eventsOfType(load, `${FAMILY}technical_failure`);
  const family = withoutPriorLoadChecks(
    load.filter((e) => e.event_type.startsWith(FAMILY)),
    FAMILY,
  );
  const supporting = sequencesOf(family);
  const reload = classifyM08Reload(
    context.pageLoadIndex,
    eventsOfType(load, `${FAMILY}${PRIOR_LOAD_CHECK_SUFFIX}`).map(
      (event) => event.metadata ?? {},
    ),
  );

  // A malformed check record stays under the existing rule (r3 §2;
  // §5.290 (a)): a technical failure, never uncertain history.
  if (reload.check_malformed) {
    const reason = 'a reload check record describes another page load';

    return [
      emptyFeature('M08', primary, 'technical_failure', reason, {
        closure_reason: 'technical_failure',
        supporting_sequences: supporting,
      }),
      emptyFeature('M08', byBenefit, 'technical_failure', reason, {
        closure_reason: 'technical_failure',
      }),
    ];
  }

  if (opened.length === 0) {
    // The reload guard held the console (an earlier administration, or an
    // earlier state not verified): the evidence lies in
    // `prior_page_load_events`. A reloaded load whose check does not
    // establish the absence of an earlier opening holds it too (U24 RL-1).
    const held = (
      heldBack.length > 0
        ? heldBack.map(
            (event) =>
              reloadHoldBackClass(meta<unknown>(event, 'detail')) ?? 'H',
          )
        : context.reloaded &&
            reload.check_count > 0 &&
            reload.occasions.row.class !== 'A'
          ? [reload.occasions.row.class ?? 'U']
          : []
    ) as ('H' | 'U' | 'M')[];

    if (held.length > 0) {
      const reason = [...new Set(held.map((cls) => HELD_REASON[cls]))].join(
        '; ',
      );

      return [
        emptyFeature('M08', primary, 'interrupted', reason, {
          supporting_sequences: supporting,
        }),
        emptyFeature('M08', byBenefit, 'interrupted', reason),
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

    // An established absence takes the first-load reading (r3 §5, the
    // single-occasion rule).
    if (reload.occasions.row.class === 'A') {
      const reason = 'support console never opened';

      return [
        emptyFeature('M08', primary, 'not_presented', reason, {
          supporting_sequences: supporting,
        }),
        emptyFeature('M08', byBenefit, 'not_presented', reason),
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
