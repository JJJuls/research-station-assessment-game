/**
 * The shared reload check and its H / A / U / M classifier (U24 RL-0;
 * `RELOAD-CORRECTION-SPEC-r3-exec.md` §1–§3 and §8 RL-0, under the owner's
 * ruling of 23 October 2026, decisions D-4, D-6 (i) and D-7 (i)).
 *
 * Pure: no runtime, scene, store or I/O dependency. A family's host calls
 * `computePriorLoadCheck` once per reloaded page load, before any opening,
 * with the recovered earlier-load events and the runtime's
 * `event_integrity`, and logs the result as its provisional
 * `prior_load_checked` record (D-4: provisional, never canonical). Hosts
 * and extractors then call `classifyReload` on that load's check records
 * to obtain each occasion's class and whether it may be administered.
 *
 * Boundaries (r3 §2):
 * - one record per family per load, covering every occasion or part; the
 *   other hosts read it and never write a second one;
 * - the record is never task evidence (`withoutPriorLoadChecks`): it is
 *   excluded from a family's evidence tests and `supporting_sequences`;
 * - `absentFeature` (`features/extract.ts`) is unchanged; under A the
 *   extractors take their own first-load reading instead;
 * - earlier observations stay in `prior_page_load_events`; nothing here
 *   copies, merges or counts them in the current-load row (direction g).
 */

/** The record suffix, appended to the family prefix (D-4, provisional). */
export const PRIOR_LOAD_CHECK_SUFFIX = 'prior_load_checked';

/** The four reload classes of r3 §2, decided per occasion. */
export type ReloadClass = 'H' | 'A' | 'U' | 'M';

/** The occasion key of a family without occasions. */
export const ROW_OCCASION = 'row';

/**
 * Hold-back marker details begin with "reload" (M03 and M04 recognise only
 * such details). New markers take these prefixes, and the carry-forward
 * reads only the U and M ones. M07's existing details already use the H and
 * U prefixes; other existing H-type details ("reload after the offer",
 * "reload after measured opening") carry no class here, which is harmless
 * because an H marker is never carried.
 */
export const RELOAD_HOLD_BACK_PREFIX: Readonly<
  Record<Exclude<ReloadClass, 'A'>, string>
> = {
  H: 'reload after administration',
  U: 'reload with an unverified earlier state',
  M: 'reload with a contradictory earlier check',
};

/** The current-load reasons of r3 §2 (internal; never participant text). */
export const RELOAD_REASON: Readonly<Record<ReloadClass, string>> = {
  H: 'earlier opening found',
  A: 'absence of an earlier opening established',
  U: 'earlier history not verified',
  M: 'earlier check contradictory',
};

/**
 * A malformed record stays under the callers' existing `technical_failure`
 * rules (r3 §2; §5.284, §5.290 (a)): it is held, never read as uncertain
 * history. Callers branch on `check_malformed` before the class.
 */
export const RELOAD_MALFORMED_REASON = 'check record malformed';

/** The structural part of a logged event that the check reads. */
export interface ReloadEvent {
  event_type: string;
  sequence?: number;
  metadata?: Record<string, unknown>;
}

/** The losslessness fields of the runtime's `event_integrity` that count. */
export interface ReloadHistoryIntegrity {
  first_sequence: number | null;
  sequence_gap_count: number;
  sequence_duplicate_count: number;
  recovered_from_chunks: boolean;
}

export type ReloadEventTest = (event: ReloadEvent) => boolean;

/**
 * One occasion's (or a row's) stage map, supplied by the family per r3 §4.
 * No existing record is redefined: a stage the map names "none" is omitted.
 */
export interface ReloadStageMap {
  /** Stage 1: availability or briefing. */
  briefing?: ReloadEventTest;
  /** Stage 2: on-station presentation, only where the map names a record. */
  presentation?: ReloadEventTest;
  /** Stage 3: the opening (for the M25 belief question, its display). */
  opening: ReloadEventTest;
  /** This occasion's hold-back markers; their detail decides the class. */
  holdBack: ReloadEventTest;
  /** Further named evidence flags (M25's belief and probe fields, D-4). */
  evidence?: Readonly<Record<string, ReloadEventTest>>;
}

/** The flags the record keeps for one occasion (or for the row). */
export interface PriorLoadOccasionCheck {
  prior_briefing_found: boolean;
  /** Present only where the stage map names a stage-2 record. */
  prior_presentation_found?: boolean;
  prior_opening_found: boolean;
  prior_opening_absence_established: boolean;
  /** P-1: the sequence numbers of the earlier openings found (D-4). */
  prior_opening_sequences: number[];
  evidence?: Record<string, boolean>;
}

/** The provisional `prior_load_checked` payload (D-4; never canonical). */
export interface PriorLoadCheck extends PriorLoadOccasionCheck {
  page_load_index: number;
  prior_page_load_event_count: number;
  history_continuous: boolean;
  /** Per occasion, where the task has occasions. */
  occasions?: Record<string, PriorLoadOccasionCheck>;
}

export type PriorLoadCheckInput = {
  pageLoadIndex: number;
  priorLoadEvents: readonly ReloadEvent[];
  integrity: ReloadHistoryIntegrity;
} & (
  | { stages: ReloadStageMap; occasions?: never }
  | { occasions: Readonly<Record<string, ReloadStageMap>>; stages?: never }
);

/**
 * The approved common requirement (r3 §3; §5.290 (a)): exactly these five
 * conditions. `store_evictions` counts other identities' buffers and says
 * nothing about this identity's history, so it is not read.
 */
export function reloadHistoryContinuous(
  priorLoadEvents: readonly ReloadEvent[],
  integrity: ReloadHistoryIntegrity,
): boolean {
  return (
    priorLoadEvents.length > 0 &&
    integrity.first_sequence === 1 &&
    integrity.sequence_gap_count === 0 &&
    integrity.sequence_duplicate_count === 0 &&
    integrity.recovered_from_chunks === false
  );
}

/** The class a hold-back marker's detail names, or null for any other. */
export function reloadHoldBackClass(
  detail: unknown,
): Exclude<ReloadClass, 'A'> | null {
  if (typeof detail !== 'string') {
    return null;
  }

  for (const cls of ['H', 'U', 'M'] as const) {
    if (detail.startsWith(RELOAD_HOLD_BACK_PREFIX[cls])) {
      return cls;
    }
  }

  return null;
}

/** A hold-back marker's detail: the class prefix, then the station's note. */
export function reloadHoldBackDetail(
  cls: Exclude<ReloadClass, 'A'>,
  note: string,
): string {
  return `${RELOAD_HOLD_BACK_PREFIX[cls]}: ${note}`;
}

function occasionCheck(
  stages: ReloadStageMap,
  priorLoadEvents: readonly ReloadEvent[],
  continuous: boolean,
): PriorLoadOccasionCheck {
  const openings = priorLoadEvents.filter(stages.opening);
  // D-7 (i): only an earlier U or M hold-back of this same occasion is
  // carried forward; an H marker never is.
  const carried = priorLoadEvents.some((event) => {
    if (!stages.holdBack(event)) {
      return false;
    }

    const cls = reloadHoldBackClass(event.metadata?.detail);

    return cls === 'U' || cls === 'M';
  });
  const check: PriorLoadOccasionCheck = {
    prior_briefing_found:
      stages.briefing !== undefined && priorLoadEvents.some(stages.briefing),
    prior_opening_found: openings.length > 0,
    prior_opening_absence_established:
      continuous && openings.length === 0 && !carried,
    prior_opening_sequences: sequencesOf(openings),
  };

  if (stages.presentation !== undefined) {
    check.prior_presentation_found = priorLoadEvents.some(stages.presentation);
  }

  if (stages.evidence !== undefined) {
    check.evidence = Object.fromEntries(
      Object.entries(stages.evidence).map(([name, test]) => [
        name,
        priorLoadEvents.some(test),
      ]),
    );
  }

  return check;
}

function sequencesOf(events: readonly ReloadEvent[]): number[] {
  const numbers = events
    .map((event) => event.sequence)
    .filter((sequence): sequence is number => typeof sequence === 'number');

  return [...new Set(numbers)].sort((a, b) => a - b);
}

/**
 * The reload check of a later page load. A first page load has none and
 * gets null: nothing is written. The row-level flags summarise the
 * occasions: an opening of any occasion is an opening found, and the
 * absence is established for the row only when it is for every occasion.
 */
export function computePriorLoadCheck(
  input: PriorLoadCheckInput,
): PriorLoadCheck | null {
  if (input.pageLoadIndex <= 1) {
    return null;
  }

  const prior = input.priorLoadEvents;
  const continuous = reloadHistoryContinuous(prior, input.integrity);
  const head = {
    page_load_index: input.pageLoadIndex,
    prior_page_load_event_count: prior.length,
    history_continuous: continuous,
  };

  if (input.stages !== undefined) {
    return { ...head, ...occasionCheck(input.stages, prior, continuous) };
  }

  const occasions = Object.fromEntries(
    Object.entries(input.occasions).map(([id, stages]) => [
      id,
      occasionCheck(stages, prior, continuous),
    ]),
  );
  const parts = Object.values(occasions);
  const row: PriorLoadOccasionCheck = {
    prior_briefing_found: parts.some((part) => part.prior_briefing_found),
    prior_opening_found: parts.some((part) => part.prior_opening_found),
    prior_opening_absence_established:
      parts.length > 0 &&
      parts.every((part) => part.prior_opening_absence_established),
    prior_opening_sequences: [
      ...new Set(parts.flatMap((part) => part.prior_opening_sequences)),
    ].sort((a, b) => a - b),
  };

  if (parts.some((part) => part.prior_presentation_found !== undefined)) {
    row.prior_presentation_found = parts.some(
      (part) => part.prior_presentation_found === true,
    );
  }

  return { ...head, ...row, occasions };
}

/* ------------------------------------------------------------------ *
 * Classifier
 * ------------------------------------------------------------------ */

/** Why an occasion has its class (for fixtures, components and reasons). */
export type ReloadBasis =
  | 'first_load'
  | 'no_check'
  | 'duplicate_checks'
  | 'malformed_check'
  | 'check_incoherent'
  | 'occasion_incoherent'
  | 'opening_found'
  | 'joint_hold_back'
  | 'history_discontinuous'
  | 'absence_not_established'
  | 'absence_established';

export interface OccasionReloadClass {
  /** Null on a first page load: no reload class applies. */
  class: ReloadClass | null;
  /** Only A (or a first load) is administered; H, U and M are held. */
  administration_permitted: boolean;
  basis: ReloadBasis;
  reason: string | null;
}

export interface ReloadClassification {
  page_reloaded: boolean;
  check_count: number;
  /**
   * False for a self-contradictory record, conflicting duplicates, a record
   * on a first page load or a malformed record; null without a record.
   */
  check_coherent: boolean | null;
  /**
   * The check-record part of §5.290 (a)'s `exposure_record_consistent`:
   * false for two or more records (even agreeing), a record on a first page
   * load, a self-contradictory or malformed record. The helper sees only the
   * records: an extractor still clears the flag for its current-load
   * conditions (an absence claimed beside the hold-back; an earlier opening
   * found beside an opening of this load). It never gates a sibling's
   * administration.
   */
  exposure_record_consistent: boolean;
  /** A record of another page load, or one missing an expected occasion. */
  check_malformed: boolean;
  /** Every occasion is U for the load itself (r3 §2, history-level U). */
  history_level_uncertain: boolean;
  occasions: Record<string, OccasionReloadClass>;
}

export interface ReloadClassifyInput {
  /** The current page load's index (the runtime's, not the record's). */
  pageLoadIndex: number;
  /**
   * The payloads of this load's `prior_load_checked` records of the family:
   * a `PriorLoadCheck` from the host, or a logged record's metadata, whose
   * fields are read as untrusted.
   */
  checks: readonly object[];
  /**
   * The occasions to classify; omitted for a family without occasions. A
   * subset may be passed: the record's coherence is always judged against
   * its full occasion map.
   */
  occasions?: readonly string[];
  /**
   * Occasions held together (M04's approved rule, r3 §2: an earlier cut
   * holds both jobs, since the second job's start state cannot be known).
   * An A member is held when another member is held: H beside an H member,
   * otherwise U.
   */
  jointHoldBack?: readonly (readonly string[])[];
}

type Flags = Readonly<Record<string, unknown>>;

/**
 * The `checkCoherent` rule (`m07.ts`, `m16.ts` and siblings): a record that
 * claims the absence established while the history is not continuous,
 * while an opening was found, or without an earlier record contradicts
 * itself and establishes nothing.
 */
function flagsCoherent(flags: Flags, record: Flags): boolean {
  const count = record.prior_page_load_event_count;

  return (
    flags.prior_opening_absence_established !== true ||
    (record.history_continuous === true &&
      flags.prior_opening_found === false &&
      typeof count === 'number' &&
      count > 0)
  );
}

function asFlags(value: unknown): Flags | null {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as Flags)
    : null;
}

/** The record's flags for each expected occasion, or null if one is missing. */
function occasionFlags(
  record: Flags,
  ids: readonly string[] | undefined,
): Map<string, Flags> | null {
  if (ids === undefined) {
    return new Map([[ROW_OCCASION, record]]);
  }

  const occasions = asFlags(record.occasions);
  const map = new Map<string, Flags>();

  for (const id of ids) {
    const flags = occasions === null ? null : asFlags(occasions[id]);

    if (flags === null) {
      return null;
    }

    map.set(id, flags);
  }

  return map;
}

/**
 * The row-level flags must agree, both ways, with every occasion the record
 * holds: an opening for the row exactly when one for an occasion, and the
 * absence for the row exactly when for every occasion with none found (an
 * occasion's own contradiction stays that occasion's, below).
 */
function rowAgreesWithOccasions(record: Flags): boolean {
  const occasions = asFlags(record.occasions);

  if (occasions === null) {
    return true;
  }

  const parts = Object.values(occasions).map(asFlags);

  if (parts.length === 0 || parts.some((part) => part === null)) {
    return false;
  }

  const anyFound = parts.some((part) => part?.prior_opening_found === true);
  const allEstablished = parts.every(
    (part) => part?.prior_opening_absence_established === true,
  );

  return (
    (record.prior_opening_found === true) === anyFound &&
    (record.prior_opening_absence_established === true) ===
      (allEstablished && !anyFound)
  );
}

function recordCoherent(record: Flags): boolean {
  return flagsCoherent(record, record) && rowAgreesWithOccasions(record);
}

/** Two records agree when every flag the classifier reads is identical. */
function decisionKey(record: Flags): string {
  const pick = (flags: Flags | null) =>
    flags === null
      ? null
      : [flags.prior_opening_found, flags.prior_opening_absence_established];
  const occasions = asFlags(record.occasions);

  return JSON.stringify([
    record.page_load_index,
    record.prior_page_load_event_count,
    record.history_continuous,
    pick(record),
    occasions === null
      ? null
      : Object.keys(occasions)
          .sort()
          .map((id) => [id, pick(asFlags(occasions[id]))]),
  ]);
}

function held(
  cls: Exclude<ReloadClass, 'A'>,
  basis: ReloadBasis,
): OccasionReloadClass {
  return {
    class: cls,
    administration_permitted: false,
    basis,
    reason:
      basis === 'malformed_check'
        ? RELOAD_MALFORMED_REASON
        : RELOAD_REASON[cls],
  };
}

/**
 * The class of each occasion (r3 §2), in this precedence:
 * 1. a first page load: no class; the first-load administration applies;
 * 2. history-level U: no record, or two or more records (D-6 (i), even
 *    when they agree) — every occasion U; a malformed record — every
 *    occasion held with `check_malformed` (the callers' existing
 *    `technical_failure` rule);
 * 3. a self-contradictory record: every occasion M;
 * 4. per occasion: its own flags contradictory ⇒ M; an earlier opening
 *    found ⇒ H (as M07's precedence, §5.379 (a), even beside a
 *    discontinuous history; a caller can tell that case by
 *    `history_level_uncertain`); a discontinuous history ⇒ U; the absence
 *    established ⇒ A; otherwise U (an earlier U / M hold-back of that
 *    occasion carried forward, D-7 (i));
 * 5. a joint hold-back group (M04) holds an A member beside a held member.
 * Only A is administered.
 */
export function classifyReload(
  input: ReloadClassifyInput,
): ReloadClassification {
  const ids = input.occasions ?? [ROW_OCCASION];
  const all = (
    entry: OccasionReloadClass,
  ): Record<string, OccasionReloadClass> =>
    Object.fromEntries(ids.map((id) => [id, { ...entry }]));
  const checks = input.checks as readonly Flags[];
  const reloaded = input.pageLoadIndex > 1;
  const base = {
    page_reloaded: reloaded,
    check_count: checks.length,
    check_malformed: false,
    history_level_uncertain: false,
  };

  if (!reloaded) {
    // A record on a first page load is a defect that establishes nothing;
    // there is no earlier history, so the first-load administration stands.
    return {
      ...base,
      check_coherent: checks.length === 0 ? null : false,
      exposure_record_consistent: checks.length === 0,
      occasions: all({
        class: null,
        administration_permitted: true,
        basis: 'first_load',
        reason: null,
      }),
    };
  }

  if (checks.length === 0) {
    return {
      ...base,
      check_coherent: null,
      exposure_record_consistent: true,
      history_level_uncertain: true,
      occasions: all(held('U', 'no_check')),
    };
  }

  const coherentEach = checks.every(recordCoherent);

  if (checks.length > 1) {
    const agree = new Set(checks.map(decisionKey)).size === 1;

    return {
      ...base,
      check_coherent: coherentEach && agree,
      exposure_record_consistent: false,
      history_level_uncertain: true,
      occasions: all(held('U', 'duplicate_checks')),
    };
  }

  const record = checks[0];
  const parts = occasionFlags(record, input.occasions);

  if (record.page_load_index !== input.pageLoadIndex || parts === null) {
    return {
      ...base,
      check_coherent: false,
      exposure_record_consistent: false,
      check_malformed: true,
      history_level_uncertain: true,
      occasions: all(held('U', 'malformed_check')),
    };
  }

  if (!coherentEach) {
    return {
      ...base,
      check_coherent: false,
      exposure_record_consistent: false,
      occasions: all(held('M', 'check_incoherent')),
    };
  }

  const continuous = record.history_continuous === true;
  const occasions: Record<string, OccasionReloadClass> = {};
  let occasionsCoherent = true;

  for (const [id, flags] of parts) {
    if (!flagsCoherent(flags, record)) {
      occasionsCoherent = false;
      occasions[id] = held('M', 'occasion_incoherent');
    } else if (flags.prior_opening_found === true) {
      occasions[id] = held('H', 'opening_found');
    } else if (!continuous) {
      occasions[id] = held('U', 'history_discontinuous');
    } else if (flags.prior_opening_absence_established === true) {
      occasions[id] = {
        class: 'A',
        administration_permitted: true,
        basis: 'absence_established',
        reason: RELOAD_REASON.A,
      };
    } else {
      occasions[id] = held('U', 'absence_not_established');
    }
  }

  for (const group of input.jointHoldBack ?? []) {
    const members = group.map((id) => occasions[id]?.class);

    if (members.some((cls) => cls === 'H' || cls === 'U' || cls === 'M')) {
      const cls = members.includes('H') ? 'H' : 'U';

      for (const id of group) {
        if (occasions[id]?.class === 'A') {
          occasions[id] = held(cls, 'joint_hold_back');
        }
      }
    }
  }

  return {
    ...base,
    check_coherent: occasionsCoherent,
    exposure_record_consistent: occasionsCoherent,
    history_level_uncertain: !continuous,
    occasions,
  };
}

/**
 * A family's events without its check records: the record is never task
 * evidence (r3 §2), so it never enters evidence tests or
 * `supporting_sequences`.
 */
export function withoutPriorLoadChecks<T extends { event_type: string }>(
  events: readonly T[],
  familyPrefix: string,
): T[] {
  const type = `${familyPrefix}${PRIOR_LOAD_CHECK_SUFFIX}`;

  return events.filter((event) => event.event_type !== type);
}
