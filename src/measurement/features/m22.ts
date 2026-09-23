/**
 * M22 feature extractor (Unit 11): `m22_revisions_begun` = reports on
 * which a revision was begun (a feedback-consistent edit after the
 * acknowledgement — `code_attached`) / reports whose requirement was
 * presented (`setback_presented`; two planned — one ⇒ `incomplete`). An
 * exit (withdraw) after the requirement without a revision is an observed
 * 0 for that report; a report never submitted is outside the denominator;
 * a returned report the review closed unacknowledged is invalid
 * (excluded), acknowledged-and-left without a revision is censored
 * (excluded, flagged) while a review-closed report whose revision had
 * already begun keeps its observed 1 (the numerator fact is already in).
 * Companion `m22_discouragement_ratings` = per report the 1–5 rating and
 * its recall delay from the `rating_answered` / `rating_declined` events;
 * a declined or missing rating is null (never a midpoint) and the two
 * ratings are never combined with the behaviour. Read-only over the raw
 * `proto_m22_returned_*` events.
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
import type { FeatureRecord } from './types';

const FAMILY = 'proto_m22_returned_';
const REPORTS = ['o1', 'o2'] as const;

type ReportId = (typeof REPORTS)[number];

interface M22Raw {
  report: ReportId;
  requirement_presented: boolean;
  revision_begun: boolean;
  setback_comprehension: boolean;
  recovery_complete: boolean;
  exited: boolean;
  stop_choice: string | null;
}

registerFeatureExtractor('M22', (events, context) => {
  const entry = registerEntry('M22');
  const [primary, companion] = entry.features;
  const load = currentLoadEvents(events, context);
  const family = load.filter((e) => e.event_type.startsWith(FAMILY));
  const supporting = sequencesOf(family);
  const presented = eventsOfType(load, `${FAMILY}presented`);
  const opened = eventsOfType(load, `${FAMILY}opportunity_opened`);
  const closed = eventsOfType(load, `${FAMILY}window_closed`);
  const setbacks = eventsOfType(load, `${FAMILY}setback_presented`);
  const acknowledged = eventsOfType(load, `${FAMILY}setback_acknowledged`);
  const attached = eventsOfType(load, `${FAMILY}code_attached`);
  const answered = eventsOfType(load, `${FAMILY}rating_answered`);
  const declined = eventsOfType(load, `${FAMILY}rating_declined`);
  const ratingPresented = eventsOfType(load, `${FAMILY}rating_presented`);
  const failed = eventsOfType(load, `${FAMILY}technical_failure`);
  // The adapter's own events carry `report`; the window kit's closures the
  // window's `occasion` (the same id).
  const rep = (event: { metadata?: Record<string, unknown> }) =>
    meta<string>(event as never, 'report') ??
    meta<string>(event as never, 'occasion');

  if (opened.length === 0) {
    if (presented.length > 0) {
      const reason = 'reports presented, desk never opened';

      return [
        emptyFeature('M22', primary, 'declined', reason, {
          supporting_sequences: supporting,
        }),
        emptyFeature('M22', companion, 'declined', reason),
      ];
    }

    return [
      absentFeature('M22', primary, context, 'report desk never opened', {
        supporting_sequences: supporting,
      }),
      absentFeature('M22', companion, context, 'report desk never opened'),
    ];
  }

  if (failed.length > 0) {
    const reason = 'technical failure closed a report';

    return [
      emptyFeature('M22', primary, 'technical_failure', reason, {
        closure_reason: 'technical_failure',
        supporting_sequences: supporting,
      }),
      emptyFeature('M22', companion, 'technical_failure', reason),
    ];
  }

  const rawByReport: Partial<Record<ReportId, M22Raw>> = {};
  const exitByReport: Partial<Record<ReportId, string>> = {};
  const invalidByReport: Partial<Record<ReportId, string>> = {};

  for (const event of closed) {
    const raw =
      meta<M22Raw>(event, 'raw_components') ??
      meta<M22Raw>(event, 'raw_components_partial');
    const id = rep(event);

    if (raw !== undefined && (id === 'o1' || id === 'o2')) {
      rawByReport[id] = raw;
      exitByReport[id] = meta<string>(event, 'exit_state') ?? 'unknown';

      const detail = meta<string>(event, 'invalid_detail');

      if (detail !== undefined) {
        invalidByReport[id] = detail;
      }
    }
  }

  const perReport = REPORTS.map((id) => {
    const raw = rawByReport[id];
    const requirement = setbacks.some((event) => rep(event) === id);
    const ack = acknowledged.find((event) => rep(event) === id);
    const ackSeq = ack?.sequence ?? null;
    // Recount: a code attached after the acknowledgement = revision begun.
    const revisionFromEvents = attached.some(
      (event) =>
        rep(event) === id && ackSeq !== null && (event.sequence ?? 0) > ackSeq,
    );
    const recountAgrees =
      raw === undefined || raw.revision_begun === revisionFromEvents;
    const rating =
      answered.find((event) => rep(event) === id) ??
      declined.find((event) => rep(event) === id);

    return {
      report: id,
      opened: opened.some((event) => rep(event) === id),
      closed: raw !== undefined,
      exit: exitByReport[id] ?? null,
      invalid_detail: invalidByReport[id] ?? null,
      requirement_presented: requirement,
      acknowledged: ack !== undefined,
      revision_begun: raw?.revision_begun ?? revisionFromEvents,
      recovery_complete: raw?.recovery_complete ?? false,
      withdrawn: raw?.stop_choice === 'withdrawn',
      recount_agrees: recountAgrees,
      rating:
        rating === undefined
          ? null
          : {
              value: meta<number | null>(rating, 'value') ?? null,
              declined: rating.event_type === `${FAMILY}rating_declined`,
              recall_delay_ms:
                meta<number | null>(rating, 'recall_delay_ms') ?? null,
              position: meta<number | null>(rating, 'position') ?? null,
            },
    };
  });

  const anyReview = perReport.some((row) => row.exit === 'closed_at_review');
  const closureReason = anyReview
    ? ('closed_at_review' as const)
    : perReport.some((row) => row.closed)
      ? ('completed' as const)
      : null;

  if (perReport.some((row) => !row.recount_agrees)) {
    const reason = 'report record disagrees with the code_attached events';

    return [
      emptyFeature('M22', primary, 'technical_failure', reason, {
        closure_reason: closureReason,
        supporting_sequences: supporting,
        components: { reports: perReport },
      }),
      emptyFeature('M22', companion, 'technical_failure', reason),
    ];
  }

  // Eligible: the requirement presented and the report decided by the
  // participant (accepted or withdrawn after the acknowledgement), or
  // review-closed after a revision had begun (an observed 1 either way).
  // Excluded: never submitted (no requirement); returned but never
  // acknowledged (invalid, insufficient opportunity); acknowledged and left
  // to the review with no revision begun (censored).
  const eligible = perReport.filter(
    (row) =>
      row.requirement_presented &&
      row.closed &&
      row.invalid_detail === null &&
      (row.exit !== 'closed_at_review' || row.revision_begun),
  );
  const censored = perReport.filter(
    (row) =>
      row.requirement_presented &&
      row.invalid_detail === null &&
      (!row.closed || (row.exit === 'closed_at_review' && !row.revision_begun)),
  );
  const invalid = perReport.filter((row) => row.invalid_detail !== null);
  const numerator = eligible.filter((row) => row.revision_begun).length;
  const openReports = perReport.filter((row) => row.opened && !row.closed);
  const components = {
    reports: perReport,
    eligible_reports: eligible.map((row) => row.report),
    censored_reports: censored.map((row) => row.report),
    invalid_reports: invalid.map((row) => ({
      report: row.report,
      detail: row.invalid_detail,
    })),
    requirements_presented: perReport.filter((row) => row.requirement_presented)
      .length,
    open_reports: openReports.map((row) => row.report),
  };
  const pending = openReports.length > 0 && !context.finalCoreClosed;
  // A zero denominator: pending while a report is open; interrupted when a
  // returned report was left to the review; understanding_failed when every
  // returned report was closed with its note unacknowledged; otherwise no
  // eligible event (no requirement was ever presented).
  const zero = {
    disposition: pending
      ? ('pending' as const)
      : censored.length > 0
        ? ('interrupted' as const)
        : invalid.length > 0
          ? ('understanding_failed' as const)
          : ('no_eligible_event' as const),
    reason: pending
      ? 'a report is still open'
      : censored.length > 0
        ? 'the requirement was presented but the report was left to the review'
        : invalid.length > 0
          ? 'the returned note was never acknowledged on any returned report'
          : 'no requirement presented (no valid first submission)',
  };
  const primaryRow = fractionFeature(
    'M22',
    primary,
    numerator,
    eligible.length,
    eligible.map((row) => `m22_returned_${row.report}`),
    supporting,
    zero,
    {
      closure_reason: closureReason,
      censored: censored.length > 0,
      censor_reason:
        censored.length > 0
          ? 'a returned report was left to the review after the acknowledgement'
          : null,
      components,
      ...(pending && eligible.length > 0
        ? { disposition: 'pending' as const }
        : {}),
    },
  );

  // Companion: the ratings, kept apart from the behaviour.
  const dueReports = perReport.filter(
    (row) => row.requirement_presented && row.closed,
  );
  // The ratings carry their order (position) and, beside them, whether the
  // report's note was acknowledged — never combined into one number.
  const ratingValue = {
    o1: perReport[0].rating,
    o2: perReport[1].rating,
  };
  const acknowledgedReports = perReport
    .filter((row) => row.acknowledged)
    .map((row) => row.report);
  const anyAnswered = perReport.some(
    (row) => row.rating !== null && !row.rating.declined,
  );
  const allDeclined =
    dueReports.length > 0 &&
    dueReports.every((row) => row.rating !== null && row.rating.declined);
  const companionRow = anyAnswered
    ? observedFeature('M22', companion, ratingValue, {
        closure_reason: closureReason,
        supporting_sequences: supporting,
        components: {
          rating_presented: ratingPresented.length > 0,
          rating_screens_presented: ratingPresented.length,
          acknowledged_reports: acknowledgedReports,
          declined_reports: perReport
            .filter((row) => row.rating?.declined)
            .map((row) => row.report),
          missing_reports: dueReports
            .filter((row) => row.rating === null)
            .map((row) => row.report),
        },
      })
    : emptyFeature(
        'M22',
        companion,
        allDeclined
          ? 'declined'
          : dueReports.length === 0
            ? 'no_eligible_event'
            : context.finalCoreClosed
              ? 'interrupted'
              : 'pending',
        allDeclined
          ? 'every due rating was declined'
          : dueReports.length === 0
            ? 'no returned report to rate'
            : context.finalCoreClosed
              ? 'the ratings were never answered'
              : 'the ratings are still due',
        {
          closure_reason: closureReason,
          supporting_sequences: supporting,
          components: {
            rating_presented: ratingPresented.length > 0,
            rating_screens_presented: ratingPresented.length,
            acknowledged_reports: acknowledgedReports,
          },
        },
      );

  return [primaryRow, companionRow] satisfies FeatureRecord[];
});
