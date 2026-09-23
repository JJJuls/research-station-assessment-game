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

const OCCASIONS: readonly Occasion[] = ['o1', 'o2'];
const FIELDS_PER_PRODUCT = 3;

type Missing = Exclude<FeatureDisposition, 'observed' | 'incomplete'>;

registerFeatureExtractor('M12', (events, context) => {
  const entry = registerEntry('M12');
  const [primary, detail] = entry.features;
  const load = currentLoadEvents(events, context);
  const family = load.filter((e) =>
    e.event_type.startsWith('proto_m12_check_'),
  );
  const supporting = sequencesOf(family);
  const occ = (event: { metadata?: Record<string, unknown> }) =>
    meta<string>(event as never, 'occasion');
  const presented = eventsOfType(load, 'proto_m12_check_presented');
  const opened = eventsOfType(load, 'proto_m12_check_opportunity_opened');
  const closed = eventsOfType(load, 'proto_m12_check_window_closed');
  const heldBack = eventsOfType(load, 'proto_m12_check_technical_failure');
  const judged = eventsOfType(load, 'proto_m12_check_field_judged');

  const presentedSet = new Set(presented.map(occ));
  const openedSet = new Set(opened.map(occ));
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
        'packet opened in an earlier page load; not re-run after the reload';

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
});
