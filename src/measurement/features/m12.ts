/**
 * M12 feature extractor (Unit 8): `m12_fields_verified` = fields
 * explicitly judged (matches or differs) before release, summed over the
 * released products / 6 (three per product; a planned-observations
 * denominator — fewer than six ⇒ `incomplete`), plus
 * `m12_detection_and_correction` (per product: judgement accuracy, the
 * faulty field detected = judged "differs", correction attempted,
 * correction successful = the entered value equals the reference).
 * Read-only over the raw `proto_m12_check_*` events. An unchecked release
 * is an observed 0 for that product; a packet never released, never
 * opened or held back is never a zero; viewing is never detection.
 *
 * Reload (U24 RL-1, `RELOAD-CORRECTION-SPEC-r3-exec.md` §2 and §5): the
 * load's `prior_load_checked` record classifies each packet H / A / U /
 * M. A packet whose absence of an earlier opening is established (A)
 * takes the first-load reading; the F5 reading (no current-load evidence
 * after a reload ⇒ held) applies only to a packet without one. The record
 * is never task evidence. U24 RL-1C (register §5.406): a presented,
 * unopened packet of a load without its check is U (`no_check`) and held;
 * the primary row reports the exposure-record diagnostics.
 */
import { m12PriorAdministration } from '../../pilot/windows/m12CheckModel';
import type { RawGameEvent } from '../../systems/EventLogger';
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
import type {
  ExtractContext,
  FeatureDisposition,
  FeatureExtractor,
  FeatureRecord,
} from './types';

type Occasion = 'o1' | 'o2';

interface M12Raw {
  occasion: Occasion;
  form: string;
  fields_planned: number;
  fields_checked: number;
  fields_judged: number;
  judgements_correct: number;
  judgement_accuracy: number | null;
  faulty_field_id: string;
  faulty_field_checked: boolean;
  faulty_field_judged: string | null;
  fault_detected: boolean;
  correction_attempted: boolean;
  correction_successful: boolean | null;
  unnecessary_corrections: number;
  released: boolean;
  actions: number;
  fields?: unknown[];
  closure_reason: string;
  realised_order?: string[];
}

const FAMILY = 'proto_m12_check_';
const OCCASIONS: readonly Occasion[] = ['o1', 'o2'];
const FIELDS_PER_PRODUCT = 3;

type Missing = Exclude<FeatureDisposition, 'observed' | 'incomplete'>;

/**
 * The load's reload check (U24 RL-1; r1 §1 stage map): per packet, stage 1
 * the packet named on the route (`presented`), no stage 2, stage 3 the
 * opening, and the packet's hold-back markers. Null on a first load.
 */
export function m12PriorLoadCheck(
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
            m12PriorAdministration([event], occasion),
          holdBack: (event: ReloadEvent) =>
            event.event_type === `${FAMILY}technical_failure` &&
            event.metadata?.occasion === occasion,
        },
      ]),
    ),
  });
}

/** Each packet's class from the load's check records (r3 §2). */
export function classifyM12Reload(
  pageLoadIndex: number,
  checks: readonly object[],
): ReloadClassification {
  return classifyReload({ pageLoadIndex, checks, occasions: OCCASIONS });
}

/** The current-load reason of a held packet, by its marker's class. */
const HELD_REASON = {
  H: 'packet opened in an earlier page load; not re-run after the reload',
  U: 'packet not administered after a reload: earlier history not verified',
  M: 'packet not administered after a reload: earlier check contradictory',
} as const;

/**
 * The provisional exposure-record diagnostics (U24 RL-1C, decision B;
 * register §5.406), after a reload or beside a check only: the primary
 * row's components gain `exposure_record_consistent` — §5.290 (a), as in
 * M14–M20: the helper's record part, and false when a packet whose own
 * record found an earlier opening (H) is opened in this load too — and the
 * offending packets. A flag only: the row's values are never changed.
 */
function withExposureDiagnostics(
  rows: FeatureRecord[],
  events: readonly RawGameEvent[],
  context: ExtractContext,
): FeatureRecord[] {
  const load = currentLoadEvents(events, context);
  const reload = classifyM12Reload(
    context.pageLoadIndex,
    eventsOfType(load, `${FAMILY}${PRIOR_LOAD_CHECK_SUFFIX}`).map(
      (event) => event.metadata ?? {},
    ),
  );

  if (!context.reloaded && reload.check_count === 0) {
    return rows;
  }

  const inconsistent = OCCASIONS.filter(
    (occasion) =>
      reload.occasions[occasion].class === 'H' &&
      m12PriorAdministration(load, occasion),
  );
  const [first, ...rest] = rows;

  return [
    {
      ...first,
      components: {
        ...first.components,
        exposure_record_consistent:
          reload.exposure_record_consistent && inconsistent.length === 0,
        exposure_record_inconsistent_occasions: inconsistent,
      },
    },
    ...rest,
  ];
}

const m12Rows: FeatureExtractor = (events, context) => {
  const entry = registerEntry('M12');
  const [primary, detail] = entry.features;
  const load = currentLoadEvents(events, context);
  const family = withoutPriorLoadChecks(
    load.filter((e) => e.event_type.startsWith(FAMILY)),
    FAMILY,
  );
  const supporting = sequencesOf(family);
  const reload = classifyM12Reload(
    context.pageLoadIndex,
    eventsOfType(load, `${FAMILY}${PRIOR_LOAD_CHECK_SUFFIX}`).map(
      (event) => event.metadata ?? {},
    ),
  );
  const established = (occasion: Occasion) =>
    reload.occasions[occasion].class === 'A';

  // A malformed check record stays under the existing rule (r3 §2;
  // §5.290 (a)): a technical failure, never uncertain history.
  if (reload.check_malformed) {
    const reason =
      'a reload check record describes another page load or lacks a packet';

    return [
      emptyFeature('M12', primary, 'technical_failure', reason, {
        closure_reason: 'technical_failure',
        supporting_sequences: supporting,
      }),
      emptyFeature('M12', detail, 'technical_failure', reason, {
        closure_reason: 'technical_failure',
      }),
    ];
  }
  const occ = (event: { metadata?: Record<string, unknown> }) =>
    meta<string>(event as never, 'occasion');
  const presented = eventsOfType(load, 'proto_m12_check_presented');
  const opened = eventsOfType(load, 'proto_m12_check_opportunity_opened');
  const closed = eventsOfType(load, 'proto_m12_check_window_closed');
  const heldBack = eventsOfType(load, 'proto_m12_check_technical_failure');
  const judged = eventsOfType(load, 'proto_m12_check_field_judged');

  const presentedSet = new Set(presented.map(occ));
  const openedSet = new Set(opened.map(occ));
  const checked = reload.check_count > 0;
  // The class a packet is held under: the reload guard's marker's; or,
  // after a reload, an unopened packet's own class when the load's check
  // does not establish its absence (U24 RL-1) — U (`no_check`) for a
  // reloaded load without a check, presented or not (U24 RL-1C, decision
  // A) — and a packet with no current-load evidence at all (F5).
  const heldClass = (occasion: Occasion): 'H' | 'U' | 'M' | null => {
    const marker = heldBack.find((event) => occ(event) === occasion);

    if (marker !== undefined) {
      return reloadHoldBackClass(meta<unknown>(marker, 'detail')) ?? 'H';
    }

    const cls = reload.occasions[occasion].class;

    return context.reloaded &&
      cls !== 'A' &&
      !openedSet.has(occasion) &&
      (checked || reload.page_reloaded || !presentedSet.has(occasion))
      ? (cls ?? 'U')
      : null;
  };
  const heldBackSet = new Set([
    ...heldBack.map(occ),
    ...OCCASIONS.filter((occasion) => heldClass(occasion) !== null),
  ]);

  if (opened.length === 0) {
    // Without a check, a load that presented nothing keeps the F5 /
    // `absentFeature` reading below (U24 RL-1C).
    if (
      heldBack.length > 0 ||
      (heldBackSet.size > 0 &&
        (checked || (reload.page_reloaded && presented.length > 0)))
    ) {
      const reason =
        [
          ...new Set(
            OCCASIONS.flatMap((occasion) => {
              const cls = heldClass(occasion);

              return cls === null ? [] : [HELD_REASON[cls]];
            }),
          ),
        ].join('; ') || HELD_REASON.H;

      return [
        emptyFeature('M12', primary, 'interrupted', reason, {
          supporting_sequences: supporting,
        }),
        emptyFeature('M12', detail, 'interrupted', reason),
      ];
    }

    if (presented.length > 0) {
      const reason = 'packet named on the route, never opened';

      return [
        emptyFeature('M12', primary, 'declined', reason, {
          supporting_sequences: supporting,
        }),
        emptyFeature('M12', detail, 'declined', reason),
      ];
    }

    // An established absence for every packet takes the first-load
    // reading (r3 §5, NOP + NOP (A)).
    if (OCCASIONS.every(established)) {
      return [
        emptyFeature('M12', primary, 'not_presented', 'no packet opened', {
          supporting_sequences: supporting,
        }),
        emptyFeature('M12', detail, 'not_presented', 'no packet opened'),
      ];
    }

    return [
      absentFeature('M12', primary, context, 'no packet opened', {
        supporting_sequences: supporting,
      }),
      absentFeature('M12', detail, context, 'no packet opened'),
    ];
  }

  // Latest closure per occasion.
  const rawByOccasion: Partial<Record<Occasion, M12Raw>> = {};
  const exitByOccasion: Partial<Record<Occasion, string>> = {};

  for (const event of closed) {
    const raw =
      meta<M12Raw>(event, 'raw_components') ??
      meta<M12Raw>(event, 'raw_components_partial');
    const occasion = occ(event);

    if (raw === undefined || (occasion !== 'o1' && occasion !== 'o2')) {
      continue;
    }

    rawByOccasion[occasion] = raw;
    exitByOccasion[occasion] = meta<string>(event, 'exit_state') ?? 'unknown';
  }

  // Released products form the observed set; the recount of judged fields
  // comes from the `field_judged` events (distinct field ids per occasion).
  const judgedRecount = (occasion: Occasion) =>
    new Set(
      judged
        .filter((event) => occ(event) === occasion)
        .map((event) => meta<string>(event, 'field_id')),
    ).size;
  const released = OCCASIONS.filter(
    (occasion) => rawByOccasion[occasion]?.released === true,
  );
  const openUnreleased = OCCASIONS.filter(
    (occasion) =>
      rawByOccasion[occasion] !== undefined &&
      rawByOccasion[occasion]!.released !== true,
  );
  const openNoClosure = OCCASIONS.filter(
    (occasion) =>
      openedSet.has(occasion) && rawByOccasion[occasion] === undefined,
  );
  const mismatch = released.some(
    (occasion) =>
      judgedRecount(occasion) !== rawByOccasion[occasion]!.fields_judged ||
      rawByOccasion[occasion]!.fields_judged > FIELDS_PER_PRODUCT,
  );

  const perProduct = (occasion: Occasion): Record<string, unknown> | null => {
    const raw = rawByOccasion[occasion];

    if (raw !== undefined) {
      return {
        occasion,
        form: raw.form,
        released: raw.released,
        fields_checked: raw.fields_checked,
        fields_judged: raw.fields_judged,
        judgements_correct: raw.judgements_correct,
        judgement_accuracy: raw.judgement_accuracy,
        faulty_field_checked: raw.faulty_field_checked,
        faulty_field_judged: raw.faulty_field_judged,
        fault_detected: raw.fault_detected,
        correction_attempted: raw.correction_attempted,
        correction_successful: raw.correction_successful,
        unnecessary_corrections: raw.unnecessary_corrections,
        actions: raw.actions,
        fields: raw.fields ?? null,
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
  const detailValue = { o1: perProduct('o1'), o2: perProduct('o2') };
  const anyHeldBack = heldBackSet.size > 0;
  const anyReview = OCCASIONS.some(
    (occasion) => exitByOccasion[occasion] === 'closed_at_review',
  );
  const components = {
    occasions_released: released,
    occasions_open_unreleased: openUnreleased,
    occasions_pending: openNoClosure,
    occasions_declined: OCCASIONS.filter(
      (occasion) =>
        presentedSet.has(occasion) &&
        !openedSet.has(occasion) &&
        !heldBackSet.has(occasion),
    ),
    occasions_interrupted: OCCASIONS.filter((occasion) =>
      heldBackSet.has(occasion),
    ),
    judged_by_occasion: Object.fromEntries(
      OCCASIONS.map((occasion) => [
        occasion,
        rawByOccasion[occasion]?.released === true
          ? rawByOccasion[occasion]!.fields_judged
          : null,
      ]),
    ),
    fault_detected_by_occasion: Object.fromEntries(
      OCCASIONS.map((occasion) => [
        occasion,
        rawByOccasion[occasion]?.released === true
          ? rawByOccasion[occasion]!.fault_detected
          : null,
      ]),
    ),
    recount_agrees: !mismatch,
  };

  if (openNoClosure.length > 0 && released.length === 0) {
    const reason = 'a packet is still open';

    return [
      emptyFeature('M12', primary, 'pending', reason, {
        supporting_sequences: supporting,
        components,
      }),
      emptyFeature('M12', detail, 'pending', reason, {
        supporting_sequences: supporting,
      }),
    ];
  }

  const numerator = released.reduce(
    (sum, occasion) => sum + rawByOccasion[occasion]!.fields_judged,
    0,
  );
  const denominator = released.length * FIELDS_PER_PRODUCT;
  // Opened and closed without a release (the review): no release, no
  // observation — never a zero of checking.
  const zero: { disposition: Missing; reason: string } = anyHeldBack
    ? {
        disposition: 'interrupted',
        reason: 'a packet was held back after a reload',
      }
    : openUnreleased.length > 0
      ? {
          disposition: 'no_eligible_event',
          reason: 'every opened packet was closed without a release',
        }
      : {
          disposition: 'declined',
          reason: 'packets named on the route, never opened',
        };
  const shared = {
    closure_reason: anyReview
      ? ('closed_at_review' as const)
      : ('completed' as const),
    censored:
      anyHeldBack || openUnreleased.length > 0 || openNoClosure.length > 0,
    censor_reason: anyHeldBack
      ? 'occasion held back after a reload'
      : openUnreleased.length > 0
        ? 'a packet was closed before its release'
        : openNoClosure.length > 0
          ? 'a packet is still open'
          : null,
    supporting_sequences: supporting,
    components,
  };

  const primaryRow = mismatch
    ? emptyFeature(
        'M12',
        primary,
        'technical_failure',
        'window record disagrees with the field_judged events',
        { ...shared, numerator: null, denominator, included_ids: [] },
      )
    : fractionFeature(
        'M12',
        primary,
        numerator,
        denominator,
        released.map((occasion) => `m12_check_${occasion}`),
        supporting,
        zero,
        {
          ...shared,
          ...(anyHeldBack && denominator > 0
            ? { disposition: 'interrupted' as const }
            : openNoClosure.length > 0 && denominator > 0
              ? { disposition: 'pending' as const }
              : {}),
        },
      );
  const primaryOut =
    denominator > 0 && primaryRow.disposition !== 'technical_failure'
      ? anyHeldBack
        ? { ...primaryRow, disposition: 'interrupted' as const }
        : openNoClosure.length > 0
          ? { ...primaryRow, disposition: 'pending' as const }
          : primaryRow
      : primaryRow;

  if (mismatch) {
    return [
      primaryOut,
      emptyFeature(
        'M12',
        detail,
        'technical_failure',
        'window record disagrees with the field_judged events',
        {
          closure_reason: shared.closure_reason,
          supporting_sequences: supporting,
        },
      ),
    ];
  }

  // The companion is null with the primary (register rule): no released
  // product ⇒ no detection / correction detail is exported either.
  if (
    primaryOut.value === null &&
    primaryOut.disposition !== 'observed' &&
    primaryOut.disposition !== 'incomplete'
  ) {
    return [
      primaryOut,
      emptyFeature(
        'M12',
        detail,
        primaryOut.disposition,
        primaryOut.missing_reason ?? 'null with the primary',
        {
          closure_reason: shared.closure_reason,
          supporting_sequences: supporting,
        },
      ),
    ];
  }

  return [
    primaryOut,
    observedFeature('M12', detail, detailValue, {
      closure_reason: shared.closure_reason,
      supporting_sequences: supporting,
    }),
  ] satisfies FeatureRecord[];
};

registerFeatureExtractor('M12', (events, context) =>
  withExposureDiagnostics(m12Rows(events, context), events, context),
);
