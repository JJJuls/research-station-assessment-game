/**
 * Feature-record types of the M01–M26 read-only extractor (Unit 1).
 *
 * A feature is a versioned prototype output derived from raw events alone.
 * Its `disposition` says why a value is present, partial or absent; `null`
 * is the only representation of "not observed" — a zero is always an
 * observed count, and a partial score (fewer valid observations than
 * planned) is exported WITH its value, numerator and denominator under
 * `incomplete` so selective early stopping is never rewarded by a
 * complete-looking score. Numerator, denominator and the planned
 * denominator are stored beside every fraction so the summary is
 * reproducible; `supporting_sequences` trace the value back to the raw
 * event sequence numbers that produced it; `closure_reason` carries the
 * window's own closure so it never has to be inferred from the disposition.
 */
import type { RawGameEvent } from '../../systems/EventLogger';
import type { ClosureReason } from '../protocol';
import type { M26ItemId } from '../registerV3';

export type FeatureDisposition =
  /** A value was observed on the planned observations (a zero is an observed zero). */
  | 'observed'
  /** The opportunity was never presented to the participant. */
  | 'not_presented'
  /** Presented and explicitly declined (never a breach, never low). */
  | 'declined'
  /** Presented, but no eligible event occurred (e.g. no difficulty, no failed dig). */
  | 'no_eligible_event'
  /** The outcome-understanding check was failed or never passed. */
  | 'understanding_failed'
  /**
   * A valid voluntary stop closed the observation (the stop itself is the
   * recorded behaviour, e.g. an explicit early stop or a step-away); the
   * value present is complete for what the stop left observable.
   */
  | 'voluntary_stop'
  /**
   * Fewer valid observations than planned (partial accuracy exported with
   * its denominator; never a complete component score).
   */
  | 'incomplete'
  /** A reload or page interruption cut the observation (evidence may lie in an earlier page load). */
  | 'interrupted'
  /** Technical failure invalidated the observation. */
  | 'technical_failure'
  /** The window is still open (non-terminal export). */
  | 'pending'
  /** The extractor for this feature is not implemented in this build. */
  | 'not_implemented';

export type FeatureValue =
  | number
  | boolean
  | null
  | Record<string, unknown>
  | (number | boolean | null)[];

/** Upper bound on `supporting_sequences` per record (keep-alive size). */
export const SUPPORTING_SEQUENCES_LIMIT = 200;

export interface FeatureRecord {
  item_id: M26ItemId;
  feature_id: string;
  feature_version: string;
  protocol_version: string;
  role: 'primary' | 'companion' | 'sensitivity';
  value: FeatureValue;
  disposition: FeatureDisposition;
  numerator: number | null;
  denominator: number | null;
  /** The register's planned denominator (null for counts / ordinals). */
  planned_denominator: number | null;
  /** Ids of the opportunities / trials the denominator includes (audit). */
  included_ids: string[];
  /** True when a cap or interruption cut the observation short. */
  censored: boolean;
  censor_reason: string | null;
  /** The window's own closure reason (null when never opened / unknown). */
  closure_reason: ClosureReason | null;
  /** Free-text reason when `value` is null (never a number). */
  missing_reason: string | null;
  /** Raw event sequence numbers this record was derived from (bounded). */
  supporting_sequences: number[];
  /** True when `supporting_sequences` was cut at the limit. */
  supporting_sequences_truncated: boolean;
  /** Companion detail kept beside the value (never merged into it). */
  components: Record<string, unknown>;
}

export interface ExtractContext {
  /** True once the Utility Deck record closure ran (terminal export). */
  finalCoreClosed: boolean;
  /** Current page load (1-based); earlier loads' events are not counted. */
  pageLoadIndex: number;
  /**
   * True when earlier page loads exist: an opportunity with no current-load
   * evidence is then `interrupted` (its evidence may be in
   * `prior_page_load_events`), never `not_presented`.
   */
  reloaded: boolean;
}

export type FeatureExtractor = (
  events: readonly RawGameEvent[],
  context: ExtractContext,
) => FeatureRecord[];
