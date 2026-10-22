/**
 * Independent M07 recount — U24 Part A, verification plan rows A-10 / A-11
 * (layer R for M07) under plan §R.1.
 *
 * Independence (each rule is checked by a static case in
 * `e2e/m07_project.spec.ts`, never merely asserted):
 * 1. this module imports nothing — in particular nothing from `src/`, from
 *    an `e2e/*Helpers.ts` module or from another recount;
 * 2. `recountM07` receives only the four raw inputs of `RecountInput`
 *    copied out of an export by the spec; it never sees a derived block of
 *    the export, a window's stored closure snapshot or the scoring-plan
 *    totals, and the derived-block key names do not occur in this file;
 * 3. every rule below is hand-transcribed from the register, the addendum
 *    and the owner's rulings into `RECOUNT_SPEC`, each with its citation
 *    (file:line at the start commit b46b76b, or the ruling document); no
 *    constant is imported from `registerV3.ts` or from an extractor;
 * 4. event-level fields as logged (`event_type`, `sequence`,
 *    `page_load_index`, the logged `stage`, `exit_state`, `detail`,
 *    `entry_state_version`, `opportunity_id` and the check's flags) are
 *    read as raw data; everything above the event — entry, presentation,
 *    the stage count, the returns, the reload reading, the disposition and
 *    its reason — is recomputed here;
 * 5. the comparison with production happens in the spec, never here.
 *
 * Author independence is limited (plan §R.4 gap 4): the same writer
 * session wrote the production extractor. The Fable review and Part C's
 * separately written recount are the mitigation.
 */

export interface RecountEvent {
  event_type: string;
  sequence?: unknown;
  page_load_index?: unknown;
  game_session_id?: unknown;
  metadata?: Record<string, unknown>;
}

/** The only input of the recount (plan §R.1 rule 2). */
export interface RecountInput {
  raw_events: readonly RecountEvent[];
  prior_page_load_events: readonly RecountEvent[];
  page_load_index: number;
  game_session_id: string;
}

export type RecountDisposition =
  | 'observed'
  | 'not_presented'
  | 'no_eligible_event'
  | 'pending'
  | 'interrupted'
  | 'technical_failure';

/**
 * The recount's own reason vocabulary (never production's text): the spec
 * maps each to the scripted expectation and to a marker of production's
 * reason.
 */
export type RecountReason =
  | 'observed_at_milestone'
  | 'never_presented'
  | 'presented_not_entered'
  | 'project_open'
  | 'earlier_opening_found'
  | 'earlier_review_closure'
  | 'absence_not_established'
  | 'integrity';

export interface RecountRow {
  feature_id: 'm07_stages_completed' | 'm07_returns';
  value: number | null;
  numerator: number | null;
  denominator: number | null;
  disposition: RecountDisposition;
  reason: RecountReason;
  /** The integrity rule that failed (reason `integrity` only). */
  integrity_rule: string | null;
}

export interface M07RecountResult {
  game_session_id: string;
  page_load_index: number;
  reloaded: boolean;
  rows: [RecountRow, RecountRow];
  /** Which RECOUNT_SPEC rule decided the row. */
  decided_by: string;
}

/**
 * The transcribed rules, each with its source. Paths are repository paths
 * at b46b76b unless they name a U24 package document (the owner's ruling
 * of 21 October 2026 and its prepared package,
 * `C:\Users\Juls\.codex\visualizations\2026\10\21\u24-end-to-end`) or the
 * owner's closeout amendment of 22 October 2026 (verbatim in the UNIT-LOG
 * "U24 Part A closeout amendment"; cited as AMENDMENT-22-10 §n).
 */
export const RECOUNT_SPEC = {
  family: {
    prefix: 'proto_m07_calibration_',
    opportunity: 'proto_m07_calibration_project',
    cite: 'docs/verification/evidence-led-pilot-v2/M01-M26-IMPLEMENTATION-LEDGER.md:142 (opportunity id and family prefix); docs/game/rooms/12-workshop-return.md:74',
  },
  administration: {
    current: 'm07-calibration-v2',
    superseded: 'm07-calibration-v1',
    rule: 'every M07 entry record carries m07-calibration-v2; a v1 record is technical_failure "superseded administration"',
    cite: 'U24-OWNER-DECISIONS-D-U24-1.md §1 M07-4 (a), ruled a in U24-OWNER-RULING.md §1',
  },
  value: {
    numerator: 'stages completed when the common milestone closes the project',
    denominator: 6,
    rule: 'stages / 6 of an ENTERED project at the closing milestone; 0–6',
    cite: 'src/measurement/registerV3.ts:815-822; docs/verification/station-080-m26/M01-M26-IMPLEMENTATION-REGISTER.md:89 (REG §2 row M07); docs/verification/station-080-m26/SCORING-AND-EVENT-ADDENDUM-v1.md:1482',
  },
  entry: {
    rule: 'entered = the participant opened the bench at least once in either phase (`opportunity_opened`, never written by the review); opened and left at 0 = an observed 0/6',
    cite: 'U24-OWNER-DECISIONS-D-U24-1.md §1 M07-1 (a); U24-OWNER-RULING.md §1',
  },
  never_entered: {
    rule: 'never entered ⇒ null, never 0; presented and never entered ⇒ no_eligible_event, reason presented_not_entered; never presented ⇒ not_presented; never declined',
    cite: 'src/measurement/registerV3.ts:821; U24-OWNER-DECISIONS-D-U24-1.md §1 M07-2 (a); IMPLEMENTATION-MATRIX.md:47 ("Non-engagement = absent/missing")',
  },
  presentation: {
    rule: 'the bench is presented in this load when the end opportunity was presented on the return (`end_presented`) or the bench was opened; the review closure alone is not a presentation',
    cite: 'docs/game/rooms/12-workshop-return.md:74 (end presented on entry); U24-OWNER-DECISIONS-D-U24-1.md §1 M07-2 (a) ("never presented (the route never reached the Workshop)")',
  },
  milestone: {
    rule: 'the project closes at the station-record closure at the Utility Deck review: an entered project closes as an observed value (completed, or completion false); a never-entered bench closes absent (`closed_at_review`) and is never opened or completed; before the closure the row is pending',
    cite: 'docs/verification/station-080-m26/M01-M26-IMPLEMENTATION-REGISTER.md:7291 (REG §5.3); U24-OWNER-DECISIONS-D-U24-1.md §1 M07-3 (a), M07-4 (a)',
  },
  stages: {
    rule: 'stages are counted from the `stage_advanced` act records of the opened project, in sequence order, each the next stage; a duplicate or out-of-order stage, a stage above 6, or a stage outside the open project is technical_failure',
    cite: 'U24-VERIFICATION-AND-EVIDENCE-PLAN.md row A-4; REG §5.259 convention as applied in M01-M26-IMPLEMENTATION-REGISTER.md:9965 (§5.284)',
  },
  ordering: {
    rule: 'an outcome that depends on event order is read only when every family event of the load carries a usable sequence (a safe integer ≥ 1) and no two share one; otherwise technical_failure; gaps are normal',
    cite: 'M01-M26-IMPLEMENTATION-REGISTER.md:9965-9971 (§5.284, the §5.259 convention)',
  },
  current_load: {
    rule: 'only the current page load counts; earlier loads are never counted in the row',
    cite: 'docs/architecture/STATE-AND-SESSION-CONTINUITY.md:72-89 (§4); M01-M26-IMPLEMENTATION-REGISTER.md:10186-10190 (§5.290 (a): the current page load only)',
  },
  reloaded: {
    rule: 'a load is reloaded when its page_load_index is above 1',
    cite: 'U24-VERIFICATION-AND-EVIDENCE-PLAN.md "Part A reload cases" ("Once per reloaded page load (page_load_index > 1)")',
  },
  check_page_load: {
    rule: 'a check record of this load whose own page_load_index field differs from the load it was logged in is a technical-integrity failure (never an established absence, never a hold-back reason); records stamped with another load stay excluded as before',
    cite: 'AMENDMENT-22-10 §6 ("Fix the reported check-payload page-load inconsistency using explicit technical-integrity handling"); Fable review finding 5',
  },
  hold_back: {
    rule: 'a held-back bench is never re-run: the technical-failure record whose detail begins `reload` with no opening of this load ⇒ interrupted; it takes precedence over everything after the check integrity. Its reason is read from the earlier loads, never from the record: an opening in prior_page_load_events ⇒ an earlier opening found (also after a completed earlier load); otherwise, with the absence established, an earlier review closure of the unopened bench (`window_closed`, exit closed_at_review) in prior_page_load_events ⇒ an earlier review closure; otherwise ⇒ the absence of an earlier opening not established',
    cite: 'M01-M26-IMPLEMENTATION-REGISTER.md:7335-7340 (§5.14), :9668-9677 (§5.270 D-10), :9972-9987 (§5.285 the detail prefix); AMENDMENT-22-10 §3 (uncertain history: "do not administer a new M07 opportunity", the unestablished-history reason) and §4 ("A verified earlier station-review closure of an unopened bench is terminal", a distinct reason)',
  },
  established_absence: {
    rule: 'the absence of an earlier opening is established only when the check records of the load say so with their flags agreeing (established, continuous, no opening found, at least one earlier record); two checks in one load establish nothing; the load is then read exactly as a first load',
    cite: 'M01-M26-IMPLEMENTATION-REGISTER.md:10209-10216 and :10224-10230 (§5.290 (a): "two checks … establish nothing"); RA-1, U24-OWNER-RULING.md §4; U24-VERIFICATION-AND-EVIDENCE-PLAN.md RX-7',
  },
  unestablished_absence: {
    rule: 'a reloaded load without an established absence (no check, a discontinuous history, a found opening, a contradictory check) ⇒ interrupted, "the absence of an earlier opening not established", read before any position is compared; missing or insufficient history never becomes a confirmed absence',
    cite: 'M01-M26-IMPLEMENTATION-REGISTER.md:10216-10229 (§5.290 (a)); RA-1; U24-CONTRACT.md Part A item 9; U24-VERIFICATION-AND-EVIDENCE-PLAN.md RX-6, RX-8',
  },
  check_fields: {
    rule: 'the check: page_load_index, prior_page_load_event_count, prior_opening_found (an earlier opening of either phase), prior_end_presented_found (an earlier end_presented; RA-1 adaptation of prior_briefing_found), history_continuous (at least one earlier record; first sequence 1, no gap, no duplicate; the store meta readable), prior_opening_absence_established (no opening found AND continuous AND no earlier hold-back record — a detail beginning `reload` — that an earlier review closure does not explain: an earlier load that could not establish the absence leaves it unestablished for every later load). A review closure explains only a hold-back whose detail is the review-closure detail (review_closure_detail) and only when an earlier `window_closed` with exit closed_at_review is on record; an intervening unverified-history hold-back stays unexplained',
    cite: 'M01-M26-IMPLEMENTATION-REGISTER.md:10200-10209 (§5.290 (a)); U24-VERIFICATION-AND-EVIDENCE-PLAN.md "The M07 adaptation"; AMENDMENT-22-10 §3 ("when absence of an earlier opening cannot be established, do not administer"), the writer\'s reading recorded as REG §5.379; OWNER-DECISIONS-22-10-R2 §2 ("Narrow the review-closure explanation to hold-backs whose detail actually identifies that closure")',
    review_closure_detail: 'reload after a review closure: bench not reopened',
    review_closure_detail_cite:
      'M01-M26-IMPLEMENTATION-REGISTER.md §4 "Unit 24-A" item (1) (the three hold-back details, transcribed from the register text, not from the code)',
  },
  returns: {
    feature: 'm07_returns',
    rule: 'voluntary returns to the bench after a departure (a count, companion, diagnostic only); null with the primary',
    cite: 'src/measurement/registerV3.ts:823-829',
  },
  technical: {
    rule: 'a technical-failure record that is not the reload hold-back invalidates the observation (technical_failure, never a value); two hold-back records in one load are not one hold-back',
    cite: 'src/measurement/features/types.ts:44-45 (the disposition vocabulary); U24-CONTRACT.md Part A item 9',
  },
} as const;

const F = RECOUNT_SPEC.family.prefix;

function kind(event: RecountEvent): string | null {
  return event.event_type.startsWith(F)
    ? event.event_type.slice(F.length)
    : null;
}

function field(event: RecountEvent, key: string): unknown {
  return event.metadata === undefined ? undefined : event.metadata[key];
}

function usableSequence(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 1;
}

function rowsOf(
  disposition: RecountDisposition,
  reason: RecountReason,
  stagesValue: number | null,
  returnsValue: number | null,
  integrityRule: string | null = null,
): [RecountRow, RecountRow] {
  const observed = disposition === 'observed';

  return [
    {
      feature_id: 'm07_stages_completed',
      value: observed ? stagesValue : null,
      numerator: observed ? stagesValue : null,
      denominator: observed ? RECOUNT_SPEC.value.denominator : null,
      disposition,
      reason,
      integrity_rule: integrityRule,
    },
    {
      feature_id: 'm07_returns',
      value: observed ? returnsValue : null,
      numerator: null,
      denominator: null,
      disposition,
      reason,
      integrity_rule: integrityRule,
    },
  ];
}

/** What the bench's act records of one load say, before any disposition. */
interface BenchStory {
  presented: boolean;
  opened: boolean;
  stages: number;
  returns: number;
  closedAbsent: boolean;
  closedWithValue: boolean;
  completionRecord: boolean;
  broken: string | null;
}

/**
 * Walks the family records of the load in sequence order and tells the
 * bench's story (RECOUNT_SPEC.entry, .presentation, .stages, .milestone,
 * .returns, .technical). The first broken rule ends the story.
 */
function tell(records: readonly RecountEvent[]): BenchStory {
  const story: BenchStory = {
    presented: false,
    opened: false,
    stages: 0,
    returns: 0,
    closedAbsent: false,
    closedWithValue: false,
    completionRecord: false,
    broken: null,
  };
  let departedSinceVisit = false;
  const byOrder = [...records].sort(
    (a, b) => (a.sequence as number) - (b.sequence as number),
  );

  for (const record of byOrder) {
    const closed = story.closedAbsent || story.closedWithValue;
    const what = kind(record);

    if (what === 'end_presented') {
      story.presented = true;
    } else if (what === 'opportunity_opened') {
      if (story.opened || closed) {
        story.broken = 'opening after an opening or after the closure';
        break;
      }

      story.opened = true;
      story.presented = true;
    } else if (what === 'stage_advanced') {
      const stage = field(record, 'stage');

      if (!story.opened || closed) {
        story.broken = 'stage outside the open project';
        break;
      }

      if (typeof stage !== 'number' || !Number.isSafeInteger(stage)) {
        story.broken = 'stage record without a stage number';
        break;
      }

      if (stage > RECOUNT_SPEC.value.denominator) {
        story.broken = 'stage above 6';
        break;
      }

      if (stage <= story.stages) {
        story.broken = 'duplicate stage';
        break;
      }

      if (stage > story.stages + 1) {
        story.broken = 'out-of-order stage';
        break;
      }

      story.stages = stage;
    } else if (what === 'departed') {
      departedSinceVisit = true;
    } else if (what === 'returned') {
      if (departedSinceVisit) {
        story.returns += 1;
        departedSinceVisit = false;
      }
    } else if (what === 'window_closed') {
      const exit = field(record, 'exit_state');

      if (closed) {
        story.broken = 'second closure';
        break;
      }

      if (exit === 'closed_at_review' && !story.opened) {
        story.closedAbsent = true;
      } else if (exit === 'completed' && story.opened) {
        story.closedWithValue = true;
        story.completionRecord = true;
      } else {
        story.broken = 'closure inconsistent with the entry';
        break;
      }
    } else if (what === 'technical_failure') {
      story.broken = 'technical-failure record';
      break;
    }
  }

  if (
    story.broken === null &&
    story.stages === RECOUNT_SPEC.value.denominator &&
    !story.completionRecord
  ) {
    story.broken = 'six stages without a completion record';
  }

  return story;
}

/** The reading of one check record's flags (RECOUNT_SPEC.established_absence). */
function checkSaysEstablished(record: RecountEvent): boolean {
  const count = field(record, 'prior_page_load_event_count');

  return (
    field(record, 'prior_opening_absence_established') === true &&
    field(record, 'history_continuous') === true &&
    field(record, 'prior_opening_found') === false &&
    typeof count === 'number' &&
    count > 0
  );
}

/**
 * The independent recount of `m07_stages_completed` and `m07_returns` from
 * the raw inputs alone. A cascade of the transcribed rules, in the
 * precedence the register states: the check's own load, hold-back,
 * unestablished absence, integrity, then the first-load reading.
 */
export function recountM07(input: RecountInput): M07RecountResult {
  const reloaded = input.page_load_index > 1;
  const load = input.raw_events.filter(
    (event) =>
      (event.page_load_index === undefined ||
        event.page_load_index === input.page_load_index) &&
      kind(event) !== null,
  );
  const checks = load.filter((event) => kind(event) === 'prior_load_checked');
  const openingHere = load.some(
    (event) => kind(event) === 'opportunity_opened',
  );
  const holdBackRecords = load.filter(
    (event) =>
      kind(event) === 'technical_failure' &&
      String(field(event, 'detail') ?? '').startsWith('reload'),
  ).length;
  // §5.290 (a): two checks in one load establish nothing.
  const established = checks.length === 1 && checkSaysEstablished(checks[0]);
  const earlier = (what: string, exit?: string) =>
    input.prior_page_load_events.some(
      (event) =>
        kind(event) === what &&
        (exit === undefined || field(event, 'exit_state') === exit),
    );
  const result = (
    decidedBy: keyof typeof RECOUNT_SPEC,
    rows: [RecountRow, RecountRow],
  ): M07RecountResult => ({
    game_session_id: input.game_session_id,
    page_load_index: input.page_load_index,
    reloaded,
    rows,
    decided_by: decidedBy,
  });

  // 0. The check describes this load (AMENDMENT-22-10 §6).
  if (
    checks.some(
      (event) => field(event, 'page_load_index') !== input.page_load_index,
    )
  ) {
    return result(
      'check_page_load',
      rowsOf(
        'technical_failure',
        'integrity',
        null,
        null,
        'check of another load',
      ),
    );
  }

  // 1. The hold-back (§5.14 / §5.270 / §5.285; AMENDMENT-22-10 §3, §4),
  // its reason read from the earlier loads.
  if (holdBackRecords > 0 && !openingHere) {
    if (holdBackRecords > 1) {
      return result(
        'technical',
        rowsOf('technical_failure', 'integrity', null, null, 'two hold-backs'),
      );
    }

    const reason: RecountReason = earlier('opportunity_opened')
      ? 'earlier_opening_found'
      : established && earlier('window_closed', 'closed_at_review')
        ? 'earlier_review_closure'
        : 'absence_not_established';

    return result('hold_back', rowsOf('interrupted', reason, null, null));
  }

  // 2. A reloaded load without an established absence (§5.290 (a), RA-1).
  if (reloaded && !established) {
    return result(
      'unestablished_absence',
      rowsOf('interrupted', 'absence_not_established', null, null),
    );
  }

  // 3. Administration, opportunity and ordering evidence (§5.284; M07-4).
  for (const event of load) {
    const version = field(event, 'entry_state_version');

    if (version === RECOUNT_SPEC.administration.superseded) {
      return result(
        'administration',
        rowsOf('technical_failure', 'integrity', null, null, 'v1'),
      );
    }

    if (
      version !== RECOUNT_SPEC.administration.current ||
      field(event, 'opportunity_id') !== RECOUNT_SPEC.family.opportunity
    ) {
      return result(
        'administration',
        rowsOf(
          'technical_failure',
          'integrity',
          null,
          null,
          'unknown version or opportunity',
        ),
      );
    }
  }

  const numbers = load.map((event) => event.sequence);

  if (
    !numbers.every(usableSequence) ||
    new Set(numbers).size !== numbers.length
  ) {
    return result(
      'ordering',
      rowsOf('technical_failure', 'integrity', null, null, 'sequence'),
    );
  }

  // 4. The first-load reading: the bench's story in this load.
  const story = tell(load);

  if (story.broken !== null) {
    return result(
      'stages',
      rowsOf('technical_failure', 'integrity', null, null, story.broken),
    );
  }

  if (story.closedWithValue) {
    return result(
      'value',
      rowsOf('observed', 'observed_at_milestone', story.stages, story.returns),
    );
  }

  if (story.opened) {
    return result('milestone', rowsOf('pending', 'project_open', null, null));
  }

  if (story.presented && story.closedAbsent) {
    return result(
      'never_entered',
      rowsOf('no_eligible_event', 'presented_not_entered', null, null),
    );
  }

  if (story.presented) {
    return result(
      'milestone',
      rowsOf('pending', 'presented_not_entered', null, null),
    );
  }

  return result(
    'never_entered',
    rowsOf('not_presented', 'never_presented', null, null),
  );
}

/** The fields of one reload check, as recorded or as recomputed. */
export interface M07CheckFields {
  page_load_index: unknown;
  prior_page_load_event_count: unknown;
  prior_opening_found: unknown;
  prior_end_presented_found: unknown;
  history_continuous: unknown;
  prior_opening_absence_established: unknown;
}

export interface M07CheckComparison {
  check_sequence: unknown;
  recorded: M07CheckFields;
  recomputed: M07CheckFields;
  equal: boolean;
}

const CHECK_KEYS: readonly (keyof M07CheckFields)[] = [
  'page_load_index',
  'prior_page_load_event_count',
  'prior_opening_found',
  'prior_end_presented_found',
  'history_continuous',
  'prior_opening_absence_established',
];

/**
 * The consistency assertion of plan A-10 / A-11 (RECOUNT_SPEC.check_fields):
 * recomputes every recorded check's fields from `prior_page_load_events`
 * and the current-load records logged before the check, and compares them
 * with the recorded fields. It never changes a row. Continuity also needs
 * the store fact `recovered_from_chunks`, which no raw event carries; the
 * spec passes it from the export's transport integrity block (a
 * losslessness record, never a measurement field).
 */
export function recomputeM07Checks(
  input: RecountInput,
  store: { recovered_from_chunks: boolean },
): M07CheckComparison[] {
  const checks = input.raw_events.filter(
    (event) =>
      kind(event) === 'prior_load_checked' &&
      (event.page_load_index === undefined ||
        event.page_load_index === input.page_load_index),
  );

  return checks.map((check) => {
    const before = input.raw_events.filter(
      (event) =>
        typeof event.sequence === 'number' &&
        typeof check.sequence === 'number' &&
        event.sequence < check.sequence,
    );
    const prior = input.prior_page_load_events;
    const seen = [...prior, ...before]
      .map((event) => event.sequence)
      .filter((value): value is number => typeof value === 'number');
    const distinct = new Set(seen);
    const highest = seen.length === 0 ? 0 : Math.max(...seen);
    let missing = 0;

    for (let n = 1; n <= highest; n += 1) {
      if (!distinct.has(n)) {
        missing += 1;
      }
    }

    const lowest = seen.length === 0 ? null : Math.min(...seen);
    const continuous =
      prior.length > 0 &&
      lowest === 1 &&
      missing === 0 &&
      distinct.size === seen.length &&
      !store.recovered_from_chunks;
    const openedBefore = prior.some(
      (event) => event.event_type === `${F}opportunity_opened`,
    );
    const reviewClosedBefore = prior.some(
      (event) =>
        kind(event) === 'window_closed' &&
        field(event, 'exit_state') === 'closed_at_review',
    );
    // A hold-back the earlier review closure explains is the one whose
    // detail names that closure (RECOUNT_SPEC.check_fields).
    const unexplainedHoldBackBefore = prior.some((event) => {
      const detail = String(field(event, 'detail') ?? '');

      return (
        kind(event) === 'technical_failure' &&
        detail.startsWith('reload') &&
        !(
          reviewClosedBefore &&
          detail === RECOUNT_SPEC.check_fields.review_closure_detail
        )
      );
    });
    const recomputed: M07CheckFields = {
      page_load_index: input.page_load_index,
      prior_page_load_event_count: prior.length,
      prior_opening_found: openedBefore,
      prior_end_presented_found: prior.some(
        (event) => event.event_type === `${F}end_presented`,
      ),
      history_continuous: continuous,
      prior_opening_absence_established:
        continuous && !openedBefore && !unexplainedHoldBackBefore,
    };
    const recorded = Object.fromEntries(
      CHECK_KEYS.map((key) => [key, field(check, key)]),
    ) as unknown as M07CheckFields;

    return {
      check_sequence: check.sequence,
      recorded,
      recomputed,
      equal: CHECK_KEYS.every((key) => recorded[key] === recomputed[key]),
    };
  });
}
