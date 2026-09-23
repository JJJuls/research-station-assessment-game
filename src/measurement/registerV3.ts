/**
 * M01–M26 implementation register v3 (Station 080, Unit 1).
 *
 * The machine-readable, versioned register of the owner-approved 26-item
 * scope (`FABLE-M01-M26-IMPLEMENTATION-INSTRUCTIONS.md`, 22 September 2026).
 * One entry per item: source-item identity (instrument and item NUMBER only —
 * the exact wording never enters the game bundle; it lives in
 * `docs/verification/station-080-m26/M01-M26-IMPLEMENTATION-REGISTER.md`),
 * the approved target design, the primary and companion FEATURE contracts
 * the extractor must reproduce, and the AS-BUILT route (opportunity ids,
 * windows, event families) the coverage schedule derives from.
 *
 * Versioning rule: an item whose `route_version` is `'v2-ledger'` still
 * runs the evidence-led pilot v2 route (its route is read from the frozen
 * v2 ledger, never re-typed here, so the legacy record cannot drift). An
 * item unit that lands the v3 design replaces the route with an explicit
 * `'v3'` route and sets `implementation_status` accordingly. Legacy records
 * keep their old versions; no obsolete item is reactivated.
 *
 * PURE module (no Phaser, no import.meta). Every identifier is PROVISIONAL
 * (`proto_*` / `secondary_*`) — never a canonical event name; every feature
 * is a prototype output, never a validated score, weight or cut score. A
 * denominator of zero means no score, never a behavioural zero.
 */
import {
  EVIDENCE_LEDGER,
  ledgerEntry,
  type LedgerItemId,
} from '../pilot/evidenceLedger';

export type M26ItemId = LedgerItemId;

export const M26_ITEM_IDS: readonly M26ItemId[] = EVIDENCE_LEDGER.map(
  (entry) => entry.id,
);

export type M26Group =
  | 'organisation'
  | 'productiveness'
  | 'responsibility'
  | 'information_processing'
  | 'persistence_despite_difficulty'
  | 'inappropriate_persistence';

export type M26Instrument = 'BFI-2' | 'BESSI' | 'MPS';

/** Owner-approved coverage label (specification, documentation section). */
export type CoverageLabel =
  | 'behavioural_counterpart'
  | 'retained_core'
  | 'performance_counterpart'
  | 'exploratory'
  | 'partial'
  | 'hybrid';

export type ApprovedDirection =
  | 'redesign'
  | 'revise_extend'
  | 'retain_verify'
  | 'extend_occasions'
  | 'add_task'
  | 'replace_structure'
  | 'repair_boundary'
  | 'hybrid';

export type FeatureKind =
  | 'fraction'
  | 'count'
  | 'latency_with_status'
  | 'ordinal'
  | 'criterion_event'
  | 'pair';

export interface FeatureSpec {
  feature_id: string;
  feature_version: string;
  kind: FeatureKind;
  /** What is counted (text; the extractor implements it). */
  numerator: string;
  /** Eligible denominator, or null for counts / ordinals / latencies. */
  denominator: string | null;
  /** Planned denominator (register count); null for counts / ordinals / latencies. */
  planned_denominator: number | null;
  /**
   * How the denominator forms. `planned_observations`: the experimenter
   * presents a fixed number of observations, so fewer valid ones than
   * planned is a PARTIAL score (`incomplete`). `conditional_eligibility`:
   * the denominator is the participant's own eligible events (a declined
   * loan, a challenge with no difficulty, a plot recovered first time), so
   * a smaller denominator is a COMPLETE conditional observation.
   */
  denominator_kind: 'planned_observations' | 'conditional_eligibility';
  range: string;
  /** Interpretation of a HIGHER value, in the item's own terms. */
  higher_means: string;
  /** When the feature is null (never a zero). */
  missing_rule: string;
  /** Primary or companion (companions never merge with the primary). */
  role: 'primary' | 'companion' | 'sensitivity';
}

export type RegisterZone =
  | 'dock'
  | 'station_concourse'
  | 'records_workshop'
  | 'diagnostics_laboratory'
  | 'exterior_recovery_yard'
  | 'utility_core_deck';

export interface RegisterWindow {
  id: string;
  occasion: string | null;
  zone: RegisterZone;
  episode: 1 | 2 | 3 | 4 | 5 | 6;
}

export interface RegisterRoute {
  route_version: 'v2-ledger' | 'v3';
  opportunity_ids: string[];
  windows: RegisterWindow[];
  family_prefixes: string[];
  secondary_ids: string[];
}

export type ImplementationStatus = 'planned' | 'implemented' | 'verified';

/**
 * Clustering of the item's observations (specification: "Repeated actions
 * in one episode are not independent situations"). An analyst reading the
 * features alone must be able to tell which denominators are clustered.
 */
export type Independence =
  | 'independent_occasions'
  | 'repeated_within_episode'
  | 'repeated_within_one_project'
  | 'single_episode';

export interface RegisterEntry {
  id: M26ItemId;
  group: M26Group;
  facet: string;
  source: {
    instrument: M26Instrument;
    /** Source item number in the instrument's own numbering (text). */
    item: string;
    /** Reverse-keyed on the QUESTIONNAIRE (never an instruction to reverse telemetry). */
    reverse_keyed: boolean;
  };
  coverage_label: CoverageLabel;
  direction: ApprovedDirection;
  /** Approved target design (the spec's "Implement" row, condensed). */
  target: {
    occasions: number;
    summary: string;
  };
  independence: { kind: Independence; note: string };
  features: FeatureSpec[];
  route: RegisterRoute;
  /**
   * An explicit, cited change of evidential status from the frozen v2
   * ledger (only M08 / M11 / M25 may ever carry one — the specification's
   * "add task" / "hybrid" rows); absent = the ledger's own class.
   */
  disposition_override: {
    disposition: 'PRIMARY-CANDIDATE';
    approved_by: string;
  } | null;
  implementation_status: ImplementationStatus;
  /** Route-completeness naming rule at the Utility Deck review. */
  review_naming: 'never' | 'never_entered_only';
  /** Participant-facing operational label (never an item id). */
  operational_label: string | null;
  disposition: 'PRIMARY-CANDIDATE' | 'QUESTIONNAIRE-PRIMARY';
}

const EPISODE_ZONE: Record<number, RegisterZone> = {
  1: 'station_concourse',
  2: 'records_workshop',
  3: 'diagnostics_laboratory',
  4: 'exterior_recovery_yard',
  5: 'records_workshop',
  6: 'utility_core_deck',
};

/** The as-built v2 route of an item, read from the frozen ledger. */
function v2Route(id: M26ItemId): RegisterRoute {
  const route = ledgerEntry(id).route;

  return {
    route_version: 'v2-ledger',
    opportunity_ids: [...route.opportunity_ids],
    windows: route.windows.map((window) => ({
      id: window.id,
      occasion: window.occasion,
      zone: EPISODE_ZONE[window.episode],
      episode: window.episode,
    })),
    family_prefixes: [...route.family_prefixes],
    secondary_ids: [...route.secondary_telemetry_ids],
  };
}

const FEATURE_VERSION = '1';

/**
 * Fractions whose denominator is the participant's own eligible events
 * (specification: "no encountered difficulty means no denominator",
 * "decline is not breach", "refusing the loan is not irresponsible", "two
 * first-time successes yield no failure-conditioned score", "eligible
 * unfinished components"). A smaller denominator is a complete
 * conditional observation, never a partial score.
 */
const CONDITIONAL_DENOMINATORS: ReadonlySet<string> = new Set([
  'm10_obligations_fulfilled',
  'm11_unresolved_custodies',
  'm19_continuations',
  'm20_cued_resumptions',
  'm21_restudy_revisions',
  'm23_continuations_after_failure',
]);

function fraction(
  feature_id: string,
  numerator: string,
  denominator: string,
  range: string,
  higher_means: string,
  missing_rule: string,
  role: FeatureSpec['role'] = 'primary',
): FeatureSpec {
  // The planned denominator is the leading integer of the range ("0–6",
  // "0–3 per level", "0–2") — the register's own planned count.
  const planned = /^0–(\d+)/.exec(range);

  return {
    feature_id,
    feature_version: FEATURE_VERSION,
    kind: 'fraction',
    numerator,
    denominator,
    planned_denominator: planned === null ? null : Number(planned[1]),
    denominator_kind: CONDITIONAL_DENOMINATORS.has(feature_id)
      ? 'conditional_eligibility'
      : 'planned_observations',
    range,
    higher_means,
    missing_rule,
    role,
  };
}

function count(
  feature_id: string,
  numerator: string,
  range: string,
  higher_means: string,
  missing_rule: string,
  role: FeatureSpec['role'] = 'primary',
): FeatureSpec {
  return {
    feature_id,
    feature_version: FEATURE_VERSION,
    kind: 'count',
    numerator,
    denominator: null,
    planned_denominator: null,
    denominator_kind: 'conditional_eligibility',
    range,
    higher_means,
    missing_rule,
    role,
  };
}

const NEVER_NAMED: readonly M26ItemId[] = ['M22', 'M24', 'M25', 'M26'];

const OPERATIONAL_LABELS: Partial<Record<M26ItemId, string>> = {
  M01: 'Job batches (Concourse / Workshop)',
  M02: 'Case workspace (Workshop)',
  M03: 'Press stations (Workshop)',
  M04: 'Sample cutter (Workshop)',
  M05: 'Extra jobs (Concourse / Yard)',
  M06: 'Dispatch console (Workshop)',
  M07: 'Calibration bench (Workshop)',
  M08: 'Support console (Recovery Yard)',
  M09: 'Monitor watch (Concourse)',
  M10: 'Component delivery (Concourse)',
  M11: 'Borrowed instruments (Laboratory / Recovery Yard)',
  M12: 'Quality packets (Concourse / Workshop)',
  M13: 'Conduit lattice bench (Workshop)',
  M14: 'Incident desk (Concourse)',
  M15: 'Signal case — causal model (Laboratory)',
  M16: 'Signal case — protocol (Laboratory)',
  M17: 'Signal case — transfer (Laboratory)',
  M18: 'Signal case — diagnosis (Laboratory)',
  M19: 'Valve coupling (Yard)',
  M20: 'Antenna restoration (Yard / Workshop)',
  M21: 'Manual repair (Workshop)',
  M22: 'Shift report (Workshop)',
  M23: 'Excavation plot (Yard)',
  M24: 'Magnet rig (Metal Yard)',
  M25: 'Field sensor post (Recovery Yard) / return check-in (Concourse)',
  M26: 'Channel post (Yard)',
};

interface EntryInit {
  id: M26ItemId;
  group: M26Group;
  facet: string;
  instrument: M26Instrument;
  item: string;
  reverse_keyed: boolean;
  coverage_label: CoverageLabel;
  direction: ApprovedDirection;
  occasions: number;
  summary: string;
  features: FeatureSpec[];
  /** Explicit v3 route once the item unit has landed; else the v2 ledger route. */
  route?: RegisterRoute;
  implementation_status?: ImplementationStatus;
  disposition_override?: RegisterEntry['disposition_override'];
}

const INDEPENDENCE: Record<M26ItemId, { kind: Independence; note: string }> = {
  M01: {
    kind: 'independent_occasions',
    note: 'two occasions in different episodes; three cards per occasion are not three situations',
  },
  M02: {
    kind: 'single_episode',
    note: 'six requests inside one workspace episode',
  },
  M03: {
    kind: 'independent_occasions',
    note: 'two press occasions in episodes 2 and 5',
  },
  M04: {
    kind: 'repeated_within_episode',
    note: 'two cutting jobs in the same room and episode',
  },
  M05: {
    kind: 'independent_occasions',
    note: 'two accepted jobs on different route legs',
  },
  M06: { kind: 'single_episode', note: 'one 60-second work period' },
  M07: {
    kind: 'single_episode',
    note: 'one six-stage project spanning two visits',
  },
  M08: {
    kind: 'repeated_within_episode',
    note: 'six choices in one block; cannot identify a reliable individual parameter',
  },
  M09: {
    kind: 'repeated_within_one_project',
    note: 'three checks share one accepted duty',
  },
  M10: {
    kind: 'independent_occasions',
    note: 'two separately accepted deliveries with distinct objects and recipients',
  },
  M11: { kind: 'independent_occasions', note: 'two loans in different rooms' },
  M12: {
    kind: 'independent_occasions',
    note: 'two products in different rooms; three fields per product are clustered',
  },
  M13: {
    kind: 'repeated_within_episode',
    note: 'three networks in one bench session',
  },
  M14: {
    kind: 'repeated_within_episode',
    note: 'six decisions clustered in two packets',
  },
  M15: {
    kind: 'repeated_within_episode',
    note: 'four predictions clustered in two systems',
  },
  M16: { kind: 'single_episode', note: 'six applications of one rule' },
  M17: { kind: 'single_episode', note: 'one acquisition series' },
  M18: {
    kind: 'repeated_within_episode',
    note: 'six responses clustered within three cases',
  },
  M19: {
    kind: 'repeated_within_episode',
    note: 'two challenges in the same yard visit',
  },
  M20: {
    kind: 'repeated_within_one_project',
    note: 'two returns share one project',
  },
  M21: {
    kind: 'repeated_within_episode',
    note: 'two manual cases at one bench',
  },
  M22: {
    kind: 'repeated_within_episode',
    note: 'two reports at one desk; ratings recalled after both',
  },
  M23: {
    kind: 'repeated_within_episode',
    note: 'two plots in the same yard visit',
  },
  M24: { kind: 'single_episode', note: 'one post-understanding window' },
  M25: {
    kind: 'single_episode',
    note: 'one loop task and one belief question',
  },
  M26: { kind: 'single_episode', note: 'one post-understanding window' },
};

function entry(init: EntryInit): RegisterEntry {
  const route = init.route ?? v2Route(init.id);
  const scheduled = route.opportunity_ids.length > 0;

  return {
    id: init.id,
    group: init.group,
    facet: init.facet,
    source: {
      instrument: init.instrument,
      item: init.item,
      reverse_keyed: init.reverse_keyed,
    },
    coverage_label: init.coverage_label,
    direction: init.direction,
    target: { occasions: init.occasions, summary: init.summary },
    independence: INDEPENDENCE[init.id],
    features: init.features,
    route,
    implementation_status: init.implementation_status ?? 'planned',
    review_naming: NEVER_NAMED.includes(init.id)
      ? 'never'
      : 'never_entered_only',
    operational_label: scheduled ? (OPERATIONAL_LABELS[init.id] ?? null) : null,
    disposition_override: init.disposition_override ?? null,
    // The evidential status is the frozen ledger's own class unless the
    // item carries an explicit, cited override (M08 / M11 / M25 only, once
    // their approved tasks land).
    disposition:
      init.disposition_override?.disposition ??
      (ledgerEntry(init.id).disposition_class === 'questionnaire_primary'
        ? 'QUESTIONNAIRE-PRIMARY'
        : 'PRIMARY-CANDIDATE'),
  };
}

const NO_SCORE_ZERO = 'no eligible event → null (never a behavioural zero)';

export const REGISTER_V3: readonly RegisterEntry[] = [
  entry({
    id: 'M01',
    group: 'organisation',
    facet: 'Organization',
    instrument: 'BFI-2',
    item: '18',
    reverse_keyed: false,
    coverage_label: 'behavioural_counterpart',
    direction: 'redesign',
    occasions: 2,
    // Unit 5: the approved redesign landed (storm packet batch in the
    // Concourse, return orders batch in the Records Workshop). The v2
    // six-card board family `proto_m01_board_*` keeps its v2 meaning.
    route: {
      route_version: 'v3',
      opportunity_ids: ['proto_m01_batch_o1', 'proto_m01_batch_o2'],
      windows: [
        {
          id: 'm01_batch_o1',
          occasion: 'o1',
          zone: 'station_concourse',
          episode: 1,
        },
        {
          id: 'm01_batch_o2',
          occasion: 'o2',
          zone: 'records_workshop',
          episode: 5,
        },
      ],
      family_prefixes: ['proto_m01_batch_'],
      secondary_ids: [],
    },
    implementation_status: 'implemented',
    summary:
      'Two unrelated three-job batches; direct work or optional sequencing; deliberate placements snapshotted before the first work action; partial plans and any workable order valid.',
    features: [
      fraction(
        'm01_planned_jobs',
        'jobs placed on the board before the first work action, summed over the two occasions',
        'six jobs (three per occasion) — occasions with no first work action (never opened, or opened and left before any job press) are excluded',
        '0–6',
        'more observable advance organisation',
        'no accessible occasion → null',
      ),
      count(
        'm01_plan_structure',
        'per occasion: placements, order, dependency errors and job correctness (state description)',
        'object per occasion',
        'not a score; retained separately',
        'per occasion null when not presented',
        'companion',
      ),
    ],
  }),
  entry({
    id: 'M02',
    group: 'organisation',
    facet: 'Organization',
    instrument: 'BFI-2',
    item: '3',
    reverse_keyed: true,
    coverage_label: 'behavioural_counterpart',
    direction: 'revise_extend',
    occasions: 1,
    summary:
      'Participant-created layout kept; all six cases requested once in balanced order; advance after each first answer or explicit Cannot locate; corrective feedback deferred to the end.',
    features: [
      fraction(
        'm02_correct_first_retrievals',
        'requests whose first committed answer is the requested case (Cannot locate = incorrect)',
        'six requests; an unanswered interrupted request is missing and reduces completeness',
        '0–6',
        'better functional traceability (expected opposite to raw M02)',
        'no request answered → null; partial denominators exported with completeness',
      ),
      count(
        'm02_retrieval_latency',
        'per request: focused ms from request to first answer',
        'ms per request',
        'diagnostic only',
        NO_SCORE_ZERO,
        'companion',
      ),
    ],
  }),
  entry({
    id: 'M03',
    group: 'organisation',
    facet: 'Organization',
    instrument: 'BFI-2',
    item: '33',
    reverse_keyed: false,
    coverage_label: 'retained_core',
    direction: 'retain_verify',
    occasions: 2,
    summary:
      'Two occasions with three tools each; movement taught beforehand; storage visible, exit open; no cleanup instruction or reward; first-departure state saved permanently.',
    features: [
      fraction(
        'm03_tools_restored',
        'tools returned to their marked home at first departure, summed over both occasions',
        'six tools; an occasion with an inaccessible object is technically invalid and excluded',
        '0–6 (0–3 per occasion)',
        'more voluntary tidying',
        'no valid occasion → null',
      ),
    ],
  }),
  entry({
    id: 'M04',
    group: 'organisation',
    facet: 'Organization',
    instrument: 'BFI-2',
    item: '48',
    reverse_keyed: true,
    coverage_label: 'behavioural_counterpart',
    direction: 'extend_occasions',
    occasions: 2,
    summary:
      'Six debris pieces across two short cutting jobs (three each); disposal optional and accessible; debris recorded at the first departure from each job; later cleanup never rewrites it.',
    features: [
      fraction(
        'm04_undisposed_pieces',
        'pieces not disposed at first departure, carried pieces included, summed over both jobs',
        'six pieces (three per job); a job never run is not presented',
        '0–6 (0–3 per job)',
        'more own mess left behind (lower expected Organization)',
        'no job run → null',
      ),
    ],
  }),
  entry({
    id: 'M05',
    group: 'productiveness',
    facet: 'Productiveness',
    instrument: 'BFI-2',
    item: '23',
    reverse_keyed: true,
    coverage_label: 'behavioural_counterpart',
    direction: 'redesign',
    occasions: 2,
    // Unit 6: the approved redesign landed (Vale's reading-desk lamp job in
    // the Concourse, Noor's guy-line flag job in the Recovery Yard). The v2
    // silent-fault family `proto_m05_initiation_*` keeps its v2 meaning.
    route: {
      route_version: 'v3',
      opportunity_ids: ['proto_m05_start_o1', 'proto_m05_start_o2'],
      windows: [
        {
          id: 'm05_start_o1',
          occasion: 'o1',
          zone: 'station_concourse',
          episode: 1,
        },
        {
          id: 'm05_start_o2',
          occasion: 'o2',
          zone: 'exterior_recovery_yard',
          episode: 4,
        },
      ],
      family_prefixes: ['proto_m05_start_'],
      secondary_ids: [],
    },
    implementation_status: 'implemented',
    summary:
      'Two explicitly accepted jobs; the clock starts at a visible, usable start control with no competing required task; start, explicit deferral or exit; up to 60 focused seconds per occasion.',
    features: [
      {
        feature_id: 'm05_start_latency',
        feature_version: FEATURE_VERSION,
        kind: 'latency_with_status',
        planned_denominator: null,
        denominator_kind: 'conditional_eligibility',
        numerator:
          'per accepted occasion: focused milliseconds from eligibility (accepted, start control visible and usable, no competing required task) to the first work action, plus status started | deferred | exited | cap | interrupted',
        denominator: null,
        range:
          '0–60 s per occasion with status; cap = censored, never an observed start',
        higher_means: 'greater initiation difficulty (provisional)',
        missing_rule:
          'declined occasion → not in the set; a non-start keeps its exposure and reason; never a starter-only mean',
        role: 'primary',
      },
      count(
        'm05_acceptance_exposure',
        'per occasion: offer, answer, eligibility wait, exposure by cause, control views, work completion, late start (state description)',
        'object per occasion',
        'not a score; retained separately',
        'per occasion null when not offered',
        'companion',
      ),
    ],
  }),
  entry({
    id: 'M06',
    group: 'productiveness',
    facet: 'Productiveness',
    instrument: 'BFI-2',
    item: '38',
    reverse_keyed: false,
    coverage_label: 'behavioural_counterpart',
    direction: 'redesign',
    occasions: 1,
    // Unit 7: the approved redesign landed (twelve orders in one 60 s
    // focused budget at the Records Workshop dispatch console). The v2
    // four-line family `proto_m06_dispatch_*` keeps its v2 meaning.
    route: {
      route_version: 'v3',
      opportunity_ids: ['proto_m06_work_period'],
      windows: [
        {
          id: 'm06_orders_w1',
          occasion: null,
          zone: 'records_workshop',
          episode: 2,
        },
      ],
      family_prefixes: ['proto_m06_orders_'],
      secondary_ids: [],
    },
    implementation_status: 'implemented',
    summary:
      'After practice, 12 simple orders in one standard 60-second work budget; each correct order counted once; correction consumes the same budget; explicit early stop closes the period without shortening the denominator.',
    features: [
      count(
        'm06_unique_correct_orders',
        'distinct orders completed correctly inside the 60-second budget',
        '0–12 within 60 s',
        'more useful output in equal allocated time',
        'work period never opened or technically interrupted → null',
      ),
      count(
        'm06_work_period_detail',
        'first-pass accuracy, rework count and actual stop time',
        'object',
        'diagnostic only',
        'null with the primary',
        'companion',
      ),
    ],
  }),
  entry({
    id: 'M07',
    group: 'productiveness',
    facet: 'Productiveness',
    instrument: 'BFI-2',
    item: '53',
    reverse_keyed: false,
    coverage_label: 'retained_core',
    direction: 'retain_verify',
    occasions: 1,
    summary:
      'Six-stage routine project with familiar controls; departure and later resumption allowed; scoring closes at the common route milestone (station-record closure); unfinished work never blocks the route.',
    features: [
      fraction(
        'm07_stages_completed',
        'stages completed when the common milestone closes the project',
        'six stages of an ENTERED project',
        '0–6',
        'more routine completion',
        'project never entered → null (absent), never 0',
      ),
      count(
        'm07_returns',
        'voluntary returns to the bench after a departure',
        'count',
        'diagnostic only',
        'null with the primary',
        'companion',
      ),
    ],
  }),
  entry({
    id: 'M08',
    group: 'productiveness',
    facet: 'Productiveness',
    instrument: 'BFI-2',
    item: '8',
    reverse_keyed: true,
    coverage_label: 'exploratory',
    direction: 'add_task',
    occasions: 1,
    // Unit 2: the approved controlled task landed (station support
    // console, Recovery Yard); the v2 secondary optional-job telemetry is
    // retained as descriptive context, never primary evidence.
    route: {
      route_version: 'v3',
      opportunity_ids: ['proto_m08_effort_choice'],
      windows: [
        {
          id: 'm08_effort_w1',
          occasion: null,
          zone: 'exterior_recovery_yard',
          episode: 4,
        },
      ],
      family_prefixes: ['proto_m08_effort_'],
      secondary_ids: ['secondary_m08_optional_job'],
    },
    implementation_status: 'implemented',
    disposition_override: {
      disposition: 'PRIMARY-CANDIDATE',
      approved_by:
        'FABLE-M01-M26-IMPLEMENTATION-INSTRUCTIONS.md, M08 row (Direction: Add controlled task)',
    },
    summary:
      'Practised demanding work versus a matched low-demand activity in six 15-second choices; work shows 1 or 3 station-output units (three each, counterbalanced), leisure none; payment and route access fixed.',
    features: [
      fraction(
        'm08_work_choice_fraction',
        'explicit Work choices',
        'explicit valid Work-or-Rest choices (six planned); a missing choice is neither',
        '0–6',
        'more work chosen under these offers (exploratory)',
        'no valid choice → null',
      ),
      fraction(
        'm08_work_choice_by_benefit',
        'Work choices at each displayed benefit level',
        'valid choices at that level (three planned each)',
        '0–3 per level',
        'kept separately; never summed with the primary',
        'per level null when no valid choice',
        'companion',
      ),
    ],
  }),
  entry({
    id: 'M09',
    group: 'responsibility',
    facet: 'Responsibility',
    instrument: 'BFI-2',
    item: '13',
    reverse_keyed: false,
    coverage_label: 'behavioural_counterpart',
    direction: 'extend_occasions',
    occasions: 3,
    summary:
      'Three brief watch checks at distinct route milestones after one voluntary acceptance; duty, due status and access visible; equal reminders; checks voluntary.',
    features: [
      fraction(
        'm09_due_checks_fulfilled',
        'due checks read inside their window',
        'eligible due checks (three planned); an inaccessible check is invalid and excluded',
        '0–3',
        'more follow-through on an adopted duty',
        'duty declined or never offered → null',
      ),
    ],
  }),
  entry({
    id: 'M10',
    group: 'responsibility',
    facet: 'Responsibility',
    instrument: 'BFI-2',
    item: '43',
    reverse_keyed: false,
    coverage_label: 'behavioural_counterpart',
    direction: 'extend_occasions',
    occasions: 2,
    summary:
      'Two separately accepted deliveries with distinct objects and recipients; obligation shown after interruptions; delivery or accountable delegation by the stated milestone.',
    features: [
      fraction(
        'm10_obligations_fulfilled',
        'accepted deliveries fulfilled or accountably delegated by the milestone',
        'accepted, accessible obligations (two planned); decline is not breach',
        '0–2',
        'more reliability in adopted duties',
        'no accepted accessible obligation → null',
      ),
    ],
  }),
  entry({
    id: 'M11',
    group: 'responsibility',
    facet: 'Responsibility',
    instrument: 'BFI-2',
    item: '58',
    reverse_keyed: true,
    coverage_label: 'exploratory',
    direction: 'add_task',
    occasions: 2,
    // Unit 3: the approved task landed — Kai's field probe (Laboratory,
    // episode 3) and Noor's torque driver (Recovery Yard, episode 4); the
    // v2 seal-obligation telemetry stays descriptive, never primary.
    route: {
      route_version: 'v3',
      opportunity_ids: ['proto_m11_custody_lab', 'proto_m11_custody_yard'],
      windows: [
        {
          id: 'm11_custody_lab',
          occasion: 'lab',
          zone: 'diagnostics_laboratory',
          episode: 3,
        },
        {
          id: 'm11_custody_yard',
          occasion: 'yard',
          zone: 'exterior_recovery_yard',
          episode: 4,
        },
      ],
      family_prefixes: ['proto_m11_custody_'],
      secondary_ids: ['secondary_m11_seal_obligation'],
    },
    implementation_status: 'implemented',
    disposition_override: {
      disposition: 'PRIMARY-CANDIDATE',
      approved_by:
        'FABLE-M01-M26-IMPLEMENTATION-INSTRUCTIONS.md, M11 row (Direction: Add task)',
    },
    summary:
      'Two borrowed-instrument occasions in different rooms; ownership and return options clear; return, named handover or departure with unresolved custody; objects disjoint from M03 and M04.',
    features: [
      fraction(
        'm11_unresolved_custodies',
        'accepted custodies still unresolved at first departure',
        'accepted, accessible custodies (two planned); refusing the loan is not irresponsible',
        '0–2',
        'more unresolved stewardship (aligns with raw M11; lower Responsibility)',
        'no accepted accessible custody → null',
      ),
      count(
        'm11_custody_records',
        'per occasion: offer, answer, accessibility, resolution before departure (method, recipient), owner and return-point encounters while carrying, late handover after departure',
        'object per occasion',
        'diagnostic only (understanding and handover records)',
        'null with the primary',
        'companion',
      ),
    ],
  }),
  entry({
    id: 'M12',
    group: 'responsibility',
    facet: 'Responsibility',
    instrument: 'BFI-2',
    item: '28',
    reverse_keyed: true,
    coverage_label: 'behavioural_counterpart',
    direction: 'redesign',
    occasions: 2,
    // Unit 8: the approved redesign landed (the storm delivery manifest in
    // the Concourse, the calibration tag sheet in the Records Workshop).
    // The v2 six-line family `proto_m12_qc_*` keeps its v2 meaning.
    route: {
      route_version: 'v3',
      opportunity_ids: ['proto_m12_check_o1', 'proto_m12_check_o2'],
      windows: [
        {
          id: 'm12_check_o1',
          occasion: 'o1',
          zone: 'station_concourse',
          episode: 1,
        },
        {
          id: 'm12_check_o2',
          occasion: 'o2',
          zone: 'records_workshop',
          episode: 2,
        },
      ],
      family_prefixes: ['proto_m12_check_'],
      secondary_ids: [],
    },
    implementation_status: 'implemented',
    summary:
      'Two products with three checkable fields and one fault each; unchecked release permitted; optional review requires an explicit matches/differs judgement per inspected field and a participant-entered correction.',
    features: [
      fraction(
        'm12_fields_verified',
        'fields explicitly judged (matches or differs) before release',
        'six fields (three per product) of released products; a packet opened but never released is missing, never 0',
        '0–6',
        'more checking coverage (expected opposite to raw M12)',
        'no product released → null',
      ),
      count(
        'm12_detection_and_correction',
        'per product: judgement accuracy, faulty field detected, correction attempted, correction successful (participant-entered value equals the reference)',
        'object per product',
        'kept separately from coverage',
        'null with the primary',
        'companion',
      ),
    ],
  }),
  entry({
    id: 'M13',
    group: 'information_processing',
    facet: 'Information Processing',
    instrument: 'BESSI',
    item: '22',
    reverse_keyed: false,
    coverage_label: 'performance_counterpart',
    direction: 'extend_occasions',
    occasions: 3,
    summary:
      'Three independently keyed network puzzles with different structures and a matched alternate form; first committed solution saved; Cannot solve retained; later learning never overwrites the first answer.',
    features: [
      fraction(
        'm13_first_solutions',
        'networks fully solved on the first submission',
        'three networks; Cannot solve counts as an incorrect first response; an interrupted network is missing',
        '0–3',
        'better sampled puzzle performance',
        'no network answered → null',
      ),
    ],
  }),
  entry({
    id: 'M14',
    group: 'information_processing',
    facet: 'Information Processing',
    instrument: 'BESSI',
    item: '54',
    reverse_keyed: false,
    coverage_label: 'performance_counterpart',
    direction: 'extend_occasions',
    occasions: 2,
    summary:
      'Two distinct packets, each with six messages, three gauges and three keyed integration decisions that require combining sources; sources stay visible.',
    features: [
      fraction(
        'm14_correct_first_integrations',
        'keyed integration decisions whose first committed answer is correct',
        'six decisions (three per packet)',
        '0–6',
        'more accurate integration',
        'no decision answered → null; by-packet results exported separately',
      ),
    ],
  }),
  entry({
    id: 'M15',
    group: 'information_processing',
    facet: 'Information Processing',
    instrument: 'BESSI',
    item: '86',
    reverse_keyed: false,
    coverage_label: 'performance_counterpart',
    direction: 'extend_occasions',
    occasions: 2,
    summary:
      'Two novel, independently authored causal systems; after exploration and a committed model, two unseen intervention predictions per system; initial model and predictions preserved before feedback. The cipher contributes no primary score.',
    features: [
      fraction(
        'm15_correct_first_predictions',
        'unseen intervention predictions whose first committed answer is correct',
        'four predictions (two per system)',
        '0–4',
        'better understanding of the sampled relations',
        'no prediction answered → null; model correctness kept separately',
      ),
    ],
  }),
  entry({
    id: 'M16',
    group: 'information_processing',
    facet: 'Information Processing',
    instrument: 'BESSI',
    item: '118',
    reverse_keyed: false,
    coverage_label: 'performance_counterpart',
    direction: 'replace_structure',
    occasions: 1,
    summary:
      'Two identical-in-structure teaching examples for everyone, then six unseen applications of a genuinely new rule; instructions available; corrective feedback only after all six first responses.',
    features: [
      fraction(
        'm16_correct_first_applications',
        "applications whose first committed response is correct (Don't know = incorrect)",
        'six applications; interrupted applications are missing',
        '0–6',
        'better transfer of the taught rule',
        'no application answered → null',
      ),
    ],
  }),
  entry({
    id: 'M17',
    group: 'information_processing',
    facet: 'Information Processing',
    instrument: 'BESSI',
    item: '150',
    reverse_keyed: false,
    coverage_label: 'performance_counterpart',
    direction: 'replace_structure',
    occasions: 1,
    summary:
      'Two uncoached baseline probes, twelve feedback learning trials and two transfer probes; first attainment = three consecutive correct learning responses; all twelve trials always run; material distinct from M16.',
    features: [
      {
        feature_id: 'm17_criterion_trial',
        feature_version: FEATURE_VERSION,
        kind: 'criterion_event',
        planned_denominator: null,
        denominator_kind: 'conditional_eligibility',
        numerator:
          'index of the learning trial ending the first run of three consecutive correct responses, with attained = true; no attainment → 12 with attained = false (censored)',
        denominator: null,
        range:
          '3–12 with attained flag; twelve administered without attainment = (12, false, censored); early exit before attainment = incomplete, never non-attainment',
        higher_means:
          'earlier attainment provisionally means faster acquisition; the pair is never flattened',
        missing_rule:
          'attainment reached within the administered learning trials is reported even after an early exit (complete_sequence = false); fewer than twelve learning responses WITHOUT attainment → incomplete (null value, partial sequence exported)',
        role: 'primary',
      },
      count(
        'm17_sequence_baseline_transfer',
        'the full first-response correctness sequence (baseline 2, learning 12, transfer 2), each phase kept separately, with feedback exposure and help',
        'object',
        'diagnostic only; never combined with the criterion pair',
        'no trial answered → null',
        'companion',
      ),
    ],
  }),
  entry({
    id: 'M18',
    group: 'information_processing',
    facet: 'Information Processing',
    instrument: 'BESSI',
    item: '182',
    reverse_keyed: false,
    coverage_label: 'performance_counterpart',
    direction: 'extend_occasions',
    occasions: 3,
    summary:
      'Three independent fault cases with discriminating tests; for each, a first diagnosis and a keyed prediction of one observable consequence before feedback; independent truth key.',
    features: [
      fraction(
        'm18_correct_first_diagnoses',
        'cases whose first committed diagnosis is correct (Cannot solve = incorrect)',
        'three cases',
        '0–3',
        'stronger sampled diagnostic performance',
        'no case answered → null',
      ),
      fraction(
        'm18_correct_consequence_predictions',
        'cases whose first committed consequence prediction is correct',
        'three cases',
        '0–3',
        'companion; never combined with the diagnosis count',
        'no prediction answered → null',
        'companion',
      ),
    ],
  }),
  entry({
    id: 'M19',
    group: 'persistence_despite_difficulty',
    facet: 'Persistence Despite Difficulty',
    instrument: 'MPS',
    item: 'Appendix A 1',
    reverse_keyed: false,
    coverage_label: 'behavioural_counterpart',
    direction: 'extend_occasions',
    occasions: 2,
    summary:
      'Two distinct, solvable repair challenges with a truthful resistance state; controls taught beforehand; at each first difficulty boundary, another work attempt or a voluntary stop with no progression penalty.',
    features: [
      fraction(
        'm19_continuations',
        'challenges with a further executable work attempt after the first difficulty boundary',
        'challenges on which a difficulty boundary was encountered',
        '0–2',
        'more continuation at sampled obstacles',
        'no difficulty encountered → null',
      ),
    ],
  }),
  entry({
    id: 'M20',
    group: 'persistence_despite_difficulty',
    facet: 'Persistence Despite Difficulty',
    instrument: 'MPS',
    item: 'Appendix A 2',
    reverse_keyed: false,
    coverage_label: 'behavioural_counterpart',
    direction: 'extend_occasions',
    occasions: 2,
    summary:
      'Two cued return milestones for two unfinished components of the difficult project; remaining work displayed, access immediate; no interruption after a component is completed.',
    features: [
      fraction(
        'm20_cued_resumptions',
        'cued components on which work resumes',
        'unfinished components that were cued and accessible',
        '0–2',
        'more observed return to difficult work',
        'no unfinished cued component → null; spontaneous returns kept separately',
      ),
    ],
  }),
  entry({
    id: 'M21',
    group: 'persistence_despite_difficulty',
    facet: 'Persistence Despite Difficulty',
    instrument: 'MPS',
    item: 'Appendix A 3',
    reverse_keyed: false,
    coverage_label: 'partial',
    direction: 'replace_structure',
    occasions: 2,
    summary:
      '240–320 words split into two independent manual cases; after an incorrect first application, truthful feedback and relevant restudy plus a revised application, another strategy, or exit.',
    features: [
      fraction(
        'm21_restudy_revisions',
        'initially incorrect cases followed by relevant restudy AND a revised application',
        'cases whose first application was incorrect',
        '0–2',
        'more reading re-engagement under difficulty',
        'two first-time successes → null (no failure-conditioned score)',
      ),
    ],
  }),
  entry({
    id: 'M22',
    group: 'persistence_despite_difficulty',
    facet: 'Persistence Despite Difficulty',
    instrument: 'MPS',
    item: 'Appendix A 4',
    reverse_keyed: false,
    coverage_label: 'hybrid',
    direction: 'hybrid',
    occasions: 2,
    summary:
      'Two short reports with genuine new requirements after the other PDD tasks; revision or exit; after both choices, one five-option discouragement rating per report with recall delay.',
    features: [
      fraction(
        'm22_revisions_begun',
        'reports on which a revision was begun after the new requirement',
        'reports whose requirement was presented (two planned)',
        '0–2',
        'more re-engagement after a setback',
        'no requirement presented → null',
      ),
      {
        feature_id: 'm22_discouragement_ratings',
        feature_version: FEATURE_VERSION,
        kind: 'ordinal',
        planned_denominator: null,
        denominator_kind: 'conditional_eligibility',
        numerator: 'per report: 1–5 discouragement rating plus recall delay',
        denominator: null,
        range: '1–5 per report (self-report within the game)',
        higher_means: 'more discouragement; never behavioural validation',
        missing_rule: 'missing or declined rating → null (never a midpoint)',
        role: 'companion',
      },
    ],
  }),
  entry({
    id: 'M23',
    group: 'persistence_despite_difficulty',
    facet: 'Persistence Despite Difficulty',
    instrument: 'MPS',
    item: 'Appendix A 5',
    reverse_keyed: false,
    coverage_label: 'behavioural_counterpart',
    direction: 'extend_occasions',
    occasions: 2,
    summary:
      'Two small independently keyed search plots; after each first genuine unsuccessful dig, another executable scan/dig or stop; every valid attempt kept; failure never fabricated after a correct recovery.',
    features: [
      fraction(
        'm23_continuations_after_failure',
        'plots with another executable search action after the first failed dig',
        'plots with a genuine failed dig',
        '0–2',
        'more trying again after observed failure',
        'no failed dig → null (a lucky recovery is no post-failure observation)',
      ),
    ],
  }),
  entry({
    id: 'M24',
    group: 'inappropriate_persistence',
    facet: 'Inappropriate Persistence',
    instrument: 'MPS',
    item: 'Appendix A 11',
    reverse_keyed: false,
    coverage_label: 'behavioural_counterpart',
    direction: 'repair_boundary',
    occasions: 1,
    summary:
      'Finite deck, actual depletion shown, expected-outcome test of another unchanged cast (one neutral explanation, one equivalent recheck); after demonstrated understanding, a cast, a useful alternative or exit for up to 30 focused seconds.',
    features: [
      count(
        'm24_postknowledge_casts',
        'completed casts after a passed understanding check (the first included)',
        'count under a 30 s focused cap with censor status',
        'more repetition after demonstrated depletion (candidate IP, not desirable)',
        'understanding failed or never tested → null; observed casts retained as uncertain',
      ),
      count(
        'm24_postknowledge_casts_minus_first',
        'max(count − 1, 0), predeclared sensitivity count',
        'count',
        'sensitivity only',
        'null with the primary',
        'sensitivity',
      ),
      count(
        'm24_unqualified_casts',
        'casts observed before a passed check or after a failed one (pre-knowledge, uncertain), plus switch / exit / cap status and knowledge status — preserved behaviour, never a post-knowledge score',
        'object',
        'diagnostic only',
        'rig never begun → null',
        'companion',
      ),
    ],
  }),
  entry({
    id: 'M25',
    group: 'inappropriate_persistence',
    facet: 'Inappropriate Persistence',
    instrument: 'MPS',
    item: 'Appendix A 12',
    reverse_keyed: false,
    coverage_label: 'hybrid',
    direction: 'hybrid',
    occasions: 1,
    // Unit 4: the approved hybrid task landed (field sensor post, Recovery
    // Yard; the question at Vale's return check-in, Concourse). The v2
    // questionnaire notice (`proto_m25_probe_*`, Records Workshop) keeps
    // its v2 meaning as a presentation record and is no longer an M25
    // route opportunity.
    route: {
      route_version: 'v3',
      opportunity_ids: [
        'proto_m25_calibration_loops',
        'proto_m25_normality_belief',
      ],
      windows: [
        {
          id: 'm25_loops_w1',
          occasion: null,
          zone: 'exterior_recovery_yard',
          episode: 4,
        },
        {
          id: 'm25_belief_w1',
          occasion: null,
          zone: 'station_concourse',
          episode: 5,
        },
      ],
      family_prefixes: ['proto_m25_loops_', 'proto_m25_belief_'],
      secondary_ids: [],
    },
    implementation_status: 'implemented',
    disposition_override: {
      disposition: 'PRIMARY-CANDIDATE',
      approved_by:
        'FABLE-M01-M26-IMPLEMENTATION-INSTRUCTIONS.md, M25 row (Direction: Implement hybrid task) and "M25 loops and later belief"',
    },
    summary:
      'Three required calibration loops, completion marked, optional identical repeats for up to 30 focused seconds (no futility gate); after all M24–M26 behaviour, the same five-option normality question for every exposed participant.',
    features: [
      count(
        'm25_optional_repeats',
        'optional completed repeats after the required loops',
        'count under a 30 s focused cap with censor status',
        'more optional repetition (candidate IP)',
        'loops never completed → null; required loops never counted',
      ),
      {
        feature_id: 'm25_normality_belief',
        feature_version: FEATURE_VERSION,
        kind: 'ordinal',
        planned_denominator: null,
        denominator_kind: 'conditional_eligibility',
        numerator: '1–5 normality belief (self-report within the game)',
        denominator: null,
        range: '1–5',
        higher_means:
          'stronger belief that repetition is normal; never multiplied, gated or summed with the count',
        missing_rule:
          'question not asked, unsure or declined → null with reason',
        role: 'companion',
      },
    ],
  }),
  entry({
    id: 'M26',
    group: 'inappropriate_persistence',
    facet: 'Inappropriate Persistence',
    instrument: 'MPS',
    item: 'Appendix A 13',
    reverse_keyed: false,
    coverage_label: 'behavioural_counterpart',
    direction: 'repair_boundary',
    occasions: 1,
    summary:
      'After one successful transmission uplink A is permanently disconnected and B works; expected-outcome test of unchanged retries on A (one explanation, one recheck); then A retries, switching or exit for up to 30 focused seconds.',
    features: [
      count(
        'm26_postknowledge_retries',
        'completed retries on A after a passed understanding check (the first included)',
        'count under a 30 s focused cap with censor status',
        'more known-ineffective repetition (candidate IP, not desirable)',
        'understanding failed or never tested → null; switch, exit and cap retained',
      ),
      count(
        'm26_postknowledge_retries_minus_first',
        'max(count − 1, 0), predeclared sensitivity count',
        'count',
        'sensitivity only',
        'null with the primary',
        'sensitivity',
      ),
      count(
        'm26_unqualified_retries',
        'A retries observed before a passed check or after a failed one (pre-knowledge, uncertain), plus switch / exit / cap status and knowledge status — preserved behaviour, never a post-knowledge score',
        'object',
        'diagnostic only',
        'uplink never used → null',
        'companion',
      ),
    ],
  }),
];

export function registerEntry(id: M26ItemId): RegisterEntry {
  const found = REGISTER_V3.find((candidate) => candidate.id === id);

  if (found === undefined) {
    throw new Error(`registerV3: unknown item ${id}`);
  }

  return found;
}

/** Every primary feature id in item order. */
export function primaryFeatureIds(): string[] {
  return REGISTER_V3.flatMap((item) =>
    item.features
      .filter((feature) => feature.role === 'primary')
      .map((feature) => feature.feature_id),
  );
}

/** Every scheduled opportunity id across the as-built routes. */
export function registerOpportunityIds(): string[] {
  return REGISTER_V3.flatMap((item) => item.route.opportunity_ids);
}

/** Every primary event-family prefix across the as-built routes. */
export function registerFamilyPrefixes(): string[] {
  return REGISTER_V3.flatMap((item) => item.route.family_prefixes);
}

/** The six target groupings — never a global score. */
export const REGISTER_GROUPS: readonly {
  group: M26Group;
  items: M26ItemId[];
}[] = [
  { group: 'organisation', items: ['M01', 'M02', 'M03', 'M04'] },
  { group: 'productiveness', items: ['M05', 'M06', 'M07', 'M08'] },
  { group: 'responsibility', items: ['M09', 'M10', 'M11', 'M12'] },
  {
    group: 'information_processing',
    items: ['M13', 'M14', 'M15', 'M16', 'M17', 'M18'],
  },
  {
    group: 'persistence_despite_difficulty',
    items: ['M19', 'M20', 'M21', 'M22', 'M23'],
  },
  { group: 'inappropriate_persistence', items: ['M24', 'M25', 'M26'] },
];
