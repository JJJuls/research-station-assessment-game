/**
 * M11 feature extractor (Unit 3): `m11_unresolved_custodies` = accepted,
 * accessible custodies still unresolved at the first departure from the
 * loan room / accepted, accessible custodies (two planned; a
 * conditional-eligibility denominator — complete at any size above zero),
 * plus `m11_custody_records` (per-occasion offer, answer, accessibility,
 * resolution, encounters and late handover) as a companion. Read-only over
 * the raw `proto_m11_custody_*` events. Declined loans and uncarriable
 * acceptances are outside the denominator — never unresolved, never low.
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

interface M11Raw {
  occasion: 'lab' | 'yard';
  accepted: boolean | null;
  lapsed?: boolean;
  accessible: boolean;
  inaccessible_reason: string | null;
  resolved_before_departure: boolean;
  resolution: { method: string; to: string; at_ms: number } | null;
  departed: boolean;
  unresolved_at_departure: boolean | null;
  late_resolution: { method: string; to: string; at_ms: number } | null;
  owner_encounters_while_carrying: number;
  return_point_encounters_while_carrying: number;
  closure_reason: string;
}

const OCCASIONS = ['lab', 'yard'] as const;

registerFeatureExtractor('M11', (events, context) => {
  const entry = registerEntry('M11');
  const [primary, records] = entry.features;
  const load = currentLoadEvents(events, context);
  const family = load.filter((e) =>
    e.event_type.startsWith('proto_m11_custody_'),
  );
  const supporting = sequencesOf(family);
  const presented = eventsOfType(load, 'proto_m11_custody_offer_presented');
  const heldBack = eventsOfType(load, 'proto_m11_custody_technical_failure');
  const closed = eventsOfType(load, 'proto_m11_custody_window_closed');
  // A late handover happens AFTER the window closed (the primary is
  // frozen at the first departure), so it lives in its own event.
  const lateResolved = eventsOfType(load, 'proto_m11_custody_late_resolved');

  const heldBackOccasions = new Set(
    heldBack.map((event) => meta<string>(event, 'occasion')),
  );

  if (presented.length === 0) {
    if (heldBack.length > 0) {
      const reason =
        'loan offered in an earlier page load; not re-run after the reload';

      return [
        emptyFeature('M11', primary, 'interrupted', reason, {
          supporting_sequences: supporting,
        }),
        emptyFeature('M11', records, 'interrupted', reason),
      ];
    }

    return [
      absentFeature('M11', primary, context, 'no loan offered', {
        supporting_sequences: supporting,
      }),
      absentFeature('M11', records, context, 'no loan offered'),
    ];
  }

  // Latest closure per occasion (a late handover never re-closes).
  const rawByOccasion: Partial<Record<'lab' | 'yard', M11Raw>> = {};
  let anyClosedAtReview = false;

  for (const event of closed) {
    const raw =
      meta<M11Raw>(event, 'raw_components') ??
      meta<M11Raw>(event, 'raw_components_partial');
    const occasion = meta<string>(event, 'occasion');

    if (raw === undefined || (occasion !== 'lab' && occasion !== 'yard')) {
      continue;
    }

    rawByOccasion[occasion] = raw;

    if (raw.closure_reason === 'closed_at_review') {
      anyClosedAtReview = true;
    }
  }

  const raws = OCCASIONS.map((occasion) => rawByOccasion[occasion] ?? null);
  const offeredOccasions = new Set(
    presented.map((event) => meta<string>(event, 'occasion')),
  );
  const closedCount = raws.filter((raw) => raw !== null).length;

  if (closedCount < offeredOccasions.size) {
    // An accepted custody is still open (the participant is in the loan
    // room, or the review has not run): no primary yet.
    return [
      emptyFeature('M11', primary, 'pending', 'a custody is still open', {
        supporting_sequences: supporting,
      }),
      emptyFeature('M11', records, 'pending', 'a custody is still open'),
    ];
  }

  const eligible = raws.filter(
    (raw): raw is M11Raw =>
      raw !== null && raw.accepted === true && raw.accessible,
  );
  const unresolved = eligible.filter(
    (raw) => raw.unresolved_at_departure === true,
  ).length;
  const declinedAll =
    eligible.length === 0 &&
    raws.every(
      (raw) => raw === null || raw.accepted === false || raw.lapsed === true,
    );
  // A reload held back one occasion (its evidence lies in an earlier page
  // load): the item is `interrupted` even when the other occasion was
  // observed — never a complete observation (review U3 S-F2).
  const interruptedOccasions = OCCASIONS.filter((occasion) =>
    heldBackOccasions.has(occasion),
  );
  const closure = anyClosedAtReview ? 'closed_at_review' : 'completed';
  const lateFor = (occasion: 'lab' | 'yard') => {
    const event = lateResolved.find(
      (candidate) => meta<string>(candidate, 'occasion') === occasion,
    );

    return event === undefined
      ? null
      : {
          method: meta<string>(event, 'method') ?? null,
          to: meta<string>(event, 'to') ?? null,
          after_departure_ms: meta<number>(event, 'after_departure_ms') ?? null,
        };
  };
  const withLate = (occasion: 'lab' | 'yard') => {
    const raw = rawByOccasion[occasion];

    return raw === undefined
      ? null
      : { ...raw, late_resolution: raw.late_resolution ?? lateFor(occasion) };
  };
  const recordsValue = {
    lab:
      withLate('lab') ??
      (heldBackOccasions.has('lab') ? { interrupted: true } : null),
    yard:
      withLate('yard') ??
      (heldBackOccasions.has('yard') ? { interrupted: true } : null),
  };

  return [
    fractionFeature(
      'M11',
      primary,
      unresolved,
      eligible.length,
      eligible.map((raw) => `m11_custody_${raw.occasion}`),
      supporting,
      interruptedOccasions.length > 0
        ? {
            disposition: 'interrupted',
            reason: 'an occasion was held back after a reload',
          }
        : declinedAll
          ? { disposition: 'declined', reason: 'every loan refused or untaken' }
          : {
              disposition: 'no_eligible_event',
              reason: 'no accepted loan could be carried',
            },
      {
        closure_reason: closure,
        censored: anyClosedAtReview || interruptedOccasions.length > 0,
        censor_reason: anyClosedAtReview
          ? 'review reached'
          : interruptedOccasions.length > 0
            ? 'occasion held back after a reload'
            : null,
        ...(interruptedOccasions.length > 0
          ? { disposition: 'interrupted' as const }
          : {}),
        components: {
          offered: offeredOccasions.size,
          accepted: raws.filter((raw) => raw?.accepted === true).length,
          declined: raws.filter((raw) => raw?.accepted === false).length,
          untaken: raws.filter((raw) => raw?.lapsed === true).length,
          interrupted_occasions: interruptedOccasions,
          inaccessible: raws.filter(
            (raw) => raw?.accepted === true && !raw.accessible,
          ).length,
          late_resolutions: OCCASIONS.filter((occasion) => {
            const record = recordsValue[occasion];

            return (
              record !== null &&
              'late_resolution' in record &&
              record.late_resolution != null
            );
          }).length,
        },
      },
    ),
    observedFeature('M11', records, recordsValue, {
      closure_reason: closure,
      supporting_sequences: supporting,
    }),
  ] satisfies FeatureRecord[];
});
