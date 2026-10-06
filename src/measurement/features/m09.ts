/**
 * M09 feature extractor (Unit 15): `m09_due_checks_fulfilled` = checks
 * fulfilled / eligible checks of the ONE accepted watch duty (three
 * planned; fewer reached exports the value as `incomplete`). Read-only
 * over the raw `proto_m09_checks_*` events of the current page load, and
 * recounted from the act events — the closure snapshot is only compared,
 * never trusted alone.
 *
 * Eligible = opened with access and closed by a reading or by leaving the
 * Concourse. A check censored at the review, one opened without access and
 * one never opened are outside the denominator; none of them is a miss.
 *
 * The invariants are conditional on the outcome claimed. Legitimate
 * missingness is never a technical failure: an offer never answered, a
 * declined duty with no check events, checks that were never reached, a
 * missed check without a reading, a check censored at the review. Only
 * contradictory, malformed or unreproducible evidence is: a duplicate or
 * out-of-order opening, a reading credited outside its window, a second
 * credited reading, a closure that contradicts the acts, a snapshot that
 * disagrees with the recount, an unknown administration version.
 */
import type { RawGameEvent } from '../../systems/EventLogger';
import { CLOSURE_REASONS, type ClosureReason } from '../protocol';
import { registerEntry } from '../registerV3';
import {
  absentFeature,
  currentLoadEvents,
  emptyFeature,
  eventsOfType,
  fractionFeature,
  meta,
  registerFeatureExtractor,
  sequencesOf,
} from './extract';
import type { FeatureRecord } from './types';

const FAMILY = 'proto_m09_checks_';
const VERSION = 'm09-watch-checks-v1';
const CHECKS_PLANNED = 3;

interface CheckRecord {
  check_index: number;
  milestone: string | null;
  stage: string | null;
  access_available: boolean;
  outcome: 'fulfilled' | 'missed' | 'censored' | null;
  reason: string | null;
  exit_to: string | null;
  due_delta_ms: number | null;
  reading_id: string | null;
  input_mode: string | null;
  input_mode_basis: string | null;
  log_views_while_due: number;
  eligible: boolean;
}

const seq = (event: RawGameEvent) => event.sequence ?? 0;

function closureReason(value: unknown): ClosureReason | null {
  return typeof value === 'string' &&
    (CLOSURE_REASONS as readonly string[]).includes(value)
    ? (value as ClosureReason)
    : null;
}

registerFeatureExtractor('M09', (events, context) => {
  const entry = registerEntry('M09');
  const [primary] = entry.features;
  const load = currentLoadEvents(events, context);
  const family = load.filter((e) => e.event_type.startsWith(FAMILY));
  const supporting = sequencesOf(family);
  const of = (suffix: string) => eventsOfType(family, `${FAMILY}${suffix}`);

  const presented = of('presented');
  const answered = of('offer_answered');
  const opened = of('check_window_opened');
  const fulfilled = of('check_fulfilled');
  const closedChecks = of('check_window_closed');
  const dutyClosed = of('window_closed');
  const heldBack = of('technical_failure');
  const uncredited = of('gauge_read_uncredited');
  const logViews = of('log_viewed');
  const refusedPresses = of('offer_press_refused');

  const uncreditedReads = uncredited.map((event) => ({
    reason: meta<string>(event, 'reason') ?? null,
    last_closed_check_index:
      meta<number | null>(event, 'last_closed_check_index') ?? null,
    last_closed_outcome:
      meta<string | null>(event, 'last_closed_outcome') ?? null,
    input_mode: meta<string>(event, 'input_mode') ?? null,
    sequence: event.sequence ?? null,
  }));
  const baseComponents = {
    administration_version: VERSION,
    checks_planned: CHECKS_PLANNED,
    observations_share_one_duty: true,
    uncredited_reads: uncreditedReads,
    refused_offer_presses: refusedPresses.length,
  };
  const fail = (reason: string): FeatureRecord[] => [
    emptyFeature('M09', primary, 'technical_failure', reason, {
      supporting_sequences: supporting,
      components: baseComponents,
    }),
  ];
  const empty = (
    disposition: 'no_eligible_event' | 'declined' | 'pending' | 'interrupted',
    reason: string,
    components: Record<string, unknown> = {},
  ): FeatureRecord[] => [
    emptyFeature('M09', primary, disposition, reason, {
      supporting_sequences: supporting,
      closure_reason:
        dutyClosed[0] === undefined
          ? null
          : closureReason(
              (
                meta<{ closure_reason?: string }>(
                  dutyClosed[0],
                  'raw_components',
                ) ??
                meta<{ closure_reason?: string }>(
                  dutyClosed[0],
                  'raw_components_partial',
                )
              )?.closure_reason,
            ),
      components: { ...baseComponents, ...components },
    }),
  ];

  if (
    family.some(
      (event) => meta<string>(event, 'entry_state_version') !== VERSION,
    )
  ) {
    return fail('an event of the family carries an unknown version');
  }

  if (presented.length === 0) {
    if (heldBack.length > 0) {
      return empty(
        'interrupted',
        'watch offered in an earlier page load; not re-run after the reload',
      );
    }

    if (answered.length + opened.length + fulfilled.length > 0) {
      return fail('watch events without a presentation');
    }

    return [
      absentFeature('M09', primary, context, 'watch never offered', {
        supporting_sequences: supporting,
        components: baseComponents,
      }),
    ];
  }

  if (presented.length > 1) {
    return fail('the watch offer was presented more than once');
  }

  if (answered.length > 1) {
    return fail('more than one terminal answer to the watch offer');
  }

  if (dutyClosed.length > 1) {
    return fail('the duty window closed more than once');
  }

  const checkEvents = opened.length + fulfilled.length + closedChecks.length;
  const answer = answered[0];
  const answerValue =
    answer === undefined ? null : (meta<string>(answer, 'answer') ?? null);
  const acceptance = {
    answer: answerValue,
    option_position: answer
      ? (meta<number>(answer, 'option_position') ?? null)
      : null,
    option_count: answer
      ? (meta<number>(answer, 'option_count') ?? null)
      : null,
    input_mode: answer ? (meta<string>(answer, 'input_mode') ?? null) : null,
    input_mode_basis: answer
      ? (meta<string>(answer, 'input_mode_basis') ?? null)
      : null,
  };

  if (answer === undefined) {
    // Presented and never answered: no terminal answer, no duty, no check.
    if (checkEvents > 0) {
      return fail('check events without an accepted duty');
    }

    return empty('no_eligible_event', 'watch offer not answered', {
      acceptance,
      checks: [],
    });
  }

  if (answerValue === 'decline') {
    if (checkEvents > 0) {
      return fail('check events on a declined duty');
    }

    return empty('declined', 'watch duty declined', { acceptance, checks: [] });
  }

  if (answerValue !== 'accept') {
    return fail('the watch answer is neither accept nor decline');
  }

  // ——— Recount of the observed checks from the act events ———
  const records: CheckRecord[] = [];
  let previousIndex = 0;

  for (const opening of opened) {
    const index = meta<number>(opening, 'check_index');

    if (index !== 1 && index !== 2 && index !== 3) {
      return fail('a check opening carries no index within 1–3');
    }

    if (records.some((record) => record.check_index === index)) {
      return fail(`check ${index} was opened twice`);
    }

    if (index <= previousIndex) {
      return fail(`check ${index} was opened out of order`);
    }

    if (seq(opening) <= seq(answer)) {
      return fail(`check ${index} was opened before the acceptance`);
    }

    const lastIndex = previousIndex;
    const previousClosed = closedChecks.some(
      (closure) =>
        meta<number>(closure, 'check_index') === lastIndex &&
        seq(closure) < seq(opening),
    );

    if (lastIndex !== 0 && !previousClosed) {
      return fail(
        `check ${index} was opened while check ${lastIndex} was not closed`,
      );
    }

    previousIndex = index;

    const closures = closedChecks.filter(
      (closure) => meta<number>(closure, 'check_index') === index,
    );
    const readings = fulfilled.filter(
      (reading) => meta<number>(reading, 'check_index') === index,
    );

    if (closures.length > 1) {
      return fail(`check ${index} was closed more than once`);
    }

    if (readings.length > 1) {
      return fail(`check ${index} has two credited readings`);
    }

    const closure = closures[0];
    const reading = readings[0];

    if (closure !== undefined && seq(closure) <= seq(opening)) {
      return fail(`check ${index} was closed before it was opened`);
    }

    if (
      reading !== undefined &&
      (seq(reading) <= seq(opening) ||
        (closure !== undefined && seq(reading) >= seq(closure)))
    ) {
      return fail(
        `a reading was credited outside the window of check ${index}`,
      );
    }

    const outcome =
      closure === undefined
        ? null
        : (meta<CheckRecord['outcome']>(closure, 'outcome') ?? null);
    const reason =
      closure === undefined ? null : (meta<string>(closure, 'reason') ?? null);

    if (closure !== undefined) {
      const consistent =
        (outcome === 'fulfilled' &&
          reason === 'read' &&
          reading !== undefined) ||
        (outcome === 'missed' &&
          reason === 'left_concourse' &&
          reading === undefined) ||
        (outcome === 'censored' &&
          reason === 'review' &&
          reading === undefined);

      if (!consistent) {
        return fail(`the closure of check ${index} contradicts its readings`);
      }
    }

    const access = meta<{ available?: boolean }>(opening, 'access');
    const accessAvailable = access?.available === true;

    records.push({
      check_index: index,
      milestone: meta<string>(opening, 'milestone') ?? null,
      stage: meta<string>(opening, 'stage') ?? null,
      access_available: accessAvailable,
      outcome,
      reason,
      exit_to:
        closure === undefined
          ? null
          : (meta<string | null>(closure, 'exit_to') ?? null),
      due_delta_ms: reading
        ? (meta<number>(reading, 'due_delta_ms') ?? null)
        : null,
      reading_id: reading
        ? (meta<string>(reading, 'reading_id') ?? null)
        : null,
      input_mode: reading
        ? (meta<string>(reading, 'input_mode') ?? null)
        : null,
      input_mode_basis: reading
        ? (meta<string>(reading, 'basis') ?? null)
        : null,
      log_views_while_due: logViews.filter(
        (view) =>
          meta<number | null>(view, 'due_check_index') === index &&
          meta<boolean>(view, 'rendered') === true,
      ).length,
      eligible:
        accessAvailable && (reason === 'read' || reason === 'left_concourse'),
    });
  }

  // A reading or a closure of a check that was never opened.
  for (const event of [...fulfilled, ...closedChecks]) {
    const index = meta<number>(event, 'check_index');

    if (!records.some((record) => record.check_index === index)) {
      return fail('a reading or a closure names a check that was never opened');
    }
  }

  const components = {
    ...baseComponents,
    acceptance,
    checks: records,
    checks_opened: records.length,
    checks_eligible: records.filter((record) => record.eligible).length,
    checks_inaccessible: records.filter((record) => !record.access_available)
      .length,
    checks_censored: records.filter((record) => record.outcome === 'censored')
      .length,
    log_views: {
      total: logViews.length,
      rendered: logViews.filter(
        (view) => meta<boolean>(view, 'rendered') === true,
      ).length,
    },
    input_modes: {
      answer: acceptance.input_mode,
      checks: records.map((record) => record.input_mode),
    },
  };
  const closed = dutyClosed[0];

  if (closed === undefined) {
    // The duty is still running (a check may be open or still to come).
    return empty('pending', 'the watch duty is still open', components);
  }

  if (records.some((record) => record.outcome === null)) {
    return fail('the duty closed while a check has no closure');
  }

  const fulfilledCount = records.filter(
    (record) => record.outcome === 'fulfilled',
  ).length;
  const raw = meta<{
    checks_fulfilled?: number;
    checks?: { check_index: number; outcome: string | null }[];
    closure_reason?: string;
  }>(closed, 'raw_components');

  if (raw !== undefined) {
    const snapshot = (raw.checks ?? [])
      .map((check) => `${check.check_index}:${check.outcome}`)
      .join(',');
    const recount = records
      .map((record) => `${record.check_index}:${record.outcome}`)
      .join(',');

    if (raw.checks_fulfilled !== fulfilledCount || snapshot !== recount) {
      return fail('the closure snapshot disagrees with the recount');
    }
  }

  const eligible = records.filter((record) => record.eligible);
  const censored = records.some((record) => record.outcome === 'censored');

  return [
    fractionFeature(
      'M09',
      primary,
      eligible.filter((record) => record.outcome === 'fulfilled').length,
      eligible.length,
      eligible.map((record) => `m09_duty_check_${record.check_index}`),
      supporting,
      {
        disposition: 'no_eligible_event',
        reason: 'no check was opened with access and closed by an act',
      },
      {
        closure_reason: closureReason(raw?.closure_reason),
        censored,
        censor_reason: censored
          ? 'review reached with a check still open'
          : null,
        components,
      },
    ),
  ] satisfies FeatureRecord[];
});
