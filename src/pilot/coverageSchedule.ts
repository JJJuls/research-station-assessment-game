/**
 * Pilot coverage schedule — the M01–M26 registry of the professional pilot
 * route (docs/game/PILOT-M01-M26-IMPLEMENTATION-CROSSWALK.md, Unit 1).
 *
 * PURE module (no Phaser, no import.meta): the static schedule plus the
 * derivation that turns SA-13 opportunity records into one coverage status
 * per item. The runtime bridge that reads the live validity register lives
 * in ./pilotCoverage.ts; this file is Node-importable for pure tests.
 *
 * Scientific boundary: this registry records WHETHER each scheduled
 * opportunity was encountered and how it closed. It never computes a score,
 * never compares participants, never surfaces item identifiers, traits or
 * evaluative labels to the participant, and never treats absence or failure
 * as a low value. Every identifier is provisional (`proto_*`). The item
 * identity of every scheduled opportunity is itself PROVISIONAL (see
 * `itemIdentity`): the M↔item crosswalk is an open research-owner decision.
 */

export type PilotItemId =
  | 'M01'
  | 'M02'
  | 'M03'
  | 'M04'
  | 'M05'
  | 'M06'
  | 'M07'
  | 'M08'
  | 'M09'
  | 'M10'
  | 'M11'
  | 'M12'
  | 'M13'
  | 'M14'
  | 'M15'
  | 'M16'
  | 'M17'
  | 'M18'
  | 'M19'
  | 'M20'
  | 'M21'
  | 'M22'
  | 'M23'
  | 'M24'
  | 'M25'
  | 'M26';

export const PILOT_ITEM_IDS: readonly PilotItemId[] = [
  'M01',
  'M02',
  'M03',
  'M04',
  'M05',
  'M06',
  'M07',
  'M08',
  'M09',
  'M10',
  'M11',
  'M12',
  'M13',
  'M14',
  'M15',
  'M16',
  'M17',
  'M18',
  'M19',
  'M20',
  'M21',
  'M22',
  'M23',
  'M24',
  'M25',
  'M26',
];

/**
 * Station 080 (M01–M26 run, Unit 1): the schedule is derived from the
 * versioned implementation register v3 (`src/measurement/registerV3.ts`),
 * whose as-built route is the frozen v2 ledger route until an item unit
 * lands its v3 design — so the runtime registry can never drift from the
 * register, and the legacy v2 record keeps its old version untouched.
 */
import { REGISTER_V3 } from '../measurement/registerV3';

export type PilotRouteDisposition =
  | 'PRIMARY-CANDIDATE'
  | 'SHARED-AUTHORISED'
  | 'SECONDARY-CONTEXTUAL'
  | 'QUESTIONNAIRE-PRIMARY'
  | 'MISSING'
  | 'BLOCKED';

/**
 * How the item NUMBER is bound to the opportunity — always provisional.
 * - `mission_brief`: the item identity is fixed by the research owner's
 *   decision workbook (sheet 09, evidence-led pilot v2) — exact wording
 *   recorded in the docs-side ledger.
 * - `module_header`: the only repository source is the implementing module's
 *   own header comment (M13–M18 BESSI wording; M22–M26 battery wording) —
 *   the number-to-item binding is an assumption, not a ruling.
 * - `none`: no scheduled opportunity.
 */
export type PilotItemIdentityBasis = 'mission_brief' | 'module_header' | 'none';

export type PilotZoneId =
  | 'dock'
  | 'station_concourse'
  | 'records_workshop'
  | 'diagnostics_laboratory'
  | 'exterior_recovery_yard'
  | 'utility_core_deck';

/**
 * Whether the Core console completeness review may NAME this window when it
 * was never entered. Departure-closed stopping-rule windows (M22, M24, M25,
 * M26) are never named — naming them would prompt a return and re-open a
 * decision that is itself the measured behaviour (scientific review MAJ-9).
 */
export type PilotReviewNaming = 'never_entered_only' | 'never';

export interface PilotScheduleEntry {
  item: PilotItemId;
  disposition: PilotRouteDisposition;
  itemIdentity: PilotItemIdentityBasis;
  /**
   * Provisional opportunity ids whose SA-13 records feed this item. Several
   * ids = one opportunity with matched instances/occasions.
   * Empty = no scheduled opportunity on the participant route.
   */
  opportunityIds: readonly string[];
  /** Primary event-family prefixes (pairwise disjoint across items). */
  familyPrefixes: readonly string[];
  zone: PilotZoneId | null;
  /** Participant-facing OPERATIONAL label (never an item id or evaluative word). */
  operationalLabel: string | null;
  reviewNaming: PilotReviewNaming;
}

/**
 * The schedule is DERIVED from the versioned register v3: each item's
 * as-built route (opportunity ids, windows, family prefixes) and its
 * disposition, operational label and review-naming rule come from the
 * register entry. Items still on their v2-ledger route keep exactly the
 * v2 schedule shape; the register test proves the two agree.
 */
export const PILOT_SCHEDULE: readonly PilotScheduleEntry[] = REGISTER_V3.map(
  (entry): PilotScheduleEntry => {
    const scheduled = entry.route.opportunity_ids.length > 0;

    return {
      item: entry.id,
      disposition: entry.disposition,
      itemIdentity: 'mission_brief',
      opportunityIds: [...entry.route.opportunity_ids],
      familyPrefixes: [...entry.route.family_prefixes],
      zone: scheduled ? (entry.route.windows[0]?.zone ?? null) : null,
      operationalLabel: scheduled ? entry.operational_label : null,
      reviewNaming: entry.review_naming,
    };
  },
);

/** Coverage status of one scheduled item (mission §13). */
export type PilotCoverageStatus =
  | 'pending'
  | 'open'
  | 'completed'
  | 'missing'
  | 'invalid'
  | 'censored'
  | 'not_applicable';

/** The subset of an SA-13 record the derivation needs (structural type). */
export interface CoverageRecordLike {
  opportunity_id: string;
  form: string | null;
  entered: boolean;
  completed: boolean;
  absent: boolean;
  censored: boolean;
  technical_failure: boolean;
  comprehension_failure: boolean;
  contaminated: boolean;
  invalid_reason: string | null;
  prior_exposure: readonly string[];
  validity: 'pending' | 'valid' | 'invalid' | 'missing';
}

export interface PilotOpportunityCoverage {
  opportunity_id: string;
  status: PilotCoverageStatus;
  form: string | null;
  validity: CoverageRecordLike['validity'] | 'undeclared';
  invalid_reason: string | null;
  contamination_notes: readonly string[];
}

export interface PilotItemCoverage {
  item: PilotItemId;
  disposition: PilotRouteDisposition;
  itemIdentity: PilotItemIdentityBasis;
  /**
   * Closure summary across the item's instances (least terminal wins; a
   * terminal mix reports the most conservative terminal code). This is a
   * ROUTE-COMPLETENESS summary only — never an analysis input; per-instance
   * detail is in `opportunities`.
   */
  status: PilotCoverageStatus;
  opportunities: PilotOpportunityCoverage[];
  operationalLabel: string | null;
  reviewNaming: PilotReviewNaming;
}

/**
 * Status of one opportunity from its record (null = never declared).
 * Precedence: technical/comprehension/contamination invalidity dominates
 * censoring; censoring dominates absence; completion only when valid.
 */
export function opportunityCoverageStatus(
  record: CoverageRecordLike | null,
): PilotCoverageStatus {
  if (record === null) {
    return 'pending';
  }

  if (record.validity === 'invalid') {
    return 'invalid';
  }

  if (record.censored) {
    return 'censored';
  }

  if (record.validity === 'missing') {
    return 'missing';
  }

  if (record.completed) {
    return 'completed';
  }

  return record.entered ? 'open' : 'pending';
}

const STATUS_RANK: Record<PilotCoverageStatus, number> = {
  not_applicable: 0,
  completed: 1,
  censored: 2,
  missing: 3,
  invalid: 4,
  open: 5,
  pending: 6,
};

export function deriveItemCoverage(
  entry: PilotScheduleEntry,
  records: readonly CoverageRecordLike[],
): PilotItemCoverage {
  if (entry.opportunityIds.length === 0) {
    return {
      item: entry.item,
      disposition: entry.disposition,
      itemIdentity: entry.itemIdentity,
      status: 'not_applicable',
      opportunities: [],
      operationalLabel: entry.operationalLabel,
      reviewNaming: entry.reviewNaming,
    };
  }

  const opportunities = entry.opportunityIds.map(
    (opportunityId): PilotOpportunityCoverage => {
      const record =
        records.find(
          (candidate) => candidate.opportunity_id === opportunityId,
        ) ?? null;

      return {
        opportunity_id: opportunityId,
        status: opportunityCoverageStatus(record),
        form: record?.form ?? null,
        validity: record?.validity ?? ('undeclared' as const),
        invalid_reason: record?.invalid_reason ?? null,
        contamination_notes: record
          ? record.prior_exposure.filter((note) =>
              note.startsWith('contamination:'),
            )
          : [],
      };
    },
  );

  const status = opportunities.reduce<PilotCoverageStatus>(
    (worst, opportunity) =>
      STATUS_RANK[opportunity.status] > STATUS_RANK[worst]
        ? opportunity.status
        : worst,
    'completed',
  );

  return {
    item: entry.item,
    disposition: entry.disposition,
    itemIdentity: entry.itemIdentity,
    status,
    opportunities,
    operationalLabel: entry.operationalLabel,
    reviewNaming: entry.reviewNaming,
  };
}

export function deriveCoverage(
  records: readonly CoverageRecordLike[],
): PilotItemCoverage[] {
  return PILOT_SCHEDULE.map((entry) => deriveItemCoverage(entry, records));
}

/** True when every scheduled opportunity has a terminal disposition. */
export function isTerminal(status: PilotCoverageStatus): boolean {
  return status !== 'pending' && status !== 'open';
}

/**
 * Participant-facing operational summary: counts plus the labels of
 * windows that were NEVER ENTERED and whose schedule entry permits naming
 * (`reviewNaming: 'never_entered_only'`). Entered-but-unfinished windows
 * and departure-closed stopping-rule windows are never named (MAJ-9).
 * No item ids, no validity words, no evaluative language.
 */
export function operationalCompletionSummary(
  coverage: readonly PilotItemCoverage[],
): {
  scheduled: number;
  closed: number;
  open: number;
  neverEnteredLabels: string[];
} {
  const scheduled = coverage.filter((item) => item.status !== 'not_applicable');
  // REV-MAJ-9 (scientific review round 2): stopping-rule windows
  // (reviewNaming 'never') are excluded from the participant-facing
  // open count — an "open" mention would prompt exactly the return the
  // naming rule forbids. They still close at Final Core.
  const open = scheduled.filter(
    (item) => !isTerminal(item.status) && item.reviewNaming !== 'never',
  );
  const neverEntered = open.filter(
    (item) =>
      item.reviewNaming === 'never_entered_only' &&
      item.opportunities.every(
        (opportunity) => opportunity.status === 'pending',
      ),
  );

  return {
    scheduled: scheduled.length,
    closed: scheduled.length - open.length,
    open: open.length,
    neverEnteredLabels: neverEntered.map(
      (item) => item.operationalLabel ?? 'Station task',
    ),
  };
}

/** Every route-primary family prefix, for pairwise-disjointness tests. */
export function primaryFamilyPrefixes(): readonly string[] {
  return PILOT_SCHEDULE.flatMap((entry) => entry.familyPrefixes);
}

/** Every scheduled route-primary opportunity id. */
export function scheduledOpportunityIds(): readonly string[] {
  return PILOT_SCHEDULE.flatMap((entry) => entry.opportunityIds);
}
