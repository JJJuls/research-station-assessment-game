/**
 * M01 feature extractor (Unit 5): `m01_planned_jobs` = cards on the
 * optional sequence board at the first work action, summed over the
 * occasions whose first work action closed their observation / 6 (three
 * per occasion; a planned-observations denominator — fewer than six ⇒
 * `incomplete`), plus `m01_plan_structure` (per occasion: plan order,
 * dependency violations of the plan, adherence of the executed order,
 * dependency errors during work, jobs done). Read-only over the raw
 * `proto_m01_batch_*` events. A valid choice not to plan is an observed
 * zero for that occasion; a batch left before any job press, a batch
 * never opened and a reload are never zeros.
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

type Occasion = 'o1' | 'o2';

interface M01Raw {
  occasion: Occasion;
  form: string;
  observed: boolean;
  planned_jobs: number | null;
  plan_order: string[] | null;
  plan_dependency_violations: { job_id: string; requires: string }[] | null;
  plan_dependency_violation_count: number | null;
  board_final: (string | null)[];
  placements: number;
  execution_order: string[];
  jobs_done: number;
  all_done: boolean;
  plan_adherence: number | null;
  dependency_errors: { job_id: string; requires: string }[];
  dependency_error_count: number;
  closure_reason: string;
}

const OCCASIONS: readonly Occasion[] = ['o1', 'o2'];
const JOBS_PER_OCCASION = 3;

type Missing = Exclude<FeatureDisposition, 'observed' | 'incomplete'>;

registerFeatureExtractor('M01', (events, context) => {
  const entry = registerEntry('M01');
  const [primary, structure] = entry.features;
  const load = currentLoadEvents(events, context);
  const family = load.filter((e) =>
    e.event_type.startsWith('proto_m01_batch_'),
  );
  const supporting = sequencesOf(family);
  const occ = (event: { metadata?: Record<string, unknown> }) =>
    meta<string>(event as never, 'occasion');
  const presented = eventsOfType(load, 'proto_m01_batch_presented');
  const opened = eventsOfType(load, 'proto_m01_batch_opportunity_opened');
  const closed = eventsOfType(load, 'proto_m01_batch_window_closed');
  const heldBack = eventsOfType(load, 'proto_m01_batch_technical_failure');
  const snapshots = eventsOfType(load, 'proto_m01_batch_plan_snapshot');

  const presentedSet = new Set(presented.map(occ));
  const openedSet = new Set(opened.map(occ));
  // Held back: the reload guard's marker, OR — after a reload — an
  // occasion with no current-load evidence at all (its evidence may lie
  // in an earlier page load; review U5 F5): never `not presented`.
  const heldBackSet = new Set([
    ...heldBack.map(occ),
    ...(context.reloaded
      ? OCCASIONS.filter(
          (occasion) => !presentedSet.has(occasion) && !openedSet.has(occasion),
        )
      : []),
  ]);

  if (opened.length === 0) {
    if (heldBack.length > 0) {
      const reason =
        'batch opened in an earlier page load; not re-run after the reload';

      return [
        emptyFeature('M01', primary, 'interrupted', reason, {
          supporting_sequences: supporting,
        }),
        emptyFeature('M01', structure, 'interrupted', reason),
      ];
    }

    if (presented.length > 0) {
      const reason = 'batch named on the route, never opened';

      return [
        emptyFeature('M01', primary, 'declined', reason, {
          supporting_sequences: supporting,
        }),
        emptyFeature('M01', structure, 'declined', reason),
      ];
    }

    return [
      absentFeature('M01', primary, context, 'no batch opened', {
        supporting_sequences: supporting,
      }),
      absentFeature('M01', structure, context, 'no batch opened'),
    ];
  }

  // Latest closure per occasion.
  const rawByOccasion: Partial<Record<Occasion, M01Raw>> = {};
  const exitByOccasion: Partial<Record<Occasion, string>> = {};

  for (const event of closed) {
    const raw =
      meta<M01Raw>(event, 'raw_components') ??
      meta<M01Raw>(event, 'raw_components_partial');
    const occasion = occ(event);

    if (raw === undefined || (occasion !== 'o1' && occasion !== 'o2')) {
      continue;
    }

    rawByOccasion[occasion] = raw;
    exitByOccasion[occasion] = meta<string>(event, 'exit_state') ?? 'unknown';
  }

  // Cross-check: the snapshot event of each observed occasion must agree
  // with the closure's planned count.
  const snapshotPlanned = (occasion: Occasion) => {
    const event = snapshots.find((candidate) => occ(candidate) === occasion);

    return event === undefined
      ? null
      : (meta<number>(event, 'planned_jobs') ?? null);
  };

  const observed = OCCASIONS.filter((occasion) => {
    const raw = rawByOccasion[occasion];

    return raw !== undefined && raw.observed && raw.planned_jobs !== null;
  });
  const openNoClosure = OCCASIONS.filter(
    (occasion) =>
      openedSet.has(occasion) && rawByOccasion[occasion] === undefined,
  );
  const perOccasion = (occasion: Occasion): Record<string, unknown> | null => {
    const raw = rawByOccasion[occasion];

    if (raw !== undefined) {
      return {
        occasion,
        form: raw.form,
        observed: raw.observed,
        planned_jobs: raw.planned_jobs,
        plan_order: raw.plan_order,
        plan_dependency_violations: raw.plan_dependency_violations,
        plan_adherence: raw.plan_adherence,
        execution_order: raw.execution_order,
        jobs_done: raw.jobs_done,
        all_done: raw.all_done,
        dependency_errors: raw.dependency_errors,
        placements: raw.placements,
        snapshot_event_planned_jobs: snapshotPlanned(occasion),
        closure_reason:
          exitByOccasion[occasion] === 'closed_at_review'
            ? 'closed_at_review'
            : raw.closure_reason,
      };
    }

    if (heldBackSet.has(occasion)) {
      return { occasion, interrupted: true };
    }

    if (openedSet.has(occasion)) {
      return { occasion, pending: true };
    }

    if (presentedSet.has(occasion)) {
      return { occasion, declined: true };
    }

    return null;
  };
  const structureValue = { o1: perOccasion('o1'), o2: perOccasion('o2') };
  const mismatch = observed.some((occasion) => {
    const fromSnapshot = snapshotPlanned(occasion);

    return (
      fromSnapshot !== null &&
      fromSnapshot !== rawByOccasion[occasion]!.planned_jobs
    );
  });

  if (openNoClosure.length > 0) {
    return [
      emptyFeature('M01', primary, 'pending', 'a batch is still open', {
        supporting_sequences: supporting,
      }),
      observedFeature('M01', structure, structureValue, {
        disposition: 'pending',
        supporting_sequences: supporting,
      }),
    ];
  }

  const numerator = observed.reduce(
    (sum, occasion) => sum + (rawByOccasion[occasion]!.planned_jobs ?? 0),
    0,
  );
  const denominator = observed.length * JOBS_PER_OCCASION;
  // The review closes a snapshotted batch as a complete observation with
  // exit `stopped`; its raw record carries the reason.
  const reviewClosed = (occasion: Occasion) =>
    exitByOccasion[occasion] === 'closed_at_review' ||
    rawByOccasion[occasion]?.closure_reason === 'closed_at_review';
  const anyReview = OCCASIONS.some(reviewClosed);
  const anyHeldBack = heldBackSet.size > 0;
  const openedUnobserved = OCCASIONS.filter(
    (occasion) =>
      rawByOccasion[occasion] !== undefined &&
      !rawByOccasion[occasion]!.observed,
  );
  // Opened and left before any job press: the eligible event (a first
  // work action) never occurred — never a stop the participant chose.
  const zero: { disposition: Missing; reason: string } = anyHeldBack
    ? {
        disposition: 'interrupted',
        reason: 'a batch was held back after a reload',
      }
    : openedUnobserved.length > 0
      ? {
          disposition: 'no_eligible_event',
          reason: 'every opened batch was left before any job press',
        }
      : {
          disposition: 'declined',
          reason: 'batches named on the route, never opened',
        };
  const shared = {
    closure_reason: anyReview
      ? ('closed_at_review' as const)
      : ('completed' as const),
    // Censored only when an observation was actually cut: a held-back
    // occasion, or an opened batch the review closed before any job press
    // (a snapshotted batch closed at the review is a complete observation).
    censored: anyHeldBack || openedUnobserved.length > 0,
    censor_reason: anyHeldBack
      ? 'occasion held back after a reload'
      : openedUnobserved.length > 0
        ? 'a batch was closed before any job press'
        : null,
    supporting_sequences: supporting,
  };
  const components = {
    occasions_observed: observed,
    occasions_opened_unobserved: openedUnobserved,
    occasions_declined: OCCASIONS.filter(
      (occasion) =>
        presentedSet.has(occasion) &&
        !openedSet.has(occasion) &&
        !heldBackSet.has(occasion),
    ),
    occasions_interrupted: OCCASIONS.filter((occasion) =>
      heldBackSet.has(occasion),
    ),
    planned_by_occasion: Object.fromEntries(
      OCCASIONS.map((occasion) => [
        occasion,
        rawByOccasion[occasion]?.planned_jobs ?? null,
      ]),
    ),
    snapshot_agrees: !mismatch,
  };

  const primaryRow = mismatch
    ? emptyFeature(
        'M01',
        primary,
        'technical_failure',
        'window snapshot disagrees with the plan_snapshot event',
        { ...shared, numerator: null, denominator, components },
      )
    : fractionFeature(
        'M01',
        primary,
        numerator,
        denominator,
        observed.map((occasion) => `m01_batch_${occasion}`),
        supporting,
        zero,
        {
          ...shared,
          ...(anyHeldBack && denominator > 0
            ? { disposition: 'interrupted' as const }
            : {}),
          components,
        },
      );

  // A held-back occasion beside an observed one: `interrupted` (review U3
  // S-F2 precedent), never a partial score — fractionFeature's own
  // `incomplete` labelling is overridden for that case only.
  const primaryOut =
    anyHeldBack &&
    denominator > 0 &&
    primaryRow.disposition !== 'technical_failure'
      ? { ...primaryRow, disposition: 'interrupted' as const }
      : primaryRow;

  return [
    primaryOut,
    observedFeature('M01', structure, structureValue, {
      closure_reason: shared.closure_reason,
      supporting_sequences: supporting,
    }),
  ] satisfies FeatureRecord[];
});
