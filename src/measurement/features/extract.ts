/**
 * Read-only feature extractor of the M01–M26 protocol (Unit 1 framework).
 *
 * `extractMeasurementFeatures(events, context)` derives every register
 * feature from the raw event log alone — the same function an analyst can
 * run offline on an exported log, so the exported summary is reproducible
 * by construction. Item extractors register themselves per item unit;
 * until an item's extractor lands, its features are exported as
 * `not_implemented` rows with `null` values so the export always carries
 * all 26 items and every expected feature key (acceptance check G13).
 *
 * Boundary: this module never writes to the event log, the validity
 * register or the session; it never sums items, weights anything or
 * produces a trait score. A denominator of zero is `null` with the
 * caller's stated reason; fewer valid observations than planned export
 * their value under `incomplete`, never as a complete score.
 */
import type { RawGameEvent } from '../../systems/EventLogger';
import { MEASUREMENT_PROTOCOL_VERSION } from '../protocol';
import {
  type FeatureSpec,
  type M26ItemId,
  REGISTER_V3,
  registerEntry,
} from '../registerV3';
import {
  type ExtractContext,
  type FeatureDisposition,
  type FeatureExtractor,
  type FeatureRecord,
  type FeatureValue,
  SUPPORTING_SEQUENCES_LIMIT,
} from './types';

const extractors = new Map<M26ItemId, FeatureExtractor>();

/** Registers (or replaces) the extractor of one item. */
export function registerFeatureExtractor(
  item: M26ItemId,
  extractor: FeatureExtractor,
) {
  extractors.set(item, extractor);
}

export function hasFeatureExtractor(item: M26ItemId): boolean {
  return extractors.has(item);
}

function baseRecord(item: M26ItemId, spec: FeatureSpec): FeatureRecord {
  return {
    item_id: item,
    feature_id: spec.feature_id,
    feature_version: spec.feature_version,
    protocol_version: MEASUREMENT_PROTOCOL_VERSION,
    role: spec.role,
    value: null,
    disposition: 'not_implemented',
    numerator: null,
    denominator: null,
    planned_denominator: spec.planned_denominator,
    included_ids: [],
    censored: false,
    censor_reason: null,
    closure_reason: null,
    missing_reason: null,
    supporting_sequences: [],
    supporting_sequences_truncated: false,
    components: {},
  };
}

/** Bounds the supporting sequence list and flags the cut. */
function boundSequences(
  record: FeatureRecord,
  supporting: readonly number[] | undefined,
): FeatureRecord {
  if (supporting === undefined) {
    return record;
  }

  const truncated = supporting.length > SUPPORTING_SEQUENCES_LIMIT;

  return {
    ...record,
    supporting_sequences: truncated
      ? supporting.slice(0, SUPPORTING_SEQUENCES_LIMIT)
      : [...supporting],
    supporting_sequences_truncated: truncated,
  };
}

/** A feature row with no value (the only representation of "not observed"). */
export function emptyFeature(
  item: M26ItemId,
  spec: FeatureSpec,
  disposition: Exclude<FeatureDisposition, 'observed' | 'incomplete'>,
  missingReason: string,
  extra: Partial<FeatureRecord> = {},
): FeatureRecord {
  const record: FeatureRecord = {
    ...baseRecord(item, spec),
    ...extra,
    value: null,
    disposition,
    missing_reason: missingReason,
  };

  return boundSequences(record, extra.supporting_sequences);
}

/** An observed feature row. A value of 0 is an observed zero. */
export function observedFeature(
  item: M26ItemId,
  spec: FeatureSpec,
  value: FeatureValue,
  extra: Partial<FeatureRecord> = {},
): FeatureRecord {
  const record: FeatureRecord = {
    ...baseRecord(item, spec),
    disposition: 'observed',
    ...extra,
    value,
    missing_reason: null,
  };

  return boundSequences(record, extra.supporting_sequences);
}

/**
 * A fraction feature.
 * - denominator ≤ 0 → `null` with the CALLER'S disposition and reason (a
 *   declined duty, an unaccepted obligation, a never-entered project and a
 *   genuinely absent eligible event are different reasons);
 * - denominator below the planned denominator → the value is exported
 *   WITH numerator and denominator under `incomplete` (partial accuracy is
 *   never a complete component score);
 * - otherwise `observed` (a zero numerator is an observed zero).
 */
export function fractionFeature(
  item: M26ItemId,
  spec: FeatureSpec,
  numerator: number,
  denominator: number,
  includedIds: string[],
  supporting: number[],
  zeroDenominator: {
    disposition: Exclude<FeatureDisposition, 'observed' | 'incomplete'>;
    reason: string;
  },
  extra: Partial<FeatureRecord> = {},
): FeatureRecord {
  if (denominator <= 0) {
    return emptyFeature(
      item,
      spec,
      zeroDenominator.disposition,
      zeroDenominator.reason,
      {
        ...extra,
        numerator: null,
        denominator: 0,
        included_ids: includedIds,
        supporting_sequences: supporting,
      },
    );
  }

  // Only a planned-observation denominator can be partial; a conditional
  // denominator (the participant's own eligible events) is complete at any
  // size above zero.
  const planned = spec.planned_denominator;
  const partial =
    spec.denominator_kind === 'planned_observations' &&
    planned !== null &&
    denominator < planned;

  return observedFeature(item, spec, numerator, {
    ...extra,
    disposition: partial ? 'incomplete' : (extra.disposition ?? 'observed'),
    numerator,
    denominator,
    included_ids: includedIds,
    supporting_sequences: supporting,
  });
}

/**
 * The reload rule: an item with no evidence in the current page load is
 * `interrupted` when earlier page loads exist (its evidence may be in
 * `prior_page_load_events`), and `not_presented` otherwise.
 */
export function absentFeature(
  item: M26ItemId,
  spec: FeatureSpec,
  context: ExtractContext,
  reason: string,
  extra: Partial<FeatureRecord> = {},
): FeatureRecord {
  return context.reloaded
    ? emptyFeature(
        item,
        spec,
        'interrupted',
        `no current-load evidence after a reload: ${reason}`,
        extra,
      )
    : emptyFeature(item, spec, 'not_presented', reason, extra);
}

/** Rows for one item: the registered extractor's output, checked against the register. */
export function extractItemFeatures(
  item: M26ItemId,
  events: readonly RawGameEvent[],
  context: ExtractContext,
): FeatureRecord[] {
  const entry = registerEntry(item);
  const extractor = extractors.get(item);

  if (extractor === undefined) {
    return entry.features.map((spec) =>
      emptyFeature(
        item,
        spec,
        'not_implemented',
        'extractor not implemented in this build',
      ),
    );
  }

  let rows: FeatureRecord[];

  try {
    rows = extractor(events, context);
  } catch (error) {
    // An extractor fault must never lose the export: every feature of the
    // item is reported as a technical failure with the message.
    const message = error instanceof Error ? error.message : String(error);

    return entry.features.map((spec) =>
      emptyFeature(item, spec, 'technical_failure', `extractor: ${message}`),
    );
  }

  // Every register feature appears exactly once, in register order; an
  // extractor that omits a feature yields a not_implemented row for it,
  // and a row for an unregistered feature id is dropped.
  return entry.features.map((spec) => {
    const row = rows.find(
      (candidate) => candidate.feature_id === spec.feature_id,
    );

    return (
      row ??
      emptyFeature(
        item,
        spec,
        'not_implemented',
        'extractor produced no row for this feature',
      )
    );
  });
}

/** All 26 items, register order; every expected feature key present. */
export function extractMeasurementFeatures(
  events: readonly RawGameEvent[],
  context: ExtractContext,
): FeatureRecord[] {
  return REGISTER_V3.flatMap((entry) =>
    extractItemFeatures(entry.id, events, context),
  );
}

// ——— Event helpers shared by the item extractors ————————————————————————

/** Events of the current page load only, in sequence order. */
export function currentLoadEvents(
  events: readonly RawGameEvent[],
  context: ExtractContext,
): RawGameEvent[] {
  return events
    .filter(
      (event) =>
        event.page_load_index === undefined ||
        event.page_load_index === context.pageLoadIndex,
    )
    .slice()
    .sort((a, b) => (a.sequence ?? 0) - (b.sequence ?? 0));
}

/** Events whose type starts with the family prefix. */
export function eventsOfFamily(
  events: readonly RawGameEvent[],
  family: string,
): RawGameEvent[] {
  return events.filter((event) => event.event_type.startsWith(family));
}

/** Events of one exact type. */
export function eventsOfType(
  events: readonly RawGameEvent[],
  type: string,
): RawGameEvent[] {
  return events.filter((event) => event.event_type === type);
}

/** Metadata field read with a type guard (undefined when absent). */
export function meta<T>(event: RawGameEvent, key: string): T | undefined {
  const value = event.metadata?.[key];

  return value === undefined ? undefined : (value as T);
}

/** Events carrying a given `opportunity_id` in their metadata. */
export function eventsOfOpportunity(
  events: readonly RawGameEvent[],
  opportunityId: string,
): RawGameEvent[] {
  return events.filter(
    (event) => meta<string>(event, 'opportunity_id') === opportunityId,
  );
}

export function sequencesOf(events: readonly RawGameEvent[]): number[] {
  return events
    .map((event) => event.sequence)
    .filter((sequence): sequence is number => typeof sequence === 'number');
}

/** Test-only escape hatch. */
export function resetFeatureExtractors() {
  extractors.clear();
}
