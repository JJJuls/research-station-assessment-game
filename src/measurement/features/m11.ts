/**
 * M11 feature extractor (Unit 3): `m11_unresolved_custodies` = accepted,
 * accessible custodies still unresolved at the first departure from the
 * loan room / accepted, accessible custodies (two planned; a
 * conditional-eligibility denominator — complete at any size above zero),
 * plus `m11_custody_records` (per-occasion offer, answer, accessibility,
 * resolution, encounters and late handover) as a companion. Read-only over
 * the raw `proto_m11_custody_*` events. Declined loans and uncarriable
 * acceptances are outside the denominator — never unresolved, never low.
 *
 * Reload (U24 RL-2, `RELOAD-CORRECTION-SPEC-r3-exec.md` §2, §4 G2 and §5
 * "M11 (lab, yard)"): the load's `prior_load_checked` record classifies
 * each occasion H / A / U / M — H when its loan was offered in an earlier
 * load (the existing rule). The existing per-occasion held-back rule is
 * kept; with every absence established (A) a load without offers reads by
 * the first-load rule, `absentFeature`'s reload branch only without one.
 * A loan offered and left unanswered in a reloaded load without its check
 * is U and held (RL-1C decision A). The record is never task evidence.
 */
import { m11PriorAdministration } from '../../pilot/windows/m11CustodyModel';
import { registerEntry } from '../registerV3';
import {
  classifyReload,
  computePriorLoadCheck,
  PRIOR_LOAD_CHECK_SUFFIX,
  type PriorLoadCheck,
  RELOAD_REASON,
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
const FAMILY = 'proto_m11_custody_';

type Occasion = (typeof OCCASIONS)[number];

/**
 * The load's reload check (U24 RL-2; r3 §4 G2 stage map): per occasion,
 * stage 1 the window's `presented`, no stage 2, stage 3 the existing
 * guard's record (the model's `offer_presented`: a loan offered earlier is
 * held, answered or not), and the occasion's hold-back markers. Null on a
 * first load.
 */
export function m11PriorLoadCheck(
  pageLoadIndex: number,
  priorLoadEvents: readonly ReloadEvent[],
  integrity: ReloadHistoryIntegrity,
): PriorLoadCheck | null {
  return computePriorLoadCheck({
    pageLoadIndex,
    priorLoadEvents,
    integrity,
    occasions: Object.fromEntries(
      OCCASIONS.map((occasion) => [
        occasion,
        {
          briefing: (event: ReloadEvent) =>
            event.event_type === `${FAMILY}presented` &&
            event.metadata?.occasion === occasion,
          opening: (event: ReloadEvent) =>
            m11PriorAdministration([event], occasion),
          holdBack: (event: ReloadEvent) =>
            event.event_type === `${FAMILY}technical_failure` &&
            event.metadata?.occasion === occasion,
        },
      ]),
    ),
  });
}

/** Each occasion's class from the load's check records (r3 §2). */
export function classifyM11Reload(
  pageLoadIndex: number,
  checks: readonly object[],
): ReloadClassification {
  return classifyReload({ pageLoadIndex, checks, occasions: OCCASIONS });
}

/** The current-load reason of a load whose occasions are all held. */
const HELD_REASON = {
  H: 'loan offered in an earlier page load; not re-run after the reload',
  U: 'custody not administered after a reload: earlier history not verified',
  M: 'custody not administered after a reload: earlier check contradictory',
} as const;

registerFeatureExtractor('M11', (events, context) => {
  const entry = registerEntry('M11');
  const [primary, records] = entry.features;
  const load = currentLoadEvents(events, context);
  const family = withoutPriorLoadChecks(
    load.filter((e) => e.event_type.startsWith(FAMILY)),
    FAMILY,
  );
  const supporting = sequencesOf(family);
  const reload = classifyM11Reload(
    context.pageLoadIndex,
    eventsOfType(load, `${FAMILY}${PRIOR_LOAD_CHECK_SUFFIX}`).map(
      (event) => event.metadata ?? {},
    ),
  );
  const checked = reload.check_count > 0;

  // A malformed check record stays under the existing rule (r3 §2;
  // §5.290 (a)): a technical failure, never uncertain history.
  if (reload.check_malformed) {
    const reason =
      'a reload check record describes another page load or lacks an occasion';

    return [
      emptyFeature('M11', primary, 'technical_failure', reason, {
        closure_reason: 'technical_failure',
        supporting_sequences: supporting,
      }),
      emptyFeature('M11', records, 'technical_failure', reason, {
        closure_reason: 'technical_failure',
      }),
    ];
  }

  const presented = eventsOfType(load, 'proto_m11_custody_offer_presented');
  const heldBack = eventsOfType(load, 'proto_m11_custody_technical_failure');
  const closed = eventsOfType(load, 'proto_m11_custody_window_closed');
  // A late handover happens AFTER the window closed (the primary is
  // frozen at the first departure), so it lives in its own event.
  const lateResolved = eventsOfType(load, 'proto_m11_custody_late_resolved');
  const ofOccasion = (type: string, occasion: Occasion) =>
    eventsOfType(load, `${FAMILY}${type}`).some(
      (event) => meta<string>(event, 'occasion') === occasion,
    );
  // The class an occasion is held under: the reload guard's marker's; or,
  // after a reload, an unanswered occasion's own class when it is not A —
  // always with a check, without one only once its loan was offered in
  // this load (U (`no_check`), RL-1C decision A; U24 RL-2). An occasion
  // never reached without a check keeps today's reading.
  const heldClass = (occasion: Occasion): 'H' | 'U' | 'M' | null => {
    const marker = heldBack.find(
      (event) => meta<string>(event, 'occasion') === occasion,
    );

    if (marker !== undefined) {
      return reloadHoldBackClass(meta<unknown>(marker, 'detail')) ?? 'H';
    }

    const cls = reload.occasions[occasion].class;

    return reload.page_reloaded &&
      cls !== 'A' &&
      !ofOccasion('offer_answered', occasion) &&
      !ofOccasion('offer_lapsed', occasion) &&
      !ofOccasion('opportunity_opened', occasion) &&
      (checked || ofOccasion('offer_presented', occasion))
      ? (cls ?? 'U')
      : null;
  };
  const heldBackOccasions = new Set<string | undefined>([
    ...heldBack.map((event) => meta<string>(event, 'occasion')),
    ...OCCASIONS.filter((occasion) => heldClass(occasion) !== null),
  ]);
  const heldReasons = (classes: Record<'H' | 'U' | 'M', string>) => [
    ...new Set(
      OCCASIONS.flatMap((occasion) => {
        const cls = heldClass(occasion);

        return cls === null ? [] : [classes[cls]];
      }),
    ),
  ];
  // A loan offered in this load and held unanswered by its class (U24
  // RL-2) is held, never offered or pending (as M10's held deliveries).
  const offeredLive = presented.filter((event) => {
    const occasion = meta<string>(event, 'occasion');

    return !(
      (occasion === 'lab' || occasion === 'yard') &&
      heldClass(occasion) !== null &&
      !heldBack.some((marker) => meta<string>(marker, 'occasion') === occasion)
    );
  });

  if (offeredLive.length === 0) {
    if (
      heldBack.length > 0 ||
      (heldBackOccasions.size > 0 && (checked || presented.length > 0))
    ) {
      const reason = heldReasons(HELD_REASON).join('; ') || HELD_REASON.H;

      return [
        emptyFeature('M11', primary, 'interrupted', reason, {
          supporting_sequences: supporting,
        }),
        emptyFeature('M11', records, 'interrupted', reason),
      ];
    }

    // Every absence established: the first-load reading (r3 §5, NOP +
    // NOP (A)); `absentFeature`'s reload branch is kept without one.
    if (
      OCCASIONS.every((occasion) => reload.occasions[occasion].class === 'A')
    ) {
      return [
        emptyFeature('M11', primary, 'not_presented', 'no loan offered', {
          supporting_sequences: supporting,
        }),
        emptyFeature('M11', records, 'not_presented', 'no loan offered'),
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
    offeredLive.map((event) => meta<string>(event, 'occasion')),
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
            // r3 §2's reason of a U or M occasion is appended (M03's form).
            reason: [
              'an occasion was held back after a reload',
              ...heldReasons({
                H: '',
                U: RELOAD_REASON.U,
                M: RELOAD_REASON.M,
              }).filter((reason) => reason !== ''),
            ].join(': '),
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
