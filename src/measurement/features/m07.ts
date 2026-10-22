/**
 * M07 feature extractor (Station 080 U24 Part A; owner ruling of 21 October
 * 2026: D-U24-1 M07-1 to M07-4 a, clarification 2, RA-1).
 * `m07_stages_completed` = stages completed / 6 of an ENTERED project when
 * the common milestone (the station-record closure at the Utility Deck
 * review, M07-3 a) closes it; `m07_returns` = voluntary returns to the
 * bench after a departure, a companion that never enters the value (REG §2
 * row M07; `registerV3.ts` M07 entry). Read-only over the raw
 * `proto_m07_calibration_*` events of the current page load, recounted from
 * the act events — the closure snapshot is only compared, never trusted
 * alone. No error concept exists in the task: errors are declared
 * `not_defined` (MX row M07).
 *
 * Entry (M07-1 a) = the participant opened the bench (`opportunity_opened`,
 * written only by the participant's opening in `m07-calibration-v2`). An
 * entered project left at 0/6 is an observed zero. Never entered (M07-2 a):
 * presented on the return (`end_presented`) and closed at the review ⇒ null
 * `no_eligible_event` (`presented_not_entered`); never presented ⇒ null
 * `not_presented`; never `declined` (there is no refusal control), never 0.
 *
 * Reload (clarification 2; register §5.14, §5.270 (D-10), §5.290 (a) as
 * adapted by RA-1; the closeout amendment of 22 October 2026, §5.378): a
 * reload is evidence about the record, never a value, and the absence of
 * current-load events alone never decides the row.
 * - a check record of this load whose own `page_load_index` names another
 *   load ⇒ `technical_failure` (§5.378 (6));
 * - held back (the kit's `technical_failure` with a hold-back detail, no
 *   opening of this load) ⇒ `interrupted` with the kind's reason: an
 *   earlier opening found (also after a completed earlier load, §5.270);
 *   the absence of an earlier opening not established (§5.378 (3)); or an
 *   earlier review closure of the unopened bench (§5.378 (4)). A detail
 *   beginning `reload` of no known kind ⇒ `technical_failure`;
 * - this load's own `prior_load_checked` record ESTABLISHES the absence of
 *   an earlier opening (the load's one check record says so with its flags
 *   agreeing: established, continuous, no opening found, at least one
 *   earlier record) ⇒ the load is read EXACTLY as a first load;
 * - otherwise (no check, a discontinuous history, a found opening) ⇒
 *   `interrupted`, "the absence of an earlier opening not established",
 *   read before any position is compared. A bench opened in such a load
 *   contradicts the hold-back the runtime applies (§5.378 (3)); its
 *   observation is not counted and stays in the raw log.
 * A self-contradictory check, two checks, a check on a first page load, a
 * check that contradicts the hold-back's kind, or an opening of this load
 * without an established absence flags `exposure_record_consistent: false`
 * and establishes nothing.
 *
 * Integrity (register §5.259 / §5.284): on the first-load reading every
 * family event — the check included — must carry `m07-calibration-v2` and
 * the M07 opportunity id, and a usable, distinct sequence number; a v1
 * record is the superseded administration. Duplicate, out-of-order or
 * over-6 stages, a closure that disagrees with the recount, or any other
 * contradictory record is a `technical_failure` with the reason, never a
 * value.
 */
import type { RawGameEvent } from '../../systems/EventLogger';
import { registerEntry } from '../registerV3';
import {
  emptyFeature,
  fractionFeature,
  meta,
  observedFeature,
  registerFeatureExtractor,
  sequencesOf,
} from './extract';
import type { FeatureDisposition, FeatureRecord } from './types';

const FAMILY = 'proto_m07_calibration_';
const OPPORTUNITY_ID = 'proto_m07_calibration_project';
const VERSION = 'm07-calibration-v2';
const SUPERSEDED_VERSION = 'm07-calibration-v1';
const STAGES = 6;

type HoldBackKind =
  | 'prior_opening'
  | 'unverified_history'
  | 'prior_review_closure';

/**
 * The window's hold-back details (`m07Calibration.ts`, register §5.14 and
 * §5.378), each with the row's reason. The first is the reason of the
 * first build, unchanged.
 */
const HOLD_BACKS: Readonly<
  Record<string, { kind: HoldBackKind; reason: string }>
> = {
  'reload after administration: bench not re-run': {
    kind: 'prior_opening',
    reason:
      'calibration bench opened in an earlier page load; not re-run after the reload',
  },
  'reload with an unverified earlier state: bench not administered': {
    kind: 'unverified_history',
    reason:
      'the earlier state of the calibration bench could not be verified after a reload: the absence of an earlier opening not established; not administered in this page load',
  },
  'reload after a review closure: bench not reopened': {
    kind: 'prior_review_closure',
    reason:
      'calibration bench closed at the station review in an earlier page load (never opened there); not reopened after the reload',
  },
};

/**
 * Ordering evidence (register §5.259): an outcome that depends on event
 * order is read only from events that each carry a usable, distinct
 * sequence number — a safe integer of at least 1. A missing or malformed
 * number is never read as zero; gaps are normal.
 */
function orderDefect(events: readonly RawGameEvent[]): string | null {
  const numbers = events.map((event) => event.sequence);

  if (
    numbers.some(
      (value) =>
        typeof value !== 'number' || !Number.isSafeInteger(value) || value < 1,
    )
  ) {
    return 'an event without a usable sequence number';
  }

  return new Set(numbers).size === numbers.length
    ? null
    : 'two events share a sequence number';
}

interface ClosureSnapshot {
  stages_completed?: unknown;
  completion?: unknown;
  voluntary_returns?: unknown;
}

registerFeatureExtractor('M07', (events, context) => {
  const [primary, returnsSpec] = registerEntry('M07').features;
  const family = events.filter(
    (event) =>
      (event.page_load_index === undefined ||
        event.page_load_index === context.pageLoadIndex) &&
      event.event_type.startsWith(FAMILY),
  );
  const suffixOf = (event: RawGameEvent) =>
    event.event_type.slice(FAMILY.length);
  const supporting = sequencesOf(family);

  // The reload check of this load (RA-1; §5.290 (a)).
  const checks = family.filter(
    (event) => suffixOf(event) === 'prior_load_checked',
  );
  const checkFlag = (key: string) =>
    checks.length === 0
      ? null
      : checks.some((event) => meta<unknown>(event, key) === true);
  const checkCoherent = (event: RawGameEvent) => {
    const established =
      meta<unknown>(event, 'prior_opening_absence_established') === true;
    const continuous = meta<unknown>(event, 'history_continuous') === true;
    const notFound = meta<unknown>(event, 'prior_opening_found') === false;
    const count = meta<unknown>(event, 'prior_page_load_event_count');

    return (
      !established ||
      (continuous && notFound && typeof count === 'number' && count > 0)
    );
  };
  const checksCoherent = checks.every(checkCoherent);
  // Exactly ONE check record per load (§5.290 (a): "two checks … establish
  // nothing"; the M14–M20 code accepts two agreeing checks — that
  // divergence is reported to the owner, not resolved here).
  const absenceEstablished =
    checks.length === 1 &&
    checksCoherent &&
    meta<unknown>(checks[0], 'prior_opening_absence_established') === true;
  const reloadCheck = () => ({
    page_reloaded: context.reloaded,
    checked: checks.length > 0,
    prior_opening_found: checkFlag('prior_opening_found'),
    prior_end_presented_found: checkFlag('prior_end_presented_found'),
    history_continuous: checkFlag('history_continuous'),
    prior_opening_absence_established: absenceEstablished,
  });

  let exposureConsistent = true;

  // More than one check record, one on a first page load, or one whose
  // flags contradict each other is a defect of an unscored record:
  // flagged, never a change of the row.
  if (
    checks.length > 1 ||
    (checks.length > 0 && !context.reloaded) ||
    !checksCoherent
  ) {
    exposureConsistent = false;
  }

  // The recount (filled by the first-load reading below).
  let endPresented = family.some(
    (event) => suffixOf(event) === 'end_presented',
  );
  const hasOpening = family.some(
    (event) => suffixOf(event) === 'opportunity_opened',
  );
  let opened = false;
  let openedSequence: number | null = null;
  let openedWindowId: string | null = null;
  let stages = 0;
  let returns = 0;
  const departures: number[] = [];
  let closure: 'completed' | 'closed_at_review' | null = null;
  let completion: boolean | null = null;

  const components = (extra: Record<string, unknown> = {}) => ({
    administration_version: VERSION,
    stages_planned: STAGES,
    errors: 'not_defined',
    exposure: {
      end_presented: endPresented,
      opened_in_this_load: hasOpening,
      opened_sequence: openedSequence,
      opened_window_id: openedWindowId,
    },
    stages_completed: opened ? stages : null,
    completion,
    returns: opened ? returns : null,
    departure_state: [...departures],
    reload_check: reloadCheck(),
    exposure_record_consistent: exposureConsistent,
    ...extra,
  });
  const nothing = (
    disposition: Exclude<FeatureDisposition, 'observed' | 'incomplete'>,
    reason: string,
    extra: Partial<FeatureRecord> = {},
    componentExtra: Record<string, unknown> = {},
  ): FeatureRecord[] => [
    emptyFeature('M07', primary, disposition, reason, {
      supporting_sequences: supporting,
      ...extra,
      components: components(componentExtra),
    }),
    emptyFeature('M07', returnsSpec, disposition, reason, {
      closure_reason: extra.closure_reason ?? null,
    }),
  ];

  if (family.length === 0) {
    // No record of the bench in this load. A first load: never presented.
    // A reloaded load without its own check (the Workshop never entered
    // after the reload; §5.290 (a) limitation (1)): `interrupted`.
    return context.reloaded
      ? nothing(
          'interrupted',
          'no current-load bench evidence after a reload: calibration bench not presented in this page load and the absence of an earlier opening not established',
        )
      : nothing('not_presented', 'calibration bench never presented');
  }

  // A check record of this load must describe this load (§5.378 (6)): its
  // own page-load field naming another load is an integrity defect of the
  // record the reload reading rests on — never an established absence and
  // never a hold-back reason.
  if (
    checks.some(
      (event) =>
        meta<unknown>(event, 'page_load_index') !== context.pageLoadIndex,
    )
  ) {
    return nothing(
      'technical_failure',
      'a reload check record describes another page load',
      { closure_reason: 'technical_failure' },
    );
  }

  // Held back after a reload (register §5.14 / §5.270 / §5.378): the kit's
  // technical failure with a detail beginning `reload` and no opening of
  // this load. Takes precedence over everything that follows. A check that
  // contradicts the kind (an established absence beside an earlier opening
  // or an unverified history; no established absence beside a verified
  // review closure) is flagged; the hold-back record decides the row.
  const holdBackRecords = hasOpening
    ? []
    : family.filter(
        (event) =>
          suffixOf(event) === 'technical_failure' &&
          String(meta<unknown>(event, 'detail') ?? '').startsWith('reload'),
      );

  if (holdBackRecords.length > 0) {
    const holdBack =
      holdBackRecords.length === 1
        ? HOLD_BACKS[String(meta<unknown>(holdBackRecords[0], 'detail'))]
        : undefined;

    if (holdBack === undefined) {
      return nothing(
        'technical_failure',
        holdBackRecords.length === 1
          ? 'a reload hold-back record of an unknown kind'
          : 'more than one reload hold-back record',
        { closure_reason: 'technical_failure' },
      );
    }

    if ((holdBack.kind === 'prior_review_closure') !== absenceEstablished) {
      exposureConsistent = false;
    }

    return nothing(
      'interrupted',
      holdBack.reason,
      {},
      { held_back_after_reload: true, hold_back_kind: holdBack.kind },
    );
  }

  // A reloaded load without an ESTABLISHED absence of an earlier opening:
  // `interrupted`, read before any position is compared — a missing,
  // broken or contradictory history is never proof of no prior exposure.
  if (context.reloaded && !absenceEstablished) {
    if (hasOpening) {
      // The runtime holds the bench back whenever the absence is not
      // established (§5.378 (3)), so an opening here contradicts the
      // record of the reload.
      exposureConsistent = false;

      return nothing(
        'interrupted',
        'calibration bench opened in this page load after a reload, but the absence of an earlier opening not established: the current-load observation is not counted',
        {},
        { opened_after_unestablished_absence: true },
      );
    }

    return nothing(
      'interrupted',
      'no current-load bench evidence after a reload: calibration bench not opened in this page load and the absence of an earlier opening not established',
    );
  }

  // The first-load reading (a first page load, or a reloaded load whose
  // check established the absence of an earlier opening).
  const fail = (reason: string) =>
    nothing('technical_failure', reason, {
      closure_reason: 'technical_failure',
    });

  for (const event of family) {
    const version = meta<unknown>(event, 'entry_state_version');

    if (version === SUPERSEDED_VERSION) {
      return fail(`superseded administration (${SUPERSEDED_VERSION})`);
    }

    if (version !== VERSION) {
      return fail('an event of the family carries an unknown version');
    }

    if (meta<unknown>(event, 'opportunity_id') !== OPPORTUNITY_ID) {
      return fail('an event of the family carries another opportunity id');
    }
  }

  const defect = orderDefect(family);

  if (defect !== null) {
    return fail(defect);
  }

  const ordered = family
    .slice()
    .sort((a, b) => (a.sequence as number) - (b.sequence as number));
  let closed = false;
  let presentedCount = 0;

  endPresented = false;

  for (const event of ordered) {
    const suffix = suffixOf(event);

    switch (suffix) {
      case 'prior_load_checked':
        break;
      case 'end_presented':
        presentedCount += 1;

        if (presentedCount > 1) {
          return fail('the end opportunity was presented twice');
        }

        if (closed) {
          return fail('the end opportunity was presented after the closure');
        }

        endPresented = true;
        break;
      case 'opportunity_opened':
        if (opened) {
          return fail('the bench was opened twice');
        }

        if (closed) {
          return fail('the bench was opened after the closure');
        }

        opened = true;
        openedSequence = event.sequence ?? null;
        openedWindowId = meta<string>(event, 'window_id') ?? null;
        break;
      case 'end_opened_without_start':
        if (!opened) {
          return fail('an end opening without the bench opening');
        }

        break;
      case 'returned':
        if (!opened || closed) {
          return fail('a return outside the open project');
        }

        returns += 1;
        break;
      case 'departed': {
        if (!opened || closed) {
          return fail('a departure outside the open project');
        }

        if (meta<unknown>(event, 'stages_completed') !== stages) {
          return fail('a departure snapshot disagrees with the recount');
        }

        departures.push(stages);
        break;
      }
      case 'stage_advanced': {
        if (!opened) {
          return fail('a stage advanced before the bench was opened');
        }

        if (closed) {
          return fail('a stage advanced after the closure');
        }

        const stage = meta<unknown>(event, 'stage');

        if (typeof stage !== 'number' || !Number.isSafeInteger(stage)) {
          return fail('a stage record without a stage number');
        }

        if (stage > STAGES) {
          return fail(`a stage above ${STAGES}`);
        }

        if (stage === stages) {
          return fail(`stage ${stage} advanced twice`);
        }

        if (stage !== stages + 1) {
          return fail(`stage ${stage} advanced out of order`);
        }

        stages = stage;
        break;
      }
      case 'window_closed': {
        if (closed) {
          return fail('the window closed more than once');
        }

        closed = true;

        const exit = meta<unknown>(event, 'exit_state');

        if (exit === 'closed_at_review') {
          // The kit's absence record (M07-4 a): never an entered bench.
          if (opened) {
            return fail('an absence closure of an entered bench');
          }

          closure = 'closed_at_review';
          break;
        }

        if (exit !== 'completed') {
          return fail('a closure of an unknown kind');
        }

        if (!opened) {
          return fail('a completed closure of a bench never opened');
        }

        const raw = meta<ClosureSnapshot>(event, 'raw_components');

        if (
          raw === undefined ||
          raw.stages_completed !== stages ||
          raw.completion !== (stages === STAGES) ||
          raw.voluntary_returns !== returns
        ) {
          return fail('the closure snapshot disagrees with the recount');
        }

        completion = stages === STAGES;
        closure = completion ? 'completed' : 'closed_at_review';
        break;
      }
      case 'technical_failure':
        return fail(
          `technical failure recorded: ${String(meta<unknown>(event, 'detail') ?? 'no detail')}`,
        );
      default:
        break;
    }
  }

  if (stages === STAGES && completion === null) {
    return fail('six stages without the completion record');
  }

  if (!opened) {
    // Never entered (M07-2 a), read from this load's own presentation.
    if (closure === 'closed_at_review') {
      return endPresented
        ? nothing('no_eligible_event', 'presented_not_entered', {
            closure_reason: 'closed_at_review',
          })
        : nothing(
            'not_presented',
            'calibration bench never presented and never opened; closed at the review',
            { closure_reason: 'closed_at_review' },
          );
    }

    return endPresented
      ? nothing('pending', 'presented_not_entered')
      : nothing('not_presented', 'calibration bench never presented');
  }

  if (closure === null) {
    return nothing('pending', 'the calibration project is still open');
  }

  // Entered and closed: stages / 6 at the closing milestone (an observed
  // zero included, M07-1 a); the returns stay beside it.
  return [
    fractionFeature(
      'M07',
      primary,
      stages,
      STAGES,
      [OPPORTUNITY_ID],
      supporting,
      // The planned denominator is the constant 6, so this zero-denominator
      // branch of the helper is unreachable; it is labelled as a defect,
      // never as a participant disposition.
      {
        disposition: 'technical_failure',
        reason: 'no planned calibration stages (unreachable)',
      },
      {
        closure_reason: closure,
        censored: false,
        censor_reason: null,
        components: components(),
      },
    ),
    observedFeature('M07', returnsSpec, returns, {
      closure_reason: closure,
      supporting_sequences: supporting,
    }),
  ] satisfies FeatureRecord[];
});
