/**
 * Summary scope — the export boundary's "absent is never zero" layer.
 *
 * `ScoringManager.computeSummary` (scoring-plan authority, untouched)
 * counts legacy event names and defaults every count to 0 / false. On a
 * route that can never emit those events a zero is NOT an observation:
 * exporting it would turn "not offered" into low-trait evidence
 * (SCIENTIFIC-AUTHORITY §13: a missing opportunity "must never be
 * converted into low trait evidence"; audit B1 / proposal P2).
 *
 * This module masks the summary AT THE EXPORT BOUNDARY ONLY:
 *
 * - every field whose feeding room family is outside the active route's
 *   scope is exported as `null` with the disposition `not_applicable`;
 * - an in-scope family whose opportunity never opened in this session is
 *   `null` / `no_opportunity` (`pending` while the session is unfinished);
 * - an in-scope family that opened but recorded no response by a terminal
 *   export is `null` / `censored`;
 * - after a reload (the summary counts the current page load only) an
 *   in-scope family without an answer in this load is `null` /
 *   `interrupted`;
 * - only `observed` fields keep their computed value.
 *
 * Composites are never partial: a field is masked as a whole by its
 * family, so no composite can be manufactured from missing inputs. No
 * formula, weight, threshold or event name changes; `getSummary()` and the
 * DEV API stay numeric. With no scope installed (legacy / developer
 * routes) the summary is exported exactly as before, labelled
 * `legacy_full`. Pure and Node-importable.
 */
import type { GameSummaryVariables } from './ScoringManager';

/** Version of the export payload contract (first explicit version). */
export const EXPORT_SCHEMA_VERSION = '2026-09.1';

/** Version of the summary scoping rules in this module. */
export const SUMMARY_SCOPE_VERSION = '2026-09.1';

/** The legacy room families that can feed summary fields. */
export type SummaryFamily =
  | 'session'
  | 'dock_control'
  | 'persistence'
  | 'responsibility'
  | 'organization'
  | 'productiveness'
  | 'consistency'
  | 'final_core';

/**
 * Disposition vocabulary. Every word except `observed` already exists in
 * the validity register / coverage schedule (validity.ts,
 * coverageSchedule.ts); `observed` is deliberately not `valid` — a legacy
 * count being observable is no claim about its scoring validity.
 */
export type SummaryDisposition =
  | 'observed'
  | 'not_applicable'
  | 'no_opportunity'
  | 'censored'
  | 'interrupted'
  | 'pending';

export interface SummaryScope {
  /** Scope label exported as `summary_scope`. */
  id: string;
  /** Families the active route can offer at all. */
  applicable: readonly SummaryFamily[];
}

/** Evidence that an in-scope family's opportunity opened / was answered. */
const FAMILY_EVIDENCE: Partial<
  Record<
    SummaryFamily,
    { opened: readonly string[]; answered: readonly string[] }
  >
> = {
  dock_control: {
    opened: ['dock_tutorial_opened'],
    // The check-in is resolved by exactly one of these two answers; the
    // other control fields are observed sub-behaviours of a resolved
    // check-in (false = genuinely not done), never of an unresolved one.
    answered: ['dock_tutorial_completed', 'dock_tutorial_skipped'],
  },
};

const SESSION_FIELDS = new Set([
  'participant_id',
  'game_session_id',
  'condition',
  'game_version',
  'completed',
  'elapsed_seconds',
  'objective_completed',
]);

const PERSISTENCE_FIELDS = new Set([
  'game_persistence_total',
  'game_difficulty_persistence',
  'game_uncertainty_persistence',
  'game_inappropriate_persistence',
  'failure_adaptation_index',
  'blind_retry_count',
  'strategy_revision_count',
  'abandonment_count',
  'manual_or_feedback_used',
]);

/** The family that feeds a summary field (by the contract's own prefixes). */
export function familyOf(field: string): SummaryFamily {
  if (SESSION_FIELDS.has(field) || field.startsWith('data_quality_')) {
    return 'session';
  }

  if (PERSISTENCE_FIELDS.has(field)) {
    return 'persistence';
  }

  for (const [prefix, family] of [
    ['control_', 'dock_control'],
    ['responsibility_', 'responsibility'],
    ['organization_', 'organization'],
    ['productiveness_', 'productiveness'],
    ['consistency_', 'consistency'],
    ['final_core_', 'final_core'],
  ] as const) {
    if (field.startsWith(prefix)) {
      return family;
    }
  }

  // An unknown field is never silently exported as an observation.
  return 'persistence';
}

export type ScopedSummaryValue = string | number | boolean | null;

export interface ScopedSummary {
  summary: Record<string, ScopedSummaryValue>;
  summary_dispositions: Record<string, SummaryDisposition>;
  summary_scope: string;
  summary_scope_version: string;
}

export interface SummaryScopeInput {
  summary: GameSummaryVariables;
  scope: SummaryScope | null;
  /** Event types of the CURRENT page load (what the summary counted). */
  eventTypes: Iterable<string>;
  /**
   * True when earlier page loads exist (page_load_index > 1): the summary
   * counts this load only, so an in-scope family without an answer in this
   * load is `interrupted` — its evidence, if any, lies in
   * `prior_page_load_events`, never in a zero here.
   */
  reloaded: boolean;
  /** True for a terminal export (completed / error), false while running. */
  terminal: boolean;
}

export function applySummaryScope(input: SummaryScopeInput): ScopedSummary {
  const { summary, scope, terminal } = input;
  const seen = new Set(input.eventTypes);
  const values: Record<string, ScopedSummaryValue> = {};
  const dispositions: Record<string, SummaryDisposition> = {};

  for (const [field, value] of Object.entries(summary)) {
    const disposition = dispositionOf(
      familyOf(field),
      scope,
      seen,
      terminal,
      input.reloaded,
    );

    dispositions[field] = disposition;
    values[field] =
      disposition === 'observed' ? (value as ScopedSummaryValue) : null;
  }

  return {
    summary: values,
    summary_dispositions: dispositions,
    summary_scope: scope?.id ?? 'legacy_full',
    summary_scope_version: SUMMARY_SCOPE_VERSION,
  };
}

function dispositionOf(
  family: SummaryFamily,
  scope: SummaryScope | null,
  seen: Set<string>,
  terminal: boolean,
  reloaded: boolean,
): SummaryDisposition {
  if (scope === null || family === 'session') {
    return 'observed';
  }

  if (!scope.applicable.includes(family)) {
    return 'not_applicable';
  }

  const evidence = FAMILY_EVIDENCE[family];

  if (evidence === undefined) {
    return 'observed';
  }

  if (evidence.answered.some((type) => seen.has(type))) {
    return 'observed';
  }

  if (reloaded) {
    return 'interrupted';
  }

  if (!terminal) {
    return 'pending';
  }

  return evidence.opened.some((type) => seen.has(type))
    ? 'censored'
    : 'no_opportunity';
}

/**
 * Return-URL encoding: an observed value as before; a non-observed field
 * carries its disposition word — never a number, never the string "null".
 */
export function scopedSummaryForUrl(
  scoped: ScopedSummary,
): Record<string, string | number | boolean> {
  const out: Record<string, string | number | boolean> = {};

  for (const [field, value] of Object.entries(scoped.summary)) {
    out[field] = value === null ? scoped.summary_dispositions[field] : value;
  }

  return out;
}
